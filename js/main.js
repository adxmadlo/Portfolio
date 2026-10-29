/* ================================================================
   ADAMA DIALLO PORTFOLIO v7 — js/main.js
   Senior-level animation system — 100% Vanilla JS, zero CDN

   ANIMATION TECHNIQUES (cross-referenced from top portfolios)
   1.  Init & JS-on signal
   2.  Theme init (midnight-only, no switcher)
   3.  Dark / Light mode toggle (separate from palette switcher)
   4.  Scroll progress bar
   5.  Mobile navigation
   6.  Active nav link (IntersectionObserver)
   7.  Typed text effect (hero subtitle cycling)
   8.  Staggered scroll-reveal (IntersectionObserver + delay cascade)
   9.  3D tilt cards with shine (skill + project cards)
  10.  Magnetic buttons (CTAs drift toward cursor)
  11.  Animated stat counters (trigger on scroll into view)
  12.  Parallax hero grid layer
  13.  Project filter with flip animation
  14.  Contact form validation (native Constraint API)
  15.  Back-to-top button
  16.  Footer year
================================================================ */

'use strict';

/* ── Utilities ─────────────────────────────────────────────── */

/** Linear interpolation — used for smooth magnetic button following */
const lerp = (a, b, t) => a + (b - a) * t;

/** Clamp a value between min and max */
const clamp = (val, min, max) => Math.min(Math.max(val, min), max);

/** Detect touch/mobile — skip tilt & magnetic on touch devices */
const isMobile = () => window.matchMedia('(pointer: coarse)').matches;

/** Detect reduced-motion preference */
const prefersReduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Throttle a callback to at most once per animation frame */
function rafThrottle(fn) {
  let raf = null;
  return (...args) => {
    if (raf) return;
    raf = requestAnimationFrame(() => { fn(...args); raf = null; });
  };
}

/* ================================================================
   1. INIT
================================================================ */
document.documentElement.classList.add('js-on');

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initModeToggle();
  if (!isMobile() && !prefersReduced()) {
    initTiltCards();
    initMagneticButtons();
    initParallax();
  }
  initScrollProgress();
  initNav();
  initActiveNav();
  initTypedText();
  initPortrait();
  initStaggeredReveal();
  initCounters();
  initFilter();
  initForm();
  initBackTop();
  initYear();
});


/* ================================================================
   2. THEME INIT (midnight-only — switcher removed in v7)
================================================================ */
function initTheme() {
  document.documentElement.setAttribute('data-theme', 'midnight');
  document.documentElement.style.setProperty('--svg-accent', '#c9a84c');
}


/* ================================================================
   3. DARK / LIGHT MODE TOGGLE
   Independent of the 4-palette switcher — controls data-mode
   attribute on <html>. dark = default (midnight palette).
   light = white bg override that keeps accent colours working.
================================================================ */
function initModeToggle() {
  const root   = document.documentElement;
  const btn    = document.getElementById('modeToggle');
  const KEY    = 'adama-mode';
  if (!btn) return;

  function applyMode(mode) {
    root.setAttribute('data-mode', mode);
    try { localStorage.setItem(KEY, mode); } catch (_) {}
    const isDark = mode === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    btn.setAttribute('title',      isDark ? 'Switch to light mode' : 'Switch to dark mode');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isDark ? '#0a0f1e' : '#f8faff');
  }

  let saved = 'dark';
  try { saved = localStorage.getItem(KEY) || 'dark'; } catch (_) {}
  applyMode(saved);

  /** Smooth switch: circular reveal from the button (View Transitions),
      or a colour cross-fade where that API is unavailable. */
  function switchMode(next) {
    if (prefersReduced()) { applyMode(next); return; }

    if (typeof document.startViewTransition === 'function') {
      const r  = btn.getBoundingClientRect();
      const x  = r.left + r.width  / 2;
      const y  = r.top  + r.height / 2;
      const rad = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
      const vt = document.startViewTransition(() => applyMode(next));
      vt.ready.then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${rad}px at ${x}px ${y}px)`] },
          { duration: 750, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }
        );
      }).catch(() => {});
      return;
    }

    root.classList.add('mode-transition');
    applyMode(next);
    clearTimeout(switchMode._t);
    switchMode._t = setTimeout(() => root.classList.remove('mode-transition'), 700);
  }

  btn.addEventListener('click', () => {
    const current = root.getAttribute('data-mode') || 'dark';
    switchMode(current === 'dark' ? 'light' : 'dark');
  });
}


/* ================================================================
   4. SCROLL PROGRESS BAR (thin accent line at top of viewport)
================================================================ */
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.className = 'scroll-progress';
  document.body.prepend(bar);

  const update = rafThrottle(() => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    const pct   = total > 0 ? (window.scrollY / total) * 100 : 0;
    bar.style.width = `${pct}%`;
  });

  window.addEventListener('scroll', update, { passive: true });
}


/* ================================================================
   4. MOBILE NAVIGATION
================================================================ */
function initNav() {
  const burger   = document.getElementById('burgerBtn');
  const nav      = document.getElementById('navMenu');
  const navLinks = nav ? nav.querySelectorAll('.nav__link') : [];
  if (!burger || !nav) return;

  function setNav(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    nav.classList.toggle('nav--open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  }

  burger.addEventListener('click', () => setNav(burger.getAttribute('aria-expanded') !== 'true'));
  navLinks.forEach(l => l.addEventListener('click', () => setNav(false)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') setNav(false); });
}


/* ================================================================
   5. ACTIVE NAV LINK
================================================================ */
function initActiveNav() {
  const sections = document.querySelectorAll('main section[id]');
  const links    = document.querySelectorAll('.nav__link[href^="#"]');
  if (!sections.length) return;

  sections.forEach(s => {
    new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === `#${e.target.id}`));
      });
    }, { rootMargin: '-35% 0px -55% 0px' }).observe(s);
  });
}


