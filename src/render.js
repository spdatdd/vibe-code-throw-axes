import { $, AXE_TYPES, CAM_Y, DRAG, GRAV, ORIGIN } from './constants.js';
import { state } from './state.js';
import { R, scene, cam } from './scene.js';
import { makeAxe } from './assets.js';
import { canAim } from './hud.js';
import { aimVec, tipOf } from './aim.js';
import { getReplayState } from './replay.js';

// ================= HIỂN THỊ & TAY CẦM RÌU =================
const axePivot = new THREE.Group();
let ready = new THREE.Group();

const trail = new THREE.Line(
  new THREE.BufferGeometry(),
  new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, fog: false })
);
trail.frustumCulled = false;
scene.add(trail);

let trPts = [];

const dots = [];
for (let i = 0; i < 40; i++) {
  const d = new THREE.Mesh(
    new THREE.SphereGeometry(0.05, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false })
  );
  d.visible = false;
  scene.add(d);
  dots.push(d);
}

const pow = $('pow');
const pi = pow.firstElementChild;
const elv = $('elv');
const ei = elv.firstElementChild;

export function buildHandModels() {
  axePivot.position.set(0.15, -0.22, -0.52);
  axePivot.rotation.set(1.05, -0.15, 0);
  cam.add(axePivot);
  refreshReadyAxe();
}

export function refreshReadyAxe() {
  if (ready.parent) ready.parent.remove(ready);
  const cfg = AXE_TYPES[state.axeIdx];
  ready = makeAxe(cfg.key);
  ready.scale.setScalar(cfg.gripScale);
  axePivot.add(ready);
}

export function setReadyVisible(v) {
  ready.visible = v;
}

export function clearTrail() {
  trPts = [];
}

export function pushTrailPoint(pt) {
  trPts.push(pt.clone());
  if (trPts.length > 22) trPts.shift();
  trail.geometry.setFromPoints(trPts);
}

export function shiftTrailPoint() {
  if (!trPts.length) return;
  trPts.shift();
  trail.geometry.setFromPoints(trPts);
}

function animHand() {
  const k = 1 - Math.exp(-state.fdt * 14);
  cam.fov += (60 - cam.fov) * (1 - Math.exp(-state.fdt * 6));
  cam.updateProjectionMatrix();

  if (state.thr) {
    const t = state.thr.t;
    let px = 0.15, py = -0.22, pz = -0.52, rx = 1.05;
    const ry = -0.15;
    if (t < 0.5) {
      const u = t / 0.5, e = u * u * (3 - 2 * u);
      px = 0.15 + 0.22 * e; py = -0.22 + 0.18 * e; pz = -0.52 + 0.24 * e; rx = 1.05 + 0.75 * e; state.camDip = 0.06 * e;
    } else if (t < 0.85) {
      const u = (t - 0.5) / 0.35, e = u * u;
      px = 0.37 - 0.22 * e; py = -0.04 - 0.34 * e; pz = -0.28 - 0.42 * e; rx = 1.80 - 1.55 * e; state.camDip = 0.06 - 0.20 * e;
    } else if (t < 1.85) {
      const u = (t - 0.85) / 1.0, e = 1 - Math.pow(1 - u, 2);
      px = 0.15; py = -0.38; pz = -0.70; rx = 0.25; state.camDip = -0.14 * (1 - 0.3 * e);
    } else {
      const u = Math.min(1, (t - 1.85) / 1.15), e = u * u * (3 - 2 * u);
      px = 0.15; py = -0.38 + 0.16 * e; pz = -0.70 + 0.18 * e; rx = 0.25 + 0.80 * e; state.camDip = -0.098 * (1 - e);
    }
    const s = Math.min(1, state.fdt * 20);
    axePivot.position.x += (px - axePivot.position.x) * s;
    axePivot.position.y += (py - axePivot.position.y) * s;
    axePivot.position.z += (pz - axePivot.position.z) * s;
    axePivot.rotation.set(rx, ry, 0);
  } else {
    state.camDip += (0 - state.camDip) * k;
    let px = 0.24, py = -0.22 + Math.sin(state.time * 2) * 0.008, pz = -0.52, rx = 1.05, ry = -0.15;
    if (state.wp >= 0) {
      px = 0.24 + 0.12 * state.wp;
      py = -0.22 + 0.16 * state.wp;
      pz = -0.52 + 0.18 * state.wp;
      rx = 1.05 + 0.55 * state.wp;
      ry = -0.15 - state.wy * 0.35;
    }
    axePivot.position.x += (px - axePivot.position.x) * k;
    axePivot.position.y += (py - axePivot.position.y) * k;
    axePivot.position.z += (pz - axePivot.position.z) * k;
    axePivot.rotation.set(rx, ry, 0);
  }
}

