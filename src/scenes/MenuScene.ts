import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const { width, height } = this.cameras.main;

        // Title
        this.add.text(width / 2, height / 2 - 100, 'Mini Motor Game', {
            fontSize: '48px',
            color: '#ecf0f1',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Instructions
        this.add.text(width / 2, height / 2 - 20, 'Draw roads to connect houses to matching destinations', {
            fontSize: '20px',
            color: '#bdc3c7',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 20, 'Click and drag to build roads', {
            fontSize: '18px',
            color: '#95a5a6',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Start button
        const startButton = this.add.rectangle(width / 2, height / 2 + 100, 200, 60, 0x3498db)
            .setInteractive({ useHandCursor: true })
            .on('pointerdown', () => {
                this.scene.start('GameScene');
            })
            .on('pointerover', () => {
                startButton.setFillStyle(0x2980b9);
            })
            .on('pointerout', () => {
                startButton.setFillStyle(0x3498db);
            });

        this.add.text(width / 2, height / 2 + 100, 'Start Game', {
            fontSize: '24px',
            color: '#ecf0f1',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }
}
