/**
 * Hoja que pide confirmar un resultado o un W.O. antes de guardarlo, con la modalidad bien grande.
 * resumen: el de resumenConfirmacion (logica/confirmacion.js).
 */

import { useEffect, useRef } from 'react';

export function HojaConfirmacion({ resumen, guardando, onConfirmar, onVolver }) {
  const refConfirmar = useRef(null);
  const refVolver = useRef(onVolver);
  useEffect(() => {
    refVolver.current = onVolver;
  });
  // Al abrirse, el foco va al botón de confirmar; Escape vuelve sin guardar
  useEffect(() => {
    refConfirmar.current?.focus();
    const alTeclear = (e) => {
      if (e.key === 'Escape') refVolver.current();
    };
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, []);

  return (
    <div className="hoja-fondo">
      <div className="hoja" role="dialog" aria-modal="true" aria-labelledby="hoja-titulo">
        <p className="hoja__modalidad">{resumen.modalidad}</p>
        <h3 id="hoja-titulo" className="hoja__marcador">
          {resumen.marcador}
        </h3>
        <p className="hoja__detalle">{`${resumen.categoria} · ${resumen.zonas} · ${resumen.fecha}`}</p>
        {resumen.lugar && <p className="hoja__detalle">{resumen.lugar}</p>}
        <div className="hoja__botones">
          <button ref={refConfirmar} type="button" className="btn btn--primario" disabled={guardando} onClick={onConfirmar}>
            {guardando ? 'Guardando…' : 'Confirmar'}
          </button>
          <button type="button" className="btn btn--fantasma" disabled={guardando} onClick={onVolver}>
            Volver
          </button>
        </div>
      </div>
    </div>
  );
}
