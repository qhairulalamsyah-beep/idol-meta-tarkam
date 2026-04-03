'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useMemo } from 'react';
import {
  UserPlus,
  Check,
  Users,
  Trophy,
  Swords,
  LayoutGrid,
  ChevronRight,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { CharacterPicker } from '@/components/esports/CharacterPicker';

interface Registration {
  id: string;
  name: string;
  email: string;
  avatar: string;
  tier: string;
  gender: string;
  status: string;
}

interface Team {
  id: string;
  name: string;
  seed: number;
  members: {
    user: {
      id: string;
      name: string;
      tier: string;
      avatar: string;
    };
  }[];
}

interface TournamentTabProps {
  division: 'male' | 'female';
  tournament: {
    id: string;
    name: string;
    division: string;
    type: string;
    status: string;
    week: number;
    bracketType: string;
    prizePool: number;
  } | null;
  registrations: Registration[];
  teams: Team[];
  isAdmin?: boolean;
  onRegister: (name: string, phone: string, characterId: string, characterName: string, club?: string) => void;
  onApprove: (id: string, tier: string) => void;
  onGenerateTeams: () => void;
  onResetTeams: () => void;
  onGenerateBracket: (type: string) => void;
}

const sectionVariants = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const containerVariants = {
  center: {
    transition: { staggerChildren: 0.04 },
  },
};

const itemVariants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
};

