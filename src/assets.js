import { AXE_TYPES, TR_R } from './constants.js';
import { state } from './state.js';
import { scene, cam, bonfires, terrainShaderUniforms } from './scene.js';
import { createStoneTexture, createTargetTexture, createWoodTexture } from './textures.js';
import { addToonOutline, makeToonMaterial, patchGrassWindShader, patchTreeWindShader } from './shaders.js';
import { MeshoptDecoder } from './meshopt_decoder.module.js';

// ================= TẢI MODEL GLB TỪ ASSETS =================
export const ASSETS = {};

function enableShadow(obj, cast = true, receive = true) {
  obj.traverse(n => {
    if (n.isMesh && !(n.userData && n.userData.isCollider)) {
      n.castShadow = cast;
      n.receiveShadow = receive;
    }
  });
}

const detailTex = createStoneTexture('#ffffff');

const bladeTex = (() => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d');
  const gr = ctx.createLinearGradient(0, 0, 256, 256);
  gr.addColorStop(0, '#eef6fc');
  gr.addColorStop(0.5, '#dce8f2');
  gr.addColorStop(1, '#f4faff');
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, 256, 256);
  // Vân mài thép mịn, sắc bén (không có vân gỗ/đá)
  for (let i = 0; i < 64; i++) {
    const y = i * 4;
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.28)' : 'rgba(170,195,218,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(256, y);
    ctx.stroke();
  }
  const t = new THREE.CanvasTexture(cv);
  t.anisotropy = 4;
  return t;
})();

