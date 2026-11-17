// Fiches projets : <dialog> natif (focus et fond inactif gérés par le navigateur).
// Quand le navigateur le permet, l'image de la carte se transforme en image de la fiche
// (API View Transitions), et inversement à la fermeture.

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const canMorph = () => 'startViewTransition' in document && !reduceMotion;
const NAME = 'project-media';

let openedFrom = null; // carte qui a ouvert la fiche en cours

function currentSlide(sheet) {
  const track = sheet.querySelector('.gallery-track');
  if (!track) return null;
  const i = track.clientWidth ? Math.round(track.scrollLeft / track.clientWidth) : 0;
  return track.children[i] ?? null;
}

// Fait passer le nom de transition d'un élément à l'autre pendant que update() change la page
function morph(from, to, update) {
  if (!canMorph() || !from || !to) return update();
  from.style.viewTransitionName = NAME;
  const transition = document.startViewTransition(() => {
    from.style.viewTransitionName = '';
    to.style.viewTransitionName = NAME;
    update();
  });
  transition.finished.finally(() => { to.style.viewTransitionName = ''; });
}

async function openSheet(sheet, card) {
  openedFrom = card;
  const target = sheet.querySelector('.gallery-track img');
  if (target) {
    target.loading = 'eager';
    await target.decode().catch(() => {}); // l'image doit être prête avant l'animation
  }
  sheet.classList.toggle('morphing', canMorph());
  morph(card?.querySelector('img'), target, () => sheet.showModal());
}

function closeSheet(sheet) {
  morph(currentSlide(sheet), openedFrom?.querySelector('img'), () => sheet.close());
}

export function initProjectSheets() {
  document.addEventListener('click', e => {
    const opener = e.target.closest('[data-sheet]');
    if (!opener) return;
    const sheet = document.getElementById(opener.dataset.sheet);
    if (sheet) openSheet(sheet, opener.closest('.card, .mini'));
  });

  for (const sheet of document.querySelectorAll('dialog.sheet')) {
    sheet.querySelector('.sheet-close').addEventListener('click', () => closeSheet(sheet));
    // un clic sur le fond sombre, en dehors de la fiche
    sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(sheet); });
    // touche Échap : on garde la main pour animer la fermeture
    sheet.addEventListener('cancel', e => { e.preventDefault(); closeSheet(sheet); });
  }
}
