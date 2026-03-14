'use client';

import { useState, useCallback } from 'react';
import { useStarkzap } from '@/providers/StarkzapProvider';

const LOBBY_CONTRACT = process.env.NEXT_PUBLIC_LOBBY_CONTRACT ?? '';

export function useLobby() {
  const { execute } = useStarkzap();
  const [loading, setLoading] = useState(false);

  const createGame = useCallback(
    async (joinCode: string) => {
      setLoading(true);
      try {
        // Convert join code string to felt252 (simple numeric hash)
        const codeFelt = stringToFelt(joinCode);
        const tx = await execute([
          {
            contractAddress: LOBBY_CONTRACT,
            entrypoint: 'create_game',
            calldata: [codeFelt],
          },
        ]);
        return tx;
      } finally {
        setLoading(false);
      }
    },
    [execute],
  );

  const joinGame = useCallback(
    async (gameId: number, joinCode: string) => {
      setLoading(true);
      try {
        const codeFelt = stringToFelt(joinCode);
        await execute([
          {
            contractAddress: LOBBY_CONTRACT,
            entrypoint: 'join_game',
            calldata: [String(gameId), codeFelt],
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [execute],
  );

  return { createGame, joinGame, loading };
}

function stringToFelt(str: string): string {
  // Encode short string as felt252 (max 31 chars)
  let hex = '0x';
  for (let i = 0; i < str.length && i < 31; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, '0');
  }
  return hex;
}
