import React, { useMemo } from 'react';

const EMOJIS = ['🏑', '⚽', '🏀', '🏐', '🥅', '🏆', '⭐', '🔥'];

interface Particle {
  id: number;
  emoji: string;
  left: string;
  top: string;
  size: number;
  duration: string;
  delay: string;
  opacity: number;
}

export const HeroParticles: React.FC = () => {
  const particles = useMemo<Particle[]>(() =>
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      emoji: EMOJIS[i % EMOJIS.length],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: 14 + Math.random() * 18,
      duration: `${5 + Math.random() * 8}s`,
      delay: `${Math.random() * 5}s`,
      opacity: 0.08 + Math.random() * 0.12,
    }))
  , []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden>
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute animate-float-particle"
          style={{
            left: p.left,
            top: p.top,
            fontSize: p.size,
            opacity: p.opacity,
            '--duration': p.duration,
            '--delay': p.delay,
          } as React.CSSProperties}
        >
          {p.emoji}
        </span>
      ))}
    </div>
  );
};
