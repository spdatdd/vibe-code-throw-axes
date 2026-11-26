import { $, AXE_TYPES, CAM_Y, DRAG, GRAV, ORIGIN, TR_R } from './constants.js';
import { state } from './state.js';
import { R, scene, cam } from './scene.js';
import { makeAxe, T } from './assets.js';
import { canAim } from './hud.js';
import { aimVec, tipOf } from './aim.js';
import { getReplayState } from './replay.js';
import { createTrailMaterial } from './shaders.js';

// ================= HIỂN THỊ & TAY CẦM RÌU =================
const axePivot = new THREE.Group();
let ready = new THREE.Group();

const MAX_TRAIL = 64;
const trailPos = new Float32Array(MAX_TRAIL * 2 * 3);
const trailCol = new Float32Array(MAX_TRAIL * 2 * 3);
const trailUv = new Float32Array(MAX_TRAIL * 2 * 2);
const trailIdx = [];
for (let i = 0; i < MAX_TRAIL - 1; i++) {
  const a = i * 2;
  const b = a + 1;
  const c = a + 2;
  const d = a + 3;
  trailIdx.push(a, b, c, b, d, c);
}
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
trailGeo.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
trailGeo.setAttribute('uv', new THREE.BufferAttribute(trailUv, 2));
trailGeo.setIndex(trailIdx);
trailGeo.setDrawRange(0, 0);

const trail = new THREE.Mesh(trailGeo, createTrailMaterial());
trail.frustumCulled = false;
trail.visible = false;
scene.add(trail);

let trPts = [];
let trailTypeKey = null;
let trailStreak = null;
const _trIn = new THREE.Vector3();
const _trC1 = new THREE.Color();
const _trC2 = new THREE.Color();
const _trC3 = new THREE.Color();
const _trRainbow = new THREE.Color();

const TRAIL_PALETTES = {
  axe: [0xffffff, 0xffffff, 0xffffff],
  axe_double: [0xffffff, 0xffffff, 0xffffff],
  axe_tomahawk: [0xffffff, 0xffffff, 0xffffff]
};

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
const spinInfo = $('spinInfo');

function predictTurns(a, cfg) {
  const effMass = cfg.mass * state.phys.inertia;
  const hitZ = state.tg.z + state.targetFrontZ + cfg.tipZ;
  const p = ORIGIN.clone();
  const v = a.v.clone();
  let sp = -(4.0 + a.p * 13.5) * (0.85 + a.pit * 0.55) / Math.pow(effMass, 0.35);
  let th = 0.9;
  const h = 0.02;
  for (let i = 0; i < 160 && p.z > hitZ && p.y > 0; i++) {
    v.y -= state.phys.grav * h;
    v.multiplyScalar(1 - (state.phys.drag / effMass) * h);
    p.addScaledVector(v, h);
    sp -= (state.phys.grav * 0.35 * Math.cos(th) + Math.max(0, -v.y) * 0.12) * h / effMass;
    th += sp * h;
  }
  return {
    turns: Math.abs(th - 0.9) / (Math.PI * 2),
    reached: p.z <= hitZ && p.y > 0.3
  };
}

export function buildHandModels() {
  const xScale = Math.min(1, Math.max(0.32, cam.aspect * 0.72));
  const zPull = (1 - Math.min(1, cam.aspect)) * 0.16;
  axePivot.position.set(0.24 * xScale, -0.22, -0.52 - zPull);
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
  trailTypeKey = null;
  trailStreak = null;
  trail.visible = false;
  trailGeo.setDrawRange(0, 0);
}

export function setTrailPoints(pts, typeKey = null, streak = null) {
  trPts = pts;
  trailTypeKey = typeKey;
  trailStreak = streak;
  if (trPts.length < 2) {
    trail.visible = false;
    trailGeo.setDrawRange(0, 0);
  }
}

export function pushTrailPoint(outPt, inPt = outPt) {
  trailTypeKey = null;
  trailStreak = null;
  trPts.push({ out: outPt.clone(), in: inPt.clone() });
  if (trPts.length > MAX_TRAIL) trPts.shift();
}

export function shiftTrailPoint() {
  if (!trPts.length) return;
  trPts.shift();
  if (trPts.length < 2) {
    trail.visible = false;
    trailGeo.setDrawRange(0, 0);
  }
}

