/**
 * IDOL META — Premium App-Style Image Template Engine
 *
 * Generates beautiful dark-themed PNG images for WhatsApp bot responses.
 * Matches the exact styling of the IDOL META web application.
 * Uses the canvas npm package for server-side rendering.
 *
 * Design System: App-Matched Premium Dark Theme
 * - Background: Dark gradient matching app (#0a0a0f → #12121a)
 * - Primary accent: Gold (#F5A623 / #FFD700) for male, Violet (#A78BFA) for female
 * - Cards: Glass effect with semi-transparent backgrounds
 * - Font: System sans-serif
 */

import { createCanvas, CanvasRenderingContext2D } from "canvas";

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM CONSTANTS - Matching App Style
// ═══════════════════════════════════════════════════════════════════════════

const WIDTH = 800;
const PADDING = 24;
const CARD_PADDING = 16;
const CARD_RADIUS = 24; // Larger radius like app
const CARD_BORDER_COLOR = "rgba(255,255,255,0.06)";
const CARD_BG = "rgba(26,26,46,0.6)";
const GLASS_BG = "rgba(255,255,255,0.03)";

const COLOR = {
  // Background
  bgTop: "#0a0a0f",
  bgBottom: "#12121a",
  
  // Gold accent (male division)
  gold: "#F5A623",
  goldBright: "#FFD700",
  goldMuted: "#D4A012",
  
  // Violet accent (female division)  
  violet: "#A78BFA",
  violetBright: "#C4B5FD",
  violetMuted: "#8B5CF6",
  
  // General colors
  cyan: "#00D4FF",
  white: "#FFFFFF",
  white90: "#E5E5E5",
  white80: "#CCCCCC",
  white50: "#888888",
  white40: "#666666",
  white30: "#555555",
  white20: "#444444",
  
  // Status colors
  green: "#30D158",
  red: "#FF3B30",
  orange: "#FF9500",
  yellow: "#FFD60A",
  blue: "#0A84FF",
  purple: "#BF5AF2",
  pink: "#FF375F",
  
  // Tier colors
  tierS: "#F5A623",
  tierA: "#0A84FF",
  tierB: "#888888",
  
  // UI elements
  rowAlt: "rgba(255,255,255,0.024)",
  divider: "rgba(255,255,255,0.08)",
  
  // Gradient for gold
  gradientGoldStart: "#F5A623",
  gradientGoldEnd: "#FFD700",
  
  // Gradient for violet
  gradientVioletStart: "#A78BFA",
  gradientVioletEnd: "#C4B5FD",
};

const FONT = {
  heroTitle: "bold 32px sans-serif",
  heading: "bold 24px sans-serif",
  subheading: "bold 18px sans-serif",
  body: "15px sans-serif",
  bodyBold: "bold 15px sans-serif",
  small: "13px sans-serif",
  smallBold: "bold 13px sans-serif",
  tiny: "11px sans-serif",
  tinyBold: "bold 11px sans-serif",
  badge: "bold 11px sans-serif",
  footer: "10px sans-serif",
  score: "bold 22px sans-serif",
  points: "bold 28px sans-serif",
  tier: "bold 12px sans-serif",
};

const HEADER_HEIGHT = 0; // No header bar like app
const FOOTER_HEIGHT = 45;
const HERO_HEIGHT = 100; // Hero section with trophy

// ═══════════════════════════════════════════════════════════════════════════
// TYPESCRIPT INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

interface PlayerEntry {
  name: string;
  tier?: string;
  gender?: string;
  points?: number;
  wins?: number;
  losses?: number;
  winRate?: number;
}

interface PemainData {
  tournament: string;
  division: string;
  approved: Array<{ name: string; tier: string; gender: string }>;
  pending: Array<{ name: string }>;
  total: number;
}

interface PeringkatData {
  players: Array<{
    rank: number;
    name: string;
    gender: string;
    tier: string;
    points: number;
    wins: number;
    losses: number;
    winRate: number;
  }>;
  division?: 'male' | 'female';
}

interface BracketMatch {
  matchNumber: number;
  teamA: string;
  scoreA: number | null;
  teamB: string;
  scoreB: number | null;
  status: string;
  winner: string | null;
}

interface BracketRound {
  label: string;
  matches: BracketMatch[];
}

interface BracketData {
  tournament: string;
  division?: string;
  bracketType: string;
  rounds: BracketRound[];
}

interface ClubEntry {
  rank: number;
  name: string;
  totalPoints: number;
  memberCount: number;
}

interface ClubData {
  clubs: ClubEntry[];
}

interface TournamentEntry {
  name: string;
  division: string;
  status: string;
  week: number | null;
  bracketType: string;
  prizePool: number;
  playerCount: number;
  matchCount: number;
}

interface StatusData {
  tournaments: TournamentEntry[];
}

interface LiveMatch {
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  tournament: string;
  round: number;
}

interface PendingMatch {
  teamA: string;
  teamB: string;
  tournament: string;
  round: number;
  matchNumber: number;
  scheduledAt: string | null;
}

interface JadwalData {
  live: LiveMatch[];
  pending: PendingMatch[];
}

interface MatchResult {
  teamA: string;
  scoreA: number;
  teamB: string;
  scoreB: number;
  winner: string | null;
  mvp: string | null;
  completedAt: string | null;
  tournament: string;
}

interface HasilData {
  results: MatchResult[];
}

interface JuaraEntry {
  rank: number;
  tournamentName: string;
  winner: string | null;
  runnerUp: string | null;
  mvp: string | null;
  status: string;
}

interface JuaraData {
  division: string;
  champions: JuaraEntry[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/** Draw a rounded rectangle path (does not fill/stroke) */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const maxR = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + maxR, y);
  ctx.lineTo(x + w - maxR, y);
  ctx.arcTo(x + w, y, x + w, y + maxR, maxR);
  ctx.lineTo(x + w, y + h - maxR);
  ctx.arcTo(x + w, y + h, x + w - maxR, y + h, maxR);
  ctx.lineTo(x + maxR, y + h);
  ctx.arcTo(x, y + h, x, y + h - maxR, maxR);
  ctx.lineTo(x, y + maxR);
  ctx.arcTo(x, y, x + maxR, y, maxR);
  ctx.closePath();
}

/** Draw gradient text */
function drawGradientText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  font: string,
  color1: string,
  color2: string
): void {
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const gradient = ctx.createLinearGradient(x, y, x + metrics.width, y);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  ctx.fillStyle = gradient;
  ctx.fillText(text, x, y);
}

/** Draw a pill-shaped badge with text */
function drawBadge(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  bgColor: string,
  textColor: string = COLOR.white,
  paddingH: number = 8,
  paddingV: number = 3
): void {
  ctx.font = FONT.badge;
  const metrics = ctx.measureText(text);
  const w = metrics.width + paddingH * 2;
  const h = 18;

  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = bgColor;
  ctx.fill();

  ctx.fillStyle = textColor;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + paddingH, y + h / 2);
  ctx.textBaseline = "alphabetic";
}

