import { prisma } from '@/lib/db';
import Link from 'next/link';
import { ContactsClient } from './ContactsClient';
import { ContactDetailButton } from './ContactDetailButton';
import { formatPhone } from '@/lib/format';

export default async function ContactsPage({ searchParams }: { searchParams: Promise<{ sort?: string, dir?: string }> }) {
  const { sort, dir } = await searchParams;

  const validSortColumns = ['name', 'title', 'email', 'phoneNumber', 'client'];
  const sortCol = sort && validSortColumns.includes(sort) ? sort : 'name';
  const sortDir = dir === 'desc' ? 'desc' : 'asc';

  let orderBy: any = { [sortCol]: sortDir };
  if (sortCol === 'client') {
    orderBy = { client: { company: sortDir } };
  }

  const contacts = await prisma.contact.findMany({ 
    include: { client: true },
    orderBy: orderBy
  });
  const clients = await prisma.client.findMany({ orderBy: { company: 'asc' } });

  const getSortHref = (col: string) => {
    if (sortCol === col) {
      return `/contacts?sort=${col}&dir=${sortDir === 'asc' ? 'desc' : 'asc'}`;
    }
    return `/contacts?sort=${col}&dir=asc`;
  };

  const getSortIcon = (col: string) => {
    if (sortCol !== col) return null;
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <ContactsClient clients={clients}>
      <div className="glass-panel" style={{ padding: '2rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--surface-border)' }}>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '220px' }}>
                <Link href={getSortHref('name')} style={{ color: 'inherit', textDecoration: 'none' }}>Name{getSortIcon('name')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '170px' }}>
                <Link href={getSortHref('title')} style={{ color: 'inherit', textDecoration: 'none' }}>Title{getSortIcon('title')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('client')} style={{ color: 'inherit', textDecoration: 'none' }}>Company{getSortIcon('client')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '180px' }}>
                <Link href={getSortHref('email')} style={{ color: 'inherit', textDecoration: 'none' }}>Email{getSortIcon('email')}</Link>
              </th>
              <th style={{ padding: '0.75rem', color: 'var(--text-muted)', width: '160px' }}>
                <Link href={getSortHref('phoneNumber')} style={{ color: 'inherit', textDecoration: 'none' }}>Phone{getSortIcon('phoneNumber')}</Link>
              </th>
              <th style={{ padding: '0.75rem', width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map(c => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--surface-border)' }}>
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>{c.name}</td>
                <td style={{ padding: '0.75rem' }}>{c.title || ''}</td>
                <td style={{ padding: '0.75rem' }}>{c.client.company}</td>
                <td style={{ padding: '0.75rem' }}>{c.email || ''}</td>
                <td style={{ padding: '0.75rem' }}>{formatPhone(c.phone)}</td>
                <td style={{ padding: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <ContactDetailButton contact={c} clients={clients} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ContactsClient>
  );
}
