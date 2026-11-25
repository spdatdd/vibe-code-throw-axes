import { AXE_TYPES, TR_R } from './constants.js';
import { state } from './state.js';
import { scene, trees } from './scene.js';

// ================= TẢI MODEL GLB TỪ ASSETS =================
export const ASSETS = {};

function colorByPart(obj, fn, emissive = 0) {
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, emissive, side: THREE.DoubleSide });
  const box = new THREE.Box3().setFromObject(obj);
  const sz = new THREE.Vector3();
  const mn = box.min;
  box.getSize(sz);
  const c = new THREE.Color();
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const nm = new THREE.Vector3();

  obj.traverse(n => {
    if (!n.isMesh || !n.geometry) return;
    const g = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i += 3) {
      v0.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
      v1.fromBufferAttribute(pos, i + 1).applyMatrix4(n.matrixWorld);
      v2.fromBufferAttribute(pos, i + 2).applyMatrix4(n.matrixWorld);
      vc.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
      nm.fromBufferAttribute(nor, i);
      const nx = (vc.x - mn.x) / Math.max(sz.x, 0.001);
      const ny = (vc.y - mn.y) / Math.max(sz.y, 0.001);
      const nz = (vc.z - mn.z) / Math.max(sz.z, 0.001);
      c.setHex(fn(vc, nm, nx, ny, nz));
      for (let k = 0; k < 3; k++) {
        col[(i + k) * 3] = c.r;
        col[(i + k) * 3 + 1] = c.g;
        col[(i + k) * 3 + 2] = c.b;
      }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    n.geometry = g;
    n.material = mat;
  });
  return obj;
}

function normModel(raw, targetSize, rot = { x: 0, y: 0, z: 0 }, bottomZero = false) {
  const w = new THREE.Group();
  const inner = raw.clone();
  inner.rotation.set(rot.x, rot.y, rot.z);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  const sz = new THREE.Vector3();
  const ct = new THREE.Vector3();
  box.getSize(sz);
  box.getCenter(ct);
  const sc = targetSize / Math.max(sz.x, sz.y, sz.z, 0.001);
  inner.scale.setScalar(sc);
  inner.position.set(-ct.x * sc, bottomZero ? -box.min.y * sc : -ct.y * sc, -ct.z * sc);
  w.add(inner);
  return w;
}

export function loadGLBs() {
  const loader = new THREE.GLTFLoader();
  const files = {
    axe: 'assets/axe.glb',
    axe_double: 'assets/axe_double.glb',
    axe_tomahawk: 'assets/axe_tomahawk.glb',
    target: 'assets/target.glb',
    target_stump: 'assets/target_stump.glb',
    target_stand: 'assets/target_stand.glb',
    pine_tree_1: 'assets/pine_tree_1.glb',
    pine_tree_2: 'assets/pine_tree_2.glb',
    fence_rock: 'assets/fence_rock.glb'
  };
  return Promise.all(
    Object.entries(files).map(([k, url]) =>
      new Promise((res, rej) => {
        loader.load(url, g => { ASSETS[k] = g.scene; res(); }, undefined, rej);
      })
    )
  );
}

export function makeAxe(typeKey = AXE_TYPES[state.axeIdx].key) {
  const g = new THREE.Group();
  const raw = ASSETS[typeKey] || ASSETS.axe;
  const rot = typeKey === 'axe'
    ? { x: 0, y: -Math.PI / 2, z: 0 }
    : typeKey === 'axe_double'
      ? { x: -Math.PI / 2, y: Math.PI / 2, z: 0 }
      : { x: -Math.PI / 2, y: -Math.PI / 2, z: 0 };
  const m = normModel(raw, 0.92, rot, false);
  m.updateMatrixWorld(true);
  colorByPart(m, (v) => {
    if (typeKey === 'axe_double') {
      return Math.abs(v.y) > 0.055 && v.z < -0.04
        ? (Math.abs(v.y) > 0.24 ? 0xdde6ee : 0x96a3b0)
        : v.z < -0.34 ? 0x8a96a3 : 0x6d4222;
    }
    if (typeKey === 'axe_tomahawk') {
      return v.z < -0.18 && v.y < -0.03
        ? (v.y < -0.10 ? 0xdde6ee : 0x99a6b3)
        : v.z > 0.18 ? 0x4d2e18 : 0x8a582e;
    }
    return v.z < -0.16 && Math.abs(v.y) > 0.04
      ? (v.y > 0.12 ? 0xe2ebf2 : 0x9aa7b4)
      : v.z > 0.2 ? 0x4d2e18 : 0x8c592e;
  }, 0x101418);
  m.position.z = -0.3;
  g.add(m);
  return g;
}

// Bia: nhóm T (vị trí) > TR (xoay quanh trục Z) + giá đỡ target_stand
export const T = new THREE.Group();
export const TR = new THREE.Group();
scene.add(T);
T.add(TR);

export const standGrp = new THREE.Group();
scene.add(standGrp);

let targetMeshes = [];

const targetTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const ctx = cv.getContext('2d');
  const cx = 256;
  const Rpx = 256;
  ctx.fillStyle = '#593418';
  ctx.fillRect(0, 0, 512, 512);
  [[1.15, '#9c6230'], [0.78, '#e6c796'], [0.45, '#d9442b'], [0.17, '#ffd23f'], [0.09, '#ffe885']].forEach(([r, c]) => {
    ctx.beginPath();
    ctx.arc(cx, cx, r / TR_R * Rpx, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
})();

export function setTargetModel(lvlNum) {
  for (const m of targetMeshes) TR.remove(m);
  targetMeshes = [];
  const useStump = lvlNum % 2 === 0;
  state.targetFrontZ = useStump ? 0.15 : 0.06;
  const raw = useStump ? ASSETS.target_stump : ASSETS.target;
  const board = normModel(raw, TR_R * 2, { x: 0, y: 0, z: 0 }, false);
  board.updateMatrixWorld(true);
  const frontMat = new THREE.MeshLambertMaterial({ map: targetTex, flatShading: true });

  board.traverse(n => {
    if (!n.isMesh || !n.geometry) return;
    const g = n.geometry.index ? n.geometry.toNonIndexed() : n.geometry.clone();
    g.computeVertexNormals();
    const pos = g.attributes.position;
    const nor = g.attributes.normal;
    const uv = new Float32Array(pos.count * 2);
    const v0 = new THREE.Vector3();
    const v1 = new THREE.Vector3();
    const v2 = new THREE.Vector3();
    const vc = new THREE.Vector3();
    const nm = new THREE.Vector3();
    const maxR = useStump ? 1.02 : 1.12;
    for (let i = 0; i < pos.count; i += 3) {
      v0.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
      v1.fromBufferAttribute(pos, i + 1).applyMatrix4(n.matrixWorld);
      v2.fromBufferAttribute(pos, i + 2).applyMatrix4(n.matrixWorld);
      vc.copy(v0).add(v1).add(v2).multiplyScalar(1 / 3);
      nm.fromBufferAttribute(nor, i);
      const ok = nm.z > 0.55 && vc.z > 0 && Math.hypot(vc.x, vc.y) <= maxR;
      const vs = [v0, v1, v2];
      for (let k = 0; k < 3; k++) {
        uv[(i + k) * 2] = ok ? vs[k].x / (TR_R * 2) + 0.5 : 0.02;
        uv[(i + k) * 2 + 1] = ok ? vs[k].y / (TR_R * 2) + 0.5 : 0.02;
      }
    }
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    n.geometry = g;
    n.material = frontMat;
  });

  board.position.z = -0.08;
  TR.add(board);
  targetMeshes.push(board);
}

export function buildEnvironment() {
  // Giá đỡ bia từ target_stand.glb
  const st = normModel(ASSETS.target_stand, 2.4, { x: 0, y: 0, z: 0 }, true);
  st.updateMatrixWorld(true);
  colorByPart(st, (v, nm, nx, ny) => (ny < 0.15 ? 0x3f2612 : 0x5e3b1d));
  standGrp.add(st);

  // Cụm đá rêu + rừng thông đặt tách nhau để không chồng lấn
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const rocks = [];

  for (let i = 0; i < 26; i++) {
    const x = (rnd() < 0.5 ? -1 : 1) * (3.6 + rnd() * 6);
    const z = -rnd() * 88 + 2;
    const k = 1.1 + rnd() * 0.9;
    const prop = normModel(ASSETS.fence_rock, k, { x: 0, y: rnd() * Math.PI * 2, z: 0 }, true);
    prop.updateMatrixWorld(true);
    colorByPart(prop, (v, nm, nx, ny) =>
      ny > 0.55 && nm.y > 0.45 ? 0x587a42 : nx < 0.35 && ny > 0.45 ? 0x6e4726 : 0x737874
    );
    prop.position.set(x, 0, z);
    scene.add(prop);
    rocks.push({ x, z });
  }

  for (let i = 0; i < 75; i++) {
    let x = (rnd() < 0.5 ? -1 : 1) * (6.2 + rnd() * 40);
    const z = -rnd() * 95 + 5;
    if (rocks.some(r => Math.hypot(r.x - x, r.z - z) < 3.0)) x += x > 0 ? 3.5 : -3.5;
    const k = 3.6 + rnd() * 4.2;
    const isTree1 = rnd() < 0.55;
    const tree = normModel(isTree1 ? ASSETS.pine_tree_1 : ASSETS.pine_tree_2, k, { x: 0, y: rnd() * Math.PI * 2, z: 0 }, true);
    tree.updateMatrixWorld(true);
    colorByPart(tree, (v, nm, nx, ny) => {
      const r = Math.hypot(v.x, v.z);
      if (ny < 0.26 && r < 0.14 * k) return 0x5c381e;
      return ny > 0.72 ? 0x4f8d44 : isTree1 ? 0x3b6e32 : 0x2e5b2a;
    });
    tree.position.set(x, 0, z);
    scene.add(tree);
    trees.push({ m: tree, ph: rnd() * Math.PI * 2, sp: 0.9 + rnd() * 0.6 });
  }
}
