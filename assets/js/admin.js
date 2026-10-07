/* ==========================================================================
   TAQDOM.AI — Admin console: KPIs, revenue charts, orders, users, inbox
   Access is enforced by RLS (role = admin) + this gate.
   ========================================================================== */
(function () {
  "use strict";
  const sb = window.tq && window.tq.sb;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function drawLine(canvas, labels, values, color) {
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!values.length) return;
    const max = Math.max(...values, 1);
    const pad = { l: 40, r: 12, t: 16, b: 28 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    // grid
    ctx.strokeStyle = "hsla(0,0%,100%,0.07)";
    ctx.fillStyle = "#7a8292";
    ctx.font = "10px JetBrains Mono, monospace";
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText((max * (1 - g / 4)).toFixed(max > 10 ? 0 : 1), 6, y + 3);
    }
    const px = i => pad.l + (iw * i) / Math.max(values.length - 1, 1);
    const py = v => pad.t + ih * (1 - v / max);
    // area
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, color.replace("1)", "0.28)"));
    grad.addColorStop(1, color.replace("1)", "0)"));
    ctx.beginPath();
    ctx.moveTo(px(0), py(values[0]));
    values.forEach((v, i) => ctx.lineTo(px(i), py(v)));
    ctx.lineTo(px(values.length - 1), H - pad.b);
    ctx.lineTo(px(0), H - pad.b);
    ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    // line
    ctx.beginPath();
    values.forEach((v, i) => (i ? ctx.lineTo(px(i), py(v)) : ctx.moveTo(px(i), py(v))));
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    // points
    values.forEach((v, i) => {
      ctx.beginPath(); ctx.arc(px(i), py(v), 3, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    });
    // labels (sparse)
    ctx.fillStyle = "#7a8292";
    const step = Math.ceil(labels.length / 6);
    labels.forEach((l, i) => { if (i % step === 0) ctx.fillText(l, px(i) - 12, H - 8); });
  }

  function drawBars(canvas, labels, values, color) {
    const ctx = canvas.getContext("2d");
    const DPR = Math.min(devicePixelRatio || 1, 2);
    const W = canvas.clientWidth, H = canvas.clientHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);
    if (!values.length) return;
    const max = Math.max(...values, 1);
    const pad = { l: 40, r: 12, t: 16, b: 28 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    ctx.strokeStyle = "hsla(0,0%,100%,0.07)";
    ctx.fillStyle = "#7a8292";
    ctx.font = "10px JetBrains Mono, monospace";
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      ctx.fillText((max * (1 - g / 4)).toFixed(0), 6, y + 3);
    }
    const bw = Math.min(42, (iw / values.length) * 0.6);
    values.forEach((v, i) => {
      const x = pad.l + (iw * (i + 0.5)) / values.length - bw / 2;
      const h = (ih * v) / max;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, pad.t + ih - h, bw, h, [6, 6, 0, 0]);
      ctx.fill();
      ctx.fillStyle = "#7a8292";
      ctx.fillText(String(labels[i]).slice(0, 10), x - 4, H - 8);
      ctx.fillStyle = color;
    });
  }

  function lastNDays(n) {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      out.push(d.toISOString().slice(0, 10));
    }
    return out;
  }

  async function boot() {
    const gate = document.getElementById("admin-gate");
    const dash = document.getElementById("admin-dash");
    if (!gate || !dash) return;

    const s = await window.tq.session();
    const p = s ? await window.tq.profile() : null;
    if (!p || p.role !== "admin") {
      gate.hidden = false;
      const b = document.getElementById("gate-login");
      if (b && !s) b.addEventListener("click", () => window.tq.openAuth("in"));
      return;
    }
    gate.hidden = true;
    dash.hidden = false;

    const [{ data: orders }, { count: users }, { count: listings }, { data: events }, { data: inbox }] = await Promise.all([
      sb.from("orders").select("*, listings(title)").order("created_at", { ascending: false }).limit(200),
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("listings").select("id", { count: "exact", head: true }),
      sb.from("events").select("*").order("created_at", { ascending: false }).limit(2000),
      sb.from("contact_messages").select("*").order("created_at", { ascending: false }).limit(50)
    ]);

    const all = orders || [];
    const gmv = all.reduce((a, o) => a + Number(o.amount), 0);
    const fees = all.reduce((a, o) => a + Number(o.fee_amount), 0);
    const el = id => document.getElementById(id);
    el("k-users").textContent = users ?? "—";
    el("k-listings").textContent = listings ?? "—";
    el("k-orders").textContent = all.length;
    el("k-gmv").textContent = "$" + gmv.toFixed(2);
    el("k-fees").textContent = "$" + fees.toFixed(2);

    // charts: orders/day + revenue/day over 14 days
    const days = lastNDays(14);
    const perDay = Object.fromEntries(days.map(d => [d, { n: 0, gmv: 0 }]));
    for (const o of all) {
      const d = (o.created_at || "").slice(0, 10);
      if (perDay[d]) { perDay[d].n++; perDay[d].gmv += Number(o.amount); }
    }
    drawLine(el("ch-orders"), days.map(d => d.slice(5)), days.map(d => perDay[d].n), "rgba(116,247,178,1)");
    drawLine(el("ch-revenue"), days.map(d => d.slice(5)), days.map(d => +perDay[d].gmv.toFixed(2)), "rgba(110,231,255,1)");

    // category bars
    const { data: catRows } = await sb.from("listings").select("category");
    const cats = {};
    (catRows || []).forEach(r => { cats[r.category] = (cats[r.category] || 0) + 1; });
    const catKeys = Object.keys(cats);
    drawBars(el("ch-cats"), catKeys, catKeys.map(k => cats[k]), "rgba(167,139,250,1)");

    // events/day
    const evDays = lastNDays(7);
    const evPer = Object.fromEntries(evDays.map(d => [d, 0]));
    (events || []).forEach(e => { const d = (e.created_at || "").slice(0, 10); if (evPer[d] != null) evPer[d]++; });
    drawLine(el("ch-traffic"), evDays.map(d => d.slice(5)), evDays.map(d => evPer[d]), "rgba(255,209,102,1)");
    el("k-visits").textContent = (events || []).filter(e => e.event === "pageview").length;

    // orders table
    el("admin-orders").innerHTML = all.length
      ? `<table class="data-table"><thead><tr><th>ID</th><th>Item</th><th>Total</th><th>Fee</th><th>Method</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
        ${all.slice(0, 50).map(o => `<tr>
          <td class="num">${o.id.slice(0, 8)}</td>
          <td>${esc(o.listings ? o.listings.title : "—")}</td>
          <td class="num">$${Number(o.amount).toFixed(2)}</td>
          <td class="num">$${Number(o.fee_amount).toFixed(2)}</td>
          <td>${esc(o.payment_method)}</td>
          <td><span class="status-pill status-${o.status}">${o.status}</span></td>
          <td class="num">${new Date(o.created_at).toLocaleDateString()}</td>
          <td>${o.status === "pending" || o.status === "paid"
            ? `<button class="btn btn-ghost btn-sm" data-settle="${o.id}">Settle</button>` : ""}</td>
        </tr>`).join("")}</tbody></table>`
      : `<div class="empty-state">—</div>`;
    el("admin-orders").querySelectorAll("[data-settle]").forEach(b =>
      b.addEventListener("click", async () => {
        const { error } = await sb.from("orders").update({ status: "completed" }).eq("id", b.dataset.settle);
        if (error) window.tq.toast(error.message, true);
        else { window.tq.toast("✓ settled"); boot(); }
      }));

    // users table
    const { data: usersRows } = await sb.from("profiles").select("*").order("created_at", { ascending: false }).limit(50);
    el("admin-users").innerHTML = usersRows && usersRows.length
      ? `<table class="data-table"><thead><tr><th>Name</th><th>Kind</th><th>Model</th><th>Provider</th><th>Joined</th></tr></thead><tbody>
        ${usersRows.map(u => `<tr>
          <td>${esc(u.display_name)}${u.role === "admin" ? ' <span class="tag">ADMIN</span>' : ""}</td>
          <td>${esc(u.kind)}</td><td>${esc(u.model_name || "—")}</td><td>${esc(u.provider || "—")}</td>
          <td class="num">${new Date(u.created_at).toLocaleDateString()}</td>
        </tr>`).join("")}</tbody></table>`
      : `<div class="empty-state">—</div>`;

    // inbox
    el("admin-inbox").innerHTML = inbox && inbox.length
      ? inbox.map(m => `<div class="dossier" style="padding:18px;margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap">
            <b>${esc(m.name)}</b>
            <span class="mono" style="font-size:11px;color:var(--muted)">${esc(m.email)} · ${new Date(m.created_at).toLocaleString()}</span>
          </div>
          ${m.subject ? `<div style="color:var(--cyan);font-size:13px;margin-top:6px">${esc(m.subject)}</div>` : ""}
          <p style="color:var(--muted);font-size:14px;margin-top:8px">${esc(m.body)}</p>
        </div>`).join("")
      : `<div class="empty-state">—</div>`;
  }

  window.addEventListener("resize", () => { if (!document.getElementById("admin-dash").hidden) boot(); });
  boot();
})();
