import { $, ov, AXES, AXE_TYPES, GRAPHICS_MODES, TR_R, TIME_MODES, WEATHER_MODES } from './constants.js';
import { state, addScore, cycleGfx, toggleLang } from './state.js';
import { tr } from './i18n.js';
import { applyGraphics, scene, cam } from './scene.js';
import { setTargetModel, setTargetRail, T, TR, tgShakeFx, standGrp, standPost, cartWheels } from './assets.js';
import { applyDevMode, canAim, show, toggleFollow, toggleTime, toggleWeather, updAxeBtn, updHUD } from './hud.js';
import { togglePhoto } from './photo.js';
import { clearLastRec, finishRec, pushRecFrame, stopReplay } from './replay.js';
import { autoFire, launch, stepAxe, stepChips } from './physics.js';
import { refreshReadyAxe, shiftTrailPoint } from './render.js';

const MAX_LEVEL = 10;
const levelGoal = n => 100 + 50 * (n - 1);

// ================= ĐIỀU KHIỂN MÀN CHƠI =================
export function clearStuck() {
  for (const s of state.stuck) TR.remove(s.piv || s.m);
  state.stuck = [];
  for (const m of state.missed) scene.remove(m);
  state.missed = [];
}

export function startLevel(n) {
  state.hasPlayed = true;
  if (n === 1 && state.gameMode === 'challenge') {
    state.score = 0;
    state.challengeValid = !state.autoThrow;
  }
  if (state.gameMode !== 'challenge') state.challengeValid = false;
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
  state.goal = levelGoal(n);
  state.tg.z = n === 2 ? -(18.9 + state.targetFrontZ) : -Math.min(12 + 3 * n, 32);
  state.tg.t = 0;
  TR.rotation.z = 0;
  state.tg.rs = n < 2 ? 0 : (0.5 + 0.35 * (n - 2)) * (n % 2 ? 1 : -1);
  state.tg.amp = n < 3 ? 0 : Math.min(0.4 * (n - 2), 1.4);
  state.tg.ampX = n < 4 ? 0 : Math.min(0.5 * (n - 3), 2);
  setTargetRail(state.tg.ampX, state.tg.z);
  const rng = $('distRng');
  if (rng) rng.value = Math.round(-state.tg.z * 10) / 10;
  state.tgRecoil = 0;
  state.tgWobble.amp = 0;
  state.tgWobble.t = 0;
  T.rotation.set(0, 0, 0);
  standPost.rotation.set(0, 0, 0);
  tgShakeFx.visible = false;
  state.lastSpin = '';
  state.settle = 0;
  const pi = $('pow')?.firstElementChild;
  const ei = $('elv')?.firstElementChild;
  if (pi) pi.style.height = '0%';
  if (ei) ei.style.height = '0%';
  state.phase = 'play';
  ov.classList.add('hide');
  updHUD();
}

function levelTag(n) {
  const dist = Math.min(12 + 3 * n, 32);
  if (n === 1) return `${dist}m · ${tr('tagStatic')}`;
  if (n === 2) return `${dist}m · ${tr('tagSpin')}`;
  if (n === 3) return `${dist}m · ${tr('tagSpinV')}`;
  return `${dist}m · ${tr('tagRail')}`;
}

function restartCurrentMode() {
  state.score = 0;
  startLevel(state.gameMode === 'challenge' ? 1 : state.lvl);
}

export function showLevelSelect(onBack = showMenu) {
  state.phase = 'menu';
  state.gameMode = 'practice';
  ov.innerHTML = '';
  const h = document.createElement('h1');
  h.textContent = tr('practiceTitle');
  const p = document.createElement('p');
  p.textContent = tr('practiceSub');

  const grid = document.createElement('div');
  grid.className = 'lvl-grid';
  for (let n = 1; n <= MAX_LEVEL; n++) {
    const b = document.createElement('button');
    b.className = 'lvl-btn' + (n === state.lvl ? ' cur' : '');
    const goal = levelGoal(n);
    b.innerHTML = `<b>${tr('level')} ${n}</b><span>${levelTag(n)}</span><small>🎯 ${goal}</small>`;
    b.onclick = () => {
      state.gameMode = 'practice';
      state.score = 0;
      startLevel(n);
    };
    grid.append(b);
  }

  const back = document.createElement('button');
  back.textContent = tr('back');
  back.style.background = '#5a3a1c';
  back.onclick = onBack;

  ov.append(h, p, grid, back);
  ov.classList.remove('hide');
}

