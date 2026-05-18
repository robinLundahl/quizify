---
name: ship
description: Use this skill when the user says "ship", "ship it", "commit this", "let's ship", "validate and commit", or "check and commit". The ship skill runs TypeScript type-checking and ESLint across the full codebase to verify new code integrates cleanly with existing code, then commits with a generated message. It is a pre-commit quality gate — it will stop and report errors rather than committing broken code.
version: 0.1.0
tools: Bash, Read
---

# Ship

Validate that new code integrates cleanly with the existing codebase, then commit.

Work from the project root (`/Users/robinlundahl/Desktop/Programmering/quiz`).

## Step 1 — Assess changes

Run `git status` and `git diff` in parallel to understand what changed.

- If the working tree is **clean** (nothing to commit), tell the user and stop.
- Note which files changed — this informs the commit message.

## Step 2 — Type-check the server

```bash
cd server && ./node_modules/.bin/tsc --noEmit
```

Run from the project root. Use the locally installed tsc binary — do not use `npx tsc` as it installs the wrong package.

- If this **fails**: print the errors clearly, tell the user which files are broken, and stop. Do not proceed to commit.

## Step 3 — Type-check the client

```bash
cd client && ./node_modules/.bin/tsc --noEmit -p tsconfig.app.json
```

Run from the project root. Use the locally installed tsc binary.

- If this **fails**: print the errors clearly and stop. Do not proceed to commit.

## Step 4 — Lint the client

```bash
npm run lint --prefix client
```

- If ESLint exits with **errors** (exit code ≥ 1): print the violations and stop. Do not commit.
- Warnings are acceptable — continue if only warnings are present.

## Step 5 — Commit

All checks passed. Now commit:

1. Stage modified and new tracked files — prefer naming specific files over `git add .` to avoid accidentally including secrets or build artifacts. Skip files matched by `.gitignore`.
2. Generate a concise commit message from `git diff --staged`:
   - Imperative mood, under 72 characters for the subject line
   - If the change spans multiple concerns, add a short body
   - Always append the Co-Authored-By trailer:
     `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
3. Create the commit.

## Step 6 — Archive completed backlog tickets

After a successful commit, check `backlog/` for open tickets that relate to the shipped changes:

1. Read the titles and descriptions of any `.md` files in `backlog/` (excluding `README.md`)
2. Compare them against the committed changes (file names, commit message, diff)
3. If a ticket's work is fully addressed by this commit or prior commits:
   - Move it to `backlog/archive/` (update **Status** to `Done`, check off completed acceptance criteria, add a brief note about what was done)
   - Stage and commit the archive move in a separate commit: `Archive TICKET-NNN (<short reason>)`
4. If no tickets match, skip silently — do not mention it.

## Step 7 — Report

Summarise the result:
- Which checks ran and passed
- What was committed (message + files)
- Any tickets archived
- Whether there is anything left uncommitted

## If any check fails

Show the full output of the failing check, then ask the user:
> "Would you like me to fix this now, or should I abort the ship?"

Do not attempt to fix errors silently — always ask first.
