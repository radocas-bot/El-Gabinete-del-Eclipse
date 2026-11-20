/* ==========================================================================
   src/main.js — Renderer, Post-Processing, Interaction Raycaster & Main Loop
   ========================================================================== */
(function (SR) {
  'use strict';

  SR.Stations = SR.Stations || {};
  SR.Interactables = SR.Interactables || [];

  const interactiveMap = {};

  function registerInteractive(obj, cfg) {
    if (!obj || !cfg || !cfg.id) {
      console.warn('[SR.registerInteractive] Invalid registration:', cfg);
      return null;
    }

    // Replace existing entry if same id is re-registered
    if (interactiveMap[cfg.id]) {
      unregisterInteractive(cfg.id);
    }

    const entry = Object.assign({}, cfg, { object: obj });
    SR.Interactables.push(entry);
    interactiveMap[cfg.id] = entry;

    obj.userData = obj.userData || {};
    if (!Array.isArray(obj.userData.registeredInteractiveIds)) {
      obj.userData.registeredInteractiveIds = [];
    }
    if (obj.userData.registeredInteractiveIds.indexOf(cfg.id) === -1) {
      obj.userData.registeredInteractiveIds.push(cfg.id);
    }

    obj.traverse(function (child) {
      if (child.isMesh) {
        child.userData = child.userData || {};
        child.userData.interactiveId = cfg.id;
      }
    });

    return entry;
  }

  function unregisterInteractive(id) {
    const entry = interactiveMap[id];
    if (!entry) return;
    if (entry.object) {
      if (entry.object.userData && Array.isArray(entry.object.userData.registeredInteractiveIds)) {
        const ridIdx = entry.object.userData.registeredInteractiveIds.indexOf(id);
        if (ridIdx !== -1) entry.object.userData.registeredInteractiveIds.splice(ridIdx, 1);
      }
      entry.object.traverse(function (child) {
        if (child.isMesh && child.userData && child.userData.interactiveId === id) {
          delete child.userData.interactiveId;
        }
      });
    }
    delete interactiveMap[id];
    const idx = SR.Interactables.indexOf(entry);
    if (idx !== -1) SR.Interactables.splice(idx, 1);
  }

  function getInteractive(id) {
    return interactiveMap[id] || null;
  }

  SR.registerInteractive = registerInteractive;
  SR.unregisterInteractive = unregisterInteractive;
  SR.getInteractive = getInteractive;

  // ---------- Core Three.js State ----------
  let renderer = null;
  let scene = null;
  let camera = null;
  let composer = null;
  let renderPass = null;
  let bloomPass = null;
  let outputPass = null;
  let canvas = null;

  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();

  // Pointer & Drag State (Mouse)
  let isPointerDown = false;
  let isDragging = false;
  let downX = 0;
  let downY = 0;
  let lastX = 0;
  let lastY = 0;
  let lastTouchEndTime = 0;

  // Native Touch State (1-finger inertia pan/tap + 2-finger pinch zoom/exit)
  let touchMode = 'none'; // 'none' | 'single' | 'pinch'
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;
  let touchLastX = 0;
  let touchLastY = 0;
  let touchLastMoveTime = 0;
  let touchMoved = false;
  let touchWasPinching = false;
  let touchVelX = 0;
  let touchVelY = 0;
  let pinchPrevDist = 0;

  function isTouchEnvironment() {
    return (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      ('ontouchstart' in window && navigator.maxTouchPoints > 0)
    );
  }

  function getTargetPixelRatio() {
    const cap = isTouchEnvironment() ? 1.5 : 2.0;
    return Math.min(window.devicePixelRatio || 1, cap);
  }

  // Hover & Safe Highlight State (restores exact original materials on unhover!)
  let hoveredEntry = null;
  let highlightedMeshes = [];

  // Timing & UV Atmosphere
  let lastTime = 0;
  let elapsed = 0;
  let uvAtmoFactor = 0;
  let lastWholeSecond = -1;
  let autosaveTimer = 0;
  let rafId = null;

  function isModalOpen() {
    const ids = ['inspector-modal', 'journal-modal', 'hint-modal', 'settings-modal'];
    for (let i = 0; i < ids.length; i++) {
      const el = document.getElementById(ids[i]);
      if (el && !el.classList.contains('hidden')) return true;
    }
    return false;
  }

  function isInteractiveEnabled(entry, currentView) {
    if (!entry || !entry.object) return false;
    if (typeof entry.disabled === 'function') {
      if (entry.disabled(SR.State.data)) return false;
    } else if (entry.disabled) {
      return false;
    }
    if (entry.activeViews && entry.activeViews.length > 0) {
      if (entry.activeViews.indexOf(currentView) === -1) return false;
    }
    // Verify entire ancestor chain is visible
    let node = entry.object;
    while (node) {
      if (node.visible === false) return false;
      node = node.parent;
    }
    return true;
  }

  function isMeshVisible(mesh) {
    let node = mesh;
    while (node) {
      if (node.visible === false) return false;
      node = node.parent;
    }
    return true;
  }

  function evalProp(val) {
    return typeof val === 'function' ? val(SR.State.data) : val;
  }

  // ---------- Safe Hover Highlight (never mutates shared cached materials!) ----------
  function clearHighlight() {
    for (let i = 0; i < highlightedMeshes.length; i++) {
      const rec = highlightedMeshes[i];
      if (rec.mesh) {
        rec.mesh.material = rec.origMaterial;
      }
      if (rec.tempMaterial) {
        rec.tempMaterial.dispose();
      }
    }
    highlightedMeshes = [];
  }

  function applyHighlight(entry) {
    clearHighlight();
    if (!entry) return;
    const target = entry.highlightTarget || entry.object;
    if (!target) return;

    const highlightTint = new THREE.Color(0xc99d4e);
    target.traverse(function (child) {
      if (!child.isMesh || !child.material || Array.isArray(child.material)) return;
      const mat = child.material;
      // Skip invisible hitboxes, custom shaders, UV overlays, or basic additive beams
      if (!('emissive' in mat)) return;
      if (mat.transparent && mat.opacity <= 0.05) return;
      if (mat.userData && mat.userData.isUVMaterial) return;

      const clone = mat.clone();
      clone.emissive = mat.emissive.clone().lerp(highlightTint, 0.45);
      clone.emissiveIntensity = Math.max(mat.emissiveIntensity || 0, 0.28) + 0.14;
      child.material = clone;
      highlightedMeshes.push({
        mesh: child,
        origMaterial: mat,
        tempMaterial: clone
      });
    });
  }

  function raycastInteractables(clientX, clientY) {
    if (!canvas || !camera) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    pointerNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointerNDC, camera);

    const currentView = SR.Camera ? SR.Camera.getCurrentView() : 'room';
    const candidateObjects = [];
    for (let i = 0; i < SR.Interactables.length; i++) {
      const entry = SR.Interactables[i];
      if (isInteractiveEnabled(entry, currentView)) {
        candidateObjects.push(entry.object);
      }
    }
    if (candidateObjects.length === 0) return null;

    const hits = raycaster.intersectObjects(candidateObjects, true);
    hits.sort(function (a, b) { return a.distance - b.distance; });
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (hit.distance < 0.22) continue;
      if (!isMeshVisible(hit.object)) continue;

      // Walk up ancestor chain so nested inner interactives win in close-up views
      // while parent overview interactives still work seamlessly in room view.
      let node = hit.object;
      while (node) {
        const regIds = node.userData && node.userData.registeredInteractiveIds;
        if (Array.isArray(regIds) && regIds.length > 0) {
          for (let k = regIds.length - 1; k >= 0; k--) {
            const entry = interactiveMap[regIds[k]];
            if (entry && isInteractiveEnabled(entry, currentView)) {
              return { entry: entry, hit: hit };
            }
          }
        }
        node = node.parent;
      }

      // Fallback to direct mesh interactiveId
      const id = hit.object.userData && hit.object.userData.interactiveId;
      if (id) {
        const entry = interactiveMap[id];
        if (entry && isInteractiveEnabled(entry, currentView)) {
          return { entry: entry, hit: hit };
        }
      }
    }
    return null;
  }

  function updateHover(clientX, clientY) {
    if (!SR.State.data.started || SR.State.data.escaped || isModalOpen() || (SR.Camera && SR.Camera.isTransitioning())) {
      if (hoveredEntry) {
        hoveredEntry = null;
        clearHighlight();
      }
      if (SR.UI) {
        SR.UI.setTooltip(false);
        SR.UI.setCursor('');
      }
      return;
    }

    const result = raycastInteractables(clientX, clientY);
    if (result) {
      const entry = result.entry;
      if (hoveredEntry !== entry) {
        hoveredEntry = entry;
        applyHighlight(entry);
      }
      const selectedItem = SR.State.data.selectedItem;
      const itemDef = selectedItem ? SR.State.getItemDef(selectedItem) : null;
      const actionText = evalProp(entry.action) || (itemDef ? ('Usar ' + itemDef.shortName) : 'Examinar');
      const labelText = evalProp(entry.label) || '';
      const cursorType = evalProp(entry.cursor) || (selectedItem ? 'use' : 'interact');

      if (SR.UI) {
        SR.UI.setCursor(cursorType);
        SR.UI.setTooltip(true, actionText, labelText, clientX, clientY);
      }
    } else {
      if (hoveredEntry) {
        hoveredEntry = null;
        clearHighlight();
      }
      if (SR.UI) {
        SR.UI.setCursor('');
        SR.UI.setTooltip(false);
      }
    }
  }

  function onCanvasTap(clientX, clientY, isTouch) {
    if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return false;
    if (SR.Camera && SR.Camera.isTransitioning()) return false;

    if (isTouch && SR.UI) {
      SR.UI.setTooltip(false);
      if (typeof SR.UI.showTapRipple === 'function') {
        SR.UI.showTapRipple(clientX, clientY);
      }
    }

    let result = raycastInteractables(clientX, clientY);
    // Gentle 11px ergonomic tap forgiveness on small touch targets (dials, keys, switches)
    if (!result && isTouch) {
      const offsets = [[0, -11], [11, 0], [0, 11], [-11, 0]];
      for (let i = 0; i < offsets.length; i++) {
        result = raycastInteractables(clientX + offsets[i][0], clientY + offsets[i][1]);
        if (result) break;
      }
    }

    if (result && result.entry && typeof result.entry.onClick === 'function') {
      // Restore original materials before handler runs so stations see real material refs
      clearHighlight();
      hoveredEntry = null;
      if (SR.UI) SR.UI.setTooltip(false);
      result.entry.onClick(result.hit);
      return true;
    }
    return false;
  }

  function bindInputEvents() {
    canvas.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return;
      if (SR.Camera && SR.Camera.stopInertia) SR.Camera.stopInertia();
      isPointerDown = true;
      isDragging = false;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
    });

    window.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      if (performance.now() - lastTouchEndTime < 600) return;
      if (isPointerDown) {
        const totalDist = Math.hypot(e.clientX - downX, e.clientY - downY);
        const canPan = SR.Camera && SR.Camera.getCurrentView() === 'room' && SR.State.data.started && !SR.State.data.escaped && !isModalOpen();
        if (canPan && totalDist > 6) {
          if (!isDragging) {
            isDragging = true;
            canvas.classList.add('dragging');
            if (hoveredEntry) {
              hoveredEntry = null;
              clearHighlight();
            }
            if (SR.UI) SR.UI.setTooltip(false);
          }
          const dx = e.clientX - lastX;
          const dy = e.clientY - lastY;
          SR.Camera.panBy(dx, dy);
        }
        lastX = e.clientX;
        lastY = e.clientY;
      } else {
        updateHover(e.clientX, e.clientY);
      }
    });

    window.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'touch') return;
      if (e.button !== 0) return;
      const wasDown = isPointerDown;
      const wasDragging = isDragging;
      isPointerDown = false;
      isDragging = false;
      canvas.classList.remove('dragging');

      if (!wasDown || wasDragging) return;
      if (e.target !== canvas) return;
      onCanvasTap(e.clientX, e.clientY, false);
    });

    // ---- Native Fluid Touch Events (1-finger inertia drag/tap + 2-finger pinch zoom/exit) ----
    canvas.addEventListener('touchstart', function (e) {
      e.preventDefault();
      if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return;

      lastTouchEndTime = performance.now();
      if (SR.Camera && SR.Camera.stopInertia) SR.Camera.stopInertia();
      if (hoveredEntry) {
        hoveredEntry = null;
        clearHighlight();
      }
      if (SR.UI) SR.UI.setTooltip(false);

      if (e.touches.length === 1) {
        const t = e.touches[0];
        if (touchMode === 'pinch') {
          // Remaining finger after pinch: allow panning without triggering a tap
          touchMode = 'single';
          touchMoved = true;
          touchLastX = t.clientX;
          touchLastY = t.clientY;
          touchLastMoveTime = performance.now();
          touchVelX = 0;
          touchVelY = 0;
        } else {
          touchMode = 'single';
          touchStartX = t.clientX;
          touchStartY = t.clientY;
          touchLastX = t.clientX;
          touchLastY = t.clientY;
          touchStartTime = performance.now();
          touchLastMoveTime = touchStartTime;
          touchMoved = false;
          touchWasPinching = false;
          touchVelX = 0;
          touchVelY = 0;
        }
      } else if (e.touches.length >= 2) {
        touchMode = 'pinch';
        touchMoved = true;
        touchWasPinching = true;
        touchVelX = 0;
        touchVelY = 0;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        pinchPrevDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      }
    }, { passive: false });

    canvas.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return;

      const now = performance.now();
      lastTouchEndTime = now;

      if (e.touches.length >= 2) {
        touchMode = 'pinch';
        touchMoved = true;
        touchWasPinching = true;
        const t0 = e.touches[0];
        const t1 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        if (pinchPrevDist > 8 && dist > 8 && SR.Camera && typeof SR.Camera.onPinch === 'function') {
          SR.Camera.onPinch(dist / pinchPrevDist);
        }
        pinchPrevDist = dist;
        return;
      }

      if (e.touches.length === 1 && touchMode === 'single') {
        const t = e.touches[0];
        const totalDist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
        if (totalDist > 10) {
          touchMoved = true;
        }
        if (touchMoved && SR.Camera && SR.Camera.getCurrentView() === 'room') {
          const dx = t.clientX - touchLastX;
          const dy = t.clientY - touchLastY;
          const dtSec = Math.max(0.004, (now - touchLastMoveTime) / 1000);
          touchVelX = touchVelX * 0.4 + (dx / dtSec) * 0.6;
          touchVelY = touchVelY * 0.4 + (dy / dtSec) * 0.6;
          SR.Camera.panBy(dx, dy);
        }
        touchLastX = t.clientX;
        touchLastY = t.clientY;
        touchLastMoveTime = now;
      }
    }, { passive: false });

    function handleTouchEndOrCancel(e) {
      e.preventDefault();
      const now = performance.now();
      lastTouchEndTime = now;

      if (touchMode === 'pinch' && e.touches.length < 2) {
        if (SR.Camera && typeof SR.Camera.onPinchEnd === 'function') {
          SR.Camera.onPinchEnd();
        }
        if (e.touches.length === 1) {
          const t = e.touches[0];
          touchMode = 'single';
          touchMoved = true;
          touchLastX = t.clientX;
          touchLastY = t.clientY;
          touchLastMoveTime = now;
          touchVelX = 0;
          touchVelY = 0;
        } else {
          touchMode = 'none';
          touchWasPinching = false;
          touchMoved = false;
          pinchPrevDist = 0;
        }
        return;
      }

      if (e.touches.length === 0) {
        const elapsedMs = now - touchStartTime;
        if (
          e.type === 'touchend' &&
          touchMode === 'single' &&
          !touchWasPinching &&
          !touchMoved &&
          elapsedMs < 350
        ) {
          onCanvasTap(touchStartX, touchStartY, true);
        } else if (
          touchMode === 'single' &&
          touchMoved &&
          !touchWasPinching &&
          SR.Camera &&
          SR.Camera.getCurrentView() === 'room' &&
          (now - touchLastMoveTime) < 95 &&
          Math.hypot(touchVelX, touchVelY) > 35
        ) {
          if (typeof SR.Camera.fling === 'function') {
            SR.Camera.fling(touchVelX, touchVelY);
          }
        }

        touchMode = 'none';
        touchWasPinching = false;
        touchMoved = false;
        touchVelX = 0;
        touchVelY = 0;
        pinchPrevDist = 0;
      }
    }

    canvas.addEventListener('touchend', handleTouchEndOrCancel, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEndOrCancel, { passive: false });

    canvas.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return;
      if (SR.State.data.selectedItem) {
        SR.State.selectItem(null);
        SR.Audio.playClick(0.85);
      } else if (SR.Camera && SR.Camera.getCurrentView() !== 'room') {
        SR.Audio.playClick(0.85);
        SR.Camera.goBack();
      }
    });

    canvas.addEventListener('pointerleave', function () {
      if (!isPointerDown) {
        if (hoveredEntry) {
          hoveredEntry = null;
          clearHighlight();
        }
        if (SR.UI) {
          SR.UI.setTooltip(false);
          SR.UI.setCursor('');
        }
      }
    });

    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (!SR.State.data.started || SR.State.data.escaped || isModalOpen()) return;
      if (SR.Camera && typeof SR.Camera.onWheel === 'function') {
        SR.Camera.onWheel(e.deltaY);
        if (SR.Camera.isTransitioning()) {
          if (hoveredEntry) {
            hoveredEntry = null;
            clearHighlight();
          }
          if (SR.UI) SR.UI.setTooltip(false);
        }
      }
    }, { passive: false });
  }

  // ---------- Renderer, Environment & Postprocessing ----------
  function getViewportSize() {
    const vv = window.visualViewport;
    const w = Math.max(1, Math.round((vv && vv.width) || window.innerWidth || document.documentElement.clientWidth || 320));
    const h = Math.max(1, Math.round((vv && vv.height) || window.innerHeight || document.documentElement.clientHeight || 480));
    return { w: w, h: h };
  }

  function initRenderer() {
    canvas = document.getElementById('game-canvas');
    const vp = getViewportSize();

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x07060b);
    scene.fog = new THREE.FogExp2(0x0b0912, 0.017);

    camera = new THREE.PerspectiveCamera(54, vp.w / vp.h, 0.08, 40);

    if (!canvas) {
      console.error('[SR.App] Missing #game-canvas element');
      return;
    }

    // Attempt high-quality WebGL context first, with automatic mobile-safe fallback
    try {
      renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
    } catch (errPrimary) {
      console.warn('[SR.App] Primary WebGLRenderer failed, retrying safe fallback:', errPrimary);
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          antialias: false
        });
      } catch (errFallback) {
        console.error('[SR.App] WebGLRenderer unavailable on this device:', errFallback);
        renderer = null;
        return;
      }
    }

    try {
      renderer.setPixelRatio(getTargetPixelRatio());
      renderer.setSize(vp.w, vp.h, false);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.22;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (errCfg) {
      console.warn('[SR.App] Partial WebGLRenderer config fallback:', errCfg);
    }

    canvas.addEventListener('webglcontextlost', function (e) {
      e.preventDefault();
      console.warn('[SR.App] WebGL context lost');
    }, false);

    // PBR Image-Based Lighting from RoomEnvironment for rich brass, gold, glass & mirror reflections
    try {
      if (THREE.RoomEnvironment && renderer) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envRT = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04);
        scene.environment = envRT.texture;
        scene.environmentIntensity = 0.68;
        pmrem.dispose();
      }
    } catch (err) {
      console.warn('[SR.App] PMREM RoomEnvironment fallback:', err);
    }

    // Postprocessing pipeline: RenderPass -> UnrealBloomPass -> OutputPass
    try {
      if (renderer && THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass && THREE.OutputPass) {
        composer = new THREE.EffectComposer(renderer);
        composer.setPixelRatio(getTargetPixelRatio());
        composer.setSize(vp.w, vp.h);

        renderPass = new THREE.RenderPass(scene, camera);
        bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(vp.w, vp.h),
          0.30,
          0.48,
          0.84
        );
        outputPass = new THREE.OutputPass();

        composer.addPass(renderPass);
        composer.addPass(bloomPass);
        composer.addPass(outputPass);
      }
    } catch (err) {
      console.warn('[SR.App] EffectComposer disabled, using direct renderer:', err);
      composer = null;
    }
  }

  function applySettings() {
    const s = (SR.State && SR.State.data && SR.State.data.settings) || {};
    if (SR.Audio) {
      SR.Audio.setVolume(s.volume !== undefined ? s.volume : 0.75);
      SR.Audio.setMuted(!!s.muted);
    }
    if (bloomPass) {
      bloomPass.enabled = s.bloom !== false;
    }
    if (renderer) {
      const sh = s.shadows !== false;
      renderer.shadowMap.enabled = sh;
      renderer.shadowMap.needsUpdate = true;
      if (SR.Architecture && SR.Architecture.setShadowsEnabled) {
        SR.Architecture.setShadowsEnabled(sh);
      }
    }
  }

  function syncAll() {
    const stationOrder = ['door', 'clockBooks', 'desk', 'optics', 'telemetry', 'orrery'];
    for (let i = 0; i < stationOrder.length; i++) {
      const st = SR.Stations[stationOrder[i]];
      if (st && typeof st.syncFromState === 'function') {
        try {
          st.syncFromState();
        } catch (err) {
          console.error('[SR.App] syncFromState error in station', stationOrder[i], err);
        }
      }
    }
    if (SR.Materials && SR.Materials.syncUVInstant) {
      SR.Materials.syncUVInstant();
    }
    uvAtmoFactor = SR.State.data.uvActive ? 1 : 0;
    if (SR.Architecture && SR.Architecture.setUVFactor) {
      SR.Architecture.setUVFactor(uvAtmoFactor);
    }
    applySettings();
    if (SR.UI && typeof SR.UI.updateTimer === 'function') {
      SR.UI.updateTimer(Math.floor(SR.State.data.elapsedSeconds || 0));
    }
  }

  function handleResize() {
    if (!renderer || !camera) return;
    const vp = getViewportSize();
    const pr = getTargetPixelRatio();
    camera.aspect = vp.w / vp.h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(pr);
    renderer.setSize(vp.w, vp.h, false);
    if (composer) {
      try {
        composer.setPixelRatio(pr);
        composer.setSize(vp.w, vp.h);
      } catch (err) {
        console.warn('[SR.App] Composer resize fallback:', err);
        composer = null;
      }
    }
    if (bloomPass && bloomPass.resolution) {
      bloomPass.resolution.set(vp.w, vp.h);
    }
  }

  function stepFrame(dt) {
    elapsed += dt;

    // Update Camera
    if (SR.Camera) {
      try { SR.Camera.update(dt, elapsed); } catch (e) {}
    }

    // Update UV Materials & Atmospheric Light Tinting
    if (SR.Materials && SR.Materials.updateUV) {
      try { SR.Materials.updateUV(dt); } catch (e) {}
    }
    const uvTarget = (SR.State && SR.State.data && SR.State.data.uvActive) ? 1 : 0;
    if (Math.abs(uvTarget - uvAtmoFactor) > 0.001) {
      uvAtmoFactor += (uvTarget - uvAtmoFactor) * Math.min(1, dt * 4.5);
      if (SR.Architecture && SR.Architecture.setUVFactor) {
        try { SR.Architecture.setUVFactor(uvAtmoFactor); } catch (e) {}
      }
    }

    // Update Architecture & Props
    if (SR.Architecture && SR.Architecture.update) {
      try { SR.Architecture.update(dt, elapsed); } catch (e) {}
    }
    if (SR.Props && SR.Props.update) {
      try { SR.Props.update(dt, elapsed); } catch (e) {}
    }

    // Update all 6 Stations
    const keys = Object.keys(SR.Stations);
    for (let i = 0; i < keys.length; i++) {
      const st = SR.Stations[keys[i]];
      if (st && typeof st.update === 'function') {
        try { st.update(dt, elapsed); } catch (e) {}
      }
    }

    // Gameplay Timer & Periodic Autosave
    if (SR.State && SR.State.data && SR.State.data.started && !SR.State.data.escaped) {
      SR.State.data.elapsedSeconds += dt;
      const wholeSec = Math.floor(SR.State.data.elapsedSeconds);
      if (wholeSec !== lastWholeSecond) {
        lastWholeSecond = wholeSec;
        if (SR.UI && typeof SR.UI.updateTimer === 'function') {
          SR.UI.updateTimer(wholeSec);
        }
      }
      autosaveTimer += dt;
      if (autosaveTimer >= 15) {
        autosaveTimer = 0;
        SR.State.save();
      }
    }

    // Render Scene (auto-fallback to direct WebGLRenderer if composer fails on a mobile GPU)
    if (composer && renderer) {
      try {
        composer.render();
      } catch (err) {
        console.warn('[SR.App] Composer render failed, falling back to direct renderer:', err);
        composer = null;
        if (renderer && scene && camera) {
          renderer.render(scene, camera);
        }
      }
    } else if (renderer && scene && camera) {
      try {
        renderer.render(scene, camera);
      } catch (err) {
        console.warn('[SR.App] Direct render error:', err);
      }
    }
  }

  function animate(now) {
    rafId = requestAnimationFrame(animate);
    if (!lastTime) lastTime = now;
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    stepFrame(dt);
  }

  function safeCall(label, fn) {
    try {
      fn();
    } catch (err) {
      console.error('[SR.App] Error in ' + label + ':', err);
    }
  }

  function initAllModules() {
    safeCall('initRenderer', initRenderer);

    // Camera
    safeCall('Camera.init', function () {
      if (SR.Camera && SR.Camera.init && camera) {
        SR.Camera.init(camera);
      }
    });

    // Architecture & Decorative Props
    safeCall('Architecture.init', function () {
      if (SR.Architecture && SR.Architecture.init && scene) {
        SR.Architecture.init(scene);
        // Cap shadow map on mobile GPUs for smooth performance & memory safety
        if (isTouchEnvironment() && SR.Architecture.lights && SR.Architecture.lights.moonSpot) {
          SR.Architecture.lights.moonSpot.shadow.mapSize.width = 1024;
          SR.Architecture.lights.moonSpot.shadow.mapSize.height = 1024;
        }
      }
    });

    safeCall('Props.init', function () {
      if (SR.Props && SR.Props.init && scene) {
        SR.Props.init(scene);
      }
    });

    // 6 Interactive Puzzle Stations
    const stationOrder = ['door', 'clockBooks', 'desk', 'optics', 'telemetry', 'orrery'];
    for (let i = 0; i < stationOrder.length; i++) {
      const name = stationOrder[i];
      const st = SR.Stations[name];
      if (st && typeof st.init === 'function' && scene) {
        safeCall('Station.' + name + '.init', function () {
          st.init(scene);
        });
      }
    }

    // Ensure all world matrices across architecture, props & stations are fresh before first raycast/render
    if (scene) {
      safeCall('scene.updateMatrixWorld', function () {
        scene.updateMatrixWorld(true);
      });
    }

    // UI Systems — ALWAYS initialized independently so title/HUD buttons NEVER fail to bind!
    safeCall('UI.init', function () { if (SR.UI && typeof SR.UI.init === 'function') SR.UI.init(); });
    safeCall('Inspector.init', function () { if (SR.Inspector && typeof SR.Inspector.init === 'function') SR.Inspector.init(); });
    safeCall('Journal.init', function () { if (SR.Journal && typeof SR.Journal.init === 'function') SR.Journal.init(); });
    safeCall('Hints.init', function () { if (SR.Hints && typeof SR.Hints.init === 'function') SR.Hints.init(); });
    safeCall('Screens.init', function () { if (SR.Screens && typeof SR.Screens.init === 'function') SR.Screens.init(); });

    // Sync state listeners
    if (SR.State && typeof SR.State.on === 'function') {
      SR.State.on('stateLoaded', function () {
        syncAll();
      });
      SR.State.on('stateReset', function () {
        lastWholeSecond = -1;
        syncAll();
      });
      SR.State.on('viewChanged', function () {
        clearHighlight();
        hoveredEntry = null;
        if (SR.UI) SR.UI.setTooltip(false);
      });
    }

    safeCall('bindInputEvents', function () {
      if (canvas) bindInputEvents();
    });

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', function () {
      setTimeout(handleResize, 120);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    safeCall('syncAll', syncAll);

    // Start render loop
    lastTime = performance.now();
    animate(lastTime);
  }

  SR.App = {
    init: initAllModules,
    applySettings: applySettings,
    syncAll: syncAll,
    syncAllStations: syncAll,
    getScene: function () { return scene; },
    getCamera: function () { return camera; },
    getRenderer: function () { return renderer; }
  };

  // ---------- Automated QA / Debug Interface ----------
  window.__SR_DEBUG__ = {
    getState: function () {
      return SR.State ? SR.State.data : null;
    },
    goToView: function (viewId, instant) {
      return SR.Camera ? SR.Camera.goToView(viewId, true, instant !== false) : false;
    },
    setRoomAngle: function (angleDeg, pitchDeg) {
      if (!SR.Camera) return false;
      if (SR.Camera.getCurrentView() !== 'room') {
        SR.Camera.goToView('room', false, true);
      }
      SR.Camera.setRoomAngle(angleDeg, pitchDeg !== undefined ? pitchDeg : 3, true);
      return true;
    },
    clickInteractive: function (id) {
      const entry = interactiveMap[id];
      if (!entry || typeof entry.onClick !== 'function') return false;
      clearHighlight();
      entry.onClick({ interactiveId: id, object: entry.object });
      return true;
    },
    listInteractives: function (onlyActive) {
      const currentView = SR.Camera ? SR.Camera.getCurrentView() : 'room';
      return SR.Interactables.filter(function (e) {
        return !onlyActive || isInteractiveEnabled(e, currentView);
      }).map(function (e) {
        return {
          id: e.id,
          station: e.station || null,
          activeViews: e.activeViews || null,
          label: evalProp(e.label) || '',
          action: evalProp(e.action) || '',
          enabled: isInteractiveEnabled(e, currentView)
        };
      });
    },
    syncAll: syncAll,
    getCamera: function () {
      return SR.Camera ? SR.Camera.getDebugInfo() : null;
    },
    listViews: function () {
      return SR.Camera && SR.Camera.listViews ? SR.Camera.listViews() : {};
    },
    wheel: function (deltaY) {
      return SR.Camera && SR.Camera.onWheel ? SR.Camera.onWheel(deltaY) : false;
    },
    pinch: function (deltaScale) {
      return SR.Camera && SR.Camera.onPinch ? SR.Camera.onPinch(deltaScale) : false;
    },
    pinchEnd: function () {
      if (SR.Camera && SR.Camera.onPinchEnd) SR.Camera.onPinchEnd();
    },
    fling: function (vx, vy) {
      if (SR.Camera && SR.Camera.fling) SR.Camera.fling(vx, vy);
    },
    tapAt: function (x, y) {
      return onCanvasTap(x, y, true);
    },
    raycastNDC: function (nx, ny) {
      if (!canvas || !camera) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = rect.left + ((nx + 1) * 0.5) * rect.width;
      const cy = rect.top + ((1 - ny) * 0.5) * rect.height;
      const res = raycastInteractables(cx, cy);
      return res ? {
        id: res.entry.id,
        station: res.entry.station || null,
        label: evalProp(res.entry.label) || '',
        distance: +res.hit.distance.toFixed(3)
      } : null;
    },
    getRendererInfo: function () {
      if (!renderer) return null;
      return {
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures
      };
    },
    renderNow: function (dt) {
      stepFrame(dt !== undefined ? dt : 0.016);
    }
  };

  function registerServiceWorker() {
    if (
      'serviceWorker' in navigator &&
      (location.protocol === 'http:' || location.protocol === 'https:')
    ) {
      navigator.serviceWorker.register('./sw.js', {
        scope: './',
        updateViaCache: 'none'
      }).catch(function (err) {
        console.warn('[PWA] Service Worker registration skipped:', err);
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAllModules);
  } else {
    initAllModules();
  }

  if (document.readyState === 'complete') {
    registerServiceWorker();
  } else {
    window.addEventListener('load', registerServiceWorker);
  }
})(window.SR = window.SR || {});
