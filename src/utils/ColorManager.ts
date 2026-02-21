import { GameConfig } from '../config/GameConfig';

export class ColorManager {
    private static colors = GameConfig.COLORS;
    private static colorNames = ['Red', 'Teal', 'Yellow', 'Mint'];

    /**
     * Get a random color from the available colors
     */
    static getRandomColor(): number {
        return this.colors[Math.floor(Math.random() * this.colors.length)];
    }

    /**
     * Get color by index
     */
    static getColor(index: number): number {
        return this.colors[index % this.colors.length];
    }

    /**
     * Get all available colors
     */
    static getAllColors(): number[] {
        return [...this.colors];
    }

    /**
     * Get color name (for debugging)
     */
    static getColorName(color: number): string {
        const index = this.colors.indexOf(color);
        return index >= 0 ? this.colorNames[index] : 'Unknown';
    }

    /**
     * Check if two colors match
     */
    static colorsMatch(color1: number, color2: number): boolean {
        return color1 === color2;
    }
}
