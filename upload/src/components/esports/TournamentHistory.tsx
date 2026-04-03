'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Calendar,
  Users,
  Crown,
  Star,
  ChevronRight,
  Clock,
  Medal,
  Swords,
  Sparkles,
} from 'lucide-react';

interface TournamentHistory {
  id: string;
  name: string;
  division: string;
  type: string;
  status: string;
  week: number;
  prizePool: number;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  _count: {
    registrations: number;
    teams: number;
    matches: number;
  };
  champion?: {
    id: string;
    name: string;
  };
  runnerUp?: {
    id: string;
    name: string;
  };
  mvp?: {
    id: string;
    name: string;
  };
}

interface TournamentHistoryProps {
  division: 'male' | 'female';
  tournaments: TournamentHistory[];
  onSelect: (tournamentId: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 340,
      damping: 28,
    },
  },
};

const heroVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 26,
    },
  },
};

function getStatusPill(status: string) {
  switch (status) {
    case 'registration':
      return 'status-pill status-registration';
    case 'ongoing':
      return 'status-pill status-live';
    case 'completed':
      return 'status-pill status-completed';
    case 'setup':
      return 'status-pill status-setup';
    default:
      return 'status-pill status-setup';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'registration':
      return 'BUKA';
    case 'ongoing':
      return 'LIVE';
    case 'completed':
      return 'SELESAI';
    case 'setup':
      return 'MENDATANG';
    default:
      return status.toUpperCase();
  }
}

