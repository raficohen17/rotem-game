/**
 * Fixed design space with letterbox scaling.
 *
 * Everything in the game is authored in a 1280x720 coordinate system and
 * stretched to whatever screen it lands on. That means no responsive layout
 * logic anywhere else in the codebase, and a house Rotem builds on a phone
 * looks identical on a laptop.
 */

export const DESIGN_W = 1280;
export const DESIGN_H = 720;

export class View {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
  }

  resize() {
    // Capped at 2 — a Pixel reports ~2.6, and the extra pixels cost fill rate
    // for no visible gain on flat vector art.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;

    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;

    this.cssScale = Math.min(cssW / DESIGN_W, cssH / DESIGN_H);
    this.cssOffsetX = (cssW - DESIGN_W * this.cssScale) / 2;
    this.cssOffsetY = (cssH - DESIGN_H * this.cssScale) / 2;

    this.scale = this.cssScale * dpr;
    this.offsetX = this.cssOffsetX * dpr;
    this.offsetY = this.cssOffsetY * dpr;
  }

  /** Clears the frame and puts the context into design coordinates. */
  begin() {
    const { ctx } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1a161c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(this.scale, 0, 0, this.scale, this.offsetX, this.offsetY);
    ctx.imageSmoothingQuality = 'high';
  }

  /**
   * Maps a pointer position from CSS pixels into design coordinates.
   * @returns {{x: number, y: number}}
   */
  toDesign(clientX, clientY) {
    return {
      x: (clientX - this.cssOffsetX) / this.cssScale,
      y: (clientY - this.cssOffsetY) / this.cssScale,
    };
  }
}
