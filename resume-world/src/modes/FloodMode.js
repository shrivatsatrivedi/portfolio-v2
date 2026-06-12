import * as THREE from 'three';
import { gsap } from 'gsap';
import { clamp, damp, getCircleTexture, QUALITY } from '../utils.js';

// Chaos mode 2: the flood — reinvented.
// NINE units of water depth. God rays shafting down from the surface,
// caustics shimmering across the résumé, a school of paper-ink fish, drifting
// plankton, bubbles, depth-graded blue darkness, muffled underwater audio,
// and a proper freestyle/treading swim.

const LEVEL = 9;
const BREATH_TIME = 25; // seconds underwater
const REFILL_TIME = 5;

const WATER_SHADER = {
  vertex: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;
    void main() {
      vec3 p = position;
      p.y += sin(p.x * 0.35 + uTime * 1.1) * 0.18
           + cos(p.z * 0.28 + uTime * 0.8) * 0.14
           + sin((p.x + p.z) * 0.08 + uTime * 0.45) * 0.3;
      vec4 wp = modelMatrix * vec4(p, 1.0);
      vWorldPos = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }
  `,
  fragment: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;
    void main() {
      vec3 viewDir = normalize(cameraPosition - vWorldPos);
      float fres = pow(1.0 - abs(viewDir.y), 2.2);
      vec3 deepColor = vec3(0.012, 0.10, 0.22);
      vec3 surfaceColor = vec3(0.10, 0.42, 0.62);
      vec3 col = mix(deepColor, surfaceColor, fres);
      float sparkle = pow(max(sin(vWorldPos.x * 2.1 + uTime * 1.3) * cos(vWorldPos.z * 1.7 - uTime), 0.0), 8.0) * 0.2;
      gl_FragColor = vec4(col + sparkle, 0.82);
    }
  `,
};

export class FloodMode {
  constructor(scene, character, controller, ground, hud, underwaterUniform, camera, audio) {
    this.scene = scene;
    this.character = character;
    this.controller = controller;
    this.ground = ground;
    this.hud = hud;
    this.underwaterUniform = underwaterUniform;
    this.camera = camera;
    this.audio = audio;

    this.active = false;
    this.level = -2;
    this.breath = 1;
    this.t = 0;

    // ---- water surface ----
    const geo = new THREE.PlaneGeometry(500, 500, QUALITY.waterSegs, QUALITY.waterSegs);
    geo.rotateX(-Math.PI / 2);
    this.waterUniforms = { uTime: { value: 0 } };
    this.water = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: this.waterUniforms,
      vertexShader: WATER_SHADER.vertex,
      fragmentShader: WATER_SHADER.fragment,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    this.water.position.y = this.level;
    this.water.visible = false;
    this.water.renderOrder = 5;
    scene.add(this.water);

    // ---- god rays: gradient planes hanging from the surface ----
    const rayCanvas = document.createElement('canvas');
    rayCanvas.width = 64; rayCanvas.height = 256;
    const rctx = rayCanvas.getContext('2d');
    const rg = rctx.createLinearGradient(0, 0, 0, 256);
    rg.addColorStop(0, 'rgba(255,255,255,0.85)');
    rg.addColorStop(0.55, 'rgba(180,220,255,0.25)');
    rg.addColorStop(1, 'rgba(120,180,255,0)');
    rctx.fillStyle = rg;
    rctx.fillRect(0, 0, 64, 256);
    // fade the sides so the planes read as light shafts, not glass slabs
    const hg = rctx.createLinearGradient(0, 0, 64, 0);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.35, 'rgba(0,0,0,1)');
    hg.addColorStop(0.65, 'rgba(0,0,0,1)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    rctx.globalCompositeOperation = 'destination-in';
    rctx.fillStyle = hg;
    rctx.fillRect(0, 0, 64, 256);
    rctx.globalCompositeOperation = 'source-over';
    const rayTex = new THREE.CanvasTexture(rayCanvas);

    this.rays = new THREE.Group();
    this.rayPlanes = [];
    for (let i = 0; i < 7; i++) {
      const w = 1.4 + Math.random() * 2.2;
      const rayGeo = new THREE.PlaneGeometry(w, 26);
      rayGeo.translate(0, -13, 0); // hang from the group origin (the surface)
      const ray = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({
        map: rayTex, transparent: true, opacity: 0,
        blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
      }));
      ray.position.set((Math.random() - 0.5) * 24, 0, (Math.random() - 0.5) * 34);
      ray.rotation.y = Math.random() * Math.PI;
      ray.userData = { ph: Math.random() * Math.PI * 2 };
      this.rays.add(ray);
      this.rayPlanes.push(ray);
    }
    this.rays.visible = false;
    this.rays.renderOrder = 6;
    scene.add(this.rays);

