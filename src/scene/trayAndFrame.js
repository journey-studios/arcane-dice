import * as THREE from 'three';
import { TRAY_METRICS, buildInnerCartouchePoints } from '../geometry/bg3Contour.js';

/**
 * Generates a high-resolution procedural PBR texture + bump map for the
 * horizontal engraved Celtic bronze-gold bar across the BG3 tray equator.
 */
function createCelticBarTextures() {
  const W = 1024;
  const H = 128;
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = W;
  colorCanvas.height = H;
  const ctx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = W;
  bumpCanvas.height = H;
  const bctx = bumpCanvas.getContext('2d');

  // Base dark recessed bronze channel
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#9e7c4f');
  bgGrad.addColorStop(0.14, '#cfa870');
  bgGrad.addColorStop(0.22, '#2d1f12');
  bgGrad.addColorStop(0.5, '#3b2918');
  bgGrad.addColorStop(0.78, '#2d1f12');
  bgGrad.addColorStop(0.86, '#b8925c');
  bgGrad.addColorStop(1, '#785c38');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  bctx.fillStyle = '#262626';
  bctx.fillRect(0, 0, W, H);
  // Top and bottom raised rails
  bctx.fillStyle = '#dcdcdc';
  bctx.fillRect(0, 4, W, 18);
  bctx.fillRect(0, H - 22, W, 18);

  // Draw interlaced figure-8 Celtic knotwork on left & right arms
  const drawKnotSpan = (xStart, xEnd) => {
    const span = xEnd - xStart;
    const loops = 9;
    const step = span / loops;
    const cy = H * 0.5;
    const amp = H * 0.24;

    for (let pass = 0; pass < 2; pass++) {
      // Shadow pass then bright bronze-gold relief pass
      for (const targetCtx of [ctx, bctx]) {
        const isBump = targetCtx === bctx;
        targetCtx.save();
        targetCtx.beginPath();
        for (let x = xStart; x <= xEnd; x += 2) {
          const phase = ((x - xStart) / step) * Math.PI + (pass === 1 ? Math.PI : 0);
          const y = cy + Math.sin(phase) * amp;
          if (x === xStart) targetCtx.moveTo(x, y);
          else targetCtx.lineTo(x, y);
        }
        targetCtx.lineCap = 'round';
        if (!isBump) {
          targetCtx.strokeStyle = '#1d130a';
          targetCtx.lineWidth = 13;
          targetCtx.stroke();
          targetCtx.strokeStyle = pass === 0 ? '#a8814d' : '#be965e';
          targetCtx.lineWidth = 7.5;
          targetCtx.stroke();
          targetCtx.strokeStyle = '#e0be89';
          targetCtx.lineWidth = 2.2;
          targetCtx.stroke();
        } else {
          targetCtx.strokeStyle = '#181818';
          targetCtx.lineWidth = 12;
          targetCtx.stroke();
          targetCtx.strokeStyle = '#e8e8e8';
          targetCtx.lineWidth = 7;
          targetCtx.stroke();
        }
        targetCtx.restore();
      }
    }

    // Small diamond pellets inside each Celtic loop eye
    for (let i = 0; i < loops; i++) {
      const lx = xStart + (i + 0.5) * step;
      ctx.fillStyle = '#b9925b';
      ctx.beginPath();
      ctx.arc(lx, cy, 4.2, 0, Math.PI * 2);
      ctx.fill();
      bctx.fillStyle = '#cfcfcf';
      bctx.beginPath();
      bctx.arc(lx, cy, 4.2, 0, Math.PI * 2);
      bctx.fill();
    }
  };

  drawKnotSpan(46, 446);
  drawKnotSpan(578, 978);

  // Draw vertical collar brackets at left end, center clasp [==], and right end
  const drawCollar = (cx, w) => {
    const g = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    g.addColorStop(0, '#4f3a22');
    g.addColorStop(0.3, '#cfa972');
    g.addColorStop(0.55, '#ab8550');
    g.addColorStop(1, '#3b2a18');
    ctx.fillStyle = g;
    ctx.fillRect(cx - w / 2, 2, w, H - 4);
    ctx.strokeStyle = '#1e140b';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - w / 2, 2, w, H - 4);

    bctx.fillStyle = '#ffffff';
    bctx.fillRect(cx - w / 2, 2, w, H - 4);
  };

  // End collars
  drawCollar(16, 16);
  drawCollar(36, 12);
  drawCollar(W - 16, 16);
  drawCollar(W - 36, 12);

  // Center rectangular socket clasp [===] right behind/above the d20
  ctx.fillStyle = '#241910';
  ctx.fillRect(452, 14, 120, H - 28);
  ctx.strokeStyle = '#b9935d';
  ctx.lineWidth = 5;
  ctx.strokeRect(456, 18, 112, H - 36);
  drawCollar(454, 14);
  drawCollar(570, 14);

  const map = new THREE.CanvasTexture(colorCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 8;

  return { map, bumpMap };
}

