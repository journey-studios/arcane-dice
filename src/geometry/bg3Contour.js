import * as THREE from 'three';

/**
 * Exact mathematical parameterization of the Baldur's Gate 3 Dice Tray & Lateral Frames,
 * derived directly from pixel-by-pixel scans of reference frames (608x1080 & 1080x1920):
 * 1 world unit = 100 px in the 608x1080 reference coordinate space, centered at (304, 400).
 *
 * Key landmarks in world units (Y-up):
 * - Top dome crown:       (0, +2.48)
 * - Bottom dome crown:    (0, -2.48)
 * - Upper/lower cusps:    (±1.14, ±1.844)
 * - Vertical inner walls: x = ±1.75
 * - Celtic bar & clasps:  y = +0.30 (x ∈ [-1.46, +1.46])
 * - Resting d20 center:   y = -0.14 (top vertex reaches +0.47, just above the +0.30 Celtic bar!)
 * - Outer lateral rails:  x = ±2.07
 * - Corner barbs flare:   x = ±2.18 at y = ±1.20
 */
export const TRAY_METRICS = {
  halfH: 2.48,
  wallX: 1.75,
  domeCenterY: 1.14,
  domeRadius: 1.34,
  cuspX: 1.14,
  cuspY: 1.8442, // 1.14 + sqrt(1.34^2 - 1.14^2)
  lobeCenterX: 1.14,
  lobeCenterY: 1.2342,
  lobeRadius: 0.61,
  barY: 0.30,
  barHalfWidth: 1.46,
  diceRestY: -0.11,
  diceRadius: 0.62,
  advantageOffsetX: 0.60,
  outerRailX: 2.07,
  seagullY: 2.77,
};

/**
 * Generates an ordered closed polyline (CCW) of the inner BG3 8-cusped cartouche,
 * including the twin C-shaped pincer clasps at y = +0.30 that grip the Celtic bronze bar.
 */
export function buildInnerCartouchePoints(includeClasps = true) {
  const pts = [];
  const {
    domeCenterY,
    domeRadius,
    cuspX,
    lobeCenterX,
    lobeCenterY,
    lobeRadius,
    wallX,
    barY,
  } = TRAY_METRICS;

  const pushArc = (cx, cy, r, a0, a1, steps, skipFirst = true) => {
    for (let i = skipFirst ? 1 : 0; i <= steps; i++) {
      const t = i / steps;
      const a = a0 + (a1 - a0) * t;
      pts.push(new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r));
    }
  };

  const pushCubic = (p0, p1, p2, p3, steps) => {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const u = 1 - t;
      const x =
        u * u * u * p0.x +
        3 * u * u * t * p1.x +
        3 * u * t * t * p2.x +
        t * t * t * p3.x;
      const y =
        u * u * u * p0.y +
        3 * u * u * t * p1.y +
        3 * u * t * t * p2.y +
        t * t * t * p3.y;
      pts.push(new THREE.Vector2(x, y));
    }
  };

  // Angle of top dome from right cusp (+1.14, +1.8442) to left cusp (-1.14, +1.8442)
  const domeAngleRight = Math.acos(cuspX / domeRadius); // ~0.553 rad (31.7 deg)
  const domeAngleLeft = Math.PI - domeAngleRight;

  // 1. Top Dome Arch (Right cusp -> Top peak -> Left cusp)
  pushArc(0, domeCenterY, domeRadius, domeAngleRight, domeAngleLeft, 44, false);

  // 2. Top-Left Shoulder Lobe (Left cusp (-1.14, +1.8442) -> (-1.75, +1.2342))
  pushArc(-lobeCenterX, lobeCenterY, lobeRadius, Math.PI * 0.5, Math.PI, 24, true);

  // 3. Left Wall + Left Equator C-Clasp (y: +1.2342 -> -1.2342)
  if (includeClasps) {
    pts.push(new THREE.Vector2(-wallX, barY + 0.25));
    // Upper inward C-hook gripping bar collar
    pushCubic(
      new THREE.Vector2(-wallX, barY + 0.25),
      new THREE.Vector2(-wallX, barY + 0.13),
      new THREE.Vector2(-1.53, barY + 0.16),
      new THREE.Vector2(-1.48, barY + 0.065),
      10
    );
    pts.push(new THREE.Vector2(-1.48, barY - 0.065));
    // Lower outward C-hook returning to left wall
    pushCubic(
      new THREE.Vector2(-1.48, barY - 0.065),
      new THREE.Vector2(-1.53, barY - 0.16),
      new THREE.Vector2(-wallX, barY - 0.13),
      new THREE.Vector2(-wallX, barY - 0.25),
      10
    );
  }
  pts.push(new THREE.Vector2(-wallX, -lobeCenterY));

  // 4. Bottom-Left Shoulder Lobe ((-1.75, -1.2342) -> (-1.14, -1.8442))
  pushArc(-lobeCenterX, -lobeCenterY, lobeRadius, Math.PI, Math.PI * 1.5, 24, true);

  // 5. Bottom Dome Arch (Left bottom cusp -> Bottom peak -> Right bottom cusp)
  pushArc(
    0,
    -domeCenterY,
    domeRadius,
    Math.PI + domeAngleRight,
    2 * Math.PI - domeAngleRight,
    44,
    true
  );

  // 6. Bottom-Right Shoulder Lobe ((+1.14, -1.8442) -> (+1.75, -1.2342))
  pushArc(lobeCenterX, -lobeCenterY, lobeRadius, Math.PI * 1.5, Math.PI * 2, 24, true);

  // 7. Right Wall + Right Equator C-Clasp (y: -1.2342 -> +1.2342)
  if (includeClasps) {
    pts.push(new THREE.Vector2(wallX, barY - 0.25));
    pushCubic(
      new THREE.Vector2(wallX, barY - 0.25),
      new THREE.Vector2(wallX, barY - 0.13),
      new THREE.Vector2(1.53, barY - 0.16),
      new THREE.Vector2(1.48, barY - 0.065),
      10
    );
    pts.push(new THREE.Vector2(1.48, barY + 0.065));
    pushCubic(
      new THREE.Vector2(1.48, barY + 0.065),
      new THREE.Vector2(1.53, barY + 0.16),
      new THREE.Vector2(wallX, barY + 0.13),
      new THREE.Vector2(wallX, barY + 0.25),
      10
    );
  }
  pts.push(new THREE.Vector2(wallX, lobeCenterY));

  // 8. Top-Right Shoulder Lobe ((+1.75, +1.2342) -> (+1.14, +1.8442))
  // Omit the final duplicate point so closed loops don't overlap
  for (let i = 1; i < 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 0.5;
    pts.push(
      new THREE.Vector2(
        lobeCenterX + Math.cos(a) * lobeRadius,
        lobeCenterY + Math.sin(a) * lobeRadius
      )
    );
  }

  return pts;
}

