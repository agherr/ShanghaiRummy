import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState, Card, BuyMode } from '@shanghairummy/shared';
import { useSocket } from './SocketContext';
import { useLobby } from './LobbyContext';
import { useNavigation } from './NavigationContext';
import toast from 'react-hot-toast';

interface GameContextType {
  gameState: GameState | null;
  myHand: Card[];
  isMyTurn: boolean;
  canDraw: boolean;
  canPlace: boolean;
  canDiscard: boolean;
  isDealer: boolean;
  inBuyPhase: boolean;
  isMyBuyTurn: boolean; // Am I next to pick/buy?
  buysRemaining: number;
  drawFromDeck: () => void;
  drawFromDiscard: () => void;
  placeContract: (groups: Card[][]) => void;
  discardCard: (cardId: string) => void;
  wantToBuy: () => void;
  declineBuy: () => void;
  addToMeld: (targetPlayerId: string, meldIndex: number, cardId: string) => void;
  setDealersChoice: (choice: 'books' | 'runs') => void;
  endGameEarly: () => void;
  startGame: (settings?: { buyMode: BuyMode; buyTimeLimit: number }) => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const { socket } = useSocket();
  const { lobby } = useLobby();
  const { goToLoading, goToGame } = useNavigation();

  const myPlayerId = socket?.id;
  const myPlayer = gameState?.players.find(p => p.id === myPlayerId);
  const myHand = myPlayer?.hand || [];
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;
  const inBuyPhase = gameState?.turnPhase === 'buy';
  const nextPlayerIndex = gameState ? (gameState.currentPlayerIndex + 1) % gameState.players.length : -1;
  const isMyBuyTurn = gameState?.players[nextPlayerIndex]?.id === myPlayerId;
  const buysRemaining = myPlayer ? 3 - myPlayer.buysUsed : 0;
  const canDraw = isMyTurn && gameState?.turnPhase === 'draw';
  const canPlace = isMyTurn && gameState?.turnPhase === 'place';
  const canDiscard = isMyTurn && (gameState?.turnPhase === 'place' || gameState?.turnPhase === 'discard');
  const isDealer = gameState?.dealerIndex === gameState?.players.findIndex(p => p.id === myPlayerId);

  useEffect(() => {
    if (!socket) return;

    // Game starting notification
    socket.on('game-starting', () => {
      console.log('🎮 Game is starting...');
      toast.loading('Starting game...', { id: 'game-start' });
      goToLoading();
    });

    // Game started with initial state
    socket.on('game-started', ({ gameState: initialState }) => {
      console.log('🎮 Game started!', initialState);
      setGameState(initialState);
      toast.success('Game started!', { id: 'game-start' });
      goToGame();
    });

    // Game state updates
    socket.on('game-state', ({ gameState: updatedState }) => {
      console.log('🎮 Game state updated', updatedState);
      setGameState(updatedState);
    });

    // Turn updates
    socket.on('turn-update', ({ currentPlayerId, turnPhase }) => {
      console.log(`🎮 Turn: ${currentPlayerId}, Phase: ${turnPhase}`);
      setGameState(prev => {
        if (!prev) return null;
        return {
          ...prev,
          currentPlayerId,
          turnPhase
        };
      });
    });

    // Card drawn notification
    socket.on('card-drawn', ({ playerId, fromDeck }) => {
      console.log(`🎴 ${playerId} drew from ${fromDeck ? 'deck' : 'discard'}`);
    });

    // Card discarded notification
    socket.on('card-discarded', ({ playerId, card }) => {
      console.log(`🎴 ${playerId} discarded ${card.rank} of ${card.suit}`);
    });

    // Contract placed notification
    socket.on('contract-placed', ({ playerId }) => {
      const player = gameState?.players.find(p => p.id === playerId);
      toast.success(`${player?.name || 'Player'} placed their contract!`);
    });

    // Buy phase events
    socket.on('buy-phase-started', ({ askingPlayerId, timeLimit }) => {
      console.log(`🛒 Buy phase started, asking player ${askingPlayerId || 'all'}, time limit: ${timeLimit}s`);
    });

    socket.on('buy-request', ({ playerId }) => {
      const player = gameState?.players.find(p => p.id === playerId);
      toast(`${player?.name || 'Player'} wants to buy!`, { icon: '🛒' });
    });

    socket.on('buy-completed', ({ playerId, card, extraCards }) => {
      const player = gameState?.players.find(p => p.id === playerId);
      toast.success(`${player?.name || 'Player'} bought ${card.rank} of ${card.suit} (+${extraCards} from deck)`);
    });

    socket.on('buy-declined', ({ playerId }) => {
      console.log(`🛒 ${playerId} declined buy`);
    });

    socket.on('buy-phase-ended', () => {
      console.log('🛒 Buy phase ended');
    });

    socket.on('card-added-to-meld', ({ playerId, targetPlayerId }) => {
      const player = gameState?.players.find(p => p.id === playerId);
      const target = gameState?.players.find(p => p.id === targetPlayerId);
      toast(`${player?.name || 'Player'} added to ${target?.name || 'Player'}'s meld`, { icon: '🃏' });
    });

    // Round ended
    socket.on('round-ended', ({ winnerId, scores }) => {
      const winner = gameState?.players.find(p => p.id === winnerId);
      toast.success(`Round ended! ${winner?.name || 'Player'} won!`, { duration: 5000 });
      console.log('Round scores:', scores);
    });

    // Next round starting
    socket.on('next-round-starting', ({ round }) => {
      toast(`Starting Round ${round}`, { icon: '🎮', duration: 3000 });
    });

    // Game ended
    socket.on('game-ended', ({ finalScores }) => {
      console.log('Game ended! Final scores:', finalScores);
      toast.success('Game Over!', { duration: 5000 });
      // TODO: Navigate to results page
    });

    // Error handling
    socket.on('error', (message: string) => {
      console.error('Game error:', message);
      toast.error(message);
    });

    return () => {
      socket.off('game-starting');
      socket.off('game-started');
      socket.off('game-state');
      socket.off('turn-update');
      socket.off('card-drawn');
      socket.off('card-discarded');
      socket.off('contract-placed');
      socket.off('buy-phase-started');
      socket.off('buy-request');
      socket.off('buy-completed');
      socket.off('buy-declined');
      socket.off('buy-phase-ended');
      socket.off('card-added-to-meld');
      socket.off('round-ended');
      socket.off('next-round-starting');
      socket.off('game-ended');
      socket.off('error');
    };
  }, [socket, gameState]);