/* ================================================================
   6. TYPED TEXT EFFECT
   Types out and deletes each phrase character by character.
   Used on the hero subtitle cycling through roles.
================================================================ */
function initTypedText() {
  const el = document.getElementById('typedText');
  if (!el || prefersReduced()) return;

  // The article ("a" / "an") is part of each phrase so the grammar stays right.
  const phrases = [
    'a Full-Stack Developer',
    'an L3 Computer Science Student',
    'an IoT Builder',
    'a Laravel Developer',
    'a Flutter Developer',
    'a Problem Solver',
  ];

  const TYPE_MS   = 62;   // per character while typing
  const DELETE_MS = 28;   // per character while deleting
  const HOLD_MS   = 1900; // pause on a finished phrase
  const GAP_MS    = 320;  // pause before the next phrase

  let phraseIdx = 0;
  let charIdx   = 0;
  let deleting  = false;

  function tick() {
    const phrase = phrases[phraseIdx];
    el.textContent = phrase.slice(0, charIdx);

    if (!deleting) {
      if (charIdx === phrase.length) {
        deleting = true;
        return setTimeout(tick, HOLD_MS);
      }
      charIdx++;
      return setTimeout(tick, TYPE_MS + Math.random() * 40);
    }

    if (charIdx === 0) {
      deleting  = false;
      phraseIdx = (phraseIdx + 1) % phrases.length;
      return setTimeout(tick, GAP_MS);
    }
    charIdx--;
    setTimeout(tick, DELETE_MS);
  }

  // Start by erasing the static default so the first change feels natural
  charIdx  = phrases[0].length;
  deleting = true;
  setTimeout(tick, 1600);
}


/* ================================================================
   6b. HERO PORTRAIT
   Shows assets/images/adama-portrait.jpg in the hero as soon as it
   exists. Until then the illustration stays visible.
================================================================ */
function initPortrait() {
  const wrap = document.getElementById('heroVisual');
  const img  = document.getElementById('heroPortraitImg');
  if (!wrap || !img) return;
  const probe = new Image();
  probe.onload = () => {
    img.src = img.dataset.src;
    wrap.classList.add('has-portrait');
  };
  probe.src = img.dataset.src;
}


/* ================================================================
   7. STAGGERED SCROLL-REVEAL
   Children within a [data-stagger] parent get auto-delayed,
   creating a cascade effect. Plain [data-reveal] elements
   still fade-up individually.
================================================================ */
function initStaggeredReveal() {
  if (prefersReduced()) {
    document.querySelectorAll('[data-reveal], [data-stagger] > *').forEach(el => {
      el.classList.add('revealed');
    });
    return;
  }

  document.querySelectorAll('[data-stagger]').forEach(parent => {
    Array.from(parent.children).forEach((child, i) => {
      child.dataset.reveal = '';
      child.style.transitionDelay = `${i * 80}ms`;
    });
  });

  const observer = new IntersectionObserver((entries, obs) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('revealed');
      obs.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -48px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => observer.observe(el));
}


