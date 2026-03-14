'use client';

import { COLOR_HEX } from '@/lib/constants';

interface ColorPickerProps {
  onPick: (color: number) => void;
  onCancel: () => void;
}

const PICK_COLORS = [
  { idx: 0, name: 'Red', hex: COLOR_HEX.red },
  { idx: 1, name: 'Yellow', hex: COLOR_HEX.yellow },
  { idx: 2, name: 'Green', hex: COLOR_HEX.green },
  { idx: 3, name: 'Purple', hex: COLOR_HEX.purple },
];

export default function ColorPicker({ onPick, onCancel }: ColorPickerProps) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-2xl p-6 text-center">
        <h3 className="text-white text-lg font-bold mb-4">Choose a color</h3>
        <div className="flex gap-3">
          {PICK_COLORS.map((c) => (
            <button
              key={c.idx}
              onClick={() => onPick(c.idx)}
              className="w-16 h-16 rounded-xl border-2 border-white/30 hover:border-white
                         hover:scale-110 transition-all font-bold text-white text-sm"
              style={{ backgroundColor: c.hex }}
            >
              {c.name}
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="mt-4 text-gray-400 hover:text-white text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
