import React, { useEffect } from 'react';
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
}

export function Modal({ isOpen, onClose, title, children, onEdit, onDelete, hideHeaderActions, maxWidth }: ModalProps) {
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: maxWidth ? '0.5rem' : '1rem'
    }} onClick={onClose}>
      <div 
        className="glass-panel" 
        style={{ 
          width: maxWidth ? maxWidth : '100%',
          maxWidth: maxWidth || '775px',
          padding: '2rem',
          position: 'relative',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', margin: 0 }}>{title}</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