/**
 * Precomputes uniform arc-length samples along the inner tray wall so that:
 * 1) Physics collisions bounce realistically off the exact curved Gothic wall normals.
 * 2) Golden wall-impact crackling filigree crawls smoothly along the exact wall contour!
 */
export function createContourCollider(numSamples = 360) {
  const raw = buildInnerCartouchePoints(false);
  const segLengths = [];
  let totalLen = 0;
  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    const b = raw[(i + 1) % raw.length];
    const len = a.distanceTo(b);
    segLengths.push(len);
    totalLen += len;
  }

  const samples = [];
  let acc = 0;
  let segIdx = 0;
  for (let s = 0; s < numSamples; s++) {
    const target = (s / numSamples) * totalLen;
    while (segIdx < raw.length - 1 && acc + segLengths[segIdx] < target) {
      acc += segLengths[segIdx];
      segIdx++;
    }
    const localT = segLengths[segIdx] > 1e-6 ? (target - acc) / segLengths[segIdx] : 0;
    const a = raw[segIdx];
    const b = raw[(segIdx + 1) % raw.length];
    const pos = new THREE.Vector2().lerpVectors(a, b, localT);
    const tangent = new THREE.Vector2().subVectors(b, a).normalize();
    // CCW polygon -> inward normal is (-tangent.y, tangent.x)
    const normal = new THREE.Vector2(-tangent.y, tangent.x);
    samples.push({ pos, tangent, normal, s: s / numSamples });
  }

  return {
    samples,
    totalLen,
    getPointAtS(sNorm) {
      const wrapped = ((sNorm % 1) + 1) % 1;
      const fIdx = wrapped * numSamples;
      const i0 = Math.floor(fIdx) % numSamples;
      const i1 = (i0 + 1) % numSamples;
      const frac = fIdx - Math.floor(fIdx);
      return {
        pos: new THREE.Vector2().lerpVectors(samples[i0].pos, samples[i1].pos, frac),
        tangent: new THREE.Vector2().lerpVectors(samples[i0].tangent, samples[i1].tangent, frac).normalize(),
        normal: new THREE.Vector2().lerpVectors(samples[i0].normal, samples[i1].normal, frac).normalize(),
      };
    },
    findClosestWall(x, y) {
      let bestDistSq = Infinity;
      let bestIdx = 0;
      for (let i = 0; i < numSamples; i++) {
        const dx = x - samples[i].pos.x;
        const dy = y - samples[i].pos.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDistSq) {
          bestDistSq = d2;
          bestIdx = i;
        }
      }
      const hit = samples[bestIdx];
      return {
        dist: Math.sqrt(bestDistSq),
        pos: hit.pos,
        normal: hit.normal,
        tangent: hit.tangent,
        s: hit.s,
      };
    },
  };
}
