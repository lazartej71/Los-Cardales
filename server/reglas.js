/**
 * Reglas del servidor: validan lo que manda la app antes de tocar la base.
 * Funciones puras: reciben los datos actuales y el cuerpo del pedido, y devuelven
 * { valor } listo para guardar (con los nombres de columna de la base) o { error, estado }.
 * Las que miran pagos o tarjetas usan datos.movimientos y datos.tarjetas (los trae leerAdmin).
 */

import { CRITERIOS } from '../src/datos/constantes.js';
import { mismoNombre, partidosPendientes, textoPendientes } from '../src/logica/bajas.js';
import { pagosDePartido } from '../src/logica/cuentas.js';
import { PESO_MAXIMO_ESCUDO } from '../src/logica/escudos.js';
import { nombrePredio, textoDia, validarLugar } from '../src/logica/lugar.js';
import { soloDigitos } from '../src/logica/expulsiones.js';
import { validarTelefono } from '../src/logica/validaciones.js';
import { esPartidoDeVeedor } from '../src/logica/veedores.js';

const fallo = (error, estado = 400) => ({ error, estado });
const esEntero = (valor, min, max) => Number.isInteger(valor) && valor >= min && valor <= max;
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : null);
const nombreDe = (datos, equipoId) => datos.equipos.find((e) => e.id === equipoId)?.nombre ?? 'El equipo';
const MONTO_MAXIMO = 10000000;
const METODOS = ['efectivo', 'transferencia'];
const TIPOS_MOVIMIENTO = ['pago', 'deuda_anterior'];
const TIPOS_ROJA = ['doble_amarilla', 'directa'];
// 'efectivo' → "en efectivo"; 'transferencia' → "por transferencia"
const conMedio = (metodo) => (metodo === 'efectivo' ? 'en efectivo' : 'por transferencia');

// "2026-10-15": el formato de la base y un día que existe en el calendario
function esFecha(valor) {
  if (typeof valor !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const dia = new Date(`${valor}T00:00:00Z`);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().startsWith(valor);
}

// ['tarjetas', 'pagos'] → "tarjetas y pagos"
const enumerar = (lista) => (lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0]);

function categoriaDeEquipo(datos, equipoId) {
  const equipo = datos.equipos.find((e) => e.id === equipoId);
  const zona = equipo && datos.zonas.find((z) => z.id === equipo.zonaId);
  return zona ? zona.categoriaId : null;
}

// ¿Otro partido no postergado de la fecha ya usa esa cancha a esa hora?
const canchaOcupada = (datos, fecha, { predio, cancha, hora }, partidoId = null) =>
  datos.partidos.some(
    (p) =>
      p.id !== partidoId &&
      !p.postergado &&
      p.fecha === fecha &&
      p.predio === predio &&
      p.cancha === cancha &&
      p.hora === hora
  );
const textoOcupada = (fecha, { predio, cancha, hora }) =>
  `La cancha ${cancha} de ${nombrePredio(predio)} ya tiene un partido a las ${hora} en la fecha ${fecha}.`;

// Lugar y hora válidos y con la cancha libre en esa fecha (los postergados no la ocupan)
function validarLugarLibre(datos, fecha, cuerpo, partidoId = null) {
  const lugar = validarLugar(cuerpo);
  if (lugar.error) return fallo(lugar.error);
  if (canchaOcupada(datos, fecha, lugar.valor, partidoId)) return fallo(textoOcupada(fecha, lugar.valor), 409);
  return lugar;
}

// Un postergado que vuelve a jugarse (se le quita la postergación, o se le carga resultado o W.O.)
// vuelve a ocupar su cancha en su fecha: no puede pisar a otro partido. Si se reprogramó para un día
// especial (tiene día), se juega ese día y no ocupa nada en su fecha.
function validarVuelveAJugarse(datos, partido, resultado) {
  const vuelve =
    partido.postergado && resultado.valor && resultado.valor.postergado === false && partido.predio && !partido.dia;
  if (vuelve && canchaOcupada(datos, partido.fecha, partido, partido.id)) {
    return fallo(`${textoOcupada(partido.fecha, partido).slice(0, -1)}: cambiale el lugar o la hora a este partido.`, 409);
  }
  return resultado;
}

