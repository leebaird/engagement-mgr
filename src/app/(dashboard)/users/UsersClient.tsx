'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateUserForm } from './CreateUserForm';


interface UsersClientProps {
  children: React.ReactNode;
}

export function UsersClient({ children }: UsersClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <PageHeader title="Users" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        {children}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
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
            setIsModalOpen(false);
            router.refresh();
            // Smoothly return to the list view after adding
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }} />
      </Modal>
    </div>
  );
}
