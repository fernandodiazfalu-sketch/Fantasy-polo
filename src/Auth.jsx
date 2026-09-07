import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [apodo, setApodo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'signin') {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { apodo } },
        });
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message || 'Ocurrió un error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1>Fantasy Polo</h1>
      <p className="tag">61° Abierto del Jockey Club · Copa Éminent</p>
      <form onSubmit={handleSubmit}>
        {mode === 'signup' && (
          <>
            <label htmlFor="apodo">Cómo te llamamos</label>
            <input
              id="apodo"
              type="text"
              value={apodo}
              onChange={(e) => setApodo(e.target.value)}
              placeholder="Tu apodo en la liga"
              required
            />
          </>
        )}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vos@email.com"
          required
        />
        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          minLength={6}
          required
        />
        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Un momento...' : mode === 'signin' ? 'Ingresar' : 'Crear cuenta'}
        </button>
      </form>
      {error && <p className="error">{error}</p>}
      <p className="switch">
        {mode === 'signin' ? (
          <>¿Todavía no tenés cuenta? <button onClick={() => setMode('signup')}>Registrate</button></>
        ) : (
          <>¿Ya tenés cuenta? <button onClick={() => setMode('signin')}>Ingresá</button></>
        )}
      </p>
    </div>
  );
}