function colorByPart(obj, fn, emissive = 0, sharpMat = false, isMetalFn = null, isEdgeFn = null) {
  const matOpts = {
    vertexColors: true,
    map: detailTex,
    emissive,
    side: THREE.DoubleSide
  };
  const woodMat = makeToonMaterial(matOpts);
  const metalMat = sharpMat
    ? makeToonMaterial({
        vertexColors: true,
        map: bladeTex,
        emissive: 0x162230,
        side: THREE.DoubleSide
      })
    : woodMat;
  const edgeMat = sharpMat
    ? makeToonMaterial({
        vertexColors: true,
        map: bladeTex,
        emissive: 0x26384a,
        side: THREE.DoubleSide
      })
    : woodMat;
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
    if (!g.attributes.uv) {
      const uv = new Float32Array(pos.count * 2);
      for (let i = 0; i < pos.count; i++) {
        uv[i * 2] = (pos.getX(i) + pos.getZ(i)) * 1.4;
        uv[i * 2 + 1] = pos.getY(i) * 1.4;
      }
      g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    }
    const nor = g.attributes.normal;
    const col = new Float32Array(pos.count * 3);
    const edgeTris = [];
    const metalTris = [];
    const woodTris = [];
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
      if (sharpMat && isMetalFn) {
        const grp = (isEdgeFn && isEdgeFn(vc)) ? edgeTris : isMetalFn(vc) ? metalTris : woodTris;
        grp.push(i, c.r, c.g, c.b);
      } else {
        for (let k = 0; k < 3; k++) {
          col[(i + k) * 3] = c.r;
          col[(i + k) * 3 + 1] = c.g;
          col[(i + k) * 3 + 2] = c.b;
        }
      }
    }
    if (sharpMat && isMetalFn && g.clearGroups) {
      const uvAttr = g.attributes.uv;
      const newPos = new Float32Array(pos.count * 3);
      const newNor = new Float32Array(pos.count * 3);
      const newUv = new Float32Array(pos.count * 2);
      const writeTri = (srcIdx, dstIdx, r, gCol, b) => {
        for (let k = 0; k < 3; k++) {
          const s = srcIdx + k;
          const d = dstIdx + k;
          newPos[d * 3] = pos.getX(s); newPos[d * 3 + 1] = pos.getY(s); newPos[d * 3 + 2] = pos.getZ(s);
          newNor[d * 3] = nor.getX(s); newNor[d * 3 + 1] = nor.getY(s); newNor[d * 3 + 2] = nor.getZ(s);
          newUv[d * 2] = uvAttr.getX(s); newUv[d * 2 + 1] = uvAttr.getY(s);
          col[d * 3] = r; col[d * 3 + 1] = gCol; col[d * 3 + 2] = b;
        }
      };
      let cursor = 0;
      for (let t = 0; t < edgeTris.length; t += 4) {
        writeTri(edgeTris[t], cursor, edgeTris[t + 1], edgeTris[t + 2], edgeTris[t + 3]);
        cursor += 3;
      }
      const edgeVerts = cursor;
      for (let t = 0; t < metalTris.length; t += 4) {
        writeTri(metalTris[t], cursor, metalTris[t + 1], metalTris[t + 2], metalTris[t + 3]);
        cursor += 3;
      }
      const metalVerts = cursor - edgeVerts;
      for (let t = 0; t < woodTris.length; t += 4) {
        writeTri(woodTris[t], cursor, woodTris[t + 1], woodTris[t + 2], woodTris[t + 3]);
        cursor += 3;
      }
      g.setAttribute('position', new THREE.BufferAttribute(newPos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(newNor, 3));
      g.setAttribute('uv', new THREE.BufferAttribute(newUv, 2));
      g.clearGroups();
      if (edgeVerts > 0) g.addGroup(0, edgeVerts, 0);
      if (metalVerts > 0) g.addGroup(edgeVerts, metalVerts, 1);
      if (cursor - edgeVerts - metalVerts > 0) g.addGroup(edgeVerts + metalVerts, cursor - edgeVerts - metalVerts, 2);
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      n.geometry = g;
      n.material = [edgeMat, metalMat, woodMat];
    } else {
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      n.geometry = g;
      n.material = woodMat;
    }
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

export function loadGLBs(onProgress) {
  const loader = new THREE.GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const files = {
    axe: 'assets/model/axe.glb',
    axe_double: 'assets/model/axe_double.glb',
    axe_tomahawk: 'assets/model/axe_tomahawk.glb',
    target: 'assets/model/target.glb',
    target_stump: 'assets/model/target_stump.glb',
    target_stand: 'assets/model/target_stand.glb',
    pine_tree_1: 'assets/model/pine_tree_1.glb',
    pine_tree_2: 'assets/model/pine_tree_2.glb',
    fence_rock: 'assets/model/fence_rock.glb',
    grass_clump: 'assets/model/meshy-grass-clump.glb'
  };
  const entries = Object.entries(files);
  let done = 0;
  return Promise.all(
    entries.map(([k, url]) =>
      new Promise((res, rej) => {
        loader.load(
          url,
          g => {
            ASSETS[k] = g.scene;
            done++;
            if (onProgress) onProgress(done, entries.length, k);
            res();
          },
          undefined,
          rej
        );
      })
    )
  );
}

const AXE_PIVOT_Z = -0.08;

function isBladePoint(typeKey, x, y, z) {
  if (typeKey === 'axe_double') return Math.abs(y) > 0.055 && z < 0.12;
  if (typeKey === 'axe_tomahawk') return y < -0.035 && z < 0.14;
  return z < -0.22 || (Math.abs(y) > 0.055 && z < 0.12);
}

function buildBaseAxe(typeKey) {
  const raw = ASSETS[typeKey] || ASSETS.axe;
  const rot = typeKey === 'axe'
    ? { x: 0, y: -Math.PI / 2, z: 0 }
    : typeKey === 'axe_double'
      ? { x: -Math.PI / 2, y: Math.PI / 2, z: 0 }
      : { x: -Math.PI / 2, y: -Math.PI / 2, z: 0 };
  const m = normModel(raw, 0.92, rot, false);
  m.updateMatrixWorld(true);
  // Phủ toàn bộ phần đầu & lưỡi kim loại của cả 3 rìu bằng metalMat; mép cắt mỏng (isEdge) dùng edgeMat sáng bóng
  const isMetal = v => (
    typeKey === 'axe_double' ? (v.z < -0.18 || (Math.abs(v.y) > 0.052 && v.z < 0.14))
      : typeKey === 'axe_tomahawk' ? (v.z < -0.16 || (v.y < -0.032 && v.z < 0.15))
        : (v.z < 0.02 || (Math.abs(v.y) > 0.045 && v.z < 0.14))
  );
  const isEdge = v => isBladePoint(typeKey, v.x, v.y, v.z) && (
    typeKey === 'axe_double' ? (Math.abs(v.x) < 0.011 || Math.abs(v.y) > 0.27)
      : typeKey === 'axe_tomahawk' ? (Math.abs(v.x) < 0.010 || v.y < -0.13)
        : ((Math.abs(v.x) < 0.014 && (v.z < -0.26 || v.y < -0.10)) || v.z < -0.41)
  );
  colorByPart(m, (v) => {
    if (isEdge(v)) return 0xeaf4fc;
    if (typeKey === 'axe_double') {
      return isBladePoint(typeKey, v.x, v.y, v.z) ? 0x6e7e8e : isMetal(v) ? 0x4b5563 : v.z > 0.18 ? 0x422410 : 0x6d4222;
    }
    if (typeKey === 'axe_tomahawk') {
      return isBladePoint(typeKey, v.x, v.y, v.z) ? 0x6e7e8e : isMetal(v) ? 0x4b5563 : v.z > 0.16 ? 0x422410 : 0x8a582e;
    }
    return isBladePoint(typeKey, v.x, v.y, v.z) ? 0x6e7e8e : isMetal(v) ? 0x4b5563 : v.z > 0.18 ? 0x422410 : 0x8c592e;
  }, 0x0a0e14, true, isMetal, isEdge);
  m.position.z = AXE_PIVOT_Z;
  return m;
}

const axeBoundsCache = {};

function emptyBox() {
  return { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
}

function expandBox(b, x, y, z) {
  if (x < b.minX) b.minX = x;
  if (y < b.minY) b.minY = y;
  if (z < b.minZ) b.minZ = z;
  if (x > b.maxX) b.maxX = x;
  if (y > b.maxY) b.maxY = y;
  if (z > b.maxZ) b.maxZ = z;
}

function boxCorners(b, blade) {
  if (!Number.isFinite(b.minX)) return [];
  const xs = [b.minX, b.maxX];
  const ys = [b.minY, b.maxY];
  const zs = [b.minZ, b.maxZ];
  const out = [];
  for (const x of xs) for (const y of ys) for (const z of zs) out.push({ x, y, z, blade });
  return out;
}

/** Tính và cache 2 khối hộp bao bọc đơn giản (lưỡi + thân/cán) cho từng loại rìu. */
function getAxeBounds(typeKey = AXE_TYPES[state.axeIdx].key) {
  if (axeBoundsCache[typeKey]) return axeBoundsCache[typeKey];
  const m = buildBaseAxe(typeKey);
  m.updateMatrixWorld(true);

  const bladeBox = emptyBox();
  const bodyBox = emptyBox();
  const v = new THREE.Vector3();
  m.traverse(n => {
    if (!n.isMesh || !n.geometry || !n.geometry.attributes || !n.geometry.attributes.position) return;
    const pos = n.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
      const mz = v.z - AXE_PIVOT_Z;
      const isBlade = isBladePoint(typeKey, v.x, v.y, mz);
      if (isBlade) expandBox(bladeBox, v.x, v.y, v.z);
      else if (mz > -0.10) expandBox(bodyBox, v.x, v.y, v.z);
    }
  });

  // Nới khối bao lưỡi rộng hơn một chút để tăng độ nhạy trúng đích; thu nhỏ khối cán ôm sát tay cầm
  if (Number.isFinite(bladeBox.minX)) {
    bladeBox.minX -= 0.04; bladeBox.minY -= 0.05; bladeBox.minZ -= 0.06;
    bladeBox.maxX += 0.04; bladeBox.maxY += 0.05; bladeBox.maxZ += 0.03;
  }
  if (Number.isFinite(bodyBox.minX)) {
    const cx = (bodyBox.minX + bodyBox.maxX) * 0.5;
    const cy = (bodyBox.minY + bodyBox.maxY) * 0.5;
    bodyBox.minX = Math.max(bodyBox.minX, cx - 0.045);
    bodyBox.maxX = Math.min(bodyBox.maxX, cx + 0.045);
    bodyBox.minY = Math.max(bodyBox.minY, cy - 0.05);
    bodyBox.maxY = Math.min(bodyBox.maxY, cy + 0.05);
  }

  let pts = [...boxCorners(bladeBox, true), ...boxCorners(bodyBox, false)];
  if (!pts.length) {
    const cfg = AXE_TYPES.find(x => x.key === typeKey) || AXE_TYPES[0];
    pts = [
      { x: 0, y: cfg.tipY, z: -cfg.tipZ, blade: true },
      { x: 0, y: 0, z: 0, blade: false }
    ];
  }

  axeBoundsCache[typeKey] = { bladeBox, bodyBox, pts };
  return axeBoundsCache[typeKey];
}

const colliderMatCache = {};
function getColliderMat(color, wireframe = false) {
  const k = color + (wireframe ? '_w' : '_s');
  if (!colliderMatCache[k]) {
    colliderMatCache[k] = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: wireframe ? 0.45 : 0.24,
      depthWrite: false,
      wireframe
    });
  }
  return colliderMatCache[k];
}

