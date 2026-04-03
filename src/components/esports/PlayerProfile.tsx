'use client';

import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import {
  X,
  Trophy,
  Medal,
  Star,
  TrendingUp,
  Calendar,
  Gamepad2,
  Crown,
  ChevronRight,
  Swords,
  UserPlus,
  Award,
  Flame,
} from 'lucide-react';

/* ── Interfaces (unchanged) ── */
interface PlayerStats {
  wins: number;
  losses: number;
  totalMatches: number;
  winRate: number;
  averageScore: number;
  mvpCount: number;
  championCount: number;
}

interface PlayerProfile {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  createdAt: string;
  stats: PlayerStats;
  recentMatches: {
    id: string;
    tournamentName: string;
    result: 'win' | 'loss';
    score: string;
    date: string;
  }[];
  achievements: {
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }[];
}

interface PlayerProfileModalProps {
  player: PlayerProfile | null;
  division: 'male' | 'female';
  onClose: () => void;
}

/* ── Tier helpers ── */
const tierConfig: Record<string, { label: string; badgeClass: string; gradient: string; glowColor: string }> = {
  S: {
    label: 'Profesional',
    badgeClass: 'tier-s',
    gradient: 'from-amber-400 to-amber-600',
    glowColor: 'rgba(255,214,10,0.25)',
  },
  A: {
    label: 'Lanjutan',
    badgeClass: 'tier-a',
    gradient: 'from-gray-300 to-gray-500',
    glowColor: 'rgba(200,200,210,0.15)',
  },
  B: {
    label: 'Pemula',
    badgeClass: 'tier-b',
    gradient: 'from-orange-400 to-orange-600',
    glowColor: 'rgba(255,140,50,0.15)',
  },
};

