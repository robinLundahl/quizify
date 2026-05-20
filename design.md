# Quizify — Frontend Design

## Typography

**Font:** System sans-serif stack (Tailwind default)
```
ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
```

No external font is currently loaded. If a custom font is added later, update this section.

**Scale used:**
| Class | Usage |
|---|---|
| `text-xs` | Labels, metadata, option lists |
| `text-sm` | Body text, buttons, inputs |
| `text-base` | Section headings |
| `text-lg` / `text-xl` | Sub-headings, scores |
| `text-2xl` | Question text in game |
| `text-3xl` / `text-4xl` | Game titles, join code |
| `text-6xl` | Join code display on host lobby |

**Weight:** `font-medium` for UI labels, `font-semibold` for headings, `font-bold` / `font-black` for game mode display text.

---

## Color Palette

### Brand — Hot Pink (logo-derived)
The primary color used for actions, focus rings, and the host/lobby screens.
Derived from the Robin Lundahl logo gradient: golden amber → orange-coral → hot pink.

| Token | Hex | Usage |
|---|---|---|
| `indigo-50` | `#fff0f6` | Subtle button backgrounds, badges |
| `indigo-100` | `#ffdde9` | Hover tints |
| `indigo-300` | `#f9a0c4` | Loading spinner ring |
| `indigo-400` | `#f5669c` | Border highlights, focus borders |
| `indigo-500` | `#f2508a` | Focus rings, secondary buttons |
| `indigo-600` | `#ef3f7f` | Primary buttons, brand colour, lobby backgrounds |
| `indigo-700` | `#d02e6a` | Hover state on primary buttons |

### Neutral — Gray
Used for all text, borders, and surface backgrounds.

| Token | Hex | Usage |
|---|---|---|
| `white` | `#ffffff` | Card surfaces, inputs |
| `gray-50` | `#f9fafb` | Page backgrounds (editor, dashboard) |
| `gray-200` | `#e5e7eb` | Dividers, card borders |
| `gray-300` | `#d1d5db` | Input borders, disabled states |
| `gray-400` | `#9ca3af` | Placeholder text, secondary labels |
| `gray-500` | `#6b7280` | Body text, descriptions |
| `gray-600` | `#4b5563` | Stronger body text |
| `gray-700` | `#374151` | Dark labels |
| `gray-800` | `#1f2937` | Near-black text |
| `gray-900` | `#111827` | Game mode dark background |

### Semantic
| Token | Usage |
|---|---|
| `green-400` / `green-500` | Correct answer reveal, success states |
| `red-400` / `red-500` / `red-600` | Errors, delete actions, incorrect reveal |
| `yellow-400` | Gold leaderboard position |
| `amber-600` | Bronze leaderboard position |

### Game Answer Options
Four fixed colours used for MC/TF answer buttons (matches Kahoot convention):

| Position | Color | Token |
|---|---|---|
| 1 | Red | `bg-red-500` |
| 2 | Blue | `bg-blue-500` |
| 3 | Yellow | `bg-yellow-500` |
| 4 | Green | `bg-green-500` |

---

## Surfaces & Backgrounds

| Context | Background |
|---|---|
| Dashboard / Editor | `bg-gray-50` (page), `bg-white` (cards) |
| Host lobby | `bg-indigo-600` full-screen |
| Game — question / reveal | `bg-gray-900` full-screen |
| Player — lobby / finished | `bg-indigo-600` full-screen |

---

## Border Radius

| Class | Usage |
|---|---|
| `rounded-lg` | Inputs, small buttons, list items |
| `rounded-xl` | Cards, question cards, answer buttons |
| `rounded-2xl` | Join code display block |
| `rounded-full` | Badges, avatar images, pill labels |

---

## Spacing & Layout

- Max content width: `max-w-5xl` (dashboard, editor)
- Game views: full-screen, `max-w-2xl` centred column on host; full-width on player mobile
- Card padding: `p-5` standard, `px-6 py-4` for leaderboard rows
- Section gaps: `space-y-3` for question lists, `gap-4` for grids

---

## Component Patterns

### Primary Button
```
bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium
hover:bg-indigo-700 disabled:opacity-50 transition
```

### Secondary / Ghost Button
```
border border-gray-300 text-gray-600 rounded-lg px-3 py-1.5 text-sm
hover:bg-gray-100 transition
```

### Destructive Button
```
border border-gray-200 text-gray-500 rounded-lg px-3 py-1.5 text-sm
hover:border-red-200 hover:bg-red-50 hover:text-red-600 transition
```

### Text Input
```
border border-gray-300 rounded-lg px-3 py-2 text-sm
focus:outline-none focus:ring-2 focus:ring-indigo-500
```

### Card
```
rounded-xl border border-gray-200 bg-white p-5 shadow-sm
```

---

## Dark Mode

Dark mode is toggled via a `dark` class on `<html>` (controlled by the theme dropdown in the Dashboard header). Tailwind v4 class-based dark variant is enabled via `@custom-variant dark (&:where(.dark, .dark *));` in `index.css`. Theme persists to `localStorage` under key `theme`.

Game-mode screens (`/host`, `/join`) are excluded — they are already full-screen dark or brand-colour and are unaffected by the toggle.

### Surface mapping

| Light token | Dark token | Usage |
|---|---|---|
| `bg-gray-50` | `dark:bg-gray-900` | Page background |
| `bg-white` | `dark:bg-gray-800` | Cards, modals, headers |
| `border-gray-100` / `border-gray-200` | `dark:border-gray-700` / `dark:border-gray-800` | Borders, dividers |
| `text-gray-900` | `dark:text-gray-100` | Headings |
| `text-gray-700` | `dark:text-gray-300` | Body text |
| `text-gray-500` | `dark:text-gray-400` | Secondary text |
| `text-gray-400` | `dark:text-gray-500` | Tertiary / metadata |
| `bg-gray-100` | `dark:bg-gray-700` | Hover states, inline tags |
| `bg-indigo-50` | `dark:bg-indigo-900/30` | Soft brand tints |
| `bg-white/90` | `dark:bg-gray-900/90` | Sticky header (blur) |

Brand colours (`indigo-600/700`) and semantic colours (green, red, yellow) are unchanged in both modes.

---

## Design Principles

1. **Indigo = action.** Any interactive element that moves the user forward is indigo.
2. **Gray scale for content.** Reading surfaces and text never compete with the brand colour.
3. **Full-screen game mode.** Once a game starts, the UI goes edge-to-edge with high contrast — designed to be read from across a room on the host screen and on a phone for players.
4. **Mobile-first for players.** Player views (`/join`) are built for portrait phones; host views (`/host/:id`) are designed for a laptop or projector.
