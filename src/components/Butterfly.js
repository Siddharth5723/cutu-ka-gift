import * as THREE from 'three';
import { BUTTERFLY_COLORS } from '../utils/colors.js';

const WING_VERTEX_SHADER = `
  attribute float wingPhase;
  attribute float wingSide;
  uniform float time;
  uniform float flapSpeed;
  varying vec2 vUv;
  varying float vWingFlap;
  
  void main() {
    vUv = uv;
    float flap = sin(time * flapSpeed + wingPhase) * 0.5 * wingSide;
    vec3 pos = position;
    pos.x += flap * (1.0 - abs(uv.y - 0.5)) * 2.0;
    vWingFlap = flap;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const WING_FRAGMENT_SHADER = `
  uniform vec3 color;
  uniform float opacity;
  varying vec2 vUv;
  varying float vWingFlap;
  
  void main() {
    float gradient = smoothstep(0.0, 1.0, vUv.y) * 0.3 + 0.7;
    float edge = 1.0 - smoothstep(0.9, 1.0, length(vUv - 0.5) * 2.0);
    vec3 finalColor = color * gradient;
    float alpha = opacity * edge * (0.8 + vWingFlap * 0.2);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

export class Butterfly extends THREE.Group {
  constructor(bounds = { x: 40, y: 20, z: 40 }) {
    super();
    this.name = 'Butterfly';
    this.bounds = bounds;
    this.color = BUTTERFLY_COLORS[Math.floor(Math.random() * BUTTERFLY_COLORS.length)];
    this.flapSpeed = 12 + Math.random() * 6;
    this.wingPhase = Math.random() * Math.PI * 2;
    
    this.position.set(
      (Math.random() - 0.5) * bounds.x * 0.8,
      Math.random() * bounds.y * 0.6 + 2,
      (Math.random() - 0.5) * bounds.z * 0.8
    );
    
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.maxSpeed = 0.8 + Math.random() * 0.7;
    this.maxForce = 0.02;
    this.wanderAngle = 0;
    
    this.createMesh();
    this.createMaterial();
  }
  
  createMesh() {
    const wingGeometry = new THREE.PlaneGeometry(0.6, 0.4, 8, 4);
    const positions = wingGeometry.attributes.position;
    
    const wingPhases = [];
    const wingSides = [];
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      wingPhases.push(this.wingPhase + (x + 0.3) * Math.PI * 0.5);
      wingSides.push(x > 0 ? 1 : -1);
    }
    
    wingGeometry.setAttribute('wingPhase', new THREE.Float32BufferAttribute(wingPhases, 1));
    wingGeometry.setAttribute('wingSide', new THREE.Float32BufferAttribute(wingSides, 1));
    
    this.wingMaterial = new THREE.ShaderMaterial({
      vertexShader: WING_VERTEX_SHADER,
      fragmentShader: WING_FRAGMENT_SHADER,
      uniforms: {
        time: { value: 0 },
        flapSpeed: { value: this.flapSpeed },
        color: { value: new THREE.Color(this.color) },
        opacity: { value: 0.9 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    
    this.leftWing = new THREE.Mesh(wingGeometry, this.wingMaterial);
    this.leftWing.position.set(-0.15, 0, 0);
    this.leftWing.rotation.y = -0.3;
    this.add(this.leftWing);
    
    this.rightWing = new THREE.Mesh(wingGeometry, this.wingMaterial);
    this.rightWing.position.set(0.15, 0, 0);
    this.rightWing.rotation.y = 0.3;
    this.add(this.rightWing);
    
    const bodyGeometry = new THREE.CapsuleGeometry(0.04, 0.3, 4, 8);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x1A1A1A,
      roughness: 0.8,
      metalness: 0.1,
    });
    this.body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.body.rotation.z = Math.PI / 2;
    this.add(this.body);
    
    this.trail = this.createTrail();
    this.add(this.trail);
  }
  
  createTrail() {
    const trailGeometry = new THREE.BufferGeometry();
    const trailCount = 15;
    const trailPositions = new Float32Array(trailCount * 3);
    const trailAlphas = new Float32Array(trailCount);
    
    for (let i = 0; i < trailCount; i++) {
      trailPositions[i * 3] = this.position.x;
      trailPositions[i * 3 + 1] = this.position.y;
      trailPositions[i * 3 + 2] = this.position.z;
      trailAlphas[i] = 1 - i / trailCount;
    }
    
    trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    trailGeometry.setAttribute('alpha', new THREE.BufferAttribute(trailAlphas, 1));
    
    const trailMaterial = new THREE.PointsMaterial({
      color: this.color,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
      depthWrite: false,
    });
    
    return new THREE.Points(trailGeometry, trailMaterial);
  }
  
  createMaterial() {
    this.materials = [
      this.wingMaterial,
      this.body.material,
      this.trail.material,
    ];
  }
  
  update(time, delta, butterflies = []) {
    this.wingMaterial.uniforms.time.value = time;
    
    this.flock(butterflies);
    this.wander();
    this.applyBounds();
    
    this.velocity.add(this.acceleration);
    this.velocity.clampLength(0, this.maxSpeed);
    this.position.add(this.velocity);
    this.acceleration.set(0, 0, 0);
    
    if (this.velocity.length() > 0.01) {
      const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
      this.rotation.y = THREE.MathUtils.lerp(this.rotation.y, targetRotation, 0.1);
      
      const tilt = Math.sin(time * this.flapSpeed * 0.5) * 0.15;
      this.rotation.z = THREE.MathUtils.lerp(this.rotation.z, tilt, 0.1);
    }
    
    this.updateTrail();
  }
  
  flock(butterflies) {
    let separation = new THREE.Vector3();
    let alignment = new THREE.Vector3();
    let cohesion = new THREE.Vector3();
    let count = 0;
    
    const desiredSeparation = 3;
    const neighborDist = 8;
    
    for (const other of butterflies) {
      if (other === this) continue;
      
      const d = this.position.distanceTo(other.position);
      
      if (d < neighborDist && d > 0) {
        const diff = new THREE.Vector3().subVectors(this.position, other.position);
        diff.normalize().divideScalar(d);
        separation.add(diff);
        
        alignment.add(other.velocity);
        cohesion.add(other.position);
        count++;
      }
    }
    
    if (count > 0) {
      separation.divideScalar(count).normalize().multiplyScalar(this.maxSpeed);
      separation.sub(this.velocity).clampLength(0, this.maxForce);
      this.applyForce(separation.multiplyScalar(1.5));
      
      alignment.divideScalar(count).normalize().multiplyScalar(this.maxSpeed);
      alignment.sub(this.velocity).clampLength(0, this.maxForce);
      this.applyForce(alignment.multiplyScalar(1.0));
      
      cohesion.divideScalar(count);
      cohesion.sub(this.position).normalize().multiplyScalar(this.maxSpeed);
      cohesion.sub(this.velocity).clampLength(0, this.maxForce);
      this.applyForce(cohesion.multiplyScalar(0.5));
    }
  }
  
  wander() {
    this.wanderAngle += (Math.random() - 0.5) * 0.5;
    const wanderForce = new THREE.Vector3(
      Math.sin(this.wanderAngle) * 0.01,
      (Math.random() - 0.5) * 0.005,
      Math.cos(this.wanderAngle) * 0.01
    );
    this.applyForce(wanderForce);
  }
  
  applyBounds() {
    const margin = 5;
    const bounds = this.bounds;
    
    if (this.position.x > bounds.x / 2 - margin) this.applyForce(new THREE.Vector3(-0.02, 0, 0));
    if (this.position.x < -bounds.x / 2 + margin) this.applyForce(new THREE.Vector3(0.02, 0, 0));
    if (this.position.y > bounds.y - margin) this.applyForce(new THREE.Vector3(0, -0.02, 0));
    if (this.position.y < 1 + margin) this.applyForce(new THREE.Vector3(0, 0.02, 0));
    if (this.position.z > bounds.z / 2 - margin) this.applyForce(new THREE.Vector3(0, 0, -0.02));
    if (this.position.z < -bounds.z / 2 + margin) this.applyForce(new THREE.Vector3(0, 0, 0.02));
  }
  
  applyForce(force) {
    this.acceleration.add(force);
  }
  
  updateTrail() {
    const positions = this.trail.geometry.attributes.position.array;
    const alphas = this.trail.geometry.attributes.alpha.array;
    
    for (let i = positions.length / 3 - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }
    
    positions[0] = this.position.x;
    positions[1] = this.position.y;
    positions[2] = this.position.z;
    
    this.trail.geometry.attributes.position.needsUpdate = true;
  }
  
  dispose() {
    this.leftWing.geometry.dispose();
    this.wingMaterial.dispose();
    this.body.geometry.dispose();
    this.body.material.dispose();
    this.trail.geometry.dispose();
    this.trail.material.dispose();
  }
}

export class ButterflySystem extends THREE.Group {
  constructor(count = 20, bounds = { x: 40, y: 20, z: 40 }) {
    super();
    this.name = 'ButterflySystem';
    this.butterflies = [];
    this.bounds = bounds;
    
    for (let i = 0; i < count; i++) {
      const butterfly = new Butterfly(bounds);
      this.butterflies.push(butterfly);
      this.add(butterfly);
    }
  }
  
  update(time, delta) {
    for (const butterfly of this.butterflies) {
      butterfly.update(time, delta, this.butterflies);
    }
  }
  
  dispose() {
    for (const butterfly of this.butterflies) {
      butterfly.dispose();
    }
    this.butterflies = [];
  }
}