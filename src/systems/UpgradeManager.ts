import Phaser from 'phaser';
import { Grid } from '../utils/Grid';
import { Road } from '../entities/Road';
import { Upgrade, UpgradeType } from '../entities/Upgrade';

export class UpgradeManager {
    private scene: Phaser.Scene;
    private grid: Grid;
    private road: Road;
    private upgrades: Upgrade[] = [];
    private selectedUpgradeType: UpgradeType | null = null;
    private upgradeCounts: Map<UpgradeType, number> = new Map();

    constructor(scene: Phaser.Scene, grid: Grid, road: Road) {
        this.scene = scene;
        this.grid = grid;
        this.road = road;
        
        // Initialize upgrade counts
        this.upgradeCounts.set(UpgradeType.ROUNDABOUT, 0);
        this.upgradeCounts.set(UpgradeType.BRIDGE, 0);
    }

    /**
     * Select an upgrade type for placement
     */
    selectUpgrade(type: UpgradeType | null): void {
        this.selectedUpgradeType = type;
    }

    /**
     * Get selected upgrade type
     */
    getSelectedUpgrade(): UpgradeType | null {
        return this.selectedUpgradeType;
    }

    /**
     * Place upgrade at grid position
     */
    placeUpgrade(gridX: number, gridY: number): boolean {
        if (!this.selectedUpgradeType) {
            return false;
        }

        // Check if position is valid (on a road)
        if (!this.road.hasSegment(gridX, gridY)) {
            return false;
        }

        // Check if upgrade already exists at this position
        if (this.hasUpgradeAt(gridX, gridY)) {
            return false;
        }

        const upgrade = new Upgrade(this.scene, gridX, gridY, this.selectedUpgradeType, this.grid);
        this.upgrades.push(upgrade);
        
        // Update count
        const currentCount = this.upgradeCounts.get(this.selectedUpgradeType) || 0;
        this.upgradeCounts.set(this.selectedUpgradeType, currentCount + 1);

        // Apply upgrade effects
        this.applyUpgradeEffects(upgrade);

        return true;
    }

    /**
     * Check if upgrade exists at position
     */
    hasUpgradeAt(gridX: number, gridY: number): boolean {
        return this.upgrades.some(upgrade => {
            const pos = upgrade.getGridPosition();
            return pos.gridX === gridX && pos.gridY === gridY;
        });
    }

    /**
     * Get upgrade at position
     */
    getUpgradeAt(gridX: number, gridY: number): Upgrade | null {
        return this.upgrades.find(upgrade => {
            const pos = upgrade.getGridPosition();
            return pos.gridX === gridX && pos.gridY === gridY;
        }) || null;
    }

    /**
     * Apply upgrade effects (for now, just visual - traffic logic handled elsewhere)
     */
    private applyUpgradeEffects(upgrade: Upgrade): void {
        // Roundabouts and bridges are primarily visual/structural
        // Traffic flow improvements are handled in pathfinding/traffic systems
    }

    /**
     * Get all upgrades
     */
    getUpgrades(): Upgrade[] {
        return this.upgrades;
    }

    /**
     * Get upgrade count for a type
     */
    getUpgradeCount(type: UpgradeType): number {
        return this.upgradeCounts.get(type) || 0;
    }

    /**
     * Award upgrade (called when player earns one)
     */
    awardUpgrade(type: UpgradeType): void {
        // Upgrades are earned over time or by score
        // For now, we'll handle this in the UI
    }

    /**
     * Clean up
     */
    destroy(): void {
        for (const upgrade of this.upgrades) {
            upgrade.destroy();
        }
        this.upgrades = [];
    }
}
