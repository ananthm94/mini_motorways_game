import Phaser from 'phaser';
import { Grid } from '../utils/Grid';
import { Road } from '../entities/Road';

export class RoadBuilder {
    private scene: Phaser.Scene;
    private grid: Grid;
    private road: Road;
    private isBuilding: boolean = false;
    private startGridPos: { gridX: number; gridY: number } | null = null;
    private previewGraphics: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, grid: Grid, road: Road) {
        this.scene = scene;
        this.grid = grid;
        this.road = road;
        this.previewGraphics = scene.add.graphics();

        this.setupInput();
    }

    private setupInput(): void {
        // Mouse/touch input for road building
        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (pointer.leftButtonDown()) {
                this.startBuilding(pointer.x, pointer.y);
            }
        });

        this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
            if (this.isBuilding && pointer.isDown) {
                this.updateBuilding(pointer.x, pointer.y);
            } else if (this.isBuilding) {
                this.finishBuilding(pointer.x, pointer.y);
            }
        });

        this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
            if (this.isBuilding) {
                this.finishBuilding(pointer.x, pointer.y);
            }
        });
    }

    private startBuilding(x: number, y: number): void {
        const gridPos = this.grid.worldToGrid(x, y);
        
        if (!this.grid.isValidGridPosition(gridPos.gridX, gridPos.gridY)) {
            return;
        }

        this.isBuilding = true;
        this.startGridPos = gridPos;
    }

    private updateBuilding(x: number, y: number): void {
        if (!this.isBuilding || !this.startGridPos) return;

        const currentGridPos = this.grid.worldToGrid(x, y);
        
        if (!this.grid.isValidGridPosition(currentGridPos.gridX, currentGridPos.gridY)) {
            return;
        }

        // Draw preview
        this.drawPreview(this.startGridPos, currentGridPos);
    }

    private finishBuilding(x: number, y: number): void {
        if (!this.isBuilding || !this.startGridPos) return;

        const endGridPos = this.grid.worldToGrid(x, y);
        
        if (!this.grid.isValidGridPosition(endGridPos.gridX, endGridPos.gridY)) {
            this.cancelBuilding();
            return;
        }

        // Build road path between start and end
        this.buildRoadPath(this.startGridPos, endGridPos);
        
        this.cancelBuilding();
    }

    private cancelBuilding(): void {
        this.isBuilding = false;
        this.startGridPos = null;
        this.previewGraphics.clear();
    }

    private drawPreview(start: { gridX: number; gridY: number }, end: { gridX: number; gridY: number }): void {
        this.previewGraphics.clear();
        this.previewGraphics.lineStyle(3, 0x7f8c8d, 0.5);

        const path = this.getPathBetween(start, end);
        const gridSize = this.grid.getGridSize();

        for (let i = 0; i < path.length - 1; i++) {
            const startWorld = this.grid.gridToWorld(path[i].gridX, path[i].gridY);
            const endWorld = this.grid.gridToWorld(path[i + 1].gridX, path[i + 1].gridY);
            
            this.previewGraphics.lineBetween(
                startWorld.x,
                startWorld.y,
                endWorld.x,
                endWorld.y
            );
        }
    }

    private buildRoadPath(start: { gridX: number; gridY: number }, end: { gridX: number; gridY: number }): void {
        const path = this.getPathBetween(start, end);
        
        for (const segment of path) {
            this.road.addSegment(segment.gridX, segment.gridY);
        }
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
