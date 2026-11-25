import { $, CAM_Y, REP_SPDS } from './constants.js';
import { state } from './state.js';
import { scene } from './scene.js';
import { makeAxe, T, TR, standGrp } from './assets.js';

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
  $('repPlay').textContent = '▶';
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
    ry: axe.g.rotation.y,
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
  lastRec = { frames: rec, typeKey: lastType };
  const sb = $('repScrub');
  sb.max = rec.length - 1;
  sb.value = rec.length - 1;
  $('repTime').textContent = rec[rec.length - 1].t.toFixed(2) + 's';
  $('rp').style.display = 'inline-block';
}

export function applyReplay(idx) {
  if (!lastRec || !lastRec.frames.length) return;
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
  repInner.rotation.x = f.th;
  T.position.copy(f.tz);
  TR.rotation.z = f.trz;
  standGrp.position.set(T.position.x, 0, state.tg.z - 0.32);
  standGrp.scale.y = T.position.y / 1.9;
  repT = f.t;
  $('repScrub').value = repIdx;
  $('repTime').textContent = f.t.toFixed(2) + 's';
}

export function stepReplay(dt) {
  if (!repPlay || !lastRec || repIdx < 0) return;
  repT += dt * REP_SPDS[repSpdIdx] * (state.followCam ? 0.42 : 1);
  const fs = lastRec.frames;
  let nxt = repIdx;
  while (nxt < fs.length - 1 && fs[nxt + 1].t <= repT) nxt++;
  if (nxt !== repIdx) applyReplay(nxt);
  if (repIdx >= fs.length - 1) {
    if (state.photoMode) {
      applyReplay(0);
      repT = 0;
    } else {
      setReplayPlay(false);
    }
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

  $('repSave').onclick = async () => {
    if (!lastRec || state.cur || state.thr) return;
    const btn = $('repSave');
    btn.disabled = true;
    btn.textContent = '⏺...';
    const chunks = [];
    const { R } = await import('./scene.js');
    const recStream = R.domElement.captureStream(30);
    const mr = new MediaRecorder(recStream, {
      mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    });
    mr.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
    mr.onstop = async () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      try {
        const r = await fetch('/save-video', { method: 'POST', body: blob });
        const j = await r.json();
        if (j.ok) {
          btn.textContent = '✅ ' + j.file;
          setTimeout(() => { btn.textContent = '🎬 Lưu'; }, 2500);
          btn.disabled = false;
          return;
        }
      } catch (e) {}
      const a = document.createElement('a');
      a.download = 'nem-riu-3d.webm';
      a.href = URL.createObjectURL(blob);
      a.click();
      btn.textContent = '🎬 Lưu';
      btn.disabled = false;
    };
    applyReplay(0);
    setReplayPlay(true);
    mr.start();
    const waitEnd = () => {
      if (repPlay && repIdx < lastRec.frames.length - 1) requestAnimationFrame(waitEnd);
      else setTimeout(() => mr.stop(), 200);
    };
    requestAnimationFrame(waitEnd);
  };

  $('repClose').onclick = () => {
    stopReplay();
    $('repBar').style.display = 'none';
  };
}
