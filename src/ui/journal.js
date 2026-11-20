/* ==========================================================================
   src/ui/journal.js — Illustrated Spanish Horologist's Notebook Modal
   ========================================================================== */
(function (SR) {
  'use strict';

  function buildMirrorClockSVG() {
    // Crisp horological diagram showing the Mercury Mirror reflection across the 12-6 axis
    return (
      '<svg class="journal-diagram" viewBox="0 0 460 190" width="460" height="190" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Diagrama del Espejo Horológico">' +
      '  <rect x="0" y="0" width="460" height="190" rx="6" fill="#ebe0c3" />' +
      '  <rect x="6" y="6" width="448" height="178" rx="4" fill="none" stroke="#8a6230" stroke-width="1" stroke-dasharray="4 3" />' +
      '  <!-- Left: Mirrored Dial (as seen on desk) -->' +
      '  <text x="115" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#4a2e14">EN EL ESPEJO DE MERCURIO</text>' +
      '  <circle cx="115" cy="102" r="64" fill="#d8dfe4" stroke="#6d5024" stroke-width="3" />' +
      '  <circle cx="115" cy="102" r="57" fill="none" stroke="#8f7344" stroke-width="1" />' +
      '  <!-- Vertical reflection axis 12-6 -->' +
      '  <line x1="115" y1="34" x2="115" y2="170" stroke="#9e3d2b" stroke-width="1" stroke-dasharray="3 3" opacity="0.7" />' +
      '  <!-- Mirrored numerals -->' +
      '  <text x="115" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">XII</text>' +
      '  <text x="115" y="156" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">VI</text>' +
      '  <text x="69" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">III</text>' +
      '  <text x="161" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">IX</text>' +
      '  <text x="152" y="132" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="bold" fill="#7a2c1c">VIII</text>' +
      '  <!-- Mirrored minute hand pointing LEFT to III -->' +
      '  <line x1="115" y1="102" x2="72" y2="102" stroke="#1f1712" stroke-width="2.6" stroke-linecap="round" />' +
      '  <!-- Mirrored hour hand pointing LOWER-RIGHT past VIII (22.5 deg below right) -->' +
      '  <line x1="115" y1="102" x2="146" y2="115" stroke="#1f1712" stroke-width="3.8" stroke-linecap="round" />' +
      '  <circle cx="115" cy="102" r="4" fill="#8a6230" />' +
      '  <!-- Center Arrow -->' +
      '  <text x="230" y="92" text-anchor="middle" font-family="Georgia,serif" font-size="10" fill="#6b4a1e">Eje XII–VI</text>' +
      '  <line x1="196" y1="102" x2="262" y2="102" stroke="#8a6230" stroke-width="2" />' +
      '  <polygon points="264,102 256,97 256,107" fill="#8a6230" />' +
      '  <text x="230" y="120" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-style="italic" fill="#6b4a1e">Invertir</text>' +
      '  <!-- Right: True Clock Dial (8:15) -->' +
      '  <text x="345" y="24" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#4a2e14">HORA REAL (8:15)</text>' +
      '  <circle cx="345" cy="102" r="64" fill="#f7efda" stroke="#6d5024" stroke-width="3" />' +
      '  <circle cx="345" cy="102" r="57" fill="none" stroke="#8f7344" stroke-width="1" />' +
      '  <text x="345" y="56" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">XII</text>' +
      '  <text x="345" y="156" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">VI</text>' +
      '  <text x="391" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">III</text>' +
      '  <text x="299" y="106" text-anchor="middle" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#231a12">IX</text>' +
      '  <text x="308" y="132" text-anchor="middle" font-family="Georgia,serif" font-size="10" font-weight="bold" fill="#7a2c1c">VIII</text>' +
      '  <!-- True minute hand pointing RIGHT to III -->' +
      '  <line x1="345" y1="102" x2="388" y2="102" stroke="#1f1712" stroke-width="2.6" stroke-linecap="round" />' +
      '  <!-- True hour hand pointing LOWER-LEFT past VIII -->' +
      '  <line x1="345" y1="102" x2="314" y2="115" stroke="#1f1712" stroke-width="3.8" stroke-linecap="round" />' +
      '  <circle cx="345" cy="102" r="4" fill="#8a6230" />' +
      '</svg>'
    );
  }

  function buildChimeStaffSVG() {
    // 5-bar musical staff & brass resonator chime diagram for III - I - V - II - IV
    // Note y positions (bottom=I: 130, II: 112, III: 94, IV: 76, V: 58)
    const seq = [
      { step: '1°', roman: 'III', x: 96,  y: 94 },
      { step: '2°', roman: 'I',   x: 168, y: 130 },
      { step: '3°', roman: 'V',   x: 240, y: 58 },
      { step: '4°', roman: 'II',  x: 312, y: 112 },
      { step: '5°', roman: 'IV',  x: 384, y: 76 }
    ];

    let staffLines = '';
    const lineLabels = ['V', 'IV', 'III', 'II', 'I'];
    for (let i = 0; i < 5; i++) {
      const y = 58 + i * 18;
      staffLines +=
        '<line x1="54" y1="' + y + '" x2="424" y2="' + y + '" stroke="#7d5a2b" stroke-width="1.2" opacity="0.7" />' +
        '<text x="38" y="' + (y + 4) + '" text-anchor="end" font-family="Georgia,serif" font-size="11" font-weight="bold" fill="#5b3a17">' + lineLabels[i] + '</text>';
    }

    let polyPoints = seq.map(function (n) { return n.x + ',' + n.y; }).join(' ');
    let notesSvg = '<polyline points="' + polyPoints + '" fill="none" stroke="#9b6a24" stroke-width="2" stroke-dasharray="5 3" opacity="0.85" />';

    seq.forEach(function (n) {
      notesSvg +=
        '<circle cx="' + n.x + '" cy="' + n.y + '" r="11" fill="#3a2310" stroke="#c9963b" stroke-width="2" />' +
        '<text x="' + n.x + '" y="' + (n.y + 4) + '" text-anchor="middle" font-family="Georgia,serif" font-size="10.5" font-weight="bold" fill="#f7e3b2">' + n.roman + '</text>' +
        '<text x="' + n.x + '" y="160" text-anchor="middle" font-family="Georgia,serif" font-size="11" fill="#4f3316">' + n.step + '</text>';
    });

    return (
      '<svg class="journal-diagram" viewBox="0 0 460 178" width="460" height="178" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Pentagrama musical III - I - V - II - IV">' +
      '  <rect x="0" y="0" width="460" height="178" rx="6" fill="#ebe0c3" />' +
      '  <rect x="6" y="6" width="448" height="166" rx="4" fill="none" stroke="#8a6230" stroke-width="1" />' +
      '  <text x="230" y="28" text-anchor="middle" font-family="Georgia,serif" font-size="12" font-weight="bold" letter-spacing="1.5" fill="#4a2c11">PARTITURA DE RESONANCIA — III · I · V · II · IV</text>' +
      staffLines +
      notesSvg +
      '</svg>'
    );
  }

  function buildUVCompassSVG() {
    // 8-sector clockwise zodiac compass diagram matching orrery.js (with \uFE0E monochrome text selectors!)
    const sectors = [
      { sym: '♈\uFE0E', dir: 'N',  deg: -90 },
      { sym: '♊\uFE0E', dir: 'NE', deg: -45 },
      { sym: '♋\uFE0E', dir: 'E',  deg: 0 },
      { sym: '♍\uFE0E', dir: 'SE', deg: 45 },
      { sym: '♎\uFE0E', dir: 'S',  deg: 90 },
      { sym: '♐\uFE0E', dir: 'SO', deg: 135 },
      { sym: '♑\uFE0E', dir: 'O',  deg: 180 },
      { sym: '♒\uFE0E', dir: 'NO', deg: 225 }
    ];
    let spokes = '';
    sectors.forEach(function (s) {
      const rad = (s.deg * Math.PI) / 180;
      const x1 = 100 + Math.cos(rad) * 18;
      const y1 = 84 + Math.sin(rad) * 18;
      const x2 = 100 + Math.cos(rad) * 50;
      const y2 = 84 + Math.sin(rad) * 50;
      const lx = 100 + Math.cos(rad) * 67;
      const ly = 84 + Math.sin(rad) * 67;
      spokes +=
        '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" stroke="#52a9e0" stroke-width="1" opacity="0.45" />' +
        '<text x="' + lx.toFixed(1) + '" y="' + (ly + 4).toFixed(1) + '" text-anchor="middle" font-family="Segoe UI Symbol, Cambria Math, Georgia, serif" font-size="11" fill="#8ce4ff">' + s.sym + ' ' + s.dir + '</text>';
    });

    return (
      '<svg class="journal-diagram" style="margin:0; flex-shrink:0; border-color: rgba(103,216,255,0.45); background:#0d0b1e;" viewBox="0 0 200 172" width="192" height="165" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Rosa zodiacal de 8 sectores del Planetario">' +
      '  <circle cx="100" cy="84" r="50" fill="none" stroke="#67d8ff" stroke-width="1.4" opacity="0.65" />' +
      '  <circle cx="100" cy="84" r="18" fill="none" stroke="#956bff" stroke-width="1.2" opacity="0.8" />' +
      '  <circle cx="100" cy="84" r="4.5" fill="#ffd97d" />' +
      spokes +
      '  <text x="100" y="165" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="#89c8e8">Sentido horario (+45° / sector)</text>' +
      '</svg>'
    );
  }

  const ENTRIES = {
    intro: {
      id: 'intro',
      tabTitle: 'Carta de Bienvenida',
      heading: 'Observatorio de Solís — Situación',
      render: function (d) {
        const sPlaced = d.relicsPlaced && d.relicsPlaced.solar_gear;
        const lPlaced = d.relicsPlaced && d.relicsPlaced.lunar_lens;
        const uPlaced = d.relicsPlaced && d.relicsPlaced.umbral_prism;
        return (
          '<p>Te encuentras atrapado en el gabinete privado del maestro horólogo y astrónomo <strong>Valerio de Solís</strong>, desaparecido la noche del Gran Eclipse de 1894.</p>' +
          '<p>La monumental <strong>Puerta del Eclipse</strong> al Norte ha sellado sus seis cerrojos de hierro. Ninguna fuerza ordinaria puede abrirla: su mecanismo sólo responde cuando se restituyen las <strong>tres Reliquias Celestiales</strong> y se alinean sus anillos concéntricos en el cenit.</p>' +
          '<div class="clue-quote">' +
          '  <strong>Reliquias requeridas en la Puerta del Eclipse:</strong><br/>' +
          '  ☀ <strong>Engranaje Solar</strong> (zócalo izquierdo) — ' + (sPlaced ? '<em>Colocada ✓</em>' : '<em>Pendiente</em>') + '<br/>' +
          '  ☽ <strong>Lente Lunar</strong> (zócalo derecho) — ' + (lPlaced ? '<em>Colocada ✓</em>' : '<em>Pendiente</em>') + '<br/>' +
          '  ◈ <strong>Prisma Umbral</strong> (núcleo central) — ' + (uPlaced ? '<em>Colocada ✓</em>' : '<em>Pendiente</em>') +
          '</div>' +
          '<p>Explora cada estación del observatorio, examina tus objetos de cerca en el <strong>Inspector 3D</strong> y anota cualquier patrón numérico, astronómico o musical que descubras.</p>'
        );
      }
    },

    diary_books: {
      id: 'diary_books',
      tabTitle: 'Diario: Las Sombras',
      heading: 'Diario de Valerio — La Secuencia de Sombras',
      render: function () {
        return (
          '<p>Anotación hallada en el volumen abierto sobre el Escritorio del Maestro, escrita con tinta ferrogálica:</p>' +
          '<div class="clue-quote">' +
          '  «El gabinete sólo cede ante la Secuencia de Sombras en mis tomos dorados: primero el mensajero más próximo al fuego central; luego el guerrero herrumbroso escoltado por dos satélites; después el soberano rodeado por un halo de bronce; y al final el viajero pálido que guarda la órbita más lejana.»' +
          '</div>' +
          '<p><em>Nota al margen:</em> Los lomos de la estantería junto al reloj únicamente llevan grabados sus glifos planetarios. Conviene contrastarlos con la Placa de Observaciones de latón.</p>'
        );
      }
    },

    diary_mirror: {
      id: 'diary_mirror',
      tabTitle: 'Diario: La Totalidad',
      heading: 'Diario de Valerio — La Hora de la Totalidad',
      render: function () {
        return (
          '<p>Segunda página manuscrita del Diario de Maestro Valerio, dedicada a su gran reloj astronómico de péndulo:</p>' +
          '<div class="clue-quote">' +
          '  «Mi reloj astronómico sólo abrirá su frontón cuando el péndulo oscile con su contrapeso y cuerda, marcando la fase de Luna Nueva (Eclipse Total) y la hora grabada en el Espejo de Mercurio del escritorio. Recuerda: el espejo invierte la esfera.»' +
          '</div>' +
          '<p>Para despertar el reloj será imprescindible:</p>' +
          '<ul style="margin: 0 0 12px; padding-left: 20px; line-height: 1.65;">' +
          '  <li>Colgar el <strong>contrapeso de bronce</strong> dentro de la caja del péndulo.</li>' +
          '  <li>Dar <strong>cuerda</strong> al mecanismo con su llave horológica.</li>' +
          '  <li>Fijar el disco superior en <strong>Luna Nueva (Eclipse Total)</strong>.</li>' +
          '  <li>Colocar las manecillas en la <strong>hora real reflejada</strong> en el Espejo de Mercurio.</li>' +
          '</ul>'
        );
      }
    },

    star_plate: {
      id: 'star_plate',
      tabTitle: 'Placa Astronómica',
      heading: 'Placa de Observaciones (1894)',
      render: function () {
        return (
          '<p>Transcripción de la placa grabada en latón sobre la estantería de grimorios:</p>' +
          '<div class="clue-quote" style="font-style: normal;">' +
          '  <div style="line-height: 1.8;">' +
          '    <strong>☿ Mercurio</strong> — Órbita I · Mensajero más próximo al fuego central (Sol).<br/>' +
          '    <strong>♀ Venus</strong> — Órbita II · Astro brillante cubierto de velo dorado.<br/>' +
          '    <strong>♂ Marte</strong> — Órbita III · Guerrero herrumbroso escoltado por <strong>2 satélites</strong>.<br/>' +
          '    <strong>♄ Saturno</strong> — Órbita IV · Soberano coronado por un gran <strong>anillo</strong> de bronce.<br/>' +
          '    <strong>♆ Neptuno</strong> — Órbita V · Viajero pálido de la <strong>órbita más lejana</strong>.' +
          '  </div>' +
          '</div>' +
          '<p>Cada glifo corresponde a uno de los cinco tomos encuadernados en piel y oro de la estantería principal.</p>'
        );
      }
    },

    mirror_plate: {
      id: 'mirror_plate',
      tabTitle: 'Espejo Horológico',
      heading: 'Espejo Horológico del Escritorio',
      render: function () {
        return (
          '<p>Sobre el escritorio reposa una placa de mercurio plateado con la esfera de un reloj grabada al revés (<em>«REFLEJO EN ESPEJO DE MERCURIO»</em>).</p>' +
          buildMirrorClockSVG() +
          '<p>Los números romanos aparecen invertidos horizontalmente respecto al eje vertical <strong>XII–VI</strong>: el <strong>III</strong> aparece a la izquierda y el <strong>VIII</strong> en la zona inferior derecha.</p>' +
          '<div class="clue-quote">' +
          '  Al reflejar las agujas sobre el eje vertical XII–VI: el minutero (que apunta a la izquierda hacia el III reflejado) pasa a la derecha (<strong>:15</strong>), y la aguja horaria (pasado el VIII reflejado a la derecha) pasa a la izquierda (<strong>8</strong>).<br/>' +
          '  <strong>Hora real de la Totalidad: 8:15</strong>' +
          '</div>'
        );
      }
    },

    telescope_chime: {
      id: 'telescope_chime',
      tabTitle: 'Inscripción del Catalejo',
      heading: 'Inscripción Musical del Catalejo',
      render: function () {
        return (
          '<p>Al desenroscar el ocular trasero del <strong>Catalejo de Latón</strong> hallaste oculto un <strong>Filtro de Cobalto</strong> azul y, grabado con buril sobre la banda interior del tubo, una melodía de cinco notas:</p>' +
          '<div class="clue-quote" style="text-align: center; font-style: normal; font-size: 20px; letter-spacing: 0.14em; font-weight: bold; color: #3d2410;">' +
          '  III &nbsp;—&nbsp; I &nbsp;—&nbsp; V &nbsp;—&nbsp; II &nbsp;—&nbsp; IV' +
          '</div>' +
          buildChimeStaffSVG() +
          '<p>Esta secuencia parece corresponder exactamente a las cinco teclas numeradas en romanos de la <strong>Caja de Resonancia</strong> sobre el escritorio.</p>'
        );
      }
    },

    cipher_note: {
      id: 'cipher_note',
      tabTitle: 'Nota Cifrada',
      heading: 'Nota Cifrada del Cajón Secreto',
      render: function () {
        return (
          '<p>Pergamino lacrado hallado dentro del cajón secreto del Escritorio junto al Disco Móvil de Latón:</p>' +
          '<div class="clue-quote">' +
          '  «Calibración del Disco Cifrador: alinea el Cometa (★) con el número de estrellas doradas que brillan en la Cúpula Celestial del observatorio.»' +
          '</div>' +
          '<div class="clue-quote" style="text-align: center; font-style: normal;">' +
          '  <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.1em; color: #6e4a1f; margin-bottom: 6px;">Combinación de la Caja Fuerte</div>' +
          '  <div style="font-size: 24px; letter-spacing: 0.18em; font-weight: bold; color: #2b180a;">☉ &nbsp;—&nbsp; ♂ &nbsp;—&nbsp; ♄ &nbsp;—&nbsp; ☽</div>' +
          '  <div style="font-size: 12px; color: #5b3f20; margin-top: 6px;">Sol &nbsp;·&nbsp; Marte &nbsp;·&nbsp; Saturno &nbsp;·&nbsp; Luna</div>' +
          '</div>' +
          '<p>Alza la vista hacia la <strong>Cúpula Celestial</strong> para contar cuántas estrellas doradas destacan en la bóveda nocturna y calibra el Disco Cifrador del Gabinete de Telemetría.</p>'
        );
      }
    },

    uv_discovery: {
      id: 'uv_discovery',
      tabTitle: 'Luz de Cobalto (UV)',
      heading: 'Luz de Cobalto — Espectro Ultravioleta',
      render: function () {
        return (
          '<p>Al acoplar el <strong>Filtro de Cobalto</strong> en la linterna de la Mesa de Óptica, su haz violeta desvela tintas fosforescentes invisibles bajo la iluminación cálida del gabinete.</p>' +
          '<div class="uv-callout">' +
          '  <strong>✦ Modo Ultravioleta disponible</strong><br/>' +
          '  Puedes encender o apagar la Luz UV en cualquier momento con el botón <strong>✦ Luz UV</strong> de la barra superior. Examina con especial atención la gran <strong>Carta Estelar</strong> colgada tras la Mesa de Óptica.' +
          '</div>' +
          '<p>Maestro Valerio ocultó sus diagramas más sensibles con tinta de fósforo azulado para proteger el secreto del Gran Planetario.</p>'
        );
      }
    },

    uv_starmap: {
      id: 'uv_starmap',
      tabTitle: 'Carta Estelar (UV)',
      heading: 'Tinta Ultravioleta — Carta Estelar',
      render: function () {
        return (
          '<p>Inscripciones luminosas reveladas sobre la Carta Estelar bajo el resplandor de la Luz de Cobalto:</p>' +
          '<div class="uv-callout" style="font-family: \'Segoe UI Symbol\', Georgia, serif;">' +
          '  <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap;">' +
          '    <div style="flex: 1; min-width: 220px;">' +
          '      <div style="font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #67d8ff; margin-bottom: 8px; font-weight: bold;">✦ Alineación del Planetario ✦</div>' +
          '      <div style="line-height: 1.9; font-size: 14.5px;">' +
          '        <strong>☿\uFE0E Mercurio</strong> → <strong>♈\uFE0E (Norte)</strong><br/>' +
          '        <strong>♀\uFE0E Venus</strong> → <strong>+90° horario desde ☿\uFE0E</strong><br/>' +
          '        <strong>♂\uFE0E Marte</strong> → <strong>opuesto a ♀\uFE0E (180°)</strong><br/>' +
          '        <strong>♄\uFE0E Saturno</strong> → <strong>−45° antihorario desde ♂\uFE0E</strong>' +
          '      </div>' +
          '    </div>' +
          buildUVCompassSVG() +
          '  </div>' +
          '  <hr style="border: 0; border-top: 1px solid rgba(103,216,255,0.3); margin: 12px 0;" />' +
          '  <div style="font-size: 12.5px; letter-spacing: 0.1em; text-transform: uppercase; color: #67d8ff; margin-bottom: 6px; font-weight: bold;">✦ Guía de Receptores de Óptica ✦</div>' +
          '  <div style="line-height: 1.65; font-size: 14px;">' +
          '    <span style="color:#ffd870;">● Haz de Oro</span> → <strong>Receptor Ámbar</strong> &nbsp;|&nbsp; ' +
          '    <span style="color:#ff6b7a;">● Filtro Rubí</span> → <strong>Rojo</strong> &nbsp;|&nbsp; ' +
          '    <span style="color:#69c2ff;">● Filtro Zafiro</span> → <strong>Azul</strong>' +
          '  </div>' +
          '</div>'
        );
      }
    }
  };

  const ENTRY_ORDER = [
    'intro',
    'diary_books',
    'diary_mirror',
    'star_plate',
    'mirror_plate',
    'telescope_chime',
    'cipher_note',
    'uv_discovery',
    'uv_starmap'
  ];

  let initialized = false;
  let isOpenFlag = false;
  let activeTabId = 'intro';

  let elModal = null;
  let elTabs = null;
  let elContent = null;
  let elBtnClose = null;

  function getUnlockedList() {
    const unlocked = (SR.State && SR.State.data && SR.State.data.journalUnlocked) || ['intro'];
    const ordered = [];
    for (let i = 0; i < ENTRY_ORDER.length; i++) {
      const id = ENTRY_ORDER[i];
      if (unlocked.includes(id) && ENTRIES[id]) {
        ordered.push(id);
      }
    }
    // Include any extra dynamic unlocked IDs if present
    for (let j = 0; j < unlocked.length; j++) {
      const id = unlocked[j];
      if (!ordered.includes(id) && ENTRIES[id]) {
        ordered.push(id);
      }
    }
    return ordered.length ? ordered : ['intro'];
  }

  function renderTabs(unlockedList) {
    if (!elTabs) return;
    elTabs.innerHTML = '';
    for (let i = 0; i < unlockedList.length; i++) {
      const id = unlockedList[i];
      const entry = ENTRIES[id];
      if (!entry) continue;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'journal-tab-btn' + (id === activeTabId ? ' active' : '');
      btn.dataset.entryId = id;
      btn.textContent = entry.tabTitle;
      btn.addEventListener('click', function () {
        if (SR.Audio) SR.Audio.playClick(1.05);
        activeTabId = id;
        renderTabs(getUnlockedList());
        renderContent(id);
      });
      elTabs.appendChild(btn);
    }
  }

  function renderContent(entryId) {
    if (!elContent) return;
    const entry = ENTRIES[entryId] || ENTRIES.intro;
    const bodyHtml = typeof entry.render === 'function' ? entry.render(SR.State.data) : '';
    elContent.innerHTML = '<h3>' + entry.heading + '</h3>' + bodyHtml;
    elContent.scrollTop = 0;
  }

  const Journal = {
    init: function () {
      if (initialized) return;
      initialized = true;

      elModal = document.getElementById('journal-modal');
      elTabs = document.getElementById('journal-tabs');
      elContent = document.getElementById('journal-content');
      elBtnClose = document.getElementById('btn-close-journal');

      if (elBtnClose) {
        elBtnClose.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.9);
          Journal.close();
        });
      }

      if (elModal) {
        elModal.addEventListener('click', function (e) {
          if (e.target === elModal) {
            Journal.close();
          }
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpenFlag) {
          Journal.close();
        }
      });

      if (SR.State) {
        SR.State.on('journalUpdated', function () {
          if (isOpenFlag) {
            const list = getUnlockedList();
            if (!list.includes(activeTabId)) {
              activeTabId = list[list.length - 1];
            }
            renderTabs(list);
            renderContent(activeTabId);
          }
        });
        SR.State.on('stateReset', function () {
          activeTabId = 'intro';
        });
      }
    },

    open: function (tabId) {
      if (!initialized) Journal.init();
      if (!elModal) return;

      if (SR.Audio) SR.Audio.playClick(1.05);
      if (SR.State) SR.State.markJournalRead();

      const unlockedList = getUnlockedList();
      if (tabId && unlockedList.includes(tabId) && ENTRIES[tabId]) {
        activeTabId = tabId;
      } else if (!unlockedList.includes(activeTabId)) {
        activeTabId = unlockedList[unlockedList.length - 1];
      } else if (!tabId) {
        // Default to the most recently unlocked entry when user opens Journal from HUD
        activeTabId = unlockedList[unlockedList.length - 1];
      }

      renderTabs(unlockedList);
      renderContent(activeTabId);

      elModal.classList.remove('hidden');
      isOpenFlag = true;
    },

    close: function () {
      if (!elModal) return;
      elModal.classList.add('hidden');
      isOpenFlag = false;
    },

    isOpen: function () {
      return isOpenFlag;
    },

    getEntries: function () {
      return ENTRIES;
    }
  };

  SR.Journal = Journal;
})(window.SR = window.SR || {});
