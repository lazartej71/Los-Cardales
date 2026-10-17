/**
 * Filtro de modalidad del superadmin, debajo de la cabecera del panel: Todas, Fútbol 11 o Fútbol 7.
 */

import { MODALIDADES } from '../datos/constantes.js';
import { Segmentado } from './Segmentado.jsx';

const OPCIONES = [{ valor: 'todas', etiqueta: 'Todas' }, ...MODALIDADES.map((m) => ({ valor: m.id, etiqueta: m.nombre }))];

export function FiltroModalidad({ valor, onCambiar }) {
  return (
    <div className="filtro-modalidad">
      <span className="campo__label">Modalidad</span>
      <Segmentado variante="chips" etiquetaGrupo="Modalidad" opciones={OPCIONES} valor={valor} onCambiar={onCambiar} />
    </div>
  );
}
