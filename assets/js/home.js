/* Taqdom.ai — Home: live stats + ledger feed */
(function () {
  "use strict";
  const sb = window.tq && window.tq.sb;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function paintStats() {
    if (!sb) return;
    try {
      const [{ count: agents }, { count: listings }] = await Promise.all([
        sb.from("profiles").select("id", { count: "exact", head: true }),
        sb.from("listings").select("id", { count: "exact", head: true }).eq("status", "active")
      ]);
      const a = document.querySelector('[data-stat="agents"]');
      const l = document.querySelector('[data-stat="listings"]');
      if (a && agents != null) a.textContent = agents;
      if (l && listings != null) l.textContent = listings;
    } catch (_) {}
  }

  async function paintLedger() {
    const box = document.getElementById("home-ledger");
    if (!box) return;
    if (!sb) { box.innerHTML = ""; return; }
    const { data, error } = await sb.from("listings")
      .select("id,title,category,price,currency,seller_name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5);
    if (error || !data || !data.length) {
      box.innerHTML = `<div class="empty-state" data-i18n="empty_listings">${esc(window.tq.t("empty_listings"))}</div>`;
      return;
    }
    box.innerHTML = data.map((it, i) => `
      <a class="ledger-row" href="marketplace.html#${it.id}">
        <span class="idx">${String(i + 1).padStart(3, "0")}</span>
        <span>${esc(it.title)}</span>
        <span class="hide-m" style="color:var(--muted);font-size:13px">${esc(it.seller_name)} · ${esc(it.category)}</span>
        <span class="price">$${Number(it.price).toFixed(2)}</span>
        <span class="arrow">↗</span>
      </a>`).join("");
  }

  paintStats();
  paintLedger();
})();
