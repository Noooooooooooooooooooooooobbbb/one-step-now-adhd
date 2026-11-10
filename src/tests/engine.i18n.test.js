// Usage: node tests/engine.i18n.test.js es fr ...   Checks a task-breakdown language pack.
const fs = require("fs"), path = require("path");
const I = require("../engine.i18n.js");
const en = JSON.parse(fs.readFileSync(path.join(__dirname, "../i18n/engine.en.json"), "utf8"));
const langs = process.argv.slice(2);
let bad = 0;
for (const lang of langs) {
  let pass = 0; const fails = [];
  const ok = (c, m) => { if (c) pass++; else fails.push(m); };
  let pack;
  try { pack = JSON.parse(fs.readFileSync(path.join(__dirname, `../i18n/engine.${lang}.json`), "utf8")); }
  catch (e) { console.log(`${lang}: cannot read pack: ${e.message}`); bad++; continue; }
  for (const k of ["leadIns", "then", "and", "generic", "templates", "examples", "compound"]) ok(pack[k] !== undefined, `missing "${k}"`);
  ok(Array.isArray(pack.generic) && pack.generic.length === en.generic.length, `generic needs ${en.generic.length} steps`);
  ok(pack.generic && (pack.generic[0].match(/\{task\}/g) || []).length === 1, "generic[0] must contain {task} exactly once");
  for (const id of I.ORDER) {
    const t = (pack.templates || {})[id];
    if (!t) { ok(false, `templates.${id} missing`); continue; }
    ok(Array.isArray(t.kw) && t.kw.length >= 1, `templates.${id}.kw needs at least 1 keyword`);
    ok(Array.isArray(t.steps) && t.steps.length === en.templates[id].steps.length, `templates.${id}.steps needs ${en.templates[id].steps.length} steps`);
    (t.kw || []).forEach(k => ok(typeof k === "string" && k.replace(/\$$/, "").trim().length >= (pack.cjk ? 1 : /\$$/.test(k) ? 2 : 3), `templates.${id}.kw "${k}" too short (min 3 letters, or 2 with $)`));
    ok(Array.isArray((pack.examples || {})[id]) && pack.examples[id].length >= 2, `examples.${id} needs at least 2 example tasks`);
  }
  for (const id of Object.keys(pack.templates || {})) ok(I.ORDER.includes(id), `unknown template id ${id}`);
  let E;
  try { E = I.create(pack); } catch (e) { console.log(`${lang}: engine failed to build: ${e.message}`); bad++; continue; }
  for (const id of I.ORDER) for (const ex of ((pack.examples || {})[id] || [])) {
    const r = E.breakDown(ex); const got = r.parts.map(p => p.source).join("+");
    ok(got === id, `example "${ex}" -> ${got || "nothing"}, expected ${id}`);
  }
  for (const [text, n] of (pack.compound || [])) { const got = E.breakDown(text).parts.length; ok(got === n, `compound "${text}" -> ${got} tasks, expected ${n}`); }
  ok((pack.compound || []).length >= 3, "compound needs at least 3 entries");
  // lead-ins: an example with a lead-in in front must still match
  for (const li of (pack.leadIns || [])) { const ex = pack.examples.dishes[0]; const r = E.breakDown(li + (pack.cjk ? "" : " ") + ex); ok(r.parts.length === 1 && r.parts[0].source === "dishes", `lead-in "${li}" + "${ex}" -> ${r.parts.map(p => p.source)}`); }
  // invariants
  const weird = ["", "   ", null, undefined, 42, "!!!", ",,,", "a".repeat(5000), "<script>alert(1)</script>", "<img src=x onerror=alert(1)>", "{task} {obj}", "$& $1", "🧹", "zorp flibber", "xyzzy"];
  const all = weird.concat(...Object.values(pack.examples || {}), (pack.compound || []).map(c => c[0]));
  for (const input of all) {
    let r; try { r = E.breakDown(input); } catch (e) { ok(false, `threw on ${JSON.stringify(String(input).slice(0, 30))}: ${e.message}`); continue; }
    const label = JSON.stringify(String(input).slice(0, 30));
    const meaningful = /[\p{L}\p{N}]/u.test(String(input ?? ""));
    if (meaningful) ok(r.steps.length >= 3 && r.steps.length <= 12, `3-12 steps for ${label}, got ${r.steps.length}`);
    else ok(r.steps.length === 0, `no steps for empty input ${label}`);
    for (const st of r.steps) {
      ok(typeof st === "string" && st.trim().length > 0, `non-empty step for ${label}`);
      ok(!/undefined|NaN/.test(st) && !(/\{(task|obj|verb)\}/.test(st) && !/[{}]/.test(String(input))), `leftover placeholder for ${label}: ${st}`);
      ok(st.length <= 140, `step too long (${st.length} > 140) for ${label}: ${st}`);
    }
    ok(new Set(r.steps.map(x => x.toLowerCase())).size === r.steps.length, `duplicate steps for ${label}`);
  }
  ok(E.breakDown("zorp flibber").parts[0].source === "generic", "unknown task uses the general method");
  ok(JSON.stringify(E.breakDown(pack.compound[0][0])) === JSON.stringify(E.breakDown(pack.compound[0][0])), "deterministic");
  console.log(`${lang}: passed ${pass}, failed ${fails.length}`);
  fails.forEach(f => console.log("  FAIL", f));
  if (fails.length) bad++;
}
process.exit(bad ? 1 : 0);