export function validarPartidoNuevo(datos, cuerpo) {
  const { categoriaId, fecha, localId, visitanteId } = cuerpo || {};
  if (!datos.categorias.some((c) => c.id === categoriaId)) return fallo('Elegí una categoría válida.');
  if (!esEntero(fecha, 1, 60)) return fallo('La fecha tiene que ser un número entre 1 y 60.');
  if (!Number.isInteger(localId) || !Number.isInteger(visitanteId)) {
    return fallo('Elegí el equipo local y el visitante.');
  }
  if (localId === visitanteId) return fallo('Un equipo no puede jugar contra sí mismo.');
  if (categoriaDeEquipo(datos, localId) !== categoriaId || categoriaDeEquipo(datos, visitanteId) !== categoriaId) {
    return fallo('Los dos equipos tienen que ser de la categoría elegida.');
  }
  const dadoDeBaja = [localId, visitanteId].map((id) => datos.equipos.find((e) => e.id === id)).find((e) => e?.baja);
  if (dadoDeBaja) return fallo(`${dadoDeBaja.nombre} está dado de baja.`);
  // Evita cargar dos veces el mismo partido o un equipo en dos partidos de la misma fecha
  for (const equipoId of [localId, visitanteId]) {
    const ocupado = datos.partidos.some(
      (p) => p.fecha === fecha && (p.localId === equipoId || p.visitanteId === equipoId)
    );
    if (ocupado) {
      const nombre = datos.equipos.find((e) => e.id === equipoId).nombre;
      return fallo(`${nombre} ya tiene un partido en la fecha ${fecha}.`, 409);
    }
  }
  const lugar = validarLugarLibre(datos, fecha, cuerpo);
  if (lugar.error) return lugar;
  return { valor: { categoria_id: categoriaId, fecha, local_id: localId, visitante_id: visitanteId, ...lugar.valor } };
}

export function validarCambioPartido(datos, partidoId, cuerpo) {
  const partido = datos.partidos.find((p) => p.id === partidoId);
  if (!partido) return fallo('Ese partido no existe.', 404);
  return validarVuelveAJugarse(datos, partido, validarCambioDe(datos, partido, cuerpo));
}

function validarCambioDe(datos, partido, cuerpo) {
  const partidoId = partido.id;
  const c = cuerpo || {};
  // W.O.: el que no se presentó pierde 3 a 0 y no paga el arancel
  if ('ausente' in c) {
    if (c.ausente !== 'local' && c.ausente !== 'visitante') {
      return fallo('Elegí cuál de los dos equipos no se presentó.');
    }
    const ausenteId = c.ausente === 'local' ? partido.localId : partido.visitanteId;
    const pagos = pagosDePartido(datos.movimientos || [], partidoId, ausenteId);
    if (pagos.length) {
      const nombre = nombreDe(datos, ausenteId);
      return fallo(
        pagos.length === 1
          ? `${nombre} tiene un pago anotado en este partido. Para que esa plata no se pierda, quitá ese pago y anotalo como pago suelto en Cuentas; después marcá que no se presentó.`
          : `${nombre} tiene dos pagos anotados en este partido. Para que esa plata no se pierda, quitá esos pagos y anotalos como pagos sueltos en Cuentas; después marcá que no se presentó.`,
        409
      );
    }
    const [golesLocal, golesVisitante] = c.ausente === 'local' ? [0, 3] : [3, 0];
    return { valor: { goles_local: golesLocal, goles_visitante: golesVisitante, postergado: false, ausente: c.ausente } };
  }
  if ('golesLocal' in c || 'golesVisitante' in c) {
    if (c.golesLocal === null && c.golesVisitante === null) {
      // Un reprogramado sin resultado vuelve a postergado (se juega su día especial)
      const vuelveAPostergado = partido.dia ? { postergado: true } : {};
      return { valor: { goles_local: null, goles_visitante: null, ausente: null, ...vuelveAPostergado } };
    }
    if (!esEntero(c.golesLocal, 0, 99) || !esEntero(c.golesVisitante, 0, 99)) {
      return fallo('Los goles tienen que ser números enteros entre 0 y 99.');
    }
    // Al cargar el resultado, el partido deja de estar postergado y de ser W.O.
    return {
      valor: { goles_local: c.golesLocal, goles_visitante: c.golesVisitante, postergado: false, ausente: null },
    };
  }
  if ('dia' in c) return validarReprogramacion(datos, partido, c);
  if ('predio' in c || 'cancha' in c || 'hora' in c) {
    return validarLugarLibre(datos, partido.fecha, c, partidoId);
  }
  if ('postergado' in c) {
    if (typeof c.postergado !== 'boolean') return fallo('Indicá si el partido queda postergado o no.');
    if (c.postergado && partido.golesLocal !== null) {
      return fallo('El partido ya tiene resultado: quitalo antes de marcarlo postergado.');
    }
    return { valor: { postergado: c.postergado } };
  }
  return fallo('No hay cambios para guardar.');
}

