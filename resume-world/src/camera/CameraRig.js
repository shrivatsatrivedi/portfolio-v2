import * as THREE from 'three';
import { clamp, damp } from '../utils.js';

// Blends continuously between a top-down "map view" and a third-person
// cinematic view — the Apple Maps tilt gesture. T snaps between them,
// pinch (ctrl+wheel) scrubs the blend, plain wheel pans across the page.

const TOP_FOV = 55;
const TP_FOV = 75;

export class CameraRig {
  constructor(camera, character, dom) {
    this.camera = camera;
    this.character = character;

    this.blend = 0;          // 0 = top-down, 1 = third-person
    this.blendTarget = 0;
    this.introH = 0;         // extra height during the opening swoop

    this.panOffset = new THREE.Vector3();
    this.panVel = new THREE.Vector3();

    this.lookSmooth = character.root.position.clone();
    this.posSmooth = new THREE.Vector3(0, 18, 6);

    this._topPos = new THREE.Vector3();
    this._tpPos = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this._lookTarget = new THREE.Vector3();
    this._fwd = new THREE.Vector3();

    window.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey) {
        this.blendTarget = clamp(this.blendTarget + e.deltaY * 0.0035, 0, 1);
      } else {
        this.panVel.x += e.deltaX * 0.012;
        this.panVel.z += e.deltaY * 0.012;
      }
    }, { passive: false });
  }

  toggle() {
    this.blendTarget = this.blendTarget < 0.5 ? 1 : 0;
    return this.blendTarget;
  }

  getForward(target = this._fwd) {
    this.camera.getWorldDirection(target);
    target.y = 0;
    if (target.lengthSq() < 1e-6) target.set(0, 0, -1);
    return target.normalize();
  }

  update(dt) {
    const charPos = this.character.root.position;

    // pan momentum + friction; recenter while the character moves
    this.panVel.multiplyScalar(Math.pow(0.92, dt * 60));
    this.panOffset.addScaledVector(this.panVel, dt * 60);
    this.panOffset.x = clamp(this.panOffset.x, -18, 18);
    this.panOffset.z = clamp(this.panOffset.z, -24, 24);
    if (this.character.moveSpeed > 0.5) {
      this.panOffset.multiplyScalar(Math.pow(0.05, dt));
    }

    this.blend = damp(this.blend, this.blendTarget, 6, dt);
    const b = this.blend;

    const focus = this._lookTarget.set(
      charPos.x + this.panOffset.x,
      charPos.y,
      charPos.z + this.panOffset.z
    );

    // top-down candidate
    this._topPos.set(focus.x, 18, focus.z + 6);

    // third-person candidate — behind the character's shoulder
    const yaw = this.character.yaw;
    const back = 6;
    this._tpPos.set(
      focus.x - Math.sin(yaw) * back,
      focus.y + 3.5,
      focus.z - Math.cos(yaw) * back
    );

    this._desired.lerpVectors(this._topPos, this._tpPos, b);
    this._desired.y += this.introH;

    this.posSmooth.x = damp(this.posSmooth.x, this._desired.x, 5, dt);
    this.posSmooth.y = damp(this.posSmooth.y, this._desired.y, 5, dt);
    this.posSmooth.z = damp(this.posSmooth.z, this._desired.z, 5, dt);
    this.camera.position.copy(this.posSmooth);

    const lookY = focus.y + 1.5 * b;
    this.lookSmooth.x = damp(this.lookSmooth.x, focus.x, 6, dt);
    this.lookSmooth.y = damp(this.lookSmooth.y, lookY, 6, dt);
    this.lookSmooth.z = damp(this.lookSmooth.z, focus.z, 6, dt);
    this.camera.lookAt(this.lookSmooth);

    const fov = TOP_FOV + (TP_FOV - TOP_FOV) * b;
    if (Math.abs(this.camera.fov - fov) > 0.05) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
}
