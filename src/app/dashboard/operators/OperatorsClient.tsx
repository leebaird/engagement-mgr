'use client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateOperatorForm } from './CreateOperatorForm';

interface OperatorsClientProps {
  isAdmin?: boolean;
  children: React.ReactNode;
  addHref?: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function OperatorsClient({
  isAdmin = false,
  children,
  addHref,
  showCreateModal,
  createCloseHref,
}: OperatorsClientProps) {
  const router = useRouter();

  return (
    <div className="page-container">
      <PageHeader
        title="Operators"
        showAddButton={isAdmin}
        addButtonLabel="New Operator"
        addHref={addHref}
      />

      <div>
        {children}
      </div>

      {isAdmin && showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New Operator"
          headerActions={
            <button
              type="submit"
              form="create-operator-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Add Operator
            </button>
          }
        >
          <CreateOperatorForm
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
