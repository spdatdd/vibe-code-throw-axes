import {
  $, AXE_TYPES, BULL_BONUS, BULL_R, DRAG, GRAV, MAX_PULL, ORIGIN, RINGS, TR_R
} from './constants.js';
import { state, addScore } from './state.js';
import { tr } from './i18n.js';
import { SFX } from './audio.js';
import { scene } from './scene.js';
import { createToonRingMaterial, makeToonMaterial } from './shaders.js';
import { makeAxe, getAxeShape, ENV_COLLIDERS, T, TR } from './assets.js';
import { pop, updHUD } from './hud.js';
import { aimVec, tipOf } from './aim.js';
import { startRec, pushRecFrame, setLastStuck, stopReplay } from './replay.js';
import { clearTrail, pushTrailPoint, setReadyVisible } from './render.js';

// ================= VẬT LÝ NÉM & VA CHẠM =================
const chipGeo = new THREE.BoxGeometry(0.065, 0.065, 0.065);
const chipOutlineGeo = new THREE.BoxGeometry(0.082, 0.082, 0.082);
const chipOutlineMat = new THREE.MeshBasicMaterial({ color: 0x111827, side: THREE.BackSide });
const chipMat = makeToonMaterial(0xe2b170);
const dirtMat = makeToonMaterial(0x6b5134);
const stoneMat = makeToonMaterial(0x9ca3af);
const emberMat = makeToonMaterial(0xff922b, 0xe8590c);
const sparkMat = makeToonMaterial(0x22d3ee, 0x0891b2);
const ringGeo = new THREE.RingGeometry(0.08, 0.15, 24);

// Chu kỳ animation ném rìu 3 giây (0–0.5s lấy đà, 0.5–0.72s vung & thả, 0.72–1.85s theo đà, 1.85–3.0s hồi về)
export function startThrow(dx, dy, hold) {
  stopReplay();
  $('repBar').style.display = 'none';
  const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
  const a = aimVec(dx, dy, hold, cfg.mass * state.phys.inertia);
  state.thr = {
    dx,
    dy,
    hold,
    t: 0,
    dur: 3.0,
    rel: 0.72,
    launched: false,
    cp: 0,
    cy: -a.yaw * 0.5,
    typeKey: cfg.key
  };
}

export function launch(dx, dy, hold, typeKey) {
  startRec(typeKey);
  const cfg = AXE_TYPES.find(x => x.key === typeKey) || AXE_TYPES[0];
  const effMass = cfg.mass * state.phys.inertia;
  const a = aimVec(dx, dy, hold, effMass);
  const g = new THREE.Group();
  const inner = makeAxe(typeKey);
  g.add(inner);
  g.position.copy(ORIGIN);
  scene.add(g);

  state.cur = {
    g,
    inner,
    p: ORIGIN.clone(),
    v: a.v,
    th: 0.9,
    sp: -(4.0 + a.p * 13.5) * (0.85 + a.pit * 0.55) / Math.pow(effMass, 0.35),
    roll: -a.yaw * 0.18,
    rollSp: (-a.yaw * 0.35) / effMass,
    yawAng: Math.atan2(-a.v.x, -a.v.z),
    yawSp: 0,
    targetRoll: 0,
    mode: 'fly',
    failed: false,
    life: 0.7,
    tipZ: cfg.tipZ,
    tipY: cfg.tipY,
    pz: ORIGIN.z - cfg.tipZ,
    typeKey,
    mass: effMass
  };

  state.followPos.copy(new THREE.Vector3(0, 1.6, 0));
  state.followLook.copy(tipOf(state.cur));
  g.rotation.y = Math.atan2(-a.v.x, -a.v.z);
  inner.rotation.x = 0.9;
  if (!state.autoThrow) state.axesLeft--;
  SFX.whoosh();
  clearTrail();
  setReadyVisible(false);
  updHUD();
  pushRecFrame(state.cur, 0);
}

