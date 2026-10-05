/**
 * Metadatos y tarjeta para compartir los links (WhatsApp, Facebook, X) y lo que ve Google.
 * Los buscadores y WhatsApp no corren la app: leen el HTML tal cual, por eso todo va fijo en index.html
 * (vista pública) y admin.html (panel).
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { describe, expect, it } from 'vitest';
import config from '../vite.config.js';

const leer = (ruta) => readFileSync(new URL(ruta, import.meta.url), 'utf8');
const SITIO = 'https://www.loscardalesfutbol.com';
const IMAGEN = `${SITIO}/tarjeta.jpg`;
const DESCRIPCION =
  'Tabla de posiciones, fixture con predio, cancha y hora, y resultados del campeonato: Libre, +30, +35, +40 y +45.';

// Las etiquetas <meta> de un HTML: { 'og:title': '...', description: '...' }
function metas(html) {
  const datos = {};
  for (const [, atributos] of html.matchAll(/<meta\s+([^>]+?)\s*\/?>/g)) {
    const clave = /(?:property|name)="([^"]+)"/.exec(atributos)?.[1];
    if (clave) datos[clave] = /content="([^"]*)"/.exec(atributos)?.[1];
  }
  return datos;
}

// Lo que comparten las dos páginas: todo menos el título, los metadatos y la dirección oficial
const sinMetadatos = (html) =>
  html
    .split('\n')
    .filter((linea) => !/<title>|rel="canonical"|<meta (property|name)="(og:|twitter:|description|robots)/.test(linea))
    .join('\n');

// Ancho y alto de un JPEG (marcador SOF)
function medidasJpeg(jpeg) {
  let i = 2;
  while (i < jpeg.length) {
    const marca = jpeg[i + 1];
    if (marca >= 0xc0 && marca <= 0xc3) return [jpeg.readUInt16BE(i + 7), jpeg.readUInt16BE(i + 5)];
    i += 2 + jpeg.readUInt16BE(i + 2);
  }
  return null;
}

const COMUNES = {
  'og:type': 'website',
  'og:site_name': 'Los Cardales Fútbol',
  'og:locale': 'es_AR',
  'og:image': IMAGEN,
  'og:image:type': 'image/jpeg',
  'og:image:width': '1200',
  'og:image:height': '630',
  'og:image:alt': 'Logo de Los Cardales Fútbol',
  'twitter:card': 'summary_large_image',
};

describe('tarjeta al compartir el link', () => {
  it('la página pública trae título, descripción e imagen', () => {
    const html = leer('../index.html');
    expect(html).toContain('<title>Los Cardales Fútbol</title>');
    expect(html).toContain(`<link rel="canonical" href="${SITIO}/" />`);
    const m = metas(html);
    expect(m).toMatchObject({
      ...COMUNES,
      description: DESCRIPCION,
      'og:title': 'Los Cardales Fútbol',
      'og:description': DESCRIPCION,
      'og:url': `${SITIO}/`,
    });
    expect(m.robots).toBeUndefined();
  });

  it('el panel tiene su propia tarjeta y Google no lo muestra', () => {
    const html = leer('../admin.html');
    expect(html).toContain('<title>Panel · Los Cardales Fútbol</title>');
    expect(metas(html)).toMatchObject({
      ...COMUNES,
      robots: 'noindex',
      description: 'Ingreso para el organizador y los veedores.',
      'og:title': 'Panel de Los Cardales Fútbol',
      'og:description': 'Ingreso para el organizador y los veedores.',
      'og:url': 'https://admin.loscardalesfutbol.com/',
    });
  });

  it('las dos páginas cargan la misma app, con los mismos íconos y letras', () => {
    const [publico, admin] = [leer('../index.html'), leer('../admin.html')];
    expect(sinMetadatos(admin)).toBe(sinMetadatos(publico));
    expect(publico).toContain('<script type="module" src="/src/main.jsx"></script>');
  });

  it('la imagen mide 1200 × 630 y pesa menos de 300 KB (WhatsApp no muestra las muy pesadas)', () => {
    const jpeg = readFileSync(new URL('../public/tarjeta.jpg', import.meta.url));
    expect([jpeg[0], jpeg[1]]).toEqual([0xff, 0xd8]);
    expect(medidasJpeg(jpeg)).toEqual([1200, 630]);
    expect(jpeg.length).toBeLessThan(300 * 1024);
  });
});

describe('buscadores', () => {
  it('Google puede ver todo menos el panel, y sabe dónde está la página', () => {
    const robots = leer('../public/robots.txt');
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain(`Sitemap: ${SITIO}/sitemap.xml`);
    expect(leer('../public/sitemap.xml')).toContain(`<loc>${SITIO}/</loc>`);
  });

  it('Vercel sirve el panel con su página y le avisa a Google que no lo muestre', () => {
    const { rewrites, headers } = JSON.parse(leer('../vercel.json'));
    expect(rewrites).toContainEqual({ source: '/admin', destination: '/admin.html' });
    expect(headers).toContainEqual({ source: '/admin', headers: [{ key: 'X-Robots-Tag', value: 'noindex' }] });
  });

  it('el build arma las dos páginas', () => {
    const entradas = Object.values(config.build.rollupOptions.input).map((ruta) => basename(ruta));
    expect(entradas.sort()).toEqual(['admin.html', 'index.html']);
  });
});
