/* ==========================================================================
   src/ui/hints.js — Context-Aware 3-Tier Progressive Hint Engine
   ========================================================================== */
(function (SR) {
  'use strict';

  const TIER_LABELS = [
    'Nivel 1 • Dónde mirar',
    'Nivel 2 • Relación lógica',
    'Nivel 3 • Solución detallada'
  ];

  let initialized = false;
  let isOpenFlag = false;
  let currentStepId = null;
  let revealedByStep = {};

  // Cached DOM references
  let elModal = null;
  let elBody = null;
  let elCountLabel = null;
  let elBtnReveal = null;
  let elBtnClose = null;

  function solveVaultRingsClicks(rings) {
    const r0 = (((rings && rings[0]) || 0) % 6 + 6) % 6;
    const r1 = (((rings && rings[1]) || 0) % 6 + 6) % 6;
    const r2 = (((rings && rings[2]) || 0) % 6 + 6) % 6;
    let best = null;
    for (let a = 0; a < 6; a++) {
      for (let b = 0; b < 6; b++) {
        for (let c = 0; c < 6; c++) {
          if (
            (r0 + a + 2 * c) % 6 === 0 &&
            (r1 + a + b) % 6 === 0 &&
            (r2 + 2 * b + c) % 6 === 0
          ) {
            const sum = a + b + c;
            if (!best || sum < best.sum) {
              best = { a: a, b: b, c: c, sum: sum };
            }
          }
        }
      }
    }
    return best || { a: 0, b: 0, c: 0, sum: 0 };
  }

  function formatRingClicks(sol) {
    const parts = [];
    if (sol.a > 0) parts.push(sol.a + (sol.a === 1 ? ' vez el Anillo Exterior' : ' veces el Anillo Exterior'));
    if (sol.b > 0) parts.push(sol.b + (sol.b === 1 ? ' vez el Anillo Medio' : ' veces el Anillo Medio'));
    if (sol.c > 0) parts.push(sol.c + (sol.c === 1 ? ' vez el Anillo Interior' : ' veces el Anillo Interior'));
    if (parts.length === 0) {
      return 'Los tres anillos ya están alineados en la posición superior.';
    }
    return 'Desde la posición actual de los anillos, pulsa (en cualquier orden): ' + parts.join(', ') + '. Las tres muescas doradas coincidirán arriba y la bóveda se abrirá.';
  }

  function hasUnplacedRelicInInventory(d) {
    return (
      (SR.State.hasItem('solar_gear') && !d.relicsPlaced.solar_gear) ||
      (SR.State.hasItem('lunar_lens') && !d.relicsPlaced.lunar_lens) ||
      (SR.State.hasItem('umbral_prism') && !d.relicsPlaced.umbral_prism)
    );
  }

  function allRelicsPlaced(d) {
    return !!(d.relicsPlaced.solar_gear && d.relicsPlaced.lunar_lens && d.relicsPlaced.umbral_prism);
  }

  /**
   * Builds all currently applicable, solvable puzzle steps in logical progression order.
   * Each step includes `views` so we can prioritize the puzzle the player is actively looking at.
   */
  function getActiveCandidates(d) {
    const list = [];

    // 1. Bookshelf A1
    if (!d.booksSolved) {
      list.push({
        id: 'books_a1',
        title: 'Estantería de Grimorios',
        views: ['books', 'clockBooks'],
        tiers: [
          'Explora el Escritorio del Maestro (Este) para leer el Diario abierto de Valerio, y revisa la Placa de Observaciones de latón situada sobre la Estantería junto al reloj.',
          'El Diario enumera cuatro planetas mediante pistas astronómicas: el mensajero más cercano al Sol (Mercurio ☿), el guerrero de dos satélites (Marte ♂), el soberano con halo de bronce (Saturno ♄) y el viajero de la órbita más lejana (Neptuno ♆).',
          'En la vista de la Estantería, pulsa los tomos dorados en este orden exacto: ☿ (Mercurio) → ♂ (Marte) → ♄ (Saturno) → ♆ (Neptuno). Se abrirá el compartimento secreto inferior.'
        ]
      });
    } else if (!d.alcoveKeyTaken || !d.alcoveWheelTaken) {
      list.push({
        id: 'books_collect',
        title: 'Nicho Secreto de la Estantería',
        views: ['books', 'clockBooks'],
        tiers: [
          'El compartimento oculto bajo los libros ya se ha abierto en la Estantería.',
          'Acércate a la Estantería (Reloj y Libros) y revisa el hueco abierto debajo de los tomos planetarios.',
          'Haz clic en la Llave de Cuerda y en el Volante de Válvula dentro del nicho secreto para guardarlos en tu inventario.'
        ]
      });
    }

    // 2. Telescope 3D Inspection B1a
    if (!d.telescopeTaken) {
      list.push({
        id: 'telescope_pickup',
        title: 'Catalejo del Escritorio',
        views: ['desk', 'desk_top'],
        tiers: [
          'Revisa con atención los objetos sobre el Escritorio del Maestro (Este); hay un instrumento de latón que puedes recoger.',
          'Recoge el Catalejo de Latón sobre el tapete verde del escritorio. Su descripción menciona que el ocular trasero tiene una rosca suelta.',
          'Haz clic en el Catalejo de Latón sobre el escritorio para recogerlo y luego ábrelo en el Inspector 3D (doble clic o clic derecho en el inventario) para desenroscar su ocular.'
        ]
      });
    } else if (!d.telescopeOpened) {
      list.push({
        id: 'telescope_b1a',
        title: 'Inspección 3D del Catalejo',
        views: ['desk', 'desk_top', 'chime'],
        tiers: [
          'El Catalejo de Latón en tu inventario oculta un secreto en su extremo trasero. Examínalo de cerca en el Inspector 3D.',
          'Haz doble clic o clic derecho sobre el Catalejo en la barra de inventario (o selecciónalo y pulsa "🔍 Inspeccionar 3D"). Arrastra para rotarlo y observa el anillo brillante del ocular.',
          'Dentro del Inspector 3D del Catalejo, haz clic directamente sobre el ocular trasero para desenroscarlo. Obtendrás el Filtro de Cobalto y revelarás la inscripción musical: III — I — V — II — IV.'
        ]
      });
    }

    // 3. Desk Chime Box B1b (solvable once telescope is opened)
    if (d.telescopeOpened && !d.chimeSolved) {
      list.push({
        id: 'chime_b1b',
        title: 'Caja de Resonancia del Escritorio',
        views: ['chime', 'desk', 'desk_top'],
        tiers: [
          'En el Escritorio del Maestro hay una Caja de Resonancia con cinco teclas metálicas numeradas del I al V.',
          'La inscripción grabada en el tubo interior del Catalejo (también registrada en tu Diario) muestra el orden exacto de las cinco notas.',
          'Acércate a la Caja de Resonancia en el Escritorio y pulsa las teclas en esta secuencia exacta: III → I → V → II → IV. El cajón central secreto se abrirá.'
        ]
      });
    } else if (d.chimeSolved && (!d.cipherDiskTaken || !d.journalUnlocked.includes('cipher_note'))) {
      list.push({
        id: 'chime_collect',
        title: 'Cajón Secreto del Escritorio',
        views: ['desk', 'desk_top', 'chime'],
        tiers: [
          'El cajón secreto central del Escritorio del Maestro está abierto.',
          'Examina el interior del cajón central para recoger un disco de latón y leer la nota cifrada de Valerio.',
          'Haz clic en el Disco Móvil de Latón para llevarlo a tu inventario y haz clic en la Nota Cifrada para guardarla en tu Diario.'
        ]
      });
    }

    // 4. Telemetry Valves A2 (solvable once player has valve_wheel or installed it)
    if (!d.valvesSolved && (d.valve4Installed || d.collected.valve_wheel)) {
      list.push({
        id: 'valves_a2',
        title: 'Consola de Presión de Vapor',
        views: ['valves', 'telemetry'],
        tiers: [
          'Dirígete al Gabinete de Telemetría (Oeste) y examina los cuatro manómetros de vapor y las válvulas de la izquierda.',
          'Primero instala el Volante de Válvula en el eje vacío de la cuarta válvula (V4). Los tubos de cobre indican qué columnas sube cada válvula (tubo grueso = +2, tubo fino = +1). El objetivo es llevar los cuatro manómetros exactamente a 4.',
          'Con la presión inicial [1, 0, 1, 1], ajusta las cuatro válvulas a las posiciones [2, 1, 1, 1]: gira V1 dos veces, V2 una vez, V3 una vez y V4 una vez. Las cuatro columnas marcarán 4 y abrirán la compuerta neumática inferior.'
        ]
      });
    } else if (d.valvesSolved && !d.clockWeightTaken) {
      list.push({
        id: 'valves_collect',
        title: 'Compuerta Neumática',
        views: ['valves', 'telemetry'],
        tiers: [
          'La compuerta neumática bajo las válvulas del Gabinete de Telemetría ya está abierta.',
          'Observa el hueco abierto en la parte inferior izquierda de la consola de Telemetría.',
          'Haz clic en la Pesa de Bronce dentro de la compuerta abierta para recoger el contrapeso del reloj.'
        ]
      });
    }

    // 5. Grandfather Clock A3 (solvable once player has weight + key)
    if (
      !d.clockSolved &&
      (d.clockWeightPlaced || d.collected.clock_weight) &&
      (d.clockWound || d.collected.clock_key)
    ) {
      list.push({
        id: 'clock_a3',
        title: 'Reloj Astronómico de Péndulo',
        views: ['clock', 'clockBooks', 'mirror'],
        tiers: [
          'Ya cuentas con la Pesa de Bronce y la Llave de Cuerda para reactivar el Reloj Astronómico (Reloj y Libros). Consulta el Diario y el Espejo Horológico del Escritorio.',
          'Abre la puerta de cristal del reloj para colgar la Pesa de Bronce, da cuerda con la Llave en la esfera, selecciona la fase de Luna Nueva (Eclipse Total) e invierte horizontalmente la hora vista en el Espejo de Mercurio.',
          'En el Reloj: 1) Abre la puerta de cristal y cuelga la Pesa de Bronce; 2) Usa la Llave de Cuerda en la bocallave; 3) Pon la fase lunar en Luna Nueva (Eclipse); 4) Ajusta la hora a las 8:15 (el espejo mostraba su reflejo invertido). Se abrirá el frontón superior.'
        ]
      });
    } else if (d.clockSolved && !d.solarGearTaken) {
      list.push({
        id: 'clock_collect',
        title: 'Frontón del Reloj Astronómico',
        views: ['clock', 'clockBooks'],
        tiers: [
          'Las campanadas han abierto el frontón superior del Reloj Astronómico.',
          'Mira en la parte alta del reloj para recoger la primera Reliquia del Eclipse.',
          'Haz clic en el Engranaje Solar dorado dentro del compartimento superior del reloj.'
        ]
      });
    }

    // 6. Cipher Wheel & Safe B2 (solvable once player has cipher_disk or installed it)
    if (!d.safeSolved && (d.cipherDiskInstalled || d.collected.cipher_disk)) {
      list.push({
        id: 'safe_b2',
        title: 'Disco Cifrador y Caja Fuerte',
        views: ['cipher', 'safe', 'telemetry', 'dome'],
        tiers: [
          'En la mitad derecha del Gabinete de Telemetría (Oeste) esperan el Disco Cifrador y la Caja Fuerte. Revisa la Nota Cifrada y observa la Cúpula Celestial sobre tu cabeza.',
          'Coloca el Disco Móvil de Latón en el eje del Cifrador. Cuenta las estrellas doradas brillantes que destacan en la Cúpula Celestial (son 7) y gira el disco interior hasta alinear el Cometa (★) con el 7. Luego traduce los símbolos ☉ — ♂ — ♄ — ☽.',
          'Al alinear ★ con el 7 (8 pasos desde 0), el disco indica: ☉ = 8, ♂ = 2, ♄ = 4, ☽ = 9. Introduce la combinación 8 - 2 - 4 - 9 en la Caja Fuerte y acciona la palanca de apertura.'
        ]
      });
    } else if (d.safeSolved && (!d.lunarLensTaken || !d.quartzSplitterTaken)) {
      list.push({
        id: 'safe_collect',
        title: 'Interior de la Caja Fuerte',
        views: ['safe', 'telemetry'],
        tiers: [
          'La Caja Fuerte del Gabinete de Telemetría está abierta.',
          'Examina el interior aterciopelado de la Caja Fuerte para recoger las dos piezas guardadas dentro.',
          'Haz clic en la Lente Lunar (segunda Reliquia) y en el Cristal Divisor de cuarzo dentro de la Caja Fuerte.'
        ]
      });
    }

    // 7. UV Lantern C1 (solvable once cobalt_filter obtained)
    if (!d.uvInstalled && d.collected.cobalt_filter) {
      list.push({
        id: 'uv_c1',
        title: 'Linterna de Cobalto (UV)',
        views: ['optics', 'optics_top', 'starmap'],
        tiers: [
          'El Filtro de Cobalto que hallaste dentro del catalejo encaja en una lámpara de laboratorio. Explora la Mesa de Óptica (Sur).',
          'En la esquina izquierda de la Mesa de Óptica hay una Linterna de Cobalto con su aro frontal vacío. Equipa el Filtro de Cobalto y colócalo allí.',
          'Ve a Óptica, selecciona el Filtro de Cobalto en el inventario y haz clic en la Linterna de la izquierda. Al activarse la Luz UV podrás leer las tintas ocultas en la Carta Estelar.'
        ]
      });
    }

    // 8. Optical Bench C2 (solvable once quartz_splitter obtained)
    if (!d.opticsSolved && (d.splitter2Installed || d.collected.quartz_splitter)) {
      list.push({
        id: 'optics_c2',
        title: 'Mesa de Óptica y Prismas',
        views: ['optics', 'optics_top'],
        tiers: [
          'En la Mesa de Óptica (Sur) debes iluminar simultáneamente los tres receptores de cristal con su color exacto: Ámbar (oro), Rubí (rojo) y Zafiro (azul). Necesitarás instalar el Cristal Divisor.',
          'Coloca el Cristal Divisor en el zócalo vacío del centro de la cuadrícula. El primer divisor reparte el rayo hacia arriba (hacia el receptor Ámbar usando tres espejos en "/") y hacia el segundo divisor; éste deja pasar un rayo recto por el filtro Rubí y refleja otro hacia abajo, rodeando hasta el filtro y receptor Zafiro.',
          'Orienta cada pieza giratoria así (columna 0..4 de izquierda a derecha, fila 0..4 de atrás hacia delante): Divisor izquierdo (1,2) en "/", Divisor instalado (2,2) en "\\", Espejos superiores (1,1), (3,1) y (3,0) en "/", Espejos inferiores (2,3) y (0,3) en "/", y Espejo frontal-izquierdo (0,4) en "\\". Se abrirá el cajón frontal.'
        ]
      });
    } else if (d.opticsSolved && !d.orreryCrankTaken) {
      list.push({
        id: 'optics_collect',
        title: 'Cajón de la Mesa de Óptica',
        views: ['optics', 'optics_top'],
        tiers: [
          'Los tres receptores han activado el cajón oculto en el frente de la Mesa de Óptica.',
          'Mira en la parte delantera de la Mesa de Óptica para recoger la llave mecánica del Planetario.',
          'Haz clic en la Manivela Astral dentro del cajón abierto de la Mesa de Óptica.'
        ]
      });
    }

    // 9. UV Star Map Clue reading (important before Orrery)
    if (d.uvInstalled && !d.orrerySolved && !d.journalUnlocked.includes('uv_starmap')) {
      list.push({
        id: 'uv_starmap_clue',
        title: 'Carta Estelar Ultravioleta',
        views: ['starmap', 'optics', 'optics_top', 'orrery', 'orrery_top'],
        tiers: [
          'La Linterna UV revela inscripciones fosforescentes invisibles a simple vista. Activa la Luz UV desde la barra superior y revisa la pared tras la Mesa de Óptica.',
          'Con el botón "✦ Luz UV" encendido, acércate a la Carta Estelar enmarcada detrás de la Mesa de Óptica para ver las coordenadas luminosas.',
          'Haz clic en la Carta Estelar iluminada en modo UV para registrar en tu Diario las posiciones angulares exactas de los cuatro planetas del Gran Planetario.'
        ]
      });
    }

    // 10. Grand Mechanical Orrery C3 (solvable once orrery_crank obtained)
    if (!d.orrerySolved && (d.orreryUnlocked || d.collected.orrery_crank)) {
      list.push({
        id: 'orrery_c3',
        title: 'El Gran Planetario Mecánico',
        views: ['orrery', 'orrery_top'],
        tiers: [
          'Acércate al Gran Planetario en el centro de la sala. Primero debes liberar su embrague frontal con la Manivela Astral y luego alinear los cuatro planetas siguiendo la Carta Estelar UV.',
          'Inserta la Manivela Astral en el embrague del pedestal. En el dial de 8 sectores (45° cada paso en sentido horario): Mercurio (☿) va al Norte ♈; Venus (♀) +90° horario desde ☿ (Este ♋); Marte (♂) opuesto a ♀ (Oeste ♑); y Saturno (♄) −45° antihorario desde ♂ (Suroeste ♐).',
          'Con el Planetario desbloqueado, haz clic en los planetas hasta colocarlos en: Mercurio (☿) → ♈ Norte, Venus (♀) → ♋ Este, Marte (♂) → ♑ Oeste y Saturno (♄) → ♐ Suroeste. El Sol mecánico central se abrirá.'
        ]
      });
    } else if (d.orrerySolved && !d.umbralPrismTaken) {
      list.push({
        id: 'orrery_collect',
        title: 'Núcleo del Gran Planetario',
        views: ['orrery', 'orrery_top'],
        tiers: [
          'Los pétalos dorados del Sol central del Planetario han florecido.',
          'Observa el cristal oscuro que levita en el centro del Gran Planetario.',
          'Haz clic en el Prisma Umbral en el centro del Planetario para recoger la tercera y última Reliquia del Eclipse.'
        ]
      });
    }

    // 11. Place Relics on Eclipse Vault Door
    if (!allRelicsPlaced(d)) {
      const hasAnyToPlace = hasUnplacedRelicInInventory(d);
      const allObtained =
        (d.solarGearTaken || d.relicsPlaced.solar_gear) &&
        (d.lunarLensTaken || d.relicsPlaced.lunar_lens) &&
        (d.umbralPrismTaken || d.relicsPlaced.umbral_prism);

      if (allObtained || hasAnyToPlace) {
        list.push({
          id: 'vault_relics',
          title: 'Reliquias de la Puerta del Eclipse',
          views: ['door'],
          priorityOnlyWhenAllOrViewing: !allObtained,
          tiers: [
            'Acércate a la Puerta del Eclipse (Norte). Los tres zócalos grabados sobre el blindaje aguardan las reliquias celestiales.',
            'Equipa cada reliquia desde tu inventario y haz clic en su hueco correspondiente: Engranaje Solar a la izquierda, Lente Lunar a la derecha y Prisma Umbral en el centro.',
            'En la vista de la Puerta del Eclipse, coloca las tres reliquias (Engranaje Solar ☀ en el zócalo izquierdo, Lente Lunar ☽ en el derecho y Prisma Umbral ◈ en el núcleo central) para activar los tres anillos finales.'
          ]
        });
      }
    }

    // 12. Eclipse Vault Door Coupled 3-Ring Finale F1
    if (allRelicsPlaced(d) && !d.vaultSolved) {
      const sol = solveVaultRingsClicks(d.vaultRings);
      list.push({
        id: 'vault_f1',
        title: 'Cerradura Final de los Tres Anillos',
        views: ['door'],
        tiers: [
          'Las tres reliquias ya están encajadas. Ahora debes girar los tres anillos concéntricos hasta que sus tres muescas doradas apunten a la flecha superior (las 12 en punto).',
          'Los anillos están acoplados mecánicamente (6 posiciones cada uno): Exterior avanza (+1 Ext, +1 Med); Medio avanza (+1 Med, +2 Int); Interior avanza (+1 Int, +2 Ext). Revisa la placa grabada al pie de la puerta.',
          formatRingClicks(sol)
        ]
      });
    }

    return list;
  }

  function resolveCurrentStep() {
    const d = SR.State.data;
    if (d.escaped || d.vaultSolved) {
      return {
        id: 'escaped',
        title: '¡Eclipse Consumado!',
        tiers: [
          'Has resuelto todos los mecanismos del Observatorio de Solís y la Puerta del Eclipse está abierta.'
        ]
      };
    }

    const candidates = getActiveCandidates(d);
    if (candidates.length === 0) {
      return {
        id: 'explore',
        title: 'Exploración del Gabinete',
        tiers: [
          'Explora las distintas estaciones del observatorio con la barra de navegación superior o girando la cámara con el ratón.',
          'Revisa tu Diario para repasar las pistas halladas y tu inventario para inspeccionar en 3D cualquier objeto con detalles mecánicos.',
          'Recuerda que puedes examinar la Estantería y el Reloj, el Escritorio, el Gabinete de Telemetría, la Mesa de Óptica, el Gran Planetario, la Cúpula Celestial y la Puerta del Eclipse.'
        ]
      };
    }

    const currentView = (SR.Camera && typeof SR.Camera.getCurrentView === 'function')
      ? SR.Camera.getCurrentView()
      : d.currentView;

    // 1) If player is actively viewing a station that has a directly solvable candidate, prioritize it
    if (currentView && currentView !== 'room') {
      for (let i = 0; i < candidates.length; i++) {
        if (candidates[i].views && candidates[i].views.includes(currentView)) {
          return candidates[i];
        }
      }
    }

    // 2) Otherwise return the first full-priority candidate in logical progression order
    for (let i = 0; i < candidates.length; i++) {
      if (!candidates[i].priorityOnlyWhenAllOrViewing) {
        return candidates[i];
      }
    }

    return candidates[0];
  }

  function renderStep(step) {
    if (!elBody) return;
    const maxTiers = step.tiers.length;
    const revealed = Math.min(maxTiers, revealedByStep[step.id] || 0);

    let html = '<div class="hint-step" style="border-left-color: var(--brass-bright); background: rgba(201, 157, 78, 0.1);">';
    html += '<div class="hint-step-tag">Objetivo actual</div>';
    html += '<p><strong>' + escapeHtml(step.title) + '</strong></p>';
    html += '</div>';

    for (let i = 0; i < revealed; i++) {
      html += '<div class="hint-step">';
      html += '<div class="hint-step-tag">' + (TIER_LABELS[i] || ('Nivel ' + (i + 1))) + '</div>';
      html += '<p>' + escapeHtml(step.tiers[i]) + '</p>';
      html += '</div>';
    }

    elBody.innerHTML = html;

    if (elCountLabel) {
      const total = SR.State.data.hintsUsed || 0;
      elCountLabel.textContent = 'Pistas reveladas: ' + total;
    }

    if (elBtnReveal) {
      if (revealed >= maxTiers) {
        elBtnReveal.disabled = true;
        elBtnReveal.style.opacity = '0.5';
        elBtnReveal.style.cursor = 'default';
        elBtnReveal.textContent = 'Todos los niveles revelados';
      } else {
        elBtnReveal.disabled = false;
        elBtnReveal.style.opacity = '1';
        elBtnReveal.style.cursor = 'pointer';
        elBtnReveal.textContent = 'Revelar nivel ' + (revealed + 1) + ' de ' + maxTiers;
      }
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function revealNextTier(step) {
    if (!step) return;
    const current = revealedByStep[step.id] || 0;
    if (current < step.tiers.length) {
      revealedByStep[step.id] = current + 1;
      if (step.id !== 'escaped' && step.id !== 'explore') {
        SR.State.data.hintsUsed = (SR.State.data.hintsUsed || 0) + 1;
        SR.State.save();
      }
    }
    renderStep(step);
  }

  const Hints = {
    init: function () {
      if (initialized) return;
      initialized = true;

      elModal = document.getElementById('hint-modal');
      elBody = document.getElementById('hint-body');
      elCountLabel = document.getElementById('hint-count-label');
      elBtnReveal = document.getElementById('btn-reveal-next-hint');
      elBtnClose = document.getElementById('btn-close-hint');

      if (elBtnClose) {
        elBtnClose.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.9);
          Hints.close();
        });
      }

      if (elBtnReveal) {
        elBtnReveal.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(1.1);
          const step = resolveCurrentStep();
          currentStepId = step.id;
          revealNextTier(step);
        });
      }

      if (elModal) {
        elModal.addEventListener('click', function (e) {
          if (e.target === elModal) {
            Hints.close();
          }
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && isOpenFlag) {
          Hints.close();
        }
      });

      if (SR.State) {
        SR.State.on('stateReset', function () {
          revealedByStep = {};
          currentStepId = null;
        });
        SR.State.on('stateLoaded', function () {
          revealedByStep = {};
          currentStepId = null;
        });
      }
    },

    open: function () {
      if (!initialized) Hints.init();
      if (!elModal) return;

      if (SR.Audio) SR.Audio.playClick(1.08);

      const step = resolveCurrentStep();
      currentStepId = step.id;

      // Auto-reveal Tier 1 the first time the player asks for help on this step
      if (!revealedByStep[step.id]) {
        revealNextTier(step);
      } else {
        renderStep(step);
      }

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

    getCurrentStep: function () {
      return resolveCurrentStep();
    }
  };

  SR.Hints = Hints;
})(window.SR = window.SR || {});
