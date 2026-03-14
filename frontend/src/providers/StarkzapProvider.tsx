'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { Account, RpcProvider } from 'starknet';
import Controller, { parseChainId } from '@cartridge/controller';

interface WalletState {
  account: any | null;
  address: string | null;
  connecting: boolean;
}

interface StarkzapContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  execute: (calls: any[]) => Promise<any>;
  isLocal: boolean;
}

const StarkzapContext = createContext<StarkzapContextType | null>(null);

export function useStarkzap() {
  const ctx = useContext(StarkzapContext);
  if (!ctx) throw new Error('useStarkzap must be used within StarkzapProvider');
  return ctx;
}

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL ?? 'http://localhost:5050';
const LOBBY_CONTRACT = process.env.NEXT_PUBLIC_LOBBY_CONTRACT ?? '';
const GAMEPLAY_CONTRACT = process.env.NEXT_PUBLIC_GAMEPLAY_CONTRACT ?? '';

const IS_LOCAL = typeof window !== 'undefined' && window.location.hostname === 'localhost';

// --- Local dev: Katana prefunded accounts ---
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

// --- Deployed: Cartridge Controller ---
function getController() {
  return new Controller({
    chains: [{ rpcUrl: RPC_URL }],
    defaultChainId: parseChainId(new URL(RPC_URL)),
    slot: 'unozap',
    preset: 'unozap',
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

export default function StarkzapProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    account: null,
    address: null,
    connecting: false,
  });
  const controllerRef = useRef<Controller | null>(null);

  // Auto-reconnect Controller on deployed site
  useEffect(() => {
    if (IS_LOCAL) return;
    const ctrl = getController();
    controllerRef.current = ctrl;
    ctrl.probe().then((account) => {
      if (account) {
        setState({ account, address: account.address, connecting: false });
      }
    }).catch(() => {});
  }, []);

  const connect = useCallback(async () => {
    setState((s) => ({ ...s, connecting: true }));
    try {
      if (IS_LOCAL) {
        const provider = new RpcProvider({ nodeUrl: RPC_URL, blockIdentifier: 'latest' });
        const idx = getPlayerIndex();
        const dev = DEV_ACCOUNTS[idx];
        const account = new Account(provider, dev.address, dev.privateKey, undefined, '0x3');
        setState({ account, address: dev.address, connecting: false });
      } else {
        if (!controllerRef.current) {
          controllerRef.current = getController();
        }
        const account = await controllerRef.current.connect();
        if (account) {
          setState({ account, address: account.address, connecting: false });
        } else {
          setState((s) => ({ ...s, connecting: false }));
        }
      }
    } catch (err) {
      console.error('Connect failed:', err);
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    if (!IS_LOCAL) {
      controllerRef.current?.disconnect();
    }
    setState({ account: null, address: null, connecting: false });
  }, []);

  const execute = useCallback(
    async (calls: any[]) => {
      if (!state.account) throw new Error('Not connected');
      if (IS_LOCAL) {
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
      } else {
        const result = await state.account.execute(calls);
        if (result && typeof result === 'object' && 'error' in result) {
          throw new Error(typeof result.error === 'string' ? result.error : JSON.stringify(result.error));
        }
        return result;
      }
    },
    [state.account],
  );

  return (
    <StarkzapContext.Provider value={{ ...state, connect, disconnect, execute, isLocal: IS_LOCAL }}>
      {children}
    </StarkzapContext.Provider>
  );
}
