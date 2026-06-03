import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, User, GraduationCap, HeartPulse, ShoppingBag, 
  Coins, Folder, Trash2, Edit3, Search, CalendarDays, 
  Bell, ArrowUpDown, SlidersHorizontal, AlertCircle, RefreshCw
} from 'lucide-react';
import { Task, Priority, Category } from '../types';

interface TaskListProps {
  tasks: Task[];
  activeTab: 'all' | 'pending' | 'completed' | 'overdue';
  onToggleComplete: (task: Task) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
}

export default function TaskList({ 
  tasks, 
  activeTab, 
  onToggleComplete, 
  onEditTask, 
  onDeleteTask 
}: TaskListProps) {
  const [search, setSearch] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'standard' | 'project'>('standard');
  const [sortBy, setSortBy] = useState<'dueDateAsc' | 'dueDateDesc' | 'priorityDesc' | 'createdAtDesc'>('dueDateAsc');

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem('smarttask_time_format') as '12h' | '24h') || '24h';
  });

  useEffect(() => {
    const handleUpdate = () => {
      setTimeFormat((localStorage.getItem('smarttask_time_format') as '12h' | '24h') || '24h');
    };
    window.addEventListener('smarttask_settings_updated', handleUpdate);
    return () => window.removeEventListener('smarttask_settings_updated', handleUpdate);
  }, []);

  // Category Icon Resolver
  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'Work': return <Briefcase className="h-3 w-3 inline mr-1" />;
      case 'Personal': return <User className="h-3 w-3 inline mr-1" />;
      case 'Education': return <GraduationCap className="h-3 w-3 inline mr-1" />;
      case 'Health': return <HeartPulse className="h-3 w-3 inline mr-1" />;
      case 'Shopping': return <ShoppingBag className="h-3 w-3 inline mr-1" />;
      case 'Finance': return <Coins className="h-3 w-3 inline mr-1" />;
      default: return <Folder className="h-3 w-3 inline mr-1" />;
    }
  };

  const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
      case 'high': return 'text-white bg-[#C2410C] border-[#1A1A1A] font-bold';
      case 'medium': return 'text-[#1A1A1A] bg-[#EBEAE6] border-[#1A1A1A] font-bold';
      case 'low': return 'text-[#1A1A1A] opacity-60 border-[#1A1A1A]/30';
    }
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h'
    });
  };

  // Filter and Sort Operations
  const processedTasks = useMemo(() => {
    const now = new Date();
    
    // 1. Filter by Active Tab
    let list = tasks.filter(task => {
      if (activeTab === 'pending') return !task.completed;
      if (activeTab === 'completed') return task.completed;
      if (activeTab === 'overdue') {
        const due = task.dueDate.toDate();
        return !task.completed && due < now;
      }
      return true; // 'all'
    });

    // 2. Local Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        t.description?.toLowerCase().includes(q)
      );
    }

    // 3. Filter by Priority
    if (selectedPriority !== 'all') {
      list = list.filter(t => t.priority === selectedPriority);
    }

    // 4. Filter by Category
    if (selectedCategory !== 'all') {
      list = list.filter(t => t.category === selectedCategory);
    }

    // 5. Filter by Project
    if (selectedProject !== 'all') {
      if (selectedProject === 'none') {
        list = list.filter(t => !t.project || t.project.trim() === '');
      } else {
        list = list.filter(t => t.project === selectedProject);
      }
    }

    // 6. Sort Tasks
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    
    list.sort((a, b) => {
      if (sortBy === 'dueDateAsc') {
        return a.dueDate.toMillis() - b.dueDate.toMillis();
      }
      if (sortBy === 'dueDateDesc') {
        return b.dueDate.toMillis() - a.dueDate.toMillis();
      }
      if (sortBy === 'priorityDesc') {
        const diff = priorityWeight[b.priority] - priorityWeight[a.priority];
        if (diff !== 0) return diff;
        return a.dueDate.toMillis() - b.dueDate.toMillis(); // fallback to early due first
      }
      if (sortBy === 'createdAtDesc') {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });

    return list;
  }, [tasks, activeTab, search, selectedPriority, selectedCategory, selectedProject, sortBy]);

  // Extract all unique project names present in current list of tasks
  const projects = useMemo(() => {
    const list = tasks
      .map(t => t.project)
      .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    return Array.from(new Set(list)).sort();
  }, [tasks]);

  // Group processed tasks project-wise
  const tasksByProject = useMemo(() => {
    const grouped: { [projectName: string]: Task[] } = {};
    
    processedTasks.forEach(task => {
      const pName = task.project ? task.project.trim() : 'Uncategorized Assignments';
      if (!grouped[pName]) {
        grouped[pName] = [];
      }
      grouped[pName].push(task);
    });
    
    // Sort keys so Uncategorized is either at the bottom or ordered consistently
    return grouped;
  }, [processedTasks]);

  const categories: Category[] = ['Work', 'Personal', 'Education', 'Health', 'Shopping', 'Finance', 'Other'];

  const renderTaskItem = (task: Task) => {
    const isOverdue = !task.completed && task.dueDate.toDate() < new Date();
    return (
      <motion.div
        key={task.id}
        layoutId={task.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`bg-[#F9F8F6] p-6 flex items-start gap-4 transition-all duration-200 relative ${
          task.completed ? 'opacity-40 grayscale' : ''
        }`}
      >
        {/* Completion Checkbox Button styled like real editorial stamp squares */}
        <button
          onClick={() => onToggleComplete(task)}
          className="mt-1 cursor-pointer select-none focus:outline-none shrink-0"
        >
          <div className={`w-4 h-4 border-2 border-[#1A1A1A] transition-colors flex items-center justify-center ${
            task.completed 
              ? 'bg-[#1A1A1A]' 
              : isOverdue 
              ? 'bg-[#C2410C]/20 border-[#C2410C]' 
              : 'bg-white hover:bg-slate-100'
          }`}>
            {task.completed && (
              <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" strokeWidth={4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {!task.completed && isOverdue && (
              <div className="w-1.5 h-1.5 bg-[#C2410C]" />
            )}
          </div>
        </button>

        {/* Meta/Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1 justify-between">
            {/* Title text in beautiful serif heading */}
            <h4 className={`text-xl font-serif text-[#1A1A1A] leading-tight break-words pr-2 ${
              task.completed ? 'line-through opacity-80' : ''
            }`}>
              {task.title}
            </h4>

            {/* Status Badges in print block styling */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto md:ml-0 mt-1 md:mt-0 font-sans">
              {/* Project Badge */}
              {task.project && (
                <span className="text-[9px] font-bold uppercase border border-[#C2410C] text-[#C2410C] bg-[#C2410C]/5 px-2 py-0.5 tracking-wider flex items-center gap-1">
                  <Folder className="h-2.5 w-2.5" />
                  {task.project}
                </span>
              )}

              {/* Priority badge */}
              <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 tracking-wider ${getPriorityStyle(task.priority)}`}>
                {task.priority}
              </span>

              {/* Category Tag */}
              <span className="text-[9px] font-bold uppercase border border-[#1A1A1A] text-[#1A1A1A] bg-white px-2 py-0.5 tracking-wider flex items-center">
                {getCategoryIcon(task.category)}
                {task.category}
              </span>

              {/* Danger Overdue label */}
              {isOverdue && (
                <span className="text-[9px] font-bold uppercase border border-[#C2410C] bg-[#C2410C] text-white px-2 py-0.5 tracking-wider animate-pulse">
                  Overdue
                </span>
              )}
            </div>
          </div>

          {/* Optional Description */}
          {task.description && (
            <p className={`text-xs text-[#666] font-serif font-light max-w-2xl leading-relaxed break-words mt-1 mb-2 ${
              task.completed ? 'line-through' : ''
            }`}>
              {task.description}
            </p>
          )}

          {/* Dates and Reminders Indicators row */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1.5 text-xs font-bold uppercase tracking-wider text-[#666] font-mono">
            {/* Due Date */}
            <div className="flex items-center gap-1.5 shrink-0">
              <CalendarDays className={`h-3.5 w-3.5 ${isOverdue ? 'text-[#C2410C]' : 'opacity-60'}`} />
              <span>Deadline: {formatDate(task.dueDate.toDate())}</span>
            </div>

            {/* Reminder clock */}
            {task.reminderTime && (
              <div className="flex items-center gap-1.5 text-[#C2410C] shrink-0 font-bold">
                <Bell className="h-3.5 w-3.5 animate-bounce" />
                <span>Alert: {formatDate(task.reminderTime.toDate())}</span>
              </div>
            )}

            {/* Recurrence Pattern */}
            {task.recurrence && task.recurrence.frequency !== 'none' && (
              <div className="flex items-center gap-1.5 text-amber-800 shrink-0 font-bold">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ animationDuration: '6s' }} />
                <span>
                  Repeats: {
                    task.recurrence.frequency === 'custom' 
                      ? `${task.recurrence.interval} ${task.recurrence.unit}` 
                      : task.recurrence.frequency
                  }
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-2 self-center ml-auto shrink-0 font-sans">
          {/* Edit Button */}
          <button
            onClick={() => onEditTask(task)}
            className="p-1.5 text-[#1A1A1A]/70 hover:text-white border border-[#1A1A1A] hover:bg-[#1A1A1A] transition-all cursor-pointer"
            title="Edit task parameters"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (window.confirm('Are you absolutely sure you want to delete this task? This action is irreversible.')) {
                onDeleteTask(task.id);
              }
            }}
            className="p-1.5 text-[#C2410C] hover:text-white border border-[#C2410C] hover:bg-[#C2410C] transition-all cursor-pointer"
            title="Terminate task document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="bg-[#F9F8F6] rounded-none border border-[#1A1A1A] p-6 shadow-none space-y-6 font-sans">
      {/* Filters Toolbar */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-[#1A1A1A]/60" />
          <input
            id="task-search-input"
            type="text"
            placeholder="Search tasks or agendas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-xs font-serif"
          />
        </div>

        {/* Multi-Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex border border-[#1A1A1A] bg-white p-1 rounded-none text-[9px] font-bold uppercase tracking-wider select-none shrink-0 mr-1">
            <button
              type="button"
              onClick={() => setViewMode('standard')}
              className={`px-2.5 py-1 cursor-pointer transition-all ${
                viewMode === 'standard' ? 'bg-[#1A1A1A] text-white' : 'hover:bg-slate-50 text-[#1A1A1A]'
              }`}
            >
              Standard
            </button>
            <button
              type="button"
              id="set-view-mode-project-btn"
              onClick={() => setViewMode('project')}
              className={`px-2.5 py-1 cursor-pointer transition-all flex items-center gap-1 ${
                viewMode === 'project' ? 'bg-[#C2410C] text-white font-bold' : 'hover:bg-slate-50 text-[#1A1A1A]'
              }`}
            >
              Projects
            </button>
          </div>

          {/* Project Select */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#1A1A1A] rounded-none">
            <Folder className="h-3.5 w-3.5 text-[#C2410C] shrink-0" />
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] cursor-pointer"
            >
              <option value="all">All Projects</option>
              <option value="none">No Project</option>
              {projects.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#1A1A1A] rounded-none">
            <SlidersHorizontal className="h-3.5 w-3.5 text-[#1A1A1A]/60 shrink-0" />
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] cursor-pointer"
            >
              <option value="all">Any Urgency</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#1A1A1A] rounded-none">
            <Folder className="h-3.5 w-3.5 text-[#1A1A1A]/60 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] cursor-pointer"
            >
              <option value="all">Any Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Sort selection */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-white border border-[#1A1A1A] rounded-none">
            <ArrowUpDown className="h-3.5 w-3.5 text-[#1A1A1A]/60 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent border-none outline-none text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] cursor-pointer"
            >
              <option value="dueDateAsc">Due: Soonest first</option>
              <option value="dueDateDesc">Due: Latest first</option>
              <option value="priorityDesc">Urgency: High first</option>
              <option value="createdAtDesc">Added: Newest first</option>
            </select>
          </div>
        </div>
      </div>

      {/* Task List Items Panel / Layout Renderer */}
      {processedTasks.length === 0 ? (
        <div className="space-y-px bg-[#1A1A1A] min-h-[150px]">
          <div className="h-[250px] bg-[#F9F8F6] border border-[#1A1A1A]/10 flex flex-col justify-center items-center text-center px-4">
            <AlertCircle className="h-8 w-8 text-[#C2410C] mb-3" />
            <span className="font-serif italic text-xl text-[#1A1A1A]">No tasks match active criteria</span>
            <p className="text-slate-500 text-xs mt-1 max-w-sm font-serif font-light">
              Try updating search queries, clearing active priority bounds, or adding brand new assignments using the action above.
            </p>
          </div>
        </div>
      ) : viewMode === 'standard' ? (
        <div className="space-y-px bg-[#1A1A1A] min-h-[150px]">
          <div className="space-y-px">
            <AnimatePresence mode="popLayout">
              {processedTasks.map((task) => renderTaskItem(task))}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        /* Project Books mode */
        <div className="space-y-8" id="project-books-container">
          {(Object.entries(tasksByProject) as [string, Task[]][]).map(([projectName, projectTasks]) => {
            if (projectTasks.length === 0) return null;
            return (
              <div key={projectName} className="border border-[#1A1A1A] bg-[#F4F3EF] p-5 shadow-none space-y-4">
                <div className="flex justify-between items-baseline border-b border-[#1A1A1A]/30 pb-2">
                  <h4 className="font-serif italic text-2xl text-[#1A1A1A] font-semibold flex items-center gap-2">
                    <Folder className="h-4 w-4 text-[#C2410C] inline" />
                    <span>{projectName}</span>
                  </h4>
                  <span className="text-[9px] uppercase font-mono tracking-wider font-bold opacity-60">
                    {projectTasks.length} Task{projectTasks.length !== 1 ? 's' : ''} Filed
                  </span>
                </div>
                <div className="space-y-px bg-[#1A1A1A]">
                  <AnimatePresence mode="popLayout">
                    {projectTasks.map((task) => renderTaskItem(task))}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
