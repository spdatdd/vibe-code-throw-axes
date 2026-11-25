import { CAM_Y, TIME_MODES } from './constants.js';
import { state } from './state.js';

// ================= CẢNH 3D =================
export const R = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
R.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.prepend(R.domElement);

export const scene = new THREE.Scene();
const SKY = 0xffc88a;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 25, 110);

export const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
cam.position.set(0, CAM_Y, 0);
scene.add(cam);

const hemi = new THREE.HemisphereLight(0xfff0d0, 0x6a4a2a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 0.8);
sun.position.set(-5, 10, 6);
scene.add(sun);

export const M = (c, em = 0) => new THREE.MeshLambertMaterial({ color: c, emissive: em, flatShading: true });

const ground = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), M(0x6a8a35));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const lane = new THREE.Mesh(new THREE.PlaneGeometry(5, 120), M(0x8a6a3a));
lane.rotation.x = -Math.PI / 2;
lane.position.set(0, 0.01, -45);
scene.add(lane);

const sunBall = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff3c4, fog: false }));
scene.add(sunBall);

const moonBall = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xe6efff, fog: false }));
scene.add(moonBall);

// Bầu trời sao (~350 ngôi sao hiện dần vào ban đêm)
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.1, transparent: true, opacity: 0, fog: false });
{
  const sp = [];
  for (let i = 0; i < 350; i++) {
    const th = Math.random() * Math.PI * 2;
    const ph = Math.random() * Math.PI * 0.42 + 0.05;
    const r = 145;
    sp.push(r * Math.cos(ph) * Math.cos(th), r * Math.sin(ph) + 8, r * Math.cos(ph) * Math.sin(th));
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, starMat));
}

// 2 đống lửa trại (bonfire) hai bên bia để thắp sáng đích
const bonfires = [];
{
  const stoneM = M(0x5a5e5a);
  const logM = M(0x4a2c16);
  const f1M = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.8, fog: false });
  const f2M = new THREE.MeshBasicMaterial({ color: 0xffdf55, fog: false });
  const stG = new THREE.DodecahedronGeometry(0.14, 0);
  const lgG = new THREE.CylinderGeometry(0.06, 0.07, 0.72, 6);
  const flG = new THREE.ConeGeometry(0.24, 0.75, 6);

  for (const side of [-1, 1]) {
    const bf = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const st = new THREE.Mesh(stG, stoneM);
      st.position.set(Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38);
      bf.add(st);
    }
    for (let i = 0; i < 4; i++) {
      const lg = new THREE.Mesh(lgG, logM);
      lg.position.y = 0.12;
      lg.rotation.set(Math.PI / 2 - 0.22, i * Math.PI / 2, 0);
      bf.add(lg);
    }
    const f1 = new THREE.Mesh(flG, f1M);
    f1.position.y = 0.42;
    const f2 = new THREE.Mesh(flG, f2M);
    f2.position.y = 0.38;
    f2.scale.set(0.62, 0.82, 0.62);
    const lt = new THREE.PointLight(0xff8c32, 0, 15);
    lt.position.set(0, 1.1, 0);
    bf.add(f1, f2, lt);
    bf.position.set(side * 3.25, 0, -14.4);
    scene.add(bf);
    bonfires.push({ g: bf, f1, f2, lt, side, ph: side > 0 ? 1.7 : 0 });
  }
}

const clouds = [];
const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false });
{
  const cg = new THREE.SphereGeometry(1, 8, 6);
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    for (let j = 0; j < 3; j++) {
      const p = new THREE.Mesh(cg, cloudMat);
      p.position.set((j - 1) * 2.4, j === 1 ? 0.5 : 0, 0);
      p.scale.set(2.4, 1.1, 1.5);
      g.add(p);
    }
    g.position.set((Math.random() - 0.5) * 170, 28 + Math.random() * 14, -35 - Math.random() * 85);
    g.scale.setScalar(0.9 + Math.random() * 1.1);
    scene.add(g);
    clouds.push({ g, sp: 1.2 + Math.random() * 1.4 });
  }
}

export const trees = [];

export function fit() {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}

const SKY_DAY = new THREE.Color(0x88c9ff);
const SKY_SUNSET = new THREE.Color(0xff9b66);
const SKY_NIGHT = new THREE.Color(0x0c1428);
const _skyC = new THREE.Color();
let skyT = 0;

export function updateAtmosphere(dt) {
  skyT += dt;
  const mode = TIME_MODES[state.tmIdx].k;
  const ang = mode === 'day' ? Math.PI / 2 : mode === 'night' ? -Math.PI / 2 : skyT * 0.045 + 0.55;
  const sy = Math.sin(ang) + (mode === 'auto' ? 0.28 : 0);
  const cx = Math.cos(ang);

  sunBall.position.set(-45 * cx, 55 * sy, -110);
  moonBall.position.set(45 * cx, -55 * sy, -110);
  sunBall.visible = sy > -0.15;
  moonBall.visible = sy < 0.15;

  if (sy >= 0.15) {
    _skyC.copy(SKY_SUNSET).lerp(SKY_DAY, Math.min(1, (sy - 0.15) / 0.45));
  } else if (sy > -0.15) {
    _skyC.copy(SKY_NIGHT).lerp(SKY_SUNSET, (sy + 0.15) / 0.3);
  } else {
    _skyC.copy(SKY_NIGHT);
  }

  scene.background.copy(_skyC);
  scene.fog.color.copy(_skyC);

  const dayF = Math.max(0, Math.min(1, (sy + 0.15) / 0.5));
  hemi.intensity = 0.35 + 0.65 * dayF;
  sun.intensity = 0.15 + 0.75 * dayF;
  sun.position.set(-12 * cx, Math.max(4, 18 * sy), 8);
  starMat.opacity = Math.max(0, Math.min(1, (-0.05 - sy) / 0.35));
  cloudMat.color.copy(_skyC).lerp(new THREE.Color(0xffffff), 0.55 + 0.35 * dayF);

  for (const cl of clouds) {
    cl.g.position.x += cl.sp * dt;
    if (cl.g.position.x > 90) cl.g.position.x = -90;
  }
  for (const tr of trees) {
    tr.m.rotation.z = Math.sin(skyT * 1.3 * tr.sp + tr.ph) * 0.032;
    tr.m.rotation.x = Math.cos(skyT * 1.0 * tr.sp + tr.ph) * 0.015;
  }

  const nightF = Math.max(0, Math.min(1, (-0.05 - sy) / 0.25));
  for (const bf of bonfires) {
    bf.g.position.z = state.tg.z + 0.6;
    const fl = 0.85 + Math.sin(skyT * 15 + bf.ph) * 0.18 + Math.cos(skyT * 23 + bf.ph) * 0.12;
    const lit = nightF > 0.02;
    bf.f1.visible = bf.f2.visible = lit;
    if (lit) {
      bf.f1.scale.set(1, fl * nightF, 1);
      bf.f2.scale.set(0.62, 0.75 * fl * nightF, 0.62);
    }
    bf.lt.intensity = lit ? 1.4 * nightF * fl : 0;
  }
}
