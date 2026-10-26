// @ts-nocheck
/* Motore della città 3D (dal concept, Three.js r128). Contenuti da `data`; la pagina fornisce il markup dell'interfaccia. */
import * as THREE from "three";
import { STATUS, MESI, sinceText, ghText } from "@/content/format";
import { BRAND } from "@/content/brand";

let mounted = false;
export function mountCity({ data }) {
  if (mounted) return; mounted = true;
  const css = getComputedStyle(document.documentElement);
  const FONT_D = css.getPropertyValue("--f-display").trim() || "sans-serif", FONT_M = css.getPropertyValue("--f-mono").trim() || "monospace";
/* ============================================================
   1. DATI — solo contenuti
   ============================================================ */
const DATA = data;
/* il percorso a scroll: vista dall'alto, poi ogni progetto nell'ordine dei dati, poi il primo lotto libero */
const TOUR = () => [null, ...DATA.projects.map(p => p.id), DATA.freeLots[0].id];
const BUILDING = { atrio: "Uffici a L con atrio", corte: "Uffici a corte", terrazze: "Uffici a terrazze verdi", startup: "Palazzina startup" };

/* ============================================================
   2. PIANTA — dove sta ogni cosa (metri/2)
   ============================================================ */
const PLAN = {
  /* un solo viale centrale: tutti gli edifici ci si affacciano con l'ingresso */
  roads: [{ a: [-52, 4], b: [54, 4], w: 10, avenue: true }],
  canal: { x0: -44, x1: -36 },
  rail: -29.5,
  /* rot: Math.PI = edificio sul lato sud, ingresso verso nord. view: punto d'ingresso (coordinate locali), altezza dello sguardo, spostamento laterale del pedone */
  lots: {
    learnn: { x: -20, z: -13.5, w: 26, d: 22, view: { e: [4.5, 2], y: 6, s: 5 } },
    voxera: { x: -6, z: 21.5, w: 20, d: 20, rot: Math.PI, view: { e: [0, 2], y: 5.5, s: -5 } },
    gestio: { x: 7, z: -14.1, w: 20, d: 19, view: { e: [0, 4], y: 6.5, s: 5 } },
    smalltalk: { x: 19, z: 19.7, w: 20, d: 20, rot: Math.PI, view: { e: [0, 3], y: 5, s: -4 } },
    "lotto-a": { x: 31, z: -9.5, w: 13, d: 12, view: { e: [0, 4.8], y: 2.4, s: 3 } },
    "lotto-b": { x: 36, z: 17.5, w: 13, d: 12, rot: Math.PI }
  }
};

function viewOf(L) {
  const c = Math.cos(L.rot || 0), [ex, ez] = L.view.e;
  const look = new THREE.Vector3(L.x + ex * c, L.view.y, L.z + ez * c);
  const eye = new THREE.Vector3(look.x + L.view.s * 0.6, 1.85, 4); /* sempre sulla mezzeria pedonale del viale */
  return { eye, look };
}

/* ============================================================
   3. ASPETTO — palette industry + ora del giorno (token)
   ============================================================ */
const PAL = {
  ground: "#86bd4f", grass: "#7bb446", asphalt: "#62676f", sidewalk: "#e9e6df", marking: "#ffffff", concrete: "#efede8", concreteDark: "#cfccc5",
  brick: "#d9603f", brickDark: "#b84d33", steel: "#b8bec6", steelDark: "#5d6570", rust: "#e0763c", glass: "#4f93cf", roof: "#dcdde0",
  water: "#3ea6d6", tree: "#5fa83e", treeDark: "#4a9135", safety: "#ffb627", white: "#f7f6f2", smoke: "#ffffff",
  containers: ["#e8553e", "#2f8fd8", "#f4b33d", "#38b07a", "#8d6bd6", "#ef7d9a"]
};
const TIMES = {
  day:   { name: "Giorno", top: "#6fb4ea", bottom: "#d8ecf6", fog: "#d8ecf6", sunColor: "#fff1da", sun: 1.35, sunPos: [60, 90, 40], hemiSky: "#e3f1ff", hemiGround: "#6f8f4f", hemi: 0.6, emissive: 0.0, lamps: 0, exposure: 0.56, sceneInk: "#1e2024" },
  dusk:  { name: "Tramonto", top: "#5d79b8", bottom: "#ffb27a", fog: "#c99a80", sunColor: "#ffab6b", sun: 1.9, sunPos: [-90, 26, 30], hemiSky: "#8d93b0", hemiGround: "#5a4a40", hemi: 0.55, emissive: 0.55, lamps: 0.8, exposure: 1.05, sceneInk: "#1d1a22" },
  night: { name: "Notte", top: "#0d1424", bottom: "#2a3550", fog: "#1f2738", sunColor: "#9fb4ff", sun: 0.35, sunPos: [-40, 80, -50], hemiSky: "#3a4766", hemiGround: "#14161c", hemi: 0.26, emissive: 0.95, lamps: 1.6, exposure: 1.15, sceneInk: "#eef1f6" }
};

/* ============================================================
   4. RENDERER
   ============================================================ */
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 1, 1500);
const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2); sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096); Object.assign(sun.shadow.camera, { left: -70, right: 70, top: 70, bottom: -70, near: 30, far: 270 });
sun.shadow.bias = -0.0003; sun.shadow.normalBias = 0.035; scene.add(sun, sun.target);

const W = { emissive: [], lamps: [], signs: [], anims: [], pick: [], items: {}, groundMats: [], night: 0, smokeColor: new THREE.Color(PAL.smoke) };
let rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(42);

/* ---------- texture procedurali ---------- */
function cnv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function canvasTex(c, rep) { const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); return t; }
const trnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
const NOISE = (() => {
  const P = 256, g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = trnd();
  const at = (x, y, p) => g[((x % p) + p) % p + (((y % p) + p) % p) * P], sm = t => t * t * (3 - 2 * t);
  const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi), a = at(xi, yi, p), b = at(xi + 1, yi, p), c = at(xi, yi + 1, p), d = at(xi + 1, yi + 1, p); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (u, v, base = 4, oct = 5) => { let s = 0, amp = 0.5, f = base, n = 0; for (let o = 0; o < oct; o++) { s += vn(u * f, v * f, f) * amp; n += amp; amp *= 0.5; f *= 2; } return s / n; };
})();
const rgb = hex => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function proceduralTex(size, fn, o = {}) {
  const [c, g] = cnv(size, size), img = g.createImageData(size, size), d = img.data, H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, r = fn(x / size, y / size); d[i * 4] = r[0]; d[i * 4 + 1] = r[1]; d[i * 4 + 2] = r[2]; d[i * 4 + 3] = 255; H[i] = r[3] ?? 0;
  }
  g.putImageData(img, 0, 0); if (o.post) o.post(g, size);
  const map = canvasTex(c, o.rep);
  if (!o.normal) return { map };
  const [nc, ng] = cnv(size, size), ni = ng.createImageData(size, size), nd = ni.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, l = H[y * size + (x - 1 + size) % size], rr = H[y * size + (x + 1) % size], u = H[((y - 1 + size) % size) * size + x], dn = H[((y + 1) % size) * size + x];
    const nx = (l - rr) * o.normal, ny = (u - dn) * o.normal, len = Math.hypot(nx, ny, 1);
    nd[i * 4] = (nx / len * 0.5 + 0.5) * 255; nd[i * 4 + 1] = (ny / len * 0.5 + 0.5) * 255; nd[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255; nd[i * 4 + 3] = 255;
  }
  ng.putImageData(ni, 0, 0); const nmap = new THREE.CanvasTexture(nc); nmap.wrapS = nmap.wrapT = THREE.RepeatWrapping; if (o.rep) nmap.repeat.set(...o.rep);
  return { map, nmap };
}
function noiseTex(base, amt = 18, size = 256, rep = [1, 1], streaks = 0) {
  const b = rgb(base);
  return proceduralTex(Math.min(size, 512), (u, v) => { const n = (NOISE(u, v, 4, 5) - 0.5) * amt * 2.4 + (trnd() - 0.5) * amt * 0.5; return [b[0] + n, b[1] + n, b[2] + n, n]; },
    { rep, post: (g, s) => { for (let i = 0; i < streaks; i++) { g.fillStyle = `rgba(0,0,0,${0.03 + trnd() * 0.05})`; g.fillRect(trnd() * s, trnd() * s, 2 + trnd() * 40, 1 + trnd() * 3); } } }).map;
}
function scaleUV(geo, su, sv) { const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); uv.needsUpdate = true; return geo; }
const TEX = {};
function buildTextures() {
  const flat = (hex, amt, base = 6) => { const c = rgb(hex); return (u, v) => { const k = (NOISE(u, v, base, 3) - 0.5) * amt; return [c[0] + k, c[1] + k, c[2] + k, k / 40]; }; };
  TEX.asphalt = proceduralTex(256, flat("#62676f", 7, 8), { normal: 0.6 });
  /* prato rasato a strisce, come un campus */
  const lA = rgb("#86bd4f"), lB = rgb("#80b84a");
  TEX.lot = proceduralTex(256, (u, v) => { const st = (u * 4) % 1 < 0.5 ? 1 : 0, k = (NOISE(u, v, 5, 3) - 0.5) * 10, c = st ? lA : lB; return [c[0] + k, c[1] + k, c[2] + k, k / 40]; }, { normal: 0.5 });
  const gA = rgb("#8cc152"), gB = rgb("#79b04a"), gC = rgb("#9cc75e");
  TEX.far = proceduralTex(256, (u, v) => { const n = NOISE(u, v, 2, 4), m = NOISE(u + 0.4, v + 0.2, 3, 3), c = mix3(mix3(gA, gB, sstep(0.45, 0.6, n)), gC, sstep(0.55, 0.7, m) * 0.7); return [c[0], c[1], c[2], n * 0.3]; }, { normal: 0.6 });
  TEX.fields = [["#9ccb5c", "#8bbd4f"], ["#e3c766", "#d6b955"], ["#7fb446", "#73a63f"], ["#b8d36a", "#a6c45b"], ["#cfe08a", "#bcd27a"]].map(([a, b]) => {
    const A = rgb(a), B = rgb(b);
    return proceduralTex(128, (u, v) => { const row = (u * 12) % 1 < 0.5 ? 1 : 0, c = row ? A : B; return [c[0], c[1], c[2], row * 0.4]; }, { normal: 0.8 });
  });
  TEX.water = proceduralTex(128, (u, v) => [0, 0, 0, NOISE(u, v, 6, 3)], { normal: 3, rep: [6, 30] });
  TEX.walk = proceduralTex(128, (u, v) => { const b = rgb("#e9e6df"), joint = (u * 4) % 1 < 0.04 || (v * 4) % 1 < 0.04 ? -16 : 0; return [b[0] + joint, b[1] + joint, b[2] + joint, joint ? 0 : 0.3]; }, { normal: 0.8 });
  TEX.snow = proceduralTex(128, (u, v) => { const k = (NOISE(u, v, 4, 3) - 0.5) * 10; return [240 + k, 242 + k, 246 + k, k / 20]; }, { normal: 0.6 });
}
function facadeTex(o) {
  const S = 256, [c, g] = cnv(S, S), [e, ge] = cnv(S, S), cols = 4, rows = 4, cw = S / cols, ch = S / rows;
  g.fillStyle = o.wall; g.fillRect(0, 0, S, S);
  const img = g.getImageData(0, 0, S, S), d = img.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * Math.min(4, o.grain ?? 4); d[i] += n; d[i + 1] += n; d[i + 2] += n; } g.putImageData(img, 0, 0);
  if (o.bricks) { g.strokeStyle = "rgba(255,255,255,0.10)"; g.lineWidth = 1; for (let y = 0; y < S; y += 8) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); for (let x = (y / 6) % 2 ? 0 : 6; x < S; x += 12) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 6); g.stroke(); } } }
  if (o.ribs) { for (let x = 0; x < S; x += 8) { g.fillStyle = "rgba(0,0,0,0.10)"; g.fillRect(x, 0, 3, S); g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(x + 3, 0, 2, S); } }
  ge.fillStyle = "#000"; ge.fillRect(0, 0, S, S);
  if (o.slab) { g.fillStyle = o.slab; for (let r = 0; r < rows; r++) g.fillRect(0, r * ch + ch - 5, S, 5); }
  /* nastri di finestre continui, tipici degli uffici da campus */
  if (o.ribbon) for (let r = 0; r < rows; r++) {
    const y = r * ch + ch * 0.2, h = ch * 0.58, gr = g.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, shade(o.glass, 26)); gr.addColorStop(1, shade(o.glass, -22)); g.fillStyle = gr; g.fillRect(0, y, S, h);
    g.fillStyle = "rgba(255,255,255,0.18)"; for (let k = 0; k < 3; k++) { const x = trnd() * S; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x + h * 0.6, y); g.lineTo(x + h * 0.6 + 14, y); g.lineTo(x + 14, y + h); g.fill(); }
    g.fillStyle = o.frame; for (let k = 0; k <= 8; k++) g.fillRect(k * S / 8 - 1.5, y, 3, h);
    for (let k = 0; k < 8; k++) if (rnd() < (o.lit ?? 0.5)) { ge.fillStyle = ["#ffe2b0", "#fff1d8", "#ffd590", "#d8ebff"][Math.floor(rnd() * 4)]; ge.fillRect(k * S / 8 + 2, y + 2, S / 8 - 4, h - 4); }
  }
  if (o.winW) for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const w = cw * o.winW, h = ch * o.winH, x = k * cw + (cw - w) / 2, y = r * ch + (ch - h) / 2 - (o.slab ? 2 : 0);
    g.fillStyle = o.frame; g.fillRect(x - 3, y - 3, w + 6, h + 6);
    const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, o.glass); gr.addColorStop(1, shade(o.glass, -28)); g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.fillStyle = "rgba(255,255,255,0.22)"; g.beginPath(); g.moveTo(x, y + h * 0.65); g.lineTo(x + w * 0.45, y); g.lineTo(x + w * 0.7, y); g.lineTo(x, y + h); g.closePath(); g.fill();
    if (o.mullion) { g.fillStyle = o.frame; g.fillRect(x + w / 2 - 1.5, y, 3, h); }
    if (rnd() < (o.lit ?? 0.4)) { const warm = ["#ffd9a0", "#ffe7bf", "#ffc77d", "#fff1d8", "#cfe4ff"][Math.floor(rnd() * 5)]; ge.fillStyle = warm; ge.fillRect(x, y, w, h); }
  }
  return [canvasTex(c), canvasTex(e)];
}
function shade(hex, amt) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt / 255); return "#" + c.getHexString(); }
function signTex(text, o = {}) {
  const [c, g] = cnv(o.w || 1024, o.h || 200); g.fillStyle = o.bg || "#1e2024"; g.fillRect(0, 0, c.width, c.height);
  if (o.border) { g.strokeStyle = o.fg; g.lineWidth = 10; g.strokeRect(10, 10, c.width - 20, c.height - 20); }
  g.fillStyle = o.fg || "#fff"; g.textAlign = "center"; g.textBaseline = "middle";
  const fit = (str, px, weight, fam, maxW) => { g.font = `${weight} ${px}px ${fam}`; const k = Math.min(1, maxW / g.measureText(str).width); g.font = `${weight} ${Math.floor(px * k)}px ${fam}`; };
  const disp = FONT_D, mono = FONT_M;
  fit(text, Math.round(c.height * (o.sub ? 0.5 : 0.62)), 900, disp, c.width * 0.86);
  if (o.sub) { g.fillText(text, c.width / 2, c.height * 0.4); fit(o.sub, Math.round(c.height * 0.17), 600, mono, c.width * 0.86); g.fillText(o.sub, c.width / 2, c.height * 0.78); }
  else g.fillText(text, c.width / 2, c.height * 0.54);
  const t = canvasTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}

