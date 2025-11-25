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
  buysUsed: number; // Number of buys used this round (max 3)
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

export type BuyMode = 'sequential' | 'simultaneous';

export interface GameSettings {
  buyMode: BuyMode; // How buy phase works
  buyTimeLimit: number; // Seconds for buy decision
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
  turnPhase: 'buy' | 'draw' | 'place' | 'discard'; // Current phase of the turn
  roundConfig: RoundConfig;
  dealersChoice?: 'books' | 'runs'; // For round 7 only
  settings: GameSettings;
  buyPhase?: {
    askedPlayerIndex: number; // Current player being asked (sequential mode)
    respondedPlayers: string[]; // Players who responded (simultaneous mode)
    buyerPlayerId?: string; // Player who bought the card
    startTime: number; // Timestamp when buy phase started
    nextPlayerHasPassed: boolean; // True when next player has declined - others can now buy
  };
  discardIsDead?: boolean; // True if discard was taken during buy phase (can't draw from discard)
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
  'lobby-disbanded': () => void;
  'game-starting': () => void;
  'game-started': (data: { gameState: GameState }) => void;
  'game-state': (data: { gameState: GameState }) => void;
  'turn-update': (data: { currentPlayerId: string; turnPhase: 'buy' | 'draw' | 'place' | 'discard' }) => void;
  'buy-phase-started': (data: { askingPlayerId?: string; timeLimit: number }) => void; // sequential: specific player, simultaneous: all at once
  'buy-request': (data: { playerId: string }) => void; // Someone wants to buy
  'buy-completed': (data: { playerId: string; card: Card; extraCards: number }) => void;
  'buy-declined': (data: { playerId: string }) => void;
  'buy-phase-ended': () => void;
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
  'start-game': (settings?: GameSettings) => void;
  'want-to-buy': () => void; // Player wants to buy the discard
  'decline-buy': () => void; // Player doesn't want to buy
  'draw-from-deck': () => void;
  'draw-from-discard': () => void;
  'place-contract': (data: { groups: Card[][] }) => void; // Place books/runs
  'add-to-meld': (data: { targetPlayerId: string; meldIndex: number; cardId: string }) => void; // Add card to existing meld
  'discard-card': (cardId: string) => void;
  'set-dealers-choice': (choice: 'books' | 'runs') => void; // Round 7 only
  'end-game-early': () => void; // Host can end game early
}
