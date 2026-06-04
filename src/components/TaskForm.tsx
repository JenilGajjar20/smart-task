import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Flag, Tag, Sparkles, Clock, Folder } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Task, Priority, Category, RecurrenceFrequency, RecurrenceUnit, RecurrenceSettings, Attachment } from '../types';
import { saveFileToLocal } from '../utils/fileStorage';

interface TaskFormProps {
  taskToEdit?: Task | null;
  existingProjects?: string[];
  onSave: (data: {
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
    status?: 'Not Started' | 'In Progress' | 'Waiting / Blocked' | 'Completed' | 'Cancelled';
    attachments?: Attachment[];
  }) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({ taskToEdit, existingProjects = [], onSave, onClose }: TaskFormProps) {
  const [formMode, setFormMode] = useState<'quick' | 'advanced'>(taskToEdit ? 'advanced' : 'quick');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState<Priority>(() => {
    return (localStorage.getItem('smarttask_default_priority') as Priority) || 'medium';
  });
  const [category, setCategory] = useState<Category>(() => {
    return (localStorage.getItem('smarttask_default_category') as Category) || 'Work';
  });

  // Additional personalization fields states
  const [subtasks, setSubtasks] = useState<{ id: string; title: string; completed: boolean }[]>([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [estimatedTime, setEstimatedTime] = useState<number>(1);
  const [notes, setNotes] = useState('');
  
  // For Attachment & Reference links
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkLabel, setNewLinkLabel] = useState('');
  const [editingAttachmentId, setEditingAttachmentId] = useState<string | null>(null);
  
  // Category-specific fields states
  const [amount, setAmount] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending');
  const [recurringBill, setRecurringBill] = useState(false);
  const [habitType, setHabitType] = useState('Workout');
  const [streak, setStreak] = useState<number>(0);
  const [shoppingQuantity, setShoppingQuantity] = useState<number>(1);
  const [shoppingStore, setShoppingStore] = useState('');
  const [shoppingCost, setShoppingCost] = useState<number>(0);
  const [subject, setSubject] = useState('');
  const [studyDuration, setStudyDuration] = useState<number>(30);
  const [resourceLink, setResourceLink] = useState('');
  const [dependency, setDependency] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState('Medium');
  
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Waiting / Blocked' | 'Completed' | 'Cancelled'>('Not Started');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Inline checklist editing state
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskValue, setEditingSubtaskValue] = useState('');

  // Accordion toggle states for Advanced Mode
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    basic: true,
    schedule: false,
    status: false,
    workDetails: false,
    attachments: false,
    subtasks: false,
    privateNotes: false,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Automatically set status to Waiting / Blocked when workspace dependency is filled
  useEffect(() => {
    if (dependency.trim() && status !== 'Waiting / Blocked' && status !== 'Completed' && status !== 'Cancelled') {
      setStatus('Waiting / Blocked');
    }
  }, [dependency]);
  
  // Format dates to ISO-like local datetime-local string
  const formatDateToInput = (dateObj?: Date | null): string => {
    if (!dateObj) return '';
    const tzoffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - tzoffset)).toISOString().slice(0, 16);
    return localISOTime;
  };

  const getInitialDueDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return formatDateToInput(tomorrow);
  };

  const [dueDateStr, setDueDateStr] = useState(getInitialDueDate());
  const [reminderActive, setReminderActive] = useState(false);
  const [reminderDateStr, setReminderDateStr] = useState('');

  // Recurrence states
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<RecurrenceFrequency>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<RecurrenceUnit>('days');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectLinkType = (url: string): 'GitHub' | 'Google Drive' | 'Figma' | 'Notion' | 'Website' => {
    const lower = url.toLowerCase();
    if (lower.includes('github.com')) return 'GitHub';
    if (lower.includes('drive.google.com') || lower.includes('google.com/drive')) return 'Google Drive';
    if (lower.includes('figma.com')) return 'Figma';
    if (lower.includes('notion.so') || lower.includes('notion.com') || lower.includes('notion.site')) return 'Notion';
    return 'Website';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Url = reader.result as string;
        const attachmentId = 'file-' + Date.now();
        
        // Persist content to local store asynchronously (bypasses Firestore 1MB limits)
        await saveFileToLocal(attachmentId, base64Url);
        
        const newAttachment: Attachment = {
          id: attachmentId,
          name: file.name,
          url: 'local-file://' + attachmentId,
          type: file.type.startsWith('image/') ? 'Screenshot' : 'File'
        };
        setAttachments(prev => [...prev, newAttachment]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddLink = () => {
    if (!newLinkUrl.trim()) return;
    
    let targetUrl = newLinkUrl.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }
    
    try {
      new URL(targetUrl);
    } catch (_) {
      setError('Please provide a secure, fully formed URL (e.g. google.com).');
      return;
    }

    const type = detectLinkType(targetUrl);
    const label = newLinkLabel.trim() || targetUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0];
    
    if (editingAttachmentId) {
      setAttachments(prev => prev.map(att => att.id === editingAttachmentId ? { ...att, name: label, url: targetUrl, type } : att));
      setEditingAttachmentId(null);
    } else {
      const newAttachment: Attachment = {
        id: 'link-' + Date.now(),
        name: label,
        url: targetUrl,
        type
      };
      setAttachments(prev => [...prev, newAttachment]);
    }
    
    setNewLinkUrl('');
    setNewLinkLabel('');
  };

  const handleEditAttachment = (att: Attachment) => {
    setEditingAttachmentId(att.id);
    setNewLinkUrl(att.url);
    setNewLinkLabel(att.name);
  };

  useEffect(() => {
    if (taskToEdit) {
      setFormMode('advanced');
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority);
      setCategory(taskToEdit.category);
      setProject(taskToEdit.project || '');
      setDueDateStr(formatDateToInput(taskToEdit.dueDate.toDate()));
      if (taskToEdit.reminderTime) {
        setReminderActive(true);
        setReminderDateStr(formatDateToInput(taskToEdit.reminderTime.toDate()));
      } else {
        setReminderActive(false);
        setReminderDateStr('');
      }
      if (taskToEdit.recurrence) {
        setRecurrenceFrequency(taskToEdit.recurrence.frequency);
        setRecurrenceInterval(taskToEdit.recurrence.interval || 1);
        setRecurrenceUnit(taskToEdit.recurrence.unit || 'days');
      } else {
        setRecurrenceFrequency('none');
        setRecurrenceInterval(1);
        setRecurrenceUnit('days');
      }
      setSubtasks(taskToEdit.subtasks || []);
      setEstimatedTime(taskToEdit.estimatedTime !== undefined ? taskToEdit.estimatedTime : 1);
      setNotes(taskToEdit.notes || '');
      setAmount(taskToEdit.amount || 0);
      setPaymentStatus(taskToEdit.paymentStatus || 'pending');
      setRecurringBill(taskToEdit.recurringBill || false);
      setHabitType(taskToEdit.habitType || 'Workout');
      setStreak(taskToEdit.streak || 0);
      setShoppingQuantity(taskToEdit.shoppingQuantity || 1);
      setShoppingStore(taskToEdit.shoppingStore || '');
      setShoppingCost(taskToEdit.shoppingCost || 0);
      setSubject(taskToEdit.subject || '');
      setStudyDuration(taskToEdit.studyDuration || 30);
      setResourceLink(taskToEdit.resourceLink || '');
      setDependency(taskToEdit.dependency || '');
      setEstimatedEffort(taskToEdit.estimatedEffort || 'Medium');
      setStatus(taskToEdit.status || (taskToEdit.completed ? 'Completed' : 'Not Started'));
      setAttachments(taskToEdit.attachments || []);
    } else {
      setFormMode('quick');
      setTitle('');
      setDescription('');
      setProject('');
      setPriority((localStorage.getItem('smarttask_default_priority') as Priority) || 'medium');
      setCategory((localStorage.getItem('smarttask_default_category') as Category) || 'Work');
      setDueDateStr(getInitialDueDate());
      setReminderActive(false);
      setReminderDateStr('');
      setRecurrenceFrequency('none');
      setRecurrenceInterval(1);
      setRecurrenceUnit('days');
      setSubtasks([]);
      setEstimatedTime(1);
      setNotes('');
      setAmount(0);
      setPaymentStatus('pending');
      setRecurringBill(false);
      setHabitType('Workout');
      setStreak(0);
      setShoppingQuantity(1);
      setShoppingStore('');
      setShoppingCost(0);
      setSubject('');
      setStudyDuration(30);
      setResourceLink('');
      setDependency('');
      setEstimatedEffort('Medium');
      setStatus('Not Started');
      setAttachments([]);
    }
  }, [taskToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('A task title is required.');
      return;
    }
    if (title.length > 100) {
      setError('Title cannot exceed 100 characters.');
      return;
    }
    if (!dueDateStr) {
      setError('A due date deadline is required.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const dueParsed = new Date(dueDateStr);
      if (isNaN(dueParsed.getTime())) {
        throw new Error('Please specify a valid deadline datetime.');
      }

      let reminderTimeDate: Date | null = null;
      if (reminderActive && reminderDateStr) {
        const reminderParsed = new Date(reminderDateStr);
        if (!isNaN(reminderParsed.getTime())) {
          reminderTimeDate = reminderParsed;
        }
      }

      const recurrencePayload: RecurrenceSettings | null = recurrenceFrequency !== 'none' ? (
        recurrenceFrequency === 'custom' ? {
          frequency: recurrenceFrequency,
          interval: Number(recurrenceInterval) || 1,
          unit: recurrenceUnit,
        } : {
          frequency: recurrenceFrequency,
        }
      ) : null;

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueParsed,
        reminderTime: reminderTimeDate,
        recurrence: recurrencePayload,
        project: project.trim() || null,
        subtasks,
        estimatedTime,
        notes: notes.trim() || undefined,
        amount,
        paymentStatus,
        recurringBill,
        habitType,
        streak,
        shoppingQuantity,
        shoppingStore: shoppingStore.trim() || undefined,
        shoppingCost,
        subject: subject.trim() || undefined,
        studyDuration,
        resourceLink: resourceLink.trim() || undefined,
        dependency: dependency.trim() || undefined,
        estimatedEffort,
        status,
        attachments,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Unable to store task. Please verify values.';
      try {
        if (err.message && err.message.trim().startsWith('{')) {
          const parsed = JSON.parse(err.message);
          if (parsed.error) {
            errMsg = `System Rejection: ${parsed.error}`;
          }
        } else if (err.message) {
          errMsg = err.message;
        }
      } catch (_) {
        if (err.message) {
          errMsg = err.message;
        }
      }
      setError(errMsg);
    } finally {
      setSaving(false);
    }
  };

  const categories: Category[] = ['Work', 'Personal', 'Education', 'Health', 'Shopping', 'Finance', 'Other'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto font-sans" id="task-form-modal">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Modal Backdrop */}
        <div 
          className="fixed inset-0 transition-opacity bg-slate-900/40 backdrop-blur-sm z-0" 
          onClick={onClose} 
        />

        {/* Trick to center modal content in desktop */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

        {/* Modal body */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 15 }}
          className="relative z-10 inline-block w-full max-w-lg p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-[#F9F8F6] shadow-none rounded-none border-2 border-[#1A1A1A] sm:align-middle"
        >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#1A1A1A]">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C2410C]" />
              <h3 className="font-serif italic text-2xl text-[#1A1A1A]">
                {taskToEdit ? 'Modify Task Details' : 'Compose New Task'}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-[#1A1A1A]/5 text-[#1A1A1A] transition-colors cursor-pointer border border-[#1A1A1A]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border-2 border-rose-950 text-rose-950 rounded-none text-xs font-mono flex gap-2 items-center">
                <span className="font-bold">⚠️ ERROR:</span> {error}
              </div>
            )}

            {/* Dual Mode Switcher Panel */}
            <div className="grid grid-cols-2 gap-1 bg-[#EBEAE6] p-1 border border-[#1A1A1A]/20 rounded-none mb-2 select-none font-sans">
              <button
                type="button"
                onClick={() => setFormMode('quick')}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider text-center transition-all duration-150 cursor-pointer ${
                  formMode === 'quick' 
                    ? 'bg-[#1A1A1A] text-white' 
                    : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                }`}
              >
                ⚡ Quick Mode
              </button>
              <button
                type="button"
                onClick={() => setFormMode('advanced')}
                className={`py-2 text-[10px] font-bold uppercase tracking-wider text-center transition-all duration-150 cursor-pointer ${
                  formMode === 'advanced' 
                    ? 'bg-[#1A1A1A] text-white' 
                    : 'bg-transparent text-[#1A1A1A] hover:bg-[#1A1A1A]/5'
                }`}
              >
                ⚙️ Advanced Mode
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5">Task Title *</label>
              <input
                id="task-title-input"
                type="text"
                placeholder="e.g. Schedule team retrospect..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
                required
                className="w-full px-4 py-3 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-sm font-serif"
              />
              <div className="text-[10px] text-right text-slate-500 mt-1 font-mono">{title.length}/100</div>
            </div>

            {formMode === 'advanced' && (
              /* Advanced Mode - Collapsible Sections Accordion */
              <div className="space-y-3 border border-[#1A1A1A]/10 p-1.5 bg-[#F4F3EF]/30 font-sans">
                {/* 1. Basic Details Accordion */}
                <div className="border border-[#1A1A1A]">
                  <button
                    type="button"
                    onClick={() => toggleSection('basic')}
                    className="w-full flex items-center justify-between p-3 bg-[#EBEAE6] hover:bg-[#EBEAE6]/80 text-[#1A1A1A] text-[10px] font-bold uppercase tracking-wider select-none cursor-pointer border-b border-[#1A1A1A]"
                  >
                    <span className="flex items-center gap-1.5">📝 Basic Details</span>
                    <span className="font-mono text-xs">{expandedSections.basic ? '▼' : '►'}</span>
                  </button>
                  {expandedSections.basic && (
                    <div className="p-4 bg-white space-y-4">
                      {/* Description */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5">Description (Optional)</label>
                        <textarea
                          placeholder="Include agenda details, milestones, reference links..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          rows={3}
                          maxLength={1000}
                          className="w-full px-4 py-3 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-sm font-serif resize-none"
                        />
                      </div>

                      {/* Project */}
                      <div>
                        <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5 flex items-center gap-1.5">
                          <Folder className="h-3.5 w-3.5 text-[#C2410C]" /> Project / Section (Optional)
                        </label>
                        <input
                          id="task-project-input"
                          type="text"
                          list="existing-projects"
                          placeholder="e.g. Summer Release, Home Renovation"
                          value={project}
                          onChange={(e) => setProject(e.target.value)}
                          maxLength={100}
                          className="w-full px-4 py-3 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-sm font-serif"
                        />
                        {existingProjects && existingProjects.length > 0 && (
                          <datalist id="existing-projects">
                            {existingProjects.map((p) => (
                              <option key={p} value={p} />
                            ))}
                          </datalist>
                        )}
                        <span className="text-[9px] text-slate-500 font-serif italic mt-1 block leading-normal">
                          Assign to an existing workspace book or create a new section inline by typing.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Category and Priority (Two column grid) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5">
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5 text-[#C2410C]" /> Category</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="w-full px-4 py-3 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-sm font-serif transition-all cursor-pointer"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5">
                  <span className="flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-[#C2410C]" /> Urgency Level</span>
                </label>
                <div className="grid grid-cols-3 gap-1 bg-white border border-[#1A1A1A] p-1 rounded-none">
                  {(['low', 'medium', 'high'] as Priority[]).map((p) => {
                    const isSelected = priority === p;
                    const activeColors = {
                      low: 'bg-[#1A1A1A] text-white',
                      medium: 'bg-[#1A1A1A] text-white',
                      high: 'bg-[#C2410C] text-white',
                    };
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPriority(p)}
                        className={`py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none text-center transition-all duration-150 cursor-pointer ${
                          isSelected ? `${activeColors[p]}` : 'bg-transparent text-[#1A1A1A] hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {formMode === 'advanced' && (
              <>
                {/* Task Lifecycle Status */}
                <div className="bg-white p-4 border border-[#1A1A1A] space-y-2">
                  <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] font-sans flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#C2410C]" /> Task Lifecycle Status
                  </label>
                  <select
                    id="task-status-select"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Waiting / Blocked">Waiting / Blocked</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                  </select>
                  <p className="text-[9px] text-slate-500 font-serif italic">
                    Indicates current execution phase. Marking "Completed" updates your performance parameters automatically.
                  </p>
                </div>

                {/* Category-Specific Form Enhancements */}
                <div className="p-4 border border-[#1A1A1A] bg-[#F1EFEA]">
              <div className="flex items-center gap-2 mb-2 pb-1 border-b border-[#1A1A1A]/10">
                <Sparkles className="h-3.5 w-3.5 text-[#C2410C]" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#1A1A1A] font-mono">
                  {category} Extra-Dimensional Parameters
                </span>
              </div>

              {category === 'Finance' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Amount ($)</label>
                    <input
                      type="number"
                      value={amount || ''}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Payment Status</label>
                    <select
                      value={paymentStatus}
                      onChange={(e) => setPaymentStatus(e.target.value as 'pending' | 'paid')}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>
                  <div className="flex items-end pb-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-serif text-[#1A1A1A]">
                      <input
                        type="checkbox"
                        checked={recurringBill}
                        onChange={(e) => setRecurringBill(e.target.checked)}
                        className="rounded-none border-[#1A1A1A]"
                      />
                      <span>Recurring Bill</span>
                    </label>
                  </div>
                </div>
              )}

              {category === 'Health' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Type of Wellness Practice</label>
                    <select
                      value={habitType}
                      onChange={(e) => setHabitType(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif cursor-pointer"
                    >
                      <option value="Workout">Workout / Exercise</option>
                      <option value="Diet">Dietary Nourishment</option>
                      <option value="Medication">Medication / Prescription</option>
                      <option value="Meditation">Mindful Meditation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Current Streak (Days)</label>
                    <input
                      type="number"
                      value={streak}
                      onChange={(e) => setStreak(Math.max(0, Number(e.target.value) || 0))}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {category === 'Shopping' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Store Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Costco"
                      value={shoppingStore}
                      onChange={(e) => setShoppingStore(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={shoppingQuantity}
                      onChange={(e) => setShoppingQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Budget Cost ($)</label>
                    <input
                      type="number"
                      value={shoppingCost || ''}
                      onChange={(e) => setShoppingCost(Number(e.target.value) || 0)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none"
                    />
                  </div>
                </div>
              )}

              {category === 'Education' && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Academic Subject</label>
                    <input
                      type="text"
                      placeholder="e.g. Calculus, Physics"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Study Target (Mins)</label>
                    <input
                      type="number"
                      min="5"
                      value={studyDuration}
                      onChange={(e) => setStudyDuration(Math.max(5, Number(e.target.value) || 30))}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Resource URL</label>
                    <input
                      type="text"
                      placeholder="e.g. drive.google.com"
                      value={resourceLink}
                      onChange={(e) => setResourceLink(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif"
                    />
                  </div>
                </div>
              )}

              {category === 'Work' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Workspace Dependency</label>
                    <input
                      type="text"
                      placeholder="e.g. Blocked on layout approval"
                      value={dependency}
                      onChange={(e) => setDependency(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 font-mono">Estimated Effort Size</label>
                    <select
                      value={estimatedEffort}
                      onChange={(e) => setEstimatedEffort(e.target.value)}
                      className="w-full px-2 py-1 bg-white border border-[#1A1A1A] text-[#1A1A1A] text-xs outline-none font-serif cursor-pointer"
                    >
                      <option value="Low">Low Effort</option>
                      <option value="Medium">Medium Effort</option>
                      <option value="High">High Effort</option>
                    </select>
                  </div>
                </div>
              )}

              {category === 'Personal' && (
                <p className="text-[10px] text-slate-500 italic font-serif">Focus on internal fulfillment. No complex variables required.</p>
              )}
              {category === 'Other' && (
                <p className="text-[10px] text-slate-500 italic font-serif">General entry point. Use standard metadata tags below.</p>
              )}
            </div>

            {/* Estimated Hour Effort & Notes Segment */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5 font-sans">Estimated Hours Target</label>
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(Math.max(0.5, Number(e.target.value) || 1))}
                  className="w-full px-4 py-2.5 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5 font-sans">Confidential Notes / Links</label>
                <input
                  type="text"
                  placeholder="Secret access keys, drive URLs..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-sm font-serif"
                />
              </div>
            </div>

            {/* Interactive Subtasks Checklist Builder */}
            <div className="bg-white p-4 rounded-none border border-[#1A1A1A] space-y-3">
              <span className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] font-sans">
                Interactive Checklists / Subtasks ({subtasks.length})
              </span>
              
              {subtasks.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {subtasks.map((sub, idx) => {
                    const isEditing = editingSubtaskId === sub.id;
                    return (
                      <div key={sub.id} className="flex items-center justify-between bg-[#F9F8F6] p-2 border border-[#1A1A1A]/10">
                        {isEditing ? (
                          <div className="flex items-center gap-1.5 w-full">
                            <input
                              type="text"
                              value={editingSubtaskValue}
                              onChange={(e) => setEditingSubtaskValue(e.target.value)}
                              className="flex-1 px-2 py-0.5 bg-white border border-[#1A1A1A] text-xs outline-none font-serif"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (editingSubtaskValue.trim()) {
                                    const updated = [...subtasks];
                                    updated[idx].title = editingSubtaskValue.trim();
                                    setSubtasks(updated);
                                    setEditingSubtaskId(null);
                                  }
                                } else if (e.key === 'Escape') {
                                  setEditingSubtaskId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (editingSubtaskValue.trim()) {
                                  const updated = [...subtasks];
                                  updated[idx].title = editingSubtaskValue.trim();
                                  setSubtasks(updated);
                                  setEditingSubtaskId(null);
                                }
                              }}
                              className="text-emerald-700 hover:text-emerald-900 text-[10px] uppercase font-bold px-1"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingSubtaskId(null)}
                              className="text-slate-500 hover:text-slate-800 text-[10px] uppercase font-bold px-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={sub.completed}
                                onChange={(e) => {
                                  const updated = [...subtasks];
                                  updated[idx].completed = e.target.checked;
                                  setSubtasks(updated);
                                }}
                                className="rounded-none border-[#1A1A1A] h-3.5 w-3.5 text-[#1A1A1A]"
                              />
                              <span className={`text-xs font-serif ${sub.completed ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>
                                {sub.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubtaskId(sub.id);
                                  setEditingSubtaskValue(sub.title);
                                }}
                                className="text-blue-700 hover:text-blue-900 text-[10px] font-mono hover:underline uppercase font-bold cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setSubtasks(subtasks.filter((_, i) => i !== idx));
                                }}
                                className="text-rose-600 hover:text-rose-800 text-[10px] font-mono hover:underline uppercase font-bold cursor-pointer"
                              >
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No subtasks added yet.</p>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add item to checklist..."
                  value={subtaskInput}
                  onChange={(e) => setSubtaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (subtaskInput.trim()) {
                        setSubtasks([...subtasks, { id: Date.now().toString(), title: subtaskInput.trim(), completed: false }]);
                        setSubtaskInput('');
                      }
                    }
                  }}
                  className="flex-1 px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-xs font-serif"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (subtaskInput.trim()) {
                      setSubtasks([...subtasks, { id: Date.now().toString(), title: subtaskInput.trim(), completed: false }]);
                      setSubtaskInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#1A1A1A] hover:bg-[#C2410C] text-white font-bold text-[10px] uppercase tracking-wider rounded-none cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Attachments & Reference Links Section */}
            <div className="bg-white p-4 rounded-none border border-[#1A1A1A] space-y-3 font-sans">
              <span className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] font-sans">
                Attachments & Reference Links ({attachments.length})
              </span>

              {attachments.length > 0 ? (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between bg-[#F9F8F6] p-2 border border-[#1A1A1A]/10 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-bold text-slate-500 font-mono text-[9px] uppercase tracking-wider bg-[#EBEAE6] px-1 py-0.5">
                          {att.type}
                        </span>
                        <span className="font-serif italic font-semibold text-[#1a1a1a] truncate" title={att.url}>
                          {att.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {att.type !== 'File' && att.type !== 'Screenshot' && (
                          <button
                            type="button"
                            onClick={() => handleEditAttachment(att)}
                            className="text-blue-700 hover:text-blue-900 text-[10px] font-mono hover:underline uppercase font-bold cursor-pointer"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setAttachments(prev => prev.filter(item => item.id !== att.id))}
                          className="text-rose-600 hover:text-rose-800 text-[10px] font-mono hover:underline uppercase font-bold cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-slate-400 italic">No attachments or reference links added yet.</p>
              )}

              {/* Add form */}
              <div className="space-y-2 border-t border-[#1A1A1A]/10 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="URL Link (e.g. github.com/...)"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-xs font-serif"
                  />
                  <input
                    type="text"
                    placeholder="Optional Link Title"
                    value={newLinkLabel}
                    onChange={(e) => setNewLinkLabel(e.target.value)}
                    className="px-3 py-1.5 bg-white border border-[#1A1A1A] rounded-none outline-none text-xs font-serif"
                  />
                </div>
                
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <label className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 font-bold text-[9px] uppercase tracking-wider rounded-none cursor-pointer inline-flex items-center gap-1 font-sans">
                      <span>📁 Attach Files</span>
                      <input 
                        type="file" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                      />
                    </label>
                    <span className="text-[9px] text-slate-400">PDF, TXT, ZIP, Images</span>
                  </div>

                  <div className="flex gap-1.5">
                    {editingAttachmentId && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingAttachmentId(null);
                          setNewLinkUrl('');
                          setNewLinkLabel('');
                        }}
                        className="px-2.5 py-1 bg-transparent hover:bg-slate-100 text-slate-600 border border-slate-300 font-bold text-[9px] uppercase tracking-wider rounded-none cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleAddLink}
                      className="px-2.5 py-1 bg-[#1A1A1A] hover:bg-[#C2410C] text-white font-bold text-[9px] uppercase tracking-wider rounded-none cursor-pointer"
                    >
                      {editingAttachmentId ? 'Save' : 'Add Link'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
              </>
            )}

            {/* Due Date */}
            <div>
              <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] mb-1.5">
                <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-[#C2410C]" /> Due Date Deadline *</span>
              </label>
              <input
                type="datetime-local"
                value={dueDateStr}
                onChange={(e) => setDueDateStr(e.target.value)}
                required
                className="w-full px-4 py-3 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-sm font-serif transition-all cursor-pointer"
              />
            </div>

            {formMode === 'advanced' && (
              <>
                {/* Optional Reminder Setup */}
                <div className="bg-white p-4 rounded-none border border-[#1A1A1A] space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reminderActive}
                    onChange={(e) => {
                      setReminderActive(e.target.checked);
                      if (e.target.checked && !reminderDateStr) {
                        // Default to 1 hour before due date
                        if (dueDateStr) {
                          const due = new Date(dueDateStr);
                          due.setHours(due.getHours() - 1);
                          setReminderDateStr(formatDateToInput(due));
                        }
                      }
                    }}
                    className="rounded-none text-[#1A1A1A] focus:ring-[#1A1A1A] border-[#1A1A1A] h-4 w-4"
                  />
                  <span className="text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-[#C2410C]" /> Enable Reminder Alert
                  </span>
                </label>
              </div>

              {reminderActive && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-1"
                >
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono">Alert Schedule Time</span>
                  <input
                    type="datetime-local"
                    value={reminderDateStr}
                    onChange={(e) => setReminderDateStr(e.target.value)}
                    required={reminderActive}
                    className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer"
                  />
                </motion.div>
              )}
            </div>

            {/* Optional Recurrence Setup */}
            <div className="bg-white p-4 rounded-none border border-[#1A1A1A] space-y-3">
              <label className="block text-[10px] font-bold text-[#1A1A1A] uppercase tracking-[0.15em]">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-[#C2410C]" /> Repeat Settings
                </span>
              </label>
              
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono mb-1">Frequency</span>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer"
                  >
                    <option value="none">Does Not Repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom Interval</option>
                  </select>
                </div>

                {recurrenceFrequency === 'custom' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="grid grid-cols-2 gap-3 pt-1"
                  >
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono mb-1">Repeat Every</span>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={recurrenceInterval}
                        onChange={(e) => setRecurrenceInterval(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all"
                      />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest block font-mono mb-1">Pacing Unit</span>
                      <select
                        value={recurrenceUnit}
                        onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                        className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none text-[#1A1A1A] text-xs font-serif transition-all cursor-pointer"
                      >
                        <option value="days">Days</option>
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
              </>
            )}

            {/* Submission Buttons */}
            <div className="flex gap-3 justify-end pt-3 border-t border-[#1A1A1A]">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 border border-[#1A1A1A] bg-transparent hover:bg-[#1A1A1A]/5 text-[#1A1A1A] font-bold text-xs uppercase tracking-widest rounded-none transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="task-submit-btn"
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-[#1A1A1A] hover:bg-[#F9F8F6] text-white hover:text-[#1A1A1A] border-2 border-[#1A1A1A] font-bold text-xs uppercase tracking-widest rounded-none transition-all active:scale-[0.98] cursor-pointer inline-flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-3 w-3 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>{taskToEdit ? 'Save Changes' : 'Commit Task'}</span>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
