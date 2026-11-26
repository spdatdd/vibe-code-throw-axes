import { $, AXE_TYPES } from './constants.js';
import { state } from './state.js';
import { initAudio } from './audio.js';
import { R } from './scene.js';
import { ASSETS } from './assets.js';
import { canAim, setTargetDist, syncPhysUI, toggleAuto, toggleFollow, toggleHitbox, toggleTime, toggleWeather, updAxeBtn, updHUD } from './hud.js';
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
    updAxeBtn();
    refreshReadyAxe();
  };
  $('tm').onclick = toggleTime;
  $('wt').onclick = toggleWeather;
  $('fc').onclick = toggleFollow;
  $('at').onclick = toggleAuto;
  $('hb').onclick = toggleHitbox;
  $('dDec').onclick = () => setTargetDist(-state.tg.z - 1);
  $('dInc').onclick = () => setTargetDist(-state.tg.z + 1);
  $('distRng').oninput = e => setTargetDist(+e.target.value);
  $('gravRng').oninput = e => { state.phys.grav = +e.target.value; syncPhysUI(); };
  $('dragRng').oninput = e => { state.phys.drag = +e.target.value; syncPhysUI(); };
  $('inerRng').oninput = e => { state.phys.inertia = +e.target.value; syncPhysUI(); };

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    state.keys[k] = true;
    if (k === 'c') { togglePhoto(); return; }
    if (k === 't') { toggleTime(); return; }
    if (k === 'v') { toggleWeather(); return; }
    if (k === 'f') { toggleFollow(); return; }
    if (k === 'g' && state.devMode) { toggleAuto(); return; }
    if (k === 'h' && state.devMode) { toggleHitbox(); return; }
    if (e.key === 'Escape' && state.photoMode) { togglePhoto(); return; }
    if (!state.photoMode && (k === 'p' || e.key === 'Escape' || e.code === 'Space')) togglePause();
  });

  addEventListener('keyup', e => {
    state.keys[e.key.toLowerCase()] = false;
  });

  const joy = $('pmJoy');
  const knob = $('pmJoyKnob');
  if (joy && knob) {
    const JOY_R = 34;
    const updJoy = e => {
      const rect = joy.getBoundingClientRect();
      const cx = rect.left + rect.width * 0.5;
      const cy = rect.top + rect.height * 0.5;
      let dx = e.clientX - cx;
      let dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > JOY_R) {
        dx = (dx / d) * JOY_R;
        dy = (dy / d) * JOY_R;
      }
      state.pmJoy.x = dx / JOY_R;
      state.pmJoy.y = -dy / JOY_R;
      knob.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    };
    const resetJoy = () => {
      state.pmJoy.active = false;
      state.pmJoy.x = 0;
      state.pmJoy.y = 0;
      state.pmJoy.id = null;
      knob.style.transform = 'translate(0px, 0px)';
    };
    joy.addEventListener('pointerdown', e => {
      if (!state.photoMode) return;
      e.stopPropagation();
      state.pmJoy.active = true;
      state.pmJoy.id = e.pointerId;
      joy.setPointerCapture(e.pointerId);
      updJoy(e);
    });
    joy.addEventListener('pointermove', e => {
      if (!state.pmJoy.active || e.pointerId !== state.pmJoy.id) return;
      e.stopPropagation();
      updJoy(e);
    });
    joy.addEventListener('pointerup', e => {
      if (e.pointerId !== state.pmJoy.id) return;
      e.stopPropagation();
      resetJoy();
    });
    joy.addEventListener('pointercancel', resetJoy);
  }

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
