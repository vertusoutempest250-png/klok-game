/**
 * Dialogue UI — Godot-style dialogue box.
 * Typewriter effect, speaker name, advance on E/Space/click.
 */

export class DialogueUI {
  constructor(canvasW, canvasH) {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this._queue   = [];    // [{speaker, text}]
    this._current = null;
    this._displayed = '';
    this._charTimer = 0;
    this._charSpeed = 0.035; // seconds per character
    this._done = false;
    this._visible = false;
    this._onComplete = null;
    this._portrait = null;
    this._skipPressed = false;
  }

  resize(w, h) {
    this.canvasW = w;
    this.canvasH = h;
  }

  /** Start showing a sequence of dialogue lines */
  show(lines, onComplete = null) {
    this._queue = [...lines];
    this._onComplete = onComplete;
    this._visible = true;
    this._advance();
  }

  _advance() {
    if (this._queue.length === 0) {
      this._visible = false;
      this._current = null;
      if (this._onComplete) this._onComplete();
      return;
    }
    this._current = this._queue.shift();
    this._displayed = '';
    this._charTimer = 0;
    this._done = false;
  }

  /** Returns true if the dialogue box is currently open */
  get isVisible() { return this._visible; }

  /** Call this when the player presses E / Space / click */
  advance() {
    if (!this._visible) return;
    if (!this._done) {
      // Skip typewriter — show full text immediately
      this._displayed = this._current.text;
      this._done = true;
    } else {
      this._advance();
    }
  }

  update(dt) {
    if (!this._visible || !this._current || this._done) return;
    this._charTimer += dt;
    if (this._charTimer >= this._charSpeed) {
      this._charTimer = 0;
      if (this._displayed.length < this._current.text.length) {
        this._displayed += this._current.text[this._displayed.length];
      } else {
        this._done = true;
      }
    }
  }

  draw(ctx) {
    if (!this._visible || !this._current) return;

    const boxH  = 110;
    const boxW  = Math.min(this.canvasW - 40, 700);
    const boxX  = (this.canvasW - boxW) / 2;
    const boxY  = this.canvasH - boxH - 20;
    const pad   = 16;
    const nameH = 26;

    ctx.save();
    ctx.globalAlpha = 1;

    // --- Box shadow ---
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(boxX + 4, boxY + 4, boxW, boxH);

    // --- Main box ---
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // --- Pixel border ---
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(boxX + 1, boxY + 1, boxW - 2, boxH - 2);
    ctx.strokeStyle = '#C8A020';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 3, boxY + 3, boxW - 6, boxH - 6);

    // --- Speaker name bar ---
    ctx.fillStyle = '#2A3A6A';
    ctx.fillRect(boxX, boxY, 160, nameH);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 1;
    ctx.strokeRect(boxX + 1, boxY + 1, 158, nameH - 2);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 13px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(this._current.speaker, boxX + pad, boxY + 18);

    // --- Dialogue text ---
    ctx.fillStyle = '#F0E8D0';
    ctx.font = '13px "Courier New", monospace';
    ctx.textAlign = 'left';

    const textX = boxX + pad;
    const textY = boxY + nameH + 16;
    const maxW  = boxW - pad * 2;
    this._wrapText(ctx, this._displayed, textX, textY, maxW, 20);

    // --- Advance indicator (blinking cursor when done) ---
    if (this._done) {
      const blink = Math.floor(Date.now() / 400) % 2 === 0;
      if (blink) {
        ctx.fillStyle = '#FFD700';
        ctx.font = '11px monospace';
        ctx.textAlign = 'right';
        ctx.fillText('▼ [E]', boxX + boxW - pad, boxY + boxH - 8);
      }
    }

    ctx.restore();
  }

  _wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    let cy = y;
    for (const word of words) {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line, x, cy);
        cy += lineH;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line, x, cy);
  }
}
