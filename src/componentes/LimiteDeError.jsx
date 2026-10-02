/**
 * Evita la pantalla en blanco si algo falla al dibujar.
 */

import { Component } from 'react';

/* ---------- Si algo falla al dibujar, no queda la pantalla en blanco ---------- */
export class LimiteDeError extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error(error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="fallo" role="alert">
        <h1 className="seccion__titulo">Algo falló al mostrar esta pantalla</h1>
        <p>Los datos cargados siguen en memoria. Volvé al inicio para seguir.</p>
        <button
          type="button"
          className="btn btn--primario"
          onClick={() => {
            this.setState({ error: null });
            if (this.props.onReiniciar) this.props.onReiniciar();
          }}
        >
          Volver al inicio
        </button>
      </div>
    );
  }
}
