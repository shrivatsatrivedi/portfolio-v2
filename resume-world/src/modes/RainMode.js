import * as THREE from 'three';
import { gsap } from 'gsap';
import { getCircleTexture } from '../utils.js';

// Chaos mode 1: the storm — reinvented.
// Wind-slanted rain, branching lightning bolts with screen flash + thunder,
// splash ripples where drops hit the paper, the paper turning dark and
// glossy-wet while the ink dissolves, the character pulling out an indigo
// umbrella while walking (and breaking down crying when they stop).

const DROP_COUNT = 5000;
const AREA = { x: 36, z: 46, top: 20 };
const SPLASH_POOL = 36;

export class RainMode {
  constructor(scene, env, ground, character, controller, hud, audio) {
    this.scene = scene;
    this.env = env;
    this.ground = ground;
    this.character = character;
    this.controller = controller;
    this.hud = hud;
    this.audio = audio;
    this.active = false;
    this.t = 0;
    this.wind = 0;

    // --- rain: one slanted line segment per drop ---
    const positions = new Float32Array(DROP_COUNT * 2 * 3);
    this.drops = [];
    for (let i = 0; i < DROP_COUNT; i++) {
      this.drops.push({
        x: (Math.random() - 0.5) * AREA.x,
        y: Math.random() * AREA.top,
        z: (Math.random() - 0.5) * AREA.z,
        v: 26 + Math.random() * 14,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xb8ccff, transparent: true, opacity: 0 })
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    // --- splash ripples on the paper ---
    this.splashes = [];
    const splashMat = new THREE.MeshBasicMaterial({
      color: 0xcfdcff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < SPLASH_POOL; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.085, 16), splashMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.025;
      ring.visible = false;
      scene.add(ring);
      this.splashes.push({ mesh: ring, life: 0 });
    }

    // --- lightning ---
    this.boltGroup = new THREE.Group();
    scene.add(this.boltGroup);
    this.boltLife = 0;
    this.flashTimer = 2.5;
    this.lightning = new THREE.PointLight(0x9fb1ff, 0, 120, 1.1);
    this.lightning.position.set(0, 16, 0);
    scene.add(this.lightning);

    // --- tears ---
    const tearPos = new Float32Array(16 * 3);
    const tearGeo = new THREE.BufferGeometry();
    tearGeo.setAttribute('position', new THREE.BufferAttribute(tearPos, 3));
    this.tearDrops = Array.from({ length: 16 }, () => ({ x: 0, y: -10, z: 0, vx: 0, vy: 0, vz: 0, life: 0 }));
    this.tears = new THREE.Points(
      tearGeo,
      new THREE.PointsMaterial({
        color: 0x9fd8ff, size: 0.09, transparent: true, opacity: 0.9,
        map: getCircleTexture(), depthWrite: false,
      })
    );
    this.tears.frustumCulled = false;
    this.tears.visible = false;
    scene.add(this.tears);
    this._headPos = new THREE.Vector3();
  }

  toggle() { this.active ? this.deactivate() : this.activate(); }

  killTweens() {
    const u = this.env.sky.material.uniforms;
    gsap.killTweensOf([
      u.turbidity, u.rayleigh,
      this.env.ambient, this.env.ambient.color, this.env.sun, this.env.hemi,
      this.ground.uniforms.uDissolve, this.ground.uniforms.uWet,
      this.rain.material,
    ]);
  }

  activate() {
    if (this.active) return;
    this.active = true;
    this.controller.rainActive = true;
    this.character.setRainActive(true);
    this.hud.setModeActive('rain', true);
    this.audio.rain(true);

    const u = this.env.sky.material.uniforms;
    this.killTweens();
    gsap.to(u.turbidity, { value: 12, duration: 2 });
    gsap.to(u.rayleigh, { value: 3.2, duration: 2 });
    gsap.to(this.env.ambient, { intensity: 0.45, duration: 2.5 });
    gsap.to(this.env.ambient.color, { r: 26 / 255, g: 28 / 255, b: 52 / 255, duration: 2.5 });
    gsap.to(this.env.hemi, { intensity: 0.2, duration: 2.5 });
    gsap.to(this.env.sun, { intensity: 0.25, duration: 2.5 });

    this.rain.visible = true;
    this.tears.visible = true;
    gsap.to(this.rain.material, { opacity: 0.5, duration: 2.5, delay: 0.3 });

    // wet gloss, then the ink washes away
    gsap.to(this.ground.uniforms.uWet, { value: 1, duration: 3.5, delay: 0.5 });
    gsap.to(this.ground.uniforms.uDissolve, { value: 1, duration: 8, delay: 1.5, ease: 'sine.in' });

    this.flashTimer = 1.2; // first bolt arrives fast
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.controller.rainActive = false;
    this.character.setRainActive(false);
    this.hud.setModeActive('rain', false);
    this.audio.rain(false);

    const u = this.env.sky.material.uniforms;
    const d = this.env.defaults;
    this.killTweens();
    gsap.to(u.turbidity, { value: d.turbidity, duration: 2 });
    gsap.to(u.rayleigh, { value: d.rayleigh, duration: 2 });
    gsap.to(this.env.ambient, { intensity: d.ambientIntensity, duration: 2 });
    gsap.to(this.env.ambient.color, { r: d.ambientColor.r, g: d.ambientColor.g, b: d.ambientColor.b, duration: 2 });
    gsap.to(this.env.hemi, { intensity: d.hemiIntensity, duration: 2 });
    gsap.to(this.env.sun, { intensity: d.sunIntensity, duration: 2 });
    gsap.to(this.ground.uniforms.uDissolve, { value: 0, duration: 2.5 });
    gsap.to(this.ground.uniforms.uWet, { value: 0, duration: 2.5 });
    gsap.to(this.rain.material, {
      opacity: 0, duration: 1.5,
      onComplete: () => { this.rain.visible = false; this.tears.visible = false; },
    });
    this.lightning.intensity = 0;
    this.clearBolt();
  }

  // ------------------------------------------------------------- lightning

  clearBolt() {
    while (this.boltGroup.children.length) {
      const c = this.boltGroup.children.pop();
      c.geometry.dispose();
      c.material.dispose();
    }
  }

  spawnBolt() {
    this.clearBolt();
    const sx = (Math.random() - 0.5) * 26;
    const sz = (Math.random() - 0.5) * 36;
    const makeBranch = (x0, y0, z0, segs, spread) => {
      const pts = [new THREE.Vector3(x0, y0, z0)];
      let x = x0, y = y0, z = z0;
      for (let i = 0; i < segs; i++) {
        y -= y0 / segs;
        x += (Math.random() - 0.5) * spread;
        z += (Math.random() - 0.5) * spread;
        pts.push(new THREE.Vector3(x, Math.max(y, 0), z));
      }
      const g = new THREE.BufferGeometry().setFromPoints(pts);
      const line = new THREE.Line(g, new THREE.LineBasicMaterial({
        color: 0xeef3ff, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
      }));
      this.boltGroup.add(line);
      return pts;
    };
    const main = makeBranch(sx, 17, sz, 9, 1.7);
    // a fork off the middle
    const mid = main[4];
    makeBranch(mid.x, mid.y, mid.z, 5, 2.4);

    this.boltLife = 0.32;
    this.lightning.position.set(sx, 12, sz);
    this.lightning.intensity = 900;
    this.hud.flash(0.5);
    this.audio.thunder(0.35 + Math.random() * 0.9);
  }

  // ----------------------------------------------------------------- update

  update(dt) {
    if (!this.rain.visible) return;
    this.t += dt;
    this.wind = 2.0 + Math.sin(this.t * 0.4) * 1.4;

    // rain fall with wind slant
    const pos = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < DROP_COUNT; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt;
      d.x += this.wind * dt;
      if (d.y < 0) {
        // splash where it lands (if on the page)
        if (this.active && Math.abs(d.x) < 15 && Math.abs(d.z) < 21 && Math.random() < 0.045) {
          this.spawnSplash(d.x, d.z);
        }
        d.y = AREA.top + Math.random() * 4;
        d.x = (Math.random() - 0.5) * AREA.x - this.wind * 1.5;
        d.z = (Math.random() - 0.5) * AREA.z;
      }
      const j = i * 6;
      pos[j] = d.x; pos[j + 1] = d.y; pos[j + 2] = d.z;
      pos[j + 3] = d.x + this.wind * 0.05; pos[j + 4] = d.y + 0.42; pos[j + 5] = d.z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;

    // splash ripples
    for (const s of this.splashes) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const k = 1 - s.life / 0.45;
      s.mesh.scale.setScalar(1 + k * 5);
      s.mesh.material.opacity = 0.5 * (1 - k);
      if (s.life <= 0) s.mesh.visible = false;
    }

    // lightning bolts
    if (this.active) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.spawnBolt();
        this.flashTimer = 3 + Math.random() * 5.5;
      }
    }
    if (this.boltLife > 0) {
      this.boltLife -= dt;
      const o = Math.max(this.boltLife / 0.32, 0);
      for (const line of this.boltGroup.children) {
        line.material.opacity = o * (0.6 + Math.random() * 0.4); // flicker
      }
      if (this.boltLife <= 0) this.clearBolt();
    }
    this.lightning.intensity *= Math.pow(0.00005, dt);

    // tears while crying
    const crying = this.active && this.character.state === 'cry';
    const tpos = this.tears.geometry.attributes.position.array;
    this.character.getHeadWorldPos(this._headPos);
    for (let i = 0; i < this.tearDrops.length; i++) {
      const td = this.tearDrops[i];
      td.life -= dt;
      if (td.life <= 0 && crying && Math.random() < 0.1) {
        td.x = this._headPos.x + (Math.random() - 0.5) * 0.12;
        td.y = this._headPos.y - 0.02;
        td.z = this._headPos.z + (Math.random() - 0.5) * 0.12;
        td.vx = (Math.random() - 0.5) * 0.7;
        td.vy = -0.4;
        td.vz = (Math.random() - 0.5) * 0.7;
        td.life = 0.9;
      }
      if (td.life > 0) {
        td.vy -= 4 * dt;
        td.x += td.vx * dt; td.y += td.vy * dt; td.z += td.vz * dt;
      }
      const j = i * 3;
      tpos[j] = td.x;
      tpos[j + 1] = td.life > 0 ? td.y : -10;
      tpos[j + 2] = td.z;
    }
    this.tears.geometry.attributes.position.needsUpdate = true;
  }

  spawnSplash(x, z) {
    const s = this.splashes.find((sp) => sp.life <= 0);
    if (!s) return;
    s.life = 0.45;
    s.mesh.visible = true;
    s.mesh.position.set(x, 0.025, z);
    s.mesh.scale.setScalar(1);
    s.mesh.material.opacity = 0.5;
  }
}
