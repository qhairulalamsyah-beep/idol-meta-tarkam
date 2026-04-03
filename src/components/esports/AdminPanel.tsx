'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Shield,
  Users,
  GitBranch,
  Play,
  Flag,
  CheckCircle,
  XCircle,
  X,
  Check,
  RotateCcw,
  AlertTriangle,
  CreditCard,
  Building2,
  Wallet,
  QrCode,
  Save,
  Loader2,
  Clock,
  Eye,
  Image as ImageIcon,
  LogOut,
  Info,
  UserCog,
  Settings,
  Star,
  UserPlus,
  Trash2,
  ShieldCheck,
  Crown,
  KeyRound,
  Plus,
  Trophy,
  Calendar,
  MapPin,
  Music,
  Gamepad2,
  ChevronDown,
  Pencil,
} from 'lucide-react';
import { ImageUpload } from '@/components/ui/ImageUpload';
import { BotManagementTab } from './BotManagementTab';
import { PlayerManagementScreen } from './PlayerManagementScreen';
import { useAppStore } from '@/lib/store';
import { adminFetch } from '@/lib/admin-fetch';

interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  status: string;
  tierAssigned: string;
  user: {
    id: string;
    name: string;
    email: string;
    gender: string;
    tier: string;
    avatar: string | null;
    points: number;
  };
}

interface Tournament {
  id: string;
  name: string;
  status: string;
  division: string;
  week: number;
  prizePool: number;
  type?: string;
  bracketType?: string;
  mode?: string;
  bpm?: string;
  lokasi?: string;
  startDate?: string | null;
}

interface AdminPanelProps {
  division: 'male' | 'female';
  tournament: Tournament | null;
  registrations: Registration[];
  onApprove: (registrationId: string, tier: string) => void;
  onReject: (registrationId: string) => void;
  onDelete: (registrationId: string) => void;
  onDeleteAllRejected: () => void;
  onSetMVP: (userId: string, mvpScore: number) => void;
  onRemoveMVP: (userId: string) => void;
  onUpdateStatus: (status: string) => void;
  onGenerateTeams: () => void;
  onResetTeams: () => void;
  teamsCount: number;
  onGenerateBracket: (type: string) => void;
  onFinalize: () => void;
  onResetSeason: () => void;
  onUpdatePrizePool: (prizePool: number) => void;
  onCreateTournament: (opts: { name: string; division: string; type: string; bracketType: string; week: number; startDate?: string | null; mode?: string; bpm?: string; lokasi?: string }) => void;
  onLogout?: () => void;
  showTrigger?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode?: 'sheet' | 'page';
}

const STEPS = [
  { key: 'setup', label: 'Persiapan', icon: '⚙️' },
  { key: 'registration', label: 'Pendaftaran', icon: '📝' },
  { key: 'team_generation', label: 'Tim', icon: '👥' },
  { key: 'bracket_ready', label: 'Bracket', icon: '🏆' },
  { key: 'ongoing', label: 'Live', icon: '🔴' },
  { key: 'completed', label: 'Selesai', icon: '✅' },
];

/* ═══════════════════════════════════════════════════
   Payment Settings Type
   ═══════════════════════════════════════════════════ */

interface PaymentSettingsForm {
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

const DEFAULT_PAYMENT_SETTINGS: PaymentSettingsForm = {
  bankName: 'Bank BCA',
  bankCode: 'BCA',
  bankNumber: '1234567890',
  bankHolder: 'IDOL META',
  gopayNumber: '081234567890',
  gopayHolder: 'IDOL META',
  ovoNumber: '081234567890',
  ovoHolder: 'IDOL META',
  danaNumber: '081234567890',
  danaHolder: 'IDOL META',
  qrisLabel: 'IDOL META - QRIS',
  qrisImage: '',
  activeMethods: ['qris', 'bank_transfer', 'ewallet'],
};

/* ═══════════════════════════════════════════════════════
   Admin Guidance Card — Shows "what to do next" based on status
   ═══════════════════════════════════════════════════════ */

function AdminGuidanceCard({
  tournamentStatus,
  pendingCount,
  approvedCount,
  teamsCount,
  accentClass,
  accentBgSubtle,
  onTabChange,
}: {
  tournamentStatus: string;
  pendingCount: number;
  approvedCount: number;
  teamsCount: number;
  accentClass: string;
  accentBgSubtle: string;
  onTabChange: (tab: 'tournament' | 'payment' | 'rbac' | 'clubs') => void;
}) {
  // Determine the next step based on current state
  const steps: Array<{ done: boolean; text: string }> = [];

  if (tournamentStatus === 'setup') {
    steps.push({ done: false, text: 'Tetapkan hadiah & atur turnamen' });
  } else {
    steps.push({ done: true, text: 'Setup turnamen' });
  }

  if (tournamentStatus === 'setup' || tournamentStatus === 'registration') {
    steps.push({ done: pendingCount === 0, text: pendingCount > 0 ? `Approve ${pendingCount} pendaftaran pending` : 'Semua pendaftaran sudah diproses' });
  } else {
    steps.push({ done: true, text: 'Pendaftaran ditutup' });
  }

  if (approvedCount >= 6 && teamsCount === 0) {
    steps.push({ done: false, text: 'Generate tim dari peserta yang disetujui' });
  } else if (teamsCount > 0) {
    steps.push({ done: true, text: `${teamsCount} tim sudah terbentuk` });
  } else if (approvedCount < 6) {
    steps.push({ done: false, text: `Tunggu minimal 6 peserta approved (${approvedCount}/6)` });
  } else {
    steps.push({ done: false, text: 'Generate tim untuk memulai bracket' });
  }

  if (tournamentStatus === 'ongoing') {
    steps.push({ done: false, text: 'Kelola skor di tab Bracket' });
  } else if (tournamentStatus === 'completed') {
    steps.push({ done: true, text: 'Turnamen selesai' });
  }

  const nextStep = steps.find(s => !s.done);
  const allDone = steps.every(s => s.done);

  if (allDone && tournamentStatus === 'completed') return null;

  return (
    <div
      className="rounded-2xl p-4 mb-2"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-7 h-7 rounded-lg ${accentBgSubtle} flex items-center justify-center`}>
          <span className="text-[12px]">{allDone ? '✅' : '📋'}</span>
        </div>
        <div>
          <p className="text-[12px] font-bold text-white/80">
            {allDone ? 'Semua langkah selesai!' : 'Langkah Selanjutnya'}
          </p>
          <p className="text-[10px] text-white/30">
            {allDone ? 'Turnamen sudah berjalan dengan baik' : 'Ikuti langkah berikut untuk turnamen'}
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
              step.done
                ? 'bg-emerald-500/15'
                : 'bg-white/5'
            }`}>
              {step.done ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <span className={`text-[9px] font-bold ${accentClass}`}>{i + 1}</span>
              )}
            </div>
            <p className={`text-[11px] ${step.done ? 'text-white/30 line-through' : 'text-white/70 font-medium'}`}>
              {step.text}
            </p>
          </div>
        ))}
      </div>

      {nextStep && pendingCount > 0 && (
        <button
          onClick={() => {}}
          className="mt-3 w-full py-2 rounded-xl text-[11px] font-semibold text-white/60 bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.07] transition-colors"
        >
          {pendingCount} pendaftaran menunggu approval
        </button>
      )}
    </div>
  );
}

