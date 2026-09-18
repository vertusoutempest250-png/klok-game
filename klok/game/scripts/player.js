/**
 * Player — Godot-style CharacterBody2D equivalent.
 * Full physics: gravity, acceleration, friction, jump, coyote time,
 * jump buffering, air control, max fall speed.
 *
 * New in v2:
 *  - charType: 'male' | 'female'  → different palette + hair/skirt drawing
 *  - lives system: 5 hearts max, hit(), heal(), invincibility window
 *  - Knockback on hit
 *  - draw() blinks during invincibility (pixel flash every 0.1 s)
 */

export const PlayerStates = Object.freeze({
  IDLE:     'IDLE',
  WALK:     'WALK',
  RUN:      'RUN',
  JUMP:     'JUMP',
  FALL:     'FALL',
  LAND:     'LAND',
  INTERACT: 'INTERACT',
  HIT:      'HIT',       // brief stagger after taking damage
});

// ── Physics constants ─────────────────────────────────────────────────────────
const GRAVITY        = 1400;
const JUMP_VELOCITY  = -520;
const MOVE_SPEED     = 180;
const RUN_SPEED      = 300;
const ACCEL          = 1200;
const FRICTION       = 1800;
const AIR_ACCEL      = 600;
const AIR_FRICTION   = 400;
const MAX_FALL       = 700;
const COYOTE_TIME    = 0.10;
const JUMP_BUFFER    = 0.12;

// ── Lives constants ───────────────────────────────────────────────────────────
export const MAX_LIVES       = 5;
const INVINCIBLE_DURATION    = 1.6;   // seconds of i-frames after a hit
const HIT_STAGGER_DURATION   = 0.25;  // seconds of locked HIT state
const KNOCKBACK_VX           = 220;   // horizontal knockback speed (px/s)
const KNOCKBACK_VY           = -280;  // vertical   knockback speed (px/s)
const BLINK_INTERVAL         = 0.10;  // seconds between visibility toggles

