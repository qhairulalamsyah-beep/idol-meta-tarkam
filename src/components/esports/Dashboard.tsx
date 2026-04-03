'use client';

import { motion } from 'framer-motion';
import { useState, useEffect, useCallback } from 'react';
import {
  Trophy,
  Users,
  ChevronRight,
  Swords,
  UserPlus,
  Clock,
  ArrowRight,
  Crown,
  Star,
  Sparkles,
  BarChart3,
  Heart,
  Gamepad2,
  Music,
  MapPin,
  Shield,
  Gift,
} from 'lucide-react';
import { QualifiedPlayersModal } from './QualifiedPlayersModal';
import { AllRankingsModal } from './AllRankingsModal';
import { DonationModal } from './DonationModal';
import { SawerModal } from './SawerModal';

/* ─────────────────────────────────────────────
   Interfaces — preserved exactly
   ───────────────────────────────────────────── */

interface Player {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  rank: number;
  wins: number;
  losses: number;
}

interface ChampionMember {
  userId: string;
  userName: string;
  userAvatar: string | null;
  userTier: string;
  role: string;
}

interface ChampionData {
  teamName: string;
  members: ChampionMember[];
}

interface MVPData {
  userId: string;
  userName: string;
  userAvatar: string | null;
  userPoints: number;
  mvpScore: number;
}

interface DashboardProps {
  division: 'male' | 'female';
  tournament: {
    name: string;
    status: string;
    week: number;
    prizePool: number;
    participants: number;
    mode?: string;
    bpm?: string;
    lokasi?: string;
    startDate?: string | null;
  } | null;
  topPlayers: Player[];
  onRegister: () => void;
  onNavigate?: (tab: string) => void;
  onViewPlayers?: () => void;
  registeredCount?: number;
  registeredAvatars?: { name: string; avatar: string }[];
  onViewPrize?: () => void;
  onViewDonation?: () => void;
  teamsCount?: number;
  onViewTeams?: () => void;
  champion?: ChampionData | null;
  mvp?: MVPData | null;
  leaderboardTab?: 'players' | 'clubs';
  onLeaderboardTabChange?: (tab: 'players' | 'clubs') => void;
  topClubs?: Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    totalPoints: number;
    memberCount: number;
    rank: number;
  }>;
  totalDonation?: number;
  onDonate?: (amount: number, message: string, anonymous: boolean, paymentMethod: string) => void;
  totalSawer?: number;
  onSawer?: (data: {
    senderName: string;
    senderAvatar?: string;
    targetPlayerId?: string;
    targetPlayerName?: string;
    amount: number;
    message?: string;
    paymentMethod: string;
  }) => Promise<boolean>;
}

/* ─────────────────────────────────────────────
   Animation Variants — premium spring physics
   ───────────────────────────────────────────── */

const springTransition = { type: 'spring' as const, stiffness: 400, damping: 30 };

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  },
};

const staggeredItem = {
  hidden: { opacity: 0, x: -10 },
  show: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, delay: i * 0.07, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  }),
};

const rankColors = ['#FFD60A', '#C7C7CC', '#CD7F32'];

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function getStatusInfo(status: string) {
  switch (status) {
    case 'registration':
      return { cls: 'status-registration', label: 'PENDAFTARAN', desc: 'Daftar sekarang untuk bertanding!' };
    case 'ongoing':
      return { cls: 'status-live', label: '● LIVE', desc: 'Turnamen sedang berlangsung' };
    case 'completed':
      return { cls: 'status-completed', label: 'SELESAI', desc: 'Turnamen minggu ini telah berakhir' };
    default:
      return { cls: 'status-setup', label: 'PERSIAPAN', desc: 'Turnamen sedang disiapkan' };
  }
}

/* ─────────────────────────────────────────────
   useCountdown — Countdown timer to a target date
   ───────────────────────────────────────────── */

