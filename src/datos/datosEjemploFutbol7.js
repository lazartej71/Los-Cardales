/**
 * Los datos de ejemplo con Fútbol 7 sumado (solo para las pruebas): una Libre de F7 con dos zonas de
 * 4 equipos, la fecha 1 armada en las canchas de F7 (una jugada), un pago y una roja.
 */

import { crearDatosEjemplo } from './datosEjemplo.js';

const equipoF7 = (id, zonaId, nombre) => ({ id, zonaId, nombre, delegado: '', telefonoDelegado: '' });

const partidoF7 = (id, localId, visitanteId, predio, cancha, goles = null) => ({
  id,
  categoriaId: 10,
  fecha: 1,
  localId,
  visitanteId,
  golesLocal: goles ? goles[0] : null,
  golesVisitante: goles ? goles[1] : null,
  postergado: false,
  ausente: null,
  predio,
  cancha,
  hora: '15:30',
  dia: null,
});

export function conFutbol7(db = crearDatosEjemplo()) {
  const base = structuredClone(db);
  return {
    ...base,
    categorias: [
      ...base.categorias.map((c) => ({ ...c, modalidad: 'f11', arancel: null })),
      { id: 10, nombre: 'Libre', orden: 10, modalidad: 'f7', arancel: 65000 },
    ],
    zonas: [...base.zonas, { id: 20, categoriaId: 10, nombre: 'Zona A' }, { id: 21, categoriaId: 10, nombre: 'Zona B' }],
    equipos: [
      ...base.equipos,
      ...[1, 2, 3, 4].map((n) => equipoF7(100 + n, 20, `F7 A${n}`)),
      ...[1, 2, 3, 4].map((n) => equipoF7(104 + n, 21, `F7 B${n}`)),
    ],
    partidos: [
      ...base.partidos,
      partidoF7(201, 101, 102, 'los_cardales', 21, [2, 1]),
      partidoF7(202, 103, 104, 'cura_borges', 22),
      partidoF7(203, 105, 106, 'cura_borges', 21),
      partidoF7(204, 107, 108, 'cura_borges', 23),
    ],
    movimientos: [
      ...base.movimientos,
      { id: 900, equipoId: 101, partidoId: 201, tipo: 'pago', monto: 65000, metodo: 'efectivo', fecha: '2026-10-10', nota: '' },
    ],
    expulsiones: [
      ...base.expulsiones,
      {
        id: 900,
        partidoId: 201,
        equipoId: 102,
        numeroCamiseta: 8,
        nombreJugador: '',
        fechasSuspension: null,
        fechasCumplidas: 0,
        tipo: 'directa',
      },
    ],
  };
}
