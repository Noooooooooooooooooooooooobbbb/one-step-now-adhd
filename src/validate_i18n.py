#!/usr/bin/env python3
"""Check a translated strings file against en.json: same keys, list lengths, {placeholders} and HTML tags."""
import json, re, sys, os
here = os.path.dirname(os.path.abspath(__file__))
def load(l): return json.load(open(os.path.join(here, "i18n", l + ".json"), encoding="utf-8"))
def walk(en, tr, path, errs):
    if isinstance(en, dict):
        if not isinstance(tr, dict): errs.append(f"{path}: expected object"); return
        for k in en:
            if k not in tr: errs.append(f"{path}.{k}: missing")
            else: walk(en[k], tr[k], f"{path}.{k}", errs)
        for k in tr:
            if k not in en: errs.append(f"{path}.{k}: unexpected key")
    elif isinstance(en, list):
        if not isinstance(tr, list) or len(tr) != len(en): errs.append(f"{path}: expected list of {len(en)}"); return
        for i, (a, b) in enumerate(zip(en, tr)): walk(a, b, f"{path}[{i}]", errs)
    else:
        if not isinstance(tr, str) or not tr.strip(): errs.append(f"{path}: empty or not text"); return
        ph = lambda s: sorted(re.findall(r"\{[a-z]+\}", s))
        if ph(en) != ph(tr): errs.append(f"{path}: placeholders differ {ph(en)} vs {ph(tr)}")
        tags = lambda s: sorted(re.findall(r"<[^>]+>", s))
        if tags(en) != tags(tr): errs.append(f"{path}: HTML tags differ (keep tags and links exactly)")
        if "❤️" in en and "❤️" not in tr: errs.append(f"{path}: keep the ❤️")
        if tr != tr.strip(): errs.append(f"{path}: leading/trailing space")
def main(lang):
    en, tr = load("en"), load(lang); errs = []
    walk({k: v for k, v in en.items() if k != "meta"}, {k: v for k, v in tr.items() if k != "meta"}, "", errs)
    m = tr.get("meta", {})
    for k in ("code", "name", "html_lang", "lang_offer"):
        if not m.get(k): errs.append(f"meta.{k}: missing")
    if m.get("code") != lang: errs.append("meta.code must equal the file's language code")
    for site in ("One Step Now", "Ride the Wave"):
        if site not in json.dumps(tr, ensure_ascii=False): errs.append(f"site name '{site}' must stay in English")
    if lang != "en":
        same = [p for p in ("adhd.lede", "ocd.lede", "common.credit") if eval("tr['%s']['%s']" % tuple(p.split("."))) == eval("en['%s']['%s']" % tuple(p.split(".")))]
        if same: errs.append(f"untranslated: {same}")
    print(f"{lang}: {'OK' if not errs else str(len(errs)) + ' problem(s)'}")
    for e in errs: print("  -", e)
    return not errs
if __name__ == "__main__":
    langs = sys.argv[1:] or ["es", "fr", "pt", "cs", "ru", "de", "it", "zh"]
    sys.exit(0 if all([main(l) for l in langs]) else 1)
