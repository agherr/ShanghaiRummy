import { NavigationProvider, useNavigation } from "./contexts/NavigationContext";
import { SocketProvider } from "./contexts/SocketContext";
import { LobbyProvider } from "./contexts/LobbyContext";
import { GameProvider } from "./contexts/GameContext";
import { ErrorHandlerProvider } from "./contexts/ErrorHandlerContext";
import { Toaster } from 'react-hot-toast';
import LandingPage from "./components/LandingPage";
import Lobby from "./components/Lobby";
import LoadingScreen from "./components/LoadingScreen";
import MobileGame from "./components/MobileGame";
import GameResults from "./components/GameResults";
import HowToPlay from "./components/HowToPlay";

function AppContent() {
  const { currentPage } = useNavigation();

  function renderPage() {
    switch (currentPage) {
      case 'landing':
        return <LandingPage />;
      case 'lobby':
        return <Lobby />;
      case 'loading':
        return <LoadingScreen />;
      case 'game':
        return <MobileGame />;
      case 'results':
        return <GameResults />;
      case 'tutorial':
        return <HowToPlay />;
      default:
        console.error('Unknown page state:', currentPage);
        return <LandingPage />;
    }
  }

  return (
    <>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
            fontSize: '16px',
            padding: '16px',
            borderRadius: '8px',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <div className='min-h-screen bg-blue-800'>
        {renderPage()}
      </div>
    </>);
}

function App() {
  return (
    <NavigationProvider>
      <SocketProvider>
        <ErrorHandlerProvider>
          <LobbyProvider>
            <GameProvider>
              <AppContent />
            </GameProvider>
          </LobbyProvider>
        </ErrorHandlerProvider>
      </SocketProvider>
    </NavigationProvider>
  );
}

export default App
