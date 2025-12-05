// Game types for Shanghai Rummy

export interface LobbyPlayer {
  id: string;
  name: string;
  isHost: boolean;
}

export interface Lobby {
  code: string;
  hostId: string;
  players: LobbyPlayer[];
  createdAt: string;
  maxPlayers: number;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  totalScore: number; // Running total across all rounds
  roundScore: number; // Points from current round
  cardCount: number; // Number of cards in hand (for other players)
  hasPlacedContract: boolean; // Whether player has fulfilled their contract this round
  placedCards: Card[][]; // Books and runs that have been placed
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'joker';
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'JOKER';
  point: number;
  id: string;
}

export type ContractType = 'book' | 'run';

export interface Contract {
  type: ContractType;
  count: number; // Number of books or runs required
}

export interface RoundConfig {
  roundNumber: number;
  cardsDealt: number;
  contracts: Contract[];
}

export interface GameState {
  id: string;
  gameCode: string;
  players: Player[];
  currentPlayerIndex: number;
  currentPlayerId: string;
  round: number;
  dealerIndex: number; // Rotates each round
  deckCount: number; // Cards remaining in deck
  topDiscard: Card | null; // Top card of discard pile
  discardPile: Card[]; // Full discard pile (for visibility)
  phase: 'starting' | 'playing' | 'round-end' | 'finished';
  turnPhase: 'draw' | 'place' | 'discard'; // Current phase of the turn
  roundConfig: RoundConfig;
  dealersChoice?: 'books' | 'runs'; // For round 7 only
}

export interface GameAction {
  type: 'draw-deck' | 'draw-discard' | 'discard';
  playerId: string;
  cardId?: string;
}

// Socket event types
export interface ServerToClientEvents {
  'lobby-created': (data: { lobby: Lobby }) => void;
  'lobby-joined': (data: { lobby: Lobby }) => void;
  'lobby-updated': (data: { lobby: Lobby }) => void;
  'player-joined-lobby': (data: { player: LobbyPlayer }) => void;
  'player-left-lobby': (data: { playerId: string }) => void;
  'player-kicked': (data: { reason: string }) => void;
  'player-name-changed': (data: { playerId: string; newName: string }) => void;
  'lobby-disbanded': () => void;
  'game-starting': () => void;
  'game-started': (data: { gameState: GameState }) => void;
  'game-state': (data: { gameState: GameState }) => void;
  'turn-update': (data: { currentPlayerId: string; turnPhase: 'draw' | 'place' | 'discard' }) => void;
  'card-drawn': (data: { playerId: string; fromDeck: boolean }) => void;
  'card-discarded': (data: { playerId: string; card: Card }) => void;
  'contract-placed': (data: { playerId: string; groups: Card[][] }) => void;
  'card-added-to-meld': (data: { playerId: string; targetPlayerId: string; meldIndex: number; card: Card }) => void;
  'round-ended': (data: { winnerId: string; scores: { playerId: string; roundScore: number; totalScore: number }[] }) => void;
  'next-round-starting': (data: { round: number; dealerIndex: number }) => void;
  'game-ended': (data: { finalScores: { playerId: string; name: string; totalScore: number; position: number }[] }) => void;
  'error': (message: string) => void;
}

// Round configurations for Shanghai Rummy
export const ROUND_CONFIGS: RoundConfig[] = [
  { roundNumber: 1, cardsDealt: 6, contracts: [{ type: 'book', count: 2 }] },
  { roundNumber: 2, cardsDealt: 7, contracts: [{ type: 'book', count: 1 }, { type: 'run', count: 1 }] },
  { roundNumber: 3, cardsDealt: 8, contracts: [{ type: 'run', count: 2 }] },
  { roundNumber: 4, cardsDealt: 9, contracts: [{ type: 'book', count: 3 }] },
  { roundNumber: 5, cardsDealt: 10, contracts: [{ type: 'book', count: 2 }, { type: 'run', count: 1 }] },
  { roundNumber: 6, cardsDealt: 11, contracts: [{ type: 'run', count: 2 }, { type: 'book', count: 1 }] },
  { roundNumber: 7, cardsDealt: 12, contracts: [] }, // Dealer's choice: 4 books OR 3 runs
];

export interface ClientToServerEvents {
  'create-lobby': (username?: string) => void;
  'join-lobby': (data: { code: string; username?: string }) => void;
  'leave-lobby': () => void;
  'kick-player': (playerId: string) => void;
  'disband-lobby': () => void;
  'change-name': (newName: string) => void;
  'start-game': () => void;
  'draw-from-deck': () => void;
  'draw-from-discard': () => void;
  'place-contract': (data: { groups: Card[][] }) => void; // Place books/runs
  'add-to-meld': (data: { targetPlayerId: string; meldIndex: number; cardId: string }) => void; // Add card to existing meld
  'discard-card': (cardId: string) => void;
  'set-dealers-choice': (choice: 'books' | 'runs') => void; // Round 7 only
  'end-game-early': () => void; // Host can end game early
}
