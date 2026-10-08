import Phaser from 'phaser';
import { type Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';

export class Scythe implements Weapon {
    public name = 'Scythe';
    public staminaCost = 30;
    public attackDuration = 400;
    public baseKnockback = 300; 
    
    private graphics!: Phaser.GameObjects.Graphics;
    private comboStep: number = 0;
    private comboResetTime: number = 0;
    public attack(scene: Phaser.Scene, player: Player, time: number) {
        if (time > this.comboResetTime) {
            this.comboStep = 0;
        }
        this.comboStep++;
        this.comboResetTime = time + this.attackDuration + 500;

        if (!this.graphics) {
            this.graphics = scene.add.graphics();
        }

        const angle = player.rotation;
        const isFinisher = this.comboStep >= 3;
        const offset = isFinisher ? 0 : 40;
        const hx = player.x + Math.cos(angle) * offset;
        const hy = player.y + Math.sin(angle) * offset;

        this.graphics.clear();
        this.graphics.lineStyle(isFinisher ? 6 : 3, isFinisher ? 0xff4444 : 0xff00ff, 1.0);
        
        this.graphics.beginPath();
        if (isFinisher) {
            this.graphics.arc(player.x, player.y, 140, 0, Math.PI * 2);
        } else {
            this.graphics.arc(player.x, player.y, 110, angle - Math.PI*0.6, angle + Math.PI*0.6);
        }
        this.graphics.strokePath();

        scene.time.delayedCall(150, () => {
            if (this.graphics) this.graphics.clear();
        });

        const arena = scene as any;
        const enemies = arena.enemies.getChildren() as Enemy[];
        
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            
            const dist = Phaser.Math.Distance.Between(hx, hy, enemy.x, enemy.y);
            if (dist <= (isFinisher ? 140 : 90)) {
                this.handleHit(player, enemy, isFinisher);
            }
        }
    }

    private handleHit(player: Player, enemyObj: any, isFinisher: boolean) {
        const enemy = enemyObj as Enemy;
        const isDashStrike = (player as any).isDashStriking;
        const dmgMult = (isFinisher ? 3.0 : 1.0) * (isDashStrike ? 1.5 : 1.0);
        enemy.takeDamage(25 * dmgMult * player.damageMultiplier);
        player.triggerHitEffects(enemy);
        
        if (enemy.active) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            const kb = this.baseKnockback * player.knockbackMultiplier * (isFinisher ? 1.5 : 1.0) * (isDashStrike ? 1.5 : 1.0);
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 250, player);
        }

        if (isFinisher) {
            const arena = player.scene as any;
            arena.hitStop(80);
            arena.screenShake(150, 0.015);
            this.comboStep = 0;
        }
    }

    public update(_scene: Phaser.Scene, _player: Player, _time: number) {}
    public clear(_scene: Phaser.Scene, _player: Player) {
        if (this.graphics) this.graphics.destroy();
    }
}
