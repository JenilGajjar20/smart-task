import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, onSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll of page while AuthModal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Authentication assertion was rejected.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs cursor-pointer"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 15 }}
            className="bg-[#F9F8F6] text-[#1A1A1A] border-2 border-[#1A1A1A] w-full max-w-lg p-6 md:p-8 relative z-51 shadow-xl space-y-6"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-[#1A1A1A]/60 hover:text-[#1A1A1A] cursor-pointer transition-colors"
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header branding */}
            <div>
              <p className="text-[#C2410C] text-[9px] font-bold uppercase tracking-[0.2em] font-mono mb-1">// SECURITY ACCESS ASSERTION Required</p>
              <h3 className="font-serif italic text-3xl font-medium tracking-tight">Authentication Required</h3>
              <p className="text-slate-600 font-serif text-xs mt-2 leading-relaxed">
                You are currently navigating in read-only **Guest Mode**. To create, modify, complete, or configure items in your personal workspace, please register or authenticate a secure cloud-synced account.
              </p>
            </div>

            {/* Benefit Checkpoints */}
            <div className="border-y border-[#1A1A1A]/10 py-4 space-y-3">
              <div className="flex gap-3 items-start">
                <div className="bg-[#1A1A1A] text-white p-1 shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-[#C2410C]" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-[10px] uppercase tracking-wider text-slate-800">Persistent Agendas</h4>
                  <p className="text-slate-500 font-serif text-[10px] leading-relaxed">Your task histories are saved cryptographically inside secure Firestore cloud blueprints.</p>
                </div>
              </div>
              
              <div className="flex gap-3 items-start">
                <div className="bg-[#1A1A1A] text-white p-1 shrink-0 mt-0.5">
                  <Sparkles className="h-3 w-3 text-[#C2410C]" />
                </div>
                <div>
                  <h4 className="font-sans font-bold text-[10px] uppercase tracking-wider text-slate-800">Workspace Customization</h4>
                  <p className="text-slate-500 font-serif text-[10px] leading-relaxed">Personalize workspace-hubs, audio feedback levels, and theme styling states seamlessly.</p>
                </div>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="flex gap-2 items-center bg-rose-50 border border-rose-950 p-3 text-[11px] font-mono text-rose-900">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-800" />
                <span>{error}</span>
              </div>
            )}

            {/* Actions button */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-[#1A1A1A] text-white py-3 border-2 border-[#1A1A1A] hover:bg-[#F9F8F6] hover:text-[#1A1A1A] transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-[#C2410C]" />
                ) : (
                  <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                )}
                {loading ? 'Authenticating...' : 'Sign in with Google'}
              </button>
              
              <button
                onClick={onClose}
                className="px-6 py-3 border border-[#1A1A1A] hover:bg-[#1A1A1A]/10 text-[#1A1A1A] transition-all font-bold text-[10px] uppercase tracking-widest cursor-pointer"
              >
                Explore as Guest
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
