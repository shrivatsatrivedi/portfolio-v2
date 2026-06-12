import * as THREE from 'three';
import { STATES } from './CharacterStates.js';
import { PAGE } from '../interaction/ResumeContent.js';
import { clamp, damp, dampAngle } from '../utils.js';

// Lightweight kinematic controller: gravity, jump impulses, AABB collision
// against the heading blocks, click-to-walk targets, and swim physics for
// flood mode. The world is one flat sheet + a handful of boxes, so a full
// physics engine isn't needed to get snappy, predictable movement.

const WALK_SPEED = 4;
const RUN_SPEED = 8;
const JUMP_IMPULSE = 8;
const GRAVITY = -20;
const RADIUS = 0.35;

const BOUND_X = PAGE.width / 2 - 0.5;
const BOUND_Z = PAGE.depth / 2 - 0.5;

export class CharacterController {
  constructor(character, colliders, cameraRig, hud) {
    this.character = character;
    this.colliders = colliders;
    this.rig = cameraRig;
    this.hud = hud;

    this.pos = character.root.position;
    this.vel = new THREE.Vector3();
    this.grounded = false;
    this.onBlock = null;
    this.sitting = false;
    this.jumpQueued = false;

    this.moveTarget = null;
    this.onArrive = null;

    this.water = null;        // FloodMode sets { level } while active
    this.inWater = false;
    this.submerged = false;
    this.rainActive = false;

    this.keys = new Set();
    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
  }

  onKey(e, down) {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (down) {
      this.keys.add(k);
      if (k === ' ') this.jumpQueued = true;
      if (k === 'e') this.trySit();
      if (this.isMoveKey(k)) { this.moveTarget = null; this.onArrive = null; this.sitting = false; }
    } else {
      this.keys.delete(k);
    }
  }

