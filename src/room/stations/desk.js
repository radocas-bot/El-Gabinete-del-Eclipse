/* ==========================================================================
   src/room/stations/desk.js — Wall 90° (East): El Escritorio del Maestro
   ========================================================================== */
(function (SR) {
  'use strict';

  SR.Stations = SR.Stations || {};

  const TWO_PI = Math.PI * 2;
  const CHIME_TARGET = [3, 1, 5, 2, 4];
  const ROMAN_KEYS = ['', 'I', 'II', 'III', 'IV', 'V'];

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

  // ---- Canvas2D Texture Builders ----

  function createBlotterTexture() {
    return SR.Textures.makeCanvasTexture(1024, 512, function (ctx, w, h) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, 60, w / 2, h / 2, w * 0.6);
      grad.addColorStop(0, '#1d4c36');
      grad.addColorStop(1, '#0f2b1e');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle leather pebble texture
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      for (let i = 0; i < 600; i++) {
        ctx.fillRect((i * 53) % w, (i * 97) % h, 3, 3);
      }

      // Gold-tooled Victorian frame border
      ctx.strokeStyle = '#c89e4b';
      ctx.lineWidth = 6;
      ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.strokeStyle = 'rgba(218, 178, 92, 0.55)';
      ctx.lineWidth = 2;
      ctx.strokeRect(32, 32, w - 64, h - 64);

      // Corner gold flourishes
      [[42, 42], [w - 42, 42], [42, h - 42], [w - 42, h - 42]].forEach(function (p) {
        ctx.fillStyle = '#d4aa54';
        ctx.beginPath();
        ctx.arc(p[0], p[1], 7, 0, TWO_PI);
        ctx.fill();
      });
    });
  }

  function createBlueprintTexture() {
    return SR.Textures.makeCanvasTexture(1024, 640, function (ctx, w, h) {
      // Prussian blue architectural blueprint
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#142c4c');
      bg.addColorStop(0.5, '#193860');
      bg.addColorStop(1, '#102440');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Engineering grid
      ctx.strokeStyle = 'rgba(180, 220, 255, 0.10)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 32) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y <= h; y += 32) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Double technical border
      ctx.strokeStyle = 'rgba(220, 240, 255, 0.78)';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, w - 40, h - 40);
      ctx.lineWidth = 1.5;
      ctx.strokeRect(30, 30, w - 60, h - 60);

      // Left schematic: Concentric Eclipse Vault Rings
      const lx = 280;
      const ly = 305;
      ctx.strokeStyle = 'rgba(225, 244, 255, 0.85)';
      ctx.lineWidth = 2.5;
      [175, 138, 102, 66, 30].forEach(function (r) {
        ctx.beginPath(); ctx.arc(lx, ly, r, 0, TWO_PI); ctx.stroke();
      });
      // Radial tick rays
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI;
        ctx.beginPath();
        ctx.moveTo(lx + Math.cos(a) * 66, ly + Math.sin(a) * 66);
        ctx.lineTo(lx + Math.cos(a) * 185, ly + Math.sin(a) * 185);
        ctx.stroke();
      }

      // Right schematic: Horological Escapement & Gear Train
      const rx = 710;
      const ry = 270;
      ctx.beginPath(); ctx.arc(rx, ry, 130, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, ry, 108, 0, TWO_PI); ctx.stroke();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * TWO_PI;
        ctx.beginPath();
        ctx.moveTo(rx + Math.cos(a) * 130, ry + Math.sin(a) * 130);
        ctx.lineTo(rx + Math.cos(a) * 146, ry + Math.sin(a) * 146);
        ctx.stroke();
      }
      // Secondary meshing gear
      ctx.beginPath(); ctx.arc(rx - 140, ry + 130, 62, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx - 140, ry + 130, 44, 0, TWO_PI); ctx.stroke();

      // Dimension crosshairs & labels
      ctx.fillStyle = 'rgba(232, 246, 255, 0.9)';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'left';
      ctx.fillText('FIG. I — ANILLOS DEL ECLIPSE', 96, 80);
      ctx.fillText('FIG. II — ESCAPE ASTRONÓMICO', 536, 80);

      // Bottom-right title block
      ctx.strokeStyle = 'rgba(225, 244, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.strokeRect(540, 500, 434, 92);
      ctx.font = 'bold 22px Georgia, serif';
      ctx.fillText('OBSERVATORIO DEL ECLIPSE • 1894', 562, 535);
      ctx.font = 'italic 18px Georgia, serif';
      ctx.fillText('Diseño: Maestro Valerio de Solís — Escala 1:4', 562, 568);
    });
  }

  function createDiarySpreadTexture() {
    return SR.Textures.makeCanvasTexture(1024, 640, function (ctx, w, h) {
      // Rich antique parchment pages (readable contrast without bloom blowout)
      const bg = ctx.createLinearGradient(0, 0, w, 0);
      bg.addColorStop(0, '#c8b082');
      bg.addColorStop(0.46, '#d9c59c');
      bg.addColorStop(0.50, '#967c52');
      bg.addColorStop(0.54, '#d9c59c');
      bg.addColorStop(1, '#c5ac7d');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Page rule lines
      ctx.strokeStyle = 'rgba(95, 65, 32, 0.16)';
      ctx.lineWidth = 1.5;
      for (let y = 110; y < h - 55; y += 34) {
        ctx.beginPath(); ctx.moveTo(48, y); ctx.lineTo(w * 0.46, y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * 0.54, y); ctx.lineTo(w - 48, y); ctx.stroke();
      }

      // Left page: La Secuencia de Sombras
      ctx.fillStyle = '#2a1a0d';
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('Diario de Valerio', 56, 76);
      ctx.font = 'italic 23px Georgia, serif';
      ctx.fillText('La Secuencia de Sombras:', 56, 134);
      ctx.font = '21px Georgia, serif';
      ctx.fillText('I. Mensajero junto al fuego', 56, 178);
      ctx.fillText('II. Guerrero de dos lunas', 56, 212);
      ctx.fillText('III. Soberano del halo', 56, 246);
      ctx.fillText('IV. Viajero más lejano', 56, 280);

      // Small orbital ink sketch on lower left
      ctx.strokeStyle = '#4e3117';
      ctx.lineWidth = 2.5;
      [42, 74, 106, 138].forEach(function (r) {
        ctx.beginPath(); ctx.arc(250, 445, r, 0, TWO_PI); ctx.stroke();
      });
      ctx.fillStyle = '#9c641c';
      ctx.beginPath(); ctx.arc(250, 445, 16, 0, TWO_PI); ctx.fill();

      // Right page: La Hora de la Totalidad
      ctx.fillStyle = '#2a1a0d';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.fillText('La Hora de la Totalidad', 566, 76);
      ctx.font = 'italic 22px Georgia, serif';
      ctx.fillText('Reloj de Péndulo & Espejo:', 566, 134);
      ctx.font = '21px Georgia, serif';
      ctx.fillText('• Pesa de bronce + cuerda', 566, 178);
      ctx.fillText('• Fase: Luna Nueva (Eclipse)', 566, 212);
      ctx.fillText('• Hora: Espejo de Mercurio', 566, 246);
      ctx.fillText('  (recuerda invertir la esfera)', 566, 280);

      // Small eclipse sketch on lower right
      ctx.strokeStyle = '#3c2410';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(765, 445, 86, 0, TWO_PI); ctx.stroke();
      ctx.fillStyle = '#22150a';
      ctx.beginPath(); ctx.arc(765, 445, 52, 0, TWO_PI); ctx.fill();
      ctx.strokeStyle = '#b57b24';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(765, 445, 58, 0, TWO_PI); ctx.stroke();
    });
  }

  function createMirroredClockTexture() {
    return SR.Textures.makeCanvasTexture(768, 860, function (ctx, w, h) {
      // Ornate aged brass outer plaque border
      const frameGrad = ctx.createLinearGradient(0, 0, w, h);
      frameGrad.addColorStop(0, '#6a4d1e');
      frameGrad.addColorStop(0.5, '#9d7736');
      frameGrad.addColorStop(1, '#583e16');
      ctx.fillStyle = frameGrad;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#ebd083';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, w - 24, h - 24);

      // Top engraved readable banner
      ctx.fillStyle = '#181006';
      ctx.font = 'bold 31px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('REFLEJO EN ESPEJO DE MERCURIO', w / 2, 58);

      // Silvered Mercury Mirror Plate area (antique pewter-silver without specular blowout)
      const mx = 42;
      const my = 96;
      const mw = w - 84;
      const mh = 668;
      const mirGrad = ctx.createLinearGradient(mx, my, mx + mw, my + mh);
      mirGrad.addColorStop(0, '#9baab8');
      mirGrad.addColorStop(0.28, '#bcc9d4');
      mirGrad.addColorStop(0.52, '#8b9ba8');
      mirGrad.addColorStop(0.78, '#b4c2ce');
      mirGrad.addColorStop(1, '#758594');
      ctx.fillStyle = mirGrad;
      ctx.fillRect(mx, my, mw, mh);

      // Subtle diagonal mirror sheen streaks
      ctx.save();
      ctx.beginPath();
      ctx.rect(mx, my, mw, mh);
      ctx.clip();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.24)';
      ctx.beginPath();
      ctx.moveTo(mx + 60, my);
      ctx.lineTo(mx + 190, my);
      ctx.lineTo(mx - 40, my + mh);
      ctx.lineTo(mx - 170, my + mh);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(mx + 420, my);
      ctx.lineTo(mx + 475, my);
      ctx.lineTo(mx + 245, my + mh);
      ctx.lineTo(mx + 190, my + mh);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Inner dark bezel around mirror glass
      ctx.strokeStyle = '#2d2112';
      ctx.lineWidth = 6;
      ctx.strokeRect(mx, my, mw, mh);

      // ---- HORIZONTALLY MIRRORED 8:15 CLOCK FACE ----
      const cx = w / 2;
      const cy = my + mh / 2;
      const r = 278;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(-1, 1); // EXACT horizontal mirror reflection across the 12-6 vertical axis!

      // Outer chapter ring & subtle mercury dial tint
      const dialGrad = ctx.createRadialGradient(0, 0, 20, 0, 0, r);
      dialGrad.addColorStop(0, 'rgba(255,255,255,0.45)');
      dialGrad.addColorStop(0.82, 'rgba(180,196,210,0.28)');
      dialGrad.addColorStop(1, 'rgba(95,112,128,0.45)');
      ctx.fillStyle = dialGrad;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TWO_PI);
      ctx.fill();

      ctx.strokeStyle = '#191d24';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TWO_PI);
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.90, 0, TWO_PI);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.56, 0, TWO_PI);
      ctx.stroke();

      // 60 minute ticks
      for (let i = 0; i < 60; i++) {
        const a = (i / 60) * TWO_PI - Math.PI / 2;
        const major = (i % 5 === 0);
        ctx.strokeStyle = '#151920';
        ctx.lineWidth = major ? 5 : 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * r * (major ? 0.90 : 0.93), Math.sin(a) * r * (major ? 0.90 : 0.93));
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }

      // Roman numerals (drawn in normal clock positions, then mirrored horizontally by scale(-1,1)!)
      // So III appears on the LEFT, IX on the RIGHT, VIII on LOWER-RIGHT!
      const romans = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      ctx.fillStyle = '#10141c';
      ctx.font = 'bold 46px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TWO_PI - Math.PI / 2;
        const nr = r * 0.73;
        ctx.save();
        ctx.translate(Math.cos(a) * nr, Math.sin(a) * nr);
        ctx.fillText(romans[i], 0, 0);
        ctx.restore();
      }

      // Subtle eclipse ring emblem in center
      ctx.strokeStyle = 'rgba(130, 92, 28, 0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 48, 0, TWO_PI);
      ctx.stroke();

      // LONG MINUTE HAND at :15 (normal angle = 0 rad pointing RIGHT to III -> mirrored points LEFT to mirrored III!)
      ctx.save();
      ctx.rotate(0); // 3 o'clock in unmirrored coords = :15
      ctx.fillStyle = '#141926';
      ctx.beginPath();
      ctx.moveTo(-26, -7);
      ctx.lineTo(r * 0.78, -5);
      ctx.lineTo(r * 0.87, 0);
      ctx.lineTo(r * 0.78, 5);
      ctx.lineTo(-26, 7);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // SHORT HOUR HAND at 8:15 (normal angle = (8.25/12)*2PI - PI/2 -> lower-left past VIII -> mirrored points LOWER-RIGHT past mirrored VIII!)
      const hourAngle = (8.25 / 12) * TWO_PI - Math.PI / 2;
      ctx.save();
      ctx.rotate(hourAngle);
      ctx.fillStyle = '#7a2518'; // Deep burnished crimson-bronze so hour vs minute hand contrast is unmistakable!
      ctx.beginPath();
      ctx.moveTo(-20, -10);
      ctx.lineTo(r * 0.48, -9);
      ctx.lineTo(r * 0.58, 0);
      ctx.lineTo(r * 0.48, 9);
      ctx.lineTo(-20, 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#18100c';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      // Center brass pin
      ctx.fillStyle = '#c9993c';
      ctx.beginPath();
      ctx.arc(0, 0, 16, 0, TWO_PI);
      ctx.fill();
      ctx.strokeStyle = '#1b140c';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.restore();

      // Bottom engraved readable brass caption
      ctx.fillStyle = '#181006';
      ctx.font = 'bold 26px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.fillText('HORA DEL ECLIPSE TOTAL • REFLEJO INVERTIDO', w / 2, h - 46);
    });
  }

  function createChimeKeyTexture(roman) {
    return SR.Textures.makeCanvasTexture(160, 220, function (ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#d8c393');
      g.addColorStop(0.75, '#c2a76f');
      g.addColorStop(1, '#987538');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#6f4c19';
      ctx.lineWidth = 8;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      ctx.strokeStyle = '#241506';
      ctx.lineWidth = 2;
      ctx.strokeRect(14, 14, w - 28, h - 28);

      ctx.fillStyle = '#120a03';
      ctx.font = 'bold 78px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(roman, w / 2, h * 0.56);
    });
  }

  function createCipherDiskTexture() {
    return SR.Textures.makeCanvasTexture(512, 512, function (ctx, w, h) {
      const cx = w / 2;
      const cy = h / 2;
      const r = w * 0.48;

      const grad = ctx.createRadialGradient(cx, cy, 24, cx, cy, r);
      grad.addColorStop(0, '#805b22');
      grad.addColorStop(0.5, '#d5ac57');
      grad.addColorStop(0.88, '#b48735');
      grad.addColorStop(1, '#5c3f14');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, TWO_PI);
      ctx.fill();

      ctx.strokeStyle = '#231607';
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.94, 0, TWO_PI); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.56, 0, TWO_PI); ctx.stroke();

      ctx.fillStyle = '#170e04';
      ctx.font = 'bold 48px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TWO_PI - Math.PI / 2;
        const nr = r * 0.75;
        ctx.save();
        ctx.translate(cx + Math.cos(a) * nr, cy + Math.sin(a) * nr);
        ctx.rotate(a + Math.PI / 2);
        ctx.fillText(String(i), 0, 0);
        ctx.restore();
      }
    });
  }

  function createCipherNoteTexture() {
    return SR.Textures.makeCanvasTexture(512, 640, function (ctx, w, h) {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#d2bc8e');
      g.addColorStop(1, '#b79c6b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = '#6c491f';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, w - 36, h - 36);

      ctx.fillStyle = '#26170a';
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px Georgia, serif';
      ctx.fillText('NOTA CIFRADA', w / 2, 76);

      ctx.font = 'italic 24px Georgia, serif';
      ctx.fillText('Calibración del Disco:', w / 2, 146);
      ctx.font = 'bold 30px Georgia, serif';
      ctx.fillText('★  =  Estrellas Doradas', w / 2, 198);
      ctx.font = 'italic 23px Georgia, serif';
      ctx.fillText('(ver Cúpula Celestial)', w / 2, 238);

      ctx.strokeStyle = '#704b20';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(64, 290); ctx.lineTo(w - 64, 290); ctx.stroke();

      ctx.font = 'italic 25px Georgia, serif';
      ctx.fillText('Clave Caja Fuerte:', w / 2, 355);
      ctx.font = 'bold 50px "Segoe UI Symbol", Georgia, serif';
      ctx.fillText('☉  —  ♂  —  ♄  —  ☽', w / 2, 435);

      // Red wax seal at bottom right
      ctx.fillStyle = '#8b1f24';
      ctx.beginPath();
      ctx.arc(w - 92, h - 92, 36, 0, TWO_PI);
      ctx.fill();
      ctx.strokeStyle = '#5a1014';
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.fillStyle = '#e7c272';
      ctx.font = 'bold 28px Georgia, serif';
      ctx.fillText('V', w - 92, h - 82);
    });
  }

  // ---- 3D Prop Builders ----

  function buildTelescopePickup() {
    const g = new THREE.Group();
    const brassMat = SR.Materials.get('gold').clone();
    brassMat.emissive = new THREE.Color(0x9a6f20);
    brassMat.emissiveIntensity = 0.22;
    const leatherMat = SR.Materials.get('leatherBrown');
    const lensMat = SR.Materials.get('sapphireGlass');

    // Main leather-wrapped optical barrel (aligned along X)
    const mainTube = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.029, 0.16, 20), leatherMat);
    mainTube.rotation.z = Math.PI / 2;
    g.add(mainTube);

    // Front brass objective hood & collar
    const objCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.031, 0.055, 20), brassMat);
    objCollar.rotation.z = Math.PI / 2;
    objCollar.position.x = 0.102;
    g.add(objCollar);

    const objLens = new THREE.Mesh(new THREE.CircleGeometry(0.026, 18), lensMat);
    objLens.rotation.y = Math.PI / 2;
    objLens.position.x = 0.131;
    g.add(objLens);

    // Mid drawtube section
    const midTube = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.085, 18), brassMat);
    midTube.rotation.z = Math.PI / 2;
    midTube.position.x = -0.115;
    g.add(midTube);

    // Threaded eyepiece cap (distinct brass knobbed rear cap)
    const eyeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.034, 18), brassMat);
    eyeCap.rotation.z = Math.PI / 2;
    eyeCap.position.x = -0.17;
    g.add(eyeCap);

    // Accent rings
    [-0.078, 0.075].forEach(function (rx) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.029, 0.004, 8, 18), brassMat);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = rx;
      g.add(ring);
    });

    // Generous click box
    const hit = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.11, 0.12),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    g.add(hit);

    g.userData.highlightMesh = objCollar;
    return g;
  }

  function buildCipherDiskPickup() {
    const g = new THREE.Group();
    const tex = createCipherDiskTexture();
    const faceMat = new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: new THREE.Color(0xffe096),
      emissiveIntensity: 0.24,
      roughness: 0.34,
      metalness: 0.65
    });
    const brassMat = SR.Materials.get('gold').clone();

    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.088, 0.016, 32), brassMat);
    g.add(body);

    const topFace = new THREE.Mesh(new THREE.CircleGeometry(0.086, 32), faceMat);
    topFace.rotation.x = -Math.PI / 2;
    topFace.position.y = 0.009;
    g.add(topFace);

    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.088, 0.009, 10, 32), brassMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.006;
    g.add(rim);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.024, 16), brassMat);
    hub.position.y = 0.012;
    g.add(hub);

    const hit = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    g.add(hit);

    g.userData.highlightMesh = rim;
    return g;
  }

  // ---- Station Module ----

  const DeskStation = {
    group: null,
    // Banker's lamp
    lampLight: null,
    lampShadeMat: null,
    lampBulbMat: null,
    // Pickups & Drawer
    telescopeGroup: null,
    telescopeCfg: null,
    secretDrawerGroup: null,
    drawerOpen: 0,
    drawerLight: null,
    cipherDiskGroup: null,
    cipherDiskCfg: null,
    cipherNoteGroup: null,
    cipherNoteCfg: null,
    // Chime box
    chimeKeys: [],
    chimePullbackTimer: null,

    init: function (scene) {
      const self = this;
      const wt = SR.ROOM.wallTransform(90, 0);

      const group = new THREE.Group();
      group.name = 'station_desk';
      group.position.set(wt.x, 0, wt.z);
      group.rotation.y = wt.rotY;
      scene.add(group);
      this.group = group;

      this.buildDeskFurniture(group);
      this.buildWallBlueprint(group);
      this.buildBankersLamp(group);
      this.buildSwivelChair(group);
      this.buildDiary(group);
      this.buildTelescope(group);
      this.buildMirroredClockPlate(group);
      this.buildChimeBox(group);
      this.buildSecretDrawer(group);

      // Overview click zone in 'room' view (covers both desk AND framed wall blueprint above)
      const overviewHit = new THREE.Mesh(
        new THREE.BoxGeometry(2.15, 2.38, 1.15),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      overviewHit.position.set(0, 1.20, 0.60);
      group.add(overviewHit);

      SR.registerInteractive(overviewHit, {
        id: 'desk_focus',
        station: 'desk',
        activeViews: ['room'],
        action: 'Examinar',
        label: 'Escritorio del Maestro',
        cursor: 'inspect',
        onClick: function () {
          SR.Camera.goToView('desk');
        }
      });

      // Register Camera Views
      group.updateMatrixWorld(true);

      SR.Camera.registerView('desk', {
        pos: toWorld(group, 0.0, 1.72, 2.28),
        target: toWorld(group, 0.0, 0.78, 0.72),
        fov: 50,
        title: 'Escritorio del Maestro',
        subtitle: 'Explora el diario, el catalejo, el espejo horológico y la caja de resonancia',
        parent: 'room'
      });

      SR.Camera.registerView('chime', {
        pos: toWorld(group, 0.46, 1.32, 1.28),
        target: toWorld(group, 0.54, 0.92, 0.56),
        fov: 46,
        title: 'Caja de Resonancia',
        subtitle: 'Pulsa las cinco lengüetas metálicas (I–V) para reproducir la melodía secreta',
        parent: 'desk'
      });

      SR.Camera.registerView('mirror', {
        pos: toWorld(group, -0.04, 1.04, 1.24),
        target: toWorld(group, -0.04, 1.01, 0.35),
        fov: 46,
        title: 'Espejo Horológico del Eclipse',
        subtitle: 'Reflejo en espejo de mercurio — deduce la hora real invirtiendo la esfera',
        parent: 'desk'
      });

      this.syncFromState();
    },

    // =========================================================================
    // DESK ARCHITECTURE, BLUEPRINT, LAMP & CHAIR
    // =========================================================================

    buildDeskFurniture: function (parent) {
      const matMahogany = SR.Materials.get('mahogany');
      const matWalnut = SR.Materials.get('walnut');
      const matDarkWood = SR.Materials.get('darkWood');
      const matBrass = SR.Materials.get('brass');
      const matAgedBrass = SR.Materials.get('agedBrass');

      // Main Desktop Slab (1.96m W x 0.055m H x 0.92m D, top at Y = 0.80)
      const topSlab = new THREE.Mesh(makeBox(1.96, 0.055, 0.92, 0.014), matMahogany);
      topSlab.position.set(0, 0.772, 0.58);
      topSlab.castShadow = true;
      topSlab.receiveShadow = true;
      parent.add(topSlab);

      // Decorative brass molding edging along desktop front & sides
      const frontEdge = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.014, 0.015), matAgedBrass);
      frontEdge.position.set(0, 0.772, 1.04);
      parent.add(frontEdge);

      // Left & Right Drawer Pedestals (X = ±0.64)
      [-0.64, 0.64].forEach(function (px) {
        const ped = new THREE.Mesh(makeBox(0.56, 0.72, 0.82, 0.012), matWalnut);
        ped.position.set(px, 0.38, 0.58);
        ped.castShadow = true;
        ped.receiveShadow = true;
        parent.add(ped);

        const basePlinth = new THREE.Mesh(makeBox(0.60, 0.08, 0.86, 0.01), matDarkWood);
        basePlinth.position.set(px, 0.04, 0.58);
        parent.add(basePlinth);

        // 3 Stacked Decorative Drawer Fronts with Brass Bail Handles
        [0.20, 0.41, 0.61].forEach(function (dy) {
          const dFront = new THREE.Mesh(makeBox(0.46, 0.16, 0.025, 0.006), matMahogany);
          dFront.position.set(px, dy, 0.995);
          parent.add(dFront);

          const handle = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.006, 8, 16, Math.PI), matBrass);
          handle.rotation.z = Math.PI;
          handle.position.set(px, dy + 0.01, 1.015);
          parent.add(handle);
        });
      });

      // Modesty back panel behind kneehole
      const backPanel = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.66, 0.04), matDarkWood);
      backPanel.position.set(0, 0.36, 0.20);
      parent.add(backPanel);

      // Inlaid Green Leather Desk Blotter
      const blotterTex = createBlotterTexture();
      const blotterMat = new THREE.MeshStandardMaterial({
        map: blotterTex,
        roughness: 0.65,
        metalness: 0.08
      });
      const blotter = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.008, 0.56), blotterMat);
      blotter.position.set(-0.04, 0.803, 0.62);
      blotter.receiveShadow = true;
      parent.add(blotter);

      // Small atmospheric brass inkwell & quill at back-left
      const inkBase = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.035, 16), matAgedBrass);
      inkBase.position.set(-0.46, 0.818, 0.28);
      parent.add(inkBase);
      const quill = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.18, 6), SR.Materials.get('parchment'));
      quill.position.set(-0.44, 0.90, 0.28);
      quill.rotation.z = -0.35;
      parent.add(quill);
    },

    buildWallBlueprint: function (parent) {
      const matMahogany = SR.Materials.get('mahogany');
      const matGold = SR.Materials.get('gold');

      const frameGroup = new THREE.Group();
      frameGroup.position.set(0, 1.90, 0.045);
      parent.add(frameGroup);

      const frame = new THREE.Mesh(makeBox(1.52, 0.98, 0.045, 0.01), matMahogany);
      frame.castShadow = true;
      frameGroup.add(frame);

      const innerRim = new THREE.Mesh(makeBox(1.42, 0.88, 0.05, 0.006), matGold);
      frameGroup.add(innerRim);

      const bpTex = createBlueprintTexture();
      const bpMat = new THREE.MeshStandardMaterial({
        map: bpTex,
        emissiveMap: bpTex,
        emissive: new THREE.Color(0xcce4ff),
        emissiveIntensity: 0.16,
        roughness: 0.62,
        metalness: 0.05
      });
      const bpPlane = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.84), bpMat);
      bpPlane.position.z = 0.028;
      frameGroup.add(bpPlane);
    },

    buildBankersLamp: function (parent) {
      const self = this;
      const lg = new THREE.Group();
      lg.position.set(-0.76, 0.80, 0.34);
      lg.rotation.y = 0.42;
      parent.add(lg);

      const brassMat = SR.Materials.get('gold').clone();

      // Stepped weighted brass base
      const base1 = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.084, 0.024, 24), brassMat);
      base1.position.y = 0.012;
      lg.add(base1);
      const base2 = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.064, 0.026, 20), brassMat);
      base2.position.y = 0.036;
      lg.add(base2);

      // Vertical & angled brass stem
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.30, 14), brassMat);
      stem.position.y = 0.19;
      lg.add(stem);

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.09, 12), brassMat);
      neck.position.set(0.025, 0.345, 0.02);
      neck.rotation.z = -0.55;
      lg.add(neck);

      // Iconic curved Emerald-Green Cased Glass Shade
      const shadeMat = new THREE.MeshStandardMaterial({
        color: 0x168042,
        emissive: 0x20a852,
        emissiveIntensity: 0.38,
        roughness: 0.22,
        metalness: 0.12,
        side: THREE.DoubleSide
      });
      this.lampShadeMat = shadeMat;

      const shade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.065, 0.065, 0.21, 20, 1, true, 0, Math.PI * 1.15),
        shadeMat
      );
      shade.rotation.z = Math.PI / 2;
      shade.rotation.x = -0.35;
      shade.position.set(0.045, 0.34, 0.03);
      lg.add(shade);

      // Brass end caps on shade
      [-0.105, 0.105].forEach(function (ex) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.066, 0.066, 0.012, 16, 1, false, 0, Math.PI * 1.15), brassMat);
        cap.rotation.z = Math.PI / 2;
        cap.rotation.x = -0.35;
        cap.position.set(0.045 + ex, 0.34, 0.03);
        lg.add(cap);
      });

      // Warm glowing Edison bulb underneath shade
      const bulbMat = new THREE.MeshStandardMaterial({
        color: 0xfff2cc,
        emissive: 0xffd070,
        emissiveIntensity: 1.05,
        roughness: 0.2
      });
      this.lampBulbMat = bulbMat;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 12), bulbMat);
      bulb.position.set(0.045, 0.31, 0.03);
      lg.add(bulb);

      // Balanced warm desk PointLight (rich mood without blowing out diary or mirror)
      const lampLight = new THREE.PointLight(0xffcf82, 0.90, 3.2, 2);
      lampLight.position.set(0.22, 0.48, 0.28);
      lg.add(lampLight);
      this.lampLight = lampLight;

      // Subtle permanent ambient bounce light on desk so even if lamp is toggled off, clues remain legible!
      const deskFill = new THREE.PointLight(0xd9c7a8, 0.38, 3.5, 2);
      deskFill.position.set(0.0, 1.55, 1.15);
      parent.add(deskFill);

      // Pull-chain brass bead
      const pullChain = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.08, 6), brassMat);
      pullChain.position.set(0.05, 0.26, 0.06);
      lg.add(pullChain);

      SR.registerInteractive(lg, {
        id: 'desk_banker_lamp',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Encender / Apagar',
        label: 'Lámpara de Banquero',
        cursor: 'interact',
        highlightTarget: shade,
        onClick: function () {
          const s = SR.State.data;
          s.bankerLampOn = !s.bankerLampOn;
          if (SR.Audio) SR.Audio.playClick(s.bankerLampOn ? 1.3 : 0.95);
          SR.State.save();
          self.applyLampState();
        }
      });
    },

    buildSwivelChair: function (parent) {
      const cg = new THREE.Group();
      // Positioned stylishly beside right-front of desk, completely clear of all camera views
      cg.position.set(1.16, 0, 1.32);
      cg.rotation.y = -2.35;
      parent.add(cg);

      const matWalnut = SR.Materials.get('walnut');
      const matLeather = SR.Materials.get('leatherBrown');
      const matAgedBrass = SR.Materials.get('agedBrass');

      // 4-point swivel base & brass casters
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TWO_PI + Math.PI / 4;
        const leg = new THREE.Mesh(makeBox(0.048, 0.048, 0.30, 0.01), matWalnut);
        leg.position.set(Math.sin(a) * 0.14, 0.065, Math.cos(a) * 0.14);
        leg.rotation.y = a;
        leg.rotation.x = 0.18;
        cg.add(leg);

        const caster = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 10), matAgedBrass);
        caster.position.set(Math.sin(a) * 0.27, 0.022, Math.cos(a) * 0.27);
        cg.add(caster);
      }

      // Threaded central spindle
      const spindle = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.032, 0.34, 14), matAgedBrass);
      spindle.position.y = 0.26;
      cg.add(spindle);

      // Seat frame & leather cushion
      const seatWood = new THREE.Mesh(makeBox(0.50, 0.05, 0.48, 0.015), matWalnut);
      seatWood.position.y = 0.44;
      seatWood.castShadow = true;
      cg.add(seatWood);

      const cushion = new THREE.Mesh(makeBox(0.46, 0.065, 0.44, 0.025), matLeather);
      cushion.position.y = 0.49;
      cg.add(cushion);

      // Curved Backrest & Armrests
      const backWood = new THREE.Mesh(makeBox(0.48, 0.44, 0.055, 0.018), matWalnut);
      backWood.position.set(0, 0.72, -0.22);
      backWood.rotation.x = -0.10;
      backWood.castShadow = true;
      cg.add(backWood);

      const backPad = new THREE.Mesh(makeBox(0.42, 0.36, 0.048, 0.02), matLeather);
      backPad.position.set(0, 0.72, -0.19);
      backPad.rotation.x = -0.10;
      cg.add(backPad);

      [-0.24, 0.24].forEach(function (ax) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.20, 10), matWalnut);
        post.position.set(ax, 0.56, 0.08);
        cg.add(post);

        const arm = new THREE.Mesh(makeBox(0.055, 0.035, 0.36, 0.012), matWalnut);
        arm.position.set(ax, 0.66, -0.04);
        cg.add(arm);
      });
    },

    // =========================================================================
    // DESK INTERACTIVE ITEMS (Diary, Telescope, Mirror Plate, Chime Box, Drawer)
    // =========================================================================

    buildDiary: function (parent) {
      const dg = new THREE.Group();
      dg.position.set(-0.54, 0.808, 0.68);
      dg.rotation.y = 0.16;
      parent.add(dg);

      const leatherMat = SR.Materials.get('leatherRed').clone();
      const spreadTex = createDiarySpreadTexture();
      const pageMat = new THREE.MeshStandardMaterial({
        map: spreadTex,
        emissiveMap: spreadTex,
        emissive: new THREE.Color(0xffe8be),
        emissiveIntensity: 0.04,
        roughness: 0.92,
        metalness: 0.0
      });

      // Open leather book cover underneath
      const cover = new THREE.Mesh(makeBox(0.44, 0.014, 0.30, 0.004), leatherMat);
      cover.castShadow = true;
      dg.add(cover);

      // Thick page block
      const pageBlock = new THREE.Mesh(makeBox(0.41, 0.024, 0.275, 0.004), SR.Materials.get('parchment'));
      pageBlock.position.y = 0.014;
      dg.add(pageBlock);

      // Printed open diary spread top plane
      const spreadPlane = new THREE.Mesh(new THREE.PlaneGeometry(0.408, 0.272), pageMat);
      spreadPlane.rotation.x = -Math.PI / 2;
      spreadPlane.position.y = 0.027;
      dg.add(spreadPlane);

      // Crimson silk ribbon bookmark trailing off bottom edge
      const ribbon = new THREE.Mesh(
        new THREE.BoxGeometry(0.014, 0.004, 0.12),
        new THREE.MeshStandardMaterial({ color: 0x8e1920, roughness: 0.6 })
      );
      ribbon.position.set(0.01, 0.028, 0.165);
      ribbon.rotation.y = 0.18;
      dg.add(ribbon);

      SR.registerInteractive(dg, {
        id: 'desk_diary',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Leer Diario',
        label: 'Diario Abierto de Valerio',
        cursor: 'inspect',
        highlightTarget: spreadPlane,
        onClick: function () {
          if (SR.Audio) SR.Audio.playClick(0.95);
          SR.State.unlockJournal('diary_books');
          SR.State.unlockJournal('diary_mirror');
          if (SR.UI) SR.UI.say('Has leído las anotaciones del Diario de Valerio y las has copiado en tu Cuaderno.');
          if (SR.Journal && SR.Journal.open) SR.Journal.open('diary_books');
        }
      });
    },

    buildTelescope: function (parent) {
      const self = this;
      const tg = buildTelescopePickup();
      tg.position.set(-0.02, 0.836, 0.77);
      tg.rotation.y = -0.32;
      parent.add(tg);
      this.telescopeGroup = tg;

      const cfg = {
        id: 'desk_telescope',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Recoger',
        label: 'Catalejo de Latón',
        cursor: 'interact',
        highlightTarget: tg.userData.highlightMesh,
        disabled: false,
        onClick: function () {
          self.onPickupTelescope();
        }
      };
      this.telescopeCfg = cfg;
      SR.registerInteractive(tg, cfg);
    },

    buildMirroredClockPlate: function (parent) {
      const mg = new THREE.Group();
      mg.position.set(-0.04, 0.80, 0.34);
      parent.add(mg);

      const brassMat = SR.Materials.get('agedBrass').clone();
      const goldMat = SR.Materials.get('gold');

      // Victorian Brass Easel Stand Base & Rear Strut
      const easelBase = new THREE.Mesh(makeBox(0.32, 0.022, 0.14, 0.006), brassMat);
      easelBase.position.set(0, 0.011, 0.02);
      mg.add(easelBase);

      const rearStrut = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.009, 0.30, 10), brassMat);
      rearStrut.position.set(0, 0.14, -0.07);
      rearStrut.rotation.x = 0.45;
      mg.add(rearStrut);

      // Tilted Silvered Mercury-Mirror Plaque Assembly
      const plaqueHolder = new THREE.Group();
      plaqueHolder.position.set(0, 0.215, 0.02);
      plaqueHolder.rotation.x = -0.14;
      mg.add(plaqueHolder);

      const plaqueFrame = new THREE.Mesh(makeBox(0.375, 0.415, 0.024, 0.008), brassMat);
      plaqueFrame.castShadow = true;
      plaqueHolder.add(plaqueFrame);

      // Ornate top crest finial on mirror frame
      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), goldMat);
      finial.position.set(0, 0.222, 0);
      plaqueHolder.add(finial);

      const mirrorTex = createMirroredClockTexture();
      const mirrorMat = new THREE.MeshStandardMaterial({
        map: mirrorTex,
        emissiveMap: mirrorTex,
        emissive: new THREE.Color(0xdce8f4),
        emissiveIntensity: 0.06,
        roughness: 0.46,
        metalness: 0.22
      });
      const mirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.352, 0.394), mirrorMat);
      mirrorFace.position.z = 0.014;
      plaqueHolder.add(mirrorFace);

      // Clicking in 'desk' zooms in to 'mirror' AND records journal clue
      SR.registerInteractive(plaqueHolder, {
        id: 'desk_mirror',
        station: 'desk',
        activeViews: ['desk', 'mirror'],
        action: 'Examinar Espejo',
        label: 'Espejo Horológico del Eclipse',
        cursor: 'inspect',
        highlightTarget: plaqueFrame,
        onClick: function () {
          if (SR.Audio) SR.Audio.playClick(1.1);
          SR.State.unlockJournal('mirror_plate');
          if (SR.Camera && SR.Camera.getCurrentView && SR.Camera.getCurrentView() === 'mirror') {
            if (SR.UI) SR.UI.say('Reflejo en espejo de mercurio: los números y manecillas están invertidos horizontalmente.');
            if (SR.Journal && SR.Journal.open) SR.Journal.open('mirror_plate');
          } else {
            if (SR.UI) SR.UI.say('Examinas de cerca el Espejo Horológico de Mercurio. Sus marcas quedan anotadas en tu Diario.');
            SR.Camera.goToView('mirror');
          }
        }
      });
    },

    buildChimeBox: function (parent) {
      const self = this;
      const cb = new THREE.Group();
      cb.position.set(0.54, 0.80, 0.56);
      cb.rotation.y = -0.10;
      parent.add(cb);

      const matMahogany = SR.Materials.get('mahogany');
      const matDarkWood = SR.Materials.get('darkWood');
      const matBrass = SR.Materials.get('brass');
      const matAgedBrass = SR.Materials.get('agedBrass');
      const matGold = SR.Materials.get('gold');

      // Stepped Mahogany Automaton Housing
      const boxBase = new THREE.Mesh(makeBox(0.46, 0.095, 0.31, 0.012), matMahogany);
      boxBase.position.set(0, 0.048, 0);
      boxBase.castShadow = true;
      boxBase.receiveShadow = true;
      cb.add(boxBase);

      const boxPlinth = new THREE.Mesh(makeBox(0.49, 0.022, 0.34, 0.008), matDarkWood);
      boxPlinth.position.set(0, 0.011, 0);
      cb.add(boxPlinth);

      // Recessed brass acoustic soundboard deck
      const deck = new THREE.Mesh(new THREE.BoxGeometry(0.41, 0.008, 0.25), matAgedBrass);
      deck.position.set(0, 0.098, -0.01);
      cb.add(deck);

      // Rear decorative brass resonator rack rail
      [-0.19, 0.19].forEach(function (px) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.01, 0.19, 10), matGold);
        post.position.set(px, 0.19, -0.105);
        cb.add(post);
      });
      const rackBar = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.39, 10), matGold);
      rackBar.rotation.z = Math.PI / 2;
      rackBar.position.set(0, 0.20, -0.105);
      cb.add(rackBar);

      // 5 Ascending Resonator Tubes + Articulated Striker Hammers + Clickable Keys (I..V)
      this.chimeKeys = [];
      const keySpacing = 0.078;
      const startX = -keySpacing * 2;

      for (let i = 1; i <= 5; i++) {
        const kx = startX + (i - 1) * keySpacing;
        const tubeH = 0.105 + (i - 1) * 0.026; // ascending heights!

        // Brass Resonator Tube
        const tubeMat = matGold.clone();
        tubeMat.emissive = new THREE.Color(0xffb832);
        tubeMat.emissiveIntensity = 0.06;
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, tubeH, 18), tubeMat);
        tube.position.set(kx, 0.10 + tubeH / 2, -0.095);
        tube.castShadow = true;
        cb.add(tube);

        const tubeCap = new THREE.Mesh(new THREE.TorusGeometry(0.019, 0.004, 8, 18), matBrass);
        tubeCap.rotation.x = Math.PI / 2;
        tubeCap.position.set(kx, 0.10 + tubeH, -0.095);
        cb.add(tubeCap);

        // Articulated Miniature Brass Striker Hammer
        const hammerPivot = new THREE.Group();
        hammerPivot.position.set(kx, 0.112, -0.022);
        cb.add(hammerPivot);

        const hArm = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.082, 8), matBrass);
        hArm.position.y = 0.041;
        hammerPivot.add(hArm);

        const hHead = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.024, 12), matGold);
        hHead.rotation.x = Math.PI / 2;
        hHead.position.set(0, 0.082, -0.008);
        hammerPivot.add(hHead);
        hammerPivot.rotation.x = 0.36; // poised slightly forward toward player, strikes backward (-0.32) onto tube!

        // Clickable Metallic Key (I..V) on front keyboard apron
        const keyGroup = new THREE.Group();
        keyGroup.position.set(kx, 0.106, 0.082);
        cb.add(keyGroup);

        const keyTex = createChimeKeyTexture(ROMAN_KEYS[i]);
        const keyFaceMat = new THREE.MeshStandardMaterial({
          map: keyTex,
          emissiveMap: keyTex,
          emissive: new THREE.Color(0xffdf80),
          emissiveIntensity: 0.04,
          roughness: 0.56,
          metalness: 0.16
        });

        const keyBodyMat = matGold.clone();
        const keyBody = new THREE.Mesh(makeBox(0.064, 0.024, 0.11, 0.005), keyBodyMat);
        keyGroup.add(keyBody);

        const keyCap = new THREE.Mesh(new THREE.PlaneGeometry(0.058, 0.098), keyFaceMat);
        keyCap.rotation.x = -Math.PI / 2;
        keyCap.position.y = 0.013;
        keyGroup.add(keyCap);

        const noteIndex = i;
        const keyEntry = {
          noteIndex: noteIndex,
          keyGroup: keyGroup,
          restY: 0.106,
          hammerPivot: hammerPivot,
          tubeMat: tubeMat,
          keyFaceMat: keyFaceMat,
          anim: 0 // 1 -> 0 impulse timer
        };
        this.chimeKeys.push(keyEntry);

        SR.registerInteractive(keyGroup, {
          id: 'desk_chime_key_' + i,
          station: 'desk',
          activeViews: ['chime'],
          action: 'Pulsar nota',
          label: 'Tecla ' + ROMAN_KEYS[i],
          cursor: 'interact',
          highlightTarget: keyBody,
          onClick: function () {
            self.onChimeKeyClick(keyEntry);
          }
        });
      }

      // Focus hitbox in 'desk' view -> zoom to 'chime'
      const chimeFocusHit = new THREE.Mesh(
        new THREE.BoxGeometry(0.50, 0.34, 0.36),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      chimeFocusHit.position.set(0, 0.17, 0);
      cb.add(chimeFocusHit);

      SR.registerInteractive(chimeFocusHit, {
        id: 'desk_chime_focus',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Acercar',
        label: 'Caja de Resonancia (5 Notas)',
        cursor: 'inspect',
        highlightTarget: boxBase,
        onClick: function () {
          SR.Camera.goToView('chime');
        }
      });
    },

    buildSecretDrawer: function (parent) {
      const self = this;
      const matMahogany = SR.Materials.get('mahogany');
      const matWalnut = SR.Materials.get('walnut');
      const matBrass = SR.Materials.get('brass');
      const matVelvet = SR.Materials.get('velvet');

      const dg = new THREE.Group();
      // Closed Z = 0.78 (front face at Z = 0.99); opens forward to Z = 1.16!
      dg.position.set(0, 0.685, 0.78);
      parent.add(dg);
      this.secretDrawerGroup = dg;

      // Drawer box (hollow open-top tray!)
      const dBottom = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.018, 0.42), matVelvet);
      dBottom.position.set(0, -0.048, 0);
      dg.add(dBottom);

      const dFront = new THREE.Mesh(makeBox(0.70, 0.13, 0.028, 0.008), matMahogany);
      dFront.position.set(0, 0.0, 0.205);
      dFront.castShadow = true;
      dg.add(dFront);

      const dBack = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.11, 0.02), matWalnut);
      dBack.position.set(0, -0.005, -0.20);
      dg.add(dBack);

      [-0.33, 0.33].forEach(function (sx) {
        const side = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.41), matWalnut);
        side.position.set(sx, -0.005, 0);
        dg.add(side);
      });

      // Decorative brass keyhole rosette on drawer front
      const escutcheon = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.01, 16), matBrass);
      escutcheon.rotation.x = Math.PI / 2;
      escutcheon.position.set(0, 0, 0.222);
      dg.add(escutcheon);

      // Subtle warm glow illuminating the drawer contents once slid open
      const drawerLight = new THREE.PointLight(0xffcf78, 0, 1.4, 2);
      drawerLight.position.set(0, 0.16, 0.04);
      dg.add(drawerLight);
      this.drawerLight = drawerLight;

      // 1. Pickup inside drawer: Disco Móvil de Latón (cipher_disk)
      const diskGroup = buildCipherDiskPickup();
      diskGroup.position.set(-0.16, -0.025, 0.03);
      diskGroup.visible = false;
      dg.add(diskGroup);
      this.cipherDiskGroup = diskGroup;

      const diskCfg = {
        id: 'desk_pickup_cipher_disk',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Recoger',
        label: 'Disco Móvil de Latón',
        cursor: 'interact',
        highlightTarget: diskGroup.userData.highlightMesh,
        disabled: true,
        onClick: function () {
          self.onPickupCipherDisk();
        }
      };
      this.cipherDiskCfg = diskCfg;
      SR.registerInteractive(diskGroup, diskCfg);

      // 2. Clickable Document inside drawer: Nota Cifrada de Valerio
      const noteGroup = new THREE.Group();
      noteGroup.position.set(0.14, -0.034, 0.02);
      noteGroup.rotation.y = -0.08;
      noteGroup.visible = false;
      dg.add(noteGroup);
      this.cipherNoteGroup = noteGroup;

      const noteTex = createCipherNoteTexture();
      const noteMat = new THREE.MeshStandardMaterial({
        map: noteTex,
        emissiveMap: noteTex,
        emissive: new THREE.Color(0xffe8ba),
        emissiveIntensity: 0.04,
        roughness: 0.88,
        metalness: 0.02
      });
      const noteSheet = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.008, 0.26), noteMat);
      noteGroup.add(noteSheet);

      const noteCfg = {
        id: 'desk_cipher_note',
        station: 'desk',
        activeViews: ['desk'],
        action: 'Leer Nota',
        label: 'Nota Cifrada de Valerio',
        cursor: 'inspect',
        highlightTarget: noteSheet,
        disabled: true,
        onClick: function () {
          if (SR.Audio) SR.Audio.playClick(1.05);
          SR.State.unlockJournal('cipher_note');
          if (SR.UI) SR.UI.say('Has leído la Nota Cifrada de Valerio y la has guardado en tu Diario.');
          if (SR.Journal && SR.Journal.open) SR.Journal.open('cipher_note');
        }
      };
      this.cipherNoteCfg = noteCfg;
      SR.registerInteractive(noteGroup, noteCfg);
    },

    // =========================================================================
    // INTERACTION HANDLERS
    // =========================================================================

    applyLampState: function () {
      const on = !!SR.State.data.bankerLampOn;
      if (this.lampLight) this.lampLight.intensity = on ? 0.90 : 0.0;
      if (this.lampShadeMat) this.lampShadeMat.emissiveIntensity = on ? 0.38 : 0.04;
      if (this.lampBulbMat) this.lampBulbMat.emissiveIntensity = on ? 1.05 : 0.02;
    },

    refreshPickups: function () {
      const s = SR.State.data;

      const showTelescope = !s.telescopeTaken;
      if (this.telescopeGroup) this.telescopeGroup.visible = showTelescope;
      updateInteractive('desk_telescope', this.telescopeCfg, { disabled: !showTelescope });

      const showDisk = !!(s.chimeSolved && !s.cipherDiskTaken);
      if (this.cipherDiskGroup) this.cipherDiskGroup.visible = showDisk;
      updateInteractive('desk_pickup_cipher_disk', this.cipherDiskCfg, { disabled: !showDisk });

      const showNote = !!s.chimeSolved;
      if (this.cipherNoteGroup) this.cipherNoteGroup.visible = showNote;
      updateInteractive('desk_cipher_note', this.cipherNoteCfg, { disabled: !showNote });
    },

    onPickupTelescope: function () {
      const s = SR.State.data;
      if (s.telescopeTaken) return;
      s.telescopeTaken = true;
      SR.State.addItem('telescope');
      if (SR.Audio) SR.Audio.playPickup();
      this.refreshPickups();
      if (SR.UI) {
        SR.UI.say('Has recogido el Catalejo de Latón. El ocular parece desenroscarse... examínalo en el Inspector 3D.');
      }
    },

    onChimeKeyClick: function (keyEntry) {
      const self = this;
      const s = SR.State.data;

      // Trigger mechanical strike animation & chime note
      keyEntry.anim = 1.0;
      if (SR.Audio) SR.Audio.playChime(keyEntry.noteIndex);

      if (s.chimeSolved) {
        if (SR.UI) SR.UI.say('La nota ' + ROMAN_KEYS[keyEntry.noteIndex] + ' resuena con pureza. El cajón secreto ya está abierto.', 2400);
        return;
      }

      if (!Array.isArray(s.chimeSequence)) s.chimeSequence = [];
      s.chimeSequence.push(keyEntry.noteIndex);
      if (s.chimeSequence.length > 5) {
        s.chimeSequence.shift();
      }
      SR.State.save();

      // Check sliding window of last 5 played notes against [3, 1, 5, 2, 4]
      let matched = (s.chimeSequence.length === CHIME_TARGET.length);
      if (matched) {
        for (let i = 0; i < CHIME_TARGET.length; i++) {
          if (s.chimeSequence[i] !== CHIME_TARGET[i]) {
            matched = false;
            break;
          }
        }
      }

      if (matched) {
        s.chimeSolved = true;
        SR.State.save();
        if (SR.Audio) {
          SR.Audio.playSolve();
          SR.Audio.playDrawer();
        }
        this.refreshPickups();
        if (SR.UI) {
          SR.UI.say('¡La secuencia III – I – V – II – IV desbloquea un resorte oculto! El cajón secreto del escritorio se desliza abierto.');
        }

        // Smoothly pull back to 'desk' so the player immediately sees the open drawer
        if (this.chimePullbackTimer) clearTimeout(this.chimePullbackTimer);
        this.chimePullbackTimer = setTimeout(function () {
          self.chimePullbackTimer = null;
          if (SR.Camera && SR.Camera.getCurrentView && SR.Camera.getCurrentView() === 'chime') {
            SR.Camera.goToView('desk', false);
          }
        }, 950);
      } else {
        const playedStr = s.chimeSequence.map(function (n) { return ROMAN_KEYS[n]; }).join(' – ');
        if (SR.UI) SR.UI.say('Resonancia: ' + playedStr, 2200);
      }
    },

    onPickupCipherDisk: function () {
      const s = SR.State.data;
      if (!s.chimeSolved || s.cipherDiskTaken) return;
      s.cipherDiskTaken = true;
      SR.State.addItem('cipher_disk');
      if (SR.Audio) SR.Audio.playPickup();
      this.refreshPickups();
      if (SR.UI) {
        SR.UI.say('Has recogido el Disco Móvil de Latón. Encajará en el Disco Cifrador Zodiacal de la consola.');
      }
    },

    // =========================================================================
    // STATE SYNC & FRAME UPDATE
    // =========================================================================

    syncFromState: function () {
      const s = SR.State.data;
      if (this.chimePullbackTimer) {
        clearTimeout(this.chimePullbackTimer);
        this.chimePullbackTimer = null;
      }
      this.applyLampState();
      this.drawerOpen = s.chimeSolved ? 1 : 0;
      this.applyDrawerPose(this.drawerOpen);
      this.refreshPickups();
    },

    applyDrawerPose: function (t) {
      const ease = 1 - Math.pow(1 - t, 3);
      if (this.secretDrawerGroup) {
        this.secretDrawerGroup.position.z = 0.78 + ease * 0.39;
      }
      if (this.drawerLight) {
        this.drawerLight.intensity = ease * 0.42;
      }
    },

    update: function (dt, elapsed) {
      const s = SR.State.data;

      // Animate Chime Box keys, hammers & glowing resonator tubes
      for (let i = 0; i < this.chimeKeys.length; i++) {
        const k = this.chimeKeys[i];
        if (k.anim > 0) {
          k.anim = Math.max(0, k.anim - dt * 2.4);
          // Smooth hammer strike curve: quickly hits tube (anim ~0.78) then rebounds to rest
          const strike = Math.sin(Math.min(1, (1 - k.anim) * 3.2) * Math.PI);
          k.hammerPivot.rotation.x = 0.36 - strike * 0.74;
          k.keyGroup.position.y = k.restY - Math.sin(k.anim * Math.PI) * 0.011;
          k.tubeMat.emissiveIntensity = 0.06 + k.anim * 1.45;
          k.keyFaceMat.emissiveIntensity = 0.04 + k.anim * 0.95;
        } else {
          k.hammerPivot.rotation.x = 0.36;
          k.keyGroup.position.y = k.restY;
          k.tubeMat.emissiveIntensity = 0.06;
          k.keyFaceMat.emissiveIntensity = 0.04;
        }
      }

      // Animate Secret Center Desk Drawer sliding smoothly open
      const targetDrawer = s.chimeSolved ? 1 : 0;
      if (Math.abs(targetDrawer - this.drawerOpen) > 0.001) {
        this.drawerOpen += (targetDrawer - this.drawerOpen) * Math.min(1, dt * 3.2);
        this.applyDrawerPose(this.drawerOpen);
      }

      // Subtle inviting spin on Cipher Disk while waiting in open drawer
      if (this.cipherDiskGroup && this.cipherDiskGroup.visible) {
        this.cipherDiskGroup.rotation.y = elapsed * 0.35;
      }
    }
  };

  SR.Stations.desk = DeskStation;
})(window.SR = window.SR || {});
