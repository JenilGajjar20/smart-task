import React, { useState, useEffect, useMemo, useRef } from 'react';
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
import { Task, Priority, Category, OperationType, RecurrenceSettings, CustomCategory } from './types';
import { DEFAULT_CATEGORIES } from './utils/categories';
import AuthPage from './components/AuthPage';
import AuthModal from './components/AuthModal';
import Dashboard from './components/Dashboard';
import TaskList from './components/TaskList';
import TaskForm from './components/TaskForm';
import SupportPage from './components/SupportPage';
import SettingsPage from './components/SettingsPage';
import GuidePage from './components/GuidePage';
import { 
  CheckSquare, LogOut, Plus, Sparkles, RefreshCw, User as UserIcon, BellRing, Settings, CalendarRange, Clock, AlertCircle, X, BookOpen, Search, SlidersHorizontal
} from 'lucide-react';

const GUEST_TASKS: Task[] = [
  {
    id: 'guest_t1',
    userId: 'guest',
    title: 'Review System Dispatch Log coordinates',
    description: 'Verify system alignments and update dispatch records for the primary physical workspace.',
    priority: 'high',
    category: 'Work',
    completed: false,
    dueDate: Timestamp.fromDate(new Date()),
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  },
  {
    id: 'guest_t2',
    userId: 'guest',
    title: 'Configure domestic garden irrigation pipeline',
    description: 'Set custom intervals for backyard sprinkler zones. An elegant template of personal and household tasks.',
    priority: 'medium',
    category: 'Personal',
    completed: false,
    dueDate: Timestamp.fromDate(new Date(Date.now() + 86400000)), // tomorrow
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  },
  {
    id: 'guest_t3',
    userId: 'guest',
    title: 'Complete chapter draft for research paper',
    description: 'Prepare materials and edit literature citations for the upcoming academic seminar docket.',
    priority: 'high',
    category: 'Education',
    completed: true,
    dueDate: Timestamp.fromDate(new Date(Date.now() - 43200000)), // 12 hours ago
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  },
  {
    id: 'guest_t4',
    userId: 'guest',
    title: 'Register digital assets and portfolio metadata',
    description: 'Organize design systems, content calendars, and reference mockups inside the draft files repository.',
    priority: 'low',
    category: 'Shopping',
    completed: false,
    dueDate: Timestamp.fromDate(new Date(Date.now() + 172800000)), // 2 days from now
    createdAt: Timestamp.fromDate(new Date()),
    updatedAt: Timestamp.fromDate(new Date()),
  }
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authStateLoaded, setAuthStateLoaded] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksLoaded, setTasksLoaded] = useState(false);

  // Computed helper for unique database projects
  const existingProjects = useMemo(() => {
    const list = tasks
      .map(t => t.project)
      .filter((p): p is string => typeof p === 'string' && p.trim() !== '');
    return Array.from(new Set(list)).sort();
  }, [tasks]);

  // Lock toggles to prevent duplicate execution & race conditions
  const [activeToggles, setActiveToggles] = useState<Record<string, boolean>>({});
  const togglingTaskIds = useRef<Set<string>>(new Set());

  // Modal form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Active filters and views
  const [activeTab, setActiveTab ] = useState<'all' | 'pending' | 'completed' | 'overdue'>('all');
  const [currentView, setCurrentView] = useState<'agenda' | 'support' | 'settings' | 'guide' | 'insights'>('agenda');
  const [viewKey, setViewKey] = useState<string>(() => {
    return localStorage.getItem('smarttask_guest_default_task_view') || 
           localStorage.getItem('smarttask_default_task_view') || 
           'agenda';
  });
  const [searchQueryGlobal, setSearchQueryGlobal] = useState('');
  const [isGlobalFilterOpen, setIsGlobalFilterOpen] = useState(false);
  const [isHelpMenuOpen, setIsHelpMenuOpen] = useState(false);

  // Application alert banner
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Active theme state
  const [theme, setTheme] = useState<string>('editorial');

  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // Active custom user profile fields
  const [profileNickname, setProfileNickname] = useState<string>('');
  const [profileRole, setProfileRole] = useState<string>('Workspace Coordinator');
  const [profileStation, setProfileStation] = useState<string>('Primary Hub No. 1');

  // Personalization settings
  const [workspaceName, setWorkspaceName] = useState<string>('SmartTask');
  const [workspaceAvatar, setWorkspaceAvatar] = useState<string>('📝');
  const [defaultTaskView, setDefaultTaskView] = useState<string>('agenda');
  const [defaultReminderTime, setDefaultReminderTime] = useState<number>(60);
  const [layoutMode, setLayoutMode] = useState<'compact' | 'spacious'>('spacious');
  const [fontSize, setFontSize] = useState<'small' | 'default' | 'large'>('default');

  // Custom categories state and persist logic
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);

  useEffect(() => {
    const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask_guest';
    const saved = localStorage.getItem(`${baseKey}_custom_categories`);
    if (saved) {
      try {
        setCustomCategories(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    } else {
      setCustomCategories([]);
    }
  }, [user]);

  const handleSaveCustomCategories = (newCategories: CustomCategory[]) => {
    const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask_guest';
    localStorage.setItem(`${baseKey}_custom_categories`, JSON.stringify(newCategories));
    setCustomCategories(newCategories);
  };

  const handleUpdateTaskCategory = async (oldCat: string, newCat: string) => {
    if (user) {
      try {
        const affected = tasks.filter(t => t.category === oldCat);
        for (const task of affected) {
          const taskRef = doc(db, 'tasks', task.id);
          await updateDoc(taskRef, { category: newCat, updatedAt: serverTimestamp() });
        }
        triggerToast?.(`Moved ${affected.length} task(s) to ${newCat}`, 'success');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, 'tasks');
        triggerToast?.('Failed to reallocate tasks', 'error');
      }
    } else {
      const updated = tasks.map(t => t.category === oldCat ? { ...t, category: newCat } : t);
      setTasks(updated);
      const affectedCount = tasks.filter(t => t.category === oldCat).length;
      triggerToast?.(`Moved ${affectedCount} task(s) to ${newCat}`, 'success');
    }
  };

  // 1. Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthStateLoaded(true);
      if (!currentUser) {
        setTasks(GUEST_TASKS);
        setTasksLoaded(true);
        // Reset properties to guest fallbacks
        const baseKey = 'smarttask_guest';
        setTheme(localStorage.getItem(`${baseKey}_theme`) || 'editorial');
        setDarkMode(localStorage.getItem(`${baseKey}_dark_mode`) === 'true');
        setProfileNickname('Guest Contributor');
        setProfileRole('Workspace Observer');
        setProfileStation('Public Reading Desk');
        setWorkspaceName(localStorage.getItem(`${baseKey}_workspace_name`) || 'SmartTask');
        setWorkspaceAvatar(localStorage.getItem(`${baseKey}_workspace_avatar`) || '📝');
        setDefaultTaskView(localStorage.getItem(`${baseKey}_default_task_view`) || 'agenda');
        setDefaultReminderTime(Number(localStorage.getItem(`${baseKey}_default_reminder_time`)) || 60);
        setLayoutMode((localStorage.getItem(`${baseKey}_layout_mode`) as 'compact' | 'spacious') || 'spacious');
        setFontSize((localStorage.getItem(`${baseKey}_font_size`) as 'small' | 'default' | 'large') || 'default');
      }
    });
    return () => unsubscribe();
  }, []);

  // 1b. Load and sync settings for the active user in real-time
  useEffect(() => {
    if (!user) return;

    const baseKey = `smarttask_user_${user.uid}`;
    
    // Load local cache immediately for zero-lag UI feedback
    const cachedTheme = localStorage.getItem(`${baseKey}_theme`) || 'editorial';
    const cachedDarkMode = localStorage.getItem(`${baseKey}_dark_mode`) === 'true';
    
    const cachedNicknameItem = localStorage.getItem(`${baseKey}_profile_nickname`);
    const cachedNickname = cachedNicknameItem !== null ? cachedNicknameItem : (user.displayName || '');
    
    const cachedRoleItem = localStorage.getItem(`${baseKey}_profile_role`);
    const cachedRole = cachedRoleItem !== null ? cachedRoleItem : 'Workspace Coordinator';
    
    const cachedStationItem = localStorage.getItem(`${baseKey}_profile_station`);
    const cachedStation = cachedStationItem !== null ? cachedStationItem : 'Primary Hub No. 1';
    
    const cachedWorkspaceName = localStorage.getItem(`${baseKey}_workspace_name`) || 'SmartTask';
    const cachedWorkspaceAvatar = localStorage.getItem(`${baseKey}_workspace_avatar`) || '📝';
    const cachedDefaultTaskView = localStorage.getItem(`${baseKey}_default_task_view`) || 'agenda';
    const cachedDefaultReminderTime = Number(localStorage.getItem(`${baseKey}_default_reminder_time`)) || 60;
    const cachedLayoutMode = (localStorage.getItem(`${baseKey}_layout_mode`) as 'compact' | 'spacious') || 'spacious';
    const cachedFontSize = (localStorage.getItem(`${baseKey}_font_size`) as 'small' | 'default' | 'large') || 'default';

    setTheme(cachedTheme);
    setDarkMode(cachedDarkMode);
    setProfileNickname(cachedNickname);
    setProfileRole(cachedRole);
    setProfileStation(cachedStation);
    setWorkspaceName(cachedWorkspaceName);
    setWorkspaceAvatar(cachedWorkspaceAvatar);
    setDefaultTaskView(cachedDefaultTaskView);
    setDefaultReminderTime(cachedDefaultReminderTime);
    setLayoutMode(cachedLayoutMode);
    setFontSize(cachedFontSize);

    // Read synced settings securely in real-time from Firestore setting doc
    const unsubscribe = onSnapshot(
      doc(db, 'settings', user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.theme) {
            setTheme(data.theme);
            localStorage.setItem(`${baseKey}_theme`, data.theme);
          }
          if (data.darkMode !== undefined) {
            setDarkMode(data.darkMode);
            localStorage.setItem(`${baseKey}_dark_mode`, String(data.darkMode));
          }
          if (data.profileNickname !== undefined) {
            setProfileNickname(data.profileNickname);
            localStorage.setItem(`${baseKey}_profile_nickname`, data.profileNickname);
          }
          if (data.profileRole !== undefined) {
            setProfileRole(data.profileRole);
            localStorage.setItem(`${baseKey}_profile_role`, data.profileRole);
          }
          if (data.profileStation !== undefined) {
            setProfileStation(data.profileStation);
            localStorage.setItem(`${baseKey}_profile_station`, data.profileStation);
          }
          // Sync new fields
          if (data.workspaceName !== undefined) {
            setWorkspaceName(data.workspaceName);
            localStorage.setItem(`${baseKey}_workspace_name`, data.workspaceName);
          }
          if (data.workspaceAvatar !== undefined) {
            setWorkspaceAvatar(data.workspaceAvatar);
            localStorage.setItem(`${baseKey}_workspace_avatar`, data.workspaceAvatar);
          }
          if (data.defaultTaskView !== undefined) {
            setDefaultTaskView(data.defaultTaskView);
            localStorage.setItem(`${baseKey}_default_task_view`, data.defaultTaskView);
          }
          if (data.defaultReminderTime !== undefined) {
            setDefaultReminderTime(Number(data.defaultReminderTime));
            localStorage.setItem(`${baseKey}_default_reminder_time`, String(data.defaultReminderTime));
          }
          if (data.layoutMode !== undefined) {
            setLayoutMode(data.layoutMode);
            localStorage.setItem(`${baseKey}_layout_mode`, data.layoutMode);
          }
          if (data.fontSize !== undefined) {
            setFontSize(data.fontSize);
            localStorage.setItem(`${baseKey}_font_size`, data.fontSize);
          }
        }
      },
      (err) => {
        console.warn('Real-time settings synchronization: offline/skipped.', err);
      }
    );

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      const baseKey = user ? `smarttask_user_${user.uid}` : 'smarttask_guest';
      setTheme(localStorage.getItem(`${baseKey}_theme`) || 'editorial');
      setDarkMode(localStorage.getItem(`${baseKey}_dark_mode`) === 'true');
      
      const nicknameVal = localStorage.getItem(`${baseKey}_profile_nickname`);
      setProfileNickname(nicknameVal !== null ? nicknameVal : (user ? '' : 'Guest Contributor'));
      
      const roleVal = localStorage.getItem(`${baseKey}_profile_role`);
      setProfileRole(roleVal !== null ? roleVal : (user ? 'Workspace Coordinator' : 'Workspace Observer'));
      
      const stationVal = localStorage.getItem(`${baseKey}_profile_station`);
      setProfileStation(stationVal !== null ? stationVal : (user ? 'Primary Hub No. 1' : 'Public Reading Desk'));
      
      setWorkspaceName(localStorage.getItem(`${baseKey}_workspace_name`) || 'SmartTask');
      setWorkspaceAvatar(localStorage.getItem(`${baseKey}_workspace_avatar`) || '📝');
      setDefaultTaskView(localStorage.getItem(`${baseKey}_default_task_view`) || 'agenda');
      setDefaultReminderTime(Number(localStorage.getItem(`${baseKey}_default_reminder_time`)) || 60);
      setLayoutMode((localStorage.getItem(`${baseKey}_layout_mode`) as 'compact' | 'spacious') || 'spacious');
      setFontSize((localStorage.getItem(`${baseKey}_font_size`) as 'small' | 'default' | 'large') || 'default');
    };
    window.addEventListener('smarttask_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('smarttask_settings_updated', handleSettingsUpdate);
  }, [user]);

  // 1c. Support address-able URLs for guide and help
  useEffect(() => {
    const handleUrlRouting = () => {
      const hash = window.location.hash;
      if (hash === '#guide' || hash === '#help') {
        setCurrentView('guide');
      } else if (hash === '#support') {
        setCurrentView('support');
      } else if (hash === '#settings') {
        setCurrentView('settings');
      } else if (hash === '#insights') {
        setCurrentView('insights');
      } else {
        setCurrentView('agenda');
      }
    };
    
    // Run on initial mount
    handleUrlRouting();
    
    // Listen for hash variations
    window.addEventListener('hashchange', handleUrlRouting);
    return () => window.removeEventListener('hashchange', handleUrlRouting);
  }, []);

  // Update hash when currentView changes to preserve browser history/navigation expectations
  useEffect(() => {
    try {
      if (currentView === 'agenda') {
        if (window.location.hash && window.location.hash !== '') {
          window.history.pushState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        window.location.hash = currentView;
      }
    } catch (e) {
      console.warn('URL hash update failed: ', e);
    }
  }, [currentView]);

  const triggerToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // 2. Load tasks in real-time if user is authenticated
  useEffect(() => {
    if (!user) {
      setTasks(GUEST_TASKS);
      setTasksLoaded(true);
      return;
    }

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
            status: data.status,
            attachments: data.attachments || [],
            subtasks: data.subtasks || [],
            estimatedTime: data.estimatedTime,
            notes: data.notes,
            amount: data.amount,
            paymentStatus: data.paymentStatus,
            recurringBill: data.recurringBill,
            habitType: data.habitType,
            streak: data.streak,
            shoppingQuantity: data.shoppingQuantity,
            shoppingStore: data.shoppingStore,
            shoppingCost: data.shoppingCost,
            subject: data.subject,
            studyDuration: data.studyDuration,
            resourceLink: data.resourceLink,
            dependency: data.dependency,
            estimatedEffort: data.estimatedEffort,
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
    dueDate: Date;
    reminderTime: Date | null;
    recurrence?: RecurrenceSettings | null;
    project?: string | null;
    subtasks?: { id: string; title: string; completed: boolean }[];
    estimatedTime?: number;
    notes?: string;
    amount?: number;
    paymentStatus?: 'pending' | 'paid';
    recurringBill?: boolean;
    habitType?: string;
    streak?: number;
    shoppingQuantity?: number;
    shoppingStore?: string;
    shoppingCost?: number;
    subject?: string;
    studyDuration?: number;
    resourceLink?: string;
    dependency?: string;
    estimatedEffort?: string;
    status?: string;
    attachments?: any[];
  }) => {
    if (!user) {
      setIsAuthModalOpen(true);
      triggerToast('Authentication Required. Please connect your account to register and synchronize tasks.', 'error');
      return;
    }

    const path = 'tasks';
    try {
      const dueDateTimestamp = Timestamp.fromDate(data.dueDate);
      const reminderTimeTimestamp = data.reminderTime ? Timestamp.fromDate(data.reminderTime) : null;

      const extraFields = [
        'subtasks', 'estimatedTime', 'notes', 'amount', 'paymentStatus', 'recurringBill',
        'habitType', 'streak', 'shoppingQuantity', 'shoppingStore', 'shoppingCost',
        'subject', 'studyDuration', 'resourceLink', 'dependency', 'estimatedEffort',
        'status', 'attachments'
      ];

      if (taskToEdit) {
        // UPDATE action (Requires full state to pass rule validation helper)
        const docRef = doc(db, path, taskToEdit.id);
        const isCompletedField = data.status ? (data.status === 'Completed') : taskToEdit.completed;
        const updatePayload: any = {
          userId: user.uid,
          title: data.title,
          priority: data.priority,
          category: data.category,
          completed: isCompletedField, // updated based on status
          dueDate: dueDateTimestamp,
          createdAt: taskToEdit.createdAt, // retain creation timestamp (immutable)
          updatedAt: serverTimestamp(), // update field validated via rules
        };

        if (data.description !== undefined) {
          updatePayload.description = data.description;
        }
        if (reminderTimeTimestamp !== null) {
          updatePayload.reminderTime = reminderTimeTimestamp;
        } else {
          updatePayload.reminderTime = null;
        }
        if (data.recurrence !== undefined) {
          updatePayload.recurrence = data.recurrence;
        }
        if (data.project !== undefined) {
          updatePayload.project = data.project;
        }

        // Copy extra fields if they are defined
        extraFields.forEach(f => {
          if ((data as any)[f] !== undefined && (data as any)[f] !== null) {
            updatePayload[f] = (data as any)[f];
          }
        });

        await updateDoc(docRef, updatePayload);
        triggerToast('Task document successfully updated.');
      } else {
        // CREATE action
        const collRef = collection(db, path);
        const isCompletedField = data.status ? (data.status === 'Completed') : false;
        const createPayload: any = {
          userId: user.uid,
          title: data.title,
          priority: data.priority,
          category: data.category,
          completed: isCompletedField, // updated based on status
          dueDate: dueDateTimestamp,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (data.description !== undefined) {
          createPayload.description = data.description;
        }
        if (reminderTimeTimestamp !== null) {
          createPayload.reminderTime = reminderTimeTimestamp;
        }
        if (data.recurrence !== undefined) {
          createPayload.recurrence = data.recurrence;
        }
        if (data.project !== undefined) {
          createPayload.project = data.project;
        }

        // Copy extra fields if they are defined
        extraFields.forEach(f => {
          if ((data as any)[f] !== undefined && (data as any)[f] !== null) {
            createPayload[f] = (data as any)[f];
          }
        });

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
    if (!user) {
      setIsAuthModalOpen(true);
      triggerToast('Authentication Required. Please connect your account to complete tasks.', 'error');
      return;
    }
    if (activeToggles[task.id] || togglingTaskIds.current.has(task.id)) {
      // Toggle is already in progress for this task!
      return;
    }

    const nextCompletedState = !task.completed;
    let nextSubtasks = task.subtasks || [];
    
    // If the main task is marked completed, mark all subtasks completed only after user confirmation
    if (nextCompletedState && nextSubtasks.length > 0 && nextSubtasks.some(s => !s.completed)) {
      const confirmAll = window.confirm('Would you like to mark all subtasks on "' + task.title + '" as Completed?');
      if (confirmAll) {
        nextSubtasks = nextSubtasks.map(s => ({ ...s, completed: true }));
      }
    }

    // Set locks synchronously and via state
    togglingTaskIds.current.add(task.id);
    setActiveToggles(prev => ({ ...prev, [task.id]: true }));
    const path = 'tasks';
    const nextStatusState = nextCompletedState ? 'Completed' : 'Not Started';
    
    try {
      const docRef = doc(db, path, task.id);
      
      const payload: any = {
        userId: user.uid,
        title: task.title,
        priority: task.priority,
        category: task.category,
        completed: nextCompletedState,
        status: nextStatusState,
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

      // Copy all other fields to prevent loss on completion toggle
      const extraFields = [
        'estimatedTime', 'notes', 'amount', 'paymentStatus', 'recurringBill',
        'habitType', 'streak', 'shoppingQuantity', 'shoppingStore', 'shoppingCost',
        'subject', 'studyDuration', 'resourceLink', 'dependency', 'estimatedEffort',
        'attachments'
      ];
      extraFields.forEach(f => {
        if ((task as any)[f] !== undefined && (task as any)[f] !== null) {
          payload[f] = (task as any)[f];
        }
      });
      payload.subtasks = nextSubtasks;

      await updateDoc(docRef, payload);

      triggerToast(task.completed ? 'Task marked as pending.' : 'Congratulations! Task fully completed.');
    } catch (error: any) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    } finally {
      // Release lock synchronously and state-wise
      togglingTaskIds.current.delete(task.id);
      setActiveToggles(prev => {
        const copy = { ...prev };
        delete copy[task.id];
        return copy;
      });
    }
  };

  // Delete task 
  const handleDeleteTask = async (taskId: string) => {
    if (!user) {
      setIsAuthModalOpen(true);
      triggerToast('Authentication Required. Please connect your account to delete tasks.', 'error');
      return;
    }
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
    if (!user) {
      setIsAuthModalOpen(true);
      triggerToast('Authentication Required. Please connect your account to update tasks.', 'error');
      return;
    }
    setTaskToEdit(task);
    setIsFormOpen(true);
  };

  if (!authStateLoaded) {
    return (
      <div className={`theme-${theme} ${darkMode ? 'dark-themed' : 'light-themed'} min-h-screen bg-[#F9F8F6] flex flex-col justify-center items-center font-sans transition-colors duration-300`}>
        <RefreshCw className="h-10 w-10 text-[#C2410C] animate-spin mb-4" />
        <span className="text-[#1A1A1A] text-xs font-bold tracking-[0.2em] uppercase">Syncing Workspace...</span>
      </div>
    );
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
    <div className={`theme-${theme} ${darkMode ? 'dark-themed' : 'light-themed'} font-size-${fontSize} layout-${layoutMode} min-h-screen bg-[#F9F8F6] text-[#1A1A1A] font-sans selection:bg-[#C2410C]/25 pb-16 transition-colors duration-300`}>
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
        {/* Global Compact Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4 mb-4 gap-4 w-full font-sans">
          <div onClick={() => setCurrentView('agenda')} className="cursor-pointer select-none group flex items-center gap-3">
            <span className="text-3xl">{workspaceAvatar}</span>
            <div>
              <h1 className="text-[10px] tracking-[0.15em] font-medium uppercase text-slate-500 font-sans leading-none mb-1">
                Workspace Hub
              </h1>
              <div className="text-2xl font-serif italic font-semibold text-[#1A1A1A] group-hover:opacity-80 transition-opacity">
                {workspaceName}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-900">
                {profileNickname || (user ? user.displayName || 'Workspace Contributor' : 'Guest Contributor')}
              </div>
              <p className="text-[9px] text-slate-500 font-mono mt-0.5">{user ? user.email : 'guest-session@smarttask.net'}</p>
            </div>
            
            {user && user.photoURL ? (
              <img 
                src={user.photoURL} 
                alt="Avatar" 
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-none border border-slate-200"
              />
            ) : (
              <div className="h-7 w-7 bg-white border border-slate-200 flex items-center justify-center text-[#1A1A1A]">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
            )}
          </div>
        </header>

        {/* Simplified, Mobile-Friendly Top Navigation Bar */}
        <nav className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 mb-6 gap-3.5 font-sans">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setCurrentView('agenda')}
              className={`px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer flex items-center gap-2 ${
                currentView === 'agenda' 
                  ? 'bg-[#1A1A1A] text-white' 
                  : 'bg-white text-[#1A1A1A] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              📋 Agenda
            </button>
            <button
              onClick={() => setCurrentView('insights')}
              className={`px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer flex items-center gap-2 ${
                currentView === 'insights' 
                  ? 'bg-[#1A1A1A] text-white' 
                  : 'bg-white text-[#1A1A1A] border border-slate-200 hover:bg-slate-50'
              }`}
            >
              📊 Insights
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto md:justify-end">
            {/* Quick Compose / Add Task Action */}
            <button
              onClick={() => {
                if (!user) {
                  setIsAuthModalOpen(true);
                  triggerToast('Authentication Required. Please connect your account to compose tasks.', 'error');
                  return;
                }
                setTaskToEdit(null);
                setIsFormOpen(true);
              }}
              className="bg-[#C2410C] text-white px-3.5 py-1.5 text-xs font-semibold tracking-tight hover:bg-[#a1350a] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Task</span>
            </button>

            {/* Settings View Route button */}
            <button
              onClick={() => setCurrentView('settings')}
              className={`px-3.5 py-1.5 text-xs font-semibold tracking-tight transition-colors cursor-pointer flex items-center justify-center gap-1.5 border ${
                currentView === 'settings' 
                  ? 'bg-[#1A1A1A] text-white border-[#1A1A1A]' 
                  : 'bg-white border-slate-200 text-[#1A1A1A] hover:bg-slate-50'
              }`}
            >
              <Settings className="h-3.5 w-3.5" />
              <span>Settings</span>
            </button>

            {/* Help & Support Dropdown Menu container */}
            <div className="relative">
              <button
                onClick={() => setIsHelpMenuOpen(!isHelpMenuOpen)}
                className="px-3.5 py-1.5 text-xs font-semibold tracking-tight border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer flex items-center justify-center gap-1 w-full"
              >
                <span>Help Menu</span>
                <span className="text-[9px] opacity-75">▼</span>
              </button>
              
              {isHelpMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsHelpMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 shadow-lg py-1.5 z-55 font-sans">
                    <button
                      onClick={() => {
                        setCurrentView('guide');
                        setIsHelpMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <BookOpen className="h-3.5 w-3.5" /> User Guide
                    </button>
                    <button
                      onClick={() => {
                        setCurrentView('support');
                        setIsHelpMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                    >
                      <BellRing className="h-3.5 w-3.5" /> Help Support
                    </button>
                    <div className="border-t border-slate-100 my-1.5" />
                    {user ? (
                      <button
                        onClick={() => {
                          handleSignOut();
                          setIsHelpMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-rose-650 hover:bg-rose-50 flex items-center gap-2 cursor-pointer font-semibold"
                      >
                        <LogOut className="h-3.5 w-3.5" /> Exit Workspace
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setIsAuthModalOpen(true);
                          setIsHelpMenuOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-[#C2410C] hover:bg-orange-50 flex items-center gap-2 cursor-pointer font-semibold"
                      >
                        <UserIcon className="h-3.5 w-3.5" /> Connect Account
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
            
          </div>
        </nav>

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
              <span className="text-[#1A1A1A] text-xs mt-3 uppercase font-bold tracking-widest">Syncing Dispatch Workspace Records...</span>
            </div>
          ) : currentView === 'support' ? (
            <SupportPage 
              onBack={() => setCurrentView('agenda')} 
              triggerToast={triggerToast} 
              userEmail={user ? user.email || '' : ''} 
              onRequireAuth={() => {
                setIsAuthModalOpen(true);
                triggerToast('Authentication Required. Please connect your account to submit support tickets.', 'error');
              }}
            />
          ) : currentView === 'settings' ? (
            <SettingsPage 
              onBack={() => setCurrentView('agenda')} 
              triggerToast={triggerToast} 
              tasks={tasks}
              user={user}
              customCategories={customCategories}
              onSaveCustomCategories={handleSaveCustomCategories}
              onUpdateTaskCategory={handleUpdateTaskCategory}
              onRequireAuth={() => {
                setIsAuthModalOpen(true);
                triggerToast('Authentication Required. Please connect your account to modify workspace settings.', 'error');
              }}
            />
          ) : currentView === 'guide' ? (
            <GuidePage 
              onBack={() => setCurrentView('agenda')} 
              triggerToast={triggerToast} 
              user={user}
              onRequireAuth={() => {
                setIsAuthModalOpen(true);
                triggerToast('Authentication Required. Please connect your account to apply preset configurations.', 'error');
              }}
            />
          ) : currentView === 'insights' ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-4">
                <div>
                  <h3 className="font-serif italic text-3xl text-[#1A1A1A]">Workspace Insights</h3>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">Productivity trends, workload analyses, and category matrices.</p>
                </div>
                <button
                  onClick={() => setCurrentView('agenda')}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold tracking-tight transition-all cursor-pointer font-sans"
                >
                  Back to Agenda
                </button>
              </div>
              <Dashboard 
                tasks={tasks} 
                activeTab={activeTab}
                customCategories={customCategories}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setCurrentView('agenda');
                }} 
                view="insights"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Dashboard counters */}
              <Dashboard 
                tasks={tasks} 
                activeTab={activeTab}
                customCategories={customCategories}
                onSelectTab={(tab) => setActiveTab(tab)} 
                view="summary"
              />

              {/* Structured Table and Task items */}
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row justify-between items-baseline border-b border-slate-200 pb-3 gap-4">
                  <div className="flex items-baseline gap-2">
                    <h3 className="font-serif italic text-3xl text-[#1A1A1A]">
                      {activeTab === 'all' ? 'The Agenda' : `${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Assignments`}
                    </h3>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                    <span className="text-[10px] uppercase font-bold tracking-wider opacity-50 font-mono">
                      {tasks.filter(t => {
                        const status = t.status || (t.completed ? 'Completed' : 'Not Started');
                        if (activeTab === 'pending') return status !== 'Completed';
                        if (activeTab === 'completed') return status === 'Completed';
                        if (activeTab === 'overdue') return status !== 'Completed' && t.dueDate.toDate() < new Date();
                        return true;
                      }).length} items selected
                    </span>
                  </div>
                </div>

                <TaskList
                  tasks={tasks}
                  activeTab={activeTab}
                  customCategories={customCategories}
                  onToggleComplete={handleToggleComplete}
                  onEditTask={handleEditInit}
                  onDeleteTask={handleDeleteTask}
                  searchQuery={searchQueryGlobal}
                  setSearchQuery={setSearchQueryGlobal}
                  isFiltersOpen={isGlobalFilterOpen}
                  onCloseFilters={() => setIsGlobalFilterOpen(false)}
                  viewKey={viewKey}
                  setViewKey={setViewKey}
                />
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-16 flex flex-col sm:flex-row justify-between items-center text-xs border-t border-slate-200 pt-6 gap-4 text-slate-400 font-sans">
          <span>SmartTask Version 4.02 // Edition {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <span 
              className={`hover:text-slate-700 cursor-pointer transition-colors ${currentView === 'guide' ? 'text-[#C2410C] font-semibold' : ''}`}
              onClick={() => setCurrentView('guide')}
            >
              Guide
            </span>
            <span 
              className={`hover:text-slate-700 cursor-pointer transition-colors ${currentView === 'support' ? 'text-[#C2410C] font-semibold' : ''}`}
              onClick={() => setCurrentView('support')}
            >
              Support
            </span>
            <span 
              className={`hover:text-slate-700 cursor-pointer transition-colors ${currentView === 'settings' ? 'text-[#C2410C] font-semibold' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              Settings
            </span>
          </div>
        </footer>
      </div>

      {/* Task Drawer/Form Modal */}
      <AnimatePresence>
        {isFormOpen && (
          <TaskForm
            taskToEdit={taskToEdit}
            existingProjects={existingProjects}
            customCategories={customCategories}
            onSave={handleSaveTask}
            onClose={() => {
              setIsFormOpen(false);
              setTaskToEdit(null);
            }}
          />
        )}
      </AnimatePresence>

      {/* Global Security Auth Prompt Modal */}
      <AuthModal 
        isOpen={isAuthModalOpen} 
        onClose={() => setIsAuthModalOpen(false)} 
        onSuccess={() => {
          setIsAuthModalOpen(false);
          triggerToast('Successfully authenticated. Secure Cloud Sync enabled!');
        }}
      />

      {/* Floating Action Button (FAB) for adding tasks on mobile screens */}
      <div className="fixed bottom-20 right-5 z-40 sm:hidden">
        <button
          onClick={() => {
            if (!user) {
              setIsAuthModalOpen(true);
              triggerToast('Authentication Required. Please connect your account to compose tasks.', 'error');
              return;
            }
            setTaskToEdit(null);
            setIsFormOpen(true);
          }}
          className="w-12 h-12 bg-[#C2410C] hover:bg-[#a1350a] text-white rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-all cursor-pointer"
          title="Add Task"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 z-40 sm:hidden pb-safe">
        <div className="grid grid-cols-5 h-16">
          {/* Today Button */}
          <button
            onClick={() => {
              setCurrentView('agenda');
              setViewKey('focus');
            }}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
              currentView === 'agenda' && viewKey === 'focus'
                ? 'text-[#C2410C]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Clock className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Today</span>
          </button>

          {/* Tasks Button */}
          <button
            onClick={() => {
              setCurrentView('agenda');
              setViewKey('agenda');
            }}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
              currentView === 'agenda' && viewKey === 'agenda'
                ? 'text-[#C2410C]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CheckSquare className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Tasks</span>
          </button>

          {/* Calendar Button */}
          <button
            onClick={() => {
              setCurrentView('agenda');
              setViewKey('calendar');
            }}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
              currentView === 'agenda' && viewKey === 'calendar'
                ? 'text-[#C2410C]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <CalendarRange className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Calendar</span>
          </button>

          {/* Categories Button */}
          <button
            onClick={() => {
              setCurrentView('agenda');
              setViewKey('category');
            }}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
              currentView === 'agenda' && viewKey === 'category'
                ? 'text-[#C2410C]' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <BookOpen className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Folders</span>
          </button>

          {/* Settings Button */}
          <button
            onClick={() => {
              setCurrentView('settings');
            }}
            className={`flex flex-col items-center justify-center gap-1 cursor-pointer select-none transition-colors ${
              currentView === 'settings'
                ? 'text-[#C2410C]' 
                : 'text-[#1a1a1a] opacity-50 hover:opacity-100'
            }`}
          >
            <Settings className="h-5 w-5" />
            <span className="text-[9px] font-bold uppercase tracking-wider font-sans">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}
