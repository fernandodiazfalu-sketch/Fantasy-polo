import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import PoloField from './PoloField';

export default function TeamBuilder({ session }) {
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [alineaciones, setAlineaciones] = useState([]);
  const [jornada, setJornada] = useState('Fecha 1');
  const [slots, setSlots] = useState({}); // { [puesto]: jugador }
  const [openPuesto, setOpenPuesto] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ text: '', error: false });
  const [saving, setSaving] = useState(false);

  const apodo = session.user.user_metadata?.apodo || session.user.email;

  useEffect(() => {
    async function load() {
      const [{ data: jData }, { data: pData }, { data: aData }] = await Promise.all([
        supabase.from('polo_jugadores').select('*').order('equipo').order('puesto'),
        supabase.from('polo_partidos').select('*').order('id'),
        supabase.from('polo_alineaciones').select('*'),
      ]);
      setJugadores(jData || []);
      setPartidos(pData || []);
      setAlineaciones(aData || []);
    }
    load();
  }, []);

  // Equipos reales que juegan en la jornada seleccionada
  const equiposEnJuego = useMemo(() => {
    const set = new Set();
    partidos
      .filter((p) => p.jornada === jornada)
      .forEach((p) => {
        set.add(p.local);
        set.add(p.visitante);
      });
    return set;
  }, [partidos, jornada]);

  // Excepción de Fecha 1: solo 2 equipos en juego -> se permiten hasta 2 jugadores por equipo
  const maxPorEquipo = equiposEnJuego.size <= 2 ? 2 : 1;

  // Cargar equipo fantasy ya guardado para esta jornada, si existe
  useEffect(() => {
    async function loadSaved() {
      setSlots({});
      const { data } = await supabase
        .from('polo_fantasy_equipos')
        .select('slots')
        .eq('user_id', session.user.id)
        .eq('jornada', jornada)
        .maybeSingle();
      if (data?.slots?.length) {
        const bySlot = {};
        data.slots.forEach((s) => { bySlot[s.puesto] = s; });
        setSlots(bySlot);
      }
    }
    if (jugadores.length) loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornada, jugadores.length]);

  function conteoPorEquipo(excluyendoPuesto) {
    const counts = {};
    Object.entries(slots).forEach(([puesto, j]) => {
      if (Number(puesto) === excluyendoPuesto) return;
      counts[j.equipo] = (counts[j.equipo] || 0) + 1;
    });
    return counts;
  }

  // La lista elegible sale de la alineación cargada para esta fecha (no del plantel fijo),
  // así respeta los cambios que hayas hecho en la pantalla de Alineaciones.
  function jugadoresElegibles(puesto) {
    const counts = conteoPorEquipo(puesto);
    const idsJugador = alineaciones
      .filter((a) => a.jornada === jornada && a.puesto === puesto && equiposEnJuego.has(a.equipo) && a.jugador_id)
      .map((a) => a.jugador_id);
    return jugadores
      .filter((j) => idsJugador.includes(j.id))
      .map((j) => ({
        ...j,
        disabled: (counts[j.equipo] || 0) >= maxPorEquipo,
      }));
  }

  function elegirJugador(puesto, jugador) {
    setSlots((prev) => ({ ...prev, [puesto]: jugador }));
    setOpenPuesto(null);
    setSaveStatus({ text: '', error: false });
  }

  const equipoCompleto = [1, 2, 3, 4].every((p) => slots[p]);
  const totalHcp = [1, 2, 3, 4].reduce((sum, p) => sum + (slots[p]?.hcp || 0), 0);

  async function guardarEquipo() {
    if (!equipoCompleto) return;
    setSaving(true);
    setSaveStatus({ text: '', error: false });
    const slotsArray = [1, 2, 3, 4].map((p) => ({
      puesto: p,
      jugador_id: slots[p].id,
      nombre: slots[p].nombre,
      equipo: slots[p].equipo,
      hcp: slots[p].hcp,
    }));
    const { error } = await supabase.from('polo_fantasy_equipos').upsert(
      {
        user_id: session.user.id,
        email: session.user.email,
        apodo,
        jornada,
        slots: slotsArray,
      },
      { onConflict: 'user_id,jornada' }
    );
    setSaving(false);
    if (error) {
      setSaveStatus({ text: 'No se pudo guardar. Probá de nuevo.', error: true });
    } else {
      setSaveStatus({ text: 'Equipo guardado.', error: false });
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  const jornadasDisponibles = ['Fecha 1', 'Fecha 2', 'Fecha 3'];

  return (
    <div className="app-shell">
      <header className="masthead">
        <div>
          <h1>Fantasy Polo</h1>
          <div className="subtitle">61° Abierto del Jockey Club · Copa Éminent</div>
        </div>
        <div className="user-chip">
          {apodo}
          <button onClick={cerrarSesion}>Cerrar sesión</button>
        </div>
      </header>

      <div className="jornada-tabs">
        {jornadasDisponibles.map((j) => (
          <button
            key={j}
            className={j === jornada ? 'active' : ''}
            onClick={() => setJornada(j)}
          >
            {j}
          </button>
        ))}
      </div>

      <p className="jornada-note">
        {equiposEnJuego.size <= 2
          ? 'Solo juegan 2 equipos esta fecha: podés elegir hasta 2 jugadores del mismo equipo.'
          : 'Máximo 1 jugador por equipo real en esta fecha.'}
      </p>

      <div className="builder-layout">
        <PoloField slots={slots} onSlotClick={setOpenPuesto} />

        <div className="side-panel">
          <div className="summary-card">
            <h2>Tu equipo — {jornada}</h2>
            {[1, 2, 3, 4].map((p) => (
              <div className="summary-row" key={p}>
                <div>
                  <div className={slots[p] ? 'name' : 'empty'}>
                    {slots[p] ? slots[p].nombre : `Puesto ${p} — sin elegir`}
                  </div>
                  {slots[p] && <div className="meta">{slots[p].equipo}</div>}
                </div>
                {slots[p] && <div>{slots[p].hcp}</div>}
              </div>
            ))}
            <div className="summary-total">
              <span>Hándicap total</span>
              <span>{totalHcp}</span>
            </div>
          </div>

          <button
            className="primary-btn"
            disabled={!equipoCompleto || saving}
            onClick={guardarEquipo}
          >
            {saving ? 'Guardando...' : 'Guardar equipo'}
          </button>
          <div className={`save-status ${saveStatus.error ? 'error' : ''}`}>{saveStatus.text}</div>
        </div>
      </div>

      {openPuesto && (
        <div className="modal-backdrop" onClick={() => setOpenPuesto(null)}>
          <div className="picker-card" onClick={(e) => e.stopPropagation()}>
            <h3>Puesto {openPuesto}</h3>
            <p className="picker-sub">Elegí un jugador que juegue este puesto en su equipo.</p>
            {jugadoresElegibles(openPuesto).map((j) => (
              <button
                key={j.id}
                className="player-option"
                disabled={j.disabled}
                onClick={() => elegirJugador(openPuesto, j)}
              >
                <span>
                  <span className="p-name">{j.nombre}</span>
                  <br />
                  <span className="p-team">{j.equipo}{j.disabled ? ' · equipo completo' : ''}</span>
                </span>
                <span className="p-hcp">{j.hcp}</span>
              </button>
            ))}
            <button className="picker-close" onClick={() => setOpenPuesto(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
