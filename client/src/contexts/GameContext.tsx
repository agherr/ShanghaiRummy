import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameState, Card } from '@shanghairummy/shared';
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
  isBuyingPhase: boolean;
  isMyBuyTurn: boolean;
  canBuy: boolean;
  takeDiscard: () => void;
  passDiscard: () => void;
  buyCard: () => void;
  passBuy: () => void;
  drawFromDeck: () => void;
  placeContract: (groups: Card[][]) => void;
  discardCard: (cardId: string) => void;
  addToMeld: (targetPlayerId: string, meldIndex: number, cardId: string) => void;
  setDealersChoice: (choice: 'books' | 'runs') => void;
  endGameEarly: () => void;
  startGame: () => void;
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
  const canDraw = isMyTurn && gameState?.turnPhase === 'draw';
  const canPlace = isMyTurn && gameState?.turnPhase === 'place';
  const canDiscard = isMyTurn && (gameState?.turnPhase === 'place' || gameState?.turnPhase === 'discard');
  const isDealer = gameState?.dealerIndex === gameState?.players.findIndex(p => p.id === myPlayerId);
  const isBuyingPhase = gameState?.turnPhase === 'buying';
  const isMyBuyTurn = isBuyingPhase && gameState?.buyingPlayerId === myPlayerId;
  const canBuy = isMyBuyTurn && (myPlayer?.buysThisRound ?? 0) < 3;

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

    // Buy opportunity notification
    socket.on('buy-opportunity', ({ buyingPlayerId, canBuy }) => {
      console.log(`💰 Buy opportunity for ${buyingPlayerId} (canBuy: ${canBuy})`);
      const buyingPlayer = gameState?.players.find(p => p.id === buyingPlayerId);
      if (buyingPlayerId === myPlayerId) {
        if (canBuy) {
          toast(`Do you want to buy the discard?`, { icon: '💰', duration: 10000 });
        } else {
          toast(`You've already bought 3 times this round`, { icon: '🚫', duration: 3000 });
        }
      } else {
        toast(`${buyingPlayer?.name || 'Player'} is deciding whether to buy...`, { icon: '⏳', duration: 3000 });
      }
    });

    // Card bought notification
    socket.on('card-bought', ({ playerId, boughtCard }) => {
      const player = gameState?.players.find(p => p.id === playerId);
      toast.success(`${player?.name || 'Player'} bought the ${boughtCard.rank} of ${boughtCard.suit}!`);
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
      socket.off('buy-opportunity');
      socket.off('card-bought');
      socket.off('card-drawn');
      socket.off('card-discarded');
      socket.off('contract-placed');
      socket.off('card-added-to-meld');
      socket.off('round-ended');
      socket.off('next-round-starting');
      socket.off('game-ended');
      socket.off('error');
    };
  }, [socket, gameState, myPlayerId]);

  const startGame = () => {
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
    socket.emit('start-game');
  };

  const takeDiscard = () => {
    if (!socket || !canDraw || !gameState?.topDiscard) {
      console.error('Cannot take discard');
      return;
    }
    socket.emit('take-discard');
  };

  const passDiscard = () => {
    if (!socket || !canDraw) {
      console.error('Cannot pass discard');
      return;
    }
    socket.emit('pass-discard');
  };

  const buyCard = () => {
    if (!socket || !isMyBuyTurn || !canBuy) {
      console.error('Cannot buy card');
      return;
    }
    socket.emit('buy-card');
  };

  const passBuy = () => {
    if (!socket || !isMyBuyTurn) {
      console.error('Cannot pass buy');
      return;
    }
    socket.emit('pass-buy');
  };

  const drawFromDeck = () => {
    if (!socket || !canDraw) {
      console.error('Cannot draw from deck');
      return;
    }
    socket.emit('draw-from-deck');
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
        isBuyingPhase,
        isMyBuyTurn,
        canBuy,
        takeDiscard,
        passDiscard,
        buyCard,
        passBuy,
        drawFromDeck,
        placeContract,
        discardCard,
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
