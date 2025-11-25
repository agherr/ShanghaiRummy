import type { GameState, Card, Player, RoundConfig } from '@shanghairummy/shared';
import { ROUND_CONFIGS as ROUNDS } from '@shanghairummy/shared';

// Card point values
const CARD_POINTS: Record<string, number> = {
  '2': 5, '3': 5, '4': 5, '5': 5, '6': 5, '7': 5, '8': 5, '9': 5, '10': 5,
  'J': 10, 'Q': 10, 'K': 10,
  'A': 15,
  'JOKER': 50
};

// Rank order for runs (Ace can be low or high)
const RANK_ORDER = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const RANK_VALUES: Record<string, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
};

class GameManager {
  private games: Map<string, GameState> = new Map();
  private decks: Map<string, Card[]> = new Map(); // Remaining cards in deck

  // Create a full deck of 108 cards (2 standard decks + 4 jokers)
  createDeck(): Card[] {
    const suits: Array<'hearts' | 'diamonds' | 'clubs' | 'spades'> = ['hearts', 'diamonds', 'clubs', 'spades'];
    const ranks: Array<'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'> = 
      ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    const cards: Card[] = [];
    let cardId = 0;

    // Create 2 standard decks
    for (let deckNum = 0; deckNum < 2; deckNum++) {
      for (const suit of suits) {
        for (const rank of ranks) {
          cards.push({
            suit,
            rank,
            point: CARD_POINTS[rank],
            id: `card-${cardId++}`
          });
        }
      }
    }

    // Add 4 jokers
    for (let i = 0; i < 4; i++) {
      cards.push({
        suit: 'joker',
        rank: 'JOKER',
        point: CARD_POINTS['JOKER'],
        id: `card-${cardId++}`
      });
    }

    return cards;
  }

  // Shuffle an array
  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Create a new game
  createGame(gameCode: string, playerIds: string[], playerNames: string[], settings?: any): GameState {
    const roundConfig = ROUNDS[0]; // Start with round 1
    
    const players: Player[] = playerIds.map((id, index) => ({
      id,
      name: playerNames[index],
      hand: [],
      totalScore: 0,
      roundScore: 0,
      cardCount: 0,
      hasPlacedContract: false,
      placedCards: [],
      buysUsed: 0
    }));

    const game: GameState = {
      id: `game-${Date.now()}`,
      gameCode,
      players,
      currentPlayerIndex: 0,
      currentPlayerId: playerIds[0],
      round: 1,
      dealerIndex: 0,
      deckCount: 0,
      topDiscard: null,
      discardPile: [],
      phase: 'starting',
      turnPhase: 'draw',
      roundConfig,
      dealersChoice: undefined,
      settings: settings || { buyMode: 'sequential', buyTimeLimit: 10 },
      buyPhase: undefined
    };

    this.games.set(game.id, game);
    return game;
  }

  // Start a new round (or first round)
  startGame(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    return this.startRound(gameId);
  }

  // Start a specific round
  startRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    const roundConfig = ROUNDS[game.round - 1];
    game.roundConfig = roundConfig;

    // Create and shuffle deck
    let deck = this.createDeck();
    deck = this.shuffle(deck);

    // Deal cards to players
    const cardsPerPlayer = roundConfig.cardsDealt;
    game.players.forEach(player => {
      player.hand = deck.splice(0, cardsPerPlayer);
      player.cardCount = cardsPerPlayer;
      player.hasPlacedContract = false;
      player.placedCards = [];
      player.roundScore = 0;
      player.buysUsed = 0;
    });

    // Flip top card to discard pile (dealer's action)
    const topCard = deck.shift();
    if (topCard) {
      game.topDiscard = topCard;
      game.discardPile = [topCard];
    }

    // Store remaining deck
    this.decks.set(gameId, deck);
    game.deckCount = deck.length;

