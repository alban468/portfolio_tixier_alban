// Petite voiture qui arrive en dérapant sur le mot « véhiculé » (animation en CSS, classe .go).
// Elle part quand le mot devient visible ; un clic sur le mot la relance.
export function initDrift() {
  const word = document.querySelector('.drift');
  if (!word) return;

  const play = () => {
    word.classList.remove('go');
    void word.offsetWidth; // force le navigateur à repartir de zéro
    word.classList.add('go');
  };
  word.addEventListener('click', play);

  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    io.disconnect();
    play();
  }, { threshold: 1 });
  io.observe(word);
}
