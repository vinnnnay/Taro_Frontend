'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Button, Card } from './ui';

export function AuthForm({ mode, onSubmit }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const isRegister = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try { await onSubmit(email, password); }
    catch (err) { setError(err.message ?? 'Something went wrong.'); }
    finally { setBusy(false); }
  };

  return (
    <main id="main" className="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card className="w-full p-7">
        <h1 className="text-xl font-semibold">{isRegister ? 'Create an account' : 'Sign in'}</h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {isRegister ? 'Your kits are private to you.' : 'Welcome back.'}
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">Email</label>
            <input
              id="email" type="email" autoComplete="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">Password</label>
            <input
              id="password" type="password" required minLength={8}
              autoComplete={isRegister ? 'new-password' : 'current-password'}
              value={password} onChange={(e) => setPassword(e.target.value)}
              aria-describedby={isRegister ? 'pw-hint' : undefined}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
            {isRegister && <p id="pw-hint" className="mt-1 text-xs" style={{ color: 'var(--ink-faint)' }}>At least 8 characters.</p>}
          </div>

          {error && (
            <p role="alert" className="rounded-md px-3 py-2 text-sm"
              style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>
          )}

          <Button type="submit" variant="primary" size="lg" className="w-full" disabled={busy}>
            {busy ? 'Working…' : isRegister ? 'Create account' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-5 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {isRegister ? 'Already have an account? ' : 'No account yet? '}
          <Link href={isRegister ? '/login' : '/register'} className="underline underline-offset-2" style={{ color: 'var(--accent)' }}>
            {isRegister ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </Card>
    </main>
  );
}
