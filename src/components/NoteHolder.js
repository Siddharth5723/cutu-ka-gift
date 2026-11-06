import { marked } from 'marked';
import { getNote, saveNote } from '../utils/storage.js';

marked.setOptions({
  breaks: true,
  gfm: true,
  headerIds: false,
  mangle: false,
});

const TOOLBAR_BUTTONS = [
  { tag: 'strong', symbol: 'B', title: 'Bold (Ctrl+B)', shortcut: 'b' },
  { tag: 'em', symbol: 'I', title: 'Italic (Ctrl+I)', shortcut: 'i' },
  { tag: 'code', symbol: '`', title: 'Inline Code', shortcut: null },
  { tag: 'a', symbol: '🔗', title: 'Link', shortcut: 'l' },
  { tag: 'h2', symbol: 'H2', title: 'Heading 2', shortcut: null },
  { tag: 'ul', symbol: '•', title: 'Bullet List', shortcut: null },
  { tag: 'ol', symbol: '1.', title: 'Numbered List', shortcut: null },
];

const MARKDOWN_WRAPPERS = {
  strong: ['**', '**'],
  em: ['*', '*'],
  code: ['`', '`'],
  a: ['[', '](url)'],
  h2: ['## ', '\n'],
  ul: ['- ', '\n'],
  ol: ['1. ', '\n'],
};

