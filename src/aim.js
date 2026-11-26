import { MAX_PULL } from './constants.js';

/** Tính vector vận tốc và góc ngắm từ thao tác kéo chuột/chạm (có xét khối lượng rìu). */
export function aimVec(dx, dy, hold = 0, mass = 1) {
  const u = hold % 2;
  const p = u <= 1 ? u : 2 - u;
  const el = Math.max(0, Math.min(1, 0.35 + dy / MAX_PULL));
  const yaw = Math.max(-1, Math.min(1, -dx / MAX_PULL)) * 0.45;
  const pit = 0.05 + el * 0.65;
  const sp = (10 + p * 18) / Math.sqrt(mass);
  return {
    v: new THREE.Vector3(
      sp * Math.cos(pit) * Math.sin(yaw),
      sp * Math.sin(pit),
      -sp * Math.cos(pit) * Math.cos(yaw)
    ),
    p,
    el,
    yaw,
    pit,
    sp
  };
}

/** Tính tọa độ đầu lưỡi rìu trong không gian thế giới. */
export function tipOf(a, ty = a.tipY, tz = a.tipZ) {
  const c = Math.cos(a.th);
  const s = Math.sin(a.th);
  const ly = ty * c + tz * s;
  const lz = ty * s - tz * c;
  const psi = Math.atan2(-a.v.x, -a.v.z);
  return new THREE.Vector3(
    a.p.x + lz * Math.sin(psi),
    a.p.y + ly,
    a.p.z + lz * Math.cos(psi)
  );
}
