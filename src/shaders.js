// ================= HỆ THỐNG GLSL SHADER =================

/** Tạo vòm trời GLSL (gradient chân trời - đỉnh trời, quầng mặt trời/trăng và chớp). */
export function createSkyDome() {
  const uniforms = {
    uZenithColor: { value: new THREE.Color(0x4a90e2) },
    uHorizonColor: { value: new THREE.Color(0x9bd2ff) },
    uSunDir: { value: new THREE.Vector3(0, 0.7, -0.7).normalize() },
    uSunColor: { value: new THREE.Color(0xfff1c4) },
    uSunGlow: { value: 0.7 },
    uOvercast: { value: 0.0 },
    uLightning: { value: 0.0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vWorldDir;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      uniform float uSunGlow;
      uniform float uOvercast;
      uniform float uLightning;
      varying vec3 vWorldDir;

      void main() {
        vec3 dir = normalize(vWorldDir);
        float h = clamp(dir.y, 0.0, 1.0);
        float grad = pow(h, 0.55);
        vec3 col = mix(uHorizonColor, uZenithColor, grad);

        // Quầng sáng mặt trời / mặt trăng
        float sunAmt = max(dot(dir, normalize(uSunDir)), 0.0);
        float halo = pow(sunAmt, 8.0) * 0.35 + pow(sunAmt, 48.0) * 0.55;
        col += uSunColor * halo * uSunGlow * (1.0 - uOvercast * 0.85);

        // Ánh chớp khi trời mưa bão
        col = mix(col, vec3(0.88, 0.94, 1.0), clamp(uLightning * 0.65, 0.0, 0.8));

        gl_FragColor = vec4(col, 1.0);
      }
    `
  });

  const mesh = new THREE.Mesh(new THREE.SphereGeometry(175, 32, 20), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return { mesh, uniforms };
}

/** Tạo ShaderMaterial ngọn lửa trại bập bùng theo thời gian. */
export function createFlameMaterial(isCore = false) {
  const uniforms = {
    uTime: { value: 0 },
    uIntensity: { value: 1 },
    uCore: { value: isCore ? 1.0 : 0.0 }
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform float uCore;
      varying float vH;
      varying vec2 vUv;
      void main() {
        vec3 p = position;
        // Chiều cao chuẩn hóa theo ConeGeometry(height = 0.75)
        vH = clamp((p.y + 0.375) / 0.75, 0.0, 1.0);
        vUv = uv;
        float sway = sin(uTime * 11.0 + vH * 5.0 + uCore * 2.1) * 0.07 * vH;
        float swayZ = cos(uTime * 9.0 + vH * 4.2) * 0.05 * vH;
        p.x += sway;
        p.z += swayZ;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uIntensity;
      uniform float uCore;
      varying float vH;
      varying vec2 vUv;

      void main() {
        float tongue = sin(vUv.x * 18.84955 + uTime * 8.0) * 0.08;
        float h = clamp(vH + tongue, 0.0, 1.0);
        if (h > 0.88 || uIntensity < 0.05) discard;

        // Phân tầng màu lửa cel-shaded + viền mực ở ngọn
        vec3 col = h < 0.38
          ? vec3(1.0, 0.92, 0.28)
          : h < 0.68
            ? vec3(1.0, 0.48, 0.06)
            : vec3(0.88, 0.16, 0.04);
        if (uCore > 0.5) {
          col = h < 0.52 ? vec3(1.0, 0.99, 0.85) : vec3(1.0, 0.72, 0.14);
        }
        float inkTip = step(0.80, h) * (1.0 - uCore);
        col = mix(col, vec3(0.12, 0.05, 0.03), inkTip * 0.75);
        gl_FragColor = vec4(col, clamp(uIntensity, 0.0, 1.0));
      }
    `
  });

  return mat;
}

/** Tạo ShaderMaterial cho vệt chém kiểu truyện tranh / hoạt hình bám theo lưỡi rìu. */
export function createTrailMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    blending: THREE.NormalBlending,
    vertexShader: /* glsl */ `
      attribute vec3 color;
      varying vec3 vColor;
      varying vec2 vUv;
      void main() {
        vColor = color;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying vec2 vUv;
      void main() {
        float u = vUv.x;
        float v = vUv.y;

        // Cắt sắc nét hai mép kiểu cel-shaded truyện tranh
        float shapeMask = smoothstep(0.0, 0.04, v) * smoothstep(1.0, 0.96, v);

        // Đường nét mực đen (comic ink outline) ở mép ngoài & mép trong
        float inkEdge = step(0.89, v) + step(v, 0.09);

        // Các vệt tốc độ (comic speed lines) tách sợi ở phần đuôi
        float speedLine = step(0.28, fract(v * 4.5 + u * 0.6));
        float tailBreak = mix(speedLine, 1.0, smoothstep(0.18, 0.58, u));

        // Phân tầng màu hoạt hình (cel bands): lõi trắng sáng sát lưỡi rìu
        float hotBand = step(0.68, v);
        vec3 celCol = mix(vColor * 0.92, vec3(1.0, 0.99, 0.92), hotBand * 0.72);
        vec3 finalCol = mix(celCol, vec3(0.06, 0.07, 0.11), clamp(inkEdge, 0.0, 1.0) * 0.85);

        float alpha = shapeMask * tailBreak * smoothstep(0.0, 0.25, u) * 0.94;
        if (alpha < 0.03) discard;
        gl_FragColor = vec4(finalCol, alpha);
      }
    `
  });
}

