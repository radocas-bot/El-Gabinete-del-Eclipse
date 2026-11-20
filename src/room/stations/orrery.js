/* ==========================================================================
   src/room/stations/orrery.js — Center (0, 0, 0): El Gran Planetario Mecánico
   Puzzle C3 (Alineación Planetaria + Flor Solar de Loto -> Prisma Umbral 3/3)
   ========================================================================== */
(function (SR) {
  'use strict';

  const PEDESTAL_H = 0.94;
  const BEZEL_Y = PEDESTAL_H + 0.022;

  // 8 clockwise zodiac & compass sectors viewed from above (0 = North / -Z)
  const SECTORS = [
    { idx: 0, key: 'aries',       glyph: '♈', dir: 'N',  full: 'Norte' },
    { idx: 1, key: 'gemini',      glyph: '♊', dir: 'NE', full: 'Noreste' },
    { idx: 2, key: 'cancer',      glyph: '♋', dir: 'E',  full: 'Este' },
    { idx: 3, key: 'virgo',       glyph: '♍', dir: 'SE', full: 'Sureste' },
    { idx: 4, key: 'libra',       glyph: '♎', dir: 'S',  full: 'Sur' },
    { idx: 5, key: 'sagittarius', glyph: '♐', dir: 'SO', full: 'Suroeste' },
    { idx: 6, key: 'capricorn',   glyph: '♑', dir: 'O',  full: 'Oeste' },
    { idx: 7, key: 'aquarius',    glyph: '♒', dir: 'NO', full: 'Noroeste' }
  ];

  // Exact alignment target:
  // Mercury = 0 (♈ N), Venus = 2 (♋ E), Mars = 6 (♑ O), Saturn = 5 (♐ SO)
  const TARGET_SECTORS = {
    mercury: 0,
    venus: 2,
    mars: 6,
    saturn: 5
  };

  const PLANET_DEFS = [
    { key: 'mercury', name: 'Mercurio', glyph: '☿', radius: 0.22, ringY: 1.055, planetY: 1.155, size: 0.035, color: 0xc29b61, emissive: 0x3b260c },
    { key: 'venus',   name: 'Venus',    glyph: '♀', radius: 0.32, ringY: 1.035, planetY: 1.160, size: 0.043, color: 0xe6ad58, emissive: 0x52310d },
    { key: 'mars',    name: 'Marte',    glyph: '♂', radius: 0.42, ringY: 1.015, planetY: 1.165, size: 0.042, color: 0xb8432b, emissive: 0x451208 },
    { key: 'saturn',  name: 'Saturno',  glyph: '♄', radius: 0.52, ringY: 0.995, planetY: 1.170, size: 0.046, color: 0xdec88c, emissive: 0x423514 }
  ];

  function makeHitboxMat() {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false
    });
  }

  // Crisp custom Canvas2D vector zodiac glyphs (never depends on OS emoji fonts!)
  function drawZodiacGlyph(ctx, key, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (key) {
      case 'aries': // ♈
        ctx.moveTo(0, r * 0.85);
        ctx.lineTo(0, -r * 0.20);
        ctx.bezierCurveTo(0, -r * 0.92, -r * 0.92, -r * 0.92, -r * 0.72, -r * 0.16);
        ctx.moveTo(0, -r * 0.20);
        ctx.bezierCurveTo(0, -r * 0.92, r * 0.92, -r * 0.92, r * 0.72, -r * 0.16);
        ctx.stroke();
        break;
      case 'gemini': // ♊
        ctx.moveTo(-r * 0.72, -r * 0.78);
        ctx.quadraticCurveTo(0, -r * 0.52, r * 0.72, -r * 0.78);
        ctx.moveTo(-r * 0.72, r * 0.78);
        ctx.quadraticCurveTo(0, r * 0.52, r * 0.72, r * 0.78);
        ctx.moveTo(-r * 0.28, -r * 0.66);
        ctx.lineTo(-r * 0.28, r * 0.66);
        ctx.moveTo(r * 0.28, -r * 0.66);
        ctx.lineTo(r * 0.28, r * 0.66);
        ctx.stroke();
        break;
      case 'cancer': // ♋
        ctx.arc(-r * 0.36, -r * 0.28, r * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(-r * 0.36, -r * 0.28, r * 0.28, -Math.PI * 0.5, 0);
        ctx.quadraticCurveTo(r * 0.35, -r * 0.68, r * 0.72, -r * 0.10);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(r * 0.36, r * 0.28, r * 0.28, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(r * 0.36, r * 0.56);
        ctx.quadraticCurveTo(-r * 0.35, r * 0.68, -r * 0.72, r * 0.10);
        ctx.stroke();
        break;
      case 'virgo': // ♍
        ctx.moveTo(-r * 0.78, -r * 0.54);
        ctx.lineTo(-r * 0.78, r * 0.56);
        ctx.moveTo(-r * 0.78, -r * 0.26);
        ctx.quadraticCurveTo(-r * 0.54, -r * 0.76, -r * 0.34, -r * 0.26);
        ctx.lineTo(-r * 0.34, r * 0.56);
        ctx.moveTo(-r * 0.34, -r * 0.26);
        ctx.quadraticCurveTo(-r * 0.10, -r * 0.76, r * 0.10, -r * 0.26);
        ctx.lineTo(r * 0.10, r * 0.56);
        ctx.moveTo(r * 0.10, -r * 0.26);
        ctx.bezierCurveTo(r * 0.72, -r * 0.76, r * 0.78, r * 0.34, r * 0.08, r * 0.78);
        ctx.moveTo(r * 0.10, r * 0.14);
        ctx.quadraticCurveTo(r * 0.45, r * 0.62, r * 0.78, r * 0.82);
        ctx.stroke();
        break;
      case 'libra': // ♎
        ctx.moveTo(-r * 0.78, r * 0.66);
        ctx.lineTo(r * 0.78, r * 0.66);
        ctx.moveTo(-r * 0.78, r * 0.26);
        ctx.lineTo(-r * 0.38, r * 0.26);
        ctx.arc(0, r * 0.16, r * 0.40, Math.PI * 0.92, Math.PI * 0.08, false);
        ctx.lineTo(r * 0.78, r * 0.26);
        ctx.stroke();
        break;
      case 'sagittarius': // ♐
        ctx.moveTo(-r * 0.68, r * 0.68);
        ctx.lineTo(r * 0.68, -r * 0.68);
        ctx.moveTo(r * 0.12, -r * 0.68);
        ctx.lineTo(r * 0.68, -r * 0.68);
        ctx.lineTo(r * 0.68, -r * 0.12);
        ctx.moveTo(-r * 0.50, -r * 0.05);
        ctx.lineTo(r * 0.05, r * 0.50);
        ctx.stroke();
        break;
      case 'capricorn': // ♑
        ctx.moveTo(-r * 0.76, -r * 0.48);
        ctx.lineTo(-r * 0.40, r * 0.38);
        ctx.lineTo(-r * 0.04, -r * 0.48);
        ctx.bezierCurveTo(r * 0.30, -r * 0.46, r * 0.22, r * 0.48, r * 0.54, r * 0.48);
        ctx.bezierCurveTo(r * 0.82, r * 0.48, r * 0.82, -r * 0.04, r * 0.46, -r * 0.04);
        ctx.bezierCurveTo(r * 0.16, -r * 0.04, r * 0.22, r * 0.72, -r * 0.18, r * 0.84);
        ctx.stroke();
        break;
      case 'aquarius': // ♒
        [-r * 0.26, r * 0.30].forEach(oy => {
          ctx.moveTo(-r * 0.76, oy + r * 0.12);
          ctx.lineTo(-r * 0.38, oy - r * 0.18);
          ctx.lineTo(0, oy + r * 0.14);
          ctx.lineTo(r * 0.38, oy - r * 0.18);
          ctx.lineTo(r * 0.76, oy + r * 0.12);
        });
        ctx.stroke();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function drawPlanetGlyph(ctx, key, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (key) {
      case 'mercury':
        ctx.arc(0, -r * 0.08, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -r * 0.72, r * 0.34, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(0, r * 0.34);
        ctx.lineTo(0, r * 0.94);
        ctx.moveTo(-r * 0.36, r * 0.64);
        ctx.lineTo(r * 0.36, r * 0.64);
        ctx.stroke();
        break;
      case 'venus':
        ctx.arc(0, -r * 0.25, r * 0.46, 0, Math.PI * 2);
        ctx.moveTo(0, r * 0.21);
        ctx.lineTo(0, r * 0.94);
        ctx.moveTo(-r * 0.38, r * 0.60);
        ctx.lineTo(r * 0.38, r * 0.60);
        ctx.stroke();
        break;
      case 'mars':
        ctx.arc(-r * 0.14, r * 0.18, r * 0.44, 0, Math.PI * 2);
        ctx.moveTo(r * 0.17, -r * 0.13);
        ctx.lineTo(r * 0.74, -r * 0.70);
        ctx.moveTo(r * 0.30, -r * 0.70);
        ctx.lineTo(r * 0.74, -r * 0.70);
        ctx.lineTo(r * 0.74, -r * 0.26);
        ctx.stroke();
        break;
      case 'saturn':
        ctx.moveTo(-r * 0.42, -r * 0.56);
        ctx.lineTo(r * 0.14, -r * 0.56);
        ctx.moveTo(-r * 0.16, -r * 0.88);
        ctx.lineTo(-r * 0.16, r * 0.68);
        ctx.moveTo(-r * 0.16, -r * 0.04);
        ctx.bezierCurveTo(r * 0.52, -r * 0.38, r * 0.66, r * 0.32, r * 0.18, r * 0.68);
        ctx.quadraticCurveTo(r * 0.04, r * 0.86, r * 0.42, r * 0.92);
        ctx.stroke();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function createZodiacPlatterTexture() {
    return SR.Textures.makeCanvasTexture(1024, 1024, (ctx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rOut = w * 0.495;
      const rBezelIn = w * 0.375;

      // Outer antique brass bezel
      const brassGrad = ctx.createRadialGradient(cx, cy, rBezelIn, cx, cy, rOut);
      brassGrad.addColorStop(0, '#5a421f');
      brassGrad.addColorStop(0.35, '#86642c');
      brassGrad.addColorStop(0.85, '#4b3617');
      brassGrad.addColorStop(1, '#261b0c');
      ctx.fillStyle = brassGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
      ctx.fill();

      // Inner deep celestial midnight-slate well under the orbital rings
      const slateGrad = ctx.createRadialGradient(cx, cy, 30, cx, cy, rBezelIn);
      slateGrad.addColorStop(0, '#161b2a');
      slateGrad.addColorStop(0.75, '#0f1320');
      slateGrad.addColorStop(1, '#090c16');
      ctx.fillStyle = slateGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, rBezelIn, 0, Math.PI * 2);
      ctx.fill();

      // Concentric orbital reference tracks in subtle gold
      [0.166, 0.242, 0.318, 0.394].forEach(frac => {
        ctx.strokeStyle = 'rgba(214, 178, 98, 0.22)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, w * frac, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Outer & inner brass filigree rings + degree ticks
      [rOut - 6, rOut - 16, rBezelIn + 6, rBezelIn].forEach((rr, idx) => {
        ctx.strokeStyle = idx % 2 === 0 ? '#f0cb78' : 'rgba(235, 198, 112, 0.55)';
        ctx.lineWidth = idx === 0 ? 5 : 2.5;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      });

      for (let deg = 0; deg < 360; deg += 5) {
        const a = (deg * Math.PI) / 180;
        const isMajor = deg % 45 === 0;
        const len = isMajor ? 18 : (deg % 15 === 0 ? 11 : 6);
        ctx.strokeStyle = isMajor ? '#ffe599' : 'rgba(235, 198, 112, 0.42)';
        ctx.lineWidth = isMajor ? 4 : 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * (rBezelIn + 4), cy - Math.cos(a) * (rBezelIn + 4));
        ctx.lineTo(cx + Math.sin(a) * (rBezelIn + 4 + len), cy - Math.cos(a) * (rBezelIn + 4 + len));
        ctx.stroke();
      }

      // 8 Clockwise Sectors (0 = North / Top, 2 = East / Right, 4 = South / Bottom, 6 = West / Left)
      const step = Math.PI / 4;
      for (let s = 0; s < 8; s++) {
        const sec = SECTORS[s];
        const a = s * step;
        const divA = (s + 0.5) * step;

        // Sector boundary on outer bezel
        ctx.strokeStyle = 'rgba(235, 198, 112, 0.50)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(divA) * rBezelIn, cy - Math.cos(divA) * rBezelIn);
        ctx.lineTo(cx + Math.sin(divA) * (rOut - 16), cy - Math.cos(divA) * (rOut - 16));
        ctx.stroke();

        // Radial gold sighting line across slate floor straight to sector s!
        ctx.strokeStyle = s === 0 ? 'rgba(255, 224, 130, 0.58)' : 'rgba(218, 182, 102, 0.28)';
        ctx.lineWidth = s === 0 ? 3.5 : 2;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * 86, cy - Math.cos(a) * 86);
        ctx.lineTo(cx + Math.sin(a) * (rBezelIn + 4), cy - Math.cos(a) * (rBezelIn + 4));
        ctx.stroke();

        // Dark inlaid medallion behind each zodiac glyph for supreme contrast
        const rMed = (rBezelIn + rOut) * 0.505;
        const mx = cx + Math.sin(a) * rMed;
        const my = cy - Math.cos(a) * rMed;

        ctx.fillStyle = s === 0 ? '#3a1b16' : '#181410';
        ctx.beginPath();
        ctx.arc(mx, my, 46, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = s === 0 ? '#ffe68c' : '#d6ad54';
        ctx.lineWidth = s === 0 ? 4 : 2.5;
        ctx.stroke();

        // Draw crisp vector zodiac glyph upright relative to viewer (so every glyph is effortless to read!)
        ctx.strokeStyle = s === 0 ? '#fff2b2' : '#f8da8c';
        ctx.lineWidth = 5.5;
        drawZodiacGlyph(ctx, sec.key, mx, my - 7, 23);

        // Bold cardinal / intercardinal compass label right beneath glyph
        ctx.fillStyle = s === 0 ? '#ffeb99' : '#e6c578';
        ctx.font = 'bold 23px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sec.dir, mx, my + 28);
      }
    });
  }

  function createPlanetTabTexture(key) {
    return SR.Textures.makeCanvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#20180e';
      ctx.beginPath();
      ctx.arc(w * 0.5, h * 0.5, w * 0.46, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ebc46e';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.strokeStyle = '#ffecaa';
      ctx.lineWidth = 7;
      drawPlanetGlyph(ctx, key, w * 0.5, h * 0.5, 32);
    });
  }

  function createGearMesh(outerR, teeth, thickness, mat) {
    const shape = new THREE.Shape();
    const innerR = outerR * 0.84;
    const step = (Math.PI * 2) / teeth;
    for (let i = 0; i < teeth; i++) {
      const a0 = i * step;
      const a1 = a0 + step * 0.25;
      const a2 = a0 + step * 0.50;
      const a3 = a0 + step * 0.75;
      const p0x = Math.cos(a0) * innerR, p0y = Math.sin(a0) * innerR;
      const p1x = Math.cos(a1) * outerR, p1y = Math.sin(a1) * outerR;
      const p2x = Math.cos(a2) * outerR, p2y = Math.sin(a2) * outerR;
      const p3x = Math.cos(a3) * innerR, p3y = Math.sin(a3) * innerR;
      if (i === 0) shape.moveTo(p0x, p0y);
      else shape.lineTo(p0x, p0y);
      shape.lineTo(p1x, p1y);
      shape.lineTo(p2x, p2y);
      shape.lineTo(p3x, p3y);
    }
    shape.closePath();

    const hole = new THREE.Path();
    hole.absarc(0, 0, outerR * 0.36, 0, Math.PI * 2, true);
    shape.holes.push(hole);

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 1
    });
    geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.Mesh(geo, mat);
    return mesh;
  }

  function createInstalledCrankMesh(mats) {
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.11, 12), mats.brass);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = 0.04;
    g.add(shaft);

    const starCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.018, 8), mats.gold);
    starCollar.rotation.x = Math.PI / 2;
    starCollar.position.z = 0.088;
    g.add(starCollar);

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.115, 0.018), mats.gold);
    arm.position.set(0, 0.052, 0.095);
    g.add(arm);

    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.013, 0.075, 12), mats.mahogany);
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0.105, 0.132);
    g.add(grip);

    const endKnob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 10), mats.gold);
    endKnob.position.set(0, 0.105, 0.170);
    g.add(endKnob);

    return g;
  }

  function createUmbralPrismMesh(mats) {
    const g = new THREE.Group();

    // Faceted double-pyramid obsidian-gold prism core
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x1e1038,
      emissive: 0x7b3fff,
      emissiveIntensity: 1.55,
      roughness: 0.10,
      metalness: 0.45
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.068, 0), obsidianMat);
    core.scale.set(0.84, 1.38, 0.84);
    g.add(core);

    // Gilded filigree wireframe equatorial cage
    const eqRing = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.008, 10, 28), mats.gold);
    eqRing.rotation.x = Math.PI / 2 - 0.32;
    g.add(eqRing);

    const vRing = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.006, 10, 28), mats.gold);
    vRing.rotation.y = 0.45;
    g.add(vRing);

    // Soft additive eclipse aura
    const aura = new THREE.Mesh(
      new THREE.SphereGeometry(0.115, 16, 14),
      new THREE.MeshBasicMaterial({
        color: 0xa66eff,
        transparent: true,
        opacity: 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    g.add(aura);

    return g;
  }

  const OrreryStation = {
    group: null,
    rings: {},
    marsMoonsGroup: null,
    gears: [],
    crankMesh: null,
    crankSpin: 0,
    clutchJewelMat: null,
    clutchCfg: null,
    petalPivots: [],
    lotusProgress: 0,
    sunCoreLight: null,
    sunCoreMesh: null,
    prismGroup: null,
    prismHit: null,
    prismCfg: null,

    init(scene) {
      const mats = {
        mahogany: SR.Materials.get('mahogany'),
        darkWood: SR.Materials.get('darkWood'),
        marble: SR.Materials.get('marble'),
        slate: SR.Materials.get('slate'),
        brass: SR.Materials.get('brass'),
        agedBrass: SR.Materials.get('agedBrass'),
        gold: SR.Materials.get('gold'),
        copper: SR.Materials.get('copper'),
        darkIron: SR.Materials.get('darkIron'),
        silver: SR.Materials.get('silver'),
        obsidian: SR.Materials.get('obsidian')
      };

      const group = new THREE.Group();
      group.name = 'Station_Orrery';
      group.position.set(0, 0, 0);
      scene.add(group);
      this.group = group;

      this._buildPedestalAndBezel(group, mats);
      this._buildClockworkDeck(group, mats);
      this._buildPlanetaryRings(group, mats);
      this._buildClutchSocket(group, mats);
      this._buildLotusSunAndPrism(group, mats);

      // Register elevated top-down 3/4 view (North/-Z at top, East/+X at right, South/+Z at bottom, West/-X at left)
      // Elevated angle shows all 8 zodiac signs (including ♈ N) AND front clutch socket cleanly above bottom inventory bar
      SR.Camera.registerView('orrery', {
        pos: [0, 2.74, 1.56],
        target: [0, 0.94, 0.08],
        fov: 48,
        title: 'El Gran Planetario Mecánico',
        subtitle: 'Alinea Mercurio, Venus, Marte y Saturno en el bisel zodiacal',
        parent: 'room',
        zenithView: 'orrery_top'
      });

      // Pure vertical top-down / cenital view directly above the Orrery (tiny +0.14m Z offset avoids gimbal lock;
      // Y=3.24 + fov=50 frames ALL 8 zodiac medallions including ♈ N & ♎ S AND front clutch socket clear of HUD!)
      SR.Camera.registerView('orrery_top', {
        pos: [0, 3.24, 0.18],
        target: [0, 0.96, 0.04],
        fov: 50,
        title: 'Planetario — Vista Cenital',
        subtitle: 'Alinea Mercurio, Venus, Marte y Saturno desde arriba',
        parent: 'room',
        perspectiveView: 'orrery'
      });

      // Tight stepped room-view hitbox hugging ONLY the physical pedestal + central bud
      // (never extends as empty air above the orbital deck, so wall stations behind are never blocked!)
      const macroHitGroup = new THREE.Group();
      const baseHit = new THREE.Mesh(new THREE.CylinderGeometry(0.60, 0.64, 0.96, 16), makeHitboxMat());
      baseHit.position.y = 0.48;
      macroHitGroup.add(baseHit);
      const budHit = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.32, 12), makeHitboxMat());
      budHit.position.y = 1.12;
      macroHitGroup.add(budHit);
      group.add(macroHitGroup);
      SR.registerInteractive(macroHitGroup, {
        id: 'orrery_zoom',
        station: 'orrery',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'El Gran Planetario Mecánico',
        cursor: 'inspect',
        highlightTarget: this.pedestalHighlight,
        onClick: () => {
          SR.Audio.playClick(0.95);
          SR.Camera.goToView('orrery');
        }
      });

      this.syncFromState();
    },

    _buildPedestalAndBezel(group, mats) {
      const ped = new THREE.Group();
      group.add(ped);

      // Stepped octagonal marble & brass base plinth
      const baseLow = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.79, 0.09, 8), mats.marble);
      baseLow.position.y = 0.045;
      baseLow.rotation.y = Math.PI / 8;
      baseLow.castShadow = true;
      baseLow.receiveShadow = true;
      ped.add(baseLow);

      const baseTrim = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.72, 0.055, 8), mats.agedBrass);
      baseTrim.position.y = 0.115;
      baseTrim.rotation.y = Math.PI / 8;
      ped.add(baseTrim);

      // Carved octagonal mahogany column body
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.62, 0.70, 8), mats.mahogany);
      shaft.position.y = 0.49;
      shaft.rotation.y = Math.PI / 8;
      shaft.castShadow = true;
      shaft.receiveShadow = true;
      ped.add(shaft);

      // 8 corner brass pilasters + inlaid marble side medallions
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const cornerA = a + Math.PI / 8;
        const pil = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.68, 8), mats.brass);
        pil.position.set(Math.sin(cornerA) * 0.59, 0.49, -Math.cos(cornerA) * 0.59);
        ped.add(pil);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.46, 0.025), mats.marble);
        panel.position.set(Math.sin(a) * 0.56, 0.49, -Math.cos(a) * 0.56);
        panel.rotation.y = -a;
        ped.add(panel);

        const panelFrame = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.49, 0.015), mats.agedBrass);
        panelFrame.position.set(Math.sin(a) * 0.553, 0.49, -Math.cos(a) * 0.553);
        panelFrame.rotation.y = -a;
        ped.add(panelFrame);
      }

      // Upper cornice table deck
      const cornice = new THREE.Mesh(new THREE.CylinderGeometry(0.70, 0.62, 0.11, 32), mats.mahogany);
      cornice.position.y = PEDESTAL_H - 0.045;
      cornice.castShadow = true;
      cornice.receiveShadow = true;
      ped.add(cornice);

      const brassLip = new THREE.Mesh(new THREE.TorusGeometry(0.685, 0.022, 12, 48), mats.brass);
      brassLip.rotation.x = Math.PI / 2;
      brassLip.position.y = PEDESTAL_H + 0.012;
      ped.add(brassLip);
      this.pedestalHighlight = brassLip;

      // Crisp 1024x1024 Horizontal Zodiac & Compass Platter (rotX = -PI/2 maps Top Canvas -> -Z North!)
      const zodiacTex = createZodiacPlatterTexture();
      const platter = new THREE.Mesh(
        new THREE.CircleGeometry(0.675, 64),
        new THREE.MeshStandardMaterial({
          map: zodiacTex,
          roughness: 0.42,
          metalness: 0.48
        })
      );
      platter.rotation.x = -Math.PI / 2;
      platter.position.y = BEZEL_Y;
      platter.receiveShadow = true;
      ped.add(platter);
    },

    _buildClockworkDeck(group, mats) {
      const deck = new THREE.Group();
      group.add(deck);

      const gearSpecs = [
        { x: 0.0,  z: 0.0,  r: 0.24, teeth: 24, y: BEZEL_Y + 0.008, speed: 0.35,  mat: mats.agedBrass },
        { x: 0.27, z: -0.14, r: 0.13, teeth: 14, y: BEZEL_Y + 0.012, speed: -0.65, mat: mats.brass },
        { x: -0.26, z: 0.16, r: 0.14, teeth: 16, y: BEZEL_Y + 0.012, speed: -0.58, mat: mats.copper },
        { x: -0.22, z: -0.22, r: 0.10, teeth: 12, y: BEZEL_Y + 0.016, speed: 0.85,  mat: mats.gold },
        { x: 0.24, z: 0.22,  r: 0.11, teeth: 12, y: BEZEL_Y + 0.016, speed: 0.78,  mat: mats.agedBrass }
      ];

      gearSpecs.forEach(spec => {
        const g = createGearMesh(spec.r, spec.teeth, 0.012, spec.mat);
        g.position.set(spec.x, spec.y, spec.z);
        deck.add(g);
        this.gears.push({ mesh: g, speed: spec.speed });
      });
    },

    _buildPlanetaryRings(group, mats) {
      PLANET_DEFS.forEach(def => {
        // Stationary grooved brass track ring on deck
        const track = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.009, 10, 56), mats.agedBrass);
        track.rotation.x = Math.PI / 2;
        track.position.y = def.ringY;
        group.add(track);

        // Rotating orbital carrier group:
        // Planet is placed at (0, y, -r) -> North (sector 0).
        // Rotating by -sector * PI/4 moves it CLOCKWISE viewed from above!
        const carrier = new THREE.Group();
        carrier.name = 'Orrery_Ring_' + def.key;
        group.add(carrier);

        // Sleek rotating golden-brass inner orbital ring
        const innerRing = new THREE.Mesh(new THREE.TorusGeometry(def.radius, 0.006, 8, 48), mats.gold);
        innerRing.rotation.x = Math.PI / 2;
        innerRing.position.y = def.ringY + 0.010;
        carrier.add(innerRing);

        // Radial support spoke from hub out to planet & pointer dart toward bezel
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.008, def.radius - 0.09), mats.brass);
        spoke.position.set(0, def.ringY + 0.012, -(0.09 + (def.radius - 0.09) * 0.5));
        carrier.add(spoke);

        // Vertical sculpted brass planet stalk rising from orbital ring
        const stalkH = def.planetY - def.ringY - 0.01;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.011, stalkH, 10), mats.gold);
        stalk.position.set(0, def.ringY + 0.01 + stalkH * 0.5, -def.radius);
        carrier.add(stalk);

        // Planet sculpted sphere
        const pMat = new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.emissive,
          emissiveIntensity: 0.38,
          roughness: 0.28,
          metalness: def.key === 'mercury' ? 0.78 : 0.42
        });
        const planetMesh = new THREE.Mesh(new THREE.SphereGeometry(def.size, 24, 20), pMat);
        planetMesh.position.set(0, def.planetY, -def.radius);
        planetMesh.castShadow = true;
        carrier.add(planetMesh);

        // Distinctive planetary astronomical traits (reinforce Bookshelf clues!)
        if (def.key === 'mars') {
          const moonsGroup = new THREE.Group();
          moonsGroup.position.set(0, def.planetY, -def.radius);
          carrier.add(moonsGroup);
          this.marsMoonsGroup = moonsGroup;

          const moonSpecs = [
            { dist: 0.064, r: 0.010, angle: 0.4, tilt: 0.22 },
            { dist: 0.080, r: 0.0085, angle: 3.55, tilt: -0.25 }
          ];
          moonSpecs.forEach(ms => {
            const wire = new THREE.Mesh(new THREE.TorusGeometry(ms.dist, 0.0022, 6, 24), mats.brass);
            wire.rotation.x = Math.PI / 2 + ms.tilt;
            moonsGroup.add(wire);

            const m = new THREE.Mesh(new THREE.SphereGeometry(ms.r, 12, 10), mats.silver);
            m.position.set(
              Math.cos(ms.angle) * ms.dist,
              Math.sin(ms.angle) * ms.dist * Math.sin(ms.tilt),
              Math.sin(ms.angle) * ms.dist * Math.cos(ms.tilt)
            );
            moonsGroup.add(m);
          });
        }

        if (def.key === 'saturn') {
          const satRing = new THREE.Mesh(new THREE.RingGeometry(0.062, 0.096, 32), mats.gold);
          satRing.material = new THREE.MeshStandardMaterial({
            color: 0xe6c36e,
            emissive: 0x3b2a08,
            roughness: 0.30,
            metalness: 0.75,
            side: THREE.DoubleSide
          });
          satRing.position.set(0, def.planetY, -def.radius);
          satRing.rotation.x = -Math.PI / 2 + 0.42;
          satRing.rotation.y = 0.25;
          carrier.add(satRing);
        }

        // Sharp golden radial pointer needle extending slightly outward so sector alignment is crystal-clear!
        const dartLen = 0.052;
        const dart = new THREE.Mesh(new THREE.ConeGeometry(0.014, dartLen, 4), mats.gold);
        dart.rotation.x = -Math.PI / 2;
        dart.position.set(0, def.ringY + 0.016, -(def.radius + 0.036));
        carrier.add(dart);

        // Engraved planet glyph medallion right next to the planet base
        const tabTex = createPlanetTabTexture(def.key);
        const tab = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.030, 0.010, 18),
          [
            mats.gold,
            new THREE.MeshStandardMaterial({ map: tabTex, roughness: 0.35, metalness: 0.45 }),
            mats.agedBrass
          ]
        );
        tab.position.set(0, def.ringY + 0.018, -(def.radius - 0.044));
        carrier.add(tab);

        // Crisp clickable hitbox covering the planet sphere + stalk + glyph medallion
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.21, 12), makeHitboxMat());
        hit.position.set(0, def.ringY + 0.11, -def.radius);
        carrier.add(hit);

        const initSec = SR.State.data.orreryRings[def.key] || 0;
        const initAngle = -initSec * (Math.PI / 4);
        carrier.rotation.y = initAngle;

        const cfg = SR.registerInteractive(hit, {
          id: 'orrery_ring_' + def.key,
          station: 'orrery',
          activeViews: ['orrery', 'orrery_top'],
          action: 'Girar',
          label: `${def.name} (${def.glyph}) — ${SECTORS[initSec].glyph} ${SECTORS[initSec].dir}`,
          cursor: 'interact',
          highlightTarget: planetMesh,
          onClick: () => this._onPlanetClick(def.key)
        });

        this.rings[def.key] = {
          def,
          carrier,
          planetMesh,
          pMat,
          cfg,
          currentAngle: initAngle,
          targetAngle: initAngle
        };
      });
    },

    _buildClutchSocket(group, mats) {
      // Mounted prominently on the South-East/South upper rim angled upward toward the 'orrery' camera
      // so it sits cleanly ABOVE the bottom inventory bar and is immediately unmistakable!
      const clutch = new THREE.Group();
      clutch.position.set(0.32, PEDESTAL_H + 0.018, 0.64);
      clutch.rotation.y = 0.44;
      clutch.rotation.x = -0.52;
      group.add(clutch);

      const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.11, 0.055), mats.brass);
      bracket.position.z = -0.02;
      clutch.add(bracket);

      const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.066, 0.052, 16), mats.agedBrass);
      housing.rotation.x = Math.PI / 2;
      clutch.add(housing);
      this.clutchHousing = housing;

      const goldRing = new THREE.Mesh(new THREE.TorusGeometry(0.054, 0.008, 10, 24), mats.gold);
      goldRing.position.z = 0.026;
      clutch.add(goldRing);

      // Recessed dark hexagonal socket well
      const hexWell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.026, 0.036, 6),
        mats.darkIron
      );
      hexWell.rotation.x = Math.PI / 2;
      hexWell.position.z = 0.018;
      clutch.add(hexWell);

      // Lock status jewel directly above clutch socket (Red = locked, Emerald-Gold = unlocked!)
      this.clutchJewelMat = new THREE.MeshStandardMaterial({
        color: 0xd62828,
        emissive: 0xff2b2b,
        emissiveIntensity: 1.35,
        roughness: 0.2
      });
      const jewel = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), this.clutchJewelMat);
      jewel.position.set(0, 0.068, 0.014);
      clutch.add(jewel);

      // Installed brass star crank (hidden until orreryUnlocked === true)
      const crank = createInstalledCrankMesh(mats);
      crank.position.z = 0.015;
      crank.visible = false;
      clutch.add(crank);
      this.crankMesh = crank;

      // Generous clickable hitbox
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.20, 12), makeHitboxMat());
      hit.rotation.x = Math.PI / 2;
      hit.position.z = 0.08;
      clutch.add(hit);

      this.clutchCfg = SR.registerInteractive(hit, {
        id: 'orrery_clutch',
        station: 'orrery',
        activeViews: ['orrery', 'orrery_top'],
        action: 'Desbloquear',
        label: 'Embrague del Planetario (Bloqueado)',
        cursor: 'interact',
        highlightTarget: housing,
        onClick: () => {
          const st = SR.State.data;
          if (!st.orreryUnlocked) {
            if (st.selectedItem === 'orrery_crank') {
              st.orreryUnlocked = true;
              SR.State.removeItem('orrery_crank');
              this.crankSpin = Math.PI * 2;
              SR.Audio.playGear(0.85);
              SR.Audio.playSolve();
              this._syncClutchVisuals();
              SR.UI.say('¡La Manivela Astral desbloquea el embrague del Planetario! Los engranajes despiertan; ahora puedes girar los cuatro planetas.');
            } else {
              SR.Audio.playError();
              SR.UI.say('Un embrague hexagonal mantiene bloqueados los anillos del Planetario. Necesitas la Manivela Astral.');
            }
          } else {
            this.crankSpin += Math.PI;
            SR.Audio.playGear(1.0);
            SR.UI.say('El embrague está liberado. Haz clic directamente sobre Mercurio, Venus, Marte o Saturno para girar sus órbitas.');
          }
        }
      });
    },

    _buildLotusSunAndPrism(group, mats) {
      const center = new THREE.Group();
      center.position.set(0, BEZEL_Y, 0);
      group.add(center);

      // Fluted golden central solar pedestal column
      const colBase = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.135, 0.05, 16), mats.agedBrass);
      colBase.position.y = 0.025;
      center.add(colBase);

      const colStem = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.086, 0.16, 16), mats.brass);
      colStem.position.y = 0.13;
      center.add(colStem);

      const chalice = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.068, 0.06, 18), mats.gold);
      chalice.position.y = 0.22;
      center.add(chalice);

      // Glowing inner golden solar core light (balanced so petals & Umbral Prism stay crisp, not blown out)
      this.sunCoreLight = new THREE.PointLight(0xffc355, 0.85, 3.8, 1.8);
      this.sunCoreLight.position.set(0, 0.34, 0);
      center.add(this.sunCoreLight);

      const sunCoreMat = new THREE.MeshStandardMaterial({
        color: 0xf5cc6c,
        emissive: 0xe69828,
        emissiveIntensity: 0.92,
        roughness: 0.22,
        metalness: 0.35
      });
      this.sunCoreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.048, 18, 16), sunCoreMat);
      this.sunCoreMesh.position.y = 0.275;
      center.add(this.sunCoreMesh);

      // 6 Curved Mechanical Gilded Brass Lotus Petals enclosing the core
      const petalMat = new THREE.MeshStandardMaterial({
        color: 0xdcb04c,
        emissive: 0x2e1a03,
        emissiveIntensity: 0.28,
        roughness: 0.26,
        metalness: 0.88,
        side: THREE.DoubleSide
      });

      const petalShape = new THREE.Shape();
      petalShape.moveTo(0, 0);
      petalShape.quadraticCurveTo(0.048, 0.038, 0.038, 0.105);
      petalShape.quadraticCurveTo(0.019, 0.155, 0, 0.180);
      petalShape.quadraticCurveTo(-0.019, 0.155, -0.038, 0.105);
      petalShape.quadraticCurveTo(-0.048, 0.038, 0, 0);

      const petalGeo = new THREE.ExtrudeGeometry(petalShape, {
        depth: 0.008,
        bevelEnabled: true,
        bevelThickness: 0.003,
        bevelSize: 0.003,
        bevelSegments: 2
      });
      // Curve the petal inward slightly so 6 closed petals form a sculpted golden lotus bud!
      const posAttr = petalGeo.attributes.position;
      for (let i = 0; i < posAttr.count; i++) {
        const py = posAttr.getY(i);
        const pz = posAttr.getZ(i);
        const t = Math.max(0, Math.min(1, py / 0.180));
        const curveZ = -Math.sin(t * Math.PI * 0.85) * 0.042 - t * t * 0.030;
        posAttr.setZ(i, pz + curveZ);
      }
      petalGeo.computeVertexNormals();

      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const holder = new THREE.Group();
        holder.rotation.y = a;
        holder.position.y = 0.228;
        center.add(holder);

        const pivot = new THREE.Group();
        pivot.position.set(0, 0, 0.080);
        holder.add(pivot);

        const petal = new THREE.Mesh(petalGeo, petalMat);
        petal.castShadow = true;
        pivot.add(petal);

        // Golden central rib along each petal
        const rib = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.132, 0.009), mats.gold);
        rib.position.set(0, 0.075, -0.024);
        rib.rotation.x = -0.35;
        pivot.add(rib);

        this.petalPivots.push(pivot);
      }

      // RELIC 3/3: umbral_prism (Prisma Umbral) hidden inside Lotus Sun, rises when solved!
      const prismGroup = createUmbralPrismMesh(mats);
      prismGroup.position.set(0, 0.28, 0);
      prismGroup.scale.setScalar(0.01);
      prismGroup.visible = false;
      center.add(prismGroup);
      this.prismGroup = prismGroup;

      const prismHit = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 12), makeHitboxMat());
      prismHit.position.set(0, 0.44, 0);
      center.add(prismHit);
      this.prismHit = prismHit;

      this.prismCfg = SR.registerInteractive(prismHit, {
        id: 'orrery_pickup_umbral_prism',
        station: 'orrery',
        activeViews: ['orrery', 'orrery_top'],
        action: 'Recoger',
        label: 'Prisma Umbral (Reliquia 3/3)',
        cursor: 'interact',
        highlightTarget: prismGroup,
        disabled: true,
        onClick: () => {
          const st = SR.State.data;
          if (!st.orrerySolved || st.umbralPrismTaken) return;
          st.umbralPrismTaken = true;
          SR.State.addItem('umbral_prism');
          SR.Audio.playCrystal(1.45);
          SR.Audio.playPickup();
          this._syncPrismVisuals();
          SR.UI.say('¡Has obtenido el Prisma Umbral! (Reliquia del Eclipse 3/3 — Coloca las tres reliquias en la Puerta del Eclipse).');
        }
      });
    },

    _onPlanetClick(key) {
      const st = SR.State.data;
      const entry = this.rings[key];
      if (!entry) return;

      if (!st.orreryUnlocked) {
        SR.Audio.playError();
        SR.UI.say('Los anillos del Planetario están bloqueados. Inserta la Manivela Astral en el embrague frontal.');
        return;
      }

      if (st.orrerySolved) {
        SR.Audio.playCrystal(1.1);
        SR.UI.say('Los cuatro astros están alineados en la conjunción perfecta del Gran Eclipse.');
        return;
      }

      const prev = st.orreryRings[key] || 0;
      const next = (prev + 1) % 8;
      st.orreryRings[key] = next;
      // Rotate clockwise (-PI/4 around Y viewed from above!)
      entry.targetAngle -= Math.PI / 4;
      SR.State.save();

      const sec = SECTORS[next];
      entry.cfg.label = `${entry.def.name} (${entry.def.glyph}) — ${sec.glyph} ${sec.dir}`;

      SR.Audio.playGear(1.05 + (next % 4) * 0.08);
      this.crankSpin += Math.PI * 0.5;

      // Check full alignment!
      const r = st.orreryRings;
      if (
        r.mercury === TARGET_SECTORS.mercury &&
        r.venus === TARGET_SECTORS.venus &&
        r.mars === TARGET_SECTORS.mars &&
        r.saturn === TARGET_SECTORS.saturn
      ) {
        st.orrerySolved = true;
        SR.State.save();
        SR.Audio.playSolve();
        SR.Audio.playCrystal(1.2);
        this._syncPrismVisuals();
        SR.UI.say('¡Alineación planetaria perfecta! El Sol de Loto despliega sus pétalos de oro revelando el Prisma Umbral.');
      } else {
        SR.UI.say(`${entry.def.name} (${entry.def.glyph}) → ${sec.glyph} (${sec.full})`);
      }
    },

    _syncClutchVisuals() {
      const st = SR.State.data;
      if (this.crankMesh) {
        this.crankMesh.visible = !!st.orreryUnlocked;
      }
      if (this.clutchJewelMat) {
        if (st.orreryUnlocked) {
          this.clutchJewelMat.color.setHex(0x64f096);
          this.clutchJewelMat.emissive.setHex(0x32d66c);
          this.clutchJewelMat.emissiveIntensity = 1.6;
        } else {
          this.clutchJewelMat.color.setHex(0xd62828);
          this.clutchJewelMat.emissive.setHex(0xff2b2b);
          this.clutchJewelMat.emissiveIntensity = 1.3;
        }
      }
      if (this.clutchCfg) {
        this.clutchCfg.action = st.orreryUnlocked ? 'Girar' : 'Desbloquear';
        this.clutchCfg.label = st.orreryUnlocked
          ? 'Manivela Astral (Embrague libre)'
          : 'Embrague del Planetario (Bloqueado)';
        this.clutchCfg.highlightTarget = st.orreryUnlocked ? this.crankMesh : this.clutchHousing;
      }
    },

    _syncPrismVisuals() {
      const st = SR.State.data;
      const showPrism = !!(st.orrerySolved && !st.umbralPrismTaken);
      if (this.prismGroup) {
        this.prismGroup.visible = showPrism;
      }
      if (this.prismHit) {
        this.prismHit.visible = showPrism;
      }
      if (this.prismCfg) {
        this.prismCfg.disabled = !showPrism;
      }
    },

    syncFromState() {
      const st = SR.State.data;
      this._syncClutchVisuals();

      PLANET_DEFS.forEach(def => {
        const entry = this.rings[def.key];
        const secIdx = st.orreryRings[def.key] || 0;
        const angle = -secIdx * (Math.PI / 4);
        entry.currentAngle = angle;
        entry.targetAngle = angle;
        entry.carrier.rotation.y = angle;
        const sec = SECTORS[secIdx];
        entry.cfg.label = `${def.name} (${def.glyph}) — ${sec.glyph} ${sec.dir}`;
      });

      this.lotusProgress = st.orrerySolved ? 1 : 0;
      const openAngle = this.lotusProgress * 0.94;
      this.petalPivots.forEach(p => {
        p.rotation.x = openAngle;
      });

      this._syncPrismVisuals();
      if (this.prismGroup && this.prismGroup.visible) {
        this.prismGroup.position.y = 0.28 + this.lotusProgress * 0.16;
        this.prismGroup.scale.setScalar(Math.max(0.01, this.lotusProgress));
      }
    },

    update(dt, elapsed) {
      const st = SR.State.data;
      const smooth = Math.min(1, dt * 8.5);

      // Smoothly rotate planetary orbital rings
      PLANET_DEFS.forEach(def => {
        const entry = this.rings[def.key];
        if (Math.abs(entry.targetAngle - entry.currentAngle) > 0.001) {
          entry.currentAngle += (entry.targetAngle - entry.currentAngle) * smooth;
          entry.carrier.rotation.y = entry.currentAngle;
        }
        // Subtle glow highlight when a planet rests on its target sector while unlocked
        const onTarget = st.orreryUnlocked && st.orreryRings[def.key] === TARGET_SECTORS[def.key];
        entry.pMat.emissiveIntensity = onTarget
          ? (st.orrerySolved ? 1.15 : 0.68)
          : 0.34;
      });

      // Gently orbit Mars's 2 miniature moons
      if (this.marsMoonsGroup) {
        this.marsMoonsGroup.rotation.y = elapsed * 0.9;
      }

      // Clockwork gears slowly turn once unlocked (and briskly once solved)
      const gearMult = st.orrerySolved ? 1.4 : (st.orreryUnlocked ? 0.55 : 0.08);
      for (let i = 0; i < this.gears.length; i++) {
        this.gears[i].mesh.rotation.y += dt * this.gears[i].speed * gearMult;
      }

      // Installed Astral Crank animation
      if (this.crankMesh && this.crankMesh.visible && this.crankSpin > 0.001) {
        const step = Math.min(this.crankSpin, dt * 6.5);
        this.crankSpin -= step;
        this.crankMesh.rotation.z -= step;
      }

      // Blooming Mechanical Lotus Sun animation
      const targetLotus = st.orrerySolved ? 1 : 0;
      if (Math.abs(targetLotus - this.lotusProgress) > 0.001) {
        this.lotusProgress += (targetLotus - this.lotusProgress) * Math.min(1, dt * 2.8);
        const eased = 1 - Math.pow(1 - this.lotusProgress, 3);
        const openAngle = eased * 0.94; // ~54° outward bloom (stays cleanly inside Mercury orbit!)
        for (let i = 0; i < this.petalPivots.length; i++) {
          this.petalPivots[i].rotation.x = openAngle;
        }
      }

      // Sun core & Umbral Prism hover + bloom
      if (this.sunCoreLight) {
        const baseI = st.orrerySolved ? 1.35 : 0.78;
        this.sunCoreLight.intensity = baseI + Math.sin(elapsed * 2.8) * 0.14;
        this.sunCoreLight.color.setHex(st.orrerySolved ? 0xc28cff : 0xffc355);
      }
      if (this.sunCoreMesh) {
        this.sunCoreMesh.scale.setScalar(1 + Math.sin(elapsed * 3.1) * 0.05);
      }
      if (this.prismGroup && this.prismGroup.visible) {
        const eased = 1 - Math.pow(1 - this.lotusProgress, 3);
        this.prismGroup.position.y = 0.28 + eased * 0.16 + Math.sin(elapsed * 2.4) * 0.015;
        this.prismGroup.scale.setScalar(Math.max(0.05, eased));
        this.prismGroup.rotation.y = elapsed * 0.95;
      }
    }
  };

  SR.Stations = SR.Stations || {};
  SR.Stations.orrery = OrreryStation;
})(window.SR = window.SR || {});
