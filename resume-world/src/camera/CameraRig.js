import * as THREE from 'three';
import { clamp, damp, dampAngle } from '../utils.js';

// Orbit camera around the character:
//   drag            — rotate (yaw + pitch) so you can see the character's face
//   scroll / pinch  — zoom in and out
//   T / button      — toggle between Top and Third-person presets
// The camera always follows the character; presets just set pitch + distance,
// after which you're free to orbit and zoom.

const PRESETS = {
  top: { pitch: 1.28, dist: 24 },
  third: { pitch: 0.3, dist: 7.5 },
};

export class CameraRig {
  constructor(camera, character, dom) {
    this.camera = camera;
    this.character = character;

    this.mode = 'top';
    this.yaw = 0;                 // 0 = camera south of the page, text upright
    this.pitch = PRESETS.top.pitch;
    this.dist = 48;               // start far out; damps in for an opening swoop
    this.yawT = 0;
    this.pitchT = PRESETS.top.pitch;
    this.distT = PRESETS.top.dist;

    this.focus = character.root.position.clone();

    this._offset = new THREE.Vector3();
    this._fwd = new THREE.Vector3();

    // ---------- pointer input: rotate + pinch zoom ----------
    this.pointers = new Map();
    this.pinchDist = 0;

    dom.addEventListener('pointerdown', (e) => {
      this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this.pointers.size === 2) {
        const [a, b] = [...this.pointers.values()];
        this.pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
    });
    dom.addEventListener('pointermove', (e) => {
      const prev = this.pointers.get(e.pointerId);
      if (!prev) return;
      const dx = e.clientX - prev.x;
      const dy = e.clientY - prev.y;
      prev.x = e.clientX;
      prev.y = e.clientY;

      if (this.pointers.size === 2) {
        // pinch zoom
        const [a, b] = [...this.pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this.pinchDist > 0) {
          this.distT = clamp(this.distT * (this.pinchDist / d), 4.5, 40);
        }
        this.pinchDist = d;
      } else if (this.pointers.size === 1 && (e.pointerType !== 'mouse' || e.buttons & 1)) {
        // one-finger / left-drag rotate
        this.yawT -= dx * 0.0055;
        this.pitchT = clamp(this.pitchT + dy * 0.0042, 0.14, 1.5);
      }
    });
    const release = (e) => {
      this.pointers.delete(e.pointerId);
      this.pinchDist = 0;
    };
    dom.addEventListener('pointerup', release);
    dom.addEventListener('pointercancel', release);
    dom.addEventListener('pointerleave', release);

    // wheel & trackpad pinch (ctrl+wheel) both zoom
    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = e.ctrlKey ? 0.006 : 0.0014;
      this.distT = clamp(this.distT * Math.exp(e.deltaY * factor), 4.5, 40);
    }, { passive: false });
  }

  toggle() {
    this.mode = this.mode === 'top' ? 'third' : 'top';
    const preset = PRESETS[this.mode];
    this.pitchT = preset.pitch;
    this.distT = preset.dist;
    return this.mode;
  }

  getForward(target = this._fwd) {
    this.camera.getWorldDirection(target);
    target.y = 0;
    if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
    return target.normalize();
  }

  update(dt) {
    this.yaw = dampAngle(this.yaw, this.yawT, 10, dt);
    this.pitch = damp(this.pitch, this.pitchT, 8, dt);
    this.dist = damp(this.dist, this.distT, 5, dt);

    const charPos = this.character.root.position;
    this.focus.x = damp(this.focus.x, charPos.x, 6, dt);
    this.focus.y = damp(this.focus.y, charPos.y + 1.1, 6, dt);
    this.focus.z = damp(this.focus.z, charPos.z, 6, dt);

    const cp = Math.cos(this.pitch);
    this._offset.set(
      Math.sin(this.yaw) * cp,
      Math.sin(this.pitch),
      Math.cos(this.yaw) * cp
    ).multiplyScalar(this.dist);

    this.camera.position.copy(this.focus).add(this._offset);
    if (this.camera.position.y < 0.6) this.camera.position.y = 0.6;
    this.camera.lookAt(this.focus);

    // tighter FOV when looking straight down (map feel), wider up close
    const fov = 46 + (1.5 - this.pitch) * 15;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