/** Tạo ShaderMaterial cho vòng sóng xung kích va chạm kiểu truyện tranh (cel-shaded + viền mực + cắt gọn trong mặt bia). */
export function createToonRingMaterial(colorHex = 0x00f0ff, offsetX = 0, offsetY = 0, maxRadius = 1.23) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(colorHex) },
      uProgress: { value: 0 },
      uScale: { value: 1 },
      uOffset: { value: new THREE.Vector2(offsetX, offsetY) },
      uMaxR: { value: maxRadius }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uProgress;
      uniform float uScale;
      uniform vec2 uOffset;
      uniform float uMaxR;
      varying vec2 vPos;
      void main() {
        if (length(vPos * uScale + uOffset) > uMaxR) discard;
        float r = (length(vPos) - 0.08) / 0.07;
        float ang = atan(vPos.y, vPos.x);
        float burst = step(0.18, abs(sin(ang * 8.0)));
        if (uProgress > 0.55 && burst < 0.5) discard;
        float ink = step(0.84, r) + step(r, 0.16);
        vec3 col = mix(uColor, vec3(0.06, 0.07, 0.10), clamp(ink, 0.0, 1.0) * 0.88);
        float alpha = step(uProgress, 0.96);
        if (alpha < 0.5) discard;
        gl_FragColor = vec4(col, 0.95);
      }
    `
  });
}

/** Tạo MeshToonMaterial phong cách Zelda: Breath of the Wild (bóng xanh mát, chuyển bậc sáng rõ, rim light ngược nắng). */
let toonGradTex = null;
export function getToonGradient() {
  if (!toonGradTex) {
    const data = new Uint8Array([118, 198, 255]);
    toonGradTex = new THREE.DataTexture(data, 3, 1, THREE.LuminanceFormat);
    toonGradTex.minFilter = THREE.NearestFilter;
    toonGradTex.magFilter = THREE.NearestFilter;
    toonGradTex.needsUpdate = true;
  }
  return toonGradTex;
}

export const botwShaderUniforms = {
  uBotwSunColor: { value: new THREE.Color(0xfff4d6) },
  uBotwShadowTint: { value: new THREE.Color(0x7aa4d9) },
  uBotwRimStrength: { value: 0.28 }
};

export function makeToonMaterial(colorOrOpts, emissiveHex = 0) {
  const opts = typeof colorOrOpts === 'object' && colorOrOpts !== null
    ? { ...colorOrOpts }
    : { color: colorOrOpts, emissive: emissiveHex };
  opts.gradientMap = getToonGradient();
  const mat = new THREE.MeshToonMaterial(opts);
  mat.onBeforeCompile = shader => {
    shader.uniforms.uBotwSunColor = botwShaderUniforms.uBotwSunColor;
    shader.uniforms.uBotwShadowTint = botwShaderUniforms.uBotwShadowTint;
    shader.uniforms.uBotwRimStrength = botwShaderUniforms.uBotwRimStrength;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uBotwSunColor;
        uniform vec3 uBotwShadowTint;
        uniform float uBotwRimStrength;`
      )
      .replace(
        '#include <fog_fragment>',
        `
        {
          float lum = dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114));
          float shadowMask = 1.0 - smoothstep(0.18, 0.48, lum);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, gl_FragColor.rgb * uBotwShadowTint * 1.25, shadowMask * 0.42);

          vec3 viewDir = normalize(vViewPosition);
          float ndv = clamp(dot(normalize(normal), viewDir), 0.0, 1.0);
          float rim = smoothstep(0.60, 0.72, 1.0 - ndv);
          float litBoost = smoothstep(0.12, 0.55, lum);
          gl_FragColor.rgb += uBotwSunColor * (rim * uBotwRimStrength * (0.25 + 0.75 * litBoost));
        }
        #include <fog_fragment>`
      );
  };
  return mat;
}

/** Gắn viền mực đen kiểu truyện tranh (cel-shaded ink outline) lên các mesh con. */
const toonOutlineMat = new THREE.MeshBasicMaterial({
  color: 0x151821,
  side: THREE.BackSide
});
export function addToonOutline(obj, scale = 1.035) {
  const meshes = [];
  obj.traverse(n => {
    if (n.isMesh && n.geometry && !(n.userData && (n.userData.isCollider || n.userData.isOutline))) {
      meshes.push(n);
    }
  });
  for (const n of meshes) {
    const out = new THREE.Mesh(n.geometry, toonOutlineMat);
    out.scale.setScalar(scale);
    out.castShadow = false;
    out.receiveShadow = false;
    out.userData = { isOutline: true };
    n.add(out);
  }
  return obj;
}