function addBoxOverlay(parent, b, color, wireframe = false) {
  if (!Number.isFinite(b.minX)) return;
  const sx = Math.max(0.05, b.maxX - b.minX);
  const sy = Math.max(0.05, b.maxY - b.minY);
  const sz = Math.max(0.05, b.maxZ - b.minZ);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), getColliderMat(color, wireframe));
  mesh.position.set((b.minX + b.maxX) * 0.5, (b.minY + b.maxY) * 0.5, (b.minZ + b.maxZ) * 0.5);
  mesh.visible = state.showHitbox;
  mesh.userData = { isCollider: true };
  parent.add(mesh);
}

/** Bật/tắt hiển thị toàn bộ lớp Hitbox / Collider Overlay trong scene và tay cầm. */
export function setHitboxVisible(v) {
  state.showHitbox = v;
  for (const root of [scene, cam]) {
    root.traverse(n => {
      if (n.userData && n.userData.isCollider) n.visible = v;
    });
  }
}

export function makeAxe(typeKey = AXE_TYPES[state.axeIdx].key) {
  const g = new THREE.Group();
  const m = buildBaseAxe(typeKey);
  enableShadow(m, true, false);
  g.add(m);

  // Màu theo chức năng: Đỏ = Lưỡi rìu (Hitbox cắm), Vàng = Cán/Thân (Bounce Box)
  const { bladeBox, bodyBox } = getAxeBounds(typeKey);
  const colLayer = new THREE.Group();
  colLayer.visible = state.showHitbox;
  colLayer.userData = { isCollider: true };
  addBoxOverlay(colLayer, bladeBox, 0xff3d5a);
  addBoxOverlay(colLayer, bodyBox, 0xffc400);
  g.add(colLayer);

  return g;
}

