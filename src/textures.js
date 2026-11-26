// ================= TEXTURE CHI TIẾT (CANVAS) =================
function makeRng(seed) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

function makeCanvas(w, h, draw) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

/** Texture thảm cỏ tự nhiên (lặp lại trên mặt đất). */
export function createGrassTexture() {
  const tex = makeCanvas(1024, 1024, (ctx, w, h) => {
    const rnd = makeRng(101);
    ctx.fillStyle = '#658531';
    ctx.fillRect(0, 0, w, h);

    // Các mảng rêu & đất ẩn nhẹ
    for (let i = 0; i < 180; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 18 + rnd() * 52;
      ctx.fillStyle = rnd() < 0.55 ? 'rgba(78,112,34,0.28)' : 'rgba(128,158,60,0.26)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sợi cỏ mảnh dày đặc
    for (let i = 0; i < 6500; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const len = 5 + rnd() * 10;
      const ang = -Math.PI * 0.5 + (rnd() - 0.5) * 0.95;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(148,182,70,0.42)' : 'rgba(52,78,20,0.36)';
      ctx.lineWidth = 1 + rnd() * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      ctx.stroke();
    }

    // Đốm đất & hoa dại li ti
    for (let i = 0; i < 320; i++) {
      ctx.fillStyle = rnd() < 0.8 ? 'rgba(92,74,40,0.26)' : 'rgba(245,235,175,0.5)';
      ctx.fillRect(rnd() * w, rnd() * h, 2.5, 2.5);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(48, 48);
  return tex;
}

/** Texture đường ném rìu (đất nén, sỏi nhỏ và viền cỏ hai bên). */
export function createLaneTexture() {
  const tex = makeCanvas(1024, 1024, (ctx, w, h) => {
    const rnd = makeRng(202);
    ctx.fillStyle = '#8b6838';
    ctx.fillRect(0, 0, w, h);

    // Dải mòn ở giữa đường ném
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, 'rgba(68,94,34,0.72)');
    grad.addColorStop(0.06, 'rgba(98,70,36,0.38)');
    grad.addColorStop(0.25, 'rgba(150,114,64,0.22)');
    grad.addColorStop(0.5, 'rgba(166,130,78,0.30)');
    grad.addColorStop(0.75, 'rgba(150,114,64,0.22)');
    grad.addColorStop(0.94, 'rgba(98,70,36,0.38)');
    grad.addColorStop(1, 'rgba(68,94,34,0.72)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Vệt đất & vết bước chân mờ dọc đường
    for (let i = 0; i < 360; i++) {
      const x = 50 + rnd() * (w - 100);
      const y = rnd() * h;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(104,74,36,0.22)' : 'rgba(182,146,92,0.18)';
      ctx.beginPath();
      ctx.ellipse(x, y, 6 + rnd() * 20, 14 + rnd() * 38, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sỏi nhỏ rải rác
    for (let i = 0; i < 700; i++) {
      const x = 36 + rnd() * (w - 72);
      const y = rnd() * h;
      const r = 1.2 + rnd() * 3.5;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(72,56,38,0.48)' : 'rgba(205,182,145,0.38)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 22);
  return tex;
}

/** Texture vân gỗ cho giá đỡ, tà vẹt đường ray và củi đốt. */
export function createWoodTexture(baseHex = '#633d1f') {
  const tex = makeCanvas(512, 512, (ctx, w, h) => {
    const rnd = makeRng(303);
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);

    for (let i = 0; i < 190; i++) {
      const y = rnd() * h;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(36,18,6,0.28)' : 'rgba(165,112,64,0.18)';
      ctx.lineWidth = 1.2 + rnd() * 2.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.33, y + (rnd() - 0.5) * 14, w * 0.66, y + (rnd() - 0.5) * 14, w, y);
      ctx.stroke();
    }

    // Mắt gỗ
    for (let i = 0; i < 6; i++) {
      const kx = 50 + rnd() * (w - 100);
      const ky = 40 + rnd() * (h - 80);
      ctx.strokeStyle = 'rgba(32,16,6,0.35)';
      ctx.lineWidth = 1.8;
      for (let r = 6; r <= 20; r += 6) {
        ctx.beginPath();
        ctx.ellipse(kx, ky, r * 1.6, r * 0.7, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Texture đá / kim loại sần nhẹ cho đá lửa trại và thanh ray. */
export function createStoneTexture(baseHex = '#62676b') {
  const tex = makeCanvas(512, 512, (ctx, w, h) => {
    const rnd = makeRng(404);
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const sz = 1.5 + rnd() * 5;
      ctx.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.11)' : 'rgba(15,18,22,0.18)';
      ctx.fillRect(x, y, sz, sz);
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** Texture mặt bia gỗ chi tiết (vòng sinh trưởng, thớ gỗ, vết nứt và sơn vòng điểm). */
export function createTargetTexture(targetRadius = 1.2) {
  return makeCanvas(1024, 1024, (ctx, w, h) => {
    const rnd = makeRng(505);
    const cx = w * 0.5;
    const cy = h * 0.5;
    const Rpx = w * 0.5;

    // Nền vỏ cây tối
    ctx.fillStyle = '#4a2b13';
    ctx.fillRect(0, 0, w, h);

    // Các vòng điểm sơn trên mặt gỗ
    const rings = [
      [1.15, '#9c6230'],
      [0.78, '#e6c796'],
      [0.45, '#d9442b'],
      [0.17, '#ffd23f'],
      [0.09, '#ffe885']
    ];
    for (const [r, c] of rings) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / targetRadius) * Rpx, 0, Math.PI * 2);
      ctx.fillStyle = c;
      ctx.fill();
    }

    // Vòng sinh trưởng đồng tâm của thân gỗ
    for (let r = 18; r < Rpx * 0.96; r += 11 + rnd() * 8) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(65, 34, 12, 0.14)';
      ctx.lineWidth = 1.2 + rnd() * 1.4;
      ctx.stroke();
    }

    // Thớ gỗ dọc nhẹ xuyên qua lớp sơn
    for (let i = 0; i < 180; i++) {
      const x = rnd() * w;
      ctx.strokeStyle = rnd() < 0.5 ? 'rgba(72,38,14,0.08)' : 'rgba(255,244,214,0.06)';
      ctx.lineWidth = 1 + rnd() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x + (rnd() - 0.5) * 14, h);
      ctx.stroke();
    }

    // Vết nứt hướng tâm tự nhiên trên thớ gỗ
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + (rnd() - 0.5) * 0.25;
      const r0 = 75 + rnd() * 140;
      const r1 = r0 + 70 + rnd() * 170;
      ctx.strokeStyle = 'rgba(42, 20, 6, 0.28)';
      ctx.lineWidth = 1.5 + rnd() * 2;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      ctx.lineTo(cx + Math.cos(a + 0.02) * ((r0 + r1) * 0.5), cy + Math.sin(a + 0.02) * ((r0 + r1) * 0.5));
      ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      ctx.stroke();
    }

    // Viền phân tách các vòng điểm sắc nét
    for (const r of [1.15, 0.78, 0.45, 0.17]) {
      ctx.beginPath();
      ctx.arc(cx, cy, (r / targetRadius) * Rpx, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(45, 22, 8, 0.35)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  });
}
