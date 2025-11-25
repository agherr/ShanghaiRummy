# Shanghai Rummy - Monorepo

A multiplayer Shanghai Rummy card game built with React, Socket.IO, and TypeScript in a pnpm monorepo structure.

## Project Structure

```
ShanghaiRummy/
├── client/              # React frontend (Vite)
├── server/              # Socket.IO backend (Express)
├── shared/              # Shared TypeScript types
├── pnpm-workspace.yaml  # Workspace configuration
└── package.json         # Root workspace scripts
```

## Prerequisites

- Node.js 18+
- pnpm 8+

## Getting Started

### 1. Install all dependencies

```bash
pnpm install
```

### 2. Run both client and server in development mode

```bash
pnpm dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 3. Run individually

```bash
# Run only the client
pnpm dev:client

# Run only the server
pnpm dev:server
```

## Available Scripts

### Root Level
- `pnpm dev` - Run both client and server concurrently
- `pnpm dev:client` - Run only the frontend
- `pnpm dev:server` - Run only the backend
- `pnpm build` - Build all packages
- `pnpm build:client` - Build only the client
- `pnpm build:server` - Build only the server
- `pnpm build:shared` - Build only shared types

### Client (Frontend)
- `cd client && pnpm dev` - Start Vite dev server
- `cd client && pnpm build` - Build for production
- `cd client && pnpm lint` - Run ESLint

### Server (Backend)
- `cd server && pnpm dev` - Start server with hot reload
- `cd server && pnpm build` - Compile TypeScript
- `cd server && pnpm start` - Run production build

## Environment Variables

### Client (.env in client/)
```
VITE_SOCKET_URL=http://localhost:3001
```

### Server (.env in server/)
```
PORT=3001
CLIENT_URL=http://localhost:5173
```

## Using Socket.IO in Your App

### Client Example

```typescript
import { useSocket } from './hooks/useSocket';

function App() {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Join a game
    socket.emit('join-game', 'game-123');

    // Listen for game updates
    socket.on('game-update', (state) => {
      console.log('Game state updated:', state);
    });

    return () => {
      socket.off('game-update');
    };
  }, [socket]);

  return <div>Connected: {isConnected ? 'Yes' : 'No'}</div>;
}
```

### Server Example

The server is already set up with basic event handlers in `server/src/index.ts`:
- `join-game` - Join a game room
- `game-action` - Emit game actions
- `disconnect` - Handle player disconnection

## Shared Types

All game types are defined in `shared/src/types.ts` and can be imported in both client and server:

```typescript
import type { GameState, Player, Card } from '@shanghairummy/shared';
```

## Tech Stack

- **Frontend**: React 19, Vite, TailwindCSS, TypeScript
- **Backend**: Node.js, Express, Socket.IO, TypeScript
- **Shared**: TypeScript types
- **Package Manager**: pnpm with workspaces

## Next Steps

1. ✅ Monorepo structure set up
2. ✅ Socket.IO connection established
3. ⬜ Implement game logic
4. ⬜ Create game UI components
5. ⬜ Add authentication
6. ⬜ Deploy to production

## Deployment

### Client
Deploy to Vercel, Netlify, or any static host:
```bash
cd client && pnpm build
# Upload the dist/ folder
```

### Server
Deploy to Railway, Render, or any Node.js host:
```bash
cd server && pnpm build
# Deploy with: node dist/index.js
```

## Troubleshooting

**Port already in use?**
Change ports in the respective `.env` files.

**Socket connection failing?**
Make sure both client and server are running and the `VITE_SOCKET_URL` matches your server URL.

**Types not working?**
Run `pnpm build:shared` to compile the shared package.
