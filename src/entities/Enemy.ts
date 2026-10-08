import Phaser from 'phaser';

export type EnemyType = 'grunt' | 'brute' | 'sprinter' | 'ranger' | 'boss';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    private speed: number = 100;
    private target!: Phaser.Physics.Arcade.Sprite;
    public health: number = 30;
    private stunTimer: number = 0;
    public knockbackResist: number = 1.0;
    public type: EnemyType;
    private nextFireTime: number = 0;
    public lodgedCastCount: number = 0;
    public hasPoseidonSurge: boolean = false;
    private doomTimer: Phaser.Time.TimerEvent | null = null;
    
    public state: 'MOVE' | 'TELEGRAPH' | 'ATTACK' | 'COOLDOWN' = 'MOVE';
    private stateTimer: number = 0;
    private telegraphGraphics: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: Phaser.Scene, x: number, y: number, target: Phaser.Physics.Arcade.Sprite, type: EnemyType = 'grunt') {
        super(scene, x, y, '');
        this.target = target;
        this.type = type;
        
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        let color = 0xff0000;
        let size = 32;

        if (type === 'brute') {
            color = 0xff8800;
            size = 48;
            this.speed = 60;
            this.health = 150;
            this.knockbackResist = 0.3;
            this.knockbackResist = 0.3;
        } else if (type === 'sprinter') {
            color = 0xffff00;
            size = 24;
            this.speed = 180;
            this.health = 10;
            this.knockbackResist = 1.5;
            this.knockbackResist = 1.5;
        } else if (type === 'ranger') {
            color = 0xff00ff;
            size = 28;
            this.speed = 80;
            this.health = 20;
            this.knockbackResist = 0.8;
            this.knockbackResist = 0.8;
        }

        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(color, 1.0);
        g.fillRect(0, 0, size, size);
        const texName = `enemyTex_${type}`;
        if (!scene.textures.exists(texName)) {
            g.generateTexture(texName, size, size);
        }
        g.destroy();

        this.setTexture(texName);
        this.setOrigin(0.5);
        if (this.body) {
            this.body.setSize(size, size);
        }
    }

    private cancelAttack() {
        this.state = 'MOVE';
        if (this.telegraphGraphics) {
            this.telegraphGraphics.destroy();
            this.telegraphGraphics = null;
        }
    }

    update(time: number, _delta: number) {
        if (!this.active) return;
        
        if (time < this.stunTimer) {
            // we are knocked back
            this.cancelAttack();
            this.setRotation(this.rotation + 0.1); // spin while knocked back
            return;
        }

        if (this.type === 'boss') {
            // Boss handles its own movement/attacks in BossEnemy.ts
            return;
        }

        if (!this.target || !this.target.active) return;

        const distToPlayer = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (this.type === 'ranger') {
            if (distToPlayer < 300) {
                this.setVelocity(0, 0);
                this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y));
                if (time > this.nextFireTime) {
                    this.fireProjectile();
                    this.nextFireTime = time + 1500;
                }
            } else {
                this.moveTowardsTarget();
            }
            return;
        }

        // Melee logic
        if (this.state === 'COOLDOWN' && time > this.stateTimer) {
            this.state = 'MOVE';
        }

        if (this.state === 'MOVE') {
            let attackRange = 60;
            if (this.type === 'brute') attackRange = 100;
            if (this.type === 'sprinter') attackRange = 50;

            if (distToPlayer <= attackRange && time > this.stateTimer) {
                // Enter telegraph
                this.state = 'TELEGRAPH';
                this.setVelocity(0, 0);
                this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y));
                
                let teleDuration = 400;
                if (this.type === 'sprinter') teleDuration = 100;
                if (this.type === 'brute') teleDuration = 1000;
                this.stateTimer = time + teleDuration;

                this.telegraphGraphics = this.scene.add.graphics();
                if (this.type === 'brute') {
                    // Ground AoE indicator
                    this.telegraphGraphics.fillStyle(0xff0000, 0.3);
                    this.telegraphGraphics.fillCircle(this.x, this.y, 120);
                } else {
                    // Flash white
                    this.setTint(0xffffff);
                }
            } else {
                this.moveTowardsTarget();
            }
        } else if (this.state === 'TELEGRAPH') {
            this.setVelocity(0, 0); // stay still
            if (time > this.stateTimer) {
                // Execute Attack
                this.state = 'ATTACK';
                this.clearTint();
                if (this.telegraphGraphics) {
                    this.telegraphGraphics.destroy();
                    this.telegraphGraphics = null;
                }
                
                this.executeAttack();
                
                let attackDuration = 200;
                if (this.type === 'brute') attackDuration = 300;
                this.stateTimer = time + attackDuration;
            }
        } else if (this.state === 'ATTACK') {
            // Lunge forward slightly or stay still (AoE)
            if (this.type !== 'brute') {
                const lungeSpeed = 300;
                this.setVelocity(Math.cos(this.rotation) * lungeSpeed, Math.sin(this.rotation) * lungeSpeed);
            } else {
                this.setVelocity(0, 0);
            }

            if (time > this.stateTimer) {
                this.state = 'COOLDOWN';
                let cooldown = 1000;
                if (this.type === 'sprinter') cooldown = 500;
                if (this.type === 'brute') cooldown = 2000;
                this.stateTimer = time + cooldown;
            }
        }
    }

    private executeAttack() {
        if (!this.active || !this.target || !this.target.active) return;
        const arena = this.scene as any;
        const player = arena.player;
        if (!player || player.isInvincible) return;

        if (this.type === 'brute') {
            // AoE Damage
            const radius = 120;
            // Visual pop
            const g = this.scene.add.graphics();
            g.fillStyle(0xff0000, 0.8);
            g.fillCircle(this.x, this.y, radius);
            this.scene.time.delayedCall(150, () => g.destroy());
            arena.screenShake(100, 0.02);

            if (Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y) <= radius) {
                player.setTint(0xff0000);
                this.scene.time.delayedCall(100, () => player.clearTint());
                player.health -= 20; // Brute hits hard
                if (player.health <= 0) this.scene.scene.start('HubScene');
            }
        } else {
            // Melee hitbox in front
            const reach = 60;
            const hitX = this.x + Math.cos(this.rotation) * reach;
            const hitY = this.y + Math.sin(this.rotation) * reach;
            
            // Visual swipe
            const g = this.scene.add.graphics();
            g.lineStyle(4, 0xff0000, 1.0);
            g.beginPath();
            g.arc(this.x, this.y, reach, this.rotation - 1.0, this.rotation + 1.0, false);
            g.strokePath();
            this.scene.time.delayedCall(100, () => g.destroy());

            // Check if player is near hit point
            if (Phaser.Math.Distance.Between(hitX, hitY, player.x, player.y) <= 40) {
                player.setTint(0xff0000);
                this.scene.time.delayedCall(100, () => player.clearTint());
                player.health -= 10;
                if (player.health <= 0) this.scene.scene.start('HubScene');
            }
        }
    }

    private moveTowardsTarget() {
        const arena = this.scene as any;
        if (arena.flowField) {
            const flowDir = arena.flowField.getDirection(this.x, this.y, arena.tileSize);
            if (flowDir.lengthSq() > 0) {
                this.setVelocity(flowDir.x * this.speed, flowDir.y * this.speed);
                this.setRotation(flowDir.angle());
                return;
            }
        }

        // Fallback
        if (this.target && this.target.active && this.body) {
            this.scene.physics.moveToObject(this, this.target, this.speed);
            this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, this.target.x, this.target.y));
        }
    }

    applyKnockback(vx: number, vy: number, duration: number = 200, player?: any) {
        if (!this.active) return;
        
        let multiplier = 1.0;
        if (player && player.boons && player.boons.includes('poseidon_surge')) {
            multiplier = 2.5;
            this.hasPoseidonSurge = true;
            this.scene.time.delayedCall(duration, () => {
                if (this.active) this.hasPoseidonSurge = false;
            });
        }

        this.setVelocity(vx * this.knockbackResist * multiplier, vy * this.knockbackResist * multiplier);
        this.stunTimer = this.scene.time.now + duration;
    }

    public applyDoom(damage: number) {
        if (this.doomTimer) return; // Already doomed

        const indicator = this.scene.add.sprite(this.x, this.y - 40, 'bombTex');
        indicator.setTint(0xff0000);
        
        // Follow enemy
        const followEvent = this.scene.time.addEvent({
            delay: 16,
            loop: true,
            callback: () => {
                if (!this.active) {
                    indicator.destroy();
                    followEvent.remove();
                    return;
                }
                indicator.setPosition(this.x, this.y - 40);
            }
        });

        this.doomTimer = this.scene.time.delayedCall(1500, () => {
            indicator.destroy();
            followEvent.remove();
            this.doomTimer = null;
            if (this.active) {
                this.takeDamage(damage);
                // Mini hitstop effect for doom burst
                const arena = this.scene as any;
                if (arena.hitStop) arena.hitStop(30);
            }
        });
    }

    takeDamage(amount: number) {
        if (this.lodgedCastCount > 0) {
            amount *= (1 + 0.5 * this.lodgedCastCount); // +50% dmg per cast
        }
        this.health -= amount;
        
        this.setTint(0xffffff);
        this.scene.time.delayedCall(100, () => {
            if (this.active) {
                if (this.lodgedCastCount > 0) {
                    this.setTint(0xff8888); // indicate cast is lodged
                } else {
                    this.clearTint();
                }
            }
        });

        if (this.health <= 0) {
            this.die();
        }
    }

    public lodgeBloodstone() {
        this.lodgedCastCount++;
        this.setTint(0xff8888);
        
        // Dislodge automatically after 10s
        this.scene.time.delayedCall(10000, () => {
            if (this.active && this.lodgedCastCount > 0) {
                this.lodgedCastCount--;
                if (this.lodgedCastCount === 0) this.clearTint();
                // Drop pickup
                const arena = this.scene as any;
                if (arena.dropBloodstonePickup) {
                    arena.dropBloodstonePickup(this.x, this.y);
                }
            }
        });
    }

    private die() {
        this.scene.events.emit('enemy-died', 0);
        this.scene.events.emit('enemy-drop', this.x, this.y);
        
        const arena = this.scene as any;
        if (arena.dropBloodstonePickup) {
            for (let i = 0; i < this.lodgedCastCount; i++) {
                arena.dropBloodstonePickup(this.x + Math.random() * 20 - 10, this.y + Math.random() * 20 - 10);
            }
        }

        this.destroy();
    }

    private fireProjectile() {
        const proj = this.scene.add.circle(this.x, this.y, 8, 0xff00ff);
        this.scene.physics.add.existing(proj);
        (proj.body as Phaser.Physics.Arcade.Body).setCircle(8);
        
        const arena = this.scene as any;
        const angle = this.rotation;
        const speed = 300;
        
        (proj.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
        
        this.scene.physics.add.overlap(arena.player, proj, () => {
            arena.handleEnemyCollidePlayer(arena.player, proj);
            proj.destroy();
        });

        this.scene.time.delayedCall(2000, () => {
            if (proj.active) proj.destroy();
        });
    }
}
