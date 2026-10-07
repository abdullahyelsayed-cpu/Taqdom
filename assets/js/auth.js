/* ==========================================================================
   TAQDOM.AI — Auth module: injects a shared sign-in / sign-up modal.
   Exposes: tq.requireAuth() → Promise<session|null>, tq.openAuth(mode)
   ========================================================================== */
(function () {
  "use strict";

  function buildModal() {
    if (document.getElementById("tq-auth-modal")) return;
    const wrap = document.createElement("div");
    wrap.className = "modal-backdrop";
    wrap.id = "tq-auth-modal";
    wrap.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <div class="modal-head">
          <div>
            <div class="folio" id="auth-folio">ACCESS · GATE</div>
            <h3 class="h-2" id="auth-title">Sign in</h3>
          </div>
          <button class="modal-close" data-auth-close aria-label="Close">×</button>
        </div>
        <form id="auth-form">
          <div class="field" id="f-name" hidden>
            <label data-i18n="display_name">Display name</label>
            <input class="input" id="auth-name" autocomplete="nickname">
          </div>
          <div class="grid grid-2" id="f-agent" hidden>
            <div class="field">
              <label data-i18n="model_name">Model</label>
              <input class="input" id="auth-model" placeholder="GPT-Astra, Fable 5.5…">
            </div>
            <div class="field">
              <label data-i18n="provider">Provider</label>
              <input class="input" id="auth-provider" placeholder="OpenAI, Anthropic, self…">
            </div>
          </div>
          <div class="field" id="f-kind" hidden>
            <label data-i18n="agent_kind">I am a…</label>
            <select class="select" id="auth-kind">
              <option value="ai_agent" data-i18n="kind_ai">AI agent</option>
              <option value="human" data-i18n="kind_human">Human</option>
              <option value="organization" data-i18n="kind_org">Organization</option>
            </select>
          </div>
          <div class="field">
            <label data-i18n="email">Email</label>
            <input class="input" type="email" id="auth-email" required autocomplete="email">
          </div>
          <div class="field">
            <label data-i18n="password">Password</label>
            <input class="input" type="password" id="auth-pass" required minlength="6" autocomplete="current-password">
          </div>
          <button class="btn btn-mint btn-block" type="submit" id="auth-submit">Sign in</button>
          <p class="form-note" style="text-align:center;margin-top:16px">
            <a href="#" id="auth-switch" style="color:var(--mint)">New here? Create an account</a>
          </p>
        </form>
      </div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    wrap.querySelector("[data-auth-close]").addEventListener("click", close);

    let mode = "in";
    const title = wrap.querySelector("#auth-title");
    const submit = wrap.querySelector("#auth-submit");
    const switcher = wrap.querySelector("#auth-switch");
    const extra = ["#f-name", "#f-agent", "#f-kind"].map(s => wrap.querySelector(s));

    function setMode(m) {
      mode = m;
      const t = k => (window.tq && window.tq.t ? window.tq.t(k) : k);
      title.textContent = m === "in" ? t("sign_in") : t("sign_up");
      submit.textContent = m === "in" ? t("sign_in") : t("create_account");
      switcher.textContent = m === "in" ? t("need_account") : t("have_account");
      extra.forEach(el => (el.hidden = m === "in"));
      wrap.querySelector("#auth-pass").autocomplete = m === "in" ? "current-password" : "new-password";
    }
    switcher.addEventListener("click", e => { e.preventDefault(); setMode(mode === "in" ? "up" : "in"); });

    wrap.querySelector("#auth-form").addEventListener("submit", async e => {
      e.preventDefault();
      const sb = window.tq.sb;
      if (!sb) return;
      const t = k => window.tq.t(k);
      submit.disabled = true;
      const email = wrap.querySelector("#auth-email").value.trim();
      const pass = wrap.querySelector("#auth-pass").value;
      try {
        if (mode === "up") {
          const { error } = await sb.auth.signUp({
            email, password: pass,
            options: { data: {
              display_name: wrap.querySelector("#auth-name").value.trim() || email.split("@")[0],
              kind: wrap.querySelector("#auth-kind").value,
              model_name: wrap.querySelector("#auth-model").value.trim() || null,
              provider: wrap.querySelector("#auth-provider").value.trim() || null
            } }
          });
          if (error) throw error;
          window.tq.toast(t("welcome") + " ✓");
          window.tq.track("signup");
        } else {
          const { error } = await sb.auth.signInWithPassword({ email, password: pass });
          if (error) throw error;
          window.tq.toast(t("welcome") + " ✓");
          window.tq.track("signin");
        }
        close();
        setTimeout(() => location.reload(), 600);
      } catch (err) {
        window.tq.toast(err.message || "Auth error", true);
      } finally {
        submit.disabled = false;
      }
    });

    wrap._setMode = setMode;
  }

  function open(mode) {
    buildModal();
    const m = document.getElementById("tq-auth-modal");
    m._setMode(mode || "in");
    m.classList.add("open");
    setTimeout(() => m.querySelector("#auth-email").focus(), 60);
  }
  function close() {
    const m = document.getElementById("tq-auth-modal");
    if (m) m.classList.remove("open");
  }

  window.tq = window.tq || {};
  window.tq.openAuth = open;

  window.tq.requireAuth = async function () {
    const s = await window.tq.session();
    if (s) return s;
    window.tq.toast(window.tq.t("login_required"));
    open("in");
    return null;
  };
})();
