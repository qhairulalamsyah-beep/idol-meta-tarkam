import { create } from 'zustand';
import { adminFetch } from '@/lib/admin-fetch';

// Module-level fetch tracker (not stored in Zustand to avoid re-renders)
let fetchStartTime = 0;
let inFlightFetch: Promise<void> | null = null;

interface User {
  id: string;
  name: string;
  email: string;
  gender: string;
  tier: string;
  points: number;
  avatar: string | null;
  isMVP?: boolean;
  mvpScore?: number;
}

interface Tournament {
  id: string;
  name: string;
  division: string;
  type: string;
  status: string;
  week: number;
  bracketType: string;
  prizePool: number;
  mode: string;
  bpm: string;
  lokasi: string;
  startDate: string | null;
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

interface Match {
  id: string;
  round: number;
  matchNumber: number;
  teamAId: string | null;
  teamBId: string | null;
  teamA: Team | null;
  teamB: Team | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: string;
  bracket: string;
}

interface Registration {
  id: string;
  userId: string;
  tournamentId: string;
  status: string;
  tierAssigned: string;
  user: User;
}

interface Donation {
  id: string;
  amount: number;
  message: string;
  anonymous: boolean;
  paymentMethod: string;
  paymentStatus: string;
  proofImageUrl: string | null;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  } | null;
}

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AppState {
  // UI State
  activeTab: string;
  division: 'male' | 'female';
  isLoading: boolean;
  toasts: ToastData[];
  isAdminAuthenticated: boolean;
  adminUser: { id: string; name: string; email: string; role: string; permissions: Record<string, boolean>; avatar: string | null; tier: string } | null;
  
  // Data
  currentUser: User | null;
  users: User[];
  tournaments: Tournament[];
  currentTournament: Tournament | null;
  registrations: Registration[];
  teams: Team[];
  matches: Match[];
  donations: Donation[];
  totalDonation: number;
  totalSawer: number;
  
  // Toast Actions
  addToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
  removeToast: (id: string) => void;
  
  // UI Actions
  setActiveTab: (tab: string) => void;
  setDivision: (division: 'male' | 'female') => void;
  setLoading: (loading: boolean) => void;
  loginAdmin: (username: string, password: string) => Promise<boolean>;
  logoutAdmin: () => void;
  fetchAdmins: () => Promise<void>;
  verifyAdminSession: () => Promise<boolean>;

  // API Actions
  fetchData: (showLoading?: boolean) => Promise<void>;
  registerUser: (name: string, phone: string, characterId?: string, characterName?: string, club?: string) => Promise<void>;
  approveRegistration: (registrationId: string, tier: string) => Promise<void>;
  rejectRegistration: (registrationId: string) => Promise<void>;
  deleteRegistration: (registrationId: string) => Promise<void>;
  deleteAllRejected: () => Promise<void>;
  updateTournamentStatus: (status: string) => Promise<void>;
  updatePrizePool: (prizePool: number) => Promise<void>;
  generateTeams: () => Promise<void>;
  resetTeams: () => Promise<void>;
  generateBracket: (type: string) => Promise<void>;
  updateMatchScore: (matchId: string, scoreA: number, scoreB: number) => Promise<void>;
  setMVP: (userId: string, mvpScore: number) => Promise<void>;
  removeMVP: (userId: string) => Promise<void>;
  finalizeTournament: () => Promise<void>;
  donate: (amount: number, message: string, anonymous: boolean, paymentMethod: string, proofUrl?: string) => Promise<void>;
  seedDatabase: () => Promise<void>;
  resetSeason: () => Promise<void>;
  createTournament: (opts: { name: string; division: string; type: string; bracketType: string; week: number; startDate?: string | null; mode?: string; bpm?: string; lokasi?: string }) => Promise<void>;
}

