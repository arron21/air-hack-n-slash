import { Scene } from 'phaser';
import { InputManager } from '../managers/InputManager';

export class UpgradeScene extends Scene {
    private dataPayload: any;
    private inputManager!: InputManager;
    private uiIndex: number = 0;
    private boonButtons: Phaser.GameObjects.Rectangle[] = [];
    private boonsList: any[] = [];
    private lastInteractTime: number = 0;

    constructor() {
        super('UpgradeScene');
    }

    init(data: any) {
        this.dataPayload = data;
        if (!this.dataPayload.boons) this.dataPayload.boons = [];
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        const bg = this.add.rectangle(cx, cy, 600, 400, 0x000000, 0.8);
        bg.setInteractive();

        this.inputManager = new InputManager(this);
        this.boonButtons = [];

        const prompt = this.inputManager.hasGamepad() ? 'Select a Boon (D-Pad to Move, A to Select):' : 'Select a Boon:';

        this.add.text(cx, cy - 150, 'ROOM CLEARED!', { fontSize: '32px', color: '#ffaa00', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(cx, cy - 100, prompt, { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);

        this.boonsList = [
            { id: 'zeus_strike', text: 'Zeus: Attacks emit Chain Lightning' },
            { id: 'ares_doom', text: 'Ares: Attacks inflict Doom (delayed burst)' },
            { id: 'poseidon_surge', text: 'Poseidon: Massive knockback + Wall Slam Damage' }
        ];

        this.boonsList.forEach((boon, index) => {
            const btn = this.add.rectangle(cx, cy - 20 + index * 80, 450, 60, 0x333333).setInteractive();
            this.add.text(cx, cy - 20 + index * 80, boon.text, { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
            
            btn.on('pointerdown', () => this.applyUpgrade(boon.id));
            btn.on('pointerover', () => {
                this.uiIndex = index;
                this.updateHighlights();
            });
            this.boonButtons.push(btn);
        });

        this.updateHighlights();
    }

    private updateHighlights() {
        this.boonButtons.forEach((btn, index) => {
            if (index === this.uiIndex) {
                btn.setStrokeStyle(4, 0xffff00);
                btn.setFillStyle(0x555555);
            } else {
                btn.setStrokeStyle(0);
                btn.setFillStyle(0x333333);
            }
        });
    }

    update(time: number) {
        if (this.inputManager.hasGamepad()) {
            const pad = this.input.gamepad?.getPad(0);
            if (pad && time > this.lastInteractTime) {
                const yAxis = pad.leftStick ? pad.leftStick.y : 0;
                const up = pad.up || yAxis < -0.5;
                const down = pad.down || yAxis > 0.5;

                if (down) {
                    this.uiIndex = (this.uiIndex + 1) % this.boonsList.length;
                    this.lastInteractTime = time + 200;
                    this.updateHighlights();
                } else if (up) {
                    this.uiIndex = (this.uiIndex + this.boonsList.length - 1) % this.boonsList.length;
                    this.lastInteractTime = time + 200;
                    this.updateHighlights();
                }

                if (pad.A) {
                    this.lastInteractTime = time + 300;
                    this.applyUpgrade(this.boonsList[this.uiIndex].id);
                }
            }
        }
    }

    applyUpgrade(type: string) {
        if (!this.dataPayload) this.dataPayload = {};
        if (!this.dataPayload.boons) this.dataPayload.boons = [];
        this.dataPayload.boons.push(type);
        
        if (this.scene.isPaused('MainArena')) {
            const arena = this.scene.get('MainArena') as any;
            arena.boons = this.dataPayload.boons;
            arena.player.boons = this.dataPayload.boons;
            this.scene.resume('MainArena');
            this.scene.stop();
        } else {
            this.scene.start('MainArena', this.dataPayload);
        }
    }
}
