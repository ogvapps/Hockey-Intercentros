import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, doc, writeBatch, updateDoc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { WizardResult } from './TournamentWizard';
import { Wand2, Trophy, ArrowRight, ChevronDown, RotateCcw, Copy, Archive, Trash2, Key } from 'lucide-react';
import { Footer } from './Footer';
import { useAuth } from '../hooks/useAuth';
import { PinModal } from './PinModal';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const TournamentWizard = React.lazy(() => import('./TournamentWizard').then(m => ({ default: m.TournamentWizard })));

export const HomeView: React.FC = () => {
  const [tournaments, setTournaments] = useState<{ id: string, title: string, tournamentName: string, icon: string }[]>([]);
  const [archivedTournaments, setArchivedTournaments] = useState<{ id: string, title: string, tournamentName: string, icon: string }[]>([]);
  const [showWizard, setShowWizard] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  
  const authState = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const all = snap.docs.map(d => ({
        id: d.id,
        title: d.data().title || 'Torneo Sin Nombre',
        tournamentName: d.data().tournamentName || d.data().title || 'Torneo Sin Nombre',
        icon: (d.data().title || '🏆').split(' ')[0],
        isArchived: d.data().isArchived === true
      }));
      setTournaments(all.filter(t => !t.isArchived));
      setArchivedTournaments(all.filter(t => t.isArchived));
    });
    return unsub;
  }, []);

  const handleCreateTournament = async (result: WizardResult) => {
    if (!authState.isAdminUser) return;
    toast.loading('Creando torneo...', { id: 'wizard-toast' });
    try {
      const batch = writeBatch(db);
      const newId = result.tournamentName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString().slice(-4);
      const settingsRef = doc(db, 'tournaments', newId);
      batch.set(settingsRef, {
        title: `${result.sport.icon} ${result.tournamentName}`,
        sportId: result.sport.id,
        tournamentName: result.tournamentName,
        matchDuration: result.matchDuration > 0 ? result.matchDuration : (result.sport.defaultDuration || 600),
        adminPin: '1234',
        createdAt: new Date().toISOString(),
        format: result.format,
        startTime: result.startTime,
        endTime: result.endTime,
        concurrentCourts: result.concurrentCourts,
        restDuration: result.restDuration
      });

      for (const cat of result.categories) {
        const teams = result.teams[cat] || [];
        const midPoint = Math.ceil(teams.length / 2);
        teams.forEach((t, idx) => {
          batch.set(doc(db, 'tournaments', newId, 'teams', `${cat}_t${idx + 1}`), {
            name: t.name, color: t.color, group: result.format === 'league' ? 'A' : (idx < midPoint ? 'A' : 'B'), category: cat, isRest: false,
          });
        });
      }
      await batch.commit();
      setShowWizard(false);
      toast.success('¡Torneo creado!', { id: 'wizard-toast' });
      navigate(`/t/${newId}`);
    } catch (e: any) {
      toast.error(`Error: ${e?.message}`, { id: 'wizard-toast' });
    }
  };

  const handleAction = async (id: string, action: 'archive' | 'delete' | 'restore') => {
    if (action === 'delete' && !window.confirm("Borrar permanentemente. ¿Continuar?")) return;
    const toastId = toast.loading('Procesando...');
    try {
      if (action === 'delete') {
        const batch = writeBatch(db);
        const [teams, matches] = await Promise.all([
          getDocs(collection(db, 'tournaments', id, 'teams')),
          getDocs(collection(db, 'tournaments', id, 'matches'))
        ]);
        teams.forEach(d => batch.delete(d.ref));
        matches.forEach(d => batch.delete(d.ref));
        batch.delete(doc(db, 'tournaments', id));
        await batch.commit();
      } else {
        await updateDoc(doc(db, 'tournaments', id), { isArchived: action === 'archive' });
      }
      toast.success('¡Hecho!', { id: toastId });
    } catch (e) {
      toast.error('Error', { id: toastId });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="min-h-screen bg-natural-bg font-sans text-natural-text relative overflow-x-hidden">
      <div className="absolute top-0 left-0 w-full h-[50vh] hero-mesh-gradient -z-10" />

      <div className="relative z-10 flex flex-col items-center pt-16 md:pt-24 px-4 pb-20">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
          animate={{ scale: 1, opacity: 1, rotate: -3 }}
          transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
          className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-natural-primary/20 p-2 glow-pulse-card mb-8"
        >
          <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-6xl font-black font-serif text-center tracking-tight mb-4"
        >
          <span className="text-gradient-animate">Intercentros</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-natural-text/50 font-medium text-center max-w-md mb-12"
        >
          La plataforma definitiva de gestión y retransmisión deportiva escolar.
        </motion.p>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="w-full max-w-xl space-y-4"
        >
          {tournaments.length === 0 ? (
            <motion.div variants={itemVariants} className="text-center p-12 card-glass rounded-3xl border border-natural-border/30 shadow-xl">
              <Trophy className="w-12 h-12 mx-auto text-natural-primary/40 mb-4 animate-bounce" />
              <p className="text-natural-dark/60 font-bold text-lg">Aún no hay torneos en curso</p>
            </motion.div>
          ) : (
            tournaments.map((t, index) => (
              <motion.div
                key={t.id}
                variants={itemVariants}
                whileHover={{ scale: 1.02, translateY: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/t/${t.id}`)}
                className="group relative w-full flex items-center p-5 md:p-6 card-glass rounded-2xl shadow-lg border border-natural-border/50 hover:border-natural-primary/50 cursor-pointer overflow-hidden tournament-card-shine"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-natural-primary/0 via-natural-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-natural-primary to-purple-600 flex items-center justify-center text-2xl shadow-inner mr-4 md:mr-6 shrink-0">
                  <span className="drop-shadow-md">{t.icon}</span>
                </div>
                
                <div className="relative z-10 flex-1 min-w-0">
                  <h3 className="font-black text-natural-dark text-lg md:text-xl truncate tracking-tight">{t.tournamentName}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs font-bold text-natural-text/50 uppercase tracking-wider">En Vivo</span>
                  </div>
                </div>

                <div className="relative z-10 flex items-center gap-2 shrink-0">
                  {authState.isAdminUser && (
                    <div className="flex items-center gap-1.5 mr-2" onClick={e => e.stopPropagation()}>
                      <button onClick={() => handleAction(t.id, 'archive')} className="p-2 text-orange-500 hover:bg-orange-500/10 rounded-xl transition-colors backdrop-blur-md border border-orange-500/20" title="Archivar"><Archive className="w-4 h-4" /></button>
                      <button onClick={() => handleAction(t.id, 'delete')} className="p-2 text-red-500 hover:bg-red-500/10 rounded-xl transition-colors backdrop-blur-md border border-red-500/20" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                  <div className="w-10 h-10 rounded-full bg-natural-sidebar/50 flex items-center justify-center group-hover:bg-natural-primary group-hover:text-white text-natural-text/30 transition-all duration-300">
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </motion.div>
            ))
          )}

          {authState.isAdminUser && (
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowWizard(true)}
              className="w-full mt-6 py-5 flex items-center justify-center gap-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all group overflow-hidden relative"
            >
              <div className="absolute inset-0 shimmer-line" />
              <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" /> 
              <span className="text-lg tracking-wide drop-shadow-sm">CREAR NUEVO TORNEO</span>
            </motion.button>
          )}

          {!authState.isAdminUser && (
            <motion.button
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => authState.setShowPinModal(true)}
              className="w-full mt-8 py-4 flex items-center justify-center gap-3 card-glass border border-natural-border text-natural-text rounded-2xl font-black hover:bg-natural-sidebar transition-all group"
            >
              <Key className="w-5 h-5 text-natural-text/50 group-hover:text-natural-primary transition-colors" /> 
              <span>Acceso Administrador</span>
            </motion.button>
          )}

          <motion.button
            variants={itemVariants}
            onClick={() => navigate(`/t/legacy`)}
            className="w-full py-4 flex items-center justify-center gap-2 bg-transparent text-natural-text/40 hover:text-natural-text/80 font-bold rounded-2xl transition-all mt-4"
          >
            Torneo Antiguo (Legacy) <ArrowRight className="w-4 h-4" />
          </motion.button>
        </motion.div>
      </div>

      <React.Suspense fallback={null}>
        {showWizard && <TournamentWizard isOpen={showWizard} onClose={() => setShowWizard(false)} onComplete={handleCreateTournament} />}
      </React.Suspense>
      {authState.showPinModal && <PinModal pinInput={authState.pinInput} setPinInput={authState.setPinInput} onSubmit={authState.handlePinSubmit} onClose={() => authState.setShowPinModal(false)} />}
      <Footer />
    </div>
  );
};

