import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

export default function Estadisticas() {
  const [jugadores, setJugadores] = useState([]);
  const [stats, setStats] = useState([]);
  const [filtroPuesto, setFiltroPuesto] = useState('todos');
  const [ordenarPor, setOrdenarPor] = useState('total');

  useEffect(() => {
    async function load() {
      const [{ data: j }, { data: s }] = await Promise.all([
        supabase.from('polo_jugadores').select('*').order('equipo').order('puesto'),
        supabase.from('polo_stats').select('*'),
      ]);
      setJugadores(j || []);
      setStats(s || []);
    }
    load();
  }, []);

  const acumulado = useMemo(() => {
    const porJugador = {};
    jugadores.forEach((j) => {
      porJugador[j.id] = {
        ...j,
        pj: 0,
        goles_campo: 0,
        goles_penal: 0,
        penal_1: 0,
        corners: 0,
        tarjetas_amarillas: 0,
        puntos: 0,
      };
    });
    stats.forEach((s) => {
      const acc = porJugador[s.jugador_id];
      if (!acc) return;
      acc.pj += 1;
      acc.goles_campo += s.goles_campo;
      acc.goles_penal += s.goles_penal;
      acc.penal_1 += s.penal_1;
      acc.corners += s.corners;
      acc.tarjetas_amarillas += s.tarjetas_amarillas;
      acc.puntos += Number(s.puntos ?? 0);
    });
    return Object.values(porJugador);
  }, [jugadores, stats]);

  const equipos = useMemo(() => [...new Set(jugadores.map((j) => j.equipo))], [jugadores]);

  const ranking = useMemo(() => {
    let lista = acumulado.filter((j) => filtroPuesto === 'todos' || j.puesto === Number(filtroPuesto));
    lista = lista.map((j) => ({ ...j, promedio: j.pj ? j.puntos / j.pj : 0 }));
    lista.sort((a, b) => (ordenarPor === 'promedio' ? b.promedio - a.promedio : b.puntos - a.puntos));
    return lista;
  }, [acumulado, filtroPuesto, ordenarPor]);

  const th = { fontSize: 11, textAlign: 'center', width: 34 };
  const td = { fontSize: 13, textAlign: 'center', width: 34 };

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <h1>Estadísticas</h1>
          <div className="subtitle">Rendimiento acumulado del torneo</div>
        </div>
      </header>

      <div className="summary-card" style={{ marginBottom: 26 }}>
        <h2>Ranking de jugadores</h2>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <select
            value={filtroPuesto}
            onChange={(e) => setFiltroPuesto(e.target.value)}
            style={{ padding: 6, borderRadius: 4, fontSize: 13 }}
          >
            <option value="todos">Todos los puestos</option>
            {[1, 2, 3, 4].map((p) => (
              <option key={p} value={p}>Puesto {p}</option>
            ))}
          </select>
          <select
            value={ordenarPor}
            onChange={(e) => setOrdenarPor(e.target.value)}
            style={{ padding: 6, borderRadius: 4, fontSize: 13 }}
          >
            <option value="total">Ordenar por puntos totales</option>
            <option value="promedio">Ordenar por promedio por partido</option>
          </select>
        </div>
        <div className="summary-row meta" style={{ fontSize: 11 }}>
          <span style={{ flex: 1 }}>Jugador</span>
          <span style={th}>PJ</span>
          <span style={th}>Prom.</span>
          <span style={th}>Pts</span>
        </div>
        {ranking.map((j, i) => (
          <div className="summary-row" key={j.id}>
            <div>
              <div className="name">{i + 1}. {j.nombre}</div>
              <div className="meta">{j.equipo} · Puesto {j.puesto} · hcp {j.hcp}</div>
            </div>
            <span style={td}>{j.pj}</span>
            <span style={td}>{j.promedio.toFixed(1)}</span>
            <span style={{ ...td, color: 'var(--gold-bright)', fontWeight: 700 }}>{j.puntos}</span>
          </div>
        ))}
      </div>

      <h2 style={{ fontFamily: 'var(--serif)', color: 'var(--navy)', marginBottom: 12, fontSize: 22 }}>
        Por equipo
      </h2>
      {equipos.map((equipo) => (
        <div className="summary-card" key={equipo} style={{ marginBottom: 18 }}>
          <h2>{equipo}</h2>
          <div className="summary-row meta" style={{ fontSize: 11 }}>
            <span style={{ flex: 1 }}>Jugador</span>
            <span style={th}>PJ</span>
            <span style={th}>GC</span>
            <span style={th}>GP</span>
            <span style={th}>P1</span>
            <span style={th}>Cnr</span>
            <span style={th}>TA</span>
            <span style={th}>Pts</span>
          </div>
          {acumulado
            .filter((j) => j.equipo === equipo)
            .sort((a, b) => a.puesto - b.puesto)
            .map((j) => (
              <div className="summary-row" key={j.id} style={{ fontSize: 13 }}>
                <span style={{ flex: 1 }}>{j.nombre} <span className="meta">(P{j.puesto})</span></span>
                <span style={td}>{j.pj}</span>
                <span style={td}>{j.goles_campo}</span>
                <span style={td}>{j.goles_penal}</span>
                <span style={td}>{j.penal_1}</span>
                <span style={td}>{j.corners}</span>
                <span style={td}>{j.tarjetas_amarillas}</span>
                <span style={{ ...td, color: 'var(--gold-bright)', fontWeight: 700 }}>{j.puntos}</span>
              </div>
            ))}
        </div>
      ))}
      <p style={{ fontSize: 12, color: 'var(--turf-deep)', fontStyle: 'italic' }}>
        PJ: partidos jugados · GC: goles de campo · GP: goles de penal · P1: penal 1 · Cnr: corners · TA: tarjetas amarillas · Pts: puntaje fantasy total
      </p>
    </div>
  );
}
