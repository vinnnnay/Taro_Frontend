'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useKit, useKitStatus } from '@/lib/useKit';
import { Header } from '@/components/Header';
import { Badge, Button, Card, EditableText, ErrorState, Skeleton, Toast } from '@/components/ui';
import { GenerationProgress } from '@/components/GenerationProgress';
import { QuestionList } from '@/components/QuestionList';
import { SchedulePanel } from '@/components/SchedulePanel';
import { WeakSpots } from '@/components/WeakSpots';

const CATEGORIES = ['technical', 'behavioural', 'system-design', 'company-fit'];
const TABS = [
  ['overview', 'Overview'], ['questions', 'Questions'], ['flashcards', 'Flashcards'],
  ['schedule', 'Schedule'], ['weak', 'Weak spots'],
];

export default function KitPage({ params }) {
  const { id } = use(params);
  const { doc, kit, loading, error, saving, conflict, dismissConflict, adopt, mutate, clearError } = useKit(id);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState(null);
  const [regenerating, setRegenerating] = useState(null);
  const [insights, setInsights] = useState(null);

  const generating = doc && (doc.status === 'pending' || doc.status === 'running');
  const status = useKitStatus(id, generating);

  // When the poller says the kit is finished, pull the real document.
  useEffect(() => {
    if (status?.status === 'ready') api.getKit(id).then((r) => adopt(r.kit)).catch(() => {});
    if (status?.status === 'failed') api.getKit(id).then((r) => adopt(r.kit)).catch(() => {});
  }, [status?.status, id, adopt]);

  // Weak spots are computed server-side from persisted practice records, so
  // they are refetched whenever the kit itself changes.
  useEffect(() => {
    if (doc?.status !== 'ready') return;
    const ac = new AbortController();
    api.getInsights(id, ac.signal).then(setInsights).catch(() => {});
    return () => ac.abort();
  }, [doc?.status, doc?.rev, id]);

  useEffect(() => { if (conflict) setToast({ message: 'This kit changed elsewhere — your view has been refreshed.', tone: 'warn' }); }, [conflict]);

  const actions = useMemo(() => ({
    edit: (section, itemId, patch) => mutate(
      (k) => { const it = k[section].find((x) => x.id === itemId); if (it) Object.assign(it, patch, { origin: it.origin === 'manual' ? 'manual' : 'edited' }); return k; },
      (rev) => api.editItem(id, { section, id: itemId, patch, rev }),
    ).catch(() => {}),

    add: (section, values) => mutate(null, (rev) => api.addItem(id, { section, values, rev }))
      .then(() => setToast({ message: 'Added. It is yours now, so regenerating will keep it.', tone: 'accent' }))
      .catch(() => {}),

    remove: (section, itemId) => mutate(
      (k) => { k[section] = k[section].filter((x) => x.id !== itemId); return k; },
      () => api.removeItem(id, section, itemId),
    ).catch(() => {}),

    pin: (section, itemId, pinned) => mutate(
      (k) => { const it = k[section].find((x) => x.id === itemId); if (it) it.pinned = pinned; return k; },
      () => api.setPin(id, section, itemId, pinned),
    ).catch(() => {}),

    move: (itemId, category) => mutate(
      (k) => { const it = k.questions.find((x) => x.id === itemId); if (it) { it.category = category; if (it.origin === 'generated') it.origin = 'edited'; } return k; },
      (rev) => api.moveCategory(id, itemId, { category, rev }),
    ).catch(() => {}),

    reorder: (section, orderedIds) => mutate(
      (k) => { const by = new Map(k[section].map((x) => [x.id, x])); k[section] = orderedIds.map((x) => by.get(x)).filter(Boolean); return k; },
      (rev) => api.reorder(id, { section, orderedIds, rev }),
    ).catch(() => {}),
  }), [id, mutate]);

  const regenerate = useCallback(async (section, category) => {
    const key = category ?? section;
    setRegenerating(key);
    try {
      const res = await api.regenerate(id, { section, category, rev: doc.rev });
      adopt(res.kit);
      setToast({
        message: res.preserved > 0
          ? `Regenerated. ${res.preserved} question${res.preserved === 1 ? '' : 's'} you had edited or pinned ${res.preserved === 1 ? 'was' : 'were'} kept.`
          : 'Regenerated.',
        tone: 'accent',
      });
    } catch (err) {
      setToast({ message: err.message, tone: 'danger' });
    } finally { setRegenerating(null); }
  }, [id, doc?.rev, adopt]);

  const weakReport = insights?.weakSpots ?? null;

  if (loading) return <><Header /><main id="main" className="mx-auto max-w-5xl px-4 py-8"><Skeleton rows={4} /></main></>;
  if (error && !kit) return <><Header /><main id="main" className="mx-auto max-w-5xl px-4 py-8"><ErrorState error={error} /></main></>;

  if (generating || doc?.status === 'failed') {
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-3xl px-4 py-8">
          <Link href="/" className="text-sm underline underline-offset-2" style={{ color: 'var(--ink-soft)' }}>← All kits</Link>
          <h1 className="mt-3 mb-5 text-xl font-semibold">{doc.title || 'Your kit'}</h1>
          <GenerationProgress
            status={status ?? { status: doc.status, steps: doc.steps, error: doc.error }}
            onRetry={() => api.retryKit(id).then(() => window.location.reload())}
          />
        </main>
      </>
    );
  }

  if (!kit) return <><Header /><main id="main" className="mx-auto max-w-5xl px-4 py-8"><Skeleton rows={3} /></main></>;

  const uncovered = kit.coverage.uncovered_requirement_ids;

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-5xl px-4 py-8">
        <div className="no-print flex items-center justify-between gap-3">
          <Link href="/" className="text-sm underline underline-offset-2" style={{ color: 'var(--ink-soft)' }}>← All kits</Link>
          <span className="text-xs tabular-nums" style={{ color: 'var(--ink-faint)' }}>
            {saving ? 'Saving…' : `Saved · v${doc.rev}`}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">{kit.role.title || 'Untitled role'}</h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              {kit.source.company}{kit.source.location ? ` · ${kit.source.location}` : ''}
              {kit.role.seniority ? ` · ${kit.role.seniority}` : ''}
            </p>
          </div>
          <Link href={`/kits/${id}/practice`} className="no-print">
            <Button variant="primary">Practice</Button>
          </Link>
        </div>

        {/* Honest warnings, surfaced rather than buried. */}
        <div className="mt-4 space-y-2">
          {kit.meta?.thin_description && (
            <Notice tone="warn">The job description was thin, so this kit is deliberately short. It reflects what the posting actually said.</Notice>
          )}
          {!kit.meta?.hiring_process_found && (
            <Notice tone="neutral">No public description of this company&apos;s interview process was found, so the questions are based on the posting and their site alone.</Notice>
          )}
          {uncovered.length > 0 && (
            <Notice tone="warn">
              {uncovered.length} must-have requirement{uncovered.length === 1 ? '' : 's'} could not be covered by a question after {kit.coverage.passes} passes. They are listed under Weak spots.
            </Notice>
          )}
        </div>

        <nav className="no-print mt-6 flex gap-1 overflow-x-auto border-b" style={{ borderColor: 'var(--border)' }} role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
              className="whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium"
              style={tab === k
                ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                : { borderColor: 'transparent', color: 'var(--ink-soft)' }}>
              {label}
            </button>
          ))}
        </nav>

        <div className="mt-6 space-y-8">
          {tab === 'overview' && <Overview kit={kit} onRegenerate={regenerate} regenerating={regenerating === 'company_brief'} />}

          {tab === 'questions' && CATEGORIES.map((c) => (
            <QuestionList
              key={c} category={c} questions={kit.questions} requirements={kit.role.requirements}
              actions={actions} regenerating={regenerating === c}
              onRegenerate={(cat) => regenerate('questions', cat)}
            />
          ))}

          {tab === 'flashcards' && <Flashcards kit={kit} actions={actions}
            onRegenerate={() => regenerate('flashcards')} regenerating={regenerating === 'flashcards'} />}

          {tab === 'schedule' && <SchedulePanel schedule={kit.schedule} questions={kit.questions}
            onRegenerate={() => regenerate('schedule')} regenerating={regenerating === 'schedule'} />}

          {tab === 'weak' && (weakReport
            ? <WeakSpots report={weakReport} />
            : <Skeleton rows={3} />)}
        </div>
      </main>

      <Toast message={toast?.message} tone={toast?.tone} onDismiss={() => { setToast(null); dismissConflict(); clearError(); }} />
    </>
  );
}

