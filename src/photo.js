import { $, ov, UI_ICONS } from './constants.js';
import { state } from './state.js';
import { tr } from './i18n.js';
import { cam } from './scene.js';
import { show } from './hud.js';
import { getReplayState, stopReplay } from './replay.js';
import { showMenu } from './game.js';

// ================= PHOTO MODE =================
export function togglePhoto() {
  if (state.phase === 'load') return;
  state.photoMode = !state.photoMode;
  state.aim = null;
  state.pmDrag = null;
  state.pmJoy = { active: false, x: 0, y: 0, id: null };
  const joy = $('pmJoy');
  const knob = $('pmJoyKnob');
  if (joy) joy.style.display = state.photoMode ? 'block' : 'none';
  if (knob) knob.style.transform = 'translate(0px, 0px)';
  document.body.classList.toggle('pm-active', state.photoMode);

  if (state.photoMode) {
    if (getReplayState().repIdx >= 0) {
      state.pmCam.pos.set(-2.2, 2.2, state.tg.z + 5.5);
      state.pmCam.pit = -0.08;
      state.pmCam.yaw = -0.38;
    } else {
      const eu = new THREE.Euler().setFromQuaternion(cam.quaternion, 'YXZ');
      state.pmCam.pos.copy(cam.position);
      state.pmCam.pit = Math.max(-0.35, Math.min(0.6, eu.x));
      state.pmCam.yaw = eu.y;
    }
    ov.classList.add('hide');
    ['hud', 'combo', 'hint', 'pb', 'ab', 'axesHud', 'fc', 'rp'].forEach(id => $(id).classList.add('hide'));
    $('pm').textContent = '✖';
    $('repBar').style.bottom = 'calc(118px + env(safe-area-inset-bottom,0px))';
  } else {
    if ($('repBar').style.display !== 'flex') stopReplay();
    ['hud', 'combo', 'hint', 'pb', 'ab', 'axesHud', 'fc', 'rp'].forEach(id => $(id).classList.remove('hide'));
    $('pm').innerHTML = UI_ICONS.photo;
    $('repBar').style.bottom = 'calc(66px + env(safe-area-inset-bottom,0px))';
    if (state.phase === 'menu') showMenu();
    else if (state.phase === 'pause') {
      show(tr('pauseTitle'), '', tr('resume'), () => {
        state.phase = 'play';
        ov.classList.add('hide');
      });
    }
  }
}

export function bindPhotoUI() {
  $('pm').onclick = togglePhoto;
}
