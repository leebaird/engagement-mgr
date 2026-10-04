'use client';
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
  return (
    <div className="page-container">
      <PageHeader
        title="Clients"
        showAddButton={isAdmin}
        addButtonLabel="New Client"
        addHref={addHref}
      />

      <div>
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
          <CreateClientForm returnTo={createCloseHref} />
        </Modal>
      )}
    </div>
  );
}
