import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Grid } from '../utils/Grid';

export class House {
    public scene: Phaser.Scene;
    public x: number;
    public y: number;
    public gridX: number;
    public gridY: number;
    public color: number;
    private graphics: Phaser.GameObjects.Graphics;
    private colorShape: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, gridX: number, gridY: number, color: number, grid: Grid) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.color = color;
        
        const worldPos = grid.gridToWorld(gridX, gridY);
        this.x = worldPos.x;
        this.y = worldPos.y;

        // Create visual representation
        this.graphics = scene.add.graphics();
        this.colorShape = scene.add.rectangle(
            this.x,
            this.y,
            GameConfig.HOUSE_SIZE,
            GameConfig.HOUSE_SIZE,
            color
        );
    }

    /**
     * Destroy the house
     */
    destroy(): void {
        this.graphics.destroy();
        this.colorShape.destroy();
    }

    /**
     * Get world position
     */
    getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Get grid position
     */
    getGridPosition(): { gridX: number; gridY: number } {
        return { gridX: this.gridX, gridY: this.gridY };
    }
}
