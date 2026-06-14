import { redirect } from 'next/navigation';
import { buildPathQuery, SearchParamRecord } from '@/lib/list-view-params';

export type DeleteActionResult = { error?: string; success?: boolean };
export type UpdateActionResult = { error?: string; success?: boolean | string };

export function updateErrorCode(error?: string): string {
  if (!error) return 'generic';
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

export function finishDetailDelete(
  pathname: string,
  formData: FormData,
  id: string,
  result: DeleteActionResult,
  deleteError = 'generic',
  extraParamKeys: string[] = [],
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
      detail: null,
      edit: null,
      delete: null,
      deleteError: null,
      saveError: null,
      ...clearExtra,
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
    }),
  );
}