import Phaser from 'phaser';

export class InputManager {
    private scene: Phaser.Scene;
    
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasd!: any;
    private dodgeKey!: Phaser.Input.Keyboard.Key;
    private blockKey!: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        if (scene.input.keyboard) {
            this.cursors = scene.input.keyboard.createCursorKeys();
            this.wasd = scene.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });
            this.dodgeKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
            this.blockKey = scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
        }
    }

    getMovementVector(): Phaser.Math.Vector2 {
        const vec = new Phaser.Math.Vector2(0, 0);
        
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            if (pad) {
                const x = pad.leftStick ? pad.leftStick.x : 0;
                const y = pad.leftStick ? pad.leftStick.y : 0;
                if (Math.abs(x) > 0.2) vec.x = x;
                if (Math.abs(y) > 0.2) vec.y = y;

                // Also support D-Pad for movement
                if (pad.left) vec.x = -1;
                if (pad.right) vec.x = 1;
                if (pad.up) vec.y = -1;
                if (pad.down) vec.y = 1;
            }
        }

        if (vec.lengthSq() === 0 && this.cursors) {
            if (this.cursors.left.isDown || this.wasd.left.isDown) vec.x = -1;
            else if (this.cursors.right.isDown || this.wasd.right.isDown) vec.x = 1;

            if (this.cursors.up.isDown || this.wasd.up.isDown) vec.y = -1;
            else if (this.cursors.down.isDown || this.wasd.down.isDown) vec.y = 1;
        }

        return vec.normalize();
    }

    getAimVector(playerPositionX: number, playerPositionY: number): Phaser.Math.Vector2 {
        const vec = new Phaser.Math.Vector2(0, 0);

        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            if (pad) {
                const x = pad.rightStick ? pad.rightStick.x : 0;
                const y = pad.rightStick ? pad.rightStick.y : 0;
                if (Math.abs(x) > 0.2) vec.x = x;
                if (Math.abs(y) > 0.2) vec.y = y;
            }
        }

        if (vec.lengthSq() === 0) {
            if (this.hasGamepad()) {
                // Don't fall back to mouse if using gamepad
                return vec;
            }
            const pointer = this.scene.input.activePointer;
            // Aim vector towards mouse relative to player
            const worldX = pointer.worldX;
            const worldY = pointer.worldY;
            vec.x = worldX - playerPositionX;
            vec.y = worldY - playerPositionY;
        }

        return vec.normalize();
    }
    
    isDodgePressed(): boolean {
        let isPadDodge = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadDodge = !!pad.B; // B button (Xbox) or Circle (PS)
        }
        return isPadDodge || Phaser.Input.Keyboard.JustDown(this.dodgeKey);
    }

    isBlockPressed(): boolean {
        let isPadBlock = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadBlock = pad.L2 > 0; // Left Trigger
        }
        return isPadBlock || this.blockKey.isDown;
    }
    
    isAttackPressed(): boolean {
        let isPadAttack = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadAttack = pad.R2 > 0 || pad.X; // Right Trigger or X (Square on PS)
        }
        return isPadAttack || this.scene.input.activePointer.leftButtonDown();
    }

    isSwapWeaponPressed(): boolean {
        let isPadSwap = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadSwap = !!pad.Y; // Y button (Triangle on PS)
        }
        return isPadSwap || Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey('Q'));
    }

    isCastPressed(): boolean {
        let isPadCast = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadCast = !!pad.R1; // Right Bumper
        }
        // Use E key or Right Click
        const isRightClick = this.scene.input.activePointer.rightButtonDown();
        const isE = Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey('E'));
        return isPadCast || isRightClick || isE;
    }

    isInteractPressed(): boolean {
        let isPadInteract = false;
        if (this.scene.input.gamepad?.total) {
            const pad = this.scene.input.gamepad.getPad(0);
            isPadInteract = !!pad.A; // A button (Cross on PS)
        }
        return isPadInteract || Phaser.Input.Keyboard.JustDown(this.scene.input.keyboard!.addKey('E'));
    }

    hasGamepad(): boolean {
        return !!this.scene.input.gamepad?.total;
    }
}
