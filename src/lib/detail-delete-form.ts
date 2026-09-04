import { redirect } from 'next/navigation';
import { buildPathQuery, SearchParamRecord } from '@/lib/list-view-params';

export type DeleteActionResult = { error?: string; success?: boolean };
export type UpdateActionResult = { error?: string; success?: boolean | string };

export function updateErrorCode(error?: string): string {
  if (!error) return 'generic';
  if (error.includes('finding changed')) return 'conflict';
  if (error.includes('Unauthorized')) return 'unauthorized';
  if (error.includes('last admin')) return 'last-admin';
  if (error.includes('already exists')) return 'duplicate';
  if (error.includes('password must')) return 'password';
  return 'generic';
}

export function listParamsFromForm(formData: FormData): SearchParamRecord {
  const params: SearchParamRecord = {};
  const sort = formData.get('sort')?.toString();
  const dir = formData.get('dir')?.toString();
  if (sort) params.sort = sort;
  if (dir) params.dir = dir;
  return params;
}

export function extraParamsFromForm(
  formData: FormData,
  keys: string[],
): SearchParamRecord {
  const params: SearchParamRecord = {};
  for (const key of keys) {
    const value = formData.get(key)?.toString();
    if (value) params[key] = value;
  }
  return params;
}

type FinishDetailDeleteOptions = {
  /** Keep this `detail` param after a successful delete (e.g. engagement overlay). */
  successDetailId?: string;
};

export function finishDetailDelete(
  pathname: string,
  formData: FormData,
  id: string,
  result: DeleteActionResult,
  deleteError = 'generic',
  extraParamKeys: string[] = [],
  options: FinishDetailDeleteOptions = {},
) {
  const listParams = listParamsFromForm(formData);
  const extra = extraParamsFromForm(formData, extraParamKeys);
  const clearExtra = Object.fromEntries(extraParamKeys.map((key) => [key, null]));

  if (result.error) {
    redirect(
      buildPathQuery(pathname, listParams, {
        ...extra,
        detail: id,
        delete: '1',
        deleteError,
        edit: null,
      }),
    );
  }

  redirect(
    buildPathQuery(pathname, listParams, {
      detail: options.successDetailId ?? null,
      edit: null,
      delete: null,
      deleteError: null,
      saveError: null,
      schedule: null,
      scheduleEdit: null,
      scheduleError: null,
      findings: null,
      createFinding: null,
      ...clearExtra,
    }),
  );
}

export function finishScheduleUpdate(
  pathname: string,
  formData: FormData,
  id: string,
  result: UpdateActionResult,
  scheduleError = 'generic',
  extraParamKeys: string[] = [],
) {
  const listParams = listParamsFromForm(formData);
  const extra = extraParamsFromForm(formData, extraParamKeys);

  if (result.error) {
    redirect(
      buildPathQuery(pathname, listParams, {
        ...extra,
        detail: id,
        schedule: '1',
        scheduleEdit: '1',
        scheduleError,
        edit: null,
        delete: null,
        deleteError: null,
        saveError: null,
      }),
    );
  }

  redirect(
    buildPathQuery(pathname, listParams, {
      ...extra,
      detail: id,
      schedule: '1',
      scheduleEdit: null,
      scheduleError: null,
      edit: null,
      delete: null,
      deleteError: null,
      saveError: null,
    }),
  );
}

export function finishDetailUpdate(
  pathname: string,
  formData: FormData,
  id: string,
  result: UpdateActionResult,
  saveError = 'generic',
  extraParamKeys: string[] = [],
) {
  const listParams = listParamsFromForm(formData);
  const extra = extraParamsFromForm(formData, extraParamKeys);

  if (result.error) {
    redirect(
      buildPathQuery(pathname, listParams, {
        ...extra,
        detail: id,
        edit: '1',
        saveError,
        delete: null,
        deleteError: null,
      }),
    );
  }

  redirect(
    buildPathQuery(pathname, listParams, {
      ...extra,
      detail: id,
      edit: null,
      saveError: null,
      delete: null,
      deleteError: null,
      schedule: null,
      scheduleEdit: null,
      scheduleError: null,
      findings: null,
      createFinding: null,
    }),
  );
}
