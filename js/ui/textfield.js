/**
 * The one text field in the game.
 *
 * Typing raises the phone's own keyboard rather than a keyboard drawn in
 * canvas — she already knows that one, and it comes with its own autocorrect
 * and its own delete key.
 *
 * The input used to be parked at `left: -9999px` and the field under it drawn
 * in canvas, which worked in the sense that characters arrived. What it had no
 * way to do was show a caret, offer a selection, or let her paste — and with
 * nothing really on screen, nothing stopped the keyboard from coming up over
 * the field she was typing into. So the input is put where the field is drawn
 * and made visible, and the game draws around it instead of under it.
 */

import { COLORS } from './widgets.js';

/**
 * Below this the browser zooms the page when the field takes focus, which
 * leaves the game scrolled sideways with no way back. It is a CSS-pixel
 * threshold, so it is applied after the view's scale rather than before.
 */
const MIN_FONT_PX = 16;

/** How far the field is kept clear of the keyboard's top edge. */
const KEYBOARD_GAP = 8;

/**
 * A text field over the canvas.
 *
 * @param {import('../core/view.js').View} view supplies the design-space to
 *   CSS mapping, so callers work in the same coordinates they draw in.
 * @param {{x: number, y: number, w: number, h: number}} rect in design space.
 * @param {{
 *   value?: string,
 *   maxLength?: number,
 *   filter?: (raw: string) => string,
 *   keyboard?: 'text'|'code',
 *   align?: 'left'|'center',
 *   label?: string,
 *   onChange?: (value: string) => void,
 *   onCommit?: (value: string) => void,
 * }} [opts]
 */
export function openTextField(view, rect, opts = {}) {
  const {
    value = '', maxLength = 40, filter = (raw) => raw, keyboard = 'text',
    align = 'left', label = '', placeholder = '',
    onChange = () => {}, onCommit = () => {},
  } = opts;

  const input = document.createElement('input');
  input.type = 'text';
  input.value = value;
  input.maxLength = maxLength;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', label);

  if (keyboard === 'code') {
    // A code is six letters and nothing else: no capitals to undo, no
    // suggestion bar offering a word she did not mean, no spellcheck underline.
    input.autocapitalize = 'none';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('autocorrect', 'off');
  } else {
    input.autocapitalize = 'words';
  }

  Object.assign(input.style, {
    position: 'fixed',
    margin: '0',
    border: `2px solid ${COLORS.panelEdge}`,
    outline: 'none',
    background: COLORS.button,
    color: COLORS.ink,
    textAlign: align,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
    transition: 'transform 90ms ease-out',
    zIndex: '10',
  });

  /**
   * Where the field sits, in CSS pixels.
   *
   * Kept as a function rather than computed once because the view changes on
   * every resize and rotate, and a field left at its old place lands somewhere
   * in the letterbox.
   */
  let lift = 0;

  function place() {
    const { cssScale, cssOffsetX, cssOffsetY } = view;
    const w = rect.w * cssScale;
    const h = rect.h * cssScale;
    const left = rect.x * cssScale + cssOffsetX;
    const top = rect.y * cssScale + cssOffsetY - lift;

    Object.assign(input.style, {
      left: `${Math.round(left)}px`,
      top: `${Math.round(top)}px`,
      width: `${Math.round(w)}px`,
      height: `${Math.round(h)}px`,
      borderRadius: `${Math.round(Math.min(12, h * 0.28))}px`,
      padding: `0 ${Math.round(Math.max(6, w * 0.04))}px`,
      fontSize: `${Math.max(MIN_FONT_PX, Math.round(h * 0.52))}px`,
      letterSpacing: keyboard === 'code' ? `${Math.round(h * 0.12)}px` : 'normal',
    });
  }

  /**
   * Lifts the field clear of the keyboard.
   *
   * `visualViewport` shrinks when the keyboard opens, so the bottom of what is
   * actually visible is `offsetTop + height`. Anything below that is behind the
   * keyboard. Where the browser does not report a visual viewport there is
   * nothing to compute from, and the field stays where it was drawn — which is
   * the behaviour the game had before and no worse.
   */
  function avoidKeyboard() {
    const vv = globalThis.window?.visualViewport;
    if (!vv) return;

    lift = 0;
    place();
    const bottom = input.getBoundingClientRect().bottom;
    const visibleBottom = vv.offsetTop + vv.height;
    if (bottom > visibleBottom - KEYBOARD_GAP) {
      lift = bottom - (visibleBottom - KEYBOARD_GAP);
      place();
    }
  }

  const reflow = () => { avoidKeyboard(); };

  input.addEventListener('input', () => {
    const clean = filter(input.value).slice(0, maxLength);
    if (clean !== input.value) input.value = clean;
    onChange(clean);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') input.blur();
  });

  input.addEventListener('focus', reflow);
  input.addEventListener('blur', () => { onCommit(filter(input.value)); });

  // Guarded, because the model and scene tests run these files under node with
  // a stub document and no window at all.
  const win = globalThis.window;
  win?.addEventListener('resize', reflow);
  win?.visualViewport?.addEventListener('resize', reflow);
  win?.visualViewport?.addEventListener('scroll', reflow);

  place();
  document.body.appendChild(input);

  return {
    /** The element, so a test or a caller can look at what is really there. */
    element: input,

    focus() {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      avoidKeyboard();
    },

    blur() { input.blur(); },

    value() { return filter(input.value); },

    /** Reapplies the position, for a scene that has moved its field. */
    reflow,

    /**
     * The whole response to a wrong code.
     *
     * Play cannot fail in this game, so there is no message, no count and no
     * lockout — the field wobbles, keeps what she typed, and waits.
     */
    shake() {
      input.animate?.(
        [
          { transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
          { transform: 'translateX(6px)' }, { transform: 'translateX(-4px)' },
          { transform: 'translateX(0)' },
        ],
        { duration: 260, easing: 'ease-in-out' },
      );
    },

    close() {
      win?.removeEventListener('resize', reflow);
      win?.visualViewport?.removeEventListener('resize', reflow);
      win?.visualViewport?.removeEventListener('scroll', reflow);
      input.blur();
      input.remove();
    },
  };
}
