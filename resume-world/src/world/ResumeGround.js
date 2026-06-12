import * as THREE from 'three';
import { PAGE, HEADINGS } from '../interaction/ResumeContent.js';

// The résumé is painted onto a canvas at A4 proportions and used as the
// ground texture. All positions are derived from the same world coordinates
// used by the clickable sections so paper and metadata stay aligned.

const W = 2048;
const H = Math.round((PAGE.depth / PAGE.width) * W); // 2867

const INK = '#1c1c2e';
const FAINT = '#3a3a52';

const NOISE_GLSL = /* glsl */ `
uniform float uDissolve;
uniform float uTime;
uniform float uWarp;
float rwHash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
float rwNoise(vec2 p){
  vec2 i = floor(p); vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = rwHash(i), b = rwHash(i + vec2(1.0, 0.0));
  float c = rwHash(i + vec2(0.0, 1.0)), d = rwHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float rwFbm(vec2 p){
  float v = 0.0; float amp = 0.5;
  for (int i = 0; i < 4; i++){ v += amp * rwNoise(p); p *= 2.07; amp *= 0.5; }
  return v;
}
`;

const MAP_FRAGMENT = /* glsl */ `
#ifdef USE_MAP
  vec2 rwUv = vMapUv;
  rwUv += uWarp * 0.0045 * vec2(
    sin(rwUv.y * 60.0 + uTime * 2.2),
    cos(rwUv.x * 52.0 + uTime * 1.7)
  );
  vec4 sampledDiffuseColor = texture2D( map, rwUv );
  if (uDissolve > 0.001) {
    float streak = rwFbm(vec2(rwUv.x * 42.0, rwUv.y * 6.0 - uDissolve * 3.0));
    float n = rwFbm(rwUv * 7.0) + streak * 0.15;
    float prog = uDissolve * 1.3;
    // 1 where the ink has fully washed away
    float washed = 1.0 - smoothstep(prog - 0.3, prog, n);
    // ink bleed band just ahead of the wash front
    float band = smoothstep(prog - 0.55, prog - 0.28, n) * (1.0 - smoothstep(prog - 0.28, prog + 0.02, n));
    vec3 ink = vec3(0.08, 0.10, 0.42);
    vec3 wetPaper = vec3(0.82, 0.80, 0.74) * (0.92 + streak * 0.08);
    vec3 col = mix(sampledDiffuseColor.rgb, ink, band * 0.85);
    col = mix(col, wetPaper, washed);
    sampledDiffuseColor.rgb = col;
  }
  diffuseColor *= sampledDiffuseColor;
#endif
`;

export class ResumeGround {
  constructor(scene, renderer) {
    this.uniforms = {
      uDissolve: { value: 0 },
      uTime: { value: 0 },
      uWarp: { value: 0 },
    };

    const texture = new THREE.CanvasTexture(this.paint());
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());

