export interface SportDefinition {
  id: string;
  name: string;
  icon: string;
  scoreLabel: string;       // "Gol", "Punto", "Canasta"
  scoreLabelPlural: string; // "Goles", "Puntos", "Canastas"
  defaultDuration: number;  // seconds
  color: string;            // accent color for UI
}

export const SPORTS: SportDefinition[] = [
  { id: 'hockey', name: 'Hockey', icon: '🏑', scoreLabel: 'Gol', scoreLabelPlural: 'Goles', defaultDuration: 600, color: '#2563eb' },
  { id: 'futsal', name: 'Fútbol Sala', icon: '⚽', scoreLabel: 'Gol', scoreLabelPlural: 'Goles', defaultDuration: 1200, color: '#16a34a' },
  { id: 'basketball', name: 'Baloncesto', icon: '🏀', scoreLabel: 'Punto', scoreLabelPlural: 'Puntos', defaultDuration: 600, color: '#ea580c' },
  { id: 'handball', name: 'Balonmano', icon: '🤾', scoreLabel: 'Gol', scoreLabelPlural: 'Goles', defaultDuration: 1200, color: '#7c3aed' },
  { id: 'volleyball', name: 'Voleibol', icon: '🏐', scoreLabel: 'Punto', scoreLabelPlural: 'Puntos', defaultDuration: 0, color: '#0891b2' },
  { id: 'other', name: 'Otro', icon: '🏆', scoreLabel: 'Punto', scoreLabelPlural: 'Puntos', defaultDuration: 600, color: '#64748b' },
];

export const getSport = (id: string) => SPORTS.find(s => s.id === id) || SPORTS[0];
