'use client';

import { motion } from 'framer-motion';
import {
  Trophy,
  Crown,
  Swords,
  ChevronRight,
  ChevronDown,
  Minus,
  Plus,
  Shield,
  Zap,
  Check,
  Play,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { useMemo, useState, useCallback } from 'react';
import { ZoomPanWrapper } from '@/components/ui/zoom-pan-wrapper';

/* ================================================================
   Interfaces (unchanged)
   ================================================================ */

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId?: string | null;
  teamBId?: string | null;
  teamA: {
    id: string;
    name: string;
    seed?: number;
    members: { user: { id?: string; name: string; tier: string; avatar?: string } }[];
  } | null;
  teamB: {
    id: string;
    name: string;
    seed?: number;
    members: { user: { id?: string; name: string; tier: string; avatar?: string } }[];
  } | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId?: string | null;
  status: string;
  bracket: string;
}

interface BracketProps {
  division: 'male' | 'female';
  matches: Match[];
  isAdmin?: boolean;
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  bracketType?: string | null;
  mvpUser?: { id: string; name: string; avatar: string | null; tier: string; points: number } | null;
}

/* ================================================================
   Animation Variants
   ================================================================ */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] },
  },
};

/* ================================================================
   MPL Cosmic Color Palette
   ================================================================ */

const COLORS = {
  male: {
    accent: '#FFD60A',
    accentLight: '#FFED4A',
    accentDim: 'rgba(255,214,10,0.12)',
    accentGlow: 'rgba(255,214,10,0.08)',
    accentText: '#FFD60A',
    bg: 'rgba(255,214,10,0.06)',
    border: 'rgba(255,214,10,0.15)',
    line: 'rgba(96, 165, 250, 0.3)',
    lineFaint: 'rgba(96, 165, 250, 0.12)',
    neon: 'rgba(96, 165, 250, 0.2)',
    neonBright: 'rgba(96, 165, 250, 0.4)',
    cardBorder: 'rgba(96, 165, 250, 0.15)',
    cardBg: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
  },
  female: {
    accent: '#A78BFA',
    accentLight: '#C4B5FD',
    accentDim: 'rgba(167,139,250,0.12)',
    accentGlow: 'rgba(167,139,250,0.08)',
    accentText: '#A78BFA',
    bg: 'rgba(167,139,250,0.06)',
    border: 'rgba(167,139,250,0.15)',
    line: 'rgba(96, 165, 250, 0.3)',
    lineFaint: 'rgba(96, 165, 250, 0.12)',
    neon: 'rgba(96, 165, 250, 0.2)',
    neonBright: 'rgba(96, 165, 250, 0.4)',
    cardBorder: 'rgba(96, 165, 250, 0.15)',
    cardBg: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
  },
};

function getC(division: 'male' | 'female') {
  return COLORS[division];
}

/* ================================================================
   Helper Functions
   ================================================================ */

function getRoundLabel(round: number, totalRounds: number, bracketLabel?: string): string {
  const prefix = bracketLabel ? `${bracketLabel} ` : '';
  if (totalRounds <= 1) return `${prefix}FINAL`;
  if (round === totalRounds) return `${prefix}FINAL`;
  if (round === totalRounds - 1) return `${prefix}SEMIFINAL`;
  if (round === totalRounds - 2) return `${prefix}PEREMPAT FINAL`;
  return `${prefix}RONDE ${round}`;
}

function getTierClass(tier: string): string {
  if (tier === 'S') return 'tier-s';
  if (tier === 'A') return 'tier-a';
  return 'tier-b';
}

function getTeamTier(team: Match['teamA']): string {
  return team?.members?.[0]?.user?.tier || 'B';
}

function getTeamAvatar(team: Match['teamA']): string | null {
  return team?.members?.[0]?.user?.avatar || null;
}

function groupByRound(matches: Match[]): { rounds: Record<number, Match[]>; sortedKeys: number[]; maxRound: number } {
  const grouped: Record<number, Match[]> = {};
  matches.forEach((m) => {
    if (!grouped[m.round]) grouped[m.round] = [];
    grouped[m.round].push(m);
  });
  Object.values(grouped).forEach((arr) => arr.sort((a, b) => a.matchNumber - b.matchNumber));
  const keys = Object.keys(grouped).map(Number).sort((a, b) => a - b);
  const max = Math.max(...keys, 0);
  return { rounds: grouped, sortedKeys: keys, maxRound: max };
}

/* ================================================================
   Status Badge (Cosmic - red LIVE, blue WIN)
   ================================================================ */

function StatusBadge({ status, isFinal, isEditing, division }: {
  status: string;
  isFinal: boolean;
  isEditing: boolean;
  division: 'male' | 'female';
}) {
  // LIVE - red pulsing badge
  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <span className="relative flex h-1.5 w-1.5">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: '#EF4444' }}
          />
          <span
            className="relative inline-flex rounded-full h-1.5 w-1.5"
            style={{ backgroundColor: '#EF4444' }}
          />
        </span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-red-400">
          LIVE
        </span>
      </div>
    );
  }

  // COMPLETED with winner → WIN badge (light blue)
  if (status === 'completed' && !isFinal) {
    return (
      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-400/15 text-blue-300 ring-1 ring-blue-400/20">
        FINISHED
      </span>
    );
  }

  if (status === 'completed') {
    return (
      <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/25 ring-1 ring-white/[0.06]">
        SELESAI
      </span>
    );
  }

  if (isFinal) {
    const c = getC(division);
    return (
      <span
        className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ring-1"
        style={{
          background: 'rgba(139, 92, 246, 0.15)',
          color: 'rgba(192, 132, 252, 0.9)',
          borderColor: 'rgba(139, 92, 246, 0.25)',
        }}
      >
        FINAL
      </span>
    );
  }

  return (
    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/25">
      UPCOMING
    </span>
  );
}

/* ================================================================
   MPL Team Row (with WIN label for winners)
   ================================================================ */

function MPLTeamRow({ team, isWinner, isLoser, score, division }: {
  team: Match['teamA'] | Match['teamB'];
  isWinner: boolean;
  isLoser: boolean;
  score: number | null;
  division: 'male' | 'female';
}) {
  const c = getC(division);
  const tier = getTeamTier(team);
  const avatar = getTeamAvatar(team);
  const tierClass = getTierClass(tier);

  return (
    <div
      className={`flex items-center gap-1.5 lg:gap-3 py-1.5 lg:py-2.5 px-2.5 lg:px-3 ${isWinner ? 'bracket-winner-row' : ''}`}
      style={{
        opacity: isLoser ? 0.4 : 1,
      }}
    >
      {/* Seed */}
      <span
        className="text-[10px] font-bold w-5 text-center tabular-nums"
        style={{ color: isWinner ? c.accentText : 'rgba(255,255,255,0.2)' }}
      >
        {team?.seed || '-'}
      </span>

      {/* Avatar */}
      <div className={`relative flex-shrink-0 ${isWinner ? (division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink') : ''}`}>
        <div className="w-7 h-7 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={team?.name || ''} className="w-full h-full object-cover" />
          ) : (
            <span className="text-[11px] font-bold text-white/70">{team?.name?.charAt(0) || '?'}</span>
          )}
        </div>
        {isWinner && (
          <motion.div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center"
            style={{ background: `linear-gradient(180deg, ${c.accentLight}, ${c.accent})` }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 15 }}
          >
            <Check className="w-2.5 h-2.5 text-black" />
          </motion.div>
        )}
      </div>

      {/* Team name + tier */}
      <div className="flex-1 min-w-0">
        <p
          className={`truncate text-[13px] lg:text-sm font-bold ${
            isLoser ? 'line-through' : ''
          }`}
          style={{
            color: !team ? 'rgba(255,255,255,0.15)' : isWinner ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.6)',
            fontStyle: !team ? 'italic' : 'normal',
          }}
        >
          {team?.name || 'TBD'}
        </p>
        {team && <span className={`tier-badge ${tierClass} mt-0.5 inline-block`}>{tier}</span>}
      </div>

      {/* Score + WIN label */}
      <div className="flex items-center gap-1.5">
        {isWinner && score !== null && (
          <span className="text-[8px] font-bold uppercase tracking-wider text-blue-300 bg-blue-400/10 px-1.5 py-0.5 rounded">
            WIN
          </span>
        )}
        <span
          className="text-lg lg:text-2xl font-black tabular-nums min-w-[24px] lg:min-w-[36px] text-center"
          style={{
            color: score !== null
              ? isWinner ? 'rgba(96, 165, 250, 0.9)' : 'rgba(255,255,255,0.2)'
              : 'rgba(255,255,255,0.1)',
          }}
        >
          {score !== null ? score : '-'}
        </span>
      </div>
    </div>
  );
}

