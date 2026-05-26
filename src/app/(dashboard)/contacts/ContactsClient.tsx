'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateContactForm } from './CreateContactForm';

interface ContactsClientProps {
  clients: { id: string, company: string }[];
  children: React.ReactNode;
}

export function ContactsClient({ clients, children }: ContactsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Contacts" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Contact"
      >
        <CreateContactForm clients={clients} onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
