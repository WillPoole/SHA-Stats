"use strict";

// ---------------------------------------------------------------- stats-only sites (D.pure)
/* Loaded only by the stats-only sites (sites/sha-stats, sites/training-stats), after every other script and before
   19-router.js. Their data comes from ehm/site/pure.py: no est. CA / PA, projections, WAR, xG, values, scouting or
   model reports. This file swaps the pages and sections built on those for hockey-data versions, and a sweeper removes
   any column or box left that names a model number. The normal sites never load it. */
const PURE = !!D.pure;

if (PURE) {
  D.players.forEach(p => { p.grpS ||= []; });   // the player card's attribute-group block expects a list
  // ---- model helpers become harmless stubs (several pages still call them)
  project = p => [{ m: 0, date: new Date(D.dates.at(-1) + "T00:00:00"), age: p.age, mid: null, lo: null, hi: null }];
  peakInfo = () => ({ mid: null, lo: null, hi: null, age: null });
  lastMove = () => null;
  lastMove4 = () => null;
  bigGame = () => null;
  playoffForm = () => null;
  playoffForms = () => [];
  playoffHero = () => "";
  warSection = () => "";
  warHistory = () => "";
  compsPanel = () => "";
  drawComps = () => {};
  scoutPanel = () => "";
  renderAttrProjection = () => {};
  drawMini = () => {};
  plTags = () => [];
  expWar = () => 0;
  contractValue = () => null;
  pickValue = () => ({ five: 0, season: 0 });
  findPlayers = (text, n = 8) => {
    const terms = fold(text).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];
    return D.players.filter(p => terms.every(t => p._n.includes(t)))
      .sort((a, b) => (b.lg === "NHL") - (a.lg === "NHL") || (pureBasic(b)?.p ?? -1) - (pureBasic(a)?.p ?? -1) || a.n.localeCompare(b.n)).slice(0, n);
  };

  // ---- the Players page: tabs and columns without model numbers
  for (let i = PL_TABS.length - 1; i >= 0; i--) if (["traits", "development", "contract"].includes(PL_TABS[i][0])) PL_TABS.splice(i, 1);
  const pts = plCol("p", "P", p => plBasic(p)?.p ?? null, v => `<td class="num">${v == null ? dash : `<b>${v}</b>`}</td>`);
  const basicCols = () => [plRC("pos"), plRC("age"),
    plCol("gp", "GP", plGp, plNum(0)), plCol("g", "G", p => plBasic(p)?.g ?? null, plNum(0)), plCol("a", "A", p => plBasic(p)?.a ?? null, plNum(0)), pts,
    plCol("pm", "+/-", p => plBasic(p)?.pm ?? null, plSgn(0)), plCol("pim", "PIM", p => plBasic(p)?.pim ?? null, plNum(0)),
    plTime("toi_gp", "TOI/GP", "Time on ice per game"), plRate("p60", "P/60", 2, "Points per 60 minutes"), plRC("cap")];
  TABS.overview = {
    lede: "Who is producing, from the box scores and each player's season line",
    cols: () => (plOverG() ? [plRC("pos"), plRC("age"), ...plGoalieCols(), plRC("cap")] : basicCols()),
    sort: () => (plOverG() ? ["svp", "gp"] : ["p", "gp"]),
    boxes: () => (plOverG() ? [plSvpBox("overview"), plGaaBox("overview")] : [
      { id: "pts", title: "Top scorers", sub: "Points", val: p => plBasic(p)?.p ?? null, right: v => `<span class="lnum"><b>${v}</b></span>`, goto: ["offence", "p", -1], ok: p => p.grp !== "G" },
      { id: "g", title: "Goal scorers", sub: "Goals", val: p => plBasic(p)?.g ?? null, right: v => `<span class="lnum"><b>${v}</b></span>`, goto: ["offence", "g", -1], ok: p => p.grp !== "G" },
      { id: "pm", title: "Plus-minus", sub: "+/-", val: p => plBasic(p)?.pm ?? null, right: v => `<span class="lnum"><b>${signed(v, 0)}</b></span>`, goto: ["overview", "pm", -1], ok: p => p.grp !== "G" },
      plSvpBox("goalies")]),
  };
  const off = TABS.offence, offCols = off.cols;
  off.cols = () => offCols().filter(c => c && !["ca", "ixg60", "fin", "offp"].includes(c.k));
  off.boxes = (b => () => b().filter(x => x.id !== "fin"))(off.boxes);
  const def = TABS.defence, defCols = def.cols;
  def.lede = "Ice time, blocks, penalty killing and discipline. Goalies are on their own tab";
  def.cols = () => defCols().filter(c => c && !["ca", "defwar", "defattr", "defp"].includes(c.k));
  def.sort = ["toi_gp"];
  def.boxes = (b => () => b().filter(x => !["def", "dw"].includes(x.id)))(def.boxes);
  const gl = TABS.goalies, glCols = gl.cols;
  gl.lede = "Goalies only: games, record, SV% and GAA";
  gl.cols = () => glCols().filter(c => c && !["ca", "war", "war82", "gsax", "gsax100", "gsa"].includes(c.k) && !String(c.k).startsWith("gs_"));
  gl.sort = ["svp", "gp"];
  gl.boxes = (b => () => b().filter(x => !["gsax", "ss"].includes(x.id)))(gl.boxes);
  NOTES.defence = "Hits, takeaways, giveaways and faceoff wins exist only as team totals, so they have no player columns. Blocks come from the box scores.";
  plNameCell = p => `<th scope="row" class="pcol"><a class="pcell" href="${route(p.k)}">${logo(clubOf(p), 26)}<span><b>${esc(p.n)}</b><small>${esc(clubOf(p))}</small></span></a></th>`;

  // ---- team pages
  for (let i = ROSTER_COLS.length - 1; i >= 0; i--) if (["ca", "pa", "peak", "war", "imp", "role"].includes(ROSTER_COLS[i][0])) ROSTER_COLS.splice(i, 1);
  ROSTER_COLS[0][4] = p => `<th scope="row" class="pcol"><a class="pcell" href="${route(p.k)}"><span><b>${esc(p.n)}</b>${p.lg && p.lg !== "NHL" ? `<small>${esc(p.lg)}</small>` : ""}</span></a></th>`;
  const rPos = ROSTER_COLS.findIndex(c => c[0] === "age") + 1;
  ROSTER_COLS.splice(rPos, 0,
    ["gp", "GP", p => pureBasic(p)?.gp ?? null, true, p => `<td class="num">${pureBasic(p)?.gp ?? dash}</td>`, 52],
    ["pts", "P", p => (p.grp === "G" ? null : pureBasic(p)?.p ?? null), true, p => `<td class="num"><b>${p.grp === "G" ? dash : pureBasic(p)?.p ?? dash}</b></td>`, 52],
    ["svp", "SV%", p => (p.grp === "G" ? plSvp(p) : null), true, p => { const v = p.grp === "G" ? plSvp(p) : null; return `<td class="num">${v == null ? dash : v.toFixed(3).replace(/^0/, "")}</td>`; }, 64]);
  RF.sort = "pts";
  for (let i = TP_COLS.length - 1; i >= 0; i--) if (["imp", "off", "def", "fin", "ply", "ixg", "gax", "war"].includes(TP_COLS[i][0]) || TP_COLS[i][5] === "war") TP_COLS.splice(i, 1);
  // the More view sorts by key "imp" by default (impact is gone): points take that key there
  TP_COLS.splice(TP_COLS.findIndex(c => (c[5] || "").includes("adv")), 0, ["imp", "P", r => r.p, v => `<b>${v}</b>`, "Points", "adv"]);
  for (let i = TP_VIEWS.length - 1; i >= 0; i--) if (TP_VIEWS[i][0] === "war") TP_VIEWS.splice(i, 1);
  TP_VIEWS.forEach(v => { if (v[0] === "adv") v[1] = "More"; });
  if (TPS.view === "war") TPS.view = "basic";
  for (let i = STAT_GROUPS.length - 1; i >= 0; i--) if (STAT_GROUPS[i][0] === "Expected goals") STAT_GROUPS.splice(i, 1);
  contractsTab = (club, ps) => `<div class="ctab">${capTable(club, ps)}</div>`;
  prospectsTab = club => pureProspectsTab(club);
  teamDraftsTab = club => pureTeamDrafts(club);

  // ---- pages that are models through and through
  renderHome = pureHome;
  renderDraft = pureDraft;
  renderProspects = pureProspects;
  renderAbout = pureAbout;
  renderValue = renderH2H = renderTrade = () => { location.replace("#/"); };
  const baseFacts = factRows;
  factRows = (p, X) => baseFacts(p, X).filter(r => !["Est. CA", "Est. PA", "Proj. peak", "Role", "Career role", "Big games"].includes(r[0]));
  keyNumbers = pureKeyNumbers;
  composePlayer = pureComposePlayer;
  exportCard = () => {};
  const baseChart = drawChart;
  drawChart = (p, proj, metric) => {
    if (metric === "ca" || metric == null || metric === "") metric = String(D.attrs.findIndex((a, i) => p.h.some(h => h[i + 2] != null)));
    if (metric === "-1" || !p.h.some(h => h[+metric + 2] != null)) {   // no attribute recorded for him
      const box = view.querySelector("#chart");
      if (box) box.innerHTML = `<p class="muted small">No attributes recorded for this player.</p>`;
      return;
    }
    const sel = view.querySelector("#metric");
    if (sel && sel.value !== metric) sel.value = metric;
    baseChart(p, proj, metric);
    const sub = view.querySelector("#chart-sub");
    if (sub) sub.textContent = "Attribute value (1–20) at each snapshot.";
  };
  gameScoreCard = () => "";   // a weighted formula, not a stat
  const baseShots = shotPanel;
  shotPanel = p => baseShots(p).replace(/<button type="button" data-m="eff"[^>]*>[^<]*<\/button>/, "");
  const baseAttrs = attrTables;
  attrTables = p => baseAttrs(p).replace(" Default is his scouted preferred role.", "");
  const baseRankRows = playerRankRows;
  playerRankRows = (kind, key, grp) => (["m", "g", "x"].includes(kind) ? baseRankRows(kind, key, grp) : null);
  const baseTeamRank = teamRankRows;
  teamRankRows = key => (key === "pool" ? null : baseTeamRank(key));
}

