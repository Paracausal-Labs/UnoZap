'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useStarkzap } from '@/providers/StarkzapProvider';
import { useLobby } from '@/hooks/useLobby';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function LobbyPage() {
  const { address, connecting, connect } = useStarkzap();
  const { createGame, joinGame, loading } = useLobby();

  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [joinCode, setJoinCode] = useState('');
  const [gameId, setGameId] = useState('');
  const [createdCode, setCreatedCode] = useState('');
  const [createdGameId, setCreatedGameId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    setError('');
    try {
      const code = generateCode();
      const tx = await createGame(code);
      setCreatedCode(code);
      setCreatedGameId(0);
      setMode('create');
    } catch (e: any) {
      setError(e.message ?? 'Failed to create game');
    }
  };

  const handleJoin = async () => {
    setError('');
    try {
      await joinGame(Number(gameId), joinCode);
      window.location.href = `/game/${gameId}`;
    } catch (e: any) {
      setError(e.message ?? 'Failed to join game');
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background */}
      <Image
        src="/background.png"
        alt=""
        fill
        className="object-cover"
        priority
        quality={90}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12 w-full">
        {/* Logo */}
        <Image
          src="/logo.png"
          alt="UnoZap"
          width={400}
          height={200}
          className="mb-3 drop-shadow-2xl"
          style={{ imageRendering: 'auto' }}
          priority
        />
        <p className="text-gray-300 mb-10 text-center text-lg tracking-wide">
          On-chain UNO powered by Starknet & Starkzap
        </p>

        {/* Connect Wallet */}
        {!address ? (
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
            {connecting ? 'Connecting...' : 'Connect Wallet'}
          </button>
        ) : (
          <div className="flex flex-col items-center gap-5 w-full max-w-md">
            {/* Connected badge */}
            <div className="glass rounded-full px-5 py-2 text-sm text-gray-300 font-mono">
              {address.slice(0, 6)}...{address.slice(-4)}
            </div>

            {mode === 'menu' && (
              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600
                             rounded-2xl font-bold text-lg shadow-lg
                             hover:from-green-500 hover:to-emerald-500
                             hover:shadow-green-500/25 hover:shadow-xl
                             transition-all duration-300 disabled:opacity-50
                             glow-green"
                >
                  {loading ? 'Creating...' : 'Create Game'}
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600
                             rounded-2xl font-bold text-lg shadow-lg
                             hover:from-blue-500 hover:to-indigo-500
                             hover:shadow-blue-500/25 hover:shadow-xl
                             transition-all duration-300
                             glow-blue"
                >
                  Join Game
                </button>
              </div>
            )}

            {mode === 'create' && createdCode && (
              <div className="glass rounded-2xl p-8 w-full text-center">
                <h3 className="text-xl font-bold mb-3 text-white">Game Created!</h3>
                <p className="text-gray-400 text-sm mb-4">Share this code with 3 friends:</p>
                <div className="text-4xl font-mono font-bold tracking-[0.3em] text-yellow-400 mb-5 glow-yellow inline-block px-4 py-2 rounded-xl">
                  {createdCode}
                </div>
                <p className="text-gray-500 text-sm mb-4">
                  Game starts when 4 players join
                </p>
                <p className="text-gray-400 text-xs">
                  Game ID: {createdGameId}
                </p>
                <button
                  onClick={() => setMode('menu')}
                  className="mt-5 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {mode === 'join' && (
              <div className="glass rounded-2xl p-8 w-full">
                <h3 className="text-xl font-bold mb-5 text-center text-white">Join Game</h3>
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Game ID (number)"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="w-full px-5 py-3 bg-white/5 rounded-xl border border-white/10
                               focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30
                               placeholder-gray-500 transition-all"
                  />
                  <input
                    type="text"
                    placeholder="Join Code (e.g. ABC123)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="w-full px-5 py-3 bg-white/5 rounded-xl border border-white/10
                               focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30
                               font-mono text-center text-xl tracking-[0.3em] placeholder-gray-500 transition-all"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={loading || !gameId || !joinCode}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600
                               rounded-xl font-bold transition-all duration-300
                               hover:from-blue-500 hover:to-indigo-500
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Joining...' : 'Join'}
                  </button>
                </div>
                <button
                  onClick={() => setMode('menu')}
                  className="mt-4 w-full text-center text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Back
                </button>
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm bg-red-900/20 border border-red-500/20 px-5 py-3 rounded-xl w-full text-center">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-14 text-center text-gray-500 text-xs space-y-1">
          <p>Gasless gameplay via Starkzap + Cartridge Controller</p>
          <p>Built on Starknet with Dojo</p>
        </div>
      </div>
    </div>
  );
}
