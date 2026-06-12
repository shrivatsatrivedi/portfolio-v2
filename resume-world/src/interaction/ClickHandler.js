import * as THREE from 'three';
import { gsap } from 'gsap';
import { sectionAt } from './ResumeContent.js';
import { clamp } from '../utils.js';

// Single click: walk to the point (with a ripple). Double click: run to the
// section and have the character introduce it. Click/tap detection is
// unified for mouse and touch — two clicks within 300ms = double.

const DBL_MS = 300;

export class ClickHandler {
  constructor(camera, dom, scene, controller, character, bubble, colliders, getPrefix) {
    this.camera = camera;
    this.scene = scene;
    this.controller = controller;
    this.character = character;
    this.bubble = bubble;
    this.colliders = colliders;
    this.getPrefix = getPrefix || (() => '');

    this.raycaster = new THREE.Raycaster();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.ndc = new THREE.Vector2();
    this.hit = new THREE.Vector3();

    this.firstInteraction = true;
    this.lastClick = { time: 0, x: 0, y: 0 };
    this.singleTimer = null;
    this.downPos = null;

    dom.addEventListener('pointerdown', (e) => {
      this.downPos = { x: e.clientX, y: e.clientY };
    });
    dom.addEventListener('pointerup', (e) => {
      if (!this.downPos) return;
      const moved = Math.hypot(e.clientX - this.downPos.x, e.clientY - this.downPos.y);
      this.downPos = null;
      if (moved > 8) return;
      this.onTap(e.clientX, e.clientY);
    });
  }

  onTap(x, y) {
    const now = performance.now();
    const isDouble =
      now - this.lastClick.time < DBL_MS &&
      Math.hypot(x - this.lastClick.x, y - this.lastClick.y) < 30;
    this.lastClick = { time: now, x, y };

    if (isDouble) {
      clearTimeout(this.singleTimer);
      this.singleTimer = null;
      this.handleDouble(x, y);
    } else {
      this.singleTimer = setTimeout(() => this.handleSingle(x, y), DBL_MS + 20);
    }
  }

  pointFromScreen(x, y) {
    this.ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    if (!this.raycaster.ray.intersectPlane(this.groundPlane, this.hit)) return null;
    if (Math.abs(this.hit.x) > 15 || Math.abs(this.hit.z) > 21) return null;
    return this.hit.clone();
  }

  // keep walk targets out of the heading blocks
  nudgeOutOfBlocks(p) {
    for (const b of this.colliders) {
      if (p.x > b.minX - 0.4 && p.x < b.maxX + 0.4 && p.z > b.minZ - 0.4 && p.z < b.maxZ + 0.4) {
        p.z = b.maxZ + 0.9;
      }
    }
    return p;
  }

  handleSingle(x, y) {
    const point = this.pointFromScreen(x, y);
    if (!point) return;
    this.bubble.hide();
    this.spawnRipple(point);
    this.controller.setMoveTarget(this.nudgeOutOfBlocks(point));
  }

  handleDouble(x, y) {
    const point = this.pointFromScreen(x, y);
    if (!point) return;
    const section = sectionAt(point.x, point.z);
    this.spawnRipple(point);
    if (!section) {
      this.controller.setMoveTarget(this.nudgeOutOfBlocks(point));
      return;
    }

    // aim for the clicked spot, clamped inside the section
    const b = section.worldBox;
    const target = new THREE.Vector3(
      clamp(point.x, b.x + 1, b.x + b.width - 1),
      0,
      clamp(point.z, b.z + 0.5, b.z + b.depth - 0.5)
    );
    this.nudgeOutOfBlocks(target);

    const speak = () => {
      const prefix = this.getPrefix(section);
      if (this.firstInteraction && !this.controller.inWater) {
        this.firstInteraction = false;
        this.character.celebrate(() => this.bubble.showSection(section, prefix));
      } else {
        this.bubble.showSection(section, prefix);
      }
    };

    const dist = this.character.root.position.distanceTo(target);
    if (dist < 2.2) {
      this.controller.moveTarget = null;
      speak();
    } else {
      this.bubble.hide();
      this.controller.setMoveTarget(target, speak);
    }
  }

  spawnRipple(point) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.22, 0.3, 36),
      new THREE.MeshBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(point.x, 0.03, point.z);
    this.scene.add(ring);
    gsap.to(ring.scale, { x: 5.5, y: 5.5, z: 5.5, duration: 0.55, ease: 'power2.out' });
    gsap.to(ring.material, {
      opacity: 0, duration: 0.55, ease: 'power2.out',
      onComplete: () => { this.scene.remove(ring); ring.geometry.dispose(); ring.material.dispose(); },
    });
  }
}
