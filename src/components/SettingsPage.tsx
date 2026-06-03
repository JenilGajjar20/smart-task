import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft, RefreshCw, Volume2, ShieldCheck, Database, Trash2, Eye, Sliders, Layout } from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface SettingsPageProps {
  onBack: () => void;
  triggerToast: (message: string, type?: 'success' | 'error') => void;
  tasks: Task[];
  user: any;
}

export default function SettingsPage({ onBack, triggerToast, tasks, user }: SettingsPageProps) {
  const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask';

  // Read existing preferences from localStorage or set defaults
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_theme`) || 'editorial';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(`${baseKey}_dark_mode`) === 'true';
  });
  const [profileNickname, setProfileNickname] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_profile_nickname`) || user?.displayName || user?.email?.split('@')[0] || '';
  });
  const [profileRole, setProfileRole] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_profile_role`) || 'Workspace Coordinator';
  });
  const [profileStation, setProfileStation] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_profile_station`) || 'Primary Hub No. 1';
  });

  const [defaultCategory, setDefaultCategory] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_default_category`) || 'Work';
  });
  const [defaultPriority, setDefaultPriority] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_default_priority`) || 'medium';
  });
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem(`${baseKey}_time_format`) as '12h' | '24h') || '24h';
  });
  const [deskSounds, setDeskSounds] = useState<boolean>(() => {
    return localStorage.getItem(`${baseKey}_desk_sounds`) !== 'false';
  });

  // Storage Stats (calculated dynamically from tasks list)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const recurringTasksCount = tasks.filter(t => t.recurrence && t.recurrence.frequency !== 'none').length;
  const overdueTasksCount = tasks.filter(t => !t.completed && t.dueDate.toDate() < new Date()).length;

  // Save Settings handler
  const handleSaveSettings = async () => {
    localStorage.setItem(`${baseKey}_theme`, theme);
    localStorage.setItem(`${baseKey}_dark_mode`, String(darkMode));
    localStorage.setItem(`${baseKey}_profile_nickname`, profileNickname);
    localStorage.setItem(`${baseKey}_profile_role`, profileRole);
    localStorage.setItem(`${baseKey}_profile_station`, profileStation);
    localStorage.setItem(`${baseKey}_default_category`, defaultCategory);
    localStorage.setItem(`${baseKey}_default_priority`, defaultPriority);
    localStorage.setItem(`${baseKey}_time_format`, timeFormat);
    localStorage.setItem(`${baseKey}_desk_sounds`, String(deskSounds));
    
    // Custom post event to trigger updates across tabs/app instantly
    window.dispatchEvent(new Event('smarttask_settings_updated'));

    if (user) {
      try {
        await setDoc(doc(db, 'settings', user.uid), {
          userId: user.uid,
          theme,
          darkMode,
          profileNickname,
          profileRole,
          profileStation,
          defaultCategory,
          defaultPriority,
          timeFormat,
          deskSounds,
        });
        triggerToast('Workspace settings successfully synchronized to the cloud.');
      } catch (err: any) {
        console.warn('Real-time settings synchronization failed: ', err);
        triggerToast('Settings updated locally (cloud storage skipped).', 'error');
      }
    } else {
      triggerToast('Workspace configurations successfully updated locally.');
    }
  };

  // Test system speaker bell using Web Audio API!
  const ringDeskBell = () => {
    if (!deskSounds) {
      triggerToast('Audio signals are silenced.', 'error');
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // High vintage high-contrast click plus chime sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 chime
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.05); // quick drop-up
      
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35); // quick dampening
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
      triggerToast('Acoustic signal chimes test completed.');
    } catch (e) {
      triggerToast('System speaker bell could not be initialized.', 'error');
    }
  };

  return (
    <div className="space-y-8 font-sans animate-fadeIn">
      {/* Page Header */}
      <div className="flex justify-between items-baseline border-b border-[#1A1A1A] pb-4">
        <div className="flex items-baseline gap-3">
          <button 
            onClick={onBack}
            className="group flex items-center gap-1.5 border border-[#1A1A1A] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer mr-2"
          >
            <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-0.5" />
            Go to Agenda
          </button>
          <h2 className="font-serif italic text-4xl text-[#1A1A1A]">Workspace Configurations</h2>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 font-mono hidden md:inline">
          // Preference Panel
        </span>
      </div>

      {/* Grid Settings System */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Left Section: Preference Controls */}
        <div className="md:col-span-7 bg-[#F9F8F6] border border-[#1A1A1A] p-6 space-y-6">
          <div className="border-b border-[#1A1A1A]/20 pb-3 flex items-center justify-between">
            <div>
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#C2410C] font-mono flex items-center gap-2">
                <Sliders className="h-3.5 w-3.5" /> Setting Metrics
              </h3>
              <p className="text-xs text-slate-500 font-serif italic mt-0.5">Customize daily standards, interfaces, and clock telemetry.</p>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="px-3 py-1.5 bg-[#C2410C] border border-[#C2410C] hover:bg-transparent hover:text-[#C2410C] text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
            >
              Apply Changes
            </button>
          </div>

          <div className="space-y-4">
            
            {/* Clock Format Selection */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">System Clock Format</span>
                <span className="text-[10px] text-slate-500 font-serif">Apply 12-hour or military standard 24-hour ranges.</span>
              </div>
              <div className="flex">
                <button
                  type="button"
                  onClick={() => setTimeFormat('12h')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-all cursor-pointer ${
                    timeFormat === '12h' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-50 text-[#1A1A1A]'
                  }`}
                >
                  12-Hour
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFormat('24h')}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-l-0 border-[#1A1A1A] transition-all cursor-pointer ${
                    timeFormat === '24h' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-50 text-[#1A1A1A]'
                  }`}
                >
                  24-Hour
                </button>
              </div>
            </div>

            {/* Global Theme Selection */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Global Workspace Theme</span>
                <span className="text-[10px] text-slate-500 font-serif">Choose an aesthetic language and typography styling system.</span>
              </div>
              <select
                id="desk-theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer min-w-[150px] sm:min-w-[200px]"
              >
                <option value="editorial">Editorial Aesthetic (Ivory & Terracotta)</option>
                <option value="cosmic">Midnight Cosmic (Indigo Glow)</option>
                <option value="botanical">Forest Botanical (Sage Greens & Gold)</option>
                <option value="espresso">Espresso Roast (Warm Cream & Dark Chocolate)</option>
              </select>
            </div>

            {/* Contrast Mode Selector (Dark-mode toggle) */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10" id="dark-mode-setting-container">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Contrast Mode</span>
                <span className="text-[10px] text-slate-500 font-serif">Toggle dark-mode colors across the entire user experience.</span>
              </div>
              <div className="flex">
                <button
                  type="button"
                  id="set-light-mode-btn"
                  onClick={() => setDarkMode(false)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-all cursor-pointer ${
                    !darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-50 text-[#1A1A1A]'
                  }`}
                >
                  Light Mode
                </button>
                <button
                  type="button"
                  id="set-dark-mode-btn"
                  onClick={() => setDarkMode(true)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-l-0 border-[#1A1A1A] transition-all cursor-pointer ${
                    darkMode ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-50 text-[#1A1A1A]'
                  }`}
                >
                  Dark Mode
                </button>
              </div>
            </div>

            {/* Personal Profile Biography */}
            <div className="border border-[#1A1A1A]/20 bg-white p-4 space-y-4 rounded-none" id="user-profile-settings-container">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C2410C] font-mono border-b border-[#1A1A1A]/10 pb-2">
                User Profile Credentials
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Display Name</label>
                    <input
                      type="text"
                      value={profileNickname}
                      onChange={(e) => setProfileNickname(e.target.value)}
                      placeholder="e.g. Workspace Contributor"
                      className="w-full px-3 py-1.5 text-xs border border-[#1A1A1A] rounded-none bg-white text-[#1A1A1A] font-serif outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Professional Role</label>
                    <input
                      type="text"
                      value={profileRole}
                      onChange={(e) => setProfileRole(e.target.value)}
                      placeholder="e.g. Workspace Coordinator"
                      className="w-full px-3 py-1.5 text-xs border border-[#1A1A1A] rounded-none bg-white text-[#1A1A1A] font-serif outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Workspace Hub</label>
                    <input
                      type="text"
                      value={profileStation}
                      onChange={(e) => setProfileStation(e.target.value)}
                      placeholder="e.g. Primary Hub No. 1"
                      className="w-full px-3 py-1.5 text-xs border border-[#1A1A1A] rounded-none bg-white text-[#1A1A1A] font-serif outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Default Category Setting */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Default Categories</span>
                <span className="text-[10px] text-slate-500 font-serif">Default category assigned during quick workspace compositions.</span>
              </div>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer min-w-[150px]"
              >
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Education">Education</option>
                <option value="Health">Health</option>
                <option value="Shopping">Shopping</option>
                <option value="Finance">Finance</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Default Priority Setting */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Default Priority Severity</span>
                <span className="text-[10px] text-slate-500 font-serif">Standard priority configured on newly drafted assignments.</span>
              </div>
              <select
                value={defaultPriority}
                onChange={(e) => setDefaultPriority(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer min-w-[150px]"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>

            {/* Sound Signal Testing */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Workspace Audio Signals</span>
                <span className="text-[10px] text-slate-500 font-serif">Plays high-fidelity retro chimes for dispatch warnings.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeskSounds(!deskSounds)}
                  className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-all cursor-pointer ${
                    deskSounds ? 'bg-[#1A1A1A] text-white' : 'bg-white text-[#1A1A1A]'
                  }`}
                >
                  {deskSounds ? 'Audio: Enabled' : 'Audio: Silenced'}
                </button>
                <button
                  type="button"
                  onClick={ringDeskBell}
                  className="p-1 px-2 border-2 border-dashed border-[#1A1A1A] text-[#1A1A1A] bg-transparent hover:bg-slate-150 transition-all cursor-pointer"
                  title="Test Speaker Bell"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Account Protection Telemetry */}
            <div className="py-2 flex items-center gap-4 bg-white border border-[#1A1A1A]/20 p-4">
              <ShieldCheck className="h-8 w-8 text-[#C2410C] shrink-0" />
              <div className="text-[11px] font-serif pr-2 text-slate-600 leading-normal space-y-1">
                <span className="font-bold font-sans text-xs text-[#1A1A1A] uppercase tracking-wider block">Security & Access Locks</span>
                Your workspace is locked with Google Authorized parameters for email address <strong>{user?.email}</strong>. Records are protected from third-party indices.
              </div>
            </div>

          </div>
        </div>

        {/* Right Section: Registry Statistics and Operations */}
        <div className="md:col-span-5 space-y-6">
          
          {/* statistics summary */}
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] p-6 space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/20 pb-2 font-mono flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#C2410C]" /> Workspace Registry Audit
            </h3>

            <div className="grid grid-cols-2 gap-3 font-mono text-[10px] uppercase font-bold">
              <div className="bg-white border border-[#1A1A1A]/10 p-3 flex flex-col justify-between h-16">
                <span className="text-slate-500 tracking-wider">Total Filed</span>
                <span className="text-2xl font-serif text-[#1A1A1A] font-semibold">{totalTasks}</span>
              </div>
              <div className="bg-white border border-[#1A1A1A]/10 p-3 flex flex-col justify-between h-16">
                <span className="text-slate-500 tracking-wider">Completed</span>
                <span className="text-2xl font-serif text-emerald-800 font-semibold">{completedTasks}</span>
              </div>
              <div className="bg-[#1A1A1A] text-white p-3 flex flex-col justify-between h-16">
                <span className="text-slate-200 tracking-wider">Pending</span>
                <span className="text-2xl font-serif text-[#F9F8F6] font-semibold">{pendingTasks}</span>
              </div>
              <div className="bg-white border border-[#1A1A1A]/10 p-3 flex flex-col justify-between h-16">
                <span className="text-slate-500 tracking-wider">Recurring</span>
                <span className="text-2xl font-serif text-yellow-800 font-semibold">{recurringTasksCount}</span>
              </div>
              <div className="bg-[#C2410C]/5 border border-[#C2410C]/25 p-3 flex flex-col justify-between h-16 col-span-2">
                <span className="text-[#C2410C] tracking-wider">Overdue assignments</span>
                <span className="text-2xl font-serif text-[#C2410C] font-extrabold">{overdueTasksCount} files</span>
              </div>
            </div>
          </div>

          {/* Configuration reset parameters */}
          <div className="border border-red-500/30 bg-red-500/5 p-5 space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest font-mono text-[#C2410C] flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5 text-[#C2410C]" /> Dangerous Operations
            </h4>
            <div className="text-[11px] font-serif text-slate-700 leading-relaxed">
              Applying storage reset drops custom preference state flags on this client interface.
            </div>
            <button
              onClick={async () => {
                if (window.confirm('Are you absolutely sure you wish to set all local workspace preferences back to system factory defaults?')) {
                  localStorage.removeItem(`${baseKey}_default_category`);
                  localStorage.removeItem(`${baseKey}_default_priority`);
                  localStorage.removeItem(`${baseKey}_time_format`);
                  localStorage.removeItem(`${baseKey}_desk_sounds`);
                  localStorage.removeItem(`${baseKey}_theme`);
                  localStorage.removeItem(`${baseKey}_dark_mode`);
                  localStorage.removeItem(`${baseKey}_profile_nickname`);
                  localStorage.removeItem(`${baseKey}_profile_role`);
                  localStorage.removeItem(`${baseKey}_profile_station`);
                  
                  setDefaultCategory('Work');
                  setDefaultPriority('medium');
                  setTimeFormat('24h');
                  setDeskSounds(true);
                  setTheme('editorial');
                  setDarkMode(false);
                  
                  setProfileNickname(user?.displayName || user?.email?.split('@')[0] || '');
                  setProfileRole('Workspace Coordinator');
                  setProfileStation('Primary Hub No. 1');
                  
                  // Instantly update layout
                  window.dispatchEvent(new Event('smarttask_settings_updated'));

                  if (user) {
                    try {
                      await setDoc(doc(db, 'settings', user.uid), {
                        userId: user.uid,
                        theme: 'editorial',
                        darkMode: false,
                        profileNickname: user?.displayName || user?.email?.split('@')[0] || '',
                        profileRole: 'Workspace Coordinator',
                        profileStation: 'Primary Hub No. 1',
                        defaultCategory: 'Work',
                        defaultPriority: 'medium',
                        timeFormat: '24h',
                        deskSounds: true,
                      });
                    } catch (err) {
                      console.error(err);
                    }
                  }

                  triggerToast('Client workspace preference flags reset successfully.');
                }
              }}
              className="px-3 py-1.5 border border-[#C2410C] hover:bg-[#C2410C] hover:text-white transition-all text-[#C2410C] text-[9px] uppercase font-bold tracking-widest cursor-pointer"
            >
              Reset Workspace Preferences
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
