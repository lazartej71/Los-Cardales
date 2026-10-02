/**
 * Reglas del servidor: validan lo que manda la app antes de tocar la base.
 * Funciones puras: reciben los datos actuales y el cuerpo del pedido, y devuelven
 * { valor } listo para guardar (con los nombres de columna de la base) o { error, estado }.
 * Las que miran pagos o tarjetas usan datos.movimientos y datos.tarjetas (los trae leerAdmin).
 */

import { CRITERIOS } from '../src/datos/constantes.js';
import { pagoDePartido } from '../src/logica/cuentas.js';
import { soloDigitos } from '../src/logica/expulsiones.js';
import { validarTelefono } from '../src/logica/validaciones.js';

const fallo = (error, estado = 400) => ({ error, estado });
const esEntero = (valor, min, max) => Number.isInteger(valor) && valor >= min && valor <= max;
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : null);
const nombreDe = (datos, equipoId) => datos.equipos.find((e) => e.id === equipoId)?.nombre ?? 'El equipo';
const MONTO_MAXIMO = 10000000;
const METODOS = ['efectivo', 'transferencia'];
const TIPOS_MOVIMIENTO = ['pago', 'deuda_anterior'];

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
  return { valor: { categoria_id: categoriaId, fecha, local_id: localId, visitante_id: visitanteId } };
}

export function validarCambioPartido(datos, partidoId, cuerpo) {
  const partido = datos.partidos.find((p) => p.id === partidoId);
  if (!partido) return fallo('Ese partido no existe.', 404);
  const c = cuerpo || {};
  // W.O.: el que no se presentó pierde 3 a 0 y no paga el arancel
  if ('ausente' in c) {
    if (c.ausente !== 'local' && c.ausente !== 'visitante') {
      return fallo('Elegí cuál de los dos equipos no se presentó.');
    }
    const ausenteId = c.ausente === 'local' ? partido.localId : partido.visitanteId;
    if (pagoDePartido(datos.movimientos || [], partidoId, ausenteId)) {
      return fallo(
        `${nombreDe(datos, ausenteId)} tiene un pago anotado en este partido. Para que esa plata no se pierda, quitá ese pago y anotalo como pago suelto en Cuentas; después marcá que no se presentó.`,
        409
      );
    }
    const [golesLocal, golesVisitante] = c.ausente === 'local' ? [0, 3] : [3, 0];
    return { valor: { goles_local: golesLocal, goles_visitante: golesVisitante, postergado: false, ausente: c.ausente } };
  }
  if ('golesLocal' in c || 'golesVisitante' in c) {
    if (c.golesLocal === null && c.golesVisitante === null) {
      return { valor: { goles_local: null, goles_visitante: null, ausente: null } };
    }
    if (!esEntero(c.golesLocal, 0, 99) || !esEntero(c.golesVisitante, 0, 99)) {
      return fallo('Los goles tienen que ser números enteros entre 0 y 99.');
    }
    // Al cargar el resultado, el partido deja de estar postergado y de ser W.O.
    return {
      valor: { goles_local: c.golesLocal, goles_visitante: c.golesVisitante, postergado: false, ausente: null },
    };
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

// Un jugador de uno de los dos equipos de un partido: expulsiones (rojas) y amarillas
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
  return validarJugadorDePartido(datos, cuerpo, 'Elegí el partido en el que fue la expulsión.');
}

export function validarTarjetaNueva(datos, cuerpo) {
  return validarJugadorDePartido(datos, cuerpo, 'Ese partido no existe.');
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
    if (pagoDePartido(datos.movimientos || [], partidoId, c.equipoId)) {
      return fallo(
        `${nombreDe(datos, c.equipoId)} ya tiene un pago anotado en este partido: corregilo en lugar de anotar otro.`,
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
  return validarCamposMovimiento(cambios, movimiento.tipo);
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
