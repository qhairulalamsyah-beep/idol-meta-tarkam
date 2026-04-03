'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  XCircle,
  Search,
  Check,
  X,
  Users,
  Clock,
  CheckCircle2,
  Ban,
  Star,
  Crown,
  Phone,
  UserRound,
  Shield,
  Trash2,
} from 'lucide-react';

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
    phone?: string | null;
    gender: string;
    tier: string;
    avatar: string | null;
    points: number;
    isMVP?: boolean;
    mvpScore?: number;
  };
}

interface PlayerManagementScreenProps {
  isOpen: boolean;
  onClose: () => void;
  registrations: Registration[];
  division: 'male' | 'female';
  onApprove: (registrationId: string, tier: string) => void;
  onReject: (registrationId: string) => void;
  onDelete: (registrationId: string) => void;
  onDeleteAllRejected: () => void;
  onSetMVP: (userId: string, mvpScore: number) => void;
  onRemoveMVP: (userId: string) => void;
}

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

export function PlayerManagementScreen({
  isOpen,
  onClose,
  registrations,
  division,
  onApprove,
  onReject,
  onDelete,
  onDeleteAllRejected,
  onSetMVP,
  onRemoveMVP,
}: PlayerManagementScreenProps) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  // MVP input state per user
  const [mvpInputUserId, setMvpInputUserId] = useState<string | null>(null);
  const [mvpScoreText, setMvpScoreText] = useState('');

  const isMale = division === 'male';
  const accentClass = isMale ? 'text-[--ios-gold]' : 'text-[--ios-pink]';
  const accentBgSubtle = isMale ? 'bg-amber-500/12' : 'bg-violet-500/12';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';

  const pendingCount = registrations.filter((r) => r.status === 'pending').length;
  const approvedCount = registrations.filter((r) => r.status === 'approved').length;
  const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;

  // Find current MVP
  const currentMVP = registrations.find((r) => r.user.isMVP);

  // Tier counts from approved registrations
  const tierSCount = registrations.filter((r) => r.status === 'approved' && (r.tierAssigned || r.user.tier) === 'S').length;
  const tierACount = registrations.filter((r) => r.status === 'approved' && (r.tierAssigned || r.user.tier) === 'A').length;
  const tierBCount = registrations.filter((r) => r.status === 'approved' && (r.tierAssigned || r.user.tier) === 'B').length;

  const filteredRegistrations = useMemo(() => {
    let list = registrations;

    // "all" shows pending + approved (excludes rejected)
    // Other tabs filter by exact status
    if (activeFilter === 'all') {
      list = list.filter((r) => r.status === 'pending' || r.status === 'approved');
    } else {
      list = list.filter((r) => r.status === activeFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.user.name.toLowerCase().includes(q) ||
          (r.user.phone && r.user.phone.includes(q)) ||
          (r.user.email && r.user.email.toLowerCase().includes(q)),
      );
    }

    return list;
  }, [registrations, activeFilter, search]);

  // "Semua" count = pending + approved (excludes rejected)
  const activeCount = pendingCount + approvedCount;
  const tabs: { id: FilterTab; label: string; count: number; icon: typeof Users }[] = [
    { id: 'all', label: 'Semua', count: activeCount, icon: Users },
    { id: 'pending', label: 'Menunggu', count: pendingCount, icon: Clock },
    { id: 'approved', label: 'Disetujui', count: approvedCount, icon: CheckCircle2 },
    { id: 'rejected', label: 'Ditolak', count: rejectedCount, icon: Ban },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-yellow-500/12 text-yellow-400 border border-yellow-500/15">
            <Clock className="w-3 h-3" />
            Menunggu
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-green-500/12 text-green-400 border border-green-500/15">
            <CheckCircle2 className="w-3 h-3" />
            Disetujui
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-semibold bg-red-500/12 text-red-400 border border-red-500/15">
            <Ban className="w-3 h-3" />
            Ditolak
          </span>
        );
      default:
        return null;
    }
  };

  const getTierStyle = (tier: string, isActive: boolean) => {
    if (!isActive) return 'bg-white/5 text-white/25 hover:bg-white/8';
    switch (tier) {
      case 'S': return 'tier-s scale-110';
      case 'A': return 'tier-a scale-110';
      case 'B': return 'tier-b scale-110';
      default: return 'bg-white/5 text-white/25';
    }
  };

  const handleMVPConfirm = (userId: string) => {
    const score = parseInt(mvpScoreText.replace(/[^0-9]/g, '')) || 0;
    onSetMVP(userId, score);
    setMvpInputUserId(null);
    setMvpScoreText('');
  };

  const formatMvpScore = (score: number) => {
    return score.toLocaleString('id-ID');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex flex-col"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" />

          {/* Content */}
          <motion.div
            className="relative flex flex-col h-full max-w-lg lg:max-w-5xl mx-auto w-full"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            {/* ═══ HEADER ═══ */}
            <div className="flex-shrink-0 px-6 pt-14 pb-4">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl ${accentBgSubtle} flex items-center justify-center`}>
                    <Shield className={`w-5 h-5 ${accentClass}`} />
                  </div>
                  <div>
                    <h2 className="text-[20px] font-bold text-white/90 tracking-tight leading-tight">
                      Kelola Peserta
                    </h2>
                    <p className="text-[11px] text-white/30 mt-1 font-medium">
                      Setujui, tolak, & rubah tier pemain
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-2xl bg-white/8 flex items-center justify-center text-white/50 hover:bg-white/12 hover:text-white/90 transition-all duration-200 active:scale-95"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Current MVP Banner — Premium gradient */}
              {currentMVP && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={`rounded-2xl p-4 mb-5 relative overflow-hidden ${
                    isMale
                      ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/8 to-amber-500/5 ring-1 ring-amber-500/20'
                      : 'bg-gradient-to-r from-violet-500/15 via-violet-500/8 to-violet-500/5 ring-1 ring-violet-500/20'
                  }`}
                >
                  {/* Animated sparkle overlay */}
                  <div className={`absolute inset-0 opacity-20 ${
                    isMale
                      ? 'bg-gradient-to-r from-amber-400/5 via-transparent to-amber-400/5'
                      : 'bg-gradient-to-r from-violet-400/5 via-transparent to-violet-400/5'
                  }`} />

                  <div className="relative flex items-center gap-3">
                    <div className="relative">
                      <motion.div
                        animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1, 1.1] }}
                        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <Crown className={`w-7 h-7 ${isMale ? 'text-amber-400' : 'text-violet-400'}`} />
                      </motion.div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-[10px] font-bold uppercase tracking-[0.15em] ${isMale ? 'text-amber-400/60' : 'text-violet-400/60'}`}>
                          MVP Saat Ini
                        </p>
                        <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-bold ${isMale ? 'bg-amber-400/15 text-amber-400 border border-amber-400/15' : 'bg-violet-400/15 text-violet-400 border border-violet-400/15'}`}>
                          +25 pts
                        </span>
                      </div>
                      <p className="text-[15px] font-bold text-white/90 truncate mt-0.5">{currentMVP.user.name}</p>
                      {(currentMVP.user.mvpScore ?? 0) > 0 && (
                        <p className={`text-[11px] mt-1 font-medium ${isMale ? 'text-amber-400/50' : 'text-violet-400/50'}`}>
                          Skor: {formatMvpScore(currentMVP.user.mvpScore ?? 0)}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onRemoveMVP(currentMVP.user.id)}
                      className="px-3.5 py-2 rounded-xl text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/15 hover:bg-red-500/20 transition-all duration-200 active:scale-95"
                    >
                      Cabut MVP
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Stats Row — Clean numbered cards */}
              <motion.div
                className="grid grid-cols-4 gap-2.5 lg:gap-4 mb-5"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                {tabs.map((tab, i) => {
                  const TabIcon = tab.icon;
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveFilter(tab.id)}
                      className={`rounded-2xl p-3 text-center transition-all duration-300 ${
                        activeFilter === tab.id
                          ? 'glass-subtle ring-1 ' + (isMale ? 'ring-amber-400/25' : 'ring-violet-400/25')
                          : 'bg-white/[0.03] hover:bg-white/[0.05]'
                      }`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.04 }}
                    >
                      <p className={`text-xl font-black tabular-nums ${
                        tab.id === 'pending'
                          ? 'text-yellow-400'
                          : tab.id === 'approved'
                            ? 'text-green-400'
                            : tab.id === 'rejected'
                              ? 'text-red-400'
                              : 'text-white/90'
                      }`}>
                        {tab.count}
                      </p>
                      <p className={`text-[9px] font-semibold mt-1 uppercase tracking-wider ${
                        activeFilter === tab.id ? 'text-white/60' : 'text-white/20'
                      }`}>
                        {tab.label}
                      </p>
                    </motion.button>
                  );
                })}
              </motion.div>

              {/* Tier Summary */}
              <div className="flex items-center gap-2.5 mb-4 px-1">
                <span className="text-[10px] text-white/20 font-bold uppercase tracking-[0.12em]">Tier</span>
                <div className="flex gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/8 border border-amber-400/12">
                    <span className="text-[11px] font-black text-amber-400">S</span>
                    <span className="text-[11px] font-bold text-amber-400/60 tabular-nums">{tierSCount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-300/8 border border-gray-300/12">
                    <span className="text-[11px] font-black text-gray-300">A</span>
                    <span className="text-[11px] font-bold text-gray-300/60 tabular-nums">{tierACount}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-400/8 border border-orange-400/12">
                    <span className="text-[11px] font-black text-orange-400">B</span>
                    <span className="text-[11px] font-bold text-orange-400/60 tabular-nums">{tierBCount}</span>
                  </div>
                </div>
                <span className="text-[10px] text-white/15 ml-auto font-medium">{approvedCount} disetujui</span>
              </div>

              {/* Delete All Rejected Button - Only show in rejected tab */}
              {activeFilter === 'rejected' && rejectedCount > 0 && (
                <motion.button
                  onClick={() => {
                    if (confirm(`Hapus ${rejectedCount} pendaftaran yang ditolak? Tindakan ini tidak dapat dibatalkan.`)) {
                      onDeleteAllRejected();
                    }
                  }}
                  className="w-full mb-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-[12px] font-bold flex items-center justify-center gap-2 hover:bg-red-500/15 transition-all duration-200"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus Semua ({rejectedCount})
                </motion.button>
              )}

              {/* Search — Refined Glass Input */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/40 transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari nama peserta..."
                  className={`w-full bg-white/5 border border-white/8 rounded-2xl pl-11 pr-10 py-3.5 text-white/90 text-[13px] lg:text-base font-medium placeholder-white/20 focus:outline-none transition-all duration-300 ${
                    isMale
                      ? 'focus:border-amber-400/25 focus:bg-amber-400/[0.02] focus:shadow-[0_0_24px_rgba(255,214,10,0.05)]'
                      : 'focus:border-violet-400/25 focus:bg-violet-400/[0.02] focus:shadow-[0_0_24px_rgba(167,139,250,0.05)]'
                  }`}
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ═══ PLAYER LIST ═══ */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8">
              {filteredRegistrations.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center mb-4">
                    <UserRound className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-[14px] font-semibold text-white/35 mb-1">
                    {search ? 'Tidak ditemukan' : 'Belum ada peserta'}
                  </p>
                  <p className="text-[12px] text-white/20 text-center max-w-[240px]">
                    {search
                      ? `Tidak ada peserta dengan nama "${search}"`
                      : 'Peserta akan muncul setelah mendaftar'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3">
                  {filteredRegistrations.map((reg, index) => {
                    const currentTier = reg.tierAssigned || reg.user.tier;
                    const contact = reg.user.phone || reg.user.email || '-';
                    const isPending = reg.status === 'pending';
                    const isApproved = reg.status === 'approved';
                    const isRejected = reg.status === 'rejected';
                    const isMVP = reg.user.isMVP;
                    const isMvpInputting = mvpInputUserId === reg.user.id;

                    return (
                      <motion.div
                        key={reg.id}
                        className={`glass-subtle rounded-2xl p-4 lg:p-5 transition-all duration-300 ${
                          isMVP
                            ? (isMale ? 'ring-1 ring-amber-400/25' : 'ring-1 ring-violet-400/25')
                            : ''
                        }`}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          delay: index * 0.04,
                          duration: 0.35,
                          ease: [0.25, 0.46, 0.45, 0.94],
                        }}
                        whileHover={{
                          y: -1,
                          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        }}
                      >
                        {/* Top row: Avatar + Info + Status */}
                        <div className="flex items-start gap-3 mb-3">
                          {/* Avatar */}
                          <div className="relative flex-shrink-0">
                            <div className={avatarRingClass}>
                              <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                                {reg.user.avatar ? (
                                  <img
                                    src={reg.user.avatar}
                                    alt={reg.user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-sm font-bold text-white/70">
                                    {reg.user.name[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* MVP badge on avatar */}
                            {isMVP && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                className="absolute -top-1.5 -right-1.5"
                              >
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                  isMale ? 'bg-amber-400' : 'bg-violet-400'
                                }`}
                                style={{ boxShadow: `0 2px 8px ${isMale ? 'rgba(255,214,10,0.4)' : 'rgba(167,139,250,0.4)'}` }}
                                >
                                  <Star className="w-3 h-3 text-black fill-black" />
                                </div>
                              </motion.div>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-white/90 text-[15px] truncate leading-tight">
                                {reg.user.name}
                              </p>
                              {isMVP && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                                  isMale ? 'bg-amber-400/15 text-amber-400 border border-amber-400/15' : 'bg-violet-400/15 text-violet-400 border border-violet-400/15'
                                }`}>
                                  <Crown className="w-2.5 h-2.5" />
                                  MVP
                                </span>
                              )}
                              {/* Status badge - hidden on mobile, shown in tier row */}
                              <div className="hidden lg:block">
                                {getStatusBadge(reg.status)}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <Phone className="w-3 h-3 text-white/15" />
                              <p className="text-[11px] text-white/25 truncate font-medium">
                                {contact}
                              </p>
                            </div>
                            <p className="text-[10px] text-white/15 mt-1 font-medium">
                              {reg.user.points.toLocaleString()} point
                            </p>
                          </div>
                        </div>

                        {/* MVP Score Input (expanded) */}
                        <AnimatePresence>
                          {isMvpInputting && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className={`rounded-2xl p-4 mb-3 ${isMale ? 'bg-amber-500/[0.05] border border-amber-500/15' : 'bg-violet-500/[0.05] border border-violet-500/15'}`}>
                                <div className="flex items-center justify-between mb-2.5">
                                  <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-white/35 flex items-center gap-1.5">
                                    <Star className="w-3.5 h-3.5 text-amber-400" />
                                    Input Skor MVP
                                  </p>
                                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${isMale ? 'bg-amber-400/12 text-amber-400 border border-amber-400/12' : 'bg-violet-400/12 text-violet-400 border border-violet-400/12'}`}>
                                    Bonus: +25 pts (fixed)
                                  </span>
                                </div>
                                <p className="text-[11px] text-white/20 mb-3 leading-relaxed">
                                  Masukkan skor pertandingan (catatan saja). Point MVP tetap +25.
                                </p>
                                <div className="relative">
                                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-white/20 font-semibold pointer-events-none">
                                    Skor
                                  </span>
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={mvpScoreText ? parseInt(mvpScoreText.replace(/[^0-9]/g, '') || '0').toLocaleString('id-ID') : ''}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/[^0-9]/g, '');
                                      setMvpScoreText(raw);
                                    }}
                                    placeholder="Contoh: 2,120,000"
                                    className={`w-full bg-white/5 border ${isMale ? 'border-amber-500/15 focus:border-amber-500/35' : 'border-violet-500/15 focus:border-violet-500/35'} rounded-xl pl-13 pr-4 py-3 text-white/90 text-[14px] font-bold placeholder-white/15 focus:outline-none transition-all duration-300 tabular-nums`}
                                    style={{ paddingLeft: '52px' }}
                                  />
                                </div>
                                <div className="flex gap-2.5 mt-3.5 lg:gap-4">
                                  <motion.button
                                    onClick={() => handleMVPConfirm(reg.user.id)}
                                    disabled={!mvpScoreText}
                                    className={`flex-1 py-3 rounded-xl text-[12px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                      mvpScoreText
                                        ? (isMale
                                          ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black hover:from-amber-300 hover:to-amber-400'
                                          : 'bg-gradient-to-r from-violet-400 to-violet-500 text-white/90 hover:from-violet-300 hover:to-violet-400')
                                        : 'bg-white/5 text-white/15 pointer-events-none'
                                    }`}
                                    whileTap={mvpScoreText ? { scale: 0.95 } : undefined}
                                    style={mvpScoreText ? {
                                      boxShadow: isMale ? '0 2px 12px rgba(255,214,10,0.25)' : '0 2px 12px rgba(167,139,250,0.25)',
                                    } : undefined}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Tetapkan MVP
                                  </motion.button>
                                  <button
                                    onClick={() => { setMvpInputUserId(null); setMvpScoreText(''); }}
                                    className="px-5 py-3 rounded-xl text-[12px] font-semibold bg-white/5 text-white/35 hover:bg-white/8 transition-all duration-200 active:scale-95"
                                  >
                                    Batal
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Tier Selector + Action Buttons - Stack on mobile */}
                        <div className="flex flex-col gap-3">
                          {/* Tier Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-white/25 font-bold uppercase tracking-[0.12em]">
                                Tier
                              </span>
                              <div className="flex gap-1.5">
                                {['S', 'A', 'B'].map((tier) => (
                                  <motion.button
                                    key={tier}
                                    onClick={() => onApprove(reg.id, tier)}
                                    className={`w-9 h-9 rounded-xl text-[11px] font-black flex items-center justify-center transition-all duration-200 ${
                                      getTierStyle(tier, currentTier === tier)
                                    }`}
                                    whileTap={{ scale: 0.85 }}
                                  >
                                    {tier}
                                  </motion.button>
                                ))}
                              </div>
                            </div>
                            {/* Status badge on the right for mobile */}
                            <div className="lg:hidden">
                              {getStatusBadge(reg.status)}
                            </div>
                          </div>

                          {/* Action Buttons Row */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* MVP button — only for approved players */}
                            {isApproved && (
                              <motion.button
                                onClick={() => {
                                  if (isMVP) return;
                                  setMvpInputUserId(isMvpInputting ? null : reg.user.id);
                                  if (!isMvpInputting) {
                                    setMvpScoreText(String(reg.user.mvpScore || ''));
                                  }
                                }}
                                className={`flex-1 min-w-0 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                  isMVP
                                    ? (isMale
                                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/25'
                                      : 'bg-violet-400/15 text-violet-400 border border-violet-400/25')
                                    : (isMale
                                      ? 'bg-amber-400/6 text-amber-400/50 border border-amber-400/12 hover:bg-amber-400/12 hover:text-amber-400'
                                      : 'bg-violet-400/6 text-violet-400/50 border border-violet-400/12 hover:bg-violet-400/12 hover:text-violet-400')
                                }`}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Crown className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{isMVP ? 'MVP ✓' : 'Set MVP'}</span>
                              </motion.button>
                            )}

                            {(isPending || isRejected) && (
                              <motion.button
                                onClick={() => onApprove(reg.id, currentTier)}
                                className={`flex-1 min-w-0 py-2.5 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all duration-200 ${
                                  isMale
                                    ? 'bg-amber-400/10 text-amber-400 border border-amber-400/15 hover:bg-amber-400/18'
                                    : 'bg-violet-400/10 text-violet-400 border border-violet-400/15 hover:bg-violet-400/18'
                                }`}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Check className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{isPending ? 'Setujui' : 'Terima'}</span>
                              </motion.button>
                            )}
                            {(isPending || isApproved) && (
                              <motion.button
                                onClick={() => onReject(reg.id)}
                                className="flex-1 min-w-0 py-2.5 rounded-xl text-[11px] font-bold bg-red-500/8 text-red-400 border border-red-500/12 flex items-center justify-center gap-1.5 hover:bg-red-500/15 transition-all duration-200"
                                whileTap={{ scale: 0.95 }}
                              >
                                <X className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{isPending ? 'Tolak' : 'Batalkan'}</span>
                              </motion.button>
                            )}
                            {/* Delete button — only for rejected */}
                            {isRejected && (
                              <motion.button
                                onClick={() => {
                                  if (confirm(`Hapus pendaftaran ${reg.user.name} secara permanen?`)) {
                                    onDelete(reg.id);
                                  }
                                }}
                                className="flex-1 min-w-0 py-2.5 rounded-xl text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/20 flex items-center justify-center gap-1.5 hover:bg-red-500/25 transition-all duration-200"
                                whileTap={{ scale: 0.95 }}
                              >
                                <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">Hapus</span>
                              </motion.button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
