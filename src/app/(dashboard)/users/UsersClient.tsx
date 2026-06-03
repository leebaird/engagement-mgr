'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Upload, Download, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateUserForm } from './CreateUserForm';


interface UsersClientProps {
  children: React.ReactNode;
}

export function UsersClient({ children }: UsersClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importPending, setImportPending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const dbBusy = importPending || deletePending;
  const listRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const handleExportDb = () => {
    window.location.href = '/api/db/export';
  };

  const handleDeleteDb = async () => {
    if (
      !confirm(
        'Reset will permanently remove all database records and uploaded screenshots, then recreate the default admin account (username: admin, password: admin). Continue?'
      )
    ) {
      return;
    }

    setDeletePending(true);
    try {
      const res = await fetch('/api/db/delete', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Reset failed');
        return;
      }
      window.location.href = '/login';
    } catch {
      alert('Reset failed');
    } finally {
      setDeletePending(false);
    }
  };

  const handleImportDbClick = () => {
    importInputRef.current?.click();
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (
      !confirm(
        'Restore will replace all database data and uploaded screenshots with this backup. Continue?'
      )
    ) {
      return;
    }

    setImportPending(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/db/import', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Restore failed');
        return;
      }
      router.refresh();
    } catch {
      alert('Restore failed');
    } finally {
      setImportPending(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: '600px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.sql,application/zip,application/sql,text/plain"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <section className="glass-panel" style={{ marginBottom: '2rem', padding: '2rem' }}>
        <div className="db-panel-header">
          <div className="db-panel-icon">
            <Database size={28} color="#0066ff" />
          </div>
          <div>
            <h2 className="db-panel-title">Database</h2>
          </div>
        </div>
        <div className="db-action-grid">
          <button
            type="button"
            className="db-action-btn"
            onClick={handleExportDb}
            disabled={dbBusy}
          >
            <Upload size={22} color="#0066ff" />
            <span className="db-action-btn-label">Backup</span>
            <span className="db-action-btn-desc">Export a full backup zip.</span>
          </button>
          <button
            type="button"
            className="db-action-btn"
            onClick={handleImportDbClick}
            disabled={dbBusy}
          >
            <Download size={22} color="#0066ff" />
            <span className="db-action-btn-label">{importPending ? 'Restoring backup...' : 'Restore'}</span>
            <span className="db-action-btn-desc">Import from a previous backup zip.</span>
          </button>
          <button
            type="button"
            className="db-action-btn db-action-btn--danger"
            onClick={handleDeleteDb}
            disabled={dbBusy}
          >
            <Trash2 size={22} color="#ff3366" />
            <span className="db-action-btn-label">{deletePending ? 'Resetting...' : 'Reset'}</span>
            <span className="db-action-btn-desc">Wipe all records and restore default creds.</span>
          </button>
        </div>
      </section>

      <div>
        <PageHeader title="Users" onAddClick={() => setIsModalOpen(true)} />

        <div ref={listRef}>
          {children}
        </div>
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