/* Counting numbers of the selected season: NHL box-score totals, else the season line from his History tab. */
function pureBasic(p) {
  const q = inSeason(p);
  const t = q.card?.totals;
  if (t) return { gp: t.gp, g: t.g, a: t.a, p: t.p, pm: t.pm, pim: t.pim, st: t.st, toi: t.toi };
  const c = plLine(q);
  return c ? { gp: c.gp, g: c.g, a: c.a, p: c.p, pm: c.pm, pim: c.pim, st: c.s, toi: c.toi != null && c.gp ? c.toi * c.gp : null } : null;
}
/* Sum of every visible attribute change between the MOVE_BASE snapshot and the latest one (null when he isn't in both). */
function attrMove(p) {
  const b = p.h.at(-1), a = MOVE_BASE == null ? null : p.h.findLast(h => h[0] <= MOVE_BASE);
  if (!a || b[0] !== D.dates.length - 1) return null;
  let s = 0, n = 0;
  for (let i = 2; i < b.length; i++) if (a[i] != null && b[i] != null) { s += b[i] - a[i]; n++; }
  return n ? s : null;
}
function attrChanges(p) {
  const b = p.h.at(-1), a = MOVE_BASE == null ? null : p.h.findLast(h => h[0] <= MOVE_BASE);
  if (!a || b[0] !== D.dates.length - 1) return [];
  const out = [];
  for (let i = 2; i < b.length; i++) if (a[i] != null && b[i] != null && b[i] !== a[i]) out.push([D.attrs[i - 2].split(": ")[1], b[i] - a[i]]);
  return out.sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
}
const pureSv = v => (v == null ? "–" : v.toFixed(3).replace(/^0/, ""));

