'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { fetchGame, fetchPlayers, fetchMyCards } from '@/lib/torii';
import type { GameData, PlayerData, CardData } from '@/lib/torii';

const GAMEPLAY_CONTRACT = process.env.NEXT_PUBLIC_GAMEPLAY_CONTRACT ?? '';
const POLL_INTERVAL = 2000;

export type { GameData, PlayerData, CardData };

function addressesMatch(a: string, b: string): boolean {
  try {
    return BigInt(a) === BigInt(b);
  } catch {
    return a.toLowerCase() === b.toLowerCase();
  }
}

export function useGame(gameId: number | null) {
  const { address, execute } = useStarkzap();
  const [game, setGame] = useState<GameData | null>(null);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [myHand, setMyHand] = useState<CardData[]>([]);
  const [myPlayerIdx, setMyPlayerIdx] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const isMyTurn = game?.state === 1 && myPlayerIdx !== null && game.currentTurn === myPlayerIdx;

  const canPlay = useCallback(
    (card: CardData) => {
      if (!game || game.state !== 1) return false;
      return card.color === game.topColor || card.value === game.topValue || card.color === 4;
    },
    [game],
  );

  // Poll Torii for game state
  useEffect(() => {
    if (gameId === null) return;

    const poll = async () => {
      try {
        const [gameData, playerData] = await Promise.all([
          fetchGame(gameId),
          fetchPlayers(gameId),
        ]);

        if (gameData) setGame(gameData);
        if (playerData.length) {
          setPlayers(playerData);

          if (address) {
            const me = playerData.find((p) => addressesMatch(p.address, address));
            if (me) {
              setMyPlayerIdx(me.playerIdx);
              const cards = await fetchMyCards(gameId, me.playerIdx);
              setMyHand(cards);
            }
          }
        }
      } catch (err) {
        console.error('[useGame] Polling error:', err);
      }
    };

    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [gameId, address]);

  // Turn timer
  useEffect(() => {
    if (!game || game.state !== 1) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = Math.max(0, game.turnDeadline - now);
      setTimeLeft(remaining);
    }, 1000);
    return () => clearInterval(interval);
  }, [game]);

  // Actions - all guarded against null gameId
  const playCard = useCallback(
    async (cardIndex: number, chosenColor: number = 0) => {
      if (gameId === null) throw new Error('No game ID');
      await execute([
        {
          contractAddress: GAMEPLAY_CONTRACT,
          entrypoint: 'play_card',
          calldata: [String(gameId), String(cardIndex), String(chosenColor)],
        },
      ]);
    },
    [execute, gameId],
  );

  const drawCard = useCallback(async () => {
    if (gameId === null) throw new Error('No game ID');
    await execute([
      {
        contractAddress: GAMEPLAY_CONTRACT,
        entrypoint: 'draw_card',
        calldata: [String(gameId)],
      },
    ]);
  }, [execute, gameId]);

  const passTurn = useCallback(async () => {
    if (gameId === null) throw new Error('No game ID');
    await execute([
      {
        contractAddress: GAMEPLAY_CONTRACT,
        entrypoint: 'pass_turn',
        calldata: [String(gameId)],
      },
    ]);
  }, [execute, gameId]);

  const callTimeout = useCallback(async () => {
    if (gameId === null) throw new Error('No game ID');
    await execute([
      {
        contractAddress: GAMEPLAY_CONTRACT,
        entrypoint: 'timeout_turn',
        calldata: [String(gameId)],
      },
    ]);
  }, [execute, gameId]);

  return {
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
  };
}
