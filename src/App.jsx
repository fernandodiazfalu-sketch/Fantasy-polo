import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import TeamBuilder from './TeamBuilder';
import Alineaciones from './Alineaciones';
import Clasificacion from './Clasificacion';
import { isAdmin } from './adminConfig';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('equipo'); // 'equipo' | 'alineaciones' | 'clasificacion'

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

  if (loading) return null;
  if (!session) return <Auth />;

  const admin = isAdmin(session);

  return (
    <>
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

      {view === 'equipo' && <TeamBuilder session={session} />}
      {view === 'alineaciones' && admin && <Alineaciones />}
      {view === 'clasificacion' && <Clasificacion />}
    </>
  );
}
