/* ==========================================================================
   src/core/state.js — Central Game State, Item Registry & Persistence
   ========================================================================== */
(function (SR) {
  'use strict';

  const SAVE_KEY = 'el_gabinete_del_eclipse_save_v1';

  const ITEMS = {
    telescope: {
      id: 'telescope',
      name: 'Catalejo de Latón',
      shortName: 'Catalejo',
      icon: '🔭',
      inspectable: true,
      desc: 'Un catalejo astronómico de Valerio con anillos de bronce pulido. El ocular trasero parece tener una rosca suelta...'
    },
    cobalt_filter: {
      id: 'cobalt_filter',
      name: 'Filtro de Cobalto',
      shortName: 'Filtro UV',
      icon: '💠',
      inspectable: true,
      desc: 'Lente de vidrio azul cobalto tallada con precisión. Al colocarla en una fuente de luz, revela tintas ultravioletas ocultas.'
    },
    clock_key: {
      id: 'clock_key',
      name: 'Llave de Cuerda',
      shortName: 'Llave Reloj',
      icon: '🗝️',
      inspectable: true,
      desc: 'Llave maestra de horología en latón macizo. Su bocallave cuadrada encaja en el mecanismo de un reloj de péndulo.'
    },
    valve_wheel: {
      id: 'valve_wheel',
      name: 'Volante de Válvula',
      shortName: 'Volante',
      icon: '☸️',
      inspectable: true,
      desc: 'Rueda de maniobra de cuatro radios para controlar la presión en una consola de conductos de cobre.'
    },
    clock_weight: {
      id: 'clock_weight',
      name: 'Pesa de Bronce',
      shortName: 'Contrapeso',
      icon: '⚖️',
      inspectable: true,
      desc: 'Cilindro macizo de bronce fundido con gancho superior. Sin este contrapeso, el péndulo del reloj no puede oscilar.'
    },
    cipher_disk: {
      id: 'cipher_disk',
      name: 'Disco Móvil de Latón',
      shortName: 'Disco Cifrador',
      icon: '🧭',
      inspectable: true,
      desc: 'Rueda giratoria grabada con los dígitos del 0 al 9. Pertenece al eje central del Disco Cifrador Zodiacal.'
    },
    quartz_splitter: {
      id: 'quartz_splitter',
      name: 'Cristal Divisor',
      shortName: 'Cristal Divisor',
      icon: '💎',
      inspectable: true,
      desc: 'Espejo semirreflectante de cuarzo tallado a 45°. Divide un haz de luz en dos rayos perpendiculares.'
    },
    orrery_crank: {
      id: 'orrery_crank',
      name: 'Manivela Astral',
      shortName: 'Manivela',
      icon: '⚙️',
      inspectable: true,
      desc: 'Llave de trinquete con empuñadura estelar. Diseñada para desbloquear el embrague del Gran Planetario Mecánico.'
    },
    solar_gear: {
      id: 'solar_gear',
      name: 'Engranaje Solar',
      shortName: 'Sol de Oro',
      icon: '☀️',
      inspectable: true,
      isRelic: true,
      desc: 'Primera Reliquia del Eclipse: un engranaje de oro solar tallado con dieciséis rayos. Pertenece a la Puerta del Eclipse.'
    },
    lunar_lens: {
      id: 'lunar_lens',
      name: 'Lente Lunar',
      shortName: 'Luna de Plata',
      icon: '🌙',
      inspectable: true,
      isRelic: true,
      desc: 'Segunda Reliquia del Eclipse: una lente de plata y cristal lunar engastada. Pertenece a la Puerta del Eclipse.'
    },
    umbral_prism: {
      id: 'umbral_prism',
      name: 'Prisma Umbral',
      shortName: 'Prisma Umbral',
      icon: '🔮',
      inspectable: true,
      isRelic: true,
      desc: 'Tercera Reliquia del Eclipse: un prisma de obsidiana dorada que concentra la sombra total. Pertenece al núcleo de la Puerta.'
    }
  };

  function createInitialState() {
    return {
      started: false,
      escaped: false,
      elapsedSeconds: 0,
      hintsUsed: 0,
      currentView: 'room',
      viewStack: [],

      // Inventory
      inventory: [],
      selectedItem: null,
      collected: {}, // id -> true (even after used/consumed)

      // Journal unlocked entries
      journalUnlocked: ['intro'],
      journalUnread: false,

      // UV System
      uvInstalled: false,
      uvActive: false,

      // Station 1 — Bookshelf & Grandfather Clock
      booksPulled: [],          // current attempt sequence of symbols
      booksSolved: false,
      alcoveKeyTaken: false,
      alcoveWheelTaken: false,

      clockDoorOpen: false,
      clockWeightPlaced: false,
      clockWound: false,
      clockHour: 12,            // 1..12 (target: 8)
      clockMinute: 0,           // 0, 15, 30, 45 (target: 15)
      clockMoonPhase: 0,        // 0: Llena, 1: Menguante, 2: Nueva (Eclipse), 3: Creciente
      clockSolved: false,
      solarGearTaken: false,

      // Station 2 — Master Horologist's Desk
      telescopeTaken: false,
      telescopeOpened: false,
      chimeSequence: [],        // target: [3, 1, 5, 2, 4]
      chimeSolved: false,
      cipherDiskTaken: false,
      bankerLampOn: true,

      // Station 3 — Telemetry Console (Valves + Cipher + Safe)
      valve4Installed: false,
      valves: [0, 0, 0, 0],     // each 0..2, unique target [2, 1, 1, 1]
      valvesSolved: false,
      clockWeightTaken: false,

      cipherDiskInstalled: false,
      cipherOffset: 0,          // 0..9; ★ (idx 9) aligns with (9 + offset) % 10 -> target offset = 8 so ★ = 7!
      safeDigits: [0, 0, 0, 0], // target: [8, 2, 4, 9]
      safeSolved: false,
      lunarLensTaken: false,
      quartzSplitterTaken: false,

      // Station 4 — Optical Bench
      splitter2Installed: false,
      // Mirror/Splitter states: 0:'-', 1:'/', 2:'|', 3:'\'
      // Solution: s1:'/'(1), s2:'\'(3), m11:'/'(1), m31:'/'(1), m30:'/'(1), m23:'/'(1), m03:'/'(1), m04:'\'(3)
      opticsNodes: {
        s1: 3,    // (1,2) built-in splitter -> needs 1 ('/')
        s2: 1,    // (2,2) placed splitter -> needs 3 ('\')
        m11: 3,   // (1,1) -> needs 1 ('/')
        m31: 2,   // (3,1) -> needs 1 ('/')
        m30: 3,   // (3,0) -> needs 1 ('/')
        m23: 0,   // (2,3) -> needs 1 ('/')
        m03: 3,   // (0,3) -> needs 1 ('/')
        m04: 1,   // (0,4) -> needs 3 ('\')
        m10: 1,   // (1,0) decoy
        m34: 3    // (3,4) decoy
      },
      opticsReceptors: { amber: false, ruby: false, sapphire: false },
      opticsSolved: false,
      orreryCrankTaken: false,

      // Station 5 — Grand Mechanical Orrery
      orreryUnlocked: false,
      // 8 sectors: 0:♈(N), 1:♊(NE), 2:♋(E), 3:♍(SE), 4:♎(S), 5:♐(SO), 6:♑(O), 7:♒(NO)
      // Target: mercury=0(♈), venus=2(♋), mars=6(♑), saturn=5(♐)
      orreryRings: { mercury: 3, venus: 7, mars: 1, saturn: 2 },
      orrerySolved: false,
      umbralPrismTaken: false,

      // Station 6 — Eclipse Vault Door (Finale)
      relicsPlaced: {
        solar_gear: false,
        lunar_lens: false,
        umbral_prism: false
      },
      // 3 coupled rings mod 6; start (1, 4, 2), solved at (0, 0, 0) in clicks (1, 1, 2)
      vaultRings: [1, 4, 2],
      vaultSolved: false,

      // Settings
      settings: {
        volume: 0.75,
        muted: false,
        bloom: true,
        shadows: true
      }
    };
  }

  class GameState {
    constructor() {
      this.data = createInitialState();
      this._listeners = {};
    }

    on(event, fn) {
      if (!this._listeners[event]) this._listeners[event] = [];
      this._listeners[event].push(fn);
    }

    emit(event, payload) {
      const list = this._listeners[event];
      if (!list) return;
      for (let i = 0; i < list.length; i++) {
        list[i](payload, this.data);
      }
    }

    getItemDef(id) {
      return ITEMS[id] || null;
    }

    hasItem(id) {
      return this.data.inventory.includes(id);
    }

    addItem(id) {
      if (!ITEMS[id]) return false;
      if (!this.data.inventory.includes(id)) {
        this.data.inventory.push(id);
      }
      this.data.collected[id] = true;
      this.emit('inventoryChanged', { added: id });
      this.save();
      return true;
    }

    removeItem(id) {
      const idx = this.data.inventory.indexOf(id);
      if (idx !== -1) {
        this.data.inventory.splice(idx, 1);
      }
      if (this.data.selectedItem === id) {
        this.data.selectedItem = null;
      }
      this.emit('inventoryChanged', { removed: id });
      this.save();
    }

    selectItem(id) {
      if (id && !this.hasItem(id)) id = null;
      this.data.selectedItem = (this.data.selectedItem === id) ? null : id;
      this.emit('selectionChanged', this.data.selectedItem);
    }

    unlockJournal(entryId, silent) {
      if (!this.data.journalUnlocked.includes(entryId)) {
        this.data.journalUnlocked.push(entryId);
        if (!silent) {
          this.data.journalUnread = true;
        }
        this.emit('journalUpdated', entryId);
        this.save();
      }
    }

    markJournalRead() {
      if (this.data.journalUnread) {
        this.data.journalUnread = false;
        this.emit('journalUpdated', null);
      }
    }

    setUV(active) {
      if (!this.data.uvInstalled) return;
      this.data.uvActive = !!active;
      this.emit('uvChanged', this.data.uvActive);
      this.save();
    }

    save() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (e) {
        // Ignore storage errors (private mode / file:// restrictions)
      }
    }

    hasSavedGame() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        return !!(parsed && parsed.started && !parsed.escaped);
      } catch (e) {
        return false;
      }
    }

    load() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return false;
        const parsed = JSON.parse(raw);
        const fresh = createInitialState();
        // Deep-merge top-level objects so schema stays intact
        this.data = Object.assign(fresh, parsed);
        this.data.opticsNodes = Object.assign(fresh.opticsNodes, parsed.opticsNodes || {});
        this.data.opticsReceptors = Object.assign(fresh.opticsReceptors, parsed.opticsReceptors || {});
        this.data.orreryRings = Object.assign(fresh.orreryRings, parsed.orreryRings || {});
        this.data.relicsPlaced = Object.assign(fresh.relicsPlaced, parsed.relicsPlaced || {});
        this.data.settings = Object.assign(fresh.settings, parsed.settings || {});
        this.emit('stateLoaded', this.data);
        return true;
      } catch (e) {
        return false;
      }
    }

    reset() {
      const prevSettings = Object.assign({}, this.data.settings);
      this.data = createInitialState();
      this.data.settings = prevSettings;
      try {
        localStorage.removeItem(SAVE_KEY);
      } catch (e) {}
      this.emit('stateReset', this.data);
    }
  }

  SR.ITEMS = ITEMS;
  SR.State = new GameState();
})(window.SR = window.SR || {});
