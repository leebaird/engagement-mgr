'use client';
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
          <CreateOperatorForm returnTo={createCloseHref} />
        </Modal>
      )}
    </div>
  );
}
