import data from "./codex-data.json";
import type { Locale } from "./content";
import { icon } from "./ui/icons";

// Text, numbers and skill names are snapshots of the sibling game's relics,
// relicStories and en/ja data catalogs. Keep IDs and artwork paths untranslated.
export const codex = data;
const colors = ["#e2bc52", "#dc8d85", "#9cabe9", "#d9bd7e"];
const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const tr = (lang: Locale, ko: string, en: string, ja: string) =>
  ({ ko, en, ja })[lang];
export const gameSymbol = (group: string, id: string, className = "") =>
  `<img class="game-symbol ${className}" src="/assets/game/${group}/${id}.webp" alt="" width="64" height="64" loading="lazy"/>`;
const labels = {
  ko: {
    record: "렐릭 관찰 기록",
    diary: "연구원의 관찰일지",
    profile: "복원 프로필",
    stats: "기본 능력치",
    skills: "전투에서 만나는 또 다른 모습",
    skillNote: "기본 상태 기준 · 개발 중 수치는 변경될 수 있습니다.",
    power: "위력",
    energy: "필요 에너지",
    touch: "캐릭터를 눌러 반응을 만나보세요.",
    sd: "작아져도, 매력은 그대로.",
    more: "발굴 기록 펼쳐보기",
    height: "신장",
    weight: "체중",
    era: "원종 연대",
    restoration: "복원 연령",
    life: "원종 성장 단계",
    site: "발굴지",
    roster: "다음은 누구의 기록을 펼쳐볼까요?",
    rosterNote: "캐릭터를 선택해 원화와 관찰 기록을 만나보세요.",
    faction: "소속 스쿼드",
    element: "속성",
    role: "직군",
    basic: "일반 공격",
    ultimate: "궁극기",
    ferocity: "폭주",
    passive: "패시브",
    hp: "체력",
    atk: "공격력",
    def: "방어력",
    res: "저항력",
    ap: "주문력",
    attackSpeed: "공격 속도",
    crit: "치명타 확률",
    move: "이동 속도",
    previous: "이전 캐릭터",
    next: "다음 캐릭터",
  },
  en: {
    record: "Relic observation record",
    diary: "From the researcher’s journal",
    profile: "Restoration profile",
    stats: "Base attributes",
    skills: "A different side on the battlefield",
    skillNote: "Base values · In-development stats may change.",
    power: "Power",
    energy: "Energy cost",
    touch: "Tap a character to see her reaction.",
    sd: "Small in size. Full of personality.",
    more: "Open the excavation record",
    height: "Height",
    weight: "Weight",
    era: "Origin era",
    restoration: "Restored age",
    life: "Original life stage",
    site: "Excavation site",
    roster: "Whose story will you open next?",
    rosterNote: "Select a character to explore her artwork and records.",
    faction: "Squad",
    element: "Element",
    role: "Role",
    basic: "Basic attack",
    ultimate: "Ultimate",
    ferocity: "Ferocity",
    passive: "Passive",
    hp: "HP",
    atk: "Attack",
    def: "Defense",
    res: "Resistance",
    ap: "Ability power",
    attackSpeed: "Attack speed",
    crit: "Critical chance",
    move: "Movement speed",
    previous: "Previous character",
    next: "Next character",
  },
  ja: {
    record: "レリック観察記録",
    diary: "研究員の観察日誌",
    profile: "復元プロフィール",
    stats: "基礎ステータス",
    skills: "戦場で見せる、もうひとつの顔",
    skillNote: "基本状態の値 · 開発中のため変更される場合があります。",
    power: "威力",
    energy: "必要エネルギー",
    touch: "キャラクターを押すとリアクションが見られます。",
    sd: "小さくても、魅力はそのまま。",
    more: "発掘記録を開く",
    height: "身長",
    weight: "体重",
    era: "原種の年代",
    restoration: "復元年齢",
    life: "原種の成長段階",
    site: "発掘地",
    roster: "次は誰の記録を開きますか？",
    rosterNote: "キャラクターを選んで、原画と観察記録をご覧ください。",
    faction: "所属",
    element: "属性",
    role: "クラス",
    basic: "通常攻撃",
    ultimate: "必殺技",
    ferocity: "暴走",
    passive: "パッシブ",
    hp: "体力",
    atk: "攻撃力",
    def: "防御力",
    res: "抵抗力",
    ap: "魔力",
    attackSpeed: "攻撃速度",
    crit: "会心率",
    move: "移動速度",
    previous: "前のキャラクター",
    next: "次のキャラクター",
  },
};
const factions = [
  {
    id: "rogue",
    latin: "Petit Rogue",
    name: ["쁘띠 로그", "Petit Rogue", "プチローグ"],
    duty: [
      "자율 탐험 · 보급 회수",
      "Exploration · Supply recovery",
      "自主探検・物資回収",
    ],
    body: [
      "자칭 정예 탐험대. 반짝이는 부품도, 간식도, 대장님께 드릴 선물도 잔뜩 주워 옵니다.",
      "A self-proclaimed elite expedition. Shiny parts, snacks, and a heap of gifts for their Captain.",
      "自称・精鋭探検隊。光る部品も、おやつも、隊長への贈り物も、たっぷり拾ってきます。",
    ],
  },
  {
    id: "fang",
    latin: "Absolute Fang",
    name: ["앱솔루트 팽", "Absolute Fang", "アブソリュートファング"],
    duty: [
      "최전선 결전 · 전술 제압",
      "Frontline combat · Tactical suppression",
      "最前線決戦・戦術制圧",
    ],
    body: [
      "승부 앞에선 누구보다 당당하게. 문짝을 부순 뒤 시말서를 쓰는 일도 있지만, 동료를 지키는 마음만큼은 확실합니다.",
      "Fearless on the front line. An occasional broken door means paperwork, but their loyalty never wavers.",
      "勝負には誰より堂々と。扉を壊して始末書を書くこともあるけれど、仲間を守る心は確かです。",
    ],
  },
  {
    id: "gear",
    latin: "Night Gear",
    name: ["나이트 기어", "Night Gear", "ナイトギア"],
    duty: [
      "외곽 잠입 · 잔해 인양",
      "Infiltration · Salvage",
      "外縁潜入・残骸回収",
    ],
    body: [
      "도시 밖의 잔해 속에서 고대의 코어를 회수하는 그림자들. 과묵한 근무 뒤에는 조용한 취미와 야식이 기다립니다.",
      "Quiet shadows recovering ancient cores beyond the city. After a silent shift come private hobbies and midnight snacks.",
      "都市の外で古代のコアを回収する影たち。静かな任務のあとは、ささやかな趣味と夜食の時間。",
    ],
  },
  {
    id: "eye",
    latin: "Signal Eye",
    name: ["시그널 아이", "Signal Eye", "シグナルアイ"],
    duty: [
      "고공 통신 · 광역 관측",
      "Aerial communications · Observation",
      "高空通信・広域観測",
    ],
    body: [
      "하늘에서 먼저 보고, 먼저 알려주는 눈. 지상의 동료에게 잔소리를 하다가도 위기에는 누구보다 빠르게 손을 내밉니다.",
      "Eyes in the sky, always first to spot trouble. They may tease the ground team, but help is never far away.",
      "空から先に見つけ、先に知らせる目。地上の仲間に小言を言いつつ、危機には真っ先に手を差し伸べます。",
    ],
  },
  {
    id: "rune",
    latin: "Silent Rune",
    name: ["사일런트 룬", "Silent Rune", "サイレントルーン"],
    duty: [
      "DNA 공명 안정 · 심신 케어",
      "DNA resonance · Rest and recovery",
      "DNA共鳴安定・心身ケア",
    ],
    body: [
      "소란스러운 하루 끝에 차 한 잔과 함께 곁을 지켜주는 이들. 공명을 가라앉히고, 지친 마음까지 돌봅니다.",
      "A cup of tea and someone to sit beside at the end of a noisy day. They soothe both resonance and weary hearts.",
      "騒がしい一日の終わりに、一杯のお茶と寄り添う時間を。共鳴を鎮め、疲れた心もいたわります。",
    ],
  },
];
const local = (a: string[], lang: Locale) =>
  a[["ko", "en", "ja"].indexOf(lang)];
