/* ==========================================================================
   Portfolio — AHONYI Romaric
   Moteur d'animation en JavaScript natif, sans aucune dépendance.
   Sommaire : outils · thème · texte · intro · défilement fluide · effets de
   scroll · curseur · interactions · hero (WebGL + particules) · aperçu · API
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  /* Lissage indépendant du nombre d'images par seconde. */
  var damp = function (a, b, k, dt) { return a + (b - a) * (1 - Math.exp(-k * dt)); };
  var easeOutExpo = function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var vw = window.innerWidth, vh = window.innerHeight;
  var pointer = { x: vw / 2, y: vh / 2, active: false };
  /* Mode allégé : activé automatiquement sur les appareils qui n'arrivent pas à tenir la fluidité.
     (?gl=force désactive ce garde-fou, utile pour tester les effets complets.) */
  var lite = false, fxForce = /[?&]gl=force/.test(location.search);

  /* ------------------------------------------------------------------
     Boucle d'animation partagée
     ------------------------------------------------------------------ */
  var animators = new Set();
  var lastT = performance.now();
  (function frame(now) {
    var dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    animators.forEach(function (fn) { if (fn(dt, now) === false) animators.delete(fn); });
    requestAnimationFrame(frame);
  })(lastT);
  var add = function (fn) { animators.add(fn); return fn; };

  window.addEventListener('pointermove', function (e) { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; }, { passive: true });
  document.addEventListener('mouseleave', function () { pointer.active = false; });

  /* ------------------------------------------------------------------
     Thème clair / sombre, avec transition circulaire depuis le bouton
     ------------------------------------------------------------------ */
  var themeBtn = $('#themeToggle');
  var metaTheme = $('meta[name="theme-color"]');
  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (metaTheme) metaTheme.setAttribute('content', t === 'light' ? '#faf6f1' : '#0a0908');
    root.dispatchEvent(new Event('gl-theme'));
  }
  applyTheme(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  themeBtn.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    try { localStorage.setItem('theme', next); } catch (e) {}
    if (!document.startViewTransition || reduce) { applyTheme(next); return; }
    var r = themeBtn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
    var rad = Math.hypot(Math.max(x, vw - x), Math.max(y, vh - y));
    var t = document.startViewTransition(function () { applyTheme(next); });
    t.ready.then(function () {
      root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + rad + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 850, easing: 'cubic-bezier(.16,1,.3,1)', pseudoElement: '::view-transition-new(root)' });
    }).catch(function () {});
  });

  /* ------------------------------------------------------------------
     Découpage du texte
     ------------------------------------------------------------------ */
  function splitWords(el, wrapClass, innerClass) {
    var i = 0;
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
        if (ch.nodeType === 3) {
          var frag = document.createDocumentFragment();
          // On ne coupe que sur les espaces ordinaires : l'espace insécable garde « tête ? » ensemble.
          ch.textContent.split(/([ \t\r\n]+)/).forEach(function (part) {
            if (!part) return;
            if (/^[ \t\r\n]+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            var w = document.createElement('span');
            w.className = wrapClass;
            if (innerClass) {
              var wi = document.createElement('span');
              wi.className = innerClass; wi.textContent = part; wi.style.setProperty('--i', i);
              w.appendChild(wi);
            } else { w.textContent = part; }
            i++; frag.appendChild(w);
          });
          ch.parentNode.replaceChild(frag, ch);
        } else if (ch.nodeType === 1) {
          if (ch.classList.contains('grad')) { ch.classList.remove('grad'); ch.classList.add('grad-split'); }
          walk(ch);
        }
      });
    })(el);
    return i;
  }

  $$('[data-split]').forEach(function (el) { splitWords(el, 'w', 'wi'); });
  var statement = $('#statement'), statementWords = [];
  if (statement) { splitWords(statement, 'sw'); statementWords = $$('.sw', statement); }

  /* Lettres du titre : chaque caractère est un élément animable. */
  var letters = [];
  (function () {
    var idx = 0;
    $$('.hero-title [data-chars]').forEach(function (el) {
      var txt = el.textContent, grad = el.hasAttribute('data-grad');
      el.textContent = ''; el.setAttribute('aria-hidden', 'true');
      txt.split('').forEach(function (c, i, arr) {
        var ch = document.createElement('span'); ch.className = 'ch';
        var inn = document.createElement('span'); inn.className = 'ch-in'; inn.textContent = c;
        inn.style.setProperty('--ci', idx++);
        if (grad) inn.style.setProperty('--k', (i / Math.max(1, arr.length - 1)).toFixed(3));
        ch.appendChild(inn); el.appendChild(ch);
        letters.push({ el: ch, x: 0, y: 0, r: 0, s: 1, cx: 0, cy: 0, dirty: false });
      });
    });
  })();

  /* ------------------------------------------------------------------
     Défilement fluide (inertie maison) — desktop uniquement
     ------------------------------------------------------------------ */
  var smooth = { on: false, cur: 0, target: 0, locked: false, animating: false, idle: 0 };
  var maxScroll = function () { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); };

  if (finePointer && !reduce) {
    smooth.on = true; smooth.cur = smooth.target = window.pageYOffset;
    root.classList.add('has-smooth');

    window.addEventListener('wheel', function (e) {
      if (smooth.locked || smooth.off || e.ctrlKey || e.defaultPrevented) return;
      e.preventDefault();
      var d = e.deltaMode === 1 ? e.deltaY * 34 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
      smooth.target = clamp(smooth.target + d, 0, maxScroll());
    }, { passive: false });

    window.addEventListener('scroll', function () {
      if (!smooth.animating) smooth.cur = smooth.target = window.pageYOffset; // barre de défilement, clavier…
    }, { passive: true });

    window.addEventListener('keydown', function (e) {
      if (smooth.locked || smooth.off || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      var a = document.activeElement;
      if (a && a !== document.body && a !== root) return; // on ne vole pas la barre d'espace à un bouton
      var step = 0, k = e.key;
      if (k === 'ArrowDown') step = 90; else if (k === 'ArrowUp') step = -90;
      else if (k === 'PageDown' || (k === ' ' && !e.shiftKey)) step = window.innerHeight * 0.88;
      else if (k === 'PageUp' || (k === ' ' && e.shiftKey)) step = -window.innerHeight * 0.88;
      else if (k === 'Home') { e.preventDefault(); smooth.target = 0; return; }
      else if (k === 'End') { e.preventDefault(); smooth.target = maxScroll(); return; }
      if (!step) return;
      e.preventDefault(); smooth.target = clamp(smooth.target + step, 0, maxScroll());
    });

    add(function (dt) {
      if (smooth.off) return;
      var diff = smooth.target - smooth.cur;
      if (Math.abs(diff) > 0.12) {
        smooth.animating = true; smooth.idle = 0;
        smooth.cur = damp(smooth.cur, smooth.target, 7.5, dt);
        window.scrollTo(0, smooth.cur);
      } else if (smooth.animating) {
        smooth.cur = smooth.target; window.scrollTo(0, smooth.cur);
        smooth.idle += dt; if (smooth.idle > 0.15) smooth.animating = false;
      }
    });
  }

  function scrollToY(y, instant) {
    y = clamp(y, 0, maxScroll());
    if (smooth.on && !smooth.off) { smooth.target = y; if (instant) { smooth.cur = y; window.scrollTo(0, y); } }
    else window.scrollTo({ top: y, behavior: instant || reduce ? 'auto' : 'smooth' });
  }
  function targetY(el) {
    var m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    return el.getBoundingClientRect().top + window.pageYOffset - m;
  }
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a) return;
    var h = a.getAttribute('href');
    if (h.length < 2 || h.indexOf('#projet/') === 0) return;
    var el = h === '#top' ? null : $(h);
    if (h !== '#top' && !el) return;
    e.preventDefault();
    scrollToY(el ? targetY(el) : 0);
  });

  /* ------------------------------------------------------------------
     Écran de chargement, puis intro
     ------------------------------------------------------------------ */
  var loader = $('#loader'), loaderNum = $('#loaderNum'), loaderBar = $('#loaderBar');
  var siteStarted = false;

  function startSite() {
    if (siteStarted) return; siteStarted = true;
    root.classList.remove('is-loading'); root.classList.add('loaded');
    measureAll();
    if (location.hash && location.hash.indexOf('#projet/') !== 0) {
      var t = $(location.hash); if (t) scrollToY(targetY(t), true);
    }
    setTimeout(function () { root.classList.add('ready'); }, 650);
    setTimeout(function () { root.classList.add('intro-done'); measureLetters(); }, 2600);
    setTimeout(function () { if (loader) loader.classList.add('is-gone'); }, 1600);
    setTimeout(function () { if (window.Projects) window.Projects.openFromHash(); }, 900);
  }

  if (reduce || !loader) {
    if (loader) loader.classList.add('is-gone');
    root.classList.remove('is-loading'); root.classList.add('loaded', 'ready', 'intro-done');
    siteStarted = true;
    setTimeout(function () { if (window.Projects) window.Projects.openFromHash(); }, 100);
  } else {
    var t0 = performance.now(), minDuration = 1500;
    var pageReady = document.readyState === 'complete';
    if (!pageReady) window.addEventListener('load', function () { pageReady = true; });
    var fontsReady = false;
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(function () { fontsReady = true; }); setTimeout(function () { fontsReady = true; }, 2200); }
    else fontsReady = true;
    add(function () {
      var elapsed = performance.now() - t0, p = clamp(elapsed / minDuration, 0, 1);
      // On n'attend jamais plus de 4 s : connexion lente ou polices bloquées ne doivent pas figer l'écran.
      var ok = (pageReady && fontsReady) || elapsed > 4000;
      var shown = easeOutExpo(p) * 100;
      if (!ok) shown = Math.min(shown, 99);
      loaderNum.textContent = Math.floor(shown);
      loaderBar.style.transform = 'scaleX(' + (shown / 100) + ')';
      if (p >= 1 && ok) {
        loaderNum.textContent = '100'; loaderBar.style.transform = 'scaleX(1)';
        startSite(); return false;
      }
    });
  }

  /* ------------------------------------------------------------------
     Garde-fou de performance : mesure la fluidité réelle après le chargement
     ------------------------------------------------------------------ */
  function enableLite() {
    if (lite) return; lite = true;
    root.classList.add('lite');
    root.classList.remove('has-smooth'); smooth.off = true; // défilement natif, plus fiable sur un appareil lent
    if (hero) hero.classList.add('no-gl');
  }
  if (!fxForce && !reduce) {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) enableLite();
    else {
      var pf = { start: 0, frames: 0 };
      add(function (dt, now) {
        if (lite) return false;
        if (!root.classList.contains('loaded')) return;
        if (!pf.start) pf.start = now + 700;      // on laisse passer l'intro
        if (now < pf.start) return;
        pf.frames++;
        var el = now - pf.start;
        if (el > 2600) { if (pf.frames / (el / 1000) < 28) enableLite(); return false; }
      });
    }
  }

  /* ------------------------------------------------------------------
     Comportements enregistrables (aussi utilisés pour le contenu injecté)
     ------------------------------------------------------------------ */
  var once = function (el, key) { if (!el._b) el._b = {}; if (el._b[key]) return false; el._b[key] = 1; return true; };

  var revealIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }) : null;

  function initMagnetic(el) {
    if (!finePointer || reduce || !once(el, 'mag')) return;
    var tx = 0, ty = 0, cx = 0, cy = 0, running = false;
    var k = el.classList.contains('btn') ? 0.28 : 0.4;
    function step(dt) {
      cx = damp(cx, tx, 14, dt); cy = damp(cy, ty, 14, dt);
      el.style.transform = 'translate3d(' + cx.toFixed(2) + 'px,' + cy.toFixed(2) + 'px,0)';
      if (Math.abs(cx - tx) < 0.05 && Math.abs(cy - ty) < 0.05 && !tx && !ty) { el.style.transform = ''; running = false; return false; }
    }
    var kick = function () { if (!running) { running = true; add(step); } };
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      tx = (e.clientX - (r.left + r.width / 2)) * k; ty = (e.clientY - (r.top + r.height / 2)) * k; kick();
    });
    el.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
  }

  function initTilt(el) {
    if (!finePointer || reduce || !once(el, 'tilt')) return;
    var trx = 0, try_ = 0, crx = 0, cry = 0, running = false, max = 5;
    function step(dt) {
      crx = damp(crx, trx, 9, dt); cry = damp(cry, try_, 9, dt);
      el.style.setProperty('--rx', crx.toFixed(3) + 'deg'); el.style.setProperty('--ry', cry.toFixed(3) + 'deg');
      if (Math.abs(crx - trx) < 0.01 && Math.abs(cry - try_) < 0.01 && !trx && !try_) {
        el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); running = false; return false;
      }
    }
    var kick = function () { if (!running) { running = true; add(step); } };
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      try_ = (px - 0.5) * 2 * max; trx = -(py - 0.5) * 2 * max;
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      kick();
    });
    el.addEventListener('pointerleave', function () { trx = 0; try_ = 0; kick(); });
  }

  function initSpot(el) {
    if (!once(el, 'spot')) return;
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--sx', (e.clientX - r.left) + 'px'); el.style.setProperty('--sy', (e.clientY - r.top) + 'px');
    });
  }

  var parEls = [], panelEls = [];
  function register(scope) {
    scope = scope || document;
    $$('[data-magnetic]', scope).forEach(initMagnetic);
    $$('[data-tilt]', scope).forEach(initTilt);
    $$('[data-spot]', scope).forEach(initSpot);
    $$('[data-reveal], [data-split]', scope).forEach(function (el) {
      if (!once(el, 'rev')) return;
      if (revealIO) revealIO.observe(el); else el.classList.add('in');
    });
    parEls = $$('[data-par]');
    panelEls = $$('.panel');
  }

  /* Compteurs */
  function runCounter(el) {
    var target = parseFloat(el.getAttribute('data-count')) || 0;
    if (reduce) { el.textContent = target; return; }
    var start = performance.now(), dur = 1800;
    add(function () {
      var p = clamp((performance.now() - start) / dur, 0, 1);
      el.textContent = Math.round(easeOutExpo(p) * target); return p < 1;
    });
  }
  if ('IntersectionObserver' in window) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    $$('[data-count]').forEach(function (c) { cio.observe(c); });
  } else { $$('[data-count]').forEach(function (c) { c.textContent = c.getAttribute('data-count'); }); }

  /* Mots qui changent dans l'accroche */
  (function () {
    var rotator = $('#rotator'); if (!rotator) return;
    var words = $$('span', rotator), idx = 0;
    if (words.length < 2 || reduce) return;
    rotator.classList.add('js-on');
    setInterval(function () {
      var cur = words[idx]; idx = (idx + 1) % words.length; var nxt = words[idx];
      cur.classList.remove('is-active'); cur.classList.add('is-out');
      nxt.classList.remove('is-out'); nxt.style.transition = 'none'; nxt.style.transform = 'translateY(110%)';
      void nxt.offsetWidth; nxt.style.transition = ''; nxt.style.transform = ''; nxt.classList.add('is-active');
      setTimeout(function () { cur.classList.remove('is-out'); }, 950);
    }, 2800);
  })();

  /* ------------------------------------------------------------------
     Bandeau : défile plus vite (et change de sens) selon le scroll
     ------------------------------------------------------------------ */
  var scrollVel = 0, prevY = window.pageYOffset;
  (function () {
    var track = $('#marqueeTrack'); if (!track || !track.firstElementChild) return;
    var clone = track.firstElementChild.cloneNode(true); clone.setAttribute('aria-hidden', 'true'); track.appendChild(clone);
    if (reduce) return;
    var x = 0, dir = 1, dirS = 1, w = 0, visible = true;
    var mq = track.parentElement;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(mq);
    add(function (dt) {
      if (!visible) return;
      if (!w) w = track.firstElementChild.offsetWidth;
      if (Math.abs(scrollVel) > 4) dir = scrollVel > 0 ? 1 : -1;
      dirS = damp(dirS, dir, 3, dt);
      var speed = 60 + Math.min(Math.abs(scrollVel) * 0.9, 900);
      x -= dirS * speed * dt;
      if (w) { x = x % w; if (x > 0) x -= w; }
      var skew = clamp(-scrollVel * 0.035, -9, 9);
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0) skewX(' + skew.toFixed(2) + 'deg)';
    });
  })();

  /* ------------------------------------------------------------------
     Effets liés au défilement
     ------------------------------------------------------------------ */
  var progress = $('#progress'), heroInner = $('#heroInner'), hero = $('#top'), footer = $('#footer');
  var navPill = $('#navPill'), navInd = $('#navInd');
  var navLinks = $$('[data-link]', navPill);
  var navSections = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  var activeLink = null, footerH = 0;

  function moveIndicator(link) {
    if (!link) { navInd.style.opacity = '0'; return; }
    navInd.style.opacity = '1'; navInd.style.width = link.offsetWidth + 'px'; navInd.style.transform = 'translateX(' + link.offsetLeft + 'px)';
  }
  function setActive(link) {
    if (link === activeLink) return; activeLink = link;
    navLinks.forEach(function (a) { a.classList.toggle('is-active', a === link); }); moveIndicator(link);
  }

  var lastVars = new WeakMap();
  function setVar(el, k, v) { var m = lastVars.get(el) || {}; if (m[k] === v) return; m[k] = v; lastVars.set(el, m); el.style.setProperty(k, v); }

  function effects(dt) {
    var y = window.pageYOffset;
    scrollVel = damp(scrollVel, (y - prevY) / Math.max(dt, 0.001), 10, dt); prevY = y;
    if (Math.abs(scrollVel) < 0.5) scrollVel = 0;

    var max = maxScroll();
    progress.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0).toFixed(4) + ')';

    if (!reduce && heroInner && y < vh * 1.3) {
      var hp = clamp(y / (vh * 0.8), 0, 1);
      heroInner.style.transform = 'translate3d(0,' + (y * 0.18).toFixed(1) + 'px,0)';
      heroInner.style.opacity = (1 - hp * 0.9).toFixed(3);
    }

    if (statement && statementWords.length) {
      var r = statement.getBoundingClientRect();
      if (r.bottom > -100 && r.top < vh + 100) {
        var start = vh * 0.82, end = vh * 0.35;
        var prog = clamp((start - r.top) / (start - end + r.height * 0.55), 0, 1), n = statementWords.length;
        for (var i = 0; i < n; i++) {
          var v = reduce ? 1 : clamp(prog * (n + 4) - i, 0, 1);
          statementWords[i].style.opacity = (0.16 + 0.84 * v).toFixed(3);
        }
      }
    }

    /* Panneaux de projets : chaque panneau recule quand le suivant l'écrase. */
    var panels = panelEls;
    if (panels.length) {
      var stacked = vw > 860 && !reduce;
      for (var k = 0; k < panels.length; k++) {
        var s = 1, d = 0, nxt = panels[k + 1];
        if (stacked && nxt) {
          var nt = nxt.getBoundingClientRect().top, stickyNext = nxt._sticky || 100;
          var pp = clamp((vh * 0.95 - nt) / (vh * 0.95 - stickyNext), 0, 1);
          s = 1 - 0.06 * pp; d = pp;
        }
        setVar(panels[k], '--s', s.toFixed(4)); setVar(panels[k], '--dim', d.toFixed(3));
      }
    }

    /* Parallaxe des captures (vitrine et étude de cas) */
    for (var j = 0; j < parEls.length; j++) {
      var img = parEls[j], rr = img.parentElement.getBoundingClientRect();
      if (rr.bottom < -40 || rr.top > vh + 40) continue;
      var pr = clamp(1 - (rr.top + rr.height) / (vh + rr.height), 0, 1);
      setVar(img, '--py', (-pr * 10.2).toFixed(2) + '%');
    }

    /* Pied de page révélé sous le contenu */
    if (footer && footerH) setVar(footer, '--fill', clamp((y - (max - footerH)) / footerH, 0, 1).toFixed(3));

    /* Lien actif */
    var mid = y + vh * 0.45, found = null;
    navSections.forEach(function (sec, i) { if (sec && sec.offsetTop <= mid) found = navLinks[i]; });
    setActive(found);
  }
  add(effects);

  /* Menu mobile */
  var burger = $('#burger');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
  }
  burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  $$('.m-link, .mobile-menu .socials a').forEach(function (a) { a.addEventListener('click', function () { setMenu(false); }); });
  window.addEventListener('keydown', function (e) { if (e.key === 'Escape' && root.classList.contains('menu-open')) setMenu(false); });

  /* ------------------------------------------------------------------
     Curseur personnalisé
     ------------------------------------------------------------------ */
  (function () {
    var cursor = $('#cursor');
    if (!finePointer || reduce || !cursor) return;
    var dot = $('.cursor-dot', cursor), ring = $('.cursor-ring', cursor), label = $('#cursorLabel');
    var cx = pointer.x, cy = pointer.y, shown = false;
    window.addEventListener('pointermove', function () {
      if (!shown) { shown = true; root.classList.add('has-cursor'); cursor.classList.remove('is-hidden'); cx = pointer.x; cy = pointer.y; }
    }, { passive: true });
    document.addEventListener('mouseleave', function () { cursor.classList.add('is-hidden'); });
    document.addEventListener('mouseenter', function () { if (shown) cursor.classList.remove('is-hidden'); });
    add(function (dt) {
      cx = damp(cx, pointer.x, 22, dt); cy = damp(cy, pointer.y, 22, dt);
      dot.style.transform = 'translate3d(' + pointer.x + 'px,' + pointer.y + 'px,0)';
      ring.style.transform = 'translate3d(' + cx.toFixed(1) + 'px,' + cy.toFixed(1) + 'px,0)';
    });
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('a, button, [data-magnetic], [data-cursor]') : null;
      if (!t) { cursor.classList.remove('is-hover', 'is-label'); return; }
      var lab = t.closest('[data-cursor]');
      if (lab) { label.textContent = lab.getAttribute('data-cursor'); cursor.classList.add('is-label'); cursor.classList.remove('is-hover'); }
      else { cursor.classList.add('is-hover'); cursor.classList.remove('is-label'); }
    });
  })();

  /* ------------------------------------------------------------------
     Aperçu flottant au survol de l'index des projets
     ------------------------------------------------------------------ */
  (function () {
    var prev = $('#preview'); if (!prev || !finePointer || reduce) return;
    var img = $('img', prev), on = false, px = 0, py = 0, pr = 0, ps = 0.7, init = false;
    document.addEventListener('pointerover', function (e) {
      var t = e.target.closest ? e.target.closest('[data-preview]') : null;
      if (t) {
        var src = t.getAttribute('data-preview');
        if (img.getAttribute('src') !== src) img.setAttribute('src', src);
        if (!init) { px = pointer.x; py = pointer.y; init = true; }
        on = true; prev.classList.add('on');
      } else if (on) { on = false; prev.classList.remove('on'); }
    });
    add(function (dt) {
      if (!on && ps <= 0.71) return;
      var tx = pointer.x + 34, ty = pointer.y - 120, ox = px;
      px = damp(px, tx, 11, dt); py = damp(py, ty, 11, dt);
      pr = damp(pr, clamp(((px - ox) / Math.max(dt, 0.001)) * 0.008, -14, 14), 9, dt);
      ps = damp(ps, on ? 1 : 0.7, 12, dt);
      prev.style.transform = 'translate3d(' + px.toFixed(1) + 'px,' + py.toFixed(1) + 'px,0) rotate(' + pr.toFixed(2) + 'deg) scale(' + ps.toFixed(3) + ')';
    });
  })();

  /* ------------------------------------------------------------------
     Hero : lettres qui réagissent au curseur
     ------------------------------------------------------------------ */
  var titleFont = 160;
  function measureLetters() {
    if (!letters.length) return;
    var y = window.pageYOffset, title = $('.hero-title');
    titleFont = parseFloat(getComputedStyle(title).fontSize) || 160;
    letters.forEach(function (L) {
      var keep = L.el.style.transform; L.el.style.transform = 'none';
      var r = L.el.getBoundingClientRect();
      L.cx = r.left + r.width / 2; L.cy = r.top + r.height / 2 + y * 0.82;
      L.el.style.transform = keep;
    });
  }
  if (letters.length && finePointer && !reduce) {
    add(function (dt) {
      if (!root.classList.contains('intro-done')) return;
      var y = window.pageYOffset, R = Math.max(170, vw * 0.13);
      var live = pointer.active && y < vh * 0.9;
      for (var i = 0; i < letters.length; i++) {
        var L = letters[i], f = 0, dx = 0;
        if (live) {
          dx = pointer.x - L.cx; var dy = pointer.y - (L.cy - y * 0.82), d = Math.sqrt(dx * dx + dy * dy);
          f = clamp(1 - d / R, 0, 1); f = f * f * (3 - 2 * f);
        }
        var ty = -f * titleFont * 0.075, tx = -(dx / R) * f * titleFont * 0.045, tr = (dx / R) * f * 5, ts = 1 + f * 0.04;
        L.x = damp(L.x, tx, 9, dt); L.y = damp(L.y, ty, 9, dt); L.r = damp(L.r, tr, 9, dt); L.s = damp(L.s, ts, 9, dt);
        if (!f && Math.abs(L.x) + Math.abs(L.y) + Math.abs(L.r) < 0.03 && Math.abs(L.s - 1) < 0.0006) {
          if (L.dirty) { L.el.style.transform = ''; L.dirty = false; }
          continue;
        }
        L.dirty = true;
        L.el.style.transform = 'translate3d(' + L.x.toFixed(2) + 'px,' + L.y.toFixed(2) + 'px,0) rotate(' + L.r.toFixed(2) + 'deg) scale(' + L.s.toFixed(3) + ')';
      }
    });
  }

  /* ------------------------------------------------------------------
     Hero : fond WebGL (shader de soie lumineuse) + particules
     ------------------------------------------------------------------ */
  var FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH', 'precision highp float;', '#else', 'precision mediump float;', '#endif',
    'uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse; uniform float uLight; uniform float uIntro;',
    'float hash(vec2 p){ p=fract(p*vec2(123.34,456.21)); p+=dot(p,p+45.32); return fract(p.x*p.y); }',
    'float noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); f=f*f*(3.0-2.0*f);',
    '  float a=hash(i); float b=hash(i+vec2(1.0,0.0)); float c=hash(i+vec2(0.0,1.0)); float d=hash(i+vec2(1.0,1.0));',
    '  return mix(mix(a,b,f.x),mix(c,d,f.x),f.y); }',
    'float fbm(vec2 p){ float v=0.0; float a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p=p*2.03+vec2(1.7,9.2); a*=0.5; } return v; }',
    'void main(){',
    '  vec2 p=(gl_FragCoord.xy-0.5*uRes)/uRes.y;',
    '  vec2 m=(uMouse-0.5*uRes)/uRes.y;',
    '  float t=uTime*0.05;',
    '  vec2 q=vec2(fbm(p*1.3+vec2(0.0,t)),fbm(p*1.3+vec2(5.2,1.3)-t));',
    '  vec2 d=p-m; float dist=length(d); float inf=exp(-dist*dist*6.0);',
    '  vec2 r=vec2(fbm(p*1.7+3.0*q+vec2(1.7,9.2)+t*1.3),fbm(p*1.7+3.0*q+vec2(8.3,2.8)-t));',
    '  r+=vec2(-d.y,d.x)*inf*0.9;',
    '  float f=fbm(p*1.5+3.2*r);',
    '  float mask=0.30+0.70*smoothstep(-0.55,0.75,p.x*0.85+p.y*0.45);',
    '  vec3 dark=vec3(0.039,0.035,0.031);',
    '  vec3 c3=vec3(0.62,0.12,0.05); vec3 c1=vec3(1.0,0.42,0.21); vec3 c2=vec3(1.0,0.71,0.28);',
    '  vec3 col=dark;',
    '  col+=c3*smoothstep(0.28,0.78,f)*0.55;',
    '  col+=c1*smoothstep(0.52,0.92,f)*0.42*(0.55+0.9*q.x);',
    '  col+=c2*pow(smoothstep(0.58,0.95,f),3.0)*0.55;',
    '  float ln=1.0-smoothstep(0.0,0.03,abs(f-0.56));',
    '  col+=c2*ln*0.22*(0.5+q.y);',
    '  col=mix(dark,col,mask);',
    '  col+=c1*inf*0.22;',
    '  vec3 lbase=vec3(0.980,0.965,0.945);',
    '  vec3 lc=lbase;',
    '  lc=mix(lc,vec3(1.0,0.80,0.58),smoothstep(0.30,0.80,f)*0.65);',
    '  lc=mix(lc,vec3(0.97,0.52,0.24),smoothstep(0.55,0.95,f)*0.55);',
    '  lc=mix(lc,vec3(0.90,0.36,0.15),ln*0.30);',
    '  lc=mix(lbase,lc,mask);',
    '  lc-=vec3(0.0,0.05,0.12)*inf*0.5;',
    '  vec3 outc=mix(col,lc,uLight);',
    '  vec3 bg=mix(dark,lbase,uLight);',
    '  outc=mix(bg,outc,uIntro);',
    '  outc+=(hash(gl_FragCoord.xy+uTime)-0.5)*0.012;',
    '  gl_FragColor=vec4(outc,1.0);',
    '}'
  ].join('\n');

  function initGL() {
    var cv = $('#gl'); if (!cv) return false;
    var gl = null;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' }); } catch (e) {}
    if (!gl) return false;
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { if (window.console) console.warn(gl.getShaderInfoLog(s)); return null; }
      return s;
    }
    var vs = compile(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}');
    var fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;
    var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    var U = { res: gl.getUniformLocation(prog, 'uRes'), time: gl.getUniformLocation(prog, 'uTime'), mouse: gl.getUniformLocation(prog, 'uMouse'), light: gl.getUniformLocation(prog, 'uLight'), intro: gl.getUniformLocation(prog, 'uIntro') };

    var W = 1, H = 1, time = 8, mx = -9999, my = -9999, light = root.getAttribute('data-theme') === 'light' ? 1 : 0, intro = reduce ? 1 : 0, visible = true, lost = false;
    var LEVELS = [0.5, 0.36, 0.26], level = 0;
    function resize() {
      var q = LEVELS[level] * Math.min(window.devicePixelRatio || 1, 1.5);
      var cw = cv.clientWidth || 1, ch = cv.clientHeight || 1;
      W = Math.max(2, Math.round(cw * q)); H = Math.max(2, Math.round(ch * q));
      cv.width = W; cv.height = H; gl.viewport(0, 0, W, H);
    }
    function draw() {
      gl.uniform2f(U.res, W, H); gl.uniform1f(U.time, time); gl.uniform2f(U.mouse, mx, my);
      gl.uniform1f(U.light, light); gl.uniform1f(U.intro, intro);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    /* Qualité adaptative : on mesure le coût réel d'une image. Un rendu logiciel (sans GPU)
       est trop lent pour ce shader : dans ce cas on bascule sur le fond CSS. ?gl=force pour tester. */
    var forced = /[?&]gl=force/.test(location.search);
    resize(); draw(); gl.finish();
    var tb = performance.now(); draw(); gl.finish(); var cost = performance.now() - tb;
    if (!forced && cost > 140) { try { var ext = gl.getExtension('WEBGL_lose_context'); if (ext) ext.loseContext(); } catch (e) {} return false; }
    if (!forced && cost > 40) { level = 1; resize(); }
    function disable() { lost = true; hero.classList.add('no-gl'); }
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); disable(); });
    window.addEventListener('resize', function () { resize(); if (reduce) draw(); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);

    if (reduce) { root.addEventListener('gl-theme', function () { light = root.getAttribute('data-theme') === 'light' ? 1 : 0; draw(); }); return true; }

    var introT0 = 0, lastNow = 0, slow = 0, since = 0;
    add(function (dt, now) {
      if (lost || lite) return false;
      if (!visible || document.hidden || !root.classList.contains('loaded')) { lastNow = 0; return; }
      // Surveillance de la fluidité : si ça rame, on baisse la résolution, puis on coupe.
      if (lastNow && !forced) {
        var ft = now - lastNow; since += ft;
        if (since > 700) { if (ft > 48) slow++; else slow = Math.max(0, slow - 1); }
        if (slow > 14) { slow = 0; level++; if (level >= LEVELS.length) { disable(); return false; } resize(); }
      }
      lastNow = now;
      time += dt;
      // Apparition basée sur l'horloge (et non sur le nombre d'images) : identique sur GPU lent ou rapide.
      if (root.classList.contains('ready')) { if (!introT0) introT0 = now; intro = easeOutExpo(clamp((now - introT0) / 2200, 0, 1)); }
      var lt = root.getAttribute('data-theme') === 'light' ? 1 : 0; light = damp(light, lt, 6, dt);
      var r = cv.getBoundingClientRect();
      var tx = pointer.active ? (pointer.x - r.left) * (W / r.width) : -9999, ty = pointer.active ? (r.height - (pointer.y - r.top)) * (H / r.height) : -9999;
      if (mx < -9000 || tx < -9000) { mx = tx; my = ty; } else { mx = damp(mx, tx, 5, dt); my = damp(my, ty, 5, dt); }
      draw();
    });
    return true;
  }

  function initFlow() {
    var cv = $('#flow'); if (!cv || !hero || reduce) return;
    var ctx = cv.getContext('2d'), W = 0, H = 0, particles = [], visible = true, time = 0, B = 3;
    function spawn(p) { p.x = Math.random() * W; p.y = Math.random() * H; p.px = p.x; p.py = p.y; p.life = 120 + Math.random() * 260; p.speed = 0.6 + Math.random() * 1.0; p.b = Math.floor(Math.random() * B); return p; }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = clamp(Math.floor((W * H) / 3800), 120, 520); particles = []; for (var i = 0; i < n; i++) particles.push(spawn({}));
    }
    var field = function (x, y, t) { var s = 0.0021; return (Math.sin(x * s * 1.1 + t * 0.35) + Math.cos(y * s * 1.4 - t * 0.28) + Math.sin((x + y) * s * 0.7 + t * 0.2) * 0.8) * 1.6; };
    resize();
    var rto; window.addEventListener('resize', function () { clearTimeout(rto); rto = setTimeout(resize, 200); });
    if ('IntersectionObserver' in window) new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(hero);
    add(function (dt) {
      if (lite) { ctx.clearRect(0, 0, W, H); return false; }
      if (!visible || document.hidden) return;
      time += dt * 0.7;
      var light = root.getAttribute('data-theme') === 'light';
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,0.09)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = light ? 'source-over' : 'lighter';
      var rect = cv.getBoundingClientRect(), mx = pointer.x - rect.left, my = pointer.y - rect.top;
      var cols = light ? ['rgba(214,68,22,.42)', 'rgba(236,128,28,.38)', 'rgba(170,40,14,.34)'] : ['rgba(255,107,53,.45)', 'rgba(255,181,71,.4)', 'rgba(255,214,150,.3)'];
      var paths = []; for (var b = 0; b < B; b++) paths.push(new Path2D());
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i], a = field(p.x, p.y, time), vx = Math.cos(a) * p.speed, vy = Math.sin(a) * p.speed;
        if (pointer.active) {
          var dx = p.x - mx, dy = p.y - my, d2 = dx * dx + dy * dy;
          if (d2 < 22500) { var d = Math.sqrt(d2) || 1, f = 1 - d / 150; vx += (dx / d) * f * 3.2 + (-dy / d) * f * 2.2; vy += (dy / d) * f * 3.2 + (dx / d) * f * 2.2; }
        }
        p.px = p.x; p.py = p.y; p.x += vx; p.y += vy; p.life--;
        paths[p.b].moveTo(p.px, p.py); paths[p.b].lineTo(p.x, p.y);
        if (p.life <= 0 || p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) spawn(p);
      }
      ctx.lineWidth = 1.1; ctx.lineCap = 'round';
      for (var k = 0; k < B; k++) { ctx.strokeStyle = cols[k]; ctx.stroke(paths[k]); }
    });
  }

  if (hero && !lite) {
    if (!initGL()) hero.classList.add('no-gl');
    initFlow();
  }

  /* ------------------------------------------------------------------
     Mesures et redimensionnement
     ------------------------------------------------------------------ */
  function measureAll() {
    vw = window.innerWidth; vh = window.innerHeight;
    if (footer) { footerH = footer.offsetHeight; root.style.setProperty('--footer-h', footerH + 'px'); }
    panelEls.forEach(function (p) { p._sticky = parseFloat(getComputedStyle(p).top) || 100; });
    moveIndicator(activeLink); measureLetters();
  }
  var rto2; window.addEventListener('resize', function () { clearTimeout(rto2); rto2 = setTimeout(measureAll, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  window.addEventListener('load', measureAll);

  /* ------------------------------------------------------------------
     Divers + API publique
     ------------------------------------------------------------------ */
  var year = $('#year'); if (year) year.textContent = new Date().getFullYear();
  register(document);
  measureAll();

  window.Site = {
    register: register,
    splitWords: splitWords,
    scrollTo: scrollToY,
    lock: function () { smooth.locked = true; },
    unlock: function () { smooth.locked = false; smooth.cur = smooth.target = window.pageYOffset; },
    refresh: measureAll
  };

  root.setAttribute('data-boot', '1');
})();
