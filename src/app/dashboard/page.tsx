import Link from 'next/link';
import { prisma } from '@/lib/db';
import { Crosshair, ShieldAlert, Building2, Zap, Contact } from 'lucide-react';
import { EngagementCalendar } from './EngagementCalendar';
import { extractScheduleEvents, getEngagementsOnDate } from '@/lib/engagement-schedule-events';
import { buildCalendarDayCloseHref, buildCalendarNavHrefs, parseCalendarDayKey, parseCalendarView } from '@/lib/list-view-params';

export default async function DashboardHome({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; year?: string; day?: string }>;
}) {
  const calendarParams = await searchParams;
  const { viewYear, viewMonth } = parseCalendarView(calendarParams);
  const { prevHref, nextHref, todayHref } = buildCalendarNavHrefs(viewYear, viewMonth);
  const pickerDateKey = parseCalendarDayKey(calendarParams);
  const pickerCloseHref = buildCalendarDayCloseHref(viewYear, viewMonth);
  const [
    activeEngagementCount,
    reconEngagementCount,
    completedEngagementCount,
    clientCount,
    contactCount,
    findingCount,
    operatorCount,
    engagements,
  ] = await Promise.all([
    prisma.engagement.count({
      where: { status: { notIn: ['Recon', 'Complete'] } },
    }),
    prisma.engagement.count({ where: { status: 'Recon' } }),
    prisma.engagement.count({ where: { status: 'Complete' } }),
    prisma.client.count(),
    prisma.contact.count(),
    prisma.finding.count(),
    prisma.operator.count(),
    prisma.engagement.findMany({
      select: {
        id: true,
        codeName: true,
        status: true,
        startPrep: true,
        endPrep: true,
        startRecon: true,
        endRecon: true,
        startTesting: true,
        endTesting: true,
        startReporting: true,
        endReporting: true,
        outbrief: true,
      },
      orderBy: { codeName: 'asc' },
    }),
  ]);

  const calendarEngagements = engagements.map((engagement) => ({
    ...engagement,
    startPrep: engagement.startPrep?.toISOString() ?? null,
    endPrep: engagement.endPrep?.toISOString() ?? null,
    startRecon: engagement.startRecon?.toISOString() ?? null,
    endRecon: engagement.endRecon?.toISOString() ?? null,
    startTesting: engagement.startTesting?.toISOString() ?? null,
    endTesting: engagement.endTesting?.toISOString() ?? null,
    startReporting: engagement.startReporting?.toISOString() ?? null,
    endReporting: engagement.endReporting?.toISOString() ?? null,
    outbrief: engagement.outbrief?.toISOString() ?? null,
  }));

  const pickerEventsByDate = new Map<string, ReturnType<typeof extractScheduleEvents>>();
  if (pickerDateKey) {
    for (const event of extractScheduleEvents(calendarEngagements)) {
      const existing = pickerEventsByDate.get(event.date) ?? [];
      existing.push(event);
      pickerEventsByDate.set(event.date, existing);
    }
  }
  const pickerEngagements = pickerDateKey
    ? getEngagementsOnDate(pickerDateKey, calendarEngagements, pickerEventsByDate)
    : [];

  const statCards = [
    { label: 'Clients', count: clientCount, icon: Building2, href: '/dashboard/clients' },
    { label: 'Contacts', count: contactCount, icon: Contact, href: '/dashboard/contacts' },
    { label: 'Findings', count: findingCount, icon: ShieldAlert, href: '/dashboard/findings' },
    { label: 'Operators', count: operatorCount, icon: Zap, href: '/dashboard/operators' },
  ];

  const engagementStats = [
    { label: 'Active', count: activeEngagementCount },
    { label: 'Recon', count: reconEngagementCount },
    { label: 'Completed', count: completedEngagementCount },
  ];

  const engagementColumnCount = 4;

  const topRowIconSize = 24;
  const iconBoxStyle = {
    background: 'rgba(0,102,255,0.05)',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
  } as const;
  const statCardIconBoxStyle = {
    ...iconBoxStyle,
    padding: '0.4rem',
  };
  const topRowIconBoxStyle = {
    ...iconBoxStyle,
    padding: '0.35rem',
  };
  const topRowCellStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0 0.5rem',
    boxSizing: 'border-box',
  } as const;
  const topRowNumberCellStyle = {
    ...topRowCellStyle,
    alignItems: 'center',
  } as const;
  const topRowIconCountStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
  } as const;
  const statColumnStyle = {
    padding: '0.625rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  } as const;
  const statCardContentStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'stretch',
    width: 'fit-content',
    gap: '0.25rem',
  } as const;
  const countStyle = {
    fontSize: '1.5rem',
    fontWeight: 700,
    lineHeight: 1,
  } as const;
  const labelStyle = {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    lineHeight: 1,
  } as const;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '1.5rem',
            alignItems: 'stretch',
          }}
        >
          <Link
            href="/dashboard/engagements"
            className="glass-panel dashboard-stat-link"
            aria-label="View engagements"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${engagementColumnCount}, 1fr)`,
              gridTemplateRows: 'auto auto',
              rowGap: '0.15rem',
              padding: '0.625rem',
              alignItems: 'center',
              justifyItems: 'center',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ ...topRowNumberCellStyle, gridRow: 1, gridColumn: 1 }}>
              <div style={topRowIconBoxStyle}>
                <Crosshair size={topRowIconSize} color="#0066ff" />
              </div>
            </div>
            {engagementStats.map((stat, index) => (
              <div
                key={stat.label}
                style={{
                  ...topRowNumberCellStyle,
                  gridRow: 1,
                  gridColumn: index + 2,
                }}
              >
                <span style={countStyle}>{stat.count}</span>
              </div>
            ))}
            <div style={{ ...topRowCellStyle, gridRow: 2, gridColumn: 1 }}>
              <span style={labelStyle}>Engagements</span>
            </div>
            {engagementStats.map((stat, index) => (
              <div
                key={`${stat.label}-label`}
                style={{
                  ...topRowCellStyle,
                  gridRow: 2,
                  gridColumn: index + 2,
                }}
              >
                <span style={labelStyle}>{stat.label}</span>
              </div>
            ))}
          </Link>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
            }}
          >
            {statCards.map(({ label, count, icon: Icon, href }) => (
              <Link
                key={label}
                href={href}
                className="glass-panel dashboard-stat-link"
                aria-label={`View ${label.toLowerCase()}`}
                style={statColumnStyle}
              >
                <div style={statCardContentStyle}>
                  <div style={topRowIconCountStyle}>
                    <div style={statCardIconBoxStyle}>
                      <Icon size={topRowIconSize} color="#0066ff" />
                    </div>
                    <div style={countStyle}>{count}</div>
                  </div>
                  <span style={{ ...labelStyle, textAlign: 'center', width: '100%' }}>{label}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <EngagementCalendar
            engagements={calendarEngagements}
            viewYear={viewYear}
            viewMonth={viewMonth}
            prevHref={prevHref}
            nextHref={nextHref}
            todayHref={todayHref}
            pickerDateKey={pickerDateKey}
            pickerEngagements={pickerEngagements}
            pickerCloseHref={pickerCloseHref}
          />
        </div>
      </div>
    </div>
  );
}