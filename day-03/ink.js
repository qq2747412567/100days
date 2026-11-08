/* 墨分五色
 * 每个格子记着水，和还没干的颜色。
 * 水往更干的邻格流，颜色跟着走，但比水慢，所以芯浓边淡。
 * 水蒸发到托不住时，颜色落到干层，就不再流动。
 */
(function (root) {
  "use strict";

  var W = 600;
  var H = 860;
  var N = W * H;
  var INK_UNIT = 0.3;
  var WATER_UNIT = 0.78;
  var PIG_SCALE = 3.4;
  var WATER_SCALE = 2.4;

  var PAPERS = {
    sheng: { id: "sheng", name: "生宣", flow: 0.72, flowX: 1.16, flowY: 0.8, carry: 0.55, evap: 0.011, stick: 0.006, fixAt: 0.03, rim: 0.09 },
    shu: { id: "shu", name: "熟宣", flow: 0.018, flowX: 1, flowY: 1, carry: 0.94, evap: 0.04, stick: 0.09, fixAt: 0.08, rim: 0 },
    pi: { id: "pi", name: "皮纸", flow: 0.28, flowX: 1.06, flowY: 0.9, carry: 0.68, evap: 0.016, stick: 0.02, fixAt: 0.04, rim: 0.045 }
  };

  var BRUSHES = {
    zhong: { id: "zhong", name: "中锋", aspect: 1, soft: 1.4, water: 1, ink: 1, radiusScale: 1, side: false, wide: false, fly: 0, scatter: false, dots: 1, waterOnly: false },
    ce: { id: "ce", name: "侧锋", aspect: 0.36, soft: 1.05, water: 0.92, ink: 1.02, radiusScale: 1.2, side: true, wide: true, fly: 0.04, scatter: false, dots: 1, waterOnly: false },
    ku: { id: "ku", name: "枯笔", aspect: 0.58, soft: 0.62, water: 0.3, ink: 1.18, radiusScale: 1.08, side: true, wide: true, fly: 0.52, scatter: false, dots: 1, waterOnly: false },
    tai: { id: "tai", name: "点苔", aspect: 1, soft: 1.55, water: 0.78, ink: 1.08, radiusScale: 0.9, side: false, wide: false, fly: 0.12, scatter: true, dots: 4, waterOnly: false },
    po: { id: "po", name: "泼墨", aspect: 1, soft: 1.7, water: 1.55, ink: 0.62, radiusScale: 2.05, side: false, wide: false, fly: 0.05, scatter: false, dots: 1, waterOnly: false },
    shui: { id: "shui", name: "清水", aspect: 1, soft: 1.65, water: 1.75, ink: 0, radiusScale: 1.4, side: false, wide: false, fly: 0, scatter: false, dots: 1, waterOnly: true }
  };

  var TONES = {
    jiao: { id: "jiao", name: "焦", ink: 1, water: 0.32 },
    nong: { id: "nong", name: "浓", ink: 0.74, water: 0.5 },
    zhongmo: { id: "zhongmo", name: "重", ink: 0.5, water: 0.76 },
    dan: { id: "dan", name: "淡", ink: 0.28, water: 1 },
    qing: { id: "qing", name: "清", ink: 0.13, water: 1.26 }
  };

  var PIGMENTS = {
    songyan: { id: "songyan", name: "松烟", a: [1, 0.97, 0.86] },
    youyan: { id: "youyan", name: "油烟", a: [0.88, 0.96, 1] },
    huaqing: { id: "huaqing", name: "花青", a: [0.9, 0.62, 0.28] },
    zheshi: { id: "zheshi", name: "赭石", a: [0.36, 0.6, 0.78] },
    zhusha: { id: "zhusha", name: "朱砂", a: [0.1, 0.88, 0.76] },
    tenghuang: { id: "tenghuang", name: "藤黄", a: [0.06, 0.2, 0.92] },
    shilu: { id: "shilu", name: "石绿", a: [0.58, 0.1, 0.44] }
  };

  var FADE = new Float32Array(2048);
  for (var fi = 0; fi < 2048; fi++) FADE[fi] = Math.exp(-2.35 * (fi / 2048) * 4);

  function fade(mass) {
    var u = mass * (2047 / 4);
    if (u < 0) u = 0;
    else if (u > 2047) u = 2047;
    return FADE[u | 0];
  }

  function hash2(x, y, seed) {
    var n = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ (seed | 0);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function vnoise(x, y, seed) {
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var tx = x - x0;
    var ty = y - y0;
    var sx = tx * tx * (3 - 2 * tx);
    var sy = ty * ty * (3 - 2 * ty);
    var a = hash2(x0, y0, seed);
    var b = hash2(x0 + 1, y0, seed);
    var c = hash2(x0, y0 + 1, seed);
    var d = hash2(x0 + 1, y0 + 1, seed);
    return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
  }

  function mulberry32(seed) {
    var a = seed | 0;
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp0(v) {
    if (v < 0) return 0;
    if (v > 3.4) return 3.4;
    return v;
  }

  function toU8(v, scale) {
    if (v <= 0) return 0;
    var x = v / scale;
    if (x >= 1) return 255;
    return (x * 255 + 0.5) | 0;
  }

  function fromU8(b, scale) {
    return (b / 255) * scale;
  }

  function swatchCss(absorb, amount) {
    var r = Math.round(243 * Math.exp(-2.35 * absorb[0] * amount));
    var g = Math.round(232 * Math.exp(-2.35 * absorb[1] * amount));
    var b = Math.round(214 * Math.exp(-2.35 * absorb[2] * amount));
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }

  function createSheet(seed) {
    var paperId = "sheng";
    var paper = PAPERS.sheng;
    var brushId = "zhong";
    var toneId = "nong";
    var pigmentId = "songyan";
    var size = 18;
    var waterMul = 1;
    var turbo = false;
    var moist = false;
    var rng = mulberry32(seed || 1);
    var paperSeed = seed || 1;

    var water = new Float32Array(N);
    var wet0 = new Float32Array(N);
    var wet1 = new Float32Array(N);
    var wet2 = new Float32Array(N);
    var dry0 = new Float32Array(N);
    var dry1 = new Float32Array(N);
    var dry2 = new Float32Array(N);
    var fiber = new Float32Array(N);
    var grain = new Float32Array(N);
    var shade = new Float32Array(N);

    var active = new Uint8Array(N);
    var queues = [new Int32Array(N), new Int32Array(N)];
    var qcount = [0, 0];
    var qi = 0;

    var markStamp = new Uint32Array(N);
    var markList = new Int32Array(N);
    var markN = 0;
    var fluxStamp = new Uint32Array(N);
    var fluxList = new Int32Array(N);
    var fluxN = 0;
    var fW = new Float32Array(N);
    var fR = new Float32Array(N);
    var fG = new Float32Array(N);
    var fB = new Float32Array(N);
    var stampId = 1;
    var outs = new Int32Array(4);
    var amts = new Float32Array(4);
    var bucket = { oc: 0, total: 0 };

    var penX = 0;
    var penY = 0;
    var penDown = false;
    var since = 0;
    var lastRadius = 12;

    function resetFlow() {
      active.fill(0);
      qcount[0] = 0;
      qcount[1] = 0;
      qi = 0;
    }

    function wake(i) {
      if (active[i]) return;
      active[i] = 1;
      var c = qcount[qi];
      if (c >= N) return;
      queues[qi][c] = i;
      qcount[qi] = c + 1;
    }

    function buildPaper(nextSeed) {
      paperSeed = nextSeed >>> 0;
      rng = mulberry32(paperSeed ^ 0x9e3779b9);
      var laidAmp = paperId === "shu" ? 0.012 : paperId === "pi" ? 0.02 : 0.032;
      for (var y = 0; y < H; y++) {
        var row = y * W;
        var laid = 0.5 + 0.5 * Math.sin(y * 0.85);
        for (var x = 0; x < W; x++) {
          var i = row + x;
          var n1 = vnoise(x * 0.018, y * 0.018, paperSeed);
          var n2 = vnoise(x * 0.07, y * 0.05, paperSeed + 3);
          var g = vnoise(x * 0.33, y * 0.29, paperSeed + 11) * 0.62 + vnoise(x * 0.91, y * 0.77, paperSeed + 19) * 0.38;
          fiber[i] = 0.7 + n1 * 0.58;
          grain[i] = g;
          var s = (0.945 + n2 * 0.06) * (1 - laidAmp * laid) * (0.99 + (g - 0.5) * 0.03);
          if (g > 0.975) s *= 0.95;
          shade[i] = s;
        }
      }
    }

    function clearInk() {
      water.fill(0);
      wet0.fill(0);
      wet1.fill(0);
      wet2.fill(0);
      dry0.fill(0);
      dry1.fill(0);
      dry2.fill(0);
      resetFlow();
      moist = false;
      penDown = false;
    }

    function accum(j, coef, w) {
      var gap = w - water[j];
      if (gap <= 0.002) return;
      var t = gap * coef * (0.55 + 0.45 * fiber[j]);
      outs[bucket.oc] = j;
      amts[bucket.oc] = t;
      bucket.total += t;
      bucket.oc++;
    }

    function mark(i) {
      if (markStamp[i] === stampId) return;
      markStamp[i] = stampId;
      markList[markN++] = i;
    }

    function addFlux(i, dw, dr, dg, db) {
      if (fluxStamp[i] !== stampId) {
        fluxStamp[i] = stampId;
        fluxList[fluxN++] = i;
        fW[i] = dw;
        fR[i] = dr;
        fG[i] = dg;
        fB[i] = db;
      } else {
        fW[i] += dw;
        fR[i] += dr;
        fG[i] += dg;
        fB[i] += db;
      }
      mark(i);
    }

    function step() {
      var srcI = qi;
      var count = qcount[srcI];
      if (!count) return { maxW: 0, active: 0 };
      var dstI = 1 - srcI;
      qcount[dstI] = 0;
      qi = dstI;
      var src = queues[srcI];
      var k, i, x, y, w;

      for (k = 0; k < count; k++) active[src[k]] = 0;

      stampId++;
      if (stampId === 0xffffffff) {
        markStamp.fill(0);
        fluxStamp.fill(0);
        stampId = 1;
      }
      markN = 0;
      fluxN = 0;

      var flow = paper.flow;
      var flowX = flow * paper.flowX;
      var flowY = flow * paper.flowY;
      var carry = paper.carry;
      var rim = paper.rim;

      for (k = 0; k < count; k++) {
        i = src[k];
        mark(i);
        w = water[i];
        if (w <= paper.fixAt) continue;
        x = i % W;
        y = (i / W) | 0;
        bucket.oc = 0;
        bucket.total = 0;
        if (x + 1 < W) accum(i + 1, flowX, w);
        if (x > 0) accum(i - 1, flowX, w);
        if (y + 1 < H) accum(i + W, flowY, w);
        if (y > 0) accum(i - W, flowY, w);
        var oc = bucket.oc;
        if (!oc) continue;
        var total = bucket.total;
        var scale = 1;
        var maxGive = w * 0.36;
        if (total > maxGive) scale = maxGive / total;
        var cr = wet0[i] / w;
        var cg = wet1[i] / w;
        var cb = wet2[i] / w;
        var giveW = 0;
        var giveR = 0;
        var giveG = 0;
        var giveB = 0;
        var s, t, pr, pg, pb;
        for (s = 0; s < oc; s++) {
          t = amts[s] * scale;
          pr = cr * t * carry;
          pg = cg * t * carry;
          pb = cb * t * carry;
          addFlux(outs[s], t, pr, pg, pb);
          giveW += t;
          giveR += pr;
          giveG += pg;
          giveB += pb;
        }
        if (rim > 0 && w < 0.22) {
          var best = 0;
          for (s = 1; s < oc; s++) if (amts[s] > amts[best]) best = s;
          var roomR = wet0[i] - giveR;
          var roomG = wet1[i] - giveG;
          var roomB = wet2[i] - giveB;
          var er = roomR > 0 ? Math.min(roomR, wet0[i] * rim) : 0;
          var eg = roomG > 0 ? Math.min(roomG, wet1[i] * rim) : 0;
          var eb = roomB > 0 ? Math.min(roomB, wet2[i] * rim) : 0;
          if (er + eg + eb > 0) {
            addFlux(outs[best], 0, er, eg, eb);
            giveR += er;
            giveG += eg;
            giveB += eb;
          }
        }
        addFlux(i, -giveW, -giveR, -giveG, -giveB);
      }

      for (k = 0; k < fluxN; k++) {
        i = fluxList[k];
        var nw = water[i] + fW[i];
        water[i] = nw < 0 ? 0 : nw > 2.3 ? 2.3 : nw;
        wet0[i] = clamp0(wet0[i] + fR[i]);
        wet1[i] = clamp0(wet1[i] + fG[i]);
        wet2[i] = clamp0(wet2[i] + fB[i]);
        fW[i] = 0;
        fR[i] = 0;
        fG[i] = 0;
        fB[i] = 0;
      }

      var evap = paper.evap * (turbo ? 8 : 1);
      if (evap > 0.42) evap = 0.42;
      var stickBase = paper.stick;
      var fixAt = paper.fixAt;
      var maxW = 0;
      for (k = 0; k < markN; k++) {
        i = markList[k];
        var stickK = 1.2 - fiber[i];
        if (stickK < 0) stickK = 0;
        else if (stickK > 1) stickK = 1;
        var stick = stickBase * stickK;
        if (stick > 0) {
          var m0 = wet0[i] * stick;
          var m1 = wet1[i] * stick;
          var m2 = wet2[i] * stick;
          dry0[i] = clamp0(dry0[i] + m0);
          dry1[i] = clamp0(dry1[i] + m1);
          dry2[i] = clamp0(dry2[i] + m2);
          wet0[i] -= m0;
          wet1[i] -= m1;
          wet2[i] -= m2;
        }
        w = water[i] * (1 - evap);
        if (w <= fixAt) {
          dry0[i] = clamp0(dry0[i] + wet0[i]);
          dry1[i] = clamp0(dry1[i] + wet1[i]);
          dry2[i] = clamp0(dry2[i] + wet2[i]);
          wet0[i] = 0;
          wet1[i] = 0;
          wet2[i] = 0;
          water[i] = 0;
        } else {
          water[i] = w;
          if (w > maxW) maxW = w;
          wake(i);
        }
      }
      moist = maxW > 0.03;
      return { maxW: maxW, active: qcount[qi] };
    }

    function radiusFor(pressure) {
      var b = BRUSHES[brushId];
      var p = pressure;
      if (p < 0.05) p = 0.05;
      if (p > 1) p = 1;
      var rad = size * (0.42 + p * 0.78) * b.radiusScale;
      if (rad < 1.2) rad = 1.2;
      if (rad > 125) rad = 125;
      return rad;
    }

    function stamp(x, y, rad, pressure, b, ang) {
      if (rad < 0.6) return;
      var rot = b.wide ? ang + Math.PI / 2 : ang;
      var cos = Math.cos(rot);
      var sin = Math.sin(rot);
      var rx = rad;
      var ry = rad * b.aspect;
      if (ry < 0.75) ry = 0.75;
      var r = Math.ceil(rad) + 1;
      var x0 = Math.floor(x - r);
      var y0 = Math.floor(y - r);
      var x1 = Math.ceil(x + r);
      var y1 = Math.ceil(y + r);
      if (x0 < 0) x0 = 0;
      if (y0 < 0) y0 = 0;
      if (x1 > W - 1) x1 = W - 1;
      if (y1 > H - 1) y1 = H - 1;
      var tone = TONES[toneId];
      var pig = PIGMENTS[pigmentId];
      var inkBase = b.waterOnly ? 0 : INK_UNIT * tone.ink * pressure * b.ink;
      var waterBase = WATER_UNIT * (b.waterOnly ? 1 : tone.water) * pressure * b.water * waterMul;
      var fly = b.fly;
      if (toneId === "jiao" && !b.waterOnly && fly < 0.36) fly = 0.36;
      var soft = b.soft;
      var side = b.side;
      var waterOnly = b.waterOnly;
      var flyCut = fly > 0 ? fly * (1.12 - 0.3 * pressure) : 0;

      for (var yy = y0; yy <= y1; yy++) {
        var dy = yy - y;
        var row = yy * W;
        for (var xx = x0; xx <= x1; xx++) {
          var dx = xx - x;
          var lx = dx * cos + dy * sin;
          var ly = -dx * sin + dy * cos;
          var nx = lx / rx;
          var ny = ly / ry;
          var d2 = nx * nx + ny * ny;
          if (d2 >= 1) continue;
          var m = Math.pow(1 - d2, soft);
          if (side) {
            var fadeSide = (nx + 0.2) / 1.2;
            if (fadeSide <= 0) continue;
            if (fadeSide > 1) fadeSide = 1;
            m *= fadeSide;
          }
          if (m < 0.004) continue;
          var i = row + xx;
          if (flyCut && grain[i] < flyCut) continue;
          if (fly > 0) m *= 0.42 + 0.58 * grain[i];
          var wat = waterBase * m;
          if (waterOnly) {
            var frac = wat * 0.9;
            if (frac > 0.62) frac = 0.62;
            var mv0 = dry0[i] * frac;
            var mv1 = dry1[i] * frac;
            var mv2 = dry2[i] * frac;
            dry0[i] -= mv0;
            dry1[i] -= mv1;
            dry2[i] -= mv2;
            wet0[i] = clamp0(wet0[i] + mv0);
            wet1[i] = clamp0(wet1[i] + mv1);
            wet2[i] = clamp0(wet2[i] + mv2);
          } else if (inkBase > 0) {
            wet0[i] = clamp0(wet0[i] + inkBase * m * pig.a[0]);
            wet1[i] = clamp0(wet1[i] + inkBase * m * pig.a[1]);
            wet2[i] = clamp0(wet2[i] + inkBase * m * pig.a[2]);
          }
          var nw = water[i] + wat;
          water[i] = nw > 2.3 ? 2.3 : nw;
          wake(i);
        }
      }
      moist = true;
    }

    function dab(x, y, pressure, ang) {
      var b = BRUSHES[brushId];
      var p = pressure;
      if (p < 0.05) p = 0.05;
      if (p > 1) p = 1;
      var rad = radiusFor(p);
      lastRadius = rad;
      if (b.scatter) {
        var nDots = b.dots;
        for (var k = 0; k < nDots; k++) {
          var jx = (rng() - 0.5) * rad * 1.7;
          var jy = (rng() - 0.5) * rad * 1.7;
          var jr = rad * (0.2 + rng() * 0.22);
          stamp(x + jx, y + jy, jr, p, b, ang || 0);
        }
      } else {
        stamp(x, y, rad, p, b, ang || 0);
      }
    }

    function spacingNow() {
      var b = BRUSHES[brushId];
      var factor = b.scatter ? 0.95 : 0.22;
      var s = lastRadius * factor;
      return s < 1.15 ? 1.15 : s;
    }

    function beginStroke(x, y, pressure) {
      penDown = true;
      penX = x;
      penY = y;
      since = 0;
      dab(x, y, pressure, -Math.PI / 2);
    }

    function moveStroke(x, y, pressure) {
      if (!penDown) {
        beginStroke(x, y, pressure);
        return;
      }
      var dx = x - penX;
      var dy = y - penY;
      var dist = Math.hypot(dx, dy);
      if (dist < 0.0001) return;
      var ang = Math.atan2(dy, dx);
      var ux = dx / dist;
      var uy = dy / dist;
      var traveled = 0;
      var guard = 0;
      while (since + (dist - traveled) >= spacingNow() && guard++ < 2500) {
        var need = spacingNow() - since;
        traveled += need;
        if (traveled > dist) {
          traveled -= need;
          break;
        }
        dab(penX + ux * traveled, penY + uy * traveled, pressure, ang);
        since = 0;
      }
      since += dist - traveled;
      penX = x;
      penY = y;
    }

    function endStroke() {
      penDown = false;
      since = 0;
    }

    function stroke(points) {
      if (!points.length) return;
      var p0 = points[0].p == null ? 0.7 : points[0].p;
      beginStroke(points[0].x, points[0].y, p0);
      for (var i = 1; i < points.length; i++) {
        var p = points[i].p == null ? 0.7 : points[i].p;
        moveStroke(points[i].x, points[i].y, p);
      }
      endStroke();
    }

    function quad(x0, y0, cx, cy, x1, y1, n, p0, p1, curve) {
      var pts = [];
      var pressure0 = p0 == null ? 0.6 : p0;
      var pressure1 = p1 == null ? pressure0 : p1;
      for (var i = 0; i <= n; i++) {
        var t = i / n;
        var u = 1 - t;
        var wave = curve === "taper" ? t : Math.sin(Math.PI * t);
        pts.push({
          x: u * u * x0 + 2 * u * t * cx + t * t * x1,
          y: u * u * y0 + 2 * u * t * cy + t * t * y1,
          p: pressure0 + (pressure1 - pressure0) * wave
        });
      }
      return pts;
    }

    function steps(n) {
      var last = { maxW: 0, active: qcount[qi] };
      for (var i = 0; i < n; i++) last = step();
      return last;
    }

    function bake() {
      for (var i = 0; i < N; i++) {
        if (wet0[i] || wet1[i] || wet2[i]) {
          dry0[i] = clamp0(dry0[i] + wet0[i]);
          dry1[i] = clamp0(dry1[i] + wet1[i]);
          dry2[i] = clamp0(dry2[i] + wet2[i]);
          wet0[i] = 0;
          wet1[i] = 0;
          wet2[i] = 0;
        }
        water[i] = 0;
      }
      resetFlow();
      moist = false;
    }

    function study() {
      var saved = {
        brushId: brushId,
        toneId: toneId,
        pigmentId: pigmentId,
        size: size,
        waterMul: waterMul
      };
      waterMul = 1;
      brushId = "po";
      pigmentId = "huaqing";
      toneId = "qing";
      size = 30;
      stroke(quad(40, 168, 220, 120, 420, 176, 16, 0.42, 0.55));
      toneId = "dan";
      size = 26;
      stroke(quad(70, 214, 280, 168, 520, 230, 18, 0.4, 0.62));
      stroke(quad(24, 250, 180, 210, 340, 268, 12, 0.32, 0.48));
      toneId = "zhongmo";
      pigmentId = "zheshi";
      size = 22;
      stroke(quad(80, 300, 250, 340, 470, 286, 14, 0.38, 0.58));
      brushId = "ce";
      toneId = "nong";
      size = 15;
      stroke(quad(108, 332, 170, 358, 246, 324, 8, 0.75, 0.15, "taper"));
      steps(22);
      bake();
      pigmentId = "songyan";
      brushId = "zhong";
      toneId = "dan";
      size = 4;
      stroke(quad(348, 760, 358, 620, 334, 490, 26, 0.62, 0.22, "taper"));
      toneId = "nong";
      size = 5;
      stroke(quad(304, 800, 278, 640, 312, 508, 30, 0.78, 0.3, "taper"));
      brushId = "ce";
      toneId = "nong";
      size = 13;
      stroke(quad(312, 516, 368, 468, 424, 492, 10, 0.92, 0.04, "taper"));
      stroke(quad(306, 522, 246, 474, 198, 508, 10, 0.88, 0.04, "taper"));
      stroke(quad(316, 530, 378, 548, 438, 590, 10, 0.8, 0.04, "taper"));
      stroke(quad(298, 654, 360, 624, 424, 652, 9, 0.78, 0.04, "taper"));
      stroke(quad(292, 662, 236, 704, 196, 748, 9, 0.72, 0.04, "taper"));
      brushId = "zhong";
      toneId = "jiao";
      size = 4;
      stroke(quad(286, 648, 268, 648, 250, 656, 4, 0.7, 0.4, "taper"));
      stroke(quad(300, 528, 286, 524, 270, 534, 4, 0.65, 0.35, "taper"));
      brushId = "tai";
      toneId = "jiao";
      size = 11;
      dab(292, 808, 0.8, 0.4);
      dab(314, 796, 0.65, 1.2);
      dab(276, 788, 0.55, 0.2);
      brushId = saved.brushId;
      toneId = saved.toneId;
      pigmentId = saved.pigmentId;
      size = saved.size;
      waterMul = saved.waterMul;
    }

    function render(buf, showWet) {
      var p = 0;
      for (var y = 0; y < H; y++) {
        var edgeY = 1;
        if (y < 16) edgeY = 0.9 + 0.1 * (y / 16);
        else if (y > H - 17) edgeY = 0.9 + 0.1 * ((H - 1 - y) / 16);
        var row = y * W;
        for (var x = 0; x < W; x++) {
          var edgeX = 1;
          if (x < 16) edgeX = 0.9 + 0.1 * (x / 16);
          else if (x > W - 17) edgeX = 0.9 + 0.1 * ((W - 1 - x) / 16);
          var edge = edgeX < edgeY ? edgeX : edgeY;
          var i = row + x;
          var s = shade[i] * edge;
          var r = 243 * s * fade(dry0[i] + wet0[i]);
          var g = 232 * s * fade(dry1[i] + wet1[i]);
          var b = 214 * s * fade(dry2[i] + wet2[i]);
          if (showWet && water[i] > 0.035) {
            var tint = water[i] * 0.11;
            if (tint > 0.2) tint = 0.2;
            r = r * (1 - tint) + 176 * tint;
            g = g * (1 - tint) + 198 * tint;
            b = b * (1 - tint) + 208 * tint;
          }
          buf[p++] = r + 0.5;
          buf[p++] = g + 0.5;
          buf[p++] = b + 0.5;
          buf[p++] = 255;
        }
      }
    }

    function snapshot() {
      var buf = new Uint8Array(N * 7);
      for (var i = 0; i < N; i++) {
        buf[i] = toU8(wet0[i], PIG_SCALE);
        buf[N + i] = toU8(wet1[i], PIG_SCALE);
        buf[2 * N + i] = toU8(wet2[i], PIG_SCALE);
        buf[3 * N + i] = toU8(dry0[i], PIG_SCALE);
        buf[4 * N + i] = toU8(dry1[i], PIG_SCALE);
        buf[5 * N + i] = toU8(dry2[i], PIG_SCALE);
        buf[6 * N + i] = toU8(water[i], WATER_SCALE);
      }
      return buf;
    }

    function restore(buf) {
      resetFlow();
      moist = false;
      for (var i = 0; i < N; i++) {
        wet0[i] = fromU8(buf[i], PIG_SCALE);
        wet1[i] = fromU8(buf[N + i], PIG_SCALE);
        wet2[i] = fromU8(buf[2 * N + i], PIG_SCALE);
        dry0[i] = fromU8(buf[3 * N + i], PIG_SCALE);
        dry1[i] = fromU8(buf[4 * N + i], PIG_SCALE);
        dry2[i] = fromU8(buf[5 * N + i], PIG_SCALE);
        water[i] = fromU8(buf[6 * N + i], WATER_SCALE);
        if (water[i] > 0.03 || wet0[i] + wet1[i] + wet2[i] > 0.02) {
          moist = true;
          wake(i);
        }
      }
    }

    function addDry(i, r, g, b) {
      dry0[i] = clamp0(dry0[i] + r);
      dry1[i] = clamp0(dry1[i] + g);
      dry2[i] = clamp0(dry2[i] + b);
    }

    function isDirty() {
      for (var i = 0; i < N; i++) {
        if (dry0[i] > 0.004 || dry1[i] > 0.004 || dry2[i] > 0.004) return true;
        if (wet0[i] > 0.004 || wet1[i] > 0.004 || wet2[i] > 0.004) return true;
      }
      return false;
    }

    function pigmentSum() {
      var s = 0;
      for (var i = 0; i < N; i++) s += wet0[i] + wet1[i] + wet2[i] + dry0[i] + dry1[i] + dry2[i];
      return s;
    }

    function bounds(th) {
      var limit = th == null ? 0.02 : th;
      var minX = W;
      var minY = H;
      var maxX = -1;
      var maxY = -1;
      var n = 0;
      for (var y = 0; y < H; y++) {
        var row = y * W;
        for (var x = 0; x < W; x++) {
          var i = row + x;
          var m = wet0[i] + wet1[i] + wet2[i] + dry0[i] + dry1[i] + dry2[i];
          if (m > limit) {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            n++;
          }
        }
      }
      return {
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        n: n,
        w: maxX < 0 ? 0 : maxX - minX + 1,
        h: maxY < 0 ? 0 : maxY - minY + 1
      };
    }

    function stats() {
      var dry = 0;
      var wet = 0;
      var waterSum = 0;
      var maxW = 0;
      var wetCells = 0;
      for (var i = 0; i < N; i++) {
        dry += dry0[i] + dry1[i] + dry2[i];
        wet += wet0[i] + wet1[i] + wet2[i];
        waterSum += water[i];
        if (water[i] > maxW) maxW = water[i];
        if (water[i] > 0.03) wetCells++;
      }
      return { dry: dry, wet: wet, waterSum: waterSum, maxW: maxW, wetCells: wetCells, active: qcount[qi], moist: moist };
    }

    function ascii(cols, rows) {
      var cw = cols || 56;
      var rh = rows || 32;
      var ramp = " .:-=+*#%@";
      var out = "";
      for (var y = 0; y < rh; y++) {
        for (var x = 0; x < cw; x++) {
          var sx = Math.min(W - 1, ((x + 0.5) / cw * W) | 0);
          var sy = Math.min(H - 1, ((y + 0.5) / rh * H) | 0);
          var i = sy * W + sx;
          var m = dry0[i] + wet0[i] + dry1[i] + wet1[i] + dry2[i] + wet2[i];
          var k = (m * 1.7) | 0;
          if (k < 0) k = 0;
          if (k > 9) k = 9;
          out += ramp.charAt(k);
        }
        out += "\n";
      }
      return out;
    }

    function sample(x, y) {
      var i = (y | 0) * W + (x | 0);
      return {
        water: water[i],
        wet: [wet0[i], wet1[i], wet2[i]],
        dry: [dry0[i], dry1[i], dry2[i]]
      };
    }

    buildPaper(paperSeed);

    return {
      W: W,
      H: H,
      setBrush: function (id) { if (BRUSHES[id]) brushId = id; },
      getBrush: function () { return brushId; },
      setTone: function (id) { if (TONES[id]) toneId = id; },
      getTone: function () { return toneId; },
      setPigment: function (id) { if (PIGMENTS[id]) pigmentId = id; },
      getPigment: function () { return pigmentId; },
      setPaper: function (id) {
        if (!PAPERS[id]) return;
        paperId = id;
        paper = PAPERS[id];
        clearInk();
        buildPaper((paperSeed + 0x85ebca6b) >>> 0);
      },
      getPaper: function () { return paperId; },
      paperName: function () { return paper.name; },
      brushName: function () { return BRUSHES[brushId].name; },
      toneName: function () { return TONES[toneId].name; },
      pigmentName: function () { return PIGMENTS[pigmentId].name; },
      waterOnly: function () { return BRUSHES[brushId].waterOnly; },
      setSize: function (n) { size = n; },
      getSize: function () { return size; },
      setWaterMul: function (n) { waterMul = n; },
      getWaterMul: function () { return waterMul; },
      setTurbo: function (v) { turbo = !!v; },
      previewRadius: radiusFor,
      beginStroke: beginStroke,
      moveStroke: moveStroke,
      endStroke: endStroke,
      dab: dab,
      stroke: stroke,
      step: step,
      steps: steps,
      study: study,
      bake: bake,
      clearInk: clearInk,
      isDirty: isDirty,
      isMoist: function () { return moist; },
      render: render,
      snapshot: snapshot,
      restore: restore,
      addDry: addDry,
      grainAt: function (i) { return grain[i]; },
      stats: stats,
      bounds: bounds,
      ascii: ascii,
      pigmentSum: pigmentSum,
      sample: sample,
      activeCount: function () { return qcount[qi]; },
      pigments: PIGMENTS,
      tones: TONES
    };
  }

  function boot() {
    var sheet = createSheet(20261108);
    var canvas = document.getElementById("paper");
    var ctx = canvas.getContext("2d", { alpha: false });
    canvas.width = sheet.W;
    canvas.height = sheet.H;
    var imageData = ctx.createImageData(sheet.W, sheet.H);
    var hint = document.getElementById("hint");
    var cursor = document.getElementById("cursor");
    var statusEl = document.getElementById("status");
    var wetbar = document.getElementById("wetbar");
    var sizeEl = document.getElementById("size");
    var sizeVal = document.getElementById("size-val");
    var waterEl = document.getElementById("water");
    var waterVal = document.getElementById("water-val");
    var wristEl = document.getElementById("wrist");
    var wristVal = document.getElementById("wrist-val");
    var showWetEl = document.getElementById("show-wet");
    var dryBtn = document.getElementById("btn-dry");
    var undoBtn = document.getElementById("btn-undo");
    var redoBtn = document.getElementById("btn-redo");
    var askDlg = document.getElementById("ask");
    var askText = document.getElementById("ask-text");
    var askYes = document.getElementById("ask-yes");
    var askNo = document.getElementById("ask-no");
    var past = [];
    var future = [];
    var dirty = true;
    var painting = false;
    var smoothP = 0.7;
    var prevEv = null;
    var lastStep = 0;
    var lastMaxW = 0;
    var hud = "";
    var num = "〇一二三四五六七八九";

    function cnNum(v) {
      if (v < 10) return num.charAt(v);
      if (v === 10) return "十";
      if (v < 20) return "十" + num.charAt(v - 10);
      if (v === 20) return "二十";
      if (v < 30) return "二十" + num.charAt(v - 20);
      if (v === 30) return "三十";
      return "三十" + num.charAt(v - 30);
    }

    function chineseDate(d) {
      var year = String(d.getFullYear()).split("").map(function (ch) { return num.charAt(+ch); }).join("");
      return year + "年" + cnNum(d.getMonth() + 1) + "月" + cnNum(d.getDate()) + "日";
    }

    document.getElementById("date-line").textContent = chineseDate(new Date());
    document.getElementById("tray").addEventListener("submit", function (e) { e.preventDefault(); });

    Object.keys(PIGMENTS).forEach(function (id) {
      var btn = document.querySelector('[data-pigment="' + id + '"]');
      if (btn) btn.style.setProperty("--swatch", swatchCss(PIGMENTS[id].a, 0.85));
    });
    Object.keys(TONES).forEach(function (id) {
      var btn = document.querySelector('[data-tone="' + id + '"]');
      if (btn) btn.style.setProperty("--swatch", swatchCss(PIGMENTS.songyan.a, TONES[id].ink * 1.15));
    });

    function syncPressed(attr, id) {
      document.querySelectorAll("[" + attr + "]").forEach(function (btn) {
        btn.setAttribute("aria-pressed", btn.getAttribute(attr) === id ? "true" : "false");
      });
    }

    function updateHistoryButtons() {
      undoBtn.disabled = past.length === 0;
      redoBtn.disabled = future.length === 0;
    }

    function pushHistory() {
      past.push(sheet.snapshot());
      if (past.length > 12) past.shift();
      future.length = 0;
      updateHistoryButtons();
    }

    function updateHud() {
      var inkName = sheet.waterOnly() ? "清水" : sheet.toneName() + " · " + sheet.pigmentName();
      var wet = sheet.isMoist() || lastMaxW > 0.03;
      var text = sheet.paperName() + " · " + sheet.brushName() + " · " + inkName + " · " + (wet ? "纸上还有水" : "这一张是干的");
      if (text !== hud) {
        hud = text;
        statusEl.textContent = text;
      }
      var width = lastMaxW / 1.15;
      if (width < 0) width = 0;
      if (width > 1) width = 1;
      wetbar.style.width = (width * 100) + "%";
    }

    function paintCanvas(showWet) {
      sheet.render(imageData.data, showWet);
      ctx.putImageData(imageData, 0, 0);
    }

    function wrist() {
      return parseFloat(wristEl.value) || 0.9;
    }

    function setBrush(id) {
      sheet.setBrush(id);
      syncPressed("data-brush", id);
      updateHud();
    }

    function setTone(id) {
      sheet.setTone(id);
      syncPressed("data-tone", id);
      updateHud();
    }

    function setPigment(id) {
      sheet.setPigment(id);
      syncPressed("data-pigment", id);
      updateHud();
    }

    function ask(text) {
      askText.textContent = text;
      return new Promise(function (resolve) {
        var settled = false;
        function finish(v) {
          if (settled) return;
          settled = true;
          resolve(v);
        }
        askYes.onclick = function () {
          finish(true);
          askDlg.close();
        };
        askNo.onclick = function () {
          finish(false);
          askDlg.close();
        };
        function onClose() {
          askDlg.removeEventListener("close", onClose);
          finish(false);
        }
        askDlg.addEventListener("close", onClose);
        askDlg.showModal();
      });
    }

    function undo() {
      painting = false;
      sheet.endStroke();
      if (!past.length) return;
      future.push(sheet.snapshot());
      sheet.restore(past.pop());
      updateHistoryButtons();
      lastMaxW = sheet.isMoist() ? 0.4 : 0;
      dirty = true;
    }

    function redo() {
      painting = false;
      sheet.endStroke();
      if (!future.length) return;
      past.push(sheet.snapshot());
      sheet.restore(future.pop());
      updateHistoryButtons();
      lastMaxW = sheet.isMoist() ? 0.4 : 0;
      dirty = true;
    }

    function save() {
      var show = showWetEl.checked;
      if (show) paintCanvas(false);
      var a = document.createElement("a");
      var d = new Date();
      var m = String(d.getMonth() + 1).padStart(2, "0");
      var day = String(d.getDate()).padStart(2, "0");
      a.href = canvas.toDataURL("image/png");
      a.download = "墨分五色-" + d.getFullYear() + "-" + m + "-" + day + ".png";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (show) dirty = true;
    }

    function paintTextColumn(chars, fontPx) {
      var c = document.createElement("canvas");
      var width = Math.ceil(fontPx * 1.2);
      var height = Math.ceil(chars.length * fontPx * 1.08 + fontPx * 0.4);
      c.width = Math.max(8, width);
      c.height = Math.max(8, height);
      var g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      g.fillStyle = "#000";
      g.font = fontPx + 'px "Songti SC","STSong","SimSun","WenQuanYi Micro Hei",serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      chars.forEach(function (ch, i) {
        var jitter = (hash2(i + 1, 7, 20261108) - 0.5) * fontPx * 0.08;
        g.fillText(ch, c.width / 2 + jitter, fontPx * 0.62 + i * fontPx * 1.05);
      });
      return c;
    }

    function drawSealChars(g, chars, size) {
      g.textAlign = "center";
      g.textBaseline = "middle";
      var n = chars.length;
      var fontPx = n <= 1 ? size * 0.46 : size * 0.3;
      g.font = "700 " + fontPx + 'px "Songti SC","STSong","SimSun","WenQuanYi Micro Hei",serif';
      function cell(col, row, cols, rows) {
        var gapX = size / (cols + 1);
        var gapY = size / (rows + 1);
        return { x: gapX * (cols - col), y: gapY * (row + 1) };
      }
      var layout = [];
      if (n <= 1) layout = [cell(0, 0, 1, 1)];
      else if (n === 2) layout = [cell(0, 0, 1, 2), cell(0, 1, 1, 2)];
      else if (n === 3) layout = [cell(1, 0, 2, 2), cell(1, 1, 2, 2), cell(0, 0, 2, 2)];
      else layout = [cell(1, 0, 2, 2), cell(1, 1, 2, 2), cell(0, 0, 2, 2), cell(0, 1, 2, 2)];
      for (var i = 0; i < n; i++) g.fillText(chars[i], layout[i].x, layout[i].y);
    }

    function makeSeal(chars, mode) {
      var size = 128;
      var c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      var g = c.getContext("2d");
      g.clearRect(0, 0, size, size);
      g.translate(size / 2, size / 2);
      g.rotate((Math.random() - 0.5) * 0.06);
      g.translate(-size / 2, -size / 2);
      g.fillStyle = "#c23b32";
      g.strokeStyle = "#c23b32";
      g.lineWidth = 8;
      if (mode === "bai") {
        g.fillRect(8, 8, size - 16, size - 16);
        g.globalCompositeOperation = "destination-out";
        g.fillStyle = "#000";
        drawSealChars(g, chars, size);
        g.globalCompositeOperation = "source-over";
      } else {
        g.strokeRect(10, 10, size - 20, size - 20);
        g.fillStyle = "#c23b32";
        drawSealChars(g, chars, size);
      }
      return c;
    }

    function blit(src, destX, destY, strength, absorb, seal) {
      var g = src.getContext("2d");
      var img = g.getImageData(0, 0, src.width, src.height);
      var data = img.data;
      for (var y = 0; y < src.height; y++) {
        for (var x = 0; x < src.width; x++) {
          var p = (y * src.width + x) * 4;
          var alpha = data[p + 3] / 255;
          if (alpha < 0.06) continue;
          var dx = (destX + x) | 0;
          var dy = (destY + y) | 0;
          if (dx < 2 || dy < 2 || dx >= sheet.W - 2 || dy >= sheet.H - 2) continue;
          var i = dy * sheet.W + dx;
          var tooth = 0.78 + 0.22 * sheet.grainAt(i);
          if (seal && sheet.grainAt(i) < 0.03) continue;
          var amt = alpha * strength * tooth;
          sheet.addDry(i, absorb[0] * amt, absorb[1] * amt, absorb[2] * amt);
        }
      }
    }

    function inscribe() {
      var poem = Array.from(document.getElementById("poem").value.trim()).slice(0, 18);
      var sign = Array.from((document.getElementById("sign").value.trim() || "日课")).slice(0, 8);
      var sealChars = Array.from((document.getElementById("seal").value.trim() || "未干")).slice(0, 4);
      var mode = document.getElementById("seal-style").value;
      var side = document.getElementById("side").value;
      var fontPx = 26;
      var estimate = poem.length * fontPx * 1.08 + sign.length * 22 + 150;
      while (estimate > sheet.H - 70 && fontPx > 16) {
        fontPx -= 2;
        estimate = poem.length * fontPx * 1.08 + sign.length * 20 + 140;
      }
      var poemCanvas = poem.length ? paintTextColumn(poem, fontPx) : null;
      var signCanvas = paintTextColumn(sign, Math.max(16, fontPx - 6));
      var seal = makeSeal(sealChars, mode);
      var gap = 12;
      var total = (poemCanvas ? poemCanvas.height + gap : 0) + signCanvas.height + gap + seal.height;
      var y = sheet.H - 36 - total;
      if (y < 20) y = 20;
      var blockW = Math.max(poemCanvas ? poemCanvas.width : 0, signCanvas.width, seal.width);
      var x = side === "left" ? 26 : sheet.W - 26 - blockW;
      pushHistory();
      var ink = PIGMENTS.youyan.a;
      if (poemCanvas) {
        blit(poemCanvas, x + (blockW - poemCanvas.width) / 2, y, 0.7, ink, false);
        y += poemCanvas.height + gap;
      }
      blit(signCanvas, x + (blockW - signCanvas.width) / 2, y, 0.62, ink, false);
      y += signCanvas.height + gap;
      blit(seal, x + (blockW - seal.width) / 2, y, 0.92, PIGMENTS.zhusha.a, true);
      hint.hidden = true;
      dirty = true;
    }

    function simPoint(ev) {
      var rect = canvas.getBoundingClientRect();
      return {
        x: (ev.clientX - rect.left) * (sheet.W / rect.width),
        y: (ev.clientY - rect.top) * (sheet.H / rect.height)
      };
    }

    function pressureFor(ev, x, y, reset) {
      var speed = 0;
      if (!reset && prevEv) {
        var dt = ev.timeStamp - prevEv.t;
        if (dt < 6) dt = 6;
        speed = Math.hypot(x - prevEv.x, y - prevEv.y) * 1000 / dt;
      }
      prevEv = { x: x, y: y, t: ev.timeStamp };
      var p;
      if (ev.pointerType === "pen" && ev.pressure > 0.01) p = ev.pressure;
      else p = 1.02 - speed / 1450;
      if (p < 0.22) p = 0.22;
      if (p > 0.96) p = 0.96;
      if (reset) smoothP = p;
      else smoothP += (p - smoothP) * 0.42;
      var out = smoothP * wrist();
      if (out < 0.06) out = 0.06;
      if (out > 1) out = 1;
      return out;
    }

    function placeCursor(ev, pressure) {
      if (ev.pointerType === "touch") {
        cursor.style.display = "none";
        return;
      }
      var rad = sheet.previewRadius(pressure);
      var rect = canvas.getBoundingClientRect();
      var px = rad * 2 * (rect.width / sheet.W);
      cursor.style.display = "block";
      cursor.style.width = px + "px";
      cursor.style.height = px + "px";
      cursor.style.left = ev.clientX + "px";
      cursor.style.top = ev.clientY + "px";
    }

    function feed(ev, reset) {
      var pt = simPoint(ev);
      var pressure = pressureFor(ev, pt.x, pt.y, reset);
      placeCursor(ev, pressure);
      if (reset) sheet.beginStroke(pt.x, pt.y, pressure);
      else sheet.moveStroke(pt.x, pt.y, pressure);
      dirty = true;
    }

    function onDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      painting = true;
      hint.hidden = true;
      pushHistory();
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      feed(list[0] || e, true);
      for (var i = 1; i < list.length; i++) feed(list[i], false);
    }

    function onMove(e) {
      var list = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      var last = list[list.length - 1] || e;
      if (!painting) {
        var pt = simPoint(last);
        placeCursor(last, pressureFor(last, pt.x, pt.y, true));
        return;
      }
      for (var i = 0; i < list.length; i++) feed(list[i], false);
    }

    function onUp(e) {
      if (!painting) return;
      painting = false;
      sheet.endStroke();
      prevEv = null;
    }

    canvas.addEventListener("pointerdown", onDown, { passive: false });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", function () {
      if (!painting) cursor.style.display = "none";
    });
    canvas.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    document.getElementById("brushes").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-brush]");
      if (!btn) return;
      setBrush(btn.getAttribute("data-brush"));
    });
    document.getElementById("tones").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tone]");
      if (!btn) return;
      setTone(btn.getAttribute("data-tone"));
    });
    document.getElementById("pigments").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-pigment]");
      if (!btn) return;
      setPigment(btn.getAttribute("data-pigment"));
    });
    document.getElementById("papers").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-paper]");
      if (!btn) return;
      var id = btn.getAttribute("data-paper");
      if (id === sheet.getPaper()) return;
      var busy = sheet.isDirty() || past.length || future.length;
      var go = function () {
        sheet.setPaper(id);
        past.length = 0;
        future.length = 0;
        updateHistoryButtons();
        syncPressed("data-paper", id);
        lastMaxW = 0;
        dirty = true;
        updateHud();
      };
      if (!busy) go();
      else ask("换纸会倒掉这一张，还能撤销的笔也一起清掉。").then(function (ok) { if (ok) go(); });
    });

    function showSize() { sizeVal.textContent = String(Math.round(parseFloat(sizeEl.value))); }
    function showWater() { waterVal.textContent = parseFloat(waterEl.value).toFixed(2); }
    function showWrist() { wristVal.textContent = parseFloat(wristEl.value).toFixed(2); }
    sizeEl.addEventListener("input", function () {
      sheet.setSize(parseFloat(sizeEl.value));
      showSize();
    });
    waterEl.addEventListener("input", function () {
      sheet.setWaterMul(parseFloat(waterEl.value));
      showWater();
    });
    wristEl.addEventListener("input", showWrist);
    showWetEl.addEventListener("change", function () { dirty = true; });
    sheet.setSize(parseFloat(sizeEl.value));
    sheet.setWaterMul(parseFloat(waterEl.value));

    dryBtn.addEventListener("click", function () {
      var next = dryBtn.getAttribute("aria-pressed") !== "true";
      dryBtn.setAttribute("aria-pressed", next ? "true" : "false");
      sheet.setTurbo(next);
    });
    undoBtn.addEventListener("click", undo);
    redoBtn.addEventListener("click", redo);
    document.getElementById("btn-save").addEventListener("click", save);
    document.getElementById("btn-clear").addEventListener("click", function () {
      if (!sheet.isDirty()) return;
      ask("倒掉这张纸？").then(function (ok) {
        if (!ok) return;
        pushHistory();
        sheet.clearInk();
        lastMaxW = 0;
        hint.hidden = false;
        dirty = true;
      });
    });
    document.getElementById("btn-study").addEventListener("click", function () {
      var run = function () {
        pushHistory();
        sheet.study();
        hint.hidden = true;
        lastMaxW = 0.5;
        dirty = true;
      };
      if (!sheet.isDirty()) run();
      else ask("纸上已经有墨。试笔会再添一枝雨后竹，不先倒掉。").then(function (ok) { if (ok) run(); });
    });
    document.getElementById("btn-seal").addEventListener("click", inscribe);

    window.addEventListener("keydown", function (e) {
      var tag = document.activeElement && document.activeElement.tagName;
      var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
      if ((e.ctrlKey || e.metaKey) && (e.key === "z" || e.key === "Z")) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || e.key === "Y")) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "s" || e.key === "S")) {
        e.preventDefault();
        save();
        return;
      }
      if (typing) return;
      var brushes = { "1": "zhong", "2": "ce", "3": "ku", "4": "tai", "5": "po", "6": "shui" };
      if (brushes[e.key]) {
        setBrush(brushes[e.key]);
        return;
      }
      if (e.key === "[") {
        sizeEl.value = String(Math.max(8, parseFloat(sizeEl.value) - 2));
        sizeEl.dispatchEvent(new Event("input"));
      } else if (e.key === "]") {
        sizeEl.value = String(Math.min(42, parseFloat(sizeEl.value) + 2));
        sizeEl.dispatchEvent(new Event("input"));
      } else if (e.key === "-" || e.key === "_") {
        waterEl.value = String(Math.max(0.35, parseFloat(waterEl.value) - 0.05));
        waterEl.dispatchEvent(new Event("input"));
      } else if (e.key === "=" || e.key === "+") {
        waterEl.value = String(Math.min(1.7, parseFloat(waterEl.value) + 0.05));
        waterEl.dispatchEvent(new Event("input"));
      }
    });

    function frame(now) {
      requestAnimationFrame(frame);
      if (sheet.activeCount() > 0 && now - lastStep >= 26) {
        var n = now - lastStep > 72 ? 2 : 1;
        var info = null;
        for (var i = 0; i < n; i++) info = sheet.step();
        lastStep = now;
        lastMaxW = info ? info.maxW : 0;
        dirty = true;
        if (dryBtn.getAttribute("aria-pressed") === "true" && info && info.maxW < 0.03 && sheet.activeCount() === 0) {
          dryBtn.setAttribute("aria-pressed", "false");
          sheet.setTurbo(false);
        }
      }
      if (dirty) {
        paintCanvas(showWetEl.checked);
        dirty = false;
        updateHud();
      }
    }

    updateHud();
    requestAnimationFrame(frame);
    root.__mofen = sheet;
  }

  var api = { createSheet: createSheet, swatchCss: swatchCss, PAPERS: PAPERS, BRUSHES: BRUSHES, TONES: TONES, PIGMENTS: PIGMENTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.MOFEN = api;
  if (typeof document !== "undefined") boot();
})(typeof globalThis !== "undefined" ? globalThis : this);
