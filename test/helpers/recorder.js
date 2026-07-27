/**
 * A canvas that records where everything lands, so a test can ask whether a
 * scene actually fits on the screen.
 *
 * Assertions about constants only catch what a test author thought to name.
 * Two real bugs got past that: a drawer tab positioned 88px past the right
 * edge, and a walk hint at y=726 on a 720-tall canvas. Neither was visible in
 * a screenshot either — the pixels were never on the canvas to be seen. This
 * runs the scene's own draw() and measures the result.
 *
 * `clip()` is modelled, and has to be: the room draws a 1200x520 room into a
 * 516px cell and relies on the clip to cut it down, and patterns are drawn
 * past the edge of a book cover on purpose. Without clipping the harness
 * reports overflow that never appears on screen.
 */

export const SCREEN = { w: 1280, h: 720 };

/** The design pixel on a Pixel held sideways, matching test/phone.test.js. */
export const PHONE = Math.min(915 / SCREEN.w, 412 / SCREEN.h);
export const onScreen = (n) => n * PHONE;
export const MIN_TEXT = 11;

const NO_CLIP = { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity };

export function recordingContext() {
  let m = [1, 0, 0, 1, 0, 0];
  let clip = NO_CLIP;
  const stack = [];

  const ops = [];
  const texts = [];
  let op = null;

  const mul = (n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const apply = (x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];

  /** The path being built, in device space, before any clip is applied. */
  let path = null;
  const resetPath = () => { path = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }; };
  resetPath();

  const trace = (x, y) => {
    const [px, py] = apply(x, y);
    path.minX = Math.min(path.minX, px);
    path.maxX = Math.max(path.maxX, px);
    path.minY = Math.min(path.minY, py);
    path.maxY = Math.max(path.maxY, py);
  };

  /** Records what is actually visible: the path, cut down by the clip. */
  function commit(kind) {
    if (path.minX > path.maxX) return;
    const box = {
      kind,
      label: op,
      minX: Math.max(path.minX, clip.minX),
      minY: Math.max(path.minY, clip.minY),
      maxX: Math.min(path.maxX, clip.maxX),
      maxY: Math.min(path.maxY, clip.maxY),
    };
    // Entirely outside the clip means nothing was drawn at all.
    if (box.minX > box.maxX || box.minY > box.maxY) return;
    ops.push(box);
  }

  /** Marks a rectangle and commits it in one go, for fillRect and friends. */
  const rectOp = (kind, x, y, w, h) => {
    resetPath();
    trace(x, y); trace(x + w, y); trace(x, y + h); trace(x + w, y + h);
    commit(kind);
    resetPath();
  };

  const sweep = (cx, cy, rx, ry, from, to, rotation = 0) => {
    const steps = 24;
    for (let i = 0; i <= steps; i += 1) {
      const a = from + ((to - from) * i) / steps;
      const px = Math.cos(a) * rx;
      const py = Math.sin(a) * ry;
      trace(cx + px * Math.cos(rotation) - py * Math.sin(rotation),
        cy + px * Math.sin(rotation) + py * Math.cos(rotation));
    }
  };

  const gradient = () => ({ addColorStop() {} });

  let font = '16px sans-serif';
  const ctx = {
    set font(value) { font = String(value); },
    get font() { return font; },

    fillStyle: '', strokeStyle: '', lineWidth: 1, lineCap: '', lineJoin: '',
    miterLimit: 10, globalAlpha: 1, textAlign: 'left', textBaseline: 'alphabetic',
    shadowColor: '', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0,
    imageSmoothingQuality: 'low', globalCompositeOperation: 'source-over',

    save() { stack.push({ m: [...m], clip }); },
    restore() {
      const was = stack.pop();
      if (was) { m = was.m; clip = was.clip; }
    },

    translate(x, y) { m = mul([1, 0, 0, 1, x, y]); },
    scale(x, y) { m = mul([x, 0, 0, y, 0, 0]); },
    rotate(a) { m = mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    transform(a, b, c, d, e, f) { m = mul([a, b, c, d, e, f]); },
    setTransform(a, b, c, d, e, f) { m = [a, b, c, d, e, f]; },
    resetTransform() { m = [1, 0, 0, 1, 0, 0]; },

    beginPath() { resetPath(); },
    closePath() {},
    moveTo: trace,
    lineTo: trace,
    rect(x, y, w, h) { trace(x, y); trace(x + w, y); trace(x, y + h); trace(x + w, y + h); },
    roundRect(x, y, w, h) { ctx.rect(x, y, w, h); },
    quadraticCurveTo(cx, cy, x, y) { trace(cx, cy); trace(x, y); },
    bezierCurveTo(c1x, c1y, c2x, c2y, x, y) {
      trace(c1x, c1y); trace(c2x, c2y); trace(x, y);
    },
    arcTo(x1, y1, x2, y2) { trace(x1, y1); trace(x2, y2); },
    arc(x, y, r, from = 0, to = Math.PI * 2) { sweep(x, y, r, r, from, to); },
    ellipse(x, y, rx, ry, rotation = 0, from = 0, to = Math.PI * 2) {
      sweep(x, y, rx, ry, from, to, rotation);
    },

    fill() { commit('fill'); },
    stroke() { commit('stroke'); },
    clip() {
      clip = {
        minX: Math.max(clip.minX, path.minX),
        minY: Math.max(clip.minY, path.minY),
        maxX: Math.min(clip.maxX, path.maxX),
        maxY: Math.min(clip.maxY, path.maxY),
      };
    },

    fillRect(x, y, w, h) { rectOp('fillRect', x, y, w, h); },
    strokeRect(x, y, w, h) { rectOp('strokeRect', x, y, w, h); },
    clearRect() {},
    setLineDash() {},
    getLineDash() { return []; },

    createLinearGradient: gradient,
    createRadialGradient: gradient,
    createPattern: () => null,

    drawImage(image, x = 0, y = 0, w = 0, h = 0) { rectOp('drawImage', x, y, w, h); },

    measureText(text) { return { width: text.length * fontSize() * 0.5 }; },

    fillText(text, x, y) { writeText(text, x, y, 'fillText'); },
    strokeText(text, x, y) { writeText(text, x, y, 'strokeText'); },
  };

  function fontSize() {
    return Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1] ?? 16);
  }

  function writeText(text, x, y, kind) {
    const size = fontSize();
    const string = String(text);
    // Estimated wide on purpose; the point is to catch text leaving the screen.
    const width = string.length * size * 0.6;
    const left = ctx.textAlign === 'center' ? x - width / 2
      : ctx.textAlign === 'right' ? x - width : x;

    // The drawn height of the glyphs, which is what has to scale to be read.
    const scaleY = Math.hypot(m[2], m[3]);
    texts.push({ text: string, size, drawn: size * scaleY, label: op });

    resetPath();
    trace(left, y - size * 0.8);
    trace(left + width, y + size * 0.3);
    commit(kind);
    resetPath();
  }

  return {
    ctx,
    ops,
    texts,
    /** Names the ops that follow, so a failure can say what drew them. */
    label(name) { op = name; },
    bounds() {
      return ops.reduce((acc, o) => ({
        minX: Math.min(acc.minX, o.minX), minY: Math.min(acc.minY, o.minY),
        maxX: Math.max(acc.maxX, o.maxX), maxY: Math.max(acc.maxY, o.maxY),
      }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    },
    /** Everything that fell outside the design space, worst first. */
    offScreen(margin = 0.5) {
      return ops
        .map((o) => ({
          ...o,
          over: Math.max(
            -o.minX - margin, -o.minY - margin,
            o.maxX - SCREEN.w - margin, o.maxY - SCREEN.h - margin,
          ),
        }))
        .filter((o) => o.over > 0)
        .sort((a, b) => b.over - a.over);
    },
  };
}
