(() => {
      const canvas = document.getElementById('ringCanvas');
      const host = document.getElementById('welcome');
      if(!canvas || !host) return;
      const ctx = canvas.getContext('2d', { alpha: true });

      const SETTINGS = {
        seed: 200,
        PER_RING: 46,
        INNER_RINGS: 20,
        OUTER_RINGS: 70,
        ringJitter: 0.22,
        particleSize: 2.0,
        minAlpha: 0.10,
        maxAlpha: 1.00,
        color: [10, 20, 120],
        baseRadiusRatio: 0.42,
        innerSpanRatio: 0.18,
        outerSpanRatio: 0.75,
        periodMs: 6000,
        breathPeriodMs: 5400,
        breathAmpRatio: 0.070
      };

      function mulberry32(a){
        return function(){
          let t = a += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
      }

      let rand = mulberry32(SETTINGS.seed);
      let points = [];
      let w = 0, h = 0, dpr = 1;

      function buildPoints(){
        rand = mulberry32(SETTINGS.seed);
        points = [];
        const isMobile = w <= 780;
        const perRing = isMobile ? 24 : SETTINGS.PER_RING;
        const innerRings = isMobile ? 8 : SETTINGS.INNER_RINGS;
        const outerRings = isMobile ? 28 : SETTINGS.OUTER_RINGS;

        const maxDim = Math.max(w, h);
        const baseR = maxDim * SETTINGS.baseRadiusRatio;
        const innerSpan = maxDim * SETTINGS.innerSpanRatio;
        const outerSpan = maxDim * SETTINGS.outerSpanRatio;

        const innerR = Math.max(0, baseR - innerSpan);
        const outerR = baseR + outerSpan;

        const totalRings = innerRings + outerRings;
        const step = (totalRings > 1) ? ((outerR - innerR) / (totalRings - 1)) : 0;

        for (let ringIdx = 0; ringIdx < totalRings; ringIdx++){
          const ringR = innerR + ringIdx * step;
          const phaseOff = rand() * Math.PI * 2;

          for (let k = 0; k < perRing; k++){
            const baseAng = (k / perRing) * Math.PI * 2;
            const angJ = (rand() * 2 - 1) * (Math.PI * 2 / perRing) * 0.20;
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
      let paused = false;
      let raf = null;

      function schedule(){
        if(raf || paused || document.hidden) return;
        raf = requestAnimationFrame(draw);
      }

      function draw(now){
        if (!w || !h) resize();
        raf = null;
        if (paused || document.hidden){ start = now; return; }
        const isMobile = w <= 780;

        const tR = (now - start) / SETTINGS.periodMs;
        const tickR = tR % 1;

        const tB = (now - start) / SETTINGS.breathPeriodMs;
        const tickB = tB % 1;
        const sB = (Math.sin(tickB * Math.PI * 2 - Math.PI / 2) + 1) / 2;

        const centerX = w * 0.5, centerY = h * 0.5;
        const maxDim = Math.max(w, h);
        const breath = (sB - 0.5) * (maxDim * SETTINGS.breathAmpRatio);

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = `rgb(${SETTINGS.color[0]},${SETTINGS.color[1]},${SETTINGS.color[2]})`;

        const safeR = Math.min(w, h) * 0.24;
        const fadeR = Math.min(w, h) * 0.36;

        for (let i = 0; i < points.length; i++){
          const p = points[i];
          const rr = p.r + breath;

          const ripple = 0.5 + 0.5 * Math.sin((tickR * Math.PI * 2) + p.phase);
          let alpha = Math.min(1, Math.max(0, p.a0 * (0.55 + 0.65 * ripple)));

          const x = centerX + p.c * rr;
          const y = centerY + p.s * rr;
          const sz = SETTINGS.particleSize * (0.90 + 0.25 * ripple);

          // fade near text area
          const dx0 = x - centerX;
          const dy0 = y - centerY;
          const dist0 = Math.hypot(dx0, dy0);
          if (dist0 <= safeR){
            alpha *= 0.18;
          } else if (dist0 < safeR + fadeR){
            const t = (dist0 - safeR) / fadeR;
            alpha *= (0.18 + t * 0.82);
          }

          if (isMobile){
            const edgeDist = Math.abs(x - centerX) / Math.max(1, w * 0.5);
            if (edgeDist < 0.34){
              alpha *= 0.02;
            } else if (edgeDist < 0.62){
              const t = (edgeDist - 0.34) / (0.62 - 0.34);
              alpha *= (0.02 + t * 0.98);
            }

            const yN = y / Math.max(1, h);
            if (yN < 0.18){
              alpha *= (yN / 0.18);
            } else if (yN > 0.84){
              alpha *= ((1 - yN) / 0.16);
            }
          }

          // mouse repulsion
          let xDraw = x, yDraw = y;
          if (mouse.active){
            const dx = x - mouse.x;
            const dy = y - mouse.y;
            const d = Math.hypot(dx, dy) || 1;
            const pushR = mouse.radius;
            if (d < pushR){
              const k = (1 - d / pushR);
              const push = k * mouse.strength;
              xDraw += (dx / d) * push;
              yDraw += (dy / d) * push;
            }
          }

          ctx.globalAlpha = alpha;
          ctx.beginPath();
          ctx.arc(xDraw, yDraw, sz, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.globalAlpha = 1;
        schedule();
      }

      document.addEventListener('visibilitychange', () => {
        if (!document.hidden){
          start = performance.now();
          schedule();
        }
      });

      if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
          const e = entries && entries[0];
          const isIn = !!(e && e.isIntersecting);
          paused = !isIn;
          if(isIn){
            start = performance.now();
            schedule();
          }
        }, { threshold: 0.01, rootMargin: '200px 0px 200px 0px' });
        io.observe(host);
      }

      // mouse repulsion state
      const mouse = { x: 0, y: 0, active: false, radius: 260, strength: 24 };
      host.addEventListener('mousemove', (e) => {
        const rect = host.getBoundingClientRect();
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
        mouse.active = true;
      }, { passive: true });
      host.addEventListener('mouseleave', () => { mouse.active = false; });

      resize();
      schedule();
    })();

// ---- section ----

(() => {
  const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* CAMBIA QUI SE VUOI:
     'CONTATTO' | 'PIU CLIENTI' | 'CONVERSIONE' | 'LEAD' */
  const CONVERSION_WORD = 'CONTATTO';

  const lerp = (a,b,t)=> a + (b-a)*t;
  const clamp01 = (x)=> Math.max(0, Math.min(1, x));
  const easeInOut = (t)=> t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

  function mulberry32(a){
    return function(){
      let t = a += 0x6D2B79F5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
  }

  function sampleLine(out, x1,y1,x2,y2, step){
    const dx=x2-x1, dy=y2-y1;
    const dist = Math.hypot(dx,dy);
    const n = Math.max(2, Math.floor(dist/step));
    for(let i=0;i<=n;i++){
      const t=i/n;
      out.push({x:x1+dx*t, y:y1+dy*t});
    }
  }
  function sampleRect(out, x,y,w,h, step){
    sampleLine(out, x,y, x+w,y, step);
    sampleLine(out, x+w,y, x+w,y+h, step);
    sampleLine(out, x+w,y+h, x,y+h, step);
    sampleLine(out, x,y+h, x,y, step);
  }
  function sampleArrow(out, x1,y1,x2,y2, step){
    sampleLine(out, x1,y1, x2,y2, step);
    const ang = Math.atan2(y2-y1, x2-x1);
    const head = Math.max(12, step*3.2);
    const a1 = ang + Math.PI*0.82;
    const a2 = ang - Math.PI*0.82;
    sampleLine(out, x2,y2, x2+Math.cos(a1)*head, y2+Math.sin(a1)*head, step);
    sampleLine(out, x2,y2, x2+Math.cos(a2)*head, y2+Math.sin(a2)*head, step);
  }

  function resampleToCount(list, n, rnd, jitter=1.0){
    if(n <= 0) return [];
    if(list.length === 0){
      const out=[]; for(let i=0;i<n;i++) out.push({x:rnd(), y:rnd()}); return out;
    }
    if(list.length >= n){
      const out=[];
      for(let i=0;i<n;i++){
        const idx = Math.floor((i/(n-1)) * (list.length-1));
        out.push(list[idx]);
      }
      return out;
    }
    const out=list.slice();
    while(out.length < n){
      const p = list[Math.floor(rnd()*list.length)];
      out.push({x:p.x + (rnd()*2-1)*jitter, y:p.y + (rnd()*2-1)*jitter});
    }
    return out;
  }

  function sampleTextPoints(text, x, y, w, h, rnd){
    const oc = document.createElement('canvas');
    oc.width = Math.max(1, Math.floor(w));
    oc.height = Math.max(1, Math.floor(h));
    const c = oc.getContext('2d', { willReadFrequently:true });

    c.clearRect(0,0,oc.width,oc.height);
    c.fillStyle = '#000';
    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const family = '"Google Sans Flex", sans-serif';

    let fs = Math.floor(h * 0.66);
    while(fs > 10){
      c.font = `700 ${fs}px ${family}`;
      const m = c.measureText(text);
      if(m.width <= oc.width * 0.92) break;
      fs -= 2;
    }

    c.font = `700 ${fs}px ${family}`;
    c.fillText(text, oc.width/2, oc.height/2);

    const img = c.getImageData(0,0,oc.width,oc.height).data;
    const pts = [];

    const step = Math.max(3, Math.min(6, Math.floor(Math.min(oc.width, oc.height) / 44)));
    const alphaCut = 110;

    for(let py=0; py<oc.height; py+=step){
      for(let px=0; px<oc.width; px+=step){
        const a = img[(py*oc.width + px)*4 + 3];
        if(a > alphaCut){
          pts.push({
            x: x + px + (rnd()*2-1)*0.35,
            y: y + py + (rnd()*2-1)*0.35
          });
        }
      }
    }
    return pts;
  }

  function buildTargetData(layout, count, w, h, seed){
    const rnd = mulberry32(seed);
    const step = Math.max(6, Math.min(10, (w+h)/175));

    if(layout === 'vetrina'){
      const pts = [];
      const meta = [];
      let contentRect = null;

      function pushPoint(p, m=null){ pts.push(p); meta.push(m); }
      function pushList(list, m=null){ for(const p of list) pushPoint(p, m); }

      const W = w*0.62, H = h*0.52;
      const x = (w - W)/2, y = (h - H)/2;
      const barH = H*0.17;

      const frame=[]; sampleRect(frame,x,y,W,H,step);
      pushList(frame, {scroll:false});
      const bar=[]; sampleLine(bar, x, y+barH, x+W, y+barH, step);
      pushList(bar, {scroll:false});

      const cPadX = W*0.08;
      const cTop = y + barH + H*0.06;
      const cLeft = x + cPadX;
      const cW = W - cPadX*2;
      const cH = (y+H) - cTop - H*0.06;
      contentRect = { x: cLeft, y: cTop, w: cW, h: cH };

      const addScrollable = (list) => {
        for(const p of list){
          const ry = p.y - contentRect.y;
          pts.push({x:p.x, y:p.y});
          meta.push({scroll:true, ry});
        }
      };

      const hero=[]; sampleRect(hero, cLeft, cTop + cH*0.02, cW, cH*0.24, step); addScrollable(hero);
      const t1=[]; sampleLine(t1, cLeft, cTop + cH*0.31, cLeft + cW*0.88, cTop + cH*0.31, step); addScrollable(t1);
      const t2=[]; sampleLine(t2, cLeft, cTop + cH*0.38, cLeft + cW*0.68, cTop + cH*0.38, step); addScrollable(t2);

      const py = cTop + cH*0.46;
      for(let i=0;i<4;i++){
        const pill=[]; sampleRect(pill, cLeft + (cW*0.02) + i*(cW*0.245), py, cW*0.20, cH*0.08, step);
        addScrollable(pill);
      }

      const gy = cTop + cH*0.58;
      const g1=[]; sampleRect(g1, cLeft, gy, cW*0.48, cH*0.18, step); addScrollable(g1);
      const g2=[]; sampleRect(g2, cLeft + cW*0.52, gy, cW*0.48, cH*0.18, step); addScrollable(g2);

      const f1=[]; sampleLine(f1, cLeft, cTop + cH*0.82, cLeft + cW*0.78, cTop + cH*0.82, step); addScrollable(f1);
      const f2=[]; sampleLine(f2, cLeft, cTop + cH*0.90, cLeft + cW*0.62, cTop + cH*0.90, step); addScrollable(f2);

      const basePts = pts.slice();
      const baseMeta = meta.slice();

      if(basePts.length < count){
        while(basePts.length < count){
          const p = basePts[Math.floor(rnd()*basePts.length)];
          const m = baseMeta[Math.floor(rnd()*baseMeta.length)];
          basePts.push({x: p.x + (rnd()*2-1)*1.0, y: p.y + (rnd()*2-1)*1.0});
          baseMeta.push(m);
        }
      } else if(basePts.length > count){
        const outPts = [];
        const outMeta = [];
        for(let i=0;i<count;i++){
          const idx = Math.floor((i/(count-1)) * (basePts.length-1));
          outPts.push(basePts[idx]);
          outMeta.push(baseMeta[idx]);
        }
        return { targets: outPts, meta: outMeta, contentRect };
      }
      return { targets: basePts, meta: baseMeta, contentRect };
    }

    {
      const web=[], arrow=[];
      const topW = w*0.62, topH = h*0.38;
      const topX = (w - topW)/2, topY = h*0.10;
      const barH = topH*0.18;

      sampleRect(web, topX, topY, topW, topH, step);
      sampleLine(web, topX, topY+barH, topX+topW, topY+barH, step);
      sampleLine(web, topX+topW*0.10, topY+barH+topH*0.22, topX+topW*0.86, topY+barH+topH*0.22, step);
      sampleLine(web, topX+topW*0.10, topY+barH+topH*0.34, topX+topW*0.70, topY+barH+topH*0.34, step);
      sampleRect(web, topX+topW*0.28, topY+barH+topH*0.58, topW*0.44, topH*0.18, step);

      const ax1 = topX + topW*0.50, ay1 = topY + topH + h*0.03;
      const ax2 = w*0.50, ay2 = h*0.68;
      sampleArrow(arrow, ax1, ay1, ax2, ay2, step);

      const tx = w*0.14;
      const ty = h*0.72;
      const tw = w*0.72;
      const th = h*0.22;

      const textPts = sampleTextPoints(CONVERSION_WORD, tx, ty, tw, th, rnd);

      const nText = Math.floor(count * 0.56);
      const nArrow = Math.floor(count * 0.14);
      const nWeb = Math.max(0, count - nText - nArrow);

      const web2   = resampleToCount(web,   nWeb,   rnd, 1.0);
      const arrow2 = resampleToCount(arrow, nArrow, rnd, 0.8);
      const text2  = resampleToCount(textPts, nText, rnd, 0.6);

      const targets = web2.concat(arrow2, text2);
      const meta = new Array(targets.length).fill({scroll:false});
      return { targets, meta, contentRect: null };
    }
  }

  function buildBorderMeta(N, rect, seed){
    const rnd = mulberry32(seed);
    const meta = new Array(N);
    const band = Math.max(8, Math.min(rect.w, rect.h) * 0.05);
    for(let i=0;i<N;i++){
      const side = Math.floor(rnd()*4);
      const t = rnd();
      const n = rnd() * band;
      const osc = 0.6 + rnd()*1.2;
      const ph = rnd()*Math.PI*2;
      meta[i] = { side, t, n, osc, ph };
    }
    return meta;
  }
  function borderPoint(rect, m, time){
    const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
    const drift = Math.sin(time*m.osc + m.ph) * 0.04;
    const tt = (m.t + drift + 1) % 1;
    if(m.side === 0) return { x: lerp(x0,x1,tt), y: y0 + m.n };
    if(m.side === 2) return { x: lerp(x0,x1,tt), y: y1 - m.n };
    if(m.side === 1) return { x: x1 - m.n, y: lerp(y0,y1,tt) };
    return { x: x0 + m.n, y: lerp(y0,y1,tt) };
  }

  class ParticleField{
    constructor(canvas, layout){
      this.canvas = canvas;
      this.layout = layout;
      this.ctx = canvas.getContext('2d', { alpha:true });

      this._paused = false;
      this._running = false;
      this._raf = null;
      this._io = null;

      this.seed = layout === 'vetrina' ? 3301 : 3701;
      this.rnd = mulberry32(this.seed);

      this.w=0; this.h=0; this.dpr=1;
      this.N=0;

      this.p = [];
      this.want = 0;
      this.morph = 0;
      this.start = performance.now();

      this.morphIdx = [];
      this.slotByIndex = null;
      this.targets = [];
      this.tMeta = [];
      this.contentRect = null;

      this.borderRect = null;
      this.borderMeta = [];

      this.sparks = [];
      this.nextSparkAt = 0;

      this._ro = new ResizeObserver(()=>this.resize());
      this._ro.observe(this.canvas);

      this.resize();
      this._setupViewportPause();
      if(!prefersReduce) this._ensureRunning();
      else this.drawStatic();
    }

    _ensureRunning(){
      if(this._running || this._paused || document.hidden) return;
      this._running = true;
      this._raf = requestAnimationFrame((t)=>this.draw(t));
    }

    setPaused(isPaused){
      const next = !!isPaused;
      if(this._paused === next) return;
      this._paused = next;
      if(!this._paused) this._ensureRunning();
    }

    _setupViewportPause(){
      if(!('IntersectionObserver' in window)) return;
      this._io = new IntersectionObserver((entries) => {
        const e = entries && entries[0];
        const isIn = !!(e && e.isIntersecting);
        this.setPaused(!isIn);
      }, { threshold: 0.01, rootMargin: '240px 0px 240px 0px' });
      this._io.observe(this.canvas);

      document.addEventListener('visibilitychange', () => {
        if(!document.hidden) this._ensureRunning();
      }, { passive: true });
    }

    pickN(w,h){
      const area = w*h;
      const n = Math.floor(area / 390);
      return Math.max(820, Math.min(1650, n));
    }

    buildIdle(){
      const rand = mulberry32(this.seed);
      const pts = [];
      for(let i=0;i<this.N;i++){
        pts.push({
          x: rand()*this.w,
          y: rand()*this.h,
          a0: 0.10 + 0.80*rand(),
          phase: rand()*Math.PI*2,
          f1: 0.55 + rand()*1.10,
          f2: 0.55 + rand()*1.10,
          jx: rand()*Math.PI*2,
          jy: rand()*Math.PI*2
        });
      }
      this.p = pts;
    }

    buildMorphSet(){
      const rand = mulberry32(this.seed + 77);
      const frac = (this.layout === 'vetrina') ? 0.40 : 0.55;
      const morphCount = Math.floor(this.N * frac);

      const idx = Array.from({length:this.N}, (_,i)=>i);
      for(let i=idx.length-1;i>0;i--){
        const j = Math.floor(rand()*(i+1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      this.morphIdx = idx.slice(0, morphCount);

      const data = buildTargetData(this.layout, morphCount, this.w, this.h, this.seed + 999);
      this.targets = data.targets;
      this.tMeta = data.meta;
      this.contentRect = data.contentRect;

      const slot = new Int32Array(this.N);
      slot.fill(-1);
      for(let s=0;s<this.morphIdx.length;s++){
        slot[this.morphIdx[s]] = s;
      }
      this.slotByIndex = slot;

      const pad = Math.max(8, Math.min(this.w,this.h) * 0.04);
      this.borderRect = { x: pad, y: pad, w: this.w - pad*2, h: this.h - pad*2 };
      this.borderMeta = buildBorderMeta(this.N, this.borderRect, this.seed + 555);

      this.sparks = [];
      const scount = (this.layout === 'vetrina') ? 26 : 22;
      const r2 = mulberry32(this.seed + 333);
      for(let i=0;i<scount;i++){
        this.sparks.push({ x:r2()*this.w, y:r2()*this.h, vx:0, vy:0, active:false, ti:0 });
      }
      this.nextSparkAt = 0;
    }

    resize(){
      const rect = this.canvas.getBoundingClientRect();
      this.w = Math.max(1, Math.floor(rect.width));
      this.h = Math.max(1, Math.floor(rect.height));
      this.dpr = Math.max(1, Math.min(1.35, window.devicePixelRatio || 1));

      this.canvas.width = Math.floor(this.w * this.dpr);
      this.canvas.height = Math.floor(this.h * this.dpr);
      this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);

      this.N = this.pickN(this.w,this.h);
      this.buildIdle();
      this.buildMorphSet();
    }

    setHover(isOn){
      this.want = isOn ? 1 : 0;
      if(prefersReduce) this.drawStatic();
    }

    drawStatic(){
      this.morph = this.want ? 1 : 0;
      this.render(performance.now(), true);
    }

    draw(now){
      if(this._paused || document.hidden){
        this.start = now;
        this._running = false;
        return;
      }

      const inSpd  = (this.layout === 'vetrina') ? 0.013 : 0.016;
      const outSpd = (this.layout === 'vetrina') ? 0.012 : 0.015;

      const speed = this.want ? inSpd : outSpd;
      this.morph += (this.want - this.morph) * speed;
      this.morph = clamp01(this.morph);

      this.render(now, false);
      this._raf = requestAnimationFrame((t)=>this.draw(t));
    }

    spawnSpark(now){
      if(!this.want) return;
      if(this.morph < 0.20) return;
      if(now < this.nextSparkAt) return;

      const base = (this.layout === 'vetrina') ? 1100 : 900;
      const jitter = (this.layout === 'vetrina') ? 1700 : 1400;
      this.nextSparkAt = now + base + this.rnd()*jitter;

      let s = null;
      for(let k=0;k<8;k++){
        const cand = this.sparks[Math.floor(this.rnd()*this.sparks.length)];
        if(!cand.active){ s = cand; break; }
      }
      if(!s) return;

      const side = Math.floor(this.rnd()*4);
      if(side===0){ s.x = -12; s.y = this.rnd()*this.h; }
      if(side===1){ s.x = this.w+12; s.y = this.rnd()*this.h; }
      if(side===2){ s.x = this.rnd()*this.w; s.y = -12; }
      if(side===3){ s.x = this.rnd()*this.w; s.y = this.h+12; }

      s.vx = 0; s.vy = 0;
      s.active = true;
      s.ti = Math.floor(this.rnd()*this.targets.length);
    }

    updateSparks(ctx, linesE){
      if(!this.want) return;

      for(const s of this.sparks){
        if(!s.active) continue;

        const trg = this.targets[s.ti];
        const dx = trg.x - s.x;
        const dy = trg.y - s.y;
        const dist = Math.hypot(dx,dy) + 0.001;

        const ax = (dx/dist) * 0.20;
        const ay = (dy/dist) * 0.20;

        s.vx = (s.vx + ax) * 0.986;
        s.vy = (s.vy + ay) * 0.986;

        s.x += s.vx * 3.4;
        s.y += s.vy * 3.4;

        ctx.globalAlpha = 0.28 + 0.20*linesE;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 0.45, 0, Math.PI*2);
        ctx.fill();

        if(dist < 14) s.active = false;
      }
      ctx.globalAlpha = 1;
    }

    render(now, forceStill){
      const ctx = this.ctx;
      const rgb = getComputedStyle(this.canvas.closest('.ff-help')).getPropertyValue('--ffp-rgb').trim() || '10,20,120';
      ctx.clearRect(0,0,this.w,this.h);
      ctx.fillStyle = `rgb(${rgb})`;

      const t = (now - this.start)/1000;

      const borderE = easeInOut(clamp01(this.morph * 1.55));
      const linesE  = easeInOut(Math.pow(this.morph, 1.65));

      const amp = forceStill ? 0 : 11.5;
      const rippleSpd = forceStill ? 0 : 0.85;

      let scrollOff = 0;
      if(this.layout === 'vetrina' && this.contentRect && !forceStill){
        const loop = this.contentRect.h;
        const pxPerSec = loop / 22;
        scrollOff = -((t * pxPerSec) % loop);
      }

      for(let i=0;i<this.N;i++){
        const p = this.p[i];

        const nx = forceStill ? 0 : Math.sin(t*p.f1 + p.jx) * amp;
        const ny = forceStill ? 0 : Math.cos(t*p.f2 + p.jy) * amp;

        const ix = p.x + nx;
        const iy = p.y + ny;

        const slot = this.slotByIndex[i];
        const isMorph = (slot !== -1);

        let x = ix, y = iy;

        if(isMorph){
          let tx = this.targets[slot].x;
          let ty = this.targets[slot].y;

          if(this.layout === 'vetrina' && this.contentRect){
            const m = this.tMeta[slot];
            if(m && m.scroll){
              const cr = this.contentRect;
              const ry = m.ry;
              const yy = (ry + scrollOff);
              const wrapped = ((yy % cr.h) + cr.h) % cr.h;
              ty = cr.y + wrapped;
            }
          }

          x = lerp(ix, tx, linesE);
          y = lerp(iy, ty, linesE);
        } else {
          const bp = borderPoint(this.borderRect, this.borderMeta[i], t);
          x = lerp(ix, bp.x, borderE);
          y = lerp(iy, bp.y, borderE);
        }

        const ripple = forceStill ? 0.5 : (0.5 + 0.5*Math.sin(t*rippleSpd + p.phase));
        const baseA = p.a0 * (0.62 + 0.38*ripple);

        const aMul = isMorph ? (0.92 + 0.22*linesE) : (1.0 - 0.34*borderE);
        const a = Math.min(1, Math.max(0, baseA * aMul));
        const sz = (forceStill ? 1.00 : (0.85 + 0.30*ripple)) * (isMorph ? (0.95 + 0.12*linesE) : 1.0);

        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fill();
      }

      if(!forceStill){
        this.spawnSpark(now);
        this.updateSparks(ctx, linesE);
      }

      ctx.globalAlpha = 1;
    }
  }

  const canvases = Array.from(document.querySelectorAll('.ff-help .ffp-canvas'));
  canvases.forEach((cv, idx) => {
    const layout = cv.dataset.layout || (idx === 0 ? 'vetrina' : 'conversione');
    const inst = new ParticleField(cv, layout);
    cv._ffpInstance = inst;

    const banner = cv.closest('.ff-help__banner');
    const media = cv.closest('.ff-help__media');

    banner.addEventListener('mouseenter', () => inst.setHover(true));
    banner.addEventListener('mouseleave', () => inst.setHover(false));
    media.addEventListener('click', () => inst.setHover(!inst.want));
  });
})();

// ---- section ----

// ff-help tabs (obiettivi)
(() => {
  const root = document.querySelector('#ff-help');
  if (!root) return;

  const tabs = Array.from(root.querySelectorAll('[data-key]'));
  const micro = root.querySelector('[data-ff-help-micro]');
  const title = root.querySelector('[data-ff-help-title]');
  const desc = root.querySelector('[data-ff-help-desc]');
  const microline = root.querySelector('[data-ff-help-microline]');
  // This block is kept only for backwards compatibility with an older ff-help layout.
  // If the expected nodes aren't present, bail out without breaking the rest of the page JS.
  if(!tabs.length || !micro || !title || !desc) return;

  const copy = {
    authority: {
      micro: 'COSTRUIRE AUTOREVOLEZZA',
      title: 'Fatti scegliere al primo confronto',
      desc: 'In pochi secondi devono capire chi sei, perché fidarsi e cosa fare.',
      microline: 'Posizionamento chiaro · Prove reali · Contatto senza attrito',
      layout: 'vetrina'
    },
    contacts: {
      micro: 'GENERARE CONTATTI',
      title: 'Trasforma visite in richieste',
      desc: 'Tagliamo i dubbi e rendiamo il contatto inevitabile (WhatsApp, chiamata o form).',
      microline: 'CTA visibile · Percorso guidato · Tracciamento contatti',
      layout: 'conversione'
    },
    sales: {
      micro: 'VENDERE ONLINE',
      title: 'Più ordini, meno carrelli abbandonati',
      desc: 'Catalogo e checkout progettati per comprare, non per navigare.',
      microline: 'Filtri & ricerca · Schede che convincono · Checkout rapido',
      layout: 'ecommerce'
    },
    process: {
      micro: 'AUTOMATIZZARE PROCESSI',
      title: 'Meno manuale, più tempo',
      desc: 'Richieste e dati diventano flussi automatici: meno errori, più controllo.',
      microline: 'Moduli intelligenti · Automazioni · Dashboard semplice',
      layout: 'process'
    }
  };

  const keyOrder = tabs.map(t => t.dataset.key).filter(Boolean);
  const initialKey = keyOrder[0] && copy[keyOrder[0]] ? keyOrder[0] : 'authority';

  function setState(key){
    const cfg = copy[key];
    if(!cfg){
      console.warn('[ff-help] Unknown key', key);
      return setState('authority');
    }
    tabs.forEach(btn => btn.classList.toggle('is-active', btn.dataset.key === key));
    micro.textContent = cfg.micro;
    title.textContent = cfg.title;
    desc.textContent = cfg.desc;
    if(microline) microline.textContent = cfg.microline || '';

    const canvas = root.querySelector('.ffp-canvas');
    if(canvas && canvas._ffpInstance){
      canvas._ffpInstance.setLayout(cfg.layout);
      requestAnimationFrame(()=> canvas._ffpInstance.resize());
    }
  }

  tabs.forEach(btn => {
    btn.addEventListener('click', () => setState(btn.dataset.key || 'authority'));
  });

  setState(initialKey);
})();

// ---- section ----

(() => {
      const root = document.querySelector('.pf-bento-social');
      if (!root) return;

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const cards = root.querySelectorAll('[data-anim]');

      if (!prefersReduced && 'IntersectionObserver' in window) {
        const io = new IntersectionObserver((entries) => {
          entries.forEach(e => {
            if (e.isIntersecting) {
              e.target.classList.add('is-in');
              io.unobserve(e.target);
            }
          });
        }, { threshold: 0.18 });
        cards.forEach(el => io.observe(el));
      } else {
        cards.forEach(el => el.classList.add('is-in'));
      }
    })();

// ---- section ----

(() => {
      const root = document.querySelector('#ff-problem .ff-flow');
      if(!root) return;

      const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if(reduced) return;

      const STATES = [
        { key: 'search', ms: 2600 },
        { key: 'arrow',  ms: 2600 },
        { key: 'bad',    ms: 2600 },
        { key: 'good',   ms: 2600 },
      ];

      let idx = 0;
      let t = null;

      function step(){
        const cur = STATES[idx];
        root.dataset.state = cur.key;

        clearTimeout(t);
        t = setTimeout(() => {
          idx = (idx + 1) % STATES.length;
          step();
        }, cur.ms);
      }

      if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
          if(entries[0].isIntersecting){
            io.disconnect();
            step();
          }
        }, { threshold: 0.25 });
        io.observe(root);
      } else {
        step();
      }
    })();

// ---- section ----

(() => {
      const root = document.querySelector('#ff-steps.ff-steps');
      if(!root) return;

      const prefersReduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const STEPS = {
        1: { symbol:'call',   micro:'Step 01', title:'Chiamata / incontro e definizione obiettivo',
          desc:'Capisco cosa deve ottenere il sito: convertire di più oppure essere una vetrina coinvolgente che rappresenta azienda e branding.',
          bullets:['Obiettivo: contatti vs autorevolezza','CTA principali: WhatsApp / chiamata / form','Target e priorità'] },
        2: { symbol:'arch',   micro:'Step 02', title:'Architettura: progetto la struttura (prima della grafica)',
          desc:'Definisco Home, sezioni e pagine chiave (Contatti, Metodo, Portfolio…). Così ci allineiamo subito e la grafica lavora su una base solida.',
          bullets:['Mappa pagine + ordine sezioni','Percorso utente: interesse → fiducia → contatto','Coerenza con obiettivo scelto'] },
        3: { symbol:'draft',  micro:'Step 03', title:'Bozza struttura + presentazione',
          desc:'Ti mostro la struttura iniziale: cosa c’è, dove sta e cosa deve far succedere. È lo step che evita ripensamenti grossi più avanti.',
          bullets:['Walkthrough completo Home + pagine','Feedback guidato e pratico','Allineamento prima di rifinire il design'] },
        4: { symbol:'check',  micro:'Step 04', title:'Revisione e approvazione della struttura',
          desc:'Sistemiamo ciò che serve e poi blocchiamo la struttura. Da qui in poi si va veloci, perché la base è condivisa.',
          bullets:['Rifinitura sezioni e priorità','Ok finale su CTA e messaggi','Struttura approvata = lavoro rapido'] },
        5: { symbol:'content',micro:'Step 05', title:'Contenuti reali: testi e immagini dell’azienda',
          desc:'Sostituisco placeholder e bozza con contenuti reali: copy definitivo, immagini e materiali dell’azienda, ottimizzati per performance.',
          bullets:['Copy + CTA finali','Immagini reali ottimizzate','Coerenza con branding'] },
        6: { symbol:'launch', micro:'Step 06', title:'Online + dominio + Google Search Console / Analytics',
          desc:'Pubblico il sito e collego i dati. Se c’è già un dominio: gestisco il trasferimento. Se non c’è: lo acquistiamo e lo configuriamo.',
          bullets:['Go-live + configurazioni','Search Console + Analytics','Dominio: acquisto o trasferimento'] },
        7: { symbol:'chart',  micro:'Step 07', title:'Dopo 30 giorni: report e direzione',
          desc:'Guardiamo visite e click (WhatsApp/telefono/form) e decidiamo dove migliorare. Per “conversione” rende al massimo con marketing (social/ads).',
          bullets:['Report chiaro e leggibile','Cosa funziona / cosa no','Piano miglioramenti'] }
      };

      const cells  = Array.from(root.querySelectorAll('.ff-steps__cell'));
      const card   = root.querySelector('.ff-steps__card');

      const micro  = root.querySelector('[data-micro]');
      const title  = root.querySelector('[data-title]');
      const desc   = root.querySelector('[data-desc]');
      const bul    = root.querySelector('[data-bullets]');
      const canvas = root.querySelector('.ff-steps__canvas');

      const prevBtn = root.querySelector('.ff-steps__navBtn[data-nav="prev"]');
      const nextBtn = root.querySelector('.ff-steps__navBtn[data-nav="next"]');

      let currentStep = 1;

      function escapeHtml(str){
        return String(str)
          .replaceAll('&','&amp;')
          .replaceAll('<','&lt;')
          .replaceAll('>','&gt;')
          .replaceAll('"','&quot;')
          .replaceAll("'","&#039;");
      }

      // ---------- PARTICLES ----------
      const lerp = (a,b,t)=> a + (b-a)*t;
      const clamp01 = (x)=> Math.max(0, Math.min(1, x));
      const easeInOut = (t)=> t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2,3)/2;

      function mulberry32(a){
        return function(){
          let t = a += 0x6D2B79F5;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        }
      }

      function sampleLine(out, x1,y1,x2,y2, step){
        const dx=x2-x1, dy=y2-y1;
        const dist = Math.hypot(dx,dy);
        const n = Math.max(2, Math.floor(dist/step));
        for(let i=0;i<=n;i++){
          const t=i/n;
          out.push({x:x1+dx*t, y:y1+dy*t});
        }
      }
      function sampleCircle(out, cx, cy, r, step){
        const circumference = Math.max(1, Math.PI * 2 * r);
        const n = Math.max(18, Math.floor(circumference / Math.max(3, step)));
        for(let i=0;i<=n;i++){
          const a = (i/n) * Math.PI * 2;
          out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
      }
      function sampleRect(out, x,y,w,h, step){
        sampleLine(out, x,y, x+w,y, step);
        sampleLine(out, x+w,y, x+w,y+h, step);
        sampleLine(out, x+w,y+h, x,y+h, step);
        sampleLine(out, x,y+h, x,y, step);
      }
      function sampleCheck(out, x, y, w, h, step){
        sampleLine(out, x+w*0.10, y+h*0.55, x+w*0.42, y+h*0.82, step);
        sampleLine(out, x+w*0.40, y+h*0.82, x+w*0.88, y+h*0.20, step);
      }
      function sampleBars(out, x, y, w, h, step){
        const bw = w*0.16;
        const gap = w*0.08;
        const base = y+h*0.90;
        const heights = [0.28, 0.52, 0.78, 0.44];
        for(let i=0;i<4;i++){
          const bx = x + i*(bw+gap);
          const bh = h*heights[i];
          sampleRect(out, bx, base-bh, bw, bh, step);
        }
      }
      function samplePhone(out, x, y, w, h, step){
        sampleRect(out, x+w*0.18, y+h*0.14, w*0.64, h*0.72, step);
        sampleLine(out, x+w*0.36, y+h*0.22, x+w*0.64, y+h*0.22, step);
        sampleRect(out, x+w*0.44, y+h*0.74, w*0.12, h*0.08, step);
      }
      function sampleWireframe(out, x, y, w, h, step){
        sampleRect(out, x, y, w, h, step);
        sampleLine(out, x, y+h*0.18, x+w, y+h*0.18, step);
        sampleRect(out, x+w*0.08, y+h*0.28, w*0.84, h*0.26, step);
        sampleLine(out, x+w*0.08, y+h*0.62, x+w*0.78, y+h*0.62, step);
        sampleLine(out, x+w*0.08, y+h*0.72, x+w*0.62, y+h*0.72, step);
        sampleRect(out, x+w*0.08, y+h*0.80, w*0.38, h*0.12, step);
        sampleRect(out, x+w*0.54, y+h*0.80, w*0.38, h*0.12, step);
      }
      function sampleSteps(out, x, y, w, h, step){
        // 3-step block silhouette (like screenshot)
        const p = [
          [0.10,0.70],[0.10,0.46],[0.40,0.46],
          [0.40,0.26],[0.64,0.26],[0.64,0.70],
          [0.90,0.70],[0.90,0.84],[0.10,0.84],
          [0.10,0.70],
        ];
        for(let i=0;i<p.length-1;i++){
          sampleLine(out, x+w*p[i][0], y+h*p[i][1], x+w*p[i+1][0], y+h*p[i+1][1], step);
        }
      }
      function samplePodium(out, x, y, w, h, step){
        // Super simple podium: three rectangles, center taller.
        sampleRect(out, x+w*0.18, y+h*0.60, w*0.20, h*0.22, step); // left
        sampleRect(out, x+w*0.40, y+h*0.48, w*0.20, h*0.34, step); // center
        sampleRect(out, x+w*0.62, y+h*0.64, w*0.20, h*0.18, step); // right
      }
      function sampleFunnel(out, x, y, w, h, step){
        // Funnel like screenshot: outline + multiple internal levels.
        const topL = { x: x+w*0.12, y: y+h*0.26 };
        const topR = { x: x+w*0.88, y: y+h*0.26 };
        const bot  = { x: x+w*0.50, y: y+h*0.82 };
        sampleLine(out, topL.x, topL.y, topR.x, topR.y, step);
        sampleLine(out, topR.x, topR.y, bot.x, bot.y, step);
        sampleLine(out, bot.x, bot.y, topL.x, topL.y, step);

        for(const tt of [0.22, 0.40, 0.58, 0.72]){
          const ax = lerp(topL.x, bot.x, tt);
          const ay = lerp(topL.y, bot.y, tt);
          const bx = lerp(topR.x, bot.x, tt);
          const by = lerp(topR.y, bot.y, tt);
          sampleLine(out, ax, ay, bx, by, step*1.1);
        }
      }
      function sampleBag(out, x, y, w, h, step){
        // Shopping bag: body + handle arc
        // Slightly squished horizontally (per request)
        sampleRect(out, x+w*0.27, y+h*0.42, w*0.46, h*0.40, step);
        const cx = x+w*0.50;
        const cy = y+h*0.42 + 10; // handle down by 10px
        const rx = w*0.14;
        const ry = h*0.22;
        const seg = 28;
        for(let i=0;i<=seg;i++){
          const a = Math.PI - (i/seg)*Math.PI;
          const px = cx + Math.cos(a)*rx;
          const py = cy - Math.sin(a)*ry;
          out.push({ x:px, y:py });
        }
      }
      function sampleWorkflow(out, x, y, w, h, step){
        // New "processi" symbol: simple flowchart (3 boxes + arrows)
        const bw = w*0.62;
        const bh = h*0.16;
        const bx = x + (w - bw) / 2;

        const y1 = y + h*0.18;
        const y2 = y + h*0.42;
        const y3 = y + h*0.66;

        sampleRect(out, bx, y1, bw, bh, step*1.05);
        sampleRect(out, bx, y2, bw, bh, step*1.05);
        sampleRect(out, bx, y3, bw, bh, step*1.05);

        const cx = x + w*0.50;
        const arrow = (yFrom, yTo) => {
          const y1 = yFrom + h*0.02;
          const y2 = yTo - h*0.02;
          sampleLine(out, cx, y1, cx, y2, step);
          sampleLine(out, cx, y2, cx - w*0.04, y2 - h*0.05, step*1.15);
          sampleLine(out, cx, y2, cx + w*0.04, y2 - h*0.05, step*1.15);
        };

        arrow(y1 + bh, y2);
        arrow(y2 + bh, y3);
      }
      function sampleGear(out, x, y, w, h, step){
        // Simpler "automazione digitale": half gear + 3 straight circuit lines.
        const cx = x + w*0.50;
        const cy = y + h*0.52;
        const rOuter = Math.min(w,h) * 0.32;
        const rInner = rOuter * 0.58;

        // center ring
        sampleCircle(out, cx, cy, rInner, step);

        // left half gear arc
        const aStart = Math.PI * 0.62;
        const aEnd   = Math.PI * 1.38;
        const arcSpan = aEnd - aStart;
        const arcSeg = 28;
        for(let i=0;i<=arcSeg;i++){
          const t = i / arcSeg;
          const a = aStart + arcSpan * t;
          out.push({ x: cx + Math.cos(a) * rOuter, y: cy + Math.sin(a) * rOuter });
        }

        // a few teeth as short ticks
        const teeth = 5;
        const toothLen = rOuter * 0.18;
        for(let i=0;i<teeth;i++){
          const t = (i + 0.5) / teeth;
          const a = aStart + arcSpan * t;
          const x1 = cx + Math.cos(a) * (rOuter * 0.92);
          const y1 = cy + Math.sin(a) * (rOuter * 0.92);
          const x2 = cx + Math.cos(a) * (rOuter + toothLen);
          const y2 = cy + Math.sin(a) * (rOuter + toothLen);
          sampleLine(out, x1, y1, x2, y2, step*1.05);
        }

        // circuits (right)
        const nodeR = rOuter * 0.07;
        const x0 = cx + rInner * 1.00;
        const x2 = cx + rOuter * 1.55;
        const ys = [cy - rOuter*0.26, cy, cy + rOuter*0.26];
        for(let i=0;i<ys.length;i++){
          sampleLine(out, x0, ys[i], x2, ys[i], step);
          sampleCircle(out, x2, ys[i], nodeR, step*1.2);
        }

        // one small branch on the middle line
        const bx = cx + rOuter * 1.10;
        const by = cy - rOuter * 0.22;
        sampleLine(out, bx, cy, bx, by, step);
        sampleCircle(out, bx, by, nodeR, step*1.2);
      }
      function sampleChip(out, x, y, w, h, step){
        // "Automazione digitale": microchip + pins (clearer than gear with dotted particles).
        const cx = x + w*0.50;
        const cy = y + h*0.54;

        const bodyW = w*0.58;
        const bodyH = h*0.46;
        const bx = cx - bodyW/2;
        const by = cy - bodyH/2;
        sampleRect(out, bx, by, bodyW, bodyH, step);

        const innerW = bodyW*0.62;
        const innerH = bodyH*0.58;
        const ix = cx - innerW/2;
        const iy = cy - innerH/2;
        sampleRect(out, ix, iy, innerW, innerH, step*1.05);

        const pins = 4;
        const pinLen = Math.min(w,h) * 0.08;
        for(let i=0;i<pins;i++){
          const t = (i + 0.5) / pins;
          const px = bx + bodyW * t;
          sampleLine(out, px, by, px, by - pinLen, step*1.15);
          sampleLine(out, px, by + bodyH, px, by + bodyH + pinLen, step*1.15);
        }
        for(let i=0;i<pins;i++){
          const t = (i + 0.5) / pins;
          const py = by + bodyH * t;
          sampleLine(out, bx, py, bx - pinLen, py, step*1.15);
          sampleLine(out, bx + bodyW, py, bx + bodyW + pinLen, py, step*1.15);
        }

        // Simple inner lines to suggest "digital"
        sampleLine(out, ix + innerW*0.18, cy - innerH*0.15, ix + innerW*0.82, cy - innerH*0.15, step*1.2);
        sampleLine(out, ix + innerW*0.18, cy,               ix + innerW*0.82, cy,               step*1.2);
        sampleLine(out, ix + innerW*0.18, cy + innerH*0.15, ix + innerW*0.62, cy + innerH*0.15, step*1.2);
      }
      function sampleLoop(out, x, y, w, h, step){
        // Super simple automation loop: 4 curved arrows around a circle.
        const cx = x + w*0.50;
        const cy = y + h*0.54;
        const r = Math.min(w,h) * 0.33;

        const arcPts = (a1, a2) => {
          const span = a2 - a1;
          const seg = Math.max(18, Math.floor((Math.abs(span) * r) / Math.max(4, step)));
          for(let i=0;i<=seg;i++){
            const t = i / seg;
            const a = a1 + span * t;
            out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
          }
        };

        const arrowHead = (tipX, tipY, dirA) => {
          const len = r * 0.18;
          const spread = Math.PI * 0.78;
          const a1 = dirA + spread;
          const a2 = dirA - spread;
          sampleLine(out, tipX, tipY, tipX + Math.cos(a1) * len, tipY + Math.sin(a1) * len, step*1.05);
          sampleLine(out, tipX, tipY, tipX + Math.cos(a2) * len, tipY + Math.sin(a2) * len, step*1.05);
        };

        // 4 arcs, clockwise, with gaps (like the reference icon)
        const gaps = Math.PI * 0.18;
        const quarter = (Math.PI * 2) / 4;
        for(let i=0;i<4;i++){
          const aStart = -Math.PI/2 + i*quarter + gaps*0.5;
          const aEnd = aStart + quarter - gaps;
          arcPts(aStart, aEnd);

          // arrow tip at end, direction along clockwise tangent
          const tipA = aEnd;
          const tipX = cx + Math.cos(tipA) * r;
          const tipY = cy + Math.sin(tipA) * r;
          const dirA = tipA + Math.PI/2; // clockwise tangent
          arrowHead(tipX, tipY, dirA);
        }
      }
      function sampleFlow(out, x, y, w, h, step){
        // Super simple process: loop arrow (circle + arrow head).
        const cx = x+w*0.50;
        const cy = y+h*0.54;
        const r = Math.min(w,h) * 0.26;
        sampleCircle(out, cx, cy, r, step);

        // arrow head on the circle (top-right)
        const ax = cx + r*0.70;
        const ay = cy - r*0.70;
        sampleLine(out, ax, ay, ax - w*0.06, ay, step*1.25);
        sampleLine(out, ax, ay, ax - w*0.03, ay - h*0.05, step*1.25);
        sampleLine(out, ax, ay, ax - w*0.03, ay + h*0.05, step*1.25);
      }
      function samplePentagon(out, x, y, w, h, step){
        // Pentagon + inner star lines
        const cx = x+w*0.50;
        const cy = y+h*0.54;
        const r = Math.min(w,h)*0.22;
        const verts = [];
        for(let i=0;i<5;i++){
          const a = -Math.PI/2 + i*(Math.PI*2/5);
          verts.push({ x: cx + Math.cos(a)*r, y: cy + Math.sin(a)*r });
        }
        for(let i=0;i<5;i++){
          const a = verts[i], b = verts[(i+1)%5];
          sampleLine(out, a.x,a.y, b.x,b.y, step);
        }
        for(let i=0;i<5;i++){
          const a = verts[i], b = verts[(i+2)%5];
          sampleLine(out, a.x,a.y, b.x,b.y, step*1.05);
        }
      }
      function samplePresentation(out, x, y, w, h, step){
        sampleRect(out, x+w*0.12, y+h*0.18, w*0.76, h*0.46, step);
        sampleLine(out, x+w*0.50, y+h*0.64, x+w*0.50, y+h*0.80, step);
        sampleLine(out, x+w*0.22, y+h*0.86, x+w*0.78, y+h*0.86, step);
        sampleLine(out, x+w*0.78, y+h*0.86, x+w*0.70, y+h*0.78, step);
        sampleLine(out, x+w*0.78, y+h*0.86, x+w*0.70, y+h*0.94, step);
      }
      function sampleContent(out, x, y, w, h, step){
        sampleRect(out, x+w*0.10, y+h*0.16, w*0.80, h*0.50, step);
        sampleLine(out, x+w*0.14, y+h*0.74, x+w*0.86, y+h*0.74, step);
        sampleLine(out, x+w*0.14, y+h*0.84, x+w*0.66, y+h*0.84, step);
        sampleLine(out, x+w*0.18, y+h*0.52, x+w*0.36, y+h*0.36, step);
        sampleLine(out, x+w*0.36, y+h*0.36, x+w*0.48, y+h*0.46, step);
        sampleLine(out, x+w*0.48, y+h*0.46, x+w*0.58, y+h*0.34, step);
        sampleLine(out, x+w*0.58, y+h*0.34, x+w*0.76, y+h*0.52, step);
      }
      function sampleRocket(out, x, y, w, h, step){
        sampleRect(out, x+w*0.40, y+h*0.18, w*0.20, h*0.52, step);
        sampleLine(out, x+w*0.40, y+h*0.36, x+w*0.28, y+h*0.48, step);
        sampleLine(out, x+w*0.60, y+h*0.36, x+w*0.72, y+h*0.48, step);
        sampleLine(out, x+w*0.50, y+h*0.70, x+w*0.44, y+h*0.86, step);
        sampleLine(out, x+w*0.50, y+h*0.70, x+w*0.56, y+h*0.86, step);
      }

      function resampleToCount(list, n, rnd, jitter=1.0){
        if(n <= 0) return [];
        if(list.length === 0){
          const out=[]; for(let i=0;i<n;i++) out.push({x:rnd(), y:rnd()}); return out;
        }
        if(list.length >= n){
          const out=[];
          for(let i=0;i<n;i++){
            const idx = Math.floor((i/(n-1)) * (list.length-1));
            out.push(list[idx]);
          }
          return out;
        }
        const out=list.slice();
        while(out.length < n){
          const p = list[Math.floor(rnd()*list.length)];
          out.push({x:p.x + (rnd()*2-1)*jitter, y:p.y + (rnd()*2-1)*jitter});
        }
        return out;
      }

      function buildTargetForSymbol(symbol, count, w, h, seed){
        const rnd = mulberry32(seed);
        const step = Math.max(6, Math.min(10, (w+h)/175));
        const pts = [];
        const scale =
          (symbol === 'podium') ? 0.96 :
          (symbol === 'funnel') ? 0.78 :
          (symbol === 'workflow') ? 0.70 :
          (symbol === 'gear') ? 0.78 :
          (symbol === 'chip') ? 0.74 :
          (symbol === 'loop') ? 0.76 :
          0.62;
        const W = w*scale, H = h*scale;
        const x = (w - W)/2;
        const y = (h - H)/2 + ((symbol === 'podium') ? (-h * 0.105) : 0);

        if(symbol === 'call') samplePhone(pts, x, y, W, H, step);
        else if(symbol === 'arch') sampleWireframe(pts, x, y, W, H, step);
        else if(symbol === 'draft') samplePresentation(pts, x, y, W, H, step);
        else if(symbol === 'check') sampleCheck(pts, x, y, W, H, step);
        else if(symbol === 'content') sampleContent(pts, x, y, W, H, step);
        else if(symbol === 'launch') sampleRocket(pts, x, y, W, H, step);
        else if(symbol === 'chart') sampleBars(pts, x, y, W, H, step);
        else if(symbol === 'steps') sampleSteps(pts, x, y, W, H, step);
        else if(symbol === 'podium') samplePodium(pts, x, y, W, H, step);
        else if(symbol === 'funnel') sampleFunnel(pts, x, y, W, H, step);
        else if(symbol === 'bag') sampleBag(pts, x, y, W, H, step);
        else if(symbol === 'workflow') sampleWorkflow(pts, x, y, W, H, step);
        else if(symbol === 'gear') sampleGear(pts, x, y, W, H, step);
        else if(symbol === 'chip') sampleChip(pts, x, y, W, H, step);
        else if(symbol === 'loop') sampleLoop(pts, x, y, W, H, step);
        else if(symbol === 'flow') sampleFlow(pts, x, y, W, H, step);
        else if(symbol === 'pentagon') samplePentagon(pts, x, y, W, H, step);
        else sampleWireframe(pts, x, y, W, H, step);

        const out = resampleToCount(pts, count, rnd, 0.9);
        // Stable spatial ordering helps make symbol-to-symbol transitions feel smoother.
        out.sort((a,b) => (a.y - b.y) || (a.x - b.x));
        return out;
      }

      function buildBorderMeta(N, rect, seed){
        const rnd = mulberry32(seed);
        const meta = new Array(N);
        const band = Math.max(8, Math.min(rect.w, rect.h) * 0.05);
        for(let i=0;i<N;i++){
          const side = Math.floor(rnd()*4);
          const t = rnd();
          const n = rnd() * band;
          const osc = 0.6 + rnd()*1.2;
          const ph = rnd()*Math.PI*2;
          meta[i] = { side, t, n, osc, ph };
        }
        return meta;
      }
      function borderPoint(rect, m, time){
        const x0 = rect.x, y0 = rect.y, x1 = rect.x + rect.w, y1 = rect.y + rect.h;
        const drift = Math.sin(time*m.osc + m.ph) * 0.04;
        const tt = (m.t + drift + 1) % 1;
        if(m.side === 0) return { x: lerp(x0,x1,tt), y: y0 + m.n };
        if(m.side === 2) return { x: lerp(x0,x1,tt), y: y1 - m.n };
        if(m.side === 1) return { x: x1 - m.n, y: lerp(y0,y1,tt) };
        return { x: x0 + m.n, y: lerp(y0,y1,tt) };
      }

      class MorphParticles{
        constructor(canvas){
          this.canvas = canvas;
          this.ctx = canvas.getContext('2d', { alpha:true });
          this.seed = 4201;

          this._paused = false;
          this._running = false;
          this._raf = null;
          this._io = null;

          this.w=0; this.h=0; this.dpr=1;
          this.N=0;

          this.p = [];
          this.want = 0;
          this.morph = 0;

          this.morphIdx = [];
          this.slotByIndex = null;
          this.targets = [];
          this.targetsFrom = [];
          this.targetsTo = [];
          this.symbolT = 1;
          this.symbol = canvas.dataset.symbol || 'call';

          this.borderRect = null;
          this.borderMeta = [];

          this.start = performance.now();

          this._ro = new ResizeObserver(()=>this.resize());
          this._ro.observe(this.canvas);

          this.resize();
          this._setupViewportPause();
          if(!prefersReduce) this._ensureRunning();
          else this.render(performance.now(), true);
        }

        _ensureRunning(){
          if(this._running || this._paused || document.hidden) return;
          this._running = true;
          this._raf = requestAnimationFrame((t)=>this.draw(t));
        }

        setPaused(isPaused){
          const next = !!isPaused;
          if(this._paused === next) return;
          this._paused = next;
          if(!this._paused) this._ensureRunning();
        }

        _setupViewportPause(){
          if(!('IntersectionObserver' in window)) return;
          this._io = new IntersectionObserver((entries) => {
            const e = entries && entries[0];
            const isIn = !!(e && e.isIntersecting);
            this.setPaused(!isIn);
          }, { threshold: 0.01, rootMargin: '240px 0px 240px 0px' });
          this._io.observe(this.canvas);

          document.addEventListener('visibilitychange', () => {
            if(!document.hidden) this._ensureRunning();
          }, { passive: true });
        }

        pickN(w,h){
          const area = w*h;
          const n = Math.floor(area / 420);
          return Math.max(900, Math.min(1700, n));
        }

        buildIdle(){
          const rand = mulberry32(this.seed);
          const pts = [];
          for(let i=0;i<this.N;i++){
            pts.push({
              x: rand()*this.w,
              y: rand()*this.h,
              a0: 0.10 + 0.80*rand(),
              phase: rand()*Math.PI*2,
              f1: 0.55 + rand()*1.10,
              f2: 0.55 + rand()*1.10,
              jx: rand()*Math.PI*2,
              jy: rand()*Math.PI*2
            });
          }
          this.p = pts;
        }

        buildMorphSet(){
          const rand = mulberry32(this.seed + 77);
          const morphCount = Math.floor(this.N * 0.58);

          const idx = Array.from({length:this.N}, (_,i)=>i);
          for(let i=idx.length-1;i>0;i--){
            const j = Math.floor(rand()*(i+1));
            [idx[i], idx[j]] = [idx[j], idx[i]];
          }
          this.morphIdx = idx.slice(0, morphCount);

          this.targets = buildTargetForSymbol(this.symbol, morphCount, this.w, this.h, this.seed + 999);
          this.targetsFrom = this.targets;
          this.targetsTo = this.targets;
          this.symbolT = 1;

          const slot = new Int32Array(this.N);
          slot.fill(-1);
          for(let s=0;s<this.morphIdx.length;s++){
            slot[this.morphIdx[s]] = s;
          }
          this.slotByIndex = slot;

          const sectionId = this.canvas?.closest?.('section')?.id || '';
          const padRatio = (sectionId === 'ff-help') ? 0.035 : 0.06;
          const pad = Math.max(10, Math.min(this.w,this.h) * padRatio);
          this.borderRect = { x: pad, y: pad, w: this.w - pad*2, h: this.h - pad*2 };
          this.borderMeta = buildBorderMeta(this.N, this.borderRect, this.seed + 555);
        }

        resize(){
          const rect = this.canvas.getBoundingClientRect();
          this.w = Math.max(1, Math.floor(rect.width));
          this.h = Math.max(1, Math.floor(rect.height));
          this.dpr = Math.max(1, Math.min(1.35, window.devicePixelRatio || 1));

          this.canvas.width  = Math.floor(this.w * this.dpr);
          this.canvas.height = Math.floor(this.h * this.dpr);
          this.ctx.setTransform(this.dpr,0,0,this.dpr,0,0);

          this.N = this.pickN(this.w,this.h);
          this.buildIdle();
          this.buildMorphSet();
        }

        setHover(on){
          this.want = on ? 1 : 0;
          if(prefersReduce){
            // In reduced-motion we render a static frame, so keep morph in sync with "want".
            this.morph = this.want ? 1 : 0;
            this.render(performance.now(), true);
          }
        }

        setSymbol(symbol){
          if(!symbol) return;
          if(symbol === this.symbol && this.symbolT >= 0.999) return;

          const morphCount = this.morphIdx?.length || Math.floor(this.N * 0.58);

          const curFrom = this.targetsFrom && this.targetsFrom.length ? this.targetsFrom : this.targets;
          const curTo = this.targetsTo && this.targetsTo.length ? this.targetsTo : this.targets;
          const t = clamp01(this.symbolT || 0);
          const tE = easeInOut(t);
          const curTargets = (curFrom && curTo && curFrom.length === curTo.length)
            ? curFrom.map((p, i) => ({ x: lerp(p.x, curTo[i].x, tE), y: lerp(p.y, curTo[i].y, tE) }))
            : (this.targets || []);

          this.symbol = symbol;
          const nextTargets = buildTargetForSymbol(symbol, morphCount, this.w, this.h, this.seed + 999);

          this.targetsFrom = curTargets;
          this.targetsTo = nextTargets;
          this.targets = nextTargets;
          this.symbolT = 0;

          if(prefersReduce){
            this.symbolT = 1;
            this.targetsFrom = nextTargets;
            this.targetsTo = nextTargets;
            this.render(performance.now(), true);
          }
        }

        draw(now){
          if(prefersReduce) return;

          if(this._paused || document.hidden){
            this.start = now;
            this._running = false;
            return;
          }

          const inSpd  = 0.016;
          const outSpd = 0.015;
          const speed = this.want ? inSpd : outSpd;

          this.morph += (this.want - this.morph) * speed;
          this.morph = clamp01(this.morph);

          this.symbolT += (1 - this.symbolT) * 0.10;
          this.symbolT = clamp01(this.symbolT);

          this.render(now, false);
          this._raf = requestAnimationFrame((t)=>this.draw(t));
        }

        render(now, forceStill){
          const ctx = this.ctx;
          const scope = this.canvas.closest('section') || this.canvas;
          const rgbRaw = getComputedStyle(scope).getPropertyValue('--ffp-rgb').trim() || '10,20,120';
          ctx.clearRect(0,0,this.w,this.h);
          ctx.fillStyle = `rgb(${rgbRaw})`;

          const t = (now - this.start)/1000;

          const borderE = easeInOut(clamp01(this.morph * 1.55));
          const linesE  = easeInOut(Math.pow(this.morph, 1.65));
          const symE = easeInOut(clamp01(this.symbolT));

          const amp = forceStill ? 0 : 10.8;

          for(let i=0;i<this.N;i++){
            const p = this.p[i];

            const nx = forceStill ? 0 : Math.sin(t*p.f1 + p.jx) * amp;
            const ny = forceStill ? 0 : Math.cos(t*p.f2 + p.jy) * amp;

            const ix = p.x + nx;
            const iy = p.y + ny;

            const slot = this.slotByIndex[i];
            const isMorph = (slot !== -1);

            let x = ix, y = iy;

            if(isMorph){
              const from = this.targetsFrom?.[slot] || this.targets?.[slot];
              const to = this.targetsTo?.[slot] || this.targets?.[slot] || from;
              const tx = (from && to) ? lerp(from.x, to.x, symE) : (to ? to.x : ix);
              const ty = (from && to) ? lerp(from.y, to.y, symE) : (to ? to.y : iy);
              x = lerp(ix, tx, linesE);
              y = lerp(iy, ty, linesE);
            } else {
              const bp = borderPoint(this.borderRect, this.borderMeta[i], t);
              x = lerp(ix, bp.x, borderE);
              y = lerp(iy, bp.y, borderE);
            }

            const ripple = forceStill ? 0.5 : (0.5 + 0.5*Math.sin(t*0.85 + p.phase));
            const baseA = p.a0 * (0.62 + 0.38*ripple);

            const aMul = isMorph ? (0.92 + 0.22*linesE) : (1.0 - 0.34*borderE);
            const a = Math.min(1, Math.max(0, baseA * aMul));

            const sz = (forceStill ? 1.00 : (0.85 + 0.28*ripple)) * (isMorph ? (0.95 + 0.10*linesE) : 1.0);

            ctx.globalAlpha = a;
            ctx.beginPath();
            ctx.arc(x, y, sz, 0, Math.PI*2);
            ctx.fill();
          }

          ctx.globalAlpha = 1;
        }
      }

      // Expose so other sections can reuse the exact same particle engine.
      if(typeof window !== 'undefined' && !window.FFMorphParticles){
        window.FFMorphParticles = MorphParticles;
      }

      let pf = null;
      if(canvas){
        pf = new MorphParticles(canvas);

        const prefersHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
        if(prefersHover){
          card.addEventListener('mouseenter', () => pf.setHover(true));
          card.addEventListener('mouseleave', () => pf.setHover(false));
        } else {
          card.addEventListener('click', () => pf.setHover(!pf.want));
        }
      }

      function setActive(step){
        const s = STEPS[step];
        if(!s) return;
        currentStep = Number(step);

        cells.forEach(b => {
          const on = b.dataset.step === String(step);
          b.classList.toggle('is-active', on);
          b.setAttribute('aria-selected', on ? 'true' : 'false');
        });

        micro.textContent = s.micro;
        title.textContent = s.title;
        desc.textContent  = s.desc;
        bul.innerHTML = s.bullets.map(x => `<li>${escapeHtml(x)}</li>`).join('');

        canvas.dataset.symbol = s.symbol;
        if(pf) pf.setSymbol(s.symbol);
      }

      function go(delta){
        let next = currentStep + delta;
        if(next < 1) next = 7;
        if(next > 7) next = 1;
        setActive(next);
      }

      cells.forEach(btn => btn.addEventListener('click', () => setActive(btn.dataset.step)));
      if(prevBtn) prevBtn.addEventListener('click', () => go(-1));
      if(nextBtn) nextBtn.addEventListener('click', () => go(+1));

      card.addEventListener('keydown', (e) => {
        if(e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); }
        if(e.key === 'ArrowRight'){ e.preventDefault(); go(+1); }
      });

      setActive(1);
    })();

// ---- ff-help (obiettivo) ----

(() => {
      const root = document.getElementById('ff-help');
      if(!root) return;

      const tabs = Array.from(root.querySelectorAll('.ff-help__tab'));
      const panel = root.querySelector('#ff-help-panel');
       const overlineEl = root.querySelector('[data-ffh-overline]');
       const titleEl = root.querySelector('[data-ffh-title]');
       const copyEl = root.querySelector('[data-ffh-copy]');
       // microline removed in layout (kept for backwards compatibility)
       const microlineEl = root.querySelector('[data-ffh-microline]');

       const prevBtn = root.querySelector('[data-ffh-nav=\"prev\"]');
       const nextBtn = root.querySelector('[data-ffh-nav=\"next\"]');

       const canvas = root.querySelector('.ff-help__canvas');
       let pf = null;
       if(canvas){
         const MP = (typeof window !== 'undefined') ? window.FFMorphParticles : null;
         if(MP){
           pf = new MP(canvas);
           const card = root.querySelector('.ff-help__card') || root;
           const prefersHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
           if(prefersHover){
             card.addEventListener('mouseenter', () => pf.setHover(true));
             card.addEventListener('mouseleave', () => pf.setHover(false));
           } else {
             card.addEventListener('click', () => pf.setHover(!pf.want));
           }
           // Default: idle. The symbol forms only when hovering the card.
           pf.setHover(false);
           try{ pf.render(performance.now(), false); }catch(_e){}

           const isMobile = window.matchMedia && window.matchMedia('(max-width: 820px)').matches;
           if(isMobile && 'IntersectionObserver' in window){
             let triggered = false;
             const io = new IntersectionObserver((entries) => {
               entries.forEach((e) => {
                 if(triggered || !e.isIntersecting) return;
                 triggered = true;
                 pf.setHover(true);
                 try{ io.unobserve(e.target); }catch(_){}
               });
             }, { threshold: 0.01, rootMargin: '0px 0px -8% 0px' });
             io.observe(card);
           }
         }
       }
        const DATA = {
          authority: {
            overline: "COSTRUIRE AUTOREVOLEZZA",
            titleHtml: "<span class=\"hl-grad\">Fatti scegliere</span> al primo confronto",
            copy: "In pochi secondi devono capire chi sei, perché fidarsi e cosa fare.",
            symbol: "podium",
          },
          contacts: {
            overline: "GENERARE CONTATTI",
            titleHtml: "<span class=\"hl-grad\">Trasforma visite</span> in richieste",
            copy: "Tagliamo i dubbi e rendiamo il contatto inevitabile (WhatsApp, chiamata o form).",
            symbol: "funnel",
          },
          sales: {
            overline: "VENDERE ONLINE",
            titleHtml: "<span class=\"hl-grad\">Più ordini</span>, meno carrelli abbandonati",
            copy: "Catalogo e checkout progettati per comprare, non per navigare.",
            symbol: "bag",
          },
           process: {
             overline: "AUTOMATIZZARE PROCESSI",
             titleHtml: "<span class=\"hl-grad\">Meno manuale</span>, più tempo",
             copy: "Richieste e dati diventano flussi automatici: meno errori, più controllo.",
             symbol: "loop",
           },
         };

      const ORDER = ["authority","contacts","sales","process"];
      let activeKey = "authority";

       function setActive(key){
         const d = DATA[key];
         if(!d) return;
         activeKey = key;

         if(overlineEl) overlineEl.textContent = d.overline;
         if(titleEl) titleEl.innerHTML = d.titleHtml || "";
         if(copyEl) copyEl.textContent = d.copy;
         if(microlineEl) microlineEl.textContent = "";

         tabs.forEach((btn) => {
           const on = btn.dataset.key === key;
           btn.classList.toggle('is-active', on);
           btn.setAttribute('aria-selected', on ? 'true' : 'false');
          btn.tabIndex = on ? 0 : -1;
          if(on && panel && btn.id) panel.setAttribute('aria-labelledby', btn.id);
        });

        if(canvas){
          canvas.dataset.symbol = d.symbol;
          if(pf) pf.setSymbol(d.symbol);
        }
      }

      function go(delta){
        const idx = Math.max(0, ORDER.indexOf(activeKey));
        const next = ORDER[(idx + delta + ORDER.length) % ORDER.length];
        setActive(next);
        const el = tabs.find(t => t.dataset.key === next);
        if(el) el.focus();
      }

      tabs.forEach((btn) => {
        btn.addEventListener('click', () => setActive(btn.dataset.key));
        btn.addEventListener('keydown', (e) => {
          if(e.key === 'ArrowDown' || e.key === 'ArrowRight'){ e.preventDefault(); go(+1); }
          if(e.key === 'ArrowUp' || e.key === 'ArrowLeft'){ e.preventDefault(); go(-1); }
          if(e.key === 'Home'){ e.preventDefault(); setActive(ORDER[0]); }
          if(e.key === 'End'){ e.preventDefault(); setActive(ORDER[ORDER.length-1]); }
        });
      });

      if(prevBtn) prevBtn.addEventListener('click', () => go(-1));
      if(nextBtn) nextBtn.addEventListener('click', () => go(+1));

      setActive("authority");
    })();

// ---- ff-benefits (vantaggi) — particles in visuals ----

(() => {
  const root = document.getElementById('ff-benefits');
  if(!root) return;

  const MP = (typeof window !== 'undefined') ? window.FFMorphParticles : null;
  if(!MP) return;

  const prefersHover = window.matchMedia && window.matchMedia('(hover:hover)').matches;
  const visuals = Array.from(root.querySelectorAll('.ffb-visual'));

  // Center-band observer: when a visual enters the central area of the viewport,
  // we trigger the same "hover" morph animation even without the mouse.
  const canObserve = ('IntersectionObserver' in window);
  const io = canObserve ? new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const el = e.target;
      const st = el && el.__ffbState;
      if(!st) return;
      st.inBand = !!e.isIntersecting;
      st.sync();
    });
  }, {
    // This makes the observer "band" around the center of the viewport.
    root: null,
    rootMargin: '-40% 0px -40% 0px',
    threshold: 0.01,
  }) : null;

  visuals.forEach((visual) => {
    const canvas = visual.querySelector('canvas.ffb-canvas');
    if(!canvas) return;

    const pf = new MP(canvas);
    const sym = canvas.dataset.symbol || 'arch';
    pf.setSymbol(sym);

    // State machine: hover OR center-band triggers the morph.
    const state = {
      pf,
      inBand: false,
      hovering: false,
      sync(){
        this.pf.setHover(this.inBand || this.hovering);
      }
    };
    visual.__ffbState = state;

    if(prefersHover){
      visual.addEventListener('mouseenter', () => { state.hovering = true; state.sync(); });
      visual.addEventListener('mouseleave', () => { state.hovering = false; state.sync(); });
    }

    // Default: idle.
    state.pf.setHover(false);
    try{ pf.render(performance.now(), false); }catch(_e){}

    if(io) io.observe(visual);
  });
})();

