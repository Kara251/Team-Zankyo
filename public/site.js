(() => {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.remove("no-js");

  const stage = document.getElementById("stage");
  const markCore = document.getElementById("mark-core");
  const markTail = document.getElementById("mark-tail");
  const deck = document.getElementById("deck");
  const panel = document.getElementById("panel");
  const cards = Array.from(document.querySelectorAll(".card"));
  const cats = Array.from(document.querySelectorAll(".cat"));

  const MYGO = ["--m1", "--m2", "--m3", "--m4", "--m5", "--m6"];
  const MYGO_RGB = [
    [51, 136, 187], [119, 187, 221], [255, 136, 153],
    [119, 221, 119], [255, 187, 18], [119, 119, 170]
  ];

  /* ---------- 开场动画 ---------- */
  // 逐字拆分，颜料泼溅时给字染色
  const letters = [];
  if (markCore) {
    const text = markCore.textContent;
    markCore.textContent = "";
    for (const ch of text) {
      const span = document.createElement("span");
      span.className = "lt";
      span.textContent = ch;
      markCore.appendChild(span);
      letters.push(span);
    }
  }

  // 量出 " of Longing" 的真实像素宽，揭示时用精确值，绝不截断
  let tailWidth = 0;
  function measureTail() {
    if (!markTail) return;
    const prev = markTail.style.maxWidth;
    markTail.style.transition = "none";
    markTail.style.maxWidth = "none";
    tailWidth = Math.ceil(markTail.getBoundingClientRect().width) + 2;
    markTail.style.maxWidth = prev || "0px";
    void markTail.offsetWidth;
    markTail.style.transition = "";
  }

  // 给部分字母染上 MyGO 颜料色（补全时化开回白）
  function paintLetters() {
    for (const lt of letters) {
      if (Math.random() < 0.62) {
        lt.style.color = `var(${MYGO[(Math.random() * MYGO.length) | 0]})`;
        lt.style.transform =
          `translateY(${(Math.random() - 0.5) * 8}px) rotate(${(Math.random() - 0.5) * 4}deg)`;
      }
    }
  }
  function washLetters() {
    for (const lt of letters) { lt.style.color = ""; lt.style.transform = ""; }
  }

  /* ---------- 颜料泼溅（canvas 绘制有机泼溅） ---------- */
  const splash = document.getElementById("splash");
  const spctx = splash.getContext("2d");
  const sp = { dpr: 1, w: 0, h: 0, splats: [], raf: 0, start: 0 };
  const BURST_MS = 1500; // 爆发
  const WASH_MS = 900;   // 化开淡出

  function sizeSplash() {
    sp.dpr = Math.min(window.devicePixelRatio || 1, 2);
    sp.w = Math.max(1, window.innerWidth);
    sp.h = Math.max(1, window.innerHeight);
    splash.width = Math.floor(sp.w * sp.dpr);
    splash.height = Math.floor(sp.h * sp.dpr);
    splash.style.width = `${sp.w}px`;
    splash.style.height = `${sp.h}px`;
  }

  function buildSplats() {
    const cx = sp.w * 0.5, cy = sp.h * 0.42;
    const reach = Math.min(sp.w, sp.h);
    const n = sp.w < 760 ? 20 : 34;
    const base = sp.w < 760 ? 11 : 17;
    const list = [];
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), 0.62) * reach * 0.52;
      const r = base * (0.5 + Math.random() * 1.7);
      const lobes = 7 + ((Math.random() * 6) | 0);
      list.push({
        x: cx + Math.cos(ang) * dist * 1.5,
        y: cy + Math.sin(ang) * dist * 0.82,
        r,
        color: MYGO_RGB[(Math.random() * MYGO_RGB.length) | 0],
        rot: Math.random() * Math.PI,
        birth: Math.random() * 0.72,
        radii: Array.from({ length: lobes }, () => 0.5 + Math.random() * 0.75),
        drops: Array.from({ length: 3 + ((Math.random() * 6) | 0) }, () => ({
          dx: (Math.random() - 0.5) * r * 4.2,
          dy: (Math.random() - 0.5) * r * 4.2,
          dr: r * (0.07 + Math.random() * 0.24)
        })),
        drips: Math.random() < 0.5
          ? Array.from({ length: 1 + ((Math.random() * 2) | 0) }, () => ({
              dx: (Math.random() - 0.5) * r * 0.7,
              len: r * (1.1 + Math.random() * 2.6),
              w: r * (0.1 + Math.random() * 0.18)
            }))
          : []
      });
    }
    sp.splats = list;
  }

  function backOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const s = 2.4;
    const u = t - 1;
    return 1 + u * u * ((s + 1) * u + s);
  }

  function drawSplat(s, grow, alpha) {
    spctx.save();
    spctx.globalAlpha = alpha * 0.92;
    spctx.translate(s.x, s.y);
    spctx.rotate(s.rot);
    spctx.scale(grow, grow);
    spctx.fillStyle = `rgb(${s.color[0]}, ${s.color[1]}, ${s.color[2]})`;

    // 主体：贝塞尔平滑的有机团块
    const L = s.radii.length;
    const pts = [];
    for (let i = 0; i < L; i++) {
      const a = (i / L) * Math.PI * 2;
      const rr = s.r * s.radii[i];
      pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
    }
    spctx.beginPath();
    spctx.moveTo((pts[L - 1][0] + pts[0][0]) / 2, (pts[L - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < L; i++) {
      const cur = pts[i], nxt = pts[(i + 1) % L];
      spctx.quadraticCurveTo(cur[0], cur[1], (cur[0] + nxt[0]) / 2, (cur[1] + nxt[1]) / 2);
    }
    spctx.closePath();
    spctx.fill();

    for (const d of s.drops) {
      spctx.beginPath();
      spctx.arc(d.dx, d.dy, d.dr, 0, Math.PI * 2);
      spctx.fill();
    }
    for (const dp of s.drips) {
      spctx.beginPath();
      spctx.ellipse(dp.dx, dp.len * 0.5, dp.w, dp.len * 0.5, 0, 0, Math.PI * 2);
      spctx.fill();
    }
    spctx.restore();
  }

  function renderSplash(prog, alpha) {
    spctx.setTransform(sp.dpr, 0, 0, sp.dpr, 0, 0);
    spctx.clearRect(0, 0, sp.w, sp.h);
    for (const s of sp.splats) {
      const lp = (prog - s.birth) / 0.26;
      if (lp <= 0) continue;
      drawSplat(s, backOut(Math.min(lp, 1)), alpha * Math.min(lp, 1));
    }
  }

  function clearSplash() {
    spctx.setTransform(sp.dpr, 0, 0, sp.dpr, 0, 0);
    spctx.clearRect(0, 0, sp.w, sp.h);
    splash.style.opacity = "0";
  }

  function runSplash() {
    sizeSplash();
    buildSplats();
    splash.style.opacity = "1";
    sp.start = performance.now();
    const step = (now) => {
      const t = now - sp.start;
      if (t <= BURST_MS) {
        renderSplash(t / BURST_MS, 1);
        sp.raf = window.requestAnimationFrame(step);
      } else if (t <= BURST_MS + WASH_MS) {
        const wash = 1 - (t - BURST_MS) / WASH_MS;
        renderSplash(1, wash);
        splash.style.opacity = String(wash);
        sp.raf = window.requestAnimationFrame(step);
      } else {
        clearSplash();
      }
    };
    sp.raf = window.requestAnimationFrame(step);
  }

  function revealTail() {
    if (markTail) markTail.style.maxWidth = tailWidth ? `${tailWidth}px` : "12em";
  }

  function lit() { document.body.classList.add("is-lit"); }

  function runIntro() {
    measureTail();

    if (reducedMotion || !stage) {
      if (stage) stage.dataset.phase = "ready";
      revealTail();
      lit();
      return;
    }

    const at = { glitch: 850, complete: 2350, settle: 3650, ready: 4900 };

    window.setTimeout(() => {
      stage.dataset.phase = "glitch";
      paintLetters();
      runSplash();
    }, at.glitch);

    window.setTimeout(() => {
      washLetters();
      stage.dataset.phase = "complete";
      revealTail();
    }, at.complete);

    window.setTimeout(() => {
      stage.dataset.phase = "settle";
      lit();
    }, at.settle);

    window.setTimeout(() => {
      stage.dataset.phase = "ready";
    }, at.ready);
  }

  /* ---------- 卡片选择 ---------- */
  let current = null;

  function select(cat, card) {
    if (current === cat) return;
    current = cat;

    for (const c of cards) {
      c.setAttribute("aria-pressed", c === card ? "true" : "false");
    }

    const host = cats.find((el) => el.dataset.cat === cat);
    for (const el of cats) el.hidden = el.dataset.cat !== cat;

    if (host) {
      panel.classList.add("is-open");
      stage.classList.add("has-selection");
      revealRows(host);
    } else {
      // 该分部尚无内容：只高亮卡片，不展开空面板
      panel.classList.remove("is-open");
      stage.classList.remove("has-selection");
    }
  }

  let dragMoved = false;

  for (const card of cards) {
    card.addEventListener("click", (e) => {
      if (e.detail === 0) { select(card.dataset.cat, card); return; } // 键盘激活
      if (dragMoved) return;
      select(card.dataset.cat, card);
    });
  }

  /* ---------- 卡组拖拽（仅鼠标/触控笔；触屏交给原生横滑） ---------- */
  let isDown = false;
  let startX = 0;
  let startScroll = 0;

  deck.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "touch") return;
    isDown = true;
    dragMoved = false;
    startX = e.clientX;
    startScroll = deck.scrollLeft;
  });

  deck.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) {
      dragMoved = true;
      deck.classList.add("is-grabbing");
    }
    if (dragMoved) deck.scrollLeft = startScroll - dx;
  });

  function endDrag() {
    isDown = false;
    deck.classList.remove("is-grabbing");
  }

  deck.addEventListener("pointerup", endDrag);
  deck.addEventListener("pointercancel", endDrag);
  deck.addEventListener("pointerleave", endDrag);

  /* ---------- 成员行渐显 ---------- */
  let rowObserver = null;
  if ("IntersectionObserver" in window) {
    rowObserver = new IntersectionObserver((entries) => {
      let batch = 0;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.style.setProperty("--reveal-delay", `${batch * 110}ms`);
          entry.target.classList.add("is-visible");
          rowObserver.unobserve(entry.target);
          batch += 1;
        }
      }
    }, { threshold: 0.25 });
  }

  function revealRows(host) {
    const rows = Array.from(host.querySelectorAll(".member-row"));
    if (rowObserver) rows.forEach((row) => rowObserver.observe(row));
    else rows.forEach((row) => row.classList.add("is-visible"));
  }

  /* ---------- 环境粒子场 ---------- */
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });
  const fieldColors = [
    [238, 240, 255],
    [185, 188, 224],
    [139, 143, 199],
    [244, 236, 200]
  ];
  const field = { width: 0, height: 0, dpr: 1, particles: [], raf: 0, visible: true };

  function resize() {
    field.dpr = Math.min(window.devicePixelRatio || 1, 2);
    field.width = Math.max(1, window.innerWidth);
    field.height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(field.width * field.dpr);
    canvas.height = Math.floor(field.height * field.dpr);
    canvas.style.width = `${field.width}px`;
    canvas.style.height = `${field.height}px`;
    ctx.setTransform(field.dpr, 0, 0, field.dpr, 0, 0);
    seed();
    drawField(0);
  }

  function seed() {
    const count = field.width < 760 ? 30 : 52;
    field.particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random() * field.width,
      y: Math.random() * field.height,
      r: 0.6 + Math.random() * 1.7,
      a: 0.08 + Math.random() * 0.26,
      vx: (Math.random() - 0.5) * 0.1,
      vy: -0.03 - Math.random() * 0.07,
      phase: Math.random() * Math.PI * 2,
      color: fieldColors[i % fieldColors.length]
    }));
  }

  function drawField(time) {
    ctx.clearRect(0, 0, field.width, field.height);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (const p of field.particles) {
      if (!reducedMotion) {
        p.x += p.vx + Math.sin(time * 0.00035 + p.phase) * 0.022;
        p.y += p.vy;
        if (p.y < -12) p.y = field.height + 12;
        if (p.x < -12) p.x = field.width + 12;
        if (p.x > field.width + 12) p.x = -12;
      }
      const shimmer = reducedMotion ? 0.7 : 0.6 + Math.sin(time * 0.0012 + p.phase) * 0.26;
      const [r, g, b] = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.02, p.a * shimmer)})`;
      ctx.fill();
    }
    ctx.restore();
  }

  function tick(time) {
    if (!field.visible) return;
    drawField(time);
    field.raf = window.requestAnimationFrame(tick);
  }

  function startField() {
    window.cancelAnimationFrame(field.raf);
    field.visible = true;
    if (!reducedMotion) field.raf = window.requestAnimationFrame(tick);
    else drawField(0);
  }

  function stopField() {
    field.visible = false;
    window.cancelAnimationFrame(field.raf);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopField();
    else startField();
  });

  window.addEventListener("resize", resize, { passive: true });

  /* ---------- 启动 ---------- */
  resize();
  startField();
  runIntro();
})();
