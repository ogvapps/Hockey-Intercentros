import React from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { Activity, Edit2, LogIn, LogOut, Settings, Clock, Share2, Moon, Sun, Key, User as UserIcon, Eye, FileDown, Shuffle, Printer, Wand2, Trash2, Home, Archive, Copy } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, subscribeToOnlineCount } from '../services/firebase';
import { AppSettings } from '../types';

interface HeaderProps {
  appSettings: AppSettings;
  user: FirebaseUser | null;
  isAdminUser: boolean;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onSignIn: () => void;
  onLogOut: () => void;
  onUpdateTitle: () => void;
  onUpdateDuration: () => void;
  onUpdatePin: () => void;
  onShowPinModal: () => void;
  onShowQRModal: () => void;
  onDownloadPDF: () => void;
  onShuffleGroups: () => void;
  onDownloadPrintable: () => void;
  onCreateTournament: () => void;
  onArchiveTournament: () => void;
  onDeleteTournament: () => void;
  onDuplicateTournament: () => void;
  onGoHome?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  appSettings,
  user,
  isAdminUser,
  isDarkMode,
  onToggleDarkMode,
  onSignIn,
  onLogOut,
  onUpdateTitle,
  onUpdateDuration,
  onUpdatePin,
  onShowPinModal,
  onShowQRModal,
  onDownloadPDF,
  onShuffleGroups,
  onDownloadPrintable,
  onCreateTournament,
  onArchiveTournament,
  onDeleteTournament,
  onDuplicateTournament,
  onGoHome,
}) => {
  const [visitCount, setVisitCount] = React.useState<number | null>(null);
  const [onlineCount, setOnlineCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (user?.email === 'orestesgvillanueva@gmail.com') {
      const unsubVisits = onSnapshot(doc(db, 'stats', 'visits'), (snap) => {
        if (snap.exists()) {
          setVisitCount(snap.data().total);
        }
      });

      const unsubOnline = subscribeToOnlineCount(setOnlineCount);

      return () => {
        unsubVisits();
        unsubOnline();
      };
    }
  }, [user]);

  const isAdminStats = user?.email === 'orestesgvillanueva@gmail.com';

  return (
  <header className="bg-natural-sidebar text-natural-dark p-4 md:p-6 border-b border-natural-border shadow-sm z-10 relative">
    {/* Top Bar for Actions */}
    <div className="flex justify-between items-center mb-6 w-full max-w-4xl mx-auto">
      {/* Left Actions */}
      <div className="flex gap-2">
        {onGoHome && (
          <button
            onClick={onGoHome}
            className="flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95 border border-natural-border/50"
            title="Volver al Hub"
          >
            <Home className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={onShowQRModal}
          className="flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95 border border-natural-border/50"
          title="Compartir App"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={onToggleDarkMode}
          className="flex items-center justify-center w-10 h-10 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95 border border-natural-border/50"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        {isAdminStats && (
          <div className="flex items-center gap-4">
            {/* Total Visits */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white/80 dark:bg-white/10 backdrop-blur-sm rounded-xl text-natural-primary shadow-sm border border-natural-border/50 animate-pulse-slow">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-black tracking-tighter">
                {visitCount !== null ? visitCount.toLocaleString() : '...'}
              </span>
            </div>
            
            {/* Online Users */}
            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 dark:bg-green-500/20 backdrop-blur-sm rounded-xl text-green-600 dark:text-green-400 shadow-sm border border-green-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black tracking-tighter">
                {onlineCount} LIVE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right Actions (Auth/PIN) */}
      <div className="flex gap-2">
        {!isAdminUser && (
          <button
            onClick={onShowPinModal}
            className="flex items-center gap-2 bg-white/80 dark:bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-bold text-natural-primary shadow-sm hover:shadow-md transition-all active:scale-95 border border-natural-border/50"
          >
            <Settings className="w-4 h-4" /> <span className="hidden xs:inline">ACCESO PIN</span><span className="xs:hidden">PIN</span>
          </button>
        )}
        {user ? (
          <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 p-1 pr-3 rounded-full border border-natural-border">
            {user.photoURL ? (
              <img src={user.photoURL} className="w-8 h-8 rounded-full border border-white/20" alt="Avatar" />
            ) : (
              <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-white/40" />
              </div>
            )}
            <div className="hidden sm:flex flex-col items-start leading-none mr-1">
              <span className="text-[10px] font-bold truncate max-w-[80px]">{user.displayName?.split(' ')[0]}</span>
              {isAdminUser && <span className="text-[7px] text-natural-primary font-bold uppercase tracking-widest">Admin</span>}
            </div>
            <button
              onClick={onLogOut}
              className="p-1 text-natural-text/40 hover:text-red-500 transition-colors"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onSignIn} 
            className="flex items-center gap-2 bg-natural-primary text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-natural-primary/20 hover:shadow-xl transition-all active:scale-95"
          >
            <LogIn className="w-4 h-4" /> <span className="hidden xs:inline">ADMIN GOOGLE</span><span className="xs:hidden">GOOGLE</span>
          </button>
        )}
      </div>
    </div>

    {/* Main Identity Section */}
    <div className="flex flex-col items-center justify-center gap-4 w-full max-w-2xl mx-auto">
      <div className="w-14 h-14 md:w-16 md:h-16 bg-white dark:bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 transform -rotate-3 hover:rotate-0 transition-transform duration-300 overflow-hidden border border-natural-border/50 p-1">
        <img src="/logo.png" alt="Intercentros Logo" className="w-full h-full object-contain" />
      </div>
      
      <div className="flex flex-col items-center gap-1">
        <h1 className="text-2xl md:text-4xl font-serif font-black text-center leading-tight tracking-tight px-4" id="main-title">
          {appSettings.title}
        </h1>
        
        {isAdminUser && (
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            <button 
              onClick={onUpdateTitle} 
              title="Cambiar Título" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-natural-card border border-natural-border text-natural-text/60 hover:text-natural-primary hover:border-natural-primary transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <Edit2 className="w-3.5 h-3.5" /> Editar Título
            </button>
            <button 
              onClick={onUpdateDuration} 
              title="Cambiar Tiempo de Juego" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-natural-card border border-natural-border text-natural-text/60 hover:text-natural-primary hover:border-natural-primary transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <Clock className="w-3.5 h-3.5" /> Duración
            </button>
            <button 
              onClick={onUpdatePin} 
              title="Cambiar PIN" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-natural-card border border-natural-border text-natural-text/60 hover:text-natural-primary hover:border-natural-primary transition-all text-[10px] font-bold uppercase tracking-wider"
            >
              <Key className="w-3.5 h-3.5" /> PIN
            </button>
            <button 
              onClick={onDownloadPDF} 
              title="Descargar Informe PDF" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-natural-primary text-white hover:bg-natural-primary/80 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" /> PDF
            </button>
            <button 
              onClick={onDownloadPrintable} 
              title="Plantillas para imprimir" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-500 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir
            </button>
            <button 
              onClick={onShuffleGroups} 
              title="Sortear Grupos" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-400 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <Shuffle className="w-3.5 h-3.5" /> Sortear
            </button>
            <button 
              onClick={onCreateTournament} 
              title="Crear nuevo torneo" 
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-600 text-white hover:bg-violet-500 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
            >
              <Wand2 className="w-3.5 h-3.5" /> Nuevo Torneo
            </button>
            {isAdminUser && (
              <>
                <button 
                  onClick={onDuplicateTournament} 
                  title="Duplicar Torneo" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" /> Duplicar
                </button>
                <button 
                  onClick={onArchiveTournament} 
                  title="Archivar Torneo" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-600 text-white hover:bg-orange-500 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                >
                  <Archive className="w-3.5 h-3.5" /> Archivar
                </button>
                <button 
                  onClick={onDeleteTournament} 
                  title="Eliminar Torneo" 
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-900 text-white hover:bg-red-800 transition-all text-[10px] font-bold uppercase tracking-wider shadow-sm"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  </header>
  );
};
