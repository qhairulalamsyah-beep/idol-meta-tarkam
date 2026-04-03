/* ═══════════════════════════════════════════════════════════════
   Character Definitions — 49 Mobile Legends Heroes
   26 Male | 23 Female (matching generated avatars)
   ═══════════════════════════════════════════════════════════════ */

export interface CharacterDef {
  name: string;
  slug: string;
  gender: 'male' | 'female';
  universe: 'Fighter' | 'Assassin' | 'Mage' | 'Marksman' | 'Tank' | 'Support';
  alignment: 'hero' | 'villain';
  classType: 'Striker' | 'Guardian' | 'Shadow' | 'Support' | 'Mystic' | 'Phantom';
  colors: [string, string];
}

export const CHARACTER_DEFINITIONS: CharacterDef[] = [
  // ═══════════════════════════════════════════════════════
  // MALE — 24 Heroes
  // ═══════════════════════════════════════════════════════
  { name: 'Aamon', slug: 'aamon', gender: 'male', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#1A237E', '#7C4DFF'] },
  { name: 'Aldous', slug: 'aldous', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#37474F', '#FF6F00'] },
  { name: 'Alucard', slug: 'alucard', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#1A237E', '#B71C1C'] },
  { name: 'Arlott', slug: 'arlott', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#FF4500', '#8B0000'] },
  { name: 'Argus', slug: 'argus', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#4A148C', '#E91E63'] },
  { name: 'Atlas', slug: 'atlas', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#0D47A1', '#78909C'] },
  { name: 'Balmond', slug: 'balmond', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#C62828', '#3E2723'] },
  { name: 'Chou', slug: 'chou', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#FF6F00', '#1A237E'] },
  { name: 'Cyclops', slug: 'cyclops', gender: 'male', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#7B1FA2', '#FF80AB'] },
  { name: 'Dyrroth', slug: 'dyrroth', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#4A148C', '#FF1744'] },
  { name: 'Estes', slug: 'estes', gender: 'male', universe: 'Support', alignment: 'hero', classType: 'Support', colors: ['#7B1FA2', '#E1BEE7'] },
  { name: 'Fanny', slug: 'fanny', gender: 'male', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#0D47A1', '#FF6D00'] },
  { name: 'Franco', slug: 'franco', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#0D47A1', '#90A4AE'] },
  { name: 'Fredrinn', slug: 'fredrinn', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#1565C0', '#78909C'] },
  { name: 'Gatotkaca', slug: 'gatotkaca', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Guardian', colors: ['#4A148C', '#FFD700'] },
  { name: 'Granger', slug: 'granger', gender: 'male', universe: 'Marksman', alignment: 'hero', classType: 'Phantom', colors: ['#4A148C', '#E1BEE7'] },
  { name: 'Grock', slug: 'grock', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#33691E', '#8D6E63'] },
  { name: 'Gusion', slug: 'gusion', gender: 'male', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#1A237E', '#F48FB1'] },
  { name: 'Khufra', slug: 'khufra', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#F9A825', '#37474F'] },
  { name: 'Ling', slug: 'ling', gender: 'male', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#006064', '#B2EBF2'] },
  { name: 'Martis', slug: 'martis', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#004D40', '#80CBC4'] },
  { name: 'Phoveus', slug: 'phoveus', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Guardian', colors: ['#1A237E', '#FF6F00'] },
  { name: 'Saber', slug: 'saber', gender: 'male', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#212121', '#FFD600'] },
  { name: 'Tigreal', slug: 'tigreal', gender: 'male', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#455A64', '#0D47A1'] },
  { name: 'Yuzhong', slug: 'yuzhong', gender: 'male', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#FF6F00', '#8D6E63'] },
  { name: 'Paquito', slug: 'paquito', gender: 'male', universe: 'Marksman', alignment: 'hero', classType: 'Phantom', colors: ['#00BCD4', '#FF6D00'] },

  // ═══════════════════════════════════════════════════════
  // FEMALE — 21 Heroes
  // ═══════════════════════════════════════════════════════
  { name: 'Alice', slug: 'alice', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#880E4F', '#F48FB1'] },
  { name: 'Angela', slug: 'angela', gender: 'female', universe: 'Support', alignment: 'hero', classType: 'Support', colors: ['#F48FB1', '#FCE4EC'] },
  { name: 'Aurora', slug: 'aurora', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#0097A7', '#B2EBF2'] },
  { name: 'Beatrix', slug: 'beatrix', gender: 'female', universe: 'Marksman', alignment: 'hero', classType: 'Phantom', colors: ['#7B1FA2', '#FFD54F'] },
  { name: 'Benedetta', slug: 'benedetta', gender: 'female', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#37474F', '#B0BEC5'] },
  { name: 'Carmilla', slug: 'carmilla', gender: 'female', universe: 'Tank', alignment: 'hero', classType: 'Guardian', colors: ['#B71C1C', '#880E4F'] },
  { name: 'Cecillion', slug: 'cecillion', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#4A148C', '#CE93D8'] },
  { name: "Chang'e", slug: 'change', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#E1BEE7', '#FCE4EC'] },
  { name: 'Diggie', slug: 'diggie', gender: 'female', universe: 'Support', alignment: 'hero', classType: 'Support', colors: ['#FFB300', '#FFF8E1'] },
  { name: 'Edith', slug: 'edith', gender: 'female', universe: 'Support', alignment: 'hero', classType: 'Guardian', colors: ['#455A64', '#FFD54F'] },
  { name: 'Esmeralda', slug: 'esmeralda', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#1B5E20', '#A5D6A7'] },
  { name: 'Eudora', slug: 'eudora', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#1565C0', '#FFD54F'] },
  { name: 'Floryn', slug: 'floryn', gender: 'female', universe: 'Support', alignment: 'hero', classType: 'Support', colors: ['#2E7D32', '#A5D6A7'] },
  { name: 'Freya', slug: 'freya', gender: 'female', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#0D47A1', '#FF8F00'] },
  { name: 'Guinevere', slug: 'guinevere', gender: 'female', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#F48FB1', '#FCE4EC'] },
  { name: 'Hanabi', slug: 'hanabi', gender: 'female', universe: 'Marksman', alignment: 'hero', classType: 'Phantom', colors: ['#B71C1C', '#FF8A80'] },
  { name: 'Joy', slug: 'joy', gender: 'female', universe: 'Assassin', alignment: 'hero', classType: 'Shadow', colors: ['#E91E63', '#00BCD4'] },
  { name: 'Kagura', slug: 'kagura', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#880E4F', '#F8BBD0'] },
  { name: 'Lunox', slug: 'lunox', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#311B92', '#B39DDB'] },
  { name: 'Valir', slug: 'valir', gender: 'female', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#BF360C', '#FFAB00'] },
  { name: 'Xeniel', slug: 'xeniel', gender: 'female', universe: 'Support', alignment: 'hero', classType: 'Guardian', colors: ['#1565C0', '#FDD835'] },
  { name: 'Karina', slug: 'karina', gender: 'female', universe: 'Mage', alignment: 'hero', classType: 'Mystic', colors: ['#B71C1C', '#FF5252'] },
  { name: 'Valentina', slug: 'valentina', gender: 'female', universe: 'Fighter', alignment: 'hero', classType: 'Striker', colors: ['#FFD700', '#FF6F00'] },
];

/* ═══════════════════════════════════════════════════════════════
   Helper Functions
   ═══════════════════════════════════════════════════════════════ */

export function getClassIcon(classType: CharacterDef['classType']): string {
  switch (classType) {
    case 'Striker': return '⚔️';
    case 'Guardian': return '🛡️';
    case 'Shadow': return '🌑';
    case 'Support': return '💚';
    case 'Mystic': return '✨';
    case 'Phantom': return '👻';
    default: return '🎮';
  }
}

export function getClassColor(classType: CharacterDef['classType']): string {
  switch (classType) {
    case 'Striker': return '#FF4500';
    case 'Guardian': return '#0096C7';
    case 'Shadow': return '#9B59B6';
    case 'Support': return '#4CAF50';
    case 'Mystic': return '#FFD700';
    case 'Phantom': return '#9CA3AF';
    default: return '#FFFFFF';
  }
}

export function getAlignmentLabel(alignment: 'hero' | 'villain'): string {
  return alignment === 'hero' ? '🦸 Hero' : '🦹 Villain';
}

export function getUniverseLabel(universe: string): string {
  const labels: Record<string, string> = {
    'Fighter': '⚔️ Fighter',
    'Assassin': '🗡️ Assassin',
    'Mage': '🔮 Mage',
    'Marksman': '🏹 Marksman',
    'Tank': '🛡️ Tank',
    'Support': '💚 Support',
  };
  return labels[universe] || universe;
}
