import React, { useMemo, useState } from 'react';

const EQUIPOS = ['La Fe', 'La Irenita', 'Don Ercole', 'La Natividad La Dolfina', 'Las Monjitas'];

export default function InfoPanel({ partidos, jugadores, alineaciones, jornada, equiposEnJuego, stats, misSlots, miCapitan, maxPorEquipo }) {
  const [tab, setTab] = useState('fixture');

  const jornadas = useMemo(() => [...new Set(partidos.map((p) => p.jornada))], [partidos]);

  const tabla = useMemo(() => {
    const stats = {};
    EQUIPOS.forEach((eq) => {
      stats[eq] = { equipo: eq, pj: 0, pg: 0, pe: 0, pp: 0, gf: 0, gc: 0, pts: 0 };
    });
    partidos.forEach((p) => {
      if (p.goles_local == null || p.goles_visitante == null) return;
      const l = stats[p.local];
      const v = stats[p.visitante];
      if (!l || !v) return;
      l.pj += 1; v.pj += 1;
      l.gf += p.goles_local; l.gc += p.goles_visitante;
      v.gf += p.goles_visitante; v.gc += p.goles_local;
      if (p.goles_local > p.goles_visitante) { l.pg += 1; l.pts += 3; v.pp += 1; }
      else if (p.goles_local < p.goles_visitante) { v.pg += 1; v.pts += 3; l.pp += 1; }
      else { l.pe += 1; v.pe += 1; l.pts += 1; v.pts += 1; }
    });
    return Object.values(stats).sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts;
      const difA = a.gf - a.gc, difB = b.gf - b.gc;
      if (difB !== difA) return difB - difA;
      return b.gf - a.gf;
    });
  }, [partidos]);

  function nombreJugador(id) {
    return jugadores.find((j) => j.id === id)?.nombre || '—';
  }

  // --- Equipo ideal de la fecha: mejor combinación posible bajo las mismas reglas ---
  function partidoDe(equipo) {
    return partidos.find((p) => p.jornada === jornada && (p.local === equipo || p.visitante === equipo));
  }

  function puntosDe(jugadorId, equipo) {
    const partido = partidoDe(equipo);
    if (!partido || !stats) return 0;
    const s = stats.find((st) => st.partido_id === partido.id && st.jugador_id === jugadorId);
    return Number(s?.puntos ?? 0);
  }

  const equipoIdeal = useMemo(() => {
    const equipos = [...equiposEnJuego];
    if (!equipos.length) return null;

    // candidato por puesto y equipo (según alineación real de la fecha)
    const candidato = {};
    for (const puesto of [1, 2, 3, 4]) {
      candidato[puesto] = {};
      for (const equipo of equipos) {
        const row = alineaciones.find((a) => a.jornada === jornada && a.equipo === equipo && a.puesto === puesto);
        if (row?.jugador_id) {
          const jugador = jugadores.find((j) => j.id === row.jugador_id);
          if (jugador) candidato[puesto][equipo] = { jugador, puntos: puntosDe(jugador.id, equipo) };
        }
      }
    }

    let mejor = null;
    function buscar(puesto, elegido, counts, sum) {
      if (puesto > 4) {
        const puntosElegidos = Object.values(elegido).map((e) => e.puntos);
        const bonus = puntosElegidos.length ? Math.max(...puntosElegidos) : 0;
        const total = sum + bonus;
        if (!mejor || total > mejor.total) {
          mejor = { elegido: { ...elegido }, total };
        }
        return;
      }
      for (const equipo of Object.keys(candidato[puesto])) {
        if ((counts[equipo] || 0) >= maxPorEquipo) continue;
        elegido[puesto] = { equipo, ...candidato[puesto][equipo] };
        counts[equipo] = (counts[equipo] || 0) + 1;
        buscar(puesto + 1, elegido, counts, sum + candidato[puesto][equipo].puntos);
        counts[equipo] -= 1;
        delete elegido[puesto];
      }
    }
    buscar(1, {}, {}, 0);
    return mejor;
  }, [equiposEnJuego, alineaciones, jugadores, stats, partidos, jornada, maxPorEquipo]);

  const miPuntaje = useMemo(() => {
    if (!misSlots) return 0;
    return [1, 2, 3, 4].reduce((sum, p) => {
      const slot = misSlots[p];
      if (!slot) return sum;
      const pts = puntosDe(slot.id ?? slot.jugador_id, slot.equipo);
      return sum + (miCapitan === p ? pts * 2 : pts);
    }, 0);
  }, [misSlots, miCapitan, stats, partidos, jornada]);

  const capitanIdealPuesto = equipoIdeal
    ? Object.entries(equipoIdeal.elegido).reduce((best, [puesto, e]) =>
        !best || e.puntos > equipoIdeal.elegido[best].puntos ? puesto : best, null)
    : null;

  return (
    <div className="summary-card">
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'fixture', label: 'Fixture' },
          { id: 'posiciones', label: 'Posiciones' },
          { id: 'alineaciones', label: 'Alineaciones' },
          { id: 'ideal', label: 'Equipo ideal' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: '6px 4px',
              fontSize: 12,
              fontWeight: 700,
              borderRadius: 4,
              border: 'none',
              background: tab === t.id ? 'var(--gold-bright)' : 'rgba(246,241,228,0.1)',
              color: tab === t.id ? 'var(--navy)' : 'var(--ivory)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'fixture' && (
        <div>
          {jornadas.map((j) => (
            <div key={j} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--gold-bright)', marginBottom: 6 }}>
                {j.toUpperCase()}
              </div>
              {partidos.filter((p) => p.jornada === j).map((p) => (
                <div key={p.id} className="summary-row" style={{ fontSize: 13 }}>
                  <span>{p.local}</span>
                  <span style={{ fontWeight: 700 }}>
                    {p.goles_local != null ? `${p.goles_local} - ${p.goles_visitante}` : 'vs'}
                  </span>
                  <span>{p.visitante}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {tab === 'posiciones' && (
        <div>
          <div className="summary-row meta" style={{ fontSize: 11 }}>
            <span style={{ flex: 1 }}>Equipo</span>
            <span style={{ width: 26, textAlign: 'center' }}>PJ</span>
            <span style={{ width: 26, textAlign: 'center' }}>DIF</span>
            <span style={{ width: 26, textAlign: 'center' }}>PTS</span>
          </div>
          {tabla.map((t, i) => (
            <div key={t.equipo} className="summary-row" style={{ fontSize: 13 }}>
              <span style={{ flex: 1 }}>{i + 1}. {t.equipo}</span>
              <span style={{ width: 26, textAlign: 'center' }}>{t.pj}</span>
              <span style={{ width: 26, textAlign: 'center' }}>{t.gf - t.gc}</span>
              <span style={{ width: 26, textAlign: 'center', color: 'var(--gold-bright)', fontWeight: 700 }}>{t.pts}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'alineaciones' && (
        <div>
          {[...equiposEnJuego].map((equipo) => (
            <div key={equipo} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.06em', color: 'var(--gold-bright)', marginBottom: 6 }}>
                {equipo.toUpperCase()}
              </div>
              {[1, 2, 3, 4].map((puesto) => {
                const row = alineaciones.find(
                  (a) => a.jornada === jornada && a.equipo === equipo && a.puesto === puesto
                );
                return (
                  <div key={puesto} className="summary-row" style={{ fontSize: 13 }}>
                    <span className="meta">Puesto {puesto}</span>
                    <span>{row?.jugador_id ? nombreJugador(row.jugador_id) : '—'}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {tab === 'ideal' && (
        <div>
          {!equipoIdeal ? (
            <div className="summary-row empty">Todavía no hay datos suficientes para esta fecha.</div>
          ) : (
            <>
              {[1, 2, 3, 4].map((puesto) => {
                const e = equipoIdeal.elegido[puesto];
                const esCapitanIdeal = String(capitanIdealPuesto) === String(puesto);
                return (
                  <div className="summary-row" key={puesto} style={{ fontSize: 13 }}>
                    <div>
                      <div className="name">
                        {e ? e.jugador.nombre : '—'}{esCapitanIdeal ? ' (C)' : ''}
                      </div>
                      {e && <div className="meta">{e.equipo}</div>}
                    </div>
                    <div style={{ color: 'var(--gold-bright)', fontWeight: 700 }}>{e ? e.puntos : 0}</div>
                  </div>
                );
              })}
              <div className="summary-total">
                <span>Puntaje ideal</span>
                <span>{equipoIdeal.total}</span>
              </div>
              <div className="summary-total" style={{ borderTop: 'none', paddingTop: 0, marginTop: 4 }}>
                <span>Tu puntaje</span>
                <span>{miPuntaje}</span>
              </div>
              <div style={{ fontSize: 12, marginTop: 8, textAlign: 'right', color: 'var(--gold-bright)' }}>
                {miPuntaje >= equipoIdeal.total
                  ? '¡Armaste el equipo ideal!'
                  : `Te faltaron ${equipoIdeal.total - miPuntaje} puntos vs. el ideal.`}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
