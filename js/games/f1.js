import { audioContext } from '../audio.js';
import { gameKeys } from './keys.js';

// Feux de départ F1 : les 5 feux s'allument un par un, puis s'éteignent après un délai aléatoire.
// Il faut réagir dès l'extinction (clic, toucher, Espace ou Entrée). Partir avant = faux départ.

const BEST_KEY = 'feux-f1-record';
const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = ms => { try { localStorage.setItem(BEST_KEY, String(ms)); } catch { /* stockage indisponible */ } };

function beep() {
  const ctx = audioContext();
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = 880;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + 0.13);
}

export function mount(panel) {
  panel.innerHTML = `
    <div class="f1">
      <p class="game-help">Clique (ou appuie sur Espace) dès que <strong>tous les feux s'éteignent</strong>. Pas avant !</p>
      <button type="button" class="f1-zone" aria-describedby="f1-msg">
        <span class="f1-lights" aria-hidden="true">${'<span class="f1-pod"><i></i><i></i></span>'.repeat(5)}</span>
        <span class="f1-msg" id="f1-msg" aria-live="polite">Clique ici pour lancer le départ</span>
      </button>
      <p class="f1-best"></p>
      <p class="f1-ref">Pour comparer : un pilote de F1 réagit en environ 0,2 seconde.</p>
    </div>`;

  const zone = panel.querySelector('.f1-zone');
  const pods = [...panel.querySelectorAll('.f1-pod')];
  const msg = panel.querySelector('.f1-msg');
  let state = 'idle', timers = [], outAt = 0;

  const showBest = () => { const b = readBest(); panel.querySelector('.f1-best').textContent = b ? `Ton record : ${b} ms` : ''; };
  const clear = () => { timers.forEach(clearTimeout); timers = []; };
  const lights = n => pods.forEach((p, i) => p.classList.toggle('on', i < n));

  function start() {
    clear();
    state = 'lighting';
    lights(0);
    zone.classList.remove('jump', 'go');
    msg.textContent = 'Attention…';
    for (let i = 1; i <= 5; i++) timers.push(setTimeout(() => { lights(i); beep(); }, i * 1000));
    const hold = 5000 + 200 + Math.random() * 2800; // délai aléatoire avant l'extinction
    timers.push(setTimeout(() => {
      lights(0);
      state = 'go';
      outAt = performance.now();
      zone.classList.add('go');
      msg.textContent = '';
    }, hold));
  }

  function react() {
    if (state === 'idle' || state === 'done') return start();
    if (state === 'lighting') { // faux départ
      clear();
      state = 'done';
      lights(0);
      zone.classList.add('jump');
      msg.textContent = 'Faux départ ! Clique pour recommencer.';
      return;
    }
    const ms = Math.round(performance.now() - outAt);
    state = 'done';
    zone.classList.remove('go');
    const best = readBest();
    if (!best || ms < best) saveBest(ms);
    msg.textContent = `${ms} ms${!best || ms < best ? ', nouveau record !' : '.'} Clique pour rejouer.`;
    showBest();
  }

  // pointerdown plutôt que click : quelques millisecondes gagnées, comme sur une vraie réaction
  zone.addEventListener('pointerdown', e => { e.preventDefault(); react(); });
  zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); react(); } });
  gameKeys(panel, {
    down(e) {
      if (e.code !== 'Space' || e.target === zone) return;
      e.preventDefault();
      if (!e.repeat) react();
    },
  });
  showBest();

  return {
    pause() {
      clear();
      state = 'idle';
      lights(0);
      zone.classList.remove('go', 'jump');
      msg.textContent = 'Clique ici pour lancer le départ';
    },
  };
}
