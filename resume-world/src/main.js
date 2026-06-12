import * as THREE from 'three';
import { gsap } from 'gsap';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Environment } from './world/Environment.js';
import { ResumeGround } from './world/ResumeGround.js';
import { HeadingObstacles } from './world/HeadingObstacles.js';
import { Character } from './character/Character.js';
import { CharacterController } from './character/CharacterController.js';
import { CameraRig } from './camera/CameraRig.js';
import { ClickHandler } from './interaction/ClickHandler.js';
import { DialogueBubble } from './interaction/DialogueBubble.js';
import { GREETING } from './interaction/ResumeContent.js';
import { RainMode } from './modes/RainMode.js';
import { FloodMode } from './modes/FloodMode.js';
import { HUD } from './ui/HUD.js';

// ---------------------------------------------------------------- renderer

const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
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

const hud = new HUD({
  onRain: () => rain.toggle(),
  onFlood: () => flood.toggle(),
  onCamera: () => hud.setCameraLabel(rig.toggle() < 0.5),
  onJump: () => { controller.jumpQueued = true; },
});

const controller = new CharacterController(character, obstacles.colliders, rig, hud);
const bubble = new DialogueBubble(character);

// ---------------------------------------------------------------- post fx

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight), scene, camera, [character.meshRoot]
);
outlinePass.edgeStrength = 3;
outlinePass.edgeThickness = 2;
outlinePass.visibleEdgeColor.set('#ffffff');
outlinePass.hiddenEdgeColor.set('#223');
composer.addPass(outlinePass);

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

const rain = new RainMode(scene, env, ground, character, controller, hud);
const flood = new FloodMode(scene, character, controller, ground, hud, underwaterPass.uniforms.uAmount, camera);

const clicks = new ClickHandler(
  camera, renderer.domElement, scene, controller, character, bubble, obstacles.colliders,
  (section) => (controller.inWater && controller.submerged)
    ? `Shrivatsa dives down to ${section.label}... `
    : ''
);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if (k === 'r') rain.toggle();
  if (k === 'f') flood.toggle();
  if (k === 't') hud.setCameraLabel(rig.toggle() < 0.5);
  if (k === 'escape') bubble.hide();
});

// ---------------------------------------------------------------- opening

const firstVisit = !localStorage.getItem('rw-hasVisited');
localStorage.setItem('rw-hasVisited', 'true');

character.root.position.set(2, firstVisit ? 8 : 2, -13);

const loader = document.getElementById('loader');
let revealed = false;
let revealQueued = false;
function reveal() {
  if (revealed) return;
  revealed = true;
  loader.classList.add('done');
  if (firstVisit) {
    rig.introH = 32;
    gsap.to(rig, { introH: 0, duration: 2.5, ease: 'power3.inOut' });
    setTimeout(() => bubble.show(GREETING, null, false, 4000), 3400);
  }
}

// ---------------------------------------------------------------- loop

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);

  controller.update(dt);
  character.update(dt);
  rig.update(dt);
  ground.update(dt);
  rain.update(dt);
  flood.update(dt);

  composer.render();
  cssRenderer.render(scene, camera);

  // Dismiss the loader only once a frame has actually been drawn.
  if (!revealQueued) {
    revealQueued = true;
    setTimeout(reveal, 350);
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
window.__RW = { scene, camera, character, controller, rig, rain, flood, bubble, clicks, ground };
