import './style.css'
import { Game } from './game/Game.js'

window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.setupUIEventListeners();
});
