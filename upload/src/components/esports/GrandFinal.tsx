'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Trophy,
  Star,
  Flame,
  Sparkles,
  Swords,
  Medal,
  Zap,
  Calendar,
  Shield,
  ChevronRight,
  Users,
  Play,
  RotateCcw,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
  Save,
} from 'lucide-react';
import { useMemo, useState, useCallback, useEffect } from 'react';

/* ================================================================
   Interfaces
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

interface MVPUser {
  id: string;
  name: string;
  avatar: string | null;
  points: number;
  mvpScore: number;
}

interface TeamMember {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    tier: string;
    points: number;
    avatar: string | null;
  };
}

interface GFTeam {
  id: string;
  name: string;
  seed: number;
  isEliminated: boolean;
  members: TeamMember[];
}

interface GFMatch {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId: string | null;
  status: string;
  bracket: string;
  teamA?: GFTeam | null;
  teamB?: GFTeam | null;
  winner?: { id: string; name: string } | null;
  mvp?: { id: string; name: string; avatar: string | null } | null;
}

interface GrandFinalData {
  id: string;
  name: string;
  type: string;
  status: string;
  division: string;
  teams: GFTeam[];
  matches: GFMatch[];
}

interface QualifiedPlayer {
  id: string;
  name: string;
  points: number;
  tier: string;
  avatar: string | null;
}

interface GrandFinalProps {
  division: 'male' | 'female';
  topPlayers: Player[];
  prizePool: number;
  weekNumber: number;
  mvpUser: MVPUser | null;
  isAdminAuthenticated: boolean;
  grandFinalData: GrandFinalData | null;
  qualifiedPlayers: QualifiedPlayer[];
  onSetupGrandFinal: (prizePoolValue?: number) => void;
  onDeleteGrandFinal: () => void;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  onRefresh: () => void;
  isSettingUp?: boolean;
  isDeleting?: boolean;
  isUpdatingScore?: boolean;
  gfPrizePool?: number;
  onGfPrizePoolChange?: (value: number) => void;
}

/* ================================================================
   Animation Variants
   ================================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const heroTextVariants = {
  hidden: { opacity: 0, y: 8, letterSpacing: '0.3em' },
  visible: {
    opacity: 1,
    y: 0,
    letterSpacing: '0.02em',
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

/* ================================================================
   Helpers
   ================================================================ */

const TEAM_COLORS = [
  { bg: 'from-orange-500 to-red-500', text: 'text-orange-400', border: 'border-orange-500/20', ring: 'ring-orange-500/30', bgSubtle: 'bg-orange-500/10', badge: 'bg-orange-400/15 text-orange-400' },
  { bg: 'from-emerald-500 to-teal-500', text: 'text-emerald-400', border: 'border-emerald-500/20', ring: 'ring-emerald-500/30', bgSubtle: 'bg-emerald-500/10', badge: 'bg-emerald-400/15 text-emerald-400' },
  { bg: 'from-purple-500 to-violet-500', text: 'text-purple-400', border: 'border-purple-500/20', ring: 'ring-purple-500/30', bgSubtle: 'bg-purple-500/10', badge: 'bg-purple-400/15 text-purple-400' },
  { bg: 'from-pink-500 to-rose-500', text: 'text-pink-400', border: 'border-pink-500/20', ring: 'ring-pink-500/30', bgSubtle: 'bg-pink-500/10', badge: 'bg-pink-400/15 text-pink-400' },
];

function getAccent(division: 'male' | 'female') {
  return division === 'male'
    ? { text: 'text-amber-400', ring: 'avatar-ring-gold', gradient: 'gradient-gold' }
    : { text: 'text-violet-400', ring: 'avatar-ring-pink', gradient: 'gradient-pink' };
}

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

/* ================================================================
   Team Card Component
   ================================================================ */

