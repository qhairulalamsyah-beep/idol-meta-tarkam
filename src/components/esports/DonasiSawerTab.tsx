'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useRef, useEffect, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Heart,
  Gift,
  X,
  Sparkles,
  Calendar,
  Users,
  Target,
  Flame,
  Star,
  Crown,
  Zap,
  PartyPopper,
  Info,
  Send,
  QrCode,
  Building2,
  Wallet,
  ChevronLeft,
  CheckCircle2,
  Clock,
  Copy,
  Shield,
  AlertCircle,
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

interface Donation {
  id: string;
  amount: number;
  message: string;
  anonymous: boolean;
  createdAt: string;
  paymentMethod: string;
  paymentStatus: string;
  user: { id: string; name: string; avatar: string } | null;
}

interface SawerItem {
  id: string;
  senderName: string;
  senderAvatar: string | null;
  targetPlayerName: string | null;
  amount: number;
  message: string | null;
  createdAt: string;
}

type PaymentMethod = 'qris' | 'bank_transfer' | 'ewallet';
type PaymentStep = 1 | 2 | 3 | 4;

interface DonasiSawerTabProps {
  division: 'male' | 'female';
  totalDonation: number;
  donations: Donation[];
  tournamentId?: string;
  tournamentPrizePool?: number;
  totalSawer?: number;
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

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};
const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

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
const funIcons = [Flame, Heart, Star, Crown, Zap, PartyPopper, Gift, Sparkles];

