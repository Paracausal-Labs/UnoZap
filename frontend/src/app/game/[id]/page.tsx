'use client';

import { use, useEffect } from 'react';
import Image from 'next/image';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useGame } from '@/hooks/useGame';
import GameBoard from '@/components/game/GameBoard';

interface PageProps {
  params: Promise<{ id: string }>;
}

function addressesMatch(a: string, b: string): boolean {
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
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
    callTimeout,
  } = useGame(gameId);

  // Auto-call timeout when timer hits 0 and it's not our turn
  useEffect(() => {
    if (!game || game.state !== 1 || timeLeft > 0) return;
    // Anyone can call timeout after deadline
    const timer = setTimeout(() => {
      callTimeout().catch((err: any) => console.warn('Timeout call failed:', err));
    }, 2000); // 2s grace period
    return () => clearTimeout(timer);
  }, [timeLeft, game, callTimeout]);

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
        <div className="absolute inset-0 pointer-events-none vignette" />
        <div className="relative z-10 flex flex-col items-center gap-6">
          <h2 className="text-3xl font-bold drop-shadow-lg tracking-wide uppercase">
            UnoZap - Game #{gameId}
          </h2>
          <button
            onClick={connect}
            disabled={connecting}
            className="game-btn game-btn-purple"
          >
            <span className="relative z-10">
              {connecting ? 'Connecting...' : 'Connect to Play'}
            </span>
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
        <div className="absolute inset-0 pointer-events-none vignette" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <h2 className="text-2xl font-bold drop-shadow-lg tracking-wide uppercase">
            Game #{gameId}
          </h2>
          <div className="animate-spin w-10 h-10 border-3 border-white/30 border-t-white rounded-full" />
          <div className="text-gray-300">Loading game state from Torii...</div>
        </div>
      </div>
    );
  }

  // Determine winner display text
  let winnerDisplay: string | undefined;
  if (game.state === 2 && game.winner) {
    const myAddr = address ?? '';
    if (addressesMatch(game.winner, myAddr)) {
      winnerDisplay = 'you';
    } else {
      const winnerPlayer = players.find((p) => addressesMatch(p.address, game.winner));
      winnerDisplay = winnerPlayer
        ? `Player ${winnerPlayer.playerIdx + 1}`
        : game.winner.slice(0, 8) + '...';
    }
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
        <div className="absolute inset-0 pointer-events-none vignette" />
        <div className="relative z-10 flex flex-col items-center gap-8">
          <h2 className="text-4xl font-bold drop-shadow-lg tracking-wide uppercase">
            Waiting for Players
          </h2>
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
      <div className="absolute inset-0 pointer-events-none vignette" />
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
          winner={winnerDisplay}
          canPlay={canPlay}
          onPlayCard={playCard}
          onDrawCard={drawCard}
          onPassTurn={passTurn}
        />
      </div>
    </div>
  );
}