export function autoFire() {
  const cfg = AXE_TYPES[state.axeIdx] || AXE_TYPES[0];
  const hitZ = T.position.z + state.targetFrontZ;
  const dist = ORIGIN.z - hitZ;
  const effMass = cfg.mass * state.phys.inertia;
  const minP = Math.min(0.85, Math.max(0.15, (Math.sqrt(dist * state.phys.grav * 1.15 * effMass) - 10) / 18));
  const slow = state.followCam ? 0.42 : 1;

  // 1. Chọn điểm trống trên mặt bia, xoay vòng góc & tránh lặp lại đúng 1 điểm liên tiếp
  let lx = 0;
  let ly = 0;
  const baseAng = Math.random() * Math.PI * 2;
  const candidates = [
    [Math.cos(baseAng) * 0.07, Math.sin(baseAng) * 0.07],
    [0, 0]
  ];
  for (const r of [0.36, 0.64, 0.90]) {
    for (let k = 0; k < 10; k++) {
      const ang = baseAng + (k / 10) * Math.PI * 2;
      candidates.push([Math.cos(ang) * r, Math.sin(ang) * r]);
    }
  }
  const tooCloseLast = (cx, cy) =>
    state.lastAutoPt && Math.hypot(state.lastAutoPt.lx - cx, state.lastAutoPt.ly - cy) < 0.28;
  let picked = false;
  for (const [cx, cy] of candidates) {
    if (!tooCloseLast(cx, cy) && !state.stuck.some(o => Math.hypot(o.lx - cx, o.ly - cy) < 0.40)) {
      lx = cx;
      ly = cy;
      picked = true;
      break;
    }
  }
  if (!picked) {
    for (const [cx, cy] of candidates) {
      if (!state.stuck.some(o => Math.hypot(o.lx - cx, o.ly - cy) < 0.38)) {
        lx = cx;
        ly = cy;
        break;
      }
    }
  }
  state.lastAutoPt = { lx, ly };

  // 2. Dự đoán vị trí & góc xoay của bia tại thời điểm rìu bay tới (cộng 0.72s lấy đà)
  const predTarget = tFly => {
    const tHit = state.tg.t + 0.72 + tFly * slow;
    const px = Math.sin(tHit * 0.8) * state.tg.ampX;
    const py = Math.max(TR_R + 0.1, 1.9 + Math.sin(tHit * 1.1) * state.tg.amp);
    const rz = TR.rotation.z + state.tg.rs * (0.72 + tFly * slow);
    const c = Math.cos(rz);
    const s = Math.sin(rz);
    return {
      tx: px + lx * c - ly * s,
      ty: py + lx * s + ly * c
    };
  };

  // Giải quỹ đạo 3D cho một mức lực pTry để lấy (yaw, el, tFly, thHit) chính xác
  const solveForP = pTry => {
    const spTry = (10 + pTry * 18) / Math.sqrt(effMass);
    let tFlyEst = Math.max(0.2, (dist - cfg.tipZ) / spTry);
    let yaw = 0;
    let lo = 0;
    let hi = 0.95;
    let reached = false;
    for (let pass = 0; pass < 2; pass++) {
      const { tx, ty } = predTarget(tFlyEst);
      yaw = Math.max(-0.45, Math.min(0.45, Math.atan2(tx - ORIGIN.x, dist - cfg.tipZ)));
      lo = 0;
      hi = 0.95;
      for (let it = 0; it < 12; it++) {
        const mid = (lo + hi) * 0.5;
        const pit = 0.05 + mid * 0.65;
        const pos = ORIGIN.clone();
        const vel = new THREE.Vector3(
          spTry * Math.cos(pit) * Math.sin(yaw),
          spTry * Math.sin(pit),
          -spTry * Math.cos(pit) * Math.cos(yaw)
        );
        let s = 0;
        for (; s < 260 && pos.z > hitZ + cfg.tipZ && pos.y > 0; s++) {
          vel.y -= state.phys.grav * 0.01;
          vel.multiplyScalar(1 - (state.phys.drag / effMass) * 0.01);
          pos.addScaledVector(vel, 0.01);
        }
        tFlyEst = s * 0.01;
        if (pos.z <= hitZ + cfg.tipZ && Math.abs(pos.y - ty) < 0.35) reached = true;
        if (pos.z > hitZ + cfg.tipZ || pos.y < ty) lo = mid;
        else hi = mid;
      }
    }
    const el = (lo + hi) * 0.5;
    const pitEst = 0.05 + el * 0.65;
    const spin = -(4.0 + pTry * 13.5) * (0.85 + pitEst * 0.55) / Math.pow(effMass, 0.35);
    const thHit = 0.9 + spin * tFlyEst;
    const angScore = cfg.key === 'axe_double'
      ? Math.max(Math.abs(Math.sin(thHit)), Math.cos(thHit))
      : cfg.key === 'axe_tomahawk'
        ? Math.cos(thHit + 0.35)
        : Math.cos(thHit);
    return { p: pTry, yaw, el, score: (reached ? 2 : 0) + angScore + pTry * 0.15 };
  };

  // 3. Quét 20 mức lực để chọn cú ném vừa tới bia vừa có góc lưỡi cắm đẹp nhất
  let best = solveForP(0.7);
  for (let i = 0; i <= 20; i++) {
    const cand = solveForP(minP + ((1.0 - minP) * i) / 20);
    if (cand.score > best.score) best = cand;
  }

  const dx = -best.yaw / 0.45 * MAX_PULL;
  const dy = (best.el - 0.35) * MAX_PULL;
  startThrow(dx, dy, best.p);
}

