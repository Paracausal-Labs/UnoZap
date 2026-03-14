'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { fetchGameByCreator } from '@/lib/torii';

const LOBBY_CONTRACT = process.env.NEXT_PUBLIC_LOBBY_CONTRACT ?? '';

export function useLobby() {
  const { execute, address } = useStarkzap();
  const [loading, setLoading] = useState(false);

  const createGame = useCallback(
    async (joinCode: string) => {
      setLoading(true);
      try {
        const codeFelt = stringToFelt(joinCode);
        const result = await execute([
          {
            contractAddress: LOBBY_CONTRACT,
            entrypoint: 'create_game',
            calldata: [codeFelt],
          },
        ]);

        const txHash = result?.transaction_hash ?? null;

        // Poll Torii to find the game created by this address
        let gameId: number | null = null;
        if (address) {
          for (let attempt = 0; attempt < 10; attempt++) {
            await delay(1500);
            const found = await fetchGameByCreator(address);
            if (found !== null) {
              gameId = found;
              break;
            }
          }
        }

        return { txHash, gameId };
      } catch (err) {
        console.error('[useLobby] createGame failed:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [execute, address],
  );

  const joinGame = useCallback(
    async (gameId: number, joinCode: string) => {
      setLoading(true);
      try {
        const codeFelt = stringToFelt(joinCode);
        const result = await execute([
          {
            contractAddress: LOBBY_CONTRACT,
            entrypoint: 'join_game',
            calldata: [String(gameId), codeFelt],
          },
        ]);
        return { txHash: result?.transaction_hash ?? null };
      } catch (err) {
        console.error('[useLobby] joinGame failed:', err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [execute],
  );

  return { createGame, joinGame, loading };
}

function stringToFelt(str: string): string {
  let hex = '0x';
  for (let i = 0; i < str.length && i < 31; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
