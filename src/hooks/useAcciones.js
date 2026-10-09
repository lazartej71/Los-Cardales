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

  // Solo lee (no cambia nada): no vuelve a pedir los datos ni avisa si sale bien
  async function leer(pedido) {
    try {
      return await pedido();
    } catch (error) {
      if (error.estado === 401 || error.estado === 403) onSesionInvalida(error);
      else avisar(error.message, 'error');
      return null;
    }
  }

  // El pago de un equipo en un partido, en hasta dos partes (una por medio): crea, cambia o borra
  // cada parte y avisa una sola vez. partes: [{ metodo, monto (o null), pago (el que ya había, o null) }].
  // Si falla a mitad de camino, lo anterior ya quedó guardado: igual se vuelven a pedir los datos.
  async function guardarPagos({ partidoId, equipoId, fecha, partes }, mensajeOk) {
    const pedidos = partes.flatMap(({ metodo, monto, pago }) => {
      if (pago && monto === null) return [() => cliente.borrarMovimiento(token, pago.id)];
      if (pago && monto !== pago.monto) return [() => cliente.actualizarMovimiento(token, pago.id, { monto })];
      if (!pago && monto !== null) {
        return [() => cliente.crearMovimiento(token, { tipo: 'pago', equipoId, partidoId, monto, metodo, fecha })];
      }
      return [];
    });
    if (!pedidos.length) return true;
    let hechos = 0;
    const resultado = await ejecutar(async () => {
      for (const pedido of pedidos) {
        await pedido();
        hechos++;
      }
    }, mensajeOk);
    if (resultado === null && hechos > 0) await recargar();
    return resultado;
  }

  return {
    leerActividad: (dia) => leer(() => cliente.actividad(token, dia)),
    leerVisitas: () => leer(() => cliente.visitas(token)),
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
    borrarTarjeta: (id, mensaje) => ejecutar(() => cliente.borrarTarjeta(token, id), mensaje),
    guardarPagos,
    crearMovimiento: (datos, mensaje) => ejecutar(() => cliente.crearMovimiento(token, datos), mensaje),
    actualizarMovimiento: (id, cambios, mensaje) =>
      ejecutar(() => cliente.actualizarMovimiento(token, id, cambios), mensaje),
    borrarMovimiento: (id, mensaje) => ejecutar(() => cliente.borrarMovimiento(token, id), mensaje),
    crearExpulsion: (datos, mensaje) => ejecutar(() => cliente.crearExpulsion(token, datos), mensaje),
    actualizarExpulsion: (id, cambios, mensaje) =>
      ejecutar(() => cliente.actualizarExpulsion(token, id, cambios), mensaje),
    borrarExpulsion: (id, mensaje) => ejecutar(() => cliente.borrarExpulsion(token, id), mensaje),
    actualizarEquipo: (id, cambios, mensaje) => ejecutar(() => cliente.actualizarEquipo(token, id, cambios), mensaje),
    crearEquipo: (datos, mensaje) => ejecutar(() => cliente.crearEquipo(token, datos), mensaje),
    cambiarBaja: (id, baja, mensaje) => ejecutar(() => cliente.cambiarBaja(token, id, baja), mensaje),
    subirEscudo: (id, imagen, mensaje) => ejecutar(() => cliente.subirEscudo(token, id, imagen), mensaje),
    quitarEscudo: (id, mensaje) => ejecutar(() => cliente.quitarEscudo(token, id), mensaje),
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
