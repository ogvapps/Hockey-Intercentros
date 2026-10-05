import React from 'react';
import { X } from 'lucide-react';

interface PinModalProps {
  pinInput: string;
  setPinInput: (v: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onClose: () => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  pinInput,
  setPinInput,
  onSubmit,
  onClose,
}) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-natural-dark/60 backdrop-blur-md">
    <div className="bg-white w-full max-w-sm rounded-[40px] shadow-2xl border border-natural-border p-8">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-serif text-natural-dark italic">Acceso Admin</h3>
        <button onClick={onClose} className="p-2 hover:bg-natural-sidebar rounded-full transition-colors">
          <X className="w-6 h-6 text-natural-text/40" />
        </button>
      </div>
      <form onSubmit={onSubmit} className="space-y-6">
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
);
