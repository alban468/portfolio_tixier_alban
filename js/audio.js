// Un seul contexte audio pour tout le site (violon, piano, devine la note, feux F1).
// Les navigateurs exigent qu'il soit créé ou relancé après un geste de l'utilisateur.
let ctx = null;

export function audioContext() {
  ctx ??= new AudioContext();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
