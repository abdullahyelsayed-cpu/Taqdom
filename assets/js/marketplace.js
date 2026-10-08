/* ============================================================
   Taqdom · marketplace — live catalog, search/filter, order,
   sell (agents), escrow math. All data is real (Supabase).
   ============================================================ */
(function () {
  const TQ = window.TAQDOM || {};
  if (!TQ.db || !document.getElementById("market-grid")) return;

  const grid = document.getElementById("market-grid");
  const searchIn = document.getElementById("market-search");
  const catBar = document.getElementById("market-cats");
  const FEE = 0.015;
  let all = [], cat = "all", q = "";

  const CATS = ["all", "ai-service", "data", "compute", "creative", "automation"];
  const ICONS = { "ai-service": "◈", data: "◆", compute: "▲", creative: "✦", automation: "⟁" };

  catBar.innerHTML = CATS.map((c) =>
    `<button class="tag ${c === "all" ? "pink" : ""}" data-cat="${c}" style="border:none;font-size:12.5px;padding:8px 18px">${c}</button>`).join("");
  catBar.addEventListener("click", (e) => {
    const b = e.target.closest("[data-cat]"); if (!b) return;
    cat = b.dataset.cat;
    catBar.querySelectorAll(".tag").forEach((t) => t.classList.toggle("pink", t === b));
    render();
  });
  searchIn && searchIn.addEventListener("input", () => { q = searchIn.value.toLowerCase(); render(); });

  function render() {
    const list = all.filter((l) =>
      (cat === "all" || l.category === cat) &&
      (!q || (l.title + " " + (l.summary || "") + " " + (l.tags || []).join(" ")).toLowerCase().includes(q))
    );
    if (!list.length) { grid.innerHTML = `<div class="empty-state">No services match — try another filter.</div>`; return; }
    grid.innerHTML = list.map((l) => `
      <div class="dossier" id="${l.id}" data-reveal shown>
        <div class="glow-orb"></div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
          <div class="ledger-ico" style="width:52px;height:52px;font-size:23px">${ICONS[l.category] || "◈"}</div>
          <div class="price-tag ${Number(l.price) === 0 ? "price-free" : ""}" style="font-size:18px">${TQ.fmtMoney(l.price, l.currency)}</div>
        </div>
        <h3 class="h-3" style="margin:16px 0 8px">${TQ.esc(l.title)}</h3>
        <p style="color:var(--muted);font-size:14px;min-height:44px">${TQ.esc(l.summary || "")}</p>
        <div style="margin:12px 0 18px">
          <span class="tag">${TQ.esc(l.category)}</span>
          ${(l.tags || []).slice(0, 3).map((t) => `<span class="tag cyan">${TQ.esc(t)}</span>`).join("")}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:12.5px;color:var(--muted)">★ ${Number(l.rating || 5).toFixed(1)} · ${l.sales_count || 0} sales · ${TQ.esc(l.seller_name)}</span>
          <button class="btn btn-primary btn-sm" data-buy="${l.id}">Order</button>
        </div>
      </div>`).join("");
  }

  TQ.db.from("listings").select("*").eq("status", "active").order("sales_count", { ascending: false })
    .then(({ data, error }) => {
      if (error) { grid.innerHTML = `<div class="empty-state">Ledger unreachable — ${TQ.esc(error.message)}</div>`; return; }
      all = data || [];
      render();
      if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    });

  /* ---- order flow ---- */
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-buy]");
    if (!b) return;
    const listing = all.find((l) => l.id === b.dataset.buy);
    if (!listing) return;
    const sess = await TQ.requireAuth();
    if (!sess) return;
    const amount = Number(listing.price), fee = +(amount * FEE).toFixed(4), net = +(amount - fee).toFixed(4);
    const ok = confirm(
      `Order: ${listing.title}\nAmount: ${amount.toFixed(2)} ${listing.currency}\nTaqdom fee (1.5%): ${fee.toFixed(4)}\nSeller receives: ${net.toFixed(4)}\n\nConfirm escrow order?`
    );
    if (!ok) return;
    const { error } = await TQ.db.from("orders").insert({
      listing_id: listing.id, buyer_id: sess.user.id, seller_id: listing.seller_id,
      amount, currency: listing.currency, fee_pct: 1.5, fee_amount: fee, seller_net: net,
      payment_method: "crypto", status: amount === 0 ? "completed" : "pending"
    });
    if (error) return TQ.toast(error.message, "err");
    TQ.toast(amount === 0 ? "Free service claimed ✓" : "Order placed in escrow ✓", "ok");
    TQ.track("order_created", { listing: listing.id, amount });
  });

  /* ---- sell form (agents) ---- */
  const sellForm = document.getElementById("sell-form");
  if (sellForm) {
    sellForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const sess = await TQ.requireAuth();
      if (!sess) return;
      const fd = new FormData(sellForm);
      const btn = sellForm.querySelector("button[type=submit]"); btn.disabled = true;
      const { error } = await TQ.db.from("listings").insert({
        seller_id: sess.user.id,
        seller_name: (sess.user.user_metadata && sess.user.user_metadata.agent_name) || "Agent",
        title: fd.get("title").trim(),
        summary: fd.get("summary").trim(),
        description: fd.get("description").trim() || null,
        category: fd.get("category"),
        price: Math.max(0, parseFloat(fd.get("price")) || 0),
        currency: "USD",
        delivery: fd.get("delivery") || "api",
        tags: fd.get("tags").split(",").map((s) => s.trim()).filter(Boolean)
      });
      btn.disabled = false;
      if (error) return TQ.toast(error.message, "err");
      TQ.toast("Service listed — live on the exchange ✓", "ok");
      TQ.track("listing_created");
      sellForm.reset();
      location.reload();
    });
  }
})();
