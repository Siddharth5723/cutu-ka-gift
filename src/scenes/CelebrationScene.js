import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { PetalParticleSystem } from '../components/PetalParticle.js';
import { COLORS, PETAL_COLORS } from '../utils/colors.js';

gsap.registerPlugin(ScrollTrigger);

export class CelebrationScene {
  constructor(container) {
    this.container = container;
    this.width = container.clientWidth;
    this.height = container.clientHeight;
    this.clock = new THREE.Clock();
    
    this.render();
    this.initThree();
    this.createScene();
    this.setupNoteHolder();
    this.setupScrollAnimations();
    this.animate();
  }
  
  render() {
    this.container.innerHTML = `
      <section class="celebration-section section" id="celebration">
        <div class="canvas-container" id="celebrationCanvas"></div>
        
        <div class="celebration-content content-overlay">
          <div class="celebration-header">
            <div class="celebration-icon">🎉</div>
            <h2>Celebrating Us</h2>
            <p class="celebration-subtitle">Two years of love, laughter, and endless memories</p>
          </div>
          
          <div class="note-container">
            <note-holder id="noteHolder"></note-holder>
          </div>
          
          <div class="celebration-footer">
            <p>Happy 2nd Anniversary, my love 💕</p>
            <div class="heart-divider">
              <svg viewBox="0 0 24 24" fill="#C41E3A" width="24" height="24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
        </div>
      </section>
    `;
    
    this.canvasContainer = this.container.querySelector('#celebrationCanvas');
    this.noteHolder = this.container.querySelector('#noteHolder');
  }
  
  initThree() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    this.canvasContainer.appendChild(this.renderer.domElement);
    
