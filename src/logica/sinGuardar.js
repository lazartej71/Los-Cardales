/**
 * Resultados tocados y sin guardar en Cargar (y Veedores): antes de cerrar el partido, cambiar de cancha o
 * de modalidad, se pregunta si se descartan. Cada editor de partido marca si tiene goles sin guardar.
 */

export function crearRegistroSinGuardar() {
  const pendientes = new Set();
  return {
    marcar: (partidoId, sucio) => (sucio ? pendientes.add(partidoId) : pendientes.delete(partidoId)),
    hay: () => pendientes.size > 0,
    limpiar: () => pendientes.clear(),
  };
}

// true si se puede seguir: no hay nada sin guardar, o la persona acepta descartarlo
export function confirmarDescarte(registro, confirmar = (texto) => window.confirm(texto)) {
  if (!registro?.hay()) return true;
  if (!confirmar('¿Descartar el resultado sin guardar?')) return false;
  registro.limpiar();
  return true;
}
