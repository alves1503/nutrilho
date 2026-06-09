(function () {
  'use strict';

  /* ── Tema ────────────────────────────────── */
  const html      = document.documentElement;
  const themeBtn  = document.getElementById('themeBtn');
  const themeIcon = document.getElementById('themeIcon');

  function setTheme(dark) {
    html.classList.toggle('dark', dark);
    themeIcon.className = dark ? 'ph ph-moon' : 'ph ph-sun-dim';
    try { localStorage.setItem('nutrilho-theme', dark ? 'dark' : 'light'); } catch (_) {}
  }

  (function initTheme() {
    let saved = null;
    try { saved = localStorage.getItem('nutrilho-theme'); } catch (_) {}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved ? saved === 'dark' : prefersDark);
  })();

  themeBtn.addEventListener('click', function () {
    setTheme(!html.classList.contains('dark'));
    if (window.gsap) {
      gsap.fromTo(themeBtn, { rotation: 0 }, { rotation: 360, duration: 0.45, ease: 'back.out(1.4)' });
    }
  });

  /* ── Canvas background (mesmo do link bio) ─ */
  const canvas = document.getElementById('bg');
  const ctx    = canvas.getContext('2d');
  let W, H;

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', function () { resize(); buildParticles(); });

  const pointer = { x: W / 2, y: H / 2 };
  const smooth  = { x: W / 2, y: H / 2 };

  window.addEventListener('mousemove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; });
  window.addEventListener('touchmove', function (e) {
    if (e.touches.length) { pointer.x = e.touches[0].clientX; pointer.y = e.touches[0].clientY; }
  }, { passive: true });

  function Particle(layer) { this.layer = layer; this.spawn(true); }

  Particle.prototype.spawn = function (anywhere) {
    var l = this.layer;
    this.x = Math.random() * W;
    this.y = anywhere ? Math.random() * H : H + 16;
    this.vx = (Math.random() - 0.5) * (0.2 + l * 0.2);
    this.vy = -(0.12 + Math.random() * 0.25 + l * 0.15);
    if (l === 0) { this.r = Math.random() * 1.2 + 0.4;  this.a = Math.random() * 0.2  + 0.06; }
    if (l === 1) { this.r = Math.random() * 2.0 + 1.0;  this.a = Math.random() * 0.3  + 0.10; }
    if (l === 2) { this.r = Math.random() * 3.5 + 2.0;  this.a = Math.random() * 0.18 + 0.05; }
    this.phase = Math.random() * Math.PI * 2;
    this.freq  = 0.004 + Math.random() * 0.006;
  };

  Particle.prototype.update = function (t) {
    var dx = smooth.x - this.x, dy = smooth.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    var zone = 160 + this.layer * 60;
    if (dist < zone) {
      var f = (zone - dist) / zone;
      var pull = this.layer === 2 ? 0.03 : 0.055;
      this.vx += (dx / dist) * f * pull;
      this.vy += (dy / dist) * f * pull;
    }
    this.vx *= 0.965 + this.layer * 0.008;
    this.vy *= 0.965 + this.layer * 0.008;
    if (this.vy > -0.04) this.vy = -0.04;
    this.x += this.vx;
    this.y += this.vy;
    this.currentA = this.a * (0.7 + 0.3 * Math.sin(t * this.freq + this.phase));
    if (this.x < -20 || this.x > W + 20 || this.y < -20) this.spawn(false);
  };

  Particle.prototype.draw = function (dark) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = (dark ? 'rgba(59,165,92,' : 'rgba(45,126,74,') + this.currentA + ')';
    ctx.fill();
  };

  var particles = [];
  function buildParticles() {
    var mob = window.innerWidth < 640;
    var counts = mob ? [14, 8, 4] : [28, 14, 6];
    particles = [];
    for (var l = 0; l < 3; l++)
      for (var i = 0; i < counts[l]; i++)
        particles.push(new Particle(l));
  }
  buildParticles();

  function drawConnections(dark) {
    var MAX = 90;
    var pool = particles.filter(function (p) { return p.layer === 1; });
    for (var i = 0; i < pool.length; i++) {
      for (var j = i + 1; j < pool.length; j++) {
        var dx = pool[i].x - pool[j].x, dy = pool[i].y - pool[j].y;
        var d  = Math.sqrt(dx * dx + dy * dy);
        if (d < MAX) {
          ctx.beginPath();
          ctx.moveTo(pool[i].x, pool[i].y);
          ctx.lineTo(pool[j].x, pool[j].y);
          ctx.strokeStyle = (dark ? 'rgba(59,165,92,' : 'rgba(45,126,74,') + ((1 - d / MAX) * 0.1) + ')';
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }
    }
  }

  var ringScale = 0;
  var lastPtr = { x: pointer.x, y: pointer.y };

  function drawOrb(dark) {
    var inner = ctx.createRadialGradient(smooth.x, smooth.y, 0, smooth.x, smooth.y, 180);
    inner.addColorStop(0, dark ? 'rgba(59,165,92,0.14)' : 'rgba(45,126,74,0.10)');
    inner.addColorStop(1, 'transparent');
    ctx.fillStyle = inner;
    ctx.fillRect(smooth.x - 180, smooth.y - 180, 360, 360);

    var outer = ctx.createRadialGradient(smooth.x, smooth.y, 180, smooth.x, smooth.y, 340);
    outer.addColorStop(0, dark ? 'rgba(45,126,74,0.05)' : 'rgba(45,126,74,0.04)');
    outer.addColorStop(1, 'transparent');
    ctx.fillStyle = outer;
    ctx.fillRect(smooth.x - 340, smooth.y - 340, 680, 680);
  }

  var t = 0;
  function drawFrame() {
    t++;
    var dark = html.classList.contains('dark');
    smooth.x += (pointer.x - smooth.x) * 0.07;
    smooth.y += (pointer.y - smooth.y) * 0.07;

    var bg = ctx.createLinearGradient(0, 0, W, H);
    if (dark) {
      bg.addColorStop(0, '#0a1309'); bg.addColorStop(0.5, '#0e1a11'); bg.addColorStop(1, '#0a1309');
    } else {
      bg.addColorStop(0, '#f5faf7'); bg.addColorStop(0.5, '#edf7f1'); bg.addColorStop(1, '#f5faf7');
    }
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    drawOrb(dark);
    drawConnections(dark);

    for (var j = 0; j < particles.length; j++) {
      particles[j].update(t);
      particles[j].draw(dark);
    }

    /* anel cursor */
    var moved = Math.hypot(pointer.x - lastPtr.x, pointer.y - lastPtr.y) > 1;
    if (moved) { ringScale = Math.min(ringScale + 0.08, 1); lastPtr.x = pointer.x; lastPtr.y = pointer.y; }
    else ringScale *= 0.93;

    if (ringScale > 0.01) {
      var rad = 22 * (1 + 0.15 * Math.sin(t * 0.05)) * ringScale;
      var al  = 0.35 * ringScale;
      ctx.beginPath();
      ctx.arc(smooth.x, smooth.y, rad, 0, Math.PI * 2);
      ctx.strokeStyle = (dark ? 'rgba(59,165,92,' : 'rgba(45,126,74,') + al + ')';
      ctx.lineWidth = 1.5; ctx.stroke();
      ctx.beginPath();
      ctx.arc(smooth.x, smooth.y, rad * 2.2, 0, Math.PI * 2);
      ctx.strokeStyle = (dark ? 'rgba(59,165,92,' : 'rgba(45,126,74,') + (al * 0.3) + ')';
      ctx.lineWidth = 0.8; ctx.stroke();
    }

    requestAnimationFrame(drawFrame);
  }
  drawFrame();

  /* ── Copiar código ───────────────────────── */
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-code');
      navigator.clipboard.writeText(text).then(function () {
        btn.classList.add('copied');
        btn.querySelector('span').textContent = 'Copiado!';
        btn.querySelector('i').className = 'ph ph-check';
        setTimeout(function () {
          btn.classList.remove('copied');
          btn.querySelector('span').textContent = 'Copiar';
          btn.querySelector('i').className = 'ph ph-copy';
        }, 2000);
      });
    });
  });

  /* ── Animações de entrada (GSAP + scroll) ── */
  if (window.gsap) {

    /* Hero */
    gsap.from('.hero > *', {
      opacity: 0, y: -16, duration: 0.65,
      ease: 'power3.out', stagger: 0.1, delay: 0.1
    });

    /* Steps com IntersectionObserver */
    var steps = document.querySelectorAll('.step');

    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          gsap.to(entry.target, {
            opacity: 1, y: 0, duration: 0.55,
            ease: 'power2.out'
          });
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    steps.forEach(function (s) { obs.observe(s); });
  }

})();