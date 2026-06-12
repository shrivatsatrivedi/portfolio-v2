import * as THREE from 'three';
import { gsap } from 'gsap';
import { getCircleTexture } from '../utils.js';

// Chaos mode 1: the storm. Sky darkens, rain falls as streaked lines,
// lightning flickers, the résumé's ink dissolves and bleeds, and the
// character breaks down crying. Fully reversible.

const DROP_COUNT = 4000;
const AREA = { x: 34, z: 44, top: 20 };

export class RainMode {
  constructor(scene, env, ground, character, controller, hud) {
    this.scene = scene;
    this.env = env;
    this.ground = ground;
    this.character = character;
    this.controller = controller;
    this.hud = hud;
    this.active = false;

    // --- rain geometry: one vertical line segment per drop ---
    const positions = new Float32Array(DROP_COUNT * 2 * 3);
    this.drops = [];
    for (let i = 0; i < DROP_COUNT; i++) {
      this.drops.push({
        x: (Math.random() - 0.5) * AREA.x,
        y: Math.random() * AREA.top,
        z: (Math.random() - 0.5) * AREA.z,
        v: 24 + Math.random() * 12,
      });
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.rain = new THREE.LineSegments(
      geo,
      new THREE.LineBasicMaterial({ color: 0xb4c8ff, transparent: true, opacity: 0 })
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    scene.add(this.rain);

    // lightning source
    this.lightning = new THREE.PointLight(0x6666cc, 0, 90, 1.2);
    this.lightning.position.set(0, 15, 0);
    scene.add(this.lightning);
    this.flashTimer = 3;

    // tears
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

  activate() {
    if (this.active) return;
    this.active = true;
    this.controller.rainActive = true;
    this.hud.setModeActive('rain', true);

    const u = this.env.sky.material.uniforms;
    gsap.killTweensOf([u.turbidity, u.rayleigh, this.env.ambient, this.env.sun, this.env.ambient.color, this.ground.uniforms.uDissolve, this.rain.material]);

    gsap.to(u.turbidity, { value: 10, duration: 2 });
    gsap.to(u.rayleigh, { value: 2, duration: 2 });
    gsap.to(this.env.ambient, { intensity: 0.5, duration: 2.5 });
    gsap.to(this.env.ambient.color, { r: 26 / 255, g: 26 / 255, b: 46 / 255, duration: 2.5 });
    gsap.to(this.env.sun, { intensity: 0.3, duration: 2.5 });

    this.rain.visible = true;
    this.tears.visible = true;
    gsap.to(this.rain.material, { opacity: 0.45, duration: 2.5, delay: 0.5 });

    // the ink washes away over 8 seconds
    gsap.to(this.ground.uniforms.uDissolve, { value: 1, duration: 8, delay: 1.2, ease: 'sine.in' });
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.controller.rainActive = false;
    this.hud.setModeActive('rain', false);

    const u = this.env.sky.material.uniforms;
    const d = this.env.defaults;
    gsap.killTweensOf([u.turbidity, u.rayleigh, this.env.ambient, this.env.sun, this.env.ambient.color, this.ground.uniforms.uDissolve, this.rain.material]);

    gsap.to(u.turbidity, { value: d.turbidity, duration: 2 });
    gsap.to(u.rayleigh, { value: d.rayleigh, duration: 2 });
    gsap.to(this.env.ambient, { intensity: d.ambientIntensity, duration: 2 });
    gsap.to(this.env.ambient.color, { r: d.ambientColor.r, g: d.ambientColor.g, b: d.ambientColor.b, duration: 2 });
    gsap.to(this.env.sun, { intensity: d.sunIntensity, duration: 2 });
    gsap.to(this.ground.uniforms.uDissolve, { value: 0, duration: 2.5 });
    gsap.to(this.rain.material, {
      opacity: 0, duration: 1.5,
      onComplete: () => { this.rain.visible = false; this.tears.visible = false; },
    });
    this.lightning.intensity = 0;
  }

  update(dt) {
    if (!this.rain.visible) return;

    // rain fall
    const pos = this.rain.geometry.attributes.position.array;
    for (let i = 0; i < DROP_COUNT; i++) {
      const d = this.drops[i];
      d.y -= d.v * dt;
      if (d.y < 0) {
        d.y = AREA.top + Math.random() * 4;
        d.x = (Math.random() - 0.5) * AREA.x;
        d.z = (Math.random() - 0.5) * AREA.z;
      }
      const j = i * 6;
      pos[j] = d.x; pos[j + 1] = d.y; pos[j + 2] = d.z;
      pos[j + 3] = d.x; pos[j + 4] = d.y + 0.4; pos[j + 5] = d.z;
    }
    this.rain.geometry.attributes.position.needsUpdate = true;

    // lightning flicker
    if (this.active) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0) {
        this.lightning.intensity = 300 + Math.random() * 400;
        this.flashTimer = 2.5 + Math.random() * 4.5;
      }
    }
    this.lightning.intensity *= Math.pow(0.0001, dt); // fast decay

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
}
