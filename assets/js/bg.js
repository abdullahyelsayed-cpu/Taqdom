/* ==========================================================================
   TAQDOM.AI — Living Background Engine
   A drifting swarm of agents: particle mesh, robot glyphs, courier drones
   and data packets travelling the links. Pure canvas, zero dependencies.
   ========================================================================== */
(function () {
  "use strict";

  const canvas = document.getElementById("bg-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");

  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const PALETTE = {
    node: "116, 247, 178",   // mint
    link: "116, 247, 178",
    drone: "110, 231, 255",  // cyan
    bot: "167, 139, 250",    // violet
    packet: "255, 209, 102"  // amber
  };

  let W = 0, H = 0, DPR = 1;
  let nodes = [], bots = [], drones = [], packets = [];
  let running = !REDUCED;
  let rafId = null;
  let mouse = { x: -9999, y: -9999 };

  const LINK_DIST = 150;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    seed();
  }

  function seed() {
    const area = W * H;
    const nodeCount = Math.max(36, Math.min(110, Math.round(area / 16000)));
    const botCount = Math.max(4, Math.min(12, Math.round(area / 160000)));
    const droneCount = Math.max(3, Math.min(8, Math.round(area / 260000)));

    nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      r: 1.2 + Math.random() * 1.8
    }));

    // Robot glyphs — rounded-square head, antenna, glowing visor
    bots = Array.from({ length: botCount }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      size: 9 + Math.random() * 8,
      phase: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.004,
      rot: 0
    }));

    // Courier drones — orbit an invisible hub, trailing light
    drones = Array.from({ length: droneCount }, (_, i) => ({
      cx: Math.random() * W,
      cy: Math.random() * H,
      radius: 60 + Math.random() * 130,
      angle: Math.random() * Math.PI * 2,
      speed: (0.004 + Math.random() * 0.006) * (i % 2 ? 1 : -1),
      trail: []
    }));

    packets = [];
  }

  function step() {
    // nodes drift + wrap
    for (const n of nodes) {
      n.x += n.vx; n.y += n.vy;
      if (n.x < -20) n.x = W + 20; else if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20; else if (n.y > H + 20) n.y = -20;
      // gentle mouse repulsion
      const dx = n.x - mouse.x, dy = n.y - mouse.y;
      const d2 = dx * dx + dy * dy;
      if (d2 < 12000) { n.x += dx * 0.012; n.y += dy * 0.012; }
    }
    for (const b of bots) {
      b.x += b.vx; b.y += b.vy; b.phase += 0.03; b.rot += b.spin;
      if (b.x < -40) b.x = W + 40; else if (b.x > W + 40) b.x = -40;
      if (b.y < -40) b.y = H + 40; else if (b.y > H + 40) b.y = -40;
    }
    for (const d of drones) {
      d.angle += d.speed;
      d.cx += Math.sin(d.angle * 0.3) * 0.15;
      d.cy += Math.cos(d.angle * 0.22) * 0.15;
      const x = d.cx + Math.cos(d.angle) * d.radius;
      const y = d.cy + Math.sin(d.angle) * d.radius * 0.62;
      d.trail.push({ x, y });
      if (d.trail.length > 26) d.trail.shift();
    }
    // spawn packets along random links
    if (Math.random() < 0.06 && packets.length < 14 && nodes.length > 1) {
      const a = nodes[(Math.random() * nodes.length) | 0];
      let best = null, bd = LINK_DIST;
      for (const n of nodes) {
        if (n === a) continue;
        const d = Math.hypot(n.x - a.x, n.y - a.y);
        if (d < bd) { bd = d; best = n; }
      }
      if (best) packets.push({ a, b: best, t: 0, speed: 0.012 + Math.random() * 0.02 });
    }
    for (const p of packets) p.t += p.speed;
    packets = packets.filter(p => p.t <= 1);
  }

  function drawBot(b) {
    ctx.save();
    ctx.translate(b.x, b.y + Math.sin(b.phase) * 3);
    ctx.rotate(b.rot);
    const s = b.size;
    ctx.strokeStyle = `rgba(${PALETTE.bot}, 0.75)`;
    ctx.fillStyle = `rgba(${PALETTE.bot}, 0.10)`;
    ctx.lineWidth = 1.2;
    // head
    ctx.beginPath();
    ctx.roundRect(-s, -s * 0.8, s * 2, s * 1.6, s * 0.35);
    ctx.fill(); ctx.stroke();
    // antenna
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.8);
    ctx.lineTo(0, -s * 1.35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -s * 1.5, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${PALETTE.bot}, 0.9)`;
    ctx.fill();
    // visor
    const blink = 0.55 + Math.sin(b.phase * 2) * 0.35;
    ctx.fillStyle = `rgba(${PALETTE.node}, ${blink})`;
    ctx.beginPath();
    ctx.roundRect(-s * 0.55, -s * 0.28, s * 1.1, s * 0.5, s * 0.22);
    ctx.fill();
    ctx.restore();
  }

  function render() {
    ctx.clearRect(0, 0, W, H);

    // links
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          const alpha = (1 - d / LINK_DIST) * 0.16;
          ctx.strokeStyle = `rgba(${PALETTE.link}, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // nodes
    for (const n of nodes) {
      ctx.fillStyle = `rgba(${PALETTE.node}, 0.55)`;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // drone trails + drones
    for (const d of drones) {
      for (let i = 1; i < d.trail.length; i++) {
        const p0 = d.trail[i - 1], p1 = d.trail[i];
        ctx.strokeStyle = `rgba(${PALETTE.drone}, ${(i / d.trail.length) * 0.35})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p1.x, p1.y);
        ctx.stroke();
      }
      const head = d.trail[d.trail.length - 1];
      if (head) {
        ctx.fillStyle = `rgba(${PALETTE.drone}, 0.95)`;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = `rgba(${PALETTE.drone}, 0.18)`;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // packets
    for (const p of packets) {
      const x = p.a.x + (p.b.x - p.a.x) * p.t;
      const y = p.a.y + (p.b.y - p.a.y) * p.t;
      ctx.fillStyle = `rgba(${PALETTE.packet}, 0.95)`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(${PALETTE.packet}, 0.25)`;
      ctx.beginPath();
      ctx.arc(x, y, 5.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // robots on top
    for (const b of bots) drawBot(b);
  }

  function loop() {
    if (!running) return;
    step();
    render();
    rafId = requestAnimationFrame(loop);
  }

  function setRunning(on) {
    running = on;
    if (on) { if (!rafId) loop(); }
    else if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    const btn = document.getElementById("bg-toggle");
    if (btn) btn.setAttribute("aria-pressed", String(on));
  }

  // controls
  window.addEventListener("resize", resize);
  window.addEventListener("pointermove", e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (REDUCED) return;
    setRunning(!document.hidden && (document.getElementById("bg-toggle")?.getAttribute("aria-pressed") !== "false"));
  });

  const toggle = document.getElementById("bg-toggle");
  if (toggle) {
    toggle.setAttribute("aria-pressed", String(!REDUCED));
    toggle.addEventListener("click", () => setRunning(!running));
  }

  resize();
  if (REDUCED) { step(); render(); }   // single static frame
  else loop();
})();
