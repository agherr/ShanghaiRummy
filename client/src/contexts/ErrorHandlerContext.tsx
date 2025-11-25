import { createContext, useContext, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useNavigation } from './NavigationContext';
import toast from 'react-hot-toast';

interface ErrorHandlerContextType {
  handleCriticalError: (message: string) => void;
  handleError: (message: string) => void;
}

const ErrorHandlerContext = createContext<ErrorHandlerContextType | undefined>(undefined);

export function ErrorHandlerProvider({ children }: { children: ReactNode }) {
  const { goToLanding } = useNavigation();

  const handleCriticalError = useCallback((message: string) => {
    console.error('Critical error:', message);
    toast.error(message, { duration: 5000 });
    // Redirect to landing page after showing error
    setTimeout(() => {
      goToLanding();
    }, 2000);
  }, [goToLanding]);

  const handleError = useCallback((message: string) => {
    console.error('Error:', message);
    toast.error(message);
  }, []);

  return (
    <ErrorHandlerContext.Provider value={{ handleCriticalError, handleError }}>
      {children}
    </ErrorHandlerContext.Provider>
  );
}

export function useErrorHandler() {
  const context = useContext(ErrorHandlerContext);
  if (!context) {
    throw new Error('useErrorHandler must be used within an ErrorHandlerProvider');
  }
  return context;
}
