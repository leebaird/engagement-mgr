import React from 'react';

interface PageHeaderProps {
  title: string;
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export function PageHeader({ title, showAddButton = true, onAddClick }: PageHeaderProps) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '2rem' 
    }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>{title}</h1>
      {showAddButton && (
        <button 
          className="btn-secondary" 
          style={{ padding: '0.6rem 1.2rem', width: 'fit-content' }}
          onClick={onAddClick}
        >
          New Record
        </button>
      )}
    </div>
  );
}
