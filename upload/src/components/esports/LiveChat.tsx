'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Users } from 'lucide-react';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface LiveChatProps {
  tournamentId?: string;
  division: 'male' | 'female';
}

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  message: string;
  timestamp: string;
}

/* ────────────────────────────────────────────
   Avatar Gradient Presets (deterministic by userId)
   ──────────────────────────────────────────── */

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #FF6B6B, #EE5A24)',
  'linear-gradient(135deg, #48DBFB, #0ABDE3)',
  'linear-gradient(135deg, #FECA57, #FF9F43)',
  'linear-gradient(135deg, #5F27CD, #341F97)',
  'linear-gradient(135deg, #1DD1A1, #10AC84)',
  'linear-gradient(135deg, #A78BFA, #7C3AED)',
  'linear-gradient(135deg, #54A0FF, #2E86DE)',
  'linear-gradient(135deg, #F368E0, #BE2EDD)',
];

function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

function getAvatarGradient(userId: string): string {
  return AVATAR_GRADIENTS[hashUserId(userId) % AVATAR_GRADIENTS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 10) return 'Baru';
  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}j`;
  return `${diffDay}h`;
}

/* ────────────────────────────────────────────
   Division Adaptive Color Tokens
   ──────────────────────────────────────────── */

function getChatTokens(division: 'male' | 'female') {
  const isMale = division === 'male';
  return {
    sendBtnBg: isMale
      ? 'bg-gradient-to-r from-amber-400 to-yellow-500'
      : 'bg-gradient-to-r from-purple-400 to-violet-500',
    sendBtnHover: isMale
      ? 'hover:from-amber-500 hover:to-yellow-600'
      : 'hover:from-purple-500 hover:to-violet-600',
    sendBtnText: isMale ? 'text-black' : 'text-white/90',
    sendBtnShadow: isMale
      ? 'shadow-[0_2px_12px_rgba(251,191,36,0.25)]'
      : 'shadow-[0_2px_12px_rgba(192,132,252,0.25)]',
    accentColor: isMale ? '#FFD60A' : '#A78BFA',
    borderGradient: isMale
      ? 'from-amber-500/30 via-yellow-400/10 to-amber-500/30'
      : 'from-purple-500/30 via-violet-400/10 to-purple-500/30',
    inputFocusBorder: isMale
      ? 'focus:border-amber-400/30'
      : 'focus:border-purple-400/30',
    headerGradient: isMale
      ? 'from-amber-400/80 via-yellow-300/70 to-amber-400/80'
      : 'from-purple-400/80 via-violet-300/70 to-purple-400/80',
  };
}

/* ────────────────────────────────────────────
   LiveChat Component
   ──────────────────────────────────────────── */

export function LiveChat({ tournamentId, division }: LiveChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const t = getChatTokens(division);
  const MAX_MESSAGES = 200;

  /* ── Reset on tournamentId change ── */
  useEffect(() => {
    setMessages([]);
    setInputValue('');
    setIsOpen(false);
  }, [tournamentId]);

  /* ── Auto-scroll to bottom ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Focus input when chat opens ── */
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [isOpen]);

  /* ── Polling ── */
  const fetchMessages = useCallback(async () => {
    if (!tournamentId) return;
    try {
      const res = await fetch(`/api/tournaments/chat?tournamentId=${encodeURIComponent(tournamentId)}`);
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const newMsgs = data.filter((m) => !existingIds.has(m.id));
        const merged = [...prev, ...newMsgs];
        return merged.slice(-MAX_MESSAGES);
      });
    } catch {
      // Silent fail — will retry on next poll
    }
  }, [tournamentId]);

  useEffect(() => {
    if (isOpen && tournamentId) {
      // Initial fetch
      setIsLoading(true);
      fetchMessages().finally(() => setIsLoading(false));

      // Start polling
      pollIntervalRef.current = setInterval(fetchMessages, 5000);
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [isOpen, tournamentId, fetchMessages]);

  /* ── Send Message ── */
  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || !tournamentId || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch('/api/tournaments/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId,
          userId: 'anon',
          userName: 'Pengunjung',
          message: text,
        }),
      });

      if (res.ok) {
        setInputValue('');
        // Immediately fetch to get the new message with server-assigned ID
        await fetchMessages();
      }
    } catch {
      // Silent fail
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Close handler ── */
  const handleClose = () => {
    setIsOpen(false);
    setMessages([]);
  };

  /* ── Don't render if no tournament ── */
  if (!tournamentId) return null;

  return (
    <>
      {/* ═══════════════════════════════════════
          Chat Panel (Slide-up Overlay)
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-sm lg:hidden"
              onClick={handleClose}
            />

            {/* Panel - with drag to close */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed bottom-0 left-0 right-0 z-[56] lg:hidden rounded-t-3xl overflow-hidden"
              style={{
                maxHeight: '85vh',
                background: 'var(--glass-bg-heavy)',
                backdropFilter: 'blur(64px) saturate(200%)',
                WebkitBackdropFilter: 'blur(64px) saturate(200%)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 -8px 48px rgba(0,0,0,0.5)',
              }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.5 }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 100 || info.velocity.y > 500) {
                  handleClose();
                }
              }}
            >
              {/* Gradient top border */}
              <div className={`absolute top-0 left-6 right-6 h-px bg-gradient-to-r ${t.borderGradient} rounded-full`} />

              <div className="flex flex-col" style={{ height: '85vh' }}>
                {/* ── Drag Handle ── */}
                <div className="flex justify-center pt-3 pb-1 flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <div className="w-10 h-1 rounded-full bg-white/20" />
                </div>

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="relative">
                      <MessageSquare className="w-5 h-5 text-white/80" strokeWidth={2} />
                      <motion.div
                        className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
                        style={{ background: '#30D158' }}
                        animate={{ scale: [1, 1.3, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      />
                    </div>
                    <h3
                      className={`text-sm font-bold tracking-tight bg-gradient-to-r ${t.headerGradient} bg-clip-text text-transparent`}
                    >
                      Live Chat
                    </h3>
                    {messages.length > 0 && (
                      <span className="text-[10px] font-semibold text-white/30 bg-white/[0.06] px-2 py-0.5 rounded-full">
                        {messages.length}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px] font-medium text-white/30">
                      <Users className="w-3 h-3" />
                      <span>Anon</span>
                    </span>
                  </div>
                </div>

                {/* Divider */}
                <div className="divider mx-5 flex-shrink-0" />

                {/* ── Message List ── */}
                <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 no-scrollbar">
                  {isLoading && messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="flex items-center gap-2 text-white/30 text-xs">
                        <motion.div
                          className="w-4 h-4 border-2 border-white/20 border-t-white/50 rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        <span>Memuat chat...</span>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-white/25">
                      <MessageSquare className="w-10 h-10" strokeWidth={1.2} />
                      <span className="text-xs font-medium">Belum ada pesan</span>
                      <span className="text-[10px]">Jadilah yang pertama!</span>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {messages.map((msg) => {
                        const gradient = getAvatarGradient(msg.userId);
                        const initials = getInitials(msg.userName);
                        const isMe = msg.userId === 'anon';

                        return (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2, ease: 'easeOut' }}
                            className={`flex items-start gap-2.5 py-1.5 px-1 rounded-xl transition-colors duration-150 ${
                              isMe ? 'bg-white/[0.02]' : 'hover:bg-white/[0.015]'
                            }`}
                          >
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-bold text-white shadow-sm"
                              style={{
                                background: gradient,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              }}
                            >
                              {initials}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-baseline gap-2">
                                <span className="text-[12px] font-bold text-white/80 truncate">
                                  {msg.userName}
                                </span>
                                <span className="text-[10px] text-white/25 flex-shrink-0 tabular-nums">
                                  {getRelativeTime(msg.timestamp)}
                                </span>
                              </div>
                              <p className="text-[12.5px] text-white/60 leading-relaxed break-words mt-0.5">
                                {msg.message}
                              </p>
                            </div>
                          </motion.div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div className="divider mx-5 flex-shrink-0" />

                {/* ── Input Area ── */}
                <div className="flex items-center gap-2 px-4 py-3 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
                  <div className="flex-1 relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ketik pesan..."
                      maxLength={300}
                      className={`w-full h-10 rounded-xl bg-white/[0.05] text-white/80 text-[13px] px-4 outline-none transition-all duration-200 placeholder:text-white/25 ${t.inputFocusBorder}`}
                      style={{
                        border: '0.5px solid rgba(255,255,255,0.06)',
                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
                      }}
                    />
                  </div>

                  <motion.button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || isSending}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer outline-none transition-all duration-200 flex-shrink-0 ${t.sendBtnBg} ${t.sendBtnShadow}`}
                    whileTap={{ scale: 0.88 }}
                    whileHover={inputValue.trim() ? { scale: 1.06 } : {}}
                    transition={{ type: 'spring', stiffness: 460, damping: 22 }}
                    style={{ opacity: inputValue.trim() && !isSending ? 1 : 0.4 }}
                  >
                    <Send className={`w-4 h-4 ${t.sendBtnText}`} strokeWidth={2} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
