'use client';

import { motion } from 'framer-motion';

/* ── Trophy3D Component ── */
interface TrophyProps {
  size?: 'sm' | 'md' | 'lg';
  division?: 'male' | 'female';
  animate?: boolean;
}

export function Trophy3D({ size = 'md', division = 'male', animate = true }: TrophyProps) {
  const sizes = {
    sm: { container: 'w-12 h-12', trophy: 'w-8 h-8' },
    md: { container: 'w-16 h-16', trophy: 'w-12 h-12' },
    lg: { container: 'w-24 h-24', trophy: 'w-16 h-16' },
  };

  const gradId = `tgrad-${size}-${division}`;
  const shineId = `tshine-${size}-${division}`;

  // Metallic gold / metallic purple gradients
  const primary = division === 'male' ? '#FFD60A' : '#A78BFA';
  const secondary = division === 'male' ? '#FFED4A' : '#C4B5FD';
  const dark = division === 'male' ? '#B8860B' : '#7C3AED';

  return (
    <motion.div
      className={`${sizes[size].container} relative flex items-center justify-center`}
      animate={
        animate
          ? {
              y: [0, -4, 0],
              rotate: [0, 2, -2, 0],
            }
          : undefined
      }
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Soft glow */}
      <div
        className="absolute inset-0 rounded-full blur-xl opacity-30"
        style={{ backgroundColor: primary }}
      />

      {/* Trophy SVG */}
      <svg
        viewBox="0 0 100 100"
        className={`${sizes[size].trophy} relative z-10`}
        fill="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={secondary} />
            <stop offset="45%" stopColor={primary} />
            <stop offset="100%" stopColor={dark} />
          </linearGradient>
          <linearGradient id={shineId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="white" stopOpacity="0.55" />
            <stop offset="45%" stopColor="white" stopOpacity="0.18" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Left Handle */}
        <path
          d="M15 35 Q5 35 5 45 Q5 55 15 55"
          stroke={`url(#${gradId})`}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Right Handle */}
        <path
          d="M85 35 Q95 35 95 45 Q95 55 85 55"
          stroke={`url(#${gradId})`}
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />

        {/* Cup Body */}
        <path
          d="M20 20 L20 45 Q20 70 50 70 Q80 70 80 45 L80 20 Z"
          fill={`url(#${gradId})`}
        />

        {/* Cup Shine */}
        <path
          d="M25 25 L25 42 Q25 60 45 60 L45 25 Z"
          fill={`url(#${shineId})`}
        />

        {/* Cup Rim */}
        <ellipse cx="50" cy="20" rx="30" ry="6" fill={primary} />

        {/* Inner Rim Shadow */}
        <ellipse cx="50" cy="22" rx="25" ry="4" fill="rgba(0,0,0,0.3)" />

        {/* Neck */}
        <rect x="42" y="70" width="16" height="8" fill={`url(#${gradId})`} />

        {/* Base */}
        <path
          d="M30 78 L30 85 Q30 90 50 90 Q70 90 70 85 L70 78 Z"
          fill={`url(#${gradId})`}
        />

        {/* Base Top */}
        <ellipse cx="50" cy="78" rx="20" ry="4" fill={secondary} />

        {/* Star */}
        <polygon
          points="50,30 52,36 58,36 53,40 55,46 50,42 45,46 47,40 42,36 48,36"
          fill="white"
        />
        <polygon
          points="35,40 36.5,44 40.5,44 37.5,47 39,51 35,48 31,51 32.5,47 29.5,44 33.5,44"
          fill="white"
          opacity="0.8"
        />
        <polygon
          points="65,40 66.5,44 70.5,44 67.5,47 69,51 65,48 61,51 62.5,47 59.5,44 63.5,44"
          fill="white"
          opacity="0.8"
        />
      </svg>
    </motion.div>
  );
}

/* ── PrizePoolCard Component ── */
interface PrizePoolCardProps {
  amount: number;
  division: 'male' | 'female';
  label?: string;
  showTimer?: boolean;
  timeRemaining?: string;
}

export function PrizePoolCard({
  amount,
  division,
  label = 'Prize Pool',
  showTimer = false,
  timeRemaining = '48h',
}: PrizePoolCardProps) {
  const isMale = division === 'male';

  return (
    <motion.div
      className={`relative overflow-hidden rounded-3xl p-5 ${isMale ? 'card-gold' : 'card-pink'}`}
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 28,
        delay: 0.1,
      }}
    >
      {/* Decorative glow orb */}
      <div
        className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{
          background: isMale
            ? 'radial-gradient(circle, #FFD60A 0%, transparent 70%)'
            : 'radial-gradient(circle, #A78BFA 0%, transparent 70%)',
        }}
      />

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Trophy icon */}
          <Trophy3D size="md" division={division} />

          {/* Amount & label */}
          <div>
            <p className="text-[11px] text-white/30 uppercase tracking-[0.15em] font-semibold">
              {label}
            </p>
            <p
              className={`text-[26px] font-black tracking-tight ${
                isMale ? 'gradient-gold' : 'gradient-pink'
              }`}
            >
              ${amount.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

        {/* Timer */}
        {showTimer && (
          <div className="text-right">
            <p className="text-[10px] text-white/25 uppercase tracking-[0.15em] font-medium">
              Ends in
            </p>
            <p className="text-lg font-bold text-white/90 tracking-tight">{timeRemaining}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