/* ================================================================
   MPL Match Card (Cosmic)
   ================================================================ */

function MPLMatchCard({ match, division, onUpdateScore, isFinal, bracketLabel, isAdmin }: {
  match: Match;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  isFinal: boolean;
  bracketLabel?: string;
  isAdmin?: boolean;
}) {
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isWinnerA = match.winnerId === teamA?.id;
  const isWinnerB = match.winnerId === teamB?.id;
  const isLoserA = match.status === 'completed' && match.winnerId && match.winnerId !== teamA?.id && !!teamA;
  const isLoserB = match.status === 'completed' && match.winnerId && match.winnerId !== teamB?.id && !!teamB;
  const isCompleted = match.status === 'completed';
  const isPending = match.status === 'pending';
  const hasBothTeams = !!teamA && !!teamB;
  const c = getC(division);
  const isGrandFinal = match.bracket === 'grand_final';

  const [editScoreA, setEditScoreA] = useState(match.scoreA ?? 0);
  const [editScoreB, setEditScoreB] = useState(match.scoreB ?? 0);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleStartMatch = useCallback(() => {
    setIsEditing(true);
    if (!match.teamAId && match.teamBId) {
      setEditScoreA(0);
      setEditScoreB(1);
    } else if (match.teamAId && !match.teamBId) {
      setEditScoreA(1);
      setEditScoreB(0);
    } else {
      setEditScoreA(match.scoreA ?? 0);
      setEditScoreB(match.scoreB ?? 0);
    }
  }, [match.scoreA, match.scoreB, match.teamAId, match.teamBId]);

  const handleSave = useCallback(async () => {
    if (editScoreA === editScoreB) return;
    setIsSaving(true);
    await onUpdateScore(match.id, editScoreA, editScoreB);
    setIsEditing(false);
    setIsSaving(false);
  }, [match.id, editScoreA, editScoreB, onUpdateScore]);

  const winnerSide = isWinnerA ? 'A' : isWinnerB ? 'B' : null;

  // Determine card CSS classes
  const cardClass = isGrandFinal
    ? 'bracket-grand-final'
    : isEditing
      ? 'bracket-match-live bracket-match-card'
      : 'bracket-match-card';

  return (
    <motion.div
      variants={itemVariants}
      whileHover={!isEditing && !isCompleted ? { scale: 1.02, transition: { duration: 0.2 } } : undefined}
      className={`relative overflow-hidden rounded-xl w-full my-2 ${cardClass}`}
    >
      {/* Editing live glow (CSS only - red) */}
      {isEditing && (
        <div
          className="absolute inset-0 rounded-xl pointer-events-none"
          style={{
            animation: 'mplCosmicLiveGlow 2s ease-in-out infinite',
          }}
        />
      )}

      {/* Match header */}
      <div
        className="flex items-center justify-between px-2.5 lg:px-3.5 py-1.5 lg:py-2"
        style={{ background: isCompleted ? 'rgba(96,165,250,0.06)' : 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex items-center gap-2">
          {bracketLabel && (
            <span
              className="text-[9px] lg:text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                background: match.bracket === 'losers' ? 'rgba(239,68,68,0.1)' :
                  match.bracket === 'grand_final' ? 'rgba(139,92,246,0.1)' :
                  'rgba(96,165,250,0.08)',
                color: match.bracket === 'losers' ? 'rgba(248,113,113,0.7)' :
                  match.bracket === 'grand_final' ? 'rgba(192,132,252,0.7)' :
                  'rgba(96,165,250,0.6)',
              }}
            >
              {bracketLabel}
            </span>
          )}
          <span className="text-[10px] lg:text-[9px] text-white/40 font-medium uppercase tracking-wider">
            Game #{match.matchNumber}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* B05 notation for Grand Final */}
          {isGrandFinal && (
            <span
              className="text-[9px] lg:text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
              style={{
                background: 'rgba(139,92,246,0.15)',
                color: 'rgba(192,132,252,0.8)',
              }}
            >
              B05
            </span>
          )}
          <StatusBadge status={match.status} isFinal={isFinal} isEditing={isEditing} division={division} />
        </div>
      </div>

      {/* Match body */}
      <div className="relative px-0.5">
        {/* Winner indicator line */}
        {isCompleted && winnerSide && (
          <div
            className="absolute top-0 bottom-0 w-0.5"
            style={{
              left: winnerSide === 'A' ? '2px' : undefined,
              right: winnerSide === 'B' ? '2px' : undefined,
              background: 'rgba(96, 165, 250, 0.4)',
              opacity: 0.5,
              boxShadow: '0 0 6px rgba(96, 165, 250, 0.2)',
            }}
          />
        )}

        {isEditing ? (
          <div className="py-0.5">
            {/* Team A edit row */}
            <div className="flex items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-1 lg:py-2">
              <span className="text-[10px] font-bold w-4 text-center tabular-nums text-white/30">
                {teamA?.seed || '-'}
              </span>
              <div className={`flex-shrink-0 ${division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink'}`}>
                <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                  {getTeamAvatar(teamA) ? (
                    <img src={getTeamAvatar(teamA)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] lg:text-[11px] font-bold text-white/70">{teamA?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] lg:text-sm font-semibold text-white/90 truncate">{teamA?.name || 'TBD'}</p>
                <span className={`tier-badge ${getTierClass(getTeamTier(teamA))} mt-0.5 inline-block`}>{getTeamTier(teamA)}</span>
              </div>
              {/* Score stepper A */}
              <div
                className="flex items-center gap-0.5 lg:gap-1.5 p-0.5 lg:p-1.5 rounded-lg lg:rounded-xl backdrop-blur-sm"
                style={{
                  background: c.accentDim,
                  border: `1px solid ${c.border}`,
                }}
              >
                <button
                  onClick={() => setEditScoreA(Math.max(0, editScoreA - 1))}
                  className="w-9 h-9 lg:w-9 lg:h-10 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 lg:w-3 lg:h-3 text-white/50" />
                </button>
                <span
                  className="w-7 lg:w-12 text-center text-lg lg:text-3xl font-black tabular-nums"
                  style={{ color: c.accentText }}
                >
                  {editScoreA}
                </span>
                <button
                  onClick={() => setEditScoreA(editScoreA + 1)}
                  className="w-9 h-9 lg:w-9 lg:h-10 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 lg:w-3 lg:h-3 text-white/50" />
                </button>
              </div>
            </div>

            {/* VS divider */}
            <div className="flex items-center gap-1.5 px-2 lg:px-3">
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.line}, transparent)` }} />
              <div
                className="w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center"
                style={{ background: c.accentDim, border: `1px solid ${c.border}` }}
              >
                <span className="text-[9px] font-black tracking-[0.2em]" style={{ color: c.accentText, opacity: 0.5 }}>VS</span>
              </div>
              <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${c.line}, transparent)` }} />
            </div>

            {/* Team B edit row */}
            <div className="flex items-center gap-1.5 lg:gap-3 px-2 lg:px-3 py-1 lg:py-2">
              <span className="text-[10px] font-bold w-4 text-center tabular-nums text-white/30">
                {teamB?.seed || '-'}
              </span>
              <div className={`flex-shrink-0 ${division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink'}`}>
                <div className="w-6 h-6 lg:w-9 lg:h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                  {getTeamAvatar(teamB) ? (
                    <img src={getTeamAvatar(teamB)!} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] lg:text-[11px] font-bold text-white/70">{teamB?.name?.charAt(0) || '?'}</span>
                  )}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] lg:text-sm font-semibold text-white/90 truncate">{teamB?.name || 'TBD'}</p>
                <span className={`tier-badge ${getTierClass(getTeamTier(teamB))} mt-0.5 inline-block`}>{getTeamTier(teamB)}</span>
              </div>
              {/* Score stepper B */}
              <div
                className="flex items-center gap-0.5 lg:gap-1.5 p-0.5 lg:p-1.5 rounded-lg lg:rounded-xl backdrop-blur-sm"
                style={{
                  background: c.accentDim,
                  border: `1px solid ${c.border}`,
                }}
              >
                <button
                  onClick={() => setEditScoreB(Math.max(0, editScoreB - 1))}
                  className="w-9 h-9 lg:w-9 lg:h-10 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 lg:w-3 lg:h-3 text-white/50" />
                </button>
                <span
                  className="w-7 lg:w-12 text-center text-lg lg:text-3xl font-black tabular-nums"
                  style={{ color: c.accentText }}
                >
                  {editScoreB}
                </span>
                <button
                  onClick={() => setEditScoreB(editScoreB + 1)}
                  className="w-9 h-9 lg:w-9 lg:h-10 rounded-lg lg:rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 lg:w-3 lg:h-3 text-white/50" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <MPLTeamRow team={teamA} isWinner={isWinnerA} isLoser={isLoserA} score={match.scoreA} division={division} />
            {/* VS / FT divider */}
            <div className="flex items-center justify-center py-0.5 lg:py-1.5">
              <div className="flex-1 h-px" style={{
                background: isCompleted
                  ? `linear-gradient(90deg, transparent, ${c.lineFaint}, transparent)`
                  : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
              }} />
              {isCompleted ? (
                <div className="px-2.5 py-0.5 rounded-full bg-blue-400/10 ring-1 ring-blue-400/15">
                  <span className="text-[8px] font-bold text-blue-300/60 uppercase tracking-[0.2em]">FT</span>
                </div>
              ) : (
                <Swords className="w-3 h-3 mx-2 text-white/[0.08]" />
              )}
              <div className="flex-1 h-px" style={{
                background: isCompleted
                  ? `linear-gradient(90deg, transparent, ${c.lineFaint}, transparent)`
                  : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
              }} />
            </div>
            <MPLTeamRow team={teamB} isWinner={isWinnerB} isLoser={isLoserB} score={match.scoreB} division={division} />
          </>
        )}
      </div>

      {/* Action button — admin only */}
      {isAdmin && (
      <div className="px-2.5 lg:px-4 pb-2.5 lg:pb-3 pt-1 lg:pt-1.5">
        {isPending && hasBothTeams && (
          <motion.button
            onClick={handleStartMatch}
            className="w-full py-2.5 lg:py-2 rounded-xl text-[12px] lg:text-[12px] font-bold flex items-center justify-center gap-1.5 lg:gap-2 transition-all"
            style={{
              background: c.accentDim,
              color: c.accentText,
              border: `1px solid ${c.border}`,
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = c.bg;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = c.accentDim;
            }}
          >
            <Play className="w-3.5 h-3.5 lg:w-3.5 lg:h-3.5" />
            Mulai Pertandingan
          </motion.button>
        )}

        {isPending && !hasBothTeams && (teamA || teamB) && (
          <motion.button
            onClick={handleStartMatch}
            className="w-full py-2.5 lg:py-2 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all"
            style={{
              background: c.accentDim,
              color: c.accentText,
              opacity: 0.7,
              border: `1px solid ${c.border}`,
            }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.97 }}
          >
            <Zap className="w-3.5 h-3.5" />
            Bye — Lanjutkan
          </motion.button>
        )}

        {isPending && !teamA && !teamB && (
          <div className="flex items-center justify-center gap-1.5 py-2 opacity-40">
            <Lock className="w-3 h-3" />
            <span className="text-[10px] text-white/30 font-medium">Menunggu lawan</span>
          </div>
        )}

        {isEditing && (
          <motion.button
            onClick={handleSave}
            disabled={editScoreA === editScoreB || isSaving}
            className="w-full py-2 lg:py-2.5 rounded-xl text-[12px] font-bold flex items-center justify-center gap-2 transition-all"
            style={
              editScoreA === editScoreB || isSaving
                ? { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)' }
                : { background: c.accent, color: '#000' }
            }
            whileHover={editScoreA !== editScoreB ? { scale: 1.01 } : undefined}
            whileTap={editScoreA !== editScoreB ? { scale: 0.97 } : undefined}
          >
            {isSaving ? (
              <motion.div
                className="w-3.5 h-3.5 border-2 border-black/20 border-t-black rounded-full"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 0.6 }}
              />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            {editScoreA === editScoreB ? 'Skor tidak boleh seri' : 'Simpan & Selesaikan'}
          </motion.button>
        )}

        {isCompleted && (
          <div className="flex items-center justify-center gap-2 py-0.5">
            <Check className="w-3 h-3 text-blue-400/50" />
            <span className="text-[11px] font-semibold text-blue-300/50">
              {match.winnerId === teamA?.id ? teamA?.name : teamB?.name} menang
            </span>
          </div>
        )}
      </div>
      )}
    </motion.div>
  );
}

