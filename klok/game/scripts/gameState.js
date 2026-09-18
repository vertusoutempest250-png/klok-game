/**
 * GameState — Godot-style state machine for game-wide states.
 * States: BOOT, MAIN_MENU, CHARACTER_SELECT, PLAYING, PAUSED,
 *         DIALOGUE, GAME_OVER, ENDING
 */

export const GameStates = Object.freeze({
  BOOT:             'BOOT',
  MAIN_MENU:        'MAIN_MENU',
  CHARACTER_SELECT: 'CHARACTER_SELECT',
  PLAYING:          'PLAYING',
  PAUSED:           'PAUSED',
  DIALOGUE:         'DIALOGUE',
  GAME_OVER:        'GAME_OVER',
  ENDING:           'ENDING',
});

export class GameState {
  constructor() {
    this.current = GameStates.BOOT;
    this._listeners = [];
  }

  /** Register a callback: fn(newState, oldState) */
  onChange(fn) {
    this._listeners.push(fn);
  }

  transition(newState) {
    if (newState === this.current) return;
    const old = this.current;
    this.current = newState;
    for (const fn of this._listeners) fn(newState, old);
  }

  is(state)        { return this.current === state; }
  isAny(...states) { return states.includes(this.current); }
}
