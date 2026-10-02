/**
 * Pantalla mientras cargan los datos, o con el error y un botón para reintentar.
 */

export function EstadoDeCarga({ error, onReintentar }) {
  if (error) {
    return (
      <div className="fallo" role="alert">
        <h1 className="seccion__titulo">No se pudo cargar el campeonato</h1>
        <p>{error.message}</p>
        {onReintentar && (
          <button type="button" className="btn btn--primario" onClick={onReintentar}>
            Reintentar
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="cargando" role="status">
      <span className="cargando__giro" aria-hidden="true" />
      <span>Cargando el campeonato…</span>
    </div>
  );
}
