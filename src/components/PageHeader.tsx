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
    <div className="page-header">
      <h1 className="page-header__title">{title}</h1>
      <div className="page-header__actions">
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