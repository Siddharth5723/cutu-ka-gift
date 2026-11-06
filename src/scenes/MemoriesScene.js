import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getMemories, addMemory, removeMemory, updateMemoryCaption, reorderMemories } from '../utils/storage.js';

gsap.registerPlugin(ScrollTrigger);

export class MemoriesScene {
  constructor(container) {
    this.container = container;
    this.memories = getMemories();
    this.dragSrcEl = null;
    
    this.render();
    this.setupEventListeners();
    this.setupScrollAnimations();
  }
  
  render() {
    this.container.innerHTML = `
      <section class="memories-section section" id="memories">
        <div class="section-header">
          <h2>Our Memories</h2>
          <p class="section-subtitle">Every moment with you is a treasure I keep forever 💕</p>
        </div>
        
        <div class="memories-grid" id="memoriesGrid" role="list">
          ${this.renderMemories()}
        </div>
        
        <div class="add-memory-prompt" id="addPrompt">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          <span>Add a Memory</span>
          <input type="file" id="memoryInput" accept="image/*" capture="environment" style="display: none;">
        </div>
      </section>
    `;
    
    this.grid = this.container.querySelector('#memoriesGrid');
    this.addPrompt = this.container.querySelector('#addPrompt');
    this.fileInput = this.container.querySelector('#memoryInput');
  }
  
  renderMemories() {
    if (this.memories.length === 0) {
      return `
        <div class="empty-state" id="emptyState">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="64" height="64">
            <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z"></path>
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 16v-4M12 8h.01"></path>
          </svg>
          <h3>No memories yet</h3>
          <p>Click "Add a Memory" to upload your first photo together</p>
        </div>
      `;
    }
    
    return this.memories.map((memory, index) => `
      <article class="memory-card" data-id="${memory.id}" draggable="true" role="listitem" style="--order: ${index}">
        <div class="memory-image-wrapper">
          <img src="${memory.dataUrl}" alt="${memory.caption || `Memory ${index + 1}`}" loading="lazy" class="memory-image">
          <div class="memory-overlay">
            <button class="memory-action-btn delete-btn" data-id="${memory.id}" aria-label="Delete memory">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
        <div class="memory-content">
          <textarea 
            class="memory-caption" 
            data-id="${memory.id}" 
            placeholder="Add a caption... 💕"
            rows="2"
            aria-label="Memory caption"
          >${memory.caption || ''}</textarea>
          <div class="memory-meta">
            <span class="memory-date">${this.formatDate(memory.createdAt)}</span>
            <span class="memory-drag" aria-label="Drag to reorder">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16">
                <circle cx="9" cy="5" r="1"></circle>
                <circle cx="15" cy="5" r="1"></circle>
                <circle cx="9" cy="12" r="1"></circle>
                <circle cx="15" cy="12" r="1"></circle>
                <circle cx="9" cy="19" r="1"></circle>
                <circle cx="15" cy="19" r="1"></circle>
              </svg>
            </span>
          </div>
        </div>
      </article>
    `).join('');
  }
  
  formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
  
  setupEventListeners() {
    this.addPrompt.addEventListener('click', () => this.fileInput.click());
    this.addPrompt.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.fileInput.click();
      }
    });
    
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    this.grid.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-btn');
      if (deleteBtn) {
        e.stopPropagation();
        this.handleDelete(deleteBtn.dataset.id);
      }
    });
    
    this.grid.addEventListener('blur', (e) => {
      if (e.target.classList.contains('memory-caption')) {
        this.handleCaptionChange(e.target.dataset.id, e.target.value);
      }
    }, true);
    
    this.grid.addEventListener('dragstart', (e) => this.handleDragStart(e));
    this.grid.addEventListener('dragend', () => this.handleDragEnd());
    this.grid.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.grid.addEventListener('drop', (e) => this.handleDrop(e));
  }
  
  async handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      alert('Image too large. Please choose one under 10MB.');
      return;
    }
    
    this.addPrompt.classList.add('loading');
    this.addPrompt.innerHTML = `
      <div class="spinner"></div>
      <span>Adding memory...</span>
    `;
    
    try {
      const newMemory = await addMemory(file);
      this.memories = getMemories();
      this.updateGrid();
      this.animateNewCard(newMemory.id);
    } catch (err) {
      console.error('Failed to add memory:', err);
      alert('Failed to add memory. Please try again.');
    } finally {
      this.addPrompt.classList.remove('loading');
      this.addPrompt.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="32" height="32">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Add a Memory</span>
        <input type="file" id="memoryInput" accept="image/*" capture="environment" style="display: none;">
      `;
      this.fileInput = this.addPrompt.querySelector('#memoryInput');
      this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }
  
  handleDelete(id) {
    if (!confirm('Delete this memory? 💔')) return;
    
    const card = this.grid.querySelector(`[data-id="${id}"]`);
    if (card) {
      gsap.to(card, {
        opacity: 0,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.in',
        onComplete: () => {
          removeMemory(id);
          this.memories = getMemories();
          this.updateGrid();
        }
      });
    }
  }
  
  handleCaptionChange(id, caption) {
    updateMemoryCaption(id, caption);
    this.memories = getMemories();
  }
  
  handleDragStart(e) {
    const card = e.target.closest('.memory-card');
    if (!card) return;
    
    this.dragSrcEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  }
  
  handleDragEnd() {
    if (this.dragSrcEl) {
      this.dragSrcEl.classList.remove('dragging');
      this.dragSrcEl = null;
    }
    this.grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  }
  
  handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const card = e.target.closest('.memory-card');
    if (card && card !== this.dragSrcEl) {
      this.grid.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      card.classList.add('drag-over');
    }
  }
  
  handleDrop(e) {
    e.preventDefault();
    
    const targetCard = e.target.closest('.memory-card');
    if (!targetCard || targetCard === this.dragSrcEl) return;
    
    const srcId = this.dragSrcEl.dataset.id;
    const targetId = targetCard.dataset.id;
    
    const srcIndex = this.memories.findIndex(m => m.id === srcId);
    const targetIndex = this.memories.findIndex(m => m.id === targetId);
    
    if (srcIndex !== -1 && targetIndex !== -1) {
      const [removed] = this.memories.splice(srcIndex, 1);
      this.memories.splice(targetIndex, 0, removed);
      reorderMemories(this.memories);
      this.updateGrid();
    }
  }
  
  updateGrid() {
    const wasEmpty = this.grid.querySelector('.empty-state');
    const willBeEmpty = this.memories.length === 0;
    
    if (wasEmpty && !willBeEmpty) {
      this.grid.innerHTML = this.renderMemories();
    } else if (!wasEmpty && willBeEmpty) {
      this.grid.innerHTML = this.renderMemories();
    } else {
      this.grid.innerHTML = this.renderMemories();
    }
  }
  
  animateNewCard(id) {
    const card = this.grid.querySelector(`[data-id="${id}"]`);
    if (card) {
      gsap.from(card, {
        opacity: 0,
        y: 30,
        scale: 0.9,
        duration: 0.6,
        ease: 'back.out(1.5)',
      });
    }
  }
  
  setupScrollAnimations() {
    ScrollTrigger.batch('.memory-card', {
      onEnter: (elements) => {
        gsap.to(elements, {
          opacity: 1,
          y: 0,
          stagger: 0.1,
          duration: 0.6,
          ease: 'power2.out',
        });
      },
      start: 'top 85%',
    });
  }
  
  refresh() {
    this.memories = getMemories();
    this.updateGrid();
    ScrollTrigger.refresh();
  }
}