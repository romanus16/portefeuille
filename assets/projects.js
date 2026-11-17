/* ==========================================================================
   Projets : données, rendu de la vitrine et page « étude de cas »
   Toutes les informations viennent des dépôts GitHub et des démos en ligne.
   Chargé AVANT main.js : il fabrique le DOM, main.js branche ensuite les animations.
   ========================================================================== */
(function () {
  'use strict';

  var IMG = 'assets/img/projects/';
  var GH = 'https://github.com/romanus16/';

  var PROJECTS = [
    {
      id: 'food-yokfa', no: '01', title: 'Food-YOKFA', kind: 'Application mobile', year: '2026',
      status: 'En développement', featured: true,
      colors: ['#e8590c', '#ffb547', '#2b1d16'],
      tagline: 'Commander un repas, le payer en mobile money, et valider la livraison avec un QR code.',
      summary: 'Application mobile de commande de repas : le client choisit ses plats, paie par T-Money ou Flooz, reçoit un QR code, et le livreur scanne ce code pour confirmer la livraison. Le gérant est notifié à chaque commande. Le projet couvre les trois acteurs : client, gérant et livreur.',
      stack: ['Flutter', 'Dart', 'Firebase', 'Cloud Functions', 'OpenStreetMap', 'GitHub Actions'],
      facts: [['3', 'moyens de paiement'], ['3', 'espaces : client, gérant, livreur'], ['1', 'base de code Android et iOS']],
      features: [
        ['Paiement mobile', 'T-Money, Flooz ou espèces, avec une référence de paiement que le gérant vérifie.'],
        ['QR code de livraison', 'Chaque commande génère un code que le livreur scanne à la remise : la commande passe à « Livrée ».'],
        ['Espaces gérant et livreur', 'Le gérant gère commandes, menu, livreurs et codes promo ; le livreur ne voit que les livraisons qui lui sont confiées.'],
        ['Notifications push', 'Des Cloud Functions en TypeScript préviennent le gérant à chaque commande et à chaque paiement à vérifier.'],
        ['Carte de livraison', 'Le client place un repère sur une carte OpenStreetMap ; le livreur ouvre l’itinéraire dans Google Maps.'],
        ['Codes promo', 'Réductions en pourcentage ou en montant fixe, avec panier minimum, contrôlées par les règles de sécurité Firestore.'],
        ['Mode démo', 'Sans configuration Firebase, l’application démarre avec un menu et des commandes d’exemple.'],
        ['Qualité continue', 'Analyse du code et tests automatiques sur chaque pull request, APK reconstruit automatiquement.']
      ],
      links: [
        { t: 'Code source', h: GH + 'Food-YOKFA', ic: 'github' },
        { t: 'Télécharger l’APK de démo', h: GH + 'Food-YOKFA/releases/download/apk-demo/food-yokfa.apk', ic: 'arrow' }
      ],
      visual: { type: 'mosaic' },
      preview: IMG + 'yokfa-accueil.jpg',
      credit: 'Aperçu composé à partir des visuels de l’application (photos de plats Unsplash, libres de droits, photographes cités dans le dépôt). L’application est en cours de développement : les vraies captures viendront avec la prochaine version.'
    },
    {
      id: 'freeapi-hub', no: '02', title: 'FreeAPI Hub', kind: 'Application web', year: '2026',
      status: 'En ligne', featured: true,
      colors: ['#6366f1', '#facc15', '#0b1020'],
      tagline: 'Le catalogue des APIs gratuites : explorer, tester, et créer la sienne.',
      summary: 'Plateforme web qui répertorie 106 APIs gratuites réparties en 13 catégories (météo, finance, IA, jeux vidéo, musique, sport, actualités, géolocalisation, santé…). On recherche, on filtre par catégorie ou par type d’authentification, on consulte la fiche détaillée de chaque API, ou on crée la sienne en trois étapes.',
      stack: ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Supabase', 'Render'],
      facts: [['106', 'APIs répertoriées'], ['13', 'catégories'], ['3', 'étapes pour créer une API']],
      features: [
        ['Recherche et filtres', 'Recherche libre, filtre par catégorie et par type d’authentification (sans auth, clé API…).'],
        ['Fiche détaillée', 'Endpoint de base, limites d’utilisation, exemple de requête à copier, avis et notes.'],
        ['Création guidée', 'Un assistant en trois étapes : informations, fournisseur et clé, endpoints.'],
        ['Comptes et tableau de bord', 'Authentification des utilisateurs avec Supabase et espace personnel.'],
        ['Thème clair et sombre', 'Bascule instantanée, interface pensée pour les deux modes.']
      ],
      links: [
        { t: 'Voir en ligne', h: 'https://freeapi-hub.onrender.com/', ic: 'arrow' },
        { t: 'Code source', h: GH + 'freeapi-hub', ic: 'github' }
      ],
      visual: { type: 'browser', url: 'freeapi-hub.onrender.com', shots: ['fah-home.webp', 'fah-catalogue.webp'], alts: ['Page d’accueil de FreeAPI Hub', 'Catalogue des APIs avec recherche et filtres'] },
      gallery: [['fah-catalogue.webp', 'Catalogue : recherche, filtres et 106 APIs'], ['fah-detail.webp', 'Fiche détaillée d’une API'], ['fah-create.webp', 'Création d’une API en trois étapes']],
      preview: IMG + 'fah-home.webp'
    },
    {
      id: 'reactcour', no: '03', title: 'ReactCour', kind: 'Application web', year: '2025',
      status: 'En ligne', featured: true,
      colors: ['#7c3aed', '#a78bfa', '#170a33'],
      tagline: 'Transcrire un cours en direct, sans que rien ne quitte l’appareil.',
      summary: 'Application de transcription 100 % locale : on choisit la langue (français, anglais, espagnol ou allemand), on donne un titre au cours, et la transcription s’affiche en direct pendant que le professeur parle. Les cours se sauvegardent, se retrouvent par recherche et s’exportent en PDF ou en DOCX. Toutes les données restent dans le navigateur.',
      stack: ['HTML', 'CSS', 'JavaScript', 'Web Speech API', 'jsPDF', 'docx'],
      facts: [['4', 'langues de transcription'], ['2', 'formats d’export : PDF et DOCX'], ['100%', 'local, aucune donnée envoyée']],
      features: [
        ['Transcription en direct', 'Reconnaissance vocale du navigateur, avec démarrage, pause et arrêt.'],
        ['Cours sauvegardés', 'Enregistrement local, recherche par titre et tri par date.'],
        ['Export PDF et DOCX', 'Le texte transcrit se télécharge dans le format de son choix.'],
        ['Tableau de bord local', 'Compteurs d’événements et activités récentes, avec export ou effacement des données.'],
        ['Panneau administrateur', 'Un espace dédié pour gérer les données de l’application.']
      ],
      links: [
        { t: 'Voir en ligne', h: 'https://romanus16.github.io/ReactCour/', ic: 'arrow' },
        { t: 'Code source', h: GH + 'ReactCour', ic: 'github' },
        { t: 'Dépôt V2', h: GH + 'ReactCour-V2', ic: 'github' }
      ],
      visual: { type: 'browser', url: 'romanus16.github.io/ReactCour', shots: ['rc-home.webp', 'rc-stats.webp'], alts: ['Écran de transcription de ReactCour', 'Tableau de bord local de ReactCour'] },
      gallery: [['rc-cours.webp', 'Cours sauvegardés'], ['rc-stats.webp', 'Tableau de bord local']],
      preview: IMG + 'rc-home.webp'
    },
    {
      id: 'delice-gourmet', no: '04', title: 'Délice & Gourmet', kind: 'Application de bureau', year: '2026',
      status: 'Code source', featured: true,
      colors: ['#7b2d8e', '#f5b942', '#1c0f12'],
      tagline: 'La gestion d’un restaurant, des produits au stock, dans une application Java.',
      summary: 'Application de bureau en Java (Swing, NetBeans) pour gérer un restaurant : écran de connexion, tableau de bord, catégories, produits, commandes, mouvements de stock et statistiques. Le code est organisé en trois couches, métier, accès aux données et interface, et s’appuie sur une base MySQL.',
      stack: ['Java', 'Swing', 'NetBeans', 'MySQL', 'JDBC', 'DAO'],
      facts: [['6', 'modules : catégories, produits, commandes, stock, statistiques, tableau de bord'], ['3', 'couches : Business, DAO, view'], ['1', 'base MySQL']],
      features: [
        ['Catalogue', 'Gestion des catégories et des produits.'],
        ['Commandes', 'Commandes composées de lignes de commande.'],
        ['Mouvements de stock', 'Suivi des entrées et des sorties de stock.'],
        ['Statistiques', 'Tableau de bord et panneau de statistiques.'],
        ['Utilisateurs', 'Écran de connexion et gestion des utilisateurs.'],
        ['Architecture en couches', 'Classes métier, objets d’accès aux données (DAO) et interface séparés, avec une gestion d’erreurs dédiée.']
      ],
      links: [{ t: 'Code source', h: GH + 'PROJET-JAVA', ic: 'github' }],
      visual: { type: 'desktop' },
      preview: IMG + 'java-fond.jpg',
      credit: 'Écran de connexion recomposé à partir du fond, du logo et des libellés de l’application.'
    },
    {
      id: 'iai-togo', no: '05', title: 'IAI-Togo', kind: 'Plateforme · API back-end', year: '2026',
      status: 'Projet académique', featured: true,
      colors: ['#2563eb', '#fbbf24', '#0a1226'],
      tagline: 'Une API pour partager, modérer et retrouver les ressources de cours.',
      summary: 'Back-end d’une plateforme destinée aux étudiants de l’IAI : une API REST Django qui gère les comptes, les filières et les matières, le dépôt de ressources de cours (archives ZIP) et de documents de stage, avec un circuit de validation par les administrateurs et des statistiques.',
      stack: ['Python', 'Django 5', 'Django REST Framework', 'JWT', 'PostgreSQL', 'Cloudinary'],
      facts: [['15', 'routes d’API'], ['7', 'modèles de données'], ['3', 'statuts de modération possibles']],
      features: [
        ['Authentification JWT', 'Inscription, connexion et profil, avec un modèle utilisateur sur mesure.'],
        ['Filières, matières, étudiants', 'Organisation académique des contenus.'],
        ['Dépôt de ressources', 'Envoi d’archives ZIP stockées sur Cloudinary, avec version et compteur de téléchargements.'],
        ['Modération', 'File d’attente, validation par un administrateur, motif de refus conservé.'],
        ['Documents de stage', 'Dépôt et consultation de documents dédiés aux stages.'],
        ['Statistiques', 'Un point d’entrée pour les chiffres clés de la plateforme.']
      ],
      links: [{ t: 'Code source', h: GH + 'PROJET-Conception-APPLI-Epreuve-IAI', ic: 'github' }],
      visual: { type: 'terminal' },
      preview: null,
      credit: 'Les routes affichées proviennent du fichier urls.py du dépôt. Ce projet est un back-end : il n’a pas d’interface à capturer.'
    },
    {
      id: 'portfolio', no: '06', title: 'Ce portfolio', kind: 'Site web', year: '2025 — 2026',
      status: 'En ligne', featured: false,
      colors: ['#ff6b35', '#ffd54f', '#1a0d05'],
      tagline: 'Le site que vous parcourez : zéro framework, zéro dépendance.',
      summary: 'Site statique en HTML, CSS et JavaScript natif. Défilement fluide inertiel, fond WebGL généré par un shader, transitions plein écran entre la vitrine et les études de cas, thèmes clair et sombre. Aucune bibliothèque : seules les polices sont chargées depuis l’extérieur.',
      stack: ['HTML', 'CSS', 'JavaScript', 'WebGL'],
      facts: [['0', 'dépendance JavaScript'], ['2', 'thèmes, clair et sombre'], ['100%', 'adapté mobile et clavier']],
      features: [
        ['Défilement inertiel', 'Un moteur maison, désactivé quand on préfère les animations réduites.'],
        ['Fond WebGL', 'Un shader GLSL qui réagit à la souris, avec repli propre si WebGL est absent.'],
        ['Étude de cas en transition', 'La page s’ouvre depuis la carte cliquée, avec une adresse partageable.'],
        ['Thème en transition circulaire', 'Le changement de thème s’étend depuis le bouton cliqué.']
      ],
      links: [
        { t: 'Voir en ligne', h: 'https://romanus16.github.io/portefeuille/', ic: 'arrow' },
        { t: 'Code source', h: GH + 'portefeuille', ic: 'github' }
      ],
      visual: { type: 'browser', url: 'romanus16.github.io/portefeuille', shots: ['portfolio-home.webp'], alts: ['Page d’accueil de ce portfolio'] },
      preview: IMG + 'portfolio-home.webp'
    },
    {
      id: 'movirmc', no: '07', title: 'MoviRmc', kind: 'Site web', year: '2026', status: 'Bientôt', soon: true,
      stack: ['Streaming'], tagline: 'Un site de streaming.', colors: ['#e11d48', '#f472b6', '#2d0714']
    },
    {
      id: 'menuiserie', no: '08', title: 'Menuiserie de papa', kind: 'Site vitrine', year: '2026', status: 'Bientôt', soon: true,
      stack: ['Site web'], tagline: 'Site web pour l’atelier de menuiserie de mon père.', colors: ['#b7791f', '#e9c27a', '#26170a']
    }
  ];

  /* ---------------------------------------------------------------------
     Helpers
     --------------------------------------------------------------------- */
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var ico = function (n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; };
  var byId = {}; PROJECTS.forEach(function (p) { byId[p.id] = p; });
  var cases = PROJECTS.filter(function (p) { return !p.soon; });
  var colorVars = function (p) { return '--c1:' + p.colors[0] + ';--c2:' + p.colors[1] + ';--c3:' + p.colors[2]; };

  /* ---------------------------------------------------------------------
     Visuels : chaque projet a le sien (capture réelle, visuels de l'app, etc.)
     --------------------------------------------------------------------- */
  function browser(p, big) {
    var v = p.visual, shots = v.shots;
    var main = '<div class="frame frame-main"><div class="frame-bar"><i></i><i></i><i></i><span class="frame-url">' + esc(v.url) + '</span></div>'
      + '<div class="frame-screen"><img data-par src="' + IMG + shots[0] + '" alt="' + esc(v.alts[0]) + '" loading="lazy" decoding="async"></div></div>';
    var second = '';
    if (shots[1] && !big) {
      second = '<div class="frame frame-2"><div class="frame-bar"><i></i><i></i><i></i></div>'
        + '<div class="frame-screen"><img data-par src="' + IMG + shots[1] + '" alt="' + esc(v.alts[1]) + '" loading="lazy" decoding="async"></div></div>';
    }
    return main + second;
  }

  function mosaic() {
    return '<div class="mosaic">'
      + '<div class="mo mo-a"><img src="' + IMG + 'yokfa-accueil.jpg" alt="Photo de plats utilisée dans l’application" loading="lazy" decoding="async"><span class="mo-tag">Accueil</span></div>'
      + '<div class="mo mo-b"><img src="' + IMG + 'yokfa-cat-nourriture.jpg" alt="" loading="lazy" decoding="async"><span class="mo-tag">Nourriture</span></div>'
      + '<div class="mo mo-c"><img src="' + IMG + 'yokfa-cat-boissons.jpg" alt="" loading="lazy" decoding="async"><span class="mo-tag">Boissons</span></div>'
      + '<div class="mo mo-d"><img src="' + IMG + 'yokfa-cat-desserts.jpg" alt="" loading="lazy" decoding="async"><span class="mo-tag">Desserts</span></div>'
      + '<div class="mo-chip mo-pay"><b>T-Money</b><b>Flooz</b></div>'
      + '<div class="mo-chip mo-qr" aria-hidden="true"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm10-2h2v2h-2zm4 0h2v4h-4v-2h2zm-6 4h2v4h-2zm4 2h4v2h-4z"/></svg><span>QR de livraison</span></div>'
      + '</div>';
  }

  function desktop() {
    return '<div class="frame frame-desk"><div class="frame-bar"><i></i><i></i><i></i><span class="frame-url">Délice &amp; Gourmet — Gestion du restaurant</span></div>'
      + '<div class="desk-screen"><img data-par class="desk-bg" src="' + IMG + 'java-fond.jpg" alt="" loading="lazy" decoding="async">'
      + '<div class="desk-login"><img src="' + IMG + 'java-logo.jpg" alt="Logo Délice &amp; Gourmet" loading="lazy" decoding="async">'
      + '<b class="desk-title">PAGE DE CONNEXION</b>'
      + '<label class="desk-lab">LOGIN :<span class="desk-field"></span></label><label class="desk-lab">PASSWORD :<span class="desk-field"></span></label>'
      + '<span class="desk-btn">VALIDER</span></div></div></div>';
  }

  function terminal() {
    var routes = [
      ['auth/register/', 'inscription'], ['auth/login/', 'connexion · JWT'], ['auth/me/', 'profil'],
      ['filieres/', 'filières'], ['matieres/', 'matières'], ['ressources/', 'ressources'],
      ['ressources/en-attente/', 'file de modération'], ['ressources/&lt;id&gt;/valider/', 'validation'],
      ['upload/ressource/', 'dépôt d’un ZIP'], ['documents/', 'documents de stage'], ['stats/', 'statistiques']
    ];
    return '<div class="frame frame-term"><div class="frame-bar"><i></i><i></i><i></i><span class="frame-url">BACKEND / api / urls.py</span></div>'
      + '<div class="term-screen"><p class="term-h"><span class="t-k">path</span>(<span class="t-s">route</span>)<span class="t-c">  # routes réelles de l’API</span></p>'
      + routes.map(function (r, i) { return '<p class="term-l" style="--i:' + i + '"><span class="t-s">' + r[0] + '</span><span class="t-c">' + r[1] + '</span></p>'; }).join('')
      + '<p class="term-l term-cur"><span class="t-k">$</span> python manage.py runserver<i class="caret"></i></p></div></div>';
  }

  function visualHTML(p, big) {
    var t = p.visual.type;
    return t === 'browser' ? browser(p, big) : t === 'mosaic' ? mosaic() : t === 'desktop' ? desktop() : terminal();
  }

  /* ---------------------------------------------------------------------
     Vitrine : panneaux empilés + index
     --------------------------------------------------------------------- */
  function panelHTML(p, i) {
    var tags = p.stack.slice(0, 5).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
    var ext = p.links.filter(function (l) { return l.ic === 'github'; })[0];
    return '<article class="c3d-card" data-idx="' + i + '" style="--i:' + i + ';' + colorVars(p) + '" aria-labelledby="pt-' + p.id + '">'
      + '<div class="panel-card" data-spot>'
      + '<span class="panel-no" aria-hidden="true">' + p.no + '</span>'
      + '<div class="panel-copy">'
      + '<div class="p-kicker"><span>' + esc(p.kind) + '</span><span>' + esc(p.year) + '</span></div>'
      + '<h3 class="p-title" id="pt-' + p.id + '">' + esc(p.title) + '</h3>'
      + '<p class="p-lead">' + esc(p.tagline) + '</p>'
      + '<ul class="p-tags">' + tags + '</ul>'
      + '<div class="p-actions">'
      + '<a class="btn btn-primary" href="#projet/' + p.id + '" data-open="' + p.id + '" data-magnetic>Étude de cas<span class="btn-ic">' + ico('arrow') + '</span></a>'
      + (ext ? '<a class="btn btn-ghost" href="' + ext.h + '" target="_blank" rel="noopener" data-magnetic>' + ico('github') + 'Code</a>' : '')
      + '</div></div>'
      + '<a class="panel-visual" href="#projet/' + p.id + '" data-open="' + p.id + '" data-cursor="Ouvrir" data-tilt aria-label="Ouvrir l’étude de cas : ' + esc(p.title) + '">' + visualHTML(p, false) + '</a>'
      + '</div></article>';
  }

  function rowHTML(p, i) {
    var rv = ' data-reveal="flip" style="--d:' + ((i || 0) * 0.07).toFixed(2) + 's"';
    var stack = p.stack.slice(0, 3).join(' · ');
    var inner = '<span class="r-no">' + p.no + '</span><span class="r-title">' + esc(p.title) + '</span><span class="r-type">' + esc(p.kind) + '</span>'
      + '<span class="r-stack">' + esc(stack) + '</span><span class="r-year">' + esc(p.year) + '</span>'
      + (p.soon ? '<span class="r-go r-soon">Bientôt</span>' : '<span class="r-go">' + ico('arrow') + '</span>');
    if (p.soon) return '<div class="row is-soon"' + rv + ' aria-label="' + esc(p.title) + ' : bientôt">' + inner + '</div>';
    return '<a class="row"' + rv + ' href="#projet/' + p.id + '" data-open="' + p.id + '" data-cursor="Ouvrir"' + (p.preview ? ' data-preview="' + p.preview + '"' : '') + '>' + inner + '</a>';
  }

  var stackEl = document.getElementById('stack');
  var indexEl = document.getElementById('index');
  /* Carrousel 3D : les projets vedettes sont posés sur un cylindre qui tourne avec le scroll (voir main.js et style.css, .c3d). */
  var featured = PROJECTS.filter(function (p) { return p.featured; });
  if (stackEl) {
    var dots = featured.map(function (p, i) {
      return '<button type="button" class="c3d-dot" data-goto="' + i + '" aria-label="Aller au projet ' + esc(p.title) + '"><i></i></button>';
    }).join('');
    stackEl.innerHTML = '<div class="c3d" id="c3d" style="--n:' + featured.length + '">'
      + '<div class="c3d-pin"><div class="c3d-stage"><div class="c3d-ring" id="c3dRing">' + featured.map(panelHTML).join('') + '</div></div>'
      + '<div class="c3d-hud"><span class="c3d-count"><b id="c3dNum">01</b> / ' + String(featured.length).padStart(2, '0') + '</span>'
      + '<div class="c3d-dots">' + dots + '</div><span class="c3d-hint">Faites défiler : le cylindre tourne</span></div></div></div>';
  }
  if (indexEl) indexEl.innerHTML = PROJECTS.map(rowHTML).join('');

  /* ---------------------------------------------------------------------
     Étude de cas (page plein écran)
     --------------------------------------------------------------------- */
  var caseEl = document.getElementById('case');
  var scrollEl = document.getElementById('caseScroll');
  var current = null, lastFocus = null, origin = null, busy = false, pushed = false;
  var EASE = 'cubic-bezier(.76,0,.24,1)';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function caseHTML(p) {
    var i = cases.indexOf(p), next = cases[(i + 1) % cases.length], prev = cases[(i - 1 + cases.length) % cases.length];
    var meta = '<dl class="case-meta">'
      + '<div><dt>Type</dt><dd>' + esc(p.kind) + '</dd></div>'
      + '<div><dt>Année</dt><dd>' + esc(p.year) + '</dd></div>'
      + '<div><dt>Statut</dt><dd>' + esc(p.status) + '</dd></div>'
      + '<div><dt>Technologies</dt><dd><ul class="p-tags">' + p.stack.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul></dd></div>'
      + '</dl>';
    var links = '<div class="p-actions">' + p.links.map(function (l, k) {
      return '<a class="btn ' + (k === 0 ? 'btn-primary' : 'btn-ghost') + '" href="' + l.h + '" target="_blank" rel="noopener" data-magnetic>'
        + (k === 0 ? esc(l.t) + '<span class="btn-ic">' + ico('arrow') + '</span>' : ico(l.ic) + esc(l.t)) + '</a>';
    }).join('') + '</div>';
    var facts = '<div class="case-facts">' + p.facts.map(function (f, k) {
      return '<div class="fact" data-c style="--d:' + (k * .08) + 's"><b>' + esc(f[0]) + '</b><span>' + esc(f[1]) + '</span></div>';
    }).join('') + '</div>';
    var feats = '<div class="case-feats">' + p.features.map(function (f, k) {
      return '<article class="feat" data-c style="--d:' + ((k % 3) * .08) + 's"><span class="feat-no">' + String(k + 1).padStart(2, '0') + '</span><h4>' + esc(f[0]) + '</h4><p>' + esc(f[1]) + '</p></article>';
    }).join('') + '</div>';
    var gallery = '';
    if (p.gallery) {
      gallery = '<section class="case-block"><h3 class="case-h" data-c>Aperçus</h3><div class="case-gallery">'
        + p.gallery.map(function (g, k) {
          return '<figure class="shot" data-c style="--d:' + (k * .08) + 's"><div class="frame"><div class="frame-bar"><i></i><i></i><i></i></div><div class="frame-screen"><img src="' + IMG + g[0] + '" alt="' + esc(g[1]) + '" loading="lazy" decoding="async"></div></div><figcaption>' + esc(g[1]) + '</figcaption></figure>';
        }).join('') + '</div></section>';
    }
    return '<header class="case-bar">'
      + '<button class="case-back" type="button" data-close>' + ico('arrow') + '<span>Retour</span></button>'
      + '<span class="case-count">' + p.no + ' <i>/</i> ' + String(PROJECTS.length).padStart(2, '0') + '</span>'
      + '<div class="case-nav"><button type="button" data-go="' + prev.id + '" aria-label="Projet précédent : ' + esc(prev.title) + '">' + ico('arrow') + '</button>'
      + '<button type="button" data-go="' + next.id + '" aria-label="Projet suivant : ' + esc(next.title) + '">' + ico('arrow') + '</button></div></header>'
      + '<section class="case-hero" style="' + colorVars(p) + '"><div class="case-aura" aria-hidden="true"></div><div class="case-wrap">'
      + '<div class="case-kicker" data-c><span>' + esc(p.kind) + '</span><span>' + esc(p.year) + '</span><span>' + esc(p.status) + '</span></div>'
      + '<h2 class="case-title" id="caseTitle" data-split-case>' + esc(p.title) + '</h2>'
      + '<p class="case-lead" data-c style="--d:.25s">' + esc(p.tagline) + '</p></div></section>'
      + '<div class="case-wrap"><div class="case-visual panel-visual-static" data-c style="--d:.15s;' + colorVars(p) + '">' + visualHTML(p, true) + '</div></div>'
      + '<section class="case-wrap case-info"><div class="case-sum" data-c><h3 class="case-h">Le projet</h3><p>' + esc(p.summary) + '</p>' + links + '</div><div data-c style="--d:.1s">' + meta + '</div></section>'
      + '<section class="case-wrap">' + facts + '</section>'
      + '<section class="case-wrap case-block"><h3 class="case-h" data-c>Fonctionnalités</h3>' + feats + '</section>'
      + '<div class="case-wrap">' + gallery + '</div>'
      + (p.credit ? '<div class="case-wrap"><p class="case-credit" data-c>' + esc(p.credit) + '</p></div>' : '')
      + '<a class="case-next" href="#projet/' + next.id + '" data-go="' + next.id + '" style="' + colorVars(next) + '"><span class="case-wrap"><small>Projet suivant · ' + next.no + '</small><strong>' + esc(next.title) + '</strong>' + ico('arrow') + '</span></a>';
  }

  function clipFrom(el) {
    var W = window.innerWidth, H = window.innerHeight;
    if (!el || !el.getBoundingClientRect) return 'inset(100% 0px 0px 0px round 28px)';
    var r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H || r.width < 4) return 'inset(100% 0px 0px 0px round 28px)';
    return 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, W - r.right) + 'px ' + Math.max(0, H - r.bottom) + 'px ' + Math.max(0, r.left) + 'px round 28px)';
  }

  var io = null;
  function armReveal() {
    if (io) io.disconnect();
    var els = scrollEl.querySelectorAll('[data-c]');
    if (!('IntersectionObserver' in window)) { els.forEach(function (e) { e.classList.add('in'); }); return; }
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { root: scrollEl, threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (e) { io.observe(e); });
  }

  function setInert(on) {
    ['main', '#nav', '#footer', '#mobileMenu'].forEach(function (s) {
      var el = document.querySelector(s); if (!el) return;
      if (on) { el.setAttribute('inert', ''); el.setAttribute('aria-hidden', 'true'); } else { el.removeAttribute('inert'); el.removeAttribute('aria-hidden'); }
    });
  }

  function fill(p) {
    scrollEl.innerHTML = caseHTML(p);
    scrollEl.scrollTop = 0;
    var t = scrollEl.querySelector('[data-split-case]');
    if (t && window.Site && window.Site.splitWords) window.Site.splitWords(t, 'w', 'wi');
    if (window.Site && window.Site.register) window.Site.register(caseEl);
    caseEl.style.setProperty('--c1', p.colors[0]); caseEl.style.setProperty('--c2', p.colors[1]);
  }

  function reveal() {
    caseEl.classList.add('is-in');
    var t = scrollEl.querySelector('.case-title'); if (t) t.classList.add('in');
    armReveal();
  }

  function openCase(id, opts) {
    var p = byId[id]; if (!p || p.soon || busy) return;
    opts = opts || {};
    // Déjà ouvert : on enchaîne sur un autre projet sans refermer.
    if (current) { switchTo(p, opts); return; }
    busy = true; current = p; origin = opts.from || null;
    lastFocus = document.activeElement;
    fill(p);
    if (window.Site && window.Site.lock) window.Site.lock();
    root().classList.add('case-open');
    setInert(true);
    caseEl.classList.add('is-open'); caseEl.setAttribute('aria-hidden', 'false');
    if (!opts.fromPop) { try { history.pushState({ case: id }, '', '#projet/' + id); pushed = true; } catch (e) {} }
    var from = clipFrom(origin);
    // Le focus va sur le conteneur (sans anneau visible) ; la touche Tab atteint ensuite « Retour ».
    var done = function () { caseEl.style.clipPath = ''; busy = false; reveal(); scrollEl.focus({ preventScroll: true }); };
    if (reduce || !caseEl.animate) { done(); return; }
    var a = caseEl.animate([{ clipPath: from }, { clipPath: 'inset(0px 0px 0px 0px round 0px)' }], { duration: 950, easing: EASE });
    caseEl.style.clipPath = 'inset(0px 0px 0px 0px round 0px)';
    setTimeout(function () { caseEl.classList.add('is-ready'); }, 380);
    a.onfinish = done; a.oncancel = done;
  }

  function switchTo(p, opts) {
    if (busy || p === current) return;
    busy = true;
    var swap = function () {
      current = p; fill(p); caseEl.classList.remove('is-in');
      if (!opts.fromPop) { try { history.replaceState({ case: p.id }, '', '#projet/' + p.id); } catch (e) {} }
      requestAnimationFrame(function () { busy = false; reveal(); });
    };
    if (reduce || !scrollEl.animate) { swap(); return; }
    var out = scrollEl.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateY(-24px)' }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    out.onfinish = function () {
      swap();
      var inn = scrollEl.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' });
      out.cancel(); inn.onfinish = function () { inn.cancel(); };
    };
  }

  function closeCase(opts) {
    if (!current || busy) return;
    opts = opts || {};
    // Si l'ouverture a ajouté une entrée d'historique, on la retire : popstate s'occupera du reste.
    if (!opts.fromPop && pushed) { pushed = false; history.back(); return; }
    busy = true;
    caseEl.classList.remove('is-in', 'is-ready');
    var finish = function () {
      caseEl.classList.remove('is-open'); caseEl.setAttribute('aria-hidden', 'true'); caseEl.style.clipPath = '';
      root().classList.remove('case-open'); setInert(false);
      if (window.Site && window.Site.unlock) window.Site.unlock();
      scrollEl.innerHTML = ''; current = null; busy = false; pushed = false;
      if (lastFocus && lastFocus.focus) { try { lastFocus.focus({ preventScroll: true }); } catch (e) {} }
      if (location.hash.indexOf('#projet/') === 0) { try { history.replaceState(null, '', location.pathname + location.search + '#projets'); } catch (e) {} }
    };
    if (reduce || !caseEl.animate) { finish(); return; }
    var to = clipFrom(origin);
    var a = caseEl.animate([{ clipPath: 'inset(0px 0px 0px 0px round 0px)' }, { clipPath: to }], { duration: 800, easing: EASE });
    caseEl.style.clipPath = to;
    a.onfinish = finish; a.oncancel = finish;
  }

  function root() { return document.documentElement; }

  function fromHash() {
    var m = /^#projet\/([a-z0-9-]+)$/.exec(location.hash);
    return m && byId[m[1]] && !byId[m[1]].soon ? m[1] : null;
  }

  window.addEventListener('popstate', function () {
    var id = fromHash();
    if (id) { if (!current) openCase(id, { fromPop: true }); else switchTo(byId[id], { fromPop: true }); }
    else if (current) closeCase({ fromPop: true });
  });

  document.addEventListener('click', function (e) {
    var open = e.target.closest && e.target.closest('[data-open]');
    if (open) { e.preventDefault(); openCase(open.getAttribute('data-open'), { from: open.closest('.panel-visual, .row, .btn') || open }); return; }
    var go = e.target.closest && e.target.closest('[data-go]');
    if (go && caseEl.contains(go)) { e.preventDefault(); switchTo(byId[go.getAttribute('data-go')], {}); return; }
    var cl = e.target.closest && e.target.closest('[data-close]');
    if (cl) { e.preventDefault(); closeCase(); }
  });

  document.addEventListener('keydown', function (e) {
    if (!current) return;
    if (e.key === 'Escape') { e.preventDefault(); closeCase(); return; }
    if (e.key === 'Tab') { // piège à focus
      var f = Array.prototype.slice.call(caseEl.querySelectorAll('a[href], button:not([disabled])')).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  window.Projects = {
    data: PROJECTS,
    open: openCase,
    close: closeCase,
    openFromHash: function () { var id = fromHash(); if (id) openCase(id, { fromPop: true }); }
  };
})();
