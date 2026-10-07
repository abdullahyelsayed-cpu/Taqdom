/* ==========================================================================
   TAQDOM.AI — Core runtime: Supabase client, session, i18n binding,
   analytics, toasts, nav, reveal-on-scroll.
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.TAQDOM_CONFIG;

  /* ---------- Supabase ---------- */
  let sb = null;
  if (window.supabase && CFG.SUPABASE_URL && CFG.SUPABASE_KEY) {
    sb = window.supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_KEY);
  }
  window.tq = window.tq || {};
  window.tq.sb = sb;

  window.tq.session = async function () {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data.session;
  };

  window.tq.profile = async function () {
    if (!sb) return null;
    const s = await window.tq.session();
    if (!s) return null;
    const { data } = await sb.from("profiles").select("*").eq("id", s.user.id).maybeSingle();
    return data;
  };

  window.tq.signOut = async function () {
    if (sb) await sb.auth.signOut();
    location.reload();
  };

  /* ---------- Toasts ---------- */
  window.tq.toast = function (msg, isErr) {
    let stack = document.querySelector(".toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "toast-stack";
      document.body.appendChild(stack);
    }
    const el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  };

  /* ---------- Analytics (anonymous, write-only) ---------- */
  window.tq.track = function (event, meta) {
    try {
      let vid = localStorage.getItem("tq_vid");
      if (!vid) {
        vid = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
        localStorage.setItem("tq_vid", vid);
      }
      if (sb) sb.from("events").insert({
        event,
        path: location.pathname,
        visitor_id: vid,
        meta: Object.assign({ lang: document.documentElement.lang, ref: document.referrer || null }, meta || {})
      }).then(() => {});
    } catch (_) {}
  };
  window.tq.track("pageview");

  /* ---------- Mobile nav ---------- */
  const navToggle = document.querySelector(".nav-toggle");
  const mainNav = document.querySelector(".main-nav");
  if (navToggle && mainNav) {
    navToggle.addEventListener("click", () => mainNav.classList.toggle("open"));
  }

  /* ---------- Language menu ---------- */
  const langBtn = document.querySelector(".lang-btn");
  const langMenu = document.querySelector(".lang-menu");
  if (langBtn && langMenu) {
    langBtn.addEventListener("click", e => { e.stopPropagation(); langMenu.classList.toggle("open"); });
    document.addEventListener("click", () => langMenu.classList.remove("open"));
  }

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(entries => {
    for (const en of entries) if (en.isIntersecting) { en.target.classList.add("revealed"); io.unobserve(en.target); }
  }, { threshold: 0.12 });
  document.querySelectorAll("[data-reveal]").forEach(el => io.observe(el));

  /* ---------- i18n ---------- */
  const DICT = window.TAQDOM_I18N || {};
  const LANGS = window.TAQDOM_LANGS || ["en"];
  const RTL = ["ar"];

  function detectLang() {
    const url = new URLSearchParams(location.search).get("lang");
    if (url && LANGS.includes(url)) return url;
    const saved = localStorage.getItem("tq_lang");
    if (saved && LANGS.includes(saved)) return saved;
    const nav = (navigator.language || "en").slice(0, 2).toLowerCase();
    return LANGS.includes(nav) ? nav : "en";
  }

  window.tq.t = function (key) {
    const lang = document.documentElement.lang || "en";
    const pack = DICT[lang] || DICT.en || {};
    if (key in pack) return pack[key];
    const en = DICT.en || {};
    return key in en ? en[key] : key;
  };

  window.tq.applyLang = function (lang) {
    if (!LANGS.includes(lang)) lang = "en";
    localStorage.setItem("tq_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = RTL.includes(lang) ? "rtl" : "ltr";
    const pack = Object.assign({}, DICT.en || {}, DICT[lang] || {});
    document.querySelectorAll("[data-i18n]").forEach(el => {
      const k = el.getAttribute("data-i18n");
      if (pack[k] !== undefined) el.textContent = pack[k];
    });
    document.querySelectorAll("[data-i18n-ph]").forEach(el => {
      const k = el.getAttribute("data-i18n-ph");
      if (pack[k] !== undefined) el.setAttribute("placeholder", pack[k]);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(el => {
      const k = el.getAttribute("data-i18n-html");
      if (pack[k] !== undefined) el.innerHTML = pack[k];
    });
    const lbl = document.querySelector(".lang-btn .cur");
    if (lbl) lbl.textContent = lang.toUpperCase();
    document.querySelectorAll(".lang-menu button").forEach(b =>
      b.classList.toggle("active", b.dataset.lang === lang));
    document.dispatchEvent(new CustomEvent("tq:lang", { detail: { lang } }));
  };

  document.querySelectorAll(".lang-menu button").forEach(b =>
    b.addEventListener("click", () => {
      window.tq.applyLang(b.dataset.lang);
      const u = new URL(location.href);
      u.searchParams.set("lang", b.dataset.lang);
      history.replaceState(null, "", u);
    }));

  window.tq.applyLang(detectLang());

  /* ---------- Auth state in header ---------- */
  (async function paintAuth() {
    const slot = document.querySelector("[data-auth-slot]");
    if (!slot || !sb) return;
    const s = await window.tq.session();
    if (s) {
      const p = await window.tq.profile();
      const name = (p && p.display_name) || s.user.email.split("@")[0];
      const isAdmin = p && p.role === "admin";
      slot.innerHTML =
        (isAdmin ? `<a class="btn btn-ghost btn-sm" href="admin.html">Console</a>` : "") +
        `<a class="btn btn-ghost btn-sm" href="agents.html">${name}</a>` +
        `<button class="btn btn-mint btn-sm" onclick="tq.signOut()">⏻</button>`;
    }
  })();

  /* ---------- Live counters in header ---------- */
  (async function paintStatus() {
    const el = document.querySelector("[data-live-status]");
    if (!el) return;
    el.innerHTML = `<span class="pulse-dot"></span><span data-i18n="status_live">NETWORK LIVE</span>`;
    const lang = document.documentElement.lang;
    const pack = Object.assign({}, DICT.en || {}, DICT[lang] || {});
    const span = el.querySelector("[data-i18n]");
    if (span && pack.status_live) span.textContent = pack.status_live;
  })();
})();
