"use strict";

const PL_TABS = [["overview", "Overview"], ["offence", "Offence"], ["defence", "Defence"], ["traits", "Traits"], ["goalies", "Goalies"],
  ["development", "Development"], ["contract", "Contract"]];

const TRAITS = [
  { k: "shooter", t: "Shooter", a: ["Wristshot", "Slapshot"], grps: "FD" },
  { k: "openice", t: "Finds open ice", a: ["Off The Puck", "Anticipation"], grps: "FD" },
  { k: "playmaker", t: "Playmaker", a: ["Passing", "Creativity"], grps: "FD" },
  { k: "puck", t: "Puck skills", a: ["Stickhandling", "Deking"], grps: "FD" },
  { k: "speed", t: "Speed", a: ["Speed", "Acceleration", "Agility"], grps: "FD" },
  { k: "physical", t: "Physical", a: ["Hitting", "Strength", "Bravery"], grps: "FD" },
  { k: "shutdown", t: "Shutdown", a: ["Checking", "Positioning", "Pokecheck"], grps: "FD" },
  { k: "motor", t: "Motor", a: ["Work Rate", "Stamina"], grps: "FD" },
  { k: "leader", t: "Leader", a: ["Influence", "Teamwork", "Determination"], grps: "FD" },
  { k: "faceoffs", t: "Faceoffs", a: ["Faceoffs"], grps: "F" },
  { k: "gshot", t: "Shot stopping", s: "Shot stopping", grps: "G" },
  { k: "gpos", t: "Positioning", s: "Positioning", grps: "G" },
  { k: "gath", t: "Athleticism", s: "Athleticism", grps: "G" },
  { k: "gpuck", t: "Puck play", s: "Puck play", grps: "G" },
  { k: "gment", t: "Mental", s: "Mental", grps: "G" },
];
TRAITS.forEach(t => { t.i = (t.a || []).map(a => (D.attrs || []).findIndex(x => x.endsWith(": " + a))); });
const plTraitsFor = grp => TRAITS.filter(t => t.grps.includes(grp));
const GRP_NAME = { F: "forwards", D: "defence", G: "goalies" };
function plPctIn(a, v) {
  let lo = 0, hi = a.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] < v) lo = m + 1; else hi = m; }
  let up = lo;
  while (up < a.length && a[up] <= v) up++;
  return a.length ? Math.round(100 * (lo + (up - lo) / 2) / a.length) : null;
}
let plTags;

const plTraitList = grp => (grp === "G" ? plTraitsFor("G") : TRAITS.filter(t => !t.s && (!grp || t.grps.includes(grp))));
function plCurTrait() {
  const list = plTraitList(R.grp);
  return list.find(t => t.k === R.trait) || list[0];
}

const plMode = () => (PMODE === "po" ? "P" : "R");
const PL_CACHE = {};

function plStatIdx() {
  const key = "s" + SEASON + plMode() + D.dates.length;
  if (PL_CACHE[key]) return PL_CACHE[key];
  const cols = D.teamPlayerCols || [], ix = Object.fromEntries(cols.map((c, i) => [c, i])), by = new Map();
  Object.values(D.teamPlayers?.[SEASON] || {}).forEach(t => (t[plMode()] || []).forEach(r => {
    const e = by.get(r[0]) || { blk: 0, toi: 0, gp: 0, pos: r[ix.pos] };
    e.blk += r[ix.blk] || 0; e.toi += r[ix.toi] || 0; e.gp += r[ix.gp] || 0;
    by.set(r[0], e);
  }));
  const floor = (PMODE === "po" ? D.poMinToi : D.minToi) || 200, pool = { F: [], D: [] };
  let total = 0;
  by.forEach((e, k) => {
    total += e.blk;
    e.grp = byKey.get(k)?.grp || (e.pos === "D" ? "D" : e.pos === "G" ? "G" : "F");
    if (e.grp !== "G" && e.toi >= floor) { e.blk60 = e.blk * 60 / e.toi; pool[e.grp].push(e.blk60); }
  });
  Object.values(pool).forEach(a => a.sort((x, y) => x - y));
  by.forEach(e => { if (e.blk60 != null) e.pct = plPctIn(pool[e.grp], e.blk60); });
  return (PL_CACHE[key] = { by, has: total > 0, floor });
}
const plBlk = p => (plStatIdx().has ? plStatIdx().by.get(p.k)?.blk60 ?? null : null);

