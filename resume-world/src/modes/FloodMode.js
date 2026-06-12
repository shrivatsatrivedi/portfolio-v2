import * as THREE from 'three';
import { gsap } from 'gsap';
import { clamp, damp, getCircleTexture } from '../utils.js';

// Chaos mode 2: the flood. Water rises over the résumé, the character
// swims (and dives — the résumé stays readable and clickable underwater),
// a breath bar depletes while submerged.

const WATER_SHADER = {
  vertex: /* glsl */ `
    uniform float uTime;
    varying vec3 vWorldPos;
    void main() {
      vec3 p = position;
      p.y += sin(p.x * 0.5 + uTime) * 0.08
           + cos(p.z * 0.4 + uTime * 0.7) * 0.06
           + sin((p.x + p.z) * 0.15 + uTime * 0.5) * 0.12;
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
      float fres = pow(1.0 - max(viewDir.y, 0.0), 2.0);
      vec3 deepColor = vec3(0.02, 0.12, 0.25);
      vec3 surfaceColor = vec3(0.05, 0.35, 0.55);
      vec3 col = mix(deepColor, surfaceColor, fres);
      float sparkle = pow(max(sin(vWorldPos.x * 2.1 + uTime * 1.3) * cos(vWorldPos.z * 1.7 - uTime), 0.0), 8.0) * 0.18;
      gl_FragColor = vec4(col + sparkle, 0.78);
    }
  `,
};

const BREATH_TIME = 20; // seconds underwater
const REFILL_TIME = 5;

export class FloodMode {
  constructor(scene, character, controller, ground, hud, underwaterUniform, camera) {
    this.scene = scene;
    this.character = character;
    this.controller = controller;
    this.ground = ground;
    this.hud = hud;
    this.underwaterUniform = underwaterUniform;
    this.camera = camera;

    this.active = false;
    this.level = -2;
    this.breath = 1;

    const geo = new THREE.PlaneGeometry(500, 500, 96, 96);
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
    this.water.renderOrder = 2;
    scene.add(this.water);

    // mouth bubbles while submerged
    const n = 50;
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
  }

  toggle() { this.active ? this.deactivate() : this.activate(); }

  activate() {
    if (this.active) return;
    this.active = true;
    this.hud.setModeActive('flood', true);
    this.hud.showBreath(true);
    this.breath = 1;

    this.water.visible = true;
    this.bubbles.visible = true;
    gsap.killTweensOf(this);
    gsap.to(this, { level: 3.5, duration: 6, ease: 'sine.inOut' });
    gsap.to(this.ground.uniforms.uWarp, { value: 1, duration: 4, delay: 2 });
    this.controller.water = this;
  }

  deactivate() {
    if (!this.active) return;
    this.active = false;
    this.hud.setModeActive('flood', false);
    this.hud.showBreath(false);
    this.hud.setVignette(0);

    gsap.killTweensOf(this);
    gsap.to(this.ground.uniforms.uWarp, { value: 0, duration: 2 });
    gsap.to(this, {
      level: -2, duration: 3, ease: 'sine.in',
      onComplete: () => {
        this.water.visible = false;
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

    this.waterUniforms.uTime.value += dt;
    this.water.position.y = this.level;

    // breath
    if (this.active) {
      if (this.controller.submerged) this.breath -= dt / BREATH_TIME;
      else this.breath += dt / REFILL_TIME;
      this.breath = clamp(this.breath, 0, 1);
      this.hud.setBreath(this.breath);
      if (this.breath <= 0.001) {
        this.hud.setVignette(0.5 + Math.sin(performance.now() * 0.012) * 0.5);
      } else {
        this.hud.setVignette(0);
      }
    }

    // underwater post tint when the camera goes below the surface
    const camUnder = this.camera.position.y < this.level ? 1 : 0;
    this.underwaterUniform.value = damp(this.underwaterUniform.value, camUnder * 0.85, 4, dt);

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
        bd.vy = 0.8 + Math.random() * 0.6;
        bd.life = 1.6;
      }
      if (bd.life > 0) {
        bd.y += bd.vy * dt;
        bd.x += Math.sin(bd.life * 9 + i) * 0.15 * dt;
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