function fail() {
  if (state.cur && !state.cur.failed) {
    state.cur.failed = true;
    state.streak = 0;
    updHUD();
  }
}

function chips(p, n, mat = chipMat, speed = 3, comic = true) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(chipGeo, mat);
    if (comic) m.add(new THREE.Mesh(chipOutlineGeo, chipOutlineMat));
    m.position.copy(p);
    scene.add(m);
    state.chipsL.push({
      m,
      v: new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed, Math.random() * speed),
      l: 0.55 + Math.random() * 0.45
    });
  }
}

function spawnRing(p, color = 0x00f0ff, maxScale = 4.5) {
  const ox = p.x - T.position.x;
  const oy = p.y - T.position.y;
  const mat = createToonRingMaterial(color, ox, oy, TR_R - 0.02);
  const m = new THREE.Mesh(ringGeo, mat);
  m.position.set(ox, oy, state.targetFrontZ + 0.03);
  T.add(m);
  state.fx.push({ m, t: 0, dur: 0.36, maxScale });
}

function impactScale(a) {
  const spd = a.v ? a.v.length() : 14;
  return Math.min(1.65, Math.max(0.45, (spd * Math.sqrt(a.mass || 1)) / 17));
}

function bounce(a, tip, hitTarget = true, kind = 'target', nx = 0, nz = 1) {
  const imp = impactScale(a);
  a.mode = 'fall';
  const m = a.mass || 1;
  const offX = tip.x - T.position.x;
  const dirX = Math.abs(nx) > 0.1
    ? Math.sign(nx)
    : (Math.abs(offX) > 0.05 ? Math.sign(offX) : (Math.random() < 0.5 ? -1 : 1));
  const dirZ = Math.abs(nz) > 0.1 ? Math.sign(nz) : 1;
  // Lực bật nảy & mô-men xoắn phụ thuộc pháp tuyến va chạm và quán tính (khối lượng)
  a.v.set(
    (dirX * (1.2 + Math.random() * 1.4) + (Math.random() - 0.5) * 0.8) / Math.sqrt(m),
    (1.5 + Math.random() * 1.1) / Math.pow(m, 0.35),
    (dirZ * (1.8 + Math.random() * 1.0)) / Math.sqrt(m)
  );
  a.sp = -a.sp * 0.55;
  a.rollSp = (dirX * (3.2 + Math.random() * 2.2)) / m;
  a.yawSp = (dirX * (2.4 + Math.random() * 2.0)) / m;
  fail();
  if (kind === 'tree' || kind === 'stand') {
    SFX.woodHit(0.6);
    chips(tip, 6, chipMat, 3.8, hitTarget);
  } else if (kind === 'bonfire') {
    SFX.bounce();
    chips(tip, 7, emberMat, 4.4, false);
  } else if (kind === 'rock') {
    SFX.bounce();
    chips(tip, 6, stoneMat, 4.0, false);
  } else {
    SFX.bounce();
    chips(tip, 6, sparkMat, 4.2, hitTarget);
  }
  if (hitTarget) {
    state.tgRecoil = Math.max(state.tgRecoil, 0.05 * imp);
    state.tgWobble.amp = Math.max(state.tgWobble.amp, 0.09 * imp);
    state.tgWobble.freq = 22 + imp * 9;
    state.tgWobble.t = 0;
    state.tgWobble.dirX = Math.max(-1, Math.min(1, offX / TR_R));
    state.tgWobble.dirY = Math.max(-1, Math.min(1, (tip.y - T.position.y) / TR_R));
  }
}