// ── Character palettes ────────────────────────────────────────────────────────
const PALETTES = {
  male: {
    skin:    '#F5C99A',
    hair:    '#3A2112',
    shirt:   '#3860C8',   // blue school shirt
    pants:   '#1A2A5A',   // dark blue trousers
    skirt:   null,        // no skirt
    shoes:   '#2A1A0A',
    badge:   '#FFD700',
    ribbon:  null,
    outline: '#1A1A2E',
  },
  female: {
    skin:    '#F5C99A',
    hair:    '#2A1A08',   // darker, longer hair
    shirt:   '#FFFFFF',   // white blouse
    pants:   '#1A2A5A',   // dark pants (under skirt)
    skirt:   '#2A50A8',   // school blue skirt
    shoes:   '#2A1A0A',
    badge:   '#FFD700',
    ribbon:  '#FF6699',   // hair ribbon
    outline: '#1A1A2E',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
export class Player {
  /**
   * @param {number} x
   * @param {number} y
   * @param {'male'|'female'} charType
   */
  constructor(x, y, charType = 'male') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 40;

    this.charType = charType;
    this.palette  = { ...PALETTES[charType] };

    // Velocity
    this.vx = 0;
    this.vy = 0;

    // State machine
    this.state       = PlayerStates.IDLE;
    this.facing      = 1;      // 1 = right, -1 = left
    this.onGround    = false;
    this.alive       = true;
    this.canInteract = false;
    this.interacting = false;

    // Lives
    this.lives       = MAX_LIVES;
    this.invincible  = false;
    this._invTimer   = 0;      // counts down from INVINCIBLE_DURATION
    this._hitTimer   = 0;      // counts down from HIT_STAGGER_DURATION
    this._blinkTimer = 0;
    this._blinkVis   = true;   // whether sprite is visible this blink tick

    // Physics helpers
    this._coyoteTimer = 0;
    this._jumpBuffer  = 0;
    this._landTimer   = 0;

    // Animation
    this._animFrame = 0;
    this._animTimer = 0;
    this._animSpeed = 0.1;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Apply one hit from a trap / hazard.
   * Returns true if the player actually lost a life (not during i-frames).
   * @param {'left'|'right'|null} sourceDir  — direction of the hazard for knockback
   */
  hit(sourceDir = null) {
    if (this.invincible || !this.alive) return false;

    this.lives = Math.max(0, this.lives - 1);
    this.invincible  = true;
    this._invTimer   = INVINCIBLE_DURATION;
    this._blinkTimer = 0;
    this._blinkVis   = true;

    // Knockback: push away from hazard, always upward a little
    const dir = sourceDir === 'right' ? 1
               : sourceDir === 'left'  ? -1
               : -this.facing;           // default: push backward
    this.vx = dir * KNOCKBACK_VX;
    this.vy = KNOCKBACK_VY;
    this.onGround = false;

    // Enter HIT stagger state
    this._hitTimer = HIT_STAGGER_DURATION;
    this.state     = PlayerStates.HIT;

    if (this.lives <= 0) {
      this.alive = false;
    }
    return true;
  }

  /** Restore one life (unused yet, reserved for future items). */
  heal() {
    this.lives = Math.min(MAX_LIVES, this.lives + 1);
  }

  // ── Core update ───────────────────────────────────────────────────────────

  update(input, dt) {
    if (!this.alive) return;

    this._updateTimers(dt);
    this._applyGravity(dt);

    // During HIT stagger, block normal movement input
    if (this._hitTimer > 0) {
      // Only apply friction / gravity — no new input
      this._applyDecelerationOnly(dt);
    } else {
      this._handleMovement(input, dt);
    }

    this._handleJump(input);
    this._updateState(input);
    this._updateAnimation(dt);
  }

  _updateTimers(dt) {
    if (this._landTimer > 0) this._landTimer -= dt;
    if (this._jumpBuffer > 0) this._jumpBuffer -= dt;
    if (this._coyoteTimer > 0) this._coyoteTimer -= dt;

    // HIT stagger timer
    if (this._hitTimer > 0) {
      this._hitTimer -= dt;
      if (this._hitTimer <= 0) this._hitTimer = 0;
    }

    // Invincibility + blink
    if (this._invTimer > 0) {
      this._invTimer -= dt;
      this._blinkTimer += dt;
      if (this._blinkTimer >= BLINK_INTERVAL) {
        this._blinkTimer = 0;
        this._blinkVis = !this._blinkVis;
      }
      if (this._invTimer <= 0) {
        this._invTimer  = 0;
        this.invincible = false;
        this._blinkVis  = true;  // ensure visible when i-frames end
      }
    }
  }

  _applyGravity(dt) {
    if (!this.onGround) {
      this.vy += GRAVITY * dt;
      if (this.vy > MAX_FALL) this.vy = MAX_FALL;
    }
  }

  _applyDecelerationOnly(dt) {
    // Only decelerate (friction) during stagger — no player input
    const fric = this.onGround ? FRICTION : AIR_FRICTION;
    if (this.vx > 0)      this.vx = Math.max(0, this.vx - fric * dt);
    else if (this.vx < 0) this.vx = Math.min(0, this.vx + fric * dt);
  }

  _handleMovement(input, dt) {
    const targetSpeed = input.run ? RUN_SPEED : MOVE_SPEED;
    const accel = this.onGround ? ACCEL      : AIR_ACCEL;
    const fric  = this.onGround ? FRICTION   : AIR_FRICTION;

    if (input.left) {
      this.vx = Math.max(this.vx - accel * dt, -targetSpeed);
      this.facing = -1;
    } else if (input.right) {
      this.vx = Math.min(this.vx + accel * dt,  targetSpeed);
      this.facing = 1;
    } else {
      if (this.vx > 0)      this.vx = Math.max(0, this.vx - fric * dt);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + fric * dt);
    }
  }

  _handleJump(input) {
    if (input.jumpPressed) this._jumpBuffer = JUMP_BUFFER;
    if (this.onGround) this._coyoteTimer = COYOTE_TIME;

    const canJump = this._coyoteTimer > 0;
    if (this._jumpBuffer > 0 && canJump) {
      this.vy           = JUMP_VELOCITY;
      this._jumpBuffer  = 0;
      this._coyoteTimer = 0;
      this.onGround     = false;
    }
  }

  _updateState(input) {
    // HIT overrides everything
    if (this._hitTimer > 0) {
      this.state = PlayerStates.HIT;
      return;
    }
    if (this._landTimer > 0) {
      this.state = PlayerStates.LAND;
      return;
    }
    if (!this.onGround) {
      this.state = this.vy < 0 ? PlayerStates.JUMP : PlayerStates.FALL;
      return;
    }
    if (input.interact && this.canInteract) {
      this.state = PlayerStates.INTERACT;
      return;
    }
    const spd = Math.abs(this.vx);
    if (spd > 200)     this.state = PlayerStates.RUN;
    else if (spd > 10) this.state = PlayerStates.WALK;
    else               this.state = PlayerStates.IDLE;
  }

  _updateAnimation(dt) {
    const frameCounts = {
      [PlayerStates.IDLE]:     4,
      [PlayerStates.WALK]:     6,
      [PlayerStates.RUN]:      6,
      [PlayerStates.JUMP]:     2,
      [PlayerStates.FALL]:     2,
      [PlayerStates.LAND]:     2,
      [PlayerStates.INTERACT]: 3,
      [PlayerStates.HIT]:      2,
    };
    const speeds = {
      [PlayerStates.IDLE]:     0.18,
      [PlayerStates.WALK]:     0.10,
      [PlayerStates.RUN]:      0.07,
      [PlayerStates.JUMP]:     0.15,
      [PlayerStates.FALL]:     0.15,
      [PlayerStates.LAND]:     0.12,
      [PlayerStates.INTERACT]: 0.14,
      [PlayerStates.HIT]:      0.08,
    };
    this._animSpeed = speeds[this.state] || 0.10;
    this._animTimer += dt;
    if (this._animTimer >= this._animSpeed) {
      this._animTimer = 0;
      const max = frameCounts[this.state] || 4;
      this._animFrame = (this._animFrame + 1) % max;
    }
  }

  // ── Collision callbacks ───────────────────────────────────────────────────

  land() {
    if (!this.onGround && this.vy > 100) this._landTimer = 0.12;
    this.onGround = true;
    this.vy = 0;
  }

  leaveGround() { this.onGround = false; }

  /** Hard death (fall into pit) — bypasses lives. */
  die() {
    this.alive = false;
    this.lives = 0;
    this.vx    = 0;
    this.vy    = -250;
  }

  respawn(x, y) {
    this.x        = x;
    this.y        = y;
    this.vx       = 0;
    this.vy       = 0;
    this.alive    = true;
    this.lives    = MAX_LIVES;
    this.invincible  = false;
    this._invTimer   = 0;
    this._hitTimer   = 0;
    this._blinkVis   = true;
    this.onGround    = false;
    this.state       = PlayerStates.FALL;
  }

  // ── Renderer ─────────────────────────────────────────────────────────────

  draw(ctx) {
    // Blink during invincibility — skip draw on invisible frames
    if (!this._blinkVis) return;

    ctx.save();

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    ctx.translate(cx, cy);
    if (this.facing === -1) ctx.scale(-1, 1);

    const f = this._animFrame;
    const s = this.state;

    let bodyBob = 0;
    if (s === PlayerStates.WALK || s === PlayerStates.RUN) bodyBob = Math.sin(f * Math.PI) * 2;
    if (s === PlayerStates.LAND) bodyBob = 4;
    if (s === PlayerStates.HIT)  bodyBob = Math.sin(f * Math.PI * 2) * 3;

    let lean = 0;
    if (s === PlayerStates.JUMP) lean = -2;
    if (s === PlayerStates.FALL) lean = 2;
    if (s === PlayerStates.HIT)  lean = this.facing === 1 ? -8 : 8;

    const p  = this.palette;
    const ox = -this.w / 2;
    const oy = -this.h / 2 + bodyBob;

    // Red tint flash during HIT
    if (s === PlayerStates.HIT) {
      ctx.save();
      ctx.globalAlpha = 0.5;
    }

    this._drawPixelChar(ctx, ox, oy, lean, f, s, p);

    if (s === PlayerStates.HIT) ctx.restore();

    // [E] interact prompt
    if (this.canInteract) {
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('[E]', 0, -this.h / 2 - 8);
    }

    ctx.restore();
  }

  // ── Pixel-art drawing ─────────────────────────────────────────────────────

  _drawPixelChar(ctx, ox, oy, lean, frame, state, p) {
    const pw = 28;
    const ph = 40;

    ctx.save();
    ctx.translate(ox + pw / 2, oy + ph / 2);
    ctx.rotate(lean * Math.PI / 180);
    ctx.translate(-pw / 2, -ph / 2);

    const px  = (x, y, w, h, color) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
    const pxo = (x, y, w, h)        => { ctx.fillStyle = p.outline; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); };

    const isFemale = this.charType === 'female';

    // ── HEAD ──────────────────────────────────────────────────────────
    pxo(8, 2, 12, 11);
    px(8, 2, 12, 11, p.skin);

    if (isFemale) {
      // Longer hair: top + side strands
      px(8, 2, 12, 3, p.hair);           // top
      px(6, 2, 4, 14, p.hair);           // left side hang
      px(18, 2, 4, 14, p.hair);          // right side hang
      px(8, 2, 3, 6, p.hair);            // left crown
      px(17, 2, 3, 6, p.hair);           // right crown
      // Hair ribbon
      if (p.ribbon) {
        px(18, 2, 5, 3, p.ribbon);
        px(19, 1, 3, 2, p.ribbon);
      }
    } else {
      // Short hair (original)
      px(8, 2, 12, 4, p.hair);
    }

    // Eyes
    if (state === PlayerStates.IDLE && frame === 3) {
      px(11, 8, 2, 1, p.outline);
      px(17, 8, 2, 1, p.outline);
    } else {
      px(11, 8, 2, 2, p.outline);
      px(17, 8, 2, 2, p.outline);
      px(12, 8, 1, 1, '#fff');
      px(18, 8, 1, 1, '#fff');
    }

    // Mouth
    if (state === PlayerStates.HIT) {
      px(13, 11, 4, 2, '#CC3300');       // open pained mouth
    } else if (state === PlayerStates.JUMP) {
      px(13, 11, 4, 1, '#cc6644');
    } else {
      px(13, 11, 2, 1, p.outline);
    }

    // ── TORSO ─────────────────────────────────────────────────────────
    pxo(6, 13, 16, 12);
    px(6, 13, 16, 12, p.shirt);

    if (isFemale) {
      // White blouse details — bow / collar
      px(11, 13, 6, 3, '#EEEEEE');
      px(13, 14, 2, 4, '#DDDDDD');       // bow centre
      px(10, 14, 3, 2, '#DDDDDD');       // bow left wing
      px(15, 14, 3, 2, '#DDDDDD');       // bow right wing
    } else {
      // Collar + badge (original)
      px(11, 13, 6, 3, '#ffffff');
      px(7, 15, 4, 4, p.badge);
      px(8, 16, 2, 2, '#fff');
    }

    // ── LOWER BODY ────────────────────────────────────────────────────
    if (isFemale && p.skirt) {
      // Pleated skirt
      pxo(5, 25, 18, 10);
      px(5, 25, 18, 10, p.skirt);
      // Pleat lines
      for (let lx = 7; lx < 22; lx += 4) {
        px(lx, 25, 1, 10, '#1A3A80');
      }
      px(5, 25, 18, 2, '#1A3A80');       // waistband
    } else {
      // Trousers (original)
      pxo(7, 25, 14, 9);
      px(7, 25, 14, 9, p.pants);
      px(7, 25, 14, 2, '#2A2A2A');       // belt
    }

    // ── LEGS ──────────────────────────────────────────────────────────
    let l1y = 34, l2y = 34, l1x = 7, l2x = 16;
    if (state === PlayerStates.WALK || state === PlayerStates.RUN) {
      const swing = (state === PlayerStates.RUN ? 5 : 3);
      l1y = 34 + Math.sin((frame / 3) * Math.PI) * swing;
      l2y = 34 - Math.sin((frame / 3) * Math.PI) * swing;
      l1x = 7  + Math.sin((frame / 3) * Math.PI) * 2;
      l2x = 16 - Math.sin((frame / 3) * Math.PI) * 2;
    }
    if (state === PlayerStates.JUMP) { l1y = 30; l2y = 30; l1x = 5; l2x = 18; }
    if (state === PlayerStates.LAND) { l1y = 36; l2y = 36; }
    if (state === PlayerStates.HIT)  {
      l1y = 34 + (frame % 2) * 3;
      l2y = 34 - (frame % 2) * 3;
    }

    // Leg colours — female shows stockings below skirt
    const legColor = (isFemale && p.skirt) ? '#E8D0C0' : p.pants;

    pxo(l1x, l1y, 5, 6); px(l1x, l1y, 5, 6, legColor); px(l1x, l1y + 4, 5, 4, p.shoes);
    pxo(l2x, l2y, 5, 6); px(l2x, l2y, 5, 6, legColor); px(l2x, l2y + 4, 5, 4, p.shoes);

    // ── ARMS ──────────────────────────────────────────────────────────
    let a1x = 3, a1y = 14, a2x = 22, a2y = 14;
    if (state === PlayerStates.WALK || state === PlayerStates.RUN) {
      const swing = (state === PlayerStates.RUN ? 6 : 3);
      a1y = 14 + Math.sin((frame / 3) * Math.PI) * swing;
      a2y = 14 - Math.sin((frame / 3) * Math.PI) * swing;
    }
    if (state === PlayerStates.JUMP)     { a1y = 10; a2y = 10; a1x = 1; a2x = 24; }
    if (state === PlayerStates.INTERACT) { a2y = 10 + Math.sin(frame * Math.PI) * 3; a2x = 24; }
    if (state === PlayerStates.HIT)      {
      // Arms flung outward
      a1x = 0; a1y = 12 - (frame % 2) * 4;
      a2x = 24; a2y = 12 - (frame % 2) * 4;
    }

    pxo(a1x, a1y, 4, 9); px(a1x, a1y, 4, 9, p.shirt); px(a1x, a1y + 6, 4, 4, p.skin);
    pxo(a2x, a2y, 4, 9); px(a2x, a2y, 4, 9, p.shirt); px(a2x, a2y + 6, 4, 4, p.skin);

    ctx.restore();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  get rect()    { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
  get centerX() { return this.x + this.w / 2; }
  get centerY() { return this.y + this.h / 2; }
  get bottom()  { return this.y + this.h; }
  get right()   { return this.x + this.w; }
}

// ── Static preview renderer (used on the character-select screen) ─────────────
/**
 * Draw a standalone character preview at (cx, cy) with the given charType.
 * Scale is applied around the centre point.
 */
export function drawCharPreview(ctx, cx, cy, charType, scale = 2, animFrame = 0) {
  const p  = { ...PALETTES[charType] };
  const pw = 28, ph = 40;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-pw / 2, -ph / 2);

  const px_  = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
  const pxo_ = (x, y, w, h)    => { ctx.fillStyle = p.outline; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); };

  const isFemale = charType === 'female';

  // Head
  pxo_(8, 2, 12, 11);
  px_(8, 2, 12, 11, p.skin);
  if (isFemale) {
    px_(8, 2, 12, 3, p.hair);
    px_(6, 2, 4, 14, p.hair);
    px_(18, 2, 4, 14, p.hair);
    if (p.ribbon) px_(18, 2, 5, 3, p.ribbon);
  } else {
    px_(8, 2, 12, 4, p.hair);
  }
  // Eyes (idle open)
  px_(11, 8, 2, 2, p.outline); px_(17, 8, 2, 2, p.outline);
  px_(12, 8, 1, 1, '#fff');    px_(18, 8, 1, 1, '#fff');
  // Smile
  px_(13, 11, 2, 1, p.outline);

  // Torso
  pxo_(6, 13, 16, 12);
  px_(6, 13, 16, 12, p.shirt);
  if (isFemale) {
    px_(11, 13, 6, 3, '#EEEEEE');
    px_(13, 14, 2, 4, '#DDDDDD');
    px_(10, 14, 3, 2, '#DDDDDD');
    px_(15, 14, 3, 2, '#DDDDDD');
  } else {
    px_(11, 13, 6, 3, '#ffffff');
    px_(7, 15, 4, 4, p.badge);
    px_(8, 16, 2, 2, '#fff');
  }

  // Lower body
  if (isFemale && p.skirt) {
    pxo_(5, 25, 18, 10); px_(5, 25, 18, 10, p.skirt);
    for (let lx = 7; lx < 22; lx += 4) px_(lx, 25, 1, 10, '#1A3A80');
    px_(5, 25, 18, 2, '#1A3A80');
  } else {
    pxo_(7, 25, 14, 9); px_(7, 25, 14, 9, p.pants);
    px_(7, 25, 14, 2, '#2A2A2A');
  }

  // Legs
  const legColor = (isFemale && p.skirt) ? '#E8D0C0' : p.pants;
  pxo_(7, 34, 5, 6); px_(7, 34, 5, 6, legColor); px_(7, 38, 5, 4, p.shoes);
  pxo_(16, 34, 5, 6); px_(16, 34, 5, 6, legColor); px_(16, 38, 5, 4, p.shoes);

  // Arms (idle — slight wave on alternating frames)
  const wave = (animFrame % 2) * 2;
  pxo_(3, 14 + wave, 4, 9); px_(3, 14 + wave, 4, 9, p.shirt); px_(3, 20 + wave, 4, 4, p.skin);
  pxo_(22, 14 - wave, 4, 9); px_(22, 14 - wave, 4, 9, p.shirt); px_(22, 20 - wave, 4, 4, p.skin);

  ctx.restore();
}
