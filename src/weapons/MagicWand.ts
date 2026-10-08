import Phaser from 'phaser';
import type { Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { MainArena } from '../scenes/MainArena';

class Projectile extends Phaser.Physics.Arcade.Sprite {
    constructor(scene: Phaser.Scene, x: number, y: number, angle: number) {
        super(scene, x, y, '');
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x00ffff, 1.0);
        g.fillCircle(8, 8, 8);
        g.generateTexture('wandProjectile', 16, 16);
        this.setTexture('wandProjectile');
        
        this.body?.setSize(16, 16);
        this.scene.physics.velocityFromRotation(angle, 400, this.body?.velocity);
        
        this.scene.time.delayedCall(2000, () => this.destroy());
    }
}

export class MagicWand implements Weapon {
    public name = 'MagicWand';
    public staminaCost = 25;
    public attackDuration = 300;
    public baseKnockback = 150;
    
    private projectiles!: Phaser.Physics.Arcade.Group;

    private init(scene: Phaser.Scene) {
        if (!this.projectiles) {
            this.projectiles = scene.physics.add.group({
                classType: Projectile,
                runChildUpdate: true
            });
            
            const arena = scene as MainArena;
            scene.physics.add.collider(this.projectiles, arena.enemies, (p, e) => this.handleHit(arena.player, p, e), undefined, this);
            scene.physics.add.collider(this.projectiles, arena.walls, (proj) => proj.destroy());
        }
    }

    attack(scene: Phaser.Scene, player: Player, _time: number) {
        this.init(scene);
        const proj = new Projectile(scene, player.x, player.y, player.rotation);
        this.projectiles.add(proj, true);
    }

    update(scene: Phaser.Scene, _player: Player, _time: number) {
        this.init(scene);
    }

    clear(_scene: Phaser.Scene, _player: Player) {
        // Projectiles manage themselves
    }

    private handleHit(player: Player, projObj: any, enemyObj: any) {
        const proj = projObj as Projectile;
        const enemy = enemyObj as Enemy;
        
        proj.destroy();
        enemy.takeDamage(15);
        if (enemy.active) {
            const angle = Phaser.Math.Angle.Between(proj.x, proj.y, enemy.x, enemy.y);
            const kb = this.baseKnockback * player.knockbackMultiplier;
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 200);
        }
    }
}
