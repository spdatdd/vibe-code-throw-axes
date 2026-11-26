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
  stick: (streak = 1, pts = 10) => {
    tone('sine', 185, 45, 0.18, 0.85);
    tone('triangle', 290, 90, 0.08, 0.35);
    noise(0.09, 1400, 320, 0.38);
    const semi = Math.min(Math.max(0, streak - 1), 8) * 2 + (pts >= 100 ? 4 : pts >= 50 ? 2 : 0);
    const f = 440 * Math.pow(2, semi / 12);
    tone('triangle', f, f * 1.03, 0.16, 0.24);
    if (streak >= 2 || pts >= 50) {
      setTimeout(() => tone('sine', f * 1.5, f * 1.52, 0.18, 0.18), 45);
    }
  },
  bounce: () => {
    tone('square', 900, 500, 0.12, 0.15);
    noise(0.05, 3000, 2000, 0.2);
  },
  thud: () => tone('sine', 90, 40, 0.15, 0.5),
  bull: (streak = 1) => {
    const mul = Math.pow(2, Math.min(Math.max(0, streak - 1), 5) / 12);
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      setTimeout(() => {
        tone('triangle', f * mul, f * mul * 1.015, 0.22, 0.28);
        if (i === 3) tone('sine', f * mul * 2, f * mul * 2.01, 0.28, 0.16);
      }, i * 65)
    );
  },
  thunder: () => {
    if (!ac) return;
    const t = ac.currentTime;
    const s = ac.createBufferSource();
    const f = ac.createBiquadFilter();
    const n = ac.createGain();
    s.buffer = nb;
    s.loop = true;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(190, t);
    f.frequency.exponentialRampToValueAtTime(48, t + 1.1);
    n.gain.setValueAtTime(0.01, t);
    n.gain.linearRampToValueAtTime(0.28, t + 0.08);
    n.gain.exponentialRampToValueAtTime(0.001, t + 1.15);
    s.connect(f).connect(n).connect(ac.destination);
    s.start(t);
    s.stop(t + 1.15);
  }
};
