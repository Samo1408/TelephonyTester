/* Pixel Tester WebUI — vanilla JS for KernelSU / APatch / MMRL / Magisk WebUI */
(function () {
  'use strict';

  const MODID = 'pixeltester';
  const MODDIR = '/data/adb/modules/' + MODID;
  const CONFIG_PATH = MODDIR + '/device.conf';
  const CUSTOM_CONFIG = '/data/adb/pixeltester.conf';

  /* ---------- Pixel device presets ---------- */
  const PIXEL_DEVICES = {
    'pixel5':    { name:'Pixel 5',    brand:'google', manufacturer:'Google', model:'Pixel 5',    productName:'redfin',  deviceCode:'redfin',  board:'redfin',  hardware:'redfin',  boardPlatform:'lito',
                   buildFingerprint:'google/redfin/redfin:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'redfin-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'redfin-user', buildProduct:'redfin', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2340', screenDensity:'432',
                   socModel:'Qualcomm SM7250', socManufacturer:'Qualcomm' },
    'pixel6':    { name:'Pixel 6',    brand:'google', manufacturer:'Google', model:'Pixel 6',    productName:'oriole',  deviceCode:'oriole',  board:'oriole',  hardware:'oriole',  boardPlatform:'gs101',
                   buildFingerprint:'google/oriole/oriole:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'oriole-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'oriole-user', buildProduct:'oriole', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2400', screenDensity:'411',
                   socModel:'Google Tensor', socManufacturer:'Google' },
    'pixel6pro': { name:'Pixel 6 Pro', brand:'google', manufacturer:'Google', model:'Pixel 6 Pro', productName:'raven', deviceCode:'raven', board:'raven', hardware:'raven', boardPlatform:'gs101',
                   buildFingerprint:'google/raven/raven:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'raven-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'raven-user', buildProduct:'raven', buildCharacteristics:'nosdcard', screenWidth:'1440', screenHeight:'3120', screenDensity:'512',
                   socModel:'Google Tensor', socManufacturer:'Google' },
    'pixel7':    { name:'Pixel 7',    brand:'google', manufacturer:'Google', model:'Pixel 7',    productName:'panther', deviceCode:'panther', board:'panther', hardware:'panther', boardPlatform:'gs201',
                   buildFingerprint:'google/panther/panther:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'panther-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'panther-user', buildProduct:'panther', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2400', screenDensity:'416',
                   socModel:'Google Tensor G2', socManufacturer:'Google' },
    'pixel7pro': { name:'Pixel 7 Pro', brand:'google', manufacturer:'Google', model:'Pixel 7 Pro', productName:'cheetah', deviceCode:'cheetah', board:'cheetah', hardware:'cheetah', boardPlatform:'gs201',
                   buildFingerprint:'google/cheetah/cheetah:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'cheetah-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'cheetah-user', buildProduct:'cheetah', buildCharacteristics:'nosdcard', screenWidth:'1440', screenHeight:'3120', screenDensity:'512',
                   socModel:'Google Tensor G2', socManufacturer:'Google' },
    'pixel7a':   { name:'Pixel 7a',   brand:'google', manufacturer:'Google', model:'Pixel 7a',   productName:'lynx',    deviceCode:'lynx',    board:'lynx',    hardware:'lynx',    boardPlatform:'gs201',
                   buildFingerprint:'google/lynx/lynx:14/UP1A.231105.003/11010452:user/release-keys', buildId:'UP1A.231105.003', buildDisplayId:'UP1A.231105.003', buildIncremental:'11010452',
                   buildRelease:'14', buildSdk:'34', securityPatch:'2023-11-05', buildDescription:'lynx-user 14 UP1A.231105.003 11010452 release-keys',
                   buildFlavor:'lynx-user', buildProduct:'lynx', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2400', screenDensity:'429',
                   socModel:'Google Tensor G2', socManufacturer:'Google' },
    'pixel8':    { name:'Pixel 8',    brand:'google', manufacturer:'Google', model:'Pixel 8',    productName:'shiba',   deviceCode:'shiba',   board:'shiba',   hardware:'shiba',   boardPlatform:'zuma',
                   buildFingerprint:'google/shiba/shiba:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'shiba-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'shiba-user', buildProduct:'shiba', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2400', screenDensity:'421',
                   socModel:'Google Tensor G3', socManufacturer:'Google' },
    'pixel8pro': { name:'Pixel 8 Pro', brand:'google', manufacturer:'Google', model:'Pixel 8 Pro', productName:'husky', deviceCode:'husky', board:'husky', hardware:'husky', boardPlatform:'zuma',
                   buildFingerprint:'google/husky/husky:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'husky-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'husky-user', buildProduct:'husky', buildCharacteristics:'nosdcard', screenWidth:'1344', screenHeight:'2992', screenDensity:'489',
                   socModel:'Google Tensor G3', socManufacturer:'Google' },
    'pixel8a':   { name:'Pixel 8a',   brand:'google', manufacturer:'Google', model:'Pixel 8a',   productName:'akita',   deviceCode:'akita',   board:'akita',   hardware:'akita',   boardPlatform:'zuma',
                   buildFingerprint:'google/akita/akita:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'akita-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'akita-user', buildProduct:'akita', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2400', screenDensity:'430',
                   socModel:'Google Tensor G3', socManufacturer:'Google' },
    'pixel9':    { name:'Pixel 9',    brand:'google', manufacturer:'Google', model:'Pixel 9',    productName:'tokay',   deviceCode:'tokay',   board:'tokay',   hardware:'tokay',   boardPlatform:'zumapro',
                   buildFingerprint:'google/tokay/tokay:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'tokay-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'tokay-user', buildProduct:'tokay', buildCharacteristics:'nosdcard', screenWidth:'1080', screenHeight:'2424', screenDensity:'422',
                   socModel:'Google Tensor G4', socManufacturer:'Google' },
    'pixel9pro': { name:'Pixel 9 Pro', brand:'google', manufacturer:'Google', model:'Pixel 9 Pro', productName:'caiman', deviceCode:'caiman', board:'caiman', hardware:'caiman', boardPlatform:'zumapro',
                   buildFingerprint:'google/caiman/caiman:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'caiman-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'caiman-user', buildProduct:'caiman', buildCharacteristics:'nosdcard', screenWidth:'1280', screenHeight:'2856', screenDensity:'495',
                   socModel:'Google Tensor G4', socManufacturer:'Google' },
    'pixel9proxl':{name:'Pixel 9 Pro XL', brand:'google', manufacturer:'Google', model:'Pixel 9 Pro XL', productName:'komodo', deviceCode:'komodo', board:'komodo', hardware:'komodo', boardPlatform:'zumapro',
                   buildFingerprint:'google/komodo/komodo:15/AP3A.241005.015/12345678:user/release-keys', buildId:'AP3A.241005.015', buildDisplayId:'AP3A.241005.015', buildIncremental:'12345678',
                   buildRelease:'15', buildSdk:'35', securityPatch:'2024-10-05', buildDescription:'komodo-user 15 AP3A.241005.015 12345678 release-keys',
                   buildFlavor:'komodo-user', buildProduct:'komodo', buildCharacteristics:'nosdcard', screenWidth:'1344', screenHeight:'2992', screenDensity:'486',
                   socModel:'Google Tensor G4', socManufacturer:'Google' }
  };

  const DEVICE_KEYS = ['brand','manufacturer','model','productName','deviceCode','board','hardware',
    'boardPlatform','buildFingerprint','buildId','buildDisplayId','buildIncremental',
    'buildRelease','buildSdk','securityPatch','buildDescription','buildFlavor',
    'buildProduct','buildCharacteristics','screenWidth','screenHeight','screenDensity',
    'socModel','socManufacturer','bootloader','baseband'];

  const TOGGLE_KEYS = ['spoofDevice','hookBuildProperties','hookSystemProperties',
    'hookVendorProperties','hookOdmProperties','hookProductProperties','hookDebugProperties'];

  let allowedApps = new Set();
  let installedApps = [];
  let API = null;
  let API_NAME = 'none';

  /* ---------- Cross-manager exec / toast ---------- */
  function detectApi() {
    // KernelSU & APatch: window.ksu (object with exec, toast)
    const ksuObj = (typeof window !== 'undefined' && window.ksu) || (typeof ksu !== 'undefined' ? ksu : null);
    if (ksuObj && typeof ksuObj.exec === 'function') {
      API_NAME = 'ksu';
      return {
        exec: (cmd) => ksuObj.exec(cmd),
        toast: typeof ksuObj.toast === 'function' ? (m) => ksuObj.toast(m) : null
      };
    }
    // MMRL bridge: $mmrl object exposes managers
    const mmrl = (typeof window !== 'undefined' && window.$mmrl) || (typeof $mmrl !== 'undefined' ? $mmrl : null);
    if (mmrl) {
      API_NAME = 'mmrl';
      // MMRL exposes ModuleManager / Shell objects; try the common patterns
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
          } catch (e) { resolve({ errno: 1, stdout: '', stderr: String(e) }); }
        }),
        toast: typeof mmrl.toast === 'function' ? (m) => mmrl.toast(m) : null
      };
    }
    // Generic global exec (some custom WebUI loaders)
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

  async function sh(cmd) { const r = await shellExec(cmd); return r.stdout || ''; }

  function notify(msg, ok) {
    const s = document.getElementById('save-status');
    if (s) { s.textContent = msg; s.className = 'status ' + (ok ? 'ok' : 'err'); }
    if (API && API.toast) { try { API.toast(msg); } catch (_) {} }
    console.log('[PixelTester]', ok ? 'OK' : 'ERR', msg);
  }

  /* ---------- Config IO ---------- */
  function parseConf(text) {
    const map = {};
    (text || '').split(/\r?\n/).forEach(l => {
      const line = l.replace(/#.*$/, '').trim();
      if (!line) return;
      const eq = line.indexOf('='); if (eq < 0) return;
      map[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    });
    return map;
  }

  function buildConf(values, toggles, apps) {
    let out = '# Pixel Tester config — generated by WebUI\n';
    DEVICE_KEYS.forEach(k => out += k + '=' + (values[k] || '') + '\n');
    out += '\n# Hook toggles\n';
    TOGGLE_KEYS.forEach(k => out += k + '=' + (toggles[k] ? 'true' : 'false') + '\n');
    out += '\nallowedApps=' + Array.from(apps).join(',') + '\nDEBUG=false\n';
    return out;
  }

  async function loadConfig() {
    const text = await sh('[ -f ' + CUSTOM_CONFIG + ' ] && cat ' + CUSTOM_CONFIG + ' || cat ' + CONFIG_PATH + ' 2>/dev/null');
    const map = parseConf(text);
    DEVICE_KEYS.forEach(k => { const el = document.getElementById(k); if (el) el.value = map[k] || ''; });
    TOGGLE_KEYS.forEach(k => {
      const el = document.getElementById(k); if (!el) return;
      if (map[k] === undefined) {
        el.checked = (k === 'spoofDevice' || k === 'hookBuildProperties' || k === 'hookSystemProperties'
          || k === 'hookProductProperties' || k === 'hookDebugProperties');
      } else {
        const v = map[k].toLowerCase();
        el.checked = (v === 'true' || v === '1');
      }
    });
    allowedApps = new Set();
    if (map.allowedApps) {
      map.allowedApps.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).forEach(p => allowedApps.add(p));
    }
    // Try to match a preset based on loaded values
    matchPresetFromValues();
  }

  function matchPresetFromValues() {
    const sel = document.getElementById('device-preset');
    if (!sel) return;
    const productName = (document.getElementById('productName') || {}).value || '';
    if (!productName) return;
    for (const [key, dev] of Object.entries(PIXEL_DEVICES)) {
      if (dev.productName === productName) { sel.value = key; return; }
    }
  }

  async function saveConfig() {
    if (!API) {
      notify('No root API detected. Open via KernelSU/APatch/MMRL WebUI.', false);
      return;
    }
    const values = {}, toggles = {};
    DEVICE_KEYS.forEach(k => { const el = document.getElementById(k); values[k] = el ? (el.value || '').trim() : ''; });
    TOGGLE_KEYS.forEach(k => { const el = document.getElementById(k); toggles[k] = !!(el && el.checked); });
    const content = buildConf(values, toggles, allowedApps);
    const b64 = btoa(unescape(encodeURIComponent(content)));
    const cmd = "echo '" + b64 + "' | base64 -d > " + CUSTOM_CONFIG
      + " && cp -f " + CUSTOM_CONFIG + " " + CONFIG_PATH
      + " && chmod 0644 " + CUSTOM_CONFIG + " " + CONFIG_PATH;
    notify('Saving…', true);
    const r = await shellExec(cmd);
    if (r.errno === 0) notify('Saved. Restart hooked apps to apply.', true);
    else notify('Save failed: ' + (r.stderr || ('errno=' + r.errno)), false);
  }

  /* ---------- App list ---------- */
  async function loadInstalledApps() {
    const list = document.getElementById('app-list');
    if (!list) return;
    list.innerHTML = '<div class="hint">Loading installed packages…</div>';
    if (!API) { list.innerHTML = '<div class="hint err">No root API — cannot list packages.</div>'; return; }
    const out = await sh('pm list packages -3 2>/dev/null; pm list packages -s 2>/dev/null');
    const set = new Set();
    out.split(/\r?\n/).forEach(l => { const m = l.match(/^package:(.+)$/); if (m) set.add(m[1].trim()); });
    installedApps = Array.from(set).sort().map(pkg => ({ pkg, label: pkg }));
    allowedApps.forEach(p => { if (p && p !== '*' && !set.has(p)) installedApps.push({ pkg: p, label: p + ' (manual)' }); });
    renderAppList(((document.getElementById('app-search') || {}).value) || '');
  }

  function renderAppList(filter) {
    const list = document.getElementById('app-list');
    if (!list) return;
    list.innerHTML = '';
    const q = (filter || '').toLowerCase();
    const items = installedApps.filter(a => !q || a.pkg.toLowerCase().includes(q));
    if (items.length === 0) { list.innerHTML = '<div class="hint">No matching packages</div>'; return; }
    const frag = document.createDocumentFragment();
    items.slice(0, 500).forEach(a => {
      const row = document.createElement('label'); row.className = 'app-row';
      const cb = document.createElement('input'); cb.type = 'checkbox';
      cb.checked = allowedApps.has(a.pkg);
      cb.addEventListener('change', () => { cb.checked ? allowedApps.add(a.pkg) : allowedApps.delete(a.pkg); });
      const span = document.createElement('span'); span.textContent = a.label;
      row.appendChild(cb); row.appendChild(span); frag.appendChild(row);
    });
    list.appendChild(frag);
    if (items.length > 500) {
      const more = document.createElement('div'); more.className = 'hint';
      more.textContent = 'Showing 500 of ' + items.length + '. Refine search to see more.';
      list.appendChild(more);
    }
  }

  /* ---------- Init ---------- */
  function setVersion() {
    sh('grep "^version=" ' + MODDIR + '/module.prop 2>/dev/null | head -1').then(v => {
      const ver = (v || '').trim().replace(/^version=/, '');
      const el = document.getElementById('version-text');
      if (el && ver) el.textContent = ver;
    });
  }

  function applyPreset(key) {
    const preset = PIXEL_DEVICES[key];
    if (!preset) return;
    Object.entries(preset).forEach(([k, v]) => {
      if (k === 'name') return;
      const el = document.getElementById(k);
      if (el) el.value = v;
    });
    notify('Preset "' + preset.name + '" applied — press Save to write config', true);
  }

  function bind(id, evt, fn) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(evt, fn);
  }

  function showApiBanner() {
    const banner = document.getElementById('api-banner');
    if (!banner) return;
    if (!API) {
      banner.style.display = 'block';
      banner.className = 'banner err';
      banner.textContent = 'No root WebUI bridge detected. Open this page from KernelSU / APatch / MMRL / Magisk WebUIX.';
    } else {
      banner.style.display = 'block';
      banner.className = 'banner ok';
      banner.textContent = 'Connected via ' + API_NAME.toUpperCase() + ' bridge.';
      setTimeout(() => { banner.style.display = 'none'; }, 2500);
    }
  }

  function init() {
    API = detectApi();
    showApiBanner();

    // Populate preset dropdown
    const sel = document.getElementById('device-preset');
    if (sel) {
      Object.entries(PIXEL_DEVICES).forEach(([key, dev]) => {
        const opt = document.createElement('option');
        opt.value = key; opt.textContent = dev.name;
        sel.appendChild(opt);
      });
      sel.addEventListener('change', e => applyPreset(e.target.value));
    }

    setVersion();
    loadConfig().catch(e => notify('Load failed: ' + e, false));
    loadInstalledApps().catch(e => notify('App list failed: ' + e, false));

    bind('app-search', 'input', e => renderAppList(e.target.value));
    bind('clear-apps', 'click', () => {
      allowedApps.clear();
      renderAppList(((document.getElementById('app-search') || {}).value) || '');
      notify('Cleared app list', true);
    });
    bind('reload-apps', 'click', () => loadInstalledApps());
    bind('add-app-btn', 'click', () => {
      const inp = document.getElementById('add-app-input');
      const pkg = (inp && inp.value || '').trim();
      if (pkg) {
        allowedApps.add(pkg);
        if (inp) inp.value = '';
        if (!installedApps.some(a => a.pkg === pkg)) installedApps.push({ pkg, label: pkg + ' (manual)' });
        renderAppList(((document.getElementById('app-search') || {}).value) || '');
      }
    });
    bind('add-app-input', 'keydown', e => { if (e.key === 'Enter') document.getElementById('add-app-btn').click(); });
    bind('save-btn', 'click', saveConfig);
  }

  // Catch any unhandled init errors so the UI doesn't go blank
  window.addEventListener('error', (e) => {
    console.error('[PixelTester] uncaught:', e.message);
    const s = document.getElementById('save-status');
    if (s) { s.textContent = 'JS error: ' + e.message; s.className = 'status err'; }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
