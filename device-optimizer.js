/*
 * GlazedSMP device optimizer.
 * Picks a performance tier (high / mid / low) for each visitor and tunes the site to match.
 *
 * Why it works the way it does (research notes, Q1 2026 shipment reports from IDC, Omdia and Counterpoint):
 *  - Global: Samsung and Apple lead, then Xiaomi (incl. Redmi, POCO), OPPO (incl. realme, OnePlus) and vivo.
 *  - Southeast Asia: Samsung, OPPO/realme, Xiaomi, Transsion (Infinix, Tecno) and vivo, with over 60% of phones under $200.
 *    So budget Android hardware is common here and the site must not assume a flagship.
 *  - India: vivo leads, then Samsung and OPPO. Oceania and Japan lean heavily to Apple and Samsung.
 *  - iOS Safari caps animation at about 30fps in Low Power Mode and has no Battery API,
 *    so that mode is detected from measured frame timing, not from a flag.
 *  - Chrome on Android freezes the User-Agent model to "K", so the real model is read from
 *    userAgentData when available. Brand is only a starting guess. Measured frame rate has the final say.
 *
 * Manual overrides: localStorage glz-lite = "1" forces low, "0" stops it from going lower than mid.
 * Testing: add ?tier=low, ?tier=mid or ?tier=high to the address.
 */
