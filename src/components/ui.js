'use client';
import { useEffect, useRef, useState } from 'react';

export function Button({ variant = 'default', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-2.5 py-1 text-xs', md: 'px-3.5 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    default: 'border hover:bg-[var(--surface-raised)]',
    primary: 'text-white hover:opacity-90',
    ghost: 'hover:bg-[var(--surface-raised)]',
    danger: 'border hover:bg-[var(--danger-soft)]',
  };
  const style = variant === 'primary'
    ? { background: 'var(--accent)' }
    : variant === 'danger'
      ? { borderColor: 'var(--border)', color: 'var(--danger)' }
      : { borderColor: 'var(--border)', color: 'var(--ink)' };
  return <button {...props} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} style={{ ...style, ...props.style }} />;
}

export function Badge({ tone = 'neutral', children, title }) {
  const tones = {
    neutral: { background: 'var(--surface-raised)', color: 'var(--ink-soft)' },
    accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
    warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  };
  return (
    <span title={title} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap" style={tones[tone]}>
      {children}
    </span>
  );
}

export function Card({ className = '', children, ...rest }) {
  return (
    <div {...rest} className={`rounded-lg border ${className}`} style={{ borderColor: 'var(--border)', background: 'var(--surface)', ...rest.style }}>
      {children}
    </div>
  );
}

/** Announcements for screen readers that also render visibly. */
export function Toast({ message, tone = 'neutral', onDismiss }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [message, onDismiss]);
  if (!message) return null;
  const tones = {
    neutral: { background: 'var(--surface-raised)', color: 'var(--ink)' },
    warn: { background: 'var(--warn-soft)', color: 'var(--warn)' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)' },
    accent: { background: 'var(--accent-soft)', color: 'var(--accent)' },
  };
  return (
    <div role="status" aria-live="polite"
      className="no-print fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-lg"
      style={{ borderColor: 'var(--border)', ...tones[tone] }}>
      <span>{message}</span>
      <button onClick={onDismiss} aria-label="Dismiss" className="opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

/**
 * Inline editing.
 *
 * Local state while typing so every keystroke is instant; the save fires on
 * blur or Cmd/Ctrl+Enter. Escape reverts. This is what "editing feels
 * immediate rather than round-tripping for every keystroke" means in practice:
 * the network is involved once per edit, not once per character.
 */
export function EditableText({ value, onSave, multiline = false, className = '', placeholder = 'Empty', label }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? '');
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value ?? ''); }, [value, editing]);
  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      ref.current.setSelectionRange(ref.current.value.length, ref.current.value.length);
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== (value ?? '').trim()) onSave(next);
  };

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        aria-label={label ? `Edit ${label}` : 'Edit'}
        className={`w-full cursor-text rounded px-1.5 py-1 text-left hover:bg-[var(--surface-raised)] ${className}`}
      >
        {value?.trim()
          ? value
          : <span style={{ color: 'var(--ink-faint)' }}>{placeholder}</span>}
      </button>
    );
  }

  const Tag = multiline ? 'textarea' : 'input';
  return (
    <Tag
      ref={ref}
      value={draft}
      rows={multiline ? Math.min(10, Math.max(3, draft.split('\n').length + 1)) : undefined}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); setDraft(value ?? ''); setEditing(false); }
        if (e.key === 'Enter' && (!multiline || e.metaKey || e.ctrlKey)) { e.preventDefault(); commit(); }
      }}
      className={`w-full rounded border px-1.5 py-1 ${className}`}
      style={{ borderColor: 'var(--accent)', background: 'var(--surface)', color: 'var(--ink)' }}
    />
  );
}

/** Skeleton rows, so a loading list has the shape of the list that follows. */
export function Skeleton({ rows = 3 }) {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse-soft rounded-lg border p-4" style={{ borderColor: 'var(--border)' }}>
          <div className="h-3 w-2/3 rounded" style={{ background: 'var(--surface-raised)' }} />
          <div className="mt-2.5 h-3 w-1/3 rounded" style={{ background: 'var(--surface-raised)' }} />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-12 text-center" style={{ borderColor: 'var(--border)' }}>
      <p className="font-medium">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-md text-sm" style={{ color: 'var(--ink-soft)' }}>{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="rounded-lg border px-5 py-6" style={{ borderColor: 'var(--danger)', background: 'var(--danger-soft)' }} role="alert">
      <p className="font-medium" style={{ color: 'var(--danger)' }}>{error?.message ?? 'Something went wrong.'}</p>
      {error?.code && <p className="mt-1 text-xs font-mono" style={{ color: 'var(--danger)' }}>{error.code}</p>}
      {onRetry && <Button className="mt-3" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
