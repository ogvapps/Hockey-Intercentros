import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div 
        className="bg-[#2D332A] border border-white/10 w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="p-6 text-center">
          <div className={`mx-auto w-16 h-16 flex items-center justify-center rounded-full mb-4 ${isDestructive ? 'bg-red-500/20 text-red-500' : 'bg-green-500/20 text-green-500'}`}>
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-white/70 text-sm">{message}</p>
        </div>
        
        <div className="flex border-t border-white/10 bg-black/20">
          <button 
            onClick={onCancel}
            className="flex-1 py-4 font-bold text-white/50 hover:bg-white/5 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" /> {cancelText}
          </button>
          <div className="w-px bg-white/10" />
          <button 
            onClick={onConfirm}
            className={`flex-1 py-4 font-bold transition-colors flex items-center justify-center gap-2 ${
              isDestructive ? 'text-red-500 hover:bg-red-500/10' : 'text-green-500 hover:bg-green-500/10'
            }`}
          >
            <Check className="w-4 h-4" /> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
