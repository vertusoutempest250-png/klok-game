/**
 * Trap — Hazard objects drawn procedurally with pixel-art canvas.
 *
 * Types:
 *   'spike'   — row of stone/metal spikes on the ground or ceiling
 *   'spike_c' — ceiling-mounted spikes (points downward)
 *   'saw'     — spinning circular saw blade on a post
 *   'thorn'   — organic thorny bush (rice-field / countryside feel)
 *
 * Each Trap has:
 *   - rect   → AABB hitbox (tighter than visual, pixel-fair)
 *   - update(dt)
 *   - draw(ctx)  — draws at world coords; caller translates by -camX/-camY
 */

export class Trap {
  /**
   * @param {number} x        World X (left edge)
   * @param {number} y        World Y (top edge)
   * @param {number} w        Width  in pixels
   * @param {number} h        Height in pixels
   * @param {'spike'|'spike_c'|'saw'|'thorn'} type
   */
  constructor(x, y, w, h, type = 'spike') {
    this.x    = x;
    this.y    = y;
    this.w    = w;
    this.h    = h;
    this.type = type;

    // Internal animation state
    this._timer = Math.random() * Math.PI * 2;   // phase offset so traps don't sync
  }

  update(dt) {
    this._timer += dt * (this.type === 'saw' ? 4.0 : 1.2);
  }

  /**
   * AABB hitbox — slightly inset so only the sharp tips actually hurt.
   * All values are in world space.
   */
  get rect() {
    switch (this.type) {
      case 'spike':
        // Only the top half of the spike is lethal
        return { x: this.x + 2, y: this.y, w: this.w - 4, h: this.h * 0.6 };
      case 'spike_c':
        // Bottom half of ceiling spike
        return { x: this.x + 2, y: this.y + this.h * 0.4, w: this.w - 4, h: this.h * 0.6 };
      case 'saw':
        // Circular hitbox approximated as square, inset 4 px
        return { x: this.x + 4, y: this.y + 4, w: this.w - 8, h: this.h - 8 };
      case 'thorn':
        // Upper two-thirds
        return { x: this.x + 3, y: this.y, w: this.w - 6, h: this.h * 0.75 };
      default:
        return { x: this.x, y: this.y, w: this.w, h: this.h };
    }
  }

  draw(ctx) {
    switch (this.type) {
      case 'spike':   this._drawSpike(ctx, false); break;
      case 'spike_c': this._drawSpike(ctx, true);  break;
      case 'saw':     this._drawSaw(ctx);           break;
      case 'thorn':   this._drawThorn(ctx);         break;
    }
  }

  // ── Spike (ground) ──────────────────────────────────────────────────
  _drawSpike(ctx, ceiling) {
    const { x, y, w, h } = this;
    const spikeW = 14;
    const count  = Math.max(1, Math.floor(w / spikeW));
    const actualW = count * spikeW;
    const startX  = x + (w - actualW) / 2;

    ctx.save();

    if (ceiling) {
      // Flip vertically around centre Y
      ctx.translate(x + w / 2, y + h / 2);
      ctx.scale(1, -1);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }

    // Base plate
    ctx.fillStyle = '#5A5A6A';
    ctx.fillRect(startX, y + h - 6, actualW, 6);
    // Base highlight
    ctx.fillStyle = '#7A7A8A';
    ctx.fillRect(startX, y + h - 6, actualW, 2);

    // Individual spikes
    for (let i = 0; i < count; i++) {
      const sx = startX + i * spikeW;

      // Dark outline triangle
      ctx.fillStyle = '#2A2A3A';
      ctx.beginPath();
      ctx.moveTo(sx,              y + h - 4);
      ctx.lineTo(sx + spikeW / 2, y);
      ctx.lineTo(sx + spikeW,     y + h - 4);
      ctx.closePath();
      ctx.fill();

      // Main spike body
      ctx.fillStyle = '#8A9AAA';
      ctx.beginPath();
      ctx.moveTo(sx + 2,              y + h - 4);
      ctx.lineTo(sx + spikeW / 2,     y + 2);
      ctx.lineTo(sx + spikeW - 2,     y + h - 4);
      ctx.closePath();
      ctx.fill();

      // Highlight stripe
      ctx.fillStyle = '#B8C8D8';
      ctx.beginPath();
      ctx.moveTo(sx + spikeW / 2 - 1, y + 2);
      ctx.lineTo(sx + spikeW / 2 + 1, y + 8);
      ctx.lineTo(sx + spikeW / 2,     y + 2);
      ctx.closePath();
      ctx.fill();

      // Tip pixel
      ctx.fillStyle = '#D8E8F0';
      ctx.fillRect(sx + spikeW / 2 - 1, y, 2, 2);
    }

    // Danger glow pulse
    const pulse = 0.18 + 0.12 * Math.sin(this._timer * 1.5);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FF4444';
    ctx.fillRect(startX, y, actualW, h);
    ctx.restore();

    ctx.restore();
  }

