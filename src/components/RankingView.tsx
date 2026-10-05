import React from 'react';
import { Trophy, Medal, Award, Star, Share2 } from 'lucide-react';
import { Team, MatchRecord, Category, StandingTeam } from '../types';
import { getMatchWinner, getMatchLoser } from '../utils/match';
import { getComparisonName } from '../utils/standings';

interface RankingViewProps {
  groupAStandings: StandingTeam[];
  groupBStandings: StandingTeam[];
  standings: StandingTeam[];
  currentTeams: Team[];
  activeCategory: Category;
  matches: MatchRecord[];
  onTeamClick: (name: string) => void;
  format?: 'group-playoff' | 'league' | 'knockout';
  schedule?: any[];
}

export const RankingView: React.FC<RankingViewProps> = ({
  groupAStandings,
  groupBStandings,
  standings,
  currentTeams,
  activeCategory,
  matches,
  onTeamClick,
  format,
  schedule = [],
}) => {
  const findMatch = (t1Name?: string, t2Name?: string) => {
    if (!t1Name || !t2Name) return undefined;
    const t1Comp = getComparisonName(t1Name);
    const t2Comp = getComparisonName(t2Name);

    return matches.find(m => {
      if (m.group !== 'PLAYOFF' || !m.played || m.category !== activeCategory) return false;
      const m1Comp = getComparisonName(m.team1);
      const m2Comp = getComparisonName(m.team2);
      return (m1Comp === t1Comp && m2Comp === t2Comp) || (m1Comp === t2Comp && m2Comp === t1Comp);
    });
  };

  const getTeam = (name: string | null) => {
    if (!name) return undefined;
    const compName = getComparisonName(name);
    return currentTeams.find(t => getComparisonName(t.name) === compName);
  };

  const isLeague = format === 'league';
  const isKnockout = format === 'knockout';

  // Seed list for knockout format
  let koTeams = currentTeams.filter(t => t.category === activeCategory);
  koTeams = [...koTeams].sort((a, b) => a.name.localeCompare(b.name));

  const hasQuarterFinals = !isKnockout || koTeams.length > 4;
  const hasSemiFinals = !isKnockout || koTeams.length > 2;

  // Let's get top teams based on format
  let first: Team | undefined;
  let second: Team | undefined;
  let third: Team | undefined;
  let fourth: Team | undefined;
  let finMatchRecord: MatchRecord | undefined;
  let isFinished = false;

  if (isLeague) {
    // League format: champion is based on standing.
    // Check if league matches are complete
    const leagueMatches = schedule.filter(m => !m.isRestMatch);
    const playedLeagueMatches = matches.filter(m => m.category === activeCategory && m.played);
    isFinished = leagueMatches.length > 0 && playedLeagueMatches.length >= leagueMatches.length;

    // Use current standings
    first = standings[0];
    second = standings[1];
    third = standings[2];
    fourth = standings[3];
  } else {
    // Group-Playoff or pure Knockout format
    const q1 = hasQuarterFinals ? findMatch(isKnockout ? koTeams[0]?.name : groupAStandings[0]?.name, isKnockout ? koTeams[7]?.name : groupBStandings[3]?.name) : undefined;
    const q2 = hasQuarterFinals ? findMatch(isKnockout ? koTeams[3]?.name : groupBStandings[1]?.name, isKnockout ? koTeams[4]?.name : groupAStandings[2]?.name) : undefined;
    const q3 = hasQuarterFinals ? findMatch(isKnockout ? koTeams[1]?.name : groupBStandings[0]?.name, isKnockout ? koTeams[6]?.name : groupAStandings[3]?.name) : undefined;
    const q4 = hasQuarterFinals ? findMatch(isKnockout ? koTeams[2]?.name : groupAStandings[1]?.name, isKnockout ? koTeams[5]?.name : groupBStandings[2]?.name) : undefined;

    const s1 = findMatch(
      hasQuarterFinals ? getMatchWinner(q1)! : koTeams[0]?.name,
      hasQuarterFinals ? getMatchWinner(q2)! : koTeams[3]?.name
    );
    const s2 = findMatch(
      hasQuarterFinals ? getMatchWinner(q3)! : koTeams[1]?.name,
      hasQuarterFinals ? getMatchWinner(q4)! : koTeams[2]?.name
    );

    const t3p = findMatch(getMatchLoser(s1)!, getMatchLoser(s2)!);
    const fin = findMatch(getMatchWinner(s1)!, getMatchWinner(s2)!);
    finMatchRecord = fin;
    isFinished = !!fin;

    first = getTeam(getMatchWinner(fin)!);
    second = getTeam(getMatchLoser(fin)!);
    third = getTeam(getMatchWinner(t3p)!);
    fourth = getTeam(getMatchLoser(t3p)!);
  }

  // Remaining teams: those not in the top 4, ordered by total points
  const top4TeamIds = [first, second, third, fourth].filter(Boolean).map(t => t!.id);

  const allStandings = standings
    .filter(t => !top4TeamIds.includes(t.id))
    .sort((a, b) => {
      if (a.isRest) return 1;
      if (b.isRest) return -1;
      return b.pts - a.pts || b.gd - a.gd || b.gf - a.gf;
    });

  const finalRanking = [
    { pos: 1, team: first, icon: Trophy, color: 'text-yellow-500', label: 'CAMPEÓN' },
    { pos: 2, team: second, icon: Medal, color: 'text-slate-400', label: 'Subcampeón' },
    { pos: 3, team: third, icon: Medal, color: 'text-amber-600', label: 'Tercer Puesto' },
    { pos: 4, team: fourth, icon: Award, color: 'text-natural-primary', label: 'Cuarto Puesto' },
    ...allStandings.map((t, i) => ({ pos: i + 5, team: t, icon: Star, color: 'text-natural-text/20', label: '' }))
  ].slice(0, 12);

  const handleShare = async () => {
    const title = `Ranking Final Hockey ${activeCategory === 'masculino' ? 'Masculino' : 'Femenino'}`;
    const text = finalRanking
      .map(item => {
        const teamName = item.team 
          ? (activeCategory === 'femenino' && item.team.name === 'DESCANSA' ? 'IESO Galisteo' : item.team.name)
          : 'Por determinar';
        return `${item.pos}º: ${teamName} (${13 - item.pos} pts)`;
      })
      .join('\n');
      
    const shareContent = `*${title}*\n\n${text}\n\nConsulta más en: ${window.location.href}`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text: shareContent });
      } catch (err) { console.log('Error sharing:', err); }
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareContent)}`, '_blank');
    }
  };

  const isLeagueFinished = isFinished;

  return (
    <div className="space-y-6 pb-8" id="ranking-view">
      <div className="flex justify-center md:justify-end px-2">
        <button
          onClick={handleShare}
          disabled={!isLeagueFinished}
          className={`font-bold py-3 px-8 rounded-3xl shadow-lg transition-all active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center ${isLeagueFinished ? 'bg-[#25D366] hover:bg-[#128C7E] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none opacity-50'}`}
        >
          <Share2 className="w-6 h-6" />
          <span className="text-lg">Compartir Ranking</span>
        </button>
      </div>

      <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden">
        <div className="bg-natural-dark text-white p-6 font-serif text-center">
          <div className="text-sm uppercase tracking-[0.2em] opacity-60 mb-1">Clasificación Final</div>
          <div className="text-2xl font-black tracking-wider uppercase">{activeCategory}</div>
        </div>
        
        <div className="p-4 md:p-6">
          {isLeagueFinished ? (
            <div className="space-y-3">
              {finalRanking.map((item, index) => {
                const isTop4 = index < 4;
                if (!isTop4 && !item.team) return null;
                
                const Icon = item.icon;
                
                return (
                  <div 
                    key={index}
                    onClick={() => item.team && onTeamClick(item.team.name)}
                    className={`flex items-center gap-4 p-4 rounded-3xl border transition-all ${item.team ? 'cursor-pointer group' : 'cursor-default opacity-50'} ${index < 4 ? 'bg-natural-sidebar/20 border-natural-border' : 'bg-white border-natural-border/50 hover:border-natural-primary/30'}`}
                  >
                    <div className="flex flex-col items-center justify-center w-10 shrink-0">
                      <span className={`text-xl font-black ${item.color}`}>{item.pos}º</span>
                      <Icon className={`w-5 h-5 ${item.color}`} />
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {item.team ? (
                          <>
                            <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.team.color }}></div>
                            <span className="font-bold text-lg leading-tight">
                              {activeCategory === 'femenino' && item.team.name === 'DESCANSA' ? 'IESO Galisteo' : item.team.name}
                            </span>
                          </>
                        ) : (
                          <span className="font-bold text-lg leading-tight text-natural-text/30 italic">Por determinar</span>
                        )}
                      </div>
                      {item.label && (
                        <div className="text-[10px] uppercase font-black tracking-widest text-natural-primary mt-0.5">
                          {item.label}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end shrink-0">
                      <div className="text-xl font-black text-natural-primary leading-none">{13 - item.pos}</div>
                      <div className="text-[8px] uppercase font-bold opacity-40 tracking-tighter">Pts Gral.</div>
                    </div>
                    
                    {item.team && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity text-natural-primary ml-1">
                        <Star className="w-4 h-4 fill-current" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center text-center gap-6">
              <div className="w-20 h-20 bg-natural-sidebar/50 rounded-full flex items-center justify-center text-natural-primary animate-pulse">
                <Trophy className="w-10 h-10 opacity-30" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-black uppercase tracking-widest text-natural-dark">Torneo en curso</h3>
                <p className="text-sm text-natural-text/60 max-w-xs mx-auto leading-relaxed">
                  El ranking final con la puntuación general se calculará automáticamente al finalizar la <span className="font-black text-natural-primary">Gran Final</span>.
                </p>
              </div>
              <div className="flex gap-2 items-center bg-natural-primary/5 px-4 py-2 rounded-2xl border border-natural-primary/10">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-natural-primary">Esperando resultados</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
