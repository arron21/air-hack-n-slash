import Phaser from 'phaser';
import { Player } from '../entities/Player';
import { BasicSword } from '../weapons/BasicSword';
import { MagicWand } from '../weapons/MagicWand';
import { Spear } from '../weapons/Spear';
import { Scythe } from '../weapons/Scythe';
import { Hammer } from '../weapons/Hammer';
import { Bow } from '../weapons/Bow';
import { Bomb } from '../weapons/Bomb';
import { Katana } from '../weapons/Katana';

const WEAPON_NAMES = ['BasicSword', 'MagicWand', 'Spear', 'Scythe', 'Hammer', 'Bow', 'Bomb', 'Katana'];

export class WeaponPickup extends Phaser.Physics.Arcade.Sprite {
    public weaponName: string;
    private nameText: Phaser.GameObjects.Text;
    
    constructor(scene: Phaser.Scene, x: number, y: number, wName?: string) {
        super(scene, x, y, '');
        
        if (wName) {
            this.weaponName = wName;
        } else {
            this.weaponName = WEAPON_NAMES[Math.floor(Math.random() * WEAPON_NAMES.length)];
        }

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const g = scene.make.graphics({x:0,y:0});
        g.fillStyle(0x00ffaa, 1.0);
        g.fillTriangle(0, 24, 12, 0, 24, 24);
        g.generateTexture('pickupTex', 24, 24);
        g.destroy();

        this.setTexture('pickupTex');
        
        this.nameText = scene.add.text(x, y - 20, this.weaponName, { fontSize: '14px', color: '#00ffaa' }).setOrigin(0.5);
        
        scene.tweens.add({
            targets: [this, this.nameText],
            y: '-=10',
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    public collect(player: Player) {
        if (!this.active) return;
        
        let newWeapon;
        switch (this.weaponName) {
            case 'BasicSword': newWeapon = new BasicSword(); break;
            case 'MagicWand': newWeapon = new MagicWand(); break;
            case 'Spear': newWeapon = new Spear(); break;
            case 'Scythe': newWeapon = new Scythe(); break;
            case 'Hammer': newWeapon = new Hammer(); break;
            case 'Bow': newWeapon = new Bow(); break;
            case 'Bomb': newWeapon = new Bomb(); break;
            case 'Katana': newWeapon = new Katana(); break;
            default: newWeapon = new BasicSword();
        }

        if (player.weapons.length < 2) {
            player.weapons.push(newWeapon);
            player.activeWeaponIndex = player.weapons.length - 1;
        } else {
            const oldWeapon = player.weapons[player.activeWeaponIndex];
            oldWeapon.clear(this.scene, player);
            player.weapons[player.activeWeaponIndex] = newWeapon;
        }

        const equipped = player.weapons.map(w => w.name);
        const saved = localStorage.getItem('air-hack-save');
        let data: any = { unlockedWeapons: WEAPON_NAMES, equipped: equipped };
        if (saved) {
            data = JSON.parse(saved);
            data.equipped = equipped;
        }
        localStorage.setItem('air-hack-save', JSON.stringify(data));

        this.nameText.destroy();
        this.destroy();
    }
}
