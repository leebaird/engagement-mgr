'use client';

import { useEffect } from 'react';

let fromTab = false;

export function focusCameFromTab() {
  return fromTab;
}

function openPicker(target: EventTarget | null) {
  if (target instanceof HTMLSelectElement) {
    if (target.disabled) return;
    try {
      target.showPicker();
    } catch {
      // showPicker throws when a picker is already open or the browser rejects it.
    }
    return;
  }

  if (
    target instanceof HTMLInputElement
    && target.list
    && !target.disabled
    && !target.readOnly
  ) {
    try {
      target.showPicker();
    } catch {
      // showPicker throws when a picker is already open or the browser rejects it.
    }
  }
}

export function OpenDropdownOnTab() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      fromTab = event.key === 'Tab';
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Tab') fromTab = false;
    };

    const onPointerDown = () => {
      fromTab = false;
    };

    const onFocusIn = (event: FocusEvent) => {
      const openedByTab = fromTab;
      if (!openedByTab) return;
      openPicker(event.target);
    };

    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('keydown', onKeyDown, true);
      document.removeEventListener('keyup', onKeyUp, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('focusin', onFocusIn);
      fromTab = false;
    };
  }, []);

  return null;
}
