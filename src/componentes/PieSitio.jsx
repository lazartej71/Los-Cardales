/**
 * Pie de la vista pública: las redes del campeonato (cada una abre en otra pestaña) y el año.
 * conBarra: en el celular, la barra inferior fija está debajo y el pie le deja su espacio.
 */

import { REDES } from '../datos/constantes.js';
import { hoyEnArgentina } from '../logica/cuentas.js';
import { Icono } from './Icono.jsx';

export function PieSitio({ redes = REDES, anio = Number(hoyEnArgentina().slice(0, 4)), conBarra = false }) {
  // Una red sin dirección no se muestra: no hay botones que no llevan a ningún lado
  const conDireccion = redes.filter((r) => r.url);
  return (
    <footer className={conBarra ? 'pie pie--con-barra' : 'pie'}>
      <div className="contenedor">
        <p className="pie__titulo">Seguí al campeonato</p>
        {conDireccion.length > 0 && (
          <ul className="pie__redes">
            {conDireccion.map((r) => (
              <li key={r.id}>
                <a className={`pie__red pie__red--${r.id}`} href={r.url} target="_blank" rel="noopener noreferrer">
                  <span className="pie__icono">
                    <Icono nombre={r.id} tamano={22} />
                  </span>
                  {r.nombre}
                </a>
              </li>
            ))}
          </ul>
        )}
        <p className="pie__copy">{`© ${anio} Los Cardales`}</p>
      </div>
    </footer>
  );
}
