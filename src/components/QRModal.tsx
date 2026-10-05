import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  title: string;
}

export const QRModal: React.FC<QRModalProps> = ({ isOpen, onClose, url, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: '¡Sigue el Torneo Hockey Intercentros en directo!',
          url: url,
        });
      } catch (err) {
        console.error('Share failed', err);
      }
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-natural-dark/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[40px] shadow-2xl max-w-sm w-full overflow-hidden border border-natural-border relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-natural-text/50 hover:text-natural-dark hover:bg-natural-bg rounded-full transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 flex flex-col items-center text-center">
              <h2 className="text-2xl font-serif text-natural-dark mb-2">Compartir App</h2>
              <p className="text-natural-text/70 text-sm mb-8">
                Escanea este código QR con la cámara para abrir la aplicación.
              </p>

              <div className="bg-white p-4 rounded-3xl shadow-sm border border-natural-border mb-8">
                <QRCodeSVG
                  value={url}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#1B262C"}
                  level={"H"}
                  includeMargin={false}
                />
              </div>

              <div className="flex flex-col gap-3 w-full">
                {navigator.share && (
                  <button
                    onClick={handleShare}
                    className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 px-6 rounded-2xl shadow-sm transition-all active:scale-95"
                  >
                    <Share2 className="w-5 h-5" /> Compartir Enlace
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 bg-natural-sidebar hover:bg-natural-border/50 text-natural-dark font-bold py-3.5 px-6 rounded-2xl transition-all active:scale-95 border border-natural-border"
                >
                  {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                  {copied ? '¡Copiado!' : 'Copiar Enlace Directo'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
