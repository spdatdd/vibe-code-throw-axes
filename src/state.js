import { CAM_Y } from './constants.js';

let initialBest = 0;
try {
  initialBest = +localStorage.getItem('axeBest3d') || 0;
} catch (e) {}

/** Trạng thái dùng chung giữa các module. */
export const state = {
  best: initialBest,
  phase: 'load',
  lvl: 2,
  score: 0,
  lvlScore: 0,
  goal: 0,
  axesLeft: 0,
  streak: 0,
  cur: null,
  stuck: [],
  missed: [],
  chipsL: [],
  shake: 0,
  aim: null,
  settle: 0,
  time: 0,
  fdt: 0.016,
  tg: { z: -18, rs: 0, amp: 0, ampX: 0, t: 0 },

  axeIdx: 1,
  tmIdx: 1,
  followCam: true,
  autoThrow: false,

  photoMode: false,
  pmDrag: null,
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

export function addScore(n) {
  state.score += n;
  state.lvlScore += n;
  if (state.score > state.best) {
    state.best = state.score;
    try {
      localStorage.setItem('axeBest3d', state.best);
    } catch (e) {}
  }
}
