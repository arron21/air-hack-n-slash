import Phaser, { Scene } from 'phaser';
import { InputManager } from '../managers/InputManager';
import { Player } from '../entities/Player';
import { Enemy } from '../entities/Enemy';
import { BasicSword } from '../weapons/BasicSword';
import { MagicWand } from '../weapons/MagicWand';
import { Spear } from '../weapons/Spear';
import { Scythe } from '../weapons/Scythe';
import { Hammer } from '../weapons/Hammer';
import { Bow } from '../weapons/Bow';
import { Bomb } from '../weapons/Bomb';
import { Katana } from '../weapons/Katana';
import { WeaponPickup } from '../entities/WeaponPickup';
import { BloodstoneProjectile, BloodstonePickup } from '../entities/Bloodstone';
import { ExplodingBarrel, SpikeTrap } from '../entities/Hazards';
import { LevelGenerator } from '../level/LevelGenerator';
import { FlowField } from '../level/FlowField';
import { RoomManager } from '../managers/RoomManager';

export class MainArena extends Scene {
    public player!: Player;
    private inputManager!: InputManager;
    public enemies!: Phaser.Physics.Arcade.Group;
    public walls!: Phaser.Physics.Arcade.StaticGroup;
    public flowField!: FlowField;
    public roomManager!: RoomManager;
    public tileSize = 64;

    public floor: number = 1;
    private boons: string[] = [];
    public nextLevelXp: number = 100;
    public isHitStopped: boolean = false;
    private crosshair!: Phaser.GameObjects.Graphics;
    
    private loadoutData: string[] = ['BasicSword'];

    constructor() {
        super('MainArena');
    }

    init(data: any) {
        this.isHitStopped = false;
        if (data && data.loadout) {
            this.loadoutData = data.loadout;
        }
        if (data && data.floor) {
            this.floor = data.floor;
        }
        if (data && data.boons) {
            this.boons = data.boons;
        }
    }

    create() {
        this.cameras.main.setBackgroundColor('#1a1a1a');

        const mapWidth = 40;
        const mapHeight = 40;
        
        const generator = new LevelGenerator(mapWidth, mapHeight, this.floor);
        this.flowField = new FlowField(generator.grid);
        this.physics.world.setBounds(0, 0, mapWidth * this.tileSize, mapHeight * this.tileSize);

        this.walls = this.physics.add.staticGroup();

        for (let y = 0; y < mapHeight; y++) {
            for (let x = 0; x < mapWidth; x++) {
                if (generator.grid[y][x] === 1) {
                    const rect = this.add.rectangle(x * this.tileSize + this.tileSize / 2, y * this.tileSize + this.tileSize / 2, this.tileSize, this.tileSize, 0x333333);
                    this.walls.add(rect);
                }
            }
        }

        this.inputManager = new InputManager(this);
        
        const spawnPos = generator.getValidSpawnPoint();
        this.player = new Player(this, spawnPos.x * this.tileSize + this.tileSize / 2, spawnPos.y * this.tileSize + this.tileSize / 2, this.inputManager);
        this.player.setCollideWorldBounds(true);

        for (const wName of this.loadoutData) {
            if (wName === 'BasicSword') this.player.weapons.push(new BasicSword());
            else if (wName === 'MagicWand') this.player.weapons.push(new MagicWand());
            else if (wName === 'Spear') this.player.weapons.push(new Spear());
            else if (wName === 'Scythe') this.player.weapons.push(new Scythe());
            else if (wName === 'Hammer') this.player.weapons.push(new Hammer());
            else if (wName === 'Bow') this.player.weapons.push(new Bow());
            else if (wName === 'Bomb') this.player.weapons.push(new Bomb());
            else if (wName === 'Katana') this.player.weapons.push(new Katana());
        }

        this.cameras.main.setBounds(0, 0, mapWidth * this.tileSize, mapHeight * this.tileSize);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1);

        this.player.boons = this.boons;
        
        const stamBonus = parseInt(localStorage.getItem('maxStaminaBonus') || '0');
        this.player.maxStamina += stamBonus;
        
        const dmgBonus = parseInt(localStorage.getItem('damageBonus') || '0');
        this.player.damageMultiplier = 1.0 + (dmgBonus / 100);

        this.player.stamina = this.player.maxStamina;
        this.player.health = this.player.maxHealth;

        this.enemies = this.physics.add.group({
            classType: Enemy,
            runChildUpdate: true
        });

        // Spawn Hazards
        if (this.floor % 10 !== 0) {
            const barrelLocs = generator.getHazardLocations(5);
            for (const loc of barrelLocs) {
                const barrel = new ExplodingBarrel(this, loc.x * this.tileSize + this.tileSize / 2, loc.y * this.tileSize + this.tileSize / 2);
                this.enemies.add(barrel, true); // Put in enemies group so weapons can hit it
            }

            const spikeLocs = generator.getHazardLocations(8);
            for (const loc of spikeLocs) {
                const spike = new SpikeTrap(this, loc.x * this.tileSize + this.tileSize / 2, loc.y * this.tileSize + this.tileSize / 2);
                this.children.add(spike); // Spikes update independently
            }
        }

        this.roomManager = new RoomManager(this, this.floor);

        this.physics.add.collider(this.player, this.enemies, this.handleEnemyCollidePlayer, undefined, this);
        this.physics.add.collider(this.enemies, this.enemies);
        this.physics.add.collider(this.player, this.walls);
        this.physics.add.collider(this.enemies, this.walls, this.handleEnemyWallCollide, undefined, this);

        this.events.on('enemy-died', (_xpAmount: number) => {
            if (Math.random() < 0.2) {
                let d = parseInt(localStorage.getItem('darkness') || '0');
                d++;
                localStorage.setItem('darkness', d.toString());
            }
        });

