import * as THREE from 'three';
import { spruceTop, mapleBack, mapleStrip } from './textures.js';

// Violon modélisé à partir des proportions réelles (1 unité = 10 cm).
// Repère : y le long du violon (volute en haut), z vers l'avant (côté table).

// --- Contour de la caisse (moitié droite, en trois courbes raccordées par les coins) ---
const UPPER_BOUT = [[0, 1.78], [0.36, 1.74], [0.62, 1.6], [0.8, 1.36], [0.84, 1.12], [0.8, 0.9], [0.71, 0.74], [0.76, 0.6]];
const C_BOUT = [[0.76, 0.6], [0.62, 0.52], [0.555, 0.36], [0.545, 0.2], [0.56, 0.02], [0.64, -0.14], [0.79, -0.22]];
const LOWER_BOUT = [[0.79, -0.22], [0.84, -0.36], [0.97, -0.6], [1.03, -0.92], [0.99, -1.26], [0.84, -1.54], [0.58, -1.73], [0.3, -1.8], [0, -1.81]];

function outline() {
  const right = [];
  for (const segment of [UPPER_BOUT, C_BOUT, LOWER_BOUT]) {
    const curve = new THREE.CatmullRomCurve3(segment.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
    const pts = curve.getPoints(segment.length * 8);
    if (right.length) pts.shift(); // le coin est commun aux deux courbes
    right.push(...pts.map(p => new THREE.Vector2(p.x, p.y)));
  }
  const left = right.slice(1, -1).reverse().map(p => new THREE.Vector2(-p.x, p.y));
  return [...right, ...left];
}

const RIB = 0.15;      // demi-hauteur des éclisses
const OVERHANG = 1.012; // la table et le fond débordent légèrement des éclisses

// Table ou fond bombé : anneaux du contour rétrécis vers le centre, chacun un peu plus haut
function plate(outlinePts, bounds, arch, side) {
  const rings = 28, n = outlinePts.length;
  const pos = [], uv = [], index = [];
  for (let k = 0; k <= rings; k++) {
    const s = 1 - k / rings;
    const z = side * (RIB + arch * (1 - s * s) ** 1.3);
    for (const p of outlinePts) {
      pos.push(p.x * s * OVERHANG, p.y * s * OVERHANG, z);
      uv.push((p.x * s - bounds.minX) / bounds.w, (p.y * s - bounds.minY) / bounds.h);
    }
  }
  for (let k = 0; k < rings; k++) {
    for (let j = 0; j < n; j++) {
      const a = k * n + j, b = k * n + (j + 1) % n, c = a + n, d = b + n;
      if (side > 0) index.push(a, c, b, b, c, d); else index.push(a, b, c, b, d, c); // faces vers l'extérieur
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// Éclisses : une bande verticale qui suit le contour
function ribs(outlinePts) {
  const n = outlinePts.length, pos = [], uv = [], index = [];
  let length = 0;
  outlinePts.forEach((p, i) => {
    if (i) length += p.distanceTo(outlinePts[i - 1]);
    pos.push(p.x, p.y, RIB, p.x, p.y, -RIB);
    uv.push(length, 1, length, 0);
  });
  for (let i = 0; i < uv.length; i += 2) uv[i] /= length; // u de 0 à 1 sur le tour
  for (let j = 0; j < n; j++) {
    const a = j * 2, b = ((j + 1) % n) * 2;
    index.push(a, b, a + 1, b, b + 1, a + 1); // faces vers l'extérieur
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return geo;
}

// Pavé dont la largeur varie d'un bout à l'autre (manche, touche, cordier…)
function taperedBox(wBottom, wTop, length, depth, roundTop = 0) {
  const geo = new THREE.BoxGeometry(1, length, depth, 6, 12, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) / length + 0.5;
    const x = p.getX(i) * (wBottom + (wTop - wBottom) * t);
    p.setX(i, x);
    if (roundTop && p.getZ(i) > 0) p.setZ(i, p.getZ(i) - x * x * roundTop);
  }
  geo.computeVertexNormals();
  return geo;
}

// Volute : spirale dont le tube s'affine en s'enroulant
class Spiral extends THREE.Curve {
  getPoint(t, target = new THREE.Vector3()) {
    const a = -Math.PI / 2 + t * 2.4 * Math.PI;
    const r = 0.19 * Math.exp(-0.22 * (a + Math.PI / 2));
    return target.set(0, 3.95 + r * Math.sin(a), 0.3 + r * Math.cos(a));
  }
}
function scrollGeometry() {
  const curve = new Spiral(), segments = 160, radial = 16;
  const geo = new THREE.TubeGeometry(curve, segments, 0.075, radial, false);
  const p = geo.attributes.position, center = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segments; i++) {
    curve.getPointAt(i / segments, center);
    const scale = 1 - 0.7 * (i / segments);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j;
      v.fromBufferAttribute(p, k).sub(center).multiplyScalar(scale).add(center);
      p.setXYZ(k, v.x * 1.6, v.y, v.z); // volute plus large que haute
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function bridgeGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.21, 0);
  s.lineTo(-0.09, 0);
  s.quadraticCurveTo(0, 0.08, 0.09, 0);
  s.lineTo(0.21, 0);
  s.lineTo(0.2, 0.06);
  s.quadraticCurveTo(0.13, 0.13, 0.18, 0.21);
  s.lineTo(0.21, 0.3);
  s.quadraticCurveTo(0, 0.36, -0.21, 0.3);
  s.lineTo(-0.18, 0.21);
  s.quadraticCurveTo(-0.13, 0.13, -0.2, 0.06);
  s.closePath();
  const heart = new THREE.Path();
  heart.absellipse(0, 0.19, 0.03, 0.04, 0, Math.PI * 2, true);
  s.holes.push(heart);
  for (const x of [-0.1, 0.1]) {
    const kidney = new THREE.Path();
    kidney.absellipse(x, 0.115, 0.035, 0.018, 0, Math.PI * 2, true);
    s.holes.push(kidney);
  }
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 });
  geo.rotateX(Math.PI / 2); // la forme se dresse perpendiculairement à la table
  return geo;
}

function tailpieceGeometry() {
  const s = new THREE.Shape();
  s.moveTo(-0.2, 0);
  s.quadraticCurveTo(0, 0.05, 0.2, 0);
  s.lineTo(0.08, -1.0);
  s.quadraticCurveTo(0, -1.03, -0.08, -1.0);
  s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 3, curveSegments: 12 });
}

