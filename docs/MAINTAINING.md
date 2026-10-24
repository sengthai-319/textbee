# Maintaining CrossHub

This guide is for whoever maintains this repository. It covers what CrossHub changes from textbee, how to bring in new textbee releases, the dashboard's design rules, and the checks to run before merging.

For setting up a server and phones, see [SETUP.md](SETUP.md).

## Contents

1. [What CrossHub is](#1-what-crosshub-is)
2. [What differs from textbee](#2-what-differs-from-textbee)
3. [Pulling new textbee features](#3-pulling-new-textbee-features)
4. [Dashboard design system](#4-dashboard-design-system)
5. [Working on the code](#5-working-on-the-code)
6. [Shipping a change](#6-shipping-a-change)
7. [Known issues](#7-known-issues)

---

## 1. What CrossHub is

CrossHub is a fork of [textbee/textbee](https://github.com/textbee/textbee). We keep textbee's server, dashboard and Android app, and add iPhone support, our own branding and our own design. Everything else (the queue, webhooks, bulk sending, the API) is textbee's code, and we take textbee's improvements to it.

Two git remotes:

| Remote | Repository | Used for |
|---|---|---|
| `origin` | `sengthai-319/textbee` | Our code. Everything is pushed here. |
| `upstream` | `textbee/textbee` | Read only. New textbee releases come from here. |

A fresh clone only has `origin`. Add the other once:

```bash
git remote add upstream https://github.com/textbee/textbee.git
```

## 2. What differs from textbee

These are the places where our code and textbee's disagree on purpose. They are where merge conflicts happen, so know them before you sync.

### iPhone support (new code, rarely conflicts)

| What | Where | Notes |
|---|---|---|
| Pull transport | `api/src/gateway/pull-transport.ts`, plus `pull` branches in `gateway.service.ts` and `queue/sms-queue.processor.ts` | Devices with `transport: 'pull'` are never pushed to. They claim messages with `GET /gateway/devices/:id/messages/pending` and report with `PATCH /gateway/devices/:id/sms-status`. |
| `transport`, `os: macOS/iOS` on devices | `gateway.dto.ts`, `os-version.ts` | Without these, textbee treats every device as Android. |
| Mac relay | `macos/` | One stdlib-only Python file. Its filename and config folder (`textbee_mac.py`, `textbee-mac`) keep the old name so existing installs keep working. |
| iPhone Shortcut | `web/.../devices/iphone-shortcut-panel.tsx`, SETUP.md section S | Registers a pull device from the dashboard. |
| No Android update prompts for pull devices | `web/.../devices/update-app-helpers.ts` | |

### Billing removed (deleted code, conflicts often)

textbee.dev is a paid hosted service; this server is self-hosted, so plans, limits and Polar payments were removed.

- `api/src/billing/` is deleted except `schemas/plan.schema.ts` and `schemas/subscription.schema.ts`, which other code still reads.
- Calls into the billing service, such as plan checks before sending and the device-limit check, were removed from `gateway.service.ts` and the other services.
- The dashboard has no billing, plan or upgrade pages, and "Sent today" replaces the usage meters.
- `notifications/context-loader.ts` keeps its own copy of `PAID_MONTHLY_LIMIT_MULTIPLIER`.

### Branding (edited text, conflicts sometimes)

- Product name **CrossHub** in the dashboard, emails (`api/src/mail/`), Android strings and the README.
- Bundled email copy lives in `api/src/mail/email-templates/defaults.json`. Its senders are **empty on purpose**, so mail goes out from this server's `MAIL_FROM`. textbee's file has `notifications@textbee.dev`, which other mail servers reject as spoofed.
- Logos are in `docs/images/` and `web/components/shared/brand.tsx`.
- Internal names were kept to keep merges small: the npm package names, the Android package `com.vernu.sms`, and the Mac relay's file names.

### Dashboard design (rewritten styles, conflicts often in `web/`)

The dashboard uses HeroUI's design system with our charcoal + gold palette. See [section 4](#4-dashboard-design-system). Upstream dashboard changes still work after a merge, but their class names may need translating.

## 3. Pulling new textbee features

**Short answer:** when textbee releases something, we merge their `main` into a new branch, fix the few places where our changes overlap theirs, run the tests, and merge it like any other PR. Our iPhone support, branding and design stay; their new features come in. Nothing happens automatically: until we merge, CrossHub simply doesn't have the new feature.

### How often

Check textbee's [releases](https://github.com/textbee/textbee/releases) about once a month, or when you hear of a feature you want. Small, frequent syncs are much easier than one big one: the conflicts stay small and you remember why things are the way they are.

### Step by step

1. **Run the sync script** from the repository root:
   ```bash
   scripts/sync-upstream.sh            # latest textbee main
   scripts/sync-upstream.sh v2.10.0    # or a specific release tag
   ```
   It creates a branch `sync-upstream-YYYYMMDD` from our `main`, lists textbee's new commits, and merges them. It never touches `main` and never pushes.

2. **If it stops with conflicts,** resolve them with the table below, then:
   ```bash
   git add -A && git commit --no-edit
   scripts/sync-upstream.sh --check
   ```

3. **Read the checks.** After merging, the script looks for things upstream tends to bring back (billing files, Polar references, old class names, textbee.dev links, email senders). Then it runs the API and dashboard tests. Fix whatever it flags.

4. **Run the browser tests:**
   ```bash
   cd web && pnpm test:e2e
   ```

5. **Look at it.** Start the stack (`docker compose up -d --build`), open the pages the new feature touches, and check them in dark and light mode.

6. **Push and open a PR** titled like "Merge textbee v2.10.0". Merge it with a **merge commit**, not squash or rebase, so git remembers which textbee commits are already in. Otherwise the next sync re-applies them and conflicts again.

### Resolving conflicts

| Conflict | What to do |
|---|---|
| A file we deleted was changed upstream (`deleted by us`), usually under `api/src/billing/` | Keep it deleted: `git rm <file>`. If the upstream change is something we want (rare), move that piece of logic somewhere else instead. |
| New upstream code calls the billing service, such as a plan check before sending | Remove the call. On a self-hosted server there is no plan to check. |
| `gateway.service.ts` or `sms-queue.processor.ts` | Keep both: their change, and our `isPullDevice(...)` branches. Pull devices must never reach the FCM/Firebase code path. |
| Email copy or `defaults.json` | Take their new templates, then rename textbee to CrossHub in the copy and keep `senders` empty. |
| A dashboard component in `web/` | Take their logic and keep our markup classes. Translate any shadcn classes they add (see section 4). |
| `components/ui/*` | Keep ours. These files are where HeroUI is applied. If they added a new primitive, restyle it with HeroUI classes. |
| `pnpm-lock.yaml` | Don't fix it by hand. Take either side, then run `pnpm install` in `api/` or `web/` to regenerate it. |
| `android/app/build.gradle` | Take their version bump. Keep our `apiBaseUrl` and `dashboardUrl` properties and the `CrossHub` app name. |
| `README.md` | Keep ours. |

If you can't tell which side to keep, keep both and let the tests decide.

### Deciding whether to take a feature

Most textbee features are worth having: send/receive improvements, queue fixes, webhooks, security fixes. Leave out anything that only matters to their paid hosted service: billing, plans, upgrade prompts, Polar, usage emails, and admin tooling for textbee.dev.

When a new feature assumes every device is an Android phone, check it against pull devices too. Examples are anything that sends a push, reads SIM details, or expects delivery reports. The Mac relay and the Shortcut report `sent` or `failed`, never `delivered`.

## 4. Dashboard design system

The dashboard uses [HeroUI v3](https://heroui.com) styles (`@heroui/styles`, MIT license) on our own components.

### How it fits together

- `web/styles/main.css` imports `@heroui/styles` and sets our palette as HeroUI's color variables, for light (`:root`) and dark (`.dark`). Change the colors there, nowhere else.
- `web/components/ui/*` are our building blocks: Button, Card, Dialog, Tabs, Input, Select, and so on. They keep the shadcn/Radix behavior (events, focus handling, `asChild`) and render HeroUI's classes (`button button--primary`, `card`, …). Pages use these, never HeroUI's React components directly. Swapping their behavior for HeroUI's React Aria versions would touch every form in the app.

### Rules

1. **Use the building blocks.** Dialogs use `Dialog` with `DialogHeader`, `DialogTitle`, `DialogDescription` and a `DialogFooter` that holds the actions. Cancel/secondary actions use `outline`; the main action is the default variant, on the right.
2. **Colors by role, never by value:**

   | Use | Class |
   |---|---|
   | Page background | `bg-background` |
   | Cards and panels | `Card`, or `bg-surface` |
   | Boxes inside a card | `bg-surface-secondary` |
   | Neutral fills: hover, chips, tab tracks | `bg-default` |
   | Brand gold: main buttons, links, active states | `bg-accent` / `text-accent` (alias: `primary`) |
   | Soft tinted notices | `bg-warning-soft`, `bg-danger-soft`, `bg-success-soft`, `bg-accent-soft` |
   | Secondary text | `text-muted` (alias: `text-muted-foreground`) |
   | Lines | `border-border`, dividers `bg-separator` / `divide-separator` |

3. **Two class names changed meaning** from shadcn to HeroUI. Watch for them in upstream code:
   - `bg-muted` was a gray background. Under HeroUI `muted` is a text color, so use `bg-default`.
   - `bg-accent` was a gray hover. Under HeroUI it is our gold, so use `bg-default` for hovers.
   - `hsl(var(--x))` no longer works because the variables hold full colors. Write `var(--x)`.
4. **Keep it quiet.** These patterns were removed on purpose; don't bring them back:
   - uppercase monospace labels
   - double borders around cards
   - colored outlines on tinted boxes
   - icon tiles next to headings or stats
5. **Same thing, same look.** Pill switchers (tabs, route tabs, the theme switch) share `segmentedList` / `segmentedItem` from `components/ui/tabs.tsx`. Numbered setup instructions use `components/shared/steps.tsx`.
6. **Sentence case** for headings and buttons: "API keys", "Add device".
7. **Check both themes and a phone width** (375px) before merging a UI change.

### Updating HeroUI

The version is pinned exactly in `web/package.json`. To update it, change both `@heroui/react` and `@heroui/styles` to the same new version and run `pnpm install`. Then run the e2e tests and look at the dashboard, dialogs and forms in both themes.

## 5. Working on the code

| Part | Run | Test |
|---|---|---|
| API (`api/`) | `pnpm start:dev` (needs MongoDB and Redis; `docker compose up -d textbee-db textbee-redis` starts both) | `pnpm test` (Jest) |
| Dashboard (`web/`) | `pnpm dev` | `pnpm typecheck`, `pnpm lint`, `pnpm test` (Vitest), `pnpm test:e2e` (Playwright, uses a mocked API) |
| Mac relay (`macos/`) | `python3 textbee_mac.py run` | `python3 textbee_mac.py test --to +1…` sends one real message |
| Android (`android/`) | Android Studio. Point it at your server with `-PapiBaseUrl=http://<server>:3001/api/v1/` | GitHub Actions builds it on changes to `android/` |

After changing an API endpoint, regenerate the public API description with `cd api && pnpm export:openapi` and commit `api/openapi.json`.

## 6. Shipping a change

1. Work on a branch and open a PR to `main`.
2. Before merging, run the API tests, the dashboard type check, lint, unit tests and e2e tests (the sync script's `--check` runs all but e2e).
3. Merge with a merge commit.
4. Update the server, on the iMac:
   ```bash
   cd textbee && git pull && docker compose up -d --build
   ```
   The Mac relay only needs updating when `macos/` changed: copy the new `textbee_mac.py` to the MacBook and restart it (`python3 textbee_mac.py uninstall-agent && python3 textbee_mac.py install-agent`).

## 7. Known issues

- **`USE_SMS_QUEUE=false` still turns the queue on.** Inherited from textbee: the value is read as the text `"false"`. Remove the line to turn the queue off.
- **Firebase is optional.** Without `FIREBASE_PROJECT_ID`, Android push is off and only pull devices (Mac relay, Shortcut) receive messages.
