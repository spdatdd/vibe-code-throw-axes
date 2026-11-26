import { $, ov } from './constants.js';
import { state } from './state.js';
import { fit, updateAtmosphere } from './scene.js';
import { buildEnvironment, loadGLBs, setTargetModel, T } from './assets.js';
import { show, initComicIcons, updAxeBtn, updWeatherBtn } from './hud.js';
import { bindReplayUI, getReplayState, stepReplay } from './replay.js';
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
function loop() {
  const now = performance.now();
  const dt = Math.min(Math.max(0, (now - last) / 1000), 0.05);
  last = now;
  state.fdt = dt;
  updateAtmosphere(state.phase === 'pause' ? 0 : dt);
  const isReplaying = getReplayState().repIdx >= 0;
  if (!isReplaying && (!state.photoMode || state.autoThrow) && (state.phase === 'play' || state.phase === 'next' || state.phase === 'over')) {
    update(dt);
  } else {
    state.time += dt;
  }
  stepReplay(dt);
  render();
  requestAnimationFrame(loop);
}

T.position.set(0, 1.9, state.tg.z);
ov.classList.add('hide');
initComicIcons();
updAxeBtn();
updWeatherBtn();

const loadScreen = $('loadScreen');
const loadFill = $('loadBar').firstElementChild;
const loadTxt = $('loadTxt');

loadGLBs((done, total) => {
  const pct = Math.round((done / total) * 100);
  loadFill.style.width = pct + '%';
  loadTxt.textContent = `Đang tải mô hình 3D... ${pct}% (${done}/${total})`;
})
  .then(() => {
    buildEnvironment();
    buildHandModels();
    setTargetModel(1);
    loadScreen.classList.add('fade');
    setTimeout(() => loadScreen.classList.add('hide'), 350);
    showMenu();
    last = performance.now();
    requestAnimationFrame(loop);
  })
  .catch(err => {
    loadScreen.classList.add('hide');
    show(
      'Lỗi tải mô hình',
      'Không tải được file .glb trong thư mục assets/model/.\nHãy mở game qua local server (vd: python -m http.server hoặc npx serve) thay vì mở trực tiếp file://.',
      'Thử lại',
      () => location.reload()
    );
    console.error(err);
  });
