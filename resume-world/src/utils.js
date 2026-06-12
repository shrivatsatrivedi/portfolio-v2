// Small shared helpers.

import * as THREE from 'three';

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Soft round sprite for Points materials (otherwise particles are squares).
let circleTex = null;
export function getCircleTexture() {
  if (circleTex) return circleTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  circleTex = new THREE.CanvasTexture(c);
  return circleTex;
}

// Frame-rate independent exponential damping.
export const damp = (current, target, lambda, dt) =>
  current + (target - current) * (1 - Math.exp(-lambda * dt));

export const dampAngle = (current, target, lambda, dt) => {
  let delta = ((target - current + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (delta < -Math.PI) delta += Math.PI * 2;
  return current + delta * (1 - Math.exp(-lambda * dt));
};
