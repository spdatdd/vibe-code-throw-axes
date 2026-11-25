// ================= ÂM THANH =================
let ac, nb;

export function initAudio() {
  if (ac) return;
  try {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    nb = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
    const d = nb.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) {
    ac = null;
  }
}

function tone(ty, f1, f2, dur, v) {
  if (!ac) return;
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const n = ac.createGain();
  o.type = ty;
  o.frequency.setValueAtTime(f1, t);
  o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  n.gain.setValueAtTime(v, t);
  n.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(n).connect(ac.destination);
  o.start(t);
  o.stop(t + dur);
}

function noise(dur, f1, f2, v) {
  if (!ac) return;
  const t = ac.currentTime;
  const s = ac.createBufferSource();
  const f = ac.createBiquadFilter();
  const n = ac.createGain();
  s.buffer = nb;
  f.type = 'bandpass';
  f.frequency.setValueAtTime(f1, t);
  f.frequency.exponentialRampToValueAtTime(f2, t + dur);
  n.gain.setValueAtTime(v, t);
  n.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(n).connect(ac.destination);
  s.start(t);
  s.stop(t + dur);
}

export const SFX = {
  whoosh: () => noise(0.35, 500, 2000, 0.5),
  stick: () => {
    tone('sine', 160, 50, 0.18, 0.9);
    noise(0.1, 1200, 300, 0.4);
  },
  bounce: () => {
    tone('square', 900, 500, 0.12, 0.15);
    noise(0.05, 3000, 2000, 0.2);
  },
  thud: () => tone('sine', 90, 40, 0.15, 0.5),
  bull: () => [660, 880, 1320].forEach((f, i) => setTimeout(() => tone('triangle', f, f * 1.01, 0.2, 0.3), i * 90))
};
