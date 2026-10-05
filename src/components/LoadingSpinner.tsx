import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-natural-bg gap-6">
    <div className="relative">
      <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-black/10 transform -rotate-3 overflow-hidden border border-natural-border/50 p-1">
        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
      </div>
      {/* Spinning ring around logo */}
      <div className="absolute -inset-3 border-2 border-natural-primary/20 border-t-natural-primary rounded-full animate-spin" />
    </div>
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-natural-primary animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <p className="text-[10px] font-black text-natural-text/30 uppercase tracking-[0.3em]">
        Cargando
      </p>
    </div>
  </div>
);

export default LoadingSpinner;
