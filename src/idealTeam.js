// Calcula, para una fecha dada, la mejor combinación posible de 4 jugadores (uno por puesto)
// respetando las mismas reglas que el usuario (máximo N jugadores por equipo real),
// maximizando el puntaje total + el bono de capitán (se dobla el de mayor puntaje).
export function calcularEquipoIdeal({ partidos, jugadores, alineaciones, jornada, equiposEnJuego, stats, maxPorEquipo }) {
  const equipos = [...equiposEnJuego];
  if (!equipos.length) return null;

  function partidoDe(equipo) {
    return partidos.find((p) => p.jornada === jornada && (p.local === equipo || p.visitante === equipo));
  }
  function puntosDe(jugadorId, equipo) {
    const partido = partidoDe(equipo);
    if (!partido || !stats) return 0;
    const s = stats.find((st) => st.partido_id === partido.id && st.jugador_id === jugadorId);
    return Number(s?.puntos ?? 0);
  }

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
  if (!mejor) return null;

  const capitanPuesto = Object.entries(mejor.elegido).reduce(
    (best, [puesto, e]) => (!best || e.puntos > mejor.elegido[best].puntos ? puesto : best),
    null
  );
  return { ...mejor, capitanPuesto: capitanPuesto ? Number(capitanPuesto) : null };
}
