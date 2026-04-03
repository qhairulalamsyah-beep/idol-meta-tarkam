'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════
   PWA Install Prompt — Premium "Add to Home Screen" Component
   
   - Detects `beforeinstallprompt` event (Chrome/Edge/Android)
   - Shows a sleek bottom sheet after user has visited 2+ times
   - Stores dismiss state in localStorage (respects user choice)
   - iOS fallback: shows "Add to Home Screen" instructions
   ═══════════════════════════════════════════════════════════════════ */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'idm-pwa-install';
const VISIT_COUNT_KEY = 'idm-visit-count';
const MIN_VISITS_BEFORE_SHOW = 2;

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getInstallDismissed(): boolean {
  if (typeof window === 'undefined') return false;
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'dismissed' || v === 'installed';
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(getIsStandalone);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isInstalled = installed || getInstallDismissed();

  // Listen for beforeinstallprompt + appinstalled
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isInstalled) return;

    // Track visit count
    const visits = parseInt(localStorage.getItem(VISIT_COUNT_KEY) || '0', 10) + 1;
    localStorage.setItem(VISIT_COUNT_KEY, String(visits));

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

    if (isIOS && isSafari && visits >= MIN_VISITS_BEFORE_SHOW) {
      timerRef.current = setTimeout(() => setShowIosHint(true), 5000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }

    // Android/Chrome: listen for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (visits >= MIN_VISITS_BEFORE_SHOW) {
        timerRef.current = setTimeout(() => setShowPrompt(true), 5000);
      }
    };

    const installedHandler = () => {
      localStorage.setItem(STORAGE_KEY, 'installed');
      setInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    setIsAnimating(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      localStorage.setItem(STORAGE_KEY, 'installed');
    } else {
      localStorage.setItem(STORAGE_KEY, 'dismissed');
    }

    setShowPrompt(false);
    setDeferredPrompt(null);
    setIsAnimating(false);
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'dismissed');
    setShowPrompt(false);
    setShowIosHint(false);
  }, []);

  const handleShowNow = useCallback(() => {
    if (deferredPrompt) {
      setShowPrompt(true);
    }
  }, [deferredPrompt]);

  // Don't render if installed or dismissed
  if (isInstalled) return null;

  return (
    <>
      {/* ══════════ ANDROID/CHROME — Install Bottom Sheet ══════════ */}
      <AnimatePresence>
        {showPrompt && deferredPrompt && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
            />

            {/* Sheet */}
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[201] max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div
                className="mx-3 mb-3 rounded-3xl overflow-hidden relative"
                style={{
                  background: 'rgba(18, 18, 22, 0.95)',
                  backdropFilter: 'blur(64px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(64px) saturate(200%)',
                  border: '0.5px solid rgba(255, 214, 10, 0.12)',
                  boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 80px rgba(255, 214, 10, 0.05)',
                }}
              >
                {/* Glow line at top */}
                <div
                  className="h-[1px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(255,214,10,0.4) 30%, rgba(255,214,10,0.6) 50%, rgba(255,214,10,0.4) 70%, transparent)',
                  }}
                />

                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/15" />
                </div>

                {/* Content */}
                <div className="px-5 pb-5 pt-2">
                  {/* Close button */}
                  <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white/50" />
                  </button>

                  {/* Icon + Title */}
                  <div className="flex items-center gap-4 mb-4">
                    <motion.div
                      className="relative flex-shrink-0"
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, rgba(255,214,10,0.15), rgba(255,159,10,0.06))',
                          border: '0.5px solid rgba(255,214,10,0.15)',
                        }}
                      >
                        <img
                          src="/icon-192x192.png"
                          alt="IDOL META"
                          className="w-10 h-10"
                        />
                      </div>
                      {/* Notification dot */}
                      <div
                        className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center"
                        style={{ boxShadow: '0 0 8px rgba(255,214,10,0.5)' }}
                      >
                        <Sparkles className="w-2.5 h-2.5 text-black" />
                      </div>
                    </motion.div>

                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-white tracking-tight">
                        Install IDOL META
                      </h3>
                      <p className="text-[12px] text-white/45 mt-0.5 leading-relaxed">
                        Akses turnamen lebih cepat langsung dari home screen kamu!
                      </p>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { emoji: '\u26A1', label: 'Akses Cepat' },
                      { emoji: '\uD83D\uDCF1', label: 'Full Screen' },
                      { emoji: '\uD83D\uDD14', label: 'Notifikasi' },
                    ].map((f) => (
                      <div
                        key={f.label}
                        className="text-center py-2.5 rounded-xl"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          border: '0.5px solid rgba(255,255,255,0.05)',
                        }}
                      >
                        <span className="text-[18px]">{f.emoji}</span>
                        <p className="text-[9px] font-semibold text-white/50 uppercase tracking-wider mt-1">
                          {f.label}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Install Button */}
                  <motion.button
                    onClick={handleInstall}
                    disabled={isAnimating}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2.5"
                    style={{
                      background: 'linear-gradient(180deg, #FFD60A 0%, #CCAD08 100%)',
                      color: '#050507',
                      boxShadow: '0 2px 12px rgba(255,214,10,0.25), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                    whileHover={{ scale: 1.015, y: -1 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Download className="w-[18px] h-[18px]" />
                    Install Sekarang
                  </motion.button>

                  {/* Dismiss */}
                  <button
                    onClick={handleDismiss}
                    className="w-full mt-2.5 py-2 text-[12px] text-white/30 hover:text-white/50 transition-colors font-medium"
                  >
                    Nanti saja
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ iOS — Add to Home Screen Hint ══════════ */}
      <AnimatePresence>
        {showIosHint && (
          <>
            <motion.div
              className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleDismiss}
            />

            <motion.div
              className="fixed bottom-0 left-0 right-0 z-[201] max-w-md mx-auto"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 35 }}
            >
              <div
                className="mx-3 mb-3 rounded-3xl overflow-hidden relative"
                style={{
                  background: 'rgba(18, 18, 22, 0.95)',
                  backdropFilter: 'blur(64px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(64px) saturate(200%)',
                  border: '0.5px solid rgba(167, 139, 250, 0.12)',
                  boxShadow: '0 -4px 40px rgba(0,0,0,0.5), 0 0 80px rgba(167, 139, 250, 0.05)',
                }}
              >
                <div
                  className="h-[1px]"
                  style={{
                    background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4) 30%, rgba(167,139,250,0.6) 50%, rgba(167,139,250,0.4) 70%, transparent)',
                  }}
                />

                <div className="flex justify-center pt-3 pb-1">
                  <div className="w-10 h-1 rounded-full bg-white/15" />
                </div>

                <div className="px-5 pb-5 pt-2">
                  <button
                    onClick={handleDismiss}
                    className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-white/50" />
                  </button>

                  <div className="flex items-center gap-4 mb-5">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: 'linear-gradient(135deg, rgba(167,139,250,0.15), rgba(139,92,246,0.06))',
                        border: '0.5px solid rgba(167,139,250,0.15)',
                      }}
                    >
                      <img
                        src="/icon-192x192.png"
                        alt="IDOL META"
                        className="w-10 h-10"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[16px] font-bold text-white tracking-tight">
                        Tambahkan ke Home Screen
                      </h3>
                      <p className="text-[12px] text-white/45 mt-0.5">
                        Buka IDOL META langsung dari home screen
                      </p>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(59,130,246,0.10)',
                          border: '0.5px solid rgba(59,130,246,0.15)',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(96,165,250)" strokeWidth="1.5">
                          <path d="M12 5v14M5 12l7 7 7-7" />
                        </svg>
                      </div>
                      <p className="text-[13px] text-white/70">
                        Tap tombol <span className="font-bold text-white/90">Share</span> di browser
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(59,130,246,0.10)',
                          border: '0.5px solid rgba(59,130,246,0.15)',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgb(96,165,250)" strokeWidth="1.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </div>
                      <p className="text-[13px] text-white/70">
                        Scroll &amp; tap <span className="font-bold text-white/90">&quot;Add to Home Screen&quot;</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          background: 'rgba(255,214,10,0.10)',
                          border: '0.5px solid rgba(255,214,10,0.15)',
                        }}
                      >
                        <Sparkles className="w-[18px] h-[18px] text-amber-400" />
                      </div>
                      <p className="text-[13px] text-white/70">
                        Tap <span className="font-bold text-white/90">&quot;Add&quot;</span> untuk install
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDismiss}
                    className="w-full py-2.5 text-[12px] text-white/30 hover:text-white/50 transition-colors font-medium"
                  >
                    Mengerti, nanti saja
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════ FLOATING INSTALL BUTTON ══════════ */}
      {!showPrompt && !showIosHint && deferredPrompt && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 8, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          onClick={handleShowNow}
          className="fixed bottom-24 right-4 z-[50] lg:hidden flex items-center gap-2 px-3.5 py-2.5 rounded-2xl cursor-pointer"
          style={{
            background: 'rgba(18, 18, 22, 0.90)',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '0.5px solid rgba(255, 214, 10, 0.12)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 32px rgba(255,214,10,0.06)',
          }}
          whileHover={{ scale: 1.05, y: -1 }}
          whileTap={{ scale: 0.95 }}
        >
          <img src="/icon-96x96.png" alt="" className="w-6 h-6 rounded-lg" />
          <span className="text-[11px] font-semibold text-white/70">Install</span>
          <ChevronRight className="w-3.5 h-3.5 text-amber-400/60" />
        </motion.button>
      )}
    </>
  );
}
