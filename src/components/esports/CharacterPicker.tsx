'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Check,
  Lock,
  ChevronDown,
  Sparkles,
  ImageOff,
  Users,
} from 'lucide-react';
import {
  getClassIcon,
  getClassColor,
  getUniverseLabel,
} from '@/lib/characterGenerator';

/* ─────────────────────────────────────────────
   Types
   ───────────────────────────────────────────── */

interface CharacterData {
  id: string;
  name: string;
  slug: string;
  gender: 'male' | 'female';
  universe: string;
  alignment: 'hero' | 'villain';
  classType: string;
  colors: string;
  imageUrl: string | null;
  isTaken: boolean;
  takenBy: string | null;
}

interface CharacterPickerProps {
  division: 'male' | 'female';
  onSelect: (characterId: string, characterName: string) => void;
  selectedId?: string | null;
}

/* ─────────────────────────────────────────────
   Helpers
   ───────────────────────────────────────────── */

function parseColors(colorsStr: string): [string, string] {
  try {
    const parsed = JSON.parse(colorsStr);
    if (Array.isArray(parsed) && parsed.length >= 2) {
      return [String(parsed[0]), String(parsed[1])];
    }
  } catch { /* ignore */ }
  return ['#555555', '#999999'];
}

/* Role badge color map */
const roleBadgeStyles: Record<string, { text: string }> = {
  Fighter:  { text: 'text-orange-400' },
  Assassin: { text: 'text-purple-400' },
  Mage:     { text: 'text-cyan-400' },
  Marksman: { text: 'text-amber-400' },
  Tank:     { text: 'text-blue-400' },
  Support:  { text: 'text-emerald-400' },
};

/* ─────────────────────────────────────────────
   Character Picker — Grid Layout (Mobile-Friendly)
   ───────────────────────────────────────────── */

