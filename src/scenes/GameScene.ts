import Phaser from 'phaser';
import { Grid } from '../utils/Grid';
import { Road } from '../entities/Road';
import { RoadBuilder } from '../systems/RoadBuilder';
import { SpawnManager } from '../systems/SpawnManager';
import { TrafficManager } from '../systems/TrafficManager';
import { GameStateManager, GameState } from '../systems/GameState';
import { UpgradeManager } from '../systems/UpgradeManager';
import { UpgradeType } from '../entities/Upgrade';
import { GameConfig } from '../config/GameConfig';
import { Pathfinding } from '../utils/Pathfinding';

export class GameScene extends Phaser.Scene {
    private grid!: Grid;
    private road!: Road;
    private roadBuilder!: RoadBuilder;
    private spawnManager!: SpawnManager;
    private trafficManager!: TrafficManager;
    private gameState!: GameStateManager;
    private upgradeManager!: UpgradeManager;

    // UI elements
    private scoreText!: Phaser.GameObjects.Text;
    private upgradeButtons: Phaser.GameObjects.Rectangle[] = [];
    private upgradeButtonTexts: Phaser.GameObjects.Text[] = [];
    private gameOverPanel!: Phaser.GameObjects.Container | null;
    private roundaboutButton!: Phaser.GameObjects.Rectangle;
    private bridgeButton!: Phaser.GameObjects.Rectangle;

