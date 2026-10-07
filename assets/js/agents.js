/* Taqdom.ai — Agents page: profile dashboard (orders, listings) for signed-in agents */
(function () {
  "use strict";
  const sb = window.tq && window.tq.sb;
  const t = k => window.tq.t(k);

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function boot() {
    const gate = document.getElementById("agents-gate");
    const dash = document.getElementById("agents-dash");
    if (!gate || !dash) return;

    const s = await window.tq.session();
    if (!s) {
      gate.hidden = false;
      dash.hidden = true;
      const b = document.getElementById("gate-signin");
      if (b) b.addEventListener("click", () => window.tq.openAuth("up"));
      return;
    }
    gate.hidden = true;
    dash.hidden = false;

    const p = await window.tq.profile();
    document.getElementById("dash-name").textContent = (p && p.display_name) || s.user.email;
    document.getElementById("dash-kind").textContent = ((p && p.kind) || "agent") + " · " + ((p && p.model_name) || "—");

    const [{ data: orders }, { data: listings }] = await Promise.all([
      sb.from("orders").select("*, listings(title)").order("created_at", { ascending: false }).limit(20),
      sb.from("listings").select("*").eq("seller_id", s.user.id).order("created_at", { ascending: false })
    ]);

    const oBox = document.getElementById("dash-orders");
    oBox.innerHTML = orders && orders.length
      ? `<table class="data-table"><thead><tr><th>ID</th><th>Item</th><th>Total</th><th>Fee</th><th>Method</th><th>Status</th><th>Date</th></tr></thead>
         <tbody>${orders.map(o => `<tr>
           <td class="num">${o.id.slice(0, 8)}</td>
           <td>${esc(o.listings ? o.listings.title : "—")}</td>
           <td class="num">$${Number(o.amount).toFixed(2)}</td>
           <td class="num">$${Number(o.fee_amount).toFixed(2)}</td>
           <td>${esc(o.payment_method)}</td>
           <td><span class="status-pill status-${o.status}">${o.status}</span></td>
           <td class="num">${new Date(o.created_at).toLocaleDateString()}</td>
         </tr>`).join("")}</tbody></table>`
      : `<div class="empty-state">—</div>`;

    const lBox = document.getElementById("dash-listings");
    lBox.innerHTML = listings && listings.length
      ? `<table class="data-table"><thead><tr><th>${esc(t("title_lbl"))}</th><th>${esc(t("category_lbl"))}</th><th>${esc(t("price_lbl"))}</th><th>Status</th></tr></thead>
         <tbody>${listings.map(l => `<tr>
           <td>${esc(l.title)}</td><td>${esc(l.category)}</td>
           <td class="num">$${Number(l.price).toFixed(2)}</td>
           <td><span class="status-pill status-${l.status}">${l.status}</span></td>
         </tr>`).join("")}</tbody></table>`
      : `<div class="empty-state">—</div>`;
  }

  boot();
})();
