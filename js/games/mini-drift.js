// Mini-drift : une petite voiture vue de dessus qu'on fait déraper autour de plots.
// Clavier : flèches ou ZQSD, Espace pour le frein à main. Au doigt : boutons sous la piste.
// On marque des points en glissant ; toucher un plot ou un mur fait perdre le drift en cours.

export const CAR = { accel: 520, brake: 900, reverse: 260, drag: 0.9, maxSpeed: 560, turn: 3.1, grip: 9, handbrakeGrip: 1.3 };
const DRIFT_SLIP = 0.22, DRIFT_SPEED = 140;
const BEST_KEY = 'mini-drift-record';

// Un pas de physique. On tourne d'abord la voiture, puis on décompose sa vitesse selon son nouveau cap :
// la part latérale (la glisse) n'est rattrapée que par l'adhérence des pneus, faible au frein à main.
export function stepCar(car, input, dt) {
  let fx = Math.cos(car.angle), fy = Math.sin(car.angle);
  const forward = car.vx * fx + car.vy * fy;
  const steerPower = Math.min(1, Math.abs(forward) / 160) * (forward < 0 ? -1 : 1); // on braque à l'envers en marche arrière
  car.angle += input.steer * CAR.turn * steerPower * dt;

  fx = Math.cos(car.angle); fy = Math.sin(car.angle);
  const rx = -fy, ry = fx;
  let vf = car.vx * fx + car.vy * fy;
  let vr = car.vx * rx + car.vy * ry;

  if (input.throttle) vf += CAR.accel * dt;
  if (input.brake) vf -= (vf > 0 ? CAR.brake : CAR.reverse) * dt;
  if (input.handbrake) vf -= vf * 0.6 * dt;
  vf -= vf * CAR.drag * dt;
  vf = Math.max(-CAR.maxSpeed * 0.4, Math.min(CAR.maxSpeed, vf));

  const grip = input.handbrake ? CAR.handbrakeGrip : CAR.grip * (1 - 0.55 * Math.min(1, Math.abs(vf) / CAR.maxSpeed));
  vr *= Math.exp(-grip * dt);

  car.vx = fx * vf + rx * vr;
  car.vy = fy * vf + ry * vr;
  car.x += car.vx * dt;
  car.y += car.vy * dt;
  return { speed: Math.hypot(car.vx, car.vy), slip: Math.atan2(Math.abs(vr), Math.abs(vf) + 1) };
}

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* stockage indisponible */ } };

function drawCar(g, car) {
  g.save();
  g.translate(car.x, car.y);
  g.rotate(car.angle);
  g.fillStyle = '#05070c';
  for (const [x, y] of [[-13, -10], [7, -10], [-13, 7], [7, 7]]) g.fillRect(x, y, 7, 3);
  g.fillStyle = '#4c86ff';
  g.beginPath(); g.roundRect(-18, -7.5, 36, 15, 5); g.fill();
  g.fillStyle = '#2f6bf0';
  g.beginPath(); g.roundRect(-9, -5, 11, 10, 2); g.fill();
  g.fillStyle = '#0d1322cc';
  g.beginPath(); g.roundRect(4, -5.5, 8, 11, 3); g.fill();
  g.fillStyle = '#fff3c4'; g.fillRect(16, -6, 2, 3); g.fillRect(16, 3, 2, 3);
  g.fillStyle = '#ff5d5d'; g.fillRect(-18, -6, 1.5, 3); g.fillRect(-18, 3, 1.5, 3);
  g.restore();
}

