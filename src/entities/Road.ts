import Phaser from 'phaser';
import { GameConfig } from '../config/GameConfig';

export interface RoadSegment {
    gridX: number;
    gridY: number;
    neighbors: Set<string>; // "x,y" format
}

export class Road {
    private segments: Map<string, RoadSegment>; // "x,y" -> RoadSegment
    private graphics: Phaser.GameObjects.Graphics;
    private scene: Phaser.Scene;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.segments = new Map();
        this.graphics = scene.add.graphics();
    }

    /**
     * Add a road segment at grid coordinates
     */
    addSegment(gridX: number, gridY: number): boolean {
        const key = `${gridX},${gridY}`;
        
        // Don't add if already exists
        if (this.segments.has(key)) {
            return false;
        }

        const segment: RoadSegment = {
            gridX,
            gridY,
            neighbors: new Set()
        };

        // Connect to adjacent road segments
        const directions = [
            { dx: 0, dy: -1 }, // up
            { dx: 1, dy: 0 },  // right
            { dx: 0, dy: 1 },   // down
            { dx: -1, dy: 0 }   // left
        ];

        for (const dir of directions) {
            const neighborKey = `${gridX + dir.dx},${gridY + dir.dy}`;
            if (this.segments.has(neighborKey)) {
                const neighbor = this.segments.get(neighborKey)!;
                segment.neighbors.add(neighborKey);
                neighbor.neighbors.add(key);
            }
        }

        this.segments.set(key, segment);
        this.render();
        return true;
    }

    /**
     * Remove a road segment at grid coordinates
     */
    removeSegment(gridX: number, gridY: number): boolean {
        const key = `${gridX},${gridY}`;
        const segment = this.segments.get(key);
        
        if (!segment) {
            return false;
        }

        // Remove connections from neighbors
        for (const neighborKey of segment.neighbors) {
            const neighbor = this.segments.get(neighborKey);
            if (neighbor) {
                neighbor.neighbors.delete(key);
            }
        }

        // Remove the segment
        this.segments.delete(key);
        this.render();
        return true;
    }

    /**
     * Check if a road segment exists at grid coordinates
     */
    hasSegment(gridX: number, gridY: number): boolean {
        return this.segments.has(`${gridX},${gridY}`);
    }

    /**
     * Get all road segments
     */
    getAllSegments(): RoadSegment[] {
        return Array.from(this.segments.values());
    }

    /**
     * Get neighbors of a road segment
     */
    getNeighbors(gridX: number, gridY: number): Array<{ gridX: number; gridY: number }> {
        const key = `${gridX},${gridY}`;
        const segment = this.segments.get(key);
        if (!segment) return [];

        return Array.from(segment.neighbors).map(neighborKey => {
            const [x, y] = neighborKey.split(',').map(Number);
            return { gridX: x, gridY: y };
        });
    }

    /**
     * Render all road segments as connected lines
     */
    render(): void {
        this.graphics.clear();
        this.graphics.lineStyle(GameConfig.ROAD_WIDTH, GameConfig.ROAD_COLOR, 1);
        this.graphics.setDepth(0);

        const gridSize = GameConfig.GRID_SIZE;
        const drawnLines = new Set<string>();

        for (const segment of this.segments.values()) {
            const x = segment.gridX * gridSize + gridSize / 2;
            const y = segment.gridY * gridSize + gridSize / 2;

            // Draw lines to all neighbors
            for (const neighbor of segment.neighbors) {
                const lineKey = [segment.gridX, segment.gridY, ...neighbor.split(',').map(Number)].sort().join(',');
                
                if (!drawnLines.has(lineKey)) {
                    const neighborSegment = this.segments.get(neighbor);
                    if (neighborSegment) {
                        const nx = neighborSegment.gridX * gridSize + gridSize / 2;
                        const ny = neighborSegment.gridY * gridSize + gridSize / 2;
                        
                        this.graphics.lineBetween(x, y, nx, ny);
                        drawnLines.add(lineKey);
                    }
                }
            }

            // If no neighbors, draw a small dot
            if (segment.neighbors.size === 0) {
                this.graphics.fillStyle(GameConfig.ROAD_COLOR);
                this.graphics.fillCircle(x, y, GameConfig.ROAD_WIDTH / 4);
            }
        }
    }

    /**
     * Clear all roads
     */
    clear(): void {
        this.segments.clear();
        this.graphics.clear();
    }

    /**
     * Get road graph for pathfinding (returns adjacency list)
     */
    getGraph(): Map<string, string[]> {
        const graph = new Map<string, string[]>();
        
        for (const segment of this.segments.values()) {
            const key = `${segment.gridX},${segment.gridY}`;
            graph.set(key, Array.from(segment.neighbors));
        }
        
        return graph;
    }
}
