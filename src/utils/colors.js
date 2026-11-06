export const COLORS = {
  cherry: 0xC41E3A,
  cherryDark: 0x8B152A,
  cherryLight: 0xE84A5F,
  offWhite: 0xFDF6F0,
  offWhiteMuted: 0xF5EDE3,
  parchment: 0xFFF8F0,
  ink: 0x2D1B1B,
  inkMuted: 0x5D4A4A,
  gold: 0xD4A843,
  white: 0xFFFFFF,
  black: 0x000000,
};

export const HEART_COLORS = {
  primary: 0xC41E3A,
  emissive: 0xC41E3A,
  highlight: 0xE84A5F,
  shadow: 0x8B152A,
};

export const GARDEN_COLORS = {
  grassLight: 0x4A7C2A,
  grassDark: 0x2D5A1A,
  flowerPink: 0xE8A8B8,
  flowerWhite: 0xFFF0F0,
  flowerYellow: 0xFFF8A8,
  stemGreen: 0x3D7A2A,
  soil: 0x5D4A3A,
};

export const BUTTERFLY_COLORS = [
  0xE84A5F, 0xFF6B7A, 0xFF8FA3, 0xFFB3C1,
  0xFFD1DC, 0xFFF0F0, 0xFFE4E1, 0xFFC0CB,
  0xFF69B4, 0xDB7093, 0xFF1493, 0xC71585,
];

export const PETAL_COLORS = [
  0xC41E3A, 0xE84A5F, 0xFF6B7A, 0xFF8FA3,
  0xFDF6F0, 0xFFF0F0, 0xFFE4E1, 0xFFD1DC,
];

export function lerpColor(color1, color2, t) {
  const c1 = new THREE.Color(color1);
  const c2 = new THREE.Color(color2);
  return c1.lerp(c2, t).getHex();
}

import * as THREE from 'three';