// Restore admin auth from localStorage — validate that stored data is not corrupted
let storedAdminAuth = false;
let storedAdminUser = null;
if (typeof localStorage !== 'undefined') {
  try {
    storedAdminAuth = localStorage.getItem('idm_admin_auth') === 'true';
    const raw = localStorage.getItem('idm_admin_user');
    const hash = localStorage.getItem('idm_admin_hash');

    // CRITICAL: If auth is true but hash is missing, clear everything
    if (storedAdminAuth && !hash) {
      console.warn('[Store] Admin auth is true but hash is missing - clearing session');
      localStorage.removeItem('idm_admin_auth');
      localStorage.removeItem('idm_admin_user');
      localStorage.removeItem('idm_admin_hash');
      storedAdminAuth = false;
    } else if (raw && storedAdminAuth && hash) {
      const parsed = JSON.parse(raw);
      // Validate minimal structure
      if (parsed && parsed.id && parsed.name && parsed.role) {
        storedAdminUser = parsed;
      } else {
        storedAdminAuth = false;
        localStorage.removeItem('idm_admin_auth');
        localStorage.removeItem('idm_admin_user');
        localStorage.removeItem('idm_admin_hash');
      }
    }
  } catch {
    storedAdminAuth = false;
    localStorage.removeItem('idm_admin_auth');
    localStorage.removeItem('idm_admin_user');
    localStorage.removeItem('idm_admin_hash');
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial State
  activeTab: 'dashboard',
  division: 'male',
  isLoading: true,
  toasts: [],
  isAdminAuthenticated: storedAdminAuth,
  adminUser: storedAdminUser,
  currentUser: null,
  users: [],
  tournaments: [],
  currentTournament: null,
  registrations: [],
  teams: [],
  matches: [],
  donations: [],
  totalDonation: 0,
  totalSawer: 0,
  
  // Toast Actions
  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(2, 11);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }],
    }));
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id),
      }));
    }, 4000);
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
  
  // Setters
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDivision: (division) => set({ division }),
  setLoading: (loading) => set({ isLoading: loading }),
  loginAdmin: async (username, password) => {
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      if (!res.ok) {
        console.error('[Store] loginAdmin HTTP error:', res.status);
        return false;
      }
      const data = await res.json();
      if (data.success && data.admin) {
        set({
          isAdminAuthenticated: true,
          adminUser: data.admin,
        });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('idm_admin_auth', 'true');
          localStorage.setItem('idm_admin_user', JSON.stringify(data.admin));
          // Store SHA-256 hash of the password for API auth headers
          const encoder = new TextEncoder();
          const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password));
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          localStorage.setItem('idm_admin_hash', hashHex);
        }
        return true;
      }
      return false;
    } catch (err) {
      console.error('[Store] loginAdmin network error:', err);
      return false;
    }
  },
  logoutAdmin: () => {
    set({ isAdminAuthenticated: false, adminUser: null });
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('idm_admin_auth');
      localStorage.removeItem('idm_admin_user');
      localStorage.removeItem('idm_admin_hash');
    }
  },
  fetchAdmins: async () => {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      if (data.success) {
        // Update local adminUser if still logged in
        const currentAdmin = get().adminUser;
        if (currentAdmin) {
          const updated = data.admins.find((a: { id: string }) => a.id === currentAdmin.id);
          if (updated) set({ adminUser: { ...updated, permissions: JSON.parse(updated.permissions || '{}') } });
        }
      }
    } catch {}
  },
  verifyAdminSession: async () => {
    try {
      const adminHash = typeof localStorage !== 'undefined' ? localStorage.getItem('idm_admin_hash') : null;
      const { adminUser } = get();

      if (!adminUser || !adminHash) {
        return false;
      }

      const res = await fetch('/api/admin/verify-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: adminUser.id, adminHash }),
      });

      const data = await res.json();

      if (!data.valid) {
        // Session invalid - logout
        console.warn('[Store] Admin session invalid:', data.error);
        set({ isAdminAuthenticated: false, adminUser: null });
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('idm_admin_auth');
          localStorage.removeItem('idm_admin_user');
          localStorage.removeItem('idm_admin_hash');
        }
        if (data.passwordChanged) {
          get().addToast('Password admin telah diubah. Silakan login kembali.', 'warning');
        } else {
          get().addToast('Session admin tidak valid. Silakan login kembali.', 'warning');
        }
        return false;
      }

      // Update admin user data if changed
      if (data.admin) {
        set({ adminUser: data.admin });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('idm_admin_user', JSON.stringify(data.admin));
        }
      }

      return true;
    } catch (err) {
      console.error('[Store] verifyAdminSession error:', err);
      return false;
    }
  },
  
  // API Actions
  fetchData: async (showLoading = true) => {
    if (!showLoading && inFlightFetch) return inFlightFetch;

    const fetchPromise = (async () => {
      try {
        if (showLoading) set({ isLoading: true });
        if (showLoading) fetchStartTime = Date.now();
        const { division } = get();
        
        // Parallel fetch: users + tournaments + donations + sawer + mvp (independent)
        const [usersRes, tournamentsRes, donationsRes, sawerRes, mvpRes] = await Promise.all([
          fetch(`/api/users?gender=${division}`).catch(() => null),
          fetch(`/api/tournaments?division=${division}`).catch(() => null),
          fetch('/api/donations').catch(() => null),
          fetch('/api/sawer').catch(() => null),
          fetch('/api/users/mvp').catch(() => null),
        ]);

        // Process users
        const usersData = usersRes ? await usersRes.json().catch(() => null) : null;
        if (usersData?.success) {
          let users = usersData.users;

          // Merge MVP data (mvpScore from raw SQL endpoint)
          const mvpData = mvpRes ? await mvpRes.json().catch(() => null) : null;
          if (mvpData?.success && mvpData.mvp) {
            users = users.map((u: Record<string, unknown>) =>
              u.id === mvpData.mvp.id
                ? { ...u, isMVP: true, mvpScore: mvpData.mvp.mvpScore }
                : { ...u, isMVP: false, mvpScore: 0 }
            );
          }

          set({ users });
        }

        // Process tournaments
        const tournamentsData = tournamentsRes ? await tournamentsRes.json().catch(() => null) : null;
        const tournament = tournamentsData?.tournaments?.[0] || null;

        if (tournament) {
          set({ currentTournament: tournament });

          // Fetch tournament details (depends on tournament ID)
          const detailRes = await fetch(`/api/tournaments?id=${tournament.id}`).catch(() => null);
          const detailData = detailRes ? await detailRes.json().catch(() => null) : null;
          if (detailData?.success) {
            set({
              registrations: detailData.tournament?.registrations || [],
              teams: detailData.tournament?.teams || [],
              matches: detailData.tournament?.matches || [],
            });
          }
        } else {
          // No tournament exists for this division — don't auto-create
          set({ currentTournament: null, registrations: [], teams: [], matches: [] });
        }
        
        // Process donations
        const donationsData = donationsRes ? await donationsRes.json().catch(() => null) : null;
        if (donationsData?.success) {
          set({ donations: donationsData.donations, totalDonation: donationsData.totalDonation });
        }

        // Process sawer (optional)
        try {
          const sawerData = sawerRes ? await sawerRes.json().catch(() => null) : null;
          if (sawerData?.totalSawer !== undefined) {
            set({ totalSawer: sawerData.totalSawer });
          }
        } catch { /* sawer optional */ }

        // Minimum loading time for splash screen (4s) only on initial load
        if (showLoading) {
          const elapsed = Date.now() - fetchStartTime;
          const remaining = Math.max(0, 4000 - elapsed);
          if (remaining > 0) {
            await new Promise((r) => setTimeout(r, remaining));
          }
        }
        
        if (showLoading) set({ isLoading: false });
      } catch (error) {
        console.error('Error fetching data:', error);
        set({ isLoading: false });
        get().addToast('Gagal memuat data', 'error');
      } finally {
        if (!showLoading) inFlightFetch = null;
      }
    })();

    // Store promise for deduplication
    if (!showLoading) {
      inFlightFetch = fetchPromise;
    }
    return fetchPromise;
  },
  
  registerUser: async (name, phone, characterId, _characterName, club) => {
    try {
      const { currentTournament, division } = get();
      if (!currentTournament) {
        get().addToast('Belum ada turnamen aktif', 'error');
        return;
      }

      // Create user (or get existing if already registered in this division)
      const userRes = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, gender: division, club }),
      });
      const userData = await userRes.json();

      if (!userData.success) {
        get().addToast(userData.error || 'Gagal mendaftar', 'error');
        return;
      }

      // Show info if user already exists
      if (userData.isExisting) {
        get().addToast(`Nama "${name}" sudah terdaftar, mendaftarkan ke turnamen...`, 'info');
      }

      // Assign character if selected
      if (characterId) {
        const charRes = await fetch(`/api/characters/${encodeURIComponent(characterId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ characterId, userId: userData.user.id }),
        });
        const charData = await charRes.json();
        if (!charData.success) {
          get().addToast(charData.error || 'Gagal memilih karakter', 'error');
          return;
        }
      }

      // Register user to tournament
      const regRes = await fetch('/api/tournaments/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userData.user.id,
          tournamentId: currentTournament.id,
        }),
      });
      const regData = await regRes.json();

      if (regRes.ok && regData.success) {
        get().addToast('Pendaftaran berhasil dikirim!', 'success');
        get().fetchData(false);
      } else if (regData.error === 'Already registered for this tournament') {
        get().addToast('Anda sudah terdaftar di turnamen ini!', 'warning');
      } else {
        get().addToast(regData.error || 'Pendaftaran gagal', 'error');
      }
    } catch (error) {
      console.error('Error registering:', error);
      get().addToast('Pendaftaran gagal', 'error');
    }
  },
  
  approveRegistration: async (registrationId, tier) => {
    try {
      const res = await adminFetch('/api/tournaments/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: 'approved', tierAssigned: tier }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Gagal menyetujui', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast('Pendaftaran disetujui!', 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error approving:', error);
      get().addToast('Gagal menyetujui pendaftaran', 'error');
    }
  },
  
  rejectRegistration: async (registrationId) => {
    try {
      const res = await adminFetch('/api/tournaments/register', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ registrationId, status: 'rejected' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Gagal menolak', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast('Pendaftaran ditolak', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error rejecting:', error);
      get().addToast('Gagal menolak pendaftaran', 'error');
    }
  },
  
  deleteRegistration: async (registrationId) => {
    try {
      const res = await adminFetch(`/api/tournaments/register?id=${registrationId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (!res.ok) {
        get().addToast(data.error || 'Gagal menghapus', 'error');
        return;
      }
      
      get().addToast(data.message || 'Pendaftaran dihapus', 'success');
      get().fetchData(false);
    } catch (error) {
      console.error('Error deleting:', error);
      get().addToast('Gagal menghapus pendaftaran', 'error');
    }
  },
  
  deleteAllRejected: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch(`/api/tournaments/register?deleteAllRejected=true&tournamentId=${currentTournament.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (!res.ok) {
        get().addToast(data.error || 'Gagal menghapus', 'error');
        return;
      }
      
      get().addToast(data.message || 'Semua pendaftaran ditolak telah dihapus', 'success');
      get().fetchData(false);
    } catch (error) {
      console.error('Error deleting all rejected:', error);
      get().addToast('Gagal menghapus pendaftaran', 'error');
    }
  },
  
  updateTournamentStatus: async (status) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id, status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }
      
      if (res.ok) {
        get().addToast(`Status diubah ke ${status}`, 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating status:', error);
      get().addToast('Gagal mengubah status', 'error');
    }
  },

  updatePrizePool: async (prizePool) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch('/api/tournaments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id, prizePool }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }

      if (res.ok) {
        get().addToast(`Hadiah diatur! Total: Rp ${prizePool.toLocaleString('id-ID')}`, 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating prize pool:', error);
      get().addToast('Gagal mengatur hadiah', 'error');
    }
  },

  generateTeams: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast(`${data.teams.length} tim berhasil dibuat!`, 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat tim', 'error');
      }
    } catch (error) {
      console.error('Error generating teams:', error);
      get().addToast('Gagal membuat tim', 'error');
    }
  },

  resetTeams: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch(`/api/teams?tournamentId=${currentTournament.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        get().addToast('Tim berhasil direset! Silakan buat ulang.', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal reset tim', 'error');
      }
    } catch (error) {
      console.error('Error resetting teams:', error);
      get().addToast('Gagal reset tim', 'error');
    }
  },

  generateBracket: async (type) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments/bracket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id, bracketType: type }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast('Bracket berhasil dibuat!', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat bracket', 'error');
      }
    } catch (error) {
      console.error('Error generating bracket:', error);
      get().addToast('Gagal membuat bracket', 'error');
    }
  },
  
  updateMatchScore: async (matchId, scoreA, scoreB) => {
    try {
      const res = await adminFetch('/api/matches', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, scoreA, scoreB }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        get().addToast(data.error || 'Akses ditolak', 'error');
        return;
      }
      
      if (res.ok) {
        const data = await res.json();
        if (data.match?.status === 'completed' && data.match?.winnerId) {
          const winnerName = data.match.winnerId === data.match.teamA?.id
            ? data.match.teamA?.name
            : data.match.teamB?.name;
          get().addToast(`${winnerName} menang! +100 pts.`, 'success');
        } else {
          get().addToast('Skor berhasil diperbarui!', 'success');
        }
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error updating score:', error);
      get().addToast('Gagal memperbarui skor', 'error');
    }
  },

  setMVP: async (userId, mvpScore) => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch('/api/users/mvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, mvpScore, tournamentId: currentTournament.id }),
      });

      if (res.ok) {
        const data = await res.json();
        get().addToast(data.message || 'MVP ditetapkan!', 'success');
        get().fetchData(false);
      } else {
        const data = await res.json();
        get().addToast(data.error || 'Gagal menetapkan MVP', 'error');
      }
    } catch (error) {
      console.error('Error setting MVP:', error);
      get().addToast('Gagal menetapkan MVP', 'error');
    }
  },

  removeMVP: async (userId) => {
    try {
      const res = await adminFetch(`/api/users/mvp?userId=${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        get().addToast(data.message || 'MVP dicabut', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error removing MVP:', error);
      get().addToast('Gagal mencabut MVP', 'error');
    }
  },

  finalizeTournament: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;
      
      const res = await adminFetch('/api/tournaments/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();
      
      if (data.success) {
        get().addToast('Turnamen selesai!', 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal menyelesaikan turnamen', 'error');
      }
    } catch (error) {
      console.error('Error finalizing:', error);
      get().addToast('Gagal menyelesaikan turnamen', 'error');
    }
  },
  
  donate: async (amount, message, anonymous, paymentMethod, proofUrl) => {
    try {
      const { currentUser } = get();
      
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: currentUser?.id,
          amount, 
          message, 
          anonymous,
          paymentMethod,
          proofImageUrl: proofUrl || null,
        }),
      });
      
      if (res.ok) {
        get().addToast('Donasi tercatat! Menunggu konfirmasi pembayaran.', 'info');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error donating:', error);
      get().addToast('Donasi gagal', 'error');
    }
  },
  
  resetSeason: async () => {
    try {
      const { currentTournament } = get();
      if (!currentTournament) return;

      const res = await adminFetch('/api/tournaments/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: currentTournament.id }),
      });
      const data = await res.json();

      if (data.success) {
        if (data.isGrandFinal) {
          get().addToast('Musim baru dimulai dari Minggu 1!', 'success');
        } else {
          get().addToast(`Data direset! Memulai Minggu ${data.nextWeek}.`, 'success');
        }
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal mereset data', 'error');
      }
    } catch (error) {
      console.error('Error resetting season:', error);
      get().addToast('Gagal mereset data', 'error');
    }
  },

  createTournament: async (opts) => {
    try {
      const res = await adminFetch('/api/tournaments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts),
      });
      const data = await res.json();

      if (data.success) {
        get().addToast(`Turnamen "${opts.name}" berhasil dibuat!`, 'success');
        get().fetchData(false);
      } else {
        get().addToast(data.error || 'Gagal membuat turnamen', 'error');
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      get().addToast('Gagal membuat turnamen', 'error');
    }
  },

  seedDatabase: async () => {
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();

      if (data.success) {
        get().addToast('Database berhasil diisi!', 'success');
        get().fetchData(false);
      }
    } catch (error) {
      console.error('Error seeding:', error);
      get().addToast('Gagal mengisi database', 'error');
    }
  },
}));

// Listen for admin auth changes from other parts of the app
if (typeof window !== 'undefined') {
  window.addEventListener('admin-auth-changed', ((event: CustomEvent) => {
    if (!event.detail?.authenticated) {
      // Admin was logged out elsewhere (e.g., 401 response)
      useAppStore.getState().logoutAdmin();
    }
  }) as EventListener);
}
