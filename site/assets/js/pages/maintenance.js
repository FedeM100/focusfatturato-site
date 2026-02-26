(() => {
  const canvas = document.getElementById('maintenanceCanvas');
  const host = document.getElementById('maintenance-hero');
  if (!canvas || !host) return;

  const ctx = canvas.getContext('2d', { alpha: true });
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pointer = { x: 0, y: 0, active: false };

  const SETTINGS = {
    seed: 160,
    PER_RING: 42,
    INNER_RINGS: 14,
    OUTER_RINGS: 50,
    ringJitter: 0.24,
    particleSize: 1.9,
    minAlpha: 0.12,
    maxAlpha: 0.90,
    color: [10, 20, 120],
    baseRadiusRatio: 0.48,
    innerSpanRatio: 0.16,
    outerSpanRatio: 0.70,
    periodMs: 6200,
    breathPeriodMs: 5200,
    breathAmpRatio: 0.065,
    centerYRatio: 0.42,
    alphaTopBoost: 0.80,
    repelRadius: 220,
    repelStrength: 60
  };

  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const clamp01 = (x)=> Math.max(0, Math.min(1, x));

  let rand = mulberry32(SETTINGS.seed);
  let points = [];
  let w = 0, h = 0, dpr = 1;

  function updatePointer(clientX, clientY){
    const rect = host.getBoundingClientRect();
    pointer.x = clientX - rect.left;
    pointer.y = clientY - rect.top;
    pointer.active = true;
  }

  host.addEventListener('pointermove', (e)=> updatePointer(e.clientX, e.clientY), { passive: true });
  host.addEventListener('pointerdown', (e)=> updatePointer(e.clientX, e.clientY), { passive: true });
  host.addEventListener('pointerleave', ()=> { pointer.active = false; });
  host.addEventListener('pointercancel', ()=> { pointer.active = false; });
  host.addEventListener('pointerup', ()=> { pointer.active = false; });

  function buildPoints(){
    rand = mulberry32(SETTINGS.seed);
    points = [];

    const maxDim = Math.max(w, h);
    const baseR = maxDim * SETTINGS.baseRadiusRatio;
    const innerSpan = maxDim * SETTINGS.innerSpanRatio;
    const outerSpan = maxDim * SETTINGS.outerSpanRatio;

    const innerR = Math.max(0, baseR - innerSpan);
    const outerR = baseR + outerSpan;

    const totalRings = SETTINGS.INNER_RINGS + SETTINGS.OUTER_RINGS;
    const step = (totalRings > 1) ? ((outerR - innerR) / (totalRings - 1)) : 0;

    for (let ringIdx = 0; ringIdx < totalRings; ringIdx++){
      const ringR = innerR + ringIdx * step;
      const phaseOff = rand() * Math.PI * 2;

      for (let k = 0; k < SETTINGS.PER_RING; k++){
        const baseAng = (k / SETTINGS.PER_RING) * Math.PI * 2;
        const angJ = (rand() * 2 - 1) * (Math.PI * 2 / SETTINGS.PER_RING) * 0.20;
        const ang = baseAng + phaseOff + angJ;

        const rJ = (rand() * 2 - 1) * step * SETTINGS.ringJitter;
        const a0 = SETTINGS.minAlpha + (SETTINGS.maxAlpha - SETTINGS.minAlpha) * rand();
        const phase = rand() * Math.PI * 2;

        points.push({ c: Math.cos(ang), s: Math.sin(ang), r: ringR + rJ, a0, phase });
      }
    }
  }

  function resize(){
    const rect = host.getBoundingClientRect();

    dpr = Math.max(1, Math.min(1.35, window.devicePixelRatio || 1));
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildPoints();
  }

  const ro = new ResizeObserver(resize);
  ro.observe(host);
  window.addEventListener('resize', resize, { passive: true });

  let start = performance.now();

  function draw(now){
    if (!w || !h) resize();
    if (document.hidden){ start = now; requestAnimationFrame(draw); return; }

    const tR = (now - start) / SETTINGS.periodMs;
    const tickR = tR % 1;

    const tB = (now - start) / SETTINGS.breathPeriodMs;
    const tickB = tB % 1;
    const sB = (Math.sin(tickB * Math.PI * 2 - Math.PI / 2) + 1) / 2;

    const centerX = w * 0.5;
    const centerY = h * SETTINGS.centerYRatio;
    const maxDim = Math.max(w, h);
    const breath = (sB - 0.5) * (maxDim * SETTINGS.breathAmpRatio);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = `rgb(${SETTINGS.color[0]},${SETTINGS.color[1]},${SETTINGS.color[2]})`;

    for (let i = 0; i < points.length; i++){
      const p = points[i];
      const rr = p.r + breath;

      const ripple = 0.5 + 0.5 * Math.sin((tickR * Math.PI * 2) + p.phase);
      const yPos = centerY + p.s * rr;
      const yRatio = clamp01(1 - (yPos / Math.max(1, h)));
      let alpha = clamp01(p.a0 * (0.55 + 0.65 * ripple) * (1 + yRatio * SETTINGS.alphaTopBoost));
      let x = centerX + p.c * rr;
      let y = yPos;
      const sz = SETTINGS.particleSize * (0.90 + 0.25 * ripple);

      if (pointer.active && !reduce){
        const dx = x - pointer.x;
        const dy = y - pointer.y;
        const dist = Math.hypot(dx, dy) || 1;
        if (dist < SETTINGS.repelRadius){
          const t = 1 - dist / SETTINGS.repelRadius;
          const push = SETTINGS.repelStrength * t;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
          alpha *= 0.85 + 0.15 * t;
        }
      }

      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(x, y, sz, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    if (!reduce) requestAnimationFrame(draw);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) start = performance.now();
  });

  resize();
  if (reduce) draw(performance.now());
  else requestAnimationFrame(draw);
})();
