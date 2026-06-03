import React, { useState, useEffect } from 'react';
import { Settings, ArrowLeft, RefreshCw, Volume2, ShieldCheck, Database, Trash2, Eye, Sliders, Layout } from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';

interface SettingsPageProps {
  onBack: () => void;
  triggerToast: (message: string, type?: 'success' | 'error') => void;
  tasks: Task[];
  user: any;
}

export default function SettingsPage({ onBack, triggerToast, tasks, user }: SettingsPageProps) {
  // Read existing preferences from localStorage or set defaults
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('smarttask_theme') || 'editorial';
  });
  const [defaultCategory, setDefaultCategory] = useState<string>(() => {
    return localStorage.getItem('smarttask_default_category') || 'Work';
  });
  const [defaultPriority, setDefaultPriority] = useState<string>(() => {
    return localStorage.getItem('smarttask_default_priority') || 'medium';
  });
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem('smarttask_time_format') as '12h' | '24h') || '24h';
  });
  const [deskSounds, setDeskSounds] = useState<boolean>(() => {
    return localStorage.getItem('smarttask_desk_sounds') !== 'false';
  });

  // Storage Stats (calculated dynamically from tasks list)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const recurringTasksCount = tasks.filter(t => t.recurrence && t.recurrence.frequency !== 'none').length;
  const overdueTasksCount = tasks.filter(t => !t.completed && t.dueDate.toDate() < new Date()).length;

  // Save Settings handler
  const handleSaveSettings = () => {
    localStorage.setItem('smarttask_theme', theme);
    localStorage.setItem('smarttask_default_category', defaultCategory);
    localStorage.setItem('smarttask_default_priority', defaultPriority);
    localStorage.setItem('smarttask_time_format', timeFormat);
    localStorage.setItem('smarttask_desk_sounds', String(deskSounds));
    
    // Custom post event to trigger updates across tabs/app
    window.dispatchEvent(new Event('smarttask_settings_updated'));
    triggerToast('Desk configurations successfully updated.');
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
      triggerToast('Desk chime signal test completed.');
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
          <h2 className="font-serif italic text-4xl text-[#1A1A1A]">Desk Configurations</h2>
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
                <span className="text-[10px] text-slate-500 font-serif">Apply 12-hour or military standard 24-hour hour ranges.</span>
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

            {/* Global Desk Theme Selection */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Global Desk Theme</span>
                <span className="text-[10px] text-slate-500 font-serif">Choose an aesthetic language and typography styling system.</span>
              </div>
              <select
                id="desk-theme-select"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer min-w-[150px] sm:min-w-[200px]"
              >
                <option value="editorial">Editorial Aesthetic (Ivory & Terracotta)</option>
                <option value="cosmic">Midnight Cosmic (Indigo Glow Dark Mode)</option>
                <option value="botanical">Forest Botanical (Sage Greens & Gold)</option>
              </select>
            </div>

            {/* Default Category Setting */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 py-2 border-b border-[#1A1A1A]/10">
              <div>
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Default Categories</span>
                <span className="text-[10px] text-slate-500 font-serif">Default category assigned during quick desk compositions.</span>
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
                <span className="text-xs font-bold text-[#1A1A1A] uppercase tracking-wider block">Acoustic Desk Signals</span>
                <span className="text-[10px] text-slate-500 font-serif">Plays high-fidelity retro chimes for telemetry signals.</span>
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
                  title="Test Desk Speaker Bell"
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
                Your desk is locked with Google Authorized parameters for email address <strong>{user?.email}</strong>. Desks are protected from third-party indices.
              </div>
            </div>

          </div>
        </div>

        {/* Right Section: Registry Statistics and Operations */}
        <div className="md:col-span-5 space-y-6">
          
          {/* Desk statistics summary */}
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] p-6 space-y-4">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/20 pb-2 font-mono flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-[#C2410C]" /> Desk Registry Audit
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
              onClick={() => {
                if (window.confirm('Are you absolutely sure you wish to set all local desk preferences back to system factory defaults?')) {
                  localStorage.removeItem('smarttask_default_category');
                  localStorage.removeItem('smarttask_default_priority');
                  localStorage.removeItem('smarttask_time_format');
                  localStorage.removeItem('smarttask_desk_sounds');
                  localStorage.removeItem('smarttask_theme');
                  setDefaultCategory('Work');
                  setDefaultPriority('medium');
                  setTimeFormat('24h');
                  setDeskSounds(true);
                  setTheme('editorial');
                  
                  // Instantly update layout
                  window.dispatchEvent(new Event('smarttask_settings_updated'));
                  triggerToast('Client desk preference flags reset successfully.');
                }
              }}
              className="px-3 py-1.5 border border-[#C2410C] hover:bg-[#C2410C] hover:text-white transition-all text-[#C2410C] text-[9px] uppercase font-bold tracking-widest cursor-pointer"
            >
              Reset Desk Preferences
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
