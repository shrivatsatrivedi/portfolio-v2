import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

// HTML speech bubble rendered in 3D space above the character's head.
// CSS2D keeps it billboarded and crisp at every camera angle.

const TYPE_MS = 24;

export class DialogueBubble {
  constructor(character) {
    this.el = document.createElement('div');
    this.el.className = 'dialogue-bubble';
    this.el.style.display = 'none';

    this.textEl = document.createElement('p');
    this.textEl.className = 'bubble-text';
    this.linkEl = document.createElement('span');
    const tail = document.createElement('div');
    tail.className = 'bubble-tail';

    this.el.appendChild(this.textEl);
    this.el.appendChild(this.linkEl);
    this.el.appendChild(tail);

    this.obj = new CSS2DObject(this.el);
    this.obj.position.set(0, 3.1, 0);
    character.root.add(this.obj);

    this.typeTimer = null;
    this.hideTimer = null;
    this.visible = false;
  }

  showSection(section, prefix = '') {
    const text = prefix + section.dialogue.replace(/\s+/g, ' ').trim();
    this.show(text, section.link, !!prefix);
  }

  show(text, link = null, underwater = false, autoHideMs = 0) {
    clearInterval(this.typeTimer);
    clearTimeout(this.hideTimer);

    this.el.style.display = 'block';
    this.el.classList.remove('hiding');
    this.el.classList.toggle('underwater', underwater);
    requestAnimationFrame(() => this.el.classList.add('visible'));
    this.visible = true;

    this.textEl.textContent = '';
    this.linkEl.innerHTML = '';

    let i = 0;
    this.typeTimer = setInterval(() => {
      i++;
      this.textEl.textContent = text.slice(0, i);
      if (i >= text.length) {
        clearInterval(this.typeTimer);
        this.typeTimer = null;
        if (link) {
          this.linkEl.innerHTML =
            `<br>— He also left a link here. Want to check it out? ` +
            `<a href="${link.url}" target="_blank" rel="noopener noreferrer">${link.text} ↗</a>`;
        }
        if (autoHideMs > 0) {
          this.hideTimer = setTimeout(() => this.hide(), autoHideMs);
        }
      }
    }, TYPE_MS);
  }

  hide() {
    if (!this.visible) return;
    this.visible = false;
    clearInterval(this.typeTimer);
    this.typeTimer = null;
    this.el.classList.remove('visible');
    this.el.classList.add('hiding');
    setTimeout(() => {
      if (!this.visible) this.el.style.display = 'none';
    }, 320);
  }
}
