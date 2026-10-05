import React from 'react';
import { Timer, Play, Trash2, Trophy, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { StandingTeam, Team, Category, MatchRecord } from '../types';
import { TeamBadge } from './TeamBadge';
import { getMatchWinner, getMatchLoser } from '../utils/match';
import { getComparisonName } from '../utils/standings';
import { addMinutes, getSlotMinutes } from '../constants/schedule';

interface PlayoffsViewProps {
  groupAStandings: StandingTeam[];
  groupBStandings: StandingTeam[];
  isAdminUser: boolean;
  currentTeams: Team[];
  activeCategory: Category;
  matches: MatchRecord[];
  schedule: any[];
  onTeamClick: (name: string) => void;
  onStartMatch: (t1: string, t2: string, group: string, id: string, duration?: number) => void;
  onDeleteMatch: (id: string) => void;
  onResumeMatch: (match: MatchRecord) => void;
  format?: 'group-playoff' | 'league' | 'knockout';
  matchDuration: number;   // seconds (0 = no clock, e.g. volleyball)
  restDuration?: number;   // minutes
  startTime?: string;      // tournament start, used when there is no league phase
}

export const PlayoffsView: React.FC<PlayoffsViewProps> = ({
  groupAStandings,
  groupBStandings,
  isAdminUser,
  currentTeams,
  activeCategory,
  matches,
  schedule,
  onTeamClick,
  onStartMatch,
  onDeleteMatch,
  onResumeMatch,
  format,
  matchDuration,
  restDuration,
  startTime,
}) => {
  const getTeam = (name: string | null) => {
    if (!name) return undefined;
    const compName = getComparisonName(name);
    return currentTeams.find(t => getComparisonName(t.name) === compName);
  };

  const findMatch = (id: string, t1?: Team, t2?: Team) => {
    if (!t1 || !t2) return undefined;
    
    const t1Comp = getComparisonName(t1.name);
    const t2Comp = getComparisonName(t2.name);
    
    // First try to find by ID, but verify teams match
    const byId = matches.find(m => m.id === id);
    if (byId) {
      const m1Comp = getComparisonName(byId.team1);
      const m2Comp = getComparisonName(byId.team2);
      if ((m1Comp === t1Comp && m2Comp === t2Comp) || (m1Comp === t2Comp && m2Comp === t1Comp)) {
        return byId;
      }
    }

    // Fallback: search by teams in any PLAYOFF match for this category
    return matches.find(m => {
      if (m.category !== activeCategory || m.group !== 'PLAYOFF' || !(m.played || m.isLive)) return false;
      const m1Comp = getComparisonName(m.team1);
      const m2Comp = getComparisonName(m.team2);
      return (m1Comp === t1Comp && m2Comp === t2Comp) || (m1Comp === t2Comp && m2Comp === t1Comp);
    });
  };

  const isKnockout = format === 'knockout';
  let koTeams = currentTeams.filter(t => t.category === activeCategory && !t.isRest);
  koTeams = [...koTeams].sort((a, b) => a.name.localeCompare(b.name));

  // Bracket timetable: one match after another, starting when the league ends.
  const matchMins = Math.floor(matchDuration / 60);
  const slotMins = getSlotMinutes({ matchDurationMins: matchMins || undefined, restDurationMins: restDuration });
  const lastLeagueStart = schedule.reduce((latest: string, m: any) => (m.time > latest ? m.time : latest), '');
  const bracketStart = lastLeagueStart ? addMinutes(lastLeagueStart, slotMins) : (startTime || '09:30');
  const slotTime = (index: number) => addMinutes(bracketStart, index * slotMins);
  const durationText = matchMins > 0 ? `${matchMins} minutos` : 'sin reloj';

  // With fewer than 8 knockout teams the missing seeds are byes: the top
  // seeds go straight through to the semi-finals.
  const advancing = (qf: { t1?: Team; t2?: Team }, played?: MatchRecord) => {
    if (isKnockout && qf.t1 && !qf.t2) return qf.t1;
    if (isKnockout && !qf.t1 && qf.t2) return qf.t2;
    return getTeam(getMatchWinner(played));
  };

  const hasQuarterFinals = isKnockout ? koTeams.length > 4 : (groupAStandings.length >= 4 && groupBStandings.length >= 4);
  const hasSemiFinals = isKnockout ? koTeams.length > 2 : (groupAStandings.length >= 2 && groupBStandings.length >= 2);

  const quarterFinals = [
    { id: `${activeCategory}_C1`, title: "Cuartos 1", time: slotTime(0), t1: isKnockout ? koTeams[0] : groupAStandings[0], t2: isKnockout ? koTeams[7] : groupBStandings[3], label1: isKnockout ? "Sembrado 1" : "1º Gr. A", label2: isKnockout ? "Sembrado 8" : "4º Gr. B" },
    { id: `${activeCategory}_C2`, title: "Cuartos 2", time: slotTime(1), t1: isKnockout ? koTeams[3] : groupBStandings[1], t2: isKnockout ? koTeams[4] : groupAStandings[2], label1: isKnockout ? "Sembrado 4" : "2º Gr. B", label2: isKnockout ? "Sembrado 5" : "3º Gr. A" },
    { id: `${activeCategory}_C3`, title: "Cuartos 3", time: slotTime(2), t1: isKnockout ? koTeams[1] : groupBStandings[0], t2: isKnockout ? koTeams[6] : groupAStandings[3], label1: isKnockout ? "Sembrado 2" : "1º Gr. B", label2: isKnockout ? "Sembrado 7" : "4º Gr. A" },
    { id: `${activeCategory}_C4`, title: "Cuartos 4", time: slotTime(3), t1: isKnockout ? koTeams[2] : groupAStandings[1], t2: isKnockout ? koTeams[5] : groupBStandings[2], label1: isKnockout ? "Sembrado 3" : "2º Gr. A", label2: isKnockout ? "Sembrado 6" : "3º Gr. B" },
  ];

  const c1Match = findMatch(`${activeCategory}_C1`, quarterFinals[0].t1, quarterFinals[0].t2);
  const c2Match = findMatch(`${activeCategory}_C2`, quarterFinals[1].t1, quarterFinals[1].t2);
  const c3Match = findMatch(`${activeCategory}_C3`, quarterFinals[2].t1, quarterFinals[2].t2);
  const c4Match = findMatch(`${activeCategory}_C4`, quarterFinals[3].t1, quarterFinals[3].t2);
  const qfSlots = hasQuarterFinals ? 4 : 0;

  const semiFinals = [
    { 
      id: `${activeCategory}_S1`, title: "Semifinal 1", time: slotTime(qfSlots), 
      t1: hasQuarterFinals ? advancing(quarterFinals[0], c1Match) : (isKnockout ? koTeams[0] : groupAStandings[0]), 
      t2: hasQuarterFinals ? advancing(quarterFinals[1], c2Match) : (isKnockout ? koTeams[3] : groupBStandings[1]), 
      label1: hasQuarterFinals ? "Ganador C1" : (isKnockout ? "Sembrado 1" : "1º Gr. A"), 
      label2: hasQuarterFinals ? "Ganador C2" : (isKnockout ? "Sembrado 4" : "2º Gr. B") 
    },
    { 
      id: `${activeCategory}_S2`, title: "Semifinal 2", time: slotTime(qfSlots + 1), 
      t1: hasQuarterFinals ? advancing(quarterFinals[2], c3Match) : (isKnockout ? koTeams[1] : groupBStandings[0]), 
      t2: hasQuarterFinals ? advancing(quarterFinals[3], c4Match) : (isKnockout ? koTeams[2] : groupAStandings[1]), 
      label1: hasQuarterFinals ? "Ganador C3" : (isKnockout ? "Sembrado 2" : "1º Gr. B"), 
      label2: hasQuarterFinals ? "Ganador C4" : (isKnockout ? "Sembrado 3" : "2º Gr. A") 
    },
  ];

  const s1Match = findMatch(`${activeCategory}_S1`, semiFinals[0].t1, semiFinals[0].t2);
  const s2Match = findMatch(`${activeCategory}_S2`, semiFinals[1].t1, semiFinals[1].t2);
  const sfSlots = qfSlots + (hasSemiFinals ? 2 : 0);

  const finals = [
    { 
      id: `${activeCategory}_F`, title: "GRAN FINAL", time: slotTime(sfSlots + (hasSemiFinals ? 1 : 0)), 
      t1: hasSemiFinals ? getTeam(getMatchWinner(s1Match)) : (isKnockout ? koTeams[0] : groupAStandings[0]), 
      t2: hasSemiFinals ? getTeam(getMatchWinner(s2Match)) : (isKnockout ? koTeams[1] : groupBStandings[0]), 
      label1: hasSemiFinals ? "Ganador S1" : (isKnockout ? "Sembrado 1" : "1º Gr. A"), 
      label2: hasSemiFinals ? "Ganador S2" : (isKnockout ? "Sembrado 2" : "1º Gr. B") 
    },
  ];
  const thirdPlace = [
    { 
      id: `${activeCategory}_T`, title: "3º y 4º Puesto", time: slotTime(sfSlots), 
      t1: hasSemiFinals ? getTeam(getMatchLoser(s1Match)) : undefined, 
      t2: hasSemiFinals ? getTeam(getMatchLoser(s2Match)) : undefined, 
      label1: hasSemiFinals ? "Perdedor S1" : "", 
      label2: hasSemiFinals ? "Perdedor S2" : "" 
    },
  ];

  const fMatch = findMatch(`${activeCategory}_F`, finals[0].t1, finals[0].t2);
  const tMatch = findMatch(`${activeCategory}_T`, thirdPlace[0].t1, thirdPlace[0].t2);

  const PhaseInfo = ({ title, duration, notes }: { title: string, duration: string, notes: string }) => (
    <div className="mb-6 bg-natural-primary/5 border-l-4 border-natural-primary rounded-r-2xl p-4 flex gap-3 items-start shadow-sm w-full max-w-[260px] mx-auto">
      <div className="bg-natural-primary/10 p-1.5 rounded-lg text-natural-primary shrink-0">
        <Info className="w-4 h-4" />
      </div>
      <div>
        <h4 className="text-[11px] font-black uppercase tracking-widest text-natural-primary mb-0.5">{title}</h4>
        <p className="text-[10px] text-natural-text/70 leading-tight">
          Duración: <span className="font-bold text-natural-text">{duration}</span>. {notes}
        </p>
      </div>
    </div>
  );

  const renderMatch = (match: any, isLarge = false) => {
    const playedMatch = findMatch(match.id, match.t1, match.t2);
    const duration = matchDuration;
    const isBye = isKnockout && match.id.includes('_C') && (!match.t1 !== !match.t2);
    const byeText = 'Exento (pasa directo)';

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`relative group ${isLarge ? 'w-[300px]' : 'w-[260px]'} shrink-0`}
      >
        <div className="bg-white dark:bg-natural-dark/50 rounded-[2.5rem] border border-natural-border shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:border-natural-primary/40">
          <div className="bg-natural-dark text-white py-2.5 px-4 text-[10px] font-serif italic tracking-widest flex justify-between items-center border-b border-white/5">
            <div className="flex items-center gap-2">
              <Timer className="w-3 h-3 text-natural-primary" />
              <span>{match.time} - {match.title}</span>
            </div>
            {playedMatch && <span className="text-green-400 font-bold uppercase text-[8px]">Finalizado</span>}
          </div>
          
          <div className="p-4 space-y-4">
            {/* Team 1 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[8px] font-bold text-natural-primary/60 uppercase tracking-[0.2em] ml-1">{match.label1}</span>
              <div className="flex items-center justify-between gap-3">
                <TeamBadge team={match.t1} onTeamClick={onTeamClick} fallback={isBye ? byeText : undefined} />
                {playedMatch && (
                  <div className="flex flex-col items-end">
                    <span 
                      onClick={() => {
                        if (isAdminUser && playedMatch.isLive) onResumeMatch(playedMatch);
                      }}
                      className={`text-xl font-serif font-black tabular-nums transition-all ${playedMatch.isLive ? 'cursor-pointer hover:text-natural-primary' : ''} ${getMatchWinner(playedMatch) === match.t1?.name ? 'text-natural-primary scale-110' : 'text-natural-text/20'}`}
                    >
                      {playedMatch.team1 === match.t1?.name ? playedMatch.score1 : playedMatch.score2}
                    </span>
                    {playedMatch.penaltyScore1 !== undefined && (
                      <span className="text-[10px] font-black text-natural-primary/60 tabular-nums">
                        P: {playedMatch.team1 === match.t1?.name ? playedMatch.penaltyScore1 : playedMatch.penaltyScore2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-natural-border/50 to-transparent" />

            {/* Team 2 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-3">
                <TeamBadge team={match.t2} onTeamClick={onTeamClick} fallback={isBye ? byeText : undefined} />
                {playedMatch && (
                  <div className="flex flex-col items-end">
                    <span 
                      onClick={() => {
                        if (isAdminUser && playedMatch.isLive) onResumeMatch(playedMatch);
                      }}
                      className={`text-xl font-serif font-black tabular-nums transition-all ${playedMatch.isLive ? 'cursor-pointer hover:text-natural-primary' : ''} ${getMatchWinner(playedMatch) === match.t2?.name ? 'text-natural-primary scale-110' : 'text-natural-text/20'}`}
                    >
                      {playedMatch.team1 === match.t2?.name ? playedMatch.score1 : playedMatch.score2}
                    </span>
                    {playedMatch.penaltyScore1 !== undefined && (
                      <span className="text-[10px] font-black text-natural-primary/60 tabular-nums">
                        P: {playedMatch.team1 === match.t2?.name ? playedMatch.penaltyScore1 : playedMatch.penaltyScore2}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="text-[8px] font-bold text-natural-primary/60 uppercase tracking-[0.2em] ml-1">{match.label2}</span>
            </div>

            {isAdminUser && match.t1 && match.t2 && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => {
                    if (playedMatch?.isLive) {
                      onResumeMatch(playedMatch);
                    } else {
                      onStartMatch(match.t1!.name, match.t2!.name, 'PLAYOFF', match.id, duration);
                    }
                  }}
                  className={`flex-1 h-9 flex justify-center items-center gap-2 rounded-2xl text-[10px] font-bold transition-all shadow-md active:scale-95 ${playedMatch?.isLive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                >
                  <Play className={`w-3.5 h-3.5 ${playedMatch?.isLive ? 'animate-pulse fill-current' : 'fill-current'}`} /> 
                  {playedMatch?.isLive ? 'RETOMAR' : (playedMatch ? 'Editar' : 'Jugar')}
                </button>
                {playedMatch && (
                  <button
                    onClick={() => onDeleteMatch(playedMatch.id as string)}
                    aria-label="Borrar resultado"
                    title="Borrar resultado"
                    className="w-9 h-9 flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl transition-all border border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const groupStageMatches = schedule.filter(m => !m.isRestMatch);
  const playedGroupMatches = matches.filter(m => m.category === activeCategory && m.group !== 'PLAYOFF' && m.played);
  const isGroupStageFinished = playedGroupMatches.length >= groupStageMatches.length;

  if (!isGroupStageFinished) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="py-20 flex flex-col items-center text-center gap-6 px-4"
        id="playoffs-view"
      >
        <div className="w-24 h-24 bg-natural-sidebar rounded-3xl flex items-center justify-center text-natural-primary rotate-3 shadow-xl border border-natural-border/50">
          <Trophy className="w-12 h-12 opacity-20" />
        </div>
        <div className="space-y-3">
          <h3 className="text-2xl font-black uppercase tracking-widest text-natural-dark">Fase de Grupos en curso</h3>
          <p className="text-sm text-natural-text/60 max-w-sm mx-auto leading-relaxed">
            El cuadro de eliminatorias se generará automáticamente cuando finalicen todos los partidos de la <span className="font-bold text-natural-primary">Fase de Grupos</span>.
          </p>
        </div>
        
        <div className="mt-8 grid grid-cols-2 gap-4 w-full max-w-xs">
          <div className="bg-white p-4 rounded-3xl border border-natural-border/50 shadow-sm">
            <div className="text-2xl font-black text-natural-primary">{playedGroupMatches.length}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-natural-text/40">Jugados</div>
          </div>
          <div className="bg-white p-4 rounded-3xl border border-natural-border/50 shadow-sm">
            <div className="text-2xl font-black text-natural-text/20">{groupStageMatches.length}</div>
            <div className="text-[8px] font-black uppercase tracking-widest text-natural-text/40">Totales</div>
          </div>
        </div>

        <div className="flex gap-2 items-center bg-natural-primary/5 px-6 py-3 rounded-2xl border border-natural-primary/10 mt-4">
          <div className="flex gap-1">
            {[1, 2, 3].map(i => (
              <span key={i} className="w-1.5 h-1.5 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
            ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-natural-primary">Esperando clasificación final</span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="pb-20 -mx-4 px-4 overflow-hidden"
      id="playoffs-view"
    >
      {/* Scrollable Bracket Container */}
      <div className="flex gap-8 md:gap-16 lg:gap-24 overflow-x-auto pb-12 snap-x scroll-smooth no-scrollbar">
        
        {/* Quarter Finals */}
        {hasQuarterFinals && (
          <div className="flex flex-col snap-center min-w-[280px]">
            <PhaseInfo 
              title="Cuartos de Final" 
              duration={durationText} 
              notes="En caso de empate, tanda de penaltis al fallo." 
            />
            <div className="flex flex-col gap-8 items-center">
              {quarterFinals.map(m => renderMatch(m))}
            </div>
          </div>
        )}

        {/* Semis */}
        {hasSemiFinals && (
          <div className="flex flex-col snap-center min-w-[280px] justify-center">
            <PhaseInfo 
              title="Semifinales" 
              duration={durationText} 
              notes="Máxima intensidad. Penaltis al fallo en caso de empate." 
            />
            <div className="flex flex-col gap-32 items-center">
              {semiFinals.map(m => renderMatch(m))}
            </div>
          </div>
        )}

        {/* Finals & 3rd Place */}
        <div className="flex flex-col snap-center min-w-[320px] justify-center">
          <PhaseInfo 
            title="Fase Final" 
            duration={durationText} 
            notes="¡Suerte a los finalistas! Respeto ante todo." 
          />
          <div className="flex flex-col gap-12 items-center">
            <div className="relative pt-8">
              <motion.div 
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ repeat: Infinity, duration: 2, repeatType: "reverse" }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
              >
                <Trophy className="w-10 h-10 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              </motion.div>
              {renderMatch(finals[0], true)}
            </div>
            
            <div className="mt-4 w-full h-px bg-natural-border/30" />
            
            <div className="opacity-80 scale-95">
              <h4 className="text-[10px] font-black text-natural-text/30 uppercase tracking-[0.4em] text-center mb-4 italic">Medalla de Bronce</h4>
              {renderMatch(thirdPlace[0])}
            </div>
          </div>
        </div>

      </div>

      <div className="p-4 bg-natural-sidebar/50 rounded-3xl border border-natural-border/30 text-center mx-auto max-w-xs">
        <p className="text-[10px] text-natural-text/40 font-bold uppercase tracking-[0.2em]">
          Desliza horizontalmente para navegar
        </p>
      </div>
    </motion.div>
  );
};
