/**
 * Pestaña Control (solo superadmin): quién cargó qué y cuándo, con un resumen por persona,
 * y el acceso a las visitas en Vercel. La actividad la anota la base sola (migración 5).
 * inicial: lista ya cargada (para las pruebas); si no viene, se pide al abrir y al cambiar el día.
 */

import { useCallback, useEffect, useState } from 'react';
import { Segmentado } from '../../componentes/Segmentado.jsx';
import { describirActividad, resumirActividad } from '../../logica/actividad.js';
import { hoyEnArgentina } from '../../logica/cuentas.js';

const VISITAS_VERCEL = 'https://vercel.com/van-wqs-projects/los-cardales/analytics';

const horaArgentina = (instante) =>
  new Date(instante).toLocaleTimeString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

// "2026-10-03" → "2026-10-02"
function diaAnterior(dia) {
  const [anio, mes, numero] = dia.split('-').map(Number);
  return new Date(Date.UTC(anio, mes - 1, numero - 1)).toISOString().slice(0, 10);
}

const cantidad = (n, singular, plural) => `${n} ${n === 1 ? singular : plural}`;

function TextoResumen({ fila }) {
  const partes = [
    fila.resultados && cantidad(fila.resultados, 'resultado', 'resultados'),
    fila.tarjetas && cantidad(fila.tarjetas, 'tarjeta', 'tarjetas'),
    fila.rojas && cantidad(fila.rojas, 'roja', 'rojas'),
    fila.pagos && cantidad(fila.pagos, 'pago', 'pagos'),
    fila.otros && cantidad(fila.otros, 'otro cambio', 'otros cambios'),
  ].filter(Boolean);
  return <span className="control-resumen__detalle">{partes.join(' · ')}</span>;
}

export function AdminControl({ db, acciones, inicial }) {
  const hoy = hoyEnArgentina();
  const [dia, setDia] = useState(hoy);
  const [persona, setPersona] = useState('');
  const [entradas, setEntradas] = useState(inicial ?? null);
  const [cargando, setCargando] = useState(!inicial);

  const cargar = useCallback(async () => {
    setCargando(true);
    const lista = await acciones.leerActividad(dia);
    setEntradas(lista ?? []);
    setCargando(false);
  }, [acciones, dia]);

  useEffect(() => {
    if (!inicial) cargar();
  }, [cargar, inicial]);

  const lista = entradas ?? [];
  const personas = [...new Set(lista.map((e) => e.quien))].sort((a, b) => a.localeCompare(b, 'es'));
  const visibles = persona ? lista.filter((e) => e.quien === persona) : lista;
  const ayer = diaAnterior(hoy);
  const opcionesDia = [
    { valor: hoy, etiqueta: 'Hoy' },
    { valor: ayer, etiqueta: 'Ayer' },
  ];

  return (
    <>
      <section className="panel" aria-labelledby="control-visitas">
        <h3 id="control-visitas" className="panel__titulo">Visitas</h3>
        <p className="panel__texto">Cuánta gente entra a la página, desde dónde y con qué dispositivo.</p>
        <a className="btn btn--secundario" href={VISITAS_VERCEL} target="_blank" rel="noreferrer">
          Ver visitas en Vercel
        </a>
      </section>

      <section className="panel" aria-labelledby="control-actividad">
        <h3 id="control-actividad" className="panel__titulo">Actividad</h3>
        <div className="control-filtros">
          <Segmentado
            variante="chips"
            etiquetaGrupo="Día"
            opciones={opcionesDia}
            valor={dia}
            onCambiar={(valor) => {
              setDia(valor);
              setPersona('');
            }}
          />
          <input
            className="input control-filtros__fecha"
            type="date"
            aria-label="Otro día"
            max={hoy}
            value={dia}
            onChange={(e) => {
              if (e.target.value) {
                setDia(e.target.value);
                setPersona('');
              }
            }}
          />
          <select
            className="input select control-filtros__persona"
            aria-label="Persona"
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
          >
            <option value="">Todos</option>
            {personas.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn--fantasma btn--chico" onClick={cargar} disabled={cargando}>
            {cargando ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {lista.length > 0 && (
          <div className="control-resumen">
            <h4 className="control-resumen__titulo">Resumen del día</h4>
            <ul className="control-resumen__lista">
              {resumirActividad(visibles).map((fila) => (
                <li key={fila.quien}>
                  <strong>{fila.quien}</strong> <TextoResumen fila={fila} />
                </li>
              ))}
            </ul>
          </div>
        )}

        {cargando && !entradas ? (
          <p className="vacio-texto">Cargando la actividad…</p>
        ) : visibles.length === 0 ? (
          <p className="vacio-texto">Ese día no hubo cambios.</p>
        ) : (
          <ul className="control-lista">
            {visibles.map((e) => (
              <li key={e.id} className="control-lista__item">
                <span className="control-lista__hora">{horaArgentina(e.creadoEn)}</span>
                <span className="control-lista__quien">{e.quien}</span>
                <span className="control-lista__texto">{describirActividad(e, db)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