export class NoteHolder extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.content = '';
    this.debounceTimer = null;
    this.isComposing = false;
  }
  
  connectedCallback() {
    this.loadContent();
    this.render();
    this.setupEventListeners();
  }
  
  disconnectedCallback() {
    this.removeEventListeners();
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
  }
  
  loadContent() {
    this.content = getNote() || '';
  }
  
  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          max-width: 700px;
          margin: 0 auto;
        }
        
        .note-holder {
          background: linear-gradient(145deg, #FFF8F0 0%, #F5EDE3 100%);
          border-radius: 24px;
          padding: 32px;
          box-shadow: 
            0 20px 60px rgba(45, 27, 27, 0.12),
            0 8px 24px rgba(45, 27, 27, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(196, 30, 58, 0.1);
          position: relative;
        }
        
        .note-holder::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 4px;
          background: linear-gradient(90deg, #C41E3A, #E84A5F);
          border-radius: 0 0 4px 4px;
        }
        
        .note-holder::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 40px;
          height: 2px;
          background: repeating-linear-gradient(
            90deg,
            transparent,
            transparent 10px,
            rgba(196, 30, 58, 0.2) 10px,
            rgba(196, 30, 58, 0.2) 20px
          );
        }
        
        .toolbar {
          display: flex;
          gap: 8px;
          padding: 12px 16px;
          margin: -32px -32px 24px -32px;
          background: rgba(196, 30, 58, 0.05);
          border-radius: 24px 24px 0 0;
          border-bottom: 1px solid rgba(196, 30, 58, 0.1);
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .toolbar-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(196, 30, 58, 0.15);
          color: #8B152A;
          font-family: 'Inter', sans-serif;
          font-size: 13px;
          font-weight: 600;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        
        .toolbar-btn:hover {
          background: #C41E3A;
          color: #FDF6F0;
          border-color: #C41E3A;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(196, 30, 58, 0.3);
        }
        
        .toolbar-btn:active {
          transform: translateY(0);
        }
        
        .toolbar-btn.kbd::after {
          content: attr(data-kbd);
          position: absolute;
          bottom: -18px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          color: #8B152A;
          opacity: 0.7;
          white-space: nowrap;
          pointer-events: none;
        }
        
        .editor-wrapper {
          position: relative;
        }
        
        .editor {
          min-height: 200px;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: #2D1B1B;
          background: transparent;
          border: none;
          outline: none;
          resize: none;
          width: 100%;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        
        .editor::placeholder {
          color: #8B152A;
          opacity: 0.4;
          font-family: 'Dancing Script', cursive;
          font-size: 20px;
        }
        
        .editor:focus {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
        }
        
        .preview {
          display: none;
          padding: 20px;
          font-family: 'Inter', sans-serif;
          font-size: 16px;
          line-height: 1.7;
          color: #2D1B1B;
        }
        
        .preview h2 {
          font-family: 'Dancing Script', cursive;
          font-size: 1.8em;
          color: #8B152A;
          margin: 1.2em 0 0.6em;
          padding-bottom: 0.3em;
          border-bottom: 2px solid #E84A5F;
        }
        
        .preview p {
          margin: 0.8em 0;
        }
        
        .preview strong { color: #8B152A; }
        .preview em { color: #5D4A4A; }
        .preview code {
          background: rgba(196, 30, 58, 0.1);
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .preview a {
          color: #C41E3A;
          text-decoration: underline;
        }
        .preview ul, .preview ol {
          margin: 0.8em 0;
          padding-left: 1.5em;
        }
        .preview li { margin: 0.4em 0; }
        
        .mode-toggle {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          border: 1px solid rgba(196, 30, 58, 0.15);
          color: #8B152A;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
          backdrop-filter: blur(4px);
        }
        
        .mode-toggle:hover {
          background: #C41E3A;
          color: #FDF6F0;
          border-color: #C41E3A;
        }
        
        .actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px dashed rgba(196, 30, 58, 0.2);
          justify-content: center;
          flex-wrap: wrap;
        }
        
        .action-btn {
          padding: 12px 24px;
          border-radius: 12px;
          font-family: 'Inter', sans-serif;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, #C41E3A, #E84A5F);
          color: #FDF6F0;
          border: none;
          box-shadow: 0 4px 16px rgba(196, 30, 58, 0.3);
        }
        
        .action-btn.primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(196, 30, 58, 0.4);
        }
        
        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.7);
          color: #8B152A;
          border: 1px solid rgba(196, 30, 58, 0.2);
        }
        
        .action-btn.secondary:hover {
          background: #F5EDE3;
          border-color: rgba(196, 30, 58, 0.4);
        }
        
        .saved-indicator {
          position: absolute;
          bottom: 16px;
          left: 50%;
          transform: translateX(-50%) translateY(20px);
          opacity: 0;
          background: #C41E3A;
          color: #FDF6F0;
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 500;
          transition: all 0.3s ease;
          pointer-events: none;
        }
        
        .saved-indicator.show {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        
        @media (max-width: 600px) {
          .note-holder {
            padding: 24px 20px;
            border-radius: 16px;
          }
          
          .toolbar {
            margin: -24px -20px 20px -20px;
            padding: 10px 12px;
            gap: 6px;
          }
          
          .toolbar-btn {
            width: 32px;
            height: 32px;
            font-size: 12px;
          }
          
          .editor {
            font-size: 15px;
            padding: 16px;
          }
        }
      </style>
      
      <div class="note-holder">
        <div class="toolbar" id="toolbar"></div>
        
        <div class="editor-wrapper">
          <button class="mode-toggle" id="modeToggle" aria-label="Toggle preview" title="Toggle preview">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
          <div class="editor" id="editor" contenteditable="true" spellcheck="true" data-placeholder="Write your love note here..."></div>
          <div class="preview" id="preview"></div>
        </div>
        
        <div class="actions">
          <button class="action-btn secondary" id="exportBtn">Export as .md</button>
          <button class="action-btn secondary" id="importBtn">Import .md</button>
          <input type="file" id="importFile" accept=".md,.txt" style="display: none;">
          <button class="action-btn primary" id="saveBtn">Save Note</button>
        </div>
        
        <div class="saved-indicator" id="savedIndicator">Saved! 💕</div>
      </div>
    `;
    
    this.renderToolbar();
    this.editor = this.shadowRoot.getElementById('editor');
    this.preview = this.shadowRoot.getElementById('preview');
    this.editor.innerText = this.content;
    this.updatePreview();
  }
  
  renderToolbar() {
    const toolbar = this.shadowRoot.getElementById('toolbar');
    toolbar.innerHTML = TOOLBAR_BUTTONS.map(btn => `
      <button 
        class="toolbar-btn${btn.shortcut ? ' kbd' : ''}" 
        data-tag="${btn.tag}"
        data-shortcut="${btn.shortcut || ''}"
        title="${btn.title}"
        ${btn.shortcut ? `data-kbd="Ctrl+${btn.shortcut.toUpperCase()}"` : ''}
      >${btn.symbol}</button>
    `).join('');
  }
  
  setupEventListeners() {
    this.editor.addEventListener('input', () => this.onInput());
    this.editor.addEventListener('keydown', (e) => this.onKeyDown(e));
    this.editor.addEventListener('compositionstart', () => { this.isComposing = true; });
    this.editor.addEventListener('compositionend', () => { this.isComposing = false; });
    
    this.shadowRoot.getElementById('toolbar').addEventListener('click', (e) => {
      const btn = e.target.closest('.toolbar-btn');
      if (btn) this.applyFormat(btn.dataset.tag);
    });
    
    this.shadowRoot.getElementById('modeToggle').addEventListener('click', () => this.togglePreview());
    this.shadowRoot.getElementById('saveBtn').addEventListener('click', () => this.save());
    this.shadowRoot.getElementById('exportBtn').addEventListener('click', () => this.exportMarkdown());
    this.shadowRoot.getElementById('importBtn').addEventListener('click', () => {
      this.shadowRoot.getElementById('importFile').click();
    });
    this.shadowRoot.getElementById('importFile').addEventListener('change', (e) => this.importMarkdown(e));
  }
  
  removeEventListeners() {
    this.editor.removeEventListener('input', () => this.onInput());
    this.editor.removeEventListener('keydown', (e) => this.onKeyDown(e));
  }
  
  onInput() {
    if (this.isComposing) return;
    this.content = this.editor.innerText;
    this.updatePreview();
    this.debouncedSave();
  }
  
  onKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
      const shortcuts = { 'b': 'strong', 'i': 'em', 'l': 'a' };
      if (shortcuts[e.key.toLowerCase()]) {
        e.preventDefault();
        this.applyFormat(shortcuts[e.key.toLowerCase()]);
      }
    }
  }
  
  applyFormat(tag) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);
    if (!this.editor.contains(range.commonAncestorContainer)) return;
    
    const wrappers = MARKDOWN_WRAPPERS[tag];
    if (!wrappers) return;
    
    const [prefix, suffix] = wrappers;
    const selectedText = range.toString();
    
    if (selectedText) {
      const newText = prefix + selectedText + suffix;
      document.execCommand('insertText', false, newText);
    } else {
      document.execCommand('insertText', false, prefix + suffix);
      const newRange = document.createRange();
      newRange.setStart(range.endContainer, range.endOffset - suffix.length);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    
    this.editor.focus();
    this.onInput();
  }
  
  togglePreview() {
    const isPreview = this.preview.style.display === 'block';
    this.preview.style.display = isPreview ? 'none' : 'block';
    this.editor.style.display = isPreview ? 'block' : 'none';
    this.shadowRoot.getElementById('modeToggle').innerHTML = isPreview 
      ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`
      : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2z"></path><polyline points="9 7 13 11 9 15"></polyline></svg>`;
  }
  
  updatePreview() {
    this.preview.innerHTML = marked.parse(this.content || '');
  }
  
  debouncedSave() {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.save(), 500);
  }
  
  save() {
    this.content = this.editor.innerText;
    if (saveNote(this.content)) {
      this.showSavedIndicator();
    }
  }
  
  showSavedIndicator() {
    const indicator = this.shadowRoot.getElementById('savedIndicator');
    indicator.classList.add('show');
    setTimeout(() => indicator.classList.remove('show'), 2000);
  }
  
  exportMarkdown() {
    const blob = new Blob([this.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anniversary-note-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  importMarkdown(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      this.content = e.target.result;
      this.editor.innerText = this.content;
      this.updatePreview();
      this.save();
    };
    reader.readAsText(file);
    event.target.value = '';
  }
}

customElements.define('note-holder', NoteHolder);