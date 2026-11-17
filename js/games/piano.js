import { audioContext } from '../audio.js';
import { gameKeys } from './keys.js';

// Petit piano de Do4 à Mi5, jouable à la souris, au doigt ou au clavier de l'ordinateur.
// Les touches sont repérées par leur position physique (e.code) : même disposition en AZERTY et en QWERTY.

const NAMES = ['Do', 'Do♯', 'Ré', 'Ré♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
// demi-tons à partir de Do4, et touche physique associée
const KEYS = [
  [0, 'KeyA'], [1, 'KeyW'], [2, 'KeyS'], [3, 'KeyE'], [4, 'KeyD'], [5, 'KeyF'], [6, 'KeyT'], [7, 'KeyG'],
  [8, 'KeyY'], [9, 'KeyH'], [10, 'KeyU'], [11, 'KeyJ'], [12, 'KeyK'], [13, 'KeyO'], [14, 'KeyL'], [15, 'KeyP'], [16, 'Semicolon'],
];
// libellés par défaut pour un clavier AZERTY (remplacés par la vraie disposition quand le navigateur la donne)
const AZERTY = { KeyA: 'Q', KeyW: 'Z', KeyS: 'S', KeyE: 'E', KeyD: 'D', KeyF: 'F', KeyT: 'T', KeyG: 'G', KeyY: 'Y', KeyH: 'H', KeyU: 'U', KeyJ: 'J', KeyK: 'K', KeyO: 'O', KeyL: 'L', KeyP: 'P', Semicolon: 'M' };
// « Hymne à la joie » (Beethoven) : demi-tons et durées en temps
const ODE = [[4, 1], [4, 1], [5, 1], [7, 1], [7, 1], [5, 1], [4, 1], [2, 1], [0, 1], [0, 1], [2, 1], [4, 1], [4, 1.5], [2, 0.5], [2, 2]];

const freqOf = semi => 261.63 * 2 ** (semi / 12);
const isBlack = semi => [1, 3, 6, 8, 10].includes(semi % 12);

// Son de piano simplifié : quelques harmoniques, attaque nette, extinction progressive
function strike(semi) {
  const ctx = audioContext();
  const t = ctx.currentTime, f = freqOf(semi);
  const out = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(5000, t);
  filter.frequency.exponentialRampToValueAtTime(900, t + 1.5);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(0.32, t + 0.008);
  out.gain.exponentialRampToValueAtTime(0.0001, t + 2.2);
  filter.connect(out).connect(ctx.destination);
  const oscs = [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].map(([mult, type, level]) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.value = f * mult;
    g.gain.value = level;
    o.connect(g).connect(filter);
    o.start(t);
    o.stop(t + 2.3);
    return o;
  });
  return {
    release() { // touche relâchée : le son s'éteint plus vite
      const now = ctx.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(Math.max(out.gain.value, 0.0001), now);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      oscs.forEach(o => o.stop(now + 0.4));
    },
  };
}

export function mount(panel) {
  panel.innerHTML = `
    <div class="piano">
      <div class="piano-head">
        <p class="game-help">Joue à la souris, au doigt, ou avec les touches de ton clavier.</p>
        <button type="button" class="btn btn-ghost piano-demo">▶ Hymne à la joie</button>
      </div>
      <div class="piano-keys" role="group" aria-label="Clavier de piano">
        ${KEYS.map(([semi, code]) => `
          <button type="button" class="pkey ${isBlack(semi) ? 'pkey-black' : 'pkey-white'}" data-semi="${semi}" data-code="${code}" aria-label="${NAMES[semi % 12]}">
            <span class="pkey-note" aria-hidden="true">${NAMES[semi % 12]}</span>
            <kbd class="pkey-kbd" aria-hidden="true">${AZERTY[code]}</kbd>
          </button>`).join('')}
      </div>
    </div>`;

  const keys = [...panel.querySelectorAll('.pkey')];
  const byCode = new Map(keys.map(k => [k.dataset.code, k]));
  const voices = new Map(); // touche → son en cours
  let demoTimers = [];

  // vraie disposition du clavier quand le navigateur sait la donner (Chrome, Edge)
  navigator.keyboard?.getLayoutMap?.().then(map => {
    keys.forEach(k => { const label = map.get(k.dataset.code); if (label) k.querySelector('.pkey-kbd').textContent = label.toUpperCase(); });
  }).catch(() => {});

  const press = key => {
    if (voices.has(key)) return;
    voices.set(key, strike(Number(key.dataset.semi)));
    key.classList.add('down');
  };
  const release = key => {
    voices.get(key)?.release();
    voices.delete(key);
    key.classList.remove('down');
  };

  // souris et doigt : on peut glisser d'une touche à l'autre
  let pointerDown = false;
  keys.forEach(key => {
    key.addEventListener('pointerdown', e => { pointerDown = true; key.releasePointerCapture?.(e.pointerId); press(key); });
    key.addEventListener('pointerenter', () => { if (pointerDown) press(key); });
    key.addEventListener('pointerleave', () => release(key));
    key.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); press(key); } });
    key.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') release(key); });
  });
  const lift = () => { pointerDown = false; [...voices.keys()].forEach(release); };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);

  gameKeys(panel, {
    down(e) {
      const key = byCode.get(e.code);
      if (!key || e.repeat || e.target.closest?.('.pkey')) return;
      e.preventDefault();
      press(key);
    },
    up(e) { const key = byCode.get(e.code); if (key) release(key); },
  });

  const stopDemo = () => { demoTimers.forEach(clearTimeout); demoTimers = []; [...voices.keys()].forEach(release); };
  panel.querySelector('.piano-demo').addEventListener('click', () => {
    stopDemo();
    let at = 0;
    const beat = 420;
    for (const [semi, len] of ODE) {
      const key = keys.find(k => Number(k.dataset.semi) === semi);
      demoTimers.push(setTimeout(() => press(key), at));
      demoTimers.push(setTimeout(() => release(key), at + len * beat - 40));
      at += len * beat;
    }
  });

  return { pause: stopDemo };
}
