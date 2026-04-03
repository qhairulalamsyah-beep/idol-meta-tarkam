'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown } from 'lucide-react';

interface RankingPlayer {
  id: string;
  name: string;
  points: number;
  tier: string;
  avatar: string | null;
  rank: number;
  wins?: number;
  losses?: number;
}

interface AllRankingsModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  players: RankingPlayer[];
  division: 'male' | 'female';
}

export function AllRankingsModal({
  isOpen,
  onOpenChange,
  players,
  division,
}: AllRankingsModalProps) {
  const isMale = division === 'male';
  const accentColor = isMale ? 'text-amber-400' : 'text-violet-400';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';

  const tierMap: Record<string, string> = { S: 'tier-s', A: 'tier-a', B: 'tier-b' };

  const rankColors = ['#FFD60A', '#C7C7CC', '#CD7F32'];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Modal content - with drag to close */}
          <motion.div
            className="relative w-full max-w-md max-h-[75vh] sm:max-h-[80vh] mx-2 sm:mx-4 mb-20 sm:mb-4 rounded-t-3xl sm:rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(24,24,27,0.98) 0%, rgba(18,18,22,0.99) 100%)',
              boxShadow: isMale
                ? '0 0 60px rgba(255,214,10,0.08), 0 25px 50px -12px rgba(0,0,0,0.5)'
                : '0 0 60px rgba(167,139,250,0.08), 0 25px 50px -12px rgba(0,0,0,0.5)',
            }}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onOpenChange(false);
              }
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            <div className="relative px-5 pt-3 pb-4 border-b border-white/[0.06]">
              {/* Accent glow */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full"
                style={{
                  background: isMale
                    ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.6), transparent)'
                    : 'linear-gradient(90deg, transparent, rgba(167,139,250,0.6), transparent)',
                  boxShadow: isMale
                    ? '0 0 16px rgba(255,214,10,0.4)'
                    : '0 0 16px rgba(167,139,250,0.4)',
                }}
              />

              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0`}
                  style={{
                    background: isMale
                      ? 'linear-gradient(135deg, rgba(255,214,10,0.16), rgba(229,168,0,0.06))'
                      : 'linear-gradient(135deg, rgba(167,139,250,0.16), rgba(139,92,246,0.06))',
                  }}
                >
                  <Trophy className={`w-6 h-6 ${accentColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold text-white/90 tracking-tight">
                    Semua Peringkat
                  </h2>
                  <p className="text-[12px] text-white/45 mt-0.5">
                    Peringkat pemain terbaru
                  </p>
                </div>
              </div>
            </div>

            {/* Player list */}
            <div className="overflow-y-auto max-h-[calc(75vh-100px)] sm:max-h-[calc(80vh-100px)] p-4 space-y-2 scrollbar-thin">
              {players.length === 0 ? (
                <div className="text-center py-10">
                  <Trophy className={`w-10 h-10 mx-auto mb-3 ${accentColor} opacity-30`} />
                  <p className="text-sm text-white/40 font-medium">Belum ada data peringkat</p>
                </div>
              ) : (
                <>
                  {/* Top 3 podium mini */}
                  {players.length >= 3 && (
                    <div className="flex items-end justify-center gap-2 mb-4 pt-2 pb-3">
                      {/* 2nd Place */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px]">
                        <div className={avatarRingClass}>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {players[1].avatar ? (
                              <img src={players[1].avatar} alt={players[1].name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-white/70">{players[1].name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="mt-2 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black"
                          style={{
                            background: 'linear-gradient(135deg, #C7C7CC, #8E8E93)',
                            color: '#1C1C1E',
                          }}
                        >
                          2
                        </div>
                        <p className="text-[11px] font-semibold text-white/80 mt-1.5 truncate w-full text-center">
                          {players[1].name}
                        </p>
                        <p className={`text-[10px] font-bold ${accentColor}`}>
                          {players[1].points.toLocaleString()} pts
                        </p>
                      </div>

                      {/* 1st Place */}
                      <div className="flex flex-col items-center flex-1 max-w-[90px]">
                        <motion.div
                          animate={{ y: [0, -3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Crown className={`w-5 h-5 ${accentColor} mb-1`} />
                        </motion.div>
                        <div className={avatarRingClass}>
                          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {players[0].avatar ? (
                              <img src={players[0].avatar} alt={players[0].name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-base font-bold text-white/70">{players[0].name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="mt-2 w-11 h-11 rounded-lg flex items-center justify-center text-sm font-black"
                          style={{
                            background: isMale
                              ? 'linear-gradient(135deg, #FFD60A, #E5A800)'
                              : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                            color: '#000',
                            boxShadow: isMale
                              ? '0 0 12px rgba(255,214,10,0.3)'
                              : '0 0 12px rgba(167,139,250,0.3)',
                          }}
                        >
                          1
                        </div>
                        <p className="text-[12px] font-bold text-white/90 mt-1.5 truncate w-full text-center">
                          {players[0].name}
                        </p>
                        <p className={`text-[11px] font-bold ${accentColor}`}>
                          {players[0].points.toLocaleString()} pts
                        </p>
                      </div>

                      {/* 3rd Place */}
                      <div className="flex flex-col items-center flex-1 max-w-[80px]">
                        <div className={avatarRingClass}>
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {players[2].avatar ? (
                              <img src={players[2].avatar} alt={players[2].name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-sm font-bold text-white/70">{players[2].name.charAt(0)}</span>
                            )}
                          </div>
                        </div>
                        <div
                          className="mt-2 w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black"
                          style={{
                            background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
                            color: '#fff',
                          }}
                        >
                          3
                        </div>
                        <p className="text-[11px] font-semibold text-white/80 mt-1.5 truncate w-full text-center">
                          {players[2].name}
                        </p>
                        <p className={`text-[10px] font-bold ${accentColor}`}>
                          {players[2].points.toLocaleString()} pts
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Divider */}
                  {players.length > 3 && (
                    <div className="flex items-center gap-3 px-2 my-3">
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                      <span className="text-[9px] font-semibold text-white/30 uppercase tracking-wider">
                        Pemain Lainnya
                      </span>
                      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                    </div>
                  )}

                  {/* Rest of players */}
                  {players.slice(3).map((player, index) => (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="glass-subtle rounded-xl px-3.5 py-3 flex items-center gap-3"
                    >
                      {/* Rank */}
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.35)' }}
                      >
                        {player.rank}
                      </div>

                      {/* Avatar */}
                      <div className={avatarRingClass}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-white/70">{player.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-white/90 truncate">{player.name}</p>
                      </div>

                      {/* Tier */}
                      <span className={`tier-badge ${tierMap[player.tier] || 'tier-b'} shrink-0`}>
                        {player.tier}
                      </span>

                      {/* Points */}
                      <span className={`text-[12px] font-bold ${accentColor} tabular-nums shrink-0`}>
                        {player.points.toLocaleString()}
                      </span>
                    </motion.div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
