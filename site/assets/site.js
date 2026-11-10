/* Shared by every page: language menu, "read this in your language" offer, clear-my-data button. */
(function () {
  "use strict";
  var S = window.SITE || {}, store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var menu = document.getElementById("langMenu");
  if (menu) {
    menu.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest("a"); if (a) store.set("lang-choice", a.getAttribute("hreflang") || "x"); });
    document.addEventListener("click", function (e) { if (menu.open && !menu.contains(e.target)) menu.open = false; });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") menu.open = false; });
  }
  // Offer the reader's browser language once, without redirecting anyone.
  var offer = document.getElementById("langOffer");
  if (offer && S.langs && !store.get("lang-choice")) {
    var prefs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""]);
    var want = null;
    for (var i = 0; i < prefs.length && !want; i++) {
      var code = String(prefs[i]).toLowerCase().split("-")[0];
      for (var j = 0; j < S.langs.length; j++) if (S.langs[j].code === code) { want = S.langs[j]; break; }
      if (want || code) break; // only the first preference counts
    }
    if (want && want.code !== S.lang) {
      var link = document.getElementById("langOfferLink");
      link.textContent = want.offer + " →"; link.href = want.href; link.lang = want.html_lang; link.hreflang = want.html_lang;
      link.addEventListener("click", function () { store.set("lang-choice", want.code); });
      document.getElementById("langOfferX").addEventListener("click", function () { offer.hidden = true; store.set("lang-choice", S.lang); });
      offer.hidden = false;
    }
  }
  var clr = document.getElementById("clearData");
  if (clr && S.keys) {
    var armed = false, label = clr.textContent;
    clr.addEventListener("click", function () {
      if (!armed) { armed = true; clr.textContent = clr.getAttribute("data-confirm"); setTimeout(function () { armed = false; clr.textContent = label; }, 4000); return; }
      try { S.keys.forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
      location.reload();
    });
  }
})();