function TeamCard({
  team,
  colorIndex,
  isWinner,
  isEliminated,
  division,
  matchResult,
}: {
  team: GFTeam;
  colorIndex: number;
  isWinner?: boolean;
  isEliminated?: boolean;
  division: 'male' | 'female';
  matchResult?: 'win' | 'loss' | null;
}) {
  const color = TEAM_COLORS[colorIndex % 4];
  const accent = getAccent(division);

  return (
    <motion.div
      variants={itemVariants}
      className={`glass rounded-2xl overflow-hidden relative ${
        isWinner ? `ring-1 ${color.ring}` : ''
      } ${isEliminated ? 'opacity-60' : ''}`}
      whileHover={{ scale: 1.02, y: -3 }}
      transition={{ duration: 0.25 }}
    >
      {/* Team Header */}
      <div className={`px-4 py-3 bg-gradient-to-r ${color.bg} opacity-90`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{team.name}</p>
              <p className="text-[10px] text-white/60 font-medium">Seed #{team.seed}</p>
            </div>
          </div>
          {isWinner && (
            <Crown className="w-5 h-5 text-yellow-200" />
          )}
          {matchResult === 'win' && !isWinner && (
            <span className="text-[10px] font-bold text-emerald-300 bg-emerald-400/20 px-2 py-0.5 rounded-full">MENANG</span>
          )}
          {matchResult === 'loss' && (
            <span className="text-[10px] font-bold text-red-300 bg-red-400/20 px-2 py-0.5 rounded-full">KALAH</span>
          )}
        </div>
      </div>

      {/* Team Members */}
      <div className="p-3 space-y-2">
        {team.members.map((member, idx) => (
          <div key={member.id} className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {member.user.avatar ? (
                <img src={member.user.avatar} alt={member.user.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-white/70">{member.user.name.charAt(0)}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-semibold text-white/90 truncate">{member.user.name}</p>
                {member.role === 'captain' && (
                  <Crown className="w-3 h-3 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`tier-badge ${getTierClass(member.user.tier)}`} style={{ fontSize: '9px', padding: '0 5px' }}>{member.user.tier}</span>
                <span className="text-[10px] text-white/30 font-medium tabular-nums">{member.user.points.toLocaleString()} pts</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Match Card Component (for Grand Final Bracket)
   ================================================================ */

function GFMatchCard({
  match,
  allTeams,
  semiLabel,
  isAdmin,
  onUpdateScore,
  isUpdating,
}: {
  match: GFMatch;
  allTeams: GFTeam[];
  semiLabel: string;
  isAdmin: boolean;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number, mvpId?: string) => void;
  isUpdating: boolean;
}) {
  const teamA = match.teamA || allTeams.find(t => t.id === match.teamAId);
  const teamB = match.teamB || allTeams.find(t => t.id === match.teamBId);
  const teamAColorIdx = teamA ? teamA.seed - 1 : 0;
  const teamBColorIdx = teamB ? teamB.seed - 1 : 0;
  const colorA = TEAM_COLORS[teamAColorIdx % 4];
  const colorB = TEAM_COLORS[teamBColorIdx % 4];

  const [scoreA, setScoreA] = useState<string>(match.scoreA?.toString() || '');
  const [scoreB, setScoreB] = useState<string>(match.scoreB?.toString() || '');
  const [mvpSearch, setMvpSearch] = useState('');

  const isCompleted = match.status === 'completed';

  // Collect all players from both teams for MVP selection
  const allPlayers = useMemo(() => {
    const players: Array<{ userId: string; userName: string; teamName: string }> = [];
    if (teamA) {
      for (const m of teamA.members) {
        players.push({ userId: m.user.id, userName: m.user.name, teamName: teamA.name });
      }
    }
    if (teamB) {
      for (const m of teamB.members) {
        players.push({ userId: m.user.id, userName: m.user.name, teamName: teamB.name });
      }
    }
    return players;
  }, [teamA, teamB]);

  const filteredMvps = mvpSearch
    ? allPlayers.filter(p => p.userName.toLowerCase().includes(mvpSearch.toLowerCase()))
    : allPlayers;

  const [showMvp, setShowMvp] = useState(false);

  const handleSubmitScore = useCallback(() => {
    const a = parseInt(scoreA);
    const b = parseInt(scoreB);
    if (isNaN(a) || isNaN(b)) return;
    if (a === b) return; // no draw
    onUpdateScore(match.id, a, b);
  }, [scoreA, scoreB, match.id, onUpdateScore]);

  const winnerA = isCompleted && match.winnerId === teamA?.id;
  const winnerB = isCompleted && match.winnerId === teamB?.id;

  return (
    <motion.div
      variants={itemVariants}
      className={`glass rounded-2xl overflow-hidden relative ${isCompleted ? 'opacity-90' : ''}`}
    >
      {/* Match Label */}
      <div className="px-4 py-2 bg-white/[0.03] border-b border-white/[0.05]">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold tracking-[0.15em] uppercase text-white/40">{semiLabel}</span>
          {isCompleted && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/15 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Selesai
            </span>
          )}
        </div>
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {/* Team A */}
        <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${winnerA ? `${colorA.bgSubtle} ring-1 ${colorA.ring}` : 'bg-white/[0.02]'}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorA.bg} flex items-center justify-center flex-shrink-0 ${!winnerA && isCompleted ? 'opacity-40' : ''}`}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${winnerA ? 'text-white' : 'text-white/70'}`}>{teamA?.name || 'TBD'}</p>
            {teamA && (
              <p className="text-[10px] text-white/30 mt-0.5">{teamA.members.map(m => m.user.name).join(', ')}</p>
            )}
          </div>
          {isAdmin && !isCompleted && (
            <input
              type="number"
              value={scoreA}
              onChange={e => setScoreA(e.target.value)}
              placeholder="0"
              className="w-14 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-sm font-bold text-white/90 focus:outline-none focus:border-white/25 transition-colors tabular-nums"
              min="0"
            />
          )}
          {isCompleted && (
            <span className={`text-lg font-black tabular-nums ${winnerA ? colorA.text : 'text-white/30'}`}>
              {match.scoreA ?? 0}
            </span>
          )}
        </div>

        {/* VS Divider */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-[10px] font-black tracking-[0.2em] text-white/20">VS</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        {/* Team B */}
        <div className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${winnerB ? `${colorB.bgSubtle} ring-1 ${colorB.ring}` : 'bg-white/[0.02]'}`}>
          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${colorB.bg} flex items-center justify-center flex-shrink-0 ${!winnerB && isCompleted ? 'opacity-40' : ''}`}>
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-bold truncate ${winnerB ? 'text-white' : 'text-white/70'}`}>{teamB?.name || 'TBD'}</p>
            {teamB && (
              <p className="text-[10px] text-white/30 mt-0.5">{teamB.members.map(m => m.user.name).join(', ')}</p>
            )}
          </div>
          {isAdmin && !isCompleted && (
            <input
              type="number"
              value={scoreB}
              onChange={e => setScoreB(e.target.value)}
              placeholder="0"
              className="w-14 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-center text-sm font-bold text-white/90 focus:outline-none focus:border-white/25 transition-colors tabular-nums"
              min="0"
            />
          )}
          {isCompleted && (
            <span className={`text-lg font-black tabular-nums ${winnerB ? colorB.text : 'text-white/30'}`}>
              {match.scoreB ?? 0}
            </span>
          )}
        </div>

        {/* MVP */}
        {isCompleted && match.mvp && (
          <div className="flex items-center gap-2 px-1 mt-1">
            <Star className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-[11px] text-amber-400 font-bold">MVP:</span>
            <span className="text-[11px] text-white/70 font-semibold">{match.mvp.name}</span>
          </div>
        )}

        {/* Admin: Submit Score */}
        {isAdmin && !isCompleted && teamA && teamB && (
          <div className="space-y-2 pt-1">
            {/* MVP Selection */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMvp(!showMvp)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${match.mvpId ? 'bg-amber-400/10 border border-amber-400/20' : 'bg-white/[0.03] border border-white/[0.06]'}`}
              >
                <div className="flex items-center gap-2">
                  <Star className={`w-3.5 h-3.5 ${match.mvpId ? 'text-amber-400' : 'text-white/30'}`} />
                  <span className={`text-[11px] font-medium ${match.mvpId ? 'text-amber-400' : 'text-white/40'}`}>
                    {match.mvpId ? allPlayers.find(p => p.userId === match.mvpId)?.userName || 'Pilih MVP' : 'Pilih MVP (opsional)'}
                  </span>
                </div>
              </button>
              <AnimatePresence>
                {showMvp && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="absolute z-20 top-full left-0 right-0 mt-1 glass rounded-xl overflow-hidden border border-white/10"
                  >
                    <div className="p-1.5">
                      <input
                        type="text"
                        value={mvpSearch}
                        onChange={e => setMvpSearch(e.target.value)}
                        placeholder="Cari pemain..."
                        className="w-full bg-white/5 border border-white/[0.06] rounded-lg px-2.5 py-1.5 text-[11px] text-white/90 placeholder:text-white/20 focus:outline-none"
                      />
                    </div>
                    <div className="max-h-32 overflow-y-auto">
                      {filteredMvps.map(player => (
                        <button
                          key={player.userId}
                          type="button"
                          onClick={() => {
                            setMvpSearch(player.userName);
                            setShowMvp(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-white/[0.05] transition-colors"
                        >
                          <p className="text-[11px] text-white/80 font-medium">{player.userName}</p>
                          <p className="text-[10px] text-white/25">{player.teamName}</p>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button
              type="button"
              onClick={handleSubmitScore}
              disabled={isUpdating || !scoreA || !scoreB || scoreA === scoreB}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[12px] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:from-emerald-400 hover:to-teal-400 transition-all"
            >
              {isUpdating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              Simpan Skor
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ================================================================
   Point Distribution Card
   ================================================================ */

function PointCard({
  icon,
  label,
  points,
  division,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  points: string;
  division: 'male' | 'female';
  index: number;
}) {
  const accent = getAccent(division);
  return (
    <motion.div
      custom={index}
      variants={itemVariants}
      className="glass rounded-2xl p-3 sm:p-4 text-center card-3d relative overflow-hidden"
    >
      <div className="relative z-10">
        <div className="mb-2 flex justify-center">{icon}</div>
        <p className={`text-lg sm:text-xl font-black tabular-nums ${accent.gradient}`}>{points}</p>
        <p className="text-[10px] text-white/30 font-semibold mt-1 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Main GrandFinal Component
   ================================================================ */

export function GrandFinal({
  division,
  topPlayers,
  prizePool,
  weekNumber,
  mvpUser,
  isAdminAuthenticated,
  grandFinalData,
  qualifiedPlayers,
  onSetupGrandFinal,
  onDeleteGrandFinal,
  onUpdateScore,
  onRefresh,
  isSettingUp = false,
  isDeleting = false,
  isUpdatingScore = false,
  gfPrizePool = 0,
  onGfPrizePoolChange,
}: GrandFinalProps) {
  const accent = getAccent(division);
  const accentGradient = division === 'male'
    ? 'from-amber-400 via-yellow-300 to-orange-500'
    : 'from-violet-400 via-purple-300 to-violet-500';
  const isMale = division === 'male';

  // Local state for prize pool input
  const [localPrizePool, setLocalPrizePool] = useState<string>(gfPrizePool.toString());

  // Handle prize pool input change
  const handlePrizePoolChange = useCallback((value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setLocalPrizePool(numericValue);
    const numValue = parseInt(numericValue) || 0;
    onGfPrizePoolChange?.(numValue);
  }, [onGfPrizePoolChange]);

  // Determine Grand Final status
  const isGFActive = grandFinalData && grandFinalData.status !== 'completed';
  const isGFCompleted = grandFinalData && grandFinalData.status === 'completed';
  const hasEnoughPlayers = qualifiedPlayers.length >= 12;

  // Get semifinal and final matches
  const semiMatches = grandFinalData?.matches.filter(m => m.round === 1) || [];
  const finalMatch = grandFinalData?.matches.find(m => m.round === 2) || null;
  const allTeams = grandFinalData?.teams || [];

  // Find champion
  const champion = grandFinalData
    ? (grandFinalData.status === 'completed' && finalMatch?.winnerId)
      ? allTeams.find(t => t.id === finalMatch.winnerId)
      : null
    : null;

  // Determine eliminated teams
  const eliminatedTeamIds = useMemo(() => {
    if (!grandFinalData) return new Set<string>();
    const ids = new Set<string>();
    for (const match of grandFinalData.matches) {
      if (match.status === 'completed' && match.winnerId && match.round === 1) {
        const loserId = match.teamAId === match.winnerId ? match.teamBId : match.teamAId;
        if (loserId) ids.add(loserId);
      }
    }
    return ids;
  }, [grandFinalData]);

  return (
    <div className="space-y-5">
      {/* =============================================
          Hero Header
          ============================================= */}
      <motion.div
        className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 md:p-7 lg:p-8 ${
          division === 'male' ? 'card-gold' : 'card-pink'
        }`}
        initial={{ opacity: 0, y: 28, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient glow orbs */}
        <div
          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none"
          style={{
            background: division === 'male'
              ? 'radial-gradient(circle, rgba(255,215,0,0.18) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full blur-[60px] pointer-events-none"
          style={{
            background: division === 'male'
              ? 'radial-gradient(circle, rgba(255,159,10,0.1) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
          }}
        />

        <div className="relative z-10 lg:flex lg:items-center lg:gap-8">
          {/* Trophy + Title */}
          <motion.div
            className="flex items-center gap-4 mb-6 lg:mb-0 lg:shrink-0"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div
              className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-20 lg:h-20 rounded-xl sm:rounded-2xl flex items-center justify-center bg-gradient-to-br ${accentGradient}`}
              style={{
                boxShadow: division === 'male'
                  ? '0 6px 32px rgba(255,214,10,0.35), inset 0 1px 0 rgba(255,255,255,0.3)'
                  : '0 6px 32px rgba(167,139,250,0.35), inset 0 1px 0 rgba(255,255,255,0.3)',
              }}
            >
              <Trophy className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 text-black trophy-glow" />
            </div>

            <div>
              <motion.h2
                className="text-2xl sm:text-3xl lg:text-4xl font-black text-white/90 tracking-tight leading-none"
                variants={heroTextVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.2 }}
              >
                GRAND FINAL
              </motion.h2>
              <div className="flex items-center gap-2 mt-1.5">
                <Calendar className="w-3.5 h-3.5 text-white/30" />
                <span className="text-[12px] text-white/40 font-semibold">4 Tim / 12 Pemain</span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.08] text-white/40 uppercase tracking-wider">
                  Kejuaraan Musim
                </span>
              </div>
            </div>
          </motion.div>

          {/* Status / Prize Pool */}
          <motion.div
            className={`rounded-xl sm:rounded-2xl p-4 sm:p-5 md:p-6 text-center relative overflow-hidden lg:flex-1 ${
              isGFCompleted ? 'bg-emerald-500/[0.12] border border-emerald-500/20' :
              isGFActive ? 'bg-amber-500/[0.08] border border-amber-500/15' :
              'bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06]'
            }`}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="relative z-10">
              {isGFCompleted && champion ? (
                <>
                  <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-emerald-400/60 mb-2">
                    JUARA GRAND FINAL
                  </p>
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                  >
                    <Crown className="w-8 h-8 text-amber-400 mx-auto mb-2" />
                    <p className={`text-xl sm:text-2xl lg:text-3xl font-black ${TEAM_COLORS[(champion.seed - 1) % 4].text}`}>
                      {champion.name}
                    </p>
                    <p className="text-[11px] text-white/30 mt-1">
                      {champion.members.map(m => m.user.name).join(' · ')}
                    </p>
                  </motion.div>
                </>
              ) : isGFActive ? (
                <>
                  {/* Show prize pool when Grand Final is active */}
                  <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-white/30 mb-2">
                    Total Hadiah
                  </p>
                  <motion.p
                    className={`text-2xl sm:text-3xl lg:text-4xl font-black tabular-nums ${accent.gradient}`}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 180, damping: 14 }}
                  >
                    Rp {(grandFinalData?.prizePool || prizePool).toLocaleString('id-ID')}
                  </motion.p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="relative flex h-2 w-2">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75`} />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                    </div>
                    <p className="text-[11px] tracking-[0.15em] uppercase font-bold text-amber-400/70">
                      SEDANG BERJALAN
                    </p>
                  </div>
                  <p className="text-[11px] text-white/40 font-medium mt-1">
                    Semi {semiMatches.filter(m => m.status === 'completed').length}/2 · {finalMatch?.status === 'completed' ? 'Final Selesai' : 'Final Menunggu'}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[11px] tracking-[0.25em] uppercase font-bold text-white/30 mb-3">
                    Hadiah Juara
                  </p>
                  <motion.p
                    className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tabular-nums ${accent.gradient}`}
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.45, type: 'spring', stiffness: 180, damping: 14 }}
                  >
                    Rp {prizePool.toLocaleString('id-ID')}
                  </motion.p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <div className="w-8 h-px bg-white/10" />
                    <p className="text-[10px] text-white/40 font-semibold uppercase tracking-widest">Total Hadiah</p>
                    <div className="w-8 h-px bg-white/10" />
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* =============================================
          Admin Controls
          ============================================= */}
      {isAdminAuthenticated && !isGFActive && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-2.5 px-1 mb-3">
            <Lock className="w-4 h-4 text-white/30" />
            <span className="text-[11px] font-bold tracking-[0.1em] uppercase text-white/30">Admin Controls</span>
          </div>

          {/* Prize Pool Input for Grand Final */}
          <div className="mb-3 space-y-2">
            <label className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold flex items-center gap-1.5">
              <Trophy className="w-3 h-3" /> Prize Pool Grand Final
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[12px] text-white/30 pointer-events-none">
                  Rp
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={localPrizePool}
                  onChange={(e) => handlePrizePoolChange(e.target.value)}
                  placeholder="Contoh: 1000000"
                  className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-3 py-2.5 text-white/90 text-[13px] placeholder-white/20 focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
              <button
                type="button"
                onClick={() => onGfPrizePoolChange?.(parseInt(localPrizePool) || 0)}
                className={`px-4 py-2.5 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition-all ${
                  parseInt(localPrizePool) > 0
                    ? isMale
                      ? 'bg-amber-400/15 text-amber-400 border border-amber-400/20'
                      : 'bg-violet-400/15 text-violet-400 border border-violet-400/20'
                    : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                Simpan
              </button>
            </div>
            {localPrizePool && parseInt(localPrizePool) > 0 && (
              <p className="text-[10px] text-white/30 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                Total Hadiah: Rp {parseInt(localPrizePool).toLocaleString('id-ID')}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => onSetupGrandFinal(parseInt(localPrizePool) || 0)}
              disabled={!hasEnoughPlayers || isSettingUp}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-black text-[12px] font-bold disabled:opacity-30 disabled:cursor-not-allowed hover:from-amber-400 hover:to-orange-400 transition-all"
            >
              {isSettingUp ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              {hasEnoughPlayers
                ? 'Mulai Grand Final (12 Pemain → 4 Tim)'
                : `Butuh 12 Pemain (${qualifiedPlayers.length}/12)`
              }
            </button>
            <button
              type="button"
              onClick={onRefresh}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[12px] font-semibold hover:bg-white/[0.08] transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </motion.div>
      )}

      {/* Admin: Delete GF (if active) */}
      {isAdminAuthenticated && isGFActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2.5"
        >
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[11px] font-semibold hover:bg-white/[0.08] transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            type="button"
            onClick={onDeleteGrandFinal}
            disabled={isDeleting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-semibold hover:bg-red-500/15 transition-colors disabled:opacity-30"
          >
            {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset Grand Final
          </button>
        </motion.div>
      )}

      {/* =============================================
          4-Team Bracket + Rosters (when active)
          ============================================= */}
      <AnimatePresence mode="wait">
        {(isGFActive || isGFCompleted) && grandFinalData ? (
          <motion.div
            key="bracket"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
            className="space-y-5"
          >
            {/* Semifinals Header */}
            <div className="flex items-center gap-2.5 px-1">
              <Swords className={`w-4.5 h-4.5 ${accent.text}`} />
              <h3 className="text-[14px] font-bold text-white/90 tracking-tight">Bracket Pertandingan</h3>
            </div>

            {/* Semifinal 1 */}
            {semiMatches[0] && (
              <GFMatchCard
                match={semiMatches[0]}
                allTeams={allTeams}
                semiLabel={`Semifinal 1`}
                isAdmin={isAdminAuthenticated}
                onUpdateScore={onUpdateScore}
                isUpdating={isUpdatingScore}
              />
            )}

            {/* Semifinal 2 */}
            {semiMatches[1] && (
              <GFMatchCard
                match={semiMatches[1]}
                allTeams={allTeams}
                semiLabel={`Semifinal 2`}
                isAdmin={isAdminAuthenticated}
                onUpdateScore={onUpdateScore}
                isUpdating={isUpdatingScore}
              />
            )}

            {/* Arrow connecting semis to final */}
            {!isGFCompleted && semiMatches.every(m => m.status === 'completed') && finalMatch && (
              <motion.div
                className="flex items-center justify-center gap-2 py-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <ArrowRight className={`w-4 h-4 ${accent.text} animate-pulse`} />
                <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Menuju Final</span>
                <ArrowRight className={`w-4 h-4 ${accent.text} animate-pulse`} />
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </motion.div>
            )}

            {/* Final Match */}
            {finalMatch && (
              <div className="relative">
                {isGFCompleted && (
                  <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r from-amber-500/20 via-yellow-500/10 to-amber-500/20 blur-sm -z-10" />
                )}
                <GFMatchCard
                  match={finalMatch}
                  allTeams={allTeams}
                  semiLabel={isGFCompleted ? 'FINAL — Selesai' : 'FINAL'}
                  isAdmin={isAdminAuthenticated}
                  onUpdateScore={onUpdateScore}
                  isUpdating={isUpdatingScore}
                />
              </div>
            )}

            {/* Team Rosters Grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2.5 px-1 mb-3.5">
                <Users className={`w-4.5 h-4.5 ${accent.text}`} />
                <h3 className="text-[14px] font-bold text-white/90 tracking-tight">Tim Grand Final</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-white/30">
                  4 Tim · 12 Pemain
                </span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                {allTeams.map((team) => {
                  const isTeamWinner = champion?.id === team.id;
                  const isTeamEliminated = eliminatedTeamIds.has(team.id);

                  // Determine match result for this team
                  let matchResult: 'win' | 'loss' | null = null;
                  if (isTeamWinner) matchResult = null;
                  else if (isTeamEliminated) matchResult = 'loss';
                  else {
                    // Check if team won a semi
                    for (const semi of semiMatches) {
                      if (semi.status === 'completed' && semi.winnerId === team.id) matchResult = 'win';
                    }
                  }

                  return (
                    <TeamCard
                      key={team.id}
                      team={team}
                      colorIndex={team.seed - 1}
                      isWinner={isTeamWinner}
                      isEliminated={isTeamEliminated}
                      division={division}
                      matchResult={matchResult}
                    />
                  );
                })}
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          /* =============================================
              Pre-Grand Final: Qualified Players Preview
              ============================================= */
          <motion.div
            key="preview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-5"
          >
            {/* Status Badge */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
            >
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full glass-subtle">
                <div className="relative flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${division === 'male' ? 'bg-amber-400' : 'bg-violet-400'} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${division === 'male' ? 'bg-amber-400' : 'bg-violet-400'}`} />
                </div>
                <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-white/50">
                  {hasEnoughPlayers
                    ? 'SIAP UNTUK GRAND FINAL'
                    : `${Math.max(0, 12 - qualifiedPlayers.length)} LAGI UNTUK LOLOS`}
                </span>
              </div>
            </motion.div>

            {/* Qualified Players Grid */}
            <div>
              <div className="flex items-center gap-2.5 px-1 mb-3.5">
                <Sparkles className={`w-4.5 h-4.5 ${accent.text}`} />
                <h3 className="text-[14px] font-bold text-white/90 tracking-tight">Pemain yang Lolos</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/[0.06] text-white/30">
                  Top {qualifiedPlayers.length}/12
                </span>
              </div>

              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5"
              >
                {qualifiedPlayers.map((player, index) => (
                  <motion.div
                    key={player.id}
                    variants={itemVariants}
                    className="glass rounded-2xl p-3 card-3d"
                    whileHover={{ scale: 1.03, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={accent.ring}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {player.avatar ? (
                            <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-bold text-white/70">{player.name.charAt(0)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white/90 truncate">{player.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`tier-badge ${getTierClass(player.tier)}`} style={{ fontSize: '9px', padding: '0 4px' }}>{player.tier}</span>
                          <span className="text-[10px] text-white/30 tabular-nums">{player.points.toLocaleString()} pts</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </div>

            {/* Snake Draft Preview */}
            {hasEnoughPlayers && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="glass rounded-2xl p-4 sm:p-5"
              >
                <div className="flex items-center gap-2.5 mb-3 px-0.5">
                  <Users className={`w-4 h-4 ${accent.text}`} />
                  <h3 className="text-[13px] font-bold text-white/80 tracking-tight">Preview Pembagian Tim</h3>
                  <span className="text-[10px] text-white/25 font-medium">(Snake Draft)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(teamIdx => {
                    const color = TEAM_COLORS[teamIdx];
                    // Snake draft: round1 [0,1,2,3] round2 [3,2,1,0] round3 [0,1,2,3]
                    const indices: number[] = [];
                    for (let round = 0; round < 3; round++) {
                      if (round % 2 === 0) {
                        indices.push(teamIdx + round * 4);
                      } else {
                        indices.push((3 - teamIdx) + round * 4);
                      }
                    }
                    const teamPlayers = indices.filter(i => i < qualifiedPlayers.length).map(i => qualifiedPlayers[i]);

                    return (
                      <div key={teamIdx} className={`rounded-xl p-2.5 ${color.bgSubtle} border ${color.border}`}>
                        <div className="flex items-center gap-1.5 mb-2">
                          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${color.bg} flex items-center justify-center`}>
                            <Shield className="w-3 h-3 text-white" />
                          </div>
                          <span className={`text-[11px] font-bold ${color.text}`}>{['Alpha', 'Beta', 'Gamma', 'Delta'][teamIdx]}</span>
                        </div>
                        <div className="space-y-1.5">
                          {teamPlayers.map((p, i) => (
                            <div key={p.id} className="flex items-center gap-1.5">
                              <span className="text-[10px] text-white/50 tabular-nums w-3">#{indices[i] + 1}</span>
                              <span className="text-[10px] text-white/70 font-medium truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* =============================================
          Point Distribution
          ============================================= */}
      <motion.div
        className="glass rounded-2xl p-4 sm:p-5"
        initial={{ opacity: 0, y: 22 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="flex items-center gap-2.5 mb-4 px-0.5">
          <Star className={`w-4 h-4 ${accent.text}`} />
          <h3 className="text-[14px] font-bold text-white/90 tracking-tight">Distribusi Poin</h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400/20 to-orange-500/20">
                <Crown className="w-6 h-6 text-amber-400" />
              </div>
            }
            label="Juara"
            points="+500"
            division={division}
            index={0}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-200/15 to-gray-400/15">
                <Medal className="w-6 h-6 text-gray-300" />
              </div>
            }
            label="Runner-up"
            points="+350"
            division={division}
            index={1}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-orange-400/15 to-orange-600/15">
                <Medal className="w-6 h-6 text-orange-400" />
              </div>
            }
            label="Peringkat 3"
            points="+200"
            division={division}
            index={2}
          />
          <PointCard
            icon={
              <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br from-amber-400/15 to-yellow-400/15">
                <Zap className="w-6 h-6 text-amber-300" />
              </div>
            }
            label="MVP"
            points="+25"
            division={division}
            index={3}
          />
        </div>
      </motion.div>

      {/* =============================================
          Info Banner
          ============================================= */}
      <motion.div
        className={`rounded-2xl p-4.5 relative overflow-hidden ${
          division === 'male'
            ? 'bg-gradient-to-r from-amber-500/[0.08] via-orange-500/[0.03] to-transparent border border-amber-500/[0.08]'
            : 'bg-gradient-to-r from-violet-500/[0.08] via-purple-500/[0.03] to-transparent border border-violet-500/[0.08]'
        }`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, duration: 0.4 }}
      >
        <div className="flex items-center gap-4 relative z-10">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              division === 'male' ? 'bg-amber-500/10' : 'bg-violet-500/10'
            }`}
          >
            <Flame className={`w-5 h-5 ${accent.text}`} />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-white/90 tracking-tight">4 Tim · 12 Pemain · 3 Pertandingan</p>
            <p className="text-[11px] text-white/45 mt-0.5 leading-relaxed">
              {isGFActive
                ? 'Semifinal dan Final sedang berlangsung'
                : isGFCompleted
                  ? 'Grand Final telah selesai! Selamat untuk para pemenang'
                  : 'Top 12 pemain akan dibagi menjadi 4 tim, bertanding di Semifinal dan Final'
              }
            </p>
          </div>
          <ChevronRight className={`w-4 h-4 ${accent.text} opacity-30 flex-shrink-0`} />
        </div>
      </motion.div>
    </div>
  );
}
