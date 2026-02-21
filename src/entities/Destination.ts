import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Grid } from '../utils/Grid';

export class Destination {
    public scene: Phaser.Scene;
    public x: number;
    public y: number;
    public gridX: number;
    public gridY: number;
    public color: number;
    private graphics: Phaser.GameObjects.Graphics;
    private colorShape: Phaser.GameObjects.Circle;
    private waitingCars: number = 0;
    private waitingText: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, gridX: number, gridY: number, color: number, grid: Grid) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.color = color;
        
        const worldPos = grid.gridToWorld(gridX, gridY);
        this.x = worldPos.x;
        this.y = worldPos.y;

        // Create visual representation (circle for destination)
        this.graphics = scene.add.graphics();
        this.colorShape = scene.add.circle(
            this.x,
            this.y,
            GameConfig.DESTINATION_SIZE / 2,
            color
        );

        // Add waiting cars counter
        this.waitingText = scene.add.text(
            this.x,
            this.y + GameConfig.DESTINATION_SIZE / 2 + 10,
            '0',
            {
                fontSize: '14px',
                color: '#ffffff',
                fontFamily: 'Arial'
            }
        ).setOrigin(0.5);
    }

    /**
     * Increment waiting cars count
     */
    addWaitingCar(): void {
        this.waitingCars++;
        this.updateWaitingText();
    }

    /**
     * Decrement waiting cars count
     */
    removeWaitingCar(): void {
        this.waitingCars = Math.max(0, this.waitingCars - 1);
        this.updateWaitingText();
    }

    /**
     * Get waiting cars count
     */
    getWaitingCars(): number {
        return this.waitingCars;
    }

    /**
     * Update waiting text display
     */
    private updateWaitingText(): void {
        this.waitingText.setText(this.waitingCars.toString());
        if (this.waitingCars >= GameConfig.MAX_CARS_PER_DESTINATION) {
            this.waitingText.setColor('#ff0000');
        } else {
            this.waitingText.setColor('#ffffff');
        }
    }

    /**
     * Destroy the destination
     */
    destroy(): void {
        this.graphics.destroy();
        this.colorShape.destroy();
        this.waitingText.destroy();
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
