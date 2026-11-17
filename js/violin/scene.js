import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildViolin } from './model.js';

// Affiche le violon dans le canvas : glisser pour le tourner, cliquer sur une corde pour la pincer.
// onPluck(i) est appelé quand une corde est touchée ; vibrate(i) fait vibrer une corde.
export function mountViolin(canvas, onPluck) {
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;

  const scene = new THREE.Scene();
  // Reflets du vernis : une pièce virtuelle sert d'environnement lumineux
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(renderer), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, -0.25, 11.8);

  const key = new THREE.DirectionalLight(0xfff0dc, 1.6);
  key.position.set(4, 6, 8);
  const rim = new THREE.DirectionalLight(0x4c86ff, 2.4); // contre-jour bleu, la couleur du site
  rim.position.set(-6, 3, -6);
  scene.add(key, rim);

  const { violin, strings } = buildViolin();
  const pivot = new THREE.Group(); // le violon tourne autour de son centre
  violin.position.y = -1.1;
  pivot.add(violin);
  pivot.rotation.set(-0.25, 0.45, -0.55);
  scene.add(pivot);

  // --- Interaction ---
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const hitTargets = strings.map(s => s.hit);
  let drag = null;
  let rotY = 0.45, rotX = -0.25, idle = 0;

  const stringAt = e => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(hitTargets)[0]?.object.userData.string;
  };

  canvas.addEventListener('pointerdown', e => {
    drag = { x: e.clientX, y: e.clientY, ry: rotY, rx: rotX, moved: false };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag) {
      if (e.pointerType === 'mouse') canvas.style.cursor = stringAt(e) === undefined ? 'grab' : 'pointer';
      return;
    }
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 5) {
      if (!drag.moved) canvas.setPointerCapture(e.pointerId);
      drag.moved = true;
    }
    rotY = drag.ry + dx * 0.01;
    // au doigt, le glisser vertical fait défiler la page : on ne tourne qu'à l'horizontale
    if (e.pointerType === 'mouse') rotX = Math.max(-0.9, Math.min(0.6, drag.rx + dy * 0.006));
    idle = 0;
  });
  canvas.addEventListener('pointerup', e => {
    if (drag && !drag.moved) {
      const i = stringAt(e);
      if (i !== undefined) onPluck(i);
    }
    drag = null;
  });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  // --- Taille ---
  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);
  resize();

  // --- Vibration : onde stationnaire, nulle aux extrémités et maximale au milieu ---
  const since = strings.map(() => -1); // temps écoulé depuis le pincement, -1 = au repos
  function vibrateString(s, t) {
    const pos = s.mesh.geometry.attributes.position;
    const amp = t < 0 ? 0 : 0.045 * Math.exp(-t * 4);
    const phase = Math.sin(t * 75);
    for (let k = 0; k < pos.count; k++) {
      const y = s.rest[k * 3 + 1];
      const shape = Math.sin(Math.PI * (y / s.length + 0.5));
      pos.setX(k, s.rest[k * 3] + amp * shape * phase);
    }
    pos.needsUpdate = true;
    s.mesh.material.emissiveIntensity = t < 0 ? 0 : 2.2 * Math.exp(-t * 4);
  }

  // --- Animation (en pause quand le violon n'est pas à l'écran) ---
  const clock = new THREE.Clock();
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    idle += dt;
    const sway = reduceMotion || idle < 2.5 ? 0 : Math.sin(t * 0.5) * 0.3;
    pivot.rotation.y += (rotY + sway - pivot.rotation.y) * 0.07;
    pivot.rotation.x += (rotX - pivot.rotation.x) * 0.07;

    strings.forEach((s, i) => {
      if (since[i] < 0) return;
      since[i] += dt;
      if (since[i] > 1.4) since[i] = -1;
      vibrateString(s, since[i]);
    });
    renderer.render(scene, camera);
  };
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) { clock.getDelta(); renderer.setAnimationLoop(frame); }
    else renderer.setAnimationLoop(null);
  }).observe(canvas);

  return {
    vibrate(i) { since[i] = 0; },
  };
}
