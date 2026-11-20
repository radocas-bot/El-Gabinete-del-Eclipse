/* ==========================================================================
   src/ui/inspector.js — Dedicated Three.js 3D Item Inspector & Telescope Puzzle
   ========================================================================== */
(function (SR) {
  'use strict';

  let initialized = false;
  let rendererReady = false;
  let isOpenFlag = false;
  let currentItemId = null;
  let rafId = null;
  let lastTime = 0;
  let elapsed = 0;

  // DOM references
  let elModal = null;
  let elCanvas = null;
  let elTitle = null;
  let elSubtitle = null;
  let elDesc = null;
  let elHintTag = null;
  let elBtnClose = null;

  // Dedicated Three.js Inspector Scene (completely isolated WebGL context)
  let renderer = null;
  let scene = null;
  let camera = null;
  let pivotGroup = null;
  let currentMeshGroup = null;
  let raycaster = null;
  let mouseNDC = null;

  // Rotation, zoom & interaction state
  const DEFAULT_CAM_Z = 3.15;
  const MIN_CAM_Z = 1.75;
  const MAX_CAM_Z = 5.4;
  let baseCamZ = DEFAULT_CAM_Z;
  let rotX = 0.22;
  let rotY = -0.35;
  let targetRotX = 0.22;
  let targetRotY = -0.35;
  let velX = 0;
  let velY = 0;
  let currentCamZ = DEFAULT_CAM_Z;
  let targetCamZ = DEFAULT_CAM_Z;
  let dragging = false;
  let pointerDownX = 0;
  let pointerDownY = 0;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pointerMoved = false;
  let hoveringHotspot = false;
  let idleAutoSpin = true;

  // Native Touch State
  let touchMode = 'none'; // 'none' | 'drag' | 'pinch' | 'pinch_cooldown'
  let touchStartX = 0;
  let touchStartY = 0;
  let touchLastX = 0;
  let touchLastY = 0;
  let touchLastTime = 0;
  let touchStartTime = 0;
  let touchMoved = false;
  let pinchStartDist = 0;
  let pinchStartCamZ = DEFAULT_CAM_Z;

  // Telescope interactive 3D puzzle references
  let telescopeState = null;

  // Inspector-local textures to dispose cleanly when switching models
  let localDisposables = [];

  function trackGeo(g) { localDisposables.push(g); return g; }
  function trackMat(m) { localDisposables.push(m); return m; }
  function trackTex(t) { localDisposables.push(t); return t; }

  function clearCurrentModel() {
    if (currentMeshGroup && pivotGroup) {
      pivotGroup.remove(currentMeshGroup);
    }
    currentMeshGroup = null;
    telescopeState = null;
    for (let i = 0; i < localDisposables.length; i++) {
      if (localDisposables[i] && typeof localDisposables[i].dispose === 'function') {
        localDisposables[i].dispose();
      }
    }
    localDisposables = [];
  }

  function makeInspectorTexture(w, h, drawFn) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    drawFn(ctx, w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return trackTex(tex);
  }

  // Reusable local material factories (never shared with main WebGLRenderer)
  function makeMats() {
    return {
      brass: trackMat(new THREE.MeshStandardMaterial({
        color: 0xd4a44a, metalness: 0.88, roughness: 0.24
      })),
      agedBrass: trackMat(new THREE.MeshStandardMaterial({
        color: 0x9b7430, metalness: 0.82, roughness: 0.38
      })),
      brightGold: trackMat(new THREE.MeshStandardMaterial({
        color: 0xf4c860, metalness: 0.92, roughness: 0.18,
        emissive: 0x553808, emissiveIntensity: 0.25
      })),
      copper: trackMat(new THREE.MeshStandardMaterial({
        color: 0xc26e44, metalness: 0.85, roughness: 0.28
      })),
      bronze: trackMat(new THREE.MeshStandardMaterial({
        color: 0x8f6638, metalness: 0.82, roughness: 0.34
      })),
      silver: trackMat(new THREE.MeshStandardMaterial({
        color: 0xdce4ee, metalness: 0.92, roughness: 0.18
      })),
      darkIron: trackMat(new THREE.MeshStandardMaterial({
        color: 0x35373e, metalness: 0.78, roughness: 0.45
      })),
      leather: trackMat(new THREE.MeshStandardMaterial({
        color: 0x4b2416, metalness: 0.08, roughness: 0.78
      })),
      walnut: trackMat(new THREE.MeshStandardMaterial({
        color: 0x4c2b18, metalness: 0.1, roughness: 0.52
      })),
      redLacquer: trackMat(new THREE.MeshStandardMaterial({
        color: 0x8c2222, metalness: 0.18, roughness: 0.35
      })),
      obsidian: trackMat(new THREE.MeshPhysicalMaterial({
        color: 0x161022, metalness: 0.2, roughness: 0.12,
        clearcoat: 1.0, clearcoatRoughness: 0.08,
        emissive: 0x3b1a6e, emissiveIntensity: 0.45
      })),
      lensGlass: trackMat(new THREE.MeshPhysicalMaterial({
        color: 0xb6dcf7, metalness: 0.05, roughness: 0.08,
        transmission: 0.55, transparent: true, opacity: 0.82,
        clearcoat: 1.0
      })),
      cobaltGlass: trackMat(new THREE.MeshPhysicalMaterial({
        color: 0x1f6bff, metalness: 0.08, roughness: 0.08,
        emissive: 0x1a56e8, emissiveIntensity: 0.85,
        transparent: true, opacity: 0.88, clearcoat: 1.0
      })),
      lunarGlass: trackMat(new THREE.MeshPhysicalMaterial({
        color: 0xc2e6ff, metalness: 0.1, roughness: 0.06,
        emissive: 0x4b94d8, emissiveIntensity: 0.55,
        transparent: true, opacity: 0.86, clearcoat: 1.0
      })),
      quartzGlass: trackMat(new THREE.MeshPhysicalMaterial({
        color: 0xe6f6ff, metalness: 0.12, roughness: 0.05,
        emissive: 0x5ca4cc, emissiveIntensity: 0.25,
        transparent: true, opacity: 0.72, clearcoat: 1.0
      }))
    };
  }

  /* ========================================================================
     11 CUSTOM MULTI-PART 3D MODELS
     ======================================================================== */

  // 1. TELESCOPE (Catalejo de Latón — Interactive Unscrewing Puzzle B1a!)
  function buildTelescope(M) {
    const root = new THREE.Group();
    const alreadyOpened = !!(SR.State && SR.State.data && SR.State.data.telescopeOpened);

    // Engraved inner brass musical band texture (3 repeats around circumference so always readable)
    const bandTex = makeInspectorTexture(1024, 512, function (ctx, w, h) {
      // Rich burnished brass gradient along cylinder length (Y in canvas -> X along barrel)
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#a87d2e');
      grad.addColorStop(0.15, '#e8c468');
      grad.addColorStop(0.5, '#f5d982');
      grad.addColorStop(0.85, '#e2ba5c');
      grad.addColorStop(1, '#9c7126');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Horizontal ornamental borders (along barrel ends: near y=34 and y=h-34)
      ctx.strokeStyle = '#3a2409';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 38); ctx.lineTo(w, 38);
      ctx.moveTo(0, h - 38); ctx.lineTo(w, h - 38);
      ctx.stroke();

      ctx.strokeStyle = '#5c3c12';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 52); ctx.lineTo(w, 52);
      ctx.moveTo(0, h - 52); ctx.lineTo(w, h - 52);
      ctx.stroke();

      // Fine vertical tick marks along the band
      ctx.fillStyle = '#4a2e0b';
      for (let i = 0; i < w; i += 32) {
        ctx.fillRect(i, 38, 2, 14);
        ctx.fillRect(i, h - 52, 2, 14);
      }

      // Draw 3 clear copies around circumference (center copy at cx = w/2 faces camera directly!)
      const centers = [w * (1 / 6), w * 0.5, w * (5 / 6)];
      centers.forEach(function (cx) {
        ctx.save();
        ctx.translate(cx, h * 0.5);
        ctx.rotate(-Math.PI / 2);

        // High-contrast recessed engraving ribbon (centered away from screw threads)
        ctx.fillStyle = 'rgba(255, 244, 206, 0.42)';
        ctx.fillRect(-185, -54, 345, 108);
        ctx.strokeStyle = '#3b2106';
        ctx.lineWidth = 4;
        ctx.strokeRect(-185, -54, 345, 108);

        // Small header caption
        ctx.fillStyle = '#3f2408';
        ctx.font = 'bold 17px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('♪ CLAVE DE RESONANCIA ♪', -12, -26);

        // Main crisp engraved musical code (fits comfortably before threads!)
        ctx.fillStyle = '#120801';
        ctx.font = 'bold 34px Georgia, serif';
        ctx.fillText('III - I - V - II - IV', -12, 16);

        ctx.restore();
      });
    });

    const bandMat = trackMat(new THREE.MeshStandardMaterial({
      map: bandTex,
      metalness: 0.42,
      roughness: 0.34,
      emissive: 0x3b2608,
      emissiveIntensity: 0.25
    }));

    // Leather grip texture
    const leatherTex = makeInspectorTexture(256, 256, function (ctx, w, h) {
      ctx.fillStyle = '#4d2314';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) {
        ctx.fillStyle = i % 2 ? 'rgba(20,8,4,0.18)' : 'rgba(130,68,36,0.14)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 2);
      }
      ctx.strokeStyle = '#c89b44';
      ctx.lineWidth = 4;
      ctx.strokeRect(6, 6, w - 12, h - 12);
    });
    const leatherGripMat = trackMat(new THREE.MeshStandardMaterial({
      map: leatherTex, metalness: 0.12, roughness: 0.72
    }));

    // --- Front Objective Barrel (left side, -X) ---
    const objRing = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.305, 0.295, 0.16, 36)), M.brass);
    objRing.rotation.z = -Math.PI / 2;
    objRing.position.x = -0.98;
    root.add(objRing);

    const objBezel = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.28, 0.032, 14, 36)), M.brightGold);
    objBezel.rotation.y = Math.PI / 2;
    objBezel.position.x = -1.06;
    root.add(objBezel);

    const objLens = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.265, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.38)), M.lensGlass);
    objLens.rotation.z = Math.PI / 2;
    objLens.position.x = -0.94;
    root.add(objLens);

    // Main leather-wrapped outer tube
    const mainBarrel = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.265, 0.285, 0.78, 36)), leatherGripMat);
    mainBarrel.rotation.z = -Math.PI / 2;
    mainBarrel.position.x = -0.52;
    root.add(mainBarrel);

    // Decorative brass collars around leather tube
    [-0.86, -0.16].forEach(function (px, idx) {
      const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(idx === 0 ? 0.292 : 0.272, idx === 0 ? 0.292 : 0.272, 0.065, 36)), M.brass);
      collar.rotation.z = -Math.PI / 2;
      collar.position.x = px;
      root.add(collar);
    });

    // Mid stepped brass drawtube
    const midTube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.215, 0.235, 0.42, 36)), M.brass);
    midTube.rotation.z = -Math.PI / 2;
    midTube.position.x = 0.06;
    root.add(midTube);

    const midStepRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.218, 0.02, 12, 36)), M.agedBrass);
    midStepRing.rotation.y = Math.PI / 2;
    midStepRing.position.x = 0.26;
    root.add(midStepRing);

    // --- Inner Engraved Musical Band (revealed when eyepiece unscrews!) ---
    const bandGeo = trackGeo(new THREE.CylinderGeometry(0.172, 0.172, 0.68, 48, 1, false));
    bandGeo.rotateY(Math.PI); // Align u=0.5 cleanly to front (+Z) with zero seam
    const engravedBand = new THREE.Mesh(bandGeo, bandMat);
    engravedBand.rotation.z = -Math.PI / 2;
    engravedBand.position.x = 0.59;
    root.add(engravedBand);

    // Screw threads at tip of inner barrel
    for (let t = 0; t < 4; t++) {
      const thread = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.176, 0.008, 8, 32)), M.agedBrass);
      thread.rotation.y = Math.PI / 2;
      thread.position.x = 0.86 + t * 0.022;
      root.add(thread);
    }

    // --- Inner Cobalt Blue Filter Lens (slides out on unscrew!) ---
    const cobaltGroup = new THREE.Group();
    const cobaltRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.165, 0.022, 14, 32)), M.brightGold);
    cobaltGroup.add(cobaltRing);

    const cobaltDisc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.16, 0.16, 0.032, 32)), M.cobaltGlass);
    cobaltDisc.rotation.x = Math.PI / 2;
    cobaltGroup.add(cobaltDisc);

    cobaltGroup.position.set(0.65, 0, 0);
    cobaltGroup.visible = false;
    root.add(cobaltGroup);

    // --- Threaded Removable Eyepiece Cap (Interactive Hotspot!) ---
    const eyepieceGroup = new THREE.Group();

    // Outer brass sleeve concealing the engraved band until unscrewed
    const sleeve = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.196, 0.200, 0.68, 36)), M.brass);
    sleeve.rotation.z = -Math.PI / 2;
    sleeve.position.x = 0.60;
    eyepieceGroup.add(sleeve);

    // Knurled rear eyepiece cap
    const knurlCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.215, 0.205, 0.15, 24)), M.agedBrass);
    knurlCap.rotation.z = -Math.PI / 2;
    knurlCap.position.x = 0.98;
    eyepieceGroup.add(knurlCap);

    // Eyecup flare + rear glass
    const eyeCup = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.135, 0.175, 0.08, 32)), M.darkIron);
    eyeCup.rotation.z = -Math.PI / 2;
    eyeCup.position.x = 1.09;
    eyepieceGroup.add(eyeCup);

    const rearLens = new THREE.Mesh(trackGeo(new THREE.CircleGeometry(0.115, 28)), M.lensGlass);
    rearLens.rotation.y = Math.PI / 2;
    rearLens.position.x = 1.132;
    eyepieceGroup.add(rearLens);

    // Subtle pulsing brass ring indicating the unscrewable seam
    const pulseMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xffd978,
      metalness: 0.7,
      roughness: 0.2,
      emissive: 0xffb838,
      emissiveIntensity: alreadyOpened ? 0 : 0.9
    }));
    const pulseRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.212, 0.015, 12, 36)), pulseMat);
    pulseRing.rotation.y = Math.PI / 2;
    pulseRing.position.x = 0.92;
    pulseRing.visible = !alreadyOpened;
    eyepieceGroup.add(pulseRing);

    // Generous invisible hitbox around the eyepiece cap for effortless clicking
    const hitMat = trackMat(new THREE.MeshBasicMaterial({
      transparent: true, opacity: 0.0, depthWrite: false
    }));
    const hitCylinder = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.28, 0.28, 0.98, 16)), hitMat);
    hitCylinder.rotation.z = -Math.PI / 2;
    hitCylinder.position.x = 0.74;
    eyepieceGroup.add(hitCylinder);

    // Tag all meshes inside eyepieceGroup as the clickable hotspot
    eyepieceGroup.traverse(function (child) {
      if (child.isMesh) {
        child.userData.hotspot = 'telescope_eyepiece';
      }
    });

    root.add(eyepieceGroup);

    // Shift whole telescope slightly so both closed and opened look nicely centered
    root.position.x = alreadyOpened ? -0.22 : 0.0;

    // Apply opened pose immediately if previously unscrewed (eyepiece clearly detached below-right, engraved band 100% clear!)
    const initProgress = alreadyOpened ? 1 : 0;
    if (alreadyOpened) {
      eyepieceGroup.position.set(0.62, -0.52, 0.10);
      eyepieceGroup.rotation.set(0, 0, -0.35);
    }

    telescopeState = {
      root: root,
      eyepieceGroup: eyepieceGroup,
      cobaltGroup: cobaltGroup,
      pulseRing: pulseRing,
      pulseMat: pulseMat,
      opened: alreadyOpened,
      unscrewing: false,
      unscrewStartMs: 0,
      progress: initProgress,
      showCobaltPreview: false
    };

    return root;
  }

  // 2. COBALT FILTER (Filtro de Cobalto)
  function buildCobaltFilter(M) {
    const g = new THREE.Group();

    const bezelTex = makeInspectorTexture(512, 128, function (ctx, w, h) {
      ctx.fillStyle = '#c59842';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2d1c08';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FILTRO DE COBALTO  •  ESPECTRO UV  •  1894', w / 2, h / 2);
    });
    const bezelMat = trackMat(new THREE.MeshStandardMaterial({
      map: bezelTex, metalness: 0.82, roughness: 0.28
    }));

    const outerRim = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.72, 0.72, 0.16, 36, 1, true)), bezelMat);
    outerRim.rotation.x = Math.PI / 2;
    g.add(outerRim);

    const frontRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.70, 0.06, 16, 42)), M.brass);
    frontRing.position.z = 0.06;
    g.add(frontRing);

    const backRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.70, 0.06, 16, 42)), M.agedBrass);
    backRing.position.z = -0.06;
    g.add(backRing);

    // Glowing cobalt optical glass core
    const glass = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 0.09, 40)), M.cobaltGlass);
    glass.rotation.x = Math.PI / 2;
    g.add(glass);

    // Subtle inner specular lens dome on both sides
    const dome = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.62, 32, 16)), M.cobaltGlass);
    dome.scale.set(1, 1, 0.14);
    g.add(dome);

    // 4 brass retention lugs & screws
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const lug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.055, 0.19, 14)), M.brightGold);
      lug.rotation.x = Math.PI / 2;
      lug.position.set(Math.cos(a) * 0.73, Math.sin(a) * 0.73, 0);
      g.add(lug);
    }

    return g;
  }

  // 3. CLOCK KEY (Llave de Cuerda)
  function buildClockKey(M) {
    const g = new THREE.Group();

    // Trefoil Victorian bow handle (top)
    const bowCenter = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.18, 0.07, 24)), M.brightGold);
    bowCenter.rotation.x = Math.PI / 2;
    bowCenter.position.y = 0.56;
    g.add(bowCenter);

    const loops = [
      [0, 0.80, 0.20],
      [-0.26, 0.54, 0.19],
      [0.26, 0.54, 0.19]
    ];
    loops.forEach(function (l) {
      const torus = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(l[2], 0.045, 14, 30)), M.brass);
      torus.position.set(l[0], l[1], 0);
      g.add(torus);
    });

    // Ornate turned shaft
    const collar = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.11, 0.036, 12, 24)), M.brightGold);
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 0.30;
    g.add(collar);

    const shaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.075, 0.095, 0.82, 24)), M.brass);
    shaft.position.y = -0.14;
    g.add(shaft);

    const midBead = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.115, 20, 14)), M.brightGold);
    midBead.scale.set(1, 0.65, 1);
    midBead.position.y = -0.02;
    g.add(midBead);

    // Hollow square-bore winding barrel tip
    const tip = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.135, 0.135, 0.36, 24)), M.agedBrass);
    tip.position.y = -0.68;
    g.add(tip);

    const sqHole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.08, 0.11)), M.darkIron);
    sqHole.position.y = -0.84;
    g.add(sqHole);

    g.position.y = -0.05;
    return g;
  }

  // 4. VALVE WHEEL (Volante de Válvula)
  function buildValveWheel(M) {
    const g = new THREE.Group();

    // Heavy cast brass outer wheel rim
    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.72, 0.082, 18, 42)), M.brass);
    g.add(rim);

    // Decorative crimson grip ring accents around outer edge
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const grip = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.72, 0.09, 12, 16, Math.PI * 0.32)), M.redLacquer);
      grip.rotation.z = a - Math.PI * 0.16;
      g.add(grip);
    }

    // 4 turned spokes
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const spoke = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.045, 0.062, 0.62, 14)), M.copper);
      spoke.rotation.z = a + Math.PI / 2;
      spoke.position.set(Math.cos(a) * 0.37, Math.sin(a) * 0.37, 0);
      g.add(spoke);
    }

    // Central heavy hub + hex nut + square stem socket
    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.20, 0.22, 0.24, 24)), M.agedBrass);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);

    const nut = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.13, 0.13, 0.10, 6)), M.brightGold);
    nut.rotation.x = Math.PI / 2;
    nut.position.z = 0.14;
    g.add(nut);

    const socket = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.16)), M.darkIron);
    socket.position.z = -0.10;
    g.add(socket);

    return g;
  }

  // 5. CLOCK WEIGHT (Pesa de Bronce)
  function buildClockWeight(M) {
    const g = new THREE.Group();

    const bodyTex = makeInspectorTexture(512, 256, function (ctx, w, h) {
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      grad.addColorStop(0, '#78542a');
      grad.addColorStop(0.3, '#c89752');
      grad.addColorStop(0.5, '#dfba74');
      grad.addColorStop(0.75, '#a87c3e');
      grad.addColorStop(1, '#78542a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3d270f';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 26, w, h - 52);
      ctx.fillStyle = '#2d1a08';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('CONTRAPESO  •  VALERIO 1894', w / 2, h / 2);
    });
    const bodyMat = trackMat(new THREE.MeshStandardMaterial({
      map: bodyTex, metalness: 0.78, roughness: 0.30
    }));

    const cyl = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.34, 0.34, 1.18, 36)), bodyMat);
    cyl.position.y = -0.08;
    g.add(cyl);

    // Upper & lower fluted brass caps
    const topCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.24, 0.36, 0.16, 32)), M.brass);
    topCap.position.y = 0.58;
    g.add(topCap);

    const botCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.36, 0.22, 0.18, 32)), M.brass);
    botCap.position.y = -0.75;
    g.add(botCap);

    const botFinial = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.11, 20, 14)), M.brightGold);
    botFinial.position.y = -0.88;
    g.add(botFinial);

    // Ornamental brass bandings
    [0.34, -0.50].forEach(function (py) {
      const band = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.345, 0.024, 12, 36)), M.brightGold);
      band.rotation.x = Math.PI / 2;
      band.position.y = py;
      g.add(band);
    });

    // Hanging brass eyelet & hook
    const hookRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.13, 0.032, 12, 28)), M.brightGold);
    hookRing.position.y = 0.77;
    g.add(hookRing);

    return g;
  }

  // 6. CIPHER DISK (Disco Móvil de Latón 0..9)
  function buildCipherDisk(M) {
    const g = new THREE.Group();

    const dialTex = makeInspectorTexture(512, 512, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const grad = ctx.createRadialGradient(cx, cy, 30, cx, cy, 245);
      grad.addColorStop(0, '#f0cc76');
      grad.addColorStop(0.75, '#cfa048');
      grad.addColorStop(1, '#8c6422');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 250, 0, Math.PI * 2);
      ctx.fill();

      // Concentric engraved rings
      ctx.strokeStyle = '#33200a';
      ctx.lineWidth = 4;
      [236, 152, 74].forEach(function (r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 10 radial sector dividers & crisp digits 0..9 clockwise
      for (let i = 0; i < 10; i++) {
        const aDiv = (i * Math.PI * 2) / 10 - Math.PI / 2 - Math.PI / 10;
        ctx.strokeStyle = 'rgba(51, 32, 10, 0.65)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(aDiv) * 74, cy + Math.sin(aDiv) * 74);
        ctx.lineTo(cx + Math.cos(aDiv) * 236, cy + Math.sin(aDiv) * 236);
        ctx.stroke();

        const a = (i * Math.PI * 2) / 10 - Math.PI / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * 194, cy + Math.sin(a) * 194);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillStyle = '#1d1105';
        ctx.font = 'bold 48px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(i), 0, 0);
        ctx.restore();
      }

      // Inner decorative star & caption
      ctx.fillStyle = '#3c250a';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('CIFRADOR ZODIACAL', cx, cy - 104);
      ctx.fillText('SOLÍS • 1894', cx, cy + 114);
    });

    const faceMat = trackMat(new THREE.MeshStandardMaterial({
      map: dialTex, metalness: 0.72, roughness: 0.28
    }));

    const disk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.84, 0.84, 0.11, 48)),
      [M.agedBrass, faceMat, faceMat]
    );
    disk.rotation.x = Math.PI / 2;
    g.add(disk);

    // Knurled rim gear teeth
    for (let i = 0; i < 20; i++) {
      const a = (i * Math.PI * 2) / 20;
      const tooth = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.08, 0.12)), M.brightGold);
      tooth.position.set(Math.cos(a) * 0.85, Math.sin(a) * 0.85, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }

    // Center spindle socket
    const hub = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.18, 0.04, 12, 28)), M.brightGold);
    hub.position.z = 0.055;
    g.add(hub);

    const hole = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.16, 0.16)), M.darkIron);
    g.add(hole);

    return g;
  }

  // 7. QUARTZ SPLITTER (Cristal Divisor 45°)
  function buildQuartzSplitter(M) {
    const g = new THREE.Group();

    // Brass octagonal mounting base
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.56, 0.62, 0.14, 8)), M.agedBrass);
    base.position.y = -0.56;
    g.add(base);

    const topCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.52, 0.56, 0.08, 8)), M.brass);
    topCap.position.y = 0.56;
    g.add(topCap);

    // 4 corner brass cradle pillars
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2 + Math.PI / 4;
      const post = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.036, 0.036, 1.10, 12)), M.brightGold);
      post.position.set(Math.cos(a) * 0.48, 0, Math.sin(a) * 0.48);
      g.add(post);
    }

    // Main optical quartz cube
    const cube = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.94, 0.76)), M.quartzGlass);
    g.add(cube);

    // Luminous diagonal 45° semi-reflective splitter plane inside the crystal
    const planeMat = trackMat(new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      emissive: 0x7ad4ff,
      emissiveIntensity: 0.75,
      metalness: 0.85,
      roughness: 0.05,
      transparent: true,
      opacity: 0.68,
      side: THREE.DoubleSide
    }));
    const diagPlane = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(1.02, 0.90)), planeMat);
    diagPlane.rotation.y = Math.PI / 4;
    g.add(diagPlane);

    // Decorative top finial
    const finial = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.14, 0)), M.brightGold);
    finial.position.y = 0.70;
    g.add(finial);

    return g;
  }

  // 8. ORRERY CRANK (Manivela Astral)
  function buildOrreryCrank(M) {
    const g = new THREE.Group();

    // Gear-toothed ratchet socket on lower-left
    const socket = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.20, 0.34, 24)), M.agedBrass);
    socket.rotation.x = Math.PI / 2;
    socket.position.set(-0.48, -0.22, -0.05);
    g.add(socket);

    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const cog = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.09, 0.10)), M.brightGold);
      cog.position.set(-0.48 + Math.cos(a) * 0.21, -0.22 + Math.sin(a) * 0.21, -0.14);
      cog.rotation.z = a;
      g.add(cog);
    }

    // 6-pointed gilded astral star emblem on hub face
    for (let s = 0; s < 3; s++) {
      const bar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.32, 0.055, 0.04)), M.brightGold);
      bar.position.set(-0.48, -0.22, 0.14);
      bar.rotation.z = (s * Math.PI) / 3;
      g.add(bar);
    }

    // Curved brass lever arm
    const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.06, 0.14, 0.08)), M.brass);
    arm.position.set(0.0, 0.02, 0.04);
    arm.rotation.z = 0.44;
    g.add(arm);

    // End collar + turned walnut crank handle projecting forward
    const endHub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.12, 0.12, 0.14, 20)), M.brightGold);
    endHub.rotation.x = Math.PI / 2;
    endHub.position.set(0.46, 0.24, 0.06);
    g.add(endHub);

    const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.125, 0.54, 24)), M.walnut);
    handle.rotation.x = Math.PI / 2;
    handle.position.set(0.46, 0.24, 0.36);
    g.add(handle);

    const handleCap = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.10, 18, 14)), M.brightGold);
    handleCap.position.set(0.46, 0.24, 0.64);
    g.add(handleCap);

    return g;
  }

  // 9. SOLAR GEAR (Relic 1/3 — Engranaje Solar)
  function buildSolarGear(M) {
    const g = new THREE.Group();

    const sunTex = makeInspectorTexture(512, 512, function (ctx, w, h) {
      const cx = w / 2, cy = h / 2;
      const grad = ctx.createRadialGradient(cx, cy, 15, cx, cy, 240);
      grad.addColorStop(0, '#fff5be');
      grad.addColorStop(0.45, '#f4be48');
      grad.addColorStop(1, '#a86c16');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 248, 0, Math.PI * 2);
      ctx.fill();

      // Etched solar rays & concentric celestial circles
      ctx.strokeStyle = '#5c3305';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, 210, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 118, 0, Math.PI * 2); ctx.stroke();

      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI * 2) / 16;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 118, cy + Math.sin(a) * 118);
        ctx.lineTo(cx + Math.cos(a) * 210, cy + Math.sin(a) * 210);
        ctx.stroke();
      }

      ctx.fillStyle = '#4a2604';
      ctx.font = 'bold 96px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('☉', cx, cy + 4);
    });

    const sunFaceMat = trackMat(new THREE.MeshStandardMaterial({
      map: sunTex, metalness: 0.85, roughness: 0.20,
      emissive: 0x7d4c08, emissiveIntensity: 0.35
    }));

    const coreDisk = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.68, 0.68, 0.14, 48)),
      [M.brightGold, sunFaceMat, sunFaceMat]
    );
    coreDisk.rotation.x = Math.PI / 2;
    g.add(coreDisk);

    // Outer filigree brass torus
    const outerRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.69, 0.05, 14, 48)), M.brightGold);
    g.add(outerRing);

    // 16 sculpted solar gear teeth
    for (let i = 0; i < 16; i++) {
      const a = (i * Math.PI * 2) / 16;
      const isMajor = i % 2 === 0;
      const tooth = new THREE.Mesh(
        trackGeo(new THREE.BoxGeometry(isMajor ? 0.22 : 0.16, 0.11, 0.13)),
        M.brightGold
      );
      const r = isMajor ? 0.80 : 0.77;
      tooth.position.set(Math.cos(a) * r, Math.sin(a) * r, 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }

    // Domed radiant center jewel
    const sunCore = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.20, 24, 16)), M.brightGold);
    sunCore.scale.set(1, 1, 0.45);
    g.add(sunCore);

    return g;
  }

  // 10. LUNAR LENS (Relic 2/3 — Lente Lunar)
  function buildLunarLens(M) {
    const g = new THREE.Group();

    // Polished silver outer ring
    const ring = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.74, 0.068, 18, 48)), M.silver);
    g.add(ring);

    const innerRim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.58, 0.032, 14, 42)), M.brightGold);
    g.add(innerRim);

    // Luminous moon-blue biconvex crystal lens
    const lens = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.58, 36, 20)), M.lunarGlass);
    lens.scale.set(1, 1, 0.26);
    g.add(lens);

    // Sculpted silver crescent arc clasping the left side
    const crescent = new THREE.Mesh(
      trackGeo(new THREE.TorusGeometry(0.66, 0.088, 16, 36, Math.PI * 1.15)),
      M.silver
    );
    crescent.rotation.z = Math.PI * 0.42;
    crescent.position.z = 0.04;
    g.add(crescent);

    // 8 small celestial star rivets around the ring
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const rivet = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.05, 0)), M.brightGold);
      rivet.position.set(Math.cos(a) * 0.74, Math.sin(a) * 0.74, 0.07);
      g.add(rivet);
    }

    return g;
  }

  // 11. UMBRAL PRISM (Relic 3/3 — Prisma Umbral)
  function buildUmbralPrism(M) {
    const g = new THREE.Group();

    // Double-terminated faceted obsidian crystal
    const topPy = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.36, 0.68, 6)), M.obsidian);
    topPy.position.y = 0.34;
    g.add(topPy);

    const botPy = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.36, 0.68, 6)), M.obsidian);
    botPy.rotation.x = Math.PI;
    botPy.position.y = -0.34;
    g.add(botPy);

    // Glowing violet-gold inner eclipse core ring
    const coreMat = trackMat(new THREE.MeshStandardMaterial({
      color: 0xb982ff, emissive: 0x7b3fff, emissiveIntensity: 1.4, roughness: 0.2
    }));
    const waistRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.37, 0.025, 12, 6)), coreMat);
    waistRing.rotation.x = Math.PI / 2;
    g.add(waistRing);

    // Two intersecting gilded brass armillary rings (eclipse corona)
    const arm1 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.68, 0.036, 16, 48)), M.brightGold);
    arm1.rotation.set(0.55, 0.35, 0.2);
    g.add(arm1);

    const arm2 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.78, 0.028, 16, 48)), M.brass);
    arm2.rotation.set(-0.62, -0.45, 0.4);
    g.add(arm2);

    // 4 golden spikes on outer ring
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      const spike = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.055, 0.16, 6)), M.brightGold);
      spike.position.set(Math.cos(a) * 0.84, Math.sin(a) * 0.84, 0);
      spike.rotation.z = a - Math.PI / 2;
      arm2.add(spike);
    }

    return g;
  }

  function buildItemModel(itemId) {
    const M = makeMats();
    switch (itemId) {
      case 'telescope':       return buildTelescope(M);
      case 'cobalt_filter':   return buildCobaltFilter(M);
      case 'clock_key':       return buildClockKey(M);
      case 'valve_wheel':     return buildValveWheel(M);
      case 'clock_weight':    return buildClockWeight(M);
      case 'cipher_disk':     return buildCipherDisk(M);
      case 'quartz_splitter': return buildQuartzSplitter(M);
      case 'orrery_crank':    return buildOrreryCrank(M);
      case 'solar_gear':      return buildSolarGear(M);
      case 'lunar_lens':      return buildLunarLens(M);
      case 'umbral_prism':    return buildUmbralPrism(M);
      default: {
        const fallback = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.6, 1)), M.brass);
        return fallback;
      }
    }
  }

  /* ========================================================================
     TELESCOPE UNSCREW INTERACTION (Puzzle B1a)
     ======================================================================== */

  function performTelescopeUnscrew() {
    if (!telescopeState || telescopeState.opened || telescopeState.unscrewing) return false;
    if (SR.State && SR.State.data && SR.State.data.telescopeOpened) return false;

    telescopeState.unscrewing = true;
    telescopeState.unscrewStartMs = performance.now();
    telescopeState.opened = true;
    telescopeState.showCobaltPreview = true;
    idleAutoSpin = false;

    // Gently turn telescope to showcase the newly revealed engraved band dead-on
    targetRotX = 0.06;
    targetRotY = -0.06;

    if (SR.Audio) {
      SR.Audio.playGear(1.2);
      setTimeout(function () {
        if (SR.Audio) SR.Audio.playSolve();
      }, 280);
    }

    if (SR.State) {
      SR.State.data.telescopeOpened = true;
      SR.State.addItem('cobalt_filter');
      SR.State.unlockJournal('telescope_chime');
      SR.State.save();
    }

    if (elDesc) {
      elDesc.textContent = '¡El ocular ocultaba un Filtro de Cobalto azul y una inscripción musical en el tubo: III - I - V - II - IV!';
    }
    if (elHintTag) {
      elHintTag.textContent = 'Grabado: III — I — V — II — IV  •  +Filtro UV';
      elHintTag.classList.remove('hidden');
    }
    if (SR.UI && typeof SR.UI.say === 'function') {
      SR.UI.say('¡El ocular ocultaba un Filtro de Cobalto azul y una inscripción musical grabada: III - I - V - II - IV!', 6200);
    }
    return true;
  }

  /* ========================================================================
     THREE.JS RENDERER & ANIMATION LOOP
     ======================================================================== */

  function ensureRenderer() {
    if (rendererReady || !elCanvas || typeof THREE === 'undefined') return;
    rendererReady = true;

    renderer = new THREE.WebGLRenderer({
      canvas: elCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.24;
    if (THREE.SRGBColorSpace) {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }

    scene = new THREE.Scene();

    // Rich museum reflections via PMREM RoomEnvironment (local to this renderer!)
    try {
      if (THREE.RoomEnvironment) {
        const pmrem = new THREE.PMREMGenerator(renderer);
        const envTex = pmrem.fromScene(new THREE.RoomEnvironment(), 0.04).texture;
        scene.environment = envTex;
        pmrem.dispose();
      }
    } catch (e) {
      // Fallback safely to lights only
    }

    camera = new THREE.PerspectiveCamera(38, 640 / 370, 0.1, 30);
    camera.position.set(0, 0.20, 3.15);
    camera.lookAt(0, 0, 0);

    // Three-point horological showcase lighting: warm key + cool fill + gold rim
    const hemi = new THREE.HemisphereLight(0xfff1d6, 0x1e1828, 0.9);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xffe2b0, 2.5);
    keyLight.position.set(3.2, 4.0, 4.2);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7caee8, 1.25);
    fillLight.position.set(-3.6, 1.4, 2.6);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffba52, 1.65);
    rimLight.position.set(-1.4, 3.2, -4.0);
    scene.add(rimLight);

    const underGlow = new THREE.PointLight(0xffd28a, 0.85, 6);
    underGlow.position.set(0.2, -1.6, 1.8);
    scene.add(underGlow);

    pivotGroup = new THREE.Group();
    scene.add(pivotGroup);

    raycaster = new THREE.Raycaster();
    mouseNDC = new THREE.Vector2();
  }

  function resizeRenderer() {
    if (!renderer || !camera || !elCanvas) return;
    const rect = elCanvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width || 640));
    const h = Math.max(1, Math.floor(rect.height || 370));
    renderer.setSize(w, h, false);
    const aspect = w / h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    // Pull back slightly on narrow portrait aspect ratios so wide objects (like the telescope) never clip horizontally
    baseCamZ = aspect < 1.38 ? Math.min(4.65, DEFAULT_CAM_Z * (1.38 / Math.max(0.82, aspect))) : DEFAULT_CAM_Z;
  }

  function raycastHotspot(clientX, clientY) {
    if (!raycaster || !camera || !currentMeshGroup || !elCanvas) return null;
    const rect = elCanvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    mouseNDC.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNDC.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouseNDC, camera);
    const hits = raycaster.intersectObject(currentMeshGroup, true);
    for (let i = 0; i < hits.length; i++) {
      if (hits[i].object && hits[i].object.userData && hits[i].object.userData.hotspot) {
        return hits[i].object.userData.hotspot;
      }
    }
    return null;
  }

  function animate(now) {
    if (!isOpenFlag) return;
    rafId = requestAnimationFrame(animate);

    const dt = Math.min(0.05, lastTime ? (now - lastTime) / 1000 : 0.016);
    lastTime = now;
    elapsed += dt;

    // Gentle idle presentation turn until user drags or opens telescope
    const activelyTouching = (touchMode === 'drag' || touchMode === 'pinch');
    if (idleAutoSpin && !dragging && !activelyTouching && currentItemId !== 'telescope') {
      targetRotY += dt * 0.38;
    }

    // Apply smooth touch/flick rotational inertia when released
    if (!dragging && !activelyTouching && (Math.abs(velX) > 0.0005 || Math.abs(velY) > 0.0005)) {
      targetRotY += velY * dt;
      targetRotX = Math.max(-1.35, Math.min(1.35, targetRotX + velX * dt));
      const decay = Math.exp(-5.8 * dt);
      velX *= decay;
      velY *= decay;
      if (Math.abs(velX) < 0.001) velX = 0;
      if (Math.abs(velY) < 0.001) velY = 0;
    }

    // Smooth damped rotation & pinch/wheel camera zoom
    const rotDamp = 1 - Math.exp(-12 * dt);
    rotX += (targetRotX - rotX) * rotDamp;
    rotY += (targetRotY - rotY) * rotDamp;

    if (camera) {
      currentCamZ += (targetCamZ - currentCamZ) * (1 - Math.exp(-11 * dt));
      camera.position.z = currentCamZ;
    }

    if (pivotGroup) {
      pivotGroup.rotation.x = rotX;
      pivotGroup.rotation.y = rotY;
      pivotGroup.position.y = Math.sin(elapsed * 1.8) * 0.035;
    }

    // Telescope pulsing ring & unscrewing animation
    if (currentItemId === 'telescope' && telescopeState) {
      if (!telescopeState.opened) {
        const pulse = 0.65 + 0.55 * Math.sin(elapsed * 4.5) + (hoveringHotspot ? 0.9 : 0);
        telescopeState.pulseMat.emissiveIntensity = pulse;
        const s = hoveringHotspot ? 1.09 : (1.0 + 0.03 * Math.sin(elapsed * 4.5));
        telescopeState.pulseRing.scale.set(1, s, s);
      } else if (telescopeState.unscrewing) {
        // Wall-clock progress (0.95s) so animation always completes cleanly even under software WebGL
        const p = Math.min(1, (performance.now() - telescopeState.unscrewStartMs) / 950);
        telescopeState.progress = p;
        const ease = 1 - Math.pow(1 - p, 3);

        // Unscrew rotation around barrel X axis + slide off & lower cleanly below-right
        telescopeState.eyepieceGroup.rotation.x = ease * Math.PI * 4;
        const shiftOut = Math.min(1, p / 0.55);
        const shiftEase = 1 - Math.pow(1 - shiftOut, 2);
        const dropDown = Math.max(0, (p - 0.35) / 0.65);
        const dropEase = dropDown * dropDown * (3 - 2 * dropDown);

        telescopeState.eyepieceGroup.position.set(
          0.74 * shiftEase - 0.12 * dropEase,
          -0.52 * dropEase,
          0.10 * dropEase
        );
        telescopeState.eyepieceGroup.rotation.z = -0.35 * dropEase;

        // Center the revealed barrel smoothly
        telescopeState.root.position.x = -0.22 * ease;

        // Hide pulsing seam ring once unscrewed
        telescopeState.pulseRing.visible = false;

        // Slide out the gleaming Cobalt Blue Filter lens prominently above the revealed band!
        if (telescopeState.showCobaltPreview) {
          telescopeState.cobaltGroup.visible = true;
          const lensP = Math.max(0, Math.min(1, (p - 0.18) / 0.72));
          const lensEase = 1 - Math.pow(1 - lensP, 3);
          telescopeState.cobaltGroup.position.set(
            0.62 + 0.16 * lensEase,
            0.46 * lensEase,
            0.22 * lensEase
          );
          telescopeState.cobaltGroup.rotation.y = Math.sin(elapsed * 1.6) * 0.45;
        }

        if (p >= 1) {
          telescopeState.unscrewing = false;
        }
      } else if (telescopeState.showCobaltPreview && telescopeState.cobaltGroup.visible) {
        // Keep the freshly discovered cobalt filter gently gleaming above right during this inspection
        telescopeState.cobaltGroup.rotation.y = Math.sin(elapsed * 1.6) * 0.45;
        telescopeState.cobaltGroup.position.y = 0.46 + Math.sin(elapsed * 2.8) * 0.03;
      }
    }

    if (renderer && scene && camera) {
      renderer.render(scene, camera);
    }
  }

  /* ========================================================================
     PUBLIC API
     ======================================================================== */

  const Inspector = {
    init: function () {
      if (initialized) return;
      initialized = true;

      elModal = document.getElementById('inspector-modal');
      elCanvas = document.getElementById('inspector-canvas');
      elTitle = document.getElementById('inspector-title');
      elSubtitle = document.getElementById('inspector-subtitle');
      elDesc = document.getElementById('inspector-desc');
      elHintTag = document.getElementById('inspector-hint-tag');
      elBtnClose = document.getElementById('btn-close-inspector');

      if (elBtnClose) {
        elBtnClose.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.9);
          Inspector.close();
        });
      }

      if (elModal) {
        elModal.addEventListener('click', function (e) {
          if (e.target === elModal) {
            Inspector.close();
          }
        });
      }

      if (elCanvas) {
        elCanvas.addEventListener('mousedown', function (e) {
          if (e.button !== 0) return;
          dragging = true;
          idleAutoSpin = false;
          pointerMoved = false;
          pointerDownX = lastPointerX = e.clientX;
          pointerDownY = lastPointerY = e.clientY;
        });

        window.addEventListener('mousemove', function (e) {
          if (!isOpenFlag) return;
          if (dragging) {
            const dx = e.clientX - lastPointerX;
            const dy = e.clientY - lastPointerY;
            lastPointerX = e.clientX;
            lastPointerY = e.clientY;

            if (Math.hypot(e.clientX - pointerDownX, e.clientY - pointerDownY) > 5) {
              pointerMoved = true;
            }
            targetRotY += dx * 0.0115;
            targetRotX = Math.max(-1.35, Math.min(1.35, targetRotX + dy * 0.0115));
            return;
          }

          // Hover raycast for telescope eyepiece hotspot
          if (currentItemId === 'telescope' && telescopeState && !telescopeState.opened) {
            const hit = raycastHotspot(e.clientX, e.clientY);
            hoveringHotspot = (hit === 'telescope_eyepiece');
            elCanvas.style.cursor = hoveringHotspot ? 'pointer' : 'grab';
            if (elHintTag) {
              if (hoveringHotspot) {
                elHintTag.textContent = 'Haz clic en el ocular para desenroscar';
                elHintTag.classList.remove('hidden');
              } else {
                elHintTag.classList.add('hidden');
              }
            }
          } else {
            hoveringHotspot = false;
            elCanvas.style.cursor = 'grab';
          }
        });

        window.addEventListener('mouseup', function (e) {
          if (!dragging) return;
          dragging = false;
          if (!isOpenFlag) return;

          // Treat short mouse click as interactive hotspot check
          if (!pointerMoved && e.button === 0 && currentItemId === 'telescope' && telescopeState && !telescopeState.opened) {
            const hit = raycastHotspot(e.clientX, e.clientY);
            if (hit === 'telescope_eyepiece') {
              performTelescopeUnscrew();
            }
          }
        });

        // Desktop mouse-wheel zoom inside 3D Inspector
        elCanvas.addEventListener('wheel', function (e) {
          if (!isOpenFlag) return;
          e.preventDefault();
          const step = e.deltaY > 0 ? 0.24 : -0.24;
          targetCamZ = Math.max(MIN_CAM_Z, Math.min(MAX_CAM_Z, targetCamZ + step));
        }, { passive: false });

        // Fluid Native Touch Controls (1-finger rotate + inertia, 2-finger pinch zoom, tap hotspot)
        elCanvas.addEventListener('touchstart', function (e) {
          if (!isOpenFlag) return;
          e.preventDefault();
          idleAutoSpin = false;
          velX = 0;
          velY = 0;

          if (e.touches.length === 1) {
            const t = e.touches[0];
            touchMode = 'drag';
            touchStartX = touchLastX = t.clientX;
            touchStartY = touchLastY = t.clientY;
            touchStartTime = touchLastTime = performance.now();
            touchMoved = false;
          } else if (e.touches.length >= 2) {
            touchMode = 'pinch';
            touchMoved = true;
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            pinchStartDist = Math.max(12, Math.hypot(dx, dy));
            pinchStartCamZ = targetCamZ;
          }
        }, { passive: false });

        elCanvas.addEventListener('touchmove', function (e) {
          if (!isOpenFlag) return;
          e.preventDefault();

          if (e.touches.length >= 2) {
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const dist = Math.max(12, Math.hypot(dx, dy));
            if (touchMode !== 'pinch') {
              touchMode = 'pinch';
              touchMoved = true;
              pinchStartDist = dist;
              pinchStartCamZ = targetCamZ;
            } else if (pinchStartDist > 0) {
              const scale = dist / pinchStartDist;
              targetCamZ = Math.max(MIN_CAM_Z, Math.min(MAX_CAM_Z, pinchStartCamZ / scale));
            }
            return;
          }

          if (touchMode === 'drag' && e.touches.length === 1) {
            const t = e.touches[0];
            const now = performance.now();
            const dtMs = Math.max(8, now - touchLastTime);
            const dx = t.clientX - touchLastX;
            const dy = t.clientY - touchLastY;
            touchLastX = t.clientX;
            touchLastY = t.clientY;
            touchLastTime = now;

            if (Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY) > 10) {
              touchMoved = true;
            }

            const rotScale = 0.013;
            const dRotY = dx * rotScale;
            const dRotX = dy * rotScale;
            targetRotY += dRotY;
            targetRotX = Math.max(-1.35, Math.min(1.35, targetRotX + dRotX));

            // Track smoothed angular velocity (rad/sec) for inertial coast on release
            const instVelY = Math.max(-9, Math.min(9, (dRotY / dtMs) * 1000));
            const instVelX = Math.max(-6, Math.min(6, (dRotX / dtMs) * 1000));
            velY = velY * 0.45 + instVelY * 0.55;
            velX = velX * 0.45 + instVelX * 0.55;
          }
        }, { passive: false });

        function handleTouchEnd(e) {
          if (!isOpenFlag) return;
          e.preventDefault();

          if (e.touches.length === 0) {
            if (touchMode === 'drag' && !touchMoved && e.changedTouches && e.changedTouches.length > 0) {
              const t = e.changedTouches[0];
              const tapDuration = performance.now() - touchStartTime;
              const tapDist = Math.hypot(t.clientX - touchStartX, t.clientY - touchStartY);
              if (tapDist <= 10 && tapDuration < 420) {
                velX = 0;
                velY = 0;
                if (SR.UI && typeof SR.UI.showTapRipple === 'function') {
                  SR.UI.showTapRipple(t.clientX, t.clientY);
                }
                if (currentItemId === 'telescope' && telescopeState && !telescopeState.opened) {
                  const hit = raycastHotspot(t.clientX, t.clientY);
                  if (hit === 'telescope_eyepiece') {
                    performTelescopeUnscrew();
                  }
                }
              }
            } else if (touchMode === 'drag' && performance.now() - touchLastTime > 90) {
              // Finger paused before lift — stop inertia cleanly
              velX = 0;
              velY = 0;
            }
            touchMode = 'none';
          } else if (e.touches.length === 1 && touchMode === 'pinch') {
            // Prevent jump when one finger lifts slightly before the other after pinch
            touchMode = 'pinch_cooldown';
            velX = 0;
            velY = 0;
          }
        }

        elCanvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        elCanvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
      }

      window.addEventListener('resize', function () {
        if (isOpenFlag) resizeRenderer();
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpenFlag) {
          Inspector.close();
        }
      });
    },

    open: function (itemId) {
      if (!initialized) Inspector.init();
      if (!elModal || !itemId) return;

      const def = SR.State && SR.State.getItemDef(itemId);
      if (!def) return;

      if (SR.Audio) SR.Audio.playClick(1.1);

      currentItemId = itemId;
      hoveringHotspot = false;
      dragging = false;
      touchMode = 'none';
      velX = 0;
      velY = 0;
      currentCamZ = targetCamZ = DEFAULT_CAM_Z;
      idleAutoSpin = (itemId !== 'telescope');

      const isCoarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

      // Show modal first so canvas has valid layout dimensions
      elModal.classList.remove('hidden');
      isOpenFlag = true;

      if (elTitle) elTitle.textContent = def.name;
      if (elSubtitle) {
        if (itemId === 'telescope' && !SR.State.data.telescopeOpened) {
          elSubtitle.textContent = isCoarse
            ? 'Arrastra para rotar 360° • Pellizca para zoom • Toca el ocular'
            : 'Arrastra para rotar 360° • Examina y haz clic en el ocular trasero';
        } else {
          elSubtitle.textContent = isCoarse
            ? 'Arrastra con un dedo para rotar 360° • Pellizca para hacer zoom'
            : 'Arrastra con el ratón para rotar 360° • Examina cada detalle';
        }
      }

      if (elDesc) {
        if (itemId === 'telescope' && SR.State.data.telescopeOpened) {
          elDesc.textContent = '¡El ocular ocultaba un Filtro de Cobalto azul y una inscripción musical en el tubo: III - I - V - II - IV!';
        } else {
          elDesc.textContent = def.desc;
        }
      }

      if (elHintTag) {
        if (itemId === 'telescope' && SR.State.data.telescopeOpened) {
          elHintTag.textContent = 'Grabado interior: III — I — V — II — IV';
          elHintTag.classList.remove('hidden');
        } else if (itemId === 'telescope' && isCoarse) {
          elHintTag.textContent = 'Toca el ocular para desenroscar';
          elHintTag.classList.remove('hidden');
        } else {
          elHintTag.classList.add('hidden');
        }
      }

      ensureRenderer();
      resizeRenderer();
      currentCamZ = targetCamZ = baseCamZ;
      if (camera) camera.position.z = baseCamZ;
      clearCurrentModel();

      if (pivotGroup) {
        currentMeshGroup = buildItemModel(itemId);
        pivotGroup.add(currentMeshGroup);

        // Ideal showcase starting orientation
        if (itemId === 'telescope') {
          rotX = targetRotX = 0.14;
          rotY = targetRotY = SR.State.data.telescopeOpened ? -0.10 : -0.34;
        } else {
          rotX = targetRotX = 0.24;
          rotY = targetRotY = -0.32;
        }
        pivotGroup.rotation.set(rotX, rotY, 0);
      }

      lastTime = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(animate);
    },

    close: function () {
      if (!isOpenFlag) return;
      isOpenFlag = false;
      dragging = false;
      touchMode = 'none';
      velX = 0;
      velY = 0;
      hoveringHotspot = false;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (elModal) elModal.classList.add('hidden');
      if (elHintTag) elHintTag.classList.add('hidden');
    },

    isOpen: function () {
      return isOpenFlag;
    },

    getCurrentItem: function () {
      return currentItemId;
    },

    triggerTelescopeUnscrew: function () {
      return performTelescopeUnscrew();
    }
  };

  SR.Inspector = Inspector;
})(window.SR = window.SR || {});
