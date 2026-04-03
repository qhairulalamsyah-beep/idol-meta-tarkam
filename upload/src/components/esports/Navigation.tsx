'use client';

import { motion } from 'framer-motion';
import {
  Home,
  Trophy,
  Swords,
  GitBranch,
  BarChart3,
  Crown,
  Shield,
  Sparkles,
} from 'lucide-react';

/* ────────────────────────────────────────────
   Types
   ──────────────────────────────────────────── */

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  division: 'male' | 'female';
  onToggleDivision?: () => void;
  isAdminAuthenticated?: boolean;
  onAdminClick?: () => void;
  adminNotificationCount?: number;
}

interface TopBarProps {
  division: 'male' | 'female';
  onToggleDivision: () => void;
  isAdminAuthenticated?: boolean;
  onAdminClick?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  adminNotificationCount?: number;
}

/* ────────────────────────────────────────────
   Tab Definitions — grandfinal is separate
   ──────────────────────────────────────────── */

const regularNavItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Home },
  { id: 'tournament', label: 'Tournament', icon: Swords },
  { id: 'bracket', label: 'Bracket', icon: GitBranch },
  { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
];

/* ────────────────────────────────────────────
   Gradient Token Helpers
   ──────────────────────────────────────────── */

function getDivisionTokens(division: 'male' | 'female') {
  const isMale = division === 'male';

  return {
    activeText: isMale ? 'text-amber-400' : 'text-purple-400',
    activeGlow: isMale
      ? 'drop-shadow-[0_0_8px_rgba(251,191,36,0.55)] drop-shadow-[0_0_20px_rgba(251,191,36,0.2)]'
      : 'drop-shadow-[0_0_8px_rgba(192,132,252,0.55)] drop-shadow-[0_0_20px_rgba(192,132,252,0.2)]',

    pillFrom: isMale ? 'from-amber-400/20' : 'from-purple-400/20',
    pillVia: isMale ? 'via-amber-500/10' : 'via-purple-500/10',
    pillTo: isMale ? 'to-amber-300/5' : 'to-purple-300/5',
    pillShadow: isMale
      ? 'shadow-[0_0_24px_rgba(251,191,36,0.12),0_0_48px_rgba(251,191,36,0.06)]'
      : 'shadow-[0_0_24px_rgba(192,132,252,0.12),0_0_48px_rgba(192,132,252,0.06)]',

    borderFrom: isMale ? 'from-amber-500/30' : 'from-purple-500/30',
    borderVia: isMale ? 'via-yellow-400/10' : 'via-violet-400/10',
    borderTo: isMale ? 'to-amber-400/30' : 'to-purple-400/30',

    /* Top bar tokens */
    logoGradient: isMale
      ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600'
      : 'bg-gradient-to-br from-purple-400 via-violet-500 to-purple-600',
    logoShadow: isMale
      ? '0 2px 12px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.35)'
      : '0 2px 12px rgba(192,132,252,0.35), inset 0 1px 0 rgba(255,255,255,0.35)',
    titleGradient: isMale
      ? 'bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400 bg-clip-text text-transparent'
      : 'bg-gradient-to-r from-purple-300 via-violet-200 to-purple-400 bg-clip-text text-transparent',

    toggleActiveBg: isMale
      ? 'bg-gradient-to-r from-amber-400 to-yellow-500 text-black'
      : 'bg-gradient-to-r from-purple-400 to-violet-500 text-white/90',

    adminDot: isMale ? 'bg-amber-400' : 'bg-purple-400',
    adminActiveBg: isMale
      ? 'bg-amber-400/12 text-amber-400/80 border border-amber-400/20'
      : 'bg-purple-400/12 text-purple-400/80 border border-purple-400/20',

    /* Grand Final specific tokens */
    gfGradientFrom: isMale ? 'from-amber-300' : 'from-purple-300',
    gfGradientVia: isMale ? 'via-yellow-400' : 'via-violet-400',
    gfGradientTo: isMale ? 'to-amber-500' : 'to-purple-500',
    gfGlowColor: isMale ? '251,191,36' : '192,132,252',
    gfGlowColor2: isMale ? '255,215,0' : '167,139,250',
    gfTextColor: isMale ? 'text-amber-900' : 'text-purple-900',
    gfRingColor: isMale ? 'rgba(251,191,36,0.35)' : 'rgba(192,132,252,0.35)',
  };
}

