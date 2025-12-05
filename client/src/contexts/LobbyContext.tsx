import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Lobby } from '@shanghairummy/shared';
import { useSocket } from './SocketContext';
import toast from 'react-hot-toast';

interface LobbyContextType {
  lobby: Lobby | null;
  isHost: boolean;
  createLobby: (username?: string) => void;
  joinLobby: (code: string, username?: string) => void;
  leaveLobby: () => void;
  kickPlayer: (playerId: string) => void;
  disbandLobby: () => void;
  changeName: (newName: string) => void;
}

const LobbyContext = createContext<LobbyContextType | undefined>(undefined);

export function LobbyProvider({ children }: { children: ReactNode }) {
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const { socket } = useSocket();

  const isHost = lobby?.hostId === socket?.id;

  useEffect(() => {
    if (!socket) return;

    // Lobby created successfully
    socket.on('lobby-created', ({ lobby: newLobby }) => {
      console.log('Lobby created:', newLobby);
      setLobby(newLobby);
      toast.success(`Lobby created: ${newLobby.code}`);
    });

    // Joined lobby successfully
    socket.on('lobby-joined', ({ lobby: joinedLobby }) => {
      console.log('Joined lobby:', joinedLobby);
      setLobby(joinedLobby);
      toast.success(`Joined lobby: ${joinedLobby.code}`);
    });

    // Lobby updated (player joined/left)
    socket.on('lobby-updated', ({ lobby: updatedLobby }) => {
      console.log('Lobby updated:', updatedLobby);
      setLobby(updatedLobby);
    });

    // Player joined
    socket.on('player-joined-lobby', ({ player }) => {
      console.log('Player joined:', player.name);
      setLobby(prev => {
        if (!prev) return null;
        // Check if player already exists
        if (prev.players.some(p => p.id === player.id)) {
          return prev;
        }
        return {
          ...prev,
          players: [...prev.players, player]
        };
      });
    });

    // Player left
    socket.on('player-left-lobby', ({ playerId }) => {
      console.log('Player left:', playerId);
      setLobby(prev => {
        if (!prev) return null;
        return {
          ...prev,
          players: prev.players.filter(p => p.id !== playerId)
        };
      });
    });

    // Kicked from lobby
    socket.on('player-kicked', ({ reason }) => {
      console.log('Kicked from lobby:', reason);
      setLobby(null);
      toast.error(`You were kicked: ${reason}`);
    });

    // Player name changed
    socket.on('player-name-changed', ({ playerId, newName }) => {
      console.log('Player name changed:', playerId, newName);
      toast.success(`Player changed name to ${newName}`);
    });

    // Lobby disbanded
    socket.on('lobby-disbanded', () => {
      console.log('Lobby disbanded');
      setLobby(null);
    });

    // Error handling
    socket.on('error', (message) => {
      console.error('Lobby error:', message);
      toast.error(message);
    });

    return () => {
      socket.off('lobby-created');
      socket.off('lobby-joined');
      socket.off('lobby-updated');
      socket.off('player-joined-lobby');
      socket.off('player-left-lobby');
      socket.off('player-kicked');
      socket.off('player-name-changed');
      socket.off('lobby-disbanded');
      socket.off('error');
    };
  }, [socket]);

  const createLobby = (username?: string) => {
    if (!socket) {
      console.error('Socket not connected');
      toast.error('Not connected to server');
      return;
    }
    socket.emit('create-lobby', username);
  };

  const joinLobby = (code: string, username?: string) => {
    if (!socket) {
      console.error('Socket not connected');
      toast.error('Not connected to server');
      return;
    }
    socket.emit('join-lobby', { code, username });
  };

  const leaveLobby = () => {
    if (!socket) return;
    socket.emit('leave-lobby');
    setLobby(null);
  };

  const kickPlayer = (playerId: string) => {
    if (!socket || !isHost) {
      console.error('Only host can kick players');
      return;
    }
    socket.emit('kick-player', playerId);
  };

  const disbandLobby = () => {
    if (!socket || !isHost) {
      console.error('Only host can disband lobby');
      return;
    }
    socket.emit('disband-lobby');
    setLobby(null);
  };

  const changeName = (newName: string) => {
    if (!socket) {
      console.error('Socket not connected');
      toast.error('Not connected to server');
      return;
    }
    if (!newName || newName.trim().length < 1) {
      toast.error('Name must be at least 1 character');
      return;
    }
    socket.emit('change-name', newName.trim());
  };

  return (
    <LobbyContext.Provider
      value={{
        lobby,
        isHost,
        createLobby,
        joinLobby,
        leaveLobby,
        kickPlayer,
        disbandLobby,
        changeName,
      }}
    >
      {children}
    </LobbyContext.Provider>
  );
}

export function useLobby() {
  const context = useContext(LobbyContext);
  if (!context) {
    throw new Error('useLobby must be used within a LobbyProvider');
  }
  return context;
}
