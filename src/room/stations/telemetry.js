/* ==========================================================================
   src/room/stations/telemetry.js — Wall 270° (West): Telemetría y Caja Fuerte
   Puzzles A2 (Válvulas de Vapor), B2a (Disco Cifrador) & B2b (Caja Fuerte)
   ========================================================================== */
(function (SR) {
  'use strict';

  const GAUGE_BASE = [1, 0, 1, 1];
  const VALVE_MATRIX = [
    [1, 1, 0, 0], // V1: I + II
    [0, 1, 1, 1], // V2: II + III + IV
    [1, 0, 2, 0], // V3: I + 2×III
    [0, 1, 0, 2]  // V4: II + 2×IV
  ];
  const VALVE_LEGENDS = ['I + II', 'II + III + IV', 'I + 2×III', 'II + 2×IV'];
  const ROMAN_4 = ['I', 'II', 'III', 'IV'];

  // 10 clockwise outer cipher ring symbols (indices 0..9)
  const CIPHER_SYMBOLS = [
    { key: 'sun',     glyph: '☉', name: 'Sol' },
    { key: 'moon',    glyph: '☽', name: 'Luna' },
    { key: 'mercury', glyph: '☿', name: 'Mercurio' },
    { key: 'venus',   glyph: '♀', name: 'Venus' },
    { key: 'mars',    glyph: '♂', name: 'Marte' },
    { key: 'jupiter', glyph: '♃', name: 'Júpiter' },
    { key: 'saturn',  glyph: '♄', name: 'Saturno' },
    { key: 'uranus',  glyph: '⛢', name: 'Urano' },
    { key: 'neptune', glyph: '♆', name: 'Neptuno' },
    { key: 'comet',   glyph: '★', name: 'Cometa' }
  ];

  const SAFE_CODE = [8, 2, 4, 9];

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

  function computeGauges(valves) {
    const g = GAUGE_BASE.slice();
    for (let v = 0; v < 4; v++) {
      const lvl = valves[v] || 0;
      for (let m = 0; m < 4; m++) {
        g[m] += VALVE_MATRIX[v][m] * lvl;
      }
    }
    return g;
  }

  // Crisp custom vector renderer for all 10 astronomical cipher symbols
  function drawCipherSymbol(ctx, key, x, y, r) {
    ctx.save();
    ctx.translate(x, y);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    switch (key) {
      case 'sun': // ☉
        ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.16, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'moon': // ☽
        ctx.arc(r * 0.12, 0, r * 0.70, -Math.PI * 0.56, Math.PI * 0.56, false);
        ctx.arc(-r * 0.24, 0, r * 0.62, Math.PI * 0.44, -Math.PI * 0.44, true);
        ctx.closePath();
        ctx.stroke();
        break;
      case 'mercury': // ☿
        ctx.arc(0, -r * 0.06, r * 0.40, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, -r * 0.68, r * 0.34, Math.PI * 0.15, Math.PI * 0.85);
        ctx.moveTo(0, r * 0.34);
        ctx.lineTo(0, r * 0.94);
        ctx.moveTo(-r * 0.36, r * 0.66);
        ctx.lineTo(r * 0.36, r * 0.66);
        ctx.stroke();
        break;
      case 'venus': // ♀
        ctx.arc(0, -r * 0.24, r * 0.44, 0, Math.PI * 2);
        ctx.moveTo(0, r * 0.20);
        ctx.lineTo(0, r * 0.94);
        ctx.moveTo(-r * 0.38, r * 0.60);
        ctx.lineTo(r * 0.38, r * 0.60);
        ctx.stroke();
        break;
      case 'mars': // ♂
        ctx.arc(-r * 0.15, r * 0.18, r * 0.44, 0, Math.PI * 2);
        ctx.moveTo(r * 0.16, -r * 0.13);
        ctx.lineTo(r * 0.72, -r * 0.68);
        ctx.moveTo(r * 0.28, -r * 0.68);
        ctx.lineTo(r * 0.72, -r * 0.68);
        ctx.lineTo(r * 0.72, -r * 0.24);
        ctx.stroke();
        break;
      case 'jupiter': // ♃
        ctx.moveTo(-r * 0.56, -r * 0.52);
        ctx.bezierCurveTo(-r * 0.02, -r * 0.82, r * 0.18, -r * 0.22, -r * 0.48, r * 0.22);
        ctx.lineTo(r * 0.68, r * 0.22);
        ctx.moveTo(r * 0.28, -r * 0.70);
        ctx.lineTo(r * 0.28, r * 0.88);
        ctx.stroke();
        break;
      case 'saturn': // ♄
        ctx.moveTo(-r * 0.46, -r * 0.56);
        ctx.lineTo(r * 0.10, -r * 0.56);
        ctx.moveTo(-r * 0.18, -r * 0.88);
        ctx.lineTo(-r * 0.18, r * 0.66);
        ctx.moveTo(-r * 0.18, -r * 0.04);
        ctx.bezierCurveTo(r * 0.52, -r * 0.38, r * 0.66, r * 0.32, r * 0.18, r * 0.68);
        ctx.quadraticCurveTo(r * 0.04, r * 0.86, r * 0.42, r * 0.90);
        ctx.stroke();
        break;
      case 'uranus': // ⛢ (classic astronomical Uranus: circle+dot with upward arrow)
        ctx.arc(0, r * 0.28, r * 0.42, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, r * 0.28, r * 0.11, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.14);
        ctx.lineTo(0, -r * 0.88);
        ctx.moveTo(-r * 0.28, -r * 0.54);
        ctx.lineTo(0, -r * 0.88);
        ctx.lineTo(r * 0.28, -r * 0.54);
        ctx.stroke();
        break;
      case 'neptune': // ♆
        ctx.moveTo(0, -r * 0.78);
        ctx.lineTo(0, r * 0.92);
        ctx.moveTo(-r * 0.38, r * 0.52);
        ctx.lineTo(r * 0.38, r * 0.52);
        ctx.moveTo(-r * 0.58, -r * 0.62);
        ctx.quadraticCurveTo(-r * 0.58, r * 0.16, 0, r * 0.16);
        ctx.quadraticCurveTo(r * 0.58, r * 0.16, r * 0.58, -r * 0.62);
        ctx.stroke();
        break;
      case 'comet': // ★ (5-point crisp star)
        for (let i = 0; i < 10; i++) {
          const rad = i % 2 === 0 ? r * 0.86 : r * 0.37;
          const a = (i * Math.PI) / 5 - Math.PI / 2;
          const px = Math.cos(a) * rad;
          const py = Math.sin(a) * rad;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      default:
        break;
    }
    ctx.restore();
  }

  function createHeaderPlaqueTexture(text, subtext) {
    return SR.Textures.makeCanvasTexture(1024, 144, (ctx, w, h) => {
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#443218');
      grad.addColorStop(0.5, '#2b1f0e');
      grad.addColorStop(1, '#1c1308');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#d4a94f';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      ctx.strokeStyle = 'rgba(212, 169, 79, 0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(20, 20, w - 40, h - 40);

      // Corner brass rivets
      [[34, 34], [w - 34, 34], [34, h - 34], [w - 34, h - 34]].forEach(([rx, ry]) => {
        ctx.fillStyle = '#e5be6b';
        ctx.beginPath();
        ctx.arc(rx, ry, 7, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.fillStyle = '#f2d282';
      ctx.font = 'bold 40px Georgia, "Times New Roman", serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, w * 0.5, subtext ? 74 : 88);
      if (subtext) {
        ctx.fillStyle = '#c8a65a';
        ctx.font = 'italic 22px Georgia, serif';
        ctx.fillText(subtext, w * 0.5, 112);
      }
    });
  }

  function createManometerScaleTexture(roman) {
    return SR.Textures.makeCanvasTexture(220, 512, (ctx, w, h) => {
      ctx.fillStyle = '#181410';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#b98f3f';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      // Top Roman numeral header
      ctx.fillStyle = '#f2cf7e';
      ctx.font = 'bold 42px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText(roman, w * 0.5, 52);

      // Graduations 0..7 matching liquid column bottom..top
      const topY = 86;
      const botY = h - 34;
      const step = (botY - topY) / 7;

      // Golden target band at level 4
      const y4 = botY - 4 * step;
      ctx.fillStyle = 'rgba(235, 185, 62, 0.28)';
      ctx.fillRect(14, y4 - 16, w - 28, 32);
      ctx.strokeStyle = '#ffd566';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(14, y4);
      ctx.lineTo(w - 14, y4);
      ctx.stroke();

      for (let lvl = 0; lvl <= 7; lvl++) {
        const y = botY - lvl * step;
        const isTarget = lvl === 4;
        ctx.strokeStyle = isTarget ? '#ffe285' : '#b79148';
        ctx.lineWidth = isTarget ? 4 : 2.5;
        ctx.beginPath();
        ctx.moveTo(18, y);
        ctx.lineTo(54, y);
        ctx.moveTo(w - 54, y);
        ctx.lineTo(w - 18, y);
        ctx.stroke();

        ctx.fillStyle = isTarget ? '#ffe89a' : '#d8ba76';
        ctx.font = isTarget ? 'bold 30px Georgia, serif' : 'bold 24px Georgia, serif';
        ctx.textAlign = 'left';
        ctx.fillText(String(lvl), 20, y - 6);
        ctx.textAlign = 'right';
        ctx.fillText(isTarget ? '4★' : String(lvl), w - 18, y - 6);
      }
    });
  }

  function createValveLegendTexture() {
    return SR.Textures.makeCanvasTexture(1024, 160, (ctx, w, h) => {
      ctx.fillStyle = '#201810';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c89e48';
      ctx.lineWidth = 6;
      ctx.strokeRect(6, 6, w - 12, h - 12);

      const colW = w / 4;
      for (let i = 0; i < 4; i++) {
        const cx = colW * (i + 0.5);
        if (i > 0) {
          ctx.strokeStyle = 'rgba(200, 158, 72, 0.45)';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(colW * i, 14);
          ctx.lineTo(colW * i, h - 14);
          ctx.stroke();
        }
        ctx.fillStyle = '#f3d182';
        ctx.font = 'bold 34px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.fillText('V' + (i + 1), cx, 58);

        ctx.fillStyle = '#e7c676';
        ctx.font = 'bold 32px Georgia, serif';
        ctx.fillText(VALVE_LEGENDS[i], cx, 118);
      }
    });
  }

  function createCipherOuterTexture() {
    return SR.Textures.makeCanvasTexture(1024, 1024, (ctx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rOut = w * 0.49;
      const rIn = w * 0.315;

      ctx.clearRect(0, 0, w, h);

      // Aged brass annular disc
      const grad = ctx.createRadialGradient(cx, cy, rIn, cx, cy, rOut);
      grad.addColorStop(0, '#2a2013');
      grad.addColorStop(0.15, '#5b4322');
      grad.addColorStop(0.75, '#3b2b15');
      grad.addColorStop(1, '#24190c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
      ctx.fill();

      // Inner dark well recess
      ctx.fillStyle = '#12100e';
      ctx.beginPath();
      ctx.arc(cx, cy, rIn, 0, Math.PI * 2);
      ctx.fill();

      // Concentric engraved brass rings
      [rOut - 8, rOut - 22, rIn + 10, rIn].forEach((rr, idx) => {
        ctx.strokeStyle = idx % 2 === 0 ? '#e3bd68' : 'rgba(227, 189, 104, 0.45)';
        ctx.lineWidth = idx === 0 ? 7 : 3;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      });

      // 10 clockwise sector boundaries & crisp vector symbols
      const step = (Math.PI * 2) / 10;
      const rSym = (rOut + rIn) * 0.50;
      for (let k = 0; k < 10; k++) {
        // Sector divider halfway between k and k+1
        const divA = (k + 0.5) * step;
        ctx.strokeStyle = 'rgba(227, 189, 104, 0.55)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(divA) * (rIn + 6), cy - Math.cos(divA) * (rIn + 6));
        ctx.lineTo(cx + Math.sin(divA) * (rOut - 18), cy - Math.cos(divA) * (rOut - 18));
        ctx.stroke();

        // Symbol center at clockwise angle k * 36° from 12 o'clock
        const a = k * step;
        const sx = cx + Math.sin(a) * rSym;
        const sy = cy - Math.cos(a) * rSym;

        // Subtle crimson-gold highlight medallion for ★ (Cometa, idx 9)
        if (k === 9) {
          ctx.fillStyle = 'rgba(165, 42, 42, 0.58)';
          ctx.beginPath();
          ctx.arc(sx, sy, 52, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#ffdf85';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Alignment notch right on inner border pointing straight to the matching digit!
        const nx = cx + Math.sin(a) * (rIn + 2);
        const ny = cy - Math.cos(a) * (rIn + 2);
        ctx.fillStyle = k === 9 ? '#ffe68c' : '#e6c270';
        ctx.beginPath();
        ctx.arc(nx, ny, 7, 0, Math.PI * 2);
        ctx.fill();

        // Draw crisp vector astronomical glyph oriented radially or upright
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(a);
        ctx.strokeStyle = k === 9 ? '#fff0a8' : '#f6d88b';
        ctx.fillStyle = k === 9 ? '#fff0a8' : '#f6d88b';
        ctx.lineWidth = 6.5;
        drawCipherSymbol(ctx, CIPHER_SYMBOLS[k].key, 0, 0, 38);
        ctx.restore();
      }
    });
  }

  function createCipherInnerTexture() {
    return SR.Textures.makeCanvasTexture(768, 768, (ctx, w, h) => {
      const cx = w * 0.5;
      const cy = h * 0.5;
      const rOut = w * 0.485;

      ctx.clearRect(0, 0, w, h);

      // Rich burnished golden-brass inner wheel
      const grad = ctx.createRadialGradient(cx, cy, 24, cx, cy, rOut);
      grad.addColorStop(0, '#c89d47');
      grad.addColorStop(0.28, '#8a6427');
      grad.addColorStop(0.60, '#5a3f18');
      grad.addColorStop(0.95, '#3b290f');
      grad.addColorStop(1, '#261a0a');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rOut, 0, Math.PI * 2);
      ctx.fill();

      // Concentric filigree rings
      [rOut - 6, rOut - 18, rOut * 0.44, rOut * 0.24].forEach((rr, idx) => {
        ctx.strokeStyle = idx === 0 ? '#f6d786' : 'rgba(240, 206, 125, 0.55)';
        ctx.lineWidth = idx === 0 ? 7 : 3;
        ctx.beginPath();
        ctx.arc(cx, cy, rr, 0, Math.PI * 2);
        ctx.stroke();
      });

      const step = (Math.PI * 2) / 10;
      const rNum = rOut * 0.72;
      for (let d = 0; d < 10; d++) {
        // Divider line halfway between digits
        const divA = (d + 0.5) * step;
        ctx.strokeStyle = 'rgba(240, 206, 125, 0.48)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(divA) * (rOut * 0.44), cy - Math.cos(divA) * (rOut * 0.44));
        ctx.lineTo(cx + Math.sin(divA) * (rOut - 12), cy - Math.cos(divA) * (rOut - 12));
        ctx.stroke();

        // Outward golden pointer tick at exact digit angle d * 36°
        const a = d * step;
        ctx.strokeStyle = '#ffea9c';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(cx + Math.sin(a) * (rOut - 34), cy - Math.cos(a) * (rOut - 34));
        ctx.lineTo(cx + Math.sin(a) * (rOut - 6), cy - Math.cos(a) * (rOut - 6));
        ctx.stroke();

        // Large high-contrast digit d
        ctx.save();
        ctx.translate(cx + Math.sin(a) * rNum, cy - Math.cos(a) * rNum);
        ctx.rotate(a);
        ctx.fillStyle = '#fff1bb';
        ctx.font = 'bold 76px Georgia, "Times New Roman", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(d), 0, 4);
        ctx.restore();
      }
    });
  }

  function makeTumblerCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 176;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return { canvas, ctx: canvas.getContext('2d'), tex };
  }

  function drawTumblerDigit(tObj, digit) {
    const { ctx, canvas, tex } = tObj;
    const w = canvas.width;
    const h = canvas.height;
    const prev = (digit + 9) % 10;
    const next = (digit + 1) % 10;

    // Cylindrical vertical shading gradient (obsidian-brass roller)
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#070709');
    grad.addColorStop(0.22, '#1a1612');
    grad.addColorStop(0.5, '#2b241a');
    grad.addColorStop(0.78, '#1a1612');
    grad.addColorStop(1, '#070709');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle brass frame lines around active center digit
    ctx.strokeStyle = 'rgba(232, 189, 98, 0.65)';
    ctx.lineWidth = 3;
    ctx.strokeRect(5, 42, w - 10, h - 84);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Dim previous & next digits peeking above/below
    ctx.fillStyle = 'rgba(205, 174, 108, 0.32)';
    ctx.font = 'bold 34px Georgia, serif';
    ctx.fillText(String(prev), w * 0.5, 22);
    ctx.fillText(String(next), w * 0.5, h - 22);

    // Bold glowing active center digit
    ctx.fillStyle = '#ffe596';
    ctx.font = 'bold 82px Georgia, "Times New Roman", serif';
    ctx.fillText(String(digit), w * 0.5, h * 0.5 + 3);

    tex.needsUpdate = true;
  }

  function createValveWheelMesh(mats) {
    const g = new THREE.Group();
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.011, 10, 24), mats.brass);
    rim.castShadow = true;
    g.add(rim);

    // 4 radial spokes
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.132, 8), mats.agedBrass);
      sp.rotation.z = (i * Math.PI) / 4;
      g.add(sp);
    }

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.022, 0.028, 12), mats.gold);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);

    // Red-gold indicator marker on top spoke so wheel rotation is super legible
    const pip = new THREE.Mesh(
      new THREE.SphereGeometry(0.013, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xd93829, emissive: 0x6b140d, roughness: 0.35, metalness: 0.3 })
    );
    pip.position.set(0, 0.068, 0.010);
    g.add(pip);

    return g;
  }

  function createClockWeightMesh(mats) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.046, 0.20, 18), mats.agedBrass);
    body.castShadow = true;
    g.add(body);

    [-0.065, 0.0, 0.065].forEach(y => {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.005, 8, 18), mats.gold);
      band.rotation.x = Math.PI / 2;
      band.position.y = y;
      g.add(band);
    });

    const capTop = new THREE.Mesh(new THREE.ConeGeometry(0.044, 0.036, 18), mats.gold);
    capTop.position.y = 0.118;
    g.add(capTop);

    const capBot = new THREE.Mesh(new THREE.ConeGeometry(0.046, 0.030, 18), mats.agedBrass);
    capBot.rotation.x = Math.PI;
    capBot.position.y = -0.115;
    g.add(capBot);

    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.020, 0.005, 8, 16), mats.gold);
    hook.position.y = 0.148;
    g.add(hook);

    return g;
  }

  function createLunarLensMesh(mats) {
    const g = new THREE.Group();
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.010, 12, 28), mats.silver);
    g.add(outerRing);

    // Sculpted silver crescent cradle
    const crescent = new THREE.Mesh(new THREE.TorusGeometry(0.056, 0.014, 10, 24, Math.PI * 1.25), mats.silver);
    crescent.rotation.z = 0.65;
    g.add(crescent);

    // Glowing silver-blue crystal lunar lens
    const lensMat = new THREE.MeshStandardMaterial({
      color: 0xaad8ff,
      emissive: 0x62b2ff,
      emissiveIntensity: 1.45,
      roughness: 0.08,
      metalness: 0.15,
      transparent: true,
      opacity: 0.88
    });
    const lens = new THREE.Mesh(new THREE.SphereGeometry(0.054, 24, 16), lensMat);
    lens.scale.set(1, 1, 0.36);
    g.add(lens);

    return g;
  }

  function createQuartzSplitterPickupMesh(mats) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.022, 16), mats.gold);
    base.position.y = -0.052;
    g.add(base);

    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.008, 10, 24), mats.brass);
    ring.position.y = 0.012;
    g.add(ring);

    const qMat = new THREE.MeshStandardMaterial({
      color: 0xd9f7ff,
      emissive: 0x7ae2ff,
      emissiveIntensity: 1.1,
      roughness: 0.06,
      metalness: 0.2,
      transparent: true,
      opacity: 0.78
    });
    const prism = new THREE.Mesh(new THREE.OctahedronGeometry(0.045, 0), qMat);
    prism.scale.set(0.92, 1.15, 0.35);
    prism.position.y = 0.012;
    g.add(prism);

    return g;
  }

  const TelemetryStation = {
    group: null,
    // Valves subsystem
    gauges: [],
    valves: [],
    hatchPivot: null,
    hatchBolts: [],
    hatchProgress: 0,
    clockWeightMesh: null,
    clockWeightHit: null,
    clockWeightCfg: null,
    // Cipher subsystem
    cipherInnerGroup: null,
    cipherCurrentAngle: 0,
    cipherTargetAngle: 0,
    cipherCfg: null,
    // Safe subsystem
    safeDoorPivot: null,
    safeBolts: [],
    safeDoorProgress: 0,
    safeHandleGroup: null,
    safeHandleAngle: 0,
    safeHandleShake: 0,
    safeLight: null,
    safeDials: [],
    safeHandleCfg: null,
    safeHandleHit: null,
    lunarLensMesh: null,
    lunarLensHit: null,
    lunarLensCfg: null,
    splitterMesh: null,
    splitterHit: null,
    splitterCfg: null,

    init(scene) {
      const mats = {
        mahogany: SR.Materials.get('mahogany'),
        darkWood: SR.Materials.get('darkWood'),
        slate: SR.Materials.get('slate'),
        brass: SR.Materials.get('brass'),
        agedBrass: SR.Materials.get('agedBrass'),
        gold: SR.Materials.get('gold'),
        copper: SR.Materials.get('copper'),
        iron: SR.Materials.get('iron'),
        darkIron: SR.Materials.get('darkIron'),
        velvet: SR.Materials.get('velvet'),
        glass: SR.Materials.get('glass'),
        silver: SR.Materials.get('silver')
      };

      const wt = SR.ROOM.wallTransform(270, 0);
      const group = new THREE.Group();
      group.name = 'Station_Telemetry';
      group.position.set(wt.x, 0, wt.z);
      group.rotation.y = wt.rotY;
      scene.add(group);
      this.group = group;

      this._buildCabinetFrame(group, mats);
      this._buildSteamValves(group, mats);
      this._buildCipherWheel(group, mats);
      this._buildBrassSafe(group, mats);

      // Register camera views (framed cleanly between top HUD banner and bottom inventory dock)
      SR.Camera.registerView('telemetry', {
        pos: localToWorldArr(group, 0.0, 1.28, 2.98),
        target: localToWorldArr(group, 0.0, 1.24, 0.42),
        fov: 54,
        title: 'Gabinete de Telemetría y Caja Fuerte',
        subtitle: 'Consola de presión de vapor, Disco Cifrador Zodiacal y Caja Fuerte de Latón',
        parent: 'room'
      });

      SR.Camera.registerView('valves', {
        pos: localToWorldArr(group, -0.55, 1.24, 2.86),
        target: localToWorldArr(group, -0.55, 1.22, 0.54),
        fov: 52,
        title: 'Consola de Presión de Vapor',
        subtitle: 'Equilibra los cuatro manómetros exactamente en la marca dorada 4',
        parent: 'telemetry'
      });

      SR.Camera.registerView('cipher', {
        pos: localToWorldArr(group, 0.54, 1.76, 1.98),
        target: localToWorldArr(group, 0.54, 1.76, 0.60),
        fov: 48,
        title: 'Disco Cifrador Zodiacal',
        subtitle: 'Alinea el disco móvil de dígitos con los símbolos celestiales',
        parent: 'telemetry'
      });

      SR.Camera.registerView('safe', {
        pos: localToWorldArr(group, 0.54, 0.72, 2.34),
        target: localToWorldArr(group, 0.54, 0.71, 0.56),
        fov: 48,
        title: 'Caja Fuerte de Latón',
        subtitle: 'Introduce la combinación de cuatro dígitos y gira el volante de apertura',
        parent: 'telemetry'
      });

      // Subtle warm console overhead accent light so brass dials & riveted safe gleam richly
      const consoleLight = new THREE.PointLight(0xffd28c, 0.65, 2.8, 2);
      consoleLight.position.set(0, 2.28, 1.05);
      group.add(consoleLight);

      // Macro room-view hitbox -> 'telemetry'
      const macroHit = new THREE.Mesh(new THREE.BoxGeometry(2.24, 2.34, 0.68), makeHitboxMat());
      macroHit.position.set(0, 1.18, 0.35);
      group.add(macroHit);
      SR.registerInteractive(macroHit, {
        id: 'telemetry_console_zoom',
        station: 'telemetry',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'Gabinete de Telemetría y Caja Fuerte',
        cursor: 'inspect',
        highlightTarget: this.cabinetHighlight,
        onClick: () => {
          SR.Audio.playClick(0.95);
          SR.Camera.goToView('telemetry');
        }
      });

      // Sub-zone zoom hitboxes in 'telemetry' overview
      const valvesZoom = new THREE.Mesh(new THREE.BoxGeometry(1.00, 1.94, 0.24), makeHitboxMat());
      valvesZoom.position.set(-0.55, 1.16, 0.64);
      group.add(valvesZoom);
      SR.registerInteractive(valvesZoom, {
        id: 'telemetry_zoom_valves',
        station: 'telemetry',
        activeViews: ['telemetry'],
        action: 'Examinar',
        label: 'Consola de Presión de Vapor',
        cursor: 'inspect',
        highlightTarget: this.valvesHighlightTarget,
        onClick: () => {
          SR.Audio.playClick(1.0);
          SR.Camera.goToView('valves');
        }
      });

      const cipherZoom = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.84, 0.18), makeHitboxMat());
      cipherZoom.position.set(0.54, 1.74, 0.64);
      group.add(cipherZoom);
      SR.registerInteractive(cipherZoom, {
        id: 'telemetry_zoom_cipher',
        station: 'telemetry',
        activeViews: ['telemetry'],
        action: 'Examinar',
        label: 'Disco Cifrador Zodiacal',
        cursor: 'inspect',
        highlightTarget: this.cipherHighlightTarget,
        onClick: () => {
          SR.Audio.playClick(1.0);
          SR.Camera.goToView('cipher');
        }
      });

      const safeZoom = new THREE.Mesh(new THREE.BoxGeometry(0.94, 1.00, 0.22), makeHitboxMat());
      safeZoom.position.set(0.54, 0.69, 0.64);
      group.add(safeZoom);
      SR.registerInteractive(safeZoom, {
        id: 'telemetry_zoom_safe',
        station: 'telemetry',
        activeViews: ['telemetry'],
        action: 'Examinar',
        label: 'Caja Fuerte de Latón',
        cursor: 'inspect',
        highlightTarget: this.safeHighlightTarget,
        onClick: () => {
          SR.Audio.playClick(1.0);
          SR.Camera.goToView('safe');
        }
      });

      this.syncFromState();
    },

    _buildCabinetFrame(group, mats) {
      const cab = new THREE.Group();
      group.add(cab);

      // Base plinth
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.18, 0.64), mats.darkWood);
      plinth.position.set(0, 0.09, 0.34);
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      cab.add(plinth);

      // Solid back wall of cabinet
      const backSlab = new THREE.Mesh(new THREE.BoxGeometry(2.20, 2.12, 0.14), mats.slate);
      backSlab.position.set(0, 1.24, 0.10);
      cab.add(backSlab);

      // Upper section body (above bottom chambers, Y = 1.20 .. 2.26)
      const upperBody = new THREE.Mesh(new THREE.BoxGeometry(2.16, 1.06, 0.42), mats.slate);
      upperBody.position.set(0, 1.73, 0.38);
      upperBody.castShadow = true;
      upperBody.receiveShadow = true;
      cab.add(upperBody);

      // Side & center structural walls (framing the two recessed lower bays for Hatch & Safe)
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.12, 0.56), mats.mahogany);
      wallL.position.set(-1.07, 1.24, 0.34);
      wallL.castShadow = true;
      cab.add(wallL);

      const wallR = wallL.clone();
      wallR.position.x = 1.07;
      cab.add(wallR);

      const wallMid = new THREE.Mesh(new THREE.BoxGeometry(0.10, 2.12, 0.58), mats.mahogany);
      wallMid.position.set(0, 1.24, 0.35);
      cab.add(wallMid);

      // Horizontal middle shelf separating top and bottom bays
      const midShelf = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.06, 0.58), mats.agedBrass);
      midShelf.position.set(0, 1.21, 0.35);
      cab.add(midShelf);

      // Upper-left shelf below valves (Y = 0.82) separating valves from pneumatic hatch
      const valveShelf = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.05, 0.54), mats.agedBrass);
      valveShelf.position.set(-0.54, 0.83, 0.36);
      cab.add(valveShelf);

      // Recessed upper-left wall behind valves (Y = 0.85 .. 1.21)
      const valveBack = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.36, 0.42), mats.slate);
      valveBack.position.set(-0.54, 1.02, 0.38);
      cab.add(valveBack);

      // Top cornice & engraved brass header plaque
      const cornice = new THREE.Mesh(new THREE.BoxGeometry(2.30, 0.12, 0.68), mats.mahogany);
      cornice.position.set(0, 2.34, 0.36);
      cornice.castShadow = true;
      cab.add(cornice);

      const plaqueTex = createHeaderPlaqueTexture('TELEMETRÍA Y CÁMARA ACORAZADA', 'Presión de Vapor • Cifrado Zodiacal • Caja Fuerte');
      const plaque = new THREE.Mesh(
        new THREE.BoxGeometry(1.88, 0.18, 0.03),
        new THREE.MeshStandardMaterial({ map: plaqueTex, roughness: 0.38, metalness: 0.55 })
      );
      plaque.position.set(0, 2.19, 0.61);
      cab.add(plaque);
      this.cabinetHighlight = plaque;

      // Brass decorative vertical strips & rivets
      [-1.07, 0, 1.07].forEach(x => {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.025, 2.08, 0.018), mats.brass);
        strip.position.set(x, 1.22, 0.635);
        cab.add(strip);
      });
    },

    _buildSteamValves(group, mats) {
      const bay = new THREE.Group();
      group.add(bay);

      const xCols = [-0.88, -0.66, -0.44, -0.22];
      const tubeBottomY = 1.44;
      const tubeHeight = 0.54;
      const tubeCenterY = tubeBottomY + tubeHeight * 0.5;

      // Brass panel backing for manometers
      const backing = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.72, 0.025), mats.darkIron);
      backing.position.set(-0.55, 1.72, 0.59);
      bay.add(backing);
      this.valvesHighlightTarget = backing;

      // 4 Vertical Glass Manometers (I..IV)
      for (let i = 0; i < 4; i++) {
        const x = xCols[i];

        // Graduated scale plate behind glass tube
        const scaleTex = createManometerScaleTexture(ROMAN_4[i]);
        const scalePlate = new THREE.Mesh(
          new THREE.PlaneGeometry(0.175, 0.62),
          new THREE.MeshStandardMaterial({ map: scaleTex, roughness: 0.48, metalness: 0.35 })
        );
        scalePlate.position.set(x, 1.73, 0.606);
        bay.add(scalePlate);

        // Glass cylinder housing (low opacity so rich colored liquid inside pops clearly!)
        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0xdff2ff,
          roughness: 0.08,
          metalness: 0.05,
          transparent: true,
          opacity: 0.18,
          depthWrite: false
        });
        const glassTube = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.030, tubeHeight, 16), glassMat);
        glassTube.position.set(x, tubeCenterY, 0.635);
        bay.add(glassTube);

        // Brass top & bottom fittings
        const botCap = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.042, 0.032, 16), mats.brass);
        botCap.position.set(x, tubeBottomY - 0.012, 0.635);
        bay.add(botCap);
        const topCap = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.036, 0.032, 16), mats.brass);
        topCap.position.set(x, tubeBottomY + tubeHeight + 0.012, 0.635);
        bay.add(topCap);

        // Glowing status finial bulb on top of each tube
        const bulbMat = new THREE.MeshStandardMaterial({
          color: 0x553322,
          emissive: 0xff6633,
          emissiveIntensity: 0.2,
          roughness: 0.2
        });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 12, 10), bulbMat);
        bulb.position.set(x, tubeBottomY + tubeHeight + 0.036, 0.635);
        bay.add(bulb);

        // Golden target ring collar right at level 4/7 of tubeHeight!
        const targetY = tubeBottomY + (4 / 7) * tubeHeight;
        const targetRing = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.005, 8, 20), mats.gold);
        targetRing.rotation.x = Math.PI / 2;
        targetRing.position.set(x, targetY, 0.635);
        bay.add(targetRing);

        // Animated glowing liquid column (unit height 1, pivot anchored at tubeBottomY)
        const liqMat = new THREE.MeshStandardMaterial({
          color: 0xff5a2c,
          emissive: 0xff4418,
          emissiveIntensity: 1.15,
          roughness: 0.2
        });
        const liqGeo = new THREE.CylinderGeometry(0.021, 0.021, 1, 14);
        liqGeo.translate(0, 0.5, 0); // anchor at y = 0
        const liquid = new THREE.Mesh(liqGeo, liqMat);
        liquid.position.set(x, tubeBottomY + 0.004, 0.635);
        liquid.scale.y = 0.05;
        bay.add(liquid);

        this.gauges.push({
          liquid,
          liqMat,
          bulbMat,
          tubeHeight,
          currentVal: GAUGE_BASE[i],
          targetVal: GAUGE_BASE[i]
        });
      }

      // 3D Copper Pipes visibly connecting each valve upward to its coupled gauges
      const pipeMat = mats.copper;
      const pipeYStart = 1.14;
      const pipeYEnd = 1.42;
      for (let v = 0; v < 4; v++) {
        for (let m = 0; m < 4; m++) {
          const weight = VALVE_MATRIX[v][m];
          if (weight === 0) continue;
          const rad = weight === 2 ? 0.012 : 0.0065;
          const zOff = 0.608 + v * 0.0065;
          const yMid = pipeYStart + 0.06 + v * 0.048;
          const x1 = xCols[v];
          const x2 = xCols[m];

          // Vertical rise from valve
          const seg1H = yMid - pipeYStart;
          const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, seg1H, 8), pipeMat);
          seg1.position.set(x1, pipeYStart + seg1H * 0.5, zOff);
          bay.add(seg1);

          // Horizontal cross-run if needed
          if (Math.abs(x2 - x1) > 0.005) {
            const dx = Math.abs(x2 - x1);
            const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, dx, 8), pipeMat);
            seg2.rotation.z = Math.PI / 2;
            seg2.position.set((x1 + x2) * 0.5, yMid, zOff);
            bay.add(seg2);
          }

          // Vertical rise into target manometer base
          const seg3H = pipeYEnd - yMid;
          const seg3 = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, seg3H, 8), pipeMat);
          seg3.position.set(x2, yMid + seg3H * 0.5, zOff);
          bay.add(seg3);
        }
      }

      // Engraved brass legend strip directly above the 4 valves
      const legendTex = createValveLegendTexture();
      const legendPlate = new THREE.Mesh(
        new THREE.BoxGeometry(0.92, 0.135, 0.018),
        new THREE.MeshStandardMaterial({ map: legendTex, roughness: 0.42, metalness: 0.48 })
      );
      legendPlate.position.set(-0.55, 1.245, 0.635);
      bay.add(legendPlate);

      // 4 Valve Assemblies (V1..V4)
      for (let i = 0; i < 4; i++) {
        const x = xCols[i];
        const y = 1.00;
        const z = 0.62;

        // Mounting flange & square iron valve stem
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.025, 12), mats.darkIron);
        flange.rotation.x = Math.PI / 2;
        flange.position.set(x, y, z);
        bay.add(flange);

        const stem = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.022, 0.068), mats.iron);
        stem.position.set(x, y, z + 0.028);
        bay.add(stem);

        // 3 step-indicator brass pips (0, 1, 2) directly below each valve
        const pips = [];
        for (let s = 0; s < 3; s++) {
          const pMat = new THREE.MeshStandardMaterial({
            color: 0x33281d,
            emissive: 0xffb840,
            emissiveIntensity: 0,
            roughness: 0.35
          });
          const pip = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 8), pMat);
          pip.position.set(x + (s - 1) * 0.028, y - 0.105, z + 0.012);
          bay.add(pip);
          pips.push(pMat);
        }

        // Brass handwheel mesh (hidden on V4 until valve4Installed === true)
        const wheel = createValveWheelMesh(mats);
        wheel.position.set(x, y, z + 0.056);
        bay.add(wheel);

        const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.10, 12), makeHitboxMat());
        hit.rotation.x = Math.PI / 2;
        hit.position.set(x, y, z + 0.055);
        bay.add(hit);

        const cfg = SR.registerInteractive(hit, {
          id: 'telemetry_valve_' + i,
          station: 'telemetry',
          activeViews: ['valves'],
          action: i === 3 ? 'Colocar' : 'Girar',
          label: i === 3 ? 'Eje de Válvula V4 (Sin volante)' : `Válvula V${i + 1} (${VALVE_LEGENDS[i]})`,
          cursor: 'interact',
          highlightTarget: i === 3 ? stem : wheel,
          onClick: () => this._onValveClick(i)
        });

        this.valves.push({
          index: i,
          wheel,
          stem,
          pips,
          cfg,
          currentAngle: 0,
          targetAngle: 0
        });
      }

      // Pneumatic Hatch Chamber (Bottom-Left: X = -0.55, Y = 0.50)
      const chamberBack = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.56, 0.04), mats.velvet);
      chamberBack.position.set(-0.55, 0.50, 0.20);
      bay.add(chamberBack);
      const chamberFloor = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.03, 0.42), mats.velvet);
      chamberFloor.position.set(-0.55, 0.22, 0.40);
      bay.add(chamberFloor);

      // Hatch door frame
      const hatchFrame = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.56, 0.03), mats.agedBrass);
      hatchFrame.position.set(-0.55, 0.50, 0.605);
      // Hollow interior frame rails instead of solid box
      bay.remove(hatchFrame);
      const hfT = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.05, 0.045), mats.agedBrass);
      hfT.position.set(-0.55, 0.77, 0.60);
      bay.add(hfT);
      const hfB = hfT.clone();
      hfB.position.y = 0.23;
      bay.add(hfB);
      const hfL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.56, 0.045), mats.agedBrass);
      hfL.position.set(-0.96, 0.50, 0.60);
      bay.add(hfL);
      const hfR = hfL.clone();
      hfR.position.x = -0.14;
      bay.add(hfR);

      // Left-hinged Pneumatic Hatch Door
      const hatchPivot = new THREE.Group();
      hatchPivot.position.set(-0.935, 0.50, 0.62);
      bay.add(hatchPivot);
      this.hatchPivot = hatchPivot;

      const hatchPanel = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.50, 0.036), mats.darkIron);
      hatchPanel.position.x = 0.385;
      hatchPanel.castShadow = true;
      hatchPivot.add(hatchPanel);

      const hatchTrim = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.42, 0.012), mats.brass);
      hatchTrim.position.set(0.385, 0, 0.020);
      hatchPivot.add(hatchTrim);

      const hatchInner = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.36, 0.014), mats.darkIron);
      hatchInner.position.set(0.385, 0, 0.023);
      hatchPivot.add(hatchInner);

      const sealRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.014, 10, 24), mats.copper);
      sealRing.position.set(0.385, 0, 0.034);
      hatchPivot.add(sealRing);

      // 2 Pneumatic horizontal locking bolts on right edge of hatch
      [-0.13, 0.13].forEach(by => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 10), mats.gold);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(0.74, by, 0.026);
        hatchPivot.add(bolt);
        this.hatchBolts.push(bolt);
      });

      // 3D Pickup inside Pneumatic Chamber: clock_weight (Pesa de Bronce)
      const weight = createClockWeightMesh(mats);
      weight.position.set(-0.55, 0.39, 0.42);
      weight.rotation.set(0.06, 0.25, -0.05);
      bay.add(weight);
      this.clockWeightMesh = weight;

      const weightHit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.30), makeHitboxMat());
      weightHit.position.set(-0.55, 0.43, 0.44);
      bay.add(weightHit);
      this.clockWeightHit = weightHit;

      this.clockWeightCfg = SR.registerInteractive(weightHit, {
        id: 'telemetry_pickup_clock_weight',
        station: 'telemetry',
        activeViews: ['valves', 'telemetry'],
        action: 'Recoger',
        label: 'Pesa de Bronce (Contrapeso)',
        cursor: 'interact',
        highlightTarget: weight,
        disabled: true,
        onClick: () => {
          const st = SR.State.data;
          if (!st.valvesSolved || st.clockWeightTaken) return;
          st.clockWeightTaken = true;
          SR.State.addItem('clock_weight');
          SR.Audio.playPickup();
          this._syncValvesPickup();
          SR.UI.say('Has recogido la Pesa de Bronce. Sin duda pertenece a la cadena del Reloj Astronómico.');
        }
      });
    },

    _buildCipherWheel(group, mats) {
      const cipherRoot = new THREE.Group();
      cipherRoot.position.set(0.54, 1.74, 0.60);
      group.add(cipherRoot);

      // Ornate beveled brass mounting ring
      const outerBezel = new THREE.Mesh(new THREE.TorusGeometry(0.352, 0.018, 12, 48), mats.brass);
      outerBezel.position.z = 0.008;
      cipherRoot.add(outerBezel);
      this.cipherHighlightTarget = outerBezel;

      // Fixed Outer 10-Symbol Zodiac Ring (CircleGeometry facing +Z)
      const outerTex = createCipherOuterTexture();
      const outerDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.348, 64),
        new THREE.MeshStandardMaterial({ map: outerTex, roughness: 0.42, metalness: 0.52 })
      );
      outerDisc.position.z = 0.006;
      cipherRoot.add(outerDisc);

      // Recessed central spindle (visible before cipher_disk installed)
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.055, 6), mats.agedBrass);
      spindle.rotation.x = Math.PI / 2;
      spindle.position.z = 0.022;
      cipherRoot.add(spindle);

      // Inner Rotatable 0..9 Digit Wheel (hidden until cipherDiskInstalled === true)
      const innerGroup = new THREE.Group();
      innerGroup.position.z = 0.016;
      cipherRoot.add(innerGroup);
      this.cipherInnerGroup = innerGroup;

      const innerTex = createCipherInnerTexture();
      const innerDisc = new THREE.Mesh(
        new THREE.CircleGeometry(0.222, 64),
        new THREE.MeshStandardMaterial({ map: innerTex, roughness: 0.36, metalness: 0.58 })
      );
      innerGroup.add(innerDisc);

      const innerRim = new THREE.Mesh(new THREE.TorusGeometry(0.222, 0.009, 10, 40), mats.gold);
      innerRim.position.z = 0.005;
      innerGroup.add(innerRim);

      // Central brass turn knob
      const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.050, 0.032, 16), mats.gold);
      knob.rotation.x = Math.PI / 2;
      knob.position.z = 0.016;
      innerGroup.add(knob);

      const knobBar = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.020), mats.brass);
      knobBar.position.z = 0.032;
      innerGroup.add(knobBar);

      // Generous interactive click disc for 'cipher' view
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.07, 24), makeHitboxMat());
      hit.rotation.x = Math.PI / 2;
      hit.position.z = 0.03;
      cipherRoot.add(hit);

      this.cipherCfg = SR.registerInteractive(hit, {
        id: 'telemetry_cipher_wheel',
        station: 'telemetry',
        activeViews: ['cipher'],
        action: 'Colocar',
        label: 'Eje del Disco Cifrador (Vacío)',
        cursor: 'interact',
        highlightTarget: spindle,
        onClick: () => {
          const st = SR.State.data;
          if (!st.cipherDiskInstalled) {
            if (st.selectedItem === 'cipher_disk') {
              st.cipherDiskInstalled = true;
              SR.State.removeItem('cipher_disk');
              SR.Audio.playGear(1.2);
              SR.Audio.playSolve();
              this._syncCipherVisuals(true);
              const cometDigit = (9 + st.cipherOffset) % 10;
              SR.UI.say(`¡Has encajado el Disco Móvil de Latón! Actualmente ★ (Cometa) apunta al ${cometDigit}. Haz clic para girarlo.`);
            } else {
              SR.Audio.playClick(0.85);
              SR.UI.say('El eje central del Disco Cifrador Zodiacal está vacío. Falta el disco móvil grabado con los dígitos del 0 al 9.');
            }
          } else {
            st.cipherOffset = (st.cipherOffset + 1) % 10;
            this.cipherTargetAngle += (Math.PI * 2) / 10;
            SR.State.save();
            SR.Audio.playGear(1.3);
            const cometDigit = (9 + st.cipherOffset) % 10;
            SR.UI.say(`Disco Cifrador girado → ★ (Cometa) alineado con el ${cometDigit}.`);
          }
        }
      });
    },

    _buildBrassSafe(group, mats) {
      const safeRoot = new THREE.Group();
      safeRoot.position.set(0.54, 0.69, 0.56);
      group.add(safeRoot);

      const safeW = 0.90;
      const safeH = 0.94;
      const safeD = 0.44;

      // Exterior riveted steel-and-brass casing (hollow box with 5 walls)
      const backW = new THREE.Mesh(new THREE.BoxGeometry(safeW, safeH, 0.04), mats.darkIron);
      backW.position.z = -safeD * 0.5;
      safeRoot.add(backW);

      const topW = new THREE.Mesh(new THREE.BoxGeometry(safeW, 0.055, safeD), mats.darkIron);
      topW.position.y = safeH * 0.5 - 0.0275;
      safeRoot.add(topW);

      const botW = new THREE.Mesh(new THREE.BoxGeometry(safeW, 0.055, safeD), mats.darkIron);
      botW.position.y = -(safeH * 0.5 - 0.0275);
      safeRoot.add(botW);

      const leftW = new THREE.Mesh(new THREE.BoxGeometry(0.055, safeH, safeD), mats.darkIron);
      leftW.position.x = -(safeW * 0.5 - 0.0275);
      safeRoot.add(leftW);

      const rightW = new THREE.Mesh(new THREE.BoxGeometry(0.055, safeH, safeD), mats.darkIron);
      rightW.position.x = safeW * 0.5 - 0.0275;
      safeRoot.add(rightW);

      // Crimson velvet interior lining & display cushion shelf
      const velvetBack = new THREE.Mesh(new THREE.BoxGeometry(safeW - 0.12, safeH - 0.12, 0.02), mats.velvet);
      velvetBack.position.z = -safeD * 0.5 + 0.03;
      safeRoot.add(velvetBack);

      const velvetShelf = new THREE.Mesh(new THREE.BoxGeometry(safeW - 0.12, 0.035, safeD - 0.08), mats.velvet);
      velvetShelf.position.set(0, -0.14, -0.02);
      safeRoot.add(velvetShelf);

      // Subtle golden velvet cushions for the 2 treasures
      [-0.19, 0.19].forEach(cx => {
        const cushion = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.032, 18), mats.velvet);
        cushion.position.set(cx, -0.11, 0.0);
        safeRoot.add(cushion);
        const trimRing = new THREE.Mesh(new THREE.TorusGeometry(0.116, 0.006, 8, 20), mats.gold);
        trimRing.rotation.x = Math.PI / 2;
        trimRing.position.set(cx, -0.122, 0.0);
        safeRoot.add(trimRing);
      });

      // Soft warm interior light that turns on once safe opens
      this.safeLight = new THREE.PointLight(0xffdf99, 0, 1.4, 2);
      this.safeLight.position.set(0, 0.22, 0.06);
      safeRoot.add(this.safeLight);

      // 3D Pickups inside Safe: RELIC 2/3 lunar_lens (left) & quartz_splitter (right)
      const lunarLens = createLunarLensMesh(mats);
      lunarLens.position.set(-0.19, 0.02, 0.01);
      safeRoot.add(lunarLens);
      this.lunarLensMesh = lunarLens;

      const lunarHit = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.30, 0.24), makeHitboxMat());
      lunarHit.position.set(-0.19, 0.02, 0.04);
      safeRoot.add(lunarHit);
      this.lunarLensHit = lunarHit;

      this.lunarLensCfg = SR.registerInteractive(lunarHit, {
        id: 'telemetry_pickup_lunar_lens',
        station: 'telemetry',
        activeViews: ['safe', 'telemetry'],
        action: 'Recoger',
        label: 'Lente Lunar (Reliquia 2/3)',
        cursor: 'interact',
        highlightTarget: lunarLens,
        disabled: true,
        onClick: () => {
          const st = SR.State.data;
          if (!st.safeSolved || st.lunarLensTaken) return;
          st.lunarLensTaken = true;
          SR.State.addItem('lunar_lens');
          SR.Audio.playCrystal(1.35);
          SR.Audio.playPickup();
          this._syncSafePickups();
          SR.UI.say('¡Has obtenido la Lente Lunar! (Reliquia del Eclipse 2/3 — Pertenece a la Puerta del Eclipse).');
        }
      });

      const splitter = createQuartzSplitterPickupMesh(mats);
      splitter.position.set(0.19, 0.00, 0.01);
      safeRoot.add(splitter);
      this.splitterMesh = splitter;

      const splitterHit = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.30, 0.24), makeHitboxMat());
      splitterHit.position.set(0.19, 0.00, 0.04);
      safeRoot.add(splitterHit);
      this.splitterHit = splitterHit;

      this.splitterCfg = SR.registerInteractive(splitterHit, {
        id: 'telemetry_pickup_quartz_splitter',
        station: 'telemetry',
        activeViews: ['safe', 'telemetry'],
        action: 'Recoger',
        label: 'Cristal Divisor de Cuarzo',
        cursor: 'interact',
        highlightTarget: splitter,
        disabled: true,
        onClick: () => {
          const st = SR.State.data;
          if (!st.safeSolved || st.quartzSplitterTaken) return;
          st.quartzSplitterTaken = true;
          SR.State.addItem('quartz_splitter');
          SR.Audio.playPickup();
          this._syncSafePickups();
          SR.UI.say('Has recogido el Cristal Divisor. Encajará en el zócalo vacío de la Mesa de Óptica.');
        }
      });

      // Right-Hinged Heavy Vault Safe Door (pivots at X = +0.42, Z = +0.20)
      const doorPivot = new THREE.Group();
      doorPivot.position.set(safeW * 0.5 - 0.03, 0, safeD * 0.5);
      safeRoot.add(doorPivot);
      this.safeDoorPivot = doorPivot;

      const doorW = safeW - 0.08;
      const doorH = safeH - 0.08;
      const doorCenterX = -doorW * 0.5;

      const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(doorW, doorH, 0.055), mats.darkIron);
      doorPanel.position.set(doorCenterX, 0, 0);
      doorPanel.castShadow = true;
      doorPivot.add(doorPanel);
      this.safeHighlightTarget = doorPanel;

      // Brass border frame & corner rivets on safe door
      const dTrimT = new THREE.Mesh(new THREE.BoxGeometry(doorW - 0.04, 0.025, 0.016), mats.brass);
      dTrimT.position.set(doorCenterX, doorH * 0.5 - 0.035, 0.030);
      doorPivot.add(dTrimT);
      const dTrimB = dTrimT.clone();
      dTrimB.position.y = -(doorH * 0.5 - 0.035);
      doorPivot.add(dTrimB);
      const dTrimL = new THREE.Mesh(new THREE.BoxGeometry(0.025, doorH - 0.06, 0.016), mats.brass);
      dTrimL.position.set(doorCenterX - doorW * 0.5 + 0.035, 0, 0.030);
      doorPivot.add(dTrimL);
      const dTrimR = dTrimL.clone();
      dTrimR.position.x = doorCenterX + doorW * 0.5 - 0.035;
      doorPivot.add(dTrimR);

      // Heavy brass hinges on right edge
      [-0.28, 0.28].forEach(hy => {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.020, 0.11, 10), mats.agedBrass);
        hinge.position.set(0.012, hy, 0.022);
        doorPivot.add(hinge);
      });

      // 2 Retractable steel locking bolts on left edge of safe door
      [-0.20, 0.20].forEach(by => {
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.09, 10), mats.gold);
        bolt.rotation.z = Math.PI / 2;
        bolt.position.set(-doorW - 0.01, by, 0);
        doorPivot.add(bolt);
        this.safeBolts.push(bolt);
      });

      // Top nameplate on safe door
      const safeTitleTex = createHeaderPlaqueTexture('CAJA FUERTE DE LATÓN', 'I     •     II     •     III     •     IV');
      const safeTitle = new THREE.Mesh(
        new THREE.PlaneGeometry(0.68, 0.105),
        new THREE.MeshStandardMaterial({ map: safeTitleTex, roughness: 0.4, metalness: 0.5 })
      );
      safeTitle.position.set(doorCenterX, 0.315, 0.031);
      doorPivot.add(safeTitle);

      // 4 Large Clickable Brass Digit Tumblers (d0..d3)
      const dialOffsetsX = [-0.255, -0.085, 0.085, 0.255];
      for (let i = 0; i < 4; i++) {
        const dx = doorCenterX + dialOffsetsX[i];
        const dy = 0.105;

        const bezel = new THREE.Mesh(new THREE.BoxGeometry(0.145, 0.215, 0.032), mats.brass);
        bezel.position.set(dx, dy, 0.036);
        doorPivot.add(bezel);

        const tObj = makeTumblerCanvas();
        drawTumblerDigit(tObj, SR.State.data.safeDigits[i] || 0);

        const face = new THREE.Mesh(
          new THREE.PlaneGeometry(0.118, 0.175),
          new THREE.MeshStandardMaterial({
            map: tObj.tex,
            roughness: 0.32,
            metalness: 0.22
          })
        );
        face.position.set(dx, dy, 0.054);
        doorPivot.add(face);

        // Top & bottom brass roller grips
        const gripT = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.11, 10), mats.gold);
        gripT.rotation.z = Math.PI / 2;
        gripT.position.set(dx, dy + 0.095, 0.050);
        doorPivot.add(gripT);
        const gripB = gripT.clone();
        gripB.position.y = dy - 0.095;
        doorPivot.add(gripB);

        const hit = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.23, 0.08), makeHitboxMat());
        hit.position.set(dx, dy, 0.06);
        doorPivot.add(hit);

        const cfg = SR.registerInteractive(hit, {
          id: 'telemetry_safe_dial_' + i,
          station: 'telemetry',
          activeViews: ['safe'],
          action: 'Cambiar',
          label: `Rueda ${ROMAN_4[i]} (${SR.State.data.safeDigits[i] || 0})`,
          cursor: 'interact',
          highlightTarget: bezel,
          onClick: () => this._onSafeDialClick(i)
        });

        this.safeDials.push({ tObj, face, bezel, hit, cfg, nudge: 0 });
      }

      // Heavy 3-Spoke Brass Opening Handle (Palanca / Volante de Apertura)
      const handleGroup = new THREE.Group();
      handleGroup.position.set(doorCenterX, -0.20, 0.055);
      doorPivot.add(handleGroup);
      this.safeHandleGroup = handleGroup;

      const hBase = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.074, 0.036, 16), mats.agedBrass);
      hBase.rotation.x = Math.PI / 2;
      handleGroup.add(hBase);

      const hHub = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.056, 16), mats.gold);
      hHub.rotation.x = Math.PI / 2;
      hHub.position.z = 0.025;
      handleGroup.add(hHub);

      for (let s = 0; s < 3; s++) {
        const ang = (s * Math.PI * 2) / 3 + Math.PI / 6;
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.145, 10), mats.brass);
        arm.position.set(Math.cos(ang) * 0.072, Math.sin(ang) * 0.072, 0.042);
        arm.rotation.z = ang - Math.PI / 2;
        handleGroup.add(arm);

        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), mats.gold);
        ball.position.set(Math.cos(ang) * 0.145, Math.sin(ang) * 0.145, 0.042);
        handleGroup.add(ball);
      }

      const handleHit = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.12, 16), makeHitboxMat());
      handleHit.rotation.x = Math.PI / 2;
      handleHit.position.set(doorCenterX, -0.20, 0.085);
      doorPivot.add(handleHit);
      this.safeHandleHit = handleHit;

      this.safeHandleCfg = SR.registerInteractive(handleHit, {
        id: 'telemetry_safe_handle',
        station: 'telemetry',
        activeViews: ['safe'],
        action: 'Abrir',
        label: 'Volante de la Caja Fuerte',
        cursor: 'interact',
        highlightTarget: handleGroup,
        onClick: () => this._onSafeHandleClick()
      });
    },

    _onValveClick(idx) {
      const st = SR.State.data;
      const v = this.valves[idx];
      if (!v) return;

      if (idx === 3 && !st.valve4Installed) {
        if (st.selectedItem === 'valve_wheel') {
          st.valve4Installed = true;
          SR.State.removeItem('valve_wheel');
          SR.Audio.playGear(0.95);
          SR.Audio.playSolve();
          this._syncValvesVisuals(false);
          SR.UI.say('¡Has encajado el Volante de Válvula en V4! Ahora puedes regular las cuatro presiones hasta 4.');
        } else {
          SR.Audio.playClick(0.8);
          SR.UI.say('El eje cuadrado de la válvula V4 está desnudo. Necesitas un volante de válvula para girarlo.');
        }
        return;
      }

      if (st.valvesSolved) {
        SR.Audio.playClick(1.1);
        SR.UI.say('La presión de vapor está equilibrada exactamente en 4 y la compuerta neumática ya está abierta.');
        return;
      }

      st.valves[idx] = ((st.valves[idx] || 0) + 1) % 3;
      v.targetAngle -= (Math.PI * 2) / 3; // smooth 120° clockwise turn
      SR.State.save();
      SR.Audio.playSteam();
      SR.Audio.playGear(0.92 + idx * 0.08);

      const g = computeGauges(st.valves);
      this._updateGaugeTargets(g);
      this._updateValvePips();

      if (g[0] === 4 && g[1] === 4 && g[2] === 4 && g[3] === 4) {
        st.valvesSolved = true;
        SR.State.save();
        SR.Audio.playSolve();
        SR.Audio.playSteam();
        this._syncValvesPickup();
        SR.UI.say('¡Presión óptima alcanzada (4-4-4-4)! Los cerrojos neumáticos ceden y la compuerta inferior se abre.');
      } else {
        SR.UI.say(`Válvula V${idx + 1} → posición ${st.valves[idx]}  |  Manómetros: I=${g[0]}, II=${g[1]}, III=${g[2]}, IV=${g[3]}`);
      }
    },

    _onSafeDialClick(idx) {
      const st = SR.State.data;
      if (st.safeSolved) return;
      const next = ((st.safeDigits[idx] || 0) + 1) % 10;
      st.safeDigits[idx] = next;
      SR.State.save();
      SR.Audio.playClick(1.05 + idx * 0.05);

      const d = this.safeDials[idx];
      drawTumblerDigit(d.tObj, next);
      d.cfg.label = `Rueda ${ROMAN_4[idx]} (${next})`;
      d.nudge = 1.0;

      SR.UI.say(`Combinación actual: ${st.safeDigits.join(' — ')}`);
    },

    _onSafeHandleClick() {
      const st = SR.State.data;
      if (st.safeSolved) return;

      const d = st.safeDigits;
      if (d[0] === SAFE_CODE[0] && d[1] === SAFE_CODE[1] && d[2] === SAFE_CODE[2] && d[3] === SAFE_CODE[3]) {
        st.safeSolved = true;
        SR.State.save();
        SR.Audio.playSolve();
        SR.Audio.playDrawer();
        this.safeHandleAngle += Math.PI * 0.75;
        this._syncSafePickups();
        SR.UI.say('¡Combinación correcta (8 - 2 - 4 - 9)! La Caja Fuerte de Latón se abre revelando la Lente Lunar y el Cristal Divisor.');
      } else {
        SR.Audio.playError();
        this.safeHandleShake = 0.35;
        SR.UI.say(`El mecanismo resiste. La combinación ${d.join(' - ')} no abre la Caja Fuerte.`);
      }
    },

    _updateGaugeTargets(g) {
      for (let i = 0; i < 4; i++) {
        this.gauges[i].targetVal = g[i];
      }
    },

    _updateValvePips() {
      const st = SR.State.data;
      for (let i = 0; i < 4; i++) {
        const lvl = st.valves[i] || 0;
        const v = this.valves[i];
        for (let s = 0; s < 3; s++) {
          const active = s <= lvl && (i < 3 || st.valve4Installed);
          v.pips[s].emissiveIntensity = active ? (s === lvl ? 1.8 : 0.7) : 0.0;
          v.pips[s].color.setHex(active ? 0xffd266 : 0x2c231a);
        }
      }
    },

    _syncValvesVisuals(snap) {
      const st = SR.State.data;
      const v4 = this.valves[3];
      if (v4) {
        v4.wheel.visible = !!st.valve4Installed;
        v4.cfg.action = st.valve4Installed ? 'Girar' : 'Colocar';
        v4.cfg.label = st.valve4Installed
          ? `Válvula V4 (${VALVE_LEGENDS[3]})`
          : 'Eje de Válvula V4 (Sin volante)';
        v4.cfg.highlightTarget = st.valve4Installed ? v4.wheel : v4.stem;
      }

      const g = computeGauges(st.valves);
      for (let i = 0; i < 4; i++) {
        const angle = -(st.valves[i] || 0) * ((Math.PI * 2) / 3);
        if (snap) {
          this.valves[i].currentAngle = angle;
          this.valves[i].targetAngle = angle;
          this.valves[i].wheel.rotation.z = angle;
          this.gauges[i].currentVal = g[i];
        }
        this.gauges[i].targetVal = g[i];
      }
      this._updateValvePips();
      this._syncValvesPickup();
    },

    _syncValvesPickup() {
      const st = SR.State.data;
      const showWeight = !!(st.valvesSolved && !st.clockWeightTaken);
      if (this.clockWeightMesh) this.clockWeightMesh.visible = showWeight;
      if (this.clockWeightHit) this.clockWeightHit.visible = showWeight;
      if (this.clockWeightCfg) this.clockWeightCfg.disabled = !showWeight;
    },

    _syncCipherVisuals(snap) {
      const st = SR.State.data;
      if (this.cipherInnerGroup) {
        this.cipherInnerGroup.visible = !!st.cipherDiskInstalled;
      }
      const angle = (st.cipherOffset || 0) * ((Math.PI * 2) / 10);
      if (snap) {
        this.cipherCurrentAngle = angle;
        this.cipherTargetAngle = angle;
        if (this.cipherInnerGroup) this.cipherInnerGroup.rotation.z = angle;
      } else {
        this.cipherTargetAngle = angle;
      }
      if (this.cipherCfg) {
        this.cipherCfg.action = st.cipherDiskInstalled ? 'Girar' : 'Colocar';
        this.cipherCfg.label = st.cipherDiskInstalled
          ? 'Disco Cifrador Zodiacal (Girar +1)'
          : 'Eje del Disco Cifrador (Vacío)';
        this.cipherCfg.highlightTarget = st.cipherDiskInstalled
          ? this.cipherInnerGroup
          : this.cipherHighlightTarget;
      }
    },

    _syncSafePickups() {
      const st = SR.State.data;
      const solved = !!st.safeSolved;

      // Disable door controls once open so they never block pickups
      this.safeDials.forEach((d, idx) => {
        const val = st.safeDigits[idx] || 0;
        drawTumblerDigit(d.tObj, val);
        d.cfg.label = `Rueda ${ROMAN_4[idx]} (${val})`;
        d.cfg.disabled = solved;
        d.hit.visible = !solved;
      });
      if (this.safeHandleCfg) this.safeHandleCfg.disabled = solved;
      if (this.safeHandleHit) this.safeHandleHit.visible = !solved;

      const showLunar = solved && !st.lunarLensTaken;
      if (this.lunarLensMesh) this.lunarLensMesh.visible = showLunar;
      if (this.lunarLensHit) this.lunarLensHit.visible = showLunar;
      if (this.lunarLensCfg) this.lunarLensCfg.disabled = !showLunar;

      const showSplitter = solved && !st.quartzSplitterTaken;
      if (this.splitterMesh) this.splitterMesh.visible = showSplitter;
      if (this.splitterHit) this.splitterHit.visible = showSplitter;
      if (this.splitterCfg) this.splitterCfg.disabled = !showSplitter;
    },

    syncFromState() {
      const st = SR.State.data;
      this._syncValvesVisuals(true);
      this._syncCipherVisuals(true);

      this.hatchProgress = st.valvesSolved ? 1 : 0;
      if (this.hatchPivot) {
        this.hatchPivot.rotation.y = -this.hatchProgress * 1.88;
      }
      this.hatchBolts.forEach(b => {
        b.position.x = 0.74 - this.hatchProgress * 0.08;
      });

      this.safeDoorProgress = st.safeSolved ? 1 : 0;
      if (this.safeDoorPivot) {
        this.safeDoorPivot.rotation.y = this.safeDoorProgress * 1.92;
      }
      this.safeBolts.forEach(b => {
        b.position.x = -0.83 + this.safeDoorProgress * 0.08;
      });
      if (this.safeLight) {
        this.safeLight.intensity = this.safeDoorProgress * 1.5;
      }

      this._syncSafePickups();
    },

    update(dt, elapsed) {
      const st = SR.State.data;
      const smooth = Math.min(1, dt * 8.5);

      // Animate valve wheels
      for (let i = 0; i < 4; i++) {
        const v = this.valves[i];
        if (Math.abs(v.targetAngle - v.currentAngle) > 0.001) {
          v.currentAngle += (v.targetAngle - v.currentAngle) * smooth;
          v.wheel.rotation.z = v.currentAngle;
        }
      }

      // Animate manometer liquid columns & optimal-4 green-gold glow
      for (let i = 0; i < 4; i++) {
        const g = this.gauges[i];
        g.currentVal += (g.targetVal - g.currentVal) * Math.min(1, dt * 6.5);
        const clamped = Math.max(0.08, Math.min(7.0, g.currentVal));
        const pulse = Math.sin(elapsed * 4.0 + i * 1.3) * 0.004;
        g.liquid.scale.y = Math.max(0.015, (clamped / 7.0) * g.tubeHeight + pulse);

        const atFour = Math.abs(g.targetVal - 4) < 0.01;
        if (atFour) {
          g.liqMat.color.setHex(0x2ae06d);
          g.liqMat.emissive.setHex(0x16b852);
          g.liqMat.emissiveIntensity = 0.95 + Math.sin(elapsed * 3.5) * 0.15;
          g.bulbMat.color.setHex(0x6eff9e);
          g.bulbMat.emissive.setHex(0x2be06a);
          g.bulbMat.emissiveIntensity = 1.6;
        } else {
          const hot = g.targetVal > 4;
          g.liqMat.color.setHex(hot ? 0xd92616 : 0xe06818);
          g.liqMat.emissive.setHex(hot ? 0xb81408 : 0xb84608);
          g.liqMat.emissiveIntensity = 0.72;
          g.bulbMat.color.setHex(0x4a2a1c);
          g.bulbMat.emissive.setHex(hot ? 0xff3b22 : 0xb85814);
          g.bulbMat.emissiveIntensity = 0.35;
        }
      }

      // Animate pneumatic hatch opening
      const targetHatch = st.valvesSolved ? 1 : 0;
      if (Math.abs(targetHatch - this.hatchProgress) > 0.001) {
        this.hatchProgress += (targetHatch - this.hatchProgress) * Math.min(1, dt * 4.0);
        const boltT = Math.min(1, this.hatchProgress * 2.5);
        this.hatchBolts.forEach(b => {
          b.position.x = 0.74 - boltT * 0.08;
        });
        const doorT = Math.max(0, (this.hatchProgress - 0.18) / 0.82);
        if (this.hatchPivot) {
          this.hatchPivot.rotation.y = -doorT * 1.88;
        }
      }

      // Animate cipher inner disk rotation (+Z CCW aligns symbol k with (k + offset) % 10)
      if (Math.abs(this.cipherTargetAngle - this.cipherCurrentAngle) > 0.001) {
        this.cipherCurrentAngle += (this.cipherTargetAngle - this.cipherCurrentAngle) * Math.min(1, dt * 10);
        if (this.cipherInnerGroup) {
          this.cipherInnerGroup.rotation.z = this.cipherCurrentAngle;
        }
      }

      // Animate safe tumbler click nudge
      for (let i = 0; i < this.safeDials.length; i++) {
        const d = this.safeDials[i];
        if (d.nudge > 0.001) {
          d.nudge = Math.max(0, d.nudge - dt * 7);
          d.face.position.z = 0.054 - Math.sin(d.nudge * Math.PI) * 0.006;
        }
      }

      // Animate safe handle spin / error rattle
      if (this.safeHandleGroup) {
        if (this.safeHandleShake > 0) {
          this.safeHandleShake = Math.max(0, this.safeHandleShake - dt);
          this.safeHandleGroup.rotation.z = this.safeHandleAngle + Math.sin(this.safeHandleShake * 48) * 0.16;
        } else {
          this.safeHandleGroup.rotation.z += (this.safeHandleAngle - this.safeHandleGroup.rotation.z) * Math.min(1, dt * 8);
        }
      }

      // Animate safe door opening
      const targetSafe = st.safeSolved ? 1 : 0;
      if (Math.abs(targetSafe - this.safeDoorProgress) > 0.001) {
        this.safeDoorProgress += (targetSafe - this.safeDoorProgress) * Math.min(1, dt * 3.6);
        const boltT = Math.min(1, this.safeDoorProgress * 2.5);
        this.safeBolts.forEach(b => {
          b.position.x = -0.83 + boltT * 0.08;
        });
        const doorT = Math.max(0, (this.safeDoorProgress - 0.16) / 0.84);
        if (this.safeDoorPivot) {
          this.safeDoorPivot.rotation.y = doorT * 1.92;
        }
        if (this.safeLight) {
          this.safeLight.intensity = doorT * 1.5;
        }
      }

      // Gently float / shimmer treasures inside open safe
      if (this.lunarLensMesh && this.lunarLensMesh.visible) {
        this.lunarLensMesh.rotation.y = Math.sin(elapsed * 1.4) * 0.35;
        this.lunarLensMesh.position.y = 0.02 + Math.sin(elapsed * 2.2) * 0.010;
      }
      if (this.splitterMesh && this.splitterMesh.visible) {
        this.splitterMesh.rotation.y = elapsed * 0.75;
      }
    }
  };

  SR.Stations = SR.Stations || {};
  SR.Stations.telemetry = TelemetryStation;
})(window.SR = window.SR || {});
