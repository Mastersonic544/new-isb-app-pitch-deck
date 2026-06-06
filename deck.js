/* ===================================================================
   ISB Pitch Deck — motion engine
   - mouse parallax + device tilt (respects reduced-motion)
   - number count-ups on slide entry
   - old -> new "morph" cross-dissolve
   Driven by deck-stage's [data-deck-active] + 'slidechange' event.
   =================================================================== */
(function () {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- pointer parallax ---------- */
  let nx = 0, ny = 0, rafQueued = false;
  function applyParallax() {
    rafQueued = false;
    const active = document.querySelector('section[data-deck-active]');
    if (!active) return;
    active.querySelectorAll('[data-depth]').forEach((el) => {
      const d = parseFloat(el.getAttribute('data-depth')) || 0;
      el.style.setProperty('--px', (nx * d).toFixed(2) + 'px');
      el.style.setProperty('--py', (ny * d).toFixed(2) + 'px');
    });
    active.querySelectorAll('[data-tilt]').forEach((el) => {
      const t = parseFloat(el.getAttribute('data-tilt')) || 6;
      el.style.transform = `perspective(1400px) rotateY(${(nx * t).toFixed(2)}deg) rotateX(${(-ny * t).toFixed(2)}deg)`;
    });
  }
  if (!reduce) {
    window.addEventListener('pointermove', (e) => {
      nx = (e.clientX / window.innerWidth - 0.5) * 2;   // -1..1
      ny = (e.clientY / window.innerHeight - 0.5) * 2;
      if (!rafQueued) { rafQueued = true; requestAnimationFrame(applyParallax); }
    }, { passive: true });
  }

  /* ---------- number count-ups ---------- */
  function countUp(el) {
    const to = parseFloat(el.getAttribute('data-to'));
    if (isNaN(to)) return;
    const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    const prefix = el.getAttribute('data-prefix') || '';
    const suffix = el.getAttribute('data-suffix') || '';
    if (reduce) { el.textContent = prefix + to.toFixed(dec) + suffix; return; }
    const dur = 1150, start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      el.textContent = prefix + (to * e).toFixed(dec) + suffix;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = prefix + to.toFixed(dec) + suffix;
    }
    requestAnimationFrame(frame);
  }

  /* ---------- old->new morph ---------- */
  const morphTimers = new WeakMap();
  function startMorph(container) {
    stopMorph(container);
    const interval = parseInt(container.getAttribute('data-morph-interval') || '2600', 10);
    const t = setInterval(() => container.classList.toggle('is-new'), interval);
    morphTimers.set(container, t);
  }
  function stopMorph(container) {
    const t = morphTimers.get(container);
    if (t) { clearInterval(t); morphTimers.delete(container); }
  }
  document.addEventListener('click', (e) => {
    const m = e.target.closest('[data-morph]');
    if (m) { m.classList.toggle('is-new'); startMorph(m); }
  });

  /* ---------- per-slide activation ---------- */
  function activate(slide) {
    if (!slide) return;
    // reset then run count-ups
    slide.querySelectorAll('.countup').forEach((el) => {
      const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
      el.textContent = (el.getAttribute('data-prefix') || '') + (0).toFixed(dec) + (el.getAttribute('data-suffix') || '');
    });
    // small delay so the rise animation and numbers feel orchestrated
    setTimeout(() => slide.querySelectorAll('.countup').forEach(countUp), 240);
    // morph autoplay
    document.querySelectorAll('[data-morph]').forEach(stopMorph);
    slide.querySelectorAll('[data-morph]').forEach((m) => { m.classList.remove('is-new'); startMorph(m); });
    applyParallax();
  }

  function init() {
    const stage = document.querySelector('deck-stage');
    if (!stage) return;
    stage.addEventListener('slidechange', (e) => activate(e.detail.slide));
    // handle whichever slide is active at load
    const cur = document.querySelector('section[data-deck-active]');
    if (cur) activate(cur);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
