import { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLobby } from '../contexts/LobbyContext';

function LandingPage() {
    const { goToTutorial, goToLobby } = useNavigation();
    const { createLobby, joinLobby, lobby } = useLobby();
    const [roomCode, setRoomCode] = useState('');

    // Navigate to lobby when lobby is created/joined
    useEffect(() => {
        if (lobby) {
            goToLobby();
        }
    }, [lobby, goToLobby]);

    const handleJoinRoom = () => {
        if (roomCode.trim().length >= 4) {
            joinLobby(roomCode.trim());
        }
    };

    const handleCreateRoom = () => {
        createLobby();
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && roomCode.trim().length >= 4) {
            handleJoinRoom();
        }
    };

    return (
        <div className='min-h-screen bg-blue-800 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-4'>
                <h1 className='text-4xl font-bold text-white'>Shanghai Rummy</h1>
                <h3 className='text-2xl font-bold text-white'>A family fun card game</h3>
                
                <div className='flex flex-col gap-3 mt-6 w-80'>
                    <div className='flex flex-col gap-2'>
                        <label htmlFor='roomCode' className='text-white font-semibold text-sm'>
                            Enter Room Code
                        </label>
                        <input
                            id='roomCode'
                            type='text'
                            value={roomCode}
                            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                            onKeyPress={handleKeyPress}
                            placeholder='ABC123'
                            maxLength={6}
                            className='px-4 py-3 rounded-lg border-2 border-blue-300 focus:border-white focus:outline-none text-center text-lg font-bold tracking-wider uppercase placeholder:text-gray-400'
                        />
                    </div>

                    <button
                        onClick={handleJoinRoom}
                        disabled={!roomCode.trim()}
                        className='bg-white hover:bg-gray-100 disabled:bg-gray-300 disabled:cursor-not-allowed text-gray-800 font-semibold py-3 px-4 rounded-lg shadow transition-colors'
                    >
                        Join Room
                    </button>

                    <div className='relative flex items-center justify-center my-2'>
                        <div className='border-t border-blue-400 w-full'></div>
                        <span className='absolute bg-blue-800 px-3 text-white text-sm'>or</span>
                    </div>

                    <button
                        onClick={handleCreateRoom}
                        className='bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors'
                    >
                        Create New Room
                    </button>

                    <button
                        onClick={goToTutorial}
                        className='bg-transparent border-2 border-white hover:bg-white hover:text-blue-800 text-white font-semibold py-3 px-4 rounded-lg transition-colors'
                    >
                        How to Play
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LandingPage;