    const material = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.0,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\n' + NOISE_GLSL)
        .replace('#include <map_fragment>', MAP_FRAGMENT);
    };

    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PAGE.width, PAGE.depth), material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = 0.002;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Paper thickness slab beneath the printed surface.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(PAGE.width, 0.12, PAGE.depth),
      new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.92 })
    );
    slab.position.y = -0.062;
    slab.receiveShadow = true;
    scene.add(slab);

    // Subtle edge highlight.
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(PAGE.width, PAGE.depth)),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 })
    );
    edges.rotation.x = -Math.PI / 2;
    edges.position.y = 0.01;
    scene.add(edges);
  }

  update(dt) {
    this.uniforms.uTime.value += dt;
  }

  // ---------------------------------------------------------------- painting

  paint() {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // world coords -> pixels
    const X = (x) => ((x + PAGE.width / 2) / PAGE.width) * W;
    const Z = (z) => ((z + PAGE.depth / 2) / PAGE.depth) * H;
    const S = (units) => (units / PAGE.width) * W; // size in px

    // paper
    ctx.fillStyle = '#f7f3ea';
    ctx.fillRect(0, 0, W, H);
    // grain
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(120,110,90,0.025)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random() * 3, 2 + Math.random() * 3);
    }

    const L = X(-13.8); // left margin
    const R = X(13.8);  // right margin
    const serif = 'Georgia, "Times New Roman", serif';

    const text = (str, x, zUnits, font, color = INK, align = 'left') => {
      ctx.font = font;
      ctx.fillStyle = color;
      ctx.textAlign = align;
      ctx.fillText(str, x, Z(zUnits));
    };

    const row = (left, right, zUnits, fontL, fontR) => {
      text(left, L, zUnits, fontL);
      text(right, R, zUnits, fontR || fontL, FAINT, 'right');
    };

    const bullet = (str, zUnits, indent = 0.6) => {
      ctx.font = `33px ${serif}`;
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText('•', L + S(indent) - S(0.45), Z(zUnits));
      ctx.fillText(str, L + S(indent), Z(zUnits));
    };

    const heading = (label, zUnits) => {
      ctx.font = `bold 54px ${serif}`;
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.fillText(label, L, Z(zUnits + 0.3));
      ctx.fillRect(L, Z(zUnits + 0.62), R - L, 4);
    };

    // ----- header -----
    text('Shrivatsa Atman Trivedi', W / 2, -18.55, `bold 138px ${serif}`, INK, 'center');
    text(
      '7045103001  |  shrivatsatrivedi@gmail.com  |  linkedin.com/in/shrivatsa  |  github.com/shrivatsatrivedi',
      W / 2, -17.25, `36px ${serif}`, FAINT, 'center'
    );

    // ----- headings (blocks sit on these rows) -----
    for (const h of HEADINGS) heading(h.label, h.z);

    // ----- education -----
    row('Manipal University Jaipur', 'Jaipur, Rajasthan', -15.05, `bold 40px ${serif}`, `38px ${serif}`);
    row('Bachelor of Technology', 'Sept 2022 – June 2026', -14.4, `italic 34px ${serif}`, `italic 34px ${serif}`);
    row('Jai Hind College', 'Mumbai, Maharashtra', -13.55, `bold 40px ${serif}`, `38px ${serif}`);
    row('Higher Secondary Certificate', 'Aug 2020 – May 2022', -12.9, `italic 34px ${serif}`, `italic 34px ${serif}`);
    row('Campion School', 'Mumbai, Maharashtra', -12.05, `bold 40px ${serif}`, `38px ${serif}`);
    row('Indian Certificate of Secondary Education', 'Aug 2018 – June 2020', -11.4, `italic 34px ${serif}`, `italic 34px ${serif}`);

    // ----- work experience -----
    row('Glance (InMobi Group)', 'Bengaluru, Karnataka', -9.45, `bold 40px ${serif}`, `38px ${serif}`);
    row('Software Engineer Intern, Android', 'May 2025 – July 2025', -8.8, `italic 34px ${serif}`, `italic 34px ${serif}`);
    bullet('Engineered a multi-faceted login system handling country-wise and age-based compliance', -8.05);
    bullet('logic — now live on Android and iOS.', -7.5);
    bullet('Collaborated with backend, product, and QA teams for on-time feature delivery.', -6.85);
    bullet('Improved app stability by debugging edge cases in a large-scale production codebase.', -6.2);

    // ----- awards -----
    row("Dean's List", '', -4.05, `bold 40px ${serif}`);
    bullet("Dean's Excellence Award for the highest band GPA in the Department of", -3.4);
    bullet('Computer & Communication Engineering.', -2.85);

    // ----- projects -----
    row('Emotion-Aware Conversational AI  |  Python, OpenAI API, DeepFace, Streamlit', 'August 2025', -0.35, `bold 38px ${serif}`, `italic 34px ${serif}`);
    bullet('DeepFace detects real-time facial emotions from live video input.', 0.35);
    bullet('OpenAI GPT models generate context-aware, empathetic responses.', 1.0);
    bullet('Interactive Streamlit app with live camera feed and chat.', 1.65);

    row('FocusCycle Pomodoro  |  Next.js, TypeScript, MediaPipe, Vercel KV', 'Live', 3.55, `bold 38px ${serif}`, `italic 34px ${serif}`);
    bullet('Accountability-buddy productivity app: face detection + tab-switch monitoring.', 4.25);
    bullet('Passwordless email-link auth with JWT and real-time exit approvals via Vercel KV.', 4.9);
    bullet('MediaPipe BlazeFace + Visibility API auto-pause sessions on violations.', 5.55);
    bullet('Full-stack Next.js on Vercel — server-side API routes, email, session state.', 6.2);

    row('MERN Blog Application  |  MongoDB, Express.js, React.js, Node.js', 'November 2024', 8.0, `bold 38px ${serif}`, `italic 34px ${serif}`);
    bullet('Full-stack blog with JWT-based authentication and authorization.', 8.7);
    bullet('Responsive React front end; RESTful APIs in Node.js and Express.js.', 9.35);
    bullet('MongoDB for efficient data storage and CRUD operations.', 10.0);

    // ----- certifications -----
    row('Foundations of Data Science', 'Google (Coursera, Oct 2024)', 12.85, `bold 40px ${serif}`, `italic 36px ${serif}`);
    row('Introduction to Software Engineering', 'IBM (Coursera, Oct 2024)', 13.7, `bold 40px ${serif}`, `italic 36px ${serif}`);

    // ----- skills -----
    row('Languages', 'Java, Python, C/C++, JavaScript, HTML/CSS', 16.5, `bold 40px ${serif}`, `38px ${serif}`);
    row('Frameworks', 'React, Express.js, Node.js', 17.4, `bold 40px ${serif}`, `38px ${serif}`);
    row('Databases', 'MongoDB', 18.3, `bold 40px ${serif}`, `38px ${serif}`);

    text('— an interactive résumé world · built with three.js —', W / 2, 20.2, `italic 30px ${serif}`, '#9a937f', 'center');

    return canvas;
  }
}