// ---------------------------------------------------------------- home
function pureHome() {
  markNav("home");
  const n = D.dates.length, last = D.dates[n - 1], prev = MOVE_BASE == null ? null : D.dates[MOVE_BASE];
  const nhl = D.players.filter(p => p.lg === "NHL");
  const sk = nhl.filter(p => p.grp !== "G").map(p => ({ p, b: pureBasic(p) })).filter(x => x.b);
  const top = (k, m = 6) => sk.filter(x => x.b[k] != null).sort((a, b) => b.b[k] - a.b[k] || b.b.p - a.b.p).slice(0, m);
  const goalies = nhl.filter(p => p.grp === "G").map(p => ({ p, l: plLine(inSeason(p)) })).filter(x => x.l?.svp != null && (x.l.gp || 0) >= plGFloor())
    .sort((a, b) => b.l.svp - a.l.svp).slice(0, 6);
  const movers = D.players.map(p => ({ p, d: attrMove(p) })).filter(x => x.d);
  const up = movers.filter(x => x.d > 0).sort((a, b) => b.d - a.d).slice(0, 6), down = movers.filter(x => x.d < 0).sort((a, b) => a.d - b.d).slice(0, 4);
  const T = teamTable(SEASON);
  const standings = T ? Object.entries(T.teams).map(([abbr, r]) => ({ club: clubOfAbbr(abbr), r })).sort((a, b) => a.r.place - b.r.place).slice(0, 8) : [];
  const trades = (D.trades || []).slice().sort((a, b) => b.d.localeCompare(a.d)).slice(0, 5);
  const statRow = (k, label) => x => listRow(x.p, `<span class="lnum"><b>${x.b[k]}</b></span>`, `${esc(x.p.pos)} · ${tname(clubOf(x.p))} · ${x.b.gp} GP${label ? " · " + label(x) : ""}`);
  const chg = x => `<span class="delta ${x.d > 0 ? "pos" : "neg"}">${signed(x.d, 0)}</span>`;
  const mvRow = x => listRow(x.p, chg(x), `${esc(x.p.pos)} · ${x.p.age} · ${tname(clubOf(x.p))} · ${attrChanges(x.p).slice(0, 3).map(([a, d]) => `${esc(a)} ${signed(d, 0)}`).join(", ")}`);
  const season = SEASON ? seasonLabel(SEASON) : "";
  view.innerHTML = `
  <section class="band"><div class="wrap"><div class="team-head"><div class="grow"><h1>${esc(D.title)}</h1>
    <p class="lede">Snapshot ${fmtDate(last)} · ${D.players.length.toLocaleString()} players in ${n} snapshot${n === 1 ? "" : "s"} · hockey data only: stats, attributes, standings, contracts and trades</p></div></div></div></section>
  <div class="wrap page home">
    <div class="row three">
      <section class="card-box" aria-labelledby="pts-h"><h2 id="pts-h">Points</h2><p class="sub">NHL, ${season} regular season</p>${top("p").map(statRow("p", x => `${x.b.g} G, ${x.b.a} A`)).join("") || `<p class="muted small">No NHL games yet this season.</p>`}
        <a class="more-link" href="#/players/offence">All scorers →</a></section>
      <section class="card-box" aria-labelledby="g-h"><h2 id="g-h">Goals</h2><p class="sub">NHL, ${season} regular season</p>${top("g").map(statRow("g")).join("") || `<p class="muted small">No NHL games yet this season.</p>`}
        <a class="more-link" href="#/players/offence">All scorers →</a></section>
      <section class="card-box" aria-labelledby="sv-h"><h2 id="sv-h">Save percentage</h2><p class="sub">NHL goalies, at least ${plGFloor()} games</p>
        ${goalies.map(x => listRow(x.p, `<span class="lnum"><b>${pureSv(x.l.svp)}</b></span>`, `${tname(clubOf(x.p))} · ${x.l.gp} GP · ${fmt(x.l.gaa, 2)} GAA`)).join("") || `<p class="muted small">No goalie lines yet.</p>`}
        <a class="more-link" href="#/players/goalies">All goalies →</a></section>
    </div>
    <div class="row three">
      <section class="card-box" aria-labelledby="st-h"><h2 id="st-h">Standings</h2><p class="sub">${season}, from the box scores</p>
        ${standings.map(x => `<div class="lrow">${teamLogo(x.club, 30)}<span class="lmain"><a class="lname" href="${teamRoute(x.club)}"><b>${x.r.place}. ${esc(x.club)}</b></a><small>${x.r.w}–${x.r.l}–${x.r.otl} · ${x.r.gp} GP</small></span><span class="lnum"><b>${x.r.pts}</b></span></div>`).join("") || `<p class="muted small">No games yet.</p>`}
        <a class="more-link" href="#/teams">All teams →</a></section>
      <section class="card-box" aria-labelledby="mv-h"><h2 id="mv-h">Attribute changes</h2><p class="sub">Sum of visible attribute changes${prev ? `, ${fmtDate(prev)} → ${fmtDate(last)}` : ""}</p>
        ${up.length ? `<h3 class="pos">Up</h3>${up.map(mvRow).join("")}` : ""}${down.length ? `<h3 class="neg">Down</h3>${down.map(mvRow).join("")}` : ""}${up.length || down.length ? "" : `<p class="muted small">Needs two snapshots.</p>`}</section>
      <section class="card-box" aria-labelledby="tr-h"><h2 id="tr-h">Latest trades</h2><p class="sub">NHL Trade Center</p>
        ${trades.map(t => `<div class="lrow"><span class="lmain"><b>${t.s.map(s => esc(s[0])).join(" ⇄ ")}</b><small>${fmtDate(t.d)} · ${t.s.map(s => `${esc(s[0])} get ${s[2].map(a => esc(a[1])).join(", ") || "nothing"}`).join(" · ")}</small></span></div>`).join("") || `<p class="muted small">No trades read yet.</p>`}
        ${trades.length ? `<a class="more-link" href="#/trades">All trades →</a>` : ""}</section>
    </div>
  </div>`;
}

