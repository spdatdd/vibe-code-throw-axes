import { $, ov, AXES } from './constants.js';
import { state, addScore } from './state.js';
import { scene, cam } from './scene.js';
import { setTargetModel, T, TR, standGrp } from './assets.js';
import { canAim, show, updHUD } from './hud.js';
import { clearLastRec, finishRec, pushRecFrame, stopReplay } from './replay.js';
import { autoFire, launch, stepAxe, stepChips } from './physics.js';
import { shiftTrailPoint } from './render.js';

// ================= ĐIỀU KHIỂN MÀN CHƠI =================
export function clearStuck() {
  for (const s of state.stuck) TR.remove(s.piv || s.m);
  state.stuck = [];
  for (const m of state.missed) scene.remove(m);
  state.missed = [];
}

export function startLevel(n) {
  state.lvl = n;
  state.lvlScore = 0;
  state.axesLeft = AXES;
  state.streak = 0;
  if (state.cur) {
    scene.remove(state.cur.g);
    state.cur = null;
  }
  clearStuck();
  state.aim = null;
  stopReplay();
  clearLastRec();
  $('repBar').style.display = 'none';
  $('rp').style.display = 'none';

  setTargetModel(n);
  state.goal = 120 + 70 * (n - 1);
  state.tg.z = -Math.min(12 + 3 * n, 32);
  state.tg.t = 0;
  TR.rotation.z = 0;
  state.tg.rs = n < 2 ? 0 : (0.5 + 0.35 * (n - 2)) * (n % 2 ? 1 : -1);
  state.tg.amp = n < 3 ? 0 : Math.min(0.4 * (n - 2), 1.4);
  state.tg.ampX = n < 4 ? 0 : Math.min(0.5 * (n - 3), 2);
  state.settle = 0;
  state.phase = 'play';
  ov.classList.add('hide');
  updHUD();
}

export function showMenu() {
  state.phase = 'menu';
  show(
    'NÉM RÌU 3D',
    'Nhấn giữ để tích lực ném (thanh trái).\nKéo lên/xuống để chỉnh độ cao (thanh xanh), kéo ngang để xoay hướng.\nThả tay để phóng. Rìu chỉ cắm khi lưỡi hướng vào bia!',
    'Bắt đầu',
    () => { state.score = 0; startLevel(2); }
  );
}

export function togglePause() {
  if (state.phase === 'play') {
    state.phase = 'pause';
    state.aim = null;
    show(
      'Tạm dừng',
      '',
      'Tiếp tục',
      () => { state.phase = 'play'; ov.classList.add('hide'); },
      'Chơi lại',
      () => { state.score = 0; startLevel(2); }
    );
  } else if (state.phase === 'pause') {
    state.phase = 'play';
    ov.classList.add('hide');
  }
}

export function resolve() {
  if (state.lvlScore >= state.goal) {
    stopReplay();
    $('repBar').style.display = 'none';
    state.phase = 'next';
    const b = state.axesLeft * 20;
    if (b) addScore(b);
    show(
      'Qua màn ' + state.lvl + '!',
      'Điểm màn: ' + state.lvlScore + '/' + state.goal + (b ? '\nThưởng rìu thừa: +' + b : '') + '\nTổng điểm: ' + state.score,
      'Màn ' + (state.lvl + 1),
      () => startLevel(state.lvl + 1)
    );
  } else if (state.axesLeft <= 0) {
    stopReplay();
    $('repBar').style.display = 'none';
    state.phase = 'over';
    show(
      'Hết rìu!',
      'Màn ' + state.lvl + ': ' + state.lvlScore + '/' + state.goal + ' điểm\nTổng điểm: ' + state.score +
      (state.score >= state.best && state.score > 0 ? '  (Kỷ lục mới!)' : '\nKỷ lục: ' + state.best),
      'Chơi lại',
      () => { state.score = 0; startLevel(2); }
    );
  }
}

export function update(dt) {
  const slow = state.followCam && state.cur && state.cur.mode === 'fly' ? 0.42 : 1;
  const sdt = dt * slow;
  state.time += dt;
  state.tg.t += sdt;
  TR.rotation.z += state.tg.rs * sdt;
  T.position.set(
    Math.sin(state.tg.t * 0.8) * state.tg.ampX,
    1.9 + Math.sin(state.tg.t * 1.1) * state.tg.amp,
    state.tg.z
  );
  standGrp.position.set(T.position.x, 0, state.tg.z - 0.32);
  standGrp.scale.y = T.position.y / 1.9;

  if (state.aim) state.aim.hold += dt;

  if (state.thr) {
    state.thr.t += dt;
    if (!state.thr.launched && state.thr.t >= state.thr.rel) {
      state.thr.launched = true;
      launch(state.thr.dx, state.thr.dy, state.thr.hold, state.thr.typeKey);
      cam.fov = 63;
      state.shake = Math.max(state.shake, 0.35);
    }
    if (state.thr.t >= state.thr.dur) state.thr = null;
  }

  if (state.cur) {
    stepAxe(sdt);
    if (state.cur) pushRecFrame(state.cur, sdt);
    else finishRec();
  } else {
    shiftTrailPoint();
  }

  stepChips(dt);
  state.shake = Math.max(0, state.shake - dt * 3);

  if (state.phase === 'play' && !state.cur && state.settle > 0) {
    state.settle -= dt;
    if (state.settle <= 0) resolve();
  }

  if (state.autoThrow && canAim()) autoFire();
}
