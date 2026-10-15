import { useState } from 'react';
import { supabase, ok } from '../lib/supabase.js';
import { Aviso, useAccion } from '../componentes/comunes.jsx';

export default function Login() {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [olvido, setOlvido] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const { ocupado, error, ejecutar } = useAccion();

  const entrar = (e) => {
    e.preventDefault();
    ejecutar(async () => ok(await supabase.auth.signInWithPassword({ email: correo.trim(), password: contrasena })));
  };

  const recuperar = (e) => {
    e.preventDefault();
    ejecutar(async () => {
      ok(await supabase.auth.resetPasswordForEmail(correo.trim(), { redirectTo: location.origin + location.pathname }));
      setEnviado(true);
    });
  };

  return (
    <div className="login tarjeta pila">
      <h1 className="titulo-vista">{olvido ? 'Recuperar contraseña' : 'Entrar al portal'}</h1>
      <p className="tenue">
        Espacio interno para docentes y dirección. Las cuentas las da de alta la dirección; no hay registro abierto.
      </p>
      <form className="pila" onSubmit={olvido ? recuperar : entrar}>
        <div className="campo">
          <label htmlFor="correo">Correo</label>
          <input id="correo" type="email" autoComplete="email" required value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        {!olvido && (
          <div className="campo">
            <label htmlFor="contrasena">Contraseña</label>
            <input id="contrasena" type="password" autoComplete="current-password" required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
          </div>
        )}
        <Aviso tipo="error">{error}</Aviso>
        {enviado && <Aviso tipo="exito">Si el correo tiene cuenta, te llegará un enlace para crear una contraseña nueva.</Aviso>}
        <button className="btn" disabled={ocupado}>{ocupado ? 'Un momento…' : olvido ? 'Enviar enlace' : 'Entrar'}</button>
      </form>
      <button className="enlace" onClick={() => { setOlvido(!olvido); setEnviado(false); }}>
        {olvido ? 'Volver a entrar' : '¿Olvidaste tu contraseña?'}
      </button>
      <p className="tenue"><a href="privacidad.html">Aviso de privacidad</a></p>
    </div>
  );
}

export function NuevaContrasena({ onListo }) {
  const [contrasena, setContrasena] = useState('');
  const { ocupado, error, ejecutar } = useAccion();

  const guardar = (e) => {
    e.preventDefault();
    ejecutar(async () => {
      ok(await supabase.auth.updateUser({ password: contrasena }));
      onListo();
    });
  };

  return (
    <form className="login tarjeta pila" onSubmit={guardar}>
      <h1 className="titulo-vista">Contraseña nueva</h1>
      <div className="campo">
        <label htmlFor="nueva">Escribe tu contraseña nueva (mínimo 8 caracteres)</label>
        <input id="nueva" type="password" autoComplete="new-password" minLength={8} required value={contrasena} onChange={(e) => setContrasena(e.target.value)} />
      </div>
      <Aviso tipo="error">{error}</Aviso>
      <button className="btn" disabled={ocupado}>Guardar</button>
    </form>
  );
}