/* ---------- materiali e primitive ---------- */
const FONT_DATA = {"glyphs":{"S":{"x_min":0,"x_max":826,"ha":915,"o":"m 826 306 q 701 55 826 148 q 423 -29 587 -29 q 138 60 255 -29 q 0 318 13 154 l 208 318 q 288 192 216 238 q 437 152 352 152 q 559 181 506 152 q 623 282 623 217 q 466 411 623 372 q 176 487 197 478 q 18 719 18 557 q 136 958 18 869 q 399 1040 244 1040 q 670 956 561 1040 q 791 713 791 864 l 591 713 q 526 826 583 786 q 393 866 469 866 q 277 838 326 866 q 218 742 218 804 q 374 617 218 655 q 667 542 646 552 q 826 306 826 471 "},"J":{"x_min":0,"x_max":649,"ha":760,"o":"m 649 294 q 573 48 649 125 q 327 -29 497 -29 q 61 82 136 -29 q 0 375 0 173 l 200 375 l 199 309 q 219 194 199 230 q 321 145 249 145 q 418 193 390 145 q 441 307 441 232 l 441 1013 l 649 1013 l 649 294 "},"D":{"x_min":0,"x_max":864,"ha":968,"o":"m 400 1013 q 736 874 608 1013 q 864 523 864 735 q 717 146 864 293 q 340 0 570 0 l 0 0 l 0 1013 l 400 1013 m 398 837 l 206 837 l 206 182 l 372 182 q 584 276 507 182 q 657 504 657 365 q 594 727 657 632 q 398 837 522 837 "},"Q":{"x_min":0,"x_max":995.59375,"ha":1096,"o":"m 995 49 l 885 -70 l 762 42 q 641 -12 709 4 q 497 -29 572 -29 q 135 123 271 -29 q 0 504 0 276 q 131 881 0 731 q 497 1040 270 1040 q 859 883 719 1040 q 994 506 994 731 q 966 321 994 413 q 884 152 938 229 l 995 49 m 730 299 q 767 395 755 344 q 779 504 779 446 q 713 743 779 644 q 505 857 638 857 q 284 745 366 857 q 210 501 210 644 q 279 265 210 361 q 492 157 357 157 q 615 181 557 157 l 508 287 l 620 405 l 730 299 "},"M":{"x_min":0,"x_max":1019,"ha":1135,"o":"m 1019 0 l 823 0 l 823 819 l 618 0 l 402 0 l 194 818 l 194 0 l 0 0 l 0 1013 l 309 1012 l 510 241 l 707 1013 l 1019 1013 l 1019 0 "},"C":{"x_min":0,"x_max":970.828125,"ha":1043,"o":"m 970 345 q 802 70 933 169 q 490 -29 672 -29 q 130 130 268 -29 q 0 506 0 281 q 134 885 0 737 q 502 1040 275 1040 q 802 939 668 1040 q 965 679 936 838 l 745 679 q 649 809 716 761 q 495 857 582 857 q 283 747 361 857 q 214 508 214 648 q 282 267 214 367 q 493 154 359 154 q 651 204 584 154 q 752 345 718 255 l 970 345 "},"X":{"x_min":0,"x_max":894.453125,"ha":999,"o":"m 894 0 l 654 0 l 445 351 l 238 0 l 0 0 l 316 516 l 0 1013 l 238 1013 l 445 659 l 652 1013 l 894 1013 l 577 519 l 894 0 "},"N":{"x_min":0,"x_max":833,"ha":949,"o":"m 833 0 l 617 0 l 206 695 l 206 0 l 0 0 l 0 1013 l 216 1013 l 629 315 l 629 1013 l 833 1013 l 833 0 "},"Z":{"x_min":0,"x_max":804.171875,"ha":906,"o":"m 804 836 l 251 182 l 793 182 l 793 0 l 0 0 l 0 176 l 551 830 l 11 830 l 11 1013 l 804 1013 l 804 836 "},"B":{"x_min":0,"x_max":835,"ha":938,"o":"m 674 547 q 791 450 747 518 q 835 304 835 383 q 718 75 835 158 q 461 0 612 0 l 0 0 l 0 1013 l 477 1013 q 697 951 609 1013 q 797 754 797 880 q 765 630 797 686 q 674 547 734 575 m 438 621 q 538 646 495 621 q 590 730 590 676 q 537 814 590 785 q 436 838 494 838 l 199 838 l 199 621 l 438 621 m 445 182 q 561 211 513 182 q 618 311 618 247 q 565 410 618 375 q 444 446 512 446 l 199 446 l 199 182 l 445 182 "},"H":{"x_min":0,"x_max":838,"ha":953,"o":"m 838 0 l 628 0 l 628 450 l 210 450 l 210 0 l 0 0 l 0 1013 l 210 1013 l 210 635 l 628 635 l 628 1013 l 838 1013 l 838 0 "},"U":{"x_min":0,"x_max":813,"ha":926,"o":"m 813 362 q 697 79 813 187 q 405 -29 582 -29 q 114 78 229 -29 q 0 362 0 186 l 0 1013 l 210 1013 l 210 387 q 260 226 210 291 q 408 154 315 154 q 554 226 500 154 q 603 387 603 291 l 603 1013 l 813 1013 l 813 362 "},"F":{"x_min":0,"x_max":706.953125,"ha":778,"o":"m 706 837 l 206 837 l 206 606 l 645 606 l 645 431 l 206 431 l 206 0 l 0 0 l 0 1013 l 706 1013 l 706 837 "},"V":{"x_min":0,"x_max":895.828125,"ha":997,"o":"m 895 1013 l 550 0 l 347 0 l 0 1013 l 231 1013 l 447 256 l 666 1013 l 895 1013 "},"R":{"x_min":0,"x_max":836.109375,"ha":947,"o":"m 836 0 l 608 0 q 588 53 596 20 q 581 144 581 86 q 581 179 581 162 q 581 215 581 197 q 553 345 581 306 q 428 393 518 393 l 208 393 l 208 0 l 0 0 l 0 1013 l 491 1013 q 720 944 630 1013 q 819 734 819 869 q 778 584 819 654 q 664 485 738 513 q 757 415 727 463 q 794 231 794 358 l 794 170 q 800 84 794 116 q 836 31 806 51 l 836 0 m 462 838 l 208 838 l 208 572 l 452 572 q 562 604 517 572 q 612 704 612 640 q 568 801 612 765 q 462 838 525 838 "},"K":{"x_min":0,"x_max":900,"ha":996,"o":"m 900 0 l 647 0 l 316 462 l 208 355 l 208 0 l 0 0 l 0 1013 l 208 1013 l 208 595 l 604 1013 l 863 1013 l 461 603 l 900 0 "},"E":{"x_min":0,"x_max":761.109375,"ha":824,"o":"m 761 0 l 0 0 l 0 1013 l 734 1013 l 734 837 l 206 837 l 206 621 l 690 621 l 690 446 l 206 446 l 206 186 l 761 186 l 761 0 "},"Y":{"x_min":0,"x_max":836,"ha":931,"o":"m 836 1013 l 532 376 l 532 0 l 322 0 l 322 376 l 0 1013 l 208 1013 l 427 576 l 626 1013 l 836 1013 "},"L":{"x_min":0,"x_max":704.171875,"ha":763,"o":"m 704 0 l 0 0 l 0 1013 l 208 1013 l 208 186 l 704 186 l 704 0 "}," ":{"x_min":0,"x_max":0,"ha":375},"P":{"x_min":0,"x_max":771,"ha":838,"o":"m 208 361 l 208 0 l 0 0 l 0 1013 l 450 1013 q 682 919 593 1013 q 771 682 771 826 q 687 452 771 544 q 466 361 604 361 l 208 361 m 421 837 l 208 837 l 208 544 l 410 544 q 525 579 480 544 q 571 683 571 615 q 527 792 571 747 q 421 837 484 837 "},"T":{"x_min":0,"x_max":809,"ha":894,"o":"m 809 831 l 509 831 l 509 0 l 299 0 l 299 831 l 0 831 l 0 1013 l 809 1013 l 809 831 "},"W":{"x_min":0,"x_max":1291.671875,"ha":1399,"o":"m 1291 1013 l 1002 0 l 802 0 l 645 777 l 490 0 l 288 0 l 0 1013 l 215 1013 l 388 298 l 534 1012 l 757 1013 l 904 299 l 1076 1013 l 1291 1013 "},"I":{"x_min":41,"x_max":249,"ha":365,"o":"m 249 0 l 41 0 l 41 1013 l 249 1013 l 249 0 "},"G":{"x_min":0,"x_max":971,"ha":1057,"o":"m 971 -1 l 829 -1 l 805 118 q 479 -29 670 -29 q 126 133 261 -29 q 0 509 0 286 q 130 884 0 737 q 493 1040 268 1040 q 790 948 659 1040 q 961 698 920 857 l 736 698 q 643 813 709 769 q 500 857 578 857 q 285 746 364 857 q 213 504 213 644 q 285 263 213 361 q 505 154 365 154 q 667 217 598 154 q 761 374 736 280 l 548 374 l 548 548 l 971 548 l 971 -1 "},"A":{"x_min":0,"x_max":966.671875,"ha":1069,"o":"m 966 0 l 747 0 l 679 208 l 286 208 l 218 0 l 0 0 l 361 1013 l 600 1013 l 966 0 m 623 376 l 480 810 l 340 376 l 623 376 "},"O":{"x_min":0,"x_max":994,"ha":1094,"o":"m 497 -29 q 133 127 272 -29 q 0 505 0 277 q 131 883 0 733 q 497 1040 270 1040 q 860 883 721 1040 q 994 505 994 733 q 862 127 994 277 q 497 -29 723 -29 m 497 154 q 710 266 631 154 q 780 506 780 365 q 710 745 780 647 q 497 857 631 857 q 283 747 361 857 q 213 506 213 647 q 282 266 213 365 q 497 154 361 154 "}},"cssFontWeight":"bold","ascender":1216,"underlinePosition":-100,"cssFontStyle":"normal","boundingBox":{"yMin":-333,"xMin":-162,"yMax":1216,"xMax":1681},"resolution":1000,"original_font_information":{"postscript_name":"Helvetiker-Bold","version_string":"Version 1.00 2004 initial release","vendor_url":"http://www.magenta.gr","full_font_name":"Helvetiker Bold","font_family_name":"Helvetiker","copyright":"Copyright (c) Magenta ltd, 2004.","description":"","trademark":"","designer":"","designer_url":"","unique_font_identifier":"Magenta ltd:Helvetiker Bold:22-10-104","license_url":"http://www.ellak.gr/fonts/MgOpen/license.html","license_description":"Copyright (c) 2004 by MAGENTA Ltd. All Rights Reserved.\r\n\r\nPermission is hereby granted, free of charge, to any person obtaining a copy of the fonts accompanying this license (\"Fonts\") and associated documentation files (the \"Font Software\"), to reproduce and distribute the Font Software, including without limitation the rights to use, copy, merge, publish, distribute, and/or sell copies of the Font Software, and to permit persons to whom the Font Software is furnished to do so, subject to the following conditions: \r\n\r\nThe above copyright and this permission notice shall be included in all copies of one or more of the Font Software typefaces.\r\n\r\nThe Font Software may be modified, altered, or added to, and in particular the designs of glyphs or characters in the Fonts may be modified and additional glyphs or characters may be added to the Fonts, only if the fonts are renamed to names not containing the word \"MgOpen\", or if the modifications are accepted for inclusion in the Font Software itself by the each appointed Administrator.\r\n\r\nThis License becomes null and void to the extent applicable to Fonts or Font Software that has been modified and is distributed under the \"MgOpen\" name.\r\n\r\nThe Font Software may be sold as part of a larger software package but no copy of one or more of the Font Software typefaces may be sold by itself. \r\n\r\nTHE FONT SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL MAGENTA OR PERSONS OR BODIES IN CHARGE OF ADMINISTRATION AND MAINTENANCE OF THE FONT SOFTWARE BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM OTHER DEALINGS IN THE FONT SOFTWARE.","manufacturer_name":"Magenta ltd","font_sub_family_name":"Bold"},"descender":-334,"familyName":"Helvetiker","lineHeight":1549,"underlineThickness":50};
const matCache = new Map();
function std(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.85, metalness: 0.05 }, o)));
  return matCache.get(key);
}
function glowMat(color, base = 1) { const m = new THREE.MeshStandardMaterial({ color: "#222", emissive: color, emissiveIntensity: 0, roughness: 0.6 }); W.lamps.push([m, base]); return m; }
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function box(w, h, d, mat, parent, x = 0, y = 0, z = 0, o) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return mesh(g, mat, parent, x, y, z, o); }
function cyl(rt, rb, h, mat, parent, x = 0, y = 0, z = 0, seg = 20, o) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); return mesh(g, mat, parent, x, y, z, o); }
function facadeBox(w, h, d, spec, parent, x = 0, y = 0, z = 0) {
  const [map, emap] = facadeTex(spec);
  const mk = len => {
    const m = map.clone(), e = emap.clone();
    [m, e].forEach(t => { t.needsUpdate = true; t.repeat.set(Math.max(1, len / (spec.bay || 2)) / 4, Math.max(1, h / (spec.floor || 1.6)) / 4); });
    const mat = new THREE.MeshStandardMaterial({ map: m, emissiveMap: e, emissive: "#ffffff", emissiveIntensity: 0, roughness: spec.rough ?? 0.75, metalness: spec.metal ?? 0.05 });
    W.emissive.push(mat); return mat;
  };
  const sx = mk(d), sz = mk(w), roof = std(spec.roof || PAL.roof, { roughness: 0.9 });
  const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0);
  return mesh(g, [sx, sx, roof, roof, sz, sz], parent, x, y, z);
}
function facadeCyl(r, h, spec, parent, x, y, z, t0 = 0, tl = Math.PI * 2) {
  const [map, emap] = facadeTex(spec);
  [map, emap].forEach(t => t.repeat.set(Math.max(1, r * tl / (spec.bay || 2)) / 4, Math.max(1, h / (spec.floor || 1.6)) / 4));
  const side = new THREE.MeshStandardMaterial({ map, emissiveMap: emap, emissive: "#ffffff", emissiveIntensity: 0, roughness: spec.rough ?? 0.6, metalness: spec.metal ?? 0.05 }); W.emissive.push(side);
  const cap = std(spec.roof || PAL.roof, { roughness: 0.9 }), geo = new THREE.CylinderGeometry(r, r, h, 28, 1, false, t0, tl); geo.translate(0, h / 2, 0);
  return mesh(geo, [side, cap, cap], parent, x, y, z);
}
/* lettere 3D in rilievo (font Helvetiker Bold incorporato, solo maiuscole) */
const FONT = new THREE.Font(FONT_DATA);
function letters3D(text, size, depth, color, parent, x, y, z, ry = 0, glow = 1) {
  const geo = new THREE.TextGeometry(text, { font: FONT, size, height: depth, curveSegments: 4, bevelEnabled: false });
  geo.computeBoundingBox(); const bb = geo.boundingBox; geo.translate(-(bb.max.x + bb.min.x) / 2, 0, -depth / 2);
  const face = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0, roughness: 0.4, metalness: 0.1 }); W.signs.push([face, glow * 0.6]);
  const m = mesh(geo, [face, std(shade(color, -45), { roughness: 0.5 })], parent, x, y, z); m.rotation.y = ry; return m;
}
function sign(text, w, h, parent, x, y, z, ry = 0, o = {}) {
  const t = signTex(text, o), m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.6 });
  W.signs.push([m, o.glow ?? 1]);
  const p = mesh(new THREE.PlaneGeometry(w, h), m, parent, x, y, z, { cast: false }); p.rotation.y = ry; return p;
}
function prism(w, h, d, mat, parent, x, y, z) {
  const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return mesh(g, mat, parent, x, y, z);
}
const TREE_MATS = ["#5fa83e", "#4f9a37", "#6db547", "#58a23d", "#7cbf4c", "#47913a"].map(c => std(c, { flatShading: true, roughness: 0.8 }));
const PINE_MATS = ["#3f8a3c", "#357d36", "#4b9744"].map(c => std(c, { flatShading: true, roughness: 0.8 }));
function tree(parent, x, z, s = 1, kind) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s * (0.85 + rnd() * 0.35)); g.rotation.y = rnd() * 6; parent.add(g);
  const trunk = std("#8a6a4f");
  if ((kind || (rnd() < 0.3 ? "pine" : "leaf")) === "pine") {
    cyl(0.1, 0.14, 0.8, trunk, g, 0, 0, 0, 6);
    const m = PINE_MATS[Math.floor(rnd() * 3)];
    [[1.15, 1.6, 0.6], [0.9, 1.4, 1.5], [0.6, 1.2, 2.3]].forEach(([r, h, y]) => mesh(new THREE.ConeGeometry(r, h, 7).translate(0, h / 2, 0), m, g, 0, y, 0));
  } else {
    cyl(0.1, 0.15, 1.4, trunk, g, 0, 0, 0, 6);
    const m = TREE_MATS[Math.floor(rnd() * TREE_MATS.length)];
    /* chioma tonda unica, come gli alberi dei campus */
    const b = mesh(new THREE.IcosahedronGeometry(1.15 + rnd() * 0.3, 1), m, g, 0, 2.3, 0); b.scale.set(1, 1.05, 1);
  }
  return g;
}
function roofSign(text, w, h, parent, x, y, z, ry, o = {}) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g);
  const post = o.post ?? 0.8, steel = std(PAL.steelDark, { metalness: 0.6, roughness: 0.45 });
  [-w * 0.35, w * 0.35].forEach(px => { box(0.16, post + h / 2, 0.16, steel, g, px, 0, -0.25); box(0.1, 0.1, 0.9, steel, g, px, post * 0.5, 0); });
  box(w + 0.3, h + 0.3, 0.22, steel, g, 0, post, 0);
  const t = signTex(text, Object.assign({ w: 2048, h: Math.round(2048 * h / w) }, o)), m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.55 });
  W.signs.push([m, o.glow ?? 1]);
  const f = mesh(new THREE.PlaneGeometry(w, h), m, g, 0, post + 0.15 + h / 2, 0.115, { cast: false });
  const b = mesh(new THREE.PlaneGeometry(w, h), m, g, 0, post + 0.15 + h / 2, -0.115, { cast: false }); b.rotation.y = Math.PI;
  [-w * 0.3, w * 0.3].forEach(px => { [0.5, -0.5].forEach(side => { const l = box(0.25, 0.12, 0.2, glowMat("#fff1d0", 2), g, px, post - 0.15, side * 0.45, { cast: false }); }); });
  return g;
}

function lamp(parent, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; parent.add(g);
  cyl(0.06, 0.08, 4.2, std(PAL.steelDark, { metalness: 0.6, roughness: 0.4 }), g, 0, 0, 0, 6);
  box(1.0, 0.08, 0.08, std(PAL.steelDark), g, 0.45, 4.1, 0);
  box(0.4, 0.12, 0.22, glowMat("#ffd49a", 1.2), g, 0.9, 3.98, 0, { cast: false });
  return g;
}

/* ---------- archetipi dei progetti ---------- */

/* ============================================================
   EDIFICI DAL CATALOGO: motore del catalogo in uno spazio separato
   ============================================================ */
var CAT_CITY = true;
const CAT = (() => {

/* ============================================================
   MOTORE: un solo renderer WebGL fuori pagina; ogni vista (scheda, plastico, dettaglio)
   è un canvas 2D in cui si copia il fotogramma appena disegnato
   ============================================================ */
const ANISO = 8;
const W = { emissive: [], lamps: [], night: 0 };
const CITY = typeof CAT_CITY !== "undefined" && CAT_CITY;
const seeded = s => () => (s = (s * 16807) % 2147483647) / 2147483647;
let rnd = seeded(42);
const trnd = seeded(7);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* ---------- texture procedurali ---------- */
function cnv(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; }
function canvasTex(c, srgb = true) { const t = new THREE.CanvasTexture(c); if (srgb) t.encoding = THREE.sRGBEncoding; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = ANISO; return t; }
const NOISE = (() => {
  const P = 256, g = new Float32Array(P * P); for (let i = 0; i < g.length; i++) g[i] = trnd();
  const at = (x, y, p) => g[((x % p) + p) % p + (((y % p) + p) % p) * P], sm = t => t * t * (3 - 2 * t);
  const vn = (x, y, p) => { const xi = Math.floor(x), yi = Math.floor(y), xf = sm(x - xi), yf = sm(y - yi), a = at(xi, yi, p), b = at(xi + 1, yi, p), c = at(xi, yi + 1, p), d = at(xi + 1, yi + 1, p); return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf; };
  return (u, v, base = 4, oct = 5) => { let s = 0, amp = 0.5, f = base, n = 0; for (let o = 0; o < oct; o++) { s += vn(u * f, v * f, f) * amp; n += amp; amp *= 0.5; f *= 2; } return s / n; };
})();
const rgb = hex => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
function shade(hex, amt) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, amt / 255); return "#" + c.getHexString(); }
function hexA(hex, a) { const [r, g, b] = rgb(hex); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
/* fn(u,v) -> [r,g,b,altezza]; con o.normal produce anche la normal map dall'altezza */
function proceduralTex(size, fn, o = {}) {
  const [c, g] = cnv(size, size), img = g.createImageData(size, size), d = img.data, H = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, r = fn(x / size, y / size); d[i * 4] = r[0]; d[i * 4 + 1] = r[1]; d[i * 4 + 2] = r[2]; d[i * 4 + 3] = 255; H[i] = r[3] ?? 0;
  }
  g.putImageData(img, 0, 0); if (o.post) o.post(g, size);
  const map = canvasTex(c);
  if (!o.normal) return { map };
  const [nc, ng] = cnv(size, size), ni = ng.createImageData(size, size), nd = ni.data;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = y * size + x, l = H[y * size + (x - 1 + size) % size], rr = H[y * size + (x + 1) % size], u = H[((y - 1 + size) % size) * size + x], dn = H[((y + 1) % size) * size + x];
    const nx = (l - rr) * o.normal, ny = (u - dn) * o.normal, len = Math.hypot(nx, ny, 1);
    nd[i * 4] = (nx / len * 0.5 + 0.5) * 255; nd[i * 4 + 1] = (ny / len * 0.5 + 0.5) * 255; nd[i * 4 + 2] = (1 / len * 0.5 + 0.5) * 255; nd[i * 4 + 3] = 255;
  }
  ng.putImageData(ni, 0, 0); return { map, nmap: canvasTex(nc, false) };
}
const GRAIN = (() => { const [c, g] = cnv(128, 128), im = g.createImageData(128, 128); for (let i = 0; i < im.data.length; i += 4) { const v = trnd() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 14; } g.putImageData(im, 0, 0); return c; })();
function grain(g, w, h, a = 1) { g.save(); g.globalAlpha = a; g.fillStyle = g.createPattern(GRAIN, "repeat"); g.fillRect(0, 0, w, h); g.restore(); }

