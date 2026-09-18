/**
 * Platform — AABB-based solid tiles and one-way platforms.
 * Handles solid collision resolution for the player.
 */

export class Platform {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {'solid'|'oneway'|'death'} type
   * @param {string} [color]  — for debug / procedural rendering
   * @param {string} [tag]    — 'grass', 'dirt', 'stone', 'wood', 'school', etc.
   */
  constructor(x, y, w, h, type = 'solid', color = '#5a7a3a', tag = 'grass') {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.type  = type;   // 'solid' | 'oneway' | 'death'
    this.color = color;
    this.tag   = tag;
  }

  get rect() { return { x: this.x, y: this.y, w: this.w, h: this.h }; }
}

/** AABB overlap test */
export function rectsOverlap(a, b) {
  return a.x < b.x + b.w &&
         a.x + a.w > b.x &&
         a.y < b.y + b.h &&
         a.y + a.h > b.y;
}

/**
 * Resolve player against a list of platforms.
 * Mutates player.x, player.y, player.vx, player.vy, player.onGround.
 */
export function resolvePlatforms(player, platforms) {
  // Reset ground flag before resolution
  player.onGround = false;

  // Step X first, then Y — prevents corner sticking
  player.x += player.vx / 60;

  for (const plat of platforms) {
    if (!rectsOverlap(player.rect, plat.rect)) continue;
    if (plat.type === 'death') { player.die(); continue; }
    if (plat.type === 'oneway') continue; // handled in Y pass

    // Resolve X overlap
    const overlapLeft  = (player.x + player.w) - plat.x;
    const overlapRight = (plat.x + plat.w)     - player.x;
    if (overlapLeft < overlapRight) {
      player.x -= overlapLeft;
    } else {
      player.x += overlapRight;
    }
    player.vx = 0;
  }

  player.y += player.vy / 60;

  for (const plat of platforms) {
    if (!rectsOverlap(player.rect, plat.rect)) continue;
    if (plat.type === 'death') { player.die(); continue; }

    const overlapTop    = (player.y + player.h) - plat.y;
    const overlapBottom = (plat.y + plat.h)     - player.y;

    if (plat.type === 'oneway') {
      // Only collide from above when player falls onto it
      if (player.vy >= 0 && overlapTop < overlapBottom && overlapTop < 16) {
        player.y -= overlapTop;
        player.land();
      }
      continue;
    }

    // Solid
    if (overlapTop < overlapBottom) {
      // Landing on top
      player.y -= overlapTop;
      player.land();
    } else {
      // Hitting underside
      player.y += overlapBottom;
      player.vy = Math.max(0, player.vy);
    }
  }
}

// ── Pixel-art tile renderer ─────────────────────────────────────────

const TILE = 32; // pixels per tile

/**
 * Draw a single platform using procedural pixel art.
 * Matches the section theme based on platform.tag.
 */
export function drawPlatform(ctx, plat, camX, camY) {
  const sx = plat.x - camX;
  const sy = plat.y - camY;

  ctx.save();

  switch (plat.tag) {
    case 'grass':   _drawGrassTile(ctx, sx, sy, plat.w, plat.h); break;
    case 'dirt':    _drawDirtTile(ctx, sx, sy, plat.w, plat.h);  break;
    case 'stone':   _drawStoneTile(ctx, sx, sy, plat.w, plat.h); break;
    case 'wood':    _drawWoodTile(ctx, sx, sy, plat.w, plat.h);  break;
    case 'road':    _drawRoadTile(ctx, sx, sy, plat.w, plat.h);  break;
    case 'school':  _drawSchoolTile(ctx, sx, sy, plat.w, plat.h);break;
    case 'water':   _drawWaterTile(ctx, sx, sy, plat.w, plat.h); break;
    case 'invis':   break; // invisible collision only
    default:        _drawGrassTile(ctx, sx, sy, plat.w, plat.h); break;
  }

  ctx.restore();
}

// --- Tile drawing helpers ---

