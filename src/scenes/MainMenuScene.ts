import { Scene } from 'phaser';

export class MainMenuScene extends Scene {
    private unlockedWeapons: string[] = ['BasicSword', 'MagicWand', 'Spear', 'Scythe', 'Hammer', 'Bow', 'Bomb'];
    private equipped: string[] = ['BasicSword'];

    constructor() {
        super('MainMenuScene');
    }

    create() {
        this.add.text(this.cameras.main.centerX, 100, 'AIR HACK N SLASH', { fontSize: '48px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 150, 'Select Loadout (Max 2)', { fontSize: '24px', color: '#aaaaaa' }).setOrigin(0.5);

        this.loadSaveData();

        let yPos = 250;
        for (const w of this.unlockedWeapons) {
            this.createWeaponToggle(this.cameras.main.centerX, yPos, w);
            yPos += 80;
        }

        const startBtn = this.add.rectangle(this.cameras.main.centerX, yPos + 50, 300, 60, 0x00aa00).setInteractive();
        this.add.text(this.cameras.main.centerX, yPos + 50, 'START RUN', { fontSize: '24px', color: '#ffffff' }).setOrigin(0.5);
        
        startBtn.on('pointerdown', () => {
            this.scene.start('MainArena', { loadout: this.equipped });
        });
        startBtn.on('pointerover', () => startBtn.setFillStyle(0x00cc00));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x00aa00));
    }

    private loadSaveData() {
        const saved = localStorage.getItem('air-hack-save');
        if (saved) {
            const data = JSON.parse(saved);
            if (data.unlockedWeapons) this.unlockedWeapons = data.unlockedWeapons;
            if (data.equipped) this.equipped = data.equipped;
        } else {
            this.saveData();
        }
    }

    private saveData() {
        localStorage.setItem('air-hack-save', JSON.stringify({
            unlockedWeapons: this.unlockedWeapons,
            equipped: this.equipped
        }));
    }

    private createWeaponToggle(x: number, y: number, name: string) {
        const isEquipped = this.equipped.includes(name);
        const bg = this.add.rectangle(x, y, 400, 60, isEquipped ? 0x4444ff : 0x333333).setInteractive();
        this.add.text(x, y, name + (isEquipped ? ' [EQUIPPED]' : ''), { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
        
        bg.on('pointerdown', () => {
            if (this.equipped.includes(name)) {
                if (this.equipped.length > 1) { 
                    this.equipped = this.equipped.filter(w => w !== name);
                }
            } else {
                if (this.equipped.length < 2) {
                    this.equipped.push(name);
                } else {
                    this.equipped.shift();
                    this.equipped.push(name);
                }
            }
            this.saveData();
            this.scene.restart();
        });
    }
}
