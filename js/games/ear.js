import { audioContext } from '../audio.js';

// « Devine la note » : le Do de référence est joué, puis une note mystère, au son de violon.
// 10 manches ; le meilleur score est gardé dans le navigateur.

const NOTES = [['Do', 0], ['Ré', 2], ['Mi', 4], ['Fa', 5], ['Sol', 7], ['La', 9], ['Si', 11]];
const ROUNDS = 10;
const BEST_KEY = 'devine-la-note-record';

// Son de violon simplifié : onde riche filtrée, avec un léger vibrato
function bow(semi, at = 0, length = 0.9) {
  const ctx = audioContext();
  const t = ctx.currentTime + at, f = 261.63 * 2 ** (semi / 12);
  const osc = ctx.createOscillator(), vib = ctx.createOscillator(), vibDepth = ctx.createGain();
  const filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.value = f;
  vib.frequency.value = 5.5;
  vibDepth.gain.setValueAtTime(0, t);
  vibDepth.gain.linearRampToValueAtTime(f * 0.006, t + 0.35); // le vibrato arrive après l'attaque
  vib.connect(vibDepth).connect(osc.frequency);
  filter.type = 'lowpass';
  filter.frequency.value = 2600;
  filter.Q.value = 1.2;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.16, t + 0.09);
  gain.gain.setValueAtTime(0.16, t + length);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.3);
  osc.connect(filter).connect(gain).connect(ctx.destination);
  [osc, vib].forEach(o => { o.start(t); o.stop(t + length + 0.35); });
}

const readBest = () => { try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; } };
const saveBest = n => { try { localStorage.setItem(BEST_KEY, String(n)); } catch { /* stockage indisponible */ } };

export function mount(panel) {
  panel.innerHTML = `
    <div class="ear">
      <p class="game-help">Écoute le <strong>Do</strong> de référence, puis la note mystère. Laquelle est-ce ?</p>
      <div class="ear-board">
        <div class="ear-status">
          <p class="ear-round">Prêt ?</p>
          <p class="ear-score" aria-live="polite"></p>
        </div>
        <div class="ear-notes" role="group" aria-label="Choisis la note">
          ${NOTES.map(([name], i) => `<button type="button" class="ear-note" data-i="${i}" disabled>${name}</button>`).join('')}
        </div>
        <div class="ear-actions">
          <button type="button" class="btn ear-start">Commencer</button>
          <button type="button" class="btn btn-ghost ear-replay" disabled>↻ Réécouter</button>
        </div>
        <p class="ear-best"></p>
      </div>
    </div>`;

  const $ = s => panel.querySelector(s);
  const buttons = [...panel.querySelectorAll('.ear-note')];
  const startBtn = $('.ear-start'), replayBtn = $('.ear-replay');
  let round = 0, score = 0, answer = -1, locked = true, nextTimer = 0;

  const showBest = () => { const b = readBest(); $('.ear-best').textContent = b ? `Ton record : ${b} / ${ROUNDS}` : ''; };

  function listen() {
    bow(0, 0);                       // Do de référence
    bow(NOTES[answer][1], 1.15);     // note mystère
  }

  function nextRound() {
    round++;
    answer = Math.floor(Math.random() * NOTES.length);
    locked = false;
    buttons.forEach(b => { b.disabled = false; b.classList.remove('good', 'bad'); });
    $('.ear-round').textContent = `Note ${round} sur ${ROUNDS}`;
    $('.ear-score').textContent = `${score} bonne${score > 1 ? 's' : ''} réponse${score > 1 ? 's' : ''}`;
    replayBtn.disabled = false;
    listen();
  }

  function finish() {
    locked = true;
    buttons.forEach(b => { b.disabled = true; });
    replayBtn.disabled = true;
    const best = readBest();
    if (score > best) saveBest(score);
    $('.ear-round').textContent = score >= 8 ? 'Belle oreille !' : score >= 5 ? 'Pas mal du tout !' : 'Ça viendra avec l\'entraînement !';
    $('.ear-score').textContent = `Score : ${score} / ${ROUNDS}${score > best ? ', nouveau record' : ''}`;
    startBtn.textContent = 'Rejouer';
    startBtn.hidden = false;
    showBest();
  }

  buttons.forEach(b => b.addEventListener('click', () => {
    if (locked) return;
    locked = true;
    const i = Number(b.dataset.i);
    if (i === answer) { score++; b.classList.add('good'); }
    else { b.classList.add('bad'); buttons[answer].classList.add('good'); }
    buttons.forEach(x => { x.disabled = true; });
    nextTimer = setTimeout(() => (round < ROUNDS ? nextRound() : finish()), 1300);
  }));

  startBtn.addEventListener('click', () => {
    round = 0;
    score = 0;
    startBtn.hidden = true;
    nextRound();
  });
  replayBtn.addEventListener('click', listen);
  showBest();

  return { pause() { clearTimeout(nextTimer); } };
}
