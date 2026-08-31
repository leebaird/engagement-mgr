'use client';
import { useActionState, useEffect, useRef, useState } from 'react';
import { createEngagement } from '@/app/actions/engagement';
import { EngagementFormFields } from './EngagementFormFields';

export function CreateEngagementForm({
  clients, contacts, operators, onSuccess
}: {
  clients: { id: string, company: string }[],
  contacts: { id: string, name: string, title: string | null, clientId: string }[],
  operators: { id: string, name: string, title: string | null }[],
  onSuccess?: () => void
}) {
  const [state, formAction] = useActionState(createEngagement, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedOps, setSelectedOps] = useState<string[]>([]);
  const [opsOpen, setOpsOpen] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [selectedTAs, setSelectedTAs] = useState<string[]>([]);
  const [tasOpen, setTasOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactDropdownRef = useRef<HTMLDivElement>(null);
  const taDropdownRef = useRef<HTMLDivElement>(null);
  const codeNameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpsOpen(false);
      }
      if (contactDropdownRef.current && !contactDropdownRef.current.contains(event.target as Node)) {
        setContactsOpen(false);
      }
      if (taDropdownRef.current && !taDropdownRef.current.contains(event.target as Node)) {
        setTasOpen(false);
      }
    }
    if (opsOpen || contactsOpen || tasOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [opsOpen, contactsOpen, tasOpen]);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
      queueMicrotask(() => {
        setSelectedOps([]);
        setSelectedContacts([]);
        setSelectedTAs([]);
      });
      onSuccess?.();
    }
  }, [state, onSuccess]);

  return (
    <form id="create-engagement-form" className="engagement-create-form" action={formAction} ref={formRef}>
      {selectedContacts.map(id => <input type="hidden" key={id} name="contacts" value={id} />)}
      {selectedTAs.map(id => <input type="hidden" key={id} name="trustedAgents" value={id} />)}
      {selectedOps.map(id => <input type="hidden" key={id} name="operators" value={id} />)}

      <EngagementFormFields
        clients={clients}
        contacts={contacts}
        operators={operators}
        selectedOps={selectedOps}
        setSelectedOps={setSelectedOps}
        opsOpen={opsOpen}
        setOpsOpen={setOpsOpen}
        selectedContacts={selectedContacts}
        setSelectedContacts={setSelectedContacts}
        contactsOpen={contactsOpen}
        setContactsOpen={setContactsOpen}
        selectedTAs={selectedTAs}
        setSelectedTAs={setSelectedTAs}
        tasOpen={tasOpen}
        setTasOpen={setTasOpen}
        dropdownRef={dropdownRef}
        contactDropdownRef={contactDropdownRef}
        taDropdownRef={taDropdownRef}
        codeNameRef={codeNameRef}
        autoFocusCodeName
      />

      {state?.error && <div className="text-error mb-4">{state.error}</div>}
      {state?.success && <div style={{ color: '#4ade80', marginBottom: '1rem' }}>{state.success}</div>}
    </form>
  );
}
