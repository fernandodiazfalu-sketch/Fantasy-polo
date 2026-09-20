import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import { calcularEquipoIdeal } from './idealTeam';

const COLOR_PUESTO = { 1: '#f4d03f', 2: '#5aa93f', 3: '#c0392b', 4: '#5b7fa6' };

export default function Clasificacion({ torneo }) {
  const [equipos, setEquipos] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [stats, setStats] = useState([]);
  const [jugadores, setJugadores] = useState([]);
  const [alineaciones, setAlineaciones] = useState([]);
  const [vista, setVista] = useState('total'); // 'total' | jornada puntual
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setVista('total');
      const [{ data: eq }, { data: p }, { data: j }, { data: a }] = await Promise.all([
        supabase.from('polo_fantasy_equipos').select('*').eq('torneo', torneo),
        supabase.from('polo_partidos').select('*').eq('torneo', torneo),
        supabase.from('polo_jugadores').select('*').eq('torneo', torneo),
        supabase.from('polo_alineaciones').select('*').eq('torneo', torneo),
      ]);
      setEquipos(eq || []);
      setPartidos(p || []);
      setJugadores(j || []);
      setAlineaciones(a || []);
      const partidoIds = (p || []).map((row) => row.id);
      if (partidoIds.length) {
        const { data: s } = await supabase.from('polo_stats').select('*').in('partido_id', partidoIds);
        setStats(s || []);
      } else {
        setStats([]);
      }
      setLoading(false);
    }
    load();
  }, [torneo]);

  const jornadas = useMemo(() => [...new Set(partidos.map((p) => p.jornada))], [partidos]);

  // Para un slot (jugador + equipo real) y una jornada, busca el partido correspondiente
  // y devuelve los puntos de ese jugador en ese partido (0 si todavía no se cargaron stats).
  function puntosDeSlot(slot, jornada) {
    const partido = partidos.find(
      (p) => p.jornada === jornada && (p.local === slot.equipo || p.visitante === slot.equipo)
    );
    if (!partido) return 0;
    const stat = stats.find((s) => s.partido_id === partido.id && s.jugador_id === slot.jugador_id);
    return Number(stat?.puntos ?? 0);
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

  // --- Desglose por jugador y comparación con el Equipo Ideal, para la fecha seleccionada ---
  const equiposEnJuegoDeLaVista = useMemo(() => {
    if (vista === 'total') return new Set();
    const set = new Set();
    partidos.filter((p) => p.jornada === vista).forEach((p) => { set.add(p.local); set.add(p.visitante); });
    return set;
  }, [partidos, vista]);

  const maxPorEquipoDeLaVista = equiposEnJuegoDeLaVista.size <= 2 ? 2 : 1;

  const equiposDeLaFecha = useMemo(
    () => (vista === 'total' ? [] : equipos.filter((e) => e.jornada === vista)),
    [equipos, vista]
  );

  const equipoIdealDeLaFecha = useMemo(() => {
    if (vista === 'total') return null;
    return calcularEquipoIdeal({
      partidos, jugadores, alineaciones, jornada: vista,
      equiposEnJuego: equiposEnJuegoDeLaVista, stats, maxPorEquipo: maxPorEquipoDeLaVista,
    });
  }, [vista, partidos, jugadores, alineaciones, equiposEnJuegoDeLaVista, stats, maxPorEquipoDeLaVista]);

  // Barras: cada usuario + el Equipo Ideal, apiladas por puesto (1 a 4)
  const barras = useMemo(() => {
    if (vista === 'total') return [];
    const deUsuarios = equiposDeLaFecha.map((eq) => {
      const porPuesto = {};
      (eq.slots || []).forEach((slot) => {
        const pts = puntosDeSlot(slot, vista);
        porPuesto[slot.puesto] = (eq.capitan_puesto === slot.puesto ? pts * 2 : pts);
      });
      const total = [1, 2, 3, 4].reduce((s, p) => s + (porPuesto[p] || 0), 0);
      return { nombre: eq.apodo || eq.email, porPuesto, total, esIdeal: false };
    });
    let ideal = null;
    if (equipoIdealDeLaFecha) {
      const porPuesto = {};
      [1, 2, 3, 4].forEach((p) => {
        const e = equipoIdealDeLaFecha.elegido[p];
        const pts = e ? e.puntos : 0;
        porPuesto[p] = equipoIdealDeLaFecha.capitanPuesto === p ? pts * 2 : pts;
      });
      ideal = { nombre: 'Equipo Ideal', porPuesto, total: equipoIdealDeLaFecha.total, esIdeal: true };
    }
    const todas = ideal ? [...deUsuarios, ideal] : deUsuarios;
    return todas.sort((a, b) => b.total - a.total);
  }, [equiposDeLaFecha, vista, equipoIdealDeLaFecha, partidos, stats]);

  const maxBarra = Math.max(1, ...barras.map((b) => b.total));

  if (loading) return <div className="app-shell">Cargando...</div>;

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <h1>Clasificación</h1>
          <div className="subtitle">{torneo}</div>
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

      <div className="summary-card" style={{ marginBottom: vista === 'total' ? 0 : 24 }}>
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

      {vista !== 'total' && barras.length > 0 && (
        <>
          <div className="summary-card" style={{ marginTop: 24, marginBottom: 24 }}>
            <h2>Puntos por puesto — {vista}</h2>
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, fontSize: 11, color: 'var(--ivory)' }}>
              {[1, 2, 3, 4].map((p) => (
                <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: COLOR_PUESTO[p], display: 'inline-block' }} />
                  Puesto {p}
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 220, overflowX: 'auto', padding: '0 4px 8px' }}>
              {barras.map((b) => (
                <div key={b.nombre} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 56 }}>
                  <div style={{ fontSize: 12, color: 'var(--gold-bright)', fontWeight: 700, marginBottom: 4 }}>{b.total}</div>
                  <div
                    style={{
                      width: 40,
                      height: `${Math.max(4, (b.total / maxBarra) * 170)}px`,
                      display: 'flex',
                      flexDirection: 'column-reverse',
                      borderRadius: 3,
                      overflow: 'hidden',
                      border: b.esIdeal ? '2px solid #ffffff' : 'none',
                    }}
                  >
                    {[1, 2, 3, 4].map((p) => {
                      const pts = b.porPuesto[p] || 0;
                      if (pts <= 0) return null;
                      return (
                        <div
                          key={p}
                          title={`Puesto ${p}: ${pts} pts`}
                          style={{ background: COLOR_PUESTO[p], height: `${(pts / b.total) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                  <div style={{
                    fontSize: 11, marginTop: 6, textAlign: 'center', maxWidth: 64,
                    color: b.esIdeal ? 'var(--gold-bright)' : 'var(--ivory)', fontWeight: b.esIdeal ? 700 : 500,
                  }}>
                    {b.nombre}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="summary-card">
            <h2>Detalle por jugador — {vista}</h2>
            {equiposDeLaFecha.map((eq) => (
              <div key={eq.user_id} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--gold-bright)', fontWeight: 700, marginBottom: 4 }}>
                  {eq.apodo || eq.email}
                </div>
                {(eq.slots || []).map((slot) => {
                  const pts = puntosDeSlot(slot, vista);
                  const esCapitan = eq.capitan_puesto === slot.puesto;
                  return (
                    <div className="summary-row" key={slot.puesto} style={{ fontSize: 13 }}>
                      <div>
                        <span className="meta">P{slot.puesto}</span>{' '}
                        <span className="name" style={{ fontWeight: 500 }}>{slot.nombre}{esCapitan ? ' (C)' : ''}</span>
                      </div>
                      <div>{esCapitan ? `${pts} ×2 = ${pts * 2}` : pts}</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
