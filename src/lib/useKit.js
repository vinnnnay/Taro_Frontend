'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ApiError } from './api';

/**
 * Kit state with optimistic updates.
 *
 * "Make reordering and editing feel immediate rather than round-tripping for
 *  every keystroke."
 *
 * So the change is applied locally at once, sent, and reconciled against the
 * server's authoritative response. On a STALE_REV the server hands back the
 * current kit and we adopt it: the user sees their view correct itself rather
 * than losing a write to a silent failure.
 */
export function useKit(id) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(0);
  const [conflict, setConflict] = useState(false);
  const revRef = useRef(0);

  const adopt = useCallback((next) => {
    setDoc(next);
    revRef.current = next?.rev ?? 0;
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    setLoading(true);
    api.getKit(id, ac.signal)
      .then((r) => { adopt(r.kit); setError(null); })
      .catch((e) => { if (e.name !== 'AbortError') setError(e); })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, [id, adopt]);

  /**
   * @param {Function|null} optimistic  (kit) => kit, applied immediately
   * @param {Function} request          (rev) => Promise<{kit}>
   */
  const mutate = useCallback(async (optimistic, request) => {
    const snapshot = doc;
    if (optimistic && doc?.kit) {
      setDoc((d) => ({ ...d, kit: optimistic(structuredClone(d.kit)) }));
    }
    setSaving((n) => n + 1);
    try {
      const res = await request(revRef.current);
      adopt(res.kit);
      setConflict(false);
      return res;
    } catch (err) {
      if (err instanceof ApiError && err.isStale && err.detail?.kit) {
        // Someone else changed it. Adopt the server's version rather than
        // fight over it, and tell the user their view refreshed.
        adopt({ ...snapshot, kit: err.detail.kit, rev: err.detail.rev });
        setConflict(true);
      } else {
        setDoc(snapshot);          // roll the optimistic change back
        setError(err);
      }
      throw err;
    } finally {
      setSaving((n) => n - 1);
    }
  }, [doc, adopt]);

  return {
    doc, kit: doc?.kit ?? null, loading, error, saving: saving > 0, conflict,
    dismissConflict: () => setConflict(false),
    clearError: () => setError(null),
    adopt, mutate, setDoc,
  };
}

/**
 * Poll a generating kit.
 *
 * Polling rather than SSE: free-tier hosts sit behind proxies that buffer event
 * streams, and a progress feed that silently stops updating is worse than one a
 * second and a half behind. The brief rewards handling a ninety-second
 * generation WELL, not elegantly.
 */
export function useKitStatus(id, active) {
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!id || !active) return;
    let stop = false;
    const ac = new AbortController();
    let delay = 900;

    const tick = async () => {
      if (stop) return;
      try {
        const s = await api.getStatus(id, ac.signal);
        if (stop) return;
        setStatus(s);
        if (s.status === 'ready' || s.status === 'failed') return;
        delay = Math.min(2500, delay * 1.15);     // ease off on a long run
      } catch (e) {
        if (e.name === 'AbortError') return;
        delay = Math.min(8000, delay * 2);        // back off if the server struggles
      }
      setTimeout(tick, delay);
    };
    tick();
    return () => { stop = true; ac.abort(); };
  }, [id, active]);

  return status;
}