(function () {
  'use strict';
  var D = document, H = D.documentElement, N = navigator, UA = N.userAgent || '';
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* name, UA pattern, starting score (0 to 4), typical segment */
  var BRANDS = [
    ['samsung', /SamsungBrowser|SAMSUNG|\bSM-[A-Z]\d/i, 2],
    ['apple', /iPhone|iPad|iPod/, 3],
    ['xiaomi', /Xiaomi|Redmi|POCO|MiuiBrowser|HyperOS|\bMIUI\b/i, 1.5],
    ['vivo', /\bvivo\b|iQOO|\bV2\d{3}[A-Z]?\b/i, 1.5],
    ['oppo', /OPPO|\bCPH\d{4}|realme|\bRMX\d{4}|OnePlus/i, 1.5],
    ['transsion', /Infinix|TECNO|\bitel\b/i, 1],
    ['honor', /HONOR/i, 1.5],
    ['huawei', /HUAWEI|HarmonyOS/i, 1.5],
    ['google', /Pixel \d/i, 2.5],
    ['motorola', /\bmoto\b|Motorola/i, 1.5]
  ];
  var MODEL = [
    ['samsung', /^SM-/, 2], ['oppo', /^(CPH|RMX)\d/, 1.5], ['vivo', /^V\d{4}/, 1.5],
    ['xiaomi', /^(M?\d{4}[A-Z]\d{1,2}[A-Z]{0,3}|\d{7,9}[A-Z]{1,2})$/, 1.5],
    ['google', /^Pixel/, 2.5], ['transsion', /^(Infinix|TECNO|itel|KJ\d|CK\d)/i, 1]
  ];
  function pick(list, s) { for (var i = 0; i < list.length; i++) if (list[i][1].test(s)) return list[i]; return null; }

  var apple = /iPhone|iPad|iPod/.test(UA) || (N.platform === 'MacIntel' && N.maxTouchPoints > 1);
  var android = /Android/i.test(UA);
  var touch = matchMedia('(pointer:coarse)').matches;
  var mobile = apple || android || touch;
  var b0 = apple ? BRANDS[1] : pick(BRANDS, UA);
  var info = {
    os: apple ? 'ios' : android ? 'android' : 'desktop',
    brand: b0 ? b0[0] : (mobile ? 'other' : 'desktop'),
    prior: b0 ? b0[2] : (mobile ? 1.8 : 3.2),
    mem: N.deviceMemory || 0, cores: N.hardwareConcurrency || 4,
    net: (N.connection && N.connection.effectiveType) || '', save: !!(N.connection && N.connection.saveData),
    hz: 60, med: 16.7, jank: 0, lpm: false, batt: null, model: ''
  };

  var css = D.createElement('style');
  css.id = 'glz-device-css';
  css.textContent =
    'html.glz-paused *,html.glz-paused *::before,html.glz-paused *::after{animation-play-state:paused!important}' +
    'html[data-tier=mid] .amb{display:none}' +
    'html[data-tier=mid] .nav,html[data-tier=mid] .mm{-webkit-backdrop-filter:blur(8px)!important;backdrop-filter:blur(8px)!important}' +
    'html[data-tier=mid] .rv.in{animation-duration:.8s!important}' +
    'html[data-tier=low] *{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}' +
    'html[data-tier=low] .amb,html[data-tier=low] .spb{display:none!important}' +
    'html[data-tier=low] .card{--rx:0deg!important;--ry:0deg!important}' +
    'html[data-tier=low] .stage{translate:none!important}' +
    'html[data-tier=low] .rv.in{animation-duration:.45s!important;animation-delay:calc(var(--d,0)*30ms)!important}' +
    'html[data-tier=low] .page:not([hidden]){animation-duration:.4s!important}' +
    'html[data-tier=low] .plc{animation:none}' +
    'html[data-lpm=on] .amb,html[data-lpm=on] .ember,html[data-lpm=on] .orb{animation-play-state:paused!important}';
  (D.head || H).appendChild(css);

  var tier = 'mid';
  function score() {
    var s = info.prior;
    if (info.mem && info.mem <= 3) s -= 1.5; else if (info.mem && info.mem <= 4) s -= 0.5; else if (info.mem >= 8) s += 1; else if (info.mem >= 6) s += 0.5;
    if (!apple) { if (info.cores <= 4 && mobile) s -= 0.5; else if (info.cores >= 8) s += 0.5; }
    if (info.save || /(^|-)(2|3)g$/.test(info.net)) s -= 1.5;
    if (info.batt && info.batt.lvl < 0.2 && !info.batt.chg) s -= 1;
    if (info.lpm) s -= 1.5;
    if (info.med > 24) s -= 1.5; else if (info.med > 19) s -= 0.5;
    if (info.jank > 0.2) s -= 1; else if (info.hz >= 90 && info.med < 14) s += 0.5;
    return s;
  }
  function decide() {
    var f = new URLSearchParams(location.search).get('tier'), s = score(), t = s >= 3 ? 'high' : s >= 1.8 ? 'mid' : 'low';
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) t = 'low';
    if (get('glz-lite') === '1') t = 'low';
    else if (get('glz-lite') === '0' && t === 'low') t = 'mid';
    if (f === 'low' || f === 'mid' || f === 'high') t = f;
    return t;
  }
  function apply(why) {
    var t = decide();
    tier = t;
    H.dataset.tier = t; H.dataset.hz = String(info.hz); H.dataset.brand = info.brand; H.dataset.os = info.os;
    H.dataset.lpm = info.lpm ? 'on' : 'off';
    H.classList.toggle('lite', t === 'low');
    H.style.setProperty('--ms', t === 'high' ? '1' : t === 'mid' ? '.8' : '.55');
    api.tier = t; api.info = info;
    D.dispatchEvent(new CustomEvent('glz-device', { detail: { tier: t, info: info, why: why || '' } }));
  }

  function sample(n, done) {
    var ts = [], last = 0;
    (function f(t) {
      if (last) ts.push(t - last);
      last = t;
      if (ts.length < n) requestAnimationFrame(f);
      else {
        ts = ts.filter(function (x) { return x < 250; }).sort(function (a, b) { return a - b; });
        if (!ts.length) return;
        var med = ts[ts.length >> 1], bad = ts.filter(function (x) { return x > 34; }).length / ts.length;
        done({ med: med, jank: bad });
      }
    })(0);
  }
  function snapHz(m) {
    var c = [30, 48, 60, 75, 90, 120, 144], r = 1000 / m, best = 60, d = 1e9;
    c.forEach(function (x) { if (Math.abs(x - r) < d) { d = Math.abs(x - r); best = x; } });
    return best;
  }
  function measure(n, why) {
    if (D.hidden) return;
    sample(n, function (r) {
      info.med = r.med; info.jank = r.jank; info.hz = snapHz(r.med);
      info.lpm = apple && r.med > 28 && r.med < 40 && r.jank < 0.15;
      apply(why);
      put('glz-tier', JSON.stringify({ t: tier, ts: Date.now() }));
    });
  }

  var api = {
    tier: tier, info: info,
    setTier: function (t) { put('glz-lite', t === 'low' ? '1' : '0'); apply('manual'); },
    refresh: function () { measure(60, 'refresh'); }
  };
  window.glzDevice = api;

  /* 1. First paint: brand guess plus a cached result from a recent visit (valid for 7 days). */
  try {
    var c = JSON.parse(get('glz-tier') || 'null');
    if (c && Date.now() - c.ts < 6048e5) { info.prior = { high: 3.2, mid: 2.2, low: 1 }[c.t] || info.prior; }
  } catch (e) {}
  apply('initial');

  /* 2. Refine the guess: real model, battery, network. */
  if (N.userAgentData && N.userAgentData.getHighEntropyValues) {
    N.userAgentData.getHighEntropyValues(['model']).then(function (m) {
      var s = m.model || ''; info.model = s;
      var hit = s && pick(MODEL, s);
      if (hit && (info.brand === 'other' || info.brand === 'desktop' || info.brand === hit[0])) { info.brand = hit[0]; info.prior = hit[2]; apply('model'); }
    }).catch(function () {});
  }
  if (N.getBattery) {
    N.getBattery().then(function (b) {
      function up() { info.batt = { lvl: b.level, chg: b.charging }; apply('battery'); }
      up(); b.addEventListener('levelchange', up); b.addEventListener('chargingchange', up);
    }).catch(function () {});
  }
  if (N.connection && N.connection.addEventListener) N.connection.addEventListener('change', function () {
    info.net = N.connection.effectiveType || ''; info.save = !!N.connection.saveData; apply('network');
  });
  matchMedia('(prefers-reduced-motion:reduce)').addEventListener('change', function () { apply('motion'); });

  /* 3. Measure real frame timing after load, then again on the first scroll or touch (when the page is busiest). */
  function go() { setTimeout(function () { measure(90, 'load'); }, 600); }
  if (D.readyState === 'complete') go(); else addEventListener('load', go, { once: true });
  var once = function () {
    removeEventListener('scroll', once); removeEventListener('touchmove', once);
    setTimeout(function () { sample(60, function (r) {
      if ((r.med > 26 || r.jank > 0.18) && tier !== 'low') { info.med = Math.max(info.med, r.med); info.jank = Math.max(info.jank, r.jank); apply('scroll-jank'); put('glz-tier', JSON.stringify({ t: tier, ts: Date.now() })); }
    }); }, 300);
  };
  addEventListener('scroll', once, { passive: true }); addEventListener('touchmove', once, { passive: true });

  /* 4. Save battery: pause every animation while the tab is hidden. */
  D.addEventListener('visibilitychange', function () { H.classList.toggle('glz-paused', D.hidden); });
})();
