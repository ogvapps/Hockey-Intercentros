import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PromptModalProps {
  isOpen: boolean;
  title: string;
  defaultValue?: string;
  placeholder?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export const PromptModal: React.FC<PromptModalProps> = ({
  isOpen,
  title,
  defaultValue = '',
  placeholder = '',
  onConfirm,
  onCancel,
}) => {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
    }
  }, [isOpen, defaultValue]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(value);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-natural-card w-full max-w-sm rounded-3xl shadow-2xl border border-white/10 overflow-hidden flex flex-col"
        >
          <div className="p-5 border-b border-white/5 flex justify-between items-center bg-white/5">
            <h3 className="font-bold text-natural-text text-lg">{title}</h3>
            <button
              onClick={onCancel}
              className="p-2 rounded-full hover:bg-white/10 text-natural-text transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">
            <input
              autoFocus
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              className="w-full bg-natural-bg text-natural-text border border-natural-border rounded-xl px-4 py-3 font-bold text-center text-xl focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
            
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 rounded-xl font-bold bg-natural-sidebar text-natural-text hover:bg-white/10 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 py-3 rounded-xl font-bold bg-green-600 hover:bg-green-700 text-white transition-colors flex justify-center items-center gap-2"
              >
                <Check className="w-5 h-5" /> Aceptar
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
