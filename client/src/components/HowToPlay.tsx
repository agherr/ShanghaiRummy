import { useNavigation } from "../contexts/NavigationContext";


function HowToPlay() {
    const { goToLanding } = useNavigation();

    return (
        <div className='min-h-screen bg-blue-800 flex items-center justify-center'>
            <a target="_blank" href="https://letmegooglethat.com/?q=How+to+play+Shanghai+Rummy">Click Here To Learn How To Play!</a>
            <button
                onClick={goToLanding}
                className='bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded shadow'
            >
                Return to Home
            </button>
        </div>
    );
}

export default HowToPlay;