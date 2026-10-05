import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
    };
    const goOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [wasOffline]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 py-2.5 px-4 bg-amber-500 text-amber-950 shadow-lg"
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest">
            Sin conexión — mostrando datos en caché
          </span>
        </motion.div>
      )}
      {showReconnected && !isOffline && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-3 py-2.5 px-4 bg-green-500 text-white shadow-lg"
        >
          <Wifi className="w-4 h-4" />
          <span className="text-xs font-black uppercase tracking-widest">
            ¡Conexión restaurada!
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OfflineBanner;
