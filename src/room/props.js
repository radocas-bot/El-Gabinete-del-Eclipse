/* ==========================================================================
   src/room/props.js — Decorative Storytelling Props on Walls 135°, 225°, 315°
   Strictly bounded within local X [-1.4, +1.4], Z [0, 0.85]
   ========================================================================== */
(function (SR) {
  'use strict';

  const flames = [];
  let fireLight = null;
  let emberMesh = null;
  let emberSparkPoints = null;
  let emberSparkBase = null;
  let celestialGlobeMesh = null;
  let curioGears = [];

  function makeWallGroup(angleDeg, name) {
    const tf = SR.ROOM.wallTransform(angleDeg, 0);
    const grp = new THREE.Group();
    grp.name = name;
    grp.position.set(tf.x, 0, tf.z);
    grp.rotation.y = tf.rotY;
    return grp;
  }

  // ==========================================================================
  // WALL 135° (SE): Gothic Eclipse Stained-Glass Window, Brass Tripod Telescope,
  // Velvet Drape & Antique Celestial Globe
  // ==========================================================================
  function buildStainedGlassWall(scene) {
    const M = SR.Materials;
    const T = SR.Textures;
    const grp = makeWallGroup(135, 'Wall_SE_Window');

    const mahogany = M.get('mahogany');
    const darkWood = M.get('darkWood');
    const slate = M.get('slate');
    const brass = M.get('brass');
    const agedBrass = M.get('agedBrass');
    const velvet = M.get('velvet');

    // Gothic Window Frame (centered at X=0, Y=0.82..3.52, width 1.62m)
    const winW = 1.44;
    const winH = 2.48;
    const winY = 2.12;

    // Backlit Eclipse Stained-Glass Plane (pointed Gothic arch clip via shape)
    const archShape = new THREE.Shape();
    const hw = winW / 2;
    const rectH = winH * 0.68;
    archShape.moveTo(-hw, 0);
    archShape.lineTo(hw, 0);
    archShape.lineTo(hw, rectH);
    archShape.quadraticCurveTo(hw, winH * 0.92, 0, winH);
    archShape.quadraticCurveTo(-hw, winH * 0.92, -hw, rectH);
    archShape.closePath();

    const archGeo = new THREE.ShapeGeometry(archShape, 24);
    // Normalize UVs cleanly to [0..1]
    const pos = archGeo.attributes.position;
    const uvs = [];
    for (let i = 0; i < pos.count; i++) {
      uvs.push((pos.getX(i) + hw) / winW, pos.getY(i) / winH);
    }
    archGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

    const glassTex = T.stainedGlass().map;
    const glassMat = new THREE.MeshStandardMaterial({
      map: glassTex,
      emissiveMap: glassTex,
      emissive: new THREE.Color(0xc8dcff),
      emissiveIntensity: 1.05,
      roughness: 0.22,
      metalness: 0.1
    });
    const glassPane = new THREE.Mesh(archGeo, glassMat);
    glassPane.position.set(0, 0.88, 0.045);
    grp.add(glassPane);

    // Carved Stone & Mahogany Gothic Surround Mullions
    const leftJamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, rectH + 0.14, 0.14), slate);
    leftJamb.position.set(-hw - 0.06, 0.88 + rectH / 2, 0.07);
    grp.add(leftJamb);

    const rightJamb = new THREE.Mesh(new THREE.BoxGeometry(0.14, rectH + 0.14, 0.14), slate);
    rightJamb.position.set(hw + 0.06, 0.88 + rectH / 2, 0.07);
    grp.add(rightJamb);

    // Carved Gothic Pointed Arch Molding
    const archCurvePts = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      let ax, ay;
      if (t <= 0.5) {
        const u = t * 2;
        const inv = 1 - u;
        ax = inv * inv * (-hw - 0.05) + 2 * inv * u * (-hw - 0.04) + u * u * 0;
        ay = inv * inv * rectH + 2 * inv * u * (winH * 0.93) + u * u * (winH + 0.05);
      } else {
        const u = (t - 0.5) * 2;
        const inv = 1 - u;
        ax = inv * inv * 0 + 2 * inv * u * (hw + 0.04) + u * u * (hw + 0.05);
        ay = inv * inv * (winH + 0.05) + 2 * inv * u * (winH * 0.93) + u * u * rectH;
      }
      archCurvePts.push(new THREE.Vector3(ax, 0.88 + ay, 0.095));
    }
    const archMolding = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archCurvePts), 28, 0.072, 8, false),
      slate
    );
    grp.add(archMolding);

    // Heavy Stone Window Sill
    const sill = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.42, 0.12, 0.28), slate);
    sill.position.set(0, 0.84, 0.12);
    grp.add(sill);

    // Subtle Brass Mullion Crossbars
    const vMullion = new THREE.Mesh(new THREE.BoxGeometry(0.032, winH * 0.62, 0.04), darkWood);
    vMullion.position.set(0, 0.88 + winH * 0.31, 0.065);
    grp.add(vMullion);

    const hMullion = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.032, 0.04), darkWood);
    hMullion.position.set(0, 0.88 + winH * 0.46, 0.065);
    grp.add(hMullion);

    // Soft cool indigo moonlight glow coming through stained glass
    const windowLight = new THREE.PointLight(0x5d82e6, 1.35, 5.2, 1.6);
    windowLight.position.set(0, winY, 0.52);
    grp.add(windowLight);

    // Crimson Velvet Curtain Drape on Left Side (X = -1.04)
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.35, 10), brass);
    rod.rotation.z = Math.PI / 2;
    rod.position.set(0, 3.48, 0.22);
    grp.add(rod);
    [-1.18, 1.18].forEach(function (fx) {
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), brass);
      finial.position.set(fx, 3.48, 0.22);
      grp.add(finial);
    });

    // Sculpted vertical velvet drapery folds
    for (let f = 0; f < 4; f++) {
      const fold = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.088, 3.32, 10),
        velvet
      );
      fold.position.set(-1.12 + f * 0.08, 1.76, 0.20 + Math.sin(f * 1.4) * 0.025);
      fold.rotation.z = -0.025 * f;
      grp.add(fold);
    }
    const tieBack = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 16), brass);
    tieBack.rotation.x = Math.PI / 2;
    tieBack.position.set(-1.02, 1.25, 0.21);
    grp.add(tieBack);

    // Antique Celestial Globe on Carved Walnut Stand (X = -0.92, Z = 0.58)
    const globeStand = new THREE.Group();
    globeStand.position.set(-0.92, 0, 0.58);

    const gBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.08, 16), darkWood);
    gBase.position.y = 0.04;
    globeStand.add(gBase);

    const gColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.085, 0.66, 12), mahogany);
    gColumn.position.y = 0.40;
    globeStand.add(gColumn);

    const gRingH = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.02, 8, 28), mahogany);
    gRingH.rotation.x = Math.PI / 2;
    gRingH.position.y = 0.96;
    globeStand.add(gRingH);

    // 4 curved cradle arms
    for (let a = 0; a < 4; a++) {
      const ang = (a * Math.PI) / 2;
      const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 6), agedBrass);
      strut.position.set(Math.cos(ang) * 0.14, 0.80, Math.sin(ang) * 0.14);
      strut.rotation.z = -Math.cos(ang) * 0.58;
      strut.rotation.x = Math.sin(ang) * 0.58;
      globeStand.add(strut);
    }

    const meridianRing = new THREE.Mesh(new THREE.TorusGeometry(0.225, 0.012, 8, 32), brass);
    meridianRing.position.y = 0.96;
    meridianRing.rotation.z = 0.38;
    globeStand.add(meridianRing);

    const globeTex = T.makeCanvasTexture(512, 256, function (ctx, w, h) {
      ctx.fillStyle = '#142642';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(218, 178, 94, 0.55)';
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += w / 12) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += h / 6) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Ecliptic diagonal golden band
      ctx.strokeStyle = '#f0c462';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 8) {
        const y = h / 2 + Math.sin((x / w) * Math.PI * 2) * (h * 0.24);
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // Golden stars
      ctx.fillStyle = '#ffe599';
      for (let i = 0; i < 65; i++) {
        const sx = (i * 73) % w;
        const sy = 20 + ((i * 47) % (h - 40));
        ctx.beginPath(); ctx.arc(sx, sy, 2 + (i % 2), 0, Math.PI * 2); ctx.fill();
      }
    });
    celestialGlobeMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.195, 24, 18),
      new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.42, metalness: 0.18 })
    );
    celestialGlobeMesh.position.y = 0.96;
    celestialGlobeMesh.rotation.z = 0.38;
    globeStand.add(celestialGlobeMesh);

    grp.add(globeStand);

    // Ornate Brass Observatory Tripod Telescope (X = +0.92, Z = 0.56)
    const scopeGrp = new THREE.Group();
    scopeGrp.position.set(0.92, 0, 0.56);

    // 3 angled mahogany & brass-shod tripod legs
    for (let l = 0; l < 3; l++) {
      const a = (l * Math.PI * 2) / 3 + 0.4;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 1.38, 8), mahogany);
      leg.position.set(Math.cos(a) * 0.22, 0.65, Math.sin(a) * 0.22);
      leg.rotation.z = Math.cos(a) * 0.31;
      leg.rotation.x = -Math.sin(a) * 0.31;
      scopeGrp.add(leg);

      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 8), brass);
      tip.rotation.x = Math.PI;
      tip.position.set(Math.cos(a) * 0.42, 0.04, Math.sin(a) * 0.42);
      scopeGrp.add(tip);
    }

    const headHub = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.14, 12), brass);
    headHub.position.y = 1.32;
    scopeGrp.add(headHub);

    // Tilted brass telescope barrel aimed up toward the eclipse window
    const tubePivot = new THREE.Group();
    tubePivot.position.set(0, 1.44, 0);
    tubePivot.rotation.y = -0.52;
    tubePivot.rotation.x = -0.44;

    const mainBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.92, 16), brass);
    mainBarrel.rotation.x = Math.PI / 2;
    tubePivot.add(mainBarrel);

    const dewShield = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.058, 0.24, 16), agedBrass);
    dewShield.rotation.x = Math.PI / 2;
    dewShield.position.z = -0.54;
    tubePivot.add(dewShield);

    const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.056, 16), M.get('sapphireGlass'));
    objLens.position.z = -0.66;
    objLens.rotation.y = Math.PI;
    tubePivot.add(objLens);

    const eyepiece = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.22, 12), darkWood);
    eyepiece.rotation.x = Math.PI / 2;
    eyepiece.position.z = 0.54;
    tubePivot.add(eyepiece);

    // Parallel finder scope
    const finder = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.012, 0.42, 10), agedBrass);
    finder.rotation.x = Math.PI / 2;
    finder.position.set(0, 0.085, 0.04);
    tubePivot.add(finder);

    scopeGrp.add(tubePivot);
    grp.add(scopeGrp);

    if (SR.registerInteractive) {
      SR.registerInteractive(glassPane, {
        id: 'prop_eclipse_window',
        station: 'props',
        activeViews: ['room'],
        action: 'Observar',
        label: 'Vitral del Gran Eclipse',
        cursor: 'interact',
        onClick: function () {
          SR.Audio.playCrystal(0.95);
          if (SR.UI && SR.UI.say) {
            SR.UI.say('El vitral conmemora el Eclipse Total de 1894. La luz nocturna baña el telescopio de latón de Valerio.');
          }
        }
      });
    }

    scene.add(grp);
  }

  // ==========================================================================
  // WALL 225° (SW): Carved Dark-Slate Fireplace, Flickering Flames + Warm Light,
  // Brass Hourglass, Astrolabe & Framed Emblem of Maestro Valerio
  // ==========================================================================
  function buildFireplaceWall(scene) {
    const M = SR.Materials;
    const T = SR.Textures;
    const grp = makeWallGroup(225, 'Wall_SW_Fireplace');

    const slate = M.get('slate');
    const marble = M.get('marble');
    const brass = M.get('brass');
    const agedBrass = M.get('agedBrass');
    const darkIron = M.get('darkIron');
    const darkWood = M.get('darkWood');
    const mahogany = M.get('mahogany');

    // Hearth Base Slab
    const hearth = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.12, 0.72), slate);
    hearth.position.set(0, 0.06, 0.36);
    hearth.receiveShadow = true;
    grp.add(hearth);

    // Left & Right Carved Slate Pilaster Piers
    [-0.78, 0.78].forEach(function (px) {
      const pier = new THREE.Mesh(new THREE.BoxGeometry(0.38, 1.32, 0.52), slate);
      pier.position.set(px, 0.76, 0.26);
      pier.castShadow = true;
      pier.receiveShadow = true;
      grp.add(pier);

      // Decorative recessed marble panel on pier front
      const inset = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.92, 0.04), marble);
      inset.position.set(px, 0.78, 0.52);
      grp.add(inset);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.06), brass);
      trim.position.set(px, 1.28, 0.52);
      grp.add(trim);
    });

    // Upper Mantel Lintel & Overhanging Shelf (Y = 1.48)
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.28, 0.54), slate);
    lintel.position.set(0, 1.32, 0.27);
    grp.add(lintel);

    const mantelShelf = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.10, 0.64), marble);
    mantelShelf.position.set(0, 1.49, 0.32);
    mantelShelf.receiveShadow = true;
    grp.add(mantelShelf);

    // Chimney Breast Rising to Cornice
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.66, 2.34, 0.36), mahogany);
    chimney.position.set(0, 2.71, 0.18);
    grp.add(chimney);

    // Recessed Brick Firebox Back & Side Walls
    const brickTex = T.hearthBricks();
    const brickMat = new THREE.MeshStandardMaterial({
      map: brickTex.map,
      bumpMap: brickTex.bumpMap,
      bumpScale: 0.025,
      roughness: 0.92
    });
    const fireBack = new THREE.Mesh(new THREE.PlaneGeometry(1.22, 1.08), brickMat);
    fireBack.position.set(0, 0.65, 0.04);
    grp.add(fireBack);

    // Wrought-Iron Fire Grate & Fender
    const fender = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.06), brass);
    fender.position.set(0, 0.16, 0.56);
    grp.add(fender);

    for (let g = -3; g <= 3; g++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.34, 6), darkIron);
      bar.rotation.x = Math.PI / 2;
      bar.position.set(g * 0.13, 0.24, 0.28);
      grp.add(bar);
    }

    // Charred Oak Logs
    const logMat = new THREE.MeshStandardMaterial({
      color: 0x1e120d,
      emissive: 0x451404,
      emissiveIntensity: 0.55,
      roughness: 0.95
    });
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.72, 10), logMat);
    log1.rotation.z = Math.PI / 2 + 0.12;
    log1.rotation.y = 0.25;
    log1.position.set(-0.04, 0.31, 0.26);
    grp.add(log1);

    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.066, 0.66, 10), logMat);
    log2.rotation.z = Math.PI / 2 - 0.18;
    log2.rotation.y = -0.35;
    log2.position.set(0.06, 0.35, 0.24);
    grp.add(log2);

    // Glowing Pulsing Ember Bed
    const emberMat = new THREE.MeshStandardMaterial({
      color: 0x421204,
      emissive: 0xff4508,
      emissiveIntensity: 2.1,
      roughness: 0.85
    });
    emberMesh = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.32), emberMat);
    emberMesh.position.set(0, 0.23, 0.25);
    grp.add(emberMesh);

    // Layered Animated Flickering Flames
    const flameDefs = [
      { x: 0.0, z: 0.24, r: 0.14, h: 0.44, color: 0xff6e1a, phase: 0.0 },
      { x: -0.17, z: 0.27, r: 0.11, h: 0.34, color: 0xff9426, phase: 1.7 },
      { x: 0.18, z: 0.25, r: 0.10, h: 0.32, color: 0xff7b1c, phase: 3.1 },
      { x: 0.02, z: 0.26, r: 0.075, h: 0.28, color: 0xffe074, phase: 4.5 }
    ];
    flameDefs.forEach(function (fd) {
      const fMat = new THREE.MeshBasicMaterial({
        color: fd.color,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(fd.r, fd.h, 8), fMat);
      cone.position.set(fd.x, 0.33 + fd.h * 0.4, fd.z);
      grp.add(cone);
      flames.push({
        mesh: cone,
        baseY: 0.33 + fd.h * 0.4,
        baseX: fd.x,
        phase: fd.phase
      });
    });

    // Rising Fireplace Ember Sparks
    const spCount = 28;
    const spPos = new Float32Array(spCount * 3);
    emberSparkBase = new Float32Array(spCount * 3);
    for (let i = 0; i < spCount; i++) {
      spPos[i * 3] = (Math.random() - 0.5) * 0.58;
      spPos[i * 3 + 1] = 0.32 + Math.random() * 0.65;
      spPos[i * 3 + 2] = 0.20 + Math.random() * 0.16;
      emberSparkBase[i * 3] = spPos[i * 3];
      emberSparkBase[i * 3 + 1] = spPos[i * 3 + 1];
      emberSparkBase[i * 3 + 2] = spPos[i * 3 + 2];
    }
    const spGeo = new THREE.BufferGeometry();
    spGeo.setAttribute('position', new THREE.BufferAttribute(spPos, 3));
    emberSparkPoints = new THREE.Points(spGeo, new THREE.PointsMaterial({
      map: T.softParticle(),
      color: 0xffa642,
      size: 0.045,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    }));
    emberSparkPoints.raycast = function () {};
    grp.add(emberSparkPoints);

    // Real Warm Flickering Fireplace PointLight!
    fireLight = new THREE.PointLight(0xff7c2e, 3.2, 8.8, 1.5);
    fireLight.position.set(0, 0.65, 0.72);
    grp.add(fireLight);

    // ---- Mantelpiece Props (Y = 1.54) ----
    // 1. Brass Hourglass (X = -0.66, Z = 0.36)
    const hgGrp = new THREE.Group();
    hgGrp.position.set(-0.66, 1.54, 0.36);

    [0.015, 0.305].forEach(function (y) {
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.025, 16), brass);
      cap.position.y = y;
      hgGrp.add(cap);
    });
    for (let p = 0; p < 3; p++) {
      const a = (p * Math.PI * 2) / 3;
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.29, 6), agedBrass);
      rod.position.set(Math.cos(a) * 0.068, 0.16, Math.sin(a) * 0.068);
      hgGrp.add(rod);
    }
    const bulbTop = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.125, 14), M.get('glass'));
    bulbTop.rotation.x = Math.PI;
    bulbTop.position.y = 0.22;
    hgGrp.add(bulbTop);

    const bulbBot = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.125, 14), M.get('glass'));
    bulbBot.position.y = 0.10;
    hgGrp.add(bulbBot);

    const sand = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.065, 12), M.get('gold'));
    sand.position.y = 0.065;
    hgGrp.add(sand);
    grp.add(hgGrp);

    // 2. Brass Armillary Astrolabe (X = +0.66, Z = 0.36)
    const astroGrp = new THREE.Group();
    astroGrp.position.set(0.66, 1.54, 0.36);

    const aBase = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.095, 0.04, 14), darkWood);
    aBase.position.y = 0.02;
    astroGrp.add(aBase);
    const aStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.02, 0.12, 8), brass);
    aStem.position.y = 0.09;
    astroGrp.add(aStem);

    [
      [0, 0, 0],
      [Math.PI / 2, 0.35, 0],
      [0.4, Math.PI / 2, 0.2]
    ].forEach(function (rot, idx) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.135 - idx * 0.012, 0.009, 8, 28), brass);
      ring.position.y = 0.27;
      ring.rotation.set(rot[0], rot[1], rot[2]);
      astroGrp.add(ring);
    });
    const aSun = new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 12), M.get('gold'));
    aSun.position.y = 0.27;
    astroGrp.add(aSun);
    grp.add(astroGrp);

    // 3. Framed Emblem of Maestro Valerio Above Mantel (Y = 2.52)
    const emblemTex = T.makeCanvasTexture(512, 540, function (ctx, w, h) {
      const bg = ctx.createRadialGradient(w / 2, h * 0.45, 30, w / 2, h * 0.45, w * 0.65);
      bg.addColorStop(0, '#2a1d19');
      bg.addColorStop(0.7, '#161013');
      bg.addColorStop(1, '#0c090c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Ornate double gold border
      ctx.strokeStyle = '#c89b48';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, w - 64, h - 64);

      // Solar Eclipse Crest
      const cx = w / 2;
      const cy = 225;
      const glow = ctx.createRadialGradient(cx, cy, 45, cx, cy, 130);
      glow.addColorStop(0, 'rgba(248, 210, 114, 0.9)');
      glow.addColorStop(0.5, 'rgba(201, 142, 48, 0.35)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(cx, cy, 130, 0, Math.PI * 2); ctx.fill();

      // 16 Sun rays
      ctx.fillStyle = '#dfb256';
      for (let i = 0; i < 16; i++) {
        const a = (i * Math.PI) / 8;
        const r = i % 2 === 0 ? 118 : 92;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a - 0.08) * 56, cy + Math.sin(a - 0.08) * 56);
        ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        ctx.lineTo(cx + Math.cos(a + 0.08) * 56, cy + Math.sin(a + 0.08) * 56);
        ctx.closePath();
        ctx.fill();
      }

      // Eclipsed moon center + golden rim
      ctx.beginPath(); ctx.arc(cx, cy, 52, 0, Math.PI * 2);
      ctx.fillStyle = '#120e16'; ctx.fill();
      ctx.strokeStyle = '#f8d886'; ctx.lineWidth = 5; ctx.stroke();

      // Initials "V · S"
      ctx.fillStyle = '#f2ce78';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('V · S', cx, cy + 2);

      // Motto Banner
      ctx.font = 'bold 21px Georgia, serif';
      ctx.fillStyle = '#ecc574';
      ctx.fillText('MAGISTER VALERIUS DE SOLIS', cx, 398);
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillStyle = '#b99c6b';
      ctx.fillText('HOROLOGIUM ECLIPSEOS • 1894', cx, 434);
      ctx.font = '15px Georgia, serif';
      ctx.fillStyle = '#9e8458';
      ctx.fillText('« S O L   •   L U N A   •   U M B R A »', cx, 474);
    });

    const frameOuter = new THREE.Mesh(new THREE.BoxGeometry(1.18, 1.24, 0.08), darkWood);
    frameOuter.position.set(0, 2.54, 0.38);
    grp.add(frameOuter);

    const frameGold = new THREE.Mesh(new THREE.BoxGeometry(1.06, 1.12, 0.088), brass);
    frameGold.position.set(0, 2.54, 0.385);
    grp.add(frameGold);

    const emblemCanvas = new THREE.Mesh(
      new THREE.PlaneGeometry(0.98, 1.04),
      new THREE.MeshStandardMaterial({ map: emblemTex, roughness: 0.45, metalness: 0.18 })
    );
    emblemCanvas.position.set(0, 2.54, 0.432);
    grp.add(emblemCanvas);

    if (SR.registerInteractive) {
      SR.registerInteractive(emblemCanvas, {
        id: 'prop_valerio_emblem',
        station: 'props',
        activeViews: ['room'],
        action: 'Leer',
        label: 'Blasón del Maestro Valerio',
        cursor: 'interact',
        onClick: function () {
          SR.Audio.playClick(0.95);
          if (SR.UI && SR.UI.say) {
            SR.UI.say('«Sol • Luna • Umbra» — El emblema de Valerio de Solís preside la chimenea encendida.');
          }
        }
      });
    }

    scene.add(grp);
  }

  // ==========================================================================
  // WALL 315° (NW): Tall Mahogany & Glass Curio Cabinet, Brass Gears, Flasks,
  // Framed Horological Treatise & Victorian Wall Barometer
  // ==========================================================================
  function buildCurioWall(scene) {
    const M = SR.Materials;
    const T = SR.Textures;
    const grp = makeWallGroup(315, 'Wall_NW_Curio');

    const mahogany = M.get('mahogany');
    const darkWood = M.get('darkWood');
    const brass = M.get('brass');
    const agedBrass = M.get('agedBrass');
    const copper = M.get('copper');
    const glass = M.get('glass');

    // ---- Tall Curio Cabinet (X = -0.34, width 1.40m, height 2.52m, depth 0.48m) ----
    const cab = new THREE.Group();
    cab.position.set(-0.34, 0, 0.02);

    // Lower solid cupboard base (Y = 0..0.72)
    const cabBase = new THREE.Mesh(new THREE.BoxGeometry(1.40, 0.72, 0.48), mahogany);
    cabBase.position.set(0, 0.36, 0.24);
    cabBase.castShadow = true;
    cabBase.receiveShadow = true;
    cab.add(cabBase);

    // Lower cabinet brass knobs
    [-0.08, 0.08].forEach(function (kx) {
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), brass);
      knob.position.set(kx, 0.56, 0.49);
      cab.add(knob);
    });

    // Back panel & side walls of upper glass display (Y = 0.72..2.42)
    const cabBack = new THREE.Mesh(new THREE.BoxGeometry(1.34, 1.72, 0.05), darkWood);
    cabBack.position.set(0, 1.58, 0.04);
    cab.add(cabBack);

    [-0.66, 0.66].forEach(function (sx) {
      const side = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.72, 0.46), mahogany);
      side.position.set(sx, 1.58, 0.24);
      cab.add(side);
    });

    // Molded Crown Top
    const cabCrown = new THREE.Mesh(new THREE.BoxGeometry(1.50, 0.14, 0.54), darkWood);
    cabCrown.position.set(0, 2.48, 0.25);
    cab.add(cabCrown);

    // 3 Interior Shelves (Y = 0.74, 1.30, 1.86)
    const shelfYs = [0.74, 1.30, 1.86];
    shelfYs.forEach(function (sy) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.032, 0.40), mahogany);
      sh.position.set(0, sy, 0.23);
      cab.add(sh);
    });

    // Shelf 1 (Bottom Display, Y = 0.76): Interlocking Brass Clockwork Gears & Calipers
    curioGears = [];
    const gearSpecs = [
      { x: -0.36, y: 0.96, r: 0.14, speed: 0.45, mat: brass },
      { x: -0.14, y: 1.04, r: 0.10, speed: -0.65, mat: agedBrass },
      { x: 0.05, y: 0.94, r: 0.12, speed: 0.52, mat: copper }
    ];
    gearSpecs.forEach(function (gs) {
      const gGrp = new THREE.Group();
      gGrp.position.set(gs.x, gs.y, 0.22);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(gs.r, 0.018, 8, 20), gs.mat);
      gGrp.add(rim);
      for (let s = 0; s < 4; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(gs.r * 1.9, 0.016, 0.016), gs.mat);
        spoke.rotation.z = (s * Math.PI) / 4;
        gGrp.add(spoke);
      }
      for (let t = 0; t < 12; t++) {
        const a = (t * Math.PI * 2) / 12;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.032, 0.02), gs.mat);
        tooth.position.set(Math.cos(a) * (gs.r + 0.018), Math.sin(a) * (gs.r + 0.018), 0);
        tooth.rotation.z = a + Math.PI / 2;
        gGrp.add(tooth);
      }
      cab.add(gGrp);
      curioGears.push({ group: gGrp, speed: gs.speed });
    });

    // Brass Calipers on right side of Shelf 1
    const cal1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.26, 0.012), brass);
    cal1.position.set(0.36, 0.90, 0.26);
    cal1.rotation.z = 0.28;
    cab.add(cal1);
    const cal2 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.26, 0.012), brass);
    cal2.position.set(0.46, 0.90, 0.26);
    cal2.rotation.z = -0.28;
    cab.add(cal2);

    // Shelf 2 (Middle Display, Y = 1.32): Glowing Alchemical / Optical Glass Flasks
    const flasks = [
      { x: -0.40, r: 0.08, h: 0.22, mat: M.get('amberGlass') },
      { x: -0.14, r: 0.095, h: 0.26, mat: M.get('rubyGlass') },
      { x: 0.14, r: 0.085, h: 0.24, mat: M.get('sapphireGlass') },
      { x: 0.42, r: 0.072, h: 0.20, mat: M.get('amberGlass') }
    ];
    flasks.forEach(function (fl) {
      const body = new THREE.Mesh(new THREE.SphereGeometry(fl.r, 14, 12), fl.mat);
      body.position.set(fl.x, 1.32 + fl.r, 0.24);
      cab.add(body);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(fl.r * 0.34, fl.r * 0.42, fl.h * 0.52, 10), fl.mat);
      neck.position.set(fl.x, 1.32 + fl.r * 1.85, 0.24);
      cab.add(neck);
      const stopper = new THREE.Mesh(new THREE.CylinderGeometry(fl.r * 0.42, fl.r * 0.32, 0.04, 10), brass);
      stopper.position.set(fl.x, 1.32 + fl.r * 2.25, 0.24);
      cab.add(stopper);
    });

    // Shelf 3 (Top Display, Y = 1.88): Rolled Parchment Scrolls & Brass Chronometer
    for (let s = 0; s < 3; s++) {
      const scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.36, 12), M.get('parchment'));
      scroll.rotation.z = Math.PI / 2;
      scroll.rotation.y = 0.15 * (s - 1);
      scroll.position.set(-0.34, 1.92 + s * 0.068, 0.24);
      cab.add(scroll);
    }
    const chronoBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20), brass);
    chronoBody.rotation.x = Math.PI / 2 - 0.22;
    chronoBody.position.set(0.28, 2.02, 0.24);
    cab.add(chronoBody);

    // Glass Display Doors with thin wooden mullions
    const glassDoor = new THREE.Mesh(new THREE.PlaneGeometry(1.26, 1.66), glass);
    glassDoor.position.set(0, 1.58, 0.45);
    cab.add(glassDoor);

    const centerStile = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.68, 0.04), mahogany);
    centerStile.position.set(0, 1.58, 0.455);
    cab.add(centerStile);

    // Subtle warm interior showcase light illuminating the clockwork gears & glass flasks
    const cabLight = new THREE.PointLight(0xffcb78, 1.05, 2.5, 1.7);
    cabLight.position.set(0, 2.24, 0.28);
    cab.add(cabLight);

    grp.add(cab);

    // ---- Right Side of NW Wall (X = +0.88): Framed Horological Treatise + Barometer ----
    const treatiseTex = T.makeCanvasTexture(512, 640, function (ctx, w, h) {
      ctx.fillStyle = '#ead9b3';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#3b2614';
      ctx.lineWidth = 4;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(32, 32, w - 64, h - 64);

      ctx.fillStyle = '#2d1c0d';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('TRATADO DE HOROLOGÍA', w / 2, 74);
      ctx.font = 'italic 16px Georgia, serif';
      ctx.fillText('Lámina IV — Escape Celestial y Engranajes', w / 2, 104);

      // Technical gear & eclipse diagram
      ctx.strokeStyle = '#3b2614';
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(w / 2, 275, 118, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, 275, 92, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(w / 2, 275, 36, 0, Math.PI * 2); ctx.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(w / 2 + Math.cos(a) * 36, 275 + Math.sin(a) * 36);
        ctx.lineTo(w / 2 + Math.cos(a) * 118, 275 + Math.sin(a) * 118);
        ctx.stroke();
      }
      // Small planetary orbital arcs below
      ctx.beginPath(); ctx.arc(170, 480, 56, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(340, 480, 56, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(114, 480); ctx.lineTo(396, 480); ctx.stroke();

      ctx.font = '15px Georgia, serif';
      ctx.fillText('Fig. A: Corona Dentada  •  Fig. B: Conjunción', w / 2, 578);
    });

    const trFrame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.02, 0.05), darkWood);
    trFrame.position.set(0.88, 2.26, 0.03);
    grp.add(trFrame);

    const trPaper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.74, 0.92),
      new THREE.MeshStandardMaterial({ map: treatiseTex, roughness: 0.78 })
    );
    trPaper.position.set(0.88, 2.26, 0.06);
    grp.add(trPaper);

    // Victorian Banjo Wall Barometer below Treatise (X = +0.88, Y = 1.24)
    const baroGrp = new THREE.Group();
    baroGrp.position.set(0.88, 1.24, 0.04);

    const baroBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.54, 0.04), mahogany);
    baroBody.position.y = 0.08;
    baroGrp.add(baroBody);

    const baroBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.155, 0.155, 0.055, 24), brass);
    baroBezel.rotation.x = Math.PI / 2;
    baroBezel.position.set(0, -0.06, 0.02);
    baroGrp.add(baroBezel);

    const baroTex = T.makeCanvasTexture(256, 256, function (ctx, w, h) {
      const cx = w / 2, cy = h / 2;
      ctx.fillStyle = '#f2e6ca';
      ctx.beginPath(); ctx.arc(cx, cy, 122, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#3c2916';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(cx, cy, 114, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#2a1a0d';
      ctx.font = 'bold 16px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('ECLIPSE', cx, 56);
      ctx.font = '13px Georgia, serif';
      ctx.fillText('TORMENTA', 58, 145);
      ctx.fillText('DESPEJADO', 198, 145);
      // Needle
      ctx.strokeStyle = '#1c1824';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(cx, cy + 28); ctx.lineTo(cx, 66); ctx.stroke();
      ctx.fillStyle = '#c9963e';
      ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
    });
    const baroDial = new THREE.Mesh(
      new THREE.CircleGeometry(0.135, 24),
      new THREE.MeshStandardMaterial({ map: baroTex, roughness: 0.45 })
    );
    baroDial.position.set(0, -0.06, 0.052);
    baroGrp.add(baroDial);

    grp.add(baroGrp);

    if (SR.registerInteractive) {
      SR.registerInteractive(cab, {
        id: 'prop_curio_cabinet',
        station: 'props',
        activeViews: ['room'],
        action: 'Observar',
        label: 'Vitrina de Curiosidades',
        cursor: 'interact',
        onClick: function () {
          SR.Audio.playGear(1.25);
          if (SR.UI && SR.UI.say) {
            SR.UI.say('Engranajes de precisión, frascos alquímicos y pergaminos del taller de Valerio descansan tras el cristal.');
          }
        }
      });
    }

    scene.add(grp);
  }

  function init(scene) {
    buildStainedGlassWall(scene);
    buildFireplaceWall(scene);
    buildCurioWall(scene);
  }

  function update(dt, elapsed) {
    const t = elapsed || 0;
    const safeDt = Math.min(dt || 0.016, 0.1);

    // Animated flickering fireplace flames & warm point light
    for (let i = 0; i < flames.length; i++) {
      const f = flames[i];
      const wave1 = Math.sin(t * 9.2 + f.phase);
      const wave2 = Math.sin(t * 16.5 + f.phase * 1.7);
      const scaleY = 0.85 + 0.24 * wave1 + 0.12 * wave2;
      const scaleXZ = 0.92 + 0.12 * Math.cos(t * 11.4 + f.phase);
      f.mesh.scale.set(scaleXZ, scaleY, scaleXZ);
      f.mesh.position.x = f.baseX + wave2 * 0.018;
      f.mesh.position.y = f.baseY + (scaleY - 1) * 0.09;
    }

    if (fireLight) {
      const uvDim = (SR.State && SR.State.data && SR.State.data.uvActive) ? 0.55 : 1.0;
      const flicker = 1 + 0.14 * Math.sin(t * 8.4) + 0.08 * Math.sin(t * 19.3);
      fireLight.intensity = 3.2 * flicker * uvDim;
    }

    if (emberMesh) {
      emberMesh.material.emissiveIntensity = 1.85 + 0.45 * Math.sin(t * 4.2);
    }

    if (emberSparkPoints && emberSparkBase) {
      const posAttr = emberSparkPoints.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const idx = i / 3;
        const cycle = (t * (0.45 + (idx % 5) * 0.08) + idx * 0.37) % 1;
        arr[i] = emberSparkBase[i] + Math.sin(t * 4 + idx) * 0.06;
        arr[i + 1] = 0.30 + cycle * 0.72;
        arr[i + 2] = emberSparkBase[i + 2] + Math.cos(t * 3.2 + idx) * 0.03;
      }
      posAttr.needsUpdate = true;
    }

    // Slow dignified rotation of celestial globe & curio cabinet gears
    if (celestialGlobeMesh) {
      celestialGlobeMesh.rotation.y += safeDt * 0.14;
    }
    for (let i = 0; i < curioGears.length; i++) {
      curioGears[i].group.rotation.z += safeDt * curioGears[i].speed;
    }
  }

  SR.Props = {
    init: init,
    update: update
  };
})(window.SR = window.SR || {});
