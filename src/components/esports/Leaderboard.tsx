'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Medal,
  Trophy,
  Crown,
  TrendingUp,
  Star,
  ChevronUp,
  Search,
  Users,
  Gamepad2,
  Swords,
  Target,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';

/* ================================================================
   Interfaces — preserved from parent component
   ================================================================ */

interface Player {
  id: string;
  name: string;
  email?: string;
  gender?: string;
  tier: string;
  points: number;
  avatar: string | null;
  rank: number;
  wins: number;
  losses: number;
}

interface LeaderboardProps {
  division: 'male' | 'female';
  players: Player[];
  currentUserId?: string;
}

/* ================================================================
   Animation Variants
   ================================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0.2 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const podiumVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.92 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.2 + i * 0.12,
      duration: 0.6,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

const statsVariants = {
  hidden: { opacity: 0, y: 12, scale: 0.95 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: 0.05 + i * 0.06,
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  }),
};

/* ================================================================
   Helpers
   ================================================================ */

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? { text: 'text-amber-400', bg: 'bg-amber-500', ring: 'avatar-ring-gold', gradient: 'gradient-gold' }
    : { text: 'text-violet-400', bg: 'bg-violet-500', ring: 'avatar-ring-pink', gradient: 'gradient-pink' };
}

/* ================================================================
   Podium Player Card — Ultra Premium
   ================================================================ */