// Un postergado se reprograma para un día especial: día, predio, cancha y hora. Sigue postergado
// hasta que se le carga el resultado. Ese día, dos partidos no pueden usar la misma cancha a la misma hora.
function validarReprogramacion(datos, partido, cuerpo) {
  if (!partido.postergado) return fallo('El día se carga solo en los postergados.');
  if (!esFecha(cuerpo.dia)) return fallo('Elegí el día.');
  const lugar = validarLugar(cuerpo);
  if (lugar.error) return fallo(lugar.error);
  const { predio, cancha, hora } = lugar.valor;
  const ocupada = datos.partidos.some(
    (p) => p.id !== partido.id && p.dia === cuerpo.dia && p.predio === predio && p.cancha === cancha && p.hora === hora
  );
  if (ocupada) {
    const dia = textoDia(cuerpo.dia);
    return fallo(
      `La cancha ${cancha} de ${nombrePredio(predio)} ya tiene un partido el ${dia[0].toLowerCase()}${dia.slice(1)} a las ${hora}.`,
      409
    );
  }
  return { valor: { dia: cuerpo.dia, ...lugar.valor } };
}

export function validarBorradoPartido(datos, partidoId) {
  if (!datos.partidos.some((p) => p.id === partidoId)) return fallo('Ese partido no existe.', 404);
  const cargado = [
    ['expulsiones', datos.expulsiones],
    ['tarjetas', datos.tarjetas],
    ['pagos', datos.movimientos],
  ]
    .filter(([, lista]) => (lista || []).some((x) => x.partidoId === partidoId))
    .map(([nombre]) => nombre);
  if (cargado.length) {
    return fallo(`No se puede borrar: el partido tiene ${enumerar(cargado)}. Quitalos antes de borrar el partido.`, 409);
  }
  return { valor: partidoId };
}

// Un jugador de uno de los dos equipos de un partido (para las rojas)
function validarJugadorDePartido(datos, cuerpo, sinPartido) {
  const { partidoId, equipoId, numeroCamiseta, nombreJugador = '' } = cuerpo || {};
  const partido = datos.partidos.find((p) => p.id === partidoId);
  if (!partido) return fallo(sinPartido);
  if (equipoId !== partido.localId && equipoId !== partido.visitanteId) {
    return fallo('El equipo tiene que ser uno de los dos que jugaron ese partido.');
  }
  if (!esEntero(numeroCamiseta, 1, 99)) return fallo('El número de camiseta es obligatorio (de 1 a 99).');
  const nombre = texto(nombreJugador);
  if (nombre === null || nombre.length > 60) return fallo('El nombre del jugador puede tener hasta 60 letras.');
  return {
    valor: { partido_id: partidoId, equipo_id: equipoId, numero_camiseta: numeroCamiseta, nombre_jugador: nombre },
  };
}

export function validarExpulsionNueva(datos, cuerpo) {
  const jugador = validarJugadorDePartido(datos, cuerpo, 'Elegí el partido en el que fue la expulsión.');
  if (jugador.error) return jugador;
  if (!TIPOS_ROJA.includes(cuerpo.tipo)) return fallo('Elegí si la roja fue por doble amarilla o directa.');
  return { valor: { ...jugador.valor, tipo: cuerpo.tipo } };
}

export function validarBorradoTarjeta(datos, tarjetaId) {
  if (!(datos.tarjetas || []).some((t) => t.id === tarjetaId)) return fallo('Esa tarjeta no existe.', 404);
  return { valor: tarjetaId };
}

export function validarCambioExpulsion(datos, expulsionId, cuerpo) {
  const expulsion = (datos.expulsiones || []).find((e) => e.id === expulsionId);
  if (!expulsion) return fallo('Esa expulsión no existe.', 404);
  const c = cuerpo || {};
  const suspension = 'fechasSuspension' in c ? c.fechasSuspension : expulsion.fechasSuspension;
  let cumplidas = 'fechasCumplidas' in c ? c.fechasCumplidas : expulsion.fechasCumplidas;
  if (suspension !== null && !esEntero(suspension, 0, 99)) {
    return fallo('Las fechas de suspensión tienen que ser un número entre 0 y 99.');
  }
  if (!esEntero(cumplidas, 0, 99)) return fallo('Las fechas cumplidas tienen que ser un número entre 0 y 99.');
  if (suspension === null && cumplidas > expulsion.fechasCumplidas) {
    return fallo('Primero cargá las fechas de suspensión que definió el tribunal.');
  }
  if (suspension !== null && cumplidas > suspension) {
    // Si se bajó la suspensión, las cumplidas se ajustan; si se sumaron de más, es un error
    if ('fechasCumplidas' in c) return fallo(`No puede cumplir más de las ${suspension} fechas de suspensión.`);
    cumplidas = suspension;
  }
  return { valor: { fechas_suspension: suspension, fechas_cumplidas: cumplidas } };
}

