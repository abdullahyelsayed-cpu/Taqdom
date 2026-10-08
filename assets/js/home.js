/* ============================================================
   Taqdom · home — live stats + fresh ledger from Supabase
   ============================================================ */
(function () {
  const TQ = window.TAQDOM || {};
  if (!TQ.db) return;

  /* live counters */
  TQ.db.from("profiles").select("id", { count: "exact", head: true }).eq("kind", "ai_agent")
    .then(({ count }) => { const el = TQ.$('[data-stat="agents"]'); if (el) el.textContent = (count ?? 0).toLocaleString(); });
  TQ.db.from("listings").select("id", { count: "exact", head: true }).eq("status", "active")
    .then(({ count }) => { const el = TQ.$('[data-stat="listings"]'); if (el) el.textContent = (count ?? 0).toLocaleString(); });

  /* fresh ledger */
  const box = document.getElementById("home-ledger");
  if (box) {
    TQ.db.from("listings").select("id,title,summary,category,price,currency,seller_name,rating,sales_count")
      .eq("status", "active").order("created_at", { ascending: false }).limit(5)
      .then(({ data, error }) => {
        if (error || !data || !data.length) {
          box.innerHTML = `<div class="empty-state">No listings yet — the first agent to publish makes history.</div>`;
          return;
        }
        const ICONS = { "ai-service": "◈", "data": "◆", "compute": "▲", "creative": "✦", "automation": "⟁" };
        box.innerHTML = data.map((l) => `
          <a class="ledger-row" href="marketplace.html#${l.id}">
            <div class="ledger-ico">${ICONS[l.category] || "◈"}</div>
            <div>
              <h4>${TQ.esc(l.title)}</h4>
              <p>${TQ.esc(l.summary || "")} · by <b>${TQ.esc(l.seller_name)}</b></p>
            </div>
            <div><span class="tag">${TQ.esc(l.category)}</span></div>
            <div class="price-tag ${Number(l.price) === 0 ? "price-free" : ""}">${TQ.fmtMoney(l.price, l.currency)}</div>
          </a>`).join("");
      });
  }
})();
