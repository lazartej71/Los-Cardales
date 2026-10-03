import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { direccionDelPanelViejo, esPanel, manifiestoDe } from './useRutaAdmin.js';

const leerJson = (ruta) => JSON.parse(readFileSync(new URL(ruta, import.meta.url), 'utf8'));

describe('dirección del panel', () => {
  it('el panel está en /admin', () => {
    expect(esPanel('/admin')).toBe(true);
    expect(esPanel('/admin/')).toBe(true);
  });

  it('el resto de las direcciones es la vista pública', () => {
    expect(esPanel('/')).toBe(false);
    expect(esPanel('/administracion')).toBe(false);
  });

  it('el link viejo con #admin pasa a /admin', () => {
    expect(direccionDelPanelViejo({ pathname: '/', search: '', hash: '#admin' })).toBe('/admin');
    expect(direccionDelPanelViejo({ pathname: '/', search: '?x=1', hash: '#admin' })).toBe('/admin?x=1');
  });

  it('sin #admin no hay que redirigir', () => {
    expect(direccionDelPanelViejo({ pathname: '/', search: '', hash: '' })).toBeNull();
    expect(direccionDelPanelViejo({ pathname: '/admin', search: '', hash: '' })).toBeNull();
  });
});

describe('instalar como app', () => {
  it('cada parte usa su propio manifiesto', () => {
    expect(manifiestoDe('/')).toBe('/publico.webmanifest');
    expect(manifiestoDe('/admin')).toBe('/admin.webmanifest');
  });

  it('la vista pública y el panel son dos apps distintas', () => {
    const publico = leerJson('../../public/publico.webmanifest');
    const admin = leerJson('../../public/admin.webmanifest');
    expect(publico).toMatchObject({ id: '/', start_url: '/', name: 'Los Cardales Fútbol' });
    expect(admin).toMatchObject({ id: '/admin', start_url: '/admin', scope: '/admin', name: 'Los Cardales Admin' });
    for (const m of [publico, admin]) {
      expect(m.display).toBe('standalone');
      expect(m.icons).toEqual([
        // Logo transparente: lo usan la PC y la pantalla de carga de Android (sin cuadrado alrededor)
        { src: '/logo-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/logo-512.png', sizes: '512x512', type: 'image/png' },
        // Android los recorta con la forma del teléfono (círculo, cuadrado redondeado...)
        { src: '/icono-android-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icono-android-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ]);
    }
  });

  it('el ícono del iPhone es el logo con fondo negro', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('<link rel="apple-touch-icon" href="/icono-180.png" />');
  });

  it('los íconos tienen el tamaño que dicen y no son transparentes', () => {
    for (const nombre of ['180', 'android-192', 'android-512']) {
      const lado = Number(nombre.replace('android-', ''));
      const png = readFileSync(new URL(`../../public/icono-${nombre}.png`, import.meta.url));
      // Cabecera PNG: ancho y alto en los bytes 16-23; tipo de color en el 25 (2 = RGB, sin transparencia)
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]]).toEqual([lado, lado, 2]);
    }
  });

  it('el logo de la pantalla de carga tiene fondo transparente', () => {
    for (const lado of [192, 512]) {
      const png = readFileSync(new URL(`../../public/logo-${lado}.png`, import.meta.url));
      // Tipo de color 6 = RGBA (con transparencia)
      expect([png.readUInt32BE(16), png.readUInt32BE(20), png[25]]).toEqual([lado, lado, 6]);
    }
  });

  it('en Vercel /admin abre la app', () => {
    const { rewrites } = leerJson('../../vercel.json');
    expect(rewrites).toContainEqual({ source: '/admin', destination: '/index.html' });
  });
});
