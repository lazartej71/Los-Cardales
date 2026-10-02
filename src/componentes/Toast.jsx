/**
 * Aviso flotante.
 */

import { Icono } from './Icono.jsx';

export function Toast({ toast }) {
  return (
    <div className="toast-zona" role="status" aria-live="polite">
      {toast && (
        <div key={toast.id} className={`toast toast--${toast.tipo}`}>
          <Icono nombre={toast.tipo === 'error' ? 'info' : 'check'} tamano={18} />
          <span>{toast.texto}</span>
        </div>
      )}
    </div>
  );
}