/* ════════════════════════════════════════════
   Navigation  –  iOS-style bottom tab bar
   with floating Grand Final center button
   ════════════════════════════════════════════ */

export function Navigation({ activeTab, onTabChange, division, onToggleDivision, isAdminAuthenticated, onAdminClick }: NavigationProps) {
  const t = getDivisionTokens(division);
  const isGfActive = activeTab === 'grandfinal';

  return (
    <>
    {/* ── Mobile Bottom Nav (hidden on tablet and desktop) ── */}
    <nav
      className="fixed bottom-0 left-0 right-0 z-[55] flex justify-center md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {/* ── Floating bar container ──────────────── */}
      <motion.div
        className="relative w-full max-w-[420px] mx-3"
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      >
        {/* Glass bar */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            boxShadow: '0 -8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          {/* Top accent line */}
          <div
            className="absolute top-0 left-4 right-4 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${t.gfGlowColor},0.3), transparent)`,
            }}
          />

          <div className="relative flex items-center justify-around px-2 py-2">
            {/* ── Left group: Dashboard, Tournament ── */}
            {regularNavItems.slice(0, 2).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl cursor-pointer outline-none"
                  style={{ touchAction: 'manipulation' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(180deg, rgba(${t.gfGlowColor},0.12) 0%, rgba(${t.gfGlowColor},0.04) 100%)`,
                        border: `1px solid rgba(${t.gfGlowColor},0.2)`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/50'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/45'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}

            {/* ═══════════════════════════════════════
                GRAND FINAL — Center Button
                ═══════════════════════════════════════ */}
            <motion.button
              onClick={() => onTabChange('grandfinal')}
              className="relative z-20 flex flex-col items-center justify-center cursor-pointer outline-none mx-1"
              style={{ touchAction: 'manipulation' }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              {/* Glow ring */}
              {isGfActive && (
                <motion.div
                  className="absolute rounded-full"
                  style={{
                    width: 64,
                    height: 64,
                    background: `radial-gradient(circle, rgba(${t.gfGlowColor},0.15) 0%, transparent 70%)`,
                  }}
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}

              {/* Main circle */}
              <motion.div
                className="relative rounded-full flex items-center justify-center"
                style={{
                  width: 52,
                  height: 52,
                  background: `linear-gradient(135deg, rgba(${t.gfGlowColor},1) 0%, rgba(${t.gfGlowColor2},1) 100%)`,
                  boxShadow: `0 4px 16px rgba(${t.gfGlowColor},0.35), 0 0 0 3px rgba(${t.gfGlowColor},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                }}
                animate={isGfActive ? {
                  boxShadow: [
                    `0 4px 16px rgba(${t.gfGlowColor},0.35), 0 0 0 3px rgba(${t.gfGlowColor},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 24px rgba(${t.gfGlowColor},0.5), 0 0 0 4px rgba(${t.gfGlowColor},0.25), inset 0 1px 0 rgba(255,255,255,0.3)`,
                    `0 4px 16px rgba(${t.gfGlowColor},0.35), 0 0 0 3px rgba(${t.gfGlowColor},0.15), inset 0 1px 0 rgba(255,255,255,0.3)`,
                  ]
                } : {}}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Crown
                  className="w-6 h-6 text-black/80"
                  strokeWidth={2.2}
                />
              </motion.div>

            </motion.button>

            {/* ── Right group: Bracket, Leaderboard ── */}
            {regularNavItems.slice(2, 4).map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <motion.button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className="relative flex flex-col items-center justify-center flex-1 min-h-[48px] rounded-xl cursor-pointer outline-none"
                  style={{ touchAction: 'manipulation' }}
                  whileTap={{ scale: 0.92 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                >
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(180deg, rgba(${t.gfGlowColor},0.12) 0%, rgba(${t.gfGlowColor},0.04) 100%)`,
                        border: `1px solid rgba(${t.gfGlowColor},0.2)`,
                      }}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  <Icon
                    className={`w-[22px] h-[22px] relative z-10 transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/50'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                  <span
                    className={`relative z-10 mt-1 text-[10px] font-semibold tracking-wide transition-all duration-200 ${
                      isActive ? t.activeText : 'text-white/45'
                    }`}
                  >
                    {item.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    </nav>

    </>
  );
}

/* ════════════════════════════════════════════
   TopBar  –  Premium glass header
   Mobile: floating pill bar
   Desktop: full-width glass bar with horizontal nav tabs
   ════════════════════════════════════════════ */

export function TopBar({
  division,
  onToggleDivision,
  isAdminAuthenticated,
  onAdminClick,
  activeTab = 'dashboard',
  onTabChange,
  adminNotificationCount = 0,
}: TopBarProps) {
  const t = getDivisionTokens(division);
  const isMale = division === 'male';

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div
        className="relative"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* ── Mobile: Compact header ── */}
        <motion.div
          className="mx-3 max-w-[420px] md:hidden lg:hidden"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          {/* Glass header */}
          <div
            className="relative rounded-b-2xl overflow-hidden"
            style={{
              background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-6 right-6 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${t.gfGlowColor},0.25), transparent)`,
              }}
            />

            <div className="flex items-center justify-between px-3.5 py-2.5">
              {/* Left: Logo + Title */}
              <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onTabChange?.('dashboard')}
              >
                <motion.div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, rgba(${t.gfGlowColor},1) 0%, rgba(${t.gfGlowColor2},1) 100%)`,
                    boxShadow: `0 2px 8px rgba(${t.gfGlowColor},0.3)`,
                  }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                  <Crown className="w-3.5 h-3.5 text-black/80" strokeWidth={2.5} />
                </motion.div>

                <div className="flex flex-col leading-tight">
                  <span className={`text-[13px] font-bold tracking-tight ${t.titleGradient}`}>
                    IDOL META
                  </span>
                  <span className="text-[8px] font-medium text-white/40 tracking-wide">
                    Fan Made Edition
                  </span>
                </div>
              </div>

              {/* Right: Toggle + Admin */}
              <div className="flex items-center gap-1.5">
                {/* Division toggle */}
                <div
                  className="relative flex rounded-lg overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  <button
                    onClick={() => division !== 'male' && onToggleDivision()}
                    className={`px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                      division === 'male'
                        ? `bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-l-md`
                        : 'text-white/45 hover:text-white/60'
                    }`}
                  >
                    Male
                  </button>
                  <button
                    onClick={() => division !== 'female' && onToggleDivision()}
                    className={`px-2.5 py-1 text-[10px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                      division === 'female'
                        ? `bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-r-md`
                        : 'text-white/45 hover:text-white/60'
                    }`}
                  >
                    Female
                  </button>
                </div>

                {/* Admin */}
                <motion.button
                  onClick={onAdminClick}
                  className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                    isAdminAuthenticated
                      ? `bg-gradient-to-br from-amber-400/15 to-orange-500/10 border border-amber-400/20`
                      : 'bg-white/[0.04] border border-white/[0.05]'
                  }`}
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  <Shield
                    className={`w-4 h-4 ${isAdminAuthenticated ? t.activeText : 'text-white/40'}`}
                    strokeWidth={1.8}
                  />
                  {isAdminAuthenticated && adminNotificationCount > 0 && (
                    <motion.div
                      className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black px-1 ${
                        division === 'male' ? 'bg-amber-400' : 'bg-violet-400'
                      }`}
                      style={{ boxShadow: `0 0 6px rgba(${division === 'male' ? '251,191,36' : '192,132,252'},0.4)` }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                    >
                      {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                    </motion.div>
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            Tablet: Full-width header with nav tabs
            ═══════════════════════════════════════════════ */}
        <motion.div
          className="hidden md:block lg:hidden"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <div
            className="relative"
            style={{
              background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${t.gfGlowColor},0.2), transparent)`,
              }}
            />

            <div className="max-w-4xl mx-auto px-4">
              <div className="flex items-center justify-between h-14">
                {/* Left: Logo + Nav Tabs */}
                <div className="flex items-center gap-4">
                  {/* Logo */}
                  <div
                    className="flex items-center gap-2 flex-shrink-0 cursor-pointer"
                    onClick={() => onTabChange?.('dashboard')}
                  >
                    <motion.div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, rgba(${t.gfGlowColor},1) 0%, rgba(${t.gfGlowColor2},1) 100%)`,
                        boxShadow: `0 2px 8px rgba(${t.gfGlowColor},0.3)`,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Crown className="w-4 h-4 text-black/80" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex flex-col leading-tight">
                      <span className={`text-[14px] font-bold tracking-tight ${t.titleGradient}`}>
                        IDOL META
                      </span>
                      <span className="text-[9px] font-medium text-white/40 tracking-wide">
                        Fan Made Edition
                      </span>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="w-px h-6 bg-white/[0.06]" />

                  {/* Nav Tabs */}
                  <nav className="flex items-center gap-0.5">
                    {regularNavItems.map((item) => (
                      <TopBarTab key={item.id} item={item} division={division} isActive={activeTab === item.id} onClick={() => onTabChange?.(item.id)} />
                    ))}

                    {/* Grand Final — special tab */}
                    <TopBarGrandFinalTab division={division} isActive={activeTab === 'grandfinal'} onClick={() => onTabChange?.('grandfinal')} />
                  </nav>
                </div>

                {/* Right: Division toggle + Admin */}
                <div className="flex items-center gap-2">
                  {/* Division toggle */}
                  <div
                    className="relative flex rounded-lg overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <button
                      onClick={() => division !== 'male' && onToggleDivision()}
                      className={`px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                        division === 'male'
                          ? `bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-l-md`
                          : 'text-white/45 hover:text-white/60'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => division !== 'female' && onToggleDivision()}
                      className={`px-3 py-1.5 text-[11px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                        division === 'female'
                          ? `bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-r-md`
                          : 'text-white/45 hover:text-white/60'
                      }`}
                    >
                      Female
                    </button>
                  </div>

                  {/* Admin */}
                  <motion.button
                    onClick={onAdminClick}
                    className={`relative w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isAdminAuthenticated
                        ? `bg-gradient-to-br from-amber-400/15 to-orange-500/10 border border-amber-400/20`
                        : 'bg-white/[0.04] border border-white/[0.05]'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Shield
                      className={`w-4.5 h-4.5 ${isAdminAuthenticated ? t.activeText : 'text-white/40'}`}
                      strokeWidth={1.8}
                    />
                    {isAdminAuthenticated && adminNotificationCount > 0 && (
                      <motion.div
                        className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black px-1 ${
                          division === 'male' ? 'bg-amber-400' : 'bg-violet-400'
                        }`}
                        style={{ boxShadow: `0 0 6px rgba(${division === 'male' ? '251,191,36' : '192,132,252'},0.4)` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                      </motion.div>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ═══════════════════════════════════════════════
            Desktop: Full-width glass bar with nav tabs
            ═══════════════════════════════════════════════ */}
        <motion.div
          className="hidden lg:block"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        >
          <div
            className="relative"
            style={{
              background: 'linear-gradient(180deg, rgba(30,30,35,0.92) 0%, rgba(20,20,25,0.95) 100%)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05)',
            }}
          >
            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-[1px]"
              style={{
                background: `linear-gradient(90deg, transparent, rgba(${t.gfGlowColor},0.2), transparent)`,
              }}
            />

            <div className="max-w-6xl mx-auto px-6 lg:px-8">
              <div className="flex items-center justify-between h-12">
                {/* Left: Logo + Nav Tabs */}
                <div className="flex items-center gap-6">
                  {/* Logo */}
                  <div
                    className="flex items-center gap-2 flex-shrink-0 cursor-pointer"
                    onClick={() => onTabChange?.('dashboard')}
                  >
                    <motion.div
                      className="w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, rgba(${t.gfGlowColor},1) 0%, rgba(${t.gfGlowColor2},1) 100%)`,
                        boxShadow: `0 2px 8px rgba(${t.gfGlowColor},0.3)`,
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Crown className="w-3.5 h-3.5 text-black/80" strokeWidth={2.5} />
                    </motion.div>
                    <div className="flex flex-col leading-tight">
                      <span className={`text-[14px] font-bold tracking-tight ${t.titleGradient}`}>
                        IDOL META
                      </span>
                      <span className="text-[8px] font-medium text-white/40 tracking-wide">
                        Fan Made Edition
                      </span>
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="w-px h-6 bg-white/[0.06]" />

                  {/* Nav Tabs */}
                  <nav className="flex items-center gap-0.5">
                    {regularNavItems.map((item) => (
                      <TopBarTab key={item.id} item={item} division={division} isActive={activeTab === item.id} onClick={() => onTabChange?.(item.id)} />
                    ))}

                    {/* Grand Final — special tab */}
                    <TopBarGrandFinalTab division={division} isActive={activeTab === 'grandfinal'} onClick={() => onTabChange?.('grandfinal')} />
                  </nav>
                </div>

                {/* Right: Division toggle + Admin */}
                <div className="flex items-center gap-2">
                  {/* Division toggle */}
                  <div
                    className="relative flex rounded-lg overflow-hidden"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.05)',
                    }}
                  >
                    <button
                      onClick={() => division !== 'male' && onToggleDivision()}
                      className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                        division === 'male'
                          ? `bg-gradient-to-r from-amber-400 to-yellow-500 text-black rounded-l-md`
                          : 'text-white/45 hover:text-white/60'
                      }`}
                    >
                      Male
                    </button>
                    <button
                      onClick={() => division !== 'female' && onToggleDivision()}
                      className={`px-3 py-1 text-[11px] font-semibold tracking-wide transition-colors duration-200 cursor-pointer ${
                        division === 'female'
                          ? `bg-gradient-to-r from-purple-400 to-violet-500 text-white rounded-r-md`
                          : 'text-white/45 hover:text-white/60'
                      }`}
                    >
                      Female
                    </button>
                  </div>

                  {/* Admin */}
                  <motion.button
                    onClick={onAdminClick}
                    className={`relative w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                      isAdminAuthenticated
                        ? `bg-gradient-to-br from-amber-400/15 to-orange-500/10 border border-amber-400/20`
                        : 'bg-white/[0.04] border border-white/[0.05]'
                    }`}
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    <Shield
                      className={`w-4 h-4 ${isAdminAuthenticated ? t.activeText : 'text-white/40'}`}
                      strokeWidth={1.8}
                    />
                    {isAdminAuthenticated && adminNotificationCount > 0 && (
                      <motion.div
                        className={`absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-black px-1 ${
                          division === 'male' ? 'bg-amber-400' : 'bg-violet-400'
                        }`}
                        style={{ boxShadow: `0 0 6px rgba(${division === 'male' ? '251,191,36' : '192,132,252'},0.4)` }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        {adminNotificationCount > 99 ? '99+' : adminNotificationCount}
                      </motion.div>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </header>
  );
}

/* ════════════════════════════════════════════
   Desktop Nav Tab — used inside TopBar
   ════════════════════════════════════════════ */

function TopBarTab({
  item,
  division,
  isActive,
  onClick,
}: {
  item: NavItem;
  division: 'male' | 'female';
  isActive: boolean;
  onClick: () => void;
}) {
  const t = getDivisionTokens(division);
  const Icon = item.icon;

  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide cursor-pointer outline-none transition-all duration-200"
      style={{
        color: isActive ? t.activeText : 'rgba(255,255,255,0.45)',
        background: isActive ? `linear-gradient(180deg, rgba(${t.gfGlowColor},0.1) 0%, rgba(${t.gfGlowColor},0.03) 100%)` : 'transparent',
        border: isActive ? `1px solid rgba(${t.gfGlowColor},0.15)` : '1px solid transparent',
      }}
      whileHover={{ scale: isActive ? 1 : 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Icon
        className="w-[15px] h-[15px]"
        strokeWidth={isActive ? 2.2 : 1.8}
      />
      <span>{item.label}</span>
    </motion.button>
  );
}

/* ════════════════════════════════════════════
   Desktop Grand Final Tab — special golden tab
   ════════════════════════════════════════════ */

function TopBarGrandFinalTab({
  division,
  isActive,
  onClick,
}: {
  division: 'male' | 'female';
  isActive: boolean;
  onClick: () => void;
}) {
  const t = getDivisionTokens(division);

  return (
    <motion.button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer outline-none transition-all duration-200"
      style={{
        color: isActive ? t.activeText : 'rgba(255,255,255,0.5)',
        background: `linear-gradient(135deg, rgba(${t.gfGlowColor},0.15) 0%, rgba(${t.gfGlowColor2},0.1) 100%)`,
        border: `1px solid rgba(${t.gfGlowColor},0.2)`,
        boxShadow: isActive ? `0 0 12px rgba(${t.gfGlowColor},0.15)` : 'none',
      }}
      whileHover={{ scale: isActive ? 1 : 1.02 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <Crown
        className="w-[15px] h-[15px]"
        strokeWidth={2}
      />
      <span>GF</span>
      {isActive && (
        <Sparkles className="w-3 h-3" style={{ color: `rgba(${t.gfGlowColor},0.6)` }} />
      )}
    </motion.button>
  );
}
