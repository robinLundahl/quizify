const CATEGORY_KEY: Record<string, string> = {
  'AI':                  'cat_ai',
  'General Knowledge':   'cat_general_knowledge',
  'Banking & Insurance': 'cat_banking',
  'Dance':               'cat_dance',
  'Design':              'cat_design',
  'Economics':           'cat_economics',
  'Film & TV':           'cat_film_tv',
  'Physics':             'cat_physics',
  'Geography':           'cat_geography',
  'History':             'cat_history',
  'Agriculture':         'cat_agriculture',
  'Law':                 'cat_law',
  'Chemistry':           'cat_chemistry',
  'Communication':       'cat_communication',
  'Art & Literature':    'cat_art_literature',
  'Culture & Tradition': 'cat_culture',
  'Literature':          'cat_literature',
  'Marketing & Sales':   'cat_marketing',
  'Food & Drink':        'cat_food_drink',
  'Mathematics':         'cat_mathematics',
  'Music':               'cat_music',
  'Nutrition':           'cat_nutrition',
  'Travel & Tourism':    'cat_travel',
  'Social Studies':      'cat_social_studies',
  'Sports':              'cat_sports',
  'Languages':           'cat_languages',
  'Security':            'cat_security',
  'Theatre':             'cat_theatre',
  'Technology':          'cat_technology',
  'Entertainment':       'cat_entertainment',
  'Education':           'cat_education',
  'Science':             'cat_science',
}

const LANGUAGE_KEY: Record<string, string> = {
  'Swedish':    'lang_swedish',
  'English':    'lang_english',
  'Norwegian':  'lang_norwegian',
  'Danish':     'lang_danish',
  'German':     'lang_german',
  'French':     'lang_french',
  'Spanish':    'lang_spanish',
}

type TFn = (key: string, opts?: Record<string, unknown>) => string

export function tCategory(value: string, t: TFn): string {
  const key = CATEGORY_KEY[value]
  return key ? t(`quiz_editor.${key}`, { defaultValue: value }) : value
}

export function tLanguage(value: string, t: TFn): string {
  const key = LANGUAGE_KEY[value]
  return key ? t(`quiz_editor.${key}`, { defaultValue: value }) : value
}
