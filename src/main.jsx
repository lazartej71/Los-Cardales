import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './estilos/base.css';
import './estilos/componentes.css';
import './estilos/admin.css';
import { App } from './App.jsx';
import { SIMULACION } from './api/simulacion.js';

// Para no confundir la pestaña de la simulación con la del sitio real
if (SIMULACION) document.title = `SIMULACIÓN · ${document.title}`;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
