// Lancer avec : node tests/sound.test.mjs
import assert from 'node:assert/strict';
import { pluckSamples, OPEN_STRINGS } from '../js/violin/sound.js';

for (const freq of OPEN_STRINGS) {
  const s = pluckSamples(freq, 44100);
  assert.equal(s.length, Math.floor(44100 * 1.8));
  assert.ok(s.every(Number.isFinite), 'aucune valeur invalide');
  const peak = (from, to) => s.slice(from, to).reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(peak(0, 2000) <= 1, 'pas de saturation');
  assert.ok(peak(s.length - 2000, s.length) < peak(0, 2000) / 4, `la note ${freq} Hz s'éteint`);
}
console.log('sound: ok');
