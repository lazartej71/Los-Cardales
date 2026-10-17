import { describe, expect, it } from 'vitest';
import { modalidadDelPanel } from './panelModalidad.js';

const panel = (cambios) =>
  modalidadDelPanel({ cuenta: null, elegida: null, ultima: 'f11', seccion: 'resultados', hayF7: true, ...cambios });

describe('modalidad del panel', () => {
  it('sin Fútbol 7 cargado, todo como siempre: sin filtro ni banner', () => {
    expect(panel({ hayF7: false })).toEqual({ activa: 'todas', conFiltro: false, aviso: null, banner: false });
    expect(panel({ hayF7: false, cuenta: 'f11' })).toEqual({ activa: 'f11', conFiltro: false, aviso: null, banner: false });
  });

  it('una cuenta fija queda en su modalidad, sin filtro y con el banner', () => {
    expect(panel({ cuenta: 'f7', elegida: 'f11' })).toEqual({ activa: 'f7', conFiltro: false, aviso: null, banner: true });
    expect(panel({ cuenta: 'f11', seccion: 'cargar' })).toEqual({ activa: 'f11', conFiltro: false, aviso: null, banner: true });
  });

  it('el superadmin elige: arranca en Todas, sin banner', () => {
    expect(panel({})).toEqual({ activa: 'todas', conFiltro: true, aviso: null, banner: false });
    expect(panel({ elegida: 'f7' })).toEqual({ activa: 'f7', conFiltro: true, aviso: null, banner: true });
  });

  it('en Cargar no hay Todas: pasa a la última modalidad elegida y lo avisa', () => {
    expect(panel({ seccion: 'cargar' })).toEqual({
      activa: 'f11',
      conFiltro: true,
      aviso: 'Cargar no tiene Todas: estás en Fútbol 11.',
      banner: true,
    });
    expect(panel({ seccion: 'cargar', elegida: 'todas', ultima: 'f7' }).aviso).toBe('Cargar no tiene Todas: estás en Fútbol 7.');
    expect(panel({ seccion: 'cargar', elegida: 'f7' }).aviso).toBeNull();
  });
});
