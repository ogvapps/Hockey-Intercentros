import React from 'react';
import { motion } from 'framer-motion';
import { StandingTeam } from '../types';
import { TeamBadge } from './TeamBadge';
import { Trophy, LayoutGrid } from 'lucide-react';

interface StandingsTableProps {
  title: string;
  headerBg: string;
  standings: StandingTeam[];
  highlightColor: string;
  highlightBg: string;
  onTeamClick: (name: string) => void;
  id: string;
  scoreLabelPlural: string;
}

const StandingsTable: React.FC<StandingsTableProps> = ({ 
  title, headerBg, standings, highlightColor, highlightBg, onTeamClick, scoreLabelPlural 
}) => {
  const isMasculino = standings[0]?.category === 'masculino';

  return (
    <div className="bg-natural-card rounded-[1.5rem] md:rounded-[2.5rem] shadow-2xl overflow-hidden border border-natural-border/40 group hover:shadow-natural-primary/5 transition-all duration-500">
      <div className={`${headerBg} p-4 md:p-6 flex items-center justify-between relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-50" />
        <div className="flex items-center gap-3 md:gap-4 relative">
          <div className="p-2 md:p-3 bg-white/20 rounded-xl md:rounded-2xl backdrop-blur-xl border border-white/20 shadow-inner">
            <LayoutGrid className="w-5 h-5 md:w-6 md:h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight uppercase leading-none">{title}</h2>
            <p className="text-white/60 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] mt-1">Fase de Grupos</p>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-natural-primary/20 scrollbar-track-transparent">
        <table className="w-full border-collapse min-w-[850px]">
          <thead>
            <tr className="bg-natural-sidebar/30">
              <th className="sticky left-0 z-30 bg-natural-sidebar p-2 md:p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30 border-r border-white/10 w-7 md:w-16" title="Posición">Pos</th>
              <th className="sticky left-7 md:left-16 z-30 bg-natural-sidebar p-2 md:p-3 text-left text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30 border-r border-white/10" title="Equipo">Equipo</th>
              <th className="sticky left-[167px] md:left-[216px] z-30 bg-natural-sidebar p-2 md:p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30 border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.1)] w-12 md:w-20" title="Puntos">Pts</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title="Partidos Jugados">PJ</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title="Partidos Ganados">PG</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title="Partidos Empatados">PE</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title="Partidos Perdidos">PP</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title={`${scoreLabelPlural} a Favor`}>GF</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title={`${scoreLabelPlural} en Contra`}>GC</th>
              <th className="w-10 md:w-12 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30 text-natural-primary" title={`Diferencia de ${scoreLabelPlural}`}>GD</th>
              <th className="w-24 md:w-32 p-3 text-center text-[9px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/30" title="Últimos resultados">Racha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-natural-border/10">
            {standings.map((team, index) => {
              const isPlayoffZone = index < 4;
              // Use solid colors for sticky columns to prevent transparency issues
              const baseStickyClass = isPlayoffZone 
                ? (isMasculino ? 'bg-blue-50' : 'bg-fuchsia-50') 
                : 'bg-white';
              
              return (
                <motion.tr
                  key={team.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                  className={`group/row transition-all duration-300 ${
                    isPlayoffZone 
                      ? `${highlightBg} border-l-4 ${highlightColor.replace('text-', 'border-')} shadow-sm` 
                      : 'hover:bg-natural-sidebar/20'
                  }`}
                >
                  <td className={`sticky left-0 z-10 ${baseStickyClass} p-2 md:p-4 text-center border-r border-white/5 w-7`}>
                    <span className={`text-sm md:text-xl font-black italic ${isPlayoffZone ? highlightColor : 'text-natural-text/10'}`}>
                      {index + 1}º
                    </span>
                  </td>
                  <td className={`sticky left-7 md:left-16 z-10 ${baseStickyClass} p-2 md:p-4 border-r border-white/5 w-[140px] md:w-auto overflow-hidden`}>
                    <div className="font-bold text-natural-dark truncate">
                      <TeamBadge team={team} interactive={true} onTeamClick={onTeamClick} />
                    </div>
                  </td>
                  <td className={`sticky left-[167px] md:left-[216px] z-10 ${baseStickyClass} p-2 md:p-4 text-center border-r border-white/10 shadow-[4px_0_10px_rgba(0,0,0,0.05)] w-12 md:w-20`}>
                    <div className="flex justify-center w-full">
                      <span className={`text-xs md:text-base font-black min-w-[24px] md:min-w-[32px] px-1.5 md:px-3 py-1 rounded-lg ${isPlayoffZone ? `${highlightBg} ${highlightColor}` : 'text-natural-dark bg-natural-sidebar/40'}`}>
                        {team.pts}
                      </span>
                    </div>
                  </td>





                  <td className="p-2 md:p-4 text-center text-natural-text/50 font-bold text-xs md:text-sm">{team.p}</td>
                  <td className="p-2 md:p-4 text-center text-green-500/50 font-bold text-xs md:text-sm">{team.w}</td>
                  <td className="p-2 md:p-4 text-center text-natural-text/30 font-bold text-xs md:text-sm">{team.d}</td>
                  <td className="p-2 md:p-4 text-center text-red-500/50 font-bold text-xs md:text-sm">{team.l}</td>
                  <td className="p-2 md:p-4 text-center text-natural-text/40 font-bold text-xs md:text-sm">{team.gf}</td>
                  <td className="p-2 md:p-4 text-center text-natural-text/40 font-bold text-xs md:text-sm">{team.ga}</td>
                  <td className="p-2 md:p-4 text-center">
                    <span className={`font-black text-xs md:text-sm ${team.gd > 0 ? 'text-natural-primary' : team.gd < 0 ? 'text-red-500' : 'text-natural-text/40'}`}>
                      {team.gd > 0 ? `+${team.gd}` : team.gd}
                    </span>
                  </td>
                  <td className="p-2 md:p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {team.form?.map((result, i) => (
                        <div 
                          key={i}
                          className={`w-4 h-4 md:w-5 md:h-5 rounded-md flex items-center justify-center text-[8px] md:text-[10px] font-black
                            ${result === 'W' ? 'bg-green-500/20 text-green-500' : result === 'L' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}
                        >
                          {result}
                        </div>
                      ))}
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-4 md:p-6 bg-natural-sidebar/10 border-t border-natural-border/20 space-y-4">
        <div className="flex items-center justify-center gap-8">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 md:w-4 md:h-4 rounded-lg ${highlightBg} border-2 ${highlightColor.replace('text-', 'border-')} shadow-sm`}></div>
            <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest text-natural-text/40">Zona Clasificación Playoff</span>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 px-2">
          {[
            { a: 'Pts', m: 'Puntos' },
            { a: 'PJ', m: 'Partidos Jugados' },
            { a: 'PG', m: 'Ganados' },
            { a: 'PE', m: 'Empatados' },
            { a: 'PP', m: 'Perdidos' },
            { a: 'GF', m: `${scoreLabelPlural} Favor` },
            { a: 'GC', m: `${scoreLabelPlural} Contra` },
            { a: 'GD', m: 'Diferencia' }
          ].map(item => (
            <div key={item.a} className="flex items-center gap-1.5">
              <span className="text-[9px] font-black text-natural-primary/60 uppercase">{item.a}:</span>
              <span className="text-[9px] font-bold text-natural-text/30 uppercase">{item.m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

interface StandingsViewProps {
  groupAStandings: StandingTeam[];
  groupBStandings: StandingTeam[];
  exportText: string;
  isAdminUser: boolean;
  onTeamClick: (name: string) => void;
  scoreLabelPlural: string;
}

export const StandingsView: React.FC<StandingsViewProps> = ({ 
  groupAStandings, groupBStandings, exportText, isAdminUser, onTeamClick, scoreLabelPlural 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8 md:space-y-12 pb-16"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 px-2">
        <div className="space-y-1 md:space-y-2">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-natural-primary/10 rounded-xl md:rounded-2xl">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-natural-primary drop-shadow-sm" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-natural-dark tracking-tighter uppercase italic leading-none">
              Clasificaciones
            </h1>
          </div>
          <p className="text-natural-text/40 text-[10px] md:text-sm font-bold uppercase tracking-widest ml-1">
            Resultados en vivo • Fase de Grupos
          </p>
        </div>
      </div>

      <div className={`grid grid-cols-1 ${groupBStandings.length > 0 ? 'xl:grid-cols-2' : ''} gap-6 md:gap-10`}>
        <StandingsTable 
          title={groupBStandings.length > 0 ? "Grupo A" : "Clasificación General"}
          headerBg="bg-natural-primary"
          standings={groupAStandings}
          highlightColor="text-natural-primary"
          highlightBg="bg-natural-primary/10"
          onTeamClick={onTeamClick}
          id="standings-group-a"
          scoreLabelPlural={scoreLabelPlural}
        />
        {groupBStandings.length > 0 && (
          <StandingsTable 
            title="Grupo B"
            headerBg="bg-natural-dark"
            standings={groupBStandings}
            highlightColor="text-blue-500"
            highlightBg="bg-blue-500/10"
            onTeamClick={onTeamClick}
            id="standings-group-b"
            scoreLabelPlural={scoreLabelPlural}
          />
        )}
      </div>
    </motion.div>
  );
};
