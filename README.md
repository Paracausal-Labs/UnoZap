# UnoZap

On-chain UNO card game built on Starknet with gasless gameplay powered by [Starkzap](https://starkzap.io).

## Overview

UnoZap brings the classic UNO card game fully on-chain using Dojo ECS for game state and Starkzap's Cartridge Controller integration for seamless, gasless gameplay. No seed phrases, no gas popups — just connect and play.

### Features

- **4-player lobbies** with shareable join codes
- **Full UNO rules**: Skip, Reverse, Draw Two, Wild, Wild Draw Four
- **30-second turn timer** with auto-draw timeout enforcement
- **Gasless transactions** via Starkzap + Cartridge Controller
- **On-chain shuffle** using Fisher-Yates with Poseidon PRNG
- **Real-time state** via Torii indexer (GraphQL polling)
- **Pixel art cards** rendered at native resolution with crispy scaling

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Smart Contracts | Cairo (Dojo 1.7.2) |
| Indexer | Torii |
| Frontend | Next.js 16 + Tailwind CSS |
| Wallet & Gas | Starkzap SDK (Cartridge Controller) |
| Chain | Starknet Sepolia |

## Project Structure

```
UnoZap/
├── contracts/          # Dojo project (Cairo)
│   └── src/
│       ├── models/     # Game, PlayerState, DeckCard
│       └── systems/    # lobby (create/join), gameplay (play/draw/pass/timeout)
├── frontend/           # Next.js app
│   └── src/
│       ├── app/        # Lobby + Game pages
│       ├── components/ # UnoCard, GameBoard, ColorPicker
│       ├── hooks/      # useGame, useLobby
│       ├── lib/        # constants, Torii client
│       └── providers/  # Starkzap + Cartridge
├── cards/              # Card assets (32x32 pixel art PNGs)
└── README.md
```

## Quick Start

### Prerequisites

- [Dojo](https://book.dojoengine.org/getting-started) (1.7.2+)
- Node.js 20+
- npm

### Local Development

```bash
# 1. Build contracts
cd contracts
sozo build

# 2. Start Katana (terminal 1)
katana --dev --dev.no-fee

# 3. Deploy contracts (terminal 2)
sozo migrate

# 4. Start Torii (terminal 3)
torii --world <WORLD_ADDRESS> --http.cors_origins "*"

# 5. Start frontend (terminal 4)
cd ../frontend
npm install
cp .env.local.example .env.local  # Update contract addresses
npm run dev
```

### Environment Variables

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_LOBBY_CONTRACT=0x...
NEXT_PUBLIC_GAMEPLAY_CONTRACT=0x...
NEXT_PUBLIC_TORII_URL=http://localhost:8080
```

## Game Flow

1. **Connect** via Cartridge Controller (passkey login, 1 click)
2. **Create** a game and share the 6-character join code
3. **Join** with the code — game starts automatically when 4 players join
4. **Play** matching cards (by color or value), draw if stuck, wild cards let you pick a color
5. **Win** by emptying your hand first

## Starkzap Integration

UnoZap uses Starkzap SDK with the Cartridge Controller strategy for:

- **One-click wallet creation** (passkey/biometric auth)
- **Gasless transactions** (all game actions are auto-sponsored)
- **Session keys** (no popup per action)

```typescript
import { StarkSDK, OnboardStrategy } from 'starkzap';

const sdk = new StarkSDK({ network: 'sepolia' });
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
```

## Contract Architecture

### Models

- **Game** — game metadata, turn state, top card, shuffle seed
- **GameCounter** — auto-incrementing game IDs
- **PlayerState** — per-player state (address, card count, has_drawn)
- **DeckCard** — individual card tracking (color, value, location)

### Systems

- **lobby** — `create_game`, `join_game` (auto-starts with on-chain Fisher-Yates shuffle)
- **gameplay** — `play_card`, `draw_card`, `pass_turn`, `timeout_turn`

## Known Limitations

- Card hands are stored on-chain and visible via Torii (ZK card privacy planned)
- No deck reshuffle when draw pile is exhausted (108 cards, rarely reached)
- Turn timer uses block timestamps (30s on-chain, frontend shows visual countdown)

## License

MIT
