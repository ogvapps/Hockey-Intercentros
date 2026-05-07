/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Timer, Play, Pause, Square, RotateCcw, Plus, Minus, Activity, CalendarDays, GitMerge, Medal, Share2, Shield, ArrowLeft, LogIn, LogOut, Settings, Edit2, Check, X, Trash2 } from 'lucide-react';
import { auth, db, signIn, logOut, OperationType, handleFirestoreError } from './services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, query, orderBy, Timestamp, getDocs, writeBatch } from 'firebase/firestore';

interface Team {
  id: string;
  name: string;
  color: string;
  group: string;
  category: 'masculino' | 'femenino';
  isRest?: boolean;
}

const TEAMS_MASCULINO: Team[] = [
  { id: 't1', name: "Colegio Madre Matilde", color: "#38bdf8", group: 'A', category: 'masculino' }, 
  { id: 't2', name: "Colegio San José", color: "#1e3a8a", group: 'A', category: 'masculino' }, 
  { id: 't3', name: "IES Valle del Jerte", color: "#f97316", group: 'A', category: 'masculino' }, 
  { id: 't4', name: "Virgen del Puerto", color: "#166534", group: 'A', category: 'masculino' }, 
  { id: 't5', name: "IES Sierra de Santa Bárbara", color: "#d946ef", group: 'A', category: 'masculino' }, 
  { id: 't6', name: "Colegio Santísima Trinidad", color: "#dc2626", group: 'A', category: 'masculino' }, 
  { id: 't7', name: "Colegio La Salle", color: "#9ca3af", group: 'B', category: 'masculino' }, 
  { id: 't8', name: "San Calixto", color: "#171717", group: 'B', category: 'masculino' }, 
  { id: 't9', name: "Monfragüe", color: "#eab308", group: 'B', category: 'masculino' }, 
  { id: 't10', name: "IES Gabriel y Galán", color: "#a855f7", group: 'B', category: 'masculino' }, 
  { id: 't11', name: "IES Pérez Comendador", color: "#f472b6", group: 'B', category: 'masculino' }, 
  { id: 't12', name: "IESO Galisteo", color: "#ffffff", group: 'B', category: 'masculino' } 
];

// Reemplazamos IESO Galisteo por DESCANSA para mantener los huecos y el tiempo
const TEAMS_FEMENINO: Team[] = TEAMS_MASCULINO.map(t => 
  t.name === "IESO Galisteo" 
    ? { ...t, name: "DESCANSA", isRest: true, id: 'rest_f', color: '#e5e7eb', category: 'femenino' } 
    : { ...t, id: `f_${t.id}`, category: 'femenino' }
);

