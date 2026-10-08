import Phaser from 'phaser';
import { InputManager } from '../managers/InputManager';
import type { Weapon } from '../weapons/Weapon';
import { Enemy } from './Enemy';

export type PlayerState = 'IDLE' | 'MOVE' | 'DODGE' | 'BLOCK' | 'ATTACK' | 'STUNNED';

export class Player extends Phaser.Physics.Arcade.Sprite {
    public currentState: PlayerState = 'IDLE';
    private inputManager: InputManager;
    private speed: number = 200;
    private dodgeSpeed: number = 1000;
    private dodgeDuration: number = 150;
    public stateTimer: number = 0; // Public for weapons to read
    private lastTrailTime: number = 0;
    private lastWeaponSwapTime: number = 0;
    
    public stamina: number = 100;
    public maxStamina: number = 100;
    
    public health: number = 100;
    public maxHealth: number = 100;
    
    // Modifiers
    public knockbackMultiplier: number = 1.0;
    public damageMultiplier: number = 1.0;

    public isInvincible: boolean = false;

    private shieldGraphics: Phaser.GameObjects.Graphics;
    
    public boons: string[] = [];
    
    public weapons: Weapon[] = [];
    public activeWeaponIndex: number = 0;

    // Cast Ammo
    public castAmmo: number = 1;
    public maxCastAmmo: number = 1;
    private castCooldown: number = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, inputManager: InputManager) {
        super(scene, x, y, '');
        this.inputManager = inputManager;
        scene.add.existing(this);
        scene.physics.add.existing(this);
        
        const g = scene.make.graphics({ x: 0, y: 0 });
        g.fillStyle(0x00aaff, 1.0);
        g.fillCircle(16, 16, 16);
        g.fillStyle(0xffffff, 1.0);
        g.fillRect(16, 12, 16, 8);
        g.generateTexture('playerTexture', 32, 32);

        this.setTexture('playerTexture');
        this.setOrigin(0.5);
        this.body?.setSize(24, 24);

        this.shieldGraphics = scene.add.graphics();
        this.shieldGraphics.setDepth(10);
    }

    public getActiveWeapon(): Weapon | undefined {
        return this.weapons[this.activeWeaponIndex];
    }

    update(time: number, delta: number) {
        if (this.currentState !== 'DODGE' && this.currentState !== 'BLOCK' && this.currentState !== 'ATTACK') {
            this.stamina = Phaser.Math.Clamp(this.stamina + 50 * (delta / 1000), 0, this.maxStamina);
        }

        this.shieldGraphics.clear();
        this.isInvincible = false;
        this.setAlpha(1.0);

        if (this.inputManager.isSwapWeaponPressed() && this.weapons.length > 1 && time > this.lastWeaponSwapTime) {
            this.activeWeaponIndex = (this.activeWeaponIndex + 1) % this.weapons.length;
            this.lastWeaponSwapTime = time + 300;
        }

        switch (this.currentState) {
            case 'IDLE':
            case 'MOVE':
                this.handleMovement();
                this.handleActions(time);
                break;
            case 'DODGE':
                this.handleDodge(time);
                break;
            case 'BLOCK':
                this.handleBlock();
                break;
            case 'ATTACK':
                this.handleAttack(time);
                break;
        }

        this.updateRotation();

        // Update all weapons (some might have active projectiles or decaying hitboxes)
        for (const w of this.weapons) {
            w.update(this.scene, this, time);
        }
    }

    private applyMovementInput() {
        const moveVec = this.inputManager.getMovementVector();
        this.setVelocity(moveVec.x * this.speed, moveVec.y * this.speed);
        return moveVec.lengthSq() > 0;
    }

    private handleMovement() {
        const isMoving = this.applyMovementInput();
        this.currentState = isMoving ? 'MOVE' : 'IDLE';
    }

    private handleActions(time: number) {
        if (this.inputManager.isDodgePressed() && this.stamina >= 20) {
            this.stamina -= 20;
            this.currentState = 'DODGE';
            this.stateTimer = time + this.dodgeDuration;
            const moveVec = this.inputManager.getMovementVector();
            const dashVec = moveVec.lengthSq() > 0 ? moveVec : this.inputManager.getAimVector(this.x, this.y);
            this.setVelocity(dashVec.x * this.dodgeSpeed, dashVec.y * this.dodgeSpeed);
            return;
        }

        if (this.inputManager.isCastPressed() && this.castAmmo > 0 && time > this.castCooldown) {
            this.fireCast(time);
            return; // don't block movement, just fire
        }

        // Disabled shield blocking per user request
        /*
        if (this.inputManager.isBlockPressed() && this.stamina > 0) {
            this.currentState = 'BLOCK';
            this.setVelocity(0, 0);
            return;
        }
        */

        const weapon = this.getActiveWeapon();
        if (weapon && this.inputManager.isAttackPressed() && this.stamina >= weapon.staminaCost) {
            this.stamina -= weapon.staminaCost;
            this.currentState = 'ATTACK';
            this.stateTimer = time + weapon.attackDuration;
            this.isDashStriking = false;
            weapon.attack(this.scene, this, time);
            return;
        }
    }

    public isDashStriking: boolean = false;

    private handleDodge(time: number) {
        this.isInvincible = true;
        this.setAlpha(0.5);

        // Allow Dash-Strike
        const weapon = this.getActiveWeapon();
        if (weapon && this.inputManager.isAttackPressed() && this.stamina >= weapon.staminaCost) {
            this.stamina -= weapon.staminaCost;
            this.currentState = 'ATTACK';
            this.stateTimer = time + weapon.attackDuration;
            this.isInvincible = false;
            this.setAlpha(1.0);
            
            this.isDashStriking = true;
            weapon.attack(this.scene, this, time);
            
            const speed = 500;
            const angle = this.rotation;
            this.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            return;
        }

        if (this.inputManager.isCastPressed() && this.castAmmo > 0 && time > this.castCooldown) {
            this.fireCast(time);
        }

        if (time > this.lastTrailTime) {
            const trail = this.scene.add.sprite(this.x, this.y, this.texture.key);
            trail.setRotation(this.rotation);
            trail.setOrigin(0.5);
            trail.setTint(0x00aaff);
            trail.setAlpha(0.5);
            
            this.scene.tweens.add({
                targets: trail,
                alpha: 0,
                duration: 300,
                onComplete: () => trail.destroy()
            });
            this.lastTrailTime = time + 30; // Every 30ms
        }

        if (time > this.stateTimer) {
            this.currentState = 'IDLE';
        }
    }

    private handleBlock() {
        if (!this.inputManager.isBlockPressed() || this.stamina <= 0) {
            this.currentState = 'IDLE';
        } else {
            this.stamina -= 10 * (this.scene.game.loop.delta / 1000);
            
            this.shieldGraphics.lineStyle(4, 0x00ffff, 1.0);
            this.shieldGraphics.beginPath();
            this.shieldGraphics.arc(this.x, this.y, 24, this.rotation - 0.5, this.rotation + 0.5, false);
            this.shieldGraphics.strokePath();
        }
    }

    private handleAttack(time: number) {
        this.applyMovementInput();
        if (time > this.stateTimer) {
            this.currentState = 'IDLE';
            this.isDashStriking = false;
        }
    }

    private updateRotation() {
        if (this.currentState === 'DODGE') return;
        
        const aimVec = this.inputManager.getAimVector(this.x, this.y);
        if (aimVec.lengthSq() > 0) {
            this.setRotation(aimVec.angle());
        } else if (this.body?.velocity) {
            if (this.body.velocity.lengthSq() > 0) {
                this.setRotation(Math.atan2(this.body.velocity.y, this.body.velocity.x));
            }
        }
    }

    public getStamina() { return this.stamina; }
    public getMaxStamina() { return this.maxStamina; }

    private fireCast(time: number) {
        this.castAmmo--;
        this.castCooldown = time + 500;

        const aimVec = this.inputManager.getAimVector(this.x, this.y);
        let angle = this.rotation;
        if (aimVec.lengthSq() > 0) {
            angle = aimVec.angle();
            this.setRotation(angle);
        }

        const arena = this.scene as any;
        arena.fireBloodstone(this.x, this.y, angle);
    }

    public triggerHitEffects(enemy: Enemy) {
        const arena = this.scene as any;
        if (this.boons.includes('zeus_strike')) {
            // Give it a cooldown so it doesn't spam on multi-hit weapons
            if (this.scene.time.now > (this as any).zeusCooldown || !(this as any).zeusCooldown) {
                (this as any).zeusCooldown = this.scene.time.now + 200;
                if (arena.triggerChainLightning) {
                    arena.triggerChainLightning(enemy, 3, 20); // 3 bounces, 20 dmg
                }
            }
        }
        if (this.boons.includes('ares_doom')) {
            enemy.applyDoom(50);
        }
    }
}
