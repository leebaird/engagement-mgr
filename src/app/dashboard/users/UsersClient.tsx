'use client';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateUserForm } from './CreateUserForm';

interface UsersClientProps {
  children: React.ReactNode;
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
}

export function UsersClient({
  children,
  addHref,
  showCreateModal,
  createCloseHref,
}: UsersClientProps) {
  const router = useRouter();

  return (
    <div className="page-container">
      <PageHeader
        title="Admin"
        addButtonLabel="New User"
        addHref={addHref}
      />

      {children}

      {showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New User"
          maxWidth="450px"
          headerActions={
            <button
              type="submit"
              form="create-user-form"
              className="btn-save"
              tabIndex={4}
              onKeyDown={(e) => {
                const modal = e.currentTarget.closest('.glass-panel');
                if (modal) {
                  if (e.key === 'Tab' && !e.shiftKey) {
                    e.preventDefault();
                    const first = modal.querySelector('[tabindex="1"]') as HTMLElement;
                    if (first) first.focus();
                  } else if (e.key === 'Tab' && e.shiftKey) {
                    e.preventDefault();
                    const last = modal.querySelector('[tabindex="3"]') as HTMLElement;
                    if (last) last.focus();
                  }
                }
              }}
            >
              Add User
            </button>
          }
        >
          <CreateUserForm onSuccess={() => {
              router.refresh();
              window.location.assign(createCloseHref);
            }} />
        </Modal>
      )}
    </div>
  );
}
