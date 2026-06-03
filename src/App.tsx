import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  auth, db, logoutUser, handleFirestoreError 
} from './firebase';
import { 
  onAuthStateChanged, User 
} from 'firebase/auth';
import { 
  collection, query, where, addDoc, updateDoc, doc, deleteDoc, onSnapshot, serverTimestamp, getDocs, Timestamp 
} from 'firebase/firestore';
import { Task, Priority, Category, OperationType, RecurrenceSettings } from './types';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import SupportPage from './components/SupportPage';
import SettingsPage from './components/SettingsPage';
import { 
  CheckSquare, LogOut, Plus, Sparkles, RefreshCw, User as UserIcon, BellRing, Settings, CalendarRange, Clock, AlertCircle, X
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authStateLoaded, setAuthStateLoaded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Computed helper for unique database projects
  const existingProjects = useMemo(() => {
    const list = tasks
      .map(t => t.project)
      .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    return Array.from(new Set(list)).sort();
  }, [tasks]);

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Active filters and views
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [currentView, setCurrentView] = useState<'agenda' | 'support' | 'settings'>('agenda');

  // Application alert banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active theme state
  const [theme, setTheme] = useState<string>(() => {
    return localStorage.getItem('smarttask_theme') || 'editorial';
  });

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const savedTheme = localStorage.getItem('smarttask_theme') || 'editorial';
      setTheme(savedTheme);
    };
    window.addEventListener('smarttask_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('smarttask_settings_updated', handleSettingsUpdate);
  }, []);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 1. Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthStateLoaded(true);
      if (!currentUser) {
        setTasks([]);
        setTasksLoaded(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Load tasks in real-time if user is authenticated
  useEffect(() => {
    if (!user) return;

    setTasksLoaded(false);
    const path = 'tasks';
    const q = query(
      collection(db, path), 
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      q, 
      (snapshot) => {
        const loadedTasks: Task[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          loadedTasks.push({
            id: doc.id,
            userId: data.userId,
            title: data.title,
            description: data.description,
            priority: data.priority,
            category: data.category,
            completed: data.completed,
            dueDate: data.dueDate,
            reminderTime: data.reminderTime,
            recurrence: data.recurrence || null,
            project: data.project || null,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        });
        setTasks(loadedTasks);
        setTasksLoaded(true);
      },
      (error) => {
        // Must use handleFirestoreError callback
        handleFirestoreError(error, OperationType.GET, path);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Handle Logout
  const handleSignOut = async () => {
    try {
      await logoutUser();
      triggerToast('Signed out successfully.');
    } catch (err: any) {
      triggerToast(err.message || 'Logout failed', 'error');
    }
  };

  // Create or Update task handler
  const handleSaveTask = async (data: {
    title: string;
    description: string | undefined;
    priority: Priority;
    category: Category;
    dueDate: Timestamp;
    reminderTime: Timestamp | null;
    recurrence?: RecurrenceSettings | null;
    project?: string | null;
  }) => {
    if (!user) return;

    const path = 'tasks';
    try {
      if (taskToEdit) {
        // UPDATE action (Requires full state to pass rule validation helper)
        const docRef = doc(db, path, taskToEdit.id);
        const updatePayload: any = {
          userId: user.uid,
          title: data.title,
          priority: data.priority,
          category: data.category,
          completed: taskToEdit.completed, // retain completion status
          dueDate: data.dueDate,
          createdAt: taskToEdit.createdAt, // retain creation timestamp (immutable)
          updatedAt: serverTimestamp(), // update field validated via rules
        };

        if (data.description !== undefined) {
          updatePayload.description = data.description;
        }
        if (data.reminderTime !== null) {
          updatePayload.reminderTime = data.reminderTime;
        }
        if (data.recurrence !== undefined) {
          updatePayload.recurrence = data.recurrence;
        }
        if (data.project !== undefined) {
          updatePayload.project = data.project;
        }

        await updateDoc(docRef, updatePayload);
        triggerToast('Task document successfully updated.');
      } else {
        // CREATE action
        const collRef = collection(db, path);
        const createPayload: any = {
          userId: user.uid,
          title: data.title,
          priority: data.priority,
          category: data.category,
          completed: false, // default new task to incomplete
          dueDate: data.dueDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (data.description !== undefined) {
          createPayload.description = data.description;
        }
        if (data.reminderTime !== null) {
          createPayload.reminderTime = data.reminderTime;
        }
        if (data.recurrence !== undefined) {
          createPayload.recurrence = data.recurrence;
        }
        if (data.project !== undefined) {
          createPayload.project = data.project;
        }

        await addDoc(collRef, createPayload);
        triggerToast('New priority task successfully registered.');
      }
      setIsFormOpen(false);
      setTaskToEdit(null);
    } catch (error: any) {
      handleFirestoreError(error, taskToEdit ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  // Toggle task completion status
  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    const path = 'tasks';
    const nextCompletedState = !task.completed;
    
    try {
      const docRef = doc(db, path, task.id);
      
      const payload: any = {
        userId: user.uid,
        title: task.title,
        priority: task.priority,
        category: task.category,
        completed: nextCompletedState,
        dueDate: task.dueDate,
        createdAt: task.createdAt, // retain immutable fields
        updatedAt: serverTimestamp(),
      };

      if (task.description !== undefined) {
        payload.description = task.description;
      }
      if (task.reminderTime !== undefined && task.reminderTime !== null) {
        payload.reminderTime = task.reminderTime;
      }
      if (task.recurrence !== undefined && task.recurrence !== null) {
        payload.recurrence = task.recurrence;
      }
      if (task.project !== undefined && task.project !== null) {
        payload.project = task.project;
      }

      await updateDoc(docRef, payload);

      // Auto-create next recurring instance if marking as completed
      if (nextCompletedState && task.recurrence && task.recurrence.frequency !== 'none') {
        const currentDue = task.dueDate.toDate();
        const nextDue = new Date(currentDue);
        const freq = task.recurrence.frequency;

        if (freq === 'daily') {
          nextDue.setDate(nextDue.getDate() + 1);
        } else if (freq === 'weekly') {
          nextDue.setDate(nextDue.getDate() + 7);
        } else if (freq === 'monthly') {
          nextDue.setMonth(nextDue.getMonth() + 1);
        } else if (freq === 'custom') {
          const interval = task.recurrence.interval || 1;
          const unit = task.recurrence.unit || 'days';
          if (unit === 'days') {
            nextDue.setDate(nextDue.getDate() + interval);
          } else if (unit === 'weeks') {
            nextDue.setDate(nextDue.getDate() + interval * 7);
          } else if (unit === 'months') {
            nextDue.setMonth(nextDue.getMonth() + interval);
          }
        }

        const timeShiftMs = nextDue.getTime() - currentDue.getTime();
        let nextReminder: Timestamp | null = null;
        if (task.reminderTime) {
          const nextReminderDate = new Date(task.reminderTime.toDate().getTime() + timeShiftMs);
          nextReminder = Timestamp.fromDate(nextReminderDate);
        }

        const collRef = collection(db, path);
        const nextTaskPayload: any = {
          userId: user.uid,
          title: task.title,
          priority: task.priority,
          category: task.category,
          completed: false, // next instance starts as incomplete
          dueDate: Timestamp.fromDate(nextDue),
          recurrence: task.recurrence, // pass along the recurrence settings for the next instance
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (task.description !== undefined) {
          nextTaskPayload.description = task.description;
        }
        if (nextReminder !== null) {
          nextTaskPayload.reminderTime = nextReminder;
        }
        if (task.project !== undefined && task.project !== null) {
          nextTaskPayload.project = task.project;
        }

        await addDoc(collRef, nextTaskPayload);
        triggerToast('Task completed! Custom next scheduled instance created.');
      } else {
        triggerToast(task.completed ? 'Task marked as pending.' : 'Congratulations! Task fully completed.');
      }
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  // Delete task 
  const handleDeleteTask = async (taskId: string) => {
    const path = 'tasks';
    try {
      const docRef = doc(db, path, taskId);
      await deleteDoc(docRef);
      triggerToast('Task document permanently deleted.');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const handleEditInit = (task: Task) => {
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  if (!authStateLoaded) {
    return (
      <div className={`theme-${theme} min-h-screen bg-[#F9F8F6] flex flex-col justify-center items-center font-sans transition-colors duration-300`}>
        <RefreshCw className="h-10 w-10 text-[#C2410C] animate-spin mb-4" />
        <span className="text-[#1A1A1A] text-xs font-bold tracking-[0.2em] uppercase">Syncing Desk Files...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthPage onAuthSuccess={() => triggerToast('Successfully authenticated with Google login.')} />;
  }

  // Active alarms finder (tasks due today that have reminders set)
  const todayAlarms = tasks.filter(t => {
    if (t.completed || !t.reminderTime) return false;
    const alertTime = t.reminderTime.toDate();
    const threshold = new Date();
    threshold.setHours(24, 0, 0, 0); // up to end of today
    return alertTime <= threshold && alertTime >= new Date();
  });

  const formattedDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });

  return (
    <div className={`theme-${theme} min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-[#C2410C]/25 pb-16 transition-colors duration-300`}>
      {/* Dynamic Alert Banner */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed bottom-4 right-4 z-55 w-full max-w-sm px-4"
          >
            <div className={`p-4 rounded-none border-2 border-[#1A1A1A] bg-white flex gap-3 items-center justify-between shadow-sm ${
              toast.type === 'error' 
                ? 'border-rose-600 text-rose-950' 
                : 'border-[#1A1A1A] text-[#1A1A1A]'
            }`}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 shrink-0 text-[#C2410C]" />
                <span className="text-xs font-bold uppercase tracking-wider">{toast.message}</span>
              </div>
              <button onClick={() => setToast(null)} className="text-[#1A1A1A]/70 hover:text-[#1A1A1A] cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-6xl mx-auto px-6 md:px-12 py-12 flex flex-col min-h-screen">
        {/* Global Interactive Header */}
        <header className="flex flex-col md:flex-row justify-between items-baseline border-b border-[#1A1A1A] pb-6 mb-8 gap-4 w-full">
          <div onClick={() => setCurrentView('agenda')} className="cursor-pointer select-none group">
            <h1 className="text-xs tracking-[0.3em] font-bold uppercase mb-2 text-[#C2410C] group-hover:text-[#1A1A1A] transition-colors font-sans">The Daily Standard</h1>
            <div className="text-6xl md:text-7xl font-serif italic leading-none font-semibold group-hover:opacity-85 transition-opacity">SmartTask</div>
          </div>
          
          <div className="flex flex-col md:text-right items-start md:items-end gap-2 w-full md:w-auto">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">Editor Desk</p>
              <p className="text-xl font-serif tracking-tight">{user.displayName || 'Contributor'}</p>
              <p className="text-xs font-mono opacity-50">{user.email}</p>
            </div>
            
            <div className="flex items-center gap-3 mt-1">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Avatar" 
                  referrerPolicy="no-referrer"
                  className="h-8 w-8 rounded-none border border-[#1A1A1A]"
                />
              ) : (
                <div className="h-8 w-8 bg-white border border-[#1A1A1A] flex items-center justify-center text-slate-500 font-bold">
                  <UserIcon className="h-4 w-4 text-[#1A1A1A]" />
                </div>
              )}
              
              <button
                id="header-logout-btn"
                onClick={handleSignOut}
                className="px-2.5 py-1.5 border border-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                title="Log out of application"
              >
                Exit Desk
              </button>
            </div>
          </div>
        </header>

        {/* Main Grid Workspace Area */}
        <main className="flex-1 space-y-8">
          
          {/* Alerts for reminders of the day */}
          {currentView === 'agenda' && todayAlarms.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-2 border-[#C2410C] bg-[#C2410C]/5 p-5 rounded-none flex items-start gap-4 mb-8"
            >
              <div className="p-1 px-2.5 bg-[#C2410C] text-white text-[10px] uppercase font-mono font-bold shrink-0">
                Alarm Bulletin:
              </div>
              <div className="flex-1 text-xs text-slate-800 font-serif leading-relaxed">
                You have <span className="font-bold text-[#C2410C]">{todayAlarms.length} task{todayAlarms.length > 1 ? 's' : ''}</span> with upcoming alert deadlines mapped for execution today. Continue steady review.
              </div>
            </motion.div>
          )}

          {/* Loading Indicator for Firestore data */}
          {!tasksLoaded ? (
            <div className="h-[300px] flex flex-col justify-center items-center bg-[#F9F8F6] border border-[#1A1A1A]">
              <RefreshCw className="h-8 w-8 text-[#C2410C] animate-spin" />
              <span className="text-[#1A1A1A] text-xs mt-3 uppercase font-bold tracking-widest">Syncing Dispatch Desk Records...</span>
            </div>
          ) : currentView === 'support' ? (
            <SupportPage 
              onBack={() => setCurrentView('agenda')} 
              triggerToast={triggerToast} 
              userEmail={user.email || ''} 
            />
          ) : currentView === 'settings' ? (
            <SettingsPage 
              onBack={() => setCurrentView('agenda')} 
              triggerToast={triggerToast} 
              tasks={tasks}
              user={user}
            />
          ) : (
            <div className="space-y-8">
              {/* Dashboard counters */}
              <Dashboard 
                tasks={tasks} 
                activeTab={activeTab}
                onSelectTab={(tab) => setActiveTab(tab)} 
              />

              {/* Structured Table and Task items */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-baseline border-b border-[#1A1A1A] pb-4 gap-4">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-serif italic text-4xl text-[#1A1A1A]">
                      {activeTab === 'all' ? 'The Agenda' : `${activeTab} Assignments`}
                    </h3>
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 italic">
                      // Sorted by Priority
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-60 font-mono">
                      {tasks.length} task{tasks.length !== 1 ? 's' : ''} filed
                    </span>
                    <button
                      id="header-create-task-btn"
                      onClick={() => {
                        setTaskToEdit(null);
                        setIsFormOpen(true);
                      }}
                      className="border-2 border-[#1A1A1A] bg-transparent text-[#1A1A1A] px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-[#1A1A1A] hover:text-white transition-all duration-200 cursor-pointer"
                    >
                      Compose New Task
                    </button>
                  </div>
                </div>

                <TaskList
                  tasks={tasks}
                  activeTab={activeTab}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={handleEditInit}
                  onDeleteTask={handleDeleteTask}
                />
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 flex flex-col sm:flex-row justify-between items-center text-[10px] uppercase tracking-[0.2em] font-bold border-t border-[#1A1A1A] pt-6 gap-4 text-slate-600/70 font-mono">
          <span>SmartTask Version 4.02 // Edition {new Date().getFullYear()}</span>
          <span>Encrypted dispatch channel workspace</span>
          <div className="flex gap-4">
            <span 
              className={`hover:underline cursor-pointer transition-colors ${currentView === 'support' ? 'text-[#C2410C] underline font-bold' : ''}`}
              onClick={() => setCurrentView('support')}
            >
              Support
            </span>
            <span 
              className={`hover:underline cursor-pointer transition-colors ${currentView === 'settings' ? 'text-[#C2410C] underline font-bold' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              Settings
            </span>
            <span className="hover:underline cursor-pointer" onClick={handleSignOut}>Exit Desk</span>
          </div>
        </footer>
      </div>

      {/* Task Drawer/Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TaskForm
            taskToEdit={taskToEdit}
            existingProjects={existingProjects}
            onSave={handleSaveTask}
            onClose={() => {
              setIsFormOpen(false);
              setTaskToEdit(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
