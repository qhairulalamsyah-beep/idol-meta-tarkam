'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Users,
  Clock,
  CheckCircle,
  Eye,
  Search,
  UserRound,
} from 'lucide-react';

interface PlayerItem {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  tier: string;
  gender: string;
  status: 'approved' | 'pending' | 'rejected';
}

interface PlayerListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  players: PlayerItem[];
  division: 'male' | 'female';
}

export function PlayerListModal({ isOpen, onOpenChange, players, division }: PlayerListModalProps) {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [search, setSearch] = useState('');

  const isMale = division === 'male';
  const accentClass = isMale ? 'text-amber-400' : 'text-violet-400';
  const accentBg = isMale ? 'bg-amber-400/12' : 'bg-violet-400/12';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';
  const accentGradient = isMale
    ? 'from-amber-400/20 via-transparent to-amber-400/5'
    : 'from-violet-400/20 via-transparent to-violet-400/5';

  const filtered = players
    .filter((p) => filter === 'all' || p.status === filter)
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const approvedCount = players.filter((p) => p.status === 'approved').length;
  const pendingCount = players.filter((p) => p.status === 'pending').length;

  const tierMap: Record<string, string> = { S: 'tier-s', A: 'tier-a', B: 'tier-b' };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="player-list-modal"
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet - with drag to close */}
          <motion.div
            className="relative glass rounded-t-[32px] w-full max-w-md lg:max-w-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: 'calc(100dvh - 80px)', paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onOpenChange(false);
              }
            }}
          >
            {/* Premium Drag Handle */}
            <div className="flex justify-center pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 pt-1 flex-shrink-0">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${accentBg} flex items-center justify-center`}>
                    <Users className={`w-[18px] h-[18px] ${accentClass}`} />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-white/90 tracking-tight leading-tight">Daftar Pemain</h2>
                    <p className="text-[11px] text-white/30 mt-0.5 font-medium">
                      {players.length} pemain terdaftar
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter Tabs — Premium Pill Style */}
              <div className="flex gap-2 mb-4 p-1 rounded-2xl bg-white/[0.03]">
                {[
                  { id: 'all' as const, label: 'Semua', count: players.length },
                  { id: 'approved' as const, label: 'Disetujui', count: approvedCount },
                  { id: 'pending' as const, label: 'Menunggu', count: pendingCount },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className={`relative flex-1 py-2.5 rounded-xl text-[11px] font-semibold tracking-wide transition-all duration-300 ${
                      filter === tab.id
                        ? 'text-black'
                        : 'text-white/30 hover:text-white/50'
                    }`}
                  >
                    {filter === tab.id && (
                      <motion.div
                        layoutId="filter-pill"
                        className={`absolute inset-0 rounded-xl ${
                          isMale
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500'
                            : 'bg-gradient-to-r from-violet-400 to-violet-500'
                        }`}
                        transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                        style={{ boxShadow: isMale ? '0 2px 12px rgba(255,214,10,0.3)' : '0 2px 12px rgba(167,139,250,0.3)' }}
                      />
                    )}
                    <span className="relative z-10 flex items-center justify-center gap-1">
                      {tab.label}
                      <span className="opacity-70">({tab.count})</span>
                    </span>
                  </button>
                ))}
              </div>

              {/* Search — Premium Glass Input */}
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-white/40 transition-colors" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari pemain..."
                  className={`w-full bg-white/[0.04] border border-white/[0.06] rounded-2xl pl-11 pr-4 py-3 text-white/90 text-[13px] placeholder-white/20 focus:outline-none transition-all duration-300 ${
                    isMale
                      ? 'focus:border-amber-400/30 focus:bg-amber-400/[0.03] focus:shadow-[0_0_20px_rgba(255,214,10,0.06)]'
                      : 'focus:border-violet-400/30 focus:bg-violet-400/[0.03] focus:shadow-[0_0_20px_rgba(167,139,250,0.06)]'
                  }`}
                />
              </div>
            </div>

            {/* Player List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8">
              {filtered.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center mb-4">
                    <UserRound className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-[14px] text-white/35 font-semibold mb-1">Tidak ada pemain</p>
                  <p className="text-[12px] text-white/20 text-center max-w-[240px]">
                    {search ? 'Coba kata kunci lain untuk pencarian' : 'Belum ada pendaftaran masuk'}
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-2.5">
                  {filtered.map((player, index) => (
                    <motion.div
                      key={player.id}
                      className="glass-subtle rounded-2xl px-4 py-3.5 lg:px-5 lg:py-3 group cursor-pointer transition-all duration-300 hover:translate-y-[-2px]"
                      style={{
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.035, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                      whileHover={{
                        boxShadow: isMale
                          ? '0 4px 20px rgba(255,214,10,0.08), 0 1px 3px rgba(0,0,0,0.2)'
                          : '0 4px 20px rgba(167,139,250,0.08), 0 1px 3px rgba(0,0,0,0.2)',
                      }}
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Avatar */}
                        <div className={`${avatarRingClass} flex-shrink-0`}>
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {player.avatar ? (
                              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[15px] font-bold text-white/70">{player.name[0]}</span>
                            )}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-white/90 truncate leading-tight">{player.name}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {player.phone && (
                              <p className="text-[11px] text-white/25 truncate font-medium">{player.phone}</p>
                            )}
                          </div>
                        </div>

                        {/* Status + Tier */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`tier-badge ${tierMap[player.tier] || 'tier-b'}`}>
                            {player.tier}
                          </span>
                          {player.status === 'approved' ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/10">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              <span className="text-[10px] font-semibold text-emerald-400">Setuju</span>
                            </div>
                          ) : player.status === 'pending' ? (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-500/10 border border-amber-500/10">
                              <Clock className="w-3 h-3 text-amber-400" />
                              <span className="text-[10px] font-semibold text-amber-400">Pending</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-red-500/10 border border-red-500/10">
                              <X className="w-3 h-3 text-red-400" />
                              <span className="text-[10px] font-semibold text-red-400">Ditolak</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
