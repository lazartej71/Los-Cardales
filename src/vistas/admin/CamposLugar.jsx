/**
 * Predio, cancha y hora de un partido. Lo usan el alta (NuevoPartido) y el editor del partido.
 * lugar: { predio, cancha, hora } como textos del formulario ('' si falta).
 */

import { Segmentado } from '../../componentes/Segmentado.jsx';
import { PREDIOS } from '../../datos/constantes.js';
import { canchasDe } from '../../logica/lugar.js';

export const LUGAR_VACIO = { predio: '', cancha: '', hora: '' };

// Del partido guardado al formulario
export const lugarDePartido = (partido) =>
  partido.predio ? { predio: partido.predio, cancha: String(partido.cancha), hora: partido.hora } : LUGAR_VACIO;

// Del formulario a lo que valida y guarda la API
export const lugarParaGuardar = (lugar) => ({ predio: lugar.predio, cancha: Number(lugar.cancha), hora: lugar.hora });

// Al cambiar de predio se conserva la cancha solo si el otro predio también la tiene
export function cambiarPredio(lugar, predio) {
  const sigue = canchasDe(predio).includes(Number(lugar.cancha));
  return { ...lugar, predio, cancha: sigue ? lugar.cancha : '' };
}

const OPCIONES_PREDIO = PREDIOS.map((p) => ({ valor: p.id, etiqueta: p.nombre }));

export function CamposLugar({ idBase, lugar, onCambiar, invalido = false }) {
  const canchas = canchasDe(lugar.predio);
  return (
    <div className="lugar-campos">
      <div className="campo lugar-campos__predio">
        <span className="campo__label">Predio</span>
        <Segmentado
          variante="chips"
          etiquetaGrupo="Predio"
          opciones={OPCIONES_PREDIO}
          valor={lugar.predio}
          onCambiar={(predio) => onCambiar(cambiarPredio(lugar, predio))}
        />
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor={`${idBase}-cancha`}>Cancha</label>
        <select
          id={`${idBase}-cancha`}
          className="input select"
          value={lugar.cancha}
          disabled={!canchas.length}
          aria-invalid={(invalido && !lugar.cancha) || undefined}
          onChange={(e) => onCambiar({ ...lugar, cancha: e.target.value })}
        >
          <option value="">{canchas.length ? 'Elegí la cancha' : 'Elegí el predio'}</option>
          {canchas.map((n) => (
            <option key={n} value={n}>{`Cancha ${n}`}</option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label className="campo__label" htmlFor={`${idBase}-hora`}>Hora</label>
        <input
          id={`${idBase}-hora`}
          className="input"
          inputMode="numeric"
          autoComplete="off"
          placeholder="13:40"
          maxLength={5}
          value={lugar.hora}
          aria-invalid={invalido || undefined}
          onChange={(e) => onCambiar({ ...lugar, hora: e.target.value.replace(/[^\d:]/g, '') })}
        />
      </div>
    </div>
  );
}
