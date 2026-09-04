'use client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateEngagementForm } from './CreateEngagementForm';

interface EngagementsClientProps {
  clients: { id: string; company: string }[];
  contacts: { id: string; name: string; title: string | null; clientId: string }[];
  operators: { id: string; name: string; title: string | null }[];
  isAdmin?: boolean;
  children: React.ReactNode;
  overlay?: React.ReactNode;
  addHref?: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function EngagementsClient({
  clients,
  contacts,
  operators,
  isAdmin = false,
  children,
  overlay,
  addHref,
  showCreateModal,
  createCloseHref,
}: EngagementsClientProps) {
  const router = useRouter();

  return (
    <>
      {overlay}
      {isAdmin && showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New Engagement"
          maxWidth="900px"
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
              router.refresh();
              window.location.assign(createCloseHref);
            }}
          />
        </Modal>
      )}
      <div className="page-container">
        <PageHeader
          title="Engagements"
          showAddButton={isAdmin}
          addButtonLabel="New Engagement"
          addHref={addHref}
        />

        <div>
          {children}
        </div>
      </div>
    </>
  );
}
