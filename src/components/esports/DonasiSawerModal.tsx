'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Heart,
  Gift,
  X,
  Sparkles,
  Shield,
  ChevronLeft,
  CheckCircle2,
  QrCode,
  Building2,
  Wallet,
  Copy,
  Camera,
  Upload,
  Trash2,
  Loader2,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════
   Payment Settings Type
   ═══════════════════════════════════════════════════ */

interface PaymentSettings {
  bankName: string;
  bankCode: string;
  bankNumber: string;
  bankHolder: string;
  gopayNumber: string;
  gopayHolder: string;
  ovoNumber: string;
  ovoHolder: string;
  danaNumber: string;
  danaHolder: string;
  qrisLabel: string;
  qrisImage: string;
  activeMethods: string[];
}

/* ═══════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════ */

type PaymentMethod = 'qris' | 'bank_transfer' | 'ewallet';
type PaymentStep = 1 | 2 | 3 | 4;

interface DonasiSawerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  division: 'male' | 'female';
  totalDonation?: number;
  totalSawer?: number;
  tournamentPrizePool?: number;
  onDonate: (amount: number, message: string, anonymous: boolean, paymentMethod: string, proofUrl?: string, donorName?: string) => void;
  onSawer: (data: {
    senderName: string;
    senderAvatar?: string;
    targetPlayerName?: string;
    amount: number;
    message?: string;
    paymentMethod: string;
    proofUrl?: string;
  }) => Promise<boolean>;
  defaultTab?: 'sawer' | 'donasi';
}

/* ═══════════════════════════════════════════════════
   Constants & Helpers
   ═══════════════════════════════════════════════════ */

const GOAL_AMOUNT = 5000000;
const donasiPresets = [2000, 5000, 10000, 20000, 50000, 100000];
const sawerPresets = [2000, 5000, 10000, 20000, 50000, 100000];
const quickMessages = [
  'Semangat kaka! 🔥',
  'Keren banget! 💪',
  'Bejir! 🎮',
  'Mantap! 👏',
  'Need CP! ✨',
  'Hadir bos! 💰',
];

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof QrCode; description: string }[] = [
  { id: 'qris', label: 'QRIS', icon: QrCode, description: 'Scan QR untuk bayar' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Transfer via bank' },
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet, description: 'GoPay / OVO / DANA' },
];

