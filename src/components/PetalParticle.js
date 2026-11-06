import * as THREE from 'three';
import { PETAL_COLORS } from '../utils/colors.js';

const PETAL_VERTEX_SHADER = `
  attribute float size;
  attribute float rotation;
  attribute float phase;
  attribute float fallSpeed;
  attribute float swayAmount;
  attribute float swaySpeed;
  attribute vec3 startPosition;
  
  uniform float time;
  uniform float deltaTime;
  
  varying float vRotation;
  varying float vAlpha;
  
  void main() {
    vRotation = rotation + time * 0.5;
    
    vec3 pos = startPosition;
    pos.y -= fallSpeed * time;
    pos.x += sin(time * swaySpeed + phase) * swayAmount;
    pos.z += cos(time * swaySpeed * 0.7 + phase) * swayAmount * 0.5;
    
    if (pos.y < -10.0) {
      pos.y = 25.0;
      pos.x = (sin(phase * 123.45) - 0.5) * 40.0;
      pos.z = (cos(phase * 67.89) - 0.5) * 40.0;
    }
    
    vAlpha = smoothstep(-10.0, 25.0, pos.y);
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PETAL_FRAGMENT_SHADER = `
  uniform sampler2D petalTexture;
  uniform vec3 color;
  varying float vRotation;
  varying float vAlpha;
  
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRotation);
    float s = sin(vRotation);
    uv = mat2(c, -s, s, c) * uv;
    uv += 0.5;
    
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    
    vec4 tex = texture2D(petalTexture, uv);
    if (tex.a < 0.1) discard;
    
    vec3 finalColor = mix(color, vec3(1.0), 0.15);
    gl_FragColor = vec4(finalColor, tex.a * vAlpha * 0.9);
  }
`;

function createPetalTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.moveTo(64, 8);
  ctx.bezierCurveTo(100, 20, 110, 60, 64, 120);
  ctx.bezierCurveTo(18, 60, 28, 20, 64, 8);
  ctx.fill();
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class PetalParticleSystem extends THREE.Points {
  constructor(count = 2000) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const rotations = new Float32Array(count);
    const phases = new Float32Array(count);
    const fallSpeeds = new Float32Array(count);
    const swayAmounts = new Float32Array(count);
    const swaySpeeds = new Float32Array(count);
    const startPositions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 80;
      const y = Math.random() * 40 + 10;
      const z = (Math.random() - 0.5) * 80;
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      startPositions[i * 3] = x;
      startPositions[i * 3 + 1] = y;
      startPositions[i * 3 + 2] = z;
      
      sizes[i] = 0.3 + Math.random() * 0.5;
      rotations[i] = Math.random() * Math.PI * 2;
      phases[i] = Math.random() * Math.PI * 2;
      fallSpeeds[i] = 0.5 + Math.random() * 1.5;
      swayAmounts[i] = 0.5 + Math.random() * 2.0;
      swaySpeeds[i] = 0.3 + Math.random() * 0.7;
      
      const color = new THREE.Color(PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)]);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('fallSpeed', new THREE.BufferAttribute(fallSpeeds, 1));
    geometry.setAttribute('swayAmount', new THREE.BufferAttribute(swayAmounts, 1));
    geometry.setAttribute('swaySpeed', new THREE.BufferAttribute(swaySpeeds, 1));
    geometry.setAttribute('startPosition', new THREE.BufferAttribute(startPositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const petalTexture = createPetalTexture();
    
    const material = new THREE.ShaderMaterial({
      vertexShader: PETAL_VERTEX_SHADER,
      fragmentShader: PETAL_FRAGMENT_SHADER,
      uniforms: {
        time: { value: 0 },
        deltaTime: { value: 0 },
        petalTexture: { value: petalTexture },
        color: { value: new THREE.Color(0xC41E3A) },
      },
      transparent: true,
      depthWrite: false,
      vertexColors: true,
    });
    
    super(geometry, material);
    this.name = 'PetalParticleSystem';
    this.petalTexture = petalTexture;
    this.count = count;
  }
  
  update(time, delta) {
    this.material.uniforms.time.value = time;
    this.material.uniforms.deltaTime.value = delta;
    this.rotation.y = time * 0.005;
  }
  
  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.petalTexture.dispose();
  }
}