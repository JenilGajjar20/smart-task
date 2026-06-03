import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckSquare, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { signInWithGoogle } from '../firebase';

interface AuthPageProps {
  onAuthSuccess?: () => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      if (onAuthSuccess) {
        onAuthSuccess();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      title: 'Efficient Task Creation',
      desc: 'Set custom workloads, category context, priority tags, and detailed notes effortlessly.',
    },
    {
      title: 'Overdue & Deadline Alerts',
      desc: 'Never miss a due date with our color-coded urgency queues and custom reminder intervals.',
    },
    {
      title: 'Granular Progress Tracking',
      desc: 'Track completed percentages, count daily metrics, and filter schedules in real-time.',
    }
  ];

  return (
    <div className="min-h-screen bg-[#F9F8F6] text-[#1A1A1A] flex flex-col lg:flex-row font-sans">
      {/* Visual Left Banner (Introductory Context Panel) */}
      <div className="flex-1 text-[#1A1A1A] flex flex-col justify-between p-8 lg:p-16 border-b lg:border-b-0 lg:border-r border-[#1A1A1A] relative">
        <div className="relative z-10">
          <div className="flex items-center gap-3 border-b border-[#1A1A1A] pb-6 mb-8">
            <div>
              <p className="text-[10px] tracking-[0.3em] font-bold uppercase mb-2 text-[#C2410C]">The Daily Standard</p>
              <div className="text-5xl font-serif italic leading-none font-semibold">SmartTask</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 my-auto py-8 lg:py-0">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl lg:text-5xl font-serif font-light tracking-tight leading-tight max-w-xl italic">
              Organize your daily work and deadlines, clearly.
            </h1>
            <p className="mt-4 text-slate-700 text-base max-w-md font-serif leading-relaxed">
              Create, track, and complete personal and professional obligations inside an editorial, highly structured productivity journal.
            </p>
          </motion.div>

          <div className="mt-12 space-y-6 max-w-lg border-t border-[#1A1A1A] pt-8">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                className="flex gap-4 items-start"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + idx * 0.1 }}
              >
                <div className="mt-1 bg-[#1A1A1A] text-white p-1.5 shrink-0">
                  <Sparkles className="h-3.5 w-3.5 text-[#C2410C]" />
                </div>
                <div>
                  <h4 className="font-bold text-xs uppercase tracking-wider">{feat.title}</h4>
                  <p className="text-slate-600 text-xs mt-1 leading-relaxed font-serif font-light">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-[9px] uppercase tracking-widest font-bold opacity-60 mt-6 lg:mt-0">
          &copy; {new Date().getFullYear()} SmartTask // Secured Cloud Workspace.
        </div>
      </div>

      {/* Auth Interaction Right Panel */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 lg:p-16 bg-[#F9F8F6] shrink-0 lg:max-w-xl">
        <div className="w-full max-w-md flex flex-col justify-center">
          <div className="mb-8 block lg:hidden border-b border-[#1A1A1A] pb-4">
            <div className="flex items-center gap-2">
              <span className="font-serif italic font-bold text-2xl tracking-tight">SmartTask</span>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className="text-[#C2410C] text-[10px] font-bold uppercase tracking-[0.2em] mb-2">Workspace Entry</p>
            <h2 className="font-serif italic text-4xl text-slate-900 tracking-tight leading-none mb-4">
              Get Started
            </h2>
            <p className="text-slate-600 font-serif text-sm leading-relaxed mb-6">
              Sign in with your Google account secure authentication to load and sync your task catalog instantly.
            </p>
          </motion.div>

          {error && (
            <motion.div
              className="mt-4 flex gap-3 items-center bg-rose-50 border-2 border-rose-900 text-rose-900 p-4 rounded-none text-xs font-mono"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-800" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="mt-6 space-y-4">
            <button
              id="google-signin-btn"
              onClick={handleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#1A1A1A] text-white border-2 border-[#1A1A1A] hover:bg-[#F9F8F6] hover:text-[#1A1A1A] rounded-none font-bold text-xs uppercase tracking-widest transition-all duration-200 active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer shadow-sm"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-[#C2410C]" />
              ) : (
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" width="24" height="24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
              )}
              {loading ? 'Authenticating...' : 'Sign in with Google'}
            </button>
          </div>

          <div className="mt-12 text-center text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">
            Secure Cryptographic Assertion // Zero Saved Credentials.
          </div>
        </div>
      </div>
    </div>
  );
}
