/**
 * NPC — Classmate NPCs with idle animation, facing, dialogue trigger.
 * Drawn procedurally (pixel art, different colour shirts per NPC).
 */

export class NPC {
  constructor(x, y, name, dialogues, shirtColor = '#C03030') {
    this.x = x;
    this.y = y;
    this.w = 28;
    this.h = 40;
    this.name = name;
    this.dialogues = dialogues;  // array of strings
    this._dialogueIndex = 0;
    this.shirtColor = shirtColor;
    this.facing = -1;  // default face left (toward player start)
    this.interactRadius = 60;

    // Animation
    this._animFrame = 0;
    this._animTimer = 0;
    this._breathTimer = 0;
    this._idleBob = 0;
  }

  update(playerX, dt) {
    // Face the player
    const dx = playerX - (this.x + this.w / 2);
    this.facing = dx < 0 ? -1 : 1;

    // Idle breath bob
    this._breathTimer += dt;
    this._idleBob = Math.sin(this._breathTimer * 1.8) * 1.5;

    // Wave animation frame
    this._animTimer += dt;
    if (this._animTimer > 0.15) {
      this._animTimer = 0;
      this._animFrame = (this._animFrame + 1) % 4;
    }
  }

  isNear(playerX, playerY) {
    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2;
    const px = playerX + 14;
    const py = playerY + 20;
    return Math.hypot(cx - px, cy - py) < this.interactRadius;
  }

  getNextDialogue() {
    const line = this.dialogues[this._dialogueIndex];
    this._dialogueIndex = (this._dialogueIndex + 1) % this.dialogues.length;
    return { speaker: this.name, text: line };
  }

  draw(ctx) {
    ctx.save();

    const cx = this.x + this.w / 2;
    const cy = this.y + this.h / 2 + this._idleBob;

    ctx.translate(cx, cy);
    if (this.facing === -1) ctx.scale(-1, 1);

    this._drawPixelNPC(ctx, this._animFrame);

    ctx.restore();

    // Floating name tag
    ctx.save();
    ctx.font = 'bold 9px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(this.x + this.w / 2 - 22, this.y - 16, 44, 12);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(this.name, this.x + this.w / 2, this.y - 7);
    ctx.restore();
  }

  _drawPixelNPC(ctx, frame) {
    const p = {
      skin:    '#F5C99A',
      hair:    '#2A1A08',
      shirt:   this.shirtColor,
      pants:   '#2A3A6A',
      shoes:   '#1A1A1A',
      outline: '#1A1A2E',
    };
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const pxo = (x, y, w, h)    => { ctx.fillStyle = p.outline; ctx.fillRect(x - 1, y - 1, w + 2, h + 2); };

    const hw = -14, hh = -20;

    // Head
    pxo(hw + 3, hh, 12, 11);
    px(hw + 3, hh,     12, 11, p.skin);
    px(hw + 3, hh,     12, 4,  p.hair);
    // Eyes
    px(hw + 5, hh + 6, 2, 2, p.outline);
    px(hw + 11, hh + 6, 2, 2, p.outline);

    // Waving arm (frame-based)
    const waveY = hh + 13 + Math.sin(frame * Math.PI / 2) * 4;
    pxo(hw + 20, waveY, 4, 9);
    px(hw + 20, waveY, 4, 9, p.shirt);
    px(hw + 20, waveY + 6, 4, 4, p.skin);

    // Static arm
    pxo(hw - 2, hh + 13, 4, 9);
    px(hw - 2, hh + 13, 4, 9, p.shirt);
    px(hw - 2, hh + 19, 4, 4, p.skin);

    // Torso
    pxo(hw + 1, hh + 13, 16, 12);
    px(hw + 1, hh + 13, 16, 12, p.shirt);

    // Pants
    pxo(hw + 2, hh + 25, 14, 8);
    px(hw + 2, hh + 25, 14, 8, p.pants);

    // Legs (standing still)
    pxo(hw + 2, hh + 33, 5, 7);
    px(hw + 2, hh + 33, 5, 7, p.pants);
    px(hw + 2, hh + 37, 5, 4, p.shoes);

    pxo(hw + 11, hh + 33, 5, 7);
    px(hw + 11, hh + 33, 5, 7, p.pants);
    px(hw + 11, hh + 37, 5, 4, p.shoes);
  }

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}