function plCareerIdx() {
  const type = PMODE === "po" ? "P" : "R", key = "c" + SEASON + type + D.dates.length;
  if (PL_CACHE[key]) return PL_CACHE[key];
  const C = D.careerCols || [], ix = Object.fromEntries(C.map((c, i) => [c, i])), m = new Map();
  const sum = (rs, k) => (rs.some(r => r[ix[k]] != null) ? rs.reduce((s, r) => s + (r[ix[k]] || 0), 0) : null);
  D.players.forEach(p => {
    const rows = (p.car || []).filter(r => r[ix.season] === SEASON && r[ix.type] === type);
    if (!rows.length) return;
    const by = {};
    rows.forEach(r => (by[r[ix.league] || ""] ||= []).push(r));
    const out = {};
    for (const lg in by) {
      const rs = by[lg], o = {};
      ["gp", "g", "a", "p", "pm", "pim", "s", "ppg", "ppa", "shg", "sha", "w", "l", "t", "min", "ga", "so"].forEach(k => (o[k] = sum(rs, k)));
      const gp = o.gp || 0, rated = rs.filter(r => r[ix.avr] != null && r[ix.gp]);
      o.avr = rated.length ? rated.reduce((s, r) => s + r[ix.avr] * r[ix.gp], 0) / rated.reduce((s, r) => s + r[ix.gp], 0) : null;
      o.gaa = o.min && o.ga != null ? o.ga * 60 / o.min : null;
      const sa = rs.every(r => r[ix.ga] != null && r[ix.svp] != null && r[ix.svp] < 1) ? rs.reduce((s, r) => s + r[ix.ga] / (1 - r[ix.svp]), 0) : null;
      o.svp = sa ? 1 - o.ga / sa : null;
      out[lg] = o;
    }
    m.set(p.k, out);
  });
  return (PL_CACHE[key] = m);
}
const plLine = p => plCareerIdx().get(p.k)?.[p.lg || ""] || null;

function plBasic(p) {
  const t = p.card?.totals;
  if (t) return { gp: t.gp, g: t.g, a: t.a, p: t.p, pm: t.pm, pim: t.pim, st: t.st };
  const c = plLine(p);
  return c ? { gp: c.gp, g: c.g, a: c.a, p: c.p, pm: c.pm, pim: c.pim, st: c.s } : null;
}
const plRaw = (p, k) => p.card?.raw?.[k] ?? null;
const plGp = p => plBasic(p)?.gp ?? null;
const plSum2 = (c, a, b) => (c && c[a] != null && c[b] != null ? c[a] + c[b] : null);
const plGFloor = () => (PMODE === "po" ? 3 : 10);

const plRC = k => { const [t, val, num, cell, tip] = RC[k]; return { k, t, tip, num, val, cell: (v, p) => cell(p), keep: ["pos", "age", "lg", "ca", "pa"].includes(k) }; };
const plNum = (d = 0, pre = "", post = "") => v => `<td class="num">${v == null ? dash : pre + fmt(v, d) + post}</td>`;
const plSgn = d => v => `<td class="num ${v == null ? "" : tint(Math.abs(v) < 0.05 ? 0 : v)}">${v == null ? dash : signed(v, d)}</td>`;
const plCol = (k, t, val, cell, o = {}) => ({ k, t, val, cell, num: true, ...o });
const plRate = (k, t, d, tip, o) => plCol(k, t, p => plRaw(p, k), plNum(d), { tip, ...o });
const plTime = (k, t, tip) => plCol(k, t, p => plRaw(p, k), v => `<td class="num">${v == null ? dash : rawFmt("toi_gp", v)}</td>`, { tip });
const plRec = c => (c && c.w != null ? `${c.w}-${c.l ?? 0}${c.t ? "-" + c.t : ""}` : null);
const plSvp = p => plLine(p)?.svp ?? plRaw(p, "svp");

const plGGp = p => plLine(p)?.gp ?? plGp(p);
const plGQual = p => (plGGp(p) || 0) >= plGFloor();
const plGaa = p => plLine(p)?.gaa ?? null;
const plGoalieCols = () => [
  plCol("gp", "GP", plGGp, plNum(0)),
  plCol("rec", "W-L", p => plLine(p)?.w ?? null, (v, p) => `<td class="num">${plRec(plLine(p)) || dash}</td>`, { tip: "Wins-losses-overtime losses, from the career table" }),
  plCol("svp", "SV%", plSvp, v => `<td class="num">${v == null ? dash : v.toFixed(3).replace(/^0/, "")}</td>`, { tip: `Save percentage (career-table line; the charted one when there is none). Under ${plGFloor()} games sorts last`, qual: plGQual }),
  plCol("gaa", "GAA", plGaa, plNum(2), { tip: `Goals against per 60 minutes. Depends on how many shots his team allows. Under ${plGFloor()} games sorts last`, low: true, qual: plGQual }),
  plCol("so", "SO", p => plLine(p)?.so ?? null, plNum(0), { tip: "Shutouts" }),
  ];
