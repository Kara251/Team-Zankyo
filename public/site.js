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

  /* ---------- 开场动画 ---------- */
  // 逐字拆分，供信号干扰随机泼色
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
    // 强制回流后恢复过渡
    void markTail.offsetWidth;
    markTail.style.transition = "";
  }

  let splashTimer = 0;
  function splashOnce() {
    for (const lt of letters) {
      if (Math.random() < 0.5) {
        lt.style.color = `var(${MYGO[(Math.random() * MYGO.length) | 0]})`;
        lt.style.transform = `translateY(${(Math.random() - 0.5) * 7}px)`;
      } else {
        lt.style.color = "";
        lt.style.transform = "";
      }
    }
  }
  function clearSplash() {
    window.clearInterval(splashTimer);
    for (const lt of letters) {
      lt.style.color = "";
      lt.style.transform = "";
    }
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

    // 时间线经过铺排：每段过渡结束后再进下一段，保证连贯丝滑
    const at = {
      glitch: 850,     // 淡入结束 → 干扰
      complete: 2350,  // 干扰约 1.5s → 缩小一档并补全文本
      settle: 3650,    // 补全过渡结束后 → 缩小上移落位
      ready: 4900
    };

    window.setTimeout(() => {
      stage.dataset.phase = "glitch";
      splashTimer = window.setInterval(splashOnce, 80);
    }, at.glitch);

    window.setTimeout(() => {
      clearSplash();
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
