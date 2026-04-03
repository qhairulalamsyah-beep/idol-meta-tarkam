'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  XCircle,
  Users,
  Swords,
  Shield,
  UserRound,
} from 'lucide-react';

interface TeamMember {
  user: {
    id: string;
    name: string;
    tier: string;
    avatar: string | null;
  };
}

interface Team {
  id: string;
  name: string;
  seed: number;
  members: TeamMember[];
}

interface TeamListModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
  division: 'male' | 'female';
}

function getTierBadgeClass(tier: string) {
  switch (tier) {
    case 'S': return 'tier-s';
    case 'A': return 'tier-a';
    default: return 'tier-b';
  }
}

export function TeamListModal({
  isOpen,
  onOpenChange,
  teams,
  division,
}: TeamListModalProps) {
  const isMale = division === 'male';
  const accentClass = isMale ? 'text-[--ios-gold]' : 'text-[--ios-pink]';
  const accentBgSubtle = isMale ? 'bg-amber-500/12' : 'bg-violet-500/12';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';
  const cardClass = isMale ? 'card-gold' : 'card-pink';

  // Count total players across all teams
  const totalPlayers = teams.reduce((sum, t) => sum + t.members.length, 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[55] flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => onOpenChange(false)}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Bottom Sheet - with drag to close */}
          <motion.div
            className="relative w-full max-w-md lg:max-w-2xl max-h-[80vh] glass rounded-t-[32px] overflow-hidden flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
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
            <div className="flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
            </div>

            {/* Header */}
            <div className="inner-light px-6 pb-4 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-2xl ${accentBgSubtle} flex items-center justify-center`}>
                    <Swords className={`w-5 h-5 ${accentClass}`} />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-white/90 tracking-tight leading-tight">
                      Daftar Tim
                    </h2>
                    <p className="text-[11px] text-white/30 mt-0.5 font-medium">
                      {teams.length} tim &middot; {totalPlayers} pemain
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-9 h-9 rounded-2xl bg-white/[0.06] hover:bg-white/10 flex items-center justify-center text-white/40 hover:text-white/70 transition-all duration-200 active:scale-95"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Team List */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-8">
              {teams.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex flex-col items-center justify-center py-20"
                >
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-white/15" />
                  </div>
                  <p className="text-[14px] font-semibold text-white/35 mb-1">Belum ada tim</p>
                  <p className="text-[12px] text-white/20 text-center max-w-[240px] leading-relaxed">
                    Tim akan terbentuk setelah admin generate tim dari peserta yang sudah disetujui
                  </p>
                </motion.div>
              ) : (
                <div className="space-y-3.5">
                  {teams.map((team, i) => (
                    <motion.div
                      key={team.id}
                      className="glass-subtle rounded-2xl p-4.5 lg:p-5 transition-all duration-300"
                      style={{ padding: '18px' }}
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: i * 0.06,
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      whileHover={{
                        y: -2,
                        boxShadow: isMale
                          ? '0 8px 32px rgba(255,214,10,0.08), 0 2px 8px rgba(0,0,0,0.2)'
                          : '0 8px 32px rgba(167,139,250,0.08), 0 2px 8px rgba(0,0,0,0.2)',
                      }}
                    >
                      {/* Team header */}
                      <div className="flex items-center gap-3 mb-4">
                        {/* Refined Seed Badge */}
                        <div className={`relative flex-shrink-0`}>
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[13px] tracking-tight ${
                            isMale
                              ? 'bg-gradient-to-br from-amber-400 to-amber-600 text-black'
                              : 'bg-gradient-to-br from-violet-400 to-violet-600 text-white/90'
                          }`}
                          style={{
                            boxShadow: isMale
                              ? '0 2px 8px rgba(255,214,10,0.3), inset 0 1px 0 rgba(255,255,255,0.3)'
                              : '0 2px 8px rgba(167,139,250,0.3), inset 0 1px 0 rgba(255,255,255,0.3)',
                          }}
                          >
                            {team.seed || i + 1}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-[15px] font-bold text-white/90 truncate leading-tight">
                            {team.name}
                          </h4>
                          <p className="text-[11px] text-white/25 font-medium mt-0.5">
                            {team.members.length} anggota
                          </p>
                        </div>
                        <Shield className={`w-4 h-4 ${accentClass} opacity-30`} />
                      </div>

                      {/* Members row — sorted by tier: S > A > B */}
                      <div className="flex items-start gap-3 flex-wrap">
                        {[...team.members].sort((a, b) => {
                          const order: Record<string, number> = { S: 0, A: 1, B: 2 };
                          return (order[a.user.tier] ?? 3) - (order[b.user.tier] ?? 3);
                        }).map((member, mIdx) => (
                          <motion.div
                            key={member.user.id}
                            className="flex flex-col items-center gap-1.5"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{
                              delay: i * 0.06 + mIdx * 0.05 + 0.15,
                              duration: 0.35,
                              ease: [0.34, 1.56, 0.64, 1],
                            }}
                          >
                            <div className={avatarRingClass}>
                              <div className="w-11 h-11 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                                {member.user.avatar ? (
                                  <img
                                    src={member.user.avatar}
                                    alt={member.user.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-semibold text-white/70">
                                    {member.user.name[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-white/45 font-medium max-w-[64px] truncate text-center">
                              {member.user.name}
                            </span>
                            <span className={`tier-badge ${getTierBadgeClass(member.user.tier)}`}>
                              {member.user.tier}
                            </span>
                          </motion.div>
                        ))}
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
