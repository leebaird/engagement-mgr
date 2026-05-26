'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateOperatorForm } from './CreateOperatorForm';

interface OperatorsClientProps {
  children: React.ReactNode;
}

export function OperatorsClient({ children }: OperatorsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Operators" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Operator"
      >
        <CreateOperatorForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
