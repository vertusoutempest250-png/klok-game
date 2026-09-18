/**
 * FAMOUSDA — THE FINAL JOURNEY
 * Main Game Loop (Godot-style architecture in vanilla JS/Canvas)
 *
 * Flow: BOOT → MAIN_MENU → CHARACTER_SELECT → PLAYING
 *            ⇄ PAUSED / DIALOGUE / GAME_OVER → ENDING
 *
 * v3 additions:
 *  - Responsive viewport: auto-zoom on small/medium screens
 *  - Camera zoom factor (ZOOM) applied per device size category
 *  - Touch controls: JS detection (not CSS-only), shown only on real touch devices
 *  - Touch controls: larger thumb-friendly buttons, safe-area aware
 */

import { GameState, GameStates }          from './scripts/gameState.js';
import { Camera }                          from './scripts/camera.js';
import { Player, PlayerStates, MAX_LIVES, drawCharPreview } from './scripts/player.js';
import { resolvePlatforms }                from './scripts/platform.js';
import { Level, WORLD_W, WORLD_H, GROUND_Y } from './scripts/level.js';
import { DialogueUI }                      from './scripts/dialogue.js';

// ─────────────────────────────────────────────────────────────────────────────
//  Canvas / viewport — responsive with per-device zoom
// ─────────────────────────────────────────────────────────────────────────────
const DESIGN_W = 800;
const DESIGN_H = 450;

const canvas = document.getElementById('gameCanvas');
const ctx    = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;

let scale   = 1;   // CSS pixel → canvas pixel ratio (letterbox)
let offsetX = 0;
let offsetY = 0;
let viewZoom = 1;  // camera zoom: >1 = zoomed in (smaller phones)

/**
 * Decide zoom factor based on physical viewport size.
 *   ≥ 1024px wide  → zoom 1.0  (laptop/desktop — full view)
 *   600–1023px     → zoom 1.3  (small tablet / large phone landscape)
 *   < 600px        → zoom 1.6  (phone portrait — character stays readable)
 */
function _calcZoom(winW, winH) {
  const shorter = Math.min(winW, winH);
  if (shorter < 400) return 1.8;
  if (shorter < 600) return 1.5;
  if (shorter < 900) return 1.2;
  return 1.0;
}

