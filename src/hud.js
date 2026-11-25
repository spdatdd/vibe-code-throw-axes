import { $, ov, AXES, TIME_MODES } from './constants.js';
import { state } from './state.js';
import { initAudio } from './audio.js';
import { cam } from './scene.js';

export const canAim = () =>
  (!state.photoMode || state.autoThrow) &&
  state.phase === 'play' &&
  !state.cur &&
  !state.thr &&
  state.settle <= 0 &&
  state.axesLeft > 0;

export function show(title, text, btn, fn, btn2, fn2) {
  ov.innerHTML = '';
  const h = document.createElement('h1');
  const p = document.createElement('p');
  h.textContent = title;
  p.textContent = text;
  ov.append(h, p);
  if (btn) {
    const b = document.createElement('button');
    b.textContent = btn;
    b.onclick = () => { initAudio(); fn(); };
    ov.append(b);
  }
  if (btn2) {
    const b2 = document.createElement('button');
    b2.textContent = btn2;
    b2.style.background = '#5a3a1c';
    b2.onclick = () => { initAudio(); fn2(); };
    ov.append(b2);
  }
  ov.classList.remove('hide');
}

export function updHUD() {
  $('hud').innerHTML =
    '<b>Màn ' + state.lvl + '</b><br>Mục tiêu: ' + state.lvlScore + '/' + state.goal +
    '<br>Điểm: ' + state.score + '  ·  Kỷ lục: ' + state.best + '<br>' +
    (state.autoThrow ? '🪓 ∞' : '🪓'.repeat(Math.max(state.axesLeft, 0)));
  $('hint').textContent =
    state.lvl === 1 && state.phase === 'play' && state.axesLeft === AXES && !state.aim
      ? 'Nhấn giữ để tích sức ném, thả tay để ném'
      : '';
}

export function pop(s, p, c, sz) {
  const v = p.clone().project(cam);
  const d = document.createElement('div');
  d.className = 'pop';
  d.textContent = s;
  d.style.cssText += `left:${(v.x * 0.5 + 0.5) * innerWidth}px;top:${(-v.y * 0.5 + 0.5) * innerHeight}px;color:${c};font-size:${sz}px`;
  document.body.append(d);
  setTimeout(() => d.remove(), 1250);
}

export function toggleTime() {
  state.tmIdx = (state.tmIdx + 1) % TIME_MODES.length;
  $('tm').textContent = TIME_MODES[state.tmIdx].t;
}

export function toggleFollow() {
  state.followCam = !state.followCam;
  $('fc').textContent = '🎥 Theo rìu: ' + (state.followCam ? 'Bật' : 'Tắt');
}

export function toggleAuto() {
  state.autoThrow = !state.autoThrow;
  $('at').textContent = '🤖 Tự ném: ' + (state.autoThrow ? 'Bật' : 'Tắt');
  updHUD();
}
