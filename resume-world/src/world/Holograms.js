import * as THREE from 'three';
import { gsap } from 'gsap';

// Wireframe holograms that rise above a section while it's being narrated:
// a phone for the Android internship, a face for the emotion AI, a timer for
// the pomodoro app, a database stack for MERN, a grad cap, a trophy star...

const HOLO_COLOR = 0x8a90ff;

function lineMat(opacity = 0.8) {
  return new THREE.LineBasicMaterial({
    color: HOLO_COLOR, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
}

function edges(geo) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(geo), lineMat());
}

function circle(r, segments = 40, y = 0) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat());
}

function flatCircle(r, segments = 40) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
  }
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat());
}

const BUILDERS = {
  header() {
    // a gyroscope: three nested rings around a core — "the whole person"
    const g = new THREE.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = flatCircle(0.55 - i * 0.13, 36);
      g.add(ring);
      rings.push(ring);
    }
    const core = edges(new THREE.OctahedronGeometry(0.16));
    g.add(core);
    g.userData.anim = (grp, t) => {
      rings[0].rotation.x = t * 0.9;
      rings[1].rotation.y = t * 1.2;
      rings[2].rotation.x = -t * 0.7;
      rings[2].rotation.z = t * 0.5;
      core.rotation.y = t * 2;
    };
    return g;
  },
  contact() {
    const g = new THREE.Group();
    const body = edges(new THREE.BoxGeometry(1.5, 0.9, 0.05));
    g.add(body);
    const flap = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.75, 0.45, 0.03), new THREE.Vector3(0, -0.1, 0.06), new THREE.Vector3(0.75, 0.45, 0.03),
    ]), lineMat());
    g.add(flap);
    g.userData.anim = (grp, t) => { grp.rotation.y = t * 0.7; };
    return g;
  },
  education() {
    const g = new THREE.Group();
    const board = edges(new THREE.BoxGeometry(1.5, 0.07, 1.5));
    board.rotation.y = Math.PI / 4;
    g.add(board);
    const cap = edges(new THREE.CylinderGeometry(0.45, 0.5, 0.42, 8));
    cap.position.y = -0.28;
    g.add(cap);
    const tassel = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0.04, 0), new THREE.Vector3(0.75, 0.04, 0), new THREE.Vector3(0.78, -0.5, 0.05),
    ]), lineMat());
    g.add(tassel);
    g.userData.anim = (grp, t) => { grp.rotation.y = t * 0.6; };
    return g;
  },
  'experience-glance'() {
    const g = new THREE.Group();
    g.add(edges(new THREE.BoxGeometry(0.62, 1.25, 0.07)));
    const screen = edges(new THREE.PlaneGeometry(0.52, 1.0));
    screen.position.z = 0.04;
    g.add(screen);
    // notification pips sliding up the screen
    const pips = [];
    for (let i = 0; i < 3; i++) {
      const pip = edges(new THREE.PlaneGeometry(0.4, 0.14));
      pip.position.z = 0.05;
      g.add(pip);
      pips.push(pip);
    }
    g.userData.anim = (grp, t) => {
      grp.rotation.y = Math.sin(t * 0.8) * 0.7;
      pips.forEach((p, i) => { p.position.y = ((t * 0.25 + i * 0.33) % 1) * 0.9 - 0.45; });
    };
    return g;
  },
  awards() {
    const g = new THREE.Group();
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 === 0 ? 0.7 : 0.3;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, 0));
    }
    g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat()));
    const halo = flatCircle(0.85);
    g.add(halo);
    g.userData.anim = (grp, t) => { grp.rotation.y = t; halo.rotation.z = -t * 0.5; };
    return g;
  },
  'project-emotion'() {
    const g = new THREE.Group();
    g.add(flatCircle(0.62, 32));
    for (const sx of [-1, 1]) {
      const eye = flatCircle(0.09, 12);
      eye.position.set(0.22 * sx, 0.18, 0.01);
      g.add(eye);
    }
    // mouth arc, morphing happy <-> neutral
    const mouthPts = [];
    for (let i = 0; i <= 16; i++) mouthPts.push(new THREE.Vector3(0, 0, 0));
    const mouth = new THREE.Line(new THREE.BufferGeometry().setFromPoints(mouthPts), lineMat());
    g.add(mouth);
    g.userData.anim = (grp, t) => {
      grp.rotation.y = Math.sin(t * 0.6) * 0.5;
      const curve = (Math.sin(t * 1.2) + 1) / 2; // 0 = flat, 1 = smile
      const arr = mouth.geometry.attributes.position.array;
      for (let i = 0; i <= 16; i++) {
        const x = (i / 16 - 0.5) * 0.5;
        arr[i * 3] = x;
        arr[i * 3 + 1] = -0.22 - Math.cos((i / 16 - 0.5) * Math.PI) * 0.14 * curve;
        arr[i * 3 + 2] = 0.01;
      }
      mouth.geometry.attributes.position.needsUpdate = true;
    };
    return g;
  },
  'project-focus'() {
    const g = new THREE.Group();
    g.add(flatCircle(0.65, 48));
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const tick = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * 0.56, Math.sin(a) * 0.56, 0),
        new THREE.Vector3(Math.cos(a) * 0.65, Math.sin(a) * 0.65, 0),
      ]), lineMat());
      g.add(tick);
    }
    const hand = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0.01), new THREE.Vector3(0, 0.5, 0.01),
    ]), lineMat());
    g.add(hand);
    g.userData.anim = (grp, t) => { hand.rotation.z = -t * 1.5; grp.rotation.y = Math.sin(t * 0.5) * 0.4; };
    return g;
  },
  'project-mern'() {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const disk = edges(new THREE.CylinderGeometry(0.55, 0.55, 0.3, 14));
      disk.position.y = (i - 1) * 0.42;
      g.add(disk);
    }
    g.userData.anim = (grp, t) => { grp.rotation.y = t * 0.9; };
    return g;
  },
  certifications() {
    const g = new THREE.Group();
    const medal = flatCircle(0.5, 28);
    medal.position.y = 0.15;
    g.add(medal);
    const inner = flatCircle(0.3, 20);
    inner.position.y = 0.15;
    g.add(inner);
    for (const sx of [-1, 1]) {
      const ribbon = new THREE.Line(new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0.18 * sx, -0.25, 0), new THREE.Vector3(0.34 * sx, -0.95, 0),
        new THREE.Vector3(0.1 * sx, -0.85, 0),
      ]), lineMat());
      g.add(ribbon);
    }
    g.userData.anim = (grp, t) => { grp.rotation.y = t * 0.8; };
    return g;
  },
  skills() {
    const g = new THREE.Group();
    const core = edges(new THREE.OctahedronGeometry(0.3));
    g.add(core);
    const cubes = [];
    for (let i = 0; i < 4; i++) {
      const cube = edges(new THREE.BoxGeometry(0.22, 0.22, 0.22));
      g.add(cube);
      cubes.push(cube);
    }
    g.userData.anim = (grp, t) => {
      core.rotation.y = t; core.rotation.x = t * 0.7;
      cubes.forEach((c2, i) => {
        const a = t * 0.9 + (i / 4) * Math.PI * 2;
        c2.position.set(Math.cos(a) * 0.85, Math.sin(t * 1.3 + i) * 0.18, Math.sin(a) * 0.85);
        c2.rotation.y = t * 2 + i;
      });
    };
    return g;
  },
};

