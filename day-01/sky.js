/* 纸上夜空：把 Astro 算出来的天球画到一张圆图和一幅地平视野上。 */
(function () {
  "use strict";

  const A = window.Astro;
  const DATA = window.SKY_DATA;
  if (!A || !DATA) {
    document.getElementById("lede").textContent = "星表或计算脚本没有载入。";
    return;
  }

  const CITIES = [
    ["北京", 39.9042, 116.4074], ["天津", 39.3434, 117.3616], ["上海", 31.2304, 121.4737],
    ["重庆", 29.563, 106.5516], ["哈尔滨", 45.8038, 126.534], ["长春", 43.8171, 125.3235],
    ["沈阳", 41.8057, 123.4315], ["呼和浩特", 40.8426, 111.7492], ["乌鲁木齐", 43.8256, 87.6168],
    ["喀什", 39.4704, 75.9898], ["兰州", 36.0611, 103.8343], ["西宁", 36.6171, 101.7782],
    ["敦煌", 40.1421, 94.6618], ["西安", 34.3416, 108.9398], ["郑州", 34.7466, 113.6253],
    ["济南", 36.6512, 117.1201], ["青岛", 36.0671, 120.3826], ["南京", 32.0603, 118.7969],
    ["合肥", 31.8206, 117.2272], ["杭州", 30.2741, 120.1551], ["武汉", 30.5928, 114.3055],
    ["长沙", 28.2282, 112.9388], ["南昌", 28.682, 115.8579], ["福州", 26.0745, 119.2965],
    ["台北", 25.033, 121.5654], ["成都", 30.5728, 104.0668], ["拉萨", 29.6525, 91.1721],
    ["昆明", 25.0389, 102.7183], ["贵阳", 26.647, 106.6302], ["广州", 23.1291, 113.2644],
    ["香港", 22.3193, 114.1694], ["澳门", 22.1987, 113.5439], ["南宁", 22.817, 108.3665],
    ["桂林", 25.2736, 110.29], ["海口", 20.044, 110.1999], ["三亚", 18.2528, 109.5119],
    ["大连", 38.914, 121.6147], ["漠河", 52.9721, 122.537]
  ];

  const PLANETS = [
    { id: "mercury", name: "水星", tint: "#d9d4ca", far: false },
    { id: "venus", name: "金星", tint: "#f4e3ae", far: false },
    { id: "mars", name: "火星", tint: "#e07a4c", far: false },
    { id: "jupiter", name: "木星", tint: "#f0d2a6", far: false },
    { id: "saturn", name: "土星", tint: "#ead7a6", far: false },
    { id: "uranus", name: "天王星", tint: "#b7ddd6", far: true },
    { id: "neptune", name: "海王星", tint: "#8aa4e0", far: true }
  ];

  const MANSIONS = [
    { hip: 65474, char: "角", beast: "青龙", note: "青龙之角。距星角宿一，是室女座最亮的那颗。" },
    { hip: 69427, char: "亢", beast: "青龙", note: "龙颈。亢宿一不亮，先找到角宿一，再往西找。" },
    { hip: 72622, char: "氐", beast: "青龙", note: "龙的胸足。氐宿一在天秤座，肉眼可以看出它是双星。" },
    { hip: 78265, char: "房", beast: "青龙", note: "龙腹。房宿挤在天蝎头部，距星是靠西的房宿一。" },
    { hip: 80112, char: "心", beast: "青龙", note: "心宿的距星是心宿一，不是那颗大红星。大红的是心宿二，在正中。" },
    { hip: 82514, char: "尾", beast: "青龙", note: "龙尾从心宿二往南拖。尾宿一是靠近心宿的那颗。" },
    { hip: 88635, char: "箕", beast: "青龙", note: "一只簸箕，在人马座。青龙七宿到这里为止。" },
    { hip: 92041, char: "斗", beast: "玄武", note: "这是南斗，不是北斗。斗在人马座，夏天贴着南边地平线。" },
    { hip: 100345, char: "牛", beast: "玄武", note: "牛宿不是牛郎。牛郎是河鼓二，在银河边上。牛宿在摩羯座。" },
    { hip: 102618, char: "女", beast: "玄武", note: "女宿也不是织女。织女在天琴座，女宿在宝瓶座。" },
    { hip: 106278, char: "虚", beast: "玄武", note: "虚有废墟的意思。虚宿一是宝瓶座里一颗稳的亮星。" },
    { hip: 109074, char: "危", beast: "玄武", note: "危是屋脊。危宿一在宝瓶座，离飞马大方块不远。" },
    { hip: 113963, char: "室", beast: "玄武", note: "营室，房子的西墙。室宿一是秋夜大方块的西南角。" },
    { hip: 1067, char: "壁", beast: "玄武", note: "房子的东墙。壁宿一在飞马座。方块东北角那颗是壁宿二，已算仙女座。" },
    { hip: 3693, char: "奎", beast: "白虎", note: "白虎从奎宿起。距星奎宿二在仙女座，本身不亮。" },
    { hip: 8903, char: "娄", beast: "白虎", note: "娄宿一是白羊座第二亮的星。" },
    { hip: 12719, char: "胃", beast: "白虎", note: "胃宿被比作粮仓。距星胃宿一很暗，在白羊座里。" },
    { hip: 17499, char: "昴", beast: "白虎", note: "昴就是七姐妹那一团。距星昴宿一是其中偏西的一颗。" },
    { hip: 20889, char: "毕", beast: "白虎", note: "毕是一张捕兽的网。亮红的毕宿五是牛眼，距星却是较暗的毕宿一。" },
    { hip: 26207, char: "觜", beast: "白虎", note: "虎嘴。觜宿一在猎户头顶，紧挨着参宿。" },
    { hip: 25930, char: "参", beast: "白虎", note: "参宿三星是猎户的腰带。这张图把距星放在西边的参宿三。乾隆年间曾改到参宿一，两颗都在图上。" },
    { hip: 30343, char: "井", beast: "朱雀", note: "朱雀从井宿开始。井宿一在双子座，参宿的北面。" },
    { hip: 41822, char: "鬼", beast: "朱雀", note: "鬼宿很小。正中有一团叫积尸气，郊外才能感到它是模糊的。" },
    { hip: 42313, char: "柳", beast: "朱雀", note: "朱雀的喙。柳宿一在长蛇座，春天的南天。" },
    { hip: 46390, char: "星", beast: "朱雀", note: "原名七星。星宿一是长蛇座最亮的一颗，周围很空。" },
    { hip: 48356, char: "张", beast: "朱雀", note: "张开的弓。张宿在长蛇座后段，距星不亮。" },
    { hip: 53740, char: "翼", beast: "朱雀", note: "鸟的翅膀。翼宿一在巨爵座。" },
    { hip: 59803, char: "轸", beast: "朱雀", note: "一辆车，也是朱雀最后一宿。轸宿一在乌鸦座，是那里最亮的星。" }
  ];

  const NOTES = {
    32349: "全天亮星之最。顺着猎户腰带往东南，不会认错。大约 8.6 光年。",
    30438: "全天第二亮。中国大部分地方看不见，得到岭南或海南的冬天南天。",
    91262: "织女。和河鼓二隔着银河。大约 25 光年。",
    97649: "牛郎星，河鼓二。两侧的河鼓一、河鼓三，传说是他挑着的两个孩子。大约 17 光年。",
    102098: "天津四，天鹅的尾巴，夏季大三角里最远的一颗，大约两千六百光年。",
    27989: "参宿四，猎户的肩膀。红超巨星，仔细看偏橙。距离大约五百多光年，并不准。",
    24436: "参宿七，猎户的脚，蓝白，比参宿四更亮。",
    24608: "五车二。冬天头顶一颗黄星，大约 43 光年。",
    37279: "南河三，小犬。和天狼、参宿四组成冬夜三角。大约 11.5 光年。",
    21421: "毕宿五，金牛的红眼睛。它在毕星团前面，跟那团星没有关系。大约 65 光年。",
    80763: "心宿二。西名的意思是火星的对手，又红又亮。",
    69673: "大角。把北斗勺柄的弧线延长出去，就拐到它。大约 37 光年。",
    49669: "轩辕十四，狮子的心脏。黄道从它身边过，月亮行星常来。",
    11767: "勾陈一，北极星。几乎不动。它的高度，大约就是你所在的地理纬度。",
    54061: "天枢。和天璇连起来，向前大约五倍，就是北极星。",
    53910: "天璇。北斗勺口的另一颗，和天枢一起指北。",
    113368: "北落师门。秋天南边孤独的一颗，大约 25 光年。",
    71683: "南门二。最近的恒星系统就在这里，只有南方能看见。大约 4.3 光年。",
    37826: "北河三，双子里偏黄的那颗。",
    36850: "北河二，实际上是一套六合星，肉眼看是一颗。",
    98036: "河鼓一，牛郎身旁的一颗。",
    97278: "河鼓三，牛郎另一侧。三颗排成一根短扁担。"
  };

  const NEBULAE = [
    { id: "m45", name: "昴星团", ra: 56.87, dec: 24.1, w: 1.5, note: "七姐妹。城市里常只剩一团雾，暗处能数出六颗。" },
    { id: "m42", name: "猎户大星云", ra: 83.82, dec: -5.39, w: 0.75, note: "腰带下面那团气。肉眼看是模糊的一星，不是一颗点。" },
    { id: "m31", name: "仙女座星系", ra: 10.68, dec: 41.27, w: 1.7, note: "北天肉眼能及的最远天体。光大约走了二百五十万年。" },
    { id: "m44", name: "积尸气", ra: 130.1, dec: 19.8, w: 0.95, note: "鬼宿正中。郊外看是一小片白雾。" },
    { id: "peri", name: "英仙双星团", ra: 34.8, dec: 57.1, w: 0.85, note: "秋天高空两团挨着的星，眼睛要先适应黑暗。" }
  ];

  const SHOWERS = [
    { name: "象限仪座流星雨", a: [1, 1], b: [1, 5], p: [1, 3], zhr: 80, ra: 230, dec: 49, note: "年初最猛，窗口只有几天。" },
    { name: "英仙座流星雨", a: [7, 17], b: [8, 24], p: [8, 12], zhr: 100, ra: 48, dec: 58, note: "夏天最稳的一场。" },
    { name: "猎户座流星雨", a: [10, 2], b: [11, 7], p: [10, 21], zhr: 20, ra: 95, dec: 16, note: "猎户升起之后，后半夜较多。" },
    { name: "南金牛座流星雨", a: [10, 10], b: [11, 20], p: [11, 5], zhr: 5, ra: 53, dec: 14, note: "慢，偶尔有很亮的火流星。" },
    { name: "北金牛座流星雨", a: [10, 20], b: [12, 10], p: [11, 12], zhr: 5, ra: 58, dec: 22, note: "辐射点靠近昴星团。" },
    { name: "狮子座流星雨", a: [11, 6], b: [11, 30], p: [11, 17], zhr: 15, ra: 152, dec: 22, note: "十一月中旬才到极大。有的年份会爆发。" },
    { name: "双子座流星雨", a: [12, 4], b: [12, 17], p: [12, 14], zhr: 150, ra: 112, dec: 33, note: "一年里最值得守的一场。" }
  ];

  const byHip = new Map();
  DATA.stars.forEach(function (s, i) { s.i = i; byHip.set(s.h, s); });

  const $ = function (id) { return document.getElementById(id); };
  const canvas = $("sky");
  const ctx = canvas.getContext("2d");
  const moonCanvas = $("moonDisc");
  const mctx = moonCanvas.getContext("2d");

  const state = {
    city: "北京",
    lat: 39.9042,
    lon: 116.4074,
    jd: A.jdFromUnix(Date.now()),
    mode: "all",
    facing: 180,
    altCenter: 30,
    fov: 96,
    azRotate: 0,
    magLimit: 4.4,
    layers: {
      names: true, lines: true, conNames: true, mansions: true, guide: true,
      ecliptic: true, milky: true, nebulae: true, grid: true, far: true
    },
    selected: null,
    playing: false,
    playUntil: null,
    speed: 40
  };

  try {
    const saved = JSON.parse(localStorage.getItem("paper-sky") || "null");
    if (saved && typeof saved.lat === "number") {
      state.city = saved.city || "自定义";
      state.lat = saved.lat;
      state.lon = saved.lon;
      if (saved.mode) state.mode = saved.mode;
      if (saved.magLimit) state.magLimit = saved.magLimit;
      if (saved.layers) Object.assign(state.layers, saved.layers);
    }
  } catch (err) { /* 本地记不住就用北京 */ }

  let scene = null;
  let view = { cx: 0, cy: 0, R: 0, w: 0, h: 0 };
  let drag = null;
  let raf = 0;
  let lastTick = 0;
  const meteors = [];
  const labelQueue = [];

  function save() {
    try {
      localStorage.setItem("paper-sky", JSON.stringify({
        city: state.city, lat: state.lat, lon: state.lon,
        mode: state.mode, magLimit: state.magLimit, layers: state.layers
      }));
    } catch (err) { /* 忽略 */ }
  }

  function doy(m, d) {
    const md = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let n = d;
    for (let i = 1; i < m; i++) n += md[i];
    return n;
  }

  function showerStrength(sh, month, day) {
    const t = doy(month, day);
    const a = doy(sh.a[0], sh.a[1]);
    const b = doy(sh.b[0], sh.b[1]);
    const p = doy(sh.p[0], sh.p[1]);
    if (t < a || t > b) return 0;
    if (t <= p) return (t - a) / Math.max(1, p - a);
    return (b - t) / Math.max(1, b - p);
  }

  function vec(ra, dec) {
    const a = ra * Math.PI / 180, d = dec * Math.PI / 180;
    return [Math.cos(d) * Math.cos(a), Math.cos(d) * Math.sin(a), Math.sin(d)];
  }
  function fromVec(v) {
    return {
      ra: A.norm(Math.atan2(v[1], v[0]) * 180 / Math.PI),
      dec: Math.atan2(v[2], Math.hypot(v[0], v[1])) * 180 / Math.PI
    };
  }
  function stepToward(ra1, dec1, ra2, dec2, deg) {
    const v1 = vec(ra1, dec1), v2 = vec(ra2, dec2);
    const cos = A.clamp(v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2], -1, 1);
    const ang = Math.acos(cos);
    if (ang < 1e-4) return { ra: ra1, dec: dec1 };
    const t = Math.min(1, (deg * Math.PI / 180) / ang);
    const s1 = Math.sin((1 - t) * ang) / Math.sin(ang);
    const s2 = Math.sin(t * ang) / Math.sin(ang);
    return fromVec([v1[0] * s1 + v2[0] * s2, v1[1] * s1 + v2[1] * s2, v1[2] * s1 + v2[2] * s2]);
  }

  /* 全天图是仰视图：北在上，东在左。 */
  function polarSky(r, az) {
    const a = (az + state.azRotate) * Math.PI / 180;
    return { x: view.cx - r * Math.sin(a), y: view.cy - r * Math.cos(a) };
  }

  function project(alt, az) {
    if (state.mode === "all") {
      if (alt < -2) return null;
      const r = ((90 - alt) / 90) * view.R;
      return polarSky(r, az);
    }
    const alt0 = state.altCenter * Math.PI / 180;
    const daz = A.wrap180(az - state.facing) * Math.PI / 180;
    const al = alt * Math.PI / 180;
    const x = Math.cos(al) * Math.sin(daz);
    const y = Math.sin(al) * Math.cos(alt0) - Math.cos(al) * Math.cos(daz) * Math.sin(alt0);
    const z = Math.sin(al) * Math.sin(alt0) + Math.cos(al) * Math.cos(daz) * Math.cos(alt0);
    if (z <= 0.05) return null;
    const f = (view.w / 2) / Math.tan((state.fov / 2) * Math.PI / 180);
    const sx = view.cx + f * x / z;
    const sy = view.cy - f * y / z;
    if (sx < -40 || sy < -40 || sx > view.w + 40 || sy > view.h + 40) return null;
    return { x: sx, y: sy };
  }

  function place(ra, dec) {
    const aa = A.altAz(ra, dec, state.lat, scene.lst);
    const app = A.apparentAlt(aa.alt, "star");
    return { alt: aa.alt, az: aa.az, app: app, p: project(app, aa.az) };
  }

  function skyColor(sunAlt) {
    const stops = [
      [-90, [12, 16, 26]], [-18, [16, 24, 40]], [-12, [32, 46, 70]],
      [-6, [78, 98, 122]], [0, [132, 156, 168]], [12, [168, 196, 204]], [90, [186, 214, 220]]
    ];
    let i = 0;
    while (i < stops.length - 2 && sunAlt > stops[i + 1][0]) i++;
    const a = stops[i], b = stops[i + 1];
    const u = A.clamp((sunAlt - a[0]) / (b[0] - a[0]), 0, 1);
    return a[1].map(function (v, k) { return Math.round(v + (b[1][k] - v) * u); });
  }

  function starFade(sunAlt, mag) {
    const gate = mag < -3 ? 2 : mag < -1 ? -1 : mag < 0.2 ? -3 : -5;
    if (sunAlt < gate - 8) return 1;
    if (sunAlt > gate) return 0;
    return (gate - sunAlt) / 8;
  }

  function compute() {
    const jd = state.jd;
    const lst = A.lst(jd, state.lon);
    const sunEq = A.sunEquatorial(jd);
    const sunAA = A.altAz(sunEq.ra, sunEq.dec, state.lat, lst);
    const sunApp = A.apparentAlt(sunAA.alt, "sun");
    const moonEq = A.moonEquatorial(jd);
    const moonAA = A.altAz(moonEq.ra, moonEq.dec, state.lat, lst);
    const moonApp = A.apparentAlt(moonAA.alt, "moon", moonEq.hp);

    const stars = DATA.stars.map(function (s) {
      const pr = A.precess(s.ra, s.de, jd);
      return { s: s, ra: pr.ra, dec: pr.dec };
    });

    const mansionBodies = MANSIONS.map(function (m) {
      const st = byHip.get(m.hip);
      const pr = st ? A.precess(st.ra, st.de, jd) : { ra: 0, dec: 0 };
      return { hip: m.hip, char: m.char, beast: m.beast, note: m.note, ra: pr.ra, dec: pr.dec, star: st };
    });

    function hostOf(ra) {
      let chosen = mansionBodies[0];
      let best = 1e9;
      mansionBodies.forEach(function (m) {
        const east = A.norm(ra - m.ra);
        if (east < best) { best = east; chosen = m; }
      });
      return { char: chosen.char, beast: chosen.beast, ru: best, hip: chosen.hip };
    }

    const planets = PLANETS.map(function (meta) {
      const eq = A.planetEquatorial(meta.id, jd);
      const aa = A.altAz(eq.ra, eq.dec, state.lat, lst);
      const app = A.apparentAlt(aa.alt, "star");
      return Object.assign({}, meta, eq, { alt: aa.alt, az: aa.az, app: app });
    });

    const bj = A.beijingFromJd(jd);
    let lunar = null;
    try { lunar = A.lunarCalendar(bj.y, bj.m, bj.d); } catch (err) { lunar = null; }
    const term = A.termInfo(jd);

    scene = {
      jd: jd, lst: lst, bj: bj, lunar: lunar, term: term,
      sun: Object.assign({}, sunEq, { alt: sunAA.alt, az: sunAA.az, app: sunApp }),
      moon: Object.assign({}, moonEq, {
        alt: moonAA.alt, az: moonAA.az, app: moonApp,
        phaseName: A.phaseName(moonEq.signedElong, moonEq.illum)
      }),
      stars: stars,
      mansions: mansionBodies,
      planets: planets,
      sunHost: hostOf(sunEq.ra),
      moonHost: hostOf(moonEq.ra)
    };
    scene.sun.p = project(scene.sun.app, scene.sun.az);
    scene.moon.p = project(scene.moon.app, scene.moon.az);
    planets.forEach(function (p) { p.p = project(p.app, p.az); });
  }

  function font(px) {
    return px + "px " + getComputedStyle(document.body).fontFamily;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(rect.width * dpr));
    canvas.height = Math.max(2, Math.round(rect.height * dpr));
    view.w = canvas.width;
    view.h = canvas.height;
    view.cx = view.w / 2;
    view.cy = view.h / 2;
    view.R = Math.min(view.w, view.h) * 0.46;
    if (scene) {
      compute();
      draw();
    }
  }

  function discBackground() {
    const col = skyColor(scene.sun.app);
    const g = ctx.createRadialGradient(view.cx, view.cy - view.R * 0.15, view.R * 0.1, view.cx, view.cy, view.R);
    g.addColorStop(0, "rgb(" + Math.min(255, col[0] + 18) + "," + Math.min(255, col[1] + 16) + "," + Math.min(255, col[2] + 12) + ")");
    g.addColorStop(1, "rgb(" + col.map(function (v) { return Math.round(v * 0.72); }).join(",") + ")");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
    ctx.fill();
  }

  function horizonBackground() {
    const col = skyColor(scene.sun.app);
    const g = ctx.createLinearGradient(0, 0, 0, view.h);
    g.addColorStop(0, "rgb(" + col.map(function (v) { return Math.round(v * 0.55); }).join(",") + ")");
    g.addColorStop(0.55, "rgb(" + col.join(",") + ")");
    g.addColorStop(1, "rgb(" + col.map(function (v) { return Math.round(v * 0.8 + 20); }).join(",") + ")");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
    const hp = project(0, state.facing);
    if (hp) {
      const ground = ctx.createLinearGradient(0, hp.y, 0, view.h);
      ground.addColorStop(0, "rgba(28, 24, 18, 0.2)");
      ground.addColorStop(1, "rgba(18, 14, 10, 0.92)");
      ctx.fillStyle = ground;
      ctx.fillRect(0, hp.y, view.w, view.h - hp.y);
      ctx.strokeStyle = "rgba(232, 214, 180, 0.45)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, hp.y);
      ctx.lineTo(view.w, hp.y);
      ctx.stroke();
    }
  }

  function sunGlow() {
    if (scene.sun.app < -20 || !scene.sun.p) return;
    const p = scene.sun.p;
    const reach = state.mode === "all" ? view.R * 0.85 : view.w * 0.45;
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, reach);
    const a = A.clamp((scene.sun.app + 18) / 22, 0, 0.55);
    g.addColorStop(0, "rgba(255, 214, 150," + a + ")");
    g.addColorStop(0.35, "rgba(255, 170, 110," + a * 0.35 + ")");
    g.addColorStop(1, "rgba(255, 160, 90, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, view.w, view.h);
  }

  function drawMilky() {
    if (!state.layers.milky || scene.sun.app > -4) return;
    const fade = starFade(scene.sun.app, 2);
    for (let l = 0; l < 360; l += 4) {
      for (let b = -16; b <= 16; b += 5.5) {
        const eq0 = A.galToEq(l, b);
        const eq = A.precess(eq0.ra, eq0.dec, state.jd);
        const loc = place(eq.ra, eq.dec);
        if (!loc.p || loc.app < 0) continue;
        const core = Math.exp(-Math.pow(A.wrap180(l) / 55, 2));
        const band = Math.exp(-Math.pow(b / 11, 2));
        const alpha = fade * band * (0.035 + 0.07 * core) * A.clamp(loc.app / 20, 0.2, 1);
        ctx.fillStyle = "rgba(226, 226, 240," + alpha + ")";
        ctx.beginPath();
        const rad = (state.mode === "all" ? view.R * 0.035 : view.w * 0.02) * (0.7 + band);
        ctx.arc(loc.p.x, loc.p.y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawPath(samples, color, width) {
    ctx.beginPath();
    let pen = false;
    samples.forEach(function (pt) {
      if (!pt) { pen = false; return; }
      if (!pen) { ctx.moveTo(pt.x, pt.y); pen = true; }
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function drawEclipticEquator() {
    if (!state.layers.ecliptic) return;
    const eps = A.obliquity(state.jd) * Math.PI / 180;
    const ecl = [];
    const eq = [];
    for (let lon = 0; lon <= 360; lon += 3) {
      const l = lon * Math.PI / 180;
      const x = Math.cos(l);
      const y = Math.sin(l) * Math.cos(eps);
      const z = Math.sin(l) * Math.sin(eps);
      const ra = A.norm(Math.atan2(y, x) * 180 / Math.PI);
      const dec = Math.atan2(z, Math.hypot(x, y)) * 180 / Math.PI;
      const onEcl = place(ra, dec);
      const onEq = place(lon, 0);
      ecl.push(onEcl.app > -1 ? onEcl.p : null);
      eq.push(onEq.app > -1 ? onEq.p : null);
    }
    drawPath(eq, "rgba(186, 206, 216, 0.35)", 1);
    drawPath(ecl, "rgba(212, 176, 96, 0.7)", 1.15);
  }

  function drawConstellations() {
    if (!state.layers.lines && !state.layers.conNames) return;
    const fade = starFade(scene.sun.app, 1.5);
    DATA.lines.forEach(function (line) {
      if (!state.layers.lines) return;
      line.s.forEach(function (seg) {
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i < seg.length; i++) {
          const pr = A.precess(seg[i][0], seg[i][1], state.jd);
          const loc = place(pr.ra, pr.dec);
          if (!loc.p || loc.app < -1) { pen = false; continue; }
          if (!pen) { ctx.moveTo(loc.p.x, loc.p.y); pen = true; }
          else ctx.lineTo(loc.p.x, loc.p.y);
        }
        ctx.strokeStyle = "rgba(196, 206, 214," + (0.28 * fade) + ")";
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });
  }

  function drawMansionRing() {
    if (!state.layers.mansions) return;
    ctx.beginPath();
    let pen = false;
    scene.mansions.forEach(function (m) {
      const loc = place(m.ra, m.dec);
      m.loc = loc;
      if (!loc.p || loc.app < 0) { pen = false; return; }
      if (!pen) { ctx.moveTo(loc.p.x, loc.p.y); pen = true; }
      else ctx.lineTo(loc.p.x, loc.p.y);
    });
    const first = scene.mansions[0];
    const last = scene.mansions[scene.mansions.length - 1];
    if (first.loc && last.loc && first.loc.p && last.loc.p && first.loc.app > 0 && last.loc.app > 0) {
      ctx.moveTo(last.loc.p.x, last.loc.p.y);
      ctx.lineTo(first.loc.p.x, first.loc.p.y);
    }
    ctx.strokeStyle = "rgba(196, 92, 78," + (0.5 * starFade(scene.sun.app, 1.5)) + ")";
    ctx.setLineDash([3, 5]);
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawGuide() {
    if (!state.layers.guide) return;
    const pointer = [53910, 54061, 11767].map(function (hip) { return byHip.get(hip); }).filter(Boolean);
    ctx.beginPath();
    let pen = false;
    pointer.forEach(function (s) {
      const pr = scene.stars[s.i];
      const loc = place(pr.ra, pr.dec);
      if (!loc.p || loc.app < 0) { pen = false; return; }
      if (!pen) { ctx.moveTo(loc.p.x, loc.p.y); pen = true; }
      else ctx.lineTo(loc.p.x, loc.p.y);
    });
    ctx.setLineDash([2, 6]);
    ctx.strokeStyle = "rgba(232, 220, 190," + (0.55 * starFade(scene.sun.app, 1)) + ")";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawNebulae() {
    if (!state.layers.nebulae || scene.sun.app > -8) return;
    NEBULAE.forEach(function (n) {
      const pr = A.precess(n.ra, n.dec, state.jd);
      const loc = place(pr.ra, pr.dec);
      n.loc = loc;
      n.pra = pr.ra;
      n.pdec = pr.dec;
      if (!loc.p || loc.app < 0) return;
      const scale = state.mode === "all" ? view.R / 90 : (view.w / 2) / Math.tan((state.fov / 2) * Math.PI / 180);
      const rad = Math.max(6, n.w * scale);
      const g = ctx.createRadialGradient(loc.p.x, loc.p.y, 0, loc.p.x, loc.p.y, rad);
      g.addColorStop(0, "rgba(210, 216, 230, 0.28)");
      g.addColorStop(1, "rgba(210, 216, 230, 0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(loc.p.x, loc.p.y, rad, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawStars() {
    const fade = starFade(scene.sun.app, 3);
    scene.stars.forEach(function (st) {
      const s = st.s;
      if (s.m > state.magLimit) { st.loc = null; return; }
      const loc = place(st.ra, st.dec);
      st.loc = loc;
      if (!loc.p || loc.app < 0) return;
      const vis = fade * A.clamp(loc.app / 12, 0.25, 1);
      if (vis < 0.04) return;
      const rgb = A.starRgb(s.bv);
      const r = Math.max(0.6, (3.3 - s.m * 0.52) * (view.w / 900));
      ctx.globalAlpha = vis;
      if (s.m < 1.2) {
        ctx.fillStyle = "rgba(" + rgb.join(",") + ",0.18)";
        ctx.beginPath();
        ctx.arc(loc.p.x, loc.p.y, r * 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "rgb(" + rgb.join(",") + ")";
      ctx.beginPath();
      ctx.arc(loc.p.x, loc.p.y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawDisc(p, radius, k, toward) {
    if (!p) return;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(toward);
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = "#2a261f";
    ctx.fill();
    ctx.beginPath();
    const fat = k >= 0.5;
    ctx.arc(0, 0, radius, -Math.PI / 2, Math.PI / 2, !fat);
    ctx.ellipse(0, 0, Math.max(0.4, Math.abs(2 * k - 1) * radius), radius, 0, Math.PI / 2, -Math.PI / 2, fat);
    ctx.fillStyle = "#f4efe2";
    ctx.fill();
    ctx.restore();
  }

  function angleToward(fromRa, fromDec, toRa, toDec, origin) {
    const step = stepToward(fromRa, fromDec, toRa, toDec, 3);
    const loc = place(step.ra, step.dec);
    if (!origin || !loc.p) return 0;
    return Math.atan2(loc.p.y - origin.y, loc.p.x - origin.x);
  }

  function drawBodies() {
    scene.planets.forEach(function (p) {
      if (p.far && !state.layers.far) return;
      if (!p.p || p.app < -1) return;
      const vis = starFade(scene.sun.app, p.mag);
      const daylight = p.mag < -3.5 && p.app > 5;
      if (vis < 0.2 && !daylight) return;
      ctx.globalAlpha = daylight ? Math.max(vis, 0.9) : vis;
      const r = Math.max(2.2, (4.4 - p.mag * 0.55) * (view.w / 1000));
      if (p.id === "saturn") {
        ctx.save();
        ctx.translate(p.p.x, p.p.y);
        ctx.rotate(-0.5);
        ctx.strokeStyle = p.tint;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 2.4, Math.max(1, r * 2.4 * Math.abs(Math.sin(p.ringB * Math.PI / 180))), 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      if (p.id === "venus" || p.id === "mercury") {
        drawDisc(p.p, Math.max(3.5, r), p.illum, angleToward(p.ra, p.dec, scene.sun.ra, scene.sun.dec, p.p));
      } else {
        ctx.fillStyle = p.tint;
        ctx.beginPath();
        ctx.arc(p.p.x, p.p.y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      queueLabel(p.p.x, p.p.y, p.name, scene.sun.app > -3 ? "#241c14" : "#f3ead8", 13, 1);
    });

    if (scene.moon.p && scene.moon.app > -2) {
      const ang = angleToward(scene.moon.ra, scene.moon.dec, scene.sun.ra, scene.sun.dec, scene.moon.p);
      drawDisc(scene.moon.p, Math.max(7, view.w / 90), scene.moon.illum, ang);
      queueLabel(scene.moon.p.x, scene.moon.p.y, "月", scene.sun.app > -3 ? "#241c14" : "#f3ead8", 13, 1);
    }
    if (scene.sun.p && scene.sun.app > -2) {
      ctx.fillStyle = "#f2c14e";
      ctx.beginPath();
      ctx.arc(scene.sun.p.x, scene.sun.p.y, Math.max(8, view.w / 80), 0, Math.PI * 2);
      ctx.fill();
      queueLabel(scene.sun.p.x, scene.sun.p.y, "日", "#2a2118", 13, 1);
    }
  }

  function queueLabel(x, y, text, color, size, priority) {
    if (!text) return;
    labelQueue.push({ x: x, y: y, text: text, color: color, size: size, priority: priority });
  }

  function flushLabels() {
    labelQueue.sort(function (a, b) { return a.priority - b.priority; });
    const boxes = [];
    labelQueue.forEach(function (lab) {
      ctx.font = font(lab.size);
      const w = ctx.measureText(lab.text).width;
      const box = { x: lab.x + 6, y: lab.y - lab.size, w: w + 2, h: lab.size + 3 };
      if (state.mode === "all") {
        const dx = lab.x - view.cx, dy = lab.y - view.cy;
        if (Math.hypot(dx, dy) > view.R - 8) return;
      }
      const hit = boxes.some(function (b) {
        return box.x < b.x + b.w && box.x + box.w > b.x && box.y < b.y + b.h && box.y + box.h > b.y;
      });
      if (hit && lab.priority > 0) return;
      boxes.push(box);
      ctx.fillStyle = lab.color;
      ctx.textBaseline = "middle";
      ctx.fillText(lab.text, box.x, lab.y);
    });
    labelQueue.length = 0;
  }

  function labelStars() {
    const nightEnough = starFade(scene.sun.app, 1.6) > 0.35;
    if (state.layers.names && nightEnough) {
      scene.stars.forEach(function (st) {
        if (!st.loc || !st.loc.p || st.loc.app < 2) return;
        const s = st.s;
        if (starFade(scene.sun.app, s.m) < 0.35) return;
        if (s.m > Math.min(state.magLimit, 2.15) && s.m > 2.15) return;
        if (!s.z && s.m > 1.4) return;
        const text = s.z || ((s.b ? s.b + " " : "") + (DATA.con[s.c] ? DATA.con[s.c].z : ""));
        const ink = scene.sun.app > -3 ? "#241c14" : "rgba(236,232,220,0.92)";
        queueLabel(st.loc.p.x, st.loc.p.y, text, ink, 12, s.m < 0.8 ? 2 : 3);
      });
    }
    if (state.layers.mansions && nightEnough) {
      scene.mansions.forEach(function (m) {
        if (!m.loc || !m.loc.p || m.loc.app < 0) return;
        queueLabel(m.loc.p.x, m.loc.p.y - 11, m.char, "#e7b2a4", 13, 2);
      });
      ["青龙", "玄武", "白虎", "朱雀"].forEach(function (beast) {
        const group = scene.mansions.filter(function (m) { return m.beast === beast && m.loc && m.loc.p && m.loc.app > 12; });
        if (group.length < 3) return;
        const x = group.reduce(function (s, m) { return s + m.loc.p.x; }, 0) / group.length;
        const y = group.reduce(function (s, m) { return s + m.loc.p.y; }, 0) / group.length;
        queueLabel(x, y, beast, "rgba(231,178,164,0.85)", 14, 4);
      });
    }
    if (state.layers.conNames && nightEnough) {
      const seen = {};
      scene.stars.forEach(function (st) {
        if (!st.loc || !st.loc.p || st.loc.app < 18 || st.s.m > 2.2 || st.s.c < 0) return;
        const id = st.s.c;
        if (!seen[id] || st.s.m < seen[id].s.m) seen[id] = st;
      });
      Object.keys(seen).forEach(function (id) {
        const st = seen[id];
        queueLabel(st.loc.p.x, st.loc.p.y + 14, DATA.con[id].z, "rgba(186,198,206,0.8)", 12, 5);
      });
    }
    [["夏三角", [91262, 97649, 102098]], ["冬夜三角", [32349, 37279, 27989]]].forEach(function (pair) {
      const pts = pair[1].map(function (hip) {
        const s = byHip.get(hip);
        return s ? scene.stars[s.i] : null;
      });
      if (pts.some(function (p) { return !p || !p.loc || !p.loc.p || p.loc.app < 8; })) return;
      const x = pts.reduce(function (s, p) { return s + p.loc.p.x; }, 0) / 3;
      const y = pts.reduce(function (s, p) { return s + p.loc.p.y; }, 0) / 3;
      queueLabel(x, y, pair[0], "rgba(232,220,190,0.8)", 13, 4);
    });
    if (state.selected && state.selected.p) {
      ctx.strokeStyle = "#e7d2a4";
      ctx.lineWidth = 1;
      ctx.strokeRect(state.selected.p.x - 8, state.selected.p.y - 8, 16, 16);
    }
  }

  function drawGrid() {
    if (!state.layers.grid) return;
    ctx.strokeStyle = "rgba(232, 224, 208, 0.16)";
    ctx.lineWidth = 1;
      if (state.mode === "all") {
      [30, 60].forEach(function (alt) {
        ctx.beginPath();
        ctx.arc(view.cx, view.cy, ((90 - alt) / 90) * view.R, 0, Math.PI * 2);
        ctx.stroke();
      });
      for (let az = 0; az < 360; az += 30) {
        ctx.beginPath();
        ctx.moveTo(view.cx, view.cy);
        const tip = polarSky(view.R, az);
        ctx.lineTo(tip.x, tip.y);
        ctx.stroke();
      }
    } else {
      [15, 30, 45, 60, 75].forEach(function (alt) {
        ctx.beginPath();
        let pen = false;
        for (let az = state.facing - 80; az <= state.facing + 80; az += 4) {
          const p = project(alt, az);
          if (!p) { pen = false; continue; }
          if (!pen) { ctx.moveTo(p.x, p.y); pen = true; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      });
    }
  }

  function drawRim() {
    if (state.mode !== "all") return;
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
    ctx.strokeStyle = "#241c14";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(view.cx, view.cy, view.R + 6, 0, Math.PI * 2);
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.font = font(15);
    ctx.fillStyle = "#241c14";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ["北", "东", "南", "西"].forEach(function (name, i) {
      const p = polarSky(view.R + 20, i * 90);
      ctx.fillText(name, p.x, p.y);
    });
    ctx.textAlign = "left";
  }

  function drawMeteors() {
    meteors.forEach(function (m) {
      ctx.strokeStyle = "rgba(255,246,230," + m.life + ")";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y);
      ctx.lineTo(m.x - m.vx * 8, m.y - m.vy * 8);
      ctx.stroke();
    });
  }

  function draw() {
    if (!scene) return;
    ctx.clearRect(0, 0, view.w, view.h);
    ctx.save();
    if (state.mode === "all") {
      ctx.beginPath();
      ctx.arc(view.cx, view.cy, view.R, 0, Math.PI * 2);
      ctx.clip();
      discBackground();
    } else {
      horizonBackground();
    }
    sunGlow();
    drawMilky();
    drawEclipticEquator();
    drawConstellations();
    drawMansionRing();
    drawGuide();
    drawNebulae();
    drawStars();
    drawBodies();
    drawGrid();
    drawMeteors();
    labelStars();
    flushLabels();
    ctx.restore();
    drawRim();
  }

  function crossingsOf(kind) {
    const fn = function (jd) {
      if (kind === "sun") {
        const eq = A.sunEquatorial(jd);
        const aa = A.altAz(eq.ra, eq.dec, state.lat, A.lst(jd, state.lon));
        return A.apparentAlt(aa.alt, "sun");
      }
      if (kind === "moon") {
        const eq = A.moonEquatorial(jd);
        const aa = A.altAz(eq.ra, eq.dec, state.lat, A.lst(jd, state.lon));
        return A.apparentAlt(aa.alt, "moon", eq.hp);
      }
      return 0;
    };
    return A.crossings(fn, state.jd - 0.2, state.jd + 1.4, 0);
  }

  function whenStar(ra, dec) {
    const fn = function (jd) {
      const aa = A.altAz(ra, dec, state.lat, A.lst(jd, state.lon));
      return A.apparentAlt(aa.alt, "star");
    };
    const now = fn(state.jd);
    const ev = A.crossings(fn, state.jd - 0.05, state.jd + 1.15, 0).filter(function (e) { return e.jd >= state.jd - 1e-4; });
    const rise = ev.find(function (e) { return e.rising; });
    const set = ev.find(function (e) { return !e.rising; });
    return { now: now, rise: rise, set: set };
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function fmtMag(m) {
    const v = (m >= 0 ? "+" : "") + m.toFixed(1);
    return v;
  }

  function groupSentence() {
    const groups = [
      ["猎户", [27989, 24436, 25930]],
      ["北斗", [54061, 53910, 67301]],
      ["夏季大三角", [91262, 97649, 102098]],
      ["南斗", [92041, 90496, 89341]]
    ];
    let best = null;
    groups.forEach(function (g) {
      const locs = g[1].map(function (hip) {
        const s = byHip.get(hip);
        if (!s) return null;
        return place(scene.stars[s.i].ra, scene.stars[s.i].dec);
      }).filter(function (x) { return x && x.app > 8; });
      if (locs.length < Math.min(2, g[1].length)) return;
      const alt = locs.reduce(function (s, x) { return s + x.app; }, 0) / locs.length;
      if (!best || alt > best.alt) best = { name: g[0], alt: alt, az: locs[0].az };
    });
    if (!best) return "";
    const where = best.alt > 74 ? "几乎在头顶" : "在" + A.azName(best.az);
    return best.name + where + "。";
  }

  function renderReadout() {
    const moon = scene.moon;
    const sun = scene.sun;
    $("lede").textContent = [
      scene.term.name + "第 " + Math.max(1, Math.round(scene.term.days)) + " 天",
      scene.lunar ? scene.lunar.text : "",
      moon.illum < 0.04 ? "月亮贴着太阳，夜里几乎没有月光" : ("月相是" + moon.phaseName),
      groupSentence().replace(/。$/, "")
    ].filter(Boolean).join("，") + "。";

    $("status").textContent = [
      "地方恒星时 " + hmFromHours(scene.lst / 15),
      "太阳高度 " + sun.app.toFixed(0) + "°",
      "日在" + scene.sunHost.char + "宿 " + scene.sunHost.ru.toFixed(0) + "°",
      "月在" + scene.moonHost.char + "宿 " + scene.moonHost.ru.toFixed(0) + "°"
    ].join("  ·  ");

    drawMoonCard();
    $("moonName").textContent = moon.phaseName;
    const age = A.norm(moon.signedElong) / 360 * 29.53;
    const hoursFromNew = Math.abs(A.wrap180(moon.signedElong)) / 0.508;
    const ageLine = hoursFromNew < 18
      ? ((moon.signedElong < 0 ? "合朔还要约 " : "合朔已过约 ") + Math.max(1, Math.round(hoursFromNew)) + " 小时")
      : ("月龄约 " + age.toFixed(1) + " 日");
    $("moonText").textContent = [
      "光照 " + (moon.illum * 100).toFixed(0) + "%",
      ageLine,
      moon.app > 0 ? ("这会儿在" + A.azName(moon.az) + "，高度 " + moon.app.toFixed(0) + "°") : "这会儿在地平线下",
      "入" + scene.moonHost.char + "宿 " + scene.moonHost.ru.toFixed(1) + "°"
    ].join("。") + "。";

    const vis = scene.planets.filter(function (p) { return !p.far || state.layers.far; });
    $("planetList").innerHTML = vis.map(function (p) {
      const where = p.app > 0 ? (A.azName(p.az) + "  " + p.app.toFixed(0) + "°") : "地平线下";
      const role = p.signedElong > 12 ? "昏" : p.signedElong < -12 ? "晨" : "离日太近";
      const cur = state.selected && state.selected.kind === "planet" && state.selected.id === p.id;
      return "<li><button type=\"button\" data-planet=\"" + p.id + "\"" + (cur ? " aria-current=\"true\"" : "") + ">" +
        esc(p.name) + " " + fmtMag(p.mag) + "<span class=\"sub\">" + esc(role) + " · " + esc(where) +
        " · 距日 " + Math.abs(p.signedElong).toFixed(0) + "°</span></button></li>";
    }).join("");

    const night = nightTimes();
    const lines = [];
    if (scene.lunar) {
      lines.push(scene.lunar.text + " · " + scene.lunar.animal + "年");
      lines.push("干支 " + scene.lunar.yearPillar + "年 " + scene.lunar.monthPillar + "月 " + scene.lunar.dayPillar + "日");
      if (scene.lunar.yearPillar !== scene.lunar.lunarYearPillar) {
        lines.push("干支年按立春换岁，和正月初一的农历年不是同一天交接。");
      }
    } else {
      lines.push("这一天的农历没有推出来。");
    }
    lines.push(scene.term.name + "已过 " + scene.term.days.toFixed(1) + " 天，下一节气是" + scene.term.nextName + "，约 " + A.formatBeijing(scene.term.nextJd, true));
    if (night.set) lines.push("日落 " + A.formatBeijing(night.set));
    if (night.rise) lines.push("日出 " + A.formatBeijing(night.rise));
    if (night.darkStart && night.darkEnd) lines.push("天文黑夜 " + A.formatBeijing(night.darkStart) + " – " + A.formatBeijing(night.darkEnd));
    else if (sun.app > -18) lines.push("太阳降不到地平下 18°，今晚没有完整的天文黑夜。");
    lines.push("日在" + scene.sunHost.char + "宿，属" + scene.sunHost.beast + "。");
    $("calText").textContent = lines.join("\n");
    $("calText").style.whiteSpace = "pre-wrap";

    const active = activeShowers();
    if (!active.length) {
      $("showerText").textContent = "这几天没有主要流星雨。播放这一夜时，若辐射点在天上，会偶尔划过。";
    } else {
      $("showerText").textContent = active.map(function (sh) {
        const up = sh.loc && sh.loc.app > 0;
        return sh.name + "（约 " + Math.round(sh.zhr * sh.strength) + " 颗/时，极大附近才到标称值）。" +
          (up ? "辐射点在" + A.azName(sh.loc.az) + "。" : "辐射点还在地平线下。") + sh.note;
      }).join("\n");
      $("showerText").style.whiteSpace = "pre-wrap";
    }
    renderCard();
  }

  function hmFromHours(h) {
    h = ((h % 24) + 24) % 24;
    const hh = Math.floor(h);
    const mm = Math.floor((h - hh) * 60);
    return A.pad(hh) + ":" + A.pad(mm);
  }

  let nightCache = { key: "", set: null, rise: null, darkStart: null, darkEnd: null };
  function nightTimes() {
    const key = scene.bj.y + "-" + scene.bj.m + "-" + scene.bj.d + "@" + state.lat.toFixed(2) + "," + state.lon.toFixed(2);
    if (nightCache.key === key) return nightCache;
    const noon = A.jdFromBeijing(scene.bj.y, scene.bj.m, scene.bj.d, 12, 0, 0);
    const sunAlt = function (jd) {
      const eq = A.sunEquatorial(jd);
      const aa = A.altAz(eq.ra, eq.dec, state.lat, A.lst(jd, state.lon));
      return A.apparentAlt(aa.alt, "sun");
    };
    const ev = A.crossings(sunAlt, noon - 0.05, noon + 1.35, 0);
    const dark = A.crossings(sunAlt, noon - 0.05, noon + 1.35, -18);
    nightCache = {
      key: key,
      set: (ev.find(function (e) { return !e.rising; }) || {}).jd || null,
      rise: (ev.find(function (e) { return e.rising; }) || {}).jd || null,
      darkStart: (dark.find(function (e) { return !e.rising; }) || {}).jd || null,
      darkEnd: (dark.find(function (e) { return e.rising; }) || {}).jd || null
    };
    return nightCache;
  }

  function activeShowers() {
    return SHOWERS.map(function (sh) {
      const strength = showerStrength(sh, scene.bj.m, scene.bj.d);
      if (strength <= 0.02) return null;
      const pr = A.precess(sh.ra, sh.dec, state.jd);
      const loc = place(pr.ra, pr.dec);
      return Object.assign({}, sh, { strength: strength, loc: loc, raNow: pr.ra, decNow: pr.dec });
    }).filter(Boolean);
  }

  function drawMoonCard() {
    const w = moonCanvas.width, h = moonCanvas.height;
    mctx.clearRect(0, 0, w, h);
    mctx.save();
    mctx.translate(w / 2, h / 2);
    const R = 58;
    const k = scene.moon.illum;
    const ang = angleToward(scene.moon.ra, scene.moon.dec, scene.sun.ra, scene.sun.dec, scene.moon.p || { x: view.cx, y: view.cy });
    mctx.rotate(scene.moon.p ? ang : (scene.moon.signedElong >= 0 ? 0 : Math.PI));
    mctx.beginPath();
    mctx.arc(0, 0, R, 0, Math.PI * 2);
    mctx.fillStyle = "#2c2822";
    mctx.fill();
    mctx.beginPath();
    const fat = k >= 0.5;
    mctx.arc(0, 0, R, -Math.PI / 2, Math.PI / 2, !fat);
    mctx.ellipse(0, 0, Math.max(0.6, Math.abs(2 * k - 1) * R), R, 0, Math.PI / 2, -Math.PI / 2, fat);
    mctx.fillStyle = "#f6f1e6";
    mctx.fill();
    mctx.restore();
  }

  function renderCard() {
    const sel = state.selected;
    const card = $("card");
    if (!sel) {
      card.innerHTML = "<p class=\"muted\">点星星、月亮或行星。全天图北在上，地平图里拖动就是转身。</p>";
      return;
    }
    if (sel.kind === "star") {
      const s = byHip.get(sel.hip);
      const st = scene.stars[s.i];
      const loc = st.loc || place(st.ra, st.dec);
      const t = whenStar(st.ra, st.dec);
      const man = MANSIONS.find(function (m) { return m.hip === s.h; });
      const con = s.c >= 0 ? DATA.con[s.c].z : "";
      const bits = [];
      bits.push("<p class=\"big\">" + esc(s.z || (s.b + " " + con)) + "</p>");
      bits.push("<p>" + esc([s.e, con, s.b && (s.b + " 星")].filter(Boolean).join(" · ")) + "</p>");
      bits.push("<p>视星等 " + s.m.toFixed(2) + (A.colorWord(s.bv) ? " · " + A.colorWord(s.bv) : "") + "</p>");
      bits.push("<p>" + (loc.app > 0
        ? ("高度 " + loc.app.toFixed(0) + "° · " + A.azName(loc.az))
        : "在地平线下") + "</p>");
      if (t.now > 0 && !t.set) bits.push("<p>这颗星不下地平线。</p>");
      else if (t.now < 0 && !t.rise) bits.push("<p>在这个纬度它升不起来。</p>");
      else {
        if (t.rise) bits.push("<p>升起 " + A.formatBeijing(t.rise.jd) + "</p>");
        if (t.set) bits.push("<p>落下 " + A.formatBeijing(t.set.jd) + "</p>");
      }
      if (man) bits.push("<p>" + esc(man.note) + "</p>");
      if (NOTES[s.h]) bits.push("<p>" + esc(NOTES[s.h]) + "</p>");
      card.innerHTML = bits.join("");
      return;
    }
    if (sel.kind === "planet") {
      const p = scene.planets.find(function (x) { return x.id === sel.id; });
      const role = p.signedElong > 12 ? "在太阳东边，日落后出现，是昏星。" : p.signedElong < -12 ? "在太阳西边，日出前出现，是晨星。" : "离太阳太近，不容易看见。";
      card.innerHTML = "<p class=\"big\">" + esc(p.name) + "</p><p>星等 " + fmtMag(p.mag) + " · 光照 " + Math.round(p.illum * 100) + "%</p><p>" +
        (p.app > 0 ? ("高度 " + p.app.toFixed(0) + "° · " + A.azName(p.az)) : "在地平线下") + "</p><p>" + role + " 离日 " + Math.abs(p.signedElong).toFixed(0) + "°。</p>" +
        (p.far ? "<p>肉眼很难看见，需要望远镜。</p>" : "");
      return;
    }
    if (sel.kind === "moon") {
      card.innerHTML = "<p class=\"big\">月亮</p><p>" + esc(scene.moon.phaseName) + "，光照 " + Math.round(scene.moon.illum * 100) + "%。</p><p>入" +
        scene.moonHost.char + "宿 " + scene.moonHost.ru.toFixed(1) + "°，" + scene.moonHost.beast + "。</p><p>亮的那边朝着太阳。朔日几乎和太阳同升同落。</p>";
      return;
    }
    if (sel.kind === "nebula") {
      const n = NEBULAE.find(function (x) { return x.id === sel.id; });
      card.innerHTML = "<p class=\"big\">" + esc(n.name) + "</p><p>" + esc(n.note) + "</p>";
    }
  }

  function syncInputs() {
    const p = A.beijingFromJd(state.jd);
    $("date").value = p.y + "-" + A.pad(p.m) + "-" + A.pad(p.d);
    $("time").value = A.pad(p.h) + ":" + A.pad(p.min);
    $("lat").value = state.lat.toFixed(2);
    $("lon").value = state.lon.toFixed(2);
    $("mag").value = state.magLimit.toFixed(1);
    $("magVal").textContent = state.magLimit.toFixed(1);
    $("modeAll").setAttribute("aria-pressed", state.mode === "all" ? "true" : "false");
    $("modeHor").setAttribute("aria-pressed", state.mode === "horizon" ? "true" : "false");
    $("playBtn").textContent = state.playing ? "暂停" : "播放这一夜";
  }

  function readClock() {
    const d = $("date").value.split("-").map(Number);
    const t = ($("time").value || "00:00").split(":").map(Number);
    if (d.length < 3 || d.some(function (n) { return !n && n !== 0; })) return;
    state.jd = A.jdFromBeijing(d[0], d[1], d[2], t[0] || 0, t[1] || 0, 0);
    state.playing = false;
    refresh();
  }

  function refresh() {
    nightCache.key = "";
    resize();
    compute();
    draw();
    renderReadout();
    syncInputs();
  }

  function pointerPos(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  }

  function pick(x, y) {
    let best = null;
    let bestD = 18 * (canvas.width / canvas.getBoundingClientRect().width);
    function consider(p, item, bias) {
      if (!p) return;
      const d = Math.hypot(p.x - x, p.y - y) - (bias || 0);
      if (d < bestD) { bestD = d; best = item; }
    }
    consider(scene.moon.p, { kind: "moon", p: scene.moon.p }, 6);
    consider(scene.sun.p, { kind: "sun", p: scene.sun.p }, 4);
    scene.planets.forEach(function (p) {
      if (p.far && !state.layers.far) return;
      consider(p.p, { kind: "planet", id: p.id, p: p.p }, 6);
    });
    NEBULAE.forEach(function (n) {
      if (n.loc) consider(n.loc.p, { kind: "nebula", id: n.id, p: n.loc.p }, 2);
    });
    scene.stars.forEach(function (st) {
      if (!st.loc || st.s.m > state.magLimit) return;
      consider(st.loc.p, { kind: "star", hip: st.s.h, p: st.loc.p }, st.s.m < 1 ? 3 : 0);
    });
    state.selected = best;
    renderCard();
    draw();
  }

  function spawnMeteors(dt) {
    if (!state.playing) return;
    activeShowers().forEach(function (sh) {
      if (!sh.loc || sh.loc.app < 8) return;
      const rate = (sh.zhr * sh.strength * Math.max(0.15, Math.sin(sh.loc.app * Math.PI / 180))) / 3600;
      const expected = rate * state.speed * 60 * dt * 0.35;
      if (Math.random() > expected) return;
      const origin = sh.loc.p || project(sh.loc.app, sh.loc.az);
      if (!origin) return;
      const ang = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 140;
      meteors.push({
        x: origin.x + (Math.random() - 0.5) * view.w * 0.7,
        y: origin.y + (Math.random() - 0.5) * view.h * 0.7,
        vx: Math.cos(ang) * speed / 20,
        vy: Math.sin(ang) * speed / 20,
        life: 1
      });
    });
  }

  function frame(t) {
    const dt = Math.min(0.05, (t - lastTick) / 1000 || 0.016);
    lastTick = t;
    if (state.playing) {
      state.jd += (state.speed / 1440) * dt;
      if (state.playUntil && state.jd >= state.playUntil) {
        state.jd = state.playUntil;
        state.playing = false;
      }
      compute();
      syncInputs();
      if (Math.floor(t / 400) !== Math.floor((t - dt * 1000) / 400)) renderReadout();
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      m.x += m.vx;
      m.y += m.vy;
      m.life -= dt * 1.4;
      if (m.life <= 0) meteors.splice(i, 1);
    }
    spawnMeteors(dt);
    draw();
    if (state.playing || meteors.length) raf = requestAnimationFrame(frame);
    else raf = 0;
  }

  function ensureLoop() {
    if (!raf) {
      lastTick = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function playNight() {
    if (state.playing) {
      state.playing = false;
      syncInputs();
      return;
    }
    const sunAlt = function (jd) {
      const eq = A.sunEquatorial(jd);
      const aa = A.altAz(eq.ra, eq.dec, state.lat, A.lst(jd, state.lon));
      return A.apparentAlt(aa.alt, "sun");
    };
    const ev = A.crossings(sunAlt, state.jd - 0.9, state.jd + 1.6, 0);
    let set = null;
    ev.forEach(function (e) {
      if (!e.rising && e.jd <= state.jd + 0.01) set = e.jd;
    });
    if (set == null || sunAlt(state.jd) > 0) {
      const future = ev.find(function (e) { return !e.rising && e.jd >= state.jd - 0.01; });
      if (future) set = future.jd;
    }
    const rise = ev.find(function (e) { return e.rising && e.jd > (set || state.jd); });
    state.jd = set || state.jd;
    state.playUntil = rise ? rise.jd : state.jd + 0.45;
    state.playing = true;
    nightCache.key = "";
    compute();
    syncInputs();
    ensureLoop();
  }

  function jumpToNight() {
    const sunAlt = function (jd) {
      const eq = A.sunEquatorial(jd);
      const aa = A.altAz(eq.ra, eq.dec, state.lat, A.lst(jd, state.lon));
      return A.apparentAlt(aa.alt, "sun");
    };
    if (sunAlt(state.jd) <= -8) return;
    const ev = A.crossings(sunAlt, state.jd, state.jd + 1, -8);
    const down = ev.find(function (e) { return !e.rising; });
    if (down) {
      state.jd = down.jd;
      state.playing = false;
      refresh();
    }
  }

  function fillCities() {
    const sel = $("city");
    CITIES.forEach(function (c) {
      const o = document.createElement("option");
      o.value = c[0];
      o.textContent = c[0];
      sel.appendChild(o);
    });
    const custom = document.createElement("option");
    custom.value = "自定义";
    custom.textContent = "自定义";
    sel.appendChild(custom);
    sel.value = CITIES.some(function (c) { return c[0] === state.city; }) ? state.city : "自定义";
  }

  function bind() {
    fillCities();
    document.querySelectorAll("[data-layer]").forEach(function (box) {
      const key = box.getAttribute("data-layer");
      box.checked = !!state.layers[key];
      box.addEventListener("change", function () {
        state.layers[key] = box.checked;
        save();
        draw();
        renderReadout();
      });
    });
    $("city").addEventListener("change", function () {
      const found = CITIES.find(function (c) { return c[0] === $("city").value; });
      state.city = $("city").value;
      if (found) { state.lat = found[1]; state.lon = found[2]; }
      save();
      refresh();
    });
    $("lat").addEventListener("change", function () {
      state.lat = A.clamp(parseFloat($("lat").value) || 0, -55, 75);
      state.city = "自定义";
      $("city").value = "自定义";
      save();
      refresh();
    });
    $("lon").addEventListener("change", function () {
      state.lon = A.clamp(parseFloat($("lon").value) || 0, -180, 180);
      state.city = "自定义";
      $("city").value = "自定义";
      save();
      refresh();
    });
    $("date").addEventListener("change", readClock);
    $("time").addEventListener("change", readClock);
    $("mag").addEventListener("input", function () {
      state.magLimit = parseFloat($("mag").value);
      $("magVal").textContent = state.magLimit.toFixed(1);
      save();
      draw();
    });
    $("speed").addEventListener("change", function () { state.speed = parseFloat($("speed").value); });
    $("nowBtn").addEventListener("click", function () {
      state.jd = A.jdFromUnix(Date.now());
      state.playing = false;
      refresh();
    });
    $("nightBtn").addEventListener("click", jumpToNight);
    $("playBtn").addEventListener("click", playNight);
    $("modeAll").addEventListener("click", function () { state.mode = "all"; save(); refresh(); });
    $("modeHor").addEventListener("click", function () { state.mode = "horizon"; save(); refresh(); });
    $("resetView").addEventListener("click", function () {
      state.azRotate = 0;
      state.facing = 180;
      state.altCenter = 30;
      state.fov = 96;
      draw();
    });
    $("locBtn").addEventListener("click", function () {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(function (pos) {
        state.lat = pos.coords.latitude;
        state.lon = pos.coords.longitude;
        state.city = "自定义";
        $("city").value = "自定义";
        save();
        refresh();
      }, function () {
        $("status").textContent = "没有拿到位置，仍用当前城市。";
      }, { enableHighAccuracy: false, timeout: 8000 });
    });
    $("planetList").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-planet]");
      if (!btn) return;
      const p = scene.planets.find(function (x) { return x.id === btn.getAttribute("data-planet"); });
      state.selected = { kind: "planet", id: p.id, p: p.p };
      if (state.mode === "horizon" && p.app > 0) state.facing = p.az;
      renderCard();
      draw();
      renderReadout();
    });
    $("search").addEventListener("input", function () {
      const q = $("search").value.trim().toLowerCase();
      const box = $("results");
      if (!q) { box.innerHTML = ""; return; }
      const hits = DATA.stars.filter(function (s) {
        const con = s.c >= 0 ? DATA.con[s.c].z : "";
        return (s.z && s.z.toLowerCase().indexOf(q) >= 0) ||
          (s.e && s.e.toLowerCase().indexOf(q) >= 0) ||
          (s.b && (s.b + con).toLowerCase().indexOf(q) >= 0) ||
          con.indexOf(q) >= 0;
      }).slice(0, 8);
      box.innerHTML = hits.map(function (s) {
        const con = s.c >= 0 ? DATA.con[s.c].z : "";
        return "<li><button type=\"button\" data-hip=\"" + s.h + "\">" + esc(s.z || s.e || s.b || "未名") +
          "<span class=\"sub\">" + esc(con) + " · " + s.m.toFixed(1) + " 等</span></button></li>";
      }).join("") || "<li><span class=\"muted\">没有这颗。</span></li>";
    });
    $("results").addEventListener("click", function (e) {
      const btn = e.target.closest("[data-hip]");
      if (!btn) return;
      const hip = parseInt(btn.getAttribute("data-hip"), 10);
      const s = byHip.get(hip);
      const st = scene.stars[s.i];
      const loc = place(st.ra, st.dec);
      state.selected = { kind: "star", hip: hip, p: loc.p };
      if (s.m > state.magLimit) state.magLimit = Math.min(5.2, Math.ceil((s.m + 0.3) * 10) / 10);
      if (state.mode === "horizon" && loc.app > 0) {
        state.facing = loc.az;
        state.altCenter = A.clamp(loc.app, 12, 70);
      }
      refresh();
    });

    canvas.addEventListener("pointerdown", function (e) {
      const p = pointerPos(e);
      drag = { x: e.clientX, y: e.clientY, px: p.x, py: p.y, facing: state.facing, alt: state.altCenter, rot: state.azRotate, moved: false };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag) return;
      if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 4) drag.moved = true;
      if (!drag.moved) return;
      if (state.mode === "horizon") {
        state.facing = A.norm(drag.facing - (e.clientX - drag.x) * 0.18);
        state.altCenter = A.clamp(drag.alt + (e.clientY - drag.y) * 0.12, 8, 72);
      } else {
        state.azRotate = A.norm(drag.rot - (e.clientX - drag.x) * 0.25);
      }
      compute();
      draw();
    });
    canvas.addEventListener("pointerup", function (e) {
      if (drag && !drag.moved) pick(drag.px, drag.py);
      drag = null;
    });
    canvas.addEventListener("wheel", function (e) {
      e.preventDefault();
      if (state.mode === "horizon") state.fov = A.clamp(state.fov + Math.sign(e.deltaY) * 4, 48, 130);
      else {
        state.magLimit = A.clamp(state.magLimit + Math.sign(e.deltaY) * 0.1, 1.5, 5.2);
        save();
      }
      syncInputs();
      draw();
    }, { passive: false });
    window.addEventListener("resize", function () { if (scene) { resize(); compute(); draw(); } });
    window.addEventListener("keydown", function (e) {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT")) return;
      if (e.key === "ArrowLeft") state.facing = A.norm(state.facing - 6);
      else if (e.key === "ArrowRight") state.facing = A.norm(state.facing + 6);
      else if (e.key === " ") { e.preventDefault(); playNight(); return; }
      else return;
      if (state.mode === "horizon") { compute(); draw(); }
    });
  }

  bind();
  refresh();
})();
