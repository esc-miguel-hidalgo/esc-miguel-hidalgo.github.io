import { useCallback, useEffect, useState } from 'react';

const ETIQUETAS = {
  sin: 'Sin iniciar',
  borrador: 'Borrador',
  enviado: 'Por validar',
  validado: 'Validado',
  devuelto: 'Devuelto',
  entregado: 'Entregado',
  revisado: 'Revisado',
};

export function Chip({ estado }) {
  const e = estado || 'sin';
  return <span className={`chip ${e}`}>{ETIQUETAS[e] || e}</span>;
}

export function Progreso({ hechos, total, etiqueta }) {
  const pct = total ? Math.round((hechos / total) * 100) : 0;
  return (
    <div>
      <div className="fila entre tenue">
        <span>{etiqueta}</span>
        <span>{hechos} de {total} ({pct}%)</span>
      </div>
      <div className="progreso" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Aviso({ tipo = '', children }) {
  if (!children) return null;
  return <div className={`aviso ${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function Pestanas({ opciones, actual, onCambio }) {
  return (
    <div className="pestanas" role="tablist">
      {opciones.map((o) => (
        <button key={o.id} role="tab" aria-selected={actual === o.id} onClick={() => onCambio(o.id)}>
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

/** Carga asíncrona con estado de carga/error y función para recargar. */
export function useCarga(fn, deps) {
  const [estado, setEstado] = useState({ cargando: true, error: null, datos: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const cargar = useCallback(fn, deps);
  const recargar = useCallback(async () => {
    try {
      const datos = await cargar();
      setEstado({ cargando: false, error: null, datos });
    } catch (e) {
      setEstado((s) => ({ ...s, cargando: false, error: e.message }));
    }
  }, [cargar]);
  useEffect(() => { recargar(); }, [recargar]);
  return { ...estado, recargar };
}

/** Ejecuta una acción mostrando "ocupado" y capturando el error. */
export function useAccion() {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState(null);
  const ejecutar = useCallback(async (fn) => {
    setOcupado(true);
    setError(null);
    try {
      return await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setOcupado(false);
    }
  }, []);
  return { ocupado, error, ejecutar, limpiar: () => setError(null) };
}

/** Botón que pide una segunda confirmación en línea (sin window.confirm). */
export function BotonConfirmar({ children, pregunta, onConfirmar, className = 'btn', disabled }) {
  const [confirmando, setConfirmando] = useState(false);
  if (!confirmando) {
    return <button className={className} disabled={disabled} onClick={() => setConfirmando(true)}>{children}</button>;
  }
  return (
    <span className="fila">
      <span className="tenue">{pregunta}</span>
      <button className={className} disabled={disabled} onClick={() => { setConfirmando(false); onConfirmar(); }}>Sí, continuar</button>
      <button className="btn claro" onClick={() => setConfirmando(false)}>Cancelar</button>
    </span>
  );
}
