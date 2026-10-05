import React from 'react';
import { Team, MatchRecord, ScheduleMatch, Category } from '../types';
import { calculateStandings } from '../utils/standings';
import { getMatchWinner, getMatchLoser } from '../utils/match';

interface PdfReportProps {
  category: Category;
  teams: Team[];
  matches: MatchRecord[];
  schedule: ScheduleMatch[];
  standings: ReturnType<typeof calculateStandings>;
}

export const PdfReport: React.FC<PdfReportProps> = ({ category, teams, matches, schedule, standings }) => {
  const groupAStandings = standings.filter(t => t.group === 'A' && !t.isRest);
  const groupBStandings = standings.filter(t => t.group === 'B' && !t.isRest);
  
  const getPlayoffMatch = (idPrefix: string) => {
    return matches.find(m => m.id === `${category}_${idPrefix}`);
  };

  const getMatchScore = (m?: MatchRecord) => {
    if (!m || !m.played) return '-';
    let res = `${m.score1} - ${m.score2}`;
    if (m.penaltyScore1 !== undefined && m.penaltyScore2 !== undefined) {
      res += ` (P: ${m.penaltyScore1}-${m.penaltyScore2})`;
    }
    return res;
  };

  // Ranking calculation
  const finalMatch = getPlayoffMatch('F');
  const thirdFourthMatch = getPlayoffMatch('T');
  const sf1 = getPlayoffMatch('S1');
  const sf2 = getPlayoffMatch('S2');
  const c1 = getPlayoffMatch('C1');
  const c2 = getPlayoffMatch('C2');
  const c3 = getPlayoffMatch('C3');
  const c4 = getPlayoffMatch('C4');

  const top4Names = [
    getMatchWinner(finalMatch),
    getMatchLoser(finalMatch),
    getMatchWinner(thirdFourthMatch),
    getMatchLoser(thirdFourthMatch)
  ];

  const sfLosers = [getMatchLoser(sf1), getMatchLoser(sf2)].filter(Boolean);
  const isSFLoser = (name: string) => sfLosers.includes(name);

  const quarterLosers = [getMatchLoser(c1), getMatchLoser(c2), getMatchLoser(c3), getMatchLoser(c4)].filter(Boolean);
  const isQuarterLoser = (name: string) => quarterLosers.includes(name);

  const top4TeamIds = top4Names.filter(Boolean).map(name => {
    const t = teams.find(team => team.name === name);
    return t ? t.id : null;
  }).filter(Boolean);

  const sfLoserIds = sfLosers.map(name => teams.find(t => t.name === name)?.id).filter(Boolean);
  const quarterLoserIds = quarterLosers.map(name => teams.find(t => t.name === name)?.id).filter(Boolean);

  const remainingStandings = standings
    .filter(t => !top4TeamIds.includes(t.id) && !sfLoserIds.includes(t.id) && !quarterLoserIds.includes(t.id) && !t.isRest)
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const aDiff = a.goalsFor - a.goalsAgainst;
      const bDiff = b.goalsFor - b.goalsAgainst;
      if (aDiff !== bDiff) return bDiff - aDiff;
      return b.goalsFor - a.goalsFor;
    });

  const quarterLoserStandings = standings
    .filter(t => quarterLoserIds.includes(t.id) && !t.isRest)
    .sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      const aDiff = a.goalsFor - a.goalsAgainst;
      const bDiff = b.goalsFor - b.goalsAgainst;
      if (aDiff !== bDiff) return bDiff - aDiff;
      return b.goalsFor - a.goalsFor;
    });

  const finalRanking = [
    ...top4TeamIds.map(id => standings.find(s => s.id === id)!),
    ...quarterLoserStandings,
    ...remainingStandings
  ].filter(Boolean).slice(0, 12);

  return (
    <div id={`pdf-report-${category}`} className="bg-white text-slate-900 w-[1200px] font-sans p-16" style={{ position: 'absolute', top: -10000, left: -10000, width: '1200px' }}>
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-12">
        <div>
          <h1 className="text-6xl font-black uppercase tracking-tighter text-slate-900 mb-2">
            Intercentros 2026
          </h1>
          <h2 className="text-3xl font-bold text-slate-500 uppercase tracking-widest">
            Informe Oficial - Categoría {category === 'masculino' ? 'Masculina' : 'Femenina'}
          </h2>
        </div>
        <img src="/logocentros.png" alt="Logo" className="w-32 h-32 object-contain" />
      </div>

      {/* CLASIFICACIÓN FINAL */}
      <div className="mb-16 page-break-after-auto">
        <h3 className="text-3xl font-black uppercase tracking-widest bg-slate-900 text-white py-3 px-6 rounded-t-xl inline-block mb-0">Ranking Final</h3>
        <div className="bg-slate-50 rounded-b-xl rounded-tr-xl border-4 border-slate-900 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-200 text-slate-700 text-lg uppercase tracking-wider">
                <th className="py-4 px-6 font-black w-24 text-center">Pos</th>
                <th className="py-4 px-6 font-black">Equipo</th>
                <th className="py-4 px-6 font-black text-center w-32">Puntos T.</th>
              </tr>
            </thead>
            <tbody>
              {finalRanking.map((team, idx) => (
                <tr key={team.id} className="border-b-2 border-slate-200 last:border-0 bg-white">
                  <td className="py-4 px-6 text-center text-2xl font-black text-slate-400">
                    {idx + 1}º
                  </td>
                  <td className="py-4 px-6 text-2xl font-bold text-slate-800">
                    {team.name}
                  </td>
                  <td className="py-4 px-6 text-center text-3xl font-black text-blue-600">
                    {12 - idx}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ELIMINATORIAS */}
      <div className="mb-16 page-break-after-auto">
        <h3 className="text-3xl font-black uppercase tracking-widest bg-slate-900 text-white py-3 px-6 rounded-t-xl inline-block mb-0">Eliminatorias</h3>
        <div className="bg-white border-4 border-slate-900 rounded-b-xl rounded-tr-xl p-8 grid grid-cols-2 gap-x-12 gap-y-8">
          
          <div>
            <h4 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 border-b-2 border-slate-200 pb-2">Final y 3º/4º Puesto</h4>
            <div className="space-y-4">
              <MatchRow label="FINAL" match={finalMatch} />
              <MatchRow label="3º Y 4º PUESTO" match={thirdFourthMatch} />
            </div>
          </div>
          
          <div>
            <h4 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 border-b-2 border-slate-200 pb-2">Semifinales</h4>
            <div className="space-y-4">
              <MatchRow label="SEMIFINAL 1" match={sf1} />
              <MatchRow label="SEMIFINAL 2" match={sf2} />
            </div>
          </div>

          <div className="col-span-2 mt-4">
            <h4 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 border-b-2 border-slate-200 pb-2">Cuartos de Final</h4>
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <MatchRow label="CUARTOS 1" match={c1} />
              <MatchRow label="CUARTOS 2" match={c2} />
              <MatchRow label="CUARTOS 3" match={c3} />
              <MatchRow label="CUARTOS 4" match={c4} />
            </div>
          </div>
        </div>
      </div>

      {/* FASE DE GRUPOS - STANDINGS */}
      <div className="mb-16 grid grid-cols-2 gap-12 page-break-after-auto">
        <div>
          <h3 className="text-3xl font-black uppercase tracking-widest bg-blue-600 text-white py-3 px-6 rounded-t-xl inline-block mb-0">Grupo A</h3>
          <StandingsTable group={groupAStandings} />
        </div>
        <div>
          <h3 className="text-3xl font-black uppercase tracking-widest bg-red-600 text-white py-3 px-6 rounded-t-xl inline-block mb-0">Grupo B</h3>
          <StandingsTable group={groupBStandings} />
        </div>
      </div>

      {/* FOOTER */}
      <div className="text-center text-slate-400 text-sm font-medium pt-8 border-t-2 border-slate-200 mt-20">
        Documento generado automáticamente por el Sistema de Gestión Hockey Intercentros<br/>
        ogonzalezv01@educarex.es
      </div>

    </div>
  );
};

const StandingsTable = ({ group }: { group: any[] }) => (
  <div className="bg-white border-4 border-slate-900 rounded-b-xl rounded-tr-xl overflow-hidden">
    <table className="w-full text-left border-collapse text-sm">
      <thead>
        <tr className="bg-slate-100 text-slate-600 uppercase tracking-wider font-bold">
          <th className="py-3 px-4">Pos</th>
          <th className="py-3 px-4">Equipo</th>
          <th className="py-3 px-3 text-center">PTS</th>
          <th className="py-3 px-3 text-center">PJ</th>
          <th className="py-3 px-3 text-center">GF</th>
          <th className="py-3 px-3 text-center">GC</th>
        </tr>
      </thead>
      <tbody>
        {group.map((t, idx) => (
          <tr key={t.id} className="border-b border-slate-200 last:border-0">
            <td className="py-3 px-4 font-black text-slate-400">{idx + 1}</td>
            <td className="py-3 px-4 font-bold text-slate-800">{t.name}</td>
            <td className="py-3 px-3 text-center font-black text-blue-600">{t.points}</td>
            <td className="py-3 px-3 text-center font-medium">{t.played}</td>
            <td className="py-3 px-3 text-center font-medium">{t.goalsFor}</td>
            <td className="py-3 px-3 text-center font-medium">{t.goalsAgainst}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const MatchRow = ({ label, match }: { label: string, match?: MatchRecord }) => {
  if (!match) return (
    <div className="flex justify-between items-center py-3 px-5 bg-slate-50 rounded-xl border-2 border-dashed border-slate-300">
      <span className="text-sm font-bold text-slate-400">{label}</span>
      <span className="text-sm font-medium text-slate-300">No jugado</span>
    </div>
  );

  const scoreStr = match.played ? `${match.score1} - ${match.score2}${match.penaltyScore1 !== undefined ? ` (P: ${match.penaltyScore1}-${match.penaltyScore2})` : ''}` : 'Pendiente';

  return (
    <div className="flex flex-col py-3 px-5 bg-slate-50 rounded-xl border-2 border-slate-200">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</span>
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1">
          <span className={`text-base font-bold ${match.played && getMatchWinner(match) === match.team1 ? 'text-slate-900' : 'text-slate-600'}`}>{match.team1 || 'TBD'}</span>
          <span className={`text-base font-bold ${match.played && getMatchWinner(match) === match.team2 ? 'text-slate-900' : 'text-slate-600'}`}>{match.team2 || 'TBD'}</span>
        </div>
        <div className="text-xl font-black tracking-widest text-blue-600 bg-white px-3 py-1 rounded border-2 border-slate-200">
          {scoreStr}
        </div>
      </div>
    </div>
  );
};
