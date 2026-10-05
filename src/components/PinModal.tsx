import React from 'react';
import { X, LogIn } from 'lucide-react';

interface PinModalProps {
  pinInput: string;
  setPinInput: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onClose: () => void;
  submitting?: boolean;
  onGoogleSignIn?: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  pinInput,
  setPinInput,
  onSubmit,
  onClose,
  submitting = false,
  onGoogleSignIn,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-natural-dark/60 backdrop-blur-md">
    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-natural-border p-8" role="dialog" aria-modal="true" aria-labelledby="pin-modal-title">
      <div className="flex justify-between items-center mb-6">
        <h3 id="pin-modal-title" className="text-2xl font-serif text-natural-dark italic">Acceso Admin</h3>
        <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-natural-sidebar rounded-full transition-colors">
          <X className="w-6 h-6 text-natural-text/40" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="pin-input" className="text-[10px] font-bold text-natural-text/40 uppercase tracking-[0.2em] pl-4">Código PIN</label>
          <input
            id="pin-input"
            type="password"
            autoFocus
            autoComplete="off"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            placeholder="••••"
            className="w-full bg-natural-sidebar border border-natural-border text-center text-4xl tracking-[0.5em] font-serif p-6 rounded-3xl focus:ring-4 focus:ring-natural-primary/10 transition-all outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={submitting || !pinInput.trim()}
          className="w-full bg-natural-primary hover:bg-natural-dark disabled:opacity-50 text-white font-bold py-5 rounded-3xl shadow-lg transition-all active:scale-[0.98] uppercase tracking-widest"
        >
          {submitting ? 'Comprobando…' : 'Desbloquear'}
        </button>
      </form>
      {onGoogleSignIn && (
        <button
          type="button"
          onClick={onGoogleSignIn}
          className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-3xl border border-natural-border text-natural-text/60 hover:text-natural-primary hover:border-natural-primary text-xs font-bold uppercase tracking-widest transition-all"
        >
          <LogIn className="w-4 h-4" /> Entrar con Google
        </button>
      )}
    </div>
  </div>
);
