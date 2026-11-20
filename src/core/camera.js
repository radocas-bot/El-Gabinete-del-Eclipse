/* ==========================================================================
   src/core/camera.js — Panoramic Room Orbit, Cubic-Eased Focus Views &
   Mouse-Wheel FOV Zoom + Scroll-Back Exit
   ========================================================================== */
(function (SR) {
  'use strict';

  // Elevated, stepped-back room orbit so the central Orrery NEVER occludes
  // or steals clicks from wall stations while staying visible & clickable below
  const EYE_Y = 1.88;
  const ORBIT_RADIUS = 1.54;
  const ROOM_FOV = 54;
  const ROOM_MIN_FOV = 26;
  const MIN_PITCH = -30 * Math.PI / 180;
  const MAX_PITCH = 68 * Math.PI / 180;
  const TRANSITION_DURATION = 0.72;
  const WHEEL_EXIT_COOLDOWN_MS = 400;
  const PINCH_EXIT_COOLDOWN_MS = 450;
  const PINCH_EXIT_RATIO_THRESHOLD = 0.86; // ~14% inward shrink past baseFov

  let camera = null;
  const views = {};
  let currentView = 'room';
  let viewStack = [];

  // Panoramic room orientation (yaw=0 looks North -Z) + fluid touch inertia
  let yaw = 0;
  let targetYaw = 0;
  let pitch = 0.02;
  let targetPitch = 0.02;
  let yawVel = 0;
  let pitchVel = 0;

  // Smooth mouse-wheel & pinch FOV zoom offset (<= 0 means zoomed tighter than baseFov)
  let fovZoomOffset = 0;
  let targetFovZoomOffset = 0;
  let wheelExitCooldownUntil = 0;
  let pinchExitCooldownUntil = 0;
  let pinchOutRatio = 1.0;

  // Transition state
  let transitioning = false;
  let transT = 1;
  let transDuration = TRANSITION_DURATION;
  const fromPos = new THREE.Vector3();
  const ctrlPos = new THREE.Vector3();
  const toPos = new THREE.Vector3();
  const fromTarget = new THREE.Vector3();
  const toTarget = new THREE.Vector3();
  let fromFov = ROOM_FOV;
  let toFov = ROOM_FOV;

  // Current actual camera pose (synced for seamless spline transitions)
  const currentPos = new THREE.Vector3(0, EYE_Y, ORBIT_RADIUS);
  const currentTarget = new THREE.Vector3(0, EYE_Y, -3.5);
  let wasStarted = false;

  function toVec3(v) {
    if (!v) return new THREE.Vector3();
    if (v instanceof THREE.Vector3) return v.clone();
    if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
    return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
  }

  function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function unwrapAngle(current, desired) {
    let diff = (desired - current) % (Math.PI * 2);
    if (diff > Math.PI) diff -= Math.PI * 2;
    if (diff < -Math.PI) diff += Math.PI * 2;
    return current + diff;
  }

  function getBaseFov(viewId) {
    const id = viewId || currentView;
    if (id === 'room') return ROOM_FOV;
    const meta = views[id];
    return (meta && meta.fov) ? meta.fov : 50;
  }

  function computeRoomPose(yAng, pAng, outPos, outTarget) {
    const hx = Math.sin(yAng);
    const hz = -Math.cos(yAng);
    // Pull gently closer to center when pitching high up toward the celestial dome
    const pitchLift = Math.max(0, Math.sin(pAng));
    const r = ORBIT_RADIUS * (1 - 0.58 * pitchLift);

    outPos.set(-r * hx, EYE_Y, -r * hz);

    const cp = Math.cos(pAng);
    const sp = Math.sin(pAng);
    outTarget.set(
      outPos.x + hx * cp * 4.5,
      outPos.y + sp * 4.5,
      outPos.z + hz * cp * 4.5
    );
  }

  function applyPose(pos, target, fov) {
    if (!camera) return;
    currentPos.copy(pos);
    currentTarget.copy(target);
    camera.position.copy(pos);
    camera.lookAt(target);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  function computeBezierControl(p0, p1, outCtrl) {
    outCtrl.copy(p0).add(p1).multiplyScalar(0.5);
    const distCenter = Math.hypot(outCtrl.x, outCtrl.z);
    // Gently arc above the central Grand Orrery pedestal when gliding across the chamber
    if (distCenter < 1.2 && outCtrl.y < 1.76) {
      outCtrl.y = Math.max(outCtrl.y + 0.55, 2.02);
    }
    return outCtrl;
  }

  function registerView(viewId, cfg) {
    views[viewId] = {
      id: viewId,
      pos: cfg.pos ? toVec3(cfg.pos) : null,
      target: cfg.target ? toVec3(cfg.target) : null,
      fov: cfg.fov || 50,
      title: cfg.title || '',
      subtitle: cfg.subtitle || '',
      parent: cfg.parent !== undefined ? cfg.parent : (viewId === 'room' ? null : 'room'),
      zenithView: cfg.zenithView || null,
      perspectiveView: cfg.perspectiveView || null
    };
  }

  function init(cam) {
    camera = cam;

    registerView('room', {
      fov: ROOM_FOV,
      title: 'El Gabinete del Eclipse',
      subtitle: 'Arrastra para explorar 360° • Rueda del ratón para acercar • Clic en cualquier estación',
      parent: null
    });

    registerView('dome', {
      pos: [0, 1.85, 0.35],
      target: [0, 5.2, -0.05],
      fov: 58,
      title: 'Cúpula Celestial',
      subtitle: 'Siete estrellas doradas destacan en la bóveda nocturna',
      parent: 'room'
    });

    computeRoomPose(yaw, pitch, currentPos, currentTarget);
    applyPose(currentPos, currentTarget, ROOM_FOV);
  }

  function startTransition(destPos, destTarget, destFov, duration) {
    fromPos.copy(currentPos);
    fromTarget.copy(currentTarget);
    fromFov = camera ? camera.fov : ROOM_FOV;

    toPos.copy(destPos);
    toTarget.copy(destTarget);
    toFov = destFov;

    computeBezierControl(fromPos, toPos, ctrlPos);
    transT = 0;
    transDuration = duration || TRANSITION_DURATION;
    transitioning = true;
  }

  function goToView(viewId, pushStack, instant) {
    if (!views[viewId]) {
      console.warn('[SR.Camera] Unknown view:', viewId);
      return false;
    }

    const prevView = currentView;
    const meta = views[viewId];

    // Smoothly reset wheel/pinch FOV zoom offset & touch inertia on every view change
    targetFovZoomOffset = 0;
    fovZoomOffset = 0;
    pinchOutRatio = 1.0;
    yawVel = 0;
    pitchVel = 0;

    if (viewId === 'room') {
      viewStack = [];
      // Face the wall station we just left so exiting never snaps disorientingly away
      if (prevView !== 'room' && views[prevView] && views[prevView].target) {
        const prevT = views[prevView].target;
        const horizDist = Math.hypot(prevT.x, prevT.z);
        if (horizDist > 1.0) {
          const desiredYaw = Math.atan2(prevT.x, -prevT.z);
          targetYaw = unwrapAngle(yaw, desiredYaw);
          yaw = targetYaw;
        }
        targetPitch = 0.02;
        pitch = 0.02;
      }
    } else if (pushStack !== false && prevView !== viewId) {
      if (meta.parent === prevView) {
        viewStack.push(prevView);
      } else {
        viewStack = meta.parent ? [meta.parent] : ['room'];
      }
    }

    currentView = viewId;
    if (SR.State && SR.State.data) {
      SR.State.data.currentView = viewId;
      SR.State.data.viewStack = viewStack.slice();
    }

    const destPos = new THREE.Vector3();
    const destTarget = new THREE.Vector3();
    const destFov = getBaseFov(viewId);

    if (viewId === 'room') {
      computeRoomPose(targetYaw, targetPitch, destPos, destTarget);
    } else {
      destPos.copy(meta.pos);
      destTarget.copy(meta.target);
    }

    if (instant) {
      transitioning = false;
      transT = 1;
      applyPose(destPos, destTarget, destFov);
    } else {
      startTransition(destPos, destTarget, destFov, TRANSITION_DURATION);
    }

    if (SR.UI && typeof SR.UI.updateView === 'function') {
      SR.UI.updateView(viewId, meta);
    }
    if (SR.State && typeof SR.State.emit === 'function') {
      SR.State.emit('viewChanged', { viewId: viewId, meta: meta });
    }
    return true;
  }

  function goBack(instant) {
    if (currentView === 'room') return false;
    const meta = views[currentView];
    const parentId = (meta && meta.parent) ? meta.parent : 'room';
    return goToView(parentId, false, instant);
  }

  function onWheel(deltaY) {
    if (!deltaY || Math.abs(deltaY) < 0.01) return false;
    if (SR.State && SR.State.data && (!SR.State.data.started || SR.State.data.escaped)) return false;

    const now = performance.now();
    // Normalized smooth notch magnitude (1 standard mouse notch = ~100-120px -> ~5 degrees)
    const mag = Math.min(Math.abs(deltaY), 140) / 100;
    const stepDeg = Math.max(1.8, mag * 4.8);
    const baseFov = getBaseFov(currentView);

    if (currentView === 'room') {
      const minOffset = ROOM_MIN_FOV - ROOM_FOV; // -28°
      if (deltaY < 0) {
        // Wheel UP: zoom FOV in down to 26°
        targetFovZoomOffset = clamp(targetFovZoomOffset - stepDeg, minOffset, 0);
      } else {
        // Wheel DOWN: zoom FOV back out to 54°
        targetFovZoomOffset = clamp(targetFovZoomOffset + stepDeg, minOffset, 0);
      }
      return true;
    }

    // Zoomed station or sub-puzzle view
    const minFov = Math.max(22, baseFov - 16);
    const minOffset = minFov - baseFov; // negative

    if (deltaY < 0) {
      // Wheel UP: zoom tighter into fine details
      targetFovZoomOffset = clamp(targetFovZoomOffset - stepDeg, minOffset, 0);
      return true;
    }

    // Wheel DOWN (deltaY > 0)
    if (targetFovZoomOffset < -1.5 || fovZoomOffset < -1.5) {
      const next = clamp(targetFovZoomOffset + stepDeg, minOffset, 0);
      targetFovZoomOffset = next;
      // Add brief pause when returning to baseFov so a single flick stops cleanly before exiting
      if (next >= -1.5) {
        wheelExitCooldownUntil = Math.max(wheelExitCooldownUntil, now + 260);
      }
      return true;
    }

    // Already at baseFov (within 1.5°): scroll DOWN exits ONE zoom level cleanly
    if (now >= wheelExitCooldownUntil && !transitioning) {
      wheelExitCooldownUntil = now + WHEEL_EXIT_COOLDOWN_MS;
      if (SR.Audio && SR.Audio.playClick) {
        SR.Audio.playClick(0.85);
      }
      return goBack(false);
    }
    return false;
  }

  function onPinch(deltaScale) {
    if (!deltaScale || !isFinite(deltaScale) || deltaScale <= 0.01) return false;
    if (SR.State && SR.State.data && (!SR.State.data.started || SR.State.data.escaped)) return false;

    yawVel = 0;
    pitchVel = 0;

    const now = performance.now();
    const baseFov = getBaseFov(currentView);
    const minFov = currentView === 'room' ? ROOM_MIN_FOV : Math.max(22, baseFov - 16);
    const minOffset = minFov - baseFov; // negative
    const fovDelta = -Math.log(deltaScale) * 52; // spread (>1) -> negative (zoom in); pinch (<1) -> positive (zoom out)

    if (deltaScale > 1.0) {
      // Spreading fingers: zoom FOV closer
      pinchOutRatio = 1.0;
      targetFovZoomOffset = clamp(targetFovZoomOffset + fovDelta, minOffset, 0);
      return true;
    }

    if (deltaScale < 1.0) {
      if (currentView === 'room') {
        targetFovZoomOffset = clamp(targetFovZoomOffset + fovDelta, minOffset, 0);
        return true;
      }

      // Zoomed station or sub-puzzle view
      if (targetFovZoomOffset < -1.5 || fovZoomOffset < -1.5) {
        const next = clamp(targetFovZoomOffset + fovDelta, minOffset, 0);
        targetFovZoomOffset = next;
        pinchOutRatio = 1.0;
        if (next >= -1.5) {
          pinchExitCooldownUntil = Math.max(pinchExitCooldownUntil, now + 200);
        }
        return true;
      }

      // Already at baseFov (within 1.5°): accumulate inward pinch ratio and exit past ~14% shrink
      pinchOutRatio *= deltaScale;
      if (pinchOutRatio <= PINCH_EXIT_RATIO_THRESHOLD && now >= pinchExitCooldownUntil && !transitioning) {
        pinchExitCooldownUntil = now + PINCH_EXIT_COOLDOWN_MS;
        pinchOutRatio = 1.0;
        if (SR.Audio && SR.Audio.playClick) {
          SR.Audio.playClick(0.85);
        }
        return goBack(false);
      }
      return true;
    }
    return false;
  }

  function onPinchEnd() {
    pinchOutRatio = 1.0;
  }

  function stopInertia() {
    yawVel = 0;
    pitchVel = 0;
  }

  function fling(vxPxPerSec, vyPxPerSec) {
    if (currentView !== 'room') return;
    if (SR.State && SR.State.data && (!SR.State.data.started || SR.State.data.escaped)) return;
    if (transitioning) {
      if (transT < 0.4) return;
      transitioning = false;
      transT = 1;
    }
    const zoomScale = (ROOM_FOV + fovZoomOffset) / ROOM_FOV;
    yawVel = clamp(-(vxPxPerSec || 0) * 0.0044 * zoomScale, -5.2, 5.2);
    pitchVel = clamp((vyPxPerSec || 0) * 0.0034 * zoomScale, -2.8, 2.8);
  }

  function panBy(dx, dy) {
    if (currentView !== 'room') return;
    if (SR.State && SR.State.data && (!SR.State.data.started || SR.State.data.escaped)) return;
    yawVel = 0;
    pitchVel = 0;
    if (transitioning) {
      if (transT < 0.4) return;
      transitioning = false;
      transT = 1;
    }
    // Scale pan speed slightly when zoomed in so fine aiming feels silky
    const zoomScale = (ROOM_FOV + fovZoomOffset) / ROOM_FOV;
    targetYaw -= dx * 0.0046 * zoomScale;
    targetPitch = clamp(targetPitch + dy * 0.0036 * zoomScale, MIN_PITCH, MAX_PITCH);
  }

  function turnBy(deltaRad) {
    if (currentView !== 'room') return;
    yawVel = 0;
    pitchVel = 0;
    targetYaw += deltaRad;
  }

  function setRoomAngle(angleDeg, pitchDeg, instant) {
    const yRad = (angleDeg || 0) * Math.PI / 180;
    const pRad = clamp((pitchDeg !== undefined ? pitchDeg : 2) * Math.PI / 180, MIN_PITCH, MAX_PITCH);
    yawVel = 0;
    pitchVel = 0;
    targetYaw = yRad;
    targetPitch = pRad;
    if (instant) {
      yaw = yRad;
      pitch = pRad;
      transitioning = false;
      transT = 1;
      if (SR.State && SR.State.data && SR.State.data.started) {
        wasStarted = true;
      }
      if (currentView === 'room') {
        const p = new THREE.Vector3();
        const t = new THREE.Vector3();
        computeRoomPose(yaw, pitch, p, t);
        applyPose(p, t, ROOM_FOV + fovZoomOffset);
      }
    }
  }

  function update(dt, elapsed) {
    if (!camera) return;
    const safeDt = Math.min(dt || 0.016, 0.1);
    const started = !!(SR.State && SR.State.data && SR.State.data.started);

    // Cinematic slow showcase orbit while on Title Screen
    if (!started) {
      wasStarted = false;
      const angle = (elapsed || 0) * 0.12;
      const orbitR = 2.90;
      const pos = new THREE.Vector3(
        Math.sin(angle) * orbitR,
        2.10 + Math.sin((elapsed || 0) * 0.32) * 0.12,
        Math.cos(angle) * orbitR
      );
      const tgt = new THREE.Vector3(0, 1.48, 0);
      applyPose(pos, tgt, 52);
      return;
    }

    // Smooth cinematic glide when transitioning from Title Screen into gameplay
    if (!wasStarted && started) {
      wasStarted = true;
      if (currentView === 'room' && !transitioning) {
        const destP = new THREE.Vector3();
        const destT = new THREE.Vector3();
        computeRoomPose(targetYaw, targetPitch, destP, destT);
        startTransition(destP, destT, ROOM_FOV, 1.0);
      }
    }

    // Smoothly damp wheel FOV zoom offset
    const fovDamp = 1 - Math.exp(-12 * safeDt);
    fovZoomOffset += (targetFovZoomOffset - fovZoomOffset) * fovDamp;
    if (Math.abs(targetFovZoomOffset - fovZoomOffset) < 0.02) {
      fovZoomOffset = targetFovZoomOffset;
    }

    if (transitioning) {
      transT += safeDt / transDuration;
      if (transT >= 1) {
        transT = 1;
        transitioning = false;
        applyPose(toPos, toTarget, toFov + fovZoomOffset);
      } else {
        const e = easeInOutCubic(transT);
        const inv = 1 - e;
        const pos = new THREE.Vector3(
          inv * inv * fromPos.x + 2 * inv * e * ctrlPos.x + e * e * toPos.x,
          inv * inv * fromPos.y + 2 * inv * e * ctrlPos.y + e * e * toPos.y,
          inv * inv * fromPos.z + 2 * inv * e * ctrlPos.z + e * e * toPos.z
        );
        const tgt = new THREE.Vector3().lerpVectors(fromTarget, toTarget, e);
        const fov = fromFov + (toFov - fromFov) * e + fovZoomOffset;
        applyPose(pos, tgt, fov);
      }
      return;
    }

    if (currentView === 'room') {
      // Apply fluid exponential-damped angular inertia from touch flings
      if (Math.abs(yawVel) > 0.002 || Math.abs(pitchVel) > 0.002) {
        targetYaw += yawVel * safeDt;
        const nextPitch = targetPitch + pitchVel * safeDt;
        if (nextPitch < MIN_PITCH || nextPitch > MAX_PITCH) {
          targetPitch = clamp(nextPitch, MIN_PITCH, MAX_PITCH);
          pitchVel = 0;
        } else {
          targetPitch = nextPitch;
        }
        yawVel *= Math.exp(-5.0 * safeDt);
        pitchVel *= Math.exp(-6.2 * safeDt);
        if (Math.abs(yawVel) < 0.002) yawVel = 0;
        if (Math.abs(pitchVel) < 0.002) pitchVel = 0;
      }

      const damp = 1 - Math.exp(-11 * safeDt);
      yaw += (targetYaw - yaw) * damp;
      pitch += (targetPitch - pitch) * damp;
      const pos = new THREE.Vector3();
      const tgt = new THREE.Vector3();
      computeRoomPose(yaw, pitch, pos, tgt);
      applyPose(pos, tgt, ROOM_FOV + fovZoomOffset);
    } else if (views[currentView]) {
      const meta = views[currentView];
      applyPose(meta.pos, meta.target, meta.fov + fovZoomOffset);
    }
  }

  SR.Camera = {
    init: init,
    registerView: registerView,
    goToView: goToView,
    goBack: goBack,
    onWheel: onWheel,
    onPinch: onPinch,
    onPinchEnd: onPinchEnd,
    fling: fling,
    stopInertia: stopInertia,
    panBy: panBy,
    turnBy: turnBy,
    setRoomAngle: setRoomAngle,
    update: update,
    getCurrentView: function () { return currentView; },
    getViewMeta: function (id) { return views[id || currentView] || null; },
    listViews: function () {
      const out = {};
      Object.keys(views).forEach(function (k) {
        const v = views[k];
        out[k] = {
          pos: v.pos ? v.pos.toArray().map(function (n) { return +n.toFixed(3); }) : null,
          target: v.target ? v.target.toArray().map(function (n) { return +n.toFixed(3); }) : null,
          fov: v.fov,
          parent: v.parent,
          zenithView: v.zenithView || null,
          perspectiveView: v.perspectiveView || null
        };
      });
      return out;
    },
    isTransitioning: function () { return transitioning; },
    getDebugInfo: function () {
      return {
        view: currentView,
        pos: currentPos.toArray().map(function (n) { return +n.toFixed(3); }),
        target: currentTarget.toArray().map(function (n) { return +n.toFixed(3); }),
        fov: camera ? +camera.fov.toFixed(2) : ROOM_FOV,
        baseFov: getBaseFov(currentView),
        fovOffset: +fovZoomOffset.toFixed(2),
        targetFovOffset: +targetFovZoomOffset.toFixed(2),
        yawDeg: +(yaw * 180 / Math.PI).toFixed(1),
        pitchDeg: +(pitch * 180 / Math.PI).toFixed(1),
        yawVel: +yawVel.toFixed(3),
        pitchVel: +pitchVel.toFixed(3)
      };
    }
  };
})(window.SR = window.SR || {});
