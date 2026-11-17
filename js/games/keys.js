// Touches du clavier pour un jeu : actives seulement quand son panneau est ouvert et visible à l'écran,
// pour ne jamais détourner les touches pendant qu'on lit le reste de la page.
export function gameKeys(panel, { down, up }) {
  let inView = false;
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(panel);

  const active = e =>
    inView && !panel.hidden && !e.metaKey && !e.ctrlKey && !e.altKey &&
    !e.target.closest?.('input, textarea, select, [contenteditable]');

  document.addEventListener('keydown', e => { if (active(e)) down?.(e); });
  document.addEventListener('keyup', e => { if (inView && !panel.hidden) up?.(e); });
}
