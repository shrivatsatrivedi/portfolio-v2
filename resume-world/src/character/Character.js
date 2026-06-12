import * as THREE from 'three';
import { STATES } from './CharacterStates.js';
import { damp } from '../utils.js';

// Procedural humanoid with proper joints: hips + knees, shoulders + elbows,
// a real face (whites, pupils, brows, mouth), neck, and an umbrella prop for
// rain mode. All animation is code-driven; poses target joint rotations and
// are damped for smooth blending.

const SKIN = 0xe6bd96;
const HAIR = 0x2b2119;
const SHIRT = 0xf4f5f8;
const TROUSER = 0x23233d;
const SHOE = 0xfafafa;
const ACCENT = 0x4a90d9;

const TAU = Math.PI * 2;

export class Character {
  constructor(scene) {
    this.root = new THREE.Group();          // moved by the controller (feet at y=0)
    this.meshRoot = new THREE.Group();      // animation offsets live here
    this.root.add(this.meshRoot);
    scene.add(this.root);

    this.state = STATES.IDLE;
    this.yaw = Math.PI;
    this.t = 0;
    this.moveSpeed = 0;
    this.blinkTimer = 2.5;
    this.blinkLeft = 0;
    this.lookTimer = 4;
    this.lookY = 0;
    this.celebrateT = -1;
    this.celebrateDone = null;
    this.rainActive = false;
    this.submerged = false;

    this.build();
  }

  // ------------------------------------------------------------------ build

