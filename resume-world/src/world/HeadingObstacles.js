import * as THREE from 'three';
import { HEADINGS } from '../interaction/ResumeContent.js';

// Section headings extruded into solid navy blocks the character can
// jump over, climb on, and sit on. Tops glow like label-lit signs.

const BLOCK_HEIGHT = 1.0;
const BLOCK_DEPTH = 1.0;
const LEFT_EDGE = -13.8;

function labelTexture(label) {
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#10102a';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.font = 'bold 110px "Space Grotesk", "Arial", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = '#4a90d9';
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#cfe0ff';
  ctx.fillText(label, c.width / 2, c.height / 2 + 6);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class HeadingObstacles {
  constructor(scene) {
    this.colliders = [];

    const sideMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.3,
      metalness: 0.6,
      emissive: 0x0f0f1a,
      emissiveIntensity: 0.2,
    });

    for (const h of HEADINGS) {
      const width = h.label.length * 0.42 + 1.2;
      const tex = labelTexture(h.label);
      const labelMat = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        color: 0x222244,
        emissive: 0xaac4ff,
        emissiveIntensity: 1.1,
        roughness: 0.35,
        metalness: 0.4,
      });

      // Glowing label on the top face only — side-face UVs mirror the text.
      // [+x, -x, +y(top), -y, +z, -z]
      const mats = [sideMat, sideMat, labelMat, sideMat, sideMat, sideMat];
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, BLOCK_HEIGHT, BLOCK_DEPTH), mats);

      const cx = LEFT_EDGE + width / 2;
      const cz = h.z + 0.1;
      mesh.position.set(cx, BLOCK_HEIGHT / 2, cz);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);

      this.colliders.push({
        id: h.id,
        label: h.label,
        minX: cx - width / 2,
        maxX: cx + width / 2,
        minZ: cz - BLOCK_DEPTH / 2,
        maxZ: cz + BLOCK_DEPTH / 2,
        topY: BLOCK_HEIGHT,
        mesh,
      });
    }
  }
}
