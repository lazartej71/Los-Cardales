/**
 * Raíz de la app: sesión, datos y elección entre la vista pública y el panel (/admin).
 * En el panel, una cuenta de veedor ve solo la pantalla de veedores.
 * En la simulación (npm run simulacion) suma un cartel fijo: lo cargado no llega a la base real.
 */

import { useCallback, useEffect, useState } from 'react';
import { api } from './api/cliente.js';
import { SIMULACION } from './api/simulacion.js';
import { avisarVisita } from './api/visitas.js';
import { EstadoDeCarga } from './componentes/EstadoDeCarga.jsx';
import { LimiteDeError } from './componentes/LimiteDeError.jsx';
import { Toast } from './componentes/Toast.jsx';
import { ROLES_SIMULACION, rolSimulado } from './datos/constantes.js';
import { useAcciones } from './hooks/useAcciones.js';
import { useDatos } from './hooks/useDatos.js';
import { useRutaAdmin } from './hooks/useRutaAdmin.js';
import { useSesion } from './hooks/useSesion.js';
import { useToast } from './hooks/useToast.js';
import { hoyEnArgentina } from './logica/cuentas.js';
import { PanelAdmin } from './vistas/admin/PanelAdmin.jsx';
import { PantallaLogin } from './vistas/admin/PantallaLogin.jsx';
import { VistaPublica } from './vistas/publico/VistaPublica.jsx';
import { PanelVeedor } from './vistas/veedor/PanelVeedor.jsx';

// El almacenamiento del navegador, o null si no se puede usar (ventana privada, sitio bloqueado)
function almacenLocal() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function App({ simulacion = SIMULACION }) {
  const [toast, avisar] = useToast();
  const { enAdmin, salirDelPanel } = useRutaAdmin();
  const { sesion, cargando: cargandoSesion, ingresar, salir, verComo } = useSesion({ simulacion });
  const token = sesion ? sesion.access_token : null;
  const modo = enAdmin && token ? 'admin' : 'publico';
  const { db, error, recargar } = useDatos({ modo, token });

  // Sesión vencida o cuenta sin permiso de admin: se cierra la sesión y vuelve el login con el motivo
  const alSesionInvalida = useCallback(
    (motivo) => {
      avisar(motivo.message, 'error');
      salir();
    },
    [avisar, salir]
  );
  const acciones = useAcciones({ token, recargar, avisar, onSesionInvalida: alSesionInvalida });

  // Lo que eligió cada vista se conserva al ir y volver entre el sitio y el panel
  const [uiPublica, setUiPublica] = useState({
    categoriaId: null,
    zonaId: null,
    seccion: 'posiciones',
    fecha: null,
  });
  const [uiAdmin, setUiAdmin] = useState({
    seccion: 'resultados',
    categoriaId: null,
    zonaId: null,
    fecha: null,
    equipoCuentaId: null,
    busquedaCuentas: '',
    partidoAbiertoId: null,
  });

  // Lo mismo si falla la carga de los datos del panel
  useEffect(() => {
    if (modo === 'admin' && error && (error.estado === 401 || error.estado === 403)) alSesionInvalida(error);
  }, [modo, error, alSesionInvalida]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [enAdmin]);

  // Cuenta a la persona que entra a la vista pública (una vez por día y por navegador)
  useEffect(() => {
    if (enAdmin || simulacion) return;
    let almacen;
    try {
      almacen = window.localStorage;
    } catch {
      return;
    }
    avisarVisita({ almacen, hoy: hoyEnArgentina(), enviar: api.visita });
  }, [enAdmin, simulacion]);

  const cerrarSesion = async () => {
    await salir();
    setUiAdmin((u) => ({ ...u, equipoCuentaId: null, busquedaCuentas: '', partidoAbiertoId: null }));
    salirDelPanel();
    avisar('Cerraste sesión.');
  };

  let contenido;
  if (enAdmin && !token) {
    contenido = cargandoSesion ? (
      <EstadoDeCarga />
    ) : (
      <PantallaLogin
        nombreCampeonato={db ? db.configuracion.nombreCampeonato : ''}
        onIngresar={ingresar}
        onVolver={salirDelPanel}
      />
    );
  } else if (!db) {
    contenido = <EstadoDeCarga error={error} onReintentar={recargar} />;
  } else if (enAdmin && db.rol === 'veedor') {
    contenido = (
      <PanelVeedor db={db} acciones={acciones} almacen={almacenLocal()} onVerSitio={salirDelPanel} onSalir={cerrarSesion} />
    );
  } else if (enAdmin) {
    contenido = (
      <PanelAdmin
        db={db}
        acciones={acciones}
        ui={uiAdmin}
        setUi={setUiAdmin}
        onVerSitio={salirDelPanel}
        onSalir={cerrarSesion}
      />
    );
  } else {
    contenido = <VistaPublica db={db} ui={uiPublica} setUi={setUiPublica} />;
  }

  return (
    <>
      {simulacion && (
        <div className="cartel-simulacion">
          <span className="cartel-simulacion__texto">
            <strong>MODO SIMULACIÓN</strong> · nada se guarda en la base real
          </span>
          {enAdmin && token && (
            <label className="cartel-simulacion__rol">
              Ver como
              <select value={rolSimulado(token)} onChange={(e) => verComo(e.target.value)}>
                {ROLES_SIMULACION.map((r) => (
                  <option key={r.valor} value={r.valor}>
                    {r.etiqueta}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
      )}
      <LimiteDeError onReiniciar={salirDelPanel}>
        {contenido}
        <Toast toast={toast} />
      </LimiteDeError>
    </>
  );
}
