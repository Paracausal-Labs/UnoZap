'use client';

import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import Controller from '@cartridge/controller';


interface WalletState {
  account: any | null;
  address: string | null;
  connecting: boolean;
}

interface StarkzapContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  execute: (calls: any[]) => Promise<any>;
}

const StarkzapContext = createContext<StarkzapContextType | null>(null);

export function useStarkzap() {
  const ctx = useContext(StarkzapContext);
  if (!ctx) throw new Error('useStarkzap must be used within StarkzapProvider');
  return ctx;
}

const LOBBY_CONTRACT = process.env.NEXT_PUBLIC_LOBBY_CONTRACT ?? '';
const GAMEPLAY_CONTRACT = process.env.NEXT_PUBLIC_GAMEPLAY_CONTRACT ?? '';
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.cartridge.gg/x/unozap/katana';

export default function StarkzapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    account: null,
    address: null,
    connecting: false,
  });
  const controllerRef = useRef<Controller | null>(null);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      if (!controllerRef.current) {
        controllerRef.current = new Controller({
          rpcUrl: RPC_URL,
          policies: {
            contracts: {
              [LOBBY_CONTRACT]: {
                methods: [
                  { name: 'create_game', entrypoint: 'create_game' },
                  { name: 'join_game', entrypoint: 'join_game' },
                ],
              },
              [GAMEPLAY_CONTRACT]: {
                methods: [
                  { name: 'play_card', entrypoint: 'play_card' },
                  { name: 'draw_card', entrypoint: 'draw_card' },
                  { name: 'pass_turn', entrypoint: 'pass_turn' },
                  { name: 'timeout_turn', entrypoint: 'timeout_turn' },
                ],
              },
            },
          },
        });
      }

      const account = await controllerRef.current.connect();
      if (account) {
        setState({
          account,
          address: account.address,
          connecting: false,
        });
      } else {
        setState((s) => ({ ...s, connecting: false }));
      }
    } catch (err) {
      console.error('[Controller] Connect failed:', err);
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    controllerRef.current?.disconnect();
    setState({ account: null, address: null, connecting: false });
  }, []);

  const execute = useCallback(
    async (calls: any[]) => {
      if (!state.account) throw new Error('Not connected');
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Transaction timed out')), 15000),
        );
        const result = await Promise.race([
          state.account.execute(calls),
          timeoutPromise,
        ]);
        if (result && typeof result === 'object' && 'error' in result) {
          const errMsg = typeof result.error === 'string' ? result.error : JSON.stringify(result.error);
          console.error('[StarkzapProvider] Execute error result:', errMsg);
          throw new Error(errMsg);
        }
        return result;
      } catch (err) {
        console.error('[StarkzapProvider] Execute failed:', err);
        throw err;
      }
    },
    [state.account],
  );

  return (
    <StarkzapContext.Provider value={{ ...state, connect, disconnect, execute }}>
      {children}
    </StarkzapContext.Provider>
  );
}
