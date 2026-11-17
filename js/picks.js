// Bandeau « Coups de cœur » : filtres par catégorie, flèches de défilement,
// et boutons « Écouter » qui demandent à la platine de jouer le morceau (événement vinyl:play).
export function initPicks() {
  const root = document.getElementById('coups-de-coeur');
  if (!root) return;

  const track = root.querySelector('.picks');
  const items = [...track.children];
  const chips = [...root.querySelectorAll('[data-filter]')];
  const prev = root.querySelector('.picks-prev');
  const next = root.querySelector('.picks-next');
  const smooth = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  const update = () => {
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
      const filter = chip.dataset.filter;
      items.forEach(item => { item.hidden = filter !== 'tout' && item.dataset.cat !== filter; });
      track.scrollTo({ left: 0 });
      update();
    });
  }

  prev.addEventListener('click', () => track.scrollBy({ left: -track.clientWidth * 0.8, behavior: smooth }));
  next.addEventListener('click', () => track.scrollBy({ left: track.clientWidth * 0.8, behavior: smooth }));
  track.addEventListener('scroll', update, { passive: true });
  new ResizeObserver(update).observe(track);

  root.addEventListener('click', e => {
    const button = e.target.closest('[data-play]');
    if (button) document.dispatchEvent(new CustomEvent('vinyl:play', { detail: { key: button.dataset.play } }));
  });
}
