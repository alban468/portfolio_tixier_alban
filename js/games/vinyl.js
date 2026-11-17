// Platine vinyle : le disque prend de la vitesse au démarrage et ralentit à l'arrêt,
// le bras se pose sur le disque et avance vers le centre au fil de l'extrait.
// Les morceaux sont lus depuis les cartes du bandeau « Coups de cœur » (une seule source de vérité).

const SPIN = 200;               // degrés par seconde (≈ 33 tours/min)
const ARM_REST = 0, ARM_START = 22, ARM_END = 34; // angles du bras

function readTracks() {
  const cards = [...document.querySelectorAll('.pick[data-track]')];
  // la musique d'abord, puis le violon
  cards.sort((a, b) => (a.dataset.cat === 'violon') - (b.dataset.cat === 'violon'));
  return cards.map(card => ({
    key: card.dataset.track,
    title: card.querySelector('.pick-title').textContent,
    artist: card.querySelector('.pick-sub').textContent,
    cover: card.querySelector('img').getAttribute('src'),
    preview: card.dataset.preview,
    url: card.dataset.url,
  }));
}

const fmt = s => `0:${String(Math.floor(s)).padStart(2, '0')}`;
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function grooves() {
  let out = '';
  for (let r = 54; r <= 128; r += 2.4) out += `<circle r="${r.toFixed(1)}" />`;
  return out;
}