/** Draw a horizontal progress bar */
function drawProgressBar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  percent: number,
  color: string
): void {
  const clampedPercent = Math.max(0, Math.min(100, percent));

  // Background track
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.fill();

  // Filled bar
  if (clampedPercent > 0) {
    const fillW = Math.max(h, (w * clampedPercent) / 100);
    roundRect(ctx, x, y, fillW, h, h / 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

/** Truncate text with ellipsis if it exceeds maxWidth */
function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  font?: string
): string {
  ctx.font = font || FONT.body;
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

/** Get current timestamp in Indonesian format */
function getTimestamp(): string {
  const now = new Date();
  const day = now.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return `${day} • ${time}`;
}

/** Get tier badge color */
function getTierColor(tier: string): string {
  switch (tier?.toUpperCase()) {
    case "S":
      return COLOR.tierS;
    case "A":
      return COLOR.tierA;
    case "B":
      return COLOR.tierB;
    default:
      return COLOR.white40;
  }
}

/** Get tier background (semi-transparent) */
function getTierBg(tier: string): string {
  switch (tier?.toUpperCase()) {
    case "S":
      return "rgba(245,166,35,0.15)";
    case "A":
      return "rgba(10,132,255,0.15)";
    case "B":
      return "rgba(136,136,136,0.15)";
    default:
      return "rgba(85,85,85,0.15)";
  }
}

/** Get status color */
function getStatusColor(status: string): string {
  switch (status) {
    case "ongoing":
      return COLOR.red;
    case "completed":
      return COLOR.green;
    case "registration":
      return COLOR.yellow;
    case "setup":
      return COLOR.blue;
    case "pending":
      return COLOR.orange;
    default:
      return COLOR.white50;
  }
}

/** Get status label */
function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    setup: "PERSIAPAN",
    registration: "REGISTRASI",
    ongoing: "BERLANGSUNG",
    completed: "SELESAI",
    pending: "MENUNGGU",
    approved: "DISETUJUI",
    rejected: "DITOLAK",
  };
  return map[status] || status.toUpperCase();
}

/** Get win rate color based on percentage */
function getWinRateColor(percent: number): string {
  if (percent >= 70) return COLOR.green;
  if (percent >= 50) return COLOR.gold;
  if (percent >= 30) return COLOR.orange;
  return COLOR.red;
}

/** Format number with commas */
function formatNumber(n: number): string {
  return n.toLocaleString("id-ID");
}

/** Get gender icon */
function getGenderIcon(gender?: string): string {
  return gender === "female" ? "♀" : "♂";
}

/** Get accent colors based on division */
function getAccentColors(division?: 'male' | 'female') {
  if (division === 'female') {
    return {
      text: COLOR.violet,
      bg: COLOR.violetMuted,
      gradientStart: COLOR.gradientVioletStart,
      gradientEnd: COLOR.gradientVioletEnd,
      ring: "rgba(167,139,250,0.4)",
    };
  }
  return {
    text: COLOR.gold,
    bg: COLOR.goldMuted,
    gradientStart: COLOR.gradientGoldStart,
    gradientEnd: COLOR.gradientGoldEnd,
    ring: "rgba(245,166,35,0.4)",
  };
}

/** Format scheduled time */
function formatScheduledTime(isoString: string | null): string {
  if (!isoString) return "Waktu TBD";
  try {
    const d = new Date(isoString);
    const day = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    const time = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${day}, ${time}`;
  } catch {
    return "Waktu TBD";
  }
}

/** Format completed time */
function formatCompletedTime(isoString: string | null): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BASE TEMPLATE DRAWING - Matching App Style
// ═══════════════════════════════════════════════════════════════════════════

/** Draw the background gradient matching app */
function drawBackground(ctx: CanvasRenderingContext2D, height: number): void {
  // Main gradient - matching app's dark theme
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, COLOR.bgTop);
  gradient.addColorStop(1, COLOR.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, height);

  // Subtle noise texture
  ctx.globalAlpha = 0.012;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * WIDTH;
    const y = Math.random() * height;
    const size = Math.random() * 1.5;
    ctx.fillStyle = Math.random() > 0.5 ? "#ffffff" : "#000000";
    ctx.fillRect(x, y, size, size);
  }
  ctx.globalAlpha = 1;
}

/** Draw glass card like in app */
function drawGlassCard(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  accent?: 'gold' | 'violet'
): void {
  // Glass background
  roundRect(ctx, x, y, w, h, CARD_RADIUS);
  ctx.fillStyle = CARD_BG;
  ctx.fill();
  
  // Border
  ctx.strokeStyle = CARD_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Subtle inner glow for accent cards
  if (accent) {
    const glowColor = accent === 'gold' 
      ? "rgba(245,166,35,0.03)" 
      : "rgba(167,139,250,0.03)";
    roundRect(ctx, x + 1, y + 1, w - 2, h - 2, CARD_RADIUS - 1);
    ctx.fillStyle = glowColor;
    ctx.fill();
  }
}

/** Draw hero header section like app's Leaderboard */
function drawHeroHeader(
  ctx: CanvasRenderingContext2D,
  title: string,
  subtitle: string,
  division?: 'male' | 'female'
): number {
  const y = PADDING;
  const accent = getAccentColors(division);
  
  // Hero card with gradient border effect
  const cardW = WIDTH - PADDING * 2;
  const cardH = 85;
  
  // Card background
  roundRect(ctx, PADDING, y, cardW, cardH, CARD_RADIUS);
  ctx.fillStyle = CARD_BG;
  ctx.fill();
  ctx.strokeStyle = CARD_BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Gradient overlay on left side
  const gradient = ctx.createLinearGradient(PADDING, y, PADDING + 150, y);
  gradient.addColorStop(0, accent === getAccentColors('male') ? "rgba(245,166,35,0.08)" : "rgba(167,139,250,0.08)");
  gradient.addColorStop(1, "transparent");
  roundRect(ctx, PADDING + 1, y + 1, cardW - 2, cardH - 2, CARD_RADIUS - 1);
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Trophy icon box
  const iconBoxX = PADDING + 16;
  const iconBoxY = y + (cardH - 48) / 2;
  roundRect(ctx, iconBoxX, iconBoxY, 48, 48, 12);
  ctx.fillStyle = accent === getAccentColors('male') ? "rgba(245,166,35,0.15)" : "rgba(167,139,250,0.15)";
  ctx.fill();
  
  // Trophy emoji
  ctx.font = "24px sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("🏆", iconBoxX + 24, iconBoxY + 26);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  
  // Title
  const titleX = iconBoxX + 64;
  const titleY = y + 32;
  ctx.font = FONT.heading;
  ctx.fillStyle = COLOR.white90;
  ctx.fillText(title, titleX, titleY);
  
  // Subtitle
  ctx.font = FONT.small;
  ctx.fillStyle = COLOR.white40;
  ctx.fillText(subtitle, titleX, titleY + 22);
  
  return y + cardH + 16;
}

/** Draw stats summary cards like app */
function drawStatsRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  stats: Array<{ value: string | number; label: string; icon: string }>,
  division?: 'male' | 'female'
): number {
  const accent = getAccentColors(division);
  const cardW = (WIDTH - PADDING * 2 - 12) / 3;
  const cardH = 60;
  
  for (let i = 0; i < stats.length && i < 3; i++) {
    const stat = stats[i];
    const x = PADDING + i * (cardW + 6);
    
    // Glass card
    roundRect(ctx, x, y, cardW, cardH, 16);
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.04)";
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Icon box
    const iconBoxSize = 36;
    roundRect(ctx, x + 12, y + (cardH - iconBoxSize) / 2, iconBoxSize, iconBoxSize, 10);
    ctx.fillStyle = accent === getAccentColors('male') ? "rgba(245,166,35,0.1)" : "rgba(167,139,250,0.1)";
    ctx.fill();
    
    // Icon emoji
    ctx.font = "16px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText(stat.icon, x + 12 + iconBoxSize / 2, y + (cardH - iconBoxSize) / 2 + iconBoxSize / 2 + 1);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    
    // Value
    const valueX = x + 12 + iconBoxSize + 10;
    const valueY = y + 26;
    drawGradientText(ctx, String(stat.value), valueX, valueY, FONT.subheading, accent.gradientStart, accent.gradientEnd);
    
    // Label
    ctx.font = FONT.tiny;
    ctx.fillStyle = COLOR.white30;
    ctx.fillText(stat.label.toUpperCase(), valueX, valueY + 16);
  }
  
  return y + cardH + 16;
}

/** Draw the footer with branding and timestamp */
function drawFooter(
  ctx: CanvasRenderingContext2D,
  yOffset: number,
  canvasHeight: number
): void {
  const y = canvasHeight - FOOTER_HEIGHT;

  // Divider line
  ctx.strokeStyle = COLOR.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();

  // Footer text
  ctx.font = FONT.footer;
  ctx.fillStyle = COLOR.white30;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(
    "IDOL META  •  Kotabaru Pride  •  Fan Made",
    WIDTH / 2,
    y + FOOTER_HEIGHT / 2 - 6
  );

  // Timestamp
  ctx.font = "9px sans-serif";
  ctx.fillStyle = "rgba(136,136,136,0.5)";
  ctx.fillText(getTimestamp(), WIDTH / 2, y + FOOTER_HEIGHT / 2 + 8);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

/** Draw a section divider */
function drawDivider(ctx: CanvasRenderingContext2D, y: number): void {
  ctx.strokeStyle = COLOR.divider;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();
}

/** Draw section separator with label */
function drawSectionSeparator(ctx: CanvasRenderingContext2D, y: number, label: string): number {
  // Gradient line left
  const gradientLeft = ctx.createLinearGradient(PADDING, y, PADDING + 100, y);
  gradientLeft.addColorStop(0, "transparent");
  gradientLeft.addColorStop(1, "rgba(255,255,255,0.08)");
  
  ctx.strokeStyle = gradientLeft;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(PADDING, y);
  ctx.lineTo(WIDTH / 2 - 60, y);
  ctx.stroke();
  
  // Label
  ctx.font = FONT.tinyBold;
  ctx.fillStyle = COLOR.white30;
  ctx.textAlign = "center";
  ctx.fillText(label.toUpperCase(), WIDTH / 2, y + 4);
  ctx.textAlign = "left";
  
  // Gradient line right
  const gradientRight = ctx.createLinearGradient(WIDTH / 2 + 60, y, WIDTH - PADDING, y);
  gradientRight.addColorStop(0, "rgba(255,255,255,0.08)");
  gradientRight.addColorStop(1, "transparent");
  
  ctx.strokeStyle = gradientRight;
  ctx.beginPath();
  ctx.moveTo(WIDTH / 2 + 60, y);
  ctx.lineTo(WIDTH - PADDING, y);
  ctx.stroke();
  
  return y + 20;
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 2: LEADERBOARD (Peringkat) - Matching App Style
// ═══════════════════════════════════════════════════════════════════════════

function renderPeringkatTemplate(data: PeringkatData): Buffer {
  const players = data.players;
  const playerCount = players.length;
  const division = data.division || 'male';
  const accent = getAccentColors(division);

  // Calculate height
  let totalHeight = PADDING; // Top padding
  
  // Hero header
  totalHeight += 85 + 16;
  
  // Stats row
  totalHeight += 60 + 16;
  
  // Podium section
  if (playerCount >= 3) {
    totalHeight += 200;
  } else if (playerCount >= 1) {
    totalHeight += 140;
  }
  
  // Separator
  if (playerCount > 3) {
    totalHeight += 20;
  }
  
  // Player rows
  totalHeight += Math.max(0, playerCount - 3) * 58;
  
  // Qualification notice
  totalHeight += 70;
  
  // Footer
  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  
  // Hero header
  let y = drawHeroHeader(ctx, "Papan Peringkat", `${playerCount} pemain diperingkat musim ini`, division);
  
  // Stats row
  const totalMatches = players.reduce((sum, p) => sum + p.wins + p.losses, 0);
  const totalPoints = players.reduce((sum, p) => sum + p.points, 0);
  const avgPoints = playerCount > 0 ? Math.round(totalPoints / playerCount) : 0;
  
  y = drawStatsRow(ctx, y, [
    { value: playerCount, label: "Pemain", icon: "👥" },
    { value: totalMatches, label: "Pertandingan", icon: "🎮" },
    { value: formatNumber(avgPoints), label: "Rata-rata PTS", icon: "🎯" },
  ], division);

  // Podium for top 3 - matching app style
  if (playerCount >= 3) {
    const podiumData = [
      { player: players[1], rank: 2, height: 140, color: "rgba(192,192,192,0.1)", border: "rgba(192,192,192,0.2)" },
      { player: players[0], rank: 1, height: 180, color: accent === getAccentColors('male') ? "rgba(245,166,35,0.12)" : "rgba(167,139,250,0.12)", border: accent.ring },
      { player: players[2], rank: 3, height: 120, color: "rgba(205,127,50,0.1)", border: "rgba(205,127,50,0.2)" },
    ];
    
    const podiumWidth = (WIDTH - PADDING * 2 - 24) / 3;
    
    for (let i = 0; i < 3; i++) {
      const p = podiumData[i];
      const px = PADDING + i * (podiumWidth + 12);
      const ph = p.height;
      const isCenter = i === 1;
      
      // Podium card
      const cardY = y + (180 - ph);
      roundRect(ctx, px, cardY, podiumWidth, ph, 18);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.strokeStyle = p.border;
      ctx.lineWidth = isCenter ? 1.5 : 1;
      ctx.stroke();
      
      const innerY = cardY + 12;
      
      // Crown for 1st place
      if (p.rank === 1) {
        ctx.font = "28px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("👑", px + podiumWidth / 2, innerY);
      } else {
        ctx.font = "22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(p.rank === 2 ? "🥈" : "🥉", px + podiumWidth / 2, innerY);
      }
      
      // Avatar circle
      const avatarSize = p.rank === 1 ? 56 : 44;
      const avatarX = px + (podiumWidth - avatarSize) / 2;
      const avatarY = innerY + 12;
      
      // Avatar ring
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 2, 0, Math.PI * 2);
      ctx.strokeStyle = accent.ring;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Avatar background
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      const avatarGradient = ctx.createRadialGradient(
        avatarX + avatarSize / 2, avatarY + avatarSize / 2, 0,
        avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2
      );
      avatarGradient.addColorStop(0, "#444444");
      avatarGradient.addColorStop(1, "#222222");
      ctx.fillStyle = avatarGradient;
      ctx.fill();
      
      // Initial letter
      ctx.font = `bold ${p.rank === 1 ? 22 : 18}px sans-serif`;
      ctx.fillStyle = COLOR.white50;
      ctx.textBaseline = "middle";
      ctx.fillText(
        p.player.name.charAt(0).toUpperCase(),
        avatarX + avatarSize / 2,
        avatarY + avatarSize / 2
      );
      ctx.textBaseline = "alphabetic";
      
      // Name
      const nameY = avatarY + avatarSize + 16;
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = isCenter ? COLOR.white : COLOR.white80;
      ctx.fillText(
        truncateText(ctx, p.player.name, podiumWidth - 16, FONT.bodyBold),
        px + podiumWidth / 2,
        nameY
      );
      
      // Tier badge
      const tierY = nameY + 14;
      const tierText = p.player.tier;
      const tierColor = getTierColor(p.player.tier);
      const tierBg = getTierBg(p.player.tier);
      ctx.font = FONT.tier;
      const tierW = ctx.measureText(tierText).width + 12;
      drawBadge(ctx, tierText, px + (podiumWidth - tierW) / 2, tierY - 8, tierBg, tierColor, 6, 2);
      
      // Points
      const pointsY = tierY + 22;
      drawGradientText(
        ctx,
        formatNumber(p.player.points),
        px + podiumWidth / 2 - ctx.measureText(formatNumber(p.player.points)).width / 2,
        pointsY,
        p.rank === 1 ? FONT.points : FONT.score,
        accent.gradientStart,
        accent.gradientEnd
      );
      
      // PTS label
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText("PTS", px + podiumWidth / 2 - 10, pointsY + 14);
      
      // W/L
      const wlY = pointsY + (p.rank === 1 ? 32 : 26);
      ctx.font = FONT.tiny;
      
      // Win indicator
      ctx.fillStyle = COLOR.green;
      ctx.beginPath();
      ctx.arc(px + podiumWidth / 2 - 22, wlY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR.white40;
      ctx.fillText(`${p.player.wins}W`, px + podiumWidth / 2 - 16, wlY);
      
      // Loss indicator
      ctx.fillStyle = COLOR.red;
      ctx.beginPath();
      ctx.arc(px + podiumWidth / 2 + 10, wlY - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLOR.white30;
      ctx.fillText(`${p.player.losses}L`, px + podiumWidth / 2 + 16, wlY);
      
      ctx.textAlign = "left";
    }
    
    y += 200;
  } else if (playerCount >= 1) {
    // Single player display
    const player = players[0];
    const cardW = WIDTH - PADDING * 2;
    const cardH = 100;
    
    roundRect(ctx, PADDING, y, cardW, cardH, CARD_RADIUS);
    ctx.fillStyle = accent === getAccentColors('male') ? "rgba(245,166,35,0.1)" : "rgba(167,139,250,0.1)";
    ctx.fill();
    ctx.strokeStyle = accent.ring;
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Crown
    ctx.font = "32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("👑", WIDTH / 2, y + 28);
    
    // Name
    ctx.font = FONT.heading;
    ctx.fillStyle = COLOR.white;
    ctx.fillText(player.name, WIDTH / 2, y + 52);
    
    // Points
    drawGradientText(ctx, formatNumber(player.points), WIDTH / 2 - 30, y + 80, FONT.points, accent.gradientStart, accent.gradientEnd);
    ctx.font = FONT.tiny;
    ctx.fillStyle = COLOR.white30;
    ctx.fillText("PTS", WIDTH / 2 + 30, y + 80);
    
    ctx.textAlign = "left";
    y += cardH + 16;
  }

  // Remaining players list
  if (playerCount > 3) {
    y = drawSectionSeparator(ctx, y, "Semua Peringkat");
    
    for (let i = 3; i < playerCount; i++) {
      const player = players[i];
      const rowH = 54;
      const rowY = y;
      
      // Row background (alternating)
      if (i % 2 === 0) {
        roundRect(ctx, PADDING, rowY, WIDTH - PADDING * 2, rowH, 12);
        ctx.fillStyle = GLASS_BG;
        ctx.fill();
      }
      
      // Rank number
      const rankX = PADDING + 16;
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.white40;
      ctx.fillText(String(player.rank), rankX, rowY + 30);
      
      // Avatar
      const avatarX = rankX + 32;
      const avatarSize = 34;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, rowY + rowH / 2, avatarSize / 2, 0, Math.PI * 2);
      const avatarGradient = ctx.createRadialGradient(
        avatarX + avatarSize / 2, rowY + rowH / 2, 0,
        avatarX + avatarSize / 2, rowY + rowH / 2, avatarSize / 2
      );
      avatarGradient.addColorStop(0, "#444444");
      avatarGradient.addColorStop(1, "#222222");
      ctx.fillStyle = avatarGradient;
      ctx.fill();
      
      // Initial
      ctx.font = "bold 13px sans-serif";
      ctx.fillStyle = COLOR.white50;
      ctx.textBaseline = "middle";
      ctx.fillText(player.name.charAt(0).toUpperCase(), avatarX + avatarSize / 2, rowY + rowH / 2);
      ctx.textBaseline = "alphabetic";
      
      // Name
      const nameX = avatarX + avatarSize + 10;
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.white90;
      ctx.fillText(truncateText(ctx, player.name, 180), nameX, rowY + 22);
      
      // Tier badge
      const tierText = player.tier;
      drawBadge(ctx, tierText, nameX, rowY + 26, getTierBg(player.tier), getTierColor(player.tier), 5, 2);
      
      // W/L
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.green;
      ctx.fillText(`${player.wins}W`, nameX + 50, rowY + 36);
      ctx.fillStyle = COLOR.red;
      ctx.fillText(`${player.losses}L`, nameX + 80, rowY + 36);
      
      // Points (right side)
      const pointsX = WIDTH - PADDING - 70;
      drawGradientText(ctx, formatNumber(player.points), pointsX, rowY + 28, FONT.bodyBold, accent.gradientStart, accent.gradientEnd);
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText("poin", pointsX, rowY + 42);
      
      y += rowH + 4;
    }
  }

  // Qualification notice
  const noticeY = y + 10;
  const noticeH = 55;
  roundRect(ctx, PADDING, noticeY, WIDTH - PADDING * 2, noticeH, 14);
  ctx.fillStyle = accent === getAccentColors('male') 
    ? "rgba(245,166,35,0.06)" 
    : "rgba(167,139,250,0.06)";
  ctx.fill();
  ctx.strokeStyle = accent === getAccentColors('male') ? "rgba(245,166,35,0.1)" : "rgba(167,139,250,0.1)";
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Icon box
  const iconX = PADDING + 12;
  const iconY = noticeY + (noticeH - 36) / 2;
  roundRect(ctx, iconX, iconY, 36, 36, 10);
  ctx.fillStyle = accent === getAccentColors('male') ? "rgba(245,166,35,0.1)" : "rgba(167,139,250,0.1)";
  ctx.fill();
  
  ctx.font = "16px sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText("⭐", iconX + 18, iconY + 20);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  
  // Notice text
  ctx.font = FONT.smallBold;
  ctx.fillStyle = COLOR.white90;
  ctx.fillText("Kualifikasi Grand Final", iconX + 48, noticeY + 22);
  
  ctx.font = FONT.tiny;
  ctx.fillStyle = COLOR.white30;
  ctx.fillText("12 pemain teratas lolos ke Grand Final", iconX + 48, noticeY + 38);

  drawFooter(ctx, noticeY + noticeH + 10, totalHeight);

  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 1: DAFTAR PEMAIN (Player List)
// ═══════════════════════════════════════════════════════════════════════════

function renderPemainTemplate(data: PemainData): Buffer {
  const approvedCount = data.approved.length;
  const pendingCount = data.pending.length;
  const division = data.division?.toLowerCase() === 'female' ? 'female' : 'male';
  const accent = getAccentColors(division);

  // Calculate height
  let totalHeight = PADDING;
  totalHeight += 85 + 16; // Hero header
  totalHeight += 36; // Division badge row

  if (approvedCount > 0) {
    totalHeight += 30 + approvedCount * 42 + 20;
  }

  if (pendingCount > 0) {
    totalHeight += 30 + pendingCount * 36 + 20;
  }

  totalHeight += 50;
  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);

  // Hero header
  let y = drawHeroHeader(ctx, "Daftar Pemain", data.tournament || "Turnamen", division);

  // Division badge - prominent indicator
  const badgeText = division === 'female' ? '♀ FEMALE DIVISION' : '♂ MALE DIVISION';
  const badgeW = ctx.measureText(badgeText).width + 24;
  const badgeX = PADDING;
  const badgeY = y - 4;
  
  // Badge background with gradient
  const badgeGradient = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeW, badgeY);
  badgeGradient.addColorStop(0, division === 'female' ? "rgba(167,139,250,0.2)" : "rgba(245,166,35,0.2)");
  badgeGradient.addColorStop(1, division === 'female' ? "rgba(167,139,250,0.1)" : "rgba(245,166,35,0.1)");
  
  roundRect(ctx, badgeX, badgeY, badgeW, 28, 14);
  ctx.fillStyle = badgeGradient;
  ctx.fill();
  ctx.strokeStyle = division === 'female' ? "rgba(167,139,250,0.3)" : "rgba(245,166,35,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  
  // Badge text
  ctx.font = FONT.smallBold;
  ctx.fillStyle = accent.text;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, badgeX + 12, badgeY + 15);
  ctx.textBaseline = "alphabetic";
  
  y += 36;

  // Approved players
  if (approvedCount > 0) {
    ctx.font = FONT.smallBold;
    ctx.fillStyle = COLOR.white;
    ctx.fillText(`✅ Disetujui (${approvedCount})`, PADDING, y);
    y += 8;

    const cardH = approvedCount * 42 + 16;
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH, division === 'female' ? 'violet' : 'gold');

    let rowY = y + 28;
    for (let i = 0; i < data.approved.length; i++) {
      const player = data.approved[i];

      if (i % 2 === 1) {
        roundRect(ctx, PADDING + 4, y + 12 + i * 42, WIDTH - PADDING * 2 - 8, 38, 10);
        ctx.fillStyle = COLOR.rowAlt;
        ctx.fill();
      }

      // Number
      ctx.font = FONT.small;
      ctx.fillStyle = COLOR.white30;
      ctx.textAlign = "right";
      ctx.fillText(`${i + 1}`, PADDING + 35, rowY);
      ctx.textAlign = "left";

      // Gender icon
      ctx.font = "14px sans-serif";
      ctx.fillStyle = player.gender === "female" ? COLOR.pink : COLOR.cyan;
      ctx.fillText(getGenderIcon(player.gender), PADDING + 48, rowY);

      // Name
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.white;
      ctx.fillText(truncateText(ctx, player.name, WIDTH - PADDING * 2 - 220), PADDING + 70, rowY);

      // Tier badge
      const tier = player.tier || "B";
      const tierW = ctx.measureText(tier).width + 14;
      drawBadge(ctx, tier, WIDTH - PADDING - tierW - 10, rowY - 10, getTierBg(tier), getTierColor(tier), 7, 2);

      rowY += 42;
    }

    y += cardH + 16;
  }

  // Pending players
  if (pendingCount > 0) {
    drawDivider(ctx, y);
    y += 12;

    ctx.font = FONT.smallBold;
    ctx.fillStyle = COLOR.white;
    ctx.fillText(`⏳ Menunggu (${pendingCount})`, PADDING, y);
    y += 8;

    const cardH = pendingCount * 36 + 16;
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

    let rowY = y + 28;
    for (let i = 0; i < data.pending.length; i++) {
      const player = data.pending[i];

      ctx.font = FONT.body;
      ctx.fillStyle = COLOR.white70;
      ctx.fillText(`⏳ ${player.name}`, PADDING + 16, rowY);

      ctx.font = FONT.small;
      ctx.fillStyle = COLOR.white40;
      ctx.textAlign = "right";
      ctx.fillText("Menunggu", WIDTH - PADDING - 16, rowY);
      ctx.textAlign = "left";

      rowY += 36;
    }

    y += cardH + 16;
  }

  // Total
  ctx.font = FONT.bodyBold;
  ctx.fillStyle = accent.text;
  ctx.textAlign = "center";
  ctx.fillText(`📊 Total: ${data.total} Pemain`, WIDTH / 2, y);
  ctx.textAlign = "left";

  drawFooter(ctx, y + 20, totalHeight);

  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 3: BRACKET
// ═══════════════════════════════════════════════════════════════════════════

function renderBracketTemplate(data: BracketData): Buffer {
  const rounds = data.rounds;
  const division = (data.division?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female';
  const accent = getAccentColors(division);

  let totalHeight = PADDING;
  totalHeight += 85 + 16;
  totalHeight += 36; // Division badge

  for (const round of rounds) {
    totalHeight += 30 + round.matches.length * 56 + 10;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Bracket Pertandingan", data.tournament, division);

  // Division badge
  const badgeText = division === 'female' ? '♀ FEMALE DIVISION' : '♂ MALE DIVISION';
  const badgeW = ctx.measureText(badgeText).width + 24;
  const badgeGradient = ctx.createLinearGradient(PADDING, y, PADDING + badgeW, y);
  badgeGradient.addColorStop(0, division === 'female' ? "rgba(167,139,250,0.2)" : "rgba(245,166,35,0.2)");
  badgeGradient.addColorStop(1, division === 'female' ? "rgba(167,139,250,0.1)" : "rgba(245,166,35,0.1)");
  
  roundRect(ctx, PADDING, y, badgeW, 28, 14);
  ctx.fillStyle = badgeGradient;
  ctx.fill();
  ctx.strokeStyle = division === 'female' ? "rgba(167,139,250,0.3)" : "rgba(245,166,35,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.font = FONT.smallBold;
  ctx.fillStyle = accent.text;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, PADDING + 12, y + 15);
  ctx.textBaseline = "alphabetic";
  
  y += 36;

  for (const round of rounds) {
    ctx.font = FONT.smallBold;
    ctx.fillStyle = COLOR.cyan;
    ctx.fillText(`━ ${round.label.toUpperCase()} ━`, PADDING, y);
    y += 25;

    for (const match of round.matches) {
      const cardH = 50;
      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH, division === 'female' ? 'violet' : 'gold');

      const isWinnerA = match.winner === match.teamA;
      const isWinnerB = match.winner === match.teamB;

      // Status icon
      let statusIcon = "⏳";
      let statusColor = COLOR.white30;
      if (match.status === "completed") {
        statusIcon = "✅";
        statusColor = COLOR.green;
      } else if (match.status === "ongoing") {
        statusIcon = "🔴";
        statusColor = COLOR.red;
      }
      ctx.font = "14px sans-serif";
      ctx.fillStyle = statusColor;
      ctx.fillText(statusIcon, PADDING + 14, y + 30);

      // Match number
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText(`#${match.matchNumber}`, PADDING + 36, y + 16);

      // Team A
      ctx.font = isWinnerA ? FONT.bodyBold : FONT.body;
      ctx.fillStyle = isWinnerA ? accent.text : COLOR.white90;
      ctx.fillText(truncateText(ctx, match.teamA || "TBD", 200), PADDING + 60, y + 30);

      // Score A
      ctx.font = FONT.score;
      ctx.fillStyle = isWinnerA ? accent.gradientEnd : COLOR.white50;
      ctx.textAlign = "center";
      ctx.fillText(match.scoreA !== null ? String(match.scoreA) : "-", WIDTH / 2 - 16, y + 32);

      // VS
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText("vs", WIDTH / 2, y + 32);

      // Score B
      ctx.font = FONT.score;
      ctx.fillStyle = isWinnerB ? accent.gradientEnd : COLOR.white50;
      ctx.fillText(match.scoreB !== null ? String(match.scoreB) : "-", WIDTH / 2 + 16, y + 32);
      ctx.textAlign = "left";

      // Team B
      ctx.font = isWinnerB ? FONT.bodyBold : FONT.body;
      ctx.fillStyle = isWinnerB ? accent.text : COLOR.white90;
      ctx.textAlign = "right";
      ctx.fillText(truncateText(ctx, match.teamB || "TBD", 200), WIDTH - PADDING - 14, y + 30);
      ctx.textAlign = "left";

      y += cardH + 6;
    }

    y += 10;
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 4: CLUB RANKING
// ═══════════════════════════════════════════════════════════════════════════

function renderClubTemplate(data: ClubData): Buffer {
  const clubs = data.clubs;
  const clubCount = clubs.length;

  let totalHeight = PADDING;
  totalHeight += 85 + 16;

  if (clubCount > 0) {
    totalHeight += clubCount * 56;
  } else {
    totalHeight += 80;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Peringkat Club", `${clubCount} club terdaftar`);

  if (clubCount === 0) {
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, 60);
    ctx.font = FONT.body;
    ctx.fillStyle = COLOR.white50;
    ctx.textAlign = "center";
    ctx.fillText("Belum ada club yang terdaftar", WIDTH / 2, y + 35);
    ctx.textAlign = "left";
    y += 80;
  } else {
    const maxPoints = Math.max(...clubs.map((c) => c.totalPoints), 1);

    for (let i = 0; i < clubCount; i++) {
      const club = clubs[i];
      const cardH = 50;

      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

      if (i % 2 === 1) {
        roundRect(ctx, PADDING + 2, y + 2, WIDTH - PADDING * 2 - 4, cardH - 4, CARD_RADIUS - 2);
        ctx.fillStyle = COLOR.rowAlt;
        ctx.fill();
      }

      // Rank medal
      ctx.font = "20px sans-serif";
      ctx.textAlign = "center";
      if (i === 0) ctx.fillText("🥇", PADDING + 22, y + 32);
      else if (i === 1) ctx.fillText("🥈", PADDING + 22, y + 32);
      else if (i === 2) ctx.fillText("🥉", PADDING + 22, y + 32);
      else {
        ctx.font = FONT.bodyBold;
        ctx.fillStyle = COLOR.white40;
        ctx.fillText(String(club.rank), PADDING + 22, y + 32);
      }
      ctx.textAlign = "left";

      // Club name
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = i < 3 ? COLOR.gold : COLOR.white90;
      ctx.fillText(truncateText(ctx, club.name, 180), PADDING + 48, y + 28);

      // Members
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white40;
      ctx.fillText(`👥 ${club.memberCount}`, PADDING + 48, y + 42);

      // Points
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.gold;
      ctx.fillText(`${formatNumber(club.totalPoints)} pts`, WIDTH - PADDING - 100, y + 28);

      // Bar
      const barW = 80;
      const percent = (club.totalPoints / maxPoints) * 100;
      drawProgressBar(ctx, WIDTH - PADDING - 90, y + 36, barW, 8, percent, COLOR.gold);

      y += cardH + 6;
    }
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 5: STATUS TURNAMEN
// ═══════════════════════════════════════════════════════════════════════════

function renderStatusTemplate(data: StatusData): Buffer {
  const tournaments = data.tournaments;
  const tCount = tournaments.length;

  let totalHeight = PADDING;
  totalHeight += 85 + 16;

  if (tCount > 0) {
    totalHeight += tCount * 95;
  } else {
    totalHeight += 80;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Status Turnamen", `${tCount} turnamen`);

  if (tCount === 0) {
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, 60);
    ctx.font = FONT.body;
    ctx.fillStyle = COLOR.white50;
    ctx.textAlign = "center";
    ctx.fillText("Belum ada turnamen yang dibuat", WIDTH / 2, y + 35);
    ctx.textAlign = "left";
    y += 80;
  } else {
    for (const t of tournaments) {
      const cardH = 88;
      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

      // Status badge
      const statusLabel = getStatusLabel(t.status);
      const statusColor = getStatusColor(t.status);
      ctx.font = FONT.tiny;
      const badgeW = ctx.measureText(statusLabel).width + 16;
      drawBadge(ctx, statusLabel, WIDTH - PADDING - badgeW - 10, y + 10, statusColor + "26", statusColor, 8, 3);

      // Tournament name
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.white;
      ctx.fillText(truncateText(ctx, t.name, WIDTH - PADDING * 2 - 180), PADDING + 16, y + 26);

      // Division + week
      ctx.font = FONT.small;
      ctx.fillStyle = COLOR.white50;
      const divText = (t.division === "male" ? "♂ Male" : "♀ Female") + (t.week ? ` • Week ${t.week}` : "");
      ctx.fillText(divText, PADDING + 16, y + 46);

      // Stats
      const statsY = y + 68;
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white70;
      ctx.fillText(`👥 ${t.playerCount}`, PADDING + 16, statsY);
      ctx.fillText(`⚔️ ${t.matchCount}`, PADDING + 90, statsY);
      ctx.fillStyle = COLOR.gold;
      ctx.fillText(`💰 ${formatNumber(t.prizePool)}`, PADDING + 180, statsY);

      y += cardH + 8;
    }
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 6: JADWAL PERTANDINGAN
// ═══════════════════════════════════════════════════════════════════════════

function renderJadwalTemplate(data: JadwalData): Buffer {
  const liveCount = data.live.length;
  const pendingCount = data.pending.length;

  let totalHeight = PADDING;
  totalHeight += 85 + 16;

  if (liveCount > 0) {
    totalHeight += 30 + liveCount * 64 + 10;
  }
  if (pendingCount > 0) {
    totalHeight += 30 + pendingCount * 54 + 10;
  }
  if (liveCount === 0 && pendingCount === 0) {
    totalHeight += 70;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Jadwal Pertandingan", `${liveCount + pendingCount} pertandingan`);

  if (liveCount === 0 && pendingCount === 0) {
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, 50);
    ctx.font = FONT.body;
    ctx.fillStyle = COLOR.white50;
    ctx.textAlign = "center";
    ctx.fillText("Tidak ada pertandingan", WIDTH / 2, y + 30);
    ctx.textAlign = "left";
    y += 70;
  }

  // Live matches
  if (liveCount > 0) {
    ctx.font = FONT.smallBold;
    ctx.fillStyle = COLOR.red;
    ctx.fillText(`🔴 Sedang Berlangsung (${liveCount})`, PADDING, y);
    y += 8;

    for (const match of data.live) {
      const cardH = 56;
      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

      // Tournament info
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText(`${match.tournament} • Round ${match.round}`, PADDING + 16, y + 16);

      // Teams
      const scoreY = y + 38;
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = match.scoreA > match.scoreB ? COLOR.gold : COLOR.white90;
      ctx.textAlign = "right";
      ctx.fillText(truncateText(ctx, match.teamA || "TBD", 220), WIDTH / 2 - 24, scoreY);

      ctx.font = FONT.score;
      ctx.fillStyle = match.scoreA > match.scoreB ? COLOR.goldBright : COLOR.white70;
      ctx.fillText(String(match.scoreA), WIDTH / 2 - 8, scoreY + 2);

      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText("-", WIDTH / 2, scoreY);

      ctx.font = FONT.score;
      ctx.fillStyle = match.scoreB > match.scoreA ? COLOR.goldBright : COLOR.white70;
      ctx.fillText(String(match.scoreB), WIDTH / 2 + 10, scoreY + 2);

      ctx.font = FONT.bodyBold;
      ctx.fillStyle = match.scoreB > match.scoreA ? COLOR.gold : COLOR.white90;
      ctx.textAlign = "left";
      ctx.fillText(truncateText(ctx, match.teamB || "TBD", 220), WIDTH / 2 + 32, scoreY);
      ctx.textAlign = "left";

      y += cardH + 8;
    }
    y += 10;
  }

  // Pending matches
  if (pendingCount > 0) {
    ctx.font = FONT.smallBold;
    ctx.fillStyle = COLOR.white80;
    ctx.fillText(`⏳ Mendatang (${pendingCount})`, PADDING, y);
    y += 8;

    for (const match of data.pending) {
      const cardH = 46;
      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white30;
      ctx.fillText(`#${match.matchNumber} • ${match.tournament} • Round ${match.round}`, PADDING + 16, y + 14);

      ctx.font = FONT.body;
      ctx.fillStyle = COLOR.white90;
      ctx.fillText(truncateText(ctx, match.teamA || "TBD", 180), PADDING + 16, y + 34);

      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white40;
      ctx.textAlign = "center";
      ctx.fillText("vs", WIDTH / 2, y + 34);

      ctx.font = FONT.body;
      ctx.fillStyle = COLOR.white90;
      ctx.textAlign = "right";
      ctx.fillText(truncateText(ctx, match.teamB || "TBD", 180), WIDTH - PADDING - 16, y + 34);
      ctx.textAlign = "left";

      y += cardH + 8;
    }
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 7: HASIL PERTANDINGAN
// ═══════════════════════════════════════════════════════════════════════════

function renderHasilTemplate(data: HasilData): Buffer {
  const results = data.results;
  const resultCount = results.length;

  let totalHeight = PADDING;
  totalHeight += 85 + 16;

  if (resultCount > 0) {
    totalHeight += resultCount * 78;
  } else {
    totalHeight += 70;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Hasil Pertandingan", `${resultCount} pertandingan selesai`);

  if (resultCount === 0) {
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, 50);
    ctx.font = FONT.body;
    ctx.fillStyle = COLOR.white50;
    ctx.textAlign = "center";
    ctx.fillText("Belum ada hasil pertandingan", WIDTH / 2, y + 30);
    ctx.textAlign = "left";
    y += 70;
  }

  for (const result of results) {
    const cardH = 70;
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH);

    ctx.font = FONT.tiny;
    ctx.fillStyle = COLOR.white30;
    ctx.fillText(`📍 ${result.tournament}`, PADDING + 16, y + 14);

    if (result.completedAt) {
      ctx.textAlign = "right";
      ctx.fillText(formatCompletedTime(result.completedAt), WIDTH - PADDING - 16, y + 14);
      ctx.textAlign = "left";
    }

    const scoreY = y + 38;
    const isWinnerA = result.winner === result.teamA;
    const isWinnerB = result.winner === result.teamB;

    ctx.font = isWinnerA ? FONT.bodyBold : FONT.body;
    ctx.fillStyle = isWinnerA ? COLOR.gold : COLOR.white80;
    ctx.textAlign = "right";
    ctx.fillText(truncateText(ctx, result.teamA || "TBD", 200), WIDTH / 2 - 28, scoreY);

    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = isWinnerA ? COLOR.goldBright : COLOR.white50;
    ctx.fillText(String(result.scoreA), WIDTH / 2 - 14, scoreY + 2);

    ctx.font = FONT.tiny;
    ctx.fillStyle = COLOR.white30;
    ctx.fillText("-", WIDTH / 2, scoreY);

    ctx.font = "bold 26px sans-serif";
    ctx.fillStyle = isWinnerB ? COLOR.goldBright : COLOR.white50;
    ctx.fillText(String(result.scoreB), WIDTH / 2 + 10, scoreY + 2);

    ctx.font = isWinnerB ? FONT.bodyBold : FONT.body;
    ctx.fillStyle = isWinnerB ? COLOR.gold : COLOR.white80;
    ctx.textAlign = "left";
    ctx.fillText(truncateText(ctx, result.teamB || "TBD", 200), WIDTH / 2 + 34, scoreY);
    ctx.textAlign = "left";

    // Winner & MVP
    const infoY = y + cardH - 10;
    if (result.winner) {
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.gold;
      ctx.fillText(`🏆 ${result.winner}`, PADDING + 16, infoY);
    }
    if (result.mvp) {
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.gold;
      ctx.textAlign = "right";
      ctx.fillText(`⭐ MVP: ${result.mvp}`, WIDTH - PADDING - 16, infoY);
      ctx.textAlign = "left";
    }

    y += cardH + 8;
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// TEMPLATE 8: JUARA (Champions)
// ═══════════════════════════════════════════════════════════════════════════

function renderJuaraTemplate(data: JuaraData): Buffer {
  const champions = data.champions;
  const champCount = champions.length;
  const division = (data.division?.toLowerCase() === 'female' ? 'female' : 'male') as 'male' | 'female';
  const accent = getAccentColors(division);

  let totalHeight = PADDING;
  totalHeight += 85 + 16; // Hero header
  totalHeight += 36; // Division badge

  if (champCount > 0) {
    totalHeight += champCount * 130 + 20;
  } else {
    totalHeight += 80;
  }

  totalHeight += FOOTER_HEIGHT + 20;

  const canvas = createCanvas(WIDTH, totalHeight);
  const ctx = canvas.getContext("2d");

  drawBackground(ctx, totalHeight);
  let y = drawHeroHeader(ctx, "Daftar Juara", `${champCount} turnamen selesai`, division);

  // Division badge
  const badgeText = division === 'female' ? '♀ FEMALE DIVISION' : '♂ MALE DIVISION';
  const badgeW = ctx.measureText(badgeText).width + 24;
  const badgeGradient = ctx.createLinearGradient(PADDING, y, PADDING + badgeW, y);
  badgeGradient.addColorStop(0, division === 'female' ? "rgba(167,139,250,0.2)" : "rgba(245,166,35,0.2)");
  badgeGradient.addColorStop(1, division === 'female' ? "rgba(167,139,250,0.1)" : "rgba(245,166,35,0.1)");

  roundRect(ctx, PADDING, y, badgeW, 28, 14);
  ctx.fillStyle = badgeGradient;
  ctx.fill();
  ctx.strokeStyle = division === 'female' ? "rgba(167,139,250,0.3)" : "rgba(245,166,35,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.font = FONT.smallBold;
  ctx.fillStyle = accent.text;
  ctx.textBaseline = "middle";
  ctx.fillText(badgeText, PADDING + 12, y + 15);
  ctx.textBaseline = "alphabetic";

  y += 36;

  if (champCount === 0) {
    drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, 60);
    ctx.font = FONT.body;
    ctx.fillStyle = COLOR.white50;
    ctx.textAlign = "center";
    ctx.fillText("Belum ada juara tercatat", WIDTH / 2, y + 35);
    ctx.textAlign = "left";
    y += 80;
  } else {
    for (let i = 0; i < champCount; i++) {
      const champ = champions[i];
      const cardH = 120;
      drawGlassCard(ctx, PADDING, y, WIDTH - PADDING * 2, cardH, division === 'female' ? 'violet' : 'gold');

      // Medal/rank
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";
      ctx.font = "24px sans-serif";
      ctx.fillText(medal, PADDING + 16, y + 28);

      // Tournament name
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = COLOR.white;
      ctx.fillText(truncateText(ctx, champ.tournamentName, WIDTH - PADDING * 2 - 200), PADDING + 50, y + 28);

      // Status badge
      const statusLabel = champ.status === 'completed' ? 'SELESAI' : 'BERLANGSUNG';
      const statusColor = champ.status === 'completed' ? COLOR.green : COLOR.orange;
      ctx.font = FONT.tiny;
      const statusW = ctx.measureText(statusLabel).width + 16;
      drawBadge(ctx, statusLabel, WIDTH - PADDING - statusW - 10, y + 10, statusColor + "26", statusColor, 8, 3);

      // Winner
      const winnerY = y + 56;
      ctx.font = FONT.tiny;
      ctx.fillStyle = COLOR.white50;
      ctx.fillText("🏆 JUARA 1", PADDING + 16, winnerY);
      ctx.font = FONT.bodyBold;
      ctx.fillStyle = accent.text;
      ctx.fillText(champ.winner || "TBD", PADDING + 100, winnerY);

      // Runner-up
      if (champ.runnerUp) {
        const ruY = y + 76;
        ctx.font = FONT.tiny;
        ctx.fillStyle = COLOR.white50;
        ctx.fillText("🥈 JUARA 2", PADDING + 16, ruY);
        ctx.font = FONT.body;
        ctx.fillStyle = COLOR.white80;
        ctx.fillText(champ.runnerUp, PADDING + 100, ruY);
      }

      // MVP
      if (champ.mvp) {
        const mvpY = y + 96;
        ctx.font = FONT.tiny;
        ctx.fillStyle = COLOR.white50;
        ctx.fillText("⭐ MVP", PADDING + 16, mvpY);
        ctx.font = FONT.body;
        ctx.fillStyle = COLOR.gold;
        ctx.fillText(champ.mvp, PADDING + 100, mvpY);
      }

      y += cardH + 10;
    }
  }

  drawFooter(ctx, y, totalHeight);
  return canvas.toBuffer("image/png");
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT: generateImage
// ═══════════════════════════════════════════════════════════════════════════

export function generateImage(
  templateType: string,
  data: any
): Buffer | null {
  try {
    switch (templateType) {
      case "pemain":
        return renderPemainTemplate(data as PemainData);
      case "peringkat":
        return renderPeringkatTemplate(data as PeringkatData);
      case "bracket":
        return renderBracketTemplate(data as BracketData);
      case "juara":
        return renderJuaraTemplate(data as JuaraData);
      case "club":
        return renderClubTemplate(data as ClubData);
      case "status":
        return renderStatusTemplate(data as StatusData);
      case "jadwal":
        return renderJadwalTemplate(data as JadwalData);
      case "hasil":
        return renderHasilTemplate(data as HasilData);
      default:
        console.warn(`[Template Engine] Unknown template type: "${templateType}"`);
        return null;
    }
  } catch (error) {
    console.error(`[Template Engine] Error rendering "${templateType}":`, (error as Error).message);
    return null;
  }
}

export {
  renderPemainTemplate,
  renderPeringkatTemplate,
  renderBracketTemplate,
  renderJuaraTemplate,
  renderClubTemplate,
  renderStatusTemplate,
  renderJadwalTemplate,
  renderHasilTemplate,
  getTimestamp,
};
