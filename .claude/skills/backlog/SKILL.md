---
name: backlog
description: >
  Use this skill when the user types /backlog followed by a description,
  or says "create a backlog ticket", "add a ticket", "log a ticket", or
  "new backlog item". It auto-numbers the ticket, generates structured
  markdown, and commits it to backlog/.
version: 0.1.0
tools: Bash, Read, Write
---

# Backlog

Create a new backlog ticket from a description and commit it.

Work from the project root (`/Users/robinlundahl/Desktop/Programmering/quiz`).

## Step 1 — Determine next ticket number

```bash
ls backlog/ backlog/archive/ 2>/dev/null | grep -oE 'TICKET-[0-9]+' | grep -oE '[0-9]+' | sort -n | tail -1
```

Take that number, add 1, and zero-pad to 3 digits (e.g. `056`). If no output, start at `001`.

## Step 2 — Generate ticket content

Use the description the user provided (the text after `/backlog`) to write a complete ticket. Apply judgment:

- **Title**: a short imperative phrase derived from the description (≤ 60 chars)
- **Type**: infer from keywords — "bug"/"broken"/"wrong"/"fix" → Bug; "refactor"/"clean"/"simplify"/"extract" → Refactor; everything else → Feature
- **Priority**: default Medium unless the description contains "urgent", "critical", "blocking", or "high priority" → High
- **Problem / Goal**: expand the description into 2–4 clear sentences that explain the issue or desired outcome
- **Acceptance criteria**: 2–5 concrete, testable bullet points

## Step 3 — Write the file

Write to `backlog/TICKET-NNN.md` using this exact template:

```markdown
# TICKET-NNN — <Title>

**Status:** Open  
**Type:** <Bug | Feature | Refactor>  
**Priority:** <High | Medium | Low>

## Problem

<Expanded description — 2–4 sentences>

## Acceptance criteria

- [ ] <criterion>
- [ ] <criterion>
```

Use `## Problem` for bugs, `## Goal` for features/refactors — whichever reads more naturally.

Do **not** add a `## Resolution` or `## Verification` section — those are added when the ticket is archived after shipping.

## Step 4 — Commit

```bash
git add backlog/TICKET-NNN.md
git commit -m "Add TICKET-NNN: <title>

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

## Step 5 — Report

Tell the user: `Created backlog/TICKET-NNN.md — "<title>"` and stop. Do not offer to implement the ticket unless asked.
