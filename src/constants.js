// ================= HẰNG SỐ & CẤU HÌNH =================
export const GRAV = 13.5;
export const DRAG = 0.05;
export const MAX_PULL = 150;
export const AXES = 6;
export const STICK_COS = -0.15;
export const HL = 0.53;
export const TR_R = 1.2;
export const RINGS = [[0.17, 100], [0.45, 50], [0.78, 25], [1.2, 10]];
export const BULL_R = 0.09;
export const BULL_BONUS = 50;
export const CAM_Y = 1.6;
export const ORIGIN = new THREE.Vector3(0.12, 1.86, -1.1);

const VIKING_AXE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M5 20.5 L15.5 8.5" stroke="#11131c" stroke-width="4.6" stroke-linecap="round"/>' +
  '<path d="M5 20.5 L15.5 8.5" stroke="#c27438" stroke-width="2.5" stroke-linecap="round"/>' +
  '<path d="M6.4 18.9 L9.2 15.7" stroke="#6b3414" stroke-width="3" stroke-linecap="round"/>' +
  '<path d="M12.2 6.8 C16.4 3.8 20.6 5.2 21 9.8 C21.3 13.6 18.4 17.2 14.5 17.5 C14.9 14.5 14.4 12.6 12.8 11.4 L10.8 9.6 Z" fill="#dbeafe" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M18.6 6.8 C19.8 9.2 19.3 12.6 16.8 15.4" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" fill="none"/>' +
  '<circle cx="13.8" cy="9.6" r="1.4" fill="#94a3b8" stroke="#11131c" stroke-width="1.2"/>' +
  '</svg>';

const DOUBLE_AXE_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M12 21 L12 4" stroke="#11131c" stroke-width="4.2" stroke-linecap="round"/>' +
  '<path d="M12 21 L12 4" stroke="#d98a3c" stroke-width="2.2" stroke-linecap="round"/>' +
  '<path d="M10.5 6.5 L5.2 4.5 C3.4 7.5 3.4 11.5 5.2 14.5 L10.5 12.5 Z" fill="#e2e8f0" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M13.5 6.5 L18.8 4.5 C20.6 7.5 20.6 11.5 18.8 14.5 L13.5 12.5 Z" fill="#e2e8f0" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<rect x="10.1" y="7.4" width="3.8" height="4.2" rx="0.8" fill="#94a3b8" stroke="#11131c" stroke-width="1.5"/>' +
  '</svg>';

const TOMAHAWK_SVG =
  '<svg viewBox="0 0 24 24" aria-hidden="true">' +
  '<path d="M5.5 20.5 L15 7.5" stroke="#11131c" stroke-width="4.2" stroke-linecap="round"/>' +
  '<path d="M5.5 20.5 L15 7.5" stroke="#eab308" stroke-width="2.2" stroke-linecap="round"/>' +
  '<path d="M12.8 7.8 L7.5 5.6 L11.2 10.6 Z" fill="#94a3b8" stroke="#11131c" stroke-width="1.6" stroke-linejoin="round"/>' +
  '<path d="M13.2 7.2 L19.8 5.2 L20.4 11.8 L14.2 11.2 Z" fill="#fef08a" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>' +
  '<path d="M18.5 6.4 L19 10.5" stroke="#ffffff" stroke-width="1.4" stroke-linecap="round"/>' +
  '<rect x="11.5" y="7.5" width="3.2" height="3.2" rx="0.7" transform="rotate(-35 13.1 9.1)" fill="#f59e0b" stroke="#11131c" stroke-width="1.4"/>' +
  '</svg>';

