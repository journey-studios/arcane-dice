import * as THREE from 'three';

/**
 * Standard Chessex / Baldur's Gate 3 d20 face assignment.
 * Assigned deterministically after sorting/matching the 20 icosahedron faces
 * relative to Face #0 (20) so that:
 * - Center = 20 (opposite = 1)
 * - Bottom = 8 (opposite = 13)
 * - Upper-left = 2 (opposite = 19)
 * - Upper-right = 14 (opposite = 7)
 * - Top-left shoulder = 18 (opposite = 3)
 * - Top-right shoulder = 4 (opposite = 17)
 * - Lower-left = 10 (opposite = 11)
 * - Lower-right = 16 (opposite = 5)
 * - Far-left = 12 (opposite = 9)
 * - Far-right = 6 (opposite = 15)
 */
const SKIN_CONFIGS = {
  obsidian: {
    name: 'Obsidian Silver-Steel (Video 1)',
    faceOuter: '#565a75',
    faceInner: '#262838',
    faceMid: '#41455e',
    ridgeOuter: '#dce2f2',
    ridgeGlow: 'rgba(218, 226, 250, 0.88)',
    textFill: '#eef0fa',
    textStroke: '#181a26',
    goldTextFill: '#ffe5a3',
    goldRidge: '#f5ca74',
    metalness: 0.64,
    roughness: 0.25,
    emissiveColor: '#1d1f30',
    emissiveIntensity: 0.26,
  },
  emerald: {
    name: 'Emerald Jade Crystal (Video 2)',
    faceOuter: '#2d7c3e',
    faceInner: '#10381b',
    faceMid: '#1a5628',
    ridgeOuter: '#7bf26b',
    ridgeGlow: 'rgba(126, 250, 108, 0.92)',
    textFill: '#d9ebd9',
    textStroke: '#0b2612',
    goldTextFill: '#ffe094',
    goldRidge: '#b7f57e',
    metalness: 0.24,
    roughness: 0.18,
    emissiveColor: '#134d1d',
    emissiveIntensity: 0.48,
  },
};

/**
 * Builds a canonical regular icosahedron rotated so that one equilateral triangle
 * has outward normal = (0, 0, +1) and its apex vertex pointing straight UP (+Y),
 * matching BG3's exact hexagonal silhouette & adjacent face layout!
 */
