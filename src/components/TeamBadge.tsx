import React from 'react';
import { Team } from '../types';

interface TeamBadgeProps {
  team: Team | undefined;
  showName?: boolean;
  fallback?: string;
  reverse?: boolean;
  interactive?: boolean;
  onTeamClick?: (teamName: string) => void;
}

export const TeamBadge: React.FC<TeamBadgeProps> = ({
  team,
  showName = true,
  fallback = "Por definir",
  reverse = false,
  interactive = true,
  onTeamClick,
}) => {
  if (!team) {
    return (
      <div className={`text-natural-text/50 italic px-1 text-xs md:text-sm truncate ${reverse ? 'text-right' : 'text-left'}`}>
        {fallback}
      </div>
    );
  }

  const isClickable = interactive && !!onTeamClick;

  const displayName = team.name
    .replace('Colegio', 'Col.')
    .replace(/^Virgen del Puerto$/, 'IES Virgen del Puerto')
    .replace(/^San Calixto$/, 'Col. San Calixto')
    .replace(/^Monfragüe$/, 'IES Monfragüe');

  return (
    <div
      onClick={() => isClickable && onTeamClick?.(team.name)}
      className={`flex items-center gap-1.5 md:gap-2 min-w-0 ${reverse ? 'flex-row-reverse' : 'flex-row'} ${
        isClickable 
          ? 'cursor-pointer hover:scale-[1.04] active:scale-[0.97] hover:opacity-90 transition-all duration-200' 
          : ''
      }`}
      title={isClickable ? `Ver calendario de ${displayName}` : displayName}
    >
      <div
        className={`w-3 h-3 md:w-4 md:h-4 shrink-0 rounded-full border border-natural-border shadow-sm transition-transform duration-300 ${
          team.name === 'IESO Galisteo' ? 'bg-white' : ''
        } ${isClickable ? 'group-hover:scale-110' : ''}`}
        style={{ backgroundColor: team.color }}
      />
      {showName && (
        <span
          className={`font-semibold text-natural-text text-[11px] sm:text-xs md:text-sm leading-tight truncate ${reverse ? 'text-right' : 'text-left'} ${
            isClickable ? 'hover:text-natural-primary transition-colors' : ''
          }`}
        >
          {displayName}
        </span>
      )}
    </div>
  );
};
