import React, { useState, useEffect, useRef } from 'react';
import { Settings, ArrowLeft, RefreshCw, Volume2, ShieldCheck, Database, Trash2, Eye, Sliders, Layout, Folder } from 'lucide-react';
import { motion } from 'motion/react';
import { Task, CustomCategory } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { DEFAULT_CATEGORIES, CATEGORY_ICON_MAP } from '../utils/categories';

interface SettingsPageProps {
  onBack: () => void;
  triggerToast: (message: string, type?: 'success' | 'error') => void;
  tasks: Task[];
  user: any;
  customCategories: CustomCategory[];
  onSaveCustomCategories: (newCategories: CustomCategory[]) => void;
  onUpdateTaskCategory: (oldCat: string, newCat: string) => Promise<void> | void;
  onRequireAuth: () => void;
}

export default function SettingsPage({ 
  onBack, 
  triggerToast, 
  tasks, 
  user, 
  customCategories,
  onSaveCustomCategories,
  onUpdateTaskCategory,
  onRequireAuth 
}: SettingsPageProps) {
  const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask';

  // Custom category manager local states
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [catName, setCatName] = useState('');
  const [catColor, setCatColor] = useState('#1B4D3E');
  const [catIcon, setCatIcon] = useState('Folder');

  const [migrationModal, setMigrationModal] = useState<{
    oldCatId: string;
    affectedCount: number;
    show: boolean;
  } | null>(null);
  const [migrationTarget, setMigrationTarget] = useState('Other');

  const PRESET_COLORS = [
    '#1B4D3E', // Emerald
    '#1E3A8A', // Blue
    '#6D28D9', // Purple
    '#B91C1C', // Red
    '#BE185D', // Pink
    '#B45309', // Amber
    '#4B5563', // Gray
    '#0F766E', // Teal
    '#4338CA', // Indigo
    '#701A75', // Fuchsia
    '#111827', // Charcoal
    '#065F46', // Dark green
  ];

  const handleStartEditCategory = (cat: CustomCategory) => {
    setEditingCategory(cat);
    setCatName(cat.name);
    setCatColor(cat.color);
    setCatIcon(cat.icon);
  };

  const handleCancelEditCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatColor('#1B4D3E');
    setCatIcon('Folder');
  };

  const handleSaveCategoryClick = () => {
    if (!catName.trim()) {
      triggerToast('Division name is required', 'error');
      return;
    }

    if (editingCategory) {
      const updated = customCategories.map(c => 
        c.id === editingCategory.id ? { ...c, name: catName.trim(), color: catColor, icon: catIcon } : c
      );
      onSaveCustomCategories(updated);
      triggerToast(`Division "${catName.trim()}" updated successfully`, 'success');
      handleCancelEditCategory();
    } else {
      const newId = 'custom_' + Date.now();
      const newCat: CustomCategory = {
        id: newId,
        name: catName.trim(),
        color: catColor,
        icon: catIcon
      };
      // Check duplicate
      const exists = DEFAULT_CATEGORIES.some(c => c.name.toLowerCase() === catName.trim().toLowerCase()) ||
                     customCategories.some(c => c.name.toLowerCase() === catName.trim().toLowerCase());
      if (exists) {
        triggerToast('A division with this name already exists', 'error');
        return;
      }
      onSaveCustomCategories([...customCategories, newCat]);
      triggerToast(`Division "${catName.trim()}" created successfully`, 'success');
      handleCancelEditCategory();
    }
  };

  const handleDeleteCategoryAttempt = (catId: string) => {
    const affectedCount = tasks.filter(t => t.category === catId).length;
    if (affectedCount > 0) {
      setMigrationTarget('Other');
      setMigrationModal({
        oldCatId: catId,
        affectedCount,
        show: true
      });
    } else {
      const updated = customCategories.filter(c => c.id !== catId);
      onSaveCustomCategories(updated);
      triggerToast('Division deleted successfully', 'success');
    }
  };

  const handleConfirmDeleteCategoryAndMigrate = async () => {
    if (!migrationModal) return;
    const { oldCatId } = migrationModal;
    
    await onUpdateTaskCategory(oldCatId, migrationTarget);
    
    const updated = customCategories.filter(c => c.id !== oldCatId);
    onSaveCustomCategories(updated);
    
    setMigrationModal(null);
    triggerToast('Division dismantled and roles reallocated successfully', 'success');
  };

  // Read existing preferences from localStorage or set defaults
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_theme`) || 'editorial';
  });
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem(`${baseKey}_dark_mode`) === 'true';
  });
  const [profileNickname, setProfileNickname] = useState<string>(() => {
    const cached = localStorage.getItem(`${baseKey}_profile_nickname`);
    return cached !== null ? cached : (user?.displayName || user?.email?.split('@')[0] || '');
  });
  const [profileRole, setProfileRole] = useState<string>(() => {
    const cached = localStorage.getItem(`${baseKey}_profile_role`);
    return cached !== null ? cached : 'Workspace Coordinator';
  });
  const [profileStation, setProfileStation] = useState<string>(() => {
    const cached = localStorage.getItem(`${baseKey}_profile_station`);
    return cached !== null ? cached : 'Primary Hub No. 1';
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

  // New Personalization parameters
  const [workspaceName, setWorkspaceName] = useState<string>(() => {
    const cached = localStorage.getItem(`${baseKey}_workspace_name`);
    return cached !== null ? cached : 'SmartTask';
  });
  const [workspaceAvatar, setWorkspaceAvatar] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_workspace_avatar`) || '📝';
  });
  const [defaultTaskView, setDefaultTaskView] = useState<string>(() => {
    return localStorage.getItem(`${baseKey}_default_task_view`) || 'agenda';
  });
  const [defaultReminderTime, setDefaultReminderTime] = useState<number>(() => {
    return Number(localStorage.getItem(`${baseKey}_default_reminder_time`)) || 60;
  });
  const [layoutMode, setLayoutMode] = useState<'compact' | 'spacious'>(() => {
    return (localStorage.getItem(`${baseKey}_layout_mode`) as 'compact' | 'spacious') || 'spacious';
  });
  const [fontSize, setFontSize] = useState<'small' | 'default' | 'large'>(() => {
    return (localStorage.getItem(`${baseKey}_font_size`) as 'small' | 'default' | 'large') || 'default';
  });

  // Storage Stats (calculated dynamically from tasks list)
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const pendingTasks = totalTasks - completedTasks;
  const recurringTasksCount = tasks.filter(t => t.recurrence && t.recurrence.frequency !== 'none').length;
  const overdueTasksCount = tasks.filter(t => !t.completed && t.dueDate.toDate() < new Date()).length;

  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasMounted = useRef(false);

  // Sync state if user changes/loads later
  useEffect(() => {
    if (user) {
      const uKey = `smarttask_user_${user.uid}`;
      setTheme(localStorage.getItem(`${uKey}_theme`) || 'editorial');
      setDarkMode(localStorage.getItem(`${uKey}_dark_mode`) === 'true');
      const nicknameVal = localStorage.getItem(`${uKey}_profile_nickname`);
      setProfileNickname(nicknameVal !== null ? nicknameVal : (user.displayName || user.email?.split('@')[0] || ''));
      const roleVal = localStorage.getItem(`${uKey}_profile_role`);
      setProfileRole(roleVal !== null ? roleVal : 'Workspace Coordinator');
      const stationVal = localStorage.getItem(`${uKey}_profile_station`);
      setProfileStation(stationVal !== null ? stationVal : 'Primary Hub No. 1');
      setDefaultCategory(localStorage.getItem(`${uKey}_default_category`) || 'Work');
      setDefaultPriority(localStorage.getItem(`${uKey}_default_priority`) || 'medium');
      setTimeFormat((localStorage.getItem(`${uKey}_time_format`) as '12h' | '24h') || '24h');
      setDeskSounds(localStorage.getItem(`${uKey}_desk_sounds`) !== 'false');
      const wsNameVal = localStorage.getItem(`${uKey}_workspace_name`);
      setWorkspaceName(wsNameVal !== null ? wsNameVal : 'SmartTask');
      setWorkspaceAvatar(localStorage.getItem(`${uKey}_workspace_avatar`) || '📝');
      setDefaultTaskView(localStorage.getItem(`${uKey}_default_task_view`) || 'agenda');
      setDefaultReminderTime(Number(localStorage.getItem(`${uKey}_default_reminder_time`)) || 60);
      setLayoutMode((localStorage.getItem(`${uKey}_layout_mode`) as 'compact' | 'spacious') || 'spacious');
      setFontSize((localStorage.getItem(`${uKey}_font_size`) as 'small' | 'default' | 'large') || 'default');
    }
  }, [user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      hasMounted.current = true;
    }, 150);
    return () => {
      hasMounted.current = false;
      clearTimeout(timer);
    };
  }, []);

  // Auto-Save Effect
  useEffect(() => {
    if (!hasMounted.current) return;

    // 1. Instantly write to localStorage so standard client features update without delay
    localStorage.setItem(`${baseKey}_theme`, theme);
    localStorage.setItem(`${baseKey}_dark_mode`, String(darkMode));
    localStorage.setItem(`${baseKey}_profile_nickname`, profileNickname);
    localStorage.setItem(`${baseKey}_profile_role`, profileRole);
    localStorage.setItem(`${baseKey}_profile_station`, profileStation);
    localStorage.setItem(`${baseKey}_default_category`, defaultCategory);
    localStorage.setItem(`${baseKey}_default_priority`, defaultPriority);
    localStorage.setItem(`${baseKey}_time_format`, timeFormat);
    localStorage.setItem(`${baseKey}_desk_sounds`, String(deskSounds));
    localStorage.setItem(`${baseKey}_workspace_name`, workspaceName);
    localStorage.setItem(`${baseKey}_workspace_avatar`, workspaceAvatar);
    localStorage.setItem(`${baseKey}_default_task_view`, defaultTaskView);
    localStorage.setItem(`${baseKey}_default_reminder_time`, String(defaultReminderTime));
    localStorage.setItem(`${baseKey}_layout_mode`, layoutMode);
    localStorage.setItem(`${baseKey}_font_size`, fontSize);

    // 2. Instantly dispatch custom update event so top components/Header immediately reflect changes
    window.dispatchEvent(new Event('smarttask_settings_updated'));

    // 3. Mark save as in-progress (subtle feedback)
    setSaveStatus('saving');
    setErrorMessage(null);

    // 4. Debounce Firestore sync so typing text fields is fluid
    const handler = setTimeout(async () => {
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
            workspaceName,
            workspaceAvatar,
            defaultTaskView,
            defaultReminderTime,
            layoutMode,
            fontSize,
          });
          setSaveStatus('saved');
        } catch (err: any) {
          console.warn('Real-time cloud settings synchronization failed: ', err);
          setSaveStatus('error');
          setErrorMessage('Cloud sync failed');
        }
      } else {
        // Guest user local save is already complete
        setSaveStatus('saved');
      }
    }, 500); // 500ms debounce

    return () => clearTimeout(handler);
  }, [
    theme, darkMode, profileNickname, profileRole, profileStation,
    defaultCategory, defaultPriority, timeFormat, deskSounds,
    workspaceName, workspaceAvatar, defaultTaskView, defaultReminderTime,
    layoutMode, fontSize, baseKey, user
  ]);

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
            <div className="flex items-center gap-2 min-h-[30px]" id="autosave-status-container">
              {saveStatus === 'saving' && (
                <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider font-mono text-[#C2410C] bg-[#C2410C]/5 border border-[#C2410C]/20 animate-pulse" id="autosave-saving-indicator">
                  ◌ Saving...
                </span>
              )}
              {saveStatus === 'saved' && (
                <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider font-mono text-emerald-800 bg-emerald-50 border border-emerald-800/20" id="autosave-saved-indicator">
                  ✓ Changes saved automatically
                </span>
              )}
              {saveStatus === 'idle' && (
                <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider font-mono text-emerald-800 bg-emerald-50 border border-emerald-800/20" id="autosave-idle-indicator">
                  ✓ Saved
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider font-mono text-rose-700 bg-rose-50 border border-rose-500/20" id="autosave-error-indicator" title={errorMessage || 'Synchronization failure.'}>
                  ⚠ Saving failed: {errorMessage || 'offline'}
                </span>
              )}
            </div>
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
                <option value="nordic">Nordic Calm (Minimal Blues & Polar Birch)</option>
                <option value="cyberneon">Cyber Neon (Futuristic Purples & Glows)</option>
                <option value="luxury">Luxury Planner (Royal Serifs & Golden Burgundy)</option>
                <option value="finance">Finance Ledger (Strict Monospaced Accounting Ledger)</option>
                <option value="wellness">Wellness Garden (Matcha Organic & Stone Pebble)</option>
                <option value="paperdesk">Paper Desk (Antique Parchment & Fountain Ink)</option>
                <option value="brutalist">Monochrome Brutalist (Stark Contrast & Hard Outlines)</option>
                <option value="glassmorphism">Glassmorphism Aurora (Frosted Blur & Backdrop Gradients)</option>
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

            {/* Workspace Personalization Section */}
            <div className="border border-[#1A1A1A]/20 bg-white p-4 space-y-4 rounded-none" id="workspace-personalization-container">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C2410C] font-mono border-b border-[#1A1A1A]/10 pb-2">
                Workspace Personalization
              </h4>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Workspace Hub Name</label>
                    <input
                      type="text"
                      value={workspaceName}
                      onChange={(e) => setWorkspaceName(e.target.value)}
                      placeholder="e.g. SmartTask"
                      className="w-full px-3 py-1.5 text-xs border border-[#1A1A1A] rounded-none bg-white text-[#1A1A1A] font-serif outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Workspace Emblem / Avatar</label>
                    <select
                      value={workspaceAvatar}
                      onChange={(e) => setWorkspaceAvatar(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer"
                    >
                      <option value="📝">📝 Notepad Ledger</option>
                      <option value="🚀">🚀 Launch Pad</option>
                      <option value="💡">💡 Idea Vault</option>
                      <option value="💼">💼 Executive Desk</option>
                      <option value="🛠️">🛠️ Project Bench</option>
                      <option value="🏡">🏡 Sanctuary Hub</option>
                      <option value="🎯">🎯 Precision Board</option>
                      <option value="🌿">🌿 Organic Oasis</option>
                      <option value="📊">📊 Capital Ledger</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Default Workspace View</label>
                    <select
                      value={defaultTaskView}
                      onChange={(e) => setDefaultTaskView(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer"
                    >
                      <option value="agenda">Agenda Flat List</option>
                      <option value="kanban">Kanban Columns</option>
                      <option value="calendar">Monthly Calendar Grid</option>
                      <option value="focus">Single Focal Point Tracker</option>
                      <option value="category">Category-Grouped Tags</option>
                      <option value="project">Workspace Book Folders</option>
                      <option value="timeline">Chronological Timeline Track</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Default Alert / Reminder Offset</label>
                    <select
                      value={defaultReminderTime}
                      onChange={(e) => setDefaultReminderTime(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer"
                    >
                      <option value={5}>5 Minutes Before Due</option>
                      <option value={15}>15 Minutes Before Due</option>
                      <option value={30}>30 Minutes Before Due</option>
                      <option value={60}>1 Hour Before Due</option>
                      <option value={120}>2 Hours Before Due</option>
                      <option value={1440}>1 Day Before Due</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Layout Padding Mode</label>
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setLayoutMode('compact')}
                        className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-all cursor-pointer ${
                          layoutMode === 'compact' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-55 text-[#1A1A1A]'
                        }`}
                      >
                        Compact UI
                      </button>
                      <button
                        type="button"
                        onClick={() => setLayoutMode('spacious')}
                        className={`flex-1 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-l-0 border-[#1A1A1A] transition-all cursor-pointer ${
                          layoutMode === 'spacious' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-55 text-[#1A1A1A]'
                        }`}
                      >
                        Spacious UI
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Workspace Font Size</label>
                    <div className="flex">
                      <button
                        type="button"
                        onClick={() => setFontSize('small')}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-[#1A1A1A] transition-all cursor-pointer ${
                          fontSize === 'small' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-55 text-[#1A1A1A]'
                        }`}
                      >
                        Small
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize('default')}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-l-0 border-[#1A1A1A] transition-all cursor-pointer ${
                          fontSize === 'default' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-55 text-[#1A1A1A]'
                        }`}
                      >
                        Default
                      </button>
                      <button
                        type="button"
                        onClick={() => setFontSize('large')}
                        className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider border border-l-0 border-[#1A1A1A] transition-all cursor-pointer ${
                          fontSize === 'large' ? 'bg-[#1A1A1A] text-white' : 'bg-white hover:bg-slate-55 text-[#1A1A1A]'
                        }`}
                      >
                        Large
                      </button>
                    </div>
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

            {/* Custom Category Folders */}
            <div className="border border-[#1A1A1A]/20 bg-white p-4 space-y-4 rounded-none" id="custom-categories-settings-container">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#C2410C] font-mono border-b border-[#1A1A1A]/10 pb-2 flex justify-between items-center">
                <span>Custom Folders & Categories</span>
                <span className="text-[9px] text-slate-500 font-sans tracking-normal font-normal">Create and manage customized workflow divisions</span>
              </h4>
              
              {/* Category list */}
              <div className="space-y-2">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Active Divisions</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {/* Default Categories */}
                  {DEFAULT_CATEGORIES.map(cat => {
                    const IconComponent = CATEGORY_ICON_MAP[cat.icon] || Folder;
                    return (
                      <div key={cat.id} className="p-2 border border-slate-200/60 bg-slate-50/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 text-white" style={{ backgroundColor: cat.color }}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-serif text-[#1A1A1A] font-bold">{cat.name}</span>
                        </div>
                        <span className="text-[8px] font-mono uppercase bg-slate-200 text-slate-600 px-1 py-0.5">Default</span>
                      </div>
                    );
                  })}
                  {/* Custom Categories */}
                  {customCategories.map(cat => {
                    const IconComponent = CATEGORY_ICON_MAP[cat.icon] || Folder;
                    return (
                      <div key={cat.id} className="p-2 border border-[#1A1A1A]/15 bg-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="p-1 text-white" style={{ backgroundColor: cat.color }}>
                            <IconComponent className="h-3 w-3" />
                          </div>
                          <span className="text-xs font-serif text-[#1A1A1A] font-bold">{cat.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStartEditCategory(cat)}
                            className="p-1 border border-slate-300 hover:border-[#1A1A1A] text-slate-600 hover:text-[#1A1A1A] transition-all cursor-pointer"
                            title="Edit Category Name & Icon"
                          >
                            <Sliders className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategoryAttempt(cat.id)}
                            className="p-1 border border-rose-200 bg-rose-50/50 text-rose-700 hover:bg-rose-100 transition-all cursor-pointer animate-pulse"
                            title="Delete Category"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add/Edit Form */}
              <div className="border-t border-[#1A1A1A]/10 pt-3 space-y-3">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {editingCategory ? 'Update Division Attributes' : 'Propose New Division'}
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Division Name</label>
                    <input
                      type="text"
                      value={catName}
                      onChange={(e) => setCatName(e.target.value)}
                      placeholder="e.g. Research, Sprinklers..."
                      className="w-full px-2.5 py-1 text-xs border border-[#1A1A1A] rounded-none bg-white text-[#1A1A1A] font-serif outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Division Identity Color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={catColor}
                        onChange={(e) => setCatColor(e.target.value)}
                        className="w-8 h-7 p-0 border border-[#1A1A1A] rounded-none cursor-pointer bg-transparent"
                      />
                      <div className="flex-1 grid grid-cols-6 gap-0.5 max-w-[120px]">
                        {PRESET_COLORS.slice(0, 6).map(color => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setCatColor(color)}
                            className="w-4 h-4 border border-slate-300"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Icon Grid Choice */}
                <div className="space-y-1.5">
                  <label className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block">Select Division Emblem</label>
                  <div className="grid grid-cols-10 gap-1 p-2 border border-[#1A1A1A]/10 bg-slate-50/50 max-h-[100px] overflow-y-auto">
                    {Object.keys(CATEGORY_ICON_MAP).map(iconName => {
                      const IconComp = CATEGORY_ICON_MAP[iconName];
                      const isSelected = catIcon === iconName;
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setCatIcon(iconName)}
                          className={`p-1.5 border transition-all ${
                            isSelected ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                          }`}
                          title={iconName}
                        >
                          <IconComp className="h-4 w-4 mx-auto" />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  {editingCategory && (
                    <button
                      type="button"
                      onClick={handleCancelEditCategory}
                      className="px-3 py-1.5 border border-slate-300 hover:border-[#1A1A1A] text-[#1A1A1A] font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveCategoryClick}
                    className="px-4 py-1.5 bg-[#1A1A1A] text-white hover:bg-white hover:text-[#1A1A1A] border border-[#1A1A1A] font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {editingCategory ? 'Update Division' : 'Submit Division'}
                  </button>
                </div>
              </div>
            </div>

            {/* Category Task Migration Assessment Dialog */}
            {migrationModal && migrationModal.show && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs" />
                <div className="bg-[#F9F8F6] text-[#1A1A1A] border-2 border-[#1A1A1A] w-full max-w-md p-6 relative z-51 shadow-xl space-y-4">
                  <div>
                    <p className="text-[#C2410C] text-[9px] font-bold uppercase tracking-[0.2em] font-mono mb-1">// DIVISION DISMANTLEMENT WARNING</p>
                    <h3 className="font-serif italic text-2xl font-medium tracking-tight">Reallocate Workloads</h3>
                    <p className="text-slate-600 font-serif text-xs mt-2 leading-relaxed">
                      You are deleting division <strong>"{migrationModal.oldCatId}"</strong>. There are <strong>{migrationModal.affectedCount}</strong> active workspace items currently assigned here.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Select Target Workspace Division</label>
                    <select
                      value={migrationTarget}
                      onChange={(e) => setMigrationTarget(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-colors cursor-pointer"
                    >
                      {DEFAULT_CATEGORIES.map(c => (
                        <option key={c.id} value={c.id}>{c.name} (Default)</option>
                      ))}
                      {customCategories
                        .filter(c => c.id !== migrationModal.oldCatId)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setMigrationModal(null)}
                      className="px-4 py-2 border border-[#1A1A1A] hover:bg-slate-100 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Cancel Delete
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteCategoryAndMigrate}
                      className="px-4 py-2 bg-rose-700 text-white hover:bg-rose-800 font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Reallocate & Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                if (!user) {
                  onRequireAuth();
                  return;
                }
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
                  
                  // Clear personalization localStorage parameters
                  localStorage.removeItem(`${baseKey}_workspace_name`);
                  localStorage.removeItem(`${baseKey}_workspace_avatar`);
                  localStorage.removeItem(`${baseKey}_default_task_view`);
                  localStorage.removeItem(`${baseKey}_default_reminder_time`);
                  localStorage.removeItem(`${baseKey}_layout_mode`);
                  localStorage.removeItem(`${baseKey}_font_size`);
                  
                  setDefaultCategory('Work');
                  setDefaultPriority('medium');
                  setTimeFormat('24h');
                  setDeskSounds(true);
                  setTheme('editorial');
                  setDarkMode(false);
                  
                  setProfileNickname(user?.displayName || user?.email?.split('@')[0] || '');
                  setProfileRole('Workspace Coordinator');
                  setProfileStation('Primary Hub No. 1');

                  setWorkspaceName('SmartTask');
                  setWorkspaceAvatar('📝');
                  setDefaultTaskView('agenda');
                  setDefaultReminderTime(60);
                  setLayoutMode('spacious');
                  setFontSize('default');
                  
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
                        workspaceName: 'SmartTask',
                        workspaceAvatar: '📝',
                        defaultTaskView: 'agenda',
                        defaultReminderTime: 60,
                        layoutMode: 'spacious',
                        fontSize: 'default',
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