function PodiumCard({
  player,
  rank,
  division,
  cardHeight,
  isCenter,
}: {
  player: Player | undefined;
  rank: number;
  division: 'male' | 'female';
  cardHeight: number;
  isCenter: boolean;
}) {
  const accent = getAccent(division);
  const tierClass = player ? getTierClass(player.tier) : 'tier-b';
  const avatarSizeClass = rank === 1
    ? 'w-[76px] h-[76px] lg:w-24 lg:h-24'
    : rank === 2
      ? 'w-[60px] h-[60px] lg:w-20 lg:h-20'
      : 'w-[52px] h-[52px] lg:w-16 lg:h-16';

  const cardHeightClass = rank === 1
    ? 'h-[140px] lg:h-48'
    : rank === 2
      ? 'h-[110px] lg:h-40'
      : 'h-[95px] lg:h-36';

  const cardOuterClass = isCenter
    ? division === 'male'
      ? 'card-gold'
      : 'card-pink'
    : 'glass';

  const rankBadgeGradient =
    rank === 1
      ? division === 'male'
        ? 'from-amber-400 via-yellow-300 to-orange-400'
        : 'from-violet-400 via-purple-300 to-violet-500'
      : rank === 2
        ? 'from-gray-100 via-gray-200 to-gray-400'
        : 'from-orange-300 via-amber-400 to-orange-500';

  const rankBadgeText =
    rank === 1
      ? 'text-black'
      : rank === 2
        ? 'text-gray-800'
        : 'text-orange-950';

  return (
    <motion.div
      custom={rank - 1}
      variants={podiumVariants}
      className="flex flex-col items-center flex-1"
      style={{ perspective: '1000px' }}
    >
      {/* Floating icon above avatar */}
      <div className="mb-2 sm:mb-3 relative" style={{ height: rank === 1 ? 30 : 24 }}>
        {rank === 1 ? (
          <div
            className="animate-float"
            style={{
              filter: division === 'male'
                ? 'drop-shadow(0 0 16px rgba(255,214,10,0.6))'
                : 'drop-shadow(0 0 16px rgba(167,139,250,0.6))',
            }}
          >
            <Crown className={`w-7 h-7 sm:w-8 sm:h-8 lg:w-10 lg:h-10 ${accent.text}`} />
          </div>
        ) : (
          <div>
            <Medal className={`w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 mx-auto ${rank === 2 ? 'text-gray-300' : 'text-orange-400'}`}
              style={{ filter: rank === 2
                ? 'drop-shadow(0 0 8px rgba(209,213,219,0.4))'
                : 'drop-shadow(0 0 8px rgba(251,146,60,0.4))'
              }}
            />
          </div>
        )}
      </div>

      {/* Avatar with ring */}
      <div
        className={accent.ring}
      >
        <div
          className={`rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden ${avatarSizeClass}`}
        >
          {player?.avatar ? (
            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
          ) : (
            <span
              className={`font-bold text-white/70 ${rank === 1 ? 'text-2xl lg:text-4xl' : rank === 2 ? 'text-xl lg:text-3xl' : 'text-lg lg:text-2xl'}`}
            >
              {player?.name?.charAt(0) || '?'}
            </span>
          )}
        </div>
      </div>

      {/* Podium Card Body */}
      <div
        className={`${cardOuterClass} rounded-2xl w-full mt-3 flex flex-col items-center justify-end text-center overflow-hidden ${cardHeightClass}`}
        style={{
          transform: isCenter ? 'rotateX(2deg)' : 'rotateX(1deg)',
          transformOrigin: 'bottom center',
        }}
      >
        <div className="relative z-10 px-3 pb-4 pt-3 w-full">
          {/* Name */}
          <p
            className={`font-bold text-white/90 truncate w-full tracking-tight ${
              rank === 1 ? 'text-sm sm:text-base lg:text-lg' : 'text-xs sm:text-sm lg:text-base'
            }`}
          >
            {player?.name || '---'}
          </p>

          {/* Tier Badge */}
          <span className={`tier-badge ${tierClass} mt-1.5 inline-block`}>
            {player?.tier || 'B'}
          </span>

          {/* Points — gradient */}
          <p
            className={`font-black mt-2 tabular-nums ${rank === 1 ? 'text-xl sm:text-2xl lg:text-3xl' : 'text-base sm:text-lg lg:text-2xl'} ${accent.gradient}`}
          >
            {player?.points?.toLocaleString() || 0}
            <span className="text-[10px] font-semibold text-white/40 ml-1">PTS</span>
          </p>

          {/* Wins / Losses Record */}
          {player && (
            <div className="flex items-center justify-center gap-2.5 mt-2">
              <span className="text-[11px] font-semibold text-white/50 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {player.wins}W
              </span>
              <div className="w-px h-3 bg-white/10" />
              <span className="text-[11px] font-semibold text-white/30 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                {player.losses}L
              </span>
            </div>
          )}

          {/* Rank Badge */}
          <div
            className={`mx-auto mt-2.5 w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center font-black text-[10px] lg:text-xs bg-gradient-to-br ${rankBadgeGradient} ${rankBadgeText}`}
            style={{
              boxShadow:
                rank === 1
                  ? division === 'male'
                    ? '0 3px 16px rgba(255,214,10,0.5)'
                    : '0 3px 16px rgba(167,139,250,0.5)'
                  : '0 2px 10px rgba(0,0,0,0.4)',
            }}
          >
            {rank}
          </div>
        </div>

        {/* Bottom shine */}
        {isCenter && (
          <div className="absolute bottom-0 left-0 right-0 h-1/2 pointer-events-none">
            <div
              className="w-full h-full"
              style={{
                background: division === 'male'
                  ? 'linear-gradient(180deg, transparent, rgba(255,214,10,0.05))'
                  : 'linear-gradient(180deg, transparent, rgba(167,139,250,0.05))',
              }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Player Row (rank 4+) — Premium Clean
   ================================================================ */

function PlayerRow({
  player,
  rank,
  division,
  isCurrentUser,
  index,
}: {
  player: Player;
  rank: number;
  division: 'male' | 'female';
  isCurrentUser: boolean;
  index: number;
}) {
  const accent = getAccent(division);
  const tierClass = getTierClass(player.tier);

  const rankBadgeClass =
    rank <= 3
      ? `bg-gradient-to-br ${
          rank === 1
            ? division === 'male'
              ? 'from-amber-400 to-orange-500'
              : 'from-violet-400 to-purple-500'
            : rank === 2
              ? 'from-gray-200 to-gray-400'
              : 'from-orange-300 to-orange-500'
        } text-black font-black`
      : 'bg-white/[0.06] text-white/40 font-semibold';

  return (
    <motion.div
      variants={itemVariants}
      className={`glass-subtle rounded-2xl px-3 sm:px-4 lg:px-6 py-2.5 sm:py-3.5 lg:py-4 ${
        index % 2 === 0 ? '' : 'bg-white/[0.01]'
      } ${
        isCurrentUser
          ? division === 'male'
            ? 'ring-1 ring-amber-400/25 bg-amber-400/[0.03]'
            : 'ring-1 ring-violet-400/25 bg-violet-400/[0.03]'
          : ''
      } card-3d`}
    >
      <div className="flex items-center gap-2.5 sm:gap-3.5 lg:gap-4">
        {/* Rank Badge */}
        <div
          className={`w-7 h-7 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-[11px] lg:text-sm ${rankBadgeClass}`}
          style={
            rank > 3
              ? { boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }
              : {
                  boxShadow:
                    rank === 1
                      ? division === 'male'
                        ? '0 2px 10px rgba(255,214,10,0.4)'
                        : '0 2px 10px rgba(167,139,250,0.4)'
                      : '0 2px 8px rgba(0,0,0,0.3)',
                }
          }
        >
          {rank}
        </div>

        {/* Avatar */}
        <div className={accent.ring}>
          <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-bold text-white/70">{player.name.charAt(0)}</span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[13px] sm:text-sm font-semibold text-white/90 truncate tracking-tight">
              {player.name}
              {isCurrentUser && (
                <span className="text-[10px] font-semibold text-white/30 ml-1.5">(Anda)</span>
              )}
            </p>
            <span className={`tier-badge ${tierClass}`}>{player.tier}</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-emerald-400/70" />
              {player.wins}W
            </span>
            <span className="text-[11px] text-white/35 font-medium flex items-center gap-1">
              <div className="w-1 h-1 rounded-full bg-red-400/50" />
              {player.losses}L
            </span>
          </div>
        </div>

        {/* Points — gradient text */}
        <div className="text-right flex-shrink-0">
          <p className={`font-bold text-sm tabular-nums ${accent.gradient}`}>
            {player.points.toLocaleString()}
          </p>
          <p className="text-[10px] text-white/35 font-medium mt-0.5">poin</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Stats Summary Card
   ================================================================ */

function StatCard({
  icon,
  value,
  label,
  division,
  index,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  division: 'male' | 'female';
  index: number;
}) {
  const accent = getAccent(division);
  return (
    <motion.div
      custom={index}
      variants={statsVariants}
      className="glass-subtle rounded-2xl p-2.5 sm:p-3 lg:p-6 flex items-center gap-2.5 sm:gap-3 lg:gap-6 card-3d"
    >
      <div
        className={`w-9 h-9 sm:w-10 sm:h-10 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center ${
          division === 'male' ? 'bg-amber-500/[0.08]' : 'bg-violet-500/[0.08]'
        }`}
      >
        {icon}
      </div>
      <div>
        <p className={`text-sm sm:text-base font-bold tabular-nums ${accent.gradient}`}>{value}</p>
        <p className="text-[10px] text-white/30 font-medium tracking-wide uppercase">{label}</p>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Main Leaderboard Component
   ================================================================ */

export function Leaderboard({ division, players, currentUserId }: LeaderboardProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const { topThree, restPlayers } = useMemo(() => ({
    topThree: players.slice(0, 3),
    restPlayers: players.slice(3),
  }), [players]);

  const filteredRest = useMemo(() => {
    if (!searchQuery.trim()) return restPlayers;
    const q = searchQuery.toLowerCase().trim();
    return restPlayers.filter(
      (p) => p.name.toLowerCase().includes(q) || p.tier.toLowerCase().includes(q)
    );
  }, [restPlayers, searchQuery]);

  const totalMatches = useMemo(
    () => players.reduce((sum, p) => sum + p.wins + p.losses, 0),
    [players]
  );
  const totalPoints = useMemo(
    () => players.reduce((sum, p) => sum + p.points, 0),
    [players]
  );
  const avgPoints = players.length > 0 ? Math.round(totalPoints / players.length) : 0;

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  const accent = getAccent(division);

  return (
    <div className="space-y-5">
      {/* =============================================
          Hero Header
          ============================================= */}
      <motion.div
        className={`rounded-3xl p-6 ${
          division === 'male' ? 'card-gold' : 'card-pink'
        }`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient glow orb */}
        <div
          className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-[70px] pointer-events-none"
          style={{
            background: division === 'male'
              ? 'radial-gradient(circle, rgba(255,215,0,0.12) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
              division === 'male' ? 'bg-amber-500/15' : 'bg-violet-500/15'
            }`}
          >
            <Trophy className={`w-7 h-7 ${accent.text}`} />
          </div>
          <div>
            <h2 className="text-xl font-black text-white/90 tracking-tight">Papan Peringkat</h2>
            <p className="text-[13px] text-white/40 font-medium mt-0.5">
              {players.length} pemain diperingkat musim ini
            </p>
          </div>
        </div>
      </motion.div>

      {/* =============================================
          Stats Summary Row
          ============================================= */}
      {players.length > 0 && (
        <motion.div
          className="grid grid-cols-3 gap-2.5 lg:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <StatCard
            icon={<Users className={`w-5 h-5 ${accent.text}`} />}
            value={players.length}
            label="Pemain"
            division={division}
            index={0}
          />
          <StatCard
            icon={<Gamepad2 className={`w-5 h-5 ${accent.text}`} />}
            value={totalMatches}
            label="Pertandingan"
            division={division}
            index={1}
          />
          <StatCard
            icon={<Target className={`w-5 h-5 ${accent.text}`} />}
            value={avgPoints.toLocaleString()}
            label="Rata-rata PTS"
            division={division}
            index={2}
          />
        </motion.div>
      )}

      {/* =============================================
          Top 3 Podium — Ultra Premium
          ============================================= */}
      {topThree.length > 0 && (
        <motion.div
          className="glass rounded-3xl p-4 sm:p-5 lg:p-8 pt-5 sm:pt-7 lg:pt-10"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-end justify-center gap-2 sm:gap-3 lg:gap-8">
            {/* 2nd Place (Left) */}
            <div className="flex-1 max-w-[110px] sm:max-w-[130px] lg:max-w-[180px]">
              <PodiumCard
                player={topThree[1]}
                rank={2}
                division={division}
                cardHeight={110}
                isCenter={false}
              />
            </div>

            {/* 1st Place (Center — elevated) */}
            <div className="flex-1 max-w-[120px] sm:max-w-[140px] lg:max-w-[200px]">
              <PodiumCard
                player={topThree[0]}
                rank={1}
                division={division}
                cardHeight={140}
                isCenter={true}
              />
            </div>

            {/* 3rd Place (Right) */}
            <div className="flex-1 max-w-[110px] sm:max-w-[130px] lg:max-w-[180px]">
              <PodiumCard
                player={topThree[2]}
                rank={3}
                division={division}
                cardHeight={95}
                isCenter={false}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Visual bridge — podium to list */}
      {topThree.length > 0 && restPlayers.length > 0 && (
        <motion.div
          className="flex items-center gap-3 px-2"
          initial={{ opacity: 0, scaleX: 0.8 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
          <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.2em]">
            Semua Peringkat
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        </motion.div>
      )}

      {/* =============================================
          Search Bar — Glass Premium
          ============================================= */}
      {restPlayers.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4 }}
        >
          <div className="glass-subtle rounded-2xl flex items-center gap-3 px-4 py-3">
            <Search className={`w-4.5 h-4.5 ${accent.text} opacity-50 flex-shrink-0`} />
            <input
              type="text"
              placeholder="Cari pemain..."
              value={searchQuery}
              onChange={handleSearch}
              className="bg-transparent border-none outline-none text-sm text-white/90 placeholder:text-white/40 font-medium w-full tracking-tight"
            />
            {searchQuery && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => setSearchQuery('')}
                className="text-[10px] font-semibold text-white/30 px-2 py-1 rounded-lg bg-white/[0.06] flex-shrink-0"
              >
                Clear
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* =============================================
          Rest of Leaderboard
          ============================================= */}
      {filteredRest.length > 0 && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-2"
        >
          {/* Desktop-only column header */}
          <div className="hidden lg:flex items-center gap-4 px-6 py-3">
            <div className="w-10 h-10" />
            <div className="w-11 h-11" />
            <div className="flex-1 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Pemain</div>
            <div className="text-right w-24 text-[11px] font-semibold text-white/40 uppercase tracking-wider">Poin</div>
          </div>
          <AnimatePresence mode="popLayout">
            {filteredRest.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                rank={player.rank}
                division={division}
                isCurrentUser={currentUserId === player.id}
                index={index}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Search no results */}
      {searchQuery.trim() && filteredRest.length === 0 && restPlayers.length > 0 && (
        <motion.div
          className="glass-subtle rounded-2xl p-6 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Search className={`w-8 h-8 mx-auto mb-2 ${accent.text} opacity-30`} />
          <p className="text-sm font-medium text-white/35">Tidak ada hasil untuk &ldquo;{searchQuery}&rdquo;</p>
        </motion.div>
      )}

      {/* Empty state */}
      {players.length === 0 && (
        <motion.div
          className="glass rounded-2xl p-10 text-center"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Medal className={`w-14 h-14 mx-auto mb-4 ${accent.text} opacity-25`} />
          </motion.div>
          <p className="text-sm font-semibold text-white/40">Belum ada peringkat</p>
          <p className="text-xs text-white/40 mt-1.5">Bermain di turnamen untuk naik peringkat</p>
        </motion.div>
      )}

      {/* =============================================
          Grand Final Qualification Notice
          ============================================= */}
      <motion.div
        className={`rounded-2xl p-4 ${
          division === 'male'
            ? 'bg-gradient-to-r from-amber-500/[0.06] via-orange-500/[0.03] to-transparent border border-amber-500/10'
            : 'bg-gradient-to-r from-violet-500/[0.06] via-purple-500/[0.03] to-transparent border border-violet-500/10'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center gap-4">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
              division === 'male' ? 'bg-amber-500/10' : 'bg-violet-500/10'
            }`}
          >
            <ChevronUp className={`w-5 h-5 ${accent.text}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white/90 tracking-tight">Kualifikasi Grand Final</p>
            <p className="text-xs text-white/35 mt-0.5">12 pemain teratas lolos ke Grand Final</p>
          </div>
          <div>
            <Star className={`w-5 h-5 ${accent.text} opacity-40`} />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
