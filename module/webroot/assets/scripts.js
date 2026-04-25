/* Pixel Tester WebUI — enhanced phase 2 build */
(function () {
  'use strict';

  const MODID = 'pixeltester';
  const MODDIR = '/data/adb/modules/' + MODID;
  const CONFIG_PATH = MODDIR + '/device.conf';
  const CUSTOM_CONFIG = '/data/adb/pixeltester.conf';

  const STORAGE_PRESETS = 'pixeltester.userPresets.v2';
  const STORAGE_LAST_SAVED = 'pixeltester.lastSaved.v2';
  const STORAGE_DRAFT = 'pixeltester.draft.v2';
  const STORAGE_UI = 'pixeltester.ui.v2';
  const STORAGE_VALIDATION = 'pixeltester.validationEnabled.v2';

  const RELEASE_TO_SDK = {
    '14': '34',
    '15': '35',
    '16': '36',
    '17': '37'
  };

  const QUICK_ADD_PACKAGES = [
    'com.google.android.gms',
    'com.google.android.gms.unstable',
    'com.android.vending',
    'com.google.android.gsf'
  ];

  const UNSAFE_EXACT = new Set([
    'system',
    'system_server',
    'zygote',
    'zygote64',
    'com.android.systemui',
    'com.android.phone',
    'com.android.bluetooth',
    'com.android.nfc',
    'com.android.launcher3',
    'com.google.android.apps.nexuslauncher',
    'com.android.providers.media.module',
    'com.google.android.setupwizard',
    'com.android.permissioncontroller'
  ]);

  const UNSAFE_PARTIAL = [
    '.launcher',
    'launcher',
    'inputmethod',
    'wallpaper',
    'telephony',
    'ims',
    'bluetooth',
    'nfc'
  ];

  function makePreset(opts) {
    const buildId = 'CP21.260330.008';
    const common = {
      brand: 'google',
      manufacturer: 'Google',
      buildId,
      buildDisplayId: buildId,
      buildIncremental: buildId,
      buildRelease: '17',
      buildSdk: '37',
      securityPatch: '2026-04-05',
      buildCharacteristics: 'nosdcard',
      bootloader: '',
      baseband: ''
    };
    const productName = opts.productName || opts.deviceCode;
    return {
      name: opts.name,
      brand: common.brand,
      manufacturer: common.manufacturer,
      model: opts.model,
      productName,
      deviceCode: opts.deviceCode,
      board: opts.board || opts.deviceCode,
      hardware: opts.hardware || opts.deviceCode,
      boardPlatform: opts.boardPlatform,
      buildFingerprint: `google/${productName}/${opts.deviceCode}:17/${buildId}/${buildId}:user/release-keys`,
      buildId: common.buildId,
      buildDisplayId: common.buildDisplayId,
      buildIncremental: common.buildIncremental,
      buildRelease: common.buildRelease,
      buildSdk: common.buildSdk,
      securityPatch: common.securityPatch,
      buildDescription: `${opts.deviceCode}-user 17 ${buildId} release-keys`,
      buildFlavor: `${opts.deviceCode}-user`,
      buildProduct: productName,
      buildCharacteristics: common.buildCharacteristics,
      screenWidth: String(opts.screenWidth),
      screenHeight: String(opts.screenHeight),
      screenDensity: String(opts.screenDensity),
      socModel: opts.socModel,
      socManufacturer: opts.socManufacturer || 'Google',
      bootloader: opts.bootloader || common.bootloader,
      baseband: opts.baseband || common.baseband
    };
  }

  const PIXEL_DEVICES = {
    pixel6: makePreset({ name: 'Pixel 6', model: 'Pixel 6', deviceCode: 'oriole', boardPlatform: 'gs101', screenWidth: 1080, screenHeight: 2400, screenDensity: 411, socModel: 'Google Tensor' }),
    pixel6pro: makePreset({ name: 'Pixel 6 Pro', model: 'Pixel 6 Pro', deviceCode: 'raven', boardPlatform: 'gs101', screenWidth: 1440, screenHeight: 3120, screenDensity: 512, socModel: 'Google Tensor' }),
    pixel7: makePreset({ name: 'Pixel 7', model: 'Pixel 7', deviceCode: 'panther', boardPlatform: 'gs201', screenWidth: 1080, screenHeight: 2400, screenDensity: 416, socModel: 'Google Tensor G2' }),
    pixel7pro: makePreset({ name: 'Pixel 7 Pro', model: 'Pixel 7 Pro', deviceCode: 'cheetah', boardPlatform: 'gs201', screenWidth: 1440, screenHeight: 3120, screenDensity: 512, socModel: 'Google Tensor G2' }),
    pixel7a: makePreset({ name: 'Pixel 7a', model: 'Pixel 7a', deviceCode: 'lynx', boardPlatform: 'gs201', screenWidth: 1080, screenHeight: 2400, screenDensity: 429, socModel: 'Google Tensor G2' }),
    pixel8: makePreset({ name: 'Pixel 8', model: 'Pixel 8', deviceCode: 'shiba', boardPlatform: 'zuma', screenWidth: 1080, screenHeight: 2400, screenDensity: 421, socModel: 'Google Tensor G3' }),
    pixel8pro: makePreset({ name: 'Pixel 8 Pro', model: 'Pixel 8 Pro', deviceCode: 'husky', boardPlatform: 'zuma', screenWidth: 1344, screenHeight: 2992, screenDensity: 489, socModel: 'Google Tensor G3' }),
    pixel8a: makePreset({ name: 'Pixel 8a', model: 'Pixel 8a', deviceCode: 'akita', boardPlatform: 'zuma', screenWidth: 1080, screenHeight: 2400, screenDensity: 430, socModel: 'Google Tensor G3' }),
    pixel9: makePreset({ name: 'Pixel 9', model: 'Pixel 9', deviceCode: 'tokay', boardPlatform: 'zumapro', screenWidth: 1080, screenHeight: 2424, screenDensity: 422, socModel: 'Google Tensor G4' }),
    pixel9pro: makePreset({ name: 'Pixel 9 Pro', model: 'Pixel 9 Pro', deviceCode: 'caiman', boardPlatform: 'zumapro', screenWidth: 1280, screenHeight: 2856, screenDensity: 495, socModel: 'Google Tensor G4' }),
    pixel9proxl: makePreset({ name: 'Pixel 9 Pro XL', model: 'Pixel 9 Pro XL', deviceCode: 'komodo', boardPlatform: 'zumapro', screenWidth: 1344, screenHeight: 2992, screenDensity: 486, socModel: 'Google Tensor G4' }),
    pixel9a: makePreset({ name: 'Pixel 9a', model: 'Pixel 9a', deviceCode: 'tegu', boardPlatform: 'zumapro', screenWidth: 1080, screenHeight: 2424, screenDensity: 422, socModel: 'Google Tensor G4' })
  };

  const DEVICE_KEYS = [
    'brand', 'manufacturer', 'model', 'productName', 'deviceCode', 'board', 'hardware',
    'boardPlatform', 'buildFingerprint', 'buildId', 'buildDisplayId', 'buildIncremental',
    'buildRelease', 'buildSdk', 'securityPatch', 'buildDescription', 'buildFlavor',
    'buildProduct', 'buildCharacteristics', 'screenWidth', 'screenHeight', 'screenDensity',
    'socModel', 'socManufacturer', 'bootloader', 'baseband',
    // identity & network spoofing (phase 2)
    'serialNumber', 'androidId', 'gsfId', 'drmId',
    'imei', 'meid', 'phoneNumber',
    'simOperator', 'networkOperator', 'carrierName', 'simOperatorName',
    'simCountryIso', 'networkCountryIso',
    'wifiMac', 'wifiSsid', 'wifiBssid'
  ];

  // Identity-only fields (rendered in the dedicated section, NOT touched by Pixel presets)
  const IDENTITY_KEYS = new Set([
    'serialNumber', 'androidId', 'gsfId', 'drmId',
    'imei', 'meid', 'phoneNumber',
    'simOperator', 'networkOperator', 'carrierName', 'simOperatorName',
    'simCountryIso', 'networkCountryIso',
    'wifiMac', 'wifiSsid', 'wifiBssid'
  ]);

  const TOGGLE_KEYS = [
    'spoofDevice', 'hookBuildProperties', 'hookSystemProperties',
    'hookVendorProperties', 'hookOdmProperties', 'hookProductProperties', 'hookDebugProperties',
    // identity hook toggles
    'hookSerial', 'hookAndroidId', 'hookGsfId', 'hookDrmId',
    'hookImei', 'hookWifiMac', 'hookWifiInfo', 'hookCarrier', 'hookPhoneNumber'
  ];

  // Identity hook -> required field(s). Used by the validator.
  const IDENTITY_TOGGLE_FIELDS = {
    hookSerial:      ['serialNumber'],
    hookAndroidId:   ['androidId'],
    hookGsfId:       ['gsfId'],
    hookDrmId:       ['drmId'],
    hookImei:        ['imei'],
    hookWifiMac:     ['wifiMac'],
    hookWifiInfo:    ['wifiSsid', 'wifiBssid'],
    hookCarrier:     ['carrierName', 'simOperator', 'networkOperator', 'simOperatorName', 'simCountryIso', 'networkCountryIso'],
    hookPhoneNumber: ['phoneNumber']
  };

  let allowedApps = new Set();
  let installedApps = [];
  let API = null;
  let API_NAME = 'none';
  let lastValidation = { errors: [], warnings: [] };
  let draftTimer = null;
  let isApplyingState = false;

  function $(id) { return document.getElementById(id); }

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); } catch (_) { return fallback; }
  }

  function readStorage(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? safeJsonParse(raw, fallback) : fallback;
    } catch (_) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
  }

  function isValidationEnabled() {
    const v = readStorage(STORAGE_VALIDATION, true);
    return v !== false;
  }

  function setValidationEnabled(on) {
    writeStorage(STORAGE_VALIDATION, !!on);
  }

  // ===== Random value generators (per-field) =====
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function randHex(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += '0123456789abcdef'.charAt(randInt(0, 15));
    return s;
  }
  function randDigits(n) {
    let s = '';
    for (let i = 0; i < n; i++) s += String(randInt(0, 9));
    return s;
  }
  function randMac() {
    const parts = [];
    for (let i = 0; i < 6; i++) parts.push(randHex(2));
    return parts.join(':');
  }
  function randPick(arr) { return arr[randInt(0, arr.length - 1)]; }
  // Luhn IMEI (15 digits)
  function randImei() {
    const tac = randDigits(8);
    const serial = randDigits(6);
    const base = tac + serial;
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      let d = parseInt(base.charAt(i), 10);
      if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
      sum += d;
    }
    const check = (10 - (sum % 10)) % 10;
    return base + String(check);
  }
  function randSecurityPatch() {
    const y = randInt(2023, 2026);
    const m = String(randInt(1, 12)).padStart(2, '0');
    const d = '05';
    return y + '-' + m + '-' + d;
  }
  function randIncremental() {
    return String(randInt(10000000, 99999999));
  }
  function randBuildId() {
    const a = String.fromCharCode(randInt(65, 90)) + String.fromCharCode(randInt(65, 90));
    return a + randInt(10, 99) + '.' + randDigits(6) + '.' + randDigits(3);
  }

  const RANDOM_GENERATORS = {
    // Device identifiers
    serialNumber:    () => (randHex(2).toUpperCase() + randDigits(2) + randHex(10).toUpperCase()).slice(0, 14),
    androidId:       () => randHex(16),
    gsfId:           () => randHex(16),
    drmId:           () => randHex(32),
    // Telephony
    imei:            () => randImei(),
    meid:            () => randHex(14).toUpperCase(),
    phoneNumber:     () => '+1' + randDigits(10),
    simOperator:     () => randDigits(6),
    networkOperator: () => randDigits(6),
    carrierName:     () => randPick(['T-Mobile', 'Verizon', 'AT&T', 'Vodafone', 'Orange', 'EE', 'O2', 'Telstra']),
    simOperatorName: () => randPick(['T-Mobile', 'Verizon', 'AT&T', 'Vodafone', 'Orange', 'EE', 'O2', 'Telstra']),
    simCountryIso:   () => randPick(['us', 'gb', 'de', 'fr', 'jp', 'au', 'ca', 'br']),
    networkCountryIso: () => randPick(['us', 'gb', 'de', 'fr', 'jp', 'au', 'ca', 'br']),
    // Wi-Fi
    wifiMac:         () => randMac(),
    wifiBssid:       () => randMac(),
    wifiSsid:        () => 'Net_' + randHex(4).toUpperCase(),
    // Build / device
    buildId:         () => randBuildId(),
    buildDisplayId:  () => randBuildId(),
    buildIncremental: () => randIncremental(),
    buildRelease:    () => String(randInt(12, 17)),
    buildSdk:        () => String(randInt(31, 37)),
    securityPatch:   () => randSecurityPatch(),
    screenWidth:     () => String(randPick([1080, 1440, 1200, 1344])),
    screenHeight:    () => String(randPick([2400, 2424, 2856, 2992, 3120])),
    screenDensity:   () => String(randPick([411, 420, 440, 480, 512])),
    bootloader:      () => 'bootloader-' + randHex(8),
    baseband:        () => 'g5300q-' + randHex(6),
    // Generic text fields — fall back to short random token
    brand:           () => randPick(['google', 'samsung', 'oneplus', 'xiaomi']),
    manufacturer:    () => randPick(['Google', 'Samsung', 'OnePlus', 'Xiaomi']),
    model:           () => 'Model-' + randHex(3).toUpperCase(),
    productName:     () => 'product_' + randHex(4),
    deviceCode:      () => 'dev_' + randHex(4),
    board:           () => 'board_' + randHex(4),
    hardware:        () => 'hw_' + randHex(4),
    boardPlatform:   () => 'plat' + randInt(100, 999),
    socModel:        () => 'SoC ' + randHex(3).toUpperCase(),
    socManufacturer: () => randPick(['Google', 'Qualcomm', 'MediaTek', 'Samsung']),
    buildDescription: () => 'desc_' + randHex(6),
    buildFlavor:     () => 'flavor-user',
    buildProduct:    () => 'product_' + randHex(4),
    buildCharacteristics: () => randPick(['nosdcard', 'default']),
    buildFingerprint: () => {
      const b = randPick(['google', 'samsung']);
      const p = 'product_' + randHex(4);
      const d = 'dev_' + randHex(4);
      const r = String(randInt(12, 17));
      const id = randBuildId();
      const inc = randIncremental();
      return b + '/' + p + '/' + d + ':' + r + '/' + id + '/' + inc + ':user/release-keys';
    }
  };

  function genericRandomFor(input) {
    const ph = (input.getAttribute('placeholder') || '').toLowerCase();
    if (input.getAttribute('inputmode') === 'numeric') return randDigits(6);
    if (ph.includes('hex')) return randHex(16);
    return 'rand_' + randHex(4);
  }

  function injectRandomButtons() {
    const inputs = document.querySelectorAll('main .card input[type="text"]');
    inputs.forEach(input => {
      if (!input.id) return;
      if (input.parentElement && input.parentElement.querySelector('.rand-btn')) return;
      // Only attach to inputs sitting inside a <label> field cell
      const host = input.parentElement;
      if (!host || host.tagName !== 'LABEL') return;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rand-btn';
      btn.title = 'Generate random value';
      btn.setAttribute('aria-label', 'Generate random value for ' + input.id);
      btn.textContent = '🎲';
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const gen = RANDOM_GENERATORS[input.id] || (() => genericRandomFor(input));
        input.value = gen();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      host.classList.add('has-rand');
      host.appendChild(btn);
    });
  }

  function detectApi() {
    const ksuObj = (typeof window !== 'undefined' && window.ksu) || (typeof ksu !== 'undefined' ? ksu : null);
    if (ksuObj && typeof ksuObj.exec === 'function') {
      API_NAME = 'ksu';
      return {
        exec: (cmd) => ksuObj.exec(cmd),
        toast: typeof ksuObj.toast === 'function' ? (m) => ksuObj.toast(m) : null
      };
    }
    const mmrl = (typeof window !== 'undefined' && window.$mmrl) || (typeof $mmrl !== 'undefined' ? $mmrl : null);
    if (mmrl) {
      API_NAME = 'mmrl';
      const sh = mmrl.Shell || mmrl.shell || mmrl;
      return {
        exec: (cmd) => new Promise((resolve) => {
          try {
            if (typeof sh.exec === 'function') {
              const r = sh.exec(cmd);
              if (r && typeof r.then === 'function') r.then(resolve).catch(e => resolve({ errno: 1, stdout: '', stderr: String(e) }));
              else resolve(r);
            } else if (typeof sh.cmd === 'function') {
              resolve({ errno: 0, stdout: String(sh.cmd(cmd) || ''), stderr: '' });
            } else {
              resolve({ errno: 127, stdout: '', stderr: 'mmrl exec not available' });
            }
          } catch (e) {
            resolve({ errno: 1, stdout: '', stderr: String(e) });
          }
        }),
        toast: typeof mmrl.toast === 'function' ? (m) => mmrl.toast(m) : null
      };
    }
    if (typeof window !== 'undefined' && typeof window.exec === 'function') {
      API_NAME = 'generic';
      return {
        exec: (cmd) => window.exec(cmd),
        toast: typeof window.toast === 'function' ? (m) => window.toast(m) : null
      };
    }
    return null;
  }

  function normalize(r) {
    if (r == null) return { errno: 1, stdout: '', stderr: 'null result' };
    if (typeof r === 'string') return { errno: 0, stdout: r, stderr: '' };
    return {
      errno: (r.errno !== undefined) ? r.errno : (r.code !== undefined ? r.code : 0),
      stdout: r.stdout || '',
      stderr: r.stderr || ''
    };
  }

  function shellExec(cmd) {
    if (!API) return Promise.resolve({ errno: 127, stdout: '', stderr: 'No shell API available' });
    try {
      const r = API.exec(cmd);
      if (r && typeof r.then === 'function') return r.then(normalize).catch(e => ({ errno: 1, stdout: '', stderr: String(e) }));
      return Promise.resolve(normalize(r));
    } catch (e) {
      return Promise.resolve({ errno: 1, stdout: '', stderr: String(e) });
    }
  }

  async function sh(cmd) {
    const r = await shellExec(cmd);
    return r.stdout || '';
  }

  function notify(msg, ok) {
    const s = $('save-status');
    if (s) {
      s.textContent = msg;
      s.className = 'status ' + (ok ? 'ok' : 'err');
    }
    if (API && API.toast) {
      try { API.toast(msg); } catch (_) {}
    }
    console.log('[PixelTester]', ok ? 'OK' : 'ERR', msg);
  }

  function parseConf(text) {
    const map = {};
    (text || '').split(/\r?\n/).forEach(line => {
      const clean = line.replace(/#.*$/, '').trim();
      if (!clean) return;
      const eq = clean.indexOf('=');
      if (eq < 0) return;
      map[clean.slice(0, eq).trim()] = clean.slice(eq + 1).trim();
    });
    return map;
  }

  function buildConf(values, toggles, apps) {
    let out = '# Pixel Tester config — generated by WebUI\n';
    DEVICE_KEYS.forEach(k => { out += k + '=' + (values[k] || '') + '\n'; });
    out += '\n# Hook toggles\n';
    TOGGLE_KEYS.forEach(k => { out += k + '=' + (toggles[k] ? 'true' : 'false') + '\n'; });
    out += '\nallowedApps=' + Array.from(apps).join(',') + '\nDEBUG=false\n';
    return out;
  }

  function getDefaultToggle(key) {
    return key === 'spoofDevice' || key === 'hookBuildProperties' || key === 'hookSystemProperties' || key === 'hookProductProperties' || key === 'hookDebugProperties';
  }

  function isUnsafePackage(pkg) {
    if (!pkg) return true;
    if (UNSAFE_EXACT.has(pkg)) return true;
    return UNSAFE_PARTIAL.some(token => pkg.toLowerCase().includes(token));
  }

  function isValidPackageName(pkg) {
    if (pkg === '*') return true;
    return /^[a-zA-Z0-9_]+(?:\.[a-zA-Z0-9_]+)+$/.test(pkg);
  }

  function collectValues() {
    const values = {};
    const toggles = {};
    DEVICE_KEYS.forEach(k => {
      const el = $(k);
      values[k] = el ? (el.value || '').trim() : '';
    });
    TOGGLE_KEYS.forEach(k => {
      const el = $(k);
      toggles[k] = !!(el && el.checked);
    });
    return {
      values,
      toggles,
      apps: Array.from(allowedApps).sort()
    };
  }

  function validateState(state) {
    if (!isValidationEnabled()) {
      return { errors: [], warnings: [], disabled: true };
    }
    const errors = [];
    const warnings = [];
    const { values, toggles } = state;
    const apps = Array.from(new Set((state.apps || []).map(s => (s || '').trim()).filter(Boolean)));

    if (!toggles.spoofDevice) {
      if (apps.length) warnings.push('Spoof Device is OFF, so selected apps will be ignored until you enable it.');
      return { errors, warnings };
    }

    ['brand', 'manufacturer', 'model', 'productName', 'deviceCode', 'buildFingerprint', 'buildRelease', 'buildSdk', 'securityPatch'].forEach(key => {
      if (!values[key]) errors.push(`${key} is required.`);
    });

    ['screenWidth', 'screenHeight', 'screenDensity'].forEach(key => {
      if (values[key] && !/^\d+$/.test(values[key])) errors.push(`${key} must be numeric.`);
    });

    if (values.securityPatch && !/^\d{4}-\d{2}-\d{2}$/.test(values.securityPatch)) {
      errors.push('securityPatch must use YYYY-MM-DD format.');
    }

    const fp = values.buildFingerprint || '';
    const fpMatch = fp.match(/^([^/]+)\/([^/]+)\/([^:]+):(\d+)\/([^/]+)\/([^:]+):user\/release-keys$/);
    if (!fpMatch) {
      errors.push('buildFingerprint format looks invalid. Expected brand/product/device:release/id/incremental:user/release-keys.');
    } else {
      const [, fpBrand, fpProduct, fpDevice, fpRelease, fpBuildId, fpIncremental] = fpMatch;
      if (values.brand && fpBrand !== values.brand) warnings.push('buildFingerprint brand does not match Brand field.');
      if (values.productName && fpProduct !== values.productName) warnings.push('buildFingerprint product does not match Product Name.');
      if (values.deviceCode && fpDevice !== values.deviceCode) warnings.push('buildFingerprint device does not match Device Code.');
      if (values.buildRelease && fpRelease !== values.buildRelease) warnings.push('buildFingerprint Android release does not match Build Release.');
      if (values.buildId && fpBuildId !== values.buildId) warnings.push('buildFingerprint build ID does not match Build ID.');
      if (values.buildIncremental && fpIncremental !== values.buildIncremental) warnings.push('buildFingerprint incremental does not match Build Incremental.');
    }

    if (values.buildDescription && values.deviceCode && !values.buildDescription.includes(values.deviceCode)) {
      warnings.push('buildDescription does not include the device codename.');
    }

    // Identity & network field validation
    const hexN = (n) => new RegExp('^[0-9a-fA-F]{' + n + '}$');
    const checkHex = (key, n) => {
      const v = (values[key] || '').trim();
      if (v && !hexN(n).test(v)) errors.push(key + ' must be exactly ' + n + ' hexadecimal characters.');
    };
    checkHex('androidId', 16);
    checkHex('gsfId', 16);
    checkHex('drmId', 32);
    checkHex('meid', 14);
    if (values.imei && !/^\d{14,16}$/.test(values.imei)) {
      errors.push('imei must be 14-16 digits.');
    }
    ['simOperator', 'networkOperator'].forEach(k => {
      const v = (values[k] || '').trim();
      if (v && !/^\d{5,6}$/.test(v)) errors.push(k + ' must be 5-6 digits (MCC+MNC).');
    });
    ['simCountryIso', 'networkCountryIso'].forEach(k => {
      const v = (values[k] || '').trim();
      if (v && !/^[a-zA-Z]{2}$/.test(v)) errors.push(k + ' must be a 2-letter ISO country code.');
    });
    const macRe = /^([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}$/;
    ['wifiMac', 'wifiBssid'].forEach(k => {
      const v = (values[k] || '').trim();
      if (v && !macRe.test(v)) errors.push(k + ' must look like aa:bb:cc:dd:ee:ff.');
    });
    if (values.phoneNumber && !/^[+0-9 ()\-]{4,20}$/.test(values.phoneNumber)) {
      errors.push('phoneNumber contains invalid characters.');
    }

    // Identity toggle <-> field consistency
    Object.entries(IDENTITY_TOGGLE_FIELDS).forEach(([toggle, fields]) => {
      if (!toggles[toggle]) return;
      const hasAny = fields.some(f => (values[f] || '').trim().length > 0);
      if (!hasAny) {
        warnings.push(toggle + ' is ON but no value provided in: ' + fields.join(', ') + '. Hook will fall back to the real device value.');
      }
    });

    // Black-screen risk warnings
    if (toggles.hookImei || toggles.hookWifiMac || toggles.hookWifiInfo) {
      warnings.push('Identity hooks (IMEI / WiFi MAC / WiFi info) frequently trigger black screens or boot loops on system apps. Keep the app list narrow.');
    }
    if (toggles.hookSerial && apps.includes('*')) {
      errors.push('Hooking SERIAL with wildcard (*) is not allowed - this will brick most launchers and the systemui.');
    }

    if (apps.length === 0) warnings.push('No apps selected. The module will spoof no app until you add at least one package.');
    if (apps.includes('*')) warnings.push('Wildcard (*) will spoof every allowed process. Use with caution.');

    const invalidPkgs = apps.filter(pkg => !isValidPackageName(pkg));
    if (invalidPkgs.length) errors.push('Invalid package names: ' + invalidPkgs.join(', '));

    const unsafePkgs = apps.filter(pkg => pkg !== '*' && isUnsafePackage(pkg));
    if (unsafePkgs.length) {
      errors.push('Unsafe packages are blocked to reduce black screens: ' + unsafePkgs.join(', '));
    }

    if ((toggles.hookVendorProperties || toggles.hookOdmProperties) && apps.includes('*')) {
      errors.push('Vendor/ODM hooks cannot be combined with wildcard (*). Narrow the app list first.');
    }

    if (toggles.hookVendorProperties || toggles.hookOdmProperties) {
      warnings.push('Vendor/ODM hooks increase black-screen risk for native/system-heavy apps.');
    }

    if (!toggles.hookBuildProperties && !toggles.hookSystemProperties && !toggles.hookProductProperties && !toggles.hookVendorProperties && !toggles.hookOdmProperties && !toggles.hookDebugProperties) {
      warnings.push('All hook toggles are OFF. Spoofing will have little or no effect.');
    }

    return { errors, warnings };
  }

  function renderValidation(result) {
    lastValidation = result;
    const box = $('validation-box');
    const summary = $('validation-summary');
    if (!box || !summary) return result;

    box.innerHTML = '';
    if (result.disabled) {
      summary.textContent = 'Validation disabled';
      box.className = 'validation warn';
      box.innerHTML = '<div class="validation-line">Validation is OFF. Save will never be blocked. Toggle it back on to run safety checks.</div>';
      return result;
    }
    const errCount = result.errors.length;
    const warnCount = result.warnings.length;

    if (errCount === 0 && warnCount === 0) {
      summary.textContent = 'Validation clean — ready to save.';
      box.className = 'validation ok';
      box.innerHTML = '<div class="validation-line">No blocking issues found.</div>';
      return result;
    }

    summary.textContent = `${errCount} error(s), ${warnCount} warning(s)`;
    box.className = 'validation ' + (errCount ? 'err' : 'warn');

    result.errors.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'validation-line';
      div.textContent = 'Error: ' + msg;
      box.appendChild(div);
    });
    result.warnings.forEach(msg => {
      const div = document.createElement('div');
      div.className = 'validation-line';
      div.textContent = 'Warning: ' + msg;
      box.appendChild(div);
    });
    return result;
  }

  function runValidation() {
    const result = validateState(collectValues());
    renderValidation(result);
    updateAppSummary();
    return result;
  }

  function applyPreset(key) {
    const preset = PIXEL_DEVICES[key];
    if (!preset) return;
    isApplyingState = true;
    Object.entries(preset).forEach(([k, v]) => {
      if (k === 'name') return;
      if (IDENTITY_KEYS.has(k)) return; // never overwrite identity fields from a Pixel preset
      const el = $(k);
      if (el) el.value = v;
    });
    isApplyingState = false;
    scheduleDraftSave();
    runValidation();
    notify(`Preset "${preset.name}" applied — review and press Save.`, true);
  }

  function captureCurrentPresetLabel(values) {
    for (const [key, preset] of Object.entries(PIXEL_DEVICES)) {
      if (preset.deviceCode === values.deviceCode && preset.productName === values.productName) return key;
    }
    return '';
  }

  function snapshotCurrentState() {
    const state = collectValues();
    state.selectedPreset = captureCurrentPresetLabel(state.values);
    state.savedAt = new Date().toISOString();
    return state;
  }

  function applyState(state, opts) {
    const options = opts || {};
    if (!state) return;
    isApplyingState = true;
    DEVICE_KEYS.forEach(k => {
      const el = $(k);
      if (el) el.value = ((state.values || {})[k] || '');
    });
    TOGGLE_KEYS.forEach(k => {
      const el = $(k);
      if (el) el.checked = ((state.toggles || {})[k] !== undefined) ? !!state.toggles[k] : getDefaultToggle(k);
    });
    allowedApps = new Set((state.apps || []).map(s => (s || '').trim()).filter(Boolean));
    const presetSel = $('device-preset');
    if (presetSel) presetSel.value = state.selectedPreset || captureCurrentPresetLabel(state.values || {}) || '';
    isApplyingState = false;
    renderAppList((($('app-search') || {}).value) || '');
    updateAppSummary();
    if (!options.skipDraftSave) scheduleDraftSave();
    runValidation();
  }

  function getUserPresets() {
    return readStorage(STORAGE_PRESETS, {});
  }

  function saveUserPresets(map) {
    writeStorage(STORAGE_PRESETS, map || {});
  }

  function populateUserPresetSelect() {
    const sel = $('user-preset-select');
    if (!sel) return;
    const presets = getUserPresets();
    const names = Object.keys(presets).sort((a, b) => a.localeCompare(b));
    const current = sel.value;
    sel.innerHTML = '<option value="">-- Saved local presets --</option>';
    names.forEach(name => {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    if (current && names.includes(current)) sel.value = current;
    const countEl = $('preset-count');
    if (countEl) countEl.textContent = `${names.length} local preset(s)`;
  }

  function saveCurrentAsUserPreset() {
    const input = $('preset-name');
    const name = ((input && input.value) || '').trim();
    if (!name) {
      notify('Preset name is required.', false);
      return;
    }
    const validation = runValidation();
    if (validation.errors.length) {
      notify('Fix validation errors before saving a preset.', false);
      return;
    }
    const presets = getUserPresets();
    presets[name] = snapshotCurrentState();
    saveUserPresets(presets);
    populateUserPresetSelect();
    $('user-preset-select').value = name;
    if (input) input.value = '';
    notify(`Saved local preset "${name}".`, true);
  }

  function loadSelectedUserPreset() {
    const sel = $('user-preset-select');
    const name = sel ? sel.value : '';
    if (!name) {
      notify('Select a local preset first.', false);
      return;
    }
    const presets = getUserPresets();
    if (!presets[name]) {
      notify('Preset not found.', false);
      populateUserPresetSelect();
      return;
    }
    applyState(presets[name]);
    notify(`Loaded local preset "${name}".`, true);
  }

  function deleteSelectedUserPreset() {
    const sel = $('user-preset-select');
    const name = sel ? sel.value : '';
    if (!name) {
      notify('Select a local preset to delete.', false);
      return;
    }
    const presets = getUserPresets();
    if (!presets[name]) return;
    delete presets[name];
    saveUserPresets(presets);
    populateUserPresetSelect();
    notify(`Deleted local preset "${name}".`, true);
  }

  function exportUserPresets() {
    const presets = getUserPresets();
    const names = Object.keys(presets);
    if (!names.length) {
      notify('No local presets to export.', false);
      return;
    }
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), presets }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pixeltester-presets.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(`Exported ${names.length} preset(s).`, true);
  }

  function importUserPresetsFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const data = safeJsonParse(String(reader.result || ''), null);
      if (!data || typeof data !== 'object' || !data.presets || typeof data.presets !== 'object') {
        notify('Invalid preset file.', false);
        return;
      }
      const merged = Object.assign({}, getUserPresets(), data.presets);
      saveUserPresets(merged);
      populateUserPresetSelect();
      notify(`Imported ${Object.keys(data.presets).length} preset(s).`, true);
    };
    reader.readAsText(file);
  }

  function scheduleDraftSave() {
    if (isApplyingState) return;
    clearTimeout(draftTimer);
    draftTimer = setTimeout(() => {
      writeStorage(STORAGE_DRAFT, snapshotCurrentState());
    }, 150);
  }

  function updateUiState() {
    writeStorage(STORAGE_UI, {
      selectedPreset: ($('device-preset') || {}).value || '',
      search: ($('app-search') || {}).value || ''
    });
  }

  async function loadConfig() {
    // Read via base64 to avoid encoding/whitespace issues across loaders.
    const cmd = '(([ -f ' + CUSTOM_CONFIG + ' ] && cat ' + CUSTOM_CONFIG + ') || cat ' + CONFIG_PATH + ') 2>/dev/null | base64';
    const r = await shellExec(cmd);
    let text = '';
    if (r.errno === 0 && (r.stdout || '').trim()) {
      try { text = decodeURIComponent(escape(atob((r.stdout || '').replace(/\s+/g, '')))); }
      catch (_) { text = r.stdout; }
    }
    const map = parseConf(text);
    const hasAny = Object.keys(map).length > 0;
    if (!hasAny) {
      // Fall back to last-saved snapshot in browser storage so the user
      // never sees an empty form when the on-disk config exists but the
      // shell bridge could not read it.
      const last = readStorage(STORAGE_LAST_SAVED, null);
      if (last) {
        applyState(last, { skipDraftSave: true });
        notify('Loaded last saved snapshot from this browser (could not read /data/adb/*.conf via WebUI bridge).', true);
        return;
      }
      notify('No saved configuration found yet. Pick a preset and Save.', false);
    }
    const state = {
      values: {},
      toggles: {},
      apps: []
    };
    DEVICE_KEYS.forEach(k => { state.values[k] = map[k] || ''; });
    TOGGLE_KEYS.forEach(k => {
      state.toggles[k] = (map[k] === undefined)
        ? getDefaultToggle(k)
        : ['1', 'true', 'TRUE', 'True'].includes(map[k]);
    });
    if (map.allowedApps) {
      state.apps = map.allowedApps.split(/[,\s]+/).map(s => s.trim()).filter(Boolean);
    }
    state.selectedPreset = captureCurrentPresetLabel(state.values);
    applyState(state, { skipDraftSave: true });
    if (hasAny) writeStorage(STORAGE_LAST_SAVED, snapshotCurrentState());
  }

  async function saveConfig() {
    if (!API) {
      notify('No root API detected. Open via KernelSU/APatch/MMRL WebUI.', false);
      return;
    }
    const state = collectValues();
    const validation = renderValidation(validateState(state));
    if (!validation.disabled && validation.errors.length) {
      notify('Save blocked until validation errors are fixed.', false);
      return;
    }
    const content = buildConf(state.values, state.toggles, new Set(state.apps));
    const b64 = btoa(unescape(encodeURIComponent(content)));
    // Persist to BOTH locations and verify by reading the file size back.
    const cmd = "mkdir -p /data/adb /data/adb/modules/pixeltester"
      + " && echo '" + b64 + "' | base64 -d > " + CUSTOM_CONFIG
      + " && cp -f " + CUSTOM_CONFIG + " " + CONFIG_PATH
      + " && chmod 0644 " + CUSTOM_CONFIG + " " + CONFIG_PATH
      + " && wc -c < " + CUSTOM_CONFIG;
    notify('Saving…', true);
    const r = await shellExec(cmd);
    if (r.errno === 0) {
      const bytes = parseInt((r.stdout || '0').trim(), 10) || 0;
      writeStorage(STORAGE_LAST_SAVED, snapshotCurrentState());
      notify('Saved (' + bytes + ' bytes) → ' + CUSTOM_CONFIG + '. Restart hooked apps to apply.', true);
    } else {
      notify('Save failed: ' + (r.stderr || ('errno=' + r.errno)), false);
    }
  }

  async function loadInstalledApps() {
    const list = $('app-list');
    if (!list) return;
    list.innerHTML = '<div class="hint">Loading installed packages…</div>';
    if (!API) {
      list.innerHTML = '<div class="hint err">No root API — cannot list packages.</div>';
      return;
    }
    const out = await sh('pm list packages -3 2>/dev/null; pm list packages -s 2>/dev/null');
    const set = new Set();
    out.split(/\r?\n/).forEach(line => {
      const m = line.match(/^package:(.+)$/);
      if (m) set.add(m[1].trim());
    });
    installedApps = Array.from(set).sort().map(pkg => ({ pkg, label: pkg }));
    allowedApps.forEach(pkg => {
      if (pkg && pkg !== '*' && !set.has(pkg)) installedApps.push({ pkg, label: pkg + ' (manual)' });
    });
    renderAppList((($('app-search') || {}).value) || '');
  }

  function sortedAppItems(filter) {
    const q = (filter || '').toLowerCase();
    const items = installedApps.filter(a => !q || a.pkg.toLowerCase().includes(q));
    return items.sort((a, b) => {
      const as = allowedApps.has(a.pkg) ? 0 : 1;
      const bs = allowedApps.has(b.pkg) ? 0 : 1;
      if (as !== bs) return as - bs;
      const au = isUnsafePackage(a.pkg) ? 1 : 0;
      const bu = isUnsafePackage(b.pkg) ? 1 : 0;
      if (au !== bu) return au - bu;
      return a.pkg.localeCompare(b.pkg);
    });
  }

  function renderAppList(filter) {
    const list = $('app-list');
    if (!list) return;
    list.innerHTML = '';
    const items = sortedAppItems(filter);
    if (!items.length) {
      list.innerHTML = '<div class="hint">No matching packages</div>';
      updateAppSummary();
      return;
    }
    const frag = document.createDocumentFragment();
    items.slice(0, 500).forEach(app => {
      const unsafe = isUnsafePackage(app.pkg);
      const row = document.createElement('label');
      row.className = 'app-row' + (unsafe ? ' disabled' : '') + (allowedApps.has(app.pkg) ? ' selected' : '');

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = allowedApps.has(app.pkg);
      cb.disabled = unsafe;
      cb.addEventListener('change', () => {
        if (cb.checked) allowedApps.add(app.pkg);
        else allowedApps.delete(app.pkg);
        scheduleDraftSave();
        renderAppList((($('app-search') || {}).value) || '');
        runValidation();
      });

      const textWrap = document.createElement('div');
      textWrap.className = 'app-meta';
      const title = document.createElement('span');
      title.className = 'pkg';
      title.textContent = app.label;
      textWrap.appendChild(title);

      if (unsafe) {
        const badge = document.createElement('span');
        badge.className = 'pill risk';
        badge.textContent = 'blocked';
        textWrap.appendChild(badge);
      } else if (allowedApps.has(app.pkg)) {
        const badge = document.createElement('span');
        badge.className = 'pill ok';
        badge.textContent = 'selected';
        textWrap.appendChild(badge);
      }

      row.appendChild(cb);
      row.appendChild(textWrap);
      frag.appendChild(row);
    });
    list.appendChild(frag);
    if (items.length > 500) {
      const more = document.createElement('div');
      more.className = 'hint';
      more.textContent = 'Showing 500 of ' + items.length + '. Refine search to see more.';
      list.appendChild(more);
    }
    updateAppSummary();
  }

  function updateAppSummary() {
    const summary = $('app-summary');
    if (!summary) return;
    const selected = Array.from(allowedApps);
    const blocked = selected.filter(isUnsafePackage);
    summary.textContent = `${selected.length} selected • ${blocked.length} blocked by safety rules`;
  }

  function addManualPackage() {
    const input = $('add-app-input');
    const pkg = ((input && input.value) || '').trim();
    if (!pkg) return;
    if (!isValidPackageName(pkg)) {
      notify('Invalid package name.', false);
      return;
    }
    if (pkg !== '*' && isUnsafePackage(pkg)) {
      notify('That package is blocked by safety rules.', false);
      return;
    }
    if (pkg === '*') {
      allowedApps.clear();
      allowedApps.add('*');
    } else {
      allowedApps.delete('*');
      allowedApps.add(pkg);
      if (!installedApps.some(a => a.pkg === pkg)) installedApps.push({ pkg, label: pkg + ' (manual)' });
    }
    if (input) input.value = '';
    scheduleDraftSave();
    renderAppList((($('app-search') || {}).value) || '');
    runValidation();
  }

  function clearApps() {
    allowedApps.clear();
    scheduleDraftSave();
    renderAppList((($('app-search') || {}).value) || '');
    runValidation();
    notify('Cleared app list.', true);
  }

  function selectVisibleApps(mode) {
    const items = sortedAppItems((($('app-search') || {}).value) || '').slice(0, 500);
    if (mode === 'add') allowedApps.delete('*');
    items.forEach(app => {
      if (isUnsafePackage(app.pkg)) return;
      if (mode === 'add') allowedApps.add(app.pkg);
      else allowedApps.delete(app.pkg);
    });
    scheduleDraftSave();
    renderAppList((($('app-search') || {}).value) || '');
    runValidation();
  }

  function addRecommendedApps() {
    allowedApps.delete('*');
    QUICK_ADD_PACKAGES.forEach(pkg => allowedApps.add(pkg));
    QUICK_ADD_PACKAGES.forEach(pkg => {
      if (!installedApps.some(a => a.pkg === pkg)) installedApps.push({ pkg, label: pkg + ' (recommended)' });
    });
    scheduleDraftSave();
    renderAppList((($('app-search') || {}).value) || '');
    runValidation();
    notify('Added recommended Google core packages.', true);
  }

  function restoreLastSaved() {
    const last = readStorage(STORAGE_LAST_SAVED, null);
    if (!last) {
      notify('No saved snapshot found in this browser.', false);
      return;
    }
    applyState(last, { skipDraftSave: true });
    notify('Restored last saved snapshot from this browser.', true);
  }

  function restoreDraft() {
    const draft = readStorage(STORAGE_DRAFT, null);
    if (!draft) {
      notify('No draft snapshot found in this browser.', false);
      return;
    }
    applyState(draft);
    notify('Draft restored.', true);
  }

  function bind(id, evt, fn) {
    const el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  function setVersion() {
    sh('grep "^version=" ' + MODDIR + '/module.prop 2>/dev/null | head -1').then(v => {
      const ver = (v || '').trim().replace(/^version=/, '');
      const el = $('version-text');
      if (el && ver) el.textContent = ver;
    });
  }

  function showApiBanner() {
    const banner = $('api-banner');
    if (!banner) return;
    banner.style.display = 'block';
    if (!API) {
      banner.className = 'banner err';
      banner.textContent = 'No root WebUI bridge detected. Open this page from KernelSU / APatch / MMRL / Magisk WebUIX.';
    } else {
      banner.className = 'banner ok';
      banner.textContent = 'Connected via ' + API_NAME.toUpperCase() + ' bridge.';
      setTimeout(() => { banner.style.display = 'none'; }, 2500);
    }
  }

  function wireInputs() {
    DEVICE_KEYS.forEach(id => {
      bind(id, 'input', () => {
        if (id === 'deviceCode' || id === 'productName') {
          const sel = $('device-preset');
          if (sel) sel.value = captureCurrentPresetLabel(collectValues().values);
        }
        scheduleDraftSave();
        runValidation();
      });
    });
    TOGGLE_KEYS.forEach(id => bind(id, 'change', () => { scheduleDraftSave(); runValidation(); }));
  }

  function initPresetDropdown() {
    const sel = $('device-preset');
    if (!sel) return;
    // Static <option>s already exist as a hard fallback.
    // Re-sync them from PIXEL_DEVICES so labels stay in sync without duplicating entries.
    const existing = new Set(Array.from(sel.options).map(o => o.value));
    Object.entries(PIXEL_DEVICES).forEach(([key, dev]) => {
      if (existing.has(key)) {
        const opt = Array.from(sel.options).find(o => o.value === key);
        if (opt) opt.textContent = dev.name;
        return;
      }
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = dev.name;
      sel.appendChild(opt);
    });
    const dbg = $('preset-debug');
    if (dbg) dbg.textContent = sel.options.length - 1 + ' presets loaded · API: ' + API_NAME;
    const ui = readStorage(STORAGE_UI, {});
    if (ui.selectedPreset) sel.value = ui.selectedPreset;
    sel.addEventListener('change', e => {
      updateUiState();
      applyPreset(e.target.value);
    });
  }

  function initUiState() {
    const ui = readStorage(STORAGE_UI, {});
    if (ui.search && $('app-search')) $('app-search').value = ui.search;
  }

  function init() {
    API = detectApi();
    showApiBanner();
    initPresetDropdown();
    initUiState();
    populateUserPresetSelect();
    setVersion();

    wireInputs();

    bind('app-search', 'input', e => {
      updateUiState();
      renderAppList(e.target.value);
    });
    bind('clear-apps', 'click', clearApps);
    bind('reload-apps', 'click', () => loadInstalledApps());
    bind('select-visible-apps', 'click', () => selectVisibleApps('add'));
    bind('deselect-visible-apps', 'click', () => selectVisibleApps('remove'));
    bind('add-recommended-apps', 'click', addRecommendedApps);
    bind('add-app-btn', 'click', addManualPackage);
    bind('add-app-input', 'keydown', e => { if (e.key === 'Enter') addManualPackage(); });

    bind('save-btn', 'click', saveConfig);
    bind('validate-btn', 'click', () => {
      const result = runValidation();
      if (result.disabled) {
        notify('Validation is disabled.', true);
      } else {
        notify(result.errors.length ? 'Validation found blocking issues.' : 'Validation complete.', !result.errors.length);
      }
    });

    const valToggle = $('validationEnabled');
    if (valToggle) {
      valToggle.checked = isValidationEnabled();
      valToggle.addEventListener('change', () => {
        setValidationEnabled(valToggle.checked);
        runValidation();
        notify(valToggle.checked ? 'Validation enabled.' : 'Validation disabled — Save will not be blocked.', true);
      });
    }

    injectRandomButtons();

    bind('restore-last-btn', 'click', restoreLastSaved);
    bind('restore-draft-btn', 'click', restoreDraft);

    bind('save-user-preset', 'click', saveCurrentAsUserPreset);
    bind('load-user-preset', 'click', loadSelectedUserPreset);
    bind('delete-user-preset', 'click', deleteSelectedUserPreset);
    bind('export-user-presets', 'click', exportUserPresets);
    bind('import-user-presets-btn', 'click', () => $('import-user-presets').click());
    bind('import-user-presets', 'change', e => importUserPresetsFromFile(e.target.files && e.target.files[0]));

    loadConfig()
      .then(() => {
        const draft = readStorage(STORAGE_DRAFT, null);
        if (draft && $('restore-draft-btn')) $('restore-draft-btn').disabled = false;
        runValidation();
      })
      .catch(e => notify('Load failed: ' + e, false));

    loadInstalledApps().catch(e => notify('App list failed: ' + e, false));
  }

  window.addEventListener('error', (e) => {
    console.error('[PixelTester] uncaught:', e.message);
    const s = $('save-status');
    if (s) {
      s.textContent = 'JS error: ' + e.message;
      s.className = 'status err';
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
