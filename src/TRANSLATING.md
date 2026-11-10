# Translating One Step Now and Ride the Wave

Two free self-help websites: **One Step Now** (focus tools for people with ADHD) and **Ride the Wave**
(self-help tools for OCD based on exposure and response prevention, ERP). Readers may be stressed,
distracted or anxious, so the writing is short, warm, plain and never clinical or preachy.

For language code `xx` you write two files in `src/i18n/`:

1. `xx.json`: every text shown on the pages. Same structure as `en.json`.
2. `engine.xx.json`: the rules that turn a typed task into small steps. Same structure as `engine.en.json`.

## Style

- Translate meaning, not words. It must read as if a native speaker wrote it. Keep sentences short.
- Address the reader informally and warmly (tú, tu, du, ty, ты, 你). Avoid gendered forms for the reader
  where the language allows it (rephrase rather than use slashes or special characters).
- Use the terms people in that language actually use for ADHD, OCD and ERP (for example TDAH, TOC, ADHS,
  СДВГ, ОКР, Zwangsstörung, DOC, 强迫症, and the usual local name for exposure and response prevention,
  giving the full term once where the English does).
- Keep the site names **One Step Now** and **Ride the Wave** in English.
- Keep it accurate. The OCD content is deliberate: it never reassures the reader that a fear is untrue,
  and it encourages sitting with uncertainty. Do not soften that into reassurance.
- Do not add phone numbers, organisations or links. Where the English links to chadd.org or iocdf.org,
  keep the link and add a short note that the site is in English.
- `common.credit` must be translated faithfully and completely, keeping "Claude AI", "Owen" and the ❤️.
- Avoid idioms that don't travel; replace them with a natural local equivalent (for example "parking lot"
  for stray thoughts can become whatever is natural: a notepad, a "for later" list).

## `xx.json` rules

- Same keys as `en.json`, same list lengths. Translate values only.
- Keep `{placeholders}` exactly (`{n}`, `{t}`, `{site}`, `{time}`, `{m}`, `{a}`, `{b}`, `{p}`). Numbers are
  inserted there, so phrase strings so they work for any number (that is why the English says
  "Times practised: {n}" rather than "{n} times").
- Keys ending in `_html` contain HTML. Keep every tag and attribute exactly; translate the text between.
- `meta`: `code` is the language code, `name` is the language's own name (Español, Français, 中文...),
  `html_lang` is the HTML lang value (es, fr, pt, cs, ru, de, it, zh-Hans), and `lang_offer` says
  "Read this page in <this language>" in that language.
- `adhd.title` and `ocd.title` are browser/search titles: site name first, then a short description, under
  70 characters if possible. `meta_desc` under 160 characters if possible.

Check: `python3 src/validate_i18n.py xx` must print `xx: OK`.

## `engine.xx.json` rules

The site splits a task the reader types ("clean my room and call mum") into steps, with no AI: keywords
pick one of 41 hand-written step lists; anything else gets the general method.

```json
{
 "cjk": false,
 "leadIns": ["tengo que", "necesito", "..."],
 "then": ["luego", "despues", "..."],
 "and": ["y", "e"],
 "generic": ["... {task} ...", "..."],
 "templates": { "dishes": { "kw": ["plato", "cocina", "lavavajillas"], "steps": ["...", "..."] }, "...": {} },
 "examples": { "dishes": ["lavar los platos", "limpiar la cocina"], "...": [] },
 "compound": [["limpiar mi cuarto y llamar a mamá, luego pagar el alquiler", 3], ["...", 2], ["...", 1]]
}
```

- `templates`: all 41 ids from `engine.en.json`, each with the **same number of steps** as English.
  Translate the steps naturally (imperative, informal, each under 110 characters, starting with a capital
  letter where the script has them). Adapt cultural details (documents for taxes, shops, etc.) so they are
  generic and true in every country that speaks the language; drop country-specific items like "W-2 or P60".
  Do not include the English `kw_hint_english_regex` field in your file.
- `kw`: lowercase keywords a native speaker would actually type for that kind of task. Think about what
  people really write, including common verbs and nouns, and list plenty (5 to 15 per template).
  - Matching ignores case and accents, and a keyword matches at the **start of a word** (so the stem
    `limpi` matches limpiar, limpio, limpieza). Use stems to cover verb and case endings.
  - End a keyword with `$` to require the whole word (`té$` would not match `técnica`). Use `$` for short
    words that are prefixes of unrelated words.
  - Multi-word keywords are fine (`sacar la basura`).
  - When a task matches several templates, the keyword that appears **earliest in the text** wins, and
    four broad templates (`buy`, `phonecall`, `booking`, `plan`) are only used when nothing more specific
    matches. `shower` and `getready` always win when they match. So keep stems specific: a verb like
    "write" should not be a keyword of `essay`, because "write a song" must reach `song`. Prefer the noun.
  - Generic cleaning/doing verbs ("clean", "do", "make") should not be keywords on their own.
  - For Chinese set `"cjk": true`; keywords then match anywhere in the text and may be 1 or more characters.
- `leadIns`: phrases people put before a task that should be ignored ("I need to", "I have to", "I want
  to", "please", "to do:"). `then`: words that separate tasks in sequence ("then", "after that", "and
  then", "also"). `and`: the word(s) for "and". Commas and semicolons always separate tasks; "and" only
  separates when both sides are recognised as different kinds of task.
- `generic`: 9 steps, the general method; the first must contain `{task}` exactly once, placed so the
  typed text can be inserted unchanged (after a colon is safest, as in English).
- `examples`: for every template id, at least 2 (ideally 3) realistic tasks a native speaker might type
  that must select that template. Write them the way people type: short, sometimes without accents.
  Do not just reuse your keywords alone; write whole phrases, and vary the verbs.
- `compound`: at least 3 pairs of [text, expected number of tasks], including one that splits in three, one
  in two using "and", and one where "and" must NOT split (like "buy salt and pepper").

Check: `node src/tests/engine.i18n.test.js xx` must print `failed 0`. If an example fails because another
template's keyword matched earlier, fix the keywords (make the stem more specific or add `$`), do not
delete the example.
