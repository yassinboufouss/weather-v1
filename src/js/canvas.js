
const WeatherCanvas = (() => {
  const canvas  = document.getElementById('weatherCanvas');
  const ctx     = canvas.getContext('2d');
  let particles = [];
  let animId    = null;
  let mode      = 'none';   // 'rain' | 'snow' | 'stars' | 'none'

  // ── Resize canvas to fill window ─────────────────────────────
  function _resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  window.addEventListener('resize', _resize);
  _resize();

  // ── Particle factories ───────────────────────────────────────

  function _makeRaindrop() {
    return {
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height - canvas.height,
      len:   Math.random() * 15 + 8,
      speed: Math.random() * 8 + 10,
      alpha: Math.random() * 0.35 + 0.1,
    };
  }

  function _makeSnowflake() {
    return {
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height - canvas.height,
      r:       Math.random() * 3 + 1,
      speed:   Math.random() * 1.5 + 0.5,
      drift:   Math.random() * 0.8 - 0.4,
      alpha:   Math.random() * 0.5 + 0.2,
      phase:   Math.random() * Math.PI * 2,
    };
  }

  function _makeStar() {
    return {
      x:       Math.random() * canvas.width,
      y:       Math.random() * canvas.height,
      r:       Math.random() * 1.2 + 0.3,
      alpha:   Math.random() * 0.5 + 0.1,
      twinkle: Math.random() * 0.02 + 0.005,
      dir:     Math.random() > 0.5 ? 1 : -1,
    };
  }

  // ── Initialise particle pool ─────────────────────────────────

  function _initParticles(type, count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      if (type === 'rain')  particles.push(_makeRaindrop());
      if (type === 'snow')  particles.push(_makeSnowflake());
      if (type === 'stars') particles.push(_makeStar());
    }
  }

  // ── Draw loops ───────────────────────────────────────────────

  function _drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(174, 214, 241, 1)';
    ctx.lineWidth = 1;

    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 1, p.y + p.len);
      ctx.stroke();

      p.y += p.speed;
      if (p.y > canvas.height) { p.y = -p.len; p.x = Math.random() * canvas.width; }
    }
    ctx.globalAlpha = 1;
  }

  function _drawSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ddeeff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      p.y     += p.speed;
      p.x     += p.drift + Math.sin(p.phase) * 0.4;
      p.phase += 0.03;

      if (p.y > canvas.height) { Object.assign(p, _makeSnowflake()); p.y = -5; }
    }
    ctx.globalAlpha = 1;
  }

  function _drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const p of particles) {
      p.alpha += p.twinkle * p.dir;
      if (p.alpha >= 0.65 || p.alpha <= 0.05) p.dir *= -1;

      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Animation loop ───────────────────────────────────────────

  function _loop() {
    if (mode === 'rain')  _drawRain();
    else if (mode === 'snow')  _drawSnow();
    else if (mode === 'stars') _drawStars();
    else ctx.clearRect(0, 0, canvas.width, canvas.height);

    animId = requestAnimationFrame(_loop);
  }

  // ── Public API ───────────────────────────────────────────────

  /**
   * Switch the ambient weather effect.
   * @param {string} condition  OWM main condition string
   */
  function setCondition(condition) {
    const cond = condition?.toLowerCase() || '';

    let newMode = 'none';
    let count   = 0;

    if (['thunderstorm', 'drizzle', 'rain', 'squall'].some(c => cond.includes(c))) {
      newMode = 'rain'; count = 120;
    } else if (['snow', 'sleet'].some(c => cond.includes(c))) {
      newMode = 'snow'; count = 80;
    } else if (cond === 'clear') {
      newMode = 'stars'; count = 100;
    }

    if (newMode === mode) return; // No change needed
    mode = newMode;
    _initParticles(mode, count);
  }

  /** Stop rendering and clear canvas. */
  function stop() {
    if (animId) { cancelAnimationFrame(animId); animId = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    mode = 'none';
  }

  // Start loop immediately
  _loop();

  return { setCondition, stop };
})();