// ---- ff-case-studies (trasformazioni reali) ----

(() => {
  const root = document.getElementById('ff-case-studies');
  if(!root) return;

  const prevBtn = root.querySelector('[data-ffcs-nav="prev"]');
  const nextBtn = root.querySelector('[data-ffcs-nav="next"]');

  const videoBefore = root.querySelector('[data-ffcs-video="before"]');
  const videoAfter = root.querySelector('[data-ffcs-video="after"]');
  const srcBefore = videoBefore && videoBefore.querySelector('source');
  const srcAfter = videoAfter && videoAfter.querySelector('source');
  const descBefore = root.querySelector('[data-ffcs-desc="before"]');
  const descAfter = root.querySelector('[data-ffcs-desc="after"]');
  const dots = Array.from(root.querySelectorAll('[data-ffcs-dot]'));
  const grid = root.querySelector('.ffcs2-grid');
  if(!grid) return;

  let inView = true;

  const DATA = {
    alc: {
      name: "ALC Lavorazioni",
      beforeVideo: "/assets/media/immagini/ALCPRIMA.webm",
      afterVideo: "/assets/media/immagini/ALC.webm",
      beforeText: "Presenza online poco curata, non all'altezza del valore dell’azienda e non aggiornata sui servizi erogati da ALC SRL.",
      afterText: "Esperienza digitale premium coerente con lo sviluppo aziendale e con un comunicazione chiara sui servizi di ALC SRL.",
    },
    supreme: {
      name: "Supreme Cars",
      beforeVideo: "/assets/media/immagini/SUPREMEPRIMA.webm",
      afterVideo: "/assets/media/immagini/Supreme.webm",
      beforeText: "Sito web datato, confuso, poco coinvolgente e penalizzante. Non comunicava il valore del brand e non guidava l’utente all’azione.",
      afterText: "Presenza online autorevole, valorizzazione aziendale e chiarezza sui servizi offerti con aggiunta di catalogo auto e gestionale per la pubblicazione anche su Autoscout24.",
    },
  };

  const ORDER = ["alc", "supreme"];
  let activeKey = "alc";

  const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let animating = false;
  let phaseTimer = null;
  const OUT_MS = 70;
  const IN_MS = 110;

  function setDots(idx){
    dots.forEach((el) => {
      const isActive = String(idx) === String(el.getAttribute('data-ffcs-dot') || '');
      el.classList.toggle('is-active', isActive);
    });
  }

  function playVideos(){
    if(!inView || document.hidden) return;
    try { videoBefore && videoBefore.play && videoBefore.play(); } catch(e) {}
    try { videoAfter && videoAfter.play && videoAfter.play(); } catch(e) {}
  }

  function pauseVideos(){
    try { videoBefore && videoBefore.pause && videoBefore.pause(); } catch(e) {}
    try { videoAfter && videoAfter.pause && videoAfter.pause(); } catch(e) {}
  }

  function setActive(key){
    const d = DATA[key];
    if(!d) return;
    activeKey = key;

    const idx = Math.max(0, ORDER.indexOf(activeKey));

    setDots(idx);

    if(srcBefore && d.beforeVideo){
      srcBefore.src = d.beforeVideo;
      if(videoBefore) videoBefore.load();
    }
    if(srcAfter && d.afterVideo){
      srcAfter.src = d.afterVideo;
      if(videoAfter) videoAfter.load();
    }

    if(descBefore) descBefore.textContent = d.beforeText || "";
    if(descAfter) descAfter.textContent = d.afterText || "";

    if(!prefersReduced){
      window.setTimeout(() => playVideos(), 60);
    }
  }

  function animateTo(key, dir){
    if(animating) return;
    animating = true;

    root.setAttribute('data-ffcs-dir', dir);

    if(prefersReduced){
      setActive(key);
      animating = false;
      return;
    }

    window.clearTimeout(phaseTimer);
    root.setAttribute('data-ffcs-phase', 'out');

    // Dissolvenza: fade-out -> swap -> fade-in
    phaseTimer = window.setTimeout(() => {
      setActive(key);

      root.setAttribute('data-ffcs-phase', 'in-pre');
      // force reflow
      void grid.offsetHeight;
      root.setAttribute('data-ffcs-phase', 'in');

      phaseTimer = window.setTimeout(() => {
        root.removeAttribute('data-ffcs-phase');
        animating = false;
      }, IN_MS);
    }, OUT_MS);
  }

  function go(delta){
    const idx = Math.max(0, ORDER.indexOf(activeKey));
    const next = ORDER[(idx + delta + ORDER.length) % ORDER.length];
    animateTo(next, delta > 0 ? 'next' : 'prev');
  }

  if(prevBtn) prevBtn.addEventListener('click', () => go(-1));
  if(nextBtn) nextBtn.addEventListener('click', () => go(+1));

  if('IntersectionObserver' in window){
    const io = new IntersectionObserver((entries) => {
      const e = entries && entries[0];
      const isIn = !!(e && e.isIntersecting);
      inView = isIn;
      if(inView) playVideos();
      else pauseVideos();
    }, { threshold: 0.12, rootMargin: '220px 0px 220px 0px' });
    io.observe(root);
  }

  document.addEventListener('visibilitychange', () => {
    if(document.hidden) pauseVideos();
    else playVideos();
  }, { passive: true });

  root.setAttribute('data-ffcs-dir', 'next');
  setActive(activeKey);
})();

