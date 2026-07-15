import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth/session';
import Link from 'next/link';
import { engagementToScheduleValues, serializeEngagementScheduleDates } from '@/lib/date-input-value';
import { buildDetailHrefs, buildPathQuery, buildSortHrefs } from '@/lib/list-view-params';
import { sortContactsByTitle } from '@/lib/contact-title-sort';
import { sortOperatorsByTitle } from '@/lib/operator-title-sort';
import { DetailEyeLink } from '@/components/DetailEyeLink';
import { EngagementsClient } from './EngagementsClient';
import { EngagementDetailButton } from './EngagementDetailButton';
import { EngagementScheduleEditFields } from './EngagementScheduleEditFields';

function formatEngagementType(type: string): string {
  return type
    .split('_')
    .map((word) => {
      const upper = word.toUpperCase();
      if (upper === 'AI' || upper === 'USB') return upper;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

const listSelect = {
  id: true,
  codeName: true,
  status: true,
  focus: true,
  type: true,
  startTesting: true,
  endTesting: true,
  client: { select: { id: true, company: true } },
} as const;

export default async function EngagementsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; finding?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string; schedule?: string; scheduleEdit?: string; scheduleError?: string }>;
}) {
  const session = await getSession();
  const isAdmin = session?.role === 'Admin';
  const { sort, dir, create, detail, finding, edit, delete: deleteConfirm, deleteError, saveError, schedule, scheduleEdit, scheduleError } = await searchParams;
  const listParams = { sort, dir };
  const currentParams = { sort, dir, create, detail, finding, edit, delete: deleteConfirm, deleteError, saveError, schedule, scheduleEdit, scheduleError };
  const addHref = isAdmin
    ? buildPathQuery('/dashboard/engagements', listParams, { create: '1', detail: null })
    : undefined;
  const createCloseHref = buildPathQuery('/dashboard/engagements', listParams, { create: null });
  const listCloseHref = buildPathQuery('/dashboard/engagements', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null, finding: null, schedule: null, scheduleEdit: null, scheduleError: null });

  const validSortColumns = ['codeName', 'client', 'status', 'focus', 'type', 'startTesting', 'endTesting'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'codeName';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const statusOrder: Record<string, number> = {
    Prep: 1,
    Recon: 2,
    Testing: 3,
    Reporting: 4,
    Complete: 5,
  };

  type EngagementOrderBy = NonNullable<Parameters<typeof prisma.engagement.findMany>[0]>['orderBy'];

  let orderBy: EngagementOrderBy | undefined;
  if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  } else if (sortCol === 'status') {
    orderBy = undefined;
  } else if (sortCol === 'codeName') {
    orderBy = { codeName: sortDir };
  } else if (sortCol === 'focus') {
    orderBy = { focus: sortDir };
  } else if (sortCol === 'type') {
    orderBy = { type: sortDir };
  } else if (sortCol === 'startTesting') {
    orderBy = { startTesting: sortDir };
  } else {
    orderBy = { endTesting: sortDir };
  }

  // Lean list query — table only needs a few columns + client name
  const engagements = await prisma.engagement.findMany({
    select: listSelect,
    orderBy,
  });

  if (sortCol === 'status') {
    engagements.sort((a, b) => {
      const valA = a.status ? statusOrder[a.status] ?? 99 : 100;
      const valB = b.status ? statusOrder[b.status] ?? 99 : 100;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  const sortHrefs = buildSortHrefs('/dashboard/engagements', currentParams, sortCol, sortDir);

  const needsFormOptions = (isAdmin && create === '1') || Boolean(detail);

  const [rawDetailEngagement, clients, contacts, operators] = await Promise.all([
    detail
      ? prisma.engagement.findUnique({
          where: { id: detail },
          include: {
            client: true,
            trustedAgents: true,
            operators: true,
            contacts: true,
            findings: {
              include: {
                engagementContext: true,
              },
              orderBy: { title: 'asc' },
            },
          },
        })
      : Promise.resolve(null),
    needsFormOptions
      ? prisma.client.findMany({
          select: { id: true, company: true },
          orderBy: { company: 'asc' },
        })
      : Promise.resolve([] as { id: string; company: string }[]),
    needsFormOptions
      ? prisma.contact.findMany({
          select: { id: true, name: true, title: true, clientId: true },
        })
      : Promise.resolve([] as { id: string; name: string; title: string | null; clientId: string }[]),
    needsFormOptions
      ? prisma.operator.findMany({
          select: { id: true, name: true, title: true },
        })
      : Promise.resolve([] as { id: string; name: string; title: string | null }[]),
  ]);

  const formClients = clients;
  const formContacts = needsFormOptions ? sortContactsByTitle(contacts) : contacts;
  const formOperators = needsFormOptions ? sortOperatorsByTitle(operators) : operators;

  const detailEngagement = rawDetailEngagement
    ? serializeEngagementScheduleDates(rawDetailEngagement)
    : undefined;
  const detailHrefs = detailEngagement
    ? buildDetailHrefs('/dashboard/engagements', listParams, detailEngagement.id, finding ? { finding } : {})
    : null;
  const scheduleFormValues = detailEngagement
    ? engagementToScheduleValues(detailEngagement)
    : undefined;
  const scheduleEditFields = scheduleEdit === '1' && scheduleFormValues
    ? <EngagementScheduleEditFields values={scheduleFormValues} />
    : undefined;

  return (
    <EngagementsClient
      clients={formClients}
      contacts={formContacts}
      operators={formOperators}
      isAdmin={isAdmin}
      addHref={addHref}
      showCreateModal={isAdmin && create === '1'}
      createCloseHref={createCloseHref}
      overlay={detailEngagement ? (
        <EngagementDetailButton
          engagement={detailEngagement}
          clients={formClients}
          contacts={formContacts}
          operators={formOperators}
          isAdmin={isAdmin}
          isDetailOpen
          isEditing={edit === '1' && !finding}
          showDeleteConfirm={deleteConfirm === '1' && !finding}
          findingIsEditing={edit === '1' && !!finding}
          findingShowDeleteConfirm={deleteConfirm === '1' && !!finding}
          showLink={false}
          detailHref={detailHrefs!.view}
          editHref={detailHrefs!.edit}
          deleteConfirmHref={detailHrefs!.deleteConfirm}
          viewHref={detailHrefs!.view}
          closeHref={listCloseHref}
          deleteError={deleteError}
          saveError={saveError}
          sort={sort}
          dir={dir}
          activeFindingId={finding}
          showSchedule={schedule === '1' && !finding && !edit && deleteConfirm !== '1'}
          scheduleIsEditing={scheduleEdit === '1'}
          scheduleHref={detailHrefs!.schedule}
          scheduleViewHref={detailHrefs!.schedule}
          scheduleEditHref={detailHrefs!.scheduleEdit}
          scheduleCloseHref={detailHrefs!.view}
          scheduleError={scheduleError}
          scheduleEditFields={scheduleEditFields}
          listParams={listParams}
        />
      ) : null}
    >
      <div className="glass-panel" style={{ padding: '2rem' }}>
        {engagements.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
            {isAdmin ? (
              <>No engagements yet. Click <strong style={{ color: 'var(--text-main)' }}>New Engagement</strong> to add one.</>
            ) : (
              'No engagements yet.'
            )}
          </p>
        ) : (
        <table className="data-table">
          <colgroup>
            <col />
            <col />
            <col style={{ width: '120px' }} />
            <col />
            <col />
            <col style={{ width: '120px' }} />
            <col style={{ width: '120px' }} />
            <col style={{ width: '40px' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                <Link href={sortHrefs.href('codeName')} className="sort-link">Code Name{sortHrefs.icon('codeName')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('client')} className="sort-link">Client{sortHrefs.icon('client')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('status')} className="sort-link">Status{sortHrefs.icon('status')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('focus')} className="sort-link">Focus{sortHrefs.icon('focus')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('type')} className="sort-link">Type{sortHrefs.icon('type')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('startTesting')} className="sort-link">Start{sortHrefs.icon('startTesting')}</Link>
              </th>
              <th>
                <Link href={sortHrefs.href('endTesting')} className="sort-link">End{sortHrefs.icon('endTesting')}</Link>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {engagements.map(eng => (
              <tr key={eng.id}>
                <td style={{ fontWeight: 500 }}>{eng.codeName}</td>
                <td>{eng.client.company}</td>
                <td>{eng.status ?? ''}</td>
                <td>{eng.focus || ''}</td>
                <td>{eng.type ? formatEngagementType(eng.type) : ''}</td>
                <td className="cell-numeric">{eng.startTesting?.toLocaleDateString() || ''}</td>
                <td className="cell-numeric">{eng.endTesting?.toLocaleDateString() || ''}</td>
                <td className="table-action-cell">
                  <DetailEyeLink href={buildPathQuery('/dashboard/engagements', listParams, { detail: eng.id, create: null, finding: null })} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )}
      </div>
    </EngagementsClient>
  );
}
