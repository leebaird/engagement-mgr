'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { buildPathQuery } from '@/lib/list-view-params';
import { PageHeader } from '@/components/PageHeader';
import { Modal } from '@/components/Modal';
import { CreateFindingForm } from './CreateFindingForm';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { FindingDetailButton } from './FindingDetailButton';

interface FindingsClientProps {
  initialFindings: any[];
  sortCol: string;
  sortDir: 'asc' | 'desc';
  addHref: string;
  showCreateModal: boolean;
  createCloseHref: string;
  activeDetailId?: string;
  listCloseHref: string;
  listParams: { sort?: string; dir?: string };
}

export function FindingsClient({
  initialFindings,
  sortCol,
  sortDir,
  addHref,
  showCreateModal,
  createCloseHref,
  activeDetailId,
  listCloseHref,
  listParams,
}: FindingsClientProps) {
  const router = useRouter();
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

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/findings?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/findings?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const sortLinkStyle = { color: 'inherit', textDecoration: 'none' as const };
  const detailFinding = activeDetailId ? findings.find((finding) => finding.id === activeDetailId) : undefined;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <PageHeader title="Findings" addButtonLabel="New Finding" addHref={addHref} />
      
      <div ref={listRef}>
        {detailFinding ? (
          <FindingDetailButton
            finding={detailFinding}
            onOptimisticDelete={handleOptimisticDelete}
            isDetailOpen
            showLink={false}
            detailHref={buildPathQuery('/findings', listParams, { detail: detailFinding.id, create: null })}
            closeHref={listCloseHref}
          />
        ) : null}
        <div className="glass-panel" style={{ padding: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', tableLayout: 'fixed' }}>
            <colgroup>
              <col />
              <col style={{ width: '160px' }} />
              <col style={{ width: '120px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '150px' }} />
              <col style={{ width: '52px' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                  <Link href={getSortHref('title')} style={sortLinkStyle}>
                    Title{getSortIcon('title')}
                  </Link>
                </th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden' }}>
                  <Link href={getSortHref('category')} style={{ ...sortLinkStyle, marginLeft: '2.5rem', display: 'inline-block' }}>
                    Category{getSortIcon('category')}
                  </Link>
                </th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                  <Link href={getSortHref('severity')} style={sortLinkStyle}>
                    Severity{getSortIcon('severity')}
                  </Link>
                </th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                  <Link href={getSortHref('createdAt')} style={sortLinkStyle}>
                    Created{getSortIcon('createdAt')}
                  </Link>
                </th>
                <th style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>
                  <Link href={getSortHref('updatedAt')} style={sortLinkStyle}>
                    Updated{getSortIcon('updatedAt')}
                  </Link>
                </th>
                <th style={{ padding: '0.75rem' }}></th>
              </tr>
            </thead>
            <tbody>
              {findings.map((f: any) => (
                <tr key={f.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                  <td style={{ padding: '0.75rem', fontWeight: 500 }}>{f.title}</td>
                  <td style={{ padding: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={f.category || ''}>
                    <span style={{ marginLeft: '2.5rem', display: 'inline-block' }}>{f.category || ''}</span>
                  </td>
                  <td style={{ padding: '0.75rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={f.severity || undefined}>
                    {f.severity ? (
                      <span style={{
                        padding: '0.2rem 0.6rem',
                        borderRadius: '4px',
                        ...getSeverityStyle(f.severity),
                      }}>
                        {f.severity}
                      </span>
                    ) : null}
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding: '0.75rem', color: 'var(--text-muted)' }}>{new Date(f.updatedAt).toLocaleDateString()}</td>
                  <td className="table-action-cell">
                    <DetailEyeLink href={buildPathQuery('/findings', listParams, { detail: f.id, create: null })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <Modal
          isOpen
          closeHref={createCloseHref}
          title="Add New Finding"
          maxWidth="1000px"
          headerActions={
            <button
              type="submit"
              form="create-finding-form"
              className="btn-save"
              style={{ boxShadow: 'none' }}
            >
              Add Finding
            </button>
          }
        >
          <CreateFindingForm onSuccess={() => {
              router.refresh();
              window.location.assign(createCloseHref);
            }} />
        </Modal>
      )}
    </div>
  );
}