/** Trả về các điểm góc của khối hộp 3D bao bọc (16 điểm) để kiểm tra đụng độ nhanh. */
export function getAxeShape(typeKey = AXE_TYPES[state.axeIdx].key) {
  return getAxeBounds(typeKey).pts;
}

// Bia: nhóm T (vị trí) > TR (xoay quanh trục Z) + giá đỡ target_stand
export const T = new THREE.Group();
export const TR = new THREE.Group();
export const tgShakeFx = new THREE.Group();
scene.add(T);
T.add(TR);
T.add(tgShakeFx);
{
  const inkM = new THREE.MeshBasicMaterial({ color: 0x11131c, fog: false });
  const fillM = new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false });
  const addArc = (radius, arcLen, rotZ, zOff = 0) => {
    const gInk = new THREE.TorusGeometry(radius, 0.036, 4, 14, arcLen);
    const gFill = new THREE.TorusGeometry(radius, 0.019, 4, 14, arcLen);
    const mInk = new THREE.Mesh(gInk, inkM);
    const mFill = new THREE.Mesh(gFill, fillM);
    mInk.rotation.z = rotZ;
    mFill.rotation.z = rotZ;
    mInk.position.z = zOff;
    mFill.position.z = zOff + 0.012;
    tgShakeFx.add(mInk, mFill);
  };
  const sideArc = Math.PI * 0.46;
  // Hai cặp vạch rung comic bên trái và bên phải bia
  addArc(TR_R + 0.14, sideArc, -sideArc * 0.5, 0.02);
  addArc(TR_R + 0.27, sideArc * 0.72, -sideArc * 0.36, 0.02);
  addArc(TR_R + 0.14, sideArc, Math.PI - sideArc * 0.5, 0.02);
  addArc(TR_R + 0.27, sideArc * 0.72, Math.PI - sideArc * 0.36, 0.02);
  // Vạch rung nhỏ phía trên bia
  const topArc = Math.PI * 0.28;
  addArc(TR_R + 0.15, topArc, Math.PI * 0.5 - topArc * 0.5, 0.02);
  tgShakeFx.visible = false;
}

export const standGrp = new THREE.Group();
scene.add(standGrp);

export const standPost = new THREE.Group();
standGrp.add(standPost);

export const cartGrp = new THREE.Group();
export const cartWheels = [];
standGrp.add(cartGrp);

export const railGrp = new THREE.Group();
scene.add(railGrp);

export const ENV_COLLIDERS = [];

function localBounds(obj) {
  const b = emptyBox();
  const v = new THREE.Vector3();
  obj.updateMatrixWorld(true);
  obj.traverse(n => {
    if (!n.isMesh || !n.geometry || !n.geometry.attributes || !n.geometry.attributes.position) return;
    const pos = n.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).applyMatrix4(n.matrixWorld);
      expandBox(b, v.x, v.y, v.z);
    }
  });
  return b;
}

