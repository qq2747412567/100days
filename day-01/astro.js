/* 纸上夜空的天球计算。
   行星：JPL 近似开普勒根数（1800–2050，J2000 黄道）。
   月亮：平均根数加主要摄动。
   恒星岁差：从 J2000 转到当日平春分点。
   农历：以北京时间的朔、冬至和中气推算。供认星，不当历书。 */
(function (root) {
  "use strict";

  const DEG = Math.PI / 180;
  const J2000 = 2451545.0;
  const OBL_J2000 = 23.43928;

  const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
  const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  const MONTH_NAME = ["", "正", "二", "三", "四", "五", "六", "七", "八", "九", "十", "冬", "腊"];
  const DAY_NAME = ["", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十", "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十", "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十"];
  const TERM_NAME = ["春分", "清明", "谷雨", "立夏", "小满", "芒种", "夏至", "小暑", "大暑", "立秋", "处暑", "白露", "秋分", "寒露", "霜降", "立冬", "小雪", "大雪", "冬至", "小寒", "大寒", "立春", "雨水", "惊蛰"];
  /* 十二中气：黄经 -> 农历月 */
  const ZHONG_MONTH = { 270: 11, 300: 12, 330: 1, 0: 2, 30: 3, 60: 4, 90: 5, 120: 6, 150: 7, 180: 8, 210: 9, 240: 10 };
  /* 十二节：换月柱 */
  const JIE = [[315, 2], [345, 3], [15, 4], [45, 5], [75, 6], [105, 7], [135, 8], [165, 9], [195, 10], [225, 11], [255, 0], [285, 1]];

  /* a,e,I,L,varpi,Omega 以及每世纪的变化。1800–2050。 */
  const ELEM = {
    mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.25032350, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
    venus: [0.72333566, 0.00000390, 0.00677672, -0.00004107, 3.39467605, -0.00078890, 181.97909950, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
    earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
    mars: [1.52371034, 0.00001847, 0.09339410, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
    jupiter: [5.20288700, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
    saturn: [9.53667594, -0.00125060, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
    uranus: [19.18916464, -0.00196176, 0.04725744, -0.00004397, 0.77263783, -0.00242939, 313.23810451, 428.48202785, 170.95427630, 0.40805281, 74.01692503, 0.04240589],
    neptune: [30.06992276, 0.00026291, 0.00859048, 0.00005105, 1.77004347, 0.00035372, -55.12002969, 218.45945325, 44.96476227, -0.32241464, 131.78422574, -0.00508664]
  };

  function norm(x) {
    x = x % 360;
    return x < 0 ? x + 360 : x;
  }
  function wrap180(x) {
    x = norm(x);
    return x > 180 ? x - 360 : x;
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  /* 0 时 UT 的儒略日 */
  function jd0(y, m, d) {
    let Y = y, M = m;
    if (M <= 2) { Y -= 1; M += 12; }
    const A = Math.floor(Y / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + d + B - 1524.5;
  }
  function jdFromUnix(ms) { return ms / 86400000 + 2440587.5; }
  function jdFromBeijing(y, m, d, h, min, s) {
    return jd0(y, m, d) + ((h || 0) - 8) / 24 + (min || 0) / 1440 + (s || 0) / 86400;
  }
  function beijingFromJd(jd) {
    const ms = (jd - 2440587.5) * 86400000 + 8 * 3600000;
    const dt = new Date(ms);
    return {
      y: dt.getUTCFullYear(),
      m: dt.getUTCMonth() + 1,
      d: dt.getUTCDate(),
      h: dt.getUTCHours(),
      min: dt.getUTCMinutes(),
      s: dt.getUTCSeconds(),
      week: "日一二三四五六"[dt.getUTCDay()]
    };
  }
  function ymdNum(p) { return p.y * 10000 + p.m * 100 + p.d; }
  function civilSerial(y, m, d) { return Math.round(jd0(y, m, d)); }

  function centuries(jd) { return (jd - J2000) / 36525; }

  function gmst(jd) {
    const T = centuries(jd);
    const g = 280.46061837 + 360.98564736629 * (jd - J2000) + 0.000387933 * T * T - (T * T * T) / 38710000;
    return norm(g);
  }
  function lst(jd, lonEast) { return norm(gmst(jd) + lonEast); }

  function obliquity(jd) {
    const T = centuries(jd);
    const sec = 21.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T;
    return 23 + 26 / 60 + sec / 3600;
  }

  function precess(raDeg, decDeg, jd) {
    const T = centuries(jd);
    const as = DEG / 3600;
    const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) * as;
    const zed = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) * as;
    const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) * as;
    const ra = raDeg * DEG;
    const dec = decDeg * DEG;
    const A = Math.cos(dec) * Math.sin(ra + zeta);
    const B = Math.cos(theta) * Math.cos(dec) * Math.cos(ra + zeta) - Math.sin(theta) * Math.sin(dec);
    const C = Math.sin(theta) * Math.cos(dec) * Math.cos(ra + zeta) + Math.cos(theta) * Math.sin(dec);
    const ra2 = Math.atan2(A, B) + zed;
    const dec2 = Math.asin(clamp(C, -1, 1));
    return { ra: norm(ra2 / DEG), dec: dec2 / DEG };
  }

  function eqToEcl(raDeg, decDeg, epsDeg) {
    const a = raDeg * DEG, d = decDeg * DEG, e = epsDeg * DEG;
    const x = Math.cos(d) * Math.cos(a);
    const y = Math.cos(d) * Math.sin(a);
    const z = Math.sin(d);
    const ye = y * Math.cos(e) + z * Math.sin(e);
    const ze = -y * Math.sin(e) + z * Math.cos(e);
    return {
      lon: norm(Math.atan2(ye, x) / DEG),
      lat: Math.atan2(ze, Math.hypot(x, ye)) / DEG
    };
  }

  function eclToEq(lonDeg, latDeg, epsDeg) {
    const l = lonDeg * DEG, b = latDeg * DEG, e = epsDeg * DEG;
    const x = Math.cos(b) * Math.cos(l);
    const y = Math.cos(b) * Math.sin(l);
    const z = Math.sin(b);
    const ye = y * Math.cos(e) - z * Math.sin(e);
    const ze = y * Math.sin(e) + z * Math.cos(e);
    return {
      ra: norm(Math.atan2(ye, x) / DEG),
      dec: Math.atan2(ze, Math.hypot(x, ye)) / DEG
    };
  }

  function kepler(Mdeg, e) {
    let M = wrap180(Mdeg) * DEG;
    let E = M + e * Math.sin(M);
    for (let i = 0; i < 16; i++) {
      const dE = (M - (E - e * Math.sin(E))) / (1 - e * Math.cos(E));
      E += dE;
      if (Math.abs(dE) < 1e-12) break;
    }
    return E;
  }

  function helioEcliptic(id, jd) {
    const T = centuries(jd);
    const p = ELEM[id];
    const a = p[0] + p[1] * T;
    const e = p[2] + p[3] * T;
    const I = p[4] + p[5] * T;
    const L = p[6] + p[7] * T;
    const wbar = p[8] + p[9] * T;
    const Om = p[10] + p[11] * T;
    const w = wbar - Om;
    const E = kepler(L - wbar, e);
    const cosE = Math.cos(E), sinE = Math.sin(E);
    const xp = a * (cosE - e);
    const yp = a * Math.sqrt(Math.max(0, 1 - e * e)) * sinE;
    const wr = w * DEG, Or = Om * DEG, Ir = I * DEG;
    const cw = Math.cos(wr), sw = Math.sin(wr);
    const cO = Math.cos(Or), sO = Math.sin(Or);
    const cI = Math.cos(Ir), sI = Math.sin(Ir);
    const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
    const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
    const z = (sw * sI) * xp + (cw * sI) * yp;
    return { x: x, y: y, z: z, r: Math.hypot(x, y, z) };
  }

  function equatorialFromEclipticJ2000(x, y, z) {
    const e = OBL_J2000 * DEG;
    const xe = x;
    const ye = y * Math.cos(e) - z * Math.sin(e);
    const ze = y * Math.sin(e) + z * Math.cos(e);
    return {
      ra: norm(Math.atan2(ye, xe) / DEG),
      dec: Math.atan2(ze, Math.hypot(xe, ye)) / DEG,
      dist: Math.hypot(xe, ye, ze)
    };
  }

  function sunJ2000(jd) {
    const earth = helioEcliptic("earth", jd);
    return equatorialFromEclipticJ2000(-earth.x, -earth.y, -earth.z);
  }

  function sunEquatorial(jd) {
    const s = sunJ2000(jd);
    const p = precess(s.ra, s.dec, jd);
    const ecl = eqToEcl(p.ra, p.dec, obliquity(jd));
    return { ra: p.ra, dec: p.dec, dist: s.dist, lon: ecl.lon, lat: ecl.lat };
  }

  function planetEquatorial(id, jd) {
    const planet = helioEcliptic(id, jd);
    const earth = helioEcliptic("earth", jd);
    const x = planet.x - earth.x;
    const y = planet.y - earth.y;
    const z = planet.z - earth.z;
    const eq = equatorialFromEclipticJ2000(x, y, z);
    const pr = precess(eq.ra, eq.dec, jd);
    const ecl = eqToEcl(pr.ra, pr.dec, obliquity(jd));
    const R = eq.dist;
    const r = planet.r;
    const s = earth.r;
    const fv = Math.acos(clamp((r * r + R * R - s * s) / (2 * r * R), -1, 1)) / DEG;
    const elong = Math.acos(clamp((s * s + R * R - r * r) / (2 * s * R), -1, 1)) / DEG;
    const illum = (1 + Math.cos(fv * DEG)) / 2;
    const magInfo = planetMagnitude(id, r, R, fv, ecl.lon, ecl.lat, jd);
    const sun = sunEquatorial(jd);
    const signedElong = wrap180(ecl.lon - sun.lon);
    return {
      ra: pr.ra, dec: pr.dec, dist: R, rHelio: r,
      lon: ecl.lon, lat: ecl.lat,
      fv: fv, elong: elong, signedElong: signedElong, illum: illum,
      mag: magInfo.mag, ringB: magInfo.ringB
    };
  }

  function planetMagnitude(id, r, R, fv, lon, lat, jd) {
    const base = 5 * Math.log10(r * R);
    let mag = base;
    let ringB = 0;
    if (id === "mercury") mag = -0.36 + base + 0.027 * fv + 2.2e-13 * Math.pow(fv, 6);
    else if (id === "venus") mag = -4.34 + base + 0.013 * fv + 4.2e-7 * Math.pow(fv, 3);
    else if (id === "mars") mag = -1.51 + base + 0.016 * fv;
    else if (id === "jupiter") mag = -9.25 + base + 0.014 * fv;
    else if (id === "saturn") {
      const day = jd - 2451543.5;
      const ir = 28.06 * DEG;
      const Nr = (169.51 + 3.82e-5 * day) * DEG;
      const las = lat * DEG, los = lon * DEG;
      const B = Math.asin(clamp(Math.sin(las) * Math.cos(ir) - Math.cos(las) * Math.sin(ir) * Math.sin(los - Nr), -1, 1));
      ringB = B / DEG;
      mag = -9.0 + base + 0.044 * fv + (-2.6 * Math.sin(Math.abs(B)) + 1.2 * Math.pow(Math.sin(B), 2));
    } else if (id === "uranus") mag = -7.15 + base + 0.001 * fv;
    else if (id === "neptune") mag = -6.90 + base + 0.001 * fv;
    return { mag: mag, ringB: ringB };
  }

  /* 月亮：当日平春分点，不再叠加岁差。 */
  function moonEquatorial(jd) {
    const d = jd - 2451543.5;
    const N = norm(125.1228 - 0.0529538083 * d);
    const i = 5.1454;
    const w = norm(318.0634 + 0.1643573223 * d);
    const a = 60.2666;
    const e = 0.0549;
    const M = norm(115.3654 + 13.0649929509 * d);
    const E = kepler(M, e);
    const xv = a * (Math.cos(E) - e);
    const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const v = Math.atan2(yv, xv) / DEG;
    const r0 = Math.hypot(xv, yv);
    const Nr = N * DEG, ir = i * DEG, vwr = (v + w) * DEG;
    let xh = r0 * (Math.cos(Nr) * Math.cos(vwr) - Math.sin(Nr) * Math.sin(vwr) * Math.cos(ir));
    let yh = r0 * (Math.sin(Nr) * Math.cos(vwr) + Math.cos(Nr) * Math.sin(vwr) * Math.cos(ir));
    let zh = r0 * Math.sin(vwr) * Math.sin(ir);
    let lon = Math.atan2(yh, xh) / DEG;
    let lat = Math.atan2(zh, Math.hypot(xh, yh)) / DEG;
    let r = r0;
    const Ms = norm(356.0470 + 0.9856002585 * d);
    const ws = norm(282.9404 + 4.70935e-5 * d);
    const Lm = norm(M + w + N);
    const Ls = norm(Ms + ws);
    const D = Lm - Ls;
    const F = Lm - N;
    const s = (x) => Math.sin(x * DEG);
    const c = (x) => Math.cos(x * DEG);
    lon += -1.274 * s(M - 2 * D) + 0.658 * s(2 * D) - 0.186 * s(Ms) - 0.059 * s(2 * M - 2 * D)
      - 0.057 * s(M - 2 * D + Ms) + 0.053 * s(M + 2 * D) + 0.046 * s(2 * D - Ms) + 0.041 * s(M - Ms)
      - 0.035 * s(D) - 0.031 * s(M + Ms) - 0.015 * s(2 * F - 2 * D) + 0.011 * s(M - 4 * D);
    lat += -0.173 * s(F - 2 * D) - 0.055 * s(M - F - 2 * D) - 0.046 * s(M + F - 2 * D)
      + 0.033 * s(F + 2 * D) + 0.017 * s(2 * M + F);
    r += -0.58 * c(M - 2 * D) - 0.46 * c(2 * D);
    lon = norm(lon);
    const eq = eclToEq(lon, lat, obliquity(jd));
    const sun = sunEquatorial(jd);
    const elongSigned = wrap180(lon - sun.lon);
    const elong = Math.acos(clamp(Math.cos((sun.lon - lon) * DEG) * Math.cos(lat * DEG), -1, 1)) / DEG;
    const fv = 180 - elong;
    const illum = (1 + Math.cos(fv * DEG)) / 2;
    const hp = Math.asin(clamp(1 / r, -1, 1)) / DEG;
    return {
      ra: eq.ra, dec: eq.dec, distER: r, lon: lon, lat: lat,
      elong: elong, signedElong: elongSigned, illum: illum, fv: fv,
      hp: hp, sd: 0.2725 * hp
    };
  }

  function altAz(raDeg, decDeg, latDeg, lstDeg) {
    const ha = wrap180(lstDeg - raDeg) * DEG;
    const dec = decDeg * DEG;
    const lat = latDeg * DEG;
    const sinAlt = Math.sin(dec) * Math.sin(lat) + Math.cos(dec) * Math.cos(lat) * Math.cos(ha);
    const alt = Math.asin(clamp(sinAlt, -1, 1));
    const cosAlt = Math.cos(alt);
    let az = 0;
    if (cosAlt > 1e-8) {
      const sinAz = -Math.cos(dec) * Math.sin(ha) / cosAlt;
      const cosAz = (Math.sin(dec) * Math.cos(lat) - Math.cos(dec) * Math.sin(lat) * Math.cos(ha)) / cosAlt;
      az = Math.atan2(sinAz, cosAz) / DEG;
    }
    return { alt: alt / DEG, az: norm(az) };
  }

  function refraction(altDeg) {
    if (altDeg < -1) return 0;
    const arg = (altDeg + 7.31 / (altDeg + 4.4)) * DEG;
    if (arg <= 0.01) return 0.6;
    return clamp((1 / Math.tan(arg)) / 60, 0, 0.6);
  }

  /* 视高度。月亮减去地平视差。太阳计上边缘。 */
  function apparentAlt(geoAlt, kind, hp) {
    const ref = refraction(geoAlt);
    if (kind === "moon") return geoAlt + ref - (hp || 0) * Math.cos(Math.max(geoAlt, 0) * DEG);
    if (kind === "sun") return geoAlt + ref + 0.25;
    return geoAlt + ref;
  }

  function galToEq(lDeg, bDeg) {
    const l = lDeg * DEG, b = bDeg * DEG;
    const poleDec = 27.12825 * DEG;
    const poleRa = 192.85948;
    const lNcp = 122.93192 * DEG;
    const sinDec = Math.sin(b) * Math.sin(poleDec) + Math.cos(b) * Math.cos(poleDec) * Math.cos(lNcp - l);
    const dec = Math.asin(clamp(sinDec, -1, 1));
    const y = Math.cos(b) * Math.sin(lNcp - l);
    const x = Math.cos(poleDec) * Math.sin(b) - Math.sin(poleDec) * Math.cos(b) * Math.cos(lNcp - l);
    const ra = norm(Math.atan2(y, x) / DEG + poleRa);
    return { ra: ra, dec: dec / DEG };
  }

  function sunLon(jd) { return sunEquatorial(jd).lon; }

  function nextSunLon(target, startJd) {
    let need = norm(target - sunLon(startJd));
    if (need < 1e-4) need = 360;
    let t = startJd + need / 0.98564736;
    for (let i = 0; i < 16; i++) {
      const diff = wrap180(target - sunLon(t));
      t += diff / 0.98564736;
      if (Math.abs(diff) < 1e-6) break;
    }
    return t;
  }

  function termIndex(lon) {
    const L = norm(lon);
    return Math.floor(L / 15) % 24;
  }
  function termInfo(jd) {
    const lon = sunLon(jd);
    const idx = termIndex(lon);
    const startLon = idx * 15;
    const into = norm(lon - startLon);
    const start = jd - into / 0.98564736;
    const nextLon = (startLon + 15) % 360;
    const next = nextSunLon(nextLon, jd);
    return {
      name: TERM_NAME[idx],
      index: idx,
      lon: lon,
      days: into / 0.98564736,
      startJd: start,
      nextName: TERM_NAME[(idx + 1) % 24],
      nextJd: next
    };
  }

  function elongation180(jd) {
    const moon = moonEquatorial(jd);
    const sun = sunEquatorial(jd);
    return wrap180(moon.lon - sun.lon);
  }

  function nextNewMoon(startJd) {
    let t = startJd;
    let f = elongation180(t);
    for (let step = 0; step < 80; step++) {
      const t1 = t + 0.5;
      const f1 = elongation180(t1);
      if (f < 0 && f1 >= 0 && (t1 - t) < 1) {
        let lo = t, hi = t1;
        for (let k = 0; k < 46; k++) {
          const mid = (lo + hi) / 2;
          if (elongation180(mid) < 0) lo = mid;
          else hi = mid;
        }
        return (lo + hi) / 2;
      }
      t = t1;
      f = f1;
    }
    return NaN;
  }

  function newMoonsBetween(t0, t1) {
    const out = [];
    let t = t0;
    for (let guard = 0; guard < 80 && t < t1; guard++) {
      const n = nextNewMoon(t);
      if (!isFinite(n) || n <= t || n >= t1) break;
      out.push(n);
      t = n + 2;
    }
    return out;
  }

  /* 中气算进哪个朔望月，按北京时间的日期，不按同一天里谁先谁后。
     中气若与朔落在同一天，这一天已经是下月初一，中气归下个月。 */
  function monthZhong(jdStart, jdEnd) {
    const startYmd = ymdNum(beijingFromJd(jdStart));
    const endYmd = ymdNum(beijingFromJd(jdEnd));
    const mid = (jdStart + jdEnd) / 2;
    const longs = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
    for (let i = 0; i < longs.length; i++) {
      const L = longs[i];
      let t = mid;
      for (let k = 0; k < 12; k++) {
        const diff = wrap180(L - sunLon(t));
        t += diff / 0.98564736;
        if (Math.abs(diff) < 1e-5) break;
      }
      const hit = ymdNum(beijingFromJd(t));
      if (hit >= startYmd && hit < endYmd) return L;
    }
    return null;
  }

  const lunarCache = new Map();
  let span = null;

  function monthIndexAt(moons, jd) {
    const ymd = ymdNum(beijingFromJd(jd));
    let idx = -1;
    for (let k = 0; k < moons.length; k++) {
      if (moons[k].ymd <= ymd) idx = k;
      else break;
    }
    if (idx < 0 || idx >= moons.length - 1) return -1;
    return idx;
  }

  function buildSpan(t0, t1) {
    const moons = newMoonsBetween(t0, t1).map(function (jd) {
      const p = beijingFromJd(jd);
      return { jd: jd, y: p.y, m: p.m, d: p.d, ymd: ymdNum(p) };
    });
    const labels = new Map();
    const dong = [];
    let scan = t0;
    while (scan < t1) {
      const z = nextSunLon(270, scan);
      if (!isFinite(z) || z <= scan || z >= t1) break;
      dong.push(z);
      scan = z + 20;
    }
    for (let i = 0; i < dong.length - 1; i++) {
      const iA = monthIndexAt(moons, dong[i]);
      const iB = monthIndexAt(moons, dong[i + 1]);
      if (iA < 0 || iB <= iA) continue;
      let prevNum = 11;
      for (let k = iA; k < iB; k++) {
        const L = monthZhong(moons[k].jd, moons[k + 1].jd);
        if (L == null) {
          labels.set(moons[k].jd, { num: prevNum, leap: true });
        } else {
          const num = ZHONG_MONTH[L];
          labels.set(moons[k].jd, { num: num, leap: false });
          prevNum = num;
        }
      }
    }
    span = { t0: t0, t1: t1, moons: moons, labels: labels };
  }

  function ensureSpan(jd) {
    const need0 = jd - 620;
    const need1 = jd + 460;
    if (span && need0 >= span.t0 && need1 <= span.t1) return;
    buildSpan(need0, need1);
    lunarCache.clear();
  }

  function lunarCalendar(y, m, d) {
    const key = y * 10000 + m * 100 + d;
    if (lunarCache.has(key)) return lunarCache.get(key);
    const anchor = jdFromBeijing(y, m, d, 12, 0, 0);
    ensureSpan(anchor);
    const moons = span.moons;
    const labels = span.labels;
    const target = key;
    let idx = -1;
    for (let i = 0; i < moons.length; i++) if (moons[i].ymd <= target) idx = i;
    if (idx < 0) return null;
    const day = civilSerial(y, m, d) - civilSerial(moons[idx].y, moons[idx].m, moons[idx].d) + 1;
    const label = labels.get(moons[idx].jd);
    if (!label || day < 1 || day > 30) return null;

    const yearStart = findZhengyue(labels, moons, idx);
    if (!yearStart) return null;
    const yearNum = yearStart.y;
    const stem = (yearNum - 4) % 10;
    const branch = (yearNum - 4) % 12;
    const yearName = STEMS[(stem + 10) % 10] + BRANCHES[(branch + 12) % 12];
    const animal = ["鼠", "牛", "虎", "兔", "龙", "蛇", "马", "羊", "猴", "鸡", "狗", "猪"][(branch + 12) % 12];
    const monthLabel = (label.leap ? "闰" : "") + MONTH_NAME[label.num] + "月";
    const text = yearName + "年" + monthLabel + DAY_NAME[day];

    const pillars = pillarsFor(y, m, d, yearName);
    const value = {
      text: text,
      yearName: yearName,
      animal: animal,
      month: label.num,
      leap: label.leap,
      day: day,
      monthLabel: monthLabel,
      dayLabel: DAY_NAME[day],
      yearPillar: pillars.baziYear,
      lunarYearPillar: pillars.year,
      monthPillar: pillars.month,
      dayPillar: pillars.day,
      newMoonJd: moons[idx].jd
    };
    lunarCache.set(key, value);
    return value;
  }

  function findZhengyue(labels, moons, idx) {
    for (let k = idx; k >= 0; k--) {
      const lab = labels.get(moons[k].jd);
      if (lab && lab.num === 1 && !lab.leap) return moons[k];
    }
    return null;
  }

  /* 日柱以 2026-11-09 = 丁亥 校准，六十甲子不间断。 */
  function dayPillarIndex(y, m, d) {
    const serial = civilSerial(y, m, d);
    const known = civilSerial(2026, 11, 9);
    return ((serial - known) % 60 + 60 + 23) % 60;
  }
  function pillarName(index) {
    return STEMS[((index % 10) + 10) % 10] + BRANCHES[((index % 12) + 12) % 12];
  }

  /* 不晚于 jd 的那一次节气 */
  function termOnOrBefore(targetLon, jd) {
    let z = nextSunLon(targetLon, jd - 400);
    for (let i = 0; i < 3; i++) {
      const n = nextSunLon(targetLon, z + 20);
      if (n <= jd + 1e-6) z = n;
      else break;
    }
    if (z > jd) z = nextSunLon(targetLon, jd - 800);
    return z;
  }

  function lichunYear(y, m, d) {
    const jd = jdFromBeijing(y, m, d, 12, 0, 0);
    return beijingFromJd(termOnOrBefore(315, jd)).y;
  }

  function monthBranch(y, m, d) {
    const jd = jdFromBeijing(y, m, d, 12, 0, 0);
    let best = null;
    for (let i = 0; i < JIE.length; i++) {
      const z = termOnOrBefore(JIE[i][0], jd);
      if (z <= jd && (best == null || z > best.jd)) best = { jd: z, branch: JIE[i][1] };
    }
    return best ? best.branch : 11;
  }

  function pillarsFor(y, m, d, lunarYearName) {
    const baziYear = lichunYear(y, m, d);
    const yStem = ((baziYear - 4) % 10 + 10) % 10;
    /* 五虎遁：甲己丙、乙庚戊、丙辛庚、丁壬壬、戊癸甲 */
    const yinStem = [2, 4, 6, 8, 0][yStem % 5];
    const mb = monthBranch(y, m, d);
    const steps = (mb - 2 + 12) % 12;
    const mStem = (yinStem + steps) % 10;
    return {
      year: lunarYearName,
      baziYear: STEMS[yStem] + BRANCHES[((baziYear - 4) % 12 + 12) % 12],
      month: STEMS[mStem] + BRANCHES[mb],
      day: pillarName(dayPillarIndex(y, m, d))
    };
  }

  function phaseName(signedElong, illum) {
    const e = norm(signedElong);
    if (illum < 0.02 || e < 8 || e > 352) return "朔";
    if (illum > 0.98 || (e > 172 && e < 188)) return "望";
    if (e < 80) return "蛾眉月";
    if (e < 100) return "上弦";
    if (e < 172) return "盈凸月";
    if (e < 260) return "亏凸月";
    if (e < 280) return "下弦";
    return "残月";
  }

  function azName(az) {
    const names = ["北", "北偏东", "东北", "东偏北", "东", "东偏南", "东南", "南偏东", "南", "南偏西", "西南", "西偏南", "西", "西偏北", "西北", "北偏西"];
    return names[Math.round(norm(az) / 22.5) % 16];
  }

  function formatBeijing(jd, withDate) {
    const p = beijingFromJd(jd);
    const hm = pad(p.h) + ":" + pad(p.min);
    if (!withDate) return hm;
    return p.y + "年" + p.m + "月" + p.d + "日 " + hm;
  }

  function crossings(altFn, t0, t1, level) {
    const step = 8 / 1440;
    const events = [];
    let prevT = t0;
    let prevA = altFn(prevT);
    for (let t = t0 + step; t <= t1; t += step) {
      const a = altFn(t);
      if ((prevA - level) * (a - level) <= 0 && prevA !== a) {
        let lo = prevT, hi = t, alo = prevA;
        for (let k = 0; k < 22; k++) {
          const mid = (lo + hi) / 2;
          const am = altFn(mid);
          if ((alo - level) * (am - level) <= 0) hi = mid;
          else { lo = mid; alo = am; }
        }
        events.push({ jd: (lo + hi) / 2, rising: a > prevA });
      }
      prevT = t;
      prevA = a;
    }
    return events;
  }

  function colorWord(bv) {
    if (bv == null || isNaN(bv)) return "";
    if (bv < 0) return "蓝白";
    if (bv < 0.3) return "白";
    if (bv < 0.6) return "黄白";
    if (bv < 0.9) return "黄";
    if (bv < 1.4) return "橙";
    return "红";
  }

  function starRgb(bv) {
    const t = clamp(bv == null || isNaN(bv) ? 0.4 : bv, -0.35, 1.9);
    function mix(a, b, u) {
      return [Math.round(a[0] + (b[0] - a[0]) * u), Math.round(a[1] + (b[1] - a[1]) * u), Math.round(a[2] + (b[2] - a[2]) * u)];
    }
    if (t < 0.15) return mix([186, 206, 255], [255, 255, 255], (t + 0.35) / 0.5);
    if (t < 0.6) return mix([255, 255, 255], [255, 236, 196], (t - 0.15) / 0.45);
    if (t < 1.15) return mix([255, 236, 196], [255, 196, 140], (t - 0.6) / 0.55);
    return mix([255, 196, 140], [255, 150, 120], (t - 1.15) / 0.75);
  }

  root.Astro = {
    norm: norm,
    wrap180: wrap180,
    clamp: clamp,
    pad: pad,
    jd0: jd0,
    jdFromUnix: jdFromUnix,
    jdFromBeijing: jdFromBeijing,
    beijingFromJd: beijingFromJd,
    gmst: gmst,
    lst: lst,
    obliquity: obliquity,
    precess: precess,
    sunEquatorial: sunEquatorial,
    planetEquatorial: planetEquatorial,
    moonEquatorial: moonEquatorial,
    altAz: altAz,
    refraction: refraction,
    apparentAlt: apparentAlt,
    galToEq: galToEq,
    sunLon: sunLon,
    nextSunLon: nextSunLon,
    termInfo: termInfo,
    lunarCalendar: lunarCalendar,
    phaseName: phaseName,
    azName: azName,
    formatBeijing: formatBeijing,
    crossings: crossings,
    colorWord: colorWord,
    starRgb: starRgb,
    TERM_NAME: TERM_NAME,
    STEMS: STEMS,
    BRANCHES: BRANCHES
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
