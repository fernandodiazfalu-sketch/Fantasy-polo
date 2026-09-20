import React from 'react';

export default function Avatar({ jugador, size = 32 }) {
  const iniciales = jugador?.nombre
    ? jugador.nombre.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const baseStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    objectFit: 'cover',
    border: '1px solid rgba(13,27,61,0.15)',
  };

  if (jugador?.foto) {
    return <img src={jugador.foto} alt={jugador.nombre} style={baseStyle} />;
  }

  return (
    <div
      style={{
        ...baseStyle,
        background: 'var(--ivory-dim)',
        color: 'var(--navy)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.38,
        fontWeight: 700,
      }}
    >
      {iniciales}
    </div>
  );
}
