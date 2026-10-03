/**
 * Estado de las expulsiones y armado del aviso por WhatsApp.
 */

/* ---------- Expulsiones y avisos ---------- */

// Pendiente de tribunal (sin fechas definidas), suspendido o habilitado
export function estadoExpulsion(expulsion) {
  const { fechasSuspension, fechasCumplidas } = expulsion;
  if (fechasSuspension === null || fechasSuspension === undefined) {
    return { tipo: 'pendiente', texto: 'Pendiente de tribunal' };
  }
  const restantes = Math.max(0, fechasSuspension - fechasCumplidas);
  if (restantes > 0) {
    return {
      tipo: 'suspendido',
      texto: `Suspendido (${restantes === 1 ? 'queda 1 fecha' : `quedan ${restantes} fechas`})`,
    };
  }
  return { tipo: 'habilitado', texto: 'Habilitado' };
}

// La sanción como la lee el delegado; sin fechas definidas, la decide el tribunal
function lineasSancion(fechas) {
  if (fechas === null || fechas === undefined) {
    return ['⏳ Suspensión: *a definir por el tribunal*. Te avisamos cuando haya resolución.'];
  }
  if (fechas === 0) return ['✅ Sin fechas de suspensión: puede jugar la próxima fecha.'];
  return [
    `⛔ Suspensión: *${fechas === 1 ? '1 fecha' : `${fechas} fechas`}*`,
    '',
    'No puede jugar hasta cumplir la sanción. Cualquier consulta, respondé este mensaje.',
  ];
}

// Mensaje de WhatsApp para el delegado (*negrita* y _cursiva_ son el formato de WhatsApp)
export function mensajeExpulsion(expulsion, detalle) {
  const delegado = (detalle.equipo.delegado || '').trim();
  const jugador = expulsion.nombreJugador ? ` · ${expulsion.nombreJugador}` : '';
  const categoria = detalle.categoria ? `${detalle.categoria.nombre} · ` : '';
  return [
    '🟥 *LOS CARDALES FÚTBOL · Expulsión*',
    '',
    `Hola${delegado ? ` ${delegado}` : ''}, te informamos que en la fecha ${detalle.partido.fecha} ` +
      `(${categoria}${detalle.local.nombre} vs ${detalle.visitante.nombre}) ` +
      `fue expulsado un jugador de *${detalle.equipo.nombre}*:`,
    '',
    `👕 N° ${expulsion.numeroCamiseta}${jugador}`,
    ...lineasSancion(expulsion.fechasSuspension),
    '',
    '_Mensaje automático de Los Cardales Fútbol_',
  ].join('\n');
}

export const soloDigitos = (texto) => String(texto || '').replace(/\D/g, '');

export const linkWhatsApp = (telefono, mensaje) =>
  `https://wa.me/${soloDigitos(telefono)}?text=${encodeURIComponent(mensaje)}`;
