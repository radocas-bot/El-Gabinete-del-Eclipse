/* ==========================================================================
   src/core/materials.js — Cached PBR Materials & Dynamic UV Emissive Registry
   ========================================================================== */
(function (SR) {
  'use strict';

  const materials = {};
  const uvRegistry = [];

  function registerUVMaterial(mat, maxIntensity) {
    if (!mat) return mat;
    const maxI = maxIntensity !== undefined ? maxIntensity : 2.2;
    mat.userData = mat.userData || {};
    mat.userData.isUVMaterial = true;

    const existing = uvRegistry.find(function (entry) { return entry.mat === mat; });
    if (existing) {
      existing.maxIntensity = maxI;
      return mat;
    }

    const active = !!(SR.State && SR.State.data && SR.State.data.uvActive);
    const factor = active ? 1 : 0;
    if ('emissiveIntensity' in mat) {
      mat.emissiveIntensity = factor * maxI;
    }
    if (mat.userData.uvFadeOpacity) {
      mat.opacity = factor;
    }

    uvRegistry.push({
      mat: mat,
      maxIntensity: maxI,
      factor: factor
    });
    return mat;
  }

  function updateUV(dt) {
    const target = (SR.State && SR.State.data && SR.State.data.uvActive) ? 1 : 0;
    const step = Math.min(1, (dt || 0.016) * 4.8);
    for (let i = 0; i < uvRegistry.length; i++) {
      const entry = uvRegistry[i];
      entry.factor += (target - entry.factor) * step;
      if (Math.abs(target - entry.factor) < 0.002) {
        entry.factor = target;
      }
      if ('emissiveIntensity' in entry.mat) {
        entry.mat.emissiveIntensity = entry.factor * entry.maxIntensity;
      }
      if (entry.mat.userData && entry.mat.userData.uvFadeOpacity) {
        entry.mat.opacity = entry.factor;
      }
    }
  }

  function syncUVInstant() {
    const target = (SR.State && SR.State.data && SR.State.data.uvActive) ? 1 : 0;
    for (let i = 0; i < uvRegistry.length; i++) {
      const entry = uvRegistry[i];
      entry.factor = target;
      if ('emissiveIntensity' in entry.mat) {
        entry.mat.emissiveIntensity = target * entry.maxIntensity;
      }
      if (entry.mat.userData && entry.mat.userData.uvFadeOpacity) {
        entry.mat.opacity = target;
      }
    }
  }

  function buildMaterial(name) {
    const T = SR.Textures;
    let mat;

    switch (name) {
      case 'mahogany': {
        const tex = T.mahogany();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.016,
          roughness: 0.36,
          metalness: 0.08,
          envMapIntensity: 0.9
        });
        break;
      }
      case 'walnut': {
        const tex = T.walnut();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.016,
          roughness: 0.42,
          metalness: 0.06,
          envMapIntensity: 0.85
        });
        break;
      }
      case 'darkWood': {
        const tex = T.darkWood();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.016,
          roughness: 0.48,
          metalness: 0.06,
          envMapIntensity: 0.78
        });
        break;
      }
      case 'damaskWall': {
        const tex = T.damask();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.015,
          roughness: 0.72,
          metalness: 0.14,
          envMapIntensity: 0.7
        });
        break;
      }
      case 'slate': {
        const tex = T.slate();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.02,
          roughness: 0.66,
          metalness: 0.12,
          envMapIntensity: 0.8
        });
        break;
      }
      case 'marble': {
        const tex = T.marble();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          roughness: 0.20,
          metalness: 0.10,
          envMapIntensity: 1.15
        });
        break;
      }
      case 'brass': {
        const tex = T.brass();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.008,
          color: 0xf7d688,
          roughness: 0.24,
          metalness: 0.91,
          envMapIntensity: 1.35
        });
        break;
      }
      case 'agedBrass': {
        const tex = T.brass();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.014,
          color: 0xbd914a,
          roughness: 0.42,
          metalness: 0.84,
          envMapIntensity: 1.15
        });
        break;
      }
      case 'gold': {
        const tex = T.brass();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.005,
          color: 0xffe078,
          emissive: 0x422b05,
          emissiveIntensity: 0.20,
          roughness: 0.16,
          metalness: 0.95,
          envMapIntensity: 1.45
        });
        break;
      }
      case 'copper': {
        const tex = T.brass();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.009,
          color: 0xdf8256,
          roughness: 0.30,
          metalness: 0.88,
          envMapIntensity: 1.25
        });
        break;
      }
      case 'silver': {
        mat = new THREE.MeshStandardMaterial({
          color: 0xe3ebf6,
          roughness: 0.18,
          metalness: 0.95,
          envMapIntensity: 1.45
        });
        break;
      }
      case 'iron': {
        const tex = T.iron();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.02,
          color: 0x676f7c,
          roughness: 0.50,
          metalness: 0.82,
          envMapIntensity: 1.1
        });
        break;
      }
      case 'darkIron': {
        const tex = T.iron();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.022,
          color: 0x3e444f,
          roughness: 0.56,
          metalness: 0.84,
          envMapIntensity: 1.05
        });
        break;
      }
      case 'obsidian': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x161024,
          emissive: 0x26104a,
          emissiveIntensity: 0.28,
          roughness: 0.12,
          metalness: 0.22,
          clearcoat: 1.0,
          clearcoatRoughness: 0.08
        });
        break;
      }
      case 'velvet': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x691620,
          roughness: 0.92,
          metalness: 0.02
        });
        break;
      }
      case 'parchment': {
        const tex = T.parchment();
        mat = new THREE.MeshStandardMaterial({
          map: tex.map,
          bumpMap: tex.bumpMap,
          bumpScale: 0.008,
          roughness: 0.85,
          metalness: 0.0
        });
        break;
      }
      case 'glass': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xdceeff,
          roughness: 0.08,
          metalness: 0.08,
          transparent: true,
          opacity: 0.24,
          clearcoat: 1.0,
          clearcoatRoughness: 0.06,
          depthWrite: false
        });
        break;
      }
      case 'mirror': {
        mat = new THREE.MeshStandardMaterial({
          color: 0xeef5ff,
          roughness: 0.05,
          metalness: 0.98
        });
        break;
      }
      case 'rubyGlass': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xd61e34,
          emissive: 0x7a0c1c,
          emissiveIntensity: 0.55,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.68,
          clearcoat: 1.0
        });
        break;
      }
      case 'sapphireGlass': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0x2278e8,
          emissive: 0x0e3c8f,
          emissiveIntensity: 0.6,
          roughness: 0.1,
          metalness: 0.1,
          transparent: true,
          opacity: 0.68,
          clearcoat: 1.0
        });
        break;
      }
      case 'amberGlass': {
        mat = new THREE.MeshPhysicalMaterial({
          color: 0xf4a828,
          emissive: 0x945208,
          emissiveIntensity: 0.55,
          roughness: 0.12,
          metalness: 0.1,
          transparent: true,
          opacity: 0.68,
          clearcoat: 1.0
        });
        break;
      }
      case 'warmGlow': {
        mat = new THREE.MeshStandardMaterial({
          color: 0xfff0c8,
          emissive: 0xffb852,
          emissiveIntensity: 1.75,
          roughness: 0.3,
          metalness: 0.0
        });
        break;
      }
      case 'uvEmissive': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x6ad8ff,
          emissive: 0x58c8ff,
          emissiveIntensity: 0.0,
          roughness: 0.35,
          metalness: 0.1
        });
        registerUVMaterial(mat, 2.2);
        break;
      }
      case 'leatherRed': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x7c1f24,
          bumpMap: T.leather().bumpMap,
          bumpScale: 0.012,
          roughness: 0.68,
          metalness: 0.04
        });
        break;
      }
      case 'leatherGreen': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x1e4d38,
          bumpMap: T.leather().bumpMap,
          bumpScale: 0.012,
          roughness: 0.68,
          metalness: 0.04
        });
        break;
      }
      case 'leatherBlue': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x1d3b66,
          bumpMap: T.leather().bumpMap,
          bumpScale: 0.012,
          roughness: 0.68,
          metalness: 0.04
        });
        break;
      }
      case 'leatherBrown': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x5d3820,
          bumpMap: T.leather().bumpMap,
          bumpScale: 0.012,
          roughness: 0.7,
          metalness: 0.04
        });
        break;
      }
      case 'leatherPurple': {
        mat = new THREE.MeshStandardMaterial({
          color: 0x4b245c,
          bumpMap: T.leather().bumpMap,
          bumpScale: 0.012,
          roughness: 0.68,
          metalness: 0.04
        });
        break;
      }
      default: {
        console.warn('[SR.Materials] Unknown material requested:', name);
        mat = new THREE.MeshStandardMaterial({
          color: 0x998877,
          roughness: 0.5,
          metalness: 0.2
        });
      }
    }

    mat.userData = mat.userData || {};
    mat.userData.isSharedMaterial = true;
    mat.userData.materialName = name;
    return mat;
  }

  function get(name) {
    if (!materials[name]) {
      materials[name] = buildMaterial(name);
    }
    return materials[name];
  }

  function clone(name, overrides) {
    const base = get(name).clone();
    base.userData = Object.assign({}, base.userData, { isSharedMaterial: false });
    if (overrides) {
      Object.assign(base, overrides);
    }
    return base;
  }

  SR.Materials = {
    get: get,
    clone: clone,
    registerUVMaterial: registerUVMaterial,
    updateUV: updateUV,
    syncUVInstant: syncUVInstant
  };
})(window.SR = window.SR || {});
