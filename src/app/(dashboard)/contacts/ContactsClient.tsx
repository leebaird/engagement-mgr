'use client';
import { useState, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateContactForm } from './CreateContactForm';

interface ContactsClientProps {
  clients: { id: string, company: string }[];
  children: React.ReactNode;
}

export function ContactsClient({ clients, children }: ContactsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Contacts" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Contact"
      >
        <CreateContactForm clients={clients} onSuccess={() => {
            setIsModalOpen(false);
            // Smoothly return to the list view after adding
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }} />
      </Modal>
    </div>
  );
}
