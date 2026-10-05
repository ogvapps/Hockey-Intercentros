import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MatchRecord, Category } from '../types';
import { formatTime } from '../utils/time';
import { Timer, Activity, Trophy } from 'lucide-react';
import { getTeamByName } from '../utils/match';

interface LiveScoreBarProps {
  matches: MatchRecord[];
  onTeamClick: (teamName: string, category: Category, match: MatchRecord) => void;
}

interface LiveMatchItemProps {
  match: MatchRecord;
  onClick: () => void;
}

const LiveMatchItem: React.FC<LiveMatchItemProps> = ({ match, onClick }) => {
  const [displayTime, setDisplayTime] = useState<number | null>(match.currentTime ?? null);

  useEffect(() => {
    if (match.currentTime !== undefined) {
      setDisplayTime(match.currentTime);
    }
  }, [match.currentTime, match.id]);

  useEffect(() => {
    if (displayTime === 0) {
      import('../utils/audio').then(m => m.playWhistle());
    }
  }, [displayTime]);

  useEffect(() => {
    let interval: any;
    if (match.timerRunning && displayTime !== null && displayTime > 0) {
      interval = setInterval(() => {
        setDisplayTime(prev => (prev !== null && prev > 0) ? prev - 1 : prev);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [match.timerRunning, match.id, displayTime]);

  const isMasculino = match.category === 'masculino';
  const categoryColor = isMasculino ? 'border-blue-500/50 bg-blue-500/5' : 'border-purple-500/50 bg-purple-500/5';
  const accentColor = isMasculino ? 'text-blue-400' : 'text-purple-400';

  return (
    <div 
      onClick={onClick}
      className={`w-full border-b last:border-b-0 border-white/5 ${categoryColor} cursor-pointer hover:bg-white/5 transition-colors active:scale-[0.99]`}
    >
      <div className="max-w-4xl mx-auto px-2 py-2 md:px-4 md:py-2 flex items-center justify-between gap-2 md:gap-4">
        {/* Live Indicator */}
        <div className="flex items-center gap-1.5 shrink-0 min-w-[35px] md:min-w-[50px]">
          <div className="relative flex h-1.5 w-1.5 md:h-2 md:w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 md:h-2 md:w-2 bg-red-500"></span>
          </div>
          <span className={`text-[8px] md:text-[9px] font-black uppercase tracking-widest ${accentColor}`}>
            {isMasculino ? 'Masc' : 'Fem'}
          </span>
        </div>

        {/* Score & Teams */}
        <div className="flex-1 flex items-center justify-center gap-1.5 md:gap-6 min-w-0">
          <div className="flex-1 flex items-center justify-end gap-2 min-w-0">
            <span 
              className="text-[10px] md:text-sm font-black truncate text-right leading-none uppercase tracking-tighter"
              style={{ 
                color: getTeamByName(match.team1)?.color ?? 'white',
                textShadow: '0 0 10px rgba(0,0,0,0.5)'
              }}
            >
              {match.team1.replace('Colegio ', 'Col. ')}
            </span>
            <span className="bg-white/10 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md md:rounded-lg font-black text-xs md:text-lg tabular-nums min-w-[1.2rem] md:min-w-[1.5rem] text-center">
              {match.score1}
            </span>
          </div>
          
          <div className="flex flex-col items-center shrink-0 px-2 border-x border-white/5 min-w-[55px] md:min-w-[80px]">
            <div className={`flex items-center gap-1 font-bold tabular-nums ${match.timerRunning ? 'text-natural-primary' : 'text-orange-400'}`}>
              <Timer className={`w-2.5 h-2.5 md:w-3 md:h-3 ${match.timerRunning ? 'animate-pulse' : ''}`} />
              <span className="text-[11px] md:text-base font-serif italic">
                {displayTime !== null ? formatTime(displayTime) : '--:--'}
              </span>
            </div>
            <span className="text-[7px] md:text-[8px] uppercase tracking-widest opacity-40 font-black">
              {match.group === 'PLAYOFF' ? 'Playoff' : `G. ${match.group}`}
            </span>
          </div>

          <div className="flex-1 flex items-center justify-start gap-2 min-w-0">
            <span className="bg-white/10 px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-md md:rounded-lg font-black text-xs md:text-lg tabular-nums min-w-[1.2rem] md:min-w-[1.5rem] text-center">
              {match.score2}
            </span>
            <span 
              className="text-[10px] md:text-sm font-black truncate leading-none uppercase tracking-tighter"
              style={{ 
                color: getTeamByName(match.team2)?.color ?? 'white',
                textShadow: '0 0 10px rgba(0,0,0,0.5)'
              }}
            >
              {match.team2.replace('Colegio ', 'Col. ')}
            </span>
          </div>
        </div>

        {/* Activity Icon */}
        <div className="flex items-center gap-1 shrink-0 opacity-40 sm:opacity-60">
          <Activity className={`w-3 h-3 md:w-4 md:h-4 ${accentColor}`} />
        </div>
      </div>
    </div>
  );
};

export const LiveScoreBar: React.FC<LiveScoreBarProps> = ({ matches, onTeamClick }) => {
  const allLive = matches
    .filter(m => m.isLive)
    .sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));

  const mascMatch = allLive.find(m => m.category === 'masculino');
  const femMatch = allLive.find(m => m.category === 'femenino');
  
  const displayMatches = [mascMatch, femMatch].filter(Boolean) as MatchRecord[];

  if (displayMatches.length === 0) return null;

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      className="bg-[#0f120f] text-white overflow-hidden border-b border-natural-primary/30 z-[60] sticky top-0"
    >
      <AnimatePresence mode="popLayout">
        {displayMatches.map(match => (
          <motion.div 
            key={match.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <LiveMatchItem 
              match={match} 
              onClick={() => onTeamClick(match.team1, match.category, match)} 
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};