function faction(id: string) {
  return factions.find((f) => f.id === id)!;
}
function badge(group: string, id: string, value: string, label: string) {
  return `<span class="codex-badge">${gameSymbol(group, id)}<span><small>${label}</small><strong>${escape(value)}</strong></span></span>`;
}
function elementName(id: string, lang: Locale) {
  return tr(
    lang,
    { earth: "땅", fire: "불", water: "물", wind: "바람" }[id]!,
    id.toUpperCase(),
    { earth: "地", fire: "火", water: "水", wind: "風" }[id]!,
  );
}
function roleName(id: string, lang: Locale) {
  return tr(
    lang,
    { tank: "탱커", warrior: "전사", assassin: "암살자", support: "서포터" }[
      id
    ]!,
    id.toUpperCase(),
    {
      tank: "タンク",
      warrior: "ウォリアー",
      assassin: "アサシン",
      support: "サポート",
    }[id]!,
  );
}
export function heroProfile(lang: Locale) {
  const r = data[0],
    t = r.text[lang];
  return `<a class="hero-record" href="#relics"><span class="hero-record-symbol">${gameSymbol("factions", r.squad)}</span><span><small>NO.${r.specimenNumber} / ${r.projectName}</small><strong>${escape(t.name)} <span>${r.rarity}</span></strong><span class="hero-record-traits">${gameSymbol("elements", r.element)} ${elementName(r.element, lang)} <i> / </i>${gameSymbol("roles", r.role)} ${roleName(r.role, lang)}</span></span>${icon("arrow")}</a><p class="hero-record-quote">“${escape(t.quote)}”</p>`;
}
function descriptions(id: string, lang: Locale): string[] {
  const entries: Record<string, string[][]> = {
    dodo: [
      [
        "깃펜으로 마법 피해를 주고, 입힌 피해의 30%만큼 가장 다친 아군을 회복합니다.",
        "Deals magic damage with her quill and heals the most wounded ally for 30% of damage dealt.",
        "羽ペンで魔法ダメージを与え、最も傷ついた味方を与ダメージの30%分回復します。",
      ],
      [
        "지정 범위의 적에게 주문력 150% 위력으로 공격하고, 범위 내 아군을 주문력 100%만큼 회복합니다.",
        "Strikes enemies in the target area with 150% ability power and heals allies inside for 100% ability power.",
        "指定範囲の敵を魔力150%の威力で攻撃し、範囲内の味方を魔力100%分回復します。",
      ],
      [
        "공격 속도가 50% 증가하고, 회복량의 40%만큼 보호막을 더합니다.",
        "Attack speed increases by 50%. Healing also grants a shield equal to 40% of the amount healed.",
        "攻撃速度が50%増加。回復量の40%分のシールドも付与します。",
      ],
      [
        "생존 중 아군 전체의 방어력·저항력을 15% 높이고, 적 전체가 받는 회복량을 30% 낮춥니다.",
        "While alive, raises all allies’ defense and resistance by 15% and reduces all enemies’ healing received by 30%.",
        "生存中、味方全体の防御力・抵抗力を15%上げ、敵全体の被回復量を30%下げます。",
      ],
    ],
    torika: [
      [
        "세 번의 뿔 끝에 적을 멈춰 세우는 전방의 방패.",
        "A frontline shield whose third strike stops the enemy.",
        "三度目の角で敵を止める、前衛の盾。",
      ],
      [
        "방어력 300% 위력으로 주변 적을 공격하고 2초 동안 기절시킵니다.",
        "Strikes nearby enemies with 300% defense power and stuns for 2 seconds.",
        "防御力300%の威力で周囲を攻撃し、2秒間気絶させます。",
      ],
      [
        "방어력 +40 · 저항력 +30. 가까운 적들을 3초 동안 도발합니다.",
        "Defense +40 · Resistance +30. Taunts nearby enemies for 3 seconds.",
        "防御力+40・抵抗力+30。周囲の敵を3秒間挑発します。",
      ],
      [
        "전투당 한 번, 체력이 절반 이하가 되면 5초 동안 매초 최대 체력의 3.5%를 회복합니다.",
        "Once per battle, below half HP, restores 3.5% max HP each second for 5 seconds.",
        "戦闘中1回、体力が半分以下になると5秒間、毎秒最大体力の3.5%を回復します。",
      ],
    ],
    rex: [
      [
        "날카로운 송곳니로 공격하고 3초 동안 출혈을 남깁니다.",
        "Sharp fangs strike and leave a 3-second bleed.",
        "鋭い牙で攻撃し、3秒間の出血を与えます。",
      ],
      [
        "공격력 300% 위력의 일격. 입힌 피해의 50%만큼 자신을 회복합니다.",
        "A strike with 300% attack power. Restores HP equal to 50% of damage dealt.",
        "攻撃力300%の威力で一撃。与えたダメージの50%分、自身を回復します。",
      ],
      [
        "출혈 중인 적에게 확정 치명타. 모든 피해에 흡혈 25%p를 더합니다.",
        "Guaranteed critical hits against bleeding enemies. Adds 25 percentage points of life steal to all damage.",
        "出血中の敵には確定会心。すべてのダメージに吸血25%ポイントを加算。",
      ],
      [
        "공격 속도·공격력·치명타 확률·치명타 피해·흡혈이 25% 증가. 중거리에서 돌진해 1초 기절시킵니다.",
        "Attack speed, attack, critical chance, critical damage and life steal gain 25%. Charges from mid range with a 1-second stun.",
        "攻撃速度・攻撃力・会心率・会心ダメージ・吸血が25%増加。中距離から突進し1秒気絶させます。",
      ],
    ],
    spino: [
      [
        "물가에 여울을 만들고 그 사이로 파고드는 기동형 공격.",
        "An agile attack that opens shallows and darts between them.",
        "浅瀬を作り、その間へ飛び込む機動攻撃。",
      ],
      [
        "공격력과 공격 속도를 함께 쓰는 일격. 적을 기절시키고 깔아 둔 여울을 폭발시킵니다.",
        "A strike scaling with attack and attack speed. Stuns the target and detonates her shallows.",
        "攻撃力と攻撃速度を活かす一撃。敵を気絶させ、設置した浅瀬を爆発させます。",
      ],
      [
        "잠행으로 적에게 도약합니다. 도착한 자리에는 새로운 여울이 생깁니다.",
        "Leaps toward an enemy in stealth, opening new shallows on landing.",
        "潜行して敵へ跳躍。着地点には新しい浅瀬が生まれます。",
      ],
      [
        "기본 공격이 적중할 때마다 이번 전투 동안 공격 속도가 3 증가합니다.",
        "Each basic hit increases attack speed by 3 for the rest of the battle.",
        "通常攻撃が命中するたびに、この戦闘中の攻撃速度が3増加します。",
      ],
    ],
  };
  return entries[id].map((a) => local(a, lang));
}
export function renderCodex(selected: number, lang: Locale) {
  const r = data[selected],
    t = r.text[lang],
    l = labels[lang],
    f = faction(r.squad),
    desc = descriptions(r.id, lang);
  const stats = ["hp", "atk", "def", "res", "ap", "attackSpeed"] as const;
  const maxima = {
    hp: 1500,
    atk: 180,
    def: 150,
    res: 120,
    ap: 120,
    attackSpeed: 150,
  };
  const diary = t.diary.split(/(?<=[.!。])\s+/);
  const midpoint = Math.ceil(diary.length / 2);
  return `<div class="codex-shell" style="--relic-color:${colors[selected]}">
 <div class="codex-topline"><span>${l.record} <b>NO.${r.specimenNumber}</b></span><span>${r.projectName}</span></div>
 <div class="codex-spotlight codex-arrive" data-character="${r.id}"><div class="codex-artframe"><div class="codex-orbit" aria-hidden="true"></div>${gameSymbol("factions", r.squad, "codex-watermark")}<span class="codex-art-number" aria-hidden="true">${r.specimenNumber}</span><img class="relic-portrait codex-portrait" data-puppet="${r.id}" src="/assets/${r.id}.webp" alt="${escape(t.name)}" loading="lazy" width="960" height="1421"/><span class="codex-art-caption">${r.projectName}<i> / </i>${escape(t.origin)}</span></div>
 <div class="codex-identity"><div class="codex-name-line"><span class="codex-rarity">${r.rarity}</span><span>RELIC / ${String(selected + 1).padStart(2, "0")}</span></div><p class="codex-origin">${escape(t.origin)}</p><h3 id="codex-name">${escape(t.name)}<span>${data[selected].text.en.name}</span></h3><div class="codex-badges">${badge("factions", r.squad, local(f.name, lang), l.faction)}${badge("elements", r.element, elementName(r.element, lang), l.element)}${badge("roles", r.role, roleName(r.role, lang), l.role)}</div><blockquote>“${escape(t.quote)}”</blockquote><div class="codex-sd-note"><div class="codex-sd-wrap"><img class="codex-sd" data-puppet="${r.id}-sd" src="/assets/${r.id}-sd.webp" alt="${escape(t.name)} SD" width="180" height="225" loading="lazy"/></div><div><span class="codex-kicker">LITTLE RELIC / SD</span><strong>${l.sd}</strong><p>${l.touch}</p></div></div><div class="codex-navigation"><button class="relic-prev" aria-label="${l.previous}">${icon("left")}</button><span><b>${String(selected + 1).padStart(2, "0")}</b> / ${String(data.length).padStart(2, "0")}</span><button class="relic-next" aria-label="${l.next}">${icon("right")}</button></div></div></div>
 <div class="codex-dossier codex-arrive"><article class="codex-panel codex-journal"><div class="codex-panel-heading"><span class="codex-kicker">OBSERVATION / ${r.specimenNumber}</span><h4>${l.diary}</h4></div><div class="codex-diary-text"><p>${escape(diary.slice(0, midpoint).join(" "))}</p><p>${escape(diary.slice(midpoint).join(" "))}</p></div><div class="codex-journal-sign">ETERNAL CITY<span>RESEARCHER’S ARCHIVE</span></div></article><div class="codex-measurements"><article class="codex-panel"><div class="codex-panel-heading"><span class="codex-kicker">RESTORATION DATA</span><h4>${l.profile}</h4></div><dl class="codex-profile">${[
   ["height", t.profile.height],
   ["weight", t.profile.weight],
   ["era", t.profile.originYear],
   ["restoration", t.profile.restorationYear],
   ["life", t.profile.lifeStage],
   ["site", t.excavationSite],
 ]
   .map(
     ([key, value]) =>
       `<div><dt>${l[key as keyof typeof l]}</dt><dd>${escape(value)}</dd></div>`,
   )
   .join(
     "",
   )}</dl><details class="codex-fossil"><summary>${l.more}${icon("down")}</summary><p>${escape(t.fossilRecord)}</p></details></article><article class="codex-panel"><div class="codex-panel-heading"><span class="codex-kicker">BASE PARAMETERS</span><h4>${l.stats}</h4></div><dl class="codex-stats">${stats.map((k) => `<div><dt>${l[k]}</dt><dd>${r.stats[k].toLocaleString(lang)}</dd><span class="codex-stat-track" aria-hidden="true"><i style="--stat:${Math.min(100, (r.stats[k] / maxima[k]) * 100)}%"></i></span></div>`).join("")}</dl><div class="codex-secondary-stats"><span>${l.crit}<b>${r.stats.critChance}%</b></span><span>${l.move}<b>${r.stats.moveSpeed}</b></span></div></article></div></div>
 <div class="codex-skills"><div class="codex-skills-heading"><div><span class="codex-kicker">COMBAT REPERTOIRE</span><h4>${l.skills}</h4></div><p>${l.skillNote}</p></div><div class="codex-skill-grid">${(["basic", "ultimate", "ferocity", "passive"] as const).map((key, i) => `<article class="codex-skill"><div class="codex-skill-icon">${gameSymbol("skills/" + r.id, key)}</div><span class="codex-kicker">${l[key]}</span><h5>${escape(t.skillNames[key])}</h5><p>${escape(desc[i])}</p>${key === "basic" || key === "ultimate" ? `<div class="codex-skill-values"><span>${l.power}<b>${r[key].power}%</b></span>${key === "ultimate" ? `<span>${l.energy}<b>${r.ultimate.cost}</b></span>` : ""}</div>` : ""}</article>`).join("")}</div></div></div>
 <div class="codex-roster-heading"><span class="codex-kicker">MEET THE RELICS</span><h4>${l.roster}</h4><p>${l.rosterNote}</p></div><div class="codex-selector" role="group" aria-label="${l.record}">${data.map((x, i) => `<button data-relic="${i}" data-character="${x.id}" style="--relic-color:${colors[i]}" aria-pressed="${selected === i}" class="codex-card ${selected === i ? "active" : ""}"><span class="codex-card-top"><span>NO.${x.specimenNumber}</span><b>${x.rarity}</b></span><span class="codex-card-art">${gameSymbol("factions", x.squad, "codex-card-watermark")}<img class="codex-card-portrait" data-puppet="${x.id}" data-puppet-mode="idle" src="/assets/${x.id}.webp" alt="" loading="lazy" width="960" height="1421"/></span><span class="codex-card-info"><span class="codex-card-code">${x.projectName}</span><strong>${escape(x.text[lang].name)}</strong><span class="codex-card-traits">${gameSymbol("elements", x.element)}${elementName(x.element, lang)}<i>/</i>${gameSymbol("roles", x.role)}${roleName(x.role, lang)}</span><span class="codex-card-footer">${local(faction(x.squad).name, lang)}${icon("arrow")}</span></span></button>`).join("")}</div>`;
}
export function renderFactions(lang: Locale) {
  return `<section class="codex-factions"><div class="codex-factions-heading"><p class="eyebrow">FIVE SQUADS / ONE CITY</p><h3>${tr(lang, "다섯 개의 스쿼드, 하나의 정원.", "Five squads. One garden.", "五つのスクワッド、ひとつの庭園。")}</h3><p>${tr(lang, "같은 도시를 지키는 서로 다른 방식. 당신을 부르는 이름에도, 그들만의 마음이 담겨 있습니다.", "Different ways to protect the same city. Even the names they call you tell a story.", "同じ都市を守る、それぞれのやり方。あなたを呼ぶ名前にも、彼女たちの想いが宿ります。")}</p></div><div class="codex-faction-grid">${factions.map((f, i) => `<article class="codex-faction">${gameSymbol("factions", f.id)}<span class="codex-kicker">SQUAD / 0${i + 1}</span><h4>${local(f.name, lang)}</h4><span class="codex-faction-latin">${f.latin}</span><strong>${local(f.duty, lang)}</strong><p>${local(f.body, lang)}</p></article>`).join("")}</div></section>`;
}
export function registerDecor(lang: Locale) {
  const sparkles = [
    [14, 22, 0],
    [46, 8, 0.7],
    [78, 18, 1.4],
    [90, 52, 0.4],
    [6, 58, 1.1],
    [58, 40, 1.8],
  ]
    .map(
      ([x, y, d]) =>
        `<i class="register-sparkle" style="left:${x}%;top:${y}%;--delay:${d}s"></i>`,
    )
    .join("");
  return `<div class="register-companions"><span class="register-companion-label">A LITTLE COMPANY FOR YOUR NEXT CHAPTER</span><div class="register-companion-scene" aria-hidden="true"><span class="register-spotlight"></span><span class="register-floor"></span>${sparkles}<span class="register-actor register-actor-luka"><img class="register-sd" data-puppet="luka-sd" data-puppet-mode="idle" src="/assets/luka-sd.webp" alt="" width="240" height="300" loading="lazy"/></span><span class="register-actor register-actor-dodo"><img class="register-sd" data-puppet="dodo-sd" data-puppet-mode="idle" src="/assets/dodo-sd.webp" alt="" width="200" height="270" loading="lazy"/></span><span class="register-bubble">${tr(lang, "기다리고 있을게요!", "We'll be waiting!", "待ってますね!")}</span><img class="register-cake" src="/assets/game/currency/cake.webp" alt="" width="110" height="110" loading="lazy"/><img class="register-coin coin-one" src="/assets/game/currency/gold.webp" alt="" width="64" height="64" loading="lazy"/><img class="register-coin coin-two" src="/assets/game/currency/gold.webp" alt="" width="48" height="48" loading="lazy"/><img class="register-coin coin-three" src="/assets/game/currency/crystal.webp" alt="" width="48" height="48" loading="lazy"/></div><p>${tr(lang, "루카와 도디도, 당신과의 만남을 기다리는 중.", "Luka and Dodi are waiting to meet you, too.", "ルカとドディも、あなたとの出会いを待っています。")}</p></div>`;
}
