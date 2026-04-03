'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/lib/store';
import { Navigation, TopBar } from '@/components/esports/Navigation';
import { GradientBackground, Premium3DEffects } from '@/components/effects/ParticleField';
import { Dashboard } from '@/components/esports/Dashboard';
import { TournamentTab } from '@/components/esports/Tournament';
import { Bracket } from '@/components/esports/Bracket';
import { Leaderboard } from '@/components/esports/Leaderboard';
import { DonasiSawerTab } from '@/components/esports/DonasiSawerTab';
import { GrandFinal } from '@/components/esports/GrandFinal';
import { AdminPanel } from '@/components/esports/AdminPanel';
import { AdminLogin } from '@/components/esports/AdminLogin';
import { TournamentHistory } from '@/components/esports/TournamentHistory';
import { PlayerProfileModal } from '@/components/esports/PlayerProfile';
import { PlayerListModal } from '@/components/esports/PlayerListModal';
import { PrizeBreakdownModal } from '@/components/esports/PrizeBreakdownModal';
import { TeamListModal } from '@/components/esports/TeamListModal';

import { LiveChat } from '@/components/esports/LiveChat';
import { PWAInstallPrompt } from '@/components/pwa/PWAInstallPrompt';
import { ToastContainer } from '@/components/esports/Toast';
import { Database } from 'lucide-react';
import { usePusher } from '@/hooks/usePusher';
import { adminFetch } from '@/lib/admin-fetch';

