/* One Step Now: page logic. Text comes from window.T (the page's language). Everything is stored in this browser only. */
(function () {
  "use strict";
  var T = window.T, KEY = "onestepnow.v2", OLD = "onestepnow.v1";
  var $ = function (id) { return document.getElementById(id); };
  var fill = function (str, vals) { return str.replace(/\{([a-z]+)\}/g, function (m, k) { return k in vals ? vals[k] : m; }); };
  var el = function (tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  var today = function () { var d = new Date(); return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate(); };

  function example() {
    return { task: T.example_task, steps: T.example_steps.map(function (t, i) { return { t: t, done: i === 0 }; }), dump: [T.example_dump], minutes: 10, day: { d: today(), n: 0 }, timer: null };
  }
  function load() {
    var s = null;
    try { s = JSON.parse(localStorage.getItem(KEY) || localStorage.getItem(OLD)); } catch (e) { s = null; }
    if (!s || !Array.isArray(s.steps) || !Array.isArray(s.dump)) return example();
    s.steps = s.steps.filter(function (x) { return x && typeof x.t === "string"; }).map(function (x) { return { t: x.t, done: !!x.done }; });
    s.dump = s.dump.filter(function (x) { return typeof x === "string"; });
    if (typeof s.task !== "string") s.task = "";
    if (!(s.minutes >= 1 && s.minutes <= 180)) s.minutes = 10;
    if (!s.day || s.day.d !== today() || !(s.day.n >= 0)) s.day = { d: today(), n: 0 };
    if (!s.timer || typeof s.timer !== "object") s.timer = null;
    return s;
  }
  var s = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }
  function bump(n) { if (s.day.d !== today()) s.day = { d: today(), n: 0 }; s.day.n = Math.max(0, s.day.n + n); }

  // ---------- steps ----------
  var editing = -1;
  function currentIndex() { for (var i = 0; i < s.steps.length; i++) if (!s.steps[i].done) return i; return -1; }
  function cheer(text) { $("cheer").textContent = text || T.cheers[Math.floor(Math.random() * T.cheers.length)]; }
  function setDone(i, done) { if (s.steps[i].done === done) return; s.steps[i].done = done; bump(done ? 1 : -1); if (done) cheer(); }
  function icon(label, glyph, fn) { var b = el("button", "ic", glyph); b.type = "button"; b.setAttribute("aria-label", label); b.title = label; b.onclick = fn; return b; }

  function render() {
    var list = $("steps"); list.innerHTML = "";
    var cur = currentIndex();
    if (!s.steps.length) list.appendChild(el("li", "empty", T.no_steps));
    s.steps.forEach(function (st, i) {
      var li = el("li", (st.done ? "done " : "") + (i === cur ? "current" : ""));
      var cb = el("input", "chk"); cb.type = "checkbox"; cb.checked = st.done; cb.id = "step-" + i;
      cb.setAttribute("aria-label", fill(T.aria_done, { t: st.t }));
      cb.onchange = function () { setDone(i, cb.checked); save(); render(); };
      li.appendChild(cb);
      if (editing === i) {
        var inp = el("input"); inp.type = "text"; inp.value = st.t; inp.maxLength = 200; inp.id = "edit-" + i; inp.setAttribute("aria-label", fill(T.aria_edit, { t: st.t }));
        var finish = function (keep) { if (editing !== i) return; editing = -1; var v = inp.value.trim(); if (keep && v) st.t = v; save(); render(); };
        inp.onkeydown = function (e) { if (e.key === "Enter") { e.preventDefault(); finish(true); } else if (e.key === "Escape") finish(false); };
        inp.onblur = function () { finish(true); };
        var ok = el("button", "small", T.save); ok.type = "button"; ok.onmousedown = function (e) { e.preventDefault(); }; ok.onclick = function () { finish(true); };
        li.appendChild(inp); li.appendChild(ok);
        setTimeout(function () { inp.focus(); inp.select(); }, 0);
      } else {
        li.appendChild(el("span", "txt", st.t));
        var acts = el("span", "acts");
        if (i > 0) acts.appendChild(icon(fill(T.aria_up, { t: st.t }), "↑", function () { s.steps.splice(i - 1, 0, s.steps.splice(i, 1)[0]); save(); render(); }));
        if (i < s.steps.length - 1) acts.appendChild(icon(fill(T.aria_down, { t: st.t }), "↓", function () { s.steps.splice(i + 1, 0, s.steps.splice(i, 1)[0]); save(); render(); }));
        acts.appendChild(icon(fill(T.aria_edit, { t: st.t }), "✎", function () { editing = i; render(); }));
        acts.appendChild(icon(fill(T.aria_delete, { t: st.t }), "×", function () { s.steps.splice(i, 1); save(); render(); }));
        li.appendChild(acts);
      }
      list.appendChild(li);
    });
    var done = s.steps.filter(function (x) { return x.done; }).length;
    $("bar").style.width = s.steps.length ? (done / s.steps.length * 100) + "%" : "0";
    $("nowStep").textContent = !s.steps.length ? T.now_empty : cur === -1 ? T.now_alldone : s.steps[cur].t;
    $("doneBtn").disabled = cur === -1;
    $("skipBtn").disabled = cur === -1 || s.steps.length - done < 2;
    $("smallerBtn").hidden = cur === -1;
    if (cur === -1) { $("smallerForm").hidden = true; $("smallerBtn").setAttribute("aria-expanded", "false"); }
    $("today").textContent = s.day.n > 0 ? fill(T.today, { n: s.day.n }) : "";
  }
  $("taskName").value = s.task || "";
  $("doneBtn").onclick = function () { var i = currentIndex(); if (i < 0) return; setDone(i, true); save(); render(); };
  $("skipBtn").onclick = function () { var i = currentIndex(); if (i < 0) return; s.steps.push(s.steps.splice(i, 1)[0]); cheer(T.cheer_skip); save(); render(); };
  $("smallerBtn").onclick = function () {
    var f = $("smallerForm"); f.hidden = !f.hidden; $("smallerBtn").setAttribute("aria-expanded", String(!f.hidden)); if (!f.hidden) $("smallerInput").focus();
  };
  $("smallerForm").onsubmit = function (e) {
    e.preventDefault(); var v = $("smallerInput").value.trim(); if (!v) return;
    var i = currentIndex(); s.steps.splice(i < 0 ? s.steps.length : i, 0, { t: v, done: false });
    $("smallerInput").value = ""; $("smallerForm").hidden = true; $("smallerBtn").setAttribute("aria-expanded", "false"); save(); render();
  };
  $("stepForm").onsubmit = function (e) { e.preventDefault(); var v = $("stepInput").value.trim(); if (!v) return; s.steps.push({ t: v, done: false }); $("stepInput").value = ""; save(); render(); $("stepInput").focus(); };
  $("taskName").oninput = function (e) { s.task = e.target.value; save(); };
  var confirmNew = false;
  $("newTask").onclick = function () {
    var b = $("newTask");
    if (!confirmNew && s.steps.length) { confirmNew = true; b.textContent = T.new_task_confirm; setTimeout(function () { confirmNew = false; b.textContent = T.new_task; }, 3500); return; }
    confirmNew = false; b.textContent = T.new_task;
    s.task = ""; s.steps = []; $("taskName").value = ""; $("cheer").textContent = ""; closeSuggest(); save(); render(); $("taskName").focus();
  };

  // ---------- automatic breakdown (offline, see TaskSplitter) ----------
  var pending = [];
  function closeSuggest() { $("suggest").hidden = true; pending = []; }
  function showSuggest() {
    var r = window.TaskSplitter ? window.TaskSplitter.breakDown($("taskName").value) : { steps: [], parts: [] };
    var ul = $("suggList"); ul.innerHTML = ""; $("suggActions").innerHTML = "";
    if (!r.steps.length) {
      pending = []; $("suggestTitle").textContent = T.sugg_empty_title; ul.appendChild(el("li", "empty", T.sugg_empty));
      $("suggest").hidden = false; $("taskName").focus(); return;
    }
    pending = r.steps.map(function (t) { return { t: t, keep: true }; });
    $("suggestTitle").textContent = r.parts.length > 1 ? fill(T.sugg_title_multi, { n: r.parts.length }) : T.sugg_title;
    pending.forEach(function (p, i) {
      var li = el("li"), lab = el("label"), cb = el("input", "chk"); cb.type = "checkbox"; cb.checked = true; cb.id = "sugg-" + i;
      cb.onchange = function () { p.keep = cb.checked; updateActions(); };
      lab.appendChild(cb); lab.appendChild(el("span", null, p.t)); li.appendChild(lab); ul.appendChild(li);
    });
    $("suggest").hidden = false; updateActions();
  }
  function useSteps(mode) {
    var chosen = pending.filter(function (p) { return p.keep; }).map(function (p) { return { t: p.t, done: false }; });
    if (!chosen.length) return;
    s.steps = mode === "replace" ? chosen : s.steps.concat(chosen);
    cheer(T.cheer_added); save(); closeSuggest(); render();
  }
  function updateActions() {
    var box = $("suggActions"); box.innerHTML = "";
    var n = pending.filter(function (p) { return p.keep; }).length;
    var mk = function (id, text, cls, fn) { var b = el("button", cls, text); b.id = id; b.type = "button"; b.onclick = fn; b.disabled = id !== "suggCancel" && !n; box.appendChild(b); };
    if (s.steps.length) {
      mk("suggReplace", fill(T.sugg_replace, { n: n }), "primary", function () { useSteps("replace"); });
      mk("suggAppend", fill(T.sugg_append, { n: n }), "", function () { useSteps("append"); });
    } else mk("suggReplace", fill(T.sugg_use, { n: n }), "primary", function () { useSteps("replace"); });
    mk("suggCancel", T.cancel, "ghost", closeSuggest);
  }
  $("splitForm").onsubmit = function (e) { e.preventDefault(); s.task = $("taskName").value; save(); showSuggest(); };

  // ---------- parking lot ----------
  var confirmClear = false;
  function renderDump() {
    var ul = $("dump"); ul.innerHTML = "";
    if (!s.dump.length) ul.appendChild(el("li", "empty", T.park_empty));
    s.dump.forEach(function (t, i) {
      var li = el("li"); li.appendChild(el("span", "txt", t));
      var acts = el("span", "acts");
      var mv = el("button", "small ghost", T.to_step); mv.type = "button";
      mv.onclick = function () { s.dump.splice(i, 1); s.steps.push({ t: t, done: false }); save(); renderDump(); render(); };
      acts.appendChild(mv);
      acts.appendChild(icon(fill(T.aria_delete, { t: t }), "×", function () { s.dump.splice(i, 1); save(); renderDump(); }));
      li.appendChild(acts); ul.appendChild(li);
    });
    var row = $("clearRow"); row.innerHTML = "";
    if (s.dump.length > 1) {
      var b = el("button", "small ghost", confirmClear ? T.clear_all_confirm : T.clear_all); b.id = "clearDump"; b.type = "button";
      b.onclick = function () {
        if (!confirmClear) { confirmClear = true; renderDump(); setTimeout(function () { confirmClear = false; renderDump(); }, 3500); return; }
        confirmClear = false; s.dump = []; save(); renderDump();
      };
      row.appendChild(b);
    }
  }
  $("dumpForm").onsubmit = function (e) { e.preventDefault(); var v = $("dumpInput").value.trim(); if (!v) return; s.dump.unshift(v); $("dumpInput").value = ""; save(); renderDump(); };

  // ---------- timer (end-time based: accurate in background tabs and across reloads) ----------
  var PRESETS = [2, 5, 10, 15, 25], total = s.minutes * 60000, remaining = total, endAt = null, tick = null, audio = null;
  var fmt = function (ms) { var sec = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(sec / 60) + ":" + String(sec % 60).padStart(2, "0"); };
  var baseTitle = document.title, LOCALE = (window.SITE && window.SITE.locale) || undefined;
  function clock(ts) { try { return new Date(ts).toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" }); } catch (e) { return new Date(ts).toLocaleTimeString(); } }
  function persistTimer() { s.timer = endAt ? { endAt: endAt, total: total } : (remaining < total ? { remaining: remaining, total: total } : null); save(); }
  function paint() {
    $("time").textContent = fmt(remaining);
    $("dial").style.setProperty("--p", total ? remaining / total : 0);
    $("dial").setAttribute("aria-label", fill(T.time_left, { time: fmt(remaining) }));
    $("startBtn").textContent = endAt ? T.pause : (remaining < total && remaining > 0 ? T.resume : T.start);
    $("ends").textContent = endAt ? fill(T.ends_at, { time: clock(endAt) }) : (remaining <= 0 ? T.times_up : "");
    Array.prototype.forEach.call(document.querySelectorAll("#presets button"), function (b) { b.setAttribute("aria-pressed", String(+b.dataset.min * 60000 === total)); });
    document.title = endAt ? fmt(remaining) + " · " + baseTitle : baseTitle;
  }
  function chime() {
    try {
      if (!audio) return;
      [0, 0.25, 0.5].forEach(function (d, i) {
        var o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = [660, 880, 990][i]; o.connect(g); g.connect(audio.destination);
        var t = audio.currentTime + d; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.3, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.start(t); o.stop(t + 0.45);
      });
    } catch (e) {}
  }
  function stop() { endAt = null; clearInterval(tick); tick = null; }
  function step() {
    remaining = endAt - Date.now();
    if (remaining <= 0) { remaining = 0; stop(); chime(); persistTimer(); }
    paint();
  }
  function setMinutes(m) { stop(); total = remaining = m * 60000; s.minutes = m; persistTimer(); paint(); }
  PRESETS.forEach(function (m) {
    var b = el("button", "small", fill(T.preset, { n: m })); b.type = "button"; b.dataset.min = m; b.onclick = function () { setMinutes(m); }; $("presets").appendChild(b);
  });
  $("customForm").onsubmit = function (e) {
    e.preventDefault(); var m = Math.round(+$("customMin").value);
    if (!(m >= 1)) { $("customMin").focus(); return; }
    setMinutes(Math.min(180, m)); $("customMin").value = "";
  };
  $("startBtn").onclick = function () {
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); if (audio.resume) audio.resume(); } catch (e) { audio = null; }
    if (endAt) { remaining = Math.max(0, endAt - Date.now()); stop(); persistTimer(); paint(); return; }
    if (remaining <= 0) remaining = total;
    endAt = Date.now() + remaining; tick = setInterval(step, 250); persistTimer(); step();
  };
  $("resetBtn").onclick = function () { stop(); remaining = total; persistTimer(); paint(); };
  if (s.timer && s.timer.total > 0 && s.timer.total <= 180 * 60000) {
    total = s.timer.total;
    if (s.timer.endAt) {
      if (s.timer.endAt > Date.now() && s.timer.endAt - Date.now() <= total) { endAt = s.timer.endAt; remaining = endAt - Date.now(); tick = setInterval(step, 250); }
      else { remaining = 0; s.timer = { remaining: 0, total: total }; }
    } else if (s.timer.remaining >= 0 && s.timer.remaining <= total) remaining = s.timer.remaining;
  }

  // ---------- stuck ----------
  var si = 0;
  $("starterBtn").onclick = function () { si = (si + 1) % T.starters.length; $("starter").textContent = T.starters[si]; };

  render(); renderDump(); paint();
  window.__test = { state: function () { return s; }, fmt: fmt };
})();