    // Upgrade earning
    private upgradeEarnTimer: Phaser.Time.TimerEvent | null = null;
    private roundaboutCount: number = 0;
    private bridgeCount: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width, height } = this.cameras.main;
        
        // Set background color
        this.cameras.main.setBackgroundColor(0x2c3e50);

        // Initialize systems
        this.grid = new Grid();
        this.road = new Road(this);
        this.roadBuilder = new RoadBuilder(this, this.grid, this.road);
        this.spawnManager = new SpawnManager(this, this.grid, this.road);
        this.trafficManager = new TrafficManager(this, this.grid, this.road);
        this.gameState = new GameStateManager();
        this.upgradeManager = new UpgradeManager(this, this.grid, this.road);

        // Setup game state callbacks
        this.gameState.setOnStateChange((state) => {
            if (state === GameState.GAME_OVER) {
                this.showGameOver();
            }
        });

        this.gameState.setOnScoreChange((score) => {
            this.updateScoreDisplay(score);
        });

        // Create UI
        this.createUI();

        // Start game
        this.gameState.startGame();
        this.spawnManager.start();
        
        // Start traffic manager (will handle houses as they spawn)
        this.trafficManager.start(
            this.spawnManager.getHouses(),
            this.spawnManager.getDestinations()
        );

        // Start upgrade earning timer (earn one every 20 seconds, start with 1 of each)
        this.roundaboutCount = 1;
        this.bridgeCount = 1;
        this.updateUpgradeButtons();
        
        this.upgradeEarnTimer = this.time.addEvent({
            delay: 20000,
            callback: () => {
                this.roundaboutCount++;
                this.bridgeCount++;
                this.updateUpgradeButtons();
            },
            loop: true
        });

        // Handle upgrade placement clicks (separate from road building)
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.gameState.getState() !== GameState.PLAYING) return;

            const selectedUpgrade = this.upgradeManager.getSelectedUpgrade();
            if (selectedUpgrade && pointer.rightButtonDown() === false) {
                const gridPos = this.grid.worldToGrid(pointer.x, pointer.y);
                if (this.grid.isValidGridPosition(gridPos.gridX, gridPos.gridY)) {
                    const placed = this.upgradeManager.placeUpgrade(gridPos.gridX, gridPos.gridY);
                    if (placed) {
                        // Consume upgrade
                        if (selectedUpgrade === UpgradeType.ROUNDABOUT) {
                            this.roundaboutCount = Math.max(0, this.roundaboutCount - 1);
                        } else if (selectedUpgrade === UpgradeType.BRIDGE) {
                            this.bridgeCount = Math.max(0, this.bridgeCount - 1);
                        }
                        this.updateUpgradeButtons();
                        this.upgradeManager.selectUpgrade(null);
                    }
                }
            }
        });

        // Handle new spawns (add to traffic manager)
        this.time.addEvent({
            delay: 2000,
            callback: () => {
                const houses = this.spawnManager.getHouses();
                const destinations = this.spawnManager.getDestinations();
                // Add new houses to traffic manager
                for (const house of houses) {
                    this.trafficManager.addHouse(house, destinations);
                }
            },
            loop: true
        });
    }

    update(time: number, delta: number) {
        if (this.gameState.getState() !== GameState.PLAYING) return;

        // Update traffic
        const destinations = this.spawnManager.getDestinations();
        const carsBefore = this.trafficManager.getCars().length;
        this.trafficManager.update(time, delta, destinations);
        const carsAfter = this.trafficManager.getCars().length;
        
        // Award points for successful deliveries (when cars are removed)
        const deliveries = carsBefore - carsAfter;
        if (deliveries > 0) {
            this.gameState.addScore(deliveries * GameConfig.POINTS_PER_DELIVERY);
        }

        // Check game over condition
        if (this.gameState.checkGameOver(destinations)) {
            this.gameState.endGame();
        }
    }

    private createUI() {
        const { width } = this.cameras.main;

        // Score display
        this.scoreText = this.add.text(20, 20, 'Score: 0', {
            fontSize: '24px',
            color: '#ecf0f1',
            fontFamily: 'Arial'
        });

        // Upgrade buttons
        const buttonY = 60;
        const buttonWidth = 120;
        const buttonHeight = 40;
        const buttonSpacing = 10;

        // Roundabout button
        this.roundaboutButton = this.add.rectangle(
            width - 150,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x3498db
        )
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (this.roundaboutCount > 0) {
                this.upgradeManager.selectUpgrade(UpgradeType.ROUNDABOUT);
                this.updateUpgradeButtons();
            }
        });

        // Bridge button
        this.bridgeButton = this.add.rectangle(
            width - 150,
            buttonY + buttonHeight + buttonSpacing,
            buttonWidth,
            buttonHeight,
            0x95a5a6
        )
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => {
            if (this.bridgeCount > 0) {
                this.upgradeManager.selectUpgrade(UpgradeType.BRIDGE);
                this.updateUpgradeButtons();
            }
        });

        // Store button text references for updating
        this.upgradeButtonTexts.push(
            this.add.text(width - 150, buttonY, 'Roundabout (0)', { fontSize: '14px', color: '#ffffff', fontFamily: 'Arial' }).setOrigin(0.5),
            this.add.text(width - 150, buttonY + buttonHeight + buttonSpacing, 'Bridge (0)', { fontSize: '14px', color: '#ffffff', fontFamily: 'Arial' }).setOrigin(0.5)
        );

        this.updateUpgradeButtons();
    }

    private updateScoreDisplay(score: number) {
        this.scoreText.setText(`Score: ${score}`);
    }

    private updateUpgradeButtons() {
        const roundaboutText = this.upgradeButtonTexts[0];
        const bridgeText = this.upgradeButtonTexts[1];

        roundaboutText.setText(`Roundabout (${this.roundaboutCount})`);
        bridgeText.setText(`Bridge (${this.bridgeCount})`);

        // Update button colors based on availability and selection
        const selectedUpgrade = this.upgradeManager.getSelectedUpgrade();
        
        if (this.roundaboutCount > 0) {
            this.roundaboutButton.setFillStyle(
                selectedUpgrade === UpgradeType.ROUNDABOUT ? 0x2980b9 : 0x3498db
            );
        } else {
            this.roundaboutButton.setFillStyle(0x7f8c8d);
        }

        if (this.bridgeCount > 0) {
            this.bridgeButton.setFillStyle(
                selectedUpgrade === UpgradeType.BRIDGE ? 0x7f8c8d : 0x95a5a6
            );
        } else {
            this.bridgeButton.setFillStyle(0x7f8c8d);
        }
    }

    private showGameOver() {
        const { width, height } = this.cameras.main;

        // Create semi-transparent overlay
        const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);

        // Game over panel
        const panel = this.add.rectangle(width / 2, height / 2, 400, 300, 0x34495e);
        
        const gameOverText = this.add.text(width / 2, height / 2 - 80, 'Game Over!', {
            fontSize: '36px',
            color: '#ecf0f1',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const scoreText = this.add.text(width / 2, height / 2 - 20, `Final Score: ${this.gameState.getScore()}`, {
            fontSize: '24px',
            color: '#ecf0f1',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        const timeText = this.add.text(width / 2, height / 2 + 20, `Time: ${Math.floor(this.gameState.getElapsedTime())}s`, {
            fontSize: '20px',
            color: '#bdc3c7',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Restart button
        const restartButton = this.add.rectangle(width / 2, height / 2 + 80, 200, 50, 0x3498db)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.restart();
            });

        this.add.text(width / 2, height / 2 + 80, 'Restart', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Menu button
        const menuButton = this.add.rectangle(width / 2, height / 2 + 140, 200, 50, 0x95a5a6)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('MenuScene');
            });

        this.add.text(width / 2, height / 2 + 140, 'Menu', {
            fontSize: '20px',
            color: '#ffffff',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.gameOverPanel = this.add.container(0, 0, [
            overlay,
            panel,
            gameOverText,
            scoreText,
            timeText,
            restartButton,
            menuButton
        ]);
    }
}
