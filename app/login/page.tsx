import SignInView from '@/components/auth/SignInView';

export const metadata = {
  title: 'Sign In — Portfolio Dashboard',
  description: 'Sign in to access your investment portfolio, real-time Indian market indices, and AI insights.',
};

export default function LoginPage() {
  return <SignInView />;
}
