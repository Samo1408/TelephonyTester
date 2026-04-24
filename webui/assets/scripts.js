  import '@material/web/all.js';

  const MODDIR = '/data/adb/modules/pixeltester';
  const CONFIG_PATH = MODDIR + '/device.conf';
  const CUSTOM_CONFIG = '/data/adb/pixeltester.conf';

  // Pixel device presets
  const PIXEL_DEVICES = {
    'pixel4': {
      name: 'Pixel 4',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 4', productName: 'flame',
      deviceCode: 'flame', board: 'flame', hardware: 'flame', boardPlatform: 'msmnile',
      buildFingerprint: 'google/flame/flame:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'flame-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'flame-user', buildProduct: 'flame', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Qualcomm Snapdragon 765G', socManufacturer: 'Qualcomm'
    },
    'pixel4pro': {
      name: 'Pixel 4 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 4 Pro', productName: 'coral',
      deviceCode: 'coral', board: 'coral', hardware: 'coral', boardPlatform: 'msmnile',
      buildFingerprint: 'google/coral/coral:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'coral-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'coral-user', buildProduct: 'coral', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Qualcomm Snapdragon 765G', socManufacturer: 'Qualcomm'
    },
    'pixel5': {
      name: 'Pixel 5',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 5', productName: 'redfin',
      deviceCode: 'redfin', board: 'redfin', hardware: 'redfin', boardPlatform: 'msmnile',
      buildFingerprint: 'google/redfin/redfin:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'redfin-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'redfin-user', buildProduct: 'redfin', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Qualcomm Snapdragon 765G', socManufacturer: 'Qualcomm'
    },
    'pixel5pro': {
      name: 'Pixel 5 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 5 Pro', productName: 'barbet',
      deviceCode: 'barbet', board: 'barbet', hardware: 'barbet', boardPlatform: 'msmnile',
      buildFingerprint: 'google/barbet/barbet:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'barbet-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'barbet-user', buildProduct: 'barbet', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Qualcomm Snapdragon 765G', socManufacturer: 'Qualcomm'
    },
    'pixel6': {
      name: 'Pixel 6',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 6', productName: 'oriole',
      deviceCode: 'oriole', board: 'oriole', hardware: 'oriole', boardPlatform: 'gs101',
      buildFingerprint: 'google/oriole/oriole:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'oriole-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'oriole-user', buildProduct: 'oriole', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor', socManufacturer: 'Google'
    },
    'pixel6pro': {
      name: 'Pixel 6 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 6 Pro', productName: 'raven',
      deviceCode: 'raven', board: 'raven', hardware: 'raven', boardPlatform: 'gs101',
      buildFingerprint: 'google/raven/raven:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'raven-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'raven-user', buildProduct: 'raven', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Google Tensor', socManufacturer: 'Google'
    },
    'pixel6a': {
      name: 'Pixel 6a',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 6a', productName: 'bluejay',
      deviceCode: 'bluejay', board: 'bluejay', hardware: 'bluejay', boardPlatform: 'gs101',
      buildFingerprint: 'google/bluejay/bluejay:13/TP1A.220624.014/8816092:user/release-keys',
      buildId: 'TP1A.220624.014', buildDisplayId: 'TP1A.220624.014', buildIncremental: '8816092',
      buildRelease: '13', buildSdk: '33', securityPatch: '2022-06-05',
      buildDescription: 'bluejay-user 13 TP1A.220624.014 8816092 release-keys',
      buildFlavor: 'bluejay-user', buildProduct: 'bluejay', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor', socManufacturer: 'Google'
    },
    'pixel7': {
      name: 'Pixel 7',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 7', productName: 'panther',
      deviceCode: 'panther', board: 'panther', hardware: 'panther', boardPlatform: 'gs201',
      buildFingerprint: 'google/panther/panther:14/UP1A.231105.003/10817812:user/release-keys',
      buildId: 'UP1A.231105.003', buildDisplayId: 'UP1A.231105.003', buildIncremental: '10817812',
      buildRelease: '14', buildSdk: '34', securityPatch: '2023-11-05',
      buildDescription: 'panther-user 14 UP1A.231105.003 10817812 release-keys',
      buildFlavor: 'panther-user', buildProduct: 'panther', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor G2', socManufacturer: 'Google'
    },
    'pixel7pro': {
      name: 'Pixel 7 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 7 Pro', productName: 'cheetah',
      deviceCode: 'cheetah', board: 'cheetah', hardware: 'cheetah', boardPlatform: 'gs201',
      buildFingerprint: 'google/cheetah/cheetah:14/UP1A.231105.003/10817812:user/release-keys',
      buildId: 'UP1A.231105.003', buildDisplayId: 'UP1A.231105.003', buildIncremental: '10817812',
      buildRelease: '14', buildSdk: '34', securityPatch: '2023-11-05',
      buildDescription: 'cheetah-user 14 UP1A.231105.003 10817812 release-keys',
      buildFlavor: 'cheetah-user', buildProduct: 'cheetah', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Google Tensor G2', socManufacturer: 'Google'
    },
    'pixel7a': {
      name: 'Pixel 7a',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 7a', productName: 'lynx',
      deviceCode: 'lynx', board: 'lynx', hardware: 'lynx', boardPlatform: 'gs201',
      buildFingerprint: 'google/lynx/lynx:14/UP1A.231105.003/10817812:user/release-keys',
      buildId: 'UP1A.231105.003', buildDisplayId: 'UP1A.231105.003', buildIncremental: '10817812',
      buildRelease: '14', buildSdk: '34', securityPatch: '2023-11-05',
      buildDescription: 'lynx-user 14 UP1A.231105.003 10817812 release-keys',
      buildFlavor: 'lynx-user', buildProduct: 'lynx', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor G2', socManufacturer: 'Google'
    },
    'pixel8': {
      name: 'Pixel 8',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 8', productName: 'shiba',
      deviceCode: 'shiba', board: 'shiba', hardware: 'shiba', boardPlatform: 'gs301',
      buildFingerprint: 'google/shiba/shiba:15/AP2A.240305.005/11948037:user/release-keys',
      buildId: 'AP2A.240305.005', buildDisplayId: 'AP2A.240305.005', buildIncremental: '11948037',
      buildRelease: '15', buildSdk: '35', securityPatch: '2024-03-05',
      buildDescription: 'shiba-user 15 AP2A.240305.005 11948037 release-keys',
      buildFlavor: 'shiba-user', buildProduct: 'shiba', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor G3', socManufacturer: 'Google'
    },
    'pixel8pro': {
      name: 'Pixel 8 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 8 Pro', productName: 'husky',
      deviceCode: 'husky', board: 'husky', hardware: 'husky', boardPlatform: 'gs301',
      buildFingerprint: 'google/husky/husky:15/AP2A.240305.005/11948037:user/release-keys',
      buildId: 'AP2A.240305.005', buildDisplayId: 'AP2A.240305.005', buildIncremental: '11948037',
      buildRelease: '15', buildSdk: '35', securityPatch: '2024-03-05',
      buildDescription: 'husky-user 15 AP2A.240305.005 11948037 release-keys',
      buildFlavor: 'husky-user', buildProduct: 'husky', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Google Tensor G3', socManufacturer: 'Google'
    },
    'pixel8a': {
      name: 'Pixel 8a',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 8a', productName: 'akita',
      deviceCode: 'akita', board: 'akita', hardware: 'akita', boardPlatform: 'gs301',
      buildFingerprint: 'google/akita/akita:15/AP2A.240305.005/11948037:user/release-keys',
      buildId: 'AP2A.240305.005', buildDisplayId: 'AP2A.240305.005', buildIncremental: '11948037',
      buildRelease: '15', buildSdk: '35', securityPatch: '2024-03-05',
      buildDescription: 'akita-user 15 AP2A.240305.005 11948037 release-keys',
      buildFlavor: 'akita-user', buildProduct: 'akita', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2340', screenDensity: '420',
      socModel: 'Google Tensor G3', socManufacturer: 'Google'
    },
    'pixel9': {
      name: 'Pixel 9',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 9', productName: 'komodo',
      deviceCode: 'komodo', board: 'komodo', hardware: 'komodo', boardPlatform: 'gs401',
      buildFingerprint: 'google/komodo/komodo:15/AP3A.250305.001/12345678:user/release-keys',
      buildId: 'AP3A.250305.001', buildDisplayId: 'AP3A.250305.001', buildIncremental: '12345678',
      buildRelease: '15', buildSdk: '35', securityPatch: '2025-03-05',
      buildDescription: 'komodo-user 15 AP3A.250305.001 12345678 release-keys',
      buildFlavor: 'komodo-user', buildProduct: 'komodo', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2424', screenDensity: '422',
      socModel: 'Google Tensor G4', socManufacturer: 'Google'
    },
    'pixel9pro': {
      name: 'Pixel 9 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 9 Pro', productName: 'tokay',
      deviceCode: 'tokay', board: 'tokay', hardware: 'tokay', boardPlatform: 'gs401',
      buildFingerprint: 'google/tokay/tokay:15/AP3A.250305.001/12345678:user/release-keys',
      buildId: 'AP3A.250305.001', buildDisplayId: 'AP3A.250305.001', buildIncremental: '12345678',
      buildRelease: '15', buildSdk: '35', securityPatch: '2025-03-05',
      buildDescription: 'tokay-user 15 AP3A.250305.001 12345678 release-keys',
      buildFlavor: 'tokay-user', buildProduct: 'tokay', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Google Tensor G4', socManufacturer: 'Google'
    },
    'pixel9proxl': {
      name: 'Pixel 9 Pro XL',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 9 Pro XL', productName: 'comet',
      deviceCode: 'comet', board: 'comet', hardware: 'comet', boardPlatform: 'gs401',
      buildFingerprint: 'google/comet/comet:15/AP3A.250305.001/12345678:user/release-keys',
      buildId: 'AP3A.250305.001', buildDisplayId: 'AP3A.250305.001', buildIncremental: '12345678',
      buildRelease: '15', buildSdk: '35', securityPatch: '2025-03-05',
      buildDescription: 'comet-user 15 AP3A.250305.001 12345678 release-keys',
      buildFlavor: 'comet-user', buildProduct: 'comet', buildCharacteristics: 'nosdcard',
      screenWidth: '1600', screenHeight: '3456', screenDensity: '486',
      socModel: 'Google Tensor G4', socManufacturer: 'Google'
    },
    'pixel9profold': {
      name: 'Pixel 9 Pro Fold',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 9 Pro Fold', productName: 'jumbojack',
      deviceCode: 'jumbojack', board: 'jumbojack', hardware: 'jumbojack', boardPlatform: 'gs401',
      buildFingerprint: 'google/jumbojack/jumbojack:15/AP3A.250305.001/12345678:user/release-keys',
      buildId: 'AP3A.250305.001', buildDisplayId: 'AP3A.250305.001', buildIncremental: '12345678',
      buildRelease: '15', buildSdk: '35', securityPatch: '2025-03-05',
      buildDescription: 'jumbojack-user 15 AP3A.250305.001 12345678 release-keys',
      buildFlavor: 'jumbojack-user', buildProduct: 'jumbojack', buildCharacteristics: 'nosdcard',
      screenWidth: '2092', screenHeight: '1450', screenDensity: '408',
      socModel: 'Google Tensor G4', socManufacturer: 'Google'
    },
    'pixel10': {
      name: 'Pixel 10',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 10', productName: 'frankel',
      deviceCode: 'frankel', board: 'frankel', hardware: 'frankel', boardPlatform: 'rio',
      buildFingerprint: 'google/frankel/frankel:16/AP4A.250405.001/13500000:user/release-keys',
      buildId: 'AP4A.250405.001', buildDisplayId: 'AP4A.250405.001', buildIncremental: '13500000',
      buildRelease: '16', buildSdk: '34', securityPatch: '2025-04-05',
      buildDescription: 'frankel-user 16 AP4A.250405.001 13500000 release-keys',
      buildFlavor: 'frankel-user', buildProduct: 'frankel', buildCharacteristics: 'nosdcard',
      screenWidth: '1080', screenHeight: '2424', screenDensity: '422',
      socModel: 'Google Tensor G5', socManufacturer: 'Google'
    },
    'pixel10pro': {
      name: 'Pixel 10 Pro',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 10 Pro', productName: 'mako',
      deviceCode: 'mako', board: 'mako', hardware: 'mako', boardPlatform: 'rio',
      buildFingerprint: 'google/mako/mako:16/AP4A.250405.001/13500000:user/release-keys',
      buildId: 'AP4A.250405.001', buildDisplayId: 'AP4A.250405.001', buildIncremental: '13500000',
      buildRelease: '16', buildSdk: '34', securityPatch: '2025-04-05',
      buildDescription: 'mako-user 16 AP4A.250405.001 13500000 release-keys',
      buildFlavor: 'mako-user', buildProduct: 'mako', buildCharacteristics: 'nosdcard',
      screenWidth: '1440', screenHeight: '3120', screenDensity: '515',
      socModel: 'Google Tensor G5', socManufacturer: 'Google'
    },
    'pixel10proxl': {
      name: 'Pixel 10 Pro XL',
      brand: 'google', manufacturer: 'Google', model: 'Pixel 10 Pro XL', productName: 'makoXL',
      deviceCode: 'makoXL', board: 'makoXL', hardware: 'makoXL', boardPlatform: 'rio',
      buildFingerprint: 'google/makoXL/makoXL:16/AP4A.250405.001/13500000:user/release-keys',
      buildId: 'AP4A.250405.001', buildDisplayId: 'AP4A.250405.001', buildIncremental: '13500000',
      buildRelease: '16', buildSdk: '34', securityPatch: '2025-04-05',
      buildDescription: 'makoXL-user 16 AP4A.250405.001 13500000 release-keys',
      buildFlavor: 'makoXL-user', buildProduct: 'makoXL', buildCharacteristics: 'nosdcard',
      screenWidth: '1600', screenHeight: '3456', screenDensity: '486',
      socModel: 'Google Tensor G5', socManufacturer: 'Google'
    },
    'pixelfold': {
      name: 'Pixel Fold',
      brand: 'google', manufacturer: 'Google', model: 'Pixel Fold', productName: 'felix',
      deviceCode: 'felix', board: 'felix', hardware: 'felix', boardPlatform: 'gs301',
      buildFingerprint: 'google/felix/felix:15/AP2A.240305.005/11948037:user/release-keys',
      buildId: 'AP2A.240305.005', buildDisplayId: 'AP2A.240305.005', buildIncremental: '11948037',
      buildRelease: '15', buildSdk: '35', securityPatch: '2024-03-05',
      buildDescription: 'felix-user 15 AP2A.240305.005 11948037 release-keys',
      buildFlavor: 'felix-user', buildProduct: 'felix', buildCharacteristics: 'nosdcard',
      screenWidth: '2092', screenHeight: '1450', screenDensity: '408',
      socModel: 'Google Tensor G3', socManufacturer: 'Google'
    }
  };

  const DEVICE_KEYS = [
      'brand', 'manufacturer', 'model', 'productName', 'deviceCode', 'board', 'hardware',
      'boardPlatform', 'buildFingerprint', 'buildId', 'buildDisplayId', 'buildIncremental',
      'buildRelease', 'buildSdk', 'securityPatch', 'buildDescription', 'buildFlavor',
      'buildProduct', 'buildCharacteristics', 'screenWidth', 'screenHeight', 'screenDensity',
      'socModel', 'socManufacturer', 'bootloader', 'baseband'
  ];

  const TOGGLE_KEYS = [
      'spoofDevice',
      'hookBuildProperties',
      'hookSystemProperties',
      'hookVendorProperties',
      'hookOdmProperties',
      'hookProductProperties',
      'hookDebugProperties'
  ];

  let allowedApps = new Set();
  let installedApps = []; // [{label, pkg}]

  // ----- helpers ----------------------------------------------------------

  async function sh(cmd) {
      const r = await exec(cmd);
      if (r && r.stdout != null) return r.stdout;
      return '';
  }

  function parseConfig(text) {
      const map = {};
      text.split(/\r?\n/).forEach(l => {
          const line = l.replace(/#.*$/, '').trim();
          if (!line) return;
          const eq = line.indexOf('=');
          if (eq < 0) return;
          const k = line.slice(0, eq).trim();
          const v = line.slice(eq + 1).trim();
          map[k] = v;
      });
      return map;
  }

  function buildConfigFile(values, toggles, apps) {
      let out = '# Pixel Device Spoofing Configuration (generated by WebUI)\n';
      DEVICE_KEYS.forEach(k => out += k + '=' + (values[k] || '') + '\n');
      out += '\n';
      TOGGLE_KEYS.forEach(k => out += k + '=' + (toggles[k] ? 'true' : 'false') + '\n');
      out += '\nallowedApps=' + Array.from(apps).join(',') + '\n';
      out += 'DEBUG=false\n';
      return out;
  }

  async function loadConfig() {
      let text = await sh('[ -f ' + CUSTOM_CONFIG + ' ] && cat ' + CUSTOM_CONFIG + ' || cat ' + CONFIG_PATH + ' 2>/dev/null');
      const map = parseConfig(text || '');

      DEVICE_KEYS.forEach(k => {
          const el = document.getElementById(k);
          if (el) el.value = map[k] || '';
      });
      TOGGLE_KEYS.forEach(k => {
          const id = (k === 'spoofDevice') ? 'spoofDevice-toggle' : k;
          const el = document.getElementById(id);
          if (!el) return;
          const v = (map[k] || '').toLowerCase();
          el.selected = (v === 'true' || v === '1' || (map[k] === undefined && k.startsWith('hook')));
      });

      allowedApps = new Set();
      if (map.allowedApps) {
          map.allowedApps.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).forEach(p => allowedApps.add(p));
      }
  }

  async function saveConfig() {
      const values = {};
      DEVICE_KEYS.forEach(k => {
          const el = document.getElementById(k);
          values[k] = el ? (el.value || '').trim() : '';
      });
      const toggles = {};
      TOGGLE_KEYS.forEach(k => {
          const id = (k === 'spoofDevice') ? 'spoofDevice-toggle' : k;
          const el = document.getElementById(id);
          toggles[k] = el ? !!el.selected : false;
      });

      const content = buildConfigFile(values, toggles, allowedApps);
      const b64 = btoa(unescape(encodeURIComponent(content)));
      const cmd = "echo '" + b64 + "' | base64 -d > " + CUSTOM_CONFIG
          + " && cp " + CUSTOM_CONFIG + " " + CONFIG_PATH;
      const r = await exec(cmd);
      const status = document.getElementById('save-status');
      if (r && r.errno === 0) {
          status.textContent = 'Saved. Reboot or restart hooked apps to apply.';
          toast('Settings saved');
      } else {
          status.textContent = 'Save failed: ' + (r ? r.stderr : 'unknown error');
          toast('Save failed');
      }
  }

  // ----- device preset selector -----------------------------------------------

  function applyDevicePreset(presetKey) {
      const preset = PIXEL_DEVICES[presetKey];
      if (!preset) return;
      
      Object.entries(preset).forEach(([k, v]) => {
          const el = document.getElementById(k);
          if (el) el.value = v;
      });
  }

  // ----- app list ---------------------------------------------------------

  async function loadInstalledApps() {
      const list = document.getElementById('app-list');
      list.innerHTML = '<div class="hint">Loading installed packages...</div>';
      const out = await sh('pm list packages -3 2>/dev/null; pm list packages -s 2>/dev/null');
      const set = new Set();
      out.split(/\r?\n/).forEach(l => {
          const m = l.match(/^package:(.+)$/);
          if (m) set.add(m[1].trim());
      });
      installedApps = Array.from(set).sort().map(pkg => ({ pkg, label: pkg }));
      allowedApps.forEach(p => {
          if (p && p !== '*' && !set.has(p)) installedApps.push({ pkg: p, label: p + ' (manual)' });
      });
      renderAppList('');
  }

  function renderAppList(filter) {
      const list = document.getElementById('app-list');
      list.innerHTML = '';
      const q = (filter || '').toLowerCase();
      const items = installedApps.filter(a => !q || a.pkg.toLowerCase().includes(q));
      if (items.length === 0) {
          list.innerHTML = '<div class="hint">No matching packages</div>';
          return;
      }
      items.forEach(a => {
          const row = document.createElement('label');
          row.className = 'app-row';
          const cb = document.createElement('md-checkbox');
          cb.checked = allowedApps.has(a.pkg);
          cb.addEventListener('change', () => {
              if (cb.checked) allowedApps.add(a.pkg);
              else allowedApps.delete(a.pkg);
          });
          const span = document.createElement('span');
          span.textContent = a.label;
          row.appendChild(cb);
          row.appendChild(span);
          list.appendChild(row);
      });
  }

  // ----- UI init ----------------------------------------------------------

  async function init() {
      // Device preset selector
      const presetSelect = document.getElementById('device-preset');
      if (presetSelect) {
          Object.entries(PIXEL_DEVICES).forEach(([key, device]) => {
              const opt = document.createElement('option');
              opt.value = key;
              opt.textContent = device.name;
              presetSelect.appendChild(opt);
          });
          presetSelect.addEventListener('change', (e) => {
              if (e.target.value) applyDevicePreset(e.target.value);
          });
      }

      // Load config and apps
      await loadConfig();
      await loadInstalledApps();

      // Search filter
      const search = document.getElementById('app-search');
      if (search) search.addEventListener('input', (e) => renderAppList(e.target.value));

      // Clear allowed apps
      const clearBtn = document.getElementById('clear-apps');
      if (clearBtn) clearBtn.addEventListener('click', () => {
          allowedApps.clear();
          renderAppList('');
      });

      // Reload apps
      const reloadBtn = document.getElementById('reload-apps');
      if (reloadBtn) reloadBtn.addEventListener('click', loadInstalledApps);

      // Add manual app
      const addBtn = document.getElementById('add-app-btn');
      const addInput = document.getElementById('add-app-input');
      if (addBtn && addInput) {
          addBtn.addEventListener('click', () => {
              const pkg = addInput.value.trim();
              if (pkg) {
                  allowedApps.add(pkg);
                  addInput.value = '';
                  renderAppList('');
              }
          });
      }

      // Save button
      const saveBtn = document.getElementById('save-btn');
      if (saveBtn) saveBtn.addEventListener('click', saveConfig);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
  } else {
      init();
  }
  