export function TournamentHistory({ division, tournaments, onSelect }: TournamentHistoryProps) {
  const completedTournaments = tournaments.filter((t) => t.status === 'completed');
  const ongoingTournaments = tournaments.filter(
    (t) => t.status === 'ongoing' || t.status === 'registration'
  );

  const isMale = division === 'male';
  const accentCard = isMale ? 'card-gold' : 'card-pink';
  const gradientText = isMale ? 'gradient-gold' : 'gradient-pink';

  // Derive a match stat from the match count (e.g., "3-0", "3-1", "3-2")
  const deriveMatchStat = (matchCount: number, index: number) => {
    if (matchCount <= 0) return '—';
    const wins = Math.ceil(matchCount / 2);
    const losses = matchCount - wins;
    return `${wins}-${losses}`;
  };

  return (
    <motion.div
      className="space-y-6 lg:max-w-3xl lg:mx-auto"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Active Tournament Hero ── */}
      {ongoingTournaments.length > 0 && (
        <motion.div variants={heroVariants}>
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3 px-1">
            Turnamen Aktif
          </p>

          {ongoingTournaments.map((tournament) => (
            <motion.div
              key={tournament.id}
              className={`${accentCard} rounded-3xl p-5 lg:p-5 cursor-pointer`}
              onClick={() => onSelect(tournament.id)}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
              {/* Top row: Status pill + Week badge */}
              <div className="flex items-center justify-between mb-4">
                <span className={getStatusPill(tournament.status)}>
                  {getStatusLabel(tournament.status)}
                </span>
                <span className="text-[11px] uppercase tracking-[0.15em] text-white/40 font-semibold">
                  Week {tournament.week}
                </span>
              </div>

              {/* Tournament Name */}
              <h2 className="text-[22px] font-bold text-white/90 tracking-tight leading-tight mb-2 lg:text-base">
                {tournament.name}
              </h2>

              {/* Meta row: Division badge + participants + prize */}
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                    isMale
                      ? 'bg-amber-500/12 text-amber-400 border border-amber-500/15'
                      : 'bg-violet-500/12 text-violet-400 border border-violet-500/15'
                  }`}
                >
                  <Swords className="w-3 h-3" />
                  {isMale ? 'Divisi Male' : 'Divisi Female'}
                </span>
                <span className="inline-flex items-center gap-1.5 text-[12px] text-white/50 font-medium">
                  <Users className="w-3.5 h-3.5" />
                  {tournament._count.registrations} peserta
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] text-white/50 font-medium">
                  <Trophy className="w-3.5 h-3.5" />
                  ${tournament.prizePool.toLocaleString('id-ID')}
                </span>
              </div>

              {/* CTA row */}
              <div className="flex items-center justify-end mt-4 pt-3 border-t border-white/[0.06]">
                <span
                  className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${gradientText}`}
                >
                  {tournament.status === 'registration' ? 'Daftar Sekarang' : 'Lihat Bracket'}
                  <ChevronRight className="w-4 h-4" />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* ── Past Champions ── */}
      <motion.div variants={itemVariants}>
        <p className="text-[11px] uppercase tracking-[0.2em] text-white/40 font-semibold mb-3 px-1">
          Juara Terdahulu
        </p>

        {completedTournaments.length === 0 && ongoingTournaments.length === 0 ? (
          /* Empty state */
          <motion.div
            className="glass rounded-3xl p-12 text-center"
            variants={heroVariants}
          >
            <div className="relative w-20 h-20 mx-auto mb-5">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/10 to-violet-400/10 blur-xl" />
              <div className="relative w-20 h-20 rounded-3xl glass-subtle flex items-center justify-center">
                <Trophy
                  className={`w-9 h-9 ${isMale ? 'text-amber-400/30' : 'text-violet-400/30'}`}
                />
              </div>
            </div>
            <p className="text-white/50 text-[15px] font-semibold mb-1">Belum ada turnamen</p>
            <p className="text-white/25 text-[13px] font-medium">
              Kejuaraan akan muncul di sini setelah turnamen selesai
            </p>
          </motion.div>
        ) : completedTournaments.length === 0 ? (
          /* Has active but no completed */
          <motion.div
            className="glass rounded-3xl p-10 text-center"
            variants={heroVariants}
          >
            <div className="relative w-16 h-16 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-400/8 to-violet-400/8 blur-lg" />
              <div className="relative w-16 h-16 rounded-2xl glass-subtle flex items-center justify-center">
                <Crown
                  className={`w-7 h-7 ${isMale ? 'text-amber-400/25' : 'text-violet-400/25'}`}
                />
              </div>
            </div>
            <p className="text-white/40 text-[14px] font-medium mb-0.5">Belum ada juara dinobatkan</p>
            <p className="text-white/20 text-[12px] font-medium">
              Pemenang turnamen sebelumnya akan ditampilkan di sini
            </p>
          </motion.div>
        ) : (
          /* Champion cards */
          <motion.div className="space-y-0" variants={containerVariants}>
            {completedTournaments.map((tournament, index) => (
              <motion.div
                key={tournament.id}
                className="glass rounded-2xl p-4 lg:p-5 lg:flex lg:items-center lg:gap-6 mb-3 card-3d"
                variants={itemVariants}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect(tournament.id)}
                style={{ cursor: 'pointer' }}
              >
                <div className="flex items-start gap-4">
                  {/* Left: Week badge + Trophy */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                        isMale ? 'bg-amber-500/10' : 'bg-violet-500/10'
                      }`}
                    >
                      <Trophy
                        className={`w-6 h-6 trophy-glow ${isMale ? 'text-amber-400' : 'text-violet-400'}`}
                      />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-white/30 font-bold">
                      Week {tournament.week}
                    </span>
                  </div>

                  {/* Right: Champion info */}
                  <div className="flex-1 min-w-0">
                    {/* Champion name + match stat row */}
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-[15px] font-bold text-white/90 truncate lg:text-base">
                        {tournament.champion?.name || 'TBD'}
                      </h4>
                      <span
                        className={`flex-shrink-0 text-[13px] font-bold ${gradientText}`}
                      >
                        {deriveMatchStat(tournament._count.matches, index)}
                      </span>
                    </div>

                    {/* Subtitle: tournament name */}
                    <p className="text-[12px] text-white/35 font-medium mt-0.5 truncate lg:text-base">
                      {tournament.name}
                    </p>

                    {/* Bottom row: MVP, runner-up, date */}
                    <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                      {tournament.mvp?.name && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-purple-400/70 font-medium">
                          <Sparkles className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{tournament.mvp.name}</span>
                        </span>
                      )}
                      {tournament.runnerUp?.name && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/25 font-medium">
                          <Medal className="w-3 h-3" />
                          <span className="truncate max-w-[100px]">{tournament.runnerUp.name}</span>
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] text-white/20 font-medium ml-auto">
                        <Calendar className="w-3 h-3" />
                        {new Date(tournament.createdAt).toLocaleDateString('id-ID', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>

      {/* ── Stats Summary ── */}
      {tournaments.length > 0 && (
        <motion.div className="grid grid-cols-3 gap-3" variants={itemVariants}>
          <div className="glass rounded-2xl p-4 text-center card-3d">
            <div
              className={`w-11 h-11 rounded-2xl mx-auto mb-2.5 flex items-center justify-center ${
                isMale ? 'bg-amber-500/12' : 'bg-violet-500/12'
              }`}
            >
              <Crown
                className={`w-5 h-5 ${isMale ? 'text-amber-400' : 'text-violet-400'}`}
              />
            </div>
            <p className="text-[20px] font-bold text-white/90 tracking-tight">
              {completedTournaments.length}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-semibold mt-0.5">
              Juara
            </p>
          </div>
          <div className="glass rounded-2xl p-4 text-center card-3d">
            <div className="w-11 h-11 rounded-2xl mx-auto mb-2.5 flex items-center justify-center bg-white/[0.05]">
              <Users className="w-5 h-5 text-white/35" />
            </div>
            <p className="text-[20px] font-bold text-white/90 tracking-tight">
              {tournaments.reduce((sum, t) => sum + t._count.registrations, 0)}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-semibold mt-0.5">
              Pemain
            </p>
          </div>
          <div className="glass rounded-2xl p-4 text-center card-3d">
            <div className="w-11 h-11 rounded-2xl mx-auto mb-2.5 flex items-center justify-center bg-purple-500/10">
              <Star className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-[18px] font-bold text-white/90 tracking-tight">
              ${tournaments.reduce((sum, t) => sum + t.prizePool, 0).toLocaleString('id-ID')}
            </p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-white/35 font-semibold mt-0.5">
              Total Hadiah
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
