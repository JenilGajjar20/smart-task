import React, { useState } from 'react';
import { 
  ArrowLeft, BookOpen, Compass, GraduationCap, Layout, 
  Terminal, Sparkles, Sliders, Check, UserCheck, Shield, HelpCircle, Heart, DollarSign
} from 'lucide-react';
import { motion } from 'motion/react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { User } from 'firebase/auth';

interface GuidePageProps {
  onBack: () => void;
  triggerToast: (message: string, type?: 'success' | 'error') => void;
  user: User | null;
}

interface Preset {
  id: string;
  name: string;
  icon: React.ReactNode;
  domain: string;
  role: string;
  station: string;
  theme: string;
  description: string;
  tag: string;
}

export default function GuidePage({ onBack, triggerToast, user }: GuidePageProps) {
  const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask';

  // State to track custom sandbox values inside the interactive playground
  const [testRole, setTestRole] = useState('Personal Architect');
  const [testHub, setTestHub] = useState('Sanctuary Station 0');

  // List of professional and personal domain presets
  const presets: Preset[] = [
    {
      id: 'it_pro',
      name: 'IT Professional Guy',
      icon: <Terminal className="h-5 w-5 text-[#C2410C]" />,
      domain: 'Technology & Development',
      role: 'Software Architect',
      station: 'Deep Work Terminal 0x1',
      theme: 'espresso',
      description: 'Ideal for tech sprints, backlog grooming, system architecture reviews, and hotfix monitoring.',
      tag: 'Tech-Forward'
    },
    {
      id: 'personal_home',
      name: 'Domestic Curator',
      icon: <Heart className="h-5 w-5 text-[#D97706]" />,
      domain: 'Personal & Domestic Use',
      role: 'Home Curator',
      station: 'Domestic Oasis & Garden Office',
      theme: 'warm',
      description: 'Optimized for household tasks, garden schedules, meal preps, and family organization projects.',
      tag: 'Harmonious'
    },
    {
      id: 'academic',
      name: 'Academic Researcher',
      icon: <GraduationCap className="h-5 w-5 text-[#2563EB]" />,
      domain: 'Education & Study',
      role: 'Night Scholar & Researcher',
      station: 'Library Alcove No. 4',
      theme: 'editorial',
      description: 'Crafted for reading lists, research paper deadlines, assignment reviews, and exams.',
      tag: 'Intellectual'
    },
    {
      id: 'creative',
      name: 'Visual Creator',
      icon: <Layout className="h-5 w-5 text-[#9333EA]" />,
      domain: 'Design & Crafting',
      role: 'Aesthetic Architect',
      station: 'Aesthetic Canvas & Drafting Board',
      theme: 'mineral',
      description: 'Suited for drafting designs, content calendars, asset planning, and art portfolio building.',
      tag: 'Inspiring'
    },
    {
      id: 'finance',
      name: 'Capital Strategist',
      icon: <DollarSign className="h-5 w-5 text-[#16A34A]" />,
      domain: 'Finance & Investments',
      role: 'Asset Strategist',
      station: 'Ledger Terminal & Portfolio Vault',
      theme: 'editorial',
      description: 'Structured for budget audits, bill notifications, tax logs, and investment schedules.',
      tag: 'Strategic'
    }
  ];

  const applyPreset = async (preset: Preset) => {
    try {
      localStorage.setItem(`${baseKey}_profile_role`, preset.role);
      localStorage.setItem(`${baseKey}_profile_station`, preset.station);
      localStorage.setItem(`${baseKey}_theme`, preset.theme);
      
      // Notify application of settings updates instantly
      window.dispatchEvent(new Event('smarttask_settings_updated'));
      
      // If user is authenticated, sync coordinates securely to cloud
      if (user) {
        await setDoc(doc(db, 'settings', user.uid), {
          userId: user.uid,
          theme: preset.theme,
          profileRole: preset.role,
          profileStation: preset.station,
          // Retain other existing fields or set defaults
          darkMode: localStorage.getItem(`${baseKey}_dark_mode`) === 'true',
          profileNickname: localStorage.getItem(`${baseKey}_profile_nickname`) || user.displayName || user.email?.split('@')[0] || '',
          defaultCategory: localStorage.getItem(`${baseKey}_default_category`) || 'Work',
          defaultPriority: localStorage.getItem(`${baseKey}_default_priority`) || 'medium',
          timeFormat: localStorage.getItem(`${baseKey}_time_format`) || '24h',
          deskSounds: localStorage.getItem(`${baseKey}_desk_sounds`) !== 'false',
        });
        triggerToast(`Applied "${preset.name}". Coordinates synchronized to your cloud profile!`);
      } else {
        triggerToast(`Applied "${preset.name}" changes locally.`);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast('Failed to sync preset configuration with your secure cloud profile.', 'error');
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
          <h2 className="font-serif italic text-4xl text-[#1A1A1A]">Platform Guide & Lexicon</h2>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 font-mono hidden md:inline">
          // Interactive Assistance
        </span>
      </div>

      {/* Conceptual Overview */}
      <div className="p-6 bg-white border border-[#1A1A1A] space-y-4">
        <h3 className="font-serif italic text-2xl text-[#1A1A1A] flex items-center gap-2">
          <Compass className="h-5 w-5 text-[#C2410C]" /> Demystifying the SmartTask Workspace
        </h3>
        <p className="text-xs text-slate-600 font-serif leading-relaxed">
          Welcome to the **SmartTask Platform Guide**. Whether you are coordinating high-intensity tech deployments or managing domestic daily planners, this interface adapts entirely to your context. We have replaced restrictive system schemas like "Desk" with highly generalized definitions that apply elegantly to both business hubs and private sanctuaries.
        </p>
      </div>

      {/* Grid: Explanation and Interactive Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left: Interactive Sandbox & Fields Explanation */}
        <div className="lg:col-span-7 space-y-6">
          <div className="border border-[#1A1A1A] p-6 bg-[#F9F8F6] space-y-6">
            <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#1A1A1A] border-b border-[#1A1A1A]/15 pb-2 font-mono flex items-center gap-2">
              <Sliders className="h-3.5 w-3.5" /> Mapping the Key Coordinate Fields
            </h4>

            {/* Field 1: Nickname */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">1. Display Name / Nickname</span>
              <p className="text-xs text-slate-600 font-serif leading-relaxed pl-3 border-l-2 border-[#1A1A1A]/20">
                Your primary operational label or callsign. This dictates how the header greets you when accessing the dispatch queue. Use raw personal names or specific team division tags.
              </p>
            </div>

            {/* Field 2: Professional Role */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">2. Professional / Personal Role</span>
              <p className="text-xs text-slate-600 font-serif leading-relaxed pl-3 border-l-2 border-[#1A1A1A]/20">
                The focus-vocation under which you are executing the docket. For IT professionals, this might be <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Software Engineer</code> or <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">System Operator</code>. For domestic use, it transforms seamlessly into <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Home Curator</code> or <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Daily Coordinator</code>.
              </p>
            </div>

            {/* Field 3: Workspace Hub */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800">3. Workspace Hub (Alternative to 'Desk Station')</span>
              <p className="text-xs text-slate-600 font-serif leading-relaxed pl-3 border-l-2 border-[#1A1A1A]/20">
                Your physical, virtual, or mental base of operations. Instead of a rigid desk, define it as your <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Deep Work Terminal</code>, a <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Home Sanctuary</code>, or a virtual <code className="bg-[#1A1A1A]/5 px-1 py-0.5 rounded text-[11px] font-mono font-medium">Portfolio Vault</code> depending on your personal or corporate focus.
              </p>
            </div>
          </div>

          {/* Miniature Simulator */}
          <div className="border border-dashed border-[#1A1A1A] p-6 bg-white space-y-4">
            <div>
              <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#1A1A1A] font-mono">Interactive Profile Sandbox</h4>
              <p className="text-[10px] font-serif text-slate-500 italic mt-0.5">Type custom workspace labels to see how they would display in the active editor dashboard:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A] block mb-1">Test Role</label>
                <input 
                  type="text" 
                  value={testRole}
                  onChange={(e) => setTestRole(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#1A1A1A] font-serif outline-none bg-[#F9F8F6]"
                  placeholder="e.g. System Admin"
                />
              </div>
              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-[#1A1A1A] block mb-1">Test Workspace Hub</label>
                <input 
                  type="text" 
                  value={testHub}
                  onChange={(e) => setTestHub(e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-[#1A1A1A] font-serif outline-none bg-[#F9F8F6]"
                  placeholder="e.g. Server Room No. 2"
                />
              </div>
            </div>

            {/* Simulated Live View */}
            <div className="border border-[#1A1A1A]/30 p-4 bg-[#F9F8F6] text-center font-serif">
              <span className="text-[9px] uppercase font-bold tracking-widest text-[#C2410C] font-mono">// Live Header Preview</span>
              <div className="text-lg italic mt-1 text-[#1A1A1A]">
                Greeting, Workspace Contributor
              </div>
              <div className="text-[10px] font-mono opacity-60 uppercase mt-0.5">
                Role: {testRole || 'Empty'} // {testHub || 'Empty'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Premium Dynamic Domain Presets */}
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-[#1A1A1A] bg-white p-6 space-y-6">
            <div className="border-b border-[#1A1A1A]/15 pb-2">
              <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#1A1A1A] font-mono flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-[#C2410C]" /> Quick-Apply Presets
              </h4>
              <p className="text-[10px] text-slate-500 font-serif italic mt-0.5">
                Instantly morph your platform aesthetics and coordinate fields with one click.
              </p>
            </div>

            <div className="space-y-4">
              {presets.map((preset) => (
                <div 
                  key={preset.id}
                  className="group relative border border-[#1A1A1A]/20 hover:border-[#1A1A1A] p-4 bg-[#F9F8F6] transition-all flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      {preset.icon}
                      <span className="text-xs font-bold uppercase tracking-wider text-[#1A1A1A]">{preset.name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[8px] font-mono font-bold uppercase tracking-wide bg-white border border-[#1A1A1A]/25 text-slate-600">
                      {preset.tag}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-500 font-serif leading-relaxed mb-4">
                    {preset.description}
                  </p>

                  <div className="border-t border-[#1A1A1A]/10 pt-3 grid grid-cols-2 gap-2 text-[9px] font-mono uppercase font-bold mb-4">
                    <div>
                      <span className="opacity-50 text-[8px]">Role:</span>
                      <div className="text-[#1A1A1A] truncate">{preset.role}</div>
                    </div>
                    <div>
                      <span className="opacity-50 text-[8px]">Hub:</span>
                      <div className="text-[#1A1A1A] truncate">{preset.station}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => applyPreset(preset)}
                    className="w-full border-2 border-[#1A1A1A] bg-white text-[#1A1A1A] py-1.5 text-[9px] font-bold uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="h-3 w-3" /> Apply {preset.name} Presets
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* General Security Bulletin */}
          <div className="border border-[#1A1A1A] bg-[#C2410C]/5 p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#C2410C]">
              <Shield className="h-4 w-4 shrink-0" />
              <span className="font-sans font-bold text-xs uppercase tracking-wider">Cryptographic Security</span>
            </div>
            <p className="text-[11px] text-slate-700 font-serif leading-relaxed">
              Your coordinate presets, nicknames, and agenda rosters are entirely protected via authorized Firebase security blueprints. Your metadata logs can not be indexed by external spiders.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
