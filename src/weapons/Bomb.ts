import Phaser from 'phaser';
import { type Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { MainArena } from '../scenes/MainArena';

class BombProjectile extends Phaser.Physics.Arcade.Sprite {
    public targetX: number;
    public targetY: number;
    public player!: Player;
    public weapon!: Bomb;

    constructor(scene: Phaser.Scene, x: number, y: number, tx: number, ty: number, player: Player, weapon: Bomb) {
        super(scene, x, y, '');
        this.targetX = tx;
        this.targetY = ty;
        this.player = player;
        this.weapon = weapon;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const g = scene.make.graphics({x:0,y:0});
        g.fillStyle(0x444444, 1.0);
        g.fillCircle(8, 8, 8);
        g.generateTexture('bombTex', 16, 16);
        g.destroy();

        this.setTexture('bombTex');
        
        const speed = 400;
        const angle = Phaser.Math.Angle.Between(x, y, tx, ty);
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        const dist = Phaser.Math.Distance.Between(x, y, tx, ty);
        const timeToReach = (dist / speed) * 1000;

        scene.time.delayedCall(Math.min(timeToReach, 1000), () => {
            this.explode();
        });
    }

    private explode() {
        if (!this.active) return;
        this.weapon.createExplosion(this.scene, this.x, this.y, this.player);
        this.destroy();
    }
}

export class Bomb implements Weapon {
    public name = 'Bomb';
    public staminaCost = 35;
    public attackDuration = 500;
    public baseKnockback = 600;

    public attack(scene: Phaser.Scene, player: Player, _time: number) {
        const input = (player as any).inputManager;
        let tx, ty;
        
        const aimVec = input.getAimVector(player.x, player.y);
        if (aimVec.lengthSq() > 0) {
            tx = player.x + aimVec.x * 300;
            ty = player.y + aimVec.y * 300;
        } else {
            tx = player.x + Math.cos(player.rotation) * 300;
            ty = player.y + Math.sin(player.rotation) * 300;
        }

        new BombProjectile(scene, player.x, player.y, tx, ty, player, this);
    }

    public createExplosion(scene: Phaser.Scene, ex: number, ey: number, player: Player) {
        const radius = 120;
        const graphics = scene.add.graphics();
        graphics.fillStyle(0xffaa00, 0.6);
        graphics.fillCircle(ex, ey, radius);

        scene.time.delayedCall(200, () => {
            graphics.destroy();
        });

        const arena = scene as MainArena;
        arena.hitStop(80);
        arena.screenShake(250, 0.025);

        const enemies = arena.enemies.getChildren() as Enemy[];
        for (const e of enemies) {
            const enemy = e as Enemy;
            if (!enemy.active) continue;
            const dist = Phaser.Math.Distance.Between(ex, ey, enemy.x, enemy.y);
            if (dist <= radius) {
                enemy.takeDamage(50 * player.damageMultiplier);
                if (enemy.active) {
                    const angle = Phaser.Math.Angle.Between(ex, ey, enemy.x, enemy.y);
                    const kb = this.baseKnockback * player.knockbackMultiplier;
                    enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 300);
                }
            }
        }
    }

    public update(_scene: Phaser.Scene, _player: Player, _time: number) {}
    public clear(_scene: Phaser.Scene, _player: Player) {}
}
