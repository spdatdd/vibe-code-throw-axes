import { WEATHER_MODES } from './constants.js';
import { state } from './state.js';
import { SFX } from './audio.js';

// ================= HIỆU ỨNG THỜI TIẾT 3D =================
const BOX_W = 38;
const BOX_H = 18;
const BOX_D = 44;

const RAIN_COUNT = 850;
const SNOW_COUNT = 750;
const MIST_COUNT = 130;

const AUTO_CYCLE = [
  { k: 'clear', dur: 55 },
  { k: 'rain', dur: 50 },
  { k: 'fog', dur: 45 },
  { k: 'snow', dur: 50 }
];

function makeToonCircleTexture(innerAlpha = 1, rim = false) {
  const cvs = document.createElement('canvas');
  cvs.width = 64;
  cvs.height = 64;
  const ctx = cvs.getContext('2d');
  ctx.beginPath();
  ctx.arc(32, 32, 26, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${innerAlpha})`;
  ctx.fill();
  if (rim) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(20,30,48,0.65)';
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(cvs);
  tex.needsUpdate = true;
  return tex;
}

const snowTex = makeToonCircleTexture(0.95, true);
const mistTex = makeToonCircleTexture(0.24, false);

// --- Hệ thống Mưa (LineSegments chạy hoàn toàn trên GPU) ---
const rainPos = new Float32Array(RAIN_COUNT * 6);
const rainSeed = new Float32Array(RAIN_COUNT * 2); // [tốc độ, đỉnh 0=đầu / 1=đuôi]
for (let i = 0; i < RAIN_COUNT; i++) {
  const x = (Math.random() - 0.5) * BOX_W;
  const y = Math.random() * BOX_H;
  const z = (Math.random() - 0.5) * BOX_D;
  const spd = 20 + Math.random() * 8;
  const p = i * 6;
  rainPos[p] = x; rainPos[p + 1] = y; rainPos[p + 2] = z;
  rainPos[p + 3] = x; rainPos[p + 4] = y; rainPos[p + 5] = z;
  const s = i * 2;
  rainSeed[s] = spd; rainSeed[s + 1] = 0;
}
const rainTail = new Float32Array(RAIN_COUNT * 2);
for (let i = 0; i < RAIN_COUNT; i++) {
  rainTail[i * 2] = rainSeed[i * 2];
  rainTail[i * 2 + 1] = 1;
}
const rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainAttrSpeed = new Float32Array(RAIN_COUNT * 2);
const rainAttrEnd = new Float32Array(RAIN_COUNT * 2);
for (let i = 0; i < RAIN_COUNT; i++) {
  rainAttrSpeed[i * 2] = rainAttrSpeed[i * 2 + 1] = rainSeed[i * 2];
  rainAttrEnd[i * 2] = 0;
  rainAttrEnd[i * 2 + 1] = 1;
}
rainGeo.setAttribute('aSpeed', new THREE.BufferAttribute(rainAttrSpeed, 1));
rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(rainAttrEnd, 1));

const rainUniforms = {
  uTime: { value: 0 },
  uOpacity: { value: 0 },
  uCenter: { value: new THREE.Vector3() },
  uColor: { value: new THREE.Color(0xcbe4ff) }
};
const rainMat = new THREE.ShaderMaterial({
  uniforms: rainUniforms,
  transparent: true,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */ `
    attribute float aSpeed;
    attribute float aEnd;
    uniform float uTime;
    uniform vec3 uCenter;
    void main() {
      vec3 p = position;
      p.x = mod(p.x + 2.6 * uTime + ${(BOX_W * 0.5).toFixed(1)}, ${BOX_W.toFixed(1)}) - ${(BOX_W * 0.5).toFixed(1)};
      p.y = mod(p.y - aSpeed * uTime, ${BOX_H.toFixed(1)});
      p.z = mod(p.z + 1.1 * uTime + ${(BOX_D * 0.5).toFixed(1)}, ${BOX_D.toFixed(1)}) - ${(BOX_D * 0.5).toFixed(1)};
      p.x -= aEnd * 0.065;
      p.y -= aEnd * 0.52;
      p.z -= aEnd * 0.0275;
      p.x += uCenter.x;
      p.z += uCenter.z;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform vec3 uColor;
    void main() {
      gl_FragColor = vec4(uColor, uOpacity);
    }
  `
});
const rainMesh = new THREE.LineSegments(rainGeo, rainMat);
rainMesh.frustumCulled = false;
rainMesh.visible = false;

// --- Hệ thống Tuyết (Points chạy hoàn toàn trên GPU) ---
const snowPos = new Float32Array(SNOW_COUNT * 3);
const snowVel = new Float32Array(SNOW_COUNT);
const snowPhase = new Float32Array(SNOW_COUNT);
for (let i = 0; i < SNOW_COUNT; i++) {
  snowPos[i * 3] = (Math.random() - 0.5) * BOX_W;
  snowPos[i * 3 + 1] = Math.random() * BOX_H;
  snowPos[i * 3 + 2] = (Math.random() - 0.5) * BOX_D;
  snowVel[i] = 1.5 + Math.random() * 1.4;
  snowPhase[i] = Math.random() * Math.PI * 2;
}
const snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
snowGeo.setAttribute('aSpeed', new THREE.BufferAttribute(snowVel, 1));
snowGeo.setAttribute('aPhase', new THREE.BufferAttribute(snowPhase, 1));
const snowUniforms = {
  uTime: { value: 0 },
  uOpacity: { value: 0 },
  uCenter: { value: new THREE.Vector3() },
  uMap: { value: snowTex }
};
const snowMat = new THREE.ShaderMaterial({
  uniforms: snowUniforms,
  transparent: true,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */ `
    attribute float aSpeed;
    attribute float aPhase;
    uniform float uTime;
    uniform vec3 uCenter;
    void main() {
      vec3 p = position;
      p.x = mod(p.x + sin(uTime * 1.4 + aPhase) * 0.45 + ${(BOX_W * 0.5).toFixed(1)}, ${BOX_W.toFixed(1)}) - ${(BOX_W * 0.5).toFixed(1)};
      p.y = mod(p.y - aSpeed * uTime, ${BOX_H.toFixed(1)});
      p.z = mod(p.z + cos(uTime * 1.1 + aPhase) * 0.35 + ${(BOX_D * 0.5).toFixed(1)}, ${BOX_D.toFixed(1)}) - ${(BOX_D * 0.5).toFixed(1)};
      p.x += uCenter.x;
      p.z += uCenter.z;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = clamp(220.0 / max(-mv.z, 1.0), 2.0, 18.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform sampler2D uMap;
    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      if (tex.a < 0.05) discard;
      gl_FragColor = vec4(tex.rgb, tex.a * uOpacity);
    }
  `
});
const snowMesh = new THREE.Points(snowGeo, snowMat);
snowMesh.frustumCulled = false;
snowMesh.visible = false;

// --- Hệ thống Sương mù trôi (Points chạy hoàn toàn trên GPU) ---
const mistPos = new Float32Array(MIST_COUNT * 3);
const mistVel = new Float32Array(MIST_COUNT);
const mistIdx = new Float32Array(MIST_COUNT);
for (let i = 0; i < MIST_COUNT; i++) {
  mistPos[i * 3] = (Math.random() - 0.5) * (BOX_W + 10);
  mistPos[i * 3 + 1] = 0.4 + Math.random() * 4.4;
  mistPos[i * 3 + 2] = (Math.random() - 0.5) * (BOX_D + 12);
  mistVel[i] = 0.45 + Math.random() * 0.65;
  mistIdx[i] = i;
}
const mistGeo = new THREE.BufferGeometry();
mistGeo.setAttribute('position', new THREE.BufferAttribute(mistPos, 3));
mistGeo.setAttribute('aSpeed', new THREE.BufferAttribute(mistVel, 1));
mistGeo.setAttribute('aIdx', new THREE.BufferAttribute(mistIdx, 1));
const mistUniforms = {
  uTime: { value: 0 },
  uOpacity: { value: 0 },
  uCenter: { value: new THREE.Vector3() },
  uMap: { value: mistTex },
  uColor: { value: new THREE.Color(0xe4edf5) }
};
const mistMat = new THREE.ShaderMaterial({
  uniforms: mistUniforms,
  transparent: true,
  depthWrite: false,
  fog: false,
  vertexShader: /* glsl */ `
    attribute float aSpeed;
    attribute float aIdx;
    uniform float uTime;
    uniform vec3 uCenter;
    void main() {
      vec3 p = position;
      float span = ${(BOX_W + 10).toFixed(1)};
      p.x = mod(p.x + aSpeed * uTime + span * 0.5, span) - span * 0.5;
      p.y += sin(uTime * 0.6 + aIdx) * 0.15;
      p.x += uCenter.x;
      p.z += uCenter.z;
      vec4 mv = modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = clamp(1800.0 / max(-mv.z, 1.0), 12.0, 260.0);
      gl_Position = projectionMatrix * mv;
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float uOpacity;
    uniform sampler2D uMap;
    uniform vec3 uColor;
    void main() {
      vec4 tex = texture2D(uMap, gl_PointCoord);
      if (tex.a < 0.02) discard;
      gl_FragColor = vec4(uColor * tex.rgb, tex.a * uOpacity);
    }
  `
});
const mistMesh = new THREE.Points(mistGeo, mistMat);
mistMesh.frustumCulled = false;
mistMesh.visible = false;

export const weatherGroup = new THREE.Group();
weatherGroup.add(rainMesh, snowMesh, mistMesh);

let wtTime = 0;
let autoIdx = 0;
let autoTimer = 0;
let rainF = 0;
let snowF = 0;
let fogF = 0;
let lightning = 0;
let nextBolt = 6 + Math.random() * 8;

const SKY_RAIN = new THREE.Color(0x526478);
const SKY_SNOW = new THREE.Color(0xb8cde0);
const SKY_FOG = new THREE.Color(0x9fb0bd);
const SKY_BOLT = new THREE.Color(0xeef6ff);

/** Trả về loại thời tiết hiện tại ('clear' | 'rain' | 'snow' | 'fog'). */
export function getActiveWeatherKey() {
  const mode = WEATHER_MODES[state.wtIdx]?.k || 'auto';
  if (mode !== 'auto') return mode;
  return AUTO_CYCLE[autoIdx].k;
}

/** Cập nhật hạt thời tiết, sấm chớp và trả về thông số hòa trộn bầu khí quyển. */
export function updateWeather(dt, camPos) {
  wtTime += dt;

  const mode = WEATHER_MODES[state.wtIdx]?.k || 'auto';
  if (mode === 'auto') {
    autoTimer += dt;
    if (autoTimer >= AUTO_CYCLE[autoIdx].dur) {
      autoTimer = 0;
      autoIdx = (autoIdx + 1) % AUTO_CYCLE.length;
    }
  } else {
    autoTimer = 0;
  }

  const active = getActiveWeatherKey();
  const k = 1 - Math.exp(-dt * (mode === 'auto' ? 0.35 : 1.1));
  rainF += ((active === 'rain' ? 1 : 0) - rainF) * k;
  snowF += ((active === 'snow' ? 1 : 0) - snowF) * k;
  fogF += ((active === 'fog' ? 1 : 0) - fogF) * k;

  // Sấm chớp ngẫu nhiên khi trời mưa
  if (rainF > 0.45) {
    nextBolt -= dt;
    if (nextBolt <= 0) {
      lightning = 1.0;
      nextBolt = 7 + Math.random() * 10;
      SFX.thunder();
    }
  }
  lightning = Math.max(0, lightning - dt * 3.6);

  const cx = camPos.x;
  const cz = camPos.z - 12;

  // Cập nhật mưa trên GPU
  rainMesh.visible = rainF > 0.015;
  if (rainMesh.visible) {
    rainUniforms.uTime.value = wtTime;
    rainUniforms.uOpacity.value = 0.52 * rainF;
    rainUniforms.uCenter.value.set(cx, 0, cz);
  }

  // Cập nhật tuyết trên GPU
  snowMesh.visible = snowF > 0.015;
  if (snowMesh.visible) {
    snowUniforms.uTime.value = wtTime;
    snowUniforms.uOpacity.value = 0.88 * snowF;
    snowUniforms.uCenter.value.set(cx, 0, cz);
  }

  // Cập nhật sương mù trên GPU
  mistMesh.visible = fogF > 0.015;
  if (mistMesh.visible) {
    mistUniforms.uTime.value = wtTime;
    mistUniforms.uOpacity.value = 0.36 * fogF;
    mistUniforms.uCenter.value.set(cx, 0, cz);
  }

  return {
    rainF,
    snowF,
    fogF,
    lightning,
    SKY_RAIN,
    SKY_SNOW,
    SKY_FOG,
    SKY_BOLT
  };
}