  isMoveKey(k) {
    return ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k);
  }

  trySit() {
    if (this.grounded && this.onBlock && !this.inWater) {
      this.sitting = !this.sitting;
      this.moveTarget = null;
    }
  }

  setMoveTarget(point, onArrive = null) {
    this.moveTarget = point.clone();
    this.onArrive = onArrive;
    this.sitting = false;
  }

  // direction the player is asking for, in camera-relative world space
  inputDir() {
    const joy = this.hud?.joy;
    let ix = 0, iz = 0;
    if (this.keys.has('w') || this.keys.has('arrowup')) iz += 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) iz -= 1;
    if (this.keys.has('a') || this.keys.has('arrowleft')) ix -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) ix += 1;
    if (joy && joy.active) { ix += joy.x; iz -= joy.z; }
    if (ix === 0 && iz === 0) return null;

    const fwd = this.rig.getForward();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x).negate();
    const dir = new THREE.Vector3()
      .addScaledVector(fwd, iz)
      .addScaledVector(right, ix);
    dir.y = 0;
    return dir.lengthSq() > 0 ? dir.normalize() : null;
  }

  update(dt) {
    if (this.water && this.water.level > 0.45) {
      this.updateSwim(dt);
      return;
    }
    this.inWater = false;
    this.submerged = false;

    const char = this.character;
    const manual = this.inputDir();
    const running = this.keys.has('shift') || (this.hud?.joy?.active && this.hud.joy.mag > 0.85);

    let desired = new THREE.Vector3();
    let speed = 0;

    if (manual) {
      speed = running ? RUN_SPEED : WALK_SPEED;
      desired.copy(manual).multiplyScalar(speed);
      this.sitting = false;
    } else if (this.moveTarget) {
      const to = new THREE.Vector3().subVectors(this.moveTarget, this.pos);
      to.y = 0;
      const dist = to.length();
      if (dist < 0.45) {
        this.moveTarget = null;
        const cb = this.onArrive;
        this.onArrive = null;
        if (cb) cb();
      } else {
        speed = dist > 6 ? RUN_SPEED : WALK_SPEED;
        speed = Math.min(speed, dist * 4);
        desired.copy(to.normalize()).multiplyScalar(speed);
      }
    }

    if (this.sitting) desired.set(0, 0, 0);

    // horizontal velocity eases toward desired — snappy but not instant
    this.vel.x = damp(this.vel.x, desired.x, 12, dt);
    this.vel.z = damp(this.vel.z, desired.z, 12, dt);

    // gravity + jump
    this.vel.y += GRAVITY * dt;
    if (this.jumpQueued && this.grounded && !this.sitting) {
      this.vel.y = JUMP_IMPULSE;
      this.grounded = false;
      this.onBlock = null;
    }
    this.jumpQueued = false;

    const prevY = this.pos.y;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    // block collision
    this.onBlock = null;
    for (const b of this.colliders) {
      const inX = this.pos.x > b.minX - RADIUS && this.pos.x < b.maxX + RADIUS;
      const inZ = this.pos.z > b.minZ - RADIUS && this.pos.z < b.maxZ + RADIUS;
      if (!inX || !inZ) continue;

      if (prevY >= b.topY - 0.01 && this.vel.y <= 0) {
        // land on top
        if (this.pos.y <= b.topY) {
          this.pos.y = b.topY;
          this.vel.y = 0;
          this.grounded = true;
          this.onBlock = b;
        }
      } else if (this.pos.y < b.topY - 0.05) {
        // push out horizontally along the axis of least penetration
        const pushXPos = b.maxX + RADIUS - this.pos.x;
        const pushXNeg = this.pos.x - (b.minX - RADIUS);
        const pushZPos = b.maxZ + RADIUS - this.pos.z;
        const pushZNeg = this.pos.z - (b.minZ - RADIUS);
        const minPush = Math.min(pushXPos, pushXNeg, pushZPos, pushZNeg);
        if (minPush === pushXPos) { this.pos.x = b.maxX + RADIUS; this.vel.x = Math.max(0, this.vel.x); }
        else if (minPush === pushXNeg) { this.pos.x = b.minX - RADIUS; this.vel.x = Math.min(0, this.vel.x); }
        else if (minPush === pushZPos) { this.pos.z = b.maxZ + RADIUS; this.vel.z = Math.max(0, this.vel.z); }
        else { this.pos.z = b.minZ - RADIUS; this.vel.z = Math.min(0, this.vel.z); }
      }
    }

    // ground plane
    if (this.pos.y <= 0 && !this.onBlock) {
      this.pos.y = 0;
      if (this.vel.y < 0) this.vel.y = 0;
      this.grounded = true;
    } else if (!this.onBlock && this.pos.y > 0.01) {
      this.grounded = false;
    }
    if (this.sitting && !this.onBlock) this.sitting = false;

    // stay on the paper
    this.pos.x = clamp(this.pos.x, -BOUND_X, BOUND_X);
    this.pos.z = clamp(this.pos.z, -BOUND_Z, BOUND_Z);

    // face movement direction
    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    char.moveSpeed = hSpeed;
    if (hSpeed > 0.4) {
      const targetYaw = Math.atan2(this.vel.x, this.vel.z);
      char.yaw = dampAngle(char.yaw, targetYaw, 10, dt);
    }

    // resolve animation state
    if (char.state === STATES.CELEBRATE && char.celebrateT >= 0) return;
    if (this.sitting) char.setState(STATES.SIT);
    else if (!this.grounded) char.setState(STATES.JUMP);
    else if (hSpeed > RUN_SPEED * 0.6) char.setState(STATES.RUN);
    else if (hSpeed > 0.25) char.setState(STATES.WALK);
    else char.setState(this.rainActive ? STATES.CRY : STATES.IDLE);
  }

  updateSwim(dt) {
    const char = this.character;
    const level = this.water.level;
    this.inWater = true;
    this.sitting = false;

    const floatY = Math.max(0.15, level - 1.1);
    const manual = this.inputDir();

    let desired = new THREE.Vector3();
    if (manual) {
      desired.copy(manual).multiplyScalar(WALK_SPEED * 0.6 * (this.keys.has('shift') ? 1.4 : 1));
      this.moveTarget = null;
    } else if (this.moveTarget) {
      const to = new THREE.Vector3().subVectors(this.moveTarget, this.pos);
      to.y = 0;
      if (to.length() < 0.5) {
        this.moveTarget = null;
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
      } else {
        desired.copy(to.normalize()).multiplyScalar(WALK_SPEED * 0.6);
      }
    }

    this.vel.x = damp(this.vel.x, desired.x, 6, dt);
    this.vel.z = damp(this.vel.z, desired.z, 6, dt);

    // vertical: Space dives, Shift ascends, otherwise buoyancy pulls to surface
    let targetVy;
    if (this.keys.has(' ')) targetVy = -3;
    else if (this.keys.has('shift')) targetVy = 3;
    else targetVy = clamp((floatY - this.pos.y) * 2.5, -2, 2);
    this.vel.y = damp(this.vel.y, targetVy, 5, dt);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    this.pos.y += this.vel.y * dt;

    this.pos.y = clamp(this.pos.y, 0.1, Math.max(0.1, level - 0.8));
    this.pos.x = clamp(this.pos.x, -BOUND_X, BOUND_X);
    this.pos.z = clamp(this.pos.z, -BOUND_Z, BOUND_Z);

    // horizontal block pushout still applies while low in the water
    for (const b of this.colliders) {
      if (this.pos.y > b.topY) continue;
      const inX = this.pos.x > b.minX - RADIUS && this.pos.x < b.maxX + RADIUS;
      const inZ = this.pos.z > b.minZ - RADIUS && this.pos.z < b.maxZ + RADIUS;
      if (!inX || !inZ) continue;
      const pushXPos = b.maxX + RADIUS - this.pos.x;
      const pushXNeg = this.pos.x - (b.minX - RADIUS);
      const pushZPos = b.maxZ + RADIUS - this.pos.z;
      const pushZNeg = this.pos.z - (b.minZ - RADIUS);
      const minPush = Math.min(pushXPos, pushXNeg, pushZPos, pushZNeg);
      if (minPush === pushXPos) this.pos.x = b.maxX + RADIUS;
      else if (minPush === pushXNeg) this.pos.x = b.minX - RADIUS;
      else if (minPush === pushZPos) this.pos.z = b.maxZ + RADIUS;
      else this.pos.z = b.minZ - RADIUS;
    }

    this.submerged = this.pos.y + 1.6 < level;

    const hSpeed = Math.hypot(this.vel.x, this.vel.z);
    char.moveSpeed = hSpeed;
    if (hSpeed > 0.3) {
      char.yaw = dampAngle(char.yaw, Math.atan2(this.vel.x, this.vel.z), 6, dt);
    }

    if (this.vel.y < -0.6) char.setState(STATES.SWIM_DIVE);
    else if (this.vel.y > 0.6 && this.submerged) char.setState(STATES.SWIM_ASCEND);
    else char.setState(STATES.SWIM_SURFACE);
  }
}
