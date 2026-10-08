import Phaser from 'phaser';
import { Enemy } from './Enemy';
import { Player } from './Player';

export class BossEnemy extends Enemy {
    private phase: number = 1;
    private attackTimer: Phaser.Time.TimerEvent | null = null;
    private maxHealth: number;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Player) {
        super(scene, x, y, target, 'grunt');
        this.type = 'boss' as any;
        this.health = 2000;
        this.maxHealth = 2000;
        this.knockbackResist = 0.0; // Immune to knockback

        const size = 128;
        const color = 0x8800ff;

        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(color, 1.0);
        g.fillRect(0, 0, size, size);
        g.generateTexture('bossTex', size, size);
        g.destroy();

        this.setTexture('bossTex');
        this.setOrigin(0.5);
        if (this.body) {
            this.body.setSize(size, size);
        }

        this.startAttackPattern();
    }

    private startAttackPattern() {
        this.attackTimer = this.scene.time.addEvent({
            delay: 3000,
            loop: true,
            callback: () => {
                if (!this.active) {
                    this.attackTimer?.remove();
                    return;
                }
                this.chooseAttack();
            }
        });
    }

    private chooseAttack() {
        if (this.health < this.maxHealth * 0.5 && this.phase === 1) {
            this.phase = 2;
            this.setTint(0xff0000);
            this.scene.time.delayedCall(500, () => this.clearTint());
            const arena = this.scene as any;
            if (arena.screenShake) arena.screenShake(500, 0.05);
        }

        const r = Math.random();
        if (r < 0.5) {
            this.telegraphSlam();
        } else {
            this.bulletHell();
        }
    }

    private telegraphSlam() {
        this.setVelocity(0, 0); // Stop moving
        
        // Target player's current position
        const targetX = (this as any).target.x;
        const targetY = (this as any).target.y;
        
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xff0000, 0.3);
        graphics.fillCircle(targetX, targetY, 200);

        // Flash it
        this.scene.tweens.add({
            targets: graphics,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 9,
            onComplete: () => {
                if (!this.active) {
                    graphics.destroy();
                    return;
                }
                
                // Explode
                graphics.clear();
                graphics.fillStyle(0xff0000, 0.8);
                graphics.fillCircle(targetX, targetY, 200);
                
                // Damage player if in area
                const player = (this as any).target;
                if (!player.isInvincible && Phaser.Math.Distance.Between(player.x, player.y, targetX, targetY) <= 200) {
                    const arena = this.scene as any;
                    if (arena.handleEnemyCollidePlayer) {
                        arena.handleEnemyCollidePlayer(player, this); // Deals default contact damage
                    }
                }

                const arena = this.scene as any;
                if (arena.screenShake) arena.screenShake(200, 0.03);

                this.scene.time.delayedCall(200, () => graphics.destroy());
            }
        });
    }

    private bulletHell() {
        const numProjectiles = this.phase === 2 ? 36 : 18;
        for (let i = 0; i < numProjectiles; i++) {
            const angle = (i / numProjectiles) * Math.PI * 2;
            const proj = this.scene.add.circle(this.x, this.y, 12, 0xff00ff);
            this.scene.physics.add.existing(proj);
            (proj.body as Phaser.Physics.Arcade.Body).setCircle(12);
            
            const speed = 250;
            (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            const arena = this.scene as any;
            this.scene.physics.add.overlap(arena.player, proj, () => {
                arena.handleEnemyCollidePlayer(arena.player, proj);
                proj.destroy();
            });

            this.scene.time.delayedCall(5000, () => {
                if (proj.active) proj.destroy();
            });
        }
    }

    update(time: number, delta: number) {
        if (!this.active) return;
        super.update(time, delta);
        
        // Draw health bar
        const arena = this.scene as any;
        if (!arena.bossHpBar) {
            arena.bossHpBar = this.scene.add.graphics();
            arena.bossHpBar.setScrollFactor(0);
            arena.bossHpBar.setDepth(100);
        }
        const g = arena.bossHpBar;
        g.clear();
        
        const cx = this.scene.cameras.main.width / 2;
        const cy = 40;
        const w = 600;
        const h = 20;
        
        g.fillStyle(0x333333, 1.0);
        g.fillRect(cx - w/2, cy, w, h);
        
        g.fillStyle(0xff0000, 1.0);
        const hpPercent = Phaser.Math.Clamp(this.health / this.maxHealth, 0, 1);
        g.fillRect(cx - w/2, cy, w * hpPercent, h);

        // Name
        if (!arena.bossText) {
            arena.bossText = this.scene.add.text(cx, cy - 20, 'THE WARDEN', { fontSize: '24px', color: '#ff0000', fontStyle: 'bold' }).setOrigin(0.5);
            arena.bossText.setScrollFactor(0);
            arena.bossText.setDepth(100);
        }
    }

    override takeDamage(amount: number) {
        super.takeDamage(amount);
        if (this.health <= 0) {
            const arena = this.scene as any;
            if (arena.bossHpBar) {
                arena.bossHpBar.destroy();
                arena.bossHpBar = null;
            }
            if (arena.bossText) {
                arena.bossText.destroy();
                arena.bossText = null;
            }
        }
    }
}
