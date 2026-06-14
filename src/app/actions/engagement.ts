'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAdminError, requireAdminAuth } from '@/lib/require-admin';
import { firstZodError, uuidSchema } from '@/lib/validation/common';
import {
  createEngagementSchema,
  engagementIdSchema,
  engagementScheduleSchema,
  updateEngagementSchema,
} from '@/lib/validation/engagement';
import { parseFormUuidList } from '@/lib/validation/form';
import { finishDetailDelete, finishDetailUpdate, finishScheduleUpdate, updateErrorCode } from '@/lib/detail-delete-form';

async function resolveClientId(clientId: string, clientName: string): Promise<string | null> {
  const trimmedName = clientName.trim();
  if (trimmedName) {
    let client = await prisma.client.findFirst({
      where: { company: { equals: trimmedName, mode: 'insensitive' } },
    });
    if (!client) {
      client = await prisma.client.create({ data: { company: trimmedName } });
    }
    return client.id;
  }
  if (clientId) return clientId;
  return null;
}

function parseRelationIds(
  formData: FormData,
  key: string
): { ok: true; ids: string[] } | { ok: false; error: string } {
  return parseFormUuidList(formData.getAll(key));
}

export async function createEngagement(prevState: any, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const parsed = createEngagementSchema.safeParse({
    codeName: formData.get('codeName'),
    clientId: formData.get('clientId'),
    clientName: formData.get('clientName'),
    type: formData.get('type'),
    location: formData.get('location'),
    focus: formData.get('focus'),
    objectives: formData.get('objectives'),
    targets: formData.get('targets'),
    exclusions: formData.get('exclusions'),
    notes: formData.get('notes'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const operatorIds = parseRelationIds(formData, 'operators');
  if (!operatorIds.ok) return { error: operatorIds.error };

  const contactIds = parseRelationIds(formData, 'contacts');
  if (!contactIds.ok) return { error: contactIds.error };

  const trustedAgentIds = parseRelationIds(formData, 'trustedAgents');
  if (!trustedAgentIds.ok) return { error: trustedAgentIds.error };

  const {
    codeName,
    clientId: parsedClientId,
    clientName,
    type,
    location,
    focus,
    objectives,
    targets,
    exclusions,
    notes,
  } = parsed.data;

  try {
    const clientId = (await resolveClientId(parsedClientId, clientName)) ?? '';
    if (!clientId) return { error: 'A Client is required to create an engagement.' };

    await prisma.engagement.create({
      data: {
        codeName,
        clientId,
        type,
        location,
        focus,
        objectives,
        targets,
        exclusions,
        notes: notes || null,
        operators: {
          connect: operatorIds.ids.map((id) => ({ id })),
        },
        contacts: {
          connect: contactIds.ids.map((id) => ({ id })),
        },
        trustedAgents: {
          connect: trustedAgentIds.ids.map((id) => ({ id })),
        },
      },
    });
    revalidatePath('/engagements');
    return { success: 'Engagement created successfully.' };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to create engagement.' };
  }
}

export async function updateEngagement(id: string, prevState: any, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = engagementIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = updateEngagementSchema.safeParse({
    codeName: formData.get('codeName'),
    clientId: formData.get('clientId'),
    clientName: formData.get('clientName'),
    type: formData.get('type'),
    location: formData.get('location'),
    focus: formData.get('focus'),
    status: formData.get('status'),
    objectives: formData.get('objectives'),
    targets: formData.get('targets'),
    exclusions: formData.get('exclusions'),
    notes: formData.get('notes'),
    chargeCode: formData.get('chargeCode'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  const operatorIds = parseRelationIds(formData, 'operators');
  if (!operatorIds.ok) return { error: operatorIds.error };

  const contactIds = parseRelationIds(formData, 'contacts');
  if (!contactIds.ok) return { error: contactIds.error };

  const trustedAgentIds = parseRelationIds(formData, 'trustedAgents');
  if (!trustedAgentIds.ok) return { error: trustedAgentIds.error };

  const {
    codeName,
    clientId: parsedClientId,
    clientName,
    type,
    location,
    focus,
    status,
    objectives,
    targets,
    exclusions,
    notes,
    chargeCode,
  } = parsed.data;

  try {
    let clientId = (await resolveClientId(parsedClientId, clientName)) ?? '';
    if (!clientId) {
      const existing = await prisma.engagement.findUnique({
        where: { id: idParsed.data },
        select: { clientId: true },
      });
      clientId = existing?.clientId ?? '';
    }
    if (!clientId) return { error: 'A Client is required to update an engagement.' };

    await prisma.engagement.update({
      where: { id: idParsed.data },
      data: {
        codeName,
        clientId,
        chargeCode,
        type,
        location,
        status,
        focus,
        objectives,
        targets,
        exclusions,
        notes: notes || null,
        operators: {
          set: operatorIds.ids.map((relationId) => ({ id: relationId })),
        },
        contacts: {
          set: contactIds.ids.map((relationId) => ({ id: relationId })),
        },
        trustedAgents: {
          set: trustedAgentIds.ids.map((relationId) => ({ id: relationId })),
        },
      },
    });
    revalidatePath('/engagements');
    return { success: 'Engagement updated successfully.' };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update engagement.' };
  }
}

export async function updateEngagementSchedule(id: string, formData: FormData) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = engagementIdSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  const parsed = engagementScheduleSchema.safeParse({
    startPrep: formData.get('startPrep'),
    endPrep: formData.get('endPrep'),
    startRecon: formData.get('startRecon'),
    endRecon: formData.get('endRecon'),
    startTesting: formData.get('startTesting'),
    endTesting: formData.get('endTesting'),
    startReporting: formData.get('startReporting'),
    endReporting: formData.get('endReporting'),
    outbrief: formData.get('outbrief'),
  });

  if (!parsed.success) {
    return { error: firstZodError(parsed.error) };
  }

  try {
    await prisma.engagement.update({
      where: { id: idParsed.data },
      data: parsed.data,
    });
    revalidatePath('/engagements');
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update engagement schedule.' };
  }
}

export async function updateEngagementScheduleFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateEngagementSchedule(id, formData);
  finishScheduleUpdate('/engagements', formData, id, result, updateErrorCode(result.error), ['finding']);
}

export async function updateEngagementFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await updateEngagement(id, {}, formData);
  finishDetailUpdate('/engagements', formData, id, result, updateErrorCode(result.error), ['finding']);
}

export async function deleteEngagementFromDetail(formData: FormData): Promise<void> {
  const id = formData.get('id')?.toString() ?? '';
  const result = await deleteEngagement(id);
  const code = result.error?.includes('Unauthorized') ? 'unauthorized' : 'generic';
  finishDetailDelete('/engagements', formData, id, result, code, ['finding']);
}

export async function deleteEngagement(id: string) {
  const auth = await requireAdminAuth();
  if (isAdminError(auth)) return { error: 'Unauthorized' };

  const idParsed = uuidSchema.safeParse(id);
  if (!idParsed.success) {
    return { error: firstZodError(idParsed.error) };
  }

  try {
    await prisma.engagement.delete({ where: { id: idParsed.data } });
    revalidatePath('/engagements');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to delete engagement.' };
  }
}