  const startGame = (settings?: { buyMode: BuyMode; buyTimeLimit: number }) => {
    if (!socket) {
      console.error('Socket not connected');
      toast.error('Not connected to server');
      return;
    }
    if (!lobby) {
      console.error('Not in a lobby');
      toast.error('Not in a lobby');
      return;
    }
    console.log('Starting game - Socket ID:', socket.id, 'Host ID:', lobby.hostId);
    // Remove the client-side host check since the server will validate
    socket.emit('start-game', settings || { buyMode: 'sequential', buyTimeLimit: 30 });
  };

  const drawFromDeck = () => {
    if (!socket || !canDraw) {
      console.error('Cannot draw from deck');
      return;
    }
    socket.emit('draw-from-deck');
  };

  const drawFromDiscard = () => {
    if (!socket || !canDraw || !gameState?.topDiscard) {
      console.error('Cannot draw from discard');
      return;
    }
    socket.emit('draw-from-discard');
  };

  const discardCard = (cardId: string) => {
    if (!socket || !canDiscard) {
      console.error('Cannot discard');
      return;
    }
    socket.emit('discard-card', cardId);
  };

  const placeContract = (groups: Card[][]) => {
    if (!socket || !canPlace) {
      console.error('Cannot place contract');
      toast.error('Cannot place contract right now');
      return;
    }
    socket.emit('place-contract', { groups });
  };

  const wantToBuy = () => {
    if (!socket) return;
    socket.emit('want-to-buy');
  };

  const declineBuy = () => {
    if (!socket) return;
    socket.emit('decline-buy');
  };

  const addToMeld = (targetPlayerId: string, meldIndex: number, cardId: string) => {
    if (!socket || !myPlayer?.hasPlacedContract) {
      toast.error('You must place your contract first');
      return;
    }
    socket.emit('add-to-meld', { targetPlayerId, meldIndex, cardId });
  };

  const setDealersChoice = (choice: 'books' | 'runs') => {
    if (!socket || !isDealer || gameState?.round !== 7) {
      console.error('Cannot set dealer\'s choice');
      return;
    }
    socket.emit('set-dealers-choice', choice);
    toast.success(`Dealer chose: ${choice === 'books' ? '4 Books' : '3 Runs'}`);
  };

  const endGameEarly = () => {
    if (!socket || !lobby || lobby.hostId !== socket.id) {
      console.error('Cannot end game - not host');
      toast.error('Only the host can end the game');
      return;
    }
    socket.emit('end-game-early');
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        myHand,
        isMyTurn,
        canDraw,
        canPlace,
        canDiscard,
        isDealer,
        inBuyPhase,
        isMyBuyTurn,
        buysRemaining,
        drawFromDeck,
        drawFromDiscard,
        placeContract,
        discardCard,
        wantToBuy,
        declineBuy,
        addToMeld,
        setDealersChoice,
        endGameEarly,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
