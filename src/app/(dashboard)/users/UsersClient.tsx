'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Database, Upload, Download, Trash2, Users } from 'lucide-react';
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
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreConfirmOpen, setRestoreConfirmOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [pendingRestoreFile, setPendingRestoreFile] = useState<File | null>(null);
  const dbBusy = importPending || deletePending;
  const listRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  const sectionWidth = '600px';

  const handleExportDb = () => {
    window.location.href = '/api/db/export';
  };

  const closeResetModal = () => {
    setResetModalOpen(false);
    setResetConfirmText('');
  };

  const handleDeleteDb = async () => {
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
      closeResetModal();
    }
  };

  const handleImportDbClick = () => {
    importInputRef.current?.click();
  };

  const runRestore = async (file: File) => {
    setImportPending(true);
    setRestoreSuccess(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/db/import', { method: 'POST', body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || 'Restore failed');
        return;
      }
      setRestoreSuccess('Database restored successfully.');
      router.refresh();
    } catch {
      alert('Restore failed');
    } finally {
      setImportPending(false);
      setRestoreConfirmOpen(false);
      setPendingRestoreFile(null);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPendingRestoreFile(file);
    setRestoreConfirmOpen(true);
  };

  const confirmRestore = () => {
    if (pendingRestoreFile) {
      runRestore(pendingRestoreFile);
    }
  };

  return (
    <div
      style={{
        margin: '0 auto',
        minHeight: 'calc(100vh - 4rem)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <input
        ref={importInputRef}
        type="file"
        accept=".zip,.sql,application/zip,application/sql,text/plain"
        style={{ display: 'none' }}
        onChange={handleImportFile}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2rem',
          alignItems: 'flex-start',
        }}
      >
        <section className="glass-panel" style={{ padding: '2rem', width: sectionWidth, maxWidth: sectionWidth, flexShrink: 0 }}>
          <div className="db-panel-header">
            <div className="db-panel-icon">
              <Database size={28} color="#0066ff" />
            </div>
            <div>
              <h2 className="db-panel-title">Database</h2>
            </div>
          </div>
          {restoreSuccess ? (
            <div
              style={{
                color: '#4ade80',
                fontSize: '0.875rem',
                marginBottom: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(74, 222, 128, 0.1)',
                border: '1px solid rgba(74, 222, 128, 0.25)',
                borderRadius: '8px',
              }}
            >
              {restoreSuccess}
            </div>
          ) : null}
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
              onClick={() => setResetModalOpen(true)}
              disabled={dbBusy}
            >
              <Trash2 size={22} color="#ff3366" />
              <span className="db-action-btn-label">{deletePending ? 'Resetting...' : 'Reset'}</span>
              <span className="db-action-btn-desc">Wipe all records and restore default creds.</span>
            </button>
          </div>
        </section>

        <section className="glass-panel" style={{ padding: '2rem', width: sectionWidth, maxWidth: sectionWidth, flexShrink: 0 }}>
          <div className="db-panel-header" style={{ marginBottom: '1.5rem' }}>
            <div className="db-panel-icon">
              <Users size={28} color="#0066ff" />
            </div>
            <div style={{ flex: 1 }}>
              <h2 className="db-panel-title">Users</h2>
            </div>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: '0.6rem 1.2rem', width: 'fit-content', flexShrink: 0 }}
              onClick={() => setIsModalOpen(true)}
            >
              New User
            </button>
          </div>

          <div ref={listRef}>
            {children}
          </div>
        </section>
      </div>

      <Modal
        isOpen={restoreConfirmOpen}
        onClose={() => {
          setRestoreConfirmOpen(false);
          setPendingRestoreFile(null);
        }}
        title="Restore backup"
        maxWidth="480px"
        headerActions={
          <>
            <button
              type="button"
              className="btn-save"
              style={{ boxShadow: 'none' }}
              disabled={importPending}
              onClick={confirmRestore}
            >
              {importPending ? 'Restoring...' : 'Restore'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              style={{ boxShadow: 'none' }}
              disabled={importPending}
              onClick={() => {
                setRestoreConfirmOpen(false);
                setPendingRestoreFile(null);
              }}
            >
              Cancel
            </button>
          </>
        }
      >
        <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Restore will replace all database data and uploaded screenshots with
          {pendingRestoreFile ? (
            <> <strong style={{ color: 'var(--text-main)' }}>{pendingRestoreFile.name}</strong></>
          ) : (
            ' this backup'
          )}
          . This cannot be undone.
        </p>
      </Modal>

      <Modal
        isOpen={resetModalOpen}
        onClose={closeResetModal}
        title="Reset database"
        maxWidth="480px"
        headerActions={
          <>
            <button
              type="button"
              className="btn-save"
              style={{ boxShadow: 'none', borderColor: '#ff3366', color: '#ff3366' }}
              disabled={resetConfirmText !== 'RESET' || deletePending}
              onClick={handleDeleteDb}
            >
              {deletePending ? 'Resetting...' : 'Reset'}
            </button>
            <button
              type="button"
              className="btn-cancel"
              style={{ boxShadow: 'none' }}
              disabled={deletePending}
              onClick={closeResetModal}
            >
              Cancel
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            This will permanently remove all database records and uploaded screenshots, then recreate the default admin account (username: admin, password: admin).
          </p>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Type <strong style={{ color: 'var(--text-main)' }}>RESET</strong> to confirm
            </div>
            <input
              type="text"
              className="form-input"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              autoComplete="off"
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Modal>

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
            setTimeout(() => {
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 120);
          }} />
      </Modal>
    </div>
  );
}