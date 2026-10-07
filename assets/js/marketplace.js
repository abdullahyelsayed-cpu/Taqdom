/* ==========================================================================
   TAQDOM.AI — Marketplace engine: catalog, filters, checkout, selling, chat
   ========================================================================== */
(function () {
  "use strict";
  const sb = window.tq && window.tq.sb;
  const t = k => window.tq.t(k);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const CATS = ["ai-service", "data-feed", "security", "media", "legal", "compute", "other"];
  let allListings = [];
  let activeCat = "all";
  let query = "";

  /* ---------------- Catalog ---------------- */
  async function loadListings() {
    const grid = document.getElementById("market-grid");
    if (!grid) return;
    if (!sb) { grid.innerHTML = `<div class="empty-state">OFFLINE</div>`; return; }
    const { data, error } = await sb.from("listings")
      .select("*").eq("status", "active").order("created_at", { ascending: false });
    if (error) { grid.innerHTML = `<div class="empty-state">${esc(error.message)}</div>`; return; }
    allListings = data || [];
    render();
  }

  function render() {
    const grid = document.getElementById("market-grid");
    const q = query.trim().toLowerCase();
    const rows = allListings.filter(it =>
      (activeCat === "all" || it.category === activeCat) &&
      (!q || (it.title + " " + (it.summary || "") + " " + (it.tags || []).join(" ")).toLowerCase().includes(q))
    );
    if (!rows.length) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">${esc(t("empty_listings"))}</div>`;
      return;
    }
    grid.innerHTML = rows.map(it => `
      <article class="dossier" id="${it.id}">
        <div class="glow-orb"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <span class="tag">${esc(it.category)}</span>
          <span class="mono" style="color:var(--mint);font-size:18px;font-weight:700">$${Number(it.price).toFixed(2)}</span>
        </div>
        <h3 class="h-3" style="margin:16px 0 8px">${esc(it.title)}</h3>
        <p style="color:var(--muted);font-size:14px;min-height:44px">${esc(it.summary || "")}</p>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid var(--line-soft)">
          <span class="badge-verified">${esc(it.seller_name)}</span>
          <button class="btn btn-mint btn-sm" data-buy="${it.id}">${esc(t("buy_now"))}</button>
        </div>
      </article>`).join("");
    grid.querySelectorAll("[data-buy]").forEach(b =>
      b.addEventListener("click", () => openCheckout(allListings.find(x => x.id === b.dataset.buy))));
  }

  /* ---------------- Filters & search ---------------- */
  function buildFilters() {
    const bar = document.getElementById("filter-bar");
    if (!bar) return;
    const mk = (val, label) => {
      const b = document.createElement("button");
      b.className = "chip" + (val === "all" ? " active" : "");
      b.textContent = label;
      b.addEventListener("click", () => {
        activeCat = val;
        bar.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        b.classList.add("active");
        render();
      });
      bar.appendChild(b);
    };
    mk("all", t("all_categories"));
    CATS.forEach(c => mk(c, c));
    const s = document.getElementById("market-search");
    if (s) {
      const pre = new URLSearchParams(location.search).get("q");
      if (pre) { s.value = pre; query = pre; }
      s.addEventListener("input", () => { query = s.value; render(); });
    }
  }

  /* ---------------- Checkout ---------------- */
  function openCheckout(item) {
    if (!item) return;
    let wrap = document.getElementById("tq-checkout");
    if (wrap) wrap.remove();
    const feePct = window.TAQDOM_CONFIG.PLATFORM_FEE_PCT;
    const amount = Number(item.price);
    const fee = +(amount * feePct / 100).toFixed(2);
    const net = +(amount - fee).toFixed(2);

    wrap = document.createElement("div");
    wrap.className = "modal-backdrop open";
    wrap.id = "tq-checkout";
    wrap.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div><div class="folio">SETTLEMENT · ESCROW</div><h3 class="h-2">${esc(t("checkout"))}</h3></div>
          <button class="modal-close" data-x>×</button>
        </div>
        <div class="dossier" style="padding:18px;margin-bottom:22px">
          <b>${esc(item.title)}</b>
          <div style="color:var(--muted);font-size:13px;margin-top:4px">${esc(item.seller_name)} · ${esc(item.category)}</div>
        </div>
        <table class="data-table" style="margin-bottom:22px">
          <tr><td>${esc(t("total"))}</td><td class="num" style="text-align:end">$${amount.toFixed(2)}</td></tr>
          <tr><td>${esc(t("fee"))}</td><td class="num" style="text-align:end;color:var(--amber)">$${fee.toFixed(2)}</td></tr>
          <tr><td>${esc(t("seller_gets"))}</td><td class="num" style="text-align:end;color:var(--mint)">$${net.toFixed(2)}</td></tr>
        </table>
        <div class="field">
          <label>${esc(t("pay_method"))}</label>
          <select class="select" id="co-method">
            <option value="crypto">${esc(t("pay_crypto"))}</option>
            <option value="paymob">${esc(t("pay_paymob"))}</option>
          </select>
        </div>
        <div id="co-rail"></div>
        <button class="btn btn-mint btn-block" id="co-confirm">${esc(t("confirm_order"))}</button>
      </div>`;
    document.body.appendChild(wrap);
    const close = () => wrap.remove();
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    wrap.querySelector("[data-x]").addEventListener("click", close);

    const rail = wrap.querySelector("#co-rail");
    const methodSel = wrap.querySelector("#co-method");
    function paintRail() {
      if (methodSel.value === "paymob") {
        rail.innerHTML = `<div class="dossier" style="padding:16px;margin-bottom:18px;border-color:rgba(255,209,102,.4)">
          <b style="color:var(--amber)">${esc(t("pay_pending_title"))}</b>
          <p style="color:var(--muted);font-size:13px;margin-top:6px">${esc(t("pay_pending_body"))}</p></div>`;
      } else {
        const nets = window.TAQDOM_CONFIG.PAYMENTS.crypto.networks;
        rail.innerHTML = `<div class="dossier" style="padding:16px;margin-bottom:18px">
          <p style="color:var(--muted);font-size:13px;margin-bottom:12px">${esc(t("crypto_instructions"))}</p>
          ${nets.map(n => `<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:8px">
            <span class="mono" style="font-size:11px;color:var(--cyan)">${esc(n.label)}</span>
            <button class="btn btn-ghost btn-sm" data-addr="${esc(n.address)}">${esc(t("copy"))}</button>
          </div>`).join("")}
          <input class="input mono" id="co-tx" placeholder="tx hash / بصمة المعاملة" style="margin-top:8px;font-size:12px">
        </div>`;
        rail.querySelectorAll("[data-addr]").forEach(b => b.addEventListener("click", () => {
          navigator.clipboard && navigator.clipboard.writeText(b.dataset.addr);
          b.textContent = t("copied");
        }));
      }
    }
    methodSel.addEventListener("change", paintRail);
    paintRail();

    wrap.querySelector("#co-confirm").addEventListener("click", async () => {
      const s = await window.tq.requireAuth();
      if (!s) return;
      const btn = wrap.querySelector("#co-confirm");
      btn.disabled = true;
      const tx = (wrap.querySelector("#co-tx") || {}).value || null;
      const { error } = await sb.from("orders").insert({
        listing_id: item.id,
        buyer_id: s.user.id,
        seller_id: item.seller_id || null,
        amount, currency: item.currency || "USD",
        fee_pct: feePct, fee_amount: fee, seller_net: net,
        payment_method: methodSel.value,
        payment_ref: tx,
        status: methodSel.value === "crypto" && tx ? "paid" : "pending"
      });
      btn.disabled = false;
      if (error) { window.tq.toast(error.message, true); return; }
      window.tq.track("order_created", { amount, method: methodSel.value });
      window.tq.toast(t("order_created"));
      close();
    });
  }

  /* ---------------- Sell ---------------- */
  function buildSell() {
    const btn = document.getElementById("sell-open");
    if (!btn) return;
    btn.addEventListener("click", async () => {
      const s = await window.tq.requireAuth();
      if (!s) return;
      let wrap = document.getElementById("tq-sell");
      if (wrap) wrap.remove();
      wrap = document.createElement("div");
      wrap.className = "modal-backdrop open";
      wrap.id = "tq-sell";
      wrap.innerHTML = `
        <div class="modal">
          <div class="modal-head">
            <div><div class="folio">SUPPLY · NEW SIGNAL</div><h3 class="h-2">${esc(t("new_listing"))}</h3></div>
            <button class="modal-close" data-x>×</button>
          </div>
          <div class="field"><label>${esc(t("title_lbl"))}</label><input class="input" id="sl-title" maxlength="120"></div>
          <div class="field"><label>${esc(t("summary_lbl"))}</label><input class="input" id="sl-summary" maxlength="200"></div>
          <div class="field"><label>${esc(t("desc_lbl"))}</label><textarea class="textarea" id="sl-desc"></textarea></div>
          <div class="grid grid-2">
            <div class="field"><label>${esc(t("category_lbl"))}</label>
              <select class="select" id="sl-cat">${CATS.map(c => `<option>${c}</option>`).join("")}</select></div>
            <div class="field"><label>${esc(t("price_lbl"))}</label><input class="input" id="sl-price" type="number" min="0" step="0.01" value="1.99"></div>
          </div>
          <button class="btn btn-mint btn-block" id="sl-publish">${esc(t("publish"))}</button>
        </div>`;
      document.body.appendChild(wrap);
      wrap.addEventListener("click", e => { if (e.target === wrap) wrap.remove(); });
      wrap.querySelector("[data-x]").addEventListener("click", () => wrap.remove());
      wrap.querySelector("#sl-publish").addEventListener("click", async () => {
        const title = wrap.querySelector("#sl-title").value.trim();
        const price = parseFloat(wrap.querySelector("#sl-price").value);
        if (!title || !(price >= 0)) { window.tq.toast("Title + price required", true); return; }
        const p = await window.tq.profile();
        const { error } = await sb.from("listings").insert({
          seller_id: s.user.id,
          seller_name: (p && p.display_name) || s.user.email.split("@")[0],
          title,
          summary: wrap.querySelector("#sl-summary").value.trim(),
          description: wrap.querySelector("#sl-desc").value.trim(),
          category: wrap.querySelector("#sl-cat").value,
          price
        });
        if (error) { window.tq.toast(error.message, true); return; }
        window.tq.track("listing_published");
        window.tq.toast("✓");
        wrap.remove();
        loadListings();
      });
    });
  }

  /* ---------------- Chat ---------------- */
  async function buildChat() {
    const log = document.getElementById("chat-log");
    const input = document.getElementById("chat-input");
    const send = document.getElementById("chat-send");
    if (!log || !sb) return;
    let myName = null;
    const prof = await window.tq.profile();
    const sess = await window.tq.session();
    myName = (prof && prof.display_name) || (sess ? sess.user.email.split("@")[0] : "anon-" + Math.random().toString(36).slice(2, 7));

    function bubble(m) {
      const mine = sess && m.sender_id === sess.user.id;
      const el = document.createElement("div");
      el.className = "chat-msg" + (mine ? " mine" : "");
      el.innerHTML = `<div class="meta">${esc(m.sender_name)} · ${new Date(m.created_at).toLocaleTimeString()}</div>
        <div class="bubble">${esc(m.body)}</div>`;
      log.appendChild(el);
      log.scrollTop = log.scrollHeight;
    }

    const { data } = await sb.from("messages").select("*").eq("room", "global")
      .order("created_at", { ascending: false }).limit(40);
    (data || []).reverse().forEach(bubble);

    sb.channel("global-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: "room=eq.global" },
        p => bubble(p.new))
      .subscribe();

    async function transmit() {
      const body = input.value.trim();
      if (!body) return;
      input.value = "";
      await sb.from("messages").insert({ room: "global", sender_id: sess ? sess.user.id : null, sender_name: myName, body });
    }
    send.addEventListener("click", transmit);
    input.addEventListener("keydown", e => { if (e.key === "Enter") transmit(); });
  }

  buildFilters();
  loadListings();
  buildSell();
  buildChat();
})();
