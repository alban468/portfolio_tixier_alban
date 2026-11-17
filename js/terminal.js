// Terminal de l'accueil : la commande se tape lettre par lettre, un spinner tourne,
// puis les résultats des tests s'affichent un à un. Le bouton « Relancer » rejoue la séquence.
// Tout le contenu est déjà dans le HTML : ce module ne fait que le révéler progressivement.

const SPINNER = '⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function initTerminal() {
  const term = document.querySelector('[data-term]');
  if (!term) return;

  const typed = term.querySelector('.term-typed');
  const command = typed.textContent;
  const caret = term.querySelector('.term-cmd .caret');
  const spin = term.querySelector('.term-spin');
  const spinner = spin.querySelector('.spinner');
  const outputs = [...term.querySelectorAll('.term-out')];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let runId = 0; // une relance annule la séquence en cours

  function showAll() {
    runId++;
    typed.textContent = command;
    caret.hidden = true;
    spin.classList.remove('shown');
    outputs.forEach(line => line.classList.add('shown'));
  }

  async function play() {
    const id = ++runId;
    const stopped = () => id !== runId;

    outputs.forEach(line => line.classList.remove('shown'));
    spin.classList.remove('shown');
    typed.textContent = '';
    caret.hidden = false;

    await wait(700); // laisse l'accueil finir d'apparaître
    for (const char of command) {
      if (stopped()) return;
      typed.textContent += char;
      await wait(45 + Math.random() * 75); // rythme irrégulier, comme une vraie frappe
    }
    await wait(350);
    if (stopped()) return;

    caret.hidden = true;
    outputs[0].classList.add('shown');
    spin.classList.add('shown');
    let frame = 0;
    const timer = setInterval(() => { spinner.textContent = SPINNER[frame++ % SPINNER.length]; }, 80);
    await wait(950);
    clearInterval(timer);
    if (stopped()) return;
    spin.classList.remove('shown');

    for (const line of outputs.slice(1)) {
      line.classList.add('shown');
      await wait(line.tagName === 'A' ? 380 : 260);
      if (stopped()) return;
    }
  }

  term.querySelector('.term-replay').addEventListener('click', () => (reduceMotion ? showAll() : play()));
  reduceMotion ? showAll() : play();
}
