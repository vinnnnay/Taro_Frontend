'use client';
import { useState } from 'react';
import { Badge, Button, Card, EditableText } from './ui';

const CATEGORIES = ['technical', 'behavioural', 'system-design', 'company-fit'];
const LABELS = { technical: 'Technical', behavioural: 'Behavioural', 'system-design': 'System design', 'company-fit': 'Company fit' };

/**
 * Provenance, shown rather than hidden.
 *
 * The user needs to know which questions are safe from a regeneration BEFORE
 * they press regenerate, otherwise "will this destroy my work" is a question
 * they can only answer by trying it. This is the visible half of the state
 * model the brief asks about.
 */
function ProvenanceBadge({ item }) {
  if (item.origin === 'manual') return <Badge tone="accent" title="You wrote this. Regenerating will not remove it.">yours</Badge>;
  if (item.origin === 'edited') return <Badge tone="accent" title="You edited this. Regenerating will not remove it.">edited</Badge>;
  if (item.pinned) return <Badge tone="accent" title="Pinned. Regenerating will not remove it.">pinned</Badge>;
  return <Badge tone="neutral" title="Generated and untouched. Regenerating this category will replace it.">generated</Badge>;
}

const DIFFICULTY = { 1: 'Easy', 2: 'Moderate', 3: 'Hard' };

function QuestionRow({ q, index, total, requirements, onEdit, onDelete, onPin, onMove, onReorder, dragging, setDragging }) {
  const [open, setOpen] = useState(false);
  const reqText = (id) => requirements.find((r) => r.id === id);

  return (
    <Card
      className={`p-3 transition-opacity ${dragging === q.id ? 'opacity-40' : ''}`}
      draggable
      onDragStart={(e) => { setDragging(q.id); e.dataTransfer.effectAllowed = 'move'; }}
      onDragEnd={() => setDragging(null)}
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
      onDrop={(e) => { e.preventDefault(); if (dragging && dragging !== q.id) onReorder(dragging, q.id); setDragging(null); }}
    >
      <div className="flex items-start gap-2">
        <span aria-hidden="true" className="mt-1 cursor-grab select-none text-xs" style={{ color: 'var(--ink-faint)' }} title="Drag to reorder">⠿</span>

        <div className="min-w-0 flex-1">
          <EditableText
            value={q.prompt}
            label="question"
            multiline
            className="text-sm font-medium leading-relaxed"
            onSave={(v) => onEdit(q.id, { prompt: v })}
          />

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1.5">
            <ProvenanceBadge item={q} />
            <Badge tone={q.difficulty === 3 ? 'warn' : 'neutral'}>{DIFFICULTY[q.difficulty]}</Badge>
            {(q.requirement_ids ?? []).map((rid) => {
              const r = reqText(rid);
              return r ? <Badge key={rid} tone={r.priority === 'must' ? 'accent' : 'neutral'} title={r.text}>{r.text.slice(0, 28)}{r.text.length > 28 ? '…' : ''}</Badge> : null;
            })}
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-2 px-1.5 text-xs underline underline-offset-2"
            style={{ color: 'var(--ink-soft)' }}
          >
            {open ? 'Hide answer outline' : 'Show answer outline'}
          </button>

          {open && (
            <div className="mt-1.5">
              <EditableText
                value={q.answer_outline}
                label="answer outline"
                multiline
                placeholder="No outline yet — click to write one."
                className="text-sm leading-relaxed"
                onSave={(v) => onEdit(q.id, { answer_outline: v })}
              />
            </div>
          )}
        </div>

        <div className="no-print flex shrink-0 flex-col items-end gap-1">
          <div className="flex gap-0.5">
            <Button size="sm" variant="ghost" aria-label="Move up" disabled={index === 0}
              onClick={() => onReorder(q.id, null, -1)}>↑</Button>
            <Button size="sm" variant="ghost" aria-label="Move down" disabled={index === total - 1}
              onClick={() => onReorder(q.id, null, 1)}>↓</Button>
          </div>
          <select
            aria-label="Move to category"
            value={q.category}
            onChange={(e) => onMove(q.id, e.target.value)}
            className="rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--ink-soft)' }}
          >
            {CATEGORIES.map((c) => <option key={c} value={c}>{LABELS[c]}</option>)}
          </select>
          <div className="flex gap-0.5">
            <Button size="sm" variant="ghost" aria-label={q.pinned ? 'Unpin' : 'Pin so regenerating keeps it'}
              title={q.pinned ? 'Unpin' : 'Pin so regenerating keeps it'}
              onClick={() => onPin(q.id, !q.pinned)}>{q.pinned ? '📌' : '📍'}</Button>
            <Button size="sm" variant="ghost" aria-label="Delete question"
              style={{ color: 'var(--danger)' }} onClick={() => onDelete(q.id)}>✕</Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function QuestionList({ questions, requirements, category, actions, onRegenerate, regenerating }) {
  const [dragging, setDragging] = useState(null);
  const inCategory = questions.filter((q) => q.category === category);
  const protectedCount = inCategory.filter((q) => q.origin !== 'generated' || q.pinned).length;

  const reorder = (id, targetId, delta) => {
    const ids = questions.map((q) => q.id);
    const from = ids.indexOf(id);
    let to;
    if (targetId) to = ids.indexOf(targetId);
    else {
      // Arrow buttons move within the visible category, not the flat array.
      const localIds = inCategory.map((q) => q.id);
      const localFrom = localIds.indexOf(id);
      const neighbour = localIds[localFrom + delta];
      if (!neighbour) return;
      to = ids.indexOf(neighbour);
    }
    if (from === -1 || to === -1) return;
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    actions.reorder('questions', ids);
  };

  return (
    <section aria-labelledby={`h-${category}`} className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`h-${category}`} className="text-sm font-semibold tracking-wide uppercase" style={{ color: 'var(--ink-soft)' }}>
          {LABELS[category]}
          <span className="ml-2 font-normal normal-case" style={{ color: 'var(--ink-faint)' }}>
            {inCategory.length} question{inCategory.length === 1 ? '' : 's'}
          </span>
        </h3>
        <div className="no-print flex items-center gap-2">
          {protectedCount > 0 && (
            <span className="text-xs" style={{ color: 'var(--ink-faint)' }}>
              {protectedCount} will be kept
            </span>
          )}
          <Button size="sm" onClick={() => onRegenerate(category)} disabled={regenerating}>
            {regenerating ? 'Regenerating…' : 'Regenerate'}
          </Button>
          <Button size="sm" variant="ghost"
            onClick={() => actions.add('questions', { prompt: 'New question', category, requirement_ids: [] })}>
            + Add
          </Button>
        </div>
      </div>

      {inCategory.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm"
          style={{ borderColor: 'var(--border)', color: 'var(--ink-faint)' }}>
          No questions in this category.
        </p>
      ) : (
        <div className="space-y-2">
          {inCategory.map((q, i) => (
            <QuestionRow
              key={q.id} q={q} index={i} total={inCategory.length} requirements={requirements}
              dragging={dragging} setDragging={setDragging}
              onEdit={(id, patch) => actions.edit('questions', id, patch)}
              onDelete={(id) => actions.remove('questions', id)}
              onPin={(id, pinned) => actions.pin('questions', id, pinned)}
              onMove={(id, cat) => actions.move(id, cat)}
              onReorder={reorder}
            />
          ))}
        </div>
      )}
    </section>
  );
}
