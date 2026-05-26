'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from './CreateFindingForm';

interface FindingsClientProps {
  children: React.ReactNode;
}

export function FindingsClient({ children }: FindingsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Findings" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Finding"
      >
        <CreateFindingForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
