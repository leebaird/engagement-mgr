'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateClientForm } from './CreateClientForm';

interface ClientsClientProps {
  children: React.ReactNode;
}

export function ClientsClient({ children }: ClientsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Clients" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Client"
        headerActions={
          <button
            type="submit"
            form="create-client-form"
            className="btn-save"
            style={{ boxShadow: 'none' }}
          >
            Add Client
          </button>
        }
      >
        <CreateClientForm onSuccess={() => {
            setIsModalOpen(false);
            router.refresh();
            // Smoothly return to the list view after adding
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }} />
      </Modal>
    </div>
  );
}
