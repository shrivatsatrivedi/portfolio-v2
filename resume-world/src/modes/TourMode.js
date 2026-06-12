import * as THREE from 'three';
import { RESUME_SECTIONS } from '../interaction/ResumeContent.js';

// Sit-back cinematic mode: the character runs from section to section,
// narrating each one while the camera circles to a fresh angle. Ends with
// a celebration and a burst of the ink galaxy. Any input cancels it.

const TOUR_ORDER = [
  'header', 'contact', 'education', 'experience-glance', 'awards',
  'project-emotion', 'project-focus', 'project-mern', 'certifications', 'skills',
];

export class TourMode {
  constructor(controller, character, rig, bubble, clicks, hud, audio, hooks) {
    this.controller = controller;
    this.character = character;
    this.rig = rig;
    this.bubble = bubble;
    this.clicks = clicks;
    this.hud = hud;
    this.audio = audio;
    this.hooks = hooks; // { deactivateModes(), inkOn(), inkOff() }

    this.active = false;
    this.timers = [];
    this.step = 0;
  }

  toggle() { this.active ? this.stop() : this.start(); }

  later(fn, ms) {
    this.timers.push(setTimeout(fn, ms));
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  start() {
    if (this.active) return;
    this.active = true;
    this.hooks.deactivateModes();
    this.hud.setModeActive('tour', true);
    this.audio.setMood('tour');
    this.bubble.hide();
    this.step = 0;
    this.nextStep();
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.clearTimers();
    this.hud.setModeActive('tour', false);
    this.audio.setMood('calm');
    this.bubble.hide();
    this.controller.moveTarget = null;
    this.hooks.inkOff();
  }

  nextStep() {
    if (!this.active) return;
    if (this.step >= TOUR_ORDER.length) return this.finale();

    const id = TOUR_ORDER[this.step];
    const section = RESUME_SECTIONS.find((s) => s.id === id);
    this.step++;
    if (!section) return this.nextStep();

    const b = section.worldBox;
    const target = new THREE.Vector3(b.x + b.width / 2, 0, b.z + b.depth * 0.7);

    // a fresh camera angle for every stop
    const i = this.step;
    this.rig.yawT += i % 2 === 0 ? 0.85 : -0.85;
    this.rig.pitchT = i % 3 === 0 ? 0.55 : 0.33;
    this.rig.distT = i % 2 === 0 ? 9 : 6.8;

    let advanced = false;
    const advance = (delay) => {
      if (advanced || !this.active) return;
      advanced = true;
      this.later(() => this.nextStep(), delay);
    };

    this.controller.setMoveTarget(target, () => {
      if (!this.active) return;
      this.clicks.present(section);
      const readMs = section.dialogue.replace(/\s+/g, ' ').length * 24 + 2800;
      advance(readMs);
    });
    // safety: never stall the tour if the walk gets stuck
    this.later(() => advance(1000), 15000);
  }

  finale() {
    // pull wide, celebrate, and light the galaxy
    this.rig.pitchT = 1.15;
    this.rig.distT = 27;
    this.bubble.show(
      `And that's Shrivatsa. The rest is up to you — shrivatsatrivedi@gmail.com. No pressure, but the ink is literally writing itself into the stars for you.`,
      { text: 'Email Him', url: 'mailto:shrivatsatrivedi@gmail.com' },
      false
    );
    this.character.celebrate();
    this.later(() => { if (this.active) this.hooks.inkOn(); }, 1500);
    this.later(() => {
      if (!this.active) return;
      this.active = false;
      this.hud.setModeActive('tour', false);
      this.audio.setMood('space');
    }, 4000);
  }
}
