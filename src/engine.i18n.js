/* Task splitter for non-English pages. Same idea as the English one, driven by a language pack:
   keyword stems choose a hand-written template; anything else gets a general method.
   Runs fully offline. No network, no AI service. */
(function (root) {
  "use strict";
  var ORDER = ["shower","getready","dishes","laundry","room","bathroom","vacuum","email","message","call","phonecall","essay","homework","study","read",
    "song","compose","instrument","fiction","poem","nonfiction","bookwrite","art","video","craft","taxes","bills","paperwork","job","groceries","buy","cook",
    "errands","exercise","pack","presentation","garden","car","booking","fix","plan"];
  var FIRST = { shower: 1, getready: 1 };
  // Broad "verb" templates: used only when no specific template matches ("buy groceries" is groceries, not buy).
  var WEAK = { buy: 1, phonecall: 1, booking: 1, plan: 1 };
  var WORD = "[\\p{L}\\p{N}]";

  function norm(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ё/g, "е").normalize("NFC");
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  function create(pack) {
    var cjk = !!pack.cjk;
    var compiled = [];
    ORDER.forEach(function (id) {
      var t = pack.templates[id]; if (!t) return;
      var kws = t.kw.map(function (k) {
        var exact = /\$$/.test(k); if (exact) k = k.slice(0, -1);
        k = norm(k).trim();
        var re = cjk ? new RegExp(esc(k), "u")
          : new RegExp("(?<!" + WORD + ")" + esc(k).replace(/ /g, "\\s+") + (exact ? "(?!" + WORD + ")" : ""), "u");
        return { re: re, len: k.length };
      });
      compiled.push({ id: id, kws: kws, steps: t.steps, first: !!FIRST[id], weak: !!WEAK[id] });
    });

    function match(text, tier) {
      var n = norm(text), best = null, pos = Infinity, len = 0;
      compiled.forEach(function (t) {
        if (tier === 0 ? !t.first : tier === 1 ? t.weak : !t.weak) return;
        t.kws.forEach(function (k) {
          var m = k.re.exec(n);
          if (m && (m.index < pos || (m.index === pos && k.len > len))) { best = t; pos = m.index; len = k.len; }
        });
      });
      return best;
    }
    function pick(text) { return match(text, 0) || match(text, 1) || match(text, 2); }

    function alt(list) {
      return list.slice().sort(function (a, b) { return b.length - a.length; }).map(function (w) { return esc(norm(w)).replace(/ /g, "\\s+"); }).join("|");
    }
    var leadRe = pack.leadIns && pack.leadIns.length ? new RegExp("^(?:" + alt(pack.leadIns) + ")" + (cjk ? "" : "(?!" + WORD + ")") + "\\s*", "u") : null;
    var thenRe = new RegExp("\\s*(?:[,;，；、。\\n]" + (pack.then && pack.then.length ? "|" + (cjk ? "(?:" + alt(pack.then) + ")" : "(?<!" + WORD + ")(?:" + alt(pack.then) + ")(?!" + WORD + ")") : "") + ")\\s*", "gu");
    var andRe = pack.and && pack.and.length ? new RegExp(cjk ? "(?:" + alt(pack.and) + ")" : "\\s+(?:" + alt(pack.and) + ")\\s+", "gu") : null;

    // Regexes run on the normalised text; we cut the original at the same positions
    // (normalisation here never changes string length for the scripts we support, but guard anyway).
    function splitBy(text, re) {
      var n = norm(text);
      if (n.length !== text.length) { n = text.toLowerCase(); }
      var parts = [], seps = [], last = 0, m; re.lastIndex = 0;
      while ((m = re.exec(n))) {
        if (m[0].length === 0) { re.lastIndex++; continue; }
        parts.push(text.slice(last, m.index)); seps.push(text.slice(m.index, m.index + m[0].length)); last = m.index + m[0].length;
      }
      parts.push(text.slice(last));
      return { parts: parts, seps: seps };
    }
    function meaningful(s) { return /[\p{L}\p{N}]/u.test(s); }

    function clean(input) {
      var s = String(input == null ? "" : input).replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").replace(/[ \t]+/g, " ").trim().slice(0, 200).trim();
      for (var i = 0; i < 2 && leadRe; i++) {
        var n = norm(s); if (n.length !== s.length) break;
        var m = leadRe.exec(n); if (!m || m[0].length >= s.length) break;
        s = s.slice(m[0].length).trim();
      }
      return s.replace(/[.!?…。！？]+$/u, "").trim();
    }

    function splitTasks(text) {
      var out = [];
      splitBy(text, thenRe).parts.forEach(function (p) {
        if (!andRe) { out.push(p); return; }
        var r = splitBy(p, andRe), cur = r.parts[0];
        for (var i = 1; i < r.parts.length; i++) {
          var a = pick(cur), b = pick(r.parts[i]);
          if (a && b && a !== b) { out.push(cur); cur = r.parts[i]; }
          else cur += r.seps[i - 1] + r.parts[i];
        }
        out.push(cur);
      });
      out = out.map(function (s) { return s.trim(); }).filter(meaningful);
      var merged = [];
      out.forEach(function (s) {
        var t = pick(s), prev = merged[merged.length - 1];
        var short = cjk ? s.length <= 4 : s.split(/\s+/).length <= 3;
        if (merged.length && short && (!t || t === pick(prev))) merged[merged.length - 1] += ", " + s;
        else merged.push(s);
      });
      return merged.slice(0, 4);
    }

    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    function breakOne(task) {
      var t = pick(task), steps = t ? t.steps : pack.generic;
      var shown = task.length > 60 ? task.slice(0, 60).replace(/\s+\S*$/, "") + "…" : task;
      return { task: task, source: t ? t.id : "generic",
        steps: steps.map(function (s) { return s.replace(/\{task\}/g, function () { return shown; }); }) };
    }

    function breakDown(input) {
      var text = clean(input);
      if (!text || !meaningful(text)) return { parts: [], steps: [] };
      var tasks = splitTasks(text);
      if (!tasks.length) return { parts: [], steps: [] };
      var parts = tasks.map(breakOne), steps;
      if (parts.length === 1) steps = parts[0].steps.slice();
      else {
        var per = parts.length === 2 ? 6 : parts.length === 3 ? 4 : 3;
        steps = [];
        parts.forEach(function (p) {
          var label = p.task.length > 28 ? p.task.slice(0, 26).trim() + "…" : p.task;
          p.steps.slice(0, per).forEach(function (s) { steps.push(cap(label) + (cjk ? "：" : ": ") + s); });
        });
      }
      var seen = {};
      steps = steps.filter(function (s) { var k = s.toLowerCase(); if (seen[k]) return false; seen[k] = true; return true; });
      return { parts: parts, steps: steps };
    }
    return { breakDown: breakDown, _pick: pick, _split: splitTasks, _clean: clean };
  }

  var api = { create: create, ORDER: ORDER };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else { root.TaskSplitterI18n = api; if (root.TASK_PACK) root.TaskSplitter = create(root.TASK_PACK); }
})(this);
