'use server';
import { prisma } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createEngagement(prevState: any, formData: FormData) {
  const codeName = formData.get('codeName') as string;
  const clientName = formData.get('clientName') as string;
  let clientId = formData.get('clientId') as string;
  const type = formData.get('type') as any;
  const location = formData.get('location') as any;
  const focus = formData.get('focus') as string;
  const objectives = formData.get('objectives') as string;
  const targets = formData.get('targets') as string;
  const exclusions = formData.get('exclusions') as string;
  const notes = formData.get('notes') as string | null;
  const operatorIds = formData.getAll('operators') as string[];
  const contactIds = formData.getAll('contacts') as string[];
  const trustedAgentIds = formData.getAll('trustedAgents') as string[];
  const kickOffDate = formData.get('kickOffDate') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;

  if (!codeName) return { error: 'A Code Name is required to create an engagement.' };
  if (!clientId && !clientName) return { error: 'A Client is required to create an engagement.' };

  try {
    if (clientName && !clientId) {
      let client = await prisma.client.findFirst({ where: { company: { equals: clientName, mode: 'insensitive' } } });
      if (!client) {
        client = await prisma.client.create({ data: { company: clientName } });
      }
      clientId = client.id;
    }

    await prisma.engagement.create({
      data: {
        codeName,
        client: { connect: { id: clientId } },
        type: type || null,
        location: location || null,
        focus,
        objectives,
        kickOffDate: kickOffDate ? new Date(kickOffDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targets,
        exclusions,
        notes: typeof notes === 'string' ? notes : null,
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
  const codeName = formData.get('codeName') as string;
  const clientName = formData.get('clientName') as string;
  let clientId = formData.get('clientId') as string;
  const type = formData.get('type') as any;
  const location = formData.get('location') as any;
  const focus = formData.get('focus') as string;
  const status = formData.get('status') as string;
  const objectives = formData.get('objectives') as string;
  const targets = formData.get('targets') as string;
  const exclusions = formData.get('exclusions') as string;
  const notes = formData.get('notes') as string;
  const operatorIds = formData.getAll('operators') as string[];
  const contactIds = formData.getAll('contacts') as string[];
  const trustedAgentIds = formData.getAll('trustedAgents') as string[];
  const chargeCode = formData.get('chargeCode') as string;
  const kickOffDate = formData.get('kickOffDate') as string;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;

  if (!codeName) return { error: 'A Code Name is required to update an engagement.' };
  if (!clientId && !clientName) return { error: 'A Client is required to update an engagement.' };

  try {
    if (clientName && !clientId) {
      let client = await prisma.client.findFirst({ where: { company: { equals: clientName, mode: 'insensitive' } } });
      if (!client) {
        client = await prisma.client.create({ data: { company: clientName } });
      }
      clientId = client.id;
    }

    await prisma.engagement.update({
      where: { id },
      data: {
        codeName,
        client: { connect: { id: clientId } },
        chargeCode: chargeCode || null,
        type: type || null,
        location: location || null,
        status: status ? (status as any) : null,
        focus,
        objectives,
        kickOffDate: kickOffDate ? new Date(kickOffDate) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        targets,
        exclusions,
        notes: typeof notes === 'string' ? notes : null,
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

export async function deleteEngagement(id: string) {
  try {
    await prisma.engagement.delete({ where: { id } });
    revalidatePath('/engagements');
    return { success: true };
  } catch (e) {
    console.error(e);
    return { error: 'Failed to delete engagement.' };
  }
}
