import React from 'react';

interface PageHeaderProps {
  title: string;
  showAddButton?: boolean;
  addButtonLabel?: string;
  onAddClick?: () => void;
  extraActions?: React.ReactNode;
}

export function PageHeader({ title, showAddButton = true, addButtonLabel = 'New Record', onAddClick, extraActions }: PageHeaderProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '2rem' 
    }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>{title}</h1>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {extraActions}
        {showAddButton && (
          <button 
            type="button"
            className="btn-secondary" 
            style={{ padding: '0.6rem 1.2rem', width: 'fit-content' }}
            onClick={onAddClick}
          >
            {addButtonLabel}
          </button>
        )}
      </div>
    </div>
  );
}