const svgWrap = body => `<svg viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;

export const UI_ICONS = {
  pause: svgWrap('<rect x="6" y="5" width="4.5" height="14" rx="1.2" fill="#ffd23f" stroke="#11131c" stroke-width="1.8"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.2" fill="#ffd23f" stroke="#11131c" stroke-width="1.8"/>'),
  bot: svgWrap('<rect x="5" y="7" width="14" height="11" rx="3" fill="#c084fc" stroke="#11131c" stroke-width="1.8"/><path d="M12 7 V4" stroke="#11131c" stroke-width="2"/><circle cx="12" cy="3.5" r="1.5" fill="#ffd23f" stroke="#11131c" stroke-width="1.3"/><circle cx="9.2" cy="12" r="1.5" fill="#fff" stroke="#11131c" stroke-width="1.2"/><circle cx="14.8" cy="12" r="1.5" fill="#fff" stroke="#11131c" stroke-width="1.2"/><path d="M9 15.2 H15" stroke="#11131c" stroke-width="1.8" stroke-linecap="round"/>'),
  hitbox: svgWrap('<path d="M12 3 L20 7.5 V16.5 L12 21 L4 16.5 V7.5 Z" fill="#60a5fa" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/><path d="M4 7.5 L12 12 L20 7.5 M12 12 V21" fill="none" stroke="#11131c" stroke-width="1.6"/>'),
  photo: svgWrap('<rect x="3" y="7" width="18" height="13" rx="2.5" fill="#38bdf8" stroke="#11131c" stroke-width="1.8"/><path d="M8 7 L9.8 4.5 H14.2 L16 7" fill="#38bdf8" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/><circle cx="12" cy="13.5" r="3.6" fill="#fef08a" stroke="#11131c" stroke-width="1.8"/>'),
  follow: svgWrap('<path d="M3 8.5 H15 V17.5 H3 Z" fill="#4ade80" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/><path d="M15 11 L21 7.5 V18.5 L15 15 Z" fill="#22c55e" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>'),
  replay: svgWrap('<path d="M4 12 A8 8 0 1 1 6.5 17.8" fill="none" stroke="#11131c" stroke-width="4" stroke-linecap="round"/><path d="M4 12 A8 8 0 1 1 6.5 17.8" fill="none" stroke="#fb923c" stroke-width="2.2" stroke-linecap="round"/><path d="M2 8.5 L4.2 12.8 L8.5 10.6 Z" fill="#fb923c" stroke="#11131c" stroke-width="1.5" stroke-linejoin="round"/>')
};

const WEATHER_AUTO_SVG = svgWrap(
  '<circle cx="15.5" cy="7.5" r="3.2" fill="#ffd23f" stroke="#11131c" stroke-width="1.6"/>' +
  '<path d="M6.5 14.5 H14.8 A2.7 2.7 0 0 0 15.2 9.2 A3.6 3.6 0 0 0 8.3 8.6 A3 3 0 0 0 6.5 14.5 Z" fill="#eef6ff" stroke="#11131c" stroke-width="1.7" stroke-linejoin="round"/>' +
  '<path d="M18.5 15.5 A7 7 0 0 1 6.8 18.8" fill="none" stroke="#11131c" stroke-width="3.4" stroke-linecap="round"/>' +
  '<path d="M18.5 15.5 A7 7 0 0 1 6.8 18.8" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round"/>'
);

export const AXE_TYPES = [
  { key: 'axe', icon: '🪓', iconHtml: VIKING_AXE_SVG, label: '🪓 Rìu Viking', gripScale: 0.48, tipZ: 0.50, tipY: 0.04, colliderColor: 0x00e5ff, mass: 1.0 },
  { key: 'axe_double', icon: '⚔️', iconHtml: DOUBLE_AXE_SVG, label: '⚔️ Rìu 2 Lưỡi', gripScale: 0.46, tipZ: 0.34, tipY: -0.35, colliderColor: 0xff3d7f, mass: 1.35 },
  { key: 'axe_tomahawk', icon: '🪶', iconHtml: TOMAHAWK_SVG, label: '🪶 Tomahawk', gripScale: 0.50, tipZ: 0.44, tipY: -0.10, colliderColor: 0xffc400, mass: 0.75 }
];

export const TIME_MODES = [
  { k: 'auto', icon: '🔄', iconHtml: svgWrap('<circle cx="12" cy="12" r="7.5" fill="#fde047" stroke="#11131c" stroke-width="1.8"/><path d="M12 4.5 A7.5 7.5 0 0 1 12 19.5 Z" fill="#6366f1" stroke="#11131c" stroke-width="1.6"/>'), t: '🔄 Tự động' },
  { k: 'day', icon: '☀️', iconHtml: svgWrap('<circle cx="12" cy="12" r="4.5" fill="#ffd23f" stroke="#11131c" stroke-width="1.8"/><path d="M12 2.5 V5 M12 19 V21.5 M2.5 12 H5 M19 12 H21.5 M5.2 5.2 L7 7 M17 17 L18.8 18.8 M18.8 5.2 L17 7 M7 17 L5.2 18.8" stroke="#11131c" stroke-width="2" stroke-linecap="round"/>'), t: '☀️ Ngày' },
  { k: 'night', icon: '🌙', iconHtml: svgWrap('<path d="M15.5 4.5 A7.5 7.5 0 1 0 19.5 16.5 A6 6 0 0 1 15.5 4.5 Z" fill="#fef08a" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>'), t: '🌙 Đêm' }
];

export const WEATHER_MODES = [
  { k: 'auto', icon: '🌦️', iconHtml: WEATHER_AUTO_SVG, t: '🌦️ Thời tiết: Tự động (V)' },
  { k: 'clear', icon: '🌤️', iconHtml: svgWrap('<circle cx="14.5" cy="9.5" r="4" fill="#ffd23f" stroke="#11131c" stroke-width="1.7"/><path d="M6 17 H15.5 A3 3 0 0 0 16 11.2 A4 4 0 0 0 8.5 10.5 A3.2 3.2 0 0 0 6 17 Z" fill="#f8fafc" stroke="#11131c" stroke-width="1.8" stroke-linejoin="round"/>'), t: '🌤️ Thời tiết: Quang đãng (V)' },
  { k: 'rain', icon: '🌧️', iconHtml: svgWrap('<path d="M6 14 H16.5 A3 3 0 0 0 17 8.2 A4 4 0 0 0 9.2 7.5 A3.2 3.2 0 0 0 6 14 Z" fill="#cbd5e1" stroke="#11131c" stroke-width="1.8"/><path d="M8.5 16.5 L7.2 20 M12.5 16.5 L11.2 20 M16.5 16.5 L15.2 20" stroke="#38bdf8" stroke-width="2.2" stroke-linecap="round"/>'), t: '🌧️ Thời tiết: Mưa (V)' },
  { k: 'snow', icon: '❄️', iconHtml: svgWrap('<path d="M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5" stroke="#11131c" stroke-width="3.6" stroke-linecap="round"/><path d="M12 3 V21 M4.2 7.5 L19.8 16.5 M19.8 7.5 L4.2 16.5" stroke="#e0f2fe" stroke-width="1.8" stroke-linecap="round"/>'), t: '❄️ Thời tiết: Tuyết (V)' },
  { k: 'fog', icon: '🌫️', iconHtml: svgWrap('<path d="M4 8 H18 M6 12.5 H20 M4 17 H16" stroke="#11131c" stroke-width="4" stroke-linecap="round"/><path d="M4 8 H18 M6 12.5 H20 M4 17 H16" stroke="#cbd5e1" stroke-width="2.2" stroke-linecap="round"/>'), t: '🌫️ Thời tiết: Sương mù (V)' }
];

export const REP_SPDS = [0.25, 0.5, 1];

export const GRAPHICS_MODES = [
  { k: 'low', pixelRatioCap: 1, shadowSize: 0, softShadow: false, weatherScale: 0.45, bonfireLight: false },
  { k: 'med', pixelRatioCap: 1.5, shadowSize: 1024, softShadow: false, weatherScale: 0.75, bonfireLight: true },
  { k: 'high', pixelRatioCap: 2, shadowSize: 2048, softShadow: true, weatherScale: 1, bonfireLight: true }
];

export const $ = id => document.getElementById(id);
export const ov = $('ov');
