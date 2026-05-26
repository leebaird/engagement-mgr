'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateClientForm } from './CreateClientForm';

interface ClientsClientProps {
  children: React.ReactNode;
}

export function ClientsClient({ children }: ClientsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Clients" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Client"
      >
        <CreateClientForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
