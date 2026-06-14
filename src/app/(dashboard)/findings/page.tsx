import { prisma } from '@/lib/db';
import { buildDetailHrefs, buildPathQuery } from '@/lib/list-view-params';
import { FindingsClient } from './FindingsClient';

export default async function FindingsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; dir?: string; create?: string; detail?: string; edit?: string; delete?: string; deleteError?: string; saveError?: string }>;
}) {
  const { sort, dir, create, detail, edit, delete: deleteConfirm, deleteError, saveError } = await searchParams;
  const listParams = { sort, dir };
  const addHref = buildPathQuery('/findings', listParams, { create: '1', detail: null });
  const createCloseHref = buildPathQuery('/findings', listParams, { create: null });
  const listCloseHref = buildPathQuery('/findings', listParams, { detail: null, edit: null, delete: null, deleteError: null, saveError: null });
  const detailHrefs = detail ? buildDetailHrefs('/findings', listParams, detail) : null;

  const validSortColumns = ['title', 'category', 'severity', 'createdAt', 'updatedAt'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'title';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  const severityOrder: Record<string, number> = {
    'Critical': 1,
    'High': 2,
    'Medium': 3,
    'Low': 4,
    'Info': 5
  };

  let findings = await prisma.finding.findMany({
    orderBy: sortCol === 'severity' ? undefined : { [sortCol]: sortDir }
  });

  if (sortCol === 'severity') {
    findings.sort((a, b) => {
      const valA = severityOrder[a.severity] || 99;
      const valB = severityOrder[b.severity] || 99;
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  return (
    <FindingsClient
      initialFindings={findings}
      sortCol={sortCol}
      sortDir={sortDir}
      addHref={addHref}
      showCreateModal={create === '1'}
      createCloseHref={createCloseHref}
      activeDetailId={detail}
      isEditing={edit === '1'}
      showDeleteConfirm={deleteConfirm === '1'}
      detailHrefs={detailHrefs}
      deleteError={deleteError}
      saveError={saveError}
      listCloseHref={listCloseHref}
      listParams={listParams}
    />
  );
}