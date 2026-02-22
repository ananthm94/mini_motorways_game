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
    private upgradeButtonTexts: Phaser.GameObjects.Text[] = [];
    private gameOverPanel!: Phaser.GameObjects.Container | null;
    private roundaboutButton!: Phaser.GameObjects.Rectangle;
    private bridgeButton!: Phaser.GameObjects.Rectangle;
    private warningAlert!: Phaser.GameObjects.Container | null;
    private lastWarningTime: number = 0;

    // Upgrade earning
    private upgradeEarnTimer: Phaser.Time.TimerEvent | null = null;
    private roundaboutCount: number = 0;
    private bridgeCount: number = 0;

    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        const { width } = this.cameras.main;
        
        // Set background color
        this.cameras.main.setBackgroundColor(0x2c3e50);

        // Initialize systems
        this.grid = new Grid();
        this.road = new Road(this);
        this.roadBuilder = new RoadBuilder(this, this.grid, this.road);
        this.roadBuilder.setOnErase(() => {
            // Re-render roads after erase
            this.road.render();
        });
        this.roadBuilder.setUpgradeCheck(() => {
            // Return true if an upgrade is selected
            return this.upgradeManager.getSelectedUpgrade() !== null;
        });
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
        // This is handled in RoadBuilder, but we need to check for upgrade placement
        // Upgrade placement happens on left click when an upgrade is selected
        this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (this.gameState.getState() !== GameState.PLAYING) return;
            
            // Don't interfere with road building or erasing
            if (pointer.rightButtonDown()) return;

            const selectedUpgrade = this.upgradeManager.getSelectedUpgrade();
            if (selectedUpgrade) {
                // Check if clicking on UI buttons (don't place upgrade)
                const buttonX = this.cameras.main.width - 160;
                const buttonY = 100;
                const buttonWidth = 140;
                const buttonHeight = 45;
                const buttonSpacing = 12;
                
                const clickX = pointer.x;
                const clickY = pointer.y;
                
                // Check if click is on upgrade buttons
                const onRoundaboutButton = clickX >= buttonX - buttonWidth/2 && clickX <= buttonX + buttonWidth/2 &&
                                         clickY >= buttonY - buttonHeight/2 && clickY <= buttonY + buttonHeight/2;
                const onBridgeButton = clickX >= buttonX - buttonWidth/2 && clickX <= buttonX + buttonWidth/2 &&
                                      clickY >= (buttonY + buttonHeight + buttonSpacing) - buttonHeight/2 && 
                                      clickY <= (buttonY + buttonHeight + buttonSpacing) + buttonHeight/2;
                
                if (!onRoundaboutButton && !onBridgeButton) {
                    // Place upgrade
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

        // Check for warnings (too many cars waiting)
        this.checkWarnings(destinations, time);

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
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setDepth(100);

        // Instructions
        this.add.text(20, 50, 'Left-click: Build roads | Right-click: Erase', {
            fontSize: '14px',
            color: '#bdc3c7',
            fontFamily: 'Arial'
        }).setDepth(100);

        // Upgrade buttons
        const buttonY = 100;
        const buttonWidth = 140;
        const buttonHeight = 45;
        const buttonSpacing = 12;

        // Roundabout button
        this.roundaboutButton = this.add.rectangle(
            width - 160,
            buttonY,
            buttonWidth,
            buttonHeight,
            0x3498db
        )
        .setInteractive({ useHandCursor: true })
        .setDepth(100)
        .on('pointerdown', () => {
            if (this.roundaboutCount > 0) {
                const current = this.upgradeManager.getSelectedUpgrade();
                if (current === UpgradeType.ROUNDABOUT) {
                    // Deselect if already selected
                    this.upgradeManager.selectUpgrade(null);
                } else {
                    this.upgradeManager.selectUpgrade(UpgradeType.ROUNDABOUT);
                }
                this.updateUpgradeButtons();
            }
        })
        .on('pointerover', () => {
            if (this.roundaboutCount > 0) {
                this.roundaboutButton.setFillStyle(0x2980b9);
            }
        })
        .on('pointerout', () => {
            this.updateUpgradeButtons();
        });

        // Bridge button
        this.bridgeButton = this.add.rectangle(
            width - 160,
            buttonY + buttonHeight + buttonSpacing,
            buttonWidth,
            buttonHeight,
            0x95a5a6
        )
        .setInteractive({ useHandCursor: true })
        .setDepth(100)
        .on('pointerdown', () => {
            if (this.bridgeCount > 0) {
                const current = this.upgradeManager.getSelectedUpgrade();
                if (current === UpgradeType.BRIDGE) {
                    // Deselect if already selected
                    this.upgradeManager.selectUpgrade(null);
                } else {
                    this.upgradeManager.selectUpgrade(UpgradeType.BRIDGE);
                }
                this.updateUpgradeButtons();
            }
        })
        .on('pointerover', () => {
            if (this.bridgeCount > 0) {
                this.bridgeButton.setFillStyle(0x7f8c8d);
            }
        })
        .on('pointerout', () => {
            this.updateUpgradeButtons();
        });

        // Store button text references for updating (on top of buttons)
        const roundaboutText = this.add.text(width - 160, buttonY, 'Roundabout (0)', { 
            fontSize: '16px', 
            color: '#ffffff', 
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);
        
        const bridgeText = this.add.text(width - 160, buttonY + buttonHeight + buttonSpacing, 'Bridge (0)', { 
            fontSize: '16px', 
            color: '#ffffff', 
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(101);
        
        this.upgradeButtonTexts.push(roundaboutText, bridgeText);

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
            const isSelected = selectedUpgrade === UpgradeType.ROUNDABOUT;
            this.roundaboutButton.setFillStyle(isSelected ? 0x2980b9 : 0x3498db);
            this.roundaboutButton.setAlpha(1);
            roundaboutText.setColor('#ffffff');
            roundaboutText.setAlpha(1);
        } else {
            this.roundaboutButton.setFillStyle(0x7f8c8d);
            this.roundaboutButton.setAlpha(0.6);
            roundaboutText.setColor('#bdc3c7');
            roundaboutText.setAlpha(0.8);
        }

        if (this.bridgeCount > 0) {
            const isSelected = selectedUpgrade === UpgradeType.BRIDGE;
            this.bridgeButton.setFillStyle(isSelected ? 0x7f8c8d : 0x95a5a6);
            this.bridgeButton.setAlpha(1);
            bridgeText.setColor('#ffffff');
            bridgeText.setAlpha(1);
        } else {
            this.bridgeButton.setFillStyle(0x7f8c8d);
            this.bridgeButton.setAlpha(0.6);
            bridgeText.setColor('#bdc3c7');
            bridgeText.setAlpha(0.8);
        }
    }

    private checkWarnings(destinations: Destination[], time: number): void {
        const warningThreshold = GameConfig.MAX_CARS_PER_DESTINATION - 2;
        const warningCooldown = 3000; // Show warning max once every 3 seconds
        const currentTime = this.time.now;

        for (const dest of destinations) {
            const waitingCars = dest.getWaitingCars();
            
            if (waitingCars >= warningThreshold && (currentTime - this.lastWarningTime) > warningCooldown) {
                this.showWarning(dest, waitingCars);
                this.lastWarningTime = currentTime;
                break; // Only show one warning at a time
            }
        }

        // Auto-hide warning after 2.5 seconds
        if (this.warningAlert && (currentTime - this.lastWarningTime) > 2500 && this.lastWarningTime > 0) {
            this.hideWarning();
        }
    }

    private showWarning(destination: Destination, waitingCars: number): void {
        // Hide existing warning if any
        this.hideWarning();

        const { width, height } = this.cameras.main;
        const remaining = GameConfig.MAX_CARS_PER_DESTINATION - waitingCars;

        // Create warning alert
        const alertBg = this.add.rectangle(
            width / 2,
            height - 100,
            width - 40,
            80,
            0xe74c3c,
            0.9
        ).setDepth(200);

        const warningText = this.add.text(
            width / 2,
            height - 120,
            '⚠️ WARNING ⚠️',
            {
                fontSize: '28px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 3
            }
        ).setOrigin(0.5).setDepth(201);

        const messageText = this.add.text(
            width / 2,
            height - 85,
            `Too many cars waiting! Only ${remaining} spots remaining before game over!`,
            {
                fontSize: '18px',
                color: '#ffffff',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2,
                wordWrap: { width: width - 80 }
            }
        ).setOrigin(0.5).setDepth(201);

        // Pulse animation
        this.tweens.add({
            targets: [alertBg, warningText, messageText],
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Power2'
        });

        this.warningAlert = this.add.container(0, 0, [alertBg, warningText, messageText]);
    }

    private hideWarning(): void {
        if (this.warningAlert) {
            this.tweens.add({
                targets: this.warningAlert.list,
                alpha: { from: 1, to: 0 },
                duration: 300,
                ease: 'Power2',
                onComplete: () => {
                    if (this.warningAlert) {
                        this.warningAlert.destroy();
                        this.warningAlert = null;
                    }
                }
            });
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
