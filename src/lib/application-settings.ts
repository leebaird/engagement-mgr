import { prisma } from '@/lib/db';
import {
  APPLICATION_SETTING_ID,
  isHighlightColor,
  type HighlightColor,
} from '@/lib/highlight-color';

export async function getHighlightColor(): Promise<HighlightColor> {
  const settings = await prisma.applicationSetting.findUnique({
    where: { id: APPLICATION_SETTING_ID },
    select: { highlightColor: true },
  });

  return isHighlightColor(settings?.highlightColor) ? settings.highlightColor : 'Pink';
}
