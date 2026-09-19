'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';

const STATUS = {
  pending: { label: 'Queued', tone: 'neutral' },
  running: { label: 'Generating', tone: 'warn' },
  ready: { label: 'Ready', tone: 'accent' },
  failed: { label: 'Failed', tone: 'danger' },
};

export default function DashboardPage() {
  const [kits, setKits] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api.listKits().then((r) => setKits(r.kits)).catch(setError);
  };
  useEffect(load, []);

  // Keep the list fresh while anything is still generating.
  useEffect(() => {
    if (!kits?.some((k) => k.status === 'pending' || k.status === 'running')) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [kits]);

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Your kits</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              Paste a job description and a company site, and get a preparation kit built around it.
            </p>
          </div>
          <Button variant="primary" size="lg" onClick={() => { window.location.href = '/kits/new'; }}>
            New kit
          </Button>
        </div>

        <div className="mt-7">
          {error && <ErrorState error={error} onRetry={load} />}
          {!error && kits === null && <Skeleton rows={3} />}
          {!error && kits?.length === 0 && (
            <EmptyState
              title="No kits yet"
              action={<Link href="/kits/new"><Button variant="primary">Create your first kit</Button></Link>}
            >
              Start with the job description you are actually preparing for.
            </EmptyState>
          )}
          {!error && kits?.length > 0 && (
            <ul className="space-y-2">
              {kits.map((k) => {
                const s = STATUS[k.status] ?? STATUS.pending;
                return (
                  <li key={k.id}>
                    <Card className="transition-colors hover:bg-[var(--surface-raised)]">
                      <Link href={`/kits/${k.id}`} className="flex items-center justify-between gap-4 p-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-medium">{k.title || 'Untitled kit'}</span>
                            <Badge tone={s.tone}>{s.label}</Badge>
                          </div>
                          <p className="mt-1 truncate text-sm" style={{ color: 'var(--ink-soft)' }}>
                            {k.input?.company_url || 'No company site given'} · {k.input?.days} day{k.input?.days === 1 ? '' : 's'}
                          </p>
                          {k.status === 'failed' && k.error?.message && (
                            <p className="mt-1 text-sm" style={{ color: 'var(--danger)' }}>{k.error.message}</p>
                          )}
                        </div>
                        <span aria-hidden="true" style={{ color: 'var(--ink-faint)' }}>→</span>
                      </Link>
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </main>
    </>
  );
}
