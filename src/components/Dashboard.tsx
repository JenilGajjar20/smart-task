import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, AlertTriangle, ListChecks, Calendar, PieChart, Sparkles } from 'lucide-react';
import { Task } from '../types';

interface DashboardProps {
  tasks: Task[];
  onSelectTab: (tab: 'all' | 'pending' | 'completed' | 'overdue') => void;
  activeTab: string;
  view?: 'summary' | 'insights';
}

export default function Dashboard({ tasks, onSelectTab, activeTab, view = 'summary' }: DashboardProps) {
  const nonCancelledTasks = useMemo(() => tasks.filter(t => t.status !== 'Cancelled'), [tasks]);
  const total = nonCancelledTasks.length;
  
  const completed = useMemo(() => nonCancelledTasks.filter(t => t.status ? t.status === 'Completed' : t.completed).length, [nonCancelledTasks]);
  const pending = useMemo(() => nonCancelledTasks.filter(t => t.status ? (t.status === 'Not Started' || t.status === 'In Progress' || t.status === 'Waiting / Blocked') : !t.completed).length, [nonCancelledTasks]);
  
  const now = new Date();
  const overdue = useMemo(() => nonCancelledTasks.filter(t => {
    const isCompleted = t.status ? t.status === 'Completed' : t.completed;
    if (isCompleted) return false;
    const due = t.dueDate.toDate();
    return due < now;
  }).length, [nonCancelledTasks, now]);

  // Today Command Center Intelligence calculations
  const suggestedFocusTask = useMemo(() => {
    const incomplete = nonCancelledTasks.filter(t => t.status ? (t.status === 'Not Started' || t.status === 'In Progress' || t.status === 'Waiting / Blocked') : !t.completed);
    const high = incomplete.filter(t => t.priority === 'high');
    if (high.length > 0) return high[0];
    const med = incomplete.filter(t => t.priority === 'medium');
    if (med.length > 0) return med[0];
    return incomplete[0] || null;
  }, [nonCancelledTasks]);

  const overdueTasksList = useMemo(() => {
    return nonCancelledTasks.filter(t => {
      const isCompleted = t.status ? t.status === 'Completed' : t.completed;
      if (isCompleted) return false;
      const due = t.dueDate.toDate();
      return due < now;
    });
  }, [nonCancelledTasks, now]);

  const upcomingDeadlinesList = useMemo(() => {
    return nonCancelledTasks.filter(t => {
      const isCompleted = t.status ? t.status === 'Completed' : t.completed;
      if (isCompleted) return false;
      const due = t.dueDate.toDate();
      const diffMs = due.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= 3;
    });
  }, [nonCancelledTasks, now]);

  const totalEstimatedWorkload = useMemo(() => {
    const incomplete = nonCancelledTasks.filter(t => t.status ? (t.status === 'Not Started' || t.status === 'In Progress' || t.status === 'Waiting / Blocked') : !t.completed);
    let totalHours = 0;
    incomplete.forEach(t => {
      if (t.estimatedTime !== undefined) {
        totalHours += Number(t.estimatedTime);
      } else {
        totalHours += 1.0; // Default budget weight per pending task block
      }
    });
    return totalHours;
  }, [nonCancelledTasks]);

  // Completion Percentage
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Priority Stats
  const highPriority = nonCancelledTasks.filter(t => {
    const isCompleted = t.status ? t.status === 'Completed' : t.completed;
    return !isCompleted && t.priority === 'high';
  }).length;
  const medPriority = nonCancelledTasks.filter(t => {
    const isCompleted = t.status ? t.status === 'Completed' : t.completed;
    return !isCompleted && t.priority === 'medium';
  }).length;
  const lowPriority = nonCancelledTasks.filter(t => {
    const isCompleted = t.status ? t.status === 'Completed' : t.completed;
    return !isCompleted && t.priority === 'low';
  }).length;

  // Category counts
  const categories: Record<string, number> = {
    Work: 0, Personal: 0, Education: 0, Health: 0, Shopping: 0, Finance: 0, Other: 0
  };
  nonCancelledTasks.forEach(t => {
    const isCompleted = t.status ? t.status === 'Completed' : t.completed;
    if (!isCompleted && categories[t.category] !== undefined) {
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

  // Calculate actual completion heights and tallies for the 7 days of the current week
  // Sunday to Saturday based on current actual tasks count
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDayIndex = now.getDay();

  // Find the start of the current week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const realWeeklyData = daysOfWeek.map((day, dIdx) => {
    const targetDay = new Date(startOfWeek);
    targetDay.setDate(startOfWeek.getDate() + dIdx);
    
    const startOfDay = new Date(targetDay);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDay);
    endOfDay.setHours(23, 59, 59, 999);
    
    const tasksOnDay = nonCancelledTasks.filter(t => {
      if (!t.dueDate) return false;
      try {
        const tDate = t.dueDate.toDate();
        return tDate >= startOfDay && tDate <= endOfDay;
      } catch (e) {
        return false;
      }
    });

    const totalOnDay = tasksOnDay.length;
    const completedOnDay = tasksOnDay.filter(t => t.status ? t.status === 'Completed' : t.completed).length;
    const rate = totalOnDay > 0 ? Math.round((completedOnDay / totalOnDay) * 100) : 0;

    return {
      rate,
      total: totalOnDay,
      completed: completedOnDay,
    };
  });

  const statCards = [
    {
      id: 'pending',
      title: 'Pending tasks',
      value: pending,
      icon: Clock,
      themeColor: '#C2410C',
      tabKey: 'pending' as const,
    },
    {
      id: 'completed',
      title: 'Completed tasks',
      value: completed,
      icon: CheckCircle2,
      themeColor: '#1A1A1A',
      tabKey: 'completed' as const,
    },
    {
      id: 'overdue',
      title: 'Overdue tasks',
      value: overdue,
      icon: AlertTriangle,
      themeColor: '#C2410C',
      tabKey: 'overdue' as const,
    },
    {
      id: 'all',
      title: 'Total tasks',
      value: total,
      icon: ListChecks,
      themeColor: '#1A1A1A',
      tabKey: 'all' as const,
    }
  ];

  if (view === 'summary') {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-sans text-[#1A1A1A] my-1">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const isActive = activeTab === card.tabKey;
          const isOverdueAlert = card.id === 'overdue' && overdue > 0;
          
          return (
            <motion.div
              key={card.id}
              onClick={() => onSelectTab(card.tabKey)}
              className={`p-3.5 rounded-none border transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-xs ${
                isActive 
                  ? 'bg-[#1A1A1A] border-[#1A1A1A] text-white shadow-sm' 
                  : 'bg-white border-slate-200 text-[#1A1A1A] hover:bg-slate-50 hover:border-slate-300'
              }`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ scale: 1.01 }}
            >
              <div className="flex justify-between items-center w-full mb-2.5">
                <span className={`text-[11px] font-medium font-sans ${isActive ? 'text-slate-305' : 'text-slate-500'}`}>
                  {card.title}
                </span>
                <div className={`p-1 shrink-0 ${
                  isActive 
                    ? 'text-white bg-slate-800' 
                    : isOverdueAlert 
                    ? 'text-white bg-[#C2410C]' 
                    : 'text-[#1A1A1A] bg-slate-100'
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-2xl md:text-3xl font-serif font-bold leading-none">
                  {String(card.value).padStart(2, '0')}
                </span>
                <span className={`text-[9px] font-medium font-sans ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
                  task{card.value !== 1 ? 's' : ''}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-8 font-sans text-[#1A1A1A]">
      {/* Top Banner with Completion Rate */}
      <div className="bg-white rounded-none border border-slate-200 p-6 shadow-xs overflow-hidden relative flex flex-col md:flex-row items-center justify-between gap-6">
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
              <div className="flex justify-between items-start gap-2 w-full mb-3">
                <span className={`text-[10px] md:text-xs font-bold tracking-[0.15em] uppercase break-words leading-tight ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                  {card.title}
                </span>
                <div className={`p-1.5 shrink-0 ${
                  isActive 
                    ? 'text-[#F9F8F6] bg-slate-800' 
                    : isOverdueAlert 
                    ? 'text-white bg-[#C2410C]' 
                    : 'text-[#1A1A1A] bg-slate-200/50'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex items-baseline gap-1 flex-wrap">
                <span className="text-3xl md:text-4xl font-serif font-semibold leading-none">
                  {String(card.value).padStart(2, '0')}
                </span>
                <span className={`text-[9px] uppercase font-bold tracking-wider ${isActive ? 'text-slate-400' : 'text-slate-400'}`}>
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
              {realWeeklyData.map((dayData, dIdx) => {
                const day = daysOfWeek[dIdx];
                const isActiveDay = dIdx === currentDayIndex;
                const heightVal = dayData.total > 0 ? dayData.rate : 0;
                
                // Construct informative tooltip text stating actual status
                const tooltipText = dayData.total === 0 
                  ? "No tasks scheduled" 
                  : `${dayData.rate}% (${dayData.completed}/${dayData.total} done)`;

                return (
                  <div key={day} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end relative group">
                    {/* Floating hover tooltip precisely above the weekly metric bar */}
                    <div 
                      className="absolute left-1/2 -translate-x-1/2 bg-white border border-[#1A1A1A] px-2 py-1 text-[9px] font-mono font-bold text-[#1A1A1A] whitespace-nowrap shadow-md opacity-0 group-hover:opacity-100 transition-all duration-150 pointer-events-none z-20"
                      style={{ bottom: `calc(${heightVal}% + 6px)` }}
                    >
                      {tooltipText}
                    </div>
                    <div className="w-full bg-slate-200 h-full rounded-none overflow-hidden relative cursor-pointer">
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${heightVal}%` }}
                        transition={{ duration: 0.6, delay: dIdx * 0.05 }}
                        className={`absolute bottom-0 left-0 right-0 ${isActiveDay ? 'bg-[#C2410C]' : 'bg-[#1A1A1A] opacity-80 group-hover:opacity-100 transition-opacity'}`}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2 gap-2 max-h-[140px] overflow-y-auto pr-1">
              {activeCategories.map(([cat, count]) => (
                <div key={cat} className="flex items-center justify-between p-2.5 bg-white border border-[#1A1A1A] rounded-none gap-2">
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 truncate" title={cat}>{cat}</span>
                    <span className="text-[8px] text-slate-400 uppercase tracking-widest font-mono">Context</span>
                  </div>
                  <span className="text-lg font-serif italic text-[#C2410C] font-semibold shrink-0">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* TODAY COMMAND CENTER — WORKSPACE INTELLIGENCE BRIEF */}
      <motion.div 
        className="bg-[#F4F3EF] border border-[#1A1A1A] p-6 rounded-none space-y-6"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#C2410C]" />
            <span className="font-serif italic text-xl font-bold text-[#1A1A1A]">
              Today's Workspace Command Briefing
            </span>
          </div>
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-slate-500 bg-white border border-[#1A1A1A]/10 px-2 py-0.5">
            Command Center Active
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Column 1: Suggested Priority Target & Workload Index */}
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-[#C2410C] uppercase tracking-[0.2em] font-mono">
              ⚡ Focus Suggestion & Load
            </span>
            
            {suggestedFocusTask ? (
              <div className="bg-white p-4 border border-[#1A1A1A]/10 space-y-2">
                <span className="block text-[8px] font-bold uppercase tracking-wide text-slate-400 font-mono">
                  SUGGESTED NEXT STEP
                </span>
                <h4 className="font-serif italic text-base font-bold text-[#1A1A1A]">
                  {suggestedFocusTask.title}
                </h4>
                <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500">
                  <span>Folder: {suggestedFocusTask.category}</span>
                  <span>·</span>
                  <span className="text-red-700 bg-red-50 px-1 font-bold">{suggestedFocusTask.priority}</span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 italic">
                No incomplete tasks available for focus guidance.
              </div>
            )}

            {/* Workload Index */}
            <div className="bg-[#1A1A1A] text-white p-4 border border-[#1A1A1A] space-y-1">
              <span className="block text-[8px] font-bold uppercase tracking-widest text-[#C2410C] font-mono">
                WORKLOAD INTENSITY
              </span>
              <div className="flex justify-between items-baseline">
                <span className="text-3xl font-mono font-bold tracking-tight text-white">
                  {totalEstimatedWorkload.toFixed(1)}h
                </span>
                <span className="text-[9px] text-[#F9F8F6]/60 uppercase font-bold tracking-wider font-mono">
                  Est. workspace burden
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-serif italic pt-1 leading-normal">
                Based on active user task estimates (unspecified items assigned basic 1h credit).
              </p>
            </div>
          </div>

          {/* Column 2: Overdue Action Intervention Items */}
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] font-mono">
              🚨 Overdue Action Items
            </span>
            
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {overdueTasksList.length > 0 ? (
                overdueTasksList.slice(0, 4).map(t => (
                  <div key={t.id} className="bg-red-50/50 p-3 border border-[#C2410C]/20 flex flex-col justify-between">
                    <h5 className="font-serif text-xs font-bold text-[#1A1A1A] truncate">{t.title}</h5>
                    <div className="flex justify-between items-center text-[8px] font-mono text-slate-600 mt-1">
                      <span>Folder: {t.category}</span>
                      <span className="text-[#C2410C] font-bold uppercase">OUT OF TIME</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-emerald-50/40 border border-emerald-900/10 text-center text-xs text-slate-500 font-serif italic">
                  Excellent! No overdue action elements are active.
                </div>
              )}
              {overdueTasksList.length > 4 && (
                <span className="block text-[8px] font-mono text-center text-slate-400 uppercase font-bold">
                  + {overdueTasksList.length - 4} other overdue items
                </span>
              )}
            </div>
          </div>

          {/* Column 3: Upcoming Deadlines */}
          <div className="space-y-4">
            <span className="block text-[10px] font-bold text-slate-700 uppercase tracking-[0.2em] font-mono">
              📅 Upcoming Deadlines
            </span>
            
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {upcomingDeadlinesList.length > 0 ? (
                upcomingDeadlinesList.slice(0, 4).map(t => {
                  const daysLeft = Math.ceil((t.dueDate.toDate().getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={t.id} className="bg-white p-3 border border-[#1A1A1A]/10 flex flex-col justify-between">
                      <h5 className="font-serif text-xs font-bold text-[#1A1A1A] truncate">{t.title}</h5>
                      <div className="flex justify-between items-center text-[8px] font-mono text-slate-500 mt-1">
                        <span>Folder: {t.category}</span>
                        <span className="font-bold text-orange-850">
                          {daysLeft === 0 ? "Today" : daysLeft === 1 ? "Tomorrow" : `In ${daysLeft} Days`}
                        </span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-4 bg-slate-50 border border-[#1A1A1A]/10 text-center text-xs text-slate-400 italic font-serif">
                  No deadlines scheduled in the coming 72 hours.
                </div>
              )}
              {upcomingDeadlinesList.length > 4 && (
                <span className="block text-[8px] font-mono text-center text-slate-400 uppercase font-bold">
                  + {upcomingDeadlinesList.length - 4} other upcoming deadlines
                </span>
              )}
            </div>
          </div>

        </div>
      </motion.div>

    </div>
  );
}
