import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export class Car {
    public scene: Phaser.Scene;
    public x: number;
    public y: number;
    public color: number;
    public targetDestination: { gridX: number; gridY: number } | null = null;
    public path: Array<{ gridX: number; gridY: number }> = [];
    public currentPathIndex: number = 0;
    public speed: number = GameConfig.CAR_SPEED;
    private graphics: Phaser.GameObjects.Graphics;
    private carShape: Phaser.GameObjects.Rectangle;
    private isMoving: boolean = false;
    private lastX: number;
    private lastY: number;

    constructor(scene: Phaser.Scene, x: number, y: number, color: number) {
        this.scene = scene;
        this.x = x;
        this.y = y;
        this.color = color;

        // Create visual representation
        this.graphics = scene.add.graphics();
        this.lastX = x;
        this.lastY = y;
        // Make car slightly smaller and add border for better visibility
        this.carShape = scene.add.rectangle(
            x,
            y,
            6,
            6,
            color
        );
        this.carShape.setStrokeStyle(1, 0x000000, 0.3);
    }

    /**
     * Set the path for the car to follow
     */
    setPath(path: Array<{ gridX: number; gridY: number }>): void {
        this.path = path;
        this.currentPathIndex = 0;
        this.isMoving = path.length > 0;
    }

    /**
     * Update car position (called in game loop)
     */
    update(delta: number): boolean {
        if (!this.isMoving || this.path.length === 0) {
            return false;
        }

        if (this.currentPathIndex >= this.path.length) {
            // Reached destination
            this.isMoving = false;
            return true; // Signal that car reached destination
        }

        const target = this.path[this.currentPathIndex];
        const gridSize = GameConfig.GRID_SIZE;
        const targetX = target.gridX * gridSize + gridSize / 2;
        const targetY = target.gridY * gridSize + gridSize / 2;

        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 3) {
            // Reached current waypoint, move to next
            this.currentPathIndex++;
            if (this.currentPathIndex >= this.path.length) {
                this.isMoving = false;
                return true; // Reached destination
            }
        } else {
            // Move towards current waypoint
            const moveDistance = (this.speed * delta) / 1000;
            const moveX = (dx / distance) * moveDistance;
            const moveY = (dy / distance) * moveDistance;

            this.lastX = this.x;
            this.lastY = this.y;
            this.x += moveX;
            this.y += moveY;
        }

        // Update visual position
        this.carShape.setPosition(this.x, this.y);
        
        // Rotate car based on movement direction
        const dx2 = this.x - this.lastX;
        const dy2 = this.y - this.lastY;
        if (Math.abs(dx2) > 0.1 || Math.abs(dy2) > 0.1) {
            const angle = Math.atan2(dy2, dx2);
            this.carShape.setRotation(angle);
        }

        return false; // Still moving
    }

    /**
     * Check if car has reached its destination
     */
    hasReachedDestination(): boolean {
        return !this.isMoving && this.currentPathIndex >= this.path.length;
    }

    /**
     * Stop the car (for queuing)
     */
    stop(): void {
        // Car will stop naturally when path is blocked
    }

    /**
     * Destroy the car
     */
    destroy(): void {
        this.graphics.destroy();
        this.carShape.destroy();
    }

    /**
     * Get current position
     */
    getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }
}
