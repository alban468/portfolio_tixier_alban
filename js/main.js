import { initNav } from './nav.js';
import { initGalleries } from './gallery.js';
import { initProjectSheets } from './project-sheet.js';
import { initReveal, initSpotlight } from './effects.js';
import { initDrift } from './drift.js';
import { initTerminal } from './terminal.js';
import { initPicks } from './picks.js';
import { initPlayground } from './playground.js';
import { OPEN_STRINGS, playPluck } from './violin/sound.js';

initNav();
initGalleries();
initProjectSheets();
initReveal();
initSpotlight();
initDrift();
initTerminal();
initPicks();
initPlayground();

// Violon : les boutons jouent tout de suite ; la 3D se charge seulement à l'approche de la section.
const stage = document.querySelector('.violin-stage');
const canvas = document.getElementById('violin');
const buttons = [...stage.querySelectorAll('[data-string]')];
let viewer = null;

function pluck(i) {
  playPluck(OPEN_STRINGS[i]);
  viewer?.vibrate(i);
  const b = buttons[i];
  b.classList.add('hit');
  setTimeout(() => b.classList.remove('hit'), 350);
}
buttons.forEach(b => b.addEventListener('click', () => pluck(Number(b.dataset.string))));

const io = new IntersectionObserver(async ([entry]) => {
  if (!entry.isIntersecting) return;
  io.disconnect();
  try {
    const { mountViolin } = await import('./violin/scene.js');
    viewer = mountViolin(canvas, pluck);
    stage.classList.add('ready');
  } catch (err) {
    console.warn('Violon 3D indisponible :', err);
    stage.classList.add('no-3d');
  }
}, { rootMargin: '300px' });
io.observe(canvas);