/**
 * Builds a tapered 3D ribbon mesh along a 2D polyline with exact variable width
 * and beveled ridge profile (center ridge raised in Z for authentic 3D gold glints!).
 */
function buildTaperedGoldRibbon(pointsWithWidth, zBase = 0.03, ridgeHeight = 0.022, closed = false) {
  const n = pointsWithWidth.length;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  // For each sample point, create 3 vertices across width: left edge, raised center spine, right edge
  for (let i = 0; i < n; i++) {
    const curr = pointsWithWidth[i];
    const prev = pointsWithWidth[closed ? (i - 1 + n) % n : Math.max(0, i - 1)];
    const next = pointsWithWidth[closed ? (i + 1) % n : Math.min(n - 1, i + 1)];

    let tx = next.x - prev.x;
    let ty = next.y - prev.y;
    const len = Math.hypot(tx, ty) || 1;
    tx /= len;
    ty /= len;

    // Perpendicular normal in XY
    const nx = -ty;
    const ny = tx;
    const hw = curr.w * 0.5;
    const rh = ridgeHeight * Math.min(1, curr.w / 0.025);

    // Left outer edge
    positions.push(curr.x + nx * hw, curr.y + ny * hw, zBase);
    normals.push(nx * 0.55, ny * 0.55, 0.835);
    uvs.push(0, i / Math.max(1, n - 1));

    // Raised golden spine
    positions.push(curr.x, curr.y, zBase + rh);
    normals.push(0, 0, 1);
    uvs.push(0.5, i / Math.max(1, n - 1));

    // Right outer edge
    positions.push(curr.x - nx * hw, curr.y - ny * hw, zBase);
    normals.push(-nx * 0.55, -ny * 0.55, 0.835);
    uvs.push(1, i / Math.max(1, n - 1));
  }

  const segCount = closed ? n : n - 1;
  for (let i = 0; i < segCount; i++) {
    const a = i * 3;
    const b = ((i + 1) % n) * 3;
    // Left bevel strip (CCW facing +Z)
    indices.push(a, a + 1, b);
    indices.push(a + 1, b + 1, b);
    // Right bevel strip (CCW facing +Z)
    indices.push(a + 1, a + 2, b + 1);
    indices.push(a + 2, b + 2, b + 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

function sampleCubicWithWidth(p0, p1, p2, p3, w0, w1, steps = 24, wMidBoost = 1.0) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const x = u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0];
    const y = u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1];
    const bell = Math.sin(t * Math.PI);
    const w = (w0 + (w1 - w0) * t) * (1 + (wMidBoost - 1) * bell);
    out.push({ x, y, w });
  }
  return out;
}

/**
 * Constructs the complete Baldur's Gate 3 Tray, Cosmic Astrolabe Shader Interior,
 * Horizontal Celtic Bronze Bar, 4 Ornate Corner Brackets, 2 Lateral Crescent Rails,
 * and Top Open-Book Hairline in Three.js.
 */
