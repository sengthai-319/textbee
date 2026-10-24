#!/usr/bin/env bash
# Bring the latest textbee (upstream) changes into CrossHub on a new branch.
#
#   scripts/sync-upstream.sh            # merge upstream/main
#   scripts/sync-upstream.sh v2.10.0    # merge a specific upstream tag or branch
#
# It never touches main and never pushes. It stops at the first merge
# conflict so you can resolve it with docs/MAINTAINING.md, then rerun
# with --check to run the checks only.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"

UPSTREAM_URL=https://github.com/textbee/textbee.git
REF=${1:-main}

check_only=false
if [ "$REF" = "--check" ]; then
  check_only=true
fi

if ! $check_only; then
  if [ -n "$(git status --porcelain)" ]; then
    echo "Commit or stash your changes first." >&2
    exit 1
  fi

  git remote get-url upstream >/dev/null 2>&1 || git remote add upstream "$UPSTREAM_URL"
  git fetch origin main
  git fetch upstream --tags "$REF" 2>/dev/null || git fetch upstream --tags

  BRANCH="sync-upstream-$(date +%Y%m%d)"
  git checkout -B "$BRANCH" origin/main

  echo
  echo "New upstream commits:"
  git log --oneline origin/main..FETCH_HEAD || true
  echo

  if ! git merge --no-ff --no-edit FETCH_HEAD -m "Merge textbee upstream ($REF)"; then
    echo
    echo "Merge conflicts. Resolve them (see docs/MAINTAINING.md, 'Resolving conflicts'),"
    echo "then: git add -A && git commit --no-edit && scripts/sync-upstream.sh --check"
    exit 1
  fi
fi

echo
echo "== Things upstream may have brought back =="
status=0

# Billing was removed from this fork. Upstream files for it come back as new files.
if git ls-files | grep -E '^api/src/billing/' | grep -vE 'schemas/(plan|subscription)\.schema\.ts$'; then
  echo "^ billing files are back: delete them (git rm) and drop any calls into them."
  status=1
fi
# The two kept schemas (plan, subscription) still describe old Polar fields; that's expected.
if git grep -nE 'BillingService|BillingModule|polar' -- api/src web/app web/lib web/config \
    ':!*.spec.ts' ':!api/src/billing/schemas/plan.schema.ts' ':!api/src/billing/schemas/subscription.schema.ts'; then
  echo "^ references to billing/Polar: remove them."
  status=1
fi

# Dashboard classes whose meaning differs under HeroUI (see MAINTAINING.md, 'Design system').
# bg-accent is not checked: under HeroUI it is the gold brand color and used on
# purpose, so review any upstream bg-accent by eye (it meant a gray hover before).
if git grep -nE '(^|[^a-z-])(bg|border|ring)-muted([^a-z-]|$)|hsl\(var\(--' -- 'web/app' 'web/components'; then
  echo "^ shadcn-era classes: bg-muted -> bg-default, hsl(var(--x)) -> var(--x)."
  status=1
fi

# The abandoned mailer package textbee still uses; we moved to its successor.
if git grep -n "@nest-modules/mailer" -- api/src api/package.json; then
  echo "^ @nest-modules/mailer is back: use @nestjs-modules/mailer (see MAINTAINING.md)."
  status=1
fi
# Google sign-in must refuse tokens when GOOGLE_CLIENT_ID is unset.
if git grep -n "skipping audience check" -- api/src; then
  echo "^ upstream's Google audience skip is back: it must fail closed (MAINTAINING.md › Security hardening)."
  status=1
fi

# The old brand name in user-facing text.
if git grep -nIi 'textbee\.dev' -- web/app web/components android/app/src/main/res api/src/mail \
    ':!*.spec.ts' ':!*.test.ts' ':!*.test.tsx' ':!api/src/mail/email-templates/defaults.json'; then
  echo "^ textbee.dev links in user-facing text: point them at this server or the fork."
  status=1
fi
if git grep -nIE '"(from|replyTo)": "[^"]+' -- api/src/mail/email-templates/defaults.json; then
  echo "^ bundled email senders must stay empty, so mail goes out from MAIL_FROM."
  status=1
fi
if git grep -nIw 'textbee' -- api/src/mail/email-templates/defaults.json | grep -v '"_about"'; then
  echo "^ the textbee name is back in email copy: say CrossHub."
  status=1
fi

echo
echo "== Checks =="
(cd api && pnpm install --frozen-lockfile && pnpm build && pnpm test --silent)
(cd web && pnpm install --frozen-lockfile && pnpm typecheck && pnpm lint && pnpm test)

echo
if [ $status -ne 0 ]; then
  echo "Checks passed, but fix the items flagged above before opening the PR."
  exit 1
fi
echo "All good. Run the browser tests too (cd web && pnpm test:e2e), then push this branch and open a PR."
