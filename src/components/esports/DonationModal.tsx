'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import {
  X,
  Heart,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  QrCode,
  Building2,
  Wallet,
  Copy,
} from 'lucide-react';

interface DonationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  division: 'male' | 'female';
  totalDonation?: number;
  onDonate?: (amount: number, message: string, anonymous: boolean, paymentMethod: string) => void;
}

type PaymentStep = 1 | 2 | 3;
type PaymentMethod = 'qris' | 'bank_transfer' | 'ewallet';

const DONATION_PRESETS = [5000, 10000, 25000, 50000, 100000, 250000];
const GOAL_AMOUNT = 5000000;

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof QrCode; description: string }[] = [
  { id: 'qris', label: 'QRIS', icon: QrCode, description: 'Scan QR untuk bayar' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Transfer via bank' },
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet, description: 'GoPay / OVO / DANA' },
];

export function DonationModal({
  isOpen,
  onOpenChange,
  division,
  totalDonation = 0,
  onDonate,
}: DonationModalProps) {
  const isMale = division === 'male';
  const cardClass = isMale ? 'card-gold' : 'card-pink';
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const accentColor = isMale ? 'text-amber-400' : 'text-violet-400';

  const [paymentStep, setPaymentStep] = useState<PaymentStep>(1);
  const [amount, setAmount] = useState(10000);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('qris');
  const [copied, setCopied] = useState(false);

  const effectiveAmount = customAmount ? parseInt(customAmount) || 0 : amount;
  const progress = Math.min((totalDonation / GOAL_AMOUNT) * 100, 100);

  const goBack = () => {
    if (paymentStep > 1) {
      setPaymentStep((paymentStep - 1) as PaymentStep);
    }
  };

  const closeModal = () => {
    onOpenChange(false);
    setTimeout(() => setPaymentStep(1), 300);
  };

  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentStep(3);
  };

  const handleConfirmPayment = () => {
    onDonate?.(effectiveAmount, message, anonymous, selectedPaymentMethod);
    closeModal();
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const stepLabels = ['Nominal', 'Metode', 'Konfirmasi'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={closeModal}
        >
          <motion.div
            className={`w-full max-w-md rounded-t-[28px] p-6 ${cardClass} overflow-y-auto`}
            style={{ maxHeight: 'calc(100dvh - 80px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                {paymentStep > 1 && (
                  <motion.button
                    onClick={goBack}
                    className="p-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 transition-colors"
                    whileTap={{ scale: 0.95 }}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </motion.button>
                )}
                <div>
                  <h2 className="text-[18px] font-bold text-white/90 flex items-center gap-2">
                    <Heart className="w-5 h-5 text-red-400" fill="currentColor" />
                    Dukung Liga
                  </h2>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Donasi untuk Season 2
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2.5 rounded-xl bg-white/8 text-white/50 hover:bg-white/12 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center justify-center gap-2 mb-5">
              {stepLabels.map((label, i) => {
                const stepNum = (i + 1) as PaymentStep;
                const isActive = paymentStep === stepNum;
                const isDone = paymentStep > stepNum;
                return (
                  <div key={label} className="flex items-center gap-2">
                    {i > 0 && (
                      <div className={`w-6 h-[2px] rounded-full transition-colors ${isDone ? 'bg-red-400' : 'bg-white/10'}`} />
                    )}
                    <div className="flex items-center gap-1.5">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                        isActive
                          ? 'bg-red-500 text-white'
                          : isDone
                            ? 'bg-red-400/20 text-red-400'
                            : 'bg-white/5 text-white/25'
                      }`}>
                        {isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : stepNum}
                      </div>
                      <span className={`text-[10px] font-semibold tracking-wide uppercase ${
                        isActive ? 'text-white/90' : 'text-white/25'
                      }`}>
                        {label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress Info */}
            <div className="glass-heavy rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] text-white/35">Terkumpul</span>
                <span className="text-[11px] text-white/35">{Math.round(progress)}%</span>
              </div>
              <div className="h-2 bg-white/[0.04] rounded-full overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-red-400">Rp {totalDonation.toLocaleString('id-ID')}</span>
                <span className="text-[11px] text-white/25">Target Rp {GOAL_AMOUNT.toLocaleString('id-ID')}</span>
              </div>
            </div>

            {/* STEP 1: Amount Selection */}
            <AnimatePresence mode="wait">
              {paymentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Preset Amounts */}
                  <div className="grid grid-cols-3 gap-2">
                    {DONATION_PRESETS.map((amt) => (
                      <motion.button
                        key={amt}
                        onClick={() => { setAmount(amt); setCustomAmount(''); }}
                        className={`rounded-xl p-3 text-center transition-all ${
                          amount === amt && !customAmount
                            ? 'bg-red-500/20 border border-red-500/30'
                            : 'bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06]'
                        }`}
                        whileTap={{ scale: 0.95 }}
                      >
                        <p className={`text-[13px] font-bold ${amount === amt && !customAmount ? 'text-red-400' : 'text-white/70'}`}>
                          Rp {amt.toLocaleString('id-ID')}
                        </p>
                      </motion.button>
                    ))}
                  </div>

                  {/* Custom Amount */}
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-2 block">
                      Nominal Lainnya
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/35 text-sm">Rp</span>
                      <input
                        type="number"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Masukkan nominal"
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl pl-12 pr-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-red-500/30"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div>
                    <label className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-2 block">
                      Pesan (opsional)
                    </label>
                    <input
                      type="text"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Tulis pesan dukungan..."
                      maxLength={100}
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-red-500/30"
                    />
                  </div>

                  {/* Anonymous Toggle */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${
                        anonymous ? 'bg-red-500' : 'bg-white/[0.06] border border-white/[0.1]'
                      }`}
                    >
                      {anonymous && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className="text-[13px] text-white/60">Sembunyikan nama saya</span>
                  </label>

                  {/* Continue Button */}
                  <motion.button
                    onClick={() => setPaymentStep(2)}
                    disabled={effectiveAmount <= 0}
                    className={`${btnClass} btn-ios w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>Lanjut ke Pembayaran</span>
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </motion.div>
              )}

              {/* STEP 2: Payment Method */}
              {paymentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-3"
                >
                  {/* Amount Summary */}
                  <div className="glass-heavy rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Total donasi</span>
                      <span className="text-xl font-bold text-red-400">Rp {effectiveAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Payment Methods */}
                  <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-2">
                    Pilih Metode Pembayaran
                  </p>
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    return (
                      <motion.button
                        key={method.id}
                        onClick={() => handleSelectPaymentMethod(method.id)}
                        className="w-full glass-heavy rounded-2xl p-4 flex items-center gap-4 hover:bg-white/[0.04] transition-colors"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="w-11 h-11 rounded-xl bg-white/[0.06] flex items-center justify-center">
                          <Icon className="w-5 h-5 text-white/60" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-[14px] font-semibold text-white/90">{method.label}</p>
                          <p className="text-[11px] text-white/35">{method.description}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20" />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* STEP 3: Confirmation */}
              {paymentStep === 3 && (
                <motion.div
                  key="step-3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Payment Info */}
                  <div className="glass-heavy rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Metode</span>
                      <span className="text-white/90 font-medium">
                        {paymentMethods.find(m => m.id === selectedPaymentMethod)?.label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">Total</span>
                      <span className="text-xl font-bold text-red-400">Rp {effectiveAmount.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Payment Instructions */}
                  {selectedPaymentMethod === 'qris' && (
                    <div className="glass-heavy rounded-2xl p-4 text-center">
                      <QrCode className="w-16 h-16 text-white/20 mx-auto mb-3" />
                      <p className="text-[13px] text-white/60 mb-2">
                        Scan QR Code untuk melakukan pembayaran
                      </p>
                      <p className="text-[11px] text-white/35">
                        QR akan ditampilkan setelah konfirmasi
                      </p>
                    </div>
                  )}

                  {selectedPaymentMethod === 'bank_transfer' && (
                    <div className="glass-heavy rounded-2xl p-4 space-y-3">
                      <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">
                        Rekening Tujuan
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/90 font-medium">Bank BCA</p>
                          <p className="text-xl font-bold text-white/90">1234567890</p>
                          <p className="text-[12px] text-white/50">a.n. IDOL META</p>
                        </div>
                        <motion.button
                          onClick={() => handleCopy('1234567890')}
                          className="p-2 rounded-xl bg-white/[0.06]"
                          whileTap={{ scale: 0.95 }}
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {selectedPaymentMethod === 'ewallet' && (
                    <div className="glass-heavy rounded-2xl p-4 space-y-3">
                      <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">
                        E-Wallet Tujuan
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/90 font-medium">GoPay / OVO / DANA</p>
                          <p className="text-xl font-bold text-white/90">081234567890</p>
                          <p className="text-[12px] text-white/50">a.n. IDOL META</p>
                        </div>
                        <motion.button
                          onClick={() => handleCopy('081234567890')}
                          className="p-2 rounded-xl bg-white/[0.06]"
                          whileTap={{ scale: 0.95 }}
                        >
                          {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Confirm Button */}
                  <motion.button
                    onClick={handleConfirmPayment}
                    className="w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 bg-red-500 text-white"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Heart className="w-5 h-5" fill="currentColor" />
                    <span>Saya Sudah Bayar</span>
                  </motion.button>

                  <p className="text-[11px] text-white/30 text-center">
                    Konfirmasi setelah melakukan pembayaran
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
