'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateEngagementForm } from './CreateEngagementForm';

interface EngagementsClientProps {
  clients: { id: string; company: string }[];
  contacts: { id: string; name: string; clientId: string }[];
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
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <>
      {overlay}
      {isAdmin && showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New Engagement"
          maxWidth="1500px"
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
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <PageHeader
          title="Engagements"
          showAddButton={isAdmin}
          addButtonLabel="New Engagement"
          addHref={addHref}
        />

        <div ref={listRef}>
          {children}
        </div>
      </div>
    </>
  );
}
