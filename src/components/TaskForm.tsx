import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Calendar, Flag, Tag, Sparkles, Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { Task, Priority, Category } from '../types';

interface TaskFormProps {
  taskToEdit?: Task | null;
  onSave: (data: {
    title: string;
    description: string | undefined;
    priority: Priority;
    category: Category;
    dueDate: Timestamp;
    reminderTime: Timestamp | null;
  }) => Promise<void>;
  onClose: () => void;
}

export default function TaskForm({ taskToEdit, onSave, onClose }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<Category>('Work');
  
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

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (taskToEdit) {
      setTitle(taskToEdit.title);
      setDescription(taskToEdit.description || '');
      setPriority(taskToEdit.priority);
      setCategory(taskToEdit.category);
      setDueDateStr(formatDateToInput(taskToEdit.dueDate.toDate()));
      if (taskToEdit.reminderTime) {
        setReminderActive(true);
        setReminderDateStr(formatDateToInput(taskToEdit.reminderTime.toDate()));
      } else {
        setReminderActive(false);
        setReminderDateStr('');
      }
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
      const dueDateTimestamp = Timestamp.fromDate(dueParsed);

      let reminderTimeTimestamp: Timestamp | null = null;
      if (reminderActive && reminderDateStr) {
        const reminderParsed = new Date(reminderDateStr);
        if (!isNaN(reminderParsed.getTime())) {
          reminderTimeTimestamp = Timestamp.fromDate(reminderParsed);
        }
      }

      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        dueDate: dueDateTimestamp,
        reminderTime: reminderTimeTimestamp,
      });
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Unable to store task. Please verify values.');
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
