'use client';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from './CreateFindingForm';

interface FindingsClientProps {
  children: React.ReactNode;
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
  sort?: string;
  dir?: string;
}

export function FindingsClient({
  children,
  addHref,
  showCreateModal,
  createCloseHref,
  sort,
  dir,
}: FindingsClientProps) {
  return (
    <div className="page-container">
      <PageHeader title="Findings" addButtonLabel="New Finding" addHref={addHref} />
      
      {children}

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
          <CreateFindingForm sort={sort} dir={dir} />
        </Modal>
      )}
    </div>
  );
}
