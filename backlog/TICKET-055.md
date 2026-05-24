# TICKET-055 — Translate AI generation dropdown options

**Status:** Open  
**Type:** Bug  
**Priority:** Medium

## Problem

When the app UI is switched to English, the labels in the AI generation panel (CATEGORY, DIFFICULTY, WITH IMAGE, LANGUAGE) translate correctly, but all the `<option>` values inside the dropdowns remain in Swedish ("Historia", "Medel", "Utan bild", "Svenska", etc.).

Root cause: the option labels in `QuizMetaForm` inside `client/src/pages/QuizEditor.tsx` are hardcoded Swedish strings instead of going through `t()`. Additionally, the `value` attributes for the category and language dropdowns are Swedish words (e.g. `"Historia"`, `"Svenska"`) that get sent directly to the Claude prompt — these should be language-neutral English strings so they work correctly regardless of UI language.

## Affected file

`client/src/pages/QuizEditor.tsx` — `QuizMetaForm` component, lines ~1027–1170.

Four dropdowns are affected:

| Dropdown | Hardcoded strings | Fix |
|---|---|---|
| Category | `AI_CATEGORIES` array (`'Historia'`, `'Vetenskap'`, …) | Add i18n keys; change `value` to English |
| Language | `['Svenska', 'Engelska', …]` | Add i18n keys; change `value` to English name |
| Difficulty | `'Lätt'`, `'Medel'`, `'Svår'` | Add i18n keys; `value` stays `easy/medium/hard` |
| With image | `'Utan bild'`, `'Med bild'` | Add i18n keys; `value` stays `false/true` |

## Fix

### 1. Change `AI_CATEGORIES` to use English values with translated labels

Replace the flat string array with an array of `{ value: string; label: string }` objects where `value` is the English category name (sent to Claude) and `label` comes from i18n:

```ts
const AI_CATEGORIES = [
  { value: 'History',           labelKey: 'cat_history' },
  { value: 'Science',           labelKey: 'cat_science' },
  { value: 'Sports',            labelKey: 'cat_sports' },
  { value: 'Geography',         labelKey: 'cat_geography' },
  { value: 'Film & TV',         labelKey: 'cat_film_tv' },
  { value: 'Music',             labelKey: 'cat_music' },
  { value: 'Food & Drink',      labelKey: 'cat_food_drink' },
  { value: 'Technology',        labelKey: 'cat_technology' },
  { value: 'Literature',        labelKey: 'cat_literature' },
  { value: 'General Knowledge', labelKey: 'cat_general_knowledge' },
  { value: 'Mathematics',       labelKey: 'cat_mathematics' },
  { value: 'Physics',           labelKey: 'cat_physics' },
  { value: 'Chemistry',         labelKey: 'cat_chemistry' },
  { value: 'Social Studies',    labelKey: 'cat_social_studies' },
  { value: 'Languages',         labelKey: 'cat_languages' },
  { value: 'Art & Literature',  labelKey: 'cat_art_literature' },
  { value: 'AI',                labelKey: 'cat_ai' },
  { value: 'Security',          labelKey: 'cat_security' },
  { value: 'Communication',     labelKey: 'cat_communication' },
  { value: 'Design',            labelKey: 'cat_design' },
  { value: 'Economics',         labelKey: 'cat_economics' },
  { value: 'Banking & Insurance', labelKey: 'cat_banking' },
  { value: 'Marketing & Sales', labelKey: 'cat_marketing' },
  { value: 'Law',               labelKey: 'cat_law' },
  { value: 'Agriculture',       labelKey: 'cat_agriculture' },
  { value: 'Nutrition',         labelKey: 'cat_nutrition' },
  { value: 'Travel & Tourism',  labelKey: 'cat_travel' },
  { value: 'Culture & Tradition', labelKey: 'cat_culture' },
  { value: 'Dance',             labelKey: 'cat_dance' },
  { value: 'Theatre',           labelKey: 'cat_theatre' },
  { value: 'Entertainment',     labelKey: 'cat_entertainment' },
]
```

Update the category `<select>`:
```tsx
{AI_CATEGORIES.map((c) => (
  <option key={c.value} value={c.value}>{t(`quiz_editor.${c.labelKey}`)}</option>
))}
```

Update `useState` default: `useState('History')`.

### 2. Language dropdown — use English names as values

Define language options with neutral English `value`:
```ts
const AI_LANGUAGES = [
  { value: 'Swedish',  labelKey: 'lang_swedish' },
  { value: 'English',  labelKey: 'lang_english' },
  { value: 'Norwegian',labelKey: 'lang_norwegian' },
  { value: 'Danish',   labelKey: 'lang_danish' },
  { value: 'German',   labelKey: 'lang_german' },
  { value: 'French',   labelKey: 'lang_french' },
  { value: 'Spanish',  labelKey: 'lang_spanish' },
]
```

Update `useState` default: `useState('Swedish')`.

### 3. Difficulty and With Image — translate labels only, values unchanged

Difficulty:
```tsx
<option value="easy">{t('quiz_editor.difficulty_easy')}</option>
<option value="medium">{t('quiz_editor.difficulty_medium')}</option>
<option value="hard">{t('quiz_editor.difficulty_hard')}</option>
```

With image:
```tsx
<option value="false">{t('quiz_editor.without_image')}</option>
<option value="true">{t('quiz_editor.with_image_option')}</option>
```

### 4. Add i18n keys

Add all new keys under `quiz_editor` in both `client/src/locales/sv.json` and `en.json`.

**sv.json** (sample):
```json
"cat_history": "Historia",
"cat_science": "Vetenskap",
"lang_swedish": "Svenska",
"lang_english": "Engelska",
"difficulty_easy": "Lätt",
"difficulty_medium": "Medel",
"difficulty_hard": "Svår",
"without_image": "Utan bild",
"with_image_option": "Med bild"
```

**en.json** (sample):
```json
"cat_history": "History",
"cat_science": "Science",
"lang_swedish": "Swedish",
"lang_english": "English",
"difficulty_easy": "Easy",
"difficulty_medium": "Medium",
"difficulty_hard": "Hard",
"without_image": "Without image",
"with_image_option": "With image"
```

## Acceptance criteria

- [ ] All dropdown options display in the current UI language (sv/en)
- [ ] Switching language updates the option labels immediately without page reload
- [ ] The values sent to the Claude prompt are unchanged and correct (English category/language names, `easy/medium/hard`, `true/false`)
- [ ] TypeScript and ESLint pass

## Verification

1. `npm run dev`
2. Switch UI to English
3. Open a quiz editor → click AI-generera
4. Confirm all dropdown options are in English (History, Science, Easy, Medium, Hard, Without image, etc.)
5. Switch back to Swedish → confirm options revert to Swedish
6. Generate 1 question in English UI → confirm Claude still returns the correct language and category
