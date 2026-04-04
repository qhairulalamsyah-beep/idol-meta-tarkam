/**
 * Database Queries using Prisma for WhatsApp Bot
 * Connects to Supabase PostgreSQL
 */

import prisma from './db-prisma';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface DbRow {
  [key: string]: unknown;
}

export interface TournamentData {
  id: string;
  name: string;
  division: string;
  type: string;
  status: string;
  week: number | null;
  bracketType: string | null;
  prizePool: number;
  playerCount: number;
  matchCount: number;
}

export interface PlayerData {
  id: string;
  name: string;
  tier: string;
  gender: string;
  points: number;
  phone: string | null;
  whatsappJid: string | null;
}

export interface RegistrationData {
  id: string;
  userId: string;
  tournamentId: string;
  status: string;
  tierAssigned: string | null;
  user: PlayerData;
}

export interface MatchData {
  id: string;
  tournamentId: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  mvpId: string | null;
  status: string;
  bracket: string;
  scheduledAt: Date | null;
  completedAt: Date | null;
  teamA?: { id: string; name: string } | null;
  teamB?: { id: string; name: string } | null;
  winner?: { id: string; name: string } | null;
  mvp?: { id: string; name: string } | null;
}

export interface RankingData {
  id: string;
  userId: string;
  points: number;
  wins: number;
  losses: number;
  rank: number | null;
  user: PlayerData;
}

export interface DonationData {
  id: string;
  userId: string | null;
  donorName: string | null;
  amount: number;
  message: string | null;
  anonymous: boolean;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: Date;
  user?: PlayerData | null;
}

export interface SawerData {
  id: string;
  tournamentId: string | null;
  senderName: string;
  targetPlayerName: string | null;
  amount: number;
  message: string | null;
  paymentStatus: string;
  createdAt: Date;
}

export interface ClubData {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  _count?: { members: number };
}

// ═══════════════════════════════════════════════════════════════════════════
// DATABASE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if database is available
 */
export async function isDbAvailable(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

/**
 * Get latest tournaments with stats
 */
export async function getTournaments(limit: number = 6): Promise<TournamentData[]> {
  const tournaments = await prisma.tournament.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          registrations: true,
          matches: true
        }
      }
    }
  });

  return tournaments.map(t => ({
    id: t.id,
    name: t.name,
    division: t.division,
    type: t.type,
    status: t.status,
    week: t.week,
    bracketType: t.bracketType,
    prizePool: t.prizePool,
    playerCount: t._count.registrations,
    matchCount: t._count.matches
  }));
}

/**
 * Get latest tournament by division
 */
export async function getTournamentByDivision(division: string): Promise<{ id: string; name: string } | null> {
  return prisma.tournament.findFirst({
    where: { division },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true }
  });
}

/**
 * Get tournament by ID
 */
export async function getTournamentById(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      registrations: {
        include: {
          user: true
        }
      }
    }
  });
}

/**
 * Get registrations for a tournament
 */
export async function getRegistrations(tournamentId: string): Promise<RegistrationData[]> {
  const regs = await prisma.registration.findMany({
    where: { tournamentId },
    include: {
      user: true
    },
    orderBy: [
      { status: 'asc' },
      { user: { name: 'asc' } }
    ]
  });

  return regs.map(r => ({
    id: r.id,
    userId: r.userId,
    tournamentId: r.tournamentId,
    status: r.status,
    tierAssigned: r.tierAssigned,
    user: {
      id: r.user.id,
      name: r.user.name,
      tier: r.user.tier,
      gender: r.user.gender,
      points: r.user.points,
      phone: r.user.phone,
      whatsappJid: r.user.whatsappJid
    }
  }));
}

/**
 * Get user by phone number
 */
export async function getUserByPhone(phone: string): Promise<PlayerData | null> {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: phone },
        { whatsappJid: { contains: phone } }
      ]
    }
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    tier: user.tier,
    gender: user.gender,
    points: user.points,
    phone: user.phone,
    whatsappJid: user.whatsappJid
  };
}

/**
 * Get user by name (fuzzy search)
 */
export async function getUserByName(name: string): Promise<PlayerData | null> {
  const user = await prisma.user.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive'
      }
    }
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    tier: user.tier,
    gender: user.gender,
    points: user.points,
    phone: user.phone,
    whatsappJid: user.whatsappJid
  };
}

/**
 * Get user by WhatsApp JID
 */
