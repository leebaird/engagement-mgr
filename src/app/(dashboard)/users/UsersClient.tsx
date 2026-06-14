'use client';
import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Database, Upload, Download, Trash2, Users } from 'lucide-react';
import { Modal } from '@/components/Modal';
import { CreateUserForm } from './CreateUserForm';

interface UsersClientProps {
  children: React.ReactNode;
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
  backupHref: string;
  restoreHref: string;
  resetHref: string;
  dbMessage?: string | null;
}

export function UsersClient({
  children,
  addHref,
  showCreateModal,
  createCloseHref,
  backupHref,
  restoreHref,
  resetHref,
  dbMessage,
}: UsersClientProps) {
  const router = useRouter();
  const listRef = useRef<HTMLDivElement>(null);

  const sectionWidth = '600px';

  return (
    <>
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
      <div
        style={{
          margin: '0 auto',
          minHeight: 'calc(100vh - 4rem)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
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
          {dbMessage ? (
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
              {dbMessage}
            </div>
          ) : null}
          <div className="db-action-grid">
            <a
              href={backupHref}
              className="db-action-btn"
              style={{ textDecoration: 'none' }}
            >
              <Upload size={22} color="#0066ff" />
              <span className="db-action-btn-label">Backup</span>
              <span className="db-action-btn-desc">Save a full backup zip to your home directory.</span>
            </a>
            <Link
              href={restoreHref}
              scroll={false}
              className="db-action-btn"
              style={{ textDecoration: 'none' }}
            >
              <Download size={22} color="#0066ff" />
              <span className="db-action-btn-label">Restore</span>
              <span className="db-action-btn-desc">Import from a previous backup zip.</span>
            </Link>
            <Link
              href={resetHref}
              scroll={false}
              className="db-action-btn db-action-btn--danger"
              style={{ textDecoration: 'none' }}
            >
              <Trash2 size={22} color="#ff3366" />
              <span className="db-action-btn-label">Reset</span>
              <span className="db-action-btn-desc">Wipe all records and restore default creds.</span>
            </Link>
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
            <Link
              href={addHref}
              className="btn-secondary"
              style={{ width: 'fit-content', flexShrink: 0, textDecoration: 'none' }}
              scroll={false}
            >
              New User
            </Link>
          </div>

          <div ref={listRef}>
            {children}
          </div>
        </section>
      </div>

      </div>
    </>
  );
}