/** Gắn shader gió đung đưa trên GPU cho InstancedMesh cây thông (loại bỏ cập nhật ma trận trên CPU). */
export function patchTreeWindShader(mat, sharedUniforms) {
  const prevCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile(shader, renderer);
    shader.uniforms.uTreeTime = sharedUniforms.uTime;
    shader.uniforms.uTreeWind = sharedUniforms.uWindAmp;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uTreeTime;
        uniform float uTreeWind;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec4 tBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          #else
            vec4 tBase = vec4(0.0);
          #endif
          float ph = tBase.x * 0.37 + tBase.z * 0.29;
          float h = clamp(position.y, 0.0, 1.0);
          float h2 = h * h;
          float sx = sin(uTreeTime * 1.35 * (1.0 + (uTreeWind - 1.0) * 0.55) + ph) * 0.032 * uTreeWind;
          float sz = cos(uTreeTime * 1.05 * (1.0 + (uTreeWind - 1.0) * 0.55) + ph) * 0.018 * uTreeWind;
          transformed.x += sx * h2;
          transformed.z += sz * h2;
        }`
      );
  };
  mat.needsUpdate = true;
  return mat;
}

/** Gắn shader cỏ Zelda: Breath of the Wild (sóng gió GPU, chuyển sắc gốc-ngọn tươi sáng, dải nắng lướt qua đồng cỏ, tuyết/mưa). */
export function patchGrassWindShader(mat, sharedUniforms) {
  const prevCompile = mat.onBeforeCompile;
  mat.onBeforeCompile = (shader, renderer) => {
    if (prevCompile) prevCompile(shader, renderer);
    shader.uniforms.uGrassTime = sharedUniforms.uTime;
    shader.uniforms.uGrassWind = sharedUniforms.uWindAmp;
    shader.uniforms.uGrassDayF = sharedUniforms.uDayF;
    shader.uniforms.uGrassRainF = sharedUniforms.uRainF;
    shader.uniforms.uGrassSnowF = sharedUniforms.uSnowF;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGrassTime;
        uniform float uGrassWind;
        varying float vGrassTip;
        varying float vGrassWave;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        {
          #ifdef USE_INSTANCING
            vec4 gBase = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
          #else
            vec4 gBase = vec4(0.0);
          #endif
          float tip = clamp(position.y * 3.2, 0.0, 1.0);
          float tip2 = tip * tip;
          float w1 = sin(uGrassTime * 2.1 + gBase.x * 0.25 + gBase.z * 0.18);
          float w2 = cos(uGrassTime * 3.8 + gBase.x * 0.65 - gBase.z * 0.50);
          float bend = (w1 * 0.72 + w2 * 0.28) * uGrassWind;
          transformed.x += bend * 0.11 * tip2;
          transformed.z += (w1 * 0.07 + 0.025) * uGrassWind * tip2;
          transformed.y -= abs(bend) * 0.025 * tip2;
          vGrassTip = tip;
          vGrassWave = clamp(w1 * 0.5 + 0.5, 0.0, 1.0);
        }`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uGrassDayF;
        uniform float uGrassRainF;
        uniform float uGrassSnowF;
        varying float vGrassTip;
        varying float vGrassWave;`
      )
      .replace(
        '#include <fog_fragment>',
        `
        {
          // Tông màu cỏ low-poly BotW (gốc xanh mát -> ngọn vàng nắng)
          vec3 botwRoot = vec3(0.24, 0.52, 0.20);
          vec3 botwTip = vec3(0.68, 0.92, 0.28);
          vec3 botwGrassCol = mix(botwRoot, botwTip, smoothstep(0.05, 0.92, vGrassTip));
          botwGrassCol *= mix(0.82, 1.15, dot(gl_FragColor.rgb, vec3(0.35, 0.50, 0.15)));

          // Dải sáng nắng lướt qua đồng cỏ theo sóng gió BotW
          float sheen = smoothstep(0.55, 0.86, vGrassWave) * smoothstep(0.35, 0.95, vGrassTip);
          botwGrassCol += uBotwSunColor * (sheen * 0.22 * uGrassDayF * (1.0 - uGrassRainF * 0.65));

          // Điều chỉnh ngày/đêm, mưa và tuyết phủ ngọn cỏ
          botwGrassCol *= mix(0.26, 1.0, uGrassDayF);
          botwGrassCol = mix(botwGrassCol, botwGrassCol * vec3(0.75, 0.88, 0.92), uGrassRainF * 0.42);
          botwGrassCol = mix(botwGrassCol, vec3(0.92, 0.96, 1.0), uGrassSnowF * smoothstep(0.35, 0.95, vGrassTip) * 0.80);

          gl_FragColor.rgb = mix(gl_FragColor.rgb, botwGrassCol, 0.78);
        }
        #include <fog_fragment>`
      );
  };
  mat.needsUpdate = true;
  return mat;
}
