import { prisma } from '@/lib/db';
import { Crosshair, ShieldAlert, Users, Building2, Zap, Contact } from 'lucide-react';

export default async function DashboardHome() {
  const currentDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const [
    activeEngagementCount,
    planningEngagementCount,
    completedEngagementCount,
    clientCount,
    contactCount,
    findingCount,
    operatorCount,
    userCount
  ] = await Promise.all([
    prisma.engagement.count({
      where: {
        status: {
          notIn: ['PLANNING', 'COMPLETE']
        }
      }
    }),
    prisma.engagement.count({
      where: { status: 'PLANNING' }
    }),
    prisma.engagement.count({
      where: { status: 'COMPLETE' }
    }),
    prisma.client.count(),
    prisma.contact.count(),
    prisma.finding.count(),
    prisma.operator.count(),
    prisma.user.count(),
  ]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.25rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>{currentDate}</h1>
      
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Engagements */}
        <div className="glass-panel" style={{ gridColumn: '2 / span 3', padding: '1.5rem 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px', display: 'flex' }}>
              <Crosshair size={28} color="#0066ff" />
            </div>
            <div style={{ width: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{activeEngagementCount}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Active</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ width: '60px' }}></div>
            <div style={{ width: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{planningEngagementCount}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Planning</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
            <div style={{ width: '60px' }}></div>
            <div style={{ width: '80px', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', fontWeight: 700 }}>{completedEngagementCount}</div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Completed</div>
            </div>
          </div>
        </div>

        {/* Clients */}
        <div className="glass-panel" style={{ gridColumnStart: 1, padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <Building2 size={28} color="#0066ff" />
          </div>
          <div style={{ width: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{clientCount}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Clients</div>
          </div>
        </div>

        {/* Contacts */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <Contact size={28} color="#0066ff" />
          </div>
          <div style={{ width: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{contactCount}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Contacts</div>
          </div>
        </div>

        {/* Findings */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <ShieldAlert size={28} color="#0066ff" />
          </div>
          <div style={{ width: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{findingCount}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Findings</div>
          </div>
        </div>

        {/* Operators */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <Zap size={28} color="#0066ff" />
          </div>
          <div style={{ width: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{operatorCount}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Operators</div>
          </div>
        </div>

        {/* Users */}
        <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
          <div style={{ background: 'rgba(0,102,255,0.05)', padding: '1rem', borderRadius: '12px' }}>
            <Users size={28} color="#0066ff" />
          </div>
          <div style={{ width: '80px', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{userCount}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Users</div>
          </div>
        </div>

      </div>
    </div>
  );
}
