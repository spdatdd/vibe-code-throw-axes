import { CAM_Y, DRAG, GRAV } from './constants.js';

let initialBest = 0;
let initialLang = 'vi';
let initialGfx = 1;
try {
  initialBest = +localStorage.getItem('axeBest3d') || 0;
  const savedLang = localStorage.getItem('axeLang3d');
  if (savedLang === 'en' || savedLang === 'vi') initialLang = savedLang;
  const savedGfx = localStorage.getItem('axeGfx3d');
  if (savedGfx === '0' || savedGfx === '1' || savedGfx === '2') initialGfx = +savedGfx;
} catch (e) {}

/** Trạng thái dùng chung giữa các module. */
export const state = {
  best: initialBest,
  phase: 'load',
  gameMode: 'challenge',
  challengeValid: true,
  hasPlayed: false,
  lvl: 1,
  score: 0,
  lvlScore: 0,
  goal: 0,
  axesLeft: 0,
  streak: 0,
  cur: null,
  stuck: [],
  missed: [],
  chipsL: [],
  fx: [],
  shake: 0,
  hitstop: 0,
  tgRecoil: 0,
  tgWobble: { amp: 0, t: 0, freq: 28, dirX: 0, dirY: 0 },
  lastSpin: '',
  aim: null,
  settle: 0,
  time: 0,
  fdt: 0.016,
  tg: { z: -18, rs: 0, amp: 0, ampX: 0, t: 0 },

  axeIdx: 0,
  tmIdx: 1,
  wtIdx: 1,
  gfxIdx: initialGfx,
  followCam: true,
  autoThrow: false,
  showHitbox: false,
  devMode: false,
  lang: initialLang,
  phys: { grav: GRAV, drag: DRAG, inertia: 1 },

  photoMode: false,
  pmDrag: null,
  pmJoy: { active: false, x: 0, y: 0, id: null },
  pmCam: { pos: new THREE.Vector3(0, CAM_Y, 0), yaw: 0, pit: 0 },
  keys: {},

  thr: null,
  wp: -1,
  wy: 0,
  camDip: 0,
  targetFrontZ: 0.06,

  followPos: new THREE.Vector3(0, CAM_Y, 0),
  followLook: new THREE.Vector3(0, 1.9, -15)
};

export function toggleLang() {
  state.lang = state.lang === 'vi' ? 'en' : 'vi';
  try {
    localStorage.setItem('axeLang3d', state.lang);
  } catch (e) {}
}

export function cycleGfx() {
  state.gfxIdx = (state.gfxIdx + 1) % 3;
  try {
    localStorage.setItem('axeGfx3d', String(state.gfxIdx));
  } catch (e) {}
  return state.gfxIdx;
}

export function addScore(n) {
  state.score += n;
  state.lvlScore += n;
  if (state.gameMode === 'challenge' && state.challengeValid && !state.autoThrow && state.score > state.best) {
    state.best = state.score;
    try {
      localStorage.setItem('axeBest3d', state.best);
    } catch (e) {}
  }
}
