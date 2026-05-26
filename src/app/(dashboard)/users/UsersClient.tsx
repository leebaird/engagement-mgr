'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateUserForm } from './CreateUserForm';

interface UsersClientProps {
  children: React.ReactNode;
}

export function UsersClient({ children }: UsersClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Users" onAddClick={() => setIsModalOpen(true)} />
      
      {children}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New User"
      >
        <CreateUserForm onSuccess={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
}
