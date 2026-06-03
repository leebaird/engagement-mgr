import { prisma } from '@/lib/db';
import { Crosshair, ShieldAlert, Building2, Zap, Contact } from 'lucide-react';

export default async function DashboardHome() {
  const [
    activeEngagementCount,
    planningEngagementCount,
    completedEngagementCount,
    clientCount,
    contactCount,
    findingCount,
    operatorCount,
  ] = await Promise.all([
    prisma.engagement.count({
      where: { status: { notIn: ['PLANNING', 'COMPLETE'] } },
    }),
    prisma.engagement.count({ where: { status: 'PLANNING' } }),
    prisma.engagement.count({ where: { status: 'COMPLETE' } }),
    prisma.client.count(),
    prisma.contact.count(),
    prisma.finding.count(),
    prisma.operator.count(),
  ]);

  const statCards = [
    { label: 'Clients', count: clientCount, icon: Building2 },
    { label: 'Contacts', count: contactCount, icon: Contact },
    { label: 'Findings', count: findingCount, icon: ShieldAlert },
    { label: 'Operators', count: operatorCount, icon: Zap },
  ];

  const engagementStats = [
    { label: 'Active', count: activeEngagementCount },
    { label: 'Planning', count: planningEngagementCount },
    { label: 'Completed', count: completedEngagementCount },
  ];

  const columnCount = 4;

  const iconSize = 32;
  const iconBoxStyle = {
    background: 'rgba(0,102,255,0.05)',
    padding: '1rem',
    borderRadius: '12px',
    display: 'flex',
  } as const;
  const statCardIconBoxStyle = {
    ...iconBoxStyle,
    padding: '0.625rem',
  };
  const topRowIconBoxStyle = {
    ...iconBoxStyle,
    padding: '0.5rem',
  };
  const topRowCellStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    padding: '0 1rem',
    boxSizing: 'border-box',
  } as const;
  const topRowNumberCellStyle = {
    ...topRowCellStyle,
    alignItems: 'flex-end',
  } as const;
  const statColumnStyle = {
    padding: '1rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '1rem',
  } as const;
  const countStyle = {
    fontSize: '2rem',
    fontWeight: 700,
    lineHeight: 1,
  } as const;
  const labelStyle = {
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
    lineHeight: 1,
  } as const;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', margin: '0 0 2rem' }}>Dashboard</h1>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
          gap: '1.5rem',
        }}
      >
        <div
          className="glass-panel"
          style={{
            gridColumn: '1 / -1',
            height: '100px',
            display: 'grid',
            gridTemplateColumns: 'subgrid',
            gridTemplateRows: '1fr 1fr',
            rowGap: '0.25rem',
            padding: '0.5rem 0',
            alignItems: 'center',
            justifyItems: 'center',
          }}
        >
          <div style={{ ...topRowNumberCellStyle, gridRow: 1, gridColumn: 1 }}>
            <div style={topRowIconBoxStyle}>
              <Crosshair size={iconSize} color="#0066ff" />
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
        </div>

        {statCards.map(({ label, count, icon: Icon }) => (
          <div key={label} className="glass-panel" style={statColumnStyle}>
            <div style={statCardIconBoxStyle}>
              <Icon size={iconSize} color="#0066ff" />
            </div>
            <div style={countStyle}>{count}</div>
            <div style={labelStyle}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}