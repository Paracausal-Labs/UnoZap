'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
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
      const result = await createGame(code);
      setCreatedCode(code);
      setCreatedGameId(result.gameId);
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
      {/* Vignette overlay */}
      <div className="absolute inset-0 bg-black/50" />
      <div className="absolute inset-0 pointer-events-none vignette" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12 w-full">
        {/* Logo */}
        <div className="animate-float mb-3">
          <Image
            src="/logo.png"
            alt="UnoZap"
            width={400}
            height={200}
            className="drop-shadow-2xl"
            style={{ imageRendering: 'auto' }}
            priority
          />
        </div>
        <p className="text-gray-300 mb-10 text-center text-lg tracking-widest uppercase font-medium">
          On-chain UNO powered by Starknet & Starkzap
        </p>

        {/* Connect Wallet */}
        {!address ? (
          <button
            onClick={connect}
            disabled={connecting}
            className="game-btn game-btn-purple"
          >
            <span className="relative z-10">
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </span>
          </button>
        ) : (
          <div className="flex flex-col items-center gap-5 w-full max-w-md">
            {/* Connected badge */}
            <div className="player-badge">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-sm text-gray-200">
                {address.slice(0, 6)}...{address.slice(-4)}
              </span>
            </div>

            {mode === 'menu' && (
              <div className="flex flex-col gap-4 w-full">
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="game-btn game-btn-gold w-full"
                >
                  <span className="relative z-10">
                    {loading ? 'Creating...' : 'Create Game'}
                  </span>
                </button>
                <button
                  onClick={() => setMode('join')}
                  className="game-btn game-btn-cyan w-full"
                >
                  <span className="relative z-10">Join Game</span>
                </button>
              </div>
            )}

            {mode === 'create' && createdCode && (
              <div className="game-panel w-full text-center">
                <h3 className="text-xl font-bold mb-3 text-white tracking-wide uppercase">
                  Game Created!
                </h3>
                <p className="text-gray-400 text-sm mb-4">Share this code with your opponent:</p>
                <div className="arcade-display">
                  {createdCode.split('').map((ch, i) => (
                    <span key={i} className="arcade-char">{ch}</span>
                  ))}
                </div>
                <p className="text-gray-500 text-sm mb-2 mt-4">
                  Game starts when your opponent joins
                </p>
                {createdGameId !== null && (
                  <>
                    <p className="text-gray-400 text-xs mb-4">
                      Game ID: {createdGameId}
                    </p>
                    <Link
                      href={`/game/${createdGameId}`}
                      className="game-btn game-btn-cyan inline-block"
                    >
                      <span className="relative z-10">Go to Game</span>
                    </Link>
                  </>
                )}
                {createdGameId === null && (
                  <p className="text-yellow-400/80 text-xs mb-4">
                    Waiting for game to appear on-chain...
                  </p>
                )}
                <div>
                  <button
                    onClick={() => setMode('menu')}
                    className="mt-5 text-gray-400 hover:text-white text-sm transition-colors"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}

            {mode === 'join' && (
              <div className="game-panel w-full">
                <h3 className="text-xl font-bold mb-5 text-center text-white tracking-wide uppercase">
                  Join Game
                </h3>
                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    placeholder="Game ID (number)"
                    value={gameId}
                    onChange={(e) => setGameId(e.target.value)}
                    className="game-input"
                  />
                  <input
                    type="text"
                    placeholder="Join Code (e.g. ABC123)"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="game-input font-mono text-center text-xl tracking-[0.3em]"
                  />
                  <button
                    onClick={handleJoin}
                    disabled={loading || !gameId || !joinCode}
                    className="game-btn game-btn-cyan w-full"
                  >
                    <span className="relative z-10">
                      {loading ? 'Joining...' : 'Join'}
                    </span>
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
              <div className="error-banner w-full">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-14 text-center text-gray-500 text-xs space-y-1 tracking-wider uppercase">
          <p>Gasless gameplay via Starkzap + Cartridge Controller</p>
          <p>Built on Starknet with Dojo</p>
        </div>
      </div>
    </div>
  );
}