function buildCanonicalD20Geometry(radius = 0.56) {
  const baseGeo = new THREE.IcosahedronGeometry(radius, 0);
  const pos = baseGeo.attributes.position;

  // Find a face and compute rotation so its normal -> (0,0,1) and one vertex -> +Y
  const v0 = new THREE.Vector3().fromBufferAttribute(pos, 0);
  const v1 = new THREE.Vector3().fromBufferAttribute(pos, 1);
  const v2 = new THREE.Vector3().fromBufferAttribute(pos, 2);
  const center = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
  const fNormal = center.clone().normalize();
  const upDir = v0.clone().sub(center).normalize();
  const rightDir = new THREE.Vector3().crossVectors(upDir, fNormal).normalize();

  // Source basis [rightDir, upDir, fNormal] -> Target basis [X, Y, Z]
  const srcBasis = new THREE.Matrix4().makeBasis(rightDir, upDir, fNormal);
  const alignMat = srcBasis.clone().invert();
  baseGeo.applyMatrix4(alignMat);

  // Extract all 20 non-indexed triangles and classify them spatially to assign exact Chessex numbers
  const nonIndexed = baseGeo.index ? baseGeo.toNonIndexed() : baseGeo;
  const pAttr = nonIndexed.attributes.position;
  const faces = [];

  for (let f = 0; f < 20; f++) {
    const a = new THREE.Vector3().fromBufferAttribute(pAttr, f * 3 + 0);
    const b = new THREE.Vector3().fromBufferAttribute(pAttr, f * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(pAttr, f * 3 + 2);
    const centroid = new THREE.Vector3().add(a).add(b).add(c).divideScalar(3);
    const normal = centroid.clone().normalize();
    faces.push({ index: f, verts: [a, b, c], centroid, normal, number: 0 });
  }

  // Classify front 10 faces & back 10 antipodal faces by exact normal direction
  const findClosestNormal = (nx, ny, nz) => {
    const target = new THREE.Vector3(nx, ny, nz).normalize();
    let best = null;
    let bestDot = -Infinity;
    for (const f of faces) {
      if (f.number !== 0) continue;
      const d = f.normal.dot(target);
      if (d > bestDot) {
        bestDot = d;
        best = f;
      }
    }
    return best;
  };

  const assignPair = (nx, ny, nz, frontNum, backNum) => {
    const front = findClosestNormal(nx, ny, nz);
    if (front) front.number = frontNum;
    const back = findClosestNormal(-nx, -ny, -nz);
    if (back) back.number = backNum;
  };

  // Exact Chessex / BG3 face adjacency around 20 (0, 0, 1):
  assignPair(0, 0, 1, 20, 1);
  assignPair(0, -0.75, 0.66, 8, 13);        // Bottom adjacent
  assignPair(-0.65, 0.37, 0.66, 2, 19);     // Upper-left adjacent
  assignPair(0.65, 0.37, 0.66, 14, 7);      // Upper-right adjacent
  assignPair(-0.36, 0.88, 0.30, 18, 3);     // Top-left shoulder
  assignPair(0.36, 0.88, 0.30, 4, 17);      // Top-right shoulder
  assignPair(-0.62, -0.72, 0.30, 10, 11);   // Bottom-left
  assignPair(0.62, -0.72, 0.30, 16, 5);     // Bottom-right
  assignPair(-0.95, 0.0, 0.30, 12, 9);      // Far-left
  assignPair(0.95, 0.0, 0.30, 6, 15);       // Far-right

  // Reorder vertices inside each triangle [apex, bottomLeft, bottomRight] so numerals orient naturally:
  // Specifically:
  // - For Face 20: apex points +Y
  // - For Face 8:  inverted triangle in world space, wait: in frame_0007.png "8" is upright!
  //   Since 8 is symmetric vertically, choosing apex = bottom vertex (-Y) or top edge makes 8 upright!
  // - For every face, pick the vertex whose direction from centroid best aligns with "up" on the die
  //   while maintaining CCW winding (a, b, c) around outward normal!
  const outPositions = [];
  const outNormals = [];
  const outUVs = [];

  // 5x4 atlas grid for the 20 faces (each tile is 0.20 wide x 0.25 tall)
  const COLS = 5;
  const ROWS = 4;

  for (let f = 0; f < 20; f++) {
    const face = faces[f];
    const [vA, vB, vC] = face.verts;

    // Choose apex vertex: for front faces, prefer vertex pointing most toward +Y (or away from 20 for radial numerals)
    let worldRefUp = new THREE.Vector3(0, 1, 0);
    if (Math.abs(face.normal.y) > 0.85) {
      worldRefUp.set(0, 0, face.normal.y > 0 ? -1 : 1);
    }
    // Project worldRefUp onto face plane
    const tangentUp = worldRefUp
      .clone()
      .sub(face.normal.clone().multiplyScalar(worldRefUp.dot(face.normal)))
      .normalize();

    const candidates = [
      [vA, vB, vC],
      [vB, vC, vA],
      [vC, vA, vB],
    ];
    let bestTri = candidates[0];
    let bestScore = -Infinity;
    let chosenRawAlign = 1;
    for (const tri of candidates) {
      const dir = tri[0].clone().sub(face.centroid).normalize();
      const rawAlign = dir.dot(tangentUp);
      const score = Math.abs(rawAlign) + (rawAlign > 0 ? 0.05 : 0);
      if (score > bestScore) {
        bestScore = score;
        bestTri = tri;
        chosenRawAlign = rawAlign;
      }
    }

    const [apex, bl, br] = bestTri;
    face.apex = apex;
    face.bl = bl;
    face.br = br;
    face.apexPointsDown = chosenRawAlign < 0;
    const apexDir = apex.clone().sub(face.centroid).normalize();
    face.upTangent = face.apexPointsDown ? apexDir.clone().negate() : apexDir;
    face.rightTangent = new THREE.Vector3().crossVectors(face.upTangent, face.normal).normalize();

    // Compute target rotation quaternion that brings this face flat to camera (with subtle +6.5° X tilt like BG3!)
    const srcM = new THREE.Matrix4().makeBasis(face.rightTangent, face.upTangent, face.normal);
    const tiltM = new THREE.Matrix4().makeRotationX(THREE.MathUtils.degToRad(6.5));
    const targetM = tiltM.multiply(srcM.clone().invert());
    face.targetQuat = new THREE.Quaternion().setFromRotationMatrix(targetM);

    // Atlas tile coordinates
    const col = f % COLS;
    const row = Math.floor(f / COLS);
    const u0 = col / COLS;
    const v0Tile = 1 - (row + 1) / ROWS;
    const uW = 1 / COLS;
    const vH = 1 / ROWS;

    // Equilateral triangle inside tile with safe padding so mipmaps never bleed
    const uApex = u0 + uW * 0.5;
    const vApex = v0Tile + vH * 0.90;
    const uBL = u0 + uW * 0.10;
    const vBL = v0Tile + vH * 0.12;
    const uBR = u0 + uW * 0.90;
    const vBR = v0Tile + vH * 0.12;

    for (const vert of [apex, bl, br]) {
      outPositions.push(vert.x, vert.y, vert.z);
      // Slight smooth bevel normal blend (88% flat facet + 12% spherical vertex normal for realistic specular edge catch!)
      const vNorm = vert.clone().normalize();
      const blended = face.normal.clone().multiplyScalar(0.86).addScaledVector(vNorm, 0.14).normalize();
      outNormals.push(blended.x, blended.y, blended.z);
    }
    outUVs.push(uApex, vApex, uBL, vBL, uBR, vBR);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(outNormals, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(outUVs, 2));

  return { geometry: geo, faces };
}

/**
 * Creates a BG3 3D d20 instance with dynamic high-DPI atlas rendering,
 * bump/normal bevel ridges, emissive highlight map, and drop shadow.
 */
export function createBG3D20(initialSkin = 'obsidian', radius = 0.56) {
  const { geometry, faces } = buildCanonicalD20Geometry(radius);

  const ATLAS_W = 2048;
  const ATLAS_H = 1638; // 5x4 aspect-matched tiles
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = ATLAS_W;
  colorCanvas.height = ATLAS_H;
  const ctx = colorCanvas.getContext('2d');

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = ATLAS_W;
  bumpCanvas.height = ATLAS_H;
  const bctx = bumpCanvas.getContext('2d');

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = ATLAS_W;
  emissiveCanvas.height = ATLAS_H;
  const ectx = emissiveCanvas.getContext('2d');

  const colorMap = new THREE.CanvasTexture(colorCanvas);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.anisotropy = 8;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.anisotropy = 8;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;

  let currentSkin = initialSkin;
  let activeOverrideFaceIndex = -1;
  let activeOverrideText = null;
  let activeGoldHighlight = false;

  function renderAtlas() {
    const skin = SKIN_CONFIGS[currentSkin] || SKIN_CONFIGS.obsidian;
    const COLS = 5;
    const ROWS = 4;
    const tileW = ATLAS_W / COLS;
    const tileH = ATLAS_H / ROWS;

    ctx.fillStyle = skin.faceOuter;
    ctx.fillRect(0, 0, ATLAS_W, ATLAS_H);

    bctx.fillStyle = '#808080';
    bctx.fillRect(0, 0, ATLAS_W, ATLAS_H);

    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, ATLAS_W, ATLAS_H);

    for (let f = 0; f < 20; f++) {
      const col = f % COLS;
      const row = Math.floor(f / COLS);
      const x0 = col * tileW;
      const y0 = row * tileH;

      // Exact matching triangle vertices in canvas space (Y-down):
      const ax = x0 + tileW * 0.5;
      const ay = y0 + tileH * (1 - 0.90);
      const blx = x0 + tileW * 0.10;
      const bly = y0 + tileH * (1 - 0.12);
      const brx = x0 + tileW * 0.90;
      const bry = y0 + tileH * (1 - 0.12);

      const cx = (ax + blx + brx) / 3;
      const cy = (ay + bly + bry) / 3;

      const isOverridden = f === activeOverrideFaceIndex;
      const label =
        isOverridden && activeOverrideText !== null
          ? String(activeOverrideText)
          : String(faces[f].number);
      const useGold = isOverridden && activeGoldHighlight;

      // 1. Radial crystalline/metallic facet fill
      const radGrad = ctx.createRadialGradient(cx, cy, tileW * 0.03, cx, cy, tileW * 0.44);
      if (currentSkin === 'emerald') {
        radGrad.addColorStop(0, '#2a7c3d');
        radGrad.addColorStop(0.55, skin.faceMid);
        radGrad.addColorStop(1, skin.faceInner);
      } else {
        radGrad.addColorStop(0, '#686d8c');
        radGrad.addColorStop(0.58, skin.faceMid);
        radGrad.addColorStop(1, skin.faceInner);
      }

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(blx, bly);
      ctx.lineTo(brx, bry);
      ctx.closePath();
      ctx.fillStyle = radGrad;
      ctx.fill();

      // Subtle internal facet crystalline streaks (especially visible in Emerald Jade & brushed Slate)
      ctx.clip();
      ctx.strokeStyle =
        currentSkin === 'emerald' ? 'rgba(155, 255, 145, 0.13)' : 'rgba(220, 228, 255, 0.07)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(ax - tileW * 0.18, ay + tileH * 0.12);
      ctx.lineTo(brx - tileW * 0.12, bry - tileH * 0.06);
      ctx.moveTo(blx + tileW * 0.15, bly);
      ctx.lineTo(ax + tileW * 0.14, ay + tileH * 0.25);
      ctx.stroke();

      // 2. Inset metallic/crystal border triangle (the signature BG3 bright facet ridge!)
      const insetScale = 0.915;
      const iax = cx + (ax - cx) * insetScale;
      const iay = cy + (ay - cy) * insetScale;
      const iblx = cx + (blx - cx) * insetScale;
      const ibly = cy + (bly - cy) * insetScale;
      const ibrx = cx + (brx - cx) * insetScale;
      const ibry = cy + (bry - cy) * insetScale;

      // Outer bevel border
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(blx, bly);
      ctx.lineTo(brx, bry);
      ctx.closePath();
      ctx.strokeStyle = useGold ? skin.goldRidge : skin.ridgeOuter;
      ctx.lineWidth = 17;
      ctx.lineJoin = 'round';
      ctx.stroke();

      // Thin dark inner groove inside the bright ridge (gives authentic BG3 engraved border depth)
      ctx.beginPath();
      ctx.moveTo(iax, iay);
      ctx.lineTo(iblx, ibly);
      ctx.lineTo(ibrx, ibry);
      ctx.closePath();
      ctx.strokeStyle = currentSkin === 'emerald' ? 'rgba(6, 26, 10, 0.72)' : 'rgba(18, 20, 30, 0.78)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // Bump map ridge (bright = raised ridge, dark = engraved numeral)
      bctx.save();
      bctx.beginPath();
      bctx.moveTo(ax, ay);
      bctx.lineTo(blx, bly);
      bctx.lineTo(brx, bry);
      bctx.closePath();
      bctx.strokeStyle = '#ffffff';
      bctx.lineWidth = 18;
      bctx.stroke();
      bctx.restore();

      // Emissive map for emerald glowing edges or golden bonus/crit pulse
      if (currentSkin === 'emerald' || useGold) {
        ectx.save();
        ectx.beginPath();
        ectx.moveTo(ax, ay);
        ectx.lineTo(blx, bly);
        ectx.lineTo(brx, bry);
        ectx.closePath();
        ectx.strokeStyle = useGold ? '#ffb940' : '#4ad644';
        ectx.lineWidth = 14;
        ectx.stroke();
        ectx.restore();
      }

      // 3. Classical BG3 Engraved Serif Numeral centered inside the equilateral triangle
      const fontSize = label.length >= 2 ? Math.round(tileW * 0.255) : Math.round(tileW * 0.285);
      const fontSpec = `700 ${fontSize}px "Cinzel", "Palatino Linotype", "Book Antiqua", Georgia, serif`;
      const rot = faces[f].apexPointsDown ? Math.PI : 0;
      const localTextY = fontSize * 0.33;

      ctx.save();
      ctx.translate(cx, cy);
      if (rot) ctx.rotate(rot);
      ctx.font = fontSpec;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';

      // Dark engraved shadow outline
      ctx.strokeStyle = skin.textStroke;
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.strokeText(label, 0, localTextY);

      if (useGold) {
        ctx.shadowColor = 'rgba(255, 195, 70, 0.95)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = skin.goldTextFill;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
        ctx.shadowBlur = 4;
        ctx.fillStyle = skin.textFill;
      }
      ctx.fillText(label, 0, localTextY);

      // Underline dot/bar on 6 and 9 when not overridden
      if (!isOverridden && (faces[f].number === 6 || faces[f].number === 9)) {
        ctx.fillRect(-fontSize * 0.16, localTextY + 7, fontSize * 0.32, 4.5);
      }
      ctx.restore();

      // Engraved numeral recess in bump map
      bctx.save();
      bctx.translate(cx, cy);
      if (rot) bctx.rotate(rot);
      bctx.font = fontSpec;
      bctx.textAlign = 'center';
      bctx.textBaseline = 'alphabetic';
      bctx.fillStyle = '#242424';
      bctx.fillText(label, 0, localTextY);
      bctx.restore();

      // Golden emissive glow on active modified/critical numeral
      if (useGold) {
        ectx.save();
        ectx.translate(cx, cy);
        if (rot) ectx.rotate(rot);
        ectx.font = fontSpec;
        ectx.textAlign = 'center';
        ectx.textBaseline = 'alphabetic';
        ectx.shadowColor = '#ffa828';
        ectx.shadowBlur = 22;
        ectx.fillStyle = '#ffe299';
        ectx.fillText(label, 0, localTextY);
        ectx.restore();
      }
    }

    colorMap.needsUpdate = true;
    bumpMap.needsUpdate = true;
    emissiveMap.needsUpdate = true;
  }

  const skinInit = SKIN_CONFIGS[currentSkin] || SKIN_CONFIGS.obsidian;
  const material = new THREE.MeshStandardMaterial({
    map: colorMap,
    bumpMap: bumpMap,
    bumpScale: 0.024,
    emissiveMap: emissiveMap,
    emissive: new THREE.Color('#ffffff'),
    emissiveIntensity: currentSkin === 'emerald' ? 0.42 : 0.22,
    metalness: skinInit.metalness,
    roughness: skinInit.roughness,
    transparent: true,
    opacity: 1.0,
  });

  renderAtlas();

  const group = new THREE.Group();
  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Specular entrance flash shell (additive white-gold sheen seen at t=0.85s)
  const flashMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d6,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const flashMesh = new THREE.Mesh(geometry.clone().scale(1.012, 1.012, 1.012), flashMat);
  group.add(flashMesh);

  // Dedicated Front-Triangle Incandescent Slam Flash (matches v2_bonus_slam 00:00:02.700!)
  const inradius = radius * 0.7947;
  const circumTriR = radius * 0.607;
  const slamTriGeo = new THREE.BufferGeometry();
  const sVerts = new Float32Array([
    0, circumTriR, inradius + 0.008,
    -circumTriR * 0.866, -circumTriR * 0.5, inradius + 0.008,
    circumTriR * 0.866, -circumTriR * 0.5, inradius + 0.008,
  ]);
  slamTriGeo.setAttribute('position', new THREE.BufferAttribute(sVerts, 3));
  const slamFaceMat = new THREE.MeshBasicMaterial({
    color: 0xfff4cf,
    transparent: true,
    opacity: 0.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const slamFaceMesh = new THREE.Mesh(slamTriGeo, slamFaceMat);
  slamFaceMesh.rotation.x = THREE.MathUtils.degToRad(6.5);
  group.add(slamFaceMesh);

  // Soft circular contact shadow on the tray board (rendered independently in world XY)
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const sctx = shadowCanvas.getContext('2d');
  const sg = sctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  sg.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  sg.addColorStop(0.55, 'rgba(0, 0, 0, 0.36)');
  sg.addColorStop(1, 'rgba(0, 0, 0, 0.0)');
  sctx.fillStyle = sg;
  sctx.fillRect(0, 0, 128, 128);
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const shadowMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2.55, radius * 2.55),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    })
  );
  shadowMesh.position.z = 0.015;

  function getFaceByNumber(num) {
    return faces.find((f) => f.number === num) || faces[0];
  }

  // Default to showing 20 flat toward camera with BG3's +6.5° X-tilt
  const face20 = getFaceByNumber(20);
  mesh.quaternion.copy(face20.targetQuat);
  flashMesh.quaternion.copy(face20.targetQuat);

  return {
    group,
    mesh,
    flashMesh,
    flashMat,
    slamFaceMesh,
    slamFaceMat,
    shadowMesh,
    material,
    faces,
    radius,
    getFaceByNumber,
    setSkin(skinKey) {
      if (!SKIN_CONFIGS[skinKey]) return;
      currentSkin = skinKey;
      const cfg = SKIN_CONFIGS[skinKey];
      material.metalness = cfg.metalness;
      material.roughness = cfg.roughness;
      material.emissiveIntensity = skinKey === 'emerald' ? 0.45 : 0.65;
      renderAtlas();
    },
    getSkin() {
      return currentSkin;
    },
    setActiveFaceOverride(faceNumber, displayValue, goldHighlight = false) {
      const f = getFaceByNumber(faceNumber);
      activeOverrideFaceIndex = f ? f.index : -1;
      activeOverrideText = displayValue;
      activeGoldHighlight = goldHighlight;
      if (f) {
        slamFaceMesh.rotation.z = f.apexPointsDown ? Math.PI : 0;
      }
      material.emissiveIntensity = goldHighlight ? 0.85 : currentSkin === 'emerald' ? 0.45 : 0.25;
      renderAtlas();
    },
    clearOverride() {
      if (activeOverrideFaceIndex === -1 && activeOverrideText === null && !activeGoldHighlight) return;
      activeOverrideFaceIndex = -1;
      activeOverrideText = null;
      activeGoldHighlight = false;
      material.emissiveIntensity = currentSkin === 'emerald' ? 0.45 : 0.25;
      renderAtlas();
    },
    setOpacity(alpha) {
      material.opacity = alpha;
      shadowMesh.material.opacity = 0.85 * alpha;
    },
    syncShadow() {
      const lift = Math.max(0, group.position.z - 0.36);
      shadowMesh.position.x = group.position.x;
      shadowMesh.position.y = group.position.y - 0.08 - lift * 0.08;
      const s = 1 + lift * 0.35;
      shadowMesh.scale.set(s, s, 1);
      shadowMesh.material.opacity = Math.max(0.12, 0.82 - lift * 0.42) * material.opacity;
      flashMesh.quaternion.copy(mesh.quaternion);
    },
  };
}