export function AdminPanel({
  division,
  tournament,
  registrations,
  onApprove,
  onReject,
  onDelete,
  onDeleteAllRejected,
  onSetMVP,
  onRemoveMVP,
  onUpdateStatus,
  onGenerateTeams,
  onResetTeams,
  teamsCount,
  onGenerateBracket,
  onFinalize,
  onResetSeason,
  onUpdatePrizePool,
  onCreateTournament,
  onLogout,
  showTrigger = false,
  isOpen,
  onOpenChange,
  mode = 'sheet',
}: AdminPanelProps) {
  const { adminUser, addToast, fetchData: storeFetchData, verifyAdminSession } = useAppStore();
  const isPageMode = mode === 'page';
  const [internalOpen, setInternalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Record<string, string>>({});
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // ── Prize Pool input state ──
  const [prizeInput, setPrizeInput] = useState({
    champion: '',
    runnerUp: '',
    third: '',
    mvp: '',
  });
  const [prizeSaving, setPrizeSaving] = useState(false);

  // ── Payment settings state ──
  const [adminTab, setAdminTab] = useState<'tournament' | 'payment' | 'rbac' | 'clubs'>('tournament');
  const [paySettings, setPaySettings] = useState<PaymentSettingsForm>(DEFAULT_PAYMENT_SETTINGS);
  const [paySettingsLoaded, setPaySettingsLoaded] = useState(false);
  const [paySettingsSaving, setPaySettingsSaving] = useState(false);
  const [paySettingsSaved, setPaySettingsSaved] = useState(false);

  // ── Player Management full-screen state ──
  const [showPlayerManagement, setShowPlayerManagement] = useState(false);

  // ── Pending payments verification state ──
  const [pendingPayments, setPendingPayments] = useState<Array<{
    id: string;
    type: 'donation' | 'sawer';
    amount: number;
    message: string | null;
    paymentMethod: string;
    proofImageUrl: string | null;
    from: string;
    fromAvatar: string | null;
    targetPlayerName?: string | null;
    createdAt: string;
  }>>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

  // ── RBAC state ──
  const [adminList, setAdminList] = useState<Array<{id: string; name: string; email: string; role: string; permissions: Record<string, boolean>; createdAt: string}>>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminPin, setNewAdminPin] = useState('');
  const [newAdminPerms, setNewAdminPerms] = useState<Record<string, boolean>>({
    tournament: true, players: true, bracket: true, scores: true,
    prize: true, donations: true, full_reset: false, manage_admins: false,
  });
  const [editingPermId, setEditingPermId] = useState<string | null>(null);
  const [rbacLoading, setRbacLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [showFullResetConfirm, setShowFullResetConfirm] = useState(false);
  const [fullResetConfirmText, setFullResetConfirmText] = useState('');
  const [fullResetLoading, setFullResetLoading] = useState(false);

  // ── Create Tournament form state ──
  const [newTournamentName, setNewTournamentName] = useState('');
  const [newTournamentType, setNewTournamentType] = useState<'weekly' | 'grand_final'>('weekly');
  const [newTournamentBracket, setNewTournamentBracket] = useState<'single' | 'double' | 'group'>('single');
  const [newTournamentWeek, setNewTournamentWeek] = useState(1);
  const [newTournamentDate, setNewTournamentDate] = useState('');
  const [newTournamentTime, setNewTournamentTime] = useState('');
  const [newTournamentMode, setNewTournamentMode] = useState('GR Arena 3vs3');
  const [newTournamentBpm, setNewTournamentBpm] = useState('130');
  const [newTournamentLokasi, setNewTournamentLokasi] = useState('PUB 1');
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // ── Edit & Delete Tournament state ──
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteTournamentConfirm, setShowDeleteTournamentConfirm] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteTournamentLoading, setDeleteTournamentLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    type: 'weekly' as 'weekly' | 'grand_final',
    bracketType: 'single' as 'single' | 'double' | 'group',
    week: 1,
    startDate: '',
    startTime: '',
    mode: 'GR Arena 3vs3',
    bpm: '130',
    lokasi: 'PUB 1',
  });

  // ── Club management state ──
  const [clubs, setClubs] = useState<Array<{id: string; name: string; slug: string; logoUrl: string | null; totalPoints: number; memberCount: number}>>([]);
  const [clubsLoading, setClubsLoading] = useState(false);
  const [editingClub, setEditingClub] = useState<{id: string; name: string; slug: string; logoUrl: string | null} | null>(null);
  const [editClubName, setEditClubName] = useState('');
  const [editClubLogo, setEditClubLogo] = useState('');
  const [editClubSaving, setEditClubSaving] = useState(false);
  const [showCreateClub, setShowCreateClub] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [creatingClub, setCreatingClub] = useState(false);
  const [newClubLogo, setNewClubLogo] = useState<string | null>(null);
  const [newClubLogoUploading, setNewClubLogoUploading] = useState(false);
  const [showDeleteClubConfirm, setShowDeleteClubConfirm] = useState<string | null>(null);
  const [deletingClub, setDeletingClub] = useState(false);

  const isMale = division === 'male';
  const accentClass = isMale ? 'text-[--ios-gold]' : 'text-[--ios-pink]';
  const accentBgSubtle = isMale ? 'bg-amber-500/12' : 'bg-violet-500/12';
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';

  const showPanel = isOpen !== undefined ? isOpen : internalOpen;
  const setShowPanel = onOpenChange
    ? (open: boolean) => onOpenChange(open)
    : setInternalOpen;

  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'pending'),
    [registrations],
  );
  const approvedRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'approved'),
    [registrations],
  );
  // Tier counts from approved registrations
  const tierCounts = useMemo(() => {
    const s = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'S').length;
    const a = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'A').length;
    const b = approvedRegistrations.filter((r) => (r.tierAssigned || r.user.tier) === 'B').length;
    return { s, a, b };
  }, [approvedRegistrations]);

  const statusFlow = STEPS.map((s) => s.key);
  const currentStepIndex = tournament
    ? statusFlow.indexOf(tournament.status)
    : -1;

  const handleApprove = (regId: string) => {
    const tier = selectedTier[regId] || 'B';
    onApprove(regId, tier);
  };

  // ── Payment Settings CRUD ──
  const fetchPaymentSettings = useCallback(() => {
    fetch('/api/payment-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.settings) {
          setPaySettings({
            bankName: data.settings.bankName || DEFAULT_PAYMENT_SETTINGS.bankName,
            bankCode: data.settings.bankCode || DEFAULT_PAYMENT_SETTINGS.bankCode,
            bankNumber: data.settings.bankNumber || DEFAULT_PAYMENT_SETTINGS.bankNumber,
            bankHolder: data.settings.bankHolder || DEFAULT_PAYMENT_SETTINGS.bankHolder,
            gopayNumber: data.settings.gopayNumber || DEFAULT_PAYMENT_SETTINGS.gopayNumber,
            gopayHolder: data.settings.gopayHolder || DEFAULT_PAYMENT_SETTINGS.gopayHolder,
            ovoNumber: data.settings.ovoNumber || DEFAULT_PAYMENT_SETTINGS.ovoNumber,
            ovoHolder: data.settings.ovoHolder || DEFAULT_PAYMENT_SETTINGS.ovoHolder,
            danaNumber: data.settings.danaNumber || DEFAULT_PAYMENT_SETTINGS.danaNumber,
            danaHolder: data.settings.danaHolder || DEFAULT_PAYMENT_SETTINGS.danaHolder,
            qrisLabel: data.settings.qrisLabel || DEFAULT_PAYMENT_SETTINGS.qrisLabel,
            qrisImage: data.settings.qrisImage || '',
            activeMethods: data.settings.activeMethods || DEFAULT_PAYMENT_SETTINGS.activeMethods,
          });
        }
        setPaySettingsLoaded(true);
      })
      .catch(() => setPaySettingsLoaded(true));
  }, []);

  useEffect(() => {
    if (showPanel) {
      // Verify admin session is still valid
      verifyAdminSession();
      fetchPaymentSettings();
      setPaySettingsSaved(false);
      // Fetch admins for RBAC tab
      fetch('/api/admin/auth').then(r => r.json()).then(data => {
        if (data.success) setAdminList(data.admins.map((a: any) => ({ ...a, permissions: JSON.parse(a.permissions || '{}') })));
      }).catch(() => {});
    }
  }, [showPanel, fetchPaymentSettings, verifyAdminSession]);

  const handleSavePaymentSettings = async () => {
    setPaySettingsSaving(true);
    try {
      const res = await adminFetch('/api/payment-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: paySettings }),
      });
      if (res.ok) {
        setPaySettingsSaved(true);
        setTimeout(() => setPaySettingsSaved(false), 3000);
      }
    } catch {
      // silent
    } finally {
      setPaySettingsSaving(false);
    }
  };

  const toggleActiveMethod = (method: string) => {
    setPaySettings((prev) => ({
      ...prev,
      activeMethods: prev.activeMethods.includes(method)
        ? prev.activeMethods.filter((m) => m !== method)
        : [...prev.activeMethods, method],
    }));
  };

  const updatePayField = (field: keyof PaymentSettingsForm, value: string) => {
    setPaySettings((prev) => ({ ...prev, [field]: value }));
  };

  // ── Pending payments verification ──
  const fetchPendingPayments = useCallback(() => {
    setPaymentsLoading(true);
    fetch('/api/payments/pending')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setPendingPayments(data.payments || []);
        }
      })
      .catch(() => {})
      .finally(() => setPaymentsLoading(false));
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'payment') {
      fetchPendingPayments();
    }
  }, [showPanel, adminTab, fetchPendingPayments]);

  // ── Fetch clubs for admin management ──
  const fetchClubs = useCallback(() => {
    setClubsLoading(true);
    fetch('/api/clubs?admin=true&limit=50')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setClubs(data.clubs || []);
        }
      })
      .catch(() => {})
      .finally(() => setClubsLoading(false));
  }, []);

  // Notify homescreen to refresh club data (via BroadcastChannel)
  const broadcastClubUpdate = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        const channel = new BroadcastChannel('idm-club-updates');
        channel.postMessage({ action: 'refresh' });
        channel.close();
      }
    } catch {
      // BroadcastChannel not supported — ignore
    }
  }, []);

  useEffect(() => {
    if (showPanel && adminTab === 'clubs') {
      fetchClubs();
    }
  }, [showPanel, adminTab, fetchClubs]);

  const handleVerifyPayment = async (id: string, type: 'donation' | 'sawer', status: 'confirmed' | 'rejected') => {
    setVerifyingId(id);
    try {
      const res = await adminFetch('/api/payments/confirm', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, id, status }),
      });
      if (res.ok) {
        // Remove from list
        setPendingPayments((prev) => prev.filter((p) => p.id !== id));
        // Show toast for sawer confirmation
        if (type === 'sawer' && status === 'confirmed') {
          addToast('Sawer dikonfirmasi! Prize pool diperbarui.', 'success');
        }
        // Refresh data to update prize pool
        storeFetchData(false);
      }
    } catch {
      // silent
    } finally {
      setVerifyingId(null);
    }
  };

  const handleViewProof = (url: string) => {
    setProofModalUrl(url);
    setShowProofModal('view');
  };

  return (
    <>
      {showTrigger && !isPageMode && (
        <motion.button
          onClick={() => setShowPanel(true)}
          className="fixed top-20 right-4 z-40 glass rounded-2xl p-3"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
        >
          <Shield className={`w-5 h-5 ${accentClass}`} />
        </motion.button>
      )}

      <AnimatePresence>
        {showPanel && (
          <motion.div
            className={`fixed inset-0 z-50 ${isPageMode ? 'flex flex-col' : 'flex items-end justify-center'}`}
            initial={isPageMode ? { opacity: 0 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={isPageMode ? undefined : () => setShowPanel(false)}
          >
            {!isPageMode && (
              <motion.div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}

            <motion.div
              className={`relative w-full overflow-hidden flex flex-col ${
                isPageMode
                  ? 'flex-1 max-w-4xl mx-auto'
                  : 'max-w-md lg:max-w-4xl max-h-[90vh]'
              }`}
              style={isPageMode ? {
                background: '#0B0B0F',
              } : {
                borderRadius: '1.5rem 1.5rem 0 0',
                background: 'rgba(28,28,30,0.95)',
                backdropFilter: 'blur(80px) saturate(180%)',
                boxShadow: '0 -1px 0 rgba(255,255,255,0.06)',
              }}
              initial={isPageMode ? { opacity: 0, y: 8 } : { y: '100%' }}
              animate={isPageMode ? { opacity: 1, y: 0 } : { y: 0 }}
              exit={isPageMode ? { opacity: 0, y: 8 } : { y: '100%' }}
              transition={isPageMode ? { duration: 0.2 } : { type: 'spring', damping: 30, stiffness: 320 }}
              onClick={(e) => e.stopPropagation()}
            >
              {!isPageMode && (
                <div className="flex justify-center pt-2.5 pb-0.5">
                  <div className="w-9 h-[5px] rounded-full bg-white/25" />
                </div>
              )}

              <div className={`px-5 pb-3 ${isPageMode ? 'pt-4' : 'pt-0.5'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isPageMode && (
                      <motion.button
                        onClick={() => setShowPanel(false)}
                        className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.08] transition-colors"
                        whileTap={{ scale: 0.92 }}
                        aria-label="Kembali"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 12H5M12 19l-7-7 7-7" />
                        </svg>
                      </motion.button>
                    )}
                    <div className={`rounded-xl flex items-center justify-center ${isPageMode ? 'w-10 h-10' : 'w-9 h-9'}`} style={{ background: accentBgSubtle }}>
                      <Shield className={`w-4.5 h-4.5 ${accentClass}`} />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-bold text-white/90 tracking-tight">
                        KONTROL TURNAMEN
                      </h2>
                      <p className="text-[11px] text-white/25 mt-0.5 leading-tight">
                        {tournament?.name || 'Belum ada turnamen'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {onLogout && (
                      <motion.button
                        onClick={onLogout}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 active:bg-red-500/15 active:text-red-400 transition-colors"
                        whileTap={{ scale: 0.92 }}
                        aria-label="Logout"
                      >
                        <LogOut className="w-4 h-4" />
                      </motion.button>
                    )}
                    {!isPageMode && (
                      <button
                        onClick={() => setShowPanel(false)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white/30 active:bg-white/10 transition-colors"
                      >
                        <X className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className={`flex-1 overflow-y-auto px-4 ${isPageMode ? 'pb-8 pt-2' : 'pb-28 pt-0'} lg:px-6 lg:pb-8 space-y-5 lg:space-y-8`}>
                {/* iOS Segmented Control Tab Switcher */}
                <div className="flex bg-white/[0.06] rounded-2xl p-1">
                  {([
                    { id: 'tournament' as const, label: 'Turnamen', icon: Shield },
                    { id: 'payment' as const, label: 'Bayar', icon: CreditCard },
                    { id: 'rbac' as const, label: 'Admin', icon: Users },
                    { id: 'clubs' as const, label: 'Club', icon: Shield },
                  ]).map((tab) => (
                    <motion.button
                      key={tab.id}
                      onClick={() => setAdminTab(tab.id)}
                      className="relative flex-1 min-w-0 py-2.5 rounded-xl text-[11px] font-semibold flex flex-col items-center justify-center gap-1 z-10"
                      whileTap={{ scale: 0.97 }}
                    >
                      {adminTab === tab.id && (
                        <motion.div
                          className="absolute inset-0 rounded-xl pointer-events-none"
                          style={{ background: 'rgba(255,255,255,0.08)', boxShadow: '0 1px 4px rgba(0,0,0,0.2), inset 0 0.5px 0 rgba(255,255,255,0.06)' }}
                          layoutId="adminPanelTab"
                          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        />
                      )}
                      <span className={`relative z-10 ${adminTab === tab.id ? accentClass : 'text-white/30'}`}>
                        <tab.icon className="w-4 h-4" />
                      </span>
                      <span className={`relative z-10 whitespace-nowrap ${adminTab === tab.id ? 'text-white/90' : 'text-white/30'}`}>
                        {tab.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* ═══ TOURNAMENT TAB ═══ */}
                {adminTab === 'tournament' && (
                  !tournament ? (
                    /* No Tournament State — Create New Tournament Form */
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <Plus className={`w-4 h-4 ${accentClass}`} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/90">Buat Turnamen Baru</p>
                          <p className="text-[10px] text-white/30">Divisi {isMale ? 'Laki-laki' : 'Perempuan'}</p>
                        </div>
                      </div>

                      <div className="glass-subtle rounded-2xl p-4 lg:p-6 space-y-4">
                        {/* Tournament Name */}
                        <div>
                          <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Nama Turnamen
                          </label>
                          <input
                            type="text"
                            value={newTournamentName}
                            onChange={(e) => setNewTournamentName(e.target.value)}
                            placeholder={isMale ? 'Contoh: IDOL META Weekly Male' : 'Contoh: IDOL META Weekly Female'}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] lg:text-base placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>

                        {/* Type Selector */}
                        <div>
                          <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Jenis Turnamen
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: 'weekly' as const, label: 'Weekly', desc: 'Mingguan' },
                              { key: 'grand_final' as const, label: 'Grand Final', desc: 'Final musim' },
                            ]).map((t) => (
                              <button
                                key={t.key}
                                onClick={() => setNewTournamentType(t.key)}
                                className={`p-3 rounded-xl text-left transition-all ${
                                  newTournamentType === t.key
                                    ? 'bg-white/10 border border-white/20'
                                    : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                }`}
                              >
                                <Trophy className={`w-4 h-4 mb-1 ${newTournamentType === t.key ? accentClass : 'text-white/30'}`} />
                                <p className={`text-[12px] font-semibold ${newTournamentType === t.key ? 'text-white/90' : 'text-white/40'}`}>
                                  {t.label}
                                </p>
                                <p className="text-[10px] text-white/25">{t.desc}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Week Number */}
                        <div>
                          <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                            Minggu Ke-
                          </label>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={1}
                            max={99}
                            value={newTournamentWeek}
                            onChange={(e) => setNewTournamentWeek(parseInt(e.target.value) || 1)}
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] lg:text-base placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>

                        {/* Tanggal & Jam */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Tanggal
                            </label>
                            <input
                              type="date"
                              value={newTournamentDate}
                              onChange={(e) => setNewTournamentDate(e.target.value)}
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Jam
                            </label>
                            <input
                              type="time"
                              value={newTournamentTime}
                              onChange={(e) => setNewTournamentTime(e.target.value)}
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                            />
                          </div>
                        </div>

                        {/* Advanced Settings — Collapsed by default */}
                        <div>
                          <button
                            type="button"
                            onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                            className="flex items-center gap-2 text-[11px] text-white/35 hover:text-white/55 font-medium transition-colors py-1"
                          >
                            <motion.div
                              animate={{ rotate: showAdvancedSettings ? 90 : 0 }}
                              transition={{ duration: 0.2 }}
                            >
                              <ChevronDown className="w-3 h-3" />
                            </motion.div>
                            Pengaturan lanjutan
                            <span className="text-[9px] text-white/20">(Bracket, Mode, BPM, Lokasi)</span>
                          </button>

                          <AnimatePresence>
                            {showAdvancedSettings && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden space-y-4 pt-3"
                              >
                                {/* Bracket Type */}
                                <div>
                                  <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                                    Tipe Bracket
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {([
                                      { key: 'single' as const, label: 'Single', desc: 'Eliminasi' },
                                      { key: 'double' as const, label: 'Double', desc: 'Double Elim' },
                                      { key: 'group' as const, label: 'Group', desc: 'Fase Grup' },
                                    ]).map((b) => (
                                      <button
                                        key={b.key}
                                        onClick={() => setNewTournamentBracket(b.key)}
                                        className={`p-2.5 rounded-xl text-center transition-all ${
                                          newTournamentBracket === b.key
                                            ? 'bg-white/10 border border-white/20'
                                            : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.06]'
                                        }`}
                                      >
                                        <p className={`text-[11px] font-semibold ${newTournamentBracket === b.key ? 'text-white/90' : 'text-white/40'}`}>
                                          {b.label}
                                        </p>
                                        <p className="text-[9px] text-white/25">{b.desc}</p>
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Mode, BPM & Lokasi */}
                                <div className="grid grid-cols-3 gap-2">
                                  <div>
                                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <Gamepad2 className="w-3 h-3" /> Mode
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentMode}
                                      onChange={(e) => setNewTournamentMode(e.target.value)}
                                      placeholder="GR Arena 3vs3"
                                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <Music className="w-3 h-3" /> BPM
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentBpm}
                                      onChange={(e) => setNewTournamentBpm(e.target.value)}
                                      placeholder="Random 120-140"
                                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                                      <MapPin className="w-3 h-3" /> Lokasi
                                    </label>
                                    <input
                                      type="text"
                                      value={newTournamentLokasi}
                                      onChange={(e) => setNewTournamentLokasi(e.target.value)}
                                      placeholder="PUB 1"
                                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Create Button */}
                        <motion.button
                          onClick={() => {
                            const name = newTournamentName.trim() || `${isMale ? 'Male' : 'Female'} Division - Week ${newTournamentWeek}`;

                            // Build startDate from date + time
                            let startDate: string | null = null;
                            if (newTournamentDate) {
                              const dateStr = newTournamentDate;
                              const timeStr = newTournamentTime || '19:00';
                              startDate = new Date(`${dateStr}T${timeStr}:00`).toISOString();
                            }

                            // Random BPM if not explicitly set
                            const bpm = newTournamentBpm || '130';

                            setCreatingTournament(true);
                            onCreateTournament({
                              name,
                              division,
                              type: newTournamentType,
                              bracketType: newTournamentBracket,
                              week: newTournamentWeek,
                              startDate,
                              mode: newTournamentMode,
                              bpm,
                              lokasi: newTournamentLokasi,
                            });
                            setTimeout(() => setCreatingTournament(false), 2000);
                          }}
                          disabled={creatingTournament}
                          className={`w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${
                            creatingTournament
                              ? 'opacity-50 pointer-events-none'
                              : isMale
                                ? 'btn-gold'
                                : 'btn-pink'
                          }`}
                          whileHover={{ scale: creatingTournament ? 1 : 1.01 }}
                          whileTap={{ scale: creatingTournament ? 1 : 0.97 }}
                        >
                          {creatingTournament ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Plus className="w-4 h-4" />
                          )}
                          Buat Turnamen
                        </motion.button>
                      </div>
                    </div>
                  ) : (
                    <>

                    {/* ═════════════════════════════════════════
                        WIZARD STEPPER — Premium Tournament Status
                        ═══════════════════════════════════════════ */}
                <div className="relative">
                  {/* Glass card container */}
                  <div className="glass-subtle rounded-2xl p-4 relative overflow-hidden">
                    {/* Animated gradient background for active state */}
                    <div 
                      className={`absolute inset-0 opacity-20 ${isMale ? 'bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-amber-500/10' : 'bg-gradient-to-r from-violet-500/10 via-violet-400/5 to-violet-500/10'}`}
                      style={{ 
                        backgroundSize: '200% 100%',
                        animation: 'shimmer 3s ease-in-out infinite'
                      }}
                    />
                    
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-4 relative">
                      <div className={`w-6 h-6 rounded-lg ${isMale ? 'bg-amber-400/15' : 'bg-violet-400/15'} flex items-center justify-center`}>
                        <span className="text-[11px]">🎯</span>
                      </div>
                      <p className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-bold">
                        Status Turnamen
                      </p>
                      <div className="ml-auto flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${isMale ? 'bg-amber-400' : 'bg-violet-400'} animate-pulse`} />
                        <span className={`text-[10px] font-semibold ${isMale ? 'text-amber-400' : 'text-violet-400'}`}>
                          {STEPS[currentStepIndex]?.label}
                        </span>
                      </div>
                    </div>

                    {/* Steps Row */}
                    <div className="flex items-center justify-between relative">
                      {STEPS.map((step, index) => {
                        const isCompleted = index < currentStepIndex;
                        const isActive = index === currentStepIndex;
                        const isLast = index === STEPS.length - 1;

                        return (
                          <div key={step.key} className="flex items-center flex-1 relative">
                            {/* Connector line */}
                            {!isLast && (
                              <div 
                                className={`absolute top-4 left-1/2 right-0 h-[2px] -z-0 transition-all duration-500 ${
                                  index < currentStepIndex
                                    ? isMale 
                                      ? 'bg-gradient-to-r from-amber-400/60 to-amber-400/20'
                                      : 'bg-gradient-to-r from-violet-400/60 to-violet-400/20'
                                    : 'bg-white/8'
                                }`}
                                style={{ transform: 'translateX(16px)', width: 'calc(100% - 32px)' }}
                              />
                            )}

                            {/* Step button */}
                            <motion.button
                              onClick={() => onUpdateStatus(step.key)}
                              className="flex flex-col items-center gap-2 relative z-10 cursor-pointer mx-auto"
                              whileTap={{ scale: 0.9 }}
                              whileHover={{ scale: 1.05 }}
                            >
                              {/* Icon container */}
                              <div className="relative">
                                {/* Glow effect for active */}
                                {isActive && (
                                  <div 
                                    className={`absolute inset-0 rounded-xl blur-md ${isMale ? 'bg-amber-400/30' : 'bg-violet-400/30'}`}
                                    style={{ animation: 'pulse 2s ease-in-out infinite' }}
                                  />
                                )}
                                
                                <div
                                  className={`relative w-10 h-10 rounded-xl flex items-center justify-center text-[16px] font-bold transition-all duration-300 ${
                                    isCompleted
                                      ? isMale
                                        ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-400/20'
                                        : 'bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-lg shadow-violet-400/20'
                                      : isActive
                                        ? `${isMale ? 'bg-gradient-to-br from-amber-400/20 to-amber-500/30 ring-2 ring-amber-400/50' : 'bg-gradient-to-br from-violet-400/20 to-violet-500/30 ring-2 ring-violet-400/50'}`
                                        : 'bg-white/5 border border-white/10'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-5 h-5" />
                                  ) : (
                                    <span className={isActive ? '' : 'opacity-40'}>{step.icon}</span>
                                  )}
                                </div>
                              </div>

                              {/* Label */}
                              <span
                                className={`text-[9px] font-semibold tracking-wide whitespace-nowrap transition-all ${
                                  isActive 
                                    ? isMale ? 'text-amber-400' : 'text-violet-400'
                                    : isCompleted 
                                      ? 'text-white/60' 
                                      : 'text-white/20'
                                }`}
                              >
                                {step.label}
                              </span>
                            </motion.button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                    {/* NEXT STEPS Guidance */}
                    <AdminGuidanceCard
                      tournamentStatus={tournament.status}
                      pendingCount={pendingRegistrations.length}
                      approvedCount={approvedRegistrations.length}
                      teamsCount={teamsCount}
                      accentClass={accentClass}
                      accentBgSubtle={accentBgSubtle}
                      onTabChange={setAdminTab}
                    />

                {/* ═══════════════════════════════════════════════════════
                    KELOLA PESERTA — Available in steps 0 through 3
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex <= 3 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                      Peserta ({registrations.length})
                    </p>
                    {pendingRegistrations.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-[--ios-red]">
                        <div className="w-1.5 h-1.5 rounded-full bg-[--ios-red] animate-pulse" />
                        {pendingRegistrations.length} menunggu
                      </span>
                    )}
                  </div>
                  <motion.button
                    onClick={() => setShowPlayerManagement(true)}
                    className="w-full glass-subtle rounded-2xl p-4 text-left"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-2xl ${accentBgSubtle} flex items-center justify-center flex-shrink-0`}>
                        <UserCog className={`w-5 h-5 ${accentClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90">Kelola Peserta</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-green-400/70">{approvedRegistrations.length} disetujui</span>
                          <span className="text-white/10">·</span>
                          <span className="text-[10px] text-amber-400/70">S:{tierCounts.s}</span>
                          <span className="text-[10px] text-purple-400/70">A:{tierCounts.a}</span>
                          <span className="text-[10px] text-cyan-400/70">B:{tierCounts.b}</span>
                          <span className="text-white/10">·</span>
                          <span className="text-[10px] text-yellow-400/70">{pendingRegistrations.length} menunggu</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP-CONDITIONAL CONTENT — shows relevant actions per step
                    ═══════════════════════════════════════════════════════ */}

                {/* ═══════════════════════════════════════════════════════
                    STEP 0–1: PERSIAPAN — Prize pool & settings
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex <= 1 && (
                <div className="space-y-4" id="admin-persiapan">
                  <motion.button
                    onClick={() => {
                      if (!tournament) return;
                      // Pre-fill edit form with current tournament data
                      const sd = tournament.startDate ? new Date(tournament.startDate) : null;
                      setEditForm({
                        name: tournament.name || '',
                        type: (tournament.type || 'weekly') as 'weekly' | 'grand_final',
                        bracketType: (tournament.bracketType || 'single') as 'single' | 'double' | 'group',
                        week: tournament.week || 1,
                        startDate: sd ? sd.toISOString().split('T')[0] : '',
                        startTime: sd ? `${String(sd.getHours()).padStart(2,'0')}:${String(sd.getMinutes()).padStart(2,'0')}` : '',
                        mode: tournament.mode || 'GR Arena 3vs3',
                        bpm: tournament.bpm || '130',
                        lokasi: tournament.lokasi || 'PUB 1',
                      });
                      setShowEditModal(true);
                    }}
                    className="flex items-center gap-2.5 mb-1 p-2 -mx-2 rounded-xl cursor-pointer transition-colors hover:bg-white/[0.04] w-full"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center transition-colors`}>
                      <Settings className={`w-4 h-4 ${accentClass}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white/90">Buat/Edit Turnamen</p>
                      <p className="text-[10px] text-white/30">Atur detail & hadiah turnamen</p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-white/20 flex-shrink-0" />
                  </motion.button>

                {/* Prize Pool Input */}
                <div className="space-y-3" id="prize-pool-section">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                      Hadiah Minggu Ini
                    </p>
                    <span className="text-[10px] text-white/20 font-medium">
                      Total: Rp {(tournament?.prizePool || 0).toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="glass-subtle rounded-2xl p-4 lg:p-6 space-y-3">
                    {([
                      { key: 'champion' as const, label: 'Juara 1', icon: '🥇', color: 'text-amber-400', placeholder: 'Contoh: 500000' },
                      { key: 'runnerUp' as const, label: 'Juara 2', icon: '🥈', color: 'text-gray-300', placeholder: 'Contoh: 250000' },
                      { key: 'third' as const, label: 'Juara 3', icon: '🥉', color: 'text-orange-400', placeholder: 'Contoh: 150000' },
                      { key: 'mvp' as const, label: 'MVP', icon: '⭐', color: 'text-purple-400', placeholder: 'Contoh: 100000' },
                    ]).map((field) => (
                      <div key={field.key} className="flex items-center gap-3">
                        <span className="text-base w-6 text-center">{field.icon}</span>
                        <span className={`text-[12px] font-semibold w-14 shrink-0 ${field.color}`}>
                          {field.label}
                        </span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-white/30 pointer-events-none">
                            Rp
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={prizeInput[field.key]}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              setPrizeInput((prev) => ({ ...prev, [field.key]: val }));
                            }}
                            placeholder={field.placeholder}
                            className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-3 py-2.5 text-white/90 text-[13px] lg:text-base placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                          />
                        </div>
                      </div>
                    ))}
                    <motion.button
                      onClick={() => {
                        const c = parseInt(prizeInput.champion) || 0;
                        const r = parseInt(prizeInput.runnerUp) || 0;
                        const t = parseInt(prizeInput.third) || 0;
                        const m = parseInt(prizeInput.mvp) || 0;
                        const total = c + r + t + m;
                        if (total === 0) return;
                        setPrizeSaving(true);
                        onUpdatePrizePool(total);
                        setPrizeSaving(false);
                      }}
                      className={`w-full py-2.5 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${
                        prizeSaving
                          ? 'opacity-50 pointer-events-none'
                          : isMale
                            ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20 hover:bg-amber-400/25'
                            : 'bg-violet-400/15 text-violet-400 border border-violet-400/20 hover:bg-violet-400/25'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.97 }}
                    >
                      {prizeSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Simpan Hadiah
                    </motion.button>
                  </div>
                </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 2: PEMBUATAN TIM — Team generation
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/12 flex items-center justify-center">
                      <Users className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white/90">Pembuatan Tim</p>
                      <p className="text-[10px] text-white/30">Buat & atur tim untuk turnamen</p>
                    </div>
                  </div>

                <div className="grid grid-cols-2 gap-2.5">
                    {teamsCount > 0 ? (
                      /* Reset Tim — muncul jika tim sudah ada */
                      <motion.button
                        onClick={onResetTeams}
                        className="glass-subtle rounded-2xl p-4 lg:p-6 text-left border border-orange-500/15"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center mb-2.5">
                          <RotateCcw className="w-4.5 h-4.5 text-orange-400" />
                        </div>
                        <p className="text-sm font-semibold text-orange-400">Reset Tim</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {teamsCount} tim &middot; buat ulang
                        </p>
                      </motion.button>
                    ) : (
                      /* Buat Tim — muncul jika belum ada tim */
                      <motion.button
                        onClick={onGenerateTeams}
                        className="glass-subtle rounded-2xl p-4 lg:p-6 text-left"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center mb-2.5">
                          <Users className="w-4.5 h-4.5 text-blue-400" />
                        </div>
                        <p className="text-sm font-semibold text-white/90">Buat Tim</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          {approvedRegistrations.length} pemain
                        </p>
                      </motion.button>
                    )}
                  </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 3: BRACKET — Bracket generation
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/12 flex items-center justify-center">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white/90">Bracket</p>
                      <p className="text-[10px] text-white/30">Buat bracket eliminasi langsung</p>
                    </div>
                  </div>

                <div className="space-y-3">
                  <motion.button
                    onClick={() => onGenerateBracket('single')}
                    className="w-full glass-subtle rounded-2xl p-4 lg:p-6 text-left"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <GitBranch className="w-4.5 h-4.5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Buat Bracket</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          Eliminasi langsung &middot; {teamsCount} tim
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 4: ONGOING — Tournament is live
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 4 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 rounded-xl bg-green-500/12 flex items-center justify-center">
                      <Play className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white/90">Turnamen Berlangsung</p>
                      <p className="text-[10px] text-white/30">Pertandingan sedang berjalan</p>
                    </div>
                  </div>

                <div className="glass-subtle rounded-2xl p-5 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                      <Play className="w-6 h-6 text-green-400" />
                    </div>
                    <p className="text-[13px] text-white/60 font-semibold mb-1">Pertandingan Sedang Berlangsung</p>
                    <p className="text-[11px] text-white/30 leading-relaxed">
                      Kelola skor & hasil pertandingan melalui tab Bracket. Turnamen akan otomatis berpindah ke status Selesai saat semua pertandingan selesai.
                    </p>
                  </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    STEP 5: COMPLETED — Finalize & Reset
                    ═══════════════════════════════════════════════════════ */}
                {currentStepIndex === 5 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                      <Flag className={`w-4 h-4 ${accentClass}`} />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-white/90">Finalisasi</p>
                      <p className="text-[10px] text-white/30">Turnamen selesai, finalisasi hasil</p>
                    </div>
                  </div>

                {/* Finalize Button */}
                <div className="space-y-3">
                  <motion.button
                    onClick={onFinalize}
                    className="w-full glass-subtle rounded-2xl p-4 lg:p-6 text-left"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <Flag className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white/90">Finalisasi Turnamen</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          Tetapkan juara & distribusi hadiah
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>

                {/* MVP Selection */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-purple-400" />
                    <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">MVP Minggu Ini</p>
                  </div>
                  <motion.button
                    onClick={() => setShowPlayerManagement(true)}
                    className="w-full glass-subtle rounded-2xl p-4 text-left"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                        <Star className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white/90">Kelola MVP</p>
                        <p className="text-[10px] text-white/30">Tetapkan & ubah MVP minggu ini dari daftar peserta</p>
                      </div>
                    </div>
                  </motion.button>
                </div>
                </div>
                )}

                {/* ═══════════════════════════════════════════════════════
                    RESET DATA — Always visible (emergency reset)
                    ═══════════════════════════════════════════════════════ */}
                <div className="space-y-3">
                  <motion.button
                    onClick={() => setShowResetConfirm(true)}
                    className="w-full glass-subtle rounded-2xl p-4 text-left border border-amber-500/10"
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                        <RotateCcw className="w-4.5 h-4.5 text-amber-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-amber-400">Reset Data</p>
                        <p className="text-[10px] text-white/25 mt-0.5">
                          Reset pertandingan & lanjut ke minggu berikutnya
                        </p>
                      </div>
                    </div>
                  </motion.button>
                </div>
                  </>
                ))}
                {/* end tournament conditional */}
                {adminTab === 'payment' && (
                  <div className="space-y-5">
                    {/* Active Methods Toggle */}
                    <div className="space-y-3">
                      <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                        Metode Aktif
                      </p>
                      <div className="flex gap-2">
                        {[
                          { id: 'qris', label: 'QRIS', icon: QrCode },
                          { id: 'bank_transfer', label: 'Bank Transfer', icon: Building2 },
                          { id: 'ewallet', label: 'E-Wallet', icon: Wallet },
                        ].map((method) => {
                          const isActive = paySettings.activeMethods.includes(method.id);
                          return (
                            <motion.button
                              key={method.id}
                              onClick={() => toggleActiveMethod(method.id)}
                              className={`flex-1 glass-subtle rounded-2xl p-3.5 text-center transition-all ${
                                isActive ? 'ring-1 ' + (isMale ? 'ring-amber-400/25' : 'ring-violet-400/25') : 'opacity-40'
                              }`}
                              whileTap={{ scale: 0.95 }}
                            >
                              <div className={`w-9 h-9 rounded-xl mx-auto mb-2 flex items-center justify-center ${
                                isActive
                                  ? (isMale ? 'bg-amber-500/15' : 'bg-violet-500/15')
                                  : 'bg-white/5'
                              }`}>
                                <method.icon className={`w-4.5 h-4.5 ${isActive ? accentClass : 'text-white/25'}`} />
                              </div>
                              <p className={`text-[11px] font-semibold ${isActive ? 'text-white/90' : 'text-white/30'}`}>
                                {method.label}
                              </p>
                              {isActive && (
                                <div className={`w-1.5 h-1.5 rounded-full mx-auto mt-1.5 ${isMale ? 'bg-amber-400' : 'bg-violet-400'}`} />
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>

                    {/* QRIS Settings */}
                    {paySettings.activeMethods.includes('qris') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <QrCode className={`w-4 h-4 ${accentClass}`} />
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            QRIS
                          </p>
                        </div>
                        <div className="glass-subtle rounded-2xl p-4 space-y-3">
                          <div>
                            <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Label QRIS
                            </label>
                            <input
                              type="text"
                              value={paySettings.qrisLabel}
                              onChange={(e) => updatePayField('qrisLabel', e.target.value)}
                              placeholder="IDOL META - QRIS"
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              URL Gambar QRIS (opsional)
                            </label>
                            <input
                              type="url"
                              value={paySettings.qrisImage}
                              onChange={(e) => updatePayField('qrisImage', e.target.value)}
                              placeholder="https://example.com/qris.png"
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                            />
                            <p className="text-[10px] text-white/20 mt-1.5">Kosongkan untuk auto-generate QR code</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Transfer Settings */}
                    {paySettings.activeMethods.includes('bank_transfer') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-400" />
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Bank Transfer
                          </p>
                        </div>
                        <div className="glass-subtle rounded-2xl p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                                Nama Bank
                              </label>
                              <input
                                type="text"
                                value={paySettings.bankName}
                                onChange={(e) => updatePayField('bankName', e.target.value)}
                                placeholder="Bank BCA"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                                Kode Bank
                              </label>
                              <input
                                type="text"
                                value={paySettings.bankCode}
                                onChange={(e) => updatePayField('bankCode', e.target.value)}
                                placeholder="BCA"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Nomor Rekening
                            </label>
                            <input
                              type="text"
                              value={paySettings.bankNumber}
                              onChange={(e) => updatePayField('bankNumber', e.target.value)}
                              placeholder="1234567890"
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">
                              Atas Nama
                            </label>
                            <input
                              type="text"
                              value={paySettings.bankHolder}
                              onChange={(e) => updatePayField('bankHolder', e.target.value)}
                              placeholder="IDOL META"
                              className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* E-Wallet Settings */}
                    {paySettings.activeMethods.includes('ewallet') && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            E-Wallet
                          </p>
                        </div>

                        {/* GoPay */}
                        <div className="glass-subtle rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center">
                              <Wallet className="w-3.5 h-3.5 text-white/90" />
                            </div>
                            <p className="text-[12px] font-semibold text-white/90">GoPay</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.gopayNumber}
                                onChange={(e) => updatePayField('gopayNumber', e.target.value)}
                                placeholder="081234567890"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.gopayHolder}
                                onChange={(e) => updatePayField('gopayHolder', e.target.value)}
                                placeholder="IDOL META"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* OVO */}
                        <div className="glass-subtle rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center">
                              <Wallet className="w-3.5 h-3.5 text-white/90" />
                            </div>
                            <p className="text-[12px] font-semibold text-white/90">OVO</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.ovoNumber}
                                onChange={(e) => updatePayField('ovoNumber', e.target.value)}
                                placeholder="081234567890"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.ovoHolder}
                                onChange={(e) => updatePayField('ovoHolder', e.target.value)}
                                placeholder="IDOL META"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                          </div>
                        </div>

                        {/* DANA */}
                        <div className="glass-subtle rounded-2xl p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center">
                              <Wallet className="w-3.5 h-3.5 text-white/90" />
                            </div>
                            <p className="text-[12px] font-semibold text-white/90">DANA</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Nomor</label>
                              <input
                                type="text"
                                value={paySettings.danaNumber}
                                onChange={(e) => updatePayField('danaNumber', e.target.value)}
                                placeholder="081234567890"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-white/35 mb-2 block uppercase tracking-wider font-semibold">Atas Nama</label>
                              <input
                                type="text"
                                value={paySettings.danaHolder}
                                onChange={(e) => updatePayField('danaHolder', e.target.value)}
                                placeholder="IDOL META"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Save Button */}
                    <motion.button
                      onClick={handleSavePaymentSettings}
                      disabled={paySettingsSaving}
                      className={`${btnClass} btn-ios w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-50`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {paySettingsSaving ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Menyimpan...
                        </>
                      ) : paySettingsSaved ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Tersimpan!
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Simpan Pengaturan Pembayaran
                        </>
                      )}
                    </motion.button>

                    {/* ── Pending Payment Verification Section ── */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${accentClass}`} />
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Verifikasi Pembayaran
                          </p>
                        </div>
                        {pendingPayments.length > 0 && (
                          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/12 text-amber-400">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            <span className="text-[10px] font-bold">{pendingPayments.length} menunggu verifikasi</span>
                          </span>
                        )}
                      </div>

                      {paymentsLoading ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                        </div>
                      ) : pendingPayments.length === 0 ? (
                        <div className="glass-subtle rounded-2xl p-6 text-center">
                          <CheckCircle className="w-7 h-7 text-[--ios-green]/40 mx-auto mb-2" />
                          <p className="text-[13px] text-white/30 font-medium">Semua pembayaran telah diverifikasi</p>
                          <p className="text-[11px] text-white/15 mt-0.5">Tidak ada pembayaran tertunda</p>
                        </div>
                      ) : (
                        <div className="space-y-2.5 max-h-[300px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                          {pendingPayments.map((payment) => {
                            const pmLabel = payment.paymentMethod === 'qris' ? 'QRIS' : payment.paymentMethod === 'bank_transfer' ? 'Bank' : 'E-Wallet';
                            const pmIcon = payment.paymentMethod === 'qris' ? '🟦' : payment.paymentMethod === 'bank_transfer' ? '🏦' : '💳';
                            const timeAgoStr = (() => {
                              const diff = Date.now() - new Date(payment.createdAt).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return 'baru saja';
                              if (mins < 60) return `${mins}m lalu`;
                              const hrs = Math.floor(mins / 60);
                              if (hrs < 24) return `${hrs}j lalu`;
                              return `${Math.floor(hrs / 24)}h lalu`;
                            })();

                            return (
                              <motion.div
                                key={payment.id}
                                className="glass-subtle rounded-2xl p-3.5"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                              >
                                {/* Top row: type badge + amount + time */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    payment.type === 'donation'
                                      ? 'bg-blue-500/15 text-blue-400'
                                      : 'bg-emerald-500/15 text-emerald-400'
                                  }`}>
                                    {payment.type === 'donation' ? 'Donasi' : 'Sawer'}
                                  </span>
                                  <span className={`text-[14px] font-bold ${accentClass}`}>Rp {payment.amount}</span>
                                  <span className="text-[11px] text-white/25 ml-auto">{timeAgoStr}</span>
                                </div>

                                {/* Info row: from + method */}
                                <div className="flex items-center gap-2 mb-2.5">
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {payment.fromAvatar ? (
                                      <div className="w-7 h-7 rounded-full overflow-hidden bg-white/5 shrink-0">
                                        <img src={payment.fromAvatar} alt={payment.from} className="w-full h-full object-cover" />
                                      </div>
                                    ) : (
                                      <div className="w-7 h-7 rounded-full bg-white/8 flex items-center justify-center shrink-0">
                                        <span className="text-[10px] font-bold text-white/50">{payment.from[0]}</span>
                                      </div>
                                    )}
                                    <div className="min-w-0">
                                      <p className="text-[12px] font-semibold text-white/90 truncate">{payment.from}</p>
                                      {payment.targetPlayerName && (
                                        <p className="text-[10px] text-white/30 truncate">→ {payment.targetPlayerName}</p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-white/30 shrink-0">{pmIcon} {pmLabel}</span>
                                </div>

                                {/* Proof thumbnail */}
                                {payment.proofImageUrl ? (
                                  <div
                                    className="flex items-center gap-2 mb-2.5 p-2 rounded-xl bg-white/5 cursor-pointer hover:bg-white/8 transition-colors"
                                    onClick={() => handleViewProof(payment.proofImageUrl!)}
                                  >
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/5 shrink-0">
                                      <img src={payment.proofImageUrl} alt="Bukti" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex items-center gap-1 flex-1 min-w-0">
                                      <ImageIcon className="w-3.5 h-3.5 text-white/30 shrink-0" />
                                      <span className="text-[11px] text-white/40 truncate">Bukti transfer</span>
                                    </div>
                                    <Eye className="w-3.5 h-3.5 text-white/20 shrink-0" />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 mb-2.5 px-1">
                                    <ImageIcon className="w-3 h-3 text-white/15" />
                                    <span className="text-[10px] text-white/20 italic">Tidak ada bukti</span>
                                  </div>
                                )}

                                {/* Action buttons */}
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => handleVerifyPayment(payment.id, payment.type, 'confirmed')}
                                    disabled={verifyingId === payment.id}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-emerald-500/12 text-emerald-400 border border-emerald-500/15 disabled:opacity-40"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {verifyingId === payment.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Check className="w-3.5 h-3.5" />
                                    )}
                                    Setujui
                                  </motion.button>
                                  <motion.button
                                    onClick={() => handleVerifyPayment(payment.id, payment.type, 'rejected')}
                                    disabled={verifyingId === payment.id}
                                    className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 bg-red-500/10 text-red-400 border border-red-500/15 disabled:opacity-40"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {verifyingId === payment.id ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <XCircle className="w-3.5 h-3.5" />
                                    )}
                                    Tolak
                                  </motion.button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {/* end payment tab */}

                {/* ═══ CLUBS TAB ═══ */}
                {adminTab === 'clubs' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                          <Building2 className={`w-4 h-4 ${accentClass}`} />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/90">Kelola Club</p>
                          <p className="text-[10px] text-white/30">{clubs.length} club terdaftar</p>
                        </div>
                      </div>
                      {!showCreateClub && (
                        <motion.button
                          onClick={() => setShowCreateClub(true)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold ${isMale ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20' : 'bg-violet-400/15 text-violet-400 border border-violet-400/20'}`}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Tambah Club
                        </motion.button>
                      )}
                    </div>

                    {/* Create Club Form */}
                    <AnimatePresence>
                      {showCreateClub && (
                        <motion.div
                          className="glass-subtle rounded-2xl p-4 space-y-3"
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Club Baru
                          </p>
                          {/* Logo Upload */}
                          <div className="flex justify-center">
                            <ImageUpload
                              value={newClubLogo}
                              onChange={(url) => setNewClubLogo(url)}
                              accentColor={isMale ? 'gold' : 'pink'}
                            />
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newClubName}
                              onChange={(e) => setNewClubName(e.target.value)}
                              placeholder="Nama club..."
                              className="flex-1 bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && newClubName.trim().length >= 2) {
                                  setCreatingClub(true);
                                  fetch('/api/clubs', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ name: newClubName.trim(), logoUrl: newClubLogo }),
                                  })
                                    .then((r) => r.json())
                                    .then((data) => {
                                      if (data.success) {
                                        setNewClubName('');
                                        setNewClubLogo(null);
                                        setShowCreateClub(false);
                                        fetchClubs();
                                        broadcastClubUpdate();
                                        addToast('Club berhasil dibuat!', 'success');
                                      } else {
                                        addToast(data.error || 'Gagal membuat club', 'error');
                                      }
                                    })
                                    .catch(() => addToast('Terjadi kesalahan', 'error'))
                                    .finally(() => setCreatingClub(false));
                                }
                              }}
                            />
                            <motion.button
                              onClick={() => {
                                if (newClubName.trim().length < 2) return;
                                setCreatingClub(true);
                                fetch('/api/clubs', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ name: newClubName.trim(), logoUrl: newClubLogo }),
                                })
                                  .then((r) => r.json())
                                  .then((data) => {
                                    if (data.success) {
                                      setNewClubName('');
                                      setNewClubLogo(null);
                                      setShowCreateClub(false);
                                      fetchClubs();
                                      addToast('Club berhasil dibuat!', 'success');
                                    } else {
                                      addToast(data.error || 'Gagal membuat club', 'error');
                                    }
                                  })
                                  .catch(() => addToast('Terjadi kesalahan', 'error'))
                                  .finally(() => setCreatingClub(false));
                              }}
                              disabled={creatingClub || newClubName.trim().length < 2}
                              className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all ${creatingClub || newClubName.trim().length < 2 ? 'opacity-40 pointer-events-none' : btnClass}`}
                              whileTap={{ scale: 0.97 }}
                            >
                              {creatingClub ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                              <span className="hidden sm:inline">Buat</span>
                            </motion.button>
                            <motion.button
                              onClick={() => { setShowCreateClub(false); setNewClubName(''); setNewClubLogo(null); }}
                              className="px-3 py-2.5 rounded-xl text-[12px] glass-subtle text-white/50"
                              whileTap={{ scale: 0.97 }}
                            >
                              <XCircle className="w-4 h-4" />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Club List */}
                    {clubsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                      </div>
                    ) : clubs.length === 0 ? (
                      <div className="glass-subtle rounded-2xl p-6 text-center">
                        <Building2 className="w-7 h-7 text-white/20 mx-auto mb-2" />
                        <p className="text-[13px] text-white/30 font-medium">Belum ada club</p>
                        <p className="text-[11px] text-white/20 mt-1">Buat club pertama untuk memulai</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                        {clubs.map((club, index) => (
                          <motion.div
                            key={club.id}
                            className="glass-subtle rounded-2xl p-4 transition-all"
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                          >
                            {showDeleteClubConfirm === club.id ? (
                              /* Delete Confirmation */
                              <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                                  <p className="text-[12px] text-red-400 font-semibold">Hapus club "{club.name}"?</p>
                                </div>
                                <p className="text-[11px] text-white/40 leading-relaxed">
                                  Semua anggota akan kehilangan afiliasi club. Tindakan ini tidak dapat dibatalkan.
                                </p>
                                <div className="flex gap-2">
                                  <motion.button
                                    onClick={() => setShowDeleteClubConfirm(null)}
                                    className="flex-1 py-2 rounded-xl text-[11px] font-semibold glass-subtle text-white/60"
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    Batal
                                  </motion.button>
                                  <motion.button
                                    onClick={() => {
                                      setDeletingClub(true);
                                      fetch(`/api/clubs?id=${club.id}`, { method: 'DELETE' })
                                        .then((r) => r.json())
                                        .then((data) => {
                                          if (data.success) {
                                            setShowDeleteClubConfirm(null);
                                            fetchClubs();
                                            broadcastClubUpdate();
                                            addToast('Club berhasil dihapus', 'success');
                                          } else {
                                            addToast(data.error || 'Gagal menghapus', 'error');
                                          }
                                        })
                                        .catch(() => addToast('Terjadi kesalahan', 'error'))
                                        .finally(() => setDeletingClub(false));
                                    }}
                                    disabled={deletingClub}
                                    className="flex-1 py-2 rounded-xl text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                                    whileTap={{ scale: 0.97 }}
                                  >
                                    {deletingClub ? <Loader2 className="w-3.5 h-3.5 animate-spin mx-auto" /> : 'Ya, Hapus'}
                                  </motion.button>
                                </div>
                              </div>
                            ) : (
                              /* Club Info Row */
                              <div className="flex items-center gap-3">
                                {/* Club Avatar */}
                                <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
                                  {club.logoUrl ? (
                                    <img
                                      src={club.logoUrl}
                                      alt={club.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                        (e.target as HTMLImageElement).parentElement!.innerHTML = `<div class="w-full h-full flex items-center justify-center text-[13px] font-bold text-white/80 ${isMale ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-gradient-to-br from-violet-500/30 to-purple-600/30'}">${club.name.slice(0, 2).toUpperCase()}</div>`;
                                      }}
                                    />
                                  ) : (
                                    <div className={`w-full h-full flex items-center justify-center text-[13px] font-bold text-white/80 ${isMale ? 'bg-gradient-to-br from-amber-500/30 to-orange-600/30' : 'bg-gradient-to-br from-violet-500/30 to-purple-600/30'}`}>
                                      {club.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </div>

                                {/* Club Info */}
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-bold text-white/90 truncate">{club.name}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-white/30">
                                      {club.memberCount} anggota
                                    </span>
                                    {club.memberCount > 0 && (
                                      <>
                                        <span className="text-white/10">·</span>
                                        <span className="text-[10px] text-white/30">
                                          {club.totalPoints.toLocaleString('id-ID')} pts
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <motion.button
                                    onClick={() => {
                                      setEditingClub({ id: club.id, name: club.name, slug: club.slug, logoUrl: club.logoUrl });
                                      setEditClubName(club.name);
                                      setEditClubLogo(club.logoUrl || '');
                                    }}
                                    className={`w-8 h-8 rounded-xl ${accentBgSubtle} flex items-center justify-center ${accentClass} hover:bg-white/10 transition-colors`}
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </motion.button>
                                  <motion.button
                                    onClick={() => setShowDeleteClubConfirm(club.id)}
                                    className="w-8 h-8 rounded-xl bg-red-500/8 flex items-center justify-center text-red-400/50 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </motion.button>
                                </div>
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ═══ RBAC TAB ═══ */}
                {adminTab === 'rbac' && (
                  <div className="space-y-5">
                    {/* Section Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-500/12 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-white/90">Admin & RBAC</p>
                          <p className="text-[10px] text-white/30">Kelola admin & hak akses</p>
                        </div>
                      </div>
                      {adminUser?.role === 'super_admin' && (
                        <motion.button
                          onClick={() => setShowAddAdmin(true)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-semibold ${isMale ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20' : 'bg-violet-400/15 text-violet-400 border border-violet-400/20'}`}
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          Tambah Admin
                        </motion.button>
                      )}
                    </div>

                    {/* Admin List */}
                    {rbacLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className={`w-5 h-5 animate-spin ${accentClass}`} />
                      </div>
                    ) : adminList.length === 0 ? (
                      <div className="glass-subtle rounded-2xl p-6 text-center">
                        <Users className="w-7 h-7 text-white/20 mx-auto mb-2" />
                        <p className="text-[13px] text-white/30 font-medium">Belum ada admin</p>
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                        {adminList.map((admin) => {
                          const isSuperAdmin = admin.role === 'super_admin';
                          const isSelf = admin.id === adminUser?.id;
                          return (
                            <motion.div
                              key={admin.id}
                              className={`glass-subtle rounded-2xl p-4 transition-all ${isSuperAdmin ? 'ring-1 ring-amber-400/20' : ''}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {/* Admin Info Row */}
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSuperAdmin ? 'bg-amber-500/15' : 'bg-white/5'}`}>
                                  {isSuperAdmin ? <Crown className="w-4 h-4 text-amber-400" /> : <ShieldCheck className="w-4 h-4 text-white/50" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[13px] font-semibold text-white/90 truncate">{admin.name}</p>
                                    {isSelf && (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/40 font-medium">Anda</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[11px] text-white/35 truncate">{admin.email || 'No email'}</p>
                                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                      isSuperAdmin ? 'bg-amber-400/15 text-amber-400' : 'bg-white/8 text-white/50'
                                    }`}>
                                      {isSuperAdmin ? 'Super Admin' : 'Admin'}
                                    </span>
                                  </div>
                                </div>
                                {/* Delete button — only for non-super_admin */}
                                {!isSuperAdmin && adminUser?.role === 'super_admin' && (
                                  <motion.button
                                    onClick={() => setShowDeleteConfirm(admin.id)}
                                    className="w-8 h-8 rounded-xl bg-red-500/8 flex items-center justify-center text-red-400/50 hover:bg-red-500/15 hover:text-red-400 transition-colors"
                                    whileTap={{ scale: 0.9 }}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </motion.button>
                                )}
                              </div>

                              {/* Permissions */}
                              {isSuperAdmin ? (
                                <div className="rounded-xl bg-amber-500/5 border border-amber-500/8 p-3">
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <Crown className="w-3 h-3 text-amber-400/60" />
                                    <span className="text-[10px] font-semibold text-amber-400/60 uppercase tracking-wider">Semua Akses</span>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {['Tournament', 'Players', 'Bracket', 'Scores', 'Prize Pool', 'Donations', 'Full Reset', 'Manage Admins'].map((p) => (
                                      <span key={p} className="flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full bg-amber-400/8 text-amber-400/50 font-medium">
                                        <Check className="w-2.5 h-2.5" />
                                        {p}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Permissions</p>
                                    {adminUser?.role === 'super_admin' && (
                                      <button
                                        onClick={() => setEditingPermId(editingPermId === admin.id ? null : admin.id)}
                                        className="text-[10px] text-white/40 hover:text-white/60 transition-colors font-medium"
                                      >
                                        {editingPermId === admin.id ? 'Selesai' : 'Edit'}
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {([
                                      { key: 'tournament', label: 'Tournament' },
                                      { key: 'players', label: 'Players' },
                                      { key: 'bracket', label: 'Bracket' },
                                      { key: 'scores', label: 'Scores' },
                                      { key: 'prize', label: 'Prize Pool' },
                                      { key: 'donations', label: 'Donations' },
                                      { key: 'full_reset', label: 'Full Reset' },
                                      { key: 'manage_admins', label: 'Manage Admins' },
                                    ]).map((perm) => {
                                      const hasPerm = admin.permissions[perm.key] ?? false;
                                      const isEditing = editingPermId === admin.id && adminUser?.role === 'super_admin';
                                      return (
                                        <div
                                          key={perm.key}
                                          className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg ${hasPerm ? 'bg-emerald-500/8' : 'bg-white/[0.03]'} transition-colors`}
                                        >
                                          <span className={`text-[10px] font-medium ${hasPerm ? 'text-emerald-400/80' : 'text-white/25'}`}>
                                            {perm.label}
                                          </span>
                                          <div
                                            className={`w-7 h-4 rounded-full flex items-center transition-colors cursor-pointer ${hasPerm ? 'bg-emerald-500/40 justify-end' : 'bg-white/10 justify-start'}`}
                                            onClick={isEditing ? () => {
                                              const updated = { ...admin.permissions, [perm.key]: !hasPerm };
                                              setAdminList((prev) => prev.map((a) => a.id === admin.id ? { ...a, permissions: updated } : a));
                                            } : undefined}
                                          >
                                            <div className={`w-3 h-3 rounded-full bg-white/80 shadow-sm transition-transform ${hasPerm ? 'translate-x-0' : '-translate-x-1'}`} />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {editingPermId === admin.id && (
                                    <motion.button
                                      onClick={async () => {
                                        setRbacLoading(true);
                                        try {
                                          await adminFetch('/api/admin/manage', {
                                            method: 'PUT',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ requesterId: adminUser?.id, targetAdminId: admin.id, permissions: admin.permissions }),
                                          });
                                          setEditingPermId(null);
                                        } catch {}
                                        setRbacLoading(false);
                                      }}
                                      disabled={rbacLoading}
                                      className={`w-full py-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1.5 ${isMale ? 'btn-gold' : 'btn-pink'} disabled:opacity-50`}
                                      whileHover={{ scale: 1.01 }}
                                      whileTap={{ scale: 0.97 }}
                                    >
                                      {rbacLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                      Simpan Permissions
                                    </motion.button>
                                  )}
                                </div>
                              )}

                              {/* Created date */}
                              <p className="text-[9px] text-white/15 mt-2">
                                Dibuat: {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}

                    {/* ═══ BOT MANAGEMENT ═══ */}
                    <div className="pt-4 border-t border-white/[0.04]">
                      <BotManagementTab
                        accentClass={accentClass}
                        accentBgSubtle={accentBgSubtle}
                        btnClass={btnClass}
                        isMale={isMale}
                        isAdminSuperAdmin={adminUser?.role === 'super_admin'}
                      />
                    </div>

                    {/* ═══ DANGER ZONE: Full Reset ═══ */}
                    {adminUser?.role === 'super_admin' && (
                      <div className="space-y-3 pt-4 border-t border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-400" />
                          <p className="text-[11px] tracking-[0.2em] uppercase text-white/30 font-semibold">
                            Danger Zone
                          </p>
                        </div>
                        <motion.button
                          onClick={() => setShowFullResetConfirm(true)}
                          className="w-full glass-subtle rounded-2xl p-4 text-left border border-red-500/15"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                              <Trash2 className="w-4.5 h-4.5 text-red-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-red-400">Full Database Reset</p>
                              <p className="text-[10px] text-white/25 mt-0.5">
                                Hapus SEMUA data & mulai dari nol
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Reset Confirmation Dialog */}
              <AnimatePresence>
                {showResetConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full glass rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${(tournament?.week || 1) >= 8 ? 'bg-purple-500/15' : 'bg-amber-500/15'}`}>
                          <RotateCcw className={`w-7 h-7 ${(tournament?.week || 1) >= 8 ? 'text-purple-400' : 'text-amber-400'}`} />
                        </div>
                        <h3 className="text-lg font-bold text-white/90">
                          {(tournament?.week || 1) >= 8 ? 'Mulai Musim Baru?' : 'Reset Data?'}
                        </h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          {(tournament?.week || 1) >= 8
                            ? 'Grand Final selesai! Data akan direset untuk memulai musim baru:'
                            : 'Data pertandingan minggu ini akan dihapus:'}
                        </p>
                        <div className="mt-3 space-y-1.5 text-left w-full">
                          {(tournament?.week || 1) >= 8
                            ? ['Semua pertandingan & skor', 'Semua tim & bracket', 'Semua data sawer', 'Nomor minggu → kembali ke 1', 'Nama turnamen → Musim Baru'].map((item) => (
                              <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                                <XCircle className="w-3 h-3 text-purple-400/60 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))
                            : ['Semua pertandingan & skor', 'Semua tim & bracket', 'Semua data sawer'].map((item) => (
                              <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                                <XCircle className="w-3 h-3 text-red-400/60 flex-shrink-0" />
                                <span>{item}</span>
                              </div>
                            ))}
                        </div>
                        <p className="text-[11px] text-amber-400/80 mt-2 font-medium">
                          ✓ Point, kemenangan, MVP & data pemain tetap tersimpan
                        </p>
                        <p className="text-[11px] text-white/30 mt-1">
                          {(tournament?.week || 1) >= 8
                            ? 'Siklus 8 minggu menuju Grand Final dimulai lagi.'
                            : `Turnamen lanjut ke Minggu ${(tournament?.week || 1) + 1}.`}
                        </p>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold glass-subtle text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={() => {
                              setShowResetConfirm(false);
                              setShowPanel(false);
                              onResetSeason();
                            }}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/20"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            Ya, Reset
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Proof Image Preview Modal */}
              <AnimatePresence>
                {showProofModal === 'view' && proofModalUrl && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setShowProofModal(null);
                      setProofModalUrl(null);
                    }}
                  >
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full max-w-sm"
                      initial={{ scale: 0.85, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.85, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="glass rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                          <div className="flex items-center gap-2">
                            <ImageIcon className={`w-4 h-4 ${accentClass}`} />
                            <span className="text-[13px] font-semibold text-white/90">Bukti Pembayaran</span>
                          </div>
                          <button
                            onClick={() => {
                              setShowProofModal(null);
                              setProofModalUrl(null);
                            }}
                            className="w-7 h-7 rounded-lg bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4">
                          <div className="rounded-xl overflow-hidden bg-white/5">
                            <img
                              src={proofModalUrl}
                              alt="Bukti pembayaran"
                              className="w-full h-auto max-h-[60vh] object-contain"
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Admin Modal */}
              <AnimatePresence>
                {showAddAdmin && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-end sm:items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowAddAdmin(false)}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full max-w-sm glass rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0, y: 20 }}
                      animate={{ scale: 1, opacity: 1, y: 0 }}
                      exit={{ scale: 0.9, opacity: 0, y: 20 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-10 h-10 rounded-xl ${isMale ? 'bg-amber-500/15' : 'bg-violet-500/15'} flex items-center justify-center`}>
                          <UserPlus className={`w-5 h-5 ${isMale ? 'text-amber-400' : 'text-violet-400'}`} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white/90">Tambah Admin Baru</h3>
                          <p className="text-[11px] text-white/35">Buat akun admin dengan permissions tertentu</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider font-semibold">Nama *</label>
                          <input
                            type="text"
                            value={newAdminName}
                            onChange={(e) => setNewAdminName(e.target.value)}
                            placeholder="Nama admin"
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider font-semibold">PIN (6 digit) *</label>
                          <input
                            type="tel"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={6}
                            value={newAdminPin}
                            onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="Contoh: 123456"
                            className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-white/15 transition-colors tracking-widest"
                          />
                          <p className="text-[10px] text-white/25 mt-1">PIN harus 6 digit angka</p>
                        </div>

                        {/* Permission Toggles */}
                        <div>
                          <div className="flex items-center gap-1.5 mb-2.5">
                            <KeyRound className="w-3.5 h-3.5 text-white/30" />
                            <p className="text-[11px] uppercase tracking-wider text-white/30 font-semibold">Permissions</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {([
                              { key: 'tournament', label: 'Tournament' },
                              { key: 'players', label: 'Players' },
                              { key: 'bracket', label: 'Bracket' },
                              { key: 'scores', label: 'Scores' },
                              { key: 'prize', label: 'Prize Pool' },
                              { key: 'donations', label: 'Donations' },
                              { key: 'full_reset', label: 'Full Reset' },
                              { key: 'manage_admins', label: 'Manage Admins' },
                            ]).map((perm) => {
                              const hasPerm = newAdminPerms[perm.key] ?? false;
                              return (
                                <div
                                  key={perm.key}
                                  className={`flex items-center justify-between px-3 py-2 rounded-xl ${hasPerm ? 'bg-emerald-500/8' : 'bg-white/[0.03]'} transition-colors`}
                                  onClick={() => setNewAdminPerms((prev) => ({ ...prev, [perm.key]: !hasPerm }))}
                                >
                                  <span className={`text-[11px] font-medium ${hasPerm ? 'text-emerald-400/80' : 'text-white/25'}`}>
                                    {perm.label}
                                  </span>
                                  <div className={`w-8 h-[18px] rounded-full flex items-center transition-colors ${hasPerm ? 'bg-emerald-500/40 justify-end' : 'bg-white/10 justify-start'}`}>
                                    <div className={`w-[14px] h-[14px] rounded-full bg-white/80 shadow-sm transition-transform ${hasPerm ? 'translate-x-0' : '-translate-x-1'}`} />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 mt-5">
                        <motion.button
                          onClick={() => {
                            setShowAddAdmin(false);
                            setNewAdminName('');
                            setNewAdminPin('');
                            setNewAdminPerms({ tournament: true, players: true, bracket: true, scores: true, prize: true, donations: true, full_reset: false, manage_admins: false });
                          }}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold glass-subtle text-white/70"
                          whileTap={{ scale: 0.97 }}
                        >
                          Batal
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            if (!newAdminName.trim()) {
                              addToast('Nama wajib diisi', 'error');
                              return;
                            }
                            if (newAdminPin.length !== 6) {
                              addToast('PIN harus 6 digit', 'error');
                              return;
                            }
                            setRbacLoading(true);
                            try {
                              const res = await adminFetch('/api/admin/manage', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ requesterId: adminUser?.id, name: newAdminName.trim(), pin: newAdminPin, permissions: newAdminPerms }),
                              });
                              const data = await res.json().catch(() => null);
                              if (res.ok && data?.success) {
                                setAdminList((prev) => [...prev, { id: data.admin.id, name: data.admin.name, email: data.admin.email || '', role: data.admin.role, permissions: newAdminPerms, createdAt: data.admin.createdAt }]);
                                setShowAddAdmin(false);
                                setNewAdminName('');
                                setNewAdminPin('');
                                setNewAdminPerms({ tournament: true, players: true, bracket: true, scores: true, prize: true, donations: true, full_reset: false, manage_admins: false });
                                addToast(`Admin "${data.admin.name}" berhasil dibuat`, 'success');
                              } else {
                                addToast(data?.error || 'Gagal menambah admin', 'error');
                              }
                            } catch (err) {
                              console.error('Create admin error:', err);
                              addToast('Terjadi kesalahan jaringan', 'error');
                            }
                            setRbacLoading(false);
                          }}
                          disabled={rbacLoading || !newAdminName.trim() || newAdminPin.length !== 6}
                          className={`flex-1 py-3 rounded-xl text-sm font-semibold ${isMale ? 'btn-gold' : 'btn-pink'} disabled:opacity-40`}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.97 }}
                        >
                          {rbacLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                          ) : (
                            'Buat Admin'
                          )}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Delete Admin Confirmation Modal */}
              <AnimatePresence>
                {showDeleteConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowDeleteConfirm(null)}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full glass rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                          <Trash2 className="w-7 h-7 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white/90">Hapus Admin?</h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          Admin ini akan dihapus secara permanen dan tidak bisa login lagi.
                        </p>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => setShowDeleteConfirm(null)}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold glass-subtle text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={async () => {
                              setRbacLoading(true);
                              try {
                                await fetch(`/api/admin/manage?requesterId=${adminUser?.id}&targetId=${showDeleteConfirm}`, { method: 'DELETE' });
                                setAdminList((prev) => prev.filter((a) => a.id !== showDeleteConfirm));
                                setShowDeleteConfirm(null);
                              } catch {}
                              setRbacLoading(false);
                            }}
                            disabled={rbacLoading}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-50"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {rbacLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Hapus'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Full Database Reset Confirmation Modal */}
              <AnimatePresence>
                {showFullResetConfirm && (
                  <motion.div
                    className="absolute inset-0 z-[60] flex items-center justify-center p-6"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => { setShowFullResetConfirm(false); setFullResetConfirmText(''); }}
                  >
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
                    <motion.div
                      className="relative w-full glass rounded-2xl p-6"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.9, opacity: 0 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                          <AlertTriangle className="w-7 h-7 text-red-400" />
                        </div>
                        <h3 className="text-lg font-bold text-red-400">Full Database Reset</h3>
                        <p className="text-sm text-white/50 mt-2 leading-relaxed">
                          SEMUA data akan dihapus secara permanen. Tindakan ini tidak bisa dibatalkan.
                        </p>
                        <div className="mt-3 space-y-1.5 text-left w-full">
                          {['Semua turnamen & bracket', 'Semua pemain & pendaftaran', 'Semua skor & MVP', 'Semua pembayaran & donasi', 'Semua pengaturan'].map((item) => (
                            <div key={item} className="flex items-center gap-2 text-xs text-white/40">
                              <XCircle className="w-3 h-3 text-red-400/60 flex-shrink-0" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 w-full">
                          <label className="text-[11px] text-white/35 mb-1.5 block uppercase tracking-wider font-semibold text-left">
                            Ketik <span className="text-red-400 font-bold">RESET SEMUA DATA</span> untuk konfirmasi
                          </label>
                          <input
                            type="text"
                            value={fullResetConfirmText}
                            onChange={(e) => setFullResetConfirmText(e.target.value)}
                            placeholder="RESET SEMUA DATA"
                            className="w-full bg-white/5 border border-red-500/15 rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/20 focus:outline-none focus:border-red-500/30 transition-colors"
                          />
                        </div>
                        <div className="flex gap-3 mt-5 w-full">
                          <motion.button
                            onClick={() => { setShowFullResetConfirm(false); setFullResetConfirmText(''); }}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold glass-subtle text-white/70"
                            whileTap={{ scale: 0.97 }}
                          >
                            Batal
                          </motion.button>
                          <motion.button
                            onClick={async () => {
                              if (fullResetConfirmText !== 'RESET SEMUA DATA') return;
                              setFullResetLoading(true);
                              try {
                                const res = await adminFetch('/api/admin/full-reset', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ requesterId: adminUser?.id, confirmPhrase: 'RESET SEMUA DATA' }),
                                });
                                const data = await res.json();
                                if (res.ok && data.success) {
                                  setShowFullResetConfirm(false);
                                  setFullResetConfirmText('');
                                  setShowPanel(false);
                                  addToast('Database berhasil direset!', 'success');
                                  storeFetchData(false);
                                } else {
                                  addToast(data.error || 'Gagal mereset database', 'error');
                                }
                              } catch {}
                              setFullResetLoading(false);
                            }}
                            disabled={fullResetLoading || fullResetConfirmText !== 'RESET SEMUA DATA'}
                            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            {fullResetLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Reset Semua'}
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Edit Club Modal ═══ */}
      <AnimatePresence>
        {editingClub && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setEditingClub(null)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-md glass rounded-t-[28px] sm:rounded-2xl p-5"
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-2 pb-3 sm:hidden">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-5">
                <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                  <Pencil className={`w-5 h-5 ${accentClass}`} />
                </div>
                <div>
                  <p className="text-[14px] font-bold text-white/90">Edit Club</p>
                  <p className="text-[11px] text-white/30">{editingClub.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Name Input */}
                <div>
                  <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                    Nama Club
                  </label>
                  <input
                    type="text"
                    value={editClubName}
                    onChange={(e) => setEditClubName(e.target.value)}
                    placeholder="Nama club..."
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Logo Upload */}
                <div className="flex justify-center">
                  <ImageUpload
                    value={editClubLogo || null}
                    onChange={(url) => setEditClubLogo(url || '')}
                    accentColor={isMale ? 'gold' : 'pink'}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-1">
                  <motion.button
                    onClick={() => setEditingClub(null)}
                    className="flex-1 py-3 rounded-xl text-[13px] font-semibold glass-subtle text-white/60"
                    whileTap={{ scale: 0.97 }}
                  >
                    Batal
                  </motion.button>
                  <motion.button
                    onClick={() => {
                      setEditClubSaving(true);
                      fetch('/api/clubs', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          clubId: editingClub.id,
                          name: editClubName.trim(),
                          logoUrl: editClubLogo.trim() || null,
                        }),
                      })
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.success) {
                            setEditingClub(null);
                            fetchClubs();
                            broadcastClubUpdate();
                          } else {
                            addToast(data.error || 'Gagal mengubah club', 'error');
                          }
                        })
                        .catch(() => addToast('Terjadi kesalahan', 'error'))
                        .finally(() => setEditClubSaving(false));
                    }}
                    disabled={editClubSaving || editClubName.trim().length < 2}
                    className={`flex-1 py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${editClubSaving || editClubName.trim().length < 2 ? 'opacity-40 pointer-events-none' : btnClass}`}
                    whileTap={{ scale: 0.97 }}
                  >
                    {editClubSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {editClubSaving ? 'Menyimpan...' : 'Simpan'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Edit Tournament Modal ═══ */}
      <AnimatePresence>
        {showEditModal && tournament && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowEditModal(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
            <motion.div
              className="relative w-full sm:max-w-lg glass rounded-t-[28px] sm:rounded-2xl max-h-[90vh] overflow-hidden"
              initial={{ y: '100%', scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: '100%', scale: 0.95 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${accentBgSubtle} flex items-center justify-center`}>
                    <Settings className={`w-5 h-5 ${accentClass}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white/90">Edit Turnamen</h3>
                    <p className="text-[10px] text-white/30">Ubah detail turnamen</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="w-8 h-8 rounded-xl bg-white/8 flex items-center justify-center text-white/40 hover:bg-white/12 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 pb-6 space-y-4 overflow-y-auto max-h-[65vh]">
                {/* Tournament Name */}
                <div>
                  <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">
                    Nama Turnamen
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Type & Bracket */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Jenis</label>
                    <select
                      value={editForm.type}
                      onChange={(e) => setEditForm(p => ({ ...p, type: e.target.value as 'weekly' | 'grand_final' }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] focus:outline-none focus:border-white/20 transition-colors appearance-none"
                    >
                      <option value="weekly" className="bg-neutral-900">Weekly</option>
                      <option value="grand_final" className="bg-neutral-900">Grand Final</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Bracket</label>
                    <select
                      value={editForm.bracketType}
                      onChange={(e) => setEditForm(p => ({ ...p, bracketType: e.target.value as 'single' | 'double' | 'group' }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] focus:outline-none focus:border-white/20 transition-colors appearance-none"
                    >
                      <option value="single" className="bg-neutral-900">Single Elim</option>
                      <option value="double" className="bg-neutral-900">Double Elim</option>
                      <option value="group" className="bg-neutral-900">Fase Grup</option>
                    </select>
                  </div>
                </div>

                {/* Week Number */}
                <div className="w-1/2">
                  <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 block">Minggu Ke-</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={99}
                    value={editForm.week}
                    onChange={(e) => setEditForm(p => ({ ...p, week: parseInt(e.target.value) || 1 }))}
                    className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                  />
                </div>

                {/* Date & Time */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Tanggal
                    </label>
                    <input
                      type="date"
                      value={editForm.startDate}
                      onChange={(e) => setEditForm(p => ({ ...p, startDate: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Jam
                    </label>
                    <input
                      type="time"
                      value={editForm.startTime}
                      onChange={(e) => setEditForm(p => ({ ...p, startTime: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[13px] focus:outline-none focus:border-white/20 transition-colors [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Mode, BPM & Lokasi */}
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" /> Mode
                    </label>
                    <input
                      type="text"
                      value={editForm.mode}
                      onChange={(e) => setEditForm(p => ({ ...p, mode: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <Music className="w-3 h-3" /> BPM
                    </label>
                    <input
                      type="text"
                      value={editForm.bpm}
                      onChange={(e) => setEditForm(p => ({ ...p, bpm: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-1.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Lokasi
                    </label>
                    <input
                      type="text"
                      value={editForm.lokasi}
                      onChange={(e) => setEditForm(p => ({ ...p, lokasi: e.target.value }))}
                      className="w-full bg-white/5 border border-white/8 rounded-xl px-3 py-2.5 text-white/90 text-[12px] focus:outline-none focus:border-white/20 transition-colors"
                    />
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5" />

                {/* Delete Section */}
                <div>
                  <p className="text-[11px] tracking-[0.15em] uppercase text-red-400/50 font-semibold mb-2">Zona Bahaya</p>
                  <motion.button
                    onClick={() => setShowDeleteTournamentConfirm(true)}
                    className="w-full p-3 rounded-xl border border-red-500/15 bg-red-500/5 flex items-center gap-3 transition-colors hover:bg-red-500/10"
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="w-9 h-9 rounded-xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-semibold text-red-400">Hapus Turnamen</p>
                      <p className="text-[10px] text-white/25">Semua data pendaftaran, tim & pertandingan akan dihapus</p>
                    </div>
                  </motion.button>
                </div>

                {/* Save Button */}
                <motion.button
                  onClick={async () => {
                    if (!tournament) return;
                    setEditSaving(true);
                    try {
                      let startDate: string | null = null;
                      if (editForm.startDate) {
                        const timeStr = editForm.startTime || '19:00';
                        startDate = new Date(`${editForm.startDate}T${timeStr}:00`).toISOString();
                      }
                      const res = await adminFetch('/api/tournaments', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          tournamentId: tournament.id,
                          name: editForm.name,
                          type: editForm.type,
                          bracketType: editForm.bracketType,
                          week: editForm.week,
                          startDate,
                          mode: editForm.mode,
                          bpm: editForm.bpm,
                          lokasi: editForm.lokasi,
                        }),
                      });
                      const data = await res.json();
                      if (data.success) {
                        setShowEditModal(false);
                        addToast('Turnamen berhasil diperbarui!', 'success');
                        storeFetchData(false);
                      } else {
                        addToast(data.error || 'Gagal mengubah turnamen', 'error');
                      }
                    } catch {
                      addToast('Terjadi kesalahan saat menyimpan', 'error');
                    } finally {
                      setEditSaving(false);
                    }
                  }}
                  disabled={editSaving}
                  className={`w-full py-3 rounded-xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-all ${
                    editSaving ? 'opacity-50 pointer-events-none' : `${btnClass}`
                  }`}
                  whileHover={{ scale: editSaving ? 1 : 1.01 }}
                  whileTap={{ scale: editSaving ? 1 : 0.97 }}
                >
                  {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {editSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </motion.button>
              </div>
            </motion.div>

            {/* Nested: Delete Confirmation */}
            <AnimatePresence>
              {showDeleteTournamentConfirm && (
                <motion.div
                  className="absolute inset-0 z-[80] flex items-center justify-center p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowDeleteTournamentConfirm(false)}
                >
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
                  <motion.div
                    className="relative w-full glass rounded-2xl p-6"
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 350 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-14 h-14 rounded-2xl bg-red-500/15 flex items-center justify-center mb-4">
                        <Trash2 className="w-7 h-7 text-red-400" />
                      </div>
                      <h3 className="text-lg font-bold text-white/90">Hapus Turnamen?</h3>
                      <p className="text-sm text-white/50 mt-2 leading-relaxed">
                        Turnamen <span className="text-white/80 font-semibold">"{tournament.name}"</span> beserta semua pendaftaran, tim, dan pertandingan akan dihapus secara permanen.
                      </p>
                      <p className="text-[11px] text-red-400/60 mt-2">
                        ⚠️ Tindakan ini tidak dapat dibatalkan
                      </p>
                      <div className="flex gap-3 mt-5 w-full">
                        <motion.button
                          onClick={() => setShowDeleteTournamentConfirm(false)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold glass-subtle text-white/70"
                          whileTap={{ scale: 0.97 }}
                        >
                          Batal
                        </motion.button>
                        <motion.button
                          onClick={async () => {
                            if (!tournament) return;
                            setDeleteTournamentLoading(true);
                            try {
                              const res = await fetch(`/api/tournaments?id=${tournament.id}`, {
                                method: 'DELETE',
                              });
                              const data = await res.json();
                              if (data.success) {
                                setShowDeleteTournamentConfirm(false);
                                setShowEditModal(false);
                                setShowPanel(false);
                                addToast('Turnamen berhasil dihapus', 'success');
                                storeFetchData(false);
                              } else {
                                addToast(data.error || 'Gagal menghapus turnamen', 'error');
                              }
                            } catch {
                              addToast('Terjadi kesalahan saat menghapus', 'error');
                            } finally {
                              setDeleteTournamentLoading(false);
                            }
                          }}
                          disabled={deleteTournamentLoading}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold bg-red-500/20 text-red-400 border border-red-500/20 disabled:opacity-40"
                          whileHover={{ scale: deleteTournamentLoading ? 1 : 1.02 }}
                          whileTap={{ scale: deleteTournamentLoading ? 1 : 0.97 }}
                        >
                          {deleteTournamentLoading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ya, Hapus'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-Screen Player Management */}
      <PlayerManagementScreen
        isOpen={showPlayerManagement}
        onClose={() => setShowPlayerManagement(false)}
        registrations={registrations}
        division={division}
        onApprove={onApprove}
        onReject={onReject}
        onDelete={onDelete}
        onDeleteAllRejected={onDeleteAllRejected}
        onSetMVP={onSetMVP}
        onRemoveMVP={onRemoveMVP}
      />
    </>
  );
}
