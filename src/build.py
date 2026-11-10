#!/usr/bin/env python3
"""Builds both websites in every language.

    python3 src/build.py            -> writes dist/adhd and dist/ocd (each is a complete repository)

Each language needs src/i18n/<code>.json (page text) and, for One Step Now, src/i18n/engine.<code>.json
(task-breakdown rules). Languages missing either file are skipped with a warning.
"""
import html, json, os, re, shutil, sys

SRC = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(SRC)
ORDER = ["en", "es", "fr", "pt", "de", "it", "cs", "ru", "zh"]
SITES = {
    "adhd": {
        "name": "One Step Now", "base": "https://one-step-now-adhd.netlify.app", "theme": "#1b2233",
        "fonts": "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,800&family=Atkinson+Hyperlegible:wght@400;700&display=swap",
        "keys": ["onestepnow.v1", "onestepnow.v2"], "repo": "one-step-now-adhd",
    },
    "ocd": {
        "name": "Ride the Wave", "base": "https://ride-the-wave-ocd.netlify.app", "theme": "#27766c",
        "fonts": "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Figtree:wght@400;600;700&display=swap",
        "keys": ["ridethewave.v1", "ridethewave.v2"], "repo": "ride-the-wave-ocd",
    },
}
# Only the English pages name the US crisis line; other languages point to the international directory.
EN_HELP_EXTRA = " In the US, call or text <strong>988</strong> (Suicide &amp; Crisis Lifeline)."
EN_NOTE_EXTRA = " In the US, call or text 988."

def read(*p):
    with open(os.path.join(SRC, *p), encoding="utf-8") as f: return f.read()
