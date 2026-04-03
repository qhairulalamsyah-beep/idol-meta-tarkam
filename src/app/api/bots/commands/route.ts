import { NextResponse } from 'next/server';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Command {
  command: string;
  description: string;
  usage?: string;
  category: 'general' | 'tournament' | 'social' | 'info';
  requiresArgs?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// WhatsApp Commands (20 total — ! prefix)
// ═══════════════════════════════════════════════════════════════════════════

const WHATSAPP_COMMANDS: Command[] = [
  {
    command: '!bantuan',
    description: 'Tampilkan daftar semua perintah',
    category: 'general',
  },
  {
    command: '!daftar <nama> [divisi]',
    description: 'Daftar ke turnamen (HP otomatis terdeteksi)',
    usage: '!daftar Joko\n!daftar Sari female',
    category: 'tournament',
    requiresArgs: true,
  },
  {
    command: '!akun',
    description: 'Cek info akun & status pendaftaran Anda',
    category: 'info',
  },
  {
    command: '!status',
    description: 'Status turnamen saat ini',
    category: 'info',
  },
  {
    command: '!pemain [divisi]',
    description: 'Daftar pemain terdaftar (filter: male/female)',
    usage: '!pemain\n!pemain female',
    category: 'tournament',
  },
  {
    command: '!tim',
    description: 'Lihat tim pertandingan beserta anggotanya',
    category: 'tournament',
  },
  {
    command: '!bracket',
    description: 'Ringkasan bracket pertandingan lengkap',
    category: 'tournament',
  },
  {
    command: '!hasil',
    description: 'Hasil pertandingan yang sudah selesai',
    category: 'tournament',
  },
  {
    command: '!jadwal',
    description: 'Jadwal pertandingan mendatang dan yang sedang berlangsung',
    category: 'tournament',
  },
  {
    command: '!peringkat',
    description: 'Peringkat pemain Top 10',
    category: 'info',
  },
  {
    command: '!hadiah',
    description: 'Informasi total hadiah dan donasi',
    category: 'social',
  },
  {
    command: '!sawer <jumlah> [pesan]',
    description: 'Sawer (tip) pemain selama pertandingan',
    usage: '!sawer 10000 Semangat!',
    category: 'social',
    requiresArgs: true,
  },
  {
    command: '!donasi <jumlah> [pesan]',
    description: 'Donasi untuk mendukung turnamen',
    usage: '!donasi 50000 Dukung terus!',
    category: 'social',
    requiresArgs: true,
  },
  {
    command: '!mvp',
    description: 'Info pemain MVP saat ini',
    category: 'info',
  },
  {
    command: '!profil <nama>',
    description: 'Cari & tampilkan profil pemain (partial match)',
    usage: '!profil Joko\n!profil "Sari Indah"',
    category: 'info',
    requiresArgs: true,
  },
  {
    command: '!statistik <nama>',
    description: 'Statistik detail pemain',
    usage: '!statistik Sari',
    category: 'info',
    requiresArgs: true,
  },
  {
    command: '!grup',
    description: 'Klasemen babak grup',
    category: 'tournament',
  },
  {
    command: '!nextmatch',
    description: 'Pertandingan selanjutnya',
    category: 'tournament',
  },
  {
    command: '!topdonasi',
    description: 'Top 10 donatur',
    category: 'social',
  },
  {
    command: '!topsawer',
    description: 'Top 10 sawer',
    category: 'social',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Discord Commands (19 total — / prefix)
// ═══════════════════════════════════════════════════════════════════════════

const DISCORD_COMMANDS: Command[] = [
  {
    command: '/help',
    description: 'Show all available commands',
    category: 'general',
  },
  {
    command: '/daftar <nama> <email>',
    description: 'Register for the latest tournament',
    usage: '/daftar John john@mail.com',
    category: 'tournament',
    requiresArgs: true,
  },
  {
    command: '/status [division]',
    description: 'View tournament status (filter: male/female)',
    usage: '/status\n/status female',
    category: 'info',
  },
  {
    command: '/pemain [division]',
    description: 'List registered players grouped by status',
    usage: '/pemain\n/pemain male',
    category: 'tournament',
  },
  {
    command: '/tim',
    description: 'View all teams with members and tier assignments',
    category: 'tournament',
  },
  {
    command: '/bracket [tournament_id]',
    description: 'View tournament bracket (latest active if no ID)',
    usage: '/bracket\n/bracket <tournament_id>',
    category: 'tournament',
  },
  {
    command: '/hasil',
    description: 'View completed match results with winner & MVP',
    category: 'tournament',
  },
  {
    command: '/jadwal',
    description: 'View upcoming and live match schedule',
    category: 'tournament',
  },
  {
    command: '/peringkat [division]',
    description: 'View top 10 player rankings',
    usage: '/peringkat\n/peringkat female',
    category: 'info',
  },
  {
    command: '/hadiah',
    description: 'View prize pool breakdown (tournament + donations + sawer)',
    category: 'info',
  },
  {
    command: '/sawer <amount> [message]',
    description: 'Tip a player during a match',
    usage: '/sawer 5000 Semangat!',
    category: 'social',
    requiresArgs: true,
  },
  {
    command: '/donasi <amount> [message]',
    description: 'Donate to support the tournament',
    usage: '/donasi 50000 Keep it up!',
    category: 'social',
    requiresArgs: true,
  },
  {
    command: '/mvp',
    description: 'Show current MVP player info',
    category: 'info',
  },
  {
    command: '/profil <name>',
    description: 'Search and show player profile (partial match)',
    usage: '/profil Joko',
    category: 'info',
    requiresArgs: true,
  },
  {
    command: '/statistik <name>',
    description: 'Detailed player statistics with win rate bar',
    usage: '/statistik Sari',
    category: 'info',
    requiresArgs: true,
  },
  {
    command: '/grup',
    description: 'View group stage standings',
    category: 'tournament',
  },
  {
    command: '/nextmatch',
    description: 'View the next upcoming match',
    category: 'tournament',
  },
  {
    command: '/topdonasi',
    description: 'View top 10 donors by total amount',
    category: 'social',
  },
  {
    command: '/topsawer',
    description: 'View top 10 sawer senders by total amount',
    category: 'social',
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// Route Handler
// ═══════════════════════════════════════════════════════════════════════════

/**
 * GET /api/bots/commands
 *
 * Returns the full list of available commands for both bots.
 * WhatsApp: 20 commands (! prefix)
 * Discord: 19 commands (/ prefix)
 */
export async function GET() {
  return NextResponse.json({
    whatsapp: WHATSAPP_COMMANDS,
    discord: DISCORD_COMMANDS,
  });
}
