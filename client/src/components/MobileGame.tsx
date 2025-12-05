import { useState } from 'react';
import { useGame } from '../contexts/GameContext';
import type { Card, Player } from '@shanghairummy/shared';
import ContractPlacementModal from './ContractPlacementModal';
import { useTheme } from '../hooks/useTheme';

export default function MobileGame() {
  const { 
    gameState, 
    myHand, 
    isMyTurn, 
    canDraw, 
    canPlace, 
    canDiscard,
    isBuyingPhase,
    isMyBuyTurn,
    canBuy,
    takeDiscard,
    passDiscard,
    buyCard,
    passBuy,
    drawFromDeck, 
    discardCard, 
    placeContract
  } = useGame();
  const { theme } = useTheme();
  const [showPlacementModal, setShowPlacementModal] = useState(false);

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
    const Element = isClickable ? 'button' : 'div';
    
    return (
      <Element
        key={card.id}
        onClick={onClick}
        className={`
          relative bg-white rounded-lg shadow-md p-2 min-w-[60px] h-[85px]
          flex flex-col items-center justify-between border-2 border-gray-300
          ${isClickable ? `hover:shadow-lg hover:scale-105 hover:${theme.border} cursor-pointer` : 'cursor-default'}
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
      </Element>
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
            <span className="font-semibold">{player.buysThisRound}/3</span>
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
    <div className={`min-h-screen ${theme.bg} flex flex-col`}>
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
      <div className={`${theme.bg} shadow-lg p-4`}>
        <div className="max-w-md mx-auto">
          <div className="text-white text-center mb-3">
            <div className="text-sm opacity-90">Round {round}/7</div>
            <div className="text-lg font-bold">{getContractDescription()}</div>
          </div>

          <div className="flex items-center justify-center gap-6">
            {/* Deck */}
            <div className="text-center">
              <div
                onClick={
                  // Can draw from deck if: it's your turn, draw phase, not buying phase, and (no discard exists OR buying phase already happened OR discard is dead)
                  (canDraw && !isBuyingPhase && (!topDiscard || gameState.hasPassedDiscard || gameState.discardIsDead)) ? drawFromDeck : undefined
                }
                className={`
                  w-20 h-28 rounded-lg shadow-lg
                  border-4 flex items-center justify-center
                  relative
                  ${canDraw && !isBuyingPhase && (!topDiscard || gameState.hasPassedDiscard || gameState.discardIsDead)
                    ? `${theme.bg} ${theme.border} cursor-pointer hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.5)]` 
                    : `${theme.bg} ${theme.border} opacity-75`}
                  transition-all duration-150
                `}
              >
                <span className="text-white text-4xl">🂠</span>
              </div>
              <div className="text-white text-sm mt-1">{deckCount} cards</div>
            </div>

            {/* Discard Pile */}
            <div className="text-center relative">
              {topDiscard ? (
                <>
                  <div 
                    onClick={
                      // Can't click if discard is dead
                      gameState.discardIsDead ? undefined :
                      // During buying phase - buyer can click to buy
                      (isBuyingPhase && isMyBuyTurn && canBuy) ? buyCard :
                      // During draw phase - current player can take discard if not dead
                      (isMyTurn && canDraw && !isBuyingPhase) ? takeDiscard :
                      undefined
                    }
                    className={`
                      inline-block relative
                      ${!gameState.discardIsDead && ((isBuyingPhase && isMyBuyTurn && canBuy) || (isMyTurn && canDraw && !isBuyingPhase))
                        ? 'cursor-pointer hover:scale-105 transition-transform shadow-[0_0_20px_rgba(255,215,0,0.7)]'
                        : ''}
                    `}
                  >
                    {renderCard(topDiscard, undefined, false)}
                    {/* Show skull emoji if discard is dead */}
                    {gameState.discardIsDead && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
                        <span className="text-5xl">💀</span>
                      </div>
                    )}
                  </div>
                  <div className="text-white text-sm mt-1">
                    {gameState.discardIsDead ? 'Dead' : 'Discard'}
                  </div>
                </>
              ) : (
                <div className="w-20 h-28 bg-gray-700 rounded-lg shadow-lg border-4 border-gray-600 flex items-center justify-center">
                  <span className="text-white text-xs">Empty</span>
                </div>
              )}
            </div>
          </div>

          {/* Turn Phase Indicator */}
          {isMyTurn && !isBuyingPhase && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-2 rounded-lg font-bold">
                {turnPhase === 'draw' 
                  ? topDiscard
                    ? gameState.hasPassedDiscard
                      ? '👆 Click deck or discard to draw'
                      : '👆 Take the discard or pass to let others buy'
                    : '👆 Click the deck to draw'
                  : turnPhase === 'place' 
                    ? 'Place Contract or Discard' 
                    : 'Discard a Card'}
              </div>
              {/* Pass Button - offer buying to others (only show on initial turn, not after buying phase) */}
              {canDraw && topDiscard && !gameState.hasPassedDiscard && (
                <button
                  onClick={passDiscard}
                  className="mt-2 bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors"
                >
                  Pass - Let Others Buy
                </button>
              )}
            </div>
          )}

          {/* Buying Phase Indicator */}
          {isBuyingPhase && isMyBuyTurn && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-purple-400 text-purple-900 px-4 py-2 rounded-lg font-bold mb-2">
                💰 Click the discard to buy ({myPlayer ? 3 - myPlayer.buysThisRound : 0} buys left)
              </div>
              <button
                onClick={passBuy}
                className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-2 rounded-lg font-semibold shadow-lg transition-colors"
              >
                Pass
              </button>
            </div>
          )}

          {/* Buying Phase - Waiting Indicator */}
          {isBuyingPhase && !isMyBuyTurn && (
            <div className="mt-3 text-center">
              <div className="inline-block bg-blue-400 text-blue-900 px-4 py-2 rounded-lg font-bold">
                ⏳ Waiting for {gameState.players.find(p => p.id === gameState.buyingPlayerId)?.name} to decide...
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
      <div className={`${theme.bg} shadow-lg p-4 border-t-4 ${theme.border}`}>
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
