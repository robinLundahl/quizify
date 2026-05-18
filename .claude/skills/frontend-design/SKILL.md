---
name: frontend-design
description: >
  Apply the Quizify design system when writing or reviewing client-side UI code.
  Use this skill whenever the user asks to "follow the design", "apply the design
  system", "use our design", "check the design", or any time you are writing or
  reviewing React + Tailwind components in the client/ directory. Also use it when
  the user asks about colours, fonts, button styles, spacing, or any visual
  decision — even if they don't explicitly mention the design system. When in
  doubt, load the design file and follow it.
---

# Frontend Design

Read the project design file before writing or reviewing any UI code:

```
/Users/robinlundahl/Desktop/Programmering/quiz/design.md
```

This file is the single source of truth for all visual decisions. Read it in full at the start of every invocation.

## What to apply

### Colours
- **Brand action → Indigo.** Any button, link, focus ring, or interactive element that moves the user forward uses the indigo scale (`indigo-600` primary, `indigo-700` hover, `indigo-500` focus ring).
- **Surfaces → White / Gray.** Cards are `bg-white`, page backgrounds are `bg-gray-50`. Never introduce a new background colour without checking design.md first.
- **Game mode → Dark.** In-game screens (`/host`, `/join` during a question) use `bg-gray-900` full-screen. Lobby/finished screens use `bg-indigo-600` full-screen.
- **Game answer buttons → fixed four colours.** Red → Blue → Yellow → Green. Do not swap or invent new colours for answer options.

### Typography
- No external font is loaded — use Tailwind's default system sans stack.
- Match the scale in design.md (e.g. `text-xs` for labels, `text-sm` for body, `text-2xl` for question text in game).
- Use `font-black` sparingly — only for game-mode display text (join code, titles).

### Component patterns
Always reach for a documented pattern before inventing a new one. The four core patterns are:

| Pattern | Key classes |
|---|---|
| Primary button | `bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition` |
| Ghost / secondary button | `border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm hover:bg-gray-100 transition` |
| Destructive button | `border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 text-sm hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition` |
| Card | `rounded-xl border border-gray-200 bg-white p-5 shadow-sm` |
| Text input | `border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500` |

### Border radius and spacing
- Cards and answer buttons: `rounded-xl`
- Small buttons and inputs: `rounded-lg`
- Pill badges: `rounded-full`
- Standard card padding: `p-5`
- Content max-width: `max-w-5xl` (dashboard/editor), `max-w-2xl` (host game view)

## When reviewing existing UI code

Point out any deviations from the design system:
- Wrong colour (e.g. a `blue-600` primary button instead of `indigo-600`)
- Ad-hoc border radius that doesn't match the documented scale
- A hand-rolled button instead of the documented pattern
- A custom font or colour not present in design.md

Suggest the correct replacement using the documented pattern.

## When writing new UI code

Write Tailwind classes that exactly match the documented patterns. Do not introduce new colours, font weights, border radii, or spacing values unless they clearly aren't covered by design.md — and if so, propose adding them to design.md rather than silently inventing them.
