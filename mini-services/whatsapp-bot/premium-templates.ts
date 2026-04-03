/**
 * IDOL META - Premium Message Templates
 * Beautiful, elegant WhatsApp message formatting
 */

// ═══════════════════════════════════════════════════════════════════════════
// PREMIUM DECORATORS & HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export const PREMIUM = {
  // Decorative lines
  LINE: '━━━━━━━━━━━━━━━━━━━━━',
  LINE_THIN: '─────────────────────',
  LINE_THICK: '═════════════════════',
  LINE_STAR: '✦ ─────────────── ✦',
  LINE_DIAMOND: '◈ ─────────────── ◈',
  
  // Section headers
  HEADER_START: '╭━━━',
  HEADER_END: '━━━╮',
  FOOTER_START: '╰━━━',
  FOOTER_END: '━━━╯',
  
  // Bullets
  BULLET: '▸',
  ARROW: '→',
  STAR: '★',
  DIAMOND: '◆',
  CIRCLE: '●',
  
  // Status icons
  SUCCESS: '✅',
  ERROR: '❌',
  WARNING: '⚠️',
  INFO: 'ℹ️',
  LOADING: '⏳',
  
  // Game/Tournament icons
  TROPHY: '🏆',
  GAME: '🎮',
  SWORD: '⚔️',
  TARGET: '🎯',
  FIRE: '🔥',
  CROWN: '👑',
  MEDAL: '🏅',
  STAR_GLOW: '✨',
  
  // Division icons
  MALE: '♂️',
  FEMALE: '♀️',
  
  // Social/Community
  USERS: '👥',
  CLUB: '🏢',
  HANDSHAKE: '🤝',
  HEART: '❤️',
  
  // Money/Payment
  MONEY: '💰',
  WALLET: '👛',
  GIFT: '🎁',
  DIAMOND_BLUE: '💎',
};

