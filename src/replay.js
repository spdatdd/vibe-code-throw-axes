import { $, CAM_Y, REP_SPDS } from './constants.js';
import { state } from './state.js';
import { scene } from './scene.js';
import { makeAxe, T, TR, standGrp, standPost } from './assets.js';
import { tipOf } from './aim.js';
import { clearTrail, setTrailPoints } from './render.js';

// ================= XEM LẠI & LƯU VIDEO =================
let rec = [];
let recT = 0;
let lastRec = null;
let lastType = 'axe';
let lastStuck = null;
let repIdx = -1;
let repPlay = false;
let repAxe = null;
let repInner = null;
let repT = 0;
let repSpdIdx = 1;
let savedTarget = null;

export function getReplayState() {
  return { lastRec, repIdx, repPlay };
}

export function setLastStuck(piv) {
  lastStuck = piv;
}

export function clearLastRec() {
  lastRec = null;
}

export function setReplayPlay(val) {
  repPlay = val;
  $('repPlay').textContent = val ? '⏸' : '▶';
}

export function stopReplay() {
  repIdx = -1;
  repPlay = false;
  if (lastStuck) lastStuck.visible = true;
  if (repAxe) {
    scene.remove(repAxe);
    repAxe = null;
    repInner = null;
  }
  if (savedTarget) {
    T.position.copy(savedTarget.pos);
    TR.rotation.z = savedTarget.rz;
    standGrp.position.x = savedTarget.standX;
    standPost.scale.y = savedTarget.postY;
    savedTarget = null;
  }
  $('repPlay').textContent = '▶';
  $('repBar').style.display = 'none';
  clearTrail();
}

export function startRec(typeKey) {
  stopReplay();
  $('repBar').style.display = 'none';
  $('rp').style.display = 'none';
  rec = [];
  recT = 0;
  lastStuck = null;
  lastType = typeKey;
}

export function pushRecFrame(axe, dt = 0) {
  recT += dt;
  rec.push({
    p: axe.p.clone(),
    tip: tipOf(axe),
    tipIn: tipOf(axe, axe.tipY * 0.35, axe.tipZ * 0.42),
    ry: axe.g.rotation.y,
    rz: axe.g.rotation.z,
    th: axe.th,
    tz: T.position.clone(),
    trz: TR.rotation.z,
    cp: (state.followCam ? state.followPos : new THREE.Vector3(0, CAM_Y, 0)).clone(),
    cl: (state.followCam ? state.followLook : new THREE.Vector3(0, CAM_Y, -15)).clone(),
    t: recT
  });
}

export function finishRec() {
  if (rec.length < 2) return;
  lastRec = { frames: rec, typeKey: lastType, streak: state.streak };
  const sb = $('repScrub');
  sb.max = rec.length - 1;
  sb.value = rec.length - 1;
  $('repTime').textContent = rec[rec.length - 1].t.toFixed(2) + 's';
  $('rp').style.display = state.devMode ? 'inline-flex' : 'none';
}

export function applyReplay(idx) {
  if (!lastRec || !lastRec.frames.length) return;
  if (repIdx < 0 && !savedTarget) {
    savedTarget = {
      pos: T.position.clone(),
      rz: TR.rotation.z,
      standX: standGrp.position.x,
      postY: standPost.scale.y
    };
  }
  repIdx = Math.max(0, Math.min(lastRec.frames.length - 1, idx));
  if (!repAxe) {
    repAxe = new THREE.Group();
    repInner = makeAxe(lastRec.typeKey);
    repAxe.add(repInner);
    scene.add(repAxe);
  }
  const f = lastRec.frames[repIdx];
  const atEnd = repIdx === lastRec.frames.length - 1;
  repAxe.visible = !(lastStuck && atEnd);
  if (lastStuck) lastStuck.visible = atEnd;
  repAxe.position.copy(f.p);
  repAxe.rotation.y = f.ry;
  repAxe.rotation.z = f.rz || 0;
  repInner.rotation.x = f.th;
  T.position.copy(f.tz);
  TR.rotation.z = f.trz;
  standGrp.position.set(T.position.x, 0, state.tg.z - 0.32);
  standPost.scale.y = T.position.y / 1.9;
  repT = f.t;
  const startIdx = Math.max(0, repIdx - 22);
  const pts = [];
  for (let i = startIdx; i <= repIdx; i++) {
    const fr = lastRec.frames[i];
    const curOut = fr.tip || fr.p;
    const curIn = fr.tipIn || fr.p;
    if (i > startIdx) {
      const pfr = lastRec.frames[i - 1];
      const prevOut = pfr.tip || pfr.p;
      const prevIn = pfr.tipIn || pfr.p;
      pts.push({
        out: prevOut.clone().lerp(curOut, 0.5),
        in: prevIn.clone().lerp(curIn, 0.5)
      });
    }
    pts.push({ out: curOut.clone(), in: curIn.clone() });
  }
  setTrailPoints(pts, lastRec.typeKey, lastRec.streak ?? 0);
  $('repScrub').value = repIdx;
  $('repTime').textContent = f.t.toFixed(2) + 's';
}

export function stepReplay(dt) {
  if (!repPlay || !lastRec || repIdx < 0) return;
  repT += dt * REP_SPDS[repSpdIdx];
  const fs = lastRec.frames;
  let nxt = repIdx;
  while (nxt < fs.length - 1 && fs[nxt + 1].t <= repT) nxt++;
  if (nxt !== repIdx) applyReplay(nxt);
  if (repIdx >= fs.length - 1) {
    applyReplay(0);
    repT = 0;
  }
}

export function bindReplayUI() {
  $('rp').onclick = () => {
    if (!lastRec || state.cur || state.thr) return;
    if ($('repBar').style.display === 'flex') {
      stopReplay();
      $('repBar').style.display = 'none';
    } else {
      $('repBar').style.display = 'flex';
      applyReplay(0);
      setReplayPlay(true);
    }
  };

  $('repScrub').oninput = e => {
    if (!lastRec || state.cur || state.thr) return;
    setReplayPlay(false);
    applyReplay(+e.target.value);
  };

  $('repPlay').onclick = () => {
    if (!lastRec || state.cur || state.thr) return;
    if (repIdx < 0 || repIdx >= lastRec.frames.length - 1) applyReplay(0);
    setReplayPlay(!repPlay);
  };

  $('repSpd').onclick = () => {
    repSpdIdx = (repSpdIdx + 1) % REP_SPDS.length;
    $('repSpd').textContent = REP_SPDS[repSpdIdx] + 'x';
  };

  $('repClose').onclick = () => {
    stopReplay();
    $('repBar').style.display = 'none';
  };
}