function updateTrailMesh() {
  const n = trPts.length;
  if (n < 2) {
    trail.visible = false;
    trailGeo.setDrawRange(0, 0);
    return;
  }

  const activeKey = trailTypeKey || (AXE_TYPES[state.axeIdx] || AXE_TYPES[0]).key;
  const cfg = AXE_TYPES.find(x => x.key === activeKey) || AXE_TYPES[0];
  const streak = trailStreak !== null ? trailStreak : state.streak;
  const pal = TRAIL_PALETTES[cfg.key] || TRAIL_PALETTES.axe;

  _trC1.setHex(pal[0]);
  _trC2.setHex(pal[1]);
  _trC3.setHex(pal[2]);

  const widthBoost = 1 + Math.min(streak, 4) * 0.14;
  for (let i = 0; i < n; i++) {
    const sp = trPts[i];
    const pOut = sp.out;
    const u = i / (n - 1);
    const taper = Math.pow(u, 0.55) * widthBoost;
    _trIn.lerpVectors(pOut, sp.in, taper);

    const vi = i * 2;
    const pi = vi * 3;
    trailPos[pi] = _trIn.x;
    trailPos[pi + 1] = _trIn.y;
    trailPos[pi + 2] = _trIn.z;
    trailPos[pi + 3] = pOut.x;
    trailPos[pi + 4] = pOut.y;
    trailPos[pi + 5] = pOut.z;

    const ui = vi * 2;
    trailUv[ui] = u;
    trailUv[ui + 1] = 0;
    trailUv[ui + 2] = u;
    trailUv[ui + 3] = 1;

    const r = 1, g = 1, b = 1;

    trailCol[pi] = r;
    trailCol[pi + 1] = g;
    trailCol[pi + 2] = b;
    trailCol[pi + 3] = r;
    trailCol[pi + 4] = g;
    trailCol[pi + 5] = b;
  }

  trailGeo.attributes.position.needsUpdate = true;
  trailGeo.attributes.color.needsUpdate = true;
  trailGeo.attributes.uv.needsUpdate = true;
  trailGeo.setDrawRange(0, (n - 1) * 6);
  trail.visible = true;
}

const _pmFwd = new THREE.Vector3();
const _pmRgt = new THREE.Vector3();
const _pmEuler = new THREE.Euler(0, 0, 0, 'YXZ');
const _aimPos = new THREE.Vector3();
const _aimVel = new THREE.Vector3();

