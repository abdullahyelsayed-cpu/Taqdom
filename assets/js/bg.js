/* ============================================================
   Taqdom · Living background
   Hybrid generative canvas: drifting luminous weave + agent
   network constellation. Light-theme, orange/pink spectrum.
   Pause toggle persisted in localStorage.
   ============================================================ */
(function () {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const toggle = document.getElementById("bg-toggle");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let W = 0, H = 0, dpr = 1, raf = null, t = 0;
  let running = localStorage.getItem("taqdom-bg") !== "off" && !reduceMotion;

  const PALETTE = [
    [255, 77, 0],    // vivid orange
    [255, 46, 136],  // glowing pink
    [255, 184, 0],   // amber
    [0, 184, 217],   // cyan
    [124, 77, 255]   // violet
  ];

  /* ---- weave stripes ---- */
  let stripes = [];
  function buildStripes() {
    stripes = [];
    let x = -40;
    while (x < W + 80) {
      const w = 46 + Math.random() * 110;
      const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      stripes.push({ x, w, c, a: 0.028 + Math.random() * 0.035, sp: 0.06 + Math.random() * 0.14, ph: Math.random() * Math.PI * 2 });
      x += w + 30 + Math.random() * 90;
    }
  }

  /* ---- network nodes (agents) ---- */
  let nodes = [];
  function buildNodes() {
    const n = Math.min(64, Math.floor((W * H) / 26000));
    nodes = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
      r: 1.6 + Math.random() * 2.4,
      c: PALETTE[Math.floor(Math.random() * PALETTE.length)]
    }));
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.width = Math.floor(innerWidth * dpr);
    H = canvas.height = Math.floor(innerHeight * dpr);
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
    buildStripes(); buildNodes();
    if (!running) draw(); // paint one static frame
  }

  function draw() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);

    /* weave */
    for (const s of stripes) {
      const sway = Math.sin(t * 0.35 + s.ph) * 14 * dpr;
      const g = ctx.createLinearGradient(s.x + sway, 0, s.x + s.w + sway, 0);
      g.addColorStop(0, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},0)`);
      g.addColorStop(0.5, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},${s.a})`);
      g.addColorStop(1, `rgba(${s.c[0]},${s.c[1]},${s.c[2]},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(s.x + sway, 0, s.w, H);
      s.x += s.sp * dpr * 0.4;
      if (s.x > W + 120) s.x = -s.w - 120;
    }

    /* links */
    const R = 130 * dpr;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy);
        if (d < R) {
          const alpha = (1 - d / R) * 0.16;
          ctx.strokeStyle = `rgba(${a.c[0]},${a.c[1]},${a.c[2]},${alpha})`;
          ctx.lineWidth = dpr;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    /* nodes */
    for (const n of nodes) {
      n.x += n.vx * dpr; n.y += n.vy * dpr;
      if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      ctx.beginPath();
      ctx.fillStyle = `rgba(${n.c[0]},${n.c[1]},${n.c[2]},.55)`;
      ctx.arc(n.x, n.y, n.r * dpr, 0, Math.PI * 2); ctx.fill();
    }
  }

  function loop() { draw(); raf = running ? requestAnimationFrame(loop) : null; }
  function start() { if (!raf) { running = true; loop(); } }
  function stop() { running = false; if (raf) cancelAnimationFrame(raf); raf = null; }

  if (toggle) {
    toggle.setAttribute("aria-pressed", String(running));
    toggle.addEventListener("click", () => {
      if (running) { stop(); localStorage.setItem("taqdom-bg", "off"); }
      else { start(); localStorage.setItem("taqdom-bg", "on"); }
      toggle.setAttribute("aria-pressed", String(running));
    });
  }

  addEventListener("resize", resize, { passive: true });
  resize();
  if (running) loop();
})();
