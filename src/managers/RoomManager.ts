import { Enemy, type EnemyType } from '../entities/Enemy';
import { BossEnemy } from '../entities/BossEnemy';
import { MainArena } from '../scenes/MainArena';
import Phaser from 'phaser';

export class RoomManager {
    private scene: MainArena;
    private enemiesToSpawn: number;
    private spawned: number = 0;
    private nextSpawnTime: number = 0;
    private roomCleared: boolean = false;

    private isBossRoom: boolean = false;

    constructor(scene: MainArena, floor: number) {
        this.scene = scene;
        if (floor % 10 === 0) {
            this.enemiesToSpawn = 1;
            this.isBossRoom = true;
        } else {
            this.enemiesToSpawn = 5 + floor * 3;
        }
    }

    public update(time: number) {
        if (this.spawned < this.enemiesToSpawn && time > this.nextSpawnTime) {
            this.spawnEnemy();
            this.spawned++;
            this.nextSpawnTime = time + (1000 - Math.min(this.scene.floor * 50, 800)); // spawns faster on higher floors
        }

        if (!this.roomCleared && this.spawned >= this.enemiesToSpawn) {
            let enemiesAlive = false;
            for (const child of this.scene.enemies.getChildren()) {
                if (child.active && child instanceof Enemy) {
                    enemiesAlive = true;
                    break;
                }
            }
            if (!enemiesAlive) {
                this.roomCleared = true;
                this.scene.events.emit('room-cleared');
            }
        }
    }

    private spawnEnemy() {
        if (this.isBossRoom) {
            const cam = this.scene.cameras.main;
            const sx = cam.worldView.centerX;
            const sy = cam.worldView.centerY - 200;
            const boss = new BossEnemy(this.scene, sx, sy, this.scene.player);
            this.scene.enemies.add(boss, true);
            return;
        }

        const rand = Math.random();
        let type: EnemyType = 'grunt';
        
        if (this.scene.floor > 2 && rand < 0.2) type = 'brute';
        else if (this.scene.floor > 1 && rand < 0.4) type = 'sprinter';
        else if (this.scene.floor > 1 && rand < 0.6) type = 'ranger';

        const cam = this.scene.cameras.main;
        const margin = 100;
        
        let sx = 0;
        let sy = 0;
        
        if (Math.random() < 0.5) {
            sx = cam.worldView.x - margin + Math.random() * (cam.worldView.width + margin * 2);
            sy = Math.random() < 0.5 ? cam.worldView.y - margin : cam.worldView.bottom + margin;
        } else {
            sx = Math.random() < 0.5 ? cam.worldView.x - margin : cam.worldView.right + margin;
            sy = cam.worldView.y - margin + Math.random() * (cam.worldView.height + margin * 2);
        }

        sx = Phaser.Math.Clamp(sx, 128, this.scene.physics.world.bounds.width - 128);
        sy = Phaser.Math.Clamp(sy, 128, this.scene.physics.world.bounds.height - 128);

        const enemy = new Enemy(this.scene, sx, sy, this.scene.player, type);
        this.scene.enemies.add(enemy, true);
    }
}