function Notice({ tone, children }) {
  const tones = {
    warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
    neutral: { background: 'var(--surface-raised)', color: 'var(--ink-soft)' },
  };
  return <p className="rounded-md px-3.5 py-2.5 text-sm" style={tones[tone]}>{children}</p>;
}

function Overview({ kit, onRegenerate, regenerating }) {
  return (
    <div className="space-y-8">
      <section aria-labelledby="h-brief">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="h-brief" className="text-lg font-semibold">About {kit.source.company}</h2>
          <Button size="sm" className="no-print" disabled={regenerating} onClick={() => onRegenerate('company_brief')}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>
        </div>
        <Card className="mt-2 p-4">
          <p className="leading-relaxed">{kit.company_brief.summary || <em style={{ color: 'var(--ink-faint)' }}>Nothing could be established about this company.</em>}</p>
          {kit.company_brief.what_they_do && (
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{kit.company_brief.what_they_do}</p>
          )}
          {kit.meta?.company_notable?.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              {kit.meta.company_notable.map((n, i) => <li key={i}>· {n}</li>)}
            </ul>
          )}
          {kit.company_brief.sources?.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs" style={{ color: 'var(--ink-faint)' }}>
                {kit.company_brief.sources.length} source{kit.company_brief.sources.length === 1 ? '' : 's'}
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {kit.company_brief.sources.map((s) => (
                  <li key={s}><a href={s} target="_blank" rel="noreferrer noopener" className="text-xs underline underline-offset-2 break-all" style={{ color: 'var(--accent)' }}>{s}</a></li>
                ))}
              </ul>
            </details>
          )}
        </Card>
      </section>

      {kit.meta?.hiring_process?.found && (
        <section aria-labelledby="h-process">
          <h2 id="h-process" className="text-lg font-semibold">How they hire</h2>
          <ol className="mt-2 space-y-2">
            {kit.meta.hiring_process.stages.map((s, i) => (
              <Card key={i} className="p-3.5">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm tabular-nums" style={{ color: 'var(--ink-faint)' }}>{i + 1}</span>
                  <span className="font-medium">{s.name}</span>
                  {s.duration && <Badge>{s.duration}</Badge>}
                </div>
                {s.description && <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{s.description}</p>}
              </Card>
            ))}
          </ol>
          {kit.meta.hiring_process.notes?.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--ink-soft)' }}>
              {kit.meta.hiring_process.notes.map((n, i) => <li key={i}>· {n}</li>)}
            </ul>
          )}
        </section>
      )}

      <section aria-labelledby="h-reqs">
        <h2 id="h-reqs" className="text-lg font-semibold">What they are asking for</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Taken from the posting. {kit.meta?.requirements_discarded > 0 &&
            `${kit.meta.requirements_discarded} proposed requirement(s) were discarded because they could not be traced back to the text.`}
        </p>
        <ul className="mt-2 space-y-1.5">
          {kit.role.requirements.map((r) => (
            <li key={r.id} className="flex items-start gap-2">
              <Badge tone={r.priority === 'must' ? 'accent' : 'neutral'}>{r.priority}</Badge>
              <span className="text-sm leading-relaxed">{r.text}</span>
            </li>
          ))}
          {kit.role.requirements.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--ink-faint)' }}>No requirements could be extracted from this posting.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Flashcards({ kit, actions, onRegenerate, regenerating }) {
  const kept = kit.flashcards.filter((f) => f.origin !== 'generated' || f.pinned).length;
  return (
    <section aria-labelledby="h-cards" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="h-cards" className="text-lg font-semibold">Flashcards <span className="text-sm font-normal" style={{ color: 'var(--ink-faint)' }}>{kit.flashcards.length}</span></h2>
        <div className="no-print flex items-center gap-2">
          {kept > 0 && <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>{kept} will be kept</span>}
          <Button size="sm" onClick={onRegenerate} disabled={regenerating}>{regenerating ? 'Regenerating…' : 'Regenerate'}</Button>
          <Button size="sm" variant="ghost" onClick={() => actions.add('flashcards', { front: 'New card', back: '' })}>+ Add</Button>
        </div>
      </div>

      {kit.flashcards.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: 'var(--border)', color: 'var(--ink-faint)' }}>
          No flashcards in this kit.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {kit.flashcards.map((f) => (
            <Card key={f.id} className="p-3.5">
              <div className="flex items-start justify-between gap-2">
                <EditableText value={f.front} label="card front" className="text-sm font-medium" onSave={(v) => actions.edit('flashcards', f.id, { front: v })} />
                <div className="no-print flex shrink-0 gap-0.5">
                  <Button size="sm" variant="ghost" aria-label={f.pinned ? 'Unpin' : 'Pin'} onClick={() => actions.pin('flashcards', f.id, !f.pinned)}>{f.pinned ? '📌' : '📍'}</Button>
                  <Button size="sm" variant="ghost" aria-label="Delete card" style={{ color: 'var(--danger)' }} onClick={() => actions.remove('flashcards', f.id)}>✕</Button>
                </div>
              </div>
              <div className="mt-1.5">
                <EditableText value={f.back} label="card back" multiline placeholder="No answer yet." className="text-sm leading-relaxed" onSave={(v) => actions.edit('flashcards', f.id, { back: v })} />
              </div>
              <div className="mt-1.5 px-1.5">
                {f.origin === 'manual' ? <Badge tone="accent">yours</Badge>
                  : f.origin === 'edited' ? <Badge tone="accent">edited</Badge>
                  : f.pinned ? <Badge tone="accent">pinned</Badge>
                  : <Badge>generated</Badge>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