export class Holograms {
  constructor(scene) {
    this.scene = scene;
    this.cache = new Map();
    this.current = null;
    this.t = 0;
  }

  show(section) {
    this.hide();
    const builder = BUILDERS[section.id] || BUILDERS[section.type] || null;
    if (!builder) return;
    let group = this.cache.get(section.id);
    if (!group) {
      group = builder();
      this.cache.set(section.id, group);
      this.scene.add(group);
    }
    const b = section.worldBox;
    group.position.set(b.x + b.width / 2, 2.6, b.z + b.depth / 2);
    group.visible = true;
    group.scale.setScalar(0.001);
    gsap.killTweensOf(group.scale);
    gsap.to(group.scale, { x: 1.6, y: 1.6, z: 1.6, duration: 0.7, ease: 'back.out(1.6)' });
    this.current = group;
  }

  hide() {
    if (!this.current) return;
    const group = this.current;
    this.current = null;
    gsap.killTweensOf(group.scale);
    gsap.to(group.scale, {
      x: 0.001, y: 0.001, z: 0.001, duration: 0.35, ease: 'power2.in',
      onComplete: () => { group.visible = false; },
    });
  }

  update(dt) {
    this.t += dt;
    if (this.current?.userData.anim) {
      this.current.userData.anim(this.current, this.t);
      this.current.position.y = 2.6 + Math.sin(this.t * 1.4) * 0.12;
    }
  }
}
