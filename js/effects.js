// Apparition des blocs au défilement : le CSS les cache tant qu'ils n'ont pas la classe is-in.
// Rien n'est caché si l'utilisateur a demandé moins d'animations (voir style.css).
export function initReveal() {
  const items = document.querySelectorAll('[data-reveal]');
  for (const el of items) {
    // léger décalage entre éléments voisins (cartes d'une même grille par exemple)
    const siblings = [...el.parentElement.children].filter(c => c.hasAttribute('data-reveal'));
    el.style.setProperty('--d', Math.min(siblings.indexOf(el), 5));
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -8% 0px' });
  items.forEach(el => io.observe(el));
}

// Halo de lumière qui suit la souris sur les éléments .spot (seulement avec une souris).
export function initSpotlight() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.addEventListener('pointermove', e => {
    const el = e.target.closest?.('.spot');
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });
}
