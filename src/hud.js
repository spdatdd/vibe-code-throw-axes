import { $, ov, AXES, AXE_TYPES, DRAG, GRAV, TIME_MODES, WEATHER_MODES, UI_ICONS } from './constants.js';
import { state } from './state.js';
import { tr } from './i18n.js';
import { initAudio } from './audio.js';
import { cam } from './scene.js';
import { setHitboxVisible, setTargetRail, T, standGrp } from './assets.js';
import { getReplayState, stopReplay } from './replay.js';

export const canAim = () =>
  (!state.photoMode || state.autoThrow) &&
  state.phase === 'play' &&
  !state.cur &&
  !state.thr &&
  state.settle <= 0 &&
  state.axesLeft > 0;

export function applyDevMode() {
  document.body.classList.toggle('dev-active', state.devMode);
  $('at').style.display = $('hb').style.display = state.devMode ? 'block' : 'none';
  $('distBar').style.display = $('physBar').style.display = state.devMode ? 'flex' : 'none';
  if (state.devMode) updAxeBtn();
  if (!state.devMode) {
    $('spinInfo').style.display = 'none';
    $('rp').style.display = 'none';
    $('repBar').style.display = 'none';
    stopReplay();
    if (state.autoThrow) toggleAuto();
    if (state.showHitbox) toggleHitbox();
    state.phys.grav = GRAV;
    state.phys.drag = DRAG;
    state.phys.inertia = 1;
    syncPhysUI();
  } else if (getReplayState().lastRec && !state.cur && !state.thr) {
    $('rp').style.display = 'inline-flex';
  }
  updHUD();
}

export function syncPhysUI() {
  const gRng = $('gravRng'), dRng = $('dragRng'), iRng = $('inerRng');
  if (gRng) gRng.value = state.phys.grav;
  if (dRng) dRng.value = state.phys.drag;
  if (iRng) iRng.value = state.phys.inertia;
  if ($('gravVal')) $('gravVal').textContent = state.phys.grav.toFixed(1);
  if ($('dragVal')) $('dragVal').textContent = state.phys.drag.toFixed(2);
  if ($('inerVal')) $('inerVal').textContent = state.phys.inertia.toFixed(2) + 'x';
}

export function show(title, text, btn, fn, btn2, fn2, devToggle = false, extraBtns = []) {
  ov.innerHTML = '';
  const h = document.createElement('h1');
  const p = document.createElement('p');
  h.textContent = title;
  p.textContent = text;
  if (!text) p.style.display = 'none';
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
  for (const eb of extraBtns) {
    if (!eb || (!eb.text && !eb.html)) continue;
    const b3 = document.createElement('button');
    if (eb.html) b3.innerHTML = eb.html;
    else b3.textContent = eb.text;
    b3.style.background = eb.bg || '#334155';
    b3.onclick = () => {
      initAudio();
      eb.fn(b3);
    };
    ov.append(b3);
  }
  if (devToggle) {
    const bd = document.createElement('button');
    const syncDevBtn = () => {
      bd.textContent = tr('devLabel') + (state.devMode ? tr('on') : tr('off'));
      bd.style.background = state.devMode ? '#2e7d32' : '#3f4f6b';
      bd.style.boxShadow = state.devMode ? '0 3px 0 #1b4d1e' : '0 3px 0 #232d3f';
      bd.style.fontSize = '14px';
      bd.style.padding = '7px 16px';
    };
    syncDevBtn();
    bd.onclick = () => {
      state.devMode = !state.devMode;
      applyDevMode();
      syncDevBtn();
    };
    ov.append(bd);
  }
  ov.classList.remove('hide');
}