// ---------------------------------------------------------------- player page
function pureKeyNumbers(p, X) {
  const b = X.t ? { gp: X.t.gp, g: X.t.g, a: X.t.a, p: X.t.p, pm: X.t.pm, toi: X.t.toi } : pureBasic(p);
  const line = plLine(p);
  const kn = (lab, val, note) => `<div class="kn"><div class="lab">${lab}</div><div class="val">${val}</div><div class="note">${note || ""}</div></div>`;
  const where = X.t ? `NHL ${p._po ? "playoffs" : "regular season"}` : line ? esc(p.lg || "") : "";
  if (X.isG) return `<div class="keynums">
    ${kn("Games", line?.gp ?? b?.gp ?? "–", where)}${kn("Record", line?.w != null ? `${line.w}–${line.l ?? 0}${line.t ? "–" + line.t : ""}` : "–", "W–L–OT")}
    ${kn("Save %", pureSv(line?.svp ?? p.card?.raw?.svp), line?.so ? `${line.so} shutouts` : "")}${kn("GAA", fmt(line?.gaa ?? p.card?.raw?.gaa, 2), "Goals against per 60")}</div>`;
  return `<div class="keynums">
    ${kn("Games", b?.gp ?? "–", where)}${kn("Points", b?.p ?? "–", b ? `${b.g} G · ${b.a} A` : "")}
    ${kn("+/-", b?.pm == null ? "–" : signed(b.pm, 0), "")}${kn("TOI / game", b?.toi && b?.gp ? rawFmt("toi_gp", b.toi / b.gp) : "–", "")}</div>`;
}
function pureRates(p, X) {
  const card = X.card;
  const rows = card.pct ? X.metricsDef.map(([k, label]) => barRow(label, rawFmt(k, card.raw?.[k]), card.pct[k], null, pRankHref("m", k, p.grp, p.k))).join("") : "";
  return `<div class="panel"><h2>${X.isG ? "Goalie rates" : "Rates &amp; usage"}</h2>
    <p class="sub">${card.pool ? "Percentiles vs " + esc(card.pool) + ". " : ""}NHL ${p._po ? "playoff" : "regular-season"} box scores${X.G.first ? ", " + fmtDate(X.G.first) + " – " + fmtDate(X.G.last) : ""}.</p>
    ${rows ? `<div class="bars">${rows}</div>` : `<p class="muted small">No NHL rate stats for this player in the selected season.</p>`}</div>`;
}
function pureComposePlayer(S, p, X) {
  const totals = `<div class="panel"><h2>NHL box-score totals</h2><p class="sub">Games in this save's box scores.</p>${totalsTable(p, X.t)}</div>`;
  const awards = S.ach || `<div class="panel"><h2>Draft &amp; awards</h2><p class="sub">No draft or achievements recorded for this player.</p></div>`;
  const pane = (k, html) => `<section class="tabpane" data-tab="${k}" role="tabpanel" aria-label="${PTABS.find(t => t[0] === k)[1]}">${html}</section>`;
  const sec = (id, html) => `<div class="psec" id="sec-${id}">${html}</div>`;
  const jumps = list => `<nav class="jumps" aria-label="On this tab">${list.map(([id, t]) => `<button type="button" data-jump="${id}">${t}</button>`).join("")}</nav>`;
  const changes = attrChanges(p);
  const chBox = changes.length ? `<div class="ovblock"><h2>Attribute changes</h2><p class="small muted">Since ${fmtDate(D.dates[MOVE_BASE])}</p>
    <ul class="plain small">${changes.slice(0, 8).map(([a, d]) => `<li><span class="delta ${d > 0 ? "pos" : "neg"}">${signed(d, 0)}</span> ${esc(a)}</li>`).join("")}</ul></div>` : "";
  const overview = `${keyNumbers(p, X)}
    <div class="ovtop">
      <div class="ovchart">${pureRates(p, X)}</div>
      <div class="ovside"><div class="ovblock"><h2>Contract</h2>${contractSummary(p)}</div>${chBox}</div>
    </div>`;
  const perf = `${jumps([["stats", "Career stats"], ["shots", "Shots"], ["games", "Game log"]])}
    ${sec("stats", S.career + totals)}${sec("shots", S.shots)}
    ${sec("games", `<div class="panel" id="gamelog"><h2>Game log</h2><p class="muted small">Loading the box scores…</p></div>`)}`;
  const chart = S.chart.replace(/<option value="ca">[^<]*<\/option>/, "").replace("Ability over time and projection", "Attributes over time");
  // old links to the Scouting and Comparables sections (gone here) still open this tab
  const dev = `${jumps([["attrs", "Attributes"], ["ability", "History chart"]])}${sec("attrs", S.attrs)}${sec("ability", chart)}
    <div class="psec" id="sec-scout" hidden></div><div class="psec" id="sec-comps" hidden></div>`;
  const record = `${contractPanel(p)}${playerTrades(p)}${sec("awards", awards)}
    <div class="panel"><h2>Player facts</h2>${factList(factRows(p, X))}</div>`;
  return `
  <section class="band pband"><div class="wrap">
    ${S.controls.replace(/<button class="ghost small" id="png"[^>]*>[^<]*<\/button>/, '<span id="png" hidden></span>')}
    <div class="phead">
      ${teamLogo(clubOf(p), 56)}
      <div class="phead-id">
        <h1>${p.no ? `<span class="no">#${esc(p.no)}</span>` : ""}${esc(p.n)}</h1>
        <p>${[esc(p.pos), clubOf(p) ? `<a href="${teamRoute(clubOf(p))}">${esc(clubOf(p))}</a>` : "–", p.lg && p.lg !== "NHL" ? esc(p.lg) : "", `Age ${p.age}`,
              p.sh ? "Shoots " + esc(p.sh[0]) : "", esc(p.ht || ""), esc(p.wt || ""), esc(p.nat || "")].filter(Boolean).join(" · ")}</p>
        <div class="chips">${X.tagsHtml.replace(/<span class="tag">Big-game[^<]*<\/span>/, "")}</div>
      </div>
    </div>
    <div class="ptabs" role="tablist" aria-label="Player sections">${PTABS.map(([k, t]) => `<button type="button" role="tab" data-tab="${k}">${t}</button>`).join("")}</div>
  </div></section>
  <div id="comps-mode" hidden><button type="button" class="on" data-m="now"></button></div>
  <div class="wrap page player"><div class="pmain">
    ${pane("overview", overview)}${pane("performance", perf)}${pane("dev", dev)}${pane("record", record)}
  </div></div>`;
}

// ---------------------------------------------------------------- draft: the official lists and past drafts
const PD = { stage: "", sort: "rank" };
function pureDraft(tab = "board", year, pick) {
  markNav("draft");
  const hist = (D.draftHist || []).map(([y, rd, pk, team, k, n]) => ({ y, rd, pk, team, club: draftClub(team) || team, k, n, p: byKey.get(k) || null }));
  const years = [...new Set(hist.map(x => x.y))].sort((a, b) => b - a);
  const tabs = [["board", "NHL draft ranking"], ...(years.length ? [["past", "Past drafts"]] : [])];
  if (!tabs.some(t => t[0] === tab)) tab = "board";
  let body;
  const nhlGp = p => careerLines(p).filter(l => l.league === "NHL" && l.type === "R").reduce((s, l) => s + (l.gp || 0), 0);
  if (tab === "past") {
    const y = years.includes(+year) ? +year : years[0];
    const rows = hist.filter(x => x.y === y).sort((a, b) => a.pk - b.pk);
    body = `<div class="cardbar"><div><h2 class="flat">${y} NHL Entry Draft</h2><p class="sub">${rows.length} picks in the draft records.</p></div>
        <label class="inline">Draft <select id="pd-year">${years.map(v => `<option ${v === y ? "selected" : ""}>${v}</option>`).join("")}</select></label></div>
      <section class="card-box flush"><div class="tablewrap"><table class="rank sortable picks"><thead><tr><th class="num">Pick</th><th class="num">Rd</th><th>Team</th><th class="pcol">Player</th><th>Pos</th><th class="num">Age</th><th>Now</th><th class="num">NHL GP</th></tr></thead><tbody>
      ${rows.map(x => `<tr id="pick-${x.pk}" class="${hasPage(x.k) ? "link" : ""}${x.pk === +pick ? " hl" : ""}"${hasPage(x.k) ? ` data-k="${esc(x.k)}"` : ""}><td class="num">${x.pk}</td><td class="num">${x.rd}</td>
        <td class="nowrap">${tlink(x.club, `${logo(x.club, 22)} ${esc(NHL_TEAMS[x.club]?.[0] || x.club)}`)}</td>
        <th scope="row" class="pcol">${hasPage(x.k) ? `<a class="pcell" href="${route(x.k)}"><span><b>${esc(x.p?.n || x.n)}</b></span></a>` : `<span class="muted">${esc(x.n)}</span>`}</th>
        <td>${x.p ? esc(x.p.pos) : ""}</td><td class="num">${x.p ? x.p.age : ""}</td><td>${x.p ? `${tname(clubOf(x.p))}${x.p.lg ? ` <span class="muted small">${esc(x.p.lg)}</span>` : ""}` : `<span class="muted small">not in the latest snapshot</span>`}</td>
        <td class="num">${x.p ? nhlGp(x.p) || dash : dash}</td></tr>`).join("")}</tbody></table></div>
      <p class="sub pad">NHL GP: regular-season games on his History tab inside this save.</p></section>`;
  } else {
    const rows = D.players.map(p => ({ p, r: nhlRanks(p) })).filter(x => x.r);
    const stages = [...new Set(rows.map(x => x.r.stage))];
    const stage = stages.includes(PD.stage) ? PD.stage : stages.sort((a, b) => STAGE_ORDER.indexOf(b) - STAGE_ORDER.indexOf(a))[0];
    const list = rows.filter(x => x.r.stage === stage).sort((a, b) => a.r.rank - b.r.rank);
    const other = p => (p.drs || []).filter(d => !d[0].includes("(NHL)")).map(d => `${esc(d[0])} #${d[1]}`).join(" · ");
    body = `<div class="cardbar"><div><h2 class="flat">NHL draft ranking${stage ? ` · ${esc(stage)}` : ""}</h2>
        <p class="sub">The game's own NHL list in the latest snapshot (${list.length} players). Move = places gained since the previous list.</p></div></div>
      <section class="card-box flush"><div class="tablewrap"><table class="rank sortable picks"><thead><tr><th class="num">NHL rank</th><th class="num">Move</th><th class="pcol">Player</th><th>Pos</th><th class="num">Age</th><th>Club</th><th>League</th><th class="num">GP</th><th class="num">P</th><th>Other lists</th></tr></thead><tbody>
      ${list.map(x => { const b = pureBasic(x.p); return `<tr class="link" data-k="${esc(x.p.k)}"><td class="num"><b>${x.r.rank}</b></td>
        <td class="num ${x.r.move > 0 ? "up" : x.r.move < 0 ? "down" : ""}"${x.r.prevTxt ? ` title="${esc(x.r.prevTxt)}"` : ""}>${x.r.move == null ? dash : signed(x.r.move, 0)}</td>
        <th scope="row" class="pcol"><a class="pcell" href="${route(x.p.k)}"><span><b>${esc(x.p.n)}</b></span></a></th><td>${esc(x.p.pos)}</td><td class="num">${x.p.age}</td>
        <td>${tname(clubOf(x.p))}</td><td>${esc(x.p.lg || "")}</td><td class="num">${b?.gp ?? dash}</td><td class="num">${x.p.grp === "G" ? dash : b?.p ?? dash}</td><td class="small">${other(x.p) || dash}</td></tr>`; }).join("")
        || `<tr><td colspan="10" class="muted">No NHL draft ranking in the latest snapshot.</td></tr>`}</tbody></table></div>
      <p class="sub pad">GP and P: his season line in his current league. Other lists: the game's other draft rankings he is on.</p></section>`;
  }
  view.innerHTML = `<section class="band"><div class="wrap"><h1>Draft</h1>${tabBar("Draft sections", tabs, tab, "data-dtab")}</div></section><div class="wrap page">${body}</div>`;
  view.querySelectorAll("[data-dtab]").forEach(b => b.onclick = () => (location.hash = "#/draft" + (b.dataset.dtab === "board" ? "" : "/" + b.dataset.dtab)));
  view.querySelector("#pd-year")?.addEventListener("change", e => (location.hash = "#/draft/past/" + e.target.value));
  makeSortable();
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
  const hl = view.querySelector("tr.hl");
  if (hl) setTimeout(() => hl.scrollIntoView({ block: "center" }), 0);
}
function pureTeamDrafts(club) {
  const hist = (D.draftHist || []).map(([y, rd, pk, team, k, n]) => ({ y, rd, pk, club: draftClub(team) || team, k, n, p: byKey.get(k) || null })).filter(x => x.club === club);
  const years = [...new Set(hist.map(x => x.y))].sort((a, b) => b - a);
  return years.map(y => `<section class="card-box flush"><h2 class="box-h">${y} draft <a class="small" href="#/draft/past/${y}">Whole draft →</a></h2>
    <div class="tablewrap"><table class="rank sortable picks"><thead><tr><th class="num">Pick</th><th class="num">Rd</th><th class="pcol">Player</th><th>Pos</th><th class="num">Age</th><th>Now</th></tr></thead><tbody>
    ${hist.filter(x => x.y === y).sort((a, b) => a.pk - b.pk).map(x => `<tr class="${hasPage(x.k) ? "link" : ""}"${hasPage(x.k) ? ` data-k="${esc(x.k)}"` : ""}><td class="num">${x.pk}</td><td class="num">${x.rd}</td>
      <th scope="row" class="pcol">${hasPage(x.k) ? `<a class="pcell" href="${route(x.k)}"><span><b>${esc(x.p?.n || x.n)}</b></span></a>` : esc(x.n)}</th><td>${x.p ? esc(x.p.pos) : ""}</td><td class="num">${x.p ? x.p.age : ""}</td>
      <td>${x.p ? tname(clubOf(x.p)) : `<span class="muted small">not in the latest snapshot</span>`}</td></tr>`).join("")}</tbody></table></div></section>`).join("")
    || `<p class="muted">No draft records for ${esc(club)}.</p>`;
}

