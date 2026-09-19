'use client';
import { Badge, Button, Card } from './ui';

/**
 * The schedule. Allocation happens in code on the server; this only renders it
 * and links each day back to the questions it covers.
 */
export function SchedulePanel({ schedule, questions, onRegenerate, regenerating }) {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const total = schedule.days.reduce((s, d) => s + d.minutes, 0);

  return (
    <section aria-labelledby="h-schedule" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 id="h-schedule" className="text-lg font-semibold">Study schedule</h2>
          <p className="text-sm" style={{ color: 'var(--ink-soft)' }}>
            {schedule.days.length} day{schedule.days.length === 1 ? '' : 's'} · {Math.round(total / 60 * 10) / 10} hours total
          </p>
        </div>
        <Button size="sm" onClick={onRegenerate} disabled={regenerating} className="no-print">
          {regenerating ? 'Rebuilding…' : 'Rebuild schedule'}
        </Button>
      </div>

      <div className="space-y-2">
        {schedule.days.map((day) => (
          <Card key={day.day} className="p-3.5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-medium">
                Day {day.day}
                <span className="ml-2 font-normal text-sm" style={{ color: 'var(--ink-soft)' }}>{day.focus}</span>
              </h3>
              <Badge tone={day.minutes > 120 ? 'warn' : 'neutral'}>{day.minutes} min</Badge>
            </div>

            {day.question_ids.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--ink-faint)' }}>Nothing scheduled.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {day.question_ids.map((id, i) => {
                  const q = byId.get(id);
                  return (
                    <li key={`${id}-${i}`} className="text-sm leading-snug" style={{ color: 'var(--ink-soft)' }}>
                      · {q ? q.prompt : <em>question no longer in this kit</em>}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}
