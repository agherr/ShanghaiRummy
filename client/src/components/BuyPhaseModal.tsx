import { useEffect, useState } from 'react';
import type { Card } from '@shanghairummy/shared';

interface BuyPhaseModalProps {
  topDiscard: Card | null;
  isMyTurn: boolean; // Next player gets first dibs
  timeLimit: number;
  buysRemaining: number;
  onWantToBuy: () => void;
  onDecline: () => void;
  mode: 'sequential' | 'simultaneous';
}

export default function BuyPhaseModal({
  topDiscard,
  isMyTurn,
  timeLimit,
  buysRemaining,
  onWantToBuy,
  onDecline,
  mode
}: BuyPhaseModalProps) {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 0.1));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (!topDiscard) return null;

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

  const getCardColor = (suit: Card['suit']) => {
    return suit === 'hearts' || suit === 'diamonds' ? 'text-red-600' : 'text-gray-900';
  };

  const canBuy = buysRemaining > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {isMyTurn ? '🎯 Your First Pick' : '💰 Buy Phase'}
          </h2>
          <p className="text-sm text-gray-600">
            {isMyTurn 
              ? 'You get first choice - take it for free!' 
              : mode === 'sequential'
                ? 'Do you want to buy this card?'
                : 'First to respond gets the card!'
            }
          </p>
        </div>

        {/* Timer */}
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-blue-600 h-full transition-all duration-100"
              style={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
            />
          </div>
          <div className="text-center text-sm text-gray-600 mt-1">
            {Math.ceil(timeRemaining)}s remaining
          </div>
        </div>

        {/* Card Display */}
        <div className="flex justify-center mb-6">
          <div className="relative bg-white rounded-lg shadow-lg p-4 w-32 h-44 flex flex-col items-center justify-between border-4 border-yellow-400">
            <div className={`text-2xl font-bold ${getCardColor(topDiscard.suit)}`}>
              {topDiscard.rank}
            </div>
            <div className={`text-5xl ${getCardColor(topDiscard.suit)}`}>
              {getSuitSymbol(topDiscard.suit)}
            </div>
            <div className={`text-2xl font-bold ${getCardColor(topDiscard.suit)}`}>
              {topDiscard.rank}
            </div>
          </div>
        </div>

        {/* Buy Info */}
        {!isMyTurn && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="text-sm text-gray-700 text-center">
              {canBuy ? (
                <>
                  <span className="font-semibold">Cost:</span> +2 extra cards from deck
                  <br />
                  <span className="text-xs text-gray-600">Buys remaining: {buysRemaining}/3</span>
                </>
              ) : (
                <span className="text-red-600 font-semibold">
                  No buys remaining (used 3/3)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
          >
            {isMyTurn ? 'Draw from Deck' : 'Pass'}
          </button>
          
          <button
            onClick={onWantToBuy}
            disabled={!isMyTurn && !canBuy}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
              canBuy || isMyTurn
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isMyTurn ? '✓ Take It' : '💰 Buy It'}
          </button>
        </div>
      </div>
    </div>
  );
}