        this.events.on('room-cleared', () => {
            this.spawnPortal();
        });

        this.events.on('enemy-drop', (x: number, y: number) => {
            if (Math.random() < 0.05) { // 5% drop chance
                const pickup = new WeaponPickup(this, x, y);
                this.physics.add.overlap(this.player, pickup, (p, pk) => {
                    (pk as WeaponPickup).collect(p as Player);
                });
            }
        });
        
        this.crosshair = this.add.graphics();
        this.crosshair.setDepth(100);
        this.crosshair.lineStyle(2, 0xff0000, 0.8);
        this.crosshair.beginPath();
        this.crosshair.moveTo(-10, 0);
        this.crosshair.lineTo(10, 0);
        this.crosshair.moveTo(0, -10);
        this.crosshair.lineTo(0, 10);
        this.crosshair.strokePath();
        this.crosshair.setVisible(false);

        this.scene.launch('UIScene');
    }

    private spawnPortal() {
        const portal = this.add.graphics();
        portal.fillStyle(0x8800ff, 1.0);
        portal.fillCircle(0, 0, 40);
        
        const zone = this.add.zone(this.player.x, this.player.y, 80, 80);
        this.physics.add.existing(zone);
        
        portal.setPosition(this.player.x, this.player.y - 150);
        zone.setPosition(this.player.x, this.player.y - 150);

        this.physics.add.overlap(this.player, zone, () => {
            zone.destroy();
            this.scene.start('UpgradeScene', { loadout: this.loadoutData, floor: this.floor + 1, boons: this.boons });
        });
    }

    public hitStop(duration: number = 50) {
        this.isHitStopped = true;
        this.physics.world.pause();
        // Use a timer event that ignores the hitstop
        this.time.addEvent({
            delay: duration,
            callback: () => {
                this.isHitStopped = false;
                this.physics.world.resume();
            }
        });
    }

    public fireBloodstone(x: number, y: number, angle: number) {
        new BloodstoneProjectile(this, x, y, angle, this.player);
    }

    public dropBloodstonePickup(x: number, y: number) {
        new BloodstonePickup(this, x, y, this.player);
    }

    public screenShake(duration: number = 100, intensity: number = 0.01) {
        this.cameras.main.shake(duration, intensity);
    }

    public triggerChainLightning(startEnemy: Enemy, bounces: number, damage: number) {
        let current = startEnemy;
        let count = 0;
        
        const bounceEvent = this.time.addEvent({
            delay: 100,
            repeat: bounces - 1,
            callback: () => {
                const enemies = this.enemies.getChildren() as Enemy[];
                let nextTarget: Enemy | null = null;
                let closestDist = 400; // max bounce distance
                
                for (const e of enemies) {
                    if (!e.active || e === current) continue;
                    const dist = Phaser.Math.Distance.Between(current.x, current.y, e.x, e.y);
                    if (dist < closestDist) {
                        closestDist = dist;
                        nextTarget = e;
                    }
                }

                if (nextTarget) {
                    // Draw lightning
                    const graphics = this.add.graphics();
                    graphics.lineStyle(4, 0xffff00, 1.0);
                    graphics.beginPath();
                    graphics.moveTo(current.x, current.y);
                    graphics.lineTo(nextTarget.x, nextTarget.y);
                    graphics.strokePath();

                    this.time.delayedCall(100, () => graphics.destroy());

                    nextTarget.takeDamage(damage);
                    current = nextTarget;
                    count++;
                } else {
                    bounceEvent.remove(); // No more targets
                }
            }
        });
    }

    private handleEnemyWallCollide(enemyObj: any, _wall: any) {
        const enemy = enemyObj as Enemy;
        if (enemy.hasPoseidonSurge) {
            enemy.hasPoseidonSurge = false;
            enemy.takeDamage(50);
            this.screenShake(100, 0.015);
        }
    }

    update(time: number, delta: number) {
        if (this.isHitStopped) return;

        this.player.update(time, delta);
        
        const playerGridX = Math.floor(this.player.x / this.tileSize);
        const playerGridY = Math.floor(this.player.y / this.tileSize);
        this.flowField.updateTarget(playerGridX, playerGridY);
        
        this.roomManager.update(time);

        // Update spikes
        for (const child of this.children.getChildren()) {
            if (child instanceof SpikeTrap) {
                child.update(time);
            }
        }

        // Update crosshair
        if (this.inputManager.hasGamepad()) {
            const aimVec = this.inputManager.getAimVector(this.player.x, this.player.y);
            if (aimVec.lengthSq() > 0) {
                this.crosshair.setVisible(true);
                const crosshairDist = 150;
                this.crosshair.setPosition(this.player.x + aimVec.x * crosshairDist, this.player.y + aimVec.y * crosshairDist);
            } else {
                this.crosshair.setVisible(false);
            }
        } else {
            this.crosshair.setVisible(false);
        }
    }

    public handleEnemyCollidePlayer(playerObj: any, _enemyObj: any) {
        if (_enemyObj.type === 'grunt' || _enemyObj.type === 'brute' || _enemyObj.type === 'sprinter' || _enemyObj.type === 'ranger' || _enemyObj.type === 'boss') {
            // Ignore standard passive contact damage for enemies.
            return;
        }

        const player = playerObj as Player;
        if (player.isInvincible) return;

        if (player.currentState === 'BLOCK') {
            if (player.getStamina() >= 10) {
                 return;
            }
        }

        player.setTint(0xff0000);
        this.time.delayedCall(100, () => player.clearTint());
        
        player.health -= 10;
        if (player.health <= 0) {
            this.scene.start('HubScene');
        }
    }
}
