import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { QUALITY } from './utils.js';
import { Environment } from './world/Environment.js';
import { ResumeGround } from './world/ResumeGround.js';
import { HeadingObstacles } from './world/HeadingObstacles.js';
import { Holograms } from './world/Holograms.js';
import { Footprints } from './world/Footprints.js';
import { Character } from './character/Character.js';
import { CharacterController } from './character/CharacterController.js';
import { CameraRig } from './camera/CameraRig.js';
import { ClickHandler } from './interaction/ClickHandler.js';
import { DialogueBubble } from './interaction/DialogueBubble.js';
import { GREETING } from './interaction/ResumeContent.js';
import { RainMode } from './modes/RainMode.js';
import { FloodMode } from './modes/FloodMode.js';
import { InkMode } from './modes/InkMode.js';
import { TourMode } from './modes/TourMode.js';
import { HUD } from './ui/HUD.js';
import { AudioEngine } from './audio/AudioEngine.js';

// ---------------------------------------------------------------- renderer

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, QUALITY.dpr));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.outputColorSpace = THREE.SRGBColorSpace;
app.appendChild(renderer.domElement);

const cssRenderer = new CSS2DRenderer();
cssRenderer.setSize(window.innerWidth, window.innerHeight);
cssRenderer.domElement.id = 'css-renderer';
app.appendChild(cssRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 600);
camera.position.set(0, 18, 6);

const clock = new THREE.Clock();

// ---------------------------------------------------------------- world

const env = new Environment(scene);
const ground = new ResumeGround(scene, renderer);
const obstacles = new HeadingObstacles(scene);
const character = new Character(scene);
const rig = new CameraRig(camera, character, renderer.domElement);
const audio = new AudioEngine();
const holograms = new Holograms(scene);

const hud = new HUD({
  onRain: () => toggleMode('rain'),
  onFlood: () => toggleMode('flood'),
  onInk: () => toggleMode('ink'),
  onTour: () => tour.toggle(),
  onCamera: () => hud.setCameraLabel(rig.toggle()),
  onJump: () => { controller.jumpQueued = true; },
  onSound: () => hud.setSoundLabel(audio.toggleMute()),
});

const controller = new CharacterController(character, obstacles.colliders, rig, hud, audio);
const bubble = new DialogueBubble(character);
bubble.onHide = () => holograms.hide();
const footprints = new Footprints(scene, character, controller);

// ---------------------------------------------------------------- post fx

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

if (QUALITY.outline) {
  const outlinePass = new OutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera, [character.meshRoot]
  );
  outlinePass.edgeStrength = 1.6;
  outlinePass.edgeThickness = 1;
  outlinePass.visibleEdgeColor.set('#dfe4ff');
  outlinePass.hiddenEdgeColor.set('#223');
  composer.addPass(outlinePass);
}

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), 0.35, 0.4, 0.85
);
composer.addPass(bloomPass);

const underwaterPass = new ShaderPass({
  uniforms: { tDiffuse: { value: null }, uAmount: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uAmount;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      uv.x += sin(vUv.y * 32.0) * 0.0025 * uAmount;
      vec4 c = texture2D(tDiffuse, uv);
      c.rgb *= mix(vec3(1.0), vec3(0.45, 0.72, 1.0), uAmount);
      gl_FragColor = c;
    }
  `,
});
composer.addPass(underwaterPass);
composer.addPass(new OutputPass());

// ---------------------------------------------------------------- modes

const rain = new RainMode(scene, env, ground, character, controller, hud, audio);
const flood = new FloodMode(scene, character, controller, ground, hud, underwaterPass.uniforms.uAmount, camera, audio);
const ink = new InkMode(scene, env, ground, controller, character, hud, audio);

const MODES = { rain, flood, ink };

// chaos modes are mutually exclusive — switching one on retires the others
function toggleMode(name) {
  const target = MODES[name];
  if (target.active) {
    target.deactivate();
    return;
  }
  for (const [key, mode] of Object.entries(MODES)) {
    if (key !== name && mode.active) mode.deactivate();
  }
  target.activate();
}

const clicks = new ClickHandler(
  camera, renderer.domElement, scene, controller, character, bubble, obstacles.colliders,
  (section) => (controller.inWater && controller.submerged)
    ? `Shrivatsa dives down to ${section.label}... `
    : ''
);
clicks.holograms = holograms;

const tour = new TourMode(controller, character, rig, bubble, clicks, hud, audio, {
  deactivateModes: () => { for (const m of Object.values(MODES)) if (m.active) m.deactivate(); },
  inkOn: () => { if (!ink.active) toggleMode('ink'); },
  inkOff: () => { if (ink.active) ink.deactivate(); },
});

// any real input hands control back from the tour
const cancelTour = () => { if (tour.active) tour.stop(); };
renderer.domElement.addEventListener('pointerdown', cancelTour);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) cancelTour();
  if (k === 'r') { cancelTour(); toggleMode('rain'); }
  if (k === 'f') { cancelTour(); toggleMode('flood'); }
  if (k === 'c') { cancelTour(); toggleMode('ink'); }
  if (k === 'p') tour.toggle();
  if (k === 't') hud.setCameraLabel(rig.toggle());
  if (k === 'escape') { cancelTour(); bubble.hide(); }
});

// ---------------------------------------------------------------- opening

const firstVisit = !localStorage.getItem('rw-hasVisited');
localStorage.setItem('rw-hasVisited', 'true');

character.root.position.set(2, firstVisit ? 8 : 2, -13);

const loader = document.getElementById('loader');
const enterBtn = document.getElementById('enter-btn');
let revealQueued = false;
let entered = false;

function enterWorld() {
  if (entered) return;
  entered = true;
  audio.unlock();
  audio.startMusic();
  loader.classList.add('done');
  // cinematic swoop down from high above, every visit
  rig.pitch = 1.45;
  rig.dist = 52;
  if (firstVisit) {
    setTimeout(() => { if (!tour.active) bubble.show(GREETING, null, false, 4500); }, 3200);
  }
}
enterBtn.addEventListener('click', enterWorld);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && loader.classList.contains('ready')) enterWorld();
});

// ---------------------------------------------------------------- loop

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  controller.update(dt);
  character.update(dt);
  rig.update(dt);
  ground.update(dt);
  env.update(dt);
  rain.update(dt);
  flood.update(dt);
  ink.update(dt);
  holograms.update(dt);
  footprints.update(dt);

  composer.render();
  cssRenderer.render(scene, camera);

  // First frame drawn: show the ENTER button (also unlocks the failsafe path).
  if (!revealQueued) {
    revealQueued = true;
    setTimeout(() => loader.classList.add('ready'), 300);
  }
}
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// debug handle (used by tests; harmless in production)
window.__RW = { scene, camera, character, controller, rig, rain, flood, ink, tour, bubble, clicks, ground, env, holograms, audio, enterWorld };
