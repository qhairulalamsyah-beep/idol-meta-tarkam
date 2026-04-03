'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Eye, EyeOff, LogIn, X, Lock, Fingerprint, XCircle, KeyRound, CheckCircle } from 'lucide-react';

interface AdminLoginProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onLogin: (username: string, password: string) => Promise<boolean>;
}

export function AdminLogin({ isOpen, onOpenChange, onLogin }: AdminLoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change password state
  const [mode, setMode] = useState<'login' | 'changepw'>('login');
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSubmitting, setPwSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setIsSubmitting(true);
    const success = await onLogin(username.trim(), password);
    setIsSubmitting(false);

    if (success) {
      setUsername('');
      setPassword('');
      setError('');
      onOpenChange(false);
    } else {
      setError('Username atau password salah');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !currentPass.trim() || !newPass.trim()) {
      setError('Semua field wajib diisi');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    if (newPass.length < 4) {
      setError('Password baru minimal 4 karakter');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    if (newPass !== confirmPass) {
      setError('Konfirmasi password tidak cocok');
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }

    setPwSubmitting(true);
    try {
      const res = await fetch('/api/admin/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), currentPassword: currentPass, newPassword: newPass }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPwSuccess(true);
        setTimeout(() => {
          setPwSuccess(false);
          setMode('login');
          setCurrentPass('');
          setNewPass('');
          setConfirmPass('');
        }, 2000);
      } else {
        setError(data.error || 'Gagal mengubah password');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      }
    } catch {
      setError('Terjadi kesalahan jaringan');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
    setPwSubmitting(false);
  };

  const handleModeSwitch = (newMode: 'login' | 'changepw') => {
    setMode(newMode);
    setError('');
    setPwSuccess(false);
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
  };

  // Shared input styling
  const inputClass = 'w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-12 py-3.5 text-white/90 text-[14px] font-medium placeholder-white/15 focus:outline-none focus:border-amber-400/30 focus:bg-amber-400/[0.02] focus:shadow-[0_0_24px_rgba(255,214,10,0.08)] transition-all duration-300 lg:text-base lg:px-4 lg:py-3';
  const labelClass = 'text-[10px] text-white/30 uppercase tracking-[0.15em] font-bold mb-2 block';
  const iconClass = 'w-4 h-4 text-white/15 group-focus-within:text-amber-400/60 transition-colors duration-300';
  const toggleBtnClass = 'absolute right-3 top-1/2 -translate-y-1/2 text-white/15 hover:text-white/40 transition-colors duration-200 p-1.5 rounded-lg hover:bg-white/5';

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
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Login Card */}
          <motion.div
            key={mode}
            className="relative w-full max-w-sm lg:max-w-md glass rounded-[28px] overflow-hidden"
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
            {/* Holographic overlay */}
            <div className="absolute inset-0 pointer-events-none" />

            {/* Content */}
            <div className="relative p-8 pb-9">
              {/* Icon + Title */}
              <div className="flex flex-col items-center mb-7">
                <motion.div
                  className="relative mb-4"
                  initial={{ y: -8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
                >
                  {/* Glow behind icon */}
                  <div className="absolute -inset-3 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-600/5 blur-xl opacity-60" />
                  <div className="relative w-[68px] h-[68px] rounded-2xl bg-gradient-to-br from-amber-400/15 to-amber-600/8 border border-amber-400/20 flex items-center justify-center">
                    {mode === 'login' ? (
                      <Fingerprint className="w-8 h-8 text-amber-400" />
                    ) : (
                      <KeyRound className="w-8 h-8 text-amber-400" />
                    )}
                  </div>
                </motion.div>
                <motion.h2
                  className="text-[20px] font-bold text-white/90 tracking-tight"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  {mode === 'login' ? 'Admin Access' : 'Ganti Password'}
                </motion.h2>
                <motion.p
                  className="text-[12px] text-white/25 mt-1.5 font-medium"
                  initial={{ y: -5, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                >
                  {mode === 'login' ? 'Masukkan kredensial admin' : 'Masukkan username dan password'}
                </motion.p>
              </div>

              {/* Success state */}
              <AnimatePresence mode="wait">
                {pwSuccess ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center justify-center py-6"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}
                      className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mb-4"
                    >
                      <CheckCircle className="w-8 h-8 text-emerald-400" />
                    </motion.div>
                    <p className="text-[14px] font-bold text-emerald-400">Password berhasil diubah!</p>
                    <p className="text-[11px] text-white/30 mt-1.5">Kembali ke login...</p>
                  </motion.div>
                ) : mode === 'login' ? (
                  /* Login Form */
                  <motion.form
                    key="login"
                    onSubmit={handleSubmit}
                    className="space-y-4"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                  >
                    {/* Username */}
                    <div>
                      <label className={labelClass}>Username</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Shield className={iconClass} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="admin"
                          autoComplete="off"
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className={labelClass}>Password</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className={iconClass} />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className={toggleBtnClass}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/8 border border-red-500/12 rounded-xl px-4 py-3 font-medium">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={isSubmitting}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full btn-gold btn-ios py-4 lg:py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold mt-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? (
                        <motion.div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6 }} />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      {isSubmitting ? 'Memverifikasi...' : 'Masuk'}
                    </motion.button>

                    {/* Mode toggle link */}
                    <div className="text-center pt-3">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('changepw')}
                        className="text-[11px] text-amber-400/50 hover:text-amber-400/80 font-medium transition-colors"
                      >
                        Ganti Password
                      </button>
                    </div>
                  </motion.form>
                ) : (
                  /* Change Password Form */
                  <motion.form
                    key="changepw"
                    onSubmit={handleChangePassword}
                    className="space-y-3.5"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ delay: 0.25, duration: 0.35 }}
                  >
                    {/* Username */}
                    <div>
                      <label className={labelClass}>Username</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Shield className={iconClass} />
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="admin"
                          autoComplete="off"
                          autoFocus
                          className={inputClass}
                        />
                      </div>
                    </div>

                    {/* Current Password */}
                    <div>
                      <label className={labelClass}>Password saat ini</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className={iconClass} />
                        </div>
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPass}
                          onChange={(e) => setCurrentPass(e.target.value)}
                          placeholder="••••••••"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className={toggleBtnClass}
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className={labelClass}>Password baru</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <KeyRound className={iconClass} />
                        </div>
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPass}
                          onChange={(e) => setNewPass(e.target.value)}
                          placeholder="Min. 4 karakter"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className={toggleBtnClass}
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className={labelClass}>Konfirmasi password baru</label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                          <Lock className={iconClass} />
                        </div>
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPass}
                          onChange={(e) => setConfirmPass(e.target.value)}
                          placeholder="Ulangi password baru"
                          className={inputClass}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className={toggleBtnClass}
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Error */}
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -6, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -6, height: 0 }}
                          transition={{ duration: 0.25 }}
                        >
                          <div className="flex items-center gap-2 text-[12px] text-red-400 bg-red-500/8 border border-red-500/12 rounded-xl px-4 py-3 font-medium">
                            <XCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Submit */}
                    <motion.button
                      type="submit"
                      disabled={pwSubmitting}
                      whileHover={{ scale: 1.01, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full btn-gold btn-ios py-4 lg:py-3.5 flex items-center justify-center gap-2.5 text-[14px] font-bold mt-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {pwSubmitting ? (
                        <motion.div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.6 }} />
                      ) : (
                        <KeyRound className="w-4 h-4" />
                      )}
                      {pwSubmitting ? 'Mengubah...' : 'Ubah Password'}
                    </motion.button>

                    {/* Mode toggle link */}
                    <div className="text-center pt-3">
                      <button
                        type="button"
                        onClick={() => handleModeSwitch('login')}
                        className="text-[11px] text-amber-400/50 hover:text-amber-400/80 font-medium transition-colors"
                      >
                        ← Kembali ke Login
                      </button>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
