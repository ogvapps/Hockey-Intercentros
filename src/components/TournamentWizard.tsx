import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Plus, Trash2, Wand2, Check } from 'lucide-react';
import { SPORTS, SportDefinition } from '../constants/sports';
import { Team } from '../types';

interface TournamentWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: WizardResult) => void;
}

export interface WizardResult {
  sport: SportDefinition;
  tournamentName: string;
  categories: string[];
  teams: Record<string, { name: string; color: string }[]>; // keyed by category
  format: 'group-playoff' | 'league' | 'knockout';
  startTime: string;
  endTime: string;
  concurrentCourts: number;
  restDuration: number;
  matchDuration: number;
}

/** The knockout bracket supports up to quarter-finals (8 seeds, with byes below that). */
const MAX_KNOCKOUT_TEAMS = 8;

const COLORS = [
  '#2563eb', '#dc2626', '#16a34a', '#f97316', '#7c3aed', '#ec4899',
  '#0891b2', '#eab308', '#6366f1', '#14b8a6', '#f43f5e', '#8b5cf6',
  '#0ea5e9', '#84cc16', '#a855f7', '#ef4444',
];

export const TournamentWizard: React.FC<TournamentWizardProps> = ({ isOpen, onClose, onComplete }) => {
  const [step, setStep] = useState(0);
  const [selectedSport, setSelectedSport] = useState<SportDefinition>(SPORTS[0]);
  const [tournamentName, setTournamentName] = useState('Intercentros 2026');
  const [format, setFormat] = useState<'group-playoff' | 'league' | 'knockout'>('group-playoff');
  const [categories, setCategories] = useState<string[]>(['masculino', 'femenino']);
  const [categoryInput, setCategoryInput] = useState('');
  const [activeEditCategory, setActiveEditCategory] = useState(0);
  const [teamsByCategory, setTeamsByCategory] = useState<Record<string, { name: string; color: string }[]>>({});

  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('14:00');
  const [concurrentCourts, setConcurrentCourts] = useState(2);
  const [restDuration, setRestDuration] = useState(2);

  const ensureTeams = (cat: string) => {
    if (!teamsByCategory[cat]) {
      setTeamsByCategory(prev => ({ ...prev, [cat]: [] }));
    }
  };

  const addTeam = (cat: string) => {
    const current = teamsByCategory[cat] || [];
    if (current.length >= 16) return;
    const color = COLORS[current.length % COLORS.length];
    setTeamsByCategory(prev => ({
      ...prev,
      [cat]: [...(prev[cat] || []), { name: '', color }]
    }));
  };

  const removeTeam = (cat: string, idx: number) => {
    setTeamsByCategory(prev => ({
      ...prev,
      [cat]: (prev[cat] || []).filter((_, i) => i !== idx)
    }));
  };

  const updateTeam = (cat: string, idx: number, field: 'name' | 'color', value: string) => {
    setTeamsByCategory(prev => ({
      ...prev,
      [cat]: (prev[cat] || []).map((t, i) => i === idx ? { ...t, [field]: value } : t)
    }));
  };

  const copyTeamsToOtherCategories = (sourceCat: string) => {
    const sourceTeams = teamsByCategory[sourceCat] || [];
    const updated = { ...teamsByCategory };
    categories.forEach(cat => {
      if (cat !== sourceCat) {
        updated[cat] = sourceTeams.map(t => ({ ...t }));
      }
    });
    setTeamsByCategory(updated);
  };

  const currentCatTeams = teamsByCategory[categories[activeEditCategory]] || [];
  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedSport;
      case 1: return tournamentName.trim().length > 0 && categories.length > 0;
      case 2: return categories.every(cat => {
        const t = teamsByCategory[cat] || [];
        return t.length >= 4 && (format !== 'knockout' || t.length <= MAX_KNOCKOUT_TEAMS) && t.every(team => team.name.trim().length > 0);
      });
      case 3: return true;
      default: return false;
    }
  };

  const handleComplete = () => {
    // Recalculate matchDuration right here for safety, or we could store it in state.
    let totalMatches = 0;
    categories.forEach(cat => {
      const teams = teamsByCategory[cat] || [];
      const N = teams.length;
      if (N < 2) return;
      if (format === 'group-playoff') {
        const n1 = Math.ceil(N / 2);
        const n2 = N - n1;
        totalMatches += (n1 * (n1 - 1)) / 2;
        totalMatches += (n2 * (n2 - 1)) / 2;
        const playoffTeams = Math.min(n1, 4) * 2;
        if (playoffTeams >= 8) totalMatches += 8;
        else if (playoffTeams >= 4) totalMatches += 4;
        else if (playoffTeams >= 2) totalMatches += 1;
      } else if (format === 'league') {
        totalMatches += (N * (N - 1)) / 2;
      } else if (format === 'knockout') {
        totalMatches += (N - 1);
      }
    });

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };
    const startM = parseTime(startTime);
    const endM = parseTime(endTime);
    let totalMinutes = endM - startM;
    if (totalMinutes < 0) totalMinutes += 24 * 60;
    const totalSlots = Math.ceil(totalMatches / Math.max(1, concurrentCourts));
    const maxDurationPerMatch = totalSlots > 0 ? Math.floor(totalMinutes / totalSlots) : 0;
    const suggestedMatchTime = Math.max(0, maxDurationPerMatch - restDuration);

    onComplete({
      sport: selectedSport,
      tournamentName,
      categories,
      teams: teamsByCategory,
      format,
      startTime,
      endTime,
      concurrentCourts,
      restDuration,
      matchDuration: suggestedMatchTime * 60 // store in seconds
    });
  };

  let totalMatches = 0;
  categories.forEach(cat => {
    const teams = teamsByCategory[cat] || [];
    const N = teams.length;
    if (N < 2) return;
    if (format === 'group-playoff') {
      const n1 = Math.ceil(N / 2);
      const n2 = N - n1;
      totalMatches += (n1 * (n1 - 1)) / 2;
      totalMatches += (n2 * (n2 - 1)) / 2;
      const playoffTeams = Math.min(n1, 4) * 2;
      if (playoffTeams >= 8) totalMatches += 8;
      else if (playoffTeams >= 4) totalMatches += 4;
      else if (playoffTeams >= 2) totalMatches += 1;
    } else if (format === 'league') {
      totalMatches += (N * (N - 1)) / 2;
    } else if (format === 'knockout') {
      totalMatches += (N - 1);
    }
  });

  const parseTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const startM = parseTime(startTime);
  const endM = parseTime(endTime);
  let totalMinutes = endM - startM;
  if (totalMinutes < 0) totalMinutes += 24 * 60;
  const totalSlots = Math.ceil(totalMatches / Math.max(1, concurrentCourts));
  const maxDurationPerMatch = totalSlots > 0 ? Math.floor(totalMinutes / totalSlots) : 0;
  const suggestedMatchTime = Math.max(0, maxDurationPerMatch - restDuration);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-natural-card rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-natural-border">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-natural-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-natural-primary/10 flex items-center justify-center text-xl">
              <Wand2 className="w-5 h-5 text-natural-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black text-natural-dark">Crear Torneo</h2>
              <p className="text-xs text-natural-text/50">Paso {step + 1} de 4</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-natural-sidebar transition-colors">
            <X className="w-5 h-5 text-natural-text/40" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-natural-sidebar">
          <div className="h-full bg-natural-primary transition-all duration-500" style={{ width: `${((step + 1) / 4) * 100}%` }} />
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* ── STEP 0: Sport ── */}
          {step === 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-natural-text/40">Elige el deporte</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SPORTS.map(sport => (
                  <button
                    key={sport.id}
                    onClick={() => setSelectedSport(sport)}
                    className={`p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedSport.id === sport.id
                        ? 'border-natural-primary bg-natural-primary/5 shadow-md'
                        : 'border-natural-border hover:border-natural-primary/30'
                    }`}
                  >
                    <div className="text-3xl mb-2">{sport.icon}</div>
                    <div className="font-bold text-sm text-natural-dark">{sport.name}</div>
                    <div className="text-[10px] text-natural-text/40 mt-0.5">
                      {sport.scoreLabel} · {sport.defaultDuration > 0 ? `${Math.floor(sport.defaultDuration / 60)} min` : 'Sin tiempo'}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 1: Tournament info ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-black uppercase tracking-widest text-natural-text/40 block mb-2">Nombre del torneo</label>
                <input
                  type="text"
                  value={tournamentName}
                  onChange={e => setTournamentName(e.target.value)}
                  placeholder="Ej: Intercentros 2026"
                  className="w-full px-4 py-3 rounded-2xl border border-natural-border bg-natural-bg text-natural-dark font-bold focus:outline-none focus:border-natural-primary transition-colors"
                />
              </div>
              
              <div>
                <label className="text-sm font-black uppercase tracking-widest text-natural-text/40 block mb-2">Formato de Competición</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'group-playoff', label: 'Grupos + Playoff', desc: 'Fase de grupos A/B y cruces' },
                    { id: 'league', label: 'Liga Única', desc: 'Todos contra todos (sin grupos)' },
                    { id: 'knockout', label: 'Eliminatoria', desc: 'Torneo del K.O. directo' }
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setFormat(f.id as any)}
                      className={`p-3 rounded-xl border-2 transition-all text-left ${
                        format === f.id
                          ? 'border-natural-primary bg-natural-primary/5 shadow-md'
                          : 'border-natural-border hover:border-natural-primary/30'
                      }`}
                    >
                      <div className="font-bold text-sm text-natural-dark">{f.label}</div>
                      <div className="text-[10px] text-natural-text/50 mt-1 leading-tight">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-black uppercase tracking-widest text-natural-text/40 block mb-2">Planificación y Horarios</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-natural-text/50 block mb-1">Inicio</span>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-natural-border bg-natural-bg text-natural-dark text-sm focus:outline-none focus:border-natural-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-natural-text/50 block mb-1">Fin</span>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-natural-border bg-natural-bg text-natural-dark text-sm focus:outline-none focus:border-natural-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-natural-text/50 block mb-1">Pistas</span>
                    <input type="number" min="1" max="10" value={concurrentCourts} onChange={e => setConcurrentCourts(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-natural-border bg-natural-bg text-natural-dark text-sm focus:outline-none focus:border-natural-primary" />
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-natural-text/50 block mb-1">Descanso (min)</span>
                    <input type="number" min="0" max="30" value={restDuration} onChange={e => setRestDuration(Number(e.target.value))} className="w-full px-3 py-2 rounded-xl border border-natural-border bg-natural-bg text-natural-dark text-sm focus:outline-none focus:border-natural-primary" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-black uppercase tracking-widest text-natural-text/40 block mb-2">Categorías</label>
                <div className="space-y-2">
                  {categories.map((cat, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={cat}
                        onChange={e => {
                          const updated = [...categories];
                          updated[idx] = e.target.value;
                          setCategories(updated);
                        }}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-natural-border bg-natural-bg text-natural-dark font-semibold focus:outline-none focus:border-natural-primary"
                      />
                      {categories.length > 1 && (
                        <button onClick={() => setCategories(categories.filter((_, i) => i !== idx))} className="p-2 text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={categoryInput}
                      onChange={e => setCategoryInput(e.target.value)}
                      placeholder="Añadir categoría..."
                      className="flex-1 px-4 py-2 rounded-xl border border-dashed border-natural-border bg-natural-bg text-natural-dark focus:outline-none focus:border-natural-primary text-sm"
                      onKeyDown={e => {
                        if (e.key === 'Enter' && categoryInput.trim()) {
                          setCategories([...categories, categoryInput.trim()]);
                          setCategoryInput('');
                        }
                      }}
                    />
                    <button
                      onClick={() => { if (categoryInput.trim()) { setCategories([...categories, categoryInput.trim()]); setCategoryInput(''); }}}
                      className="px-3 py-2 rounded-xl bg-natural-primary text-white text-sm font-bold"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 2: Teams ── */}
          {step === 2 && (
            <div className="space-y-4">
              {categories.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map((cat, idx) => (
                    <button
                      key={idx}
                      onClick={() => { setActiveEditCategory(idx); ensureTeams(cat); }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                        activeEditCategory === idx
                          ? 'bg-natural-primary text-white shadow-md'
                          : 'bg-natural-sidebar text-natural-text/60 hover:bg-natural-sidebar/80'
                      }`}
                    >
                      {cat} ({(teamsByCategory[cat] || []).length})
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase tracking-widest text-natural-text/40">
                  Equipos — {categories[activeEditCategory]} ({currentCatTeams.length}/16)
                </h3>
                {categories.length > 1 && currentCatTeams.length > 0 && (
                  <button
                    onClick={() => copyTeamsToOtherCategories(categories[activeEditCategory])}
                    className="text-xs font-bold text-natural-primary hover:underline"
                  >
                    Copiar a las demás categorías
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {currentCatTeams.map((team, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-xs font-black text-natural-text/30 w-5 text-right">{idx + 1}</span>
                    <input
                      type="color"
                      value={team.color}
                      onChange={e => updateTeam(categories[activeEditCategory], idx, 'color', e.target.value)}
                      className="w-8 h-8 rounded-lg border border-natural-border cursor-pointer"
                    />
                    <input
                      type="text"
                      value={team.name}
                      onChange={e => updateTeam(categories[activeEditCategory], idx, 'name', e.target.value)}
                      placeholder={`Equipo ${idx + 1}`}
                      className="flex-1 px-3 py-2 rounded-xl border border-natural-border bg-natural-bg text-natural-dark font-semibold focus:outline-none focus:border-natural-primary text-sm"
                    />
                    <button onClick={() => removeTeam(categories[activeEditCategory], idx)} className="p-1.5 text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {currentCatTeams.length < 16 && (
                <button
                  onClick={() => addTeam(categories[activeEditCategory])}
                  className="w-full py-3 rounded-2xl border-2 border-dashed border-natural-border hover:border-natural-primary text-natural-text/40 hover:text-natural-primary transition-all text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Añadir equipo
                </button>
              )}

              {currentCatTeams.length < 4 && (
                <div className="text-xs text-red-500 font-bold text-center">
                  Mínimo 4 equipos por categoría
                </div>
              )}

              {format === 'knockout' && currentCatTeams.length > MAX_KNOCKOUT_TEAMS && (
                <div className="text-xs text-red-500 font-bold text-center">
                  La eliminatoria directa admite un máximo de {MAX_KNOCKOUT_TEAMS} equipos por categoría
                </div>
              )}
            </div>
          )}

          {/* ── STEP 3: Summary ── */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-natural-text/40">Resumen del torneo</h3>
              
              <div className="bg-natural-sidebar/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedSport.icon}</span>
                  <div>
                    <div className="font-black text-natural-dark text-lg">{tournamentName}</div>
                    <div className="text-xs text-natural-text/50">{selectedSport.name} · {selectedSport.scoreLabel}</div>
                  </div>
                </div>

                {categories.map(cat => {
                  const teams = teamsByCategory[cat] || [];
                  const perGroup = Math.ceil(teams.length / 2);
                  const playoffTeams = Math.min(perGroup, 4) * 2;
                  const format = playoffTeams >= 8 ? 'Cuartos + Semis + Final' : playoffTeams >= 4 ? 'Semis + Final' : 'Final directa';
                  
                  return (
                    <div key={cat} className="border border-natural-border rounded-xl p-3">
                      <div className="font-bold text-sm text-natural-dark mb-2 capitalize">{cat}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-natural-bg rounded-lg p-2">
                          <span className="text-natural-text/40 block">Equipos</span>
                          <span className="font-black text-natural-dark">{teams.length}</span>
                        </div>
                        <div className="bg-natural-bg rounded-lg p-2">
                          <span className="text-natural-text/40 block">Grupos</span>
                          <span className="font-black text-natural-dark">A ({perGroup}) + B ({teams.length - perGroup})</span>
                        </div>
                        <div className="bg-natural-bg rounded-lg p-2 col-span-2">
                          <span className="text-natural-text/40 block">Formato playoff</span>
                          <span className="font-black text-natural-dark">{format}</span>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {teams.map((t, i) => (
                          <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-natural-bg border border-natural-border">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                            {t.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}

                <div className="bg-natural-bg rounded-xl p-3 border border-natural-border mt-3">
                  <div className="font-bold text-sm text-natural-dark mb-2">Planificación Estimada</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-natural-sidebar/50 rounded-lg p-2">
                      <span className="text-natural-text/40 block">Total Partidos</span>
                      <span className="font-black text-natural-dark">{totalMatches}</span>
                    </div>
                    <div className="bg-natural-sidebar/50 rounded-lg p-2">
                      <span className="text-natural-text/40 block">Tiempo Disponible</span>
                      <span className="font-black text-natural-dark">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m</span>
                    </div>
                    <div className="bg-natural-sidebar/50 rounded-lg p-2">
                      <span className="text-natural-text/40 block">Tiempo Máximo x Partido (inc. Descanso)</span>
                      <span className="font-black text-natural-dark">{maxDurationPerMatch} min</span>
                    </div>
                    <div className="bg-natural-primary/10 rounded-lg p-2 border border-natural-primary/20">
                      <span className="text-natural-primary/70 block font-bold">Duración Sugerida</span>
                      <span className="font-black text-natural-primary text-lg leading-none">{suggestedMatchTime} min</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t border-natural-border">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : onClose()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-natural-text/60 hover:bg-natural-sidebar transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> {step > 0 ? 'Atrás' : 'Cancelar'}
          </button>

          {step < 3 ? (
            <button
              onClick={() => { if (step === 1) categories.forEach(ensureTeams); setStep(step + 1); }}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-natural-primary text-white hover:bg-natural-primary/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
            >
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold bg-green-600 text-white hover:bg-green-500 transition-all shadow-md"
            >
              <Check className="w-4 h-4" /> Crear Torneo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