function drawCone(g, c) {
  g.fillStyle = '#ff7a1a';
  g.beginPath(); g.arc(c.x, c.y, 9, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = 2.5;
  g.beginPath(); g.arc(c.x, c.y, 5, 0, Math.PI * 2); g.stroke();
}

export function mount(panel) {
  panel.innerHTML = `
    <div class="drift-game">
      <div class="drift-hud" aria-hidden="true">
        <span>Drift <b class="hud-combo">0</b></span>
        <span>Score <b class="hud-score">0</b></span>
        <span>Record <b class="hud-best">0</b></span>
      </div>
      <div class="drift-stage">
        <canvas class="drift-canvas" tabindex="0" aria-label="Piste de mini-drift. Flèches ou Z Q S D pour conduire, Espace pour le frein à main."></canvas>
        <div class="drift-overlay">
          <p class="drift-overlay-title">Clique pour prendre le volant</p>
          <p class="drift-overlay-help"><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> ou <kbd>Z</kbd><kbd>Q</kbd><kbd>S</kbd><kbd>D</kbd> pour conduire, <kbd>Espace</kbd> pour le frein à main. Glisse autour des plots !</p>
        </div>
      </div>
      <div class="drift-pad" aria-hidden="true">
        <button type="button" data-pad="left">◀</button>
        <button type="button" data-pad="right">▶</button>
        <button type="button" data-pad="handbrake">Drift</button>
        <button type="button" data-pad="throttle">Gaz</button>
      </div>
    </div>`;

  const canvas = panel.querySelector('.drift-canvas');
  const g = canvas.getContext('2d');
  const trail = document.createElement('canvas');
  const tg = trail.getContext('2d');
  const overlay = panel.querySelector('.drift-overlay');
  const hud = { combo: panel.querySelector('.hud-combo'), score: panel.querySelector('.hud-score'), best: panel.querySelector('.hud-best') };

  let W = 0, H = 0, dpr = 1;
  const car = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
  let cones = [];
  const keys = new Set();
  const pad = { left: false, right: false, handbrake: false, throttle: false };
  let running = false, raf = 0, last = 0;
  let combo = 0, score = 0, best = readBest(), calm = 0;
  let rearPrev = null, fade = 0;
  hud.best.textContent = best;

  function layout() {
    const r = canvas.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(devicePixelRatio, 2);
    W = r.width; H = r.height;
    for (const c of [canvas, trail]) { c.width = W * dpr; c.height = H * dpr; }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    tg.setTransform(dpr, 0, 0, dpr, 0, 0);
    cones = [[0.32, 0.5], [0.58, 0.28], [0.72, 0.68]].map(([x, y]) => ({ hx: x * W, hy: y * H, x: x * W, y: y * H, vx: 0, vy: 0 }));
    Object.assign(car, { x: W * 0.12, y: H * 0.5, angle: 0, vx: 0, vy: 0 });
    rearPrev = null;
    draw();
  }

  const loseCombo = () => { combo = 0; calm = 0; };

  function update(dt) {
    const input = {
      throttle: keys.has('ArrowUp') || keys.has('KeyW') || pad.throttle,
      brake: keys.has('ArrowDown') || keys.has('KeyS'),
      steer: (keys.has('ArrowRight') || keys.has('KeyD') || pad.right ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') || pad.left ? 1 : 0),
      handbrake: keys.has('Space') || pad.handbrake,
    };
    const { speed, slip } = stepCar(car, input, dt);

    // murs : la voiture rebondit et perd son drift
    const m = 14;
    if (car.x < m || car.x > W - m) { car.x = Math.max(m, Math.min(W - m, car.x)); car.vx *= -0.35; loseCombo(); }
    if (car.y < m || car.y > H - m) { car.y = Math.max(m, Math.min(H - m, car.y)); car.vy *= -0.35; loseCombo(); }

    // plots : on les pousse, et on perd le drift
    for (const c of cones) {
      const d = Math.hypot(car.x - c.x, car.y - c.y);
      if (d < 24) { c.vx += car.vx * 0.7; c.vy += car.vy * 0.7; car.vx *= 0.5; car.vy *= 0.5; loseCombo(); }
      c.x += c.vx * dt; c.y += c.vy * dt;
      c.vx *= Math.exp(-4 * dt); c.vy *= Math.exp(-4 * dt);
      if (Math.hypot(c.vx, c.vy) < 5) { c.x += (c.hx - c.x) * dt * 1.5; c.y += (c.hy - c.y) * dt * 1.5; } // le plot revient à sa place
    }

    const drifting = slip > DRIFT_SLIP && speed > DRIFT_SPEED;
    if (drifting) { combo += speed * slip * dt; calm = 0; }
    else if (combo > 0 && (calm += dt) > 0.6) { // fin du drift : les points sont gagnés
      score += Math.round(combo);
      combo = 0;
      if (score > best) { best = score; saveBest(best); }
    }

    // traces de pneus des roues arrière
    const c = Math.cos(car.angle), s = Math.sin(car.angle);
    const rear = [[-10, -8], [-10, 8]].map(([lx, ly]) => [car.x + lx * c - ly * s, car.y + lx * s + ly * c]);
    if ((fade = (fade + 1) % 4) === 0) { // les traces s'effacent lentement (le calque reste transparent)
      tg.globalCompositeOperation = 'destination-out';
      tg.fillStyle = 'rgba(0, 0, 0, 0.04)';
      tg.fillRect(0, 0, W, H);
      tg.globalCompositeOperation = 'source-over';
    }
    if (drifting && rearPrev) {
      tg.strokeStyle = 'rgba(200, 210, 230, 0.35)';
      tg.lineWidth = 2.5;
      tg.lineCap = 'round';
      rear.forEach(([x, y], i) => { tg.beginPath(); tg.moveTo(...rearPrev[i]); tg.lineTo(x, y); tg.stroke(); });
    }
    rearPrev = rear;

    hud.combo.textContent = Math.round(combo);
    hud.score.textContent = score;
    hud.best.textContent = best;
  }

  function draw() {
    g.fillStyle = '#0f1626';
    g.fillRect(0, 0, W, H);
    g.strokeStyle = '#ffffff0a';
    g.lineWidth = 1;
    for (let x = 40; x < W; x += 40) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); }
    for (let y = 40; y < H; y += 40) { g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); }
    g.drawImage(trail, 0, 0, W, H);
    cones.forEach(c => drawCone(g, c));
    drawCar(g, car);
  }

  function frame(now) {
    const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 0;
    last = now;
    update(dt);
    draw();
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    overlay.hidden = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
    keys.clear();
    Object.keys(pad).forEach(k => { pad[k] = false; });
    overlay.hidden = false;
    overlay.querySelector('.drift-overlay-title').textContent = 'En pause : clique pour reprendre';
  }

  const CONTROLS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space']);
  canvas.addEventListener('keydown', e => { if (CONTROLS.has(e.code)) { e.preventDefault(); keys.add(e.code); start(); } });
  canvas.addEventListener('keyup', e => keys.delete(e.code));
  canvas.addEventListener('focus', start);
  canvas.addEventListener('blur', () => { if (!panel.querySelector('.drift-pad').contains(document.activeElement)) stop(); });
  overlay.addEventListener('click', () => canvas.focus());

  // boutons tactiles : actifs tant qu'on appuie
  for (const b of panel.querySelectorAll('[data-pad]')) {
    const set = on => e => { e.preventDefault(); pad[b.dataset.pad] = on; b.classList.toggle('down', on); if (on) start(); };
    b.addEventListener('pointerdown', set(true));
    for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) b.addEventListener(ev, set(false));
  }

  new ResizeObserver(layout).observe(canvas);
  // on coupe la boucle quand la piste sort de l'écran
  new IntersectionObserver(([entry]) => { if (!entry.isIntersecting && running) stop(); }).observe(canvas);

  return { pause() { if (running) { canvas.blur(); stop(); } } };
}