export default function IDOLMETAApp() {
  // Mobile detection for conditional inline styles (loading screen perf)
  // Start with undefined to avoid hydration mismatch, then set after mount
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    // Set initial value after mount
    const mq = window.matchMedia('(min-width: 768px)');
    setIsMobile(!mq.matches);

    // Listen for changes
    const handler = (e: MediaQueryListEvent) => setIsMobile(!e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Default to mobile styles during SSR and initial render
  const isMobileStyle = isMobile ?? true;
  const {
    activeTab,
    division,
    isLoading,
    isAdminAuthenticated,
    users,
    currentTournament,
    registrations,
    teams,
    matches,
    donations,
    totalDonation,
    totalSawer,
    toasts,
    tournaments,
    setActiveTab,
    setDivision,
    fetchData,
    registerUser,
    approveRegistration,
    rejectRegistration,
    deleteRegistration,
    deleteAllRejected,
    updateTournamentStatus,
    updatePrizePool,
    generateTeams,
    resetTeams,
    generateBracket,
    updateMatchScore,
    setMVP,
    removeMVP,
    finalizeTournament,
    donate,
    sawer,
    removeToast,
    seedDatabase,
    resetSeason,
    createTournament,
    addToast,
    loginAdmin,
    logoutAdmin,
    fetchAdmins,
  } = useAppStore();

  const [selectedPlayer, setSelectedPlayer] = useState<{
    id: string;
    name: string;
    email: string;
    gender: string;
    tier: string;
    points: number;
    avatar: string | null;
    createdAt: string;
  } | null>(null);

  // Track which sub-tab to show when donation tab opens
  const [donationDefaultTab, setDonationDefaultTab] = useState<'sawer' | 'donasi'>('sawer');

  // Track initial mount
  const isInitialMount = useRef(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [playerListOpen, setPlayerListOpen] = useState(false);
  const [prizeModalOpen, setPrizeModalOpen] = useState(false);
  const [teamListOpen, setTeamListOpen] = useState(false);
  const [leaderboardTab, setLeaderboardTab] = useState<'players' | 'clubs'>('players');
  const [topClubs, setTopClubs] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    totalPoints: number;
    memberCount: number;
    rank: number;
  }>>([]);

  // Listen for admin auth changes (e.g., 401 response triggers logout)
  useEffect(() => {
    const handleAuthChange = (event: CustomEvent) => {
      if (!event.detail?.authenticated) {
        // Admin was logged out due to 401
        setAdminOpen(false);
        setAdminLoginOpen(true);
        addToast('Session admin habis. Silakan login kembali.', 'warning');
      }
    };
    window.addEventListener('admin-auth-changed', handleAuthChange as EventListener);
    return () => window.removeEventListener('admin-auth-changed', handleAuthChange as EventListener);
  }, [addToast]);

  // Pusher connection for real-time updates
  const { joinTournament, isConnected } = usePusher({
    // On match score update
    onMatchScore: useCallback((data) => {
      addToast(`Pertandingan diperbarui: ${data.scoreA} - ${data.scoreB}`, 'info');
      fetchData(false);
    }, [addToast, fetchData]),
    // On match result (completed)
    onMatchResult: useCallback(() => {
      addToast(`Pertandingan selesai! Pemenang ditentukan.`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
    // On announcement
    onAnnouncement: useCallback((data) => {
      addToast(data.message, data.type as 'success' | 'error' | 'warning' | 'info');
    }, [addToast]),
    // On donation
    onNewDonation: useCallback((data) => {
      addToast(`${data.userName} berdonasi Rp${data.amount}!`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
    // On prize pool update
    onPrizePoolUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On tournament update (status change, etc.)
    onTournamentUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On registration update
    onRegistrationUpdate: useCallback(() => {
      fetchData(false);
    }, [fetchData]),
    // On new sawer confirmed
    onNewSawer: useCallback((data) => {
      addToast(`${data.senderName} menyawer Rp${data.amount}! Prize pool bertambah!`, 'success');
      fetchData(false);
    }, [addToast, fetchData]),
  });

  // ── Grand Final State ──
  const [grandFinalData, setGrandFinalData] = useState<any>(null);
  const [qualifiedPlayers, setQualifiedPlayers] = useState<Array<{id: string; name: string; points: number; tier: string; avatar: string | null}>>([]);
  const [isGFSettingUp, setIsGFSettingUp] = useState(false);
  const [isGFDeleting, setIsGFDeleting] = useState(false);
  const [isGFUpdatingScore, setIsGFUpdatingScore] = useState(false);
  const [gfPrizePool, setGfPrizePool] = useState<number>(0);

  // Fetch Grand Final data
  const fetchGrandFinal = useCallback(async () => {
    try {
      const res = await fetch(`/api/tournaments/grand-final?division=${division}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setGrandFinalData(data.grandFinal);
          setQualifiedPlayers(data.qualifiedPlayers || []);
        }
      }
    } catch { /* silent */ }
  }, [division]);

  // Setup Grand Final (admin)
  const setupGrandFinal = useCallback(async (prizePoolValue?: number) => {
    setIsGFSettingUp(true);
    try {
      const res = await adminFetch('/api/tournaments/grand-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ division, prizePool: prizePoolValue ?? gfPrizePool ?? 0 }),
      });
      const data = await res.json();
      if (data.success) {
        addToast('GRAND FINAL dimulai! 4 tim siap bertanding!', 'success');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal membuat Grand Final', 'error');
      }
    } catch {
      addToast('Gagal membuat Grand Final', 'error');
    } finally {
      setIsGFSettingUp(false);
    }
  }, [division, gfPrizePool, addToast, fetchGrandFinal, fetchData]);

  // Delete Grand Final (admin)
  const deleteGrandFinal = useCallback(async () => {
    if (!grandFinalData?.id) return;
    setIsGFDeleting(true);
    try {
      const res = await adminFetch(`/api/tournaments/grand-final?tournamentId=${grandFinalData.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        addToast('Grand Final direset', 'warning');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal mereset Grand Final', 'error');
      }
    } catch {
      addToast('Gagal mereset Grand Final', 'error');
    } finally {
      setIsGFDeleting(false);
    }
  }, [grandFinalData, addToast, fetchGrandFinal, fetchData]);

  // Update Grand Final match score (admin)
  const updateGFMatchScore = useCallback(async (matchId: string, scoreA: number, scoreB: number) => {
    setIsGFUpdatingScore(true);
    try {
      const res = await adminFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB }),
      });
      const data = await res.json();
      if (data.success) {
        addToast(`Skor diperbarui: ${scoreA} - ${scoreB}`, 'success');
        await fetchGrandFinal();
        fetchData(false);
      } else {
        addToast(data.error || 'Gagal memperbarui skor', 'error');
      }
    } catch {
      addToast('Gagal memperbarui skor', 'error');
    } finally {
      setIsGFUpdatingScore(false);
    }
  }, [addToast, fetchGrandFinal, fetchData]);

  // Fetch Grand Final on mount and division change
  useEffect(() => {
    fetchGrandFinal();
  }, [division, fetchGrandFinal]);

  // Toggle division function with simple fade animation
  const toggleDivision = useCallback(() => {
    const newDivision = division === 'male' ? 'female' : 'male';
    setDivision(newDivision);
    addToast(`Beralih ke divisi ${newDivision}`, 'info');
  }, [division, setDivision, addToast]);

  // Load data on mount and when division changes
  useEffect(() => {
    if (isInitialMount.current) {
      // Initial mount - show loading screen
      isInitialMount.current = false;
      fetchData(true);
      // Verify admin session is still valid
      fetchAdmins();
    } else {
      // Division change - no loading screen
      fetchData(false);
    }
  }, [division, fetchData]);

  // Initial fetch & re-fetch on division change
  useEffect(() => {
    const controller = new AbortController();
    const genderParam = division === 'male' ? 'male' : 'female';

    (async () => {
      try {
        const res = await fetch(`/api/clubs?gender=${genderParam}&limit=10`, { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.clubs) {
            setTopClubs(data.clubs);
          }
        }
      } catch { /* silent */ }
    })();

    return () => controller.abort();
  }, [division]);

  // Auto-refresh clubs when admin edits/creates/deletes (via BroadcastChannel)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const channel = new BroadcastChannel('idm-club-updates');
    const handler = () => {
      const genderParam = division === 'male' ? 'male' : 'female';
      fetch(`/api/clubs?gender=${genderParam}&limit=10`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.success && data.clubs) setTopClubs(data.clubs);
        })
        .catch(() => {});
    };
    channel.addEventListener('message', handler);
    return () => channel.removeEventListener('message', handler);
  }, [division]);

  // Join tournament room when tournament loads
  useEffect(() => {
    if (currentTournament && isConnected) {
      joinTournament(currentTournament.id);
    }
  }, [currentTournament, isConnected, joinTournament]);

  // Scroll to top on tab change
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Compute per-user wins/losses from completed matches
  const userStats = useMemo(() => {
    const stats = new Map<string, { wins: number; losses: number }>();

    // Build userId → teamId mapping from teams
    const userTeamMap = new Map<string, string>();
    for (const team of teams) {
      for (const member of team.members) {
        userTeamMap.set(member.user.id, team.id);
      }
    }

    // Build teamId → {wins, losses} from completed matches
    const teamStats = new Map<string, { wins: number; losses: number }>();
    for (const match of matches) {
      if (match.status === 'completed' && match.winnerId && match.teamAId && match.teamBId) {
        const winnerTeamId = match.winnerId;
        const loserTeamId = winnerTeamId === match.teamAId ? match.teamBId : match.teamAId;

        const winnerStats = teamStats.get(winnerTeamId) || { wins: 0, losses: 0 };
        winnerStats.wins++;
        teamStats.set(winnerTeamId, winnerStats);

        const loserStats = teamStats.get(loserTeamId) || { wins: 0, losses: 0 };
        loserStats.losses++;
        teamStats.set(loserTeamId, loserStats);
      }
    }

    // Map team stats to individual users
    for (const [userId, teamId] of userTeamMap) {
      if (teamStats.has(teamId)) {
        stats.set(userId, teamStats.get(teamId)!);
      }
    }

    return stats;
  }, [matches, teams]);

  const topPlayers = useMemo(() =>
    users
      .filter(u => u.role === 'user' || !u.isAdmin)
      .sort((a, b) => b.points - a.points)
      .slice(0, 12)
      .map((user, index) => ({
        ...user,
        rank: index + 1,
        wins: userStats.get(user.id)?.wins ?? 0,
        losses: userStats.get(user.id)?.losses ?? 0,
      })),
    [users, userStats]
  );

  // ── Champion of the week: winner of the highest-round completed match ──
  const championOfTheWeek = useMemo(() => {
    const completedMatches = matches
      .filter(m => m.status === 'completed' && m.winnerId)
      .sort((a, b) => {
        if (b.round !== a.round) return b.round - a.round; // highest round first
        return b.matchNumber - a.matchNumber;
      });

    if (completedMatches.length === 0) return null;

    const finalMatch = completedMatches[0];
    const winningTeam = teams.find(t => t.id === finalMatch.winnerId);
    if (!winningTeam || winningTeam.members.length === 0) return null;

    // All team members with their info
    const members = winningTeam.members.map(m => ({
      userId: m.user.id,
      userName: m.user.name,
      userAvatar: m.user.avatar,
      userTier: m.user.tier,
      role: m.role,
    }));

    // Captain first, then rest
    members.sort((a, b) => (a.role === 'captain' ? -1 : b.role === 'captain' ? 1 : 0));

    return {
      teamName: winningTeam.name,
      members,
    };
  }, [matches, teams]);

  // ── MVP of the week ──
  const mvpOfTheWeek = useMemo(() => {
    const mvp = users.find(u => u.isMVP);
    if (!mvp) return null;
    return {
      userId: mvp.id,
      userName: mvp.name,
      userAvatar: mvp.avatar,
      userPoints: mvp.points,
      mvpScore: mvp.mvpScore || 0,
    };
  }, [users]);

  // Memoize common prop transformations
  const tournamentInfo = useMemo(() => currentTournament ? {
    name: currentTournament.name,
    status: currentTournament.status,
    week: currentTournament.week,
    prizePool: currentTournament.prizePool,
    participants: registrations.filter(r => r.status === 'approved').length,
    mode: currentTournament.mode || undefined,
    bpm: currentTournament.bpm || undefined,
    lokasi: currentTournament.lokasi || undefined,
    startDate: currentTournament.startDate || null,
  } : null, [currentTournament, registrations]);

  const registrationList = useMemo(() => registrations.map(r => ({
    id: r.id,
    name: r.user.name,
    email: r.user.email,
    avatar: r.user.avatar || '',
    tier: r.tierAssigned || r.user.tier,
    gender: r.user.gender,
    status: r.status,
    phone: '',
  })), [registrations]);

  const playerListData = useMemo(() => registrations.map(r => ({
    id: r.id,
    name: r.user.name,
    phone: (r as Record<string, unknown>).user?.phone as string || '',
    avatar: r.user.avatar || '',
    tier: r.tierAssigned || r.user.tier,
    gender: r.user.gender,
    status: r.status as 'approved' | 'pending' | 'rejected',
  })), [registrations]);

  const registeredAvatars = useMemo(() => registrations.map(r => ({
    name: r.user.name,
    avatar: r.user.avatar || '',
  })), [registrations]);

  const historyTournaments = useMemo(() => tournaments.map(t => ({
    ...t,
    _count: (t as Record<string, unknown>)._count
      ? (t as Record<string, unknown>)._count as { registrations: number; teams: number; matches: number }
      : { registrations: 0, teams: 0, matches: 0 },
  })), [tournaments]);

  return (
    <main className="h-dvh flex flex-col text-white overflow-hidden relative">
      {/* ========================================
          Loading Screen — IDM Premium Logo
          ======================================== */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="loading-screen"
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
            initial={{ opacity: 1, pointerEvents: 'auto' }}
            animate={{ opacity: 1, pointerEvents: 'auto' }}
            exit={{ opacity: 0, pointerEvents: 'none' }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
          >
            {/* Premium dark background — CSS-only, matching main app */}
            <div className="absolute inset-0 -z-10" style={{ background: '#050507' }}>
              {/* Base gradient — hidden on mobile to reduce paint cost */}
              <div
                className="absolute inset-0 hidden md:block"
                style={{
                  background: `
                    radial-gradient(ellipse 120% 80% at 50% 120%, rgba(255,214,10,0.04) 0%, transparent 60%),
                    radial-gradient(ellipse 80% 60% at 80% 20%, rgba(167,139,250,0.025) 0%, transparent 50%),
                    linear-gradient(180deg, #050507 0%, #0B0B0F 40%, #080810 100%)
                  `,
                }}
              />
              {/* Hex pattern overlay — hidden on mobile */}
              <div
                className="absolute inset-0 opacity-[0.012] hidden md:block"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundSize: '28px 49px',
                }}
              />
              {/* Heavy dark overlay — lighter on mobile */}
              <div
                className="absolute inset-0"
                style={{
                  background: isMobileStyle
                    ? 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%)'
                    : 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.80) 60%, rgba(0,0,0,0.95) 100%)',
                }}
              />
              {/* Subtle ambient glow behind logo — hidden on mobile */}
              <motion.div
                className="absolute inset-0 hidden md:block"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  background: 'radial-gradient(ellipse at 50% 40%, rgba(255,214,10,0.04) 0%, rgba(167,139,250,0.02) 30%, transparent 55%)',
                }}
              />
            </div>

            {/* ── IDM Premium Logo Image ── */}
            <motion.div
              className="relative flex flex-col items-center justify-center"
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Logo image */}
              <motion.div
                className="relative"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <img
                  src="/assets/idm-logo.png"
                  alt="IDM Logo"
                  className="w-[clamp(160px,42vw,260px)] h-auto select-none"
                  style={{
                    filter: isMobileStyle
                    ? 'drop-shadow(0 2px 8px rgba(255,214,10,0.2))'
                    : 'drop-shadow(0 4px 20px rgba(255,214,10,0.3)) drop-shadow(0 0 40px rgba(255,214,10,0.15))',
                  }}
                />
              </motion.div>

              {/* Subtitle — 3D Neon */}
              <motion.p
                className="mt-3 text-[clamp(10px,3vw,15px)] tracking-[0.3em] uppercase font-bold relative"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
              >
                {/* Neon glow layers — hidden on mobile */}
                <span
                  className="absolute inset-0 blur-[6px] opacity-60 hidden md:block"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,214,10,0.4), rgba(255,100,200,0.5) 50%, rgba(255,214,10,0.4))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  aria-hidden="true"
                />
                <span
                  className="absolute inset-0 blur-[14px] opacity-30 hidden md:block"
                  style={{
                    background: 'linear-gradient(90deg, rgba(255,214,10,0.6), rgba(255,100,200,0.7) 50%, rgba(255,214,10,0.6))',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                  aria-hidden="true"
                />
                <span
                  className="relative"
                  style={{
                    background: 'linear-gradient(90deg, #FFD60A, #A78BFA 50%, #FFD60A)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    filter: isMobileStyle
                      ? 'none'
                      : 'drop-shadow(0 0 4px rgba(255,214,10,0.5)) drop-shadow(0 0 12px rgba(167,139,250,0.4))',
                  }}
                >
                  FAN MADE EDITION
                </span>
              </motion.p>
            </motion.div>

            {/* ── Loading text ── */}
            <motion.p
              className="mt-10 text-[11px] tracking-[0.25em] uppercase font-medium"
              style={{ color: 'rgba(255,214,10,0.35)' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0.5, 0.25, 0.5, 0.5, 0.25, 0.5, 0.5] }}
              transition={{ delay: 1.2, duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              Loading
            </motion.p>

            {/* ── Loading bar ── */}
            <motion.div
              className="mt-3 w-48 h-[2px] rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.06)' }}
              initial={{ opacity: 0, scaleX: 0.8 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <motion.div
                className="h-full rounded-full"
                style={{
                  background: 'linear-gradient(90deg, transparent, rgba(255,214,10,0.3) 10%, #FFD60A 50%, rgba(255,214,10,0.3) 90%, transparent)',
                  width: '60%',
                }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{
                  delay: 1.2,
                  duration: 1.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </motion.div>

            {/* ── Version text — fixed at bottom ── */}
            <motion.p
              className="absolute bottom-8 text-[10px] tracking-[0.15em] font-medium text-amber-400/60"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.6, duration: 0.8 }}
            >
              v1.0 Kotabaru Pride @2026
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========================================
          Main App Content
          ======================================== */}
      {!isLoading && (
        <>
          {/* Background */}
          <AnimatePresence mode="wait">
            <motion.div
              key={division}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <GradientBackground division={division} />
            </motion.div>
          </AnimatePresence>

          {/* Premium 3D Effects */}
          <Premium3DEffects
            color={division === 'male' ? 'gold' : 'pink'}
          />



          {/* Toast Notifications */}
          <ToastContainer toasts={toasts} removeToast={removeToast} />

          {/* Top Bar — Static flex item */}
          <TopBar
            division={division}
            onToggleDivision={toggleDivision}
            isAdminAuthenticated={isAdminAuthenticated}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            adminNotificationCount={isAdminAuthenticated && !adminOpen ? registrations.filter(r => r.status === 'pending').length : 0}
            onAdminClick={() => {
              if (isAdminAuthenticated) {
                setAdminOpen(true);
              } else {
                setAdminLoginOpen(true);
              }
            }}
          />

          {/* Admin Login — shown when not authenticated */}
          <AdminLogin
            isOpen={adminLoginOpen}
            onOpenChange={setAdminLoginOpen}
            onLogin={loginAdmin}
          />

          {/* Admin Panel — full-screen page mode when open */}
          {isAdminAuthenticated && adminOpen && (
            <AdminPanel
              division={division}
              tournament={currentTournament}
              registrations={registrations}
              onApprove={approveRegistration}
              onReject={rejectRegistration}
              onDelete={deleteRegistration}
              onDeleteAllRejected={deleteAllRejected}
              onSetMVP={setMVP}
              onRemoveMVP={removeMVP}
              onUpdateStatus={updateTournamentStatus}
              onGenerateTeams={generateTeams}
              onResetTeams={resetTeams}
              teamsCount={teams.length}
              onGenerateBracket={generateBracket}
              onFinalize={finalizeTournament}
              onResetSeason={resetSeason}
              onUpdatePrizePool={updatePrizePool}
              onCreateTournament={createTournament}
              onLogout={() => { logoutAdmin(); setAdminOpen(false); }}
              mode="page"
              isOpen={true}
              onOpenChange={(open) => setAdminOpen(open)}
            />
          )}

          {/* Main App Content — hidden when admin panel is open */}
          {!adminOpen && (
            <>
          {users.length === 0 && (
            <motion.button
              onClick={seedDatabase}
              className="fixed bottom-24 right-4 z-40 p-3 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-400"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Database className="w-5 h-5" />
            </motion.button>
          )}

          {/* Main Scrollable Content — contained scroll area */}
          <div ref={scrollRef} className="relative z-10 max-w-md mx-auto w-full px-4 pb-24 flex-1 min-h-0 overflow-y-auto lg:max-w-none lg:px-8 lg:pb-8" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 60px)', WebkitOverflowScrolling: 'touch' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={`${division}-${activeTab}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                {activeTab === 'dashboard' && (
                  <Dashboard
                    division={division}
                    tournament={tournamentInfo}
                    topPlayers={topPlayers}
                    onRegister={() => setActiveTab('tournament')}
                    onNavigate={(tab) => setActiveTab(tab)}
                    onViewPlayers={() => setPlayerListOpen(true)}
                    registeredCount={registrations.length}
                    registeredAvatars={registeredAvatars}
                    onViewPrize={() => setPrizeModalOpen(true)}
                    onViewDonation={() => { setDonationDefaultTab('donasi'); setActiveTab('donation'); }}
                    teamsCount={teams.length}
                    onViewTeams={() => setTeamListOpen(true)}
                    champion={championOfTheWeek}
                    mvp={mvpOfTheWeek}
                    leaderboardTab={leaderboardTab}
                    onLeaderboardTabChange={setLeaderboardTab}
                    topClubs={topClubs}
                    totalDonation={totalDonation}
                    onDonate={(amount, message, anonymous, paymentMethod, proofUrl, donorName) => donate(amount, message, anonymous, paymentMethod, proofUrl, donorName)}
                    totalSawer={totalSawer}
                    onSawer={sawer}
                  />
                )}

                {activeTab === 'tournament' && (
                  <TournamentTab
                    division={division}
                    tournament={currentTournament}
                    registrations={registrationList}
                    teams={teams}
                    isAdmin={isAdminAuthenticated}
                    onRegister={registerUser}
                    onApprove={approveRegistration}
                    onGenerateTeams={generateTeams}
                    onResetTeams={resetTeams}
                    onGenerateBracket={generateBracket}
                  />
                )}

                {activeTab === 'bracket' && (
                  <Bracket
                    division={division}
                    matches={matches}
                    isAdmin={isAdminAuthenticated}
                    onUpdateScore={updateMatchScore}
                    bracketType={currentTournament?.bracketType}
                    mvpUser={users.find(u => u.isMVP) || null}
                  />
                )}

                {activeTab === 'leaderboard' && (
                  <Leaderboard
                    division={division}
                    players={topPlayers}
                  />
                )}

                {activeTab === 'grandfinal' && (
                  <GrandFinal
                    division={division}
                    topPlayers={topPlayers}
                    prizePool={grandFinalData?.prizePool || gfPrizePool || 0}
                    weekNumber={currentTournament?.week || 1}
                    mvpUser={users.find(u => u.isMVP) || null}
                    isAdminAuthenticated={isAdminAuthenticated}
                    grandFinalData={grandFinalData}
                    qualifiedPlayers={qualifiedPlayers}
                    onSetupGrandFinal={setupGrandFinal}
                    onDeleteGrandFinal={deleteGrandFinal}
                    onUpdateScore={updateGFMatchScore}
                    onRefresh={fetchGrandFinal}
                    isSettingUp={isGFSettingUp}
                    isDeleting={isGFDeleting}
                    isUpdatingScore={isGFUpdatingScore}
                    gfPrizePool={gfPrizePool}
                    onGfPrizePoolChange={setGfPrizePool}
                  />
                )}

                {activeTab === 'donation' && (
                  <DonasiSawerTab
                    key={donationDefaultTab}
                    division={division}
                    totalDonation={totalDonation}
                    donations={donations}
                    tournamentId={currentTournament?.id}
                    tournamentPrizePool={currentTournament?.prizePool || 0}
                    totalSawer={totalSawer}
                    onDonate={(amount, message, anonymous, paymentMethod, proofUrl, donorName) => donate(amount, message, anonymous, paymentMethod, proofUrl, donorName)}
                    onSawer={sawer}
                    defaultTab={donationDefaultTab}
                  />
                )}

                {activeTab === 'history' && (
                  <TournamentHistory
                    division={division}
                    tournaments={historyTournaments}
                    onSelect={(id) => {
                      const tournament = historyTournaments.find(t => t.id === id);
                      setActiveTab('bracket');
                      addToast(`Memuat turnamen: ${tournament?.name || 'Turnamen'}`, 'info');
                    }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Player List Modal */}
          <PlayerListModal
            isOpen={playerListOpen}
            onOpenChange={setPlayerListOpen}
            players={playerListData}
            division={division}
          />

          {/* Team List Modal */}
          <TeamListModal
            isOpen={teamListOpen}
            onOpenChange={setTeamListOpen}
            teams={teams}
            division={division}
          />

          {/* Prize Breakdown Modal */}
          <PrizeBreakdownModal
            isOpen={prizeModalOpen}
            onOpenChange={setPrizeModalOpen}
            prizePool={currentTournament?.prizePool || 0}
            division={division}
          />

          {/* Player Profile Modal */}
          <PlayerProfileModal
            player={selectedPlayer ? {
              ...selectedPlayer,
              stats: {
                wins: userStats.get(selectedPlayer.id)?.wins ?? 0,
                losses: userStats.get(selectedPlayer.id)?.losses ?? 0,
                totalMatches: (userStats.get(selectedPlayer.id)?.wins ?? 0) + (userStats.get(selectedPlayer.id)?.losses ?? 0),
                winRate: (() => {
                  const w = userStats.get(selectedPlayer.id)?.wins ?? 0;
                  const l = userStats.get(selectedPlayer.id)?.losses ?? 0;
                  const total = w + l;
                  return total > 0 ? Math.round((w / total) * 100) : 0;
                })(),
                averageScore: (() => {
                  const playerTeamIds = new Set<string>();
                  for (const team of teams) {
                    if (team.members.some(m => m.user.id === selectedPlayer.id)) {
                      playerTeamIds.add(team.id);
                    }
                  }
                  let totalScore = 0;
                  let matchCount = 0;
                  for (const match of matches) {
                    if (match.status === 'completed' && match.teamAId && match.teamBId) {
                      if (playerTeamIds.has(match.teamAId)) {
                        totalScore += match.scoreA ?? 0;
                        matchCount++;
                      } else if (playerTeamIds.has(match.teamBId)) {
                        totalScore += match.scoreB ?? 0;
                        matchCount++;
                      }
                    }
                  }
                  return matchCount > 0 ? Math.round(totalScore / matchCount) : 0;
                })(),
                mvpCount: users.find(u => u.id === selectedPlayer.id && u.isMVP) ? 1 : 0,
                championCount: championOfTheWeek?.members.some(m => m.userId === selectedPlayer.id) ? 1 : 0,
              },
              recentMatches: [],
              achievements: [],
            } : null}
            division={division}
            onClose={() => setSelectedPlayer(null)}
          />

          {/* Desktop Footer — branding bar */}
          <footer className="hidden lg:block mt-auto flex-shrink-0 py-3 px-8 text-center">
            <div className="flex items-center justify-center gap-3 opacity-40">
              <span className="text-[10px] text-white/15 tracking-wide font-medium">
                &copy; 2026 IDOL META &mdash; Fan Made Edition
              </span>
              <span className="text-[10px] text-white/10">|</span>
              <span className="text-[10px] text-white/15 tracking-wide font-medium">
                IDOL META Kotabaru Pride — Fan Made Edition
              </span>
            </div>
          </footer>

          {/* Bottom Navigation — static flex item at bottom */}
          <Navigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            division={division}
            onToggleDivision={toggleDivision}
            isAdminAuthenticated={isAdminAuthenticated}
            onAdminClick={() => {
              if (isAdminAuthenticated) {
                setAdminOpen(true);
              } else {
                setAdminLoginOpen(true);
              }
            }}
          />

          {/* Live Match Chat — mobile-only floating button + slide-up panel */}
          <LiveChat tournamentId={currentTournament?.id} division={division} />

          {/* PWA Install Prompt — Add to Home Screen */}
          <PWAInstallPrompt />
            </>
          )}
        </>
      )}
    </main>
  );
}
