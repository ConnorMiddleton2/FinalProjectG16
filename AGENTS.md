<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Cursor Cloud specific instructions

### What this app is

Harborline Property Management — a Next.js 16 (App Router, Turbopack) + Tailwind/daisyUI app with
Supabase Auth. The public landing page (`/`) needs no backend. Login/signup and the role
workspaces (`/workspace`, `/owner`, `/manager`, `/tenant`, `/maintenance`, `/accounting`) require
Supabase env vars and a `profiles` table.

Standard commands live in `package.json`: `npm run dev`, `npm run build`, `npm run lint`.

### Supabase is required for the auth flow

The app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.local`
(gitignored). Without them:
- `npm run dev` still serves the landing page, but any auth route throws
  "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY".
- `npm run build` FAILS while prerendering the auth-gated pages. Set the env vars before building.

Two ways to supply Supabase:
1. Hosted project — set `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (secrets or
   `.env.local`) to a real project that has the `profiles` schema from
   `supabase/migrations/`.
2. Self-contained local stack (used to validate this environment) — see below.

### Running the self-contained local Supabase stack

Docker + the Supabase CLI are used for the local stack (installed during environment setup; if a
fresh VM lacks them, reinstall Docker CE and the `supabase` CLI). Non-obvious gotchas:
- Docker 29 here needs `fuse-overlayfs`; `/etc/docker/daemon.json` must set
  `"storage-driver": "fuse-overlayfs"` and `"features": { "containerd-snapshotter": false }`,
  and iptables must be switched to `iptables-legacy`. Start the daemon with `sudo dockerd` (no
  systemd in this container).
- After the daemon is up, run `sudo chmod 666 /var/run/docker.sock` so the `supabase` CLI can
  reach Docker without sudo.
- Start the stack from the repo root: `supabase start` (first run pulls several GB of images).
  Reset/apply the committed schema with `supabase db reset --local`.
- Create `.env.local` pointing at the local API. The local keys are the standard deterministic
  Supabase dev keys (from `supabase status`):
  - `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- Restart `npm run dev` after writing `.env.local` (Next only reads env at startup).

### Schema notes (see `supabase/migrations/`)

- The `profiles` table has RLS plus explicit `grant`s to `authenticated`/`anon`. The grants are
  required: without table-level grants the app shows "permission denied for table profiles" on the
  role switcher, and the profile SELECT silently falls back to the `manager` role.
- A `handle_new_user` trigger on `auth.users` auto-creates a `profiles` row from the signup
  metadata (`full_name`, `role`), so a new signup lands in the workspace with the chosen role.
- Local Supabase has email confirmation disabled, so signup returns a session immediately and
  redirects straight into the workspace.
