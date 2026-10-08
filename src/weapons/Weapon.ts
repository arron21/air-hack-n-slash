import Phaser from 'phaser';
import { Player } from '../entities/Player';

export interface Weapon {
    name: string;
    staminaCost: number;
    attackDuration: number;
    baseKnockback: number;
    attack(scene: Phaser.Scene, player: Player, time: number): void;
    update(scene: Phaser.Scene, player: Player, time: number): void;
    clear(scene: Phaser.Scene, player: Player): void;
}
