/**
 * Aviso fijo arriba del panel con la modalidad en la que se está cargando, para no confundirse.
 */

import { MODALIDADES } from '../datos/constantes.js';
import { Icono } from './Icono.jsx';

export function BannerModalidad({ modalidad }) {
  return (
    <p className="banner-modalidad" role="status">
      <Icono nombre="pelota" tamano={18} />
      <span>
        Estás cargando en <strong>{MODALIDADES.find((m) => m.id === modalidad)?.chip}</strong>
      </span>
    </p>
  );
}
