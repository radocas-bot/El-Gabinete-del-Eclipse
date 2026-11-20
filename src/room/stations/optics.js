/* ==========================================================================
   src/room/stations/optics.js — Wall 180° (South): La Mesa de Óptica y Prismas
   Puzzles C1 (Linterna de Cobalto / UV Star Map) & C2 (Mesa de Óptica 5×5)
   ========================================================================== */
(function (SR) {
  'use strict';

  const GRID_SIZE = 5;
  const CELL_PITCH = 0.185;
  const BENCH_CENTER_X = 0.16;
  const BENCH_CENTER_Z = 0.64;
  const TABLE_TOP_Y = 0.84;
  const BEAM_Y = TABLE_TOP_Y + 0.095;

  const BEAM_COLORS = {
    gold: { core: 0xfff8cc, mid: 0xffd24d, glow: 0xffa818, light: 0xffc84a },
    red:  { core: 0xffd2d8, mid: 0xff334b, glow: 0xff0d2e, light: 0xff334b },
    blue: { core: 0xd8f5ff, mid: 0x3ebaff, glow: 0x0a84ff, light: 0x3ea8ff }
  };

  // Exact 5x5 layout matching SR.State.data.opticsNodes
  const PILLARS = [
    { col: 2, row: 0 },
    { col: 4, row: 1 },
    { col: 3, row: 3 }
  ];

  const FILTERS = [
    { col: 3, row: 2, color: 'red',  label: 'Filtro de Rubí (Rojo)' },
    { col: 1, row: 3, color: 'blue', label: 'Filtro de Zafiro (Azul)' }
  ];

  const RECEPTORS = [
    { key: 'amber',    col: 4, row: 0, color: 'gold', name: 'Receptor Ámbar (Oro)' },
    { key: 'ruby',     col: 4, row: 2, color: 'red',  name: 'Receptor Rubí (Rojo)' },
    { key: 'sapphire', col: 2, row: 4, color: 'blue', name: 'Receptor Zafiro (Azul)' }
  ];

  const ROTATABLE_DEFS = [
    { key: 's1',  col: 1, row: 2, type: 'splitter', name: 'Divisor Semirreflectante Central' },
    { key: 's2',  col: 2, row: 2, type: 'socket',   name: 'Zócalo de Cristal Divisor' },
    { key: 'm11', col: 1, row: 1, type: 'mirror',   name: 'Espejo Orientable (B2)' },
    { key: 'm31', col: 3, row: 1, type: 'mirror',   name: 'Espejo Orientable (D2)' },
    { key: 'm30', col: 3, row: 0, type: 'mirror',   name: 'Espejo Orientable (D1)' },
    { key: 'm23', col: 2, row: 3, type: 'mirror',   name: 'Espejo Orientable (C4)' },
    { key: 'm03', col: 0, row: 3, type: 'mirror',   name: 'Espejo Orientable (A4)' },
    { key: 'm04', col: 0, row: 4, type: 'mirror',   name: 'Espejo Orientable (A5)' },
    { key: 'm10', col: 1, row: 0, type: 'mirror',   name: 'Espejo Orientable (B1)' },
    { key: 'm34', col: 3, row: 4, type: 'mirror',   name: 'Espejo Orientable (D5)' }
  ];

  const ORIENTATION_NAMES = ['Horizontal (—)', 'Diagonal (/)', 'Vertical (|)', 'Diagonal (\\)'];

  // Crisp custom vector astronomical glyphs so Canvas2D never depends on system symbol fonts
  function drawAstroGlyph(ctx, sym, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (sym) {
      case 'mercury': // ☿
        ctx.arc(0, -r * 0.08, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -r * 0.72, r * 0.34, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(0, r * 0.34);
        ctx.lineTo(0, r * 0.96);
        ctx.moveTo(-r * 0.36, r * 0.66);
        ctx.lineTo(r * 0.36, r * 0.66);
        ctx.stroke();
        break;
      case 'venus': // ♀
        ctx.arc(0, -r * 0.25, r * 0.46, 0, Math.PI * 2);
        ctx.moveTo(0, r * 0.21);
        ctx.lineTo(0, r * 0.96);
        ctx.moveTo(-r * 0.38, r * 0.62);
        ctx.lineTo(r * 0.38, r * 0.62);
        ctx.stroke();
        break;
      case 'mars': // ♂
        ctx.arc(-r * 0.14, r * 0.18, r * 0.44, 0, Math.PI * 2);
        ctx.moveTo(r * 0.17, -r * 0.13);
        ctx.lineTo(r * 0.74, -r * 0.70);
        ctx.moveTo(r * 0.30, -r * 0.70);
        ctx.lineTo(r * 0.74, -r * 0.70);
        ctx.lineTo(r * 0.74, -r * 0.26);
        ctx.stroke();
        break;
      case 'saturn': // ♄
        ctx.moveTo(-r * 0.42, -r * 0.56);
        ctx.lineTo(r * 0.14, -r * 0.56);
        ctx.moveTo(-r * 0.16, -r * 0.88);
        ctx.lineTo(-r * 0.16, r * 0.68);
        ctx.moveTo(-r * 0.16, -r * 0.05);
        ctx.bezierCurveTo(r * 0.52, -r * 0.38, r * 0.66, r * 0.32, r * 0.18, r * 0.68);
        ctx.quadraticCurveTo(r * 0.06, r * 0.86, r * 0.42, r * 0.92);
        ctx.stroke();
        break;
      case 'aries': // ♈
        ctx.moveTo(0, r * 0.85);
        ctx.lineTo(0, -r * 0.22);
        ctx.bezierCurveTo(0, -r * 0.92, -r * 0.88, -r * 0.92, -r * 0.74, -r * 0.20);
        ctx.moveTo(0, -r * 0.22);
        ctx.bezierCurveTo(0, -r * 0.92, r * 0.88, -r * 0.92, r * 0.74, -r * 0.20);
        ctx.stroke();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function cellToLocal(col, row) {
    return {
      x: BENCH_CENTER_X + (col - 2) * CELL_PITCH,
      z: BENCH_CENTER_Z + (row - 2) * CELL_PITCH
    };
  }

  function localToWorldArr(group, x, y, z) {
    group.updateMatrixWorld(true);
    const v = new THREE.Vector3(x, y, z);
    group.localToWorld(v);
    return [v.x, v.y, v.z];
  }

  function makeHitboxMat() {
    return new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      colorWrite: false
    });
  }

  function createStarMapNormalTexture() {
    return SR.Textures.makeCanvasTexture(1024, 680, (ctx, w, h) => {
      // Deep Victorian astronomical indigo-night parchment background
      const grad = ctx.createRadialGradient(w * 0.5, h * 0.48, 40, w * 0.5, h * 0.5, w * 0.62);
      grad.addColorStop(0, '#131d3a');
      grad.addColorStop(0.6, '#0b1226');
      grad.addColorStop(1, '#060a16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Double ornate brass-gold border
      ctx.strokeStyle = 'rgba(210, 172, 98, 0.72)';
      ctx.lineWidth = 4;
      ctx.strokeRect(22, 22, w - 44, h - 44);
      ctx.strokeStyle = 'rgba(210, 172, 98, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(34, 34, w - 68, h - 68);

      // Celestial hemisphere grids (two subtle overlapping Victorian planispheres)
      ctx.strokeStyle = 'rgba(182, 152, 96, 0.20)';
      ctx.lineWidth = 1.2;
      const centers = [[w * 0.31, h * 0.52], [w * 0.69, h * 0.52]];
      centers.forEach(([cx, cy]) => {
        [68, 130, 192, 240].forEach(r => {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 32, cy + Math.sin(a) * 32);
          ctx.lineTo(cx + Math.cos(a) * 240, cy + Math.sin(a) * 240);
          ctx.stroke();
        }
      });

      // Ecliptic sinusoidal curve
      ctx.strokeStyle = 'rgba(220, 180, 102, 0.32)';
      ctx.setLineDash([7, 5]);
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let x = 50; x <= w - 50; x += 6) {
        const t = (x - 50) / (w - 100);
        const y = h * 0.52 + Math.sin(t * Math.PI * 2) * 115;
        if (x === 50) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Deterministic antique star field + constellation lines
      let seed = 1894;
      function rnd() {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      }

      const constStars = [
        [[145, 220], [205, 195], [270, 235], [235, 305], [160, 290]],
        [[430, 175], [485, 155], [540, 175], [580, 225], [530, 265], [465, 245]],
        [[695, 210], [765, 180], [840, 215], [885, 290], [810, 325], [735, 295]],
        [[180, 445], [260, 415], [335, 455], [390, 520], [295, 540]],
        [[650, 450], [725, 430], [795, 465], [860, 440], [835, 535]]
      ];
      ctx.strokeStyle = 'rgba(225, 198, 130, 0.36)';
      ctx.lineWidth = 1.3;
      constStars.forEach(poly => {
        ctx.beginPath();
        poly.forEach(([sx, sy], idx) => {
          if (idx === 0) ctx.moveTo(sx, sy);
          else ctx.lineTo(sx, sy);
        });
        ctx.stroke();
        poly.forEach(([sx, sy]) => {
          ctx.fillStyle = '#f8e6b0';
          ctx.beginPath();
          ctx.arc(sx, sy, 3.2, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      for (let i = 0; i < 240; i++) {
        const sx = 46 + rnd() * (w - 92);
        const sy = 90 + rnd() * (h - 140);
        const sr = 0.6 + rnd() * 1.9;
        const alpha = 0.22 + rnd() * 0.62;
        ctx.fillStyle = `rgba(246, 232, 195, ${alpha.toFixed(2)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Header & footer Victorian typography
      ctx.fillStyle = '#e7c87e';
      ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('CARTA ESTELAR DEL OBSERVATORIO DE SOLÍS', w * 0.5, 76);

      ctx.fillStyle = 'rgba(218, 187, 122, 0.72)';
      ctx.font = 'italic 17px Georgia, "Times New Roman", serif';
      ctx.fillText('Hemisferio Boreal y Eclíptica del Gran Eclipse — Anno 1894', w * 0.5, 104);

      // Subtle compass rose at bottom center
      const crx = w * 0.5, cry = h - 76;
      ctx.strokeStyle = 'rgba(220, 182, 102, 0.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(crx, cry, 22, 0, Math.PI * 2);
      ctx.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const len = i % 2 === 0 ? 28 : 16;
        ctx.beginPath();
        ctx.moveTo(crx, cry);
        ctx.lineTo(crx + Math.sin(a) * len, cry - Math.cos(a) * len);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(218, 187, 122, 0.68)';
      ctx.font = '14px Georgia, serif';
      ctx.fillText('«Lo invisible se revela únicamente bajo la luz azul del cobalto»', w * 0.5, h - 38);
    });
  }

  function createStarMapUVTexture() {
    return SR.Textures.makeCanvasTexture(1024, 680, (ctx, w, h) => {
      ctx.clearRect(0, 0, w, h);

      // Subtle luminous border frame in phosphorescent cyan-violet
      ctx.save();
      ctx.strokeStyle = '#6cf2ff';
      ctx.shadowColor = '#7d5cff';
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      ctx.strokeRect(52, 124, w - 104, h - 196);

      // Corner luminous astronomical arcs
      [[82, 154], [w - 82, 154], [82, h - 102], [w - 82, h - 102]].forEach(([cx, cy]) => {
        ctx.beginPath();
        ctx.arc(cx, cy, 16, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Heading: ALINEACIÓN DEL PLANETARIO
      ctx.fillStyle = '#9ffbff';
      ctx.shadowColor = '#40d9ff';
      ctx.shadowBlur = 22;
      ctx.font = 'bold 34px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦  ALINEACIÓN DEL PLANETARIO  ✦', w * 0.5, 184);

      // Horizontal luminous divider
      ctx.strokeStyle = 'rgba(130, 245, 255, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(150, 206);
      ctx.lineTo(w - 150, 206);
      ctx.stroke();

      // 4 Planetary clue lines with crisp custom vector glyphs
      const rows = [
        { glyph: 'mercury', name: 'Mercurio', arrow: '→', targetGlyph: 'aries', text: '(Norte)' },
        { glyph: 'venus',   name: 'Venus',    arrow: '→', targetGlyph: null,    text: '+90° horario desde Mercurio' },
        { glyph: 'mars',    name: 'Marte',    arrow: '→', targetGlyph: null,    text: 'opuesto a Venus (180°)' },
        { glyph: 'saturn',  name: 'Saturno',  arrow: '→', targetGlyph: null,    text: '-45° antihorario desde Marte' }
      ];

      ctx.textAlign = 'left';
      rows.forEach((row, idx) => {
        const y = 264 + idx * 62;
        ctx.strokeStyle = '#c4faff';
        ctx.lineWidth = 3.2;
        drawAstroGlyph(ctx, row.glyph, 134, y - 9, 17);

        ctx.fillStyle = '#c8faff';
        ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
        ctx.fillText(row.name, 174, y);

        ctx.fillStyle = '#a99cff';
        ctx.font = 'bold 28px Georgia, serif';
        ctx.fillText(row.arrow, 344, y);

        if (row.targetGlyph) {
          ctx.strokeStyle = '#9cf8ff';
          ctx.lineWidth = 3.2;
          drawAstroGlyph(ctx, row.targetGlyph, 412, y - 9, 16);
          ctx.fillStyle = '#e0fdff';
          ctx.font = 'bold 28px Georgia, "Times New Roman", serif';
          ctx.fillText(row.text, 444, y);
        } else {
          ctx.fillStyle = '#e0fdff';
          ctx.font = 'bold 27px Georgia, "Times New Roman", serif';
          ctx.fillText(row.text, 398, y);
        }
      });

      // Second luminous divider
      ctx.strokeStyle = 'rgba(164, 132, 255, 0.78)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(110, 494);
      ctx.lineTo(w - 110, 494);
      ctx.stroke();

      // Optics guide
      ctx.textAlign = 'center';
      ctx.fillStyle = '#b4b8ff';
      ctx.shadowColor = '#8066ff';
      ctx.shadowBlur = 20;
      ctx.font = 'bold 27px Georgia, "Times New Roman", serif';
      ctx.fillText('ÓPTICA:   Oro → Ámbar   |   Rubí → Rojo   |   Zafiro → Azul', w * 0.5, 542);
      ctx.restore();
    });
  }

  function createBenchGridTexture() {
    return SR.Textures.makeCanvasTexture(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#141720';
      ctx.fillRect(0, 0, w, h);

      const pad = 16;
      const inner = w - pad * 2;
      const cell = inner / GRID_SIZE;

      // Subtle stone grain
      for (let i = 0; i < 800; i++) {
        const x = (i * 73) % w;
        const y = (i * 137) % h;
        ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.08)';
        ctx.fillRect(x, y, 3, 3);
      }

      // Recessed square cells
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const x = pad + c * cell;
          const y = pad + r * cell;
          ctx.fillStyle = (r + c) % 2 === 0 ? '#181c28' : '#151924';
          ctx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
          ctx.strokeStyle = 'rgba(196, 158, 86, 0.32)';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);

          // Center crosshair etched in subtle gold
          const cx = x + cell * 0.5;
          const cy = y + cell * 0.5;
          ctx.strokeStyle = 'rgba(196, 158, 86, 0.16)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(cx - 12, cy);
          ctx.lineTo(cx + 12, cy);
          ctx.moveTo(cx, cy - 12);
          ctx.lineTo(cx, cy + 12);
          ctx.stroke();
        }
      }

      // Outer brass frame trim
      ctx.strokeStyle = 'rgba(218, 178, 98, 0.72)';
      ctx.lineWidth = 4;
      ctx.strokeRect(pad - 2, pad - 2, inner + 4, inner + 4);
    });
  }

  function createOrreryCrankMesh(mats) {
    const g = new THREE.Group();
    // Main shaft
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 12), mats.brass);
    shaft.rotation.z = Math.PI / 2;
    g.add(shaft);

    // Hexagonal clutch tip
    const hex = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.036, 6), mats.agedBrass);
    hex.rotation.z = Math.PI / 2;
    hex.position.x = -0.075;
    g.add(hex);

    // Crank arm
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.095, 0.022), mats.gold);
    arm.position.set(0.068, 0.04, 0);
    g.add(arm);

    // Star collar at elbow
    const star = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.016, 8), mats.gold);
    star.rotation.z = Math.PI / 2;
    star.position.set(0.068, 0, 0);
    g.add(star);

    // Wooden/brass grip handle
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.011, 0.065, 12), mats.mahogany);
    grip.rotation.z = Math.PI / 2;
    grip.position.set(0.102, 0.082, 0);
    g.add(grip);

    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.015, 12, 10), mats.gold);
    knob.position.set(0.134, 0.082, 0);
    g.add(knob);

    return g;
  }

  const OpticsStation = {
    group: null,
    nodes: {},
    receptors: {},
    beamGroup: null,
    lanternLensMesh: null,
    lanternGlowMesh: null,
    lanternLight: null,
    lanternCfg: null,
    starmapReadCfg: null,
    drawerGroup: null,
    drawerProgress: 0,
    crankMesh: null,
    crankCfg: null,
    uvLightIntensity: 0,
    emitterCoreMat: null,

    init(scene) {
      const mats = {
        mahogany: SR.Materials.get('mahogany'),
        darkWood: SR.Materials.get('darkWood'),
        walnut: SR.Materials.get('walnut'),
        slate: SR.Materials.get('slate'),
        brass: SR.Materials.get('brass'),
        agedBrass: SR.Materials.get('agedBrass'),
        gold: SR.Materials.get('gold'),
        copper: SR.Materials.get('copper'),
        darkIron: SR.Materials.get('darkIron'),
        velvet: SR.Materials.get('velvet'),
        glass: SR.Materials.get('glass'),
        mirror: SR.Materials.get('mirror'),
        rubyGlass: SR.Materials.get('rubyGlass'),
        sapphireGlass: SR.Materials.get('sapphireGlass'),
        amberGlass: SR.Materials.get('amberGlass')
      };

      const wt = SR.ROOM.wallTransform(180, 0);
      const group = new THREE.Group();
      group.name = 'Station_Optics';
      group.position.set(wt.x, 0, wt.z);
      group.rotation.y = wt.rotY;
      scene.add(group);
      this.group = group;

      this._buildTable(group, mats);
      this._buildStarMap(group, mats);
      this._buildUVLantern(group, mats);
      this._buildOpticalBench(group, mats);
      this._buildSecretDrawer(group, mats);

      // Beam container in local space of station
      this.beamGroup = new THREE.Group();
      this.beamGroup.name = 'Optics_Beams';
      group.add(this.beamGroup);

      // Register camera views (framed cleanly between top HUD banner and bottom inventory bar)
      SR.Camera.registerView('optics', {
        pos: localToWorldArr(group, -0.04, 2.14, 2.36),
        target: localToWorldArr(group, -0.02, 0.90, 0.60),
        fov: 50,
        title: 'Mesa de Óptica y Prismas',
        subtitle: 'Orienta espejos y divisores para activar los tres receptores de cristal',
        parent: 'room',
        zenithView: 'optics_top'
      });

      // Nearly pure vertical top-down / cenital view (tiny +0.06m Z offset prevents gimbal lock
      // and keeps row 0 / Amber at top, Emitter at left, Ruby mid-right, Sapphire bottom-mid,
      // and the open secret drawer cleanly above the bottom inventory bar!)
      SR.Camera.registerView('optics_top', {
        pos: localToWorldArr(group, 0.04, 2.98, 0.77),
        target: localToWorldArr(group, 0.04, TABLE_TOP_Y + 0.06, 0.71),
        fov: 48,
        title: 'Mesa de Óptica — Vista Cenital',
        subtitle: 'Alinea espejos y divisores desde arriba para activar los tres receptores',
        parent: 'room',
        perspectiveView: 'optics'
      });

      SR.Camera.registerView('starmap', {
        pos: localToWorldArr(group, 0.0, 2.02, 1.86),
        target: localToWorldArr(group, 0.0, 2.00, 0.06),
        fov: 48,
        title: 'Carta Estelar de Solís',
        subtitle: 'Observa el mapa celeste del gabinete — las tintas ocultas responden a la luz UV',
        parent: 'optics'
      });

      // Subtle warm laboratory overhead accent light for mahogany & brass sheen
      const benchLight = new THREE.PointLight(0xffe0a8, 0.68, 2.8, 2);
      benchLight.position.set(0.06, 1.88, 0.92);
      group.add(benchLight);

      // Tight macro room-view hitbox hugging ONLY the table & bench (never overlapping Star Map!)
      const macroHit = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.94, 1.12), makeHitboxMat());
      macroHit.position.set(0, 0.50, 0.64);
      group.add(macroHit);
      SR.registerInteractive(macroHit, {
        id: 'optics_bench_zoom',
        station: 'optics',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'Mesa de Óptica y Prismas',
        cursor: 'inspect',
        highlightTarget: this.benchHighlight,
        onClick: () => {
          SR.Audio.playClick(0.95);
          SR.Camera.goToView('optics');
        }
      });

      SR.State.on('uvChanged', () => this._syncLanternVisuals());
      this.syncFromState();
    },

    _buildTable(group, mats) {
      const table = new THREE.Group();
      group.add(table);

      // Heavy tabletop slab
      const topGeo = THREE.RoundedBoxGeometry
        ? new THREE.RoundedBoxGeometry(2.08, 0.075, 1.12, 3, 0.015)
        : new THREE.BoxGeometry(2.08, 0.075, 1.12);
      const tabletop = new THREE.Mesh(topGeo, mats.mahogany);
      tabletop.position.set(0, TABLE_TOP_Y - 0.0375, 0.64);
      tabletop.castShadow = true;
      tabletop.receiveShadow = true;
      table.add(tabletop);

      // Brass perimeter edge molding
      const trimFront = new THREE.Mesh(new THREE.BoxGeometry(2.10, 0.022, 0.016), mats.brass);
      trimFront.position.set(0, TABLE_TOP_Y - 0.038, 1.202);
      table.add(trimFront);
      const trimLeft = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.022, 1.13), mats.brass);
      trimLeft.position.set(-1.042, TABLE_TOP_Y - 0.038, 0.64);
      table.add(trimLeft);
      const trimRight = trimLeft.clone();
      trimRight.position.x = 1.042;
      table.add(trimRight);

      // Under-table apron skirt (split so secret drawer fits cleanly at X=+0.16)
      const apronBack = new THREE.Mesh(new THREE.BoxGeometry(1.94, 0.16, 0.04), mats.darkWood);
      apronBack.position.set(0, TABLE_TOP_Y - 0.145, 0.14);
      table.add(apronBack);

      const apronLeft = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.16, 0.98), mats.darkWood);
      apronLeft.position.set(-0.95, TABLE_TOP_Y - 0.145, 0.64);
      table.add(apronLeft);
      const apronRight = apronLeft.clone();
      apronRight.position.x = 0.95;
      table.add(apronRight);

      // Front apron flanking the drawer recess (drawer spans X: -0.14 .. +0.46)
      const apronFL = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.16, 0.04), mats.darkWood);
      apronFL.position.set(-0.55, TABLE_TOP_Y - 0.145, 1.13);
      table.add(apronFL);
      const apronFR = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.16, 0.04), mats.darkWood);
      apronFR.position.set(0.71, TABLE_TOP_Y - 0.145, 1.13);
      table.add(apronFR);

      // 4 turned mahogany & brass legs
      const legOffsets = [
        [-0.94, 0.16], [0.94, 0.16],
        [-0.94, 1.12], [0.94, 1.12]
      ];
      legOffsets.forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, TABLE_TOP_Y - 0.08, 12), mats.mahogany);
        leg.position.set(lx, (TABLE_TOP_Y - 0.08) * 0.5, lz);
        leg.castShadow = true;
        table.add(leg);

        const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.050, 0.050, 0.045, 12), mats.agedBrass);
        collar.position.set(lx, TABLE_TOP_Y - 0.11, lz);
        table.add(collar);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.07, 12), mats.brass);
        foot.position.set(lx, 0.035, lz);
        table.add(foot);
      });

      // Lower mahogany stretcher shelf
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.032, 0.92), mats.walnut);
      shelf.position.set(0, 0.22, 0.64);
      shelf.receiveShadow = true;
      table.add(shelf);

      // Decorative brass spare lens calipers / prism case on lower shelf
      const propBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.09, 0.22), mats.mahogany);
      propBox.position.set(-0.56, 0.28, 0.62);
      propBox.rotation.y = 0.22;
      table.add(propBox);
      const propClasp = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.02), mats.brass);
      propClasp.position.set(-0.54, 0.29, 0.73);
      table.add(propClasp);
    },

    _buildStarMap(group, mats) {
      const frameGroup = new THREE.Group();
      frameGroup.position.set(0.0, 1.98, 0.055);
      group.add(frameGroup);

      const mapW = 1.62;
      const mapH = 1.08;

      // Mahogany backing board & ornate beveled frame rails
      const back = new THREE.Mesh(new THREE.BoxGeometry(mapW + 0.14, mapH + 0.14, 0.045), mats.darkWood);
      back.castShadow = true;
      frameGroup.add(back);

      const railTop = new THREE.Mesh(new THREE.BoxGeometry(mapW + 0.16, 0.07, 0.065), mats.mahogany);
      railTop.position.set(0, mapH * 0.5 + 0.035, 0.015);
      frameGroup.add(railTop);
      const railBot = railTop.clone();
      railBot.position.y = -(mapH * 0.5 + 0.035);
      frameGroup.add(railBot);

      const railL = new THREE.Mesh(new THREE.BoxGeometry(0.07, mapH + 0.04, 0.065), mats.mahogany);
      railL.position.set(-(mapW * 0.5 + 0.035), 0, 0.015);
      frameGroup.add(railL);
      const railR = railL.clone();
      railR.position.x = mapW * 0.5 + 0.035;
      frameGroup.add(railR);

      // Gilded inner brass fillet & 4 corner medallions
      const filletTop = new THREE.Mesh(new THREE.BoxGeometry(mapW + 0.02, 0.016, 0.018), mats.gold);
      filletTop.position.set(0, mapH * 0.5 + 0.005, 0.035);
      frameGroup.add(filletTop);
      const filletBot = filletTop.clone();
      filletBot.position.y = -(mapH * 0.5 + 0.005);
      frameGroup.add(filletBot);

      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sy]) => {
        const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.018, 12), mats.brass);
        rosette.rotation.x = Math.PI / 2;
        rosette.position.set(sx * (mapW * 0.5 + 0.035), sy * (mapH * 0.5 + 0.035), 0.052);
        frameGroup.add(rosette);
      });

      // Normal vintage Victorian star map surface
      const normalTex = createStarMapNormalTexture();
      const normalMat = new THREE.MeshStandardMaterial({
        map: normalTex,
        roughness: 0.72,
        metalness: 0.08
      });
      const mapPlane = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), normalMat);
      mapPlane.position.z = 0.028;
      frameGroup.add(mapPlane);

      // UV-Reactive invisible ink overlay (Additive + uvFadeOpacity = true)
      const uvTex = createStarMapUVTexture();
      const uvMat = new THREE.MeshStandardMaterial({
        map: uvTex,
        emissiveMap: uvTex,
        emissive: new THREE.Color(0x6cf4ff),
        emissiveIntensity: 0,
        color: new THREE.Color(0x000000),
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        roughness: 0.35,
        metalness: 0.0
      });
      uvMat.userData.uvFadeOpacity = true;
      SR.Materials.registerUVMaterial(uvMat, 2.35);

      const uvPlane = new THREE.Mesh(new THREE.PlaneGeometry(mapW, mapH), uvMat);
      uvPlane.position.z = 0.033;
      frameGroup.add(uvPlane);

      // Click to zoom into Star Map from room or optics view
      const zoomHit = new THREE.Mesh(new THREE.BoxGeometry(mapW + 0.10, mapH + 0.10, 0.08), makeHitboxMat());
      zoomHit.position.z = 0.04;
      frameGroup.add(zoomHit);
      SR.registerInteractive(zoomHit, {
        id: 'optics_starmap_zoom',
        station: 'optics',
        activeViews: ['room', 'optics', 'optics_top'],
        action: 'Examinar',
        label: 'Carta Estelar de Solís',
        cursor: 'inspect',
        highlightTarget: railTop,
        onClick: () => {
          SR.Audio.playClick(1.0);
          SR.Camera.goToView('starmap');
          if (SR.State.data.uvActive) {
            const already = SR.State.data.journalUnlocked.includes('uv_starmap');
            SR.State.unlockJournal('uv_starmap');
            if (!already) {
              SR.Audio.playCrystal(1.15);
              SR.UI.say('¡Tinta ultravioleta revelada en la Carta Estelar! Has anotado las claves del Planetario y de la Óptica en el Diario.');
            }
          }
        }
      });

      // Click Star Map while in starmap close-up to read/log UV ink
      const readHit = new THREE.Mesh(new THREE.BoxGeometry(mapW, mapH, 0.06), makeHitboxMat());
      readHit.position.z = 0.05;
      frameGroup.add(readHit);
      this.starmapReadCfg = SR.registerInteractive(readHit, {
        id: 'optics_starmap_read',
        station: 'optics',
        activeViews: ['starmap'],
        action: 'Examinar',
        label: 'Carta Estelar',
        cursor: 'inspect',
        highlightTarget: railBot,
        onClick: () => {
          if (SR.State.data.uvActive) {
            const already = SR.State.data.journalUnlocked.includes('uv_starmap');
            SR.State.unlockJournal('uv_starmap');
            SR.Audio.playCrystal(1.2);
            if (!already) {
              SR.UI.say('¡Descubrimiento extraordinario! La tinta ultravioleta revela la alineación exacta del Planetario y los receptores ópticos. Anotado en el Diario.');
            } else {
              SR.UI.say('Abriendo las notas de la Carta Estelar ultravioleta en el Diario.');
              if (SR.Journal && SR.Journal.open) SR.Journal.open('uv_starmap');
            }
          } else if (SR.State.data.uvInstalled) {
            SR.Audio.playClick(0.9);
            SR.UI.say('Un mapa estelar de 1894. Hay trazos casi imperceptibles... enciende la Luz UV para revelar la tinta oculta.');
          } else {
            SR.Audio.playClick(0.9);
            SR.UI.say('Carta Estelar de Maestro Valerio. Al pie reza: «Lo invisible se revela únicamente bajo la luz azul del cobalto».');
          }
        }
      });
    },

    _buildUVLantern(group, mats) {
      const lantern = new THREE.Group();
      lantern.position.set(-0.78, TABLE_TOP_Y, 0.44);
      // Angled gently toward both the Star Map and viewer so the front lens bezel is unmistakably visible!
      lantern.rotation.y = 0.52;
      group.add(lantern);

      // Weighted brass laboratory pedestal base
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.108, 0.032, 18), mats.agedBrass);
      base.position.y = 0.016;
      base.castShadow = true;
      lantern.add(base);

      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.145, 12), mats.brass);
      stem.position.y = 0.098;
      lantern.add(stem);

      const yoke = new THREE.Mesh(new THREE.TorusGeometry(0.092, 0.011, 8, 20, Math.PI), mats.brass);
      yoke.position.y = 0.24;
      yoke.rotation.z = Math.PI;
      lantern.add(yoke);

      // Pivoted lantern barrel tilted slightly upward toward the Star Map
      const head = new THREE.Group();
      head.position.set(0, 0.245, 0);
      head.rotation.x = -0.22;
      lantern.add(head);

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.17, 20), mats.darkIron);
      body.rotation.x = Math.PI / 2;
      body.castShadow = true;
      head.add(body);

      // Brass cooling bands & chimney vent
      [-0.055, 0, 0.055].forEach(z => {
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.074, 0.007, 8, 24), mats.brass);
        band.position.z = z;
        head.add(band);
      });

      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.065, 12), mats.agedBrass);
      chimney.position.set(0, 0.082, -0.01);
      head.add(chimney);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.026, 12), mats.brass);
      cap.position.set(0, 0.122, -0.01);
      head.add(cap);

      // Front brass lens bezel ring (hollow — empty until cobalt_filter inserted!)
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.013, 12, 24), mats.gold);
      bezel.position.z = 0.088;
      head.add(bezel);

      // Dark recessed interior of lantern
      const interior = new THREE.Mesh(
        new THREE.CircleGeometry(0.058, 20),
        new THREE.MeshBasicMaterial({ color: 0x090b12 })
      );
      interior.position.z = 0.074;
      head.add(interior);

      // Faint warm filament inside empty lantern
      const filament = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffd78a })
      );
      filament.position.z = 0.065;
      head.add(filament);

      // Cobalt blue filter glass lens (hidden until uvInstalled === true)
      const lensMat = new THREE.MeshStandardMaterial({
        color: 0x1d4fff,
        emissive: 0x3b6dff,
        emissiveIntensity: 0.45,
        roughness: 0.12,
        metalness: 0.15,
        transparent: true,
        opacity: 0.92
      });
      this.lanternLensMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.016, 24), lensMat);
      this.lanternLensMesh.rotation.x = Math.PI / 2;
      this.lanternLensMesh.position.z = 0.088;
      this.lanternLensMesh.visible = false;
      head.add(this.lanternLensMesh);

      // Additive glowing halo when UV is active
      const glowMat = new THREE.MeshBasicMaterial({
        color: 0x5c8aff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      this.lanternGlowMesh = new THREE.Mesh(new THREE.CircleGeometry(0.095, 24), glowMat);
      this.lanternGlowMesh.position.z = 0.098;
      head.add(this.lanternGlowMesh);

      // Real UV PointLight casting cobalt glow across bench & Star Map
      this.lanternLight = new THREE.PointLight(0x4b74ff, 0, 3.6, 1.5);
      this.lanternLight.position.set(-0.62, TABLE_TOP_Y + 0.56, 0.42);
      group.add(this.lanternLight);

      // Click hitbox
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.36, 12), makeHitboxMat());
      hit.position.y = 0.19;
      lantern.add(hit);

      this.lanternCfg = SR.registerInteractive(hit, {
        id: 'optics_uv_lantern',
        station: 'optics',
        activeViews: ['optics', 'optics_top', 'starmap'],
        action: 'Examinar',
        label: 'Linterna de Cobalto (Sin lente)',
        cursor: 'interact',
        highlightTarget: bezel,
        onClick: () => {
          const st = SR.State.data;
          if (!st.uvInstalled) {
            if (st.selectedItem === 'cobalt_filter') {
              st.uvInstalled = true;
              SR.State.removeItem('cobalt_filter');
              SR.State.setUV(true);
              SR.State.unlockJournal('uv_discovery');
              SR.Audio.playUV(true);
              SR.Audio.playSolve();
              this._syncLanternVisuals();
              SR.UI.say('¡Has encajado el Filtro de Cobalto! La luz ultravioleta inunda el gabinete y el botón de Luz UV está activo en la barra superior.');
            } else {
              SR.Audio.playClick(0.85);
              SR.UI.say('Una linterna óptica de latón con el aro frontal vacío. Necesita una lente de vidrio azul cobalto para emitir luz ultravioleta.');
            }
          } else {
            const next = !st.uvActive;
            SR.State.setUV(next);
            SR.Audio.playUV(next);
            this._syncLanternVisuals();
            SR.UI.say(next
              ? 'Luz ultravioleta encendida. Examina la Carta Estelar detrás de la mesa.'
              : 'Luz ultravioleta apagada.');
          }
        }
      });
    },

    _buildOpticalBench(group, mats) {
      const bench = new THREE.Group();
      group.add(bench);

      // Recessed dark-slate 5x5 grid plate
      const traySize = CELL_PITCH * GRID_SIZE + 0.05;
      const gridTex = createBenchGridTexture();
      const gridMat = new THREE.MeshStandardMaterial({
        map: gridTex,
        roughness: 0.58,
        metalness: 0.22
      });
      const tray = new THREE.Mesh(new THREE.BoxGeometry(traySize, 0.022, traySize), gridMat);
      tray.position.set(BENCH_CENTER_X, TABLE_TOP_Y + 0.011, BENCH_CENTER_Z);
      tray.receiveShadow = true;
      bench.add(tray);

      // Raised brass bezel rails framing the 5x5 tray
      const railH = 0.032;
      const railT = 0.026;
      const half = traySize * 0.5 + railT * 0.5;
      const rNorth = new THREE.Mesh(new THREE.BoxGeometry(traySize + railT * 2, railH, railT), mats.agedBrass);
      rNorth.position.set(BENCH_CENTER_X, TABLE_TOP_Y + railH * 0.5, BENCH_CENTER_Z - half);
      bench.add(rNorth);
      const rSouth = rNorth.clone();
      rSouth.position.z = BENCH_CENTER_Z + half;
      bench.add(rSouth);
      this.benchHighlight = rSouth;
      const rWest = new THREE.Mesh(new THREE.BoxGeometry(railT, railH, traySize), mats.agedBrass);
      rWest.position.set(BENCH_CENTER_X - half, TABLE_TOP_Y + railH * 0.5, BENCH_CENTER_Z);
      bench.add(rWest);
      const rEast = rWest.clone();
      rEast.position.x = BENCH_CENTER_X + half;
      bench.add(rEast);

      // Arc-Lamp Golden Beam Emitter on left edge pointing into (0, 2)
      const emPos = cellToLocal(0, 2);
      const emitter = new THREE.Group();
      emitter.position.set(emPos.x - CELL_PITCH * 0.92, TABLE_TOP_Y, emPos.z);
      bench.add(emitter);

      const emBase = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.045, 0.13), mats.darkIron);
      emBase.position.y = 0.0225;
      emitter.add(emBase);
      const emBody = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.054, 0.12, 16), mats.brass);
      emBody.rotation.z = -Math.PI / 2;
      emBody.position.set(-0.01, BEAM_Y - TABLE_TOP_Y, 0);
      emBody.castShadow = true;
      emitter.add(emBody);
      const emNozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.038, 0.045, 16), mats.gold);
      emNozzle.rotation.z = -Math.PI / 2;
      emNozzle.position.set(0.068, BEAM_Y - TABLE_TOP_Y, 0);
      emitter.add(emNozzle);
      this.emitterCoreMat = new THREE.MeshBasicMaterial({ color: 0xffe896 });
      const emCore = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), this.emitterCoreMat);
      emCore.position.set(0.088, BEAM_Y - TABLE_TOP_Y, 0);
      emitter.add(emCore);

      // Fixed Brass Obstruction Pillars
      PILLARS.forEach(({ col, row }) => {
        const p = cellToLocal(col, row);
        const pil = new THREE.Group();
        pil.position.set(p.x, TABLE_TOP_Y + 0.022, p.z);
        bench.add(pil);

        const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.024, 8), mats.agedBrass);
        foot.position.y = 0.012;
        pil.add(foot);
        const colMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.044, 0.135, 8), mats.darkIron);
        colMesh.position.y = 0.092;
        colMesh.castShadow = true;
        pil.add(colMesh);
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.040, 0.022, 8), mats.brass);
        cap.position.y = 0.168;
        pil.add(cap);
        const finial = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.035, 8), mats.gold);
        finial.position.y = 0.195;
        pil.add(finial);
      });

      // Fixed Colored Crystal Filters (Ruby at 3,2 and Sapphire at 1,3)
      FILTERS.forEach(f => {
        const p = cellToLocal(f.col, f.row);
        const fg = new THREE.Group();
        fg.position.set(p.x, TABLE_TOP_Y + 0.022, p.z);
        bench.add(fg);

        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.022, 16), mats.brass);
        base.position.y = 0.011;
        fg.add(base);

        // 4 slender brass corner posts so beams clearly enter from any side
        const colHex = f.color === 'red' ? 0xff2942 : 0x2c9bff;
        const crystalMat = new THREE.MeshStandardMaterial({
          color: colHex,
          emissive: colHex,
          emissiveIntensity: 0.65,
          roughness: 0.12,
          metalness: 0.1,
          transparent: true,
          opacity: 0.82
        });
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.046, 0), crystalMat);
        crystal.scale.set(0.85, 1.35, 0.85);
        crystal.position.y = 0.075;
        fg.add(crystal);

        const crown = new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.006, 8, 16), mats.gold);
        crown.rotation.x = Math.PI / 2;
        crown.position.y = 0.132;
        fg.add(crown);
      });

      // 3 Crystal Receptors (Amber 4,0 | Ruby 4,2 | Sapphire 2,4)
      RECEPTORS.forEach(r => {
        const p = cellToLocal(r.col, r.row);
        const rg = new THREE.Group();
        rg.position.set(p.x, TABLE_TOP_Y + 0.022, p.z);
        bench.add(rg);

        const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.064, 0.036, 16), mats.agedBrass);
        ped.position.y = 0.018;
        rg.add(ped);

        const colorSpec = BEAM_COLORS[r.color];
        const ringMat = new THREE.MeshStandardMaterial({
          color: colorSpec.glow,
          emissive: colorSpec.glow,
          emissiveIntensity: 0.35,
          roughness: 0.3,
          metalness: 0.5
        });
        const collar = new THREE.Mesh(new THREE.TorusGeometry(0.050, 0.008, 10, 20), ringMat);
        collar.rotation.x = Math.PI / 2;
        collar.position.y = 0.038;
        rg.add(collar);

        // 4 brass claws holding the spire
        for (let i = 0; i < 4; i++) {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          const claw = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.062, 0.009), mats.gold);
          claw.position.set(Math.cos(a) * 0.036, 0.064, Math.sin(a) * 0.036);
          claw.rotation.z = -Math.cos(a) * 0.18;
          claw.rotation.x = Math.sin(a) * 0.18;
          rg.add(claw);
        }

        const spireMat = new THREE.MeshStandardMaterial({
          color: colorSpec.glow,
          emissive: colorSpec.glow,
          emissiveIntensity: 0.18,
          roughness: 0.15,
          metalness: 0.12,
          transparent: true,
          opacity: 0.88
        });
        const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.044, 0), spireMat);
        spire.scale.set(0.76, 1.65, 0.76);
        spire.position.y = 0.105;
        rg.add(spire);

        const haloMat = new THREE.MeshBasicMaterial({
          color: colorSpec.core,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        const halo = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.006, 8, 24), haloMat);
        halo.rotation.x = Math.PI / 2;
        halo.position.y = 0.105;
        rg.add(halo);

        this.receptors[r.key] = {
          def: r,
          spire,
          spireMat,
          ringMat,
          halo,
          haloMat,
          lit: false
        };
      });

      // Rotatable Splitters & Mirrors
      ROTATABLE_DEFS.forEach(def => {
        const p = cellToLocal(def.col, def.row);
        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(p.x, TABLE_TOP_Y + 0.022, p.z);
        bench.add(nodeGroup);

        // Fixed recessed socket ring on bench
        const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.062, 0.016, 18), mats.agedBrass);
        baseRing.position.y = 0.008;
        nodeGroup.add(baseRing);

        // Rotating turret
        const turret = new THREE.Group();
        turret.position.y = 0.016;
        nodeGroup.add(turret);

        let highlightMesh = baseRing;

        if (def.type === 'mirror') {
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.050, 0.016, 16), mats.agedBrass);
          disc.position.y = 0.008;
          turret.add(disc);

          // Mirror assembly lies along local X at rotY = 0 ('-')
          // At rotY = +pi/4 -> '/' | +pi/2 -> '|' | +3pi/4 -> '\'
          const frame = new THREE.Mesh(new THREE.BoxGeometry(0.118, 0.105, 0.018), mats.agedBrass);
          frame.position.y = 0.068;
          frame.castShadow = true;
          turret.add(frame);

          // Crisp satin silver mirror face (less glare blowout so exact 45° angle reads cleanly)
          const mirrorFaceMat = new THREE.MeshStandardMaterial({
            color: 0xc8d8e6,
            roughness: 0.16,
            metalness: 0.92
          });
          const glassF = new THREE.Mesh(new THREE.PlaneGeometry(0.100, 0.086), mirrorFaceMat);
          glassF.position.set(0, 0.068, 0.010);
          turret.add(glassF);
          const glassB = new THREE.Mesh(new THREE.PlaneGeometry(0.100, 0.086), mirrorFaceMat);
          glassB.rotation.y = Math.PI;
          glassB.position.set(0, 0.068, -0.010);
          turret.add(glassB);

          // Clear dark-beveled brass ridge + crisp luminous silver top-edge indicator strip
          // so exact mirror orientation (-, /, |, \) is unmistakable from straight top-down AND perspective!
          const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.128, 0.014, 0.024), mats.darkIron);
          ridge.position.y = 0.124;
          turret.add(ridge);

          const topEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xf4f8ff,
            emissive: 0x9ec5e8,
            emissiveIntensity: 0.68,
            roughness: 0.18,
            metalness: 0.72
          });
          const topEdgeStrip = new THREE.Mesh(new THREE.BoxGeometry(0.124, 0.007, 0.011), topEdgeMat);
          topEdgeStrip.position.y = 0.133;
          turret.add(topEdgeStrip);

          // Small brass end-caps on mirror bar to accentuate orientation cleanly from above
          [-0.064, 0.064].forEach(ex => {
            const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.020, 8), mats.gold);
            cap.position.set(ex, 0.126, 0);
            turret.add(cap);
          });

          highlightMesh = frame;
        } else {
          // Splitter (s1 built-in OR s2 installable in socket)
          const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.050, 0.016, 16), mats.gold);
          disc.position.y = 0.008;
          turret.add(disc);

          // Open brass side pillars + top/bottom bars holding a translucent quartz beam-splitter plate
          const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.112, 8), mats.gold);
          postL.position.set(-0.056, 0.072, 0);
          turret.add(postL);
          const postR = postL.clone();
          postR.position.x = 0.056;
          turret.add(postR);

          const topBar = new THREE.Mesh(new THREE.BoxGeometry(0.126, 0.014, 0.022), mats.gold);
          topBar.position.y = 0.128;
          turret.add(topBar);

          // Luminous cyan top-edge indicator strip distinguishing Splitters from Mirrors even in cenital view!
          const splitEdgeMat = new THREE.MeshStandardMaterial({
            color: 0xd0fbff,
            emissive: 0x4ce2ff,
            emissiveIntensity: 1.15,
            roughness: 0.12,
            metalness: 0.25
          });
          const splitTopStrip = new THREE.Mesh(new THREE.BoxGeometry(0.122, 0.008, 0.012), splitEdgeMat);
          splitTopStrip.position.y = 0.137;
          turret.add(splitTopStrip);

          const quartzMat = new THREE.MeshStandardMaterial({
            color: 0xd8f6ff,
            emissive: 0x72d4ff,
            emissiveIntensity: 0.45,
            roughness: 0.08,
            metalness: 0.25,
            transparent: true,
            opacity: 0.62,
            side: THREE.DoubleSide
          });
          const plate = new THREE.Mesh(new THREE.BoxGeometry(0.104, 0.096, 0.010), quartzMat);
          plate.position.y = 0.072;
          turret.add(plate);

          // Distinct crystal spire marker on top of splitters so player distinguishes Splitters from Mirrors
          const marker = new THREE.Mesh(new THREE.OctahedronGeometry(0.018, 0), quartzMat);
          marker.position.y = 0.150;
          turret.add(marker);

          if (def.type === 'socket') {
            // Add empty socket claws on the fixed baseRing so empty socket is obvious
            for (let i = 0; i < 4; i++) {
              const a = (i * Math.PI) / 2;
              const prong = new THREE.Mesh(new THREE.BoxGeometry(0.010, 0.026, 0.010), mats.gold);
              prong.position.set(Math.cos(a) * 0.044, 0.024, Math.sin(a) * 0.044);
              nodeGroup.add(prong);
            }
            const socketWell = new THREE.Mesh(
              new THREE.CylinderGeometry(0.036, 0.036, 0.018, 12),
              new THREE.MeshStandardMaterial({
                color: 0x101824,
                emissive: 0x3b6fa0,
                emissiveIntensity: 0.35,
                roughness: 0.4
              })
            );
            socketWell.position.y = 0.010;
            nodeGroup.add(socketWell);
            turret.visible = false;
            highlightMesh = baseRing;
          } else {
            highlightMesh = topBar;
          }
        }

        // Generous invisible click cylinder
        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.076, 0.165, 12), makeHitboxMat());
        hit.position.y = 0.085;
        nodeGroup.add(hit);

        const cfg = SR.registerInteractive(hit, {
          id: 'optics_' + def.key,
          station: 'optics',
          activeViews: ['optics', 'optics_top'],
          action: def.type === 'socket' ? 'Colocar' : 'Girar',
          label: def.name,
          cursor: 'interact',
          highlightTarget: highlightMesh,
          onClick: () => this._onNodeClick(def.key)
        });

        const initVal = SR.State.data.opticsNodes[def.key] || 0;
        const initAngle = initVal * (Math.PI / 4);
        turret.rotation.y = initAngle;

        this.nodes[def.key] = {
          def,
          nodeGroup,
          turret,
          cfg,
          currentAngle: initAngle,
          targetAngle: initAngle
        };
      });
    },

    _buildSecretDrawer(group, mats) {
      // Recessed dark cavity inside table apron
      const cavity = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.13, 0.44), mats.darkWood);
      cavity.position.set(BENCH_CENTER_X, TABLE_TOP_Y - 0.145, 0.94);
      group.add(cavity);

      const drawer = new THREE.Group();
      drawer.position.set(BENCH_CENTER_X, TABLE_TOP_Y - 0.145, 1.13);
      group.add(drawer);
      this.drawerGroup = drawer;

      // Drawer front panel
      const front = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.145, 0.032), mats.mahogany);
      front.castShadow = true;
      drawer.add(front);

      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.105, 0.008), mats.agedBrass);
      trim.position.z = 0.017;
      drawer.add(trim);

      const frontInner = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.082, 0.010), mats.mahogany);
      frontInner.position.z = 0.020;
      drawer.add(frontInner);

      // Brass drawer pull handle
      const pull = new THREE.Mesh(new THREE.TorusGeometry(0.026, 0.006, 8, 16, Math.PI), mats.gold);
      pull.rotation.z = Math.PI;
      pull.position.set(0, 0.004, 0.032);
      drawer.add(pull);

      // Drawer box sides & crimson velvet floor
      const dFloor = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.018, 0.36), mats.velvet);
      dFloor.position.set(0, -0.052, -0.19);
      drawer.add(dFloor);
      const dSideL = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.11, 0.36), mats.walnut);
      dSideL.position.set(-0.26, -0.005, -0.19);
      drawer.add(dSideL);
      const dSideR = dSideL.clone();
      dSideR.position.x = 0.26;
      drawer.add(dSideR);
      const dBack = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.11, 0.018), mats.walnut);
      dBack.position.set(0, -0.005, -0.37);
      drawer.add(dBack);

      // 3D Pickup: orrery_crank (Manivela Astral) resting on velvet cushion
      const crank = createOrreryCrankMesh(mats);
      crank.position.set(0, -0.018, -0.16);
      crank.rotation.set(0.25, 0.35, 0.08);
      crank.scale.setScalar(1.25);
      drawer.add(crank);
      this.crankMesh = crank;

      const crankHit = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.24), makeHitboxMat());
      crankHit.position.set(0, 0.02, -0.16);
      drawer.add(crankHit);
      this.crankHit = crankHit;

      this.crankCfg = SR.registerInteractive(crankHit, {
        id: 'optics_pickup_orrery_crank',
        station: 'optics',
        activeViews: ['optics', 'optics_top'],
        action: 'Recoger',
        label: 'Manivela Astral',
        cursor: 'interact',
        highlightTarget: crank,
        disabled: true,
        onClick: () => {
          const st = SR.State.data;
          if (!st.opticsSolved || st.orreryCrankTaken) return;
          st.orreryCrankTaken = true;
          SR.State.addItem('orrery_crank');
          SR.Audio.playPickup();
          this._syncDrawerItems();
          SR.UI.say('Has recogido la Manivela Astral. Su eje hexagonal parece encajar en el Gran Planetario del centro.');
        }
      });
    },

    _onNodeClick(key) {
      const st = SR.State.data;
      const entry = this.nodes[key];
      if (!entry) return;

      if (key === 's2' && !st.splitter2Installed) {
        if (st.selectedItem === 'quartz_splitter') {
          st.splitter2Installed = true;
          SR.State.removeItem('quartz_splitter');
          SR.Audio.playCrystal(1.15);
          SR.Audio.playGear(1.1);
          entry.turret.visible = true;
          entry.cfg.action = 'Girar';
          entry.cfg.label = 'Cristal Divisor (Instalado)';
          entry.cfg.highlightTarget = entry.turret;
          this._traceAndRenderBeams(true);
          SR.UI.say('¡Has encajado el Cristal Divisor! Haz clic sobre él para orientarlo a 45°.');
        } else {
          SR.Audio.playClick(0.8);
          SR.UI.say('Un zócalo de cristal vacío sobre la trayectoria del haz. Aquí falta un Cristal Divisor semirreflectante.');
        }
        return;
      }

      const prev = st.opticsNodes[key] || 0;
      const next = (prev + 1) % 4;
      st.opticsNodes[key] = next;
      // Always advance smoothly forward by +45°
      entry.targetAngle += Math.PI / 4;

      if (entry.def.type === 'splitter' || entry.def.type === 'socket') {
        SR.Audio.playCrystal(0.95 + next * 0.08);
      } else {
        SR.Audio.playClick(0.95 + next * 0.07);
      }

      SR.State.save();
      this._traceAndRenderBeams(true);

      if (!st.opticsSolved) {
        const litCount = (st.opticsReceptors.amber ? 1 : 0) +
                         (st.opticsReceptors.ruby ? 1 : 0) +
                         (st.opticsReceptors.sapphire ? 1 : 0);
        SR.UI.say(`${entry.def.name} → ${ORIENTATION_NAMES[next]}  (Receptores activos: ${litCount}/3)`);
      }
    },

    _getCellInfo(col, row) {
      for (let i = 0; i < PILLARS.length; i++) {
        if (PILLARS[i].col === col && PILLARS[i].row === row) return { kind: 'pillar' };
      }
      for (let i = 0; i < FILTERS.length; i++) {
        if (FILTERS[i].col === col && FILTERS[i].row === row) return { kind: 'filter', color: FILTERS[i].color };
      }
      for (let i = 0; i < RECEPTORS.length; i++) {
        if (RECEPTORS[i].col === col && RECEPTORS[i].row === row) return { kind: 'receptor', def: RECEPTORS[i] };
      }
      for (let i = 0; i < ROTATABLE_DEFS.length; i++) {
        const d = ROTATABLE_DEFS[i];
        if (d.col === col && d.row === row) {
          if (d.key === 's2' && !SR.State.data.splitter2Installed) {
            return { kind: 'empty' };
          }
          return {
            kind: (d.type === 'mirror') ? 'mirror' : 'splitter',
            state: SR.State.data.opticsNodes[d.key] || 0
          };
        }
      }
      return { kind: 'empty' };
    },

    _traceAndRenderBeams(allowSolveTrigger) {
      const st = SR.State.data;
      const segments = [];
      const sparks = [];
      const lit = { amber: false, ruby: false, sapphire: false };

      // Queue of rays: { fromX, fromZ, col, row, dx, dy, color, depth }
      const startCell = cellToLocal(0, 2);
      const emitterExitX = startCell.x - CELL_PITCH * 0.92 + 0.088;
      const emitterExitZ = startCell.z;

      const queue = [{
        startX: emitterExitX,
        startZ: emitterExitZ,
        col: 0,
        row: 2,
        dx: 1,
        dy: 0,
        color: 'gold',
        depth: 0
      }];

      const visited = new Set();
      let processed = 0;
      const MAX_RAYS = 64;
      const MAX_DEPTH = 30;

      while (queue.length > 0 && processed < MAX_RAYS) {
        const ray = queue.shift();
        processed++;

        let curX = ray.startX;
        let curZ = ray.startZ;
        let col = ray.col;
        let row = ray.row;
        let dx = ray.dx;
        let dy = ray.dy;
        let color = ray.color;
        let depth = ray.depth;

        while (depth < MAX_DEPTH) {
          if (col < 0 || col >= GRID_SIZE || row < 0 || row >= GRID_SIZE) {
            // Extend ray slightly to bench inner wall and stop
            const endX = curX + dx * (CELL_PITCH * 0.56);
            const endZ = curZ + dy * (CELL_PITCH * 0.56);
            segments.push({ x1: curX, z1: curZ, x2: endX, z2: endZ, color });
            sparks.push({ x: endX, z: endZ, color, small: true });
            break;
          }

          const visitKey = `${col},${row},${dx},${dy},${color}`;
          if (visited.has(visitKey)) break;
          visited.add(visitKey);

          const center = cellToLocal(col, row);
          const info = this._getCellInfo(col, row);

          if (info.kind === 'empty') {
            segments.push({ x1: curX, z1: curZ, x2: center.x, z2: center.z, color });
            curX = center.x;
            curZ = center.z;
            col += dx;
            row += dy;
            depth++;
            continue;
          }

          if (info.kind === 'pillar') {
            const stopX = center.x - dx * 0.042;
            const stopZ = center.z - dy * 0.042;
            segments.push({ x1: curX, z1: curZ, x2: stopX, z2: stopZ, color });
            sparks.push({ x: stopX, z: stopZ, color, small: true });
            break;
          }

          if (info.kind === 'filter') {
            segments.push({ x1: curX, z1: curZ, x2: center.x, z2: center.z, color });
            color = info.color;
            sparks.push({ x: center.x, z: center.z, color, small: false });
            curX = center.x;
            curZ = center.z;
            col += dx;
            row += dy;
            depth++;
            continue;
          }

          if (info.kind === 'receptor') {
            segments.push({ x1: curX, z1: curZ, x2: center.x, z2: center.z, color });
            if (color === info.def.color) {
              lit[info.def.key] = true;
              sparks.push({ x: center.x, z: center.z, color, small: false });
            } else {
              sparks.push({ x: center.x, z: center.z, color, small: true });
            }
            break;
          }

          if (info.kind === 'mirror' || info.kind === 'splitter') {
            segments.push({ x1: curX, z1: curZ, x2: center.x, z2: center.z, color });

            if (info.state !== 1 && info.state !== 3) {
              // State 0 ('-') or 2 ('|'): cleanly blocks ray
              sparks.push({ x: center.x, z: center.z, color, small: true });
              break;
            }

            sparks.push({ x: center.x, z: center.z, color, small: false });

            // Reflection: '/' (1) => (-dy, -dx); '\' (3) => (dy, dx)
            const rdx = info.state === 1 ? -dy : dy;
            const rdy = info.state === 1 ? -dx : dx;

            if (info.kind === 'splitter') {
              // Spawn reflected branch while continuing straight
              queue.push({
                startX: center.x,
                startZ: center.z,
                col: col + rdx,
                row: row + rdy,
                dx: rdx,
                dy: rdy,
                color,
                depth: depth + 1
              });
              curX = center.x;
              curZ = center.z;
              col += dx;
              row += dy;
              depth++;
            } else {
              // Pure mirror redirects current ray
              curX = center.x;
              curZ = center.z;
              dx = rdx;
              dy = rdy;
              col += dx;
              row += dy;
              depth++;
            }
          }
        }
      }

      // Rebuild beam meshes cleanly
      while (this.beamGroup.children.length > 0) {
        const child = this.beamGroup.children[0];
        this.beamGroup.remove(child);
        if (child.geometry) child.geometry.dispose();
        if (child.material) child.material.dispose();
      }

      const up = new THREE.Vector3(0, 1, 0);
      segments.forEach(seg => {
        const dx = seg.x2 - seg.x1;
        const dz = seg.z2 - seg.z1;
        const len = Math.hypot(dx, dz);
        if (len < 0.004) return;

        const c = BEAM_COLORS[seg.color] || BEAM_COLORS.gold;
        const dir = new THREE.Vector3(dx / len, 0, dz / len);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        const mx = (seg.x1 + seg.x2) * 0.5;
        const mz = (seg.z1 + seg.z2) * 0.5;

        // 1. Bright blazing inner core cylinder (unmistakable in both perspective and cenital views)
        const coreMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0085, 0.0085, len, 10),
          new THREE.MeshBasicMaterial({ color: c.core })
        );
        coreMesh.position.set(mx, BEAM_Y, mz);
        coreMesh.quaternion.copy(quat);
        this.beamGroup.add(coreMesh);

        // 2. Vivid saturated inner plasma sheath
        const midMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.0155, 0.0155, len, 10),
          new THREE.MeshBasicMaterial({
            color: c.mid || c.glow,
            transparent: true,
            opacity: 0.78,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        midMesh.position.set(mx, BEAM_Y, mz);
        midMesh.quaternion.copy(quat);
        this.beamGroup.add(midMesh);

        // 3. Soft wide outer additive halo sheath
        const glowMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.026, 0.026, len, 10),
          new THREE.MeshBasicMaterial({
            color: c.glow,
            transparent: true,
            opacity: 0.30,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        glowMesh.position.set(mx, BEAM_Y, mz);
        glowMesh.quaternion.copy(quat);
        this.beamGroup.add(glowMesh);
      });

      sparks.forEach(sp => {
        const c = BEAM_COLORS[sp.color] || BEAM_COLORS.gold;
        const r = sp.small ? 0.016 : 0.024;
        const spark = new THREE.Mesh(
          new THREE.SphereGeometry(r, 12, 10),
          new THREE.MeshBasicMaterial({
            color: sp.small ? (c.mid || c.glow) : c.core,
            transparent: true,
            opacity: sp.small ? 0.80 : 0.96,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
        );
        spark.position.set(sp.x, BEAM_Y, sp.z);
        this.beamGroup.add(spark);

        if (!sp.small) {
          const halo = new THREE.Mesh(
            new THREE.SphereGeometry(0.040, 12, 10),
            new THREE.MeshBasicMaterial({
              color: c.glow,
              transparent: true,
              opacity: 0.36,
              blending: THREE.AdditiveBlending,
              depthWrite: false
            })
          );
          halo.position.set(sp.x, BEAM_Y, sp.z);
          this.beamGroup.add(halo);
        }
      });

      // Update receptor states & visuals
      st.opticsReceptors.amber = lit.amber;
      st.opticsReceptors.ruby = lit.ruby;
      st.opticsReceptors.sapphire = lit.sapphire;

      Object.keys(this.receptors).forEach(k => {
        const rec = this.receptors[k];
        rec.lit = !!lit[k];
        rec.spireMat.emissiveIntensity = rec.lit ? 2.4 : 0.16;
        rec.ringMat.emissiveIntensity = rec.lit ? 1.8 : 0.25;
        rec.haloMat.opacity = rec.lit ? 0.85 : 0;
      });

      // Check puzzle solve
      if (allowSolveTrigger && !st.opticsSolved && lit.amber && lit.ruby && lit.sapphire) {
        st.opticsSolved = true;
        SR.State.save();
        SR.Audio.playSolve();
        SR.Audio.playDrawer();
        this._syncDrawerItems();
        SR.UI.say('¡Los tres receptores ópticos resuenan en armonía! Un cajón secreto se ha abierto bajo la mesa.');
      }
    },

    _syncLanternVisuals() {
      const st = SR.State.data;
      if (this.lanternLensMesh) {
        this.lanternLensMesh.visible = !!st.uvInstalled;
      }
      if (this.lanternCfg) {
        if (!st.uvInstalled) {
          this.lanternCfg.action = 'Instalar';
          this.lanternCfg.label = 'Linterna de Cobalto (Sin lente)';
        } else {
          this.lanternCfg.action = st.uvActive ? 'Apagar' : 'Encender';
          this.lanternCfg.label = st.uvActive ? 'Linterna UV (Encendida)' : 'Linterna UV (Apagada)';
        }
      }
      if (this.starmapReadCfg) {
        this.starmapReadCfg.label = st.uvActive
          ? 'Carta Estelar (Tinta UV visible)'
          : 'Carta Estelar de Solís';
      }
    },

    _syncDrawerItems() {
      const st = SR.State.data;
      const showCrank = !!(st.opticsSolved && !st.orreryCrankTaken);
      if (this.crankMesh) this.crankMesh.visible = showCrank;
      if (this.crankHit) this.crankHit.visible = showCrank;
      if (this.crankCfg) this.crankCfg.disabled = !showCrank;
    },

    syncFromState() {
      const st = SR.State.data;
      this._syncLanternVisuals();

      // Snap node turrets & labels to state
      Object.keys(this.nodes).forEach(k => {
        const entry = this.nodes[k];
        const val = st.opticsNodes[k] || 0;
        const angle = val * (Math.PI / 4);
        entry.currentAngle = angle;
        entry.targetAngle = angle;
        entry.turret.rotation.y = angle;

        if (k === 's2') {
          entry.turret.visible = !!st.splitter2Installed;
          entry.cfg.action = st.splitter2Installed ? 'Girar' : 'Colocar';
          entry.cfg.label = st.splitter2Installed ? 'Cristal Divisor (Instalado)' : 'Zócalo de Cristal Divisor';
          entry.cfg.highlightTarget = st.splitter2Installed ? entry.turret : entry.nodeGroup;
        }
      });

      this.drawerProgress = st.opticsSolved ? 1 : 0;
      if (this.drawerGroup) {
        this.drawerGroup.position.z = 1.13 + this.drawerProgress * 0.34;
      }
      this._syncDrawerItems();
      this._traceAndRenderBeams(false);
    },

    update(dt, elapsed) {
      const st = SR.State.data;
      const lerpFactor = Math.min(1, dt * 11);

      // Smoothly animate rotating mirrors & splitters
      Object.keys(this.nodes).forEach(k => {
        const entry = this.nodes[k];
        if (Math.abs(entry.targetAngle - entry.currentAngle) > 0.001) {
          entry.currentAngle += (entry.targetAngle - entry.currentAngle) * lerpFactor;
          entry.turret.rotation.y = entry.currentAngle;
        }
      });

      // Smoothly animate UV lantern cobalt glow & point light
      const targetUV = (st.uvInstalled && st.uvActive) ? 1 : 0;
      this.uvLightIntensity += (targetUV - this.uvLightIntensity) * Math.min(1, dt * 6);
      if (this.lanternLight) {
        const pulse = 1 + Math.sin(elapsed * 3.8) * 0.06;
        this.lanternLight.intensity = this.uvLightIntensity * 2.8 * pulse;
      }
      if (this.lanternLensMesh && this.lanternLensMesh.visible) {
        this.lanternLensMesh.material.emissiveIntensity = 0.35 + this.uvLightIntensity * 2.4;
      }
      if (this.lanternGlowMesh) {
        this.lanternGlowMesh.material.opacity = this.uvLightIntensity * 0.65;
      }

      // Spin lit receptor halos softly
      Object.keys(this.receptors).forEach(k => {
        const rec = this.receptors[k];
        if (rec.lit) {
          rec.halo.rotation.z = elapsed * 1.8;
          rec.spire.rotation.y = elapsed * 0.85;
          rec.spireMat.emissiveIntensity = 2.1 + Math.sin(elapsed * 4.5) * 0.35;
        }
      });

      // Slide secret optical drawer open smoothly when solved
      const targetDrawer = st.opticsSolved ? 1 : 0;
      if (Math.abs(targetDrawer - this.drawerProgress) > 0.001) {
        this.drawerProgress += (targetDrawer - this.drawerProgress) * Math.min(1, dt * 4.5);
        if (this.drawerGroup) {
          this.drawerGroup.position.z = 1.13 + this.drawerProgress * 0.34;
        }
      }

      // Subtle shimmer on uncollected orrery_crank
      if (this.crankMesh && this.crankMesh.visible) {
        this.crankMesh.rotation.z = 0.08 + Math.sin(elapsed * 2.2) * 0.04;
      }
    }
  };

  SR.Stations = SR.Stations || {};
  SR.Stations.optics = OpticsStation;
})(window.SR = window.SR || {});
