'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface WalletState {
  wallet: any | null;
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

// Contract addresses - will be set after deployment
const LOBBY_CONTRACT = process.env.NEXT_PUBLIC_LOBBY_CONTRACT ?? '';
const GAMEPLAY_CONTRACT = process.env.NEXT_PUBLIC_GAMEPLAY_CONTRACT ?? '';

export default function StarkzapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    wallet: null,
    address: null,
    connecting: false,
  });

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const { StarkSDK, OnboardStrategy } = await import('starkzap');
      const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL;
      const sdk = new StarkSDK(
        rpcUrl
          ? { rpcUrl, chainId: process.env.NEXT_PUBLIC_CHAIN_ID as any ?? 'SN_SEPOLIA' }
          : { network: 'sepolia' }
      );
      const { wallet } = await sdk.onboard({
        strategy: OnboardStrategy.Cartridge,
        cartridge: {
          policies: [
            { target: LOBBY_CONTRACT, method: 'create_game' },
            { target: LOBBY_CONTRACT, method: 'join_game' },
            { target: GAMEPLAY_CONTRACT, method: 'play_card' },
            { target: GAMEPLAY_CONTRACT, method: 'draw_card' },
            { target: GAMEPLAY_CONTRACT, method: 'pass_turn' },
            { target: GAMEPLAY_CONTRACT, method: 'timeout_turn' },
          ],
        },
      });
      await wallet.ensureReady({ deploy: 'if_needed' });
      setState({ wallet, address: wallet.address, connecting: false });
    } catch (err) {
      setState((s) => ({ ...s, connecting: false }));
      throw err;
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ wallet: null, address: null, connecting: false });
  }, []);

  const execute = useCallback(
    async (calls: any[]) => {
      if (!state.wallet) throw new Error('Not connected');
      const tx = await state.wallet.execute(calls);
      await tx.wait();
      return tx;
    },
    [state.wallet],
  );

  return (
    <StarkzapContext.Provider value={{ ...state, connect, disconnect, execute }}>
      {children}
    </StarkzapContext.Provider>
  );
}
