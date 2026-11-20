/* ==========================================================================
   src/room/stations/clockBooks.js — Wall 45° (NE): Reloj Astronómico & Libros
   ========================================================================== */
(function (SR) {
  'use strict';

  SR.Stations = SR.Stations || {};

  const TWO_PI = Math.PI * 2;
  const BOOK_TARGET = ['mercury', 'mars', 'saturn', 'neptune'];

  const MOON_PHASE_NAMES = [
    'Luna Llena',
    'Cuarto Menguante',
    'Luna Nueva (Eclipse)',
    'Cuarto Creciente'
  ];

  const PLANET_BOOKS = [
    { id: 'mercury', interactiveId: 'book_mercury', roman: 'I',   glyph: '☿', color: '#7a1f24', accent: '#e5be6a' },
    { id: 'venus',   interactiveId: 'book_venus',   roman: 'II',  glyph: '♀', color: '#1b5a46', accent: '#e5be6a' },
    { id: 'mars',    interactiveId: 'book_mars',    roman: 'III', glyph: '♂', color: '#8c3b19', accent: '#e5be6a' },
    { id: 'saturn',  interactiveId: 'book_saturn',  roman: 'IV',  glyph: '♄', color: '#4d265c', accent: '#e5be6a' },
    { id: 'neptune', interactiveId: 'book_neptune', roman: 'V',   glyph: '♆', color: '#1d3c6c', accent: '#e5be6a' }
  ];

  function makeBox(w, h, d, radius) {
    if (THREE.RoundedBoxGeometry && radius) {
      return new THREE.RoundedBoxGeometry(w, h, d, 3, radius);
    }
    return new THREE.BoxGeometry(w, h, d);
  }

  function toWorld(group, x, y, z) {
    const v = new THREE.Vector3(x, y, z);
    group.localToWorld(v);
    return [v.x, v.y, v.z];
  }

  function updateInteractive(id, cfgRef, patch) {
    if (cfgRef) Object.assign(cfgRef, patch);
    if (SR.Interactables) {
      for (let i = 0; i < SR.Interactables.length; i++) {
        if (SR.Interactables[i].id === id) {
          Object.assign(SR.Interactables[i], patch);
          break;
        }
      }
    }
  }

  function formatTime(h, m) {
    return h + ':' + (m < 10 ? '0' + m : m);
  }

  // ---- Canvas2D Texture Generators ----

  function createClockDialTexture() {
    return SR.Textures.makeCanvasTexture(512, 512, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const r = w * 0.48;

      // Aged antique parchment-enamel dial gradient (rich contrast without bloom blowout)
      const bg = ctx.createRadialGradient(cx, cy, 18, cx, cy, r);
      bg.addColorStop(0, '#e3cfa4');
      bg.addColorStop(0.78, '#c8ae7b');
      bg.addColorStop(1, '#9b7d4b');
      ctx.fillStyle = bg;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TWO_PI);
      ctx.fill();

      // Outer & inner brass chapter rings
      ctx.strokeStyle = '#3b2610';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.94, 0, TWO_PI);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.87, 0, TWO_PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, r * 0.56, 0, TWO_PI);
      ctx.stroke();

      // 60 minute ticks
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TWO_PI - Math.PI / 2;
        const major = (i % 5 === 0);
        const r0 = r * (major ? 0.87 : 0.89);
        const r1 = r * 0.94;
        ctx.strokeStyle = '#231507';
        ctx.lineWidth = major ? 4 : 1.8;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // Roman numerals
      const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      ctx.fillStyle = '#1b1106';
      ctx.font = 'bold 40px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI - Math.PI / 2;
        const nr = r * 0.72;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * nr, cy + Math.sin(a) * nr);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillText(romans[i], 0, 0);
        ctx.restore();
      }

      // Decorative inner sunburst filigree
      ctx.strokeStyle = 'rgba(130, 92, 34, 0.42)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TWO_PI;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
        ctx.lineTo(cx + Math.cos(a) * (r * 0.50), cy + Math.sin(a) * (r * 0.50));
        ctx.stroke();
      }

      // Maker signature
      ctx.fillStyle = '#3a2410';
      ctx.font = 'bold 19px Georgia, serif';
      ctx.fillText('V. DE SOLÍS', cx, cy - 58);
      ctx.font = 'italic 16px Georgia, serif';
      ctx.fillText('MDCCCXCIV', cx, cy + 72);
    });
  }

  function createDynamicMoonCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    function draw(phaseIdx) {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Midnight starry sky backdrop
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#0a1029');
      sky.addColorStop(0.75, '#131d42');
      sky.addColorStop(1, '#1e1714');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, h);

      // Decorative tiny stars
      const stars = [
        [68, 56, 2.5], [118, 38, 2], [156, 86, 2.5], [362, 42, 2.5],
        [406, 84, 2], [446, 52, 2.8], [94, 134, 2], [420, 140, 2.2]
      ];
      ctx.fillStyle = '#ffe9a8';
      stars.forEach(function (s) {
        ctx.beginPath();
        ctx.arc(s[0], s[1], s[2], 0, TWO_PI);
        ctx.fill();
      });

      // Gold arch border
      ctx.strokeStyle = '#d9b05a';
      ctx.lineWidth = 7;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      // Moon disc in upper center
      const mx = w / 2;
      const my = 104;
      const mr = 64;

      if (phaseIdx === 0) {
        // Luna Llena — glowing silver-gold full disc
        const g = ctx.createRadialGradient(mx - 12, my - 12, 8, mx, my, mr);
        g.addColorStop(0, '#fffdf0');
        g.addColorStop(0.75, '#e8d7a8');
        g.addColorStop(1, '#b89f68');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TWO_PI);
        ctx.fill();
      } else if (phaseIdx === 1) {
        // Cuarto Menguante — left half illuminated
        ctx.fillStyle = '#14182a';
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#f2e4bd';
        ctx.beginPath();
        ctx.arc(mx, my, mr, Math.PI * 0.5, Math.PI * 1.5);
        ctx.closePath();
        ctx.fill();
      } else if (phaseIdx === 2) {
        // Luna Nueva / Eclipse — blazing golden solar corona ring around obsidian disc!
        const corona = ctx.createRadialGradient(mx, my, mr * 0.85, mx, my, mr * 1.48);
        corona.addColorStop(0, 'rgba(255, 224, 120, 0.98)');
        corona.addColorStop(0.35, 'rgba(255, 168, 45, 0.65)');
        corona.addColorStop(1, 'rgba(255, 140, 20, 0)');
        ctx.fillStyle = corona;
        ctx.beginPath();
        ctx.arc(mx, my, mr * 1.48, 0, TWO_PI);
        ctx.fill();

        // Corona rays
        ctx.strokeStyle = 'rgba(255, 226, 136, 0.72)';
        ctx.lineWidth = 3;
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * TWO_PI;
          ctx.beginPath();
          ctx.moveTo(mx + Math.cos(a) * (mr * 0.96), my + Math.sin(a) * (mr * 0.96));
          ctx.lineTo(mx + Math.cos(a) * (mr * 1.32), my + Math.sin(a) * (mr * 1.32));
          ctx.stroke();
        }

        ctx.fillStyle = '#09070d';
        ctx.beginPath();
        ctx.arc(mx, my, mr * 0.92, 0, TWO_PI);
        ctx.fill();
        ctx.strokeStyle = '#ffdf7c';
        ctx.lineWidth = 4;
        ctx.stroke();
      } else {
        // Cuarto Creciente — right half illuminated
        ctx.fillStyle = '#14182a';
        ctx.beginPath();
        ctx.arc(mx, my, mr, 0, TWO_PI);
        ctx.fill();
        ctx.fillStyle = '#f2e4bd';
        ctx.beginPath();
        ctx.arc(mx, my, mr, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.closePath();
        ctx.fill();
      }

      // Crisp moon rim
      ctx.strokeStyle = 'rgba(225, 188, 110, 0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mx, my, mr, 0, TWO_PI);
      ctx.stroke();

      // Engraved brass label ribbon along bottom
      ctx.fillStyle = '#8b662b';
      ctx.fillRect(14, h - 54, w - 28, 42);
      ctx.strokeStyle = '#efd082';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, h - 54, w - 28, 42);

      ctx.fillStyle = '#180f05';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(MOON_PHASE_NAMES[phaseIdx].toUpperCase(), w / 2, h - 32);

      tex.needsUpdate = true;
    }

    draw(0);
    return { texture: tex, draw: draw };
  }

  function createSmallButtonLabelTexture(text) {
    return SR.Textures.makeCanvasTexture(256, 72, function (ctx, w, h) {
      ctx.fillStyle = '#7e5c26';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#eac776';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, w - 8, h - 8);
      ctx.fillStyle = '#170e04';
      ctx.font = 'bold 34px "Segoe UI", Georgia, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 2);
    });
  }

  function createStarPlateTexture() {
    return SR.Textures.makeCanvasTexture(1024, 340, function (ctx, w, h) {
      // Aged engraved brass plate
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#785824');
      grad.addColorStop(0.5, '#a8813c');
      grad.addColorStop(1, '#6c4e1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle brushed metallic texture
      ctx.strokeStyle = 'rgba(255,244,200,0.07)';
      ctx.lineWidth = 1;
      for (let y = 4; y < h; y += 4) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Double ornamental border
      ctx.strokeStyle = '#efd080';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeStyle = '#251708';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      // Corner brass rivets
      [[32, 32], [w - 32, 32], [32, h - 32], [w - 32, h - 32]].forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 8, 0, TWO_PI);
        ctx.fillStyle = '#deb762';
        ctx.fill();
        ctx.strokeStyle = '#241607';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Header
      ctx.fillStyle = '#191005';
      ctx.font = 'bold 32px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦  PLACA DE OBSERVACIONES PLANETARIAS (1894)  ✦', w / 2, 54);

      ctx.strokeStyle = '#2c1c0a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(64, 78);
      ctx.lineTo(w - 64, 78);
      ctx.stroke();

      // 5 planetary rows — crisp, unmistakably readable
      const rows = [
        ['☿', 'Mercurio', 'Órbita I',   'Junto al fuego central'],
        ['♀', 'Venus',    'Órbita II',  'Velo dorado resplandeciente'],
        ['♂', 'Marte',    'Órbita III', 'Guerrero de dos satélites'],
        ['♄', 'Saturno',  'Órbita IV',  'Soberano de halo anillado'],
        ['♆', 'Neptuno',  'Órbita V',   'Confines azules más lejanos']
      ];

      ctx.textAlign = 'left';
      for (let i = 0; i < rows.length; i++) {
        const y = 112 + i * 44;
        const row = rows[i];

        ctx.fillStyle = '#150c03';
        ctx.font = 'bold 34px "Segoe UI Symbol", Georgia, serif';
        ctx.fillText(row[0], 72, y);

        ctx.font = 'bold 28px Georgia, serif';
        ctx.fillText(row[1], 130, y);

        ctx.fillStyle = '#2b1b0a';
        ctx.font = 'bold 25px Georgia, serif';
        ctx.fillText('—  ' + row[2], 325, y);

        ctx.font = 'italic 25px Georgia, serif';
        ctx.fillText('•  ' + row[3], 515, y);
      }
    });
  }

  function createBookSpineTexture(book) {
    return SR.Textures.makeCanvasTexture(256, 512, function (ctx, w, h) {
      // Rich leather gradient
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#140c0a');
      g.addColorStop(0.18, book.color);
      g.addColorStop(0.5, book.color);
      g.addColorStop(0.82, book.color);
      g.addColorStop(1, '#120a08');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Subtle leather grain noise
      ctx.fillStyle = 'rgba(0,0,0,0.09)';
      for (let i = 0; i < 160; i++) {
        ctx.fillRect((i * 37) % w, (i * 89) % h, 4, 3);
      }

      // Raised horizontal gold-tooled spine ribs
      [34, 52, 146, 366, 458, 476].forEach(function (ry) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(10, ry + 5, w - 20, 6);
        ctx.fillStyle = book.accent;
        ctx.fillRect(10, ry, w - 20, 6);
      });

      // Gold border frame
      ctx.strokeStyle = book.accent;
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 66, w - 36, 378);

      // Roman catalog number ONLY (top)
      ctx.fillStyle = '#f5d98a';
      ctx.font = 'bold 54px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(book.roman, w / 2, 106);

      // Central gilt cartouche holding ONLY the planetary glyph!
      ctx.fillStyle = 'rgba(18, 12, 8, 0.58)';
      ctx.beginPath();
      ctx.ellipse(w / 2, 256, 82, 92, 0, 0, TWO_PI);
      ctx.fill();
      ctx.strokeStyle = '#f2ce78';
      ctx.lineWidth = 5;
      ctx.stroke();

      ctx.fillStyle = '#ffe599';
      ctx.font = 'bold 116px "Segoe UI Symbol", Georgia, serif';
      ctx.fillText(book.glyph, w / 2, 264);

      // Small decorative star flourish at bottom (NO planet name!)
      ctx.fillStyle = book.accent;
      ctx.font = '32px Georgia, serif';
      ctx.fillText('✦', w / 2, 412);
    });
  }

  // ---- 3D Pickup Mesh Builders ----

  function buildSolarGearPickup() {
    const g = new THREE.Group();
    const goldMat = SR.Materials.get('gold').clone();
    goldMat.emissive = new THREE.Color(0xffb42c);
    goldMat.emissiveIntensity = 0.65;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.016, 12, 32), goldMat);
    g.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.022, 24), goldMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);

    const toothGeo = new THREE.BoxGeometry(0.017, 0.036, 0.018);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TWO_PI;
      const t = new THREE.Mesh(toothGeo, goldMat);
      t.position.set(Math.cos(a) * 0.106, Math.sin(a) * 0.106, 0);
      t.rotation.z = a - Math.PI / 2;
      g.add(t);
    }

    const gemMat = new THREE.MeshStandardMaterial({
      color: 0xffdc78,
      emissive: 0xffa822,
      emissiveIntensity: 1.5,
      roughness: 0.15,
      metalness: 0.25
    });
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.036, 16, 16), gemMat);
    gem.scale.set(1, 1, 0.55);
    gem.position.z = 0.014;
    g.add(gem);

    g.userData.highlightMesh = rim;
    return g;
  }

  function buildClockKeyPickup() {
    const g = new THREE.Group();
    const brassMat = SR.Materials.get('gold').clone();
    brassMat.emissive = new THREE.Color(0xc88e28);
    brassMat.emissiveIntensity = 0.22;

    // Ornate trefoil bow
    const mainBow = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.008, 10, 20), brassMat);
    mainBow.position.x = -0.068;
    g.add(mainBow);

    [-0.024, 0.024].forEach(function (oy) {
      const lobe = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 8, 16), brassMat);
      lobe.position.set(-0.048, oy, 0);
      g.add(lobe);
    });

    // Turned shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.011, 0.13, 12), brassMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.position.x = 0.012;
    g.add(shaft);

    // Collar bead
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.005, 8, 14), brassMat);
    collar.rotation.y = Math.PI / 2;
    collar.position.x = -0.028;
    g.add(collar);

    // Square horological winding barrel
    const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.022, 0.022), brassMat);
    barrel.position.x = 0.075;
    g.add(barrel);

    // Generous invisible click target
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.11, 0.09),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    g.add(hit);

    g.userData.highlightMesh = mainBow;
    return g;
  }

  function buildValveWheelPickup() {
    const g = new THREE.Group();
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x9b2d24,
      emissive: 0x44100a,
      emissiveIntensity: 0.25,
      roughness: 0.42,
      metalness: 0.55
    });
    const brassMat = SR.Materials.get('brass').clone();
    brassMat.emissive = new THREE.Color(0x8a6422);
    brassMat.emissiveIntensity = 0.2;

    const wheelRim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.016, 12, 28), rimMat);
    g.add(wheelRim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.032, 16), brassMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);

    // 4 spokes
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.165, 10), brassMat);
      spoke.rotation.z = (i * Math.PI) / 4;
      g.add(spoke);
    }

    // Generous click hit cylinder
    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    hit.rotation.x = Math.PI / 2;
    g.add(hit);

    g.userData.highlightMesh = wheelRim;
    return g;
  }

  // ---- Station Module ----

  const ClockBooksStation = {
    group: null,
    // Clock parts
    clockDoorPivot: null,
    clockDoorAngle: 0,
    pendulumPivot: null,
    weightMesh: null,
    weightHookObj: null,
    weightHookCfg: null,
    keyholeCfg: null,
    hourHandPivot: null,
    minuteHandPivot: null,
    hourHandAngle: 0,
    minuteHandAngle: 0,
    moonDial: null,
    pedimentLeft: null,
    pedimentRight: null,
    pedimentOpen: 0,
    solarGearGroup: null,
    solarGearCfg: null,
    solarLight: null,
    clockHourCfg: null,
    clockMinCfg: null,
    clockMoonCfg: null,
    // Bookcase parts
    bookItems: {},
    booksResetTimer: null,
    alcoveLeftDoor: null,
    alcoveRightDoor: null,
    alcoveOpen: 0,
    alcoveLight: null,
    keyPickup: null,
    keyPickupCfg: null,
    wheelPickup: null,
    wheelPickupCfg: null,

    init: function (scene) {
      const self = this;
      const wt = SR.ROOM.wallTransform(45, 0);

      const group = new THREE.Group();
      group.name = 'station_clockBooks';
      group.position.set(wt.x, 0, wt.z);
      group.rotation.y = wt.rotY;
      scene.add(group);
      this.group = group;

      this.buildGrandfatherClock(group);
      this.buildBookcase(group);

      // Subtle warm station fill light so clock face, star plate & book glyphs read crisply without glare
      const stationLight = new THREE.PointLight(0xffdaa0, 0.65, 4.4, 2);
      stationLight.position.set(0.0, 2.35, 1.45);
      group.add(stationLight);

      // Overview click zone in 'room' view
      const overviewHit = new THREE.Mesh(
        new THREE.BoxGeometry(2.70, 2.55, 0.56),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      overviewHit.position.set(0.08, 1.30, 0.28);
      group.add(overviewHit);

      SR.registerInteractive(overviewHit, {
        id: 'clockBooks_focus',
        station: 'clockBooks',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'Reloj Astronómico y Estantería',
        cursor: 'inspect',
        onClick: function () {
          SR.Camera.goToView('clockBooks');
        }
      });

      // Register Camera Views
      group.updateMatrixWorld(true);

      SR.Camera.registerView('clockBooks', {
        pos: toWorld(group, 0.05, 1.48, 2.58),
        target: toWorld(group, 0.05, 1.38, 0.25),
        fov: 54,
        title: 'Reloj Astronómico y Estantería',
        subtitle: 'Haz clic en el reloj de péndulo o en la estantería para acercarte',
        parent: 'room'
      });

      SR.Camera.registerView('clock', {
        pos: toWorld(group, -0.78, 1.66, 2.86),
        target: toWorld(group, -0.78, 1.64, 0.36),
        fov: 54,
        title: 'Reloj Astronómico de Péndulo',
        subtitle: 'Instala el contrapeso, da cuerda y fija la hora y fase lunar del eclipse',
        parent: 'clockBooks'
      });

      SR.Camera.registerView('books', {
        pos: toWorld(group, 0.62, 1.45, 2.40),
        target: toWorld(group, 0.62, 1.43, 0.26),
        fov: 52,
        title: 'Estantería de Grimorios',
        subtitle: 'Consulta la Placa de Observaciones y pulsa los tomos planetarios en orden',
        parent: 'clockBooks'
      });

      SR.State.on('selectionChanged', function () {
        self.refreshInteractiveMeta();
      });

      this.syncFromState();
    },

    // =========================================================================
    // LEFT HALF (X = -0.78): GRANDFATHER CLOCK (Puzzle A3)
    // =========================================================================
    buildGrandfatherClock: function (parent) {
      const self = this;
      const cg = new THREE.Group();
      cg.name = 'clock_unit';
      cg.position.set(-0.78, 0, 0.04);
      parent.add(cg);

      const matMahogany = SR.Materials.get('mahogany');
      const matDarkWood = SR.Materials.get('darkWood');
      const matWalnut = SR.Materials.get('walnut');
      const matBrass = SR.Materials.get('brass');
      const matAgedBrass = SR.Materials.get('agedBrass');
      const matGold = SR.Materials.get('gold');
      const matGlass = SR.Materials.get('glass');
      const matVelvet = SR.Materials.get('velvet');

      // 1. Base Plinth (Y: 0..0.58)
      const baseFoot = new THREE.Mesh(makeBox(0.76, 0.12, 0.50, 0.015), matDarkWood);
      baseFoot.position.set(0, 0.06, 0.25);
      baseFoot.castShadow = true;
      baseFoot.receiveShadow = true;
      cg.add(baseFoot);

      const baseBody = new THREE.Mesh(makeBox(0.68, 0.42, 0.44, 0.015), matMahogany);
      baseBody.position.set(0, 0.33, 0.23);
      baseBody.castShadow = true;
      baseBody.receiveShadow = true;
      cg.add(baseBody);

      const basePanel = new THREE.Mesh(makeBox(0.46, 0.26, 0.025, 0.008), matWalnut);
      basePanel.position.set(0, 0.33, 0.45);
      cg.add(basePanel);

      const baseTrim = new THREE.Mesh(makeBox(0.72, 0.06, 0.47, 0.01), matAgedBrass);
      baseTrim.position.set(0, 0.57, 0.24);
      cg.add(baseTrim);

      // 2. Hollow Waist Case for Pendulum & Counterweight (Y: 0.60..1.46)
      const waistBack = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.86, 0.04), matWalnut);
      waistBack.position.set(0, 1.03, 0.06);
      cg.add(waistBack);

      [-0.275, 0.275].forEach(function (sx) {
        const side = new THREE.Mesh(makeBox(0.055, 0.86, 0.38, 0.008), matMahogany);
        side.position.set(sx, 1.03, 0.23);
        side.castShadow = true;
        cg.add(side);

        // Front fluted corner pilaster
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.84, 12), matAgedBrass);
        col.position.set(sx * 1.05, 1.03, 0.415);
        cg.add(col);
      });

      const waistFloor = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.03, 0.36), matDarkWood);
      waistFloor.position.set(0, 0.615, 0.23);
      cg.add(waistFloor);

      // Rich dark walnut backing inside pendulum chamber so brass pendulum & weight pop vividly
      const chamberGlow = new THREE.Mesh(
        new THREE.PlaneGeometry(0.46, 0.78),
        new THREE.MeshStandardMaterial({
          color: 0x26170e,
          emissive: 0x2a180a,
          emissiveIntensity: 0.08,
          roughness: 0.88
        })
      );
      chamberGlow.position.set(0, 1.03, 0.085);
      cg.add(chamberGlow);

      // 3. Swinging Brass Pendulum (centered inside waist)
      const pendPivot = new THREE.Group();
      pendPivot.position.set(0.05, 1.44, 0.18);
      cg.add(pendPivot);
      this.pendulumPivot = pendPivot;

      const pendRod = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.64, 10), matBrass);
      pendRod.position.y = -0.32;
      pendPivot.add(pendRod);

      const pendBob = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.078, 0.028, 28), matGold);
      pendBob.rotation.x = Math.PI / 2;
      pendBob.position.y = -0.62;
      pendPivot.add(pendBob);

      const pendRim = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.011, 10, 28), matAgedBrass);
      pendRim.position.y = -0.62;
      pendPivot.add(pendRim);

      // 4. Counterweight Chain, Interactive Hook & Cast-Bronze Weight (left side of waist)
      const chainLine = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.34, 8), matAgedBrass);
      chainLine.position.set(-0.11, 1.29, 0.24);
      cg.add(chainLine);

      // Interactive Chain Hook Group
      const hookGroup = new THREE.Group();
      hookGroup.position.set(-0.11, 1.11, 0.24);
      cg.add(hookGroup);

      const hookMat = matGold.clone();
      const hookRing = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 10, 18), hookMat);
      hookGroup.add(hookRing);

      const hookBar = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.04, 8), hookMat);
      hookBar.position.y = -0.026;
      hookGroup.add(hookBar);

      // Generous invisible click area around chain & hook
      const hookHit = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.38, 0.18),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      hookHit.position.set(0, -0.06, 0.02);
      hookGroup.add(hookHit);

      // Cast-Bronze Counterweight Cylinder (visible once clockWeightPlaced === true)
      const weightGroup = new THREE.Group();
      weightGroup.position.set(0, -0.14, 0);
      hookGroup.add(weightGroup);
      this.weightMesh = weightGroup;

      const weightBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.24, 20), matAgedBrass);
      weightGroup.add(weightBody);
      [-0.105, 0.105].forEach(function (ry) {
        const cap = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.008, 8, 20), matGold);
        cap.rotation.x = Math.PI / 2;
        cap.position.y = ry;
        weightGroup.add(cap);
      });
      const weightLoop = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 8, 16), matGold);
      weightLoop.position.y = 0.132;
      weightGroup.add(weightLoop);

      const weightHookCfg = {
        id: 'clock_weight_hook',
        station: 'clockBooks',
        activeViews: ['clock'],
        action: 'Examinar',
        label: 'Cadena del Contrapeso',
        cursor: 'interact',
        highlightTarget: hookRing,
        onClick: function () {
          self.onWeightHookClick();
        }
      };
      this.weightHookObj = hookGroup;
      this.weightHookCfg = weightHookCfg;
      SR.registerInteractive(hookGroup, weightHookCfg);

      // 5. Hinged Glass Pendulum Door (hinged on LEFT at X = -0.25, Z = 0.42)
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-0.25, 1.03, 0.42);
      cg.add(doorPivot);
      this.clockDoorPivot = doorPivot;

      const doorFrameMat = matMahogany.clone();
      const topRail = new THREE.Mesh(makeBox(0.50, 0.055, 0.032, 0.006), doorFrameMat);
      topRail.position.set(0.25, 0.39, 0);
      doorPivot.add(topRail);

      const botRail = new THREE.Mesh(makeBox(0.50, 0.055, 0.032, 0.006), doorFrameMat);
      botRail.position.set(0.25, -0.39, 0);
      doorPivot.add(botRail);

      const leftStile = new THREE.Mesh(makeBox(0.055, 0.83, 0.032, 0.006), doorFrameMat);
      leftStile.position.set(0.028, 0, 0);
      doorPivot.add(leftStile);

      const rightStile = new THREE.Mesh(makeBox(0.055, 0.83, 0.032, 0.006), doorFrameMat);
      rightStile.position.set(0.472, 0, 0);
      doorPivot.add(rightStile);

      const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.39, 0.72), matGlass);
      glassPane.position.set(0.25, 0, 0);
      doorPivot.add(glassPane);

      const doorKnob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), matGold.clone());
      doorKnob.position.set(0.472, 0, 0.034);
      doorPivot.add(doorKnob);

      SR.registerInteractive(doorPivot, {
        id: 'clock_pendulum_door',
        station: 'clockBooks',
        activeViews: ['clock'],
        action: 'Abrir / Cerrar',
        label: 'Puerta de Cristal del Péndulo',
        cursor: 'interact',
        highlightTarget: doorKnob,
        onClick: function () {
          self.onClockDoorClick();
        }
      });

      // 6. Upper Hood, Enamel Dial & Moon Phase Arch (Y: 1.46..2.14)
      const hoodLedge = new THREE.Mesh(makeBox(0.74, 0.055, 0.48, 0.01), matMahogany);
      hoodLedge.position.set(0, 1.465, 0.24);
      cg.add(hoodLedge);

      const hoodBody = new THREE.Mesh(makeBox(0.68, 0.66, 0.43, 0.015), matMahogany);
      hoodBody.position.set(0, 1.81, 0.23);
      hoodBody.castShadow = true;
      cg.add(hoodBody);

      // Decorative brass hood columns
      [-0.31, 0.31].forEach(function (cx) {
        const hCol = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.03, 0.62, 14), matAgedBrass);
        hCol.position.set(cx, 1.81, 0.435);
        cg.add(hCol);
      });

      // Clock Face Enamel Dial (centered at Y = 1.77, Z = 0.452)
      const dialY = 1.77;
      const dialZ = 0.452;
      const dialR = 0.195;

      const dialTex = createClockDialTexture();
      const dialMat = new THREE.MeshStandardMaterial({
        map: dialTex,
        emissiveMap: dialTex,
        emissive: new THREE.Color(0xffe8be),
        emissiveIntensity: 0.05,
        roughness: 0.52,
        metalness: 0.06
      });
      const dialMesh = new THREE.Mesh(new THREE.CircleGeometry(dialR, 48), dialMat);
      dialMesh.position.set(0, dialY, dialZ);
      cg.add(dialMesh);

      const dialBezel = new THREE.Mesh(new THREE.TorusGeometry(dialR + 0.008, 0.018, 12, 48), matGold);
      dialBezel.position.set(0, dialY, dialZ + 0.006);
      cg.add(dialBezel);

      // 3D Clock Hands (Hour & Minute)
      const handMat = new THREE.MeshStandardMaterial({
        color: 0x191c2b,
        emissive: 0x121628,
        emissiveIntensity: 0.15,
        roughness: 0.28,
        metalness: 0.85
      });

      const hourPivot = new THREE.Group();
      hourPivot.position.set(0, dialY, dialZ + 0.012);
      cg.add(hourPivot);
      this.hourHandPivot = hourPivot;

      const hourBlade = new THREE.Mesh(new THREE.BoxGeometry(0.017, 0.108, 0.006), handMat);
      hourBlade.position.y = 0.044;
      hourPivot.add(hourBlade);
      const hourTip = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.032, 4), handMat);
      hourTip.position.y = 0.106;
      hourPivot.add(hourTip);

      const minPivot = new THREE.Group();
      minPivot.position.set(0, dialY, dialZ + 0.019);
      cg.add(minPivot);
      this.minuteHandPivot = minPivot;

      const minBlade = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.152, 0.006), handMat);
      minBlade.position.y = 0.064;
      minPivot.add(minBlade);
      const minTip = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.028, 4), handMat);
      minTip.position.y = 0.148;
      minPivot.add(minTip);

      const centerPin = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 12), matGold);
      centerPin.position.set(0, dialY, dialZ + 0.024);
      cg.add(centerPin);

      // Winding Keyhole Arbor on lower-right quadrant of clock face
      const keyholeGroup = new THREE.Group();
      keyholeGroup.position.set(0.088, dialY - 0.052, dialZ + 0.005);
      cg.add(keyholeGroup);

      const khRingMat = matGold.clone();
      const khRing = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.007, 10, 20), khRingMat);
      keyholeGroup.add(khRing);
      const khHole = new THREE.Mesh(
        new THREE.BoxGeometry(0.018, 0.018, 0.012),
        new THREE.MeshBasicMaterial({ color: 0x09070a })
      );
      keyholeGroup.add(khHole);
      const khHit = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.042, 0.04, 14),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      khHit.rotation.x = Math.PI / 2;
      keyholeGroup.add(khHit);

      const keyholeCfg = {
        id: 'clock_keyhole',
        station: 'clockBooks',
        activeViews: ['clock'],
        action: 'Examinar',
        label: 'Bocallave de Cuerda',
        cursor: 'interact',
        highlightTarget: khRing,
        onClick: function () {
          self.onKeyholeClick();
        }
      };
      this.keyholeCfg = keyholeCfg;
      SR.registerInteractive(keyholeGroup, keyholeCfg);

      // Clickable Brass Studs directly below Clock Dial: HORA (+1h) and MIN (+15m)
      function makeClockStud(xPos, labelText, id, onClickFn) {
        const sg = new THREE.Group();
        sg.position.set(xPos, 1.545, 0.468);
        cg.add(sg);

        const studMat = matGold.clone();
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.034, 18), studMat);
        stud.rotation.x = Math.PI / 2;
        stud.position.y = 0.018;
        sg.add(stud);

        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), studMat);
        cap.scale.set(1, 1, 0.45);
        cap.position.set(0, 0.018, 0.018);
        sg.add(cap);

        const lTex = createSmallButtonLabelTexture(labelText);
        const lMat = new THREE.MeshStandardMaterial({
          map: lTex,
          emissiveMap: lTex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.16,
          roughness: 0.4,
          metalness: 0.45
        });
        const lPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.052), lMat);
        lPlate.position.set(0, -0.028, 0.008);
        sg.add(lPlate);

        const hit = new THREE.Mesh(
          new THREE.BoxGeometry(0.21, 0.11, 0.06),
          new THREE.MeshBasicMaterial({ visible: false })
        );
        sg.add(hit);

        const cfg = {
          id: id,
          station: 'clockBooks',
          activeViews: ['clock'],
          action: 'Ajustar',
          label: labelText,
          cursor: 'interact',
          highlightTarget: stud,
          onClick: onClickFn
        };
        SR.registerInteractive(sg, cfg);
        return cfg;
      }

      this.clockHourCfg = makeClockStud(-0.155, 'HORA +1h', 'clock_btn_hour', function () {
        self.onHourAdjust();
      });
      this.clockMinCfg = makeClockStud(0.155, 'MIN +15m', 'clock_btn_minute', function () {
        self.onMinuteAdjust();
      });

      // Upper Moon Phase Dial (Y = 2.04, Z = 0.452)
      const moonGroup = new THREE.Group();
      moonGroup.position.set(0, 2.045, 0.452);
      cg.add(moonGroup);

      const moonDyn = createDynamicMoonCanvas();
      this.moonDial = moonDyn;

      const moonMat = new THREE.MeshStandardMaterial({
        map: moonDyn.texture,
        emissiveMap: moonDyn.texture,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.12,
        roughness: 0.44,
        metalness: 0.10
      });
      const moonFace = new THREE.Mesh(new THREE.PlaneGeometry(0.40, 0.195), moonMat);
      moonGroup.add(moonFace);

      const moonFrameMat = matGold.clone();
      const moonFrame = new THREE.Mesh(makeBox(0.43, 0.22, 0.025, 0.008), moonFrameMat);
      moonFrame.position.z = -0.014;
      moonGroup.add(moonFrame);

      const clockMoonCfg = {
        id: 'clock_moon_dial',
        station: 'clockBooks',
        activeViews: ['clock'],
        action: 'Cambiar fase',
        label: 'Disco Lunar',
        cursor: 'interact',
        highlightTarget: moonFrame,
        onClick: function () {
          self.onMoonAdjust();
        }
      };
      this.clockMoonCfg = clockMoonCfg;
      SR.registerInteractive(moonGroup, clockMoonCfg);

      // 7. Splitable Top Mahogany Pediment Compartment hiding RELIC 1/3: solar_gear (Y = 2.14..2.48)
      const pedBase = new THREE.Mesh(makeBox(0.72, 0.05, 0.46, 0.01), matAgedBrass);
      pedBase.position.set(0, 2.16, 0.24);
      cg.add(pedBase);

      // Secret interior niche behind splitable pediment
      const nicheBack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.04), matVelvet);
      nicheBack.position.set(0, 2.32, 0.14);
      cg.add(nicheBack);

      // Left & Right sliding mahogany pediment halves
      function buildPedimentHalf(side) {
        const pg = new THREE.Group();
        pg.position.set(side * 0.175, 2.31, 0.30);
        const block = new THREE.Mesh(makeBox(0.35, 0.26, 0.28, 0.018), matMahogany);
        pg.add(block);

        // Decorative sculpted scroll crown on top
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.33, 12), matAgedBrass);
        crown.rotation.z = side * 0.42;
        crown.position.set(side * 0.04, 0.13, 0.02);
        pg.add(crown);

        const finial = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 12), matGold);
        finial.position.set(side * 0.14, 0.18, 0.04);
        pg.add(finial);
        return pg;
      }

      this.pedimentLeft = buildPedimentHalf(-1);
      this.pedimentRight = buildPedimentHalf(1);
      cg.add(this.pedimentLeft);
      cg.add(this.pedimentRight);

      // Golden Relic 1/3: Engranaje Solar (elevates from compartment when solved!)
      const solarGroup = buildSolarGearPickup();
      solarGroup.position.set(0, 2.26, 0.30);
      solarGroup.visible = false;
      cg.add(solarGroup);
      this.solarGearGroup = solarGroup;

      const solarLight = new THREE.PointLight(0xffc955, 0, 2.2, 2);
      solarLight.position.set(0, 2.34, 0.46);
      cg.add(solarLight);
      this.solarLight = solarLight;

      const solarCfg = {
        id: 'clock_pickup_solar_gear',
        station: 'clockBooks',
        activeViews: ['clock'],
        action: 'Recoger Reliquia',
        label: 'Engranaje Solar (Reliquia 1/3)',
        cursor: 'interact',
        highlightTarget: solarGroup.userData.highlightMesh,
        disabled: true,
        onClick: function () {
          self.onPickupSolarGear();
        }
      };
      this.solarGearCfg = solarCfg;
      SR.registerInteractive(solarGroup, solarCfg);

      // Clock Overview Click Zone (active in 'clockBooks' view -> zoom to 'clock')
      const clockFocusHit = new THREE.Mesh(
        new THREE.BoxGeometry(0.76, 2.48, 0.52),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      clockFocusHit.position.set(0, 1.24, 0.26);
      cg.add(clockFocusHit);

      SR.registerInteractive(clockFocusHit, {
        id: 'clock_focus',
        station: 'clockBooks',
        activeViews: ['clockBooks'],
        action: 'Acercar',
        label: 'Reloj Astronómico de Péndulo',
        cursor: 'inspect',
        highlightTarget: dialBezel,
        onClick: function () {
          SR.Camera.goToView('clock');
        }
      });
    },

    // =========================================================================
    // RIGHT HALF (X = +0.62): BOOKCASE & STAR PLATE (Puzzle A1)
    // =========================================================================
    buildBookcase: function (parent) {
      const self = this;
      const bg = new THREE.Group();
      bg.name = 'bookcase_unit';
      bg.position.set(0.62, 0, 0.04);
      parent.add(bg);

      const matMahogany = SR.Materials.get('mahogany');
      const matDarkWood = SR.Materials.get('darkWood');
      const matWalnut = SR.Materials.get('walnut');
      const matBrass = SR.Materials.get('brass');
      const matAgedBrass = SR.Materials.get('agedBrass');
      const matGold = SR.Materials.get('gold');
      const matVelvet = SR.Materials.get('velvet');
      const matParchment = SR.Materials.get('parchment');

      const W = 1.42;
      const H = 2.46;
      const D = 0.40;

      // 1. Mahogany Bookcase Frame
      const backBoard = new THREE.Mesh(new THREE.BoxGeometry(W - 0.06, H - 0.08, 0.04), matWalnut);
      backBoard.position.set(0, H / 2, 0.03);
      bg.add(backBoard);

      [-W / 2 + 0.045, W / 2 - 0.045].forEach(function (sx) {
        const sideWall = new THREE.Mesh(makeBox(0.09, H - 0.14, D, 0.01), matMahogany);
        sideWall.position.set(sx, H / 2, D / 2);
        sideWall.castShadow = true;
        sideWall.receiveShadow = true;
        bg.add(sideWall);

        // Front decorative brass trim inlay
        const trim = new THREE.Mesh(new THREE.BoxGeometry(0.022, H - 0.34, 0.015), matAgedBrass);
        trim.position.set(sx, H / 2, D + 0.006);
        bg.add(trim);
      });

      // Plinth & Crown Cornice
      const plinth = new THREE.Mesh(makeBox(W + 0.06, 0.14, D + 0.05, 0.015), matDarkWood);
      plinth.position.set(0, 0.07, D / 2 + 0.02);
      plinth.receiveShadow = true;
      bg.add(plinth);

      const crown = new THREE.Mesh(makeBox(W + 0.10, 0.14, D + 0.08, 0.018), matMahogany);
      crown.position.set(0, H - 0.04, D / 2 + 0.03);
      crown.castShadow = true;
      bg.add(crown);

      const crownGold = new THREE.Mesh(new THREE.BoxGeometry(W + 0.02, 0.024, 0.02), matAgedBrass);
      crownGold.position.set(0, H - 0.11, D + 0.04);
      bg.add(crownGold);

      // Horizontal Shelves at Y = 0.74, 1.15, 1.60, 2.02
      [0.74, 1.15, 1.60, 2.02].forEach(function (sy) {
        const shelf = new THREE.Mesh(makeBox(W - 0.14, 0.042, D - 0.02, 0.006), matMahogany);
        shelf.position.set(0, sy, D / 2);
        shelf.receiveShadow = true;
        bg.add(shelf);

        const edge = new THREE.Mesh(new THREE.BoxGeometry(W - 0.16, 0.012, 0.012), matAgedBrass);
        edge.position.set(0, sy, D);
        bg.add(edge);
      });

      // 2. Decorative Atmospheric Books on Top & Bottom Shelves
      const decorColors = ['leatherRed', 'leatherGreen', 'leatherBlue', 'leatherBrown', 'leatherPurple'];
      function fillDecorRow(yBase, xMin, xMax, seed) {
        let curX = xMin;
        let idx = seed;
        while (curX < xMax - 0.06) {
          const bw = 0.045 + ((idx * 17) % 5) * 0.008;
          const bh = 0.24 + ((idx * 23) % 7) * 0.016;
          if (curX + bw > xMax) break;
          const mat = SR.Materials.get(decorColors[idx % decorColors.length]);
          const b = new THREE.Mesh(makeBox(bw, bh, 0.24, 0.005), mat);
          b.position.set(curX + bw / 2, yBase + bh / 2, 0.22);
          bg.add(b);
          curX += bw + 0.006;
          idx++;
        }
      }
      fillDecorRow(2.042, -0.60, 0.30, 3);
      fillDecorRow(0.142, -0.60, 0.58, 11);

      // Decorative brass celestial globe & scroll on top right shelf
      const miniStand = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.04, 14), matAgedBrass);
      miniStand.position.set(0.46, 2.062, 0.22);
      bg.add(miniStand);
      const miniGlobe = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), matAgedBrass);
      miniGlobe.position.set(0.46, 2.18, 0.22);
      bg.add(miniGlobe);
      const miniRing = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.008, 8, 24), matGold);
      miniRing.position.set(0.46, 2.18, 0.22);
      miniRing.rotation.x = 0.55;
      bg.add(miniRing);

      // 3. Brass Placa de Observaciones (1894) in Bay Y = 1.62..2.00
      const plateTex = createStarPlateTexture();
      const plateMat = new THREE.MeshStandardMaterial({
        map: plateTex,
        emissiveMap: plateTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.08,
        roughness: 0.48,
        metalness: 0.38
      });
      const plateBacking = new THREE.Mesh(makeBox(1.18, 0.34, 0.028, 0.008), matAgedBrass.clone());
      plateBacking.position.set(0, 1.81, 0.32);
      bg.add(plateBacking);

      const plateFace = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.315), plateMat);
      plateFace.position.set(0, 0, 0.018);
      plateBacking.add(plateFace);

      SR.registerInteractive(plateBacking, {
        id: 'books_star_plate',
        station: 'clockBooks',
        activeViews: ['books'],
        action: 'Leer placa',
        label: 'Placa de Observaciones (1894)',
        cursor: 'inspect',
        highlightTarget: plateBacking,
        onClick: function () {
          if (SR.Audio) SR.Audio.playClick(1.1);
          SR.State.unlockJournal('star_plate');
          if (SR.UI) SR.UI.say('Has registrado la Placa de Observaciones (1894) en tu Diario.');
          if (SR.Journal && SR.Journal.open) SR.Journal.open('star_plate');
        }
      });

      // 4. Main Interactive Shelf (Y = 1.17..1.57): 5 Prominent Gilded Planetary Books
      // Flanking static decorative bookends & volumes
      [-0.54, 0.54].forEach(function (bx) {
        const endBook = new THREE.Mesh(makeBox(0.11, 0.31, 0.25, 0.008), matDarkWood);
        endBook.position.set(bx, 1.325, 0.22);
        bg.add(endBook);
        const bookend = new THREE.Mesh(makeBox(0.032, 0.16, 0.18, 0.006), matAgedBrass);
        bookend.position.set(bx + (bx < 0 ? 0.08 : -0.08), 1.25, 0.24);
        bg.add(bookend);
      });

      this.bookItems = {};
      const bookSpacing = 0.172;
      const startX = -bookSpacing * 2;
      const bookW = 0.145;
      const bookH = 0.355;
      const bookD = 0.27;
      const restZ = 0.255;

      PLANET_BOOKS.forEach(function (spec, idx) {
        const bookGroup = new THREE.Group();
        bookGroup.position.set(startX + idx * bookSpacing, 1.172 + bookH / 2, restZ);
        bg.add(bookGroup);

        const spineTex = createBookSpineTexture(spec);
        const spineMat = new THREE.MeshStandardMaterial({
          map: spineTex,
          emissiveMap: spineTex,
          emissive: new THREE.Color(0xfff0cc),
          emissiveIntensity: 0.15,
          roughness: 0.58,
          metalness: 0.18
        });

        const coverMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(spec.color),
          roughness: 0.72,
          metalness: 0.08
        });

        // Multi-part book: leather covers + creamy page block + crisp Canvas2D spine
        const pages = new THREE.Mesh(new THREE.BoxGeometry(bookW - 0.018, bookH - 0.018, bookD - 0.016), matParchment);
        pages.position.z = -0.004;
        bookGroup.add(pages);

        const leftCover = new THREE.Mesh(new THREE.BoxGeometry(0.014, bookH, bookD), coverMat);
        leftCover.position.x = -bookW / 2 + 0.007;
        bookGroup.add(leftCover);

        const rightCover = new THREE.Mesh(new THREE.BoxGeometry(0.014, bookH, bookD), coverMat);
        rightCover.position.x = bookW / 2 - 0.007;
        bookGroup.add(rightCover);

        // Front spine block with Canvas2D artwork facing +Z
        const spineBox = new THREE.Mesh(makeBox(bookW, bookH, 0.022, 0.005), coverMat);
        spineBox.position.z = bookD / 2 - 0.008;
        bookGroup.add(spineBox);

        const spineFace = new THREE.Mesh(new THREE.PlaneGeometry(bookW - 0.006, bookH - 0.006), spineMat);
        spineFace.position.z = bookD / 2 + 0.005;
        bookGroup.add(spineFace);

        const item = {
          spec: spec,
          group: bookGroup,
          spineMat: spineMat,
          restZ: restZ,
          pulledZ: restZ + 0.135,
          currentZ: restZ,
          targetZ: restZ
        };
        self.bookItems[spec.id] = item;

        SR.registerInteractive(bookGroup, {
          id: spec.interactiveId,
          station: 'clockBooks',
          activeViews: ['books'],
          action: 'Tirar tomo',
          label: 'Tomo ' + spec.roman + ' (' + spec.glyph + ')',
          cursor: 'interact',
          highlightTarget: spineFace,
          onClick: function () {
            self.onBookClick(spec);
          }
        });
      });

      // 5. Secret Alcove Compartment (Y = 0.76..1.13) hidden behind sliding mahogany doors
      const alcoveBack = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.34, 0.03), matVelvet);
      alcoveBack.position.set(0, 0.945, 0.08);
      bg.add(alcoveBack);

      const alcoveFloor = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.02, 0.30), matVelvet);
      alcoveFloor.position.set(0, 0.772, 0.22);
      bg.add(alcoveFloor);

      // Left & Right sliding secret wood panels
      function makeAlcovePanel(side) {
        const pg = new THREE.Group();
        pg.position.set(side * 0.295, 0.945, 0.36);
        const slab = new THREE.Mesh(makeBox(0.59, 0.345, 0.03, 0.006), matMahogany);
        pg.add(slab);
        const inlay = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.24, 0.012), matWalnut);
        inlay.position.z = 0.014;
        pg.add(inlay);
        const brassLine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.28, 0.016), matAgedBrass);
        brassLine.position.set(-side * 0.26, 0, 0.016);
        pg.add(brassLine);
        return pg;
      }

      this.alcoveLeftDoor = makeAlcovePanel(-1);
      this.alcoveRightDoor = makeAlcovePanel(1);
      bg.add(this.alcoveLeftDoor);
      bg.add(this.alcoveRightDoor);

      const alcoveLight = new THREE.PointLight(0xffcf70, 0, 1.5, 2);
      alcoveLight.position.set(0, 1.04, 0.32);
      bg.add(alcoveLight);
      this.alcoveLight = alcoveLight;

      // Pickup 1: Llave de Cuerda (clock_key) resting on left side of alcove
      const keyPickup = buildClockKeyPickup();
      keyPickup.position.set(-0.22, 0.84, 0.24);
      keyPickup.rotation.x = -0.35;
      keyPickup.rotation.z = 0.12;
      keyPickup.visible = false;
      bg.add(keyPickup);
      this.keyPickup = keyPickup;

      const keyPickupCfg = {
        id: 'books_pickup_clock_key',
        station: 'clockBooks',
        activeViews: ['books'],
        action: 'Recoger',
        label: 'Llave de Cuerda',
        cursor: 'interact',
        highlightTarget: keyPickup.userData.highlightMesh,
        disabled: true,
        onClick: function () {
          self.onPickupClockKey();
        }
      };
      this.keyPickupCfg = keyPickupCfg;
      SR.registerInteractive(keyPickup, keyPickupCfg);

      // Pickup 2: Volante de Válvula (valve_wheel) resting on right side of alcove
      const wheelPickup = buildValveWheelPickup();
      wheelPickup.position.set(0.22, 0.88, 0.24);
      wheelPickup.rotation.x = -0.32;
      wheelPickup.visible = false;
      bg.add(wheelPickup);
      this.wheelPickup = wheelPickup;

      const wheelPickupCfg = {
        id: 'books_pickup_valve_wheel',
        station: 'clockBooks',
        activeViews: ['books'],
        action: 'Recoger',
        label: 'Volante de Válvula',
        cursor: 'interact',
        highlightTarget: wheelPickup.userData.highlightMesh,
        disabled: true,
        onClick: function () {
          self.onPickupValveWheel();
        }
      };
      this.wheelPickupCfg = wheelPickupCfg;
      SR.registerInteractive(wheelPickup, wheelPickupCfg);

      // Bookcase Overview Click Zone (active in 'clockBooks' view -> zoom to 'books')
      const booksFocusHit = new THREE.Mesh(
        new THREE.BoxGeometry(1.44, 2.46, 0.48),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      booksFocusHit.position.set(0, 1.23, 0.24);
      bg.add(booksFocusHit);

      SR.registerInteractive(booksFocusHit, {
        id: 'books_focus',
        station: 'clockBooks',
        activeViews: ['clockBooks'],
        action: 'Acercar',
        label: 'Estantería de Grimorios',
        cursor: 'inspect',
        highlightTarget: plateBacking,
        onClick: function () {
          SR.Camera.goToView('books');
        }
      });
    },

    // =========================================================================
    // INTERACTION HANDLERS — CLOCK (Puzzle A3)
    // =========================================================================

    refreshInteractiveMeta: function () {
      const s = SR.State.data;
      const sel = s.selectedItem;
      const timeStr = formatTime(s.clockHour, s.clockMinute);
      const moonStr = MOON_PHASE_NAMES[s.clockMoonPhase] || MOON_PHASE_NAMES[0];

      // Weight hook
      if (s.clockWeightPlaced) {
        updateInteractive('clock_weight_hook', this.weightHookCfg, {
          action: 'Instalada',
          label: 'Pesa de Bronce colgada',
          cursor: 'interact'
        });
      } else if (sel === 'clock_weight') {
        updateInteractive('clock_weight_hook', this.weightHookCfg, {
          action: 'Colgar',
          label: 'Colgar Pesa de Bronce',
          cursor: 'use'
        });
      } else {
        updateInteractive('clock_weight_hook', this.weightHookCfg, {
          action: 'Examinar',
          label: 'Gancho de cadena vacío',
          cursor: 'interact'
        });
      }

      // Keyhole
      if (s.clockWound) {
        updateInteractive('clock_keyhole', this.keyholeCfg, {
          action: 'Con cuerda',
          label: 'Mecanismo cargado',
          cursor: 'interact'
        });
      } else if (sel === 'clock_key') {
        updateInteractive('clock_keyhole', this.keyholeCfg, {
          action: 'Dar cuerda',
          label: 'Usar Llave de Cuerda',
          cursor: 'use'
        });
      } else {
        updateInteractive('clock_keyhole', this.keyholeCfg, {
          action: 'Examinar',
          label: 'Bocallave de cuerda',
          cursor: 'interact'
        });
      }

      // Dials
      updateInteractive('clock_btn_hour', this.clockHourCfg, {
        label: 'Botón Hora +1h (Actual: ' + timeStr + ')'
      });
      updateInteractive('clock_btn_minute', this.clockMinCfg, {
        label: 'Botón Minutos +15m (Actual: ' + timeStr + ')'
      });
      updateInteractive('clock_moon_dial', this.clockMoonCfg, {
        label: 'Disco Lunar (' + moonStr + ')'
      });

      // Pickups visibility & enabled state
      const showSolar = !!(s.clockSolved && !s.solarGearTaken);
      if (this.solarGearGroup) this.solarGearGroup.visible = showSolar;
      updateInteractive('clock_pickup_solar_gear', this.solarGearCfg, { disabled: !showSolar });

      const showKey = !!(s.booksSolved && !s.alcoveKeyTaken);
      if (this.keyPickup) this.keyPickup.visible = showKey;
      updateInteractive('books_pickup_clock_key', this.keyPickupCfg, { disabled: !showKey });

      const showWheel = !!(s.booksSolved && !s.alcoveWheelTaken);
      if (this.wheelPickup) this.wheelPickup.visible = showWheel;
      updateInteractive('books_pickup_valve_wheel', this.wheelPickupCfg, { disabled: !showWheel });
    },

    onClockDoorClick: function () {
      const s = SR.State.data;
      s.clockDoorOpen = !s.clockDoorOpen;
      if (SR.Audio) SR.Audio.playClick(s.clockDoorOpen ? 0.92 : 0.78);
      SR.State.save();
      if (SR.UI) {
        SR.UI.say(s.clockDoorOpen
          ? 'Abres la puerta de cristal del péndulo.'
          : 'Cierras la puerta de cristal del péndulo.', 2400);
      }
    },

    onWeightHookClick: function () {
      const s = SR.State.data;
      if (!s.clockDoorOpen) {
        if (SR.Audio) SR.Audio.playClick(0.7);
        if (SR.UI) SR.UI.say('Debes abrir primero la puerta de cristal del péndulo.');
        return;
      }
      if (s.clockWeightPlaced) {
        if (SR.UI) SR.UI.say('La Pesa de Bronce ya cuelga firmemente de la cadena.');
        return;
      }
      if (s.selectedItem === 'clock_weight') {
        SR.State.removeItem('clock_weight');
        s.clockWeightPlaced = true;
        if (this.weightMesh) this.weightMesh.visible = true;
        if (SR.Audio) SR.Audio.playGear(0.88);
        if (s.clockWound && SR.Audio) SR.Audio.startClockTick();
        SR.State.save();
        this.refreshInteractiveMeta();

        if (!this.checkClockSolve()) {
          if (SR.UI) {
            SR.UI.say(s.clockWound
              ? '¡Has colgado la Pesa de Bronce! El péndulo cobra vida con un tictac constante.'
              : 'Has colgado la Pesa de Bronce en la cadena. Aún hace falta dar cuerda al reloj.');
          }
        }
      } else {
        if (SR.Audio) SR.Audio.playClick(0.72);
        if (SR.UI) SR.UI.say('La cadena de latón cuelga vacía. Necesita un contrapeso de bronce para impulsar el péndulo.');
      }
    },

    onKeyholeClick: function () {
      const s = SR.State.data;
      if (s.clockWound) {
        if (SR.UI) SR.UI.say('El muelle principal ya tiene toda su cuerda.');
        return;
      }
      if (s.selectedItem === 'clock_key') {
        SR.State.removeItem('clock_key');
        s.clockWound = true;
        if (SR.Audio) SR.Audio.playGear(1.18);
        if (s.clockWeightPlaced && SR.Audio) SR.Audio.startClockTick();
        SR.State.save();
        this.refreshInteractiveMeta();

        if (!this.checkClockSolve()) {
          if (SR.UI) {
            SR.UI.say(s.clockWeightPlaced
              ? 'Has dado cuerda al mecanismo. ¡El péndulo oscila ahora a pleno ritmo!'
              : 'Has dado cuerda al mecanismo principal, pero sin contrapeso el péndulo sigue detenido.');
          }
        }
      } else {
        if (SR.Audio) SR.Audio.playClick(0.72);
        if (SR.UI) SR.UI.say('La bocallave cuadrada de la esfera requiere una llave de cuerda de horología.');
      }
    },

    onHourAdjust: function () {
      const s = SR.State.data;
      if (s.clockSolved) {
        if (SR.UI) SR.UI.say('El reloj ya ha revelado su compartimento secreto.');
        return;
      }
      s.clockHour = (s.clockHour % 12) + 1;
      if (SR.Audio) SR.Audio.playClick(1.0);
      SR.State.save();
      this.refreshInteractiveMeta();
      if (!this.checkClockSolve() && SR.UI) {
        SR.UI.say('Hora: ' + formatTime(s.clockHour, s.clockMinute) + ' — Fase: ' + MOON_PHASE_NAMES[s.clockMoonPhase], 2800);
      }
    },

    onMinuteAdjust: function () {
      const s = SR.State.data;
      if (s.clockSolved) {
        if (SR.UI) SR.UI.say('El reloj ya ha revelado su compartimento secreto.');
        return;
      }
      s.clockMinute = (s.clockMinute + 15) % 60;
      if (SR.Audio) SR.Audio.playClick(1.18);
      SR.State.save();
      this.refreshInteractiveMeta();
      if (!this.checkClockSolve() && SR.UI) {
        SR.UI.say('Hora: ' + formatTime(s.clockHour, s.clockMinute) + ' — Fase: ' + MOON_PHASE_NAMES[s.clockMoonPhase], 2800);
      }
    },

    onMoonAdjust: function () {
      const s = SR.State.data;
      if (s.clockSolved) {
        if (SR.UI) SR.UI.say('El reloj ya marca la fase exacta del Eclipse.');
        return;
      }
      s.clockMoonPhase = (s.clockMoonPhase + 1) % 4;
      if (this.moonDial) this.moonDial.draw(s.clockMoonPhase);
      if (SR.Audio) SR.Audio.playGear(1.3);
      SR.State.save();
      this.refreshInteractiveMeta();
      if (!this.checkClockSolve() && SR.UI) {
        SR.UI.say('Hora: ' + formatTime(s.clockHour, s.clockMinute) + ' — Fase: ' + MOON_PHASE_NAMES[s.clockMoonPhase], 2800);
      }
    },

    checkClockSolve: function () {
      const s = SR.State.data;
      if (s.clockSolved) return false;
      if (s.clockWeightPlaced && s.clockWound && s.clockHour === 8 && s.clockMinute === 15 && s.clockMoonPhase === 2) {
        s.clockSolved = true;
        SR.State.save();
        if (SR.Audio) {
          SR.Audio.playClockBell();
          SR.Audio.playSolve();
        }
        this.refreshInteractiveMeta();
        if (SR.UI) {
          SR.UI.say('¡Suenan las campanadas del Eclipse! El frontón superior del reloj se abre revelando el Engranaje Solar.');
        }
        return true;
      }
      return false;
    },

    onPickupSolarGear: function () {
      const s = SR.State.data;
      if (!s.clockSolved || s.solarGearTaken) return;
      s.solarGearTaken = true;
      SR.State.addItem('solar_gear');
      if (SR.Audio) SR.Audio.playPickup();
      this.refreshInteractiveMeta();
      if (SR.UI) {
        SR.UI.say('¡Has obtenido la primera Reliquia del Eclipse: el Engranaje Solar! Pertenece al engaste izquierdo de la Puerta.');
      }
    },

    // =========================================================================
    // INTERACTION HANDLERS — BOOKCASE (Puzzle A1)
    // =========================================================================

    onBookClick: function (spec) {
      const self = this;
      const s = SR.State.data;

      if (s.booksSolved) {
        if (SR.UI) SR.UI.say('Los cuatro tomos ya están trabados y el compartimento inferior está abierto.');
        return;
      }
      if (this.booksResetTimer) return;

      if (s.booksPulled.includes(spec.id)) {
        if (SR.UI) SR.UI.say('El tomo ' + spec.roman + ' (' + spec.glyph + ') ya está encajado.');
        return;
      }

      const expected = BOOK_TARGET[s.booksPulled.length];
      if (spec.id === expected) {
        s.booksPulled.push(spec.id);
        const item = this.bookItems[spec.id];
        if (item) item.targetZ = item.pulledZ;
        if (SR.Audio) SR.Audio.playBookLatch(0.92 + s.booksPulled.length * 0.11);
        SR.State.save();

        if (s.booksPulled.length === BOOK_TARGET.length) {
          s.booksSolved = true;
          SR.State.save();
          if (SR.Audio) {
            SR.Audio.playSolve();
            SR.Audio.playDrawer();
          }
          this.refreshInteractiveMeta();
          if (SR.UI) {
            SR.UI.say('¡La Secuencia de Sombras encaja a la perfección! Un panel secreto bajo los libros se desliza revelando dos piezas.');
          }
        } else {
          if (SR.UI) {
            SR.UI.say('El tomo ' + spec.roman + ' (' + spec.glyph + ') queda retenido por un pestillo metálico (' + s.booksPulled.length + '/4).', 2800);
          }
        }
      } else {
        // Wrong book: briefly nudge outward, then snap all back with error sound
        const wrongItem = this.bookItems[spec.id];
        if (wrongItem) wrongItem.targetZ = wrongItem.restZ + 0.085;
        if (SR.Audio) SR.Audio.playError();
        s.booksPulled = [];
        SR.State.save();

        if (SR.UI) {
          SR.UI.say('Un resorte rechaza la secuencia y los tomos regresan a su sitio. Revisa el Diario del escritorio y la Placa superior.');
        }

        this.booksResetTimer = setTimeout(function () {
          self.booksResetTimer = null;
          Object.keys(self.bookItems).forEach(function (k) {
            self.bookItems[k].targetZ = self.bookItems[k].restZ;
          });
        }, 300);
      }
    },

    onPickupClockKey: function () {
      const s = SR.State.data;
      if (!s.booksSolved || s.alcoveKeyTaken) return;
      s.alcoveKeyTaken = true;
      SR.State.addItem('clock_key');
      if (SR.Audio) SR.Audio.playPickup();
      this.refreshInteractiveMeta();
      if (SR.UI) SR.UI.say('Has recogido la Llave de Cuerda de latón. Encajará en el mecanismo del reloj.');
    },

    onPickupValveWheel: function () {
      const s = SR.State.data;
      if (!s.booksSolved || s.alcoveWheelTaken) return;
      s.alcoveWheelTaken = true;
      SR.State.addItem('valve_wheel');
      if (SR.Audio) SR.Audio.playPickup();
      this.refreshInteractiveMeta();
      if (SR.UI) SR.UI.say('Has recogido un Volante de Válvula. Parece faltar una rueda igual en la consola de presión.');
    },

    // =========================================================================
    // STATE SYNC & FRAME UPDATE
    // =========================================================================

    syncFromState: function () {
      const s = SR.State.data;
      if (this.booksResetTimer) {
        clearTimeout(this.booksResetTimer);
        this.booksResetTimer = null;
      }

      // Clock door & counterweight
      this.clockDoorAngle = s.clockDoorOpen ? -1.65 : 0;
      if (this.clockDoorPivot) this.clockDoorPivot.rotation.y = this.clockDoorAngle;
      if (this.weightMesh) this.weightMesh.visible = !!s.clockWeightPlaced;

      // Clock hands instant snap
      this.minuteHandAngle = -(s.clockMinute / 60) * TWO_PI;
      this.hourHandAngle = -(((s.clockHour % 12) + s.clockMinute / 60) / 12) * TWO_PI;
      if (this.minuteHandPivot) this.minuteHandPivot.rotation.z = this.minuteHandAngle;
      if (this.hourHandPivot) this.hourHandPivot.rotation.z = this.hourHandAngle;

      // Moon phase dial redraw
      if (this.moonDial) this.moonDial.draw(s.clockMoonPhase || 0);

      // Clock tick audio sync
      if (SR.Audio) {
        if (s.clockWeightPlaced && s.clockWound) SR.Audio.startClockTick();
        else SR.Audio.stopClockTick();
      }

      // Pediment & Solar Gear
      this.pedimentOpen = s.clockSolved ? 1 : 0;
      this.applyPedimentPose(this.pedimentOpen);

      // Books Z positions
      const pulled = s.booksSolved ? BOOK_TARGET : (s.booksPulled || []);
      Object.keys(this.bookItems).forEach(function (k) {
        const item = ClockBooksStation.bookItems[k];
        const isOut = pulled.includes(k);
        item.targetZ = isOut ? item.pulledZ : item.restZ;
        item.currentZ = item.targetZ;
        item.group.position.z = item.currentZ;
      });

      // Secret Alcove doors
      this.alcoveOpen = s.booksSolved ? 1 : 0;
      this.applyAlcovePose(this.alcoveOpen);

      this.refreshInteractiveMeta();
    },

    applyPedimentPose: function (t) {
      const ease = t * t * (3 - 2 * t);
      if (this.pedimentLeft) this.pedimentLeft.position.x = -0.175 - ease * 0.25;
      if (this.pedimentRight) this.pedimentRight.position.x = 0.175 + ease * 0.25;
      if (this.solarGearGroup) this.solarGearGroup.position.y = 2.25 + ease * 0.08;
      if (this.solarLight) this.solarLight.intensity = ease * (SR.State.data.solarGearTaken ? 0.35 : 2.1);
    },

    applyAlcovePose: function (t) {
      const ease = t * t * (3 - 2 * t);
      // Slide halves cleanly within bookcase inner side walls
      if (this.alcoveLeftDoor) {
        this.alcoveLeftDoor.position.x = -0.295 - ease * 0.25;
        this.alcoveLeftDoor.scale.x = 1 - ease * 0.66;
      }
      if (this.alcoveRightDoor) {
        this.alcoveRightDoor.position.x = 0.295 + ease * 0.25;
        this.alcoveRightDoor.scale.x = 1 - ease * 0.66;
      }
      if (this.alcoveLight) this.alcoveLight.intensity = ease * 1.35;
    },

    update: function (dt, elapsed) {
      const s = SR.State.data;
      const lerpFast = Math.min(1, dt * 8.5);
      const lerpMed = Math.min(1, dt * 5.0);

      // 1. Glass Pendulum Door swing
      const targetDoor = s.clockDoorOpen ? -1.65 : 0;
      this.clockDoorAngle += (targetDoor - this.clockDoorAngle) * lerpMed;
      if (this.clockDoorPivot) this.clockDoorPivot.rotation.y = this.clockDoorAngle;

      // 2. Pendulum smooth oscillation (only when BOTH counterweight placed & clock wound)
      if (this.pendulumPivot) {
        const running = !!(s.clockWeightPlaced && s.clockWound);
        const targetPend = running ? Math.sin(elapsed * Math.PI) * 0.145 : 0;
        this.pendulumPivot.rotation.z += (targetPend - this.pendulumPivot.rotation.z) * Math.min(1, dt * 10);
      }

      // 3. Clock Hands smooth rotation (shortest angle path)
      const targetMin = -(s.clockMinute / 60) * TWO_PI;
      const targetHour = -(((s.clockHour % 12) + s.clockMinute / 60) / 12) * TWO_PI;

      function lerpAngle(cur, tgt, f) {
        let diff = tgt - cur;
        while (diff > Math.PI) diff -= TWO_PI;
        while (diff < -Math.PI) diff += TWO_PI;
        return cur + diff * f;
      }

      this.minuteHandAngle = lerpAngle(this.minuteHandAngle, targetMin, lerpFast);
      this.hourHandAngle = lerpAngle(this.hourHandAngle, targetHour, lerpFast);
      if (this.minuteHandPivot) this.minuteHandPivot.rotation.z = this.minuteHandAngle;
      if (this.hourHandPivot) this.hourHandPivot.rotation.z = this.hourHandAngle;

      // 4. Splitable Pediment & Solar Gear spin
      const pedTarget = s.clockSolved ? 1 : 0;
      if (Math.abs(pedTarget - this.pedimentOpen) > 0.001) {
        this.pedimentOpen += (pedTarget - this.pedimentOpen) * Math.min(1, dt * 2.8);
        this.applyPedimentPose(this.pedimentOpen);
      }
      if (this.solarGearGroup && this.solarGearGroup.visible) {
        this.solarGearGroup.rotation.z = elapsed * 0.75;
      }

      // 5. Interactive Books pull/push slide
      const keys = Object.keys(this.bookItems);
      for (let i = 0; i < keys.length; i++) {
        const item = this.bookItems[keys[i]];
        item.currentZ += (item.targetZ - item.currentZ) * lerpFast;
        item.group.position.z = item.currentZ;
      }

      // 6. Secret Alcove doors slide
      const alcTarget = s.booksSolved ? 1 : 0;
      if (Math.abs(alcTarget - this.alcoveOpen) > 0.001) {
        this.alcoveOpen += (alcTarget - this.alcoveOpen) * Math.min(1, dt * 3.0);
        this.applyAlcovePose(this.alcoveOpen);
      }
    }
  };

  SR.Stations.clockBooks = ClockBooksStation;
})(window.SR = window.SR || {});
