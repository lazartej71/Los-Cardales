/**
 * Pestaña Control (solo superadmin): cuántas personas entran a la página (migración 6) y
 * quién cargó qué y cuándo, con un resumen por persona (migración 5).
 * inicial y visitasIniciales: datos ya cargados (para las pruebas); si no vienen, se piden al abrir.
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

const DIAS_SEMANA = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
// "2026-10-03" → "sáb 3"
function diaCorto(dia) {
  const [anio, mes, numero] = dia.split('-').map(Number);
  return `${DIAS_SEMANA[new Date(Date.UTC(anio, mes - 1, numero)).getUTCDay()]} ${numero}`;
}

// Hoy, ayer, los últimos 7 días (con 0 en los días sin visitas) y el total
function resumirVisitas(visitas, hoy) {
  const porDia = new Map(visitas.map((v) => [v.dia, v.personas]));
  const semana = [];
  for (let i = 6, dia = hoy; i >= 0; i--) {
    semana.unshift({ dia, personas: porDia.get(dia) ?? 0 });
    dia = diaAnterior(dia);
  }
  return {
    hoy: porDia.get(hoy) ?? 0,
    ayer: porDia.get(diaAnterior(hoy)) ?? 0,
    semana,
    totalSemana: semana.reduce((t, d) => t + d.personas, 0),
    total: visitas.reduce((t, v) => t + v.personas, 0),
  };
}

function BloqueVisitas({ visitas, hoy }) {
  const r = resumirVisitas(visitas ?? [], hoy);
  const maximo = Math.max(1, ...r.semana.map((d) => d.personas));
  const cifras = [
    ['Hoy', r.hoy],
    ['Ayer', r.ayer],
    ['7 días', r.totalSemana],
    ['Total', r.total],
  ];
  return (
    <section className="panel" aria-labelledby="control-visitas">
      <h3 id="control-visitas" className="panel__titulo">Visitas</h3>
      <p className="panel__texto">Personas que entraron a la página (una vez por día y por dispositivo).</p>
      {visitas === null ? (
        <p className="vacio-texto">Cargando las visitas…</p>
      ) : (
        <>
          <dl className="visitas__cifras">
            {cifras.map(([etiqueta, valor]) => (
              <div key={etiqueta} className="visitas__dato">
                <dt>{etiqueta}</dt>
                <dd className="visitas__cifra">{valor}</dd>
              </div>
            ))}
          </dl>
          <ol className="visitas__grafico" aria-label="Personas por día, últimos 7 días">
            {r.semana.map((d) => {
              const texto = `${diaCorto(d.dia)}: ${d.personas} ${d.personas === 1 ? 'persona' : 'personas'}`;
              return (
                <li key={d.dia} className="visitas__columna" title={texto}>
                  <span className="visitas__valor" aria-hidden="true">{d.personas}</span>
                  <span
                    className="visitas__barra"
                    style={{ height: `${Math.round((d.personas / maximo) * 100)}%` }}
                    aria-hidden="true"
                  />
                  <span className="visitas__dia" aria-hidden="true">{diaCorto(d.dia)}</span>
                  <span className="visualmente-oculto">{texto}</span>
                </li>
              );
            })}
          </ol>
        </>
      )}
      <a className="enlace" href={VISITAS_VERCEL} target="_blank" rel="noreferrer">
        Más detalle en Vercel (países, dispositivos)
      </a>
    </section>
  );
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

export function AdminControl({ db, acciones, inicial, visitasIniciales, hoy = hoyEnArgentina() }) {
  const [visitas, setVisitas] = useState(visitasIniciales ?? null);
  const [dia, setDia] = useState(hoy);
  const [persona, setPersona] = useState('');
  const [entradas, setEntradas] = useState(inicial ?? null);
  const [cargando, setCargando] = useState(!inicial);

  const cargar = useCallback(async () => {
    setCargando(true);
    // Las visitas se actualizan junto con la actividad (al abrir, al cambiar el día y con Actualizar)
    if (!visitasIniciales) acciones.leerVisitas().then((v) => setVisitas(v ?? []));
    const lista = await acciones.leerActividad(dia);
    setEntradas(lista ?? []);
    setCargando(false);
  }, [acciones, dia, visitasIniciales]);

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
      <BloqueVisitas visitas={visitas} hoy={hoy} />

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
