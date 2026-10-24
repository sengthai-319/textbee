# CrossHub

A fork of textbee/textbee (an SMS gateway: NestJS API in `api/`, Next.js dashboard in `web/`, Android app in `android/`) that adds iPhone support (`macos/` Mac relay, iPhone Shortcut), removes billing, rebrands to CrossHub and restyles the dashboard with HeroUI.

Read `docs/MAINTAINING.md` before changing code. It lists every place this fork differs from textbee, how to merge upstream releases (`scripts/sync-upstream.sh`), and the dashboard design rules.

Key rules:
- Pull devices (`transport: 'pull'`) must never reach the FCM push path.
- Don't reintroduce billing (`api/src/billing/` is deleted apart from two schemas).
- Dashboard: use `web/components/ui/*`, color by role (`bg-surface`, `bg-default`, `bg-accent`, `text-muted`), never `bg-muted` or `hsl(var(--x))`.
- Keep bundled email senders in `api/src/mail/email-templates/defaults.json` empty.
- Security rules this fork adds (keep them on upstream merges): Google sign-in fails closed without `GOOGLE_CLIENT_ID`; API keys can't manage API keys (`SessionOnly`); failed logins capped per account; DB/Redis never published in `docker-compose.yaml`. See docs/MAINTAINING.md › Security hardening.
- Single sign-on: docs/SSO.md. Settings live in the top-level `.env` and reach both containers.
- Before merging: `cd api && pnpm test`; `cd web && pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e`.
