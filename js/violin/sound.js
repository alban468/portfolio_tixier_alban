// Son de corde pincée, synthétisé (algorithme de Karplus-Strong) : aucun fichier audio à charger.
import { audioContext } from '../audio.js';

// Cordes à vide du violon, de la plus grave à la plus aiguë : Sol, Ré, La, Mi (en Hz).
export const OPEN_STRINGS = [196, 293.66, 440, 659.25];

// Calcule les échantillons d'une corde pincée : un bruit court qui, en boucle,
// est lissé et amorti à chaque tour, ce qui donne une note qui s'éteint naturellement.
export function pluckSamples(freq, sampleRate, seconds = 1.8, damping = 0.997) {
  const out = new Float32Array(Math.floor(sampleRate * seconds));
  const period = Math.max(2, Math.round(sampleRate / freq));
  const ring = Float32Array.from({ length: period }, () => Math.random() * 2 - 1);
  for (let i = 0; i < out.length; i++) {
    const k = i % period;
    out[i] = ring[k];
    ring[k] = damping * 0.5 * (ring[k] + ring[(k + 1) % period]);
  }
  return out;
}

export function playPluck(freq) {
  const ctx = audioContext();
  const samples = pluckSamples(freq, ctx.sampleRate);
  const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  gain.gain.value = 0.45;
  source.buffer = buffer;
  source.connect(gain).connect(ctx.destination);
  source.start();
}
