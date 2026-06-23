'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateClientForm } from './CreateClientForm';

interface ClientsClientProps {
  isAdmin?: boolean;
  children: React.ReactNode;
  addHref?: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function ClientsClient({
  isAdmin = false,
  children,
  addHref,
  showCreateModal,
  createCloseHref,
}: ClientsClientProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader
        title="Clients"
        showAddButton={isAdmin}
        addButtonLabel="New Client"
        addHref={addHref}
      />

      <div ref={listRef}>
        {children}
      </div>

      {isAdmin && showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
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
          <CreateClientForm
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