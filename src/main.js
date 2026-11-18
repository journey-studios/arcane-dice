import * as THREE from 'three';
import { TRAY_METRICS, createContourCollider } from './geometry/bg3Contour.js';
import { createBG3TrayAndFrame } from './scene/trayAndFrame.js';
import { createBG3D20, createGuidanceD4 } from './scene/dice3d.js';
import { createBG3VFXSystem } from './scene/vfx3d.js';
import { createBG3Audio } from './audio/sfx.js';
import { createSettings } from './settings.js';

// ===========================================================================
// SVG ICON & ORNAMENT TEMPLATES (Exact BG3 Card Emblems & Filigree)
// ===========================================================================
const ICONS = {
  charisma: `
    <svg viewBox="0 0 64 64" width="50" height="50">
      <defs>
        <linearGradient id="gBrz" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#e3c088"/>
          <stop offset="55%" stop-color="#9b7745"/>
          <stop offset="100%" stop-color="#4e381d"/>
        </linearGradient>
      </defs>
      <polygon points="32,8 56,52 8,52" fill="rgba(35,24,42,0.85)" stroke="url(#gBrz)" stroke-width="3.2"/>
      <polygon points="32,15 49,48 15,48" fill="none" stroke="#c8a26a" stroke-width="1"/>
      <circle cx="32" cy="26" r="4.5" fill="#b84a9c" stroke="#f0d29c" stroke-width="1.2"/>
      <path d="M16,42 L29,31 L36,36 L48,27 L44,45 L20,45 Z" fill="url(#gBrz)" stroke="#24180d" stroke-width="1.2"/>
    </svg>`,
  wisdom: `
    <svg viewBox="0 0 64 64" width="50" height="50">
      <polygon points="10,14 54,14 32,54" fill="rgba(28,24,36,0.85)" stroke="#b59260" stroke-width="3"/>
      <rect x="21" y="16" width="20" height="25" rx="2" transform="rotate(-8 31 28)" fill="#b9b2a6" stroke="#3a3228" stroke-width="1.4"/>
      <path d="M26,42 C34,30 42,20 51,13 C47,24 40,33 31,43 Z" fill="#d9ab6c" stroke="#2d1f10" stroke-width="1"/>
      <circle cx="26" cy="24" r="2.2" fill="#2c2622"/>
      <circle cx="33" cy="34" r="2.6" fill="#7c2828"/>
    </svg>`,
  situational: `
    <svg viewBox="0 0 64 64" width="50" height="50">
      <circle cx="32" cy="30" r="18" fill="rgba(36,62,28,0.65)" stroke="#9e7d47" stroke-width="2.5"/>
      <circle cx="32" cy="18" r="3.4" fill="#deb878"/>
      <path d="M22,23 Q32,27 42,23 M32,22 L32,42 M26,43 L32,34 L38,43" stroke="#deb878" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <path d="M14,48 Q23,43 32,49 Q41,43 50,48 L47,54 Q39,50 32,55 Q25,50 17,54 Z" fill="#a8824a" stroke="#2b1d0e" stroke-width="1.2"/>
    </svg>`,
  guidance: `
    <svg viewBox="0 0 64 64" width="50" height="50">
      <rect x="14" y="10" width="38" height="38" rx="4" fill="#2c2216" stroke="#85683e" stroke-width="1.6"/>
      <path d="M26,40 C24,33 27,25 34,20 C37,18 40,20 38,24 L33,30 L42,24 C45,23 46,26 43,29 L35,36 C39,35 42,37 39,40 C35,43 29,43 26,40 Z"
        fill="none" stroke="#ffd87a" stroke-width="2.4" filter="drop-shadow(0 0 4px #ffb838)"/>
      <circle cx="19" cy="44" r="9.5" fill="#1d1829" stroke="#9e7f52" stroke-width="1.8"/>
      <circle cx="19" cy="42" r="4.2" fill="#cfa89e"/>
      <path d="M13,49 Q19,45 25,49" fill="#5e3a66"/>
    </svg>`,
  dualAdvantageDice: `
    <svg viewBox="0 0 46 24" width="34" height="18">
      <polygon points="14,3 23,8 23,18 14,23 5,18 5,8" fill="#555869" stroke="#9ea3b8" stroke-width="1.2"/>
      <polygon points="30,2 40,7.5 40,18.5 30,24 20,18.5 20,7.5" fill="#1e8c4c" stroke="#6bf59e" stroke-width="1.4"/>
      <polygon points="30,8 34.5,16 25.5,16" fill="#eafff2"/>
    </svg>`,
};

// ===========================================================================
// SCENARIO PRESETS (Exact Video 1, Exact Video 2, and Free-Play Sandbox)
// ===========================================================================
const PRESETS = {
  video1: {
    id: 'video1',
    lang: 'pt',
    subtitle: 'Teste de Carisma com vantagem',
    dcLabel: 'CLASSE DE<br>DIFICULDADE',
    dcValue: 15,
    rollText: 'Rolar dados',
    rollBadge: '△',
    rollBadgeClass: '',
    addBonusText: 'Adicionar bônus',
    addBonusBadge: '▢',
    continueText: 'Continuar',
    continueBadge: '✕',
    legendLeft: ['L3', 'Personalizar dados'],
    legendRight: ['R3', 'Dicas (não)'],
    skin: 'obsidian',
    advantage: true,
    advLabel: 'Vantagem',
    hasGuidanceInitially: true,
    statCard: { val: '+1', name: 'Carisma', bonus: 1, icon: 'charisma' },
    guidanceCard: { val: '+1d4', name: 'Orientação', rolled: 4, icon: 'guidance' },
    scriptedRoll: { dieLeft: 12, dieRight: 15 },
    mathMemeBug: false,
  },
  video2: {
    id: 'video2',
    lang: 'en',
    subtitle: 'Wisdom check with the jade die',
    dcLabel: 'DIFFICULTY<br>CLASS',
    dcValue: 0,
    rollText: 'Roll Dice',
    rollBadge: 'Y',
    rollBadgeClass: 'xbox-light',
    addBonusText: 'Add Bonus',
    addBonusBadge: 'X',
    continueText: 'Continue',
    continueBadge: 'A',
    legendLeft: ['L', 'Customise Dice'],
    legendRight: ['R', 'Tooltips (Off)'],
    skin: 'emerald',
    advantage: false,
    advLabel: 'Advantage',
    hasGuidanceInitially: true,
    statCard: { val: '+3', name: 'Wisdom', bonus: 3, icon: 'wisdom' },
    guidanceCard: { val: '+1d4', name: 'Guidance', rolled: 2, icon: 'guidance' },
    scriptedRoll: { dieSingle: 1 },
    mathMemeBug: true, // Exact replication of nmK43aOrCX0: lands 1 -> 20 -> +3 = 0 -> +2 = 2 -> SUCCESS!
  },
  freeplay: {
    id: 'freeplay',
    lang: 'pt',
    subtitle: 'Modo livre',
    dcLabel: 'CLASSE DE<br>DIFICULDADE',
    dcValue: 15,
    rollText: 'Rolar dados',
    rollBadge: '△',
    rollBadgeClass: '',
    addBonusText: 'Adicionar bônus (+1d4)',
    addBonusBadge: '▢',
    continueText: 'Rolar novamente',
    continueBadge: '✕',
    legendLeft: ['L3', 'Trocar Skin'],
    legendRight: ['R3', 'Vantagem'],
    skin: 'obsidian',
    advantage: true,
    advLabel: 'Vantagem',
    hasGuidanceInitially: true,
    statCard: { val: '+2', name: 'Carisma', bonus: 2, icon: 'charisma' },
    guidanceCard: { val: '+1d4', name: 'Orientação', rolled: null, icon: 'guidance' },
    scriptedRoll: null,
    mathMemeBug: false,
  },
};

