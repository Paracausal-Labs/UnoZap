'use client';

import { useState } from 'react';
import UnoCard from './UnoCard';
import ColorPicker from './ColorPicker';
import { CardData } from '@/hooks/useGame';
import { COLOR_HEX, colorName, COLOR_DISPLAY } from '@/lib/constants';

interface GameBoardProps {
  topColor: number;
  topValue: number;
  myHand: CardData[];
  isMyTurn: boolean;
  currentTurn: number;
  myPlayerIdx: number | null;
  players: { playerIdx: number; address: string; cardCount: number; hasDrawn: boolean }[];
  direction: number;
  timeLeft: number;
  gameState: number;
  winner?: string;
  canPlay: (card: CardData) => boolean;
  onPlayCard: (cardIndex: number, chosenColor: number) => void;
  onDrawCard: () => void;
  onPassTurn: () => void;
}

export default function GameBoard({
  topColor,
  topValue,
  myHand,
  isMyTurn,
  currentTurn,
  myPlayerIdx,
  players,
  direction,
  timeLeft,
  gameState,
  winner,
  canPlay,
  onPlayCard,
  onDrawCard,
  onPassTurn,
}: GameBoardProps) {
  const [pendingWild, setPendingWild] = useState<number | null>(null);

  const handleCardClick = (card: CardData) => {
    if (!isMyTurn || !canPlay(card)) return;
    if (card.color === 4) {
      setPendingWild(card.cardIndex);
    } else {
      onPlayCard(card.cardIndex, 0);
    }
  };

  const handleColorPick = (color: number) => {
    if (pendingWild !== null) {
      onPlayCard(pendingWild, color);
      setPendingWild(null);
    }
  };

  const hasDrawn = players.find((p) => p.playerIdx === myPlayerIdx)?.hasDrawn ?? false;

  // Arrange opponents (relative to player)
  const opponents = players.filter((p) => p.playerIdx !== myPlayerIdx);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-4xl mx-auto p-4">
      {/* Game over overlay */}
      {gameState === 2 && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass rounded-2xl p-10 text-center glow-yellow">
            <h2 className="text-4xl font-bold text-yellow-400 mb-3">Game Over!</h2>
            <p className="text-white text-lg">
              {winner === players.find((p) => p.playerIdx === myPlayerIdx)?.address
                ? 'You won!'
                : `Player ${players.findIndex((p) => p.address === winner)} wins!`}
            </p>
          </div>
        </div>
      )}

      {/* Direction indicator */}
      <div className="glass-light rounded-full px-4 py-1.5 text-sm text-gray-300">
        {direction === 0 ? 'Clockwise' : 'Counter-clockwise'}
      </div>

      {/* Opponents */}
      <div className="flex justify-center gap-6 w-full">
        {opponents.map((opp) => {
          const isActive = currentTurn === opp.playerIdx;
          return (
            <div
              key={opp.playerIdx}
              className={`glass-light flex flex-col items-center gap-2 p-4 rounded-2xl transition-all duration-300 ${
                isActive
                  ? 'border-yellow-500/50 glow-yellow pulse-turn'
                  : ''
              }`}
            >
              <div className="text-sm text-gray-200 font-semibold">
                P{opp.playerIdx + 1}
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: Math.min(opp.cardCount, 10) }).map((_, i) => (
                  <UnoCard key={i} color={0} value={0} faceDown small />
                ))}
                {opp.cardCount > 10 && (
                  <span className="text-gray-400 text-xs self-center ml-1">
                    +{opp.cardCount - 10}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-400">{opp.cardCount} cards</div>
              {isActive && (
                <div className="text-xs text-yellow-400 font-bold">Thinking...</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Center: discard pile + draw pile */}
      <div className="flex items-center gap-10 py-6">
        {/* Draw pile */}
        <button
          onClick={onDrawCard}
          disabled={!isMyTurn || hasDrawn}
          className="relative group"
        >
          <UnoCard color={0} value={0} faceDown />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="glass rounded-lg text-white text-xs px-3 py-1.5 font-medium">Draw</span>
          </div>
        </button>

        {/* Discard pile */}
        <div className="relative">
          <UnoCard color={topColor} value={topValue} disabled />
          <div
            className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full shadow-lg"
            style={{
              backgroundColor: COLOR_HEX[colorName(topColor)],
              color: 'white',
            }}
          >
            {colorName(topColor).toUpperCase()}
          </div>
        </div>
      </div>

      {/* Timer */}
      {gameState === 1 && (
        <div
          className={`glass-light rounded-full px-5 py-2 text-sm font-mono ${
            timeLeft <= 5 ? 'text-red-400 animate-pulse border-red-500/30' : 'text-gray-300'
          }`}
        >
          {isMyTurn ? `Your turn: ${timeLeft}s` : `Waiting: ${timeLeft}s`}
        </div>
      )}

      {/* Color picker for wild cards */}
      {pendingWild !== null && (
        <ColorPicker onPick={handleColorPick} onCancel={() => setPendingWild(null)} />
      )}

      {/* My hand */}
      <div className="flex flex-wrap justify-center gap-1 mt-2">
        {myHand.map((card) => (
          <UnoCard
            key={card.cardIndex}
            color={card.color}
            value={card.value}
            onClick={() => handleCardClick(card)}
            disabled={!isMyTurn || !canPlay(card)}
            highlight={isMyTurn && canPlay(card)}
          />
        ))}
      </div>

      {/* Pass button */}
      {isMyTurn && hasDrawn && (
        <button
          onClick={onPassTurn}
          className="px-8 py-2.5 glass-light rounded-xl font-medium text-white
                     hover:bg-white/10 transition-all duration-200"
        >
          Pass Turn
        </button>
      )}

      {/* My info */}
      <div
        className={`text-sm font-bold px-5 py-2 rounded-full transition-all duration-300 ${
          isMyTurn
            ? 'bg-yellow-500 text-black glow-yellow'
            : 'glass-light text-gray-300'
        }`}
      >
        You (P{(myPlayerIdx ?? 0) + 1}) - {myHand.length} cards
      </div>
    </div>
  );
}
