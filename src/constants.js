// ================= HẰNG SỐ & CẤU HÌNH =================
export const GRAV = 9.8;
export const DRAG = 0.05;
export const MAX_PULL = 150;
export const AXES = 5;
export const STICK_COS = -0.15;
export const HL = 0.53;
export const TR_R = 1.2;
export const RINGS = [[0.17, 100], [0.45, 50], [0.78, 25], [1.2, 10]];
export const BULL_R = 0.09;
export const BULL_BONUS = 50;
export const CAM_Y = 1.6;
export const ORIGIN = new THREE.Vector3(0.12, 1.86, -1.1);

export const AXE_TYPES = [
  { key: 'axe', label: '🪓 Rìu Viking', gripScale: 0.48, tipZ: 0.72, tipY: 0.04 },
  { key: 'axe_double', label: '⚔️ Rìu 2 Lưỡi', gripScale: 0.46, tipZ: 0.56, tipY: -0.35 },
  { key: 'axe_tomahawk', label: '🪓 Tomahawk', gripScale: 0.50, tipZ: 0.66, tipY: -0.10 }
];

export const TIME_MODES = [
  { k: 'auto', t: '🔄 Tự động' },
  { k: 'day', t: '☀️ Ngày' },
  { k: 'night', t: '🌙 Đêm' }
];

export const REP_SPDS = [0.5, 1, 2];

export const $ = id => document.getElementById(id);
export const ov = $('ov');