const TEX = {};
function buildTextures() {
  const flat = (hex, amt, base = 6) => { const c = rgb(hex); return (u, v) => { const k = (NOISE(u, v, base, 4) - 0.5) * amt + (trnd() - 0.5) * amt * 0.25; return [c[0] + k, c[1] + k, c[2] + k, k / 40]; }; };
  /* prato rasato a strisce: una tessera copre 16 m */
  const lA = rgb("#86bd4f"), lB = rgb("#7cb547");
  TEX.lawn = proceduralTex(256, (u, v) => { const st = (u * 4) % 1 < 0.5, k = (NOISE(u, v, 6, 4) - 0.5) * 16 + (trnd() - 0.5) * 8, c = st ? lA : lB; return [c[0] + k, c[1] + k * 1.1, c[2] + k * 0.6, k / 30]; }, { normal: 0.7 });
  /* tetto verde: sedum a macchie */
  const s1 = rgb("#7fb84a"), s2 = rgb("#9cc75e"), s3 = rgb("#c9b45a");
  TEX.garden = proceduralTex(256, (u, v) => { const n = NOISE(u, v, 8, 4), m = NOISE(u + 0.3, v + 0.7, 14, 3); let c = mix3(s1, s2, sstep(0.4, 0.62, n)); c = mix3(c, s3, sstep(0.62, 0.72, m) * 0.6); const k = (trnd() - 0.5) * 18; return [c[0] + k, c[1] + k, c[2] + k, n * 0.6 + trnd() * 0.15]; }, { normal: 1.6 });
  /* lastre di pietra chiara, 4 m per tessera */
  TEX.paving = proceduralTex(256, (u, v) => {
    const b = rgb("#e7e3da"), row = Math.floor(v * 8), uu = (u * 4 + (row % 2) * 0.5) % 1, joint = uu < 0.012 || (v * 8) % 1 < 0.025;
    const t = NOISE(Math.floor(uu * 0 + u * 4 + (row % 2) * 0.5) / 4, row / 8, 4, 1) * 14 - 7, k = joint ? -26 : t + (trnd() - 0.5) * 6;
    return [b[0] + k, b[1] + k, b[2] + k * 1.1, joint ? 0 : 0.4];
  }, { normal: 1.2 });
  TEX.asphalt = proceduralTex(256, flat("#5d626a", 12, 10), { normal: 0.7 });
  TEX.concrete = proceduralTex(256, flat("#cdc8bd", 14, 5), { normal: 0.6 });
  /* manto di copertura con giunti */
  TEX.roof = proceduralTex(256, (u, v) => { const b = rgb("#c9cbc8"), seam = (u * 4) % 1 < 0.02, k = (NOISE(u, v, 8, 3) - 0.5) * 12 + (trnd() - 0.5) * 10 - (seam ? 18 : 0); return [b[0] + k, b[1] + k, b[2] + k, seam ? 0 : 0.3]; }, { normal: 0.8 });
  /* tavole di legno per pontili e terrazze */
  TEX.deck = proceduralTex(256, (u, v) => { const b = rgb("#b98352"), p = Math.floor(u * 16), gap = (u * 16) % 1 < 0.07, t = NOISE(p / 16 + v * 0.1, v * 6, 6, 3) * 30 - 15 + Math.sin(v * 80 + p) * 4; const k = gap ? -60 : t; return [b[0] + k, b[1] + k * 0.8, b[2] + k * 0.6, gap ? 0 : 0.5]; }, { normal: 1.2 });
  TEX.water = proceduralTex(256, (u, v) => { const n = NOISE(u, v, 6, 4); return [60 + n * 30, 140 + n * 40, 185 + n * 30, n]; }, { normal: 4 });
  /* pannelli fotovoltaici: celle blu con cornice argento */
  { const [c, g] = cnv(256, 256); g.fillStyle = "#c8ced4"; g.fillRect(0, 0, 256, 256); const cs = 256 / 6;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { const gr = g.createLinearGradient(x * cs, y * cs, x * cs + cs, y * cs + cs); gr.addColorStop(0, "#2d4f86"); gr.addColorStop(1, "#1b3360"); g.fillStyle = gr; g.fillRect(x * cs + 2, y * cs + 2, cs - 4, cs - 4); g.fillStyle = "rgba(255,255,255,.12)"; g.fillRect(x * cs + cs / 2 - 0.5, y * cs + 2, 1, cs - 4); }
    TEX.solar = canvasTex(c); }
  /* griglia ventilatori per i gruppi frigo */
  { const [c, g] = cnv(256, 128); g.fillStyle = "#d9dcdf"; g.fillRect(0, 0, 256, 128);
    [64, 192].forEach(x => { g.fillStyle = "#3a3f45"; g.beginPath(); g.arc(x, 64, 52, 0, 7); g.fill(); g.strokeStyle = "#8d949b"; g.lineWidth = 2; for (let r = 12; r < 52; r += 8) { g.beginPath(); g.arc(x, 64, r, 0, 7); g.stroke(); } for (let a = 0; a < 6; a++) { g.beginPath(); g.moveTo(x, 64); g.lineTo(x + Math.cos(a) * 52, 64 + Math.sin(a) * 52); g.stroke(); } g.fillStyle = "#6b7178"; g.beginPath(); g.arc(x, 64, 9, 0, 7); g.fill(); });
    grain(g, 256, 128, 2); TEX.fan = canvasTex(c); }
  /* lamiera grecata: righe orizzontali, una tessera = 1 m */
  { const [c, g] = cnv(64, 256); for (let y = 0; y < 256; y += 16) { const gr = g.createLinearGradient(0, y, 0, y + 16); gr.addColorStop(0, "#ffffff"); gr.addColorStop(0.45, "#dcdfe2"); gr.addColorStop(0.5, "#a9afb5"); gr.addColorStop(1, "#eef0f2"); g.fillStyle = gr; g.fillRect(0, y, 64, 16); } grain(g, 64, 256, 2); TEX.corr = canvasTex(c); }
  /* cannucce di griglia metallica per le recinzioni */
  { const [c, g] = cnv(64, 64); g.strokeStyle = "rgba(70,78,86,1)"; g.lineWidth = 2; for (let i = -64; i < 128; i += 10) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 64, 64); g.stroke(); g.beginPath(); g.moveTo(i + 64, 0); g.lineTo(i, 64); g.stroke(); } TEX.fence = canvasTex(c); }
  /* foglie per siepi */
  TEX.leaf = proceduralTex(128, (u, v) => { const n = NOISE(u, v, 10, 4), k = (trnd() - 0.5) * 40; const c = mix3(rgb("#3f8a3c"), rgb("#6db547"), n); return [c[0] + k, c[1] + k, c[2] + k * 0.5, n + trnd() * 0.3]; }, { normal: 2.5 });
  /* eliporto */
  { const [c, g] = cnv(512, 512); g.fillStyle = "#3b4048"; g.fillRect(0, 0, 512, 512); grain(g, 512, 512, 3);
    g.strokeStyle = "#ffb627"; g.lineWidth = 16; g.beginPath(); g.arc(256, 256, 236, 0, 7); g.stroke();
    g.strokeStyle = "#ffffff"; g.lineWidth = 14; g.beginPath(); g.arc(256, 256, 150, 0, 7); g.stroke();
    g.fillStyle = "#ffffff"; g.fillRect(196, 166, 36, 180); g.fillRect(280, 166, 36, 180); g.fillRect(196, 238, 120, 36);
    TEX.heli = canvasTex(c); TEX.heli.wrapS = TEX.heli.wrapT = THREE.ClampToEdgeWrapping; }
  /* cartello parcheggio */
  { const [c, g] = cnv(256, 256); g.fillStyle = "#1f5fbf"; g.fillRect(0, 0, 256, 256); g.strokeStyle = "#fff"; g.lineWidth = 10; g.strokeRect(14, 14, 228, 228); g.fillStyle = "#fff"; g.font = `900 190px ${FONT_D}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("P", 128, 140); TEX.parking = canvasTex(c); }
}

/* ---------- facciate ad alta risoluzione: colore, illuminazione notturna, rugosità/metallo ----------
   una tessera copre cols campate per rows piani; le UV delle pareti sono in metri */
const FAC = new Map();
function rm(r, m) { return `rgb(0,${Math.round(r * 255)},${Math.round(m * 255)})`; }
const WARM = ["#ffd9a0", "#ffe7bf", "#ffc77d", "#fff1d8", "#ffe0a8", "#d6e8ff"];
function facade(spec) {
  const s = Object.assign({ kind: "curtain", wall: "#f2f1ed", glass: "#4f93cf", frame: "#dfe5ea", bay: 1.6, floor: 3.6, cols: 4, rows: 4, lit: 0.55, blinds: 0.3, band: 0.13, sub: 2, env: 1 }, spec);
  const key = JSON.stringify(s); if (FAC.has(key)) return FAC.get(key);
  const S = 512, cw = S / s.cols, ch = S / s.rows, r = seeded(key.length * 7919 + key.charCodeAt(9) * 31 + 11);
  const [c, g] = cnv(S, S), [e, ge] = cnv(S, S), [m, gm] = cnv(S, S);
  g.fillStyle = s.wall; g.fillRect(0, 0, S, S); grain(g, S, S, 1.5);
  ge.fillStyle = "#000"; ge.fillRect(0, 0, S, S);
  gm.fillStyle = rm(s.wallRough ?? 0.7, s.wallMetal ?? 0); gm.fillRect(0, 0, S, S);
  const pane = (x, y, w, h) => {
    const lit = r() < s.lit, ig = g.createLinearGradient(0, y, 0, y + h);
    ig.addColorStop(0, shade(s.glass, -52)); ig.addColorStop(1, shade(s.glass, -88)); g.fillStyle = ig; g.fillRect(x, y, w, h);
    /* interno: luci a soffitto, sagome di arredi e piante */
    g.fillStyle = "rgba(255,255,255,0.22)"; g.fillRect(x, y + h * 0.05, w, Math.max(2, h * 0.025));
    for (let k = 0; k < 2; k++) { g.fillStyle = r() < 0.3 ? "rgba(40,90,40,0.35)" : "rgba(0,0,0,0.2)"; const fw = w * (0.12 + r() * 0.25); g.fillRect(x + r() * (w - fw), y + h * (0.62 + r() * 0.1), fw, h); }
    let bh = 0; if (r() < s.blinds) { bh = h * (0.15 + r() * 0.65); g.fillStyle = s.blind || "#ece6da"; g.fillRect(x, y, w, bh); g.fillStyle = "rgba(0,0,0,0.07)"; for (let yy = y + 3; yy < y + bh; yy += 4) g.fillRect(x, yy, w, 1); }
    /* riflesso del cielo e lama di luce diagonale */
    const rg = g.createLinearGradient(0, y, 0, y + h); rg.addColorStop(0, hexA(shade(s.glass, 46), 0.62)); rg.addColorStop(0.55, hexA(s.glass, 0.42)); rg.addColorStop(1, hexA(shade(s.glass, -10), 0.5));
    g.fillStyle = rg; g.fillRect(x, y, w, h);
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = "rgba(255,255,255,0.13)";
    const sx = x + r() * w; g.beginPath(); g.moveTo(sx, y + h); g.lineTo(sx + h * 0.7, y); g.lineTo(sx + h * 0.7 + w * 0.18, y); g.lineTo(sx + w * 0.18, y + h); g.fill(); g.restore();
    if (lit) { ge.fillStyle = WARM[Math.floor(r() * WARM.length)]; ge.fillRect(x, y + bh, w, h - bh); ge.fillStyle = "rgba(255,255,255,0.9)"; ge.fillRect(x, y + h * 0.05, w, Math.max(2, h * 0.03)); if (bh) { ge.fillStyle = "rgba(255,200,140,0.35)"; ge.fillRect(x, y, w, bh); } }
    gm.fillStyle = rm(0.07, s.glassMetal ?? 0.5); gm.fillRect(x, y, w, h);
  };
  const mull = (x, y, w, h, t) => { g.fillStyle = s.frame; g.fillRect(x - t / 2, y, t, h); g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(x + t / 2, y, 1, h); gm.fillStyle = rm(0.35, 0.6); gm.fillRect(x - t / 2, y, t, h); };
  for (let row = 0; row < s.rows; row++) {
    const y0 = row * ch;
    if (s.kind === "curtain" || s.kind === "ribbon") {
      const band = ch * (s.kind === "ribbon" ? (s.band > 0.2 ? s.band : 0.36) : s.band), top = s.kind === "ribbon" ? ch * 0.05 : 0;
      const gy = y0 + top, gh = ch - band - top;
      for (let k = 0; k < s.cols; k++) {
        const x0 = k * cw;
        for (let q = 0; q < s.sub; q++) pane(x0 + q * cw / s.sub, gy, cw / s.sub, gh);
        for (let q = 0; q <= s.sub; q++) mull(x0 + q * cw / s.sub, gy, 0, gh, q === 0 || q === s.sub ? 5 : 3);
      }
      g.fillStyle = s.frame; g.fillRect(0, gy + gh * 0.82, S, 2);
      /* parapetto o marcapiano */
      const by = gy + gh; g.fillStyle = s.spandrel || s.wall; g.fillRect(0, by, S, band);
      if (s.kind === "curtain" && !s.spandrel) { g.fillStyle = hexA(shade(s.glass, -60), 0.9); g.fillRect(0, by, S, band); }
      g.fillStyle = "rgba(255,255,255,0.35)"; g.fillRect(0, by, S, 2); g.fillStyle = "rgba(0,0,0,0.16)"; g.fillRect(0, by + band - 2, S, 2);
      gm.fillStyle = rm(s.kind === "curtain" ? 0.2 : 0.65, s.kind === "curtain" ? 0.4 : 0); gm.fillRect(0, by, S, band);
      if (top) { g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, y0 + top - 2, S, 2); }
    } else if (s.kind === "punched") {
      for (let k = 0; k < s.cols; k++) {
        const w = cw * s.winW, h = ch * s.winH, x = k * cw + (cw - w) / 2, y = y0 + (ch - h) * 0.42;
        g.fillStyle = shade(s.wall, -40); g.fillRect(x - 2, y - 3, w + 4, h + 6);
        pane(x, y, w, h);
        /* spalletta in ombra: profondità della finestra */
        g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(x, y, w, 6); g.fillRect(x, y, 5, h);
        g.fillStyle = s.frame; g.fillRect(x, y + h - 4, w, 4); g.fillRect(x + w / 2 - 1.5, y, 3, h); g.fillRect(x - 4, y + h, w + 8, 5);
      }
      if (s.ribs) for (let x = 0; x < S; x += S / (s.cols * 6)) { g.fillStyle = "rgba(0,0,0,0.1)"; g.fillRect(x, y0, 3, ch); g.fillStyle = "rgba(255,255,255,0.08)"; g.fillRect(x + 3, y0, 2, ch); }
      g.fillStyle = "rgba(0,0,0,0.08)"; g.fillRect(0, y0 + ch - 3, S, 3);
    } else if (s.kind === "panel") {
      for (let k = 0; k < s.cols; k++) {
        for (let q = 0; q < 3; q++) { const x = k * cw + q * cw / 3, t = (r() - 0.5) * 10; g.fillStyle = shade(s.wall, t); g.fillRect(x + 1, y0 + 1, cw / 3 - 2, ch - 2); }
        if (s.louver && row % 2 === 0) { const ly = y0 + ch * 0.25, lh = ch * 0.4; g.fillStyle = shade(s.wall, -35); g.fillRect(k * cw + cw * 0.12, ly, cw * 0.76, lh); g.fillStyle = shade(s.wall, 30); for (let yy = ly; yy < ly + lh; yy += 6) g.fillRect(k * cw + cw * 0.12, yy, cw * 0.76, 2); }
        if (s.strip) { g.fillStyle = s.strip; g.fillRect(k * cw, y0 + ch * 0.86, cw, ch * 0.05); ge.fillStyle = s.strip; ge.fillRect(k * cw, y0 + ch * 0.86, cw, ch * 0.05); }
      }
      g.fillStyle = "rgba(0,0,0,0.25)"; for (let x = 0; x < S; x += cw / 3) g.fillRect(x, y0, 1.5, ch); g.fillRect(0, y0, S, 1.5);
    }
  }
  const map = canvasTex(c), emap = canvasTex(e), rmap = canvasTex(m, false);
  const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: emap, emissive: "#ffffff", emissiveIntensity: 0, roughnessMap: rmap, metalnessMap: rmap, roughness: 1, metalness: 1 });
  mat.userData.env = s.env; mat.userData.ut = s.cols * s.bay; mat.userData.vt = s.rows * s.floor;
  W.emissive.push(mat); FAC.set(key, mat); return mat;
}

/* ---------- materiali ---------- */
const matCache = new Map();
function std(color, o = {}) {
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)) { const { env, ...rest } = o; const m = new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.8, metalness: 0.02 }, rest)); m.userData.env = env ?? 0.5; matCache.set(key, m); }
  return matCache.get(key);
}
function texMat(t, o = {}) { const { env, ...rest } = o; const m = new THREE.MeshStandardMaterial(Object.assign({ map: t.map, normalMap: t.nmap || null, roughness: 0.85 }, rest)); m.userData.env = env ?? 0.4; return m; }
function glowMat(color, base = 1) { const m = new THREE.MeshStandardMaterial({ color: "#2a2a2a", emissive: color, emissiveIntensity: 0, roughness: 0.5 }); W.lamps.push([m, base]); return m; }
const M = {};
function buildMaterials() {
  Object.assign(M, {
    white: std("#f4f3ef", { roughness: 0.55 }), offwhite: std("#e6e2d8", { roughness: 0.7 }), base: std("#f2efe8", { roughness: 0.9 }),
    steel: std("#a3abb3", { metalness: 0.7, roughness: 0.32, env: 0.9 }), steelDark: std("#4b525a", { metalness: 0.55, roughness: 0.42, env: 0.8 }), chrome: std("#d8dde2", { metalness: 0.9, roughness: 0.18, env: 1 }),
    dark: std("#2b3036", { roughness: 0.5 }), black: std("#1d2126", { roughness: 0.45 }), trunk: std("#7a5b44"), skin: std("#e0b48f", { roughness: 0.6 }),
    glass: new THREE.MeshStandardMaterial({ color: "#a9d2ec", transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0.3, depthWrite: false, side: THREE.DoubleSide }),
    yellow: std("#ffb627", { roughness: 0.5 }), red: std("#e8483b", { roughness: 0.5 }), wood: texMat(TEX.deck, { roughness: 0.75 }), woodPlain: std("#b07a4a", { roughness: 0.7 }),
    lawn: texMat(TEX.lawn, { roughness: 0.95 }), garden: texMat(TEX.garden, { roughness: 0.95 }), paving: texMat(TEX.paving, { roughness: 0.85 }), asphalt: texMat(TEX.asphalt, { roughness: 0.9 }),
    concrete: texMat(TEX.concrete, { roughness: 0.9 }), roof: texMat(TEX.roof, { roughness: 0.85 }), leaf: texMat(TEX.leaf, { roughness: 0.9 }),
    water: new THREE.MeshStandardMaterial({ color: "#5fb2d8", roughness: 0.05, metalness: 0.35, normalMap: TEX.water.nmap, normalScale: new THREE.Vector2(0.35, 0.35) }),
    solar: new THREE.MeshStandardMaterial({ map: TEX.solar, roughness: 0.15, metalness: 0.6 }), fan: new THREE.MeshStandardMaterial({ map: TEX.fan, roughness: 0.6, metalness: 0.3 }),
    fence: new THREE.MeshStandardMaterial({ map: TEX.fence, transparent: true, alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.5 }),
    heli: new THREE.MeshStandardMaterial({ map: TEX.heli, roughness: 0.7 }), parking: new THREE.MeshStandardMaterial({ map: TEX.parking, emissiveMap: TEX.parking, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.5 }),
    corr: new THREE.MeshStandardMaterial({ map: TEX.corr, roughness: 0.4, metalness: 0.55 }),
    lampHead: glowMat("#ffe2b0", 1.6), beacon: glowMat("#ff3b2f", 3), crown: glowMat("#d9ecff", 1.4), white_glow: glowMat("#fff4dc", 1.2),
  });
  M.water.userData.env = 1.1; M.glass.userData.env = 1; M.solar.userData.env = 1; M.corr.userData.env = 0.9;
  W.emissive.push(M.parking);
}

/* ---------- primitive ---------- */
function mesh(geo, mat, parent, x = 0, y = 0, z = 0, o = {}) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = o.cast !== false; m.receiveShadow = true; if (parent) parent.add(m); return m;
}
function box(w, h, d, mat, parent, x = 0, y = 0, z = 0, o) { const g = new THREE.BoxGeometry(w, h, d); g.translate(0, h / 2, 0); return mesh(g, mat, parent, x, y, z, o); }
function cyl(rt, rb, h, mat, parent, x = 0, y = 0, z = 0, seg = 20, o) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(0, h / 2, 0); return mesh(g, mat, parent, x, y, z, o); }
function sph(r, mat, parent, x, y, z, ws = 16, hs = 12) { return mesh(new THREE.SphereGeometry(r, ws, hs), mat, parent, x, y, z); }
/* asta tra due punti */
function beam(a, b, t, mat, parent, round) {
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), L = A.distanceTo(B);
  const geo = round ? new THREE.CylinderGeometry(t / 2, t / 2, L, 8) : new THREE.BoxGeometry(t, L, t);
  const m = mesh(geo, mat, parent, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize()); return m;
}
function inst(geo, mat, list, parent, colors) {
  const im = new THREE.InstancedMesh(geo, mat, list.length), o = new THREE.Object3D();
  list.forEach((t, i) => { o.position.set(t[0], t[1], t[2]); o.rotation.set(0, t[3] || 0, t[5] || 0); o.scale.set(1, t[4] || 1, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); if (colors) im.setColorAt(i, new THREE.Color(colors[i])); });
  im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
}

/* ---------- impronte: poligoni con angoli raccordati, offset ed ellissi ---------- */
const area = L => { let a = 0; for (let i = 0; i < L.length; i++) { const p = L[i], q = L[(i + 1) % L.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };
function edgeN(a, b, s) { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [s * dz / l, -s * dx / l]; }
function offsetPoly(P, d) {
  if (!d) return P.map(p => p.slice()); const s = area(P) > 0 ? 1 : -1, n = P.length;
  return P.map((p, i) => { const n1 = edgeN(P[(i - 1 + n) % n], p, s), n2 = edgeN(p, P[(i + 1) % n], s); let mx = n1[0] + n2[0], mz = n1[1] + n2[1]; const l = Math.hypot(mx, mz) || 1; mx /= l; mz /= l; const k = d / (mx * n1[0] + mz * n1[1]); return [p[0] + mx * k, p[1] + mz * k]; });
}
function fillet(P, r, seg = 8) {
  const out = [], n = P.length;
  for (let i = 0; i < n; i++) {
    const rr = Array.isArray(r) ? r[i] : r, p = P[i]; if (!rr || rr <= 0) { out.push(p); continue; }
    const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
    let u1 = [a[0] - p[0], a[1] - p[1]], u2 = [b[0] - p[0], b[1] - p[1]]; const l1 = Math.hypot(...u1), l2 = Math.hypot(...u2); u1 = [u1[0] / l1, u1[1] / l1]; u2 = [u2[0] / l2, u2[1] / l2];
    const th = Math.acos(clamp(u1[0] * u2[0] + u1[1] * u2[1], -1, 1)); if (th > 3.1) { out.push(p); continue; }
    let t = rr / Math.tan(th / 2), Rr = rr; const tm = Math.min(l1, l2) * 0.5; if (t > tm) { t = tm; Rr = t * Math.tan(th / 2); }
    const t1 = [p[0] + u1[0] * t, p[1] + u1[1] * t], t2 = [p[0] + u2[0] * t, p[1] + u2[1] * t], bis = [u1[0] + u2[0], u1[1] + u2[1]], bl = Math.hypot(...bis), hd = Rr / Math.sin(th / 2);
    const c = [p[0] + bis[0] / bl * hd, p[1] + bis[1] / bl * hd];
    const a1 = Math.atan2(t1[1] - c[1], t1[0] - c[0]); let da = Math.atan2(t2[1] - c[1], t2[0] - c[0]) - a1; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    for (let k = 0; k <= seg; k++) { const an = a1 + da * k / seg; out.push([c[0] + Math.cos(an) * Rr, c[1] + Math.sin(an) * Rr]); }
  }
  return out.filter((p, i) => { const q = out[(i + 1) % out.length]; return Math.hypot(p[0] - q[0], p[1] - q[1]) > 1e-3; });
}
const rectPts = (w, d, x = 0, z = 0) => [[x - w / 2, z - d / 2], [x + w / 2, z - d / 2], [x + w / 2, z + d / 2], [x - w / 2, z + d / 2]];
/* un'impronta è una funzione dell'offset che restituisce [contorno, ...fori] */
const rrect = (w, d, r = 0, x = 0, z = 0) => (off = 0) => [fillet(offsetPoly(rectPts(w, d, x, z), off), r > 0 ? r + off : 0)];
const ellipse = (rx, rz, x = 0, z = 0, n = 72) => (off = 0) => [Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2; return [x + Math.cos(a) * (rx + off), z + Math.sin(a) * (rz + off)]; })];
const poly = (pts, r = 0) => (off = 0) => [fillet(offsetPoly(pts, off), Array.isArray(r) ? r.map(v => v ? v + off : 0) : r ? r + off : 0)];
const ring = (R1, R2, n = 96) => (off = 0) => [ellipse(R1, R1, 0, 0, n)(off)[0], ellipse(R2, R2, 0, 0, n)(-off)[0]];

/* ---------- costruttore di prismi con UV in metri: pareti, tetto, intradosso ---------- */
class GB {
  constructor() { this.p = []; this.n = []; this.uv = []; this.I = [[], [], []]; }
  v(x, y, z, nx, ny, nz, u, v) { this.p.push(x, y, z); this.n.push(nx, ny, nz); this.uv.push(u, v); return this.p.length / 3 - 1; }
  wall(loop, y0, y1, o = {}) {
    const L = loop.length, ut = o.ut || 4, vt = o.vt || 4, v0 = o.v0 ?? 0, sg = (area(loop) > 0 ? 1 : -1) * (o.flip ? -1 : 1), segs = o.open ? L - 1 : L;
    const sn = []; for (let i = 0; i < L; i++) sn.push(edgeN(loop[i], loop[(i + 1) % L], sg));
    const vn = i => { if (o.open && (i === 0 || i === L - 1)) return null; const a = sn[(i - 1 + L) % L], b = sn[i % L]; if (a[0] * b[0] + a[1] * b[1] < 0.93) return null; const x = a[0] + b[0], z = a[1] + b[1], l = Math.hypot(x, z); return [x / l, z / l]; };
    let s = o.u0 || 0;
    for (let i = 0; i < segs; i++) {
      const a = loop[i], b = loop[(i + 1) % L], n = sn[i], na = vn(i) || n, nb = vn((i + 1) % L) || n, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const i0 = this.v(a[0], y0, a[1], na[0], 0, na[1], s / ut, (y0 - v0) / vt), i1 = this.v(b[0], y0, b[1], nb[0], 0, nb[1], (s + len) / ut, (y0 - v0) / vt);
      const i2 = this.v(b[0], y1, b[1], nb[0], 0, nb[1], (s + len) / ut, (y1 - v0) / vt), i3 = this.v(a[0], y1, a[1], na[0], 0, na[1], s / ut, (y1 - v0) / vt);
      const cx = -(b[1] - a[1]), cz = b[0] - a[0];
      if (cx * n[0] + cz * n[1] > 0) this.I[0].push(i0, i1, i2, i0, i2, i3); else this.I[0].push(i0, i2, i1, i0, i3, i2);
      s += len;
    }
    return this;
  }
  cap(loops, y, up = true, us = 8, grp) {
    const toV = p => new THREE.Vector2(p[0], up ? -p[1] : p[1]);
    const sh = new THREE.Shape(loops[0].map(toV)); loops.slice(1).forEach(h => sh.holes.push(new THREE.Path(h.map(toV))));
    const sg = new THREE.ShapeGeometry(sh), pos = sg.attributes.position, idx = sg.index.array, base = this.p.length / 3;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = up ? -pos.getY(i) : pos.getY(i); this.v(x, y, z, 0, up ? 1 : -1, 0, x / us, z / us); }
    const I = this.I[grp ?? (up ? 1 : 2)]; for (let i = 0; i < idx.length; i++) I.push(base + idx[i]);
    sg.dispose(); return this;
  }
  geo() {
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(this.n, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    const all = [...this.I[0], ...this.I[1], ...this.I[2]]; g.setIndex(all);
    g.addGroup(0, this.I[0].length, 0); g.addGroup(this.I[0].length, this.I[1].length, 1); g.addGroup(this.I[0].length + this.I[1].length, this.I[2].length, 2);
    g.computeBoundingSphere(); return g;
  }
}
/* prisma da un'impronta: mats = materiale unico, oppure [pareti, tetto, intradosso] */
function prism(fp, y0, y1, mats, parent, o = {}) {
  const loops = typeof fp === "function" ? fp(o.off || 0) : fp, b = new GB(), mm = Array.isArray(mats) ? mats : [mats, mats, mats];
  const wm = mm[0], ut = o.ut || wm.userData?.ut || 4, vt = o.vt || wm.userData?.vt || 4;
  loops.forEach((l, i) => b.wall(l, y0, y1, { ut, vt, v0: o.v0 ?? y0, flip: i > 0, u0: o.u0 }));
  if (o.top !== false) b.cap(loops, y1, true, o.us || 8);
  if (o.bottom) b.cap(loops, y0, false, o.us || 8);
  return mesh(b.geo(), [mm[0], mm[1] || mm[0], mm[2] || mm[1] || mm[0]], parent, 0, 0, 0, o);
}
/* solai sporgenti: una mesh unica per tutta la pila */
function slabs(fp, ys, thick, off, mat, parent) {
  const b = new GB();
  ys.forEach(y => { const loops = fp(off); loops.forEach((l, i) => b.wall(l, y, y + thick, { flip: i > 0 })); b.cap(loops, y + thick, true, 8, 1); b.cap(loops, y, false, 8, 1); });
  return mesh(b.geo(), [mat, mat, mat], parent);
}
const range = (a, b, step) => { const o = []; for (let v = a; v <= b + 1e-6; v += step) o.push(+v.toFixed(3)); return o; };
/* posizioni lungo il perimetro, con normale uscente */
function along(loop, spacing, cb, start = 0.5) {
  const L = loop.length, sg = area(loop) > 0 ? 1 : -1; let acc = 0;
  const segs = loop.map((a, i) => { const b = loop[(i + 1) % L], len = Math.hypot(b[0] - a[0], b[1] - a[1]); const s = { a, b, len, s0: acc }; acc += len; return s; });
  const n = Math.max(1, Math.round(acc / spacing)), st = acc / n;
  for (let k = 0; k < n; k++) {
    const d = (k + start) * st, sgm = segs.find(q => d >= q.s0 && d <= q.s0 + q.len) || segs[segs.length - 1], t = (d - sgm.s0) / sgm.len;
    const [nx, nz] = edgeN(sgm.a, sgm.b, sg); cb(sgm.a[0] + (sgm.b[0] - sgm.a[0]) * t, sgm.a[1] + (sgm.b[1] - sgm.a[1]) * t, nx, nz, k);
  }
}
/* lamelle verticali lungo un contorno */
function fins(loop, y0, h, depth, thick, spacing, mat, parent, colors) {
  const list = []; along(loop, spacing, (x, z, nx, nz) => list.push([x + nx * depth / 2, y0, z + nz * depth / 2, Math.atan2(nx, nz)]));
  const g = new THREE.BoxGeometry(thick, h, depth); g.translate(0, h / 2, 0);
  return inst(g, mat, list, parent, colors && list.map((_, i) => colors(i / list.length)));
}
/* parapetto in vetro con corrimano */
function railing(loop, y, parent, h = 1.1, open = false) {
  const b = new GB(); b.wall(loop, y, y + h, { open }); mesh(b.geo(), [M.glass, M.glass, M.glass], parent, 0, 0, 0, { cast: false });
  const r = new GB(); r.wall(loop, y + h - 0.06, y + h, { open }); r.wall(loop, y + h - 0.06, y + h, { open, flip: true }); mesh(r.geo(), [M.steel, M.steel, M.steel], parent);
}


/* ============================================================
   CONTESTO: alberi, persone, auto, arredo, impianti
   ============================================================ */
let LEAF, PINE, SHIRTS, CARS;
function buildPropMats() {
  LEAF = ["#5fa83e", "#4f9a37", "#6db547", "#58a23d", "#7cbf4c", "#47913a"].map(c => std(c, { flatShading: true, roughness: 0.85 }));
  PINE = ["#3f8a3c", "#357d36", "#2f7434"].map(c => std(c, { flatShading: true, roughness: 0.85 }));
  SHIRTS = ["#ff5a36", "#2f7fd0", "#ffb627", "#f4f3ef", "#7b5cd6", "#2fae7a", "#1d2126", "#e86fa0", "#4fb3d9"].map(c => std(c, { roughness: 0.7 }));
  CARS = ["#f4f3ef", "#1d2126", "#c8ced4", "#2f7fd0", "#e8483b", "#7d8790", "#ffb627", "#3c4a5c"];
}
const ICO = [new THREE.IcosahedronGeometry(1, 1), new THREE.IcosahedronGeometry(1, 0)];
function tree(p, x, z, s = 1, kind = "leaf", y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.scale.setScalar(s * (0.85 + rnd() * 0.3)); g.rotation.y = rnd() * 6; p.add(g);
  if (kind === "pine") {
    cyl(0.12, 0.16, 1, M.trunk, g, 0, 0, 0, 6); const m = PINE[Math.floor(rnd() * 3)];
    [[1.5, 2.2, 0.8], [1.2, 1.9, 2], [0.85, 1.6, 3.1], [0.5, 1.2, 4.1]].forEach(([r, h, y]) => mesh(new THREE.ConeGeometry(r, h, 8).translate(0, h / 2, 0), m, g, 0, y, 0));
  } else if (kind === "cypress") {
    cyl(0.1, 0.13, 0.8, M.trunk, g, 0, 0, 0, 6); const c = mesh(ICO[0], PINE[Math.floor(rnd() * 3)], g, 0, 3.4, 0); c.scale.set(0.75, 3.2, 0.75);
  } else if (kind === "palm") {
    let px = 0, py = 0; const lean = (rnd() - 0.5) * 0.5, segs = 6;
    for (let i = 0; i < segs; i++) { const nx = px + lean * 0.45 * (i / segs), ny = py + 1.25; beam([px, py, 0], [nx, ny, 0], 0.32 - i * 0.025, std("#9c8263", { flatShading: true }), g, true); px = nx; py = ny; }
    const fm = std("#4f9a37", { flatShading: true, side: THREE.DoubleSide });
    for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2 + rnd() * 0.3, f = mesh(new THREE.ConeGeometry(0.42, 3.4, 4, 1).translate(0, 1.7, 0), fm, g, px, py, 0); f.rotation.set(0, a, 1.15 + rnd() * 0.35, "YXZ"); f.scale.set(1, 1, 0.22); }
    sph(0.35, std("#7a6040"), g, px, py - 0.1, 0, 8, 6);
  } else {
    cyl(0.12, 0.17, 1.6, M.trunk, g, 0, 0, 0, 6); const m = LEAF[Math.floor(rnd() * LEAF.length)];
    const c = mesh(ICO[0], m, g, 0, 2.7, 0); c.scale.set(1.45, 1.35, 1.45);
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + rnd(), b = mesh(ICO[0], m, g, Math.cos(a) * 0.8, 2.5 + rnd() * 0.7, Math.sin(a) * 0.8); b.scale.setScalar(0.85 + rnd() * 0.3); }
  }
  return g;
}
function shrub(p, x, z, s = 1, y = 0) { const b = mesh(ICO[0], LEAF[Math.floor(rnd() * LEAF.length)], p, x, y + 0.35 * s, z); b.scale.set(0.8 * s, 0.55 * s, 0.8 * s); b.rotation.y = rnd() * 6; return b; }
function hedge(p, x, z, w, d, h = 0.9, y = 0) { const m = box(w, h, d, M.leaf, p, x, y, z); const t = m.geometry.attributes.uv; for (let i = 0; i < t.count; i++) t.setXY(i, t.getX(i) * Math.max(w, d) / 2, t.getY(i) * h / 2); return m; }
function planter(p, x, z, w, d, y = 0) { box(w, 0.6, d, M.offwhite, p, x, y, z); box(w - 0.2, 0.05, d - 0.2, std("#5a4636"), p, x, y + 0.56, z, { cast: false }); for (let i = 0; i < Math.max(1, Math.round(w * d / 2)); i++) shrub(p, x + (rnd() - 0.5) * (w - 0.6), z + (rnd() - 0.5) * (d - 0.6), 0.6 + rnd() * 0.4, y + 0.55); }
const PERSON = { legs: new THREE.CylinderGeometry(0.13, 0.11, 0.85, 6).translate(0, 0.43, 0), body: new THREE.CylinderGeometry(0.2, 0.15, 0.62, 8).translate(0, 1.15, 0), head: new THREE.SphereGeometry(0.12, 10, 8).translate(0, 1.6, 0) };
function person(p, x, z, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = rnd() * 6; p.add(g);
  mesh(PERSON.legs, rnd() < 0.5 ? M.dark : std("#3c5a80"), g); mesh(PERSON.body, SHIRTS[Math.floor(rnd() * SHIRTS.length)], g); mesh(PERSON.head, M.skin, g);
  g.scale.setScalar(0.95 + rnd() * 0.12); return g;
}
function crowd(p, x, z, n, rx, rz = rx, y = 0) { for (let i = 0; i < n; i++) person(p, x + (rnd() - 0.5) * 2 * rx, z + (rnd() - 0.5) * 2 * rz, y); }
const CARG = { body: new THREE.BoxGeometry(1.8, 0.62, 4.3).translate(0, 0.6, 0), cab: new THREE.BoxGeometry(1.56, 0.55, 2.3).translate(0, 1.18, -0.2), wheel: new THREE.CylinderGeometry(0.34, 0.34, 0.24, 12).rotateZ(Math.PI / 2) };
function car(p, x, z, ry = 0, color, y = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  mesh(CARG.body, std(color || CARS[Math.floor(rnd() * CARS.length)], { roughness: 0.28, metalness: 0.45, env: 1 }), g);
  mesh(CARG.cab, std("#27303a", { roughness: 0.1, metalness: 0.6, env: 1 }), g);
  [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]].forEach(([wx, wz]) => mesh(CARG.wheel, M.black, g, wx, 0.34, wz));
  box(1.4, 0.12, 0.05, M.white_glow, g, 0, 0.72, 2.16, { cast: false }); box(1.4, 0.1, 0.05, glowMat("#ff3b2f", 1), g, 0, 0.74, -2.16, { cast: false });
  return g;
}
function truck(p, x, z, ry = 0, color = "#f4f3ef") {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  box(2.5, 2.4, 2.2, std("#2f7fd0", { roughness: 0.35, metalness: 0.3 }), g, 0, 0.6, 5.2); box(2.3, 0.9, 0.06, std("#27303a", { roughness: 0.1, metalness: 0.6 }), g, 0, 1.9, 6.31, { cast: false });
  box(2.5, 3, 8.6, std(color, { roughness: 0.5 }), g, 0, 0.9, -0.4); box(2.4, 0.3, 11, M.dark, g, 0, 0.5, 0.5);
  [[-1.15, 5], [1.15, 5], [-1.15, -2.4], [1.15, -2.4], [-1.15, -3.6], [1.15, -3.6]].forEach(([wx, wz]) => mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.35, 14).rotateZ(Math.PI / 2), M.black, g, wx, 0.5, wz));
  return g;
}
function lamp(p, x, z, h = 4.5, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  cyl(0.06, 0.09, h, M.steelDark, g, 0, 0, 0, 8); box(0.9, 0.1, 0.24, M.steelDark, g, 0.35, h - 0.05, 0); box(0.7, 0.05, 0.18, M.lampHead, g, 0.4, h - 0.1, 0, { cast: false });
}
function bollard(p, x, z) { cyl(0.11, 0.11, 0.9, M.steelDark, p, x, 0, z, 8); cyl(0.115, 0.115, 0.08, M.lampHead, p, x, 0.78, z, 8, { cast: false }); }
function bench(p, x, z, ry = 0) { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g); box(1.9, 0.08, 0.5, M.woodPlain, g, 0, 0.42, 0); box(1.9, 0.4, 0.06, M.woodPlain, g, 0, 0.5, -0.24); [-0.8, 0.8].forEach(px => box(0.07, 0.42, 0.45, M.steelDark, g, px, 0, 0)); }
function parasol(p, x, z, color = "#ffffff", y = 0) {
  cyl(0.04, 0.04, 2.4, M.steel, p, x, y, z, 6);
  mesh(new THREE.ConeGeometry(1.5, 0.5, 8).translate(0, 0.25, 0), std(color, { side: THREE.DoubleSide, roughness: 0.8 }), p, x, y + 2.15, z);
  cyl(0.55, 0.55, 0.05, M.white, p, x, y + 0.72, z, 14); cyl(0.05, 0.05, 0.72, M.steel, p, x, y, z, 6);
  for (let k = 0; k < 3; k++) { const a = k * 2.1 + rnd(); box(0.42, 0.45, 0.42, M.steelDark, p, x + Math.cos(a) * 1.05, y, z + Math.sin(a) * 1.05); }
}
function flag(p, x, z, color, h = 9) {
  cyl(0.06, 0.08, h, M.chrome, p, x, 0, z, 8);
  const f = new THREE.PlaneGeometry(2.1, 1.3, 8, 1), pos = f.attributes.position; for (let i = 0; i < pos.count; i++) pos.setZ(i, Math.sin((pos.getX(i) + 1.05) * 2.2) * 0.12 * (pos.getX(i) + 1.05));
  f.computeVertexNormals(); mesh(f, std(color, { side: THREE.DoubleSide, roughness: 0.7 }), p, x + 1.08, h - 0.8, z);
}
function bike(p, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
  const w = new THREE.TorusGeometry(0.33, 0.035, 6, 16); [-0.52, 0.52].forEach(k => { const t = mesh(w, M.black, g, 0, 0.34, k); t.rotation.y = Math.PI / 2; });
  beam([0, 0.34, -0.52], [0, 0.8, 0.1], 0.05, SHIRTS[Math.floor(rnd() * SHIRTS.length)], g, true); beam([0, 0.8, 0.1], [0, 0.34, 0.52], 0.05, M.steelDark, g, true); beam([0, 0.8, -0.2], [0, 0.8, 0.45], 0.05, M.steelDark, g, true);
}
/* gruppo frigo da tetto con due ventole */
function hvac(p, x, y, z, w = 3, d = 1.6, h = 1.3, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; p.add(g);
  box(w, h, d, std("#dfe2e5", { roughness: 0.5, metalness: 0.2 }), g); box(w, 0.08, d, std("#c6cbd0"), g, 0, 0.12, 0);
  const t = new THREE.PlaneGeometry(w * 0.94, d * 0.9); t.rotateX(-Math.PI / 2); mesh(t, M.fan, g, 0, h + 0.01, 0, { cast: false });
  for (let i = 0; i < 2; i++) box(w * 0.94, 0.05, 0.03, M.steelDark, g, 0, 0.25 + i * 0.4, d / 2 + 0.01, { cast: false });
  return g;
}
/* file di pannelli solari inclinati */
function solar(p, x, y, z, w, d, rowGap = 2.4, tilt = 0.32) {
  const n = Math.max(1, Math.floor(d / rowGap)), geo = new THREE.BoxGeometry(w, 0.06, 1.8);
  const list = []; for (let i = 0; i < n; i++) list.push([x, y + 0.55, z - d / 2 + rowGap * (i + 0.5)]);
  const im = new THREE.InstancedMesh(geo, M.solar, list.length), o = new THREE.Object3D();
  list.forEach((t, i) => { o.position.set(...t); o.rotation.set(-tilt, 0, 0); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
  im.castShadow = im.receiveShadow = true; p.add(im);
  list.forEach(t => { box(0.1, 0.5, 0.1, M.steelDark, p, x - w / 2 + 0.2, y, t[2] + 0.4); box(0.1, 0.5, 0.1, M.steelDark, p, x + w / 2 - 0.2, y, t[2] + 0.4); });
}
/* lucernari, torrini e piccoli impianti per rendere vivi i tetti */
function roofKit(p, y, pts, seedN = 0) {
  pts.forEach(([x, z, k], i) => {
    if (k === "h") hvac(p, x, y, z, 3.2, 1.7, 1.3, (i % 2) * Math.PI / 2);
    else if (k === "s") { box(2.4, 2.6, 2.4, M.offwhite, p, x, y, z); box(2.6, 0.15, 2.6, M.white, p, x, y + 2.6, z); }
    else if (k === "v") { cyl(0.35, 0.35, 1.6, M.steel, p, x, y, z, 12); cyl(0.5, 0.5, 0.18, M.steel, p, x, y + 1.6, z, 12); }
    else if (k === "l") { box(3, 0.5, 1.6, M.white, p, x, y, z); prism([rectPts(2.6, 1.2, x, z)], y + 0.5, y + 0.62, [M.glass, M.glass], p, { cast: false }); }
  });
}

/* ---------- basamento da plastico: prato, bordo bianco, pavimentazioni ---------- */
function plot(g, w, d, r = 3) {
  prism(rrect(w, d, r), -1.1, 0, [M.base, M.lawn], g, { us: 16, ut: 4, vt: 4 });
  prism(rrect(w + 0.6, d + 0.6, r + 0.3), -1.4, -1.1, [std("#d9d5cc"), M.base], g, { cast: false });
  g.userData.plot = [w, d];
}
function pave(g, fp, mat = M.paving, us = 4, y = 0.03, y0 = 0) { return prism(fp, y0, y0 + y, [mat, mat], g, { us, cast: false }); }
function pool(g, fp, depth = 0.3) {
  prism([fp(0.35)[0], fp(0)[0]], 0, 0.35, [M.white, M.white], g);
  prism(fp, 0, 0.25, [M.water, M.water], g, { us: 10, cast: false });
}
/* sparge alberi in un anello attorno all'edificio senza invadere l'impronta e le aree pavimentate */
function scatter(g, n, w, d, free, kinds = ["leaf"], s = 1) {
  let tries = 0, k = 0;
  while (k < n && tries < 600) {
    tries++; const x = (rnd() - 0.5) * (w - 3), z = (rnd() - 0.5) * (d - 3);
    if (typeof free === "function" ? free(x, z) : free.some(([fx, fz, fw, fd]) => Math.abs(x - fx) < fw / 2 + 1.6 && Math.abs(z - fz) < fd / 2 + 1.6)) continue;
    tree(g, x, z, s, kinds[Math.floor(rnd() * kinds.length)]); k++;
  }
}
function parkingLot(g, x, z, w, d, ry = 0, n) {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.rotation.y = ry; g.add(p);
  pave(p, rrect(w, d, 1), M.asphalt, 6, 0.04);
  const slots = Math.floor(w / 2.6); for (let i = 0; i <= slots; i++) { box(0.1, 0.01, 4.6, M.white, p, -w / 2 + 0.6 + i * (w - 1.2) / slots, 0.04, -d / 2 + 2.6, { cast: false }); if (d > 12) box(0.1, 0.01, 4.6, M.white, p, -w / 2 + 0.6 + i * (w - 1.2) / slots, 0.04, d / 2 - 2.6, { cast: false }); }
  for (let i = 0; i < slots; i++) { const sx = -w / 2 + 0.6 + (i + 0.5) * (w - 1.2) / slots; if (rnd() < (n ?? 0.65)) car(p, sx, -d / 2 + 2.6, rnd() < 0.5 ? 0 : Math.PI); if (d > 12 && rnd() < (n ?? 0.65)) car(p, sx, d / 2 - 2.6, rnd() < 0.5 ? 0 : Math.PI); }
  return p;
}


/* ============================================================
   I 20 EDIFICI: ognuno costruito attorno all'origine, ingresso verso +z
   ============================================================ */
const lobbyFac = (h, glass = "#a8d3ec", frame = "#e4e8eb", bay = 2.2) => facade({ kind: "curtain", glass, frame, bay, floor: h, rows: 1, cols: 4, band: 0.03, lit: 0.9, blinds: 0, sub: 2 });
function columns(loop, spacing, h, r, parent, y0 = 0, mat = M.white) {
  const list = []; along(loop, spacing, (x, z) => list.push([x, y0, z]));
  return inst(new THREE.CylinderGeometry(r, r, h, 14).translate(0, h / 2, 0), mat, list, parent);
}
function glowWhite(color = "#dcecff", base = 1.2) { const m = new THREE.MeshStandardMaterial({ color: "#f4f3ef", emissive: color, emissiveIntensity: 0, roughness: 0.5 }); W.lamps.push([m, base]); return m; }
/* fascia a doppia faccia (parapetti di parcheggi, recinzioni) */
function band(loop, y0, y1, mat, parent, open = false) { const b = new GB(); b.wall(loop, y0, y1, { open, ut: 4, vt: 4 }); b.wall(loop, y0, y1, { open, flip: true, ut: 4, vt: 4 }); return mesh(b.geo(), [mat, mat, mat], parent); }
const lerpHex = (a, b, t) => "#" + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
function lampsAlong(g, pts) { pts.forEach(([x, z, ry]) => lamp(g, x, z, 4.5, ry || 0)); }

const CATALOG = [
{ id: "corte", name: "Uffici a corte", size: "basso", w: 32, d: 24, h: 13, floors: 3,
  text: "Edificio a U in terracotta con finestre profonde e un cortile alberato aperto verso la strada.",
  details: ["Rivestimento in terracotta a listelli", "Finestre incassate con cornici chiare", "Cortile con fontana, panchine e alberi", "Coronamento bianco e impianti sul tetto"],
  build(g) {
    plot(g, 46, 42, 3); pave(g, rrect(14, 14.5, 0, 0, 5.3)); pave(g, rrect(14, 8, 1, 0, 16)); pave(g, rrect(46, 3, 0, 0, 18.5), M.paving, 4, 0.02);
    const fp = poly([[-16, -12], [16, -12], [16, 12], [7, 12], [7, -2], [-7, -2], [-7, 12], [-16, 12]]);
    prism(fp, 0, 12, [facade({ kind: "punched", wall: "#c8643f", glass: "#5c8fb8", frame: "#efe9e0", bay: 2.4, floor: 4, cols: 4, rows: 4, winW: 0.56, winH: 0.62, ribs: true, lit: 0.5 }), M.roof], g, { v0: 0 });
    slabs(fp, [11.8], 0.7, 0.3, M.white, g); slabs(fp, [0], 0.5, 0.12, M.concrete, g);
    pool(g, ellipse(2.4, 2.4, 0, 5)); cyl(0.5, 0.7, 0.9, M.white, g, 0, 0.3, 5, 16); cyl(0.12, 0.25, 1.2, std("#bfe6f5", { transparent: true, opacity: 0.6, roughness: 0.1 }), g, 0, 1.2, 5, 10, { cast: false });
    [[-4.5, 0], [4.5, 0], [-4.5, 10], [4.5, 10]].forEach(([x, z]) => tree(g, x, z, 0.85)); bench(g, -3, 5, Math.PI / 2); bench(g, 3, 5, -Math.PI / 2);
    crowd(g, 0, 7, 5, 4, 4); solar(g, -11.5, 12.5, -6, 7, 9); hvac(g, 11, 12.5, -7); hvac(g, 11, 12.5, -3.5); roofKit(g, 12.5, [[-11.5, 2, "s"], [-11.5, 7, "l"], [11.5, 7, "l"]]);
    scatter(g, 16, 46, 42, (x, z) => (Math.abs(x) < 17.5 && Math.abs(z) < 13.5) || (Math.abs(x) < 8 && z > 0), ["leaf", "cypress"]);
    lampsAlong(g, [[-9, 17], [9, 17]]); crowd(g, -10, 18.5, 3, 4, 1); bike(g, 9.5, 14.5, 0.3); bike(g, 10.5, 14.5, 0.3); bike(g, 11.5, 14.5, 0.3);
  } },{ id: "startup", name: "Palazzina startup", size: "medio", w: 20, d: 13, h: 17, floors: 4,
  text: "Quattro piani colorati con balconi, un caffè al piano terra e una terrazza con pergola sul tetto.",
  details: ["Testata verde acqua e tenda arancione", "Balconi sfalsati con parapetti in vetro", "Caffè all'aperto con ombrelloni", "Terrazza in legno con pergola e piante"],
  build(g) {
    plot(g, 42, 38, 3); pave(g, rrect(32, 10, 1.5, 0, 12)); pave(g, rrect(4, 4, 0, 0, 8.5));
    const fp = rrect(20, 13, 2);
    prism(fp, 0, 3.6, [lobbyFac(3.6, "#a6d4e0"), M.white], g, { off: -1 }); columns(fp(-0.35)[0], 3.6, 3.6, 0.22, g);
    prism(fp, 3.6, 14.4, [facade({ kind: "ribbon", wall: "#f4f3ef", glass: "#3fa3a8", frame: "#d6dde0", bay: 2, floor: 3.6, cols: 4, rows: 3, band: 0.34, lit: 0.65 }), M.wood], g, { v0: 0, us: 4 });
    slabs(fp, [3.4], 0.3, 0.3, M.white, g); slabs(fp, [14.2], 0.4, 0.15, M.white, g);
    box(1.4, 15.2, 13.6, std("#2fb6b0", { roughness: 0.5 }), g, -10.5, 0, 0);
    [[3.6, -3], [7.2, 3], [10.8, -3]].forEach(([y, x]) => { box(10, 0.28, 2.2, M.white, g, x, y, 7.5); railing([[x - 5, 8.5], [x + 5, 8.5]], y + 0.28, g, 1.05, true); });
    box(10, 0.12, 2.6, std("#ff5a36", { roughness: 0.6, side: THREE.DoubleSide }), g, 4, 3.1, 7.6);
    railing(fp(-0.2)[0], 14.6, g);
    for (let x = -6; x <= 6; x += 0.7) box(0.12, 0.18, 6, M.woodPlain, g, x, 17.3, -1.5);
    [[-6, -4.5], [6, -4.5], [-6, 1.5], [6, 1.5]].forEach(([x, z]) => box(0.22, 2.9, 0.22, M.woodPlain, g, x, 14.4, z));
    planter(g, -7, 4, 3, 1, 14.4); planter(g, 7, 4, 3, 1, 14.4); crowd(g, 0, 0, 5, 5, 3, 14.4); if (!CITY) parasol(g, 3, 4.2, "#ffb627", 14.4);
    [[-4, 11.5, "#ff5a36"], [2, 12.5, "#2fb6b0"], [8, 11.5, "#ffb627"]].forEach(([x, z, c]) => parasol(g, x, z, c));
    crowd(g, 0, 12, 7, 10, 2);
    for (let i = 0; i < 6; i++) bike(g, -13 + i * 0.9, 10.5, 0);
    scatter(g, 14, 42, 38, (x, z) => Math.abs(x) < 12.5 && Math.abs(z) < 8.5 || z > 6, ["leaf", "palm", "leaf"]);
    lampsAlong(g, [[-15, 16], [15, 16]]);
  } },{ id: "terrazze", name: "Uffici a terrazze verdi", size: "medio", w: 32, d: 20, h: 22, floors: 6,
  text: "Tre volumi rivestiti in legno, sfalsati e ruotati, con tetti verdi e alberi a ogni livello.",
  details: ["Fasce in legno chiaro e nastri vetrati", "Volumi ruotati per terrazze di forma diversa", "Tre tetti giardino con fioriere pendenti", "Pannelli solari sul livello più alto"],
  build(g) {
    plot(g, 50, 44, 4); pave(g, rrect(38, 8, 2, 0, 17)); pave(g, rrect(5, 6, 0, 0, 13));
    const fac = facade({ kind: "ribbon", wall: "#c9955f", spandrel: "#c38c55", glass: "#4f93cf", frame: "#8a5a32", bay: 2.4, floor: 3.6, cols: 4, rows: 4, band: 0.38, lit: 0.6 });
    const A = rrect(32, 20, 1.5, 0, 2);
    prism(A, 0, 7.2, [fac, M.garden], g, { us: 10 }); slabs(A, [3.5], 0.25, 0.2, M.white, g); slabs(A, [6.9], 0.45, 0.25, M.white, g); railing(A(-0.2)[0], 7.35, g);
    const gb = new THREE.Group(); gb.position.set(-3, 0, -1.5); gb.rotation.y = 0.2; g.add(gb);
    const Bf = rrect(23, 15, 1.5); prism(Bf, 7.2, 14.4, [fac, M.garden], gb, { us: 10 }); slabs(Bf, [10.7], 0.25, 0.2, M.white, gb); slabs(Bf, [14.1], 0.45, 0.25, M.white, gb); railing(Bf(-0.2)[0], 14.55, gb);
    const gc = new THREE.Group(); gc.position.set(3, 0, -3); gc.rotation.y = -0.15; g.add(gc);
    const Cf = rrect(16, 11, 1.5); prism(Cf, 14.4, 21.6, [fac, M.roof], gc); slabs(Cf, [17.9], 0.25, 0.2, M.white, gc); slabs(Cf, [21.3], 0.45, 0.25, M.white, gc);
    if (!CITY) { solar(gc, -1, 21.75, 0, 8, 6); hvac(gc, 5, 21.75, 2); } g.userData.gb = gb; g.userData.gc = gc;
    [[-13, 9], [13, 9], [13, -4], [10, 9.5]].forEach(([x, z]) => tree(g, x, z, 0.7, "leaf", 7.2)); hedge(g, 0, 11.6, 26, 0.6, 0.6, 7.2);
    [[-9, 5], [9, 5.5], [-9, -5]].forEach(([x, z]) => tree(gb, x, z, 0.6, "leaf", 14.4)); hedge(gb, 0, 7.2, 18, 0.5, 0.5, 14.4);
    crowd(g, 0, 10, 4, 7, 1, 7.2); crowd(gb, 0, 5.5, 3, 5, 1, 14.4); parasol(g, -4, 10, "#ffffff", 7.2);
    [-12, -6, 6, 12].forEach(x => box(1.8, 0.6, 0.4, M.leaf, g, x, 6.3, 12.25, { cast: false }));
    scatter(g, 16, 50, 44, (x, z) => Math.abs(x) < 17.5 && z > -10 && z < 13.5 || z > 12.5, ["leaf", "pine", "leaf"]);
    crowd(g, 0, 17, 7, 14, 2); lampsAlong(g, [[-18, 20], [18, 20]]); bench(g, -8, 19.5, Math.PI); bench(g, 8, 19.5, Math.PI);
  } },{ id: "atrio", name: "Uffici a L con atrio", size: "medio", w: 40, d: 32, h: 19, floors: 4,
  text: "Due ali per uffici disposte a L e unite da un atrio cilindrico tutto vetrato, affacciato su una piazza con bandiere.",
  details: ["Atrio a tutta altezza con copertura a disco", "Ali di quattro piani a nastri vetrati", "Piazza con griglia di alberi e vasca", "Tre bandiere e pensilina d'ingresso"],
  build(g) {
    plot(g, 52, 50, 4); pave(g, rrect(30, 24, 2, 7, 8)); pave(g, rrect(52, 3, 0, 0, 22), M.paving, 4, 0.02);
    const fp = poly([[-20, -16], [20, -16], [20, -4], [-8, -4], [-8, 16], [-20, 16]], [2, 2, 2, 0, 2, 2]);
    prism(fp, 0, 16, [facade({ kind: "ribbon", wall: "#f4f3ef", glass: "#4f93cf", frame: "#d0d7dc", bay: 2.4, floor: 4, cols: 4, rows: 4, band: 0.34, lit: 0.55 }), M.roof], g, { v0: 0 });
    slabs(fp, [3.9, 7.9, 11.9], 0.3, 0.25, M.white, g); slabs(fp, [15.6], 0.6, 0.3, M.white, g);
    const at = ellipse(7.5, 7.5, -8, -4);
    prism(at, 0, 19, [facade({ kind: "curtain", glass: "#a6d4ec", frame: "#eef0f2", bay: 1.2, floor: 4.75, cols: 4, rows: 4, band: 0.05, lit: 0.85, blinds: 0 }), M.white], g);
    slabs(at, [18.9], 0.5, 0.8, M.white, g); slabs(at, range(4.75, 14.25, 4.75), 0.2, 0.15, M.white, g);
    const cn = new THREE.Group(); cn.position.set(-1.2, 0, 2.8); cn.rotation.y = Math.PI / 4; g.add(cn);
    box(8, 0.3, 4.6, M.white, cn, 0, 4.4, 0); [-3.4, 3.4].forEach(x => cyl(0.12, 0.12, 4.4, M.steel, cn, x, 0, 2, 8));
    [[12, "#2fae7a"], [14.6, "#f4f3ef"], [17.2, "#e8483b"]].forEach(([x, c]) => flag(g, x, 17.5, c, 9));
    for (let x = 2; x <= 18; x += 5.3) for (let z = 1; z <= 8; z += 6) { tree(g, x, z, 0.9); cyl(1.1, 1.1, 0.06, M.steelDark, g, x, 0.03, z, 14, { cast: false }); }
    pool(g, rrect(10, 3, 1, 8, 13.5)); bench(g, 3, 13.5, -Math.PI / 2); crowd(g, 6, 9, 9, 9, 6); hvac(g, 10, 16.2, -11); hvac(g, 14, 16.2, -9); solar(g, -14, 16.2, 0, 8, 12); roofKit(g, 16.2, [[0, -10, "s"]]);
    scatter(g, 12, 52, 50, (x, z) => (x < 21.5 && z < -2.5 && z > -17.5) || (x < -6.5 && x > -21.5) || (x > -9 && z > -4), ["leaf", "pine"]);
    lampsAlong(g, [[-6, 21], [20, 21], [22, 5]]);
  } }
];

function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert(), buckets = new Map(), kill = [];
  root.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material)) return;
    const src = o.geometry; if (!src.attributes.normal || !src.attributes.uv) return;
    const g = src.index ? src.toNonIndexed() : src.clone(); g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const key = o.material.uuid + (o.castShadow ? "c" : "n"); if (!buckets.has(key)) buckets.set(key, { mat: o.material, cast: o.castShadow, list: [] });
    buckets.get(key).list.push(g); kill.push(o);
  });
  kill.forEach(o => o.parent.remove(o));
  buckets.forEach(({ mat, cast, list }) => {
    const n = list.reduce((s, g) => s + g.attributes.position.count, 0), P = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2); let k = 0;
    list.forEach(g => { P.set(g.attributes.position.array, k * 3); N.set(g.attributes.normal.array, k * 3); U.set(g.attributes.uv.array, k * 2); k += g.attributes.position.count; g.dispose(); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(P, 3)); geo.setAttribute("normal", new THREE.BufferAttribute(N, 3)); geo.setAttribute("uv", new THREE.BufferAttribute(U, 2)); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = true; root.add(m);
  });
}


  plot = scatter = crowd = person = car = parkingLot = lampsAlong = bench = bike = truck = flag = bollard = () => {};
  let ready = false;
  function build(id, seed) {
    if (!ready) { buildTextures(); buildMaterials(); buildPropMats(); ready = true; }
    const b = CATALOG.find(x => x.id === id), root = new THREE.Group(); rnd = seeded(seed); b.build(root); bake(root);
    return { root, info: b };
  }
  return { build, W };
})();

/* ---------- loghi dei progetti: sul tetto per la vista dall'alto, in facciata per quella dal viale ---------- */
/* loghi incorporati: quadrato per il tetto, orizzontale per la facciata (file originali in loghi/) */
const LOGOS = Object.fromEntries(DATA.projects.map(p => [p.id, { roof: `/logos/${p.id}-roof.png`, front: `/logos/${p.id}-front.png` }]));
function logoMat(p, w, h, kind) {
  const CW = 1024, CH = Math.max(96, Math.round(CW * h / w)), [c, g] = cnv(CW, CH), t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const draw = img => {
    g.clearRect(0, 0, CW, CH); const r = Math.min(CW, CH) * 0.14; g.fillStyle = "#ffffff";
    g.beginPath(); g.moveTo(r, 0); g.arcTo(CW, 0, CW, CH, r); g.arcTo(CW, CH, 0, CH, r); g.arcTo(0, CH, 0, 0, r); g.arcTo(0, 0, CW, 0, r); g.fill();
    if (img && kind === "roof") { g.save(); g.clip(); g.drawImage(img, 0, 0, CW, CH); g.restore(); t.needsUpdate = true; return; }
    const pw = CW * 0.84, ph = CH * 0.7;
    if (img) { const iw0 = img.naturalWidth || img.width || 300, ih0 = img.naturalHeight || img.height || 150, k = Math.min(pw / iw0, ph / ih0); g.drawImage(img, (CW - iw0 * k) / 2, (CH - ih0 * k) / 2, iw0 * k, ih0 * k); }
    else {
      const fam = FONT_D; g.fillStyle = BRAND[p.id] || "#1e2024"; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `900 ${Math.round(ph)}px ${fam}`; const k = Math.min(1, pw / g.measureText(p.title).width); g.font = `900 ${Math.floor(ph * k)}px ${fam}`; g.fillText(p.title, CW / 2, CH * 0.54);
    }
    t.needsUpdate = true;
  };
  draw(null);
  const src = LOGOS[p.id] && LOGOS[p.id][kind]; if (src) { const im = new Image(); im.onload = () => draw(im); im.src = src; }
  const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.5, transparent: true });
  W.signs.push([m, 0.7]); return m;
}
function logoRoof(p, parent, x, y, z, w, d, flip) {
  const m = mesh(new THREE.PlaneGeometry(w, d), logoMat(p, w, d, "roof"), parent, x, y, z, { cast: false }); m.rotation.set(-Math.PI / 2, 0, flip ? Math.PI : 0);
}
function logoFront(p, parent, x, y, z, w, h) {
  box(w + 0.4, h + 0.4, 0.16, std("#ffffff", { roughness: 0.5 }), parent, x, y - (h + 0.4) / 2, z);
  mesh(new THREE.PlaneGeometry(w, h), logoMat(p, w, h, "front"), parent, x, y, z + 0.09, { cast: false });
}
/* punti in coordinate dell'edificio a grandezza catalogo: [gruppo, x, y, z, larghezza, altezza] */
const CAT_SCALE = 0.6;
const LOGO_SPOTS = {
  atrio: { roof: [null, -8, 19.45, -4, 11, 11], front: [null, 9, 12.4, -3.6, 13, 3.4] },
  corte: { roof: [null, 0, 12.55, -7, 7.5, 7.5], front: [null, 0, 9.4, -1.75, 10, 3] },
  terrazze: { roof: ["gc", 0, 21.8, 0, 8, 8], front: ["gb", 0, 11.6, 7.85, 12, 3] },
  startup: { roof: [null, 0, 14.65, 4.2, 4.2, 4.2], front: [null, 0, 13.2, 6.75, 7, 1.6] },
};
function catBuilding(p, L, id) {
  const { root, info } = CAT.build(id, 300 + id.length * 13), S = LOGO_SPOTS[id], par = k => k ? root.userData[k] : root;
  const [rk, rx, ry, rz, rw, rd] = S.roof; logoRoof(p, par(rk), rx, ry, rz, rw, rd, !!L.rot);
  const [fk, fx, fy, fz, fw, fh] = S.front; logoFront(p, par(fk), fx, fy, fz, fw, fh);
  root.scale.setScalar(CAT_SCALE);
  const g = new THREE.Group(); g.add(root); return { g, top: info.h * CAT_SCALE + 1 };
}
const ARCH = {
  atrio: (p, L) => catBuilding(p, L, "atrio"),
  corte: (p, L) => catBuilding(p, L, "corte"),
  terrazze: (p, L) => catBuilding(p, L, "terrazze"),
  startup: (p, L) => catBuilding(p, L, "startup"),
  /* sede: blocco vetrato a nastri con testata curva, eliporto e lettere sul tetto */
  hq(p, L) {
    const g = new THREE.Group(), white = std("#ffffff", { roughness: 0.5 }), B = { x: -1.5, z: -1.5, w: 12, d: 8, h: 18 };
    const spec = { wall: "#f6f6f3", glass: "#4f93cf", frame: "#ffffff", ribbon: true, bay: 2, floor: 3, lit: 0.75, roof: "#e4e6e9", rough: 0.35, metal: 0.2 };
    box(L.w, 0.25, L.d, std(PAL.concrete), g, 0, 0, 0, { cast: false });
    facadeBox(B.w, B.h, B.d, spec, g, B.x, 0.25, B.z);
    facadeCyl(B.d / 2, B.h, spec, g, B.x + B.w / 2, 0.25, B.z, 0, Math.PI);
    for (let i = 1; i <= 6; i++) { const y = 0.25 + i * 3 - 0.12; box(B.w, 0.24, B.d + 0.3, white, g, B.x, y, B.z, { cast: false }); cyl(B.d / 2 + 0.15, B.d / 2 + 0.15, 0.24, white, g, B.x + B.w / 2, y, B.z, 28, { cast: false }); }
    for (let i = 0; i < 3; i++) box(1.5, 0.9, 1.3, std("#c9ced4"), g, B.x - 4 + i * 2.2, 18.25, B.z - 2.3);
    const [hc, hg] = cnv(256, 256); hg.fillStyle = "#3b4048"; hg.fillRect(0, 0, 256, 256); hg.strokeStyle = "#ffb627"; hg.lineWidth = 12; hg.beginPath(); hg.arc(128, 128, 100, 0, 7); hg.stroke();
    hg.fillStyle = "#ffffff"; hg.font = `900 130px ${FONT_D}`; hg.textAlign = "center"; hg.textBaseline = "middle"; hg.fillText("H", 128, 136);
    const pad = new THREE.MeshStandardMaterial({ map: canvasTex(hc), roughness: 0.8 });
    mesh(new THREE.CylinderGeometry(3.3, 3.3, 0.2, 32).translate(0, 0.1, 0), [std("#3b4048"), pad, pad], g, B.x + B.w / 2 + 0.4, 18.25, B.z);
    letters3D("LEARNN", 2.3, 0.6, "#ff5a36", g, B.x - 1.2, 18.25, B.z + B.d / 2 - 0.6, 0, 1.4);
    cyl(0.06, 0.09, 4, std(PAL.steelDark, { metalness: 0.6 }), g, B.x - 5, 18.25, B.z - 3, 6);
    const beacon = mesh(new THREE.SphereGeometry(0.2, 12, 8), glowMat("#ff4a3a", 3), g, B.x - 5, 22.3, B.z - 3, { cast: false });
    W.anims.push(t => { beacon.material.emissiveIntensity = (Math.sin(t * 3) > 0.2 ? 3 : 0.2) * (W.night > 0.3 ? 1 : 0.5); });
    const fz = B.z + B.d / 2;
    box(5, 2.8, 0.12, std("#24303c", { roughness: 0.15, metalness: 0.6 }), g, 0, 0.25, fz + 0.02);
    box(7, 0.32, 2.8, white, g, 0, 3.05, fz + 1.4);
    [-3.2, 3.2].forEach(x => cyl(0.08, 0.08, 2.8, std(PAL.steel, { metalness: 0.5 }), g, x, 0.25, fz + 2.6, 8));
    letters3D("LEARNN", 0.72, 0.22, "#ff5a36", g, 0, 3.37, fz + 2.45, 0, 1.4);
    [[-6, 4.6], [6, 4.6]].forEach(([x, z]) => box(4.4, 0.12, 2.6, std(PAL.grass), g, x, 0.25, z, { cast: false }));
    tree(g, -6.6, 4.6, 0.9, "leaf"); tree(g, 6.6, 4.6, 0.9, "leaf"); tree(g, -7.6, -5.4, 0.8, "leaf"); tree(g, 7.4, -5.4, 0.8, "leaf");
    [-4, 4].forEach(x => box(1.6, 0.42, 0.5, std("#c89b6d"), g, x, 0.25, 5.8));
    return { g, top: 22 };
  },
  /* fabbrica-lab: capannone bianco con shed gialli, torre uffici in vetro scuro con testata curva */
  factory(p, L) {
    const g = new THREE.Group(), H = 7, A = { x: -3, z: -1.5, w: 16, d: 10 };
    box(L.w, 0.25, L.d, std(PAL.concrete), g, 0, 0, 0, { cast: false });
    facadeBox(A.w, H, A.d, { wall: "#f6f6f3", glass: "#4f93cf", frame: "#ffffff", ribbon: true, bay: 2, floor: 3.5, lit: 0.8, roof: PAL.roof }, g, A.x, 0.25, A.z);
    const teeth = 5, tw = A.w / teeth, roofM = std("#ffb627", { roughness: 0.55 }), glassM = new THREE.MeshStandardMaterial({ color: "#8cc3ec", roughness: 0.15, metalness: 0.3, emissive: "#ffd7a0", emissiveIntensity: 0 });
    W.lamps.push([glassM, 0.6]);
    for (let i = 0; i < teeth; i++) {
      const x = A.x - A.w / 2 + tw / 2 + i * tw;
      prism(tw, 2.1, A.d, roofM, g, x, H + 0.25, A.z);
      const gl = mesh(new THREE.PlaneGeometry(A.d - 0.2, 1.8), glassM, g, x + tw / 2 - 0.01, H + 0.25 + 1.05, A.z, { cast: false }); gl.rotation.y = Math.PI / 2;
    }
    const T = { x: 8.5, z: -3, w: 6, d: 6 }, dark = { wall: "#2b2f36", glass: "#5aa0dc", frame: "#2b2f36", ribbon: true, bay: 2, floor: 3, lit: 0.7, roof: "#3b4048", rough: 0.3, metal: 0.3 };
    facadeBox(T.w, 12, T.d, dark, g, T.x, 0.25, T.z);
    facadeCyl(T.w / 2, 12, dark, g, T.x, 0.25, T.z + T.d / 2, -Math.PI / 2, Math.PI);
    box(2.4, 1, 2, std("#c9ced4"), g, T.x, 12.25, T.z - 1);
    cyl(0.85, 1.1, 15, std("#f6f6f3"), g, -10.2, 0.25, -5, 18); cyl(0.9, 0.9, 0.9, std("#ffb627"), g, -10.2, 12, -5, 18);
    smoke(g, -10.2, 15.4, -5, 1);
    letters3D("VOXERA OS", 1.9, 0.5, "#1f2a44", g, A.x, H + 0.25, A.z + A.d / 2 - 0.5, 0, 0.8);
    const fz = A.z + A.d / 2;
    [-8, -4.5].forEach(x => { box(2.6, 3.4, 0.15, std("#3b4048", { metalness: 0.4, roughness: 0.5 }), g, x, 0.25, fz + 0.03); box(3, 0.15, 1, std(PAL.steel), g, x, 3.9, fz + 0.5); });
    box(3, 2.7, 0.12, std("#24303c", { roughness: 0.15, metalness: 0.6 }), g, 1, 0.25, fz + 0.02);
    box(5, 0.3, 2.4, std("#ffffff", { roughness: 0.5 }), g, 1, 3.1, fz + 1.2);
    letters3D("VOXERA", 0.7, 0.22, "#2b2f36", g, 1, 3.4, fz + 2.1, 0, 1);
    truck(g, -9.5, 6.4, 0, PAL.white);
    tree(g, 6.5, 5.5, 0.85, "leaf"); tree(g, 10.5, 5.5, 0.85, "leaf");
    return { g, top: 14 };
  },
  site(p, L) {
    const g = new THREE.Group();
    mesh(new THREE.PlaneGeometry(L.w, L.d), std("#c9b48f", { map: noiseTex("#c9b48f", 8, 128, [4, 3]) }), g, 0, 0.06, 0, { cast: false }).rotation.x = -Math.PI / 2;
    fence(g, L.w, L.d);
    const concrete = std("#eeece7", { roughness: 0.85 }), FW = 10, FD = 7, FH = 3.1, floors = 5;
    for (let f = 0; f < floors; f++) {
      const y = 0.06 + f * FH, partial = f === floors - 1;
      if (f > 0) box(FW, 0.3, FD, concrete, g, -1.5, y - 0.3, -0.5);
      for (let i = 0; i <= 4; i++) for (let j = 0; j <= 2; j++) {
        if (partial && (i > 2 || (i === 2 && j === 2))) continue;
        box(0.4, FH - 0.3, 0.4, concrete, g, -1.5 - FW / 2 + 0.2 + i * (FW - 0.4) / 4, y, -0.5 - FD / 2 + 0.2 + j * (FD - 0.4) / 2);
      }
      if (f < 2) facadeBox(FW, FH - 0.3, 0.2, { wall: "#f4f3ef", glass: "#4f93cf", frame: "#ffffff", winW: 0.7, winH: 0.6, bay: 2.5, floor: 2.8, lit: 0.0, roof: "#c8c1b4" }, g, -1.5, y, -0.5 + FD / 2 - 0.1);
    }
    const sc = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.01, 1, 1)), new THREE.LineBasicMaterial({ color: "#d7a23a" }));
    for (let f = 0; f < 4; f++) for (let k = 0; k < 6; k++) { const s = sc.clone(); s.scale.set(1, FH, FD / 6); s.position.set(-1.5 + FW / 2 + 0.8, 0.06 + FH * (f + 0.5), -0.5 - FD / 2 + FD / 12 + k * FD / 6); g.add(s); }
    crane(g, 6.5, -3.5, "GESTIO");
    for (let i = 0; i < 6; i++) box(1.2, 0.5 + (i % 3) * 0.3, 1.2, std(i % 2 ? "#a77b4b" : "#8f8a80"), g, 5 + (i % 3) * 1.4, 0.06, 3 + Math.floor(i / 3) * 1.5);
    const mixer = new THREE.Group(); g.add(mixer); mixer.position.set(-6, 0, 5.2);
    box(1.6, 1.6, 2, std("#d7d2c6"), mixer, 2.2, 0.5, 0); box(4, 0.5, 2, std("#33373a"), mixer, 0, 0.3, 0);
    const drum = mesh(new THREE.CylinderGeometry(0.9, 1.1, 3, 14), std(PAL.safety), mixer, -0.6, 1.8, 0); drum.rotation.z = Math.PI / 2 - 0.25;
    W.anims.push(t => { drum.rotation.x = t * 1.5; });
    const board = new THREE.Group(); g.add(board); board.position.set(-L.w / 2 + 3.2, 0, L.d / 2 + 0.2);
    box(0.12, 2.6, 0.12, std(PAL.steelDark), board, -1.6, 0, 0); box(0.12, 2.6, 0.12, std(PAL.steelDark), board, 1.6, 0, 0);
    sign("GESTIO", 3.6, 1.6, board, 0, 2.1, 0.08, 0, { bg: "#f2ede2", fg: "#1e2024", sub: "CANTIERE IN CORSO", glow: 0.5 });
    letters3D("GESTIO", 1.5, 0.45, "#2f8fd8", g, 0.5, 0.06, L.d / 2 - 1.1, 0, 1);
    return { g, top: 17 };
  },
  /* palazzina startup: due piani a nastro, angolo curvo, terrazza e fumetto 3D */
  workshop(p, L) {
    const g = new THREE.Group(), purple = "#7b5cd6", B = { x: 0.5, z: -1, w: 10, d: 7, h: 7 };
    const spec = { wall: "#f6f6f3", glass: "#4f93cf", frame: "#ffffff", ribbon: true, bay: 2, floor: 3.5, lit: 0.8, roof: "#e4e6e9" };
    box(L.w, 0.25, L.d, std(PAL.concrete), g, 0, 0, 0, { cast: false });
    facadeBox(B.w, B.h, B.d, spec, g, B.x, 0.25, B.z);
    facadeCyl(B.d / 2, B.h, spec, g, B.x - B.w / 2, 0.25, B.z, Math.PI, Math.PI);
    box(0.5, 8, 0.7, std(purple, { roughness: 0.5 }), g, B.x + B.w / 2 - 0.3, 0.25, B.z + B.d / 2 + 0.3);
    box(5, 0.16, 4.4, std("#c89b6d"), g, B.x + 1.8, 7.25, B.z - 0.6);
    [[B.x + 0.6, B.z - 1.4, "#ff5a36"], [B.x + 3, B.z - 0.2, "#2f8fd8"]].forEach(([x, z, c]) => { cyl(0.05, 0.05, 2.2, std(PAL.steel), g, x, 7.4, z, 6); mesh(new THREE.ConeGeometry(1.2, 0.5, 8).translate(0, 0.25, 0), std(c, { flatShading: true }), g, x, 9.3, z); });
    const bub = new THREE.Group(); g.add(bub); bub.position.set(B.x - B.w / 2, 10.8, B.z - 1.2);
    const bm = new THREE.MeshStandardMaterial({ color: purple, emissive: purple, emissiveIntensity: 0, roughness: 0.4, flatShading: true }); W.signs.push([bm, 0.8]);
    mesh(new THREE.IcosahedronGeometry(1.3, 1), bm, bub).scale.set(1.45, 1, 0.55);
    const tail = mesh(new THREE.ConeGeometry(0.45, 1, 4), bm, bub, -0.9, -1.1, 0); tail.rotation.z = -0.6; tail.rotation.x = Math.PI;
    [-0.6, 0, 0.6].forEach(x => mesh(new THREE.SphereGeometry(0.17, 8, 6), std("#ffffff"), bub, x, 0, 0.72));
    cyl(0.07, 0.07, 2.4, std(PAL.steel), g, B.x - B.w / 2, 7.25, B.z - 1.2, 6);
    W.anims.push(t => { bub.position.y = 10.8 + Math.sin(t * 1.6) * 0.15; bub.rotation.y = Math.sin(t * 0.5) * 0.3; });
    letters3D("SMALLTALK", 0.95, 0.4, purple, g, B.x + 1.3, B.h + 0.25, B.z + B.d / 2 - 0.4, 0, 1.2);
    const fz = B.z + B.d / 2;
    box(2.4, 2.6, 0.12, std("#24303c", { roughness: 0.15, metalness: 0.6 }), g, B.x, 0.25, fz + 0.02);
    box(4, 0.28, 1.8, std("#ffffff", { roughness: 0.5 }), g, B.x, 3.05, fz + 0.9);
    van(g, -4.6, 4.6);
    tree(g, 5.6, 4.4, 0.8, "leaf");
    return { g, top: 11 };
  }
};
function fence(g, w, d) {
  const post = std(PAL.steel, { metalness: 0.6, roughness: 0.4 }), net = new THREE.MeshStandardMaterial({ color: "#9aa1a6", transparent: true, opacity: 0.28, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.4, depthWrite: false });
  [[0, -d / 2, w, 0], [0, d / 2, w, 0], [-w / 2, 0, d, Math.PI / 2], [w / 2, 0, d, Math.PI / 2]].forEach(([x, z, len, ry]) => {
    const p = mesh(new THREE.PlaneGeometry(len, 1.8), net, g, x, 0.96, z, { cast: false }); p.rotation.y = ry;
    for (let s = -len / 2; s <= len / 2 + 0.01; s += 2) box(0.07, 1.9, 0.07, post, g, x + (ry ? 0 : s), 0, z + (ry ? s : 0));
  });
}
function crane(g, x, z, banner) {
  const c = new THREE.Group(); g.add(c); c.position.set(x, 0, z);
  const yel = std(PAL.safety, { roughness: 0.5, metalness: 0.3 });
  box(1.6, 0.6, 1.6, std(PAL.concreteDark), c);
  const mastGeo = new THREE.BoxGeometry(0.9, 26, 0.9); mastGeo.translate(0, 13.6, 0); mesh(mastGeo, yel, c);
  const lattice = new THREE.LineSegments(new THREE.EdgesGeometry(mastGeo), new THREE.LineBasicMaterial({ color: "#7a5a16" })); c.add(lattice);
  const head = new THREE.Group(); head.position.y = 26.6; c.add(head);
  box(1.4, 1.2, 1.4, std("#e9e4d8"), head, 0, -0.2, 0);
  box(24, 0.7, 0.7, yel, head, -8, 1.0, 0); box(7, 0.6, 0.6, yel, head, 6, 1.0, 0);
  box(2, 1.6, 1.2, std(PAL.concreteDark), head, 8.5, -0.2, 0);
  mesh(new THREE.ConeGeometry(0.5, 3, 4).translate(0, 1.5, 0), yel, head, 0, 0.6, 0);
  const trolley = new THREE.Group(); head.add(trolley);
  box(0.8, 0.3, 0.9, std(PAL.steelDark), trolley, 0, 0.6, 0);
  const cable = box(0.04, 9, 0.04, std("#222"), trolley, 0, -8.4, 0, { cast: false });
  box(1.8, 0.4, 1.2, std("#a77b4b"), trolley, 0, -8.8, 0);
  if (banner) [1, -1].forEach(sd => sign(banner, 8.5, 1.9, head, -13, 0.05, sd * 0.37, sd > 0 ? 0 : Math.PI, { bg: "#f2ede2", fg: "#1e2024", sub: "CANTIERE IN CORSO", glow: 0.8 }));
  W.anims.push(t => { head.rotation.y = Math.sin(t * 0.12) * 1.2 + 0.4; trolley.position.x = -10 + Math.sin(t * 0.35) * 5; });
}
function truck(g, x, z, ry, color) {
  const t = new THREE.Group(); g.add(t); t.position.set(x, 0, z); t.rotation.y = ry;
  box(2.2, 2.4, 6, std(color, { roughness: 0.6 }), t, 0, 0.6, -0.8);
  box(2.2, 1.8, 1.8, std("#2f3337", { roughness: 0.5 }), t, 0, 0.6, 3.1);
  [[-1.1, -2.6], [1.1, -2.6], [-1.1, 2.9], [1.1, 2.9]].forEach(([wx, wz]) => { const w = mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 12), std("#1b1c1e"), t, wx, 0.45, wz); w.rotation.z = Math.PI / 2; });
  return t;
}
function van(g, x, z) {
  const v = new THREE.Group(); g.add(v); v.position.set(x, 0, z); v.rotation.y = Math.PI / 2;
  box(1.6, 1.6, 4, std("#d7d2c6", { roughness: 0.5 }), v, 0, 0.35, 0); box(1.5, 0.6, 1, std("#2b3036", { roughness: 0.2, metalness: 0.5 }), v, 0, 1.2, 1.5, { cast: false });
}
function car(color) {
  const c = new THREE.Group();
  box(1.7, 0.7, 3.8, std(color, { roughness: 0.35, metalness: 0.4 }), c, 0, 0.3, 0);
  box(1.5, 0.55, 2, std("#2b3036", { roughness: 0.15, metalness: 0.6 }), c, 0, 1.0, -0.2);
  box(1.4, 0.15, 0.05, glowMat("#fff4dc", 2), c, 0, 0.6, 1.91, { cast: false });
  box(1.4, 0.12, 0.05, glowMat("#ff3b2f", 1.2), c, 0, 0.62, -1.91, { cast: false });
  return c;
}
const smokeTex = (() => { const [c, g] = cnv(128, 128); const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62); gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.5, "rgba(255,255,255,0.35)"); gr.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
function smoke(parent, x, y, z, scale = 1) {
  const n = 34, parts = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.SpriteMaterial({ map: smokeTex, color: PAL.smoke, transparent: true, depthWrite: false, opacity: 0 });
    const s = new THREE.Sprite(m); parent.add(s); parts.push({ s, p: i / n, r: rnd() });
  }
  W.anims.push((t, dt) => parts.forEach(o => {
    o.p = (o.p + dt / 9) % 1; const p = o.p;
    o.s.position.set(x + p * 9 * scale + Math.sin(p * 6 + o.r * 6) * 0.6, y + p * 13 * scale, z + p * 3 * scale);
    o.s.scale.setScalar((1.4 + p * 7) * scale);
    o.s.material.opacity = (p < 0.08 ? p / 0.08 : 1 - p) * 0.5;
    o.s.material.color.copy(W.smokeColor);
  }));
}

/* ---------- città ---------- */
const CROSS = [-13, 0.5, 13.5, 26];
function buildCity() {
  const city = new THREE.Group(); scene.add(city);
  const groundM = new THREE.MeshStandardMaterial({ map: TEX.lot.map, normalMap: TEX.lot.nmap, roughness: 0.95 }); W.groundMats.push([groundM, TEX.lot.map]);
  const { x0, x1 } = PLAN.canal;
  scaleUV(box(x0 + 52, 2, 76, groundM, city, (-52 + x0) / 2, -2, 0, { cast: false }).geometry, (x0 + 52) / 14, 76 / 14);
  scaleUV(box(54 - x1, 2, 76, groundM, city, (x1 + 54) / 2, -2, 0, { cast: false }).geometry, (54 - x1) / 14, 76 / 14);
  box(x1 - x0, 1, 76, std("#3d3b36"), city, (x0 + x1) / 2, -3.2, 0, { cast: false });
  TEX.waterMat = new THREE.MeshStandardMaterial({ color: PAL.water, roughness: 0.1, metalness: 0.25, normalMap: TEX.water.nmap, normalScale: new THREE.Vector2(0.6, 0.6) });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 76, 1, 1), TEX.waterMat);
  water.rotation.x = -Math.PI / 2; water.position.set((x0 + x1) / 2, -0.9, 0); water.receiveShadow = true; city.add(water);
  [x0, x1].forEach(x => box(0.5, 0.25, 76, std(PAL.concrete), city, x + (x === x0 ? -0.25 : 0.25), 0, 0, { cast: false }));
  const FAR = 2400, farM = new THREE.MeshStandardMaterial({ map: TEX.far.map, normalMap: TEX.far.nmap, roughness: 1 }); W.groundMats.push([farM, TEX.far.map]);
  [[(-FAR + x0) / 2, x0 + FAR], [(x1 + FAR) / 2, FAR - x1]].forEach(([cx, w]) => { const pl = mesh(new THREE.PlaneGeometry(w, FAR * 2), farM, city, cx, -0.02, 0, { cast: false }); pl.rotation.x = -Math.PI / 2; scaleUV(pl.geometry, w / 70, FAR * 2 / 70); });
  [-1, 1].forEach(sg => {
    box(x1 - x0, 1, FAR, std("#3d3b36"), city, (x0 + x1) / 2, -3.2, sg * (38 + FAR / 2), { cast: false });
    const wf = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, FAR), water.material); wf.rotation.x = -Math.PI / 2; wf.position.set((x0 + x1) / 2, -0.9, sg * (38 + FAR / 2)); city.add(wf);
    box(x1 - x0 + 0.01, 0.9, FAR, std(PAL.concreteDark), city, (x0 + x1) / 2, -0.95, sg * (38 + FAR / 2), { cast: false }).visible = false;
    [x0, x1].forEach(x => box(0.5, 0.25, FAR, std(PAL.concrete), city, x + (x === x0 ? -0.25 : 0.25), 0, sg * (38 + FAR / 2), { cast: false }));
  });
  for (let z = -34; z <= 34; z += 4) [x0 - 0.6, x1 + 0.6].forEach(x => cyl(0.18, 0.22, 0.5, std(PAL.steelDark), city, x, 0, z, 8));

  const asphalt = TEX.asphaltMat = new THREE.MeshStandardMaterial({ map: TEX.asphalt.map, normalMap: TEX.asphalt.nmap, roughness: 0.95 });
  const walk = new THREE.MeshStandardMaterial({ map: TEX.walk.map, normalMap: TEX.walk.nmap, roughness: 0.9 });
  const tiled = (m, w, d, T = 9) => scaleUV(m.geometry, w / T, d / T);
  const mark = std(PAL.marking, { roughness: 0.7 });
  PLAN.roads.forEach((r, i) => {
    const horiz = r.a[1] === r.b[1], len = horiz ? r.b[0] - r.a[0] : r.b[1] - r.a[1];
    const cx = (r.a[0] + r.b[0]) / 2, cz = (r.a[1] + r.b[1]) / 2, y = 0.01 + i * 0.003;
    const sw = r.w + 3;
    tiled(box(horiz ? len : sw, 0.14, horiz ? sw : len, walk, city, cx, y, cz, { cast: false }), horiz ? len : sw, horiz ? sw : len, 4);
    tiled(box(horiz ? len : r.w, 0.15, horiz ? r.w : len, asphalt, city, cx, y + 0.01, cz, { cast: false }), horiz ? len : r.w, horiz ? r.w : len);
    if (r.avenue) {
      tiled(box(len, 0.2, 2.2, walk, city, cx, y + 0.02, cz, { cast: false }), len, 2.2, 4); /* passeggiata pedonale al centro */
      const views = Object.values(PLAN.lots).filter(L => L.view).map(viewOf), eyes = views.map(v => v.eye.x);
      /* niente alberi nel cono di vista del pedone verso ogni ingresso */
      /* la mezzeria resta libera: è il percorso del pedone. Alberi solo oltre gli edifici */
      for (let x = r.a[0] + 3; x < r.b[0]; x += 6) { if (Math.abs(x - 6) < 40 || (x > x0 - 2 && x < x1 + 2)) continue; tree(city, x, cz, 0.8); }
      for (let x = r.a[0] + 2; x < r.b[0]; x += 8) { if (x > x0 - 1 && x < x1 + 1) continue;
        [[x, cz - r.w / 2 - 0.9, -Math.PI / 2], [x + 4, cz + r.w / 2 + 0.9, Math.PI / 2]].forEach(([lx, lz, ry]) => { if (!eyes.some(e => Math.abs(e - lx) < 2.5)) (W.streetLamps = W.streetLamps || []).push(lamp(city, lx, lz, ry)); }); }
    } else {
      for (let s = -len / 2 + 1; s < len / 2; s += 3) box(horiz ? 1.4 : 0.15, 0.16, horiz ? 0.15 : 1.4, mark, city, cx + (horiz ? s : 0), y + 0.01, cz + (horiz ? 0 : s), { cast: false });
    }
    if (horiz && r.a[0] < x0) box(x1 - x0 + 2, 0.8, sw, std(PAL.concreteDark), city, (x0 + x1) / 2, -0.8, cz);
  });
  CROSS.forEach(x => { for (let k = -5; k <= 5; k++) if (k) box(2.6, 0.17, 0.5, mark, city, x, 0.04, 4 + k * 0.9, { cast: false }); });

  const rz = PLAN.rail;
  box(4000, 0.4, 4.2, std("#b9b3a6", { map: noiseTex("#b9b3a6", 12, 128, [700, 1]) }), city, 0, 0, rz, { cast: false });
  const ext = box(4000, 0.15, 10, asphalt, city, 0, 0, 4, { cast: false }); ext.position.y = -0.01; tiled(ext, 4000, 10);
  [[-2000, -50], [50, 2000]].forEach(([a, b]) => box(b - a, 0.16, 0.2, std(PAL.marking), city, (a + b) / 2, 0, 4, { cast: false }));
  box(x1 - x0 + 4, 1, 4.6, std(PAL.rust, { metalness: 0.4 }), city, (x0 + x1) / 2, -1, rz);
  const sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.15, 2.8), std("#4a3e33"), 1400); const dm = new THREE.Object3D();
  for (let i = 0; i < 1400; i++) { dm.position.set(-260 + i * 0.37, 0.45, rz); dm.updateMatrix(); sleepers.setMatrixAt(i, dm.matrix); } sleepers.receiveShadow = true; city.add(sleepers);
  [-0.75, 0.75].forEach(o => box(4000, 0.14, 0.12, std("#9aa0a6", { metalness: 0.8, roughness: 0.3 }), city, 0, 0.5, rz + o, { cast: false }));
  const train = new THREE.Group(); city.add(train);
  box(10, 3.2, 2.6, std("#b8412f", { roughness: 0.5, metalness: 0.3 }), train, 0, 0.7, 0); box(3, 1, 2.4, std("#2b3036", { metalness: 0.5, roughness: 0.3 }), train, 3, 3.9, 0);
  box(0.05, 0.35, 1.4, glowMat("#fff4dc", 3), train, 5.03, 2.6, 0, { cast: false });
  for (let i = 0; i < 7; i++) {
    const x = -11.5 * (i + 1);
    if (i % 3 === 1) { const tk = mesh(new THREE.CylinderGeometry(1.25, 1.25, 10, 16), std("#c9c4b8", { metalness: 0.5, roughness: 0.4 }), train, x, 2.2, 0); tk.rotation.z = Math.PI / 2; box(10.6, 0.5, 2.5, std("#2f3337"), train, x, 0.7, 0); }
    else box(10.6, 3, 2.7, std(PAL.containers[i % PAL.containers.length], { map: facadeTex({ wall: PAL.containers[i % PAL.containers.length], ribs: true, grain: 10 })[0] }), train, x, 0.7, 0);
  }
  train.position.set(-160, 0, rz);
  W.anims.push((t, dt) => { train.position.x += dt * 5; if (train.position.x > 320) train.position.x = -240; });

  const portX = x1 + 4;
  for (let z = 13; z <= 27; z += 3.2) for (let row = 0; row < 2; row++) {
    const stack = 1 + Math.floor(rnd() * 3);
    for (let s = 0; s < stack; s++) {
      const col = PAL.containers[Math.floor(rnd() * PAL.containers.length)];
      box(2.5, 2.6, 6, std(col, { map: facadeTex({ wall: col, ribs: true, grain: 3 })[0], roughness: 0.55, metalness: 0.1 }), city, portX + row * 2.8, s * 2.62, z * 1 + 0.5);
    }
  }
  const gantry = new THREE.Group(); city.add(gantry); gantry.position.set(portX + 1.4, 0, 20);
  const gy = std("#2f8fd8", { metalness: 0.2, roughness: 0.5 });
  [[-4.6, -2.5], [4.6, -2.5], [-4.6, 2.5], [4.6, 2.5]].forEach(([x, z]) => box(0.6, 12, 0.6, gy, gantry, x, 0, z));
  box(10, 1, 6, gy, gantry, 0, 12, 0); box(1.4, 1, 1.4, std(PAL.white), gantry, 0, 11, 0);
  W.anims.push(t => { gantry.position.z = 20 + Math.sin(t * 0.15) * 6; });
  for (let z = -30; z <= 30; z += 7.5) if (Math.abs(z - 4) > 7) cyl(0.25, 0.3, 1.2, std(PAL.safety), city, x1 + 1.2, 0, z, 8);

  const silos = new THREE.Group(); city.add(silos); silos.position.set(45, 0, -10);
  box(13, 0.25, 11, std(PAL.concrete), silos, 0, 0, 0, { cast: false });
  [[-3.4, -2.4], [0, -2.4], [3.4, -2.4], [-1.7, 1.6], [1.7, 1.6]].forEach(([x, z]) => {
    cyl(1.6, 1.6, 12, std("#f1efe9", { map: facadeTex({ wall: "#f1efe9", ribs: true, grain: 2 })[0], metalness: 0.2, roughness: 0.45 }), silos, x, 0.25, z, 24);
    mesh(new THREE.ConeGeometry(1.65, 1.4, 24).translate(0, 0.7, 0), std(PAL.steel, { metalness: 0.5 }), silos, x, 12.25, z);
  });
  box(10, 1.2, 1.2, std(PAL.steelDark, { metalness: 0.5 }), silos, 0, 12.8, -0.4);
  box(2.2, 14.5, 2.2, std(PAL.rust, { metalness: 0.3 }), silos, 5.6, 0.25, -0.4);

  [[-6.5, -9, 7, 6, 9], [-23.5, 18, 7, 9, 12], [47.5, 17.5, 9, 12, 12], [-16, 30.5, 18, 6, 7], [14, 30.5, 18, 9, 7]].forEach(([x, z, w, h, d]) => {
    if (!w) return;
    const rc = ["#2f8fd8", "#38b07a", "#e8553e", "#f4b33d", "#8d6bd6"][Math.floor(rnd() * 5)];
    facadeBox(w, h, d, { wall: "#f4f3ef", glass: "#4f93cf", frame: "#ffffff", ribbon: true, bay: 2, floor: 3, lit: 0.6, roof: "#e4e6e9" }, city, x, 0, z);
    box(w + 0.2, 0.5, d + 0.2, std(rc), city, x, h, z);
    for (let i = 0; i < 2; i++) box(1.4, 0.8, 1.2, std("#c9ced4"), city, x - w / 4 + i * w / 2, h + 0.5, z - d / 4);
  });
  const park = new THREE.Group(); city.add(park); park.position.set(40, 0, 30.5);
  tiled(box(14, 0.2, 9, asphalt, park, 0, 0, 0, { cast: false }), 14, 9);
  for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) { box(0.12, 0.21, 4, mark, park, -5.6 + i * 2.8, 0, -2.2 + j * 4.6, { cast: false }); if (rnd() < 0.7) { const c = car(PAL.containers[Math.floor(rnd() * 6)]); c.position.set(-4.2 + i * 2.8, 0.2, -2.2 + j * 4.6); park.add(c); } }
  for (let i = 0; i < 26; i++) { const x = -49 + rnd() * 4, z = -34 + i * 2.6; tree(city, x, z, 0.9); }
  for (let i = 0; i < 10; i++) tree(city, 32 + i * 1.8, 36 + rnd(), 0.7);
  for (let i = 0; i < 8; i++) tree(city, -33 + i * 4.2, -24.5 - rnd() * 0.8, 0.75);

  const lanes = [
    { a: [-60, 7.6], b: [62, 7.6] }, { a: [62, 0.4], b: [-60, 0.4] }, { a: [-60, 6], b: [62, 6], o: 0.5 }, { a: [62, 2], b: [-60, 2], o: 0.45 },
    { a: [-60, 7.6], b: [62, 7.6], o: 0.3 }, { a: [62, 0.4], b: [-60, 0.4], o: 0.7 }
  ];
  lanes.forEach((l, i) => {
    const c = car(PAL.containers[i % PAL.containers.length]); city.add(c);
    const dx = l.b[0] - l.a[0], dz = l.b[1] - l.a[1], L = Math.hypot(dx, dz); c.rotation.y = Math.atan2(dx, dz);
    const speed = 7 + (i % 3) * 2;
    W.anims.push(t => { const p = ((t * speed / L) + (l.o || 0)) % 1; c.position.set(l.a[0] + dx * p, 0.18, l.a[1] + dz * p); });
  });
  outskirts(city);
  return city;
}
function outskirts(city) {
  const fieldMats = TEX.fields.map(t => { const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.nmap, roughness: 1 }); W.groundMats.push([m, t.map]); return m; });
  for (let i = 0; i < 70; i++) {
    const a = rnd() * Math.PI * 2, r = 80 + rnd() * 420, x = Math.cos(a) * r * 1.2, z = Math.sin(a) * r;
    if ((x > PLAN.canal.x0 - 30 && x < PLAN.canal.x1 + 30) || Math.abs(z - PLAN.rail) < 20 || Math.abs(z - 4) < 18) continue;
    const w = 30 + rnd() * 60, d = 20 + rnd() * 50;
    const f = mesh(new THREE.PlaneGeometry(w, d), fieldMats[i % 5], city, x, 0.0, z, { cast: false }); f.rotation.x = -Math.PI / 2; f.rotation.z = (rnd() - 0.5) * 0.3; scaleUV(f.geometry, w / 22, d / 22);
  }
  for (let i = 0; i < 140; i++) {
    const a = rnd() * Math.PI * 2, r = 62 + rnd() * 300, x = Math.cos(a) * r * 1.25, z = Math.sin(a) * r;
    if ((x > PLAN.canal.x0 - 6 && x < PLAN.canal.x1 + 6) || Math.abs(z - PLAN.rail) < 6 || Math.abs(z - 4) < 7) continue;
    if (Math.abs(x) < 56 && Math.abs(z) < 40) continue;
    if (rnd() < 0.3) {
      const w = 8 + rnd() * 16, h = 3 + rnd() * 5, d = 6 + rnd() * 10;
      const b = box(w, h, d, std(["#f4f3ef", "#e6e9ee", "#efe9df"][i % 3], { roughness: 0.8 }), city, x, 0, z, { cast: r < 120 }); b.rotation.y = Math.round(rnd() * 2) * Math.PI / 2 + (rnd() - 0.5) * 0.2;
    } else {
      for (let k = 0; k < 4 + rnd() * 8; k++) { const t = tree(city, x + (rnd() - .5) * 14, z + (rnd() - .5) * 14, 1 + rnd() * 0.4); if (r > 120) t.traverse(o => { o.castShadow = false; }); }
    }
  }
}

function buildProjects(city) {
  DATA.projects.forEach(p => {
    const L = PLAN.lots[p.id], { g, top } = ARCH[p.archetype](p, L);
    g.position.set(L.x, 0.16, L.z); g.rotation.y = L.rot || 0; city.add(g);
    W.items[p.id] = { id: p.id, group: g, top, kind: "project", data: p, r: Math.max(L.w, L.d) * 0.5 };
  });
  CAT.W.emissive.forEach(m => W.emissive.push(m)); CAT.W.lamps.forEach(l => W.lamps.push(l));
  DATA.freeLots.forEach(f => {
    const L = PLAN.lots[f.id], g = new THREE.Group(); g.position.set(L.x, 0.16, L.z); g.rotation.y = L.rot || 0; city.add(g);
    mesh(new THREE.PlaneGeometry(L.w, L.d), std("#d2bf95", { map: noiseTex("#d2bf95", 10, 128, [3, 3]) }), g, 0, 0.05, 0, { cast: false }).rotation.x = -Math.PI / 2;
    for (let i = 0; i < 5; i++) mesh(new THREE.IcosahedronGeometry(0.4 + rnd() * 0.5, 0), std("#b9a57c", { flatShading: true }), g, (rnd() - .5) * L.w * 0.8, 0.1, (rnd() - .5) * L.d * 0.8);
    fence(g, L.w, L.d);
    const b = new THREE.Group(); g.add(b); b.position.set(0, 0, L.d / 2 - 1.2);
    roofSign("LOTTO LIBERO", 4.6, 2.2, b, 0, 0, 0, 0, { bg: PAL.safety, fg: "#1e2024", sub: "IL PROSSIMO PROGETTO", post: 1.6, glow: 0.7 });
    W.items[f.id] = { id: f.id, group: g, top: 5, kind: "free", data: f, r: Math.max(L.w, L.d) * 0.62 };
  });
  Object.values(W.items).forEach(it => it.group.traverse(o => { if (o.isMesh) { o.userData.iid = it.id; W.pick.push(o); } }));
}

/* ---------- cartello di cantiere: i dettagli del progetto, sul marciapiede davanti all'ingresso ---------- */
function boardTex(p, i, B) {
  const CW = 2048, CH = 1640, [c, g] = cnv(CW, CH), t = canvasTex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const D = FONT_D, M = FONT_M, brand = BRAND[p.id] || "#1e2024", S = sinceText(p);
  const draw = () => {
    g.fillStyle = "#fbfaf7"; g.fillRect(0, 0, CW, CH);
    g.fillStyle = brand; g.fillRect(0, 0, CW, 150);
    g.fillStyle = "#ffffff"; g.textBaseline = "middle"; g.font = `600 52px ${M}`; g.textAlign = "left"; g.fillText("CARTELLO DI CANTIERE", 80, 78);
    g.textAlign = "right"; g.fillText(`N. ${String(i + 1).padStart(2, "0")}`, CW - 80, 78);
    g.textAlign = "left"; g.fillStyle = "#1e2024"; g.font = `900 190px ${D}`; g.fillText(p.title.toUpperCase(), 80, 290);
    g.fillStyle = "#6b6f76"; g.font = `500 54px ${M}`; g.fillText(`${p.tag} · ${p.role}`.toUpperCase(), 80, 420);
    const rows = [["INIZIO LAVORI", S ? `${S.date}` : "—", S ? S.ago : ""], ["STATO", STATUS[p.status], ""], ["GITHUB", ghText(p), ""]];
    let y = 520;
    rows.forEach(([k, v, sub]) => {
      g.fillStyle = "#d9d6cf"; g.fillRect(80, y, CW - 160, 4);
      g.fillStyle = "#6b6f76"; g.font = `600 46px ${M}`; g.fillText(k, 80, y + 82);
      g.fillStyle = "#1e2024"; g.font = `800 76px ${D}`; let x = 640;
      if (k === "STATO") { g.fillStyle = p.status === "active" ? "#3fb56b" : "#ffb627"; g.beginPath(); g.arc(x + 22, y + 84, 20, 0, 7); g.fill(); g.fillStyle = "#1e2024"; x += 66; }
      if (k === "GITHUB" && !p.github) { g.fillStyle = "#6b6f76"; g.fillRect(x, y + 74, 40, 34); g.strokeStyle = "#6b6f76"; g.lineWidth = 8; g.beginPath(); g.arc(x + 20, y + 72, 13, Math.PI, 0); g.stroke(); x += 66; g.fillStyle = "#1e2024"; }
      g.fillText(v, x, y + 84);
      if (sub) { const w = g.measureText(v).width; g.fillStyle = "#6b6f76"; g.font = `500 50px ${M}`; g.fillText(sub, x + w + 36, y + 88); }
      y += 168;
    });
    g.fillStyle = "#d9d6cf"; g.fillRect(80, y, CW - 160, 4);
    g.fillStyle = "#6b6f76"; g.font = `600 46px ${M}`; g.fillText("STACK", 80, y + 82);
    /* stack come targhette, su più righe se serve */
    let x = 640, cy = y + 42; g.font = `700 54px ${D}`;
    (p.stack || []).forEach(n => {
      const w = g.measureText(n).width + 64; if (x + w > CW - 80) { x = 640; cy += 104; }
      g.fillStyle = "#1e2024"; g.beginPath(); g.moveTo(x + 18, cy); g.arcTo(x + w, cy, x + w, cy + 84, 18); g.arcTo(x + w, cy + 84, x, cy + 84, 18); g.arcTo(x, cy + 84, x, cy, 18); g.arcTo(x, cy, x + w, cy, 18); g.fill();
      g.fillStyle = "#ffffff"; g.fillText(n, x + 32, cy + 44); x += w + 20;
    });
    /* in fondo: su telefono i pulsanti del progetto (il riquadro in basso lì non c'è), altrimenti la descrizione */
    const by = 1420, bh = 150; B.btns = [];
    if (B.cta) {
      const acts = [{ k: "more", label: "Scheda completa", ghost: true }, { k: "enter", label: "Entra" }], gap = 28, bw = (CW - 160 - gap * (acts.length - 1)) / acts.length;
      acts.forEach((a, j) => {
        const x = 80 + j * (bw + gap); B.btns.push({ k: a.k, x, y: by, w: bw, h: bh });
        g.beginPath(); g.moveTo(x + 30, by); g.arcTo(x + bw, by, x + bw, by + bh, 30); g.arcTo(x + bw, by + bh, x, by + bh, 30); g.arcTo(x, by + bh, x, by, 30); g.arcTo(x, by, x + bw, by, 30);
        if (a.ghost) { g.fillStyle = "#ebe8e1"; g.fill(); } else { g.fillStyle = "#1e2024"; g.fill(); }
        g.fillStyle = a.ghost ? "#1e2024" : "#ffffff"; g.font = `800 66px ${D}`; g.textAlign = "center"; g.fillText(a.label, x + bw / 2, by + bh / 2 + 4); g.textAlign = "left";
      });
    } else {
      g.fillStyle = "#d9d6cf"; g.fillRect(80, by - 40, CW - 160, 4);
      g.fillStyle = "#4a4e55"; g.font = `500 52px ${D}`; let line = "", ly = by + 40;
      p.text.split(" ").forEach(wd => { if (g.measureText(line + wd).width > CW - 160) { g.fillText(line, 80, ly); line = ""; ly += 72; } line += wd + " "; });
      if (ly < CH - 40) g.fillText(line, 80, ly);
    }
    t.needsUpdate = true;
  };
  B.draw = draw; draw(); if (document.fonts) document.fonts.ready.then(draw);
  return t;
}
const BOARD = { w: 3.6, h: 2.883, post: 1.1 };
function buildBoards(city) {
  W.boards = [];
  DATA.projects.forEach((p, i) => {
    const g = new THREE.Group(), steel = std(PAL.steelDark, { metalness: 0.6, roughness: 0.45 }), { w, h, post } = BOARD; city.add(g);
    [-w * 0.42, w * 0.42].forEach(px => box(0.12, post + h, 0.12, steel, g, px, 0, -0.1));
    box(w + 0.16, h + 0.16, 0.08, steel, g, 0, post - 0.08, -0.03);
    const B = { cta: false }, t = boardTex(p, i, B), m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0, roughness: 0.6 }); W.signs.push([m, 0.55]);
    const face = mesh(new THREE.PlaneGeometry(w, h), m, g, 0, post + h / 2, 0.02, { cast: false }); face.userData.board = B;
    g.traverse(o => { if (o.isMesh) { o.userData.iid = p.id; W.pick.push(o); } });
    W.boards.push({ g, view: viewOf(PLAN.lots[p.id]), s: Math.sign(PLAN.lots[p.id].view.s) || 1 });
  });
  placeBoards();
}
/* sul marciapiede lato edificio: di fianco alla linea di vista su schermi larghi, al centro e più piccolo su telefono, sotto il logo */
function placeBoards() {
  const asp = innerWidth / innerHeight, off = asp >= 1 ? 2.9 * Math.min(1, asp / 1.9) : 0, k = asp >= 1 ? 1 : 0.8, sink = asp >= 1 ? 0 : 0.75;
  (W.boards || []).forEach(b => { const B = b.g.children.find(o => o.userData.board).userData.board; if (B.cta !== asp < 1) { B.cta = asp < 1; B.draw(); } });
  (W.boards || []).forEach(({ g, view: { eye, look }, s }) => {
    const side = Math.sign(look.z - eye.z), z = eye.z + side * 5.7, t = (z - eye.z) / (look.z - eye.z), x = eye.x + (look.x - eye.x) * t - s * off;
    g.position.set(x, 0.16 - sink, z); g.scale.setScalar(k); g.rotation.y = Math.atan2(eye.x - x, eye.z - z);
  });
  /* un lampione davanti al cartello lo taglierebbe in due: quello vicino si toglie */
  (W.streetLamps || []).forEach(l => l.visible = !(W.boards || []).some(({ g }) => Math.abs(l.position.x - g.position.x) < 3 && Math.abs(l.position.z - g.position.z) < 2));
}

const ring = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 64), new THREE.MeshBasicMaterial({ color: PAL.safety, transparent: true, opacity: 0.9, depthWrite: false }));
ring.rotation.x = -Math.PI / 2; ring.visible = false; scene.add(ring);

/* ---------- ambiente: ora di Roma e meteo ---------- */
function bgTex(top, bottom) { const [c, g] = cnv(4, 256); const gr = g.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, top); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, 4, 256); const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t; }
const WEATHER = {
  clear: { name: "Sereno", sun: 1, hemi: 1, sky: null, mix: 0, fog: [340, 1200], clouds: 0.12 },
  cloudy: { name: "Nuvoloso", sun: 0.42, hemi: 1.15, sky: "#9ea4aa", mix: 0.6, fog: [260, 900], clouds: 0.85 },
  rain: { name: "Pioggia", sun: 0.18, hemi: 0.95, sky: "#6c727a", mix: 0.8, fog: [90, 380], clouds: 1, rain: true, wet: true },
  snow: { name: "Neve", sun: 0.35, hemi: 1.2, sky: "#c7ccd1", mix: 0.75, fog: [80, 340], clouds: 0.9, snow: true },
  fog: { name: "Nebbia", sun: 0.5, hemi: 1.1, sky: "#b8bab8", mix: 0.85, fog: [25, 170], clouds: 0.25 }
};
const SETTINGS = { autoTime: true, hour: 12, wx: "auto" };
try { Object.assign(SETTINGS, JSON.parse(localStorage.getItem("citta-settings") || "{}")); } catch (e) {}
function romeParts(d = new Date()) {
  const o = {}; new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Rome", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(d).forEach(p => o[p.type] = p.value);
  const local = +o.hour + +o.minute / 60; let off = Math.round(local - (d.getUTCHours() + d.getUTCMinutes() / 60)); if (off < -12) off += 24; if (off > 12) off -= 24;
  return { local, off, month: +o.month, day: +o.day };
}
function sunAt(h, off, month, day) {
  const doy = Math.round((Date.UTC(2026, month - 1, day) - Date.UTC(2026, 0, 0)) / 864e5), rad = Math.PI / 180;
  const decl = 23.44 * Math.sin(2 * Math.PI * (284 + doy) / 365) * rad, lat = 41.9 * rad, ha = ((h - off + 12.5 / 15) - 12) * 15 * rad;
  const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(ha));
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat));
  return { el, az };
}
const fmtH = h => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;
const pmrem = new THREE.PMREMGenerator(renderer);
function envMap(top, bottom) {
  const [c, g] = cnv(512, 256), gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, top); gr.addColorStop(0.48, bottom); gr.addColorStop(0.52, shade(bottom, -60)); gr.addColorStop(1, shade(bottom, -110)); g.fillStyle = gr; g.fillRect(0, 0, 512, 256);
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.encoding = THREE.sRGBEncoding;
  const rt = pmrem.fromEquirectangular(t); if (W.envRT) W.envRT.dispose(); W.envRT = rt; scene.environment = rt.texture; t.dispose();
}
function applyEnv() {
  const R = romeParts(), hour = SETTINGS.autoTime ? R.local : SETTINGS.hour, { el, az } = sunAt(hour, R.off, R.month, R.day), e = el * 180 / Math.PI;
  const kn = sstep(-10, 0, e), kd = sstep(3, 20, e);
  const C = k => new THREE.Color(TIMES.night[k]).lerp(new THREE.Color(TIMES.dusk[k]), kn).lerp(new THREE.Color(TIMES.day[k]), kd);
  const N = k => { const a = TIMES.night[k] + (TIMES.dusk[k] - TIMES.night[k]) * kn; return a + (TIMES.day[k] - a) * kd; };
  const wxKey = SETTINGS.wx === "auto" ? (W.liveWx || "clear") : SETTINGS.wx, X = WEATHER[wxKey];
  const top = C("top"), bottom = C("bottom");
  if (X.sky) { const sky = new THREE.Color(X.sky).multiplyScalar(0.12 + 0.88 * kn * (0.45 + 0.55 * kd)); top.lerp(sky, X.mix); bottom.lerp(sky, X.mix); }
  const th = "#" + top.getHexString(), bh = "#" + bottom.getHexString();
  scene.background = bgTex(th, bh); scene.fog = new THREE.Fog(bottom, X.fog[0], X.fog[1]);
  const dir = el > 0.02 ? new THREE.Vector3(-Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)) : new THREE.Vector3(Math.sin(az) * 0.55, 0.8, -Math.cos(az) * 0.55);
  W.sunDir = dir.normalize();
  sun.color.copy(C("sunColor")); sun.intensity = N("sun") * X.sun * (el > 0.02 ? Math.min(1, 0.3 + e / 10) : 1);
  hemi.color.copy(C("hemiSky")); hemi.groundColor.copy(C("hemiGround")); hemi.intensity = N("hemi") * X.hemi * 0.55;
  renderer.toneMappingExposure = N("exposure");
  const dark = X.sun < 0.45 ? 0.25 : 0, em = Math.max(N("emissive"), dark), lamps = Math.max(N("lamps"), X.sun < 0.3 ? 0.7 : 0);
  W.emissive.forEach(m => m.emissiveIntensity = em);
  W.lamps.forEach(([m, b]) => m.emissiveIntensity = lamps * b);
  W.signs.forEach(([m, b]) => m.emissiveIntensity = (0.18 + lamps * 0.75) * b);
  const envI = (0.1 + 0.25 * kd + 0.12 * kn) * (X.sun < 0.45 ? 0.8 : 1);
  if (!W.allMats) { W.allMats = new Set(); scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.isMeshStandardMaterial && W.allMats.add(m)); }); }
  W.allMats.forEach(m => m.envMapIntensity = envI * (m.userData.env ? m.userData.env * 2 : 1));
  W.night = 1 - kd; W.smokeColor = new THREE.Color(PAL.smoke).multiplyScalar(0.35 + 0.65 * Math.max(kd, kn * 0.6));
  if (W.wx) {
    W.wx.clouds.forEach(c => { c.material.opacity = X.clouds * 0.5; c.material.color.copy(new THREE.Color("#ffffff").lerp(new THREE.Color("#2a3040"), 1 - kn).lerp(new THREE.Color(X.sky || "#ffffff"), X.mix * 0.5)); });
    W.wx.rain.visible = !!X.rain; W.wx.snow.visible = !!X.snow;
    TEX.asphaltMat.roughness = X.wet ? 0.32 : 0.95; TEX.asphaltMat.metalness = X.wet ? 0.25 : 0;
    W.groundMats.forEach(([m, map]) => { m.map = X.snow ? TEX.snow.map : map; });
  }
  const key = `${Math.round(hour * 2)}-${wxKey}`;
  if (key !== W.envKey) { W.envKey = key; envMap(th, bh); }
  W.envInfo = { ora: fmtH(hour), sole_elevazione: Math.round(e), meteo: wxKey, fonte_meteo: SETTINGS.wx === "auto" ? (W.wxSource || "in attesa") : "manuale" };
  document.getElementById("loc-time").textContent = fmtH(hour);
  document.getElementById("loc-wx").textContent = X.name + (SETTINGS.wx === "auto" && W.liveTemp != null ? ` ${W.liveTemp}°` : "");
  document.getElementById("loc-mode").hidden = SETTINGS.autoTime && SETTINGS.wx === "auto";
}
function buildWeather(city) {
  const clouds = [];
  for (let i = 0; i < 70; i++) {
    const m = new THREE.SpriteMaterial({ map: smokeTex, color: "#ffffff", transparent: true, depthWrite: false, opacity: 0, fog: false });
    const s = new THREE.Sprite(m); s.position.set((rnd() - 0.5) * 520, 60 + rnd() * 25, (rnd() - 0.5) * 400); s.scale.set(50 + rnd() * 60, 22 + rnd() * 20, 1); city.add(s); clouds.push(s);
  }
  W.anims.push((t, dt) => clouds.forEach(s => { s.position.x += dt * 2.5; if (s.position.x > 260) s.position.x = -260; }));
  const NR = 2600, rp = new Float32Array(NR * 6);
  for (let i = 0; i < NR; i++) { const x = (rnd() - 0.5) * 180, y = rnd() * 70, z = (rnd() - 0.5) * 180; rp.set([x, y, z, x + 0.15, y - 1.6, z + 0.1], i * 6); }
  const rg = new THREE.BufferGeometry(); rg.setAttribute("position", new THREE.BufferAttribute(rp, 3));
  const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#b6c0cc", transparent: true, opacity: 0.45 })); rain.visible = false; city.add(rain);
  const NS = 3200, sp = new Float32Array(NS * 3);
  for (let i = 0; i < NS; i++) sp.set([(rnd() - 0.5) * 180, rnd() * 70, (rnd() - 0.5) * 180], i * 3);
  const sg = new THREE.BufferGeometry(); sg.setAttribute("position", new THREE.BufferAttribute(sp, 3));
  const snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#ffffff", size: 0.35, transparent: true, opacity: 0.95, depthWrite: false })); snow.visible = false; city.add(snow);
  W.anims.push((t, dt) => {
    if (rain.visible) { const a = rg.attributes.position.array; for (let i = 0; i < NR; i++) { const k = i * 6; let dy = dt * 55; a[k + 1] -= dy; a[k + 4] -= dy; if (a[k + 4] < 0) { a[k + 1] += 70; a[k + 4] += 70; } } rg.attributes.position.needsUpdate = true; rain.position.set(cam.target.x, 0, cam.target.z); }
    if (snow.visible) { const a = sg.attributes.position.array; for (let i = 0; i < NS; i++) { a[i * 3 + 1] -= dt * (2.5 + (i % 5) * 0.4); a[i * 3] += Math.sin(t + i) * dt * 0.6; if (a[i * 3 + 1] < 0) a[i * 3 + 1] = 70; } sg.attributes.position.needsUpdate = true; snow.position.set(cam.target.x, 0, cam.target.z); }
    if (TEX.waterMat) TEX.waterMat.normalMap.offset.set(t * 0.01, t * 0.03);
  });
  W.wx = { clouds, rain, snow };
}
async function fetchWeather() {
  try {
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=41.89&longitude=12.49&current=weather_code,temperature_2m&timezone=Europe%2FRome");
    const j = await r.json(), c = j.current.weather_code;
    W.liveTemp = Math.round(j.current.temperature_2m);
    W.liveWx = c <= 1 ? "clear" : c <= 3 ? "cloudy" : (c === 45 || c === 48) ? "fog" : ((c >= 71 && c <= 77) || c === 85 || c === 86) ? "snow" : "rain";
    W.wxSource = "Open-Meteo";
  } catch (e) { W.wxSource = "non disponibile"; }
  applyEnv(); renderSettings();
}
const settingsEl = document.getElementById("settings");
function saveSettings() { try { localStorage.setItem("citta-settings", JSON.stringify(SETTINGS)); } catch (e) {} }
function renderSettings() {
  const R = romeParts(), h = SETTINGS.autoTime ? R.local : SETTINGS.hour;
  settingsEl.innerHTML = `<div class="st-row"><span class="eyebrow">Ora</span><label class="switch"><input type="checkbox" id="auto-time" ${SETTINGS.autoTime ? "checked" : ""}> Automatica (ora di Roma)</label></div>
    <div class="st-range"><input type="range" id="hour" min="0" max="23.75" step="0.25" value="${h}" ${SETTINGS.autoTime ? "disabled" : ""} aria-label="Ora del giorno"><output id="hour-out">${fmtH(h)}</output></div>
    <div class="st-row"><span class="eyebrow">Meteo</span></div>
    <div class="chips">${["auto", ...Object.keys(WEATHER)].map(k => `<button data-wx="${k}" aria-pressed="${SETTINGS.wx === k}">${k === "auto" ? "Automatico" : WEATHER[k].name}</button>`).join("")}</div>
    <p class="note">Il meteo automatico arriva da Open-Meteo per Roma${W.wxSource && W.wxSource !== "Open-Meteo" ? ". In questa anteprima il servizio non è raggiungibile, quindi parte da Sereno" : ""}.</p>`;
  settingsEl.querySelector("#auto-time").onchange = e => { SETTINGS.autoTime = e.target.checked; if (!SETTINGS.autoTime) SETTINGS.hour = Math.round(romeParts().local * 4) / 4; saveSettings(); applyEnv(); renderSettings(); };
  const hr = settingsEl.querySelector("#hour");
  hr.oninput = () => { SETTINGS.hour = +hr.value; settingsEl.querySelector("#hour-out").textContent = fmtH(SETTINGS.hour); saveSettings(); applyEnv(); };
  settingsEl.querySelectorAll("[data-wx]").forEach(b => b.onclick = () => { SETTINGS.wx = b.dataset.wx; saveSettings(); applyEnv(); renderSettings(); });
}
document.getElementById("open-settings").onclick = () => { settingsEl.hidden = !settingsEl.hidden; document.getElementById("open-settings").setAttribute("aria-expanded", !settingsEl.hidden); if (!settingsEl.hidden) renderSettings(); };
document.addEventListener("pointerdown", e => { if (!settingsEl.hidden && !settingsEl.contains(e.target) && !document.getElementById("open-settings").contains(e.target)) { settingsEl.hidden = true; document.getElementById("open-settings").setAttribute("aria-expanded", "false"); } });


/* ---------- camera: percorso a tappe guidato dallo scroll ---------- */
const HOME = { home: true, az: 0.35, el: 1.18, dist: 150, target: new THREE.Vector3(1, 0, 4) };
let STOPS = [HOME];
function buildStops() {
  STOPS = TOUR().map(id => {
    if (!id) return { id: null, home: true };
    const { eye, look } = viewOf(PLAN.lots[id]);
    return { id, eye, look };
  });
}
const cam = { p: 0, goal: 0, look: { az: 0, el: 0 }, lookG: { az: 0, el: 0 }, idle: true, spin: 0, az: HOME.az, el: HOME.el, dist: HOME.dist, target: HOME.target.clone() };
const angDiff = a => Math.atan2(Math.sin(a), Math.cos(a));
/* movimento lineare: occhio e punto guardato scorrono in linea retta tra una tappa e l'altra */
const homeEye = () => { const a = HOME.az + cam.spin, e = HOME.el; return HOME.target.clone().add(new THREE.Vector3(Math.sin(a) * Math.cos(e), Math.sin(e), Math.cos(a) * Math.cos(e)).multiplyScalar(HOME.dist)); };
const _eye = new THREE.Vector3(), _look = new THREE.Vector3();
function camAt(p) {
  const i = Math.max(0, Math.min(STOPS.length - 1, Math.floor(p))), A = STOPS[i], B = STOPS[Math.min(STOPS.length - 1, i + 1)], f = p - i;
  const eA = A.home ? homeEye() : A.eye, eB = B.home ? homeEye() : B.eye, lA = A.home ? HOME.target : A.look, lB = B.home ? HOME.target : B.look;
  _eye.copy(eA).lerp(eB, f); _look.copy(lA).lerp(lB, f);
  /* a metà strada lo sguardo punta avanti lungo il viale, come chi cammina */
  if (!A.home && !B.home) { const w = Math.sin(Math.PI * f); _look.x += Math.sign(eB.x - eA.x) * w * 14; _look.y += (1.85 - _look.y) * w * 0.6; }
  const d = _eye.clone().sub(_look); cam.dist = d.length() * (1 - 0.82 * (cam.push || 0));
  cam.az = Math.atan2(d.x, d.z); cam.el = Math.asin(d.y / cam.dist); cam.target.copy(_look);
}
function updateCamera() {
  const w = innerWidth, h = innerHeight, asp = w / h; camera.aspect = asp;
  camera.setViewOffset(w, h, 0, w >= 760 ? 0 : 30, w, h);
  const el = cam.el + cam.look.el, az = cam.az + cam.look.az, high = sstep(0.25, 0.9, el);
  const fit = asp < 1 ? 1 + (Math.min(1.9, 1.15 / asp) - 1) * high : 1, dist = cam.dist * fit;
  camera.fov = 30 + ((asp < 1 ? 66 : 52) - 30) * (1 - high);
  camera.updateProjectionMatrix();
  const t = cam.target;
  camera.position.set(t.x + Math.sin(az) * Math.cos(el) * dist, Math.max(1.2, t.y + Math.sin(el) * dist), t.z + Math.cos(az) * Math.cos(el) * dist);
  camera.lookAt(t);
  /* l'ombra copre tutta la città ed è ferma: se seguisse la camera la mappa d'ombra tremolerebbe a ogni movimento */
  const sd = W.sunDir || new THREE.Vector3(0.5, 0.75, 0.35); sun.position.set(SHADOW_C.x + sd.x * 140, sd.y * 140, SHADOW_C.z + sd.z * 140); sun.target.position.copy(SHADOW_C);
  /* piano vicino proporzionato alla distanza: più precisione di profondità, niente sfarfallio tra strade, prati e facciate */
  const near = Math.min(6, Math.max(0.35, (camera.position.y - 0.5) * 0.12)); if (Math.abs(camera.near - near) > 1e-3) { camera.near = near; camera.updateProjectionMatrix(); }
}
const SHADOW_C = new THREE.Vector3(1, 0, 4);
camera.near = 0.4;
function step(d) { if (INS) return goIn(INS.goal + d); go(cam.goal + d); }
function go(i) {
  if (INS) return;
  const n = STOPS.length; i = Math.max(0, Math.min(n - 1, i));
  cam.from = cam.p; cam.t0 = performance.now(); cam.goal = i; cam.idle = i === 0; cam.lookG.az = cam.lookG.el = 0;
  selected = STOPS[i].id; renderCaption(); renderTour(); document.body.classList.toggle("walking", i > 0);
}
addEventListener("resize", () => { renderer.setSize(innerWidth, innerHeight, false); placeBoards(); updateCamera(); renderCaption(); });
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
/* i pulsanti disegnati sul cartello: dal punto toccato (uv) al pulsante */
function boardPress(x, y) {
  const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera);
  const h = ray.intersectObjects(W.pick, false)[0], B = h && h.object.userData.board; if (!B || !B.cta || !h.uv) return false;
  const id = h.object.userData.iid; if (id !== selected) return false;
  const cx = h.uv.x * 2048, cy = (1 - h.uv.y) * 1640, b = B.btns.find(b => cx >= b.x && cx <= b.x + b.w && cy >= b.y - 20 && cy <= b.y + b.h + 20); if (!b) return false;
  const d = W.items[id].data;
  if (b.k === "enter") enter(id); else location.href = `/progetti/${id}`;
  return true;
}
function pickAt(x, y) { const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, camera); const h = ray.intersectObjects(W.pick, false)[0]; return h ? h.object.userData.iid : null; }
let drag = null, wheelAcc = 0, wheelLock = 0;
canvas.addEventListener("contextmenu", e => e.preventDefault());
canvas.addEventListener("pointerdown", e => { canvas.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, moved: 0, az: cam.lookG.az, el: cam.lookG.el, spin: cam.spin, touch: e.pointerType !== "mouse" }; cam.idle = false; });
canvas.addEventListener("pointermove", e => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved = Math.max(drag.moved, Math.abs(dx) + Math.abs(dy));
    if (cam.goal === 0) cam.spin = drag.spin - dx * 0.005;
    else if (!(INS && drag.touch)) { cam.lookG.az = Math.max(-0.9, Math.min(0.9, drag.az - dx * 0.004)); if (!drag.touch) cam.lookG.el = Math.max(-0.25, Math.min(0.45, drag.el + dy * 0.003)); }
    return;
  }
  if (e.pointerType === "mouse" && !INS) { const id = pickAt(e.clientX, e.clientY); if (id !== W.hover) { W.hover = id; canvas.style.cursor = id ? "pointer" : "grab"; } }
});
canvas.addEventListener("pointerup", e => {
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (drag.moved < 6 && !INS && !boardPress(e.clientX, e.clientY)) select(pickAt(e.clientX, e.clientY));
    else if (INS && drag.touch && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) step(dx < 0 ? 1 : -1);
    else if (!INS && drag.touch && Math.abs(dy) > 50 && Math.abs(dy) > Math.abs(dx) * 1.2) { cam.lookG.az = drag.az; step(dy < 0 ? 1 : -1); }
  }
  drag = null;
});
canvas.addEventListener("pointercancel", () => { drag = null; });
canvas.addEventListener("wheel", e => {
  e.preventDefault(); const now = performance.now();
  if (now < wheelLock) { wheelAcc = 0; return; }
  wheelAcc += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(wheelAcc) > 40) { step(Math.sign(wheelAcc)); wheelAcc = 0; wheelLock = now + 1000; }
}, { passive: false });
document.getElementById("compass").onclick = () => { cam.spin = 0; go(0); };
addEventListener("keydown", e => {
  if (mode !== "3d" || e.target.closest("input, textarea, #settings") || !dataEl.hidden) return;
  if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); step(1); }
  else if (["ArrowUp", "PageUp"].includes(e.key)) { e.preventDefault(); step(-1); }
  else if (INS && e.key === "ArrowRight") step(1);
  else if (INS && e.key === "ArrowLeft") step(-1);
  else if (e.key === "Home") go(0);
});
addEventListener("keydown", e => { if (e.key === "Escape") { if (mode === "classic" && dataEl.hidden) return; if (!settingsEl.hidden) { settingsEl.hidden = true; document.getElementById("open-settings").setAttribute("aria-expanded", "false"); } else if (!dataEl.hidden) dataEl.hidden = true; else if (INS) leave(); else select(null); } });

/* indicatore delle tappe */
const tourEl = document.getElementById("tour");
function renderTour() {
  if (!tourEl.childElementCount) {
    tourEl.innerHTML = STOPS.map((st, i) => `<button data-stop="${i}" aria-label="${st.id ? esc(W.items[st.id].data.title) : "La città"}"><span aria-hidden="true">${st.id ? esc(W.items[st.id].data.title) : "La città"}</span><i></i></button>`).join("");
    tourEl.querySelectorAll("[data-stop]").forEach(b => b.onclick = () => go(+b.dataset.stop));
  }
  tourEl.querySelectorAll("[data-stop]").forEach(b => b.toggleAttribute("aria-current", +b.dataset.stop === cam.goal));
}

/* ---------- 3D: didascalia ---------- */
{ const br = document.getElementById("brand"); new ResizeObserver(() => document.documentElement.style.setProperty("--brand-h", br.offsetHeight + "px")).observe(br); }
const caption = document.getElementById("caption"), classicEl = document.getElementById("classic"), dataEl = document.getElementById("data");
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const bars = n => `<span class="weight" aria-label="Peso ${n} su 5">${[1, 2, 3, 4, 5].map(i => `<u class="${i <= n ? "on" : ""}"></u>`).join("")}</span>`;
let selected = null;
function select(id) {
  const i = STOPS.findIndex(st => st.id === id);
  if (i >= 0) return go(i);
  selected = id; renderCaption();
}
function renderCaption() {
  document.getElementById("hint").hidden = !!selected;
  if (!selected) { caption.hidden = true; caption.innerHTML = ""; return; }
  const it = W.items[selected], d = it.data, free = it.kind === "free";
  caption.innerHTML = `<div class="cap"><span class="dot ${free ? "free" : d.status}"></span>
    <div class="who"><span class="eyebrow">${free ? "Disponibile" : `${esc(d.tag)} · ${STATUS[d.status]}`}</span><b>${esc(d.title)}</b></div>
    <div class="acts">${!free ? `<button class="cta wide" id="cap-enter">Entra</button>` : ""}
      <button class="cta ${free ? "" : "ghost "}wide" id="cap-more">${free ? "Proponi un progetto" : "Scheda completa"}</button>
      <button class="cta ghost" id="cap-next" aria-label="Prossimo edificio" title="Prossimo edificio">→</button>
      <button class="cta ghost" id="cap-close" aria-label="Chiudi" title="Chiudi">✕</button></div></div>`;
  caption.hidden = !free && innerWidth < innerHeight;
  if (!free) caption.querySelector("#cap-enter").onclick = () => enter(selected);
  caption.querySelector("#cap-more").onclick = () => { if (free) setMode("classic", "contatti"); else location.href = `/progetti/${selected}`; };
  caption.querySelector("#cap-next").onclick = () => go(cam.goal + 1 < STOPS.length ? cam.goal + 1 : 0);
  caption.querySelector("#cap-close").onclick = () => select(null);
}

/* ---------- versione classica: stessi DATA, impaginazione tradizionale ---------- */
function bindClassic() {
  classicEl.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => { setMode("3d"); select(b.dataset.goto); });
  const cc = classicEl.querySelector("#c-contact"); if (cc) cc.onclick = () => { classicEl.querySelector("#c-contact-out").hidden = false; };
  const cd = classicEl.querySelector("#c-data"); if (cd) cd.onclick = () => document.getElementById("open-data").click();
}
let mode = "3d";
function setMode(m, anchor) {
  mode = m; document.body.dataset.mode = m;
  document.querySelectorAll("[data-mode]").forEach(b => b.setAttribute("aria-pressed", b.dataset.mode === m));
  if (m === "classic") {
    classicEl.scrollTop = 0;
    if (anchor) { const el = classicEl.querySelector("#" + anchor); if (el) { el.scrollIntoView({ block: "start" }); el.classList.add("flash"); } }
  }
  try { localStorage.setItem("citta-mode", m); history.replaceState(null, "", m === "classic" ? "#classica" : "#3d"); } catch (e) {}
}
document.querySelectorAll("[data-mode]").forEach(b => b.onclick = () => setMode(b.dataset.mode));
document.getElementById("open-data").onclick = () => {
  document.getElementById("data-json").textContent = JSON.stringify(DATA, null, 2);
  document.getElementById("theme-json").textContent = JSON.stringify({ palette: PAL, ambiente: W.envInfo, meteo: WEATHER }, null, 2);
  dataEl.hidden = false; document.getElementById("close-data").focus();
};
document.getElementById("close-data").onclick = () => { dataEl.hidden = true; };
dataEl.addEventListener("click", e => { if (e.target === dataEl) dataEl.hidden = true; });


/* ============================================================
   INTERNI — "Entra": un open space riusabile, riempito dai dati del progetto
   ============================================================ */
const iScene = new THREE.Scene(); iScene.background = new THREE.Color("#ece9e3");
{ iScene.add(new THREE.HemisphereLight("#ffffff", "#c9c0b2", 1.1)); const d = new THREE.DirectionalLight("#fff4e2", 0.9); d.position.set(5, 12, 8); iScene.add(d); }
const ROOM = { w: 24, d: 18, h: 4.6 }, ROOMS = {};
const FD = FONT_D, FM = FONT_M;
function rrPath(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function wrapText(g, text, x, y, maxW, lh) {
  let line = ""; String(text).split(" ").forEach(w => { const t = line ? line + " " + w : w; if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; } else line = t; });
  if (line) { g.fillText(line, x, y); y += lh; } return y;
}
const fmtNum = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const fmtDate = d => { const [y, m] = d.split("-").map(Number); return MESI[m - 1].slice(0, 3).toUpperCase() + " " + y; };
/* pannello disegnato su canvas (metri → pixel) e appeso a una parete */
function wallPanel(parent, w, h, x, y, z, ry, draw, ppm = 420) {
  const CW = Math.min(2048, Math.round(w * ppm)), CH = Math.min(2048, Math.round(h * ppm)), [c, g] = cnv(CW, CH), t = canvasTex(c);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const run = () => { g.clearRect(0, 0, CW, CH); g.textBaseline = "alphabetic"; g.textAlign = "left"; draw(g, CW, CH); t.needsUpdate = true; };
  run(); if (document.fonts) document.fonts.ready.then(run);
  const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: "#ffffff", emissiveIntensity: 0.28, roughness: 0.75, transparent: true });
  const pl = mesh(new THREE.PlaneGeometry(w, h), m, parent, x, y, z, { cast: false }); pl.rotation.y = ry; return { pl, run };
}
function plant(g, x, z) { cyl(0.32, 0.26, 0.62, std("#e9e5dd", { roughness: 0.6 }), g, x, 0, z, 16); mesh(new THREE.IcosahedronGeometry(0.62, 1), TREE_MATS[1], g, x, 1.2, z).scale.set(1, 1.25, 1); }

function buildRoom(p) {
  const g = new THREE.Group(), R = ROOM, I = p.inside || {}, brand = BRAND[p.id] || "#1e2024", stops = [], S = sinceText(p); iScene.add(g);
  const wall = std("#f4f2ee", { roughness: 0.92 }), brandM = std(brand, { roughness: 0.7 }), white = std("#ffffff", { roughness: 0.5 }), dark = std("#24272d", { roughness: 0.45, metalness: 0.2 });
  const floor = mesh(new THREE.PlaneGeometry(R.w, R.d), std("#cdc3b4", { roughness: 0.65, map: noiseTex("#cdc3b4", 7, 128, [6, 4]) }), g, 0, 0, 0, { cast: false }); floor.rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(R.w, R.d), std("#fbfaf8"), g, 0, R.h, 0, { cast: false }).rotation.x = Math.PI / 2;
  box(R.w, R.h, 0.2, wall, g, 0, 0, -R.d / 2 - 0.1); box(R.w, R.h, 0.2, wall, g, 0, 0, R.d / 2 + 0.1);
  box(0.2, R.h, R.d, wall, g, -R.w / 2 - 0.1, 0, 0); box(0.2, R.h, R.d, wall, g, R.w / 2 + 0.1, 0, 0);
  /* parete della reception nel colore del progetto, zoccolino colorato tutto intorno */
  box(6.6, R.h, 0.04, brandM, g, -7, 0, -R.d / 2 + 0.02);
  box(R.w, 0.12, 0.04, brandM, g, 0, 0, R.d / 2 - 0.02); box(0.04, 0.12, R.d, brandM, g, -R.w / 2 + 0.02, 0, 0); box(0.04, 0.12, R.d, brandM, g, R.w / 2 - 0.02, 0, 0);
  const light = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#fff7ea", emissiveIntensity: 1.2 });
  for (let i = -2; i <= 2; i++) for (let j = -1; j <= 1; j++) box(2.4, 0.05, 0.45, light, g, i * 4.6, R.h - 0.05, j * 5, { cast: false });

  /* 1. reception: logo e cos'è il progetto */
  logoFront(p, g, -7, 3.2, -R.d / 2 + 0.06, 4.4, 1.3);
  wallPanel(g, 4.8, 1.5, -7, 1.45, -R.d / 2 + 0.06, 0, (c, W_, H) => {
    c.fillStyle = "#ffffff"; rrPath(c, 0, 0, W_, H, 40); c.fill();
    c.fillStyle = "#6b6f76"; c.font = `600 34px ${FM}`; c.fillText(`${p.tag} · ${p.role}${S ? " · dal " + S.date : ""}`.toUpperCase(), 70, 100);
    c.fillStyle = "#1e2024"; c.font = `600 68px ${FD}`; wrapText(c, p.text, 70, 205, W_ - 140, 84);
  });
  plant(g, -3.5, -R.d / 2 + 0.9); plant(g, 3.5, -R.d / 2 + 0.9); plant(g, -10.9, -R.d / 2 + 0.9); plant(g, 10.9, -R.d / 2 + 0.9);
  stops.push({ label: "Reception", c: new THREE.Vector3(-7, 2.3, -R.d / 2), n: new THREE.Vector3(0, 0, 1), w: 5.2, h: 3.9 });

  /* timeline e lavagna dell'architettura, sulla stessa parete: si scorre di lato */
  const zb = -R.d / 2 + 0.06;
  wallPanel(g, 3.6, 3.6, 0, 2.2, zb, 0, (c, W_, H) => {
    c.fillStyle = "#ffffff"; c.fillRect(0, 0, W_, H); c.fillStyle = brand; c.fillRect(0, 0, W_, 140);
    c.fillStyle = "#ffffff"; c.font = `600 44px ${FM}`; c.fillText("TIMELINE", 70, 88);
    let y = 250; const ms = I.milestones || [];
    c.fillStyle = "#d9d6cf"; c.fillRect(96, 250, 6, Math.max(0, ms.length - 1) * 200);
    ms.forEach(m => {
      c.fillStyle = brand; c.beginPath(); c.arc(99, y, 26, 0, 7); c.fill();
      c.fillStyle = "#6b6f76"; c.font = `600 44px ${FM}`; c.fillText(fmtDate(m.date), 160, y + 15);
      c.fillStyle = "#1e2024"; c.font = `800 66px ${FD}`; y = wrapText(c, m.title, 160, y + 98, W_ - 230, 76) + 56;
    });
    if (I.commits) {
      c.fillStyle = "#ebe8e1"; c.fillRect(70, H - 250, W_ - 140, 4);
      c.fillStyle = "#1e2024"; c.font = `900 120px ${FD}`; c.fillText(fmtNum(I.commits), 70, H - 90);
      const w = c.measureText(fmtNum(I.commits)).width; c.fillStyle = "#6b6f76"; c.font = `600 36px ${FM}`; c.fillText("COMMIT", 100 + w, H - 100);
      if (S) c.fillText(S.ago.toUpperCase(), 100 + w, H - 148);
    }
  });
  box(3.8, 3.8, 0.08, white, g, 7, 0.3, -R.d / 2 + 0.04);
  wallPanel(g, 3.6, 3.6, 7, 2.2, zb + 0.06, 0, (c, W_, H) => {
    c.fillStyle = "#fdfdfb"; c.fillRect(0, 0, W_, H);
    c.fillStyle = "#1e2024"; c.font = `600 44px ${FM}`; c.fillText("ARCHITETTURA", 70, 110);
    const L = I.arch || [], top = 190, rowH = (H - top - 60) / Math.max(1, L.length);
    L.forEach((ly, i) => {
      const y = top + i * rowH;
      c.fillStyle = "#6b6f76"; c.font = `600 36px ${FM}`; c.fillText(ly.name.toUpperCase(), 70, y + rowH * 0.42);
      let x = 330; c.font = `700 50px ${FD}`;
      ly.items.forEach(it => { const w = c.measureText(it).width + 56; if (x + w > W_ - 60) return; c.strokeStyle = brand; c.lineWidth = 6; rrPath(c, x, y + rowH * 0.42 - 52, w, 80, 16); c.stroke(); c.fillStyle = "#1e2024"; c.fillText(it, x + 28, y + rowH * 0.42 + 2); x += w + 22; });
      if (i < L.length - 1) { const ax = 380, ay0 = y + rowH * 0.42 + 40, ay1 = y + rowH + rowH * 0.42 - 64; c.strokeStyle = "#9a9ea6"; c.lineWidth = 5; c.beginPath(); c.moveTo(ax, ay0); c.lineTo(ax, ay1); c.moveTo(ax - 14, ay1 - 16); c.lineTo(ax, ay1); c.lineTo(ax + 14, ay1 - 16); c.stroke(); }
    });
  });
  stops.push({ label: "Timeline", c: new THREE.Vector3(0, 2.2, -R.d / 2), n: new THREE.Vector3(0, 0, 1), w: 4, h: 4 });
  stops.push({ label: "Architettura", c: new THREE.Vector3(7, 2.2, -R.d / 2), n: new THREE.Vector3(0, 0, 1), w: 4, h: 4 });
  return { g, stops };
}

/* camera dentro: ogni parete inquadrata per intero, su desktop come su telefono */
function stopCam(st) {
  const asp = innerWidth / innerHeight, fov = asp < 1 ? 52 : 45, vf = fov * Math.PI / 360, hf = Math.atan(Math.tan(vf) * asp);
  const d = Math.max(st.h / 2 / Math.tan(vf), st.w / 2 / Math.tan(hf)) * (asp < 1 ? 1.02 : 1.3);
  const dm = Math.max(...INS.stops.map(o => Math.max(o.h / 2 / Math.tan(vf), o.w / 2 / Math.tan(hf)))) * (asp < 1 ? 1.02 : 1.3);
  const eye = st.c.clone().addScaledVector(st.n, Math.max(d, dm)); eye.y = st.c.y + (1.7 - st.c.y) * 0.5;
  eye.x = Math.max(-ROOM.w / 2 + 0.6, Math.min(ROOM.w / 2 - 0.6, eye.x)); eye.z = Math.max(-ROOM.d / 2 + 0.6, Math.min(ROOM.d / 2 - 0.6, eye.z));
  return { eye, look: st.c, fov };
}
let INS = null, busy = false;
const _up = new THREE.Vector3(0, 1, 0);
function insideFrame(now) {
  const k = INS.t0 == null ? 1 : Math.min(1, (now - INS.t0) / 1100), ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  INS.pos = INS.from + (INS.goal - INS.from) * ek;
  const i = Math.max(0, Math.min(INS.stops.length - 1, Math.floor(INS.pos))), f = INS.pos - i, A = stopCam(INS.stops[i]), B = stopCam(INS.stops[Math.min(INS.stops.length - 1, i + 1)]);
  const eye = A.eye.clone().lerp(B.eye, f), look = A.look.clone().lerp(B.look, f), dir = look.clone().sub(eye);
  eye.addScaledVector(dir, -0.35 * INS.enterK);
  dir.applyAxisAngle(_up, cam.look.az); dir.y += cam.look.el * dir.length();
  camera.clearViewOffset(); camera.aspect = innerWidth / innerHeight; camera.fov = A.fov; camera.near = 0.1; camera.far = 120; camera.updateProjectionMatrix();
  camera.position.copy(eye); camera.lookAt(eye.clone().add(dir));
  iScene.environment = scene.environment;
  const ex = renderer.toneMappingExposure; renderer.toneMappingExposure = 0.72; renderer.render(iScene, camera); renderer.toneMappingExposure = ex;
}
function goIn(i) {
  if (!INS) return; i = Math.max(0, Math.min(INS.stops.length - 1, i)); if (i === INS.goal) return;
  INS.from = INS.pos; INS.goal = i; INS.t0 = performance.now(); cam.lookG.az = cam.lookG.el = 0; renderInside();
}
const fadeEl = document.getElementById("fade");
const tween = (ms, fn) => new Promise(res => { const t0 = performance.now(); const f = now => { const k = Math.min(1, (now - t0) / ms); fn(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2); if (k < 1) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
async function enter(id) {
  if (busy || INS) return; busy = true;
  const i = STOPS.findIndex(st => st.id === id); if (i >= 0 && cam.goal !== i) { go(i); await new Promise(r => setTimeout(r, 1050)); }
  await tween(reduced ? 1 : 750, k => { cam.push = k; fadeEl.style.opacity = k; });
  const p = DATA.projects.find(q => q.id === id); if (!ROOMS[id]) ROOMS[id] = buildRoom(p);
  Object.entries(ROOMS).forEach(([k, r]) => r.g.visible = k === id);
  INS = { id, proj: p, stops: ROOMS[id].stops, from: 0, goal: 0, pos: 0, t0: null, enterK: 1 }; cam.lookG.az = cam.lookG.el = cam.look.az = cam.look.el = 0;
  document.body.classList.add("inside"); renderInside();
  await tween(reduced ? 1 : 900, k => { fadeEl.style.opacity = 1 - k; INS.enterK = 1 - k; });
  busy = false;
}
async function leave() {
  if (busy || !INS) return; busy = true;
  await tween(reduced ? 1 : 450, k => fadeEl.style.opacity = k);
  INS = null; cam.push = 1; camera.far = 1500; cam.lookG.az = cam.lookG.el = cam.look.az = cam.look.el = 0;
  document.body.classList.remove("inside"); renderInside(); renderCaption();
  await tween(reduced ? 1 : 750, k => { fadeEl.style.opacity = 1 - k; cam.push = 1 - k; });
  cam.push = 0; busy = false;
}
function renderInside() {
  const el = document.getElementById("inside"); if (!INS) { el.hidden = true; el.innerHTML = ""; return; }
  const d = INS.proj, n = INS.stops.length, st = INS.stops[INS.goal];
  el.innerHTML = `<div class="cap"><button class="cta ghost" id="in-exit" title="Torna in strada">← Esci</button>
    <div class="who"><span class="eyebrow">${esc(d.title)} · ${INS.goal + 1}/${n}</span><b>${esc(st.label)}</b></div>
    <div class="acts"><button class="cta ghost" id="in-prev" aria-label="Parete precedente" ${INS.goal === 0 ? "disabled" : ""}>‹</button>
      <button class="cta ghost" id="in-next" aria-label="Parete successiva" ${INS.goal === n - 1 ? "disabled" : ""}>›</button>
      ${d.url ? `<a class="cta" href="${esc(d.url)}" target="_blank" rel="noopener">Sito ↗</a>` : ""}</div></div>`;
  el.hidden = false;
  el.querySelector("#in-exit").onclick = leave;
  el.querySelector("#in-prev").onclick = () => goIn(INS.goal - 1);
  el.querySelector("#in-next").onclick = () => goIn(INS.goal + 1);
}

/* ---------- loop ---------- */
const v = new THREE.Vector3(); let last = performance.now();
function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000), t = now / 1000; last = now;
  const f = 1 - Math.pow(reduced ? 0.0001 : 0.06, dt), fl = 1 - Math.pow(0.01, dt);
  if (cam.idle && !reduced && cam.goal === 0 && !drag) cam.spin += dt * 0.02;
  /* ogni passaggio dura 1 secondo, con partenza e arrivo morbidi */
  const k = reduced || cam.t0 == null ? 1 : Math.min(1, (now - cam.t0) / 1000), ek = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  cam.p = (cam.from ?? cam.goal) + (cam.goal - (cam.from ?? cam.goal)) * ek;
  if (!drag) { cam.lookG.az *= 1 - fl * 0.15; cam.lookG.el *= 1 - fl * 0.15; }
  cam.look.az += (cam.lookG.az - cam.look.az) * fl; cam.look.el += (cam.lookG.el - cam.look.el) * fl;
  if (INS && mode !== "classic") { insideFrame(now); requestAnimationFrame(tick); return; }
  camAt(cam.p); updateCamera();
  if (!reduced) W.anims.forEach(fn => fn(t, dt));
  if (mode === "classic") { requestAnimationFrame(tick); return; }
  const focus = cam.p < 0.4 ? W.items[W.hover] : null;
  if (focus) { ring.visible = true; ring.position.set(focus.group.position.x, 0.35, focus.group.position.z); const s = focus.r * (1 + 0.03 * Math.sin(t * 4)); ring.scale.set(s, s, 1); } else ring.visible = false;
  document.querySelector("#compass span").style.transform = `rotate(${cam.az}rad)`;
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

async function start() {
  try { await Promise.race([Promise.all([document.fonts.load(`900 100px ${FONT_D}`), document.fonts.load(`600 40px ${FONT_M}`)]), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
  let m0 = "3d"; try { m0 = location.hash === "#classica" ? "classic" : location.hash === "#3d" ? "3d" : (localStorage.getItem("citta-mode") || "3d"); } catch (e) {}
  if (m0 === "classic") { setMode("classic"); document.getElementById("loading").style.display = "none"; await new Promise(r => setTimeout(r, 30)); }
  bindClassic(); buildTextures();
  const city = buildCity(); buildProjects(city); buildBoards(city); buildWeather(city); buildStops(); renderTour(); camAt(0);
  applyEnv(); fetchWeather(); setInterval(applyEnv, 30000);
  renderer.setSize(innerWidth, innerHeight, false); updateCamera();
  const c = document.getElementById("c-time"); if (c) c.textContent = document.getElementById("loc-time").textContent;
  const ld = document.getElementById("loading"); ld.style.opacity = 0; setTimeout(() => ld.remove(), 650);
  requestAnimationFrame(tick);
}
return start();

}
