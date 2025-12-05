import { useTheme } from "../hooks/useTheme";

function GameResults() {
    const { theme } = useTheme();
    
    return (
        <div className={`min-h-screen ${theme.bg} flex items-center justify-center`}>
            GAME RESULTS
        </div>
    );
}

export default GameResults;