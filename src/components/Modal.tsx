'use client';

import React, { useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose?: () => void;
  closeHref?: string;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  hideHeaderActions?: boolean;
  maxWidth?: string;
  zIndex?: number;
  headerActions?: React.ReactNode;
  alignTop?: boolean;
}

export function Modal({
  isOpen,
  onClose,
  closeHref,
  title,
  children,
  onEdit,
  onDelete,
  hideHeaderActions,
  maxWidth,
  zIndex = 1000,
  headerActions,
  alignTop = false,
}: ModalProps) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    queueMicrotask(() => {
      setPortalRoot(document.getElementById('modal-root') ?? document.body);
    });
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (closeHref) {
          window.location.assign(closeHref);
        } else {
          onClose?.();
        }
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose, closeHref]);

  if (!isOpen) return null;

  const handleBackdropClose = () => {
    onClose?.();
  };

  const content = (
    <>
      <div
        className="modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          margin: 0,
          backgroundColor: '#0f1115',
          display: 'flex',
          alignItems: alignTop ? 'flex-start' : 'center',
          justifyContent: 'center',
          boxSizing: 'border-box',
          zIndex,
          padding: maxWidth ? '0.5rem' : '1rem',
          overflow: 'auto',
        }}
      >
        {closeHref ? (
          <a
            href={closeHref}
            aria-label="Close dialog"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
        ) : (
          <button
            type="button"
            aria-label="Close dialog"
            onClick={handleBackdropClose}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              border: 'none',
              padding: 0,
              margin: 0,
              background: 'transparent',
              cursor: 'default',
            }}
          />
        )}
        <div
          className="glass-panel modal-panel"
          style={{
            width: `min(100%, ${maxWidth || '775px'})`,
            maxWidth: maxWidth || '775px',
            margin: '0 auto',
            padding: '2rem',
            position: 'relative',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            boxSizing: 'border-box',
            flex: '0 0 auto',
            zIndex: 1,
          }}
          onMouseDown={e => e.stopPropagation()}
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2 className="modal-header__title">{title}</h2>
            <div className="modal-header__actions">
              {headerActions ? headerActions : (
                <>
                  {!hideHeaderActions && onEdit && (
                    <button type="button" onClick={onEdit} className="modal-action-btn">
                      Edit
                    </button>
                  )}
                  {!hideHeaderActions && onDelete && (
                    <button type="button" onClick={onDelete} className="modal-action-btn modal-action-btn--danger">
                      Delete
                    </button>
                  )}
                  {!hideHeaderActions && !onEdit && !onDelete && (
                    closeHref ? (
                      <a href={closeHref} className="modal-close-btn">
                        <X size={20} />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={onClose}
                        className="modal-close-btn"
                      >
                        <X size={20} />
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
          {children}
        </div>
      </div>
    </>
  );

  if (portalRoot) {
    return createPortal(content, portalRoot);
  }

  return content;
}
