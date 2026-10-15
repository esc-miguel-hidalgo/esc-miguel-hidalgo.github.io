import { useEffect, useState } from 'react';
import { supabase, configurado } from './lib/supabase.js';
import { miPerfil } from './lib/datos.js';
import { Aviso } from './componentes/comunes.jsx';
import Login, { NuevaContrasena } from './vistas/Login.jsx';
import PanelDocente from './vistas/Docente.jsx';
import PanelDirectora from './vistas/Directora.jsx';

export default function App() {
  const [sesion, setSesion] = useState(undefined); // undefined = aún no sabemos
  const [recuperando, setRecuperando] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!configurado) return;
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
      setSesion(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setPerfil(null);
    setError(null);
    if (!sesion) return;
    miPerfil(sesion.user.id)
      .then((p) => (p.activo ? setPerfil(p) : setError('Tu cuenta está desactivada. Habla con la dirección.')))
      .catch((e) => setError(e.message));
  }, [sesion?.user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const salir = () => supabase.auth.signOut();

  return (
    <>
      <header className="barra">
        <a className="marca" href="../">
          <img src="escudo.png" alt="" />
          <span>
            <strong>Portal docente</strong>
            <small>Esc. Prim. "Miguel Hidalgo" · volver al sitio</small>
          </span>
        </a>
        {perfil && (
          <div className="usuario">
            <span>{perfil.nombre || sesion.user.email} · {perfil.rol === 'directora' ? 'Dirección' : 'Docente'}</span>
            <button className="btn fantasma" onClick={salir}>Salir</button>
          </div>
        )}
      </header>
      <main className="contenedor" id="contenido">
        {!configurado ? (
          <Aviso tipo="error">
            El portal no está configurado: faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (ver portal/.env.example).
          </Aviso>
        ) : sesion === undefined ? (
          <p className="tenue">Cargando…</p>
        ) : recuperando ? (
          <NuevaContrasena onListo={() => setRecuperando(false)} />
        ) : !sesion ? (
          <Login />
        ) : error ? (
          <Aviso tipo="error">{error} <button className="enlace" onClick={salir}>Salir</button></Aviso>
        ) : !perfil ? (
          <p className="tenue">Cargando…</p>
        ) : perfil.rol === 'directora' ? (
          <PanelDirectora perfil={perfil} />
        ) : (
          <PanelDocente perfil={perfil} />
        )}
      </main>
    </>
  );
}
