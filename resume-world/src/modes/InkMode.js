import * as THREE from 'three';
import { gsap } from 'gsap';
import { getCircleTexture, QUALITY } from '../utils.js';
import { PAGE } from '../interaction/ResumeContent.js';

// Chaos mode 3: INK GALAXY.
// The actual ink of the résumé — sampled pixel by pixel from the painted
// canvas — lifts off the page, swirls upward, and assembles into a slowly
// rotating spiral galaxy overhead, joined by constellation lines and
// shooting stars. Gravity drops to moon-level while it's active.
// Toggle reversible: the galaxy pours back down and the text re-inks.

const GALAXY_Y = 13.5;

export class InkMode {
  constructor(scene, env, ground, controller, character, hud, audio) {
    this.scene = scene;
    this.env = env;
    this.ground = ground;
    this.controller = controller;
    this.character = character;
    this.hud = hud;
    this.audio = audio;

    this.active = false;
    this.built = false;
    this.P = 0;          // master morph progress 0=page, 1=galaxy
    this.t = 0;
    this.shootTimer = 2;
  }

  // sample dark pixels from the painted résumé canvas
  build() {
    this.built = true;
    const src = this.ground.sourceCanvas;
    const sw = 220, sh = Math.round(220 * (PAGE.depth / PAGE.width));
    const c = document.createElement('canvas');
    c.width = sw; c.height = sh;
    const ctx = c.getContext('2d');
    ctx.drawImage(src, 0, 0, sw, sh);
    const img = ctx.getImageData(0, 0, sw, sh).data;

    const candidates = [];
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const i = (y * sw + x) * 4;
        const lum = img[i] * 0.299 + img[i + 1] * 0.587 + img[i + 2] * 0.114;
        if (lum < 130) candidates.push([x, y]);
      }
    }
    // shuffle and cap
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    const N = this.N = Math.min(QUALITY.ink, candidates.length);

    this.start = new Float32Array(N * 3);
    this.galaxy = new Float32Array(N * 3);   // r, baseAngle, y  (polar, swirled live)
    this.delay = new Float32Array(N);
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
      const [px, py] = candidates[i];
      const wx = (px / sw - 0.5) * PAGE.width;
      const wz = (py / sh - 0.5) * PAGE.depth;
      this.start[i * 3] = wx;
      this.start[i * 3 + 1] = 0.06;
      this.start[i * 3 + 2] = wz;
      positions[i * 3] = wx;
      positions[i * 3 + 1] = 0.06;
      positions[i * 3 + 2] = wz;

      // 3-arm spiral galaxy target, stored polar so it can rotate live
      const f = i / N;
      const arm = i % 3;
      const r = 3 + 23 * Math.sqrt(f) + (Math.random() - 0.5) * 2.4;
      const ang = f * Math.PI * 4 + (arm * Math.PI * 2) / 3 + r * 0.16;
      const gy = GALAXY_Y + r * 0.06 + (Math.random() - 0.5) * 1.6;
      this.galaxy[i * 3] = r;
      this.galaxy[i * 3 + 1] = ang;
      this.galaxy[i * 3 + 2] = gy;
      this.delay[i] = Math.random() * 0.38;

      // indigo core fading to pale cyan rim, with sparkle variance
      const v = 0.55 + Math.random() * 0.45;
      const rim = Math.min(r / 26, 1);
      colors[i * 3] = (0.42 + rim * 0.25) * v;
      colors[i * 3 + 1] = (0.45 + rim * 0.35) * v;
      colors[i * 3 + 2] = 1.0 * v;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.14, vertexColors: true, map: getCircleTexture(),
      transparent: true, opacity: 0.95, depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    this.points.frustumCulled = false;
    this.points.visible = false;
    this.scene.add(this.points);

    // constellation lines between a few bright galaxy points
    this.lineIdx = [];
    for (let k = 0; k < 30; k++) this.lineIdx.push((Math.random() * this.N) | 0);
    this.linePos = new Float32Array((this.lineIdx.length - 1) * 2 * 3);
    const lGeo = new THREE.BufferGeometry();
    lGeo.setAttribute('position', new THREE.BufferAttribute(this.linePos, 3));
    this.lines = new THREE.LineSegments(lGeo, new THREE.LineBasicMaterial({
      color: 0x9aa6ff, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.scene.add(this.lines);

    // galaxy core glow sprite
    const core = document.createElement('canvas');
    core.width = core.height = 128;
    const cg = core.getContext('2d');
    const grad = cg.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, 'rgba(220,225,255,0.9)');
    grad.addColorStop(0.4, 'rgba(140,150,255,0.35)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    cg.fillStyle = grad;
    cg.fillRect(0, 0, 128, 128);
    this.core = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(core), transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    this.core.position.set(0, GALAXY_Y + 0.5, 0);
    this.core.scale.setScalar(14);
    this.scene.add(this.core);

    // shooting star (pooled single streak)
    this.shootPos = new Float32Array(6);
    const shGeo = new THREE.BufferGeometry();
    shGeo.setAttribute('position', new THREE.BufferAttribute(this.shootPos, 3));
    this.shoot = new THREE.Line(shGeo, new THREE.LineBasicMaterial({
      color: 0xeef2ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
    }));
    this.shoot.frustumCulled = false;
    this.scene.add(this.shoot);
    this.shootLife = 0;
  }

  toggle() { this.active ? this.deactivate() : this.activate(); }

  activate() {
    if (this.active) return;
    if (!this.built) this.build();
    this.active = true;
    this.hud.setModeActive('ink', true);
    this.points.visible = true;
    this.lines.visible = true;

    gsap.killTweensOf(this);
    gsap.to(this, { P: 1, duration: 7, ease: 'power2.inOut' });
    // the text leaves the paper as its ink becomes the galaxy
    gsap.to(this.ground.uniforms.uDissolve, { value: 0.92, duration: 5.5, delay: 0.4 });

    // deep night sky
    const u = this.env.sky.material.uniforms;
    gsap.to(u.rayleigh, { value: 0.06, duration: 4 });
    gsap.to(u.turbidity, { value: 1, duration: 4 });
    gsap.to(this.env.sun, { intensity: 0.5, duration: 4 });
    gsap.to(this.env.ambient, { intensity: 0.55, duration: 4 });
    gsap.to(this.env.stars.material, { opacity: 1, duration: 4 });

    this.controller.gravityScale = 0.28; // moon-walk
    this.audio.setMood('space');
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.hud.setModeActive('ink', false);

    gsap.killTweensOf(this);
    gsap.to(this, {
      P: 0, duration: 4.5, ease: 'power2.inOut',
      onComplete: () => { this.points.visible = false; this.lines.visible = false; },
    });
    gsap.to(this.ground.uniforms.uDissolve, { value: 0, duration: 3.5, delay: 0.8 });

    const u = this.env.sky.material.uniforms;
    const d = this.env.defaults;
    gsap.to(u.rayleigh, { value: d.rayleigh, duration: 3 });
    gsap.to(u.turbidity, { value: d.turbidity, duration: 3 });
    gsap.to(this.env.sun, { intensity: d.sunIntensity, duration: 3 });
    gsap.to(this.env.ambient, { intensity: d.ambientIntensity, duration: 3 });
    gsap.to(this.env.stars.material, { opacity: 0.85, duration: 3 });

    this.controller.gravityScale = 1;
    this.audio.setMood('calm');
  }

  update(dt) {
    if (!this.built || (!this.active && this.P <= 0.001)) return;
    this.t += dt;
    const swirl = this.t * 0.05;
    const pos = this.points.geometry.attributes.position.array;
    const ease = (x) => x * x * (3 - 2 * x);

    for (let i = 0; i < this.N; i++) {
      const local = Math.min(Math.max((this.P * 1.4 - this.delay[i]) / 1.0, 0), 1);
      const e = ease(local);
      const r = this.galaxy[i * 3];
      const ang = this.galaxy[i * 3 + 1] + swirl * (1.2 - r / 30);
      const gx = Math.cos(ang) * r;
      const gz = Math.sin(ang) * r;
      const gy = this.galaxy[i * 3 + 2];
      const j = i * 3;
      // arc upward in transit
      const lift = Math.sin(e * Math.PI) * 2.5;
      pos[j] = this.start[j] + (gx - this.start[j]) * e;
      pos[j + 1] = this.start[j + 1] + (gy - this.start[j + 1]) * e + lift;
      pos[j + 2] = this.start[j + 2] + (gz - this.start[j + 2]) * e;
    }
    this.points.geometry.attributes.position.needsUpdate = true;

    // constellation lines snap between galaxy points once mostly formed
    const lineAlpha = Math.max(0, (this.P - 0.82) / 0.18) * 0.4;
    this.lines.material.opacity = lineAlpha;
    if (lineAlpha > 0) {
      for (let k = 0; k < this.lineIdx.length - 1; k++) {
        const a = this.lineIdx[k] * 3;
        const b = this.lineIdx[k + 1] * 3;
        const o = k * 6;
        this.linePos[o] = pos[a]; this.linePos[o + 1] = pos[a + 1]; this.linePos[o + 2] = pos[a + 2];
        this.linePos[o + 3] = pos[b]; this.linePos[o + 4] = pos[b + 1]; this.linePos[o + 5] = pos[b + 2];
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
    }

    this.core.material.opacity = this.P * 0.5;

    // shooting stars
    if (this.active && this.P > 0.6) {
      this.shootTimer -= dt;
      if (this.shootTimer <= 0) {
        this.shootTimer = 2.5 + Math.random() * 4;
        this.shootLife = 0.7;
        const sx = (Math.random() - 0.5) * 80;
        const sy = 30 + Math.random() * 25;
        const sz = (Math.random() - 0.5) * 80;
        this.shootDir = [sx, sy, sz, -14 - Math.random() * 10, -5 - Math.random() * 4];
      }
    }
    if (this.shootLife > 0) {
      this.shootLife -= dt;
      const k = 1 - this.shootLife / 0.7;
      const [sx, sy, sz, vx, vy] = this.shootDir;
      const hx = sx + vx * k, hy = sy + vy * k;
      this.shootPos[0] = hx; this.shootPos[1] = hy; this.shootPos[2] = sz;
      this.shootPos[3] = hx - vx * 0.22; this.shootPos[4] = hy - vy * 0.22; this.shootPos[5] = sz;
      this.shoot.geometry.attributes.position.needsUpdate = true;
      this.shoot.material.opacity = Math.sin(k * Math.PI) * 0.9;
    } else {
      this.shoot.material.opacity = 0;
    }
  }
}
