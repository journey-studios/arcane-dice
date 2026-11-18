import * as THREE from 'three';

/**
 * Complete 3D Visual Effects Engine for BG3 Dice Rolls in Three.js:
 * 1. Wall-Impact Contour Golden Crackling Filigree & Sparks
 * 2. Settling / Bonus Golden Arcane Ring & Curling Tendrils
 * 3. Curved 3D Bonus Card -> d20 Golden Comet Stream
 * 4. Verdict Slam Radial Golden Lightning Tendrils & DC Upward Flames
 * 5. Horizontal Outward-Sweeping Golden Fire & Volumetric Smoke Banner Wave
 */
export function createBG3VFXSystem(contourCollider) {
  const root = new THREE.Group();

  // Shared soft spark + crescent flake sprite texture
  const sparkCanvas = document.createElement('canvas');
  sparkCanvas.width = 128;
  sparkCanvas.height = 128;
  const sctx = sparkCanvas.getContext('2d');
  const sg = sctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  sg.addColorStop(0, 'rgba(255, 250, 220, 1.0)');
  sg.addColorStop(0.22, 'rgba(255, 212, 105, 0.92)');
  sg.addColorStop(0.55, 'rgba(218, 148, 42, 0.40)');
  sg.addColorStop(1, 'rgba(180, 100, 15, 0.0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 128, 128);
  const sparkTex = new THREE.CanvasTexture(sparkCanvas);

  // =========================================================================
  // 1. GPU PARTICLE POOL (Sparks, Comet Plumes, Wall Embers, Slam Burst)
  // =========================================================================
  const MAX_PARTICLES = 1400;
  const pPositions = new Float32Array(MAX_PARTICLES * 3);
  const pColors = new Float32Array(MAX_PARTICLES * 3);
  const pSizes = new Float32Array(MAX_PARTICLES);
  const pAlphas = new Float32Array(MAX_PARTICLES);

  const particles = [];
  for (let i = 0; i < MAX_PARTICLES; i++) {
    particles.push({
      active: false,
      x: 0,
      y: 0,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      ax: 0,
      ay: 0,
      drag: 0.96,
      age: 0,
      life: 1,
      size: 0.1,
      r: 1,
      g: 0.8,
      b: 0.3,
      swirl: 0,
    });
    pAlphas[i] = 0;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
  pGeo.setAttribute('aColor', new THREE.BufferAttribute(pColors, 3));
  pGeo.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));
  pGeo.setAttribute('aAlpha', new THREE.BufferAttribute(pAlphas, 1));

  const pMat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: sparkTex },
      uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
    },
    vertexShader: /* glsl */ `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      uniform float uPixelRatio;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixelRatio * (340.0 / max(0.1, -mvPosition.z));
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec3 vColor;
      varying float vAlpha;
      uniform sampler2D uTex;
      void main() {
        if (vAlpha <= 0.004) discard;
        vec4 tex = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vColor * tex.rgb, tex.a * vAlpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particlePoints = new THREE.Points(pGeo, pMat);
  particlePoints.frustumCulled = false;
  root.add(particlePoints);

  let nextParticleIdx = 0;
  function spawnParticle(opts) {
    const p = particles[nextParticleIdx];
    nextParticleIdx = (nextParticleIdx + 1) % MAX_PARTICLES;
    p.active = true;
    p.x = opts.x ?? 0;
    p.y = opts.y ?? 0;
    p.z = opts.z ?? 0.25;
    p.vx = opts.vx ?? 0;
    p.vy = opts.vy ?? 0;
    p.vz = opts.vz ?? 0;
    p.ax = opts.ax ?? 0;
    p.ay = opts.ay ?? 0;
    p.drag = opts.drag ?? 0.94;
    p.age = 0;
    p.life = opts.life ?? 0.65;
    p.size = opts.size ?? 0.22;
    p.r = opts.r ?? 1.0;
    p.g = opts.g ?? 0.80;
    p.b = opts.b ?? 0.32;
    p.swirl = opts.swirl ?? 0;
  }

  // =========================================================================
  // 2. WALL-IMPACT CONTOUR CRACKLING GOLDEN FILIGREE LINES
  // =========================================================================
  const activeWallArcs = [];
  const wallArcGroup = new THREE.Group();
  root.add(wallArcGroup);

  function triggerWallImpact(sCenter, impactSpeed = 1.0) {
    // Create 2 jagged crackling golden filigree tendrils crawling both ways along the wall contour
    for (let strand = 0; strand < 2; strand++) {
      const segs = 38;
      const positions = new Float32Array((segs + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: strand === 0 ? 0xffdf88 : 0xd99b38,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      wallArcGroup.add(line);
      activeWallArcs.push({
        line,
        geo,
        mat,
        sCenter,
        strand,
        seed: Math.random() * 100,
        age: 0,
        life: 0.58 + Math.random() * 0.18,
        maxSpan: 0.065 + Math.min(0.055, impactSpeed * 0.025),
      });
    }

    // Burst of fine golden wall sparks inward along normal
    const centerSample = contourCollider.getPointAtS(sCenter);
    const count = 28;
    for (let i = 0; i < count; i++) {
      const sOff = (Math.random() - 0.5) * 0.09;
      const smp = contourCollider.getPointAtS(sCenter + sOff);
      const inSpd = 0.4 + Math.random() * 1.9;
      const tanSpd = (Math.random() - 0.5) * 2.4;
      spawnParticle({
        x: smp.pos.x + smp.normal.x * 0.03,
        y: smp.pos.y + smp.normal.y * 0.03,
        z: 0.14 + Math.random() * 0.12,
        vx: smp.normal.x * inSpd + smp.tangent.x * tanSpd,
        vy: smp.normal.y * inSpd + smp.tangent.y * tanSpd,
        vz: (Math.random() - 0.3) * 0.5,
        ay: -1.2,
        drag: 0.92,
        life: 0.35 + Math.random() * 0.38,
        size: 0.11 + Math.random() * 0.16,
        r: 1.0,
        g: 0.82 + Math.random() * 0.15,
        b: 0.32,
      });
    }
    return centerSample.pos;
  }

  // =========================================================================
  // 3. GOLDEN ARCANE FILIGREE RING (Settling & Bonus Pulse behind d20)
  // =========================================================================
  const arcaneRingUniforms = {
    uTime: { value: 0 },
    uProgress: { value: 1.0 },
    uIntensity: { value: 0.0 },
    uColor: { value: new THREE.Color('#ffcf68') },
  };

  const arcaneRingMat = new THREE.ShaderMaterial({
    uniforms: arcaneRingUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;
      uniform float uIntensity;
      uniform vec3 uColor;

      void main() {
        if (uIntensity <= 0.005) discard;
        float r = length(vUv);
        float a = atan(vUv.y, vUv.x);

        float targetR = mix(0.46, 0.76, pow(uProgress, 0.55));
        // Ornate BG3 curled filigree ring modulation
        float curl = 0.035 * sin(a * 8.0 + uTime * 3.0) + 0.022 * cos(a * 16.0 - uTime * 4.5);
        float ring = smoothstep(0.055, 0.0, abs(r - (targetR + curl)));
        float innerHalo = smoothstep(targetR + 0.12, targetR - 0.25, r) * 0.28;
        float sparks = step(0.82, sin(a * 24.0 + r * 18.0 - uTime * 6.0)) * smoothstep(0.16, 0.0, abs(r - targetR));

        float fade = (1.0 - smoothstep(0.45, 1.0, uProgress)) * uIntensity;
        float alpha = (ring * 1.15 + innerHalo + sparks * 0.9) * fade;
        gl_FragColor = vec4(uColor * (1.1 + ring * 0.4), alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const arcaneRingMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.35, 2.35), arcaneRingMat);
  arcaneRingMesh.position.set(0, -0.13, 0.09);
  root.add(arcaneRingMesh);

  let ringTimer = 99;
  let ringDuration = 0.85;

  function triggerArcaneRing(x = 0, y = -0.13, intensity = 1.0, hexColor = '#ffcf68') {
    arcaneRingMesh.position.set(x, y, 0.09);
    arcaneRingUniforms.uIntensity.value = intensity;
    arcaneRingUniforms.uColor.value.set(hexColor);
    ringTimer = 0;
    ringDuration = 0.82;

    // Downward curling filigree sparks under the die (exact match to frame_0033.png!)
    for (let i = 0; i < 36; i++) {
      const ang = -Math.PI * 0.5 + (Math.random() - 0.5) * 2.2;
      const rad = 0.45 + Math.random() * 0.26;
      spawnParticle({
        x: x + Math.cos(ang) * rad,
        y: y + Math.sin(ang) * rad,
        z: 0.16,
        vx: Math.cos(ang) * (0.25 + Math.random() * 0.65),
        vy: Math.sin(ang) * (0.25 + Math.random() * 0.85) - 0.35,
        vz: 0.05,
        ay: -0.9,
        swirl: (Math.random() - 0.5) * 6.0,
        life: 0.45 + Math.random() * 0.42,
        size: 0.13 + Math.random() * 0.16,
        r: 1.0,
        g: 0.82,
        b: 0.34,
      });
    }
  }

  // =========================================================================
  // 4. CURVED 3D BONUS COMET STREAM (Card -> d20 bottom apex)
  // =========================================================================
  const activeComets = [];

  function launchBonusComet(startVec3, endVec3, duration, onAdvance, onArrive) {
    const mid = new THREE.Vector3().lerpVectors(startVec3, endVec3, 0.52);
    mid.x += (startVec3.x < 0 ? -0.22 : 0.22);
    mid.z += 0.25;
    activeComets.push({
      p0: startVec3.clone(),
      p1: mid,
      p2: endVec3.clone(),
      age: 0,
      duration,
      onAdvance,
      onArrive,
    });
  }

  // =========================================================================
  // 5. VERDICT SLAM FRACTAL LIGHTNING TENDRILS & HORIZONTAL FLAME BANNER WAVE
  // =========================================================================
  const activeTendrils = [];
  const tendrilGroup = new THREE.Group();
  root.add(tendrilGroup);

  // Volumetric-style Horizontal Golden Flame & Smoke Banner Shader Plane
  // Spans x ∈ [-3.05, +3.05] (wider than the ±2.07 outer frame, exact match to frame_0033 & frame_0047!)
  const bannerWaveUniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uActive: { value: 0 },
    uIsSuccess: { value: 1.0 },
  };

  const bannerWaveMat = new THREE.ShaderMaterial({
    uniforms: bannerWaveUniforms,
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv * 2.0 - 1.0; // x in [-1,1], y in [-1,1]
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      precision highp float;
      varying vec2 vUv;
      uniform float uTime;
      uniform float uProgress;
      uniform float uActive;
      uniform float uIsSuccess;

      float hash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
          mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
          u.y
        );
      }

      float fbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for (int i = 0; i < 5; i++) {
          v += a * noise(p);
          p = p * 2.05 + vec2(1.7, -1.2);
          a *= 0.5;
        }
        return v;
      }

      void main() {
        if (uActive <= 0.005) discard;
        float ax = abs(vUv.x);
        float front = clamp(uProgress * 1.28, 0.0, 1.08);

        // Outward surging flame front from center (0) to outer edges (1.0)
        float reach = smoothstep(front + 0.08, front - 0.28, ax);

        // Turbulent outward-flowing golden fire & smoke FBM
        vec2 flowUv = vec2(ax * 3.8 - uTime * 2.4, vUv.y * 3.2);
        float n1 = fbm(flowUv);
        float n2 = fbm(flowUv * 1.9 + vec2(-uTime * 1.6, n1 * 1.8));
        float plumeHeight = mix(0.24, 0.52, smoothstep(0.15, 0.85, ax)) * (0.65 + 0.65 * n1);

        float vertMask = smoothstep(plumeHeight, 0.0, abs(vUv.y + (n2 - 0.5) * 0.26));
        // Concentrated wake at the wave front + lingering golden smoke ribbon
        float headBoost = exp(-pow((ax - front * 0.86) * 3.4, 2.0)) * 1.35;
        float centerDim = mix(1.0, 0.42, smoothstep(0.35, 1.0, uProgress) * (1.0 - smoothstep(0.0, 0.48, ax)));

        float fadeOut = 1.0 - smoothstep(0.68, 1.0, uProgress) * 0.52;
        float density = vertMask * reach * (0.55 + n2 * 0.95 + headBoost * 0.65) * centerDim * fadeOut * uActive;

        vec3 coreGold = uIsSuccess > 0.5 ? vec3(1.0, 0.86, 0.44) : vec3(0.95, 0.34, 0.24);
        vec3 deepGold = uIsSuccess > 0.5 ? vec3(0.76, 0.50, 0.14) : vec3(0.48, 0.10, 0.08);
        vec3 col = mix(deepGold, coreGold, clamp(density * 1.25 + headBoost * 0.35, 0.0, 1.0));

        gl_FragColor = vec4(col, clamp(density * 0.92, 0.0, 0.95));
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const bannerWaveMesh = new THREE.Mesh(new THREE.PlaneGeometry(6.8, 1.32), bannerWaveMat);
  bannerWaveMesh.position.set(0, -1.06, 0.34);
  root.add(bannerWaveMesh);

  let bannerTimer = -1;
  const bannerDuration = 1.75;

  function triggerPreSlamTendrils(isSuccess = true) {
    const mainHex = isSuccess ? 0xffdc80 : 0xff5a42;
    const subHex = isSuccess ? 0xd99530 : 0xa82418;
    for (let i = 0; i < 3; i++) {
      const baseAngle = Math.PI * 0.5 + (i - 1) * 0.24;
      const len = i === 1 ? 1.88 : 1.58;
      const segs = 24;
      const positions = new Float32Array((segs + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: i === 1 ? mainHex : subHex,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      tendrilGroup.add(line);
      activeTendrils.push({
        line,
        geo,
        mat,
        baseAngle,
        len,
        seed: Math.random() * 100,
        age: 0,
        life: 0.92,
      });
    }
  }

  function triggerVerdictSlam(isSuccess = true) {
    const mainHex = isSuccess ? 0xffdc80 : 0xff5a42;
    const subHex = isSuccess ? 0xd99530 : 0xa82418;

    triggerArcaneRing(0, -0.13, 1.45, isSuccess ? '#ffd875' : '#ff5840');

    // 16 Radial fractal golden lightning / curled filigree tendrils (including 2 licking up around DC!)
    for (let i = 0; i < 16; i++) {
      const isUpwardDC = i < 2;
      const baseAngle = isUpwardDC
        ? Math.PI * 0.5 + (i === 0 ? -0.22 : 0.22)
        : (i / 14) * Math.PI * 2;
      const len = isUpwardDC ? 1.75 : 1.02 + Math.random() * 0.58;
      const segs = 22;
      const positions = new Float32Array((segs + 1) * 3);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.LineBasicMaterial({
        color: i % 2 === 0 ? mainHex : subHex,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
      });
      const line = new THREE.Line(geo, mat);
      tendrilGroup.add(line);
      activeTendrils.push({
        line,
        geo,
        mat,
        baseAngle,
        len,
        seed: Math.random() * 100,
        age: 0,
        life: isUpwardDC ? 1.15 : 0.72 + Math.random() * 0.25,
      });
    }

    // Radial slam spark explosion + bottom ember core (seen in frame_0031 & frame_0045!)
    for (let i = 0; i < 150; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 0.8 + Math.random() * 3.8;
      const cR = isSuccess ? 1.0 : 1.0;
      const cG = isSuccess ? 0.76 + Math.random() * 0.22 : 0.28 + Math.random() * 0.2;
      const cB = isSuccess ? 0.28 + Math.random() * 0.2 : 0.18;
      spawnParticle({
        x: Math.cos(a) * 0.25,
        y: -0.13 + Math.sin(a) * 0.25,
        z: 0.28,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        vz: (Math.random() - 0.2) * 0.9,
        drag: 0.91,
        swirl: (Math.random() - 0.5) * 4.5,
        life: 0.45 + Math.random() * 0.55,
        size: 0.14 + Math.random() * 0.22,
        r: cR,
        g: cG,
        b: cB,
      });
    }

    // Concentrated golden ember core at (0, -0.82) right before horizontal banner wave
    for (let i = 0; i < 55; i++) {
      spawnParticle({
        x: (Math.random() - 0.5) * 0.45,
        y: -0.82 + (Math.random() - 0.5) * 0.18,
        z: 0.30,
        vx: (Math.random() - 0.5) * 1.4,
        vy: (Math.random() - 0.3) * 0.7,
        drag: 0.93,
        life: 0.5 + Math.random() * 0.4,
        size: 0.22 + Math.random() * 0.22,
        r: 1.0,
        g: isSuccess ? 0.80 : 0.30,
        b: isSuccess ? 0.28 : 0.18,
      });
    }
  }

  function triggerBannerFlameWave(isSuccess = true) {
    bannerTimer = 0;
    bannerWaveUniforms.uProgress.value = 0;
    bannerWaveUniforms.uActive.value = 1.0;
    bannerWaveUniforms.uIsSuccess.value = isSuccess ? 1.0 : 0.0;

    // Outward horizontal ember jets racing left and right along y = -1.06!
    for (const dir of [-1, 1]) {
      for (let i = 0; i < 85; i++) {
        const spd = 2.2 + Math.random() * 4.8;
        spawnParticle({
          x: dir * (0.1 + Math.random() * 0.35),
          y: -1.06 + (Math.random() - 0.5) * 0.26,
          z: 0.36,
          vx: dir * spd,
          vy: (Math.random() - 0.5) * 0.95,
          drag: 0.945,
          swirl: dir * (Math.random() - 0.5) * 2.5,
          life: 0.55 + Math.random() * 0.65,
          size: 0.14 + Math.random() * 0.24,
          r: 1.0,
          g: isSuccess ? 0.78 + Math.random() * 0.2 : 0.32,
          b: isSuccess ? 0.26 : 0.18,
        });
      }
    }
  }

  function reset() {
    bannerTimer = -1;
    bannerWaveUniforms.uActive.value = 0.0;
    ringTimer = ringDuration;
    arcaneRingUniforms.uIntensity.value = 0;
    activeComets.length = 0;
    for (const effect of [...activeWallArcs, ...activeTendrils]) {
      effect.line.removeFromParent();
      effect.geo.dispose();
      effect.mat.dispose();
    }
    activeWallArcs.length = 0;
    activeTendrils.length = 0;
    for (const particle of particles) particle.active = false;
    pAlphas.fill(0);
    pGeo.attributes.aAlpha.needsUpdate = true;
    nextParticleIdx = 0;
  }

  // =========================================================================
  // MAIN FRAME UPDATE
  // =========================================================================
  function update(dt, elapsed) {
    arcaneRingUniforms.uTime.value = elapsed;
    bannerWaveUniforms.uTime.value = elapsed;

    // Update Arcane Ring
    if (ringTimer < ringDuration) {
      ringTimer += dt;
      arcaneRingUniforms.uProgress.value = Math.min(1, ringTimer / ringDuration);
      if (ringTimer >= ringDuration) {
        arcaneRingUniforms.uIntensity.value = 0;
      }
    }

    // Update Horizontal Flame Wave
    if (bannerTimer >= 0) {
      bannerTimer += dt;
      const p = Math.min(1, bannerTimer / bannerDuration);
      bannerWaveUniforms.uProgress.value = p;
      // Gentle lingering shimmer then fade
      if (bannerTimer > bannerDuration * 1.4) {
        bannerWaveUniforms.uActive.value = Math.max(0, 1 - (bannerTimer - bannerDuration * 1.4) / 0.8);
      }
    }

    // Update Curved Bonus Comets
    for (let i = activeComets.length - 1; i >= 0; i--) {
      const c = activeComets[i];
      c.age += dt;
      const t = Math.min(1, c.age / c.duration);
      const u = 1 - t;
      const hx = u * u * c.p0.x + 2 * u * t * c.p1.x + t * t * c.p2.x;
      const hy = u * u * c.p0.y + 2 * u * t * c.p1.y + t * t * c.p2.y;
      const hz = u * u * c.p0.z + 2 * u * t * c.p1.z + t * t * c.p2.z;
      c.onAdvance(hx, hy, hz, t);

      // Dense trailing golden smoke & ember plume along comet Bezier curve (matches v2_bonus_slam 00:00:01.100-01.400!)
      for (let k = 0; k < 18; k++) {
        const backT = Math.max(0, t - (k / 18) * 0.08);
        const bu = 1 - backT;
        const bx = bu * bu * c.p0.x + 2 * bu * backT * c.p1.x + backT * backT * c.p2.x;
        const by = bu * bu * c.p0.y + 2 * bu * backT * c.p1.y + backT * backT * c.p2.y;
        const bz = bu * bu * c.p0.z + 2 * bu * backT * c.p1.z + backT * backT * c.p2.z;
        spawnParticle({
          x: bx + (Math.random() - 0.5) * 0.16,
          y: by + (Math.random() - 0.5) * 0.16,
          z: bz + (Math.random() - 0.5) * 0.08,
          vx: (Math.random() - 0.5) * 0.92,
          vy: -0.35 + (Math.random() - 0.5) * 0.78,
          drag: 0.91,
          swirl: (Math.random() - 0.5) * 5.8,
          life: 0.30 + Math.random() * 0.32,
          size: k === 0 ? 0.38 : 0.17 + Math.random() * 0.20,
          r: 1.0,
          g: k < 3 ? 0.95 : 0.76 + Math.random() * 0.18,
          b: k < 3 ? 0.70 : 0.25,
        });
      }

      if (t >= 1) {
        if (c.onArrive) c.onArrive();
        activeComets.splice(i, 1);
      }
    }

    // Update Wall-Impact Contour Filigree Arcs
    for (let i = activeWallArcs.length - 1; i >= 0; i--) {
      const arc = activeWallArcs[i];
      arc.age += dt;
      const t = arc.age / arc.life;
      if (t >= 1) {
        wallArcGroup.remove(arc.line);
        arc.geo.dispose();
        arc.mat.dispose();
        activeWallArcs.splice(i, 1);
        continue;
      }
      const span = arc.maxSpan * Math.pow(Math.min(1, t * 2.6), 0.55);
      const posArr = arc.geo.attributes.position.array;
      const segs = posArr.length / 3 - 1;
      for (let s = 0; s <= segs; s++) {
        const u = (s / segs) * 2 - 1; // -1 .. +1
        const smp = contourCollider.getPointAtS(arc.sCenter + u * span);
        const env = Math.sin(((s / segs) * Math.PI));
        const crackle =
          (Math.sin(s * 1.9 + elapsed * 32 + arc.seed) * 0.032 +
            Math.cos(s * 3.7 - elapsed * 24 + arc.strand * 3) * 0.022) *
          env;
        posArr[s * 3 + 0] = smp.pos.x + smp.normal.x * (0.015 + Math.abs(crackle));
        posArr[s * 3 + 1] = smp.pos.y + smp.normal.y * (0.015 + Math.abs(crackle));
        posArr[s * 3 + 2] = 0.09;
      }
      arc.geo.attributes.position.needsUpdate = true;
      arc.mat.opacity = (1 - Math.pow(t, 1.5)) * 0.95;
    }

    // Update Verdict Slam Radial Tendrils
    for (let i = activeTendrils.length - 1; i >= 0; i--) {
      const td = activeTendrils[i];
      td.age += dt;
      const t = td.age / td.life;
      if (t >= 1) {
        tendrilGroup.remove(td.line);
        td.geo.dispose();
        td.mat.dispose();
        activeTendrils.splice(i, 1);
        continue;
      }
      const grow = Math.pow(Math.min(1, t * 3.2), 0.48);
      const posArr = td.geo.attributes.position.array;
      const segs = posArr.length / 3 - 1;
      const dirX = Math.cos(td.baseAngle);
      const dirY = Math.sin(td.baseAngle);
      const perpX = -dirY;
      const perpY = dirX;

      for (let s = 0; s <= segs; s++) {
        const u = s / segs;
        const dist = (0.32 + u * td.len * grow);
        const wig =
          (Math.sin(u * 10.0 - elapsed * 18.0 + td.seed) * 0.09 +
            Math.cos(u * 21.0 + elapsed * 25.0) * 0.035) *
          u;
        posArr[s * 3 + 0] = dirX * dist + perpX * wig;
        posArr[s * 3 + 1] = -0.13 + dirY * dist + perpY * wig;
        posArr[s * 3 + 2] = 0.14;
      }
      td.geo.attributes.position.needsUpdate = true;
      td.mat.opacity = (1 - Math.pow(t, 1.35)) * 0.92;
    }

    // Update GPU Particle Pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i];
      if (!p.active) {
        pAlphas[i] = 0;
        continue;
      }
      p.age += dt;
      if (p.age >= p.life) {
        p.active = false;
        pAlphas[i] = 0;
        continue;
      }
      const t = p.age / p.life;
      if (p.swirl !== 0) {
        const cs = Math.cos(p.swirl * dt);
        const sn = Math.sin(p.swirl * dt);
        const nvx = p.vx * cs - p.vy * sn;
        const nvy = p.vx * sn + p.vy * cs;
        p.vx = nvx;
        p.vy = nvy;
      }
      p.vx = (p.vx + p.ax * dt) * Math.pow(p.drag, dt * 60);
      p.vy = (p.vy + p.ay * dt) * Math.pow(p.drag, dt * 60);
      p.vz *= Math.pow(p.drag, dt * 60);

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      pPositions[i * 3 + 0] = p.x;
      pPositions[i * 3 + 1] = p.y;
      pPositions[i * 3 + 2] = p.z;
      pColors[i * 3 + 0] = p.r;
      pColors[i * 3 + 1] = p.g;
      pColors[i * 3 + 2] = p.b;
      pSizes[i] = p.size * (1 - 0.45 * t);
      pAlphas[i] = Math.sin(Math.min(1, t * 5) * Math.PI * 0.5) * (1 - Math.pow(t, 1.4));
    }

    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.aColor.needsUpdate = true;
    pGeo.attributes.aSize.needsUpdate = true;
    pGeo.attributes.aAlpha.needsUpdate = true;
  }

  return {
    group: root,
    triggerWallImpact,
    triggerArcaneRing,
    launchBonusComet,
    triggerPreSlamTendrils,
    triggerVerdictSlam,
    triggerBannerFlameWave,
    getBannerReveal: () => THREE.MathUtils.clamp(bannerTimer / 0.35, 0, 1),
    reset,
    spawnParticle,
    update,
  };
}
