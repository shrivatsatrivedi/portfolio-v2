import * as THREE from 'three';

// Fading ink footprints left on the paper as the character walks.

const POOL = 26;
const STEP_DIST = 0.62;
const LIFE = 5.5;

export class Footprints {
  constructor(scene, character, controller) {
    this.character = character;
    this.controller = controller;
    this.lastPos = new THREE.Vector2();
    this.travelled = 0;
    this.leftFoot = true;

    this.pool = [];
    const geo = new THREE.CircleGeometry(0.07, 10);
    for (let i = 0; i < POOL; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0x23233d, transparent: true, opacity: 0, depthWrite: false,
      }));
      m.rotation.x = -Math.PI / 2;
      m.scale.set(1, 1.7, 1); // heel-to-toe ellipse
      m.position.y = 0.015;
      m.visible = false;
      scene.add(m);
      this.pool.push({ mesh: m, life: 0 });
    }
    this.next = 0;
  }

  update(dt) {
    const p = this.character.root.position;
    const dx = p.x - this.lastPos.x;
    const dz = p.z - this.lastPos.y;
    this.lastPos.set(p.x, p.z);

    const grounded = this.controller.grounded && p.y < 0.05 && !this.controller.inWater;
    if (grounded && this.character.moveSpeed > 0.6) {
      this.travelled += Math.hypot(dx, dz);
      if (this.travelled >= STEP_DIST) {
        this.travelled = 0;
        this.spawn(p);
      }
    }

    for (const fp of this.pool) {
      if (fp.life <= 0) continue;
      fp.life -= dt;
      fp.mesh.material.opacity = Math.min(fp.life / LIFE, 1) * 0.3;
      if (fp.life <= 0) fp.mesh.visible = false;
    }
  }

  spawn(p) {
    if (Math.abs(p.x) > 14.8 || Math.abs(p.z) > 20.8) return; // only on the paper
    const fp = this.pool[this.next];
    this.next = (this.next + 1) % POOL;
    const yaw = this.character.yaw;
    const side = (this.leftFoot ? 1 : -1) * 0.11;
    this.leftFoot = !this.leftFoot;
    fp.mesh.position.set(
      p.x + Math.cos(yaw) * side,
      0.015,
      p.z - Math.sin(yaw) * side
    );
    fp.mesh.rotation.z = -yaw;
    fp.mesh.visible = true;
    fp.life = LIFE;
    fp.mesh.material.opacity = 0.3;
  }
}
