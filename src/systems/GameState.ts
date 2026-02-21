import { GameConfig } from '../config/GameConfig';
import { Destination } from '../entities/Destination';

export enum GameState {
    MENU,
    PLAYING,
    GAME_OVER
}

export class GameStateManager {
    private state: GameState = GameState.MENU;
    private score: number = 0;
    private startTime: number = 0;
    private onStateChangeCallback?: (state: GameState) => void;
    private onScoreChangeCallback?: (score: number) => void;

    /**
     * Set callback for state changes
     */
    setOnStateChange(callback: (state: GameState) => void): void {
        this.onStateChangeCallback = callback;
    }

    /**
     * Set callback for score changes
     */
    setOnScoreChange(callback: (score: number) => void): void {
        this.onScoreChangeCallback = callback;
    }

    /**
     * Start the game
     */
    startGame(): void {
        this.state = GameState.PLAYING;
        this.score = 0;
        this.startTime = Date.now();
        this.notifyStateChange();
        this.notifyScoreChange();
    }

    /**
     * End the game
     */
    endGame(): void {
        this.state = GameState.GAME_OVER;
        this.notifyStateChange();
    }

    /**
     * Return to menu
     */
    returnToMenu(): void {
        this.state = GameState.MENU;
        this.notifyStateChange();
    }

    /**
     * Add points to score
     */
    addScore(points: number): void {
        this.score += points;
        this.notifyScoreChange();
    }

    /**
     * Get current score
     */
    getScore(): number {
        return this.score;
    }

    /**
     * Get current state
     */
    getState(): GameState {
        return this.state;
    }

    /**
     * Get elapsed time in seconds
     */
    getElapsedTime(): number {
        if (this.startTime === 0) return 0;
        return (Date.now() - this.startTime) / 1000;
    }

    /**
     * Check if game should end (too many cars waiting at destinations)
     */
    checkGameOver(destinations: Destination[]): boolean {
        for (const dest of destinations) {
            if (dest.getWaitingCars() >= GameConfig.MAX_CARS_PER_DESTINATION) {
                return true;
            }
        }
        return false;
    }

    private notifyStateChange(): void {
        if (this.onStateChangeCallback) {
            this.onStateChangeCallback(this.state);
        }
    }

    private notifyScoreChange(): void {
        if (this.onScoreChangeCallback) {
            this.onScoreChangeCallback(this.score);
        }
    }
}
