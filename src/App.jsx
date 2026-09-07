import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Auth from './Auth';
import TeamBuilder from './TeamBuilder';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

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

  return session ? <TeamBuilder session={session} /> : <Auth />;
}
