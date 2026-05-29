'use client';
import { useState } from 'react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Engagements" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Engagement"
        maxWidth="1500px"
      >
        <CreateEngagementForm 
          clients={clients} 
          contacts={contacts} 
          operators={operators} 
          onSuccess={() => setIsModalOpen(false)} 
        />
      </Modal>
    </div>
  );
}