export function validarBorradoExpulsion(datos, expulsionId) {
  if (!(datos.expulsiones || []).some((e) => e.id === expulsionId)) return fallo('Esa expulsión no existe.', 404);
  return { valor: expulsionId };
}

// Monto, método, fecha y nota de un movimiento: valida los que vengan y los pasa a columnas
function validarCamposMovimiento(c, tipo) {
  const valor = {};
  if ('monto' in c) {
    if (!esEntero(c.monto, 1, MONTO_MAXIMO)) return fallo('El monto tiene que ser un número entero de pesos, mayor que 0.');
    valor.monto = c.monto;
  }
  if ('metodo' in c) {
    if (tipo !== 'pago') return fallo('El método de pago va solo en los pagos.');
    if (!METODOS.includes(c.metodo)) return fallo('Elegí si pagó en efectivo o por transferencia.');
    valor.metodo = c.metodo;
  }
  if ('fecha' in c) {
    if (!esFecha(c.fecha)) return fallo('La fecha no es válida.');
    valor.fecha = c.fecha;
  }
  if ('nota' in c) {
    const nota = texto(c.nota);
    if (nota === null || nota.length > 100) return fallo('La nota puede tener hasta 100 letras.');
    valor.nota = nota;
  }
  return { valor };
}

export function validarMovimientoNuevo(datos, cuerpo) {
  const c = { nota: '', ...(cuerpo || {}) };
  if (!TIPOS_MOVIMIENTO.includes(c.tipo)) return fallo('Indicá si es un pago o una deuda anterior.');
  if (!datos.equipos.some((e) => e.id === c.equipoId)) return fallo('Elegí el equipo.');
  const esPago = c.tipo === 'pago';
  if (esPago && !('metodo' in c)) return fallo('Elegí si pagó en efectivo o por transferencia.');
  // El monto y la fecha son obligatorios: si no vinieron, se validan igual (y fallan)
  const campos = validarCamposMovimiento({ ...c, monto: c.monto, fecha: c.fecha }, c.tipo);
  if (campos.error) return campos;

  const partidoId = c.partidoId ?? null;
  if (partidoId !== null) {
    if (!esPago) return fallo('Una deuda anterior no va en un partido.');
    const partido = datos.partidos.find((p) => p.id === partidoId);
    if (!partido) return fallo('Ese partido no existe.');
    const lado = partido.localId === c.equipoId ? 'local' : partido.visitanteId === c.equipoId ? 'visitante' : null;
    if (!lado) return fallo('El equipo tiene que ser uno de los dos que jugaron ese partido.');
    if (partido.ausente === lado) return fallo(`${nombreDe(datos, c.equipoId)} no se presentó: no paga este partido.`);
    // Un pago por medio: la otra parte del mismo partido va con el otro medio
    if (pagosDePartido(datos.movimientos || [], partidoId, c.equipoId).some((m) => m.metodo === c.metodo)) {
      return fallo(
        `${nombreDe(datos, c.equipoId)} ya tiene un pago ${conMedio(c.metodo)} anotado en este partido: corregilo en lugar de anotar otro.`,
        409
      );
    }
  }
  return { valor: { tipo: c.tipo, equipo_id: c.equipoId, partido_id: partidoId, metodo: null, ...campos.valor } };
}

