import { getMusicEnabled, getMusicVolume, setMusicEnabled, setMusicVolume } from './storage.js';

let audioContext = null;
let audioElement = null;
let gainNode = null;
let isPlaying = false;
let isInitialized = false;
let onStateChange = null;

export function initAudio(onChangeCallback) {
  onStateChange = onChangeCallback;
  
  if (isInitialized) return Promise.resolve();
  
  audioElement = new Audio();
  audioElement.loop = true;
  audioElement.preload = 'auto';
  audioElement.src = '/audio/ambient-piano.mp3';
  
  return new Promise((resolve) => {
    audioElement.addEventListener('canplaythrough', () => {
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        gainNode = audioContext.createGain();
        gainNode.gain.value = getMusicVolume();
        
        const source = audioContext.createMediaElementSource(audioElement);
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        isInitialized = true;
        
        if (getMusicEnabled()) {
          play().catch(() => {});
        }
        
        resolve();
      } catch (e) {
        console.warn('Web Audio API not supported:', e);
        resolve();
      }
    }, { once: true });
    
    audioElement.addEventListener('error', () => {
      console.warn('Failed to load audio');
      resolve();
    }, { once: true });
    
    audioElement.load();
  });
}

export async function play() {
  if (!isInitialized) await initAudio();
  
  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }
  
  try {
    await audioElement.play();
    isPlaying = true;
    notifyStateChange();
    return true;
  } catch (e) {
    console.warn('Autoplay prevented:', e);
    isPlaying = false;
    notifyStateChange();
    return false;
  }
}

export function pause() {
  if (audioElement && !audioElement.paused) {
    audioElement.pause();
    isPlaying = false;
    notifyStateChange();
  }
}

export function toggle() {
  if (isPlaying) {
    pause();
    setMusicEnabled(false);
  } else {
    play().then(success => {
      if (success) setMusicEnabled(true);
    });
  }
  return isPlaying;
}

export function setVolume(volume) {
  const clamped = Math.max(0, Math.min(1, volume));
  if (gainNode) {
    gainNode.gain.value = clamped;
  }
  if (audioElement) {
    audioElement.volume = clamped;
  }
  setMusicVolume(clamped);
}

export function getVolume() {
  return getMusicVolume();
}

export function getIsPlaying() {
  return isPlaying;
}

export function getIsEnabled() {
  return getMusicEnabled();
}

function notifyStateChange() {
  if (onStateChange) {
    onStateChange({ isPlaying, isEnabled: getMusicEnabled(), volume: getMusicVolume() });
  }
}

export function cleanup() {
  if (audioElement) {
    audioElement.pause();
    audioElement.src = '';
    audioElement = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  gainNode = null;
  isInitialized = false;
  isPlaying = false;
}