'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useEffect } from 'react';
import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: Toast[];
  removeToast: (id: string) => void;
}

/* ── Premium icon configs with color-coded left border accent ── */
const iconMap: Record<ToastType, {
  icon: React.ReactNode;
  bg: string;
  accentBorder: string;
  accentGlow: string;
}> = {
  success: {
    icon: <CheckCircle className="w-[18px] h-[18px] text-emerald-400" />,
    bg: 'bg-emerald-500/10',
    accentBorder: 'border-l-emerald-500',
    accentGlow: '0 4px 24px rgba(52,211,153,0.08)',
  },
  error: {
    icon: <XCircle className="w-[18px] h-[18px] text-red-400" />,
    bg: 'bg-red-500/10',
    accentBorder: 'border-l-red-500',
    accentGlow: '0 4px 24px rgba(255,69,58,0.08)',
  },
  warning: {
    icon: <AlertTriangle className="w-[18px] h-[18px] text-amber-400" />,
    bg: 'bg-amber-500/10',
    accentBorder: 'border-l-amber-500',
    accentGlow: '0 4px 24px rgba(255,159,10,0.08)',
  },
  info: {
    icon: <Info className="w-[18px] h-[18px] text-amber-300" />,
    bg: 'bg-amber-300/10',
    accentBorder: 'border-l-amber-300',
    accentGlow: '0 4px 24px rgba(255,230,100,0.06)',
  },
};

/* ── Toast Container ── */
export function ToastContainer({ toasts, removeToast }: ToastContainerProps) {
  return (
    <div className="fixed top-20 left-4 right-4 z-[100] flex flex-col items-center gap-2.5 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Single Toast — Refined with solid bg + color-coded left border ── */
function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onRemove, 4000);
    return () => clearTimeout(timer);
  }, [onRemove]);

  const { icon, bg, accentBorder, accentGlow } = iconMap[toast.type];

  return (
    <motion.div
      className={`pointer-events-auto rounded-2xl border-l-[3px] ${accentBorder} px-4 py-3.5 max-w-sm w-full`}
      style={{
        boxShadow: accentGlow,
        background: 'linear-gradient(180deg, rgba(40,40,45,0.97) 0%, rgba(30,30,35,0.98) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      initial={{ opacity: 0, y: -30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.9, filter: 'blur(4px)' }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 28,
      }}
      layout
    >
      <div className="flex items-center gap-3">
        {/* Colored circle icon */}
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
          {icon}
        </div>

        {/* Message — Refined typography */}
        <p className="flex-1 text-[13px] font-semibold text-white leading-snug tracking-tight">
          {toast.message}
        </p>

        {/* Close button */}
        <button
          onClick={onRemove}
          className="flex-shrink-0 w-7 h-7 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/40 hover:text-white/70 transition-all duration-200 active:scale-90"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

/* ── Toast Zustand Store ── */
interface ToastState {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  addToast: (message, type) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
