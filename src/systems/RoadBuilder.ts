import Phaser from 'phaser';
import { Grid } from '../utils/Grid';
import { Road } from '../entities/Road';

export class RoadBuilder {
    private scene: Phaser.Scene;
    private grid: Grid;
    private road: Road;
    private isBuilding: boolean = false;
    private isErasing: boolean = false;
    private lastBuiltPos: { gridX: number; gridY: number } | null = null;
    private previewGraphics: Phaser.GameObjects.Graphics;
    private onEraseCallback?: () => void;
    private checkUpgradeSelected?: () => boolean;

    constructor(scene: Phaser.Scene, grid: Grid, road: Road) {
        this.scene = scene;
        this.grid = grid;
        this.road = road;
        this.previewGraphics = scene.add.graphics();
        this.previewGraphics.setDepth(10);

        this.setupInput();
    }

    setOnErase(callback: () => void): void {
        this.onEraseCallback = callback;
    }

    setUpgradeCheck(callback: () => boolean): void {
        this.checkUpgradeSelected = callback;
    }

    private setupInput(): void {
        // Mouse/touch input for road building
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.rightButtonDown()) {
                // Right click for erasing
                this.isErasing = true;
                this.eraseAt(pointer.x, pointer.y);
            } else if (pointer.leftButtonDown()) {
                this.startBuilding(pointer.x, pointer.y);
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isErasing && pointer.isDown) {
                this.eraseAt(pointer.x, pointer.y);
            } else if (this.isBuilding && pointer.isDown) {
                // Continuously build roads as you drag
                this.continueBuilding(pointer.x, pointer.y);
            }
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isBuilding) {
                this.stopBuilding();
            }
            this.isErasing = false;
        });
    }

    private eraseAt(x: number, y: number): void {
        const gridPos = this.grid.worldToGrid(x, y);
        if (this.grid.isValidGridPosition(gridPos.gridX, gridPos.gridY)) {
            if (this.road.hasSegment(gridPos.gridX, gridPos.gridY)) {
                this.road.removeSegment(gridPos.gridX, gridPos.gridY);
                if (this.onEraseCallback) {
                    this.onEraseCallback();
                }
            }
        }
    }

    private startBuilding(x: number, y: number): void {
        // Don't start building if an upgrade is selected
        if (this.checkUpgradeSelected && this.checkUpgradeSelected()) {
            return;
        }

        const gridPos = this.grid.worldToGrid(x, y);
        
        if (!this.grid.isValidGridPosition(gridPos.gridX, gridPos.gridY)) {
            return;
        }

        this.isBuilding = true;
        this.lastBuiltPos = gridPos;
        
        // Build the first segment immediately
        this.road.addSegment(gridPos.gridX, gridPos.gridY);
        this.road.render();
    }

    private continueBuilding(x: number, y: number): void {
        if (!this.isBuilding || !this.lastBuiltPos) return;

        const currentGridPos = this.grid.worldToGrid(x, y);
        
        if (!this.grid.isValidGridPosition(currentGridPos.gridX, currentGridPos.gridY)) {
            return;
        }

        // If we've moved to a new grid cell, build the path
        if (currentGridPos.gridX !== this.lastBuiltPos.gridX || currentGridPos.gridY !== this.lastBuiltPos.gridY) {
            // Build path from last position to current position
            const path = this.getPathBetween(this.lastBuiltPos, currentGridPos);
            
            // Add all segments in the path
            for (const segment of path) {
                this.road.addSegment(segment.gridX, segment.gridY);
            }
            
            // Update last built position
            this.lastBuiltPos = currentGridPos;
            
            // Re-render roads
            this.road.render();
        }
    }

    private stopBuilding(): void {
        this.isBuilding = false;
        this.lastBuiltPos = null;
        this.previewGraphics.clear();
    }


    /**
     * Get a path between two grid positions (simple line algorithm)
     */
    private getPathBetween(start: { gridX: number; gridY: number }, end: { gridX: number; gridY: number }): Array<{ gridX: number; gridY: number }> {
        const path: Array<{ gridX: number; gridY: number }> = [];
        
        // Use Bresenham-like line algorithm for grid path
        let x0 = start.gridX;
        let y0 = start.gridY;
        const x1 = end.gridX;
        const y1 = end.gridY;

        const dx = Math.abs(x1 - x0);
        const dy = Math.abs(y1 - y0);
        const sx = x0 < x1 ? 1 : -1;
        const sy = y0 < y1 ? 1 : -1;
        let err = dx - dy;

        while (true) {
            path.push({ gridX: x0, gridY: y0 });

            if (x0 === x1 && y0 === y1) break;

            const e2 = 2 * err;
            if (e2 > -dy) {
                err -= dy;
                x0 += sx;
            }
            if (e2 < dx) {
                err += dx;
                y0 += sy;
            }
        }

        return path;
    }

    /**
     * Clean up
     */
    destroy(): void {
        this.previewGraphics.destroy();
    }
}
