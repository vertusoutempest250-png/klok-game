/**
 * Camera — Godot Camera2D-style.
 * Smooth follow, look-ahead, world bounds clamping.
 */
export class Camera {
  constructor(viewW, viewH, worldW, worldH) {
    this.x = 0;          // top-left world position
    this.y = 0;
    this.viewW = viewW;
    this.viewH = viewH;
    this.worldW = worldW;
    this.worldH = worldH;

    this._targetX = 0;
    this._targetY = 0;

    // smooth & look-ahead tuning
    this.smoothSpeed = 6;       // lerp factor (units/s feeling)
    this.lookAheadDist = 80;    // pixels ahead of player
    this.lookAheadSmooth = 3;
    this._lookAheadX = 0;

    // shake state
    this._shakeAmt = 0;
    this._shakeDur = 0;
    this._shakeTimer = 0;
  }

  resize(viewW, viewH) {
    this.viewW = viewW;
    this.viewH = viewH;
  }

  setWorld(worldW, worldH) {
    this.worldW = worldW;
    this.worldH = worldH;
  }

  /** Call every frame with player position and delta time (seconds). */
  update(playerX, playerY, playerFacing, dt) {
    // Look-ahead: lean in the direction the player is facing
    const lookTarget = playerFacing === 1 ? this.lookAheadDist : -this.lookAheadDist;
    this._lookAheadX += (lookTarget - this._lookAheadX) * this.lookAheadSmooth * dt;

    // Target: centre of player + look-ahead offset
    this._targetX = playerX + 16 - this.viewW / 2 + this._lookAheadX;
    this._targetY = playerY + 24 - this.viewH / 2;

    // Lerp towards target
    const t = Math.min(1, this.smoothSpeed * dt);
    this.x += (this._targetX - this.x) * t;
    this.y += (this._targetY - this.y) * t;

    // Clamp to world bounds
    this.x = Math.max(0, Math.min(this.worldW - this.viewW, this.x));
    this.y = Math.max(0, Math.min(this.worldH - this.viewH, this.y));

    // Shake
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
    } else {
      this._shakeAmt = 0;
    }
  }

  shake(amount, duration) {
    this._shakeAmt = amount;
    this._shakeDur = duration;
    this._shakeTimer = duration;
  }

  /** Apply camera transform to a canvas 2D context. */
  applyTransform(ctx) {
    const sx = this._shakeTimer > 0
      ? (Math.random() - 0.5) * 2 * this._shakeAmt : 0;
    const sy = this._shakeTimer > 0
      ? (Math.random() - 0.5) * 2 * this._shakeAmt : 0;
    ctx.translate(-Math.round(this.x) + sx, -Math.round(this.y) + sy);
  }

  /** Snap camera immediately to player (no lerp). */
  snapTo(px, py) {
    this.x = Math.max(0, Math.min(this.worldW - this.viewW, px - this.viewW / 2));
    this.y = Math.max(0, Math.min(this.worldH - this.viewH, py - this.viewH / 2));
    this._targetX = this.x;
    this._targetY = this.y;
  }

  /** Slowly pan camera to a world point (for cutscenes). */
  panTo(wx, wy, speed = 80) {
    const dx = wx - (this.x + this.viewW / 2);
    const dy = wy - (this.y + this.viewH / 2);
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return true; // arrived
    const step = speed / 60;
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.x = Math.max(0, Math.min(this.worldW - this.viewW, this.x));
    this.y = Math.max(0, Math.min(this.worldH - this.viewH, this.y));
    return false;
  }

  /** Convert world coords to screen coords */
  worldToScreen(wx, wy) {
    return { x: wx - this.x, y: wy - this.y };
  }
}
