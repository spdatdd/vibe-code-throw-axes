import { CAM_Y, TIME_MODES } from './constants.js';
import { state } from './state.js';
import { createGrassTexture, createLaneTexture, createStoneTexture, createWoodTexture } from './textures.js';
import { createFlameMaterial, createSkyDome, makeToonMaterial, botwShaderUniforms } from './shaders.js';
import { updateWeather, weatherGroup } from './weather.js';

// ================= CẢNH 3D =================
export const R = new THREE.WebGLRenderer({ antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 1.5));
R.shadowMap.enabled = true;
R.shadowMap.type = THREE.PCFShadowMap;
document.body.prepend(R.domElement);

export const scene = new THREE.Scene();
const SKY = 0xffc88a;
scene.background = new THREE.Color(SKY);
scene.fog = new THREE.Fog(SKY, 25, 110);

export const cam = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
cam.position.set(0, CAM_Y, 0);
scene.add(cam);
scene.add(weatherGroup);

const skyDome = createSkyDome();
scene.add(skyDome.mesh);

export const terrainShaderUniforms = {
  uTime: { value: 0 },
  uRainF: { value: 0 },
  uSnowF: { value: 0 },
  uWindAmp: { value: 1.0 },
  uDayF: { value: 1.0 }
};

const hemi = new THREE.HemisphereLight(0xfff0d0, 0x6a4a2a, 0.9);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b0, 0.8);
sun.position.set(-18, 22, -4);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -22;
sun.shadow.camera.right = 22;
sun.shadow.camera.top = 24;
sun.shadow.camera.bottom = -24;
sun.shadow.camera.near = 2;
sun.shadow.camera.far = 85;
sun.shadow.bias = -0.0008;
sun.target.position.set(0, 0, -16);
scene.add(sun);
scene.add(sun.target);

export const M = (c, em = 0) => makeToonMaterial({ color: c, emissive: em, flatShading: true });

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(300, 300),
  makeToonMaterial({ map: createGrassTexture() })
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const lane = new THREE.Mesh(
  new THREE.PlaneGeometry(5, 120),
  makeToonMaterial({ map: createLaneTexture() })
);
lane.rotation.x = -Math.PI / 2;
lane.position.set(0, 0.01, -45);
lane.receiveShadow = true;
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
export const bonfires = [];
{
  const stoneM = makeToonMaterial({ map: createStoneTexture('#5e625e'), flatShading: true });
  const logM = makeToonMaterial({ map: createWoodTexture('#4e2e16'), flatShading: true });
  const f1M = createFlameMaterial(false);
  const f2M = createFlameMaterial(true);
  const bfColM = new THREE.MeshBasicMaterial({ color: 0x9e7bff, transparent: true, opacity: 0.45, depthWrite: false, wireframe: true });
  const stG = new THREE.DodecahedronGeometry(0.14, 0);
  const lgG = new THREE.CylinderGeometry(0.06, 0.07, 0.72, 6);
  const flG = new THREE.ConeGeometry(0.24, 0.75, 6);
  const bfColG = new THREE.BoxGeometry(1.04, 0.85, 1.04);

  for (const side of [-1, 1]) {
    const bf = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const st = new THREE.Mesh(stG, stoneM);
      st.position.set(Math.cos(a) * 0.38, 0.08, Math.sin(a) * 0.38);
      st.castShadow = st.receiveShadow = true;
      bf.add(st);
    }
    for (let i = 0; i < 4; i++) {
      const lg = new THREE.Mesh(lgG, logM);
      lg.position.y = 0.12;
      lg.rotation.set(Math.PI / 2 - 0.22, i * Math.PI / 2, 0);
      lg.castShadow = lg.receiveShadow = true;
      bf.add(lg);
    }
    const f1 = new THREE.Mesh(flG, f1M);
    f1.position.y = 0.42;
    const f2 = new THREE.Mesh(flG, f2M);
    f2.position.y = 0.38;
    f2.scale.set(0.62, 0.82, 0.62);
    const lt = new THREE.PointLight(0xff8c32, 0, 15);
    lt.position.set(0, 1.1, 0);
    const bfCol = new THREE.Mesh(bfColG, bfColM);
    bfCol.position.y = 0.425;
    bfCol.visible = state.showHitbox;
    bfCol.userData = { isCollider: true };
    bf.add(f1, f2, lt, bfCol);
    bf.position.set(side * 3.25, 0, -14.4);
    scene.add(bf);
    bonfires.push({ g: bf, f1, f2, lt, side, ph: side > 0 ? 1.7 : 0 });
  }
}

