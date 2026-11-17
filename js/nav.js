// Menu mobile (attribut popover natif) et surlignage de la section en cours dans le menu.
export function initNav() {
  const menu = document.getElementById('menu');

  menu.addEventListener('click', e => {
    if (e.target.closest('a') && menu.matches(':popover-open')) menu.hidePopover();
  });

  const links = new Map(
    [...menu.querySelectorAll('a[href^="#"]')].map(a => [a.getAttribute('href').slice(1), a])
  );
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      links.forEach(a => a.removeAttribute('aria-current'));
      links.get(entry.target.id)?.setAttribute('aria-current', 'true');
    }
  }, { rootMargin: '-45% 0px -50% 0px' });

  links.forEach((_, id) => {
    const section = document.getElementById(id);
    if (section) io.observe(section);
  });
}