export function createBG3TrayAndFrame() {
  const root = new THREE.Group();

  // Shared antique burnished bronze-gold material matching BG3 UI frames (#9e7c4f -> #d7b278)
  const goldMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#94744f'),
    metalness: 0.66,
    roughness: 0.44,
    emissive: new THREE.Color('#2b1d0b'),
    emissiveIntensity: 0.34,
    side: THREE.DoubleSide,
  });

  const brightGoldStudMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#c8a26a'),
    metalness: 0.74,
    roughness: 0.28,
    emissive: new THREE.Color('#35230e'),
    emissiveIntensity: 0.38,
    side: THREE.DoubleSide,
  });

  // 1. COSMIC ASTROLABE TRAY INTERIOR (Exact 8-cusped cartouche + GLSL celestial shader)
  const interiorPts = buildInnerCartouchePoints(false);
  const interiorShape = new THREE.Shape(interiorPts);
  const interiorGeo = new THREE.ShapeGeometry(interiorShape, 32);

  const cosmicUniforms = {
    uTime: { value: 0 },
    uImpactPos: { value: new THREE.Vector2(0, 0) },
    uImpactFlash: { value: 0 },
    uVerdictGlow: { value: 0 },
    uFloorOpacity: { value: 1 },
    uBounceGlow: { value: 1 },
  };

  const cosmicMat = new THREE.ShaderMaterial({
    uniforms: cosmicUniforms,
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec2 vWorldXY;
      void main() {
        vWorldXY = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vWorldXY;
      uniform float uTime;
      uniform vec2 uImpactPos;
      uniform float uImpactFlash;
      uniform float uVerdictGlow;
      uniform float uFloorOpacity;
      uniform float uBounceGlow;

      float hash21(vec2 p) {
        p = fract(p * vec2(234.34, 435.345));
        p += dot(p, p + 34.23);
        return fract(p.x * p.y);
      }

      float lineMask(float distanceToLine, float width) {
        float feather = max(fwidth(distanceToLine), 0.003);
        return 1.0 - smoothstep(width * 0.4, width + feather, distanceToLine);
      }

      float starLayer(vec2 uv, float scale, float seed) {
        vec2 gv = fract(uv * scale) - 0.5;
        vec2 id = floor(uv * scale) + seed;
        float n = hash21(id);
        if (n < 0.82) return 0.0;
        vec2 offset = vec2(hash21(id + 1.7) - 0.5, hash21(id + 9.2) - 0.5) * 0.72;
        float d = length(gv - offset);
        float size = mix(0.018, 0.055, fract(n * 19.3));
        float twinkle = 0.65 + 0.35 * sin(uTime * (1.5 + fract(n * 11.0) * 3.0) + n * 40.0);
        return (1.0 - smoothstep(0.0, size, d)) * twinkle;
      }

      void main() {
        // Normalized Y from bottom (-2.48) to top (+2.48)
        float ny = clamp((vWorldXY.y + 2.48) / 4.96, 0.0, 1.0);

        // Exact BG3 vertical gradient: deep obsidian-slate top -> royal twilight violet bottom
        vec3 topCol = vec3(0.052, 0.052, 0.075);    // #0d0d13
        vec3 midCol = vec3(0.090, 0.078, 0.145);    // #171425
        vec3 botCol = vec3(0.134, 0.105, 0.195);
        vec3 col = mix(botCol, midCol, smoothstep(0.0, 0.54, ny));
        col = mix(col, topCol, smoothstep(0.50, 0.96, ny));

        // Subtle diagonal Milky-Way nebula band (top-left to bottom-right, seen in frame_0007 & frame_0015)
        float diag = (vWorldXY.x * 0.72 + vWorldXY.y * 0.55);
        float milky = exp(-diag * diag * 1.35);
        col += vec3(0.027, 0.025, 0.052) * milky;
        float grain = hash21(floor(vWorldXY * 68.0)) - 0.5;
        col += grain * vec3(0.021, 0.020, 0.028);

        // Etched Celestial Astrolabe circles & sightlines centered near (0.0, -0.10)
        vec2 astroP = vWorldXY - vec2(0.0, -0.10);
        float r = length(astroP);
        float ang = atan(astroP.y, astroP.x);

        float ring1 = lineMask(abs(r - 0.58), 0.006);
        float ring2 = lineMask(abs(r - 0.92), 0.007);
        float ring3 = lineMask(abs(r - 1.34), 0.006);
        float ring4 = lineMask(abs(r - 1.78), 0.005);

        // Fine degree ticks on ring2
        float ticks = lineMask(abs(r - 0.92), 0.024) * smoothstep(0.84, 0.94, cos(ang * 36.0));
        // Diagonal astrolabe sightlines
        float diagLine1 = lineMask(abs(astroP.x * 0.62 - astroP.y * 0.78), 0.004) * step(0.42, r) * step(r, 1.78);
        float diagLine2 = lineMask(abs(astroP.x * 0.62 + astroP.y * 0.78), 0.004) * step(0.42, r) * step(r, 1.78);

        float astrolabe = (ring1 + ring2 * 1.15 + ring3 * 0.9 + ring4 * 0.6 + ticks * 0.8 + diagLine1 * 0.65 + diagLine2 * 0.65);
        col += vec3(0.32, 0.28, 0.44) * astrolabe * 0.095;

        // Stardust constellations (concentrated gently along diagonal celestial band)
        float s1 = starLayer(vWorldXY + vec2(uTime * 0.004, -uTime * 0.003), 5.2, 11.3);
        float s2 = starLayer(vWorldXY * 1.3 - vec2(uTime * 0.003, 0.0), 9.4, 47.1);
        float bandMask = 0.35 + 0.85 * milky;
        col += vec3(0.76, 0.73, 0.92) * s1 * bandMask * 0.28;
        col += vec3(0.88, 0.74, 0.52) * s2 * bandMask * 0.21;

        // Subtle inner edge vignette + deep purple inner rim glow near border
        float edgeApprox = max(abs(vWorldXY.x) / 1.74, abs(vWorldXY.y) / 2.46);
        float innerShadow = smoothstep(0.76, 1.02, edgeApprox);
        col = mix(col, col * 0.62 + vec3(0.08, 0.05, 0.15), innerShadow * 0.65);

        // Dynamic impact / bounce ripple glow on the astrolabe board
        float dImp = length(vWorldXY - uImpactPos);
        float impGlow = exp(-dImp * 5.8) * uImpactFlash;
        float waveDistance = abs(dImp - mix(0.68, 0.035, uImpactFlash));
        float wave = exp(-waveDistance * 32.0 - dImp * 1.7) * uImpactFlash;
        col += vec3(0.95, 0.64, 0.26) * (impGlow * 0.38 + wave * 0.14) * uBounceGlow;

        // Verdict golden aura
        float dCenter = length(vWorldXY - vec2(0.0, -0.14));
        col += vec3(0.85, 0.60, 0.22) * exp(-dCenter * 1.5) * uVerdictGlow * 0.38;

        float floorOpacity = mix(0.82, 0.34, smoothstep(0.05, 0.92, ny));
        float effectOpacity = max(impGlow * uBounceGlow, uVerdictGlow * exp(-dCenter * 1.5));
        gl_FragColor = vec4(col, mix(floorOpacity * uFloorOpacity, 0.96, clamp(effectOpacity, 0.0, 1.0)));
      }
    `,
  });

  const interiorMesh = new THREE.Mesh(interiorGeo, cosmicMat);
  interiorMesh.position.z = -0.02;
  interiorMesh.renderOrder = -1;
  root.add(interiorMesh);

  // 2. HORIZONTAL ENGRAVED CELTIC BRONZE-GOLD BAR (y = +0.30, x ∈ [-1.48, +1.48])
  const { map: celticMap, bumpMap: celticBump } = createCelticBarTextures();
  const celticBarMat = new THREE.MeshStandardMaterial({
    map: celticMap,
    bumpMap: celticBump,
    bumpScale: 0.035,
    metalness: 0.72,
    roughness: 0.47,
    emissive: new THREE.Color('#231608'),
    emissiveIntensity: 0.28,
  });
  const celticBarGeo = new THREE.BoxGeometry(2.96, 0.135, 0.045, 8, 2, 1);
  const celticBarMesh = new THREE.Mesh(celticBarGeo, celticBarMat);
  celticBarMesh.position.set(0, TRAY_METRICS.barY, 0.005);
  root.add(celticBarMesh);

  // Subtle drop shadow directly under the Celtic bar onto the tray
  const barShadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2.98, 0.26),
    new THREE.ShaderMaterial({
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        void main() {
          float falloff = 1.0 - smoothstep(0.12, 0.47, abs(vUv.y - 0.54));
          float ends = smoothstep(0.0, 0.055, vUv.x) * smoothstep(0.0, 0.055, 1.0 - vUv.x);
          gl_FragColor = vec4(0.018, 0.013, 0.031, falloff * ends * 0.68);
        }
      `,
      transparent: true,
      depthWrite: false,
    })
  );
  barShadowMesh.position.set(0, TRAY_METRICS.barY - 0.04, -0.01);
  root.add(barShadowMesh);

  // 3. INNER 8-CUSPED BEVELED GOLDEN CARTOUCHE BORDER (with C-shaped pincer clasps!)
  const borderPts2D = buildInnerCartouchePoints(true);
  const bevel = new THREE.Mesh(
    buildTaperedGoldRibbon(borderPts2D.map((p) => ({ x: p.x, y: p.y, w: 0.115 })), -0.008, 0.021, true),
    new THREE.MeshStandardMaterial({
      color: 0x292334,
      metalness: 0.27,
      roughness: 0.55,
      side: THREE.DoubleSide,
    }),
  );
  root.add(bevel);
  const borderRibbonPts = borderPts2D.map((p) => ({ x: p.x, y: p.y, w: 0.029 }));
  const innerBorderMesh = new THREE.Mesh(
    buildTaperedGoldRibbon(borderRibbonPts, 0.025, 0.020, true),
    goldMat
  );
  root.add(innerBorderMesh);

  // Subtle dark outer outline around inner border for crisp BG3 contrast
  const innerShadowRibbonPts = borderPts2D.map((p) => ({ x: p.x, y: p.y, w: 0.056 }));
  const innerShadowMesh = new THREE.Mesh(
    buildTaperedGoldRibbon(innerShadowRibbonPts, 0.012, 0.002, true),
    new THREE.MeshBasicMaterial({ color: 0x07060a, side: THREE.DoubleSide })
  );
  root.add(innerShadowMesh);

  // 3b. EQUATOR C-CLASP DETAILS (y = +0.30): Outward Gothic thorn + Inner fleur-de-lis spear tongue!
  for (const sx of [-1, 1]) {
    const by = TRAY_METRICS.barY;
    // Outward-pointing Gothic thorn on the outer vertical cartouche wall
    const outerThornPts = [
      { x: sx * 1.75, y: by + 0.075, w: 0.020 },
      { x: sx * 1.86, y: by, w: 0.024 },
      { x: sx * 1.75, y: by - 0.075, w: 0.020 },
    ];
    root.add(new THREE.Mesh(buildTaperedGoldRibbon(outerThornPts, 0.025, 0.018, false), goldMat));

    // Inner horizontal spear tongue inside the dark C-clasp pocket
    const spearTonguePts = [
      { x: sx * 1.74, y: by, w: 0.026 },
      { x: sx * 1.63, y: by, w: 0.034 },
      { x: sx * 1.54, y: by, w: 0.005 },
    ];
    root.add(new THREE.Mesh(buildTaperedGoldRibbon(spearTonguePts, 0.024, 0.018, false), brightGoldStudMat));
  }

  // 4. THE 4 SYMMETRICAL ORNATE OUTER CORNER BRACKETS
  // Integrated Gothic corner spearhead mitre + sweeping dome horn + side barb flare + inner concave rib
  const cornersGroup = new THREE.Group();
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      // 4a. Integrated Corner Spearhead Mitre + Sweeping Upper/Lower Dome Horn
      const hornPts = [
        { x: sx * 2.13, y: sy * 2.13, w: 0.005 }, // Sharp 45° outward spear tip!
        { x: sx * 1.98, y: sy * 2.04, w: 0.036 },
        { x: sx * 1.88, y: sy * 2.10, w: 0.028 },
        { x: sx * 1.56, y: sy * 2.10, w: 0.028 },
        ...sampleCubicWithWidth(
          [sx * 1.56, sy * 2.10],
          [sx * 1.32, sy * 2.10],
          [sx * 1.12, sy * 2.24],
          [sx * 0.88, sy * 2.45],
          0.028,
          0.003,
          22,
          1.05
        ).slice(1),
      ];
      cornersGroup.add(new THREE.Mesh(buildTaperedGoldRibbon(hornPts, 0.024, 0.018, false), goldMat));

      // 4b. Vertical Outer Corner Arm + Outward-flaring Razor Barb/Fin
      const barbPts = [
        { x: sx * 2.13, y: sy * 2.13, w: 0.005 }, // Meets cleanly at the 45° spear tip!
        { x: sx * 2.02, y: sy * 1.98, w: 0.036 },
        { x: sx * 2.07, y: sy * 1.88, w: 0.028 },
        { x: sx * 2.07, y: sy * 1.52, w: 0.028 },
        ...sampleCubicWithWidth(
          [sx * 2.07, sy * 1.52],
          [sx * 2.07, sy * 1.38],
          [sx * 2.14, sy * 1.27],
          [sx * 2.24, sy * 1.15],
          0.028,
          0.003,
          18,
          1.08
        ).slice(1),
      ];
      cornersGroup.add(new THREE.Mesh(buildTaperedGoldRibbon(barbPts, 0.024, 0.018, false), goldMat));

      // 4c. Inner curved Gothic pocket rib connecting horizontal & vertical arms
      const innerRibPts = sampleCubicWithWidth(
        [sx * 1.44, sy * 2.09],
        [sx * 1.76, sy * 2.06],
        [sx * 2.02, sy * 1.82],
        [sx * 2.06, sy * 1.44],
        0.006,
        0.006,
        20,
        2.6
      );
      cornersGroup.add(new THREE.Mesh(buildTaperedGoldRibbon(innerRibPts, 0.022, 0.015, false), goldMat));

      // 4d. 3D Faceted Spearhead Jewel / Stud nestled inside the corner mitre
      const studGeo = new THREE.OctahedronGeometry(0.072, 0);
      studGeo.scale(1.45, 0.56, 0.38);
      const studMesh = new THREE.Mesh(studGeo, brightGoldStudMat);
      studMesh.position.set(sx * 2.00, sy * 2.02, 0.040);
      studMesh.rotation.z = Math.atan2(sy * 1.0, sx * 1.0);
      cornersGroup.add(studMesh);
    }
  }
  root.add(cornersGroup);

  // 5. THE 2 OUTER LATERAL CRESCENT RAILS (x = ±2.07, y ∈ [-0.98, +0.98])
  for (const sx of [-1, 1]) {
    const railPts = [
      ...sampleCubicWithWidth(
        [sx * 1.93, 0.99],
        [sx * 2.02, 0.91],
        [sx * 2.07, 0.80],
        [sx * 2.07, 0.66],
        0.003,
        0.026,
        14
      ),
      { x: sx * 2.07, y: 0.0, w: 0.027 },
      ...sampleCubicWithWidth(
        [sx * 2.07, -0.66],
        [sx * 2.07, -0.80],
        [sx * 2.02, -0.91],
        [sx * 1.93, -0.99],
        0.026,
        0.003,
        14
      ),
    ];
    root.add(new THREE.Mesh(buildTaperedGoldRibbon(railPts, 0.024, 0.018, false), goldMat));
  }

  // 6. TOP WINGED SEAGULL / OPEN-BOOK GOLDEN HAIRLINE DIVIDER (y ≈ +2.76)
  for (const sx of [-1, 1]) {
    const wingPts = sampleCubicWithWidth(
      [0, 2.71],
      [sx * 0.22, 2.81],
      [sx * 0.68, 2.80],
      [sx * 1.48, 2.79],
      0.016,
      0.002,
      20,
      1.35
    );
    root.add(new THREE.Mesh(buildTaperedGoldRibbon(wingPts, 0.02, 0.012, false), goldMat));
  }

  return {
    group: root,
    cosmicUniforms,
    goldMat,
  };
}
