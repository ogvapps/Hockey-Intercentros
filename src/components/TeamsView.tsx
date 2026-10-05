import React, { useState } from 'react';
import { Plus, Edit2, Trash2, ArrowLeft, CalendarDays, Timer, Activity, Palette, Users, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Team, StandingTeam, ScheduleMatch, MatchRecord, Category } from '../types';
import { TeamBadge } from './TeamBadge';
import { isMatchPlayed, getMatchResult } from '../utils/match';

interface TeamsViewProps {
  currentTeams: Team[];
  selectedTeam: string | null;
  setSelectedTeam: (t: string | null) => void;
  standings: StandingTeam[];
  schedule: ScheduleMatch[];
  matches: MatchRecord[];
  activeCategory: Category;
  isAdminUser: boolean;
  hasTeamsInDb: boolean;
  onSeedDatabase: () => void;
  onAddTeam: (category: Category) => void;
  onBulkAddTeams: (count: number, category: Category) => void;
  onUpdateTeam: (id: string, updates: Partial<Team>) => void;
  onDeleteTeam: (id: string) => void;
  onResetMatches: () => void;
  onSimulateTournament: () => void;
  requestPrompt: (title: string, defaultValue: string, onConfirm: (val: string) => void, placeholder?: string) => void;
  requestConfirm: (title: string, message: string, isDestructive: boolean, onConfirm: () => void) => void;
}

