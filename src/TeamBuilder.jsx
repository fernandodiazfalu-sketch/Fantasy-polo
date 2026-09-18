import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';
import PoloField from './PoloField';
import InfoPanel from './InfoPanel';

export default function TeamBuilder({ session }) {
  const [jugadores, setJugadores] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [alineaciones, setAlineaciones] = useState([]);
  const [stats, setStats] = useState([]);
  const [jornada, setJornada] = useState('Fecha 1');
  const [slots, setSlots] = useState({}); // { [puesto]: jugador }
  const [capitan, setCapitan] = useState(null); // puesto (1-4) del capitán
  const [todosEquipos, setTodosEquipos] = useState([]); // todos los equipos fantasy guardados, de todos los usuarios
  const [viendoRival, setViendoRival] = useState(null); // user_id del rival que se está mirando, o null = el propio
  const [openPuesto, setOpenPuesto] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ text: '', error: false });
  const [saving, setSaving] = useState(false);

  const apodo = session.user.user_metadata?.apodo || session.user.email;

  useEffect(() => {
    async function load() {
      const [{ data: jData }, { data: pData }, { data: aData }, { data: sData }, { data: eData }] = await Promise.all([
        supabase.from('polo_jugadores').select('*').order('equipo').order('puesto'),
        supabase.from('polo_partidos').select('*').order('id'),
        supabase.from('polo_alineaciones').select('*'),
        supabase.from('polo_stats').select('*'),
        supabase.from('polo_fantasy_equipos').select('*'),
      ]);
      setJugadores(jData || []);
      setPartidos(pData || []);
      setAlineaciones(aData || []);
      setStats(sData || []);
      setTodosEquipos(eData || []);
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
      setCapitan(null);
      setViendoRival(null);
      const { data } = await supabase
        .from('polo_fantasy_equipos')
        .select('slots, capitan_puesto')
        .eq('user_id', session.user.id)
        .eq('jornada', jornada)
        .maybeSingle();
      if (data?.slots?.length) {
        const bySlot = {};
        data.slots.forEach((s) => { bySlot[s.puesto] = { ...s, id: s.jugador_id }; });
        setSlots(bySlot);
      }
      if (data?.capitan_puesto) setCapitan(data.capitan_puesto);
    }
    if (jugadores.length) loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jornada, jugadores.length]);

  // Una fecha se considera "cerrada" cuando todos sus partidos ya tienen resultado cargado.
  // Recién ahí se pueden ver los equipos de los rivales (para no filtrar picks antes de tiempo).
  const jornadaCerrada = useMemo(() => {
    const partidosDeLaFecha = partidos.filter((p) => p.jornada === jornada);
    return partidosDeLaFecha.length > 0 && partidosDeLaFecha.every((p) => p.goles_local != null && p.goles_visitante != null);
  }, [partidos, jornada]);

  const rivales = useMemo(
    () => todosEquipos.filter((e) => e.jornada === jornada && e.user_id !== session.user.id),
    [todosEquipos, jornada, session.user.id]
  );

  // PV (puntos fantasy) acumulados de cada jugador en lo que va del torneo, para mostrar en el selector
  const statsPorJugador = useMemo(() => {
    const acc = {};
    stats.forEach((s) => {
      if (!acc[s.jugador_id]) acc[s.jugador_id] = { pj: 0, total: 0 };
      acc[s.jugador_id].pj += 1;
      acc[s.jugador_id].total += Number(s.puntos ?? 0);
    });
    return acc;
  }, [stats]);

  const rivalSeleccionado = rivales.find((r) => r.user_id === viendoRival) || null;

  const slotsRival = useMemo(() => {
    if (!rivalSeleccionado?.slots) return {};
    const bySlot = {};
    rivalSeleccionado.slots.forEach((s) => { bySlot[s.puesto] = { ...s, id: s.jugador_id }; });
    return bySlot;
  }, [rivalSeleccionado]);

  function puntosDeJugadorEnFecha(jugadorId, equipoReal) {
    const partido = partidos.find((p) => p.jornada === jornada && (p.local === equipoReal || p.visitante === equipoReal));
    if (!partido) return 0;
    const s = stats.find((st) => st.partido_id === partido.id && st.jugador_id === jugadorId);
    return Number(s?.puntos ?? 0);
  }

  const puntosRival = useMemo(() => {
    if (!rivalSeleccionado) return 0;
    return (rivalSeleccionado.slots || []).reduce((sum, s) => {
      const pts = puntosDeJugadorEnFecha(s.jugador_id, s.equipo);
      return sum + (rivalSeleccionado.capitan_puesto === s.puesto ? pts * 2 : pts);
    }, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rivalSeleccionado, stats, partidos, jornada]);

  const fieldSlots = viendoRival ? slotsRival : slots;
  const fieldCapitan = viendoRival ? rivalSeleccionado?.capitan_puesto ?? null : capitan;

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

  function quitarJugador(puesto) {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[puesto];
      return next;
    });
    setCapitan((prev) => (prev === puesto ? null : prev));
    setOpenPuesto(null);
    setSaveStatus({ text: '', error: false });
  }

  function toggleCapitan(puesto) {
    setCapitan((prev) => (prev === puesto ? null : puesto));
    setSaveStatus({ text: '', error: false });
  }

  const equipoCompleto = [1, 2, 3, 4].every((p) => slots[p]);
  const capitanElegido = !!capitan && !!slots[capitan];
  const totalHcp = [1, 2, 3, 4].reduce((sum, p) => sum + (slots[p]?.hcp || 0), 0);

  async function guardarEquipo() {
    if (!equipoCompleto || !capitanElegido) return;
    setSaving(true);
    setSaveStatus({ text: '', error: false });
    const slotsArray = [1, 2, 3, 4].map((p) => ({
      puesto: p,
      jugador_id: slots[p].id ?? slots[p].jugador_id,
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
        capitan_puesto: capitan,
      },
      { onConflict: 'user_id,jornada' }
    );
    setSaving(false);
    if (error) {
      setSaveStatus({ text: 'No se pudo guardar. Probá de nuevo.', error: true });
    } else {
      setSaveStatus({ text: 'Equipo guardado.', error: false });
      setTodosEquipos((prev) => {
        const otros = prev.filter((e) => !(e.user_id === session.user.id && e.jornada === jornada));
        return [...otros, { user_id: session.user.id, email: session.user.email, apodo, jornada, slots: slotsArray, capitan_puesto: capitan }];
      });
    }
  }

  async function cerrarSesion() {
    await supabase.auth.signOut();
  }

  const jornadasDisponibles = useMemo(
    () => [...new Set(partidos.map((p) => p.jornada))],
    [partidos]
  );

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
        {' '}Tocá el círculo "C" sobre un jugador elegido para nombrarlo capitán (duplica sus puntos).
      </p>

      {jornadaCerrada && rivales.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <label style={{ fontSize: 13, color: 'var(--navy-soft)', fontWeight: 600 }}>Ver equipo de:</label>
          <select
            value={viendoRival || ''}
            onChange={(e) => setViendoRival(e.target.value || null)}
            style={{ padding: '6px 10px', borderRadius: 4, fontSize: 13 }}
          >
            <option value="">Tu equipo</option>
            {rivales.map((r) => (
              <option key={r.user_id} value={r.user_id}>{r.apodo || r.email}</option>
            ))}
          </select>
          {rivalSeleccionado && (
            <span style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700 }}>
              Puntaje: {puntosRival}
            </span>
          )}
        </div>
      )}

      <div className="builder-layout">
        <PoloField
          slots={fieldSlots}
          onSlotClick={setOpenPuesto}
          capitanPuesto={fieldCapitan}
          onCaptainToggle={toggleCapitan}
          readOnly={!!viendoRival}
        />

        <div className="side-panel">
          <div className="summary-card">
            <h2>Tu equipo — {jornada}</h2>
            {[1, 2, 3, 4].map((p) => (
              <div className="summary-row" key={p}>
                <div>
                  <div className={slots[p] ? 'name' : 'empty'}>
                    {slots[p] ? slots[p].nombre : `Puesto ${p} — sin elegir`}
                    {slots[p] && capitan === p ? ' (C)' : ''}
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
            disabled={!equipoCompleto || !capitanElegido || saving}
            onClick={guardarEquipo}
          >
            {saving ? 'Guardando...' : 'Guardar equipo'}
          </button>
          {equipoCompleto && !capitanElegido && (
            <div className="save-status error">Elegí un capitán antes de guardar.</div>
          )}
          <div className={`save-status ${saveStatus.error ? 'error' : ''}`}>{saveStatus.text}</div>

          <InfoPanel
            partidos={partidos}
            jugadores={jugadores}
            alineaciones={alineaciones}
            jornada={jornada}
            equiposEnJuego={equiposEnJuego}
            stats={stats}
            misSlots={slots}
            miCapitan={capitan}
            maxPorEquipo={maxPorEquipo}
          />
        </div>
      </div>

      {openPuesto && (
        <div className="modal-backdrop" onClick={() => setOpenPuesto(null)}>
          <div className="picker-card" onClick={(e) => e.stopPropagation()}>
            <h3>Puesto {openPuesto}</h3>
            <p className="picker-sub">Elegí un jugador que juegue este puesto en su equipo.</p>
            {slots[openPuesto] && (
              <button
                onClick={() => quitarJugador(openPuesto)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#fff',
                  border: '1px dashed var(--line)',
                  borderRadius: 4,
                  padding: '10px 14px',
                  marginBottom: 8,
                  color: '#b3372c',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                ✕ Quitar jugador de este puesto
              </button>
            )}
            {jugadoresElegibles(openPuesto).map((j) => {
              const st = statsPorJugador[j.id];
              const pj = st?.pj || 0;
              const total = st?.total || 0;
              const promedio = pj ? (total / pj).toFixed(1) : '—';
              return (
                <button
                  key={j.id}
                  className="player-option"
                  disabled={j.disabled}
                  onClick={() => elegirJugador(openPuesto, j)}
                >
                  <span>
                    <span className="p-name">{j.nombre}</span>
                    <br />
                    <span className="p-team">
                      {j.equipo}{j.disabled ? ' · equipo completo' : ''}
                      {' · '}PV {total} ({pj ? `prom. ${promedio}` : 'sin partidos'})
                    </span>
                  </span>
                  <span className="p-hcp">{j.hcp}</span>
                </button>
              );
            })}
            <button className="picker-close" onClick={() => setOpenPuesto(null)}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
