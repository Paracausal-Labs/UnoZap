'use client';

import { use } from 'react';
import Image from 'next/image';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useGame } from '@/hooks/useGame';
import GameBoard from '@/components/game/GameBoard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GamePage({ params }: PageProps) {
  const { id } = use(params);
  const gameId = Number(id);
  const { address, connect, connecting } = useStarkzap();
  const {
    game,
    players,
    myHand,
    myPlayerIdx,
    isMyTurn,
    timeLeft,
    canPlay,
    playCard,
    drawCard,
    passTurn,
  } = useGame(gameId);

  if (!address) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <Image
          src="/playingbackground.png"
          alt=""
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h2 className="text-3xl font-bold drop-shadow-lg">UnoZap - Game #{gameId}</h2>
          <button
            onClick={connect}
            disabled={connecting}
            className="px-10 py-4 bg-gradient-to-r from-purple-600 via-violet-600 to-blue-600
                       rounded-2xl font-bold text-lg shadow-lg
                       hover:from-purple-500 hover:via-violet-500 hover:to-blue-500
                       hover:shadow-purple-500/30 hover:shadow-xl
                       transition-all duration-300 disabled:opacity-50
                       glow-purple"
          >
            {connecting ? 'Connecting...' : 'Connect to Play'}
          </button>
        </div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <Image
          src="/playingbackground.png"
          alt=""
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <h2 className="text-2xl font-bold drop-shadow-lg">Game #{gameId}</h2>
          <div className="animate-spin w-10 h-10 border-3 border-white/30 border-t-white rounded-full" />
          <div className="text-gray-300">Loading game state from Torii...</div>
        </div>
      </div>
    );
  }

  // Waiting room
  if (game.state === 0) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
        <Image
          src="/playingbackground.png"
          alt=""
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="text-4xl font-bold drop-shadow-lg">Waiting for Players</h2>
          <div className="flex gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-28 h-28 rounded-2xl flex flex-col items-center justify-center text-lg font-bold transition-all duration-300 ${
                  i < game.playerCount
                    ? 'glass bg-green-500/20 border-green-500/40 scale-105 glow-green'
                    : 'glass border-dashed border-white/10'
                }`}
              >
                {i < game.playerCount ? (
                  <>
                    <span className="text-2xl text-white">P{i + 1}</span>
                    <span className="text-xs text-green-400 mt-1">Ready</span>
                  </>
                ) : (
                  <span className="text-3xl text-gray-500">?</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-gray-300 text-lg">
            {game.playerCount}/4 players
          </p>
          <p className="text-gray-500 text-sm">
            Game starts automatically when all 4 players join
          </p>
        </div>
      </div>
    );
  }

  // Active game
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <Image
        src="/playingbackground.png"
        alt=""
        fill
        className="object-cover"
        priority
        quality={90}
      />
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative z-10 w-full p-4">
        <GameBoard
          topColor={game.topColor}
          topValue={game.topValue}
          myHand={myHand}
          isMyTurn={isMyTurn}
          currentTurn={game.currentTurn}
          myPlayerIdx={myPlayerIdx}
          players={players}
          direction={game.direction}
          timeLeft={timeLeft}
          gameState={game.state}
          winner={game.state === 2 ? game.winner : undefined}
          canPlay={canPlay}
          onPlayCard={playCard}
          onDrawCard={drawCard}
          onPassTurn={passTurn}
        />
      </div>
    </div>
  );
}
