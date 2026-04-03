'use client';

import { motion } from 'framer-motion';

/* ═══════════════════════════════════════════════════════════════════
   IDOL META (TARKAM) — Premium Esports Background System
   Dynamic cyberpunk arena backdrop — no static images
   Mobile-optimized: heavy effects hidden on small screens
   ═══════════════════════════════════════════════════════════════════ */

/* ── Division Color Tokens ── */
const DIVISION_THEMES = {
  male: {
    primary: '255,214,10',    // Gold
    secondary: '255,159,10',  // Amber
    tertiary: '229,168,0',    // Dark gold
    hex1: '#FFD60A',
    hex2: '#FF9F0A',
  },
  female: {
    primary: '167,139,250',   // Soft Purple
    secondary: '139,92,246',  // Violet
    tertiary: '139,92,246',    // Deep Purple
    hex1: '#A78BFA',
    hex2: '#7C3AED',
  },
} as const;

type Division = 'male' | 'female';

/* ═══════════════════════════════════════════════════════════════════
   GRADIENT BACKGROUND — Pure CSS/Dynamic esports arena backdrop
   Mobile: base gradient + 2 blobs + hex pattern + vignette only
   ═══════════════════════════════════════════════════════════════════ */

export function GradientBackground({ division }: { division: Division }) {
  const theme = DIVISION_THEMES[division];

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none" style={{ background: '#050507' }}>
      {/* ── LAYER 1: Base dark gradient (CSS only, always shown) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 120% 80% at 50% 120%, rgba(${theme.primary},0.03) 0%, transparent 60%),
            radial-gradient(ellipse 80% 60% at 20% 80%, rgba(${theme.secondary},0.025) 0%, transparent 50%),
            radial-gradient(ellipse 80% 60% at 80% 20%, rgba(${theme.tertiary},0.02) 0%, transparent 50%),
            linear-gradient(180deg, #050507 0%, #0B0B0F 40%, #080810 100%)
          `,
        }}
      />

      {/* ── LAYER 2: Mesh gradient blobs ── */}
      {/* Mobile: Static CSS gradient (no animation) — saves 3 framer-motion loops */}
      <div className="absolute inset-0 lg:hidden">
        <div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${theme.primary},0.07) 0%, rgba(${theme.primary},0.02) 35%, transparent 65%)`,
            filter: 'blur(80px)',
            left: '-10%',
            bottom: '-15%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${theme.secondary},0.055) 0%, rgba(${theme.secondary},0.015) 35%, transparent 65%)`,
            filter: 'blur(70px)',
            right: '-8%',
            top: '-10%',
          }}
        />
      </div>
      {/* Desktop: Animated blobs */}
      <motion.div
        className="absolute inset-0 hidden lg:block"
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
      >
        {/* Blob 1 — Large warm glow, bottom-left */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${theme.primary},0.07) 0%, rgba(${theme.primary},0.02) 35%, transparent 65%)`,
            filter: 'blur(80px)',
            left: '-10%',
            bottom: '-15%',
          }}
          animate={{
            x: [0, 60, -30, 40, 0],
            y: [0, -40, 20, -25, 0],
            scale: [1, 1.15, 0.95, 1.1, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Blob 2 — Secondary glow, top-right */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${theme.secondary},0.055) 0%, rgba(${theme.secondary},0.015) 35%, transparent 65%)`,
            filter: 'blur(70px)',
            right: '-8%',
            top: '-10%',
          }}
          animate={{
            x: [0, -50, 25, -35, 0],
            y: [0, 30, -15, 20, 0],
            scale: [1, 1.1, 0.9, 1.08, 1],
          }}
          transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Blob 3 — Tertiary glow, center-right */}
        <div className="block">
          <motion.div
            className="absolute w-[550px] h-[550px] rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${theme.tertiary},0.04) 0%, transparent 55%)`,
              filter: 'blur(60px)',
              right: '15%',
              top: '30%',
            }}
            animate={{
              x: [0, -40, 20, -10, 0],
              y: [0, -30, 15, -20, 0],
            }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>

        {/* Blob 4 — Small accent, center-left */}
        <div className="block">
          <motion.div
            className="absolute w-[450px] h-[450px] rounded-full"
            style={{
              background: `radial-gradient(circle, rgba(${theme.primary},0.035) 0%, transparent 50%)`,
              filter: 'blur(50px)',
              left: '20%',
              top: '50%',
            }}
            animate={{
              x: [0, 30, -20, 15, 0],
              y: [0, -20, 30, -10, 0],
            }}
            transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>

      {/* ── LAYER 3: Hexagonal SVG pattern overlay (CSS only, always shown) ── */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cg fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: '28px 49px',
        }}
      />

      {/* ── LAYER 4: Animated Tron-style perspective grid (desktop only) ── */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[45%] overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            backgroundImage: `
              linear-gradient(rgba(${theme.primary},0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${theme.primary},0.12) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'bottom center',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 50%, transparent 100%)',
          }}
        />
        {/* Grid pulse line — horizontal glow that travels up the grid */}
        <motion.div
          className="absolute left-0 right-0 h-[2px]"
          style={{
            background: `linear-gradient(90deg, transparent 5%, rgba(${theme.primary},0.15) 30%, rgba(${theme.primary},0.25) 50%, rgba(${theme.primary},0.15) 70%, transparent 95%)`,
            boxShadow: `0 0 30px 8px rgba(${theme.primary},0.06), 0 0 60px 15px rgba(${theme.primary},0.03)`,
            transform: 'perspective(500px) rotateX(60deg)',
            transformOrigin: 'bottom center',
          }}
          animate={{ bottom: ['0%', '100%'] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'linear', delay: 2 }}
        />
      </div>

      {/* ── LAYER 5: Floating particle dots (stadium dust) ── */}
      {/* Desktop: 18 particles with full variety */}
      <div className="hidden lg:block">
        {Array.from({ length: 18 }).map((_, i) => {
          const left = `${(i * 5.3 + 2) % 96}%`;
          const size = 1 + (i % 3);
          const delay = i * 1.4;
          const duration = 14 + (i % 7) * 2;
          const opacity = 0.08 + (i % 5) * 0.04;
          const drift = ((i % 3) - 1) * 20;

          return (
            <div
              key={`particle-${i}`}
              className="absolute bottom-0"
              style={{
                left,
                width: size,
                height: size,
                borderRadius: '50%',
                background: `rgba(${theme.primary},${opacity})`,
                boxShadow: `0 0 ${size * 2}px rgba(${theme.primary},${opacity * 0.5})`,
                animation: `floatUp ${duration}s ${delay}s linear infinite`,
                willChange: 'transform, opacity',
              }}
            >
              <style>{`
                @keyframes floatUp {
                  0% {
                    transform: translateY(0) translateX(0);
                    opacity: 0;
                  }
                  5% {
                    opacity: ${opacity};
                  }
                  50% {
                    transform: translateY(-50vh) translateX(${drift}px);
                    opacity: ${opacity * 0.7};
                  }
                  95% {
                    opacity: ${opacity * 0.2};
                  }
                  100% {
                    transform: translateY(-105vh) translateX(${drift * 0.5}px);
                    opacity: 0;
                  }
                }
              `}</style>
            </div>
          );
        })}
      </div>

      {/* ── LAYER 6: Noise grain texture (CSS only, always shown) ── */}
      <div
        className="absolute inset-0 mix-blend-overlay opacity-[0.025]"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 1px,
              rgba(255,255,255,0.03) 1px,
              rgba(255,255,255,0.03) 2px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 1px,
              rgba(255,255,255,0.02) 1px,
              rgba(255,255,255,0.02) 2px
            )
          `,
          backgroundSize: '3px 3px',
        }}
      />

      {/* ── LAYER 7: Refined vignette (CSS only, always shown) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 70% 65% at 50% 45%, transparent 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.5) 75%, rgba(0,0,0,0.8) 100%)
          `,
        }}
      />

      {/* ── LAYER 8: Edge fade for seamless feel (CSS only, always shown) ── */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            linear-gradient(to bottom, rgba(5,5,7,0.4) 0%, transparent 15%),
            linear-gradient(to top, rgba(5,5,7,0.6) 0%, transparent 20%)
          `,
        }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   PREMIUM 3D EFFECTS — Geometric shapes, god rays, data streams,
   energy ring, depth grid — ultra premium gaming tournament feel
   Mobile: ALL heavy effects hidden, only 6 lightweight particles
   ═══════════════════════════════════════════════════════════════════ */

interface Premium3DEffectsProps {
  color?: 'gold' | 'pink';
  className?: string;
}

export function Premium3DEffects({
  color = 'gold',
  className = '',
}: Premium3DEffectsProps) {
  const isGold = color === 'gold';

  const accentRgb = isGold ? '255,214,10' : '167,139,250';
  const accentRgb2 = isGold ? '255,159,10' : '139,92,246';
  const accentRgb3 = isGold ? '229,168,0' : '139,92,246';
  const tealRgb = '102,212,207';

  return (
    <div className={`absolute inset-0 z-[1] overflow-hidden pointer-events-none ${className}`}>
      {/* ══════════════════════════════════════════════════════════════
          DESKTOP-ONLY EFFECTS — hidden on mobile for performance
          ══════════════════════════════════════════════════════════════ */}

      {/* ═══ GOD RAYS — Slowly rotating diagonal light beams (desktop only) ═══ */}
      <div className="hidden lg:block">
        <motion.div
          className="absolute inset-0 opacity-[0.03] lg:opacity-[0.045]"
          animate={{ rotate: [0, 2, 0, -2, 0] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '50% 0%' }}
        >
          <div
            className="absolute -top-20 left-[10%] w-[1px] h-[75%] origin-top"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb},0.7) 0%, transparent 100%)`,
              transform: 'rotate(15deg)',
              boxShadow: `0 0 50px 15px rgba(${accentRgb},0.10), 0 0 100px 40px rgba(${accentRgb},0.05)`,
            }}
          />
          <div
            className="absolute -top-20 left-[35%] w-[1px] h-[65%] origin-top"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb2},0.5) 0%, transparent 100%)`,
              transform: 'rotate(8deg)',
              boxShadow: `0 0 60px 18px rgba(${accentRgb2},0.08), 0 0 120px 50px rgba(${accentRgb2},0.03)`,
            }}
          />
          <div
            className="absolute -top-20 right-[25%] w-[1px] h-[70%] origin-top"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb},0.45) 0%, transparent 100%)`,
              transform: 'rotate(-12deg)',
              boxShadow: `0 0 45px 12px rgba(${accentRgb},0.08), 0 0 90px 30px rgba(${accentRgb},0.03)`,
            }}
          />
          <div
            className="absolute -top-20 right-[8%] w-[1px] h-[60%] origin-top"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb3},0.4) 0%, transparent 100%)`,
              transform: 'rotate(-6deg)',
              boxShadow: `0 0 50px 15px rgba(${accentRgb3},0.06), 0 0 100px 35px rgba(${accentRgb3},0.025)`,
            }}
          />
          {/* Extra teal accent ray for depth */}
          <div
            className="absolute -top-20 left-[55%] w-[0.5px] h-[50%] origin-top"
            style={{
              background: `linear-gradient(180deg, rgba(${tealRgb},0.3) 0%, transparent 100%)`,
              transform: 'rotate(3deg)',
              boxShadow: `0 0 30px 10px rgba(${tealRgb},0.04)`,
            }}
          />
        </motion.div>
      </div>

      {/* ═══ ENERGY RING — Large slowly rotating ring (desktop only) ═══ */}
      <div className="hidden lg:block">
        <motion.div
          className="absolute top-1/2 left-1/2"
          style={{
            width: 'min(500px, 70vw)',
            height: 'min(500px, 70vw)',
            marginTop: 'min(-250px, -35vw)',
            marginLeft: 'min(-250px, -35vw)',
            borderRadius: '50%',
            border: `1px solid rgba(${accentRgb},0.06)`,
            boxShadow: `
              inset 0 0 60px rgba(${accentRgb},0.02),
              0 0 60px rgba(${accentRgb},0.02)
            `,
          }}
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
        >
          {/* Dashed inner ring */}
          <div
            className="absolute inset-[15%] rounded-full"
            style={{
              border: `0.5px dashed rgba(${accentRgb2},0.05)`,
            }}
          />
        </motion.div>
      </div>

      {/* ═══ FLOATING GEOMETRIC SHAPES (desktop only) ═══ */}
      <div className="hidden lg:block">
        {/* Diamond 1 — Top Left (with gradient fill) */}
        <div className="absolute top-[8%] left-[15%]">
          <motion.div
            className="shape-3d-diamond"
            style={{
              width: 30,
              height: 30,
              border: `0.5px solid rgba(${accentRgb},0.15)`,
              background: `linear-gradient(135deg, rgba(${accentRgb},0.04) 0%, transparent 60%)`,
            }}
            animate={{
              rotateY: [0, 360],
              rotateX: [0, 15, -10, 0],
              y: [0, -12, 4, -8, 0],
            }}
            transition={{
              rotateY: { duration: 32, repeat: Infinity, ease: 'linear' },
              rotateX: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 18, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Diamond 2 — Top Right (with gradient fill) */}
        <div className="absolute top-[15%] right-[15%]">
          <motion.div
            className="shape-3d-diamond"
            style={{
              width: 20,
              height: 20,
              border: `0.5px solid rgba(${accentRgb2},0.12)`,
              background: `linear-gradient(135deg, rgba(${accentRgb2},0.03) 0%, transparent 60%)`,
            }}
            animate={{
              rotateY: [45, 405],
              rotateZ: [0, 180],
              y: [0, -8, 2, -6, 0],
            }}
            transition={{
              rotateY: { duration: 28, repeat: Infinity, ease: 'linear' },
              rotateZ: { duration: 20, repeat: Infinity, ease: 'linear' },
              y: { duration: 15, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Diamond 3 — Bottom Left */}
        <div className="absolute bottom-[22%] left-[15%]">
          <motion.div
            className="shape-3d-diamond"
            style={{
              width: 24,
              height: 24,
              border: `0.5px solid rgba(${accentRgb},0.10)`,
              background: `linear-gradient(135deg, rgba(${accentRgb},0.025) 0%, transparent 60%)`,
            }}
            animate={{
              rotateY: [0, 360],
              rotateX: [-5, 10, -15, -5],
              y: [0, 6, -4, 3, 0],
            }}
            transition={{
              rotateY: { duration: 36, repeat: Infinity, ease: 'linear' },
              rotateX: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 20, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Triangle wireframe — Mid Right (with gradient fill) */}
        <div className="absolute top-[40%] right-[15%]">
          <motion.div
            style={{
              width: 0,
              height: 0,
              borderLeft: '14px solid transparent',
              borderRight: '14px solid transparent',
              borderBottom: `24px solid rgba(${accentRgb},0.05)`,
              filter: `drop-shadow(0 0 4px rgba(${accentRgb},0.03))`,
            }}
            animate={{
              rotateZ: [0, 360],
              scale: [1, 1.1, 1],
              y: [0, -10, 3, -6, 0],
            }}
            transition={{
              rotateZ: { duration: 40, repeat: Infinity, ease: 'linear' },
              scale: { duration: 8, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Pentagon — Upper center-right */}
        <div className="absolute top-[12%] right-[25%]">
          <motion.div
            style={{
              width: 22,
              height: 22,
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: `linear-gradient(180deg, rgba(${accentRgb},0.06) 0%, rgba(${accentRgb2},0.03) 100%)`,
            }}
            animate={{
              rotate: [0, 360],
              y: [0, -7, 3, -5, 0],
              scale: [1, 1.08, 1],
            }}
            transition={{
              rotate: { duration: 35, repeat: Infinity, ease: 'linear' },
              y: { duration: 16, repeat: Infinity, ease: 'easeInOut' },
              scale: { duration: 10, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Pentagon 2 — Lower left (smaller) */}
        <div className="absolute bottom-[40%] left-[8%]">
          <motion.div
            style={{
              width: 16,
              height: 16,
              clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
              background: `linear-gradient(180deg, rgba(${accentRgb2},0.05) 0%, transparent 100%)`,
            }}
            animate={{
              rotate: [360, 0],
              y: [0, -5, 2, -4, 0],
            }}
            transition={{
              rotate: { duration: 42, repeat: Infinity, ease: 'linear' },
              y: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Hexagon outline — Left side (with gradient fill) */}
        <div className="absolute top-[55%] left-[15%]">
          <motion.div
            className="shape-3d-hex"
            style={{
              width: 22,
              height: 22,
              border: `0.5px solid rgba(${accentRgb2},0.10)`,
              background: `linear-gradient(135deg, rgba(${accentRgb2},0.03) 0%, transparent 60%)`,
            }}
            animate={{
              rotateY: [0, 360],
              rotateZ: [0, -180],
              y: [0, -6, 4, -3, 0],
            }}
            transition={{
              rotateY: { duration: 30, repeat: Infinity, ease: 'linear' },
              rotateZ: { duration: 22, repeat: Infinity, ease: 'linear' },
              y: { duration: 14, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Hexagon 2 — Upper left area */}
        <div className="absolute top-[25%] left-[3%]">
          <motion.div
            className="shape-3d-hex"
            style={{
              width: 14,
              height: 14,
              border: `0.5px solid rgba(${accentRgb},0.07)`,
            }}
            animate={{
              rotateY: [180, 540],
              y: [0, -4, 2, -3, 0],
            }}
            transition={{
              rotateY: { duration: 38, repeat: Infinity, ease: 'linear' },
              y: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Cross/Plus — Bottom Right */}
        <div className="absolute bottom-[35%] right-[15%]">
          <motion.div
            className="shape-3d-cross"
            style={{ width: 16, height: 16 }}
            animate={{
              rotateX: [0, 360],
              rotateY: [0, 360],
              y: [0, -8, 2, -5, 0],
            }}
            transition={{
              rotateX: { duration: 26, repeat: Infinity, ease: 'linear' },
              rotateY: { duration: 36, repeat: Infinity, ease: 'linear' },
              y: { duration: 17, repeat: Infinity, ease: 'easeInOut' },
            }}
          >
            <div
              className="absolute top-1/2 left-0 w-full h-[0.5px] -translate-y-1/2"
              style={{ background: `rgba(${accentRgb},0.12)` }}
            />
            <div
              className="absolute left-1/2 top-0 h-full w-[0.5px] -translate-x-1/2"
              style={{ background: `rgba(${accentRgb},0.12)` }}
            />
          </motion.div>
        </div>

        {/* Small circle ring — Top Center */}
        <div className="absolute top-[6%] left-[45%]">
          <motion.div
            style={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: `0.5px solid rgba(${accentRgb},0.10)`,
              background: `radial-gradient(circle, rgba(${accentRgb},0.03) 0%, transparent 70%)`,
            }}
            animate={{
              rotate: [0, 360],
              scale: [1, 1.15, 1],
              y: [0, -5, 2, -3, 0],
            }}
            transition={{
              rotate: { duration: 24, repeat: Infinity, ease: 'linear' },
              scale: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
              y: { duration: 12, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>

        {/* Octagon — Bottom center area */}
        <div className="absolute bottom-[15%] left-[40%]">
          <motion.div
            style={{
              width: 18,
              height: 18,
              border: `0.5px solid rgba(${accentRgb2},0.08)`,
              clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
              background: `rgba(${accentRgb2},0.02)`,
            }}
            animate={{
              rotate: [0, 360],
              y: [0, 5, -3, 2, 0],
            }}
            transition={{
              rotate: { duration: 34, repeat: Infinity, ease: 'linear' },
              y: { duration: 19, repeat: Infinity, ease: 'easeInOut' },
            }}
          />
        </div>
      </div>

      {/* ═══ DATA STREAM LINES — Vertical cyberpunk data streams (desktop only) ═══ */}
      <div className="hidden lg:block">
        {[
          { left: '8%', delay: 0, color: accentRgb },
          { left: '22%', delay: 2.5, color: accentRgb2 },
          { left: '45%', delay: 5, color: accentRgb },
          { left: '68%', delay: 1.2, color: accentRgb2 },
          { left: '85%', delay: 3.8, color: tealRgb },
          { left: '92%', delay: 6.5, color: accentRgb },
          { left: '35%', delay: 4.2, color: accentRgb3 },
        ].map((stream, i) => (
          <div key={`stream-${i}`} className="absolute top-0 bottom-0" style={{ left: stream.left }}>
            {/* Static base line */}
            <div
              className="absolute top-0 bottom-0 w-[0.5px]"
              style={{ background: `rgba(${stream.color},0.04)` }}
            />
            {/* Traveling pulse */}
            <motion.div
              className="absolute w-[1px] h-[80px]"
              style={{
                background: `linear-gradient(180deg, transparent 0%, rgba(${stream.color},0.2) 30%, rgba(${stream.color},0.35) 50%, rgba(${stream.color},0.2) 70%, transparent 100%)`,
                boxShadow: `0 0 8px 2px rgba(${stream.color},0.06)`,
                left: '-0.25px',
              }}
              animate={{ top: ['-80px', '105vh'] }}
              transition={{
                duration: 5 + (i % 3),
                repeat: Infinity,
                ease: 'linear',
                delay: stream.delay,
              }}
            />
            {/* Second slower pulse for depth */}
            <motion.div
              className="absolute w-[0.5px] h-[50px]"
              style={{
                background: `linear-gradient(180deg, transparent 0%, rgba(${stream.color},0.1) 50%, transparent 100%)`,
                left: '-0.25px',
              }}
              animate={{ top: ['-50px', '105vh'] }}
              transition={{
                duration: 7 + (i % 2) * 2,
                repeat: Infinity,
                ease: 'linear',
                delay: stream.delay + 1.5,
              }}
            />
          </div>
        ))}
      </div>

      {/* ═══ 3D PERSPECTIVE GRID — Bottom depth effect (desktop only) ═══ */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0 h-[30%] overflow-hidden opacity-[0.03]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(${accentRgb},0.35) 1px, transparent 1px),
              linear-gradient(90deg, rgba(${accentRgb},0.35) 1px, transparent 1px)
            `,
            backgroundSize: '32px 32px',
            transform: 'perspective(500px) rotateX(55deg)',
            transformOrigin: 'bottom center',
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)',
          }}
        />
      </div>

      {/* ═══ AMBIENT DEPTH ORBS — Large soft glows (desktop only) ═══ */}
      <div className="hidden lg:block">
        <motion.div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${accentRgb},0.04) 0%, rgba(${accentRgb},0.01) 40%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, 30, -10, 20, 0],
            y: [0, -20, 10, -15, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(${accentRgb2},0.035) 0%, rgba(${accentRgb2},0.01) 40%, transparent 70%)`,
            filter: 'blur(40px)',
          }}
          animate={{
            x: [0, -25, 15, -20, 0],
            y: [0, 15, -10, 8, 0],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* ═══ CORNER BRACKETS — With animated glow (desktop only) ═══ */}
      <div className="hidden lg:block">
        {/* Top-left corner bracket */}
        <div className="absolute top-0 left-0 w-28 h-28">
          <motion.div
            className="absolute top-4 left-4 w-12 h-[1px]"
            style={{
              background: `linear-gradient(90deg, rgba(${accentRgb},0.25), transparent)`,
              boxShadow: `0 0 8px 1px rgba(${accentRgb},0.06)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6], scaleX: [0.9, 1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-4 left-4 w-[1px] h-12"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb},0.25), transparent)`,
              boxShadow: `0 0 8px 1px rgba(${accentRgb},0.06)`,
            }}
            animate={{ opacity: [0.6, 1, 0.6], scaleY: [0.9, 1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />
        </div>

        {/* Bottom-right corner bracket */}
        <div className="absolute bottom-0 right-0 w-28 h-28">
          <motion.div
            className="absolute bottom-4 right-4 w-12 h-[1px]"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.20))`,
              boxShadow: `0 0 8px 1px rgba(${accentRgb},0.05)`,
            }}
            animate={{ opacity: [0.5, 1, 0.5], scaleX: [0.9, 1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          />
          <motion.div
            className="absolute bottom-4 right-4 w-[1px] h-12"
            style={{
              background: `linear-gradient(180deg, transparent, rgba(${accentRgb},0.20))`,
              boxShadow: `0 0 8px 1px rgba(${accentRgb},0.05)`,
            }}
            animate={{ opacity: [0.5, 1, 0.5], scaleY: [0.9, 1, 0.9] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
          />
        </div>

        {/* Top-right corner bracket (subtle) */}
        <div className="absolute top-0 right-0 w-20 h-20">
          <motion.div
            className="absolute top-3 right-3 w-8 h-[0.5px]"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(${accentRgb2},0.12))`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
          />
          <motion.div
            className="absolute top-3 right-3 w-[0.5px] h-8"
            style={{
              background: `linear-gradient(180deg, rgba(${accentRgb2},0.12), transparent)`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }}
          />
        </div>

        {/* Bottom-left corner bracket (subtle) */}
        <div className="absolute bottom-0 left-0 w-20 h-20">
          <motion.div
            className="absolute bottom-3 left-3 w-8 h-[0.5px]"
            style={{
              background: `linear-gradient(90deg, rgba(${accentRgb2},0.12), transparent)`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.5 }}
          />
          <motion.div
            className="absolute bottom-3 left-3 w-[0.5px] h-8"
            style={{
              background: `linear-gradient(180deg, transparent, rgba(${accentRgb2},0.12))`,
            }}
            animate={{ opacity: [0.4, 0.8, 0.4] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1.7 }}
          />
        </div>
      </div>

      {/* ═══ SCAN LINES — Moving horizontal lines (desktop only) ═══ */}
      <div className="hidden lg:block">
        {/* Scan line 1 */}
        <motion.div
          className="absolute left-0 right-0 h-[1px]"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${accentRgb},0.06) 20%, rgba(${accentRgb},0.10) 50%, rgba(${accentRgb},0.06) 80%, transparent)`,
            boxShadow: `0 0 30px 6px rgba(${accentRgb},0.03), 0 0 60px 12px rgba(${accentRgb},0.015)`,
          }}
          animate={{ y: ['-10%', '110%'] }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: 'linear',
            delay: 3,
          }}
        />

        {/* Scan line 2 — thinner, offset timing for depth */}
        <motion.div
          className="absolute left-[10%] right-[10%] h-[0.5px]"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(${accentRgb2},0.04) 30%, rgba(${accentRgb2},0.07) 50%, rgba(${accentRgb2},0.04) 70%, transparent)`,
          }}
          animate={{ y: ['110%', '-10%'] }}
          transition={{
            duration: 16,
            repeat: Infinity,
            ease: 'linear',
            delay: 8,
          }}
        />
      </div>

      {/* ══════════════════════════════════════════════════════════════
          ALWAYS-SHOWN: Lightweight micro particles (6 on mobile, 25 on desktop)
          ══════════════════════════════════════════════════════════════ */}
      {/* Mobile: 6 micro particles — hidden on mobile for perf, only desktop */}
      <div className="hidden lg:block">
      {Array.from({ length: 6 }).map((_, i) => {
        const posX = `${(i * 15 + 5) % 95}%`;
        const posY = `${(i * 16 + 8) % 90}%`;
        const size = 1 + (i % 2);
        const dur = 12 + (i % 4) * 2;
        const dX = ((i * 5) % 30) - 15;
        const dY = ((i * 4) % 24) - 12;
        const op = 0.06 + (i % 3) * 0.03;
        const pColor = i % 3 === 0 ? accentRgb2 : accentRgb;

        return (
          <motion.div
            key={`micro-mobile-${i}`}
            className="absolute rounded-full"
            style={{
              left: posX,
              top: posY,
              width: size,
              height: size,
              background: `rgba(${pColor},${op})`,
              boxShadow: `0 0 ${size * 3}px rgba(${pColor},${op * 0.4})`,
              willChange: 'transform',
            }}
            animate={{
              x: [0, dX, -dX * 0.5, dX * 0.7, 0],
              y: [0, dY, -dY * 0.8, dY * 0.3, 0],
              opacity: [op * 0.3, op, op * 0.6, op * 0.9, op * 0.3],
            }}
            transition={{
              duration: dur,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.5,
            }}
          />
        );
      })}
      </div>
      {/* Desktop: 25 micro particles */}
      <div className="hidden lg:block">
        {Array.from({ length: 25 }).map((_, i) => {
          const posX = `${(i * 3.85 + 1.5) % 98}%`;
          const posY = `${(i * 4.1 + 3) % 95}%`;
          const size = 1 + (i % 2);
          const dur = 10 + (i % 8) * 1.5;
          const dX = ((i * 7) % 40) - 20;
          const dY = ((i * 5) % 30) - 15;
          const op = 0.06 + (i % 4) * 0.03;
          const useTeal = i % 7 === 0;
          const pColor = useTeal ? tealRgb : (i % 3 === 0 ? accentRgb2 : accentRgb);

          return (
            <motion.div
              key={`micro-${i}`}
              className="absolute rounded-full"
              style={{
                left: posX,
                top: posY,
                width: size,
                height: size,
                background: `rgba(${pColor},${op})`,
                boxShadow: `0 0 ${size * 3}px rgba(${pColor},${op * 0.4})`,
                willChange: 'transform',
              }}
              animate={{
                x: [0, dX, -dX * 0.5, dX * 0.7, 0],
                y: [0, dY, -dY * 0.8, dY * 0.3, 0],
                opacity: [op * 0.3, op, op * 0.6, op * 0.9, op * 0.3],
              }}
              transition={{
                duration: dur,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.3,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ── Legacy export aliases (unused, kept for safety) ── */
export function ParticleField(_props?: { color?: string; count?: number; className?: string }) {
  return null;
}

export function GlowingOrb(_props?: { color?: string; size?: number; className?: string }) {
  return null;
}
