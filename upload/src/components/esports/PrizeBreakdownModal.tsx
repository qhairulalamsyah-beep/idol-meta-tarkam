'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trophy,
  Medal,
  Star,
  Crown,
  Zap,
  Coins,
} from 'lucide-react';

interface PrizeBreakdownModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  prizePool: number;
  division: 'male' | 'female';
}

const prizeTiers = [
  {
    rank: 1,
    label: 'Juara 1',
    subtitle: 'Champion',
    percentage: 0.5,
    icon: Trophy,
    colors: {
      bg: 'from-amber-400 via-yellow-400 to-amber-500',
      text: 'text-amber-400',
      ring: 'ring-amber-400/30',
      bgSoft: 'bg-amber-400/10',
      border: 'border-amber-400/15',
      glow: 'rgba(255,214,10,0.15)',
    },
  },
  {
    rank: 2,
    label: 'Juara 2',
    subtitle: 'Runner-up',
    percentage: 0.25,
    icon: Medal,
    colors: {
      bg: 'from-gray-200 via-gray-300 to-gray-400',
      text: 'text-gray-300',
      ring: 'ring-gray-300/30',
      bgSoft: 'bg-gray-300/10',
      border: 'border-gray-300/15',
      glow: 'rgba(200,200,210,0.1)',
    },
  },
  {
    rank: 3,
    label: 'Juara 3',
    subtitle: '3rd Place',
    percentage: 0.15,
    icon: Medal,
    colors: {
      bg: 'from-orange-400 via-orange-500 to-orange-600',
      text: 'text-orange-400',
      ring: 'ring-orange-400/30',
      bgSoft: 'bg-orange-400/10',
      border: 'border-orange-400/15',
      glow: 'rgba(255,140,50,0.1)',
    },
  },
  {
    rank: 0,
    label: 'MVP',
    subtitle: 'Most Valuable Player',
    percentage: 0.10,
    icon: Zap,
    colors: {
      bg: 'from-amber-400 via-amber-500 to-orange-500',
      text: 'text-amber-400',
      ring: 'ring-amber-400/30',
      bgSoft: 'bg-amber-400/10',
      border: 'border-amber-400/15',
      glow: 'rgba(255,214,10,0.1)',
    },
  },
];

export function PrizeBreakdownModal({ isOpen, onOpenChange, prizePool, division }: PrizeBreakdownModalProps) {
  const isMale = division === 'male';
  const accentClass = isMale ? 'text-amber-400' : 'text-violet-400';
  const accentBg = isMale ? 'bg-amber-400/12' : 'bg-violet-400/12';

  const formatCurrency = (amount: number) => {
    return 'Rp. ' + amount.toLocaleString('id-ID');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="prize-modal"
          className="fixed inset-0 z-50 flex flex-col justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-md"
            onClick={() => onOpenChange(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Sheet - with drag to close */}
          <motion.div
            className="relative glass rounded-t-[32px] w-full max-w-md lg:max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
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
            <div className="flex justify-center pt-4 pb-2 flex-shrink-0 cursor-grab active:cursor-grabbing">
              <div className="w-12 h-[5px] rounded-full bg-white/20 shadow-sm shadow-white/10" />
            </div>

            {/* Header */}
            <div className="px-6 pb-4 pt-1 flex-shrink-0">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl ${accentBg} flex items-center justify-center`}>
                    <Trophy className={`w-[18px] h-[18px] ${accentClass}`} />
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold text-white/90 tracking-tight leading-tight">Distribusi Hadiah</h2>
                    <p className="text-[11px] text-white/30 mt-0.5 font-medium">
                      Total Prize Pool
                    </p>
                  </div>
                </div>
              </div>

              {/* Total Prize Pool — Large Gradient Text */}
              <motion.div
                className="glass-subtle rounded-2xl p-5 lg:p-6 text-center relative overflow-hidden"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.4 }}
              >
                {/* Subtle gradient bg */}
                <div className={`absolute inset-0 opacity-40 ${
                  isMale
                    ? 'bg-gradient-to-br from-amber-500/10 via-transparent to-amber-500/5'
                    : 'bg-gradient-to-br from-violet-500/10 via-transparent to-violet-500/5'
                }`} />

                <div className="relative flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className={`w-5 h-5 ${accentClass}`} />
                    <span className="text-[11px] text-white/40 uppercase tracking-[0.15em] font-bold">
                      Total Hadiah
                    </span>
                    <Crown className={`w-5 h-5 ${accentClass}`} />
                  </div>
                  <p className={`text-3xl font-black tracking-tight leading-none ${
                    isMale ? 'gradient-gold' : 'gradient-pink'
                  }`}>
                    {formatCurrency(prizePool)}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Prize List */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8">
              <div className="space-y-3">
                {prizeTiers.map((tier, index) => {
                  const Icon = tier.icon;
                  const amount = Math.round(prizePool * tier.percentage);

                  return (
                    <motion.div
                      key={tier.label}
                      className={`glass-subtle rounded-2xl p-4 border ${tier.colors.border} relative overflow-hidden transition-all duration-300`}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.15 + index * 0.07,
                        duration: 0.4,
                        ease: [0.25, 0.46, 0.45, 0.94],
                      }}
                      whileHover={{
                        y: -1,
                        boxShadow: `0 4px 20px ${tier.colors.glow}`,
                      }}
                    >
                      {/* Subtle gradient accent bg */}
                      <div className={`absolute inset-0 opacity-30 bg-gradient-to-r ${tier.colors.bg} opacity-[0.04]`} />

                      <div className="relative flex items-center gap-3.5">
                        {/* Rank Icon — Premium */}
                        <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.colors.bg} flex items-center justify-center flex-shrink-0`}
                          style={{
                            boxShadow: `0 2px 10px ${tier.colors.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                          }}
                        >
                          <Icon className="w-5 h-5 text-black" />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[15px] font-bold text-white/90">{tier.label}</p>
                            <span className="text-[10px] text-white/20 font-medium">{tier.subtitle}</span>
                          </div>
                          <p className="text-[11px] text-white/25 mt-0.5 font-medium">
                            {Math.round(tier.percentage * 100)}% dari total
                          </p>
                        </div>

                        {/* Amount */}
                        <div className="text-right flex-shrink-0">
                          <p className={`text-[16px] font-black tabular-nums ${tier.colors.text}`}>
                            {formatCurrency(amount)}
                          </p>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3.5 h-1 rounded-full bg-white/[0.04] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full bg-gradient-to-r ${tier.colors.bg}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${tier.percentage * 100}%` }}
                          transition={{ delay: 0.3 + index * 0.12, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
                        />
                      </div>
                    </motion.div>
                  );
                })}

                {/* Note */}
                <motion.div
                  className="flex items-start gap-2.5 pt-3 px-1"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <Coins className="w-3.5 h-3.5 text-white/15 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-white/20 leading-relaxed">
                    Distribusi hadiah dapat berubah sesuai keputusan admin. Hadiah akan diberikan setelah turnamen selesai dan difinalisasi.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