export function showMenu() {
  state.phase = 'menu';
  document.title = tr('docTitle');
  applyDevMode();
  const axeLabel = () => {
    const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
    const prefix = tr('axeTypePrefix').replace(/^[^\p{L}\p{N}]+/u, '');
    const name = tr('axe_' + cfg.key).replace(/^[^\p{L}\p{N}]+/u, '');
    return `<span class="menu-ico">${cfg.iconHtml}</span><span>${prefix}${name}</span>`;
  };
  const axeBtn = {
    html: axeLabel(),
    bg: '#b45309',
    fn: btn => {
      state.axeIdx = (state.axeIdx + 1) % AXE_TYPES.length;
      updAxeBtn();
      refreshReadyAxe();
      btn.innerHTML = axeLabel();
    }
  };
  const settingsBtn = { text: tr('settings'), bg: '#0f766e', fn: () => showSettings(showMenu) };
  const extra = state.hasPlayed
    ? [axeBtn, settingsBtn, { text: tr('playAgain'), bg: '#0284c7', fn: restartCurrentMode }]
    : [axeBtn, settingsBtn];
  show(
    tr('gameTitle'),
    '',
    tr('challengeBtn'),
    () => { state.gameMode = 'challenge'; state.score = 0; startLevel(1); },
    tr('practiceBtn'),
    () => showLevelSelect(showMenu),
    true,
    extra
  );
}

function showSettings(onBack = () => { state.phase = 'play'; togglePause(); }) {
  const wtObj = () => WEATHER_MODES[state.wtIdx] || WEATHER_MODES[0];
  const tmObj = () => TIME_MODES[state.tmIdx] || TIME_MODES[0];
  const gfxObj = () => GRAPHICS_MODES[state.gfxIdx] || GRAPHICS_MODES[1];
  const wtText = () => `${wtObj().icon} ${tr('weatherLabel')}${tr('wt_' + wtObj().k)}`;
  const tmText = () => `${tmObj().icon} ${tr('timeLabel')}${tr('tm_' + tmObj().k)}`;
  const gfxText = () => `${tr('gfxLabel')}${tr('gfx_' + gfxObj().k)}`;
  const followText = () => tr('followAxe') + (state.followCam ? tr('on') : tr('off'));

  show(
    tr('settingsTitle'),
    '',
    tr('back'),
    onBack,
    null,
    null,
    false,
    [
      {
        text: wtText(),
        bg: '#0f766e',
        fn: btn => {
          toggleWeather();
          btn.textContent = wtText();
        }
      },
      {
        text: tmText(),
        bg: '#4338ca',
        fn: btn => {
          toggleTime();
          btn.textContent = tmText();
        }
      },
      {
        text: followText(),
        bg: state.followCam ? '#15803d' : '#475569',
        fn: btn => {
          toggleFollow();
          btn.textContent = followText();
          btn.style.background = state.followCam ? '#15803d' : '#475569';
        }
      },
      {
        text: gfxText(),
        bg: '#b45309',
        fn: btn => {
          applyGraphics(cycleGfx());
          btn.textContent = gfxText();
        }
      },
      {
        text: tr('langLabel'),
        bg: '#9333ea',
        fn: () => {
          toggleLang();
          document.title = tr('docTitle');
          updHUD();
          showSettings(onBack);
        }
      }
    ]
  );
}

