import React, { useState, useEffect } from 'react';
import { Mail, Heart, Copy, Check } from 'lucide-react';
import { auth } from '../services/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import toast from 'react-hot-toast';

export const Footer: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);

  const handleCopyUid = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    toast.success("¡UID copiado al portapapeles!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <footer className="mt-auto py-10 px-4 border-t border-natural-border/20 bg-natural-sidebar/30 backdrop-blur-sm w-full">
      <div className="max-w-4xl mx-auto flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-natural-text/40">
          <div className="h-px w-8 bg-current opacity-20"></div>
          <Heart className="w-3.5 h-3.5 text-natural-primary animate-pulse" fill="currentColor" />
          <div className="h-px w-8 bg-current opacity-20"></div>
        </div>
        
        <div className="flex flex-col items-center">
          <p className="text-sm font-serif font-bold text-natural-text/80 tracking-wide uppercase">
            Desarrollado por <span className="text-natural-primary">Orestes G. Villanueva</span>
          </p>
          
          <a 
            href="mailto:ogonzalezv01@educarex.es" 
            className="group mt-2 flex items-center gap-2 px-4 py-2 rounded-full bg-natural-card border border-natural-border/50 text-xs font-medium text-natural-text/60 hover:text-natural-primary hover:border-natural-primary/30 hover:shadow-lg hover:shadow-natural-primary/5 transition-all duration-300"
          >
            <Mail className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
            <span>ogonzalezv01@educarex.es</span>
          </a>
        </div>
        
        {user && (
          <div className="mt-2 px-4 py-2 bg-natural-card border border-natural-border/50 rounded-2xl flex flex-col sm:flex-row items-center gap-2 text-xs font-semibold text-natural-text/60 shadow-sm backdrop-blur-md">
            <span className="flex items-center gap-1.5">
              🟢 Sesión activa: <span className="font-extrabold text-natural-dark">{user.email || 'Usuario Anónimo'}</span>
            </span>
            <span className="hidden sm:inline text-natural-text/20">|</span>
            <button
              onClick={handleCopyUid}
              className="flex items-center gap-1 text-[10px] bg-natural-sidebar hover:bg-natural-sidebar/85 text-natural-dark px-2.5 py-1 rounded-lg border border-natural-border/60 transition-all cursor-pointer select-none active:scale-95 group font-bold"
              title="Copiar UID para autorizar como Admin"
            >
              UID: <span className="font-mono text-[9px]">{user.uid.slice(0, 8)}...</span>
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3 text-natural-text/40 group-hover:text-natural-primary transition-colors" />
              )}
            </button>
          </div>
        )}
        
        <p className="text-[10px] text-natural-text/30 font-medium tracking-widest uppercase mt-2 flex items-center gap-2">
          <span>&copy; 2026 • Hockey Intercentros</span>
          <span className="w-1 h-1 bg-natural-text/20 rounded-full"></span>
          <span className="text-natural-primary/50 font-black">PRO V4.0</span>
        </p>
      </div>
    </footer>
  );
};