// Premium box formatter
export function premiumBox(title: string, content: string[], footer?: string): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.HEADER_START} *${title}* ${PREMIUM.HEADER_END}`);
  lines.push('');
  for (const line of content) {
    lines.push(`│ ${line}`);
  }
  lines.push('');
  if (footer) {
    lines.push(`│ ${PREMIUM.LINE_THIN}`);
    lines.push(`│ ${footer}`);
  }
  lines.push(`${PREMIUM.FOOTER_START}${PREMIUM.LINE_THIN}${PREMIUM.FOOTER_END}`);
  
  return lines.join('\n');
}

// Simple card formatter
export function premiumCard(title: string, content: string[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.LINE_DIAMOND}`);
  lines.push(`  *${title}*`);
  lines.push(`${PREMIUM.LINE_DIAMOND}`);
  lines.push('');
  for (const line of content) {
    lines.push(line);
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// TOURNAMENT TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateTournamentStatus(tournaments: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.TROPHY} *IDOL META - STATUS TURNAMEN*`);
  lines.push(`${PREMIUM.STAR_GLOW} Season Terbaru`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  if (tournaments.length === 0) {
    lines.push(`${PREMIUM.WARNING} Belum ada turnamen aktif`);
    lines.push('');
    lines.push(`${PREMIUM.INFO} Hubungi admin untuk membuat`);
    lines.push('turnamen baru.');
    return lines.join('\n');
  }
  
  const statusEmoji: Record<string, string> = {
    setup: '🔧',
    registration: '📝',
    ongoing: '🔴',
    completed: '✅',
  };
  
  for (let i = 0; i < tournaments.length; i++) {
    const t = tournaments[i];
    const icon = statusEmoji[t.status] || '❓';
    const divIcon = t.division === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
    const week = t.week ? `Week ${t.week}` : '';
    
    lines.push(`${icon} *${t.name}*`);
    lines.push(`   ${divIcon} ${t.division.toUpperCase()} ${week ? `• ${week}` : ''}`);
    lines.push(`   ${PREMIUM.TARGET} Status: _${formatStatus(t.status)}_`);
    lines.push(`   ${PREMIUM.MONEY} Prize: *${formatRupiah(t.prizePool)}*`);
    lines.push(`   ${PREMIUM.USERS} ${t.playerCount} Pemain • ${t.matchCount} Match`);
    
    if (i < tournaments.length - 1) {
      lines.push('');
      lines.push(`   ${PREMIUM.LINE_THIN}`);
      lines.push('');
    }
  }
  
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!jadwal* untuk jadwal pertandingan`);
  
  return lines.join('\n');
}

export function templatePlayerList(players: any[], division: string, tournamentName: string): string {
  const lines: string[] = [];
  const divIcon = division === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
  
  lines.push(`${PREMIUM.USERS} *DAFTAR PEMAIN* ${divIcon}`);
  lines.push(`${PREMIUM.GAME} ${tournamentName}`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  const approved = players.filter(p => p.regStatus === 'approved');
  const pending = players.filter(p => p.regStatus === 'pending');
  const rejected = players.filter(p => p.regStatus === 'rejected');
  
  if (approved.length > 0) {
    lines.push(`${PREMIUM.SUCCESS} *PEMAIN TERKONFIRMASI*`);
    lines.push(`   _${approved.length} peserta_`);
    lines.push('');
    
    for (let i = 0; i < Math.min(approved.length, 15); i++) {
      const p = approved[i];
      const tierIcon = getTierIcon(p.tierAssigned || p.tier);
      const genderIcon = p.gender === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
      const num = (i + 1).toString().padStart(2, '0');
      lines.push(`   ${num}. ${tierIcon} *${p.name}* ${genderIcon}`);
      lines.push(`       ${PREMIUM.DIAMOND} Tier: ${p.tierAssigned || p.tier}`);
    }
    
    if (approved.length > 15) {
      lines.push(`   ${PREMIUM.DOTS} dan *${approved.length - 15}* pemain lainnya`);
    }
    lines.push('');
  }
  
  if (pending.length > 0) {
    lines.push(`${PREMIUM.LOADING} *MENUNGGU KONFIRMASI*`);
    lines.push(`   _${pending.length} peserta_`);
    lines.push('');
    for (let i = 0; i < Math.min(pending.length, 5); i++) {
      lines.push(`   ${PREMIUM.BULLET} ${pending[i].name}`);
    }
    if (pending.length > 5) {
      lines.push(`   ${PREMIUM.DOTS} dan ${pending.length - 5} lainnya`);
    }
    lines.push('');
  }
  
  if (rejected.length > 0) {
    lines.push(`${PREMIUM.ERROR} *DITOLAK* (${rejected.length})`);
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Total: *${players.length}* pemain terdaftar`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// BRACKET & MATCH TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateBracketSummary(tournament: any, matches: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.SWORD} *BRACKET PERTANDINGAN*`);
  lines.push(`${PREMIUM.TROPHY} ${tournament.name}`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  // Group matches by round
  const roundMatches: Record<number, any[]> = {};
  for (const m of matches) {
    if (!roundMatches[m.round]) roundMatches[m.round] = [];
    roundMatches[m.round].push(m);
  }
  
  const totalRounds = Object.keys(roundMatches).length;
  
  for (const round of Object.keys(roundMatches).map(Number).sort((a, b) => a - b)) {
    const roundMatches_ = roundMatches[round];
    const roundLabel = getRoundLabel(round, totalRounds);
    
    lines.push(`${PREMIUM.TARGET} *${roundLabel}*`);
    lines.push(`   _${roundMatches_.length} pertandingan_`);
    lines.push('');
    
    for (const m of roundMatches_.slice(0, 4)) {
      const status = m.status === 'completed' ? '✅' : m.status === 'ongoing' ? '🔴' : '⏳';
      lines.push(`   ${status} ${m.teamA?.name || 'TBD'} vs ${m.teamB?.name || 'TBD'}`);
      if (m.status === 'completed') {
        lines.push(`       ${PREMIUM.ARROW} ${m.scoreA} - ${m.scoreB}`);
      }
    }
    
    if (roundMatches_.length > 4) {
      lines.push(`   ${PREMIUM.DOTS} +${roundMatches_.length - 4} match lainnya`);
    }
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!hasil* untuk detail skor`);
  
  return lines.join('\n');
}

export function templateMatchResult(match: any, teamA: any, teamB: any): string {
  const lines: string[] = [];
  
  const isTeamAWinner = match.winnerId === teamA?.id;
  const isTeamBWinner = match.winnerId === teamB?.id;
  
  lines.push(`${PREMIUM.FIRE} *HASIL PERTANDINGAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  lines.push(`   ${isTeamAWinner ? PREMIUM.CROWN : ''} *${teamA?.name || 'TBD'}*`);
  lines.push(`          ${PREMIUM.SWORD}`);
  lines.push(`   ${isTeamBWinner ? PREMIUM.CROWN : ''} *${teamB?.name || 'TBD'}*`);
  lines.push('');
  
  lines.push(`${PREMIUM.LINE_STAR}`);
  lines.push('');
  lines.push(`   ${PREMIUM.TARGET} *SKOR AKHIR*`);
  lines.push('');
  lines.push(`   ${teamA?.name || 'Team A'}  ${PREMIUM.ARROW}  *${match.scoreA || 0}*`);
  lines.push(`   ${teamB?.name || 'Team B'}  ${PREMIUM.ARROW}  *${match.scoreB || 0}*`);
  lines.push('');
  
  if (match.winnerId) {
    const winnerName = isTeamAWinner ? teamA?.name : teamB?.name;
    lines.push(`${PREMIUM.TROPHY} *PEMENANG: ${winnerName}*`);
  }
  
  if (match.mvpId) {
    lines.push(`${PREMIUM.MEDAL} *MVP Match*`);
  }
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// REGISTRATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateRegistrationSuccess(user: any, tournament: any, tier: string): string {
  const lines: string[] = [];
  const divIcon = tournament.division === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
  const tierIcon = getTierIcon(tier);
  
  lines.push(`${PREMIUM.SUCCESS} *PENDAFTARAN BERHASIL!*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  lines.push(`${PREMIUM.USERS} *Data Pendaftaran*`);
  lines.push('');
  lines.push(`   ${PREMIUM.BULLET} Nama: *${user.name}*`);
  lines.push(`   ${PREMIUM.BULLET} Divisi: ${divIcon} *${tournament.division.toUpperCase()}*`);
  lines.push(`   ${PREMIUM.BULLET} Turnamen: *${tournament.name}*`);
  lines.push(`   ${PREMIUM.BULLET} Tier: ${tierIcon} *${tier}*`);
  lines.push(`   ${PREMIUM.BULLET} Status: ${PREMIUM.LOADING} _Menunggu Konfirmasi_`);
  lines.push('');
  
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.INFO} Ketik *!akun* untuk cek status`);
  lines.push(`${PREMIUM.INFO} Ketik *!jadwal* untuk jadwal pertandingan`);
  
  return lines.join('\n');
}

export function templateAccountInfo(user: any, registrations: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.USERS} *PROFIL AKUN ANDA*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  // User info
  const tierIcon = getTierIcon(user.tier);
  const genderIcon = user.gender === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
  
  lines.push(`${PREMIUM.GAME} *Informasi Pemain*`);
  lines.push('');
  lines.push(`   ${PREMIUM.BULLET} Nama: *${user.name}*`);
  lines.push(`   ${PREMIUM.BULLET} Gender: ${genderIcon}`);
  lines.push(`   ${PREMIUM.BULLET} Tier: ${tierIcon} *${user.tier}*`);
  lines.push(`   ${PREMIUM.BULLET} Poin: *${user.points || 0}* pts`);
  
  if (user.club) {
    lines.push(`   ${PREMIUM.CLUB} Club: *${user.club.name}*`);
  }
  lines.push('');
  
  // Registration status
  if (registrations.length > 0) {
    lines.push(`${PREMIUM.TROPHY} *Status Pendaftaran*`);
    lines.push('');
    
    for (const reg of registrations) {
      const statusIcon = reg.status === 'approved' ? PREMIUM.SUCCESS : 
                         reg.status === 'pending' ? PREMIUM.LOADING : PREMIUM.ERROR;
      const divIcon = reg.division === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
      
      lines.push(`   ${statusIcon} ${reg.tournamentName}`);
      lines.push(`      ${divIcon} ${reg.division.toUpperCase()} • ${reg.tierAssigned || user.tier}`);
      lines.push(`      Status: _${formatStatus(reg.status)}_`);
      lines.push('');
    }
  } else {
    lines.push(`${PREMIUM.WARNING} Anda belum terdaftar di turnamen`);
    lines.push('');
    lines.push(`${PREMIUM.INFO} Ketik *!daftar <nama>* untuk mendaftar`);
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!profil ${user.name}* untuk detail`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateLeaderboard(players: any[], division: string): string {
  const lines: string[] = [];
  const divIcon = division === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
  
  lines.push(`${PREMIUM.CROWN} *LEADERBOARD TOP 10*`);
  lines.push(`${divIcon} Divisi ${division.toUpperCase()}`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < Math.min(players.length, 10); i++) {
    const p = players[i];
    const medal = i < 3 ? medals[i] : `${(i + 1).toString().padStart(2, '0')}.`;
    const tierIcon = getTierIcon(p.tier);
    
    lines.push(`   ${medal} *${p.name}*`);
    lines.push(`       ${tierIcon} ${p.tier} • ${p.points || 0} pts • W:${p.wins || 0}/L:${p.losses || 0}`);
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!profil <nama>* untuk detail`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT/DONATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateDonationSuccess(amount: number, message: string, total: number): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.GIFT} *TERIMA KASIH!*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.HEART} Donasi Anda telah diterima`);
  lines.push('');
  lines.push(`   ${PREMIUM.MONEY} Jumlah: *${formatRupiah(amount)}*`);
  if (message) {
    lines.push(`   ${PREMIUM.BULLET} Pesan: _"${message}"_`);
  }
  lines.push('');
  lines.push(`${PREMIUM.DIAMOND_BLUE} Total Donasi Season: *${formatRupiah(total)}*`);
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.STAR_GLOW} Dukungan Anda sangat berarti!`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT INSTRUCTION TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export interface PaymentSettingsData {
  bankName: string;
  bankCode: string;
  bankNumber: string;
  bankHolder: string;
  gopayNumber: string;
  gopayHolder: string;
  ovoNumber: string;
  ovoHolder: string;
  danaNumber: string;
  danaHolder: string;
  qrisLabel: string;
  qrisImage: string;
  activeMethods: string[];
}

export function templatePaymentInstructions(settings: PaymentSettingsData | null): string {
  const lines: string[] = [];
  
  lines.push(`💳 *CARA PEMBAYARAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  if (!settings) {
    lines.push(`⚠️ _Info pembayaran belum tersedia_`);
    lines.push(`Hubungi admin untuk detail pembayaran`);
    return lines.join('\n');
  }
  
  const methods = settings.activeMethods || [];
  
  // Bank Transfer
  if (methods.includes('bank_transfer') && settings.bankNumber) {
    lines.push(`🏦 *TRANSFER BANK*`);
    lines.push(`   Bank: *${settings.bankName || 'Bank'}*`);
    lines.push(`   No. Rekening: *${settings.bankNumber}*`);
    lines.push(`   Atas Nama: *${settings.bankHolder || 'IDOL META'}*`);
    lines.push('');
  }
  
  // E-Wallets
  if (methods.includes('ewallet')) {
    if (settings.gopayNumber) {
      lines.push(`💚 *GOPAY*`);
      lines.push(`   No: *${settings.gopayNumber}*`);
      lines.push(`   Nama: *${settings.gopayHolder || 'IDOL META'}*`);
      lines.push('');
    }
    if (settings.ovoNumber) {
      lines.push(`💜 *OVO*`);
      lines.push(`   No: *${settings.ovoNumber}*`);
      lines.push(`   Nama: *${settings.ovoHolder || 'IDOL META'}*`);
      lines.push('');
    }
    if (settings.danaNumber) {
      lines.push(`💙 *DANA*`);
      lines.push(`   No: *${settings.danaNumber}*`);
      lines.push(`   Nama: *${settings.danaHolder || 'IDOL META'}*`);
      lines.push('');
    }
  }
  
  // QRIS
  if (methods.includes('qris') && settings.qrisLabel) {
    lines.push(`📱 *QRIS*`);
    lines.push(`   Merchant: *${settings.qrisLabel}*`);
    lines.push(`   Scan QR code di website untuk bayar`);
    lines.push('');
  }
  
  return lines.join('\n');
}

export function templateDonationPending(amount: number, message: string, settings: PaymentSettingsData | null): string {
  const lines: string[] = [];
  
  lines.push(`💝 *DONASI SEASON 2*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.MONEY} Jumlah: *${formatRupiah(amount)}*`);
  if (message) {
    lines.push(`${PREMIUM.BULLET} Pesan: _"${message}"_`);
  }
  lines.push(`📋 Status: ⏳ *Menunggu Pembayaran*`);
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  // Add payment instructions
  lines.push(templatePaymentInstructions(settings));
  
  lines.push(PREMIUM.LINE);
  lines.push(`📝 *KONFIRMASI PEMBAYARAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`Setelah transfer, kirim bukti ke:`);
  lines.push(`${PREMIUM.ARROW} Admin grup atau`);
  lines.push(`${PREMIUM.ARROW} Chat pribadi admin`);
  lines.push('');
  lines.push(`${PREMIUM.SUCCESS} Donasi akan dikonfirmasi oleh admin`);
  lines.push(`   setelah bukti pembayaran diterima.`);
  lines.push('');
  lines.push(`🙏 Terima kasih atas dukungan Anda!`);
  lines.push(`${PREMIUM.INFO} Ketik *!topdonasi* untuk melihat donatur teratas.`);
  
  return lines.join('\n');
}

export function templateSawerPending(amount: number, message: string, targetPlayer: string | null, settings: PaymentSettingsData | null): string {
  const lines: string[] = [];
  
  lines.push(`💸 *SAWER PEMAIN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.MONEY} Jumlah: *${formatRupiah(amount)}*`);
  if (targetPlayer) {
    lines.push(`${PREMIUM.TARGET} Penerima: *${targetPlayer}*`);
  }
  if (message) {
    lines.push(`${PREMIUM.BULLET} Pesan: _"${message}"_`);
  }
  lines.push(`📋 Status: ⏳ *Menunggu Pembayaran*`);
  lines.push(`🎯 Sawer akan masuk ke *Prize Pool* turnamen!`);
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  // Add payment instructions
  lines.push(templatePaymentInstructions(settings));
  
  lines.push(PREMIUM.LINE);
  lines.push(`📝 *KONFIRMASI PEMBAYARAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`Setelah transfer, kirim bukti ke:`);
  lines.push(`${PREMIUM.ARROW} Admin grup atau`);
  lines.push(`${PREMIUM.ARROW} Chat pribadi admin`);
  lines.push('');
  lines.push(`${PREMIUM.SUCCESS} Sawer akan dikonfirmasi oleh admin`);
  lines.push(`   setelah bukti pembayaran diterima.`);
  lines.push('');
  lines.push(`🙏 Terima kasih atas dukungan Anda!`);
  lines.push(`${PREMIUM.INFO} Ketik *!topsawer* untuk melihat kontributor teratas.`);
  
  return lines.join('\n');
}

export function templateSawerSuccess(targetPlayer: string, amount: number, message: string): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.HEART} *SAWER BERHASIL!*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.TARGET} Penerima: *${targetPlayer}*`);
  lines.push(`   ${PREMIUM.MONEY} Jumlah: *${formatRupiah(amount)}*`);
  if (message) {
    lines.push(`   ${PREMIUM.BULLET} Pesan: _"${message}"_`);
  }
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.STAR_GLOW} Terima kasih telah mendukung pemain!`);
  
  return lines.join('\n');
}

export function templateTopDonors(donors: any[], sawers: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.DIAMOND_BLUE} *TOP SUPPORTERS*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  // Top Donors
  lines.push(`${PREMIUM.GIFT} *Top Donatur*`);
  lines.push('');
  const medals = ['🥇', '🥈', '🥉'];
  for (let i = 0; i < Math.min(donors.length, 5); i++) {
    const d = donors[i];
    const medal = i < 3 ? medals[i] : `${i + 1}.`;
    const name = d.anonymous ? '_Anonymous_' : `*${d.name || 'Anonymous'}*`;
    lines.push(`   ${medal} ${name}`);
    lines.push(`       ${PREMIUM.MONEY} ${formatRupiah(d.totalAmount || d.amount)}`);
    lines.push('');
  }
  
  // Top Sawers
  lines.push(`${PREMIUM.HEART} *Top Sawer*`);
  lines.push('');
  for (let i = 0; i < Math.min(sawers.length, 5); i++) {
    const s = sawers[i];
    const medal = i < 3 ? medals[i] : `${i + 1}.`;
    lines.push(`   ${medal} *${s.name || 'Anonymous'}*`);
    lines.push(`       ${PREMIUM.MONEY} ${formatRupiah(s.totalAmount || s.amount)}`);
    if (s.targetPlayer) {
      lines.push(`       ${PREMIUM.ARROW} ke ${s.targetPlayer}`);
    }
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!donasi* atau *!sawer* untuk berkontribusi`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELP MENU TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export function templateHelpMenu(): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.GAME} *IDOL META BOT*`);
  lines.push(`${PREMIUM.STAR_GLOW} Asisten Turnamen Esports`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  lines.push(`${PREMIUM.TROPHY} *PERINTAH TURNAMEN*`);
  lines.push(`   ${PREMIUM.BULLET} !status - Status turnamen`);
  lines.push(`   ${PREMIUM.BULLET} !jadwal - Jadwal pertandingan`);
  lines.push(`   ${PREMIUM.BULLET} !hasil - Hasil pertandingan`);
  lines.push(`   ${PREMIUM.BULLET} !bracket - Bracket turnamen`);
  lines.push(`   ${PREMIUM.BULLET} !peringkat - Top 10 pemain`);
  lines.push(`   ${PREMIUM.BULLET} !juara - Daftar juara`);
  lines.push('');
  
  lines.push(`${PREMIUM.USERS} *PERINTAH PEMAIN*`);
  lines.push(`   ${PREMIUM.BULLET} !daftar <nama> [divisi]`);
  lines.push(`   ${PREMIUM.BULLET} !akun - Status pendaftaran`);
  lines.push(`   ${PREMIUM.BULLET} !pemain - Daftar pemain`);
  lines.push(`   ${PREMIUM.BULLET} !profil <nama> - Profil pemain`);
  lines.push(`   ${PREMIUM.BULLET} !statistik <nama> - Statistik`);
  lines.push('');
  
  lines.push(`${PREMIUM.MONEY} *PERINTAH DONASI*`);
  lines.push(`   ${PREMIUM.BULLET} !donasi <jumlah> [pesan]`);
  lines.push(`   ${PREMIUM.BULLET} !sawer <jumlah> <pemain>`);
  lines.push(`   ${PREMIUM.BULLET} !topdonasi - Top donatur`);
  lines.push(`   ${PREMIUM.BULLET} !topsawer - Top sawer`);
  lines.push('');
  
  lines.push(`${PREMIUM.CLUB} *PERINTAH CLUB*`);
  lines.push(`   ${PREMIUM.BULLET} !club - Ranking club`);
  lines.push(`   ${PREMIUM.BULLET} !tim - Lihat tim`);
  lines.push(`   ${PREMIUM.BULLET} !mvp - Info MVP`);
  lines.push('');
  
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${PREMIUM.INFO} Contoh:`);
  lines.push(`   ${PREMIUM.ARROW} !daftar Joko`);
  lines.push(`   ${PREMIUM.ARROW} !daftar Sari female`);
  lines.push(`   ${PREMIUM.ARROW} !sawer 50000 Semangat!`);
  lines.push('');
  lines.push(`${PREMIUM.STAR_GLOW} Powered by IDOL META`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// PLAYER PROFILE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export function templatePlayerProfile(player: any, stats: any): string {
  const lines: string[] = [];
  const tierIcon = getTierIcon(player.tier);
  const genderIcon = player.gender === 'male' ? PREMIUM.MALE : PREMIUM.FEMALE;
  
  lines.push(`${PREMIUM.GAME} *PROFIL PEMAIN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  lines.push(`   ${tierIcon} *${player.name}* ${genderIcon}`);
  lines.push(`   ${PREMIUM.DIAMOND} Tier: *${player.tier}*`);
  
  if (player.club) {
    lines.push(`   ${PREMIUM.CLUB} Club: *${player.club.name}*`);
  }
  
  lines.push('');
  lines.push(`${PREMIUM.LINE_STAR}`);
  lines.push('');
  
  // Stats
  lines.push(`${PREMIUM.TROPHY} *Statistik*`);
  lines.push('');
  lines.push(`   ${PREMIUM.TARGET} Poin: *${player.points || 0}* pts`);
  lines.push(`   ${PREMIUM.SUCCESS} Menang: *${stats?.wins || 0}*`);
  lines.push(`   ${PREMIUM.ERROR} Kalah: *${stats?.losses || 0}*`);
  
  const winRate = stats?.wins && stats?.losses 
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100) 
    : 0;
  lines.push(`   ${PREMIUM.FIRE} Win Rate: *${winRate}%*`);
  
  if (player.isMVP) {
    lines.push('');
    lines.push(`${PREMIUM.CROWN} *MVP SEASON!* ${PREMIUM.STAR_GLOW}`);
  }
  
  lines.push('');
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!statistik ${player.name}* untuk detail`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR & NOTIFICATION TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════

export function templateError(title: string, message: string, suggestion?: string): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.ERROR} *${title}*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${message}`);
  lines.push('');
  if (suggestion) {
    lines.push(`${PREMIUM.INFO} ${suggestion}`);
    lines.push('');
  }
  lines.push(PREMIUM.LINE);
  
  return lines.join('\n');
}

export function templateNotFound(what: string, suggestion?: string): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.WARNING} *TIDAK DITEMUKAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`${what} tidak ditemukan.`);
  lines.push('');
  if (suggestion) {
    lines.push(`${PREMIUM.INFO} ${suggestion}`);
    lines.push('');
  }
  
  return lines.join('\n');
}

export function templateRateLimited(waitSeconds: number): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.WARNING} *MOHON TUNGGU*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  lines.push(`Anda mengirim terlalu banyak perintah.`);
  lines.push('');
  lines.push(`${PREMIUM.LOADING} Tunggu *${waitSeconds} detik* lagi.`);
  lines.push('');
  lines.push(PREMIUM.LINE);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEDULE TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export function templateSchedule(matches: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.TARGET} *JADWAL PERTANDINGAN*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  if (matches.length === 0) {
    lines.push(`${PREMIUM.INFO} Belum ada jadwal pertandingan.`);
    lines.push('');
    lines.push(`${PREMIUM.LOADING} Cek lagi nanti atau hubungi admin.`);
    return lines.join('\n');
  }
  
  // Group by date
  const today: any[] = [];
  const upcoming: any[] = [];
  const ongoing: any[] = [];
  const now = new Date();
  
  for (const m of matches) {
    if (m.status === 'ongoing') {
      ongoing.push(m);
    } else if (m.scheduledAt) {
      const matchDate = new Date(m.scheduledAt);
      if (matchDate.toDateString() === now.toDateString()) {
        today.push(m);
      } else if (matchDate > now) {
        upcoming.push(m);
      }
    }
  }
  
  // Ongoing matches
  if (ongoing.length > 0) {
    lines.push(`${PREMIUM.FIRE} *SEDANG BERLANGSUNG*`);
    lines.push('');
    for (const m of ongoing) {
      lines.push(`   ${PREMIUM.SWORD} *${m.teamA?.name || 'TBD'}* vs *${m.teamB?.name || 'TBD'}*`);
      lines.push(`      ${m.tournamentName}`);
      lines.push('');
    }
  }
  
  // Today's matches
  if (today.length > 0) {
    lines.push(`${PREMIUM.TARGET} *HARI INI*`);
    lines.push('');
    for (const m of today) {
      const time = m.scheduledAt ? formatTime(m.scheduledAt) : 'TBD';
      lines.push(`   ${PREMIUM.BULLET} *${m.teamA?.name || 'TBD'}* vs *${m.teamB?.name || 'TBD'}*`);
      lines.push(`      ${PREMIUM.INFO} ${time} • ${m.tournamentName}`);
      lines.push('');
    }
  }
  
  // Upcoming
  if (upcoming.length > 0) {
    lines.push(`${PREMIUM.LOADING} *AKAN DATANG*`);
    lines.push('');
    for (const m of upcoming.slice(0, 5)) {
      const date = m.scheduledAt ? formatDate(m.scheduledAt) : 'TBD';
      lines.push(`   ${PREMIUM.BULLET} ${m.teamA?.name || 'TBD'} vs ${m.teamB?.name || 'TBD'}`);
      lines.push(`      ${PREMIUM.INFO} ${date}`);
      lines.push('');
    }
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!hasil* untuk hasil pertandingan`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// MVP TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export function templateMVP(players: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.CROWN} *MVP STANDINGS*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  if (players.length === 0) {
    lines.push(`${PREMIUM.INFO} Belum ada MVP terpilih.`);
    lines.push('');
    lines.push(`${PREMIUM.LOADING} MVP akan ditentukan setelah`);
    lines.push(`turnamen selesai.`);
    return lines.join('\n');
  }
  
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    const tierIcon = getTierIcon(p.tier);
    const medal = i === 0 ? '👑' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
    
    lines.push(`   ${medal} *${p.name}*`);
    lines.push(`       ${tierIcon} ${p.tier} • ${p.mvpScore || 0} MVP pts`);
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} MVP berdasarkan performa pertandingan`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// CLUB TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════

export function templateClubRanking(clubs: any[]): string {
  const lines: string[] = [];
  
  lines.push(`${PREMIUM.CLUB} *RANKING CLUB*`);
  lines.push(PREMIUM.LINE);
  lines.push('');
  
  if (clubs.length === 0) {
    lines.push(`${PREMIUM.INFO} Belum ada club terdaftar.`);
    return lines.join('\n');
  }
  
  const medals = ['🥇', '🥈', '🥉'];
  
  for (let i = 0; i < clubs.length; i++) {
    const c = clubs[i];
    const medal = i < 3 ? medals[i] : `${(i + 1).toString().padStart(2, '0')}.`;
    
    lines.push(`   ${medal} *${c.name}*`);
    lines.push(`       ${PREMIUM.USERS} ${c.memberCount || 0} anggota`);
    lines.push(`       ${PREMIUM.TROPHY} ${c.totalPoints || 0} pts total`);
    lines.push('');
  }
  
  lines.push(PREMIUM.LINE);
  lines.push(`${PREMIUM.INFO} Ketik *!club <nama>* untuk detail`);
  
  return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function getTierIcon(tier: string): string {
  switch (tier?.toUpperCase()) {
    case 'S': return '🌟';
    case 'A': return '⭐';
    case 'B': return '✦';
    case 'C': return '◈';
    default: return '●';
  }
}

function formatStatus(status: string): string {
  const labels: Record<string, string> = {
    setup: 'Persiapan',
    registration: 'Pendaftaran Dibuka',
    ongoing: 'Sedang Berlangsung',
    completed: 'Selesai',
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolah',
  };
  return labels[status] || status;
}

function formatNumber(num: number): string {
  return num?.toLocaleString('id-ID') || '0';
}

/** Format as Indonesian Rupiah */
function formatRupiah(num: number): string {
  return `Rp${num?.toLocaleString('id-ID', { minimumFractionDigits: 0 }) || '0'}`;
}

function formatTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'TBD';
  }
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return 'TBD';
  }
}

function getRoundLabel(round: number, maxRound: number): string {
  if (round === maxRound) return 'GRAND FINAL';
  if (round === maxRound - 1) return 'SEMI FINAL';
  if (round === maxRound - 2) return 'QUARTER FINAL';
  return `ROUND ${round}`;
}

// Add DOTS constant
PREMIUM.DOTS = '⋯';