function _drawGrassTile(ctx, x, y, w, h) {
  // Soil body
  ctx.fillStyle = '#8B6340';
  ctx.fillRect(x, y + 6, w, h - 6);
  // Grass top strip
  ctx.fillStyle = '#5A8C3A';
  ctx.fillRect(x, y, w, 8);
  // Bright grass top edge
  ctx.fillStyle = '#7EC850';
  ctx.fillRect(x, y, w, 3);
  // Pixel grass tufts
  ctx.fillStyle = '#7EC850';
  for (let tx = x + 4; tx < x + w - 4; tx += 8) {
    ctx.fillRect(tx, y - 2, 2, 3);
    ctx.fillRect(tx + 3, y - 1, 1, 2);
  }
  // Soil texture lines
  ctx.fillStyle = '#7A5430';
  for (let ty = y + 14; ty < y + h; ty += 8) {
    for (let tx = x + 4; tx < x + w; tx += 12) {
      ctx.fillRect(tx, ty, 4, 1);
    }
  }
}

function _drawDirtTile(ctx, x, y, w, h) {
  ctx.fillStyle = '#9B7550';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#7A5A30';
  for (let ty = y + 4; ty < y + h; ty += 7) {
    for (let tx = x + 3; tx < x + w; tx += 10) {
      ctx.fillRect(tx, ty, 5, 2);
    }
  }
  ctx.fillStyle = '#B8926A';
  ctx.fillRect(x, y, w, 2);
}

function _drawStoneTile(ctx, x, y, w, h) {
  ctx.fillStyle = '#7A8A96';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#909EAA';
  ctx.fillRect(x, y, w, 3);
  ctx.fillStyle = '#5A6872';
  const blockW = 32, blockH = 16;
  for (let ty = y; ty < y + h; ty += blockH) {
    const offset = ((ty - y) / blockH % 2 === 0) ? 0 : blockW / 2;
    for (let tx = x - offset; tx < x + w; tx += blockW) {
      ctx.fillRect(Math.max(tx, x), ty, 1, blockH);
    }
    ctx.fillRect(x, ty, w, 1);
  }
}

function _drawWoodTile(ctx, x, y, w, h) {
  ctx.fillStyle = '#A06030';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#8A5020';
  for (let tx = x + 4; tx < x + w; tx += 6) {
    ctx.fillRect(tx, y, 1, h);
  }
  ctx.fillStyle = '#C08040';
  ctx.fillRect(x, y, w, 2);
  // Nails
  ctx.fillStyle = '#505050';
  ctx.fillRect(x + 8, y + h / 2 - 1, 2, 2);
  ctx.fillRect(x + w - 10, y + h / 2 - 1, 2, 2);
}

function _drawRoadTile(ctx, x, y, w, h) {
  ctx.fillStyle = '#505060';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#606070';
  ctx.fillRect(x, y, w, 2);
  ctx.fillStyle = '#404050';
  for (let tx = x; tx < x + w; tx += 20) {
    ctx.fillRect(tx, y + h / 2 - 1, 10, 2);
  }
  // Kerbstone edge
  ctx.fillStyle = '#888898';
  ctx.fillRect(x, y, w, 5);
}

function _drawSchoolTile(ctx, x, y, w, h) {
  // Concrete / tiles
  ctx.fillStyle = '#C8C0A8';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#B8B098';
  const tileW = 24, tileH = 24;
  for (let ty = y; ty < y + h; ty += tileH) {
    for (let tx = x; tx < x + w; tx += tileW) {
      ctx.fillRect(tx, ty, tileW, 1);
      ctx.fillRect(tx, ty, 1, tileH);
    }
  }
  ctx.fillStyle = '#D8D0B8';
  ctx.fillRect(x, y, w, 2);
}

function _drawWaterTile(ctx, x, y, w, h) {
  ctx.fillStyle = '#2A6AAA';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#4A8ACC';
  for (let tx = x; tx < x + w; tx += 16) {
    ctx.fillRect(tx, y + 4, 8, 2);
    ctx.fillRect(tx + 8, y + 10, 8, 2);
  }
}
