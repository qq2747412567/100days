/* 岁候盘的历算。
   太阳视黄经：VSOP87D 地球日心黄经（Bretagnon & Francou, 1988）截取振幅不小于 1e-7 弧度的项，
   换算到地心后加上光行差和章动主项。交节时刻由地球时扣掉 ΔT 得到协调世界时，再显示为东八区。
   候按黄经五度划分，不是把一节气的钟面时间平分成三段。 */
(function (root) {
  "use strict";

  var DEG = Math.PI / 180;
  var PLATE_TZ = 8;
  var MEAN_PENTAD_MS = (365.2421904 / 72) * 86400000;

  // 每一项 [幂次, A, B, C]，项值为 A*cos(B+C*τ)，τ 是从 J2000 起算的儒略千年。
  var VSOP_L = [[0,1.75347045673,0.0,0.0],[0,0.03341656456,4.6692568,6283.07584999],[0,0.00034894275,4.62610242,12566.15169998],[0,3.417571e-05,2.8288658,3.52311835],[0,3.497056e-05,2.74411801,5753.3848849],[0,3.135896e-05,3.62767042,77713.77146812],[0,2.676218e-05,4.41808351,7860.41939244],[0,2.342687e-05,6.13516238,3930.20969622],[0,1.273166e-05,2.03709656,529.69096509],[0,1.324292e-05,0.74246356,11506.76976979],[0,9.01855e-06,2.04505444,26.2983198],[0,1.199167e-05,1.10962944,1577.34354245],[0,8.57223e-06,3.50849157,398.14900341],[0,7.79786e-06,1.17882652,5223.6939198],[0,9.9025e-06,5.2326813,5884.92684658],[0,7.53141e-06,2.53339054,5507.55323867],[0,5.05264e-06,4.58292563,18849.22754997],[0,4.92379e-06,4.2050664,775.52261132],[0,3.56655e-06,2.91954117,0.0673103],[0,2.84125e-06,1.89869034,796.29800682],[0,2.4281e-06,0.34481141,5486.77784318],[0,3.17087e-06,5.84901952,11790.62908866],[0,2.71039e-06,0.31488608,10977.0788047],[0,2.0616e-06,4.80646606,2544.31441988],[0,2.05385e-06,1.86947814,5573.14280143],[0,2.02261e-06,2.45767795,6069.77675455],[0,1.26184e-06,1.0830263,20.77539549],[0,1.55516e-06,0.83306074,213.29909544],[0,1.15132e-06,0.64544912,0.98032107],[0,1.02851e-06,0.63599847,4694.00295471],[0,1.01724e-06,4.26679821,7.113547],[0,9.9206e-07,6.2099294,2146.16541648],[0,1.32212e-06,3.41118276,2942.46342329],[0,9.7607e-07,0.68101272,155.42039943],[0,8.5128e-07,1.29870743,6275.96230299],[0,7.4651e-07,1.75508916,5088.62883977],[0,1.01895e-06,0.97569222,15720.83878488],[0,8.4711e-07,3.67080093,71430.69561813],[0,7.3547e-07,4.67926565,801.82093112],[0,7.3874e-07,3.50319443,3154.6870849],[0,7.8756e-07,3.03698313,12036.46073489],[0,7.9637e-07,1.80791331,17260.15465469],[0,8.5803e-07,5.98322631,161000.68573767],[0,5.6963e-07,2.78430398,6286.59896834],[0,6.1148e-07,1.81839811,7084.89678112],[0,6.9627e-07,0.83297597,9437.76293489],[0,5.6116e-07,4.38694881,14143.49524243],[0,6.2449e-07,3.97763881,8827.39026987],[0,5.1145e-07,0.28306865,5856.47765912],[0,5.5577e-07,3.47006009,6279.55273164],[0,4.1036e-07,5.36817351,8429.24126647],[0,5.1605e-07,1.33282747,1748.01641307],[0,5.1992e-07,0.18914946,12139.55350911],[0,4.9e-07,0.48735065,1194.44701022],[0,3.92e-07,6.16832995,10447.3878396],[0,3.5566e-07,1.77597315,6812.76681509],[0,3.677e-07,6.04133859,10213.28554621],[0,3.6596e-07,2.56955239,1059.38193019],[0,3.3291e-07,0.59309499,17789.84561978],[0,3.5954e-07,1.70876112,2352.86615377],[0,4.0938e-07,2.39850882,19651.0484811],[0,3.0047e-07,2.73975124,1349.86740966],[0,3.0412e-07,0.44294464,83996.84731811],[0,2.3663e-07,0.48473568,8031.09226306],[0,2.3574e-07,2.0652772,3340.6124267],[0,2.1089e-07,4.14825464,951.71840625],[0,2.4738e-07,0.21484762,3.59042865],[0,2.5352e-07,3.16470953,4690.47983636],[0,2.282e-07,5.22197888,4705.73230754],[0,2.1419e-07,1.42563736,16730.4636896],[0,2.1891e-07,5.55594303,553.56940284],[0,1.7481e-07,4.560529,135.06508004],[0,1.9925e-07,5.22208471,12168.00269657],[0,1.986e-07,5.77470168,6309.37416979],[0,2.03e-07,0.37133793,283.85931887],[0,1.4421e-07,4.19315333,242.72860397],[0,1.6225e-07,5.98837723,11769.85369317],[0,1.5077e-07,4.19567181,6256.77753019],[0,1.9124e-07,3.82219997,23581.25817732],[0,1.8888e-07,5.38626881,149854.40013481],[0,1.4346e-07,3.72355084,38.02767264],[0,1.7898e-07,2.21490736,13367.97263111],[0,1.2054e-07,2.62229588,955.59974161],[0,1.1287e-07,0.17739328,4164.31198961],[0,1.3971e-07,4.4013814,6681.2248534],[0,1.3621e-07,1.88934471,7632.94325965],[0,1.2503e-07,1.13052412,5.52292431],[0,1.0498e-07,5.35909519,1592.59601363],[0,1.0327e-07,6.19982566,6438.49624943],[0,1.2003e-07,1.00351457,632.78373931],[0,1.0827e-07,0.3273452,103.09277422],[0,1.0005e-07,6.02914963,5746.2713379],[0,1.0523e-07,0.93871806,11926.25441367],[1,6283.31966747491,0.0,0.0],[1,0.00206058863,2.67823456,6283.07584999],[1,4.30343e-05,2.6351265,12566.15169998],[1,4.25264e-06,1.59046981,3.52311835],[1,1.08977e-06,2.96618002,1577.34354245],[1,9.3478e-07,2.59212835,18849.22754997],[1,1.19261e-06,5.79557488,26.2983198],[1,7.2122e-07,1.13846158,529.69096509],[1,6.7768e-07,1.87472305,398.14900341],[1,6.7327e-07,4.40918235,5507.55323867],[1,5.9027e-07,2.88797038,5223.6939198],[1,5.5976e-07,2.1747168,155.42039943],[1,4.5407e-07,0.3980308,796.29800682],[1,3.6369e-07,0.4662474,775.52261132],[1,2.8958e-07,2.64707384,7.113547],[1,1.9097e-07,1.84628333,5486.77784318],[1,2.0844e-07,5.34138275,0.98032107],[1,1.8508e-07,4.96855125,213.29909544],[1,1.6233e-07,0.03216483,2544.31441988],[1,1.7293e-07,2.99116865,6275.96230299],[1,1.5832e-07,1.43049285,2146.16541648],[1,1.4615e-07,1.20532366,10977.0788047],[1,1.1877e-07,3.25804816,5088.62883977],[1,1.1514e-07,2.07502418,4694.00295471],[1,1.2461e-07,2.83432286,1748.01641307],[1,1.1808e-07,5.2737979,1194.44701022],[1,1.0641e-07,0.76614199,553.56940284],[2,0.0005291887,0.0,0.0],[2,8.719837e-05,1.07209665,6283.07584999],[2,3.09125e-06,0.86728819,12566.15169998],[2,2.7339e-07,0.05297872,3.52311835],[2,1.6334e-07,5.18826691,26.2983198],[2,1.5752e-07,3.68457889,155.42039943],[3,2.89226e-06,5.84384199,6283.07584999],[3,3.4955e-07,0.0,0.0],[3,1.6819e-07,5.48766912,12566.15169998],[4,1.14084e-06,3.14159265,0.0]];

  var HOU = ["初候", "二候", "三候"];

  var TERMS = [
    { lon: 315, name: "立春", season: "春", brief: "东风把冻住的地面松开。岁盘从这一度算起。", pentads: [
      ["东风解冻", "暖风先碰到地面。封冻的土和浅水从表面化开，冬天不是一下子结束的。"],
      ["蛰虫始振", "藏在土里的虫子感到阳气，身子松动，但还不出洞。真正出土要等到惊蛰。"],
      ["鱼陟负冰", "水底的鱼往上游。还没化尽的冰碴浮在水面，看上去像鱼背着冰。"]
    ]},
    { lon: 330, name: "雨水", season: "春", brief: "降水从雪变成雨，泥土开始返潮。", pentads: [
      ["獭祭鱼", "水獭捕到鱼，先摆在岸上再吃。古人把这排场叫作祭。"],
      ["候雁北", "大雁感知日子变了，先头的雁群开始往北飞。"],
      ["草木萌动", "芽还没打开，只是在皮下胀起来。"]
    ]},
    { lon: 345, name: "惊蛰", season: "春", brief: "春雷把蛰伏惊动，花和鸟一起露面。", pentads: [
      ["桃始华", "桃花是这一候的信使，比大多数花更早把枝条点亮。"],
      ["仓庚鸣", "仓庚是黄鹂。桃花之后，圆亮的鸣声跟着来。"],
      ["鹰化为鸠", "鹰隼躲去繁育，布谷和斑鸠到处叫。看不见鹰、只看见鸠，就被记成了变化。"]
    ]},
    { lon: 0, name: "春分", season: "春", brief: "昼夜几乎均分，燕子沿着这条线北返。", pentads: [
      ["玄鸟至", "玄鸟是燕子。春分前后回到屋檐下，秋分前后离开。"],
      ["雷乃发声", "阳气顶开剩下的寒气。第一声雷写在这一候里。"],
      ["始电", "雷先到，电稍后。这一候起，闪电开始被看见。"]
    ]},
    { lon: 15, name: "清明", season: "春", brief: "气清景明。播种和祭扫叠在同一段日子里。", pentads: [
      ["桐始华", "梧桐一类的白花在这一候开放。农谚里的播种也从这里数起。"],
      ["田鼠化为鴽", "田鼠少见了，鹌鹑一类的小鸟多起来。一消一长，被写成「化」。"],
      ["虹始见", "雨后的水汽够了，日光才能把虹挂出来。"]
    ]},
    { lon: 30, name: "谷雨", season: "春", brief: "雨养谷子，桑叶也开始养蚕。", pentads: [
      ["萍始生", "水面回暖，浮萍开始铺开。"],
      ["鸣鸠拂其羽", "斑鸠振翅，两翼相击有声，像在把雨后的晴天喊出来。"],
      ["戴胜降于桑", "戴胜落到桑树上。桑叶已盛，养蚕的人把它当成信号。"]
    ]},
    { lon: 45, name: "立夏", season: "夏", brief: "夏天从这一度立起来，夜里的虫鸣换了一套。", pentads: [
      ["蝼蝈鸣", "蝼蛄在土里叫。夏夜的第一层声音往往是它。"],
      ["蚯蚓出", "地温够了，蚯蚓才爬到地表。"],
      ["王瓜生", "野生的瓜蔓开始抽条，和园里的瓜同一节奏。"]
    ]},
    { lon: 60, name: "小满", season: "夏", brief: "麦粒渐渐饱满，却还没有满。", pentads: [
      ["苦菜秀", "苦菜长到可以采的样子。枝叶茂盛，叫秀。"],
      ["靡草死", "喜阴的细草顶不住渐长的白昼，反而枯下去。"],
      ["麦秋至", "麦子在夏天成熟。对麦来说，这是它的秋收。"]
    ]},
    { lon: 75, name: "芒种", season: "夏", brief: "有芒的谷要入土。收和种挤在同一候里。", pentads: [
      ["螳螂生", "过了冬的卵鞘在这一候裂开，小螳螂出来。"],
      ["鵙始鸣", "鵙是伯劳。叫声尖厉，立在枝上，捕虫，也捕小鸟。"],
      ["反舌无声", "反舌是会学舌的百舌。阴气生出来以后，它反而不叫了。"]
    ]},
    { lon: 90, name: "夏至", season: "夏", brief: "白昼最长的一刻。过了这一度，白天开始把长度还回去。", pentads: [
      ["鹿角解", "鹿角属阳。夏至一阴初生，旧角脱落。"],
      ["蜩始鸣", "蜩是蝉。这一候的蝉鸣又亮又长，和秋后的寒蝉不是同一种声气。"],
      ["半夏生", "半夏喜欢阴湿，在夏至的阴影里出苗。药名也从这里来。"]
    ]},
    { lon: 105, name: "小暑", season: "夏", brief: "热已经成形，还没到最盛。", pentads: [
      ["温风至", "风里不再带春末的凉。吹过来，就是热的。"],
      ["蟋蟀居壁", "蟋蟀从野地避到墙根和砖缝里。"],
      ["鹰始挚", "挚是搏击。幼鹰离开巢，开始学着捕猎。月令这一候亦作「鹰乃学习」。"]
    ]},
    { lon: 120, name: "大暑", season: "夏", brief: "一年里最热的一段，雨也最暴。", pentads: [
      ["腐草为萤", "萤火在湿热的草丛里亮起来。光从腐草间升起，就被写成了化。"],
      ["土润溽暑", "土是潮的，空气是闷的，热贴在皮肤上不走。"],
      ["大雨时行", "大雨按节气到来，来得急，地面很快积水。"]
    ]},
    { lon: 135, name: "立秋", season: "秋", brief: "秋已经立了名，暑还没退干净。", pentads: [
      ["凉风至", "早晚的风先凉下来。正午仍是夏天的温度。"],
      ["白露降", "夜里地面散热，水汽凝在草叶上。早晨看见一层白。"],
      ["寒蝉鸣", "寒蝉声细而急，听着像日子在收。"]
    ]},
    { lon: 150, name: "处暑", season: "秋", brief: "暑气在这里被止住，庄稼开始登场。", pentads: [
      ["鹰乃祭鸟", "鹰捕了鸟，先陈列再食。和春天的水獭祭鱼是同一类观察。"],
      ["天地始肃", "肃是收敛。生长的势头停下来，草木显出老意。"],
      ["禾乃登", "登是成熟、上场。谷物可以开镰。"]
    ]},
    { lon: 165, name: "白露", season: "秋", brief: "露水变白的时候，雁和燕交换天空。", pentads: [
      ["鸿雁来", "大雁从北向南。先到的一群写在这一候。"],
      ["玄鸟归", "燕子回去。春分叫至，白露叫归。"],
      ["群鸟养羞", "羞是储下的食物。鸟开始囤积，准备过冬。"]
    ]},
    { lon: 180, name: "秋分", season: "秋", brief: "昼夜再一次均分。雷声收到明年再说。", pentads: [
      ["雷始收声", "雷从这一候起渐渐没有。下一轮要等春分。"],
      ["蛰虫坯户", "坯是用土封门。虫子把洞口堵上，留一条以后再开的缝。"],
      ["水始涸", "秋燥把沟塘里的水收浅，岸边露出一圈泥。"]
    ]},
    { lon: 195, name: "寒露", season: "秋", brief: "露气已寒，菊花把黄色打开。", pentads: [
      ["鸿雁来宾", "先到的雁是主，后到的叫宾。这一候是后一批。"],
      ["雀入大水为蛤", "田雀少见，海边的蛤蜊多起来。两件事被记成一件。"],
      ["菊有黄华", "菊在寒气里开黄花。华就是花。"]
    ]},
    { lon: 210, name: "霜降", season: "秋", brief: "霜从这一度开始有名字，叶子跟着落。", pentads: [
      ["豺乃祭兽", "豺捕兽，先陈后食。秋气的杀伐被写成祭祀。"],
      ["草木黄落", "叶黄，然后离开枝条。一年的生长回到土里。"],
      ["蛰虫咸俯", "咸是都。虫子一律俯下身子，不再进出。蛰伏到这一候完成。"]
    ]},
    { lon: 225, name: "立冬", season: "冬", brief: "冬天从水面结上第一层冰算起。", pentads: [
      ["水始冰", "水面先结薄冰。早晨能看见，中午可能还化。"],
      ["地始冻", "冻从地表往下走，土变得敲得响。"],
      ["雉入大水为蜃", "野鸡隐去，大水里的蜃蛤被拿来对应。又是一次看不见甲、看见乙。"]
    ]},
    { lon: 240, name: "小雪", season: "冬", brief: "雪还小。上下的气开始不再来往。", pentads: [
      ["虹藏不见", "虹需要暖湿的雨。过了这一候，虹退出天空。"],
      ["天气上升地气下降", "天上的气往上收，地上的气往下沉。上下不再交通。"],
      ["闭塞而成冬", "通道闭上，才叫冬天。上一候说的是气，这一候说的是结果。"]
    ]},
    { lon: 255, name: "大雪", season: "冬", brief: "雪开始能积住，有些鸟也不叫了。", pentads: [
      ["鹖鴠不鸣", "鹖鴠是一种夜里求旦的鸟。寒极的时候，它反而不叫。"],
      ["虎始交", "虎在这一候交配。阴气最盛的地方，阳气已经回头。"],
      ["荔挺出", "荔挺是一种兰草。地面最冷的时候，它的芽先拱出来。"]
    ]},
    { lon: 270, name: "冬至", season: "冬", brief: "白昼最短。阳气在最短的一天里开始回头。", pentads: [
      ["蚯蚓结", "蚯蚓在土中把身子蜷成一个结。"],
      ["麋角解", "麋角和鹿角相反，在冬至脱落。一阳初生，阴里的角先掉。"],
      ["水泉动", "地面仍冻着，泉水底下开始微微流动。"]
    ]},
    { lon: 285, name: "小寒", season: "冬", brief: "冷还在加深，雁已经把方向改回北方。", pentads: [
      ["雁北乡", "乡是向。雁还没大举北飞，只是把朝向改了。"],
      ["鹊始巢", "喜鹊开始衔枝。巢要到春天才完成，工程在最冷的时候开工。"],
      ["雉雊", "雊是雄雉的叫声。严寒里求偶，声音传得很远。"]
    ]},
    { lon: 300, name: "大寒", season: "冬", brief: "寒气的尽头。连水中央都冻实的那一段。", pentads: [
      ["鸡始乳", "乳是孵育。鸡感到回头的阳气，开始抱卵。月令写作「鸡乳」。"],
      ["征鸟厉疾", "征鸟是远飞的鹰隼。这一候它们飞得又猛又快。"],
      ["水泽腹坚", "腹是中心。不只岸边，连泽的中央都冻实。这是寒的极点。"]
    ]}
  ];

  var CITIES = [
    { name: "漠河", lat: 52.97, lon: 122.52, tz: 8 },
    { name: "哈尔滨", lat: 45.8038, lon: 126.534, tz: 8 },
    { name: "北京", lat: 39.9042, lon: 116.4074, tz: 8 },
    { name: "济南", lat: 36.6512, lon: 117.1201, tz: 8 },
    { name: "西安", lat: 34.3416, lon: 108.9398, tz: 8 },
    { name: "上海", lat: 31.2304, lon: 121.4737, tz: 8 },
    { name: "成都", lat: 30.5728, lon: 104.0668, tz: 8 },
    { name: "拉萨", lat: 29.6520, lon: 91.1721, tz: 8 },
    { name: "昆明", lat: 25.0389, lon: 102.7183, tz: 8 },
    { name: "台北", lat: 25.0330, lon: 121.5654, tz: 8 },
    { name: "广州", lat: 23.1291, lon: 113.2644, tz: 8 },
    { name: "海口", lat: 20.0440, lon: 110.1990, tz: 8 },
    { name: "乌鲁木齐", lat: 43.8256, lon: 87.6168, tz: 6 }
  ];

  var plateCache = new Map();

  function norm(x) {
    x %= 360;
    return x < 0 ? x + 360 : x;
  }

  function wrap180(x) {
    if (x > 180) x -= 360;
    if (x < -180) x += 360;
    return x;
  }

  function civilParts(ms, tz) {
    var d = new Date(ms + tz * 3600000);
    return {
      y: d.getUTCFullYear(),
      m: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      h: d.getUTCHours(),
      min: d.getUTCMinutes(),
      s: d.getUTCSeconds()
    };
  }

  function deltaTSeconds(year) {
    var y = year - 2000;
    return 62.92 + 0.32217 * y + 0.005589 * y * y;
  }

  function deltaTReliable(year) {
    return year >= 2005 && year <= 2050;
  }

  function jdTT(ms, year) {
    return ms / 86400000 + 2440587.5 + deltaTSeconds(year) / 86400;
  }

  function unixFromJdTT(jd, year) {
    return (jd - deltaTSeconds(year) / 86400 - 2440587.5) * 86400000;
  }

  function evalL(tau) {
    var sum = 0;
    var tp = 1;
    var power = 0;
    var sub = 0;
    for (var i = 0; i < VSOP_L.length; i++) {
      var term = VSOP_L[i];
      if (term[0] !== power) {
        sum += sub * tp;
        while (power < term[0]) {
          tp *= tau;
          power++;
        }
        sub = 0;
      }
      sub += term[1] * Math.cos(term[2] + term[3] * tau);
    }
    sum += sub * tp;
    return sum;
  }

  function apparentLongitude(jd) {
    var tau = (jd - 2451545.0) / 365250;
    var T = tau * 10;
    var lon = evalL(tau) * 180 / Math.PI + 180;
    var M = (357.52911 + 35999.05029 * T - 0.0001537 * T * T) * DEG;
    var e = 0.016708634 - 0.000042037 * T;
    var R = (1.000001018 * (1 - e * e)) / (1 + e * Math.cos(M));
    var Om = (125.04452 - 1934.136261 * T + 0.0020708 * T * T + T * T * T / 450000) * DEG;
    var Ls = (280.4665 + 36000.7698 * T) * DEG;
    var Lm = (218.3165 + 481267.8813 * T) * DEG;
    var dpsi = (-17.20 * Math.sin(Om) - 1.32 * Math.sin(2 * Ls) - 0.23 * Math.sin(2 * Lm) + 0.21 * Math.sin(2 * Om)) / 3600;
    var aberr = -20.4898 / R / 3600;
    return norm(lon + dpsi + aberr);
  }

  function solveLongitude(target, guessJd) {
    var jd = guessJd;
    for (var i = 0; i < 16; i++) {
      var L = apparentLongitude(jd);
      var diff = wrap180(target - L);
      var L2 = apparentLongitude(jd + 0.05);
      var rate = wrap180(L2 - L) / 0.05;
      if (Math.abs(rate) < 1e-8) break;
      jd += diff / rate;
      if (Math.abs(diff) < 1e-8) break;
    }
    return jd;
  }

  function instantOfLongitude(target, nearMs, year) {
    var jd = solveLongitude(target, jdTT(nearMs, year));
    return unixFromJdTT(jd, year);
  }

  function longitudeAt(ms) {
    var year = civilParts(ms, PLATE_TZ).y;
    return apparentLongitude(jdTT(ms, year));
  }

  function perihelionSunLongitude(year) {
    var T = (year - 2000) / 100;
    return norm(282.937348 + 1.7195269 * T + 0.00045962 * T * T);
  }

  function equatorials(jd) {
    var tau = (jd - 2451545.0) / 365250;
    var T = tau * 10;
    var lam = apparentLongitude(jd);
    var eps = (23.439291111 - 0.013004166 * T - 1.63889e-7 * T * T + 5.036111e-7 * T * T * T) * DEG;
    var lamr = lam * DEG;
    var ra = Math.atan2(Math.cos(eps) * Math.sin(lamr), Math.cos(lamr));
    var dec = Math.asin(Math.sin(eps) * Math.sin(lamr));
    var raDeg = ra * 180 / Math.PI;
    if (raDeg < 0) raDeg += 360;
    var L0 = norm(280.4664567 + 36000.76982779 * T + 0.0003032028 * T * T);
    var eot = wrap180(L0 - raDeg) * 4;
    return { eotMin: eot, dec: dec, lam: lam };
  }

  function dayHours(latDeg, decRad) {
    var lat = latDeg * DEG;
    var h0 = Math.sin(-0.8333 * DEG);
    var cosH = (h0 - Math.sin(lat) * Math.sin(decRad)) / (Math.cos(lat) * Math.cos(decRad));
    if (cosH >= 1) return { hours: 0, polar: "night", haMin: 0 };
    if (cosH <= -1) return { hours: 24, polar: "day", haMin: 720 };
    var ha = Math.acos(Math.max(-1, Math.min(1, cosH)));
    var haMin = ha * 180 / Math.PI * 4;
    return { hours: (haMin * 2) / 60, polar: null, haMin: haMin };
  }

  function dayHoursAtLongitude(latDeg, sunLon, year) {
    var T = (year - 2000) / 100;
    var eps = (23.439291111 - 0.013004166 * T) * DEG;
    var dec = Math.asin(Math.sin(eps) * Math.sin(norm(sunLon) * DEG));
    return dayHours(latDeg, dec).hours;
  }

  function sunOn(ms, city) {
    var parts = civilParts(ms, city.tz);
    var year = parts.y;
    var dayStart = Date.UTC(parts.y, parts.m - 1, parts.day) - city.tz * 3600000;
    var noonGuess = dayStart + 12 * 3600000;
    var eq = equatorials(jdTT(noonGuess, year));
    var riseGuessMin = 720 - 4 * city.lon - eq.eotMin + city.tz * 60 - dayHours(city.lat, eq.dec).haMin;
    var eqRise = equatorials(jdTT(dayStart + riseGuessMin * 60000, year));
    var arc = dayHours(city.lat, eqRise.dec);
    var noonMin = 720 - 4 * city.lon - eq.eotMin + city.tz * 60;
    var toMs = function (min) { return dayStart + min * 60000; };
    return {
      rise: arc.polar ? null : toMs(noonMin - arc.haMin),
      set: arc.polar ? null : toMs(noonMin + arc.haMin),
      noon: toMs(noonMin),
      dayHours: arc.hours,
      polar: arc.polar,
      eotMin: eq.eotMin,
      decDeg: eqRise.dec * 180 / Math.PI
    };
  }

  function buildPlate(year) {
    var hit = plateCache.get(year);
    if (hit) return hit;
    var jan1 = Date.UTC(year, 0, 1) - PLATE_TZ * 3600000;
    var jd0 = jdTT(jan1, year);
    var lon0 = apparentLongitude(jd0);
    var terms = TERMS.map(function (src) {
      var ahead = (src.lon - lon0 + 360) % 360;
      var guess = jan1 + (ahead / 0.985647) * 86400000;
      var start = instantOfLongitude(src.lon, guess, year);
      var pentads = src.pentads.map(function (pair, index) {
        var lon = norm(src.lon + index * 5);
        var endLon = norm(src.lon + (index + 1) * 5);
        var startMs = index === 0 ? start : null;
        return {
          name: pair[0],
          gloss: pair[1],
          index: index,
          label: HOU[index],
          lon: lon,
          endLon: endLon,
          start: startMs,
          end: null
        };
      });
      for (var i = 1; i < pentads.length; i++) {
        pentads[i].start = instantOfLongitude(pentads[i].lon, start + i * 5.1 * 86400000, year);
      }
      for (var j = 0; j < pentads.length; j++) {
        var endNear = (pentads[j].start || start) + 5.1 * 86400000;
        pentads[j].end = instantOfLongitude(pentads[j].endLon, endNear, year);
      }
      return {
        name: src.name,
        lon: src.lon,
        season: src.season,
        brief: src.brief,
        start: start,
        end: pentads[2].end,
        pentads: pentads
      };
    });
    var byTime = terms.slice().sort(function (a, b) { return a.start - b.start; });
    var flat = [];
    byTime.forEach(function (term) {
      term.pentads.forEach(function (p) { flat.push({ term: term, pentad: p }); });
    });
    flat.sort(function (a, b) { return a.pentad.start - b.pentad.start; });
    var durations = flat.map(function (row) { return row.pentad.end - row.pentad.start; });
    var shortest = 0;
    var longest = 0;
    for (var i = 1; i < durations.length; i++) {
      if (durations[i] < durations[shortest]) shortest = i;
      if (durations[i] > durations[longest]) longest = i;
    }
    var plate = {
      year: year,
      terms: terms,
      byTime: byTime,
      flat: flat,
      shortest: flat[shortest],
      longest: flat[longest],
      reliable: deltaTReliable(year)
    };
    plateCache.set(year, plate);
    return plate;
  }

  function locate(ms) {
    var y = civilParts(ms, PLATE_TZ).y;
    var years = [y, y - 1, y + 1];
    for (var i = 0; i < years.length; i++) {
      var plate = buildPlate(years[i]);
      for (var k = 0; k < plate.flat.length; k++) {
        var row = plate.flat[k];
        if (ms >= row.pentad.start && ms < row.pentad.end) {
          var span = row.pentad.end - row.pentad.start;
          return {
            plate: plate,
            year: plate.year,
            term: row.term,
            pentad: row.pentad,
            fraction: span ? (ms - row.pentad.start) / span : 0,
            index: k
          };
        }
      }
    }
    return null;
  }

  function shiftInstant(ms, deltaYears) {
    var loc = locate(ms);
    if (!loc) return ms;
    var plate = buildPlate(loc.year + deltaYears);
    var term = null;
    for (var i = 0; i < plate.terms.length; i++) {
      if (plate.terms[i].lon === loc.term.lon) term = plate.terms[i];
    }
    if (!term) return ms;
    var pentad = term.pentads[loc.pentad.index];
    var span = pentad.end - pentad.start;
    var next = pentad.start + loc.fraction * span;
    if (next >= pentad.end) next = pentad.end - 1000;
    return next;
  }

  function stepPentad(ms, dir) {
    var loc = locate(ms);
    if (!loc) return ms;
    var flat = loc.plate.flat;
    var at = loc.index + dir;
    if (at < 0) {
      var prev = buildPlate(loc.year - 1);
      return prev.flat[prev.flat.length - 1].pentad.start + 60 * 1000;
    }
    if (at >= flat.length) {
      var next = buildPlate(loc.year + 1);
      return next.flat[0].pentad.start + 60 * 1000;
    }
    return flat[at].pentad.start + 60 * 1000;
  }

  function midpoint(pentad) {
    return (pentad.start + pentad.end) / 2;
  }

  function paceNote(durationMs) {
    var ratio = durationMs / MEAN_PENTAD_MS;
    if (ratio < 0.975) return "太阳离地球较近，这五度走得快，候比全年平均短。";
    if (ratio > 1.025) return "太阳离地球较远，这五度走得慢，候被拉长。";
    return "这五度的时长接近全年平均。";
  }

  root.Suihou = {
    PLATE_TZ: PLATE_TZ,
    TERMS: TERMS,
    CITIES: CITIES,
    MEAN_PENTAD_MS: MEAN_PENTAD_MS,
    norm: norm,
    civilParts: civilParts,
    deltaTSeconds: deltaTSeconds,
    deltaTReliable: deltaTReliable,
    longitudeAt: longitudeAt,
    apparentLongitude: apparentLongitude,
    instantOfLongitude: instantOfLongitude,
    perihelionSunLongitude: perihelionSunLongitude,
    dayHoursAtLongitude: dayHoursAtLongitude,
    sunOn: sunOn,
    buildPlate: buildPlate,
    locate: locate,
    shiftInstant: shiftInstant,
    stepPentad: stepPentad,
    midpoint: midpoint,
    paceNote: paceNote,
    jdTT: jdTT
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
