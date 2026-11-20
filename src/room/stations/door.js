/* ==========================================================================
   src/room/stations/door.js — Wall 0° (North): La Puerta del Eclipse (Finale)
   ========================================================================== */
(function (SR) {
  'use strict';

  SR.Stations = SR.Stations || {};

  const TWO_PI = Math.PI * 2;
  const STEP_RAD = Math.PI / 3; // 60 degrees per discrete stop (mod 6)

  const RELIC_SPECS = [
    {
      id: 'solar_gear',
      interactiveId: 'door_socket_solar_gear',
      name: 'Engranaje Solar',
      shortLabel: 'SOLAR',
      pos: [-0.99, 0.0, 0.085],
      radius: 0.135,
      glowColor: 0xffc84a,
      emptyHint: 'Engaste izquierdo con emblema solar. Aquí encaja la reliquia del Engranaje Solar.'
    },
    {
      id: 'lunar_lens',
      interactiveId: 'door_socket_lunar_lens',
      name: 'Lente Lunar',
      shortLabel: 'LUNAR',
      pos: [0.99, 0.0, 0.085],
      radius: 0.135,
      glowColor: 0x9ed8ff,
      emptyHint: 'Engaste derecho con media luna grabada. Aquí encaja la reliquia de la Lente Lunar.'
    },
    {
      id: 'umbral_prism',
      interactiveId: 'door_socket_umbral_prism',
      name: 'Prisma Umbral',
      shortLabel: 'UMBRAL',
      pos: [0.0, 0.0, 0.112],
      radius: 0.17,
      glowColor: 0xb774ff,
      emptyHint: 'Núcleo central de obsidiana. Aquí debe engastarse la tercera reliquia: el Prisma Umbral.'
    }
  ];

  const RING_SPECS = [
    {
      idx: 0,
      interactiveId: 'door_ring_0',
      name: 'Anillo Exterior',
      tag: 'EXT',
      innerR: 0.70,
      outerR: 0.84,
      z: 0.076,
      baseHue: '#b98c3e',
      darkHue: '#5f4318',
      coupleDesc: '+1 Exterior, +1 Medio'
    },
    {
      idx: 1,
      interactiveId: 'door_ring_1',
      name: 'Anillo Medio',
      tag: 'MED',
      innerR: 0.54,
      outerR: 0.68,
      z: 0.090,
      baseHue: '#c99b48',
      darkHue: '#6b4d1d',
      coupleDesc: '+1 Medio, +2 Interior'
    },
    {
      idx: 2,
      interactiveId: 'door_ring_2',
      name: 'Anillo Interior',
      tag: 'INT',
      innerR: 0.38,
      outerR: 0.52,
      z: 0.104,
      baseHue: '#d8ab54',
      darkHue: '#73531f',
      coupleDesc: '+1 Interior, +2 Exterior'
    }
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

  function allRelicsPlaced() {
    const r = SR.State.data.relicsPlaced;
    return !!(r && r.solar_gear && r.lunar_lens && r.umbral_prism);
  }

  function countRelicsPlaced() {
    const r = SR.State.data.relicsPlaced || {};
    return (r.solar_gear ? 1 : 0) + (r.lunar_lens ? 1 : 0) + (r.umbral_prism ? 1 : 0);
  }

  // ---- Canvas2D Texture Builders ----

  function createLintelPlaqueTexture() {
    return SR.Textures.makeCanvasTexture(1024, 180, function (ctx, w, h) {
      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#5a411d');
      grad.addColorStop(0.5, '#8f6b30');
      grad.addColorStop(1, '#503917');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#dfba69';
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.strokeStyle = '#2c1e0c';
      ctx.lineWidth = 2;
      ctx.strokeRect(22, 22, w - 44, h - 44);

      // Corner rivets
      [[34, 34], [w - 34, 34], [34, h - 34], [w - 34, h - 34]].forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 8, 0, TWO_PI);
        ctx.fillStyle = '#cfa754';
        ctx.fill();
        ctx.strokeStyle = '#2d1e0c';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      ctx.fillStyle = '#1d1207';
      ctx.font = 'bold 54px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('✦   PORTA ECLIPSIS   ✦', w / 2, h * 0.44);

      ctx.fillStyle = '#2a1b0b';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.fillText('OBSERVATORIO DE VALERIO DE SOLÍS • MDCCCXCIV', w / 2, h * 0.78);
    });
  }

  function createCouplingPlaqueTexture() {
    return SR.Textures.makeCanvasTexture(1024, 176, function (ctx, w, h) {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#85622a');
      grad.addColorStop(0.5, '#a8813c');
      grad.addColorStop(1, '#6a4c1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Brushed grain
      ctx.strokeStyle = 'rgba(255,240,190,0.08)';
      ctx.lineWidth = 1;
      for (let y = 4; y < h; y += 5) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      ctx.strokeStyle = '#e7c578';
      ctx.lineWidth = 5;
      ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#2b1c0b';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, w - 32, h - 32);

      // Rivets
      [[28, 28], [w - 28, 28], [28, h - 28], [w - 28, h - 28]].forEach(function (p) {
        ctx.beginPath();
        ctx.arc(p[0], p[1], 7, 0, TWO_PI);
        ctx.fillStyle = '#d9b360';
        ctx.fill();
        ctx.strokeStyle = '#261808';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      ctx.fillStyle = '#1b1106';
      ctx.font = 'bold 27px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('ENGRANAJE ACOPLADO — ALINEA LAS 3 CRESTAS EN EL CENIT ▲', w / 2, h * 0.34);

      ctx.fillStyle = '#120a03';
      ctx.font = 'bold 34px "Segoe UI", Georgia, sans-serif';
      ctx.fillText('EXT: +1 Ext, +1 Med   |   MED: +1 Med, +2 Int   |   INT: +1 Int, +2 Ext', w / 2, h * 0.71);
    });
  }

  function createRingTexture(spec) {
    return SR.Textures.makeCanvasTexture(1024, 1024, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const maxR = w * 0.5;
      const innerFrac = spec.innerR / spec.outerR;
      const midR = maxR * (0.5 + innerFrac * 0.5);

      ctx.clearRect(0, 0, w, h);

      // Metallic brass radial backdrop (rich burnished bronze-gold for crisp contrast)
      const grad = ctx.createRadialGradient(cx, cy, maxR * innerFrac * 0.95, cx, cy, maxR);
      grad.addColorStop(0, '#4a3312');
      grad.addColorStop(0.22, '#8b6628');
      grad.addColorStop(0.55, '#b68d40');
      grad.addColorStop(0.84, '#8b6628');
      grad.addColorStop(1, '#4a3312');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, maxR, 0, TWO_PI);
      ctx.fill();

      // Concentric engraved border lines
      ctx.strokeStyle = '#2b1c0a';
      ctx.lineWidth = 5;
      [maxR * 0.96, maxR * (innerFrac + 0.025)].forEach(function (r) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, TWO_PI);
        ctx.stroke();
      });

      // Fine degree ticks (36 around circle)
      for (let t = 0; t < 36; t++) {
        const a = (t / 36) * TWO_PI - Math.PI / 2;
        const isMajor = (t % 6 === 0);
        const r0 = maxR * (isMajor ? innerFrac + 0.02 : innerFrac + 0.04);
        const r1 = maxR * (isMajor ? 0.96 : 0.93);
        ctx.strokeStyle = isMajor ? '#1f1306' : 'rgba(35, 22, 8, 0.55)';
        ctx.lineWidth = isMajor ? 7 : 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
        ctx.stroke();
      }

      // 6 discrete sector glyphs/labels
      const sectorSymbols = ['☀', 'I', 'II', 'III', 'IV', 'V'];
      for (let i = 0; i < 6; i++) {
        const a = i * STEP_RAD - Math.PI / 2;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * midR, cy + Math.sin(a) * midR);
        ctx.rotate(a + Math.PI / 2);

        if (i === 0) {
          // Prominent Golden Eclipse Crest cartouche at 12 o'clock (Index 0)
          const boxW = maxR * 0.24;
          const boxH = maxR * (1 - innerFrac) * 0.78;
          ctx.fillStyle = '#201308';
          ctx.strokeStyle = '#ffdf88';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.roundRect(-boxW / 2, -boxH / 2, boxW, boxH, 12);
          ctx.fill();
          ctx.stroke();

          // Glowing golden eclipse sun/moon crest
          const cr = boxH * 0.34;
          ctx.beginPath();
          ctx.arc(0, 0, cr, 0, TWO_PI);
          ctx.fillStyle = '#ffd96e';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cr * 0.28, 0, cr * 0.72, 0, TWO_PI);
          ctx.fillStyle = '#24140a';
          ctx.fill();
        } else {
          // Engraved Roman stop markers
          ctx.fillStyle = '#1e1207';
          ctx.font = 'bold ' + Math.round(maxR * (1 - innerFrac) * 0.42) + 'px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(sectorSymbols[i], 0, 0);
        }
        ctx.restore();
      }

      // Subtle ring identifier engraved at 6 o'clock (offset slightly from III)
      const tagAngle = Math.PI / 6 - Math.PI / 2;
      ctx.save();
      ctx.translate(cx + Math.cos(tagAngle) * midR, cy + Math.sin(tagAngle) * midR);
      ctx.rotate(tagAngle + Math.PI / 2);
      ctx.fillStyle = 'rgba(28, 17, 7, 0.78)';
      ctx.font = 'bold ' + Math.round(maxR * (1 - innerFrac) * 0.30) + 'px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(spec.tag, 0, 0);
      ctx.restore();
    });
  }

  function createSocketLabelTexture(text) {
    return SR.Textures.makeCanvasTexture(256, 72, function (ctx, w, h) {
      ctx.fillStyle = '#7b5a25';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e5c171';
      ctx.lineWidth = 4;
      ctx.strokeRect(5, 5, w - 10, h - 10);
      ctx.fillStyle = '#190f05';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2 + 2);
    });
  }

  function createSocketIconTexture(id) {
    return SR.Textures.makeCanvasTexture(256, 256, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const bg = ctx.createRadialGradient(cx, cy, 15, cx, cy, 128);
      bg.addColorStop(0, '#19141c');
      bg.addColorStop(1, '#09070c');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(220, 178, 92, 0.65)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 108, 0, TWO_PI);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(240, 200, 115, 0.85)';
      ctx.fillStyle = 'rgba(240, 200, 115, 0.22)';
      ctx.lineWidth = 5;

      if (id === 'solar_gear') {
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * TWO_PI;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 52, cy + Math.sin(a) * 52);
          ctx.lineTo(cx + Math.cos(a) * 86, cy + Math.sin(a) * 86);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(cx, cy, 46, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();
      } else if (id === 'lunar_lens') {
        ctx.beginPath();
        ctx.arc(cx, cy, 62, 0, TWO_PI);
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 24, cy - 8, 52, 0, TWO_PI);
        ctx.fillStyle = '#0f0c14';
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx, cy - 78);
        ctx.lineTo(cx + 58, cy);
        ctx.lineTo(cx, cy + 78);
        ctx.lineTo(cx - 58, cy);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy - 78);
        ctx.lineTo(cx, cy + 78);
        ctx.moveTo(cx - 58, cy);
        ctx.lineTo(cx + 58, cy);
        ctx.stroke();
      }
    });
  }

  function createDawnPortalTexture() {
    return SR.Textures.makeCanvasTexture(512, 512, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h * 0.56;
      const grad = ctx.createRadialGradient(cx, cy, 20, cx, cy, w * 0.55);
      grad.addColorStop(0, '#fffdf2');
      grad.addColorStop(0.28, '#ffe69a');
      grad.addColorStop(0.62, '#f5a94c');
      grad.addColorStop(1, '#9b4a1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Sunburst rays
      ctx.save();
      ctx.translate(cx, cy);
      for (let i = 0; i < 24; i++) {
        ctx.rotate(TWO_PI / 24);
        ctx.fillStyle = 'rgba(255, 252, 224, 0.22)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(-14, -w * 0.6);
        ctx.lineTo(14, -w * 0.6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    });
  }

  // ---- 3D Relic Mesh Builders (seated in vault sockets) ----

  function buildSolarGearMesh() {
    const g = new THREE.Group();
    const goldMat = SR.Materials.get('gold').clone();
    goldMat.emissive = new THREE.Color(0xffaa22);
    goldMat.emissiveIntensity = 0.55;

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.016, 12, 32), goldMat);
    g.add(rim);

    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.072, 0.022, 24), goldMat);
    disc.rotation.x = Math.PI / 2;
    g.add(disc);

    // 16 Sun Gear Teeth
    const toothGeo = new THREE.BoxGeometry(0.018, 0.036, 0.02);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TWO_PI;
      const tooth = new THREE.Mesh(toothGeo, goldMat);
      tooth.position.set(Math.cos(a) * 0.105, Math.sin(a) * 0.105, 0);
      tooth.rotation.z = a - Math.PI / 2;
      g.add(tooth);
    }

    // Glowing solar amber core
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffd268,
      emissive: 0xffa820,
      emissiveIntensity: 1.5,
      roughness: 0.18,
      metalness: 0.2
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.036, 18, 18), coreMat);
    core.scale.set(1, 1, 0.55);
    core.position.z = 0.014;
    g.add(core);

    g.userData.glowMat = coreMat;
    g.userData.spinAxis = 'z';
    return g;
  }

  function buildLunarLensMesh() {
    const g = new THREE.Group();
    const silverMat = SR.Materials.get('silver').clone();
    silverMat.emissive = new THREE.Color(0x4c88c4);
    silverMat.emissiveIntensity = 0.35;

    const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(0.098, 0.015, 14, 32), silverMat);
    g.add(outerBezel);

    // Filigree cardinal claws
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TWO_PI;
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 10), silverMat);
      bead.position.set(Math.cos(a) * 0.102, Math.sin(a) * 0.102, 0.012);
      g.add(bead);
    }

    // Luminous lunar crystal lens
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xbce6ff,
      emissive: 0x6ec2ff,
      emissiveIntensity: 1.35,
      roughness: 0.1,
      metalness: 0.15,
      transparent: true,
      opacity: 0.92
    });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.084, 24, 18), lensMat);
    lens.scale.set(1, 1, 0.32);
    g.add(lens);

    // Silver crescent inlay across lens
    const crescent = new THREE.Mesh(
      new THREE.TorusGeometry(0.052, 0.011, 10, 24, Math.PI * 1.25),
      silverMat
    );
    crescent.rotation.z = Math.PI * 0.55;
    crescent.position.set(-0.01, 0, 0.028);
    g.add(crescent);

    g.userData.glowMat = lensMat;
    return g;
  }

  function buildUmbralPrismMesh() {
    const g = new THREE.Group();
    const goldMat = SR.Materials.get('gold').clone();
    goldMat.emissive = new THREE.Color(0x9a64ff);
    goldMat.emissiveIntensity = 0.3;

    // Golden meridian cage
    const cage1 = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.012, 12, 32), goldMat);
    g.add(cage1);
    const cage2 = new THREE.Mesh(new THREE.TorusGeometry(0.094, 0.008, 10, 24), goldMat);
    cage2.position.z = 0.025;
    g.add(cage2);

    // Faceted Obsidian-Violet Prism Core
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0x2c1648,
      emissive: 0x9e54ff,
      emissiveIntensity: 1.45,
      roughness: 0.14,
      metalness: 0.45,
      flatShading: true
    });
    const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.082, 0), prismMat);
    prism.scale.set(0.88, 1.15, 0.88);
    prism.position.z = 0.032;
    g.add(prism);

    // Tiny golden eclipse star rings around prism
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.064, 0.006, 8, 6), goldMat);
    collar.position.z = 0.035;
    g.add(collar);

    g.userData.glowMat = prismMat;
    g.userData.prismCore = prism;
    return g;
  }

  // ---- Station Module ----

  const DoorStation = {
    group: null,
    doorPivot: null,
    doorCenter: null,
    dawnLight: null,
    dawnMat: null,
    zenithJewelMat: null,
    bolts: [],
    rings: [],
    sockets: {},
    channelMats: [],
    openProgress: 0,
    victoryTimer: null,
    flashTriggered: false,

    init: function (scene) {
      const self = this;
      const wt = SR.ROOM.wallTransform(0, 0);

      const group = new THREE.Group();
      group.name = 'station_door';
      group.position.set(wt.x, 0, wt.z);
      group.rotation.y = wt.rotY;
      scene.add(group);
      this.group = group;

      const doorCenterY = 1.84;
      const doorRadius = 1.14;

      const matMahogany = SR.Materials.get('mahogany');
      const matSlate = SR.Materials.get('slate');
      const matDarkIron = SR.Materials.get('darkIron');
      const matIron = SR.Materials.get('iron');
      const matBrass = SR.Materials.get('brass');
      const matAgedBrass = SR.Materials.get('agedBrass');
      const matGold = SR.Materials.get('gold');

      // ---- 1. Architectural Surround & Stone Archway ----
      // Left & Right Stepped Stone/Mahogany Pilasters
      [-1.36, 1.36].forEach(function (px) {
        const plinth = new THREE.Mesh(makeBox(0.38, 0.34, 0.34, 0.02), matSlate);
        plinth.position.set(px, 0.17, 0.17);
        plinth.castShadow = true;
        plinth.receiveShadow = true;
        group.add(plinth);

        const shaft = new THREE.Mesh(makeBox(0.28, 2.75, 0.26, 0.015), matMahogany);
        shaft.position.set(px, 1.71, 0.14);
        shaft.castShadow = true;
        shaft.receiveShadow = true;
        group.add(shaft);

        // Brass vertical flute inlay
        const flute = new THREE.Mesh(new THREE.BoxGeometry(0.04, 2.42, 0.02), matAgedBrass);
        flute.position.set(px, 1.71, 0.275);
        group.add(flute);

        const capital = new THREE.Mesh(makeBox(0.36, 0.18, 0.32, 0.02), matAgedBrass);
        capital.position.set(px, 3.16, 0.16);
        group.add(capital);
      });

      // Upper Arch Entablature & Crown Molding
      const lintel = new THREE.Mesh(makeBox(3.08, 0.36, 0.30, 0.02), matMahogany);
      lintel.position.set(0, 3.38, 0.15);
      lintel.castShadow = true;
      group.add(lintel);

      const cornice = new THREE.Mesh(makeBox(3.22, 0.12, 0.38, 0.02), matAgedBrass);
      cornice.position.set(0, 3.60, 0.18);
      group.add(cornice);

      // Lintel Engraved Plaque ("PORTA ECLIPSIS")
      const lintelTex = createLintelPlaqueTexture();
      const lintelPlaqueMat = new THREE.MeshStandardMaterial({
        map: lintelTex,
        emissiveMap: lintelTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.16,
        roughness: 0.42,
        metalness: 0.55
      });
      const lintelPlaque = new THREE.Mesh(new THREE.PlaneGeometry(1.76, 0.30), lintelPlaqueMat);
      lintelPlaque.position.set(0, 3.38, 0.305);
      group.add(lintelPlaque);

      // Threshold Step under Vault Door
      const threshold = new THREE.Mesh(makeBox(2.54, 0.14, 0.46, 0.02), matSlate);
      threshold.position.set(0, 0.07, 0.23);
      threshold.receiveShadow = true;
      group.add(threshold);

      const brassStrip = new THREE.Mesh(new THREE.BoxGeometry(2.38, 0.025, 0.06), matBrass);
      brassStrip.position.set(0, 0.145, 0.42);
      group.add(brassStrip);

      // ---- 2. Recessed Golden Dawn Portal (behind the circular door) ----
      const dawnTex = createDawnPortalTexture();
      const dawnMat = new THREE.MeshBasicMaterial({
        map: dawnTex,
        color: new THREE.Color(0xfff1cc)
      });
      this.dawnMat = dawnMat;
      const dawnDisc = new THREE.Mesh(new THREE.CircleGeometry(doorRadius + 0.04, 48), dawnMat);
      dawnDisc.position.set(0, doorCenterY, 0.055);
      group.add(dawnDisc);

      // Warm Dawn PointLight (dormant until vault unlocks)
      const dawnLight = new THREE.PointLight(0xffcf70, 0, 10, 1.5);
      dawnLight.position.set(0, doorCenterY, 0.42);
      group.add(dawnLight);
      this.dawnLight = dawnLight;

      // Subtle warm top light illuminating the vault engravings without blowing out bloom
      const doorAccentLight = new THREE.PointLight(0xffd796, 0.58, 4.6, 2);
      doorAccentLight.position.set(0, 2.85, 1.35);
      group.add(doorAccentLight);

      // ---- 3. Heavy Circular Riveted Vault Frame ----
      const frameRing = new THREE.Mesh(
        new THREE.TorusGeometry(doorRadius + 0.09, 0.11, 16, 48),
        matDarkIron
      );
      frameRing.position.set(0, doorCenterY, 0.16);
      frameRing.castShadow = true;
      frameRing.receiveShadow = true;
      group.add(frameRing);

      const innerBrassCasing = new THREE.Mesh(
        new THREE.TorusGeometry(doorRadius + 0.02, 0.032, 12, 48),
        matAgedBrass
      );
      innerBrassCasing.position.set(0, doorCenterY, 0.21);
      group.add(innerBrassCasing);

      // 24 Heavy Frame Rivets
      const rivetGeo = new THREE.SphereGeometry(0.022, 8, 8);
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TWO_PI;
        const rv = new THREE.Mesh(rivetGeo, matIron);
        rv.position.set(
          Math.cos(a) * (doorRadius + 0.09),
          doorCenterY + Math.sin(a) * (doorRadius + 0.09),
          0.265
        );
        group.add(rv);
      }

      // Left Heavy Forged Barrel Hinges
      [-0.45, 0.45].forEach(function (hy) {
        const hingeBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.24, 14), matDarkIron);
        hingeBarrel.position.set(-doorRadius - 0.04, doorCenterY + hy, 0.24);
        group.add(hingeBarrel);

        const hingeCapTop = new THREE.Mesh(new THREE.SphereGeometry(0.058, 12, 12), matBrass);
        hingeCapTop.position.set(-doorRadius - 0.04, doorCenterY + hy + 0.12, 0.24);
        group.add(hingeCapTop);
      });

      // ---- 4. Hinged Circular Vault Door Group ----
      const doorPivot = new THREE.Group();
      doorPivot.position.set(-doorRadius, doorCenterY, 0.20);
      group.add(doorPivot);
      this.doorPivot = doorPivot;

      const doorCenter = new THREE.Group();
      doorCenter.position.set(doorRadius, 0, 0);
      doorPivot.add(doorCenter);
      this.doorCenter = doorCenter;

      // Main Riveted Iron Vault Bulkhead Disc
      const bulkhead = new THREE.Mesh(
        new THREE.CylinderGeometry(doorRadius, doorRadius, 0.12, 56),
        matDarkIron
      );
      bulkhead.rotation.x = Math.PI / 2;
      bulkhead.castShadow = true;
      bulkhead.receiveShadow = true;
      doorCenter.add(bulkhead);

      // Beveled Outer Brass Bezel Ring on Door Face
      const doorBezel = new THREE.Mesh(
        new THREE.TorusGeometry(doorRadius - 0.04, 0.036, 12, 56),
        matAgedBrass
      );
      doorBezel.position.z = 0.062;
      doorCenter.add(doorBezel);

      // Inner Backing Disc behind the 3 rotating rings
      const mechanismPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(0.88, 0.90, 0.03, 48),
        matIron
      );
      mechanismPlate.rotation.x = Math.PI / 2;
      mechanismPlate.position.z = 0.058;
      doorCenter.add(mechanismPlate);

      // Radial structural iron ribs + energy channels linking Left/Right sockets to center
      [-1, 1].forEach(function (side) {
        const channelMat = new THREE.MeshStandardMaterial({
          color: 0x6b5023,
          emissive: 0xffb838,
          emissiveIntensity: 0.0,
          roughness: 0.35,
          metalness: 0.7
        });
        self.channelMats.push(channelMat);
        const conduit = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.032, 0.025), channelMat);
        conduit.position.set(side * 0.85, 0, 0.065);
        doorCenter.add(conduit);
      });

      // ---- 5. 6 Heavy Radial Sliding Iron Deadbolts ----
      // Clockwise from 12 o'clock: 42°, 90°, 134°, 226°, 270°, 318° (clear of Zenith Pointer & Legend Plaque)
      this.bolts = [];
      const boltAnglesDeg = [42, 90, 134, 226, 270, 318];
      boltAnglesDeg.forEach(function (deg) {
        const rad = THREE.MathUtils.degToRad(90 - deg); // standard math angle from +X
        const holder = new THREE.Group();
        holder.rotation.z = rad;
        doorCenter.add(holder);

        // Fixed brass collar guide on outer door rim
        const collar = new THREE.Mesh(makeBox(0.11, 0.11, 0.09, 0.015), matAgedBrass);
        collar.position.set(doorRadius - 0.055, 0, 0.052);
        holder.add(collar);

        // Sliding heavy iron deadbolt bar
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.34, 14), matIron);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(doorRadius + 0.02, 0, 0.055);
        holder.add(bar);

        // Brass tip cap
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.04, 14), matBrass);
        tip.rotation.z = Math.PI / 2;
        tip.position.set(0.16, 0, 0);
        bar.add(tip);

        self.bolts.push({
          mesh: bar,
          extendedX: doorRadius + 0.02,
          retractedX: doorRadius - 0.20
        });
      });

      // ---- 6. Zenith Pointer Arrow at 12 o'clock ----
      const zenithGroup = new THREE.Group();
      zenithGroup.position.set(0, 0.885, 0.122);
      doorCenter.add(zenithGroup);

      const pointerCone = new THREE.Mesh(new THREE.ConeGeometry(0.068, 0.14, 4), matGold);
      pointerCone.rotation.z = Math.PI; // points straight down toward 12 o'clock notches
      pointerCone.rotation.y = Math.PI / 4;
      pointerCone.position.y = -0.02;
      zenithGroup.add(pointerCone);

      const pointerBack = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.026, 16), matAgedBrass);
      pointerBack.rotation.x = Math.PI / 2;
      pointerBack.position.y = 0.05;
      zenithGroup.add(pointerBack);

      const zenithJewelMat = new THREE.MeshStandardMaterial({
        color: 0xffd066,
        emissive: 0xffa822,
        emissiveIntensity: 0.35,
        roughness: 0.2,
        metalness: 0.25
      });
      this.zenithJewelMat = zenithJewelMat;
      const zenithJewel = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 14), zenithJewelMat);
      zenithJewel.position.set(0, 0.05, 0.02);
      zenithGroup.add(zenithJewel);

      // ---- 7. Coupling Legend Brass Plaque (below outer ring) ----
      const legendTex = createCouplingPlaqueTexture();
      const legendMat = new THREE.MeshStandardMaterial({
        map: legendTex,
        emissiveMap: legendTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.08,
        roughness: 0.48,
        metalness: 0.35
      });
      const legendBack = new THREE.Mesh(makeBox(1.18, 0.18, 0.026, 0.008), matAgedBrass);
      legendBack.position.set(0, -0.955, 0.102);
      doorCenter.add(legendBack);

      const legendFace = new THREE.Mesh(new THREE.PlaneGeometry(1.14, 0.158), legendMat);
      legendFace.position.set(0, -0.955, 0.117);
      doorCenter.add(legendFace);

      // ---- 8. 3 Concentric Coupled Brass Rings ----
      this.rings = [];
      RING_SPECS.forEach(function (spec) {
        const ringGroup = new THREE.Group();
        ringGroup.position.set(0, 0, spec.z);
        doorCenter.add(ringGroup);

        const tex = createRingTexture(spec);
        const faceMat = new THREE.MeshStandardMaterial({
          map: tex,
          emissiveMap: tex,
          emissive: new THREE.Color(0xffdfa0),
          emissiveIntensity: 0.06,
          roughness: 0.46,
          metalness: 0.48
        });

        const ringFace = new THREE.Mesh(
          new THREE.RingGeometry(spec.innerR, spec.outerR, 64),
          faceMat
        );
        ringGroup.add(ringFace);

        // Raised inner & outer brass rims for sculptural depth
        const rimMat = matGold.clone();
        const outerRim = new THREE.Mesh(
          new THREE.TorusGeometry(spec.outerR, 0.011, 10, 64),
          rimMat
        );
        ringGroup.add(outerRim);

        const innerRim = new THREE.Mesh(
          new THREE.TorusGeometry(spec.innerR, 0.010, 10, 64),
          rimMat
        );
        ringGroup.add(innerRim);

        // Raised 3D Golden Eclipse Crest Marker at 12 o'clock (index 0)
        const midR = (spec.innerR + spec.outerR) * 0.5;
        const crestMat = new THREE.MeshStandardMaterial({
          color: 0xffe082,
          emissive: 0xffb630,
          emissiveIntensity: 0.45,
          roughness: 0.22,
          metalness: 0.65
        });
        const crestWedge = new THREE.Mesh(
          new THREE.ConeGeometry(0.036, 0.075, 4),
          crestMat
        );
        crestWedge.rotation.y = Math.PI / 4;
        crestWedge.position.set(0, midR, 0.018);
        ringGroup.add(crestWedge);

        const crestGem = new THREE.Mesh(
          new THREE.SphereGeometry(0.022, 12, 12),
          crestMat
        );
        crestGem.position.set(0, midR - 0.018, 0.022);
        ringGroup.add(crestGem);

        const ringObj = {
          spec: spec,
          group: ringGroup,
          faceMat: faceMat,
          crestMat: crestMat,
          currentAngle: 0,
          targetAngle: 0,
          cfg: null
        };

        const cfg = {
          id: spec.interactiveId,
          station: 'door',
          activeViews: ['door'],
          action: 'Girar',
          label: spec.name + ' (' + spec.coupleDesc + ')',
          cursor: 'interact',
          highlightTarget: ringFace,
          onClick: function () {
            self.onRingClick(spec.idx);
          }
        };
        ringObj.cfg = cfg;
        SR.registerInteractive(ringGroup, cfg);
        self.rings.push(ringObj);
      });

      // ---- 9. 3 Relic Sockets (Left: Solar, Right: Lunar, Center: Umbral) ----
      this.sockets = {};
      RELIC_SPECS.forEach(function (spec) {
        const sGroup = new THREE.Group();
        sGroup.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
        doorCenter.add(sGroup);

        // Sculpted mounting boss housing
        const boss = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.radius + 0.028, spec.radius + 0.04, 0.055, 28),
          matAgedBrass
        );
        boss.rotation.x = Math.PI / 2;
        sGroup.add(boss);

        const bezelMat = matGold.clone();
        const bezel = new THREE.Mesh(
          new THREE.TorusGeometry(spec.radius + 0.006, 0.018, 12, 32),
          bezelMat
        );
        bezel.position.z = 0.032;
        sGroup.add(bezel);

        // Engraved recessed socket interior (placed cleanly in front of boss end z=0.0275!)
        const iconTex = createSocketIconTexture(spec.id);
        const recessMat = new THREE.MeshStandardMaterial({
          map: iconTex,
          emissiveMap: iconTex,
          emissive: new THREE.Color(spec.glowColor),
          emissiveIntensity: 0.32,
          roughness: 0.62,
          metalness: 0.25
        });
        const recess = new THREE.Mesh(new THREE.CircleGeometry(spec.radius - 0.004, 32), recessMat);
        recess.position.z = 0.030;
        sGroup.add(recess);

        // Crisp nameplate underneath socket
        const lblTex = createSocketLabelTexture(spec.shortLabel);
        const lblMat = new THREE.MeshStandardMaterial({
          map: lblTex,
          emissiveMap: lblTex,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.16,
          roughness: 0.42,
          metalness: 0.48
        });
        const lblPlate = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.06), lblMat);
        lblPlate.position.set(0, -(spec.radius + 0.068), 0.032);
        sGroup.add(lblPlate);

        // Seated 3D Relic Mesh (hidden until placed!)
        let relicMesh;
        if (spec.id === 'solar_gear') relicMesh = buildSolarGearMesh();
        else if (spec.id === 'lunar_lens') relicMesh = buildLunarLensMesh();
        else relicMesh = buildUmbralPrismMesh();

        relicMesh.position.set(0, 0, 0.044);
        relicMesh.visible = false;
        sGroup.add(relicMesh);

        // Invisible generous click cylinder so clicking socket is effortless
        const hitMat = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(
          new THREE.CylinderGeometry(spec.radius + 0.03, spec.radius + 0.03, 0.09, 18),
          hitMat
        );
        hitMesh.rotation.x = Math.PI / 2;
        hitMesh.position.z = 0.04;
        sGroup.add(hitMesh);

        const cfg = {
          id: spec.interactiveId,
          station: 'door',
          activeViews: ['door'],
          action: 'Examinar',
          label: 'Engaste: ' + spec.name,
          cursor: 'interact',
          highlightTarget: bezel,
          onClick: function () {
            self.onSocketClick(spec);
          }
        };
        SR.registerInteractive(sGroup, cfg);

        self.sockets[spec.id] = {
          spec: spec,
          group: sGroup,
          bezelMat: bezelMat,
          recessMat: recessMat,
          relicMesh: relicMesh,
          cfg: cfg
        };
      });

      // ---- 10. Overview Hitbox in 'room' view ----
      const overviewHit = new THREE.Mesh(
        new THREE.BoxGeometry(2.55, 2.75, 0.42),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      overviewHit.position.set(0, doorCenterY, 0.24);
      group.add(overviewHit);

      SR.registerInteractive(overviewHit, {
        id: 'door_focus',
        station: 'door',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'La Puerta del Eclipse',
        cursor: 'inspect',
        highlightTarget: doorBezel,
        onClick: function () {
          SR.Camera.goToView('door');
        }
      });

      // ---- 11. Register Camera View ----
      group.updateMatrixWorld(true);
      SR.Camera.registerView('door', {
        pos: toWorld(group, 0.0, 1.78, 3.12),
        target: toWorld(group, 0.0, 1.76, 0.20),
        fov: 58,
        title: 'La Puerta del Eclipse',
        subtitle: 'Coloca las 3 reliquias celestiales y alinea las crestas doradas en el cenit',
        parent: 'room'
      });

      // Keep socket cursors & labels reactive to selected inventory item
      SR.State.on('selectionChanged', function () {
        self.refreshInteractiveMeta();
      });

      this.syncFromState();
    },

    refreshInteractiveMeta: function () {
      const state = SR.State.data;
      const sel = state.selectedItem;
      const unlocked = allRelicsPlaced();

      RELIC_SPECS.forEach(function (spec) {
        const sObj = DoorStation.sockets[spec.id];
        if (!sObj) return;
        const placed = !!(state.relicsPlaced && state.relicsPlaced[spec.id]);
        if (placed) {
          updateInteractive(spec.interactiveId, sObj.cfg, {
            action: 'Colocada',
            label: spec.name + ' (Engastada)',
            cursor: 'interact'
          });
        } else if (sel === spec.id) {
          updateInteractive(spec.interactiveId, sObj.cfg, {
            action: 'Colocar',
            label: 'Colocar ' + spec.name,
            cursor: 'use'
          });
        } else {
          updateInteractive(spec.interactiveId, sObj.cfg, {
            action: 'Examinar',
            label: 'Engaste vacío: ' + spec.name,
            cursor: 'interact'
          });
        }
      });

      this.rings.forEach(function (rObj) {
        const posVal = (state.vaultRings && state.vaultRings[rObj.spec.idx]) || 0;
        const status = state.vaultSolved
          ? 'Alineado'
          : (unlocked ? ('Pos ' + posVal + '/6 • ' + rObj.spec.coupleDesc) : 'Bloqueado — Faltan reliquias');
        updateInteractive(rObj.spec.interactiveId, rObj.cfg, {
          action: unlocked && !state.vaultSolved ? 'Girar' : 'Examinar',
          label: rObj.spec.name + ' (' + status + ')',
          cursor: 'interact'
        });
      });
    },

    onSocketClick: function (spec) {
      const state = SR.State.data;
      if (state.relicsPlaced[spec.id]) {
        if (SR.UI) SR.UI.say('El ' + spec.name + ' ya brilla firmemente engastado en la Puerta del Eclipse.');
        return;
      }

      if (state.selectedItem === spec.id) {
        SR.State.removeItem(spec.id);
        state.relicsPlaced[spec.id] = true;
        if (SR.Audio) SR.Audio.playSolve();
        SR.State.emit('relicPlaced', spec.id);
        SR.State.save();

        const sObj = this.sockets[spec.id];
        if (sObj) sObj.relicMesh.visible = true;
        this.refreshInteractiveMeta();

        const count = countRelicsPlaced();
        if (count === 3) {
          if (SR.UI) {
            SR.UI.say('¡Las tres reliquias están engastadas! Los anillos concéntricos se desbloquean con un resplandor dorado: alinea sus tres crestas en el cenit.');
          }
        } else {
          if (SR.UI) {
            SR.UI.say('Has engastado el ' + spec.name + ' (' + count + '/3 reliquias colocadas).');
          }
        }
      } else {
        if (SR.Audio) SR.Audio.playClick(0.7);
        if (state.selectedItem) {
          const itemDef = SR.State.getItemDef(state.selectedItem);
          const itemName = itemDef ? itemDef.name : 'ese objeto';
          if (SR.UI) SR.UI.say(itemName + ' no encaja aquí. ' + spec.emptyHint);
        } else {
          if (SR.UI) SR.UI.say(spec.emptyHint);
        }
      }
    },

    onRingClick: function (ringIdx) {
      const state = SR.State.data;
      if (state.vaultSolved) {
        if (SR.UI) SR.UI.say('La Puerta del Eclipse ya ha cedido ante el amanecer.');
        return;
      }

      if (!allRelicsPlaced()) {
        if (SR.Audio) SR.Audio.playError();
        const rem = 3 - countRelicsPlaced();
        if (SR.UI) {
          SR.UI.say('Los anillos están bloqueados por un seguro interno. Aún faltan ' + rem + ' reliquia' + (rem > 1 ? 's' : '') + ' en la puerta.');
        }
        return;
      }

      const r = state.vaultRings;
      const deltas = [0, 0, 0];
      if (ringIdx === 0) {
        r[0] = (r[0] + 1) % 6;
        r[1] = (r[1] + 1) % 6;
        deltas[0] = 1;
        deltas[1] = 1;
      } else if (ringIdx === 1) {
        r[1] = (r[1] + 1) % 6;
        r[2] = (r[2] + 2) % 6;
        deltas[1] = 1;
        deltas[2] = 2;
      } else {
        r[2] = (r[2] + 1) % 6;
        r[0] = (r[0] + 2) % 6;
        deltas[2] = 1;
        deltas[0] = 2;
      }

      // Advance continuous clockwise target angles so transitions never spin backward
      for (let i = 0; i < 3; i++) {
        if (deltas[i] > 0) {
          this.rings[i].targetAngle -= deltas[i] * STEP_RAD;
        }
      }

      if (SR.Audio) SR.Audio.playGear(0.9 + ringIdx * 0.16);
      SR.State.save();
      this.refreshInteractiveMeta();

      if (r[0] === 0 && r[1] === 0 && r[2] === 0) {
        state.vaultSolved = true;
        state.escaped = true;
        SR.State.save();
        this.refreshInteractiveMeta();

        if (SR.Audio) SR.Audio.playVaultOpen();
        if (SR.UI) {
          SR.UI.say('¡Las tres crestas se alinean en el cenit! Los cerrojos ceden y la Puerta del Eclipse se abre hacia el amanecer...');
        }

        const self = this;
        if (this.victoryTimer) clearTimeout(this.victoryTimer);
        this.victoryTimer = setTimeout(function () {
          self.victoryTimer = null;
          if (!SR.State.data.escaped) return;
          if (SR.Screens && SR.Screens.showVictory) {
            SR.Screens.showVictory();
          }
          if (SR.UI && SR.UI.flash) {
            SR.UI.flash(false);
          }
        }, 2400);
      } else {
        if (SR.UI) {
          SR.UI.say('Anillos: Exterior ' + r[0] + ' • Medio ' + r[1] + ' • Interior ' + r[2] + ' (alinea los tres en 0).', 2600);
        }
      }
    },

    syncFromState: function () {
      const state = SR.State.data;
      if (this.victoryTimer) {
        clearTimeout(this.victoryTimer);
        this.victoryTimer = null;
      }
      this.flashTriggered = false;
      if (!state.vaultSolved && SR.UI && SR.UI.flash) {
        SR.UI.flash(false);
      }

      // Sync seated relic meshes
      RELIC_SPECS.forEach(function (spec) {
        const sObj = DoorStation.sockets[spec.id];
        if (!sObj) return;
        sObj.relicMesh.visible = !!(state.relicsPlaced && state.relicsPlaced[spec.id]);
      });

      // Sync ring rotations cleanly
      for (let i = 0; i < 3; i++) {
        const stop = (state.vaultRings && state.vaultRings[i]) || 0;
        const a = -stop * STEP_RAD;
        this.rings[i].currentAngle = a;
        this.rings[i].targetAngle = a;
        this.rings[i].group.rotation.z = a;
      }

      // Sync vault open state
      this.openProgress = state.vaultSolved ? 1 : 0;
      this.applyOpenPose(this.openProgress);
      this.refreshInteractiveMeta();
    },

    applyOpenPose: function (p) {
      // Phase 1 (0..0.38): 6 heavy radial deadbolts retract smoothly
      const boltT = Math.min(1, p / 0.38);
      const boltEase = boltT * boltT * (3 - 2 * boltT);
      for (let i = 0; i < this.bolts.length; i++) {
        const b = this.bolts[i];
        b.mesh.position.x = THREE.MathUtils.lerp(b.extendedX, b.retractedX, boltEase);
      }

      // Phase 2 (0.28..1.0): Massive circular door swings open revealing golden dawn light
      const swingT = Math.max(0, Math.min(1, (p - 0.28) / 0.72));
      const swingEase = 1 - Math.pow(1 - swingT, 3);
      if (this.doorPivot) {
        this.doorPivot.rotation.y = swingEase * 0.96; // ~55° open cleanly clear of camera
      }
      if (this.dawnLight) {
        this.dawnLight.intensity = swingEase * 6.5;
      }
    },

    update: function (dt, elapsed) {
      const state = SR.State.data;
      const unlocked = allRelicsPlaced();
      const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.8);

      // Animate ring rotations smoothly
      const lerpFactor = Math.min(1, dt * 8.5);
      for (let i = 0; i < this.rings.length; i++) {
        const rObj = this.rings[i];
        rObj.currentAngle += (rObj.targetAngle - rObj.currentAngle) * lerpFactor;
        rObj.group.rotation.z = rObj.currentAngle;

        const isAligned = unlocked && state.vaultRings[i] === 0;
        const targetGlow = isAligned ? (1.35 + pulse * 0.45) : (unlocked ? 0.42 : 0.14);
        rObj.crestMat.emissiveIntensity += (targetGlow - rObj.crestMat.emissiveIntensity) * Math.min(1, dt * 6);
      }

      // Subtle animation of seated relics & energy conduits
      for (let i = 0; i < RELIC_SPECS.length; i++) {
        const spec = RELIC_SPECS[i];
        const sObj = this.sockets[spec.id];
        if (!sObj) continue;
        const placed = !!(state.relicsPlaced && state.relicsPlaced[spec.id]);
        if (placed) {
          if (spec.id === 'solar_gear') {
            sObj.relicMesh.rotation.z = elapsed * 0.45;
          } else if (spec.id === 'umbral_prism' && sObj.relicMesh.userData.prismCore) {
            sObj.relicMesh.userData.prismCore.rotation.y = elapsed * 0.8;
          }
          if (sObj.relicMesh.userData.glowMat) {
            sObj.relicMesh.userData.glowMat.emissiveIntensity = 1.25 + pulse * 0.5;
          }
        }
      }

      // Conduit & Zenith jewel feedback
      const conduitTarget = state.vaultSolved ? 1.8 : (unlocked ? (0.65 + pulse * 0.3) : 0.0);
      for (let i = 0; i < this.channelMats.length; i++) {
        this.channelMats[i].emissiveIntensity += (conduitTarget - this.channelMats[i].emissiveIntensity) * Math.min(1, dt * 4);
      }
      if (this.zenithJewelMat) {
        const zTarget = state.vaultSolved ? 2.2 : (unlocked ? 0.8 + pulse * 0.35 : 0.25);
        this.zenithJewelMat.emissiveIntensity += (zTarget - this.zenithJewelMat.emissiveIntensity) * Math.min(1, dt * 5);
      }

      // Vault door opening sequence
      if (state.vaultSolved && this.openProgress < 1) {
        this.openProgress = Math.min(1, this.openProgress + dt / 2.15);
        this.applyOpenPose(this.openProgress);
        if (this.openProgress > 0.62 && !this.flashTriggered) {
          this.flashTriggered = true;
          if (SR.UI && SR.UI.flash) SR.UI.flash(true);
        }
      }
    }
  };

  SR.Stations.door = DoorStation;
})(window.SR = window.SR || {});
