/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { doc, setDoc, updateDoc, deleteDoc, collection, writeBatch, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType, incrementVisits, updatePresence } from '../services/firebase';
import { toast } from 'react-hot-toast';

import { Category, TabType, LiveMatchData, Team, MatchRecord } from '../types';
import { TEAMS_MASCULINO, TEAMS_FEMENINO } from '../constants/teams';
import { SCHEDULES, buildSchedule } from '../constants/schedule';
import { SPORTS } from '../constants/sports';
// PDF & print utils are lazy-loaded to reduce initial bundle
// import { generateTournamentPDF } from '../utils/pdfGenerator';
// import { generatePrintableTemplates } from '../utils/printTemplates';
import { MATCH_DURATION_SECONDS } from '../utils/time';
import { calculateStandings, formatExportText } from '../utils/standings';
import { motion, AnimatePresence } from 'framer-motion';


import { useAuth } from '../hooks/useAuth';
import { useFirebaseSync } from '../hooks/useFirebaseSync';
import { useTimer } from '../hooks/useTimer';

import { Header } from './Header';
import { NavTabs } from './NavTabs';
import { PinModal } from './PinModal';
import { LiveMatchView } from './LiveMatchView';
import { ScheduleView } from './ScheduleView';
import { StandingsView } from './StandingsView';
import { PlayoffsView } from './PlayoffsView';
import { RankingView } from './RankingView';
import { TeamsView } from './TeamsView';
import { ConfirmModal } from './ConfirmModal';
import { QRModal } from './QRModal';
import { PromptModal } from './PromptModal';
import { SimulationModal } from './SimulationModal';
import type { WizardResult } from './TournamentWizard';
const TournamentWizard = React.lazy(() =>
  import('./TournamentWizard').then(m => ({ default: m.TournamentWizard }))
);
import { getSport } from '../constants/sports';
import { playClick } from '../utils/audio';
import { Footer } from './Footer';
import { LiveScoreBar } from './LiveScoreBar';

import { useParams, useNavigate } from 'react-router-dom';

