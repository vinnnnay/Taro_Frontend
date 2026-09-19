'use client';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const { signIn } = useAuth();
  return <AuthForm mode="login" onSubmit={signIn} />;
}