// ---- section ----

(() => {
      const root = document.getElementById('ff-final');
      if(!root) return;

      const elPct = root.querySelector('[data-ff-read]');
      const elBar = root.querySelector('[data-ff-bar]');
      const elMsg = root.querySelector('[data-ff-msg]');

      function getReadPercent(){
        const doc = document.documentElement;
        const scrollTop = window.pageYOffset || doc.scrollTop || 0;
        const winH = window.innerHeight || 0;
        const full = Math.max(1, doc.scrollHeight);
        const pct = Math.round(((scrollTop + winH) / full) * 100);
        return Math.max(0, Math.min(100, pct));
      }

      function setUI(p){
        if(elPct) elPct.textContent = p + '%';
        if(elBar) elBar.style.width = p + '%';

        if(!elMsg) return;
        if(p >= 95){
          elMsg.innerHTML = 'Ok: <strong>sei arrivato in fondo</strong>. Ora facciamolo succedere anche sul tuo sito.';
        } else if(p >= 70){
          elMsg.textContent = 'Stai davvero seguendo: è esattamente il comportamento che vogliamo dai tuoi clienti.';
        } else {
          elMsg.textContent = 'Se stai leggendo questa riga, il sito sta facendo quello che deve.';
        }
      }

      let active = false;
      let raf = null;

      function tick(){
        if(!active) return;
        setUI(getReadPercent());
        raf = requestAnimationFrame(tick);
      }

      if('IntersectionObserver' in window){
        const io = new IntersectionObserver((entries) => {
          active = !!entries[0]?.isIntersecting;
          if(active){
            setUI(getReadPercent());
            if(!raf) raf = requestAnimationFrame(tick);
          } else {
            if(raf){ cancelAnimationFrame(raf); raf = null; }
          }
        }, { threshold: 0.22 });
        io.observe(root);
      } else {
        // fallback: aggiorna solo una volta
        setUI(getReadPercent());
      }
    })();

