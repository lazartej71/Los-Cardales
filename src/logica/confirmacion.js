/**
 * Lo que muestra la hoja de confirmación antes de guardar un resultado o un W.O.: la modalidad bien
 * grande (para no cargar en la otra), la categoría, las zonas, la fecha, la cancha y el marcador.
 */

import { MODALIDADES } from '../datos/constantes.js';
import { textoLugar } from './lugar.js';
import { modalidadDePartido } from './modalidades.js';

// cambio: { golesLocal, golesVisitante } o { ausente: 'local' | 'visitante' }
export function resumenConfirmacion(db, partido, cambio) {
  const equipo = (id) => db.equipos.find((e) => e.id === id);
  const zona = (e) => db.zonas.find((z) => z.id === e?.zonaId)?.nombre ?? '';
  const [local, visitante] = [equipo(partido.localId), equipo(partido.visitanteId)];
  const zonas = [...new Set([zona(local), zona(visitante)])].join(' vs ');
  let marcador;
  if (cambio.ausente) {
    const [falto, gano] = cambio.ausente === 'local' ? [local, visitante] : [visitante, local];
    marcador = `No se presentó ${falto.nombre}: ${gano.nombre} gana 3 a 0.`;
  } else {
    marcador = `${local.nombre} ${cambio.golesLocal} – ${cambio.golesVisitante} ${visitante.nombre}`;
  }
  return {
    modalidad: MODALIDADES.find((m) => m.id === modalidadDePartido(db, partido)).chip,
    categoria: db.categorias.find((c) => c.id === partido.categoriaId)?.nombre ?? '',
    zonas,
    fecha: `Fecha ${partido.fecha}`,
    lugar: textoLugar(partido),
    marcador,
  };
}
