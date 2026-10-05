import { useState, useEffect, useRef } from 'react';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Team, MatchRecord, AppSettings } from '../types';
import toast from 'react-hot-toast';
import { playHorn } from '../utils/audio';

export function useFirebaseSync(tournamentId?: string) {
  const [matches, setMatches] = useState<MatchRecord[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({
    title: 'Torneo Intercentros 2026'
  });
  
  const prevMatchesRef = useRef<MatchRecord[]>([]);

  // Ask for notification permission on the first interaction, not on page load
  // (browsers ignore or penalise prompts that are not triggered by the user).
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'default') return;
    const ask = () => {
      window.removeEventListener('pointerdown', ask);
      Notification.requestPermission().catch(() => {});
    };
    window.addEventListener('pointerdown', ask);
    return () => window.removeEventListener('pointerdown', ask);
  }, []);

  // Sync Settings
  useEffect(() => {
    const settingsRef = tournamentId 
      ? doc(db, 'tournaments', tournamentId) 
      : doc(db, 'app', 'settings');
      
    const unsub = onSnapshot(
      settingsRef,
      (snap) => {
        if (snap.exists()) {
          setAppSettings(snap.data() as AppSettings);
        }
      },
      (err) => console.warn('Settings sync error:', err.code)
    );
    return unsub;
  }, [tournamentId]);

  // Sync Teams
  useEffect(() => {
    const teamsRef = tournamentId 
      ? collection(db, 'tournaments', tournamentId, 'teams') 
      : collection(db, 'teams');

    const unsub = onSnapshot(
      teamsRef,
      (snap) => {
        if (snap.empty) {
          setTeams([]);
        } else {
          const tList = snap.docs.map(d => ({ ...d.data(), id: d.id } as Team));
          setTeams(tList);
        }
      },
      (err) => console.warn('Teams sync error:', err.code)
    );
    return unsub;
  }, [tournamentId]);

  // Sync Matches
  useEffect(() => {
    const matchesRef = tournamentId 
      ? collection(db, 'tournaments', tournamentId, 'matches') 
      : collection(db, 'matches');

    const unsub = onSnapshot(
      matchesRef,
      (snap) => {
        const mList = snap.docs.map(d => ({ ...d.data(), id: d.id } as MatchRecord));
        
        // Check for new goals
        if (prevMatchesRef.current.length > 0) {
          mList.forEach(newMatch => {
            const oldMatch = prevMatchesRef.current.find(m => m.id === newMatch.id);
            if (oldMatch) {
              const goal1 = newMatch.score1 > oldMatch.score1;
              const goal2 = newMatch.score2 > oldMatch.score2;
              
              if (goal1 || goal2) {
                const scoringTeam = goal1 ? newMatch.team1 : newMatch.team2;
                // Get dynamic score label based on sportId if available, fallback to Gol
                const scoreLabel = appSettings.sportId 
                  ? (appSettings.sportId === 'basketball' ? 'Canasta' : appSettings.sportId === 'volleyball' ? 'Punto' : 'Gol') 
                  : 'Gol';
                const msg = `¡${scoreLabel.toUpperCase()} de ${scoringTeam}! (${newMatch.score1} - ${newMatch.score2})`;
                
                // Toast
                toast.success(msg, {
                  icon: '🏆',
                  style: { borderRadius: '20px', background: '#333', color: '#fff' }
                });
                
                // Sound
                playHorn();
                
                // System Notification
                if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
                  new Notification(appSettings.title || "Torneo", {
                    body: msg,
                    icon: '/logo.png'
                  });
                }
              }
            }
          });
        }
        
        prevMatchesRef.current = mList;
        setMatches(mList);
      },
      (err) => console.warn('Matches sync error:', err.code)
    );
    return unsub;
  }, [tournamentId, appSettings.sportId, appSettings.title]);

  return { matches, teams, appSettings };
}