export const TeamsView: React.FC<TeamsViewProps> = ({
  currentTeams,
  selectedTeam,
  setSelectedTeam,
  standings,
  schedule,
  matches,
  activeCategory,
  isAdminUser,
  hasTeamsInDb,
  onSeedDatabase,
  onAddTeam,
  onBulkAddTeams,
  onUpdateTeam,
  onDeleteTeam,
  onResetMatches,
  onSimulateTournament,
  requestPrompt,
  requestConfirm,
}) => {
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [customCount, setCustomCount] = useState('');
  // Look up a team by name, preferring live Firebase data over static list
  const getTeam = (name: string) =>
    currentTeams.find(t => t.name === name) ?? undefined;

  const QUICK_COUNTS = [4, 5, 6, 7, 8, 10, 12];
  return (
  <motion.div
    initial={{ opacity: 0, y: 15 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3 }}
    className="space-y-8 pb-8"
    id="teams-view"
  >
    {isAdminUser && (
      <div className="bg-natural-sidebar/30 border border-natural-border p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-natural-primary/10 p-2 rounded-xl text-natural-primary">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-serif text-natural-dark font-bold">Panel de Control Admin</h3>
            <p className="text-[10px] text-natural-text/40 uppercase tracking-widest font-bold">Gestión de la categoría {activeCategory}</p>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          {!hasTeamsInDb ? (
            <button onClick={onSeedDatabase} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold py-2 px-6 rounded-xl shadow-sm transition-all active:scale-95 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" /> Inicializar Datos
            </button>
          ) : (
            <>
              <button 
                onClick={() => requestConfirm("Resetear Categoría", "¿Seguro que quieres borrar TODOS los partidos de esta categoría? Esta acción no se puede deshacer.", true, onResetMatches)}
                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white text-xs font-bold py-2 px-6 rounded-xl border border-red-500/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Resetear Partidos
              </button>
              <button 
                onClick={() => requestConfirm("Simular Torneo", "¿Quieres simular todos los resultados de esta categoría? Se generarán puntuaciones aleatorias para todos los partidos restantes.", false, onSimulateTournament)}
                className="bg-natural-primary/10 text-natural-primary hover:bg-natural-primary hover:text-white text-xs font-bold py-2 px-6 rounded-xl border border-natural-primary/20 transition-all active:scale-95 flex items-center gap-2"
              >
                <Activity className="w-4 h-4" /> Simular Todo
              </button>
            </>
          )}
        </div>
      </div>
    )}

    {!selectedTeam ? (
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-natural-border" id="team-selection">
        <h2 className="text-2xl font-serif text-natural-dark mb-8 text-center tracking-tight">Selecciona un Equipo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {currentTeams.filter(t => !t.isRest).map((team, idx) => (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.35 }}
              className="relative group"
            >
              <button
                onClick={() => setSelectedTeam(team.name)}
                className="w-full flex items-center gap-4 p-5 rounded-3xl border border-natural-border/50 hover:border-natural-primary hover:shadow-md transition-all bg-natural-sidebar/20 hover:bg-white text-left"
              >
                <div className="w-8 h-8 rounded-xl shadow-inner border border-white/20 shrink-0 transform group-hover:rotate-12 transition-transform" style={{ backgroundColor: team.color }} />
                <span className="font-bold text-natural-dark tracking-tight leading-tight">
                  {team.name
                    .replace('Colegio', 'Col.')
                    .replace(/^Virgen del Puerto$/, 'IES Virgen del Puerto')
                    .replace(/^San Calixto$/, 'Col. San Calixto')
                    .replace(/^Monfragüe$/, 'IES Monfragüe')
                  }
                </span>
              </button>
              {isAdminUser && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.createElement('input');
                      input.type = 'color';
                      input.value = team.color;
                      input.onchange = (ev) => {
                        onUpdateTeam(team.id, { color: (ev.target as HTMLInputElement).value });
                      };
                      input.click();
                    }}
                    className="p-1.5 bg-white/90 rounded-xl text-natural-primary hover:bg-white shadow-sm border border-natural-border"
                    title="Cambiar color"
                  >
                    <Palette className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      requestPrompt("Nuevo nombre:", team.name, (newName) => {
                        if (newName) onUpdateTeam(team.id, { name: newName });
                      });
                    }}
                    className="p-1.5 bg-white/90 rounded-xl text-natural-primary hover:bg-white shadow-sm border border-natural-border"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteTeam(team.id);
                    }}
                    className="p-1.5 bg-white/90 rounded-xl text-red-500 hover:bg-white shadow-sm border border-natural-border"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
          {isAdminUser && (
            <>
              <button
                onClick={() => onAddTeam(activeCategory)}
                className="flex items-center justify-center gap-3 p-5 rounded-3xl border-2 border-dashed border-natural-border hover:border-natural-primary hover:bg-natural-sidebar/10 transition-all text-natural-text/40 hover:text-natural-primary font-bold"
              >
                <Plus className="w-6 h-6" /> Añadir Equipo
              </button>
              <button
                onClick={() => setShowBulkPanel(!showBulkPanel)}
                className="flex items-center justify-center gap-3 p-5 rounded-3xl border-2 border-dashed border-violet-300 dark:border-violet-700 hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-all text-violet-400 hover:text-violet-600 font-bold"
              >
                <Zap className="w-6 h-6" /> Crear Automático
              </button>
            </>
          )}
        </div>

        {/* Bulk Create Panel */}
        <AnimatePresence initial={false}>
          {isAdminUser && showBulkPanel && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="mt-6 bg-gradient-to-br from-violet-50 to-indigo-50 dark:from-zinc-900 dark:to-zinc-800 border border-violet-200 dark:border-violet-800/40 rounded-[2rem] p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 bg-violet-500/10 rounded-xl">
                    <Users className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-violet-900 dark:text-violet-200 text-sm">Creación Rápida de Equipos</h3>
                    <p className="text-[10px] text-violet-500 dark:text-violet-400 font-medium">
                      Se distribuirán automáticamente en Grupo A y B • Categoría {activeCategory}
                    </p>
                  </div>
                </div>

                {/* Quick count buttons */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {QUICK_COUNTS.map(n => (
                    <motion.button
                      key={n}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        onBulkAddTeams(n, activeCategory);
                        setShowBulkPanel(false);
                      }}
                      className="relative px-5 py-3 bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-700 rounded-2xl font-black text-violet-700 dark:text-violet-300 hover:bg-violet-500 hover:text-white hover:border-violet-500 hover:shadow-lg hover:shadow-violet-500/20 transition-all text-sm group"
                    >
                      <span className="text-lg">{n}</span>
                      <span className="text-[9px] font-bold uppercase tracking-wider opacity-60 ml-1 group-hover:opacity-100">equipos</span>
                    </motion.button>
                  ))}
                </div>

                {/* Custom count */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-white dark:bg-zinc-800 border border-violet-200 dark:border-violet-700 rounded-2xl px-4 py-2.5 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all">
                    <Users className="w-4 h-4 text-violet-400 shrink-0" />
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={customCount}
                      onChange={e => setCustomCount(e.target.value)}
                      placeholder="Otro número..."
                      className="w-full bg-transparent outline-none text-sm font-bold text-violet-900 dark:text-violet-100 placeholder:text-violet-300 dark:placeholder:text-violet-500"
                    />
                  </div>
                  <button
                    onClick={() => {
                      const n = parseInt(customCount);
                      if (n >= 2 && n <= 24) {
                        onBulkAddTeams(n, activeCategory);
                        setShowBulkPanel(false);
                        setCustomCount('');
                      }
                    }}
                    disabled={!customCount || parseInt(customCount) < 2 || parseInt(customCount) > 24}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 dark:disabled:bg-violet-800 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 shadow-md disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Crear
                  </button>
                </div>

                <p className="text-[10px] text-violet-400 dark:text-violet-500 mt-3 text-center font-medium leading-relaxed">
                  ⚡ Los equipos se nombran automáticamente (Alfa, Bravo, Charlie...) con colores únicos.
                  <br />Después puedes renombrarlos y cambiarles el color individualmente.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    ) : (
      <div className="space-y-8" id="team-details">
        <button
          onClick={() => setSelectedTeam(null)}
          className="flex items-center gap-2 text-natural-primary font-bold hover:text-natural-dark transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-natural-border w-max active:scale-95"
        >
          <ArrowLeft className="w-5 h-5" /> Volver a lista de equipos
        </button>

        {/* Team Header Card */}
        <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden relative" id="team-header">
          <div className="absolute top-0 left-0 w-full h-4 bg-natural-primary shadow-sm" style={{ backgroundColor: getTeam(selectedTeam)?.color }} />
          <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left mt-4">
            <div 
              className={`w-24 h-24 rounded-3xl shadow-lg border-4 border-white shrink-0 -rotate-3 ${isAdminUser ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`} 
              style={{ backgroundColor: getTeam(selectedTeam)?.color }}
              onClick={() => {
                if (isAdminUser) {
                  const team = getTeam(selectedTeam);
                  if (!team) return;
                  const input = document.createElement('input');
                  input.type = 'color';
                  input.value = team.color;
                  input.onchange = (ev) => {
                    onUpdateTeam(team.id, { color: (ev.target as HTMLInputElement).value });
                  };
                  input.click();
                }
              }}
              title={isAdminUser ? "Haz clic para cambiar el color" : undefined}
            />
            <div className="flex-1">
              <h2 className="text-3xl md:text-4xl font-serif text-natural-dark mb-3 tracking-tight">
                {selectedTeam
                  ?.replace('Colegio', 'Col.')
                  .replace(/^Virgen del Puerto$/, 'IES Virgen del Puerto')
                  .replace(/^San Calixto$/, 'Col. San Calixto')
                  .replace(/^Monfragüe$/, 'IES Monfragüe')
                }
              </h2>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <span className={`text-[10px] font-bold px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm ${activeCategory === 'masculino' ? 'bg-[#E3F2FD] text-[#2196F3]' : 'bg-[#F3E5F5] text-[#9C27B0]'}`}>
                  Categoría {activeCategory}
                </span>
                <span className="text-[10px] font-bold px-4 py-1.5 rounded-full bg-natural-sidebar text-natural-text border border-natural-border uppercase tracking-widest shadow-sm">
                  Grupo {getTeam(selectedTeam)?.group}
                </span>
              </div>
            </div>
            {(() => {
              const stats = standings.find(t => t.name === selectedTeam);
              if (!stats) return null;
              return (
                <div className="bg-natural-bg p-6 rounded-[32px] border border-natural-border shadow-inner shrink-0 min-w-[160px] text-center transform hover:scale-105 transition-transform">
                  <div className="text-natural-text/50 text-[10px] font-bold uppercase tracking-widest mb-2">Puntos Liga</div>
                  <div className="text-5xl font-serif italic text-natural-primary">{stats.pts}</div>
                  <div className="text-xs font-bold text-natural-text/40 mt-3 tracking-tighter">{stats.w}V — {stats.d}E — {stats.l}D</div>
                  <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-natural-border/50">
                    <div>
                      <div className="text-[8px] font-bold text-natural-text/40 uppercase">GF</div>
                      <div className="text-sm font-bold text-natural-primary">{stats.gf}</div>
                    </div>
                    <div>
                      <div className="text-[8px] font-bold text-natural-text/40 uppercase">GA</div>
                      <div className="text-sm font-bold text-red-400">{stats.ga}</div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Team Schedule */}
        <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden" id="team-schedule">
          <div className="bg-natural-dark text-white p-5 font-serif text-xl tracking-wide flex items-center justify-center gap-3">
            <div className="w-10 h-10 bg-natural-primary/20 rounded-xl flex items-center justify-center">
              <CalendarDays className="w-6 h-6 text-white" />
            </div>
            Partidos Programados
          </div>
          <div className="p-4 md:p-8 divide-y divide-natural-border/30">
            {schedule.filter(m => m.team1.name === selectedTeam || m.team2.name === selectedTeam).map(m => {
              const played = isMatchPlayed(matches, activeCategory, m.team1.name, m.team2.name);
              const result = getMatchResult(matches, activeCategory, m.team1.name, m.team2.name);

              if (m.isRestMatch) {
                return (
                  <div key={m.id} className="flex flex-col py-5 opacity-50 bg-natural-bg/30 rounded-3xl -mx-2 px-4 mb-4">
                    <div className="flex justify-between items-center mb-3 px-1">
                      <span className="flex items-center gap-2 font-bold text-natural-text/40 uppercase tracking-widest text-sm md:text-base"><Timer className="w-5 h-5" /> {m.time} <span className="text-natural-border">|</span> Jornada {m.round}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 p-4 rounded-2xl border bg-natural-sidebar border-natural-border/50 shadow-sm">
                      <div className="flex-1 min-w-0">
                        {m.team1.isRest ? <span className="text-natural-text/40 font-bold text-sm sm:text-base ml-2">DESCANSA</span> : <TeamBadge team={m.team1} interactive={false} />}
                      </div>
                      <div className="text-[10px] sm:text-xs font-bold text-natural-text/10 px-1 shrink-0 uppercase italic font-serif">vs</div>
                      <div className="flex-1 min-w-0 flex justify-end">
                        {m.team2.isRest ? <span className="text-natural-text/40 font-bold text-sm sm:text-base mr-2">DESCANSA</span> : <TeamBadge team={m.team2} reverse={true} interactive={false} />}
                      </div>
                      <div className="ml-3 sm:ml-6 shrink-0">
                        <span className="text-natural-text/40 font-bold text-[10px] uppercase bg-natural-border/50 px-3 py-1.5 rounded-full tracking-widest">Descanso</span>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} className={`flex flex-col py-6 ${played ? 'opacity-70 bg-natural-bg/30 rounded-3xl -mx-2 px-4 mb-4 border border-natural-border/20' : ''}`}>
                  <div className="flex justify-between items-center mb-4 px-1">
                    <span className="flex items-center gap-2 font-bold text-natural-dark uppercase tracking-widest text-sm md:text-base font-serif italic"><Timer className="w-5 h-5 text-natural-primary" /> {m.time} <span className="text-natural-border mx-2">|</span> Jornada {m.round}</span>
                  </div>
                  <div className={`flex items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl border transition-all ${played ? 'bg-white border-natural-border' : 'bg-natural-sidebar/40 border-natural-primary/20 shadow-sm'}`}>
                    <div className="flex-1 min-w-0"><TeamBadge team={m.team1} interactive={false} /></div>
                    <div className="text-[11px] sm:text-xs font-bold text-natural-text/20 px-1 shrink-0 italic font-serif">vs</div>
                    <div className="flex-1 min-w-0 flex justify-end"><TeamBadge team={m.team2} reverse={true} interactive={false} /></div>
                    <div className="ml-3 sm:ml-6 shrink-0">
                      {played ? (
                        <span className="bg-natural-dark text-white px-4 py-2 rounded-xl font-bold text-sm shadow-md">{result}</span>
                      ) : (
                        <span className="text-natural-primary font-bold text-[10px] uppercase bg-[#E8F5E9] px-3 py-1.5 rounded-full tracking-widest flex items-center gap-1.5 shadow-sm border border-[#C8E6C9]"><Activity className="w-3 h-3" /> Pendiente</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
  </motion.div>
  );
};
