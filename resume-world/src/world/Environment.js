import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

// Dusk sky, golden-hour sun, cool ambient, and the endless dark void
// beyond the edges of the résumé.

export class Environment {
  constructor(scene) {
    scene.fog = new THREE.Fog(0x0a0a0f, 40, 120);

    this.sky = new Sky();
    this.sky.scale.setScalar(2000);
    scene.add(this.sky);

    const u = this.sky.material.uniforms;
    u.turbidity.value = 0.5;
    u.rayleigh.value = 0.3;
    u.mieCoefficient.value = 0.003;
    u.mieDirectionalG.value = 0.9;

    this.sunPosition = new THREE.Vector3().setFromSphericalCoords(
      1,
      THREE.MathUtils.degToRad(90 - 5),   // elevation 5°
      THREE.MathUtils.degToRad(180)        // azimuth
    );
    u.sunPosition.value.copy(this.sunPosition);

    this.ambient = new THREE.AmbientLight(0x1a1a3e, 1.6);
    scene.add(this.ambient);

    this.sun = new THREE.DirectionalLight(0xffd4a0, 1.8);
    this.sun.position.set(15, 20, 10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 80;
    this.sun.shadow.camera.left = -25;
    this.sun.shadow.camera.right = 25;
    this.sun.shadow.camera.top = 25;
    this.sun.shadow.camera.bottom = -25;
    this.sun.shadow.bias = -0.0005;
    scene.add(this.sun);

    this.bounce = new THREE.PointLight(0x4466ff, 14, 40, 1.8);
    this.bounce.position.set(0, 5, 0);
    scene.add(this.bounce);

    // The void.
    const voidPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(500, 500),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0f, roughness: 1.0 })
    );
    voidPlane.rotation.x = -Math.PI / 2;
    voidPlane.position.y = -0.15;
    voidPlane.receiveShadow = true;
    scene.add(voidPlane);

    // Remember defaults so chaos modes can restore them.
    this.defaults = {
      turbidity: 0.5,
      rayleigh: 0.3,
      ambientColor: this.ambient.color.clone(),
      ambientIntensity: this.ambient.intensity,
      sunIntensity: this.sun.intensity,
      sunColor: this.sun.color.clone(),
    };
  }
}
