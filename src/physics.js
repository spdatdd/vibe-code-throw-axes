import {
  AXE_TYPES, BULL_BONUS, BULL_R, DRAG, GRAV, MAX_PULL, ORIGIN, RINGS, TR_R
} from './constants.js';
import { state, addScore } from './state.js';
import { SFX } from './audio.js';
import { scene, M } from './scene.js';
import { makeAxe, T, TR } from './assets.js';
import { pop, updHUD } from './hud.js';
import { aimVec, tipOf } from './aim.js';
import { startRec, pushRecFrame, setLastStuck } from './replay.js';
import { clearTrail, pushTrailPoint, setReadyVisible } from './render.js';

// ================= VẬT LÝ NÉM & VA CHẠM =================
const chipGeo = new THREE.BoxGeometry(0.06, 0.06, 0.06);
const chipMat = M(0xc98d4b);

// Chu kỳ animation ném rìu 3 giây (0–0.5s lấy đà, 0.5–0.72s vung & thả, 0.72–1.85s theo đà, 1.85–3.0s hồi về)
export function startThrow(dx, dy, hold) {
  const a = aimVec(dx, dy, hold);
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
    typeKey: AXE_TYPES[state.axeIdx].key
  };
}

export function launch(dx, dy, hold, typeKey) {
  startRec(typeKey);
  const a = aimVec(dx, dy, hold);
  const cfg = AXE_TYPES.find(x => x.key === typeKey) || AXE_TYPES[0];
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
    sp: -(5 + a.sp * 0.15),
    mode: 'fly',
    failed: false,
    life: 0.7,
    tipZ: cfg.tipZ,
    tipY: cfg.tipY,
    pz: ORIGIN.z - cfg.tipZ,
    typeKey
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
  const hitZ = T.position.z + state.targetFrontZ;
  const dist = ORIGIN.z - hitZ;
  const minP = Math.min(0.85, Math.max(0.30, (Math.sqrt(dist * GRAV * 1.45) - 10) / 18));
  const p = minP + Math.random() * (0.96 - minP);
  const sp = 10 + p * 18;
  let tx = T.position.x;
  let ty = T.position.y;

  for (let a = 0; a < 8; a++) {
    const cx = T.position.x + (Math.random() - 0.5) * 1.1;
    const cy = T.position.y + (Math.random() - 0.5) * 1.1;
    const r = TR.rotation.z;
    const c = Math.cos(r);
    const s = Math.sin(r);
    const lx = (cx - T.position.x) * c + (cy - T.position.y) * s;
    const ly = -(cx - T.position.x) * s + (cy - T.position.y) * c;
    if (!state.stuck.some(o => Math.hypot(o.lx - lx, o.ly - ly) < 0.42)) {
      tx = cx;
      ty = cy;
      break;
    }
  }

  const yaw = Math.max(-0.45, Math.min(0.45, Math.atan2(tx - ORIGIN.x, dist)));
  let lo = 0;
  let hi = 0.58;
  for (let it = 0; it < 14; it++) {
    const mid = (lo + hi) * 0.5;
    const pit = 0.05 + mid * 0.65;
    const pos = ORIGIN.clone();
    const vel = new THREE.Vector3(
      sp * Math.cos(pit) * Math.sin(yaw),
      sp * Math.sin(pit),
      -sp * Math.cos(pit) * Math.cos(yaw)
    );
    for (let s = 0; s < 220 && pos.z > hitZ && pos.y > 0; s++) {
      vel.y -= GRAV * 0.01;
      vel.multiplyScalar(1 - DRAG * 0.01);
      pos.addScaledVector(vel, 0.01);
    }
    if (pos.z > hitZ || pos.y < ty) lo = mid;
    else hi = mid;
  }

  const el = (lo + hi) * 0.5;
  const dx = -yaw / 0.45 * MAX_PULL;
  const dy = (el - 0.35) * MAX_PULL;
  startThrow(dx, dy, p);
}

function fail() {
  if (state.cur && !state.cur.failed) {
    state.cur.failed = true;
    state.streak = 0;
    updHUD();
  }
}

