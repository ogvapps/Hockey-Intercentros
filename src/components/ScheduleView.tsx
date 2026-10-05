import React from 'react';
import { Timer, Play, Edit2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { ScheduleMatch, MatchRecord, Category } from '../types';
import { TeamBadge } from './TeamBadge';
import { isMatchPlayed, getMatchResult, getMatchId } from '../utils/match';

interface ScheduleViewProps {
  schedule: ScheduleMatch[];
  matches: MatchRecord[];
  activeCategory: Category;
  isAdminUser: boolean;
  onTeamClick: (name: string) => void;
  onStartMatch: (t1: string, t2: string, group: string, id: string) => void;
  onUpdateMatchResult: (matchId: string, s1: number, s2: number) => void;
  onDeleteMatch: (matchId: string) => void;
  onResumeMatch: (match: MatchRecord) => void;
  requestPrompt: (title: string, defaultValue: string, onConfirm: (val: string) => void, placeholder?: string) => void;
  requestConfirm: (title: string, message: string, isDestructive: boolean, onConfirm: () => void) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  matches,
  activeCategory,
  isAdminUser,
  onTeamClick,
  onStartMatch,
  onUpdateMatchResult,
  onDeleteMatch,
  onResumeMatch,
  requestPrompt,
}) => {
  // Auto-scroll to next match
  React.useEffect(() => {
    const nextMatch = schedule.find(m => 
      !m.isRestMatch && !isMatchPlayed(matches, activeCategory, m.team1.name, m.team2.name)
    );

    if (nextMatch) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`match-${nextMatch.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300); // Small delay to ensure layout is ready
      return () => clearTimeout(timer);
    }
  }, [activeCategory]); // Re-run when category changes

  const nextMatchId = schedule.find(m => 
    !m.isRestMatch && !isMatchPlayed(matches, activeCategory, m.team1.name, m.team2.name)
  )?.id;

  const rounds = Array.from(new Set(schedule.map(m => m.round))).sort((a: number, b: number) => a - b);

  if (schedule.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="py-20 flex flex-col items-center text-center gap-6 px-4"
        id="schedule-view"
      >
        <div className="w-24 h-24 bg-natural-sidebar rounded-3xl flex items-center justify-center text-natural-primary rotate-3 shadow-xl border border-natural-border/50">
          <Timer className="w-12 h-12 opacity-20" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black uppercase tracking-widest text-natural-dark">Torneo de Eliminación</h3>
          <p className="text-sm text-natural-text/60 max-w-sm mx-auto leading-relaxed">
            Este torneo se disputa en formato de <span className="font-bold text-natural-primary">eliminación directa (K.O.)</span>. No hay fase de grupos ni jornadas previas.
          </p>
          <p className="text-xs text-natural-text/40">
            Ve a la pestaña de <span className="font-bold text-natural-primary">Finales</span> para ver el cuadro competitivo y jugar los enfrentamientos.
          </p>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
      id="schedule-view"
    >
      <div className="bg-natural-sidebar border-l-4 border-natural-primary p-6 rounded-3xl shadow-sm text-sm">
        <p className="text-natural-dark font-serif text-lg mb-1 italic">Formato Relámpago (Fin 13:30h)</p>
        <p className="text-natural-text">
          Partidos de liga duran <strong>4 minutos (+1 min de cambio)</strong>.
        </p>
      </div>

      {rounds.map((round, rIdx) => (
        <motion.div
          key={`round-${round}`}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: rIdx * 0.05, duration: 0.4 }}
          className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden"
        >
          <div className="bg-natural-dark text-white p-4 font-serif text-center text-xl tracking-wide">Jornada {round}</div>
          <div className="p-3 md:p-6 divide-y divide-natural-border/50">
            {schedule.filter(m => m.round === round).map(m => {
              const played = isMatchPlayed(matches, activeCategory, m.team1.name, m.team2.name);
              const result = getMatchResult(matches, activeCategory, m.team1.name, m.team2.name);
              const mid = getMatchId(matches, activeCategory, m.team1.name, m.team2.name);
              const isLive = matches.find(rm => rm.id === mid)?.isLive;
              const isNext = m.id === nextMatchId;

              if (m.isRestMatch) {
                return (
                  <div key={m.id} id={`match-${m.id}`} className="flex flex-col py-4 opacity-50 bg-natural-bg/30">
                    <div className="flex justify-between items-center mb-3 px-2">
                      <span className="flex items-center gap-1.5 font-bold text-natural-text/60 text-base md:text-lg"><Timer className="w-5 h-5" /> {m.time}</span>
                      <span className="text-[10px] md:text-xs font-bold px-3 py-1 rounded-full bg-natural-sidebar text-natural-text/60 uppercase tracking-widest">Grupo {m.group}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-2xl border border-natural-border/50">
                      <div className="flex-1 min-w-0">
                        {m.team1.isRest ? <span className="text-natural-text/40 font-bold text-sm sm:text-base ml-2">DESCANSA</span> : <TeamBadge team={m.team1} interactive={false} />}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-natural-text/20 px-1 shrink-0">vs</div>
                      <div className="flex-1 min-w-0 flex justify-end">
                        {m.team2.isRest ? <span className="text-natural-text/40 font-bold text-sm sm:text-base mr-2">DESCANSA</span> : <TeamBadge team={m.team2} reverse={true} interactive={false} />}
                      </div>
                      <div className="ml-2 sm:ml-4 shrink-0 w-12 sm:w-16 flex justify-center">
                        <span className="text-natural-text/30 font-bold text-[10px] uppercase">Libre</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} id={`match-${m.id}`} className={`flex flex-col py-4 transition-all duration-500 ${played ? 'opacity-70' : ''} ${isNext ? 'bg-natural-primary/5 rounded-3xl -mx-2 px-2' : ''}`}>
                  <div className="flex justify-between items-center mb-3 px-2">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 font-bold text-natural-dark text-base md:text-lg"><Timer className="w-5 h-5 text-natural-primary" /> {m.time}</span>
                      {isNext && !played && (
                        <span className="bg-natural-primary text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">Siguiente</span>
                      )}
                    </div>
                    <span className={`text-[10px] md:text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase ${m.group === 'A' ? 'bg-[#E8F5E9] text-[#4CAF50]' : 'bg-[#E3F2FD] text-[#2196F3]'}`}>Grupo {m.group}</span>
                  </div>
                  <div className={`flex items-center justify-between gap-2 p-3 rounded-2xl border transition-all ${isNext && !played ? 'bg-white border-natural-primary shadow-md scale-[1.02]' : 'bg-natural-sidebar/30 border-natural-border/50 hover:border-natural-primary/30'}`}>
                    <div className="flex-1 min-w-0"><TeamBadge team={m.team1} onTeamClick={onTeamClick} /></div>
                    <div className="text-[11px] sm:text-xs font-bold text-natural-text/30 px-1 shrink-0 italic font-serif">vs</div>
                    <div className="flex-1 min-w-0 flex justify-end"><TeamBadge team={m.team2} reverse={true} onTeamClick={onTeamClick} /></div>
                    <div className="ml-2 sm:ml-4 shrink-0 flex items-center gap-2">
                      {played ? (
                        <div className="flex items-center gap-2">
                          <div 
                            className={`relative ${isAdminUser && isLive ? 'cursor-pointer' : ''}`}
                            onClick={() => {
                              if (isAdminUser && isLive) {
                                const match = matches.find(rm => rm.id === mid);
                                if (match) onResumeMatch(match);
                              }
                            }}
                          >
                            <span 
                              className={`bg-natural-dark text-white px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs md:text-sm shadow-sm flex items-center gap-2 ${isLive ? 'ring-2 ring-red-500 ring-offset-2 hover:bg-natural-primary transition-colors' : ''}`}
                            >
                              {isLive && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                              {result}
                              {mid && matches.find(rm => rm.id === mid) && (
                                (matches.find(rm => rm.id === mid)!.yellowCards1 || 0) + 
                                (matches.find(rm => rm.id === mid)!.yellowCards2 || 0) + 
                                (matches.find(rm => rm.id === mid)!.redCards1 || 0) + 
                                (matches.find(rm => rm.id === mid)!.redCards2 || 0)
                              ) > 0 && (
                                <div className="flex gap-0.5 ml-1 border-l border-white/20 pl-1.5">
                                  {((matches.find(rm => rm.id === mid)!.yellowCards1 || 0) + (matches.find(rm => rm.id === mid)!.yellowCards2 || 0)) > 0 && (
                                    <div className="w-1.5 h-2.5 bg-yellow-400 rounded-[1px]" />
                                  )}
                                  {((matches.find(rm => rm.id === mid)!.redCards1 || 0) + (matches.find(rm => rm.id === mid)!.redCards2 || 0)) > 0 && (
                                    <div className="w-1.5 h-2.5 bg-red-500 rounded-[1px]" />
                                  )}
                                </div>
                              )}
                            </span>
                            {isLive && (
                              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter animate-bounce">Live</span>
                            )}
                          </div>
                          {isAdminUser && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => {
                                  const mid = getMatchId(matches, activeCategory, m.team1.name, m.team2.name);
                                  if (!mid) return;
                                  requestPrompt("Editar resultado (Ej: 2-1):", result || "", (res) => {
                                    if (res && res.includes('-')) {
                                      const [s1, s2] = res.split('-').map(Number);
                                      if (!isNaN(s1) && !isNaN(s2)) {
                                        onUpdateMatchResult(mid, s1, s2);
                                      }
                                    }
                                  });
                                }}
                                className="p-1.5 bg-natural-sidebar rounded-lg text-natural-text/40 hover:text-natural-primary"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const mid = getMatchId(matches, activeCategory, m.team1.name, m.team2.name);
                                  if (mid) onDeleteMatch(mid);
                                }}
                                className="p-1.5 bg-natural-sidebar rounded-lg text-natural-text/40 hover:text-red-500"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        isAdminUser && (
                          <button onClick={() => onStartMatch(m.team1.name, m.team2.name, m.group, m.id)} className="bg-natural-primary hover:bg-natural-dark text-white font-bold px-3 md:px-5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95">
                            <Play className="w-3.5 h-3.5 fill-current" /> <span className="hidden md:inline">JUGAR</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