function stick(a, tip) {
  const dx = tip.x - T.position.x;
  const dy = tip.y - T.position.y;
  const d = Math.hypot(dx, dy);
  const r = TR.rotation.z;
  const c = Math.cos(r);
  const s = Math.sin(r);

  let lx = dx * c + dy * s;
  let ly = -dx * s + dy * c;
  const rr = Math.hypot(lx, ly);
  if (rr > TR_R - 0.14) {
    const sc = (TR_R - 0.14) / rr;
    lx *= sc;
    ly *= sc;
  }

  const m = makeAxe(a.typeKey);
  const piv = new THREE.Group();
  const flip = a.typeKey === 'axe_double' && Math.sin(a.th) < 0 ? -1 : 1;
  const thN = Math.atan2(Math.sin(a.th), Math.cos(a.th));
  const imp = Math.max(-0.35, Math.min(0.25, thN * 0.4));
  const rx = (a.typeKey === 'axe_double' ? 0.85 * flip : imp) + (Math.random() - 0.5) * 0.06;
  const cM = Math.cos(rx);
  const sM = Math.sin(rx);
  const ty = a.tipY * flip;
  const offY = ty * cM + a.tipZ * sM;
  const offZ = ty * sM - a.tipZ * cM;

  piv.position.set(lx, ly, state.targetFrontZ - 0.09);
  piv.rotation.z = -r + (Math.random() - 0.5) * 0.12;
  m.position.set(0, -offY, -offZ);
  m.rotation.x = rx;
  piv.add(m);
  TR.add(piv);
  state.stuck.push({ lx, ly, m, piv });
  setLastStuck(piv);

  if (state.stuck.length > 5) {
    const old = state.stuck.shift();
    TR.remove(old.piv || old.m);
  }

  pushRecFrame(a, 0);

  let pts = 10;
  for (const [ringR, p] of RINGS) {
    if (d <= ringR) { pts = p; break; }
  }
  const bull = d <= BULL_R;
  state.streak++;
  const mul = state.streak >= 3 ? 2 : state.streak === 2 ? 1.5 : 1;
  const add = Math.round((pts + (bull ? BULL_BONUS : 0)) * mul);
  addScore(add);

  pop('+' + add, tip, bull ? '#ffd23f' : '#fff', bull ? 34 : 26);
  if (state.streak >= 2) pop('COMBO x' + mul, tip.clone().add(new THREE.Vector3(0, 0.5, 0)), '#ff8a3d', 22);
  if (bull) {
    pop('BULLSEYE!', T.position.clone().add(new THREE.Vector3(0, 1.8, 0)), '#ffd23f', 44);
    SFX.bull(state.streak);
  }
  SFX.stick(state.streak, pts);
  const woodCount = bull ? 20 : pts >= 50 ? 16 : 12;
  chips(tip, woodCount);
  if (bull || state.streak >= 2 || pts >= 50) {
    chips(tip, bull ? 18 : state.streak >= 2 ? 12 : 6, sparkMat, bull ? 6.2 : 5.0);
  }
  spawnRing(tip, bull ? 0x00ff9d : state.streak >= 2 ? 0xe879f9 : 0x00f0ff, bull ? 6.5 : 4.2);
  if (bull || state.streak >= 2) {
    spawnRing(tip, 0xfef08a, bull ? 4.2 : 2.6);
  }
  state.hitstop = Math.max(state.hitstop, bull ? 0.075 : state.streak >= 2 ? 0.045 : 0.025);
  const hudEl = document.getElementById('hud');
  if (hudEl) {
    hudEl.classList.remove('bump');
    void hudEl.offsetWidth;
    hudEl.classList.add('bump');
  }
  const impForce = impactScale(a);
  state.tgRecoil = Math.max(state.tgRecoil, (bull ? 0.17 : 0.10) * impForce);
  state.tgWobble.amp = Math.max(state.tgWobble.amp, (bull ? 0.23 : 0.14) * impForce);
  state.tgWobble.freq = 22 + impForce * 10;
  state.tgWobble.t = 0;
  state.tgWobble.dirX = Math.max(-1, Math.min(1, dx / TR_R));
  state.tgWobble.dirY = Math.max(-1, Math.min(1, dy / TR_R));
  state.lastSpin = (Math.abs(a.th - 0.9) / (Math.PI * 2)).toFixed(2);
  scene.remove(a.g);
  state.cur = null;
  state.settle = 0.6;
  updHUD();
}

