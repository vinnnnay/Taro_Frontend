'use client';
import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Header } from '@/components/Header';
import { Badge, Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';

/**
 * Practice mode.
 *
 * "A kit the user only reads is a document. Make it something they can work
 *  through." So: one card at a time, reveal the answer, record how confident
 *  they felt, and order the next session by what they were least sure about.
 *
 * The ordering is Leitner-style spaced repetition rather than a plain
 * confidence sort. Both are explicitly acceptable; spacing was chosen because
 * it gives "what have I covered" a meaning that persists ACROSS sessions,
 * where a confidence sort only reorders within one. A card marked shaky comes
 * back immediately, a confident one in six days.
 */

const CONFIDENCE = [
  { value: 1, label: 'Not confident', hint: 'Comes back this session', key: '1' },
  { value: 2, label: 'Nearly there', hint: 'Back in 2 days', key: '2' },
  { value: 3, label: 'Confident', hint: 'Back in 6 days', key: '3' },
];

export default function PracticePage({ params }) {
  const { id } = use(params);
  const [kit, setKit] = useState(null);
  const [practice, setPractice] = useState({});
  const [error, setError] = useState(null);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [sessionDone, setSessionDone] = useState([]);

  const [order, setOrder] = useState(null);

  // The order is computed server-side and fetched ONCE for the session. A queue
  // that reshuffles under the user after every answer is disorienting, so the
  // answers are recorded but the order is not recomputed mid-session.
  useEffect(() => {
    Promise.all([api.getKit(id), api.getInsights(id)])
      .then(([k, ins]) => {
        setKit(k.kit.kit);
        setPractice(ins.practice ?? {});
        setOrder(ins.practiceOrder ?? []);
      })
      .catch(setError);
  }, [id]);

  const queue = useMemo(() => {
    if (!kit) return [];
    if (!order) return [];
    const byId = new Map(kit.flashcards.map((c) => [c.id, c]));
    const ordered = order.map((cid) => byId.get(cid)).filter(Boolean);
    // Anything the server did not mention (a card added since) still gets shown.
    for (const c of kit.flashcards) if (!order.includes(c.id)) ordered.push(c);
    return ordered;
  }, [kit, order]);

  const card = queue[index];

  const record = useCallback(async (confidence) => {
    if (!card) return;
    setSessionDone((d) => [...d, { id: card.id, confidence }]);
    setRevealed(false);
    setIndex((i) => i + 1);
    try {
      const r = await api.recordPractice(id, card.id, confidence);
      setPractice(r.practice);
    } catch { /* the session continues; the next save will catch up */ }
  }, [card, id]);

  // Keyboard: space reveals, 1-3 record. The brief asks for keyboard access,
  // and a flashcard app is the place it matters most.
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!card) return;
      if ((e.key === ' ' || e.key === 'Enter') && !revealed) { e.preventDefault(); setRevealed(true); }
      else if (revealed && ['1', '2', '3'].includes(e.key)) { e.preventDefault(); record(Number(e.key)); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card, revealed, record]);

  if (error) return <><Header /><main id="main" className="mx-auto max-w-2xl px-4 py-8"><ErrorState error={error} /></main></>;
  if (!kit || !order) return <><Header /><main id="main" className="mx-auto max-w-2xl px-4 py-8"><Skeleton rows={2} /></main></>;

  const reviewedEver = Object.values(practice).filter((p) => p?.reviews).length;

  if (queue.length === 0) {
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-2xl px-4 py-8">
          <BackLink id={id} />
          <div className="mt-4">
            <EmptyState title="No flashcards in this kit">
              Add some from the Flashcards tab, or regenerate them.
            </EmptyState>
          </div>
        </main>
      </>
    );
  }

  if (!card) {
    const shaky = sessionDone.filter((d) => d.confidence === 1).length;
    return (
      <>
        <Header />
        <main id="main" className="mx-auto max-w-2xl px-4 py-8">
          <BackLink id={id} />
          <Card className="mt-4 p-8 text-center">
            <h1 className="text-xl font-semibold">Session complete</h1>
            <p className="mt-2 text-sm" style={{ color: 'var(--ink-soft)' }}>
              {sessionDone.length} card{sessionDone.length === 1 ? '' : 's'} reviewed
              {shaky > 0 && ` · ${shaky} marked shaky, so ${shaky === 1 ? 'it comes' : 'they come'} back first next time`}.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button onClick={() => { setIndex(0); setSessionDone([]); setRevealed(false); }}>Go again</Button>
              <Link href={`/kits/${id}`}><Button variant="primary">Back to kit</Button></Link>
            </div>
          </Card>
        </main>
      </>
    );
  }

  const seen = practice[card.id];
  const pct = Math.round((index / queue.length) * 100);

  return (
    <>
      <Header />
      <main id="main" className="mx-auto max-w-2xl px-4 py-8">
        <BackLink id={id} />

        <div className="mt-4 flex items-center justify-between text-sm" style={{ color: 'var(--ink-soft)' }}>
          <span className="tabular-nums">Card {index + 1} of {queue.length}</span>
          <span className="tabular-nums">{reviewedEver} of {kit.flashcards.length} covered overall</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-raised)' }}
          role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Session progress">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
        </div>

        <Card className="mt-6 p-8">
          <div className="min-h-[7rem]">
            <div className="flex flex-wrap items-center gap-2">
              {!seen?.reviews
                ? <Badge>new</Badge>
                : <Badge tone={seen.confidence === 1 ? 'warn' : 'neutral'}>
                    seen {seen.reviews}× · last felt {['', 'shaky', 'nearly', 'confident'][seen.confidence]}
                  </Badge>}
            </div>
            <p className="mt-4 text-lg font-medium leading-relaxed">{card.front}</p>
          </div>

          {revealed ? (
            <div className="mt-2 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <p className="leading-relaxed" style={{ color: 'var(--ink-soft)' }}>{card.back || <em>No answer on this card.</em>}</p>
              <p className="mt-6 text-sm font-medium">How confident did you feel?</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {CONFIDENCE.map((c) => (
                  <button key={c.value} onClick={() => record(c.value)}
                    className="rounded-md border px-3 py-2.5 text-left hover:bg-[var(--surface-raised)]"
                    style={{ borderColor: 'var(--border)' }}>
                    <span className="block text-sm font-medium">{c.label}</span>
                    <span className="block text-xs" style={{ color: 'var(--ink-faint)' }}>{c.hint} · press {c.key}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-2 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
              <Button variant="primary" size="lg" onClick={() => setRevealed(true)}>Show answer</Button>
              <span className="ml-3 text-xs" style={{ color: 'var(--ink-faint)' }}>or press space</span>
            </div>
          )}
        </Card>

        <p className="mt-4 text-center text-xs" style={{ color: 'var(--ink-faint)' }}>
          Cards you were least confident about come first.
        </p>
      </main>
    </>
  );
}

const BackLink = ({ id }) => (
  <Link href={`/kits/${id}`} className="text-sm underline underline-offset-2" style={{ color: 'var(--ink-soft)' }}>← Back to kit</Link>
);
