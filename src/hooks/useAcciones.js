/**
 * Cambios que hace el panel: cada uno llama a la API, vuelve a pedir los datos y avisa.
 * Devuelven lo guardado (o true) si salió bien, y null si falló (el aviso muestra el motivo).
 * Si la sesión venció o la cuenta no es admin, no se sigue en el panel: se llama a onSesionInvalida.
 */

import { useMemo } from 'react';
import { api } from '../api/cliente.js';

export function crearAcciones({ token, recargar, avisar, onSesionInvalida, cliente = api }) {
  async function ejecutar(pedido, mensajeOk) {
    try {
      const resultado = await pedido();
      await recargar();
      if (mensajeOk) avisar(mensajeOk);
      return resultado ?? true;
    } catch (error) {
      if (error.estado === 401 || error.estado === 403) onSesionInvalida(error);
      else avisar(error.message, 'error');
      return null;
    }
  }

  return {
    crearPartido: (datos, mensaje) => ejecutar(() => cliente.crearPartido(token, datos), mensaje),
    guardarResultado: (id, golesLocal, golesVisitante, mensaje) =>
      ejecutar(() => cliente.actualizarPartido(token, id, { golesLocal, golesVisitante }), mensaje),
    quitarResultado: (id, mensaje) =>
      ejecutar(() => cliente.actualizarPartido(token, id, { golesLocal: null, golesVisitante: null }), mensaje),
    marcarPostergado: (id, postergado, mensaje) =>
      ejecutar(() => cliente.actualizarPartido(token, id, { postergado }), mensaje),
    guardarLugar: (id, lugar, mensaje) => ejecutar(() => cliente.actualizarPartido(token, id, lugar), mensaje),
    marcarAusente: (id, ausente, mensaje) => ejecutar(() => cliente.actualizarPartido(token, id, { ausente }), mensaje),
    borrarPartido: (id, mensaje) => ejecutar(() => cliente.borrarPartido(token, id), mensaje),
    crearTarjeta: (datos, mensaje) => ejecutar(() => cliente.crearTarjeta(token, datos), mensaje),
    borrarTarjeta: (id, mensaje) => ejecutar(() => cliente.borrarTarjeta(token, id), mensaje),
    crearMovimiento: (datos, mensaje) => ejecutar(() => cliente.crearMovimiento(token, datos), mensaje),
    actualizarMovimiento: (id, cambios, mensaje) =>
      ejecutar(() => cliente.actualizarMovimiento(token, id, cambios), mensaje),
    borrarMovimiento: (id, mensaje) => ejecutar(() => cliente.borrarMovimiento(token, id), mensaje),
    crearExpulsion: (datos, mensaje) => ejecutar(() => cliente.crearExpulsion(token, datos), mensaje),
    actualizarExpulsion: (id, cambios, mensaje) =>
      ejecutar(() => cliente.actualizarExpulsion(token, id, cambios), mensaje),
    borrarExpulsion: (id, mensaje) => ejecutar(() => cliente.borrarExpulsion(token, id), mensaje),
    actualizarEquipo: (id, cambios, mensaje) => ejecutar(() => cliente.actualizarEquipo(token, id, cambios), mensaje),
    actualizarConfiguracion: (cambios, mensaje) =>
      ejecutar(() => cliente.actualizarConfiguracion(token, cambios), mensaje),
  };
}

export function useAcciones({ token, recargar, avisar, onSesionInvalida }) {
  return useMemo(
    () => crearAcciones({ token, recargar, avisar, onSesionInvalida }),
    [token, recargar, avisar, onSesionInvalida]
  );
}
