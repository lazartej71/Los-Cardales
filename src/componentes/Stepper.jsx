/**
 * Campo numérico con botones − / +.
 */

import { Icono } from './Icono.jsx';

/* ---------- Campo numérico con botones − / + (cómodo para el dedo) ---------- */
export function Stepper({ id, valor, onCambiar, etiqueta, max = 99, placeholder = '–', ancho = false, invalido = false }) {
  const numero = valor === '' ? 0 : Number(valor);
  const sumar = (delta) => onCambiar(String(Math.min(max, Math.max(0, numero + delta))));
  return (
    <div className={`stepper${ancho ? ' stepper--ancho' : ''}`}>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => sumar(-1)}
        disabled={valor === '0'}
        aria-label={`Restar uno: ${etiqueta}`}
      >
        <Icono nombre="menos" tamano={18} />
      </button>
      <input
        id={id}
        className="stepper__input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        maxLength={2}
        value={valor}
        placeholder={placeholder}
        aria-invalid={invalido || undefined}
        onChange={(e) => onCambiar(e.target.value.replace(/\D/g, '').slice(0, 2))}
      />
      <button
        type="button"
        className="stepper__btn"
        onClick={() => sumar(1)}
        disabled={numero >= max}
        aria-label={`Sumar uno: ${etiqueta}`}
      >
        <Icono nombre="mas" tamano={18} />
      </button>
    </div>
  );
}
