/**
 * Ingreso de los admins con usuario y contraseña (Supabase Auth).
 */

import { useState } from 'react';
import { Logo } from '../../componentes/Logo.jsx';

export function PantallaLogin({ nombreCampeonato, onIngresar, onVolver }) {
  const [usuario, setUsuario] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState('');
  const [ingresando, setIngresando] = useState(false);

  const ingresar = async (e) => {
    e.preventDefault();
    if (!usuario.trim() || !contrasena) {
      setError('Completá el usuario y la contraseña.');
      return;
    }
    setIngresando(true);
    const resultado = await onIngresar(usuario, contrasena);
    setIngresando(false);
    if (resultado.error) setError(resultado.error);
  };

  return (
    <div className="login">
      <form className="login__caja" onSubmit={ingresar} noValidate>
        <Logo className="login__logo" />
        <h1 className="login__titulo">Ingreso de administración</h1>
        {nombreCampeonato && <p className="login__sub">{nombreCampeonato}</p>}
        <div className="campo">
          <label className="campo__label" htmlFor="login-usuario">Usuario</label>
          <input
            id="login-usuario"
            className="input"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={usuario}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setUsuario(e.target.value);
              setError('');
            }}
          />
        </div>
        <div className="campo">
          <label className="campo__label" htmlFor="login-contrasena">Contraseña</label>
          <input
            id="login-contrasena"
            className="input"
            type="password"
            autoComplete="current-password"
            value={contrasena}
            aria-invalid={Boolean(error) || undefined}
            onChange={(e) => {
              setContrasena(e.target.value);
              setError('');
            }}
          />
        </div>
        {error && (
          <p className="campo__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primario btn--bloque" disabled={ingresando}>
          {ingresando ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="nota-prototipo">Las cuentas de administración las crea la organización. Si no tenés una, pedila.</p>
        <button type="button" className="btn btn--fantasma btn--bloque" onClick={onVolver}>
          Volver a la vista pública
        </button>
      </form>
    </div>
  );
}