// ---------------------------------------------------------------- prospects
const PP = { q: "", own: "", maxAge: "23", limit: 150 };
function pureProspectRows(list, lead) {
  return list.map(x => { const b = pureBasic(x.p); return `<tr class="link" data-k="${esc(x.p.k)}">${lead ? lead(x) : ""}<th scope="row" class="pcol"><a class="pcell" href="${route(x.p.k)}"><span><b>${esc(x.p.n)}</b></span></a></th>
    <td>${esc(x.p.pos)}</td><td class="num">${x.p.age}</td><td>${tname(clubOf(x.p))}${x.p.lg ? ` <span class="muted small">${esc(x.p.lg)}</span>` : ""}</td>
    <td>${x.o ? `${tname(x.o.club)} <span class="muted small">${esc(x.o.how)}</span>` : x.r ? `Draft eligible · NHL #${x.r.rank}` : `<span class="muted">none</span>`}</td>
    <td class="small">${x.p.dft?.pro?.pick != null ? `${x.p.dft.pro.year} R${x.p.dft.pro.round} #${x.p.dft.pro.pick}` : dash}</td>
    <td class="num">${b?.gp ?? dash}</td><td class="num">${x.p.grp === "G" ? dash : b?.p ?? dash}</td><td class="num">${x.p.grp === "G" ? pureSv(plLine(x.p)?.svp) : dash}</td></tr>`; }).join("");
}
const PROSPECT_HEAD = `<thead><tr><th class="pcol">Player</th><th>Pos</th><th class="num">Age</th><th>Playing for</th><th>NHL club</th><th>Drafted</th><th class="num">GP</th><th class="num">P</th><th class="num">SV%</th></tr></thead>`;
function pureProspects() {
  markNav("prospects");
  const pool = D.players.filter(p => p.age <= +PP.maxAge && p.lg !== "NHL" && !nhlGraduated(p)).map(p => ({ p, o: nhlOwner(p), r: nhlRanks(p) }));
  const terms = fold(PP.q).split(/\s+/).filter(Boolean);
  const rows = pool.filter(x => (!PP.own || (PP.own === "none" ? !x.o : x.o?.club === PP.own)) && terms.every(t => x.p._n.includes(t)))
    .sort((a, b) => (a.p.tp ? 0 : 1) - (b.p.tp ? 0 : 1) || (a.p.tp?.[1] ?? 99) - (b.p.tp?.[1] ?? 99) || (a.r?.rank ?? 999) - (b.r?.rank ?? 999) || a.p.age - b.p.age || a.p.n.localeCompare(b.p.n));
  view.innerHTML = `<section class="band"><div class="wrap"><h1>Prospects</h1>
    <p class="lede">Players aged ${esc(PP.maxAge)} or under outside the NHL who haven't graduated (Calder rule), with the NHL club that owns each one: its Top Prospects list, draft rights, or the NHL draft ranking.</p>
    <form class="filters" aria-label="Filters"><label>Search <input id="pp-q" type="search" value="${esc(PP.q)}" placeholder="Name"></label>
      <label>NHL club <select id="pp-own"><option value="">Any</option><option value="none" ${PP.own === "none" ? "selected" : ""}>None</option>${nhlClubs().map(c => `<option ${c === PP.own ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
      <label class="narrow">Max age <input id="pp-age" type="number" min="15" max="30" value="${esc(PP.maxAge)}"></label></form></div></section>
    <div class="wrap page"><section class="card-box flush"><h2 class="box-h">Prospects <span class="muted">${rows.length.toLocaleString()}</span></h2>
      <div class="tablewrap"><table class="rank sortable">${PROSPECT_HEAD}<tbody>${pureProspectRows(rows.slice(0, PP.limit))}</tbody></table></div>
      ${rows.length > PP.limit ? `<div class="more"><button class="ghost" id="pp-more" type="button">Show more (${(rows.length - PP.limit).toLocaleString()} left)</button></div>` : ""}
      <p class="sub pad">Order: each club's Top Prospects list first (its own order), then the NHL draft ranking, then by age. GP, P, SV%: his season line in his current league.</p></section></div>`;
  const re = () => { PP.limit = 150; renderProspects(); };
  view.querySelector("#pp-q").onchange = e => { PP.q = e.target.value; re(); };
  view.querySelector("#pp-own").onchange = e => { PP.own = e.target.value; re(); };
  view.querySelector("#pp-age").onchange = e => { PP.maxAge = e.target.value || "23"; re(); };
  view.querySelector("#pp-more")?.addEventListener("click", () => { PP.limit += 300; renderProspects(); });
  makeSortable();
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
}
function pureProspectsTab(club) {
  const pool = listedBy(club).map(p => ({ p, o: { club, how: `#${p.tp[1]} on its Top Prospects` }, r: nhlRanks(p) }));
  const held = D.rights ? new Set(D.rights.rows.filter(x => draftClub(x[6]) === club && x[4]).map(x => x[4])) : null;
  const yr = nextDraftYear();
  const drafted = D.players.filter(p => !p.tp && p.lg !== "NHL" && !nhlGraduated(p) && p.age <= 23
    && (held ? held.has(p.k) : p.dft?.pro?.year >= yr - 5 && draftClub(p.dft.pro.team) === club)).sort((a, b) => a.age - b.age)
    .map(p => ({ p, o: { club, how: held ? "draft rights" : `drafted ${p.dft?.pro?.year}` }, r: nhlRanks(p) }));
  return `<section class="card-box flush"><h2 class="box-h">Top prospects <span class="muted">${pool.length}</span></h2>
      ${pool.length ? `<div class="tablewrap"><table class="rank sortable">${PROSPECT_HEAD.replace("<tr>", '<tr><th class="num">Rank</th>')}<tbody>
        ${pureProspectRows(pool, x => `<td class="num"><b>${x.p.tp[1]}</b></td>`)}</tbody></table></div>
        <p class="sub pad">Rank is the club's own order on EHM's Top Prospects screen.</p>` : `<p class="pad muted small">No Top Prospects list for ${esc(club)} in the latest snapshot.</p>`}</section>
    ${drafted.length ? `<section class="card-box flush"><h2 class="box-h">Also drafted by ${esc(club)} <span class="muted">${drafted.length}</span></h2>
      <div class="tablewrap"><table class="rank sortable">${PROSPECT_HEAD}<tbody>${pureProspectRows(drafted)}</tbody></table></div></section>` : ""}
    ${purePicks(club)}`;
}
function purePicks(club) {
  if (!D.picks) return "";
  const mine = D.picks.rows.filter(x => draftClub(x[5]) === club);
  const years = [...new Set(D.picks.rows.map(x => x[1]))].sort();
  const cell = (yr, rnd) => {
    const own = mine.filter(x => x[1] === yr && x[2] === rnd);
    if (!own.length) return `<td class="muted small">traded</td>`;
    return `<td>${own.map(x => { const from = draftClub(x[4]); return `<span class="pick${from !== club ? " acq" : ""}">${from !== club ? tlink(from, `${logo(from, 16)} ${esc(NHL_TEAMS[from]?.[0] || x[4])}`) : "Own"}${x[3] ? ` #${x[3]}` : ""}</span>`; }).join(" ")}</td>`;
  };
  return `<section class="card-box flush"><h2 class="box-h">Draft picks <span class="muted">${mine.length}</span></h2>
    <div class="tablewrap"><table class="picks-own"><thead><tr><th>Draft</th>${[1, 2, 3, 4, 5, 6, 7].map(r => `<th>Round ${r}</th>`).join("")}</tr></thead><tbody>
    ${years.map(yr => `<tr><th scope="row">${yr}</th>${[1, 2, 3, 4, 5, 6, 7].map(rnd => cell(yr, rnd)).join("")}</tr>`).join("")}</tbody></table></div>
    <p class="sub pad">From ${esc(club)}'s Transactions tab (${fmtDate(D.picks.date)}). "Own" = its own pick; a logo = acquired from that club; traded = it doesn't own one.</p></section>`;
}

// ---------------------------------------------------------------- about the data
function pureAbout() {
  markNav("about");
  const audit = D.audit || [];
  view.innerHTML = `<section class="band"><div class="wrap"><h1>About the data</h1>
    <p class="lede">Everything on this site is what an EHM client shows, read after each sim, plus simple maths on those numbers. No estimates, projections or model ratings.</p></div></section>
    <div class="wrap page"><div class="panel"><h2>What's here</h2><ul class="plain">
      <li><b>Attributes</b>: every visible attribute (1-20) at every snapshot, so development shows as the history of what the game displays.</li>
      <li><b>Stats</b>: each player's History tab (every league), and for the NHL the box scores: goals, assists, ice time, shots, blocks, ratings, and the shot charts' locations.</li>
      <li><b>Stats maths</b>: per-60 rates, shooting %, points per game and percentiles of those against the same position, plus the shot heat maps. Nothing is weighted or modelled.</li>
      <li><b>League</b>: standings (the game's own when the crawl read them, otherwise added up from the box scores), results, playoffs, contracts, the salary cap, trades, draft picks, the game's draft rankings and awards.</li>
    </ul><p class="small muted">Snapshot ${fmtDate(D.dates.at(-1))}, ${D.dates.length} snapshots since ${fmtDate(D.dates[0])}.</p></div>
    ${audit.length ? `<div class="panel"><h2>Data checks</h2><p class="sub">Duplicates removed and other checks, from the last build.</p>
      <div class="tablewrap"><table class="rank"><thead><tr><th>Check</th><th>Detail</th><th class="num">Removed</th></tr></thead><tbody>
      ${audit.map(a => `<tr><td>${esc(a.check)}</td><td class="small">${esc(a.detail)}</td><td class="num">${a.removed ?? ""}</td></tr>`).join("")}</tbody></table></div></div>` : ""}</div>`;
}

// ---------------------------------------------------------------- sweeper: no column or box that names a model number
/* Table columns, number boxes and sections whose title is one of these are removed wherever they appear (pages drawn
   later, tabs, box scores loaded on demand), so a model number can't slip through a page this file didn't rewrite. */
const PURE_COLS = /^(est\.? ?(ca|pa)|ca|pa|proj\.? peak|peak|peak age|growth left|war|war\/82|nhl war|war at peak|exp\.? war|exp\.? war this season|worth|surplus|surplus over the deal|value|value per season|war per \$1m|slot avg|above slot|beat slot|per pick|impact|nhl impact|off|def|fin|play|offence %|defence %|ixg|ixg\/60|xg|xga|xgf|g−xg|g-xg|gsax|gsax\/100|gsax\/60|top war|finishing|def\. war|gar|ours|our rank|tier|scout tier|role|game score|gs|ca in \d+ yrs?|fut)$/i;
const PURE_BOX = /\b(WAR|xG|GSAx|est\. ?CA|est\. ?PA|potential|projected|projection|peak|surplus|impact|scout|underrated|game score)\b/i;
function pureSweep(root) {
  // the Players page subtitle ends with a pointer to the models
  root.querySelectorAll("p.lede").forEach(el => {
    const h = el.innerHTML.replace(/ · est\. CA and PA come from visible attributes only \(see <a href="#\/about">How it works<\/a>\)/, "");
    if (h !== el.innerHTML) el.innerHTML = h;   // only when it changes: every write wakes the observer
  });
  root.querySelectorAll("table").forEach(tbl => {
    const head = tbl.tHead?.rows;
    if (!head?.length || [...head].some(r => [...r.cells].some(c => c.colSpan > 1))) return;
    const cells = [...head[head.length - 1].cells], n = cells.length;
    const bad = cells.map((c, i) => (PURE_COLS.test(c.textContent.replace(/[↓↑*]/g, "").trim()) ? i : -1)).filter(i => i >= 0);
    if (!bad.length) return;
    [...tbl.rows].forEach(r => { if (r.cells.length === n) bad.slice().reverse().forEach(i => r.cells[i]?.remove()); });
    tbl.querySelectorAll("col").forEach((c, i) => { if (bad.includes(i)) c.remove(); });
  });
  root.querySelectorAll(".kn, .stat-cards > div, .card-box, .panel, .ovblock, .spot, details").forEach(el => {
    const t = el.querySelector(":scope > .lab, :scope > span, :scope > h2, :scope > h3, :scope > summary")?.textContent || "";
    if (PURE_BOX.test(t)) el.remove();
  });
  root.querySelectorAll(".lhead span, p.sub, p.lede, p.small, .note").forEach(el => {
    if (PURE_BOX.test(el.textContent) && !el.querySelector("table")) el.remove();
  });
}
if (PURE) {
  let queued = false;
  // pages drawn by a click run the sweep at once too (the observer below catches what loads later)
  ["renderRankings", "renderTeams", "renderPlayer", "renderPlayoffs", "renderLeague", "renderTrades", "renderExpiring", "renderHof",
   "renderHofRanking", "renderRank", "drawGameLog", "drawCareer"].forEach(n => {
    const base = window[n];
    if (typeof base === "function") window[n] = function (...a) { const r = base.apply(this, a); pureSweep(view); return r; };
  });
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; pureSweep(view); });
  }).observe(view, { childList: true, subtree: true });
  const navGone = ["value", "h2h", "trade"];
  document.querySelectorAll(".top nav a").forEach(a => {
    if (navGone.includes(a.dataset.nav) || /underrated|scores/.test(a.getAttribute("href") || "")) a.remove();
  });
}

