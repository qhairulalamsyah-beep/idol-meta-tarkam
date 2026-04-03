'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, XCircle, CheckCircle, Settings2, ArrowLeft } from 'lucide-react';

interface AdminLoginProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (pin: string) => Promise<boolean>;
}

export function AdminLogin({ isOpen, onOpenChange, onLogin }: AdminLoginProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'login' | 'changepin'>('login');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('current');
  const [pinSuccess, setPinSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const PIN_LENGTH = 6;

  // Reset state function
  const resetState = useCallback(() => {
    setPin('');
    setError('');
    setMode('login');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setStep('current');
    setPinSuccess(false);
  }, []);

  // Auto focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      resetState();
    }
  }, [isOpen, resetState]);

  // Focus input when step changes in changepin mode
  useEffect(() => {
    if (isOpen && mode === 'changepin' && !isSubmitting) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [step, mode, isOpen, isSubmitting]);

  // Handle PIN input change
  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setError('');

    if (mode === 'login') {
      setPin(value);
      if (value.length === PIN_LENGTH) {
        handleLoginSubmit(value);
      }
    } else {
      if (step === 'current') {
        setCurrentPin(value);
        if (value.length === PIN_LENGTH) {
          // Verify current PIN first
          verifyCurrentPin(value);
        }
      } else if (step === 'new') {
        setNewPin(value);
        if (value.length === PIN_LENGTH) {
          setStep('confirm');
        }
      } else if (step === 'confirm') {
        setConfirmPin(value);
        if (value.length === PIN_LENGTH) {
          handleChangePin(currentPin, newPin, value);
        }
      }
    }
  };

  const handleLoginSubmit = async (pinValue: string) => {
    setIsSubmitting(true);
    setError('');
    
    const success = await onLogin(pinValue);
    setIsSubmitting(false);

    if (success) {
      setPin('');
      onOpenChange(false);
    } else {
      setError('PIN salah. Coba lagi.');
      setPin('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      inputRef.current?.focus();
    }
  };

  const verifyCurrentPin = async (pinValue: string) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pinValue }),
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setStep('new');
        setError('');
        // Focus input after step change with a small delay to ensure render is complete
        setIsSubmitting(false);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      } else {
        setError('PIN saat ini salah');
        setCurrentPin('');
        setShake(true);
        setTimeout(() => setShake(false), 600);
        setIsSubmitting(false);
        requestAnimationFrame(() => {
          inputRef.current?.focus();
        });
      }
    } catch {
      setError('Terjadi kesalahan');
      setCurrentPin('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      setIsSubmitting(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleChangePin = async (current: string, newPinVal: string, confirmVal: string) => {
    if (newPinVal !== confirmVal) {
      setError('PIN baru tidak cocok');
      setConfirmPin('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      inputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-pin', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin: current, newPin: newPinVal }),
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        setPinSuccess(true);
        setTimeout(() => {
          setPinSuccess(false);
          setMode('login');
          setCurrentPin('');
          setNewPin('');
          setConfirmPin('');
          setStep('current');
          setPin('');
          onOpenChange(false); // Close modal after success
        }, 2000);
      } else {
        setError(data.error || 'Gagal mengubah PIN');
        setConfirmPin('');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      setConfirmPin('');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setIsSubmitting(false);
  };

  const getCurrentPinValue = () => {
    if (mode === 'login') return pin;
    if (step === 'current') return currentPin;
    if (step === 'new') return newPin;
    return confirmPin;
  };

  const getStepTitle = () => {
    if (mode === 'login') return 'Masukkan PIN';
    if (step === 'current') return 'PIN Saat Ini';
    if (step === 'new') return 'PIN Baru';
    return 'Konfirmasi PIN';
  };

  const getStepSubtitle = () => {
    if (mode === 'login') return 'Masukkan 6 digit PIN admin';
    if (step === 'current') return 'Masukkan PIN lama Anda';
    if (step === 'new') return 'Buat PIN baru (6 digit)';
    return 'Masukkan ulang PIN baru';
  };

  const handleModeSwitch = (newMode: 'login' | 'changepin') => {
    setMode(newMode);
    setError('');
    setPinSuccess(false);
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setStep('current');
    setPin('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('new');
      setConfirmPin('');
    } else if (step === 'new') {
      setStep('current');
      setNewPin('');
    }
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => onOpenChange(false)}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* PIN Card */}
          <motion.div
            className="relative w-full max-w-[340px]"
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={
              shake
                ? {
                    x: [0, -12, 10, -8, 6, -3, 0],
                    scale: 1,
                    opacity: 1,
                    y: 0,
                  }
                : { scale: 1, opacity: 1, y: 0 }
            }
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={
              shake
                ? { x: { duration: 0.5, ease: 'easeInOut' }, scale: { duration: 0 }, opacity: { duration: 0 }, y: { duration: 0 } }
                : { type: 'spring', damping: 28, stiffness: 350 }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {/* Main Card */}
            <div className="relative bg-gradient-to-b from-white/[0.08] to-white/[0.04] rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
              {/* Ambient glow */}
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl" />
              
              {/* Content */}
              <div className="relative p-8 pt-10">
                {/* Back button for change pin */}
                {mode === 'changepin' && step !== 'current' && (
                  <motion.button
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={handleBack}
                    className="absolute top-6 left-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4 text-white/60" />
                  </motion.button>
                )}

                {/* Close button */}
                <button
                  onClick={() => onOpenChange(false)}
                  className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <XCircle className="w-4 h-4 text-white/40" />
                </button>

                {/* Success state */}
                <AnimatePresence mode="wait">
                  {pinSuccess ? (
                    <motion.div
                      key="success"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center py-8"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                        className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mb-5"
                      >
                        <CheckCircle className="w-10 h-10 text-emerald-400" />
                      </motion.div>
                      <p className="text-lg font-bold text-emerald-400">PIN Berhasil Diubah!</p>
                      <p className="text-xs text-white/30 mt-2">Kembali ke login...</p>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="pin-input"
                      className="flex flex-col items-center relative"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {/* Icon */}
                      <motion.div
                        className="relative mb-6"
                        initial={{ y: -8, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                      >
                        <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-amber-400/30 to-amber-600/10 blur-2xl opacity-70" />
                        <div className="relative w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/10 border border-amber-400/30 flex items-center justify-center">
                          {mode === 'login' ? (
                            <Fingerprint className="w-9 h-9 text-amber-400" />
                          ) : (
                            <Settings2 className="w-9 h-9 text-amber-400" />
                          )}
                        </div>
                      </motion.div>

                      {/* Title */}
                      <motion.h2
                        className="text-xl font-bold text-white/90 tracking-tight mb-1"
                        initial={{ y: -5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                      >
                        {getStepTitle()}
                      </motion.h2>
                      <motion.p
                        className="text-xs text-white/30 mb-8 font-medium"
                        initial={{ y: -5, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                      >
                        {getStepSubtitle()}
                      </motion.p>

                      {/* PIN Dots */}
                      <motion.div
                        className="flex items-center justify-center gap-4 mb-6"
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.25, duration: 0.35 }}
                      >
                        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                          const isFilled = getCurrentPinValue().length > i;
                          return (
                            <motion.div
                              key={i}
                              className="relative"
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.3 + i * 0.05 }}
                            >
                              {/* Outer ring */}
                              <div className={`w-5 h-5 rounded-full border-2 transition-all duration-300 ${
                                isFilled 
                                  ? 'border-amber-400 bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]' 
                                  : 'border-white/20 bg-transparent'
                              }`} />
                              {/* Inner dot when filled */}
                              {isFilled && (
                                <motion.div
                                  className="absolute inset-0 flex items-center justify-center"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                >
                                  <div className="w-2 h-2 rounded-full bg-amber-300" />
                                </motion.div>
                              )}
                            </motion.div>
                          );
                        })}
                      </motion.div>

                      {/* Hidden input - accessible for keyboard input */}
                      <input
                        ref={inputRef}
                        type="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="one-time-code"
                        value={getCurrentPinValue()}
                        onChange={handlePinChange}
                        className="absolute -top-10 left-0 w-1 h-1 opacity-0"
                        disabled={isSubmitting}
                        aria-label={getStepTitle()}
                      />

                      {/* Click to focus hint - clickable area */}
                      <button
                        type="button"
                        onClick={() => inputRef.current?.focus()}
                        className="w-full h-12 flex items-center justify-center text-xs text-white/20 hover:text-white/40 transition-colors mt-2"
                      >
                        {isSubmitting ? (
                          <motion.div
                            className="w-5 h-5 border-2 border-white/20 border-t-amber-400 rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}
                          />
                        ) : (
                          'Ketuk untuk memasukkan PIN'
                        )}
                      </button>

                      {/* Error */}
                      <AnimatePresence>
                        {error && (
                          <motion.div
                            initial={{ opacity: 0, y: -6, height: 0 }}
                            animate={{ opacity: 1, y: 0, height: 'auto' }}
                            exit={{ opacity: 0, y: -6, height: 0 }}
                            transition={{ duration: 0.25 }}
                            className="w-full mt-4"
                          >
                            <div className="flex items-center justify-center gap-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 font-medium">
                              <XCircle className="w-3.5 h-3.5 flex-shrink-0" />
                              {error}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Mode toggle */}
                      <div className="w-full mt-6 pt-5 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => handleModeSwitch(mode === 'login' ? 'changepin' : 'login')}
                          className="text-[11px] text-amber-400/50 hover:text-amber-400/80 font-medium transition-colors"
                        >
                          {mode === 'login' ? 'Ganti PIN' : '← Kembali ke Login'}
                        </button>
                      </div>

                      {/* Progress indicator for change pin */}
                      {mode === 'changepin' && (
                        <div className="flex items-center justify-center gap-2 mt-4">
                          {['current', 'new', 'confirm'].map((s, i) => (
                            <div
                              key={s}
                              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                step === s 
                                  ? 'bg-amber-400 scale-110' 
                                  : i < ['current', 'new', 'confirm'].indexOf(step)
                                    ? 'bg-amber-400/40'
                                    : 'bg-white/10'
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Bottom gradient */}
              <div className="h-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
