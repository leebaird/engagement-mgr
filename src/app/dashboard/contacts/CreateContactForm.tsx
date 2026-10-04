'use client';
import { useActionState, useState } from 'react';
import { createContact } from '@/app/actions/contact';
import { ContactTeamField } from './ContactTeamField';

export function CreateContactForm({
  clients,
  returnTo = '/dashboard/contacts',
}: {
  clients: { id: string, company: string }[];
  returnTo?: string;
}) {
  const [state, formAction] = useActionState(createContact, null);
  const [team, setTeam] = useState('');

  return (
    <form id="create-contact-form" action={formAction}>
      <input type="hidden" name="returnTo" value={returnTo} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.75fr', gap: '1.25rem', fontSize: '1rem', lineHeight: 1.5 }}>
          <div style={{ gridColumn: 1, gridRow: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Name</div>
            <input autoFocus type="text" name="name" className="form-input" required placeholder=" " />
          </div>
          <div style={{ gridColumn: 1, gridRow: 2 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Title</div>
            <input type="text" name="title" className="form-input" />
          </div>
          <div style={{ gridColumn: 1, gridRow: 3 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Team</div>
            <ContactTeamField value={team} onChange={setTeam} />
          </div>
          <div style={{ gridColumn: 2, gridRow: 1 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Client</div>
            <select name="clientId" className="form-input" required onFocus={(e) => { try { e.currentTarget.showPicker?.(); } catch {} }}>
              <option value=""></option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: 2, gridRow: 2 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Phone</div>
            <input type="text" name="phoneNumber" className="form-input" />
          </div>
          <div style={{ gridColumn: 2, gridRow: 3 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Email</div>
            <input type="email" name="email" className="form-input" />
          </div>

        {/* Notes - full width */}
        <div style={{ gridColumn: '1 / -1', gridRow: 4 }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Notes</div>
          <textarea 
            name="notes" 
            className="form-input" 
            rows={4} 
            style={{ width: '100%' }}
            onKeyDown={e => {
              if (e.key === 'Tab' && !e.shiftKey) {
                e.preventDefault();
                const button = e.currentTarget.closest('.glass-panel')?.querySelector('button.btn-save') as HTMLElement | null;
                if (button) button.focus();
              }
            }}
          ></textarea>
        </div>
      </div>

      {state?.error && <div className="text-error mb-4" style={{ marginTop: '1rem' }}>{state.error}</div>}
    </form>
  );
}