export function validarCambioMovimiento(datos, movimientoId, cuerpo) {
  const movimiento = (datos.movimientos || []).find((m) => m.id === movimientoId);
  if (!movimiento) return fallo('Ese movimiento no existe.', 404);
  const c = cuerpo || {};
  const cambios = Object.fromEntries(['monto', 'metodo', 'fecha', 'nota'].filter((k) => k in c).map((k) => [k, c[k]]));
  if (!Object.keys(cambios).length) return fallo('No hay cambios para guardar.');
  const campos = validarCamposMovimiento(cambios, movimiento.tipo);
  if (campos.error) return campos;
  const otraParte =
    movimiento.partidoId !== null &&
    'metodo' in campos.valor &&
    pagosDePartido(datos.movimientos, movimiento.partidoId, movimiento.equipoId).some(
      (m) => m.id !== movimiento.id && m.metodo === campos.valor.metodo
    );
  if (otraParte) {
    return fallo(
      `${nombreDe(datos, movimiento.equipoId)} ya tiene un pago ${conMedio(campos.valor.metodo)} anotado en este partido: cambiá ese en lugar de este.`,
      409
    );
  }
  return campos;
}

export function validarBorradoMovimiento(datos, movimientoId) {
  if (!(datos.movimientos || []).some((m) => m.id === movimientoId)) return fallo('Ese movimiento no existe.', 404);
  return { valor: movimientoId };
}

export function validarCambioEquipo(datos, equipoId, cuerpo) {
  if (!datos.equipos.some((e) => e.id === equipoId)) return fallo('Ese equipo no existe.', 404);
  const nombre = texto(cuerpo?.nombre);
  if (!nombre || nombre.length > 60) return fallo('Escribí el nombre del equipo (hasta 60 letras).');
  const delegado = texto(cuerpo?.delegado ?? '');
  if (delegado === null || delegado.length > 60) return fallo('El nombre del delegado puede tener hasta 60 letras.');
  const telefono = soloDigitos(cuerpo?.telefonoDelegado ?? '');
  if (telefono && !validarTelefono(telefono)) {
    return fallo('El WhatsApp tiene que tener entre 10 y 15 números, con código de país. Por ejemplo: 5491123456789.');
  }
  return { valor: { equipo: { nombre }, delegado: { equipo_id: equipoId, nombre: delegado, telefono } } };
}

// Un equipo nuevo en una zona: { zonaId, nombre }. El nombre no puede repetirse en la categoría
// (tampoco el de uno dado de baja), sin distinguir mayúsculas, acentos ni espacios de más.
export function validarEquipoNuevo(datos, cuerpo) {
  const zona = datos.zonas.find((z) => z.id === cuerpo?.zonaId);
  if (!zona) return fallo('Elegí una zona válida.');
  const nombre = texto(cuerpo?.nombre);
  if (!nombre || nombre.length > 60) return fallo('Escribí el nombre del equipo (hasta 60 letras).');
  const repetido = datos.equipos.find(
    (e) => categoriaDeEquipo(datos, e.id) === zona.categoriaId && mismoNombre(e.nombre, nombre)
  );
  if (repetido) {
    const categoria = datos.categorias.find((c) => c.id === zona.categoriaId).nombre;
    return fallo(`Ya hay un equipo ${repetido.nombre} en ${categoria}.`, 409);
  }
  return { valor: { zona_id: zona.id, nombre } };
}

// Dar de baja (deja la tabla, lo jugado queda) o volver a dar de alta: { baja: true | false }.
// No se da de baja un equipo con partidos sin resultado: primero se les carga o se borran.
export function validarBaja(datos, equipoId, cuerpo) {
  const equipo = datos.equipos.find((e) => e.id === equipoId);
  if (!equipo) return fallo('Ese equipo no existe.', 404);
  if (typeof cuerpo?.baja !== 'boolean') return fallo('Indicá si el equipo se da de baja o vuelve.');
  if (cuerpo.baja) {
    const pendientes = partidosPendientes(datos.partidos, equipoId).length;
    if (pendientes) return fallo(textoPendientes(equipo.nombre, pendientes), 409);
  }
  return { valor: { baja: cuerpo.baja } };
}

const ESCUDO_INVALIDO = 'El escudo tiene que ser una imagen WebP o PNG de hasta 100 KB.';
const FIRMA_PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// Qué imagen es según sus primeros bytes (no según lo que dice el texto): 'image/png', 'image/webp' o null
function tipoDeImagen(bytes) {
  if (FIRMA_PNG.every((byte, i) => bytes[i] === byte)) return 'image/png';
  const letras = (desde, hasta) => String.fromCharCode(...bytes.slice(desde, hasta));
  if (bytes.length >= 12 && letras(0, 4) === 'RIFF' && letras(8, 12) === 'WEBP') return 'image/webp';
  return null;
}