export function updHUD() {
  const distM = Math.hypot(T.position.x, T.position.z + state.targetFrontZ).toFixed(1);
  const distPart = state.devMode ? '  ·  📏 <span id="hudDist">' + distM + 'm</span>' : '';
  $('hud').innerHTML =
    '<b>🏁 ' + state.lvl + '</b>  ·  🎯 ' + state.lvlScore + '/' + state.goal + distPart;
  const axesEl = $('axesHud');
  if (axesEl) {
    const axeCfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
    const icon = axeCfg.iconHtml || axeCfg.icon;
    if (state.autoThrow) {
      axesEl.innerHTML = `<span class="axe-slot">${icon}</span><span class="axe-inf">∞</span>`;
    } else {
      let html = '';
      for (let i = AXES - 1; i >= 0; i--) {
        html += `<span class="axe-slot${i < state.axesLeft ? '' : ' used'}">${icon}</span>`;
      }
      axesEl.innerHTML = html;
    }
  }
  const comboEl = $('combo');
  if (comboEl) {
    if (state.phase === 'play' && state.streak >= 2) {
      const mul = state.streak >= 3 ? 2 : 1.5;
      comboEl.textContent = (state.streak >= 3 ? '⚡ COMBO x' : '🔥 COMBO x') + mul;
      comboEl.style.display = 'block';
    } else {
      comboEl.style.display = 'none';
    }
  }
  $('hint').textContent =
    state.lvl === 1 && state.phase === 'play' && state.axesLeft === AXES && !state.aim
      ? tr('hintThrow')
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

export function initComicIcons() {
  $('pb').innerHTML = UI_ICONS.pause;
  $('at').innerHTML = UI_ICONS.bot;
  $('hb').innerHTML = UI_ICONS.hitbox;
  $('pm').innerHTML = UI_ICONS.photo;
  $('fc').innerHTML = UI_ICONS.follow;
  $('rp').innerHTML = UI_ICONS.replay;
  const tm = TIME_MODES[state.tmIdx] || TIME_MODES[0];
  $('tm').innerHTML = tm.iconHtml || tm.icon;
  $('tm').title = tm.t;
}

export function toggleTime() {
  state.tmIdx = (state.tmIdx + 1) % TIME_MODES.length;
  const tm = TIME_MODES[state.tmIdx];
  $('tm').innerHTML = tm.iconHtml || tm.icon;
  $('tm').title = tm.t;
}

export function updWeatherBtn() {
  const cfg = WEATHER_MODES[state.wtIdx] || WEATHER_MODES[0];
  if (cfg.iconHtml) $('wt').innerHTML = cfg.iconHtml;
  else $('wt').textContent = cfg.icon;
  $('wt').title = cfg.t;
}

export function toggleWeather() {
  state.wtIdx = (state.wtIdx + 1) % WEATHER_MODES.length;
  updWeatherBtn();
}

export function toggleFollow() {
  state.followCam = !state.followCam;
  $('fc').innerHTML = UI_ICONS.follow;
  $('fc').classList.toggle('off', !state.followCam);
}

export function toggleAuto() {
  state.autoThrow = !state.autoThrow;
  if (state.autoThrow) state.challengeValid = false;
  $('at').innerHTML = UI_ICONS.bot;
  $('at').classList.toggle('off', !state.autoThrow);
  updHUD();
}

export function setTargetDist(d) {
  const dist = Math.max(10, Math.min(45, Math.round(d * 10) / 10));
  state.tg.z = -dist;
  T.position.z = state.tg.z;
  standGrp.position.z = state.tg.z - 0.32;
  setTargetRail(state.tg.ampX, state.tg.z);
  const rng = $('distRng');
  if (rng) rng.value = dist;
  updHUD();
}

export function updAxeBtn() {
  const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
  if (cfg.iconHtml) $('ab').innerHTML = cfg.iconHtml;
  else $('ab').textContent = cfg.icon;
  $('ab').title = cfg.label;
  updHUD();
}

export function toggleHitbox() {
  setHitboxVisible(!state.showHitbox);
  $('hb').innerHTML = UI_ICONS.hitbox;
  $('hb').classList.toggle('off', !state.showHitbox);
}
