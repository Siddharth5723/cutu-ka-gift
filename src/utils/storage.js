const STORAGE_KEYS = {
  MEMORIES: 'anniversary_memories',
  NOTE: 'anniversary_note',
  MUSIC_ENABLED: 'anniversary_music_enabled',
  MUSIC_VOLUME: 'anniversary_music_volume',
};

export function getMemories() {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MEMORIES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveMemories(memories) {
  try {
    localStorage.setItem(STORAGE_KEYS.MEMORIES, JSON.stringify(memories));
    return true;
  } catch (e) {
    console.warn('Failed to save memories:', e);
    return false;
  }
}

export function addMemory(file, caption = '') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const memories = getMemories();
      const newMemory = {
        id: Date.now().toString(),
        dataUrl: e.target.result,
        caption,
        order: memories.length,
        createdAt: new Date().toISOString(),
      };
      memories.push(newMemory);
      if (saveMemories(memories)) {
        resolve(newMemory);
      } else {
        reject(new Error('Failed to save'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function removeMemory(id) {
  const memories = getMemories().filter(m => m.id !== id);
  return saveMemories(memories);
}

export function updateMemoryCaption(id, caption) {
  const memories = getMemories().map(m => 
    m.id === id ? { ...m, caption } : m
  );
  return saveMemories(memories);
}

export function reorderMemories(memories) {
  return saveMemories(memories.map((m, i) => ({ ...m, order: i })));
}

export function getNote() {
  try {
    return localStorage.getItem(STORAGE_KEYS.NOTE) || '';
  } catch {
    return '';
  }
}

export function saveNote(content) {
  try {
    localStorage.setItem(STORAGE_KEYS.NOTE, content);
    return true;
  } catch (e) {
    console.warn('Failed to save note:', e);
    return false;
  }
}

export function getMusicEnabled() {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.MUSIC_ENABLED);
    return val !== 'false';
  } catch {
    return true;
  }
}

export function setMusicEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEYS.MUSIC_ENABLED, String(enabled));
    return true;
  } catch {
    return false;
  }
}

export function getMusicVolume() {
  try {
    const val = localStorage.getItem(STORAGE_KEYS.MUSIC_VOLUME);
    return val ? parseFloat(val) : 0.15;
  } catch {
    return 0.15;
  }
}

export function setMusicVolume(volume) {
  try {
    localStorage.setItem(STORAGE_KEYS.MUSIC_VOLUME, String(volume));
    return true;
  } catch {
    return false;
  }
}

export function exportData() {
  return {
    memories: getMemories(),
    note: getNote(),
    musicEnabled: getMusicEnabled(),
    musicVolume: getMusicVolume(),
    exportedAt: new Date().toISOString(),
  };
}

export function importData(data) {
  try {
    if (data.memories) saveMemories(data.memories);
    if (data.note !== undefined) saveNote(data.note);
    if (data.musicEnabled !== undefined) setMusicEnabled(data.musicEnabled);
    if (data.musicVolume !== undefined) setMusicVolume(data.musicVolume);
    return true;
  } catch {
    return false;
  }
}