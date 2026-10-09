/**
 * Recuadro de la cabecera del panel con la cuenta que entró: el usuario y, abajo, su rol.
 */

import { Icono } from './Icono.jsx';

const ROLES = { superadmin: 'Superadmin', veedor: 'Veedor' };

export function CuentaActual({ usuario, rol }) {
  if (!usuario) return null;
  return (
    <div className="cuenta-actual">
      <Icono nombre="persona" tamano={18} />
      <span className="cuenta-actual__textos">
        <span className="cuenta-actual__usuario">{usuario}</span>
        <span className="cuenta-actual__rol">{ROLES[rol] ?? 'Admin'}</span>
      </span>
    </div>
  );
}