export function CharacterPicker({ division, onSelect, selectedId }: CharacterPickerProps) {
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  /* ── Fetch characters ── */
  useEffect(() => {
    let cancelled = false;
    async function fetchCharacters() {
      try {
        setLoading(true);
        const res = await fetch(`/api/characters?gender=${division}`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = await res.json();
        if (!cancelled && data.characters && data.characters.length > 0) {
          setCharacters(data.characters);
        } else if (!cancelled) {
          try {
            await fetch('/api/characters', { method: 'POST' });
            const res2 = await fetch(`/api/characters?gender=${division}`);
            const data2 = await res2.json();
            if (data2.characters && data2.characters.length > 0) setCharacters(data2.characters);
          } catch { /* retry failed */ }
        }
      } catch {
        try {
          await fetch('/api/characters', { method: 'POST' });
          if (!cancelled) {
            const res2 = await fetch(`/api/characters?gender=${division}`);
            const data2 = await res2.json();
            if (data2.characters) setCharacters(data2.characters);
          }
        } catch { /* fallback */ }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCharacters();
    return () => { cancelled = true; };
  }, [division]);

  useEffect(() => { setImgErrors(new Set()); }, [characters]);

  /* ── Filtered characters ── */
  const filteredCharacters = useMemo(() => {
    let result = characters;
    if (roleFilter !== 'all') {
      result = result.filter((c) => c.universe === roleFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }
    return result;
  }, [characters, roleFilter, searchQuery]);

  const availableCount = characters.filter((c) => !c.isTaken).length;
  const selectedCharacter = selectedId ? characters.find((c) => c.id === selectedId) : null;

  /* ── Handlers ── */
  const handleSelect = useCallback((char: CharacterData) => {
    if (char.isTaken || selectedId) return;
    onSelect(char.id, '');
  }, [onSelect, selectedId]);

  const handleImageError = useCallback((charId: string) => {
    setImgErrors((prev) => { const next = new Set(prev); next.add(charId); return next; });
  }, []);

  const toggleExpand = useCallback(() => {
    if (!isExpanded && !selectedCharacter) {
      setIsExpanded(true);
    } else {
      setIsExpanded((prev) => !prev);
    }
  }, [isExpanded, selectedCharacter]);

  const handleDeselect = useCallback(() => {
    if (selectedId) {
      onSelect('', '');
    }
  }, [selectedId, onSelect]);

  const availableFiltered = filteredCharacters.filter((c) => !c.isTaken);
  const takenFiltered = filteredCharacters.filter((c) => c.isTaken && c.id === selectedId);

  /* ── Single character card (shared for grid) ── */
  const renderCharCard = (char: CharacterData, isTaken: boolean) => {
    const isSelected = selectedId === char.id;
    const colors = parseColors(char.colors);
    const hasImage = char.imageUrl && !imgErrors.has(char.id);
    const badgeStyle = roleBadgeStyles[char.universe];

    return (
      <motion.button
        key={char.id}
        onClick={() => handleSelect(char)}
        className={`relative rounded-xl overflow-hidden transition-all duration-200 group ${
          isTaken
            ? 'opacity-40 cursor-not-allowed'
            : isSelected
              ? 'ring-2 ring-emerald-400 scale-[1.02]'
              : 'hover:bg-white/[0.06] active:scale-[0.96] cursor-pointer'
        }`}
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: isSelected
            ? '0.5px solid rgba(16,185,129,0.3)'
            : '0.5px solid rgba(255,255,255,0.06)',
        }}
        whileHover={!isSelected && !isTaken ? { y: -2 } : undefined}
        whileTap={!isSelected && !isTaken ? { scale: 0.94 } : undefined}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      >
        {/* Avatar */}
        <div className="w-full aspect-square relative overflow-hidden">
          {hasImage ? (
            <img
              src={char.imageUrl!}
              alt={char.name}
              className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-110"
              onError={() => handleImageError(char.id)}
              loading="lazy"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${colors[0]}44, ${colors[1]}22)`,
              }}
            >
              <span className="text-xl sm:text-2xl">{getClassIcon(char.classType as CharacterData['classType'])}</span>
            </div>
          )}

          {/* Selected check overlay */}
          {isSelected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 bg-emerald-500/20 backdrop-blur-[1px] flex items-center justify-center"
            >
              <div
                className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center"
                style={{ boxShadow: '0 0 14px rgba(16,185,129,0.4)' }}
              >
                <Check className="w-3.5 h-3.5 text-white/90" strokeWidth={3} />
              </div>
            </motion.div>
          )}

          {/* Taken overlay */}
          {isTaken && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <Lock className="w-4 h-4 text-white/40" />
            </div>
          )}
        </div>

        {/* Info strip */}
        <div className="px-2 py-1.5 bg-black/30">
          <p className={`text-[7px] sm:text-[8px] font-semibold ${badgeStyle ? badgeStyle.text : 'text-white/40'} text-center truncate`}>{
            char.universe
          }</p>
        </div>
      </motion.button>
    );
  };

  /* ── Collapsed view — Selected character or placeholder ── */
  const renderCollapsed = () => (
    <button
      onClick={toggleExpand}
      className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer group"
      style={{
        background: selectedCharacter
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.03)',
        border: selectedCharacter
          ? '0.5px solid rgba(16,185,129,0.15)'
          : '0.5px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Avatar circle */}
      <div className="relative flex-shrink-0">
        {selectedCharacter ? (
          <>
            <div
              className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-emerald-400/40"
              style={{ boxShadow: '0 0 12px rgba(16,185,129,0.15)' }}
            >
              {selectedCharacter.imageUrl && !imgErrors.has(selectedCharacter.id) ? (
                <img
                  src={selectedCharacter.imageUrl}
                  alt={selectedCharacter.name}
                  className="w-full h-full object-cover"
                  onError={() => handleImageError(selectedCharacter.id)}
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${parseColors(selectedCharacter.colors)[0]}44, ${parseColors(selectedCharacter.colors)[1]}22)`,
                  }}
                >
                  <span className="text-sm">{getClassIcon(selectedCharacter.classType as CharacterData['classType'])}</span>
                </div>
              )}
            </div>
            {/* Check badge */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
              style={{ boxShadow: '0 0 8px rgba(16,185,129,0.4)' }}
            >
              <Check className="w-3 h-3 text-white/90" strokeWidth={3} />
            </motion.div>
          </>
        ) : (
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/[0.04] border border-dashed border-white/15 group-hover:border-white/25 transition-colors">
            <Sparkles className="w-4 h-4 text-white/20 group-hover:text-white/35 transition-colors" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0 text-left">
        <p className={`text-[13px] font-semibold ${selectedCharacter ? 'text-emerald-400/80' : 'text-white/40'} truncate`}>
          {selectedCharacter ? 'Karakter Dipilih' : 'Pilih Karakter'}
        </p>
        <p className="text-[11px] text-white/25 mt-0.5">
          {selectedCharacter
            ? `${selectedCharacter.universe} • ${availableCount - 1} lainnya tersedia`
            : `${availableCount} karakter tersedia`
          }
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {selectedCharacter && (
          <button
            onClick={(e) => { e.stopPropagation(); handleDeselect(); }}
            className="w-7 h-7 rounded-lg bg-white/[0.04] flex items-center justify-center hover:bg-white/[0.08] transition-colors"
          >
            <span className="text-[11px] text-white/30">&times;</span>
          </button>
        )}
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className={`w-4 h-4 ${selectedCharacter ? 'text-emerald-400/60' : 'text-white/20'}`} />
        </motion.div>
      </div>
    </button>
  );

  /* ── Expanded view — Search + Filter + Grid Cards ── */
  const renderExpanded = () => (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari karakter..."
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-9 pr-9 py-2.5 text-white/90 text-[13px] placeholder-white/18 focus:outline-none focus:border-white/15 focus:bg-white/[0.06] transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-white/25 hover:text-white/50 rounded-md transition-colors"
          >
            &times;
          </button>
        )}
      </div>

      {/* Role filter pills — horizontal scroll (short list, works fine) */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {([
          { key: 'all', label: 'Semua', count: characters.length },
          { key: 'Fighter', label: 'Fighter', count: characters.filter(c => c.universe === 'Fighter').length },
          { key: 'Assassin', label: 'Assassin', count: characters.filter(c => c.universe === 'Assassin').length },
          { key: 'Mage', label: 'Mage', count: characters.filter(c => c.universe === 'Mage').length },
          { key: 'Marksman', label: 'Marksman', count: characters.filter(c => c.universe === 'Marksman').length },
          { key: 'Tank', label: 'Tank', count: characters.filter(c => c.universe === 'Tank').length },
          { key: 'Support', label: 'Support', count: characters.filter(c => c.universe === 'Support').length },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setRoleFilter(tab.key)}
            className={`relative flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all duration-200 ${
              roleFilter === tab.key
                ? 'text-white/90 bg-white/[0.08] border border-white/[0.08]'
                : 'text-white/30 hover:text-white/50 bg-transparent border border-transparent hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
            <span className="ml-1 text-white/15">{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Characters — responsive grid (scrollable if many) */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="relative">
            <div className="w-6 h-6 border-[1.5px] border-white/[0.08] rounded-full" />
            <div className="absolute inset-0 w-6 h-6 border-[1.5px] border-transparent border-t-white/40 rounded-full animate-spin" />
          </div>
        </div>
      ) : filteredCharacters.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/[0.05] flex items-center justify-center mx-auto mb-2">
            <ImageOff className="w-4 h-4 text-white/15" />
          </div>
          <p className="text-[12px] text-white/20 font-medium">Tidak ada karakter ditemukan</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-[320px] overflow-y-auto pr-1 rounded-lg">
          {/* Available characters */}
          {availableFiltered.map((char) => renderCharCard(char, false))}

          {/* Taken characters (only if selected, to show context) */}
          {takenFiltered.map((char) => renderCharCard(char, true))}
        </div>
      )}

      {/* Footer — count info */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-white/20 pt-0.5">
        <Users className="w-3 h-3" />
        <span>{availableCount} tersedia dari {characters.length} karakter</span>
      </div>
    </div>
  );

  return (
    <div>
      <AnimatePresence mode="wait">
        <motion.div
          key={isExpanded ? 'expanded' : 'collapsed'}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
        >
          {isExpanded ? renderExpanded() : renderCollapsed()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