// Positions des cordes (x) au cordier, au chevalet et au sillet ; hauteur (z) au chevalet
const STRING_X = { tail: [-0.12, -0.04, 0.04, 0.12], bridge: [-0.17, -0.057, 0.057, 0.17], nut: [-0.083, -0.028, 0.028, 0.083] };
const BRIDGE_Y = -0.17, NUT_Y = 3.09, TAIL_Y = -0.78;
const STRING_LOOK = [
  { color: 0xb9bcc6, radius: 0.02 },  // Sol, filée argent
  { color: 0xc8ccd5, radius: 0.017 }, // Ré
  { color: 0xd9dce3, radius: 0.015 }, // La
  { color: 0xe8cf8f, radius: 0.012 }, // Mi, acier doré
];

export function buildViolin() {
  const pts = outline();
  const bounds = { minX: -1.08, minY: -1.86, w: 2.16, h: 3.68 };

  const varnished = { roughness: 0.45, clearcoat: 1, clearcoatRoughness: 0.14, envMapIntensity: 0.55 };
  const top = new THREE.MeshPhysicalMaterial({ map: spruceTop(pts, bounds), ...varnished });
  const back = new THREE.MeshPhysicalMaterial({ map: mapleBack(pts, bounds), ...varnished });
  const rib = new THREE.MeshPhysicalMaterial({ map: mapleStrip(10), ...varnished });
  const wood = new THREE.MeshPhysicalMaterial({ color: 0x8a3c13, ...varnished });
  const ebony = new THREE.MeshPhysicalMaterial({ color: 0x141011, roughness: 0.35, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const maple = new THREE.MeshStandardMaterial({ color: 0xe8cf9e, roughness: 0.7 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xd0d4dc, metalness: 1, roughness: 0.25 });

  const violin = new THREE.Group();
  const add = (geo, mat, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    violin.add(m);
    return m;
  };

  // Caisse
  add(plate(pts, bounds, 0.16, 1), top);
  add(plate(pts, bounds, 0.13, -1), back);
  add(ribs(pts), rib);
  const edge = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p.x * OVERHANG, p.y * OVERHANG, 0)), true);
  for (const z of [RIB, -RIB]) add(new THREE.TubeGeometry(edge, 240, 0.014, 6, true), wood, 0, 0, z); // bords arrondis

  // Manche, touche, sillet, chevillier, volute
  const tilt = -Math.atan(0.14 / 2.68); // le manche est légèrement incliné vers l'arrière
  add(taperedBox(0.42, 0.24, 2.68, 0.06, 0.6), ebony, 0, 1.74, 0.46).rotation.x = tilt;
  add(taperedBox(0.32, 0.25, 1.42, 0.22), wood, 0, 2.4, 0.3).rotation.x = tilt;
  add(new THREE.BoxGeometry(0.32, 0.16, 0.3), wood, 0, 1.76, 0.16); // talon du manche
  add(new THREE.BoxGeometry(0.25, 0.03, 0.06), ebony, 0, NUT_Y, 0.45);
  add(taperedBox(0.25, 0.19, 0.72, 0.26), wood, 0, 3.45, 0.3);
  add(taperedBox(0.13, 0.09, 0.6, 0.02), ebony, 0, 3.45, 0.43); // ouverture du chevillier
  add(scrollGeometry(), wood);

  // Chevilles, en alternance de chaque côté
  [3.22, 3.38, 3.54, 3.7].forEach((y, i) => {
    const side = i % 2 ? 1 : -1;
    add(new THREE.CylinderGeometry(0.022, 0.03, 0.44, 12), ebony, side * 0.18, y, 0.3).rotation.z = Math.PI / 2;
    add(new THREE.TorusGeometry(0.034, 0.012, 8, 20), ebony, side * 0.36, y, 0.3).rotation.y = Math.PI / 2;
    add(new THREE.SphereGeometry(0.1, 20, 14), ebony, side * 0.43, y, 0.3).scale.set(0.35, 1, 0.75);
  });

  // Chevalet, cordier, tendeur du Mi, sillet du bas, bouton
  add(bridgeGeometry(), maple, 0, BRIDGE_Y + 0.017, 0.29);
  add(tailpieceGeometry(), ebony, 0, -0.72, 0.33).rotation.x = Math.atan(0.14);
  add(new THREE.BoxGeometry(0.05, 0.12, 0.05), metal, 0.12, -0.84, 0.42);
  add(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 10), metal, 0.12, -0.8, 0.47).rotation.x = Math.PI / 2;
  add(new THREE.BoxGeometry(0.3, 0.05, 0.05), ebony, 0, -1.8, 0.17);
  add(new THREE.CylinderGeometry(0.035, 0.05, 0.12, 12), ebony, 0, -1.87, 0);
  add(new THREE.SphereGeometry(0.045, 12, 10), ebony, 0, -1.94, 0);

  // Cordes : la partie qui vibre (chevalet → sillet) + les attaches (cordier → chevalet, sillet → cheville)
  const up = new THREE.Vector3(0, 1, 0);
  const segment = (from, to, radius, material, segments = 1) => {
    const dir = to.clone().sub(from);
    const holder = new THREE.Group();
    holder.position.copy(from).add(to).multiplyScalar(0.5);
    holder.quaternion.setFromUnitVectors(up, dir.clone().normalize());
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 8, segments), material);
    holder.add(mesh);
    violin.add(holder);
    return { holder, mesh, length: dir.length() };
  };

  const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const strings = STRING_LOOK.map(({ color, radius }, i) => {
    const material = new THREE.MeshStandardMaterial({ color, metalness: 0.9, roughness: 0.3, emissive: 0x4c86ff, emissiveIntensity: 0 });
    const xb = STRING_X.bridge[i];
    const zBridge = 0.29 + 0.33 - (xb / 0.21) ** 2 * 0.03;
    const tail = new THREE.Vector3(STRING_X.tail[i], TAIL_Y, 0.4);
    const bridge = new THREE.Vector3(xb, BRIDGE_Y, zBridge);
    const nut = new THREE.Vector3(STRING_X.nut[i], NUT_Y, 0.48);
    const peg = new THREE.Vector3(0, 3.22 + i * 0.16, 0.32);

    segment(tail, bridge, radius, material);
    segment(nut, peg, radius * 0.8, material);
    const vibrating = segment(bridge, nut, radius, material, 32);
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, vibrating.length, 6), hitMaterial);
    hit.userData.string = i;
    vibrating.holder.add(hit);
    return { mesh: vibrating.mesh, length: vibrating.length, hit, rest: vibrating.mesh.geometry.attributes.position.array.slice() };
  });

  return { violin, strings };
}
