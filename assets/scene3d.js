/* ==========================================================================
   Scène 3D du portfolio — Three.js r186 (module ES, aucune dépendance externe)
   Un seul objet vedette (« noyau » métallique déformé par un shader), des anneaux
   et nœuds orbitaux, un halo et de la poussière en profondeur. La caméra suit le
   scroll : l'objet glisse d'une section à l'autre puis s'efface derrière les projets.
   ========================================================================== */
import * as THREE from './vendor/three/three.module.js';

const root = document.documentElement;
const canvas = document.getElementById('stage3d');
const FORCE = /[?&]gl=force/.test(location.search); // ?gl=force : désactive les garde-fous de performance (tests)
const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
const coarse = window.matchMedia('(pointer: coarse)').matches;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
const easeOutExpo = (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));

function fail(reason) {
  root.classList.add('no-3d');
  window.__scene3d = 'off';
  if (reason && window.console) console.warn('[3D] désactivé :', reason);
}

try { init(); } catch (e) { fail(e && e.message); }

function init() {
  if (!canvas) return fail('canvas absent');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: window.devicePixelRatio < 2, stencil: false, powerPreference: 'default' });
  } catch (e) { return fail('WebGL indisponible'); }

  /* ---------- État partagé ---------- */
  let dprCap = coarse ? 1.5 : 1.75;
  let quality = 0; // 0 = plein, 1 = résolution réduite
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const FOV = 32, CAM = 9;
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 80);
  camera.position.set(0, 0, CAM);
  const halfH = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * CAM;
  let halfW = halfH, aspect = 1, vw = 1, vh = 1;

  const isLight = () => root.getAttribute('data-theme') === 'light';

  /* ---------- Environnement : un « studio » généré, pour des reflets crédibles ---------- */
  (function buildEnvironment() {
    const env = new THREE.Scene();
    env.add(new THREE.Mesh(new THREE.BoxGeometry(24, 24, 24), new THREE.MeshBasicMaterial({ color: 0x0b0806, side: THREE.BackSide })));
    const panel = (w, h, color, power, x, y, z) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }));
      m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
    };
    panel(10, 5, 0xffffff, 7, -5, 7, 6);       // grande boîte à lumière blanche, en haut à gauche
    panel(2.2, 10, 0xff6b35, 6.5, 9, 1, 3);    // fin bandeau braise, à droite
    panel(10, 1.8, 0xffb547, 3.5, 0, -8, 5);   // bandeau ambre au sol
    panel(6, 6, 0x8f2a12, 2, -9, -2, -5);      // rouge profond, derrière à gauche
    panel(6, 1.2, 0xfff1e0, 9, 2, 8, -4);      // fine ligne de lumière chaude
    panel(16, 11, 0x9a7f6c, 3.4, 0, 0, 11);    // grand fond chaud face à la caméra : évite un centre noir
    panel(5, 5, 0xe9edf5, 3.2, -2, -1, 9);     // petit reflet froid, pour le contraste
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    env.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
  })();

  /* ---------- Noyau : sphère déformée par un bruit simplex (shader injecté dans un matériau PBR) ---------- */
  const NOISE = /* glsl */ `
    vec3 mod289(vec3 x){return x-floor(x*(1./289.))*289.;}
    vec4 mod289(vec4 x){return x-floor(x*(1./289.))*289.;}
    vec4 permute(vec4 x){return mod289(((x*34.)+1.)*x);}
    vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
    float snoise(vec3 v){
      const vec2 C=vec2(1./6.,1./3.); const vec4 D=vec4(0.,.5,1.,2.);
      vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
      vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
      vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
      i=mod289(i);
      vec4 p=permute(permute(permute(i.z+vec4(0.,i1.z,i2.z,1.))+i.y+vec4(0.,i1.y,i2.y,1.))+i.x+vec4(0.,i1.x,i2.x,1.));
      float n_=.142857142857; vec3 ns=n_*D.wyz-D.xzx;
      vec4 j=p-49.*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.*x_);
      vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.-abs(x)-abs(y);
      vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
      vec4 s0=floor(b0)*2.+1.; vec4 s1=floor(b1)*2.+1.; vec4 sh=-step(h,vec4(0.));
      vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
      vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
      vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
      p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
      vec4 m=max(.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.); m=m*m;
      return 42.*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
    }
    uniform float uTime; uniform float uAmp; uniform float uFreq; uniform float uHover; uniform vec3 uPoint;
    uniform float uShockT; uniform float uShockAmp; uniform vec3 uShockDir;
    float dispAt(vec3 p){
      float n = snoise(p * uFreq + vec3(0., uTime * .17, uTime * .06)) * .62 + snoise(p * uFreq * 2.3 - vec3(uTime * .2, 0., 0.)) * .2;
      float bulge = uHover * pow(max(dot(p, uPoint), 0.), 5.) * .5;
      // onde de choc : un anneau qui part du point cliqué et fait le tour de la sphère
      float sd = acos(clamp(dot(p, uShockDir), -1., 1.));
      float ring = exp(-pow((sd - uShockT * 2.4) * 3.4, 2.)) * uShockAmp * exp(-uShockT * 1.5);
      return n * uAmp + bulge + ring * .3;
    }
    vec3 dpos(vec3 p){ return p * (1. + dispAt(p)); }
  `;

  // Métal liquide : un titane clair légèrement chaud, qui reflète le « studio » ci-dessus ; un vernis net par-dessus.
  const coreMat = new THREE.MeshPhysicalMaterial({
    color: 0xb9aa9c, metalness: 1, roughness: 0.2, transparent: true,
    clearcoat: 0.35, clearcoatRoughness: 0.06,
  });
  const U = {
    uTime: { value: 0 }, uAmp: { value: 0.07 }, uFreq: { value: 1.05 }, uHover: { value: 0 }, uPoint: { value: new THREE.Vector3(0, 0, 1) }, uShockT: { value: 99 }, uShockAmp: { value: 0 }, uShockDir: { value: new THREE.Vector3(0, 0, 1) },
    uRim: { value: 0.42 }, uRimColor: { value: new THREE.Color(0xff7a45) },
  };
  coreMat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, U);
    shader.vertexShader = NOISE + shader.vertexShader
      .replace('#include <beginnormal_vertex>', /* glsl */ `
        vec3 sp = normalize(position);
        vec3 tA = normalize(cross(sp, abs(sp.y) < .99 ? vec3(0., 1., 0.) : vec3(1., 0., 0.)));
        vec3 tB = normalize(cross(sp, tA));
        vec3 q0 = dpos(sp); vec3 q1 = dpos(normalize(sp + tA * .012)); vec3 q2 = dpos(normalize(sp + tB * .012));
        vec3 objectNormal = normalize(cross(q1 - q0, q2 - q0));
        if (dot(objectNormal, sp) < 0.) objectNormal = -objectNormal;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif
      `)
      .replace('#include <begin_vertex>', 'vec3 transformed = q0 * length(position);');
    shader.fragmentShader = 'uniform float uRim; uniform vec3 uRimColor;\n' + shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      /* glsl */ `
        #include <emissivemap_fragment>
        float fres = pow(1. - saturate(dot(normalize(vViewPosition), normal)), 3.);
        totalEmissiveRadiance += uRimColor * fres * uRim;
      `);
  };
  const coreDetail = coarse ? 26 : 38;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1, coreDetail), coreMat);

  /* ---------- Cage filaire, anneaux, nœuds, halo ---------- */
  const cageMat = new THREE.MeshBasicMaterial({ color: 0xff8a50, wireframe: true, transparent: true, opacity: 0.13, blending: THREE.AdditiveBlending, depthWrite: false });
  const cage = new THREE.Mesh(new THREE.IcosahedronGeometry(1.14, 3), cageMat);

  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  const ringA = new THREE.Group(); const ringB = new THREE.Group();
  ringA.add(new THREE.Mesh(new THREE.TorusGeometry(1.46, 0.006, 6, 220), ringMat));
  ringB.add(new THREE.Mesh(new THREE.TorusGeometry(1.74, 0.0045, 6, 240), ringMat));
  ringA.rotation.x = Math.PI / 2 + 0.38; ringB.rotation.x = Math.PI / 2 - 0.62; ringB.rotation.y = 0.5;

  const NODES = 9;
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xffd9a8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 12, 8), nodeMat, NODES);
  nodes.frustumCulled = false; ringA.add(nodes);
  const dummy = new THREE.Object3D();

  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.28, 'rgba(255,255,255,.42)'); gr.addColorStop(0.6, 'rgba(255,255,255,.1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glowMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xff6b35, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Sprite(glowMat); glow.scale.setScalar(6.4); glow.position.z = -1.2;

  const rig = new THREE.Group();
  rig.add(glow, core, cage, ringA, ringB);
  scene.add(rig);

  /* ---------- Poussière en profondeur ---------- */
  const DUST = coarse ? 420 : 900;
  const dustGeo = new THREE.BufferGeometry();
  {
    const pos = new Float32Array(DUST * 3), size = new Float32Array(DUST), tint = new Float32Array(DUST);
    for (let i = 0; i < DUST; i++) {
      const r = 2.6 + Math.pow(Math.random(), 0.7) * 8, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th) * 1.5; pos[i * 3 + 1] = r * Math.cos(ph) * 0.85; pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th) - 2;
      size[i] = 0.4 + Math.random() * 1.6; tint[i] = Math.random();
    }
    dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    dustGeo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    dustGeo.setAttribute('aTint', new THREE.BufferAttribute(tint, 1));
  }
  const dustMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uPixel: { value: renderer.getPixelRatio() }, uOpacity: { value: 0.8 }, uA: { value: new THREE.Color(0xff6b35) }, uB: { value: new THREE.Color(0xffd9a8) } },
    vertexShader: /* glsl */ `
      attribute float aSize; attribute float aTint; uniform float uTime; uniform float uPixel;
      varying float vTint; varying float vTw;
      void main(){
        vec3 p = position;
        p.y += sin(uTime * .25 + position.x * 1.3) * .12; p.x += cos(uTime * .2 + position.y * 1.7) * .1;
        vec4 mv = modelViewMatrix * vec4(p, 1.);
        gl_PointSize = min(aSize * uPixel * (24. / -mv.z), 6. * uPixel);
        vTint = aTint; vTw = .55 + .45 * sin(uTime * (.6 + aTint * 1.4) + aTint * 40.);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uA; uniform vec3 uB; uniform float uOpacity; varying float vTint; varying float vTw;
      void main(){
        float d = length(gl_PointCoord - .5); if (d > .5) discard;
        float a = smoothstep(.5, 0., d) * vTw * uOpacity;
        gl_FragColor = vec4(mix(uA, uB, vTint), a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- Sphère de compétences : des étiquettes réparties sur une sphère (Fibonacci), autour du noyau ---------- */
  const ORB_R = 1.5, SKH = 0.17;
  const SKILLS = [
    ['Python', 0], ['Java', 0], ['JavaScript', 0], ['TypeScript', 0], ['Dart', 0], ['PHP', 0], ['HTML', 0], ['CSS', 0],
    ['Machine Learning', 1], ['NLP', 1], ['Vision', 1], ['Réseaux de neurones', 1],
    ['Photoshop', 2], ['Canva', 2],
    ['Flutter', 3], ['React', 3], ['Django', 3], ['Laravel', 3], ['Flask', 3], ['MongoDB', 3], ['Firebase', 3], ['Git', 3], ['MySQL', 3], ['PostgreSQL', 3], ['Supabase', 3], ['Tailwind CSS', 3], ['Three.js', 3], ['WebGL', 3], ['JWT', 3], ['Node.js', 3],
  ];
  const SK_COL = { dark: ['#ff8a50', '#ffc266', '#f5efe8', '#d9b99b'], light: ['#c2410c', '#b45309', '#1c1917', '#78350f'] };
  const orb = new THREE.Group(); orb.visible = false; scene.add(orb);
  const skSprites = SKILLS.map((_, i) => {
    const n = SKILLS.length, phi = Math.acos(1 - (2 * (i + 0.5)) / n), th = Math.PI * (1 + Math.sqrt(5)) * (i + 0.5);
    const local = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).multiplyScalar(ORB_R);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    sprite.position.copy(local); orb.add(sprite);
    return { sprite, local, aspect: 3, k: 1 };
  });
  function labelTexture(text, cat, light) {
    const dpr = 2, fs = 38, padX = 30, h = 74, c = document.createElement('canvas'), g = c.getContext('2d');
    g.font = `600 ${fs}px "Inter Tight", system-ui, sans-serif`;
    const w = Math.ceil(g.measureText(text).width + padX * 2);
    c.width = w * dpr; c.height = h * dpr; g.scale(dpr, dpr);
    g.font = `600 ${fs}px "Inter Tight", system-ui, sans-serif`; g.textBaseline = 'middle';
    const col = (light ? SK_COL.light : SK_COL.dark)[cat];
    g.beginPath(); g.roundRect(2, 2, w - 4, h - 4, (h - 4) / 2);
    g.fillStyle = light ? 'rgba(255,255,255,.88)' : 'rgba(20,16,13,.82)'; g.fill();
    g.lineWidth = 2; g.strokeStyle = col + '99'; g.stroke();
    g.fillStyle = col; g.fillText(text, padX, h / 2 + 1);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, aspect: w / h };
  }
  function buildLabels() {
    const light = isLight();
    SKILLS.forEach((s, i) => {
      const o = labelTexture(s[0], s[1], light), sp = skSprites[i];
      if (sp.sprite.material.map) sp.sprite.material.map.dispose();
      sp.sprite.material.map = o.tex; sp.sprite.material.needsUpdate = true; sp.aspect = o.aspect;
    });
  }
  buildLabels();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { buildLabels(); kick(); });
  const orbEl = document.getElementById('skillsOrb');
  const anc = { x: 0, y: 0, size: 0, ok: false };
  let orbW = 0, orbHover = -1, orbSpin = 0, orbTilt = 0;

  /* ---------- Clavier de poses : où est l'objet selon le scroll (en coordonnées d'écran) ---------- */
  const A = { about: 0, skills: 0, work: 0, workEnd: 0, contact: 0 };
  const keys = []; // [{ y, x, ny, size, op, amp }]
  const secTop = (id) => { const el = document.getElementById(id); return el ? el.getBoundingClientRect().top + window.pageYOffset : 0; };
  function measure() {
    vw = window.innerWidth; vh = window.innerHeight; aspect = vw / vh; halfW = halfH * aspect;
    A.about = secTop('apropos'); A.skills = secTop('competences'); A.work = secTop('projets'); A.contact = secTop('contact');
    const w = document.getElementById('projets'); A.workEnd = A.work + (w ? w.offsetHeight : 0);
    const compact = aspect < 0.9;
    A.c3d = secTop('c3d'); const c3 = document.getElementById('c3d'); A.c3dEnd = A.c3d + (c3 ? c3.offsetHeight : 0);
    // x, ny : position normalisée (-1..1) ; size : diamètre / hauteur d'écran ; op : opacité ; amp : amplitude de la déformation
    const P = compact ? {
      hero: [0.46, 0.68, 0.27, 0.9, 0.07], about: [0.9, 0.6, 0.2, 0.4, 0.06], skills: [0.95, 0.5, 0.18, 0.3, 0.05],
      work: [0, 0.3, 0.7, 0.3, 0.06], workOut: [0, 0.3, 0.5, 0, 0.05], contact: [0, 0.35, 0.46, 0.24, 0.1],
    } : {
      hero: [0.6, 0.31, 0.45, 1, 0.07], about: [0.84, 0.14, 0.25, 0.7, 0.06], skills: [1.02, -0.02, 0.22, 0.5, 0.05],
      work: [0, 0.04, 1.02, 0.42, 0.07], workOut: [0, 0.04, 0.8, 0, 0.06], contact: [0, 0.04, 0.72, 0.26, 0.1],
    };
    const k = (y, p) => ({ y, x: p[0], ny: p[1], size: p[2], op: p[3], amp: p[4] });
    const ys = [0, A.about + vh * 0.2, A.skills + vh * 0.25, Math.max(A.c3d - vh * 0.15, A.skills + vh * 0.8), Math.max(A.c3dEnd - vh * 1.3, A.c3d), Math.max(A.c3dEnd - vh * 0.35, A.c3d + 10), Math.max(A.contact - vh * 0.9, A.c3dEnd), Math.max(A.contact - vh * 0.1, A.c3dEnd + 10)];
    const poses = [P.hero, P.about, P.skills, P.work, P.work, P.workOut, P.workOut, P.contact]; // l'objet reste caché pendant l'index et le CV
    keys.length = 0; let last = -1;
    ys.forEach((y, i) => { last = Math.max(y, last + 12); keys.push(k(last, poses[i])); });    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap) * (quality ? 0.75 : 1));
    renderer.setSize(vw, vh, false);
    camera.aspect = aspect; camera.updateProjectionMatrix();
    dustMat.uniforms.uPixel.value = renderer.getPixelRatio();
    kick();
  }
  let rto; window.addEventListener('resize', () => { clearTimeout(rto); rto = setTimeout(measure, 120); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { clearTimeout(rto); rto = setTimeout(measure, 200); }).observe(document.body);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  window.addEventListener('load', measure);

  /* ---------- Pointeur ---------- */
  const ptr = { x: 0, y: 0, active: false };
  window.addEventListener('pointermove', (e) => { ptr.x = (e.clientX / window.innerWidth) * 2 - 1; ptr.y = -((e.clientY / window.innerHeight) * 2 - 1); ptr.active = true; }, { passive: true });
  document.addEventListener('mouseleave', () => { ptr.active = false; });

  /* ---------- Thème ---------- */
  const cDark = new THREE.Color(0xb9aa9c), cLight = new THREE.Color(0x8f8378);
  let themeMix = isLight() ? 1 : 0, blendLight = null;
  function applyBlend(light) {
    if (blendLight === light) return; blendLight = light;
    const b = light ? THREE.NormalBlending : THREE.AdditiveBlending;
    [cageMat, ringMat, nodeMat, glowMat, dustMat].forEach((m) => { m.blending = b; m.needsUpdate = true; });
    cageMat.color.set(light ? 0xb8430f : 0xff8a50); ringMat.color.set(light ? 0xc2410c : 0xffb547); nodeMat.color.set(light ? 0xa3330a : 0xffd9a8);
    glowMat.color.set(light ? 0xffa06a : 0xff6b35); dustMat.uniforms.uA.value.set(light ? 0xd24a12 : 0xff6b35); dustMat.uniforms.uB.value.set(light ? 0xe08a1a : 0xffd9a8);
  }
  applyBlend(isLight());
  root.addEventListener('gl-theme', () => { applyBlend(isLight()); buildLabels(); kick(); });

  /* ---------- Boucle ---------- */
  const st = { x: 0, ny: 0, size: 0, op: 0, amp: 0 }, cur = { x: 0, ny: 0, size: 0, op: 0, amp: 0 };
  let seeded = false, prevY = window.pageYOffset, vel = 0, hover = 0, offX = 0, offY = 0, camX = 0, camY = 0;
  let introT0 = 0, introP = 0, lastTs = 0, ema = 0.016, slow = 0, running = false, drawnEmpty = false;
  let punch = 0, spinBoost = 0, spinAcc = 0, warpBoost = 0, warpTarget = 0;
  // clic sur la scène (hors liens et boutons) : onde de choc dans la matière + impulsion de rotation
  window.addEventListener('pointerdown', (e) => {
    if (noMotion || cur.op < 0.3 || (e.target.closest && e.target.closest('a, button, input, summary, .case, .c3d-card, .cv-stage'))) return;
    const pxd = (e.clientX / window.innerWidth) * 2 - 1, pyd = -((e.clientY / window.innerHeight) * 2 - 1);
    const sx = pxd * halfW - rig.position.x, sy = pyd * halfH - rig.position.y, sc = Math.max(rig.scale.x, 0.001);
    if (Math.hypot(sx, sy) / sc > 3.2) return; // trop loin du noyau
    U.uShockDir.value.set(sx, sy, sc * 0.9).normalize().applyQuaternion(qInv.copy(core.quaternion).invert());
    U.uShockT.value = 0; U.uShockAmp.value = 1; punch = 1; spinBoost = 2.6 * Math.sign(sx || 1);
  });
  const qInv = new THREE.Quaternion(), dir = new THREE.Vector3(), tmpV = new THREE.Vector3(), tmpV2 = new THREE.Vector3();
  const timer = new THREE.Timer(); timer.connect(document);
  let noMotion = reduceMQ.matches;

  function poseAt(y) {
    const n = keys.length; let i = 0;
    while (i < n - 2 && y > keys[i + 1].y) i++;
    const a = keys[i], b = keys[i + 1];
    const t = smoother(clamp((y - a.y) / Math.max(1, b.y - a.y), 0, 1));
    st.x = lerp(a.x, b.x, t); st.ny = lerp(a.ny, b.ny, t); st.size = lerp(a.size, b.size, t); st.op = lerp(a.op, b.op, t); st.amp = lerp(a.amp, b.amp, t);
  }

  function update(dt, t, instant) {
    const y = window.pageYOffset;
    vel = damp(vel, (y - prevY) / Math.max(dt, 0.001), 8, dt); prevY = y;
    poseAt(y);
    // ancre DOM de la sphère de compétences (placée par la mise en page de la page)
    anc.ok = false;
    if (orbEl && aspect >= 0.9) {
      const r = orbEl.getBoundingClientRect();
      if (r.height > 60 && r.bottom > 0 && r.top < vh) {
        anc.x = ((r.left + r.width / 2) / vw) * 2 - 1; anc.y = -(((r.top + r.height / 2) / vh) * 2 - 1);
        anc.size = Math.min(r.height * 0.82, r.width * 0.78) / vh; anc.ok = true;
      }
    }
    const wT = anc.ok ? clamp(1.25 - Math.abs(anc.y) * 1.25, 0, 1) : 0;
    orbW = instant ? wT : damp(orbW, wT, 7, dt);
    if (orbW > 0.002) { // zone Compétences : le noyau rapetisse au centre de la sphère
      st.x = lerp(st.x, anc.x, orbW); st.ny = lerp(st.ny, anc.y, orbW); st.size = lerp(st.size, anc.size * 0.3, orbW);
      st.op = lerp(st.op, 1, orbW); st.amp = lerp(st.amp, 0.05, orbW);
    }
    if (instant || !seeded) { Object.assign(cur, st); seeded = true; }
    else {
      const kp = lerp(5, 30, orbW); // suivi serré de l'ancre quand la sphère est affichée
      cur.x = damp(cur.x, st.x, kp, dt); cur.ny = damp(cur.ny, st.ny, kp, dt); cur.size = damp(cur.size, st.size, kp, dt);
      cur.op = damp(cur.op, st.op, 6, dt); cur.amp = damp(cur.amp, st.amp, 4, dt);
    }

    // intro : le noyau se forme quand le site s'ouvre
    if (noMotion) introP = 1;
    else if (root.classList.contains('ready')) { if (!introT0) introT0 = t; introP = easeOutExpo(clamp((t - introT0) / 2.8, 0, 1)); }
    const iScale = 0.5 + 0.5 * introP, iAmp = (1 - introP) * 0.6, iSpin = (1 - introP) * (1 - introP) * -3.2;

    const light = isLight(); themeMix = instant ? (light ? 1 : 0) : damp(themeMix, light ? 1 : 0, 6, dt);
    coreMat.color.copy(cDark).lerp(cLight, themeMix); coreMat.roughness = lerp(0.2, 0.28, themeMix);
    scene.environmentIntensity = lerp(1, 1.25, themeMix);
    U.uRim.value = lerp(0.42, 0.2, themeMix);

    // placement dans l'écran
    const scale = cur.size * halfH * iScale;
    rig.position.set(cur.x * halfW, cur.ny * halfH + (noMotion ? 0 : Math.sin(t * 0.7) * 0.06 * scale), 0);
    rig.scale.setScalar(Math.max(scale, 0.0001));

    // sphère de compétences : rotation, survol, profondeur
    if (orbW > 0.01 && anc.ok) {
      orb.visible = true;
      orb.position.set(anc.x * halfW, anc.y * halfH, 0);
      orb.scale.setScalar((anc.size * halfH) / ORB_R);
      const inside = ptr.active && Math.abs(ptr.x - anc.x) < 0.55 && Math.abs(ptr.y - anc.y) < 0.8;
      orbSpin += (noMotion ? 0 : dt * 0.18) + (inside ? (ptr.x - anc.x) * dt * 1.6 : 0);
      orbTilt = damp(orbTilt, inside ? -(ptr.y - anc.y) * 0.4 : 0, 3, dt);
      orb.rotation.set(noMotion ? 0.2 : orbTilt + 0.18, orbSpin + (noMotion ? 0.6 : 0), 0);
      let best = -1, bestD = 0.0085;
      for (let i = 0; i < skSprites.length; i++) {
        const sp = skSprites[i];
        tmpV.copy(sp.local).applyQuaternion(orb.quaternion);
        sp.zf = tmpV.z / ORB_R;
        if (ptr.active && !coarse && sp.zf > -0.15) {
          tmpV2.copy(tmpV).multiplyScalar(orb.scale.x).add(orb.position).project(camera);
          const dx = (tmpV2.x - ptr.x) * aspect, dy = tmpV2.y - ptr.y, d2 = dx * dx + dy * dy;
          if (d2 < bestD) { bestD = d2; best = i; }
        }
      }
      orbHover = best;
      for (let i = 0; i < skSprites.length; i++) {
        const sp = skSprites[i], hv = i === orbHover;
        sp.k = damp(sp.k, hv ? 1.35 : 1, 10, dt);
        const depth = 0.22 + 0.78 * smoother(clamp((sp.zf + 0.7) / 1.5, 0, 1));
        const sc = SKH * (0.82 + 0.26 * clamp((sp.zf + 1) / 2, 0, 1)) * sp.k;
        sp.sprite.scale.set(sc * sp.aspect, sc, 1);
        sp.sprite.material.opacity = orbW * (hv ? 1 : depth);
      }
    } else if (orb.visible) orb.visible = false;

    // réaction au pointeur : l'objet s'incline vers lui, et se bombe quand il le survole
    const px = ptr.active ? ptr.x : 0, py = ptr.active ? ptr.y : 0;
    offX = damp(offX, px, 3.2, dt); offY = damp(offY, py, 3.2, dt);
    camX = damp(camX, px * 0.22, 2.4, dt); camY = damp(camY, py * 0.14, 2.4, dt);
    camera.position.set(camX, camY, CAM); camera.lookAt(0, 0, 0);
    // vitesse : le champ de vision s'ouvre quand on défile vite (et pendant une transition warp)
    warpBoost = damp(warpBoost, warpTarget, warpTarget ? 3 : 2, dt);
    const fovT = FOV + (noMotion ? 0 : clamp(Math.abs(vel) / 170, 0, 10) + warpBoost * 34);
    if (Math.abs(camera.fov - fovT) > 0.01) { camera.fov = damp(camera.fov, fovT, 5, dt); camera.updateProjectionMatrix(); }
    punch = damp(punch, 0, 3.2, dt); spinBoost = damp(spinBoost, 0, 1.4, dt); spinAcc += spinBoost * dt;
    U.uShockT.value += dt; U.uShockAmp.value = damp(U.uShockAmp.value, 0, 0.6, dt);
    rig.scale.multiplyScalar(1 + punch * 0.14);

    const pw = px * halfW - rig.position.x, ph = py * halfH - rig.position.y;
    const dd = Math.hypot(pw, ph) / Math.max(scale, 0.001);
    const hTarget = ptr.active && !coarse ? 1 - clamp((dd - 0.9) / 1.2, 0, 1) : 0;
    hover = damp(hover, hTarget * (cur.op > 0.3 ? 1 : 0), 4.5, dt);

    const spin = noMotion ? 0.55 : t * 0.1;
    core.rotation.set(noMotion ? 0.3 : t * 0.045 - offY * 0.35, spin + offX * 0.5 + iSpin + spinAcc, 0);
    cage.rotation.set(-core.rotation.x * 0.7 + 0.2, -spin * 0.8 + iSpin * 0.5, 0.1);
    ringA.rotation.z = noMotion ? 0.4 : t * 0.14; ringB.rotation.z = noMotion ? 1 : -t * 0.1;
    for (let i = 0; i < NODES; i++) {
      const a = (noMotion ? 0 : t * 0.4) + (i / NODES) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 1.46, 0, Math.sin(a) * 1.46); dummy.scale.setScalar(0.6 + 0.4 * Math.sin(a * 3 + t));
      dummy.updateMatrix(); nodes.setMatrixAt(i, dummy.matrix);
    }
    nodes.instanceMatrix.needsUpdate = true;

    // shader du noyau
    U.uTime.value = noMotion ? 8 : t; U.uHover.value = hover;
    U.uAmp.value = cur.amp + iAmp + clamp(Math.abs(vel) / 5200, 0, 0.17); // le scroll « agite » la matière
    qInv.copy(core.quaternion).invert();
    dir.set(pw, ph, scale * 0.85).normalize().applyQuaternion(qInv); U.uPoint.value.copy(dir);

    // opacités
    const op = cur.op * clamp(introP * 1.6, 0, 1);
    coreMat.opacity = op; cageMat.opacity = 0.13 * op; ringMat.opacity = 0.55 * op; nodeMat.opacity = 0.95 * op;
    glowMat.opacity = (light ? 0.22 : 0.3) * op * (0.85 + 0.15 * Math.sin(t * 1.3));
    dustMat.uniforms.uTime.value = t; dustMat.uniforms.uOpacity.value = (0.25 + 0.75 * clamp(op * 1.2, 0, 1)) * (light ? 0.7 : 1);
    dust.rotation.y = noMotion ? 0 : t * 0.012 + offX * 0.06; dust.rotation.x = offY * 0.03;
    dust.position.y = (y * 0.0006) % 40;
    dust.scale.set(1 + punch * 0.35, 1 + punch * 0.35, 1 + clamp(Math.abs(vel) / 700, 0, 2.5) + warpBoost * 4 + punch * 0.8);
  }

  const occluded = () => {
    const y = window.pageYOffset;
    return false; // plus de section opaque : l'objet reste visible derrière le carrousel
  };

  function frame(ts) {
    timer.update(ts);
    const dt = Math.min(timer.getDelta(), 0.05), t = timer.getElapsed();
    if (root.classList.contains('lite') && !FORCE) { stop(); fail('mode allégé'); return; }
    if (!root.classList.contains('loaded')) return;
    if (!introT0 && root.classList.contains('ready')) introT0 = t;

    // surveillance de la fluidité (après l'intro) : on baisse la résolution, puis on abandonne la 3D
    if (lastTs && !FORCE && introP >= 1) {
      ema = lerp(ema, (ts - lastTs) / 1000, 0.08);
      if (ema > 0.042) slow++; else slow = Math.max(0, slow - 2);
      if (slow > 90) {
        slow = 0;
        if (quality === 0) { quality = 1; measure(); } else { stop(); fail('trop lent sur cet appareil'); return; }
      }
    }
    lastTs = ts;

    update(dt, t, false);
    if (occluded() || cur.op < 0.004) { if (!drawnEmpty) { renderer.clear(); drawnEmpty = true; } return; }
    drawnEmpty = false;
    renderer.render(scene, camera);
  }

  function stop() { running = false; renderer.setAnimationLoop(null); }
  function start() { if (running || noMotion) return; running = true; timer.reset ? timer.reset() : 0; renderer.setAnimationLoop(frame); }

  // mouvement réduit : une image fixe, redessinée seulement quand la page change
  let rafPending = false;
  function kick() {
    if (!noMotion || rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      if (!root.classList.contains('loaded')) { kick(); return; }
      update(0.016, 8, true);
      if (occluded() || cur.op < 0.004) renderer.clear(); else renderer.render(scene, camera);
    });
  }
  window.addEventListener('scroll', kick, { passive: true });
  reduceMQ.addEventListener('change', (e) => { noMotion = e.matches; if (noMotion) { stop(); kick(); } else start(); });

  document.addEventListener('visibilitychange', () => { if (document.hidden) { renderer.setAnimationLoop(null); } else if (running) { renderer.setAnimationLoop(frame); } });
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); stop(); fail('contexte WebGL perdu'); });

  /* ---------- Transition « warp » plein écran (second canvas, au-dessus du contenu) ---------- */
  (function setupWarp() {
    const wc = document.createElement('canvas'); wc.id = 'warp'; wc.setAttribute('aria-hidden', 'true'); document.body.appendChild(wc);
    const lab = document.createElement('div'); lab.className = 'warp-label'; lab.setAttribute('aria-hidden', 'true'); lab.innerHTML = '<span></span>'; document.body.appendChild(lab);
    let wr; try { wr = new THREE.WebGLRenderer({ canvas: wc, alpha: true, antialias: false, powerPreference: 'default' }); } catch (e) { return; }
    wr.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    const wcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const wu = { uP: { value: 0 }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) }, uO: { value: new THREE.Vector2(0.5, 0.5) }, uA: { value: new THREE.Color(0xff6b35) }, uB: { value: new THREE.Color(0xffd9a8) }, uBg: { value: new THREE.Color(0x0a0908) } };
    const wm = new THREE.ShaderMaterial({
      uniforms: wu, transparent: true, depthTest: false, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: /* glsl */ `
        uniform float uP; uniform float uT; uniform vec2 uRes; uniform vec2 uO; uniform vec3 uA; uniform vec3 uB; uniform vec3 uBg;
        varying vec2 vUv;
        float h(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float nz(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
          return mix(mix(h(i), h(i + vec2(1., 0.)), f.x), mix(h(i + vec2(0., 1.)), h(i + vec2(1., 1.)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++) { v += a * nz(p); p *= 2.03; a *= .5; } return v; }
        void main(){
          float asp = uRes.x / uRes.y;
          vec2 p = (vUv - uO) * vec2(asp, 1.);
          float d = length(p), ang = atan(p.y, p.x);
          float n = (fbm(vUv * vec2(asp, 1.) * 3. + uT * .4) - .5) * .45 + (fbm(vec2(ang * 3., d * 3. - uT * 1.5)) - .5) * .25;
          float maxR = length(vec2(asp, 1.)) + .6;
          float edge, m;
          if (uP < 1.) { edge = d + n - uP * maxR; m = 1. - smoothstep(-.015, .015, edge); }       // l'encre se répand depuis le clic
          else { edge = d + n - (uP - 1.) * maxR; m = smoothstep(-.015, .015, edge); }             // un trou de feu s'ouvre sur la nouvelle section
          float live = step(.001, uP) * (1. - step(1.999, uP));
          float g = exp(-abs(edge) * 22.) * live, g2 = exp(-abs(edge) * 6.) * live;
          float streak = pow(abs(sin(ang * 36. + n * 8.)), 24.) * smoothstep(0., .9, d) * m;
          vec3 col = uBg + uA * streak * .14;
          col = mix(col, uA, clamp(g2 * .55, 0., 1.)); col = mix(col, uB, clamp(g, 0., 1.));
          gl_FragColor = vec4(col, clamp(m + g2 * .8, 0., 1.));
          #include <colorspace_fragment>
        }`,
    });
    const ws = new THREE.Scene(); ws.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), wm));
    let busy = false;
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    window.Warp = {
      // Aperçu figé d'une étape de la transition (0..1 recouvrement, 1..2 révélation) — utile pour les tests ; peek(null) masque.
      peek(p, o) {
        o = o || {}; const W = window.innerWidth, H = window.innerHeight;
        if (p == null) { wc.classList.remove('on'); lab.classList.remove('on'); return; }
        wr.setSize(W, H, false); wu.uRes.value.set(W, H); wu.uO.value.set((o.x != null ? o.x : W / 2) / W, 1 - (o.y != null ? o.y : H / 2) / H);
        lab.firstChild.textContent = o.label || ''; lab.classList.toggle('on', !!o.label);
        wc.classList.add('on'); wu.uP.value = p; wu.uT.value = 3; wr.render(ws, wcam);
      },
      go(cb, o) {
        if (busy) { cb(); return; }
        busy = true; o = o || {};
        const W = window.innerWidth, H = window.innerHeight, light = isLight();
        wr.setSize(W, H, false); wu.uRes.value.set(W, H);
        wu.uBg.value.set(light ? 0xfaf6f1 : 0x0a0908); wu.uA.value.set(light ? 0xe5521c : 0xff6b35); wu.uB.value.set(light ? 0xf59a1f : 0xffd9a8);
        wu.uO.value.set((o.x != null ? o.x : W / 2) / W, 1 - (o.y != null ? o.y : H / 2) / H);
        lab.firstChild.textContent = o.label || ''; lab.firstChild.style.color = light ? '#19120c' : '#f6f1eb';
        wc.classList.add('on'); warpTarget = 1;
        const t0 = performance.now(), D1 = 720, HOLD = 420, D2 = 1000;
        let swapped = false;
        const step = (now) => {
          const e = now - t0; let p;
          if (e < D1) { p = ease(e / D1); if (e > D1 * 0.55) lab.classList.add('on'); }
          else if (e < D1 + HOLD) { p = 1; if (!swapped) { swapped = true; cb(); } }
          else if (e < D1 + HOLD + D2) { lab.classList.add('out'); warpTarget = 0; p = 1 + ease((e - D1 - HOLD) / D2); }
          else { wc.classList.remove('on'); lab.classList.remove('on', 'out'); busy = false; return; }
          wu.uP.value = p; wu.uT.value = now / 1000; wr.render(ws, wcam);
          requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
    };
  })();

  /* ---------- Démarrage : on compile les shaders avant la première image ---------- */
  measure();
  const go = () => {
    root.classList.remove('no-3d'); root.classList.add('three-on');
    window.__scene3d = 'on';
    if (noMotion) kick(); else start();
  };
  (renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve()).then(go, go);
}