const paymentMethods: { id: PaymentMethod; label: string; icon: typeof QrCode; description: string }[] = [
  { id: 'qris', label: 'QRIS', icon: QrCode, description: 'Scan QR untuk bayar' },
  { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2, description: 'Transfer via bank' },
  { id: 'ewallet', label: 'E-Wallet', icon: Wallet, description: 'GoPay / OVO / DANA' },
];

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}j lalu`;
  const days = Math.floor(hours / 24);
  return `${days}h lalu`;
}

function getAmountStyle(amount: number) {
  if (amount >= 50000)
    return { gradient: 'bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-400', bg: 'bg-amber-500/15', ring: 'ring-amber-400/30', icon: 'text-amber-400' };
  if (amount >= 20000)
    return { gradient: 'bg-gradient-to-r from-purple-400 via-violet-400 to-purple-400', bg: 'bg-purple-500/15', ring: 'ring-purple-400/30', icon: 'text-purple-400' };
  if (amount >= 10000)
    return { gradient: 'bg-gradient-to-r from-blue-400 via-cyan-400 to-teal-400', bg: 'bg-blue-500/15', ring: 'ring-blue-400/30', icon: 'text-blue-400' };
  return { gradient: 'bg-gradient-to-r from-emerald-400 to-green-500', bg: 'bg-emerald-500/12', ring: 'ring-emerald-400/20', icon: 'text-emerald-400' };
}

function getRandomIcon(index: number) {
  return funIcons[index % funIcons.length];
}

function getPaymentMethodLabel(method: string) {
  switch (method) {
    case 'qris': return 'QRIS';
    case 'bank_transfer': return 'Bank Transfer';
    case 'ewallet': return 'E-Wallet';
    default: return method;
  }
}

/* ═══════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════ */

export function DonasiSawerTab({
  division,
  totalDonation,
  donations,
  tournamentId,
  tournamentPrizePool = 0,
  totalSawer = 0,
  onDonate,
  onSawer,
  defaultTab,
}: DonasiSawerTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<'sawer' | 'donasi'>(defaultTab || 'sawer');
  const [showModal, setShowModal] = useState(false);

  // ── Payment settings ──
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(true);

  // ── Modal payment flow state ──
  const [paymentStep, setPaymentStep] = useState<PaymentStep>(1);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('qris');
  const [copiedAccount, setCopiedAccount] = useState(false);

  // ── Sawer state ──
  const [sawerList, setSawerList] = useState<SawerItem[]>([]);
  const [sawerAmount, setSawerAmount] = useState(2000);
  const [sawerCustom, setSawerCustom] = useState('');
  const [sawerMessage, setSawerMessage] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderAvatar, setSenderAvatar] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);

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
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';
  const donasiProgress = Math.min((totalDonation / GOAL_AMOUNT) * 100, 100);

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

  // Fetch sawer data — re-fetch when totalSawer changes (Pusher trigger)
  const fetchSawer = useCallback(() => {
    fetch('/api/sawer')
      .then((r) => r.json())
      .then((data) => {
        if (data && Array.isArray(data.sawerList)) setSawerList(data.sawerList);
        else if (Array.isArray(data)) setSawerList(data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchSawer();
  }, [fetchSawer, totalSawer]);

  // Auto-scroll sawer feed
  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [sawerList]);

  // ── Modal step navigation ──
  const goBack = () => {
    if (paymentStep > 1) {
      setPaymentStep((paymentStep - 1) as PaymentStep);
    } else {
      setShowModal(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    // Reset step after close animation
    setTimeout(() => setPaymentStep(1), 300);
  };

  // ── Open modal — normal opens at Step 1 ──
  const openModal = (tab: 'sawer' | 'donasi') => {
    setActiveSubTab(tab);
    setPaymentStep(1);
    setSelectedPaymentMethod('qris');
    setCopiedAccount(false);
    setShowModal(true);
  };

  // ── Open modal for Quick Sawer — skip to Step 2 ──
  const openQuickSawerModal = (amt: number) => {
    setSawerAmount(amt);
    setSawerCustom('');
    setActiveSubTab('sawer');
    // Auto-select first available payment method
    const available = paymentSettings?.activeMethods?.length
      ? paymentSettings.activeMethods[0]
      : 'qris';
    setSelectedPaymentMethod(available as PaymentMethod);
    setPaymentStep(2);
    setCopiedAccount(false);
    setShowModal(true);
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
        onSawer({
          senderName: senderName.trim() || 'Penasihat',
          senderAvatar: senderAvatar.trim() || undefined,
          amount: sawerEffective,
          message: sawerMessage.trim() || undefined,
          paymentMethod: selectedPaymentMethod,
          proofUrl,
        });
        // Optimistically add to feed
        const newItem: SawerItem = {
          id: `opt-${Date.now()}`,
          senderName: senderName.trim() || 'Penasihat',
          senderAvatar: senderAvatar.trim() || null,
          targetPlayerName: null,
          amount: sawerEffective,
          message: sawerMessage.trim() || null,
          createdAt: new Date().toISOString(),
        };
        setSawerList((prev) => [newItem, ...prev]);
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // ── Copy account number ──
  const handleCopyAccount = (text?: string) => {
    const copyText = text || paymentSettings?.bankNumber || '1234567890';
    navigator.clipboard.writeText(copyText).then(() => {
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    }).catch(() => {
      // Fallback
      setCopiedAccount(true);
      setTimeout(() => setCopiedAccount(false), 2000);
    });
  };

  const resetSawerForm = () => {
    setSawerMessage('');
    setSawerCustom('');
    setSawerAmount(2000);
  };

  const resetDonasiForm = () => {
    setDonasiMessage('');
    setDonasiCustom('');
    setDonasiAmount(5000);
    setDonorName('');
    setAnonymous(false);
  };

  return (
    <motion.div className="space-y-5 lg:space-y-6 lg:max-w-3xl lg:mx-auto" variants={container} initial="hidden" animate="show">
      {/* ═══════════════════════════════════════
          Segmented Control: Sawer | Donasi
          ═══════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="flex bg-white/[0.06] rounded-2xl p-1.5">
          {(['sawer', 'donasi'] as const).map((tab) => {
            const isSawer = tab === 'sawer';
            return (
              <motion.button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className="relative flex-1 py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 z-10"
                whileTap={{ scale: 0.97 }}
              >
                {activeSubTab === tab && (
                  <motion.div
                    className="absolute inset-0 rounded-xl glass-heavy pointer-events-none"
                    layoutId="donasiSubTab"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className={`relative z-10 ${isSawer ? 'text-emerald-400' : accentColor}`}>
                  {isSawer ? <Gift className="w-4 h-4" /> : <Heart className="w-4 h-4" />}
                </span>
                <span className={`relative z-10 ${activeSubTab === tab ? 'text-white/90' : 'text-white/35'}`}>
                  {isSawer ? 'Sawer' : 'Donasi'}
                </span>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ═══════════════════════════════════════
          SAWER TAB CONTENT
          ═══════════════════════════════════════ */}
      {activeSubTab === 'sawer' && (
        <>
          {/* Hero — Prize Pool */}
          <motion.div
            className={`${cardClass} rounded-2xl p-5 lg:p-6 relative overflow-hidden`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-500"
                animate={{ y: [0, -4, 0], rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ boxShadow: '0 4px 20px rgba(16,185,129,0.35)' }}
              >
                <Gift className="w-7 h-7 text-white/90" />
              </motion.div>
              <div className="flex-1">
                <p className={`text-xl sm:text-2xl md:text-3xl font-black ${gradientClass} tracking-tight`}>
                  Rp {tournamentPrizePool.toLocaleString('id-ID')}
                </p>
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/35 font-semibold mt-0.5">
                  Prize Pool Turnamen
                </p>
              </div>
              <motion.button
                onClick={() => openModal('sawer')}
                className={`${btnClass} btn-ios px-5 py-3 rounded-2xl text-[13px] font-semibold flex items-center gap-2`}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <Gift className="w-4 h-4" />
                SAWER
              </motion.button>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <div className="glass-heavy rounded-2xl p-4 lg:p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/90 mb-1">Apa itu Sawer?</p>
                  <p className="text-[12px] text-white/35 leading-relaxed">
                    Sawer adalah hadiah langsung yang otomatis menambah <span className="text-emerald-400 font-medium">prize pool</span> turnamen yang sedang berjalan.
                    Semakin banyak sawer, semakin besar hadiahnya!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Quick Sawer Buttons — opens modal at Step 2 */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <p className="text-[11px] text-white/35 uppercase tracking-wider font-semibold mb-3 px-1">
              Sawer Cepat
            </p>
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {sawerPresets.map((amt) => {
                const style = getAmountStyle(amt);
                return (
                  <motion.button
                    key={amt}
                    onClick={() => openQuickSawerModal(amt)}
                    className={`${style.bg} rounded-2xl p-3.5 text-center border border-white/[0.04]`}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.94 }}
                  >
                    <p className={`text-[13px] sm:text-base font-black ${style.icon}`}>Rp {amt.toLocaleString('id-ID')}</p>
                    {amt >= 50000 && <p className="text-[9px] font-semibold text-amber-400/60 uppercase tracking-wider mt-0.5">🔥 Super</p>}
                    {amt >= 20000 && amt < 50000 && <p className="text-[9px] font-semibold text-purple-400/60 uppercase tracking-wider mt-0.5">✨ Wow</p>}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Live Feed */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-[14px] font-bold text-white/90 flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${accentColor}`} />
                SAWER LANGSUNG
              </h3>
              <span className="text-[11px] text-white/25 font-medium">{sawerList.length} sawer</span>
            </div>
            <div
              ref={feedRef}
              className="glass rounded-2xl p-4 lg:p-5 max-h-[400px] overflow-y-auto space-y-3"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
            >
              {sawerList.length === 0 && (
                <div className="text-center py-10">
                  <Gift className="w-10 h-10 text-white/8 mx-auto mb-3" />
                  <p className="text-[13px] text-white/25 font-medium">Belum ada sawer</p>
                  <p className="text-[11px] text-white/15 mt-1">Sawer untuk menambah prize pool turnamen!</p>
                </div>
              )}
              <AnimatePresence mode="popLayout">
                {sawerList.map((sawer, index) => {
                  const style = getAmountStyle(sawer.amount);
                  const Icon = getRandomIcon(index);
                  const isLarge = sawer.amount >= 50;
                  return (
                    <motion.div
                      key={sawer.id}
                      className={`rounded-2xl p-3.5 relative overflow-hidden ${isLarge ? `${style.bg} ring-1 ${style.ring}` : 'glass-subtle'}`}
                      initial={{ opacity: 0, x: 30, scale: 0.95 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    >
                      {isLarge && (
                        <motion.div className="absolute top-2 right-2" animate={{ rotate: [0, 360] }} transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}>
                          <Sparkles className={`w-4 h-4 ${style.icon}`} />
                        </motion.div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className={avatarRingClass}>
                          <div className="w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {sawer.senderAvatar ? (
                              <img src={sawer.senderAvatar} alt={sawer.senderName} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-white/70">{sawer.senderName[0]}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-semibold text-white/90 truncate">{sawer.senderName}</p>
                            {sawer.targetPlayerName && <span className="text-white/30 text-[11px]">→</span>}
                            {sawer.targetPlayerName && <p className="text-[12px] text-white/50 truncate font-medium">{sawer.targetPlayerName}</p>}
                          </div>
                          {sawer.message && <p className="text-[12px] text-white/40 mt-0.5 truncate">{sawer.message}</p>}
                          <p className="text-[10px] text-white/20 mt-0.5">{timeAgo(sawer.createdAt)}</p>
                        </div>
                        <motion.div
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl shrink-0 ${style.gradient}`}
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 15, delay: 0.05 }}
                          style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.3)' }}
                        >
                          <Icon className="w-3.5 h-3.5 text-white/90" />
                          <span className="text-[13px] font-bold text-white/90">Rp {sawer.amount}</span>
                        </motion.div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}

      {/* ═══════════════════════════════════════
          DONASI TAB CONTENT
          ═══════════════════════════════════════ */}
      {activeSubTab === 'donasi' && (
        <>
          {/* Season 2 Funding Hero Card */}
          <motion.div variants={item}>
            <div className={`${cardClass} rounded-2xl p-6 relative overflow-hidden`}>
              <div
                className="absolute -right-10 -top-10 w-36 h-36 rounded-full blur-3xl opacity-20"
                style={{
                  background: isMale
                    ? 'radial-gradient(circle, #FFD700 0%, transparent 70%)'
                    : 'radial-gradient(circle, #A78BFA 0%, transparent 70%)',
                }}
              />
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="flex items-center gap-2 mb-4">
                  <div className={`px-3 py-1 rounded-full ${accentBg} border ${isMale ? 'border-amber-500/15' : 'border-violet-500/15'}`}>
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-white/50">
                      Penggalangan Dana
                    </span>
                  </div>
                </div>
                <h2 className="text-[22px] font-black text-white/90 tracking-tight mb-1">Liga Season 2</h2>
                <p className="text-[12px] text-white/35 mb-5 leading-relaxed">
                  Dukung penyelenggaraan Liga Season 2 agar turnamen bisa berjalan lebih meriah!
                </p>
                <div className="flex items-baseline gap-1.5 mb-1">
                  <span className="text-[11px] text-white/30 font-medium">Rp</span>
                  <p className={`text-5xl font-black tracking-tight ${gradientClass}`}>{totalDonation.toLocaleString('id-ID')}</p>
                </div>
                <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold mb-5">
                  Total Dana Terkumpul
                </p>
                <div className="w-full mb-2">
                  <div className="flex justify-between text-[11px] mb-2">
                    <span className="text-white/30 font-medium">{Math.round(donasiProgress)}% tercapai</span>
                    <span className="text-white/25 font-medium">Target Rp {GOAL_AMOUNT.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden ring-1 ring-white/[0.03]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: isMale
                          ? 'linear-gradient(90deg, #FF9F0A, #FFD60A, #FF9F0A)'
                          : 'linear-gradient(90deg, #C4B5FD, #A78BFA, #C4B5FD)',
                        boxShadow: isMale
                          ? '0 0 20px rgba(255,214,10,0.4), inset 0 1px 0 rgba(255,255,255,0.2)'
                          : '0 0 20px rgba(167,139,250,0.4), inset 0 1px 0 rgba(255,255,255,0.2)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${donasiProgress}%` }}
                      transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-5 mt-4">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-[11px] text-white/25 font-medium">{donations.length} donatur</span>
                  </div>
                  <div className="w-px h-3 bg-white/[0.06]" />
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-white/20" />
                    <span className="text-[11px] text-white/25 font-medium">Rp {GOAL_AMOUNT.toLocaleString('id-ID')} target</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Info */}
          <motion.div variants={item}>
            <div className="glass-heavy rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${accentBg} flex items-center justify-center shrink-0 mt-0.5`}>
                  <Calendar className={`w-4 h-4 ${accentColor}`} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white/90 mb-1">Apa itu Donasi Liga?</p>
                  <p className="text-[12px] text-white/35 leading-relaxed">
                    Donasi ini dikumpulkan khusus untuk biaya penyelenggaraan Liga Season 2 mendatang, seperti server, hadiah, dan operasional.
                    <span className="text-emerald-400 font-medium"> Sawer</span> di tab terpisah untuk menambah prize pool turnamen saat ini.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Recent Donations */}
          <motion.div variants={item}>
            <div className="flex items-center justify-between px-1 mb-3">
              <h3 className="text-[14px] font-bold text-white/90 flex items-center gap-2">
                <Sparkles className={`w-4 h-4 ${accentColor}`} />
                DONASI TERBARU
              </h3>
            </div>
            <motion.div className="space-y-3" variants={container} initial="hidden" animate="show">
              {donations.length === 0 && (
                <div className="text-center py-8">
                  <Heart className="w-8 h-8 text-white/10 mx-auto mb-2" />
                  <p className="text-[13px] text-white/25">Belum ada donasi. Jadilah yang pertama!</p>
                </div>
              )}
              {donations.slice(0, 10).map((donation) => (
                <motion.div key={donation.id} className="glass-heavy rounded-2xl p-4 lg:p-5 flex items-center gap-3 hover:shadow-md transition-shadow" variants={item} whileHover={{ scale: 1.005 }}>
                  <div className={avatarRingClass}>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                      {donation.anonymous || !donation.user?.avatar ? (
                        <Heart className="w-4 h-4 text-white/40" />
                      ) : (
                        <img src={donation.user.avatar} alt={donation.user.name} className="w-full h-full object-cover" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-white/90 truncate">
                        {donation.anonymous ? 'Anonim' : donation.user?.name || 'Anonim'}
                      </p>
                      {donation.paymentStatus === 'pending' && (
                        <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9px] font-semibold uppercase tracking-wider flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          Pending
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-white/30 mt-0.5">
                      berdonasi <span className="text-white/50">{timeAgo(donation.createdAt)}</span>
                      {donation.paymentMethod && (
                        <span className="ml-1.5 text-white/20">via {getPaymentMethodLabel(donation.paymentMethod)}</span>
                      )}
                    </p>
                    {donation.message && <p className="text-[11px] text-white/20 mt-0.5 truncate">&ldquo;{donation.message}&rdquo;</p>}
                  </div>
                  <span className={`text-lg font-bold ${accentColor} shrink-0`}>Rp {donation.amount}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* CTA */}
          <motion.div variants={item} className="pb-2">
            <motion.button
              onClick={() => openModal('donasi')}
              className={`${btnClass} btn-ios w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2`}
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <Heart className="w-5 h-5" />
              DUKUNG LIGA SEASON 2
            </motion.button>
          </motion.div>
        </>
      )}

      {/* ═══════════════════════════════════════
          UNIFIED MODAL — Multi-Step Payment Flow
          ═══════════════════════════════════════ */}
      <AnimatePresence>
        {showModal && (
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
                            whileHover={{ scale: 1.01, y: -1 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Shield className="w-5 h-5" />
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
                  >
                    {paymentSettingsLoading ? (
                      <div className="text-center py-8">
                        <motion.div
                          className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-3"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        <p className="text-[12px] text-white/30">Memuat metode pembayaran...</p>
                      </div>
                    ) : !paymentSettings || paymentSettings.activeMethods.length === 0 ? (
                      <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                          <AlertCircle className="w-7 h-7 text-amber-400" />
                        </div>
                        <h3 className="text-[15px] font-bold text-white/90 mb-1">Pembayaran Belum Tersedia</h3>
                        <p className="text-[12px] text-white/35 leading-relaxed px-4">
                          Admin belum mengatur metode pembayaran. Silakan hubungi admin untuk mengkonfigurasi info pembayaran.
                        </p>
                        <motion.button
                          onClick={goBack}
                          className="mt-4 px-4 py-2 rounded-xl bg-white/5 text-white/50 hover:bg-white/8 transition-colors text-[13px] font-medium"
                          whileTap={{ scale: 0.95 }}
                        >
                          <ChevronLeft className="w-4 h-4 inline -mt-0.5 mr-1" />
                          Kembali
                        </motion.button>
                      </div>
                    ) : (
                    <>
                    {/* Title */}
                    <div className="text-center mb-6">
                      <div className={`w-14 h-14 rounded-2xl ${accentBg} flex items-center justify-center mx-auto mb-3`}>
                        <Shield className={`w-7 h-7 ${accentColor}`} />
                      </div>
                      <h3 className="text-[18px] font-bold text-white/90 mb-1">Pilih Metode Pembayaran</h3>
                      <p className="text-[12px] text-white/35">
                        {activeSubTab === 'sawer' ? 'Sawer' : 'Donasi'} <span className={`font-semibold ${accentColor}`}>Rp {effectiveAmount > 0 ? effectiveAmount.toLocaleString('id-ID') : '0'}</span>
                      </p>
                    </div>

                    {/* Payment Methods — filter by admin-configured active methods */}
                    <div className="space-y-3">
                      {paymentMethods
                        .filter((method) => paymentSettings?.activeMethods?.includes(method.id))
                        .map((method) => {
                        const Icon = method.icon;
                        const isSelected = selectedPaymentMethod === method.id;
                        return (
                          <motion.button
                            key={method.id}
                            onClick={() => handleSelectPaymentMethod(method.id)}
                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${
                              isSelected
                                ? `glass-heavy border ${isMale ? 'border-amber-400/30' : 'border-violet-400/30'} shadow-lg`
                                : 'bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06]'
                            }`}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all ${
                              isSelected
                                ? isMale ? 'bg-amber-400/25 ring-1 ring-amber-400/20' : 'bg-violet-400/25 ring-1 ring-violet-400/20'
                                : 'bg-white/5'
                            }`}>
                              <Icon className={`w-6 h-6 ${isSelected ? accentColor : 'text-white/30'}`} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className={`text-[14px] font-semibold ${isSelected ? 'text-white/90' : 'text-white/60'}`}>
                                {method.label}
                              </p>
                              <p className={`text-[11px] mt-0.5 ${isSelected ? 'text-white/40' : 'text-white/25'}`}>{method.description}</p>
                            </div>
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? isMale ? 'border-amber-400 bg-amber-400 shadow-[0_0_8px_rgba(255,214,10,0.3)]' : 'border-violet-400 bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.3)]'
                                : 'border-white/15'
                            }`}>
                              {isSelected && <CheckCircle2 className="w-4 h-4 text-white/90" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Security notice */}
                    <div className="flex items-center gap-2 mt-5 p-3 rounded-xl bg-white/[0.03]">
                      <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                      <p className="text-[11px] text-white/25 leading-relaxed">
                        Pembayaran diproses secara aman. Data kamu terenkripsi end-to-end.
                      </p>
                    </div>
                    </>
                    )}
                  </motion.div>
                )}

                {/* ── STEP 3: Payment Details ── */}
                {paymentStep === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Loading state */}
                    {paymentSettingsLoading ? (
                      <div className="text-center py-8">
                        <motion.div
                          className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full mx-auto mb-3"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        />
                        <p className="text-[12px] text-white/30">Memuat info pembayaran...</p>
                      </div>
                    ) : !paymentSettings ? (
                      /* No settings available */
                      <div className="text-center py-6">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                          <AlertCircle className="w-7 h-7 text-amber-400" />
                        </div>
                        <h3 className="text-[15px] font-bold text-white/90 mb-1">Pembayaran Belum Tersedia</h3>
                        <p className="text-[12px] text-white/35 leading-relaxed px-4">
                          Admin belum mengatur metode pembayaran. Silakan hubungi admin untuk mengkonfigurasi info pembayaran.
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Title */}
                        <div className="text-center mb-6">
                          <div className={`w-14 h-14 rounded-2xl ${accentBg} flex items-center justify-center mx-auto mb-3`}>
                            {selectedPaymentMethod === 'qris' && <QrCode className={`w-7 h-7 ${accentColor}`} />}
                            {selectedPaymentMethod === 'bank_transfer' && <Building2 className={`w-7 h-7 ${accentColor}`} />}
                            {selectedPaymentMethod === 'ewallet' && <Wallet className={`w-7 h-7 ${accentColor}`} />}
                          </div>
                          <h3 className="text-[18px] font-bold text-white/90 mb-1">
                            {getPaymentMethodLabel(selectedPaymentMethod)}
                          </h3>
                          <p className="text-[12px] text-white/35">
                            Total: <span className={`font-bold ${accentColor}`}>Rp {effectiveAmount.toLocaleString('id-ID')}</span>
                          </p>
                        </div>

                        {/* QR Code for QRIS */}
                        {selectedPaymentMethod === 'qris' && (
                          <div className="flex flex-col items-center">
                            {paymentSettings.qrisImage ? (
                              <div className="bg-white rounded-2xl p-5 mb-4">
                                <img
                                  src={paymentSettings.qrisImage}
                                  alt="QRIS Payment"
                                  className="w-[200px] h-[200px] object-contain"
                                />
                              </div>
                            ) : paymentSettings.qrisLabel ? (
                              <div className="bg-white rounded-2xl p-5 mb-4">
                                <QRCodeSVG
                                  value={paymentSettings.qrisLabel}
                                  size={200}
                                  bgColor="#FFFFFF"
                                  fgColor="#000000"
                                  level="H"
                                  includeMargin={false}
                                />
                              </div>
                            ) : (
                              <div className="bg-white/5 rounded-2xl p-6 mb-4 text-center border border-dashed border-white/10">
                                <QrCode className="w-10 h-10 text-white/20 mx-auto mb-2" />
                                <p className="text-[12px] text-white/40 font-medium">QRIS belum dikonfigurasi</p>
                                <p className="text-[10px] text-white/25 mt-1">Admin perlu mengatur QRIS di pengaturan pembayaran</p>
                              </div>
                            )}
                            {paymentSettings.qrisImage || paymentSettings.qrisLabel ? (
                              <div className="glass-heavy rounded-2xl p-4 w-full text-center mb-4 ring-1 ring-white/[0.03]">
                                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-1">Scan QR Code di atas</p>
                                <p className="text-[12px] text-white/45 leading-relaxed">
                                  Gunakan aplikasi e-wallet atau mobile banking untuk scan
                                </p>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Bank Transfer Details */}
                        {selectedPaymentMethod === 'bank_transfer' && (
                          <div className="space-y-3 mb-4">
                            <div className="glass-subtle rounded-2xl p-5">
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center">
                                  <Building2 className="w-6 h-6 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-[14px] font-bold text-white/90">{paymentSettings.bankName}</p>
                                  <p className="text-[11px] text-white/30">{paymentSettings.bankCode}</p>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                                  <div>
                                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Nomor Rekening</p>
                                    <p className="text-[18px] font-bold text-white/90 tracking-wider mt-0.5">{paymentSettings.bankNumber}</p>
                                  </div>
                                  <motion.button
                                    onClick={() => handleCopyAccount(paymentSettings.bankNumber)}
                                    className="p-2.5 rounded-xl bg-white/8 hover:bg-white/12 text-white/50 hover:text-white/70 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    {copiedAccount ? (
                                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                      <Copy className="w-5 h-5" />
                                    )}
                                  </motion.button>
                                </div>
                                <div className="p-3 rounded-xl bg-white/5">
                                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Atas Nama</p>
                                  <p className="text-[14px] font-semibold text-white/90 mt-0.5">{paymentSettings.bankHolder}</p>
                                </div>
                              </div>
                            </div>
                            <p className="text-[11px] text-white/25 text-center px-2">
                              Transfer sesuai nominal <span className={`font-semibold ${accentColor}`}>Rp {effectiveAmount.toLocaleString('id-ID')}</span>.
                              Konfirmasi setelah transfer berhasil.
                            </p>
                          </div>
                        )}

                        {/* E-Wallet Options */}
                        {selectedPaymentMethod === 'ewallet' && (
                          <div className="space-y-3 mb-4">
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { name: 'GoPay', color: 'from-emerald-400 to-green-500', number: paymentSettings.gopayNumber, holder: paymentSettings.gopayHolder },
                                { name: 'OVO', color: 'from-purple-400 to-violet-500', number: paymentSettings.ovoNumber, holder: paymentSettings.ovoHolder },
                                { name: 'DANA', color: 'from-blue-400 to-cyan-500', number: paymentSettings.danaNumber, holder: paymentSettings.danaHolder },
                              ].map((wallet) => (
                                <div
                                  key={wallet.name}
                                  className="glass-subtle rounded-2xl p-4 text-center"
                                >
                                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${wallet.color} flex items-center justify-center mx-auto mb-2`}>
                                    <Wallet className="w-5 h-5 text-white/90" />
                                  </div>
                                  <p className="text-[12px] font-semibold text-white/90">{wallet.name}</p>
                                  {wallet.number && (
                                    <p className="text-[10px] text-white/30 mt-1 truncate">{wallet.number}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="glass-subtle rounded-xl p-4 text-center">
                              <p className="text-[12px] text-white/50 leading-relaxed">
                                Buka aplikasi e-wallet pilihan kamu, lalu transfer ke nomor yang tertera di atas.
                              </p>
                            </div>
                            <div className="space-y-2">
                              {paymentSettings.gopayNumber && (
                                <div className="flex items-center justify-between glass-subtle rounded-xl px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                                      <Wallet className="w-3 h-3 text-white/90" />
                                    </div>
                                    <span className="text-[11px] text-white/40">GoPay</span>
                                  </div>
                                  <span className="text-[12px] font-semibold text-white/90">{paymentSettings.gopayNumber}</span>
                                </div>
                              )}
                              {paymentSettings.ovoNumber && (
                                <div className="flex items-center justify-between glass-subtle rounded-xl px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                                      <Wallet className="w-3 h-3 text-white/90" />
                                    </div>
                                    <span className="text-[11px] text-white/40">OVO</span>
                                  </div>
                                  <span className="text-[12px] font-semibold text-white/90">{paymentSettings.ovoNumber}</span>
                                </div>
                              )}
                              {paymentSettings.danaNumber && (
                                <div className="flex items-center justify-between glass-subtle rounded-xl px-4 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                                      <Wallet className="w-3 h-3 text-white/90" />
                                    </div>
                                    <span className="text-[11px] text-white/40">DANA</span>
                                  </div>
                                  <span className="text-[12px] font-semibold text-white/90">{paymentSettings.danaNumber}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-[11px] text-white/25 text-center px-2">
                              Transfer nominal <span className={`font-semibold ${accentColor}`}>Rp {effectiveAmount.toLocaleString('id-ID')}</span>
                              via e-wallet, lalu konfirmasi di bawah.
                            </p>
                          </div>
                        )}
                      </>
                    )}

                    {/* Proof of Payment Upload */}
                    <div className="space-y-2 mb-4">
                      <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                        Bukti Pembayaran
                      </label>
                      <input
                        ref={proofInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleProofSelect}
                        className="hidden"
                      />
                      {proofFile && proofPreviewUrl ? (
                        <motion.div
                          className="glass-heavy rounded-2xl p-3"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/5 shrink-0">
                              <img
                                src={proofPreviewUrl}
                                alt="Bukti pembayaran"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-white/90 truncate">{proofFile.name}</p>
                              <p className="text-[11px] text-white/30">{formatFileSize(proofFile.size)}</p>
                            </div>
                            <motion.button
                              onClick={handleRemoveProof}
                              className="w-8 h-8 rounded-xl bg-red-500/15 flex items-center justify-center text-red-400 shrink-0"
                              whileTap={{ scale: 0.9 }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.button
                          onClick={() => proofInputRef.current?.click()}
                          className="w-full border-2 border-dashed border-white/15 rounded-2xl p-5 flex flex-col items-center gap-2 hover:border-white/25 transition-colors"
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className={`w-12 h-12 rounded-xl ${accentBg} flex items-center justify-center`}>
                            <Camera className={`w-6 h-6 ${accentColor}`} />
                          </div>
                          <p className="text-[13px] font-semibold text-white/60">Upload Bukti Transfer</p>
                          <p className="text-[11px] text-white/25">Tap untuk ambil foto atau pilih file</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Upload className="w-3 h-3 text-white/20" />
                            <span className="text-[10px] text-white/20">JPG, PNG, Webp · Max 5MB</span>
                          </div>
                        </motion.button>
                      )}
                    </div>

                    {/* Sudah Bayar Button */}
                    <motion.button
                      onClick={handleConfirmPayment}
                      disabled={isSubmitting || isUploading || !paymentSettings || paymentSettingsLoading}
                      className={`${btnClass} btn-ios w-full py-4 rounded-2xl text-[15px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isSubmitting || isUploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {isUploading ? 'Mengupload bukti...' : 'Memproses...'}
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5" />
                          {!paymentSettings ? 'Pembayaran Belum Tersedia' : 'Sudah Bayar'}
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}

                {/* ── STEP 4: Confirmation — Waiting ── */}
                {paymentStep === 4 && (
                  <motion.div
                    key="step-4"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.3 }}
                    className="text-center py-4"
                  >
                    {/* Animated check icon */}
                    <motion.div
                      className={`w-20 h-20 rounded-full ${accentBg} flex items-center justify-center mx-auto mb-5`}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.3 }}
                      >
                        <CheckCircle2 className={`w-10 h-10 ${accentColor}`} />
                      </motion.div>
                    </motion.div>

                    <h3 className="text-[20px] font-bold text-white/90 mb-2">Pembayaran Dikirim!</h3>
                    <p className="text-[13px] text-white/40 mb-6 leading-relaxed">
                      {activeSubTab === 'sawer' ? 'Sawer' : 'Donasi'} <span className={`font-semibold ${accentColor}`}>Rp {effectiveAmount.toLocaleString('id-ID')}</span> via{' '}
                      <span className="font-semibold text-white/60">{getPaymentMethodLabel(selectedPaymentMethod)}</span>{' '}
                      sedang menunggu konfirmasi.
                    </p>

                    {/* Status card */}
                    <div className="glass-subtle rounded-2xl p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0"
                          animate={{ scale: [1, 1.1, 1] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Clock className="w-5 h-5 text-amber-400" />
                        </motion.div>
                        <div className="text-left">
                          <p className="text-[13px] font-semibold text-white/90">Menunggu Konfirmasi</p>
                          <p className="text-[11px] text-white/30 mt-0.5">
                            Admin akan memverifikasi pembayaran kamu dalam 1x24 jam
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="glass-subtle rounded-2xl p-4 mb-6 text-left space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/30">Jenis</span>
                        <span className="text-[12px] text-white/70 font-medium">
                          {activeSubTab === 'sawer' ? 'Sawer Prize Pool' : 'Donasi Season 2'}
                        </span>
                      </div>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/30">Nominal</span>
                        <span className={`text-[13px] ${accentColor} font-bold`}>Rp {effectiveAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/30">Metode</span>
                        <span className="text-[12px] text-white/70 font-medium">{getPaymentMethodLabel(selectedPaymentMethod)}</span>
                      </div>
                      <div className="h-px bg-white/[0.04]" />
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-white/30">Status</span>
                        <span className="text-[12px] text-amber-400 font-semibold flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Pending
                        </span>
                      </div>
                    </div>

                    {/* Close button */}
                    <motion.button
                      onClick={() => {
                        closeModal();
                        if (activeSubTab === 'sawer') resetSawerForm();
                        else resetDonasiForm();
                      }}
                      className="w-full py-3.5 rounded-2xl text-[14px] font-semibold text-white/60 bg-white/5 hover:bg-white/8 transition-colors flex items-center justify-center gap-2"
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
    </motion.div>
  );
}