  // ── Spinning saw ────────────────────────────────────────────────────
  _drawSaw(ctx) {
    const { x, y, w, h } = this;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const r  = Math.min(w, h) / 2 - 2;

    ctx.save();

    // Post / mount
    ctx.fillStyle = '#4A4A5A';
    ctx.fillRect(cx - 2, cy + r - 2, 4, h / 2 + 4);

    // Outer ring
    ctx.strokeStyle = '#3A3A4A';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Spinning blade (rotate around centre)
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this._timer);

    const toothCount = 8;
    // Blade body
    ctx.fillStyle = '#8A9AAA';
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.fill();

    // Teeth
    ctx.fillStyle = '#C0D0E0';
    for (let i = 0; i < toothCount; i++) {
      const angle = (i / toothCount) * Math.PI * 2;
      const ix = Math.cos(angle) * (r - 3);
      const iy = Math.sin(angle) * (r - 3);
      const ox2 = Math.cos(angle) * (r + 4);
      const oy2 = Math.sin(angle) * (r + 4);
      const la = angle - 0.2;
      const ra = angle + 0.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(la) * (r - 3), Math.sin(la) * (r - 3));
      ctx.lineTo(ox2, oy2);
      ctx.lineTo(Math.cos(ra) * (r - 3), Math.sin(ra) * (r - 3));
      ctx.closePath();
      ctx.fill();
    }

    // Inner dark ring
    ctx.fillStyle = '#3A3A5A';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Centre bolt
    ctx.fillStyle = '#888888';
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#CCCCCC';
    ctx.beginPath();
    ctx.arc(-1, -1, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Blood-red danger glow
    const pulse = 0.15 + 0.10 * Math.sin(this._timer * 2);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#FF3300';
    ctx.beginPath();
    ctx.arc(cx, cy, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // ── Thorn bush ──────────────────────────────────────────────────────
  _drawThorn(ctx) {
    const { x, y, w, h } = this;
    ctx.save();

    // Stem cluster
    const stemCount = Math.max(2, Math.floor(w / 18));
    for (let i = 0; i < stemCount; i++) {
      const sx = x + 6 + i * ((w - 12) / Math.max(1, stemCount - 1));
      const sway = Math.sin(this._timer + i * 1.2) * 2;

      // Main stem
      ctx.strokeStyle = '#3A5A20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx, y + h);
      ctx.quadraticCurveTo(sx + sway, y + h * 0.5, sx + sway * 0.5, y + 4);
      ctx.stroke();

      // Thorns on stem
      ctx.strokeStyle = '#2A3A10';
      ctx.lineWidth = 1;
      for (let t = 0; t < 3; t++) {
        const ty = y + h - (t + 1) * (h / 4);
        const tx = sx + sway * (t / 3);
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx - 5, ty - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + 5, ty - 4); ctx.stroke();
      }

      // Tip leaf cluster
      ctx.fillStyle = '#2A6A10';
      ctx.beginPath();
      ctx.ellipse(sx + sway * 0.5, y + 4, 7, 5, sway * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4A8A20';
      ctx.beginPath();
      ctx.ellipse(sx + sway * 0.5, y + 4, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sharp thorn tips (red)
      ctx.fillStyle = '#CC2222';
      ctx.beginPath();
      ctx.moveTo(sx + sway * 0.5, y);
      ctx.lineTo(sx + sway * 0.5 - 2, y + 6);
      ctx.lineTo(sx + sway * 0.5 + 2, y + 6);
      ctx.closePath();
      ctx.fill();
    }

    // Ground base
    ctx.fillStyle = '#3A5A20';
    ctx.fillRect(x + 2, y + h - 5, w - 4, 5);
    ctx.fillStyle = '#5A7A30';
    ctx.fillRect(x + 2, y + h - 5, w - 4, 2);

    ctx.restore();
  }
}
