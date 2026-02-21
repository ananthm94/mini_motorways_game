import Phaser from 'phaser';
import { Grid } from '../utils/Grid';

export enum UpgradeType {
    ROUNDABOUT = 'roundabout',
    BRIDGE = 'bridge'
}

export class Upgrade {
    public scene: Phaser.Scene;
    public gridX: number;
    public gridY: number;
    public type: UpgradeType;
    private graphics: Phaser.GameObjects.Graphics;
    private visual: Phaser.GameObjects.GameObject;

    constructor(scene: Phaser.Scene, gridX: number, gridY: number, type: UpgradeType, grid: Grid) {
        this.scene = scene;
        this.gridX = gridX;
        this.gridY = gridY;
        this.type = type;

        const worldPos = grid.gridToWorld(gridX, gridY);
        this.graphics = scene.add.graphics();

        if (type === UpgradeType.ROUNDABOUT) {
            // Draw roundabout (circle)
            this.visual = scene.add.circle(
                worldPos.x,
                worldPos.y,
                12,
                0x34495e,
                0.8
            );
            // Add inner circle
            scene.add.circle(
                worldPos.x,
                worldPos.y,
                8,
                0x2c3e50
            );
        } else if (type === UpgradeType.BRIDGE) {
            // Draw bridge (rectangle with lines)
            this.visual = scene.add.rectangle(
                worldPos.x,
                worldPos.y,
                20,
                20,
                0x7f8c8d,
                0.9
            );
            // Add bridge lines
            const lineGraphics = scene.add.graphics();
            lineGraphics.lineStyle(2, 0x95a5a6);
            lineGraphics.lineBetween(worldPos.x - 10, worldPos.y, worldPos.x + 10, worldPos.y);
            lineGraphics.lineBetween(worldPos.x, worldPos.y - 10, worldPos.x, worldPos.y + 10);
        }
    }

    /**
     * Destroy the upgrade
     */
    destroy(): void {
        this.graphics.destroy();
        this.visual.destroy();
    }

    /**
     * Get grid position
     */
    getGridPosition(): { gridX: number; gridY: number } {
        return { gridX: this.gridX, gridY: this.gridY };
    }
}
