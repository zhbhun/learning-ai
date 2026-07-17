/* =========================================================
   Nexus — interactions
   ========================================================= */

(() => {
  'use strict';

  /* ---------- Nav: scrolled state ---------- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (!nav) return;
    if (window.scrollY > 12) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu ---------- */
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.classList.toggle('open', open);
      navToggle.setAttribute('aria-expanded', String(open));
    });
    navLinks.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') {
        navLinks.classList.remove('open');
        navToggle.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- Reveal on scroll ---------- */
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('is-in'));
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const q = item.querySelector('.faq-q');
    const a = item.querySelector('.faq-a');
    if (!q || !a) return;
    q.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // close all
      document.querySelectorAll('.faq-item').forEach((other) => {
        other.classList.remove('open');
        const oq = other.querySelector('.faq-q');
        const oa = other.querySelector('.faq-a');
        if (oq) oq.setAttribute('aria-expanded', 'false');
        if (oa) oa.style.maxHeight = '0px';
      });
      if (!isOpen) {
        item.classList.add('open');
        q.setAttribute('aria-expanded', 'true');
        a.style.maxHeight = a.scrollHeight + 'px';
      }
    });
  });

  /* ---------- Pricing toggle ---------- */
  const toggle = document.querySelector('.toggle');
  const toggleOpts = document.querySelectorAll('.toggle-opt');
  const prices = document.querySelectorAll('.p-price .amt');

  const setPeriod = (period) => {
    if (!toggle) return;
    toggle.dataset.period = period;
    toggleOpts.forEach((opt) => {
      const active = opt.dataset.period === period;
      opt.classList.toggle('active', active);
      opt.setAttribute('aria-selected', String(active));
    });
    prices.forEach((p) => {
      const v = p.dataset[period];
      if (v == null) return;
      // skip non-numeric values like "Custom"
      const n = Number(v);
      if (!Number.isNaN(n) && v !== '') p.textContent = n;
    });
  };
  toggleOpts.forEach((opt) => {
    opt.addEventListener('click', () => setPeriod(opt.dataset.period));
  });

  /* ---------- Stat counters ---------- */
  const counters = document.querySelectorAll('.stat-num');
  const formatNumber = (n, decimals) => {
    if (decimals) return n.toFixed(decimals);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(n % 1_000 === 0 ? 0 : 1) + 'k';
    return Math.round(n).toLocaleString('en-US');
  };

  if ('IntersectionObserver' in window && counters.length) {
    const cIO = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseFloat(el.dataset.count || '0');
          const suffix = el.dataset.suffix || '';
          const decimals = parseInt(el.dataset.decimals || '0', 10);
          const duration = 1600;
          const start = performance.now();
          const tick = (now) => {
            const t = Math.min(1, (now - start) / duration);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - t, 3);
            const val = target * eased;
            el.textContent = formatNumber(val, decimals) + suffix;
            if (t < 1) requestAnimationFrame(tick);
            else el.textContent = formatNumber(target, decimals) + suffix;
          };
          requestAnimationFrame(tick);
          cIO.unobserve(el);
        });
      },
      { threshold: 0.4 }
    );
    counters.forEach((c) => cIO.observe(c));
  }

  /* ---------- Smooth-scroll offset for sticky nav ---------- */
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });
})();