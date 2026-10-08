import Phaser from 'phaser';
import { InputManager } from '../managers/InputManager';

export class HubScene extends Phaser.Scene {
    private playerSprite!: Phaser.GameObjects.Sprite;
    private inputManager!: InputManager;
    
    private mirrorZone!: Phaser.GameObjects.Zone;
    private uiContainer!: Phaser.GameObjects.Container;
    
    private darkness: number = 0;
    private maxStaminaBonus: number = 0;
    private damageBonus: number = 0;

    constructor() {
        super('HubScene');
    }

    init() {
        this.darkness = parseInt(localStorage.getItem('darkness') || '0');
        this.maxStaminaBonus = parseInt(localStorage.getItem('maxStaminaBonus') || '0');
        this.damageBonus = parseInt(localStorage.getItem('damageBonus') || '0');
    }

    create() {
        this.cameras.main.setBackgroundColor('#2a1a3a');

        // Draw Hub Room
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        this.add.rectangle(cx, cy, 800, 600, 0x111111);
        
        // The Mirror of Night
        this.add.rectangle(cx, cy - 250, 100, 150, 0x8800ff);
        this.mirrorZone = this.add.zone(cx, cy - 200, 150, 200);
        this.physics.add.existing(this.mirrorZone);
        
        const mirrorText = this.add.text(cx, cy - 350, 'Mirror of Night (Press E)', { fontSize: '20px', color: '#ff00ff' }).setOrigin(0.5);
        mirrorText.setVisible(false);

        // Start Door
        this.add.rectangle(cx, cy + 250, 150, 50, 0x00ff00);
        const doorZone = this.add.zone(cx, cy + 200, 200, 100);
        this.physics.add.existing(doorZone);

        const doorText = this.add.text(cx, cy + 300, 'Start Run (Press E)', { fontSize: '20px', color: '#00ff00' }).setOrigin(0.5);
        doorText.setVisible(false);

        // Player
        this.playerSprite = this.physics.add.sprite(cx, cy, 'playerTexture');
        (this.playerSprite.body as Phaser.Physics.Arcade.Body).setCollideWorldBounds(true);
        this.inputManager = new InputManager(this);

        // Darkness display
        const darknessText = this.add.text(20, 20, `Darkness: ${this.darkness}`, { fontSize: '24px', color: '#8800ff' });

        // Overlaps
        this.physics.add.overlap(this.playerSprite, this.mirrorZone, () => {
            const prompt = this.inputManager.hasGamepad() ? 'Press [A]' : 'Press [E]';
            mirrorText.setText(`Mirror of Night (${prompt})`);
            mirrorText.setVisible(true);
            
            if (this.inputManager.isInteractPressed() && this.time.now > this.lastInteractTime) {
                this.lastInteractTime = this.time.now + 300;
                this.openMirrorUI(darknessText);
            }
        });

        this.physics.add.overlap(this.playerSprite, doorZone, () => {
            const prompt = this.inputManager.hasGamepad() ? 'Press [A]' : 'Press [E]';
            doorText.setText(`Start Run (${prompt})`);
            doorText.setVisible(true);
            
            if (this.inputManager.isInteractPressed() && this.time.now > this.lastInteractTime) {
                this.lastInteractTime = this.time.now + 300;
                this.scene.start('MainArena', { floor: 1, boons: [], loadout: ['BasicSword'] });
            }
        });

        // Hide texts when not overlapping
        this.events.on('update', () => {
            if (!this.physics.overlap(this.playerSprite, this.mirrorZone)) mirrorText.setVisible(false);
            if (!this.physics.overlap(this.playerSprite, doorZone)) doorText.setVisible(false);
        });

        this.createMirrorUI(darknessText);
    }

    private mirrorUiIndex: number = 0;
    private lastInteractTime: number = 0;
    private stamBtn!: Phaser.GameObjects.Rectangle;
    private dmgBtn!: Phaser.GameObjects.Rectangle;
    private closeBtn!: Phaser.GameObjects.Text;
    private stamText!: Phaser.GameObjects.Text;
    private dmgText!: Phaser.GameObjects.Text;
    private darknessTextRef!: Phaser.GameObjects.Text;

