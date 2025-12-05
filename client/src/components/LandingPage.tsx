import { useState, useEffect } from 'react';
import { useNavigation } from '../contexts/NavigationContext';
import { useLobby } from '../contexts/LobbyContext';
import { useTheme } from '../hooks/useTheme';

function LandingPage() {
    const { goToTutorial, goToLobby, goToSettings } = useNavigation();
    const { createLobby, joinLobby, lobby } = useLobby();
    const { theme } = useTheme();
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
        <div className={`min-h-screen ${theme.bg} flex items-center justify-center relative`}>
            {/* Settings Button - Top Right (Mobile: Cog Icon, Desktop: Button) */}
            <button
                onClick={goToSettings}
                className={`absolute top-4 right-4 md:flex md:items-center md:gap-2 text-white ${theme.hover} transition-colors p-3 rounded-lg`}
                aria-label='Settings'
            >
                <svg xmlns='http://www.w3.org/2000/svg' className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' />
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                </svg>
                <span className='hidden md:inline font-semibold'>Settings</span>
            </button>

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
                            className={`px-4 py-3 rounded-lg border-2 ${theme.border} focus:border-white focus:outline-none text-center text-lg font-bold tracking-wider uppercase placeholder:text-gray-400`}
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
                        <div className={`border-t ${theme.border} w-full`}></div>
                        <span className={`absolute ${theme.bg} px-3 text-white text-sm`}>or</span>
                    </div>

                    <button
                        onClick={handleCreateRoom}
                        className={`${theme.bgLight} ${theme.hover} text-white font-semibold py-3 px-4 rounded-lg shadow transition-colors`}
                    >
                        Create New Room
                    </button>

                    <button
                        onClick={goToTutorial}
                        className={`bg-transparent border-2 border-white hover:bg-white hover:${theme.text} text-white font-semibold py-3 px-4 rounded-lg transition-colors`}
                    >
                        How to Play
                    </button>
                </div>
            </div>
        </div>
    )
}

export default LandingPage;