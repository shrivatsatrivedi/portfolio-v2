import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { getCircleTexture, QUALITY } from '../utils.js';

// Rich dusk environment: brighter neutral key light so the paper reads
// WHITE, a starfield, a glowing "ink ocean" floor with a fading grid,
// drifting paper sheets and dust motes — no more empty black void.

export class Environment {
  constructor(scene) {
    scene.fog = new THREE.Fog(0x0b0c16, 55, 160);
    this.t = 0;

    // ---- sky: visible dusk gradient instead of near-black ----
    this.sky = new Sky();
    this.sky.scale.setScalar(2000);
    scene.add(this.sky);
    const u = this.sky.material.uniforms;
    u.turbidity.value = 2.0;
    u.rayleigh.value = 1.4;
    u.mieCoefficient.value = 0.004;
    u.mieDirectionalG.value = 0.85;
    this.sunPosition = new THREE.Vector3().setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - 9),
      THREE.MathUtils.degToRad(180)
    );
    u.sunPosition.value.copy(this.sunPosition);

    // ---- lighting: neutral white key so the paper isn't golden ----
    this.ambient = new THREE.AmbientLight(0xbac0d8, 1.0);
    scene.add(this.ambient);

    this.hemi = new THREE.HemisphereLight(0x9aa4cc, 0x1c1c28, 0.7);
    scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xfff6ee, 2.3);
    this.sun.position.set(14, 24, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 90;
    this.sun.shadow.camera.left = -26;
    this.sun.shadow.camera.right = 26;
    this.sun.shadow.camera.top = 26;
    this.sun.shadow.camera.bottom = -26;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun);

    this.bounce = new THREE.PointLight(0x6366f1, 10, 45, 1.9);
    this.bounce.position.set(0, 6, 0);
    scene.add(this.bounce);

    // ---- ink ocean floor: dark plane with glowing grid fading out ----
    this.oceanUniforms = { uTime: { value: 0 } };
    const ocean = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.ShaderMaterial({
        uniforms: this.oceanUniforms,
        vertexShader: /* glsl */ `
          varying vec3 vPos;
          void main() {
            vPos = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          varying vec3 vPos;
          void main() {
            float r = length(vPos.xz);
            vec3 base = vec3(0.020, 0.021, 0.042);
            // grid lines every 4 units, fading with distance
            vec2 g2 = abs(fract(vPos.xz / 4.0 + 0.5) - 0.5) / fwidth(vPos.xz / 4.0);
            float grid = 1.0 - min(min(g2.x, g2.y), 1.0);
            float fade = exp(-r / 42.0);
            // soft indigo halo under the page
            float halo = exp(-r / 26.0);
            // slow ink shimmer
            float shimmer = 0.5 + 0.5 * sin(vPos.x * 0.08 + uTime * 0.4) * sin(vPos.z * 0.07 - uTime * 0.3);
            vec3 col = base
              + vec3(0.22, 0.23, 0.55) * grid * fade * 0.18
              + vec3(0.16, 0.17, 0.45) * halo * (0.10 + shimmer * 0.05);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      })
    );
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -0.18;
    scene.add(ocean);

    // ---- glow plane right under the paper (floating island feel) ----
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = glowCanvas.height = 256;
    const gctx = glowCanvas.getContext('2d');
    const grad = gctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    grad.addColorStop(0, 'rgba(120,125,255,0.22)');
    grad.addColorStop(0.6, 'rgba(99,102,241,0.07)');
    grad.addColorStop(1, 'rgba(99,102,241,0)');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 256, 256);
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 86),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = -0.12;
    scene.add(glow);

    // ---- starfield ----
    const starCount = QUALITY.stars;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 160 + Math.random() * 220;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.15 + Math.random() * 0.85); // upper dome
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi) + 5;
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    this.stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
      color: 0xcdd5ff, size: 1.1, sizeAttenuation: true,
      map: getCircleTexture(), transparent: true, opacity: 0.85, depthWrite: false,
    }));
    scene.add(this.stars);

    // ---- drifting paper sheets in the distance ----
    this.sheets = [];
    const sheetMat = new THREE.MeshStandardMaterial({
      color: 0xe8e9f2, roughness: 0.9, transparent: true, opacity: 0.5,
      side: THREE.DoubleSide, emissive: 0x33345a, emissiveIntensity: 0.25,
    });
    for (let i = 0; i < 7; i++) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.6), sheetMat);
      const ang = (i / 7) * Math.PI * 2 + Math.random();
      const rad = 32 + Math.random() * 26;
      sheet.position.set(Math.cos(ang) * rad, 3 + Math.random() * 9, Math.sin(ang) * rad);
      sheet.rotation.set(Math.random() * 0.8, Math.random() * Math.PI, Math.random() * 0.5);
      sheet.userData = { baseY: sheet.position.y, ph: Math.random() * Math.PI * 2, spin: 0.05 + Math.random() * 0.1 };
      scene.add(sheet);
      this.sheets.push(sheet);
    }

    // ---- dust motes near the page ----
    const moteCount = QUALITY.motes;
    this.motePos = new Float32Array(moteCount * 3);
    for (let i = 0; i < moteCount; i++) {
      this.motePos[i * 3] = (Math.random() - 0.5) * 44;
      this.motePos[i * 3 + 1] = Math.random() * 14;
      this.motePos[i * 3 + 2] = (Math.random() - 0.5) * 56;
    }
    const moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(this.motePos, 3));
    this.motes = new THREE.Points(moteGeo, new THREE.PointsMaterial({
      color: 0xaab2e0, size: 0.07, map: getCircleTexture(),
      transparent: true, opacity: 0.45, depthWrite: false,
    }));
    scene.add(this.motes);

    this.buildDeskProps(scene);

    // chaos modes restore from these
    this.defaults = {
      turbidity: 2.0,
      rayleigh: 1.4,
      ambientColor: this.ambient.color.clone(),
      ambientIntensity: this.ambient.intensity,
      hemiIntensity: this.hemi.intensity,
      sunIntensity: this.sun.intensity,
      sunColor: this.sun.color.clone(),
    };
  }

  // You are ant-sized on a desk at midnight: a colossal pen, a paperclip,
  // a coffee mug steaming on the horizon, the ring stain it left behind.
  buildDeskProps(scene) {
    const dark = (c, r = 0.4) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.3 });

    // ---- giant pen, lying on the desk ----
    const pen = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 26, 10), dark(0x2c2c54, 0.35));
    body.rotation.z = Math.PI / 2;
    pen.add(body);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 5, 10), dark(0x4a90d9, 0.5));
    grip.rotation.z = Math.PI / 2;
    grip.position.x = -11;
    pen.add(grip);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(1.1, 4.5, 10), dark(0xb8b8c8, 0.25));
    tip.rotation.z = Math.PI / 2;
    tip.position.x = -17.2;
    pen.add(tip);
    const nib = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.6, 8), dark(0x15151f, 0.2));
    nib.rotation.z = Math.PI / 2;
    nib.position.x = -20;
    pen.add(nib);
    const clip = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 1), dark(0xb8b8c8, 0.25));
    clip.position.set(8, 1.35, 0);
    pen.add(clip);
    pen.position.set(34, 0.95, -16);
    pen.rotation.y = 0.5;
    scene.add(pen);

    // ---- paperclip: a tube bent into the classic loop ----
    const u = 2.2; // clip scale unit
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.5 * u, 0, -3 * u), new THREE.Vector3(-1.5 * u, 0, 2.4 * u),
      new THREE.Vector3(0, 0, 3 * u), new THREE.Vector3(1.5 * u, 0, 2.4 * u),
      new THREE.Vector3(1.5 * u, 0, -2 * u), new THREE.Vector3(0.4 * u, 0, -2.6 * u),
      new THREE.Vector3(-0.7 * u, 0, -2 * u), new THREE.Vector3(-0.7 * u, 0, 1.4 * u),
      new THREE.Vector3(0.2 * u, 0, 1.9 * u), new THREE.Vector3(0.8 * u, 0, 1.4 * u),
      new THREE.Vector3(0.8 * u, 0, -1 * u),
    ], false, 'catmullrom', 0.1);
    const clipMesh = new THREE.Mesh(
      new THREE.TubeGeometry(path, 90, 0.32, 6, false),
      new THREE.MeshStandardMaterial({ color: 0xcdd2e0, roughness: 0.25, metalness: 0.85 })
    );
    clipMesh.position.set(-32, 0.34, 16);
    clipMesh.rotation.y = -0.7;
    scene.add(clipMesh);

    // ---- coffee ring stain + the mug that made it ----
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(6.2, 7.6, 48),
      new THREE.MeshBasicMaterial({ color: 0x4a3424, transparent: true, opacity: 0.22, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(-26, -0.165, -28);
    scene.add(ring);

    const mug = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(7, 6.4, 12, 18, 1, true),
      new THREE.MeshStandardMaterial({ color: 0x35355e, roughness: 0.6, side: THREE.DoubleSide }));
    cup.position.y = 6;
    mug.add(cup);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(6.6, 18),
      new THREE.MeshStandardMaterial({ color: 0x241710, roughness: 0.3 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 11.2;
    mug.add(coffee);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.9, 8, 18, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0x35355e, roughness: 0.6 }));
    handle.position.set(7.4, 6, 0);
    handle.rotation.z = -Math.PI / 2;
    mug.add(handle);
    mug.position.set(-52, -0.15, -44);
    scene.add(mug);

    // steam rising from the mug
    const steamCount = 40;
    this.steamPos = new Float32Array(steamCount * 3);
    for (let i = 0; i < steamCount; i++) this.resetSteam(i, true);
    const sGeo = new THREE.BufferGeometry();
    sGeo.setAttribute('position', new THREE.BufferAttribute(this.steamPos, 3));
    this.steam = new THREE.Points(sGeo, new THREE.PointsMaterial({
      color: 0xd8dcf0, size: 1.6, map: getCircleTexture(),
      transparent: true, opacity: 0.16, depthWrite: false,
    }));
    scene.add(this.steam);

    // a sticky note, because someone should really call him
    const note = document.createElement('canvas');
    note.width = note.height = 128;
    const nctx = note.getContext('2d');
    nctx.fillStyle = '#8e93f5';
    nctx.fillRect(0, 0, 128, 128);
    nctx.fillStyle = 'rgba(20,20,40,0.75)';
    nctx.font = 'bold 26px cursive';
    nctx.fillText('HIRE', 28, 56);
    nctx.fillText('HIM ✓', 26, 92);
    const sticky = new THREE.Mesh(
      new THREE.PlaneGeometry(9, 9),
      new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(note), roughness: 0.95 })
    );
    sticky.rotation.set(-Math.PI / 2, 0, 0.6);
    sticky.position.set(27, -0.16, 25);
    scene.add(sticky);
  }

  resetSteam(i, randomize = false) {
    this.steamPos[i * 3] = -52 + (Math.random() - 0.5) * 5;
    this.steamPos[i * 3 + 1] = 11 + (randomize ? Math.random() * 14 : 0);
    this.steamPos[i * 3 + 2] = -44 + (Math.random() - 0.5) * 5;
  }

  update(dt) {
    this.t += dt;
    this.oceanUniforms.uTime.value = this.t;
    this.stars.rotation.y += dt * 0.004;

    // steam drifts up and dissipates
    for (let i = 0; i < this.steamPos.length / 3; i++) {
      this.steamPos[i * 3 + 1] += dt * (1.1 + (i % 4) * 0.2);
      this.steamPos[i * 3] += Math.sin(this.t * 0.7 + i) * dt * 0.6;
      if (this.steamPos[i * 3 + 1] > 26) this.resetSteam(i);
    }
    this.steam.geometry.attributes.position.needsUpdate = true;

    for (const s of this.sheets) {
      s.position.y = s.userData.baseY + Math.sin(this.t * 0.4 + s.userData.ph) * 0.8;
      s.rotation.y += dt * s.userData.spin;
      s.rotation.z = Math.sin(this.t * 0.3 + s.userData.ph) * 0.18;
    }

    // motes drift up slowly and wrap
    for (let i = 0; i < this.motePos.length; i += 3) {
      this.motePos[i + 1] += dt * (0.12 + ((i / 3) % 5) * 0.025);
      if (this.motePos[i + 1] > 14) this.motePos[i + 1] = 0;
    }
    this.motes.geometry.attributes.position.needsUpdate = true;
  }
}
