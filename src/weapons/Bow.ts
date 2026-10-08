import Phaser from 'phaser';
import { type Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { MainArena } from '../scenes/MainArena';

class Arrow extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
        super(scene, x, y, '');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const g = scene.make.graphics({x:0, y:0});
        g.fillStyle(0x00ffff, 1.0);
        g.fillRect(0, 0, 16, 4);
        g.generateTexture('arrowTex', 16, 4);
        g.destroy();

        this.setTexture('arrowTex');
        this.setRotation(angle);
        
        const speed = 500;
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        scene.time.delayedCall(1500, () => {
            if (this.active) this.destroy();
        });
    }
}

export class Bow implements Weapon {
    public name = 'Bow';
    public staminaCost = 15;
    public attackDuration = 250;
    public baseKnockback = 100;
    
    private projectiles!: Phaser.Physics.Arcade.Group;

    private init(scene: Phaser.Scene) {
        if (!this.projectiles) {
            this.projectiles = scene.physics.add.group({
                classType: Arrow,
                runChildUpdate: true
            });
            
            const arena = scene as MainArena;
            scene.physics.add.collider(this.projectiles, arena.enemies, (p, e) => this.handleHit(arena.player, p, e), undefined, this);
            scene.physics.add.collider(this.projectiles, arena.walls, (proj) => proj.destroy());
        }
    }

    public attack(scene: Phaser.Scene, player: Player, _time: number) {
        this.init(scene);
        const arrow = new Arrow(scene, player.x, player.y, player.rotation);
        this.projectiles.add(arrow, true);
    }

    public update(_scene: Phaser.Scene, _player: Player, _time: number) {}

    private handleHit(player: Player, projObj: any, enemyObj: any) {
        const proj = projObj as Arrow;
        const enemy = enemyObj as Enemy;
        
        proj.destroy();
        enemy.takeDamage(20 * player.damageMultiplier);
        if (enemy.active) {
            const angle = proj.rotation;
            const kb = this.baseKnockback * player.knockbackMultiplier;
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 150);
        }
    }

    public clear(_scene: Phaser.Scene, _player: Player) {
        if (this.projectiles) {
            this.projectiles.clear(true, true);
        }
    }
}
