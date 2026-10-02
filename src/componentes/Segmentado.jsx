/**
 * Control segmentado y selector de categoría + zona.
 */

import { zonasDeCategoria } from '../logica/consultas.js';

/* ---------- Control segmentado ----------
   opciones: [{ valor, etiqueta }]. El botón activo lleva aria-pressed. */
export function Segmentado({ opciones, valor, onCambiar, variante = 'categoria', etiquetaGrupo }) {
  return (
    <div className={`seg seg--${variante}`} role="group" aria-label={etiquetaGrupo}>
      {opciones.map((o) => (
        <button
          key={String(o.valor)}
          type="button"
          className="seg__btn"
          aria-pressed={o.valor === valor}
          onClick={() => onCambiar(o.valor)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

// Selector de categoría y zona del panel. La zona no aparece si la categoría tiene una sola.
export function FiltroCategoriaZona({ db, filtro, conZona = true }) {
  const categorias = [...db.categorias].sort((a, b) => a.orden - b.orden);
  const zonas = zonasDeCategoria(db.zonas, filtro.categoriaId);
  return (
    <div className="filtros">
      <div className="campo">
        <span className="campo__label">Categoría</span>
        <Segmentado
          etiquetaGrupo="Categoría"
          opciones={categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))}
          valor={filtro.categoriaId}
          onCambiar={filtro.onCategoria}
        />
      </div>
      {conZona && zonas.length > 1 && (
        <div className="campo">
          <span className="campo__label">Zona</span>
          <Segmentado
            variante="chips"
            etiquetaGrupo="Zona"
            opciones={zonas.map((z) => ({ valor: z.id, etiqueta: z.nombre }))}
            valor={filtro.zonaId}
            onCambiar={filtro.onZona}
          />
        </div>
      )}
    </div>
  );
}
