'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from './CreateFindingForm';
import { FindingDetailButton } from './FindingDetailButton';

interface FindingsClientProps {
  initialFindings: any[];
}

export function FindingsClient({ initialFindings }: FindingsClientProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [findings, setFindings] = useState(initialFindings);
  const listRef = useRef<HTMLDivElement>(null);

  // Keep local state in sync when server data refreshes (e.g. after create)
  useEffect(() => {
    setFindings(initialFindings);
  }, [initialFindings]);

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'Critical': return { color: '#b366ff', background: 'rgba(179,102,255,0.1)' };
      case 'High': return { color: '#ff4d4d', background: 'rgba(255,77,77,0.1)' };
      case 'Medium': return { color: '#ffa64d', background: 'rgba(255,166,77,0.1)' };
      case 'Low': return { color: '#4ade80', background: 'rgba(74,222,128,0.1)' };
      case 'Info': return { color: '#66b3ff', background: 'rgba(102,179,255,0.1)' };
      default: return { color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)' };
    }
  };

  const handleOptimisticDelete = (id: string) => {
    setFindings(prev => prev.filter(f => f.id !== id));
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Findings" onAddClick={() => setIsModalOpen(true)} />
      
      <div ref={listRef}>
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Title</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>Category</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '120px' }}>Severity</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '150px' }}>Created</th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '150px' }}>Updated</th>
                <th style={{ padding: '0.75rem', width: '40px' }}></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{f.title}</td>
                  <td style={{ padding: '0.75rem' }}>{f.category || ''}</td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.severity}>
                    <span style={{ 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '4px', 
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      ...getSeverityStyle(f.severity)
                    }}>
                      {f.severity}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{new Date(f.updatedAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <FindingDetailButton 
                      finding={f} 
                      onOptimisticDelete={handleOptimisticDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Finding"
        maxWidth="1000px"
      >
        <CreateFindingForm onSuccess={() => {
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
