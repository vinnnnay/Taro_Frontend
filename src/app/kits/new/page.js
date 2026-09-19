'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { Button, Card } from '@/components/ui';

/**
 * Creating a kit. Two modes, because the brief asks for both:
 * a single pasted description, and "a file of description-and-company pairs"
 * for preparing for several roles at once.
 */
export default function NewKitPage() {
  const router = useRouter();
  const [mode, setMode] = useState('single');
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(5);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [fileCases, setFileCases] = useState(null);
  const [fileError, setFileError] = useState(null);

  const submitSingle = async (e) => {
    e.preventDefault();
    setError(null); setBusy(true);
    try {
      const r = await api.createKit({ jd, company_url: companyUrl.trim(), days: Number(days) });
      router.push(`/kits/${r.kit.id}`);
    } catch (err) { setError(err.message); setBusy(false); }
  };

  const readFile = async (file) => {
    setFileError(null); setFileCases(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const arr = Array.isArray(parsed) ? parsed : parsed.cases;
      if (!Array.isArray(arr)) throw new Error('Expected a JSON array of cases.');
      const cases = arr.map((c, i) => {
        if (!c?.jd?.trim()) throw new Error(`Case ${i + 1} has no "jd".`);
        return { jd: c.jd, company_url: c.company_url ?? '', days: Number(c.days) || 5 };
      });
      if (cases.length > 20) throw new Error('At most 20 at a time.');
      setFileCases(cases);
    } catch (err) {
      setFileError(err.message.startsWith('Unexpected') ? 'That file is not valid JSON.' : err.message);
    }
  };

  const submitBatch = async () => {
    setError(null); setBusy(true);
    try {
      await api.createBatch(fileCases);
      router.push('/');
    } catch (err) { setError(err.message); setBusy(false); }
  };

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">New kit</h1>

        <div className="mt-5 flex gap-1 rounded-lg border p-1" style={{ borderColor: 'var(--border)' }} role="tablist">
          {[['single', 'One role'], ['batch', 'Several roles']].map(([k, label]) => (
            <button key={k} role="tab" aria-selected={mode === k} onClick={() => setMode(k)}
              className="flex-1 rounded-md px-3 py-1.5 text-sm font-medium"
              style={mode === k ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : { color: 'var(--ink-soft)' }}>
              {label}
            </button>
          ))}
        </div>

        {mode === 'single' ? (
          <form onSubmit={submitSingle} className="mt-6 space-y-5">
            <div>
              <label htmlFor="jd" className="block text-sm font-medium">Job description</label>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--ink-faint)' }}>
                Paste the posting text. A thin description produces a thin kit — that is honest, not a bug.
              </p>
              <textarea
                id="jd" required rows={12} value={jd} onChange={(e) => setJd(e.target.value)}
                placeholder="Senior Backend Engineer…"
                className="mt-1.5 w-full rounded-md border px-3 py-2 font-mono text-sm"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
              />
              <p className="mt-1 text-xs tabular-nums" style={{ color: 'var(--ink-faint)' }}>{jd.length} characters</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div>
                <label htmlFor="url" className="block text-sm font-medium">Company website</label>
                <input
                  id="url" type="url" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="mt-1.5 w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>
              <div>
                <label htmlFor="days" className="block text-sm font-medium">Days to prepare</label>
                <input
                  id="days" type="number" min={1} max={365} required value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className="mt-1.5 w-24 rounded-md border px-3 py-2 text-sm tabular-nums"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink)' }}
                />
              </div>
            </div>

            {error && <p role="alert" className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{error}</p>}

            <Button type="submit" variant="primary" size="lg" disabled={busy || !jd.trim()}>
              {busy ? 'Starting…' : 'Build my kit'}
            </Button>
          </form>
        ) : (
          <div className="mt-6 space-y-5">
            <Card className="p-4">
              <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
                Upload a JSON array of <code>{'{ jd, company_url, days }'}</code> objects — one per role.
              </p>
              <pre className="mt-2 overflow-x-auto rounded p-3 text-xs" style={{ background: 'var(--surface-raised)', color: 'var(--ink-soft)' }}>
{`[
  { "jd": "Senior Backend Engineer…", "company_url": "https://acme.com", "days": 5 },
  { "jd": "Staff Frontend Engineer…", "company_url": "https://other.com", "days": 3 }
]`}
              </pre>
            </Card>

            <input type="file" accept="application/json,.json" aria-label="Choose a JSON file"
              onChange={(e) => e.target.files?.[0] && readFile(e.target.files[0])}
              className="block w-full text-sm" />

            {fileError && <p role="alert" className="rounded-md px-3 py-2 text-sm" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>{fileError}</p>}
            {fileCases && (
              <Card className="p-4">
                <p className="text-sm font-medium">{fileCases.length} role{fileCases.length === 1 ? '' : 's'} ready</p>
                <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
                  {fileCases.map((c, i) => (
                    <li key={i} className="truncate">· {c.jd.split('\n')[0].slice(0, 70)} — {c.days} day{c.days === 1 ? '' : 's'}</li>
                  ))}
                </ul>
              </Card>
            )}
            {error && <p role="alert" className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
            <Button variant="primary" size="lg" disabled={!fileCases || busy} onClick={submitBatch}>
              {busy ? 'Starting…' : `Build ${fileCases?.length ?? 0} kits`}
            </Button>
          </div>
        )}
      </main>
    </>
  );
}
