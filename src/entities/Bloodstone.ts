import Phaser from 'phaser';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { MainArena } from '../scenes/MainArena';

export class BloodstoneProjectile extends Phaser.Physics.Arcade.Sprite {
    public player: Player;
    private arena: MainArena;

    constructor(scene: Phaser.Scene, x: number, y: number, angle: number, player: Player) {
        super(scene, x, y, '');
        this.player = player;
        this.arena = scene as MainArena;

        scene.add.existing(this);
        scene.physics.add.existing(this);

        const g = scene.make.graphics({x:0, y:0});
        g.fillStyle(0xff0000, 1.0);
        g.beginPath();
        g.moveTo(8, 0);
        g.lineTo(16, 8);
        g.lineTo(8, 16);
        g.lineTo(0, 8);
        g.closePath();
        g.fillPath();
        g.generateTexture('bloodstoneTex', 16, 16);
        g.destroy();

        this.setTexture('bloodstoneTex');
        this.setRotation(angle);

        const speed = 800;
        this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

        // Add overlap with enemies
        scene.physics.add.overlap(this, this.arena.enemies, this.handleHitEnemy as any, undefined, this);
        // Add collider with walls
        scene.physics.add.collider(this, this.arena.walls, this.handleHitWall as any, undefined, this);

        // Destroy after 3 seconds if nothing is hit (and drop as pickup)
        scene.time.delayedCall(3000, () => {
            if (this.active) {
                this.dropPickup(this.x, this.y);
            }
        });
    }

    private handleHitEnemy(_proj: any, enemyObj: any) {
        if (!this.active) return;
        const enemy = enemyObj as Enemy;
        if (!enemy.active) return;

        enemy.lodgeBloodstone();
        this.destroy();
    }

    private handleHitWall() {
        if (!this.active) return;
        this.dropPickup(this.x, this.y);
    }

    private dropPickup(dx: number, dy: number) {
        new BloodstonePickup(this.arena, dx, dy, this.player);
        this.destroy();
    }
}

export class BloodstonePickup extends Phaser.Physics.Arcade.Sprite {
    public player: Player;

    constructor(scene: Phaser.Scene, x: number, y: number, player: Player) {
        super(scene, x, y, 'bloodstoneTex');
        this.player = player;

        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        this.scene.tweens.add({
            targets: this,
            y: this.y - 10,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Add overlap with player
        scene.physics.add.overlap(this.player, this, this.collect as any, undefined, this);
    }

    private collect() {
        if (!this.active) return;
        if (this.player.castAmmo < this.player.maxCastAmmo) {
            this.player.castAmmo++;
            this.destroy();
        }
    }
}
