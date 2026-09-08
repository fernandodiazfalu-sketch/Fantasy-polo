import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Alineaciones() {
  const [partidos, setPartidos] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [alineaciones, setAlineaciones] = useState([]);
  const [jornada, setJornada] = useState('Fecha 1');
  const [status, setStatus] = useState('');
  const [nuevoJugador, setNuevoJugador] = useState({}); // { [equipo]: { nombre, hcp, puesto } }

  async function loadAll() {
    const [{ data: p }, { data: j }, { data: a }] = await Promise.all([
      supabase.from('polo_partidos').select('*').order('id'),
      supabase.from('polo_jugadores').select('*').order('equipo').order('puesto'),
      supabase.from('polo_alineaciones').select('*'),
    ]);
    setPartidos(p || []);
    setJugadores(j || []);
    setAlineaciones(a || []);
  }

  useEffect(() => { loadAll(); }, []);

  const jornadas = useMemo(
    () => [...new Set(partidos.map((p) => p.jornada))],
    [partidos]
  );

  const equiposDeLaJornada = useMemo(() => {
    const set = new Set();
    partidos.filter((p) => p.jornada === jornada).forEach((p) => {
      set.add(p.local);
      set.add(p.visitante);
    });
    return [...set];
  }, [partidos, jornada]);

  function jugadorEnPuesto(equipo, puesto) {
    const row = alineaciones.find(
      (a) => a.jornada === jornada && a.equipo === equipo && a.puesto === puesto
    );
    if (!row) return null;
    return jugadores.find((j) => j.id === row.jugador_id) || null;
  }

  function opcionesParaEquipo(equipo) {
    return jugadores.filter((j) => j.equipo === equipo);
  }

  async function asignar(equipo, puesto, jugadorId) {
    setStatus('Guardando...');
    const { error } = await supabase.from('polo_alineaciones').upsert(
      { jornada, equipo, puesto, jugador_id: jugadorId ? Number(jugadorId) : null },
      { onConflict: 'jornada,equipo,puesto' }
    );
    if (error) {
      setStatus('Error al guardar: ' + error.message);
    } else {
      setStatus('Guardado.');
      loadAll();
    }
  }

  async function agregarJugadorNuevo(equipo, puesto) {
    const form = nuevoJugador[equipo];
    if (!form?.nombre || !form?.hcp) return;
    setStatus('Agregando jugador...');
    const { data, error } = await supabase
      .from('polo_jugadores')
      .insert({ nombre: form.nombre, hcp: Number(form.hcp), equipo, puesto })
      .select()
      .single();
    if (error) {
      setStatus('Error al agregar jugador: ' + error.message);
      return;
    }
    await asignar(equipo, puesto, data.id);
    setNuevoJugador((prev) => ({ ...prev, [equipo]: { nombre: '', hcp: '', puesto: null } }));
  }

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <h1>Alineaciones</h1>
          <div className="subtitle">Quién juega cada puesto, fecha a fecha</div>
        </div>
      </header>

      <div className="jornada-tabs">
        {jornadas.map((j) => (
          <button key={j} className={j === jornada ? 'active' : ''} onClick={() => setJornada(j)}>
            {j}
          </button>
        ))}
      </div>

      {status && <p className="jornada-note">{status}</p>}

      {equiposDeLaJornada.map((equipo) => (
        <div className="summary-card" key={equipo} style={{ marginBottom: 18 }}>
          <h2>{equipo}</h2>
          {[1, 2, 3, 4].map((puesto) => {
            const actual = jugadorEnPuesto(equipo, puesto);
            const opciones = opcionesParaEquipo(equipo);
            return (
              <div className="summary-row" key={puesto} style={{ alignItems: 'center' }}>
                <div className="meta" style={{ width: 70 }}>Puesto {puesto}</div>
                <select
                  value={actual?.id || ''}
                  onChange={(e) => asignar(equipo, puesto, e.target.value)}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 4 }}
                >
                  <option value="">— sin asignar —</option>
                  {opciones.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.nombre} (hcp {j.hcp}){j.puesto !== puesto ? ` · juega puesto ${j.puesto} normalmente` : ''}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--gold-bright)' }}>
              + Agregar jugador nuevo a {equipo}
            </summary>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                placeholder="Nombre"
                value={nuevoJugador[equipo]?.nombre || ''}
                onChange={(e) =>
                  setNuevoJugador((prev) => ({ ...prev, [equipo]: { ...prev[equipo], nombre: e.target.value } }))
                }
                style={{ padding: 6, borderRadius: 4, border: 'none', flex: 1 }}
              />
              <input
                placeholder="HCP"
                type="number"
                value={nuevoJugador[equipo]?.hcp || ''}
                onChange={(e) =>
                  setNuevoJugador((prev) => ({ ...prev, [equipo]: { ...prev[equipo], hcp: e.target.value } }))
                }
                style={{ padding: 6, borderRadius: 4, border: 'none', width: 70 }}
              />
              <select
                value={nuevoJugador[equipo]?.puesto || ''}
                onChange={(e) =>
                  setNuevoJugador((prev) => ({ ...prev, [equipo]: { ...prev[equipo], puesto: Number(e.target.value) } }))
                }
                style={{ padding: 6, borderRadius: 4 }}
              >
                <option value="">Puesto</option>
                {[1, 2, 3, 4].map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <button
                className="primary-btn"
                style={{ padding: '6px 14px' }}
                onClick={() => agregarJugadorNuevo(equipo, nuevoJugador[equipo]?.puesto)}
                disabled={!nuevoJugador[equipo]?.nombre || !nuevoJugador[equipo]?.hcp || !nuevoJugador[equipo]?.puesto}
              >
                Agregar
              </button>
            </div>
          </details>
        </div>
      ))}
    </div>
  );
}
