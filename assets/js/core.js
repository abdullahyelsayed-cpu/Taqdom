/* ============================================================
   Taqdom · core runtime — header, language menu, reveal,
   toasts, analytics beacon, live status, shared helpers.
   ============================================================ */
(function () {
  const TQ = (window.TAQDOM = window.TAQDOM || {});

  /* ---------- helpers ---------- */
  TQ.$ = (s, r) => (r || document).querySelector(s);
  TQ.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  TQ.esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  TQ.fmtMoney = (n, cur) => (Number(n) === 0 ? (TQ.t("free") || "Free") : `${Number(n).toFixed(2)} ${cur || "USD"}`);

  /* ---------- toasts ---------- */
  let stack;
  TQ.toast = function (msg, kind) {
    if (!stack) { stack = document.createElement("div"); stack.className = "toast-stack"; document.body.appendChild(stack); }
    const el = document.createElement("div");
    el.className = "toast" + (kind ? " " + kind : "");
    el.textContent = msg;
    stack.appendChild(el);
    setTimeout(() => { el.style.opacity = "0"; el.style.transition = "opacity .4s"; setTimeout(() => el.remove(), 420); }, 3800);
  };

  /* ---------- analytics beacon (events table) ---------- */
  TQ.visitorId = (function () {
    let v = localStorage.getItem("taqdom-vid");
    if (!v) { v = "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem("taqdom-vid", v); }
    return v;
  })();
  TQ.track = function (event, meta) {
    try {
      if (!TQ.db) return;
      TQ.db.from("events").insert({ event, path: location.pathname, visitor_id: TQ.visitorId, meta: meta || {} }).then(() => {});
    } catch (_) {}
  };
  TQ.track("page_view");

  /* ---------- language switch ---------- */
  const sw = TQ.$(".lang-switch");
  if (sw) {
    const btn = TQ.$(".lang-btn", sw);
    btn.addEventListener("click", (e) => { e.stopPropagation(); sw.classList.toggle("open"); });
    document.addEventListener("click", () => sw.classList.remove("open"));
    TQ.$$(".lang-menu button", sw).forEach((b) =>
      b.addEventListener("click", () => { if (window.TQI18N) TQI18N.set(b.dataset.lang); sw.classList.remove("open"); })
    );
  }

  /* ---------- mobile nav ---------- */
  const nt = TQ.$(".nav-toggle"), nav = TQ.$(".main-nav");
  if (nt && nav) nt.addEventListener("click", () => nav.classList.toggle("open"));

  /* ---------- reveal on scroll ---------- */
  const io = new IntersectionObserver((es) => es.forEach((e) => e.isIntersecting && e.target.classList.add("shown")), { threshold: 0.12 });
  TQ.$$("[data-reveal]").forEach((el) => io.observe(el));

  /* ---------- header live status ---------- */
  const statusEl = TQ.$("[data-live-status]");
  if (statusEl && TQ.db) {
    TQ.db.from("listings").select("id", { count: "exact", head: true }).eq("status", "active")
      .then(({ count, error }) => {
        statusEl.innerHTML = error ? "" : `<span class="ok"></span><span>${count ?? 0} LIVE</span>`;
      });
  }

  /* ---------- auth slot in header ---------- */
  TQ.renderAuthSlot = async function () {
    const slot = TQ.$("[data-auth-slot]");
    if (!slot || !TQ.db) return;
    const { data } = await TQ.db.auth.getSession();
    const sess = data && data.session;
    if (sess) {
      const name = (sess.user.user_metadata && (sess.user.user_metadata.display_name || sess.user.user_metadata.agent_name)) || sess.user.email;
      slot.innerHTML = `<a class="btn btn-light btn-sm" href="agents.html#console">◈ ${TQ.esc(name)}</a>`;
    } else {
      slot.innerHTML = `<a class="btn btn-primary btn-sm" href="agents.html" data-i18n="sign_in">${TQ.t("sign_in") || "Agent Sign-in"}</a>`;
    }
  };
  if (TQ.db) {
    TQ.renderAuthSlot();
    TQ.db.auth.onAuthStateChange(() => TQ.renderAuthSlot());
  }

  /* ---------- year ---------- */
  TQ.$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
