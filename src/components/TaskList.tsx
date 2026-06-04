import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, User, GraduationCap, HeartPulse, ShoppingBag, 
  Coins, Folder, Trash2, Edit3, Search, CalendarDays, 
  Bell, ArrowUpDown, SlidersHorizontal, AlertCircle, RefreshCw,
  Play, Pause, RotateCcw, Volume2, Flame, ExternalLink, Calendar,
  TrendingUp, Clock, CheckSquare, Sparkles, BookOpen
} from 'lucide-react';
import { db } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Task, Priority, Category } from '../types';
import { getFileFromLocal } from '../utils/fileStorage';

function AttachmentLink({ att }: { att: any }) {
  const [resolvedUrl, setResolvedUrl] = useState(att.url);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (att.url && att.url.startsWith('local-file://')) {
      const fileId = att.url.replace('local-file://', '');
      setLoading(true);
      getFileFromLocal(fileId).then((base64) => {
        if (base64) {
          setResolvedUrl(base64);
        } else {
          setResolvedUrl('#');
        }
        setLoading(false);
      }).catch((err) => {
        console.error('Failed to resolve local file', err);
        setResolvedUrl('#');
        setLoading(false);
      });
    } else {
      setResolvedUrl(att.url);
    }
  }, [att.url]);

  if (loading) {
    return <span className="text-slate-400 italic text-[11px] font-mono">Resolving file...</span>;
  }

  if (resolvedUrl === '#') {
    return (
      <span className="text-slate-400 italic text-[11px]" title="This attachment was saved locally on the original device.">
        {att.name} (Local-only file)
      </span>
    );
  }

  if (att.type === 'File' || att.type === 'Screenshot') {
    return (
      <a 
        href={resolvedUrl} 
        download={att.name}
        className="font-serif italic font-medium text-[#C2410C] hover:underline truncate"
      >
        {att.name} (Download)
      </a>
    );
  }

  return (
    <a 
      href={resolvedUrl} 
      target="_blank" 
      referrerPolicy="no-referrer"
      className="font-serif italic font-medium text-[#C2410C] hover:underline truncate"
    >
      {att.name}
    </a>
  );
}

interface TaskListProps {
  tasks: Task[];
  activeTab: 'all' | 'pending' | 'completed' | 'overdue';
  onToggleComplete: (task: Task) => Promise<void>;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => Promise<void>;
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  isFiltersOpen?: boolean;
  onCloseFilters?: () => void;
  viewKey?: string;
  setViewKey?: (key: string) => void;
}

