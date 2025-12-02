import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import type { ServerToClientEvents, ClientToServerEvents } from '@shanghairummy/shared';
import { lobbyManager } from './lobbyManager.js';
import { gameManager } from './gameManager.js';

const app = express();
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


// Socket.IO connection handling for lobby and game state
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  console.log('🔌 Transport:', socket.conn.transport.name);
  
  // Track transport upgrades
  socket.conn.on('upgrade', (transport) => {
    console.log('⬆️  Socket', socket.id, 'upgraded to:', transport.name);
  });

  // Create a new lobby
  socket.on('create-lobby', (username) => {
    console.log('📝 Creating lobby for:', socket.id, 'username:', username);
    const lobby = lobbyManager.createLobby(socket.id, username);
    socket.join(lobby.code);
    console.log('✅ Lobby created and joined:', lobby.code, 'Players:', lobby.players.map(p => p.id));
    socket.emit('lobby-created', { lobby });
  });

  // Join an existing lobby
  socket.on('join-lobby', ({ code, username }) => {
    const lobby = lobbyManager.joinLobby(code, socket.id, username);
    
    if (!lobby) {
      socket.emit('error', 'Lobby not found or full');
      return;
    }

    socket.join(code);
    socket.emit('lobby-joined', { lobby });
    
    // Notify others in the lobby
    const joiningPlayer = lobby.players.find(p => p.id === socket.id);
    if (joiningPlayer) {
      socket.to(code).emit('player-joined-lobby', { player: joiningPlayer });
    }
  });

  // Leave lobby
  socket.on('leave-lobby', () => {
    const result = lobbyManager.leaveLobby(socket.id);
    
    if (result.code) {
      socket.leave(result.code);
      
      if (result.wasHost) {
        // Notify everyone the lobby was disbanded
        io.to(result.code).emit('lobby-disbanded');
      } else if (result.lobby) {
        // Notify others about player leaving
        io.to(result.code).emit('player-left-lobby', { playerId: socket.id });
        io.to(result.code).emit('lobby-updated', { lobby: result.lobby });
      }
    }
  });

  // Kick player (host only)
  socket.on('kick-player', (playerIdToKick) => {
    const lobby = lobbyManager.kickPlayer(socket.id, playerIdToKick);
    
    if (!lobby) {
      socket.emit('error', 'Only host can kick players');
      return;
    }

    // Notify kicked player
    io.to(playerIdToKick).emit('player-kicked', { reason: 'Kicked by host' });
    
    // Update everyone else
    io.to(lobby.code).emit('player-left-lobby', { playerId: playerIdToKick });
    io.to(lobby.code).emit('lobby-updated', { lobby });
  });

  // Disband lobby (host only)
  socket.on('disband-lobby', () => {
    const code = lobbyManager.disbandLobby(socket.id);
    
    if (!code) {
      socket.emit('error', 'Only host can disband lobby');
      return;
    }

    io.to(code).emit('lobby-disbanded');
  });

  // Start game (host only)
  socket.on('start-game', () => {
    console.log('🎮 Start game requested by:', socket.id);
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    
    if (!lobby) {
      console.log('❌ Player not in lobby. Socket ID:', socket.id);
      socket.emit('error', 'Not in a lobby');
      return;
    }
    
    if (lobby.hostId !== socket.id) {
      console.log('❌ Not the host');
      socket.emit('error', 'Only host can start game');
      return;
    }

    if (lobby.players.length < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }

    // Notify players game is starting
    io.to(lobby.code).emit('game-starting');

    // Create game state
    const playerIds = lobby.players.map(p => p.id);
    const playerNames = lobby.players.map(p => p.name);
    const gameState = gameManager.createGame(lobby.code, playerIds, playerNames);
    
    // Start the game
    const startedGame = gameManager.startGame(gameState.id);
    
    if (startedGame) {
      // Send personalized game state to each player
      lobby.players.forEach(player => {
        const playerView = gameManager.getPlayerView(startedGame.id, player.id);
        if (playerView) {
          io.to(player.id).emit('game-started', { gameState: playerView });
        }
      });
      
      io.to(lobby.code).emit('turn-update', {
        currentPlayerId: startedGame.currentPlayerId,
        turnPhase: startedGame.turnPhase
      });
      
      console.log(`🎮 Game started for lobby ${lobby.code}`);
    }
  });

  // Draw from deck
  socket.on('draw-from-deck', () => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.drawFromDeck(game.id, socket.id);
    if (!result) {
      socket.emit('error', 'Cannot draw from deck right now');
      return;
    }

    // Broadcast to all players
    lobby.players.forEach(player => {
      const playerView = gameManager.getPlayerView(result.game.id, player.id);
      if (playerView) {
        io.to(player.id).emit('game-state', { gameState: playerView });
      }
    });

    io.to(lobby.code).emit('card-drawn', { playerId: socket.id, fromDeck: true });
    io.to(lobby.code).emit('turn-update', { 
      currentPlayerId: result.game.currentPlayerId, 
      turnPhase: result.game.turnPhase 
    });
  });

  // Draw from discard
  socket.on('draw-from-discard', () => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.drawFromDiscard(game.id, socket.id);
    if (!result) {
      socket.emit('error', 'Cannot draw from discard right now');
      return;
    }

    // Broadcast to all players
    lobby.players.forEach(player => {
      const playerView = gameManager.getPlayerView(result.game.id, player.id);
      if (playerView) {
        io.to(player.id).emit('game-state', { gameState: playerView });
      }
    });

    io.to(lobby.code).emit('card-drawn', { playerId: socket.id, fromDeck: false });
    io.to(lobby.code).emit('turn-update', {
      currentPlayerId: result.game.currentPlayerId,
      turnPhase: result.game.turnPhase
    });
  });

  // Add card to existing meld
  socket.on('add-to-meld', (data) => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.addToMeld(game.id, socket.id, data.targetPlayerId, data.meldIndex, data.cardId);
    if (!result || !result.success) {
      socket.emit('error', result?.error || 'Cannot add to meld');
      return;
    }

    // Broadcast to all players
    lobby.players.forEach(player => {
      const playerView = gameManager.getPlayerView(result.game.id, player.id);
      if (playerView) {
        io.to(player.id).emit('game-state', { gameState: playerView });
      }
    });

    const card = game.players.find(p => p.id === socket.id)?.hand.find(c => c.id === data.cardId);
    if (card) {
      io.to(lobby.code).emit('card-added-to-meld', {
        playerId: socket.id,
        targetPlayerId: data.targetPlayerId,
        meldIndex: data.meldIndex,
        card
      });
    }
  });

  // Place contract (books and runs)
  socket.on('place-contract', (data) => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.placeContract(game.id, socket.id, data.groups);
    if (!result || !result.success) {
      socket.emit('error', result?.error || 'Cannot place contract');
      return;
    }

    // Broadcast to all players
    lobby.players.forEach(player => {
      const playerView = gameManager.getPlayerView(result.game.id, player.id);
      if (playerView) {
        io.to(player.id).emit('game-state', { gameState: playerView });
      }
    });

    io.to(lobby.code).emit('contract-placed', { playerId: socket.id, groups: data.groups });
  });

  // Discard card
  socket.on('discard-card', (cardId: string) => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.discardCard(game.id, socket.id, cardId);
    if (!result) {
      socket.emit('error', 'Cannot discard that card right now');
      return;
    }

    // Check if round ended
    if (result.game.phase === 'round-end') {
      const scores = result.game.players.map((p: any) => ({
        playerId: p.id,
        roundScore: p.roundScore,
        totalScore: p.totalScore
      }));
      io.to(lobby.code).emit('round-ended', { winnerId: socket.id, scores });
      
      // Auto-start next round after delay
      setTimeout(() => {
        const nextGame = gameManager.nextRound(result.game.id);
        if (nextGame) {
          if (nextGame.phase === 'finished') {
            // Game over
            const finalScores = nextGame.players
              .map((p: any, idx: number) => ({ playerId: p.id, name: p.name, totalScore: p.totalScore, position: idx + 1 }))
              .sort((a: any, b: any) => a.totalScore - b.totalScore)
              .map((p: any, idx: number) => ({ ...p, position: idx + 1 }));
            
            io.to(lobby.code).emit('game-ended', { finalScores });
          } else {
            // Next round
            io.to(lobby.code).emit('next-round-starting', { 
              round: nextGame.round, 
              dealerIndex: nextGame.dealerIndex 
            });
            
            lobby.players.forEach(player => {
              const playerView = gameManager.getPlayerView(nextGame.id, player.id);
              if (playerView) {
                io.to(player.id).emit('game-state', { gameState: playerView });
              }
            });
          }
        }
      }, 3000); // 3 second delay
    } else {
      // Normal discard - move to next player
      io.to(lobby.code).emit('card-discarded', { playerId: socket.id, card: result.card });

      // Broadcast updated game state
      lobby.players.forEach(player => {
        const playerView = gameManager.getPlayerView(result.game.id, player.id);
        if (playerView) {
          io.to(player.id).emit('game-state', { gameState: playerView });
        }
      });

      io.to(lobby.code).emit('turn-update', {
        currentPlayerId: result.game.currentPlayerId,
        turnPhase: result.game.turnPhase
      });
    }
  });

  // Set dealer's choice (round 7 only)
  socket.on('set-dealers-choice', (choice: 'books' | 'runs') => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const dealer = game.players[game.dealerIndex];
    if (dealer.id !== socket.id) {
      socket.emit('error', 'Only the dealer can make this choice');
      return;
    }

    gameManager.setDealersChoice(game.id, choice);
    io.to(lobby.code).emit('game-state', { gameState: game });
  });

  // End game early (host only)
  socket.on('end-game-early', () => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby || lobby.hostId !== socket.id) {
      socket.emit('error', 'Only the host can end the game early');
      return;
    }

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const endedGame = gameManager.endGameEarly(game.id);
    if (endedGame) {
      const finalScores = endedGame.players
        .map((p: any, idx: number) => ({ playerId: p.id, name: p.name, totalScore: p.totalScore, position: idx + 1 }))
        .sort((a: any, b: any) => a.totalScore - b.totalScore)
        .map((p: any, idx: number) => ({ ...p, position: idx + 1 }));
      
      io.to(lobby.code).emit('game-ended', { finalScores });
    }
  });

  // Handle disconnection - auto-leave lobby
  socket.on('disconnect', (reason) => {
    console.log('🔌 Client disconnected:', socket.id, 'Reason:', reason);
    
    const result = lobbyManager.leaveLobby(socket.id);
    if (result.code && result.lobby) {
      io.to(result.code).emit('player-left-lobby', { playerId: socket.id });
      io.to(result.code).emit('lobby-updated', { lobby: result.lobby });
    } else if (result.code && result.wasHost) {
      io.to(result.code).emit('lobby-disbanded');
    }
  });
  
  // Log all events for debugging
  socket.onAny((eventName, ...args) => {
    console.log(`📨 Event received: ${eventName} from socket ${socket.id}`);
  });
});

const PORT = Number(process.env.PORT) || 3001;
const HOST = '0.0.0.0';

httpServer.listen(PORT, HOST, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
  console.log(`📍 Client URL: ${process.env.CLIENT_URL || 'not set'}`);
});
