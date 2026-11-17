// Galeries des fiches projets : le défilement (et le glisser au doigt) est natif,
// ce module ajoute seulement les flèches et le compteur.
export function initGalleries() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  for (const gallery of document.querySelectorAll('.gallery')) {
    const track = gallery.querySelector('.gallery-track');
    const prev = gallery.querySelector('.gallery-prev');
    const next = gallery.querySelector('.gallery-next');
    const count = gallery.querySelector('.gallery-count');
    if (!prev || !next) continue; // une seule image : rien à faire défiler

    const total = track.children.length;
    const go = dir => track.scrollBy({ left: dir * track.clientWidth, behavior: reduce ? 'auto' : 'smooth' });
    const update = () => {
      if (!track.clientWidth) return; // fiche fermée : rien à mesurer
      const i = Math.round(track.scrollLeft / track.clientWidth);
      count.textContent = `${i + 1} / ${total}`;
      prev.disabled = i === 0;
      next.disabled = i === total - 1;
    };

    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    track.addEventListener('scroll', update, { passive: true });
    gallery.closest('dialog')?.addEventListener('toggle', update);
    update();
  }
}
