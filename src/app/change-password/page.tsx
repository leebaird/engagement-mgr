import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { ChangePasswordForm } from './ChangePasswordForm';

export default async function ChangePasswordPage() {
  // The proxy routes stale-password tokens here from the JWT claim alone; confirm the
  // session is still live. Rotation is not required here, since this page performs it.
  if (!(await getSession())) redirect('/login');
  return <ChangePasswordForm />;
}
