import React, { useState } from 'react';
import { Mail, ArrowLeft, Send, MessageSquare, HelpCircle, BookOpen, AlertCircle, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

interface SupportPageProps {
  onBack: () => void;
  triggerToast: (message: string, type?: 'success' | 'error') => void;
  userEmail: string;
}

export default function SupportPage({ onBack, triggerToast, userEmail }: SupportPageProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      triggerToast('Please complete all correspondence fields.', 'error');
      return;
    }

    setSending(true);
    // Simulate real dispatch delivery
    setTimeout(() => {
      setSending(false);
      setSubmittedMessage(`Correspondence filed! Reference ID: #${Math.floor(100000 + Math.random() * 900000)}`);
      triggerToast('Correspondence dispatched to support staff.');
      setSubject('');
      setMessage('');
    }, 1200);
  };

  const faqs = [
    {
      q: 'How does the Task Recurrence system operate?',
      a: 'When you file a recurring task, completing it immediately registers a new instance calculated from the previous deadline. Daily, Weekly, Monthly, or Custom intervals can be scheduled.',
    },
    {
      q: 'Where are my desk records stored?',
      a: 'Your checklist is safely synchronized with a secure Cloud Firestore database linked directly to your secure SmartTask workspace coordinates.',
    },
    {
      q: 'Can I silence the Alarm Bulletin banner?',
      a: 'The Bulletin is a critical priority notice for active tasks with upcoming alert times mapped for today. It will quiet automatically as those tasks are completed or edited.',
    },
    {
      q: 'How do I edit existing categories or labels?',
      a: 'Categories are standard desk divisions (Work, Personal, Education, Health, Shopping, Finance). You can classify any assignment during composition or when editing details.',
    },
  ];

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
          <h2 className="font-serif italic text-4xl text-[#1A1A1A]">Editorial Correspondence</h2>
        </div>
        <span className="text-[10px] uppercase font-bold tracking-widest opacity-40 font-mono hidden md:inline">
          // Dispatch Support Desk
        </span>
      </div>

      {/* Two Column Newspaper Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Contact Form */}
        <div className="lg:col-span-7 bg-[#F9F8F6] border border-[#1A1A1A] p-6 space-y-6">
          <div className="border-b border-[#1A1A1A]/25 pb-3">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#C2410C] mb-1 font-mono flex items-center gap-2">
              <Mail className="h-3.5 w-3.5" /> Submit Letter to the Publisher
            </h3>
            <p className="text-xs text-slate-500 font-serif italic">
              Encountering technical difficulties or have operational feedback? Pen your dispatch below.
            </p>
          </div>

          {submittedMessage ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-emerald-50 border border-emerald-600 p-5 space-y-3"
            >
              <div className="flex items-center gap-2 text-emerald-800">
                <MessageSquare className="h-5 w-5 shrink-0" />
                <span className="font-serif font-bold text-lg">Dispatch Sent Successfully</span>
              </div>
              <p className="text-xs text-emerald-900 font-serif leading-relaxed">
                Your letter has been recorded in our dispatch logs. Our editorial support staff responds within 1 business cycle.
              </p>
              <div className="text-[10px] uppercase font-bold font-mono text-emerald-600 select-all">
                {submittedMessage}
              </div>
              <button 
                onClick={() => setSubmittedMessage(null)}
                className="mt-2 text-xs font-bold uppercase border border-emerald-700 px-3 py-1.5 hover:bg-emerald-700 hover:text-white transition-all cursor-pointer"
              >
                Send Another Letter
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                  Correspondent Address
                </label>
                <input
                  type="text"
                  disabled
                  value={userEmail}
                  className="w-full px-3 py-2 bg-slate-100 border border-[#1A1A1A]/30 text-slate-500 text-xs font-serif cursor-not-allowed opacity-75"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                  Subject Line / Department
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Recurrence bug, Feature suggestion, Desk configuration assistance"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-xs font-serif"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono mb-1">
                  Message Content
                </label>
                <textarea
                  required
                  rows={6}
                  placeholder="Please state files under audit, issues encountered, or system suggestions..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-[#1A1A1A] rounded-none outline-none focus:ring-1 focus:ring-[#C2410C] text-[#1A1A1A] text-xs font-serif resize-none"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="group relative flex items-center gap-2 border-2 border-[#1A1A1A] bg-[#1A1A1A] text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-transparent hover:text-[#1A1A1A] transition-all cursor-pointer disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      Dispatched...
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      Dispatch Letter
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Right Column: FAQs and Quick Reference Docs */}
        <div className="lg:col-span-5 space-y-6">
          {/* FAQ Column */}
          <div className="bg-[#F9F8F6] border border-[#1A1A1A] p-6 space-y-6">
            <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#C2410C] border-b border-[#1A1A1A]/20 pb-2 font-mono flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5 text-[#C2410C]" /> Frequently Consulted Indexes
            </h3>

            <div className="space-y-4">
              {faqs.map((faq, idx) => (
                <div key={idx} className="space-y-1">
                  <h4 className="text-sm font-serif font-bold text-[#1A1A1A] flex gap-1">
                    <span className="text-[#C2410C] font-mono select-none">{idx + 1}.</span> {faq.q}
                  </h4>
                  <p className="text-xs text-[#555] font-serif leading-relaxed pl-4 font-light">
                    {faq.a}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Desk Guide bulletin */}
          <div className="border border-[#1A1A1A]/30 bg-white p-5 space-y-3">
            <h4 className="text-xs uppercase font-bold tracking-widest font-mono flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-[#1A1A1A]/60" /> Quick Desk Instructions
            </h4>
            <div className="text-[11px] font-serif pr-2 text-slate-600 leading-relaxed space-y-2">
              <p>
                <strong>Priority Color Coding:</strong> Orange identifies critical High Urgency, Grey coordinates Medium assignments, and low-priority items are dimmed respectfully.
              </p>
              <p>
                <strong>System Alerts:</strong> Ensure you include correct calendar days and alert hours under composition to avoid missing crucial deadline publications.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
