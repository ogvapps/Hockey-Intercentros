import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Activity, Loader2, CheckCircle2, Zap } from 'lucide-react';

interface SimulationModalProps {
  isOpen: boolean;
  step: 'idle' | 'league' | 'quarters' | 'semis' | 'finals' | 'done';
  progress: number;
  message: string;
}

export const SimulationModal: React.FC<SimulationModalProps> = ({ isOpen, step, progress, message }) => {
  if (!isOpen) return null;

  const steps = [
    { key: 'league', label: 'Liga' },
    { key: 'quarters', label: 'Cuartos' },
    { key: 'semis', label: 'Semis' },
    { key: 'finals', label: 'Finales' }
  ];

  const getStepStatus = (key: string) => {
    const order = ['league', 'quarters', 'semis', 'finals', 'done'];
    const currentIndex = order.indexOf(step);
    const targetIndex = order.indexOf(key);
    
    if (currentIndex > targetIndex || step === 'done') return 'completed';
    if (currentIndex === targetIndex) return 'active';
    return 'pending';
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-natural-dark/60 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative w-full max-w-md bg-[#0f120f] border border-white/10 rounded-[40px] shadow-2xl overflow-hidden p-8"
        >
          {/* Animated Background Pulse */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-natural-primary/10 rounded-full blur-[80px] -z-10 animate-pulse" />

          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-natural-primary/20 rounded-2xl flex items-center justify-center mb-6 relative">
              <Zap className="w-8 h-8 text-natural-primary animate-pulse" />
              {step !== 'done' && (
                <div className="absolute inset-0 border-2 border-natural-primary rounded-2xl animate-ping opacity-20" />
              )}
            </div>
            
            <h2 className="text-2xl font-serif text-white mb-2 tracking-tight">Simulando Torneo</h2>
            <p className="text-white/40 text-sm mb-8 font-medium italic">{message}</p>

            {/* Progress Steps */}
            <div className="w-full flex justify-between mb-8 relative px-2">
              <div className="absolute top-[18px] left-8 right-8 h-px bg-white/5 -z-10" />
              <div 
                className="absolute top-[18px] left-8 h-px bg-natural-primary transition-all duration-1000 -z-10" 
                style={{ width: `${Math.max(0, progress - 15)}%` }}
              />
              
              {steps.map((s) => {
                const status = getStepStatus(s.key);
                return (
                  <div key={s.key} className="flex flex-col items-center gap-2">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-500 border-2 ${
                      status === 'completed' ? 'bg-natural-primary border-natural-primary text-[#0f120f]' :
                      status === 'active' ? 'bg-[#1a1f1a] border-natural-primary text-natural-primary shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
                      'bg-[#1a1f1a] border-white/5 text-white/20'
                    }`}>
                      {status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> : 
                       status === 'active' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                       <Activity className="w-4 h-4" />}
                    </div>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${
                      status === 'active' ? 'text-natural-primary' : 
                      status === 'completed' ? 'text-white/60' : 'text-white/20'
                    }`}>{s.label}</span>
                  </div>
                );
              })}
            </div>

            {/* Main Progress Bar */}
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden mb-4 p-0.5 border border-white/5">
              <motion.div 
                className="h-full bg-gradient-to-r from-natural-primary/50 to-natural-primary rounded-full relative shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse" />
              </motion.div>
            </div>
            
            <div className="flex justify-between w-full px-1">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Progreso</span>
              <span className="text-[10px] font-black text-natural-primary uppercase tracking-widest">{progress}%</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