function useCountdown(targetDate: string | null | undefined) {
  const calcTimeLeft = (date: string | null | undefined) => {
    if (!date) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const target = new Date(date).getTime();
    if (isNaN(target)) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const diff = target - Date.now();
    if (diff <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
    const totalSeconds = Math.floor(diff / 1000);
    return {
      total: diff,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      expired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const target = targetDate ? new Date(targetDate).getTime() : NaN;
    if (isNaN(target)) return;

    const interval = setInterval(() => {
      setTimeLeft(calcTimeLeft(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

/* ─────────────────────────────────────────────
   useCountUp — Animated number counter (Apple-style)
   ───────────────────────────────────────────── */

function useCountUp(target: number, duration = 1200, delay = 300) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let start: number | null = null;
    let frameId: ReturnType<typeof requestAnimationFrame> | null = null;

    const timer = setTimeout(() => {
      const step = (timestamp: number) => {
        if (cancelled) return;
        if (start === null) start = timestamp;
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setValue(Math.round(eased * target));
        if (progress < 1) {
          frameId = requestAnimationFrame(step);
        }
      };
      frameId = requestAnimationFrame(step);
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [target, duration, delay]);

  return value;
}

/* ─────────────────────────────────────────────
   getGreeting — Dynamic time-based greeting
   ───────────────────────────────────────────── */

function getGreeting(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 11) return 'Selamat Pagi';
  if (h >= 11 && h < 15) return 'Selamat Siang';
  if (h >= 15 && h < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

/* ─────────────────────────────────────────────
   Dashboard Component — Premium Upgrade
   ───────────────────────────────────────────── */

export function Dashboard({
  division,
  tournament,
  topPlayers,
  onRegister,
  onNavigate,
  onViewPlayers,
  registeredCount,
  registeredAvatars,
  onViewPrize,
  teamsCount,
  onViewTeams,
  onViewDonation,
  champion,
  mvp,
  leaderboardTab = 'players',
  onLeaderboardTabChange,
  topClubs,
  totalDonation = 0,
  onDonate,
  totalSawer = 0,
  onSawer,
}: DashboardProps) {
  const isMale = division === 'male';
  const cardClass = isMale ? 'card-gold' : 'card-pink';

  /* ── Countdown timer ── */
  const shouldShowCountdown = tournament && (tournament.status === 'setup' || tournament.status === 'registration') && tournament.startDate;
  const countdown = useCountdown(shouldShowCountdown ? tournament.startDate : null);

  /* ── Tournament info tags ── */
  const infoTags = [
    tournament?.mode ? { icon: Gamepad2, label: 'Mode', value: tournament.mode } : null,
    tournament?.bpm ? { icon: Music, label: 'BPM', value: tournament.bpm } : null,
    tournament?.lokasi ? { icon: MapPin, label: 'Lokasi', value: tournament.lokasi } : null,
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; label: string; value: string }[];
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const gradientClass = isMale ? 'gradient-gold' : 'gradient-pink';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';
  const accentColor = isMale ? 'text-amber-400' : 'text-violet-400';
  const accentBg = isMale ? 'bg-amber-500/12' : 'bg-violet-500/12';
  const accentSubtleBg = isMale ? 'bg-amber-500/[0.07]' : 'bg-violet-500/[0.07]';

  const tierMap: Record<string, string> = { S: 'tier-s', A: 'tier-a', B: 'tier-b' };

  const status = tournament?.status || 'setup';
  const statusInfo = getStatusInfo(status);
  const isRegistration = status === 'registration';
  const isOngoing = status === 'ongoing';
  const hasPlayers = topPlayers.length > 0;
  const hasClubs = topClubs !== undefined && topClubs.length > 0;
  const showResults = champion || mvp;

  /* ── Qualified Players Modal State ── */
  const [qualifiedModalOpen, setQualifiedModalOpen] = useState(false);
  const qualifiedPlayers = topPlayers.slice(0, 12);

  /* ── All Rankings Modal State ── */
  const [allRankingsModalOpen, setAllRankingsModalOpen] = useState(false);

  /* ── Donation Modal State ── */
  const [donationModalOpen, setDonationModalOpen] = useState(false);

  /* ── Sawer Modal State ── */
  const [sawerModalOpen, setSawerModalOpen] = useState(false);

  /* ── Deterministic gradient for club letter avatar ── */
  const clubGradients = [
    'linear-gradient(135deg, #FF6B6B, #EE5A24)',
    'linear-gradient(135deg, #A29BFE, #6C5CE7)',
    'linear-gradient(135deg, #55E6C1, #26de81)',
    'linear-gradient(135deg, #FD79A8, #E84393)',
    'linear-gradient(135deg, #FDCB6E, #F39C12)',
    'linear-gradient(135deg, #74B9FF, #0984E3)',
    'linear-gradient(135deg, #FF9FF3, #F368E0)',
    'linear-gradient(135deg, #48DBFB, #0ABDE3)',
    'linear-gradient(135deg, #FF9F43, #EE5A24)',
    'linear-gradient(135deg, #C8D6E5, #8395A7)',
  ];
  const getClubGradient = useCallback((name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return clubGradients[Math.abs(hash) % clubGradients.length];
  }, []);

  const handleTabChange = useCallback((tab: 'players' | 'clubs') => {
    onLeaderboardTabChange?.(tab);
  }, [onLeaderboardTabChange]);

  /* ── Animated counters ── */
  const countParticipants = useCountUp(registeredCount ?? tournament?.participants ?? 0, 1400, 500);
  const countPrize = useCountUp(tournament?.prizePool || 0, 1800, 700);
  const countTeams = useCountUp(teamsCount ?? 0, 1200, 900);

  /* ── Compact prize formatter for hero card info bar ── */
  const compactPrize = (val: number) => {
    if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1)}jt`;
    if (val >= 1_000) return `${Math.round(val / 1_000)}K`;
    return String(val);
  };

  /* ── Dynamic greeting ── */
  const greeting = getGreeting();

  // Division label
  const divisionLabel = isMale ? 'Divisi Male' : 'Divisi Female';

  return (
    <motion.div
      className="space-y-5 pb-4 lg:pb-6 max-w-5xl mx-auto"
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
    >
      {/* ═══════════════════════════════════════════════════════════
          HERO CARD — Premium iOS Tournament Template
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="relative">
        <div
          className={`${cardClass} rounded-3xl relative overflow-hidden hero-card-mesh${isMale ? '' : ' is-female'} hero-noise hero-gradient-border${isMale ? '' : ' is-female'}${onNavigate ? ' cursor-pointer' : ''}`}
          onClick={() => onNavigate && onNavigate('bracket')}
        >

          {/* ── Radial glow bleed — replaces harsh accent line ── */}
          <div className={`hero-glow-bleed ${isMale ? 'is-male' : 'is-female'}`} />

          {/* ── Subtle ambient glow orb — top right, breathing ── */}
          <div
            className="absolute -top-24 -right-24 w-44 h-44 rounded-full blur-[100px] pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle, rgba(255,215,0,0.10) 0%, rgba(255,159,10,0.04) 40%, transparent 70%)'
                : 'radial-gradient(circle, rgba(167,139,250,0.10) 0%, rgba(196,181,253,0.04) 40%, transparent 70%)',
            }}
          />
          {/* Secondary ambient orb — bottom left, breathing offset ── */}
          <div
            className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full blur-[80px] pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle, rgba(255,159,10,0.05) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
            }}
          />
          {/* Corner bleed — top left subtle accent */}
          <div
            className={`hero-corner-bleed -top-10 -left-10`}
            style={{
              background: isMale
                ? 'radial-gradient(circle, rgba(255,214,10,0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(167,139,250,0.08) 0%, transparent 70%)',
            }}
          />
          {/* Corner bleed — bottom right subtle accent */}
          <div
            className="hero-corner-bleed -bottom-10 -right-10"
            style={{
              background: isMale
                ? 'radial-gradient(circle, rgba(255,159,10,0.05) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
            }}
          />

          {/* ── Card content ── */}
          <div className="relative z-10 p-5 lg:p-8">

            {/* ── Status row: Pill + Week (top area) ── */}
            <div className="flex items-center gap-4 mb-4 lg:mb-5">
              {/* Refined status pill with dot indicator */}
              <span className={`hero-status-pill ${status === 'ongoing' ? 'hero-status-live' : status === 'registration' ? 'hero-status-registration' : status === 'completed' ? 'hero-status-completed' : 'hero-status-setup'}`}>
                <span className="status-dot" />
                {statusInfo.label}
              </span>
              <span className="text-[10px] font-semibold text-white/35 uppercase tracking-[0.12em] ml-1">
                Minggu {tournament?.week || 1}
              </span>
            </div>

            {/* ── Tournament Name — bold title below status row ── */}
            <h2
              className={`text-[24px] sm:text-[28px] lg:text-[40px] font-black leading-[1.1] mb-2 hero-shimmer-title ${isMale ? 'shimmer-gold' : 'shimmer-pink'}`}
              style={{
                letterSpacing: '-0.03em',
                textShadow: isMale
                  ? '0 0 40px rgba(255,214,10,0.08)'
                  : '0 0 40px rgba(167,139,250,0.08)',
              }}
            >
              {tournament?.name || divisionLabel}
            </h2>

            {/* ── Two-column layout on desktop ── */}
            <div className="lg:flex lg:items-start lg:gap-8">
              {/* ── Left Column: Title info + Tags + Countdown ── */}
              <div className="lg:flex-1 lg:min-w-0">

              {/* ── Tournament Info Tags — refined glass chips ── */}
              {infoTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3.5">
                  {infoTags.map((tag) => {
                    const Icon = tag.icon;
                    return (
                      <div
                        key={tag.label}
                        className="hero-info-chip"
                      >
                        <Icon className={`w-3.5 h-3.5 chip-icon ${accentColor}`} />
                        <span className="chip-label text-white">{tag.label}</span>
                        <span className="font-bold text-white/80">{tag.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Countdown Timer — iOS World Clock segmented blocks ── */}
              {shouldShowCountdown && (
                <div className="mb-4">
                  {countdown.expired ? (
                    <div className="flex items-center gap-2 text-white/40 text-[12px] font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Seharusnya sudah dimulai</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Clock className={`w-4 h-4 ${accentColor} opacity-60`} />
                      <span className="text-[11px] text-white/35 font-medium mr-1">Dimulai dalam</span>
                      <div className="hero-countdown-block">
                        {countdown.days > 0 && (
                          <>
                            <div className="hero-countdown-digit">
                              <span className={`digit-value ${accentColor}`}>{countdown.days}</span>
                              <span className="digit-label text-white">Hari</span>
                            </div>
                            <span className={`hero-countdown-separator ${accentColor}`}>:</span>
                          </>
                        )}
                        <div className="hero-countdown-digit">
                          <span className={`digit-value ${accentColor}`}>{String(countdown.hours).padStart(2, '0')}</span>
                          <span className="digit-label text-white">Jam</span>
                        </div>
                        <span className={`hero-countdown-separator ${accentColor}`}>:</span>
                        <div className="hero-countdown-digit">
                          <span className={`digit-value ${accentColor}`}>{String(countdown.minutes).padStart(2, '0')}</span>
                          <span className="digit-label text-white">Menit</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Greeting */}
              <p className="text-[13px] text-white/40 mb-4 leading-relaxed font-normal lg:text-sm">
                {greeting}! {statusInfo.desc}
              </p>
              </div>{/* end left column */}

              {/* ── Right Column: Info Bar + CTA (non-results) OR Results ── */}
              <div className="lg:w-80 lg:flex-shrink-0">

              {/* ── Prize Pool + Participants — refined inline info bar ── */}
              {!showResults && (tournament?.prizePool || (registeredCount ?? tournament?.participants) > 0) && (
                <div className="hero-info-bar mb-4">
                  {/* Prize Pool */}
                  <div 
                    className="info-block cursor-pointer hover:bg-white/[0.02] rounded-xl transition-colors"
                    onClick={(e) => { e.stopPropagation(); onViewPrize?.(); }}
                  >
                    <div className={`info-block-icon ${isMale ? 'icon-gold' : 'icon-pink'}`}>
                      <Trophy className="w-3.5 h-3.5" />
                    </div>
                    <div className="info-block-content">
                      <span className={`info-block-value ${accentColor}`}>Rp {compactPrize(countPrize)}</span>
                      <span className="info-block-label">Hadiah</span>
                    </div>
                  </div>
                  {/* Divider */}
                  <div className="info-block-divider" />
                  {/* Sawer */}
                  <div
                    className="info-block cursor-pointer hover:bg-white/[0.02] rounded-xl transition-colors"
                    onClick={(e) => { e.stopPropagation(); setSawerModalOpen(true); }}
                  >
                    <div className={`info-block-icon ${isMale ? 'icon-gold' : 'icon-pink'}`}>
                      <Gift className="w-3.5 h-3.5" />
                    </div>
                    <div className="info-block-content">
                      <span className={`info-block-value ${accentColor}`}>Rp {compactPrize(totalSawer)}</span>
                      <span className="info-block-label">Sawer</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ── CTA Buttons (when NOT showing results) ── */}
              {!showResults && (
                <>
                  {isRegistration && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onRegister(); }}
                      className={`${btnClass} btn-ios hero-shimmer-btn w-full py-3.5 rounded-2xl text-[14px] font-semibold flex items-center justify-center gap-2.5 relative`}
                      whileHover={{ scale: 1.012, y: -1 }}
                      whileTap={{ scale: 0.975 }}
                      transition={springTransition}
                    >
                      <span className="relative z-[2] flex items-center gap-2.5">
                        <UserPlus className="w-[18px] h-[18px]" />
                        GABUNG TURNAMEN
                        <ArrowRight className="w-[18px] h-[18px]" />
                      </span>
                    </motion.button>
                  )}

                  {isOngoing && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('bracket'); }}
                      className={`w-full py-3.5 rounded-2xl text-[14px] font-semibold ${accentBg} ${accentColor} border ${isMale ? 'border-amber-500/20' : 'border-violet-500/20'} flex items-center justify-center gap-2.5`}
                      whileHover={{ scale: 1.012 }}
                      whileTap={{ scale: 0.975 }}
                      transition={springTransition}
                    >
                      <Swords className="w-[18px] h-[18px]" />
                      Lihat Bracket
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  )}

                  {!isRegistration && !isOngoing && (
                    <div className="flex items-center gap-2.5 text-white/35 text-[13px] font-medium">
                      <Clock className="w-4 h-4" />
                      <span>Menunggu dimulai...</span>
                    </div>
                  )}
                </>
              )}

              {/* ═══════════════════════════════════════════
                  CHAMPION + MVP Results Section
                  ═══════════════════════════════════════════ */}
              {showResults && (
                <div className="space-y-3.5">
                {/* ─── Champion Card — refined inner card ─── */}
                {champion && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, ease: [0.32, 0.72, 0, 1] }}
                    className="hero-result-card lg:flex-1 lg:min-w-0"
                    style={{
                      background: isMale
                        ? 'linear-gradient(145deg, rgba(255,214,10,0.06) 0%, rgba(18,18,22,0.50) 50%, rgba(255,214,10,0.02) 100%)'
                        : 'linear-gradient(145deg, rgba(167,139,250,0.06) 0%, rgba(18,18,22,0.50) 50%, rgba(167,139,250,0.02) 100%)',
                      borderColor: isMale ? 'rgba(255,214,10,0.10)' : 'rgba(167,139,250,0.10)',
                    }}
                  >
                    {/* Subtle glow line at top */}
                    <div
                      className="result-glow"
                      style={{
                        background: isMale
                          ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.20), transparent)'
                          : 'linear-gradient(90deg, transparent, rgba(167,139,250,0.20), transparent)',
                      }}
                    />

                    {/* Champion header */}
                    <div className="flex items-center gap-3.5 p-4 pb-3">
                      <div>
                        <div
                          className="w-12 h-12 rounded-2xl flex items-center justify-center"
                          style={{
                            background: isMale
                              ? 'linear-gradient(135deg, rgba(255,214,10,0.14), rgba(255,159,10,0.06))'
                              : 'linear-gradient(135deg, rgba(167,139,250,0.14), rgba(196,181,253,0.06))',
                            border: `0.5px solid ${isMale ? 'rgba(255,214,10,0.10)' : 'rgba(167,139,250,0.10)'}`,
                          }}
                        >
                          <Crown className={`w-6 h-6 ${isMale ? 'text-amber-400' : 'text-violet-400'}`} />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span
                          className={`text-[9px] font-black uppercase ${isMale ? 'text-amber-400/70' : 'text-violet-400/70'}`}
                          style={{ letterSpacing: '0.2em' }}
                        >
                          Pemenang Pekan Ini
                        </span>
                        <p className="text-[16px] font-black text-white/90 truncate leading-tight mt-0.5 tracking-tight">
                          {champion.teamName}
                        </p>
                      </div>

                      <motion.div
                        animate={{ rotate: [0, 8, -8, 0] }}
                        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: isMale
                              ? 'linear-gradient(135deg, rgba(255,214,10,0.10), rgba(229,168,0,0.04))'
                              : 'linear-gradient(135deg, rgba(167,139,250,0.10), rgba(139,92,246,0.04))',
                          }}
                        >
                          <Trophy className={`w-5 h-5 ${isMale ? 'text-amber-400/70' : 'text-violet-400/70'}`} />
                        </div>
                      </motion.div>
                    </div>

                    {/* Subtle divider */}
                    <div className="mx-4 h-px bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />

                    {/* Team members — staggered entrance with larger avatars */}
                    <div className="space-y-1.5 p-4 pt-3">
                      {champion.members.map((member, idx) => (
                        <motion.div
                          key={member.userId}
                          custom={idx}
                          variants={staggeredItem}
                          initial="hidden"
                          animate="show"
                          className="flex items-center gap-3"
                        >
                          <div className={avatarRingClass}>
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                              {member.userAvatar ? (
                                <img src={member.userAvatar} alt={member.userName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-sm font-bold text-white/70">{member.userName.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-white/90 truncate leading-snug">
                              {member.userName}
                              {member.role === 'captain' && (
                                <span className={`ml-2 text-[9px] font-bold uppercase ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`} style={{ letterSpacing: '0.08em' }}>
                                  CPT
                                </span>
                              )}
                            </p>
                          </div>
                          <span className={`tier-badge ${tierMap[member.userTier] || 'tier-b'}`}>
                            {member.userTier}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* ─── MVP Card — refined with softer borders ─── */}
                {mvp && (
                  <motion.div
                    initial={{ opacity: 0, y: 16, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.6, delay: 0.3, ease: [0.32, 0.72, 0, 1] }}
                    className="hero-result-card lg:flex-1 lg:min-w-0"
                    style={{
                      background: 'linear-gradient(145deg, rgba(255,159,10,0.06) 0%, rgba(28,28,30,0.45) 50%, rgba(255,214,10,0.02) 100%)',
                      borderColor: 'rgba(255,159,10,0.08)',
                    }}
                  >
                    {/* Subtle glow line at top */}
                    <div
                      className="result-glow"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255,159,10,0.25), transparent)',
                      }}
                    />

                    <div className="flex items-center gap-4 p-4">
                      {/* Star + Avatar — larger avatar */}
                      <div className="relative flex-shrink-0">
                        <motion.div
                          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
                          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                        >
                          <Star className="w-5 h-5 mx-auto mb-1.5 text-orange-400/60" />
                        </motion.div>
                        <div className="relative">
                          {/* Orange-gold avatar ring for MVP — larger */}
                          <div
                            className="p-[2.5px] rounded-full"
                            style={{
                              background: 'linear-gradient(145deg, #FF9F0A, #E68A00, #FFD60A)',
                              boxShadow: '0 0 16px rgba(255,159,10,0.20), 0 2px 8px rgba(0,0,0,0.25)',
                            }}
                          >
                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                              {mvp.userAvatar ? (
                                <img src={mvp.userAvatar} alt={mvp.userName} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-base font-bold text-white/70">{mvp.userName.charAt(0)}</span>
                              )}
                            </div>
                          </div>
                          {/* MVP badge dot */}
                          <div
                            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"
                            style={{ boxShadow: '0 0 10px rgba(255,159,10,0.4), 0 0 0 2px rgba(0,0,0,0.5)' }}
                          >
                            <Star className="w-3 h-3 text-white/90 fill-white" />
                          </div>
                        </div>
                      </div>

                      {/* MVP Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[9px] font-black uppercase text-orange-400/80" style={{ letterSpacing: '0.2em' }}>
                            MVP
                          </span>
                          <span className="px-2 py-[3px] rounded-lg text-[9px] font-bold bg-orange-400/10 text-orange-400/80 border border-orange-400/10">
                            +25 pts
                          </span>
                        </div>
                        <p className="text-[17px] font-black text-white/90 truncate leading-tight tracking-tight">
                          {mvp.userName}
                        </p>
                        {mvp.mvpScore > 0 && (
                          <p className="text-[12px] font-semibold text-orange-400/50 mt-1 tabular-nums">
                            Skor: {mvp.mvpScore.toLocaleString('id-ID')}
                          </p>
                        )}
                        <p className="text-[11px] text-white/35 mt-0.5 font-normal">
                          {mvp.userPoints.toLocaleString()} total poin
                        </p>
                      </div>

                      {/* Sparkles icon */}
                      <div className="flex-shrink-0">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{
                            background: 'linear-gradient(135deg, rgba(139,92,246,0.10), rgba(139,92,246,0.03))',
                          }}
                        >
                          <Sparkles className="w-4 h-4 text-purple-400/50" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
              )}
              </div>{/* end right column */}
            </div>{/* end two-column layout */}
          </div>
        </div>
      </motion.div>

      {/* ── Quick Stats — 3 Cards Horizontal on desktop ── */}
      <div className="space-y-5">
      {/* ═══════════════════════════════════════════════════════════
          QUICK STATS — 3 Glass Cards with inner glow hover
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item} className="grid grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
        {/* PEMAIN */}
        <motion.button
          onClick={onViewPlayers}
          className="relative glass inner-light rounded-2xl p-3 sm:p-4 lg:p-6 text-center card-3d cursor-pointer group overflow-hidden"
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {/* Hover inner glow */}
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle at 50% 30%, rgba(255,214,10,0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 30%, rgba(167,139,250,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
              <Users className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
            </div>
            <p className={`text-[17px] sm:text-[20px] lg:text-3xl font-extrabold ${gradientClass} tracking-tight leading-none`}>
              {countParticipants}
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-white/40 mt-1.5 lg:mt-2 font-semibold lg:text-[11px]">
              Peserta
            </p>
            <div
              className="flex items-center justify-center gap-1 mt-2"
            >
              <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`} />
              <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`}>
                TAP
              </span>
              <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`} />
            </div>
          </div>
        </motion.button>

        {/* DONASI / SUPPORT */}
        <motion.button
          onClick={() => setDonationModalOpen(true)}
          className="relative glass inner-light rounded-2xl p-3 sm:p-4 lg:p-6 text-center card-3d cursor-pointer group overflow-hidden"
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at 50% 30%, rgba(239,68,68,0.08) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center bg-red-500/10">
              <Heart className="w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 text-red-400" fill="currentColor" />
            </div>
            <p className="text-[17px] sm:text-[20px] lg:text-3xl font-extrabold text-red-400 tracking-tight leading-none">
              Support
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-white/40 mt-1.5 lg:mt-2 font-semibold lg:text-[11px]">
              Donasi
            </p>
            <div
              className="flex items-center justify-center gap-1 mt-2"
            >
              <Heart className="w-2.5 h-2.5 text-red-400/60" fill="currentColor" />
              <span className="text-[8px] font-bold tracking-[0.15em] text-red-400/60">
                TAP
              </span>
              <Heart className="w-2.5 h-2.5 text-red-400/60" fill="currentColor" />
            </div>
          </div>
        </motion.button>

        {/* TIM */}
        <motion.button
          onClick={onViewTeams}
          className="relative glass inner-light rounded-2xl p-3 sm:p-4 lg:p-6 text-center card-3d cursor-pointer group overflow-hidden"
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.96 }}
          transition={springTransition}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-90 transition-opacity duration-500 pointer-events-none"
            style={{
              background: isMale
                ? 'radial-gradient(circle at 50% 30%, rgba(255,214,10,0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle at 50% 30%, rgba(167,139,250,0.06) 0%, transparent 70%)',
            }}
          />
          <div className="relative z-10">
            <div className={`w-8 h-8 sm:w-9 sm:h-9 lg:w-12 lg:h-12 rounded-xl mx-auto mb-2 sm:mb-2.5 lg:mb-3 flex items-center justify-center ${accentSubtleBg}`}>
              <Swords className={`w-4 h-4 sm:w-[18px] sm:h-[18px] lg:w-6 lg:h-6 ${accentColor}`} />
            </div>
            <p className={`text-[17px] sm:text-[20px] lg:text-3xl font-extrabold ${gradientClass} tracking-tight leading-none`}>
              {countTeams}
            </p>
            <p className="text-[9px] uppercase tracking-[0.1em] text-white/40 mt-1.5 lg:mt-2 font-semibold lg:text-[11px]">
              Tim
            </p>
            <div
              className="flex items-center justify-center gap-1 mt-2"
            >
              <ChevronRight className={`w-2.5 h-2.5 -rotate-90 ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`} />
              <span className={`text-[8px] font-bold tracking-[0.15em] ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`}>
                TAP
              </span>
              <ChevronRight className={`w-2.5 h-2.5 rotate-90 ${isMale ? 'text-amber-400/40' : 'text-violet-400/40'}`} />
            </div>
          </div>
        </motion.button>
      </motion.div>

      {/* ═══════════════════════════════════════════════════════════
          TOP 3 PODIUM — Ranking Section with pulsing "Semua Peringkat"
          ═══════════════════════════════════════════════════════════ */}
      {hasPlayers && (
        <motion.div variants={item} className="relative">
          <div
            className="relative rounded-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(24,24,27,0.95) 0%, rgba(18,18,22,0.98) 100%)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.04)',
            }}
          >
            {/* Top accent line */}
            <div
              className="absolute top-0 left-0 right-0 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${isMale ? '251,191,36' : '192,132,252'},0.3), transparent)`,
              }}
            />

            <div className="p-4 lg:p-5">
              {/* Section Title */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Trophy className={`w-4 h-4 ${accentColor}`} />
                  <span className="text-[13px] font-bold text-white/80 tracking-tight">
                    Top 3 Pemain
                  </span>
                </div>
              </div>

              {/* Podium - 3 Cards */}
              <div className="flex items-end justify-center gap-2 sm:gap-3 lg:gap-4">
                {/* 2nd Place - Left */}
                <div className="flex flex-col items-center flex-1 max-w-[90px] sm:max-w-[100px] lg:max-w-[120px]">
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                      {topPlayers[1]?.avatar ? (
                        <img src={topPlayers[1].avatar} alt={topPlayers[1].name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-white/70">{topPlayers[1]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-black"
                    style={{
                      background: 'linear-gradient(135deg, #C7C7CC, #8E8E93)',
                      color: '#1C1C1E',
                      boxShadow: '0 2px 8px rgba(199,199,204,0.25)',
                    }}
                  >
                    2
                  </div>
                  
                  {/* Name & Points */}
                  <p className="text-[11px] sm:text-[12px] font-bold text-white/90 mt-2 truncate w-full text-center">
                    {topPlayers[1]?.name || '-'}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[1]?.points?.toLocaleString() || 0} PTS
                  </p>
                </div>

                {/* 1st Place - Center (Tallest) */}
                <div className="flex flex-col items-center flex-1 max-w-[100px] sm:max-w-[115px] lg:max-w-[140px] -mt-4 sm:-mt-5">
                  {/* Crown */}
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Crown className={`w-5 h-5 sm:w-6 sm:h-6 ${accentColor} mb-1.5`} />
                  </motion.div>
                  
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                      {topPlayers[0]?.avatar ? (
                        <img src={topPlayers[0].avatar} alt={topPlayers[0].name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-bold text-white/70">{topPlayers[0]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center text-xs sm:text-sm font-black"
                    style={{
                      background: isMale
                        ? 'linear-gradient(135deg, #FFD60A, #E5A800)'
                        : 'linear-gradient(135deg, #A78BFA, #8B5CF6)',
                      color: '#000',
                      boxShadow: isMale
                        ? '0 0 16px rgba(255,214,10,0.35)'
                        : '0 0 16px rgba(167,139,250,0.35)',
                    }}
                  >
                    1
                  </div>
                  
                  {/* Name & Points */}
                  <p className="text-[12px] sm:text-[13px] lg:text-sm font-bold text-white/90 mt-2 truncate w-full text-center">
                    {topPlayers[0]?.name || '-'}
                  </p>
                  <p className={`text-[11px] sm:text-[12px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[0]?.points?.toLocaleString() || 0} PTS
                  </p>
                </div>

                {/* 3rd Place - Right */}
                <div className="flex flex-col items-center flex-1 max-w-[90px] sm:max-w-[100px] lg:max-w-[120px]">
                  {/* Avatar */}
                  <div className={avatarRingClass}>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                      {topPlayers[2]?.avatar ? (
                        <img src={topPlayers[2].avatar} alt={topPlayers[2].name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg font-bold text-white/70">{topPlayers[2]?.name?.charAt(0) || '?'}</span>
                      )}
                    </div>
                  </div>
                  
                  {/* Rank Badge */}
                  <div
                    className="mt-2 w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center text-[11px] sm:text-xs font-black"
                    style={{
                      background: 'linear-gradient(135deg, #CD7F32, #8B4513)',
                      color: '#fff',
                      boxShadow: '0 2px 8px rgba(205,127,50,0.25)',
                    }}
                  >
                    3
                  </div>
                  
                  {/* Name & Points */}
                  <p className="text-[11px] sm:text-[12px] font-bold text-white/90 mt-2 truncate w-full text-center">
                    {topPlayers[2]?.name || '-'}
                  </p>
                  <p className={`text-[10px] sm:text-[11px] font-bold ${accentColor} mt-0.5`}>
                    {topPlayers[2]?.points?.toLocaleString() || 0} PTS
                  </p>
                </div>
              </div>

              {/* Pulsing "Semua Peringkat" Button */}
              <motion.button
                onClick={() => setAllRankingsModalOpen(true)}
                className="w-full mt-5 py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer relative overflow-hidden"
                style={{
                  background: 'transparent',
                  border: `1px solid ${isMale ? 'rgba(255,214,10,0.1)' : 'rgba(167,139,250,0.1)'}`,
                }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {/* Subtle pulsing glow line - thin only */}
                <motion.div
                  className="absolute inset-x-0 top-0 h-[1px]"
                  style={{
                    background: isMale
                      ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.4), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4), transparent)',
                  }}
                  animate={{
                    opacity: [0.3, 0.7, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className={`relative z-10 text-[11px] sm:text-[12px] font-semibold ${accentColor} tracking-wide`}>
                  Lihat Semua Peringkat
                </span>
                <ChevronRight className={`relative z-10 w-3.5 h-3.5 ${accentColor}`} />
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          QUICK ACTIONS — 2 Glass-Subtle Cards (+ 2 desktop-only)
          ═══════════════════════════════════════════════════════════ */}
      <motion.div variants={item}>
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4 lg:gap-4">
          {/* Daftar */}
          <motion.button
            onClick={onRegister}
            className="glass-subtle inner-light rounded-2xl p-3 sm:p-4 text-left group"
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3`}
              style={{
                background: isMale
                  ? 'linear-gradient(135deg, rgba(255,214,10,0.12), rgba(255,159,10,0.05))'
                  : 'linear-gradient(135deg, rgba(167,139,250,0.12), rgba(196,181,253,0.05))',
              }}
            >
              <UserPlus className={`w-4 h-4 sm:w-[18px] sm:h-[18px] ${accentColor}`} />
            </div>
            <p className="text-[13px] font-semibold text-white/90 leading-snug">Daftar</p>
            <p className="text-[11px] text-white/40 mt-0.5 font-normal">Gabung turnamen</p>
          </motion.button>

          {/* Bracket */}
          <motion.button
            onClick={() => onNavigate && onNavigate('bracket')}
            className="glass-subtle inner-light rounded-2xl p-3 sm:p-4 text-left group"
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.04))',
              }}
            >
              <Swords className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-400" />
            </div>
            <p className="text-[13px] font-semibold text-white/90 leading-snug">Bracket</p>
            <p className="text-[11px] text-white/40 mt-0.5 font-normal">Lihat pertandingan</p>
          </motion.button>

          {/* Leaderboard */}
          <motion.button
            onClick={() => onNavigate && onNavigate('leaderboard')}
            className="glass-subtle inner-light rounded-2xl p-3 sm:p-4 text-left group"
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: 'linear-gradient(135deg, rgba(52,199,89,0.12), rgba(52,199,89,0.04))',
              }}
            >
              <BarChart3 className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-green-400" />
            </div>
            <p className="text-[13px] font-semibold text-white/90 leading-snug">Leaderboard</p>
            <p className="text-[11px] text-white/40 mt-0.5 font-normal">Pemain terbaik</p>
          </motion.button>

          {/* Total Donasi */}
          <motion.button
            onClick={() => onViewDonation && onViewDonation()}
            className="glass-subtle inner-light rounded-2xl p-3 sm:p-4 text-left group"
            whileHover={{ scale: 1.025, y: -3 }}
            whileTap={{ scale: 0.975 }}
            transition={springTransition}
          >
            <div
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center mb-2 sm:mb-3"
              style={{
                background: isMale
                  ? 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,63,94,0.06))'
                  : 'linear-gradient(135deg, rgba(192,132,252,0.15), rgba(244,63,94,0.06))',
              }}
            >
              <Heart className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-purple-400" />
            </div>
            <p className="text-[13px] font-semibold text-white/90 leading-snug">Total Donasi</p>
            <p className="text-[11px] text-white/40 mt-0.5 font-normal">Dukung Season 2</p>
          </motion.button>
        </div>
      </motion.div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          TOP PLAYERS / CLUBS — Tabbed leaderboard
          ═══════════════════════════════════════════════════════════ */}
      {(hasPlayers || hasClubs) && (
        <motion.div variants={item}>
          {/* Section header with segmented tab */}
          <div className="flex items-center justify-between px-1 mb-3">
            <div className="flex items-center gap-1 bg-white/[0.06] rounded-lg p-0.5">
              {([
                { id: 'players' as const, label: 'PEMAIN TERBAIK', icon: Trophy },
                ...(hasClubs ? [{ id: 'clubs' as const, label: 'CLUB TERBAIK', icon: Shield }] : []),
              ]).map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold z-10"
                  whileTap={{ scale: 0.97 }}
                >
                  {leaderboardTab === tab.id && (
                    <motion.div
                      className="absolute inset-0 rounded-md glass-subtle pointer-events-none"
                      layoutId="leaderboardTab"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? accentColor : 'text-white/35'}`}>
                    <tab.icon className="w-3 h-3 inline" />
                  </span>
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? 'text-white/90' : 'text-white/35'} hidden sm:inline`}>
                    {tab.label}
                  </span>
                  <span className={`relative z-10 ${leaderboardTab === tab.id ? 'text-white/90' : 'text-white/35'} sm:hidden`}>
                    {tab.id === 'players' ? 'PEMAIN' : 'CLUB'}
                  </span>
                </motion.button>
              ))}
            </div>
            {leaderboardTab === 'players' && (
              <button
                onClick={onViewPlayers}
                className="text-[11px] text-white/40 hover:text-white/60 flex items-center gap-0.5 font-medium transition-colors duration-200"
              >
                Lihat Semua <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* ── PLAYERS TAB ── */}
          {leaderboardTab === 'players' && hasPlayers && (
            <>
              {/* Desktop table header */}
              <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 mb-1.5">
                <div className="w-9 shrink-0" />
                <div className="w-11 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Player</span>
                </div>
                <div className="w-8 shrink-0" />
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 w-7 text-center">Win</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40 w-7 text-center">Loss</span>
                </div>
                <div className="w-16 shrink-0 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Points</span>
                </div>
              </div>

              {/* Player rows */}
              <motion.div
                className="space-y-2"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {topPlayers.slice(0, 10).map((player, index) => (
                  <motion.div
                    key={player.id}
                    className={`glass-subtle rounded-xl px-2.5 sm:px-3.5 lg:px-5 py-2.5 sm:py-3 lg:py-4 flex items-center gap-2.5 sm:gap-3 lg:gap-4 group ${index >= 5 ? 'max-lg:hidden' : ''}`}
                    variants={item}
                    whileHover={{ scale: 1.015, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  >
                    {/* Rank badge with gradient */}
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-[12px] shrink-0"
                      style={
                        index < 3
                          ? {
                              background: `linear-gradient(160deg, ${rankColors[index]} 0%, ${
                                index === 1 ? '#8E8E93' : index === 2 ? '#A0522D' : '#E5A800'
                              } 100%)`,
                              color: index === 1 ? '#1C1C1E' : index === 2 ? '#fff' : '#000',
                              boxShadow: `0 2px 6px ${rankColors[index]}30, inset 0 1px 0 rgba(255,255,255,${index === 2 ? '0.15' : '0.35'})`,
                            }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
                      }
                    >
                      {player.rank}
                    </div>

                    {/* Avatar with ring */}
                    <div className={avatarRingClass}>
                      <div className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                        {player.avatar ? (
                          <img src={player.avatar} alt={player.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-semibold text-white/70">{player.name[0]}</span>
                        )}
                      </div>
                    </div>

                    {/* Player info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/90 truncate leading-snug lg:text-sm">{player.name}</p>
                    </div>

                    {/* Tier */}
                    {player.tier && (
                      <span className={`tier-badge ${tierMap[player.tier] || 'tier-b'} shrink-0`}>
                        {player.tier}
                      </span>
                    )}

                    {/* Wins + Losses — desktop only */}
                    <div className="hidden lg:flex items-center gap-4 shrink-0">
                      <span className="text-[12px] font-semibold text-green-400/60 tabular-nums w-7 text-center">{player.wins}W</span>
                      <span className="text-[12px] font-semibold text-red-400/50 tabular-nums w-7 text-center">{player.losses}L</span>
                    </div>

                    {/* Points */}
                    <span className={`text-[13px] font-bold ${accentColor} tabular-nums shrink-0 lg:text-sm lg:w-16 lg:text-right`}>
                      {player.points.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}

          {/* ── CLUBS TAB ── */}
          {leaderboardTab === 'clubs' && hasClubs && (
            <>
              {/* Desktop table header */}
              <div className="hidden lg:flex items-center gap-4 px-5 py-2.5 mb-1.5">
                <div className="w-9 shrink-0" />
                <div className="w-11 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Club</span>
                </div>
                <div className="w-20 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Members</span>
                </div>
                <div className="w-16 shrink-0 text-right">
                  <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/40">Points</span>
                </div>
              </div>

              {/* Club rows */}
              <motion.div
                className="space-y-2"
                variants={container}
                initial="hidden"
                animate="show"
              >
                {topClubs!.slice(0, 10).map((club, index) => (
                  <motion.div
                    key={club.id}
                    className={`glass-subtle rounded-xl px-2.5 sm:px-3.5 lg:px-5 py-2.5 sm:py-3 lg:py-4 flex items-center gap-2.5 sm:gap-3 lg:gap-4 group ${index >= 5 ? 'max-lg:hidden' : ''}`}
                    variants={item}
                    whileHover={{ scale: 1.015, x: 2 }}
                    whileTap={{ scale: 0.99 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  >
                    {/* Rank badge with gradient */}
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center font-bold text-[11px] sm:text-[12px] shrink-0"
                      style={
                        index < 3
                          ? {
                              background: `linear-gradient(160deg, ${rankColors[index]} 0%, ${
                                index === 1 ? '#8E8E93' : index === 2 ? '#A0522D' : '#E5A800'
                              } 100%)`,
                              color: index === 1 ? '#1C1C1E' : index === 2 ? '#fff' : '#000',
                              boxShadow: `0 2px 6px ${rankColors[index]}30, inset 0 1px 0 rgba(255,255,255,${index === 2 ? '0.15' : '0.35'})`,
                            }
                          : { background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)' }
                      }
                    >
                      {club.rank}
                    </div>

                    {/* Club avatar */}
                    <div className={avatarRingClass}>
                      <div
                        className="w-8 h-8 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full flex items-center justify-center overflow-hidden"
                        style={club.logoUrl ? undefined : { background: getClubGradient(club.name) }}
                      >
                        {club.logoUrl ? (
                          <img src={club.logoUrl} alt={club.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="club-avatar">
                            {club.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Club info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-white/90 truncate leading-snug lg:text-sm">{club.name}</p>
                    </div>

                    {/* Member count badge — desktop */}
                    <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] font-semibold text-white/40 bg-white/[0.04] rounded-full px-2.5 py-0.5 border border-white/[0.06]">
                        <Users className="w-2.5 h-2.5 inline mr-0.5 opacity-60" />
                        {club.memberCount} anggota
                      </span>
                    </div>

                    {/* Points */}
                    <span className={`text-[13px] font-bold ${accentColor} tabular-nums shrink-0 lg:text-sm lg:w-16 lg:text-right`}>
                      {club.totalPoints.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          GRAND FINAL BANNER — Premium glass with shimmer holographic
          ═══════════════════════════════════════════════════════════ */}
      <motion.div
        variants={item}
        whileHover={{ scale: 1.01, y: -2 }}
        whileTap={{ scale: 0.985 }}
        transition={springTransition}
        className={`${cardClass} rounded-2xl relative overflow-hidden cursor-pointer`}
        onClick={() => setQualifiedModalOpen(true)}
      >
        {/* Shimmer holographic overlay */}
        <div
          className="absolute inset-0 pointer-events-none animate-shimmer"
          style={{
            background: `linear-gradient(
              110deg,
              transparent 20%,
              ${isMale ? 'rgba(255,214,10,0.05)' : 'rgba(167,139,250,0.05)'} 35%,
              ${isMale ? 'rgba(255,214,10,0.10)' : 'rgba(167,139,250,0.10)'} 50%,
              ${isMale ? 'rgba(255,214,10,0.05)' : 'rgba(167,139,250,0.05)'} 65%,
              transparent 80%
            )`,
            backgroundSize: '200% 100%',
          }}
        />

        {/* Accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-[1.5px]"
          style={{
            background: isMale
              ? 'linear-gradient(90deg, transparent, rgba(255,214,10,0.4) 50%, transparent)'
              : 'linear-gradient(90deg, transparent, rgba(167,139,250,0.4) 50%, transparent)',
            boxShadow: isMale
              ? '0 0 16px rgba(255,214,10,0.2)'
              : '0 0 16px rgba(167,139,250,0.2)',
          }}
        />

        <div className="relative z-10 flex items-center gap-3.5 p-4 lg:p-6">
          <div
            className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: isMale
                ? 'linear-gradient(135deg, rgba(255,214,10,0.16), rgba(229,168,0,0.06))'
                : 'linear-gradient(135deg, rgba(167,139,250,0.16), rgba(139,92,246,0.06))',
            }}
          >
            <Trophy className={`w-5 h-5 lg:w-7 lg:h-7 ${accentColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-white/90 tracking-tight leading-snug lg:text-xl">Grand Final</p>
            <p className="text-[12px] text-white/45 mt-0.5 font-normal lg:text-sm">
              12 Pemain teratas yang lolos
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-white/15 shrink-0 lg:w-5 lg:h-5" />
        </div>
      </motion.div>

      {/* Qualified Players Modal */}
      <QualifiedPlayersModal
        isOpen={qualifiedModalOpen}
        onOpenChange={setQualifiedModalOpen}
        players={qualifiedPlayers}
        division={division}
      />

      {/* All Rankings Modal */}
      <AllRankingsModal
        isOpen={allRankingsModalOpen}
        onOpenChange={setAllRankingsModalOpen}
        players={topPlayers}
        division={division}
      />

      {/* Donation Modal */}
      <DonationModal
        isOpen={donationModalOpen}
        onOpenChange={setDonationModalOpen}
        division={division}
        totalDonation={totalDonation}
        onDonate={onDonate}
      />

      {/* Sawer Modal */}
      <SawerModal
        isOpen={sawerModalOpen}
        onOpenChange={setSawerModalOpen}
        division={division}
        totalSawer={totalSawer}
        prizePool={tournament?.prizePool || 0}
        topPlayers={topPlayers}
        onSawer={onSawer}
      />
    </motion.div>
  );
}