    // ---- plankton: slow drifting specks ----
    const pCount = QUALITY.plankton;
    this.planktonPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount; i++) {
      this.planktonPos[i * 3] = (Math.random() - 0.5) * 30;
      this.planktonPos[i * 3 + 1] = 0.3 + Math.random() * (LEVEL - 1);
      this.planktonPos[i * 3 + 2] = (Math.random() - 0.5) * 42;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(this.planktonPos, 3));
    this.plankton = new THREE.Points(pGeo, new THREE.PointsMaterial({
      color: 0xbfe2ef, size: 0.055, map: getCircleTexture(),
      transparent: true, opacity: 0.5, depthWrite: false,
    }));
    this.plankton.visible = false;
    scene.add(this.plankton);

    // ---- paper-ink fish ----
    this.fishGroup = new THREE.Group();
    this.fish = [];
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeef0fa, roughness: 0.8 });
    const finMat = new THREE.MeshStandardMaterial({ color: 0x5a60d8, roughness: 0.7, side: THREE.DoubleSide });
    for (let i = 0; i < 11; i++) {
      const f = new THREE.Group();
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), bodyMat);
      body.scale.set(1.9, 0.75, 0.5);
      f.add(body);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 5), finMat);
      tail.rotation.z = Math.PI / 2;
      tail.position.x = -0.36;
      f.add(tail);
      const finTop = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), finMat);
      finTop.position.set(0.02, 0.13, 0);
      f.add(finTop);
      this.fishGroup.add(f);
      this.fish.push({
        mesh: f, tail,
        cx: (Math.random() - 0.5) * 16,
        cz: (Math.random() - 0.5) * 24,
        rx: 2.5 + Math.random() * 5,
        rz: 2 + Math.random() * 4,
        y: 1.5 + Math.random() * (LEVEL - 3),
        speed: (0.25 + Math.random() * 0.45) * (Math.random() > 0.5 ? 1 : -1),
        ph: Math.random() * Math.PI * 2,
      });
    }
    this.fishGroup.visible = false;
    scene.add(this.fishGroup);

    // ---- bubbles from the character ----
    const n = 60;
    this.bubbleDrops = Array.from({ length: n }, () => ({ x: 0, y: -10, z: 0, vy: 0, life: 0 }));
    const bGeo = new THREE.BufferGeometry();
    bGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    this.bubbles = new THREE.Points(bGeo, new THREE.PointsMaterial({
      color: 0xdff4ff, size: 0.11, transparent: true, opacity: 0.65,
      map: getCircleTexture(), depthWrite: false,
    }));
    this.bubbles.frustumCulled = false;
    this.bubbles.visible = false;
    scene.add(this.bubbles);
    this._headPos = new THREE.Vector3();
    this._fishAvoid = new THREE.Vector3();
  }

  toggle() { this.active ? this.deactivate() : this.activate(); }

  activate() {
    if (this.active) return;
    this.active = true;
    this.hud.setModeActive('flood', true);
    this.hud.showBreath(true);
    this.breath = 1;

    this.water.visible = true;
    this.rays.visible = true;
    this.plankton.visible = true;
    this.fishGroup.visible = true;
    this.bubbles.visible = true;

    this.audio.water(true);
    this.audio.splash();

    gsap.killTweensOf(this);
    gsap.to(this, { level: LEVEL, duration: 7, ease: 'sine.inOut' });
    gsap.to(this.ground.uniforms.uWarp, { value: 1, duration: 5, delay: 1.5 });
    gsap.to(this.ground.uniforms.uCaustic, { value: 0.75, duration: 5, delay: 2 });
    this.controller.water = this;
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.hud.setModeActive('flood', false);
    this.hud.showBreath(false);
    this.hud.setVignette(0);
    this.audio.water(false);
    this.audio.setUnderwater(false);

    gsap.killTweensOf(this);
    gsap.to(this.ground.uniforms.uWarp, { value: 0, duration: 2 });
    gsap.to(this.ground.uniforms.uCaustic, { value: 0, duration: 2 });
    gsap.to(this, {
      level: -2, duration: 4, ease: 'sine.in',
      onComplete: () => {
        this.water.visible = false;
        this.rays.visible = false;
        this.plankton.visible = false;
        this.fishGroup.visible = false;
        this.bubbles.visible = false;
        this.controller.water = null;
      },
    });
  }

  update(dt) {
    if (!this.water.visible) {
      this.underwaterUniform.value = damp(this.underwaterUniform.value, 0, 5, dt);
      return;
    }
    this.t += dt;
    this.waterUniforms.uTime.value = this.t;
    this.water.position.y = this.level;
    this.rays.position.y = this.level;

    // breath + red-alert vignette
    if (this.active) {
      if (this.controller.submerged) this.breath -= dt / BREATH_TIME;
      else this.breath += dt / REFILL_TIME;
      this.breath = clamp(this.breath, 0, 1);
      this.hud.setBreath(this.breath);
      this.hud.setVignette(this.breath <= 0.001
        ? 0.5 + Math.sin(performance.now() * 0.012) * 0.5
        : 0);
    }

    // depth-graded underwater post: deeper = bluer + darker
    const depthBelow = this.level - this.camera.position.y;
    const target = depthBelow > 0
      ? 0.45 + 0.45 * clamp(depthBelow / 6, 0, 1)
      : 0;
    this.underwaterUniform.value = damp(this.underwaterUniform.value, target, 4, dt);
    this.audio.setUnderwater(depthBelow > 0);

    // god rays sway, fade in only when the camera is under the surface
    const rayOpacity = depthBelow > 0 ? 0.085 : 0.0;
    for (const ray of this.rayPlanes) {
      ray.material.opacity = damp(ray.material.opacity, rayOpacity, 3, dt);
      ray.rotation.z = Math.sin(this.t * 0.3 + ray.userData.ph) * 0.05;
      ray.rotation.y += dt * 0.02;
    }

    // plankton drift
    for (let i = 0; i < this.planktonPos.length; i += 3) {
      this.planktonPos[i] += Math.sin(this.t * 0.5 + i) * 0.04 * dt;
      this.planktonPos[i + 1] += dt * 0.06;
      if (this.planktonPos[i + 1] > Math.max(this.level - 0.4, 0.5)) this.planktonPos[i + 1] = 0.3;
    }
    this.plankton.geometry.attributes.position.needsUpdate = true;

    // fish school
    const charPos = this.character.root.position;
    for (const f of this.fish) {
      f.ph += dt * f.speed;
      const x = f.cx + Math.cos(f.ph) * f.rx;
      const z = f.cz + Math.sin(f.ph) * f.rz;
      const y = Math.min(f.y + Math.sin(this.t * 0.8 + f.ph * 2) * 0.4, Math.max(this.level - 1, 0.6));
      // flee the swimmer
      this._fishAvoid.set(x - charPos.x, 0, z - charPos.z);
      const d = this._fishAvoid.length();
      let px = x, pz = z;
      if (d < 2.6 && d > 0.01) {
        this._fishAvoid.normalize().multiplyScalar((2.6 - d) * 1.2);
        px += this._fishAvoid.x;
        pz += this._fishAvoid.z;
      }
      const prev = f.mesh.position;
      f.mesh.lookAt(px, y, pz);
      f.mesh.rotateY(-Math.PI / 2); // body's long axis is X
      prev.set(px, y, pz);
      f.tail.rotation.y = Math.sin(this.t * 9 + f.ph * 3) * 0.5;
      f.mesh.visible = y < this.level - 0.3;
    }

    // bubbles from the character's mouth while submerged
    const pos = this.bubbles.geometry.attributes.position.array;
    this.character.getHeadWorldPos(this._headPos);
    for (let i = 0; i < this.bubbleDrops.length; i++) {
      const bd = this.bubbleDrops[i];
      bd.life -= dt;
      if (bd.life <= 0 && this.controller.submerged && Math.random() < 0.25) {
        bd.x = this._headPos.x + (Math.random() - 0.5) * 0.2;
        bd.y = this._headPos.y + 0.05;
        bd.z = this._headPos.z + (Math.random() - 0.5) * 0.2;
        bd.vy = 0.9 + Math.random() * 0.7;
        bd.life = 2.2;
      }
      if (bd.life > 0) {
        bd.y += bd.vy * dt;
        bd.x += Math.sin(bd.life * 9 + i) * 0.18 * dt;
        if (bd.y > this.level - 0.05) bd.life = 0;
      }
      const j = i * 3;
      pos[j] = bd.x;
      pos[j + 1] = bd.life > 0 ? bd.y : -10;
      pos[j + 2] = bd.z;
    }
    this.bubbles.geometry.attributes.position.needsUpdate = true;
  }
}
