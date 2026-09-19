'use client';
import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api';

const AuthContext = createContext(null);
const PUBLIC = ['/login', '/register'];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const ac = new AbortController();
    api.me(ac.signal)
      .then((r) => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setReady(true));
    return () => ac.abort();
  }, []);

  // A signed-out visitor cannot reach a protected page. The server enforces
  // this on every endpoint too -- this is purely so the user sees a sign-in
  // form instead of a page that fails to load.
  useEffect(() => {
    if (!ready) return;
    if (!user && !PUBLIC.includes(pathname)) router.replace('/login');
    if (user && PUBLIC.includes(pathname)) router.replace('/');
  }, [ready, user, pathname, router]);

  const signIn = useCallback(async (email, password) => {
    const r = await api.login(email, password);
    setUser(r.user);
    router.replace('/');
  }, [router]);

  const signUp = useCallback(async (email, password) => {
    const r = await api.register(email, password);
    setUser(r.user);
    router.replace('/');
  }, [router]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } finally { setUser(null); router.replace('/login'); }
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
        <span className="text-sm animate-pulse-soft" style={{ color: 'var(--ink-faint)' }}>Loading…</span>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
