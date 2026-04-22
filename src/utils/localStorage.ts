import { GameState } from '../types';

const STORAGE_KEY = 'ipl-auction-game-state';
const SOUND_ENABLED_KEY = 'ipl-auction-sound-enabled';

export const LocalStorageManager = {
  // Save game state
  saveGameState: (gameState: GameState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  },

  // Load game state
  loadGameState: (): GameState | null => {
    try {
      const state = localStorage.getItem(STORAGE_KEY);
      return state ? JSON.parse(state) : null;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  },

  // Clear game state
  clearGameState: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear game state:', error);
    }
  },

  // Sound settings
  setSoundEnabled: (enabled: boolean) => {
    localStorage.setItem(SOUND_ENABLED_KEY, JSON.stringify(enabled));
  },

  isSoundEnabled: (): boolean => {
    try {
      const setting = localStorage.getItem(SOUND_ENABLED_KEY);
      return setting !== null ? JSON.parse(setting) : true; // Default true
    } catch {
      return true;
    }
  }
};
