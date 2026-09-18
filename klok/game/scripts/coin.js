/**
 * Memory collectible — pixel-art items, each with a unique shape.
 *
 * Types & their visuals (all drawn on a 24×24 canvas grid):
 *   PHOTO  — polaroid photograph with two person silhouettes
 *   BOOK   — open book with pages and title
 *   BADGE  — school enamel pin / shield badge
 *   NOTE   — lined notebook page with pencil
 *   RIBBON — graduation ribbon with star centre
 *
 * Each has: bobbing animation, glow ring, collect burst particles,
 * and a collect-scale-up animation.
 */

export const MemoryTypes = ['PHOTO', 'BOOK', 'BADGE', 'NOTE', 'RIBBON'];

// Glow colours per type — used for the ring underneath the sprite
const GLOW_COLORS = {
  PHOTO:  '#FFEEAA',
  BOOK:   '#6699FF',
  BADGE:  '#FFD700',
  NOTE:   '#AAFFAA',
  RIBBON: '#FF99CC',
};

// Particle colours per type
const PARTICLE_COLORS = {
  PHOTO:  '#FFDD88',
  BOOK:   '#88AAFF',
  BADGE:  '#FFD700',
  NOTE:   '#88EE88',
  RIBBON: '#FF88BB',
};

export class Memory {
  constructor(x, y, type = 'PHOTO') {
    this.x    = x;
    this.y    = y;
    this.w    = 24;
    this.h    = 24;
    this.type = type;

    this.collected     = false;
    this._bob          = 0;
    this._bobTimer     = 0;
    this._glowTimer    = 0;
    this._collectAnim  = 0;   // 1→0 during collect animation
    this._particles    = [];
  }

  update(dt) {
    if (this.collected) {
      if (this._collectAnim > 0) {
        this._collectAnim -= dt * 2.5;
        // Animate particles
        for (const p of this._particles) {
          p.x   += p.vx * dt;
          p.y   += p.vy * dt;
          p.life -= dt * 1.8;
        }
      }
      return;
    }
    this._bobTimer  += dt;
    this._glowTimer += dt;
    this._bob = Math.sin(this._bobTimer * 2.4) * 4;
  }

