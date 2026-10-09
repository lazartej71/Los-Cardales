/**
 * Panel: cuánto debe cada equipo de la categoría, con buscador. Tocando un equipo se abre su cuenta.
 */

import { useMemo, useState } from 'react';
import { FiltroCategoriaZona } from '../../componentes/Segmentado.jsx';
import { zonasDeCategoria } from '../../logica/consultas.js';
import { calcularCuentas, coincideNombre, estadoSaldo, formatearPesos } from '../../logica/cuentas.js';
import { CuentaEquipo } from './CuentaEquipo.jsx';

export function AdminCuentas({ db, acciones, filtro, equipoId, onEquipo, busqueda = '', onBuscar }) {
  const [soloDeudores, setSoloDeudores] = useState(true);
  const categoria = db.categorias.find((c) => c.id === filtro.categoriaId);
  const equipos = useMemo(() => {
    const zonas = new Set(zonasDeCategoria(db.zonas, filtro.categoriaId).map((z) => z.id));
    return db.equipos.filter((e) => zonas.has(e.zonaId)).sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [db.equipos, db.zonas, filtro.categoriaId]);
  const cuentas = useMemo(
    () =>
      calcularCuentas({
        equipos: db.equipos,
        partidos: db.partidos,
        movimientos: db.movimientos,
        arancel: db.configuracion.arancel,
      }),
    [db.equipos, db.partidos, db.movimientos, db.configuracion.arancel]
  );

  const elegido = equipoId === null ? null : db.equipos.find((e) => e.id === equipoId);
  if (elegido) return <CuentaEquipo db={db} equipo={elegido} acciones={acciones} onVolver={() => onEquipo(null)} />;

  const deudaTotal = equipos.reduce((total, e) => total + Math.max(0, cuentas.get(e.id).saldo), 0);
  const buscado = busqueda.trim();
  const encontrados = equipos.filter((e) => coincideNombre(e.nombre, buscado));
  const visibles = soloDeudores ? encontrados.filter((e) => cuentas.get(e.id).saldo > 0) : encontrados;

  // Si no queda ningún equipo en la lista, se explica por qué
  let sinEquipos = 'Todavía no hay equipos en esta categoría.';
  if (buscado && encontrados.length === 0) sinEquipos = `Ningún equipo de ${categoria.nombre} coincide con «${buscado}».`;
  else if (buscado) {
    sinEquipos = `Ningún equipo que deba coincide con «${buscado}». Destildá «Solo los que deben» para ver los que están al día.`;
  } else if (soloDeudores) sinEquipos = `Ningún equipo de ${categoria.nombre} debe plata.`;

  return (
    <>
      <p className="admin-intro">
        Lo que debe cada equipo: los aranceles de los partidos jugados y las deudas anteriores, menos lo que pagó.
        Tocá un equipo para ver su cuenta y anotar pagos sueltos.
      </p>

      <div className="panel">
        <FiltroCategoriaZona db={db} filtro={filtro} conZona={false} />
        <div className="cuentas-resumen">
          <p className="cuentas-resumen__total">{`Deben en ${categoria.nombre}: ${formatearPesos(deudaTotal)}`}</p>
          <label className="check">
            <input type="checkbox" checked={soloDeudores} onChange={(e) => setSoloDeudores(e.target.checked)} />
            Solo los que deben
          </label>
        </div>
        <div className="campo">
          <label className="visualmente-oculto" htmlFor="cuentas-buscar">
            Buscar equipo
          </label>
          <input
            id="cuentas-buscar"
            className="input input--buscar"
            type="search"
            placeholder="Buscar equipo…"
            autoComplete="off"
            value={busqueda}
            onChange={(e) => onBuscar(e.target.value)}
          />
        </div>
      </div>

      {visibles.length === 0 ? (
        <p className="vacio-texto">{sinEquipos}</p>
      ) : (
        <ul className="cuentas-lista">
          {visibles.map((e) => {
            const estado = estadoSaldo(cuentas.get(e.id).saldo);
            return (
              <li key={e.id}>
                <button type="button" className="cuentas-lista__item" onClick={() => onEquipo(e.id)}>
                  <span className="cuentas-lista__nombre">{e.nombre}</span>
                  {e.baja && <span className="etiqueta-baja">De baja</span>}
                  <span className={`saldo saldo--${estado.tipo}`}>{estado.texto}</span>
                  <span className="cuentas-lista__flecha" aria-hidden="true">›</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
