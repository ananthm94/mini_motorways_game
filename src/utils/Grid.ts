import { GameConfig } from '../config/GameConfig';

export class Grid {
    private gridSize: number;
    private width: number;
    private height: number;

    constructor() {
        this.gridSize = GameConfig.GRID_SIZE;
        this.width = GameConfig.GAME_WIDTH;
        this.height = GameConfig.GAME_HEIGHT;
    }

    /**
     * Convert world coordinates to grid coordinates
     */
    worldToGrid(x: number, y: number): { gridX: number; gridY: number } {
        return {
            gridX: Math.floor(x / this.gridSize),
            gridY: Math.floor(y / this.gridSize)
        };
    }

    /**
     * Convert grid coordinates to world coordinates (center of cell)
     */
    gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
        return {
            x: gridX * this.gridSize + this.gridSize / 2,
            y: gridY * this.gridSize + this.gridSize / 2
        };
    }

    /**
     * Snap world coordinates to nearest grid cell center
     */
    snapToGrid(x: number, y: number): { x: number; y: number } {
        const { gridX, gridY } = this.worldToGrid(x, y);
        return this.gridToWorld(gridX, gridY);
    }

    /**
     * Check if grid coordinates are valid
     */
    isValidGridPosition(gridX: number, gridY: number): boolean {
        return gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height;
    }

    /**
     * Get grid size
     */
    getGridSize(): number {
        return this.gridSize;
    }

    /**
     * Get grid dimensions
     */
    getDimensions(): { width: number; height: number } {
        return { width: this.width, height: this.height };
    }

    /**
     * Get all neighbors of a grid cell (4-directional)
     */
    getNeighbors(gridX: number, gridY: number): Array<{ gridX: number; gridY: number }> {
        const neighbors: Array<{ gridX: number; gridY: number }> = [];
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: 1 },   // down
            { dx: -1, dy: 0 }   // left
        ];

        for (const dir of directions) {
            const nx = gridX + dir.dx;
            const ny = gridY + dir.dy;
            if (this.isValidGridPosition(nx, ny)) {
                neighbors.push({ gridX: nx, gridY: ny });
            }
        }

        return neighbors;
    }
}