export default function TaskList({ 
  tasks, 
  activeTab, 
  onToggleComplete, 
  onEditTask, 
  onDeleteTask,
  searchQuery,
  setSearchQuery,
  isFiltersOpen = false,
  onCloseFilters,
  viewKey: propsViewKey,
  setViewKey: propsSetViewKey
}: TaskListProps) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchQuery !== undefined ? searchQuery : internalSearch;
  const setSearch = setSearchQuery !== undefined ? setSearchQuery : setInternalSearch;

  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [dueDateFilter, setDueDateFilter] = useState<string>('all');
  const [isAdvancedFiltersOpen, setIsAdvancedFiltersOpen] = useState<boolean>(false);
  
  // Strong multi-view state key with fallback and callback triggering
  const [localViewKey, setLocalViewKey] = useState<string>(() => {
    return localStorage.getItem('smarttask_guest_default_task_view') || 
           localStorage.getItem('smarttask_default_task_view') || 
           'agenda';
  });

  const viewKey = propsViewKey !== undefined ? propsViewKey : localViewKey;
  const setViewKey = (val: string) => {
    if (propsSetViewKey) {
      propsSetViewKey(val);
    } else {
      setLocalViewKey(val);
    }
    localStorage.setItem('smarttask_guest_default_task_view', val);
    localStorage.setItem('smarttask_default_task_view', val);
  };

  const [sortBy, setSortBy] = useState<'dueDateAsc' | 'dueDateDesc' | 'priorityDesc' | 'createdAtDesc'>('dueDateAsc');
  const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Task | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Lock body scroll of the background page when the drawer (selectedTaskForDetail) or delete modal (taskToDelete) are open
  useEffect(() => {
    if (selectedTaskForDetail || taskToDelete) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedTaskForDetail, taskToDelete]);

  // Focus View Pomodoro Timer State
  const [timerSeconds, setTimerSeconds] = useState(1500); // 25 mins
  const [timerRunning, setTimerRunning] = useState(false);

  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(() => {
    return (localStorage.getItem('smarttask_time_format') as '12h' | '24h') || '24h';
  });

  useEffect(() => {
    const handleUpdate = () => {
      setTimeFormat((localStorage.getItem('smarttask_time_format') as '12h' | '24h') || '24h');
      
      const guestKey = localStorage.getItem('smarttask_guest_default_task_view');
      const userKey = localStorage.getItem('smarttask_default_task_view');
      setViewKey(guestKey || userKey || 'agenda');
    };
    window.addEventListener('smarttask_settings_updated', handleUpdate);
    return () => window.removeEventListener('smarttask_settings_updated', handleUpdate);
  }, []);

  // Synchronize dynamic updates on selectedTaskForDetail when tasks change from props
  useEffect(() => {
    if (selectedTaskForDetail) {
      const updatedTask = tasks.find(t => t.id === selectedTaskForDetail.id);
      if (updatedTask) {
        setSelectedTaskForDetail(updatedTask);
      } else {
        setSelectedTaskForDetail(null);
      }
    }
  }, [tasks, selectedTaskForDetail?.id]);

  // Web synthesizer alarm for focus spot Pomodoro completion
  const playHarpChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = audioCtx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.12, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.12 + 0.5);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.6);
      });
    } catch (e) {
      console.warn('Speaker block bypass', e);
    }
  };

  // Run countdown effect
  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => {
          if (prev <= 1) {
            setTimerRunning(false);
            playHarpChime();
            alert('Focus Pomodoro Interval Fully Dispatched! Relax your mind for 5 minutes.');
            return 1500;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Handle direct in-place subtask toggle in details drawer or task card list
  const handleToggleSubtask = async (task: Task, subtaskId: string) => {
    if (!task.subtasks) return;
    const updated = task.subtasks.map(s => s.id === subtaskId ? { ...s, completed: !s.completed } : s);
    try {
      const docRef = doc(db, 'tasks', task.id);
      await updateDoc(docRef, {
        subtasks: updated,
        updatedAt: serverTimestamp()
      });
      if (selectedTaskForDetail && selectedTaskForDetail.id === task.id) {
        setSelectedTaskForDetail({ ...selectedTaskForDetail, subtasks: updated });
      }
    } catch (err) {
      console.error('Failure updating checklist', err);
    }
  };

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

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-emerald-700 bg-[#E2FBF0] border-[#A7F3D0] font-bold';
      case 'In Progress':
        return 'text-blue-700 bg-[#E0F2FE] border-[#BAE6FD] font-bold';
      case 'Waiting / Blocked':
        return 'text-amber-700 bg-[#FEF3C7] border-[#FDE68A] font-bold';
      case 'Cancelled':
        return 'text-zinc-500 bg-[#F4F4F5] border-[#D4D4D8] font-bold line-through';
      default: // 'Not Started'
        return 'text-slate-600 bg-slate-50 border-slate-300';
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
      const taskStatus = task.status || (task.completed ? 'Completed' : 'Not Started');
      if (activeTab === 'pending') {
        return taskStatus === 'Not Started' || taskStatus === 'In Progress' || taskStatus === 'Waiting / Blocked';
      }
      if (activeTab === 'completed') {
        return taskStatus === 'Completed';
      }
      if (activeTab === 'overdue') {
        const due = task.dueDate.toDate();
        return (taskStatus !== 'Completed' && taskStatus !== 'Cancelled') && due < now;
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

    // 4.5 Filter by Status
    if (selectedStatus !== 'all') {
      list = list.filter(t => {
        const tStatus = t.status || (t.completed ? 'Completed' : 'Not Started');
        return tStatus === selectedStatus;
      });
    }

    // 4.6 Filter by Due Date Filter Dropdown and presets
    if (dueDateFilter !== 'all') {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date();
      endOfToday.setHours(23, 59, 59, 999);

      const endOfWeek = new Date();
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      endOfWeek.setHours(23, 59, 59, 999);

      list = list.filter(t => {
        const d = t.dueDate.toDate();
        if (dueDateFilter === 'today') {
          return d >= startOfToday && d <= endOfToday;
        }
        if (dueDateFilter === 'thisWeek') {
          return d >= startOfToday && d <= endOfWeek;
        }
        if (dueDateFilter === 'overdue') {
          const tStatus = t.status || (t.completed ? 'Completed' : 'Not Started');
          return d < new Date() && tStatus !== 'Completed' && tStatus !== 'Cancelled';
        }
        return true;
      });
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
  }, [tasks, activeTab, search, selectedPriority, selectedCategory, selectedStatus, selectedProject, dueDateFilter, sortBy]);

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
    const taskStatus = task.status || (task.completed ? 'Completed' : 'Not Started');
    
    // Subtask count helpers
    const totalSubtasks = task.subtasks?.length || 0;
    const completedSubtasks = task.subtasks?.filter(s => s.completed).length || 0;

    return (
      <motion.div
        key={task.id}
        layoutId={task.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`p-4 flex items-start gap-3.5 transition-all duration-200 border-b border-slate-100 relative ${
          task.completed 
            ? 'bg-slate-50/30 opacity-60 hover:opacity-85' 
            : 'bg-white hover:bg-slate-50/60'
        }`}
      >
        {/* Completion Checkbox Button */}
        <button
          type="button"
          onClick={() => onToggleComplete(task)}
          className="mt-0.5 cursor-pointer select-none focus:outline-none shrink-0"
        >
          <div className={`w-4 h-4 border-2 transition-colors flex items-center justify-center ${
            task.completed 
              ? 'bg-slate-400 border-slate-400' 
              : isOverdue 
              ? 'bg-red-50 border-red-500 hover:bg-red-100' 
              : 'bg-white border-slate-300 hover:border-slate-400'
          }`}>
            {task.completed && (
              <svg className="w-2.5 h-2.5 text-white stroke-current" fill="none" strokeWidth={4} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            )}
            {!task.completed && isOverdue && (
              <div className="w-1.5 h-1.5 bg-red-500" />
            )}
          </div>
        </button>

        {/* Clickable Card Body Content */}
        <div 
          onClick={() => setSelectedTaskForDetail(task)}
          className="flex-1 min-w-0 cursor-pointer select-none"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1.5 mb-1.5">
            {/* Title Text */}
            <h4 className={`text-sm md:text-base font-sans font-medium text-slate-800 tracking-tight leading-snug break-words pr-2 hover:text-slate-600 hover:underline ${
              task.completed ? 'line-through text-slate-400 font-normal' : ''
            }`}>
              {task.title}
            </h4>

            {/* Status Badges */}
            <div className={`flex flex-wrap items-center gap-1.5 ml-0 mt-0.5 md:mt-0 font-sans ${task.completed ? 'opacity-50' : ''}`}>
              {/* Priority badge */}
              <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 tracking-wider ${
                task.completed 
                  ? 'text-slate-400 bg-slate-100 border-slate-200' 
                  : getPriorityStyle(task.priority)
              }`}>
                {task.priority}
              </span>

              {/* Category Tag */}
              <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 tracking-wider flex items-center ${
                task.completed 
                  ? 'text-slate-400 bg-slate-100 border-slate-200'
                  : 'border-slate-200 text-slate-600 bg-slate-50'
              }`}>
                {getCategoryIcon(task.category)}
                <span className="ml-1">{task.category}</span>
              </span>

              {/* Task Status badge */}
              <span className={`text-[9px] font-bold uppercase border px-2 py-0.5 tracking-wider ${
                task.completed 
                  ? 'text-slate-400 bg-slate-100 border-slate-200' 
                  : getStatusBadgeStyle(taskStatus)
              }`}>
                ● {taskStatus}
              </span>

              {/* Danger Overdue label */}
              {isOverdue && !task.completed && (
                <span className="text-[9px] font-bold uppercase border border-red-200 bg-red-500 text-white px-2 py-0.5 tracking-wider">
                  Overdue
                </span>
              )}
            </div>
          </div>

          {/* Subtask progress bar */}
          {totalSubtasks > 0 && (
            <div className="mt-1 mb-2 max-w-xs w-full">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-sans mb-0.5">
                <span>Checklist</span>
                <span className="font-semibold">{completedSubtasks} / {totalSubtasks} ({Math.round((completedSubtasks / totalSubtasks) * 100)}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-1 border border-slate-200 rounded-none relative">
                <div 
                  className={`h-full transition-all duration-300 ${task.completed ? 'bg-slate-300' : 'bg-red-500'}`}
                  style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Compact Due Date line */}
          <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-tight text-slate-500 font-sans">
            <CalendarDays className={`h-3.5 w-3.5 ${isOverdue && !task.completed ? 'text-red-500' : 'text-slate-400'}`} />
            <span>Due: {formatDate(task.dueDate.toDate())}</span>
          </div>
        </div>

        {/* Standard Action items */}
        <div className="flex items-center gap-1 self-center ml-auto shrink-0 font-sans">
          {/* View Details clickable button */}
          <button
            type="button"
            onClick={() => setSelectedTaskForDetail(task)}
            className="px-2 py-1 text-[10px] md:text-[11px] font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1"
            title="Inspect full details"
          >
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">View Details</span>
          </button>

          {/* Edit Button */}
          <button
            type="button"
            onClick={() => onEditTask(task)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:border-slate-300 border border-transparent transition-colors cursor-pointer"
            title="Edit task parameters"
          >
            <Edit3 className="h-3.5 w-3.5" />
          </button>

          {/* Delete Button */}
          <button
            type="button"
            onClick={() => {
              setTaskToDelete(task);
            }}
            className="p-1.5 text-red-400 hover:text-red-600 hover:border-red-200 border border-transparent transition-colors cursor-pointer"
            title="Delete task card"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </motion.div>
    );
  };

  const quickFilters = [
    { label: 'Today', key: 'today', isActive: dueDateFilter === 'today' && selectedStatus === 'all' },
    { label: 'Overdue', key: 'overdue', isActive: dueDateFilter === 'overdue' && selectedStatus === 'all' },
    { label: 'This Week', key: 'thisWeek', isActive: dueDateFilter === 'thisWeek' && selectedStatus === 'all' },
    { label: 'Completed', key: 'completed', isActive: selectedStatus === 'Completed' },
    { label: 'High Priority', key: 'high', isActive: selectedPriority === 'high' && selectedStatus !== 'Completed' }
  ];

  const handleQuickFilterClick = (filterKey: string) => {
    if (filterKey === 'today') {
      if (dueDateFilter === 'today') {
        setDueDateFilter('all');
      } else {
        setDueDateFilter('today');
        setSelectedStatus('all');
      }
    } else if (filterKey === 'overdue') {
      if (dueDateFilter === 'overdue') {
        setDueDateFilter('all');
      } else {
        setDueDateFilter('overdue');
        setSelectedStatus('all');
      }
    } else if (filterKey === 'thisWeek') {
      if (dueDateFilter === 'thisWeek') {
        setDueDateFilter('all');
      } else {
        setDueDateFilter('thisWeek');
        setSelectedStatus('all');
      }
    } else if (filterKey === 'completed') {
      if (selectedStatus === 'Completed') {
        setSelectedStatus('all');
      } else {
        setSelectedStatus('Completed');
        setDueDateFilter('all');
      }
    } else if (filterKey === 'high') {
      if (selectedPriority === 'high') {
        setSelectedPriority('all');
      } else {
        setSelectedPriority('high');
        setSelectedStatus('all');
      }
    }
  };

  return (
    <div className="bg-white rounded-none border border-slate-200 p-5 shadow-xs space-y-6 font-sans">
      
      {/* 7-Way Multi-View Switcher Tab Strip - Simplified */}
      <div className="border-b border-slate-200 pb-3">
        <label className="block text-[11px] font-semibold text-slate-500 mb-2 font-sans tracking-tight">
          Select view orientation
        </label>
        <div className="flex flex-wrap gap-1 bg-slate-50 p-1 border border-slate-200">
          {[
            { key: 'agenda', label: '📋 Agenda' },
            { key: 'kanban', label: '🗂️ Kanban' },
            { key: 'calendar', label: '📅 Calendar' },
            { key: 'focus', label: '🎯 Focus Spot' },
            { key: 'category', label: '🏷️ Categories' },
            { key: 'project', label: '📚 Books / Projects' },
            { key: 'timeline', label: '⏳ Timeline' },
          ].map((tab) => {
            const isActive = viewKey === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setViewKey(tab.key);
                  localStorage.setItem('smarttask_guest_default_task_view', tab.key);
                  localStorage.setItem('smarttask_default_task_view', tab.key);
                }}
                className={`flex-1 min-w-[100px] text-center py-1.5 px-3 text-[11px] font-semibold tracking-tight transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? 'bg-[#1A1A1A] text-white shadow-xs font-bold' 
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Unified Search, Quick Filters & Basic Options Area */}
      <div className="space-y-4">
        {/* Search & Advanced Toggle Row (Desktop/Large Screens) */}
        <div className="hidden sm:flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              id="task-search-input"
              type="text"
              placeholder="Search by title, description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-sm outline-none focus:border-red-500 focus:bg-white transition-all text-slate-800"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen(!isAdvancedFiltersOpen)}
            className={`px-4 py-2 text-xs font-semibold border flex items-center justify-center gap-2 cursor-pointer transition-colors ${
              isAdvancedFiltersOpen || isFiltersOpen
                ? 'bg-slate-100 border-slate-300 text-slate-900' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Advanced Filters</span>
            <span className="text-[9px] opacity-75">{isAdvancedFiltersOpen || isFiltersOpen ? '▲' : '▼'}</span>
          </button>
        </div>

        {/* Search & Filter Toggles Row (Mobile Screens View) */}
        <div className="flex sm:hidden gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-xs outline-none focus:border-red-500 focus:bg-white text-slate-800"
            />
          </div>
          
          <button
            type="button"
            onClick={() => setIsAdvancedFiltersOpen(true)}
            className={`px-3 py-1.5 text-xs font-semibold border flex items-center justify-center gap-1.5 cursor-pointer transition-colors bg-white border-slate-200 text-slate-600 active:bg-slate-50`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Desktop Inline Basic Filters (Hidden on Mobile) */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-2">
          {/* Status Select Filter */}
          <div className="flex flex-col px-3 py-1.5 bg-slate-50 border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Status</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
            >
              <option value="all">Any Status</option>
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Waiting / Blocked">Blocked</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Category Select */}
          <div className="flex flex-col px-3 py-1.5 bg-slate-50 border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
            >
              <option value="all">Any Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Priority Select */}
          <div className="flex flex-col px-3 py-1.5 bg-slate-50 border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Priority Rank</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
            >
              <option value="all">Any Urgency</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>

          {/* Due date filter dropdown */}
          <div className="flex flex-col px-3 py-1.5 bg-slate-50 border border-slate-200">
            <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Due Deadline</span>
            <select
              value={dueDateFilter}
              onChange={(e) => setDueDateFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
            >
              <option value="all">Any Date</option>
              <option value="today">Due Today</option>
              <option value="thisWeek">Due This Week</option>
              <option value="overdue">Overdue Only</option>
            </select>
          </div>
        </div>

        {/* Saved Pills/Quick Filters Row (Visible on both) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono mr-1">
            Quick Filters:
          </span>
          {quickFilters.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => handleQuickFilterClick(q.key)}
              className={`px-3 py-1 text-[11px] font-medium rounded-full cursor-pointer border transition-all ${
                q.isActive 
                  ? 'bg-red-500 border-red-500 text-white font-semibold shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {q.label}
            </button>
          ))}
          {(dueDateFilter !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all' || selectedCategory !== 'all' || selectedProject !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setDueDateFilter('all');
                setSelectedStatus('all');
                setSelectedPriority('all');
                setSelectedCategory('all');
                setSelectedProject('all');
              }}
              className="ml-auto text-xs text-slate-400 hover:text-red-500 underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* Collapsible drawer for advanced filters - Desktop Only */}
        <AnimatePresence initial={false}>
          {(isAdvancedFiltersOpen || isFiltersOpen) && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="hidden sm:block overflow-hidden"
            >
              <div className="pt-3 grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-slate-50/50 p-3.5 border border-slate-200/60 mt-1">
                {/* Project Select */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200">
                  <Folder className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono leading-none mb-0.5">Project Scope</span>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-[#1A1A1A] cursor-pointer w-full p-0"
                    >
                      <option value="all">All Projects</option>
                      <option value="none">No Project Context</option>
                      {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Sort selection */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200">
                  <ArrowUpDown className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <span className="block text-[8px] font-bold text-slate-400 uppercase font-mono leading-none mb-0.5">Sort Priority</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-[#1A1A1A] cursor-pointer font-sans w-full p-0"
                    >
                      <option value="dueDateAsc">Due Date: Soonest First</option>
                      <option value="dueDateDesc">Due Date: Latest First</option>
                      <option value="priorityDesc">Priority Rank: High Focus</option>
                      <option value="createdAtDesc">Creation Index: Newest</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Bottom Sheet Modal (Only visible on Mobile screens) */}
        <AnimatePresence>
          {(isAdvancedFiltersOpen || isFiltersOpen) && (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setIsAdvancedFiltersOpen(false);
                  if (onCloseFilters) onCloseFilters();
                }}
                className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-xs"
              />
              
              {/* Slide-Up Panel Content */}
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 230 }}
                className="relative w-full bg-white rounded-t-2xl border-t border-slate-250 shadow-2xl p-5 space-y-4 max-h-[85vh] overflow-y-auto z-10 font-sans"
              >
                {/* Horizontal Drag Feedback bar */}
                <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto" />

                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-[#1A1A1A] uppercase tracking-wider font-sans">Filter Directory</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Refine visible agenda records</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvancedFiltersOpen(false);
                      if (onCloseFilters) onCloseFilters();
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-250 text-[#1a1a1a] text-[10px] font-mono font-bold uppercase select-none cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-3.5 pt-1">
                  {/* Status */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Status</span>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="all">Any Status</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Waiting / Blocked">Blocked</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>

                  {/* Category */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Category</span>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="all">Any Category</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Priority Rank</span>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="all">Any Urgency</option>
                      <option value="high">High Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="low">Low Priority</option>
                    </select>
                  </div>

                  {/* Timeline */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Due Deadline</span>
                    <select
                      value={dueDateFilter}
                      onChange={(e) => setDueDateFilter(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="all">Any Date</option>
                      <option value="today">Due Today</option>
                      <option value="thisWeek">Due This Week</option>
                      <option value="overdue">Overdue Only</option>
                    </select>
                  </div>

                  {/* Project Context */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Project Scope</span>
                    <select
                      value={selectedProject}
                      onChange={(e) => setSelectedProject(e.target.value)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="all">All Projects</option>
                      <option value="none">No Project Context</option>
                      {projects.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort Selection */}
                  <div className="flex flex-col px-3 py-2 bg-slate-50 border border-slate-200">
                    <span className="text-[9px] uppercase font-bold text-slate-400 font-mono tracking-tight leading-none mb-1">Sort Priority</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="bg-transparent border-none outline-none text-xs font-semibold text-slate-700 cursor-pointer w-full p-0"
                    >
                      <option value="dueDateAsc">Due Date: Soonest First</option>
                      <option value="dueDateDesc">Due Date: Latest First</option>
                      <option value="priorityDesc">Priority Rank: High Focus</option>
                      <option value="createdAtDesc">Creation Index: Newest</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDueDateFilter('all');
                      setSelectedStatus('all');
                      setSelectedPriority('all');
                      setSelectedCategory('all');
                      setSelectedProject('all');
                    }}
                    className="py-2.5 border border-slate-200 text-slate-500 font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer hover:bg-slate-50"
                  >
                    Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdvancedFiltersOpen(false);
                      if (onCloseFilters) onCloseFilters();
                    }}
                    className="py-2.5 bg-[#C2410C] hover:bg-[#a1350a] text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer"
                  >
                    Apply Filters
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* MATRIX RENDER CONTENT */}
      {processedTasks.length === 0 ? (
        <div className="h-[200px] bg-[#F2efe9] border border-[#1A1A1A]/10 flex flex-col justify-center items-center text-center px-4">
          <AlertCircle className="h-8 w-8 text-[#C2410C] mb-2" />
          <span className="font-serif italic text-lg text-[#1A1A1A]">No tasks match filter scope</span>
          <p className="text-slate-500 text-[11px] mt-1 max-w-sm font-light leading-normal">
            Update search parameters, or click compose above to populate your workspace registry.
          </p>
        </div>
      ) : (
        <div>
          {/* 1. AGENDA VIEW (Normal Flat List) */}
          {viewKey === 'agenda' && (
            <div className="space-y-px bg-[#1A1A1A]">
              <AnimatePresence mode="popLayout">
                {processedTasks.map((task) => renderTaskItem(task))}
              </AnimatePresence>
            </div>
          )}

          {/* 2. KANBAN BOARD VIEW */}
          {viewKey === 'kanban' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Column 1: Active Focus (High + Medium, Incomplete) */}
              <div className="border border-[#1A1A1A] bg-[#F4F3EF] p-4 flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center border-b border-[#1A1A1A]/20 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#C2410C] font-mono flex items-center gap-1">
                    ⚡ High-Gear Focus
                  </span>
                  <span className="text-xs bg-[#C2410C] text-white px-1.5 py-0.5 rounded-none font-bold font-mono">
                    {processedTasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium')).length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[480px]">
                  {processedTasks
                    .filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium'))
                    .map(t => (
                      <div key={t.id} className="bg-[#F9F8F6] p-3 border border-[#1A1A1A]/20 cursor-pointer hover:bg-[#F1EFEA]" onClick={() => setSelectedTaskForDetail(t)}>
                        <h5 className="font-serif text-sm font-semibold text-[#1A1A1A] leading-tight mb-1">{t.title}</h5>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>{t.category}</span>
                          <span className={`px-1 font-bold ${t.priority === 'high' ? 'text-red-700 bg-red-100' : 'text-amber-800 bg-amber-100'}`}>{t.priority}</span>
                        </div>
                      </div>
                    ))}
                  {processedTasks.filter(t => !t.completed && (t.priority === 'high' || t.priority === 'medium')).length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center font-serif mt-10">No pending focus elements.</p>
                  )}
                </div>
              </div>

              {/* Column 2: Scheduled Queue (Low-priority Incomplete) */}
              <div className="border border-[#1A1A1A] bg-[#F4F3EF] p-4 flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center border-b border-[#1A1A1A]/20 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600 font-mono">
                    📬 Scheduled / Low
                  </span>
                  <span className="text-xs bg-slate-600 text-white px-1.5 py-0.5 rounded-none font-bold font-mono">
                    {processedTasks.filter(t => !t.completed && t.priority === 'low').length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[480px]">
                  {processedTasks
                    .filter(t => !t.completed && t.priority === 'low')
                    .map(t => (
                      <div key={t.id} className="bg-[#F9F8F6] p-3 border border-[#1A1A1A]/20 cursor-pointer hover:bg-[#F1EFEA]" onClick={() => setSelectedTaskForDetail(t)}>
                        <h5 className="font-serif text-sm font-semibold text-[#1A1A1A] leading-tight mb-1">{t.title}</h5>
                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-500">
                          <span>{t.category} · {t.priority}</span>
                        </div>
                      </div>
                    ))}
                  {processedTasks.filter(t => !t.completed && t.priority === 'low').length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center font-serif mt-10">Backlog queue empty.</p>
                  )}
                </div>
              </div>

              {/* Column 3: Achieved Archive (Completed Tasks) */}
              <div className="border border-[#1A1A1A] bg-[#F4F3EF] p-4 flex flex-col h-full min-h-[300px]">
                <div className="flex justify-between items-center border-b border-[#1A1A1A]/20 pb-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-800 font-mono flex items-center gap-1">
                    🔬 Achieved Records
                  </span>
                  <span className="text-xs bg-emerald-800 text-white px-1.5 py-0.5 rounded-none font-bold font-mono">
                    {processedTasks.filter(t => t.completed).length}
                  </span>
                </div>
                <div className="space-y-2 flex-1 overflow-y-auto max-h-[480px]">
                  {processedTasks
                    .filter(t => t.completed)
                    .map(t => (
                      <div key={t.id} className="bg-[#F9F8F6]/60 p-3 border border-[#1A1A1A]/10 cursor-pointer hover:bg-[#F1EFEA] opacity-70" onClick={() => setSelectedTaskForDetail(t)}>
                        <h5 className="font-serif text-sm font-semibold strike text-[#1A1A1A]/70 line-through leading-tight mb-1">{t.title}</h5>
                        <span className="text-[8px] font-mono bg-emerald-50 text-emerald-800 px-1 py-0.25">COMPLETED</span>
                      </div>
                    ))}
                  {processedTasks.filter(t => t.completed).length === 0 && (
                    <p className="text-[10px] text-slate-400 italic text-center font-serif mt-10">No completed items archived.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 3. CALENDAR MONTH GRID PLANNER */}
          {viewKey === 'calendar' && (() => {
            const currentMonthDate = new Date();
            const year = currentMonthDate.getFullYear();
            const month = currentMonthDate.getMonth();
            const monthLabel = currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
            
            // Generate grid parameters
            const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sun
            const totalDays = new Date(year, month + 1, 0).getDate();
            const blankCells = Array.from({ length: firstDayIndex }, (_, i) => i);
            const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

            return (
              <div className="border border-[#1A1A1A] p-5 bg-[#F4F3EF] space-y-4">
                <div className="flex justify-between items-center border-b border-[#1A1A1A]/30 pb-2">
                  <h4 className="font-serif italic text-xl text-[#1A1A1A] font-semibold flex items-center gap-1.5">
                    <Calendar className="h-5 w-5 text-[#C2410C]" />
                    <span>Workspace Month Planner ({monthLabel})</span>
                  </h4>
                  <span className="text-[8px] font-mono font-bold opacity-60">
                    CLICK ANY TASK TO INSPECT METADATA IN-DEPTH
                  </span>
                </div>

                <div className="grid grid-cols-7 gap-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {blankCells.map((_, idx) => (
                    <div key={`blank-${idx}`} className="aspect-square bg-slate-50/10 border border-transparent" />
                  ))}
                  {daysArray.map((dayNum) => {
                    const cellDate = new Date(year, month, dayNum);
                    const matchedTasks = processedTasks.filter(t => {
                      const d = t.dueDate.toDate();
                      return d.getDate() === dayNum && d.getMonth() === month && d.getFullYear() === year;
                    });

                    return (
                      <div key={`day-${dayNum}`} className="aspect-square bg-[#F9F8F6] border border-[#1A1A1A]/20 p-1 flex flex-col justify-between overflow-hidden relative">
                        <span className="text-[10px] text-slate-800 font-mono font-bold">{dayNum}</span>
                        
                        <div className="space-y-0.5 mt-1 overflow-y-auto max-h-[30px] pr-0.5 cursor-pointer">
                          {matchedTasks.map(task => (
                            <div 
                              key={task.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedTaskForDetail(task); }}
                              className={`text-[7px] p-0.5 rounded-none truncate font-serif font-bold ${
                                task.completed 
                                  ? 'bg-slate-300 line-through text-slate-600' 
                                  : task.priority === 'high' 
                                  ? 'bg-[#C2410C] text-white' 
                                  : 'bg-[#1A1A1A] text-white'
                              }`}
                              title={task.title}
                            >
                              {task.title}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 4. FOCUS SPOT (1 Oldest Incomplete Priority and Custom Pomodoro) */}
          {viewKey === 'focus' && (() => {
            const incomplete = processedTasks.filter(t => !t.completed);
            const high = incomplete.filter(t => t.priority === 'high');
            const med = incomplete.filter(t => t.priority === 'medium');
            const focusTask = high[0] || med[0] || incomplete[0] || null;

            // Simple stable quote selector
            const quotes = [
              "No masterpiece was ever created without intense, narrow concentration. Direct your focus.",
              "Order is the sanctuary of the mind. Eliminate noise, elevate craft.",
              "Do not distribute your energies. One singular priority leads to clarity.",
              "The secret of all victory lies in the organization of the non-obvious.",
              "Simplify your interface, refine your actions, execute your duties.",
              "Quiet discipline conquers any digital chaos. Progress page by page."
            ];
            const activeQuote = quotes[new Date().getHours() % quotes.length];

            const minutes = Math.floor(timerSeconds / 60);
            const seconds = timerSeconds % 60;
            const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

            return (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Active Task Details & checklist (2 Column widths) */}
                <div className="lg:col-span-2 border border-[#1A1A1A] bg-[#F4F3EF] p-6 space-y-6 flex flex-col justify-between">
                  {focusTask ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#C2410C] font-mono">
                        <Sparkles className="h-3 w-3 animate-spin" /> ACTIVE ZONE CHRONOS SINGLE TARGET
                      </div>
                      
                      <h2 className="font-serif italic text-3xl font-bold tracking-tight text-[#1A1A1A] leading-tight-none">{focusTask.title}</h2>
                      
                      {focusTask.description && (
                        <p className="text-sm font-serif italic text-slate-600 max-w-xl font-light leading-relaxed">{focusTask.description}</p>
                      )}

                      {/* Info bar tags */}
                      <div className="flex flex-wrap gap-2 text-[10px] font-mono uppercase tracking-wide pt-1.5">
                        <span className="border border-[#1A1A1A] px-2 py-0.5 bg-white">Category: {focusTask.category}</span>
                        <span className="border border-red-900 bg-red-100 text-red-900 px-2 py-0.5 font-bold">Urgency: {focusTask.priority}</span>
                        {focusTask.project && (
                          <span className="border border-[#C2410C] text-[#C2410C] bg-[#C2410C]/5 px-2 py-0.5">Section: {focusTask.project}</span>
                        )}
                        {focusTask.estimatedTime !== undefined && (
                          <span className="border border-slate-300 bg-slate-100 px-2 py-0.5">⏱️ Budget: {focusTask.estimatedTime} hrs</span>
                        )}
                      </div>

                      {/* Subtask checklist renderer */}
                      {focusTask.subtasks && focusTask.subtasks.length > 0 ? (
                        <div className="bg-white/80 p-4 border border-[#1A1A1A]/10 space-y-2.5">
                          <span className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-wider font-sans">
                            Sub-Checklist progress tracking:
                          </span>
                          <div className="space-y-2">
                            {focusTask.subtasks.map(s => (
                              <label key={s.id} className="flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={s.completed}
                                  onChange={() => handleToggleSubtask(focusTask, s.id)}
                                  className="rounded-none border-[#1A1A1A]"
                                />
                                <span className={`text-xs font-serif ${s.completed ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>
                                  {s.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500 font-serif italic bg-white/50 p-3 border border-[#1A1A1A]/5">
                          No subtask checklist elements defined for this task. You may add some in edit format.
                        </div>
                      )}

                      {/* Interactive Save action */}
                      <div className="pt-2 font-sans flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(focusTask)}
                          className="px-4 py-2 text-xs bg-[#C2410C] hover:bg-[#A83200] text-white font-bold uppercase tracking-wider rounded-none cursor-pointer"
                        >
                          Mark completed and close
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditTask(focusTask)}
                          className="px-4 py-2 text-xs border border-[#1A1A1A] bg-transparent hover:bg-slate-100 font-bold uppercase tracking-wider rounded-none cursor-pointer"
                        >
                          Modify Parameters
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col justify-center items-center text-center p-8 space-y-2">
                      <Flame className="h-8 w-8 text-slate-300" />
                      <span className="font-serif italic text-xl text-[#1A1A1A]">No pending focal vectors</span>
                      <p className="text-xs text-slate-500 max-w-xs">All pending tasks are elegantly dispatched and achieved. Rest easy.</p>
                    </div>
                  )}

                  {/* Stable quote block citation */}
                  <div className="border-t border-[#1A1A1A]/10 pt-4 mt-6">
                    <span className="block text-[8px] font-bold tracking-widest text-[#C2410C] font-mono mb-1">
                      CITATIONS OF CLARITY STYLE & ORDER
                    </span>
                    <blockquote className="text-xs text-slate-500 italic font-serif leading-relaxed">
                      "{activeQuote}"
                    </blockquote>
                  </div>
                </div>

                {/* Pomodoro Timer segment (1 Column width) */}
                <div className="border border-[#1A1A1A] bg-[#1A1A1A] p-6 text-white flex flex-col justify-between items-center text-center min-h-[350px]">
                  <div className="space-y-1.5">
                    <span className="block text-[9px] font-bold uppercase tracking-widest text-orange-500 font-mono">
                      🍅 SYSTEM FOCUS POMODORO
                    </span>
                    <span className="text-[10px] text-white/50 font-serif italic">Maintain strict singular presence of mind</span>
                  </div>

                  {/* Huge Clock Digit representation */}
                  <div className="font-mono text-6xl md:text-7xl font-bold tracking-widest text-white border-y border-white/10 py-6 w-full my-4">
                    {timeFormatted}
                  </div>

                  {/* Control Keys */}
                  <div className="flex gap-4 items-center">
                    <button
                      type="button"
                      onClick={() => setTimerRunning(!timerRunning)}
                      className={`h-11 w-11 rounded-full flex items-center justify-center border font-bold text-xs uppercase cursor-pointer transition-transform active:scale-95 ${
                        timerRunning 
                          ? 'bg-transparent text-white border-white hover:bg-white/10' 
                          : 'bg-white text-[#1A1A1A] border-white hover:bg-slate-100'
                      }`}
                      title={timerRunning ? 'Hold workflow timer' : 'Deploy focus interval'}
                    >
                      {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setTimerRunning(false);
                        setTimerSeconds(1500);
                      }}
                      className="h-10 w-10 rounded-full border border-white/20 bg-transparent text-white flex items-center justify-center hover:bg-white/10 cursor-pointer transition-transform active:scale-95"
                      title="Reset focus clock countdown"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => playHarpChime()}
                      className="h-10 w-10 rounded-full border border-white/20 bg-transparent text-white flex items-center justify-center hover:bg-white/10 cursor-pointer transition-transform active:scale-95"
                      title="Test Audio Chimes synth"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  </div>

                  <span className="text-[9px] text-white/40 font-mono tracking-wide mt-4">
                    CHIMES SYNTH POWERED SECURELY LOCAL Offline
                  </span>
                </div>
              </div>
            );
          })()}

          {/* 5. CATEGORIES BINDER VIEW */}
          {viewKey === 'category' && (
            <div className="space-y-6">
              {categories.map((cat) => {
                const catTasks = processedTasks.filter(t => t.category === cat);
                if (catTasks.length === 0) return null;
                return (
                  <div key={cat} className="border border-[#1A1A1A] bg-[#F4F3EF] p-5 shadow-none space-y-3">
                    <div className="flex justify-between items-baseline border-b border-[#1A1A1A]/30 pb-2">
                      <h4 className="font-serif italic text-xl text-[#1A1A1A] font-semibold flex items-center gap-1.5">
                        {getCategoryIcon(cat)}
                        <span>{cat} Directory</span>
                      </h4>
                      <span className="text-[9px] uppercase font-mono tracking-wider font-bold opacity-60">
                        {catTasks.length} Registry Entries
                      </span>
                    </div>
                    <div className="space-y-px bg-[#1A1A1A]">
                      {catTasks.map((task) => renderTaskItem(task))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 6. BOOKS / PROJECTS GROUP VIEW */}
          {viewKey === 'project' && (
            <div className="space-y-6">
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

          {/* 7. CHRONOLOGICAL TIMELINE TRACKER */}
          {viewKey === 'timeline' && (() => {
            // Pre-sorted chronologically
            const sortedByTimeline = [...processedTasks].sort((a,b) => a.dueDate.toMillis() - b.dueDate.toMillis());
            return (
              <div className="border border-[#1A1A1A] p-6 bg-[#F4F3EF]">
                <div className="border-b border-[#1A1A1A]/30 pb-2.5 mb-6 flex items-center justify-between">
                  <h4 className="font-serif italic text-xl text-[#1A1A1A] font-semibold flex items-center gap-1.5">
                    <Clock className="h-5 w-5 text-[#C2410C]" /> Chronological Delivery Path
                  </h4>
                  <span className="text-[8px] font-mono font-bold uppercase text-slate-500">Chronological list alignment</span>
                </div>

                <div className="relative border-l border-[#1A1A1A] ml-2.5 pl-6 space-y-6">
                  {sortedByTimeline.map((task, idx) => {
                    const isOverdue = !task.completed && task.dueDate.toDate() < new Date();
                    return (
                      <div key={task.id} className="relative group">
                        {/* Timeline hub dot */}
                        <div className={`absolute -left-[30px] top-1.5 h-2.5 w-2.5 rounded-none border border-black ${
                          task.completed ? 'bg-emerald-800' : isOverdue ? 'bg-[#C2410C]' : 'bg-[#1A1A1A]'
                        }`} />

                        <div className="bg-[#F9F8F6] border border-[#1A1A1A]/10 p-4 transition-all hover:border-[#1A1A1A]">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                            <span className="text-[9px] font-bold font-mono text-[#C2410C]">
                              ⏱️ LINE STEP {idx + 1} · {formatDate(task.dueDate.toDate())}
                            </span>
                            <span className={`text-[8px] font-mono px-1 font-bold ${getPriorityStyle(task.priority)}`}>
                              {task.priority}
                            </span>
                          </div>

                          <h5 
                            onClick={() => setSelectedTaskForDetail(task)}
                            className={`font-serif text-base font-bold text-[#1A1A1A] hover:underline cursor-pointer ${
                              task.completed ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {task.title}
                          </h5>

                          <div className="flex justify-between items-center mt-2.5 text-[10px] font-mono text-slate-500">
                            <span>{task.category} Directory</span>
                            <button
                              type="button"
                              onClick={() => setSelectedTaskForDetail(task)}
                              className="hover:underline flex items-center gap-1 text-[#C2410C] font-bold uppercase text-[9px] cursor-pointer"
                            >
                              Inspect Details <ExternalLink className="h-2 w-2 inline" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* METAMORPHIC MULTI-DIMENSIONAL DETAILS SLIDING DRAWER DIALOGUE */}
      <AnimatePresence>
        {selectedTaskForDetail && (
          <div className="fixed inset-0 z-50 overflow-hidden font-sans">
            <div className="absolute inset-0 overflow-hidden block">
              {/* Overlay Backdrop cover */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.65 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedTaskForDetail(null)}
                className="absolute inset-0 bg-[#1A1A1A] cursor-pointer"
              />

              {/* Sliding Card Tray on Right of Screen */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex max-w-full pl-10">
                <motion.div 
                  initial={{ transform: 'translateX(100%)' }}
                  animate={{ transform: 'translateX(0%)' }}
                  exit={{ transform: 'translateX(100%)' }}
                  transition={{ type: 'spring', damping: 24, stiffness: 220 }}
                  className="pointer-events-auto w-screen max-w-md block"
                >
                  <div className="flex h-full flex-col overflow-y-scroll bg-[#F9F8F6] border-l border-[#1A1A1A] p-6 space-y-6 shadow-2xl relative">
                    
                    {/* Header Controls */}
                    <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#C2410C] font-mono tracking-widest block">
                          Document Inspector
                        </span>
                        <span className="text-xs text-slate-500 font-serif italic mt-0.5 block">
                          Unique Record ID: {selectedTaskForDetail.id}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedTaskForDetail(null)}
                        className="py-1.5 px-3 border border-[#1A1A1A] bg-[#1A1A1A] hover:bg-orange-850 hover:border-[#C2410C] text-white text-[10px] font-bold uppercase tracking-wider rounded-none cursor-pointer"
                      >
                        Dismiss Esc
                      </button>
                    </div>

                    {/* Meta Section */}
                    <div className="space-y-4 flex-1">
                      {/* Interactive completion stamp */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => onToggleComplete(selectedTaskForDetail)}
                          className={`w-6 h-6 border-2 border-[#1A1A1A] flex items-center justify-center shrink-0 cursor-pointer ${
                            selectedTaskForDetail.completed ? 'bg-[#1A1A1A]' : 'bg-white'
                          }`}
                          title="Toggle Document status state"
                        >
                          {selectedTaskForDetail.completed && (
                            <svg className="w-4 h-4 text-white stroke-current" fill="none" strokeWidth={4} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>

                        <span className={`text-xs font-bold uppercase tracking-wider font-mono ${
                          selectedTaskForDetail.completed ? 'text-emerald-800' : 'text-[#C2410C]'
                        }`}>
                          {selectedTaskForDetail.completed ? 'Achieved / Inactive' : 'Pending Action Vector'}
                        </span>
                      </div>

                      {/* Main Heading Text */}
                      <h1 className="font-serif italic text-2xl md:text-3xl font-bold tracking-tight text-[#1A1A1A] leading-tight-none break-words">
                        {selectedTaskForDetail.title}
                      </h1>

                      {/* Description Panel content */}
                      {selectedTaskForDetail.description && (
                        <div className="bg-[#EBEAE6]/40 p-4 border border-[#1A1A1A]/10 space-y-1 block">
                          <span className="block text-[8px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                            Narrative Narrative Description:
                          </span>
                          <p className="text-xs font-serif text-[#1A1A1A] leading-relaxed break-words">{selectedTaskForDetail.description}</p>
                        </div>
                      )}

                      {/* Attribute Badges */}
                      <div className="grid grid-cols-3 gap-2 pt-2">
                        <div className="p-2.5 bg-[#F4F3EF] border border-[#1A1A1A]/10 text-left">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Priority</span>
                          <span className="text-xs font-bold uppercase text-[#1A1A1A] font-sans block truncate">{selectedTaskForDetail.priority}</span>
                        </div>
                        <div className="p-2.5 bg-[#F4F3EF] border border-[#1A1A1A]/10 text-left">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Folder</span>
                          <span className="text-xs font-bold uppercase text-[#1A1A1A] font-sans flex items-center gap-0.5 block truncate">
                            {getCategoryIcon(selectedTaskForDetail.category)}
                            {selectedTaskForDetail.category}
                          </span>
                        </div>
                        <div className="p-2.5 bg-[#F4F3EF] border border-[#1A1A1A]/10 text-left">
                          <span className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest font-mono">Status</span>
                          <select
                            value={selectedTaskForDetail.status || (selectedTaskForDetail.completed ? 'Completed' : 'Not Started')}
                            onChange={async (e) => {
                              const newStatus = e.target.value;
                              const isCompleted = newStatus === 'Completed';
                              try {
                                const docRef = doc(db, 'tasks', selectedTaskForDetail.id);
                                await updateDoc(docRef, {
                                  status: newStatus,
                                  completed: isCompleted,
                                  updatedAt: serverTimestamp()
                                });
                                setSelectedTaskForDetail({ ...selectedTaskForDetail, status: newStatus, completed: isCompleted });
                              } catch (err) {
                                console.error('Drawer status update failed', err);
                              }
                            }}
                            className="bg-transparent text-xs font-bold uppercase text-[#1A1A1A] font-sans border-none outline-none cursor-pointer w-full p-0 py-0.5"
                          >
                            <option value="Not Started">Not Started</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Waiting / Blocked">Blocked</option>
                            <option value="Completed">Completed</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>
                      </div>

                      {/* Category Specific deep inspection variables */}
                      {selectedTaskForDetail.category === 'Finance' && selectedTaskForDetail.amount !== undefined && (
                        <div className="bg-[#C2410C]/5 p-4 border border-[#C2410C]/20 gap-3 grid grid-cols-1 sm:grid-cols-3">
                          <div>
                            <span className="block text-[8px] font-bold text-slate-500 uppercase font-mono">Budget</span>
                            <span className="text-xs font-bold font-serif text-[#1A1A1A]">${selectedTaskForDetail.amount.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-slate-500 uppercase font-mono">Status</span>
                            <span className="text-xs font-bold font-serif uppercase text-[#C2410C]">{selectedTaskForDetail.paymentStatus || 'pending'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-slate-500 uppercase font-mono">Recurring</span>
                            <span className="text-xs font-serif text-slate-600">{selectedTaskForDetail.recurringBill ? 'Yes (autoflow)' : 'No'}</span>
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.category === 'Health' && selectedTaskForDetail.habitType && (
                        <div className="bg-emerald-50 p-4 border border-emerald-900/10 grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[8px] font-bold text-emerald-800 uppercase font-mono">Wellness discipline</span>
                            <span className="text-xs font-bold font-serif text-slate-800">{selectedTaskForDetail.habitType}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-emerald-800 uppercase font-mono">Streak count</span>
                            <span className="text-xs font-semibold font-serif text-slate-800">{selectedTaskForDetail.streak || 0} consecutive days</span>
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.category === 'Shopping' && selectedTaskForDetail.shoppingStore && (
                        <div className="bg-sky-50 p-4 border border-sky-900/10 grid grid-cols-3 gap-3">
                          <div>
                            <span className="block text-[8px] font-bold text-sky-800 uppercase font-mono">Fulfillment Store</span>
                            <span className="text-xs font-bold font-serif text-slate-800">{selectedTaskForDetail.shoppingStore}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-sky-800 uppercase font-mono">Quantity</span>
                            <span className="text-xs font-bold font-mono text-slate-800">x{selectedTaskForDetail.shoppingQuantity || 1}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-sky-800 uppercase font-mono">Projected Cost</span>
                            <span className="text-xs font-bold font-serif text-slate-850">${(selectedTaskForDetail.shoppingCost || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.category === 'Education' && selectedTaskForDetail.subject && (
                        <div className="bg-indigo-50 p-4 border border-indigo-900/10 grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[8px] font-bold text-indigo-800 uppercase font-mono font-bold">Academic Subject</span>
                            <span className="text-xs font-bold font-serif text-slate-800">{selectedTaskForDetail.subject}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-indigo-800 uppercase font-mono font-bold">Duration of Study</span>
                            <span className="text-xs font-bold font-mono text-slate-800">{selectedTaskForDetail.studyDuration || 30} mins target</span>
                          </div>
                        </div>
                      )}

                      {selectedTaskForDetail.category === 'Work' && selectedTaskForDetail.estimatedEffort && (
                        <div className="bg-purple-50 p-4 border border-purple-900/10 grid grid-cols-2 gap-3">
                          <div>
                            <span className="block text-[8px] font-bold text-purple-800 uppercase font-mono font-bold">Core Dependency</span>
                            <span className="text-xs font-serif text-slate-850 italic truncate">{selectedTaskForDetail.dependency || 'None'}</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-purple-800 uppercase font-mono font-bold">Estimated Effort size</span>
                            <span className="text-xs font-semibold font-serif text-slate-800">{selectedTaskForDetail.estimatedEffort}</span>
                          </div>
                        </div>
                      )}

                      {/* Interactive checklist for Drawer */}
                      {selectedTaskForDetail.subtasks && selectedTaskForDetail.subtasks.length > 0 && (
                        <div className="bg-white/95 p-4 border border-[#1A1A1A] space-y-3">
                          <span className="block text-[9px] font-bold text-[#1A1A1A] uppercase tracking-wider font-sans">
                            Subtasks Checklist Completion Progress ({selectedTaskForDetail.subtasks.filter(s=>s.completed).length} / {selectedTaskForDetail.subtasks.length})
                          </span>
                          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {selectedTaskForDetail.subtasks.map(subItem => (
                              <label key={subItem.id} className="flex items-center gap-3 cursor-pointer p-1.5 hover:bg-slate-50 transition-colors text-left border-b border-[#1A1A1A]/5">
                                <input
                                  type="checkbox"
                                  checked={subItem.completed}
                                  onChange={() => handleToggleSubtask(selectedTaskForDetail, subItem.id)}
                                  className="h-4.5 w-4.5 text-[#1A1A1A] rounded-none border-[#1A1A1A]"
                                />
                                <span className={`text-xs font-serif ${subItem.completed ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>
                                  {subItem.title}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confidential Notes */}
                      {selectedTaskForDetail.notes && (
                        <div className="bg-amber-50/50 p-4 border border-amber-900/15 text-left font-serif text-xs block">
                          <span className="block text-[8px] font-bold text-amber-800 uppercase font-mono tracking-widest pl-px mb-1 text-[8px]">
                            Private Work-Notes & Credentials:
                          </span>
                          <span className="italic block leading-relaxed max-w-sm break-words pr-2 text-slate-700">{selectedTaskForDetail.notes}</span>
                        </div>
                      )}

                      {/* Attachments & References List in Drawer */}
                      {selectedTaskForDetail.attachments && selectedTaskForDetail.attachments.length > 0 && (
                        <div className="bg-white p-4 border border-[#1A1A1A] space-y-2 text-left">
                          <span className="block text-[9px] font-bold text-[#1A1A1A] uppercase tracking-wider font-sans">
                            📎 Associated References ({selectedTaskForDetail.attachments.length})
                          </span>
                          <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {selectedTaskForDetail.attachments.map((att: any) => (
                              <div key={att.id} className="flex items-center justify-between text-xs p-1.5 bg-slate-50 border border-slate-300/30">
                                <div className="flex items-center gap-2 truncate">
                                  <span className="text-[8px] font-mono font-bold uppercase px-1 py-0.5 bg-slate-200 text-slate-600">
                                    {att.type}
                                  </span>
                                  <AttachmentLink att={att} />
                                </div>
                                <span className="text-[10px] text-slate-400 font-mono">Resource</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Deadline metadata */}
                      <div className="space-y-1 pt-2 font-mono text-[10px] text-slate-600 block text-left">
                        <span className="block font-bold">📍 Deadline Target: {formatDate(selectedTaskForDetail.dueDate.toDate())}</span>
                        {selectedTaskForDetail.reminderTime && (
                          <span className="block text-[#C2410C] font-bold">🔔 Reminder Alert Hook: {formatDate(selectedTaskForDetail.reminderTime.toDate())}</span>
                        )}
                        {selectedTaskForDetail.recurrence && selectedTaskForDetail.recurrence.frequency !== 'none' && (
                          <span className="block text-amber-800 font-semibold">🔄 Custom Recurrence: {selectedTaskForDetail.recurrence.frequency}</span>
                        )}
                      </div>
                    </div>

                    {/* Operational Controls Footer in drawer */}
                    <div className="border-t border-[#1A1A1A] pt-4 flex gap-2 font-sans shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const t = selectedTaskForDetail;
                          setSelectedTaskForDetail(null);
                          onEditTask(t);
                        }}
                        className="flex-1 py-3 text-center bg-transparent hover:bg-slate-100 border border-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer"
                      >
                        Edit Parameters
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTaskToDelete(selectedTaskForDetail);
                        }}
                        className="flex-1 py-3 text-center bg-rose-600 border border-rose-600 hover:bg-rose-700 hover:border-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer"
                      >
                        Trash Document
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {taskToDelete && (
          <div 
            id="delete-confirmation-overlay"
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              id="delete-confirmation-modal"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-md bg-white border-4 border-[#1A1A1A] p-6 shadow-2xl rounded-none relative text-[#1A1A1A]"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-[#C2410C]/5 border-2 border-[#C2410C] text-[#C2410C] shrink-0 rounded-none">
                  <AlertCircle className="h-6 w-6 animate-pulse" />
                </div>
                <div>
                  <h3 
                    id="delete-confirmation-title"
                    className="font-serif italic text-xl font-bold uppercase tracking-tight text-[#1A1A1A]"
                  >
                    Confirm Deletion
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    ID: {taskToDelete.id}
                  </p>
                </div>
              </div>

              <div className="mb-6 font-sans text-sm text-[#1A1A1A] leading-relaxed">
                <p>
                  Are you absolutely certain you want to terminally delete this task:
                </p>
                <div className="my-3 px-3 py-2 border border-slate-300 bg-slate-50 font-serif italic font-semibold text-base text-[#1a1a1a]">
                  "{taskToDelete.title}"
                </div>
                <p className="text-xs text-[#C2410C] font-semibold flex items-center gap-1.5 mt-2">
                  <span>⚠️</span> Warning: This dynamic document record will be permanently purged from the cloud environment.
                </p>
              </div>

              <div className="flex gap-3 justify-end font-sans">
                <button
                  type="button"
                  id="delete-cancel-btn"
                  onClick={() => setTaskToDelete(null)}
                  className="px-4 py-2 bg-transparent hover:bg-slate-50 border border-[#1A1A1A] text-[#1A1A1A] text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                >
                  Dismiss / Cancel
                </button>
                <button
                  type="button"
                  id="delete-confirm-btn"
                  onClick={async () => {
                    const id = taskToDelete.id;
                    setTaskToDelete(null);
                    if (selectedTaskForDetail && selectedTaskForDetail.id === id) {
                      setSelectedTaskForDetail(null);
                    }
                    await onDeleteTask(id);
                  }}
                  className="px-4 py-2 bg-[#C2410C] hover:bg-[#A1330A] border-2 border-[#1A1A1A]/0 text-white text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer transition-colors"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