/* ================================================================
   Round Column (Desktop)
   ================================================================ */

function MPLRoundColumn({ roundNum, maxRound, matches: roundMatches, division, onUpdateScore, bracketLabel, isAdmin }: {
  roundNum: number;
  maxRound: number;
  matches: Match[];
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  bracketLabel?: string;
  isAdmin?: boolean;
}) {
  const c = getC(division);
  const isFinal = roundNum === maxRound;
  const label = getRoundLabel(roundNum, maxRound, bracketLabel);
  const completedInRound = roundMatches.filter((m) => m.status === 'completed').length;

  return (
    <div className="flex flex-col flex-shrink-0 w-full lg:w-auto lg:max-w-[280px]">
      {/* Round label */}
      <div className="flex items-center justify-between mb-2 lg:mb-4 px-1">
        <div className="flex items-center gap-2">
          <span
            className="text-[11px] lg:text-sm font-bold tracking-[0.15em] uppercase"
            style={{ color: isFinal ? 'rgba(192,132,252,0.9)' : 'rgba(255,255,255,0.40)' }}
          >
            {label}
          </span>
          <span className="text-[10px] lg:text-[9px] text-white/20 font-medium tabular-nums">
            {completedInRound}/{roundMatches.length}
          </span>
        </div>
        {isFinal && (
          <div className="flex-1 h-px ml-3" style={{ background: `linear-gradient(90deg, ${c.line}, transparent)` }} />
        )}
      </div>
      {/* Match cards */}
      <div className="flex flex-col justify-around flex-1">
        {roundMatches.map((match) => (
          <MPLMatchCard
            key={match.id}
            match={match}
            division={division}
            onUpdateScore={onUpdateScore}
            isFinal={isFinal}
            bracketLabel={bracketLabel}
            isAdmin={isAdmin}
          />
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   Bracket Connectors (Desktop — neon blue with glow)
   ================================================================ */

function BracketConnectors({ division, prevMatchCount }: {
  division: 'male' | 'female';
  prevMatchCount: number;
}) {
  const pairCount = Math.ceil(prevMatchCount / 2);
  if (pairCount < 1) return null;

  return (
    <div className="flex flex-col justify-around flex-shrink-0" style={{ width: 40 }}>
      {Array.from({ length: pairCount }).map((_, i) => (
        <div key={i} className="relative flex-1">
          {/* Top horizontal line from match above */}
          <div
            className="absolute left-0 right-1/2 h-px bracket-connector-neon"
            style={{ top: '25%' }}
          />
          {/* Bottom horizontal line from match below */}
          <div
            className="absolute left-0 right-1/2 h-px bracket-connector-neon"
            style={{ top: '75%' }}
          />
          {/* Vertical line connecting the pair */}
          <div
            className="absolute left-1/2 w-px bracket-connector-neon-v"
            style={{ top: '25%', bottom: '25%' }}
          />
          {/* Right horizontal line to next round match */}
          <div
            className="absolute right-0 h-px bracket-connector-neon"
            style={{ top: '50%', left: '50%' }}
          />
          {/* Small dot at junction */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(96, 165, 250, 0.5)',
              boxShadow: '0 0 6px rgba(96, 165, 250, 0.3)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Bracket Connectors (Mobile — adjusted line positions)
   ================================================================ */

function MobileBracketConnectors({ division, prevMatchCount }: {
  division: 'male' | 'female';
  prevMatchCount: number;
}) {
  const pairCount = Math.ceil(prevMatchCount / 2);
  if (pairCount < 1) return null;

  return (
    <div className="flex flex-col justify-around flex-shrink-0" style={{ width: 40 }}>
      {Array.from({ length: pairCount }).map((_, i) => (
        <div key={i} className="relative flex-1">
          {/* Top horizontal line from match above */}
          <div
            className="absolute left-0 right-1/2 h-px bracket-connector-neon"
            style={{ top: '25%' }}
          />
          {/* Bottom horizontal line from match below - lowered for mobile */}
          <div
            className="absolute left-0 right-1/2 h-px bracket-connector-neon"
            style={{ top: '82%' }}
          />
          {/* Vertical line connecting the pair - adjusted for mobile */}
          <div
            className="absolute left-1/2 w-px bracket-connector-neon-v"
            style={{ top: '25%', bottom: '18%' }}
          />
          {/* Right horizontal line to next round match */}
          <div
            className="absolute right-0 h-px bracket-connector-neon"
            style={{ top: '50%', left: '50%' }}
          />
          {/* Small dot at junction */}
          <div
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(96, 165, 250, 0.5)',
              boxShadow: '0 0 6px rgba(96, 165, 250, 0.3)',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/* ================================================================
   Mobile Round Connector (simple chevron)
   ================================================================ */

function MobileRoundConnector({ division, label }: { division: 'male' | 'female'; label?: string }) {
  const c = getC(division);
  return (
    <div className="flex lg:hidden items-center gap-2 py-2 px-3">
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.lineFaint}, ${c.line})` }} />
      <div
        className="flex items-center gap-1 px-2.5 py-0.5 rounded-full flex-shrink-0"
        style={{
          background: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
          border: '1px solid rgba(96, 165, 250, 0.12)',
          boxShadow: '0 0 8px rgba(96, 165, 250, 0.08)',
        }}
      >
        <ChevronDown className="w-2.5 h-2.5" style={{ color: 'rgba(96, 165, 250, 0.6)' }} />
        {label && (
          <span className="text-[8px] font-bold uppercase tracking-[0.15em]" style={{ color: 'rgba(96, 165, 250, 0.6)' }}>
            {label}
          </span>
        )}
      </div>
      <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.line}, ${c.lineFaint})` }} />
    </div>
  );
}

/* ================================================================
   Desktop Connector to Champion (arrow → champion)
   ================================================================ */

function ChampionConnector({ division }: { division: 'male' | 'female' }) {
  return (
    <div className="flex flex-col justify-center flex-shrink-0" style={{ width: 40 }}>
      <div className="relative flex-1 flex items-center">
        <div className="absolute left-0 right-0 h-px bracket-connector-neon" />
        <div
          className="relative z-10 w-8 h-8 rounded-full flex items-center justify-center mx-auto"
          style={{
            background: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
            border: '1px solid rgba(96, 165, 250, 0.15)',
            boxShadow: '0 0 8px rgba(96, 165, 250, 0.1)',
          }}
        >
          <ChevronRight className="w-4 h-4" style={{ color: 'rgba(96, 165, 250, 0.6)' }} />
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Champion Slot (Cosmic)
   ================================================================ */

function MPLChampionSlot({ winnerTeam, division, mvpUser }: {
  winnerTeam: Match['teamA'] | null;
  division: 'male' | 'female';
  mvpUser?: BracketProps['mvpUser'];
}) {
  const c = getC(division);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Mobile connector */}
      <MobileRoundConnector division={division} label="Champion" />

      {/* Champion label */}
      <div className="flex items-center gap-2 mb-2 px-0.5">
        <span
          className="text-[11px] font-bold tracking-[0.2em] uppercase"
          style={{ color: 'rgba(96, 165, 250, 0.7)' }}
        >
          JUARA
        </span>
        <div className="flex-1 h-px" style={{ background: `linear-gradient(90deg, ${c.line}, transparent)` }} />
      </div>

      {/* Champion card with cosmic glow animation */}
      <div
        className="rounded-2xl p-3.5 lg:p-10 flex flex-col items-center justify-center min-h-[130px] lg:min-h-[280px] relative overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
          border: '1px solid rgba(96, 165, 250, 0.15)',
          animation: 'mplCosmicChampionGlow 3s ease-in-out infinite',
        }}
      >
        {/* Star particles behind champion */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            backgroundImage: [
              'radial-gradient(1px 1px at 15% 25%, rgba(255,255,255,0.4) 50%, transparent 100%)',
              'radial-gradient(1px 1px at 85% 75%, rgba(255,255,255,0.3) 50%, transparent 100%)',
              'radial-gradient(1.5px 1.5px at 50% 50%, rgba(96,165,250,0.3) 50%, transparent 100%)',
              'radial-gradient(1px 1px at 30% 80%, rgba(255,255,255,0.2) 50%, transparent 100%)',
              'radial-gradient(1px 1px at 70% 20%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            ].join(', '),
          }}
        />

        {winnerTeam ? (
          <div className="relative z-10 text-center">
            <div className="mb-3">
              <div className="relative inline-block">
                <Crown
                  className="w-10 h-10 lg:w-16 lg:h-16 mx-auto"
                  style={{
                    color: c.accentText,
                    filter: `drop-shadow(0 0 20px ${c.accentGlow})`,
                  }}
                />
                <div className="absolute -inset-3 rounded-full blur-xl opacity-20" style={{ background: c.accent }} />
              </div>
            </div>
            <div className={`${division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink'} mx-auto w-fit`}>
              <div className="w-14 h-14 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                {getTeamAvatar(winnerTeam) ? (
                  <img src={getTeamAvatar(winnerTeam)!} alt={winnerTeam.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg font-bold text-white/70">{winnerTeam.name.charAt(0)}</span>
                )}
              </div>
            </div>
            <p className="text-base lg:text-2xl font-extrabold text-white/90 mt-3 tracking-tight">{winnerTeam.name}</p>
            <div
              className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full"
              style={{ background: c.accentDim, border: `1px solid ${c.border}` }}
            >
              <Crown className="w-3 h-3" style={{ color: c.accentText }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>
                JUARA TURNAMEN
              </span>
            </div>
          </div>
        ) : (
          <div className="relative z-10 text-center">
            <div className="mb-3">
              <Crown className="w-10 h-10 lg:w-16 lg:h-16 mx-auto text-white/15" />
            </div>
            <p className="text-sm lg:text-base text-white/30 font-medium mt-3">Menunggu Juara</p>
            <p className="text-xs text-white/15 mt-1">Selesaikan final untuk menobatkan pemenang</p>
          </div>
        )}
      </div>

      {/* MVP Card */}
      {mvpUser && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <MobileRoundConnector division={division} label="MVP" />
          <div
            className="rounded-2xl p-4 lg:p-6"
            style={{
              background: 'linear-gradient(135deg, rgba(96,165,250,0.06), transparent)',
              border: '1px solid rgba(96, 165, 250, 0.1)',
            }}
          >
            <div className="flex items-center gap-3">
              <div className="relative flex-shrink-0">
                <Crown
                  className="w-7 h-7 lg:w-10 lg:h-10"
                  style={{
                    color: c.accentText,
                    filter: `drop-shadow(0 0 10px ${c.accentGlow})`,
                  }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/30">
                  Most Valuable Player
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {mvpUser.avatar ? (
                      <img src={mvpUser.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-white/70">{mvpUser.name.charAt(0)}</span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-white/90 truncate">{mvpUser.name}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-lg font-black tabular-nums" style={{ color: c.accentText }}>
                  {mvpUser.points}
                </p>
                <p className="text-[9px] text-white/40 font-medium">points</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ================================================================
   Group Standings
   ================================================================ */

interface StandingRow {
  teamId: string;
  teamName: string;
  avatar: string | null;
  tier: string;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  pointDiff: number;
}

function computeGroupStandings(groupMatches: Match[]): StandingRow[] {
  const teamMap = new Map<string, StandingRow>();

  for (const match of groupMatches) {
    if (match.teamAId && !teamMap.has(match.teamAId)) {
      teamMap.set(match.teamAId, {
        teamId: match.teamAId,
        teamName: match.teamA?.name || 'TBD',
        avatar: getTeamAvatar(match.teamA),
        tier: getTeamTier(match.teamA),
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }
    if (match.teamBId && !teamMap.has(match.teamBId)) {
      teamMap.set(match.teamBId, {
        teamId: match.teamBId,
        teamName: match.teamB?.name || 'TBD',
        avatar: getTeamAvatar(match.teamB),
        tier: getTeamTier(match.teamB),
        wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDiff: 0,
      });
    }

    if (match.status === 'completed' && match.winnerId && match.teamAId && match.teamBId) {
      const sA = match.scoreA ?? 0;
      const sB = match.scoreB ?? 0;
      const a = teamMap.get(match.teamAId)!;
      const b = teamMap.get(match.teamBId)!;

      a.pointsFor += sA; a.pointsAgainst += sB;
      b.pointsFor += sB; b.pointsAgainst += sA;

      if (match.winnerId === match.teamAId) { a.wins++; b.losses++; }
      else { b.wins++; a.losses++; }
    }
  }

  for (const s of teamMap.values()) s.pointDiff = s.pointsFor - s.pointsAgainst;

  return Array.from(teamMap.values()).sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    if (b.pointDiff !== a.pointDiff) return b.pointDiff - a.pointDiff;
    if (b.pointsFor !== a.pointsFor) return b.pointsFor - a.pointsFor;
    return 0;
  });
}

function GroupStandingsTable({ standings, division, groupName }: {
  standings: StandingRow[];
  division: 'male' | 'female';
  groupName: string;
}) {
  const c = getC(division);
  const qualifiedCount = Math.min(2, standings.length);

  return (
    <motion.div
      variants={itemVariants}
      className="rounded-xl overflow-hidden bracket-match-card"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(96,165,250,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: 'rgba(96,165,250,0.6)' }} />
          <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/60">{groupName}</span>
        </div>
        <span className="text-[9px] text-white/25 font-medium">Top {qualifiedCount} Lolos</span>
      </div>

      {/* Table */}
      <div className="px-3 pb-3">
        <div className="grid grid-cols-[24px_1fr_40px_40px_48px] gap-1 text-[10px] font-bold uppercase tracking-wider text-white/25 px-2 py-2 border-b border-white/[0.04]">
          <span>#</span>
          <span>Tim</span>
          <span className="text-center">M</span>
          <span className="text-center">+/-</span>
          <span className="text-center">Pts</span>
        </div>
        <div className="space-y-0.5 mt-1">
          {standings.map((s, idx) => {
            const isQualified = idx < qualifiedCount;
            return (
              <div
                key={s.teamId}
                className="grid grid-cols-[24px_1fr_40px_40px_48px] gap-1 items-center px-2 py-2 rounded-lg transition-colors"
                style={{
                  background: isQualified ? c.accentDim : 'rgba(255,255,255,0.02)',
                }}
              >
                <span
                  className="text-[11px] font-black tabular-nums"
                  style={{ color: isQualified ? c.accentText : 'rgba(255,255,255,0.2)' }}
                >
                  {idx + 1}
                </span>
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`w-6 h-6 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0 ${isQualified ? (division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink') : ''}`}
                  >
                    {s.avatar ? (
                      <img src={s.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[9px] font-bold text-white/60">{s.teamName.charAt(0)}</span>
                    )}
                  </div>
                  <span
                    className="truncate text-[12px] font-semibold"
                    style={{ color: isQualified ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.35)' }}
                  >
                    {s.teamName}
                  </span>
                  {isQualified && <Check className="w-3 h-3 flex-shrink-0 text-emerald-400/60" />}
                </div>
                <span className="text-[11px] font-medium text-white/40 tabular-nums text-center">
                  {s.wins}-{s.losses}
                </span>
                <span
                  className="text-[11px] font-bold tabular-nums text-center"
                  style={{
                    color: s.pointDiff > 0 ? 'rgba(52,211,153,0.7)' : s.pointDiff < 0 ? 'rgba(248,113,113,0.5)' : 'rgba(255,255,255,0.25)',
                  }}
                >
                  {s.pointDiff > 0 ? '+' : ''}{s.pointDiff}
                </span>
                <span className="text-[11px] font-semibold text-white/50 tabular-nums text-center">
                  {s.pointsFor}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Bracket Section Header (Cosmic)
   ================================================================ */

function BracketSectionHeader({ icon: Icon, title, subtitle, division, color }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  division: 'male' | 'female';
  color: 'gold' | 'red' | 'purple' | 'default';
}) {
  const sectionClass = color === 'gold'
    ? 'bracket-section-upper'
    : color === 'red'
      ? 'bracket-section-lower'
      : color === 'purple'
        ? 'bracket-section-grand'
        : '';

  const iconColor = color === 'gold'
    ? 'rgba(96,165,250,0.7)'
    : color === 'red'
      ? 'rgba(248,113,113,0.7)'
      : color === 'purple'
        ? 'rgba(192,132,252,0.7)'
        : 'rgba(255,255,255,0.4)';

  return (
    <div
      className={`rounded-xl p-4 ${sectionClass || 'bg-white/[0.02]'}`}
      style={{
        background: sectionClass ? undefined : 'rgba(255,255,255,0.02)',
        border: sectionClass ? undefined : '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{
            background: color === 'gold'
              ? 'rgba(96,165,250,0.1)'
              : color === 'red'
                ? 'rgba(239,68,68,0.1)'
                : color === 'purple'
                  ? 'rgba(139,92,246,0.1)'
                  : 'rgba(255,255,255,0.05)',
          }}
        >
          <Icon className="w-5 h-5" style={{ color: iconColor }} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white/90 tracking-tight">{title}</h3>
          <p className="text-[10px] text-white/35 font-medium">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   Empty State
   ================================================================ */

function EmptyBracketState({ division }: { division: 'male' | 'female' }) {
  const c = getC(division);

  return (
    <div className="space-y-4">
      <motion.div
        className={`rounded-2xl p-4 ${division === 'male' ? 'card-gold' : 'card-pink'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: c.accentDim }}>
            <Swords className="w-5 h-5" style={{ color: c.accentText }} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white/90 tracking-tight">Bracket Turnamen</h2>
            <p className="text-[11px] text-white/35 font-medium">Eliminasi Langsung</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="rounded-2xl p-6 text-center bracket-match-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center" style={{ background: c.accentDim }}>
          <Trophy className="w-7 h-7" style={{ color: c.accentText, opacity: 0.25 }} />
        </div>
        <p className="text-[13px] font-medium text-white/40">Belum ada bracket</p>
        <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
          Pergi ke tab <span className="text-white/40 font-semibold">Gabung</span> untuk mendaftarkan pemain, lalu buat bracket.
        </p>
      </motion.div>

      <motion.div
        className="rounded-2xl p-4 bracket-match-card"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <p className="text-[11px] tracking-[0.15em] uppercase text-white/40 font-semibold mb-3">Cara Kerja</p>
        <div className="space-y-3">
          {[
            { step: '1', text: 'Pemain mendaftar melalui tab Gabung' },
            { step: '2', text: 'Admin menyetujui pendaftaran & menetapkan tier' },
            { step: '3', text: 'Tim dibuat otomatis dari pemain yang disetujui' },
            { step: '4', text: 'Admin membuat bracket — pertandingan dimulai!' },
          ].map((s) => (
            <div key={s.step} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0"
                style={{ background: c.accentDim, color: c.accentText, opacity: 0.6 }}
              >
                {s.step}
              </div>
              <p className="text-[12px] text-white/35 leading-relaxed pt-0.5">{s.text}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ================================================================
   Section Title Card
   ================================================================ */

function SectionTitleCard({ icon: Icon, title, subtitle, division }: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  division: 'male' | 'female';
}) {
  const c = getC(division);
  return (
    <motion.div
      className={`rounded-xl lg:rounded-2xl p-3.5 lg:p-6 ${division === 'male' ? 'card-gold' : 'card-pink'}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="relative z-10 flex items-center gap-3 lg:gap-6">
        <div className="w-9 h-9 lg:w-14 lg:h-14 rounded-lg lg:rounded-2xl flex items-center justify-center" style={{ background: c.accentDim }}>
          <Icon className="w-4.5 h-4.5 lg:w-7 lg:h-7" style={{ color: c.accentText }} />
        </div>
        <div>
          <h2 className="text-base lg:text-xl font-bold text-white/90 tracking-tight">{title}</h2>
          <p className="text-[11px] lg:text-[13px] text-white/40 font-medium">{subtitle}</p>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================
   Desktop Horizontal Bracket Renderer
   ================================================================ */

function DesktopBracket({ sortedKeys, rounds, maxRound, division, onUpdateScore, bracketLabel, isAdmin }: {
  sortedKeys: number[];
  rounds: Record<number, Match[]>;
  maxRound: number;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  bracketLabel?: string;
  isAdmin?: boolean;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="hidden lg:flex items-stretch gap-3 overflow-x-auto pb-4"
    >
      {sortedKeys.map((roundNum, roundIndex) => (
        <MPLRoundColumn
          key={roundNum}
          roundNum={roundNum}
          maxRound={maxRound}
          matches={rounds[roundNum]}
          division={division}
          onUpdateScore={onUpdateScore}
          bracketLabel={bracketLabel}
        />
      ))}
    </motion.div>
  );
}

/* ================================================================
   Mobile Vertical Bracket Renderer
   ================================================================ */

function MobileBracket({ sortedKeys, rounds, maxRound, division, onUpdateScore, bracketLabel, isAdmin }: {
  sortedKeys: number[];
  rounds: Record<number, Match[]>;
  maxRound: number;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  bracketLabel?: string;
  isAdmin?: boolean;
}) {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="flex lg:hidden flex-col gap-1.5 lg:gap-2"
    >
      {sortedKeys.map((roundNum, roundIndex) => (
        <div key={roundNum}>
          <MPLRoundColumn
            roundNum={roundNum}
            maxRound={maxRound}
            matches={rounds[roundNum]}
            division={division}
            onUpdateScore={onUpdateScore}
            bracketLabel={bracketLabel}
          />
          {roundIndex < sortedKeys.length - 1 && <MobileRoundConnector division={division} label={getRoundLabel(roundNum, maxRound, bracketLabel)} />}
        </div>
      ))}
    </motion.div>
  );
}

/* ================================================================
   Dual Layout Bracket (Desktop horizontal + Mobile vertical)
   ================================================================ */

function DualLayoutBracket({ sortedKeys, rounds, maxRound, division, onUpdateScore, bracketLabel, isAdmin, connectors }: {
  sortedKeys: number[];
  rounds: Record<number, Match[]>;
  maxRound: number;
  division: 'male' | 'female';
  onUpdateScore: (matchId: string, scoreA: number, scoreB: number) => void;
  bracketLabel?: string;
  isAdmin?: boolean;
  connectors?: boolean;
}) {
  // Build horizontal bracket content for desktop
  const desktopContent = (
    <>
      {sortedKeys.map((roundNum, roundIndex) => {
        const roundMatches = rounds[roundNum];
        return (
          <div key={roundNum} className="flex items-stretch">
            <MPLRoundColumn
              roundNum={roundNum}
              maxRound={maxRound}
              matches={roundMatches}
              division={division}
              onUpdateScore={onUpdateScore}
              bracketLabel={bracketLabel}
            />
            {connectors && roundIndex < sortedKeys.length - 1 && (
              <BracketConnectors division={division} prevMatchCount={roundMatches.length} />
            )}
          </div>
        );
      })}
    </>
  );

  // Build horizontal bracket content for mobile (with adjusted connectors)
  const mobileContent = (
    <>
      {sortedKeys.map((roundNum, roundIndex) => {
        const roundMatches = rounds[roundNum];
        return (
          <div key={roundNum} className="flex items-stretch">
            <MPLRoundColumn
              roundNum={roundNum}
              maxRound={maxRound}
              matches={roundMatches}
              division={division}
              onUpdateScore={onUpdateScore}
              bracketLabel={bracketLabel}
            />
            {connectors && roundIndex < sortedKeys.length - 1 && (
              <MobileBracketConnectors division={division} prevMatchCount={roundMatches.length} />
            )}
          </div>
        );
      })}
    </>
  );

  return (
    <>
      {/* Desktop: native horizontal scroll */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="hidden lg:flex items-stretch gap-3 overflow-x-auto pb-4"
      >
        {desktopContent}
      </motion.div>

      {/* Mobile: Horizontal with ZoomPanWrapper */}
      <div className="lg:hidden">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="min-h-[340px]"
        >
          <ZoomPanWrapper initialScale={0.5} minScale={0.25} maxScale={1.2}>
            <div className="flex items-stretch gap-3 pb-4">
              {mobileContent}
            </div>
          </ZoomPanWrapper>
        </motion.div>
      </div>
    </>
  );
}

/* ================================================================
   Main Bracket Export
   ================================================================ */

export function Bracket({ division, matches, isAdmin, onUpdateScore, bracketType, mvpUser }: BracketProps) {
  const isDoubleElimination = bracketType === 'double';

  const bracketData = useMemo(() => {
    if (!matches || matches.length === 0) return null;

    const wrMatches = matches.filter((m) => m.bracket === 'winners');
    const lbMatches = matches.filter((m) => m.bracket === 'losers');
    const gfMatches = matches.filter((m) => m.bracket === 'grand_final');
    const groupMatches = matches.filter((m) => m.bracket === 'group');
    const playoffMatches = matches.filter((m) => m.bracket === 'playoff');

    if (!isDoubleElimination && groupMatches.length === 0 && playoffMatches.length === 0) {
      const { rounds, sortedKeys, maxRound } = groupByRound(wrMatches);
      return { mode: 'single' as const, rounds, sortedKeys, maxRound };
    }

    if (groupMatches.length > 0 || playoffMatches.length > 0) {
      const groups = groupByRound(groupMatches);
      const playoffs = groupByRound(playoffMatches);
      return { mode: 'group' as const, groups, playoffs };
    }

    if (isDoubleElimination) {
      const wr = groupByRound(wrMatches);
      const lb = groupByRound(lbMatches);
      const gf = groupByRound(gfMatches);

      let championTeam: Match['teamA'] | null = null;
      if (gf.rounds[1]?.[0]?.status === 'completed') {
        const gfMatch = gf.rounds[1][0];
        championTeam = gfMatch.winnerId === gfMatch.teamA?.id ? gfMatch.teamA : gfMatch.teamB;
      }

      return { mode: 'double' as const, wr, lb, gf, championTeam };
    }

    const all = groupByRound(matches);
    return { mode: 'single' as const, ...all };
  }, [matches, isDoubleElimination]);

  if (!matches || matches.length === 0) {
    return <EmptyBracketState division={division} />;
  }

  // ─── Single Elimination ──────────────────────────────────────
  if (bracketData && bracketData.mode === 'single') {
    const { rounds, sortedKeys, maxRound } = bracketData;

    const winnerMatch = sortedKeys.length > 0
      ? (rounds?.[maxRound] || []).find((m) => m.status === 'completed')
      : null;
    const winnerTeam = winnerMatch
      ? winnerMatch.winnerId === winnerMatch.teamA?.id ? winnerMatch.teamA : winnerMatch.teamB
      : null;

    const bracketLabel = bracketType === 'group' ? 'PLAYOFF' : undefined;

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Swords} title="Bracket Turnamen" subtitle="Eliminasi Langsung" division={division} />

        {/* Desktop horizontal bracket */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="hidden lg:flex items-stretch gap-3 overflow-x-auto pb-4"
        >
          {sortedKeys.map((roundNum, roundIndex) => {
            const roundMatches = rounds[roundNum];
            return (
              <div key={roundNum} className="flex items-stretch">
                <MPLRoundColumn
                  roundNum={roundNum}
                  maxRound={maxRound}
                  matches={roundMatches}
                  division={division}
                  onUpdateScore={onUpdateScore}
                  bracketLabel={bracketLabel}
                />
                {roundIndex < sortedKeys.length - 1 && (
                  <BracketConnectors division={division} prevMatchCount={roundMatches.length} />
                )}
              </div>
            );
          })}
          {/* Champion connector */}
          {sortedKeys.length > 0 && (
            <div className="flex items-stretch">
              <ChampionConnector division={division} />
              <div className="flex flex-col flex-shrink-0" style={{ width: 240 }}>
                <div className="flex items-center gap-2 mb-3 lg:mb-4 px-0.5">
                  <span
                    className="text-[10px] lg:text-sm font-bold tracking-[0.2em] uppercase"
                    style={{ color: 'rgba(96, 165, 250, 0.7)' }}
                  >
                    JUARA
                  </span>
                </div>
                <div className="flex flex-col justify-around flex-1">
                  <MPLChampionSlotInline winnerTeam={winnerTeam} division={division} mvpUser={mvpUser} />
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* Mobile horizontal bracket with zoom/pan */}
        <div className="lg:hidden">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="min-h-[340px]"
          >
            <ZoomPanWrapper initialScale={0.5} minScale={0.25} maxScale={1.2}>
              <div className="flex items-stretch gap-3 pb-4">
                {sortedKeys.map((roundNum, roundIndex) => {
                  const roundMatches = rounds[roundNum];
                  return (
                    <div key={roundNum} className="flex items-stretch">
                      <MPLRoundColumn
                        roundNum={roundNum}
                        maxRound={maxRound}
                        matches={roundMatches}
                        division={division}
                        onUpdateScore={onUpdateScore}
                        bracketLabel={bracketLabel}
                      />
                      {roundIndex < sortedKeys.length - 1 && (
                        <MobileBracketConnectors division={division} prevMatchCount={roundMatches.length} />
                      )}
                    </div>
                  );
                })}
                {/* Champion connector */}
                {sortedKeys.length > 0 && (
                  <div className="flex items-stretch">
                    <ChampionConnector division={division} />
                    <div className="flex flex-col flex-shrink-0" style={{ width: 220 }}>
                      <div className="flex items-center gap-2 mb-3 px-0.5">
                        <span
                          className="text-[10px] font-bold tracking-[0.2em] uppercase"
                          style={{ color: 'rgba(96, 165, 250, 0.7)' }}
                        >
                          JUARA
                        </span>
                      </div>
                      <div className="flex flex-col justify-around flex-1">
                        <MPLChampionSlotInline winnerTeam={winnerTeam} division={division} mvpUser={mvpUser} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ZoomPanWrapper>
          </motion.div>
        </div>

        <MPLChampionSlot winnerTeam={winnerTeam} division={division} mvpUser={mvpUser} />
      </div>
    );
  }

  // ─── Group + Playoff ─────────────────────────────────────────
  if (bracketData && bracketData.mode === 'group') {
    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Trophy} title="Bracket Turnamen" subtitle="Babak Grup + Playoff" division={division} />

        {/* Group rounds */}
        {bracketData.groups.sortedKeys.length > 0 && (
          <>
            <BracketSectionHeader icon={Shield} title="BABAK PENYISIHAN" subtitle="Round-robin dalam grup" division={division} color="default" />
            <DualLayoutBracket
              sortedKeys={bracketData.groups.sortedKeys}
              rounds={bracketData.groups.rounds}
              maxRound={bracketData.groups.maxRound}
              division={division}
              onUpdateScore={onUpdateScore}
              isAdmin={isAdmin}
              bracketLabel="GRUP"
              connectors={false}
            />

            {/* Standings */}
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
              {bracketData.groups.sortedKeys.map((roundNum) => {
                const groupMatches = bracketData.groups.rounds[roundNum] || [];
                const hasCompletedMatch = groupMatches.some((m) => m.status === 'completed');
                if (!hasCompletedMatch) return null;
                const standings = computeGroupStandings(groupMatches);
                const groupLabel = String.fromCharCode(64 + roundNum);
                return (
                  <GroupStandingsTable
                    key={`standing-${roundNum}`}
                    standings={standings}
                    division={division}
                    groupName={`Grup ${groupLabel}`}
                  />
                );
              })}
            </motion.div>
          </>
        )}

        {/* Playoff */}
        {bracketData.playoffs.sortedKeys.length > 0 && (
          <>
            <MobileRoundConnector division={division} label="Playoff" />
            <BracketSectionHeader icon={Zap} title="PLAYOFF" subtitle="Eliminasi langsung" division={division} color="gold" />
            <DualLayoutBracket
              sortedKeys={bracketData.playoffs.sortedKeys}
              rounds={bracketData.playoffs.rounds}
              maxRound={bracketData.playoffs.sortedKeys.length}
              division={division}
              onUpdateScore={onUpdateScore}
              isAdmin={isAdmin}
              bracketLabel="PLAYOFF"
              connectors={true}
            />
            {(() => {
              const playoffRounds = bracketData.playoffs.sortedKeys;
              const maxPlayoffRound = playoffRounds.length > 0 ? playoffRounds[playoffRounds.length - 1] : 0;
              const finalMatch = maxPlayoffRound ? (bracketData.playoffs.rounds[maxPlayoffRound] || []).find((m) => m.status === 'completed') : null;
              const championTeam = finalMatch
                ? finalMatch.winnerId === finalMatch.teamA?.id ? finalMatch.teamA : finalMatch.teamB
                : null;
              return <MPLChampionSlot winnerTeam={championTeam} division={division} mvpUser={mvpUser} />;
            })()}
          </>
        )}
      </div>
    );
  }

  // ─── Double Elimination ──────────────────────────────────────
  if (bracketData && bracketData.mode === 'double') {
    const { wr, lb, gf, championTeam } = bracketData;

    return (
      <div className="bracket-cosmic-bg rounded-2xl p-2.5 lg:p-6 space-y-3 lg:space-y-5">
        <SectionTitleCard icon={Swords} title="Bracket Turnamen" subtitle="Double Elimination" division={division} />

        {/* Winners Bracket */}
        <BracketSectionHeader icon={Trophy} title="WINNERS BRACKET" subtitle="Kalah sekali → turun ke Losers" division={division} color="gold" />
        <DualLayoutBracket
          sortedKeys={wr.sortedKeys}
          rounds={wr.rounds}
          maxRound={wr.maxRound}
          division={division}
          onUpdateScore={onUpdateScore}
          isAdmin={isAdmin}
          bracketLabel="WB"
          connectors={true}
        />

        {/* Losers Bracket */}
        <MobileRoundConnector division={division} label="Losers Bracket" />
        <BracketSectionHeader icon={AlertTriangle} title="LOSERS BRACKET" subtitle="Kalah dua kali = eliminasi" division={division} color="red" />
        <DualLayoutBracket
          sortedKeys={lb.sortedKeys}
          rounds={lb.rounds}
          maxRound={lb.maxRound}
          division={division}
          onUpdateScore={onUpdateScore}
          isAdmin={isAdmin}
          bracketLabel="LB"
          connectors={true}
        />

        {/* Grand Final */}
        {gf.sortedKeys.length > 0 && (
          <>
            <MobileRoundConnector division={division} label="Grand Final" />
            <BracketSectionHeader icon={Crown} title="GRAND FINAL" subtitle="WB Champion vs LB Champion" division={division} color="purple" />
            <DualLayoutBracket
              sortedKeys={gf.sortedKeys}
              rounds={gf.rounds}
              maxRound={gf.maxRound}
              division={division}
              onUpdateScore={onUpdateScore}
              isAdmin={isAdmin}
              bracketLabel="GF"
              connectors={false}
            />
          </>
        )}

        <MPLChampionSlot winnerTeam={championTeam} division={division} mvpUser={mvpUser} />
      </div>
    );
  }

  return <EmptyBracketState division={division} />;
}

/* ================================================================
   Inline Champion (for desktop horizontal layout end)
   ================================================================ */

function MPLChampionSlotInline({ winnerTeam, division, mvpUser }: {
  winnerTeam: Match['teamA'] | null;
  division: 'male' | 'female';
  mvpUser?: BracketProps['mvpUser'];
}) {
  const c = getC(division);

  return (
    <motion.div variants={itemVariants}>
      <div
        className="rounded-xl p-4 lg:p-6 flex flex-col items-center justify-center text-center min-h-[120px] lg:min-h-[200px]"
        style={{
          background: 'linear-gradient(180deg, rgba(14,18,32,0.95), rgba(10,12,22,0.98))',
          border: '1px solid rgba(96, 165, 250, 0.15)',
          animation: 'mplCosmicChampionGlow 3s ease-in-out infinite',
        }}
      >
        {winnerTeam ? (
          <>
            <Crown className="w-10 h-10 lg:w-12 lg:h-12 mb-2" style={{ color: c.accentText, filter: `drop-shadow(0 0 16px ${c.accentGlow})` }} />
            <div className={`${division === 'male' ? 'avatar-ring-gold' : 'avatar-ring-pink'} mx-auto w-fit mb-2`}>
              <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                {getTeamAvatar(winnerTeam) ? (
                  <img src={getTeamAvatar(winnerTeam)!} alt={winnerTeam.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-white/70">{winnerTeam.name.charAt(0)}</span>
                )}
              </div>
            </div>
            <p className="text-sm lg:text-lg font-extrabold text-white/90 tracking-tight">{winnerTeam.name}</p>
            <div
              className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-0.5 rounded-full"
              style={{ background: c.accentDim, border: `1px solid ${c.border}` }}
            >
              <Crown className="w-2.5 h-2.5" style={{ color: c.accentText }} />
              <span className="text-[9px] font-bold uppercase tracking-[0.15em]" style={{ color: c.accentText }}>JUARA</span>
            </div>
            {mvpUser && (
              <div className="mt-3 pt-3 border-t border-white/[0.06] w-full">
                <p className="text-[9px] font-bold uppercase tracking-wider text-white/30">MVP</p>
                <p className="text-xs font-bold text-white/70 mt-0.5">{mvpUser.name}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <Crown className="w-10 h-10 lg:w-12 lg:h-12 mb-2 text-white/15" />
            <p className="text-xs text-white/30 font-medium">Menunggu Juara</p>
          </>
        )}
      </div>
    </motion.div>
  );
}
