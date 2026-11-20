/* ==========================================================================
   src/room/architecture.js — Octagonal Chamber, Ribbed Celestial Dome,
   7 Corona Golden Stars, Lighting Rig, Moonlight Cone & Floating Dust
   ========================================================================== */
(function (SR) {
  'use strict';

  const R_WALL = 4.2;
  const H_WALL = 3.9;
  const H_DOME = 5.4;
  const WALL_WIDTH = 3.479;

  function wallTransform(angleDeg, inset) {
    inset = inset || 0;
    const rad = (angleDeg * Math.PI) / 180;
    const r = R_WALL - inset;
    return {
      x: r * Math.sin(rad),
      z: -r * Math.cos(rad),
      rotY: -rad
    };
  }

  // Expose SR.ROOM immediately at load time so stations can reference constants anytime
  SR.ROOM = {
    R_WALL: R_WALL,
    H_WALL: H_WALL,
    H_DOME: H_DOME,
    WALL_WIDTH: WALL_WIDTH,
    wallTransform: wallTransform
  };

  let root = null;
  const sconceFlames = [];
  const goldenStars = [];
  const starHalos = [];
  let dustPoints = null;
  let dustBasePositions = null;
  let moonlightBeam = null;

  const lights = {
    hemi: null,
    ambient: null,
    moonSpot: null,
    centerFill: null,
    quads: [],
    dawnLight: null
  };

  const baseColors = {
    hemiSky: new THREE.Color(0x9cb4df),
    hemiGround: new THREE.Color(0x472d1c),
    ambient: new THREE.Color(0x32293e),
    moon: new THREE.Color(0xaac8ff),
    uvSky: new THREE.Color(0x3452c8),
    uvGround: new THREE.Color(0x161230),
    uvAmbient: new THREE.Color(0x1b1d45),
    uvMoon: new THREE.Color(0x5288ff)
  };

  function buildFloor(parent) {
    const T = SR.Textures;
    const M = SR.Materials;

    // Thick octagonal floor foundation
    const baseGeo = new THREE.CylinderGeometry(4.65, 4.65, 0.16, 8);
    const baseMesh = new THREE.Mesh(baseGeo, M.get('darkWood'));
    baseMesh.position.y = -0.085;
    baseMesh.rotation.y = Math.PI / 8;
    baseMesh.receiveShadow = true;
    parent.add(baseMesh);

    // Zodiac Compass Rose inlaid slate floor plane
    const floorTex = T.slateFloor();
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTex.map,
      bumpMap: floorTex.bumpMap,
      bumpScale: 0.015,
      roughness: 0.58,
      metalness: 0.22
    });
    const floorGeo = new THREE.CircleGeometry(4.58, 8);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.rotation.z = Math.PI / 8;
    floorMesh.position.y = 0.0;
    floorMesh.receiveShadow = true;
    parent.add(floorMesh);

    // Crimson & gold octagonal woven carpet ring surrounding the Orrery
    const carpetTex = T.carpet();
    const carpetMat = new THREE.MeshStandardMaterial({
      map: carpetTex.map,
      bumpMap: carpetTex.bumpMap,
      bumpScale: 0.012,
      roughness: 0.88,
      metalness: 0.04
    });
    const carpetGeo = new THREE.RingGeometry(1.12, 2.52, 8, 1);
    const carpetMesh = new THREE.Mesh(carpetGeo, carpetMat);
    carpetMesh.rotation.x = -Math.PI / 2;
    carpetMesh.rotation.z = Math.PI / 8;
    carpetMesh.position.y = 0.004;
    carpetMesh.receiveShadow = true;
    parent.add(carpetMesh);

    // Raised burnished brass trim rings bordering the carpet
    [1.12, 2.52].forEach(function (r) {
      const trimGeo = new THREE.TorusGeometry(r, 0.014, 8, 8);
      const trim = new THREE.Mesh(trimGeo, M.get('brass'));
      trim.rotation.x = Math.PI / 2;
      trim.rotation.z = Math.PI / 8;
      trim.position.y = 0.008;
      parent.add(trim);
    });
  }

  function buildWallsAndPilasters(parent) {
    const M = SR.Materials;
    const mahogany = M.get('mahogany');
    const darkWood = M.get('darkWood');
    const brass = M.get('brass');
    const agedBrass = M.get('agedBrass');
    const damask = M.get('damaskWall');

    // 8 Octagonal wall segments
    for (let i = 0; i < 8; i++) {
      const deg = i * 45;
      const tf = wallTransform(deg, 0);
      const wallGrp = new THREE.Group();
      wallGrp.position.set(tf.x, 0, tf.z);
      wallGrp.rotation.y = tf.rotY;

      // Solid backing shell (extends outward toward local -Z so local Z >= 0 is clear for stations)
      const backMesh = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH + 0.12, H_WALL, 0.14),
        darkWood
      );
      backMesh.position.set(0, H_WALL / 2, -0.075);
      backMesh.receiveShadow = true;
      wallGrp.add(backMesh);

      // Lower mahogany wainscoting dado (Y = 0..1.12)
      const dado = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 1.12, 0.02),
        mahogany
      );
      dado.position.set(0, 0.56, -0.005);
      dado.receiveShadow = true;
      wallGrp.add(dado);

      // 3 Recessed wainscoting relief molding frames
      for (let p = -1; p <= 1; p++) {
        const px = p * 1.04;
        const frame = new THREE.Mesh(
          new THREE.BoxGeometry(0.86, 0.72, 0.016),
          darkWood
        );
        frame.position.set(px, 0.58, 0.002);
        wallGrp.add(frame);

        const inner = new THREE.Mesh(
          new THREE.BoxGeometry(0.76, 0.62, 0.018),
          mahogany
        );
        inner.position.set(px, 0.58, 0.005);
        inner.receiveShadow = true;
        wallGrp.add(inner);
      }

      // Baseboard & Chair rail moldings (very shallow relief so furniture sits flush)
      const baseboard = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 0.13, 0.032),
        darkWood
      );
      baseboard.position.set(0, 0.065, 0.008);
      wallGrp.add(baseboard);

      const chairRail = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 0.065, 0.036),
        mahogany
      );
      chairRail.position.set(0, 1.12, 0.01);
      wallGrp.add(chairRail);

      const brassDadoStrip = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 0.014, 0.04),
        agedBrass
      );
      brassDadoStrip.position.set(0, 1.155, 0.012);
      wallGrp.add(brassDadoStrip);

      // Upper Victorian damask wallpaper panel (Y = 1.16..3.62)
      const paper = new THREE.Mesh(
        new THREE.PlaneGeometry(WALL_WIDTH, 2.48),
        damask
      );
      paper.position.set(0, 2.40, 0.002);
      paper.receiveShadow = true;
      wallGrp.add(paper);

      // Crown entablature frieze & cornice (Y = 3.62..3.90)
      const frieze = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 0.24, 0.06),
        mahogany
      );
      frieze.position.set(0, 3.74, 0.02);
      wallGrp.add(frieze);

      const cornice = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH + 0.06, 0.09, 0.11),
        darkWood
      );
      cornice.position.set(0, 3.86, 0.045);
      wallGrp.add(cornice);

      const brassCorniceLine = new THREE.Mesh(
        new THREE.BoxGeometry(WALL_WIDTH, 0.022, 0.085),
        brass
      );
      brassCorniceLine.position.set(0, 3.63, 0.03);
      wallGrp.add(brassCorniceLine);

      parent.add(wallGrp);
    }

    // 8 Carved Corner Pilasters + Warm Flickering Brass Wall Sconces
    const cornerR = R_WALL / Math.cos(Math.PI / 8) - 0.08;
    const warmGlow = M.get('warmGlow');

    for (let i = 0; i < 8; i++) {
      const deg = 22.5 + i * 45;
      const rad = (deg * Math.PI) / 180;
      const pilGrp = new THREE.Group();
      pilGrp.position.set(cornerR * Math.sin(rad), 0, -cornerR * Math.cos(rad));
      pilGrp.rotation.y = -rad; // local +Z faces directly toward room center

      // Stepped plinth base
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.44, 0.28), darkWood);
      plinth.position.y = 0.22;
      pilGrp.add(plinth);

      // Fluted mahogany shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.13, 3.12, 12), mahogany);
      shaft.position.y = 2.0;
      shaft.castShadow = false;
      shaft.receiveShadow = true;
      pilGrp.add(shaft);

      // Brass decorative rings on pilaster
      [0.46, 1.15, 3.54].forEach(function (ry) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.128, 0.018, 8, 16), brass);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = ry;
        pilGrp.add(ring);
      });

      // Carved capital supporting dome rib
      const capital = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.28, 0.30), darkWood);
      capital.position.y = 3.72;
      pilGrp.add(capital);

      // Brass Wall Sconce mounted on inward face (+Z) of pilaster at Y = 2.46
      const sconceGrp = new THREE.Group();
      sconceGrp.position.set(0, 2.46, 0.13);

      const backplate = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.02, 12), brass);
      backplate.rotation.x = Math.PI / 2;
      sconceGrp.add(backplate);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.16, 8), agedBrass);
      arm.rotation.x = Math.PI / 2;
      arm.position.set(0, -0.02, 0.08);
      sconceGrp.add(arm);

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.028, 0.04, 12), brass);
      cup.position.set(0, 0.01, 0.15);
      sconceGrp.add(cup);

      // Frosted amber glass tulip shade
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0xffe4aa,
        emissive: 0xffa638,
        emissiveIntensity: 1.35,
        roughness: 0.35,
        transparent: true,
        opacity: 0.88
      });
      const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.036, 0.14, 12, 1, true), shadeMat);
      shade.position.set(0, 0.095, 0.15);
      sconceGrp.add(shade);

      // Glowing candle core
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.028, 8, 8), warmGlow);
      flame.scale.set(0.85, 1.45, 0.85);
      flame.position.set(0, 0.09, 0.15);
      sconceGrp.add(flame);

      sconceFlames.push({
        mesh: flame,
        shadeMat: shadeMat,
        phase: i * 1.17
      });

      pilGrp.add(sconceGrp);
      parent.add(pilGrp);
    }
  }

  function createStarMedallion(size) {
    const grp = new THREE.Group();
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfff0b2,
      emissive: 0xffc63a,
      emissiveIntensity: 2.1,
      roughness: 0.18,
      metalness: 0.7
    });

    // Bright central jewel core
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(size * 0.36, 1), starMat);
    core.scale.set(1, 0.42, 1);
    grp.add(core);

    // 4 Long primary rays + 4 diagonal secondary rays
    for (let r = 0; r < 4; r++) {
      const isPrimary = r % 2 === 0;
      const len = isPrimary ? size * 2.1 : size * 1.35;
      const w = isPrimary ? size * 0.24 : size * 0.16;
      const ray = new THREE.Mesh(new THREE.OctahedronGeometry(0.5, 0), starMat);
      ray.scale.set(len, size * 0.18, w);
      ray.rotation.y = (r * Math.PI) / 4;
      grp.add(ray);
    }

    // Soft additive halo sprite directly underneath
    const haloMat = new THREE.MeshBasicMaterial({
      map: SR.Textures.softParticle(),
      color: 0xffd564,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(size * 3.1, size * 3.1), haloMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.025;
    grp.add(halo);
    starHalos.push(haloMat);

    return { group: grp, mat: starMat };
  }

  function buildCelestialDome(parent) {
    const M = SR.Materials;
    const mahogany = M.get('mahogany');
    const darkWood = M.get('darkWood');
    const brass = M.get('brass');
    const domeGroup = new THREE.Group();

    // Lower octagonal drum & engraved brass rim at Y = 3.90
    const drumGeo = new THREE.CylinderGeometry(4.56, 4.58, 0.18, 8, 1, true);
    const drum = new THREE.Mesh(drumGeo, new THREE.MeshStandardMaterial({
      map: SR.Textures.darkWood().map,
      roughness: 0.55,
      side: THREE.BackSide
    }));
    drum.position.y = H_WALL + 0.08;
    drum.rotation.y = Math.PI / 8;
    domeGroup.add(drum);

    // Curved dome vault rising from Y=3.92 (r=4.56) up to oculus Y=5.26 (r=1.54)
    const domePts = [];
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const angle = t * (Math.PI * 0.44);
      const r = 1.54 + (4.56 - 1.54) * Math.cos(angle);
      const y = H_WALL + 0.02 + 1.36 * Math.sin(angle);
      domePts.push(new THREE.Vector2(r, y));
    }
    const vaultGeo = new THREE.LatheGeometry(domePts, 32);
    const vaultMat = new THREE.MeshStandardMaterial({
      color: 0x161b2e,
      roughness: 0.72,
      metalness: 0.14,
      side: THREE.BackSide
    });
    const vaultMesh = new THREE.Mesh(vaultGeo, vaultMat);
    domeGroup.add(vaultMesh);

    // 8 Curved Mahogany & Brass Meridian Ribs rising from the 8 corner pilasters to the oculus
    for (let i = 0; i < 8; i++) {
      const deg = 22.5 + i * 45;
      const rad = (deg * Math.PI) / 180;
      const curvePts = [];
      for (let s = 0; s <= 12; s++) {
        const t = s / 12;
        const a = t * (Math.PI * 0.44);
        const r = 1.54 + (4.48 - 1.54) * Math.cos(a);
        const y = H_WALL - 0.04 + 1.34 * Math.sin(a);
        curvePts.push(new THREE.Vector3(r * Math.sin(rad), y, -r * Math.cos(rad)));
      }
      const curve = new THREE.CatmullRomCurve3(curvePts);
      const ribGeo = new THREE.TubeGeometry(curve, 18, 0.085, 8, false);
      const rib = new THREE.Mesh(ribGeo, mahogany);
      domeGroup.add(rib);

      // Thin golden brass inlay bead running along underside of each rib
      const brassCurvePts = curvePts.map(function (pt) {
        return new THREE.Vector3(pt.x * 0.985, pt.y - 0.065, pt.z * 0.985);
      });
      const brassRib = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(brassCurvePts), 16, 0.02, 6, false),
        brass
      );
      domeGroup.add(brassRib);
    }

    // Concentric brass latitude ring halfway up the dome
    const midRing = new THREE.Mesh(new THREE.TorusGeometry(3.38, 0.036, 8, 48), brass);
    midRing.rotation.x = Math.PI / 2;
    midRing.position.y = 4.62;
    domeGroup.add(midRing);

    // Grand Circular Brass Eclipse Oculus Frame at Y = 5.26 (r = 1.56)
    const oculusRim = new THREE.Mesh(new THREE.TorusGeometry(1.56, 0.095, 14, 48), brass);
    oculusRim.rotation.x = Math.PI / 2;
    oculusRim.position.y = 5.26;
    domeGroup.add(oculusRim);

    const oculusInnerTrim = new THREE.Mesh(new THREE.TorusGeometry(1.44, 0.03, 10, 48), darkWood);
    oculusInnerTrim.rotation.x = Math.PI / 2;
    oculusInnerTrim.position.y = 5.24;
    domeGroup.add(oculusInnerTrim);

    // Subtle engraved brass motto collar around the oculus rim
    const rimTex = SR.Textures.makeCanvasTexture(1024, 96, function (ctx, w, h) {
      ctx.fillStyle = '#2d1e0d';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#d4a64e';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 6, w - 8, h - 12);
      ctx.font = 'bold 34px Georgia, serif';
      ctx.fillStyle = '#f2ce78';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦   CORONA CAELESTIS   •   OBSERVATORIUM SOLIS   •   MDCCCXCIV   ✦', w / 2, h / 2 + 2);
    });
    const mottoBand = new THREE.Mesh(
      new THREE.CylinderGeometry(1.50, 1.50, 0.16, 48, 1, true),
      new THREE.MeshStandardMaterial({
        map: rimTex,
        roughness: 0.42,
        metalness: 0.65,
        side: THREE.BackSide
      })
    );
    mottoBand.position.y = 5.22;
    domeGroup.add(mottoBand);

    // Glazed Celestial Oculus Sky Disk (deep indigo starfield)
    const skyTex = SR.Textures.domeSky();
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.FrontSide
    });
    const skyDisk = new THREE.Mesh(new THREE.CircleGeometry(1.56, 48), skyMat);
    skyDisk.rotation.x = Math.PI / 2; // faces straight downward into the room
    skyDisk.position.y = 5.36;
    domeGroup.add(skyDisk);

    // =========================================================================
    // PUZZLE CLUE: EXACTLY 7 BRIGHT PULSING GOLDEN STARS IN A CORONA ARC!
    // (Used to calibrate Cipher Wheel: ★ = 7)
    // =========================================================================
    const coronaCenterZ = 0.30;
    const coronaRadius = 1.00;
    const starPositions = [];

    for (let i = 0; i < 7; i++) {
      const deg = -162 + i * 24; // -162, -138, -114, -90, -66, -42, -18
      const rad = (deg * Math.PI) / 180;
      const sx = Math.cos(rad) * coronaRadius;
      const sz = coronaCenterZ + Math.sin(rad) * coronaRadius;
      const sy = 5.31;

      const star = createStarMedallion(0.115);
      star.group.position.set(sx, sy, sz);
      domeGroup.add(star.group);

      goldenStars.push({
        group: star.group,
        mat: star.mat,
        phase: i * 0.72
      });
      starPositions.push(new THREE.Vector3(sx, sy + 0.015, sz));
    }

    // Delicate golden constellation line connecting the 7 Corona stars
    const coronaCurve = new THREE.CatmullRomCurve3(starPositions);
    const coronaThread = new THREE.Mesh(
      new THREE.TubeGeometry(coronaCurve, 48, 0.008, 6, false),
      new THREE.MeshBasicMaterial({
        color: 0xe6be68,
        transparent: true,
        opacity: 0.45
      })
    );
    domeGroup.add(coronaThread);

    // Register clickable Dome Oculus interactive
    if (SR.registerInteractive) {
      SR.registerInteractive(skyDisk, {
        id: 'dome_skylight',
        station: 'dome',
        activeViews: ['room', 'dome'],
        action: function () {
          return SR.Camera.getCurrentView() === 'dome' ? 'Contemplar' : 'Observar';
        },
        label: 'Cúpula Celestial',
        cursor: 'inspect',
        onClick: function () {
          if (SR.Camera.getCurrentView() !== 'dome') {
            SR.Audio.playClick(1.05);
            SR.Camera.goToView('dome');
          } else {
            SR.Audio.playCrystal(1.1);
            if (SR.UI && SR.UI.say) {
              SR.UI.say('Exactamente siete estrellas doradas forman una corona resplandeciente en la bóveda nocturna.');
            }
          }
        }
      });
    }

    parent.add(domeGroup);
  }

  function buildAtmosphere(parent) {
    // Volumetric moonlight shaft descending gently from the oculus over the Grand Orrery
    const beamMat = new THREE.MeshBasicMaterial({
      map: SR.Textures.moonBeamGradient(),
      color: 0x9ec4ff,
      transparent: true,
      opacity: 0.048,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    const beamGeo = new THREE.CylinderGeometry(1.38, 2.38, 5.15, 32, 1, true);
    moonlightBeam = new THREE.Mesh(beamGeo, beamMat);
    moonlightBeam.position.y = 2.68;
    moonlightBeam.raycast = function () {}; // Never block mouse clicks!
    parent.add(moonlightBeam);

    // Floating dust motes suspended in the moonlight
    const count = 200;
    const positions = new Float32Array(count * 3);
    dustBasePositions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * 2.85;
      const y = 0.45 + Math.random() * 4.55;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(a) * r;
      dustBasePositions[i * 3] = positions[i * 3];
      dustBasePositions[i * 3 + 1] = y;
      dustBasePositions[i * 3 + 2] = positions[i * 3 + 2];
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      map: SR.Textures.softParticle(),
      color: 0xf6e2b4,
      size: 0.055,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    dustPoints = new THREE.Points(dustGeo, dustMat);
    dustPoints.raycast = function () {};
    parent.add(dustPoints);
  }

  function buildLights(scene) {
    // Soft sky-to-mahogany hemisphere ambient
    lights.hemi = new THREE.HemisphereLight(baseColors.hemiSky.getHex(), baseColors.hemiGround.getHex(), 0.78);
    scene.add(lights.hemi);

    // Gentle room fill ambient so dark wood and engravings stay legible everywhere
    lights.ambient = new THREE.AmbientLight(baseColors.ambient.getHex(), 0.55);
    scene.add(lights.ambient);

    // Primary overhead moonlight Spotlight casting crisp soft shadows onto the Orrery & floor
    lights.moonSpot = new THREE.SpotLight(baseColors.moon.getHex(), 4.6, 14.5, Math.PI / 3.0, 0.65, 1.0);
    lights.moonSpot.position.set(0, 5.14, 0.12);
    lights.moonSpot.target.position.set(0, 0.2, 0);
    lights.moonSpot.castShadow = true;
    lights.moonSpot.shadow.mapSize.width = 2048;
    lights.moonSpot.shadow.mapSize.height = 2048;
    lights.moonSpot.shadow.radius = 2.4;
    lights.moonSpot.shadow.camera.near = 1.0;
    lights.moonSpot.shadow.camera.far = 9.0;
    lights.moonSpot.shadow.bias = -0.0004;
    scene.add(lights.moonSpot);
    scene.add(lights.moonSpot.target);

    // Balanced central warm fill illuminating Orrery brasswork & zodiac bezel cleanly
    lights.centerFill = new THREE.PointLight(0xffd292, 1.65, 8.8, 1.3);
    lights.centerFill.position.set(0, 2.72, 0);
    scene.add(lights.centerFill);

    // 4 Warm gallery sconce pools tuned to bathe all 5 interactive stations & decorative walls evenly
    lights.quads = [];
    const quadSpecs = [
      { deg: 22.5,  intensity: 3.15, color: 0xffbe74 }, // North Door + NE Clock/Books
      { deg: 105.0, intensity: 2.95, color: 0xffc078 }, // East Desk + SE Stained Glass
      { deg: 192.0, intensity: 3.05, color: 0xffbc72 }, // South Optics/StarMap + SW Fireplace
      { deg: 282.0, intensity: 3.15, color: 0xffbe74 }  // West Telemetry/Safe + NW Curio
    ];
    quadSpecs.forEach(function (qs, idx) {
      const rad = (qs.deg * Math.PI) / 180;
      const pl = new THREE.PointLight(qs.color, qs.intensity, 10.8, 1.32);
      pl.position.set(2.78 * Math.sin(rad), 2.58, -2.78 * Math.cos(rad));
      scene.add(pl);
      lights.quads.push({
        light: pl,
        baseIntensity: qs.intensity,
        phase: idx * 1.9
      });
    });

    // Golden dawn light hidden behind North Vault Door (activates on finale)
    lights.dawnLight = new THREE.PointLight(0xffe099, 0, 12, 1.2);
    lights.dawnLight.position.set(0, 1.85, -4.9);
    scene.add(lights.dawnLight);
  }

  function init(scene) {
    root = new THREE.Group();
    root.name = 'ArchitectureRoot';

    buildFloor(root);
    buildWallsAndPilasters(root);
    buildCelestialDome(root);
    buildAtmosphere(root);
    buildLights(scene);

    scene.add(root);
  }

  function setUVFactor(f) {
    const t = Math.max(0, Math.min(1, f));
    if (lights.hemi) {
      lights.hemi.color.copy(baseColors.hemiSky).lerp(baseColors.uvSky, t * 0.85);
      lights.hemi.groundColor.copy(baseColors.hemiGround).lerp(baseColors.uvGround, t * 0.8);
      lights.hemi.intensity = 0.78 - t * 0.14;
    }
    if (lights.ambient) {
      lights.ambient.color.copy(baseColors.ambient).lerp(baseColors.uvAmbient, t * 0.85);
    }
    if (lights.moonSpot) {
      lights.moonSpot.color.copy(baseColors.moon).lerp(baseColors.uvMoon, t * 0.9);
      lights.moonSpot.intensity = 4.6 + t * 1.2;
    }
    if (lights.centerFill) {
      lights.centerFill.intensity = 1.65 * (1 - t * 0.45);
    }
    if (moonlightBeam) {
      moonlightBeam.material.color.setHex(0x9ec4ff).lerp(new THREE.Color(0x527eff), t);
      moonlightBeam.material.opacity = 0.048 + t * 0.04;
    }
    for (let i = 0; i < lights.quads.length; i++) {
      lights.quads[i].uvScale = 1 - t * 0.38;
    }
  }

  function setShadowsEnabled(enabled) {
    if (lights.moonSpot) {
      lights.moonSpot.castShadow = !!enabled;
    }
  }

  function update(dt, elapsed) {
    const t = elapsed || 0;

    // Gentle sconce candle flicker
    for (let i = 0; i < sconceFlames.length; i++) {
      const s = sconceFlames[i];
      const f = 0.92 + 0.08 * Math.sin(t * 7.2 + s.phase) + 0.05 * Math.sin(t * 13.7 + s.phase * 2.1);
      s.mesh.scale.set(0.85 * f, 1.45 * (0.94 + 0.1 * Math.sin(t * 9.5 + s.phase)), 0.85 * f);
      s.shadeMat.emissiveIntensity = 1.25 * f;
    }

    // Subtle warm pulse on quadrant lights
    for (let i = 0; i < lights.quads.length; i++) {
      const q = lights.quads[i];
      const uvScale = q.uvScale !== undefined ? q.uvScale : 1;
      const flicker = 1 + 0.035 * Math.sin(t * 5.3 + q.phase) + 0.02 * Math.sin(t * 11.1 + q.phase);
      q.light.intensity = q.baseIntensity * flicker * uvScale;
    }

    // Pulse the 7 Golden Corona Stars softly in the celestial dome
    for (let i = 0; i < goldenStars.length; i++) {
      const st = goldenStars[i];
      const pulse = 0.92 + 0.14 * Math.sin(t * 2.1 + st.phase);
      st.group.scale.setScalar(pulse);
      st.group.rotation.y = Math.sin(t * 0.5 + st.phase) * 0.14;
      st.mat.emissiveIntensity = 1.85 + 0.55 * Math.sin(t * 2.4 + st.phase);
    }

    // Slowly drift suspended dust motes
    if (dustPoints && dustBasePositions) {
      const posAttr = dustPoints.geometry.attributes.position;
      const arr = posAttr.array;
      for (let i = 0; i < arr.length; i += 3) {
        const idx = i / 3;
        arr[i] = dustBasePositions[i] + Math.sin(t * 0.25 + idx) * 0.14;
        arr[i + 1] = 0.45 + ((dustBasePositions[i + 1] - 0.45 + t * 0.032) % 4.55);
        arr[i + 2] = dustBasePositions[i + 2] + Math.cos(t * 0.22 + idx * 1.3) * 0.14;
      }
      posAttr.needsUpdate = true;
    }

    // Ramp dawn light behind vault door once solved
    if (lights.dawnLight && SR.State && SR.State.data) {
      const targetDawn = SR.State.data.vaultSolved ? 9.5 : 0;
      lights.dawnLight.intensity += (targetDawn - lights.dawnLight.intensity) * Math.min(1, (dt || 0.016) * 2.2);
    }
  }

  SR.Architecture = {
    init: init,
    update: update,
    setUVFactor: setUVFactor,
    setShadowsEnabled: setShadowsEnabled,
    lights: lights
  };
})(window.SR = window.SR || {});
