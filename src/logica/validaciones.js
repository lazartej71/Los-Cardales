/**
 * Validaciones de los formularios.
 */

/* ---------- Validaciones ---------- */

// Goles: entero de 0 a 99. Devuelve el número o null si no es válido.
export function validarGoles(valor) {
  const texto = String(valor).trim();
  if (!/^\d{1,2}$/.test(texto)) return null;
  return Number(texto);
}

// Camiseta: entero de 1 a 99. Devuelve el número o null.
export function validarCamiseta(valor) {
  const texto = String(valor).trim();
  if (!/^\d{1,2}$/.test(texto)) return null;
  const numero = Number(texto);
  return numero >= 1 && numero <= 99 ? numero : null;
}

// Teléfono con código de país, solo números (10 a 15 dígitos)
export const validarTelefono = (digitos) => /^\d{10,15}$/.test(digitos);