    update(time: number, _delta: number) {
        if (this.uiContainer.visible) {
            (this.playerSprite.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
            
            // UI Navigation
            if (this.inputManager.hasGamepad()) {
                const pad = this.input.gamepad?.getPad(0);
                if (pad && time > this.lastInteractTime) {
                    const yAxis = pad.leftStick ? pad.leftStick.y : 0;
                    const up = pad.up || yAxis < -0.5;
                    const down = pad.down || yAxis > 0.5;

                    if (down) {
                        this.mirrorUiIndex = (this.mirrorUiIndex + 1) % 3;
                        this.lastInteractTime = time + 200;
                        this.updateMirrorUIHighlight();
                    } else if (up) {
                        this.mirrorUiIndex = (this.mirrorUiIndex + 2) % 3;
                        this.lastInteractTime = time + 200;
                        this.updateMirrorUIHighlight();
                    }

                    if (pad.B) {
                        this.lastInteractTime = time + 300;
                        this.uiContainer.setVisible(false);
                    } else if (pad.A) {
                        this.lastInteractTime = time + 300;
                        if (this.mirrorUiIndex === 0) this.tryUpgradeStamina();
                        else if (this.mirrorUiIndex === 1) this.tryUpgradeDamage();
                        else if (this.mirrorUiIndex === 2) this.uiContainer.setVisible(false);
                    }
                }
            }
            return;
        }

        const vec = this.inputManager.getMovementVector();
        const speed = 200;
        (this.playerSprite.body as Phaser.Physics.Arcade.Body).setVelocity(vec.x * speed, vec.y * speed);
    }

    private createMirrorUI(darknessText: Phaser.GameObjects.Text) {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        this.uiContainer = this.add.container(cx, cy);
        this.uiContainer.setVisible(false);
        this.uiContainer.setDepth(100);

        const bg = this.add.rectangle(0, 0, 600, 400, 0x000000, 0.9);
        bg.setInteractive(); // block clicks
        this.uiContainer.add(bg);

        this.darknessTextRef = darknessText;

        const title = this.add.text(0, -150, 'MIRROR OF NIGHT', { fontSize: '32px', color: '#8800ff' }).setOrigin(0.5);
        this.uiContainer.add(title);

        this.closeBtn = this.add.text(250, -170, '[X]', { fontSize: '24px', color: '#ff0000' }).setInteractive();
        this.closeBtn.on('pointerdown', () => this.uiContainer.setVisible(false));
        this.uiContainer.add(this.closeBtn);

        // Upgrade 1: Stamina
        this.stamText = this.add.text(-250, -50, `Max Stamina (+20) [Cost: 10] (Current Bonus: ${this.maxStaminaBonus})`, { fontSize: '18px' });
        this.stamBtn = this.add.rectangle(200, -40, 100, 40, 0x444444).setInteractive();
        const stamBtnText = this.add.text(200, -40, 'UPGRADE', { fontSize: '16px' }).setOrigin(0.5);
        
        this.stamBtn.on('pointerdown', () => this.tryUpgradeStamina());
        this.uiContainer.add([this.stamText, this.stamBtn, stamBtnText]);

        // Upgrade 2: Damage
        this.dmgText = this.add.text(-250, 50, `Base Damage (+10%) [Cost: 20] (Current Bonus: ${this.damageBonus}%)`, { fontSize: '18px' });
        this.dmgBtn = this.add.rectangle(200, 60, 100, 40, 0x444444).setInteractive();
        const dmgBtnText = this.add.text(200, 60, 'UPGRADE', { fontSize: '16px' }).setOrigin(0.5);

        this.dmgBtn.on('pointerdown', () => this.tryUpgradeDamage());
        this.uiContainer.add([this.dmgText, this.dmgBtn, dmgBtnText]);
        
        this.updateMirrorUIHighlight();
    }

    private updateMirrorUIHighlight() {
        this.stamBtn.setStrokeStyle(0);
        this.dmgBtn.setStrokeStyle(0);
        this.closeBtn.setColor('#ff0000');

        if (this.mirrorUiIndex === 0) this.stamBtn.setStrokeStyle(4, 0xffff00);
        else if (this.mirrorUiIndex === 1) this.dmgBtn.setStrokeStyle(4, 0xffff00);
        else if (this.mirrorUiIndex === 2) this.closeBtn.setColor('#ffff00');
    }

    private tryUpgradeStamina() {
        if (this.darkness >= 10) {
            this.darkness -= 10;
            this.maxStaminaBonus += 20;
            this.saveProgress();
            this.darknessTextRef.setText(`Darkness: ${this.darkness}`);
            this.stamText.setText(`Max Stamina (+20) [Cost: 10] (Current Bonus: ${this.maxStaminaBonus})`);
        }
    }

    private tryUpgradeDamage() {
        if (this.darkness >= 20) {
            this.darkness -= 20;
            this.damageBonus += 10;
            this.saveProgress();
            this.darknessTextRef.setText(`Darkness: ${this.darkness}`);
            this.dmgText.setText(`Base Damage (+10%) [Cost: 20] (Current Bonus: ${this.damageBonus}%)`);
        }
    }

    private openMirrorUI(darknessText: Phaser.GameObjects.Text) {
        darknessText.setText(`Darkness: ${this.darkness}`);
        this.uiContainer.setVisible(true);
    }

    private saveProgress() {
        localStorage.setItem('darkness', this.darkness.toString());
        localStorage.setItem('maxStaminaBonus', this.maxStaminaBonus.toString());
        localStorage.setItem('damageBonus', this.damageBonus.toString());
    }
}
