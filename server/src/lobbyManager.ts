import type { Lobby, LobbyPlayer } from '@shanghairummy/shared';

// Generate random alphanumeric code
function generateLobbyCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

// Generate random username
function generateUsername(): string {
  const adjectives = ['Swift', 'Clever', 'Lucky', 'Brave', 'Wise', 'Bold', 'Quick', 'Sharp'];
  const nouns = ['Fox', 'Eagle', 'Tiger', 'Wolf', 'Bear', 'Hawk', 'Lion', 'Panda'];
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(Math.random() * 100);
  return `${adjective}${noun}${number}`;
}

class LobbyManager {
  private lobbies: Map<string, Lobby> = new Map();
  private playerToLobby: Map<string, string> = new Map(); // socketId -> lobbyCode

  createLobby(hostId: string, username?: string): Lobby {
    let code = generateLobbyCode();
    
    // Ensure code is unique
    while (this.lobbies.has(code)) {
      code = generateLobbyCode();
    }

    const host: LobbyPlayer = {
      id: hostId,
      name: username || generateUsername(),
      isHost: true,
    };

    const lobby: Lobby = {
      code,
      hostId,
      players: [host],
      createdAt: new Date().toISOString(),
      maxPlayers: 6,
    };

    this.lobbies.set(code, lobby);
    this.playerToLobby.set(hostId, code);

    console.log(`✅ Lobby created: ${code} by ${host.name}`);
    console.log(`🗺️  playerToLobby Map size: ${this.playerToLobby.size}, entries:`, Array.from(this.playerToLobby.entries()));
    return lobby;
  }

  joinLobby(code: string, playerId: string, username?: string): Lobby | null {
    const lobby = this.lobbies.get(code.toUpperCase());
    
    if (!lobby) {
      console.log(`❌ Lobby not found: ${code}`);
      return null;
    }

    if (lobby.players.length >= lobby.maxPlayers) {
      console.log(`❌ Lobby full: ${code}`);
      return null;
    }

    // Check if player already in lobby
    if (lobby.players.some(p => p.id === playerId)) {
      console.log(`⚠️  Player ${playerId} already in lobby ${code}`);
      return lobby;
    }

    const player: LobbyPlayer = {
      id: playerId,
      name: username || generateUsername(),
      isHost: false,
    };

    lobby.players.push(player);
    this.playerToLobby.set(playerId, code);

    console.log(`✅ Player ${player.name} joined lobby ${code}`);
    console.log(`🗺️  playerToLobby Map size: ${this.playerToLobby.size}, entries:`, Array.from(this.playerToLobby.entries()));
    return lobby;
  }

  leaveLobby(playerId: string): { lobby: Lobby | null; wasHost: boolean; code: string } {
    const code = this.playerToLobby.get(playerId);
    
    if (!code) {
      return { lobby: null, wasHost: false, code: '' };
    }

    const lobby = this.lobbies.get(code);
    if (!lobby) {
      return { lobby: null, wasHost: false, code };
    }

    const wasHost = lobby.hostId === playerId;
    lobby.players = lobby.players.filter(p => p.id !== playerId);
    this.playerToLobby.delete(playerId);

    // If host left or lobby empty, disband lobby
    if (wasHost || lobby.players.length === 0) {
      this.lobbies.delete(code);
      console.log(`🗑️  Lobby ${code} disbanded`);
      return { lobby: null, wasHost, code };
    }

    // Promote first player to host if needed
    if (wasHost && lobby.players.length > 0) {
      lobby.hostId = lobby.players[0].id;
      lobby.players[0].isHost = true;
      console.log(`👑 ${lobby.players[0].name} is now host of lobby ${code}`);
    }

    console.log(`👋 Player ${playerId} left lobby ${code}`);
    return { lobby, wasHost, code };
  }

  kickPlayer(hostId: string, playerIdToKick: string): Lobby | null {
    const code = this.playerToLobby.get(hostId);
    
    if (!code) {
      return null;
    }

    const lobby = this.lobbies.get(code);
    if (!lobby || lobby.hostId !== hostId) {
      console.log(`❌ Only host can kick players`);
      return null;
    }

    lobby.players = lobby.players.filter(p => p.id !== playerIdToKick);
    this.playerToLobby.delete(playerIdToKick);

    console.log(`🚫 Player ${playerIdToKick} kicked from lobby ${code}`);
    return lobby;
  }

  disbandLobby(hostId: string): string | null {
    const code = this.playerToLobby.get(hostId);
    
    if (!code) {
      return null;
    }

    const lobby = this.lobbies.get(code);
    if (!lobby || lobby.hostId !== hostId) {
      console.log(`❌ Only host can disband lobby`);
      return null;
    }

    // Remove all players from map
    lobby.players.forEach(player => {
      this.playerToLobby.delete(player.id);
    });

    this.lobbies.delete(code);
    console.log(`🗑️  Lobby ${code} disbanded by host`);
    return code;
  }

  changeName(playerId: string, newName: string): Lobby | null {
    const code = this.playerToLobby.get(playerId);
    
    if (!code) {
      return null;
    }

    const lobby = this.lobbies.get(code);
    if (!lobby) {
      return null;
    }

    const player = lobby.players.find(p => p.id === playerId);
    if (!player) {
      return null;
    }

    // Validate name (at least 1 character)
    if (!newName || newName.trim().length < 1) {
      return null;
    }

    player.name = newName.trim();
    console.log(`✏️  Player ${playerId} changed name to ${player.name}`);
    return lobby;
  }

  getLobby(code: string): Lobby | undefined {
    return this.lobbies.get(code.toUpperCase());
  }

  getLobbyByPlayerId(playerId: string): Lobby | undefined {
    console.log(`🔍 Looking up player ${playerId} in playerToLobby Map`);
    console.log(`🗺️  Current playerToLobby Map:`, Array.from(this.playerToLobby.entries()));
    const code = this.playerToLobby.get(playerId);
    console.log(`🔍 Found lobby code: ${code || 'none'}`);
    return code ? this.lobbies.get(code) : undefined;
  }

  getAllLobbies(): Lobby[] {
    return Array.from(this.lobbies.values());
  }
}

export const lobbyManager = new LobbyManager();
