import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { LoadingSpinner } from './components/LoadingSpinner';
import { OfflineBanner } from './components/OfflineBanner';
import { PwaInstallPrompt } from './components/PwaInstallPrompt';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from './hooks/useTheme';

// Lazy-load route-level components for code splitting
const HomeView = React.lazy(() =>
  import('./components/HomeView').then(m => ({ default: m.HomeView }))
);
const TournamentApp = React.lazy(() =>
  import('./components/TournamentApp')
);

export default function App() {
  const { theme, toggleTheme } = useTheme();

  return (
    <BrowserRouter>
      <OfflineBanner />
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<HomeView />} />
          <Route path="/t/:tournamentId" element={<TournamentApp />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <Toaster position="bottom-center" />
      <PwaInstallPrompt />

      {/* Floating Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed bottom-6 right-6 z-[100] p-3.5 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-100 rounded-full shadow-lg border border-slate-200 dark:border-zinc-800 hover:scale-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center backdrop-blur-md bg-opacity-80 dark:bg-opacity-80"
        title={theme === 'dark' ? "Modo Claro" : "Modo Oscuro"}
        aria-label={theme === 'dark' ? "Activar modo claro" : "Activar modo oscuro"}
      >
        {theme === 'dark' ? (
          <Sun className="w-5 h-5 text-yellow-500 animate-[spin_10s_linear_infinite]" />
        ) : (
          <Moon className="w-5 h-5 text-indigo-600" />
        )}
      </button>
    </BrowserRouter>
  );
}
