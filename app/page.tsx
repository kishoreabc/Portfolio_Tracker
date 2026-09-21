import { auth } from '@/auth';
import DashboardClient from '@/components/dashboard/DashboardClient';
import SignInView from '@/components/auth/SignInView';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const session = await auth();

  if (session?.user && Object.keys(session.user).length > 0) {
    return <DashboardClient />;
  }

  return <SignInView />;
}