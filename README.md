# The AI Interview Prep Kit — web

Frontend for the AI Interview Prep Kit. Next.js (app router) + Tailwind CSS.

This app is a **pure HTTP client** of the API — it shares no packages with the
backend, so the two deploy and version independently.

- **Backend repo:** `<BACKEND_REPO_URL>` — architecture, pipeline and design
  decisions are documented there
- **Live app:** `<LIVE_URL>`

---

## Setup

Requires Node 20+, and the API running (locally on `:4000` by default).

```bash
git clone <THIS_REPO_URL>
cd interview-prep-kit-web
npm install
cp .env.example .env.local     # point NEXT_PUBLIC_API_URL at your API
npm run dev                    # http://localhost:3000
```

One environment variable:

```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_` values are baked into the client bundle at **build** time, not
read at runtime — changing it on Vercel needs a redeploy, not a restart.

## Deploying (Vercel)

1. Import this repository. The framework is detected automatically.
2. Set `NEXT_PUBLIC_API_URL` to the deployed API's base URL, no trailing slash.
3. Deploy, then add the resulting origin to the API's `CORS_ORIGINS`.

That last step is easy to miss: the session is a cookie, so the API allows
credentialed requests only from an explicit origin allowlist. Until the frontend
origin is in it, sign-in will fail with a CORS error.

---

## Structure

```
src/app/            routes: dashboard, new kit, the builder, practice
src/components/     AuthProvider, builder pieces, progress, weak spots, UI primitives
src/lib/api.js      typed API client; every failure carries a stable error code
src/lib/useKit.js   kit state, optimistic updates, conflict reconciliation, polling
```

---

## Interaction decisions

The brief says the interface carries real weight, and that *"polish is welcome
but is not the point; interaction design is"*. The decisions worth naming:

**Provenance is shown, not hidden.** Every question and card is badged
*generated / edited / yours / pinned*, and each category header says how many
items will be kept **before** you press regenerate. Otherwise "will this destroy
my work?" is a question the user can only answer by trying it.

**Editing is local-first.** `EditableText` holds a draft in component state while
typing and saves on blur or Cmd/Ctrl+Enter; Escape reverts. The network is
touched once per edit, not once per keystroke.

**Reordering is optimistic, and works two ways.** Drag-and-drop plus arrow
buttons — drag alone is not keyboard-accessible.

**Conflicts surface rather than silently losing a write.** A `STALE_REV`
response carries the server's current kit; the hook adopts it and tells the user
their view refreshed, instead of discarding their change or overwriting someone
else's.

**Progress is real.** Generation takes ~90 seconds, so the page renders the
pipeline's actual steps — *"crawling acme.test"*, *"checking coverage — 1 gap
remaining"*. A spinner alone leaves a user unable to tell a slow crawl from a
hang. Polling rather than SSE: free-tier hosts sit behind proxies that buffer
event streams, and a feed that silently stops updating is worse than one that is
1.5 seconds behind.

**Honest states are surfaced, not buried.** A thin job description, a company
with no discoverable hiring process, and uncovered must-have requirements each
get a plain notice at the top of the kit.

**Practice mode** steps one card at a time — space to reveal, `1`–`3` to record
confidence. The queue is fetched once per session; recomputing it after every
answer would reshuffle the deck under the user mid-session.

## Accessibility

Skip link, visible focus rings throughout, `aria-live` on generation progress and
toasts, labelled form controls and icon buttons, `prefers-reduced-motion`
respected, and a dark theme driven by the same tokens as the light one so both
stay in step. Usable at phone width with no horizontal scroll.
