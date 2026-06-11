'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { isAuthError, requireAuth } from '@/lib/require-auth';

function trimField(value: FormDataEntryValue | null): string {
  if (value == null) return '';
  return String(value).trim();
}

function parseOptionalDate(value: FormDataEntryValue | null): Date | null {
  const raw = trimField(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function relationIds(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
}

async function resolveClientId(clientId: string, clientName: string): Promise<string | null> {
  if (clientId) return clientId;
  if (!clientName) return null;

  let client = await prisma.client.findFirst({
    where: { company: { equals: clientName, mode: 'insensitive' } },
  });
  if (!client) {
    client = await prisma.client.create({ data: { company: clientName } });
  }
  return client.id;
}

export async function createEngagement(prevState: any, formData: FormData) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const codeName = trimField(formData.get('codeName'));
  const clientName = trimField(formData.get('clientName'));
  let clientId = trimField(formData.get('clientId'));
  const type = trimField(formData.get('type'));
  const location = trimField(formData.get('location'));
  const focus = trimField(formData.get('focus'));
  const objectives = trimField(formData.get('objectives'));
  const targets = trimField(formData.get('targets'));
  const exclusions = trimField(formData.get('exclusions'));
  const notes = trimField(formData.get('notes'));
  const operatorIds = relationIds(formData, 'operators');
  const contactIds = relationIds(formData, 'contacts');
  const trustedAgentIds = relationIds(formData, 'trustedAgents');

  if (!codeName) return { error: 'A Code Name is required to create an engagement.' };
  if (!clientId && !clientName) return { error: 'A Client is required to create an engagement.' };

  try {
    clientId = (await resolveClientId(clientId, clientName)) ?? '';
    if (!clientId) return { error: 'A Client is required to create an engagement.' };

    await prisma.engagement.create({
      data: {
        codeName,
        clientId,
        type: (type || null) as any,
        location: (location || null) as any,
        focus,
        objectives,
        targets,
        exclusions,
        notes: notes || null,
        operators: {
          connect: operatorIds.map(id => ({ id }))
        },
        contacts: {
          connect: contactIds.map(id => ({ id }))
        },
        trustedAgents: {
          connect: trustedAgentIds.map(id => ({ id }))
        }
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
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  const codeName = trimField(formData.get('codeName'));
  const clientName = trimField(formData.get('clientName'));
  let clientId = trimField(formData.get('clientId'));
  const type = trimField(formData.get('type'));
  const location = trimField(formData.get('location'));
  const focus = trimField(formData.get('focus'));
  const status = trimField(formData.get('status'));
  const objectives = trimField(formData.get('objectives'));
  const targets = trimField(formData.get('targets'));
  const exclusions = trimField(formData.get('exclusions'));
  const notes = trimField(formData.get('notes'));
  const operatorIds = relationIds(formData, 'operators');
  const contactIds = relationIds(formData, 'contacts');
  const trustedAgentIds = relationIds(formData, 'trustedAgents');
  const chargeCode = trimField(formData.get('chargeCode'));

  if (!codeName) return { error: 'A Code Name is required to update an engagement.' };
  if (!clientId && !clientName) return { error: 'A Client is required to update an engagement.' };

  try {
    clientId = (await resolveClientId(clientId, clientName)) ?? '';
    if (!clientId) {
      const existing = await prisma.engagement.findUnique({
        where: { id },
        select: { clientId: true },
      });
      clientId = existing?.clientId ?? '';
    }
    if (!clientId) return { error: 'A Client is required to update an engagement.' };

    await prisma.engagement.update({
      where: { id },
      data: {
        codeName,
        clientId,
        chargeCode: chargeCode || null,
        type: (type || null) as any,
        location: (location || null) as any,
        status: status ? (status as any) : null,
        focus,
        objectives,
        targets,
        exclusions,
        notes: notes || null,
        operators: {
          set: operatorIds.map(id => ({ id }))
        },
        contacts: {
          set: contactIds.map(id => ({ id }))
        },
        trustedAgents: {
          set: trustedAgentIds.map(id => ({ id }))
        }
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
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  try {
    await prisma.engagement.update({
      where: { id },
      data: {
        startPrep: parseOptionalDate(formData.get('startPrep')),
        endPrep: parseOptionalDate(formData.get('endPrep')),
        startRecon: parseOptionalDate(formData.get('startRecon')),
        endRecon: parseOptionalDate(formData.get('endRecon')),
        startTesting: parseOptionalDate(formData.get('startTesting')),
        endTesting: parseOptionalDate(formData.get('endTesting')),
        startReporting: parseOptionalDate(formData.get('startReporting')),
        endReporting: parseOptionalDate(formData.get('endReporting')),
        outbrief: parseOptionalDate(formData.get('outbrief')),
      },
    });
    revalidatePath('/engagements');
    revalidatePath('/');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to update engagement schedule.' };
  }
}

export async function deleteEngagement(id: string) {
  const auth = await requireAuth();
  if (isAuthError(auth)) return { error: 'Unauthorized' };

  try {
    await prisma.engagement.delete({ where: { id } });
    revalidatePath('/engagements');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to delete engagement.' };
  }
}
