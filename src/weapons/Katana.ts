import Phaser from 'phaser';
import type { Weapon } from './Weapon';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { MainArena } from '../scenes/MainArena';

export class Katana implements Weapon {
    public name = 'Katana';
    public staminaCost = 10;
    public attackDuration = 120; // Very fast
    public baseKnockback = 300;

    private graphics!: Phaser.GameObjects.Graphics;
    private hitbox!: Phaser.GameObjects.Zone;
    private comboStep: number = 0;
    private comboResetTime: number = 0;

    private init(scene: Phaser.Scene) {
        if (!this.graphics) {
            this.graphics = scene.add.graphics();
            this.graphics.setDepth(10);
            
            this.hitbox = scene.add.zone(0, 0, 70, 70);
            scene.physics.add.existing(this.hitbox);
            (this.hitbox.body as Phaser.Physics.Arcade.Body).enable = false;

            const arena = scene as MainArena;
            scene.physics.add.overlap(this.hitbox, arena.enemies, (_s, e) => this.handleHit(arena.player, e), undefined, this);
        }
    }

    attack(scene: Phaser.Scene, _player: Player, time: number) {
        if (time > this.comboResetTime) {
            this.comboStep = 0;
        }
        this.comboStep++;
        this.comboResetTime = time + this.attackDuration + 300; // 300ms combo window

        this.init(scene);
        (this.hitbox.body as Phaser.Physics.Arcade.Body).enable = true;
    }

    update(scene: Phaser.Scene, player: Player, time: number) {
        this.init(scene);
        
        (this.hitbox.body as Phaser.Physics.Arcade.Body).enable = false;
        this.graphics.clear();
        
        if (player.currentState === 'ATTACK' && player.getActiveWeapon() === this) {
            (this.hitbox.body as Phaser.Physics.Arcade.Body).enable = true;
            
            const offsetDist = 35; // slightly further reach
            this.hitbox.x = player.x + Math.cos(player.rotation) * offsetDist;
            this.hitbox.y = player.y + Math.sin(player.rotation) * offsetDist;
            
            const progress = 1 - Math.max(0, (player.stateTimer - time) / this.attackDuration);
            const isFinisher = this.comboStep >= 3;
            const startAngle = player.rotation - (isFinisher ? 1.5 : 1.0);
            const endAngle = startAngle + progress * (isFinisher ? 3.0 : 2.0);

            // Sleek cyan arc
            this.graphics.lineStyle(isFinisher ? 6 : 3, 0x00ffff, 1.0);
            this.graphics.beginPath();
            this.graphics.arc(player.x, player.y, 45, startAngle, endAngle, false);
            this.graphics.strokePath();
        }
    }

    clear(_scene: Phaser.Scene, _player: Player) {
        if (this.graphics) this.graphics.clear();
        if (this.hitbox && this.hitbox.body) (this.hitbox.body as Phaser.Physics.Arcade.Body).enable = false;
    }

    private handleHit(player: Player, enemyObj: any) {
        if (player.currentState !== 'ATTACK') return;
        const enemy = enemyObj as Enemy;
        const now = player.scene.time.now;
        
        // Fast weapons need smaller hit cooldown
        if (now - (enemy.getData('lastHitTime') || 0) < 100) return;
        enemy.setData('lastHitTime', now);

        const isFinisher = this.comboStep >= 3;
        const isDashStrike = (player as any).isDashStriking;
        
        // Katana excels at Dash-Strikes
        const dmgMult = (isFinisher ? 2.0 : 1.0) * (isDashStrike ? 2.5 : 1.0);
        
        enemy.takeDamage(6 * dmgMult * player.damageMultiplier);
        player.triggerHitEffects(enemy);
        
        if (enemy.active) {
            const angle = Phaser.Math.Angle.Between(player.x, player.y, enemy.x, enemy.y);
            // Dash-strike knocks them back massively
            const kb = this.baseKnockback * player.knockbackMultiplier * (isFinisher ? 1.5 : 1.0) * (isDashStrike ? 2.0 : 1.0);
            enemy.applyKnockback(Math.cos(angle) * kb, Math.sin(angle) * kb, 250, player);
        }
        
        if (isFinisher) {
            const arena = player.scene as any;
            arena.hitStop(30); // shorter hitstop for faster feel
            arena.screenShake(50, 0.005);
            this.comboStep = 0;
        }
    }
}
