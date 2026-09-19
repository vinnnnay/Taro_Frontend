'use client';
import { Card, Button } from './ui';

/**
 * Visible progress with clear failure states.
 *
 * Generation takes around ninety seconds, so a spinner with no information is
 * the wrong answer -- the user cannot tell a slow crawl from a hung process.
 * The pipeline reports each step as it happens and this renders them, so the
 * wait is legible: "crawling acme.test", "generating behavioural questions",
 * "checking coverage — 1 gap remaining".
 */

const LABELS = {
  queued: 'Queued',
  'extract-requirements': 'Reading the job description',
  crawl: 'Crawling the company site',
  fetched: 'Fetched a page',
  'public-discussion': 'Looking for public discussion of their interviews',
  'company-brief': 'Writing the company brief',
  'hiring-process': 'Working out how they hire',
  'generate-questions': 'Writing questions',
  'generate-technical': 'Writing technical questions',
  'generate-behavioural': 'Writing behavioural questions',
  'generate-system-design': 'Writing system design questions',
  'generate-company-fit': 'Writing company-fit questions',
  'coverage-loop': 'Checking every requirement is covered',
  coverage: 'Checking coverage',
  flashcards: 'Making flashcards',
  schedule: 'Building your study schedule',
};

const label = (s) => LABELS[s.step] ?? s.step.replace(/[-:]/g, ' ');

export function GenerationProgress({ status, onRetry }) {
  const steps = status?.steps ?? [];

  // Collapse start/finish pairs into one row per step, newest state winning.
  const rows = [];
  for (const s of steps) {
    if (s.step === 'fetched') continue;
    const existing = rows.find((r) => r.step === s.step);
    if (existing) Object.assign(existing, s);
    else rows.push({ ...s });
  }

  if (status?.status === 'failed') {
    return (
      <Card className="p-6" style={{ borderColor: 'var(--danger)' }}>
        <h2 className="font-medium" style={{ color: 'var(--danger)' }}>Generation failed</h2>
        <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-soft)' }}>
          {status.error?.message ?? 'Something went wrong while building this kit.'}
        </p>
        {status.error?.code && (
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--ink-faint)' }}>{status.error.code}</p>
        )}
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={onRetry}>Try again</Button>
        </div>
        {rows.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-xs" style={{ color: 'var(--ink-faint)' }}>
              What it managed before failing
            </summary>
            <ul className="mt-2 space-y-1 text-xs" style={{ color: 'var(--ink-soft)' }}>
              {rows.map((r, i) => <li key={i}>{label(r)} — {r.status}{r.detail ? `: ${r.detail}` : ''}</li>)}
            </ul>
          </details>
        )}
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-2 w-2 animate-pulse-soft rounded-full" style={{ background: 'var(--accent)' }} />
        <h2 className="font-medium">Building your kit</h2>
      </div>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--ink-soft)' }}>
        This usually takes a minute or two. You can leave this page and come back.
      </p>

      <ol className="mt-5 space-y-2" aria-live="polite" aria-label="Generation progress">
        {rows.length === 0 && (
          <li className="text-sm animate-pulse-soft" style={{ color: 'var(--ink-faint)' }}>Starting…</li>
        )}
        {rows.map((r, i) => {
          const done = r.status === 'ok';
          const failed = r.status === 'failed';
          return (
            <li key={i} className="flex items-baseline gap-2.5 text-sm">
              <span aria-hidden="true" style={{ color: failed ? 'var(--danger)' : done ? 'var(--accent)' : 'var(--ink-faint)' }}>
                {failed ? '✕' : done ? '✓' : '·'}
              </span>
              <span style={{ color: done || failed ? 'var(--ink)' : 'var(--ink-soft)' }}>
                {label(r)}
                {r.detail && <span style={{ color: 'var(--ink-faint)' }}> — {r.detail}</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
