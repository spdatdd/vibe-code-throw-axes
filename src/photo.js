import { $, ov } from './constants.js';
import { state } from './state.js';
import { R, scene, cam } from './scene.js';
import { show } from './hud.js';
import { applyReplay, getReplayState, setReplayPlay, stopReplay } from './replay.js';
import { showMenu } from './game.js';

// ================= PHOTO MODE =================
export function togglePhoto() {
  if (state.phase === 'load') return;
  state.photoMode = !state.photoMode;
  state.aim = null;
  state.pmDrag = null;

  if (state.photoMode) {
    const { lastRec, repIdx } = getReplayState();
    if (lastRec) {
      if (repIdx < 0 || repIdx >= lastRec.frames.length - 1) applyReplay(0);
      setReplayPlay(true);
    }
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
    ['hud', 'combo', 'hint', 'pb', 'ab', 'fc', 'rp'].forEach(id => $(id).classList.add('hide'));
    $('pmBar').style.display = 'flex';
    $('pm').textContent = '✖ Thoát';
    $('repBar').style.bottom = 'calc(74px + env(safe-area-inset-bottom,0px))';
  } else {
    if ($('repBar').style.display !== 'flex') stopReplay();
    ['hud', 'combo', 'hint', 'pb', 'ab', 'fc', 'rp'].forEach(id => $(id).classList.remove('hide'));
    $('pmBar').style.display = 'none';
    $('pm').textContent = '📷 Photo';
    $('repBar').style.bottom = 'calc(16px + env(safe-area-inset-bottom,0px))';
    if (state.phase === 'menu') showMenu();
    else if (state.phase === 'pause') {
      show('Tạm dừng', '', 'Tiếp tục', () => {
        state.phase = 'play';
        ov.classList.add('hide');
      });
    }
  }
}

export function bindPhotoUI() {
  $('pm').onclick = togglePhoto;
  $('snap').onclick = () => {
    R.render(scene, cam);
    const a = document.createElement('a');
    a.download = 'nem-riu-3d.png';
    a.href = R.domElement.toDataURL('image/png');
    a.click();
  };
}