  mat(color, roughness = 0.85) {
    return new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.02 });
  }

  cap(radius, length, material) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 12), material);
    m.castShadow = true;
    return m;
  }

  build() {
    const skin = this.mat(SKIN, 0.7);
    const shirt = this.mat(SHIRT, 0.9);
    const trouser = this.mat(TROUSER, 0.92);
    const hairM = this.mat(HAIR, 0.6);

    // ---- legs: hip pivot -> upper leg -> knee pivot -> lower leg + shoe ----
    this.legs = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const hip = new THREE.Group();
      hip.position.set(0.125 * sx, 0.96, 0);
      const upper = this.cap(0.085, 0.30, trouser);
      upper.position.y = -0.23;
      hip.add(upper);

      const knee = new THREE.Group();
      knee.position.y = -0.47;
      const lower = this.cap(0.07, 0.28, trouser);
      lower.position.y = -0.2;
      knee.add(lower);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.27), this.mat(SHOE, 0.5));
      shoe.castShadow = true;
      shoe.position.set(0, -0.435, 0.05);
      knee.add(shoe);
      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.28), this.mat(ACCENT, 0.5));
      sole.position.set(0, -0.485, 0.05);
      knee.add(sole);
      hip.add(knee);

      this.meshRoot.add(hip);
      this.legs[side] = { hip, knee };
    }

    // ---- torso: pelvis, waist, chest, collar ----
    const pelvis = this.cap(0.165, 0.1, trouser);
    pelvis.position.y = 1.0;
    pelvis.scale.set(1.15, 1, 0.9);
    this.meshRoot.add(pelvis);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.185, 0.06, 16), this.mat(ACCENT, 0.5));
    belt.castShadow = true;
    belt.scale.set(1.1, 1, 0.85);
    belt.position.y = 1.1;
    this.meshRoot.add(belt);

    this.chest = new THREE.Group();
    this.chest.position.y = 1.16;
    const torsoMesh = this.cap(0.185, 0.34, shirt);
    torsoMesh.position.y = 0.24;
    torsoMesh.scale.set(1.18, 1, 0.82);
    this.chest.add(torsoMesh);
    this.meshRoot.add(this.chest);

    // neck + head (parented to chest so lean carries them)
    const neck = this.cap(0.055, 0.05, skin);
    neck.position.y = 0.52;
    this.chest.add(neck);

    this.head = new THREE.Group();
    this.head.position.y = 0.64;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.155, 22, 18), skin);
    skull.castShadow = true;
    skull.scale.set(0.92, 1.05, 0.96);
    this.head.add(skull);
    // jaw hint
    const jaw = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), skin);
    jaw.position.set(0, -0.07, 0.03);
    jaw.scale.set(0.95, 0.8, 0.9);
    this.head.add(jaw);
    // hair: cap + fringe
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 14), hairM);
    hairCap.castShadow = true;
    hairCap.position.set(0, 0.045, -0.022);
    hairCap.scale.set(0.98, 0.92, 1.0);
    this.head.add(hairCap);
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.07), hairM);
    fringe.position.set(0, 0.1, 0.115);
    fringe.rotation.x = -0.25;
    this.head.add(fringe);
    // ears
    for (const sx of [1, -1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), skin);
      ear.position.set(0.143 * sx, -0.005, 0.01);
      ear.scale.set(0.5, 1, 0.8);
      this.head.add(ear);
    }
    // eyes: whites + pupils (grouped for blinking)
    const whiteM = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 });
    const pupilM = new THREE.MeshStandardMaterial({ color: 0x23232e, roughness: 0.2 });
    this.eyes = [];
    for (const sx of [1, -1]) {
      const eye = new THREE.Group();
      eye.position.set(0.055 * sx, 0.015, 0.122);
      const white = new THREE.Mesh(new THREE.SphereGeometry(0.028, 12, 10), whiteM);
      white.scale.set(1, 0.85, 0.6);
      eye.add(white);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0125, 8, 8), pupilM);
      pupil.position.set(0, 0, 0.018);
      eye.add(pupil);
      this.head.add(eye);
      this.eyes.push(eye);
      // brow
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.011, 0.012), hairM);
      brow.position.set(0.055 * sx, 0.062, 0.135);
      brow.rotation.z = -0.12 * sx;
      this.head.add(brow);
    }
    // nose + mouth
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.035, 6), skin);
    nose.position.set(0, -0.018, 0.148);
    nose.rotation.x = Math.PI / 2 + 0.35;
    this.head.add(nose);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.008, 0.01), this.mat(0xa56a58, 0.6));
    mouth.position.set(0, -0.072, 0.128);
    this.head.add(mouth);
    this.chest.add(this.head);

    // ---- arms: shoulder pivot -> upper arm -> elbow pivot -> forearm + hand ----
    this.arms = {};
    for (const side of ['L', 'R']) {
      const sx = side === 'L' ? 1 : -1;
      const shoulder = new THREE.Group();
      shoulder.position.set(0.255 * sx, 0.44, 0);
      this.chest.add(shoulder);
      const upper = this.cap(0.058, 0.2, shirt); // sleeve
      upper.position.y = -0.15;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.3;
      const fore = this.cap(0.048, 0.18, skin); // rolled-up sleeves: bare forearm
      fore.position.y = -0.13;
      elbow.add(fore);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 10), skin);
      hand.castShadow = true;
      hand.scale.set(0.85, 1.1, 0.6);
      hand.position.y = -0.28;
      elbow.add(hand);
      shoulder.add(elbow);
      this.arms[side] = { shoulder, elbow };
    }

    // ---- umbrella (rain prop, hidden by default) ----
    this.umbrella = new THREE.Group();
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.72, 0.3, 9, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.7, side: THREE.DoubleSide })
    );
    canopy.castShadow = true;
    this.umbrella.add(canopy);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), this.mat(0xc7cdfa, 0.4));
    tip.position.y = 0.2;
    this.umbrella.add(tip);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 1.1, 8), this.mat(0x4b4b58, 0.4));
    pole.position.y = -0.5;
    this.umbrella.add(pole);
    this.umbrella.position.set(0.3, 2.45, 0.12);
    this.umbrella.visible = false;
    this.umbrella.scale.setScalar(0.001);
    this.meshRoot.add(this.umbrella);
  }

  // -------------------------------------------------------------- interface

  setState(state) {
    if (this.state === state) return;
    if (this.state === STATES.CELEBRATE && this.celebrateT >= 0 && state !== STATES.CELEBRATE) {
      if (state === STATES.IDLE || state === STATES.WALK) return;
    }
    this.state = state;
  }

  celebrate(onDone) {
    this.celebrateT = 0;
    this.celebrateDone = onDone || null;
    this.state = STATES.CELEBRATE;
  }

  setRainActive(active) {
    this.rainActive = active;
  }

  getHeadWorldPos(target = new THREE.Vector3()) {
    return this.head.getWorldPosition(target);
  }

  // ----------------------------------------------------------------- update

  update(dt) {
    this.t += dt;
    this.root.rotation.y = this.yaw;

    // blink
    this.blinkTimer -= dt;
    if (this.blinkTimer <= 0) { this.blinkLeft = 0.12; this.blinkTimer = 3 + Math.random() * 2; }
    if (this.blinkLeft > 0) this.blinkLeft -= dt;
    const eyeScaleY = this.blinkLeft > 0 ? 0.1 : 1;
    for (const eye of this.eyes) eye.scale.y = damp(eye.scale.y, eyeScaleY, 30, dt);

    // idle glances
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.lookY = (Math.random() - 0.5) * 0.7;
      this.lookTimer = 3 + Math.random() * 4;
    }

    const t = this.t;
    // pose targets (joint rotations)
    const p = {
      hipL: 0, kneeL: 0, hipR: 0, kneeR: 0,
      shL: 0.06, elL: 0.15, shR: -0.0, elR: 0.15,   // sh*: x-rot, el*: x-rot (negative = forward bend)
      shLz: 0.1, shRz: -0.1,
      headX: 0, headY: 0,
      pitch: 0, bob: 0, drop: 0, rollAmp: 0,
    };
    let rawArms = false;

    switch (this.state) {
      case STATES.IDLE: {
        p.bob = Math.sin(t * 2.1) * 0.012;
        p.shL = 0.05 + Math.sin(t * 2.1) * 0.03;
        p.shR = -0.05 - Math.sin(t * 2.1) * 0.03;
        p.elL = 0.18; p.elR = 0.18;
        p.headY = this.lookY * 0.6;
        p.rollAmp = 0.012;
        break;
      }
      case STATES.WALK:
      case STATES.RUN: {
        const run = this.state === STATES.RUN;
        const freq = run ? 11.5 : 7.2;
        const A = run ? 0.8 : 0.5;
        const ph = t * freq;
        const s = Math.sin(ph);
        p.hipL = s * A;
        p.hipR = -s * A;
        // knee bends as the leg swings back & recovers
        p.kneeL = Math.max(0, Math.sin(ph - 2.0)) * A * (run ? 1.5 : 1.1) + 0.08;
        p.kneeR = Math.max(0, Math.sin(ph + Math.PI - 2.0)) * A * (run ? 1.5 : 1.1) + 0.08;
        p.shL = -(-s * A) * 0.7;  // arms counter-swing
        p.shR = -(s * A) * 0.7;
        p.elL = 0.4 + Math.max(0, s) * (run ? 0.6 : 0.25);
        p.elR = 0.4 + Math.max(0, -s) * (run ? 0.6 : 0.25);
        p.bob = Math.abs(Math.cos(ph)) * (run ? 0.06 : 0.035);
        p.pitch = run ? 0.18 : 0.04;
        break;
      }
      case STATES.JUMP: {
        p.hipL = -0.7; p.kneeL = 1.25;
        p.hipR = -0.4; p.kneeR = 0.9;
        p.shL = -1.6; p.shR = -1.6;
        p.elL = 0.5; p.elR = 0.5;
        p.shLz = 0.45; p.shRz = -0.45;
        break;
      }
      case STATES.SIT: {
        p.hipL = -1.5; p.kneeL = 1.5;
        p.hipR = -1.42; p.kneeR = 1.35;
        p.shL = 0.35; p.shR = 0.35;
        p.elL = 0.45; p.elR = 0.45;
        p.pitch = -0.06;
        p.drop = 0.56;
        p.headY = this.lookY * 0.5;
        break;
      }
      case STATES.CRY: {
        p.shL = -2.3; p.shR = -2.3;
        p.elL = 1.95; p.elR = 1.95;
        p.shLz = -0.4; p.shRz = 0.4;   // hands meet at the face
        p.headX = 0.42;
        p.pitch = 0.1;
        p.rollAmp = 0.05;
        break;
      }
      case STATES.SWIM_SURFACE:
      case STATES.SWIM_DIVE:
      case STATES.SWIM_ASCEND: {
        const dive = this.state === STATES.SWIM_DIVE;
        const ascend = this.state === STATES.SWIM_ASCEND;
        if (this.moveSpeed < 0.6 && !dive && !ascend) {
          // treading water
          p.pitch = 0.3;
          p.shL = -0.3; p.shR = -0.3;
          p.shLz = 1.15 + Math.sin(t * 4) * 0.25;
          p.shRz = -1.15 - Math.sin(t * 4) * 0.25;
          p.elL = 0.7; p.elR = 0.7;
          p.hipL = Math.sin(t * 5) * 0.45;
          p.hipR = -Math.sin(t * 5) * 0.45;
          p.kneeL = 0.55 + Math.max(0, -Math.sin(t * 5)) * 0.4;
          p.kneeR = 0.55 + Math.max(0, Math.sin(t * 5)) * 0.4;
          p.bob = Math.sin(t * 2.6) * 0.04;
        } else {
          // freestyle stroke
          rawArms = true;
          p.pitch = dive ? 1.9 : ascend ? 0.6 : 1.42;
          const ph = t * 6.5;
          this.arms.L.shoulder.rotation.x = -(ph % TAU);
          this.arms.R.shoulder.rotation.x = -((ph + Math.PI) % TAU);
          this.arms.L.shoulder.rotation.z = 0.18;
          this.arms.R.shoulder.rotation.z = -0.18;
          this.arms.L.elbow.rotation.x = 0.35 + Math.max(0, Math.sin(ph)) * 0.7;
          this.arms.R.elbow.rotation.x = 0.35 + Math.max(0, Math.sin(ph + Math.PI)) * 0.7;
          const k = t * 10.5;
          p.hipL = Math.sin(k) * 0.32;
          p.hipR = -Math.sin(k) * 0.32;
          p.kneeL = 0.2 + Math.max(0, Math.sin(k)) * 0.3;
          p.kneeR = 0.2 + Math.max(0, -Math.sin(k)) * 0.3;
        }
        break;
      }
      case STATES.CELEBRATE: {
        this.celebrateT += dt;
        const ct = this.celebrateT;
        if (ct < 0.45) {            // fist pump
          p.shR = -2.9; p.elR = 0.9;
          p.bob = Math.abs(Math.sin(ct * 14)) * 0.1;
        } else if (ct < 0.85) {     // point at the user
          p.shR = -1.45; p.elR = 0.1; p.headX = -0.08;
        } else if (ct < 1.25) {     // double thumbs up
          p.shR = -1.0; p.elR = 0.9; p.shRz = -0.4;
          p.shL = -1.0; p.elL = 0.9; p.shLz = 0.4;
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

    // umbrella: held while moving through the rain (not while crying/swimming)
    const wantUmbrella = this.rainActive &&
      (this.state === STATES.WALK || this.state === STATES.RUN || this.state === STATES.JUMP);
    if (wantUmbrella) {
      p.shR = -2.55; p.elR = 0.35; p.shRz = -0.12;
    }
    this.umbrella.visible = this.umbrella.scale.x > 0.01 || wantUmbrella;
    const us = damp(this.umbrella.scale.x, wantUmbrella ? 1 : 0.001, 10, dt);
    this.umbrella.scale.setScalar(us);
    this.umbrella.rotation.z = Math.sin(t * 1.8) * 0.05;
    this.umbrella.rotation.x = Math.sin(t * 1.3) * 0.04;

    // apply with damping
    const k = 12;
    this.legs.L.hip.rotation.x = damp(this.legs.L.hip.rotation.x, p.hipL, k, dt);
    this.legs.R.hip.rotation.x = damp(this.legs.R.hip.rotation.x, p.hipR, k, dt);
    this.legs.L.knee.rotation.x = damp(this.legs.L.knee.rotation.x, p.kneeL, k, dt);
    this.legs.R.knee.rotation.x = damp(this.legs.R.knee.rotation.x, p.kneeR, k, dt);

    if (!rawArms) {
      this.arms.L.shoulder.rotation.x = damp(this.arms.L.shoulder.rotation.x % TAU, p.shL, k, dt);
      this.arms.R.shoulder.rotation.x = damp(this.arms.R.shoulder.rotation.x % TAU, p.shR, k, dt);
      this.arms.L.shoulder.rotation.z = damp(this.arms.L.shoulder.rotation.z, p.shLz, k, dt);
      this.arms.R.shoulder.rotation.z = damp(this.arms.R.shoulder.rotation.z, p.shRz, k, dt);
      this.arms.L.elbow.rotation.x = damp(this.arms.L.elbow.rotation.x, p.elL, k, dt);
      this.arms.R.elbow.rotation.x = damp(this.arms.R.elbow.rotation.x, p.elR, k, dt);
    }

    this.head.rotation.x = damp(this.head.rotation.x, p.headX, k, dt);
    this.head.rotation.y = damp(this.head.rotation.y, p.headY, 6, dt);
    this.meshRoot.rotation.x = damp(this.meshRoot.rotation.x, p.pitch, 8, dt);
    this.meshRoot.rotation.z = p.rollAmp
      ? Math.sin(t * (this.state === STATES.CRY ? 18 : 1.3)) * p.rollAmp
      : damp(this.meshRoot.rotation.z, 0, k, dt);
    this.meshRoot.position.y = damp(this.meshRoot.position.y, p.bob - p.drop, 14, dt);

    // breathing
    const breathe = this.state === STATES.IDLE || this.state === STATES.CRY
      ? 1 + Math.sin(t * 2.4) * 0.015 : 1;
    this.chest.scale.setScalar(breathe);
  }
}
