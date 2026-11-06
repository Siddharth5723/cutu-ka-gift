import * as THREE from 'three';
import { gsap } from 'gsap';

function createHeartGeometry() {
  const shape = new THREE.Shape();
  // Bottom tip
  shape.moveTo(0, -1.0);
  // Left curve to lobe
  shape.bezierCurveTo(-0.65, -0.6, -1.35, -0.1, -1.35, 0.4);
  shape.bezierCurveTo(-1.35, 0.85, -0.75, 1.15, -0.05, 0.65);
  // Center notch
  shape.lineTo(0, 0.58);
  // Right lobe to tip
  shape.bezierCurveTo(0.05, 0.65, 0.75, 1.15, 1.35, 0.85);
  shape.bezierCurveTo(1.35, 0.4, 0.65, -0.6, 0, -1.0);

  const extrudeSettings = {
    depth: 0.35,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.12,
    bevelThickness: 0.12,
  };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  geom.center();
  return geom;
}

function createPetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createRadialGradient(64, 85, 12, 64, 64, 55);
  grad.addColorStop(0, 'rgba(255, 160, 182, 0.95)');
  grad.addColorStop(0.55, 'rgba(255, 195, 212, 0.88)');
  grad.addColorStop(0.9, 'rgba(255, 230, 240, 0.82)');
  grad.addColorStop(1, 'rgba(255, 230, 240, 0)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(64, 16);
  ctx.bezierCurveTo(96, 26, 110, 65, 64, 114);
  ctx.bezierCurveTo(18, 65, 32, 26, 64, 16);
  ctx.fill();

  ctx.strokeStyle = 'rgba(235, 130, 155, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(64, 110);
  ctx.quadraticCurveTo(64, 70, 64, 25);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function createBokehTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  grad.addColorStop(0.35, 'rgba(255, 225, 235, 0.7)');
  grad.addColorStop(0.7, 'rgba(255, 185, 205, 0.25)');
  grad.addColorStop(1, 'rgba(255, 185, 205, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export class HeroScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth || window.innerWidth;
    this.height = container.clientHeight || window.innerHeight;
    this.aspect = this.width / this.height;

    this.clock = new THREE.Clock();
    this.animationId = null;
    this.mouseX = 0;
    this.mouseY = 0;
    this.targetCameraX = 0;
    this.targetCameraY = 0;

    this.hearts = [];
    this.petals = [];
    this.bokehParticles = null;

    this.initThree();
    this.createLights();
    this.createFloatingHearts();
    this.createPetals();
    this.createBokeh();
    this.setupMouseTracking();
    this.setupResizeListener();
    this.animate();
  }

  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.pointerEvents = 'none';

    this.camera = new THREE.PerspectiveCamera(50, this.aspect, 0.1, 100);
    this.camera.position.set(0, 0, 7.5);

    this.scene = new THREE.Scene();
  }

  createLights() {
    this.ambientLight = new THREE.AmbientLight(0xFFF2EA, 0.95);
    this.scene.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xFFE5D8, 1.4);
    this.sunLight.position.set(10, 15, 12);
    this.scene.add(this.sunLight);

    this.fillLight = new THREE.DirectionalLight(0xFFC4D4, 0.85);
    this.fillLight.position.set(-10, -5, 8);
    this.scene.add(this.fillLight);

    this.centerGlowLight = new THREE.PointLight(0xFF6B8B, 1.2, 12, 1.5);
    this.centerGlowLight.position.set(0, 0.5, 1);
    this.scene.add(this.centerGlowLight);
  }

  createFloatingHearts() {
    const heartGeometry = createHeartGeometry();
    this.heartGeometry = heartGeometry;

    const colors = [
      0xE84A5F, // cherry light
      0xFF6B7A, // warm rose
      0xFF8FA3, // blush
      0xFFB3C1, // delicate pink
      0xFF758F, // vivid pink
      0xFFCCD5, // pastel rose
      0xC41E3A, // cherry
      0xFFE4E8, // cream blush
    ];

    // Carefully framing the center stage
    const heartConfigs = [
      // Left cluster
      { x: -4.5, y: 2.2, z: 0.2, scale: 0.38, color: colors[0], speed: 1.1, amp: 0.2, rotY: -0.15, rotZ: 0.1 },
      { x: -3.2, y: 3.1, z: 0.6, scale: 0.30, color: colors[1], speed: 1.3, amp: 0.16, rotY: 0.1, rotZ: -0.1 },
      { x: -4.8, y: 0.3, z: 0.8, scale: 0.44, color: colors[2], speed: 0.9, amp: 0.24, rotY: -0.2, rotZ: 0.15 },
      { x: -3.5, y: -1.3, z: 0.3, scale: 0.34, color: colors[3], speed: 1.2, amp: 0.18, rotY: 0.15, rotZ: -0.12 },
      { x: -4.6, y: -2.5, z: 0.5, scale: 0.36, color: colors[4], speed: 1.0, amp: 0.22, rotY: -0.1, rotZ: 0.08 },
      { x: -2.6, y: -2.9, z: 1.2, scale: 0.26, color: colors[5], speed: 1.4, amp: 0.15, rotY: 0.2, rotZ: -0.15 },

      // Right cluster
      { x: 4.5, y: 2.3, z: 0.2, scale: 0.40, color: colors[1], speed: 1.0, amp: 0.22, rotY: 0.15, rotZ: -0.1 },
      { x: 3.3, y: 3.0, z: 0.5, scale: 0.32, color: colors[2], speed: 1.2, amp: 0.16, rotY: -0.12, rotZ: 0.12 },
      { x: 4.9, y: 0.5, z: 0.7, scale: 0.45, color: colors[0], speed: 0.95, amp: 0.25, rotY: 0.18, rotZ: -0.15 },
      { x: 3.6, y: -1.1, z: 0.2, scale: 0.35, color: colors[4], speed: 1.15, amp: 0.19, rotY: -0.15, rotZ: 0.1 },
      { x: 4.7, y: -2.4, z: 0.4, scale: 0.36, color: colors[3], speed: 1.05, amp: 0.21, rotY: 0.1, rotZ: -0.08 },
      { x: 2.7, y: -2.8, z: 1.1, scale: 0.27, color: colors[5], speed: 1.35, amp: 0.15, rotY: -0.2, rotZ: 0.14 },

      // Top floating floaters
      { x: -1.4, y: 3.3, z: -0.4, scale: 0.24, color: colors[6], speed: 1.35, amp: 0.14, rotY: -0.05, rotZ: 0.05 },
      { x: 1.5, y: 3.4, z: -0.3, scale: 0.26, color: colors[2], speed: 1.25, amp: 0.15, rotY: 0.05, rotZ: -0.05 },

      // Gentle depth floaters
      { x: -3.8, y: 1.4, z: 1.8, scale: 0.28, color: colors[7], speed: 1.1, amp: 0.18, rotY: -0.12, rotZ: 0.08 },
      { x: 3.9, y: 1.3, z: 1.6, scale: 0.30, color: colors[3], speed: 1.05, amp: 0.19, rotY: 0.14, rotZ: -0.1 },
    ];

    this.heartMaterials = [];

    heartConfigs.forEach((cfg, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.3,
        metalness: 0.12,
        emissive: cfg.color,
        emissiveIntensity: 0.2,
      });
      this.heartMaterials.push(material);

      const mesh = new THREE.Mesh(heartGeometry, material);
      mesh.scale.setScalar(0.001); // starts at 0 for entrance
      mesh.targetScale = cfg.scale;
      mesh.position.set(cfg.x, cfg.y, cfg.z);

      mesh.baseX = cfg.x;
      mesh.baseY = cfg.y;
      mesh.baseZ = cfg.z;
      mesh.baseRotY = cfg.rotY;
      mesh.baseRotZ = cfg.rotZ;
      mesh.phase = index * 0.45;
      mesh.speed = cfg.speed;
      mesh.amp = cfg.amp;

      this.scene.add(mesh);
      this.hearts.push(mesh);
    });
  }

  createPetals() {
    const petalGeometry = new THREE.PlaneGeometry(0.24, 0.30);
    this.petalGeometry = petalGeometry;

    const petalTexture = createPetalTexture();
    this.petalTexture = petalTexture;

    this.petalMaterial = new THREE.MeshBasicMaterial({
      map: petalTexture,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const petalCount = 130;

    for (let i = 0; i < petalCount; i++) {
      const mesh = new THREE.Mesh(petalGeometry, this.petalMaterial);

      mesh.position.set(
        (Math.random() - 0.5) * 16,
        Math.random() * 12 - 5,
        (Math.random() - 0.5) * 6
      );

      mesh.scale.setScalar(0.7 + Math.random() * 0.55);
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      );

      mesh.fallSpeed = 0.55 + Math.random() * 0.7;
      mesh.swaySpeed = 1.1 + Math.random() * 1.3;
      mesh.swayAmp = 0.25 + Math.random() * 0.35;
      mesh.rotSpeedX = (Math.random() - 0.5) * 1.0;
      mesh.rotSpeedY = (Math.random() - 0.5) * 1.2;
      mesh.rotSpeedZ = (Math.random() - 0.5) * 0.8;
      mesh.phase = Math.random() * Math.PI * 2;

      this.scene.add(mesh);
      this.petals.push(mesh);
    }
  }

  createBokeh() {
    const bokehCount = 70;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(bokehCount * 3);
    const phases = new Float32Array(bokehCount);

    for (let i = 0; i < bokehCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 15;
      positions[i * 3 + 1] = Math.random() * 10 - 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const bokehTexture = createBokehTexture();
    this.bokehTexture = bokehTexture;

    const material = new THREE.PointsMaterial({
      color: 0xFFE0E9,
      size: 0.32,
      map: bokehTexture,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.bokehParticles = new THREE.Points(geometry, material);
    this.bokehPhases = phases;
    this.scene.add(this.bokehParticles);
  }

  setupMouseTracking() {
    this.mouseMoveHandler = (e) => {
      this.mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouseY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
  }

  setupResizeListener() {
    this.resizeHandler = () => this.onResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  onResize() {
    this.width = this.container.clientWidth || window.innerWidth;
    this.height = this.container.clientHeight || window.innerHeight;
    this.aspect = this.width / this.height;

    this.camera.aspect = this.aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();

    // Smooth camera parallax
    this.targetCameraX = this.mouseX * 0.6;
    this.targetCameraY = -this.mouseY * 0.35;
    this.camera.position.x += (this.targetCameraX - this.camera.position.x) * 0.05;
    this.camera.position.y += (this.targetCameraY - this.camera.position.y) * 0.05;
    this.camera.lookAt(0, 0, 0);

    // Animate 3D Floating Hearts (gently bobbing & rocking, always facing camera)
    for (let i = 0; i < this.hearts.length; i++) {
      const h = this.hearts[i];
      h.position.y = h.baseY + Math.sin(time * h.speed + h.phase) * h.amp;
      h.position.x = h.baseX + Math.cos(time * 0.5 + h.phase) * (h.amp * 0.35);

      // Gentle wobble around base orientation: stays visibly heart-shaped!
      h.rotation.y = h.baseRotY + Math.sin(time * h.speed * 0.8 + h.phase) * 0.28;
      h.rotation.z = h.baseRotZ + Math.cos(time * h.speed * 0.6 + h.phase) * 0.18;
      h.rotation.x = Math.sin(time * 0.6 + h.phase) * 0.12;
    }

    // Animate Cherry Blossom Petals
    for (let i = 0; i < this.petals.length; i++) {
      const p = this.petals[i];
      p.position.y -= p.fallSpeed * delta;
      p.position.x += Math.sin(time * p.swaySpeed + p.phase) * delta * p.swayAmp;
      p.rotation.x += p.rotSpeedX * delta;
      p.rotation.y += p.rotSpeedY * delta;
      p.rotation.z += p.rotSpeedZ * delta;

      if (p.position.y < -5.5) {
        p.position.y = 5.5 + Math.random() * 1.5;
        p.position.x = (Math.random() - 0.5) * 16;
      }
    }

    // Animate Bokeh Floating Points
    if (this.bokehParticles) {
      const positions = this.bokehParticles.geometry.attributes.position.array;
      for (let i = 0; i < positions.length / 3; i++) {
        positions[i * 3 + 1] += delta * 0.22;
        positions[i * 3] += Math.sin(time + this.bokehPhases[i]) * delta * 0.08;
        if (positions[i * 3 + 1] > 5) {
          positions[i * 3 + 1] = -5;
          positions[i * 3] = (Math.random() - 0.5) * 15;
        }
      }
      this.bokehParticles.geometry.attributes.position.needsUpdate = true;
    }

    // Pulse center glow light
    if (this.centerGlowLight) {
      this.centerGlowLight.intensity = 1.0 + Math.sin(time * 2) * 0.3;
    }

    this.renderer.render(this.scene, this.camera);
  }

  playEntranceAnimation() {
    this.hearts.forEach((h, index) => {
      gsap.to(h.scale, {
        x: h.targetScale,
        y: h.targetScale,
        z: h.targetScale,
        duration: 1.8,
        delay: 0.15 + index * 0.05,
        ease: 'elastic.out(1, 0.6)',
      });
    });

    gsap.from(this.camera.position, {
      z: 11,
      duration: 2.2,
      ease: 'power2.out',
    });
  }

  dispose() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }

    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('resize', this.resizeHandler);

    if (this.heartGeometry) this.heartGeometry.dispose();
    if (this.petalGeometry) this.petalGeometry.dispose();
    if (this.petalTexture) this.petalTexture.dispose();
    if (this.bokehTexture) this.bokehTexture.dispose();
    if (this.petalMaterial) this.petalMaterial.dispose();

    this.heartMaterials.forEach(m => m.dispose());

    if (this.bokehParticles) {
      this.bokehParticles.geometry.dispose();
      this.bokehParticles.material.dispose();
    }

    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
    }
  }
}
