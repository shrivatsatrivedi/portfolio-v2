// HTML overlay: chaos-mode buttons, camera toggle, controls legend,
// breath bar, low-air vignette, and touch controls on mobile.

export class HUD {
  constructor({ onRain, onFlood, onCamera, onJump }) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="hud-modes">
        <button id="btn-rain" class="hud-btn" title="Rain Mode (R)">🌧 Chaos: Rain</button>
        <button id="btn-flood" class="hud-btn" title="Flood Mode (F)">🌊 Chaos: Flood</button>
      </div>
      <button id="btn-camera" class="hud-btn" title="Toggle Camera (T)">📷 Top View</button>
      <details id="controls-legend" open>
        <summary>Controls</summary>
        <p>WASD / ↑↓←→ — Move</p>
        <p>Shift — Run · Space — Jump</p>
        <p>E — Sit (on heading blocks)</p>
        <p>Click — Walk to section</p>
        <p>Double-click — Learn about it</p>
        <p>T — Toggle camera · Pinch — Tilt</p>
        <p>Scroll — Pan around the page</p>
        <p>R — Rain mode · F — Flood mode</p>
        <p class="click-hint">In water: Space dives, Shift surfaces</p>
      </details>
      <div id="breath-bar"><label>Air</label><div id="breath-fill"></div></div>
      <div id="vignette"></div>
      <div id="joystick"><div class="nub"></div></div>
      <button id="btn-jump" class="hud-btn" title="Jump">⤒</button>
    `);

    this.btnRain = document.getElementById('btn-rain');
    this.btnFlood = document.getElementById('btn-flood');
    this.btnCamera = document.getElementById('btn-camera');
    this.breathBar = document.getElementById('breath-bar');
    this.breathFill = document.getElementById('breath-fill');
    this.vignette = document.getElementById('vignette');

    this.btnRain.addEventListener('click', onRain);
    this.btnFlood.addEventListener('click', onFlood);
    this.btnCamera.addEventListener('click', onCamera);
    document.getElementById('btn-jump').addEventListener('pointerdown', onJump);

    // ---- touch joystick ----
    this.joy = { x: 0, z: 0, mag: 0, active: false };
    if (window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768) {
      document.body.classList.add('touch');
      const zone = document.getElementById('joystick');
      const nub = zone.querySelector('.nub');
      const radius = 50;
      let pid = null;

      const setNub = (dx, dy) => {
        nub.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      };
      zone.addEventListener('pointerdown', (e) => {
        pid = e.pointerId;
        zone.setPointerCapture(pid);
        this.joy.active = true;
      });
      zone.addEventListener('pointermove', (e) => {
        if (e.pointerId !== pid) return;
        const r = zone.getBoundingClientRect();
        let dx = e.clientX - (r.left + r.width / 2);
        let dy = e.clientY - (r.top + r.height / 2);
        const len = Math.hypot(dx, dy);
        if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius; }
        setNub(dx, dy);
        this.joy.x = dx / radius;
        this.joy.z = dy / radius;
        this.joy.mag = Math.min(1, len / radius);
      });
      const release = (e) => {
        if (e.pointerId !== pid) return;
        pid = null;
        this.joy.active = false;
        this.joy.x = this.joy.z = this.joy.mag = 0;
        setNub(0, 0);
      };
      zone.addEventListener('pointerup', release);
      zone.addEventListener('pointercancel', release);
    }
  }

  setModeActive(mode, active) {
    const btn = mode === 'rain' ? this.btnRain : this.btnFlood;
    btn.classList.toggle('active', active);
  }

  setCameraLabel(topDown) {
    this.btnCamera.textContent = topDown ? '📷 Top View' : '📷 Third Person';
  }

  showBreath(show) {
    this.breathBar.style.display = show ? 'block' : 'none';
  }

  setBreath(p) {
    this.breathFill.style.width = `${Math.round(p * 100)}%`;
  }

  setVignette(opacity) {
    this.vignette.style.opacity = opacity;
  }
}