/* ================================================================
   8. 3D TILT CARDS with radial shine
   Technique from vanilla-tilt.js — pure JS reimplementation.
   On mousemove within a card, calculate offset from centre,
   apply rotateX/rotateY via CSS transform.
   A pseudo-element shine follows cursor position.
================================================================ */
function initTiltCards() {
  const MAX_TILT = 12;
  const SCALE    = 1.03;
  const SPEED    = 400;

  document.querySelectorAll('.skill-card, .project-card, .timeline__content').forEach(card => {
    let animFrame = null;

    card.addEventListener('mouseenter', () => {
      card.style.transition = `transform ${SPEED}ms cubic-bezier(.03,.98,.52,.99)`;
      card.style.willChange = 'transform';
      card.classList.add('tilt-active');
    });

    card.addEventListener('mousemove', e => {
      if (animFrame) cancelAnimationFrame(animFrame);
      animFrame = requestAnimationFrame(() => {
        const rect  = card.getBoundingClientRect();
        const cx    = rect.left + rect.width  / 2;
        const cy    = rect.top  + rect.height / 2;
        const dx    = (e.clientX - cx) / (rect.width  / 2);
        const dy    = (e.clientY - cy) / (rect.height / 2);
        const tiltX = clamp(-dy * MAX_TILT, -MAX_TILT, MAX_TILT);
        const tiltY = clamp( dx * MAX_TILT, -MAX_TILT, MAX_TILT);

        card.style.transform = `
          perspective(800px)
          rotateX(${tiltX}deg)
          rotateY(${tiltY}deg)
          scale3d(${SCALE},${SCALE},${SCALE})
        `;

        const shineX = ((e.clientX - rect.left) / rect.width)  * 100;
        const shineY = ((e.clientY - rect.top)  / rect.height) * 100;
        card.style.setProperty('--shine-x', `${shineX}%`);
        card.style.setProperty('--shine-y', `${shineY}%`);
      });
    });

    card.addEventListener('mouseleave', () => {
      if (animFrame) cancelAnimationFrame(animFrame);
      card.style.transition = `transform ${SPEED}ms cubic-bezier(.03,.98,.52,.99)`;
      card.style.transform  = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      card.classList.remove('tilt-active');
    });
  });
}


/* ================================================================
   9. MAGNETIC BUTTONS
   Primary CTAs drift toward the cursor when hovered within
   their bounding box. Uses lerp for smooth pull effect.
   Snaps back with spring on mouse-leave.
================================================================ */
function initMagneticButtons() {
  const STRENGTH = 0.4;
  const SNAP_MS  = 400;

  document.querySelectorAll('.btn--primary, .btn--ghost, .nav__link--cta').forEach(btn => {
    let mx = 0, my = 0;
    let bx = 0, by = 0;
    let raf = null;
    let active = false;

    function animate() {
      bx = lerp(bx, mx, 0.12);
      by = lerp(by, my, 0.12);
      btn.style.transform = `translate(${bx}px, ${by}px)`;
      raf = requestAnimationFrame(animate);
    }

    btn.addEventListener('mousemove', e => {
      const rect = btn.getBoundingClientRect();
      mx = (e.clientX - (rect.left + rect.width  / 2)) * STRENGTH;
      my = (e.clientY - (rect.top  + rect.height / 2)) * STRENGTH;
      if (!active) { active = true; animate(); }
    });

    btn.addEventListener('mouseleave', () => {
      mx = 0; my = 0;
      setTimeout(() => {
        cancelAnimationFrame(raf);
        active = false;
        btn.style.transform = '';
      }, SNAP_MS);
    });
  });
}