export default function TournamentApp() {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const syncId = tournamentId === 'legacy' ? undefined : tournamentId;
  
  const getMatchDoc = (id?: string) => {
    const finalId = id || liveMatch?.id;
    if (!finalId) throw new Error("No match ID provided");
    return syncId ? doc(db, 'tournaments', syncId, 'matches', finalId) : doc(db, 'matches', finalId);
  };
  const getTeamDoc = (id?: string) => {
    if (!id) throw new Error("No team ID provided");
    return syncId ? doc(db, 'tournaments', syncId, 'teams', id) : doc(db, 'teams', id);
  };
  const getSettingsDoc = () => syncId ? doc(db, 'tournaments', syncId) : doc(db, 'app', 'settings');
  const getMatchesCol = () => syncId ? collection(db, 'tournaments', syncId, 'matches') : collection(db, 'matches');
  const getTeamsCol = () => syncId ? collection(db, 'tournaments', syncId, 'teams') : collection(db, 'teams');
  const TAB_ORDER: TabType[] = ['schedule', 'standings', 'playoffs', 'ranking', 'team'];
  const prevTabIndex = useRef(0);
  const [tabDirection, setTabDirection] = useState(0);
  const [activeTab, setActiveTabRaw] = useState<TabType>('schedule');
  const setActiveTab = (tab: TabType) => {
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(tab);
    setTabDirection(newIdx > oldIdx ? 1 : -1);
    prevTabIndex.current = oldIdx;
    setActiveTabRaw(tab);
  };
  const [activeCategory, setActiveCategory] = useState<Category>('masculino');
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveMatchData | null>(null);
  const [showWizard, setShowWizard] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  React.useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  React.useEffect(() => {
    incrementVisits();
    updatePresence();
    const interval = setInterval(updatePresence, 60000); // Pulse every minute
    return () => clearInterval(interval);
  }, []);

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean; title: string; message: string; isDestructive: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false, title: '', message: '', isDestructive: false, onConfirm: () => {}
  });

  const requestConfirm = (title: string, message: string, isDestructive: boolean, onConfirm: () => void) => {
    setConfirmConfig({ isOpen: true, title, message, isDestructive, onConfirm });
  };
  const closeConfirm = () => setConfirmConfig(prev => ({ ...prev, isOpen: false }));

  const [promptConfig, setPromptConfig] = useState<{
    isOpen: boolean;
    title: string;
    defaultValue: string;
    placeholder?: string;
    onConfirm: (value: string) => void;
  }>({
    isOpen: false, title: '', defaultValue: '', onConfirm: () => {}
  });

  const requestPrompt = (title: string, defaultValue: string, onConfirm: (value: string) => void, placeholder?: string) => {
    setPromptConfig({ isOpen: true, title, defaultValue, placeholder, onConfirm });
  };
  const closePrompt = () => setPromptConfig(prev => ({ ...prev, isOpen: false }));

  const [simulation, setSimulation] = useState<{
    isOpen: boolean;
    step: 'idle' | 'league' | 'quarters' | 'semis' | 'finals' | 'done';
    progress: number;
    message: string;
  }>({ isOpen: false, step: 'idle', progress: 0, message: '' });

  const { matches, teams, appSettings } = useFirebaseSync(syncId);
  const authState = useAuth(appSettings.adminPin);
  const timer = useTimer();

  // Derived data
  const currentSport = SPORTS.find(s => s.id === appSettings.sportId) || SPORTS[0];
  const currentTeams = useMemo(() => {
    // Filter Firestore teams for the active category
    const firestoreTeams = teams.filter(t => t.category === activeCategory);
    // If we have Firestore teams for this category, use them; otherwise fall back to constants
    if (firestoreTeams.length > 0) return firestoreTeams;
    return activeCategory === 'masculino' ? TEAMS_MASCULINO : TEAMS_FEMENINO;
  }, [teams, activeCategory]);

  const schedule = useMemo(() => {
    return buildSchedule(currentTeams, activeCategory, {
      format: appSettings.format,
      startTime: appSettings.startTime,
      matchDurationMins: appSettings.matchDuration ? Math.floor(appSettings.matchDuration / 60) : undefined,
      restDurationMins: appSettings.restDuration,
      concurrentCourts: appSettings.concurrentCourts
    });
  }, [currentTeams, activeCategory, appSettings]);

  const standings = useMemo(() => {
    try {
      return calculateStandings(currentTeams, matches, activeCategory, undefined, appSettings.sportId);
    } catch (e) {
      console.error("Error calculating standings:", e);
      return [];
    }
  }, [matches, activeCategory, currentTeams, appSettings.sportId]);

  const groupAStandings = standings.filter(t => t.group === 'A' && !t.isRest);
  const groupBStandings = standings.filter(t => t.group === 'B' && !t.isRest);
  const exportText = useMemo(() => formatExportText(matches), [matches]);

  // ── Match Actions ──────────────────────────────────────────────

  const handleTeamClick = (teamName: string) => {
    if (!liveMatch) {
      setSelectedTeam(teamName);
      setActiveTab('team');
    }
  };

  const startNewMatch = async (t1Name: string, t2Name: string, groupOverride?: string, durationOverride?: number, customId?: string) => {
    const mInfo = schedule.find(m =>
      (m?.team1?.name === t1Name && m?.team2?.name === t2Name) ||
      (m?.team1?.name === t2Name && m?.team2?.name === t1Name)
    );
    const mId = customId || mInfo?.id || `${activeCategory}-${t1Name}-${t2Name}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    
    // Si ya existe en Firestore y está marcado como live, simplemente lo retomamos
    const existing = matches.find(m => m.id === mId);
    if (existing && existing.isLive) {
      handleResumeMatch(existing);
      return;
    }

    const newMatch = {
      id: mId,
      team1: t1Name, team2: t2Name, score1: 0, score2: 0,
      category: activeCategory,
      time: (groupOverride === 'PLAYOFF' ? 'PLAYOFF' : mInfo?.time) || 'PROG',
      round: (groupOverride === 'PLAYOFF' ? 0 : mInfo?.round) || 0,
      group: groupOverride || mInfo?.group || 'A',
      currentTime: durationOverride || appSettings.matchDuration || MATCH_DURATION_SECONDS,
      timerRunning: false,
      goalHistory: []
    };
    
    setLiveMatch(newMatch);
    
    // Limpiar otros partidos en vivo de la misma categoría para evitar duplicados
    if (authState.isAdminUser) {
      try {
        const otherLiveMatches = matches.filter(m => m.isLive && m.category === activeCategory && m.id !== mId);
        for (const m of otherLiveMatches) {
          await updateDoc(getMatchDoc(m.id), { isLive: false });
        }
        
        await setDoc(getMatchDoc(newMatch.id), {
          ...newMatch,
          isLive: true,
          played: false,
          updatedAt: Timestamp.now()
        }, { merge: true });
      } catch (e) {
        console.error("Error al iniciar partido en Firestore:", e);
      }
    }
    timer.setTime(durationOverride || appSettings.matchDuration || MATCH_DURATION_SECONDS);
    timer.setTimerRunning(false);
    setActiveTab('live');
  };

  const handleResumeMatch = (match: MatchRecord) => {
    if (!authState.isAdminUser) return;
    setLiveMatch(match);
    timer.setTime(match.currentTime || appSettings.matchDuration || MATCH_DURATION_SECONDS);
    timer.setTimerRunning(false);
    setActiveTab('live');
  };

  const updateScore = async (teamIndex: number, delta: number) => {
    if (!liveMatch) return;

    const currentS1 = liveMatch.score1;
    const currentS2 = liveMatch.score2;
    const newS1 = teamIndex === 1 ? Math.max(0, currentS1 + delta) : currentS1;
    const newS2 = teamIndex === 2 ? Math.max(0, currentS2 + delta) : currentS2;

    // Calcular nuevo historial
    let newHistory = [...(liveMatch.goalHistory || [])];
    if (delta > 0) {
      newHistory.push({
        teamIndex,
        time: timer.time,
        score: `${newS1}-${newS2}`,
        type: 'goal'
      });
    } else if (delta < 0) {
      // Si restamos, buscamos el último gol de ese equipo y lo borramos
      const lastGoalIdx = [...newHistory].reverse().findIndex(g => g.teamIndex === teamIndex && (g.type === 'goal' || !g.type));
      if (lastGoalIdx !== -1) {
        const actualIdx = newHistory.length - 1 - lastGoalIdx;
        newHistory.splice(actualIdx, 1);
      }
    }

    // Actualizar estado local
    setLiveMatch(prev => prev ? { ...prev, score1: newS1, score2: newS2, goalHistory: newHistory } : null);
    playClick();

    // Sincronización en tiempo real
    if (authState.isAdminUser && liveMatch.id) {
      try {
        await updateDoc(getMatchDoc(), {
          score1: newS1,
          score2: newS2,
          goalHistory: newHistory,
          isLive: true,
          updatedAt: Timestamp.now()
        });
      } catch (e) {
        console.error("Error actualizando marcador en Firestore:", e);
      }
    }
  };

  const updateCard = async (teamIndex: number, type: 'yellow' | 'red', delta: number) => {
    if (!liveMatch || !authState.isAdminUser) return;

    const yField = teamIndex === 1 ? 'yellowCards1' : 'yellowCards2';
    const rField = teamIndex === 1 ? 'redCards1' : 'redCards2';
    
    const currentY = liveMatch[yField] || 0;
    const currentR = liveMatch[rField] || 0;
    
    const newY = type === 'yellow' ? Math.max(0, currentY + delta) : currentY;
    const newR = type === 'red' ? Math.max(0, currentR + delta) : currentR;

    let newHistory = [...(liveMatch.goalHistory || [])];
    if (delta > 0) {
      newHistory.push({
        teamIndex,
        time: timer.time,
        score: type === 'yellow' ? 'AMARILLA' : 'ROJA',
        type
      });
    } else {
      const lastCardIdx = [...newHistory].reverse().findIndex(e => e.teamIndex === teamIndex && e.type === type);
      if (lastCardIdx !== -1) {
        newHistory.splice(newHistory.length - 1 - lastCardIdx, 1);
      }
    }

    const updates = {
      [yField]: newY,
      [rField]: newR,
      goalHistory: newHistory,
      isLive: true,
      updatedAt: Timestamp.now()
    };

    setLiveMatch(prev => prev ? { ...prev, ...updates } : null);
    playClick();

    if (liveMatch.id) {
      try {
        await updateDoc(getMatchDoc(), updates);
      } catch (e) {
        console.error("Error actualizando tarjetas en Firestore:", e);
      }
    }
  };

  const finalizeEndMatch = async (p1?: number, p2?: number) => {
    try {
      const matchData: any = {
        team1: liveMatch!.team1, team2: liveMatch!.team2,
        score1: liveMatch!.score1, score2: liveMatch!.score2,
        category: liveMatch!.category || activeCategory,
        group: liveMatch!.group || 'A', played: true, isLive: false, updatedAt: Timestamp.now(),
        yellowCards1: liveMatch!.yellowCards1 || 0,
        yellowCards2: liveMatch!.yellowCards2 || 0,
        redCards1: liveMatch!.redCards1 || 0,
        redCards2: liveMatch!.redCards2 || 0,
        goalHistory: liveMatch!.goalHistory || []
      };
      if (p1 !== undefined && p2 !== undefined) {
        matchData.penaltyScore1 = p1;
        matchData.penaltyScore2 = p2;
      }

      await setDoc(getMatchDoc(), matchData, { merge: true });
      
      const isPlayoff = liveMatch!.group === 'PLAYOFF';
      cancelLiveMatch();
      setActiveTab(isPlayoff ? 'playoffs' : 'schedule');
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'matches');
    }
  };

  const endMatch = async (p1?: number, p2?: number) => {
    if (!authState.isAdminUser || !liveMatch) return;
    requestConfirm("Guardar resultado", "¿Guardar resultado y finalizar el partido?", false, async () => {
      closeConfirm();
      await finalizeEndMatch(p1, p2);
    });
  };

  const cancelLiveMatch = () => {
    setLiveMatch(null);
    timer.setTimerRunning(false);
    timer.setTime(0);
  };

  const updateMatchResult = async (matchId: string, s1: number, s2: number) => {
    if (!authState.isAdminUser) return;
    try {
      await updateDoc(getMatchDoc(matchId), { score1: s1, score2: s2, played: true, updatedAt: Timestamp.now() });
    } catch (e) { handleFirestoreError(e, OperationType.UPDATE, `matches/${matchId}`); }
  };

  const deleteMatch = async (matchId: string) => {
    if (!authState.isAdminUser) return;
    requestConfirm("Borrar partido", "¿Estás seguro de que quieres borrar este resultado?", true, async () => {
      closeConfirm();
      try { await deleteDoc(getMatchDoc(matchId)); }
      catch (e) { handleFirestoreError(e, OperationType.DELETE, `matches/${matchId}`); }
    });
  };

  const resetMatches = async () => {
    if (!authState.isAdminUser) return;
    try {
      const q = query(getMatchesCol(), where('category', '==', activeCategory));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      toast.success("Categoría reseteada correctamente");
    } catch (e) {
      console.error("Error al resetear partidos:", e);
      toast.error("Error al resetear");
    }
  };

  const simulateTournament = async () => {
    if (!authState.isAdminUser) return;
    
    setSimulation({ isOpen: true, step: 'league', progress: 5, message: 'Iniciando simulación completa...' });
    await new Promise(r => setTimeout(r, 800));
    
    try {
      const batch = writeBatch(db);
      const simulatedMatches: any[] = [];

      const generateScore = () => {
        const sport = appSettings.sport;
        if (sport === 'basketball') return Math.floor(Math.random() * 25) + 15; // 15 to 39
        if (sport === 'volleyball') return Math.floor(Math.random() * 3); // 0 to 2
        if (sport === 'futsal' || sport === 'handball') return Math.floor(Math.random() * 6);
        return Math.floor(Math.random() * 4); // Default (Hockey)
      };

      // Helper para generar resultados de playoff (permite empates + penaltis)
      const generatePlayoffResult = () => {
        let s1 = generateScore();
        let s2 = generateScore();
        let p1, p2;
        if (s1 === s2) {
          if (appSettings.sport === 'basketball' || appSettings.sport === 'volleyball') {
            s1++; // Tie-break sin penaltis
          } else {
            // Si hay empate en playoff, simulamos penaltis
            p1 = Math.floor(Math.random() * 3) + 1;
            p2 = Math.floor(Math.random() * 3);
            // Asegurar que no hay empate en penaltis
            if (p1 === p2) p1++;
          }
        }
        return { s1, s2, p1, p2 };
      };

      // 1. LIGA
      setSimulation(s => ({ ...s, step: 'league', progress: 10, message: 'Generando resultados de Liga...' }));
      schedule.forEach(m => {
        if (m.isRestMatch) return;
        const s1 = generateScore();
        const s2 = generateScore();
        const mData = {
          id: m.id, team1: m.team1.name, team2: m.team2.name, score1: s1, score2: s2,
          played: true, isLive: false, category: activeCategory, group: m.group, 
          round: m.round, time: m.time
        };
        simulatedMatches.push(mData);
        batch.set(getMatchDoc(m.id), { ...mData, updatedAt: Timestamp.now() }, { merge: true });
      });
      await new Promise(r => setTimeout(r, 1200));

      if (appSettings.format === 'league') {
        await batch.commit();
        setSimulation(s => ({ ...s, step: 'done', progress: 100, message: '¡Liga simulada!' }));
        await new Promise(r => setTimeout(r, 1500));
        setSimulation(s => ({ ...s, isOpen: false }));
        closeConfirm();
        return;
      }

      // 2. PLAYOFFS
      setSimulation(s => ({ ...s, step: 'quarters', progress: 40, message: 'Calculando cruces de Playoff...' }));
      const sA = calculateStandings(teams.filter(t => t.category === activeCategory), simulatedMatches, activeCategory, 'A', appSettings.sportId);
      const sB = calculateStandings(teams.filter(t => t.category === activeCategory), simulatedMatches, activeCategory, 'B', appSettings.sportId);

      const hasQuarters = sA.length >= 4 && sB.length >= 4;
      const hasSemis = sA.length >= 2 && sB.length >= 2;
      
      let winnersC: string[] = [];
      if (hasQuarters) {
        const qMatches = [
          { id: `${activeCategory}_C1`, t1: sA[0], t2: sB[3] },
          { id: `${activeCategory}_C2`, t1: sB[1], t2: sA[2] },
          { id: `${activeCategory}_C3`, t1: sB[0], t2: sA[3] },
          { id: `${activeCategory}_C4`, t1: sA[1], t2: sB[2] },
        ];
        
        qMatches.forEach(m => {
          const { s1, s2, p1, p2 } = generatePlayoffResult();
          const mData: any = {
            id: m.id, team1: m.t1.name, team2: m.t2.name, score1: s1, score2: s2,
            played: true, isLive: false, category: activeCategory, group: 'PLAYOFF'
          };
          if (p1 !== undefined) { mData.penaltyScore1 = p1; mData.penaltyScore2 = p2; }
          simulatedMatches.push(mData);
          
          const winner = (s1 > s2) ? m.t1.name : (s2 > s1) ? m.t2.name : (p1! > p2! ? m.t1.name : m.t2.name);
          winnersC.push(winner);
          batch.set(getMatchDoc(m.id), { ...mData, updatedAt: Timestamp.now() }, { merge: true });
        });
        await new Promise(r => setTimeout(r, 1200));
      } else if (hasSemis) {
        winnersC = [sA[0].name, sB[1].name, sB[0].name, sA[1].name];
      }

      let winnersS: string[] = [];
      let losersS: string[] = [];
      if (winnersC.length === 4) {
        setSimulation(s => ({ ...s, step: 'semis', progress: 70, message: 'Simulando Semifinales...' }));
        const sMatches = [
          { id: `${activeCategory}_S1`, t1: winnersC[0], t2: winnersC[1] },
          { id: `${activeCategory}_S2`, t1: winnersC[2], t2: winnersC[3] },
        ];
        
        sMatches.forEach(m => {
          const { s1, s2, p1, p2 } = generatePlayoffResult();
          const mData: any = {
            id: m.id, team1: m.t1, team2: m.t2, score1: s1, score2: s2,
            played: true, isLive: false, category: activeCategory, group: 'PLAYOFF'
          };
          if (p1 !== undefined) { mData.penaltyScore1 = p1; mData.penaltyScore2 = p2; }
          simulatedMatches.push(mData);

          const winner = (s1 > s2) ? m.t1 : (s2 > s1) ? m.t2 : (p1! > p2! ? m.t1 : m.t2);
          const loser = (s1 > s2) ? m.t2 : (s2 > s1) ? m.t1 : (p1! > p2! ? m.t2 : m.t1);
          winnersS.push(winner);
          losersS.push(loser);
          batch.set(getMatchDoc(m.id), { ...mData, updatedAt: Timestamp.now() }, { merge: true });
        });
        await new Promise(r => setTimeout(r, 1200));
      } else if (sA.length >= 1 && sB.length >= 1) {
        winnersS = [sA[0].name, sB[0].name];
      }

      if (winnersS.length === 2) {
        setSimulation(s => ({ ...s, step: 'finals', progress: 90, message: 'Jugando Gran Final y 3º Puesto...' }));
        const finalMatches = [
          { id: `${activeCategory}_F`, t1: winnersS[0], t2: winnersS[1] }
        ];
        if (losersS.length === 2) {
          finalMatches.push({ id: `${activeCategory}_T`, t1: losersS[0], t2: losersS[1] });
        }
        
        finalMatches.forEach(m => {
          const { s1, s2, p1, p2 } = generatePlayoffResult();
          const mData: any = {
            id: m.id, team1: m.t1, team2: m.t2, score1: s1, score2: s2,
            played: true, isLive: false, category: activeCategory, group: 'PLAYOFF'
          };
          if (p1 !== undefined) { mData.penaltyScore1 = p1; mData.penaltyScore2 = p2; }
          batch.set(getMatchDoc(m.id), { ...mData, updatedAt: Timestamp.now() }, { merge: true });
        });
      }

      await batch.commit();
      setSimulation(s => ({ ...s, step: 'done', progress: 100, message: '¡Torneo simulado con empates y penaltis!' }));
      await new Promise(r => setTimeout(r, 1500));
      setSimulation(s => ({ ...s, isOpen: false }));
      closeConfirm();
    } catch (e) {
      console.error("Error al simular torneo:", e);
      setSimulation(s => ({ ...s, isOpen: false }));
      toast.error("Error al simular");
    }
  };

  // ── Settings & Team CRUD ───────────────────────────────────────

  const updateTitle = () => {
    requestPrompt("Nuevo título del torneo:", appSettings.title, async (newTitle) => {
      closePrompt();
      if (newTitle && authState.isAdminUser) {
        try { await updateDoc(getSettingsDoc(), { title: newTitle }); }
        catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'app/settings'); }
      }
    });
  };

  const updateDuration = () => {
    const currentMins = (appSettings.matchDuration || MATCH_DURATION_SECONDS) / 60;
    requestPrompt("Nueva duración del partido (minutos):", currentMins.toString(), async (newMins) => {
      closePrompt();
      const durationSecs = parseInt(newMins || '0') * 60;
      if (durationSecs > 0 && authState.isAdminUser) {
        try { await updateDoc(getSettingsDoc(), { matchDuration: durationSecs }); }
        catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'app/settings'); }
      }
    });
  };

  const updatePin = () => {
    requestPrompt("Nuevo PIN de administrador:", appSettings.adminPin || "I2026", async (newPin) => {
      closePrompt();
      if (newPin && authState.isAdminUser) {
        try { await updateDoc(getSettingsDoc(), { adminPin: newPin }); }
        catch (e) { handleFirestoreError(e, OperationType.UPDATE, 'app/settings'); }
      }
    });
  };

  const updateTeam = async (teamId: string, updates: Partial<Team>) => {
    if (!authState.isAdminUser) return;
    try { await updateDoc(getTeamDoc(teamId), updates); }
    catch (e) { handleFirestoreError(e, OperationType.UPDATE, `teams/${teamId}`); }
  };

  const addTeam = (category: Category) => {
    if (!authState.isAdminUser) return;
    requestPrompt("Nombre del nuevo equipo:", "", (name) => {
      closePrompt();
      if (!name) return;
      setTimeout(() => {
        requestPrompt(`Grupo (A o B) para ${name}:`, "A", async (groupInput) => {
          closePrompt();
          const group = groupInput.toUpperCase();
          if (group !== 'A' && group !== 'B') return;
          try {
            await setDoc(doc(getTeamsCol()), {
              name, color: "#" + Math.floor(Math.random() * 16777215).toString(16), group, category, isRest: false
            });
          } catch (e) { handleFirestoreError(e, OperationType.CREATE, 'teams'); }
        });
      }, 300);
    });
  };

  const deleteTeam = async (teamId: string) => {
    if (!authState.isAdminUser) return;
    requestConfirm("Borrar equipo", "¿Borrar este equipo? Se mantendrán sus partidos jugados.", true, async () => {
      closeConfirm();
      try { await deleteDoc(getTeamDoc(teamId)); }
      catch (e) { handleFirestoreError(e, OperationType.DELETE, `teams/${teamId}`); }
    });
  };

  const bulkAddTeams = async (count: number, category: Category) => {
    if (!authState.isAdminUser) return;
    const TEAM_NAMES = [
      'Alfa', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot',
      'Golf', 'Hotel', 'India', 'Juliet', 'Kilo', 'Lima',
      'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo',
      'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'X-Ray',
    ];
    const COLORS = [
      '#E53935', '#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1',
      '#D81B60', '#3949AB', '#00897B', '#F4511E', '#5E35B1', '#039BE5',
      '#C0CA33', '#6D4C41', '#546E7A', '#FFB300', '#7CB342', '#EC407A',
      '#AB47BC', '#26A69A', '#FF7043', '#5C6BC0', '#EF5350', '#29B6F6',
    ];
    const existing = currentTeams.filter(t => t.category === category && !t.isRest);
    const startIdx = existing.length;
    const toastId = toast.loading(`Creando ${count} equipos...`);
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < count; i++) {
        const idx = startIdx + i;
        const name = `Equipo ${TEAM_NAMES[idx % TEAM_NAMES.length]}${idx >= TEAM_NAMES.length ? ` ${Math.floor(idx / TEAM_NAMES.length) + 1}` : ''}`;
        const color = COLORS[idx % COLORS.length];
        const group = i < Math.ceil(count / 2) ? 'A' : 'B';
        batch.set(doc(getTeamsCol()), {
          name, color, group, category, isRest: false
        });
      }
      await batch.commit();
      toast.success(`¡${count} equipos creados con éxito!`, { id: toastId });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'teams/bulk');
      toast.error('Error al crear equipos', { id: toastId });
    }
  };

  const seedDatabase = async () => {
    if (!authState.isAdminUser || !authState.user) return;
    const batch = writeBatch(db);
    batch.set(getSettingsDoc(), { title: 'Torneo Hockey Intercentros 2026' });
    batch.set(doc(db, 'admins', authState.user.uid), { email: authState.user.email });
    [...TEAMS_MASCULINO, ...TEAMS_FEMENINO].forEach(team => {
      const { id, ...teamData } = team;
      batch.set(doc(getTeamsCol()), teamData);
    });
    try { 
      await batch.commit(); 
      toast.success("¡Base de datos inicializada!"); 
    }
    catch (e) { handleFirestoreError(e, OperationType.WRITE, 'batch seeding'); }
  };

  const handleDownloadPDF = async () => {
    if (!authState.isAdminUser) return;
    try {
      const { generateTournamentPDF } = await import('../utils/pdfGenerator');
      generateTournamentPDF(activeCategory, currentTeams, matches, standings);
      toast.success("PDF descargado con éxito");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar el PDF");
    }
  };

  const handleDownloadPrintable = async () => {
    if (!authState.isAdminUser) return;
    try {
      const { generatePrintableTemplates } = await import('../utils/printTemplates');
      generatePrintableTemplates(activeCategory, currentTeams);
      toast.success("Plantilla descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error al generar plantilla");
    }
  };

  const handleCreateTournament = async (result: WizardResult) => {
    if (!authState.isAdminUser) return;
    toast.loading('Creando torneo...', { id: 'wizard-toast' });
    try {
      const batch = writeBatch(db);

      // 1. Delete old teams
      const oldTeams = await getDocs(getTeamsCol());
      oldTeams.forEach(d => batch.delete(d.ref));

      // 2. Delete old matches
      const oldMatches = await getDocs(getMatchesCol());
      oldMatches.forEach(d => batch.delete(d.ref));

      // 3. Create new teams for each category
      for (const cat of result.categories) {
        const teams = result.teams[cat] || [];
        const midPoint = Math.ceil(teams.length / 2);
        teams.forEach((t, idx) => {
          const teamId = `${cat}_t${idx + 1}`;
          const teamRef = getTeamDoc(teamId);
          batch.set(teamRef, {
            name: t.name,
            color: t.color,
            group: idx < midPoint ? 'A' : 'B',
            category: cat,
            isRest: false,
          });
        });
      }

      // 4. Update app settings
      const settingsRef = getSettingsDoc();
      batch.set(settingsRef, {
        title: `${result.sport.icon} ${result.tournamentName}`,
        sportId: result.sport.id,
        tournamentName: result.tournamentName,
        matchDuration: result.sport.defaultDuration || appSettings.matchDuration || 600,
        adminPin: appSettings.adminPin || '1234',
      }, { merge: true });

      await batch.commit();
      setShowWizard(false);
      setActiveCategory(result.categories[0] as Category);
      setActiveTab('schedule');
      toast.success('¡Torneo creado!', { id: 'wizard-toast' });
    } catch (e: any) {
      console.error('Wizard error:', e);
      toast.error(`Error: ${e?.message || 'Error desconocido'}`, { id: 'wizard-toast' });
    }
  };

  const handleArchiveTournament = async () => {
    if (!authState.isAdminUser || !syncId) return;
    requestConfirm(
      "ARCHIVAR TORNEO", 
      "El torneo dejará de ser visible en la lista principal, pero no se borrará permanentemente. Podrás acceder a él si conoces el enlace directo.", 
      false, 
      async () => {
        closeConfirm();
        toast.loading("Archivando torneo...", { id: 'archive-toast' });
        try {
          await updateDoc(getSettingsDoc(), { isArchived: true });
          toast.success("Torneo archivado", { id: 'archive-toast' });
          navigate('/');
        } catch (e: any) {
          toast.error("Error al archivar", { id: 'archive-toast' });
        }
      }
    );
  };

  const handleDeleteTournament = async () => {
    if (!authState.isAdminUser) return;
    requestConfirm(
      "ELIMINAR TORNEO", 
      "ATENCIÓN: Vas a borrar TODOS los equipos y TODOS los partidos del torneo actual. Esta acción NO se puede deshacer. ¿Estás absolutamente seguro?", 
      true, 
      async () => {
        closeConfirm();
        toast.loading("Eliminando torneo...", { id: 'delete-toast' });
        try {
          const batch = writeBatch(db);
          const oldTeams = await getDocs(getTeamsCol());
          oldTeams.forEach(d => batch.delete(d.ref));
          const oldMatches = await getDocs(getMatchesCol());
          oldMatches.forEach(d => batch.delete(d.ref));
          
          if (syncId) {
            batch.delete(getSettingsDoc());
          }
          
          await batch.commit();
          toast.success("Torneo eliminado", { id: 'delete-toast' });
          navigate("/");
        } catch (e) {
          console.error(e);
          toast.error("Error al eliminar torneo", { id: 'delete-toast' });
        }
      }
    );
  };

  const handleDuplicateTournament = async () => {
    if (!authState.isAdminUser || !syncId) return;
    const originalName = appSettings.tournamentName || appSettings.title || 'Torneo';
    requestPrompt(
      "Nombre del torneo duplicado:",
      `${originalName} - Copia`,
      async (newTournamentName) => {
        closePrompt();
        if (!newTournamentName) return;
        toast.loading('Duplicando torneo...', { id: 'duplicate-toast' });
        try {
          const newId = newTournamentName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
          const batch = writeBatch(db);

          // 1. Copy tournament settings
          const newSettingsRef = doc(db, 'tournaments', newId);
          const icon = (appSettings.title || '🏆').split(' ')[0];
          const newTitle = icon.length === 2 ? `${icon} ${newTournamentName}` : newTournamentName;

          batch.set(newSettingsRef, {
            ...appSettings,
            title: newTitle,
            tournamentName: newTournamentName,
            createdAt: new Date().toISOString(),
            isArchived: false, // Ensure the new duplicate is not archived
          });

          // 2. Fetch all current teams and copy them
          const oldTeamsSnap = await getDocs(getTeamsCol());
          oldTeamsSnap.forEach(d => {
            const newTeamRef = doc(db, 'tournaments', newId, 'teams', d.id);
            batch.set(newTeamRef, d.data());
          });

          // 3. Fetch all current matches and copy them
          const oldMatchesSnap = await getDocs(getMatchesCol());
          oldMatchesSnap.forEach(d => {
            const newMatchRef = doc(db, 'tournaments', newId, 'matches', d.id);
            batch.set(newMatchRef, {
              ...d.data(),
              timerRunning: false, // Ensure timers aren't active in duplicate
            });
          });

          await batch.commit();
          toast.success('¡Torneo duplicado con éxito!', { id: 'duplicate-toast' });
          navigate(`/t/${newId}`);
        } catch (e: any) {
          console.error("Duplicate tournament error:", e);
          toast.error(`Error al duplicar: ${e?.message || 'Error desconocido'}`, { id: 'duplicate-toast' });
        }
      }
    );
  };

  const handleShuffleGroups = async () => {
    if (!authState.isAdminUser) return;
    requestConfirm(
      "Sortear Grupos", 
      "¿Estás seguro de que quieres sortear los grupos de esta categoría? Esto asignará los equipos aleatoriamente a los grupos A y B, y borrará TODOS los partidos actuales de esta categoría.", 
      true, 
      async () => {
        closeConfirm();
        toast.loading("Sorteando grupos...", { id: 'shuffle-toast' });
        try {
          // Get the base teams for this category (always from constants to avoid stale state)
          const baseTeams = activeCategory === 'masculino' ? TEAMS_MASCULINO : TEAMS_FEMENINO;
          const teamsToShuffle = baseTeams.filter(t => !t.isRest);
          
          // Fisher-Yates shuffle
          const shuffled = [...teamsToShuffle];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          
          const batch = writeBatch(db);
          const midPoint = Math.ceil(shuffled.length / 2);
          
          shuffled.forEach((t, idx) => {
            const newGroup = idx < midPoint ? 'A' : 'B';
            // Use the original static ID as the Firestore doc ID for consistency
            const teamRef = getTeamDoc(t.id);
            batch.set(teamRef, {
              name: t.name,
              color: t.color,
              group: newGroup,
              category: activeCategory,
              isRest: t.isRest || false,
            });
          });
          
          // Delete all matches for this category
          const qMatches = query(getMatchesCol(), where('category', '==', activeCategory));
          const matchDocs = await getDocs(qMatches);
          matchDocs.forEach(d => batch.delete(d.ref));
          
          await batch.commit();
          toast.success("Grupos sorteados correctamente", { id: 'shuffle-toast' });
        } catch (e: any) {
          console.error('Shuffle error:', e);
          toast.error(`Error: ${e?.message || 'Error desconocido'}`, { id: 'shuffle-toast' });
        }
      }
    );
  };

  const [viewingMatchId, setViewingMatchId] = useState<string | null>(null);
  const viewingMatch = viewingMatchId ? matches.find(m => m.id === viewingMatchId) : null;

  // ── Render ─────────────────────────────────────────────────────

  if (viewingMatch) {
    return (
      <>
        <LiveMatchView
          liveMatch={viewingMatch}
          time={viewingMatch.id === liveMatch?.id ? timer.time : (viewingMatch.currentTime ?? 0)}
          timerRunning={viewingMatch.id === liveMatch?.id ? timer.timerRunning : (viewingMatch.timerRunning ?? false)}
          isAdminUser={authState.isAdminUser && viewingMatch.id === liveMatch?.id}
          activeCategory={viewingMatch.category}
          matchDuration={appSettings.matchDuration || MATCH_DURATION_SECONDS}
          setTime={timer.setTime}
          setTimerRunning={timer.setTimerRunning}
          onUpdateScore={updateScore}
          onUpdateCard={updateCard}
          onEndMatch={(p1, p2) => endMatch(p1, p2)}
          onCancel={() => setViewingMatchId(null)}
          allTeams={teams}
          scoreLabel={currentSport.scoreLabel}
          sportId={appSettings.sportId}
        />
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDestructive={confirmConfig.isDestructive}
          onConfirm={confirmConfig.onConfirm}
          onCancel={closeConfirm}
        />
      </>
    );
  }

  if (activeTab === 'live' && liveMatch) {
    return (
      <>
        <LiveMatchView
          liveMatch={liveMatch}
          time={timer.time}
          timerRunning={timer.timerRunning}
          isAdminUser={authState.isAdminUser}
          activeCategory={activeCategory}
          matchDuration={appSettings.matchDuration || MATCH_DURATION_SECONDS}
          setTime={timer.setTime}
          setTimerRunning={timer.setTimerRunning}
          onUpdateScore={updateScore}
          onUpdateCard={updateCard}
          onEndMatch={(p1, p2) => endMatch(p1, p2)}
          onCancel={() => requestConfirm("Salir", "¿Salir del partido sin guardar? Se perderá el progreso actual.", true, () => {
            closeConfirm();
            const isPlayoff = liveMatch.group === 'PLAYOFF';
            cancelLiveMatch();
            setActiveTab(isPlayoff ? 'playoffs' : 'schedule');
          })}
          allTeams={teams}
          scoreLabel={currentSport.scoreLabel}
          sportId={appSettings.sportId}
        />
        <ConfirmModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          message={confirmConfig.message}
          isDestructive={confirmConfig.isDestructive}
          onConfirm={confirmConfig.onConfirm}
          onCancel={closeConfirm}
        />
      </>
    );
  }

  return (
    <div className={`min-h-screen bg-natural-bg flex flex-col font-sans pb-10 text-natural-text transition-colors duration-300 category-${activeCategory}`}>
      
      <LiveScoreBar 
        matches={matches} 
        onTeamClick={(teamName, category, match) => {
          if (authState.isAdminUser && match.isLive) {
            handleResumeMatch(match);
          } else {
            setViewingMatchId(match.id);
            setActiveCategory(category);
            setActiveTab('team');
            setSelectedTeam(teamName);
          }
        }}
      />
      <Header
        appSettings={appSettings}
        user={authState.user}
        isAdminUser={authState.isAdminUser}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(!isDarkMode)}
        onSignIn={authState.handleSignIn}
        onLogOut={authState.handleLogOut}
        onUpdateTitle={updateTitle}
        onUpdateDuration={updateDuration}
        onUpdatePin={updatePin}
        onShowPinModal={() => authState.setShowPinModal(true)}
        onShowQRModal={() => setShowQRModal(true)}
        onDownloadPDF={handleDownloadPDF}
        onShuffleGroups={handleShuffleGroups}
        onDownloadPrintable={handleDownloadPrintable}
        onCreateTournament={() => setShowWizard(true)}
        onArchiveTournament={handleArchiveTournament}
        onDeleteTournament={handleDeleteTournament}
        onDuplicateTournament={handleDuplicateTournament}
        onGoHome={() => navigate('/')}
      />

      <NavTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        setSelectedTeam={setSelectedTeam}
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        format={appSettings?.format}
      />

      <main className="flex-1 p-2 md:p-4 w-full mx-auto max-w-4xl overflow-x-hidden" id="content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + activeCategory}
            initial={{ opacity: 0, x: tabDirection * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: tabDirection * -40 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            {activeTab === 'schedule' && (
              <ScheduleView
                schedule={schedule}
                matches={matches}
                activeCategory={activeCategory}
                isAdminUser={authState.isAdminUser}
                onTeamClick={handleTeamClick}
                onStartMatch={(t1, t2, grp, id) => startNewMatch(t1, t2, grp, undefined, id)}
                onUpdateMatchResult={updateMatchResult}
                onDeleteMatch={deleteMatch}
                onResumeMatch={handleResumeMatch}
                requestPrompt={requestPrompt}
                requestConfirm={requestConfirm}
              />
            )}

            {activeTab === 'standings' && (
              <StandingsView
                groupAStandings={groupAStandings}
                groupBStandings={groupBStandings}
                exportText={exportText}
                isAdminUser={authState.isAdminUser}
                onTeamClick={handleTeamClick}
                scoreLabelPlural={currentSport.scoreLabelPlural}
              />
            )}

            {activeTab === 'playoffs' && (
              <PlayoffsView
                groupAStandings={groupAStandings}
                groupBStandings={groupBStandings}
                isAdminUser={authState.isAdminUser}
                currentTeams={currentTeams}
                activeCategory={activeCategory}
                matches={matches}
                schedule={schedule}
                onTeamClick={handleTeamClick}
                onStartMatch={(t1, t2, group, id, dur) => startNewMatch(t1, t2, group, dur, id)}
                onDeleteMatch={deleteMatch}
                onResumeMatch={handleResumeMatch}
                format={appSettings?.format}
              />
            )}
            
            {activeTab === 'ranking' && (
              <RankingView
                groupAStandings={groupAStandings}
                groupBStandings={groupBStandings}
                standings={standings}
                currentTeams={currentTeams}
                activeCategory={activeCategory}
                matches={matches}
                onTeamClick={handleTeamClick}
                format={appSettings?.format}
                schedule={schedule}
              />
            )}

            {activeTab === 'team' && (
              <TeamsView
                currentTeams={currentTeams}
                selectedTeam={selectedTeam}
                setSelectedTeam={setSelectedTeam}
                standings={standings}
                schedule={schedule}
                matches={matches}
                activeCategory={activeCategory}
                isAdminUser={authState.isAdminUser}
                hasTeamsInDb={teams.length > 0}
                onSeedDatabase={seedDatabase}
                onAddTeam={addTeam}
                onBulkAddTeams={bulkAddTeams}
                onUpdateTeam={updateTeam}
                onDeleteTeam={deleteTeam}
                onResetMatches={resetMatches}
                onSimulateTournament={simulateTournament}
                requestPrompt={requestPrompt}
                requestConfirm={requestConfirm}
              />
            )}
          </motion.div>
        </AnimatePresence>
        <Footer />
      </main>


      {/* Modals */}

      {authState.showPinModal && (
        <PinModal
          pinInput={authState.pinInput}
          setPinInput={authState.setPinInput}
          onSubmit={authState.handlePinSubmit}
          onClose={() => authState.setShowPinModal(false)}
        />
      )}

      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        isDestructive={confirmConfig.isDestructive}
        onConfirm={confirmConfig.onConfirm}
        onCancel={closeConfirm}
      />

      <QRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        url="https://hockey-intercentros-2026.web.app"
        title={appSettings.title}
      />
      
      <PromptModal
        isOpen={promptConfig.isOpen}
        title={promptConfig.title}
        defaultValue={promptConfig.defaultValue}
        placeholder={promptConfig.placeholder}
        onConfirm={promptConfig.onConfirm}
        onCancel={closePrompt}
      />
      <SimulationModal 
        isOpen={simulation.isOpen}
        step={simulation.step}
        progress={simulation.progress}
        message={simulation.message}
      />

      <React.Suspense fallback={null}>
        <TournamentWizard
          isOpen={showWizard}
          onClose={() => setShowWizard(false)}
          onComplete={handleCreateTournament}
        />
      </React.Suspense>
    </div>
  );
}
