/**
 * Íconos SVG en línea.
 */

/* ---------- Íconos (SVG en línea, trazo) ---------- */
const ICONOS = {
  podio: <path d="M3 21v-6h6v6M9 21V9h6v12M15 21v-4h6v4M2.5 21h19" />,
  calendario: (
    <>
      <rect x="3" y="4.5" width="18" height="16.5" rx="2" />
      <path d="M8 2.5v4M16 2.5v4M3 10h18" />
    </>
  ),
  marcador: (
    <>
      <rect x="2.5" y="6.5" width="19" height="13" rx="2" />
      <path d="M12 6.5v13M7 3l2.5 3.5M17 3l-2.5 3.5" />
    </>
  ),
  candado: (
    <>
      <rect x="4.5" y="10.5" width="15" height="10.5" rx="2" />
      <path d="M8 10.5v-3a4 4 0 0 1 8 0v3" />
    </>
  ),
  salir: (
    <>
      <path d="M9.5 20.5h-4a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2h4" />
      <path d="M16 16.5l4.5-4.5L16 7.5M20.5 12h-11" />
    </>
  ),
  ojo: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  plata: (
    <>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9.5v5M18 9.5v5" />
    </>
  ),
  camiseta: <path d="M8.5 3.5 3 6.5l2 5 2.5-1v10h9v-10l2.5 1 2-5-5.5-3c-.4 1.8-1.8 3-3.5 3s-3.1-1.2-3.5-3z" />,
  ajustes: (
    <>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="17" r="2" />
    </>
  ),
  arriba: <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />,
  abajo: <path d="M12 5v14M5.5 12.5 12 19l6.5-6.5" />,
  cerrar: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6.5 9.5 17 4 11.5" />,
  mas: <path d="M12 5v14M5 12h14" />,
  menos: <path d="M5 12h14" />,
  basura: <path d="M3.5 6.5h17M9 6.5V4h6v2.5M18.5 6.5l-1 14h-11l-1-14M10 11v6M14 11v6" />,
  copiar: (
    <>
      <rect x="9" y="9" width="11.5" height="11.5" rx="2" />
      <path d="M5.5 15H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 4h8.5A1.5 1.5 0 0 1 15 5.5V6" />
    </>
  ),
  celular: (
    <>
      <rect x="6.5" y="2.5" width="11" height="19" rx="2.5" />
      <path d="M11 18.5h2" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.5" />
    </>
  ),
};

export function Icono({ nombre, tamano = 20 }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONOS[nombre]}
    </svg>
  );
}