    this.camera = new THREE.PerspectiveCamera(60, this.width / this.height, 0.1, 200);
    this.camera.position.set(0, 5, 15);
    this.camera.lookAt(0, 0, 0);
    
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xFFF8F0, 0.015);
  }
  
  createScene() {
    this.createPetals();
    this.createLights();
    this.createGround();
    this.createConfettiBurst();
  }
  
  createPetals() {
    this.petals = new PetalParticleSystem(1500);
    this.scene.add(this.petals);
  }
  
  createLights() {
    this.ambientLight = new THREE.AmbientLight(0xFFF0E8, 0.5);
    this.scene.add(this.ambientLight);
    
    this.hemiLight = new THREE.HemisphereLight(0xFFE8D8, 0xF5EDE3, 0.6);
    this.scene.add(this.hemiLight);
    
    this.sunLight = new THREE.DirectionalLight(0xFFF5E8, 1.0);
    this.sunLight.position.set(20, 40, 20);
    this.sunLight.castShadow = true;
    this.scene.add(this.sunLight);
    
    this.colorLight1 = new THREE.PointLight(0xFF6B7A, 0.5, 30, 2);
    this.colorLight1.position.set(-15, 10, -10);
    this.scene.add(this.colorLight1);
    
    this.colorLight2 = new THREE.PointLight(0xFFD1DC, 0.4, 30, 2);
    this.colorLight2.position.set(15, 10, 10);
    this.scene.add(this.colorLight2);
  }
  
  createGround() {
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0xF5EDE3,
      roughness: 0.95,
      metalness: 0,
    });
    this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
    this.ground.rotation.x = -Math.PI / 2;
    this.ground.position.y = -2;
    this.ground.receiveShadow = true;
    this.scene.add(this.ground);
  }
  
  createConfettiBurst() {
    this.confettiParticles = [];
    const confettiGeometry = new THREE.BufferGeometry();
    const confettiCount = 300;
    const positions = new Float32Array(confettiCount * 3);
    const velocities = new Float32Array(confettiCount * 3);
    const colors = new Float32Array(confettiCount * 3);
    const sizes = new Float32Array(confettiCount);
    const rotations = new Float32Array(confettiCount);
    const rotationSpeeds = new Float32Array(confettiCount);
    
    for (let i = 0; i < confettiCount; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 5;
      positions[i * 3 + 2] = 0;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      velocities[i * 3] = Math.cos(angle) * speed * 0.5;
      velocities[i * 3 + 1] = 5 + Math.random() * 10;
      velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.5;
      
      const color = new THREE.Color(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
      
      sizes[i] = 0.15 + Math.random() * 0.2;
      rotations[i] = Math.random() * Math.PI * 2;
      rotationSpeeds[i] = (Math.random() - 0.5) * 10;
    }
    
    confettiGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    confettiGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const confettiMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      sizeAttenuation: true,
      depthWrite: false,
    });
    
    this.confetti = new THREE.Points(confettiGeometry, confettiMaterial);
    this.confetti.visible = false;
    this.scene.add(this.confetti);
    
    this.confettiData = {
      positions,
      velocities,
      sizes,
      rotations,
      rotationSpeeds,
      alive: false,
      time: 0,
    };
  }
  
  triggerConfetti() {
    if (this.confettiData.alive) return;
    
    this.confettiData.alive = true;
    this.confettiData.time = 0;
    this.confetti.visible = true;
    
    const positions = this.confettiData.positions;
    const velocities = this.confettiData.velocities;
    
    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = 5 + Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 12;
      velocities[i * 3] = Math.cos(angle) * speed * 0.3;
      velocities[i * 3 + 1] = 8 + Math.random() * 15;
      velocities[i * 3 + 2] = Math.sin(angle) * speed * 0.3;
    }
    
    this.confetti.geometry.attributes.position.needsUpdate = true;
  }
  
  updateConfetti(delta) {
    if (!this.confettiData.alive) return;
    
    this.confettiData.time += delta;
    const positions = this.confettiData.positions;
    const velocities = this.confettiData.velocities;
    const rotations = this.confettiData.rotations;
    const rotationSpeeds = this.confettiData.rotationSpeeds;
    
    let allDead = true;
    
    for (let i = 0; i < positions.length / 3; i++) {
      if (positions[i * 3 + 1] > -5) {
        allDead = false;
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;
        
        velocities[i * 3 + 1] -= 9.8 * delta * 2;
        velocities[i * 3] *= 0.99;
        velocities[i * 3 + 2] *= 0.99;
        
        rotations[i] += rotationSpeeds[i] * delta;
      }
    }
    
    this.confetti.geometry.attributes.position.needsUpdate = true;
    
    if (allDead || this.confettiData.time > 8) {
      this.confettiData.alive = false;
      this.confetti.visible = false;
    }
  }
  
  setupNoteHolder() {
    if (this.noteHolder && this.noteHolder.shadowRoot) {
      this.noteHolder.addEventListener('save', () => {
        console.log('Note saved');
      });
    }
  }
  
  setupScrollAnimations() {
    const header = this.container.querySelector('.celebration-header');
    const noteContainer = this.container.querySelector('.note-container');
    const footer = this.container.querySelector('.celebration-footer');
    
    gsap.set([header, noteContainer, footer], { opacity: 0, y: 30 });
    
    ScrollTrigger.create({
      trigger: this.container,
      start: 'top 70%',
      onEnter: () => {
        gsap.to(header, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out' });
        gsap.to(noteContainer, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.2 });
        gsap.to(footer, { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.4 });
        this.triggerConfetti();
      },
      once: true,
    });
  }
  
  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    
    const delta = this.clock.getDelta();
    const time = this.clock.getElapsedTime();
    
    this.petals.update(time, delta);
    this.updateConfetti(delta);
    this.updateLights(time);
    
    this.renderer.render(this.scene, this.camera);
  }
  
  updateLights(time) {
    this.colorLight1.intensity = 0.3 + Math.sin(time * 0.7) * 0.2;
    this.colorLight2.intensity = 0.2 + Math.cos(time * 0.5) * 0.2;
    this.colorLight1.position.x = -15 + Math.sin(time * 0.3) * 5;
    this.colorLight2.position.x = 15 + Math.cos(time * 0.3) * 5;
  }
  
  onResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height);
  }
  
  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    
    this.petals.dispose();
    this.confetti.geometry.dispose();
    this.confetti.material.dispose();
    this.ground.geometry.dispose();
    this.ground.material.dispose();
    
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}