def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f: f.write(text)
def esc(s): return html.escape(str(s), quote=True)
def js(obj): return json.dumps(obj, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")

def render(tpl, ctx):
    def look(path):
        cur = ctx
        for part in path.split("."): cur = cur[part]
        return cur
    tpl = re.sub(r"\{\{\{([\w.]+)\}\}\}", lambda m: str(look(m.group(1))), tpl)
    return re.sub(r"\{\{([\w.]+)\}\}", lambda m: esc(look(m.group(1))), tpl)

def load_langs():
    langs = {}
    for code in ORDER:
        p = os.path.join(SRC, "i18n", code + ".json")
        if not os.path.exists(p): print("  (skipping %s: no %s.json)" % (code, code)); continue
        if code != "en" and not os.path.exists(os.path.join(SRC, "i18n", "engine.%s.json" % code)):
            print("  (skipping %s: no engine.%s.json)" % (code, code)); continue
        langs[code] = json.loads(read("i18n", code + ".json"))
    return langs

def prefix(code): return "" if code == "en" else "/" + code
def url(code, page): return prefix(code) + {"home": "/", "contact": "/contact", "thanks": "/thank-you"}[page]

def build_site(key, langs, single=False):
    site = SITES[key]
    # Inside a published repository (only one site's folder present) rebuild site/ in place;
    # in the combined workspace write a complete repository for each site under dist/.
    out = ROOT if single else os.path.join(ROOT, "dist", key); pub = os.path.join(out, "site")
    if single: shutil.rmtree(pub, ignore_errors=True)
    elif os.path.isdir(out):
        for name in os.listdir(out):
            if name == ".git": continue
            p = os.path.join(out, name); shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)
    head_t, top_t = read("shared", "head.html"), read("shared", "topbar.html")
    index_t, contact_t, thanks_t = read(key, "index.html"), read("shared", "contact.html"), read("shared", "thank-you.html")
    urls = []
    for code, L in langs.items():
        meta, common, t = L["meta"], L["common"], L[key]
        p = {k: url(code, k) for k in ("home", "contact", "thanks")}
        for kind in ("home", "contact", "thanks"):
            title = t["title"] if kind == "home" else "%s · %s" % (common["contact_title"] if kind == "contact" else common["thanks_title"], site["name"])
            alternates = "".join('<link rel="alternate" hreflang="%s" href="%s%s">\n' % (langs[c]["meta"]["html_lang"], site["base"], url(c, kind)) for c in langs)
            alternates += '<link rel="alternate" hreflang="x-default" href="%s%s">' % (site["base"], url("en", kind))
            lang_links = "".join('<li><a href="%s" lang="%s" hreflang="%s"%s>%s</a></li>' % (
                url(c, kind), langs[c]["meta"]["html_lang"], langs[c]["meta"]["html_lang"], ' aria-current="true"' if c == code else "", esc(langs[c]["meta"]["name"])) for c in langs)
            site_json = {"lang": code, "locale": meta["html_lang"], "keys": site["keys"],
                         "langs": [{"code": c, "html_lang": langs[c]["meta"]["html_lang"], "offer": langs[c]["meta"]["lang_offer"], "href": url(c, kind)} for c in langs],
                         "msg": {"err_empty": common["err_empty"], "err_send": common["err_send"], "sending": common["sending"], "thanks": p["thanks"]}}
            page = {"title": title, "desc": t["meta_desc"], "url": site["base"] + p[kind], "alternates": alternates, "lang_links": lang_links,
                    "cur_home": ' aria-current="page"' if kind == "home" else "", "cur_contact": ' aria-current="page"' if kind == "contact" else "",
                    "site_json": js(site_json)}
            ctx = {"meta": meta, "common": common, "t": t, "site": site, "p": p, "page": page}
            page["head"] = render(head_t, ctx); page["topbar"] = render(top_t, ctx)
            if kind == "home":
                if key == "adhd":
                    page["starter0"] = t["starters"][0]; page["t_json"] = js(t)
                    if code == "en": page["engine"] = '<script src="/assets/engine.en.js"></script>'
                    else:
                        pack = json.loads(read("i18n", "engine.%s.json" % code))
                        slim = {"cjk": bool(pack.get("cjk")), "leadIns": pack["leadIns"], "then": pack["then"], "and": pack["and"], "generic": pack["generic"],
                                "templates": {i: {"kw": v["kw"], "steps": v["steps"]} for i, v in pack["templates"].items()}}
                        page["engine"] = "<script>window.TASK_PACK = %s;</script>\n<script src=\"/assets/engine.i18n.js\"></script>" % js(slim)
                else:
                    page["prompt0"] = t["prompts"][0]; page["t_json"] = js(t)
                    page["cycle"] = "\n".join('      <li%s><strong>%s</strong><span>%s</span></li>' % (' class="cut"' if i == 2 else "", esc(c["t"]), esc(c["d"])) for i, c in enumerate(t["cycle"]))
                    page["traps"] = "\n".join('        <details><summary>%s</summary><p>%s</p></details>' % (esc(x["t"]), esc(x["d"])) for x in t["traps"])
                    page["help_extra"] = EN_HELP_EXTRA if code == "en" else ""
                body, name = render(index_t, ctx), "index.html"
            elif kind == "contact":
                page["contact_intro"] = common["contact_intro"].replace("{site}", site["name"])
                note = (t["contact_note"] + (EN_NOTE_EXTRA if code == "en" else "")) if key == "ocd" else ""
                page["contact_note"] = '    <p class="note">%s</p>' % esc(note) if note else ""
                body, name = render(contact_t, ctx), "contact.html"
            else:
                page["thanks_body"] = common["thanks_body"].replace("{site}", site["name"]); page["back"] = common["back"].replace("{site}", site["name"])
                body, name = render(thanks_t, ctx), "thank-you.html"
            left = re.findall(r"\{\{[^}]*\}\}", body)
            if left: sys.exit("unrendered placeholder in %s/%s/%s: %s" % (key, code, name, left[:3]))
            write(os.path.join(pub, code if code != "en" else "", name), body)
            if kind != "thanks": urls.append(site["base"] + p[kind])
    # assets
    for name, src in (("style.css", (key, "style.css")), ("app.js", (key, "app.js")), ("favicon.svg", (key, "favicon.svg")), ("site.js", ("shared", "site.js"))):
        write(os.path.join(pub, "assets", name), read(*src))
    if key == "adhd":
        write(os.path.join(pub, "assets", "engine.en.js"), read("engine.en.js")); write(os.path.join(pub, "assets", "engine.i18n.js"), read("engine.i18n.js"))
    write(os.path.join(pub, "robots.txt"), "User-agent: *\nAllow: /\nSitemap: %s/sitemap.xml\n" % site["base"])
    write(os.path.join(pub, "sitemap.xml"), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n' % "".join("  <url><loc>%s</loc></url>\n" % u for u in urls))
    write(os.path.join(pub, "404.html"), render(thanks_t.replace("{{common.thanks_title}}", "404").replace("<p>{{page.thanks_body}}</p>", ""), {
        "meta": langs["en"]["meta"], "common": langs["en"]["common"], "site": site, "p": {k: url("en", k) for k in ("home", "contact", "thanks")},
        "page": {"back": langs["en"]["common"]["back"].replace("{site}", site["name"]), "site_json": js({"lang": "en", "keys": site["keys"]}),
                 "head": render(head_t, {"meta": langs["en"]["meta"], "site": site, "page": {"title": "Page not found · " + site["name"], "desc": "", "url": site["base"] + "/", "alternates": ""}}),
                 "topbar": '<nav class="topnav"><a class="brand" href="/">%s</a></nav>' % site["name"]}}))
    print("  %s: %d languages -> %s" % (key, len(langs), pub))
    if single: return
    write(os.path.join(out, "netlify.toml"), '[build]\n  publish = "site"\n\n[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Content-Type-Options = "nosniff"\n    Referrer-Policy = "strict-origin-when-cross-origin"\n    X-Frame-Options = "SAMEORIGIN"\n')
    write(os.path.join(out, ".gitignore"), ".netlify\n__pycache__/\nnode_modules/\n")
    write(os.path.join(out, "README.md"), render(read(key, "README.md"), {"site": site, "langs": ", ".join(langs[c]["meta"]["name"] for c in langs)}))
    # a copy of the source so the repository can rebuild itself
    for folder in ("shared", "i18n", "tests", key):
        shutil.copytree(os.path.join(SRC, folder), os.path.join(out, "src", folder), ignore=shutil.ignore_patterns("__pycache__"))
    for f in ("build.py", "validate_i18n.py", "TRANSLATING.md", "engine.en.js", "engine.i18n.js"): shutil.copy(os.path.join(SRC, f), os.path.join(out, "src", f))

if __name__ == "__main__":
    langs = load_langs()
    present = [k for k in SITES if os.path.isdir(os.path.join(SRC, k))]
    for key in present: build_site(key, langs, single=len(present) == 1)