export function render() {
  if (state.photoMode) {
    const spd = 8 * state.fdt;
    const fwd = new THREE.Vector3(0, 0, -1).applyEuler(new THREE.Euler(state.pmCam.pit, state.pmCam.yaw, 0, 'YXZ'));
    const rgt = new THREE.Vector3(1, 0, 0).applyEuler(new THREE.Euler(0, state.pmCam.yaw, 0, 'YXZ'));
    if (state.keys['w'] || state.keys['arrowup']) state.pmCam.pos.addScaledVector(fwd, spd);
    if (state.keys['s'] || state.keys['arrowdown']) state.pmCam.pos.addScaledVector(fwd, -spd);
    if (state.keys['a'] || state.keys['arrowleft']) state.pmCam.pos.addScaledVector(rgt, -spd);
    if (state.keys['d'] || state.keys['arrowright']) state.pmCam.pos.addScaledVector(rgt, spd);
    if (state.keys['e']) state.pmCam.pos.y += spd;
    if (state.keys['q']) state.pmCam.pos.y -= spd;
    state.pmCam.pos.y = Math.max(0.55, state.pmCam.pos.y);
    cam.position.copy(state.pmCam.pos);
    cam.rotation.set(state.pmCam.pit, state.pmCam.yaw, 0, 'YXZ');
    axePivot.visible = false;
    pow.style.display = elv.style.display = 'none';
    dots.forEach(d => { d.visible = false; });
    R.render(scene, cam);
    return;
  }

  axePivot.visible = true;
  let on = false;
  state.wp = -1;
  ready.visible = canAim() || (!!state.thr && (!state.thr.launched || (state.thr.t >= 2.1 && !state.cur && state.axesLeft > 0)));
  cam.rotation.set((state.thr ? state.thr.cp : 0) + state.camDip, state.thr ? state.thr.cy : 0, 0, 'YXZ');

  if (state.aim) {
    on = true;
    const a = aimVec(state.aim.dx, state.aim.dy, state.aim.hold);
    cam.rotation.set(0, -a.yaw * 0.5, 0, 'YXZ');
    const spRef = 20;
    const p = ORIGIN.clone();
    const v = new THREE.Vector3(
      spRef * Math.cos(a.pit) * Math.sin(a.yaw),
      spRef * Math.sin(a.pit),
      -spRef * Math.cos(a.pit) * Math.cos(a.yaw)
    );
    let alive = true;
    dots.forEach((d, i) => {
      if (alive) {
        for (let k = 0; k < 2; k++) {
          v.y -= GRAV * 0.03;
          v.multiplyScalar(1 - DRAG * 0.03);
          p.addScaledVector(v, 0.03);
        }
      }
      if (p.y < 0 || p.z < state.tg.z - 1) alive = false;
      d.visible = alive;
      d.position.copy(p);
      d.scale.setScalar(1 - i * 0.015);
    });
    pi.style.height = a.p * 100 + '%';
    pi.style.background = a.p < 0.6 ? '#8fd14f' : a.p < 0.85 ? '#ffd23f' : '#e8452b';
    ei.style.height = a.el * 100 + '%';
    state.wp = a.p;
    state.wy = a.yaw;
  } else {
    dots.forEach(d => { d.visible = false; });
  }

  pow.style.display = elv.style.display = on ? 'block' : 'none';
  const { lastRec, repIdx } = getReplayState();

  if (repIdx >= 0 && lastRec) {
    const f = lastRec.frames[repIdx];
    cam.position.copy(f.cp);
    cam.lookAt(f.cl);
    axePivot.visible = false;
  } else if (state.followCam && (state.cur || state.settle > 0)) {
    const k = 1 - Math.exp(-state.fdt * 10);
    if (state.cur) {
      const tip = tipOf(state.cur);
      const dir = state.cur.v.lengthSq() > 0.01 ? state.cur.v.clone().normalize() : new THREE.Vector3(0, 0, -1);
      const dst = tip.clone().addScaledVector(dir, -1.45).add(new THREE.Vector3(0.38, 0.36, 0));
      dst.y = Math.max(0.45, dst.y);
      state.followPos.lerp(dst, k);
      state.followLook.lerp(tip, Math.min(1, state.fdt * 18));
    }
    cam.position.set(
      state.followPos.x + (Math.random() - 0.5) * state.shake * 0.08,
      state.followPos.y + (Math.random() - 0.5) * state.shake * 0.08,
      state.followPos.z
    );
    cam.lookAt(state.followLook);
    axePivot.visible = false;
  } else {
    cam.position.set(
      (Math.random() - 0.5) * state.shake * 0.1,
      CAM_Y + (Math.random() - 0.5) * state.shake * 0.1,
      0
    );
    animHand();
  }

  R.render(scene, cam);
}