const buildSchedule = (teamsList: Team[]) => {
  const schedule = [];
  const groupA = teamsList.filter(t => t.group === 'A');
  const groupB = teamsList.filter(t => t.group === 'B');

  const matchups = [
    [[0, 5], [1, 4], [2, 3]], // J1
    [[5, 3], [4, 2], [0, 1]], // J2
    [[1, 5], [2, 0], [3, 4]], // J3
    [[5, 4], [0, 3], [1, 2]], // J4
    [[2, 5], [3, 1], [4, 0]]  // J5
  ];

  let matchCounter = 0;
  const getFormattedTime = (minutesToAdd: number) => {
    const totalMinutes = 9 * 60 + 30 + minutesToAdd; 
    const h = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const m = (totalMinutes % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  matchups.forEach((round, rIndex) => {
    for (let i = 0; i < 3; i++) {
      const t1A = groupA[round[i][0]];
      const t2A = groupA[round[i][1]];
      schedule.push({
        id: `match_A_${rIndex}_${i}`, group: 'A', round: rIndex + 1,
        time: getFormattedTime(matchCounter * 5), team1: t1A, team2: t2A, isRestMatch: t1A?.isRest || t2A?.isRest
      });
      matchCounter++;

      const t1B = groupB[round[i][0]];
      const t2B = groupB[round[i][1]];
      schedule.push({
        id: `match_B_${rIndex}_${i}`, group: 'B', round: rIndex + 1,
        time: getFormattedTime(matchCounter * 5), team1: t1B, team2: t2B, isRestMatch: t1B?.isRest || t2B?.isRest
      });
      matchCounter++;
    }
  });
  return schedule;
};

const SCHEDULES = {
  masculino: buildSchedule(TEAMS_MASCULINO),
  femenino: buildSchedule(TEAMS_FEMENINO)
};

export default function App() {
  const [activeTab, setActiveTab] = useState('schedule');
  const [activeCategory, setActiveCategory] = useState<'masculino' | 'femenino'>('masculino');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null); 
  
  // Firebase Data States
  const [matches, setMatches] = useState<any[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [appSettings, setAppSettings] = useState({ title: 'Torneo Hockey Intercentros 2026' });
  const [admins, setAdmins] = useState<string[]>([]);
  
  // Auth States
  const [user, setUser] = useState<User | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [pinUnlocked, setPinUnlocked] = useState(() => localStorage.getItem('admin_pin_session') === 'true');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [loading, setLoading] = useState(true);

  const ADMIN_PIN = "I2026";

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pinInput === ADMIN_PIN) {
      setPinUnlocked(true);
      localStorage.setItem('admin_pin_session', 'true');
      setShowPinModal(false);
      setPinInput('');
    } else {
      alert("PIN Incorrecto");
      setPinInput('');
    }
  };

  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [time, setTime] = useState(0); 
  const [timerRunning, setTimerRunning] = useState(false);

  // Sync Auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  // Sync Admin Status for current user
  useEffect(() => {
    if (pinUnlocked) {
      setIsAdminUser(true);
      return;
    }

    if (user) {
      const adminDocRef = doc(db, 'admins', user.uid);
      const unsub = onSnapshot(adminDocRef, (snap) => {
        if (snap.exists() || user.email === 'orestesgv@gmail.com') {
          setIsAdminUser(true);
        } else {
          setIsAdminUser(false);
        }
      }, (err) => {
        if (user.email === 'orestesgv@gmail.com') {
          setIsAdminUser(true);
        } else {
          setIsAdminUser(false);
        }
      });
      return unsub;
    } else {
      setIsAdminUser(false);
    }
  }, [user, pinUnlocked]);

  // Sync Settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'app', 'settings'), (snap) => {
      if (snap.exists()) {
        setAppSettings(snap.data() as any);
      }
    });
    return unsub;
  }, []);

  // Sync Teams
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'teams'), (snap) => {
      if (snap.empty) {
        // Initial Seed logic if needed, but we'll do it manually or via a button
        setTeams([]);
      } else {
        const tList = snap.docs.map(d => ({ ...d.data(), id: d.id } as Team));
        setTeams(tList);
      }
    });
    return unsub;
  }, []);

  // Sync Matches
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'matches'), (snap) => {
      const mList = snap.docs.map(d => ({ ...d.data(), id: d.id }));
      setMatches(mList);
    });
    return unsub;
  }, []);

  const currentTeams = useMemo(() => {
    const baseTeams = teams.length > 0 ? teams : (activeCategory === 'masculino' ? TEAMS_MASCULINO : TEAMS_FEMENINO);
    return baseTeams.filter(t => t.category === activeCategory);
  }, [teams, activeCategory]);

  const SCHEDULE = useMemo(() => {
    // If we have matches in DB, they might be different from the static schedule if admin edited
    // But for now, we'll use the static schedule generator or allow admin to override
    return SCHEDULES[activeCategory];
  }, [activeCategory]);

    // Seed Function for Admin
  const seedDatabase = async () => {
    if (!isAdminUser || !user) return;
    const batch = writeBatch(db);
    
    // Settings
    batch.set(doc(db, 'app', 'settings'), { title: 'Torneo Hockey Intercentros 2026' });
    
    // Admin (Bootstrap the user with their current UID)
    batch.set(doc(db, 'admins', user.uid), { email: user.email });

    // Teams
    [...TEAMS_MASCULINO, ...TEAMS_FEMENINO].forEach(team => {
      const { id, ...teamData } = team; 
      const tDoc = doc(collection(db, 'teams'));
      batch.set(tDoc, teamData);
    });

    try {
      await batch.commit();
      alert("Base de datos inicializada!");
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'batch seeding');
    }
  };

  useEffect(() => {
    let interval: any;
    if (timerRunning && time > 0) { 
      interval = setInterval(() => setTime((t) => t - 1), 1000); 
    } else if (time === 0 && timerRunning) {
      setTimerRunning(false);
    }
    return () => clearInterval(interval);
  }, [timerRunning, time]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getTeam = (name: string) => TEAMS_MASCULINO.find(t => t.name === name);

  const standings = useMemo(() => {
    interface StandingTeam extends Team {
      p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number;
    }
    let table: StandingTeam[] = currentTeams.map(team => ({ ...team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
    const categoryMatches = matches.filter(m => m.category === activeCategory);

    categoryMatches.forEach(match => {
      const t1 = table.find(t => t.name === match.team1);
      const t2 = table.find(t => t.name === match.team2);
      if (t1 && t2) {
        t1.p++; t2.p++; t1.gf += match.score1; t1.ga += match.score2; t2.gf += match.score2; t2.ga += match.score1;
        if (match.score1 > match.score2) { t1.w++; t2.l++; t1.pts += 3; } 
        else if (match.score1 < match.score2) { t2.w++; t1.l++; t2.pts += 3; } 
        else { t1.d++; t2.d++; t1.pts += 1; t2.pts += 1; }
      }
    });

    table.forEach(t => t.gd = t.gf - t.ga);
    return table.sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts; 
      if (b.gd !== a.gd) return b.gd - a.gd;     
      return b.gf - a.gf;                        
    });
  }, [matches, activeCategory, currentTeams]);

  const groupAStandings = standings.filter(t => t.group === 'A' && !t.isRest);
  const groupBStandings = standings.filter(t => t.group === 'B' && !t.isRest);

  const exportText = useMemo(() => {
    const getStandingsForCategory = (cat: 'masculino' | 'femenino') => {
      const catTeams = cat === 'masculino' ? TEAMS_MASCULINO : TEAMS_FEMENINO;
      interface StandingTeam extends Team {
        p: number; w: number; d: number; l: number; gf: number; ga: number; gd: number; pts: number;
      }
      let table: StandingTeam[] = catTeams.map(team => ({ ...team, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 }));
      const catMatches = matches.filter(m => m.category === cat);

      catMatches.forEach(match => {
        const t1 = table.find(t => t.name === match.team1);
        const t2 = table.find(t => t.name === match.team2);
        if (t1 && t2) {
          t1.p++; t2.p++; t1.gf += match.score1; t1.ga += match.score2; t2.gf += match.score2; t2.ga += match.score1;
          if (match.score1 > match.score2) { t1.w++; t2.l++; t1.pts += 3; } 
          else if (match.score1 < match.score2) { t2.w++; t1.l++; t2.pts += 3; } 
          else { t1.d++; t2.d++; t1.pts += 1; t2.pts += 1; }
        }
      });

      table.forEach(t => t.gd = t.gf - t.ga);
      return table.sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts; 
        if (b.gd !== a.gd) return b.gd - a.gd;     
        return b.gf - a.gf;                        
      }).filter(t => !t.isRest);
    };

    let text = `🏆 *CLASIFICACIONES FINALES ABSOLUTAS* 🏆\n\n`;

    text += `🔵 *MASCULINO (1 al 12)*\n`;
    const mascStandings = getStandingsForCategory('masculino');
    mascStandings.forEach((team, index) => {
      let gdText = team.gd > 0 ? `+${team.gd}` : team.gd.toString();
      text += `${index + 1}. ${team.name} - *${team.pts} pts* (DG: ${gdText})\n`;
    });

    text += `\n🟣 *FEMENINO (1 al 11)*\n`;
    const femStandings = getStandingsForCategory('femenino');
    femStandings.forEach((team, index) => {
      let gdText = team.gd > 0 ? `+${team.gd}` : team.gd.toString();
      text += `${index + 1}. ${team.name} - *${team.pts} pts* (DG: ${gdText})\n`;
    });
    
    return text;
  }, [matches]);

  const startNewMatch = (t1Name: string, t2Name: string) => {
    const mInfo = SCHEDULE.find(m => 
      (m?.team1?.name === t1Name && m?.team2?.name === t2Name) || 
      (m?.team1?.name === t2Name && m?.team2?.name === t1Name)
    );
    
    setLiveMatch({ 
      id: mInfo?.id || null,
      team1: t1Name, 
      team2: t2Name, 
      score1: 0, 
      score2: 0, 
      category: activeCategory,
      time: mInfo?.time || 'PROG',
      round: mInfo?.round || 0,
      group: mInfo?.group || 'A'
    });
    setTime(240); // 4 minutes
    setTimerRunning(false); 
    setActiveTab('live');
  };

  const startManualMatch = (e: any) => {
    e.preventDefault();
    const t1 = e.target.team1.value; const t2 = e.target.team2.value;
    if (t1 === t2) { alert("Selecciona equipos diferentes."); return; }
    startNewMatch(t1, t2);
  };

  const updateScore = (teamIndex: number, delta: number) => {
    setLiveMatch((prev: any) => {
      const newMatch = { ...prev };
      if (teamIndex === 1) newMatch.score1 = Math.max(0, newMatch.score1 + delta);
      if (teamIndex === 2) newMatch.score2 = Math.max(0, newMatch.score2 + delta);
      return newMatch;
    });
  };

  const endMatch = async () => {
    if (!isAdminUser) {
      alert("Debes ser administrador para guardar resultados.");
      return;
    }
    
    if (!auth.currentUser) {
      alert("Por favor, inicia sesión con Google para tener permisos de escritura. El PIN solo desbloquea la interfaz, pero Firebase requiere una cuenta autorizada.");
      return;
    }

    if (window.confirm("¿Guardar resultado y finalizar el partido?")) {
      try {
        const matchData = {
          team1: liveMatch.team1,
          team2: liveMatch.team2,
          score1: liveMatch.score1,
          score2: liveMatch.score2,
          category: liveMatch.category || activeCategory,
          time: liveMatch.time || 'PROG',
          round: liveMatch.round || 0,
          group: liveMatch.group || 'A',
          played: true,
          updatedAt: Timestamp.now()
        };
        
        let mDoc;
        if (liveMatch.id) {
          // If it was a scheduled match, we use its ID or a derived stable ID
          mDoc = doc(db, 'matches', liveMatch.id);
        } else {
          // Fallback static ID to avoid duplicates if possible
          const stableId = `${liveMatch.category}-${liveMatch.team1}-${liveMatch.team2}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
          mDoc = doc(db, 'matches', stableId);
        }
        
        await setDoc(mDoc, matchData);
        setLiveMatch(null); 
        setTimerRunning(false); 
        setTime(0); 
        setActiveTab('schedule');
      } catch (e) {
        console.error("Error al guardar:", e);
        handleFirestoreError(e, OperationType.WRITE, 'matches');
      }
    }
  };

  const updateMatchResult = async (matchId: string, s1: number, s2: number) => {
    if (!isAdminUser) return;
    try {
      await updateDoc(doc(db, 'matches', matchId), {
        score1: s1,
        score2: s2,
        played: true,
        updatedAt: Timestamp.now()
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `matches/${matchId}`);
    }
  };

  const deleteMatch = async (matchId: string) => {
    if (!isAdminUser || !window.confirm("¿Borrar este resultado?")) return;
    try {
      await deleteDoc(doc(db, 'matches', matchId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `matches/${matchId}`);
    }
  };

  const updateTitle = async () => {
    const newTitle = prompt("Nuevo título del torneo:", appSettings.title);
    if (newTitle && isAdminUser) {
      try {
        await updateDoc(doc(db, 'app', 'settings'), { title: newTitle });
      } catch (e) {
        handleFirestoreError(e, OperationType.UPDATE, 'app/settings');
      }
    }
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (!isAdminUser) return;
    try {
      await updateDoc(doc(db, 'teams', teamId), updates);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `teams/${teamId}`);
    }
  };

  const addTeam = async (category: 'masculino' | 'femenino') => {
    if (!isAdminUser) return;
    const name = prompt("Nombre del nuevo equipo:");
    if (!name) return;
    const group = prompt("Grupo (A o B):", "A")?.toUpperCase();
    if (group !== 'A' && group !== 'B') return;
    
    try {
      const tDoc = doc(collection(db, 'teams'));
      await setDoc(tDoc, {
        name,
        color: "#" + Math.floor(Math.random()*16777215).toString(16),
        group,
        category,
        isRest: false
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'teams');
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!isAdminUser || !window.confirm("¿Borrar este equipo? Se mantendrán sus partidos jugados.")) return;
    try {
      await deleteDoc(doc(db, 'teams', teamId));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `teams/${teamId}`);
    }
  };

  const isMatchPlayed = (t1: string, t2: string) => matches.some(m => m.category === activeCategory && ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1)) && m.played);
  const getMatchResult = (t1: string, t2: string) => {
    const match = matches.find(m => m.category === activeCategory && ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1)) && m.played);
    if (!match) return null;
    return match.team1 === t1 ? `${match.score1} - ${match.score2}` : `${match.score2} - ${match.score1}`;
  };

  const getMatchId = (t1: string, t2: string) => {
    const match = matches.find(m => m.category === activeCategory && ((m.team1 === t1 && m.team2 === t2) || (m.team1 === t2 && m.team2 === t1)));
    return match?.id || null;
  };

  const handleTeamClick = (teamName: string) => {
    if (!liveMatch) {
      setSelectedTeam(teamName);
      setActiveTab('team');
    }
  };

  const TeamBadge = ({ team, showName = true, fallback = "Por definir", reverse = false, interactive = true }: any) => {
    if (!team) return <div className={`text-gray-400 italic px-1 text-xs md:text-sm truncate ${reverse ? 'text-right' : 'text-left'}`}>{fallback}</div>;
    
    const isClickable = interactive && !liveMatch;

    return (
      <div 
        onClick={() => isClickable && handleTeamClick(team.name)}
        className={`flex items-center gap-1.5 md:gap-2 min-w-0 ${reverse ? 'flex-row-reverse' : 'flex-row'} ${isClickable ? 'cursor-pointer hover:opacity-70 transition-opacity' : ''}`}
        title={isClickable ? `Ver calendario de ${team.name}` : team.name}
      >
        <div className={`w-3 h-3 md:w-4 md:h-4 shrink-0 rounded-full border border-gray-300 shadow-sm ${team.name === 'IESO Galisteo' ? 'bg-white' : ''}`} style={{ backgroundColor: team.color }}/>
        {showName && <span className={`font-medium text-gray-800 text-[11px] sm:text-xs md:text-sm leading-tight truncate ${reverse ? 'text-right' : 'text-left'} ${isClickable ? 'hover:underline decoration-gray-300 decoration-2 underline-offset-2' : ''}`}>{team.name}</span>}
      </div>
    );
  };

  if (activeTab === 'live' && liveMatch) {
    return (
      <div className="fixed inset-0 z-50 bg-natural-bg flex flex-col overflow-hidden overscroll-none select-none">
        <div className="bg-natural-dark text-white flex flex-col items-center justify-center shrink-0 py-2 sm:py-4 px-4 shadow-lg border-b border-natural-primary/20 relative">
          <button 
            onClick={() => {
              if(window.confirm("¿Salir del partido sin guardar? Se perderá el progreso actual.")) {
                setActiveTab('schedule');
                setLiveMatch(null);
                setTimerRunning(false);
                setTime(0);
              }
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all border border-white/10 flex items-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> <span className="hidden sm:inline text-[8px] font-bold uppercase tracking-widest">Salir</span>
          </button>
          
          <div className={`text-[8px] md:text-[10px] font-bold px-3 py-1 rounded-full mb-1 uppercase tracking-[0.2em] shadow-inner ${activeCategory === 'masculino' ? 'bg-[#2196F3]/20 text-[#2196F3]' : 'bg-[#9C27B0]/20 text-[#E08EF0]'}`}>
            Pista {activeCategory === 'masculino' ? 'Masculina' : 'Femenina'}
          </div>
          
          <div 
            onClick={() => {
              if (isAdminUser) {
                const newTime = prompt("Introduce segundos restantes:", time.toString());
                if (newTime !== null) setTime(parseInt(newTime) || 0);
              }
            }}
            className={`text-6xl md:text-8xl font-serif italic font-bold leading-none tracking-tighter mb-2 text-white drop-shadow-sm ${isAdminUser ? 'cursor-pointer hover:text-natural-primary' : ''}`}
          >
            {formatTime(time)}
          </div>
          
          <div className="flex gap-3">
            <button 
              disabled={time === 0}
              onClick={() => setTimerRunning(!timerRunning)} 
              className={`px-6 py-2 rounded-xl font-bold flex items-center gap-2 text-base transition-all active:scale-95 shadow-md ${timerRunning ? 'bg-[#8B7E6F] text-white' : 'bg-natural-primary text-white'} ${time === 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}`}
            >
              {timerRunning ? <><Pause className="w-5 h-5"/> PAUSA</> : <><Play className="w-5 h-5 fill-current"/> INICIAR</>}
            </button>
            <button onClick={() => { setTime(240); setTimerRunning(false); }} className="p-2 rounded-xl font-bold flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-all border border-white/10 active:scale-95">
              <RotateCcw className="w-6 h-6"/>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-natural-border">
          {[1, 2].map((teamIndex) => {
            const teamName = teamIndex === 1 ? liveMatch.team1 : liveMatch.team2;
            const score = teamIndex === 1 ? liveMatch.score1 : liveMatch.score2;
            return (
              <div key={teamIndex} className="flex-1 flex flex-col items-center justify-between p-4 md:p-10 bg-white relative">
                <div className="absolute top-0 left-0 w-full h-2 shadow-sm" style={{ backgroundColor: getTeam(teamName)?.color }}></div>
                
                <div className="w-full flex-1 flex flex-col items-center justify-center gap-2">
                  <h3 className="text-xl md:text-3xl font-serif text-natural-dark text-center line-clamp-2 px-4 leading-tight shrink-0">
                    {teamName}
                  </h3>
                  
                  <div className="flex-1 flex items-center justify-center w-full min-h-0 relative px-4">
                    <span className="text-[25vh] md:text-[35vh] font-serif italic font-black text-natural-primary leading-none drop-shadow-lg select-none">
                      {score}
                    </span>
                  </div>
                </div>
                
                <div className="flex w-full justify-center gap-6 md:gap-12 shrink-0 mb-6 px-4 z-10">
                  <button onClick={() => updateScore(teamIndex, -1)} className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center rounded-3xl bg-[#FDE8E8] text-[#D85C5C] hover:bg-[#FCD7D7] transition-all active:scale-90 shadow-md border border-[#FAD2D2]">
                    <Minus className="w-10 h-10 md:w-14 md:h-14" />
                  </button>
                  <button onClick={() => updateScore(teamIndex, 1)} className="w-16 h-16 md:w-24 md:h-24 flex items-center justify-center rounded-3xl bg-[#E8FDF0] text-natural-primary hover:bg-[#D7FCE8] transition-all active:scale-90 shadow-md border border-[#D2FADF]">
                    <Plus className="w-10 h-10 md:w-14 md:h-14" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="shrink-0 p-4 bg-white border-t border-natural-border shadow-[0_-8px_16px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-3 pb-8">
          {isAdminUser && (
            <button 
              onClick={endMatch} 
              className={`w-full py-5 text-white font-bold rounded-2xl shadow-lg transition-all active:scale-[0.98] flex justify-center items-center gap-3 text-xl ${!auth.currentUser ? 'bg-gray-400 cursor-not-allowed' : 'bg-natural-primary hover:bg-natural-dark'}`}
            >
              <Check className="w-7 h-7" /> GUARDAR Y FINALIZAR
            </button>
          )}
          <button 
            onClick={() => {
              if(window.confirm("¿Seguro que quieres cancelar? No se guardará el resultado.")) {
                setLiveMatch(null);
                setTimerRunning(false);
                setTime(0);
                setActiveTab('schedule');
              }
            }} 
            className="w-full py-3 bg-natural-bg text-natural-text/40 font-bold rounded-xl hover:bg-natural-border transition-all flex justify-center items-center gap-2 text-xs uppercase tracking-widest"
          >
            ← Cancelar y Regresar
          </button>
          {!auth.currentUser && isAdminUser && (
            <p className="text-[10px] text-red-500 font-bold text-center italic">⚠️ Debes iniciar sesión con Google para guardar resultados reales.</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans pb-10 text-natural-text">
      <header className="bg-natural-sidebar text-natural-dark p-6 border-b border-natural-border shadow-sm z-10 relative">
          <div className="absolute right-4 top-4 flex gap-2">
            {!isAdminUser && (
              <button 
                onClick={() => setShowPinModal(true)} 
                className="flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-2xl text-[10px] font-bold text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95 border border-natural-border/50"
              >
                <Settings className="w-3.5 h-3.5" /> PIN
              </button>
            )}
            {user ? (
              <div className="flex items-center gap-2 bg-white/50 p-1.5 pr-3 rounded-2xl border border-natural-border">
                <img src={user.photoURL || ''} className="w-8 h-8 rounded-full border border-white" alt="Avatar" />
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[10px] font-bold truncate max-w-[80px]">{user.displayName}</span>
                  {isAdminUser && <span className="text-[8px] text-natural-primary font-bold uppercase tracking-widest">Admin</span>}
                </div>
                <button 
                  onClick={() => {
                    logOut();
                    setPinUnlocked(false);
                    localStorage.removeItem('admin_pin_session');
                  }} 
                  className="ml-2 p-1 text-natural-text/40 hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button onClick={signIn} className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl text-xs font-bold text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95">
                <LogIn className="w-4 h-4" /> Google
              </button>
            )}
          </div>
        
        <div className="flex flex-col items-center justify-center gap-3">
          <h1 className="text-2xl md:text-3xl font-serif text-center flex items-center justify-center gap-3" id="main-title">
            <div className="w-10 h-10 bg-natural-primary rounded-xl flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {appSettings.title}
            {isAdminUser && (
              <button onClick={updateTitle} className="p-1.5 text-natural-text/20 hover:text-natural-primary transition-colors">
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </h1>
        </div>
      </header>

      <div className="bg-natural-bg p-4 flex justify-center gap-3 md:gap-4 z-10 sticky top-0" id="category-tabs">
        <button onClick={() => {setActiveCategory('masculino'); setActiveTab('schedule');}} className={`px-6 py-2.5 rounded-2xl font-bold text-sm md:text-base transition-all flex-1 max-w-[200px] shadow-sm ${activeCategory === 'masculino' ? 'bg-natural-primary text-white' : 'bg-natural-sidebar text-natural-text hover:bg-natural-border'}`}>Masculino</button>
        <button onClick={() => {setActiveCategory('femenino'); setActiveTab('schedule');}} className={`px-6 py-2.5 rounded-2xl font-bold text-sm md:text-base transition-all flex-1 max-w-[200px] shadow-sm ${activeCategory === 'femenino' ? 'bg-natural-primary text-white' : 'bg-natural-sidebar text-natural-text hover:bg-natural-border'}`}>Femenino</button>
      </div>

      <nav className="flex bg-white/80 backdrop-blur-md shadow-sm overflow-x-auto hide-scrollbar border-b border-natural-border" id="nav-tabs">
        <button onClick={() => setActiveTab('schedule')} className={`px-4 py-4 font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 whitespace-nowrap transition-colors flex-1 ${activeTab === 'schedule' ? 'text-natural-primary border-b-4 border-natural-primary bg-natural-sidebar/50' : 'text-gray-400 hover:bg-natural-bg'}`}>
          <CalendarDays className="w-5 h-5" /> <span className="text-xs md:text-sm uppercase tracking-wider">Liga</span>
        </button>
        <button onClick={() => setActiveTab('standings')} className={`px-4 py-4 font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 whitespace-nowrap transition-colors flex-1 ${activeTab === 'standings' ? 'text-natural-primary border-b-4 border-natural-primary bg-natural-sidebar/50' : 'text-gray-400 hover:bg-natural-bg'}`}>
          <Trophy className="w-5 h-5" /> <span className="text-xs md:text-sm uppercase tracking-wider">Tabla</span>
        </button>
        <button onClick={() => setActiveTab('playoffs')} className={`px-4 py-4 font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 whitespace-nowrap transition-colors flex-1 ${activeTab === 'playoffs' ? 'text-natural-primary border-b-4 border-natural-primary bg-natural-sidebar/50' : 'text-gray-400 hover:bg-natural-bg'}`}>
          <GitMerge className="w-5 h-5" /> <span className="text-xs md:text-sm uppercase tracking-wider">Finales</span>
        </button>
        <button onClick={() => {setSelectedTeam(null); setActiveTab('team');}} className={`px-4 py-4 font-semibold flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 whitespace-nowrap transition-colors flex-1 ${activeTab === 'team' ? 'text-natural-primary border-b-4 border-natural-primary bg-natural-sidebar/50' : 'text-gray-400 hover:bg-natural-bg'}`}>
          <Shield className="w-5 h-5" /> <span className="text-xs md:text-sm uppercase tracking-wider">Equipos</span>
        </button>
      </nav>

      <main className="flex-1 p-2 md:p-4 w-full mx-auto max-w-4xl" id="content">
        
        {activeTab === 'schedule' && (
          <div className="space-y-8" id="schedule-view">
            <div className="bg-natural-sidebar border-l-4 border-natural-primary p-6 rounded-3xl shadow-sm text-sm">
              <p className="text-natural-dark font-serif text-lg mb-1 italic">Formato Relámpago (Fin 13:30h)</p>
              <p className="text-natural-text">Partidos de liga duran <strong>4 minutos (+1 min de cambio)</strong>. {activeCategory === 'femenino' ? 'Al haber 5 equipos en el Grupo B, descansa un equipo cada jornada.' : ''}</p>
            </div>
            
            {[1, 2, 3, 4, 5].map(round => (
              <div key={`round-${round}`} className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden">
                <div className="bg-natural-dark text-white p-4 font-serif text-center text-xl tracking-wide">Jornada {round}</div>
                <div className="p-3 md:p-6 divide-y divide-natural-border/50">
                  {SCHEDULE.filter(m => m.round === round).map(m => {
                    const played = isMatchPlayed(m.team1.name, m.team2.name);
                    const result = getMatchResult(m.team1.name, m.team2.name);
                    
                    if (m.isRestMatch) {
                      return (
                        <div key={m.id} className="flex flex-col py-4 opacity-50 bg-natural-bg/30">
                          <div className="flex justify-between items-center mb-3 px-2">
                            <span className="flex items-center gap-1.5 font-bold text-natural-text/60"><Timer className="w-4 h-4" /> {m.time}</span>
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
                      <div key={m.id} className={`flex flex-col py-4 ${played ? 'opacity-70' : ''}`}>
                        <div className="flex justify-between items-center mb-3 px-2">
                          <span className="flex items-center gap-1.5 font-bold text-natural-dark"><Timer className="w-4 h-4 text-natural-primary" /> {m.time}</span>
                          <span className={`text-[10px] md:text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase ${m.group === 'A' ? 'bg-[#E8F5E9] text-[#4CAF50]' : 'bg-[#E3F2FD] text-[#2196F3]'}`}>Grupo {m.group}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 bg-natural-sidebar/30 p-3 rounded-2xl border border-natural-border/50 hover:border-natural-primary/30 transition-colors">
                          <div className="flex-1 min-w-0"><TeamBadge team={m.team1} /></div>
                          <div className="text-[11px] sm:text-xs font-bold text-natural-text/30 px-1 shrink-0 italic font-serif">vs</div>
                          <div className="flex-1 min-w-0 flex justify-end"><TeamBadge team={m.team2} reverse={true} /></div>
                          <div className="ml-2 sm:ml-4 shrink-0 flex items-center gap-2">
                            {played ? (
                              <div className="flex items-center gap-2">
                                <span className="bg-natural-dark text-white px-3 md:px-4 py-1.5 rounded-xl font-bold text-xs md:text-sm shadow-sm">{result}</span>
                                {isAdminUser && (
                                  <div className="flex gap-1">
                                    <button 
                                      onClick={() => {
                                        const mid = getMatchId(m.team1.name, m.team2.name);
                                        if (!mid) return;
                                        const res = prompt("Editar resultado (Ej: 2-1):", result || "");
                                        if (res && res.includes('-')) {
                                          const [s1, s2] = res.split('-').map(Number);
                                          updateMatchResult(mid, s1, s2);
                                        }
                                      }}
                                      className="p-1.5 bg-natural-sidebar rounded-lg text-natural-text/40 hover:text-natural-primary"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={() => {
                                        const mid = getMatchId(m.team1.name, m.team2.name);
                                        if(mid) deleteMatch(mid);
                                      }}
                                      className="p-1.5 bg-natural-sidebar rounded-lg text-natural-text/40 hover:text-red-500"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : (
                               isAdminUser && <button onClick={() => startNewMatch(m.team1.name, m.team2.name)} className="bg-natural-primary hover:bg-natural-dark text-white font-bold px-3 md:px-5 py-2 rounded-xl shadow-sm flex items-center gap-1.5 transition-all active:scale-95"><Play className="w-3.5 h-3.5 fill-current" /> <span className="hidden md:inline">JUGAR</span></button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'standings' && (
           <div className="space-y-10" id="standings-view">
             {isAdminUser && (
               <div className="flex justify-center md:justify-end">
                 <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(exportText)}`} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3 px-6 rounded-2xl shadow-sm transition-all active:scale-95 flex items-center gap-2">
                   <Share2 className="w-5 h-5" /> Exportar Clasificaciones Finales
                 </a>
               </div>
             )}

             <div className="grid grid-cols-1 gap-12">
               <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden" id="standings-group-a">
                 <div className="p-4 bg-natural-primary text-white font-serif text-center text-xl">Grupo A</div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm border-collapse min-w-max">
                     <thead>
                       <tr className="bg-natural-sidebar text-natural-text uppercase tracking-widest text-[10px] font-bold">
                         <th className="p-4 border-b border-natural-border text-center w-10">#</th>
                         <th className="p-4 border-b border-natural-border">Equipo</th>
                         <th className="p-4 border-b border-natural-border text-center">PTS</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">PJ</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">V</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">E</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">D</th>
                         <th className="p-4 border-b border-natural-border text-center">GF</th>
                         <th className="p-4 border-b border-natural-border text-center">GC</th>
                         <th className="p-4 border-b border-natural-border text-center">DG</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-natural-border/30">
                       {groupAStandings.map((team, index) => (
                         <tr key={team.name} className={`hover:bg-natural-bg/50 transition-colors ${index < 4 ? 'bg-[#E8F5E9]/20' : ''}`}>
                           <td className={`p-4 text-center font-bold ${index < 4 ? 'text-natural-primary' : 'text-natural-text/40'}`}>{index + 1}</td>
                           <td className="p-4 font-medium"><TeamBadge team={team} interactive={true} /></td>
                           <td className="p-4 text-center font-black text-natural-dark">{team.pts}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.p}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.w}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.d}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.l}</td>
                           <td className="p-4 text-center text-natural-text/50 font-medium">{team.gf}</td>
                           <td className="p-4 text-center text-natural-text/50 font-medium">{team.ga}</td>
                           <td className={`p-4 text-center font-bold ${team.gd > 0 ? 'text-[#4CAF50]' : team.gd < 0 ? 'text-[#D85C5C]' : 'text-natural-text/40'}`}>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>

               <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden" id="standings-group-b">
                 <div className="p-4 bg-natural-dark text-white font-serif text-center text-xl">Grupo B</div>
                 <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm border-collapse min-w-max">
                     <thead>
                       <tr className="bg-natural-sidebar text-natural-text uppercase tracking-widest text-[10px] font-bold">
                         <th className="p-4 border-b border-natural-border text-center w-10">#</th>
                         <th className="p-4 border-b border-natural-border">Equipo</th>
                         <th className="p-4 border-b border-natural-border text-center">PTS</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">PJ</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">V</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">E</th>
                         <th className="p-4 border-b border-natural-border text-center opacity-40">D</th>
                         <th className="p-4 border-b border-natural-border text-center">GF</th>
                         <th className="p-4 border-b border-natural-border text-center">GC</th>
                         <th className="p-4 border-b border-natural-border text-center">DG</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-natural-border/30">
                       {groupBStandings.map((team, index) => (
                         <tr key={team.name} className={`hover:bg-natural-bg/50 transition-colors ${index < 4 ? 'bg-[#E3F2FD]/20' : ''}`}>
                           <td className={`p-4 text-center font-bold ${index < 4 ? 'text-[#2196F3]' : 'text-natural-text/40'}`}>{index + 1}</td>
                           <td className="p-4 font-medium"><TeamBadge team={team} interactive={true} /></td>
                           <td className="p-4 text-center font-black text-natural-dark">{team.pts}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.p}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.w}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.d}</td>
                           <td className="p-4 text-center text-natural-text/50">{team.l}</td>
                           <td className="p-4 text-center text-natural-text/50 font-medium">{team.gf}</td>
                           <td className="p-4 text-center text-natural-text/50 font-medium">{team.ga}</td>
                           <td className={`p-4 text-center font-bold ${team.gd > 0 ? 'text-[#4CAF50]' : team.gd < 0 ? 'text-[#D85C5C]' : 'text-natural-text/40'}`}>{team.gd > 0 ? `+${team.gd}` : team.gd}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </div>
             </div>
           </div>
        )}

        {activeTab === 'playoffs' && (
          <div className="space-y-8 pb-8" id="playoffs-view">
            <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden" id="playoffs-bracket">
              <div className="bg-natural-dark text-white p-4 font-serif text-center text-xl tracking-wide">Cuartos de Final</div>
              <div className="p-4 md:p-6 divide-y divide-natural-border/50">
                {[
                  { time: "12:10", title: "Cuartos 1", t1: groupAStandings[0], t2: groupBStandings[3], label1: "1º Gr. A", label2: "4º Gr. B" },
                  { time: "12:17", title: "Cuartos 2", t1: groupBStandings[1], t2: groupAStandings[2], label1: "2º Gr. B", label2: "3º Gr. A" },
                  { time: "12:24", title: "Cuartos 3", t1: groupBStandings[0], t2: groupAStandings[3], label1: "1º Gr. B", label2: "4º Gr. A" },
                  { time: "12:31", title: "Cuartos 4", t1: groupAStandings[1], t2: groupBStandings[2], label1: "2º Gr. A", label2: "3º Gr. B" }
                ].map((match, i) => (
                  <div key={i} className="py-5">
                    <div className="flex items-center gap-2 mb-3 text-sm font-bold text-natural-text/50 italic font-serif">
                      <Timer className="w-4 h-4 text-natural-primary"/> {match.time} <span className="text-natural-border mx-1">|</span> {match.title}
                    </div>
                    <div className="bg-natural-sidebar/30 rounded-3xl border border-natural-border/50 p-4 sm:p-5 grid grid-cols-[1fr_auto_1fr] gap-2 sm:gap-4 items-center">
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase text-[#4CAF50] font-bold mb-1.5 truncate tracking-wider">{match.label1}</div>
                        <TeamBadge team={match.t1} />
                      </div>
                      <div className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-natural-text/30 shadow-sm shrink-0 uppercase tracking-tighter">vs</div>
                      <div className="min-w-0 text-right">
                        <div className="text-[10px] uppercase text-[#2196F3] font-bold mb-1.5 truncate tracking-wider">{match.label2}</div>
                        <div className="flex justify-end"><TeamBadge team={match.t2} reverse={true} /></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {isAdminUser && (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-natural-border mt-8" id="manual-match-form">
                <h2 className="text-2xl font-serif text-natural-dark mb-6 text-center">Jugar Partido de Playoffs</h2>
                <form onSubmit={startManualMatch} className="space-y-6">
                  <div className="flex flex-col gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-text/50 uppercase tracking-widest pl-2">Equipo Local</label>
                      <select name="team1" className="w-full p-4 bg-natural-bg border border-natural-border rounded-2xl focus:ring-2 focus:ring-natural-primary outline-none transition-all" required>
                        <option value="">Selecciona equipo...</option>
                        {currentTeams.filter(t => !t.isRest).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                    <div className="flex items-center justify-center font-serif italic text-natural-text/30">contra</div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-natural-text/50 uppercase tracking-widest pl-2">Equipo Visitante</label>
                      <select name="team2" className="w-full p-4 bg-natural-bg border border-natural-border rounded-2xl focus:ring-2 focus:ring-natural-primary outline-none transition-all" required>
                        <option value="">Selecciona equipo...</option>
                        {currentTeams.filter(t => !t.isRest).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-natural-primary hover:bg-natural-dark text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-3 text-lg uppercase tracking-wide">
                    <Play className="w-6 h-6 fill-current" /> Iniciar Partido
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeTab === 'team' && (
          <div className="space-y-8 pb-8" id="teams-view">
            {isAdminUser && teams.length === 0 && (
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-[40px] text-center space-y-4">
                <h2 className="text-xl font-serif text-amber-800">Base de datos vacía</h2>
                <p className="text-amber-600 text-sm">Parece que aún no hay equipos cargados. ¿Quieres inicializar la base de datos con los equipos por defecto?</p>
                <div className="flex justify-center">
                  <button onClick={seedDatabase} className="bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-2xl shadow-md transition-all active:scale-95 italic">
                    Inicializar Equipos y Ajustes
                  </button>
                </div>
              </div>
            )}
            {!selectedTeam ? (
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-natural-border" id="team-selection">
                <h2 className="text-2xl font-serif text-natural-dark mb-8 text-center tracking-tight">Selecciona un Equipo</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {currentTeams.filter(t => !t.isRest).map(team => (
                    <div key={team.id} className="relative group">
                      <button
                        onClick={() => setSelectedTeam(team.name)}
                        className="w-full flex items-center gap-4 p-5 rounded-3xl border border-natural-border/50 hover:border-natural-primary hover:shadow-md transition-all bg-natural-sidebar/20 hover:bg-white text-left"
                      >
                        <div className="w-8 h-8 rounded-xl shadow-inner border border-white/20 shrink-0 transform group-hover:rotate-12 transition-transform" style={{ backgroundColor: team.color }}></div>
                        <span className="font-bold text-natural-dark tracking-tight leading-tight">{team.name}</span>
                      </button>
                      {isAdminUser && (
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              const newName = prompt("Nuevo nombre:", team.name);
                              if (newName) updateTeam(team.id, { name: newName });
                            }}
                            className="p-1.5 bg-white/90 rounded-xl text-natural-primary hover:bg-white shadow-sm border border-natural-border"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteTeam(team.id);
                            }}
                            className="p-1.5 bg-white/90 rounded-xl text-red-500 hover:bg-white shadow-sm border border-natural-border"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {isAdminUser && (
                    <button
                      onClick={() => addTeam(activeCategory)}
                      className="flex items-center justify-center gap-3 p-5 rounded-3xl border-2 border-dashed border-natural-border hover:border-natural-primary hover:bg-natural-sidebar/10 transition-all text-natural-text/40 hover:text-natural-primary font-bold"
                    >
                      <Plus className="w-6 h-6" /> Añadir Equipo
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-8" id="team-details">
                <button 
                  onClick={() => setSelectedTeam(null)}
                  className="flex items-center gap-2 text-natural-primary font-bold hover:text-natural-dark transition-colors bg-white px-5 py-3 rounded-2xl shadow-sm border border-natural-border w-max active:scale-95"
                >
                  <ArrowLeft className="w-5 h-5" /> Volver a lista de equipos
                </button>

                <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden relative" id="team-header">
                  <div className="absolute top-0 left-0 w-full h-4 bg-natural-primary shadow-sm" style={{ backgroundColor: getTeam(selectedTeam)?.color }}></div>
                  <div className="p-8 md:p-12 flex flex-col md:flex-row items-center gap-8 text-center md:text-left mt-4">
                    <div className="w-24 h-24 rounded-3xl shadow-lg border-4 border-white shrink-0 -rotate-3" style={{ backgroundColor: getTeam(selectedTeam)?.color }}></div>
                    <div className="flex-1">
                      <h2 className="text-3xl md:text-4xl font-serif text-natural-dark mb-3 tracking-tight">{selectedTeam}</h2>
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
                      if(!stats) return null;
                      return (
                        <div className="bg-natural-bg p-6 rounded-[32px] border border-natural-border shadow-inner shrink-0 min-w-[140px] text-center transform hover:scale-105 transition-transform">
                          <div className="text-natural-text/50 text-[10px] font-bold uppercase tracking-widest mb-2">Puntos Liga</div>
                          <div className="text-5xl font-serif italic text-natural-primary">{stats.pts}</div>
                          <div className="text-xs font-bold text-natural-text/40 mt-3 tracking-tighter">{stats.w}V — {stats.d}E — {stats.l}D</div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                <div className="bg-white rounded-[40px] shadow-sm border border-natural-border overflow-hidden" id="team-schedule">
                  <div className="bg-natural-dark text-white p-5 font-serif text-xl tracking-wide flex items-center justify-center gap-3">
                    <div className="w-10 h-10 bg-natural-primary/20 rounded-xl flex items-center justify-center">
                      <CalendarDays className="w-6 h-6 text-white"/>
                    </div>
                    Partidos Programados
                  </div>
                  <div className="p-4 md:p-8 divide-y divide-natural-border/30">
                    {SCHEDULE.filter(m => m.team1.name === selectedTeam || m.team2.name === selectedTeam).map(m => {
                      const played = isMatchPlayed(m.team1.name, m.team2.name);
                      const result = getMatchResult(m.team1.name, m.team2.name);

                      if (m.isRestMatch) {
                        return (
                          <div key={m.id} className="flex flex-col py-5 opacity-50 bg-natural-bg/30 rounded-3xl -mx-2 px-4 mb-4">
                            <div className="flex justify-between items-center mb-3 px-1">
                              <span className="flex items-center gap-2 font-bold text-natural-text/40 uppercase tracking-widest text-[10px]"><Timer className="w-4 h-4" /> {m.time} <span className="text-natural-border">|</span> Jornada {m.round}</span>
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
                            <span className="flex items-center gap-2 font-bold text-natural-dark uppercase tracking-widest text-[10px] font-serif italic"><Timer className="w-4 h-4 text-natural-primary" /> {m.time} <span className="text-natural-border mx-2">|</span> Jornada {m.round}</span>
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
          </div>
        )}

      </main>

      {showPinModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-natural-dark/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-natural-border p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-serif text-natural-dark italic">Acceso Admin</h3>
              <button onClick={() => setShowPinModal(false)} className="p-2 hover:bg-natural-sidebar rounded-full transition-colors">
                <X className="w-6 h-6 text-natural-text/40" />
              </button>
            </div>
            <form onSubmit={handlePinSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-natural-text/40 uppercase tracking-[0.2em] pl-4">Código PIN</label>
                <input 
                  type="password" 
                  autoFocus
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="••••"
                  className="w-full bg-natural-sidebar border border-natural-border text-center text-4xl tracking-[0.5em] font-serif p-6 rounded-3xl focus:ring-4 focus:ring-natural-primary/10 transition-all outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-natural-primary hover:bg-natural-dark text-white font-bold py-5 rounded-3xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest">
                Desbloquear
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
