import { state } from './state.js';
import { fit, updateAtmosphere } from './scene.js';
import { buildEnvironment, loadGLBs, setTargetModel, T } from './assets.js';
import { show } from './hud.js';
import { bindReplayUI, stepReplay } from './replay.js';
import { bindPhotoUI } from './photo.js';
import { bindInputs } from './input.js';
import { showMenu, update } from './game.js';
import { buildHandModels, render } from './render.js';

// ================= KHỞI ĐỘNG & VÒNG LẶP CHÍNH =================
addEventListener('resize', fit);
fit();

bindInputs();
bindPhotoUI();
bindReplayUI();

let last = performance.now();
function loop(t) {
  const dt = Math.min((t - last) / 1000 || 0, 0.033);
  last = t;
  state.fdt = dt;
  updateAtmosphere(dt);
  if ((!state.photoMode || state.autoThrow) && (state.phase === 'play' || state.phase === 'next' || state.phase === 'over')) {
    update(dt);
  }
  stepReplay(dt);
  render();
  requestAnimationFrame(loop);
}

T.position.set(0, 1.9, state.tg.z);
show('NÉM RÌU 3D', 'Đang tải các mô hình 3D...', '', () => {});

loadGLBs()
  .then(() => {
    buildEnvironment();
    buildHandModels();
    setTargetModel(2);
    showMenu();
    requestAnimationFrame(loop);
  })
  .catch(err => {
    show(
      'Lỗi tải mô hình',
      'Không tải được file .glb trong thư mục assets/.\nHãy mở game qua local server (vd: python -m http.server hoặc npx serve) thay vì mở trực tiếp file://.',
      'Thử lại',
      () => location.reload()
    );
    console.error(err);
  });
