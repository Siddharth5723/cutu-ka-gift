import './style.css';
import { HeroScene } from './scenes/HeroScene.js';
import { MemoriesScene } from './scenes/MemoriesScene.js';
import { CelebrationScene } from './scenes/CelebrationScene.js';
import { initAudio, toggle, getIsPlaying, getIsEnabled, setVolume, getVolume } from './utils/audio.js';
import { getMusicEnabled } from './utils/storage.js';

class AnniversaryApp {
  constructor() {
    this.app = document.getElementById('app');
    this.heroScene = null;
    this.memoriesScene = null;
    this.celebrationScene = null;
    this.musicToggle = document.getElementById('music-toggle');
    
    this.init();
  }
  
  async init() {
    this.renderLayout();
    await this.initAudio();
    this.initMusicToggle();
    this.initScenes();
    this.setupHeroInteractions();
    this.setupScrollHandling();
    this.setupResizeHandler();
    
    this.heroScene.playEntranceAnimation();
  }
  
  renderLayout() {
    this.app.innerHTML = `
      <header class="hero-section section" id="hero">
        <!-- Dreamy ambient glow & blurred backdrop matching reference artwork -->
        <div class="hero-ambient-glow" aria-hidden="true"></div>
        <div class="hero-ambient-blur" aria-hidden="true"></div>
        
        <!-- 3D Three.js Canvas (Floating 3D Hearts, Petals, Bokeh) -->
        <div class="canvas-container" id="heroCanvas"></div>
        
        <!-- Hero Content Overlay -->
        <div class="hero-content content-overlay">
          <!-- Romantic Top Badge -->
          <div class="hero-badge">
            <span class="badge-icon">💖</span>
            <span class="badge-text">2 Years of Endless Love</span>
            <span class="badge-icon">💖</span>
          </div>

          <!-- Main Title & Subtitle -->
          <div class="hero-text">
            <h1 class="hero-title">Happy 2nd Anniversary</h1>
            <p class="hero-subtitle">Two years of loving you, and every day still feels like magic 💕</p>
          </div>

          <!-- Central Romantic Stage (Couple & Arch from reference image) -->
          <div class="hero-stage-container" id="heroStageContainer">
            <div class="hero-card-stage" id="heroCardStage" role="button" tabindex="0" aria-label="Tap for love">
              <div class="hero-card-glow" aria-hidden="true"></div>
              <div class="hero-card-frame">
                <img 
                  src="/cutu-ka-gift/cover-reference-2x.png" 
                  alt="Boy and girl surrounded by cherry blossom heart trees under a glowing romantic heart"
                  class="hero-artwork-img"
                  draggable="false"
                  loading="eager"
                />
              </div>
            </div>
          </div>

          <!-- Interactive Love Whisper Area -->
          <div class="hero-interaction-area">
            <button class="love-whisper-btn" id="loveWhisperBtn" type="button" aria-expanded="false">
              <span class="whisper-btn-icon">💌</span>
              <span class="whisper-btn-label">Tap to read my heart</span>
              <span class="whisper-btn-sparkle">✨</span>
            </button>
            <div class="love-whisper-message" id="loveWhisperMessage" aria-hidden="true">
              <div class="whisper-inner">
                <div class="whisper-heart-badge">💕</div>
                <p class="whisper-quote">“I love you from every part of my heart, my sweet Princess. Today, tomorrow, and forever and ever.”</p>
                <span class="whisper-signature">— Forever Yours, Cutuu 💕</span>
              </div>
            </div>
          </div>

          <!-- Scroll Indicator -->
          <div class="scroll-indicator" id="heroScrollBtn" role="button" tabindex="0" aria-label="Scroll to explore our memories">
            <span class="scroll-label">Scroll to explore our memories</span>
            <div class="scroll-mouse-icon">
              <div class="scroll-wheel"></div>
            </div>
            <svg class="scroll-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18">
              <path d="M7 10l5 5 5-5"></path>
            </svg>
          </div>
        </div>
      </header>
      
      <main id="mainContent"></main>
      
      <footer class="site-footer">
        <p>Made with love for my princess 💕</p>
      </footer>
    `;
    
    this.heroContainer = document.getElementById('heroCanvas');
    this.mainContent = document.getElementById('mainContent');
  }

