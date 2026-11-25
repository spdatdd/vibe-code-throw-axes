import { $, AXE_TYPES } from './constants.js';
import { state } from './state.js';
import { initAudio } from './audio.js';
import { R } from './scene.js';
import { ASSETS } from './assets.js';
import { canAim, toggleAuto, toggleFollow, toggleTime, updHUD } from './hud.js';
import { stopReplay } from './replay.js';
import { togglePhoto } from './photo.js';
import { startThrow } from './physics.js';
import { togglePause } from './game.js';
import { refreshReadyAxe } from './render.js';

// ================= NHẬP LIỆU & NÚT BẤM =================
export function bindInputs() {
  $('pb').onclick = togglePause;
  $('ab').onclick = () => {
    if (!ASSETS.axe) return;
    state.axeIdx = (state.axeIdx + 1) % AXE_TYPES.length;
    $('ab').textContent = AXE_TYPES[state.axeIdx].label;
    refreshReadyAxe();
  };
  $('tm').onclick = toggleTime;
  $('fc').onclick = toggleFollow;
  $('at').onclick = toggleAuto;

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    state.keys[k] = true;
    if (k === 'c') { togglePhoto(); return; }
    if (k === 't') { toggleTime(); return; }
    if (k === 'f') { toggleFollow(); return; }
    if (k === 'g') { toggleAuto(); return; }
    if (e.key === 'Escape' && state.photoMode) { togglePhoto(); return; }
    if (!state.photoMode && (k === 'p' || e.key === 'Escape' || e.code === 'Space')) togglePause();
  });

  addEventListener('keyup', e => {
    state.keys[e.key.toLowerCase()] = false;
  });

  const cvs = R.domElement;

  cvs.addEventListener('pointerdown', e => {
    if (state.photoMode) {
      state.pmDrag = { x: e.clientX, y: e.clientY };
      cvs.setPointerCapture(e.pointerId);
      return;
    }
    stopReplay();
    initAudio();
    if (!canAim()) return;
    state.aim = { sx: e.clientX, sy: e.clientY, dx: 0, dy: 0, hold: 0 };
    cvs.setPointerCapture(e.pointerId);
    updHUD();
  });

  cvs.addEventListener('pointermove', e => {
    if (state.photoMode && state.pmDrag) {
      state.pmCam.yaw -= (e.clientX - state.pmDrag.x) * 0.004;
      state.pmCam.pit = Math.max(-1.45, Math.min(1.45, state.pmCam.pit - (e.clientY - state.pmDrag.y) * 0.004));
      state.pmDrag.x = e.clientX;
      state.pmDrag.y = e.clientY;
      return;
    }
    if (state.aim) {
      state.aim.dx = e.clientX - state.aim.sx;
      state.aim.dy = e.clientY - state.aim.sy;
    }
  });

  cvs.addEventListener('pointerup', () => {
    if (state.photoMode) {
      state.pmDrag = null;
      return;
    }
    if (!state.aim) return;
    const { dx, dy, hold } = state.aim;
    state.aim = null;
    if ((hold >= 0.08 || Math.hypot(dx, dy) > 14) && canAim()) startThrow(dx, dy, hold);
  });

  cvs.addEventListener('pointercancel', () => {
    state.aim = null;
    state.pmDrag = null;
  });

  cvs.addEventListener('wheel', e => {
    if (!state.photoMode) return;
    e.preventDefault();
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(state.pmCam.pit, state.pmCam.yaw, 0, 'YXZ'));
    state.pmCam.pos.addScaledVector(fwd, -e.deltaY * 0.01);
  }, { passive: false });
}
