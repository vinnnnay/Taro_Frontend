'use client';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/components/AuthProvider';

export default function RegisterPage() {
  const { signUp } = useAuth();
  return <AuthForm mode="register" onSubmit={signUp} />;
}
