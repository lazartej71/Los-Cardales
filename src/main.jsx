import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/admin.css';
import { App } from './App.jsx';
import { SIMULACION } from './api/simulacion.js';
import { direccionDelPanelViejo } from './hooks/useRutaAdmin.js';

// Los accesos viejos a /#admin siguen andando: pasan a /admin
const panelViejo = direccionDelPanelViejo(window.location);
if (panelViejo) window.history.replaceState(null, '', panelViejo);

// Para no confundir la pestaña de la simulación con la del sitio real
if (SIMULACION) document.title = `SIMULACIÓN · ${document.title}`;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
