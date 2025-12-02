import { useState } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLobby } from '../contexts/LobbyContext';
import { useGame } from '../contexts/GameContext';

function Lobby() {
    const { goToLanding } = useNavigation();
    const { lobby, isHost, leaveLobby, kickPlayer, disbandLobby } = useLobby();
    const { startGame } = useGame();
    const [copiedCode, setCopiedCode] = useState(false);

    const handleStartGame = () => {
        if (isHost) {
            startGame();
        }
    };

    const handleCopyCode = () => {
        if (lobby?.code) {
            navigator.clipboard.writeText(lobby.code);
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        }
    };

    const handleLeave = () => {
        if (isHost) {
            disbandLobby();
        } else {
            leaveLobby();
        }
        goToLanding();
    };

    const handleKick = (playerId: string) => {
        if (isHost) {
            kickPlayer(playerId);
        }
    };

    if (!lobby) {
        return (
            <div className='min-h-screen bg-blue-800 flex items-center justify-center'>
                <div className='text-white text-xl'>Loading lobby...</div>
            </div>
        );
    }

    return (
        <div className='min-h-screen bg-blue-800 flex items-center justify-center p-4'>
            <div className='w-full max-w-2xl bg-white rounded-lg shadow-xl p-8'>
                {/* Header */}
                <div className='text-center mb-8'>
                    <h1 className='text-4xl font-bold text-gray-800 mb-4'>Game Lobby</h1>
                    <div className='flex items-center justify-center gap-3'>
                        <div className='text-sm text-gray-600'>Room Code:</div>
                        <div className='text-3xl font-bold text-blue-600 tracking-wider'>{lobby.code}</div>
                        <button
                            onClick={handleCopyCode}
                            className='bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm font-semibold transition-colors'
                        >
                            {copiedCode ? '✓ Copied!' : 'Copy'}
                        </button>
                    </div>
                    <p className='text-sm text-gray-500 mt-2'>Share this code with friends to join!</p>
                </div>

                {/* Players List */}
                <div className='mb-8'>
                    <h2 className='text-xl font-semibold text-gray-700 mb-4'>
                        Players ({lobby.players.length}/{lobby.maxPlayers})
                    </h2>
                    <div className='space-y-2'>
                        {lobby.players.map((player) => (
                            <div
                                key={player.id}
                                className='flex items-center justify-between bg-gray-50 p-4 rounded-lg'
                            >
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold'>
                                        {player.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className='font-semibold text-gray-800'>
                                            {player.name}
                                            {player.isHost && (
                                                <span className='ml-2 text-xs bg-yellow-400 text-yellow-900 px-2 py-1 rounded font-bold'>
                                                    HOST
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {isHost && !player.isHost && (
                                    <button
                                        onClick={() => handleKick(player.id)}
                                        className='bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded text-sm font-semibold transition-colors'
                                    >
                                        Kick
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className='flex flex-col gap-3'>
                    {isHost && (
                        <button
                            onClick={handleStartGame}
                            disabled={lobby.players.length < 2}
                            className='w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg shadow transition-colors'
                        >
                            Start Game {lobby.players.length < 2 && '(Need at least 2 players)'}
                        </button>
                    )}
                    <button
                        onClick={handleLeave}
                        className='w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors'
                    >
                        {isHost ? 'Disband Lobby' : 'Leave Lobby'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default Lobby;