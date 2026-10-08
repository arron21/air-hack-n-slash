import Phaser from 'phaser';
import { MainArena } from '../scenes/MainArena';
import { Enemy } from './Enemy';

export class ExplodingBarrel extends Phaser.Physics.Arcade.Sprite {
    public health: number = 1;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '');
        scene.add.existing(this);
        scene.physics.add.existing(this);

        const g = scene.make.graphics({x:0, y:0});
        g.fillStyle(0x8B4513, 1.0); // SaddleBrown
        g.fillCircle(16, 16, 16);
        g.fillStyle(0xff0000, 1.0);
        g.fillCircle(16, 16, 6);
        g.generateTexture('barrelTex', 32, 32);
        g.destroy();

        this.setTexture('barrelTex');
        this.setImmovable(true);
        if (this.body) {
            this.body.setSize(32, 32);
        }
    }

    takeDamage(amount: number) {
        if (!this.active) return;
        this.health -= amount;
        if (this.health <= 0) {
            this.active = false;
            this.explode();
        }
    }

    private explode() {
        const radius = 150;
        const graphics = this.scene.add.graphics();
        graphics.fillStyle(0xffaa00, 0.8);
        graphics.fillCircle(this.x, this.y, radius);

        this.scene.time.delayedCall(200, () => graphics.destroy());

        const arena = this.scene as MainArena;
        arena.screenShake(200, 0.02);

        // Damage enemies
        const enemies = arena.enemies.getChildren() as Enemy[];
        for (const enemy of enemies) {
            if (!enemy.active) continue;
            if (Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) <= radius) {
                enemy.takeDamage(100);
            }
        }

        // Damage player
        if (!arena.player.isInvincible && Phaser.Math.Distance.Between(this.x, this.y, arena.player.x, arena.player.y) <= radius) {
            arena.handleEnemyCollidePlayer(arena.player, this); // Deals generic contact damage
        }

        this.destroy();
    }

    applyKnockback() {}
    applyDoom() {}
    lodgeBloodstone() {}
    get hazardType() { return 'barrel'; }
    get lodgedCastCount() { return 0; }
    set lodgedCastCount(_v: number) {}
}

export class SpikeTrap extends Phaser.GameObjects.Sprite {
    private isSprung: boolean = false;
    private arena: MainArena;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y, '');
        this.arena = scene as MainArena;
        scene.add.existing(this);

        const g = scene.make.graphics({x:0,y:0});
        g.fillStyle(0x555555, 1.0);
        g.fillRect(0, 0, 64, 64);
        g.fillStyle(0x222222, 1.0);
        g.fillCircle(32, 32, 8);
        g.generateTexture('spikeTrapTex', 64, 64);
        g.destroy();

        this.setTexture('spikeTrapTex');
        this.setDepth(0); // Under characters
    }

    update(_time: number) {
        if (this.isSprung) return;

        // Check distance to player and enemies
        const player = this.arena.player;
        if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 30) {
            this.springTrap();
            return;
        }

        const enemies = this.arena.enemies.getChildren() as Enemy[];
        for (const enemy of enemies) {
            if (enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) < 30) {
                this.springTrap();
                return;
            }
        }
    }

    private springTrap() {
        this.isSprung = true;
        
        // Visual
        const g = this.scene.make.graphics({x:0,y:0});
        g.fillStyle(0x555555, 1.0);
        g.fillRect(0, 0, 64, 64);
        g.fillStyle(0xffffff, 1.0);
        // Draw spikes
        for(let i=0; i<3; i++) {
            for(let j=0; j<3; j++) {
                g.fillTriangle(10+i*20, 20+j*20, 20+i*20, 20+j*20, 15+i*20, 5+j*20);
            }
        }
        g.generateTexture('spikeTrapSprungTex', 64, 64);
        g.destroy();
        this.setTexture('spikeTrapSprungTex');

        // Damage anything on it
        const player = this.arena.player;
        if (!player.isInvincible && Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) < 40) {
            this.arena.handleEnemyCollidePlayer(player, this);
        }

        const enemies = this.arena.enemies.getChildren() as Enemy[];
        for (const enemy of enemies) {
            if (enemy.active && Phaser.Math.Distance.Between(this.x, this.y, enemy.x, enemy.y) < 40) {
                enemy.takeDamage(50);
            }
        }

        // Reset after 3 seconds
        this.scene.time.delayedCall(3000, () => {
            if (this.active) {
                this.isSprung = false;
                this.setTexture('spikeTrapTex');
            }
        });
    }
}