function animHand() {
  const k = 1 - Math.exp(-state.fdt * 14);
  if (Math.abs(60 - cam.fov) > 0.001) {
    cam.fov += (60 - cam.fov) * (1 - Math.exp(-state.fdt * 6));
    cam.updateProjectionMatrix();
  }
  const xScale = Math.min(1, Math.max(0.32, cam.aspect * 0.72));
  const zPull = (1 - Math.min(1, cam.aspect)) * 0.16;

  if (state.thr) {
    const t = state.thr.t;
    let px = 0.15, py = -0.22, pz = -0.52, rx = 1.05;
    const ry = -0.15;
    if (t < 0.5) {
      const u = t / 0.5, e = u * u * (3 - 2 * u);
      px = 0.15 + 0.22 * e; py = -0.22 + 0.18 * e; pz = -0.52 + 0.24 * e * xScale; rx = 1.05 + 0.75 * e; state.camDip = 0.06 * e;
    } else if (t < 0.85) {
      const u = (t - 0.5) / 0.35, e = u * u;
      px = 0.37 - 0.22 * e; py = -0.04 - 0.34 * e; pz = (-0.52 + 0.24 * xScale) - (0.18 + 0.24 * xScale) * e; rx = 1.80 - 1.55 * e; state.camDip = 0.06 - 0.20 * e;
    } else if (t < 1.85) {
      const u = (t - 0.85) / 1.0, e = 1 - Math.pow(1 - u, 2);
      px = 0.15; py = -0.38; pz = -0.70; rx = 0.25; state.camDip = -0.14 * (1 - 0.3 * e);
    } else {
      const u = Math.min(1, (t - 1.85) / 1.15), e = u * u * (3 - 2 * u);
      px = 0.15; py = -0.38 + 0.16 * e; pz = -0.70 + 0.18 * e; rx = 0.25 + 0.80 * e; state.camDip = -0.098 * (1 - e);
    }
    px *= xScale;
    pz -= zPull;
    const s = Math.min(1, state.fdt * 20);
    axePivot.position.x += (px - axePivot.position.x) * s;
    axePivot.position.y += (py - axePivot.position.y) * s;
    axePivot.position.z += (pz - axePivot.position.z) * s;
    axePivot.rotation.set(rx, ry, 0);
  } else {
    state.camDip += (0 - state.camDip) * k;
    let px = 0.24 * xScale, py = -0.22 + Math.sin(state.time * 2) * 0.008, pz = -0.52 - zPull, rx = 1.05, ry = -0.15;
    if (state.wp >= 0) {
      px = (0.24 + 0.12 * state.wp) * xScale;
      py = -0.22 + 0.16 * state.wp;
      pz = -0.52 - zPull + 0.18 * state.wp * xScale;
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
    _pmEuler.set(state.pmCam.pit, state.pmCam.yaw, 0, 'YXZ');
    _pmFwd.set(0, 0, -1).applyEuler(_pmEuler);
    _pmEuler.set(0, state.pmCam.yaw, 0, 'YXZ');
    _pmRgt.set(1, 0, 0).applyEuler(_pmEuler);
    const moveFwd = (state.keys['w'] || state.keys['arrowup'] ? 1 : 0) - (state.keys['s'] || state.keys['arrowdown'] ? 1 : 0) + state.pmJoy.y;
    const moveRgt = (state.keys['d'] || state.keys['arrowright'] ? 1 : 0) - (state.keys['a'] || state.keys['arrowleft'] ? 1 : 0) + state.pmJoy.x;
    if (moveFwd) state.pmCam.pos.addScaledVector(_pmFwd, moveFwd * spd);
    if (moveRgt) state.pmCam.pos.addScaledVector(_pmRgt, moveRgt * spd);
    if (state.keys['e']) state.pmCam.pos.y += spd;
    if (state.keys['q']) state.pmCam.pos.y -= spd;
    state.pmCam.pos.y = Math.max(0.55, state.pmCam.pos.y);
    cam.position.copy(state.pmCam.pos);
    cam.rotation.set(state.pmCam.pit, state.pmCam.yaw, 0, 'YXZ');
    axePivot.visible = false;
    pow.style.display = elv.style.display = spinInfo.style.display = 'none';
    dots.forEach(d => { d.visible = false; });
    const distEl = $('hudDist');
  if (distEl) {
    const distTxt = Math.hypot(T.position.x, T.position.z + state.targetFrontZ).toFixed(1) + 'm';
    if (distEl.textContent !== distTxt) distEl.textContent = distTxt;
  }

  updateTrailMesh();
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
    const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
    const effMass = cfg.mass * state.phys.inertia;
    const a = aimVec(state.aim.dx, state.aim.dy, state.aim.hold, effMass);
    cam.rotation.set(0, -a.yaw * 0.5, 0, 'YXZ');
    const spRef = 20 / Math.sqrt(effMass);
    const p = _aimPos.copy(ORIGIN);
    const v = _aimVel.set(
      spRef * Math.cos(a.pit) * Math.sin(a.yaw),
      spRef * Math.sin(a.pit),
      -spRef * Math.cos(a.pit) * Math.cos(a.yaw)
    );
    let alive = true;
    dots.forEach((d, i) => {
      if (alive) {
        for (let k = 0; k < 2; k++) {
          v.y -= state.phys.grav * 0.03;
          v.multiplyScalar(1 - (state.phys.drag / effMass) * 0.03);
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
    if (state.devMode) {
      const pr = predictTurns(a, cfg);
      spinInfo.style.display = 'block';
      spinInfo.style.color = pr.reached ? '#8fd14f' : '#ffb36b';
      spinInfo.textContent = '🔄 ~' + pr.turns.toFixed(2) + ' vòng';
    } else {
      spinInfo.style.display = 'none';
    }
  } else {
    dots.forEach(d => { d.visible = false; });
    if (state.autoThrow) {
      on = true;
      if (state.thr) {
        const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
        const a = aimVec(state.thr.dx, state.thr.dy, state.thr.hold, cfg.mass * state.phys.inertia);
        pi.style.height = a.p * 100 + '%';
        pi.style.background = a.p < 0.6 ? '#8fd14f' : a.p < 0.85 ? '#ffd23f' : '#e8452b';
        ei.style.height = a.el * 100 + '%';
        if (state.devMode) {
          const pr = predictTurns(a, cfg);
          spinInfo.style.display = 'block';
          spinInfo.style.color = pr.reached ? '#8fd14f' : '#ffb36b';
          spinInfo.textContent = '🔄 ~' + pr.turns.toFixed(2) + ' vòng';
        }
      }
    }
    if (!state.devMode) {
      spinInfo.style.display = 'none';
    } else if (state.cur && state.cur.mode === 'fly') {
      spinInfo.style.display = 'block';
      spinInfo.style.color = '#ffffff';
      spinInfo.textContent = '🔄 ' + (Math.abs(state.cur.th - 0.9) / (Math.PI * 2)).toFixed(2) + ' vòng';
    } else if ((!state.autoThrow || !state.thr) && state.lastSpin && state.phase === 'play') {
      spinInfo.style.display = 'block';
      spinInfo.style.color = '#ffd36b';
      spinInfo.textContent = '🔄 ' + state.lastSpin + ' vòng';
    } else if (!state.autoThrow || !state.thr) {
      spinInfo.style.display = 'none';
    }
  }

  pow.style.display = elv.style.display = on ? 'block' : 'none';
  const { lastRec, repIdx } = getReplayState();

  const clampFollowCamAgainstTarget = (pos, tip, mode = 'fly') => {
    const frontSafeZ = T.position.z + state.targetFrontZ + 0.55;
    const backSafeZ = T.position.z - 0.5;
    if (mode === 'bounce' || mode === 'stick') {
      pos.z = Math.max(pos.z, frontSafeZ);
      return;
    }
    if (pos.z < frontSafeZ && pos.z > backSafeZ) {
      const dx = pos.x - T.position.x;
      const dy = pos.y - T.position.y;
      const r = Math.hypot(dx, dy);
      const minR = TR_R + 0.55;
      if (r < minR) {
        if (tip.z >= T.position.z - 0.25) {
          pos.z = frontSafeZ;
        } else if (r > 0.001) {
          pos.x = T.position.x + (dx / r) * minR;
          pos.y = Math.max(0.45, T.position.y + (dy / r) * minR);
        } else {
          pos.x = T.position.x + minR;
        }
      }
    }
  };

  if (repIdx >= 0 && lastRec) {
    const f = lastRec.frames[repIdx];
    if (state.followCam) {
      const tip = f.tip || f.p;
      const prevF = lastRec.frames[Math.max(0, repIdx - 1)];
      const nextF = lastRec.frames[Math.min(lastRec.frames.length - 1, repIdx + 1)];
      const dir = nextF.p.clone().sub(prevF.p);
      if (dir.lengthSq() > 1e-4) dir.normalize();
      else dir.set(0, 0, -1);
      const dst = tip.clone().addScaledVector(dir, -1.45).add(new THREE.Vector3(0.38, 0.36, 0));
      dst.y = Math.max(0.45, dst.y);
      clampFollowCamAgainstTarget(dst, tip, f.mode);
      cam.position.copy(dst);
      cam.lookAt(tip);
    } else {
      cam.position.set(0, CAM_Y, 0);
      cam.lookAt(0, CAM_Y, -15);
    }
    axePivot.visible = false;
    pow.style.display = elv.style.display = spinInfo.style.display = 'none';
  } else if (state.followCam && (state.cur || state.settle > 0)) {
    const k = 1 - Math.exp(-state.fdt * 10);
    if (state.cur) {
      const tip = tipOf(state.cur);
      const dir = state.cur.v.lengthSq() > 0.01 ? state.cur.v.clone().normalize() : new THREE.Vector3(0, 0, -1);
      if (state.cur.mode === 'bounce' && dir.z > 0) dir.z = -Math.abs(dir.z);
      const dst = tip.clone().addScaledVector(dir, -1.45).add(new THREE.Vector3(0.38, 0.36, 0));
      dst.y = Math.max(0.45, dst.y);
      clampFollowCamAgainstTarget(dst, tip, state.cur.mode);
      state.followPos.lerp(dst, k);
      clampFollowCamAgainstTarget(state.followPos, tip, state.cur.mode);
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

  const distEl = $('hudDist');
  if (distEl) {
    const distTxt = Math.hypot(T.position.x, T.position.z + state.targetFrontZ).toFixed(1) + 'm';
    if (distEl.textContent !== distTxt) distEl.textContent = distTxt;
  }

  updateTrailMesh();
  R.render(scene, cam);
}