function envBoxOf(c) {
  if (c.kind === 'bonfire') {
    return {
      minX: c.obj.position.x - c.halfX,
      maxX: c.obj.position.x + c.halfX,
      minY: 0,
      maxY: c.maxY,
      minZ: c.obj.position.z - c.halfZ,
      maxZ: c.obj.position.z + c.halfZ
    };
  }
  if (c.kind !== 'stand') return c.box;
  const sy = c.post ? c.post.scale.y : c.obj.scale.y;
  return {
    minX: c.local.minX + c.obj.position.x,
    maxX: c.local.maxX + c.obj.position.x,
    minY: c.local.minY * sy + c.obj.position.y,
    maxY: c.local.maxY * sy + c.obj.position.y,
    minZ: c.local.minZ + c.obj.position.z,
    maxZ: c.local.maxZ + c.obj.position.z
  };
}

/** Kiểm tra và phản hồi va chạm giữa hộp bao 3D của rìu với các model môi trường và rìu đã nằm trên đất. */
function collideEnv(a, minX, maxX, minY, maxY, minZ, maxZ) {
  const pushOut = (b, kind = 'other') => {
    if (maxX < b.minX || minX > b.maxX ||
        maxY < b.minY || minY > b.maxY ||
        maxZ < b.minZ || minZ > b.maxZ) return false;

    const penL = maxX - b.minX;
    const penR = b.maxX - minX;
    const penF = maxZ - b.minZ;
    const penB = b.maxZ - minZ;
    const minPenX = penL < penR ? -penL : penR;
    const minPenZ = penF < penB ? -penF : penB;

    if (a.mode === 'fly') {
      let nx = 0, nz = 0;
      if (Math.abs(minPenX) < Math.abs(minPenZ)) {
        a.p.x += minPenX;
        nx = Math.sign(minPenX) || 1;
      } else {
        a.p.z += minPenZ;
        nz = Math.sign(minPenZ) || 1;
      }
      bounce(a, a.p, kind === 'stand', kind, nx, nz);
      return true;
    }

    if (Math.abs(minPenX) < Math.abs(minPenZ)) {
      a.p.x += minPenX;
      a.v.x = -a.v.x * 0.45 + Math.sign(minPenX) * 0.6;
      a.rollSp += Math.sign(minPenX) * 1.8 / (a.mass || 1);
    } else {
      a.p.z += minPenZ;
      a.v.z = -a.v.z * 0.45 + Math.sign(minPenZ) * 0.6;
      a.yawSp += (Math.random() - 0.5) * 2.0 / (a.mass || 1);
    }
    return true;
  };

  for (let i = 0; i < ENV_COLLIDERS.length; i++) {
    const c = ENV_COLLIDERS[i];
    if (pushOut(envBoxOf(c), c.kind)) return true;
  }
  for (let i = 0; i < state.missed.length; i++) {
    const gb = state.missed[i].userData && state.missed[i].userData.groundBox;
    if (gb && pushOut(gb, 'missed')) return true;
  }
  return false;
}