// ---- section ----

(() => {
      const root = document.getElementById('ff-faq');
      if(!root) return;
      const items = Array.from(root.querySelectorAll('.ff-faq__item'));
      items.forEach((d) => {
        d.addEventListener('toggle', () => {
          if(!d.open) return;
          items.forEach((other) => { if(other !== d) other.open = false; });
        });
      });
    })();

// ---- section ----

(function(){
      if (window.__FF_FOOTER_EASY_V3__) return;
      window.__FF_FOOTER_EASY_V3__ = true;

      const surface = document.getElementById("ffeSurface");
      const bg = surface && surface.querySelector(".ffe-bg");
      const clipPath = document.getElementById("ffeClipPath");
      const area = document.getElementById("ffeArea");
      const magnet = document.getElementById("ffeMagnet");
      const canvas = document.getElementById("ffeCanvas");
      const clockEl = document.getElementById("ffeClock");
      const yearEl = document.getElementById("ffeYear");

      if (yearEl) yearEl.textContent = String(new Date().getFullYear());

      function updateClock(){
        if (!clockEl) return;
        try{
          const now = new Date();
          const opts = { hour:"2-digit", minute:"2-digit", hour12:false, timeZone:"Europe/Rome" };
          clockEl.textContent = now.toLocaleTimeString("it-IT", opts);
        }catch(e){ clockEl.textContent = ""; }
      }
      updateClock();
      setInterval(updateClock, 30000);

      if(!surface || !bg || !clipPath) return;

      const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const clamp = (v,a,b)=> Math.max(a, Math.min(b, v));

      let W=0, H=0;
      let edgeMax=72, liftMax=120;

      let targetP = 0;
      let curP = 0;

      function setClip(p){
        const t = clamp(p, 0, 1);
        const edge = edgeMax * t;
        const cpY  = edge - (liftMax * t);

        const d =
          "M0 " + edge +
          " Q " + (W/2) + " " + cpY + " " + W + " " + edge +
          " L " + W + " " + H +
          " L 0 " + H +
          " Z";
        clipPath.setAttribute("d", d);
      }

      function measure(){
        const r = surface.getBoundingClientRect();
        W = Math.max(1, Math.floor(r.width));
        H = Math.max(1, Math.floor(r.height));

        /* âœ… FIX ANIMAZIONE: non dipende solo da H (se H cambia, la curva non â€œsi rimpicciolisceâ€) */
        const basis = Math.max(H, Math.floor((window.innerHeight || 800) * 0.78));

        edgeMax = clamp(Math.round(basis * 0.12), 44, 92);
        liftMax = clamp(Math.round(edgeMax * 1.70), 90, 180);

        setClip(curP);
      }

      function computeTarget(){
        const rect = surface.getBoundingClientRect();
        const vh = window.innerHeight || 800;

        const start = vh * 0.92;
        const end   = vh * 0.44;

        let p = (start - rect.top) / (start - end);
        p = clamp(p, 0, 1);

        const dead = 0.32;
        if (p < dead) p = 0;
        else p = (p - dead) / (1 - dead);

        targetP = reduce ? 1 : p;
      }

      function curveLoop(){
        computeTarget();
        const k = 0.075;
        curP += (targetP - curP) * k;
        setClip(curP);

        if (!reduce) requestAnimationFrame(curveLoop);
      }

      window.addEventListener("resize", measure, { passive:true });
      window.addEventListener("load", measure);
      setTimeout(measure, 60);
      measure();
      if (!reduce) requestAnimationFrame(curveLoop);
      else setClip(1);

      // magnetismo logo
      if (area && magnet && !reduce && window.matchMedia("(hover:hover)").matches){
        let tx=0, ty=0, targetX=0, targetY=0, mraf=0;
        const lerp = (a,b,t)=> a + (b-a)*t;

        function mtick(){
          mraf = 0;
          tx = lerp(tx, targetX, 0.11);
          ty = lerp(ty, targetY, 0.11);
          magnet.style.setProperty("--mx", tx.toFixed(2) + "px");
          magnet.style.setProperty("--my", ty.toFixed(2) + "px");

          if (Math.abs(tx-targetX) > 0.05 || Math.abs(ty-targetY) > 0.05){
            mraf = requestAnimationFrame(mtick);
          }
        }

        area.addEventListener("mousemove", (e)=>{
          const r = area.getBoundingClientRect();
          const nx = ((e.clientX - r.left) / r.width) - 0.5;
          const ny = ((e.clientY - r.top)  / r.height) - 0.5;

          const strength = 12;
          targetX = nx * strength;
          targetY = ny * strength;

          if (!mraf) mraf = requestAnimationFrame(mtick);
        });

        area.addEventListener("mouseleave", ()=>{
          targetX = 0; targetY = 0;
          if (!mraf) mraf = requestAnimationFrame(mtick);
        });
      }

      // particelle (uguale al tuo)
      (function(){
        if(!canvas || !bg) return;
        const ctx = canvas.getContext("2d", { alpha:true });
        const host = bg;

        const SETTINGS = {
          seed: 200,
          PER_RING: 36,
          INNER_RINGS: 10,
          OUTER_RINGS: 38,
          ringJitter: 0.22,
          particleSize: 1.75,
          minAlpha: 0.10,
          maxAlpha: 0.46,
          color: [10, 20, 120],
          baseRadiusRatio: 0.44,
          innerSpanRatio: 0.14,
          outerSpanRatio: 0.60,
          periodMs: 6200,
          breathPeriodMs: 5600,
          breathAmpRatio: 0.060,
          centerYRatio: 0.26,
          alphaTopBoost: 0.70
        };

        function mulberry32(a){
          return function(){
            let t = a += 0x6D2B79F5;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          }
        }
        const clamp01 = (x)=> Math.max(0, Math.min(1, x));

        let rand = mulberry32(SETTINGS.seed);
        let points = [];
        let w=0,h=0,dpr=1;
        let start = performance.now();

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
          canvas.style.width = w + "px";
          canvas.style.height = h + "px";
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

          buildPoints();
        }

        new ResizeObserver(resize).observe(host);

        function draw(now){
          if (!w || !h) resize();
          if (document.hidden){ start = now; requestAnimationFrame(draw); return; }

          const tR = (now - start) / SETTINGS.periodMs;
          const tickR = tR % 1;

          const tB = (now - start) / SETTINGS.breathPeriodMs;
          const tickB = tB % 1;
          const sB = (Math.sin(tickB * Math.PI * 2 - Math.PI / 2) + 1) / 2;

          const cx = w * 0.5;
          const cy = h * SETTINGS.centerYRatio;
          const maxDim = Math.max(w, h);
          const breath = (sB - 0.5) * (maxDim * SETTINGS.breathAmpRatio);

          ctx.clearRect(0, 0, w, h);
          ctx.fillStyle = `rgb(${SETTINGS.color[0]},${SETTINGS.color[1]},${SETTINGS.color[2]})`;

          for (let i = 0; i < points.length; i++){
            const p = points[i];
            const rr = p.r + breath;

            const ripple = 0.5 + 0.5 * Math.sin((tickR * Math.PI * 2) + p.phase);

            const x = cx + p.c * rr;
            const y = cy + p.s * rr;

            const yN = clamp01(1 - (y / Math.max(1, h)));
            const topBoost = 1 + (yN * SETTINGS.alphaTopBoost);

            const alpha = clamp01(p.a0 * (0.55 + 0.65 * ripple) * topBoost);
            const sz = SETTINGS.particleSize * (0.90 + 0.25 * ripple);

            ctx.globalAlpha = alpha;
            ctx.beginPath();
            ctx.arc(x, y, sz, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1;

          if (!reduce) requestAnimationFrame(draw);
        }

        document.addEventListener("visibilitychange", () => {
          if (!document.hidden) start = performance.now();
        });

        resize();
        if (reduce) draw(performance.now());
        else requestAnimationFrame(draw);
      })();
    })();
