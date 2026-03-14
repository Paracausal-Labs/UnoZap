'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Account, RpcProvider } from 'starknet';

interface WalletState {
  account: Account | null;
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

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'http://localhost:5050';

// Katana prefunded dev accounts — pick via URL param ?player=0 or ?player=1
const DEV_ACCOUNTS = [
  {
    address: '0x127fd5f1fe78a71f8bcd1fec63e3fe2f0486b6ecd5c86a0466c3a21fa5cfcec',
    privateKey: '0xc5b2fcab997346f3ea1c00b002ecf6f382c5f9c9659a3894eb783c5320f912',
  },
  {
    address: '0x13d9ee239f33fea4f8785b9e3870ade909e20a9599ae7cd62c1c292b73af1b7',
    privateKey: '0x1c9053c053edf324aec366a34c6901b1095b07af69495bffec7d7fe21effb1b',
  },
];

function getPlayerIndex(): number {
  if (typeof window === 'undefined') return 0;
  const params = new URLSearchParams(window.location.search);
  const p = params.get('player');
  if (p !== null) {
    localStorage.setItem('unozap_player', p);
    return p === '1' ? 1 : 0;
  }
  return localStorage.getItem('unozap_player') === '1' ? 1 : 0;
}

export default function StarkzapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    account: null,
    address: null,
    connecting: false,
  });

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      const provider = new RpcProvider({ nodeUrl: RPC_URL, blockIdentifier: 'latest' });
      const idx = getPlayerIndex();
      const dev = DEV_ACCOUNTS[idx];
      const account = new Account(provider, dev.address, dev.privateKey, undefined, '0x3');
      setState({ account, address: dev.address, connecting: false });
    } catch (err) {
      console.error('Connect failed:', err);
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ account: null, address: null, connecting: false });
  }, []);

  const execute = useCallback(
    async (calls: any[]) => {
      if (!state.account) throw new Error('Not connected');
      const nonce = await state.account.getNonce();
      const result = await state.account.execute(calls, {
        skipValidate: true,
        nonce,
        resourceBounds: {
          l1_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
          l2_gas: { max_amount: '0x0', max_price_per_unit: '0x0' },
        },
      });
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
