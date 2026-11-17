// Section « La pause » : des onglets, un jeu par onglet.
// Chaque jeu est un module chargé seulement à l'ouverture de son onglet, et respecte la même interface :
//   mount(panneau) → { pause() }   (+ playTrack(clé) pour la platine)
// Ajouter un jeu = ajouter un onglet dans le HTML et une ligne ici.
const GAMES = {
  vinyle: () => import('./games/vinyl.js'),
  piano: () => import('./games/piano.js'),
  note: () => import('./games/ear.js'),
  f1: () => import('./games/f1.js'),
  drift: () => import('./games/mini-drift.js'),
};

export function initPlayground() {
  const root = document.getElementById('la-pause');
  if (!root) return;

  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const instances = new Map(); // nom du jeu → promesse de l'instance montée
  let current = null;

  const panelOf = tab => document.getElementById(tab.getAttribute('aria-controls'));

  function instance(name, panel) {
    if (!instances.has(name)) instances.set(name, GAMES[name]().then(m => m.mount(panel)));
    return instances.get(name);
  }

  async function select(tab, focus = false) {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      panelOf(t).hidden = !on;
    }
    if (focus) tab.focus();
    const name = tab.dataset.game;
    if (current && current !== name) (await instances.get(current))?.pause();
    current = name;
    return instance(name, panelOf(tab));
  }

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(tab));
    // navigation au clavier entre onglets (flèches, Début, Fin)
    tab.addEventListener('keydown', e => {
      const to = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      select(tabs[(to + tabs.length) % tabs.length], true);
    });
  });

  // Le premier onglet se prépare à l'approche de la section
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    select(tabs.find(t => t.getAttribute('aria-selected') === 'true') ?? tabs[0]);
  }, { rootMargin: '300px' });
  io.observe(root);

  // Un « Écouter » du bandeau : on ouvre la platine et on joue le morceau
  document.addEventListener('vinyl:play', async e => {
    const vinyl = await select(tabs.find(t => t.dataset.game === 'vinyle'));
    root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    vinyl.playTrack(e.detail.key);
  });
}