function getAmountStyle(amount: number) {
  if (amount >= 50000)
    return { gradient: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400', bg: 'bg-amber-500/15', ring: 'ring-amber-400/30', icon: 'text-amber-400' };
  if (amount >= 20000)
    return { gradient: 'bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400', bg: 'bg-purple-500/15', ring: 'ring-purple-400/30', icon: 'text-purple-400' };
  if (amount >= 10000)
    return { gradient: 'bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400', bg: 'bg-blue-500/15', ring: 'ring-blue-400/30', icon: 'text-blue-400' };
  return { gradient: 'bg-gradient-to-r from-emerald-400 to-green-500', bg: 'bg-emerald-500/12', ring: 'ring-emerald-400/20', icon: 'text-emerald-400' };
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export function DonasiSawerModal({
  isOpen,
  onOpenChange,
  division,
  totalDonation = 0,
  totalSawer = 0,
  tournamentPrizePool = 0,
  onDonate,
  onSawer,
  defaultTab = 'sawer',
}: DonasiSawerModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sawer' | 'donasi'>(defaultTab);

  // ── Payment settings ──
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(true);

  // ── Modal payment flow state ──
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('qris');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // ── Sawer state ──
  const [sawerAmount, setSawerAmount] = useState(2000);
  const [sawerCustom, setSawerCustom] = useState('');
  const [sawerMessage, setSawerMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAvatar, setSenderAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Donasi state ──
  const [donasiAmount, setDonasiAmount] = useState(5000);
  const [donasiCustom, setDonasiCustom] = useState('');
  const [donasiMessage, setDonasiMessage] = useState('');
  const [donorName, setDonorName] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  // ── Proof of payment state ──
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const proofInputRef = useRef<HTMLInputElement>(null);

  const isMale = division === 'male';
  const cardClass = isMale ? 'card-gold' : 'card-pink';
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const gradientClass = isMale ? 'gradient-gold' : 'gradient-pink';
  const accentColor = isMale ? 'text-amber-400' : 'text-violet-400';
  const accentBg = isMale ? 'bg-amber-500/12' : 'bg-violet-500/12';

  const sawerEffective = sawerCustom ? parseFloat(sawerCustom) || 0 : sawerAmount;
  const donasiEffective = donasiCustom ? parseInt(donasiCustom) || 0 : donasiAmount;

  // ── Current effective amount for the payment modal ──
  const effectiveAmount = activeSubTab === 'sawer' ? sawerEffective : donasiEffective;

  // Fetch payment settings
  const fetchPaymentSettings = useCallback(() => {
    setPaymentSettingsLoading(true);
    fetch('/api/payment-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) setPaymentSettings(data.settings);
      })
      .catch(() => {})
      .finally(() => setPaymentSettingsLoading(false));
  }, []);

  useEffect(() => {
    fetchPaymentSettings();
  }, [fetchPaymentSettings]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setPaymentStep(1);
        setActiveSubTab(defaultTab);
        setSawerAmount(2000);
        setSawerCustom('');
        setSawerMessage('');
        setSenderName('');
        setDonasiAmount(5000);
        setDonasiCustom('');
        setDonasiMessage('');
        setDonorName('');
        setAnonymous(false);
        setProofFile(null);
        if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
        setProofPreviewUrl(null);
      }, 300);
    }
  }, [isOpen, defaultTab, proofPreviewUrl]);

  // Update active tab when defaultTab prop changes
  useEffect(() => {
    if (isOpen) {
      setActiveSubTab(defaultTab);
    }
  }, [isOpen, defaultTab]);

  // ── Modal step navigation ──
  const goBack = () => {
    if (paymentStep > 1) {
      setPaymentStep((paymentStep - 1) as PaymentStep);
    } else {
      onOpenChange(false);
    }
  };

  const closeModal = () => {
    onOpenChange(false);
  };

  // ── Step 1 → Step 2: User clicks "Sawer" or "Donasi" button ──
  const handleProceedToPayment = () => {
    if (effectiveAmount <= 0) return;
    setPaymentStep(2);
  };

  // ── Step 2 → Step 3: User selects payment method ──
  const handleSelectPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentStep(3);
    setCopiedAccount(false);
  };

  // ── Step 3 → Step 4: User clicks "Sudah Bayar" ──
  const handleConfirmPayment = async () => {
    setIsSubmitting(true);
    try {
      // Upload proof image if selected
      let proofUrl: string | undefined;
      if (proofFile) {
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', proofFile);
        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.success) {
          proofUrl = uploadData.url;
        }
        setIsUploading(false);
      }

      if (activeSubTab === 'sawer') {
        await onSawer({
          senderName: senderName.trim() || 'Penasihat',
          senderAvatar: senderAvatar.trim() || undefined,
          amount: sawerEffective,
          message: sawerMessage.trim() || undefined,
          paymentMethod: selectedPaymentMethod,
          proofUrl,
        });
      } else {
        onDonate(donasiEffective, donasiMessage, anonymous, selectedPaymentMethod, proofUrl, donorName.trim() || undefined);
      }
      setPaymentStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Handle proof file selection ──
  const handleProofSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      // Create preview URL
      if (proofPreviewUrl) URL.revokeObjectURL(proofPreviewUrl);
      setProofPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    if (proofPreviewUrl) {
      URL.revokeObjectURL(proofPreviewUrl);
      setProofPreviewUrl(null);
    }
    if (proofInputRef.current) proofInputRef.current.value = '';
  };

  // ── Copy account number ──
  const handleCopyAccount = (text?: string) => {
    const copyText = text || paymentSettings?.bankNumber || '1234567890';
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }).catch(() => {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    });
  };

  // ── Step indicator ──
  const stepLabels = ['Nominal', 'Metode', 'Bayar', 'Konfirmasi'];
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-5">
      {stepLabels.map((label, i) => {
        const stepNum = (i + 1) as PaymentStep;
        const isActive = paymentStep === stepNum;
        const isDone = paymentStep > stepNum;
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && (
              <div className={`w-6 h-[2px] rounded-full transition-colors ${isDone ? (isMale ? 'bg-amber-400' : 'bg-violet-400') : 'bg-white/10'}`} />
            )}
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                isActive
                  ? btnClass + ' text-white/90'
                  : isDone
                    ? (isMale ? 'bg-amber-400/20 text-amber-400' : 'bg-violet-400/20 text-violet-400')
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
  );

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
            style={{ maxHeight: 'calc(100dvh - 80px)', scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px) + 16px)' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />

            {/* Back button + Close button (only on steps > 1) */}
            {paymentStep > 1 && paymentStep < 4 && (
              <div className="flex items-center justify-between mb-3">
                <motion.button
                  onClick={goBack}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70 transition-colors text-[13px] font-medium"
                  whileTap={{ scale: 0.95 }}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Kembali
                </motion.button>
                <button onClick={closeModal} className="p-2 rounded-xl bg-white/5 text-white/40 hover:bg-white/10 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Step Indicator */}
            <StepIndicator />

            {/* ── STEP 1: Amount Selection ── */}
            <AnimatePresence mode="wait">
              {paymentStep === 1 && (
                <motion.div
                  key="step-1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Modal Segmented Tabs */}
                  <div className="flex bg-white/[0.06] rounded-xl p-1 mb-6">
                    {(['sawer', 'donasi'] as const).map((tab) => {
                      const isSawer = tab === 'sawer';
                      return (
                        <motion.button
                          key={tab}
                          onClick={() => setActiveSubTab(tab)}
                          className="relative flex-1 py-2.5 rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 z-10"
                          whileTap={{ scale: 0.97 }}
                        >
                          {activeSubTab === tab && (
                            <motion.div
                              className="absolute inset-0 rounded-lg glass-heavy pointer-events-none"
                              layoutId="modalSubTab"
                              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            />
                          )}
                          <span className={`relative z-10 ${isSawer ? 'text-emerald-400' : accentColor}`}>
                            {isSawer ? <Gift className="w-3.5 h-3.5" /> : <Heart className="w-3.5 h-3.5" />}
                          </span>
                          <span className={`relative z-10 ${activeSubTab === tab ? 'text-white/90' : 'text-white/35'}`}>
                            {isSawer ? 'Sawer' : 'Donasi'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* ── SAWER FORM (Step 1) ── */}
                  {activeSubTab === 'sawer' && (
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-[18px] font-bold text-white/90 flex items-center gap-2.5">
                            <Gift className="w-5 h-5 text-emerald-400" />
                            Sawer Prize Pool
                          </h3>
                          <p className="text-[11px] text-white/30 mt-0.5 ml-7">Otomatis masuk ke prize pool</p>
                        </div>
                        <button onClick={closeModal} className="p-2.5 rounded-xl bg-white/8 text-white/50 hover:bg-white/12 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-5">
                        {/* Sender Name */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nama Kamu</label>
                          <input
                            type="text"
                            value={senderName}
                            onChange={(e) => setSenderName(e.target.value)}
                            placeholder="Nama panggilan..."
                            maxLength={50}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                          />
                        </div>

                        {/* Amount */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-3 block uppercase tracking-wider font-semibold">Nominal Sawer</label>
                          <div className="grid grid-cols-3 gap-2 lg:gap-3 mb-3">
                            {sawerPresets.map((amt) => {
                              const s = getAmountStyle(amt);
                              return (
                                <motion.button
                                  key={amt}
                                  onClick={() => { setSawerAmount(amt); setSawerCustom(''); }}
                                  className={`py-3.5 lg:py-3 rounded-2xl text-[13px] font-bold transition-all ${
                                    sawerAmount === amt && !sawerCustom
                                      ? s.gradient + ' text-white/90 shadow-lg'
                                      : 'glass-subtle text-white/60 border border-white/5 hover:border-white/10'
                                  }`}
                                  whileHover={{ scale: 1.03 }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  Rp {amt.toLocaleString('id-ID')}
                                </motion.button>
                              );
                            })}
                          </div>
                          <input
                            type="number"
                            value={sawerCustom}
                            onChange={(e) => { setSawerCustom(e.target.value); if (e.target.value) setSawerAmount(0); }}
                            placeholder="Nominal lainnya..."
                            className="w-full px-4 py-4 lg:px-4 lg:py-3 rounded-xl bg-white/5 border border-white/8 text-white/90 text-[15px] lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                          />
                        </div>

                        {/* Quick Messages */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-2.5 block uppercase tracking-wider font-semibold">Pesan Singkat</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {quickMessages.map((qMsg) => (
                              <motion.button
                                key={qMsg}
                                onClick={() => setSawerMessage(qMsg)}
                                className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                                  sawerMessage === qMsg
                                    ? `${isMale ? 'bg-amber-400/20 text-amber-400 border border-amber-400/25' : 'bg-violet-400/20 text-violet-400 border border-violet-400/25'}`
                                    : 'bg-white/5 text-white/40 border border-white/[0.04] hover:bg-white/8'
                                }`}
                                whileTap={{ scale: 0.94 }}
                              >
                                {qMsg}
                              </motion.button>
                            ))}
                          </div>
                          <input
                            type="text"
                            value={sawerMessage}
                            onChange={(e) => setSawerMessage(e.target.value)}
                            placeholder="Tulis pesan sawer..."
                            maxLength={200}
                            className="w-full px-4 py-3 lg:px-4 lg:py-3 rounded-xl bg-white/5 border border-white/8 text-white/90 text-sm lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                          />
                        </div>

                        {/* Proceed to Payment */}
                        <motion.button
                          onClick={handleProceedToPayment}
                          disabled={sawerEffective <= 0}
                          className={`${btnClass} btn-ios w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Shield className="w-5 h-5" />
                          Lanjut ke Pembayaran
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* ── DONASI FORM (Step 1) ── */}
                  {activeSubTab === 'donasi' && (
                    <div>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h3 className="text-[18px] font-bold text-white/90 flex items-center gap-2.5">
                            <Heart className={`w-5 h-5 ${accentColor}`} />
                            Donasi Liga
                          </h3>
                          <p className="text-[11px] text-white/30 mt-0.5 ml-7">Untuk penyelenggaraan Season 2</p>
                        </div>
                        <button onClick={closeModal} className="p-2.5 rounded-xl bg-white/8 text-white/50 hover:bg-white/12 transition-colors">
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <div className="space-y-5">
                        {/* Amount */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-3 block uppercase tracking-wider font-semibold">Pilih Nominal</label>
                          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 lg:gap-3 mb-3">
                            {donasiPresets.map((amount) => (
                              <motion.button
                                key={amount}
                                onClick={() => { setDonasiAmount(amount); setDonasiCustom(''); }}
                                className={`py-3 rounded-xl sm:rounded-2xl text-[12px] sm:text-[13px] font-bold transition-all ${
                                  donasiAmount === amount && !donasiCustom
                                    ? btnClass
                                    : 'glass-subtle text-white/60 border border-white/5 hover:border-white/10'
                                }`}
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                Rp {amount.toLocaleString('id-ID')}
                              </motion.button>
                            ))}
                          </div>
                          <input
                            type="number"
                            value={donasiCustom}
                            onChange={(e) => { setDonasiCustom(e.target.value); if (e.target.value) setDonasiAmount(0); }}
                            placeholder="Nominal lainnya"
                            className="w-full px-4 py-4 lg:px-4 lg:py-3 rounded-xl bg-white/5 border border-white/8 text-white/90 text-[15px] lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                          />
                        </div>

                        {/* Donor Name */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nama Kamu</label>
                          <input
                            type="text"
                            value={donorName}
                            onChange={(e) => setDonorName(e.target.value)}
                            placeholder="Nama yang akan ditampilkan..."
                            maxLength={50}
                            disabled={anonymous}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        {/* Message */}
                        <div>
                          <label className="text-[11px] text-white/35 mb-2.5 block uppercase tracking-wider font-semibold">Pesan (Opsional)</label>
                          <textarea
                            value={donasiMessage}
                            onChange={(e) => setDonasiMessage(e.target.value)}
                            placeholder="Tulis pesan dukungan untuk Season 2..."
                            rows={3}
                            className="w-full px-4 py-3.5 lg:px-4 lg:py-3 rounded-xl bg-white/5 border border-white/8 text-white/90 text-[15px] lg:text-base placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors resize-none"
                          />
                        </div>

                        {/* Anonymous toggle */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/5">
                          <span className="text-[14px] text-white/90 font-medium">Donasi secara anonim</span>
                          <button
                            onClick={() => setAnonymous(!anonymous)}
                            className={`w-[51px] h-[31px] rounded-full transition-colors relative ${anonymous ? (isMale ? 'bg-amber-400' : 'bg-violet-400') : 'bg-white/15'}`}
                          >
                            <motion.div
                              className="absolute top-[2px] w-[27px] h-[27px] rounded-full bg-white shadow-lg"
                              animate={{ left: anonymous ? 22 : 2 }}
                              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            />
                          </button>
                        </div>

                        {/* Proceed to Payment */}
                        <motion.button
                          onClick={handleProceedToPayment}
                          disabled={donasiEffective <= 0}
                          className={`${btnClass} btn-ios w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40`}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Heart className="w-5 h-5" />
                          Lanjut ke Pembayaran
                        </motion.button>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ── STEP 2: Payment Method Selection ── */}
              {paymentStep === 2 && (
                <motion.div
                  key="step-2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {/* Amount Summary */}
                  <div className="glass-heavy rounded-2xl p-4 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-white/50">{activeSubTab === 'sawer' ? 'Total sawer' : 'Total donasi'}</span>
                      <span className={`text-xl font-bold ${activeSubTab === 'sawer' ? 'text-emerald-400' : accentColor}`}>
                        Rp {effectiveAmount.toLocaleString('id-ID')}
                      </span>
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
                        <ChevronLeft className="w-5 h-5 text-white/20 rotate-180" />
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* ── STEP 3: Payment Instructions ── */}
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
                      <span className={`text-xl font-bold ${activeSubTab === 'sawer' ? 'text-emerald-400' : accentColor}`}>
                        Rp {effectiveAmount.toLocaleString('id-ID')}
                      </span>
                    </div>
                  </div>

                  {/* Payment Instructions based on method */}
                  {selectedPaymentMethod === 'qris' && (
                    <div className="glass-heavy rounded-2xl p-4 text-center">
                      <QrCode className="w-16 h-16 text-white/20 mx-auto mb-3" />
                      <p className="text-[13px] text-white/60 mb-2">
                        Scan QR Code untuk melakukan pembayaran
                      </p>
                      {paymentSettings?.qrisImage ? (
                        <img src={paymentSettings.qrisImage} alt="QRIS" className="mx-auto max-w-[200px] rounded-xl" />
                      ) : (
                        <p className="text-[11px] text-white/35">
                          QR akan ditampilkan setelah konfirmasi
                        </p>
                      )}
                    </div>
                  )}

                  {selectedPaymentMethod === 'bank_transfer' && (
                    <div className="glass-heavy rounded-2xl p-4 space-y-3">
                      <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold">
                        Rekening Tujuan
                      </p>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/90 font-medium">{paymentSettings?.bankName || 'Bank BCA'}</p>
                          <p className="text-xl font-bold text-white/90">{paymentSettings?.bankNumber || '1234567890'}</p>
                          <p className="text-[12px] text-white/50">a.n. {paymentSettings?.bankHolder || 'IDOL META'}</p>
                        </div>
                        <motion.button
                          onClick={() => handleCopyAccount(paymentSettings?.bankNumber)}
                          className="p-2 rounded-xl bg-white/[0.06]"
                          whileTap={{ scale: 0.95 }}
                        >
                          {copiedAccount ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
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
                          <p className="text-xl font-bold text-white/90">{paymentSettings?.gopayNumber || '081234567890'}</p>
                          <p className="text-[12px] text-white/50">a.n. {paymentSettings?.gopayHolder || 'IDOL META'}</p>
                        </div>
                        <motion.button
                          onClick={() => handleCopyAccount(paymentSettings?.gopayNumber)}
                          className="p-2 rounded-xl bg-white/[0.06]"
                          whileTap={{ scale: 0.95 }}
                        >
                          {copiedAccount ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-white/40" />}
                        </motion.button>
                      </div>
                    </div>
                  )}

                  {/* Proof of Payment Upload */}
                  <div className="glass-heavy rounded-2xl p-4">
                    <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-3">
                      Bukti Pembayaran (Opsional)
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      ref={proofInputRef}
                      onChange={handleProofSelect}
                      className="hidden"
                    />
                    {proofPreviewUrl ? (
                      <div className="relative">
                        <img src={proofPreviewUrl} alt="Bukti pembayaran" className="w-full rounded-xl max-h-40 object-cover" />
                        <button
                          onClick={handleRemoveProof}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white/80 hover:bg-black/70"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => proofInputRef.current?.click()}
                        className="w-full py-6 rounded-xl border-2 border-dashed border-white/10 hover:border-white/20 transition-colors flex flex-col items-center gap-2"
                      >
                        <Camera className="w-8 h-8 text-white/30" />
                        <span className="text-[12px] text-white/40">Upload bukti transfer</span>
                      </button>
                    )}
                  </div>

                  {/* Confirm Button */}
                  <motion.button
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting || isUploading}
                    className={`${activeSubTab === 'sawer' ? 'bg-emerald-500' : 'bg-red-500'} w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 text-white disabled:opacity-50`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isSubmitting || isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        {activeSubTab === 'sawer' ? <Gift className="w-5 h-5" /> : <Heart className="w-5 h-5" fill="currentColor" />}
                        <span>Saya Sudah Bayar</span>
                      </>
                    )}
                  </motion.button>

                  <p className="text-[11px] text-white/30 text-center">
                    Konfirmasi setelah melakukan pembayaran
                  </p>
                </motion.div>
              )}

              {/* ── STEP 4: Confirmation Success ── */}
              {paymentStep === 4 && (
                <motion.div
                  key="step-4"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  className="text-center py-6"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${activeSubTab === 'sawer' ? 'bg-emerald-500/20' : accentBg}`}
                  >
                    <CheckCircle2 className={`w-10 h-10 ${activeSubTab === 'sawer' ? 'text-emerald-400' : accentColor}`} />
                  </motion.div>
                  <h3 className="text-[20px] font-bold text-white/90 mb-2">
                    {activeSubTab === 'sawer' ? 'Sawer Berhasil!' : 'Donasi Berhasil!'}
                  </h3>
                  <p className="text-[13px] text-white/50 mb-4">
                    {activeSubTab === 'sawer'
                      ? `Terima kasih! Sawer Anda sebesar Rp ${effectiveAmount.toLocaleString('id-ID')} telah diterima.`
                      : `Terima kasih! Donasi Anda sebesar Rp ${effectiveAmount.toLocaleString('id-ID')} telah diterima.`
                    }
                  </p>
                  <p className="text-[11px] text-white/35 mb-6">
                    {activeSubTab === 'sawer'
                      ? 'Prize pool turnamen telah bertambah!'
                      : 'Dana ini akan digunakan untuk penyelenggaraan Season 2.'
                    }
                  </p>
                  <motion.button
                    onClick={closeModal}
                    className={`${btnClass} btn-ios px-6 py-3 rounded-2xl text-[14px] font-semibold`}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Tutup
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