function resizeCanvas() {
  const winW = window.innerWidth;
  const winH = window.innerHeight;
  scale   = Math.min(winW / DESIGN_W, winH / DESIGN_H);
  offsetX = (winW - DESIGN_W * scale) / 2;
  offsetY = (winH - DESIGN_H * scale) / 2;
  canvas.width  = winW;
  canvas.height = winH;

  viewZoom = _calcZoom(winW, winH);

  // Tell camera the logical viewport size (affected by zoom)
  camera.resize(DESIGN_W / viewZoom, DESIGN_H / viewZoom);
  dialogueUI.resize(DESIGN_W, DESIGN_H);

  // Show/hide touch controls based on touch capability
  _updateTouchVisibility();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Core systems
// ─────────────────────────────────────────────────────────────────────────────
const state      = new GameState();
const camera     = new Camera(DESIGN_W, DESIGN_H, WORLD_W, WORLD_H);
const dialogueUI = new DialogueUI(DESIGN_W, DESIGN_H);

let level, player;
let selectedCharType = 'male';    // persists across respawns
let checkpointX = 80;
let checkpointY = GROUND_Y - 44;
let memoriesTotal     = 0;
let memoriesCollected = 0;
let lastNearNPC = null;

// HUD pop-notification state
const hud = {
  memoryPopTimer:   0,
  memoryPopText:    '',
  sectionTimer:     0,
  sectionText:      '',
  checkpointTimer:  0,
  _lastSection:     '',
  // Heart damage flash
  heartFlashTimer:  0,
};

// ─────────────────────────────────────────────────────────────────────────────
//  Input system
// ─────────────────────────────────────────────────────────────────────────────
const keys = {};
const inputState = {
  left: false, right: false, jump: false,
  run: false, interact: false,
  jumpPressed: false, interactPressed: false, pausePressed: false,
};

window.addEventListener('keydown', e => {
  if (!keys[e.code]) {
    if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp')
      inputState.jumpPressed = true;
    if (e.code === 'KeyE')
      inputState.interactPressed = true;
    if (e.code === 'Escape')
      inputState.pausePressed = true;
  }
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pollInput() {
  inputState.left     = !!(keys['ArrowLeft']  || keys['KeyA']);
  inputState.right    = !!(keys['ArrowRight'] || keys['KeyD']);
  inputState.jump     = !!(keys['Space'] || keys['KeyW'] || keys['ArrowUp']);
  inputState.run      = !!(keys['ShiftLeft'] || keys['ShiftRight']);
  inputState.interact = !!(keys['KeyE']);
}

function clearOneShots() {
  inputState.jumpPressed     = false;
  inputState.interactPressed = false;
  inputState.pausePressed    = false;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Touch controls — JS detection + visibility
// ─────────────────────────────────────────────────────────────────────────────
const touch = { left: false, right: false, jump: false, interact: false };

/** Show touch overlay only on real touch-capable devices. */
function _updateTouchVisibility() {
  const tc = document.getElementById('touchControls');
  if (!tc) return;
  // Detect genuine touch capability (works better than CSS media query alone)
  const hasTouch = ('ontouchstart' in window) ||
                   (navigator.maxTouchPoints > 0) ||
                   (navigator.msMaxTouchPoints > 0);
  tc.style.display = hasTouch ? 'flex' : 'none';
}

function setupTouchControls() {
  _updateTouchVisibility();

  const press = {
    'btn-left':     () => { touch.left     = true; },
    'btn-right':    () => { touch.right    = true; },
    'btn-jump':     () => { touch.jump     = true; inputState.jumpPressed = true; },
    'btn-interact': () => { touch.interact = true; inputState.interactPressed = true; },
  };
  const release = {
    'btn-left':     () => { touch.left     = false; },
    'btn-right':    () => { touch.right    = false; },
    'btn-jump':     () => { touch.jump     = false; },
    'btn-interact': () => { touch.interact = false; },
  };

  for (const [id, fn] of Object.entries(press)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('touchstart', e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mousedown',  e => { e.preventDefault(); fn(); });
  }
  for (const [id, fn] of Object.entries(release)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener('touchend',   e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('touchcancel',e => { e.preventDefault(); fn(); }, { passive: false });
    el.addEventListener('mouseup',    e => { e.preventDefault(); fn(); });
  }

  // Block page scroll while game is active
  document.addEventListener('touchmove', e => {
    if (state.isAny(GameStates.PLAYING, GameStates.DIALOGUE)) e.preventDefault();
  }, { passive: false });
}

function mergeTouchInput() {
  if (touch.left)     inputState.left     = true;
  if (touch.right)    inputState.right    = true;
  if (touch.jump)     inputState.jump     = true;
  if (touch.interact) inputState.interact = true;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Game init / reset
// ─────────────────────────────────────────────────────────────────────────────
function initGame(charType) {
  selectedCharType  = charType || selectedCharType;
  level             = new Level();
  memoriesTotal     = level.memories.length;
  memoriesCollected = 0;
  checkpointX       = 80;
  checkpointY       = GROUND_Y - 44;
  lastNearNPC       = null;
  hud._lastSection  = '';

  player = new Player(80, GROUND_Y - 44, selectedCharType);
  camera.snapTo(player.x, player.y);
  level.checkpoints[0]?.activate();
}

function respawnPlayer() {
  // Respawn restores lives (handled inside player.respawn)
  player.respawn(checkpointX, checkpointY);
  camera.snapTo(player.x, player.y);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Per-state data
// ─────────────────────────────────────────────────────────────────────────────

// ── Character select ─────────────────────────────────────────────────────────
const charSelectState = {
  hovered:    'male',    // 'male' | 'female'
  animTimer:  0,
  animFrame:  0,
  // card rects in design-space (computed in draw, used for hit-test)
  cards: {
    male:   { x: 140, y: 120, w: 180, h: 220 },
    female: { x: 480, y: 120, w: 180, h: 220 },
  },
};

// ── Main menu ────────────────────────────────────────────────────────────────
const menuState = {
  selectedItem: 0,
  items: ['MULAI PERJALANAN', 'PENGATURAN'],
};

// ── Pause menu ───────────────────────────────────────────────────────────────
const pauseState = {
  selectedItem: 0,
  items: ['LANJUTKAN', 'RESTART CHECKPOINT', 'MENU UTAMA'],
};

// ── Ending ───────────────────────────────────────────────────────────────────
const endingState = {
  phase:      0,
  timer:      0,
  textAlpha:  0,
  done:       false,
  hoveredBtn: -1,
};

// ── Game Over ─────────────────────────────────────────────────────────────────
const gameOverState = {
  timer:      0,       // countdown before buttons appear
  hoveredBtn: -1,
  // buttons: 0 = Coba Lagi, 1 = Menu Utama
};

// ─────────────────────────────────────────────────────────────────────────────
//  State-change callbacks
// ─────────────────────────────────────────────────────────────────────────────
state.onChange((newState, oldState) => {

  // MAIN_MENU → CHARACTER_SELECT: just open the select screen
  if (newState === GameStates.CHARACTER_SELECT) {
    charSelectState.hovered   = 'male';
    charSelectState.animTimer = 0;
    charSelectState.animFrame = 0;
  }

  // CHARACTER_SELECT → PLAYING  OR  GAME_OVER "Coba Lagi" → PLAYING
  if (newState === GameStates.PLAYING) {
    if (oldState === GameStates.CHARACTER_SELECT) {
      initGame(charSelectState.hovered);
      showSectionName(level.getCurrentSectionName(player.x));
    }
    // respawn handled explicitly before transition for other paths
  }

  if (newState === GameStates.PAUSED) {
    pauseState.selectedItem = 0;
  }

  if (newState === GameStates.ENDING) {
    endingState.phase     = 0;
    endingState.timer     = 0;
    endingState.textAlpha = 0;
    endingState.done      = false;
    if (player) player.vx = 0;
  }

  if (newState === GameStates.GAME_OVER) {
    gameOverState.timer     = 1.0;   // brief delay before buttons appear
    gameOverState.hoveredBtn = -1;
    camera.shake(8, 0.5);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  HUD helpers
// ─────────────────────────────────────────────────────────────────────────────
function showSectionName(name) {
  hud.sectionText  = name;
  hud.sectionTimer = 3.0;
}

function showMemoryPop(type) {
  const labels = {
    PHOTO: '📷 Foto!', BOOK: '📚 Buku!', BADGE: '🏅 Lencana!',
    NOTE: '📝 Catatan!', RIBBON: '🎀 Pita!',
  };
  hud.memoryPopText  = labels[type] || '+1 Kenangan!';
  hud.memoryPopTimer = 1.8;
}

// ─────────────────────────────────────────────────────────────────────────────
//  AABB overlap helper
// ─────────────────────────────────────────────────────────────────────────────
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x &&
         a.y < b.y + b.h && a.y + a.h > b.y;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Update functions
// ─────────────────────────────────────────────────────────────────────────────

function updateCharSelect(dt) {
  charSelectState.animTimer += dt;
  if (charSelectState.animTimer > 0.18) {
    charSelectState.animTimer = 0;
    charSelectState.animFrame = (charSelectState.animFrame + 1) % 4;
  }
}

function updateMainMenu(dt) { /* static — nothing to tick */ }

function updatePlaying(dt) {
  // ── Section banner ───────────────────────────────────────────────────────
  const section = level.getCurrentSectionName(player.x + 14);
  if (section !== hud._lastSection) {
    hud._lastSection = section;
    showSectionName(section);
  }

  // ── Player + physics ─────────────────────────────────────────────────────
  player.update(inputState, dt);
  resolvePlatforms(player, level.platforms);

  // ── Kill plane (fell off world bottom) ───────────────────────────────────
  if (player.y > WORLD_H + 60 && player.alive) {
    player.die();   // hard die → lives = 0
  }

  // ── Trap collision ────────────────────────────────────────────────────────
  if (player.alive) {
    const pr = player.rect;
    for (const trap of level.traps) {
      if (!rectsOverlap(pr, trap.rect)) continue;
      // Determine knockback direction: push away from trap centre
      const dir = player.centerX < trap.x + trap.w / 2 ? 'left' : 'right';
      const didHit = player.hit(dir);
      if (didHit) {
        hud.heartFlashTimer = 0.6;
        camera.shake(5, 0.3);
      }
      break; // one trap hit per frame is enough
    }
  }

  // ── Check death (lives exhausted) ────────────────────────────────────────
  if (!player.alive) {
    state.transition(GameStates.GAME_OVER);
    return;
  }

  // ── World left boundary ───────────────────────────────────────────────────
  player.x = Math.max(0, player.x);

  // ── Final goal ────────────────────────────────────────────────────────────
  if (player.x >= 8800 && !endingState.done) {
    state.transition(GameStates.ENDING);
    return;
  }

  // ── Checkpoints ───────────────────────────────────────────────────────────
  for (const cp of level.checkpoints) {
    if (rectsOverlap(player.rect, cp.rect)) {
      if (cp.activate()) {
        checkpointX = cp.x;
        checkpointY = cp.y;
        hud.checkpointTimer = 2.0;
      }
    }
  }

  // ── Memory collection ─────────────────────────────────────────────────────
  player.canInteract = false;
  for (const mem of level.memories) {
    if (mem.collected) continue;
    if (rectsOverlap(player.rect, mem.rect)) {
      mem.collect();
      memoriesCollected++;
      showMemoryPop(mem.type);
      camera.shake(3, 0.15);
    }
  }

  // ── NPC interaction ───────────────────────────────────────────────────────
  lastNearNPC = null;
  for (const npc of level.npcs) {
    if (npc.isNear(player.x, player.y)) {
      lastNearNPC      = npc;
      player.canInteract = true;
      break;
    }
  }
  if (inputState.interactPressed && lastNearNPC && !dialogueUI.isVisible) {
    const line = lastNearNPC.getNextDialogue();
    state.transition(GameStates.DIALOGUE);
    dialogueUI.show([line], () => state.transition(GameStates.PLAYING));
  }

  // ── Camera ────────────────────────────────────────────────────────────────
  camera.update(player.x, player.y, player.facing, dt);

  // ── Level tick ────────────────────────────────────────────────────────────
  level.update(dt, player.x, player.y);

  // ── HUD timers ────────────────────────────────────────────────────────────
  if (hud.memoryPopTimer  > 0) hud.memoryPopTimer  -= dt;
  if (hud.sectionTimer    > 0) hud.sectionTimer    -= dt;
  if (hud.checkpointTimer > 0) hud.checkpointTimer -= dt;
  if (hud.heartFlashTimer > 0) hud.heartFlashTimer -= dt;

  // ── Pause ─────────────────────────────────────────────────────────────────
  if (inputState.pausePressed) state.transition(GameStates.PAUSED);
}

function updateDialogue(dt) {
  dialogueUI.update(dt);
  level.update(dt, player?.x ?? 0, player?.y ?? 0);
  camera.update(player.x, player.y, player.facing, dt);
  if (inputState.interactPressed || inputState.jumpPressed) dialogueUI.advance();
}

function updatePaused(dt) {
  if (inputState.pausePressed) { state.transition(GameStates.PLAYING); return; }
  if (inputState.jumpPressed)  _executePauseItem(pauseState.selectedItem);
}

function _executePauseItem(idx) {
  if (idx === 0) {
    state.transition(GameStates.PLAYING);
  } else if (idx === 1) {
    respawnPlayer();
    state.transition(GameStates.PLAYING);
  } else {
    state.transition(GameStates.MAIN_MENU);
  }
}

function updateGameOver(dt) {
  if (hud.heartFlashTimer > 0) hud.heartFlashTimer -= dt;
  if (gameOverState.timer > 0) gameOverState.timer -= dt;
  level.update(dt, player?.x ?? 0, player?.y ?? 0);
}

function updateEnding(dt) {
  endingState.timer += dt;
  switch (endingState.phase) {
    case 0: {
      const arrived = camera.panTo(8700, GROUND_Y - 120, 60);
      if (arrived || endingState.timer > 3) { endingState.phase = 1; endingState.timer = 0; }
      break;
    }
    case 1: {
      endingState.textAlpha = Math.min(1, endingState.timer * 0.8);
      if (endingState.timer > 3.5) { endingState.phase = 2; endingState.timer = 0; }
      break;
    }
    case 2: {
      endingState.textAlpha = Math.min(1, endingState.timer * 0.8);
      if (endingState.timer > 3.5) { endingState.phase = 3; endingState.timer = 0; endingState.done = true; }
      break;
    }
    case 3: {
      endingState.textAlpha = Math.min(1, endingState.timer * 0.6);
      break;
    }
  }
  level.update(dt, player?.x ?? 8700, GROUND_Y);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Render functions
// ─────────────────────────────────────────────────────────────────────────────
function _beginDraw() {
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);
  // Apply view zoom: scale up from canvas centre so the world feels closer
  if (viewZoom !== 1) {
    ctx.translate(DESIGN_W / 2, DESIGN_H / 2);
    ctx.scale(viewZoom, viewZoom);
    ctx.translate(-DESIGN_W / 2, -DESIGN_H / 2);
  }
}
function _endDraw() { ctx.restore(); }

function renderPlaying() {
  _beginDraw();
  // Pass zoomed viewport dimensions so parallax/background fills correctly
  const vw = DESIGN_W / viewZoom;
  const vh = DESIGN_H / viewZoom;
  level.drawBackground(ctx, camera.x, camera.y, vw, vh);
  ctx.save(); level.drawWorld(ctx, camera.x, camera.y); ctx.restore();
  level.drawEntities(ctx, camera.x, camera.y);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  player.draw(ctx);
  ctx.restore();
  // HUD drawn in design-space (undo zoom so HUD is always same size)
  ctx.save();
  if (viewZoom !== 1) {
    ctx.translate(DESIGN_W / 2, DESIGN_H / 2);
    ctx.scale(1 / viewZoom, 1 / viewZoom);
    ctx.translate(-DESIGN_W / 2, -DESIGN_H / 2);
  }
  _drawHUD(ctx);
  dialogueUI.draw(ctx);
  ctx.restore();
  _endDraw();
}

function renderPaused() {
  renderPlaying();
  _beginDraw(); _drawPauseMenu(ctx); _endDraw();
}

function renderDialogue() {
  renderPlaying();
  _beginDraw(); dialogueUI.draw(ctx); _endDraw();
}

function renderGameOver() {
  renderPlaying();
  _beginDraw(); _drawGameOverScreen(ctx); _endDraw();
}

function renderMainMenu() {
  _beginDraw(); _drawMainMenu(ctx); _endDraw();
}

function renderCharSelect() {
  _beginDraw(); _drawCharSelect(ctx); _endDraw();
}

function renderEnding() {
  _beginDraw();
  const vw = DESIGN_W / viewZoom;
  const vh = DESIGN_H / viewZoom;
  level.drawBackground(ctx, camera.x, camera.y, vw, vh);
  ctx.save(); level.drawWorld(ctx, camera.x, camera.y); ctx.restore();
  level.drawEntities(ctx, camera.x, camera.y);
  if (player) {
    ctx.save(); ctx.translate(-camera.x, -camera.y); player.draw(ctx); ctx.restore();
  }
  // Overlay in design-space
  ctx.save();
  if (viewZoom !== 1) {
    ctx.translate(DESIGN_W / 2, DESIGN_H / 2);
    ctx.scale(1 / viewZoom, 1 / viewZoom);
    ctx.translate(-DESIGN_W / 2, -DESIGN_H / 2);
  }
  _drawEndingOverlay(ctx);
  ctx.restore();
  _endDraw();
}

// ─────────────────────────────────────────────────────────────────────────────
//  HUD drawing
// ─────────────────────────────────────────────────────────────────────────────
function _drawHUD(ctx) {
  // ── Hearts row ───────────────────────────────────────────────────────────
  const lives      = player ? player.lives : 0;
  const heartFlash = hud.heartFlashTimer > 0;
  const heartY     = 10;
  const heartSize  = 18;
  const heartGap   = 4;
  const rowW       = MAX_LIVES * (heartSize + heartGap) - heartGap;
  const heartX     = DESIGN_W - rowW - 12;

  // Background pill
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(heartX - 6, heartY - 4, rowW + 12, heartSize + 8);
  ctx.strokeStyle = '#CC3333';
  ctx.lineWidth = 1;
  ctx.strokeRect(heartX - 6, heartY - 4, rowW + 12, heartSize + 8);

  for (let i = 0; i < MAX_LIVES; i++) {
    const hx = heartX + i * (heartSize + heartGap);
    const hy = heartY;
    const full = i < lives;

    // Flash red outline when recently hit
    if (heartFlash && full) {
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
    }
    _drawHeart(ctx, hx, hy, heartSize, full);
    if (heartFlash && full) ctx.restore();
  }

  // ── Memory counter (below hearts) ────────────────────────────────────────
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(8, 8, 164, 26);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1;
  ctx.strokeRect(8, 8, 164, 26);
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 12px "Courier New", monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`KENANGAN: ${memoriesCollected} / ${memoriesTotal}`, 16, 25);

  // ── Section name pop ─────────────────────────────────────────────────────
  if (hud.sectionTimer > 0) {
    const alpha = Math.min(1, hud.sectionTimer * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(DESIGN_W / 2 - 110, 14, 220, 24);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('— ' + hud.sectionText + ' —', DESIGN_W / 2, 31);
    ctx.restore();
  }

  // ── Memory pop ───────────────────────────────────────────────────────────
  if (hud.memoryPopTimer > 0) {
    const t     = hud.memoryPopTimer / 1.8;
    const alpha = Math.min(1, t * 3);
    const rise  = (1 - t) * 30;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(hud.memoryPopText, DESIGN_W / 2, 68 - rise);
    ctx.restore();
  }

  // ── Controls hint ────────────────────────────────────────────────────────
  ctx.save();
  ctx.globalAlpha = 0.45;
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('A/D Jalan  SPACE Lompat  E Bicara  ESC Jeda', 8, DESIGN_H - 6);
  ctx.restore();

  // ── Checkpoint toast ─────────────────────────────────────────────────────
  if (hud.checkpointTimer > 0) {
    const alpha = Math.min(1, hud.checkpointTimer * 2);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(DESIGN_W / 2 - 92, DESIGN_H - 48, 184, 22);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('✓ Checkpoint Tersimpan!', DESIGN_W / 2, DESIGN_H - 32);
    ctx.restore();
  }
}

/** Draw a single pixel-art heart icon at (x, y) with given size. */
function _drawHeart(ctx, x, y, size, filled) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);

  // Shadow
  ctx.fillStyle = '#220000';
  ctx.fillRect(1, 1, s, s);

  if (filled) {
    // Filled heart — pixel grid approximation
    ctx.fillStyle = '#EE2244';
    // Top two bumps
    ctx.fillRect(1, 2, s * 0.4, s * 0.45);
    ctx.fillRect(s * 0.55, 2, s * 0.4, s * 0.45);
    // Middle full row
    ctx.fillRect(0, s * 0.35, s + 1, s * 0.35);
    // Bottom triangle
    ctx.beginPath();
    ctx.moveTo(0, s * 0.65);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(s + 1, s * 0.65);
    ctx.closePath();
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#FF6688';
    ctx.fillRect(3, 3, 3, 3);
    ctx.fillRect(s * 0.55 + 2, 3, 2, 2);
  } else {
    // Empty heart outline only
    ctx.fillStyle = '#441122';
    ctx.fillRect(1, 2, s * 0.4, s * 0.45);
    ctx.fillRect(s * 0.55, 2, s * 0.4, s * 0.45);
    ctx.fillRect(0, s * 0.35, s + 1, s * 0.35);
    ctx.beginPath();
    ctx.moveTo(0, s * 0.65);
    ctx.lineTo(s / 2, s);
    ctx.lineTo(s + 1, s * 0.65);
    ctx.closePath();
    ctx.fill();
    // Dark inner cutout to show it's empty
    ctx.fillStyle = '#1A0A10';
    ctx.fillRect(3, 4, s * 0.3, s * 0.3);
    ctx.fillRect(s * 0.6, 4, s * 0.3, s * 0.3);
    ctx.fillRect(2, s * 0.4, s - 3, s * 0.25);
  }
  ctx.restore();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Character Select screen
// ─────────────────────────────────────────────────────────────────────────────
function _drawCharSelect(ctx) {
  // Background — same starry night as main menu
  const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
  grad.addColorStop(0, '#0A0A2E');
  grad.addColorStop(1, '#1A2A5E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

  // Stars
  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 60; i++) {
    ctx.fillRect((i * 137 + 99) % DESIGN_W, (i * 97 + 55) % (DESIGN_H * 0.55), i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }

  // Title
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 22px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 14;
  ctx.fillText('PILIH KARAKTER', DESIGN_W / 2, 68);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#A0B8D0';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('Siapa yang akan menjalani perjalanan ini?', DESIGN_W / 2, 90);

  // Divider
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(DESIGN_W / 2 - 100, 98, 200, 1);

  // Character cards
  const cards = charSelectState.cards;
  const types = ['male', 'female'];
  const labels = { male: 'COWOK', female: 'CEWEK' };
  const subtitles = { male: 'Kemeja biru\nCelana gelap', female: 'Blus putih\nRok biru sekolah' };

  for (const type of types) {
    const c      = cards[type];
    const isHov  = charSelectState.hovered === type;
    const isAnim = isHov;

    // Card shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(c.x + 5, c.y + 5, c.w, c.h);

    // Card background
    ctx.fillStyle = isHov ? '#1E2E5E' : '#12183A';
    ctx.fillRect(c.x, c.y, c.w, c.h);

    // Card border — gold when selected
    ctx.strokeStyle = isHov ? '#FFD700' : '#3A4A7A';
    ctx.lineWidth = isHov ? 2.5 : 1.5;
    ctx.strokeRect(c.x, c.y, c.w, c.h);

    // Inner glow when hovered
    if (isHov) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(c.x + 2, c.y + 2, c.w - 4, c.h - 4);
      ctx.restore();
    }

    // Character preview (pixel sprite, centred in top portion of card)
    const previewX = c.x + c.w / 2;
    const previewY = c.y + 108;
    drawCharPreview(
      ctx,
      previewX,
      previewY,
      type,
      2.8,                                       // scale
      isAnim ? charSelectState.animFrame : 0,    // animFrame — wave only on hovered
    );

    // Name label
    ctx.fillStyle = isHov ? '#FFD700' : '#A0B8D0';
    ctx.font = `bold ${isHov ? 15 : 13}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(labels[type], c.x + c.w / 2, c.y + c.h - 38);

    // Subtitle lines
    ctx.fillStyle = isHov ? '#D0E0F0' : '#607090';
    ctx.font = '9px "Courier New", monospace';
    const lines = subtitles[type].split('\n');
    lines.forEach((ln, idx) => {
      ctx.fillText(ln, c.x + c.w / 2, c.y + c.h - 22 + idx * 12);
    });

    // Selected checkmark
    if (isHov) {
      ctx.fillStyle = '#FFD700';
      ctx.font = '16px monospace';
      ctx.fillText('▼', c.x + c.w / 2, c.y + 22);
    }
  }

  // Confirm button
  const btnW = 210, btnH = 36;
  const btnX = (DESIGN_W - btnW) / 2;
  const btnY = DESIGN_H - 62;

  ctx.fillStyle = '#2A4A2A';
  ctx.fillRect(btnX + 3, btnY + 3, btnW, btnH);
  ctx.fillStyle = '#1A4A1A';
  ctx.fillRect(btnX, btnY, btnW, btnH);
  ctx.strokeStyle = '#66DD66';
  ctx.lineWidth = 2;
  ctx.strokeRect(btnX, btnY, btnW, btnH);
  ctx.fillStyle = '#88FF88';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('▶  MULAI PERJALANAN  ◀', DESIGN_W / 2, btnY + 24);

  // Keyboard hint
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = '9px monospace';
  ctx.fillText('← → pilih  |  ENTER / klik tombol hijau untuk mulai', DESIGN_W / 2, DESIGN_H - 10);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Main Menu
// ─────────────────────────────────────────────────────────────────────────────
function _drawMainMenu(ctx) {
  const grad = ctx.createLinearGradient(0, 0, 0, DESIGN_H);
  grad.addColorStop(0, '#0A0A2E');
  grad.addColorStop(0.5, '#1A2A5E');
  grad.addColorStop(1, '#2A3A6E');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

  ctx.fillStyle = '#FFFFFF';
  for (let i = 0; i < 80; i++) {
    const sx = (i * 137 + 42) % DESIGN_W;
    const sy = (i * 97  + 42) % (DESIGN_H * 0.6);
    ctx.fillRect(sx, sy, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1);
  }

  ctx.fillStyle = '#1A3A1A';
  ctx.beginPath();
  ctx.moveTo(0, DESIGN_H * 0.75);
  for (let x = 0; x < DESIGN_W; x += 40) {
    ctx.lineTo(x + 20, DESIGN_H * 0.75 - Math.sin(x * 0.06) * 20);
    ctx.lineTo(x + 40, DESIGN_H * 0.75);
  }
  ctx.lineTo(DESIGN_W, DESIGN_H); ctx.lineTo(0, DESIGN_H);
  ctx.closePath(); ctx.fill();

  ctx.fillStyle = '#0A2A0A';
  for (let tx = 30; tx < DESIGN_W; tx += 80) {
    ctx.fillRect(tx + 10, DESIGN_H * 0.55, 4, DESIGN_H * 0.22);
    ctx.beginPath();
    ctx.moveTo(tx + 12, DESIGN_H * 0.52);
    ctx.lineTo(tx - 8,  DESIGN_H * 0.66);
    ctx.lineTo(tx + 32, DESIGN_H * 0.66);
    ctx.closePath(); ctx.fill();
  }

  ctx.save();
  ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 30;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 64px "Courier New", monospace';
  ctx.textAlign = 'center';
  const titleY = DESIGN_H * 0.28;
  ctx.fillText('FAMOUSDA', DESIGN_W / 2, titleY);
  ctx.restore();

  ctx.fillStyle = '#E0D0A0';
  ctx.font = 'bold 14px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('— THE FINAL JOURNEY —', DESIGN_W / 2, titleY + 32);
  ctx.fillStyle = '#A0C0FF';
  ctx.font = '11px "Courier New", monospace';
  ctx.fillText('XII IPS 2', DESIGN_W / 2, titleY + 52);
  ctx.fillStyle = '#FFD700';
  ctx.fillRect(DESIGN_W / 2 - 80, titleY + 62, 160, 2);

  const items = menuState.items;
  for (let i = 0; i < items.length; i++) {
    const iy    = DESIGN_H * 0.60 + i * 44;
    const isHov = menuState.selectedItem === i;
    if (isHov) {
      ctx.fillStyle = 'rgba(255,215,0,0.18)';
      ctx.fillRect(DESIGN_W / 2 - 120, iy - 22, 240, 36);
      ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
      ctx.strokeRect(DESIGN_W / 2 - 120, iy - 22, 240, 36);
      ctx.fillStyle = '#FFD700';
    } else {
      ctx.fillStyle = '#A0B0C0';
    }
    ctx.font = `bold ${isHov ? 16 : 14}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(isHov ? '▶  ' + items[i] + '  ◀' : items[i], DESIGN_W / 2, iy + 2);
  }

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Klik atau tekan ENTER untuk memilih', DESIGN_W / 2, DESIGN_H - 12);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pause Menu
// ─────────────────────────────────────────────────────────────────────────────
function _drawPauseMenu(ctx) {
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

  const boxW = 280, boxH = 200;
  const boxX = (DESIGN_W - boxW) / 2;
  const boxY = (DESIGN_H - boxH) / 2;

  ctx.fillStyle = '#1A1A2E';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 2;
  ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);

  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 20px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('⏸  JEDA', DESIGN_W / 2, boxY + 38);
  ctx.fillStyle = '#888888';
  ctx.fillRect(boxX + 20, boxY + 50, boxW - 40, 1);

  const items = pauseState.items;
  for (let i = 0; i < items.length; i++) {
    const iy    = boxY + 80 + i * 38;
    const isHov = pauseState.selectedItem === i;
    if (isHov) {
      ctx.fillStyle = 'rgba(255,215,0,0.22)';
      ctx.fillRect(boxX + 12, iy - 16, boxW - 24, 28);
      ctx.fillStyle = '#FFD700';
    } else {
      ctx.fillStyle = '#B0C0D0';
    }
    ctx.font = `bold ${isHov ? 13 : 12}px "Courier New", monospace`;
    ctx.fillText(isHov ? '▶ ' + items[i] : items[i], DESIGN_W / 2, iy + 4);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Game Over screen
// ─────────────────────────────────────────────────────────────────────────────
function _drawGameOverScreen(ctx) {
  // Darkening overlay
  ctx.fillStyle = 'rgba(20,0,0,0.78)';
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);

  // "GAME OVER" title
  ctx.save();
  ctx.fillStyle = '#CC2222';
  ctx.shadowColor = '#FF0000'; ctx.shadowBlur = 24;
  ctx.font = 'bold 42px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', DESIGN_W / 2, DESIGN_H / 2 - 52);
  ctx.shadowBlur = 0;
  ctx.restore();

  // Empty hearts row
  const hSize = 22, gap = 6;
  const rowW  = MAX_LIVES * (hSize + gap) - gap;
  const rowX  = (DESIGN_W - rowW) / 2;
  const rowY  = DESIGN_H / 2 - 22;
  for (let i = 0; i < MAX_LIVES; i++) {
    _drawHeart(ctx, rowX + i * (hSize + gap), rowY, hSize, false);
  }

  // Sub-text
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '12px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Nyawa habis! Jangan menyerah ya!', DESIGN_W / 2, DESIGN_H / 2 + 18);

  // Buttons only appear after the brief delay
  if (gameOverState.timer > 0) return;

  const btnW = 160, btnH = 34;
  const gap2 = 20;
  const totalW = btnW * 2 + gap2;
  const bY = DESIGN_H / 2 + 44;

  const buttons = ['COBA LAGI', 'MENU UTAMA'];
  for (let i = 0; i < buttons.length; i++) {
    const bx    = (DESIGN_W - totalW) / 2 + i * (btnW + gap2);
    const isHov = gameOverState.hoveredBtn === i;

    // Shadow
    ctx.fillStyle = '#000000';
    ctx.fillRect(bx + 3, bY + 3, btnW, btnH);

    ctx.fillStyle = isHov
      ? (i === 0 ? '#CC3333' : '#3344AA')
      : (i === 0 ? '#881111' : '#22337A');
    ctx.fillRect(bx, bY, btnW, btnH);
    ctx.strokeStyle = isHov ? '#FFFFFF' : '#888888';
    ctx.lineWidth = isHov ? 2 : 1;
    ctx.strokeRect(bx, bY, btnW, btnH);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${isHov ? 14 : 12}px "Courier New", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(buttons[i], bx + btnW / 2, bY + 22);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ending overlay
// ─────────────────────────────────────────────────────────────────────────────
function _drawEndingOverlay(ctx) {
  const { phase, textAlpha: alpha } = endingState;
  if (phase === 0) return;

  ctx.save();
  ctx.globalAlpha = Math.min(0.7, alpha * 0.8);
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center';

  if (phase === 1) {
    ctx.fillStyle = '#F0E8D0';
    ctx.font = 'italic 20px "Courier New", monospace';
    ctx.fillText('"Perjalanan ini berakhir di sini..."', DESIGN_W / 2, DESIGN_H / 2);
  }
  if (phase >= 2) {
    ctx.fillStyle = '#F0E8D0';
    ctx.font = 'italic 20px "Courier New", monospace';
    ctx.fillText('"Tapi kenangan akan selamanya abadi."', DESIGN_W / 2, DESIGN_H / 2 - 18);
  }
  if (phase >= 3) {
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700'; ctx.shadowBlur = 20;
    ctx.font = 'bold 60px "Courier New", monospace';
    ctx.fillText('FAMOUSDA', DESIGN_W / 2, DESIGN_H / 2 + 30);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#E0D0A0';
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.fillText('XII IPS 2', DESIGN_W / 2, DESIGN_H / 2 + 60);
    ctx.fillStyle = '#A0B0C0';
    ctx.font = '11px "Courier New", monospace';
    ctx.fillText('— Terima kasih sudah bermain —', DESIGN_W / 2, DESIGN_H / 2 + 86);
    _drawEndingButtons(ctx);
  }
  ctx.restore();
}

function _drawEndingButtons(ctx) {
  const buttons = ['MAIN LAGI', 'MENU UTAMA'];
  const bW = 140, bH = 32;
  const startX = DESIGN_W / 2 - bW - 12;
  const bY     = DESIGN_H * 0.82;
  ctx.globalAlpha = 1;
  for (let i = 0; i < buttons.length; i++) {
    const bx    = startX + i * (bW + 24);
    const isHov = endingState.hoveredBtn === i;
    ctx.fillStyle = isHov ? '#FFD700' : '#2A3A6A';
    ctx.fillRect(bx, bY, bW, bH);
    ctx.strokeStyle = '#FFD700'; ctx.lineWidth = 1;
    ctx.strokeRect(bx, bY, bW, bH);
    ctx.fillStyle = isHov ? '#1A1A2E' : '#FFD700';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(buttons[i], bx + bW / 2, bY + 21);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Mouse / click / hover handling
// ─────────────────────────────────────────────────────────────────────────────
canvas.addEventListener('mousemove', e => {
  const wx = (e.clientX - offsetX) / scale;
  const wy = (e.clientY - offsetY) / scale;
  // HUD and menus are drawn in design-space (zoom undone), so no zoom adjustment needed for UI coords

  if (state.is(GameStates.CHARACTER_SELECT)) {
    _hoverCharSelect(wx, wy);
    return;
  }
  if (state.is(GameStates.MAIN_MENU)) {
    menuState.items.forEach((_, i) => {
      const iy = DESIGN_H * 0.60 + i * 44;
      if (wx >= DESIGN_W / 2 - 120 && wx <= DESIGN_W / 2 + 120 && wy >= iy - 22 && wy <= iy + 14)
        menuState.selectedItem = i;
    });
    return;
  }
  if (state.is(GameStates.PAUSED)) {
    const boxY = (DESIGN_H - 200) / 2;
    pauseState.items.forEach((_, i) => {
      const iy = boxY + 80 + i * 38;
      if (wy >= iy - 16 && wy <= iy + 12) pauseState.selectedItem = i;
    });
    return;
  }
  if (state.is(GameStates.GAME_OVER) && gameOverState.timer <= 0) {
    _hoverGameOverButtons(wx, wy);
    return;
  }
  if (state.is(GameStates.ENDING) && endingState.phase >= 3) {
    const bW = 140, bH = 32;
    const startX = DESIGN_W / 2 - bW - 12;
    const bY = DESIGN_H * 0.82;
    endingState.hoveredBtn = -1;
    for (let i = 0; i < 2; i++) {
      const bx = startX + i * (bW + 24);
      if (wx >= bx && wx <= bx + bW && wy >= bY && wy <= bY + bH) endingState.hoveredBtn = i;
    }
  }
});

canvas.addEventListener('click', e => {
  const wx = (e.clientX - offsetX) / scale;
  const wy = (e.clientY - offsetY) / scale;

  if (state.is(GameStates.CHARACTER_SELECT)) { _clickCharSelect(wx, wy); return; }
  if (state.is(GameStates.MAIN_MENU))        { _clickMainMenu(wx, wy);   return; }
  if (state.is(GameStates.PAUSED))           { _clickPauseMenu(wx, wy);  return; }
  if (state.is(GameStates.DIALOGUE))         { dialogueUI.advance();      return; }
  if (state.is(GameStates.GAME_OVER) && gameOverState.timer <= 0) { _clickGameOver(wx, wy); return; }
  if (state.is(GameStates.ENDING) && endingState.phase >= 3) { _clickEndingButtons(wx, wy); return; }
});

// ── Hover helpers ─────────────────────────────────────────────────────────────
function _hoverCharSelect(wx, wy) {
  const cards = charSelectState.cards;
  for (const [type, c] of Object.entries(cards)) {
    if (wx >= c.x && wx <= c.x + c.w && wy >= c.y && wy <= c.y + c.h)
      charSelectState.hovered = type;
  }
}

function _hoverGameOverButtons(wx, wy) {
  const btnW = 160, btnH = 34, gap = 20;
  const totalW = btnW * 2 + gap;
  const bY = DESIGN_H / 2 + 44;
  gameOverState.hoveredBtn = -1;
  for (let i = 0; i < 2; i++) {
    const bx = (DESIGN_W - totalW) / 2 + i * (btnW + gap);
    if (wx >= bx && wx <= bx + btnW && wy >= bY && wy <= bY + btnH)
      gameOverState.hoveredBtn = i;
  }
}

// ── Click handlers ────────────────────────────────────────────────────────────
function _clickCharSelect(wx, wy) {
  // Click on a card → select that character
  _hoverCharSelect(wx, wy);

  // Click confirm button
  const btnW = 210, btnH = 36;
  const btnX = (DESIGN_W - btnW) / 2;
  const btnY = DESIGN_H - 62;
  if (wx >= btnX && wx <= btnX + btnW && wy >= btnY && wy <= btnY + btnH) {
    state.transition(GameStates.PLAYING);
  }
}

function _clickMainMenu(wx, wy) {
  menuState.items.forEach((_, i) => {
    const iy = DESIGN_H * 0.60 + i * 44;
    if (wx >= DESIGN_W / 2 - 120 && wx <= DESIGN_W / 2 + 120 && wy >= iy - 22 && wy <= iy + 14) {
      menuState.selectedItem = i;
      _executeMenuSelect(i);
    }
  });
}

function _executeMenuSelect(idx) {
  if (idx === 0) state.transition(GameStates.CHARACTER_SELECT);
  // idx 1 = settings (reserved)
}

function _clickPauseMenu(wx, wy) {
  const boxY = (DESIGN_H - 200) / 2;
  pauseState.items.forEach((_, i) => {
    const iy = boxY + 80 + i * 38;
    if (wy >= iy - 16 && wy <= iy + 12) { pauseState.selectedItem = i; _executePauseItem(i); }
  });
}

function _clickGameOver(wx, wy) {
  const btnW = 160, btnH = 34, gap = 20;
  const totalW = btnW * 2 + gap;
  const bY = DESIGN_H / 2 + 44;
  for (let i = 0; i < 2; i++) {
    const bx = (DESIGN_W - totalW) / 2 + i * (btnW + gap);
    if (wx >= bx && wx <= bx + btnW && wy >= bY && wy <= bY + btnH) {
      if (i === 0) {
        // Coba Lagi — respawn at checkpoint with full lives
        respawnPlayer();
        state.transition(GameStates.PLAYING);
      } else {
        state.transition(GameStates.MAIN_MENU);
      }
      return;
    }
  }
}

function _clickEndingButtons(wx, wy) {
  const bW = 140, bH = 32;
  const startX = DESIGN_W / 2 - bW - 12;
  const bY = DESIGN_H * 0.82;
  for (let i = 0; i < 2; i++) {
    const bx = startX + i * (bW + 24);
    if (wx >= bx && wx <= bx + bW && wy >= bY && wy <= bY + bH) {
      state.transition(i === 0 ? GameStates.CHARACTER_SELECT : GameStates.MAIN_MENU);
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Keyboard menu navigation
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (state.is(GameStates.CHARACTER_SELECT)) {
    if (e.code === 'ArrowLeft')  charSelectState.hovered = 'male';
    if (e.code === 'ArrowRight') charSelectState.hovered = 'female';
    if (e.code === 'Enter' || e.code === 'Space') state.transition(GameStates.PLAYING);
    return;
  }
  if (state.is(GameStates.MAIN_MENU)) {
    if (e.code === 'ArrowUp')   menuState.selectedItem = Math.max(0, menuState.selectedItem - 1);
    if (e.code === 'ArrowDown') menuState.selectedItem = Math.min(menuState.items.length - 1, menuState.selectedItem + 1);
    if (e.code === 'Enter' || e.code === 'Space') _executeMenuSelect(menuState.selectedItem);
    return;
  }
  if (state.is(GameStates.PAUSED)) {
    if (e.code === 'ArrowUp')   pauseState.selectedItem = Math.max(0, pauseState.selectedItem - 1);
    if (e.code === 'ArrowDown') pauseState.selectedItem = Math.min(pauseState.items.length - 1, pauseState.selectedItem + 1);
    if (e.code === 'Enter')     _executePauseItem(pauseState.selectedItem);
    return;
  }
  if (state.is(GameStates.DIALOGUE)) {
    if (e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyE') dialogueUI.advance();
    return;
  }
  if (state.is(GameStates.GAME_OVER) && gameOverState.timer <= 0) {
    if (e.code === 'Enter' || e.code === 'Space') { respawnPlayer(); state.transition(GameStates.PLAYING); }
    if (e.code === 'Escape') state.transition(GameStates.MAIN_MENU);
    return;
  }
  if (state.is(GameStates.ENDING) && endingState.phase >= 3) {
    if (e.code === 'Enter' || e.code === 'Space') state.transition(GameStates.CHARACTER_SELECT);
    if (e.code === 'Escape')                       state.transition(GameStates.MAIN_MENU);
    return;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Main game loop
// ─────────────────────────────────────────────────────────────────────────────
let lastTime = 0;

function loop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  mergeTouchInput();
  pollInput();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0A0A1A';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  switch (state.current) {
    case GameStates.BOOT:
    case GameStates.MAIN_MENU:
      updateMainMenu(dt);
      renderMainMenu();
      break;

    case GameStates.CHARACTER_SELECT:
      updateCharSelect(dt);
      renderCharSelect();
      break;

    case GameStates.PLAYING:
      updatePlaying(dt);
      renderPlaying();
      break;

    case GameStates.PAUSED:
      updatePaused(dt);
      renderPaused();
      break;

    case GameStates.DIALOGUE:
      updateDialogue(dt);
      renderDialogue();
      break;

    case GameStates.GAME_OVER:
      updateGameOver(dt);
      renderGameOver();
      break;

    case GameStates.ENDING:
      updateEnding(dt);
      renderEnding();
      break;
  }

  clearOneShots();
  requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Boot
// ─────────────────────────────────────────────────────────────────────────────
function boot() {
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  setupTouchControls();
  state.transition(GameStates.MAIN_MENU);
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