/**
 * Creates the miniature 3D Tetrahedral d4 Guidance / Orientação die
 * seen rolling directly over the +1d4 bonus card in frame_0040.png & frame_0025.png!
 */
export function createGuidanceD4(radius = 0.30) {
  const baseTet = new THREE.TetrahedronGeometry(radius, 0);
  const geo = baseTet.index ? baseTet.toNonIndexed() : baseTet;
  const uvs = [];
  const poses = [];
  const position = geo.getAttribute('position');
  for (let face = 0; face < 4; face++) {
    uvs.push((face + 0.5) / 4, 0.92, (face + 0.08) / 4, 0.12, (face + 0.92) / 4, 0.12);
    const a = new THREE.Vector3().fromBufferAttribute(position, face * 3);
    const b = new THREE.Vector3().fromBufferAttribute(position, face * 3 + 1);
    const c = new THREE.Vector3().fromBufferAttribute(position, face * 3 + 2);
    const center = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const normal = center.clone().normalize();
    const up = a.sub(center).normalize();
    const right = new THREE.Vector3().crossVectors(up, normal);
    const basis = new THREE.Matrix4().makeBasis(right, up, normal).invert();
    poses.push(new THREE.Quaternion().setFromRotationMatrix(basis));
  }
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));

  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext('2d');
  for (let face = 0; face < 4; face++) {
    ctx.save();
    ctx.translate(face * 256, 0);
    const gradient = ctx.createRadialGradient(128, 150, 10, 128, 150, 120);
    gradient.addColorStop(0, '#cfc7b4');
    gradient.addColorStop(0.65, '#8f846c');
    gradient.addColorStop(1, '#584e3c');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
    ctx.beginPath();
    ctx.moveTo(128, 20);
    ctx.lineTo(22, 225);
    ctx.lineTo(234, 225);
    ctx.closePath();
    ctx.strokeStyle = '#fff0c2';
    ctx.lineWidth = 10;
    ctx.stroke();
    ctx.fillStyle = '#2a2115';
    ctx.font = '700 96px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(face + 1), 128, 186);
    ctx.restore();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    metalness: 0.35,
    roughness: 0.25,
    emissive: new THREE.Color('#ffd074'),
    emissiveIntensity: 0.35,
    transparent: true,
    opacity: 0,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.visible = false;
  return { mesh, mat, getResultPose: (value) => poses[value - 1] };
}
