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
      expect(m.icons.map((i) => i.sizes)).toEqual(['192x192', '1024x1024']);
    }
  });

  it('en Vercel /admin abre la app', () => {
    const { rewrites } = leerJson('../../vercel.json');
    expect(rewrites).toContainEqual({ source: '/admin', destination: '/index.html' });
  });
});
