function LoadingScreen() {
    return (
        <div className='min-h-screen bg-blue-800 flex items-center justify-center'>
            <div className='flex flex-col items-center gap-4'>
                <div className='w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin'></div>
                <p className='text-white text-xl font-semibold'>Loading game...</p>
            </div>
        </div>
    );
}

export default LoadingScreen;