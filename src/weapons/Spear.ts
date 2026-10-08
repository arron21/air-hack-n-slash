import Phaser from 'phaser';
import { type Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class Spear implements Weapon {
    public name = 'Spear';
    public staminaCost = 10;
    public attackDuration = 150;
    public baseKnockback = 500;
    
    private graphics!: Phaser.GameObjects.Graphics;
    private comboStep: number = 0;
    private comboResetTime: number = 0;
    public attack(scene: Phaser.Scene, player: Player, time: number) {
        if (time > this.comboResetTime) {
            this.comboStep = 0;
        }
        this.comboStep++;
        this.comboResetTime = time + this.attackDuration + 400;

        if (!this.graphics) {
            this.graphics = scene.add.graphics();
        }

        const angle = player.rotation;
        
        const isFinisher = this.comboStep >= 3;
        const reach = isFinisher ? 120 : 70;
        const hitWidth = isFinisher ? 180 : 130;
        const hx = player.x + Math.cos(angle) * reach;
        const hy = player.y + Math.sin(angle) * reach;

        this.graphics.clear();
        this.graphics.lineStyle(isFinisher ? 4 : 2, isFinisher ? 0x00ffff : 0xaaddff, 1.0);
        
        this.graphics.save();
        this.graphics.translateCanvas(hx, hy);
        this.graphics.rotateCanvas(angle);
        this.graphics.strokeRect(-60, -15, hitWidth, isFinisher ? 50 : 30);
        this.graphics.restore();

        scene.time.delayedCall(100, () => {
            if (this.graphics) this.graphics.clear();
        });

        const arena = scene as any;
        const enemies = arena.enemies.getChildren() as Enemy[];
        
        // Spear line segment from player to tip
        const tipX = player.x + Math.cos(angle) * 130;
        const tipY = player.y + Math.sin(angle) * 130;

        for (const enemy of enemies) {
            if (!enemy.active) continue;
            
            // Distance from point (enemy) to line segment (player -> tip)
            const lengthSq = 130 * 130;
            let t = ((enemy.x - player.x) * (tipX - player.x) + (enemy.y - player.y) * (tipY - player.y)) / lengthSq;
            t = Math.max(0, Math.min(1, t));
            
            const projX = player.x + t * (tipX - player.x);
            const projY = player.y + t * (tipY - player.y);
            
            const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, projX, projY);
            if (dist < (isFinisher ? 60 : 40)) {
                this.handleHit(player, enemy, isFinisher);
            }
        }
    }

    private handleHit(player: Player, enemyObj: any, isFinisher: boolean) {
        const enemy = enemyObj as Enemy;
        const isDashStrike = (player as any).isDashStriking;
        const dmgMult = (isFinisher ? 3.0 : 1.0) * (isDashStrike ? 1.5 : 1.0);
        enemy.takeDamage(15 * dmgMult * player.damageMultiplier);
        player.triggerHitEffects(enemy);
        
        if (enemy.active) {
            const angle = player.rotation;
            const kb = this.baseKnockback * player.knockbackMultiplier * (isFinisher ? 1.8 : 1.0) * (isDashStrike ? 1.5 : 1.0);
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 200, player);
        }

        if (isFinisher) {
            const arena = player.scene as any;
            arena.hitStop(60);
            arena.screenShake(120, 0.012);
            this.comboStep = 0;
        }
    }

    public update(_scene: Phaser.Scene, _player: Player, _time: number) {}
    public clear(_scene: Phaser.Scene, _player: Player) {
        if (this.graphics) this.graphics.destroy();
    }
}
