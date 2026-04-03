import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createHash } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

// POST - Clear all data and re-seed with fresh participant & club data
export async function POST() {
  try {
    // ── Step 1: Delete all existing data (reverse dependency order) ──
    await db.playerMatchStat.deleteMany();
    await db.teamMember.deleteMany();
    await db.match.deleteMany();
    await db.team.deleteMany();
    await db.registration.deleteMany();
    await db.sawer.deleteMany();
    await db.donation.deleteMany();
    await db.ranking.deleteMany();
    await db.character.deleteMany();
    await db.activityLog.deleteMany();
    await db.botLog.deleteMany();
    await db.user.deleteMany();
    await db.tournament.deleteMany();
    await db.club.deleteMany();
    await db.settings.deleteMany();

    // ── Step 2: Create Super Admin (tazos) ──
    const adminHash = createHash('sha256').update('tazevsta').digest('hex');
    const superAdmin = await db.user.create({
      data: {
        id: uuidv4(),
        name: 'tazos',
        email: 'tazos@idm.local',
        gender: 'male',
        tier: 'S',
        points: 0,
        role: 'super_admin',
        adminPass: adminHash,
        permissions: JSON.stringify({
          tournament: true, players: true, bracket: true, scores: true,
          prize: true, donations: true, full_reset: true, manage_admins: true,
        }),
        isAdmin: true,
        avatar: '/assets/avatars/male-1.webp',
      },
    });

    // ── Step 3: Create Male Participants (excluding tazos who is super_admin) ──
    const maleNames = [
      'Bambang', 'arthur', 'sting', 'ipiin', 'ren',
      'earth', 'helix', 'predator', 'janskie', 'vrisket',
      'zmz', 'varnces', 'zico', 'chiko', 'oura',
      'lordfeng', 'georgie', 'life', 'rivaldo', 'afroli',
      'gunnery', 'afi', 'zeth', 'jayce',
    ]; // 24 males

    const femaleNames = [
      'evony', 'vion', 'cheeyaqq', 'skylin', 'arcalya',
      'moy', 'indie', 'reptil', 'metry', 'veronics',
      'aitan', 'irazz', 'ciki_w', 'wey_wey', 'cami',
      'yaay', 'dysa',
    ]; // 17 females

    const tiers = ['S', 'A', 'B'];

    // Avatar constants (26 male, 23 female available in /assets/avatars/)
    const MALE_AVATAR_COUNT = 26;
    const FEMALE_AVATAR_COUNT = 23;

    // Create male users (8 S + 8 A + 8 B = 24, perfectly balanced for 8 teams of 3)
    const maleUsers: Array<{ id: string; name: string; gender: string; tier: string; points: number }> = [];
    for (let i = 0; i < maleNames.length; i++) {
      // Round-robin tier: 0-7 = S, 8-15 = A, 16-23 = B
      const tier = tiers[Math.floor(i / 8) % 3];
      const points = tier === 'S' ? 500 + Math.floor(Math.random() * 500) :
                     tier === 'A' ? 200 + Math.floor(Math.random() * 300) :
                     50 + Math.floor(Math.random() * 150);
      const avatarIdx = (i % MALE_AVATAR_COUNT) + 1;
      const user = await db.user.create({
        data: {
          id: uuidv4(),
          name: maleNames[i],
          email: `${maleNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')}@idolmeta.com`,
          gender: 'male',
          tier,
          points,
          avatar: `/assets/avatars/male-${avatarIdx}.webp`,
          phone: `+62${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        },
      });
      maleUsers.push({ id: user.id, name: user.name, gender: 'male', tier, points });
    }

    // Create female users
    const femaleUsers: Array<{ id: string; name: string; gender: string; tier: string; points: number }> = [];
    for (let i = 0; i < femaleNames.length; i++) {
      const tier = tiers[i % 3];
      const points = tier === 'S' ? 500 + Math.floor(Math.random() * 500) :
                     tier === 'A' ? 200 + Math.floor(Math.random() * 300) :
                     50 + Math.floor(Math.random() * 150);
      const avatarIdx = (i % FEMALE_AVATAR_COUNT) + 1;
      const user = await db.user.create({
        data: {
          id: uuidv4(),
          name: femaleNames[i],
          email: `${femaleNames[i].toLowerCase().replace(/[^a-z0-9]/g, '')}@idolmeta.com`,
          gender: 'female',
          tier,
          points,
          avatar: `/assets/avatars/female-${avatarIdx}.webp`,
          phone: `+62${Math.floor(Math.random() * 9000000000) + 1000000000}`,
        },
      });
      femaleUsers.push({ id: user.id, name: user.name, gender: 'female', tier, points });
    }

    // All players including super_admin (tazos) for rankings
    const allPlayers = [
      { id: superAdmin.id, name: superAdmin.name, gender: 'male', tier: 'S', points: 0 },
      ...maleUsers,
      ...femaleUsers,
    ];

    // ── Step 4: Create Rankings for all players ──
    for (const p of allPlayers) {
      await db.ranking.create({
        data: {
          id: uuidv4(),
          userId: p.id,
          points: p.points,
          wins: Math.floor(Math.random() * 10) + 1,
          losses: Math.floor(Math.random() * 5),
        },
      });
    }

    // ── Step 5: Create Clubs ──
    const clubNames = ['Gymshark', 'southern', 'maximous', 'paranoid', 'sensei', 'euphoric', 'queen'];
    const createdClubs: Array<{ id: string; name: string }> = [];
    for (const cn of clubNames) {
      const slug = cn.toLowerCase();
      const club = await db.club.create({
        data: { name: cn, slug },
      });
      createdClubs.push({ id: club.id, name: club.name });
    }

    // ── Step 6: Assign players to clubs (round-robin) ──
    // Male players (including tazos/super_admin) — 24 total
    const allMaleIds = [superAdmin.id, ...maleUsers.map(u => u.id)];
    for (let i = 0; i < allMaleIds.length; i++) {
      const clubIdx = i % createdClubs.length;
      await db.user.update({
        where: { id: allMaleIds[i] },
        data: { clubId: createdClubs[clubIdx].id },
      });
    }

    // Female players — 17 total
    for (let i = 0; i < femaleUsers.length; i++) {
      const clubIdx = i % createdClubs.length;
      await db.user.update({
        where: { id: femaleUsers[i].id },
        data: { clubId: createdClubs[clubIdx].id },
      });
    }

    // ── Step 7: Create sample tournaments ──
    const maleTournamentId = uuidv4();
    const femaleTournamentId = uuidv4();

    await db.tournament.create({
      data: {
        id: maleTournamentId,
        name: 'Male Division - Week 1',
        division: 'male',
        type: 'weekly',
        status: 'registration',
        week: 1,
        bracketType: 'single',
        prizePool: 500000,
        mode: 'GR Arena 3vs3',
        bpm: 'Random 120-140',
        lokasi: 'PUB 1',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    await db.tournament.create({
      data: {
        id: femaleTournamentId,
        name: 'Female Division - Week 1',
        division: 'female',
        type: 'weekly',
        status: 'registration',
        week: 1,
        bracketType: 'single',
        prizePool: 500000,
        mode: 'GR Arena 3vs3',
        bpm: 'Random 120-140',
        lokasi: 'PUB 1',
        startDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
    });

    // Register ALL male players (excluding tazos/super_admin — admin is not a participant)
    for (const p of maleUsers) {
      await db.registration.create({
        data: {
          id: uuidv4(),
          userId: p.id,
          tournamentId: maleTournamentId,
          status: 'approved',
          tierAssigned: p.tier,
        },
      });
    }

    // Register ALL female players
    for (const p of femaleUsers) {
      await db.registration.create({
        data: {
          id: uuidv4(),
          userId: p.id,
          tournamentId: femaleTournamentId,
          status: 'approved',
          tierAssigned: p.tier,
        },
      });
    }

    // ── Step 8: Create sample donations ──
    const donationAmounts = [10, 25, 50, 100, 25, 15];
    for (let i = 0; i < donationAmounts.length; i++) {
      const randomUser = allPlayers[Math.floor(Math.random() * allPlayers.length)];
      await db.donation.create({
        data: {
          id: uuidv4(),
          userId: randomUser.id,
          amount: donationAmounts[i],
          message: `Supporting the tournament! #${i + 1}`,
          anonymous: Math.random() > 0.7,
        },
      });
    }

    const totalPlayers = 1 + maleNames.length + femaleNames.length; // 1 super_admin + 23 male + 17 female = 41

    return NextResponse.json({
      success: true,
      message: 'Database cleared and re-seeded with new data',
      stats: {
        superAdmin: 1,
        malePlayers: maleNames.length,
        femalePlayers: femaleNames.length,
        totalPlayers,
        clubs: createdClubs.length,
        tournaments: 2,
        registrations: maleNames.length + femaleNames.length, // ALL players registered
        donations: donationAmounts.length,
        rankings: totalPlayers,
      },
    });
  } catch (error) {
    console.error('Error seeding database:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to seed database' },
      { status: 500 }
    );
  }
}
