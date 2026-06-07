'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  onDelete?: () => void;
  hideHeaderActions?: boolean;
  maxWidth?: string;
  zIndex?: number;
  headerExtra?: React.ReactNode;
  headerActions?: React.ReactNode;
  alignTop?: boolean;
}

export function Modal({ isOpen, onClose, title, children, onEdit, onDelete, hideHeaderActions, maxWidth, zIndex = 1000, headerExtra, headerActions, alignTop = false }: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#0f1115',
      display: 'flex',
      alignItems: alignTop ? 'flex-start' : 'center',
      justifyContent: 'center',
      zIndex,
      padding: maxWidth ? '0.5rem' : '1rem'
    }} onMouseDown={onClose} onClick={onClose}>
      <div 
        className={`glass-panel modal-panel${headerExtra ? ' modal-panel--has-centered-extra' : ''}`}
        style={{ 
          width: maxWidth ? maxWidth : '100%',
          minWidth: maxWidth || undefined,
          maxWidth: maxWidth || '775px',
          padding: '2rem',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          boxSizing: 'border-box',
        }}
        onMouseDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        {headerExtra ? <div className="modal-panel__centered-extra">{headerExtra}</div> : null}
        <div className="modal-header">
          <h2 className="modal-header__title">{title}</h2>
          <div className="modal-header__actions">
            {headerActions ? headerActions : (
              <>
                {!hideHeaderActions && onEdit && (
                  <button
                    onClick={onEdit}
                    style={{
                      background: 'none',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      padding: '0.35rem 0.9rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#0066ff';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 102, 255, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--surface-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Edit
                  </button>
                )}
                {!hideHeaderActions && onDelete && (
                  <button
                    onClick={onDelete}
                    style={{
                      background: 'none',
                      border: '1px solid var(--surface-border)',
                      color: 'var(--text-main)',
                      cursor: 'pointer',
                      padding: '0.35rem 0.9rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = '#ff3366';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(255, 51, 102, 0.4)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = 'var(--surface-border)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    Delete
                  </button>
                )}
                {!hideHeaderActions && !onEdit && !onDelete && (
                  <button 
                    onClick={onClose}
                    style={{ 
                      background: 'none', 
                      border: 'none', 
                      color: 'var(--text-muted)', 
                      cursor: 'pointer',
                      padding: '0.5rem',
                      display: 'flex'
                    }}
                  >
                    <X size={20} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
