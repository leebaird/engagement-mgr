'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateEngagementForm } from './CreateEngagementForm';

interface EngagementsClientProps {
  clients: any[];
  contacts: any[];
  operators: any[];
  children: React.ReactNode;
}

export function EngagementsClient({ clients, contacts, operators, children }: EngagementsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Engagements" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Engagement"
        maxWidth="1500px"
        headerActions={
          <button
            type="submit"
            form="create-engagement-form"
            className="btn-save"
            style={{ boxShadow: 'none' }}
          >
            Add Engagement
          </button>
        }
      >
        <CreateEngagementForm 
          clients={clients} 
          contacts={contacts} 
          operators={operators} 
          onSuccess={() => {
            setIsModalOpen(false);
            router.refresh();
            // Smoothly return to the list view after adding
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }} 
        />
      </Modal>
    </div>
  );
}
