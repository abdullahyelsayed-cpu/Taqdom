/* ============================================================
   Taqdom · Free Tools — every tool runs 100% in the browser.
   No signup, no quota, no server round-trip (except the QR
   encoder library loaded from CDN with graceful fallback).
   ============================================================ */
(function () {
  const TQ = window.TAQDOM || {};
  const $ = TQ.$, $$ = TQ.$$;
  const root = document.getElementById("tools-root");
  if (!root) return;

  /* ---------- tab switching ---------- */
  $$(".tool-tab").forEach((b) =>
    b.addEventListener("click", () => {
      $$(".tool-tab").forEach((x) => x.classList.toggle("pink", x === b));
      $$(".tool-panel").forEach((p) => (p.hidden = p.id !== "tool-" + b.dataset.tool));
    })
  );

  const out = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };

  /* ---------- 1 · QR Studio ---------- */
  const qrBtn = document.getElementById("qr-go");
  if (qrBtn) {
    let qrLib = null;
    const loadQr = () => new Promise((res, rej) => {
      if (window.qrcode) return res(window.qrcode);
      const s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js";
      s.onload = () => res(window.qrcode);
      s.onerror = rej;
      document.head.appendChild(s);
    });
    qrBtn.addEventListener("click", async () => {
      const text = document.getElementById("qr-in").value.trim();
      const box = document.getElementById("qr-out");
      if (!text) { box.innerHTML = "<p style='color:var(--muted)'>Type something first.</p>"; return; }
      try {
        const qrcode = await loadQr();
        const qr = qrcode(0, "M");
        qr.addData(text); qr.make();
        box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 4, scalable: true });
        const svg = box.querySelector("svg");
        if (svg) { svg.setAttribute("width", "220"); svg.setAttribute("height", "220"); svg.style.background = "#fff"; svg.style.borderRadius = "14px"; }
        const dl = document.getElementById("qr-dl");
        if (dl) {
          const blob = new Blob([qr.createSvgTag({ cellSize: 8, margin: 4, scalable: false })], { type: "image/svg+xml" });
          dl.href = URL.createObjectURL(blob); dl.download = "taqdom-qr.svg"; dl.style.display = "inline-flex";
        }
      } catch (_) {
        box.innerHTML = "<p style='color:var(--pink)'>QR engine failed to load (offline?). Everything else still works.</p>";
      }
    });
  }

  /* ---------- 2 · JSON Forge ---------- */
  const jf = document.getElementById("json-go");
  if (jf) jf.addEventListener("click", () => {
    const src = document.getElementById("json-in").value;
    try {
      out("json-out", JSON.stringify(JSON.parse(src), null, 2));
      document.getElementById("json-status").innerHTML = '<span class="tag green">valid ✓</span>';
    } catch (e) {
      out("json-out", "");
      document.getElementById("json-status").innerHTML = `<span class="tag pink">invalid ✗ ${TQ.esc(e.message)}</span>`;
    }
  });
  const jm = document.getElementById("json-min");
  if (jm) jm.addEventListener("click", () => {
    try { out("json-out", JSON.stringify(JSON.parse(document.getElementById("json-in").value))); } catch (e) { TQ.toast(e.message, "err"); }
  });

  /* ---------- 3 · Hash Lab (WebCrypto) ---------- */
  const hgo = document.getElementById("hash-go");
  if (hgo) hgo.addEventListener("click", async () => {
    const algo = document.getElementById("hash-algo").value;
    const data = new TextEncoder().encode(document.getElementById("hash-in").value);
    const buf = await crypto.subtle.digest(algo, data);
    out("hash-out", Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""));
  });

  /* ---------- 4 · Base64 ---------- */
  const b64e = document.getElementById("b64-enc");
  if (b64e) {
    b64e.addEventListener("click", () => {
      try { out("b64-out", btoa(String.fromCharCode(...new TextEncoder().encode(document.getElementById("b64-in").value)))); }
      catch (e) { TQ.toast(e.message, "err"); }
    });
    document.getElementById("b64-dec").addEventListener("click", () => {
      try {
        const bin = atob(document.getElementById("b64-in").value.trim());
        out("b64-out", new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      } catch (e) { TQ.toast("Not valid Base64", "err"); }
    });
  }

  /* ---------- 5 · Key Forge (UUID + secrets) ---------- */
  const kf = document.getElementById("key-go");
  if (kf) kf.addEventListener("click", () => {
    const len = Math.min(128, Math.max(8, parseInt(document.getElementById("key-len").value) || 32));
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*-_=+";
    const rnd = crypto.getRandomValues(new Uint32Array(len));
    out("key-out", Array.from(rnd, (n) => alphabet[n % alphabet.length]).join(""));
  });
  const ug = document.getElementById("uuid-go");
  if (ug) ug.addEventListener("click", () => out("key-out", crypto.randomUUID()));

  /* ---------- 6 · Token & text meter ---------- */
  const tm = document.getElementById("meter-in");
  if (tm) tm.addEventListener("input", () => {
    const v = tm.value;
    document.getElementById("m-chars").textContent = v.length.toLocaleString();
    document.getElementById("m-words").textContent = (v.trim() ? v.trim().split(/\s+/).length : 0).toLocaleString();
    document.getElementById("m-tokens").textContent = Math.ceil(v.length / 4).toLocaleString(); // GPT-style estimate
    document.getElementById("m-bytes").textContent = new TextEncoder().encode(v).length.toLocaleString();
  });

  /* ---------- 7 · Color lab ---------- */
  const ci = document.getElementById("color-in");
  if (ci) {
    const convert = () => {
      let hex = ci.value.trim().replace(/^#/, "");
      if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split("").map((c) => c + c).join("");
      if (!/^[0-9a-f]{6}$/i.test(hex)) return;
      const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
      const mx = Math.max(r, g, b) / 255, mn = Math.min(r, g, b) / 255, l = (mx + mn) / 2;
      let h = 0, s = 0;
      if (mx !== mn) {
        const d = mx - mn;
        s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
        const rn = r / 255, gn = g / 255, bn = b / 255;
        h = mx === rn ? (gn - bn) / d + (gn < bn ? 6 : 0) : mx === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
        h *= 60;
      }
      document.getElementById("color-swatch").style.background = "#" + hex;
      out("color-out", `HEX  #${hex.toUpperCase()}\nRGB  rgb(${r}, ${g}, ${b})\nHSL  hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`);
    };
    ci.addEventListener("input", convert); convert();
  }

  /* ---------- 8 · Prompt vault (copy) ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-copy]");
    if (!b) return;
    navigator.clipboard.writeText(b.dataset.copy).then(() => TQ.toast("Copied ✓", "ok"));
  });
})();