// ---------------------------------------------------------------- trades, GMs, Hall of Fame
if (PURE) {
  for (let i = TRADE_SORTS.length - 1; i >= 0; i--) if (["big", "gap"].includes(TRADE_SORTS[i][0])) TRADE_SORTS.splice(i, 1);
  const pureAssetLine = p => { const c = p.lg === "NHL" ? contractInfo(p) : null; return `${esc(p.pos)} · ${p.age}${c?.cur?.sal ? ` · ${money(c.cur.sal)}` : ""}`; };
  tradeAsset = a => {
    if (a[0] === "pick") { const from = clubOfAbbr(a[5]); return `<li class="ta-pick">${tlink(from, logo(from, 18))} <span>${esc(a[1])}</span></li>`; }
    const p = a[0] === "player" ? tradePlayer(a) : null;
    return p ? `<li><a href="${route(p.k)}"><b>${esc(p.n)}</b></a> <small class="muted">${pureAssetLine(p)}</small></li>` : `<li>${esc(a[1])}</li>`;
  };
  treeAsset = (a, end = "") => {
    if (a[0] === "pick") return `<div class="tt-card tt-asset">${logo(clubOfAbbr(a[5]), 24)}<div><b>${esc(a[1])}</b></div>${end}</div>`;
    const p = a[0] === "player" ? tradePlayer(a) : null;
    if (!p) return `<div class="tt-card tt-asset"><span class="tt-pos">?</span><div><b>${esc(a[1])}</b></div>${end}</div>`;
    return `<div class="tt-card tt-asset"><span class="tt-pos">${esc((p.pos || "").split("/")[0])}</span>${clubOf(p) ? logo(clubOf(p), 24) : ""}<div><a href="${route(p.k)}"><b>${esc(p.n)}</b></a>
      <small class="muted">${pureAssetLine(p)}</small></div>${end}</div>`;
  };
  ocAsset = (team, a, end) => {
    if (a[0] === "pick") return `<div class="oc-a oc-pick"><div class="oc-n">${ocLogo(clubOfAbbr(a[5]), 22)}<b>${esc(ocPickName(a[1]))}</b></div>${end ? `<span class="oc-out">${treeEnd(team, a)}</span>` : ""}</div>`;
    const p = a[0] === "player" ? tradePlayer(a) : null;
    if (!p) return `<div class="oc-a"><div class="oc-n"><b>${esc(a[1])}</b></div></div>`;
    return `<div class="oc-a"><div class="oc-n">${ocLogo(clubOf(p), 22)}<b>${esc(p.n)}</b></div><small>${pureAssetLine(p)}</small>${end ? `<span class="oc-out">${treeEnd(team, a)}</span>` : ""}</div>`;
  };
  tradeCard = t => {
    const more = tradeBranches(t);
    const side = x => `<div class="tside"><h3>${tname(clubOfAbbr(x[0]), 22)} <small class="muted">receives</small></h3>
      <ul class="plain tassets">${x[2].map(tradeAsset).join("") || `<li class="muted">Nothing listed</li>`}</ul></div>`;
    return `<article class="trade"><header><time datetime="${t.d}">${fmtDate(t.d)}</time>${t.g?.length ? `<span class="small muted">GMs: ${t.g.map(esc).join(" · ")}</span>` : ""}</header>
      <div class="tsides">${t.s.map(side).join("")}</div>
      <details class="ttree-box" data-t="${tradesOldest().indexOf(t)}"><summary>Trade tree${more ? ` <span class="chip">${more} went on to another trade</span>` : ""}</summary></details></article>`;
  };

  // GMs: who ran each club and how it went, no composite score
  const gmRows = () => {
    const by = {};
    for (const t of D.gms.tenures) { const s = (by[t.gm] ||= { gm: t.gm, tenures: [], rows: [], days: 0 }); s.tenures.push(t); s.days += gmDays(t); }
    for (const r of D.gms.results) by[r.gm]?.rows.push(r);
    return Object.values(by).map(s => {
      const sum = k => s.rows.reduce((n, r) => n + (r[k] || 0), 0);
      const gp = sum("gp"), w = sum("w"), l = sum("l"), otl = sum("otl");
      return { ...s, club: s.tenures.find(t => !t.to)?.club || s.tenures.at(-1).club, seasons: s.days / 365.25, gp, w, l, otl, gf: sum("gf"), ga: sum("ga"),
               pct: gp ? (2 * w + otl) / (2 * gp) : null, po: s.rows.filter(r => r.po).length, cups: s.rows.filter(r => r.cup).length,
               trades: (D.trades || []).filter(t => (t.g || []).includes(s.gm)).length };
    });
  };
  renderGms = () => {
    markNav("gms");
    if (!D.gms) { view.innerHTML = `<div class="wrap page"><h1>GMs</h1><p class="muted">No GM list yet.</p></div>`; return; }
    const rows = gmRows().sort((a, b) => (b.pct ?? -1) - (a.pct ?? -1));
    view.innerHTML = `<section class="band"><div class="wrap"><h1>GMs</h1><p class="lede">Every GM with the club he runs and his record while in charge, from the game's GM Status screen and the box scores.</p></div></section>
      <div class="wrap page"><section class="card-box flush"><div class="tablewrap"><table class="rank sortable gm-table"><thead><tr><th class="pcol">GM</th><th>Club</th><th class="num">Seasons</th>
        <th class="num">GP</th><th class="num">W–L–OTL</th><th class="num" aria-sort="descending">Pts%</th><th class="num">GF–GA</th><th class="num">Playoffs</th><th class="num">Cups</th><th class="num">Trades</th></tr></thead><tbody>
        ${rows.map(s => `<tr class="link" data-gm="${esc(s.gm)}"><th scope="row" class="pcol"><a href="${gmRoute(s.gm)}"><b>${esc(s.gm)}</b></a></th>
          <td>${tlink(s.club, `${logo(s.club, 18)} ${esc(s.club)}`)}${s.tenures.length > 1 ? ` <small class="muted">+${s.tenures.length - 1}</small>` : ""}</td><td class="num">${fmt(s.seasons, 1)}</td>
          <td class="num">${s.gp}</td><td class="num">${s.w}–${s.l}–${s.otl}</td><td class="num"><b>${s.pct == null ? "–" : s.pct.toFixed(3).replace(/^0/, "")}</b></td><td class="num">${s.gf}–${s.ga}</td>
          <td class="num">${s.po}</td><td class="num">${s.cups}</td><td class="num">${s.trades}</td></tr>`).join("")}</tbody></table></div></section>
        <p class="small muted">Read off the game's GM Status screen each time the crawler logs in (latest ${fmtDate(D.gms.asOf)}); a club's first GM seen is assumed to have run it since ${fmtDate(D.gms.first)}.
          Records count the months in charge with box scores.</p></div>`;
    makeSortable();
    view.querySelectorAll("tr.link[data-gm]").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) location.hash = gmRoute(tr.dataset.gm); });
  };
  renderGm = gm => {
    markNav("gms");
    if (!D.gms) return renderGms();
    const s = gmRows().find(x => x.gm === gm);
    if (!s) { view.innerHTML = `<div class="wrap page"><p class="warn">No GM called ${esc(gm)}. <a href="#/gms">All GMs</a></p></div>`; return; }
    const runs = s.tenures.map(t => `<tr><th scope="row">${tlink(t.club, `${logo(t.club, 18)} ${esc(t.club)}`)}</th><td>${fmtDate(t.from)}${t.bd ? " *" : ""}</td><td>${t.to ? fmtDate(t.to) : "now"}</td></tr>`).join("");
    const seasons = s.rows.map(r => `<tr><th scope="row">${seasonLabel(r.season)}</th><td>${tlink(r.club, `${logo(r.club, 18)} ${esc(r.club)}`)}</td><td class="num">${r.gp}</td><td class="num">${r.w}–${r.l}–${r.otl}</td>
      <td class="num">${r.gp ? ((2 * r.w + r.otl) / (2 * r.gp)).toFixed(3).replace(/^0/, "") : "–"}</td><td class="num">${r.gf}–${r.ga}</td><td>${r.cup ? "Won the Cup" : r.fin ? "Lost the final" : r.po ? (D.teamHist?.rounds?.[r.po - 1] || `Round ${r.po}`) : "–"}</td></tr>`).join("");
    const trades = (D.trades || []).filter(t => (t.g || []).includes(gm)).sort((a, b) => b.d.localeCompare(a.d)).map(t => {
      const i = t.g.indexOf(gm), mine = t.s[i], other = t.s[1 - i], oc = other ? clubOfAbbr(other[0]) : null;
      return `<tr><td>${fmtDate(t.d)}</td><td>${oc ? tlink(oc, `${logo(oc, 18)} ${esc(oc)}`) : "–"}</td><td>${esc(mine?.[2].map(a => a[1]).join(", ") || "Nothing listed")}</td><td>${esc(other?.[2].map(a => a[1]).join(", ") || "Nothing listed")}</td></tr>`;
    }).join("");
    const box = (title, head, rows, empty) => `<section class="card-box flush"><h2 class="box-h">${esc(title)}</h2>${rows ? `<div class="tablewrap"><table class="rank sortable">${head}<tbody>${rows}</tbody></table></div>` : `<p class="muted pad">${empty}</p>`}</section>`;
    view.innerHTML = `<section class="band"><div class="wrap"><div class="team-head">${logo(s.club, 56)}<div class="grow"><h1>${esc(s.gm)}</h1>
        <p class="lede">GM of ${tlink(s.club)} · ${fmt(s.seasons, 1)} seasons in charge · ${s.w}–${s.l}–${s.otl}</p></div><span class="inline team-nav"><a href="#/gms">All GMs</a></span></div></div></section>
      <div class="wrap page">
        ${box("Clubs run", `<thead><tr><th>Club</th><th>From</th><th>To</th></tr></thead>`, runs, "")}
        ${box("Season by season", `<thead><tr><th>Season</th><th>Club</th><th class="num">GP</th><th class="num">Record</th><th class="num">Pts%</th><th class="num">GF–GA</th><th>Playoffs</th></tr></thead>`, seasons, "No games in charge yet.")}
        ${box("Trades", `<thead><tr><th>Date</th><th>With</th><th>Received</th><th>Sent</th></tr></thead>`, trades, "No trades in charge.")}
      </div>`;
    makeSortable();
  };

  // Hall of Fame: honours and real totals instead of WAR
  for (let i = HOF_TITLES.length - 1; i >= 0; i--) if (["war", "swar"].includes(HOF_TITLES[i][0])) HOF_TITLES.splice(i, 1);
  HOF_SCORE[2] = "3 per NHL trophy + 2 per Stanley Cup + 1 per All-Star team + 1 per 100 NHL points (skaters) or 40 wins (goalies)";
  HOF_SCORE[3] = r => 3 * r.trophies.length + 2 * r.cups.length + r.allstar.length + (r.x.grp === "G" ? r.w / 40 : r.pts / 100);
  const baseHof = hofBody;
  hofBody = club => baseHof(club)
    .replace(/Hall of Fame score: WAR [^.]*\./, `Hall of Fame score: ${HOF_SCORE[2]}${club ? " (with the club)" : ""}.`)
    .replace(/ · [\d.−-]+ WAR/g, "");
}
