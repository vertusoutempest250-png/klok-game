/**
 * Checkpoint — Save position. Glow animation when activated.
 */

export class Checkpoint {
  constructor(x, y, id) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 48;
    this.id = id;
    this.activated = false;
    this._glowTimer = 0;
    this._flagWave = 0;
    this._showText = 0;   // countdown for "Checkpoint!" popup
  }

  activate() {
    if (this.activated) return false;
    this.activated = true;
    this._showText = 2.5;
    return true;
  }

  update(dt) {
    this._glowTimer += dt;
    this._flagWave += dt;
    if (this._showText > 0) this._showText -= dt;
  }

  draw(ctx) {
    const sx = this.x;
    const sy = this.y;

    // Pole
    ctx.fillStyle = '#888888';
    ctx.fillRect(sx + 11, sy, 4, this.h);

    // Flag — wave animation
    const waveAmt = this.activated ? Math.sin(this._flagWave * 5) * 3 : 0;
    const flagColor = this.activated ? '#FFD700' : '#AAAAAA';
    const glowAlpha = this.activated
      ? 0.3 + 0.3 * Math.sin(this._glowTimer * 4) : 0;

    // Glow aura when active
    if (this.activated) {
      ctx.save();
      ctx.globalAlpha = glowAlpha;
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(sx + 13, sy + 6, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Flag body (wavy)
    ctx.fillStyle = flagColor;
    ctx.beginPath();
    ctx.moveTo(sx + 15, sy + 2);
    ctx.lineTo(sx + 15 + waveAmt, sy + 8);
    ctx.lineTo(sx + 30, sy + 10 + waveAmt / 2);
    ctx.lineTo(sx + 15, sy + 18);
    ctx.closePath();
    ctx.fill();

    // Flag outline
    ctx.strokeStyle = '#555555';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Star on flag
    if (this.activated) {
      ctx.fillStyle = '#CC4400';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('★', sx + 22, sy + 14);
    }

    // Base
    ctx.fillStyle = '#666666';
    ctx.fillRect(sx + 6, sy + this.h - 6, 12, 6);

    // Popup text
    if (this._showText > 0) {
      const alpha = Math.min(1, this._showText);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#000000';
      ctx.fillRect(sx - 30, sy - 22, 84, 16);
      ctx.fillStyle = '#FFD700';
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('✓ Checkpoint!', sx + 12, sy - 10);
      ctx.restore();
    }
  }

  get rect() {
    return { x: this.x, y: this.y + 10, w: this.w, h: this.h - 10 };
  }
}
