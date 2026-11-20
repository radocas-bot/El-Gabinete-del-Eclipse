/* ==========================================================================
   src/core/textures.js — Procedural PBR Canvas2D Texture Generator
   ========================================================================== */
(function (SR) {
  'use strict';

  const cache = {};

  // Deterministic PRNG (Mulberry32) so procedural textures look identical every run
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeCanvasTexture(w, h, drawFn, opts) {
    opts = opts || {};
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (drawFn) {
      drawFn(ctx, w, h);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
    tex.anisotropy = opts.anisotropy !== undefined ? opts.anisotropy : 8;
    if (opts.repeat) {
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      if (Array.isArray(opts.repeat)) {
        tex.repeat.set(opts.repeat[0], opts.repeat[1]);
      } else if (typeof opts.repeat === 'number') {
        tex.repeat.set(opts.repeat, opts.repeat);
      } else if (typeof opts.repeat === 'object') {
        tex.repeat.set(opts.repeat.x || 1, opts.repeat.y || 1);
      }
    } else if (opts.wrap) {
      tex.wrapS = opts.wrap;
      tex.wrapT = opts.wrap;
    }
    if (opts.minFilter) tex.minFilter = opts.minFilter;
    if (opts.magFilter) tex.magFilter = opts.magFilter;
    tex.needsUpdate = true;
    return tex;
  }

  function cached(key, factory) {
    if (!cache[key]) {
      cache[key] = factory();
    }
    return cache[key];
  }

  // ---------- Wood Grain Generator (Mahogany / Dark Walnut / Dark Wood) ----------
  function makeWoodPair(key, baseHex, darkHex, highlightHex, seed) {
    return cached(key, function () {
      const repeat = [1, 1];
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(seed);
        ctx.fillStyle = baseHex;
        ctx.fillRect(0, 0, w, h);

        // Subtle plank variation bands
        const planks = 4;
        const pw = w / planks;
        for (let p = 0; p < planks; p++) {
          ctx.fillStyle = p % 2 === 0 ? 'rgba(255,220,180,0.035)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(p * pw, 0, pw, h);
        }

        // Flowing vertical wood fibers
        for (let i = 0; i < 420; i++) {
          const x0 = rng() * w;
          const amp = 2 + rng() * 9;
          const freq = (1 + Math.floor(rng() * 3)) * Math.PI * 2 / h;
          const phase = rng() * Math.PI * 2;
          ctx.strokeStyle = rng() > 0.35 ? darkHex : highlightHex;
          ctx.globalAlpha = 0.08 + rng() * 0.22;
          ctx.lineWidth = 0.6 + rng() * 2.4;
          ctx.beginPath();
          for (let y = 0; y <= h; y += 8) {
            const x = x0 + Math.sin(y * freq + phase) * amp;
            if (y === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }

        // Subtle organic knots
        for (let k = 0; k < 4; k++) {
          const kx = 40 + rng() * (w - 80);
          const ky = 40 + rng() * (h - 80);
          const kr = 12 + rng() * 20;
          const grad = ctx.createRadialGradient(kx, ky, 1, kx, ky, kr);
          grad.addColorStop(0, darkHex);
          grad.addColorStop(0.55, 'rgba(20,8,4,0.28)');
          grad.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.globalAlpha = 0.45;
          ctx.fillStyle = grad;
          ctx.save();
          ctx.translate(kx, ky);
          ctx.scale(0.45, 1.5);
          ctx.beginPath();
          ctx.arc(0, 0, kr, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Fine wood pore speckles
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = darkHex;
        for (let s = 0; s < 1600; s++) {
          ctx.fillRect(rng() * w, rng() * h, 1, 3 + rng() * 7);
        }
        ctx.globalAlpha = 1;
      }, { repeat: repeat });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(seed + 101);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 360; i++) {
          const x0 = rng() * w;
          const amp = 2 + rng() * 8;
          const freq = (1 + Math.floor(rng() * 3)) * Math.PI * 2 / h;
          const phase = rng() * Math.PI * 2;
          const shade = rng() > 0.5 ? '#a2a2a2' : '#585858';
          ctx.strokeStyle = shade;
          ctx.globalAlpha = 0.14 + rng() * 0.2;
          ctx.lineWidth = 0.8 + rng() * 2.0;
          ctx.beginPath();
          for (let y = 0; y <= h; y += 10) {
            const x = x0 + Math.sin(y * freq + phase) * amp;
            if (y === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }, { linear: true, repeat: repeat });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Victorian Damask Wallpaper ----------
  function getDamask() {
    return cached('damask', function () {
      const drawMotif = function (ctx, cx, cy, scale, stroke, fill) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);

        // Outer botanical diamond medallion
        ctx.beginPath();
        ctx.moveTo(0, -68);
        ctx.bezierCurveTo(32, -46, 54, -22, 58, 0);
        ctx.bezierCurveTo(54, 22, 32, 46, 0, 68);
        ctx.bezierCurveTo(-32, 46, -54, 22, -58, 0);
        ctx.bezierCurveTo(-54, -22, -32, -46, 0, -68);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2.2;
        ctx.stroke();

        // Inner baroque fleur-de-lis & celestial star
        ctx.beginPath();
        ctx.moveTo(0, -44);
        ctx.quadraticCurveTo(18, -14, 0, 10);
        ctx.quadraticCurveTo(-18, -14, 0, -44);
        ctx.moveTo(0, 44);
        ctx.quadraticCurveTo(18, 14, 0, -10);
        ctx.quadraticCurveTo(-18, 14, 0, 44);
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Curled acanthus wings
        for (let sx = -1; sx <= 1; sx += 2) {
          for (let sy = -1; sy <= 1; sy += 2) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.bezierCurveTo(sx * 24, sy * 6, sx * 36, sy * 22, sx * 22, sy * 36);
            ctx.bezierCurveTo(sx * 12, sy * 42, sx * 6, sy * 28, sx * 14, sy * 22);
            ctx.stroke();
          }
        }

        // Center 4-point celestial star
        ctx.fillStyle = stroke;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 === 0 ? 11 : 4;
          const a = (i * Math.PI) / 4;
          if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      };

      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(4409);
        // Deep nocturnal Victorian teal-obsidian base
        const grad = ctx.createLinearGradient(0, 0, w, 0);
        grad.addColorStop(0, '#132028');
        grad.addColorStop(0.5, '#192a34');
        grad.addColorStop(1, '#132028');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Subtle vertical woven silk stripes
        for (let x = 0; x < w; x += 16) {
          ctx.fillStyle = (x / 16) % 2 === 0 ? 'rgba(255,220,145,0.03)' : 'rgba(0,0,0,0.08)';
          ctx.fillRect(x, 0, 8, h);
        }

        // Fine antique gold pinstripe accents
        ctx.strokeStyle = 'rgba(182, 145, 76, 0.14)';
        ctx.lineWidth = 1;
        for (let x = 64; x < w; x += 128) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, h);
          ctx.stroke();
        }

        // Seamless staggered damask repeat
        const pts = [
          [128, 128], [384, 128], [128, 384], [384, 384],
          [0, 0], [256, 0], [512, 0],
          [0, 256], [256, 256], [512, 256],
          [0, 512], [256, 512], [512, 512]
        ];
        pts.forEach(function (pt) {
          drawMotif(ctx, pt[0], pt[1], 1.15, 'rgba(195, 155, 78, 0.34)', 'rgba(30, 52, 64, 0.45)');
        });

        // Subtle fabric grain & age patina
        for (let i = 0; i < 2400; i++) {
          ctx.fillStyle = rng() > 0.5 ? 'rgba(255,245,220,0.025)' : 'rgba(0,0,0,0.04)';
          ctx.fillRect(rng() * w, rng() * h, 2, 2);
        }
      }, { repeat: [2, 1.5] });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        ctx.fillStyle = '#6e6e6e';
        ctx.fillRect(0, 0, w, h);
        const pts = [
          [128, 128], [384, 128], [128, 384], [384, 384],
          [0, 0], [256, 0], [512, 0],
          [0, 256], [256, 256], [512, 256],
          [0, 512], [256, 512], [512, 512]
        ];
        pts.forEach(function (pt) {
          drawMotif(ctx, pt[0], pt[1], 1.15, '#c8c8c8', '#969696');
        });
      }, { linear: true, repeat: [2, 1.5] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Aged Slate & Brass Zodiac Compass Rose Floor ----------
  function getSlateFloor() {
    return cached('slateFloor', function () {
      const map = makeCanvasTexture(1024, 1024, function (ctx, w, h) {
        const rng = makeRng(8812);
        const cx = w / 2;
        const cy = h / 2;

        // Deep charcoal-slate stone base
        const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, w * 0.52);
        bg.addColorStop(0, '#2a2c33');
        bg.addColorStop(0.65, '#1e2027');
        bg.addColorStop(1, '#14151b');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Radial stone flagstone tiles
        ctx.strokeStyle = 'rgba(8, 8, 12, 0.72)';
        ctx.lineWidth = 3;
        const rings = [110, 200, 300, 405, 495];
        rings.forEach(function (r) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110);
          ctx.lineTo(cx + Math.cos(a) * 510, cy + Math.sin(a) * 510);
          ctx.stroke();
        }

        // Stone speckle & mineral marbling
        for (let i = 0; i < 7000; i++) {
          const x = rng() * w;
          const y = rng() * h;
          const sz = 1 + rng() * 4;
          ctx.fillStyle = rng() > 0.5 ? 'rgba(130,140,165,0.035)' : 'rgba(0,0,0,0.06)';
          ctx.fillRect(x, y, sz, sz);
        }

        // Inlaid Burnished Brass Rings
        const brassRings = [118, 205, 310, 385, 455, 472];
        brassRings.forEach(function (r, idx) {
          ctx.strokeStyle = idx % 2 === 0 ? 'rgba(208, 168, 86, 0.78)' : 'rgba(165, 128, 56, 0.52)';
          ctx.lineWidth = idx === 4 ? 5 : 2.5;
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // 16-Point Compass Rose in Brass Inlay
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8 - Math.PI / 2;
          const outerR = i % 2 === 0 ? 452 : 378;
          const innerR = 122;
          const spread = i % 2 === 0 ? 0.08 : 0.045;

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.lineTo(cx + Math.cos(a + spread) * innerR, cy + Math.sin(a + spread) * innerR);
          ctx.lineTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? 'rgba(218, 178, 94, 0.58)' : 'rgba(165, 130, 62, 0.38)';
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * outerR, cy + Math.sin(a) * outerR);
          ctx.lineTo(cx + Math.cos(a - spread) * innerR, cy + Math.sin(a - spread) * innerR);
          ctx.lineTo(cx + Math.cos(a) * innerR, cy + Math.sin(a) * innerR);
          ctx.closePath();
          ctx.fillStyle = 'rgba(110, 82, 34, 0.42)';
          ctx.fill();
        }

        // Degree ticks along outer brass band
        ctx.strokeStyle = 'rgba(214, 174, 92, 0.65)';
        for (let d = 0; d < 72; d++) {
          const a = (d * Math.PI * 2) / 72;
          const len = d % 9 === 0 ? 18 : 9;
          ctx.lineWidth = d % 9 === 0 ? 2.5 : 1.2;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * (455 - len), cy + Math.sin(a) * (455 - len));
          ctx.lineTo(cx + Math.cos(a) * 455, cy + Math.sin(a) * 455);
          ctx.stroke();
        }

        // Subtle Zodiac & Cardinal Inscriptions between r=395 and r=445
        const glyphs = ['♈', '♊', '♋', '♍', '♎', '♐', '♑', '♒'];
        ctx.font = 'bold 34px Georgia, serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(225, 186, 102, 0.72)';
        for (let i = 0; i < 8; i++) {
          const a = (i * Math.PI) / 4 - Math.PI / 2;
          ctx.save();
          ctx.translate(cx + Math.cos(a) * 422, cy + Math.sin(a) * 422);
          ctx.rotate(a + Math.PI / 2);
          ctx.fillText(glyphs[i], 0, 0);
          ctx.restore();
        }
      });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(8813);
        const cx = w / 2;
        const cy = h / 2;
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 3500; i++) {
          const v = 105 + Math.floor(rng() * 46);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.fillRect(rng() * w, rng() * h, 3, 3);
        }
        ctx.strokeStyle = '#383838';
        ctx.lineWidth = 2;
        [55, 100, 150, 202, 248].forEach(function (r) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        ctx.strokeStyle = '#c4c4c4';
        ctx.lineWidth = 2;
        [59, 102, 155, 192, 228].forEach(function (r) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });
      }, { linear: true });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Plain Aged Slate (for Fireplace, Telemetry, Optical Bench) ----------
  function getSlate() {
    return cached('slate', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(5190);
        ctx.fillStyle = '#242730';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2600; i++) {
          const x = rng() * w;
          const y = rng() * h;
          ctx.fillStyle = rng() > 0.5 ? 'rgba(135,150,175,0.045)' : 'rgba(6,8,12,0.08)';
          ctx.fillRect(x, y, 2 + rng() * 14, 1 + rng() * 5);
        }
        // Subtle mineral veins
        ctx.strokeStyle = 'rgba(155, 165, 185, 0.06)';
        ctx.lineWidth = 1.4;
        for (let v = 0; v < 14; v++) {
          ctx.beginPath();
          let x = rng() * w;
          let y = rng() * h;
          ctx.moveTo(x, y);
          for (let s = 0; s < 6; s++) {
            x += (rng() - 0.5) * 90;
            y += (rng() - 0.5) * 90;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }, { repeat: [1, 1] });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(5191);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2400; i++) {
          const v = 100 + Math.floor(rng() * 55);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 12, 2 + rng() * 4);
        }
      }, { linear: true, repeat: [1, 1] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Hammered Brass ----------
  function getBrass() {
    return cached('brass', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(3301);
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, '#cfa04c');
        grad.addColorStop(0.5, '#dfb562');
        grad.addColorStop(1, '#ba8a38');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        // Brushed fine metallic sheen
        for (let i = 0; i < 1200; i++) {
          ctx.fillStyle = rng() > 0.5 ? 'rgba(255,244,200,0.06)' : 'rgba(85,55,15,0.06)';
          ctx.fillRect(rng() * w, rng() * h, 18 + rng() * 55, 1);
        }

        // Subtle hammered dimples
        for (let d = 0; d < 160; d++) {
          const x = rng() * w;
          const y = rng() * h;
          const r = 4 + rng() * 12;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, 'rgba(255,236,185,0.08)');
          g.addColorStop(1, 'rgba(70,45,10,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }, { repeat: [1, 1] });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(3302);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 900; i++) {
          const v = 112 + Math.floor(rng() * 32);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.fillRect(rng() * w, rng() * h, 14 + rng() * 44, 1);
        }
        for (let d = 0; d < 140; d++) {
          const x = rng() * w;
          const y = rng() * h;
          const r = 4 + rng() * 10;
          const g = ctx.createRadialGradient(x, y, 0, x, y, r);
          g.addColorStop(0, '#9a9a9a');
          g.addColorStop(1, 'rgba(128,128,128,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }, { linear: true, repeat: [1, 1] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Dark Riveted Iron ----------
  function getIron() {
    return cached('iron', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(7011);
        ctx.fillStyle = '#2c2f36';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 3200; i++) {
          const v = 32 + Math.floor(rng() * 34);
          ctx.fillStyle = 'rgba(' + v + ',' + (v + 2) + ',' + (v + 6) + ',0.25)';
          ctx.fillRect(rng() * w, rng() * h, 2 + rng() * 8, 2 + rng() * 8);
        }
        // Subtle forged plate seam & rivets along borders
        ctx.strokeStyle = 'rgba(10,12,15,0.6)';
        ctx.lineWidth = 4;
        ctx.strokeRect(4, 4, w - 8, h - 8);
        for (let p = 32; p < w; p += 64) {
          [[p, 20], [p, h - 20], [20, p], [w - 20, p]].forEach(function (pt) {
            const g = ctx.createRadialGradient(pt[0] - 2, pt[1] - 2, 1, pt[0], pt[1], 7);
            g.addColorStop(0, '#5a606c');
            g.addColorStop(0.7, '#282b31');
            g.addColorStop(1, '#121418');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 7, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }, { repeat: [1, 1] });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(7012);
        ctx.fillStyle = '#7e7e7e';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 2400; i++) {
          const v = 96 + Math.floor(rng() * 64);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.fillRect(rng() * w, rng() * h, 3, 3);
        }
        for (let p = 32; p < w; p += 64) {
          [[p, 20], [p, h - 20], [20, p], [w - 20, p]].forEach(function (pt) {
            const g = ctx.createRadialGradient(pt[0], pt[1], 1, pt[0], pt[1], 8);
            g.addColorStop(0, '#e0e0e0');
            g.addColorStop(1, '#7e7e7e');
            ctx.fillStyle = g;
            ctx.beginPath();
            ctx.arc(pt[0], pt[1], 8, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }, { linear: true, repeat: [1, 1] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Pebbled Leather Bump ----------
  function getLeather() {
    return cached('leather', function () {
      const bump = makeCanvasTexture(256, 256, function (ctx, w, h) {
        const rng = makeRng(6120);
        ctx.fillStyle = '#7a7a7a';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1600; i++) {
          const x = rng() * w;
          const y = rng() * h;
          const r = 1.5 + rng() * 3.2;
          const v = 100 + Math.floor(rng() * 75);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }, { linear: true, repeat: [2, 2] });
      return { bumpMap: bump };
    });
  }

  // ---------- Aged Parchment ----------
  function getParchment() {
    return cached('parchment', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(2104);
        const grad = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.72);
        grad.addColorStop(0, '#f3e7c8');
        grad.addColorStop(0.75, '#e2cfa4');
        grad.addColorStop(1, '#c4a875');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);

        for (let i = 0; i < 3200; i++) {
          ctx.fillStyle = rng() > 0.5 ? 'rgba(130,90,40,0.045)' : 'rgba(255,250,235,0.06)';
          ctx.fillRect(rng() * w, rng() * h, 1 + rng() * 6, 1 + rng() * 3);
        }
        for (let s = 0; s < 10; s++) {
          const sx = rng() * w;
          const sy = rng() * h;
          const sr = 20 + rng() * 55;
          const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, sr);
          g.addColorStop(0, 'rgba(140, 96, 42, 0.08)');
          g.addColorStop(1, 'rgba(140, 96, 42, 0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(sx, sy, sr, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      const bump = makeCanvasTexture(256, 256, function (ctx, w, h) {
        const rng = makeRng(2105);
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1800; i++) {
          const v = 114 + Math.floor(rng() * 28);
          ctx.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')';
          ctx.fillRect(rng() * w, rng() * h, 3, 2);
        }
      }, { linear: true });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Veined Dark Marble ----------
  function getMarble() {
    return cached('marble', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(9090);
        ctx.fillStyle = '#1b1d22';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 24; i++) {
          ctx.beginPath();
          let x = rng() * w;
          let y = 0;
          ctx.moveTo(x, y);
          while (y < h) {
            x += (rng() - 0.45) * 42;
            y += 16 + rng() * 22;
            ctx.lineTo(x, y);
          }
          ctx.strokeStyle = i % 3 === 0 ? 'rgba(218, 186, 122, 0.16)' : 'rgba(205, 212, 224, 0.12)';
          ctx.lineWidth = 0.8 + rng() * 2.4;
          ctx.stroke();
        }
      }, { repeat: [1, 1] });
      return { map: map };
    });
  }

  // ---------- Crimson-Gold Victorian Carpet ----------
  function getCarpet() {
    return cached('carpet', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(4567);
        const cx = w / 2;
        const cy = h / 2;
        ctx.fillStyle = '#5a161c';
        ctx.fillRect(0, 0, w, h);

        // Radial decorative rings
        const bands = [
          { r: 245, color: '#cfa14e', width: 12 },
          { r: 228, color: '#3b0d12', width: 18 },
          { r: 210, color: '#b58438', width: 5 },
          { r: 155, color: '#781d25', width: 32 },
          { r: 128, color: '#cfa14e', width: 6 },
          { r: 112, color: '#3b0d12', width: 14 }
        ];
        bands.forEach(function (b) {
          ctx.strokeStyle = b.color;
          ctx.lineWidth = b.width;
          ctx.beginPath();
          ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Woven gold filigree medallions around carpet ring
        ctx.strokeStyle = 'rgba(222, 180, 94, 0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 24; i++) {
          const a = (i * Math.PI * 2) / 24;
          const rx = cx + Math.cos(a) * 182;
          const ry = cy + Math.sin(a) * 182;
          ctx.save();
          ctx.translate(rx, ry);
          ctx.rotate(a);
          ctx.beginPath();
          ctx.moveTo(0, -14);
          ctx.lineTo(10, 0);
          ctx.lineTo(0, 14);
          ctx.lineTo(-10, 0);
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        }

        // Textile weave grain
        for (let i = 0; i < 6500; i++) {
          ctx.fillStyle = rng() > 0.5 ? 'rgba(255,215,170,0.035)' : 'rgba(0,0,0,0.07)';
          ctx.fillRect(rng() * w, rng() * h, 2, 2);
        }
      });

      const bump = makeCanvasTexture(256, 256, function (ctx, w, h) {
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 3) {
          for (let x = 0; x < w; x += 3) {
            ctx.fillStyle = (x + y) % 6 === 0 ? '#9c9c9c' : '#646464';
            ctx.fillRect(x, y, 2, 2);
          }
        }
      }, { linear: true, repeat: [4, 4] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Gothic Stained-Glass Eclipse Window ----------
  function getStainedGlass() {
    return cached('stainedGlass', function () {
      const map = makeCanvasTexture(512, 1024, function (ctx, w, h) {
        // Deep luminous nocturnal indigo gradient
        const bg = ctx.createLinearGradient(0, 0, 0, h);
        bg.addColorStop(0, '#102458');
        bg.addColorStop(0.35, '#172e6e');
        bg.addColorStop(0.7, '#1a2356');
        bg.addColorStop(1, '#0e1434');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Diamond leaded-glass mosaic panes
        const step = 48;
        const palette = ['#1b3478', '#203f8c', '#152862', '#263472', '#1d3b80'];
        let idx = 0;
        for (let y = 0; y < h + step; y += step) {
          for (let x = 0; x < w + step; x += step) {
            ctx.fillStyle = palette[(idx++) % palette.length];
            ctx.beginPath();
            ctx.moveTo(x, y - step * 0.5);
            ctx.lineTo(x + step * 0.5, y);
            ctx.lineTo(x, y + step * 0.5);
            ctx.lineTo(x - step * 0.5, y);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#08090e';
            ctx.lineWidth = 4;
            ctx.stroke();
          }
        }

        // Crimson & amber side border panels
        for (let side = 0; side < 2; side++) {
          const bx = side === 0 ? 18 : w - 58;
          for (let y = 140; y < h - 40; y += 64) {
            ctx.fillStyle = (y / 64) % 2 === 0 ? '#8c2238' : '#c68a28';
            ctx.fillRect(bx, y, 40, 56);
            ctx.strokeStyle = '#07080c';
            ctx.lineWidth = 5;
            ctx.strokeRect(bx, y, 40, 56);
          }
        }

        // Central Grand Solar Eclipse Rose Medallion
        const ex = w / 2;
        const ey = 320;

        // Golden corona aura
        const corona = ctx.createRadialGradient(ex, ey, 58, ex, ey, 195);
        corona.addColorStop(0, 'rgba(255, 224, 128, 0.98)');
        corona.addColorStop(0.32, 'rgba(240, 172, 54, 0.85)');
        corona.addColorStop(0.65, 'rgba(130, 82, 165, 0.45)');
        corona.addColorStop(1, 'rgba(16, 30, 80, 0)');
        ctx.fillStyle = corona;
        ctx.beginPath();
        ctx.arc(ex, ey, 195, 0, Math.PI * 2);
        ctx.fill();

        // 16 Leaded Golden Corona Rays
        for (let i = 0; i < 16; i++) {
          const a = (i * Math.PI) / 8;
          const rOut = i % 2 === 0 ? 175 : 138;
          ctx.beginPath();
          ctx.moveTo(ex + Math.cos(a - 0.1) * 72, ey + Math.sin(a - 0.1) * 72);
          ctx.lineTo(ex + Math.cos(a) * rOut, ey + Math.sin(a) * rOut);
          ctx.lineTo(ex + Math.cos(a + 0.1) * 72, ey + Math.sin(a + 0.1) * 72);
          ctx.closePath();
          ctx.fillStyle = i % 2 === 0 ? '#f6cb64' : '#d68f34';
          ctx.fill();
          ctx.strokeStyle = '#090a0e';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        // Eclipsed Obsidian Lunar Disk with blazing diamond-ring rim
        ctx.beginPath();
        ctx.arc(ex, ey, 68, 0, Math.PI * 2);
        ctx.fillStyle = '#0d0d18';
        ctx.fill();
        ctx.strokeStyle = '#ffea9c';
        ctx.lineWidth = 8;
        ctx.stroke();

        // Diamond-ring flare on upper-right rim
        const flare = ctx.createRadialGradient(ex + 46, ey - 48, 2, ex + 46, ey - 48, 36);
        flare.addColorStop(0, '#ffffff');
        flare.addColorStop(0.4, '#ffe082');
        flare.addColorStop(1, 'rgba(255,220,120,0)');
        ctx.fillStyle = flare;
        ctx.beginPath();
        ctx.arc(ex + 46, ey - 48, 36, 0, Math.PI * 2);
        ctx.fill();

        // Lower Gothic lancet tracery & crescent moon emblem
        const ly = 720;
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(ex, ey, 182, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(ex, ey + 182);
        ctx.lineTo(ex, h);
        ctx.stroke();

        // Silver-blue crescent moon medallion in lower pane
        ctx.beginPath();
        ctx.arc(ex, ly, 62, 0, Math.PI * 2);
        ctx.fillStyle = '#22479c';
        ctx.fill();
        ctx.strokeStyle = '#07080c';
        ctx.lineWidth = 6;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(ex - 6, ly, 34, 0, Math.PI * 2);
        ctx.fillStyle = '#a8d8ff';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + 10, ly - 4, 28, 0, Math.PI * 2);
        ctx.fillStyle = '#22479c';
        ctx.fill();
      });
      return { map: map };
    });
  }

  // ---------- Fireplace Hearth Bricks ----------
  function getHearthBricks() {
    return cached('hearthBricks', function () {
      const map = makeCanvasTexture(512, 512, function (ctx, w, h) {
        const rng = makeRng(7711);
        ctx.fillStyle = '#181414';
        ctx.fillRect(0, 0, w, h);

        const rows = 10;
        const cols = 4;
        const bh = h / rows;
        const bw = w / cols;

        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (bw * 0.5);
          for (let c = -1; c <= cols; c++) {
            const x = c * bw + offset;
            const y = r * bh;
            const shade = 26 + Math.floor(rng() * 24);
            const warm = 12 + Math.floor(rng() * 18);
            ctx.fillStyle = 'rgb(' + (shade + warm) + ',' + shade + ',' + Math.max(12, shade - 6) + ')';
            ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);

            // Soot darkening toward top/center
            ctx.fillStyle = 'rgba(0,0,0,' + (0.12 + rng() * 0.25) + ')';
            ctx.fillRect(x + 3, y + 3, bw - 6, bh - 6);
          }
        }
      }, { repeat: [1, 1] });

      const bump = makeCanvasTexture(512, 512, function (ctx, w, h) {
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(0, 0, w, h);
        const rows = 10;
        const cols = 4;
        const bh = h / rows;
        const bw = w / cols;
        ctx.fillStyle = '#b4b4b4';
        for (let r = 0; r < rows; r++) {
          const offset = (r % 2) * (bw * 0.5);
          for (let c = -1; c <= cols; c++) {
            ctx.fillRect(c * bw + offset + 4, r * bh + 4, bw - 8, bh - 8);
          }
        }
      }, { linear: true, repeat: [1, 1] });

      return { map: map, bumpMap: bump };
    });
  }

  // ---------- Soft Radial Glow / Dust Sprite ----------
  function getSoftParticle() {
    return cached('softParticle', function () {
      return makeCanvasTexture(64, 64, function (ctx, w, h) {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255, 248, 225, 1)');
        g.addColorStop(0.35, 'rgba(245, 215, 145, 0.55)');
        g.addColorStop(1, 'rgba(245, 215, 145, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    });
  }

  // ---------- Volumetric Moonlight Cone Gradient ----------
  function getMoonBeamGradient() {
    return cached('moonBeamGradient', function () {
      return makeCanvasTexture(64, 256, function (ctx, w, h) {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(180, 212, 255, 0.92)');
        g.addColorStop(0.35, 'rgba(155, 195, 255, 0.45)');
        g.addColorStop(0.85, 'rgba(130, 170, 240, 0.10)');
        g.addColorStop(1, 'rgba(120, 160, 235, 0.0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      });
    });
  }

  // ---------- Celestial Dome Sky with Subtle Starfield (7 Hero Stars are 3D + Emissive) ----------
  function getDomeSky() {
    return cached('domeSky', function () {
      return makeCanvasTexture(1024, 1024, function (ctx, w, h) {
        const rng = makeRng(1894);
        const cx = w / 2;
        const cy = h / 2;

        // Deep indigo midnight vault
        const bg = ctx.createRadialGradient(cx, cy, 40, cx, cy, w * 0.52);
        bg.addColorStop(0, '#101b42');
        bg.addColorStop(0.55, '#0b1230');
        bg.addColorStop(1, '#060918');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Subtle engraved celestial coordinate circles
        ctx.strokeStyle = 'rgba(140, 175, 230, 0.14)';
        ctx.lineWidth = 1.5;
        [140, 260, 380, 470].forEach(function (r) {
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.stroke();
        });
        for (let i = 0; i < 12; i++) {
          const a = (i * Math.PI) / 6;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * 90, cy + Math.sin(a) * 90);
          ctx.lineTo(cx + Math.cos(a) * 490, cy + Math.sin(a) * 490);
          ctx.stroke();
        }

        // Faint cool-silver background dust stars (kept very dim & tiny so they NEVER confuse the 7 golden stars!)
        for (let i = 0; i < 240; i++) {
          const r = Math.sqrt(rng()) * 485;
          const a = rng() * Math.PI * 2;
          const x = cx + Math.cos(a) * r;
          const y = cy + Math.sin(a) * r;
          const sz = 0.8 + rng() * 1.3;
          ctx.fillStyle = 'rgba(170, 200, 245, ' + (0.14 + rng() * 0.24) + ')';
          ctx.beginPath();
          ctx.arc(x, y, sz, 0, Math.PI * 2);
          ctx.fill();
        }

        // Subtle golden Corona Borealis arc line guiding the eye across the 7 hero stars
        ctx.strokeStyle = 'rgba(240, 198, 102, 0.32)';
        ctx.lineWidth = 3;
        ctx.setLineDash([8, 8]);
        ctx.beginPath();
        ctx.arc(cx, cy + 45, 255, Math.PI * 1.12, Math.PI * 1.88);
        ctx.stroke();
        ctx.setLineDash([]);
      });
    });
  }

  SR.Textures = {
    makeCanvasTexture: makeCanvasTexture,
    mahogany: function () { return makeWoodPair('mahogany', '#4d2215', '#240d07', '#7a3c24', 1011); },
    walnut: function () { return makeWoodPair('walnut', '#351f15', '#190d08', '#563524', 2022); },
    darkWood: function () { return makeWoodPair('darkWood', '#24140e', '#100805', '#3e2318', 3033); },
    damask: getDamask,
    slateFloor: getSlateFloor,
    slate: getSlate,
    brass: getBrass,
    iron: getIron,
    leather: getLeather,
    parchment: getParchment,
    marble: getMarble,
    carpet: getCarpet,
    stainedGlass: getStainedGlass,
    hearthBricks: getHearthBricks,
    softParticle: getSoftParticle,
    moonBeamGradient: getMoonBeamGradient,
    domeSky: getDomeSky
  };
})(window.SR = window.SR || {});