export async function getUserByJid(jid: string): Promise<PlayerData | null> {
  const user = await prisma.user.findFirst({
    where: { whatsappJid: jid }
  });

  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    tier: user.tier,
    gender: user.gender,
    points: user.points,
    phone: user.phone,
    whatsappJid: user.whatsappJid
  };
}

/**
 * Create or update user from WhatsApp registration
 */
export async function createOrUpdateUser(data: {
  name: string;
  phone: string;
  whatsappJid: string;
  gender?: string;
  clubId?: string;
}): Promise<PlayerData> {
  // Check if user exists by phone or JID
  let user = await prisma.user.findFirst({
    where: {
      OR: [
        { phone: data.phone },
        { whatsappJid: data.whatsappJid }
      ]
    }
  });

  if (user) {
    // Update existing user
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: data.name,
        phone: data.phone,
        whatsappJid: data.whatsappJid,
        gender: data.gender || user.gender,
        clubId: data.clubId || user.clubId
      }
    });
  } else {
    // Create new user
    const email = `wa_${data.phone}@idolmeta.local`;
    user = await prisma.user.create({
      data: {
        name: data.name,
        email,
        phone: data.phone,
        whatsappJid: data.whatsappJid,
        gender: data.gender || 'male',
        tier: 'B',
        clubId: data.clubId
      }
    });
  }

  return {
    id: user.id,
    name: user.name,
    tier: user.tier,
    gender: user.gender,
    points: user.points,
    phone: user.phone,
    whatsappJid: user.whatsappJid
  };
}

/**
 * Register user to tournament
 */
