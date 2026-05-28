---
name: todo
description: >
  Use this skill when the user types /todo, or says "add to todo", "mark todo done",
  "remove from todo", or "what's on my todo". Manages the TODO.md file in the project root —
  adding, completing, or removing small adjustment notes.
version: 0.1.0
tools: Read, Edit
---

# Todo

Manage `TODO.md` in the project root (`/Users/robinlundahl/Desktop/Programmering/quiz/TODO.md`).

Always read the file first so you have the current state before any edit.

## Commands

The user invokes this skill as `/todo <subcommand> <text>`. Infer the subcommand from the args or the natural language around the invocation:

| Subcommand | Aliases / triggers | What to do |
|---|---|---|
| `add <text>` | "add", "note", no subcommand but there is text | Append `- [ ] <text>` before the closing blank line |
| `done <text>` | "done", "finish", "check off", "complete" | Change the first matching `- [ ]` line to `- [x]` |
| `remove <text>` | "remove", "delete", "drop" | Delete the first matching `- [ ]` or `- [x]` line |
| (no args) | `/todo` alone | Read and print all items, grouped by open vs done |

Matching is case-insensitive substring — match the first line whose text contains the user's phrase.

## Rules

- Never rewrite the whole file when a targeted Edit will do.
- Preserve all comments (`<!--` … `-->`) and blank lines.
- Keep the `- [ ]` / `- [x]` prefix exactly — no extra whitespace or punctuation.
- After every change confirm with one line: what changed and the updated list of open items (or "No open items." if empty).
- Do not commit. Do not modify CLAUDE.md or any other file.
