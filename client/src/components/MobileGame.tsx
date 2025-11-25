import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import type { Card, Player } from '@shanghairummy/shared';
import ContractPlacementModal from './ContractPlacementModal';

export default function MobileGame() {
  const { 
    gameState, 
    myHand, 
    isMyTurn, 
    canDraw, 
    canPlace, 
    canDiscard, 
    inBuyPhase,
    isMyBuyTurn,
    buysRemaining,
    drawFromDeck, 
    drawFromDiscard, 
    discardCard, 
    placeContract,
    wantToBuy,
    declineBuy
  } = useGame();
  const [showPlacementModal, setShowPlacementModal] = useState(false);
  const [buyPhaseTimeRemaining, setBuyPhaseTimeRemaining] = useState<number | null>(null);

  // Track buy phase countdown
  useEffect(() => {
    if (!gameState) return;
    
    if (inBuyPhase && gameState.buyPhase) {
      const timeLimit = gameState.settings?.buyTimeLimit || 30;
      const elapsed = (Date.now() - gameState.buyPhase.startTime) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setBuyPhaseTimeRemaining(remaining);

      const interval = setInterval(() => {
        if (!gameState.buyPhase) return;
        const newElapsed = (Date.now() - gameState.buyPhase.startTime) / 1000;
        const newRemaining = Math.max(0, timeLimit - newElapsed);
        setBuyPhaseTimeRemaining(newRemaining);
        if (newRemaining <= 0) {
          clearInterval(interval);
        }
      }, 100);

      return () => clearInterval(interval);
    } else {
      setBuyPhaseTimeRemaining(null);
    }
  }, [inBuyPhase, gameState]);

  if (!gameState) {
    return <div className="flex items-center justify-center min-h-screen text-white">Loading game...</div>;
  }

  const { round, deckCount, topDiscard, currentPlayerId, turnPhase, roundConfig } = gameState;
  const currentPlayer = gameState.players.find(p => p.id === currentPlayerId);
  const myPlayer = gameState.players.find(p => p.hand === myHand);

  // Handle contract placement
  const handlePlaceContract = (groups: Card[][]) => {
    placeContract(groups);
    setShowPlacementModal(false);
  };

  // Get contract requirements as string
  const getContractDescription = () => {
    if (round === 7) {
      return gameState.dealersChoice 
        ? `Dealer's Choice: ${gameState.dealersChoice === 'books' ? '4 Books' : '3 Runs'}`
        : 'Waiting for dealer\'s choice...';
    }
    
    const books = roundConfig.contracts.filter(c => c.type === 'book').reduce((sum, c) => sum + c.count, 0);
    const runs = roundConfig.contracts.filter(c => c.type === 'run').reduce((sum, c) => sum + c.count, 0);
    
    const parts = [];
    if (books > 0) parts.push(`${books} Book${books > 1 ? 's' : ''}`);
    if (runs > 0) parts.push(`${runs} Run${runs > 1 ? 's' : ''}`);
    
    return parts.join(' + ');
  };

  // Get card suit symbol
  const getSuitSymbol = (suit: Card['suit']) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      case 'joker': return '🃏';
      default: return '';
    }
  };

  // Get card color
  const getCardColor = (suit: Card['suit']) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  // Render a single card
  const renderCard = (card: Card, onClick?: () => void, selectable = false) => {
    const isClickable = onClick && selectable;
    
    return (
      <button
        key={card.id}
        onClick={onClick}
        disabled={!isClickable}
        className={`
          relative bg-white rounded-lg shadow-md p-2 min-w-[60px] h-[85px]
          flex flex-col items-center justify-between border-2 border-gray-300
          ${isClickable ? 'hover:shadow-lg hover:scale-105 hover:border-blue-500 cursor-pointer' : 'cursor-default'}
          ${!isClickable && selectable ? 'opacity-50' : ''}
          transition-all duration-150
        `}
      >
        <div className={`text-lg font-bold ${getCardColor(card.suit)}`}>
          {card.rank}
        </div>
        <div className={`text-2xl ${getCardColor(card.suit)}`}>
          {getSuitSymbol(card.suit)}
        </div>
        <div className={`text-xs font-semibold ${getCardColor(card.suit)}`}>
          {card.rank}
        </div>
      </button>
    );
  };

  // Render player card (UI card, not playing card)
  const renderPlayerCard = (player: Player) => {
    const isCurrentPlayer = player.id === currentPlayerId;
    
    return (
      <div
        key={player.id}
        className={`
          bg-white rounded-lg shadow-md p-4 mb-3
          border-2 ${isCurrentPlayer ? 'border-yellow-400 bg-yellow-50' : 'border-gray-300'}
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-900">{player.name}</span>
            {gameState.players.indexOf(player) === gameState.dealerIndex && (
              <span className="text-2xl" title="Dealer">🎴</span>
            )}
            {isCurrentPlayer && (
              <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded text-xs font-semibold">
                TURN
              </span>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {player.totalScore} pts
          </div>
        </div>

        <div className="flex items-center gap-3 text-sm text-gray-700">
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Cards:</span>
            <span className="font-semibold">{player.cardCount}</span>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-gray-500">Buys:</span>
            <span className={`font-semibold ${player.buysUsed >= 3 ? 'text-red-500' : 'text-blue-600'}`}>
              {player.buysUsed}/3
            </span>
          </div>
          
          {player.hasPlacedContract && (
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-semibold">
              ✓ Contract Down
            </span>
          )}
        </div>

        {/* Show placed cards for players who have laid down */}
        {player.hasPlacedContract && player.placedCards.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Placed Cards:</div>
            <div className="space-y-2">
              {player.placedCards.map((group, idx) => (
                <div key={idx} className="flex gap-1 flex-wrap">
                  {group.map(card => (
                    <div key={card.id} className="scale-75 origin-left">
                      {renderCard(card)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex flex-col">
      {/* Contract Placement Modal */}
      {showPlacementModal && (
        <ContractPlacementModal
          hand={myHand}
          contracts={roundConfig.contracts}
          round={round}
          dealersChoice={gameState.dealersChoice}
          onPlace={handlePlaceContract}
          onCancel={() => setShowPlacementModal(false)}
        />
      )}

      {/* Top Section - Deck and Discard */}
      <div className="bg-blue-800 shadow-lg p-4">
        <div className="max-w-md mx-auto">
          <div className="text-white text-center mb-3">
            <div className="text-sm opacity-90">Round {round}/7</div>
            <div className="text-lg font-bold">{getContractDescription()}</div>
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* Deck */}
            <div className="text-center">
              <button
                onClick={drawFromDeck}
                disabled={!canDraw}
                className={`
                  w-20 h-28 bg-blue-600 rounded-lg shadow-lg
                  border-4 border-blue-400 flex items-center justify-center
                  ${canDraw ? 'hover:bg-blue-500 cursor-pointer' : 'opacity-50 cursor-not-allowed'}
                  transition-all duration-150
                `}
              >
                <span className="text-white text-4xl">🂠</span>
              </button>
              <div className="text-white text-sm mt-1">{deckCount} cards</div>
            </div>

            {/* Discard Pile */}
            <div className="text-center relative">
              {topDiscard ? (
                <>
                  <div className="relative">
                    {/* Glowing animation during buy phase when it's my turn */}
                    {inBuyPhase && isMyBuyTurn && (
                      <div className="absolute -inset-2 bg-yellow-400 rounded-xl animate-pulse opacity-75 blur-sm"></div>
                    )}
                    {inBuyPhase && !isMyBuyTurn && gameState.buyPhase?.nextPlayerHasPassed && (
                      <div className="absolute -inset-2 bg-green-400 rounded-xl animate-pulse opacity-50 blur-sm"></div>
                    )}
                    
                    <button
                      onClick={inBuyPhase ? (isMyBuyTurn ? drawFromDiscard : (gameState.buyPhase?.nextPlayerHasPassed ? wantToBuy : undefined)) : (gameState.discardIsDead ? undefined : drawFromDiscard)}
                      disabled={(!canDraw && !inBuyPhase) || (canDraw && gameState.discardIsDead) || (inBuyPhase && !isMyBuyTurn && !gameState.buyPhase?.nextPlayerHasPassed)}
                      className={`relative ${((canDraw && !gameState.discardIsDead) || (inBuyPhase && (isMyBuyTurn || gameState.buyPhase?.nextPlayerHasPassed))) ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    >
                      {renderCard(topDiscard, undefined, false)}
                    </button>
                  </div>
                  <div className="text-white text-sm mt-1">
                    {gameState.discardIsDead && canDraw ? (
                      <span className="text-red-400">Dead Card ☠️</span>
                    ) : inBuyPhase ? (
                      isMyBuyTurn ? 'Take or Pass' : 'Buy?'
                    ) : (
                      'Discard'
                    )}
                  </div>
                </>
              ) : (
                <div className="w-20 h-28 bg-blue-700 rounded-lg shadow-lg border-4 border-blue-500 flex items-center justify-center">
                  <span className="text-white text-xs">Empty</span>
                </div>
              )}
            </div>
          </div>

          {/* Buy Phase Indicator */}
          {inBuyPhase && gameState.buyPhase && (
            <div className="mt-3 text-center space-y-2">
              <div className="inline-block bg-purple-500 text-white px-4 py-2 rounded-lg font-bold">
                🛒 Buy Phase - {buyPhaseTimeRemaining ? `${Math.ceil(buyPhaseTimeRemaining)}s` : '...'}
              </div>
              
              {isMyBuyTurn ? (
                <div className="text-yellow-300 text-sm font-semibold">
                  You're next! Take it for FREE or pass
                </div>
              ) : !gameState.buyPhase.nextPlayerHasPassed ? (
                <div className="text-orange-300 text-sm font-semibold">
                  ⏳ Waiting for next player to decide (they get first dibs)...
                </div>
              ) : gameState.settings?.buyMode === 'sequential' ? (
                <div className="text-white text-sm">
                  Asking {gameState.players[gameState.buyPhase.askedPlayerIndex]?.name || 'player'}...
                </div>
              ) : (
                <div className="text-green-300 text-sm font-semibold">
                  First to buy wins! ({buysRemaining}/3 buys left)
                </div>
              )}

              {/* Action buttons - only show if it's your turn to act */}
              {(isMyBuyTurn || 
                (gameState.buyPhase.nextPlayerHasPassed && gameState.settings?.buyMode === 'simultaneous') ||
                (gameState.buyPhase.nextPlayerHasPassed && gameState.settings?.buyMode === 'sequential' && 
                 gameState.buyPhase && 
                 gameState.players[gameState.buyPhase.askedPlayerIndex]?.id === myPlayer?.id)) && (
                <div className="flex gap-2 justify-center">
                  {isMyBuyTurn ? (
                    <>
                      <button
                        onClick={drawFromDiscard}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors"
                      >
                        ✓ Take It (Free)
                      </button>
                      <button
                        onClick={declineBuy}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors"
                      >
                        ✗ Pass
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={wantToBuy}
                        disabled={buysRemaining <= 0 || !gameState.buyPhase?.nextPlayerHasPassed}
                        className="bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors"
                      >
                        💰 Buy (+2 cards) {buysRemaining > 0 ? `(${buysRemaining}/3)` : '(Max)'}
                      </button>
                      <button
                        onClick={declineBuy}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg font-bold shadow-lg transition-colors"
                      >
                        ✗ Pass
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Turn Phase Indicator */}
          {isMyTurn && !inBuyPhase && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold">
                Your Turn: {turnPhase === 'draw' ? (gameState.discardIsDead ? 'Draw from Deck (Discard is Dead)' : 'Draw a Card') : turnPhase === 'place' ? 'Place Contract or Discard' : 'Discard a Card'}
              </div>
            </div>
          )}

          {/* Place Contract Button */}
          {isMyTurn && canPlace && !myPlayer?.hasPlacedContract && (
            <div className="mt-3 text-center">
              <button
                onClick={() => setShowPlacementModal(true)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-colors"
              >
                📋 Place Contract
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Middle Section - Players List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-md mx-auto">
          <div className="text-white text-sm mb-2 opacity-90">
            {currentPlayer ? `${currentPlayer.name}'s turn` : 'Waiting...'}
          </div>
          
          {gameState.players.map(renderPlayerCard)}
        </div>
      </div>

      {/* Bottom Section - My Hand */}
      <div className="bg-blue-800 shadow-lg p-4 border-t-4 border-blue-600">
        <div className="max-w-md mx-auto">
          <div className="text-white text-sm mb-2 font-semibold">
            Your Hand ({myHand.length} cards)
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2">
            {myHand.map(card => renderCard(
              card,
              canDiscard ? () => discardCard(card.id) : undefined,
              canDiscard
            ))}
          </div>

          {myHand.length === 0 && (
            <div className="text-white text-center py-4 opacity-75">
              No cards in hand
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