export function mount(panel) {
  const tracks = readTracks();
  panel.innerHTML = `
    <div class="vinyl">
      <div class="deck">
        <svg class="deck-svg" viewBox="0 0 360 300" role="img" aria-label="Platine vinyle">
          <defs>
            <linearGradient id="plinth" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#232c42"/><stop offset="1" stop-color="#121829"/>
            </linearGradient>
            <radialGradient id="sheen" cx="0.3" cy="0.25" r="0.9">
              <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>
            </radialGradient>
            <clipPath id="label-clip"><circle cx="150" cy="150" r="44"/></clipPath>
          </defs>
          <rect x="4" y="4" width="352" height="292" rx="18" fill="url(#plinth)" stroke="#2c3854"/>
          <circle cx="150" cy="150" r="138" fill="#0b0e16" stroke="#3a4560" stroke-width="2"/>
          <g class="record">
            <circle cx="150" cy="150" r="130" fill="#101010"/>
            <g class="grooves" transform="translate(150 150)">${grooves()}</g>
            <image class="label" href="" x="106" y="106" width="88" height="88" clip-path="url(#label-clip)" preserveAspectRatio="xMidYMid slice"/>
            <circle cx="150" cy="150" r="44" fill="none" stroke="#0008" stroke-width="2"/>
          </g>
          <circle cx="150" cy="150" r="130" fill="url(#sheen)" pointer-events="none"/>
          <circle cx="150" cy="150" r="4" fill="#c9ced8"/>
          <circle cx="320" cy="50" r="22" fill="#1a2135" stroke="#3a4560"/>
          <g class="arm">
            <circle cx="320" cy="50" r="10" fill="#c9ced8"/>
            <rect x="331" y="38" width="16" height="24" rx="3" fill="#8b93a6"/>
            <path d="M320 50 L320 210 Q320 232 306 246" fill="none" stroke="#c9ced8" stroke-width="5" stroke-linecap="round"/>
            <rect x="296" y="240" width="18" height="26" rx="3" transform="rotate(35 305 253)" fill="#e8ebf1"/>
          </g>
          <circle class="led" cx="36" cy="268" r="5"/>
          <text x="50" y="272" class="deck-text">33</text>
        </svg>
      </div>
      <div class="vinyl-side">
        <div class="now">
          <p class="now-kind">Sur la platine</p>
          <p class="now-title"></p>
          <p class="now-artist"></p>
          <div class="progress" aria-hidden="true"><div class="progress-bar"></div></div>
          <div class="now-row">
            <span class="now-time" aria-hidden="true">0:00 / 0:30</span>
            <div class="controls">
              <button type="button" class="ctl" data-ctl="prev" aria-label="Morceau précédent">⏮</button>
              <button type="button" class="ctl ctl-play" data-ctl="play" aria-label="Lecture">▶</button>
              <button type="button" class="ctl" data-ctl="next" aria-label="Morceau suivant">⏭</button>
            </div>
          </div>
          <a class="now-link" href="#" target="_blank" rel="noopener noreferrer">Écouter en entier sur Apple Music</a>
        </div>
        <ol class="crate" aria-label="Bac à disques">
          ${tracks.map((t, i) => `
            <li><button type="button" class="crate-item" data-i="${i}">
              <img src="${esc(t.cover)}" alt="" width="44" height="44" loading="lazy">
              <span><span class="crate-title">${esc(t.title)}</span><span class="crate-artist">${esc(t.artist)}</span></span>
            </button></li>`).join('')}
        </ol>
        <p class="vinyl-credit">Extraits de 30 secondes fournis par Apple Music.</p>
      </div>
    </div>`;

  const $ = s => panel.querySelector(s);
  const root = $('.vinyl');
  const record = $('.record');
  const arm = $('.arm');
  const label = $('.label');
  const playBtn = $('[data-ctl="play"]');
  const bar = $('.progress-bar');
  const time = $('.now-time');
  const items = [...panel.querySelectorAll('.crate-item')];
  const audio = new Audio();
  audio.preload = 'none';

  let index = 0, angle = 0, speed = 0, last = 0, raf = 0, armTimer = 0;
  let spinning = false; // le moteur tourne (même pendant que le bras se pose)

  function load(i) {
    index = (i + tracks.length) % tracks.length;
    const t = tracks[index];
    audio.src = t.preview;
    label.setAttribute('href', t.cover);
    $('.now-title').textContent = t.title;
    $('.now-artist').textContent = t.artist;
    $('.now-link').href = t.url;
    items.forEach((it, k) => it.setAttribute('aria-current', String(k === index)));
    bar.style.width = '0%';
    time.textContent = '0:00 / 0:30';
  }

  // Rotation du disque : la vitesse rejoint sa cible doucement (démarrage et arrêt réalistes)
  function spin(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    last = now;
    const target = spinning ? SPIN : 0;
    speed += (target - speed) * Math.min(1, dt * 2.5);
    angle = (angle + speed * dt) % 360;
    record.style.transform = `rotate(${angle}deg)`;
    if (!spinning && speed < 1) { raf = 0; last = 0; return; }
    raf = requestAnimationFrame(spin);
  }
  const startSpin = () => { if (!raf) raf = requestAnimationFrame(spin); };

  function setArm(deg) { arm.style.transform = `rotate(${deg}deg)`; }

  function play() {
    clearTimeout(armTimer);
    spinning = true;
    root.classList.add('playing');
    playBtn.textContent = '❚❚';
    playBtn.setAttribute('aria-label', 'Pause');
    setArm(ARM_START + (ARM_END - ARM_START) * (audio.currentTime / 30));
    startSpin();
    // le son démarre quand le bras s'est posé
    armTimer = setTimeout(() => audio.play().catch(() => stop()), audio.currentTime ? 150 : 650);
  }

  function stop() {
    clearTimeout(armTimer);
    audio.pause();
    spinning = false;
    root.classList.remove('playing');
    playBtn.textContent = '▶';
    playBtn.setAttribute('aria-label', 'Lecture');
    setArm(ARM_REST);
    startSpin(); // laisse le disque ralentir
  }

  audio.addEventListener('timeupdate', () => {
    const p = audio.duration ? audio.currentTime / audio.duration : 0;
    bar.style.width = `${p * 100}%`;
    time.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration || 30)}`;
    if (!audio.paused) setArm(ARM_START + (ARM_END - ARM_START) * p);
  });
  audio.addEventListener('ended', () => { load(index + 1); play(); });

  playBtn.addEventListener('click', () => (spinning ? stop() : play()));
  $('[data-ctl="prev"]').addEventListener('click', () => { load(index - 1); play(); });
  $('[data-ctl="next"]').addEventListener('click', () => { load(index + 1); play(); });
  items.forEach(it => it.addEventListener('click', () => { load(Number(it.dataset.i)); play(); }));

  load(0);
  setArm(ARM_REST);

  return {
    pause: stop,
    playTrack(key) {
      const i = tracks.findIndex(t => t.key === key);
      if (i >= 0) { load(i); play(); }
    },
  };
}
