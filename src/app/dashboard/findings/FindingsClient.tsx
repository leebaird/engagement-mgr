'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from './CreateFindingForm';

interface FindingsClientProps {
  children: React.ReactNode;
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function FindingsClient({
  children,
  addHref,
  showCreateModal,
  createCloseHref,
}: FindingsClientProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Findings" addButtonLabel="New Finding" addHref={addHref} />
      
      <div ref={listRef}>
        {children}
      </div>

      {showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New Finding"
          maxWidth="1000px"
          headerActions={
            <button
              type="submit"
              form="create-finding-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Add Finding
            </button>
          }
        >
          <CreateFindingForm onSuccess={() => {
              router.refresh();
              window.location.assign(createCloseHref);
            }} />
        </Modal>
      )}
    </div>
  );
}
