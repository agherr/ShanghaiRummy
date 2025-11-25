import { useState } from 'react';
import type { Card, Contract } from '@shanghairummy/shared';

interface ContractPlacementModalProps {
  hand: Card[];
  contracts: Contract[];
  round: number;
  dealersChoice?: 'books' | 'runs';
  onPlace: (groups: Card[][]) => void;
  onCancel: () => void;
}

export default function ContractPlacementModal({
  hand,
  contracts,
  round,
  dealersChoice,
  onPlace,
  onCancel
}: ContractPlacementModalProps) {
  const [placedGroups, setPlacedGroups] = useState<Card[][]>([]);
  const [currentGroup, setCurrentGroup] = useState<Card[]>([]);
  const [currentContractIndex, setCurrentContractIndex] = useState(0);

  // Build list of required contracts
  const getRequiredContracts = (): { type: 'book' | 'run'; minCards: number }[] => {
    if (round === 7 && dealersChoice) {
      if (dealersChoice === 'books') {
        return Array(4).fill({ type: 'book', minCards: 3 });
      } else {
        return Array(3).fill({ type: 'run', minCards: 4 });
      }
    }

    const required: { type: 'book' | 'run'; minCards: number }[] = [];
    contracts.forEach(contract => {
      for (let i = 0; i < contract.count; i++) {
        required.push({
          type: contract.type,
          minCards: contract.type === 'book' ? 3 : 4
        });
      }
    });
    return required;
  };

  const requiredContracts = getRequiredContracts();
  const currentRequirement = requiredContracts[currentContractIndex];
  const isLastContract = currentContractIndex === requiredContracts.length - 1;

  // Get all selected card IDs
  const selectedCardIds = new Set([
    ...placedGroups.flat().map(c => c.id),
    ...currentGroup.map(c => c.id)
  ]);

  // Available cards (not yet selected)
  const availableCards = hand.filter(c => !selectedCardIds.has(c.id));

  // Check if current group is valid
  const isCurrentGroupValid = (): boolean => {
    if (currentGroup.length < currentRequirement.minCards) return false;

    if (currentRequirement.type === 'book') {
      return isValidBook(currentGroup);
    } else {
      return isValidRun(currentGroup);
    }
  };

  // Validate book
  const isValidBook = (cards: Card[]): boolean => {
    if (cards.length < 3) return false;
    const nonJokers = cards.filter(c => c.rank !== 'JOKER');
    if (nonJokers.length === 0) return false;
    const rank = nonJokers[0].rank;
    return nonJokers.every(c => c.rank === rank);
  };

  // Validate run
  const isValidRun = (cards: Card[]): boolean => {
    if (cards.length < 4) return false;
    const nonJokers = cards.filter(c => c.rank !== 'JOKER');
    if (nonJokers.length === 0) return false;
    
    const suit = nonJokers[0].suit;
    if (!nonJokers.every(c => c.suit === suit)) return false;

    // Sort and check sequence
    const rankValues: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };

    const sortedNonJokers = [...nonJokers].sort((a, b) => rankValues[a.rank] - rankValues[b.rank]);
    const jokerCount = cards.length - nonJokers.length;

    // Check if cards can form a sequence with jokers filling gaps
    for (let i = 1; i < sortedNonJokers.length; i++) {
      const gap = rankValues[sortedNonJokers[i].rank] - rankValues[sortedNonJokers[i - 1].rank];
      if (gap > jokerCount + 1) return false;
    }

    return true;
  };

  // Toggle card selection
  const toggleCard = (card: Card) => {
    const isSelected = currentGroup.some(c => c.id === card.id);
    if (isSelected) {
      setCurrentGroup(currentGroup.filter(c => c.id !== card.id));
    } else {
      setCurrentGroup([...currentGroup, card]);
    }
  };

  // Confirm current group and move to next
  const confirmGroup = () => {
    if (!isCurrentGroupValid()) return;

    setPlacedGroups([...placedGroups, currentGroup]);
    setCurrentGroup([]);

    if (isLastContract) {
      // All contracts fulfilled - place them!
      onPlace([...placedGroups, currentGroup]);
    } else {
      setCurrentContractIndex(currentContractIndex + 1);
    }
  };

  // Go back to previous contract
  const goBack = () => {
    if (currentContractIndex > 0) {
      const previousGroup = placedGroups[placedGroups.length - 1];
      setPlacedGroups(placedGroups.slice(0, -1));
      setCurrentGroup(previousGroup);
      setCurrentContractIndex(currentContractIndex - 1);
    }
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

  // Render a card
  const renderCard = (card: Card, isSelected: boolean, isPlaced: boolean, onClick: () => void) => {
    return (
      <button
        key={card.id}
        onClick={onClick}
        disabled={isPlaced}
        className={`
          relative bg-white rounded-lg shadow-md p-2 min-w-[50px] h-[70px]
          flex flex-col items-center justify-between border-2
          ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${isPlaced ? 'opacity-40 cursor-not-allowed' : 'hover:shadow-lg hover:scale-105 cursor-pointer'}
          transition-all duration-150
        `}
      >
        <div className={`text-sm font-bold ${getCardColor(card.suit)}`}>
          {card.rank}
        </div>
        <div className={`text-xl ${getCardColor(card.suit)}`}>
          {getSuitSymbol(card.suit)}
        </div>
        <div className={`text-xs font-semibold ${getCardColor(card.suit)}`}>
          {card.rank}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-blue-600 text-white p-4 rounded-t-lg">
          <h2 className="text-xl font-bold">Place Your Contract</h2>
          <p className="text-sm opacity-90 mt-1">
            Step {currentContractIndex + 1} of {requiredContracts.length}
          </p>
        </div>

        {/* Current Requirement */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-900">
              {currentRequirement.type === 'book' 
                ? `Select ${currentRequirement.minCards}+ cards for Book ${placedGroups.filter(g => isValidBook(g)).length + 1}`
                : `Select ${currentRequirement.minCards}+ cards for Run ${placedGroups.filter(g => isValidRun(g)).length + 1}`
              }
            </div>
            <div className="text-sm text-gray-600 mt-1">
              {currentRequirement.type === 'book' 
                ? '(Same rank, any suit. Jokers are wild)'
                : '(4+ consecutive cards, same suit. Jokers are wild)'
              }
            </div>
            
            {/* Current selection count */}
            <div className="mt-2">
              <span className={`inline-block px-3 py-1 rounded text-sm font-semibold ${
                isCurrentGroupValid() ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
              }`}>
                {currentGroup.length} card{currentGroup.length !== 1 ? 's' : ''} selected
                {isCurrentGroupValid() && ' ✓'}
              </span>
            </div>
          </div>
        </div>

        {/* Previously placed groups */}
        {placedGroups.length > 0 && (
          <div className="bg-green-50 border-b border-green-200 p-4">
            <div className="text-sm font-semibold text-green-900 mb-2">
              ✓ Completed Groups:
            </div>
            <div className="space-y-2">
              {placedGroups.map((group, idx) => (
                <div key={idx} className="flex gap-1 flex-wrap">
                  {group.map(card => (
                    <div key={card.id} className="scale-75 origin-left">
                      {renderCard(card, false, true, () => {})}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Card selection area */}
        <div className="p-4">
          <div className="text-sm font-semibold text-gray-700 mb-3">
            Select cards from your hand:
          </div>
          
          <div className="grid grid-cols-6 gap-2 min-h-[200px]">
            {hand.map(card => {
              const isSelected = currentGroup.some(c => c.id === card.id);
              const isPlaced = selectedCardIds.has(card.id) && !isSelected;
              return renderCard(
                card,
                isSelected,
                isPlaced,
                () => !isPlaced && toggleCard(card)
              );
            })}
          </div>

          {availableCards.length === 0 && placedGroups.length === 0 && currentGroup.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              All cards have been selected
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200 flex gap-2 justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
          >
            Cancel
          </button>

          <div className="flex gap-2">
            {currentContractIndex > 0 && (
              <button
                onClick={goBack}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold transition-colors"
              >
                ← Back
              </button>
            )}
            
            <button
              onClick={confirmGroup}
              disabled={!isCurrentGroupValid()}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
                isCurrentGroupValid()
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLastContract ? '✓ Place Contract' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