    // Dealer "discards" the flipped card, so current player is still dealer
    // This will trigger buy phase for the first player (after dealer)
    game.currentPlayerIndex = game.dealerIndex;
    game.currentPlayerId = game.players[game.dealerIndex].id;
    game.phase = 'playing';
    game.turnPhase = 'buy'; // Start with buy phase!
    game.discardIsDead = false; // Not dead yet - no one has bought it
    
    // Initialize buy phase for first player
    const firstPlayerIndex = (game.dealerIndex + 1) % game.players.length;
    game.buyPhase = {
      askedPlayerIndex: firstPlayerIndex,
      respondedPlayers: [],
      startTime: Date.now(),
      nextPlayerHasPassed: false // First player must decide
    };
    game.discardIsDead = false;

    console.log(`🎮 Round ${game.round} started. Dealer: ${game.players[game.dealerIndex].name} flipped ${topCard?.rank} of ${topCard?.suit}. Buy phase for: ${game.players[firstPlayerIndex].name}`);

    return game;
  }

  // Draw from deck
  drawFromDeck(gameId: string, playerId: string): { game: GameState; card: Card } | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'playing' || game.turnPhase !== 'draw') return null;
    if (game.currentPlayerId !== playerId) return null;

    const deck = this.decks.get(gameId);
    if (!deck || deck.length === 0) return null;

    const card = deck.shift()!;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    player.hand.push(card);
    player.cardCount = player.hand.length;
    game.deckCount = deck.length;
    game.turnPhase = 'place'; // Move to place phase
    game.discardIsDead = false; // Clear flag - they've moved past it

    return { game, card };
  }

  // Draw from discard pile
  drawFromDiscard(gameId: string, playerId: string): { game: GameState; card: Card } | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'playing' || game.turnPhase !== 'draw') return null;
    if (game.currentPlayerId !== playerId) return null;
    
    // Check if discard is dead (was taken during buy phase)
    if (game.discardIsDead) {
      console.log(`❌ ${game.players.find(p => p.id === playerId)?.name} cannot draw from discard - it's a dead card`);
      return null;
    }
    
    if (!game.topDiscard) return null;

    const card = game.topDiscard;
    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    player.hand.push(card);
    player.cardCount = player.hand.length;

    // Remove from discard pile
    game.discardPile.pop();
    game.topDiscard = game.discardPile[game.discardPile.length - 1] || null;

    game.turnPhase = 'place'; // Move to place phase
    game.discardIsDead = false; // Clear flag - they took it

    return { game, card };
  }

  // Validate if a group is a valid book (3+ cards of same rank)
  isValidBook(cards: Card[]): boolean {
    if (cards.length < 3) return false;

    // Get non-joker cards
    const nonJokers = cards.filter(c => c.rank !== 'JOKER');
    if (nonJokers.length === 0) return false; // Can't have all jokers

    // All non-joker cards must have the same rank
    const rank = nonJokers[0].rank;
    return nonJokers.every(c => c.rank === rank);
  }

  // Validate if a group is a valid run (4+ cards in sequence, same suit)
  isValidRun(cards: Card[]): boolean {
    if (cards.length < 4) return false;

    // Get non-joker cards
    const nonJokers = cards.filter(c => c.rank !== 'JOKER');
    if (nonJokers.length === 0) return false; // Can't have all jokers

    // All non-joker cards must be same suit
    const suit = nonJokers[0].suit;
    if (!nonJokers.every(c => c.suit === suit)) return false;

    // Sort by rank value
    const sortedCards = [...cards].sort((a, b) => {
      if (a.rank === 'JOKER') return 0; // Jokers handled separately
      if (b.rank === 'JOKER') return 0;
      return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
    });

    // Check if cards form a sequence (accounting for jokers as wildcards)
    let expectedValue = RANK_VALUES[sortedCards[0].rank];
    const jokerCount = cards.filter(c => c.rank === 'JOKER').length;
    let jokersUsed = 0;

    for (let i = 1; i < sortedCards.length; i++) {
      const card = sortedCards[i];
      if (card.rank === 'JOKER') {
        jokersUsed++;
        expectedValue++;
        continue;
      }

      const cardValue = RANK_VALUES[card.rank];
      const gap = cardValue - expectedValue;

      if (gap === 1) {
        expectedValue = cardValue;
      } else if (gap > 1 && jokersUsed < jokerCount) {
        // Use jokers to fill gaps
        const jokersNeeded = gap - 1;
        if (jokersUsed + jokersNeeded <= jokerCount) {
          jokersUsed += jokersNeeded;
          expectedValue = cardValue;
        } else {
          return false;
        }
      } else if (gap !== 1) {
        return false;
      }

      expectedValue++;
    }

    return true;
  }

  // Place contract (books and runs)
  placeContract(gameId: string, playerId: string, groups: Card[][]): { game: GameState; success: boolean; error?: string } | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'playing' || game.turnPhase !== 'place') {
      return { game: game!, success: false, error: 'Not in place phase' };
    }
    if (game.currentPlayerId !== playerId) {
      return { game, success: false, error: 'Not your turn' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    if (player.hasPlacedContract) {
      return { game, success: false, error: 'Already placed contract this round' };
    }

    // Validate each group
    const books: Card[][] = [];
    const runs: Card[][] = [];

    for (const group of groups) {
      if (this.isValidBook(group)) {
        books.push(group);
      } else if (this.isValidRun(group)) {
        runs.push(group);
      } else {
        return { game, success: false, error: 'Invalid book or run' };
      }
    }

    // Check if contract requirements are met
    const requiredBooks = game.roundConfig.contracts.filter(c => c.type === 'book').reduce((sum, c) => sum + c.count, 0);
    const requiredRuns = game.roundConfig.contracts.filter(c => c.type === 'run').reduce((sum, c) => sum + c.count, 0);

    // Handle round 7 dealer's choice
    if (game.round === 7) {
      const isValidChoice = 
        (game.dealersChoice === 'books' && books.length === 4 && runs.length === 0) ||
        (game.dealersChoice === 'runs' && runs.length === 3 && books.length === 0);

      if (!isValidChoice) {
        return { game, success: false, error: `Must place ${game.dealersChoice === 'books' ? '4 books' : '3 runs'}` };
      }
    } else {
      if (books.length !== requiredBooks || runs.length !== requiredRuns) {
        return { game, success: false, error: `Must place ${requiredBooks} books and ${requiredRuns} runs` };
      }
    }

    // Remove placed cards from hand
    const placedCardIds = new Set(groups.flat().map(c => c.id));
    player.hand = player.hand.filter(c => !placedCardIds.has(c.id));
    player.cardCount = player.hand.length;
    player.hasPlacedContract = true;
    player.placedCards = groups;

    console.log(`✅ ${player.name} placed contract:`, { books: books.length, runs: runs.length });

    return { game, success: true };
  }

  // Discard a card
  discardCard(gameId: string, playerId: string, cardId: string): { game: GameState; card: Card } | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'playing') return null;
    if (game.currentPlayerId !== playerId) return null;
    if (game.turnPhase !== 'place' && game.turnPhase !== 'discard') return null;

    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    const cardIndex = player.hand.findIndex(c => c.id === cardId);
    if (cardIndex === -1) return null;

    const card = player.hand.splice(cardIndex, 1)[0];
    player.cardCount = player.hand.length;

    // Add to discard pile
    game.discardPile.push(card);
    game.topDiscard = card;

    // Check if player won the round (no cards left)
    if (player.hand.length === 0) {
      this.endRound(gameId, playerId);
    } else {
      // Move to next player
      game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      game.currentPlayerId = game.players[game.currentPlayerIndex].id;
      game.turnPhase = 'draw';
    }

    return { game, card };
  }

  // Calculate points for remaining cards in hand
  calculateHandPoints(hand: Card[]): number {
    return hand.reduce((sum, card) => sum + card.point, 0);
  }

  // End the current round
  endRound(gameId: string, winnerId: string): void {
    const game = this.games.get(gameId);
    if (!game) return;

    // Calculate scores for all players
    game.players.forEach(player => {
      player.roundScore = this.calculateHandPoints(player.hand);
      player.totalScore += player.roundScore;
    });

    console.log(`🏁 Round ${game.round} ended. Winner: ${winnerId}`);
    game.players.forEach(p => {
      console.log(`  ${p.name}: +${p.roundScore} points (total: ${p.totalScore})`);
    });

    game.phase = 'round-end';
  }

  // Start next round
  nextRound(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'round-end') return null;

    if (game.round >= 7) {
      // Game over
      game.phase = 'finished';
      return game;
    }

    // Move to next round
    game.round++;
    game.dealerIndex = (game.dealerIndex + 1) % game.players.length;
    game.dealersChoice = undefined;

    return this.startRound(gameId);
  }

  // End game early (host only)
  endGameEarly(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    game.phase = 'finished';
    console.log('🏁 Game ended early by host');

    return game;
  }

  // Set dealer's choice for round 7
  setDealersChoice(gameId: string, choice: 'books' | 'runs'): GameState | null {
    const game = this.games.get(gameId);
    if (!game || game.round !== 7) return null;

    game.dealersChoice = choice;
    console.log(`🎲 Dealer chose: ${choice}`);

    return game;
  }

  // Get game by code
  getGameByCode(gameCode: string): GameState | undefined {
    return Array.from(this.games.values()).find(g => g.gameCode === gameCode);
  }

  // Get player-specific view (hide other players' hands)
  getPlayerView(gameId: string, playerId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    // Create a copy with hidden hands for other players
    const playerView: GameState = {
      ...game,
      players: game.players.map(p => ({
        ...p,
        hand: p.id === playerId ? p.hand : [] // Hide other players' hands
      }))
    };

    return playerView;
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  // Start buy phase after a card is discarded
  startBuyPhase(gameId: string): GameState | null {
    const game = this.games.get(gameId);
    if (!game || !game.topDiscard) return null;

    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    
    game.turnPhase = 'buy';
    game.buyPhase = {
      askedPlayerIndex: nextPlayerIndex,
      respondedPlayers: [],
      startTime: Date.now(),
      nextPlayerHasPassed: false // Next player must decide first
    };
    game.discardIsDead = false; // Not dead yet, will be set if someone takes it

    console.log(`💰 Buy phase started. Next player (${game.players[nextPlayerIndex].name}) gets first dibs`);
    return game;
  }

  // Current player takes discard (free, no buy used)
  takeDiscardCurrentPlayer(gameId: string, playerId: string): { game: GameState; card: Card } | null {
    const game = this.games.get(gameId);
    if (!game || game.turnPhase !== 'buy') return null;
    
    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    const nextPlayer = game.players[nextPlayerIndex];
    
    if (nextPlayer.id !== playerId) return null;
    if (!game.topDiscard) return null;

    const card = game.topDiscard;
    nextPlayer.hand.push(card);
    nextPlayer.cardCount = nextPlayer.hand.length;

    // Remove from discard pile
    game.discardPile.pop();
    game.topDiscard = game.discardPile[game.discardPile.length - 1] || null;

    // Move to their turn - skip draw phase since they already took the discard
    game.currentPlayerIndex = nextPlayerIndex;
    game.currentPlayerId = nextPlayer.id;
    game.turnPhase = 'place'; // Skip draw, go straight to place/discard
    game.buyPhase = undefined;
    game.discardIsDead = false; // Clear flag - they took it for free

    console.log(`✅ ${nextPlayer.name} took discard (free), skipping draw phase`);
    return { game, card };
  }

  // Player wants to buy the discard
  requestBuy(gameId: string, playerId: string): { game: GameState; success: boolean; error?: string } | null {
    const game = this.games.get(gameId);
    if (!game || game.turnPhase !== 'buy' || !game.buyPhase) {
      return { game: game!, success: false, error: 'Not in buy phase' };
    }

    const player = game.players.find(p => p.id === playerId);
    if (!player) return null;

    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    const playerIndex = game.players.findIndex(p => p.id === playerId);

    // FIRST DIBS: Next player must decide first before others can buy
    if (!game.buyPhase.nextPlayerHasPassed && playerIndex !== nextPlayerIndex) {
      return { game, success: false, error: 'Waiting for next player to decide first' };
    }

    // Check if player has buys left
    if (player.buysUsed >= 3) {
      return { game, success: false, error: 'No buys remaining (max 3 per round)' };
    }

    // Check if too many cards already
    if (player.hand.length >= 18) { // 6-12 dealt + max 9 from buys
      return { game, success: false, error: 'Too many cards (max 18)' };
    }

    // If simultaneous mode, add to responded players
    if (game.settings.buyMode === 'simultaneous') {
      if (!game.buyPhase.respondedPlayers.includes(playerId)) {
        game.buyPhase.respondedPlayers.push(playerId);
        game.buyPhase.buyerPlayerId = playerId; // First one wins
        console.log(`💰 ${player.name} wants to buy (simultaneous - first!)`);
      }
      return { game, success: true };
    }

    // Sequential mode - check if it's their turn to be asked
    if (game.buyPhase.askedPlayerIndex !== playerIndex) {
      return { game, success: false, error: 'Not your turn to buy yet' };
    }

    // They want it - give them the card!
    game.buyPhase.buyerPlayerId = playerId;
    console.log(`💰 ${player.name} wants to buy`);
    return { game, success: true };
  }

  // Player declines to buy
  declineBuy(gameId: string, playerId: string): { game: GameState; success: boolean } | null {
    const game = this.games.get(gameId);
    if (!game || game.turnPhase !== 'buy' || !game.buyPhase) return null;

    const playerIndex = game.players.findIndex(p => p.id === playerId);
    if (playerIndex === -1) return null;

    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

    // Mark that next player has passed (opens up buying for others)
    if (playerIndex === nextPlayerIndex) {
      game.buyPhase.nextPlayerHasPassed = true;
      console.log(`✅ Next player passed - others can now buy`);
    }

    if (game.settings.buyMode === 'sequential') {
      // Move to next player to ask
      let nextAskIndex = (game.buyPhase.askedPlayerIndex + 1) % game.players.length;

      // Skip the current player - they shouldn't be asked (it's their upcoming turn)
      if (nextAskIndex === game.currentPlayerIndex) {
        nextAskIndex = (nextAskIndex + 1) % game.players.length;
      }

      // Check if we've completed the loop:
      // If we've asked the next player (first dibs) AND we're back to them, we're done
      if (game.buyPhase.nextPlayerHasPassed && nextAskIndex === nextPlayerIndex) {
        console.log(`🔄 Everyone has been asked, ending buy phase (no one bought)`);
        return this.endBuyPhase(gameId, null);
      }

      game.buyPhase.askedPlayerIndex = nextAskIndex;
      console.log(`➡️  Buy passed to player index ${nextAskIndex} (${game.players[nextAskIndex].name})`);
    } else {
      // Simultaneous mode - just track they responded
      if (!game.buyPhase.respondedPlayers.includes(playerId)) {
        game.buyPhase.respondedPlayers.push(playerId);
      }
    }

    return { game, success: true };
  }

  // Complete the buy and give cards to buyer
  completeBuy(gameId: string, buyerPlayerId: string): { game: GameState; card: Card; extraCards: Card[] } | null {
    const game = this.games.get(gameId);
    if (!game || !game.topDiscard) return null;

    const buyer = game.players.find(p => p.id === buyerPlayerId);
    if (!buyer) return null;

    const deck = this.decks.get(gameId);
    if (!deck || deck.length < 2) return null;

    // Give them the discard
    const discardCard = game.topDiscard;
    buyer.hand.push(discardCard);

    // Give them 2 cards from deck
    const extraCards = [deck.shift()!, deck.shift()!];
    buyer.hand.push(...extraCards);
    buyer.cardCount = buyer.hand.length;
    buyer.buysUsed++;

    // Remove discard from pile - this makes it a "dead card" for next player
    game.discardPile.pop();
    game.topDiscard = game.discardPile[game.discardPile.length - 1] || null;

    game.deckCount = deck.length;
    game.discardIsDead = true; // Mark as dead - next player can't draw it

    console.log(`✅ ${buyer.name} bought card (${buyer.buysUsed}/3 buys used, ${buyer.hand.length} cards), discard is now dead`);

    return { game, card: discardCard, extraCards };
  }

  // End buy phase (no one bought or timer expired)
  endBuyPhase(gameId: string, buyerPlayerId: string | null): { game: GameState; success: boolean } | null {
    const game = this.games.get(gameId);
    if (!game) return null;

    if (buyerPlayerId) {
      // Someone bought - complete it first (this sets discardIsDead = true)
      const result = this.completeBuy(gameId, buyerPlayerId);
      if (!result) return null;
    }
    // If no one bought, discardIsDead stays false - next player can take it as "second chance"

    // Move to next player's turn
    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.currentPlayerIndex = nextPlayerIndex;
    game.currentPlayerId = game.players[nextPlayerIndex].id;
    
    // Next player goes to draw phase
    // If someone bought (discardIsDead = true), they must draw from deck
    // If no one bought (discardIsDead = false), they can draw from discard as "second chance"
    game.turnPhase = 'draw';
    game.buyPhase = undefined;

    console.log(`🎮 Buy phase ended. ${game.players[nextPlayerIndex].name}'s turn (draw phase)`);
    return { game, success: true };
  }

  // Add a card to an existing meld (book or run)
  addToMeld(gameId: string, playerId: string, targetPlayerId: string, meldIndex: number, cardId: string): { game: GameState; success: boolean; error?: string } | null {
    const game = this.games.get(gameId);
    if (!game || game.phase !== 'playing') {
      return { game: game!, success: false, error: 'Game not in playing phase' };
    }

    const player = game.players.find(p => p.id === playerId);
    const targetPlayer = game.players.find(p => p.id === targetPlayerId);
    
    if (!player || !targetPlayer) return null;

    // Player must have placed their contract
    if (!player.hasPlacedContract) {
      return { game, success: false, error: 'You must place your contract first' };
    }

    // Target must have placed cards
    if (!targetPlayer.hasPlacedContract || targetPlayer.placedCards.length <= meldIndex) {
      return { game, success: false, error: 'Invalid meld' };
    }

    const card = player.hand.find(c => c.id === cardId);
    if (!card) {
      return { game, success: false, error: 'Card not in hand' };
    }

    const meld = targetPlayer.placedCards[meldIndex];
    const testMeld = [...meld, card];

    // Check if adding this card keeps it valid
    const isBook = this.isValidBook(meld);
    const isRun = this.isValidRun(meld);

    let valid = false;
    if (isBook) {
      valid = this.isValidBook(testMeld);
    } else if (isRun) {
      valid = this.isValidRun(testMeld);
    }

    if (!valid) {
      return { game, success: false, error: 'Card doesn\'t fit in this meld' };
    }

    // Add card to meld
    targetPlayer.placedCards[meldIndex].push(card);
    
    // Remove from player's hand
    player.hand = player.hand.filter(c => c.id !== cardId);
    player.cardCount = player.hand.length;

    console.log(`✅ ${player.name} added card to ${targetPlayer.name}'s meld`);

    return { game, success: true };
  }
}

export const gameManager = new GameManager();