/* ── iOS-style info row ── */
function InfoRow({ label, value, isLast }: { label: string; value: React.ReactNode; isLast?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-3.5 ${isLast ? '' : 'border-b border-white/[0.04]'}`}>
      <span className="text-[13px] text-white/35 font-medium">{label}</span>
      <span className="text-[13px] font-semibold text-white/70">{value}</span>
    </div>
  );
}

/* ── Main Component ── */
export function PlayerProfileModal({ player, division, onClose }: PlayerProfileModalProps) {
  const y = useMotionValue(0);
  const opacity = useTransform(y, [0, 300], [1, 0]);
  const isMale = division === 'male';

  const tier = tierConfig[player?.tier || 'B'] || tierConfig.B;

  function handleDragEnd(_: never, info: PanInfo) {
    if (info.offset.y > 150 || info.velocity.y > 500) {
      onClose();
    }
  }

  return (
    <AnimatePresence>
      {player && (
        <motion.div
          key="player-profile-modal"
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            style={{ opacity }}
            onClick={onClose}
          />

        {/* Sheet */}
        <motion.div
          className="relative glass rounded-t-[32px] w-full max-h-[92vh] lg:max-w-2xl mx-auto overflow-hidden flex flex-col"
          style={{ y }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        >
          {/* Premium Drag Handle */}
          <div className="flex justify-center pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
            <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto overscroll-contain px-6 pb-8 pt-2">
            {/* ── Header: Avatar + Name + Tier ── */}
            <motion.div
              className="flex flex-col items-center text-center pb-7"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Avatar with Premium Ring + Gradient Glow */}
              <div className={`relative mb-5`}>
                {/* Gradient glow behind avatar */}
                <div
                  className="absolute -inset-3 rounded-full blur-xl opacity-60"
                  style={{
                    background: isMale
                      ? 'radial-gradient(circle, rgba(255,214,10,0.3) 0%, rgba(255,214,10,0.05) 60%, transparent 80%)'
                      : 'radial-gradient(circle, rgba(167,139,250,0.3) 0%, rgba(167,139,250,0.05) 60%, transparent 80%)',
                  }}
                />
                <div className={`relative ${isMale ? 'avatar-ring-gold' : 'avatar-ring-pink'}`}>
                  <div className="w-[88px] h-[88px] lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-white/10 to-white/[0.02] flex items-center justify-center overflow-hidden">
                    {player.avatar ? (
                      <img
                        src={player.avatar}
                        alt={player.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-bold text-white/70">
                        {player.name[0]}
                      </span>
                    )}
                  </div>
                </div>
                {/* Tier badge — Prominent */}
                <motion.div
                  className={`absolute -bottom-2 -right-2 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black bg-gradient-to-br ${tier.gradient} shadow-lg`}
                  style={{
                    boxShadow: `0 2px 12px ${tier.glowColor}`,
                    border: '2px solid rgba(0,0,0,0.3)',
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {player.tier}
                </motion.div>
              </div>

              {/* Name */}
              <h2 className="text-[22px] font-bold text-white/90 tracking-tight leading-tight lg:text-2xl">
                {player.name}
              </h2>

              {/* Tier label + points */}
              <div className="flex items-center gap-2.5 mt-2">
                <span
                  className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-bold tracking-wide ${tier.badgeClass}`}
                >
                  <Star className="w-3 h-3" />
                  {tier.label}
                </span>
                <span className={`text-[13px] font-semibold ${isMale ? 'text-amber-400/60' : 'text-violet-400/60'}`}>
                  {player.points.toLocaleString()} pts
                </span>
              </div>
            </motion.div>

            {/* ── Stats Cards: Clean 2-column grid ── */}
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-[18px] h-[18px] text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/90 leading-none">{player.stats.wins}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Menang</p>
                </div>
              </div>
              <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-500/10 flex items-center justify-center flex-shrink-0">
                  <Medal className="w-[18px] h-[18px] text-gray-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/90 leading-none">{player.stats.losses}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Kalah</p>
                </div>
              </div>
              <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-[18px] h-[18px] text-emerald-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/90 leading-none">{player.stats.winRate}%</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">Win Rate</p>
                </div>
              </div>
              <div className="glass-subtle rounded-2xl p-4 lg:p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                  <Crown className="w-[18px] h-[18px] text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white/90 leading-none">{player.stats.mvpCount}</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mt-1">MVPs</p>
                </div>
              </div>
            </motion.div>

            {/* ── Divider ── */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent mb-6" />

            {/* ── Info Section: iOS-style list rows ── */}
            <motion.div
              className="glass-subtle rounded-2xl px-5 mb-7"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.4 }}
            >
              <InfoRow
                label="Divisi"
                value={<span className="capitalize">{player.gender}</span>}
              />
              <InfoRow
                label="Tier"
                value={
                  <span className={`bg-gradient-to-r ${tier.gradient} bg-clip-text text-transparent font-bold`}>
                    {player.tier} Tier
                  </span>
                }
              />
              <InfoRow
                label="Bergabung Sejak"
                value={new Date(player.createdAt).toLocaleDateString()}
              />
              <InfoRow
                label="Total Poin"
                value={
                  <span className={`font-bold ${isMale ? 'text-amber-400' : 'text-violet-400'}`}>
                    {player.points.toLocaleString()}
                  </span>
                }
                isLast
              />
            </motion.div>

            {/* ── Achievements ── */}
            {player.achievements.length > 0 && (
              <motion.div
                className="mb-7"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
              >
                <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  Pencapaian
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {player.achievements.map((achievement, aIdx) => (
                    <motion.div
                      key={achievement.id}
                      className="glass-subtle rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 cursor-pointer"
                      whileHover={{ scale: 1.04, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.4 + aIdx * 0.05 }}
                      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }}
                    >
                      <span className="text-[15px]">{achievement.icon}</span>
                      <span className="text-[13px] text-white/70 font-medium">{achievement.name}</span>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Recent Matches ── */}
            {player.recentMatches.length > 0 && (
              <motion.div
                className="mb-7"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
              >
                <h3 className="text-[11px] font-bold text-white/30 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
                  <Gamepad2 className="w-3.5 h-3.5 text-white/30" />
                  Pertandingan Terakhir
                </h3>
                <div className="space-y-2.5">
                  {player.recentMatches.map((match, mIdx) => (
                    <motion.div
                      key={match.id}
                      className={`glass-subtle rounded-2xl px-4 py-3.5 flex items-center justify-between transition-all duration-200 ${
                        match.result === 'win'
                          ? 'border-l-[3px] border-l-emerald-500/60'
                          : 'border-l-[3px] border-l-red-500/60'
                      }`}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.45 + mIdx * 0.05 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                          match.result === 'win' ? 'bg-emerald-500/10' : 'bg-red-500/10'
                        }`}>
                          {match.result === 'win'
                            ? <Trophy className="w-4 h-4 text-emerald-400" />
                            : <X className="w-4 h-4 text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-[13px] font-semibold text-white/70">{match.tournamentName}</p>
                          <p className="text-[11px] text-white/25 mt-0.5 font-medium">{match.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`text-[13px] font-bold ${
                            match.result === 'win' ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {match.result === 'win' ? 'MENANG' : 'KALAH'}
                        </p>
                        <p className="text-[11px] text-white/25 font-medium">{match.score}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Action Buttons ── */}
            <motion.div
              className="grid grid-cols-2 gap-3 pt-1"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <motion.button
                className={`btn-ios py-4 flex items-center justify-center gap-2 text-sm font-semibold ${
                  isMale ? 'btn-gold' : 'btn-pink'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <Swords className="w-4 h-4" />
                Tantang
              </motion.button>
              <motion.button
                className="btn-ios py-4 flex items-center justify-center gap-2 text-sm font-semibold glass text-white/70 hover:text-white/90"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                <UserPlus className="w-4 h-4" />
                Ikuti
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
