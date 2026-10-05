import { describe, expect, it, vi } from 'vitest';
import { crearDatosEjemplo } from '../src/datos/datosEjemplo.js';
import { crearRepositorioMemoria } from './repositorioMemoria.js';

// Lo mismo que devuelve la base real a cualquiera (sin expulsiones ni delegados)
function publicoDeEjemplo() {
  const datos = crearDatosEjemplo();
  return {
    categorias: datos.categorias,
    zonas: datos.zonas,
    equipos: datos.equipos.map(({ id, zonaId, nombre }) => ({ id, zonaId, nombre })),
    tablaInicial: datos.tablaInicial,
    partidos: datos.partidos,
    configuracion: datos.configuracion,
  };
}

function armar() {
  const inicial = publicoDeEjemplo();
  const cargar = vi.fn(async () => inicial);
  const crearRepositorio = crearRepositorioMemoria(cargar);
  return { inicial, cargar, repo: crearRepositorio('simulacion'), crearRepositorio };
}

describe('base en memoria de la simulación', () => {
  it('arranca con los datos reales y los lee una sola vez', async () => {
    const { inicial, cargar, repo, crearRepositorio } = armar();
    // Los partidos salen ordenados por fecha, como en la base real
    const partidos = [...inicial.partidos].sort((a, b) => a.fecha - b.fecha || a.id - b.id);
    expect(await repo.leerPublico()).toEqual({ ...inicial, partidos });
    await crearRepositorio(null).leerPublico();
    expect(cargar).toHaveBeenCalledTimes(1);
  });

  it('crea un partido con los valores por defecto de la base y un id nuevo', async () => {
    const { inicial, repo } = armar();
    const maximo = Math.max(...inicial.partidos.map((p) => p.id));
    const [a, b] = inicial.equipos;
    const creado = await repo.insertar('partidos', { categoria_id: 1, fecha: 9, local_id: a.id, visitante_id: b.id });
    expect(creado).toEqual({
      id: maximo + 1,
      categoriaId: 1,
      fecha: 9,
      localId: a.id,
      visitanteId: b.id,
      golesLocal: null,
      golesVisitante: null,
      postergado: false,
      ausente: null,
      predio: null,
      cancha: null,
      hora: null,
      dia: null,
    });
    expect((await repo.leerPublico()).partidos.at(-1)).toEqual(creado);
  });

  it('guarda el lugar y la hora del partido', async () => {
    const { inicial, repo } = armar();
    const [a, b] = inicial.equipos;
    const lugar = { predio: 'cura_borges', cancha: 9, hora: '15:10' };
    const creado = await repo.insertar('partidos', { categoria_id: 1, fecha: 9, local_id: a.id, visitante_id: b.id, ...lugar });
    expect(creado).toMatchObject(lugar);
    await repo.actualizar('partidos', creado.id, { cancha: 8 });
    expect((await repo.leerPublico()).partidos.find((p) => p.id === creado.id)).toMatchObject({ ...lugar, cancha: 8 });
  });

  it('carga el resultado y borra partidos', async () => {
    const { inicial, repo } = armar();
    const id = inicial.partidos[0].id;
    await repo.actualizar('partidos', id, { goles_local: 3, goles_visitante: 1, postergado: false });
    expect((await repo.leerPublico()).partidos.find((p) => p.id === id)).toMatchObject({ golesLocal: 3, golesVisitante: 1 });
    await repo.borrar('partidos', id);
    expect((await repo.leerPublico()).partidos.some((p) => p.id === id)).toBe(false);
  });

  it('las expulsiones y los delegados solo los ve el panel', async () => {
    const { inicial, repo } = armar();
    const partido = inicial.partidos[0];
    const expulsion = await repo.insertar('expulsiones', {
      partido_id: partido.id,
      equipo_id: partido.localId,
      numero_camiseta: 10,
      nombre_jugador: '',
    });
    await repo.guardarDelegado({ equipo_id: partido.localId, nombre: 'Ana', telefono: '5491151001234' });

    const admin = await repo.leerAdmin();
    expect(admin.expulsiones).toEqual([
      { id: 1, partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 10, nombreJugador: '', fechasSuspension: null, fechasCumplidas: 0, tipo: null },
    ]);
    expect(expulsion.id).toBe(1);
    expect(admin.equipos.find((e) => e.id === partido.localId)).toMatchObject({ delegado: 'Ana', telefonoDelegado: '5491151001234' });
    expect(admin.equipos.find((e) => e.id !== partido.localId)).toMatchObject({ delegado: '', telefonoDelegado: '' });

    const publico = await repo.leerPublico();
    expect(publico.expulsiones).toBeUndefined();
    expect(JSON.stringify(publico)).not.toMatch(/telefono|5491151001234/);
  });

  it('cambia el nombre de un equipo y la configuración', async () => {
    const { inicial, repo } = armar();
    await repo.actualizar('equipos', inicial.equipos[0].id, { nombre: 'Nuevo nombre' });
    await repo.actualizar('configuracion', 1, { nombre_campeonato: 'Copa Prueba', criterios_desempate: ['dg', 'puntos', 'gf', 'enfrentamiento'] });
    const publico = await repo.leerPublico();
    expect(publico.equipos[0].nombre).toBe('Nuevo nombre');
    expect(publico.configuracion).toEqual({
      nombreCampeonato: 'Copa Prueba',
      criteriosDesempate: ['dg', 'puntos', 'gf', 'enfrentamiento'],
      arancel: 105000,
    });
  });

  it('no toca los datos que recibió ni deja modificar lo que devuelve', async () => {
    const { inicial, repo } = armar();
    const copia = structuredClone(inicial);
    const leido = await repo.leerPublico();
    leido.partidos[0].golesLocal = 99;
    await repo.actualizar('partidos', inicial.partidos[1].id, { goles_local: 0, goles_visitante: 0, postergado: false });
    expect(inicial).toEqual(copia);
    expect((await repo.leerPublico()).partidos[0].golesLocal).toBe(copia.partidos[0].golesLocal);
  });

  it('las tarjetas y los movimientos arrancan vacíos y solo los ve el panel', async () => {
    const { inicial, repo } = armar();
    const partido = inicial.partidos[0];
    const tarjeta = await repo.insertar('tarjetas', {
      partido_id: partido.id,
      equipo_id: partido.localId,
      numero_camiseta: 7,
    });
    const pago = await repo.insertar('movimientos', {
      tipo: 'pago',
      equipo_id: partido.localId,
      partido_id: partido.id,
      monto: 95000,
      metodo: 'efectivo',
      fecha: '2026-10-15',
    });
    expect(tarjeta).toEqual({ id: 1, partidoId: partido.id, equipoId: partido.localId, numeroCamiseta: 7, nombreJugador: '' });
    expect(pago).toEqual({
      id: 1,
      tipo: 'pago',
      equipoId: partido.localId,
      partidoId: partido.id,
      monto: 95000,
      metodo: 'efectivo',
      fecha: '2026-10-15',
      nota: '',
    });
    const admin = await repo.leerAdmin();
    expect(admin.tarjetas).toEqual([tarjeta]);
    expect(admin.movimientos).toEqual([pago]);
    const publico = await repo.leerPublico();
    expect(publico.tarjetas).toBeUndefined();
    expect(publico.movimientos).toBeUndefined();
  });

  it('cualquier sesión cuenta como admin', async () => {
    const { repo, crearRepositorio } = armar();
    expect(await repo.usuarioActual()).toEqual({ id: 'simulacion' });
    expect(await repo.esAdmin()).toBe(true);
    expect(await crearRepositorio(null).usuarioActual()).toBeNull();
  });

  it('si no pudo leer los datos reales, lo vuelve a intentar en el próximo pedido', async () => {
    const cargar = vi.fn().mockRejectedValueOnce(new Error('sin conexión')).mockResolvedValueOnce(publicoDeEjemplo());
    const repo = crearRepositorioMemoria(cargar)('simulacion');
    await expect(repo.leerPublico()).rejects.toThrow('sin conexión');
    expect((await repo.leerPublico()).equipos).toHaveLength(32);
  });

  it('en la simulación la cuenta es superadmin', async () => {
    expect(await armar().repo.rol()).toBe('superadmin');
    expect(await armar().repo.esVeedor()).toBe(false);
  });

  it('se puede probar como admin o como veedor según la sesión simulada', async () => {
    const { crearRepositorio } = armar();
    const admin = crearRepositorio('simulacion-admin');
    expect([await admin.esAdmin(), await admin.esVeedor(), await admin.rol()]).toEqual([true, false, 'admin']);
    const veedor = crearRepositorio('simulacion-veedor');
    expect([await veedor.esAdmin(), await veedor.esVeedor()]).toEqual([false, true]);
    expect(await veedor.usuarioActual()).toEqual({ id: 'simulacion-veedor' });
  });

  it('el veedor de la simulación no ve teléfonos ni amarillas, como en la base real', async () => {
    const { inicial, repo, crearRepositorio } = armar();
    const partido = inicial.partidos[0];
    await repo.guardarDelegado({ equipo_id: partido.localId, nombre: 'Ana', telefono: '5491151001234' });
    await repo.insertar('tarjetas', { partido_id: partido.id, equipo_id: partido.localId, numero_camiseta: 7 });
    const datos = await crearRepositorio('simulacion-veedor').leerAdmin();
    expect(datos.tarjetas).toEqual([]);
    expect(datos.equipos.find((e) => e.id === partido.localId)).toMatchObject({ delegado: '', telefonoDelegado: '' });
  });

  it('lo que carga cada uno queda anotado con su rol', async () => {
    const { inicial, crearRepositorio } = armar();
    await crearRepositorio('simulacion-veedor').actualizar('partidos', inicial.partidos[0].id, { goles_local: 9 });
    const [entrada] = await crearRepositorio('simulacion').leerActividad({
      desde: '2000-01-01T00:00:00-03:00',
      hasta: '2999-01-01T00:00:00-03:00',
    });
    expect(entrada.quien).toBe('Simulación (veedor)');
  });

  it('anota la actividad de cada alta, cambio y baja', async () => {
    const { inicial, repo } = armar();
    const [a, b] = inicial.equipos;
    const creado = await repo.insertar('partidos', { categoria_id: 1, fecha: 9, local_id: a.id, visitante_id: b.id });
    await repo.actualizar('partidos', creado.id, { goles_local: 2, goles_visitante: 1, postergado: false });
    await repo.borrar('partidos', creado.id);
    const hoy = { desde: '2000-01-01T00:00:00-03:00', hasta: '2999-01-01T00:00:00-03:00' };
    const actividad = await repo.leerActividad(hoy);
    // Del más nuevo al más viejo; el cambio solo anota lo que cambió de verdad
    expect(actividad.map((e) => [e.quien, e.accion, e.tabla, e.cambios])).toEqual([
      ['Simulación', 'baja', 'partidos', null],
      ['Simulación', 'cambio', 'partidos', ['goles_local', 'goles_visitante']],
      ['Simulación', 'alta', 'partidos', null],
    ]);
    expect(actividad[0].fila).toMatchObject({ id: creado.id, golesLocal: 2 });
    expect(typeof actividad[0].creadoEn).toBe('string');
    expect(await repo.leerActividad({ desde: '2000-01-01T00:00:00-03:00', hasta: '2000-01-02T00:00:00-03:00' })).toEqual([]);
  });

  it('un cambio que no cambia nada no se anota', async () => {
    const { inicial, repo } = armar();
    const partido = inicial.partidos[0];
    await repo.actualizar('partidos', partido.id, { postergado: partido.postergado });
    expect(await repo.leerActividad({ desde: '2000-01-01T00:00:00-03:00', hasta: '2999-01-01T00:00:00-03:00' })).toEqual([]);
  });

  it('suma las visitas del día', async () => {
    const { repo, crearRepositorio } = armar();
    await crearRepositorio(null).sumarVisita();
    await crearRepositorio(null).sumarVisita();
    const visitas = await repo.leerVisitas();
    expect(visitas).toHaveLength(1);
    expect(visitas[0]).toMatchObject({ personas: 2 });
    expect(visitas[0].dia).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
