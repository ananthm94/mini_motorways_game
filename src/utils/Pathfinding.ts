import { Road } from '../entities/Road';

interface PathNode {
    key: string;
    gridX: number;
    gridY: number;
    g: number; // cost from start
    h: number; // heuristic cost to goal
    f: number; // total cost
    parent: PathNode | null;
}

export class Pathfinding {
    /**
     * Find path using A* algorithm
     * @param road Road network
     * @param start Starting grid position
     * @param end Ending grid position
     * @returns Array of grid positions representing the path, or empty array if no path found
     */
    static findPath(
        road: Road,
        start: { gridX: number; gridY: number },
        end: { gridX: number; gridY: number }
    ): Array<{ gridX: number; gridY: number }> {
        const startKey = `${start.gridX},${start.gridY}`;
        const endKey = `${end.gridX},${end.gridY}`;

        // Check if start and end are on roads
        if (!road.hasSegment(start.gridX, start.gridY) || !road.hasSegment(end.gridX, end.gridY)) {
            return [];
        }

        // If start and end are the same
        if (startKey === endKey) {
            return [{ gridX: start.gridX, gridY: start.gridY }];
        }

        const openSet: Map<string, PathNode> = new Map();
        const closedSet: Set<string> = new Set();

        const startNode: PathNode = {
            key: startKey,
            gridX: start.gridX,
            gridY: start.gridY,
            g: 0,
            h: this.heuristic(start, end),
            f: 0,
            parent: null
        };
        startNode.f = startNode.g + startNode.h;

        openSet.set(startKey, startNode);

        while (openSet.size > 0) {
            // Get node with lowest f score
            let current: PathNode | null = null;
            let lowestF = Infinity;

            for (const node of openSet.values()) {
                if (node.f < lowestF) {
                    lowestF = node.f;
                    current = node;
                }
            }

            if (!current) break;

            const currentKey = current.key;

            // Check if we reached the goal
            if (currentKey === endKey) {
                return this.reconstructPath(current);
            }

            // Move current from open to closed
            openSet.delete(currentKey);
            closedSet.add(currentKey);

            // Check neighbors
            const neighbors = road.getNeighbors(current.gridX, current.gridY);

            for (const neighbor of neighbors) {
                const neighborKey = `${neighbor.gridX},${neighbor.gridY}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeG = current.g + 1; // Each step costs 1

                let neighborNode = openSet.get(neighborKey);

                if (!neighborNode) {
                    neighborNode = {
                        key: neighborKey,
                        gridX: neighbor.gridX,
                        gridY: neighbor.gridY,
                        g: tentativeG,
                        h: this.heuristic(neighbor, end),
                        f: 0,
                        parent: current
                    };
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    openSet.set(neighborKey, neighborNode);
                } else if (tentativeG < neighborNode.g) {
                    // Found a better path to this neighbor
                    neighborNode.g = tentativeG;
                    neighborNode.f = neighborNode.g + neighborNode.h;
                    neighborNode.parent = current;
                }
            }
        }

        // No path found
        return [];
    }

    /**
     * Heuristic function (Manhattan distance)
     */
    private static heuristic(a: { gridX: number; gridY: number }, b: { gridX: number; gridY: number }): number {
        return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridY - b.gridY);
    }

    /**
     * Reconstruct path from goal to start
     */
    private static reconstructPath(node: PathNode): Array<{ gridX: number; gridY: number }> {
        const path: Array<{ gridX: number; gridY: number }> = [];
        let current: PathNode | null = node;

        while (current) {
            path.unshift({ gridX: current.gridX, gridY: current.gridY });
            current = current.parent;
        }

        return path;
    }

    /**
     * Find nearest road segment to a grid position
     */
    static findNearestRoad(
        road: Road,
        position: { gridX: number; gridY: number },
        maxDistance: number = 5
    ): { gridX: number; gridY: number } | null {
        const segments = road.getAllSegments();
        let nearest: { gridX: number; gridY: number } | null = null;
        let minDistance = Infinity;

        for (const segment of segments) {
            const distance = Math.abs(segment.gridX - position.gridX) + Math.abs(segment.gridY - position.gridY);
            if (distance < minDistance && distance <= maxDistance) {
                minDistance = distance;
                nearest = { gridX: segment.gridX, gridY: segment.gridY };
            }
        }

        return nearest;
    }
}
