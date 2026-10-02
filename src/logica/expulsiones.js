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

export function mensajeExpulsion(expulsion, detalle) {
  return (
    `Aviso del Campeonato: del equipo ${detalle.equipo.nombre} fue expulsado el jugador ` +
    `N° ${expulsion.numeroCamiseta} en la fecha ${detalle.partido.fecha} ` +
    `(${detalle.local.nombre} vs ${detalle.visitante.nombre}).`
  );
}

export const soloDigitos = (texto) => String(texto || '').replace(/\D/g, '');

export const linkWhatsApp = (telefono, mensaje) =>
  `https://wa.me/${soloDigitos(telefono)}?text=${encodeURIComponent(mensaje)}`;
