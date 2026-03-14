'use client';

import Image from 'next/image';
import { cardImagePath } from '@/lib/constants';

interface UnoCardProps {
  color: number;
  value: number;
  faceDown?: boolean;
  small?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  highlight?: boolean;
}

export default function UnoCard({
  color,
  value,
  faceDown = false,
  small = false,
  onClick,
  disabled = false,
  highlight = false,
}: UnoCardProps) {
  const scale = small ? 3 : 4;
  const w = 32 * scale;
  const h = 32 * scale;

  const src = faceDown ? '/cards/card_back.png' : cardImagePath(color, value);

  return (
    <button
      onClick={onClick}
      disabled={disabled || faceDown}
      className={`
        relative transition-all duration-150 select-none flex-shrink-0
        ${disabled || faceDown ? 'cursor-default' : 'cursor-pointer hover:-translate-y-2 hover:shadow-xl'}
        ${highlight ? 'ring-2 ring-white ring-opacity-80 -translate-y-2 rounded-lg' : ''}
      `}
      style={{ width: w, height: h }}
    >
      <Image
        src={src}
        alt={faceDown ? 'Card back' : `${color}-${value}`}
        width={w}
        height={h}
        className="pixelated"
        style={{ imageRendering: 'pixelated' }}
        draggable={false}
      />
    </button>
  );
}
