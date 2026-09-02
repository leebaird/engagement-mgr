import type { FocusEvent } from 'react';

function placeCursorAtStart(el: HTMLInputElement | HTMLTextAreaElement) {
  if (typeof el.setSelectionRange !== 'function') return;
  try {
    el.setSelectionRange(0, 0);
  } catch {
    // Some input types (e.g. date) may not support selection in all browsers.
  }
}

function collapseIfFullySelected(el: HTMLInputElement | HTMLTextAreaElement) {
  if (el.value.length === 0) return;
  try {
    if (el.selectionStart === 0 && el.selectionEnd === el.value.length) {
      el.setSelectionRange(0, 0);
    }
  } catch {
    // ignore
  }
}

/** Run after the browser's default focus/select-all so the caret stays at position 0. */
function scheduleCursorAtStart(el: HTMLInputElement | HTMLTextAreaElement) {
  const run = () => {
    collapseIfFullySelected(el);
    placeCursorAtStart(el);
  };
  requestAnimationFrame(run);
  for (const ms of [0, 10, 50]) {
    setTimeout(run, ms);
  }
}

/** Place cursor at the start of a text-like input when tabbing into edit modal fields. */
export function handleEditFieldFocus(
  e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
) {
  const el = e.currentTarget;
  if (el.type === 'checkbox' || el.type === 'radio') return;

  el.addEventListener('select', () => collapseIfFullySelected(el), { once: true });
  scheduleCursorAtStart(el);
}

export function focusEditFieldAtStart(
  el: HTMLInputElement | HTMLTextAreaElement | null
) {
  if (!el) return;
  requestAnimationFrame(() => {
    el.focus();
    scheduleCursorAtStart(el);
  });
}

const CLIENT_FOCUS_RING = '0 0 0 3px var(--accent-ring)';

export function handleClientEditFieldFocus(
  e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
) {
  handleEditFieldFocus(e);
  e.currentTarget.style.boxShadow = CLIENT_FOCUS_RING;
}

export function handleClientEditFieldBlur(
  e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>
) {
  e.currentTarget.style.boxShadow = 'none';
}

/** Avoid type="email" select-all-on-focus; keeps email keyboard on mobile. */
export const editEmailInputProps = {
  type: 'text' as const,
  inputMode: 'email' as const,
  autoComplete: 'email' as const,
};
