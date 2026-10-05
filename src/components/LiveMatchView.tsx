import React from 'react';
import { ArrowLeft, Play, Pause, RotateCcw, Plus, Minus, Check, X, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LiveMatchData, Category, Team } from '../types';
import { formatTime, MATCH_DURATION_SECONDS } from '../utils/time';
import { TEAMS_MASCULINO, TEAMS_FEMENINO } from '../constants/teams';
import { PromptModal } from './PromptModal';

interface LiveMatchViewProps {
  liveMatch: LiveMatchData;
  time: number;
  timerRunning: boolean;
  isAdminUser: boolean;
  /** Publishes the referee's clock so spectators can follow it. */
  onSyncTimer?: (time: number, running: boolean) => void;
  activeCategory: Category;
  matchDuration: number;
  setTime: (t: number | ((prev: number) => number)) => void;
  setTimerRunning: (r: boolean) => void;
  onUpdateScore: (teamIndex: number, delta: number) => void;
  onUpdateCard: (teamIndex: number, type: 'yellow' | 'red', delta: number) => void;
  onEndMatch: (p1?: number, p2?: number) => void;
  onCancel: () => void;
  allTeams?: Team[];
  scoreLabel: string;
  sportId?: string;
}

export const LiveMatchView: React.FC<LiveMatchViewProps> = ({
  liveMatch,
  time,
  timerRunning,
  isAdminUser,
  onSyncTimer,
  activeCategory,
  matchDuration,
  setTime,
  setTimerRunning,
  onUpdateScore,
  onUpdateCard,
  onEndMatch,
  onCancel,
  allTeams = [],
  scoreLabel,
  sportId,
}) => {
  const handleExit = () => {
    onCancel();
  };

  const findTeamColor = (name: string) => {
    const cleanName = name.trim().toLowerCase();
    const team = allTeams.find(t => t.name.trim().toLowerCase() === cleanName) || 
                 TEAMS_MASCULINO.find(t => t.name.trim().toLowerCase() === cleanName) || 
                 TEAMS_FEMENINO.find(t => t.name.trim().toLowerCase() === cleanName);
    return team?.color ?? '#5A6B52';
  };

  const team1Color = findTeamColor(liveMatch.team1);
  const team2Color = findTeamColor(liveMatch.team2);
  const isMasculino = activeCategory === 'masculino';

  // Spectators hear the horn when the synced clock reaches zero. The referee's
  // own horn is played by useTimer, so it is not repeated here.
  // Between syncs the spectator's clock counts down locally.
  const [spectatorTime, setSpectatorTime] = React.useState(time);
  React.useEffect(() => { setSpectatorTime(time); }, [time]);
  React.useEffect(() => {
    if (isAdminUser || !timerRunning) return;
    const interval = setInterval(() => setSpectatorTime(t => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [isAdminUser, timerRunning, time]);
  const shownTime = isAdminUser ? time : spectatorTime;

  const prevTimeRef = React.useRef(shownTime);
  React.useEffect(() => {
    if (!isAdminUser && prevTimeRef.current > 0 && shownTime === 0) {
      import('../utils/audio').then(m => m.playHorn());
    }
    prevTimeRef.current = shownTime;
  }, [shownTime, isAdminUser]);

  // The referee publishes the clock every 5 s and on every start/pause.
  React.useEffect(() => {
    if (!isAdminUser || !liveMatch.id || !onSyncTimer) return;
    if (!timerRunning || time % 5 === 0 || time === 0) {
      onSyncTimer(time, timerRunning);
    }
  }, [time, timerRunning, isAdminUser, liveMatch.id]);

  const [isTimerPromptOpen, setIsTimerPromptOpen] = React.useState(false);
  const [showHistory, setShowHistory] = React.useState(false);
  const [isPenaltyMode, setIsPenaltyMode] = React.useState(false);
  const [penaltySeq1, setPenaltySeq1] = React.useState<boolean[]>([]);
  const [penaltySeq2, setPenaltySeq2] = React.useState<boolean[]>([]);

  const handleTimerPromptConfirm = (newTimeStr: string) => {
    setIsTimerPromptOpen(false);
    let m = 0, s = 0;
    if (newTimeStr.includes(':')) {
      const parts = newTimeStr.split(':');
      m = parseInt(parts[0]) || 0;
      s = parseInt(parts[1]) || 0;
    } else {
      const parsed = parseInt(newTimeStr);
      if (!isNaN(parsed)) {
        if (parsed < 100) m = parsed;
        else s = parsed;
      }
    }
    const totalSeconds = m * 60 + s;
    if (totalSeconds >= 0) setTime(totalSeconds);
  };

  const handleEndMatch = () => {
    if (liveMatch.group === 'PLAYOFF' && liveMatch.score1 === liveMatch.score2 && !isPenaltyMode) {
      setIsPenaltyMode(true);
      return;
    }
    const p1 = penaltySeq1.filter(s => s).length;
    const p2 = penaltySeq2.filter(s => s).length;
    onEndMatch(isPenaltyMode ? p1 : undefined, isPenaltyMode ? p2 : undefined);
  };

  const pScore1 = penaltySeq1.filter(s => s).length;
  const pScore2 = penaltySeq2.filter(s => s).length;
  const canSavePenalties = penaltySeq1.length > 0 && penaltySeq1.length === penaltySeq2.length && pScore1 !== pScore2;

  const addPenalty = (teamIndex: number, success: boolean) => {
    if (teamIndex === 1) {
      setPenaltySeq1(prev => [...prev, success]);
    } else {
      setPenaltySeq2(prev => [...prev, success]);
    }
    import('../utils/audio').then(m => m.playClick());
  };

  const undoPenalty = (teamIndex: number) => {
    if (teamIndex === 1) {
      setPenaltySeq1(prev => prev.slice(0, -1));
    } else {
      setPenaltySeq2(prev => prev.slice(0, -1));
    }
    import('../utils/audio').then(m => m.playClick());
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0f110f] overflow-hidden select-none">
      <PromptModal
        isOpen={isTimerPromptOpen}
        title="Editar reloj"
        defaultValue={`${Math.floor(time / 60)}:${(time % 60).toString().padStart(2, '0')}`}
        onConfirm={handleTimerPromptConfirm}
        onCancel={() => setIsTimerPromptOpen(false)}
      />

      {/* TOP: Timer Area */}
      <div className="shrink-0 flex flex-col items-center pt-2 md:pt-4 pb-2 md:pb-4 px-4 bg-[#1a1e1a] border-b border-white/5 shadow-2xl relative z-10">
        <button aria-label="Volver" title="Volver"
          onClick={handleExit}
          className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/5 hover:bg-white/10 text-white/60 p-2 md:p-3 rounded-xl md:rounded-2xl transition-all border border-white/5"
        >
          <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
        </button>

        <div className={`text-[8px] md:text-[9px] font-black px-3 md:px-4 py-0.5 md:py-1 rounded-full uppercase tracking-[0.3em] mb-1 md:mb-2 ${isPenaltyMode ? 'bg-orange-500/20 text-orange-400' : isMasculino ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
          {isPenaltyMode ? 'Penaltis' : `Pista ${isMasculino ? 'Masculina' : 'Femenina'}`}
        </div>

        {sportId === 'volleyball' ? (
          <div className="text-xl md:text-2xl font-serif font-black text-natural-primary tracking-wide py-2 uppercase">
            Voleibol (Sets / Puntos)
          </div>
        ) : (
          <div
            onClick={() => isAdminUser && setIsTimerPromptOpen(true)}
            className="text-5xl md:text-7xl font-black italic text-white tabular-nums tracking-tighter leading-none cursor-pointer"
          >
            {formatTime(shownTime)}
          </div>
        )}

        {isAdminUser && (
          <div className="flex gap-2 mt-2 md:mt-4">
            {sportId !== 'volleyball' && (
              <>
                <button
                  disabled={time === 0}
                  onClick={() => { setTimerRunning(!timerRunning); import('../utils/audio').then(m => m.playWhistle()); }}
                  className={`px-6 md:px-8 py-2 md:py-3 rounded-xl md:rounded-2xl font-black flex items-center gap-2 text-[10px] md:text-xs tracking-widest transition-all active:scale-95 shadow-xl
                    ${time === 0 ? 'opacity-20 bg-white/10 text-white/40' : timerRunning ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'}`}
                >
                  {timerRunning ? <Pause className="w-3 h-3 md:w-4 md:h-4 fill-current" /> : <Play className="w-3 h-3 md:w-4 md:h-4 fill-current" />}
                  {timerRunning ? 'PAUSAR' : 'INICIAR'}
                </button>
                <button aria-label="Reiniciar reloj" title="Reiniciar reloj"
                  onClick={() => { setTime(matchDuration); setTimerRunning(false); }}
                  className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 transition-all border border-white/5 active:scale-95"
                >
                  <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </>
            )}
            <button aria-label="Ver cronología" title="Cronología"
              onClick={() => setShowHistory(true)}
              className={`p-2 md:p-3 rounded-xl md:rounded-2xl border transition-all active:scale-95 ${liveMatch.goalHistory?.length ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-white/5 border-white/5 text-white/20'}`}
            >
              <Activity className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        )}
      </div>


      {/* CENTER: Scoreboard */}
      <div className="flex-1 flex flex-row min-h-0 bg-[#0f110f]">
        {[1, 2].map((idx) => {
          const teamName = idx === 1 ? liveMatch.team1 : liveMatch.team2;
          const score = idx === 1 ? liveMatch.score1 : liveMatch.score2;
          const color = findTeamColor(teamName);
          
          return (
            <div key={idx} className={`flex-1 flex flex-col border-r border-white/5 last:border-0 relative ${idx === 1 ? 'bg-gradient-to-br from-black to-transparent' : 'bg-gradient-to-bl from-black to-transparent'}`}>
              <div className="flex-1 flex flex-col items-center justify-center p-2 md:p-4 min-h-0 overflow-hidden">
                <h3 className="text-[10px] md:text-sm font-black text-white/80 uppercase text-center leading-tight tracking-tight mb-1 md:mb-4 max-w-[120px] md:max-w-[140px]" style={{ textShadow: `0 0 20px ${color}66` }}>
                  {teamName}
                </h3>
                <div className="text-7xl md:text-9xl font-black italic text-white tabular-nums drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)] leading-none">
                  {isPenaltyMode ? (idx === 1 ? penaltySeq1.filter(s=>s).length : penaltySeq2.filter(s=>s).length) : score}
                </div>
                
                {/* Cards Summary */}
                <div className="flex gap-2 mt-2">
                  {(idx === 1 ? liveMatch.yellowCards1 : liveMatch.yellowCards2) ? (
                    <div className="flex items-center gap-1 bg-yellow-500/20 px-2 py-0.5 rounded-lg border border-yellow-500/30">
                      <div className="w-2.5 h-3.5 bg-yellow-400 rounded-sm shadow-sm" />
                      <span className="text-[10px] font-black text-yellow-400">{idx === 1 ? liveMatch.yellowCards1 : liveMatch.yellowCards2}</span>
                    </div>
                  ) : null}
                  {(idx === 1 ? liveMatch.redCards1 : liveMatch.redCards2) ? (
                    <div className="flex items-center gap-1 bg-red-500/20 px-2 py-0.5 rounded-lg border border-red-500/30">
                      <div className="w-2.5 h-3.5 bg-red-500 rounded-sm shadow-sm" />
                      <span className="text-[10px] font-black text-red-400">{idx === 1 ? liveMatch.redCards1 : liveMatch.redCards2}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {isAdminUser && (
                <div className="shrink-0 p-2 md:p-4 flex flex-col gap-1.5 md:gap-2 bg-black/20">
                  {sportId === 'basketball' && !isPenaltyMode ? (
                    <div className="flex flex-col gap-1.5 md:gap-2">
                      <button
                        onClick={() => onUpdateScore(idx, 1)}
                        className="w-full py-2.5 md:py-3.5 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg border-b-[3px] border-black/30 relative overflow-hidden group text-white font-black text-xs uppercase"
                        style={{ backgroundColor: color }}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 font-black">+1 Tiro Libre</span>
                      </button>
                      <button
                        onClick={() => onUpdateScore(idx, 2)}
                        className="w-full py-4 md:py-6 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg border-b-[3px] border-black/30 relative overflow-hidden group text-white font-black text-sm md:text-base uppercase"
                        style={{ backgroundColor: color }}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 font-black">+2 Canasta</span>
                      </button>
                      <button
                        onClick={() => onUpdateScore(idx, 3)}
                        className="w-full py-2.5 md:py-3.5 flex items-center justify-center rounded-2xl transition-all active:scale-95 shadow-lg border-b-[3px] border-black/30 relative overflow-hidden group text-white font-black text-xs uppercase"
                        style={{ backgroundColor: color }}
                      >
                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="relative z-10 font-black">+3 Triple</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => isPenaltyMode ? addPenalty(idx, true) : onUpdateScore(idx, 1)}
                      className="w-full h-16 md:h-28 flex flex-col items-center justify-center rounded-[20px] md:rounded-[24px] transition-all active:scale-95 shadow-xl border-b-[4px] border-black/40 relative overflow-hidden group"
                      style={{ backgroundColor: color }}
                    >
                      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Plus className="w-6 h-6 md:w-8 md:h-8 text-white mb-0.5 drop-shadow-md" />
                      <span className="text-base md:text-xl font-black text-white tracking-tighter drop-shadow-md uppercase">
                        {isPenaltyMode ? 'ANOTADO' : `¡${scoreLabel.toUpperCase()}!`}
                      </span>
                    </button>
                  )}

                  {isPenaltyMode ? (
                    <button
                      onClick={() => addPenalty(idx, false)}
                      className="w-full h-12 md:h-16 bg-red-600/20 border border-red-500/30 text-red-500 rounded-xl flex items-center justify-center gap-2 font-black text-[10px] uppercase tracking-widest active:scale-95 transition-all"
                    >
                      <X className="w-4 h-4" /> FALLADO
                    </button>
                  ) : (
                    <div className="flex gap-1.5 md:gap-2">
                      <button
                        onClick={() => onUpdateCard(idx, 'yellow', 1)}
                        className="flex-1 h-10 md:h-14 bg-yellow-500 hover:bg-yellow-400 rounded-xl md:rounded-2xl transition-all active:scale-95 shadow-lg border-b-[3px] border-yellow-700/50 flex items-center justify-center gap-2"
                      >
                        <div className="w-3 h-4 bg-white/90 rounded-sm" />
                        <span className="text-[9px] md:text-[10px] font-black text-yellow-900">AMARILLA</span>
                      </button>
                      <button
                        onClick={() => onUpdateCard(idx, 'red', 1)}
                        className="flex-1 h-10 md:h-14 bg-red-600 hover:bg-red-500 rounded-xl md:rounded-2xl transition-all active:scale-95 shadow-lg border-b-[3px] border-red-900/50 flex items-center justify-center gap-2"
                      >
                        <div className="w-3 h-4 bg-white/90 rounded-sm" />
                        <span className="text-[9px] md:text-[10px] font-black text-white">ROJA</span>
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => isPenaltyMode ? undoPenalty(idx) : onUpdateScore(idx, -1)}
                    className="w-full py-2 md:py-3 rounded-lg md:rounded-xl bg-white/5 hover:bg-white/20 text-white/40 hover:text-red-400 transition-all border border-white/5 flex items-center justify-center gap-2 text-[9px] md:text-[10px] font-black uppercase tracking-widest"
                  >
                    <RotateCcw className="w-2.5 h-2.5 md:w-3 md:h-3" /> Corregir / Deshacer
                  </button>

                  {isPenaltyMode && (
                    <div className="flex flex-wrap gap-1 mt-2 justify-center">
                      {(idx === 1 ? penaltySeq1 : penaltySeq2).map((success, i) => (
                        <div 
                          key={i} 
                          className={`w-3 h-3 rounded-full border ${success ? 'bg-green-500 border-green-400' : 'bg-red-500/20 border-red-500/50'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>


      {/* FOOTER: Actions */}
      <div className="shrink-0 bg-[#1a1e1a] border-t border-white/10 p-2 md:p-4 pb-4 md:pb-6 flex flex-col gap-1 md:gap-2">
        {isAdminUser && (
          <button
            onClick={handleEndMatch}
            disabled={isPenaltyMode && !canSavePenalties}
            className="w-full py-3 md:py-4 bg-green-600 hover:bg-green-500 disabled:opacity-20 text-white rounded-[16px] md:rounded-[20px] font-black text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 md:w-5 md:h-5" />
            {isPenaltyMode ? 'Guardar Penaltis' : 'Finalizar Partido'}
          </button>
        )}
        <button
          onClick={handleExit}
          className="w-full py-1 text-white/20 hover:text-white/40 font-bold text-[8px] uppercase tracking-[0.4em] transition-colors"
        >
          — Salir sin guardar —
        </button>
      </div>


      {/* TIMELINE OVERLAY */}
      <AnimatePresence>
        {showHistory && liveMatch.goalHistory && liveMatch.goalHistory.length > 0 && (
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-[60] bg-[#0f110f]/95 backdrop-blur-3xl flex flex-col"
          >
            <div className="shrink-0 p-6 flex items-center justify-between border-b border-white/10 bg-[#1a1e1a]">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/20">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">Cronología</h4>
                  <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Eventos del partido</p>
                </div>
              </div>
              <button aria-label="Cerrar cronología" onClick={() => setShowHistory(false)} className="p-3 bg-white/5 rounded-2xl text-white/40 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {liveMatch.goalHistory.slice().reverse().map((event, i) => {
                const team = event.teamIndex === 1 ? liveMatch.team1 : liveMatch.team2;
                const col = findTeamColor(team);
                const isGoal = !event.type || event.type === 'goal';
                const isYellow = event.type === 'yellow';
                const isRed = event.type === 'red';

                return (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-3xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-black/40 border border-white/10 flex flex-col items-center justify-center">
                        <span className="text-lg font-black text-white">{formatTime(event.time)}</span>
                      </div>
                      <div>
                        <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${isGoal ? 'text-green-500' : isYellow ? 'text-yellow-500' : 'text-red-500'}`}>
                          {isGoal ? `¡${scoreLabel.toUpperCase()}!` : isYellow ? 'TARJETA AMARILLA' : 'TARJETA ROJA'}
                        </div>
                        <div className="text-xl font-black uppercase tracking-tight" style={{ color: col }}>{team}</div>
                      </div>
                    </div>
                    {isGoal ? (
                      <div className="bg-white text-black px-4 py-2 rounded-xl font-black text-xl">{event.score}</div>
                    ) : (
                      <div className={`w-8 h-10 rounded-lg shadow-xl ${isYellow ? 'bg-yellow-400' : 'bg-red-500'}`} />
                    )}
                    {isAdminUser && (
                      <button aria-label="Eliminar evento" 
                        onClick={() => {
                          if (isGoal) onUpdateScore(event.teamIndex, -(event.value ?? 1));
                          else onUpdateCard(event.teamIndex, event.type as 'yellow' | 'red', -1);
                        }}
                        className="ml-4 p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
