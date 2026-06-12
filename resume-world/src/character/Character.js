import * as THREE from 'three';
import { STATES } from './CharacterStates.js';
import { damp } from '../utils.js';

// Stylised procedural humanoid — dark suit trousers, white shirt, glowing
// teal eyes. All animation is code-driven (no GLB required); drop a Mixamo
// character.glb into /public/character and swap this class if you want
// skinned animation instead.

const SUIT = 0x2a2a4a;
const SHIRT = 0xeef0ff;
const SKIN = 0xe8c49a;
const HAIR = 0x16162a;
const ACCENT = 0x4a90d9;

export class Character {
  constructor(scene) {
    this.root = new THREE.Group();          // moved by the controller (feet at y=0)
    this.meshRoot = new THREE.Group();      // animation offsets live here
    this.root.add(this.meshRoot);
    scene.add(this.root);

    this.state = STATES.IDLE;
    this.yaw = Math.PI;                     // face "down" the page initially
    this.t = 0;
    this.moveSpeed = 0;                     // set by controller for gait timing
    this.blinkTimer = 2.5;
    this.blinkLeft = 0;
    this.celebrateT = -1;
    this.celebrateDone = null;

    this.build();
  }

  build() {
    const toon = (color) => new THREE.MeshToonMaterial({ color });
    const cast = (m) => { m.castShadow = true; return m; };

    // legs (pivot at hip)
    const legGeo = new THREE.CapsuleGeometry(0.09, 0.66, 4, 10);
    this.legL = new THREE.Group();
    this.legR = new THREE.Group();
    for (const [leg, sx] of [[this.legL, 1], [this.legR, -1]]) {
      leg.position.set(0.13 * sx, 0.92, 0);
      const limb = cast(new THREE.Mesh(legGeo, toon(SUIT)));
      limb.position.y = -0.46;
      leg.add(limb);
      const shoe = cast(new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.1, 0.3), toon(0xf2f2f6)));
      shoe.position.set(0, -0.87, 0.05);
      leg.add(shoe);
      const sole = cast(new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.035, 0.31), toon(ACCENT)));
      sole.position.set(0, -0.925, 0.05);
      leg.add(sole);
      this.meshRoot.add(leg);
    }

    // torso
    this.torso = cast(new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.42, 4, 12), toon(SHIRT)));
    this.torso.position.y = 1.28;
    this.meshRoot.add(this.torso);
    const belt = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.225, 0.07, 14), toon(ACCENT)));
    belt.position.y = 1.0;
    this.meshRoot.add(belt);

    // arms (pivot at shoulder) — rolled-up sleeves: shirt upper, skin hands
    const armGeo = new THREE.CapsuleGeometry(0.07, 0.5, 4, 10);
    this.armL = new THREE.Group();
    this.armR = new THREE.Group();
    for (const [arm, sx] of [[this.armL, 1], [this.armR, -1]]) {
      arm.position.set(0.33 * sx, 1.56, 0);
      const limb = cast(new THREE.Mesh(armGeo, toon(SHIRT)));
      limb.position.y = -0.3;
      arm.add(limb);
      const hand = cast(new THREE.Mesh(new THREE.SphereGeometry(0.072, 10, 10), toon(SKIN)));
      hand.position.y = -0.62;
      arm.add(hand);
      this.meshRoot.add(arm);
    }

    // head
    this.head = new THREE.Group();
    this.head.position.y = 1.78;
    const skull = cast(new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 16), toon(SKIN)));
    skull.position.y = 0.08;
    this.head.add(skull);
    const hair = cast(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), toon(HAIR)));
    hair.scale.set(1.02, 0.78, 1.02);
    hair.position.set(0, 0.16, -0.035);
    this.head.add(hair);

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0a,
      emissive: 0x00ffcc,
      emissiveIntensity: 0.8,
    });
    this.eyes = [];
    for (const sx of [1, -1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), eyeMat);
      eye.position.set(0.068 * sx, 0.1, 0.165);
      this.head.add(eye);
      this.eyes.push(eye);
    }
    this.meshRoot.add(this.head);
  }

  setState(state) {
    if (this.state === state) return;
    if (this.state === STATES.CELEBRATE && this.celebrateT >= 0 && state !== STATES.CELEBRATE) {
      // let celebrate finish via its own timer unless something urgent happens
      if (state === STATES.IDLE || state === STATES.WALK) return;
    }
    this.state = state;
  }

  celebrate(onDone) {
    this.celebrateT = 0;
    this.celebrateDone = onDone || null;
    this.state = STATES.CELEBRATE;
  }

  getHeadWorldPos(target = new THREE.Vector3()) {
    return this.head.getWorldPosition(target);
  }

  update(dt) {
    this.t += dt;
    this.root.rotation.y = this.yaw;

    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.blinkLeft = 0.12; this.blinkTimer = 3 + Math.random() * 2; }
    if (this.blinkLeft > 0) this.blinkLeft -= dt;
    const eyeScaleY = this.blinkLeft > 0 ? 0.12 : 1;
    for (const eye of this.eyes) eye.scale.y = damp(eye.scale.y, eyeScaleY, 30, dt);

    // pose targets
    const p = {
      legL: 0, legR: 0, armLx: 0, armRx: 0, armLz: 0.08, armRz: -0.08,
      headX: 0, lean: 0, bob: 0, pitch: 0, torsoRollAmp: 0, drop: 0,
    };
    const t = this.t;

    switch (this.state) {
      case STATES.IDLE: {
        p.bob = Math.sin(t * 2) * 0.012;
        p.armLx = Math.sin(t * 2) * 0.04;
        p.armRx = -Math.sin(t * 2) * 0.04;
        break;
      }
      case STATES.WALK:
      case STATES.RUN: {
        const run = this.state === STATES.RUN;
        const freq = run ? 11 : 7;
        const amp = run ? 0.78 : 0.55;
        const swing = Math.sin(t * freq);
        p.legL = swing * amp;
        p.legR = -swing * amp;
        p.armLx = -swing * amp * 0.6;
        p.armRx = swing * amp * 0.6;
        p.bob = Math.abs(Math.cos(t * freq)) * (run ? 0.07 : 0.04);
        p.lean = run ? 0.16 : 0.05;
        break;
      }
      case STATES.JUMP: {
        p.legL = 0.5; p.legR = -0.35;
        p.armLx = -2.4; p.armRx = -2.4;
        p.armLz = 0.5; p.armRz = -0.5;
        break;
      }
      case STATES.SIT: {
        p.legL = -1.45; p.legR = -1.3;
        p.armLx = 0.45; p.armRx = 0.45;
        p.armLz = 0.3; p.armRz = -0.3;
        p.lean = -0.12;
        p.drop = 0.62;
        break;
      }
      case STATES.CRY: {
        p.armLx = -2.5; p.armRx = -2.5;
        p.armLz = -0.55; p.armRz = 0.55;   // hands meet at the face
        p.headX = 0.35;
        p.lean = 0.1;
        p.torsoRollAmp = 0.045;
        break;
      }
      case STATES.SWIM_SURFACE: {
        p.pitch = 1.25;
        p.armLx = (t * 6) % (Math.PI * 2);
        p.armRx = (t * 6 + Math.PI) % (Math.PI * 2);
        p.legL = Math.sin(t * 10) * 0.35;
        p.legR = -Math.sin(t * 10) * 0.35;
        break;
      }
      case STATES.SWIM_DIVE: {
        p.pitch = 1.95;
        p.armLx = (t * 7) % (Math.PI * 2);
        p.armRx = (t * 7 + Math.PI) % (Math.PI * 2);
        p.legL = Math.sin(t * 12) * 0.4;
        p.legR = -Math.sin(t * 12) * 0.4;
        break;
      }
      case STATES.SWIM_ASCEND: {
        p.pitch = 0.55;
        p.armLx = -1.2 + Math.sin(t * 8) * 0.8;
        p.armRx = -1.2 - Math.sin(t * 8) * 0.8;
        p.legL = Math.sin(t * 12) * 0.4;
        p.legR = -Math.sin(t * 12) * 0.4;
        break;
      }
      case STATES.CELEBRATE: {
        this.celebrateT += dt;
        const ct = this.celebrateT;
        if (ct < 0.45) {            // fist pump
          p.armRx = -2.9; p.armRz = -0.2;
          p.bob = Math.abs(Math.sin(ct * 14)) * 0.1;
        } else if (ct < 0.85) {     // point at the user
          p.armRx = -1.5; p.armRz = -0.15;
          p.headX = -0.1;
        } else if (ct < 1.25) {     // thumbs up
          p.armRx = -1.1; p.armRz = -0.5;
          p.armLx = -1.1; p.armLz = 0.5;
        } else {
          this.celebrateT = -1;
          this.state = STATES.IDLE;
          const cb = this.celebrateDone;
          this.celebrateDone = null;
          if (cb) cb();
        }
        break;
      }
    }

    // smooth toward targets
    const k = 12;
    this.legL.rotation.x = damp(this.legL.rotation.x, p.legL, k, dt);
    this.legR.rotation.x = damp(this.legR.rotation.x, p.legR, k, dt);

    // arms: swim states use raw cyclic rotation (windmill), others damp
    const swimming = this.state === STATES.SWIM_SURFACE || this.state === STATES.SWIM_DIVE;
    if (swimming) {
      this.armL.rotation.x = p.armLx;
      this.armR.rotation.x = p.armRx;
    } else {
      this.armL.rotation.x = damp(this.armL.rotation.x, p.armLx, k, dt);
      this.armR.rotation.x = damp(this.armR.rotation.x, p.armRx, k, dt);
    }
    this.armL.rotation.z = damp(this.armL.rotation.z, p.armLz, k, dt);
    this.armR.rotation.z = damp(this.armR.rotation.z, p.armRz, k, dt);

    this.head.rotation.x = damp(this.head.rotation.x, p.headX, k, dt);
    this.meshRoot.rotation.x = damp(this.meshRoot.rotation.x, p.lean + p.pitch, 8, dt);
    this.meshRoot.rotation.z = p.torsoRollAmp ? Math.sin(t * 18) * p.torsoRollAmp : damp(this.meshRoot.rotation.z, 0, k, dt);
    this.meshRoot.position.y = damp(this.meshRoot.position.y, p.bob - p.drop, 14, dt);

    // breathing
    const breathe = this.state === STATES.IDLE || this.state === STATES.CRY ? 1 + Math.sin(t * 2.4) * 0.02 : 1;
    this.torso.scale.setScalar(breathe);
  }
}
