import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Grid } from '../utils/Grid';
import { ColorManager } from '../utils/ColorManager';
import { House } from '../entities/House';
import { Destination } from '../entities/Destination';
import { Road } from '../entities/Road';

export class SpawnManager {
    private scene: Phaser.Scene;
    private grid: Grid;
    private road: Road;
    private houses: House[] = [];
    private destinations: Destination[] = [];
    private spawnTimer: Phaser.Time.TimerEvent | null = null;
    private currentSpawnInterval: number;
    private gameStartTime: number = 0;

    constructor(scene: Phaser.Scene, grid: Grid, road: Road) {
        this.scene = scene;
        this.grid = grid;
        this.road = road;
        this.currentSpawnInterval = GameConfig.SPAWN_INTERVAL;
    }

    /**
     * Start spawning buildings
     */
    start(): void {
        this.gameStartTime = this.scene.time.now;
        
        // Initial spawn after delay
        this.scene.time.delayedCall(GameConfig.INITIAL_SPAWN_DELAY, () => {
            this.spawnBuilding();
            this.scheduleNextSpawn();
        });
    }

    private scheduleNextSpawn(): void {
        // Decrease spawn interval over time (increase difficulty)
        this.currentSpawnInterval = Math.max(
            GameConfig.MIN_SPAWN_INTERVAL,
            this.currentSpawnInterval - GameConfig.SPAWN_INTERVAL_DECREASE
        );

        this.spawnTimer = this.scene.time.delayedCall(this.currentSpawnInterval, () => {
            this.spawnBuilding();
            this.scheduleNextSpawn();
        });
    }

    private spawnBuilding(): void {
        // Alternate between house and destination
        const shouldSpawnHouse = this.houses.length <= this.destinations.length;
        
        if (shouldSpawnHouse) {
            this.spawnHouse();
        } else {
            this.spawnDestination();
        }
    }

    private spawnHouse(): void {
        const position = this.findValidSpawnPosition();
        if (!position) {
            // No valid position found, skip this spawn
            return;
        }

        const color = ColorManager.getRandomColor();
        const house = new House(this.scene, position.gridX, position.gridY, color, this.grid);
        this.houses.push(house);
    }

    private spawnDestination(): void {
        const position = this.findValidSpawnPosition();
        if (!position) {
            // No valid position found, skip this spawn
            return;
        }

        // Try to match an existing house color, or use random
        let color = ColorManager.getRandomColor();
        
        // 70% chance to match an existing house color
        if (Math.random() < 0.7 && this.houses.length > 0) {
            const randomHouse = this.houses[Math.floor(Math.random() * this.houses.length)];
            color = randomHouse.color;
        }

        const destination = new Destination(this.scene, position.gridX, position.gridY, color, this.grid);
        this.destinations.push(destination);
    }

    private findValidSpawnPosition(): { gridX: number; gridY: number } | null {
        const { width, height } = this.grid.getDimensions();
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const gridX = Math.floor(Math.random() * width);
            const gridY = Math.floor(Math.random() * height);

            // Check if position is valid (not on a road, not too close to other buildings)
            if (this.isValidSpawnPosition(gridX, gridY)) {
                return { gridX, gridY };
            }
        }

        return null; // Could not find valid position
    }

    private isValidSpawnPosition(gridX: number, gridY: number): boolean {
        // Don't spawn on roads
        if (this.road.hasSegment(gridX, gridY)) {
            return false;
        }

        // Don't spawn too close to other buildings (minimum 3 cells away)
        const minDistance = 3;
        
        for (const house of this.houses) {
            const distance = Math.abs(house.gridX - gridX) + Math.abs(house.gridY - gridY);
            if (distance < minDistance) {
                return false;
            }
        }

        for (const destination of this.destinations) {
            const distance = Math.abs(destination.gridX - gridX) + Math.abs(destination.gridY - gridY);
            if (distance < minDistance) {
                return false;
            }
        }

        return true;
    }

    /**
     * Get all houses
     */
    getHouses(): House[] {
        return this.houses;
    }

    /**
     * Get all destinations
     */
    getDestinations(): Destination[] {
        return this.destinations;
    }

    /**
     * Get destinations matching a color
     */
    getDestinationsByColor(color: number): Destination[] {
        return this.destinations.filter(dest => dest.color === color);
    }

    /**
     * Clean up
     */
    destroy(): void {
        if (this.spawnTimer) {
            this.spawnTimer.destroy();
        }
        
        for (const house of this.houses) {
            house.destroy();
        }
        
        for (const destination of this.destinations) {
            destination.destroy();
        }
        
        this.houses = [];
        this.destinations = [];
    }
}
