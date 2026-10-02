/**
 * Aviso de una expulsión listo para mandar al delegado: vista previa, botón de WhatsApp y copia manual.
 */

import { useRef, useState } from 'react';
import { Icono } from '../../componentes/Icono.jsx';
import { detalleExpulsion } from '../../logica/consultas.js';
import { linkWhatsApp, mensajeExpulsion, soloDigitos } from '../../logica/expulsiones.js';

export function AvisoWhatsApp({ db, expulsion }) {
  const refMensaje = useRef(null);
  const [nota, setNota] = useState('');
  const detalle = detalleExpulsion(db, expulsion);
  if (!detalle) return null;

  const mensaje = mensajeExpulsion(expulsion, detalle);
  const telefono = soloDigitos(detalle.equipo.telefonoDelegado);
  const delegado = detalle.equipo.delegado || 'el delegado';

  const copiar = () => {
    const seleccionar = () => {
      const seleccion = window.getSelection();
      if (seleccion && refMensaje.current) seleccion.selectAllChildren(refMensaje.current);
      setNota('Seleccioné el mensaje: copialo con el menú del celular o con Ctrl+C.');
    };
    try {
      navigator.clipboard
        .writeText(mensaje)
        .then(() => setNota('Mensaje copiado. Pegalo en el chat del delegado.'), seleccionar);
    } catch {
      seleccionar();
    }
  };

  return (
    <article className="aviso" id={`aviso-${expulsion.id}`}>
      <div className="aviso__cab">
        <span className="tarjeta-roja" aria-hidden="true">{expulsion.numeroCamiseta}</span>
        <div>
          <p className="aviso__titulo">
            N° {expulsion.numeroCamiseta} de {detalle.equipo.nombre}
            {expulsion.nombreJugador ? ` (${expulsion.nombreJugador})` : ''}
          </p>
          <p className="aviso__destino">
            {telefono ? (
              <>
                Para {delegado}, al <span className="aviso__tel">+{telefono}</span>
              </>
            ) : (
              'Este equipo todavía no tiene el WhatsApp del delegado.'
            )}
          </p>
        </div>
      </div>
      <p className="aviso__mensaje" ref={refMensaje}>
        {mensaje}
      </p>
      <div className="aviso__acciones">
        {telefono ? (
          <a
            className="btn btn--whatsapp"
            href={linkWhatsApp(telefono, mensaje)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setNota('Si WhatsApp no se abrió, copiá el mensaje y mandalo a mano.')}
          >
            📲 Avisar por WhatsApp
          </a>
        ) : (
          <p className="aviso__nota">
            Cargá el WhatsApp del delegado en Equipos para avisarle con un toque. Mientras tanto, copiá el mensaje.
          </p>
        )}
        <button type="button" className="btn btn--secundario btn--chico" onClick={copiar}>
          <Icono nombre="copiar" tamano={16} /> Copiar mensaje
        </button>
      </div>
      {nota && (
        <p className="aviso__nota" role="status">
          {nota}
        </p>
      )}
    </article>
  );
}