const plSvpBox = tab => ({ id: "svp", title: "Save percentage", sub: `At least ${plGFloor()} games`, val: plSvp, ok: plGQual, right: v => `<span class="lnum"><b>${v.toFixed(3).replace(/^0/, "")}</b></span>`, goto: [tab, "svp", -1] });
const plGaaBox = tab => ({ id: "gaa", title: "Goals against average", sub: `Lowest, at least ${plGFloor()} games`, val: plGaa, ok: plGQual, dir: 1, right: v => `<span class="lnum"><b>${fmt(v, 2)}</b></span>`, goto: [tab, "gaa", 1] });
const plOverG = () => plGrp("overview") === "G";

const TABS = {};
const NOTES = {
  defence: `Hits, takeaways, giveaways and faceoff wins exist only as team totals, so they have no player columns. Defence % is built from +/- per 60 and penalty-kill time only; blocks come from the box scores.`,
};
const rValueOk = () => !R.lg || R.lg === "NHL";

const plGrp = tab => (tab === "goalies" ? "G" : ["offence", "defence"].includes(tab) && R.grp === "G" ? "" : R.grp);
function plScope(tab, p, tr) {
  if (tab === "offence" || tab === "defence") return p.grp !== "G";
  if (tab === "goalies") return p.grp === "G";
  if (tab === "contract") return p.lg === "NHL";
  if (tab === "traits") return tr.grps.includes(p.grp);
  return true;
}
function plActive(tab) {
  const g = plGrp(tab) && tab !== "goalies";
  return (R.lg !== "NHL" ? 1 : 0) + (g ? 1 : 0) + (R.team ? 1 : 0) + (R.maxAge ? 1 : 0)
    + (SEASON !== (D?.defaultSeason || SEASONS.at(-1) || null) ? 1 : 0) + (PMODE !== "rs" ? 1 : 0);
}
let plNameCell;