const TIMING = {
  video1: {
    autoRoll: 4.8, guidanceOffer: 2.3, roll: 0.84, select: [0.60, 2.04, 2.40],
    statFlight: 1.87, d4Start: 2.20, guidanceFlight: 2.87,
    rollClicks: [0.075, 0.15, 0.23, 0.42, 0.59, 0.72, 0.78], rollFoley: 0.19,
  },
  video2: {
    autoRoll: 1.75, roll: 1.62, singleHold: 1.30,
    statFlight: 0.58, d4Start: 0.65, guidanceFlight: 1.58,
    rollClicks: [0.08, 0.26, 0.36, 0.58, 0.69, 0.96, 1.08, 1.29, 1.43, 1.52], rollFoley: 1.05,
  },
  freeplay: {
    autoRoll: 0.40, roll: 1.38, singleHold: 0.45, select: [0.38, 0.66, 1.08],
    statFlight: 0.27, d4Start: 0.56, guidanceFlight: 1.18,
    rollClicks: [0.13, 0.29, 0.65, 0.96, 1.18, 1.29],
  },
};
const BONUS_FLIGHT_DURATION = 0.42;
const REPLAY_PATHS = {
  video1: [
    [
      [0, 0.60, -0.11], [0.14, -0.87, -1.50, true], [0.28, -1.13, -0.70],
      [0.46, 0.17, 0.83], [0.65, 0.93, 0.62, true], [0.95, 0.60, -0.10], [1.08, 0.60, -0.11],
    ],
    [
      [0, -0.60, -0.11], [0.12, 0.40, -1.42], [0.24, 0.20, -2.13, true],
      [0.46, -1.10, -1.33, true], [0.75, -0.94, -0.43], [1.08, -0.60, -0.11],
    ],
  ],
  video2: [[
    [0, 0, -0.11], [0.15, -1.10, -1.55], [0.24, -0.93, -1.98, true],
    [0.67, 1.06, -0.06, true], [1.12, -0.18, 1.85, true],
    [1.52, -0.73, 1.13], [1.96, -0.07, -0.10], [2.20, 0, -0.11],
  ]],
};