function chips(p, n) {
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(chipGeo, chipMat);
    m.position.copy(p);
    scene.add(m);
    state.chipsL.push({
      m,
      v: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, Math.random() * 3),
      l: 0.6 + Math.random() * 0.5
    });
  }
}

function bounce(a, tip) {
  a.mode = 'fall';
  a.v.set((Math.random() - 0.5) * 2, 1.5 + Math.random(), 2 + Math.random());
  a.sp = -a.sp * 0.6;
  fail();
  SFX.bounce();
  chips(tip, 5);
  state.shake = Math.max(state.shake, 0.5);
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
  const flip = a.typeKey === 'axe_double' && Math.cos(a.th) < 0 ? -1 : 1;
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

  if (state.autoThrow && state.stuck.length > 10) {
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
    SFX.bull();
  }
  SFX.stick();
  chips(tip, 14);
  state.shake = Math.max(state.shake, bull ? 1.4 : 0.8);
  scene.remove(a.g);
  state.cur = null;
  state.settle = 0.6;
  updHUD();
}

export function stepAxe(dt) {
  const a = state.cur;
  for (let k = 0; k < 3 && state.cur; k++) {
    const h = dt / 3;
    if (a.mode === 'dead') {
      a.life -= h;
      if (a.life <= 0) {
        state.missed.push(a.g);
        if (state.missed.length > 25) scene.remove(state.missed.shift());
        state.cur = null;
        state.settle = 0.3;
      }
      continue;
    }

    a.v.y -= GRAV * h;
    a.v.multiplyScalar(1 - DRAG * h);
    a.p.addScaledVector(a.v, h);
    a.th += a.sp * h;

    const tip = tipOf(a);
    pushTrailPoint(tip);

    const hitZ = T.position.z + state.targetFrontZ;
    if (a.mode === 'fly') {
      const pts = a.typeKey === 'axe_double' ? [tip, tipOf(a, -a.tipY), a.p] : [tip, a.p];
      for (const tp of pts) {
        const maxZ = tp === a.p ? hitZ - 0.12 : hitZ;
        if (tp.z <= maxZ && tp.z >= hitZ - 0.35) {
          const dx = tp.x - T.position.x;
          const dy = tp.y - T.position.y;
          if (Math.hypot(dx, dy) <= TR_R) {
            const r = TR.rotation.z;
            const c = Math.cos(r);
            const s = Math.sin(r);
            const lx = dx * c + dy * s;
            const ly = -dx * s + dy * c;
            const hit = state.stuck.some(o => Math.hypot(o.lx - lx, o.ly - ly) < 0.34);
            const okAng = a.typeKey === 'axe_double'
              ? (Math.abs(Math.sin(a.th)) > 0.18 || Math.cos(a.th) > -0.1)
              : a.typeKey === 'axe_tomahawk'
                ? Math.cos(a.th + 0.35) > -0.25
                : Math.cos(a.th) > -0.45;
            if (!hit && okAng) {
              stick(a, tp === a.p ? tip : tp);
              return;
            }
            bounce(a, tp);
            break;
          }
        }
      }
    }

    a.pz = tip.z;
    if (a.mode !== 'dead' && Math.min(a.p.y, tip.y) < 0.05) {
      if (a.mode === 'fly') pop('Trượt!', new THREE.Vector3(a.p.x, 0.4, a.p.z), '#ffb3a0', 24);
      fail();
      a.mode = 'dead';
      a.v.set(0, 0, 0);
      a.sp = 0;
      SFX.thud();
      chips(a.p, 4);
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
        a.g.rotation.y = Math.atan2(-a.v.x, -a.v.z);
      }
      a.inner.rotation.x = a.th;
    }
  }
}

export function stepChips(dt) {
  for (const c of state.chipsL) {
    c.v.y -= 12 * dt;
    c.m.position.addScaledVector(c.v, dt);
    c.l -= dt;
    if (c.l <= 0) scene.remove(c.m);
  }
  state.chipsL = state.chipsL.filter(c => c.l > 0);
}