function plTop(rows, b) {
  const dir = b.dir ?? -1, out = [];
  rows.forEach(p => { const v = b.val(p); if (v != null && (!b.ok || b.ok(p, v))) out.push([v, p]); });
  out.sort((x, y) => (x[0] - y[0]) * dir);
  const top = out.slice(0, 5);
  top.ties = out.length ? out.filter(x => x[0] === out[0][0]).length : 0;
  return top;
}
const plMeta = (p, i) => `${i + 1}. ${esc(p.pos)} · ${p.age} · ${tname(clubOf(p))}${p.lg && p.lg !== "NHL" ? ` (${esc(p.lg)})` : ""}`;
function plSpot(b, top, tab) {
  const act = b.href ? `<a class="more-link" href="${b.href(top[0][1])}">Rank all →</a>`
    : b.goto ? `<button type="button" class="more-link linkbtn" data-goto="${b.goto.join("|")}">Rank all →</button>` : "";
  const head = b.pick ? `<button type="button" class="spot-pick" data-trait="${b.pick}" aria-pressed="${b.on}">${esc(b.title)}</button>` : esc(b.title);
  return `<section class="card-box spot${b.on ? " on" : ""}" aria-labelledby="sp-${b.id}"><h2 id="sp-${b.id}">${head}</h2><p class="sub">${esc(b.sub || "")}</p>
    ${top.map(([v, p], i) => listRow(p, b.right(v, p), plMeta(p, i))).join("")}${act}</section>`;
}
function renderRankings(path = "") {
  markNav("players");
  const slug = decodePart(String(path).split("/")[0]);
  const tab = PL_TABS.some(t => t[0] === slug) ? slug : "overview";
  R.tab = tab;
  const T = TABS[tab], noContract = tab === "contract" && !rValueOk(), tr = plCurTrait();
  const rows = noContract ? [] : D.players.filter(p => (!R.lg || p.lg === R.lg) && (!plGrp(tab) || p.grp === plGrp(tab))
    && (!R.team || clubOf(p) === R.team) && (!R.maxAge || p.age <= +R.maxAge) && plScope(tab, p, tr)).map(inSeason).map(rankRow);
  const allCols = T.cols(tr);
  if (!R.lg) allCols.splice(1, 0, plRC("lg"));
  allCols.forEach((c, i) => (c.i = i));
  const V = rows.map(p => allCols.map(c => c.val(p)));
  const shown = allCols.filter(c => c.keep || V.some(v => v[c.i] != null));
  const hidden = rows.length ? allCols.filter(c => !shown.includes(c) && c.t) : [];
  const nameCol = { k: "n", t: "Player", num: false, i: -1 };
  const sortable = [nameCol, ...shown];
  if (!sortable.some(c => c.k === R.sort)) {
    const dev = tab === "development" ? [R.dev === "movers" ? "chg" : "peak"] : [];
    R.sort = [...dev, ...(typeof T.sort === "function" ? T.sort() : T.sort), "ca"].find(x => shown.some(c => c.k === x)) || shown[0]?.k || "n"; R.dir = -1;
  }
  const sc = sortable.find(c => c.k === R.sort);
  const ents = rows.map((p, i) => ({ p, v: V[i] }));
  const get = e => (sc.k === "n" ? e.p.n : e.v[sc.i]);
  ents.sort((a, b) => {
    const x = get(a), y = get(b);
    if (x == null || x === "") return y == null || y === "" ? 0 : 1;
    if (y == null || y === "") return -1;
    if (sc.qual && sc.qual(a.p) !== sc.qual(b.p)) return sc.qual(a.p) ? -1 : 1;
    return (sc.num ? x - y : String(x).localeCompare(String(y))) * R.dir;
  });
  const total = ents.length, page = ents.slice(0, R.limit);

  let boxes = (T.boxes().map(b => ({ b, top: plTop(rows, b) })));
  const hiddenBoxes = boxes.filter(x => !x.top.length && x.b.title);
  boxes = boxes.filter(x => x.top.length);
  const chars = [];

  const other = R.lg && R.lg !== "NHL";
  const why = c => (other ? "other leagues have no box scores" : c.why || "no data for these players");
  const hide = rows.length ? [...hidden.map(c => [c.t, why(c)]), ...hiddenBoxes.map(x => [x.b.title + " (box)", why(x.b)])] : [];
  const byWhy = {};
  hide.forEach(([t, w]) => (byWhy[w] ||= []).push(t));
  const notes = [
    NOTES[tab], "",
    other && ["offence", "defence", "overview"].includes(tab) ? `${esc(R.lg)} has no box scores here: only the games, goals, assists, points, +/- and penalty minutes from each player's own season line are shown.` : "",
    ...Object.entries(byWhy).map(([w, ts]) => `Hidden, ${w}: ${ts.join(", ")}.`),
  ].filter(Boolean);
  const nf = plActive(tab);
  const leagues = leagueList(), lgs = [...leagues.filter(l => l === "NHL"), ...leagues.filter(l => l !== "NHL")];
  const grpOk = tab === "offence" || tab === "defence" ? ["", "F", "D"] : ["", "F", "D", "G"];
  const tabsHtml = `<div class="ptabs" role="tablist" aria-label="Player sections">${PL_TABS.map(([k, t]) => {
    const off = k === "contract" && !rValueOk();
    return `<button type="button" role="tab" data-ptab="${k}" class="${tab === k ? "on" : ""}" aria-selected="${tab === k}" tabindex="${tab === k ? 0 : -1}"${off ? ` disabled title="Contract is NHL only: pick the NHL league or All leagues"` : ""}>${t}</button>`; }).join("")}</div>`;
  const spots = list => `<div class="spots">${list.map(x => plSpot(x.b, x.top, tab)).join("")}</div>`;
  view.innerHTML = `
  <section class="band"><div class="wrap">
    <h1>Players</h1>
    <p class="lede">${D.players.length.toLocaleString()} players · snapshot ${fmtDate(D.dates.at(-1))} · ${T.lede}${""}</p>
    <form class="filters pfbar${R.fopen ? " open" : ""}" aria-label="Filters">
      <button class="ghost small pf-toggle" id="pf-toggle" type="button" aria-expanded="${!!R.fopen}">Filters${nf ? ` (${nf})` : ""}</button>
      <div class="pf-fields">
        <label>League <select id="f-lg"><option value="">All leagues</option>${lgs.map(l => `<option value="${esc(l)}" ${l === R.lg ? "selected" : ""}>${esc(l)} (${leagueCount(l).toLocaleString()})</option>`).join("")}</select></label>
        ${tab === "goalies" ? "" : `<fieldset><legend>Position</legend><div class="seg" id="f-grp">${[["", "All"], ["F", "Forwards"], ["D", "Defence"], ["G", "Goalies"]]
          .map(([v, t]) => { const off = !grpOk.includes(v); return `<button type="button" data-v="${v}" class="${v === plGrp(tab) ? "on" : ""}" aria-pressed="${v === plGrp(tab)}"${off ? ` disabled title="Goalies have their own tab"` : ""}>${t}</button>`; }).join("")}</div></fieldset>`}
        <label>Club <select id="f-team"><option value="">All clubs</option>${clubOptions(R.team, R.lg)}</select></label>
        <label class="narrow">Max age <input id="f-age" type="number" min="15" max="45" placeholder="Any" value="${esc(R.maxAge)}"></label>
        ${seasonSelect("f-season", SEASONS, SEASON, { cls: "small muted", single: "disable" })}
        <fieldset><legend>Games</legend><div class="seg" id="f-mode">${[["rs", "Regular season"], ["po", "Playoffs"]]
          .map(([v, t]) => `<button type="button" data-v="${v}" class="${v === PMODE ? "on" : ""}" aria-pressed="${v === PMODE}">${t}</button>`).join("")}</div></fieldset>
        <button class="ghost small" id="f-clear" type="button"${nf ? "" : " hidden"}>Clear filters</button>
      </div>
    </form>
    ${hasLeague(R.lg) ? `<p class="small"><a href="${leagueRoute(R.lg)}">${esc(R.lg)} league page: standings, stats, teams and prospects →</a></p>` : R.lg === "NHL" ? `<p class="small"><a href="#/teams">NHL teams and standings →</a></p>` : ""}
    ${tabsHtml}
  </div></section>
  <div class="wrap page plpage">
    ${noContract ? `<p class="small muted">The Contract tab is NHL only (contracts are priced against NHL salaries): choose the NHL league or All leagues.</p>` : ""}
    ${boxes.length ? `<div class="cardbar"><span></span><button type="button" class="linkbtn small" id="pl-jump">Jump to table ↓</button></div>` : ""}
    ${boxes.length ? spots(boxes) : ""}
    ${""}
    ${notes.length ? `<div class="plnotes">${notes.map(n => `<p class="small ${n.startsWith("*") ? "warnnote" : "muted"}">${n.includes("<") ? n : esc(n)}</p>`).join("")}</div>` : ""}
    ${noContract ? "" : `<div class="cardbar tablebar">
      ${tab === "development" ? `<div class="seg" id="r-dev" role="group" aria-label="Development view">${[["future", "Future"], ["movers", "Movers"]]
        .map(([v, t]) => `<button type="button" data-v="${v}" class="${(R.dev || "future") === v ? "on" : ""}" aria-pressed="${(R.dev || "future") === v}">${t}</button>`).join("")}</div>` : "<span></span>"}
      <span class="cardbar-r"><span class="count" id="r-count">${total.toLocaleString()} players</span></span></div>
    <section class="card-box flush" aria-label="Player list" id="pl-table">${total ? `
      <div class="tablewrap"><table class="rank plist" data-tab="${tab}">
        <thead><tr><th class="num">#</th>${sortable.map(c => `<th class="sort ${c.num ? "num" : ""} ${c.k === "n" ? "pcol" : ""} ${R.sort === c.k ? "on" : ""}" data-k="${esc(c.k)}"${c.tip ? ` title="${esc(c.tip)}"` : ""} aria-sort="${R.sort === c.k ? (R.dir < 0 ? "descending" : "ascending") : "none"}"><button type="button">${esc(c.t)}${c.k === "war" && !hasShotData() ? "*" : ""}${R.sort === c.k ? (R.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`).join("")}</tr></thead>
        <tbody>${page.map((e, i) => `<tr class="link" data-k="${esc(e.p.k)}"><td class="num muted">${i + 1}</td>${plNameCell(e.p)}${shown.map(c => c.cell(e.v[c.i], e.p)).join("")}</tr>`).join("")}</tbody>
      </table></div>
      ${total > R.limit ? `<div class="more"><button class="ghost" id="more" type="button">Show more (${(total - R.limit).toLocaleString()} left)</button></div>` : ""}`
      : `<p class="sub pad">No players match these filters.</p>`}</section>`}
  </div>`;
  plWire(tab, sortable);
}

function plWire(tab, sortable) {
  const rerender = (focus) => { R.limit = 100; renderRankings(R.tab); if (focus) view.querySelector(focus)?.focus(); };
  const on = (id, ev, fn) => { const el = view.querySelector(id); if (el) el[ev] = fn; };
  const go = (t, sort, dir) => {
    if (sort !== undefined) { R.sort = sort; R.dir = dir; }
    R.limit = 100;
    if (t === R.tab) { renderRankings(t); view.querySelector("#pl-table")?.scrollIntoView({ block: "start" }); }
    else location.hash = "#/players" + (t === "overview" ? "" : "/" + t);
  };
  view.querySelectorAll("[data-ptab]").forEach(b => b.onclick = () => go(b.dataset.ptab, "", -1));
  on("#pf-toggle", "onclick", e => { R.fopen = !R.fopen; view.querySelector(".pfbar").classList.toggle("open", R.fopen); e.currentTarget.setAttribute("aria-expanded", R.fopen); });
  on("#f-lg", "onchange", e => { R.lg = e.target.value; R.team = ""; if (R.tab === "contract" && !rValueOk()) go("overview", "", -1); else rerender("#f-lg"); });
  view.querySelectorAll("#f-grp button").forEach(b => b.onclick = () => { if ((R.grp === "G") !== (b.dataset.v === "G")) R.sort = ""; R.grp = b.dataset.v; rerender(`#f-grp [data-v="${R.grp}"]`); });
  view.querySelectorAll("#f-mode button").forEach(b => b.onclick = () => { PMODE = b.dataset.v; rerender(`#f-mode [data-v="${PMODE}"]`); });
  on("#f-team", "onchange", e => { R.team = e.target.value; rerender("#f-team"); });
  on("#f-age", "onchange", e => { R.maxAge = e.target.value; rerender("#f-age"); });
  on("#f-season", "onchange", e => { SEASON = e.target.value; rerender("#f-season"); });
  on("#f-clear", "onclick", () => { R.lg = "NHL"; R.grp = R.team = R.maxAge = ""; PMODE = "rs"; SEASON = D?.defaultSeason || SEASONS.at(-1) || null; rerender(); });
  view.querySelectorAll("#r-dev button").forEach(b => b.onclick = () => { R.dev = b.dataset.v; R.sort = ""; rerender(`#r-dev [data-v="${R.dev}"]`); });
  view.querySelectorAll("[data-trait]").forEach(b => b.onclick = () => { R.trait = b.dataset.trait; R.sort = ""; rerender(`[data-trait="${R.trait}"]`); view.querySelector("#pl-table")?.scrollIntoView({ block: "start" }); });
  view.querySelectorAll("[data-goto]").forEach(b => b.onclick = () => {
    const [t, k, d, dev] = b.dataset.goto.split("|");
    if (dev) R.dev = dev;
    go(t, k, +d);
  });
  on("#pl-jump", "onclick", () => view.querySelector("#pl-table")?.scrollIntoView({ block: "start" }));
  view.querySelector("#more")?.addEventListener("click", () => { R.limit += 200; renderRankings(R.tab); });
  view.querySelectorAll("th.sort button").forEach(b => b.onclick = () => {
    const k = b.parentNode.dataset.k, c = sortable.find(x => x.k === k);
    R.dir = R.sort === k ? -R.dir : (c.num && !c.low ? -1 : 1);
    R.sort = k; renderRankings(R.tab);
    view.querySelector(`th.sort[data-k="${k}"] button`)?.focus();
  });
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
}

function plRankRows(items, keyFn) {
  const rows = items.sort((a, b) => keyFn(b) - keyFn(a)).map(x => ({ ...x }));
  rows.forEach((r, i) => { r.rank = i && keyFn(r) === keyFn(rows[i - 1]) ? rows[i - 1].rank : i + 1; });
  return rows;
}
function derivedRankRows(key, grp) {
  if (key !== "blk60") return null;
  const I = plStatIdx(), items = [];
  I.by.forEach((e, k) => { const p = byKey.get(k); if (p && e.blk60 != null && e.grp === grp) items.push({ p: inSeason(p), v: e.blk60, pct: e.pct, txt: `${e.blk60.toFixed(2)} per 60 · ${e.blk} blocks in ${Math.round(e.toi)} min` }); });
  return { rows: plRankRows(items, x => x.v), title: "Blocked shots per 60", ranked: true,
    sub: `${SEASON ? seasonLabel(SEASON) : ""} ${PMODE === "po" ? "playoffs" : "regular season"} · NHL ${GRP_NAME[grp]} with at least ${Math.round(I.floor)} minutes · percentile vs this list` };
}
