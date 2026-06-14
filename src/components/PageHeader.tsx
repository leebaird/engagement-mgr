import React from 'react';
import Link from 'next/link';

interface PageHeaderProps {
  title: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  addHref?: string;
  onAddClick?: () => void;
  extraActions?: React.ReactNode;
}

export function PageHeader({
  title,
  showAddButton = true,
  addButtonLabel = 'New Record',
  addHref,
  onAddClick,
  extraActions,
}: PageHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
    }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {extraActions}
        {showAddButton && addHref ? (
          <Link href={addHref} className="btn-secondary" style={{ width: 'fit-content', textDecoration: 'none' }}>
            {addButtonLabel}
          </Link>
        ) : showAddButton && onAddClick ? (
          <button
            type="button"
            className="btn-secondary"
            style={{ width: 'fit-content' }}
            onClick={onAddClick}
          >
            {addButtonLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}