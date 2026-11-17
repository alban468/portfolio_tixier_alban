import * as THREE from 'three';

// Textures du bois dessinées dans un canvas : aucun fichier image à charger.
// Les coordonnées du violon (en unités 3D) sont projetées à plat sur le canvas.

const SIZE = 1024;

function makeCanvas(bounds) {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = Math.round(SIZE * bounds.h / bounds.w);
  const g = canvas.getContext('2d');
  const px = SIZE / bounds.w; // pixels par unité
  const map = (x, y) => [(x - bounds.minX) * px, (1 - (y - bounds.minY) / bounds.h) * canvas.height];
  return { canvas, g, map, px, W: canvas.width, H: canvas.height };
}

function toTexture(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(repeat, 1); }
  return t;
}

function trace(c, outline, scale) {
  c.g.beginPath();
  outline.forEach((p, i) => {
    const [x, y] = c.map(p.x * scale, p.y * scale);
    i ? c.g.lineTo(x, y) : c.g.moveTo(x, y);
  });
  c.g.closePath();
}

// Vernis : plus clair au centre, plus foncé vers les bords (comme un vernis à l'huile usé)
function varnish(c, light, mid, dark) {
  const grd = c.g.createRadialGradient(c.W / 2, c.H * 0.55, c.W * 0.08, c.W / 2, c.H * 0.5, c.W * 0.95);
  grd.addColorStop(0, light);
  grd.addColorStop(0.55, mid);
  grd.addColorStop(1, dark);
  c.g.fillStyle = grd;
  c.g.fillRect(0, 0, c.W, c.H);
}

function edgeShade(c, outline) {
  c.g.save();
  trace(c, outline, 1);
  c.g.clip();
  c.g.lineWidth = 0.09 * c.px;
  c.g.strokeStyle = 'rgba(55, 18, 4, 0.45)';
  c.g.stroke();
  c.g.restore();
}

// Filet : deux lignes noires et une claire, incrustées à quelques millimètres du bord
function purfling(c, outline) {
  trace(c, outline, 0.955);
  c.g.lineWidth = 0.018 * c.px;
  c.g.strokeStyle = '#140703';
  c.g.stroke();
  c.g.lineWidth = 0.005 * c.px;
  c.g.strokeStyle = '#d9b47c';
  c.g.stroke();
}

// Une ouïe en forme de « f » ; side = 1 à droite, -1 à gauche (symétrique)
function fHole(c, side) {
  const { g, map, px } = c;
  const P = (x, y) => map(x * side, y);
  g.fillStyle = g.strokeStyle = '#0b0402';
  g.lineCap = 'round';

  g.lineWidth = 0.024 * px;
  g.beginPath();
  g.moveTo(...P(0.235, 0.21));
  g.bezierCurveTo(...P(0.40, 0.08), ...P(0.25, -0.33), ...P(0.415, -0.49));
  g.stroke();

  for (const [x, y, r] of [[0.215, 0.235, 0.03], [0.43, -0.515, 0.04]]) {
    g.beginPath();
    g.arc(...P(x, y), r * px, 0, Math.PI * 2);
    g.fill();
  }
  // encoches au milieu de l'ouïe
  g.lineWidth = 0.008 * px;
  g.beginPath();
  g.moveTo(...P(0.29, -0.14)); g.lineTo(...P(0.25, -0.15));
  g.moveTo(...P(0.35, -0.13)); g.lineTo(...P(0.39, -0.12));
  g.stroke();
}

// Table en épicéa : veines fines et droites, plus serrées au centre (joint de la table)
export function spruceTop(outline, bounds) {
  const c = makeCanvas(bounds);
  varnish(c, '#c8762e', '#9a4716', '#5a2009');
  for (let x = 0; x < c.W;) {
    const d = Math.abs(x - c.W / 2) / (c.W / 2);
    c.g.strokeStyle = `rgba(80, 30, 8, ${0.16 + Math.random() * 0.16})`;
    c.g.lineWidth = 0.8 + Math.random() * 1.6;
    c.g.beginPath();
    c.g.moveTo(x, 0);
    for (let y = 0; y <= c.H; y += 48) c.g.lineTo(x + Math.sin(y * 0.003 + x) * 2.5, y);
    c.g.stroke();
    x += 5 + d * 12 + Math.random() * 3;
  }
  edgeShade(c, outline);
  purfling(c, outline);
  fHole(c, 1);
  fHole(c, -1);
  return toTexture(c.canvas);
}

function flames(c, angle, x0, w) {
  const { g, H } = c;
  g.save();
  g.beginPath();
  g.rect(x0, 0, w, H);
  g.clip();
  g.translate(x0 + w / 2, H / 2);
  g.rotate(angle);
  for (let y = -H; y < H;) {
    const h = 6 + Math.random() * 16;
    const light = Math.random() < 0.5;
    g.fillStyle = light ? `rgba(255, 214, 160, ${0.10 + Math.random() * 0.14})` : `rgba(60, 18, 4, ${0.10 + Math.random() * 0.14})`;
    g.fillRect(-c.W, y, c.W * 2, h);
    y += h + Math.random() * 6;
  }
  g.restore();
}

// Fond en érable ondé : reflets en « flammes » disposés en V de part et d'autre du joint
export function mapleBack(outline, bounds) {
  const c = makeCanvas(bounds);
  varnish(c, '#bf6a2a', '#8f3e14', '#521c07');
  flames(c, 0.35, 0, c.W / 2);
  flames(c, -0.35, c.W / 2, c.W / 2);
  edgeShade(c, outline);
  purfling(c, outline);
  return toTexture(c.canvas);
}

// Petite texture d'érable ondé qui se répète, pour les éclisses (les côtés de la caisse)
export function mapleStrip(repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#8a3c13';
  g.fillRect(0, 0, 512, 64);
  for (let x = 0; x < 512;) {
    const w = 4 + Math.random() * 10;
    g.fillStyle = Math.random() < 0.5 ? 'rgba(255, 210, 150, 0.16)' : 'rgba(60, 18, 4, 0.18)';
    g.fillRect(x, 0, w, 64);
    x += w + Math.random() * 4;
  }
  return toTexture(canvas, repeat);
}
