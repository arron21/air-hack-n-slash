import Phaser from 'phaser';
import { type Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class Hammer implements Weapon {
    public name = 'Hammer';
    public staminaCost = 45;
    public attackDuration = 600;
    public baseKnockback = 800;
    
    private graphics!: Phaser.GameObjects.Graphics;

    public attack(scene: Phaser.Scene, player: Player, _time: number) {
        if (!this.graphics) {
            this.graphics = scene.add.graphics();
        }

        const angle = player.rotation;
        const offset = 60;
        const hx = player.x + Math.cos(angle) * offset;
        const hy = player.y + Math.sin(angle) * offset;

        this.graphics.clear();
        this.graphics.fillStyle(0xffaa00, 0.5);
        this.graphics.fillCircle(hx, hy, 70);

        scene.time.delayedCall(200, () => {
            if (this.graphics) this.graphics.clear();
        });

        const arena = scene as any;
        const enemies = arena.enemies.getChildren() as Enemy[];
        
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            
            const dist = Phaser.Math.Distance.Between(hx, hy, enemy.x, enemy.y);
            if (dist <= 70) {
                this.handleHit(player, enemy, hx, hy);
            }
        }
    }

    private handleHit(player: Player, enemyObj: any, hx: number, hy: number) {
        const enemy = enemyObj as Enemy;
        const isDashStrike = (player as any).isDashStriking;
        const dmgMult = isDashStrike ? 1.5 : 1.0;
        enemy.takeDamage(30 * dmgMult * player.damageMultiplier);
        player.triggerHitEffects(enemy);

        if (enemy.active) {
            const angle = Phaser.Math.Angle.Between(hx, hy, enemy.x, enemy.y);
            const kb = this.baseKnockback * player.knockbackMultiplier * (isDashStrike ? 1.5 : 1.0);
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 300, player);
            
            const arena = player.scene as any;
            arena.hitStop(100);
            arena.screenShake(200, 0.02);
        }
    }

    public update(_scene: Phaser.Scene, _player: Player, _time: number) {}
    public clear(_scene: Phaser.Scene, _player: Player) {
        if (this.graphics) this.graphics.destroy();
    }
}
