'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateContactForm } from './CreateContactForm';

interface ContactsClientProps {
  clients: { id: string, company: string }[];
  isAdmin?: boolean;
  children: React.ReactNode;
  addHref?: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function ContactsClient({
  clients,
  isAdmin = false,
  children,
  addHref,
  showCreateModal,
  createCloseHref,
}: ContactsClientProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Contacts"
        showAddButton={isAdmin}
        addButtonLabel="New Contact"
        addHref={addHref}
      />

      <div ref={listRef}>
        {children}
      </div>

      {isAdmin && showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
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
          <CreateContactForm
            clients={clients}
            onSuccess={() => {
              router.refresh();
              window.location.assign(createCloseHref);
            }}
          />
        </Modal>
      )}
    </div>
  );
}