const clouds = [];
const cloudMat = makeToonMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.96
});
const CLOUD_COUNT = 16;
const CLOUD_PUFFS = 6;
const cloudInst = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1, 1), cloudMat, CLOUD_COUNT * CLOUD_PUFFS);
cloudInst.frustumCulled = false;
scene.add(cloudInst);
const puffLocalMats = [];
{
  const puffOffsets = [
    [-2.5, -0.1, 0.2, 1.7, 1.0, 1.4],
    [-1.1, 0.55, -0.35, 2.0, 1.35, 1.6],
    [0.2, 0.85, 0.25, 2.2, 1.55, 1.75],
    [1.4, 0.45, -0.2, 1.85, 1.25, 1.5],
    [2.6, -0.15, 0.15, 1.55, 0.95, 1.3],
    [0.0, 0.1, -0.75, 1.8, 1.05, 1.4]
  ];
  const pPos = new THREE.Vector3();
  const pQuat = new THREE.Quaternion();
  const pScale = new THREE.Vector3();
  const pEuler = new THREE.Euler();
  for (const [px, py, pz, sx, sy, sz] of puffOffsets) {
    pPos.set(px, py, pz);
    pEuler.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
    pQuat.setFromEuler(pEuler);
    pScale.set(sx, sy, sz);
    puffLocalMats.push(new THREE.Matrix4().compose(pPos, pQuat, pScale));
  }
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const baseY = 27 + Math.random() * 14;
    clouds.push({
      x: (Math.random() - 0.5) * 180,
      y: baseY,
      z: -30 - Math.random() * 90,
      scale: 0.95 + Math.random() * 1.15,
      rotY: (Math.random() - 0.5) * 0.4,
      sp: 1.1 + Math.random() * 1.3,
      baseY,
      ph: Math.random() * Math.PI * 2
    });
  }
}

const _cloudPos = new THREE.Vector3();
const _cloudQuat = new THREE.Quaternion();
const _cloudScale = new THREE.Vector3();
const _cloudEuler = new THREE.Euler();
const _cloudMat = new THREE.Matrix4();
const _instMat = new THREE.Matrix4();

export function fit() {
  R.setSize(innerWidth, innerHeight);
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
}

const SKY_DAY = new THREE.Color(0x8edbff);
const SKY_SUNSET = new THREE.Color(0xff9b66);
const SKY_NIGHT = new THREE.Color(0x0c1428);
const _skyC = new THREE.Color();
const _wtCol = new THREE.Color();
const _zenithDay = new THREE.Color(0x2b7de9);
const _zenithNight = new THREE.Color(0x050914);
const _cloudRain = new THREE.Color(0x9aa6b2);
const _cloudClear = new THREE.Color(0xffffff);
let skyT = 0;

