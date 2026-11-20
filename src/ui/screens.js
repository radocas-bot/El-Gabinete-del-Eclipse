/* ==========================================================================
   src/ui/screens.js — Title Screen, Settings Modal & Victory Screen Overlays
   ========================================================================== */
(function (SR) {
  'use strict';

  let initialized = false;
  let settingsOpenFlag = false;
  let titleFadeTimer = null;

  // PWA Install Prompt state (captured early even before Screens.init)
  let deferredInstallPrompt = null;
  let pwaInstallAccepted = false;
  let pwaToastEl = null;
  let pwaToastTimer = null;
  let elInstallBtns = [];

  // Cached DOM references
  let elTitleScreen = null;
  let elBtnStartNew = null;
  let elBtnContinue = null;

  function isStandaloneMode() {
    try {
      if (window.navigator && window.navigator.standalone === true) return true;
      if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    } catch (e) {}
    return false;
  }

  function isIOSNonStandalone() {
    if (isStandaloneMode()) return false;
    const ua = (window.navigator && window.navigator.userAgent) || '';
    const isIOS = /iPhone|iPad|iPod/i.test(ua) ||
      (window.navigator && window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    return isIOS;
  }

  function isMobileTouchDevice() {
    try {
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return true;
    } catch (e) {}
    return ('ontouchstart' in window) || ((window.navigator && window.navigator.maxTouchPoints) > 0);
  }

  function requestMobileFullscreen() {
    try {
      if (!isMobileTouchDevice() || isStandaloneMode()) return;
      if (document.fullscreenElement || document.webkitFullscreenElement) return;
      const el = document.documentElement;
      if (el && typeof el.requestFullscreen === 'function') {
        const p = el.requestFullscreen({ navigationUI: 'hide' });
        if (p && typeof p.catch === 'function') p.catch(function () {});
      } else if (el && typeof el.webkitRequestFullscreen === 'function') {
        el.webkitRequestFullscreen();
      }
    } catch (e) {}
  }

  function updatePWAInstallButtons() {
    const canShow = !pwaInstallAccepted && !isStandaloneMode() &&
      (!!deferredInstallPrompt || isIOSNonStandalone() || isMobileTouchDevice());
    for (let i = 0; i < elInstallBtns.length; i++) {
      elInstallBtns[i].classList.toggle('hidden', !canShow);
    }
  }

  function showPWAToast(message, durationMs) {
    if (!document.body || !message) return;
    if (pwaToastTimer) {
      clearTimeout(pwaToastTimer);
      pwaToastTimer = null;
    }
    if (!pwaToastEl) {
      pwaToastEl = document.createElement('div');
      pwaToastEl.className = 'pwa-toast';
      pwaToastEl.setAttribute('role', 'status');
      pwaToastEl.setAttribute('aria-live', 'polite');
      pwaToastEl.title = 'Toca para cerrar';
      pwaToastEl.addEventListener('click', function () {
        if (pwaToastEl) pwaToastEl.classList.add('hidden');
      });
      document.body.appendChild(pwaToastEl);
    }
    pwaToastEl.textContent = message;
    pwaToastEl.classList.remove('hidden');
    pwaToastTimer = setTimeout(function () {
      if (pwaToastEl) pwaToastEl.classList.add('hidden');
      pwaToastTimer = null;
    }, durationMs || 7000);
  }

  function handlePWAInstallClick() {
    try {
      if (SR.Audio) SR.Audio.playClick(1.05);
    } catch (e) {}

    if (deferredInstallPrompt) {
      const promptEvent = deferredInstallPrompt;
      deferredInstallPrompt = null;
      try {
        promptEvent.prompt();
        if (promptEvent.userChoice && typeof promptEvent.userChoice.then === 'function') {
          promptEvent.userChoice.then(function (result) {
            if (result && result.outcome === 'accepted') {
              pwaInstallAccepted = true;
              updatePWAInstallButtons();
              showPWAToast('¡El Gabinete del Eclipse se está instalando en tu dispositivo!', 4500);
            } else {
              updatePWAInstallButtons();
            }
          }).catch(function () {
            updatePWAInstallButtons();
          });
        } else {
          updatePWAInstallButtons();
        }
      } catch (e) {
        updatePWAInstallButtons();
      }
      return;
    }

    if (isIOSNonStandalone()) {
      showPWAToast("En Safari pulsa el botón Compartir (⬆) → 'Añadir a pantalla de inicio'.", 7500);
    } else {
      showPWAToast("Pulsa el menú (⋮) del navegador → 'Instalar aplicación' o 'Añadir a pantalla de inicio' (requiere HTTPS).", 7500);
    }
  }

  // Capture beforeinstallprompt & appinstalled as early as possible
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    if (pwaInstallAccepted) return;
    deferredInstallPrompt = e;
    updatePWAInstallButtons();
  });

  window.addEventListener('appinstalled', function () {
    pwaInstallAccepted = true;
    deferredInstallPrompt = null;
    updatePWAInstallButtons();
    showPWAToast('¡Aplicación instalada! Ya puedes abrir Eclipse 3D desde tu pantalla de inicio.', 4500);
  });

  let elSettingsModal = null;
  let elBtnCloseSettings = null;
  let elBtnResumeSettings = null;
  let elBtnRestartSettings = null;
  let elOptVolume = null;
  let elOptMute = null;
  let elOptBloom = null;
  let elOptShadows = null;

  let elVictoryScreen = null;
  let elStatTime = null;
  let elStatHints = null;
  let elStatRank = null;
  let elBtnPlayAgain = null;

  function formatTime(totalSeconds) {
    if (SR.UI && typeof SR.UI.formatTime === 'function') {
      return SR.UI.formatTime(totalSeconds);
    }
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const m = Math.floor(s / 60);
    const r = s % 60;
    return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
  }

  function computeRank(hintsUsed) {
    const h = hintsUsed || 0;
    if (h === 0) return 'Gran Maestro Horólogo';
    if (h <= 2) return 'Astrónomo Perspicaz';
    return 'Aprendiz del Eclipse';
  }

  function syncAllStations() {
    if (SR.App && typeof SR.App.syncAllStations === 'function') {
      SR.App.syncAllStations();
      return;
    }
    if (SR.Stations) {
      const keys = Object.keys(SR.Stations);
      for (let i = 0; i < keys.length; i++) {
        const st = SR.Stations[keys[i]];
        if (st && typeof st.syncFromState === 'function') {
          st.syncFromState();
        }
      }
    }
  }

  function applyAudioAndGraphicsSettings() {
    const s = (SR.State && SR.State.data && SR.State.data.settings) || {
      volume: 0.75, muted: false, bloom: true, shadows: true
    };
    if (SR.Audio) {
      SR.Audio.setVolume(s.volume);
      SR.Audio.setMuted(s.muted);
    }
    if (SR.App && typeof SR.App.applySettings === 'function') {
      SR.App.applySettings();
    }
  }

  function syncSettingsInputs() {
    const s = (SR.State && SR.State.data && SR.State.data.settings) || {
      volume: 0.75, muted: false, bloom: true, shadows: true
    };
    if (elOptVolume) elOptVolume.value = String(Math.round((s.volume !== undefined ? s.volume : 0.75) * 100));
    if (elOptMute) elOptMute.checked = !!s.muted;
    if (elOptBloom) elOptBloom.checked = s.bloom !== false;
    if (elOptShadows) elOptShadows.checked = s.shadows !== false;
  }

  function closeAllModals() {
    if (SR.Inspector && typeof SR.Inspector.close === 'function') SR.Inspector.close();
    if (SR.Journal && typeof SR.Journal.close === 'function') SR.Journal.close();
    if (SR.Hints && typeof SR.Hints.close === 'function') SR.Hints.close();
    Screens.closeSettings();
  }

  function fadeOutTitleScreen() {
    if (!elTitleScreen) return;
    if (titleFadeTimer) {
      clearTimeout(titleFadeTimer);
      titleFadeTimer = null;
    }
    elTitleScreen.style.pointerEvents = 'none';
    elTitleScreen.style.transition = 'opacity 0.42s ease';
    elTitleScreen.style.opacity = '0';
    titleFadeTimer = setTimeout(function () {
      elTitleScreen.classList.add('hidden');
      elTitleScreen.style.opacity = '';
      elTitleScreen.style.transition = '';
      elTitleScreen.style.pointerEvents = '';
      titleFadeTimer = null;
    }, 440);
  }

  function startNewGame() {
    requestMobileFullscreen();

    try { closeAllModals(); } catch (e) {}
    if (elVictoryScreen) elVictoryScreen.classList.add('hidden');

    try {
      if (SR.Audio) {
        SR.Audio.init();
        SR.Audio.stopClockTick();
        SR.Audio.startAmbient();
        SR.Audio.playClick(1.0);
      }
    } catch (e) {}

    try {
      if (SR.State) {
        SR.State.reset();
        SR.State.data.started = true;
        SR.State.save();
      }
    } catch (e) {}

    try { applyAudioAndGraphicsSettings(); } catch (e) {}
    try { syncSettingsInputs(); } catch (e) {}
    try { syncAllStations(); } catch (e) {}

    try {
      if (SR.UI) {
        if (typeof SR.UI.init === 'function') SR.UI.init();
        SR.UI.flash(false);
        SR.UI.syncAll();
        SR.UI.show();
      }
    } catch (e) {}

    fadeOutTitleScreen();

    try {
      if (SR.Camera) {
        if (typeof SR.Camera.setRoomAngle === 'function') {
          SR.Camera.setRoomAngle(0, 3, false);
        }
        if (typeof SR.Camera.goToView === 'function') {
          SR.Camera.goToView('room', false);
        }
      }
    } catch (e) {}

    try {
      if (SR.UI && typeof SR.UI.say === 'function') {
        SR.UI.say(
          'La Puerta del Eclipse se ha sellado a mis espaldas. Debo hallar las tres reliquias celestiales de Maestro Valerio para escapar del observatorio.',
          6000
        );
      }
    } catch (e) {}
  }

  function continueSavedGame() {
    requestMobileFullscreen();

    let loaded = false;
    try {
      loaded = !!(SR.State && SR.State.load());
    } catch (e) {
      loaded = false;
    }
    if (!loaded) {
      startNewGame();
      return;
    }

    try { closeAllModals(); } catch (e) {}
    if (elVictoryScreen) elVictoryScreen.classList.add('hidden');

    SR.State.data.started = true;
    SR.State.data.escaped = false;

    try {
      if (SR.Audio) {
        SR.Audio.init();
        SR.Audio.startAmbient();
        SR.Audio.playClick(1.05);
        if (SR.State.data.clockWeightPlaced && SR.State.data.clockWound) {
          SR.Audio.startClockTick();
        } else {
          SR.Audio.stopClockTick();
        }
      }
    } catch (e) {}

    try { applyAudioAndGraphicsSettings(); } catch (e) {}
    try { syncSettingsInputs(); } catch (e) {}
    try { syncAllStations(); } catch (e) {}

    try {
      if (SR.UI) {
        if (typeof SR.UI.init === 'function') SR.UI.init();
        SR.UI.flash(false);
        SR.UI.syncAll();
        SR.UI.show();
      }
    } catch (e) {}

    fadeOutTitleScreen();

    try {
      if (SR.Camera && typeof SR.Camera.goToView === 'function') {
        SR.Camera.goToView('room', false);
      }
    } catch (e) {}

    try {
      if (SR.UI && typeof SR.UI.say === 'function') {
        SR.UI.say('Has retomado tu investigación en el Observatorio de Solís.', 4200);
      }
    } catch (e) {}
  }

  function ensureControlsHelp() {
    if (!elSettingsModal) return;
    const ul = elSettingsModal.querySelector('.controls-card ul');
    if (!ul) return;

    if (!ul.querySelector('li[data-control="wheel"]')) {
      const liWheel = document.createElement('li');
      liWheel.dataset.control = 'wheel';
      liWheel.innerHTML = '<strong>Rueda del ratón:</strong> Rueda arriba: acercar zoom • Rueda abajo: alejar / salir del zoom.';
      if (ul.children.length >= 2) {
        ul.insertBefore(liWheel, ul.children[2]);
      } else {
        ul.appendChild(liWheel);
      }
    }

    if (!ul.querySelector('li[data-control="touch"]')) {
      const liTouch = document.createElement('li');
      liTouch.dataset.control = 'touch';
      liTouch.innerHTML = '<strong>Táctil (móvil):</strong> Arrastra con un dedo para mirar 360°, toca para interactuar y pellizca con dos dedos para hacer zoom o salir.';
      ul.appendChild(liTouch);
    }
  }

  function refreshContinueButton() {
    if (!elBtnContinue || !SR.State) return;
    const hasSave = SR.State.hasSavedGame();
    elBtnContinue.classList.toggle('hidden', !hasSave);
  }

  const Screens = {
    init: function () {
      if (initialized) return;
      initialized = true;

      elTitleScreen = document.getElementById('title-screen');
      elBtnStartNew = document.getElementById('btn-start-new');
      elBtnContinue = document.getElementById('btn-continue');

      elSettingsModal = document.getElementById('settings-modal');
      elBtnCloseSettings = document.getElementById('btn-close-settings');
      elBtnResumeSettings = document.getElementById('btn-resume-settings');
      elBtnRestartSettings = document.getElementById('btn-restart-from-settings');
      elOptVolume = document.getElementById('opt-volume');
      elOptMute = document.getElementById('opt-mute');
      elOptBloom = document.getElementById('opt-bloom');
      elOptShadows = document.getElementById('opt-shadows');

      elVictoryScreen = document.getElementById('victory-screen');
      elStatTime = document.getElementById('stat-time');
      elStatHints = document.getElementById('stat-hints');
      elStatRank = document.getElementById('stat-rank');
      elBtnPlayAgain = document.getElementById('btn-play-again');

      elInstallBtns = Array.prototype.slice.call(
        document.querySelectorAll('#btn-install-pwa, #btn-install-pwa-settings, .pwa-install-btn')
      ).filter(function (el, idx, arr) { return arr.indexOf(el) === idx; });

      elInstallBtns.forEach(function (btn) {
        btn.addEventListener('click', handlePWAInstallClick);
      });

      // Show "Continuar Partida" if a valid in-progress save exists
      ensureControlsHelp();
      updatePWAInstallButtons();
      refreshContinueButton();
      syncSettingsInputs();
      applyAudioAndGraphicsSettings();

      // Title screen actions
      if (elBtnStartNew) {
        elBtnStartNew.addEventListener('click', function () {
          startNewGame();
        });
      }

      if (elBtnContinue) {
        elBtnContinue.addEventListener('click', function () {
          continueSavedGame();
        });
      }

      // Settings modal controls (live sync with SR.Audio and SR.App.applySettings)
      if (elOptVolume) {
        elOptVolume.addEventListener('input', function () {
          const val = Math.max(0, Math.min(1, Number(elOptVolume.value) / 100));
          if (SR.State && SR.State.data.settings) {
            SR.State.data.settings.volume = val;
            SR.State.save();
          }
          if (SR.Audio) SR.Audio.setVolume(val);
        });
      }

      if (elOptMute) {
        elOptMute.addEventListener('change', function () {
          const muted = !!elOptMute.checked;
          if (SR.State && SR.State.data.settings) {
            SR.State.data.settings.muted = muted;
            SR.State.save();
          }
          if (SR.Audio) SR.Audio.setMuted(muted);
        });
      }

      if (elOptBloom) {
        elOptBloom.addEventListener('change', function () {
          const bloom = !!elOptBloom.checked;
          if (SR.State && SR.State.data.settings) {
            SR.State.data.settings.bloom = bloom;
            SR.State.save();
          }
          if (SR.App && typeof SR.App.applySettings === 'function') {
            SR.App.applySettings();
          }
        });
      }

      if (elOptShadows) {
        elOptShadows.addEventListener('change', function () {
          const shadows = !!elOptShadows.checked;
          if (SR.State && SR.State.data.settings) {
            SR.State.data.settings.shadows = shadows;
            SR.State.save();
          }
          if (SR.App && typeof SR.App.applySettings === 'function') {
            SR.App.applySettings();
          }
        });
      }

      if (elBtnCloseSettings) {
        elBtnCloseSettings.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(0.9);
          Screens.closeSettings();
        });
      }

      if (elBtnResumeSettings) {
        elBtnResumeSettings.addEventListener('click', function () {
          if (SR.Audio) SR.Audio.playClick(1.0);
          Screens.closeSettings();
        });
      }

      if (elBtnRestartSettings) {
        elBtnRestartSettings.addEventListener('click', function () {
          Screens.restartGame();
        });
      }

      if (elSettingsModal) {
        elSettingsModal.addEventListener('click', function (e) {
          if (e.target === elSettingsModal) {
            Screens.closeSettings();
          }
        });
      }

      // Victory screen play again
      if (elBtnPlayAgain) {
        elBtnPlayAgain.addEventListener('click', function () {
          Screens.restartGame();
        });
      }

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && settingsOpenFlag) {
          Screens.closeSettings();
        }
      });

      if (SR.State) {
        SR.State.on('stateLoaded', function () {
          syncSettingsInputs();
          applyAudioAndGraphicsSettings();
        });
      }
    },

    openSettings: function () {
      if (!initialized) Screens.init();
      if (!elSettingsModal) return;
      if (SR.Audio) SR.Audio.playClick(1.05);
      syncSettingsInputs();
      elSettingsModal.classList.remove('hidden');
      settingsOpenFlag = true;
    },

    closeSettings: function () {
      if (!elSettingsModal) return;
      elSettingsModal.classList.add('hidden');
      settingsOpenFlag = false;
    },

    isSettingsOpen: function () {
      return settingsOpenFlag;
    },

    showVictory: function () {
      if (!initialized) Screens.init();
      closeAllModals();

      if (SR.State && SR.State.data) {
        SR.State.data.escaped = true;
        SR.State.save();
      }

      const elapsedSec = (SR.State && SR.State.data && SR.State.data.elapsedSeconds) || 0;
      const hintsUsed = (SR.State && SR.State.data && SR.State.data.hintsUsed) || 0;

      if (elStatTime) elStatTime.textContent = formatTime(elapsedSec);
      if (elStatHints) elStatHints.textContent = String(hintsUsed);
      if (elStatRank) elStatRank.textContent = computeRank(hintsUsed);

      if (SR.UI) {
        SR.UI.setTooltip(false);
        SR.UI.setCursor('');
        SR.UI.say('', 0);
        SR.UI.flash(false);
      }

      if (elVictoryScreen) {
        elVictoryScreen.classList.remove('hidden');
      }

      refreshContinueButton();
    },

    restartGame: function () {
      startNewGame();
    }
  };

  // Defensive self-bootstrap fallback: guarantees Title & Settings buttons always work
  // even if an earlier WebGL or script issue prevented SR.App from calling SR.Screens.init()
  window.addEventListener('load', function () {
    if (!initialized) {
      try { Screens.init(); } catch (e) {}
    }
    if (SR.UI && typeof SR.UI.init === 'function') {
      try { SR.UI.init(); } catch (e) {}
    }
  });

  SR.Screens = Screens;
})(window.SR = window.SR || {});