  setupHeroInteractions() {
    const cardStage = document.getElementById('heroCardStage');
    const heroSection = document.getElementById('hero');
    const whisperBtn = document.getElementById('loveWhisperBtn');
    const whisperMsg = document.getElementById('loveWhisperMessage');
    const scrollBtn = document.getElementById('heroScrollBtn');

    // 3D Parallax tilt on mouse movement for the artwork card
    if (cardStage && heroSection) {
      const handleMouseMove = (e) => {
        const rect = cardStage.getBoundingClientRect();
        const cardCenterX = rect.left + rect.width / 2;
        const cardCenterY = rect.top + rect.height / 2;
        const deltaX = (e.clientX - cardCenterX) / (window.innerWidth / 2);
        const deltaY = (e.clientY - cardCenterY) / (window.innerHeight / 2);

        const rotateY = deltaX * 10;
        const rotateX = -deltaY * 8;
        cardStage.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;
      };

      const handleMouseLeave = () => {
        cardStage.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      };

      heroSection.addEventListener('mousemove', handleMouseMove, { passive: true });
      heroSection.addEventListener('mouseleave', handleMouseLeave);

      // Card click heart burst
      const triggerCardBurst = (e) => {
        const clientX = e.clientX || (rect.left + rect.width / 2);
        const clientY = e.clientY || (rect.top + rect.height / 2);
        this.spawnHeartBurst(clientX, clientY);
      };

      cardStage.addEventListener('click', triggerCardBurst);
      cardStage.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const rect = cardStage.getBoundingClientRect();
          this.spawnHeartBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
        }
      });
    }

    // Love Whisper button toggle
    if (whisperBtn && whisperMsg) {
      whisperBtn.addEventListener('click', (e) => {
        const isExpanded = whisperBtn.getAttribute('aria-expanded') === 'true';
        const nextState = !isExpanded;
        
        whisperBtn.setAttribute('aria-expanded', String(nextState));
        whisperMsg.setAttribute('aria-hidden', String(!nextState));
        
        if (nextState) {
          whisperMsg.classList.add('visible');
          whisperBtn.classList.add('active');
          const rect = whisperBtn.getBoundingClientRect();
          this.spawnHeartBurst(rect.left + rect.width / 2, rect.top);
        } else {
          whisperMsg.classList.remove('visible');
          whisperBtn.classList.remove('active');
        }
      });
    }

    // Scroll to memories button
    if (scrollBtn) {
      const scrollToMemories = () => {
        const memoriesEl = document.getElementById('memories') || document.getElementById('mainContent');
        if (memoriesEl) {
          memoriesEl.scrollIntoView({ behavior: 'smooth' });
        }
      };
      scrollBtn.addEventListener('click', scrollToMemories);
      scrollBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          scrollToMemories();
        }
      });
    }
  }

  spawnHeartBurst(x, y) {
    const hero = document.getElementById('hero');
    if (!hero) return;

    const emojis = ['💖', '💕', '💗', '💓', '✨', '🌸', '💝'];
    const count = 12;

    for (let i = 0; i < count; i++) {
      const heart = document.createElement('span');
      heart.className = 'burst-heart';
      heart.textContent = emojis[Math.floor(Math.random() * emojis.length)];

      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const distance = 40 + Math.random() * 70;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 45; // float upward
      const rot = (Math.random() - 0.5) * 60;

      heart.style.left = `${x}px`;
      heart.style.top = `${y}px`;
      heart.style.setProperty('--dx', `${dx}px`);
      heart.style.setProperty('--dy', `${dy}px`);
      heart.style.setProperty('--rot', `${rot}deg`);

      hero.appendChild(heart);
      setTimeout(() => heart.remove(), 1100);
    }
  }
  
  async initAudio() {
    await initAudio((state) => this.updateMusicToggle(state));
  }
  
  initMusicToggle() {
    const savedEnabled = getMusicEnabled();
    if (!savedEnabled) {
      this.musicToggle.classList.add('muted');
    }
    
    this.musicToggle.addEventListener('click', () => {
      toggle();
    });
  }
  
  updateMusicToggle(state) {
    if (state.isPlaying) {
      this.musicToggle.classList.remove('muted');
    } else {
      this.musicToggle.classList.add('muted');
    }
  }
  
  initScenes() {
    this.heroScene = new HeroScene(this.heroContainer);
    
    this.memoriesScene = new MemoriesScene(this.mainContent);
    
    const celebrationWrapper = document.createElement('div');
    celebrationWrapper.id = 'celebrationWrapper';
    this.mainContent.appendChild(celebrationWrapper);
    this.celebrationScene = new CelebrationScene(celebrationWrapper);
  }
  
  setupScrollHandling() {
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const direction = scrollY > lastScrollY ? 'down' : 'up';
      lastScrollY = scrollY;
      
      if (scrollY > 100) {
        document.body.classList.add('scrolled');
      } else {
        document.body.classList.remove('scrolled');
      }
      
      ticking = false;
    };
    
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(handleScroll);
        ticking = true;
      }
    }, { passive: true });
  }
  
  setupResizeHandler() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (this.heroScene) this.heroScene.onResize();
        if (this.celebrationScene) this.celebrationScene.onResize();
      }, 100);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new AnniversaryApp();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