export function togglePause() {
  if (state.phase === 'play') {
    state.phase = 'pause';
    state.aim = null;
    const modeLabel = (state.gameMode === 'challenge'
      ? `🏁 ${tr('modeChallenge')} · ${tr('level')} ${state.lvl}/${MAX_LEVEL}`
      : `🎯 ${tr('modePractice')} · ${tr('level')} ${state.lvl}`) +
      `\n⭐ ${tr('totalScore')}: ${state.score}  ·  🏆 ${tr('bestScore')}: ${state.best}`;

    const extra = [
      {
        text: tr('photoMode') + (state.photoMode ? tr('on') : tr('off')),
        bg: '#0284c7',
        fn: () => {
          state.phase = 'play';
          ov.classList.add('hide');
          togglePhoto();
        }
      },
      { text: tr('settings'), bg: '#0f766e', fn: () => showSettings(() => { state.phase = 'play'; togglePause(); }) },
      ...(state.gameMode === 'practice'
        ? [
            { text: tr('selectLevel'), bg: '#0284c7', fn: () => showLevelSelect(() => { state.phase = 'play'; togglePause(); }) },
            { text: tr('mainMenu'), bg: '#334155', fn: showMenu }
          ]
        : [{ text: tr('mainMenu'), bg: '#334155', fn: showMenu }])
    ];
    show(
      tr('pauseTitle'),
      modeLabel,
      tr('resume'),
      () => { state.phase = 'play'; ov.classList.add('hide'); },
      tr('restart'),
      restartCurrentMode,
      true,
      extra
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
    const b = state.axesLeft * 20;
    if (b) addScore(b);
    if (state.autoThrow && state.lvl < MAX_LEVEL) {
      startLevel(state.lvl + 1);
      return;
    }
    state.phase = 'next';
    if (state.gameMode === 'challenge' && state.lvl >= MAX_LEVEL) {
      const isNewBest = state.challengeValid && !state.autoThrow && state.score >= state.best && state.score > 0;
      show(
        tr('challengeDone'),
        tr('challengeDoneSub').replace('{n}', MAX_LEVEL) + `\n${tr('totalScore')}: ` + state.score +
        (isNewBest ? tr('newBest') : `\n${tr('best10')}: ` + state.best),
        tr('restart'),
        restartCurrentMode,
        tr('mainMenu'),
        showMenu
      );
    } else if (state.lvl < MAX_LEVEL) {
      show(
        tr('levelClear') + state.lvl + '!',
        tr('levelScore') + state.lvlScore + '/' + state.goal + (b ? '\n' + tr('axeBonus') + b : '') + `\n${tr('totalScore')}: ` + state.score,
        `${tr('level')} ` + (state.lvl + 1),
        () => startLevel(state.lvl + 1),
        state.gameMode === 'practice' ? tr('selectLevel') : tr('mainMenu'),
        state.gameMode === 'practice' ? () => showLevelSelect(showMenu) : showMenu
      );
    } else {
      show(
        tr('levelClear') + state.lvl + '!',
        tr('levelScore') + state.lvlScore + '/' + state.goal + (b ? '\n' + tr('axeBonus') + b : '') + `\n${tr('totalScore')}: ` + state.score,
        tr('restart'),
        restartCurrentMode,
        tr('selectLevel'),
        () => showLevelSelect(showMenu)
      );
    }
  } else if (state.axesLeft <= 0) {
    stopReplay();
    $('repBar').style.display = 'none';
    state.phase = 'over';
    const isNewBest = state.gameMode === 'challenge' && state.challengeValid && !state.autoThrow && state.score >= state.best && state.score > 0;
    show(
      tr('outOfAxes'),
      `${tr('level')} ` + state.lvl + ': ' + state.lvlScore + '/' + state.goal + ' ' + tr('points') + `\n${tr('totalScore')}: ` + state.score +
      (isNewBest ? tr('newBest') : `\n${tr('best10')}: ` + state.best),
      tr('restart'),
      restartCurrentMode,
      state.gameMode === 'practice' ? tr('selectLevel') : tr('mainMenu'),
      state.gameMode === 'practice' ? () => showLevelSelect(showMenu) : showMenu
    );
  }
}

export function update(dt) {
  state.time += dt;
  state.shake = Math.max(0, state.shake - dt * 3);
  if (state.hitstop > 0) {
    state.hitstop = Math.max(0, state.hitstop - dt);
    return;
  }
  const slow = state.followCam && state.cur && state.cur.mode === 'fly' ? 0.42 : 1;
  const sdt = dt * slow;
  state.tg.t += sdt;
  TR.rotation.z += state.tg.rs * sdt;
  T.position.set(
    Math.sin(state.tg.t * 0.8) * state.tg.ampX,
    Math.max(TR_R + 0.1, 1.9 + Math.sin(state.tg.t * 1.1) * state.tg.amp),
    state.tg.z - state.tgRecoil
  );
  state.tgRecoil = Math.max(0, state.tgRecoil - dt * 1.4);
  if (state.tgWobble.amp > 0.001) {
    state.tgWobble.t += dt * (state.tgWobble.freq || 28);
    state.tgWobble.amp *= Math.exp(-dt * 6.5);
    const w = Math.sin(state.tgWobble.t) * state.tgWobble.amp;
    T.rotation.x = w * (0.85 + state.tgWobble.dirY * 0.45);
    T.rotation.y = -w * state.tgWobble.dirX * 0.75;
    T.position.x += w * state.tgWobble.dirX * 0.09;
    T.position.y += w * state.tgWobble.dirY * 0.07;
    standPost.rotation.x = w * 0.32;
    standPost.rotation.z = -w * state.tgWobble.dirX * 0.22;
    tgShakeFx.visible = state.tgWobble.amp > 0.015;
    if (tgShakeFx.visible) {
      const pulse = 1 + 0.07 * Math.sign(Math.sin(state.tgWobble.t * 1.5));
      tgShakeFx.scale.set(pulse, 1 + (pulse - 1) * 0.6, 1);
      tgShakeFx.rotation.z = w * 0.35;
      tgShakeFx.position.z = state.targetFrontZ + 0.01;
    }
  } else {
    state.tgWobble.amp = 0;
    T.rotation.set(0, 0, 0);
    standPost.rotation.set(0, 0, 0);
    tgShakeFx.visible = false;
  }
  const prevX = standGrp.position.x;
  standGrp.position.set(T.position.x, 0, state.tg.z - 0.32);
  standPost.scale.y = T.position.y / 1.9;
  const dx = T.position.x - prevX;
  for (const w of cartWheels) w.rotation.z -= dx / 0.10;

  if (state.aim) state.aim.hold += dt;

  if (state.thr) {
    state.thr.t += dt;
    if (!state.thr.launched && state.thr.t >= state.thr.rel) {
      state.thr.launched = true;
      launch(state.thr.dx, state.thr.dy, state.thr.hold, state.thr.typeKey);
      cam.fov = 63;
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
