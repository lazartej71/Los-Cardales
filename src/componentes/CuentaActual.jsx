/**
 * Recuadro de la cabecera del panel con la cuenta que entró: el usuario y, abajo, su rol. Una cuenta
 * fija en una modalidad lo dice: "Organizador F7", "Veedor F11".
 */

import { MODALIDADES } from '../datos/constantes.js';
import { Icono } from './Icono.jsx';

const ROLES = { superadmin: 'Superadmin', veedor: 'Veedor' };

function textoRol(rol, modalidad) {
  const corto = MODALIDADES.find((m) => m.id === modalidad)?.corto;
  if (corto && rol === 'veedor') return `Veedor ${corto}`;
  if (corto && rol !== 'superadmin') return `Organizador ${corto}`;
  return ROLES[rol] ?? 'Admin';
}

export function CuentaActual({ usuario, rol, modalidad = null }) {
  if (!usuario) return null;
  return (
    <div className="cuenta-actual">
      <Icono nombre="persona" tamano={18} />
      <span className="cuenta-actual__textos">
        <span className="cuenta-actual__usuario">{usuario}</span>
        <span className="cuenta-actual__rol">{textoRol(rol, modalidad)}</span>
      </span>
    </div>
  );
}