export async function registerToTournament(
  userId: string,
  tournamentId: string
): Promise<{ success: boolean; registration?: RegistrationData; error?: string }> {
  try {
    // Check if already registered
    const existing = await prisma.registration.findUnique({
      where: {
        userId_tournamentId: { userId, tournamentId }
      }
    });

    if (existing) {
      return {
        success: false,
        error: existing.status === 'approved'
          ? 'Sudah terdaftar dan dikonfirmasi'
          : existing.status === 'pending'
            ? 'Pendaftaran masih menunggu konfirmasi'
            : 'Pendaftaran ditolak sebelumnya'
      };
    }

    const registration = await prisma.registration.create({
      data: {
        userId,
        tournamentId,
        status: 'pending'
      },
      include: { user: true }
    });

    return {
      success: true,
      registration: {
        id: registration.id,
        userId: registration.userId,
        tournamentId: registration.tournamentId,
        status: registration.status,
        tierAssigned: registration.tierAssigned,
        user: {
          id: registration.user.id,
          name: registration.user.name,
          tier: registration.user.tier,
          gender: registration.user.gender,
          points: registration.user.points,
          phone: registration.user.phone,
          whatsappJid: registration.user.whatsappJid
        }
      }
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get matches for a tournament
 */
export async function getMatches(tournamentId: string): Promise<MatchData[]> {
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    include: {
      teamA: { select: { id: true, name: true } },
      teamB: { select: { id: true, name: true } },
      winner: { select: { id: true, name: true } },
      mvp: { select: { id: true, name: true } }
    },
    orderBy: [{ round: 'asc' }, { matchNumber: 'asc' }]
  });

  return matches.map(m => ({
    id: m.id,
    tournamentId: m.tournamentId,
    round: m.round,
    matchNumber: m.matchNumber,
    teamAId: m.teamAId,
    teamBId: m.teamBId,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerId: m.winnerId,
    mvpId: m.mvpId,
    status: m.status,
    bracket: m.bracket,
    scheduledAt: m.scheduledAt,
    completedAt: m.completedAt,
    teamA: m.teamA,
    teamB: m.teamB,
    winner: m.winner,
    mvp: m.mvp
  }));
}

/**
 * Get rankings (leaderboard)
 */
export async function getRankings(division?: string, limit: number = 10): Promise<RankingData[]> {
  // Get users with their rankings, filtered by division if provided
  const users = await prisma.user.findMany({
    where: division ? { gender: division } : {},
    include: {
      rankings: true
    },
    orderBy: { points: 'desc' },
    take: limit
  });

  return users.map((u, idx) => ({
    id: u.rankings[0]?.id || `temp_${u.id}`,
    userId: u.id,
    points: u.points,
    wins: u.rankings[0]?.wins || 0,
    losses: u.rankings[0]?.losses || 0,
    rank: u.rankings[0]?.rank || idx + 1,
    user: {
      id: u.id,
      name: u.name,
      tier: u.tier,
      gender: u.gender,
      points: u.points,
      phone: u.phone,
      whatsappJid: u.whatsappJid
    }
  }));
}

/**
 * Get donations
 */
export async function getDonations(limit: number = 10): Promise<DonationData[]> {
  const donations = await prisma.donation.findMany({
    where: { paymentStatus: 'confirmed' },
    include: { user: true },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return donations.map(d => ({
    id: d.id,
    userId: d.userId,
    donorName: d.donorName,
    amount: d.amount,
    message: d.message,
    anonymous: d.anonymous,
    paymentMethod: d.paymentMethod,
    paymentStatus: d.paymentStatus,
    createdAt: d.createdAt,
    user: d.user ? {
      id: d.user.id,
      name: d.user.name,
      tier: d.user.tier,
      gender: d.user.gender,
      points: d.user.points,
      phone: d.user.phone,
      whatsappJid: d.user.whatsappJid
    } : undefined
  }));
}

/**
 * Get sawers
 */
export async function getSawers(tournamentId?: string, limit: number = 10): Promise<SawerData[]> {
  const sawers = await prisma.sawer.findMany({
    where: {
      paymentStatus: 'confirmed',
      ...(tournamentId ? { tournamentId } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  return sawers.map(s => ({
    id: s.id,
    tournamentId: s.tournamentId,
    senderName: s.senderName,
    targetPlayerName: s.targetPlayerName,
    amount: s.amount,
    message: s.message,
    paymentStatus: s.paymentStatus,
    createdAt: s.createdAt
  }));
}

/**
 * Get total prize pool (base + confirmed sawers)
 */
export async function getTotalPrizePool(tournamentId?: string): Promise<number> {
  const tournament = tournamentId
    ? await prisma.tournament.findUnique({ where: { id: tournamentId } })
    : await prisma.tournament.findFirst({ orderBy: { createdAt: 'desc' } });

  if (!tournament) return 0;

  const sawerTotal = await prisma.sawer.aggregate({
    where: {
      tournamentId: tournament.id,
      paymentStatus: 'confirmed'
    },
    _sum: { amount: true }
  });

  return tournament.prizePool + (sawerTotal._sum.amount || 0);
}

/**
 * Get clubs
 */
export async function getClubs(): Promise<ClubData[]> {
  const clubs = await prisma.club.findMany({
    include: {
      _count: { select: { members: true } }
    },
    orderBy: { name: 'asc' }
  });

  return clubs.map(c => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logoUrl: c.logoUrl,
    _count: { members: c._count.members }
  }));
}

/**
 * Get club by slug or name
 */
export async function getClub(slugOrName: string): Promise<ClubData | null> {
  const club = await prisma.club.findFirst({
    where: {
      OR: [
        { slug: slugOrName.toLowerCase() },
        { name: { equals: slugOrName, mode: 'insensitive' } }
      ]
    },
    include: {
      _count: { select: { members: true } },
      members: {
        select: {
          id: true,
          name: true,
          tier: true,
          points: true
        },
        orderBy: { points: 'desc' },
        take: 10
      }
    }
  });

  if (!club) return null;

  return {
    id: club.id,
    name: club.name,
    slug: club.slug,
    logoUrl: club.logoUrl,
    _count: { members: club._count.members }
  };
}

/**
 * Get MVP
 */
export async function getMVP(): Promise<PlayerData | null> {
  const mvp = await prisma.user.findFirst({
    where: { isMVP: true }
  });

  if (!mvp) return null;

  return {
    id: mvp.id,
    name: mvp.name,
    tier: mvp.tier,
    gender: mvp.gender,
    points: mvp.points,
    phone: mvp.phone,
    whatsappJid: mvp.whatsappJid
  };
}

/**
 * Get WhatsApp settings
 */
export async function getWhatsAppSettings() {
  return prisma.whatsAppSettings.findFirst();
}

/**
 * Update WhatsApp connection status
 */
export async function updateWhatsAppStatus(status: string) {
  const settings = await getWhatsAppSettings();

  if (settings) {
    return prisma.whatsAppSettings.update({
      where: { id: settings.id },
      data: {
        connectionStatus: status,
        lastConnectedAt: status === 'connected' ? new Date() : undefined
      }
    });
  } else {
    return prisma.whatsAppSettings.create({
      data: {
        connectionStatus: status,
        lastConnectedAt: status === 'connected' ? new Date() : undefined
      }
    });
  }
}

/**
 * Log bot activity
 */
export async function logBotActivity(data: {
  platform: string;
  command: string;
  sender?: string;
  senderId?: string;
  response?: string;
  success?: boolean;
  tournamentId?: string;
}) {
  return prisma.botLog.create({
    data: {
      platform: data.platform,
      command: data.command,
      sender: data.sender,
      senderId: data.senderId,
      response: data.response?.substring(0, 500),
      success: data.success ?? true,
      tournamentId: data.tournamentId
    }
  });
}

/**
 * Create donation from WhatsApp
 */
export async function createDonation(data: {
  userId?: string;
  donorName?: string;
  amount: number;
  message?: string;
  anonymous?: boolean;
}): Promise<DonationData> {
  const donation = await prisma.donation.create({
    data: {
      userId: data.userId,
      donorName: data.donorName,
      amount: data.amount,
      message: data.message,
      anonymous: data.anonymous ?? false,
      paymentStatus: 'pending'
    },
    include: { user: true }
  });

  return {
    id: donation.id,
    userId: donation.userId,
    donorName: donation.donorName,
    amount: donation.amount,
    message: donation.message,
    anonymous: donation.anonymous,
    paymentMethod: donation.paymentMethod,
    paymentStatus: donation.paymentStatus,
    createdAt: donation.createdAt,
    user: donation.user ? {
      id: donation.user.id,
      name: donation.user.name,
      tier: donation.user.tier,
      gender: donation.user.gender,
      points: donation.user.points,
      phone: donation.user.phone,
      whatsappJid: donation.user.whatsappJid
    } : undefined
  };
}

/**
 * Create sawer from WhatsApp
 */
export async function createSawer(data: {
  tournamentId?: string;
  senderName: string;
  targetPlayerName?: string;
  amount: number;
  message?: string;
}): Promise<SawerData> {
  const sawer = await prisma.sawer.create({
    data: {
      tournamentId: data.tournamentId,
      senderName: data.senderName,
      targetPlayerName: data.targetPlayerName,
      amount: data.amount,
      message: data.message,
      paymentStatus: 'pending'
    }
  });

  return {
    id: sawer.id,
    tournamentId: sawer.tournamentId,
    senderName: sawer.senderName,
    targetPlayerName: sawer.targetPlayerName,
    amount: sawer.amount,
    message: sawer.message,
    paymentStatus: sawer.paymentStatus,
    createdAt: sawer.createdAt
  };
}

/**
 * Get completed tournaments (champions)
 */
export async function getChampions(division?: string) {
  const tournaments = await prisma.tournament.findMany({
    where: {
      status: 'completed',
      ...(division ? { division } : {})
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  // Get winners for each tournament
  const result = [];
  for (const t of tournaments) {
    const finalMatch = await prisma.match.findFirst({
      where: {
        tournamentId: t.id,
        bracket: 'grand_final'
      },
      include: {
        winner: { select: { name: true } },
        teamA: { select: { name: true } },
        teamB: { select: { name: true } },
        mvp: { select: { name: true } }
      }
    });

    result.push({
      tournamentName: t.name,
      division: t.division,
      week: t.week,
      winner: finalMatch?.winner?.name || null,
      runnerUp: finalMatch?.winner?.name === finalMatch?.teamA?.name
        ? finalMatch?.teamB?.name
        : finalMatch?.teamA?.name || null,
      mvp: finalMatch?.mvp?.name || null,
      status: t.status
    });
  }

  return result;
}

/**
 * Get total stats
 */
export async function getTotalStats() {
  const [totalDonations, totalSawers, totalPlayers, totalMatches] = await Promise.all([
    prisma.donation.aggregate({
      where: { paymentStatus: 'confirmed' },
      _sum: { amount: true }
    }),
    prisma.sawer.aggregate({
      where: { paymentStatus: 'confirmed' },
      _sum: { amount: true }
    }),
    prisma.user.count(),
    prisma.match.count({ where: { status: 'completed' } })
  ]);

  return {
    totalDonations: totalDonations._sum.amount || 0,
    totalSawers: totalSawers._sum.amount || 0,
    totalPlayers,
    totalMatches
  };
}

export default prisma;