// El escudo nuevo de un equipo, ya achicado en el navegador: { imagen: 'data:image/webp;base64,...' } (o PNG)
export function validarEscudo(datos, equipoId, cuerpo) {
  if (!datos.equipos.some((e) => e.id === equipoId)) return fallo('Ese equipo no existe.', 404);
  const imagen = typeof cuerpo?.imagen === 'string' ? cuerpo.imagen : '';
  const partes = /^data:(image\/(?:webp|png));base64,([A-Za-z0-9+/]+={0,2})$/.exec(imagen);
  if (!partes) return fallo(ESCUDO_INVALIDO);
  let bytes;
  try {
    bytes = Uint8Array.from(atob(partes[2]), (letra) => letra.charCodeAt(0));
  } catch {
    return fallo(ESCUDO_INVALIDO);
  }
  const tipo = partes[1];
  if (bytes.length > PESO_MAXIMO_ESCUDO || tipoDeImagen(bytes) !== tipo) return fallo(ESCUDO_INVALIDO);
  return { valor: { imagen, bytes, tipo, extension: tipo === 'image/png' ? 'png' : 'webp' } };
}

export function validarConfiguracion(cuerpo) {
  const c = cuerpo || {};
  const valor = {};
  if ('nombreCampeonato' in c) {
    const nombre = texto(c.nombreCampeonato);
    if (!nombre || nombre.length > 60) return fallo('Escribí el nombre del campeonato (hasta 60 letras).');
    valor.nombre_campeonato = nombre;
  }
  if ('criteriosDesempate' in c) {
    const lista = c.criteriosDesempate;
    const todos = Object.keys(CRITERIOS);
    const completa =
      Array.isArray(lista) && lista.length === todos.length && todos.every((clave) => lista.includes(clave));
    if (!completa) return fallo('El orden de desempate tiene que incluir cada criterio una sola vez.');
    valor.criterios_desempate = lista;
  }
  if ('arancel' in c) {
    if (!esEntero(c.arancel, 0, MONTO_MAXIMO)) return fallo('El arancel tiene que ser un número entero de pesos.');
    valor.arancel = c.arancel;
  }
  if (!Object.keys(valor).length) return fallo('No hay cambios para guardar.');
  return { valor };
}

// ---------- Veedores ----------
// Además de las reglas de siempre, un veedor solo toca los partidos que ve (la fecha en juego, en
// cada cancha) y solo resultado, W.O., rojas sin sanción y pagos de partidos.
// Devuelven null si puede, o el error 403.

const NO_PUEDE_VEEDOR = 'Tu cuenta de veedor no puede hacer esto.';
const CAMBIOS_DE_VEEDOR = ['golesLocal', 'golesVisitante', 'ausente'];

const fueraDeSusPartidos = (datos, partidoId) =>
  esPartidoDeVeedor(datos.partidos, partidoId)
    ? null
    : fallo('Ese partido no es de la fecha en juego: pedile al organizador que lo corrija.', 403);

export function permisoVeedorPartido(datos, partidoId, cuerpo) {
  const claves = Object.keys(cuerpo || {});
  if (!claves.length || claves.some((k) => !CAMBIOS_DE_VEEDOR.includes(k))) return fallo(NO_PUEDE_VEEDOR, 403);
  return fueraDeSusPartidos(datos, partidoId);
}

export const permisoVeedorRojaNueva = (datos, cuerpo) => fueraDeSusPartidos(datos, cuerpo?.partidoId);

export function permisoVeedorBorrarRoja(datos, expulsionId) {
  const roja = (datos.expulsiones || []).find((e) => e.id === expulsionId);
  if (!roja) return null; // responde la regla de siempre (404)
  if (roja.fechasSuspension !== null) {
    return fallo('Esa roja ya tiene sanción: para borrarla, hablá con el organizador.', 403);
  }
  return fueraDeSusPartidos(datos, roja.partidoId);
}

export function permisoVeedorPagoNuevo(datos, cuerpo) {
  if (cuerpo?.tipo !== 'pago' || cuerpo.partidoId === null || cuerpo.partidoId === undefined) {
    return fallo(NO_PUEDE_VEEDOR, 403);
  }
  return fueraDeSusPartidos(datos, cuerpo.partidoId);
}

export function permisoVeedorPago(datos, movimientoId) {
  const movimiento = (datos.movimientos || []).find((m) => m.id === movimientoId);
  if (!movimiento) return null; // responde la regla de siempre (404)
  if (movimiento.tipo !== 'pago' || movimiento.partidoId === null) return fallo(NO_PUEDE_VEEDOR, 403);
  return fueraDeSusPartidos(datos, movimiento.partidoId);
}