/* ================================================================
  10. ANIMATED STAT COUNTERS
  Numbers count up from 0 when scrolled into view.
  Uses easeOutExpo for satisfying deceleration.
================================================================ */
function initCounters() {
  const DURATION = 1800;

  function easeOutExpo(t) {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  }

  function animateCounter(el) {
    const target    = parseFloat(el.dataset.count);
    const isFloat   = String(target).includes('.');
    const suffix    = el.dataset.suffix || '';
    const prefix    = el.dataset.prefix || '';
    const startTime = performance.now();

    function step(now) {
      const elapsed  = now - startTime;
      const progress = clamp(elapsed / DURATION, 0, 1);
      const eased    = easeOutExpo(progress);
      const current  = target * eased;

      el.textContent = prefix + (isFloat ? current.toFixed(1) : Math.round(current)) + suffix;

      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  document.querySelectorAll('[data-count]').forEach(el => {
    new IntersectionObserver((entries, obs) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        animateCounter(e.target);
        obs.unobserve(e.target);
      });
    }, { threshold: 0.5 }).observe(el);
  });
}


/* ================================================================
  11. PARALLAX — hero dot-grid moves at reduced scroll speed
  Lightweight: only one element tracked, rAF-throttled.
================================================================ */
function initParallax() {
  const grid = document.querySelector('.hero__grid');
  if (!grid) return;

  const update = rafThrottle(() => {
    grid.style.transform = `translateY(${window.scrollY * 0.18}px)`;
  });
  window.addEventListener('scroll', update, { passive: true });
}


/* ================================================================
  12. PROJECT FILTER with flip-in animation
================================================================ */
function initFilter() {
  const buttons = document.querySelectorAll('.filter-btn');
  const cards   = document.querySelectorAll('.project-card');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const filter = btn.dataset.filter;
      buttons.forEach(b => {
        b.classList.toggle('filter-btn--active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });

      cards.forEach((card, i) => {
        const cats = (card.dataset.category || '').split(' ');
        const show = filter === 'all' || cats.includes(filter);
        if (show) {
          card.classList.remove('project-card--hidden');
          card.style.animation = 'none';
          void card.offsetHeight;
          card.style.animation = `filterFadeUp 0.4s ${i * 60}ms ease both`;
        } else {
          card.classList.add('project-card--hidden');
        }
      });
    });
  });
}


/* ================================================================
  13. CONTACT FORM VALIDATION (native Constraint Validation API)
================================================================ */
function initForm() {
  const form     = document.getElementById('contactForm');
  const statusEl = document.getElementById('form-status');
  if (!form) return;

  const errorMap = {
    'cf-name':    'err-name',
    'cf-email':   'err-email',
    'cf-message': 'err-message',
  };

  function getMsg(field) {
    const v = field.validity;
    if (v.valueMissing)  return 'This field is required.';
    if (v.typeMismatch)  return 'Enter a valid email address.';
    if (v.tooShort)      return `Use at least ${field.minLength} characters.`;
    return '';
  }

  function validate(field) {
    const span = document.getElementById(errorMap[field.id]);
    const msg  = getMsg(field);
    field.classList.toggle('invalid', !field.validity.valid);
    if (span) span.textContent = msg;
    return field.validity.valid;
  }

  Object.keys(errorMap).forEach(id => {
    const f = document.getElementById(id);
    if (!f) return;
    f.addEventListener('blur', () => validate(f));
    f.addEventListener('input', () => { if (f.classList.contains('invalid')) validate(f); });
  });

  form.addEventListener('submit', e => {
    const allValid = Object.keys(errorMap).map(id => {
      const f = document.getElementById(id);
      return f ? validate(f) : true;
    }).every(Boolean);

    if (!allValid) {
      e.preventDefault();
      if (statusEl) statusEl.textContent = 'Please fix the errors above before sending.';
      const first = form.querySelector('.invalid');
      if (first) first.focus();
      return;
    }
    if (statusEl) statusEl.textContent = 'Opening your email app…';
    setTimeout(() => {
      form.reset();
      form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
      if (statusEl) statusEl.textContent = 'Your email app will open on submit — no server required.';
    }, 2500);
  });
}


/* ================================================================
  14. BACK-TO-TOP
================================================================ */
function initBackTop() {
  const btn = document.getElementById('backTop');
  if (!btn) return;
  const update = () => btn.classList.toggle('visible', window.scrollY > 500);
  window.addEventListener('scroll', update, { passive: true });
  update();
  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}


/* ================================================================
  15. FOOTER YEAR
================================================================ */
function initYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}
