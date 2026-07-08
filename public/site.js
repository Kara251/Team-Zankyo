(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canvas = document.getElementById("field");
  const ctx = canvas.getContext("2d", { alpha: true });
  const state = {
    width: 0,
    height: 0,
    dpr: 1,
    particles: [],
    raf: 0,
    visible: true
  };

  const colors = [
    [238, 240, 255],
    [185, 188, 224],
    [139, 143, 199],
    [244, 236, 200]
  ];

  function resize() {
    state.dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.width = Math.max(1, window.innerWidth);
    state.height = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(state.width * state.dpr);
    canvas.height = Math.floor(state.height * state.dpr);
    canvas.style.width = `${state.width}px`;
    canvas.style.height = `${state.height}px`;
    ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
    seedParticles();
    draw(0);
  }

  function seedParticles() {
    const count = state.width < 760 ? 34 : 58;
    state.particles = Array.from({ length: count }, (_, index) => {
      const color = colors[index % colors.length];

      return {
        x: Math.random() * state.width,
        y: Math.random() * state.height,
        r: 0.6 + Math.random() * 1.8,
        a: 0.1 + Math.random() * 0.28,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -0.03 - Math.random() * 0.08,
        phase: Math.random() * Math.PI * 2,
        color
      };
    });
  }

  function paintRings(time) {
    const cx = state.width * 0.5;
    const cy = state.height * 0.48;
    const base = Math.min(state.width, state.height);
    const pulse = Math.sin(time * 0.00045) * 0.5 + 0.5;

    ctx.save();
    ctx.lineWidth = 1;
    ctx.globalCompositeOperation = "lighter";

    for (let i = 0; i < 4; i += 1) {
      const radius = base * (0.23 + i * 0.12) + pulse * 8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, radius * (1.06 + i * 0.03), radius * (0.66 + i * 0.02), time * 0.00008 + i * 0.42, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(185, 188, 224, ${0.035 - i * 0.004})`;
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.ellipse(cx, cy, base * 0.28, base * 0.18, -0.4, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(244, 236, 200, 0.08)";
    ctx.stroke();
    ctx.restore();
  }

  function paintParticles(time) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const particle of state.particles) {
      if (!reducedMotion) {
        particle.x += particle.vx + Math.sin(time * 0.00035 + particle.phase) * 0.025;
        particle.y += particle.vy;

        if (particle.y < -12) particle.y = state.height + 12;
        if (particle.x < -12) particle.x = state.width + 12;
        if (particle.x > state.width + 12) particle.x = -12;
      }

      const shimmer = reducedMotion ? 0.7 : 0.62 + Math.sin(time * 0.0012 + particle.phase) * 0.26;
      const [r, g, b] = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(0.02, particle.a * shimmer)})`;
      ctx.fill();
    }

    ctx.restore();
  }

  function draw(time) {
    ctx.clearRect(0, 0, state.width, state.height);
    paintRings(time);
    paintParticles(time);
  }

  function tick(time) {
    if (!state.visible) return;
    draw(time);
    state.raf = window.requestAnimationFrame(tick);
  }

  function start() {
    window.cancelAnimationFrame(state.raf);
    state.visible = true;

    if (!reducedMotion) {
      state.raf = window.requestAnimationFrame(tick);
    } else {
      draw(0);
    }
  }

  function stop() {
    state.visible = false;
    window.cancelAnimationFrame(state.raf);
  }

  const rows = Array.from(document.querySelectorAll(".member-row"));

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.28 });

    rows.forEach((row) => observer.observe(row));
  } else {
    rows.forEach((row) => row.classList.add("is-visible"));
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stop();
    } else {
      start();
    }
  });

  window.addEventListener("resize", resize, { passive: true });
  resize();
  start();
})();