export function initBG3DiceApp() {
  const stageEl = document.getElementById('bg3-stage');
  const canvas = document.getElementById('bg3-webgl-canvas');

  // HUD DOM References
  const subtitleEl = document.getElementById('hud-subtitle');
  const dcLabelEl = document.getElementById('hud-dc-label');
  const dcValueEl = document.getElementById('hud-dc-value');
  const rollZoneEl = document.getElementById('hud-roll-zone');
  const rollPromptEl = document.getElementById('hud-roll-prompt');
  const rollTextEl = document.getElementById('hud-roll-text');
  const rollBadgeEl = document.getElementById('hud-roll-badge');
  const advTagEl = document.getElementById('hud-adv-tag');
  const advIconSlot = document.getElementById('hud-adv-icon');
  const advLabelEl = document.getElementById('hud-adv-label');
  const verdictBannerEl = document.getElementById('hud-verdict-banner');
  const verdictTextEl = document.getElementById('hud-verdict-text');
  const bonusSectionEl = document.getElementById('hud-bonus-section');
  const totalBonusEl = document.getElementById('hud-total-bonus');
  const cardsRowEl = document.getElementById('hud-cards-row');
  const addBonusBarEl = document.getElementById('hud-add-bonus');
  const addBonusLabelEl = document.getElementById('hud-add-bonus-label');
  const addBonusBadgeEl = document.getElementById('hud-add-bonus-badge');
  const continueBarEl = document.getElementById('hud-continue-bar');
  const continueLabelEl = document.getElementById('hud-continue-label');
  const continueBadgeEl = document.getElementById('hud-continue-badge');
  const btnSkinEl = document.getElementById('btn-customise-dice');
  const btnAdvToggleEl = document.getElementById('btn-toggle-adv');
  const stickLeftEl = document.getElementById('legend-stick-l');
  const textLeftEl = document.getElementById('legend-text-l');
  const stickRightEl = document.getElementById('legend-stick-r');
  const textRightEl = document.getElementById('legend-text-r');
  const flyingBonusEl = document.getElementById('hud-flying-bonus');

  advIconSlot.innerHTML = ICONS.dualAdvantageDice;

  // =========================================================================
  // THREE.JS RENDERER, CAMERA & STUDIO ENVIRONMENT
  // =========================================================================
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  const scene = new THREE.Scene();

  // Exact calibrated camera: fov=34°, Z=17.662, centered at Y=-1.40 -> 10.80 world units tall!
  const BASE_CAM_X = 0;
  const BASE_CAM_Y = -1.40;
  const BASE_CAM_Z = 10.80 / (2 * Math.tan(THREE.MathUtils.degToRad(17)));
  const camera = new THREE.PerspectiveCamera(34, 540 / 920, 0.5, 60);
  camera.position.set(BASE_CAM_X, BASE_CAM_Y, BASE_CAM_Z);
  camera.lookAt(0, BASE_CAM_Y, 0);

  // Procedural Studio Environment Map for crisp metallic & gemstone specular glints
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color('#12101a');
  const envTop = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshBasicMaterial({ color: 0xfff0d4 })
  );
  envTop.position.set(-3, 8, 6);
  envTop.lookAt(0, 0, 0);
  envScene.add(envTop);

  const envRim = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 12),
    new THREE.MeshBasicMaterial({ color: 0x8ea2d6 })
  );
  envRim.position.set(7, 4, 4);
  envRim.lookAt(0, 0, 0);
  envScene.add(envRim);

  const envWarm = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 10),
    new THREE.MeshBasicMaterial({ color: 0xdba458 })
  );
  envWarm.position.set(0, -6, 5);
  envWarm.lookAt(0, 0, 0);
  envScene.add(envWarm);

  scene.environment = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();

  // Studio Lights
  const ambient = new THREE.AmbientLight(0xd8d6e8, 0.85);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xfff4de, 2.25);
  keyLight.position.set(-2.2, 4.2, 6.5);
  scene.add(keyLight);

  const coolFill = new THREE.DirectionalLight(0x9fb2e8, 1.25);
  coolFill.position.set(3.2, 2.0, 4.8);
  scene.add(coolFill);

  const goldRim = new THREE.DirectionalLight(0xf3be6b, 1.05);
  goldRim.position.set(0, -4.2, 3.2);
  scene.add(goldRim);

  const arcanePointLight = new THREE.PointLight(0xffcb63, 0.0, 7.5, 1.6);
  arcanePointLight.position.set(0, TRAY_METRICS.diceRestY, 1.45);
  scene.add(arcanePointLight);

  // =========================================================================
  // SCENE OBJECTS: TRAY, FRAME, COLLIDER, DICE (2x d20 + 1x d4), VFX, AUDIO
  // =========================================================================
  const contourCollider = createContourCollider(360);
  const tray = createBG3TrayAndFrame();
  scene.add(tray.group);

  const diePrimary = createBG3D20('obsidian', TRAY_METRICS.diceRadius);
  const dieSecondary = createBG3D20('obsidian', TRAY_METRICS.diceRadius);
  scene.add(diePrimary.shadowMesh);
  scene.add(dieSecondary.shadowMesh);
  scene.add(diePrimary.group);
  scene.add(dieSecondary.group);

  const guidanceD4 = createGuidanceD4(0.28);
  scene.add(guidanceD4.mesh);

  const vfx = createBG3VFXSystem(contourCollider);
  scene.add(vfx.group);

  const audio = createBG3Audio();
  let settings;
  createSettings(document.getElementById('dice-settings'), (values) => {
    settings = values;
    audio.setLevels(values.volume, values.impacts);
    tray.cosmicUniforms.uFloorOpacity.value = values.floor;
    tray.cosmicUniforms.uBounceGlow.value = values.glow;
  });

  function handleResize() {
    const w = Math.max(280, stageEl.clientWidth || 540);
    const h = Math.max(500, stageEl.clientHeight || 920);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  handleResize();
  window.addEventListener('resize', handleResize);

  // Helper: Convert a DOM element's center into 3D world coordinates on plane z = targetZ
  function domElementToWorld(el, targetZ = 0.25) {
    if (!el) return new THREE.Vector3(0, -3.5, targetZ);
    const stageRect = stageEl.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const ndcX = ((r.left + r.width * 0.5 - stageRect.left) / stageRect.width) * 2 - 1;
    const ndcY = -(((r.top + r.height * 0.5 - stageRect.top) / stageRect.height) * 2 - 1);
    const vec = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(camera);
    const dir = vec.sub(camera.position).normalize();
    const dist = (targetZ - camera.position.z) / dir.z;
    return camera.position.clone().addScaledVector(dir, dist);
  }

  // =========================================================================
  // CHOREOGRAPHY & PHYSICS STATE MACHINE
  // =========================================================================
  let currentPresetKey = 'video1';
  let state = {
    phase: 'ENTRANCE',
    phaseTime: 0,
    speedScale: 1.0,
    skin: 'obsidian',
    advantage: true,
    hasGuidance: false,
    dc: 15,
    statBonus: 1,
    guidanceBonus: 4,
    roll1: 15, // Winning / Primary die roll
    roll2: 12, // Secondary die roll (for Advantage)
    activeFace: 20,
    displayedVal: 20,
    isSuccess: true,
    isCrit: false,
    shakeTime: 0,
    shakeAmp: 0,
    recoilTime: 99,
    recoilAxis: new THREE.Vector3(1, 0.3, 0).normalize(),
    autoRollPending: false,
    autoRollTimer: 0,
  };

  // Physics bodies for primary & secondary d20s during ROLLING
  const phys = [
    {
      die: diePrimary,
      x: 0,
      y: TRAY_METRICS.diceRestY,
      vx: 0,
      vy: 0,
      angVel: new THREE.Vector3(),
      freeQuat: new THREE.Quaternion(),
      targetFace: 20,
      restX: 0,
      restY: TRAY_METRICS.diceRestY,
      lastWallCooldown: 0,
    },
    {
      die: dieSecondary,
      x: 0,
      y: TRAY_METRICS.diceRestY,
      vx: 0,
      vy: 0,
      angVel: new THREE.Vector3(),
      freeQuat: new THREE.Quaternion(),
      targetFace: 12,
      restX: 0,
      restY: TRAY_METRICS.diceRestY,
      lastWallCooldown: 0,
    },
  ];

  // Build Bonus Cards DOM
  let cardStatEl = null;
  let cardGuidanceEl = null;

  function makeCardCuspSVG(bright = false) {
    const stroke = bright ? '#ffe39e' : '#caa56e';
    return `<svg class="bg3-card-cusp" viewBox="0 0 20 10">
      <path d="M1,9 L10,1 L19,9" fill="#181326" stroke="${stroke}" stroke-width="1.8"/>
    </svg>`;
  }

  function rebuildBonusCards(animateGuidanceFlyIn = false) {
    const p = PRESETS[currentPresetKey];
    cardsRowEl.innerHTML = '';

    // 1. Primary Stat Card (Carisma +1 / Wisdom +3)
    cardStatEl = document.createElement('div');
    cardStatEl.className = 'bg3-bonus-card primary-stat';
    cardStatEl.innerHTML = `
      ${makeCardCuspSVG(true)}
      <div class="bg3-card-val">${p.statCard.val}</div>
      <div class="bg3-card-icon">${ICONS[p.statCard.icon]}</div>
      <div class="bg3-card-name">${p.statCard.name}</div>
      <div class="bg3-card-pop-num" id="pop-stat">+${state.statBonus}</div>
    `;
    cardsRowEl.appendChild(cardStatEl);

    // 2. Situational Card (in Advantage mode)
    if (state.advantage) {
      const sitEl = document.createElement('div');
      sitEl.className = 'bg3-bonus-card';
      sitEl.innerHTML = `
        ${makeCardCuspSVG(false)}
        <div style="height:20px;display:flex;align-items:center;">${ICONS.dualAdvantageDice}</div>
        <div class="bg3-card-icon">${ICONS.situational}</div>
        <div class="bg3-card-name emerald">${p.lang === 'pt' ? 'Situacional' : 'Situational'}</div>
      `;
      cardsRowEl.appendChild(sitEl);
    }

    // 3. Guidance / Orientação (+1d4) Card
    if (state.hasGuidance) {
      cardGuidanceEl = document.createElement('div');
      cardGuidanceEl.className =
        'bg3-bonus-card' + (animateGuidanceFlyIn ? ' fly-in' : '');
      cardGuidanceEl.innerHTML = `
        ${makeCardCuspSVG(false)}
        <div class="bg3-card-val" id="guidance-top-val">${p.guidanceCard.val}</div>
        <div class="bg3-card-icon">${ICONS.guidance}</div>
        <div class="bg3-card-name">${p.guidanceCard.name}</div>
        <div class="bg3-card-pop-num" id="pop-guidance">+${state.guidanceBonus}</div>
      `;
      cardsRowEl.appendChild(cardGuidanceEl);
    } else {
      cardGuidanceEl = null;
    }

    // Update Total Bonus header text
    const prefix = p.lang === 'pt' ? 'Bônus total' : 'Total Bonus';
    if (state.hasGuidance) {
      const minB = state.statBonus + 1;
      const maxB = state.statBonus + 4;
      totalBonusEl.textContent = `${prefix}  ${minB}~${maxB}`;
    } else {
      totalBonusEl.textContent = `${prefix}  +${state.statBonus}`;
    }
  }

  function applyPreset(presetKey, autoPlaySequence = false, skipEntranceScale = false) {
    currentPresetKey = presetKey;
    const p = PRESETS[presetKey];

    document.querySelectorAll('[data-preset]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.preset === presetKey);
    });

    state.skin = p.skin;
    state.advantage = p.advantage;
    state.hasGuidance = autoPlaySequence && presetKey === 'video1' ? false : p.hasGuidanceInitially;
    state.dc = p.dcValue;
    state.statBonus = p.statCard.bonus;
    state.guidanceBonus = p.guidanceCard.rolled ?? (1 + Math.floor(Math.random() * 4));

    // Update HUD texts
    subtitleEl.textContent = p.subtitle;
    dcLabelEl.innerHTML = p.dcLabel;
    dcValueEl.textContent = String(state.dc);
    dcValueEl.classList.remove('gold-verdict');

    rollTextEl.textContent = p.rollText;
    rollBadgeEl.textContent = p.rollBadge;
    rollBadgeEl.className = 'bg3-pad-badge ' + p.rollBadgeClass;

    advLabelEl.textContent = p.advLabel;
    addBonusLabelEl.textContent = p.addBonusText;
    addBonusBadgeEl.textContent = p.addBonusBadge;
    addBonusBadgeEl.className = 'bg3-pad-badge ' + p.rollBadgeClass;

    continueLabelEl.textContent = p.continueText;
    continueBadgeEl.textContent = p.continueBadge;
    continueBadgeEl.className = 'bg3-pad-badge ' + p.rollBadgeClass;

    stickLeftEl.textContent = p.legendLeft[0];
    textLeftEl.textContent = p.legendLeft[1];
    stickRightEl.textContent = p.legendRight[0];
    textRightEl.textContent = p.legendRight[1];

    resetToIdleStage(autoPlaySequence, skipEntranceScale);
  }

  function resetToIdleStage(autoPlaySequence = false, skipEntranceScale = false) {
    vfx.reset();
    audio.reset();
    tray.cosmicUniforms.uVerdictGlow.value = 0;
    tray.cosmicUniforms.uImpactFlash.value = 0;
    arcanePointLight.intensity = 0;
    guidanceD4.mesh.visible = false;
    flyingBonusEl.style.opacity = '0';
    state.activeFace = 20;
    state.displayedVal = 20;
    state.isSuccess = false;
    state.isCrit = false;
    state.shakeTime = 0;
    state.recoilTime = 99;
    state.slamExploded = false;

    diePrimary.setSkin(state.skin);
    dieSecondary.setSkin(state.skin);
    diePrimary.clearOverride();
    dieSecondary.clearOverride();
    diePrimary.setOpacity(1);
    dieSecondary.setOpacity(1);
    diePrimary.slamFaceMat.opacity = 0;
    dieSecondary.slamFaceMat.opacity = 0;
    diePrimary.flashMat.opacity = 0;
    dieSecondary.flashMat.opacity = 0;

    const f20 = diePrimary.getFaceByNumber(20);
    diePrimary.mesh.quaternion.copy(f20.targetQuat);
    dieSecondary.mesh.quaternion.copy(f20.targetQuat);

    if (state.advantage) {
      // In Advantage (Video 1), primary is right winning die (+0.60), secondary is left (-0.60)
      diePrimary.group.position.set(TRAY_METRICS.advantageOffsetX, TRAY_METRICS.diceRestY, 0.36);
      dieSecondary.group.position.set(-TRAY_METRICS.advantageOffsetX, TRAY_METRICS.diceRestY, 0.36);
      dieSecondary.group.visible = true;
      dieSecondary.shadowMesh.visible = true;
      advTagEl.classList.remove('hidden');
    } else {
      diePrimary.group.position.set(0, TRAY_METRICS.diceRestY, 0.36);
      dieSecondary.group.visible = false;
      dieSecondary.shadowMesh.visible = false;
      advTagEl.classList.add('hidden');
    }

    const initScale = skipEntranceScale ? 1.0 : 0.78;
    diePrimary.group.scale.setScalar(initScale);
    dieSecondary.group.scale.setScalar(initScale);
    diePrimary.syncShadow();
    dieSecondary.syncShadow();

    dcValueEl.classList.remove('gold-verdict');
    rollPromptEl.classList.remove('hidden');
    bonusSectionEl.classList.remove('hidden');
    totalBonusEl.style.opacity = '1';
    verdictBannerEl.classList.remove('visible', 'failure');
    verdictBannerEl.style.clipPath = 'inset(0 50% 0 50%)';
    continueBarEl.classList.remove('visible');

    rebuildBonusCards(false);

    state.phase = skipEntranceScale ? 'IDLE' : 'ENTRANCE';
    state.phaseTime = 0;
    state.autoRollPending = autoPlaySequence;
    state.autoRollTimer = 0;
  }

  function startDiceRoll() {
    if (state.phase !== 'IDLE' && state.phase !== 'ENTRANCE') return;

    const p = PRESETS[currentPresetKey];
    diePrimary.clearOverride();
    dieSecondary.clearOverride();
    diePrimary.group.scale.setScalar(1);
    dieSecondary.group.scale.setScalar(1);
    diePrimary.flashMat.opacity = 0;
    dieSecondary.flashMat.opacity = 0;
    diePrimary.slamFaceMat.opacity = 0;
    dieSecondary.slamFaceMat.opacity = 0;

    // Determine rolled values
    if (p.scriptedRoll) {
      if (state.advantage) {
        state.roll1 = p.scriptedRoll.dieRight ?? 15;
        state.roll2 = p.scriptedRoll.dieLeft ?? 12;
      } else {
        state.roll1 = p.scriptedRoll.dieSingle ?? p.scriptedRoll.dieRight;
      }
      state.guidanceBonus = p.guidanceCard.rolled ?? 4;
    } else {
      const rA = 1 + Math.floor(Math.random() * 20);
      const rB = 1 + Math.floor(Math.random() * 20);
      state.roll1 = state.advantage ? Math.max(rA, rB) : rA;
      state.roll2 = state.advantage ? Math.min(rA, rB) : rB;
      state.guidanceBonus = 1 + Math.floor(Math.random() * 4);
      const popG = document.getElementById('pop-guidance');
      if (popG) popG.textContent = `+${state.guidanceBonus}`;
    }
    state.activeFace = state.roll1;
    state.autoRollPending = false;

    rollPromptEl.classList.add('hidden');
    advTagEl.classList.add('hidden');
    totalBonusEl.style.opacity = '0';

    // Launch physics trajectories matching exact video wall-hits!
    if (state.advantage) {
      // Video 1: Two dice launch downward/outward, bounce off walls, settle at +0.56 and -0.56
      phys[0].x = TRAY_METRICS.advantageOffsetX;
      phys[0].y = TRAY_METRICS.diceRestY;
      phys[0].vx = -4.2;
      phys[0].vy = -6.8;
      phys[0].angVel.set(17, -19, 13);
      phys[0].freeQuat.copy(diePrimary.mesh.quaternion);
      phys[0].targetFace = state.roll1;
      phys[0].restX = TRAY_METRICS.advantageOffsetX;
      phys[0].restY = TRAY_METRICS.diceRestY;
      phys[0].lastWallCooldown = 0;

      phys[1].x = -TRAY_METRICS.advantageOffsetX;
      phys[1].y = TRAY_METRICS.diceRestY;
      phys[1].vx = -3.4;
      phys[1].vy = 6.9;
      phys[1].angVel.set(-18, 16, -15);
      phys[1].freeQuat.copy(dieSecondary.mesh.quaternion);
      phys[1].targetFace = state.roll2;
      phys[1].restX = -TRAY_METRICS.advantageOffsetX;
      phys[1].restY = TRAY_METRICS.diceRestY;
      phys[1].lastWallCooldown = 0;
    } else {
      // Video 2 exact trajectory: drops bottom-left -> ricochets right wall -> hits top dome arch -> center!
      phys[0].x = 0;
      phys[0].y = TRAY_METRICS.diceRestY;
      phys[0].vx = -4.9;
      phys[0].vy = -6.9;
      phys[0].angVel.set(-20, 18, 15);
      phys[0].freeQuat.copy(diePrimary.mesh.quaternion);
      phys[0].targetFace = state.roll1;
      phys[0].restX = 0;
      phys[0].restY = TRAY_METRICS.diceRestY;
      phys[0].lastWallCooldown = 0;
    }

    for (const body of phys) body.lastReplayImpact = -1;
    state.rollClick = 0;
    const timing = TIMING[currentPresetKey];
    state.customDuration = settings.duration > 0;
    state.rollSpeed = settings.rollSpeed;
    state.rollDuration = settings.duration || timing.roll / settings.rollSpeed;
    state.rollSpin = settings.spin;
    state.rollCycle = 0;
    const contacts = timing.rollClicks;
    const count = Math.round(contacts.length * settings.density);
    state.rollContacts = Array.from({ length: count }, (_, i) => {
      const index = count === 1 ? 0 : i * (contacts.length - 1) / (count - 1);
      const low = Math.floor(index);
      return THREE.MathUtils.lerp(contacts[low], contacts[Math.ceil(index)], index - low);
    });
    state.rollFoleyPlayed = false;
    state.diceInContact = false;
    audio.playBounce(0.9);
    state.phase = 'ROLLING';
    state.phaseTime = 0;
  }

  function triggerShake(amplitude = 0.08, duration = 0.22) {
    state.shakeAmp = amplitude;
    state.shakeTime = duration;
  }

  // =========================================================================
  // USER & REPLAY INTERACTIONS
  // =========================================================================
  rollZoneEl.addEventListener('click', () => {
    if (state.phase === 'IDLE' || state.phase === 'ENTRANCE') {
      state.autoRollPending = false;
      startDiceRoll();
    } else if (state.phase === 'VERDICT') {
      resetToIdleStage(false);
    }
  });

  addBonusBarEl.addEventListener('click', () => {
    if (state.phase !== 'IDLE' && state.phase !== 'ENTRANCE') return;
    state.hasGuidance = !state.hasGuidance;
    rebuildBonusCards(state.hasGuidance);
    audio.playOffer();
  });

  continueBarEl.addEventListener('click', () => {
    resetToIdleStage(false);
  });

  btnSkinEl.addEventListener('click', () => {
    state.skin = state.skin === 'obsidian' ? 'emerald' : 'obsidian';
    diePrimary.setSkin(state.skin);
    dieSecondary.setSkin(state.skin);
  });

  btnAdvToggleEl.addEventListener('click', () => {
    if (state.phase !== 'IDLE' && state.phase !== 'ENTRANCE' && state.phase !== 'VERDICT') return;
    state.advantage = !state.advantage;
    resetToIdleStage(false);
  });

  document.querySelectorAll('[data-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.preset;
      applyPreset(key, key === 'video1' || key === 'video2');
      audio.unlock();
    });
  });

  const btnReplay = document.getElementById('btn-replay-roll');
  if (btnReplay) {
    btnReplay.addEventListener('click', () => {
      applyPreset(currentPresetKey, true);
      audio.unlock();
    });
  }

  const btnMute = document.getElementById('btn-mute');
  btnMute.addEventListener('click', () => {
    const muted = !audio.isMuted();
    audio.setMuted(muted);
    btnMute.setAttribute('aria-pressed', String(!muted));
    btnMute.textContent = muted ? 'Mudo' : 'Som';
  });

  const btnSlowMo = document.getElementById('btn-slowmo');
  if (btnSlowMo) {
    btnSlowMo.addEventListener('click', () => {
      state.speedScale = state.speedScale < 0.9 ? 1.0 : 0.35;
      stageEl.style.setProperty('--animation-stretch', String(1 / state.speedScale));
      btnSlowMo.classList.toggle('active', state.speedScale < 0.9);
      btnSlowMo.textContent = state.speedScale < 0.9 ? '0.35x ON' : '0.35x';
    });
  }

  // =========================================================================
  // MAIN ANIMATION LOOP (60fps Physics + Exact BG3 Multi-Stage Choreography)
  // =========================================================================
  let lastFrameMs = performance.now();
  let totalElapsed = 0;
  const bonusProjection = new THREE.Vector3();

  function launchBonus(card, amount, onArrive) {
    flyingBonusEl.textContent = `+${amount}`;
    const from = domElementToWorld(card, 0.42);
    const to = new THREE.Vector3(0, TRAY_METRICS.diceRestY - 0.27, 0.90);
    vfx.launchBonusComet(from, to, BONUS_FLIGHT_DURATION, (x, y, z, progress) => {
      audio.updateMotion('bonus', progress);
      bonusProjection.set(x, y, z).project(camera);
      flyingBonusEl.style.left = `${(bonusProjection.x + 1) * 50}%`;
      flyingBonusEl.style.top = `${(1 - bonusProjection.y) * 50}%`;
      flyingBonusEl.style.opacity = String(Math.min(1, progress * 8, (1 - progress) * 6));
    }, () => {
      audio.stopMotion();
      flyingBonusEl.style.opacity = '0';
      card.classList.remove('activating');
      card.classList.add('spent');
      card.querySelector('.bg3-card-pop-num').classList.remove('show');
      onArrive();
    });
  }

  function startTally() {
    state.phase = 'TALLY';
    state.phaseTime = 0;
    state.statLaunched = false;
    state.guidanceLaunched = false;
    state.d4Started = false;
    state.d4Popped = false;
    cardStatEl.classList.add('activating');
  }

  function beginVerdict() {
    state.isSuccess = state.isCrit ? state.roll1 === 20 : state.displayedVal >= state.dc;
    bonusSectionEl.classList.add('hidden');
    guidanceD4.mesh.visible = false;
    diePrimary.group.scale.setScalar(1);
    state.recoilTime = 99;
    state.phase = 'PRE_SLAM';
    state.phaseTime = 0;
  }

  function settleForTally() {
    state.isCrit = !PRESETS[currentPresetKey].mathMemeBug && (state.roll1 === 20 || state.roll1 === 1);
    if (state.isCrit) beginVerdict();
    else startTally();
  }

  function updateTally(timing) {
    const time = state.phaseTime;
    const wraps = PRESETS[currentPresetKey].mathMemeBug && state.roll1 === 1;
    const statImpact = timing.statFlight + BONUS_FLIGHT_DURATION;
    const guidanceImpact = timing.guidanceFlight + BONUS_FLIGHT_DURATION;
    const end = state.hasGuidance ? guidanceImpact : statImpact;

    if (time >= timing.statFlight && !state.statLaunched) {
      state.statLaunched = true;
      cardStatEl.querySelector('.bg3-card-pop-num').classList.remove('show');
      launchBonus(cardStatEl, state.statBonus, () => {
        state.displayedVal = wraps ? 0 : state.roll1 + state.statBonus;
        applyBonusHit(0);
      });
    } else if (!state.statLaunched && time >= timing.statFlight - 0.32) {
      cardStatEl.querySelector('.bg3-card-pop-num').classList.add('show');
    }

    if (state.hasGuidance && time >= timing.d4Start) {
      if (!state.d4Started) {
        state.d4Started = true;
        audio.playGuidance();
      }
      const d4Time = time - timing.d4Start;
      const reveal = Math.min(timing.guidanceFlight - 0.12, timing.d4Start + 0.47);
      const tumble = Math.min(1, d4Time / (reveal - timing.d4Start));
      const cardWorld = domElementToWorld(cardGuidanceEl, 0.42);
      guidanceD4.mesh.visible = time < timing.guidanceFlight;
      guidanceD4.mat.opacity = THREE.MathUtils.clamp(Math.min(d4Time * 9, (timing.guidanceFlight - time) * 12), 0, 1);
      guidanceD4.mesh.position.set(cardWorld.x, cardWorld.y + 0.48 + Math.sin(tumble * Math.PI) * 0.22, 0.48);
      guidanceD4.mesh.rotation.set(tumble * 7.5, tumble * 8.6, tumble * 3.2);
      const lock = Math.max(0, (tumble - 0.73) / 0.27);
      guidanceD4.mesh.quaternion.slerp(guidanceD4.getResultPose(state.guidanceBonus), lock);

      if (time >= reveal && !state.d4Popped) {
        state.d4Popped = true;
        cardGuidanceEl.classList.add('activating');
        cardGuidanceEl.querySelector('.bg3-card-pop-num').classList.add('show');
      }
      if (time >= timing.guidanceFlight && !state.guidanceLaunched) {
        state.guidanceLaunched = true;
        cardGuidanceEl.querySelector('.bg3-card-pop-num').classList.remove('show');
        launchBonus(cardGuidanceEl, state.guidanceBonus, () => {
          state.displayedVal += state.guidanceBonus;
          applyBonusHit(1);
        });
      }
    }

    if (time >= end - 0.12 && currentPresetKey === 'video2') {
      bonusSectionEl.classList.add('hidden');
    }
    if (time >= end + 0.08) beginVerdict();
  }

  function applyBonusHit(index) {
    diePrimary.setActiveFaceOverride(state.activeFace, String(state.displayedVal), true);
    vfx.triggerArcaneRing(0, TRAY_METRICS.diceRestY, index === 0 ? 1.0 : 1.15);
    arcanePointLight.intensity = index === 0 ? 2.6 : 3.2;
    audio.playBonusHit(index);
    state.recoilTime = 0;
  }

  function stepReplayDie(body, path, time, motionTime, settling) {
    const nextIndex = path.findIndex(([at]) => at >= time);
    const segment = nextIndex < 0 ? path.length - 1 : Math.max(1, nextIndex);
    const [fromTime, fromX, fromY] = path[segment - 1];
    const [toTime, toX, toY] = path[segment];
    const portion = THREE.MathUtils.clamp((time - fromTime) / (toTime - fromTime), 0, 1);
    const motion = segment === path.length - 1 ? 1 - (1 - portion) ** 2 : portion;
    body.x = THREE.MathUtils.lerp(fromX, toX, motion);
    body.y = THREE.MathUtils.lerp(fromY, toY, motion);
    const wall = contourCollider.findClosestWall(body.x, body.y);
    const clearance = (body.x - wall.pos.x) * wall.normal.x + (body.y - wall.pos.y) * wall.normal.y;
    const correction = Math.max(0, TRAY_METRICS.diceRadius * 0.89 - clearance);
    body.x += wall.normal.x * correction;
    body.y += wall.normal.y * correction;
    const waypoint = state.rollCycle % 2 === 0 ? segment - 1 : segment;
    const [, impactX, impactY, bounced] = path[waypoint];
    if (bounced && waypoint !== body.lastReplayImpact && settling < 0.35) {
      body.lastReplayImpact = waypoint;
      const hit = contourCollider.findClosestWall(impactX, impactY);
      flashWall(hit.s, 0.82);
    }

    const spin = motionTime * 1.23 * state.rollSpin;
    const sign = body === phys[0] ? 1 : -1;
    body.die.mesh.rotation.set(sign * spin * 18, spin * -20, sign * spin * 14);
    body.die.mesh.quaternion.multiply(body.freeQuat);
    const lock = settling * settling * (3 - 2 * settling);
    body.die.mesh.quaternion.slerp(body.die.getFaceByNumber(body.targetFace).targetQuat, lock);
    if (state.customDuration) {
      body.x = THREE.MathUtils.lerp(body.x, body.restX, lock);
      body.y = THREE.MathUtils.lerp(body.y, body.restY, lock);
    }
    const hop = Math.sin(time / path.at(-1)[0] * Math.PI) * 0.26 * (1 - lock);
    body.die.group.position.set(body.x, body.y, 0.36 + hop);
    body.die.syncShadow();
  }

  function flashWall(contourPosition, speed) {
    const point = vfx.triggerWallImpact(contourPosition, speed);
    tray.cosmicUniforms.uImpactPos.value.copy(point);
    tray.cosmicUniforms.uImpactFlash.value = 1;
    audio.playBounce(speed, true);
    triggerShake(0.032 * speed, 0.10);
  }

  function stepDiePhysics(body, dt, rollProgress) {
    body.lastWallCooldown = Math.max(0, body.lastWallCooldown - dt);

    if (rollProgress < 0.72) {
      // Free high-energy ballistic bounce inside the exact curved BG3 Gothic walls!
      body.x += body.vx * dt;
      body.y += body.vy * dt;

      // Subtle central swirl/gravity keeping bounces lively across all walls
      body.vy -= 1.2 * dt;

      const hit = contourCollider.findClosestWall(body.x, body.y);
      // Since contour is closed around (0,0), check if die center is within radius of boundary
      const vecFromWallX = body.x - hit.pos.x;
      const vecFromWallY = body.y - hit.pos.y;
      const signedInward = vecFromWallX * hit.normal.x + vecFromWallY * hit.normal.y;
      const minClearance = TRAY_METRICS.diceRadius * 0.92;

      if (signedInward < minClearance) {
        // Push back inside along exact inward wall normal
        const pen = minClearance - signedInward;
        body.x += hit.normal.x * pen;
        body.y += hit.normal.y * pen;

        const vn = body.vx * hit.normal.x + body.vy * hit.normal.y;
        if (vn < 0) {
          const restitution = 0.88;
          body.vx -= (1 + restitution) * vn * hit.normal.x;
          body.vy -= (1 + restitution) * vn * hit.normal.y;
          // Add slight tangential kick so it ricochets across domes like BG3!
          body.vx += hit.tangent.x * 0.85;
          body.vy += hit.tangent.y * 0.85;

          // Spin deflection on bounce
          body.angVel.x = -body.angVel.x * 0.65 + (Math.random() - 0.5) * 14;
          body.angVel.y = -body.angVel.y * 0.65 + (Math.random() - 0.5) * 14;

          if (body.lastWallCooldown <= 0) {
            const spd = Math.hypot(body.vx, body.vy) / 7.5;
            flashWall(hit.s, spd);
            body.lastWallCooldown = 0.11;
          }
        }
      }

      // Integrate 3D angular velocity
      const wLen = body.angVel.length();
      if (wLen > 0.001) {
        const dq = new THREE.Quaternion().setFromAxisAngle(
          body.angVel.clone().divideScalar(wLen),
          wLen * dt
        );
        body.freeQuat.premultiply(dq).normalize();
      }
      body.die.mesh.quaternion.copy(body.freeQuat);
    } else {
      // Final 28% (homing & crisp rotational lock onto exact target Chessex face!)
      const u = (rollProgress - 0.72) / 0.28;
      const ease = 1 - Math.pow(1 - u, 3);

      body.x = THREE.MathUtils.lerp(body.x, body.restX, Math.min(1, dt * 11));
      body.y = THREE.MathUtils.lerp(body.y, body.restY, Math.min(1, dt * 11));

      // Keep slight diminishing spin in freeQuat then slerp into exact face quaternion
      const wLen = body.angVel.length() * (1 - u);
      if (wLen > 0.01) {
        const dq = new THREE.Quaternion().setFromAxisAngle(
          body.angVel.clone().normalize(),
          wLen * dt
        );
        body.freeQuat.premultiply(dq).normalize();
      }
      const targetQ = body.die.getFaceByNumber(body.targetFace).targetQuat;
      body.die.mesh.quaternion.copy(body.freeQuat).slerp(targetQ, ease);
    }

    // Subtle Z hop during fast motion
    const zHop = Math.sin(Math.min(1, rollProgress) * Math.PI) * 0.22;
    body.die.group.position.set(body.x, body.y, 0.36 + zHop);
    body.die.syncShadow();
  }

  function animate() {
    requestAnimationFrame(animate);

    const nowMs = performance.now();
    const rawDt = Math.min(Math.max(0.0005, (nowMs - lastFrameMs) * 0.001), 0.05);
    lastFrameMs = nowMs;
    const dt = rawDt * state.speedScale;
    totalElapsed += dt;
    state.phaseTime += dt;

    tray.cosmicUniforms.uTime.value = totalElapsed;
    tray.cosmicUniforms.uImpactFlash.value = Math.max(
      0,
      tray.cosmicUniforms.uImpactFlash.value - dt * 3.2
    );

    const p = PRESETS[currentPresetKey];
    const timing = TIMING[currentPresetKey];

    // -----------------------------------------------------------------------
    // PHASE 1: ENTRANCE (0.0s -> 1.05s: Scale-in + Specular Facet Flash at 0.72s!)
    // -----------------------------------------------------------------------
    if (state.phase === 'ENTRANCE') {
      const u = Math.min(1, state.phaseTime / 0.55);
      const backOut = 1 + 1.8 * Math.pow(u - 1, 3) + 0.8 * Math.pow(u - 1, 2);
      const scl = THREE.MathUtils.lerp(0.72, 1.0, Math.min(1.06, backOut));
      diePrimary.group.scale.setScalar(scl);
      dieSecondary.group.scale.setScalar(scl);

      // Specular white-silver facet flash seen at ~0.75s in both reference videos!
      const flashBell = Math.exp(-Math.pow((state.phaseTime - 0.68) / 0.14, 2));
      diePrimary.flashMat.opacity = flashBell * 0.46;
      dieSecondary.flashMat.opacity = flashBell * 0.46;

      diePrimary.syncShadow();
      dieSecondary.syncShadow();

      if (state.phaseTime >= 1.0) {
        diePrimary.flashMat.opacity = 0;
        dieSecondary.flashMat.opacity = 0;
        diePrimary.group.scale.setScalar(1);
        dieSecondary.group.scale.setScalar(1);
        state.phase = 'IDLE';
        state.phaseTime = 0;
      }
    }

    // -----------------------------------------------------------------------
    // PHASE 2: IDLE (Subtle breathing + Optional Scripted Video Auto-Replay)
    // -----------------------------------------------------------------------
    else if (state.phase === 'IDLE') {
      const breathe = Math.sin(totalElapsed * 2.1) * 0.012;
      diePrimary.group.position.z = 0.36 + breathe;
      dieSecondary.group.position.z = 0.36 + breathe;
      diePrimary.syncShadow();
      dieSecondary.syncShadow();

      if (state.autoRollPending) {
        state.autoRollTimer += dt;
        if (timing.guidanceOffer && !state.hasGuidance && state.autoRollTimer >= timing.guidanceOffer) {
          state.hasGuidance = true;
          rebuildBonusCards(true);
          audio.playOffer();
        }
        if (state.autoRollTimer >= timing.autoRoll) {
          state.autoRollPending = false;
          startDiceRoll();
        }
      }
    }

    // -----------------------------------------------------------------------
    // PHASE 3: ROLLING (Ballistic wall-bounce + golden crackling contour sparks)
    // -----------------------------------------------------------------------
    else if (state.phase === 'ROLLING') {
      const elapsed = Math.min(state.phaseTime, state.rollDuration);
      const motionTime = elapsed * state.rollSpeed;
      const settlingTime = Math.min(timing.roll * 0.27 / state.rollSpeed, state.rollDuration * 0.45);
      const settling = 1 - Math.min(1, (state.rollDuration - elapsed) / settlingTime);
      const cycle = Math.floor(Math.max(0, motionTime - 0.000001) / timing.roll);
      const cueTime = motionTime - cycle * timing.roll;
      if (cycle !== state.rollCycle) {
        state.rollCycle = cycle;
        state.rollClick = 0;
        state.rollFoleyPlayed = false;
        for (const body of phys) body.lastReplayImpact = -1;
      }
      const pathProgress = cycle % 2 === 0 ? cueTime / timing.roll : 1 - cueTime / timing.roll;
      const paths = REPLAY_PATHS[currentPresetKey];
      const bodyCount = state.advantage ? 2 : 1;
      const scriptedPath = paths?.length === bodyCount;
      const clickTime = state.rollContacts[state.rollClick];
      if (clickTime != null && cueTime >= clickTime) {
        state.rollClick++;
        if (settling < 0.85) audio.playBounce(0.64 * (1 - settling * 0.68));
      }
      if (scriptedPath && !state.rollFoleyPlayed && cueTime >= timing.rollFoley) {
        state.rollFoleyPlayed = true;
        audio.playRoll(state.advantage);
      }

      for (let i = 0; i < bodyCount; i++) {
        if (scriptedPath) {
          const path = paths[i];
          stepReplayDie(phys[i], path, pathProgress * path.at(-1)[0], motionTime * path.at(-1)[0] / timing.roll, settling);
        }
        else {
          const physicsProgress = settling > 0 ? 0.72 + settling * 0.28 : Math.min(0.719, cueTime / timing.roll);
          stepDiePhysics(phys[i], dt * state.rollSpeed, physicsProgress);
        }
      }

      if (state.advantage) {
        const distance = Math.hypot(phys[0].x - phys[1].x, phys[0].y - phys[1].y);
        const touching = distance < TRAY_METRICS.diceRadius * 1.76;
        if (touching && !state.diceInContact) audio.playDiceContact();
        if (touching || distance > TRAY_METRICS.diceRadius * 1.95) state.diceInContact = touching;
      }

      if (elapsed >= state.rollDuration) {
        // Snap cleanly onto target face
        diePrimary.mesh.quaternion.copy(diePrimary.getFaceByNumber(state.activeFace).targetQuat);
        diePrimary.group.position.set(phys[0].restX, phys[0].restY, 0.36);
        diePrimary.syncShadow();

        if (state.advantage) {
          dieSecondary.mesh.quaternion.copy(dieSecondary.getFaceByNumber(state.roll2).targetQuat);
          dieSecondary.group.position.set(phys[1].restX, phys[1].restY, 0.36);
          dieSecondary.syncShadow();
          vfx.triggerArcaneRing(phys[0].restX, phys[0].restY, 0.85);
          audio.playSettle();
          state.displayedVal = state.roll1;
          state.phase = 'ADV_SELECT';
          state.phaseTime = 0;
        } else {
          vfx.triggerArcaneRing(0, TRAY_METRICS.diceRestY, 1.05);
          audio.playSettle();
          state.displayedVal = state.roll1;
          state.phase = 'SINGLE_SETTLE_PAUSE';
          state.phaseTime = 0;
        }
      }
    }

    // -----------------------------------------------------------------------
    // PHASE 3B: ADVANTAGE SELECTION (Pause side-by-side -> Discard low, Center winner!)
    // -----------------------------------------------------------------------
    else if (state.phase === 'ADV_SELECT') {
      const [pulseStart, slideStart, slideEnd] = timing.select ?? TIMING.freeplay.select;
      const time = state.phaseTime;
      const pulse = THREE.MathUtils.clamp((time - pulseStart) / (slideStart - pulseStart), 0, 1);
      const slide = THREE.MathUtils.clamp((time - slideStart) / (slideEnd - slideStart), 0, 1);
      const smooth = slide * slide * (3 - 2 * slide);
      diePrimary.group.scale.setScalar(1 + Math.sin(pulse * Math.PI) * 0.16);
      diePrimary.group.position.x = THREE.MathUtils.lerp(TRAY_METRICS.advantageOffsetX, 0, smooth);
      diePrimary.syncShadow();
      dieSecondary.group.scale.setScalar(1 - 0.40 * smooth);
      dieSecondary.group.position.x = THREE.MathUtils.lerp(-TRAY_METRICS.advantageOffsetX, -0.82, smooth);
      dieSecondary.setOpacity(1 - smooth);
      dieSecondary.syncShadow();

      if (slide >= 1) {
        dieSecondary.group.visible = false;
        dieSecondary.shadowMesh.visible = false;
        vfx.triggerArcaneRing(0, TRAY_METRICS.diceRestY, 1.1);
        audio.playOffer();
        settleForTally();
      }
    }

    else if (state.phase === 'SINGLE_SETTLE_PAUSE') {
      if (state.phaseTime >= (timing.singleHold ?? TIMING.freeplay.singleHold)) {
        if (p.mathMemeBug && state.roll1 === 1) {
          state.activeFace = 20;
          state.displayedVal = 20;
          diePrimary.mesh.quaternion.copy(diePrimary.getFaceByNumber(state.activeFace).targetQuat);
          diePrimary.syncShadow();
        }
        settleForTally();
      }
    }

    else if (state.phase === 'TALLY') {
      updateTally(timing);
    }

    // -----------------------------------------------------------------------
    // PHASE 6: PRE-SLAM REAR-BACK ZOOM (Exact match to frame_0044 & frame_0029!)
    // -----------------------------------------------------------------------
    else if (state.phase === 'PRE_SLAM') {
      const dur = 0.42;
      const u = Math.min(1, state.phaseTime / dur);
      const easeOut = 1 - Math.pow(1 - u, 2.4);
      audio.updateMotion('verdict', u);

      // Pull die toward camera in +Z so perspective scales it to ~1.48x!
      diePrimary.group.position.z = THREE.MathUtils.lerp(0.36, 5.75, easeOut);
      diePrimary.group.position.y = THREE.MathUtils.lerp(TRAY_METRICS.diceRestY, -0.32, easeOut);
      // Subtle dramatic anticipation tilt
      const baseQ = diePrimary.getFaceByNumber(state.activeFace).targetQuat;
      const tiltQ = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(THREE.MathUtils.degToRad(-5 * easeOut), THREE.MathUtils.degToRad(4 * easeOut), 0)
      );
      diePrimary.mesh.quaternion.copy(baseQ).premultiply(tiltQ);
      diePrimary.syncShadow();

      vfx.spawnParticle({
        x: (Math.random() - 0.5) * 0.48,
        y: -0.25 + (Math.random() - 0.5) * 0.48,
        z: diePrimary.group.position.z + 0.35,
        vx: (Math.random() - 0.5) * 0.6,
        vy: (Math.random() - 0.5) * 0.6,
        life: 0.22,
        size: 0.16,
        r: 1.0,
        g: 0.82,
        b: 0.32,
      });

      if (u >= 1) {
        state.phase = 'SLAM';
        state.phaseTime = 0;
        state.bannerTriggered = false;
      }
    }

    // -----------------------------------------------------------------------
    // PHASE 7: THE SLAM & BANNER FLAME WAVE (frame_0045 -> 0047 & frame_0031 -> 0033!)
    // -----------------------------------------------------------------------
    else if (state.phase === 'SLAM') {
      const slamDur = 0.13;
      const u = Math.min(1, state.phaseTime / slamDur);
      const slamIn = u * u * u;

      diePrimary.group.position.z = THREE.MathUtils.lerp(5.75, 0.36, slamIn);
      diePrimary.group.position.y = THREE.MathUtils.lerp(-0.32, TRAY_METRICS.diceRestY, slamIn);
      const tiltQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(
        THREE.MathUtils.degToRad(-5 * (1 - slamIn)), THREE.MathUtils.degToRad(4 * (1 - slamIn)), 0
      ));
      diePrimary.mesh.quaternion.copy(diePrimary.getFaceByNumber(state.activeFace).targetQuat).premultiply(tiltQ);
      diePrimary.syncShadow();

      if (u >= 1 && !state.slamExploded) {
        state.slamExploded = true;
        diePrimary.slamFaceMat.opacity = 0.94;
        diePrimary.flashMat.opacity = 0.32;
        arcanePointLight.intensity = 4.6;
        tray.cosmicUniforms.uVerdictGlow.value = state.isSuccess ? 1.0 : 0.3;
        vfx.triggerVerdictSlam(state.isSuccess);
        audio.playImpact();
        triggerShake(0.11, 0.28);
      }

      if (state.phaseTime >= slamDur + 0.27 && !state.bannerTriggered) {
        state.bannerTriggered = true;
        dcValueEl.classList.add('gold-verdict');
        vfx.triggerPreSlamTendrils(state.isSuccess);
        vfx.triggerBannerFlameWave(state.isSuccess);
        audio.playVerdict(state.isSuccess);

        let verdictWord;
        if (p.lang === 'pt') {
          verdictWord = state.isSuccess
            ? (state.isCrit ? 'SUCESSO CRÍTICO' : 'SUCESSO')
            : (state.isCrit ? 'FALHA CRÍTICA' : 'FALHA');
        } else {
          verdictWord = state.isSuccess
            ? (state.isCrit ? 'CRITICAL SUCCESS' : 'SUCCESS')
            : (state.isCrit ? 'CRITICAL FAILURE' : 'FAILURE');
        }
        verdictTextEl.textContent = verdictWord;
        verdictBannerEl.classList.toggle('failure', !state.isSuccess);
        verdictBannerEl.classList.add('visible');
      }

      if (state.phaseTime >= slamDur + (currentPresetKey === 'video2' ? 0.82 : 0.65)) {
        state.slamExploded = false;
        continueBarEl.classList.add('visible');
        state.phase = 'VERDICT';
        state.phaseTime = 0;
      }
    }

    // Center-outward SUCESSO / SUCCESS wipe synchronized with the horizontal flame wave!
    if (verdictBannerEl.classList.contains('visible')) {
      const insetPct = (1 - vfx.getBannerReveal()) * 50;
      verdictBannerEl.style.clipPath = `inset(0 ${insetPct.toFixed(1)}% 0 ${insetPct.toFixed(1)}%)`;
    }

    // -----------------------------------------------------------------------
    // GLOBAL SPRINGS: Bonus Hit 3D Recoil, Light Decay, Camera Micro-Shake
    // -----------------------------------------------------------------------
    if (state.recoilTime < 0.42) {
      state.recoilTime += dt;
      const rT = Math.min(1, state.recoilTime / 0.42);
      const angle = Math.sin(rT * Math.PI * 3.0) * Math.exp(-rT * 5.5) * 0.24;
      const baseQ = diePrimary.getFaceByNumber(state.activeFace).targetQuat;
      const rq = new THREE.Quaternion().setFromAxisAngle(state.recoilAxis, angle);
      diePrimary.mesh.quaternion.copy(baseQ).premultiply(rq);
      const scaleBump = 1 + Math.sin(Math.min(1, rT * 4) * Math.PI) * 0.08 * (1 - rT);
      diePrimary.group.scale.setScalar(scaleBump);
    }

    diePrimary.flashMat.opacity = Math.max(0, diePrimary.flashMat.opacity - dt * 2.8);
    diePrimary.slamFaceMat.opacity = Math.max(0, diePrimary.slamFaceMat.opacity - dt * 4.2);
    arcanePointLight.intensity = Math.max(0, arcanePointLight.intensity - dt * 3.6);

    if (state.shakeTime > 0) {
      state.shakeTime = Math.max(0, state.shakeTime - dt);
      const mag = state.shakeAmp * (state.shakeTime / 0.25);
      camera.position.x = BASE_CAM_X + (Math.random() - 0.5) * mag;
      camera.position.y = BASE_CAM_Y + (Math.random() - 0.5) * mag;
    } else {
      camera.position.x = BASE_CAM_X;
      camera.position.y = BASE_CAM_Y;
    }
    camera.updateMatrixWorld();

    vfx.update(dt, totalElapsed);
    renderer.render(scene, camera);
  }

  // Initialize with Video 1 preset ready & gleaming!
  applyPreset('video1', false, true);
  animate();

  // Expose controller API for inspection/testing
  window.bg3Controller = {
    applyPreset,
    startDiceRoll,
    resetToIdleStage,
    getState: () => state,
  };
}

initBG3DiceApp();
