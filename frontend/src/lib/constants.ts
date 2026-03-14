export const COLORS = ['red', 'yellow', 'green', 'purple', 'wild'] as const;
export type CardColor = (typeof COLORS)[number];

export const COLOR_HEX: Record<string, string> = {
  red: '#EF4444',
  yellow: '#F59E0B',
  green: '#22C55E',
  purple: '#A855F7',
  wild: '#1F2937',
};

export const COLOR_DISPLAY: Record<string, string> = {
  red: 'Red',
  yellow: 'Yellow',
  green: 'Green',
  purple: 'Purple',
  wild: 'Wild',
};

export const VALUE_LABELS: Record<number, string> = {
  0: '0', 1: '1', 2: '2', 3: '3', 4: '4',
  5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: 'Skip',
  11: 'Reverse',
  12: 'Draw 2',
  13: 'Wild',
  14: 'Draw 4',
};

// Card info from card_id (mirrors Cairo card_info)
export function cardInfo(cardId: number): { color: number; value: number } {
  if (cardId >= 104) return { color: 4, value: 14 };
  if (cardId >= 100) return { color: 4, value: 13 };
  const color = Math.floor(cardId / 25);
  const offset = cardId % 25;
  if (offset === 0) return { color, value: 0 };
  const value = Math.floor((offset - 1) / 2) + 1;
  return { color, value };
}

export function colorName(colorIdx: number): CardColor {
  return COLORS[colorIdx] ?? 'wild';
}

// Map (color, value) to card image filename
export function cardImagePath(color: number, value: number): string {
  const cName = colorName(color);

  // Wild cards (in hand / generic)
  if (color === 4) {
    return '/cards/color_wild.png';
  }

  // Number cards
  if (value >= 0 && value <= 9) {
    return `/cards/color_${cName}_${value}.png`;
  }

  // Action cards
  switch (value) {
    case 10: return `/cards/color_${cName}_skip.png`;
    case 11: return `/cards/color_${cName}_reverse.png`;
    case 12: return `/cards/color_${cName}_draw.png`;
    case 14: return `/cards/color_${cName}_draw_4.png`;
    default: return `/cards/color_${cName}_empty.png`;
  }
}

// Location mapping from contract
export const LOCATION = {
  DRAW_PILE: 0,
  DISCARD: 1,
  PLAYER_0: 2,
  PLAYER_1: 3,
  PLAYER_2: 4,
  PLAYER_3: 5,
} as const;
