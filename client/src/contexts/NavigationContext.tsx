import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

type Page = 'landing' | 'lobby' | 'loading' | 'game' | 'results' | 'tutorial';

interface NavigationContextType {
  currentPage: Page;
  navigateTo: (page: Page) => void;
  goToLobby: () => void;
  goToLoading: () => void;
  goToGame: () => void;
  goToResults: () => void;
  goToTutorial: () => void;
  goToLanding: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [currentPage, setCurrentPage] = useState<Page>('landing');

  // Helper functions for common navigation actions
  const navigateTo = (page: Page) => setCurrentPage(page);
  const goToLobby = () => setCurrentPage('lobby');
  const goToLoading = () => setCurrentPage('loading');
  const goToGame = () => setCurrentPage('game');
  const goToResults = () => setCurrentPage('results');
  const goToTutorial = () => setCurrentPage('tutorial');
  const goToLanding = () => setCurrentPage('landing');

  return (
    <NavigationContext.Provider
      value={{
        currentPage,
        navigateTo,
        goToLobby,
        goToLoading,
        goToGame,
        goToResults,
        goToTutorial,
        goToLanding,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

// Custom hook for easy access
export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
