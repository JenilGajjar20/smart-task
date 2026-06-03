import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertTriangle, ListChecks, Calendar, PieChart, Sparkles } from 'lucide-react';
import { Task } from '../types';

interface DashboardProps {
  tasks: Task[];
  onSelectTab: (tab: 'all' | 'pending' | 'completed' | 'overdue') => void;
  activeTab: string;
}

export default function Dashboard({ tasks, onSelectTab, activeTab }: DashboardProps) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  const pending = tasks.filter(t => !t.completed).length;
  
  const now = new Date();
  const overdue = tasks.filter(t => {
    if (t.completed) return false;
    const due = t.dueDate.toDate();
    return due < now;
  }).length;

  // Completion Percentage
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Priority Stats
  const highPriority = tasks.filter(t => !t.completed && t.priority === 'high').length;
  const medPriority = tasks.filter(t => !t.completed && t.priority === 'medium').length;
  const lowPriority = tasks.filter(t => !t.completed && t.priority === 'low').length;

  // Category counts
  const categories: Record<string, number> = {
    Work: 0, Personal: 0, Education: 0, Health: 0, Shopping: 0, Finance: 0, Other: 0
  };
  tasks.forEach(t => {
    if (!t.completed && categories[t.category] !== undefined) {
      categories[t.category]++;
    }
  });

  const activeCategories = Object.entries(categories).filter(([_, count]) => count > 0);

  // Motivational quote based on completion rate
  let motivation = "Unlock your focus. Write down what needs to be done today and tackle it step-by-step.";
  if (completionRate === 100 && total > 0) {
    motivation = "Phenomenal workout! Every single objective for the day has been checked off.";
  } else if (completionRate > 75) {
    motivation = "You are in the zone! Just a few remaining points left, finish strong!";
  } else if (completionRate > 40) {
    motivation = "Excellent progress! Keep maintaining this focus, you are finishing key items.";
  } else if (total > 0 && completed > 0) {
    motivation = "First milestones successfully reached. Steady execution breeds incredible results.";
  }

  // Calculate mock completion heights for the last 7 days of the week
  // Sunday to Saturday based on current actual tasks count to give it real feeling
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayIndex = now.getDay();
  const mockHeights = [40, 60, 35, 85, 55, 20, 95];
  // Replace the today value with actual progress
  mockHeights[currentDayIndex] = total > 0 ? completionRate : 15;

  const statCards = [
    {
      id: 'pending',
      title: 'Pending Obligations',
      value: pending,
      icon: Clock,
      themeColor: '#C2410C',
      tabKey: 'pending' as const,
    },
    {
      id: 'completed',
      title: 'Completed List',
      value: completed,
      icon: CheckCircle2,
      themeColor: '#1A1A1A',
      tabKey: 'completed' as const,
    },
    {
      id: 'overdue',
      title: 'Critical Overdue',
      value: overdue,
      icon: AlertTriangle,
      themeColor: '#C2410C',
      tabKey: 'overdue' as const,
    },
    {
      id: 'all',
      title: 'Total Scope',
      value: total,
      icon: ListChecks,
      themeColor: '#1A1A1A',
      tabKey: 'all' as const,
    }
  ];

  return (
    <div className="space-y-6 font-sans text-[#1A1A1A]">
      {/* Top Banner with Completion Rate */}
      <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A] p-6 shadow-none overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-3 text-center md:text-left max-w-xl z-10">
          <div className="flex gap-2 items-center justify-center md:justify-start text-[#C2410C] bg-[#C2410C]/5 px-3 py-1 border border-[#C2410C]/20 rounded-none text-[10px] font-bold uppercase tracking-widest w-fit">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Productivity Briefing</span>
          </div>
          <h2 className="text-3xl font-serif font-light text-[#1A1A1A] tracking-tight italic leading-tight">
            Your Daily Workspace Summary
          </h2>
          <p className="text-slate-700 text-sm leading-relaxed font-serif font-light">{motivation}</p>
        </div>

        {/* Dynamic circular progress bar widget */}
        <div className="shrink-0 relative flex items-center justify-center w-36 h-36">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="#EBEAE6"
              strokeWidth="5"
              fill="transparent"
            />
            {/* Progress circle */}
            <motion.circle
              cx="50"
              cy="50"
              r="40"
              stroke="#1A1A1A"
              strokeWidth="5"
              fill="transparent"
              strokeDasharray={251.2}
              initial={{ strokeDashoffset: 251.2 }}
              animate={{ strokeDashoffset: 251.2 - (251.2 * completionRate) / 100 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </svg>
          <div className="absolute text-center">
            <span className="text-3xl font-serif italic font-bold text-[#1A1A1A]">{completionRate}%</span>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Rate</p>
          </div>
        </div>
      </div>

      {/* Grid of Interactive counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const isActive = activeTab === card.tabKey;
          const isOverdueAlert = card.id === 'overdue' && overdue > 0;
          
          return (
            <motion.div
              key={card.id}
              onClick={() => onSelectTab(card.tabKey)}
              className={`p-5 rounded-none border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                isActive 
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-[#F9F8F6] shadow-sm' 
                  : 'bg-[#F9F8F6] border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
              }`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex justify-between items-center w-full mb-3">
                <span className={`text-[10px] font-bold tracking-[0.15em] uppercase ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {card.title}
                </span>
                <div className={`p-1.5 ${
                  isActive 
                    ? 'text-[#F9F8F6] bg-slate-800' 
                    : isOverdueAlert 
                    ? 'text-white bg-[#C2410C]' 
                    : 'text-[#1A1A1A] bg-slate-200/50'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-serif font-semibold leading-none">
                  {String(card.value).padStart(2, '0')}
                </span>
                <span className={`text-[10px] uppercase font-bold tracking-wider ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                  item{card.value !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Breakdown Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Priority breakdown panel */}
        <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A] p-6 shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3 text-slate-800">
            <PieChart className="h-4 w-4 text-[#C2410C]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800">Focus Indices</span>
          </div>
          
          {total === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No task metrics loaded.</div>
          ) : (
            <div className="space-y-4">
              {/* High */}
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  <span>High Priority</span>
                  <span>{highPriority} tasks</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                  <div 
                    className="bg-[#C2410C] h-full transition-all duration-500"
                    style={{ width: `${pending > 0 ? (highPriority / pending) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Medium */}
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  <span>Medium Priority</span>
                  <span>{medPriority} tasks</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                  <div 
                    className="bg-[#1A1A1A] h-full transition-all duration-500"
                    style={{ width: `${pending > 0 ? (medPriority / pending) * 100 : 0}%` }}
                  />
                </div>
              </div>

              {/* Low */}
              <div>
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  <span>Low Priority</span>
                  <span>{lowPriority} tasks</span>
                </div>
                <div className="w-full bg-slate-200 h-1.5 rounded-none overflow-hidden">
                  <div 
                    className="bg-slate-400 h-full transition-all duration-500"
                    style={{ width: `${pending > 0 ? (lowPriority / pending) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Velocity Tracker panel */}
        <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A] p-6 shadow-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3 text-slate-800 mb-4">
              <Sparkles className="h-4 w-4 text-[#C2410C]" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800">Velocity Tracker</span>
            </div>
            
            <div className="h-28 w-full flex items-end justify-between gap-1.5 pt-2">
              {daysOfWeek.map((day, dIdx) => {
                const isActiveDay = dIdx === currentDayIndex;
                const heightVal = mockHeights[dIdx];
                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full bg-slate-200 h-full rounded-none overflow-hidden relative">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightVal}%` }}
                        transition={{ duration: 0.6, delay: dIdx * 0.05 }}
                        className={`absolute bottom-0 left-0 right-0 ${isActiveDay ? 'bg-[#C2410C]' : 'bg-[#1A1A1A] opacity-80'}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[9px] uppercase font-bold tracking-widest text-[#1A1A1A]">
            {daysOfWeek.map((day, dIdx) => (
              <span key={day} className={dIdx === currentDayIndex ? 'text-[#C2410C]' : 'opacity-50'}>
                {day}
              </span>
            ))}
          </div>
        </div>

        {/* Category distribution panel */}
        <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A] p-6 shadow-none space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1A1A1A] pb-3 text-slate-800">
            <Calendar className="h-4 w-4 text-[#C2410C]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-800">Contextual Categories</span>
          </div>

          {activeCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400 italic">No active category loads.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
              {activeCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between p-2.5 bg-white border border-[#1A1A1A] rounded-none">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{cat}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest font-mono">Context</span>
                  </div>
                  <span className="text-lg font-serif italic text-[#C2410C] font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
