import React from 'react';

// Coordenadas de cada cajita en el viewBox 500x900 del SVG de la cancha,
// expresadas como porcentaje para poder superponer botones HTML reales
// (más accesible que texto SVG puro) sobre el fondo.
const SLOT_BOXES = [
  { puesto: 1, top: 16.7, left: 30, width: 40, height: 8.0 },
  { puesto: 2, top: 37.7, left: 30, width: 40, height: 8.0 },
  { puesto: 3, top: 54.3, left: 30, width: 40, height: 8.0 },
  { puesto: 4, top: 75.3, left: 30, width: 40, height: 8.0 },
];

const FIELD_SVG = `
<svg viewBox="0 0 500 900" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#5aa93f"/>
      <stop offset="100%" stop-color="#4f9738"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="500" height="900" fill="url(#grass)"/>
  <g opacity="0.12">
    <rect x="0" y="0" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="90" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="180" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="270" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="360" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="450" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="540" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="630" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="720" width="500" height="45" fill="#ffffff"/>
    <rect x="0" y="810" width="500" height="45" fill="#ffffff"/>
  </g>
  <rect x="30" y="30" width="440" height="840" fill="none" stroke="#ffffff" stroke-width="4"/>
  <line x1="30" y1="30" x2="470" y2="30" stroke="#ffffff" stroke-width="4"/>
  <line x1="30" y1="870" x2="470" y2="870" stroke="#ffffff" stroke-width="4"/>
  <line x1="30" y1="450" x2="470" y2="450" stroke="#ffffff" stroke-width="2" stroke-dasharray="10,8"/>
  <line x1="30" y1="180" x2="470" y2="180" stroke="#f4d03f" stroke-width="2.5"/>
  <line x1="30" y1="720" x2="470" y2="720" stroke="#f4d03f" stroke-width="2.5"/>
  <line x1="30" y1="315" x2="470" y2="315" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.7"/>
  <line x1="30" y1="585" x2="470" y2="585" stroke="#ffffff" stroke-width="1.5" stroke-dasharray="4,6" opacity="0.7"/>
  <g stroke="#ffffff" stroke-width="5" stroke-linecap="round">
    <line x1="190" y1="10" x2="190" y2="30"/>
    <line x1="310" y1="10" x2="310" y2="30"/>
  </g>
  <g stroke="#ffffff" stroke-width="5" stroke-linecap="round">
    <line x1="190" y1="870" x2="190" y2="890"/>
    <line x1="310" y1="870" x2="310" y2="890"/>
  </g>
  <circle cx="250" cy="450" r="3" fill="#ffffff"/>
</svg>
`;

export default function PoloField({ slots, onSlotClick }) {
  return (
    <div className="field-wrap">
      <div dangerouslySetInnerHTML={{ __html: FIELD_SVG }} />
      {SLOT_BOXES.map((box) => {
        const filled = slots[box.puesto];
        return (
          <button
            key={box.puesto}
            className="slot-hit"
            style={{
              top: `${box.top}%`,
              left: `${box.left}%`,
              width: `${box.width}%`,
              height: `${box.height}%`,
              background: 'rgba(13, 27, 61, 0.88)',
              border: '2px solid #f4d03f',
              color: '#fff',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: '4px 8px',
            }}
            onClick={() => onSlotClick(box.puesto)}
          >
            <span style={{ fontSize: '11px', color: '#f4d03f', fontWeight: 700, letterSpacing: '0.03em' }}>
              PUESTO {box.puesto}
            </span>
            {filled ? (
              <>
                <span style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(12px, 2.4vw, 15px)', fontWeight: 600, lineHeight: 1.15, textAlign: 'center' }}>
                  {filled.nombre}
                </span>
                <span style={{ fontSize: '10px', color: '#c9d3e6' }}>
                  {filled.equipo} · hcp {filled.hcp}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#c9d3e6', fontStyle: 'italic' }}>Elegir jugador</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
