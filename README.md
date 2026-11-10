# One Step Now

A free focus kit for people with ADHD: **https://one-step-now-adhd.netlify.app**

- Type a task ("clean my room and call mum") and get tiny, concrete steps. This runs in the browser from
  built-in rules. There is no AI service, no account and no tracking, and it works offline.
- See only the step in front of you, with a "make it smaller" option when a step still feels too big.
- A visual countdown timer that makes time visible.
- Prompts for getting unstuck, and a place to park distracting thoughts.

Available in: English, Español, Français, Português, Deutsch, Italiano, Čeština, Русский, 中文.

Everything a visitor types stays in their own browser (localStorage). The contact form sends through Formspree.

## How it is put together

| Folder | What it is |
| --- | --- |
| `site/` | The finished website. This is what Netlify publishes. |
| `src/adhd/` | Page template, styles and page logic. |
| `src/shared/` | Parts shared by every page (top bar, contact page, language menu). |
| `src/i18n/` | All text. `en.json` and `engine.en.json` are the English originals; one pair of files per language. |
| `src/engine.en.js`, `src/engine.i18n.js` | The task-breakdown engines (English, and every other language). |
| `src/tests/` | Automated tests for the engines. |

To rebuild `site/` after a change (needs Python 3 and Node.js):

```
python3 src/validate_i18n.py                 # check translations
node src/tests/engine.en.test.js             # check the English engine
node src/tests/engine.i18n.test.js es fr pt de it cs ru zh
python3 src/build.py
```

## Improving a translation or adding a language

Read `src/TRANSLATING.md`. Corrections are very welcome: use the contact page on the site.

## A note on what this is

A self-help tool, not a diagnosis or treatment.

This site was made by Claude AI, with prompts by Owen.
