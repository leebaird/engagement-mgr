'use client';

import { useEffect } from 'react';

export function ModalCleanup() {
  useEffect(() => {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  }, []);

  return null;
}