function offsetBox(b, pos) {
  return {
    minX: b.minX + pos.x, minY: b.minY + pos.y, minZ: b.minZ + pos.z,
    maxX: b.maxX + pos.x, maxY: b.maxY + pos.y, maxZ: b.maxZ + pos.z
  };
}

let targetMeshes = [];

const targetTex = createTargetTexture(TR_R);
const woodTex = createWoodTexture('#633d1f');
const ironTex = createStoneTexture('#6b7682');

export function setTargetModel(lvlNum) {
  for (const m of targetMeshes) TR.remove(m);
  targetMeshes = [];
  const useStump = lvlNum % 2 === 0;
  state.targetFrontZ = useStump ? 0.15 : 0.06;
  const raw = useStump ? ASSETS.target_stump : ASSETS.target;
  const board = normModel(raw, TR_R * 2, { x: 0, y: 0, z: 0 }, false);
  board.updateMatrixWorld(true);
  const frontMat = makeToonMaterial({ map: targetTex });

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
  enableShadow(board, true, true);
  addToonOutline(board, 1.022);
  TR.add(board);
  targetMeshes.push(board);

  // Lớp phủ đụng độ của bia: Xanh lá = Vùng cắm hợp lệ (Target Zone)
  const tgCol = new THREE.Mesh(
    new THREE.CylinderGeometry(TR_R, TR_R, 0.24, 24),
    getColliderMat(0x4cff72)
  );
  tgCol.rotation.x = Math.PI / 2;
  tgCol.position.z = state.targetFrontZ - 0.12;
  tgCol.visible = state.showHitbox;
  tgCol.userData = { isCollider: true };
  TR.add(tgCol);
  targetMeshes.push(tgCol);
}

/** Tạo/ẩn đường ray nằm ngang hết chiều rộng con đường (5m) cho bệ đỡ bia từ màn 4. */
export function setTargetRail(ampX, z) {
  while (railGrp.children.length) railGrp.remove(railGrp.children[0]);
  for (let i = ENV_COLLIDERS.length - 1; i >= 0; i--) {
    if (ENV_COLLIDERS[i].kind === 'rail') ENV_COLLIDERS.splice(i, 1);
  }
  const active = ampX > 0;
  cartGrp.visible = active;
  standPost.position.y = active ? 0.14 : 0;
  if (!active) {
    railGrp.visible = false;
    return;
  }
  railGrp.visible = true;
  railGrp.position.set(0, 0, z - 0.32);

  // Con đường (lane) rộng 5m (x từ -2.5 đến +2.5)
  const span = 5.0;
  const railMat = makeToonMaterial({ map: ironTex });
  const tieMat = makeToonMaterial({ map: woodTex, color: 0x9c7b5c });
  const stopMat = makeToonMaterial({ map: ironTex, color: 0xb84b1a });

  for (const rz of [-0.22, 0.22]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(span, 0.06, 0.07), railMat);
    bar.position.set(0, 0.05, rz);
    bar.castShadow = bar.receiveShadow = true;
    railGrp.add(bar);
  }
  const tieGeo = new THREE.BoxGeometry(0.14, 0.04, 0.72);
  const count = 11;
  for (let i = 0; i <= count; i++) {
    const tx = -span * 0.5 + (span * i) / count;
    const tie = new THREE.Mesh(tieGeo, tieMat);
    tie.position.set(tx, 0.02, 0);
    tie.castShadow = tie.receiveShadow = true;
    railGrp.add(tie);
  }
  const stopGeo = new THREE.BoxGeometry(0.10, 0.14, 0.62);
  for (const sx of [-span * 0.5, span * 0.5]) {
    const stop = new THREE.Mesh(stopGeo, stopMat);
    stop.position.set(sx, 0.07, 0);
    stop.castShadow = stop.receiveShadow = true;
    railGrp.add(stop);
  }

  const railLb = { minX: -span * 0.5, maxX: span * 0.5, minY: 0, maxY: 0.14, minZ: -0.36, maxZ: 0.36 };
  addBoxOverlay(railGrp, railLb, 0x9e7bff, true);
  ENV_COLLIDERS.push({ kind: 'rail', box: offsetBox(railLb, railGrp.position) });
}

