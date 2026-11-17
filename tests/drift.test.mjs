// Lancer avec : node tests/drift.test.mjs
import assert from 'node:assert/strict';
import { stepCar, CAR } from '../js/games/mini-drift.js';

const run = (car, input, seconds) => {
  let r;
  for (let t = 0; t < seconds; t += 1 / 60) r = stepCar(car, input, 1 / 60);
  return r;
};
const idle = { throttle: false, brake: false, steer: 0, handbrake: false };

// accélérer fait prendre de la vitesse, sans dépasser la vitesse max
let car = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
let r = run(car, { ...idle, throttle: true }, 3);
assert.ok(r.speed > 250 && r.speed <= CAR.maxSpeed, `vitesse ${r.speed}`);
assert.ok(car.x > 0 && Math.abs(car.y) < 1e-6, 'la voiture avance tout droit');

// frein à main + braquage à pleine vitesse : la voiture glisse (drift)
car = { x: 0, y: 0, angle: 0, vx: 450, vy: 0 };
r = run(car, { ...idle, throttle: true, steer: 1, handbrake: true }, 0.4);
assert.ok(r.slip > 0.3, `glisse au frein à main : ${r.slip}`);

// virage doux à petite vitesse sans frein à main : les pneus tiennent
car = { x: 0, y: 0, angle: 0, vx: 120, vy: 0 };
r = run(car, { ...idle, steer: 0.4 }, 0.5);
assert.ok(r.slip < 0.2, `adhérence en virage doux : ${r.slip}`);

// à l'arrêt, braquer ne fait pas tourner la voiture
car = { x: 0, y: 0, angle: 0, vx: 0, vy: 0 };
run(car, { ...idle, steer: 1 }, 1);
assert.equal(car.angle, 0);

console.log('drift: ok');
