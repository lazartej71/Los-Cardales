/**
 * Campo de texto con etiqueta, ayuda y error.
 */

// Campo de texto con etiqueta, ayuda y error asociados
export function CampoTexto({ id, etiqueta, valor, onCambiar, error, ayuda, ...resto }) {
  const idAyuda = ayuda ? `${id}-ayuda` : null;
  const idError = error ? `${id}-error` : null;
  const describe = [idAyuda, idError].filter(Boolean).join(' ');
  return (
    <div className="campo">
      <label className="campo__label" htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        className="input"
        value={valor}
        onChange={(e) => onCambiar(e.target.value)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={describe || undefined}
        {...resto}
      />
      {ayuda && <span id={idAyuda} className="campo__ayuda">{ayuda}</span>}
      {error && <span id={idError} className="campo__error">{error}</span>}
    </div>
  );
}
