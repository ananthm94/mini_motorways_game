import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';
import { Grid } from '../utils/Grid';
import { Road } from '../entities/Road';
import { House } from '../entities/House';
import { Destination } from '../entities/Destination';
import { Car } from '../entities/Car';
import { Pathfinding } from '../utils/Pathfinding';
import { ColorManager } from '../utils/ColorManager';

export class TrafficManager {
    private scene: Phaser.Scene;
    private grid: Grid;
    private road: Road;
    private cars: Car[] = [];
    private houseSpawnTimers: Map<House, Phaser.Time.TimerEvent> = new Map();
    private trackedHouses: Set<House> = new Set();

    constructor(scene: Phaser.Scene, grid: Grid, road: Road) {
        this.scene = scene;
        this.grid = grid;
        this.road = road;
    }

    /**
     * Start traffic system
     */
    start(houses: House[], destinations: Destination[]): void {
        // Set up spawn timers for each house
        for (const house of houses) {
            this.setupHouseSpawner(house, destinations);
        }
    }

    /**
     * Update all cars (called in game loop)
     */
    update(time: number, delta: number, destinations: Destination[]): void {
        // Update all cars
        for (let i = this.cars.length - 1; i >= 0; i--) {
            const car = this.cars[i];
            const reachedDestination = car.update(delta);

            if (reachedDestination) {
                // Car reached its destination
                const dest = this.findDestinationForCar(car, destinations);
                if (dest) {
                    dest.removeWaitingCar();
                }
                car.destroy();
                this.cars.splice(i, 1);
            }
        }
    }

    /**
     * Setup spawner for a house
     */
    private setupHouseSpawner(house: House, destinations: Destination[]): void {
        const spawnCar = () => {
            // Find matching destination
            const matchingDestinations = destinations.filter(
                dest => ColorManager.colorsMatch(dest.color, house.color)
            );

            if (matchingDestinations.length === 0) {
                // No matching destination, try again later
                this.scene.time.delayedCall(GameConfig.CAR_SPAWN_DELAY, spawnCar);
                return;
            }

            // Find a reachable destination
            const houseGridPos = house.getGridPosition();
            const nearestRoad = Pathfinding.findNearestRoad(this.road, houseGridPos, 3);

            if (!nearestRoad) {
                // House not connected to road network, try again later
                this.scene.time.delayedCall(GameConfig.CAR_SPAWN_DELAY, spawnCar);
                return;
            }

            // Try to find path to a matching destination
            let targetDestination: Destination | null = null;
            let path: Array<{ gridX: number; gridY: number }> = [];

            for (const dest of matchingDestinations) {
                const destGridPos = dest.getGridPosition();
                const destNearestRoad = Pathfinding.findNearestRoad(this.road, destGridPos, 3);

                if (destNearestRoad) {
                    const testPath = Pathfinding.findPath(this.road, nearestRoad, destNearestRoad);
                    if (testPath.length > 0) {
                        targetDestination = dest;
                        path = testPath;
                        break;
                    }
                }
            }

            if (targetDestination && path.length > 0) {
                // Spawn car
                const worldPos = this.grid.gridToWorld(nearestRoad.gridX, nearestRoad.gridY);
                const car = new Car(this.scene, worldPos.x, worldPos.y, house.color);
                
                // Add destination as final waypoint if not already in path
                const destGridPos = targetDestination.getGridPosition();
                const destNearestRoad = Pathfinding.findNearestRoad(this.road, destGridPos, 3);
                if (destNearestRoad) {
                    // Check if destination road is already in path
                    const lastPathNode = path[path.length - 1];
                    if (lastPathNode.gridX !== destNearestRoad.gridX || lastPathNode.gridY !== destNearestRoad.gridY) {
                        path.push(destNearestRoad);
                    }
                }
                
                car.setPath(path);
                car.targetDestination = targetDestination.getGridPosition();
                this.cars.push(car);

                // Add to destination waiting count
                targetDestination.addWaitingCar();

                // Schedule next spawn
                this.scene.time.delayedCall(GameConfig.CAR_SPAWN_DELAY, spawnCar);
            } else {
                // No path found, try again later
                this.scene.time.delayedCall(GameConfig.CAR_SPAWN_DELAY, spawnCar);
            }
        };

        // Start spawning after initial delay
        this.scene.time.delayedCall(GameConfig.CAR_SPAWN_DELAY, spawnCar);
    }

    /**
     * Find destination for a car (by matching target)
     */
    private findDestinationForCar(car: Car, destinations: Destination[]): Destination | null {
        if (!car.targetDestination) return null;

        return destinations.find(dest => {
            const pos = dest.getGridPosition();
            return pos.gridX === car.targetDestination!.gridX && pos.gridY === car.targetDestination!.gridY;
        }) || null;
    }

    /**
     * Add a new house to the traffic system
     */
    addHouse(house: House, destinations: Destination[]): void {
        // Only add if not already tracked
        if (!this.trackedHouses.has(house)) {
            this.trackedHouses.add(house);
            this.setupHouseSpawner(house, destinations);
        }
    }

    /**
     * Get all cars
     */
    getCars(): Car[] {
        return this.cars;
    }

    /**
     * Clean up
     */
    destroy(): void {
        for (const timer of this.houseSpawnTimers.values()) {
            timer.destroy();
        }
        this.houseSpawnTimers.clear();

        for (const car of this.cars) {
            car.destroy();
        }
        this.cars = [];
    }
}
