(function () {
  'use strict';

  /* ── Aguarda DOM ─────────────────────────── */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* ═══════════════════════════════════════════
     TEMA CLARO / ESCURO
  ═══════════════════════════════════════════ */
  const html      = document.documentElement;
  const themeBtn  = document.getElementById('themeBtn');
  const themeIcon = document.getElementById('themeIcon');

  function setTheme(dark) {
    html.classList.toggle('dark', dark);
    themeIcon.className = dark ? 'ph ph-moon' : 'ph ph-sun-dim';
    try { localStorage.setItem('nutrilho-theme', dark ? 'dark' : 'light'); } catch (_) {}
  }

  /* Inicializa tema: salvo → sistema → light */
  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('nutrilho-theme'); } catch (_) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved ? saved === 'dark' : prefersDark);
  })();

  themeBtn.addEventListener('click', function () {
    const nowDark = !html.classList.contains('dark');
    setTheme(nowDark);

    /* Rotaciona o botão via GSAP, se disponível */
    if (window.gsap) {
      gsap.fromTo(themeBtn, { rotation: 0 }, {
        rotation: 360,
        duration: 0.45,
        ease: 'back.out(1.4)'
      });
    }
  });

  /* ═══════════════════════════════════════════
     CANVAS — BACKGROUND ANIMADO
  ═══════════════════════════════════════════ */
  const canvas = document.getElementById('bg');
  const ctx    = canvas.getContext('2d');

  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  resize();
  window.addEventListener('resize', function () { resize(); buildParticles(); });

  /* ── Ponteiro com interpolação suave (lerp) ── */
  const pointer = { x: W / 2, y: H / 2 };
  const smooth  = { x: W / 2, y: H / 2 }; // posição interpolada

  window.addEventListener('mousemove', function (e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  });

  window.addEventListener('touchmove', function (e) {
    if (e.touches.length) {
      pointer.x = e.touches[0].clientX;
      pointer.y = e.touches[0].clientY;
    }
  }, { passive: true });

  /* ── Partícula ──────────────────────────── */
  function Particle(layer) {
    /* layer 0 = pequena/lenta, layer 1 = média, layer 2 = grande/destaque */
    this.layer = layer;
    this.spawn(true);
  }

  Particle.prototype.spawn = function (anywhere) {
    var l = this.layer;
    this.x  = Math.random() * W;
    this.y  = anywhere ? Math.random() * H : H + 16;

    /* Velocidade base cresce com a camada */
    this.vx  = (Math.random() - 0.5) * (0.2 + l * 0.2);
    this.vy  = -(0.12 + Math.random() * 0.25 + l * 0.15);
    this.svx = this.vx;
    this.svy = this.vy;

    /* Tamanho e opacidade por camada */
    if (l === 0) { this.r = Math.random() * 1.2 + 0.4;  this.a = Math.random() * 0.2 + 0.06; }
    if (l === 1) { this.r = Math.random() * 2.0 + 1.0;  this.a = Math.random() * 0.3 + 0.10; }
    if (l === 2) { this.r = Math.random() * 3.5 + 2.0;  this.a = Math.random() * 0.18 + 0.05; }

    /* Pulso individual */
    this.phase = Math.random() * Math.PI * 2;
    this.freq  = 0.004 + Math.random() * 0.006;
  };

  Particle.prototype.update = function (t) {
    var dx   = smooth.x - this.x;
    var dy   = smooth.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;

    /* Zona de influência maior para camadas maiores */
    var zone = 160 + this.layer * 60;

    if (dist < zone) {
      var f    = (zone - dist) / zone;
      var pull = this.layer === 2 ? 0.03 : 0.055; /* grandes resistem mais */
      this.vx += (dx / dist) * f * pull;
      this.vy += (dy / dist) * f * pull;
    }

    /* Friction diferenciada — camadas grandes são mais "pesadas" */
    var friction = 0.965 + this.layer * 0.008;
    this.vx *= friction;
    this.vy *= friction;

    /* Velocidade vertical mínima */
    if (this.vy > -0.04) this.vy = -0.04;

    this.x += this.vx;
    this.y += this.vy;

    /* Pulso de opacidade */
    this.currentA = this.a * (0.7 + 0.3 * Math.sin(t * this.freq + this.phase));

    if (this.x < -20 || this.x > W + 20 || this.y < -20) {
      this.spawn(false);
    }
  };

  Particle.prototype.draw = function (dark) {
    var cr = dark ? '59,165,92' : '45,126,74';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(' + cr + ',' + this.currentA + ')';
    ctx.fill();
  };

  /* ── Construção das partículas por camada ── */
  var particles = [];

  function buildParticles() {
    var isMobile = window.innerWidth < 640;
    var counts   = isMobile ? [18, 10, 5] : [35, 20, 8];
    particles    = [];
    for (var l = 0; l < 3; l++) {
      for (var i = 0; i < counts[l]; i++) {
        particles.push(new Particle(l));
      }
    }
  }

  buildParticles();

  /* ── Conexões entre partículas próximas ─── */
  function drawConnections(dark) {
    var MAX_DIST = 90;
    /* Só conecta partículas da camada 1 para não sobrecarregar */
    var pool = particles.filter(function (p) { return p.layer === 1; });

    for (var i = 0; i < pool.length; i++) {
      for (var j = i + 1; j < pool.length; j++) {
        var dx   = pool[i].x - pool[j].x;
        var dy   = pool[i].y - pool[j].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          var alpha = (1 - dist / MAX_DIST) * 0.12;
          ctx.beginPath();
          ctx.moveTo(pool[i].x, pool[i].y);
          ctx.lineTo(pool[j].x, pool[j].y);
          ctx.strokeStyle = dark
            ? 'rgba(59,165,92,' + alpha + ')'
            : 'rgba(45,126,74,' + alpha + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  /* ── Orbe que segue o cursor ─────────────── */
  function drawOrb(dark) {
    var r1 = 160, r2 = 320;

    /* Orbe interno — mais brilhante */
    var inner = ctx.createRadialGradient(smooth.x, smooth.y, 0, smooth.x, smooth.y, r1);
    inner.addColorStop(0,   dark ? 'rgba(59,165,92,0.18)' : 'rgba(45,126,74,0.13)');
    inner.addColorStop(1,   'transparent');
    ctx.fillStyle = inner;
    ctx.fillRect(smooth.x - r1, smooth.y - r1, r1 * 2, r1 * 2);

    /* Halo externo — suave */
    var outer = ctx.createRadialGradient(smooth.x, smooth.y, r1, smooth.x, smooth.y, r2);
    outer.addColorStop(0,   dark ? 'rgba(45,126,74,0.07)' : 'rgba(45,126,74,0.05)');
    outer.addColorStop(1,   'transparent');
    ctx.fillStyle = outer;
    ctx.fillRect(smooth.x - r2, smooth.y - r2, r2 * 2, r2 * 2);
  }

  /* ── Anel pulsante no cursor ─────────────── */
  var ringScale = 0;
  var lastPointer = { x: pointer.x, y: pointer.y };

  function drawRing(dark, t) {
    var moved = Math.hypot(pointer.x - lastPointer.x, pointer.y - lastPointer.y) > 1;
    if (moved) {
      ringScale = Math.min(ringScale + 0.08, 1);
      lastPointer.x = pointer.x;
      lastPointer.y = pointer.y;
    } else {
      ringScale *= 0.93;
    }

    if (ringScale < 0.01) return;

    var pulse = 1 + 0.15 * Math.sin(t * 0.05);
    var rad   = 22 * pulse * ringScale;
    var alpha = 0.35 * ringScale;

    ctx.beginPath();
    ctx.arc(smooth.x, smooth.y, rad, 0, Math.PI * 2);
    ctx.strokeStyle = dark
      ? 'rgba(59,165,92,' + alpha + ')'
      : 'rgba(45,126,74,' + alpha + ')';
    ctx.lineWidth = 1.5;
    ctx.stroke();

 
    ctx.beginPath();
    ctx.arc(smooth.x, smooth.y, rad * 2.2, 0, Math.PI * 2);
    ctx.strokeStyle = dark
      ? 'rgba(59,165,92,' + (alpha * 0.35) + ')'
      : 'rgba(45,126,74,' + (alpha * 0.35) + ')';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }

  /* ── Loop principal ──────────────────────── */
  var t = 0;

  function drawFrame() {
    t++;
    var dark = html.classList.contains('dark');

 
    smooth.x += (pointer.x - smooth.x) * 0.07;
    smooth.y += (pointer.y - smooth.y) * 0.07;

    /* Fundo */
    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (dark) {
      bg.addColorStop(0,   '#0a1309');
      bg.addColorStop(0.5, '#0e1a11');
      bg.addColorStop(1,   '#0a1309');
    } else {
      bg.addColorStop(0,   '#f5faf7');
      bg.addColorStop(0.5, '#edf7f1');
      bg.addColorStop(1,   '#f5faf7');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);


    drawOrb(dark);


    drawConnections(dark);


    for (var j = 0; j < particles.length; j++) {
      particles[j].update(t);
      particles[j].draw(dark);
    }

  
    drawRing(dark, t);

    requestAnimationFrame(drawFrame);
  }

  drawFrame();

  /* ═══════════════════════════════════════════
     ANIMAÇÕES DE ENTRADA — GSAP
  ═══════════════════════════════════════════ */
  ready(function () {
    if (!window.gsap) return;


    gsap.from('.profile', {
      opacity: 0,
      y: -18,
      duration: 0.75,
      ease: 'power3.out',
      delay: 0.1
    });

    gsap.from('.link-card', {
      opacity: 0,
      y: 16,
      duration: 0.5,
      ease: 'power2.out',
      stagger: 0.1,
      delay: 0.3
    });


    gsap.from('.social-btn', {
      opacity: 0,
      scale: 0.7,
      duration: 0.42,
      ease: 'back.out(1.7)',
      stagger: 0.07,
      delay: 0.55
    });

    /* Footer */
    gsap.from('footer', {
      opacity: 0,
      duration: 0.5,
      delay: 0.8
    });
  });

})();