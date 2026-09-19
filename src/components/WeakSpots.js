'use client';
import { Badge, Card } from './ui';

/**
 * Weak spots — the creative feature.
 *
 * The problem: the night before an interview, the useful question is not
 * "what is in my kit" but "what am I least ready for". Everything here is
 * computed from data the app already has -- coverage gaps, requirement
 * priority, practice confidence and recency -- so it is deterministic and
 * needs no extra model call.
 */
export function WeakSpots({ report }) {
  const { spots, summary } = report;

  return (
    <section aria-labelledby="h-weak" className="space-y-3">
      <div>
        <h2 id="h-weak" className="text-lg font-semibold">What you are least ready for</h2>
        <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
          Ranked from your coverage gaps and how confident you felt in practice.
        </p>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
          <Stat label="Must-have requirements" value={summary.must_total} />
          <Stat label="With no question" value={summary.uncovered_must}
            tone={summary.uncovered_must > 0 ? 'danger' : 'accent'} />
          <Stat label="Cards reviewed" value={`${summary.cards_reviewed} / ${summary.cards_total}`} />
          <Stat label="Coverage practised"
            value={summary.readiness === null ? 'no cards yet' : `${summary.readiness}%`} />
        </div>
      </Card>

      {spots.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-faint)' }}>
          Nothing stands out yet. Work through practice mode and this will fill in.
        </p>
      ) : (
        <ol className="space-y-2">
          {spots.map((spot, i) => (
            <Card key={spot.requirement_id} className="p-3.5">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-sm tabular-nums" style={{ color: 'var(--ink-faint)' }}>{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-medium">{spot.text}</span>
                    <Badge tone={spot.priority === 'must' ? 'accent' : 'neutral'}>{spot.priority}</Badge>
                    {spot.coverage === 'uncovered' && <Badge tone="danger">no question</Badge>}
                  </div>
                  <ul className="mt-1.5 space-y-0.5">
                    {spot.reasons.map((r, j) => (
                      <li key={j} className="text-sm" style={{ color: r.kind === 'uncovered' ? 'var(--danger)' : 'var(--ink-soft)' }}>
                        {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          ))}
        </ol>
      )}
    </section>
  );
}

function Stat({ label, value, tone = 'neutral' }) {
  const colors = { neutral: 'var(--ink)', accent: 'var(--accent)', danger: 'var(--danger)' };
  return (
    <div>
      <div className="text-xs" style={{ color: 'var(--ink-faint)' }}>{label}</div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums" style={{ color: colors[tone] }}>{value}</div>
    </div>
  );
}
