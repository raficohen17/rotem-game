/**
 * Pointer input, normalised into design coordinates.
 *
 * Single pointer only. A second finger is ignored rather than tracked, which
 * for a young child is the right call — resting a palm on the screen should
 * not throw the sofa across the room.
 */

/** A drag shorter than this in design pixels counts as a tap, not a move. */
export const TAP_SLOP = 12;

export class Input {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {import('./view.js').View} view
   * @param {() => object|null} getScene current scene, polled per event
   */
  constructor(canvas, view, getScene) {
    this.canvas = canvas;
    this.view = view;
    this.getScene = getScene;
    this.activeId = null;
    this.start = { x: 0, y: 0 };
    this.moved = false;

    canvas.addEventListener('pointerdown', (e) => this._down(e));
    canvas.addEventListener('pointermove', (e) => this._move(e));
    canvas.addEventListener('pointerup', (e) => this._up(e));
    canvas.addEventListener('pointercancel', (e) => this._up(e));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _dispatch(name, x, y) {
    const scene = this.getScene();
    const handler = scene && scene[name];
    if (handler) handler.call(scene, x, y);
  }

  _down(e) {
    if (this.activeId !== null) return; // already tracking a finger
    this.activeId = e.pointerId;
    this.canvas.setPointerCapture(e.pointerId);

    const p = this.view.toDesign(e.clientX, e.clientY);
    this.start = p;
    this.moved = false;
    this._dispatch('onPointerDown', p.x, p.y);
  }

  _move(e) {
    if (e.pointerId !== this.activeId) return;
    const p = this.view.toDesign(e.clientX, e.clientY);

    if (!this.moved && Math.hypot(p.x - this.start.x, p.y - this.start.y) > TAP_SLOP) {
      this.moved = true;
    }
    this._dispatch('onPointerMove', p.x, p.y);
  }

  _up(e) {
    if (e.pointerId !== this.activeId) return;
    this.activeId = null;

    const p = this.view.toDesign(e.clientX, e.clientY);
    this._dispatch('onPointerUp', p.x, p.y);
    if (!this.moved) this._dispatch('onTap', p.x, p.y);
  }
}
