import * as THREE from 'three';
import { HEART_COLORS } from '../utils/colors.js';

export class Heart extends THREE.Group {
  constructor() {
    super();
    this.name = 'Heart';
    this.rotationY = 0;
    this.targetRotationY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    
    this.frontText = 'I Love You Princess';
    this.backText = 'yes from every part of my heart';
    this.currentText = this.frontText;
    this.textOpacity = 1;
    this.showingFront = true;
    
    this.createHeart();
    this.createTextSprites();
  }
  
  createHeart() {
    const points = [];
    const segments = 64;
    
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(theta), 3);
      const y = 13 * Math.cos(theta) - 5 * Math.cos(2 * theta) - 2 * Math.cos(3 * theta) - Math.cos(4 * theta);
      points.push(new THREE.Vector2(x * 0.035, y * 0.035));
    }
    
    const geometry = new THREE.LatheGeometry(points, 64);
    geometry.computeVertexNormals();
    geometry.center();
    geometry.scale(1, 1, 0.6);
    
    const material = new THREE.MeshStandardMaterial({
      color: HEART_COLORS.primary,
      roughness: 0.25,
      metalness: 0.1,
      emissive: HEART_COLORS.emissive,
      emissiveIntensity: 0.15,
      side: THREE.DoubleSide,
    });
    
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.add(this.mesh);
    
    this.createGlow();
  }
  
  createGlow() {
    const glowGeometry = new THREE.SphereGeometry(0.85, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: HEART_COLORS.primary,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.add(this.glow);
  }
  
  createTextSprites() {
    this.textSprites = new THREE.Group();
    this.textSprites.name = 'HeartText';
    
    this.frontSprite = this.createTextSprite(this.frontText, 0xFFFFFF);
    this.frontSprite.position.z = 0.95;
    this.frontSprite.scale.set(2.5, 0.6, 1);
    
    this.backSprite = this.createTextSprite(this.backText, 0xFFFFFF);
    this.backSprite.position.z = -0.95;
    this.backSprite.rotation.y = Math.PI;
    this.backSprite.scale.set(2.5, 0.6, 1);
    this.backSprite.material.opacity = 0;
    
    this.textSprites.add(this.frontSprite);
    this.textSprites.add(this.backSprite);
    this.add(this.textSprites);
  }
  
  createTextSprite(text, color) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 1024;
    canvas.height = 256;
    
    ctx.font = 'bold 80px "Dancing Script", cursive';
    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: true,
      depthWrite: false,
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.renderOrder = 10;
    return sprite;
  }
  
  updateTextCrossfade(delta) {
    const angle = this.rotation.y % (Math.PI * 2);
    const normalizedAngle = angle < 0 ? angle + Math.PI * 2 : angle;
    
    const frontVisible = normalizedAngle < Math.PI * 0.5 || normalizedAngle > Math.PI * 1.5;
    const backVisible = !frontVisible;
    
    const transitionZone = Math.PI * 0.15;
    let frontOpacity = 1;
    let backOpacity = 0;
    
    if (frontVisible) {
      const distFromEdge = Math.min(
        normalizedAngle,
        Math.PI * 2 - normalizedAngle
      );
      if (distFromEdge < transitionZone) {
        frontOpacity = distFromEdge / transitionZone;
        backOpacity = 1 - frontOpacity;
      }
    } else {
      const distFromEdge = Math.min(
        Math.abs(normalizedAngle - Math.PI),
        Math.abs(normalizedAngle - Math.PI * 2)
      );
      if (distFromEdge < transitionZone) {
        backOpacity = distFromEdge / transitionZone;
        frontOpacity = 1 - backOpacity;
      } else {
        backOpacity = 1;
        frontOpacity = 0;
      }
    }
    
    if (this.frontSprite) this.frontSprite.material.opacity = frontOpacity;
    if (this.backSprite) this.backSprite.material.opacity = backOpacity;
    
    this.showingFront = frontOpacity > backOpacity;
  }
  
  rotateTo(targetY, duration = 1.5) {
    return new Promise(resolve => {
      const startY = this.rotation.y;
      const diff = targetY - startY;
      const normalizedDiff = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
      const target = startY + normalizedDiff;
      
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.rotation.y = startY + normalizedDiff * eased;
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(animate);
    });
  }
  
  handleMouseDown(event) {
    this.isDragging = true;
    this.lastMouseX = event.clientX;
    this.mesh.material.emissiveIntensity = 0.3;
  }
  
  handleMouseMove(event) {
    if (!this.isDragging) return;
    
    const deltaX = event.clientX - this.lastMouseX;
    this.targetRotationY -= deltaX * 0.01;
    this.lastMouseX = event.clientX;
  }
  
  handleMouseUp() {
    this.isDragging = false;
    this.mesh.material.emissiveIntensity = 0.15;
  }
  
  update(delta) {
    const lerpFactor = 1 - Math.exp(-delta * 8);
    this.rotation.y += (this.targetRotationY - this.rotation.y) * lerpFactor;
    
    if (!this.isDragging && Math.abs(this.targetRotationY - this.rotation.y) < 0.001) {
      this.targetRotationY += delta * 0.08;
    }
    
    this.updateTextCrossfade(delta);
    
    if (this.glow) {
      this.glow.scale.setScalar(1 + Math.sin(performance.now() * 0.002) * 0.03);
      this.glow.material.opacity = 0.06 + Math.sin(performance.now() * 0.0015) * 0.02;
    }
  }
  
  dispose() {
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.glow.geometry.dispose();
    this.glow.material.dispose();
    this.frontSprite.material.map.dispose();
    this.frontSprite.material.dispose();
    this.backSprite.material.map.dispose();
    this.backSprite.material.dispose();
  }
}