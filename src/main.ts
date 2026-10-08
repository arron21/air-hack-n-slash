import Phaser from 'phaser';
import './index.css';
import { Boot } from './scenes/Boot';
import { Preloader } from './scenes/Preloader';
import { MainArena } from './scenes/MainArena';
import { UIScene } from './scenes/UIScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { MainMenuScene } from './scenes/MainMenuScene';
import { HubScene } from './scenes/HubScene';

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#222222',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    physics: {
        default: 'arcade',
        arcade: {
            debug: true,
            gravity: { x: 0, y: 0 }
        }
    },
    input: {
        gamepad: true
    },
    scene: [Boot, Preloader, HubScene, MainMenuScene, MainArena, UIScene, UpgradeScene]
};

export default new Phaser.Game(config);