export function TournamentTab({
  division,
  tournament,
  registrations,
  teams,
  isAdmin = false,
  onRegister,
  onApprove,
  onGenerateTeams,
  onResetTeams,
  onGenerateBracket,
}: TournamentTabProps) {
  const [activeSection, setActiveSection] = useState<'register' | 'teams' | 'bracket'>('register');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerClub, setRegisterClub] = useState('');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacterName, setSelectedCharacterName] = useState<string>('');
  const [selectedBracketType, setSelectedBracketType] = useState<string>('single');

  const isMale = division === 'male';
  const accentClass = isMale ? 'text-[--ios-gold]' : 'text-[--ios-pink]';
  const accentBg = isMale ? 'bg-[--ios-gold]' : 'bg-[--ios-pink]';
  const cardClass = isMale ? 'card-gold' : 'card-pink';
  const btnClass = isMale ? 'btn-gold' : 'btn-pink';
  const avatarRingClass = isMale ? 'avatar-ring-gold' : 'avatar-ring-pink';
  const gradientTextClass = isMale ? 'gradient-gold' : 'gradient-pink';

  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'pending'),
    [registrations],
  );

  const approvedRegistrations = useMemo(
    () => registrations.filter((r) => r.status === 'approved'),
    [registrations],
  );

  const handleRegister = () => {
    if (registerName.trim() && selectedCharacterId) {
      onRegister(registerName.trim(), registerPhone.trim(), selectedCharacterId, selectedCharacterName, registerClub.trim() || undefined);
      setRegisterName('');
      setRegisterPhone('');
      setRegisterClub('');
      setSelectedCharacterId(null);
      setSelectedCharacterName('');
    }
  };

  const getStatusStyle = (status: string) => {
    if (status === 'pending') return 'status-registration';
    if (status === 'approved') return 'status-live';
    if (status === 'rejected') return 'status-setup';
    return 'status-setup';
  };

  const getTierBadgeClass = (tier: string) => {
    if (tier === 'S') return 'tier-s';
    if (tier === 'A') return 'tier-a';
    return 'tier-b';
  };

  const bracketTypes = [
    {
      id: 'single',
      name: 'Eliminasi Langsung',
      desc: 'Sekali kalah, langsung tersingkir',
      icon: Swords,
    },
    {
      id: 'double',
      name: 'Eliminasi Ganda',
      desc: 'Braket kesempatan kedua',
      icon: Trophy,
    },
    {
      id: 'group',
      name: 'Babak Grup',
      desc: 'Sistem grup round-robin',
      icon: LayoutGrid,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Tournament Hero Card */}
      <motion.div
        className={`${cardClass} rounded-2xl p-5 lg:flex lg:items-center lg:gap-8 lg:p-8`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <p className="text-[11px] tracking-[0.2em] uppercase text-white/40 font-medium mb-1">
              Week {tournament?.week || 1}
            </p>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white/90 tracking-tight">
              {tournament?.name || 'Turnamen Mingguan'}
            </h2>
          </div>
          <span className={`status-pill lg:text-xs lg:px-3 lg:py-1.5 ${getStatusStyle(tournament?.status || 'setup')}`}>
            {tournament?.status?.toUpperCase() || 'SETUP'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-white/40 text-xs">
          <span className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            {approvedRegistrations.length} pemain
          </span>
          <span>•</span>
          <span>
            {(tournament?.bracketType || 'single').charAt(0).toUpperCase() +
              (tournament?.bracketType || 'single').slice(1)} Elim
          </span>
          {tournament?.prizePool !== undefined && tournament.prizePool > 0 && (
            <>
              <span>•</span>
              <span className={accentClass}>Rp {tournament.prizePool.toLocaleString('id-ID')}</span>
            </>
          )}
        </div>
      </motion.div>

      {/* Section Tabs — iOS Segmented Control */}
      <div className="flex glass-heavy rounded-2xl p-1.5">
        {(['register', 'teams', 'bracket'] as const).map((section) => (
          <motion.button
            key={section}
            onClick={() => setActiveSection(section)}
            className={`relative flex-1 py-3 rounded-xl text-[12px] font-semibold tracking-wide uppercase transition-colors ${
              activeSection === section ? 'text-white/90' : 'text-white/30'
            }`}
            whileTap={{ scale: 0.97 }}
          >
            {activeSection === section && (
              <motion.div
                className={`absolute inset-0 rounded-xl pointer-events-none ${isMale ? 'bg-amber-500/15 ring-1 ring-amber-500/10' : 'bg-violet-500/15 ring-1 ring-violet-500/10'}`}
                layoutId="tournamentSectionTab"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">
              {section === 'register' ? 'Gabung' : section === 'teams' ? 'Tim' : 'Bracket'}
            </span>
          </motion.button>
        ))}
      </div>

      {/* Section Content */}
      <AnimatePresence mode="wait">
        {/* ────────────────────────────────────────────
            REGISTER SECTION
        ──────────────────────────────────────────── */}
        {activeSection === 'register' && (
          <motion.div
            key="register"
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Section Header */}
            <div className="flex items-center gap-2.5 px-1">
              <UserPlus className={`w-4 h-4 ${accentClass}`} />
              <h3 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/60">
                Gabung Turnamen
              </h3>
            </div>

            {/* Inline Registration Form — Clean Flow */}
            {tournament?.status === 'registration' && (
              <motion.div
                variants={itemVariants}
                className="glass-heavy rounded-2xl p-4 sm:p-5 lg:max-w-2xl lg:mx-auto space-y-3.5"
              >
                {/* ── Header ── */}
                <div className="flex items-center gap-3 mb-1">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMale ? 'bg-amber-500/12' : 'bg-violet-500/12'}`}>
                    <UserPlus className={`w-5 h-5 ${isMale ? 'text-amber-400' : 'text-violet-400'}`} />
                  </div>
                  <div>
                    <h3 className="text-[13px] font-bold text-white/90">Formulir Pendaftaran</h3>
                    <p className="text-[11px] text-white/30 font-medium">Isi data dan pilih karakter untuk bergabung</p>
                  </div>
                </div>

                {/* ── Step 1: Data Fields ── */}
                <div className="space-y-3">
                  {/* Nama */}
                  <div>
                    <label className="text-[11px] text-white/40 mb-1.5 block uppercase tracking-wider font-semibold">
                      Nama <span className="text-purple-400/60">*</span>
                    </label>
                    <input
                      type="text"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      placeholder="Nama lengkap pemain"
                      className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-4 py-3 text-white/90 text-sm placeholder-white/25 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/10 transition-all"
                    />
                  </div>

                  {/* WA + Club side by side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-white/40 mb-1.5 block uppercase tracking-wider font-semibold">
                        No. WhatsApp
                      </label>
                      <input
                        type="tel"
                        value={registerPhone}
                        onChange={(e) => setRegisterPhone(e.target.value)}
                        placeholder="08xxx"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-3 text-white/90 text-[13px] placeholder-white/25 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/10 transition-all"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-[11px] text-white/40 mb-1.5 uppercase tracking-wider font-semibold">
                        <Users className="w-3 h-3" />
                        Club
                      </label>
                      <input
                        type="text"
                        value={registerClub}
                        onChange={(e) => setRegisterClub(e.target.value)}
                        placeholder="Nama club"
                        className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl px-3.5 py-3 text-white/90 text-[13px] placeholder-white/25 focus:outline-none focus:border-amber-400/30 focus:bg-white/[0.06] focus:ring-1 focus:ring-amber-400/10 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* ── Divider ── */}
                <div className="divider" />

                {/* ── Step 2: Character Picker ── */}
                <div>
                  <label className="flex items-center gap-1.5 text-[11px] text-white/40 mb-2 uppercase tracking-wider font-semibold">
                    <Sparkles className={`w-3 h-3 ${isMale ? 'text-amber-400' : 'text-violet-400'}`} />
                    Karakter <span className="text-purple-400/60">*</span>
                  </label>
                  <CharacterPicker
                    division={division}
                    onSelect={(id, name) => {
                      setSelectedCharacterId(id);
                      setSelectedCharacterName(name);
                    }}
                    selectedId={selectedCharacterId}
                  />
                </div>

                {/* ── Submit ── */}
                <motion.button
                  onClick={handleRegister}
                  className={`${btnClass} btn-ios w-full py-3.5 text-[14px] flex items-center justify-center gap-2 disabled:opacity-40 hero-shimmer-btn relative overflow-hidden`}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!registerName.trim() || !selectedCharacterId}
                >
                  <span className="relative z-[2] flex items-center gap-2">
                    <UserPlus className="w-[18px] h-[18px]" />
                    GABUNG TURNAMEN
                    <ChevronRight className="w-[16px] h-[16px]" />
                  </span>
                </motion.button>

                {!selectedCharacterId && (
                  <p className="text-[11px] text-white/30 text-center -mt-1">
                    Pilih karakter untuk melanjutkan pendaftaran
                  </p>
                )}
              </motion.div>
            )}

            {/* Pending Registrations */}
            {pendingRegistrations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-2">
                <p className="text-[11px] tracking-[0.15em] uppercase text-white/30 font-medium px-1">
                  Pendaftaran Menunggu
                </p>
                {pendingRegistrations.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    className="glass-subtle rounded-2xl p-4"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={avatarRingClass}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {reg.avatar ? (
                            <img src={reg.avatar} alt={reg.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-white/70 text-sm">{reg.name[0]}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white/90 text-sm truncate">{reg.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`tier-badge ${getTierBadgeClass(reg.tier)}`}>{reg.tier}</span>
                          <span className="status-pill status-registration">Menunggu</span>
                        </div>
                      </div>
                      {/* Admin Approve Pills — only visible when admin is logged in */}
                      {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        {['S', 'A', 'B'].map((tier) => (
                          <motion.button
                            key={tier}
                            onClick={() => onApprove(reg.id, tier)}
                            className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold ${getTierBadgeClass(tier)}`}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            title={`Setujui sebagai tier ${tier}`}
                          >
                            {tier}
                          </motion.button>
                        ))}
                      </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Approved Registrations */}
            {approvedRegistrations.length > 0 && (
              <motion.div variants={itemVariants} className="space-y-2">
                <p className="text-[11px] tracking-[0.15em] uppercase text-white/30 font-medium px-1">
                  Pemain Disetujui ({approvedRegistrations.length})
                </p>
                {approvedRegistrations.map((reg, i) => (
                  <motion.div
                    key={reg.id}
                    className="glass-subtle rounded-2xl p-3.5"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={avatarRingClass}>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                          {reg.avatar ? (
                            <img src={reg.avatar} alt={reg.name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="font-semibold text-white/70 text-xs">{reg.name[0]}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white/90 text-sm truncate">{reg.name}</p>
                      </div>
                      <span className={`tier-badge ${getTierBadgeClass(reg.tier)}`}>{reg.tier}</span>
                      <Check className="w-4 h-4 text-[--ios-green]" />
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {/* Empty State */}
            {registrations.length === 0 && (
              <motion.div
                variants={itemVariants}
                className="glass rounded-2xl p-10 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isMale ? 'bg-amber-500/8' : 'bg-violet-500/8'}`}>
                  <UserPlus className={`w-7 h-7 ${isMale ? 'text-[--ios-gold]/30' : 'text-[--ios-pink]/30'}`} />
                </div>
                <p className="text-white/40 text-sm font-medium">Belum ada pendaftaran</p>
                <p className="text-white/35 text-xs mt-1">Jadilah yang pertama bergabung!</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ────────────────────────────────────────────
            TEAMS SECTION
        ──────────────────────────────────────────── */}
        {activeSection === 'teams' && (
          <motion.div
            key="teams"
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2.5">
                <Swords className={`w-4 h-4 ${accentClass}`} />
                <h3 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/60">
                  Tim
                </h3>
              </div>
              <span className="text-[11px] text-white/30 font-medium">{teams.length} tim</span>
            </div>

            {teams.length > 0 ? (
              <div className="grid lg:grid-cols-2 lg:gap-4">
              {teams.map((team, i) => (
                <motion.div
                  key={team.id}
                  className="glass-heavy rounded-2xl p-4 lg:p-5 card-3d hover:shadow-lg transition-shadow"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  whileHover={{ scale: 1.005 }}
                >
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                      isMale
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-black'
                        : 'bg-gradient-to-br from-violet-400 to-purple-500 text-black'
                    }`}>
                      #{team.seed || i + 1}
                    </div>
                    <h4 className="text-sm sm:text-base font-bold text-white/90 flex-1 truncate">{team.name}</h4>
                    <span className="text-[11px] text-white/30 font-medium">
                      {team.members.length} anggota
                    </span>
                  </div>

                  {/* Member avatars in a row — sorted by tier: S > A > B */}
                  <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto no-scrollbar">
                    {[...team.members].sort((a, b) => {
                      const order: Record<string, number> = { S: 0, A: 1, B: 2 };
                      return (order[a.user.tier] ?? 3) - (order[b.user.tier] ?? 3);
                    }).map((member) => (
                      <div key={member.user.id} className="flex flex-col items-center gap-1.5">
                        <div className={avatarRingClass}>
                          <div className="w-11 h-11 lg:w-12 lg:h-12 rounded-full bg-gradient-to-br from-gray-600 to-gray-800 flex items-center justify-center overflow-hidden">
                            {member.user.avatar ? (
                              <img src={member.user.avatar} alt={member.user.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-semibold text-white/70">{member.user.name[0]}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] lg:text-sm text-white/50 font-medium max-w-[60px] lg:max-w-[100px] truncate">
                          {member.user.name}
                        </span>
                        <span className={`tier-badge ${getTierBadgeClass(member.user.tier)}`}>
                          {member.user.tier}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
              </div>
            ) : (
              <motion.div
                variants={itemVariants}
                className="glass rounded-2xl p-10 text-center"
              >
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center ${isMale ? 'bg-amber-500/8' : 'bg-violet-500/8'}`}>
                  <Users className={`w-7 h-7 ${isMale ? 'text-[--ios-gold]/30' : 'text-[--ios-pink]/30'}`} />
                </div>
                <p className="text-white/40 text-sm font-medium">Belum ada tim</p>
                <p className="text-white/35 text-xs mt-1">Buat tim dari pendaftaran</p>
              </motion.div>
            )}

            {/* Generate / Reset Teams Button — admin only */}
            {isAdmin && (
            <div className="lg:flex lg:gap-4 lg:justify-center">
            {teams.length > 0 ? (
              <motion.button
                onClick={onResetTeams}
                className="w-full lg:px-8 lg:py-4 py-3.5 text-base flex items-center justify-center gap-2 bg-orange-500/12 text-orange-400 border border-orange-500/20 rounded-2xl font-semibold"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-4 h-4" />
                Reset Tim
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            ) : approvedRegistrations.length >= 3 && (
              <motion.button
                onClick={onGenerateTeams}
                className={`${btnClass} btn-ios w-full lg:px-8 lg:py-4 py-3.5 text-base flex items-center justify-center gap-2`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
              >
                <Sparkles className="w-4 h-4" />
                Buat Tim
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
            </div>
            )}
          </motion.div>
        )}

        {/* ────────────────────────────────────────────
            BRACKET SECTION
        ──────────────────────────────────────────── */}
        {activeSection === 'bracket' && (
          <motion.div
            key="bracket"
            variants={containerVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Section Header */}
            <div className="flex items-center gap-2.5 px-1">
              <Trophy className={`w-4 h-4 ${accentClass}`} />
              <h3 className="text-[11px] tracking-[0.2em] uppercase font-semibold text-white/60">
                Tipe Bracket
              </h3>
            </div>

            {/* Bracket Type Selector Cards */}
            <div className="space-y-2.5">
              {bracketTypes.map((bt, i) => {
                const Icon = bt.icon;
                const isSelected = selectedBracketType === bt.id;
                return (
                  <motion.button
                    key={bt.id}
                    onClick={() => setSelectedBracketType(bt.id)}
                    className={`w-full text-left p-4 rounded-2xl card-3d transition-all ${
                      isSelected
                        ? `${cardClass} border-0 shadow-lg`
                        : 'glass-subtle hover:bg-white/[0.04]'
                    }`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
                        isSelected
                          ? isMale
                            ? 'bg-amber-400/20 ring-1 ring-amber-400/25'
                            : 'bg-violet-400/20 ring-1 ring-violet-400/25'
                          : 'bg-white/5'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? accentClass : 'text-white/30'}`} />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-bold ${isSelected ? 'text-white/90' : 'text-white/60'}`}>{bt.name}</p>
                        <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/40' : 'text-white/25'}`}>{bt.desc}</p>
                      </div>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                          className={`w-7 h-7 rounded-full flex items-center justify-center ${isMale ? 'bg-amber-400 text-black' : 'bg-violet-400 text-black'}`}
                        >
                          <Check className="w-4 h-4" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Generate Bracket Button — admin only */}
            {isAdmin && (
            <motion.button
              onClick={() => onGenerateBracket(selectedBracketType)}
              className={`${btnClass} btn-ios w-full lg:px-8 lg:py-4 py-3.5 text-base flex items-center justify-center gap-2`}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
            >
              <Sparkles className="w-4 h-4" />
              BUAT BRACKET
              <ChevronRight className="w-4 h-4" />
            </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