export function stepAxe(dt) {
  const a = state.cur;
  const shape = getAxeShape(a.typeKey);
  for (let k = 0; k < 3 && state.cur; k++) {
    const h = dt / 3;
    if (a.mode === 'dead') {
      a.life -= h;
      if (a.life <= 0) {
        state.missed.push(a.g);
        if (state.missed.length > 5) scene.remove(state.missed.shift());
        state.cur = null;
        state.settle = 0.3;
      }
      continue;
    }

    if (a.mode === 'ground') {
      // Rìu chạm đất: trượt theo quán tính, trọng lực kéo thân rìu hạ xuống & ngã sang trái/phải sát mặt đất
      const m = a.mass || 1;
      a.v.x *= Math.max(0, 1 - 6 * h);
      a.v.z *= Math.max(0, 1 - 6 * h);
      a.v.y -= state.phys.grav * h;
      a.p.x += a.v.x * h;
      a.p.y += a.v.y * h;
      a.p.z += a.v.z * h;
      const pull = (a.targetRoll - a.roll) * (state.phys.grav / m) * 3.2;
      a.rollSp = (a.rollSp + pull * h) * Math.max(0, 1 - 5.0 * h);
      a.roll += a.rollSp * h;
      a.sp *= Math.max(0, 1 - 8 * h);
      a.th += a.sp * h;
      a.yawSp *= Math.max(0, 1 - 6 * h);
      a.yawAng += a.yawSp * h;

      const cThG = Math.cos(a.th);
      const sThG = Math.sin(a.th);
      const cRlG = Math.cos(a.roll);
      const sRlG = Math.sin(a.roll);
      const cPsG = Math.cos(a.yawAng);
      const sPsG = Math.sin(a.yawAng);
      let gMinY = Infinity;
      let gMinX = Infinity, gMaxX = -Infinity;
      let gMaxY = -Infinity;
      let gMinZ = Infinity, gMaxZ = -Infinity;
      for (let i = 0; i < shape.length; i++) {
        const pt = shape[i];
        const y1 = pt.y * cThG - pt.z * sThG;
        const z1 = pt.y * sThG + pt.z * cThG;
        const x2 = pt.x * cRlG - y1 * sRlG;
        const y2 = pt.x * sRlG + y1 * cRlG;
        const wx = a.p.x + x2 * cPsG + z1 * sPsG;
        const wy = a.p.y + y2;
        const wz = a.p.z - x2 * sPsG + z1 * cPsG;
        if (wy < gMinY) gMinY = wy;
        if (wy > gMaxY) gMaxY = wy;
        if (wx < gMinX) gMinX = wx; if (wx > gMaxX) gMaxX = wx;
        if (wz < gMinZ) gMinZ = wz; if (wz > gMaxZ) gMaxZ = wz;
      }
      if (gMinY < 0.02) {
        const dy = 0.02 - gMinY;
        a.p.y += dy;
        gMinY = 0.02;
        gMaxY += dy;
        if (a.v.y < 0) a.v.y = 0;
      }
      collideEnv(a, gMinX, gMaxX, gMinY, gMaxY, gMinZ, gMaxZ);

      a.life -= h;
      const settled = Math.abs(a.targetRoll - a.roll) < 0.05 && Math.abs(a.rollSp) < 0.35 && gMinY <= 0.03;
      if (settled || a.life <= 0) {
        a.roll = a.targetRoll;
        const cRlF = Math.cos(a.roll);
        const sRlF = Math.sin(a.roll);
        let fMinY = Infinity, fMaxY = -Infinity;
        let fMinX = Infinity, fMaxX = -Infinity;
        let fMinZ = Infinity, fMaxZ = -Infinity;
        for (let i = 0; i < shape.length; i++) {
          const pt = shape[i];
          const y1 = pt.y * cThG - pt.z * sThG;
          const z1 = pt.y * sThG + pt.z * cThG;
          const x2 = pt.x * cRlF - y1 * sRlF;
          const y2 = pt.x * sRlF + y1 * cRlF;
          const wx = a.p.x + x2 * cPsG + z1 * sPsG;
          const wy = a.p.y + y2;
          const wz = a.p.z - x2 * sPsG + z1 * cPsG;
          if (wy < fMinY) fMinY = wy; if (wy > fMaxY) fMaxY = wy;
          if (wx < fMinX) fMinX = wx; if (wx > fMaxX) fMaxX = wx;
          if (wz < fMinZ) fMinZ = wz; if (wz > fMaxZ) fMaxZ = wz;
        }
        if (Number.isFinite(fMinY)) {
          const dy = 0.02 - fMinY;
          a.p.y += dy;
          fMinY += dy;
          fMaxY += dy;
          const oldX = a.p.x, oldZ = a.p.z;
          collideEnv(a, fMinX, fMaxX, fMinY, fMaxY, fMinZ, fMaxZ);
          const dx = a.p.x - oldX, dz = a.p.z - oldZ;
          a.g.userData = a.g.userData || {};
          a.g.userData.groundBox = {
            minX: fMinX + dx, maxX: fMaxX + dx,
            minY: fMinY, maxY: fMaxY,
            minZ: fMinZ + dz, maxZ: fMaxZ + dz
          };
        }
        a.mode = 'dead';
        a.life = 0.2;
      }
      a.g.position.copy(a.p);
      a.g.rotation.y = a.yawAng;
      a.g.rotation.z = a.roll;
      a.inner.rotation.x = a.th;
      continue;
    }

    const mCur = a.mass || 1;
    a.v.y -= state.phys.grav * h;
    a.v.multiplyScalar(1 - (state.phys.drag / mCur) * h);
    a.p.addScaledVector(a.v, h);
    // Trọng lực tác động lên trọng tâm lệch ở đầu rìu + lực cản khí động tạo mô-men xoắn tăng tốc xoay
    a.sp -= (state.phys.grav * 0.35 * Math.cos(a.th) + Math.max(0, -a.v.y) * 0.12) * h / mCur;
    a.th += a.sp * h;
    if (a.mode === 'fly') state.lastSpin = (Math.abs(a.th - 0.9) / (Math.PI * 2)).toFixed(2);
    if (a.mode === 'fall') {
      a.roll += a.rollSp * h;
      a.yawAng += a.yawSp * h;
    } else if (a.mode === 'fly') {
      a.roll += a.rollSp * h * 0.25;
    }

    const tip = tipOf(a);
    const tipIn = tipOf(a, a.tipY * 0.35, a.tipZ * 0.42);
    pushTrailPoint(tip, tipIn);

    // Biến đổi toàn bộ tập điểm 3D của cây rìu sang không gian thế giới
    const psi = a.mode === 'fly' && a.v.x * a.v.x + a.v.z * a.v.z > 1e-4
      ? Math.atan2(-a.v.x, -a.v.z)
      : a.g.rotation.y;
    const cTh = Math.cos(a.th);
    const sTh = Math.sin(a.th);
    const cRl = Math.cos(a.roll);
    const sRl = Math.sin(a.roll);
    const cPsi = Math.cos(psi);
    const sPsi = Math.sin(psi);

    const hitZ = T.position.z + state.targetFrontZ;
    const r = TR.rotation.z;
    const cR = Math.cos(r);
    const sR = Math.sin(r);

    let minY = a.p.y;
    let minBladeY = Infinity;
    let minBodyY = Infinity;
    let axeMinX = Infinity, axeMaxX = -Infinity;
    let axeMinY = Infinity, axeMaxY = -Infinity;
    let axeMinZ = Infinity, axeMaxZ = -Infinity;
    let bestBlade = null;
    let bestBody = null;

    for (let i = 0; i < shape.length; i++) {
      const pt = shape[i];
      // Xoay quanh X (a.th), rồi Z (a.roll), rồi Y (psi) và tịnh tiến theo a.p
      const y1 = pt.y * cTh - pt.z * sTh;
      const z1 = pt.y * sTh + pt.z * cTh;
      const x2 = pt.x * cRl - y1 * sRl;
      const y2 = pt.x * sRl + y1 * cRl;
      const wx = a.p.x + x2 * cPsi + z1 * sPsi;
      const wy = a.p.y + y2;
      const wz = a.p.z - x2 * sPsi + z1 * cPsi;

      if (wy < minY) minY = wy;
      if (pt.blade && wy < minBladeY) minBladeY = wy;
      if (!pt.blade && wy < minBodyY) minBodyY = wy;
      if (wx < axeMinX) axeMinX = wx; if (wx > axeMaxX) axeMaxX = wx;
      if (wy < axeMinY) axeMinY = wy; if (wy > axeMaxY) axeMaxY = wy;
      if (wz < axeMinZ) axeMinZ = wz; if (wz > axeMaxZ) axeMaxZ = wz;

      if (a.mode === 'fly' && wz <= hitZ && wz >= hitZ - 0.45) {
        const dx = wx - T.position.x;
        const dy = wy - T.position.y;
        if (Math.hypot(dx, dy) <= TR_R) {
          if (pt.blade) {
            if (!bestBlade || wz < bestBlade.z) bestBlade = new THREE.Vector3(wx, wy, wz);
          } else if (!bestBody || wz < bestBody.z) {
            bestBody = new THREE.Vector3(wx, wy, wz);
          }
        }
      }
    }

    if (a.mode === 'fly' && (bestBlade || bestBody)) {
      const okAng = a.typeKey === 'axe_double'
        ? (Math.abs(Math.sin(a.th)) > 0.12 || Math.cos(a.th) > -0.25)
        : a.typeKey === 'axe_tomahawk'
          ? Math.cos(a.th + 0.35) > -0.40
          : Math.cos(a.th) > -0.60;
      let hitStuck = false;
      if (bestBlade) {
        const dx = bestBlade.x - T.position.x;
        const dy = bestBlade.y - T.position.y;
        const lx = dx * cR + dy * sR;
        const ly = -dx * sR + dy * cR;
        hitStuck = state.stuck.some(o => Math.hypot(o.lx - lx, o.ly - ly) < 0.18);
      }
      if (!hitStuck && bestBlade && okAng) {
        stick(a, bestBlade);
        return;
      }
      bounce(a, bestBody || bestBlade);
    }

    // Kiểm tra va chạm với khối bao 3D của các model môi trường & rìu trên đất khi bay hoặc văng (fall)
    if (a.mode === 'fly' || a.mode === 'fall') {
      collideEnv(a, axeMinX, axeMaxX, axeMinY, axeMaxY, axeMinZ, axeMaxZ);
      if (a.mode === 'fall' &&
          axeMinZ <= hitZ + 0.05 && axeMaxZ >= hitZ - 0.35 &&
          Math.hypot(a.p.x - T.position.x, a.p.y - T.position.y) <= TR_R + 0.15) {
        a.p.z = hitZ + 0.15;
        a.v.z = Math.max(0.8, Math.abs(a.v.z) * 0.4);
      }
    }

    a.pz = tip.z;
    if (a.mode !== 'dead' && a.mode !== 'ground' && minY < 0.05) {
      if (a.mode === 'fly') pop(tr('miss'), new THREE.Vector3(a.p.x, 0.4, a.p.z), '#ffb3a0', 24);
      fail();
      const bladeFirst = minBladeY < 0.06 && minBladeY <= minBodyY - 0.18 && a.v.y < -2.5;
      if (bladeFirst) {
        // Lưỡi rìu cắm sâu xuống đất tùy theo vận tốc rơi
        const sink = 0.18 + Math.min(0.10, Math.abs(a.v.y) * 0.012);
        const dy = -sink - minBladeY;
        a.p.y += dy;
        a.v.set(0, 0, 0);
        a.sp = 0;
        a.rollSp = 0;
        a.yawSp = 0;
        a.g.userData = a.g.userData || {};
        a.g.userData.groundBox = {
          minX: axeMinX, maxX: axeMaxX,
          minY: minY + dy, maxY: axeMaxY + dy,
          minZ: axeMinZ, maxZ: axeMaxZ
        };
        a.mode = 'dead';
        a.life = 0.35;
        SFX.thud();
        chips(new THREE.Vector3(a.p.x, 0.05, a.p.z), 10, dirtMat, 3.0);
      } else {
        const m = a.mass || 1;
        const side = Math.abs(a.roll) > 0.04
          ? Math.sign(a.roll)
          : Math.abs(a.v.x) > 0.2
            ? Math.sign(a.v.x)
            : (Math.random() < 0.5 ? -1 : 1);
        a.mode = 'ground';
        a.life = 1.6;
        a.p.y += 0.02 - minY;
        a.v.y = 0;
        a.v.x *= 0.4;
        a.v.z *= 0.3;
        a.targetRoll = side * Math.PI * 0.5;
        a.rollSp = (a.rollSp || 0) * 0.4 + side * (2.6 / m);
        SFX.thud();
        chips(a.p, 5, dirtMat, 2.4);
      }
    }

    if (a.p.z < -90 || Math.abs(a.p.x) > 60) {
      fail();
      scene.remove(a.g);
      state.cur = null;
      state.settle = 0.3;
    }

    if (state.cur) {
      a.g.position.copy(a.p);
      if (a.mode === 'fly' && a.v.x * a.v.x + a.v.z * a.v.z > 1e-4) {
        a.yawAng = psi;
      }
      a.g.rotation.y = a.yawAng;
      a.g.rotation.z = a.roll;
      a.inner.rotation.x = a.th;
    }
  }
}

export function stepChips(dt) {
  for (const c of state.chipsL) {
    c.v.y -= 12 * dt;
    c.m.position.addScaledVector(c.v, dt);
    c.m.rotation.x += 8 * dt;
    c.m.rotation.y += 6 * dt;
    c.l -= dt;
    if (c.l <= 0) scene.remove(c.m);
  }
  state.chipsL = state.chipsL.filter(c => c.l > 0);

  for (const f of state.fx) {
    f.t += dt;
    const u = Math.min(1, f.t / f.dur);
    const sc = 1 + u * f.maxScale;
    f.m.scale.setScalar(sc);
    if (f.m.material.uniforms?.uProgress) f.m.material.uniforms.uProgress.value = u;
    if (f.m.material.uniforms?.uScale) f.m.material.uniforms.uScale.value = sc;
    if (f.t >= f.dur) {
      if (f.m.parent) f.m.parent.remove(f.m);
      f.m.material.dispose();
    }
  }
  state.fx = state.fx.filter(f => f.t < f.dur);
}