export function buildEnvironment() {
  ENV_COLLIDERS.length = 0;

  for (const bf of bonfires) {
    ENV_COLLIDERS.push({ kind: 'bonfire', obj: bf.g, halfX: 0.52, maxY: 0.85, halfZ: 0.52 });
  }

  // Giá đỡ bia từ target_stand.glb + xe đẩy có 4 bánh lăn trên đường ray
  while (standPost.children.length) standPost.remove(standPost.children[0]);
  while (cartGrp.children.length) cartGrp.remove(cartGrp.children[0]);
  cartWheels.length = 0;

  const st = normModel(ASSETS.target_stand, 2.4, { x: 0, y: 0, z: 0 }, true);
  // Thu gọn nhẹ chiều ngang/sâu của 4 chân trụ để nằm gọn trong bệ xe
  st.scale.set(0.75, 1, 0.70);
  st.updateMatrixWorld(true);
  colorByPart(st, (v, nm, nx, ny) => (ny < 0.15 ? 0x3f2612 : 0x5e3b1d));
  const stLb = localBounds(st);
  // Giới hạn khối bao chân bia nằm dưới và phía sau mặt bia để không đè lên vùng cắm bia
  stLb.maxY = Math.min(stLb.maxY, 1.45);
  stLb.maxZ = Math.min(stLb.maxZ, 0.17);
  enableShadow(st, true, true);
  standPost.add(st);
  addBoxOverlay(standPost, stLb, 0x9e7bff);
  ENV_COLLIDERS.push({ kind: 'stand', local: stLb, obj: standGrp, post: standPost });

  const deckMat = makeToonMaterial({ map: woodTex });
  const wheelMat = makeToonMaterial({ map: ironTex, color: 0x707d8a });
  const spokeMat = makeToonMaterial({ color: 0x9aa7b4 });
  const deckW = Math.max(1.05, (Number.isFinite(stLb.minX) ? stLb.maxX - stLb.minX : 0.9) + 0.18);
  const deckD = Math.max(0.72, (Number.isFinite(stLb.minZ) ? stLb.maxZ - stLb.minZ : 0.56) + 0.18);
  const deckCx = Number.isFinite(stLb.minX) ? (stLb.minX + stLb.maxX) * 0.5 : 0;
  const deckCz = Number.isFinite(stLb.minZ) ? (stLb.minZ + stLb.maxZ) * 0.5 : 0;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(deckW, 0.08, deckD), deckMat);
  deck.position.set(deckCx, 0.14, deckCz);
  deck.castShadow = deck.receiveShadow = true;
  cartGrp.add(deck);
  const wGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.06, 12);
  const sGeo = new THREE.BoxGeometry(0.14, 0.03, 0.07);
  for (const wx of [deckCx - deckW * 0.36, deckCx + deckW * 0.36]) {
    for (const wz of [-0.22, 0.22]) {
      const wg = new THREE.Group();
      wg.position.set(wx, 0.10, wz);
      const wMesh = new THREE.Mesh(wGeo, wheelMat);
      wMesh.rotation.x = Math.PI / 2;
      wMesh.castShadow = wMesh.receiveShadow = true;
      const spMesh = new THREE.Mesh(sGeo, spokeMat);
      spMesh.castShadow = true;
      wg.add(wMesh, spMesh);
      cartGrp.add(wg);
      cartWheels.push(wg);
    }
  }
  cartGrp.visible = state.tg.ampX > 0;

  // Cụm đá rêu + rừng thông gộp bằng InstancedMesh để giảm draw calls
  let s = 7;
  const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;

  const extractTemplateParts = (raw, colorFn) => {
    const proto = normModel(raw, 1, { x: 0, y: 0, z: 0 }, true);
    proto.updateMatrixWorld(true);
    colorByPart(proto, colorFn);
    proto.updateMatrixWorld(true);
    const parts = [];
    proto.traverse(n => {
      if (!n.isMesh || !n.geometry) return;
      const g = n.geometry.clone();
      g.applyMatrix4(n.matrixWorld);
      parts.push({ geometry: g, material: n.material });
    });
    const baseBox = localBounds(proto);
    return { parts, baseBox };
  };

  const transformedBounds = (baseBox, rotY, k) => {
    const c = Math.cos(rotY);
    const sn = Math.sin(rotY);
    const b = emptyBox();
    for (const bx of [baseBox.minX, baseBox.maxX]) {
      for (const by of [baseBox.minY, baseBox.maxY]) {
        for (const bz of [baseBox.minZ, baseBox.maxZ]) {
          const rx = (bx * c + bz * sn) * k;
          const rz = (-bx * sn + bz * c) * k;
          expandBox(b, rx, by * k, rz);
        }
      }
    }
    return b;
  };

  const createInstGroup = (parts, count, castShadow, receiveShadow) => {
    return parts.map(p => {
      const inst = new THREE.InstancedMesh(p.geometry, p.material, count);
      inst.castShadow = castShadow;
      inst.receiveShadow = receiveShadow;
      inst.frustumCulled = false;
      scene.add(inst);
      return inst;
    });
  };

  const instPos = new THREE.Vector3();
  const instQuat = new THREE.Quaternion();
  const instScale = new THREE.Vector3();
  const instEuler = new THREE.Euler();
  const instMat = new THREE.Matrix4();

  const rockTpl = extractTemplateParts(ASSETS.fence_rock, (v, nm, nx, ny) =>
    ny > 0.55 && nm.y > 0.45 ? 0x587a42 : nx < 0.35 && ny > 0.45 ? 0x6e4726 : 0x737874
  );
  const ROCK_COUNT = 26;
  const rockInsts = createInstGroup(rockTpl.parts, ROCK_COUNT, true, true);
  const rocks = [];

  for (let i = 0; i < ROCK_COUNT; i++) {
    const x = (rnd() < 0.5 ? -1 : 1) * (3.6 + rnd() * 6);
    const z = -rnd() * 88 + 2;
    const k = 1.1 + rnd() * 0.9;
    const rotY = rnd() * Math.PI * 2;
    instPos.set(x, 0, z);
    instEuler.set(0, rotY, 0);
    instQuat.setFromEuler(instEuler);
    instScale.setScalar(k);
    instMat.compose(instPos, instQuat, instScale);
    for (const inst of rockInsts) inst.setMatrixAt(i, instMat);

    const lb = transformedBounds(rockTpl.baseBox, rotY, k);
    const boxAnchor = new THREE.Group();
    boxAnchor.position.set(x, 0, z);
    addBoxOverlay(boxAnchor, lb, 0x9e7bff, true);
    scene.add(boxAnchor);
    ENV_COLLIDERS.push({ kind: 'rock', box: offsetBox(lb, boxAnchor.position) });
    rocks.push({ x, z });
  }
  for (const inst of rockInsts) inst.instanceMatrix.needsUpdate = true;

  const tree1Tpl = extractTemplateParts(ASSETS.pine_tree_1, (v, nm, nx, ny) => {
    const r = Math.hypot(v.x, v.z);
    if (ny < 0.26 && r < 0.14) return 0x5c381e;
    return ny > 0.72 ? 0x4f8d44 : 0x3b6e32;
  });
  const tree2Tpl = extractTemplateParts(ASSETS.pine_tree_2, (v, nm, nx, ny) => {
    const r = Math.hypot(v.x, v.z);
    if (ny < 0.26 && r < 0.14) return 0x5c381e;
    return ny > 0.72 ? 0x4f8d44 : 0x2e5b2a;
  });

  const treeSpawns1 = [];
  const treeSpawns2 = [];
  for (let i = 0; i < 75; i++) {
    let x = (rnd() < 0.5 ? -1 : 1) * (6.2 + rnd() * 40);
    const z = -rnd() * 95 + 5;
    if (rocks.some(r => Math.hypot(r.x - x, r.z - z) < 3.0)) x += x > 0 ? 3.5 : -3.5;
    const k = 3.6 + rnd() * 4.2;
    const isTree1 = rnd() < 0.55;
    const rotY = rnd() * Math.PI * 2;
    const ph = rnd() * Math.PI * 2;
    const sp = 0.9 + rnd() * 0.6;
    (isTree1 ? treeSpawns1 : treeSpawns2).push({ x, z, k, rotY, ph, sp });
  }

  const tree1Insts = createInstGroup(tree1Tpl.parts, treeSpawns1.length, true, true);
  const tree2Insts = createInstGroup(tree2Tpl.parts, treeSpawns2.length, true, true);
  for (const inst of [...tree1Insts, ...tree2Insts]) {
    patchTreeWindShader(inst.material, terrainShaderUniforms);
  }

  const registerTrees = (spawns, tpl, insts) => {
    for (let i = 0; i < spawns.length; i++) {
      const t = spawns[i];
      instPos.set(t.x, 0, t.z);
      instEuler.set(0, t.rotY, 0);
      instQuat.setFromEuler(instEuler);
      instScale.setScalar(t.k);
      instMat.compose(instPos, instQuat, instScale);
      for (const inst of insts) inst.setMatrixAt(i, instMat);

      const lb = transformedBounds(tpl.baseBox, t.rotY, t.k);
      const boxAnchor = new THREE.Group();
      boxAnchor.position.set(t.x, 0, t.z);
      addBoxOverlay(boxAnchor, lb, 0x9e7bff, true);
      scene.add(boxAnchor);
      ENV_COLLIDERS.push({ kind: 'tree', box: offsetBox(lb, boxAnchor.position) });
    }
    for (const inst of insts) inst.instanceMatrix.needsUpdate = true;
  };
  registerTrees(treeSpawns1, tree1Tpl, tree1Insts);
  registerTrees(treeSpawns2, tree2Tpl, tree2Insts);

  // Bụi cỏ low-poly thấp phong cách Zelda BotW: 1 InstancedMesh duy nhất (18 tam giác/bụi), không đổ bóng, gió chạy trên GPU
  {
    const pos = [];
    const blades = [
      { ang: 0.0, ox: 0.0, oz: 0.0, h: 0.30, w: 0.09, lean: 0.06 },
      { ang: 1.05, ox: 0.06, oz: 0.03, h: 0.24, w: 0.08, lean: 0.10 },
      { ang: 2.1, ox: -0.05, oz: 0.05, h: 0.27, w: 0.085, lean: 0.09 },
      { ang: 3.15, ox: -0.06, oz: -0.04, h: 0.22, w: 0.075, lean: 0.11 },
      { ang: 4.2, ox: 0.04, oz: -0.06, h: 0.26, w: 0.08, lean: 0.08 },
      { ang: 5.25, ox: 0.01, oz: 0.07, h: 0.21, w: 0.075, lean: 0.12 }
    ];
    for (const b of blades) {
      const ca = Math.cos(b.ang);
      const sa = Math.sin(b.ang);
      const px = -sa;
      const pz = ca;
      const hw = b.w * 0.5;
      const mw = b.w * 0.26;
      const mh = b.h * 0.52;
      const ml = b.lean * 0.35;
      const x0 = b.ox - px * hw, z0 = b.oz - pz * hw;
      const x1 = b.ox + px * hw, z1 = b.oz + pz * hw;
      const mx0 = b.ox + ml * ca - px * mw, mz0 = b.oz + ml * sa - pz * mw;
      const mx1 = b.ox + ml * ca + px * mw, mz1 = b.oz + ml * sa + pz * mw;
      const tx = b.ox + b.lean * ca, tz = b.oz + b.lean * sa;
      pos.push(
        x0, 0, z0, x1, 0, z1, mx0, mh, mz0,
        x1, 0, z1, mx1, mh, mz1, mx0, mh, mz0,
        mx0, mh, mz0, mx1, mh, mz1, tx, b.h, tz
      );
    }
    const grassGeo = new THREE.BufferGeometry();
    grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    grassGeo.computeVertexNormals();

    const grassMat = patchGrassWindShader(
      makeToonMaterial({
        color: 0xffffff,
        flatShading: true,
        side: THREE.DoubleSide
      }),
      terrainShaderUniforms
    );
    const GRASS_COUNT = 850;
    const grassInst = new THREE.InstancedMesh(grassGeo, grassMat, GRASS_COUNT);
    grassInst.castShadow = false;
    grassInst.receiveShadow = false;
    grassInst.frustumCulled = false;

    const grassPalette = [0xffffff, 0xe8ffbd, 0xc8f08a, 0xd8f8a0];
    const gCol = new THREE.Color();
    let placed = 0;
    while (placed < GRASS_COUNT) {
      const side = rnd() < 0.5 ? -1 : 1;
      const nearLane = rnd() < 0.78;
      const x = side * (2.75 + (nearLane ? rnd() * 11 : rnd() * 20));
      const z = 1 - rnd() * 54;
      if (Math.abs(Math.abs(x) - 3.25) < 0.85 && Math.abs(z + 14.4) < 1.2) continue;

      instPos.set(x, 0, z);
      instEuler.set(0, rnd() * Math.PI * 2, 0);
      instQuat.setFromEuler(instEuler);
      const scXZ = 0.8 + rnd() * 0.6;
      const scY = 0.65 + rnd() * 0.45;
      instScale.set(scXZ, scY, scXZ);
      instMat.compose(instPos, instQuat, instScale);
      grassInst.setMatrixAt(placed, instMat);

      gCol.setHex(grassPalette[Math.floor(rnd() * grassPalette.length)]);
      grassInst.setColorAt(placed, gCol);
      placed++;
    }
    grassInst.instanceMatrix.needsUpdate = true;
    if (grassInst.instanceColor) grassInst.instanceColor.needsUpdate = true;
    scene.add(grassInst);
  }
}
