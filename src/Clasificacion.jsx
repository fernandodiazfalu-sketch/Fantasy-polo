import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Clasificacion() {
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [stats, setStats] = useState([]);
  const [vista, setVista] = useState('total'); // 'total' | jornada puntual
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: eq }, { data: p }, { data: s }] = await Promise.all([
        supabase.from('polo_fantasy_equipos').select('*'),
        supabase.from('polo_partidos').select('*'),
        supabase.from('polo_stats').select('*'),
      ]);
      setEquipos(eq || []);
      setPartidos(p || []);
      setStats(s || []);
      setLoading(false);
    }
    load();
  }, []);

  const jornadas = useMemo(() => [...new Set(partidos.map((p) => p.jornada))], [partidos]);

  // Para un slot (jugador + equipo real) y una jornada, busca el partido correspondiente
  // y devuelve los puntos de ese jugador en ese partido (0 si todavía no se cargaron stats).
  function puntosDeSlot(slot, jornada) {
    const partido = partidos.find(
      (p) => p.jornada === jornada && (p.local === slot.equipo || p.visitante === slot.equipo)
    );
    if (!partido) return 0;
    const stat = stats.find((s) => s.partido_id === partido.id && s.jugador_id === slot.jugador_id);
    return stat?.puntos ?? 0;
  }

  const filas = useMemo(() => {
    const porUsuario = {};
    equipos.forEach((eq) => {
      const key = eq.user_id;
      if (!porUsuario[key]) porUsuario[key] = { apodo: eq.apodo || eq.email, email: eq.email, porJornada: {} };
      const puntosJornada = (eq.slots || []).reduce((sum, slot) => {
        const pts = puntosDeSlot(slot, eq.jornada);
        const esCapitan = eq.capitan_puesto === slot.puesto;
        return sum + (esCapitan ? pts * 2 : pts);
      }, 0);
      porUsuario[key].porJornada[eq.jornada] = puntosJornada;
    });
    return Object.values(porUsuario).map((u) => ({
      ...u,
      total: Object.values(u.porJornada).reduce((a, b) => a + b, 0),
    }));
  }, [equipos, partidos, stats]);

  const filasOrdenadas = useMemo(() => {
    const copia = [...filas];
    if (vista === 'total') {
      copia.sort((a, b) => b.total - a.total);
    } else {
      copia.sort((a, b) => (b.porJornada[vista] || 0) - (a.porJornada[vista] || 0));
    }
    return copia;
  }, [filas, vista]);

  if (loading) return <div className="app-shell">Cargando...</div>;

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <h1>Clasificación</h1>
          <div className="subtitle">61° Abierto del Jockey Club · Copa Éminent</div>
        </div>
      </header>

      <div className="jornada-tabs">
        <button className={vista === 'total' ? 'active' : ''} onClick={() => setVista('total')}>
          Total acumulado
        </button>
        {jornadas.map((j) => (
          <button key={j} className={vista === j ? 'active' : ''} onClick={() => setVista(j)}>
            {j}
          </button>
        ))}
      </div>

      <div className="summary-card">
        <h2>{vista === 'total' ? 'Puntaje total' : vista}</h2>
        {filasOrdenadas.length === 0 && <div className="summary-row empty">Todavía no hay equipos armados.</div>}
        {filasOrdenadas.map((u, i) => (
          <div className="summary-row" key={u.email}>
            <div>
              <span className="name">{i + 1}. {u.apodo}</span>
            </div>
            <div style={{ fontWeight: 700, color: 'var(--gold-bright)' }}>
              {vista === 'total' ? u.total : (u.porJornada[vista] || 0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
