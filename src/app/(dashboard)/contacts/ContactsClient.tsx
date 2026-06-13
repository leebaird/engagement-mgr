'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateContactForm } from './CreateContactForm';

interface ContactsClientProps {
  clients: { id: string, company: string }[];
  isAdmin?: boolean;
  children: React.ReactNode;
}

export function ContactsClient({ clients, isAdmin = false, children }: ContactsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Contacts" showAddButton={isAdmin} onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      {isAdmin && isModalOpen && (
        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          title="Add New Contact"
          headerActions={
            <button
              type="submit"
              form="create-contact-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Add Contact
            </button>
          }
        >
          <CreateContactForm clients={clients} onSuccess={() => {
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
