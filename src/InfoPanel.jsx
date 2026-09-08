import React, { useMemo, useState } from 'react';

const EQUIPOS = ['La Fe', 'La Irenita', 'Don Ercole', 'La Natividad La Dolfina', 'Las Monjitas'];

export default function InfoPanel({ partidos, jugadores, alineaciones, jornada, equiposEnJuego }) {
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

  return (
    <div className="summary-card">
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'fixture', label: 'Fixture' },
          { id: 'posiciones', label: 'Posiciones' },
          { id: 'alineaciones', label: 'Alineaciones' },
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
    </div>
  );
}
