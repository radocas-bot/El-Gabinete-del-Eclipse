/* ==========================================================================
   src/ui/hud.js — Reactive HUD, Inventory Dock, Compass, Tooltip & Monologue
   ========================================================================== */
(function (SR) {
  'use strict';

  const VIEW_TO_STATION = {
    door: 'door',
    clockBooks: 'clockBooks',
    clock: 'clockBooks',
    books: 'clockBooks',
    desk: 'desk',
    chime: 'desk',
    mirror: 'desk',
    optics: 'optics',
    starmap: 'optics',
    telemetry: 'telemetry',
    valves: 'telemetry',
    cipher: 'telemetry',
    safe: 'telemetry',
    orrery: 'orrery',
    dome: 'dome'
  };

  let initialized = false;
  let dialogueTimer = null;
  let isTouchPointer = false;

  // Cached DOM references
  let elHud = null;
  let elCanvas = null;
  let elBtnBack = null;
  let elBtnTurnLeft = null;
  let elBtnTurnRight = null;
  let elCompassBtns = [];
  let elBtnUV = null;
  let elUVVignette = null;
  let elFlashOverlay = null;
  let elBtnJournal = null;
  let elJournalBadge = null;
  let elBtnHint = null;
  let elBtnSettings = null;
  let elTimerDisplay = null;
  let elRelicDots = [];
  let elStationBanner = null;
  let elStationTitle = null;
  let elStationSubtitle = null;
  let elDialogueBox = null;
  let elDialogueText = null;
  let elEquippedBanner = null;
  let elEquippedText = null;
  let elBtnInspectEquipped = null;
  let elBtnUnequip = null;
  let elInventoryBar = null;
  let elTooltip = null;
  let elTooltipAction = null;
  let elTooltipLabel = null;

  function formatTime(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
  }

  function renderInventory() {
    if (!elInventoryBar || !SR.State) return;
    const d = SR.State.data;
    const inv = d.inventory || [];

    elInventoryBar.innerHTML = '';

    if (inv.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'inventory-empty-msg';
      empty.textContent = 'Inventario vacío — Explora el gabinete con el ratón';
      elInventoryBar.appendChild(empty);
      return;
    }

    for (let i = 0; i < inv.length; i++) {
      const itemId = inv[i];
      const def = SR.State.getItemDef(itemId);
      if (!def) continue;

      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'inv-slot' + (d.selectedItem === itemId ? ' selected' : '');
      slot.dataset.itemId = itemId;
      slot.title = def.name + ' — Clic: equipar • Doble clic o clic derecho: inspeccionar 3D';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'inv-icon';
      iconSpan.textContent = def.icon || '✦';
      slot.appendChild(iconSpan);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'inv-name';
      nameSpan.textContent = def.shortName || def.name;
      slot.appendChild(nameSpan);

      if (def.inspectable) {
        const pip = document.createElement('span');
        pip.className = 'inv-inspect-pip';
        pip.textContent = '🔍';
        pip.title = 'Inspeccionable en 3D';
        slot.appendChild(pip);
      }

      slot.addEventListener('click', (function (id) {
        return function (e) {
          e.stopPropagation();
          if (SR.Audio) SR.Audio.playClick(1.05);
          SR.State.selectItem(id);
        };
      })(itemId));

      slot.addEventListener('dblclick', (function (id) {
        return function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (SR.Inspector && typeof SR.Inspector.open === 'function') {
            SR.Inspector.open(id);
          }
        };
      })(itemId));

      slot.addEventListener('contextmenu', (function (id) {
        return function (e) {
          e.preventDefault();
          e.stopPropagation();
          if (SR.Inspector && typeof SR.Inspector.open === 'function') {
            SR.Inspector.open(id);
          }
        };
      })(itemId));

      elInventoryBar.appendChild(slot);
    }
  }

  function updateEquippedBanner() {
    if (!elEquippedBanner || !SR.State) return;
    const selectedId = SR.State.data.selectedItem;
    const def = selectedId ? SR.State.getItemDef(selectedId) : null;

    if (elHud) {
      elHud.classList.toggle('has-equipped', !!def);
    }

    if (!def) {
      elEquippedBanner.classList.add('hidden');
      return;
    }

    if (elEquippedText) {
      elEquippedText.textContent = 'Equipado: ' + (def.icon ? def.icon + ' ' : '') + def.name;
    }
    if (elBtnInspectEquipped) {
      elBtnInspectEquipped.classList.toggle('hidden', !def.inspectable);
    }
    elEquippedBanner.classList.remove('hidden');
  }

  function updateRelics() {
    if (!SR.State) return;
    const placed = SR.State.data.relicsPlaced || {};
    for (let i = 0; i < elRelicDots.length; i++) {
      const dot = elRelicDots[i];
      const relicId = dot.dataset.relic;
      dot.classList.toggle('placed', !!placed[relicId]);
    }
  }

  function updateUV() {
    if (!SR.State) return;
    const installed = !!SR.State.data.uvInstalled;
    const active = installed && !!SR.State.data.uvActive;

    if (elBtnUV) {
      elBtnUV.classList.toggle('hidden', !installed);
      elBtnUV.classList.toggle('active', active);
      elBtnUV.setAttribute('aria-pressed', active ? 'true' : 'false');
    }
    if (elUVVignette) {
      elUVVignette.classList.toggle('active', active);
    }
  }

  function updateJournalBadge() {
    if (!elJournalBadge || !SR.State) return;
    elJournalBadge.classList.toggle('hidden', !SR.State.data.journalUnread);
  }

  const UI = {
    init: function () {
      if (initialized) return;
      initialized = true;

      elHud = document.getElementById('hud');
      elCanvas = document.getElementById('game-canvas');
      elBtnBack = document.getElementById('btn-back');
      elBtnTurnLeft = document.getElementById('btn-turn-left');
      elBtnTurnRight = document.getElementById('btn-turn-right');
      elCompassBtns = Array.prototype.slice.call(
        document.querySelectorAll('#station-compass .compass-btn[data-station]')
      );
      elBtnUV = document.getElementById('btn-uv');
      elUVVignette = document.getElementById('uv-vignette');
      elFlashOverlay = document.getElementById('flash-overlay');
      elBtnJournal = document.getElementById('btn-journal');
      elJournalBadge = document.getElementById('journal-badge');
      elBtnHint = document.getElementById('btn-hint');
      elBtnSettings = document.getElementById('btn-settings');
      elTimerDisplay = document.getElementById('timer-display');
      elRelicDots = Array.prototype.slice.call(
        document.querySelectorAll('#relic-counter .relic-dot[data-relic]')
      );
      elStationBanner = document.getElementById('station-banner');
      elStationTitle = document.getElementById('station-title');
      elStationSubtitle = document.getElementById('station-subtitle');
      elDialogueBox = document.getElementById('dialogue-box');
      elDialogueText = document.getElementById('dialogue-text');
      elEquippedBanner = document.getElementById('equipped-banner');
      elEquippedText = document.getElementById('equipped-text');
      elBtnInspectEquipped = document.getElementById('btn-inspect-equipped');
      elBtnUnequip = document.getElementById('btn-unequip');
      elInventoryBar = document.getElementById('inventory-bar');
      elTooltip = document.getElementById('cursor-tooltip');
      elTooltipAction = elTooltip ? elTooltip.querySelector('.tooltip-action') : null;
      elTooltipLabel = elTooltip ? elTooltip.querySelector('.tooltip-label') : null;

      // Wire top & edge HUD buttons
      if (elBtnBack) {
        elBtnBack.title = 'Volver atrás (Rueda atrás / Clic derecho)';
        elBtnBack.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.92);
          if (SR.Camera && typeof SR.Camera.goBack === 'function') {
            SR.Camera.goBack();
          }
        });
      }

      if (elBtnTurnLeft) {
        elBtnTurnLeft.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.95);
          if (SR.Camera && typeof SR.Camera.turnBy === 'function') {
            SR.Camera.turnBy(-Math.PI / 4);
          }
        });
      }

      if (elBtnTurnRight) {
        elBtnTurnRight.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.95);
          if (SR.Camera && typeof SR.Camera.turnBy === 'function') {
            SR.Camera.turnBy(Math.PI / 4);
          }
        });
      }

      elCompassBtns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          const station = btn.dataset.station;
          if (!station) return;
          if (SR.Audio) SR.Audio.playClick(1.0);
          if (SR.Camera && typeof SR.Camera.goToView === 'function') {
            const curr = SR.Camera.getCurrentView ? SR.Camera.getCurrentView() : null;
            if (curr === station) {
              SR.Camera.goToView('room', false);
            } else {
              SR.Camera.goToView(station, true);
            }
          }
        });
      });

      if (elBtnUV) {
        elBtnUV.addEventListener('click', function () {
          if (!SR.State || !SR.State.data.uvInstalled) return;
          const next = !SR.State.data.uvActive;
          SR.State.setUV(next);
          if (SR.Audio) SR.Audio.playUV(next);
          UI.say(
            next
              ? 'Linterna de Cobalto encendida. Las tintas fosforescentes reaccionan al haz ultravioleta.'
              : 'Linterna ultravioleta apagada.',
            3000
          );
        });
      }

      if (elBtnJournal) {
        elBtnJournal.addEventListener('click', function () {
          if (SR.Journal && typeof SR.Journal.open === 'function') {
            SR.Journal.open();
          }
        });
      }

      if (elBtnHint) {
        elBtnHint.addEventListener('click', function () {
          if (SR.Hints && typeof SR.Hints.open === 'function') {
            SR.Hints.open();
          }
        });
      }

      if (elBtnSettings) {
        elBtnSettings.addEventListener('click', function () {
          if (SR.Screens && typeof SR.Screens.openSettings === 'function') {
            SR.Screens.openSettings();
          }
        });
      }

      if (elBtnInspectEquipped) {
        elBtnInspectEquipped.addEventListener('click', function () {
          const selected = SR.State && SR.State.data.selectedItem;
          if (selected && SR.Inspector && typeof SR.Inspector.open === 'function') {
            SR.Inspector.open(selected);
          }
        });
      }

      if (elBtnUnequip) {
        elBtnUnequip.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.85);
          if (SR.State) SR.State.selectItem(null);
        });
      }

      // Reactive SR.State subscriptions
      if (SR.State) {
        SR.State.on('inventoryChanged', function () {
          renderInventory();
          updateEquippedBanner();
          updateUV();
        });
        SR.State.on('selectionChanged', function () {
          renderInventory();
          updateEquippedBanner();
        });
        SR.State.on('uvChanged', function () {
          updateUV();
        });
        SR.State.on('journalUpdated', function () {
          updateJournalBadge();
        });
        SR.State.on('relicPlaced', function () {
          updateRelics();
        });
        SR.State.on('stateLoaded', function () {
          UI.syncAll();
        });
        SR.State.on('stateReset', function () {
          UI.syncAll();
          UI.say('', 0);
          UI.flash(false);
        });
      }

      // Suppress hover tooltips cleanly whenever touch input is used
      window.addEventListener('touchstart', function () {
        isTouchPointer = true;
        if (elTooltip) elTooltip.classList.add('hidden');
      }, { passive: true });

      window.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'touch') {
          isTouchPointer = true;
          if (elTooltip) elTooltip.classList.add('hidden');
        } else if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          isTouchPointer = false;
        }
      }, { passive: true });

      window.addEventListener('pointermove', function (e) {
        if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
          isTouchPointer = false;
        }
      }, { passive: true });

      UI.syncAll();
    },

    syncAll: function () {
      renderInventory();
      updateEquippedBanner();
      updateRelics();
      updateUV();
      updateJournalBadge();
      if (SR.State && SR.State.data) {
        UI.updateTimer(SR.State.data.elapsedSeconds || 0);
      }
    },

    show: function () {
      if (elHud) elHud.classList.remove('hidden');
    },

    hide: function () {
      if (elHud) elHud.classList.add('hidden');
      UI.setTooltip(false);
    },

    updateTimer: function (seconds) {
      if (elTimerDisplay) {
        elTimerDisplay.textContent = formatTime(seconds);
      }
    },

    updateView: function (viewId, viewMeta) {
      const isRoom = !viewId || viewId === 'room';

      if (elBtnBack) {
        elBtnBack.classList.toggle('hidden', isRoom);
      }
      if (elBtnTurnLeft) {
        elBtnTurnLeft.classList.toggle('hidden', !isRoom);
      }
      if (elBtnTurnRight) {
        elBtnTurnRight.classList.toggle('hidden', !isRoom);
      }

      // Highlight matching top-level compass station (including sub-views)
      const activeStation = VIEW_TO_STATION[viewId] || null;
      for (let i = 0; i < elCompassBtns.length; i++) {
        const btn = elCompassBtns[i];
        const isActive = !isRoom && btn.dataset.station === activeStation;
        btn.classList.toggle('active', isActive);
        if (isActive && typeof btn.scrollIntoView === 'function' && window.innerWidth <= 1060) {
          try {
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
          } catch (e) {}
        }
      }

      // Station contextual title & subtitle banner
      if (elStationBanner) {
        if (isRoom || !viewMeta || !viewMeta.title) {
          elStationBanner.classList.add('hidden');
        } else {
          if (elStationTitle) elStationTitle.textContent = viewMeta.title;
          if (elStationSubtitle) {
            elStationSubtitle.textContent = viewMeta.subtitle || '';
            elStationSubtitle.classList.toggle('hidden', !viewMeta.subtitle);
          }
          elStationBanner.classList.remove('hidden');
        }
      }
    },

    setTooltip: function (visible, action, label, x, y) {
      if (!elTooltip) return;
      if (!visible || isTouchPointer || (!action && !label)) {
        elTooltip.classList.add('hidden');
        return;
      }

      if (elTooltipAction) elTooltipAction.textContent = action || '';
      if (elTooltipLabel) elTooltipLabel.textContent = label || '';
      elTooltip.classList.remove('hidden');

      if (typeof x === 'number' && typeof y === 'number') {
        const pad = 16;
        const rect = elTooltip.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - (rect.width || 220) - pad - 18);
        const maxTop = Math.max(8, window.innerHeight - (rect.height || 54) - pad - 18);
        const clampedX = Math.max(8, Math.min(x, maxLeft));
        const clampedY = Math.max(8, Math.min(y, maxTop));
        elTooltip.style.left = clampedX + 'px';
        elTooltip.style.top = clampedY + 'px';
      }
    },

    showTapRipple: function (x, y) {
      if (typeof x !== 'number' || typeof y !== 'number' || !document.body) return;
      const ring = document.createElement('div');
      ring.className = 'tap-ripple';
      ring.setAttribute('aria-hidden', 'true');
      ring.style.left = x + 'px';
      ring.style.top = y + 'px';
      document.body.appendChild(ring);

      let removed = false;
      function cleanup() {
        if (removed) return;
        removed = true;
        if (ring.parentNode) ring.parentNode.removeChild(ring);
      }
      ring.addEventListener('animationend', cleanup);
      setTimeout(cleanup, 520);
    },

    setCursor: function (type) {
      if (!elCanvas) return;
      elCanvas.classList.remove('cursor-inspect', 'cursor-interact', 'cursor-use');
      if (type === 'inspect' || type === 'interact' || type === 'use') {
        elCanvas.classList.add('cursor-' + type);
      }
    },

    say: function (text, durationMs) {
      if (!elDialogueBox || !elDialogueText) return;
      if (dialogueTimer) {
        clearTimeout(dialogueTimer);
        dialogueTimer = null;
      }
      if (!text) {
        elDialogueBox.classList.add('hidden');
        elDialogueText.textContent = '';
        return;
      }

      elDialogueText.textContent = text;
      elDialogueBox.classList.remove('hidden');
      // Retrigger subtle fadeUp animation smoothly
      elDialogueBox.style.animation = 'none';
      void elDialogueBox.offsetWidth;
      elDialogueBox.style.animation = '';

      const ms = (typeof durationMs === 'number') ? durationMs : 4600;
      if (ms > 0) {
        dialogueTimer = setTimeout(function () {
          elDialogueBox.classList.add('hidden');
          dialogueTimer = null;
        }, ms);
      }
    },

    flash: function (active) {
      if (!elFlashOverlay) return;
      elFlashOverlay.classList.toggle('active', !!active);
    },

    isAnyModalOpen: function () {
      return !!(
        (SR.Inspector && SR.Inspector.isOpen && SR.Inspector.isOpen()) ||
        (SR.Journal && SR.Journal.isOpen && SR.Journal.isOpen()) ||
        (SR.Hints && SR.Hints.isOpen && SR.Hints.isOpen()) ||
        (SR.Screens && SR.Screens.isSettingsOpen && SR.Screens.isSettingsOpen())
      );
    },

    formatTime: formatTime
  };

  SR.UI = UI;
  SR.HUD = UI;
})(window.SR = window.SR || {});