export function updateAtmosphere(dt) {
  skyT += dt;
  const w = updateWeather(dt, cam.position);
  const mode = TIME_MODES[state.tmIdx].k;
  const ang = mode === 'day' ? Math.PI / 2 : mode === 'night' ? -Math.PI / 2 : skyT * 0.045 + 0.55;
  const sy = Math.sin(ang) + (mode === 'auto' ? 0.28 : 0);
  const cx = Math.cos(ang);

  sunBall.position.set(-72 - 36 * cx, 62 * sy + 14, -42 + 18 * cx);
  moonBall.position.set(72 + 36 * cx, -62 * sy + 14, -42 - 18 * cx);
  const clearSky = Math.max(0, 1 - (w.rainF * 0.9 + w.fogF * 0.95 + w.snowF * 0.65));
  sunBall.visible = sy > -0.15 && clearSky > 0.25;
  moonBall.visible = sy < 0.15 && clearSky > 0.25;

  if (sy >= 0.15) {
    _skyC.copy(SKY_SUNSET).lerp(SKY_DAY, Math.min(1, (sy - 0.15) / 0.45));
  } else if (sy > -0.15) {
    _skyC.copy(SKY_NIGHT).lerp(SKY_SUNSET, (sy + 0.15) / 0.3);
  } else {
    _skyC.copy(SKY_NIGHT);
  }

  const dayF = Math.max(0, Math.min(1, (sy + 0.15) / 0.5));
  const wtSkyScale = 0.35 + 0.65 * dayF;
  if (w.rainF > 0.001) {
    _wtCol.copy(w.SKY_RAIN).multiplyScalar(wtSkyScale);
    _skyC.lerp(_wtCol, w.rainF * 0.78);
  }
  if (w.snowF > 0.001) {
    _wtCol.copy(w.SKY_SNOW).multiplyScalar(0.4 + 0.6 * dayF);
    _skyC.lerp(_wtCol, w.snowF * 0.65);
  }
  if (w.fogF > 0.001) {
    _wtCol.copy(w.SKY_FOG).multiplyScalar(0.38 + 0.62 * dayF);
    _skyC.lerp(_wtCol, w.fogF * 0.85);
  }
  if (w.lightning > 0.01) {
    _skyC.lerp(w.SKY_BOLT, w.lightning * 0.55);
  }

  scene.background.copy(_skyC);
  scene.fog.color.copy(_skyC);
  scene.fog.near = 25 - w.rainF * 9 - w.snowF * 7 - w.fogF * 19;
  scene.fog.far = 110 - w.rainF * 32 - w.snowF * 25 - w.fogF * 68;

  // Cập nhật shader bầu trời & mặt đất
  skyDome.mesh.position.copy(cam.position);
  skyDome.uniforms.uHorizonColor.value.copy(_skyC);
  skyDome.uniforms.uZenithColor.value.copy(_skyC).lerp(
    dayF > 0.35 ? _zenithDay : _zenithNight,
    0.58 * (1 - w.fogF * 0.7)
  );
  skyDome.uniforms.uSunDir.value
    .copy(sy >= 0 ? sunBall.position : moonBall.position)
    .normalize();
  skyDome.uniforms.uSunColor.value.setHex(sy >= 0 ? 0xffe4a0 : 0xc8dcff);
  skyDome.uniforms.uSunGlow.value = sy >= 0 ? 0.85 : 0.42;
  skyDome.uniforms.uOvercast.value = Math.min(1, w.rainF * 0.85 + w.fogF * 0.9 + w.snowF * 0.5);
  skyDome.uniforms.uLightning.value = w.lightning;

  terrainShaderUniforms.uTime.value = skyT;
  terrainShaderUniforms.uRainF.value = w.rainF;
  terrainShaderUniforms.uSnowF.value = w.snowF;

  const lightDim = 1 - w.rainF * 0.42 - w.fogF * 0.32 - w.snowF * 0.15;
  const boltBoost = w.lightning * 1.15;
  hemi.intensity = (0.35 + 0.65 * dayF) * lightDim + boltBoost * 0.65;
  sun.intensity = (0.15 + 0.75 * dayF) * (1 - w.rainF * 0.65 - w.fogF * 0.55 - w.snowF * 0.3) + boltBoost;
  botwShaderUniforms.uBotwRimStrength.value = (0.10 + 0.20 * dayF) * lightDim + boltBoost * 0.15;
  botwShaderUniforms.uBotwSunColor.value.setHex(sy >= 0 ? (dayF > 0.55 ? 0xfff5dc : 0xffb878) : 0x9ec4ff);
  terrainShaderUniforms.uWindAmp.value = 1 + w.rainF * 1.15 + w.snowF * 0.35;
  terrainShaderUniforms.uDayF.value = dayF;
  sun.target.position.set(0, 0, state.tg.z * 0.65);
  sun.position.set(-18 - 10 * cx, Math.max(10, 26 * sy), sun.target.position.z + 12);
  starMat.opacity = Math.max(0, Math.min(1, (-0.05 - sy) / 0.35)) * Math.max(0, 1 - w.rainF - w.fogF - w.snowF * 0.7);
  cloudMat.color.copy(_skyC).lerp(w.rainF > 0.3 ? _cloudRain : _cloudClear, (0.55 + 0.35 * dayF) * (1 - w.rainF * 0.45));

  const cloudBoost = 1 + w.rainF * 1.3 + w.snowF * 0.25;
  for (let i = 0; i < clouds.length; i++) {
    const cl = clouds[i];
    cl.x += cl.sp * cloudBoost * dt;
    cl.y = cl.baseY + Math.sin(skyT * 0.45 + cl.ph) * 0.35;
    if (cl.x > 95) cl.x = -95;
    _cloudPos.set(cl.x, cl.y, cl.z);
    _cloudEuler.set(0, cl.rotY, 0);
    _cloudQuat.setFromEuler(_cloudEuler);
    _cloudScale.setScalar(cl.scale);
    _cloudMat.compose(_cloudPos, _cloudQuat, _cloudScale);
    for (let j = 0; j < CLOUD_PUFFS; j++) {
      _instMat.multiplyMatrices(_cloudMat, puffLocalMats[j]);
      cloudInst.setMatrixAt(i * CLOUD_PUFFS + j, _instMat);
    }
  }
  cloudInst.instanceMatrix.needsUpdate = true;

  const nightF = Math.max(0, Math.min(1, (-0.05 - sy) / 0.25));
  for (const bf of bonfires) {
    bf.g.position.z = state.tg.z + 0.6;
    const fl = 0.85 + Math.sin(skyT * 15 + bf.ph) * 0.18 + Math.cos(skyT * 23 + bf.ph) * 0.12;
    const lit = nightF > 0.02;
    bf.f1.visible = bf.f2.visible = lit;
    if (lit) {
      bf.f1.scale.set(1, fl * nightF, 1);
      bf.f2.scale.set(0.62, 0.75 * fl * nightF, 0.62);
      bf.f1.material.uniforms.uTime.value = skyT + bf.ph;
      bf.f1.material.uniforms.uIntensity.value = nightF;
      bf.f2.material.uniforms.uTime.value = skyT + bf.ph;
      bf.f2.material.uniforms.uIntensity.value = nightF;
    }
    bf.lt.intensity = lit ? 1.4 * nightF * fl : 0;
  }
}
