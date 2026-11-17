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
  var smoother = function (t) { return t * t * t * (t * (t * 6 - 15) + 10); };

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
    setTimeout(function () { root.classList.add('intro-done'); }, 2600);
    // Si la scène 3D ne s'est pas lancée (ouverture en file://, WebGL absent…), on bascule sur le fond de secours.
    setTimeout(function () { if (!window.__scene3d) root.classList.add('no-3d'); }, 7000);
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
    root.classList.add('lite', 'no-3d');
    root.classList.remove('has-smooth'); smooth.off = true; // défilement natif, plus fiable sur un appareil lent
  }
  if (!fxForce && !reduce) {
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) enableLite();
    else {
      // On ne mesure qu'une fois l'intro et la compilation des shaders terminées, pour ne pas confondre un pic de chargement avec un appareil lent.
      var pf = { start: 0, frames: 0 };
      add(function (dt, now) {
        if (lite) return false;
        if (!root.classList.contains('intro-done')) return;
        if (!pf.start) pf.start = now + 900;
        if (now < pf.start) return;
        pf.frames++;
        var el = now - pf.start;
        if (el > 2800) { if (pf.frames / (el / 1000) < 24) enableLite(); return false; }
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
    var trx = 0, try_ = 0, crx = 0, cry = 0, running = false, max = parseFloat(el.getAttribute('data-tilt')) || 5;
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
  var c3d = null, c3dRing = null, c3dCards = [], c3dN = 0, c3dIdx = 0, c3dNum = null, c3dDots = [], c3dLast = -1;
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
    if (!c3d) {
      c3d = $('#c3d');
      if (c3d) { c3dRing = $('#c3dRing'); c3dCards = $$('.c3d-card', c3d); c3dN = c3dCards.length; c3dNum = $('#c3dNum'); c3dDots = $$('.c3d-dot', c3d); }
    }
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
  var activeLink = null;

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

    /* Carrousel 3D des projets : le scroll fait tourner le cylindre (avec un temps d'arrêt sur chaque projet). */
    if (c3d && c3dN > 1) {
      if (vw > 860 && !reduce) {
        var cr = c3d.getBoundingClientRect(), span = Math.max(1, cr.height - vh);
        var f3 = clamp(-cr.top / span, 0, 1) * (c3dN - 1), i3 = Math.min(Math.floor(f3), c3dN - 2);
        var tgt = i3 + smoother(clamp((f3 - i3 - 0.18) / 0.64, 0, 1));
        c3dIdx = damp(c3dIdx, tgt, 6.5, dt);
        setVar(c3dRing, '--rot', (-c3dIdx * (360 / c3dN)).toFixed(3) + 'deg');
        for (var q = 0; q < c3dN; q++) {
          var dq = Math.abs(q - c3dIdx);
          setVar(c3dCards[q], '--dim', clamp((dq - 0.12) * 0.5, 0, 0.86).toFixed(3));
          var front = dq < 0.5;
          if (c3dCards[q]._front !== front) { c3dCards[q]._front = front; c3dCards[q].classList.toggle('is-front', front); }
        }
        var cur3 = Math.round(c3dIdx);
        if (cur3 !== c3dLast) {
          c3dLast = cur3;
          if (c3dNum) c3dNum.textContent = String(cur3 + 1).padStart(2, '0');
          c3dDots.forEach(function (d, k) { d.classList.toggle('is-on', k === cur3); });
        }
      }
    }
    /* Parallaxe des captures (vitrine et étude de cas) */
    for (var j = 0; j < parEls.length; j++) {
      var img = parEls[j], rr = img.parentElement.getBoundingClientRect();
      if (rr.bottom < -40 || rr.top > vh + 40) continue;
      var pr = clamp(1 - (rr.top + rr.height) / (vh + rr.height), 0, 1);
      setVar(img, '--py', (-pr * 10.2).toFixed(2) + '%');
    }

    /* Pied de page : le grand nom se remplit à mesure qu'il entre dans l'écran */
    if (footer) { var fr = footer.getBoundingClientRect(); if (fr.top < vh) setVar(footer, '--fill', clamp((vh - fr.top) / (fr.height * 0.9), 0, 1).toFixed(3)); }

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
     Mesures et redimensionnement
     ------------------------------------------------------------------ */
  function measureAll() {
    vw = window.innerWidth; vh = window.innerHeight;
    if (c3d && c3dN > 1) {
      // Rayon du cylindre : les cartes se touchent presque par leurs bords, avec un peu d'air (x1.16).
      var cw = c3dCards[0].offsetWidth || 900, R = (cw / 2) / Math.tan(Math.PI / c3dN) * 1.16;
      c3d.style.setProperty('--R', R.toFixed(0) + 'px'); c3d.style.setProperty('--step', (360 / c3dN) + 'deg');
    }
    moveIndicator(activeLink);
  }

  /* Carrousel : navigation par points et clic sur une carte latérale pour l'amener devant */
  function go3d(i) {
    if (!c3d) return;
    var top = c3d.getBoundingClientRect().top + window.pageYOffset, span = Math.max(1, c3d.offsetHeight - vh);
    scrollToY(top + (i / Math.max(1, c3dN - 1)) * span + 2);
  }
  document.addEventListener('click', function (e) {
    var dot = e.target.closest && e.target.closest('.c3d-dot');
    if (dot) { e.preventDefault(); go3d(+dot.getAttribute('data-goto')); return; }
    var card = e.target.closest && e.target.closest('.c3d-card');
    if (card && e.isTrusted && c3d && vw > 860 && !reduce && !card.classList.contains('is-front')) { e.preventDefault(); e.stopPropagation(); go3d(+card.getAttribute('data-idx')); }
  }, true);
  var rto2; window.addEventListener('resize', function () { clearTimeout(rto2); rto2 = setTimeout(measureAll, 120); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measureAll);
  window.addEventListener('load', measureAll);

  /* ------------------------------------------------------------------
     Divers + API publique
     ------------------------------------------------------------------ */
  /* CV : le document se retourne pour passer du français à l'anglais (le PDF, le lien et la version texte suivent) */
  (function () {
    var card = $('#cvCard'); if (!card) return;
    var tabs = $$('.cv-lang [data-lang]'), dl = $('#cvDl'), open = $('#cvOpen'), lab = $('#cvDlLabel'), bodies = $$('.cv-text-body');
    var FILES = { fr: 'assets/cv/CV-AHONYI-Romaric-FR.pdf', en: 'assets/cv/CV-AHONYI-Romaric-EN.pdf' };
    var LABELS = { fr: 'Télécharger le PDF', en: 'Télécharger la version anglaise' };
    var ARIA = { fr: 'Ouvrir le CV français en PDF', en: 'Ouvrir le CV en anglais en PDF' };
    function setLang(lang) {
      card.classList.toggle('is-en', lang === 'en');
      tabs.forEach(function (b) { var on = b.getAttribute('data-lang') === lang; b.classList.toggle('is-on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      card.setAttribute('href', FILES[lang]); card.setAttribute('aria-label', ARIA[lang]);
      dl.setAttribute('href', FILES[lang]); dl.setAttribute('download', FILES[lang].split('/').pop());
      open.setAttribute('href', FILES[lang]); lab.textContent = LABELS[lang];
      bodies.forEach(function (b) { b.hidden = b.getAttribute('data-lang') !== lang; });
    }
    // La face anglaise est en chargement différé : on la précharge dès qu'on s'approche de l'onglet.
    var backImg = card.querySelector('.cv-back img');
    function preload() { if (backImg && backImg.loading === 'lazy') backImg.loading = 'eager'; }
    tabs.forEach(function (b, i) {
      b.addEventListener('pointerenter', preload); b.addEventListener('focus', preload); card.addEventListener('pointerenter', preload, { once: true });
      b.addEventListener('click', function () { preload(); setLang(b.getAttribute('data-lang')); });
      b.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { var n = tabs[(i + 1) % tabs.length]; n.focus(); setLang(n.getAttribute('data-lang')); }
      });
    });
  })();

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
