import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import TeamBuilder from './TeamBuilder';
import Alineaciones from './Alineaciones';
import Clasificacion from './Clasificacion';
import Estadisticas from './Estadisticas';
import { isAdmin } from './adminConfig';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('equipo'); // 'equipo' | 'alineaciones' | 'clasificacion' | 'estadisticas'
  const [torneos, setTorneos] = useState([]);
  const [torneo, setTorneo] = useState(() => localStorage.getItem('polo_torneo_actual') || '');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    async function loadTorneos() {
      const { data } = await supabase.from('polo_torneos').select('*').order('orden');
      setTorneos(data || []);
      if (data?.length && !data.some((t) => t.nombre === torneo)) {
        setTorneo(data[0].nombre);
      }
    }
    loadTorneos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cambiarTorneo(nombre) {
    setTorneo(nombre);
    localStorage.setItem('polo_torneo_actual', nombre);
  }

  if (loading) return null;
  if (!session) return <Auth />;

  const admin = isAdmin(session);

  return (
    <>
      {torneos.length > 0 && (
        <div
          style={{
            background: 'var(--ivory-dim)',
            borderBottom: '2px solid var(--navy)',
            padding: '10px 20px',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 13, color: 'var(--turf-deep)', marginRight: 4 }}>
            Torneo:
          </span>
          {torneos.map((t) => (
            <button
              key={t.id}
              onClick={() => cambiarTorneo(t.nombre)}
              style={{
                background: torneo === t.nombre ? 'var(--navy)' : 'transparent',
                color: torneo === t.nombre ? 'var(--gold-bright)' : 'var(--navy)',
                border: '1px solid var(--navy)',
                borderRadius: 999,
                padding: '5px 14px',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      )}

      <nav
        style={{
          background: 'var(--navy)',
          padding: '10px 20px',
          display: 'flex',
          gap: 10,
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          { id: 'equipo', label: 'Mi equipo' },
          ...(admin ? [{ id: 'alineaciones', label: 'Alineaciones' }] : []),
          { id: 'clasificacion', label: 'Clasificación' },
          { id: 'estadisticas', label: 'Estadísticas' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            style={{
              background: view === tab.id ? 'var(--gold-bright)' : 'transparent',
              color: view === tab.id ? 'var(--navy)' : 'var(--ivory)',
              border: '1px solid rgba(246,241,228,0.3)',
              borderRadius: 999,
              padding: '6px 16px',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {tab.label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ color: 'var(--ivory)', fontSize: 12, opacity: 0.8 }}>{session.user.email}</span>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{ background: 'none', border: 'none', color: 'var(--gold-bright)', textDecoration: 'underline', fontSize: 12 }}
          >
            Cerrar sesión
          </button>
        </div>
      </nav>

      {torneo && view === 'equipo' && <TeamBuilder session={session} torneo={torneo} />}
      {torneo && view === 'alineaciones' && admin && <Alineaciones torneo={torneo} />}
      {torneo && view === 'clasificacion' && <Clasificacion torneo={torneo} />}
      {torneo && view === 'estadisticas' && <Estadisticas torneo={torneo} />}
    </>
  );
}
