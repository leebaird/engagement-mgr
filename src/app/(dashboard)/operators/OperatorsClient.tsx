'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateOperatorForm } from './CreateOperatorForm';

interface OperatorsClientProps {
  children: React.ReactNode;
}

export function OperatorsClient({ children }: OperatorsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Operators" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      {isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Add New Operator"
          headerActions={
            <button
              type="submit"
              form="create-operator-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Add Operator
            </button>
          }
        >
          <CreateOperatorForm onSuccess={() => {
              setIsModalOpen(false);
              router.refresh();
              // Smoothly return to the list view after adding
              setTimeout(() => {
                listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }, 120);
            }} />
        </Modal>
      )}
    </div>
  );
}
