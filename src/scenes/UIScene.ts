import Phaser, { Scene } from 'phaser';
import { Player } from '../entities/Player';

export class UIScene extends Scene {
    private player!: Player;
    private staminaBarBg!: Phaser.GameObjects.Graphics;
    private staminaBarFill!: Phaser.GameObjects.Graphics;
    private hpBarBg!: Phaser.GameObjects.Graphics;
    private hpBarFill!: Phaser.GameObjects.Graphics;
    
    private xpText!: Phaser.GameObjects.Text;
    private levelText!: Phaser.GameObjects.Text;
    private timeText!: Phaser.GameObjects.Text;
    private weaponText!: Phaser.GameObjects.Text;

    private startTime: number = 0;

    constructor() {
        super({ key: 'UIScene', active: true });
    }

    create() {
        this.startTime = this.time.now;

        const mainArena = this.scene.get('MainArena') as any;
        
        this.events.on('update', (time: number) => {
            if (mainArena.player && this.player !== mainArena.player) {
                this.player = mainArena.player;
                if (!this.hpBarBg) this.initUI();
            }
            if (this.player && this.player.active) {
                this.updateUI(time);
            }
        });

        mainArena.events.on('xp-changed', (xp: number, xpNeeded: number) => {
            if (this.xpText) {
                this.xpText.setText(`XP: ${xp} / ${xpNeeded}`);
            }
        });

        mainArena.events.on('level-up', (level: number) => {
            if (this.levelText) {
                this.levelText.setText(`Level: ${level}`);
            }
            this.scene.pause('MainArena');
            this.scene.launch('UpgradeScene', { 
                loadout: mainArena.loadoutData, 
                floor: mainArena.floor, 
                boons: mainArena.boons 
            });
        });
    }

    initUI() {
        // HP
        this.add.text(20, 20, 'HP', { fontSize: '16px', color: '#ff4444', fontStyle: 'bold' });
        this.hpBarBg = this.add.graphics();
        this.hpBarBg.fillStyle(0x000000, 0.5);
        this.hpBarBg.fillRect(20, 40, 200, 20);
        this.hpBarFill = this.add.graphics();

        // Stamina
        this.add.text(240, 20, 'STAMINA', { fontSize: '16px', color: '#00ff00', fontStyle: 'bold' });
        this.staminaBarBg = this.add.graphics();
        this.staminaBarBg.fillStyle(0x000000, 0.5);
        this.staminaBarBg.fillRect(240, 40, 150, 20);
        this.staminaBarFill = this.add.graphics();

        // XP and Level removed

        // Time
        this.timeText = this.add.text(this.cameras.main.centerX, 20, '00:00', {
            fontSize: '32px',
            color: '#ffffff'
        }).setOrigin(0.5, 0);

        // Weapon
        this.weaponText = this.add.text(this.cameras.main.width - 20, 20, 'Weapon: None', {
            fontSize: '24px',
            color: '#ffff00',
            fontStyle: 'bold'
        }).setOrigin(1, 0);
    }

    updateUI(time: number) {
        if (!this.staminaBarFill) return;
        
        // Update Stamina Bar
        const stamPct = this.player.stamina / this.player.maxStamina;
        this.staminaBarFill.clear();
        this.staminaBarFill.fillStyle(0x00ff00, 1.0);
        this.staminaBarFill.fillRect(240, 40, 150 * Math.max(stamPct, 0), 20);

        // Update HP Bar
        if (this.hpBarFill) {
            const hpPct = this.player.health / this.player.maxHealth;
            this.hpBarFill.clear();
            this.hpBarFill.fillStyle(0xff0000, 1.0);
            this.hpBarFill.fillRect(20, 40, 200 * Math.max(hpPct, 0), 20);
        }

        // Update Time
        const elapsed = time - this.startTime;
        const totalSeconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        
        const mStr = minutes.toString().padStart(2, '0');
        const sStr = seconds.toString().padStart(2, '0');
        if (this.timeText) {
            this.timeText.setText(`${mStr}:${sStr}`);
        }

        // Update Weapon Name
        if (this.weaponText) {
            const weapon = this.player.getActiveWeapon();
            this.weaponText.setText(`Weapon: ${weapon ? weapon.name : 'None'}`);
        }
    }
}
