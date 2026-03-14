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
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.cartridge.gg/x/starknet/sepolia';

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
      setState((s) => ({ ...s, connecting: false }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    controllerRef.current?.disconnect();
    setState({ account: null, address: null, connecting: false });
  }, []);

  const execute = useCallback(
    async (calls: any[]) => {
      if (!state.account) throw new Error('Not connected');
      const result = await state.account.execute(calls);
      return result;
    },
    [state.account],
  );

  return (
    <StarkzapContext.Provider value={{ ...state, connect, disconnect, execute }}>
      {children}
    </StarkzapContext.Provider>
  );
}
