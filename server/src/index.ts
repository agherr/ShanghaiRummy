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
  socket.on('start-game', (settings) => {
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

    // Create game state with settings
    const playerIds = lobby.players.map(p => p.id);
    const playerNames = lobby.players.map(p => p.name);
    const gameState = gameManager.createGame(lobby.code, playerIds, playerNames, settings);
    
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
      
      // Broadcast initial buy phase (dealer flipped the first card)
      if (startedGame.buyPhase) {
        const firstPlayerIndex = (startedGame.dealerIndex + 1) % startedGame.players.length;
        const firstPlayer = startedGame.players[firstPlayerIndex];
        
        if (startedGame.settings.buyMode === 'sequential') {
          io.to(lobby.code).emit('buy-phase-started', {
            askingPlayerId: firstPlayer.id,
            timeLimit: startedGame.settings.buyTimeLimit
          });
        } else {
          io.to(lobby.code).emit('buy-phase-started', {
            timeLimit: startedGame.settings.buyTimeLimit
          });
        }
        
        io.to(lobby.code).emit('turn-update', {
          currentPlayerId: startedGame.currentPlayerId,
          turnPhase: startedGame.turnPhase
        });
      }
      
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

    // Check if in buy phase - next player can take for free
    if (game.turnPhase === 'buy') {
      const result = gameManager.takeDiscardCurrentPlayer(game.id, socket.id);
      if (!result) {
        socket.emit('error', 'Cannot take discard right now');
        return;
      }

      // Broadcast to all players
      lobby.players.forEach(player => {
        const playerView = gameManager.getPlayerView(result.game.id, player.id);
        if (playerView) {
          io.to(player.id).emit('game-state', { gameState: playerView });
        }
      });

      io.to(lobby.code).emit('buy-phase-ended');
      io.to(lobby.code).emit('card-drawn', { playerId: socket.id, fromDeck: false });
      io.to(lobby.code).emit('turn-update', {
        currentPlayerId: result.game.currentPlayerId,
        turnPhase: result.game.turnPhase
      });
    } else {
      // Normal draw phase
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
    }
  });

  // Want to buy the discard
  socket.on('want-to-buy', () => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.requestBuy(game.id, socket.id);
    if (!result || !result.success) {
      socket.emit('error', result?.error || 'Cannot buy');
      return;
    }

    // Notify everyone
    io.to(lobby.code).emit('buy-request', { playerId: socket.id });

    // If someone wants it in simultaneous mode or sequential and they're asked, complete the buy
    if (game.buyPhase?.buyerPlayerId === socket.id) {
      const buyResult = gameManager.completeBuy(game.id, socket.id);
      if (buyResult) {
        // Broadcast updated game state
        lobby.players.forEach(player => {
          const playerView = gameManager.getPlayerView(buyResult.game.id, player.id);
          if (playerView) {
            io.to(player.id).emit('game-state', { gameState: playerView });
          }
        });

        io.to(lobby.code).emit('buy-completed', { 
          playerId: socket.id, 
          card: buyResult.card,
          extraCards: 2
        });

        // End buy phase and move to next player
        const endResult = gameManager.endBuyPhase(game.id, null);
        if (endResult) {
          io.to(lobby.code).emit('buy-phase-ended');
          io.to(lobby.code).emit('turn-update', {
            currentPlayerId: endResult.game.currentPlayerId,
            turnPhase: endResult.game.turnPhase
          });
        }
      }
    }
  });

  // Decline to buy
  socket.on('decline-buy', () => {
    const lobby = lobbyManager.getLobbyByPlayerId(socket.id);
    if (!lobby) return;

    const game = gameManager.getGameByCode(lobby.code);
    if (!game) return;

    const result = gameManager.declineBuy(game.id, socket.id);
    if (!result) return;

    io.to(lobby.code).emit('buy-declined', { playerId: socket.id });

    // If sequential mode and we've gone around, end buy phase
    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    if (game.buyPhase && game.buyPhase.askedPlayerIndex === nextPlayerIndex) {
      const endResult = gameManager.endBuyPhase(game.id, null);
      if (endResult) {
        io.to(lobby.code).emit('buy-phase-ended');
        
        // Broadcast updated game state
        lobby.players.forEach(player => {
          const playerView = gameManager.getPlayerView(endResult.game.id, player.id);
          if (playerView) {
            io.to(player.id).emit('game-state', { gameState: playerView });
          }
        });

        io.to(lobby.code).emit('turn-update', {
          currentPlayerId: endResult.game.currentPlayerId,
          turnPhase: endResult.game.turnPhase
        });
      }
    } else if (game.settings.buyMode === 'sequential' && game.buyPhase) {
      // Ask next player - broadcast to everyone so they can see who's being asked
      const askingPlayer = game.players[game.buyPhase.askedPlayerIndex];
      
      // Broadcast updated game state first
      lobby.players.forEach(player => {
        const playerView = gameManager.getPlayerView(game.id, player.id);
        if (playerView) {
          io.to(player.id).emit('game-state', { gameState: playerView });
        }
      });
      
      io.to(lobby.code).emit('buy-phase-started', { 
        askingPlayerId: askingPlayer.id,
        timeLimit: game.settings.buyTimeLimit
      });
    }
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
      // Normal discard - start buy phase!
      io.to(lobby.code).emit('card-discarded', { playerId: socket.id, card: result.card });

      const buyGame = gameManager.startBuyPhase(result.game.id);
      if (buyGame) {
        // Broadcast updated game state
        lobby.players.forEach(player => {
          const playerView = gameManager.getPlayerView(buyGame.id, player.id);
          if (playerView) {
            io.to(player.id).emit('game-state', { gameState: playerView });
          }
        });

        const nextPlayerIndex = (buyGame.currentPlayerIndex + 1) % buyGame.players.length;
        const nextPlayer = buyGame.players[nextPlayerIndex];

        // Broadcast buy phase start to EVERYONE so all can see the UI
        if (buyGame.settings.buyMode === 'sequential') {
          // In sequential, show who's being asked
          io.to(lobby.code).emit('buy-phase-started', {
            askingPlayerId: nextPlayer.id,
            timeLimit: buyGame.settings.buyTimeLimit
          });
        } else {
          // Simultaneous - everyone can try
          io.to(lobby.code).emit('buy-phase-started', {
            timeLimit: buyGame.settings.buyTimeLimit
          });
        }

        io.to(lobby.code).emit('turn-update', {
          currentPlayerId: buyGame.currentPlayerId,
          turnPhase: buyGame.turnPhase
        });

        // Auto-end buy phase after timeout
        setTimeout(() => {
          const currentGame = gameManager.getGameByCode(lobby.code);
          if (currentGame && currentGame.turnPhase === 'buy') {
            // Check if anyone bought in simultaneous mode
            if (currentGame.settings.buyMode === 'simultaneous' && currentGame.buyPhase?.buyerPlayerId) {
              const buyerId = currentGame.buyPhase.buyerPlayerId;
              const buyResult = gameManager.completeBuy(currentGame.id, buyerId);
              if (buyResult) {
                lobby.players.forEach(player => {
                  const playerView = gameManager.getPlayerView(buyResult.game.id, player.id);
                  if (playerView) {
                    io.to(player.id).emit('game-state', { gameState: playerView });
                  }
                });
                io.to(lobby.code).emit('buy-completed', {
                  playerId: buyerId,
                  card: buyResult.card,
                  extraCards: 2
                });
              }
            }

            // End buy phase
            const endResult = gameManager.endBuyPhase(currentGame.id, null);
            if (endResult) {
              io.to(lobby.code).emit('buy-phase-ended');
              lobby.players.forEach(player => {
                const playerView = gameManager.getPlayerView(endResult.game.id, player.id);
                if (playerView) {
                  io.to(player.id).emit('game-state', { gameState: playerView });
                }
              });
              io.to(lobby.code).emit('turn-update', {
                currentPlayerId: endResult.game.currentPlayerId,
                turnPhase: endResult.game.turnPhase
              });
            }
          }
        }, buyGame.settings.buyTimeLimit * 1000);
      }
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

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for connections`);
});