  collect() {
    this.collected    = true;
    this._collectAnim = 1;
    this._particles   = [];
    const color = PARTICLE_COLORS[this.type] || '#FFD700';
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const speed = 50 + Math.random() * 60;
      this._particles.push({
        x: this.x + 12, y: this.y + 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
      });
    }
  }

  draw(ctx) {
    if (this.collected && this._collectAnim <= 0) return;

    const bx = Math.round(this.x);
    const by = Math.round(this.y + this._bob);

    // ── Glow halo (pulsing) ────────────────────────────────────────────
    if (!this.collected) {
      const pulse = 0.45 + 0.3 * Math.sin(this._glowTimer * 3.5);
      ctx.save();
      ctx.globalAlpha = pulse;
      const gColor = GLOW_COLORS[this.type] || '#FFD700';
      // Outer soft glow
      const grad = ctx.createRadialGradient(bx + 12, by + 12, 4, bx + 12, by + 12, 20);
      grad.addColorStop(0, gColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(bx - 8, by - 8, 40, 40);
      ctx.restore();
    }

    // ── Collect scale-up animation ─────────────────────────────────────
    ctx.save();
    if (this.collected) {
      ctx.globalAlpha = this._collectAnim;
      const sc = 1 + (1 - this._collectAnim) * 0.6;
      ctx.translate(bx + 12, by + 12);
      ctx.scale(sc, sc);
      ctx.translate(-12, -12);
      this._drawType(ctx, 0, 0);
    } else {
      this._drawType(ctx, bx, by);
    }
    ctx.restore();

    // ── Collect-burst particles ────────────────────────────────────────
    if (this.collected) {
      for (const p of this._particles) {
        if (p.life <= 0) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle   = p.color;
        const ps = 2 + p.life * 2;
        ctx.fillRect(p.x - ps / 2, p.y - ps / 2, ps, ps);
        ctx.restore();
      }
    }
  }

  // ── Per-type pixel-art drawers ────────────────────────────────────────────
  _drawType(ctx, ox, oy) {
    switch (this.type) {
      case 'PHOTO':  this._drawPhoto(ctx, ox, oy);  break;
      case 'BOOK':   this._drawBook(ctx, ox, oy);   break;
      case 'BADGE':  this._drawBadge(ctx, ox, oy);  break;
      case 'NOTE':   this._drawNote(ctx, ox, oy);   break;
      case 'RIBBON': this._drawRibbon(ctx, ox, oy); break;
    }
  }

  // ── PHOTO — polaroid with two people ─────────────────────────────────────
  _drawPhoto(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // White polaroid frame
    f(1, 1, 22, 22, '#1A1A1A');           // shadow/outline
    f(0, 0, 22, 22, '#F8F4EC');           // white frame
    // Inner photo area (sky + ground)
    f(2, 2, 18, 13, '#6EA8CC');           // sky blue
    f(2, 10, 18, 5, '#5A8C40');           // green ground
    // Two person silhouettes
    f(5, 5, 4, 7,  '#2A3A4A');            // person 1 body
    ctx.fillStyle = '#2A3A4A';
    ctx.beginPath(); ctx.arc(ox + 7, oy + 5, 2, 0, Math.PI * 2); ctx.fill();
    f(13, 5, 4, 7, '#3A2A1A');            // person 2 body
    ctx.beginPath(); ctx.arc(ox + 15, oy + 5, 2, 0, Math.PI * 2); ctx.fill();
    // Caption strip (bottom of polaroid)
    f(2, 15, 18, 5, '#F0EAD8');
    // Small heart in caption
    f(9,  17, 2, 1, '#EE4466');
    f(8,  16, 4, 2, '#EE4466');
    f(9,  18, 2, 1, '#EE4466');
    // Gold border strip at top
    f(0, 0, 22, 2, '#D4A830');
  }

  // ── BOOK — open book with spine and text lines ────────────────────────────
  _drawBook(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // Outline
    f(0, 1, 24, 22, '#0A1A3A');
    // Left page
    f(1, 2, 10, 20, '#EEE8D8');
    // Right page
    f(13, 2, 10, 20, '#F4EEE0');
    // Spine (centre)
    f(11, 1, 2, 21, '#8A4A20');
    f(11, 1, 2, 1,  '#C07040');           // spine highlight
    // Left page lines
    f(2,  6, 8, 1, '#AAAAAA');
    f(2,  9, 8, 1, '#AAAAAA');
    f(2, 12, 8, 1, '#AAAAAA');
    f(2, 15, 6, 1, '#AAAAAA');
    f(2, 18, 8, 1, '#AAAAAA');
    // Right page lines
    f(14, 6, 8, 1, '#AAAAAA');
    f(14, 9, 8, 1, '#AAAAAA');
    f(14,12, 8, 1, '#AAAAAA');
    f(14,15, 6, 1, '#AAAAAA');
    f(14,18, 8, 1, '#AAAAAA');
    // Title on right page
    f(14, 4, 8, 1, '#3366CC');
    f(14, 5, 6, 1, '#3366CC');
    // Page curl bottom-right
    f(20, 19, 3, 3, '#E0D8C0');
    f(21, 20, 2, 2, '#F4EEE0');
    // Cover colour peek at top edge
    f(1, 2, 10, 2, '#3060C0');
    f(13,2, 10, 2, '#3060C0');
  }

  // ── BADGE — enamel shield pin ─────────────────────────────────────────────
  _drawBadge(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // Dark outline shield
    ctx.fillStyle = '#2A1A00';
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 23);
    ctx.lineTo(ox + 1,  oy + 14);
    ctx.lineTo(ox + 1,  oy + 2);
    ctx.lineTo(ox + 23, oy + 2);
    ctx.lineTo(ox + 23, oy + 14);
    ctx.closePath();
    ctx.fill();

    // Gold shield body
    ctx.fillStyle = '#C8A020';
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 21);
    ctx.lineTo(ox + 3,  oy + 13);
    ctx.lineTo(ox + 3,  oy + 3);
    ctx.lineTo(ox + 21, oy + 3);
    ctx.lineTo(ox + 21, oy + 13);
    ctx.closePath();
    ctx.fill();

    // Inner shield (darker gold)
    ctx.fillStyle = '#E8C840';
    ctx.beginPath();
    ctx.moveTo(ox + 12, oy + 18);
    ctx.lineTo(ox + 5,  oy + 12);
    ctx.lineTo(ox + 5,  oy + 5);
    ctx.lineTo(ox + 19, oy + 5);
    ctx.lineTo(ox + 19, oy + 12);
    ctx.closePath();
    ctx.fill();

    // Blue centre
    f(7, 6, 10, 8, '#2244AA');
    // Star in centre
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', ox + 12, ox + 13);   // note: intentional ox offset keeps star centred
    // PIN clip at top
    f(10, 1, 4, 2, '#888888');
    f(11, 0, 2, 2, '#BBBBBB');
    // Highlight on gold
    f(4,  4, 3, 2, '#F0D860');
  }

  // ── NOTE — lined page with pencil ────────────────────────────────────────
  _drawNote(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // Paper shadow
    f(2, 2, 18, 21, '#CCCC99');
    // Paper body
    f(1, 1, 17, 20, '#FFFDE8');
    // Left margin red line
    f(4, 1, 1, 20, '#FF9999');
    // Ruled lines
    const lineColor = '#AACCEE';
    for (let i = 0; i < 5; i++) {
      f(5, 4 + i * 3, 12, 1, lineColor);
    }
    // Handwritten squiggles (text illusion)
    f(5,  4, 9, 1, '#3366AA');
    f(5,  7, 11,1, '#3366AA');
    f(5, 10, 7, 1, '#3366AA');
    f(5, 13, 10,1, '#3366AA');
    f(5, 16, 6, 1, '#3366AA');
    // Top hole punch
    f(7, 0, 3, 2, '#DDDDCC');
    f(8, 0, 1, 2, '#AAAAAA');
    // Pencil (right side, leaning)
    f(17, 1,  3, 16, '#F0C820');   // body
    f(17, 1,  3, 2,  '#FFAA44');   // eraser band
    f(17, 0,  3, 1,  '#FFCCAA');   // eraser tip
    f(18, 17, 1, 3,  '#F0D870');   // pencil tip taper
    f(18, 20, 1, 1,  '#202020');   // graphite tip
    // Eraser metal band
    f(17, 3,  3, 1,  '#888888');
    // Wood grain on pencil
    f(17, 6,  3, 1, '#D4B010');
    f(17,11,  3, 1, '#D4B010');
  }

  // ── RIBBON — graduation ribbon with tails ─────────────────────────────────
  _drawRibbon(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // Left wing of ribbon bow
    ctx.fillStyle = '#CC2255';
    ctx.beginPath();
    ctx.moveTo(ox + 11, oy + 10);
    ctx.bezierCurveTo(ox + 1, oy + 1,  ox + 1, oy + 18, ox + 11, oy + 10);
    ctx.fill();
    // Left wing highlight
    ctx.fillStyle = '#EE4477';
    ctx.beginPath();
    ctx.moveTo(ox + 11, oy + 10);
    ctx.bezierCurveTo(ox + 3, oy + 3,  ox + 3, oy + 9, ox + 11, oy + 10);
    ctx.fill();

    // Right wing
    ctx.fillStyle = '#CC2255';
    ctx.beginPath();
    ctx.moveTo(ox + 13, oy + 10);
    ctx.bezierCurveTo(ox + 23, oy + 1,  ox + 23, oy + 18, ox + 13, oy + 10);
    ctx.fill();
    // Right wing highlight
    ctx.fillStyle = '#EE4477';
    ctx.beginPath();
    ctx.moveTo(ox + 13, oy + 10);
    ctx.bezierCurveTo(ox + 21, oy + 3,  ox + 21, oy + 9, ox + 13, oy + 10);
    ctx.fill();

    // Tails hanging down
    ctx.fillStyle = '#AA1840';
    // Left tail
    ctx.beginPath();
    ctx.moveTo(ox + 9, oy + 11);
    ctx.lineTo(ox + 6, oy + 23); ctx.lineTo(ox + 10, oy + 23);
    ctx.closePath(); ctx.fill();
    // Right tail
    ctx.beginPath();
    ctx.moveTo(ox + 15, oy + 11);
    ctx.lineTo(ox + 18, oy + 23); ctx.lineTo(ox + 14, oy + 23);
    ctx.closePath(); ctx.fill();
    // Tail notch (V cut)
    ctx.fillStyle = '#880020';
    f(7, 21, 3, 2, '#880020');
    f(14,21, 3, 2, '#880020');

    // Gold centre circle
    ctx.fillStyle = '#2A2A2A';
    ctx.beginPath(); ctx.arc(ox + 12, oy + 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath(); ctx.arc(ox + 12, oy + 10, 4, 0, Math.PI * 2); ctx.fill();
    // Star on centre
    ctx.fillStyle = '#AA6600';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('★', ox + 12, oy + 13);
    // Centre highlight
    ctx.fillStyle = '#FFE860';
    ctx.beginPath(); ctx.arc(ox + 10, oy + 8, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  get rect() {
    return { x: this.x + 2, y: this.y + this._bob, w: 20, h: 20 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  HeartItem — collectible that restores +1 life (max 5)
//  Drawn as a large pulsing pixel-art heart on a 24×24 grid.
// ─────────────────────────────────────────────────────────────────────────────
export class HeartItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 24;
    this.h = 24;
    this.collected    = false;
    this._bob         = 0;
    this._bobTimer    = 0;
    this._glowTimer   = 0;
    this._collectAnim = 0;
    this._particles   = [];
  }

  update(dt) {
    if (this.collected) {
      if (this._collectAnim > 0) {
        this._collectAnim -= dt * 2.2;
        for (const p of this._particles) {
          p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 1.6;
        }
      }
      return;
    }
    this._bobTimer  += dt;
    this._glowTimer += dt;
    this._bob = Math.sin(this._bobTimer * 2.8) * 5;
  }

  collect() {
    this.collected    = true;
    this._collectAnim = 1;
    this._particles   = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const s = 45 + Math.random() * 55;
      this._particles.push({ x: this.x + 12, y: this.y + 12, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1 });
    }
  }

  draw(ctx) {
    if (this.collected && this._collectAnim <= 0) return;

    const bx = Math.round(this.x);
    const by = Math.round(this.y + this._bob);

    // Pulsing glow ring
    if (!this.collected) {
      const pulse = 0.4 + 0.3 * Math.sin(this._glowTimer * 3.8);
      ctx.save();
      ctx.globalAlpha = pulse;
      const gr = ctx.createRadialGradient(bx + 12, by + 12, 3, bx + 12, by + 12, 22);
      gr.addColorStop(0, '#FF4466'); gr.addColorStop(1, 'rgba(255,0,0,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(bx - 10, by - 10, 44, 44);
      ctx.restore();
    }

    ctx.save();
    if (this.collected) {
      ctx.globalAlpha = this._collectAnim;
      const sc = 1 + (1 - this._collectAnim) * 0.7;
      ctx.translate(bx + 12, by + 12);
      ctx.scale(sc, sc);
      ctx.translate(-12, -12);
      this._drawHeart(ctx, 0, 0);
    } else {
      this._drawHeart(ctx, bx, by);
    }
    ctx.restore();

    // Collect particles
    for (const p of this._particles) {
      if (p.life <= 0) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.life > 0.5 ? '#FF4466' : '#FFD700';
      const ps = 2 + p.life * 3;
      ctx.fillRect(p.x - ps / 2, p.y - ps / 2, ps, ps);
      ctx.restore();
    }
  }

  _drawHeart(ctx, ox, oy) {
    const f = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(ox + x, oy + y, w, h); };

    // Pixel-grid heart (24×24, each px = 1)
    // Outline
    f(3, 1, 4, 1, '#880022'); f(9, 0, 6, 1, '#880022'); f(15, 0, 2, 1, '#880022');
    f(17, 1, 4, 1, '#880022'); f(1, 3, 2, 1, '#880022'); f(21, 3, 2, 1, '#880022');
    f(0, 5, 1, 8, '#880022'); f(23, 5, 1, 8, '#880022');
    f(1, 13, 2, 3, '#880022'); f(21, 13, 2, 3, '#880022');
    f(3, 16, 2, 2, '#880022'); f(19, 16, 2, 2, '#880022');
    f(5, 18, 2, 2, '#880022'); f(17, 18, 2, 2, '#880022');
    f(7, 20, 2, 2, '#880022'); f(15, 20, 2, 2, '#880022');
    f(9, 22, 2, 1, '#880022'); f(13, 22, 2, 1, '#880022');
    f(11, 23, 2, 1, '#880022');

    // Main body — red
    f(3, 2, 4, 1, '#EE2244'); f(9, 1, 6, 1, '#EE2244'); f(15, 1, 2, 1, '#EE2244');
    f(17, 2, 4, 1, '#EE2244');
    f(1, 4, 2, 1, '#EE2244'); f(21, 4, 2, 1, '#EE2244');
    f(1, 5, 22, 8, '#EE2244');   // wide middle band
    f(1, 13, 22, 1, '#EE2244');
    f(2, 14, 20, 2, '#EE2244');
    f(3, 16, 18, 2, '#EE2244');
    f(5, 18, 14, 2, '#EE2244');
    f(7, 20, 10, 2, '#EE2244');
    f(9, 22, 6,  1, '#EE2244');
    f(10, 23, 4, 1, '#EE2244');

    // Bright highlight (top-left of each lobe)
    f(4, 3, 3, 2, '#FF88AA'); f(10, 2, 3, 2, '#FF88AA');
    f(2, 6, 4, 3, '#FF6688');

    // Shine pixel
    f(3, 3, 2, 1, '#FFBBCC'); f(10, 2, 2, 1, '#FFBBCC');

    // Small inner darker shade (gives depth)
    f(8,  9, 4, 4, '#CC1133');
    f(12, 9, 4, 4, '#CC1133');
  }

  get rect() {
    return { x: this.x + 2, y: this.y + this._bob, w: 20, h: 20 };
  }
}
