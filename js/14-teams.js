"use strict";

const TEAM_TABS = ["roster", "players", "stats", "results", "contracts", "trades", "prospects", "drafts", "history", "hof"];
const tabHash = tab => (tab === "roster" ? "" : "/" + tab);

function officialGp(club) { return D.teamGp?.[SEASON]?.[club] || 0; }
function gpCell(club, r) {
  const off = officialGp(club);
  return off > r.gp ? `<span title="${r.gp} box scores captured; the club has played at least ${off} games: the record and points cover only the captured games">${r.gp}<span class="muted"> / ${off}</span></span>` : String(r.gp);
}

function officialStandings() {
  const st = D.standings;
  if (!st || SEASON !== SEASONS.at(-1) || !st.stages["Overall Standings"]) return null;
  const rec = {}, divOf = {};
  for (const [stage, rows] of Object.entries(st.stages)) {
    const div = /^NHL (.+) Division$/.exec(stage)?.[1], conf = /^(\w+) Conference$/.exec(stage)?.[1];
    rows.forEach(r => {
      const o = rec[r.t] ||= { team: r.t };
      if (div) { divOf[r.t] = div; o.dplace = r.rk; }
      if (conf) o.cplace = r.rk;
      if (stage === "Overall Standings") Object.assign(o, r);
    });
  }
  return Object.keys(rec).length >= 30 ? { date: st.date, rec, divOf } : null;
}
function playoffPicture(clubs, tbl, players) {
  const off = officialStandings();
  const recOf = c => {
    const o = off?.rec[c];
    if (!o) return tbl?.teams?.[abbrOf(c)];
    return { gp: o.gp, w: o.w + o.osw, l: o.l, otl: o.osl, pts: o.pts, gf: o.gf, ga: o.ga, last10: String(o.l10).split("-"),
      place: o.dplace ?? o.rk, cplace: o.cplace, stats: { ...(tbl?.teams?.[abbrOf(c)]?.stats || {}),
        pts_pct: [o.pct], pp_pct: [parseFloat(o.ppp) / 100], pk_pct: [parseFloat(o.pkp) / 100] } };
  };
  const byPlace = (a, b) => (recOf(a)?.place ?? 1e9) - (recOf(b)?.place ?? 1e9) || a.localeCompare(b);
  const byConf = (a, b) => (recOf(a)?.cplace ?? recOf(a)?.place ?? 1e9) - (recOf(b)?.cplace ?? recOf(b)?.place ?? 1e9) || a.localeCompare(b);
  const divClubs = d => off ? clubs.filter(c => off.divOf[c] === d) : NHL_DIVISIONS[d].filter(c => clubs.includes(c));
  const hasXg = false;
  const stat = (r, k) => statFmt(k, r?.stats?.[k]?.[0]);
  const row = (c, pos) => {
    const r = recOf(c), ps = players.filter(p => clubOf(p) === c);
    const best = null, pay = ps.reduce((s, p) => s + salaryNum(p.sal), 0);
    const gd = r ? r.gf - r.ga : null, n = v => r ? v : dash;
    return `<tr class="tlink${c === MY_TEAM ? " hl" : ""}" data-club="${esc(c)}"><td class="num nowrap">${r && pos ? rankLink(teamRankHref("pts", c), pos) : dash}</td>
      <th scope="row" class="pcol">${tname(c, 20)}</th><td class="num">${r ? gpCell(c, r) : dash}</td><td class="num">${n(r?.w)}</td><td class="num">${n(r?.l)}</td><td class="num">${n(r?.otl)}</td>
      <td class="num"><b>${n(r?.pts)}</b></td><td class="num">${stat(r, "pts_pct")}</td><td class="num nowrap">${r ? r.last10.join("–") : dash}</td>
      <td class="num">${n(r?.gf)}</td><td class="num">${n(r?.ga)}</td><td class="num ${gd > 0 ? "up" : gd < 0 ? "down" : ""}">${r ? signed(gd, 0) : dash}</td>
      <td class="num">${stat(r, "pp_pct")}</td><td class="num">${stat(r, "pk_pct")}</td>${""}
      <td class="num">${pay ? money(pay) : dash}</td>${""}</tr>`;
  };
  const cols = (hasXg ? 17 : 16) - 1;
  const section = (title, rows, cls = "") => `<tbody class="${cls}"><tr class="po-sec"><th scope="rowgroup" colspan="${cols}"><span>${title}</span></th></tr>${rows.join("")}</tbody>`;
  const table = (conf, divs) => {
    const members = Object.fromEntries(divs.map(d => [d, divClubs(d).sort(byPlace)]));
    let body;
    if (divs.every(d => members[d].every(recOf))) {
      const order = divs.slice().sort((a, b) => byPlace(members[a][0], members[b][0]));
      const tops = order.map(d => members[d].slice(0, 3));
      const rest = order.flatMap(d => members[d].slice(3)).sort(off ? byConf : byPlace);
      body = order.map((d, i) => section(d, tops[i].map((c, j) => row(c, `${d[0]}${j + 1}`)))).join("")
        + section("Wild card", rest.slice(0, 2).map((c, j) => row(c, `WC${j + 1}`)))
        + section("Outside a playoff spot", rest.slice(2).map((c, j) => row(c, `${j + 9}`)), "po-out");
    } else {
      body = divs.map(d => section(d, members[d].slice().sort((a, b) => a.localeCompare(b)).map(c => row(c, "")))).join("");
    }
    return `<section class="card-box flush" aria-label="${conf} Conference"><h2 class="box-h">${conf} Conference</h2><div class="tablewrap"><table class="rank tp po-table"><thead><tr>
      <th class="num" title="Playoff position: division place, wild card, or conference place">Pos</th><th class="pcol">Team</th><th class="num" title="Games played">GP</th><th class="num">W</th><th class="num">L</th><th class="num" title="Overtime and shootout losses">OTL</th>
      <th class="num on">Pts</th><th class="num" title="Share of available points">Pts%</th><th class="num" title="Last 10 games: W–L–OT wins–OT losses (W–L–OTL from the box scores when the game's table is not used)">L10</th><th class="num" title="Goals for">GF</th><th class="num" title="Goals against">GA</th><th class="num" title="Goal difference">Diff</th>
      <th class="num" title="Power play">PP%</th><th class="num" title="Penalty kill">PK%</th>${""}<th class="num" title="Listed payroll">Payroll</th>${""}</tr></thead>${body}</table></div></section>`;
  };
  return Object.entries(NHL_CONFERENCES).map(([conf, divs]) => table(conf, divs)).join("")
    + (off ? `<p class="small muted">The game's own standings, read ${esc(off.date)}: record, points (this save scores 3 / 2 / 1 / 0), divisions and conference order are EHM's. The wild-card positions follow its conference ranking; GF, GA, PP% and PK% are the game's too. Payroll and best player are from the latest snapshot.</p>` : "")
    + (off ? "" : `<p class="small muted">${SEASON === SEASONS.at(-1) ? "If the season ended today, by" : "By"} NHL rules: top 3 of each division plus 2 wild cards, ordered by points, then goal difference. An estimate: divisions are the real-life NHL ones, points come from this save's box scores (GP shown as "captured / at least played" where some box scores were never captured, and the record is then partial), and EHM's own qualifiers can differ. Payroll and best player are from the latest snapshot in every season.</p>`);
}
function renderTeams(club, tab = "roster", arg, arg2) {
  markNav("teams");
  const players = D.players.map(inSeason);
  if (!club) {
    const clubs = nhlClubs(), tbl = teamTable(SEASON);
    const others = {};
    players.forEach(p => { const c = clubOf(p), lg = c && clubLeagueOf(c); if (c && !NHL_TEAMS[c] && !hasLeague(lg)) (others[lg || p.lg || "No league"] ||= new Set()).add(c); });
    view.innerHTML = `<section class="band"><div class="wrap">${leagueNames().length ? leagueStrip("NHL") : ""}<h1>Teams</h1>
      <p class="lede">Every NHL club by playoff position${SEASON ? ` (${seasonLabel(SEASON)})` : ""}, with its stats, listed payroll and best player.${leagueNames().length ? ` The tabs above open the other leagues (${leagueNames().join(", ")});` : ""} other clubs are below.</p></div></section>
      <div class="wrap page">
        <div class="cardbar"><h2 class="flat">${SEASON ? `${seasonLabel(SEASON)} standings` : "Standings"}</h2>${seasonSelect("teams-season", SEASONS.filter(teamTable), SEASON)}</div>
        ${playoffPicture(clubs, tbl, players)}
        ${Object.entries(others).sort((a, b) => b[1].size - a[1].size).map(([lg, cs]) => `<details class="card-box"><summary><b>${esc(lg)}</b> <span class="muted">${cs.size} clubs</span></summary>
          <div class="club-list">${[...cs].sort((a, b) => a.localeCompare(b)).map(c => tname(c)).join("")}</div></details>`).join("")}
      </div>`;
    view.querySelectorAll("tr.tlink[data-club]").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) location.hash = teamRoute(tr.dataset.club); });
    view.querySelector("#teams-season")?.addEventListener("change", e => { SEASON = e.target.value; renderTeams(null); });
    return;
  }
  const ps = players.filter(p => clubOf(p) === club);
  if (!ps.length) { view.innerHTML = `<div class="wrap page"><div class="panel">Unknown club. <a href="#/teams">All teams</a></div></div>`; return; }
  if (!NHL_TEAMS[club] && hasLeague(clubLeagueOf(club))) return renderLeagueTeam(club, clubLeagueOf(club), ps, tab, arg);
  const abbr = abbrOf(club), statSeasons = SEASONS.filter(s => teamTable(s)?.teams?.[abbr]);
  if (tab === "stats" && !statSeasons.length) tab = "roster";
  const hasDrafts = !!NHL_TEAMS[club] && draftValues().picks.some(x => x.club === club);
  if (["players", "results"].includes(tab) && !(NHL_TEAMS[club] && SEASONS.some(s => D.teamPlayers?.[s]?.[abbrOf(club)]))) tab = "roster";
  if ((["prospects", "history", "hof", "contracts", "trades"].includes(tab) && !NHL_TEAMS[club]) || (tab === "drafts" && !hasDrafts)) tab = "roster";
  const tbl = teamTable(SEASON), rec = tbl?.teams?.[abbr];
  const lgs = [...new Set(ps.map(p => p.lg).filter(Boolean))];
  const pay = ps.reduce((s, p) => s + salaryNum(p.sal), 0);
  const isNhl = !!NHL_TEAMS[club], hasPlayers = isNhl && !!abbr && SEASONS.some(s => D.teamPlayers?.[s]?.[abbr]);
  view.innerHTML = `
  <section class="band"><div class="wrap">
    <div class="team-head">${logo(club, 56)}
      <div class="grow"><h1>${esc(club)}</h1><p class="lede">${[lgs.map(lgLink).join(", ") || "No league",
        rec ? `${rec.w}–${rec.l}–${rec.otl}, ${rec.pts} points (${rankLink(teamRankHref("pts", club), ordinal(rec.place))}) in ${seasonLabel(SEASON)}` : "", isNhl && D.gms ? `GM ${gmLink(gmOf(club))}${D.gms.tenures.some(t => t.club === club && t.to) ? ` (before: ${D.gms.tenures.filter(t => t.club === club && t.to).map(t => gmLink(t.gm)).join(", ")})` : ""}` : "",
        `${ps.length} players`, `Snapshot ${fmtDate(D.dates.at(-1))}`].filter(Boolean).join(" · ")}</p></div>
      <span class="inline team-nav">${isNhl ? `<label class="inline">Team <select id="team-sel">${nhlClubs().map(c => `<option ${c === club ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>` : ""}<a href="#/teams">All teams</a></span>
    </div>
    ${tabBar("Team sections", [["roster", "Roster"], ...(hasPlayers ? [["players", "Player stats"]] : []), ...(statSeasons.length ? [["stats", "Team stats"]] : []),
      ...(hasPlayers ? [["results", "Results"]] : []), ...(isNhl ? [["contracts", "Contracts"], ...(D.trades ? [["trades", "Trades"]] : []), ["prospects", "Prospects & picks"]] : []), ...(hasDrafts ? [["drafts", "Draft history"]] : []),
      ...(isNhl ? [["history", "History"], ["hof", "Hall of Fame"]] : [])], tab)}
  </div></section>
  <div class="wrap page">${tab === "stats" ? teamStatsTab(club, abbr, statSeasons) : tab === "contracts" ? contractsTab(club, ps, arg) : tab === "trades" ? teamTradesTab() : tab === "prospects" ? prospectsTab(club) : tab === "drafts" ? teamDraftsTab(club) : tab === "players" ? teamPlayersTab(club, arg, arg2) : tab === "results" ? teamResultsTab(club, arg, arg2) : tab === "history" ? (nhlPeople(), teamHistoryTab(club)) : tab === "hof" ? (nhlPeople(), hallOfFameTab(club)) : rosterTab(club, ps, pay)}</div>`;
  view.querySelector("#team-sel")?.addEventListener("change", e => (location.hash = teamRoute(e.target.value) + tabHash(tab)));
  view.querySelectorAll(".ptabs [data-tab]").forEach(b => b.onclick = () => (location.hash = teamRoute(club) + tabHash(b.dataset.tab)));
  view.querySelector("#t-season")?.addEventListener("change", e => { SEASON = e.target.value; renderTeams(club, tab); });
  if (tab === "roster") bindRoster(club, ps);
  else if (tab === "players") bindTeamPlayers(club, arg, arg2);
  else if (tab === "results") view.querySelector("#rs-season")?.addEventListener("change", e => (location.hash = `${teamRoute(club)}/results/${e.target.value}`));
  if (["prospects", "drafts"].includes(tab) || tab === "contracts") makeSortable();
  if (tab === "trades") wireTeamTrades(club);
  if (!["roster", "players", "results"].includes(tab)) view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
}

const ROSTER_COLS = [
  ["n", "Player", p => p.n, false, p => { const sub = [p.lg && p.lg !== "NHL" ? p.lg : ""].filter(Boolean).join(" · ");
    return `<th scope="row" class="pcol"><a class="pcell" href="${route(p.k)}"><span><b>${esc(p.n)}</b>${sub ? `<small title="${esc(sub)}">${esc(sub)}</small>` : ""}</span></a></th>`; }, 230],
  ["no", "No", p => (p.no === "" || p.no == null ? null : +p.no), true, p => `<td class="num">${esc(p.no || "")}</td>`, 52],
  ["pos", "Pos", p => p.pos, false, p => `<td>${esc(p.pos)}${p.pgrp ? `<br><span class="small muted" title="Listed ${esc(p.pos)}, but his box scores this season show him in the ${esc(p.pgrp)} lineup">plays ${p.pgrp} (${p.gpp?.[p.pgrp] ?? "?"} GP)</span>` : ""}</td>`, 90],
  ["age", "Age", p => p.age, true, p => `<td class="num">${p.age}</td>`, 52],
  ["lg", "League", p => p.lg || "", false, p => `<td>${esc(p.lg || "")}</td>`, 72],
  ["sal", "Salary", p => (p.sal ? salaryNum(p.sal) / 1e6 : null), true, p => `<td class="num">${esc(p.sal || "")}</td>`, 126],
  ["exp", "Expires", p => contractEnds(p), false, p => `<td class="nowrap">${esc(contractEnds(p))}${contractInfo(p).next ? ` <span class="chip" title="Extension signed through ${esc(seasonName(contractInfo(p).next.e))}">ext</span>` : ""}</td>`, 104],
];

const RF = { sort: "ca", dir: -1, f: { F: {}, D: {}, G: {} }, open: false, more: false };
const ROSTER_MORE = ["no", "lg", "role"];
const rosterCols = () => RF.more ? ROSTER_COLS : ROSTER_COLS.filter(c => !ROSTER_MORE.includes(c[0]));
const rosterFilterCount = () => Object.values(RF.f).reduce((n, g) => n + Object.values(g).filter(Boolean).length, 0);
const playsGrp = p => p.pgrp || p.grp;
function rosterRows(ps, g) {
  const [, , get, num] = ROSTER_COLS.find(c => c[0] === RF.sort);
  return ps.filter(p => playsGrp(p) === g && ROSTER_COLS.every(([k, , v, n]) => matchFilter(v(p), RF.f[g][k] || "", n)))
    .sort((a, b) => {
      const x = get(a), y = get(b);
      if (x == null || x === "") return 1;
      if (y == null || y === "") return -1;
      return (num ? x - y : String(x).localeCompare(String(y))) * RF.dir;
    });
}
const rosterBody = rows => rows.map(p => `<tr class="link" data-k="${esc(p.k)}">${rosterCols().map(c => c[4](p)).join("")}</tr>`).join("")
  || `<tr><td colspan="${rosterCols().length}" class="muted small">No players match the filters.</td></tr>`;

const CAP_SEASONS = 5;

const onIR = p => /injured reserve/i.test(p.ct?.cs || "");
const capHitIn = (p, s) => (s === seasonEndNow() && onIR(p)) ? 0 : (dealIn(p, s)?.sal || 0);
function capRows(ps, now) {
  const seasons = Array.from({ length: CAP_SEASONS }, (_, i) => now + i);
  return { seasons, cell: p => seasons.map(s => {
    const d = dealIn(p, s), last = dealsOf(p).at(-1);
    if (d && s === now && onIR(p) && d.sal) return `<td class="num capir" title="On injured reserve: counts $0 against the cap while he's out"><s class="muted">${capFull(d.sal)}</s> $0 <span class="capsigned">IR</span></td>`;
    if (d) return `<td class="num ${d === contractInfo(p).next ? "capext" : ""}">${d.sal ? capFull(d.sal) : `<span class="capsigned">Signed</span>`}</td>`;
    if (last?.e === s - 1) { const fa = faStatus(p); return `<td class="capfa"><span title="${esc(fa?.full || "")}">${fa?.t || ""}</span></td>`; }
    return `<td></td>`;
  }).join("") };
}
function capGroup(title, list, now, cap, id) {
  if (!list.length) return "";
  const { seasons, cell } = capRows(list, now);
  const hit = p => dealIn(p, now)?.sal || 0;
  const rows = [...list].sort((a, b) => hit(b) - hit(a));
  const total = s => rows.reduce((t, p) => t + capHitIn(p, s), 0);
  const unknown = s => rows.filter(p => { const d = dealIn(p, s); return d && !d.sal; }).length;
  const now$ = total(now);
  return `<section class="card-box flush capgroup" aria-labelledby="${id}"><h2 class="box-h" id="${id}">${title} <span class="muted">${rows.length}</span>
      <span class="capsum">${capFull(now$)}${cap ? ` · ${(now$ / cap * 100).toFixed(1)}% of cap` : ""}</span></h2>
    <div class="tablewrap"><table class="rank captable"><thead><tr><th class="pcol">Player</th><th class="num">Age</th><th>Pos</th>${seasons.map(s => `<th class="num">${seasonName(s)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map(p => `<tr class="link" data-k="${esc(p.k)}"><th scope="row" class="pcol"><a class="pcell" href="${route(p.k)}"><span><b>${esc(p.n)}</b>${p.lg !== "NHL" && p.lg ? `<small>${esc(p.lg)}</small>` : ""}</span></a></th><td class="num">${p.age}</td><td>${esc(p.pos)}</td>${cell(p)}</tr>`).join("")}</tbody>
      <tfoot><tr><th scope="row" class="pcol">Totals</th><td></td><td></td>${seasons.map(s => `<td class="num"><b>${total(s) ? capFull(total(s)) : ""}</b>${unknown(s) ? `<small class="muted"> + ${unknown(s)} not known</small>` : ""}</td>`).join("")}</tr></tfoot></table></div></section>`;
}

function capPicks(club) {
  if (!D.picks) return "";
  const rowsAll = D.picks.rows, years = [...new Set(rowsAll.map(x => x[1]))].sort();
  const mine = rowsAll.filter(x => draftClub(x[5]) === club);
  const ord = r => ["1st", "2nd", "3rd"][r - 1] || r + "th";
  const tradeLink = (x, from) => { const h = pickTradeHref(x[1], x[2], from); return h ? ` · <a href="${h}">the trade →</a>` : ""; };
  const pickLine = x => { const from = draftClub(x[4]) || x[4], own = from === club;
    return `<li>${logo(from, 22)}<span><b>${x[1]} ${ord(x[2])} round</b>${x[3] ? ` · #${(x[2] - 1) * 32 + x[3]} overall` : ""}<br><small class="muted">${own ? "Own pick" : `From ${esc(from)}${tradeLink(x, from)}`}${""}</small></span></li>`; };
  const goneLine = x => { const to = draftClub(x[5]) || x[5];
    return `<li class="gone">${logo(to, 22)}<span><b>Own ${x[1]} ${ord(x[2])}</b><br><small class="muted">Traded to ${esc(to)}${tradeLink(x, club)}</small></span></li>`; };
  const cell = (y, r) => {
    const own = mine.filter(x => x[1] === y && x[2] === r);
    const gone = rowsAll.filter(x => x[1] === y && x[2] === r && draftClub(x[4]) === club && draftClub(x[5]) !== club);
    if (!own.length && !gone.length) return `<td class="num muted">0</td>`;
    const label = `${y} round ${r}: ${own.length} pick${own.length === 1 ? "" : "s"}${gone.length ? `, own pick traded` : ""}`;
    return `<td class="num pickcell"><button type="button" class="pickpop-btn${own.some(x => draftClub(x[4]) !== club) ? " extra" : ""}${gone.length && !own.length ? " none" : ""}" aria-label="${esc(label)}">${own.length}</button>
      <div class="pickpop" role="tooltip"><h4>${y} · ${ord(r)} round</h4><ul>${own.map(pickLine).join("")}${gone.map(goneLine).join("")}</ul></div></td>`;
  };
  const rows = years.map(y => { const own = mine.filter(x => x[1] === y);
    return `<tr><th scope="row">${y}</th>${[1, 2, 3, 4, 5, 6, 7].map(r => cell(y, r)).join("")}${""}</tr>`; }).join("");
  return `<section class="card-box flush" aria-labelledby="cap-picks"><h2 class="box-h" id="cap-picks">Draft pick summary <a class="small" href="${teamRoute(club)}/prospects">Prospects &amp; picks →</a></h2>
    <div class="tablewrap picks-wrap"><table class="rank capicks"><thead><tr><th>Draft</th>${[1, 2, 3, 4, 5, 6, 7].map(r => `<th class="num">R${r}</th>`).join("")}${""}</tr></thead><tbody>${rows}</tbody></table></div>
    <p class="small muted box-foot">Hover or tap a number for the picks behind it, and follow a traded pick to its trade. <span class="pickkey extra">Bold</span> = includes another team's pick; <span class="pickkey none">struck</span> = own pick traded away.</p></section>`;
}

function capTable(club, ps) {
  const now = seasonEndNow(), signed = ps.filter(p => dealsOf(p).length), cap = D.cap?.cap;
  const roster = signed.filter(p => p.lg === "NHL" && dealIn(p, now)), rest = signed.filter(p => !roster.includes(p));
  const hit = roster.reduce((t, p) => t + capHitIn(p, now), 0);
  const ir = roster.filter(p => onIR(p) && dealIn(p, now)?.sal);
  const game = D.cap?.club === club && D.cap.avg ? D.cap : null;
  const E = null;
  const avg = game ? game.avg : E ? E.avg : null;
  const expiring = roster.filter(p => { const i = contractInfo(p); return i.cur?.e === now && !i.next; }).length;
  const ext = signed.filter(p => contractInfo(p).next).length;
  const counted = avg ?? hit, pct = cap ? counted / cap * 100 : 0;
  const grp = (list, g) => list.filter(p => p.grp === g);
  const est = signed.some(p => faStatus(p)?.t.endsWith("*"));
  const anyGame = signed.some(p => p.ct?.read);
  const money = (v, cls) => `<b class="${cls || ""}" title="${v < 0 ? "−" : ""}${capFull(Math.abs(v))}">${v < 0 ? "−" : ""}$${(Math.abs(v) / 1e6).toFixed(2)}M</b>`;
  const avgTip = game ? `The game's own figure (Front Office, ${fmtDate(game.date)})${E ? `; our estimate ${capFull(E.avg)}` : ""}`
    : "Estimated the game's way from the roster in each cap week; the game shows the real figure only to the club's own GM";
  return `<div class="captop"><div class="captop-main"><div class="stat-cards capstrip">
      ${avg != null ? `<div><span title="${esc(avgTip)}">Averaged club salary${game ? "" : " <small>est.</small>"}</span>${money(avg)}</div>` : ""}
      ${cap ? `<div><span title="Salary cap minus ${avg != null ? "the averaged club salary, the figure the game enforces" : "today's cap hit"}">Cap space</span>${money(cap - counted, cap - counted >= 0 ? "pos" : "neg")}</div>` : ""}
      ${E?.room != null && !game ? `<div><span title="The game's Pro-rated Club Payroll Room: the yearly pay the club can still add between now and the end of the season and stay under the cap (the weeks left count, the past ones are fixed)">Pro-rated room <small>est.</small></span>${money(E.room, E.room >= 0 ? "pos" : "neg")}</div>` : ""}
      <div><span title="Today's roster at today's pay, injured reserve at $0: what each remaining cap week will count">Cap hit today</span>${money(hit)}</div>
      <div><span>Active roster</span><b>${roster.length}</b></div>
      <div><span>Expiring this season</span><b>${expiring}</b></div>
      <div><span>Extensions signed</span><b>${ext}</b></div>
    </div>
    ${cap ? `<div class="capmeter" role="img" aria-label="${pct.toFixed(1)}% of the ${capFull(cap)} salary cap"><i class="${pct > 100 ? "over" : ""}" style="width:${Math.min(100, pct)}%"></i><span class="small muted">${avg != null ? "Averaged club salary" : "Cap hit"} = ${pct.toFixed(1)}% of the ${capFull(cap)} cap (${fmtDate(D.cap.date)})</span></div>` : `<p class="small muted">Salary cap not read yet: the next crawl reads it from Front Office.</p>`}
    ${""}</div>
    ${D.picks ? `<aside class="captop-picks">${capPicks(club)}</aside>` : ""}</div>
    ${capGroup("Forwards", grp(roster, "F"), now, cap, "cap-f")}${capGroup("Defence", grp(roster, "D"), now, cap, "cap-d")}${capGroup("Goaltenders", grp(roster, "G"), now, cap, "cap-g")}
    ${capGroup("Non-roster forwards", grp(rest, "F"), now, null, "cap-nf")}${capGroup("Non-roster defence", grp(rest, "D"), now, null, "cap-nd")}${capGroup("Non-roster goaltenders", grp(rest, "G"), now, null, "cap-ng")}
    ${""}
    <p class="small muted"><b>How EHM counts the cap</b> (decoded from the game): the season has 30 weekly cap periods from October. Each week played locks in that week's payroll; the weeks left count at today's payroll. The cap is held against the average of the 30 (Averaged Club Salary), so a player added in March only counts for the weeks left, and one traded away still counts for the weeks he was here. A player on injured reserve counts $0 while he's out${ir.length ? ` (here: ${ir.map(p => esc(p.n)).join(", ")})` : ""}. Pro-rated room is the game's own measure of the yearly pay a club can still add this season and stay under the cap.
      ${""}</p>
    <p class="small muted"><span class="capkey capext">Tinted</span> = an extension's seasons. "Signed" = the extension is signed but its pay isn't known yet${est ? `. * = RFA or UFA estimated from his age at expiry` : ""}.
      ${anyGame ? "From each player's Contract tab where it has been read, otherwise" : "Worked out"} from his profile in each snapshot.</p>`;
}

let contractsTab;

function rosterTab(club, ps, pay) {
  const expYear = String(seasonEndNow());
  const expiring = ps.filter(p => { const i = contractInfo(p); return i.cur?.e === +expYear && !i.next; }).length;
  const age = ps.reduce((s, p) => s + p.age, 0) / ps.length;
  const section = (g, title) => {
    if (!ps.some(p => playsGrp(p) === g)) return "";
    const rows = rosterRows(ps, g);
    return `<section class="card-box flush" aria-label="${title}"><h2 class="box-h">${title} <span class="muted" id="rc-${g}">${rows.length}</span></h2>
      <div class="tablewrap"><table class="rank roster${RF.more ? " wide-cols" : ""}"><colgroup>${rosterCols().map(c => `<col style="width:${c[5]}px">`).join("")}</colgroup><thead><tr>${rosterCols().map(([k, t, , n]) =>
        `<th class="sort ${n ? "num" : ""} ${k === "n" ? "pcol" : ""} ${RF.sort === k ? "on" : ""}" data-k="${k}" aria-sort="${RF.sort === k ? (RF.dir < 0 ? "descending" : "ascending") : "none"}"><button type="button">${t}${RF.sort === k ? (RF.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`).join("")}</tr>
        ${RF.open ? `<tr class="frow">${rosterCols().map(([k, t, , n]) => `<th><input data-k="${k}" data-g="${g}" value="${esc(RF.f[g][k] || "")}" placeholder="${k === "sal" ? ">2 ($M)" : n ? ">0, 5-10" : "filter"}" aria-label="Filter ${esc(t)}"></th>`).join("")}</tr>` : ""}</thead>
      <tbody data-g="${g}">${rosterBody(rows)}</tbody></table></div></section>`;
  };
  const nf = rosterFilterCount();
  return `<div class="keynums">
      ${""}
      <div class="kn"><div class="lab">Listed payroll</div><div class="val">${pay ? money(pay) : "–"}</div></div>
      <div class="kn"><div class="lab">Average age</div><div class="val">${fmt(age, 1)}</div></div>
      <div class="kn"><div class="lab">Expiring ${expYear}</div><div class="val">${expiring}</div></div>
    </div>
    <div class="cardbar tablebar">
      <span class="cardbar-r"><button class="ghost small" id="r-filter" type="button" aria-expanded="${RF.open}">Filter${nf ? ` (${nf})` : ""}</button>
        <button class="ghost small" id="r-more" type="button" aria-pressed="${RF.more}">${RF.more ? "Fewer columns" : "More columns"}</button>
        <button class="ghost small" id="r-clear" type="button"${nf ? "" : " hidden"}>Clear filters</button></span>
      ${seasonSelect("t-season", SEASONS, SEASON, { cls: "small muted", single: "disable" })}</div>
    ${section("F", "Forwards")}${section("D", "Defence")}${section("G", "Goalies")}
    <p class="small muted">${""}Salaries as listed on each profile. A player sits in the section he played in this season's box scores (listed position otherwise).
      Each table has its own filters. Text matches anywhere ("!" excludes); numbers accept &gt;, &lt;, &gt;=, &lt;=,
      ranges like 100-150, or an exact value. Salary is in millions. Click a column header to sort.</p>`;
}
function bindRoster(club, ps) {
  view.querySelectorAll("table.roster tr.frow input").forEach(inp => inp.addEventListener("input", () => {
    const g = inp.dataset.g;
    RF.f[g][inp.dataset.k] = inp.value;
    const rows = rosterRows(ps, g);
    view.querySelector(`tbody[data-g="${g}"]`).innerHTML = rosterBody(rows);
    view.querySelector("#rc-" + g).textContent = rows.length;
    const nf = rosterFilterCount();
    view.querySelector("#r-filter").textContent = `Filter${nf ? ` (${nf})` : ""}`;
    view.querySelector("#r-clear").hidden = !nf;
  }));
  view.querySelectorAll("table.roster th.sort button").forEach(b => b.onclick = () => {
    const k = b.parentNode.dataset.k, col = ROSTER_COLS.find(c => c[0] === k);
    RF.dir = RF.sort === k ? -RF.dir : (col[3] && !["no", "age"].includes(k) ? -1 : 1);
    RF.sort = k; renderTeams(club, "roster");
  });
  view.querySelector("#r-filter").onclick = () => { RF.open = !RF.open; renderTeams(club, "roster"); view.querySelector("#r-filter").focus(); };
  view.querySelector("#r-more").onclick = () => { RF.more = !RF.more; renderTeams(club, "roster"); view.querySelector("#r-more").focus(); };
  view.querySelector("#r-clear").onclick = () => { RF.f = { F: {}, D: {}, G: {} }; renderTeams(club, "roster"); };

  view.querySelectorAll("tbody[data-g]").forEach(tb => tb.onclick = e => {
    const tr = e.target.closest("tr.link");
    if (tr && !e.target.closest("a")) playerRow(tr);
  });
}
const STAT_GROUPS = [
  ["Scoring", "Per game unless marked", ["gf_gp", "ga_gp", "sf_gp", "sa_gp", "sh_pct", "sv_pct"]],
  ["Special teams", "Power-play goals per opportunity", ["pp_pct", "pk_pct", "pim_gp"]],
  ["Expected goals", "Games with a shot chart", ["xgf_gp", "xga_gp", "xg_pct"]],
  ["Puck battles", "Per game", ["fo", "hits_gp", "blk_gp", "tk_gp", "gv_gp"]],
];
function statFmt(k, v) {
  if (v == null) return "–";
  if (["sh_pct", "pp_pct", "pk_pct", "xg_pct"].includes(k)) return (100 * v).toFixed(1) + "%";
  if (k === "fo") return v.toFixed(1) + "%";
  if (k === "sv_pct" || k === "pts_pct") return v.toFixed(3).replace(/^0/, "");
  if (k === "gd") return signed(v, 0);
  if (k === "pts") return v.toFixed(0);
  return v.toFixed(["gf_gp", "ga_gp", "xgf_gp", "xga_gp"].includes(k) ? 2 : 1);
}
function teamStatsTab(club, abbr, seasons) {
  if (!seasons.includes(SEASON)) SEASON = seasons.at(-1);
  const T = teamTable(SEASON), r = T.teams[abbr], label = Object.fromEntries((D.teamStatKeys || []).map(([k, l]) => [k, l]));
  const rec = a => `${a[0]}–${a[1]}–${a[2]}`;
  const share = r.gp / 84;
  const maxG = Math.max(1, ...r.months.map(m => Math.max(m[4], m[5])));
  return `<div class="cardbar"><div><h2 class="flat">${seasonLabel(SEASON)} regular season</h2>
      <p class="sub">${r.gp} of ${esc(club)}'s ${officialGp(club) > r.gp ? `at least ${officialGp(club)} games played` : "games"} are in the box scores${officialGp(club) > r.gp ? ": the record and points below cover only those" : share < 0.95 && share > 0.8 ? " (a few weren't captured)" : ""}. Ranks are out of ${T.n} teams; 1st is best.</p></div>
      ${seasonSelect("t-season", seasons, SEASON)}</div>
    <div class="stat-cards">
      <div><span>Record (W–L–OTL)</span><b>${r.w}–${r.l}–${r.otl}</b><small>${r.gp} GP</small></div>
      <div><span>Points</span><b>${r.pts}</b><small>${rankLink(teamRankHref("pts", club), `${ordinal(r.place)} of ${T.n}`)} · league avg ${statFmt("pts", T.avg.pts)}</small></div>
      <div><span>Points %</span><b>${statFmt("pts_pct", r.stats.pts_pct[0])}</b><small>${rankLink(teamRankHref("pts_pct", club), ordinal(r.stats.pts_pct[1]))}</small></div>
      <div><span>Goal difference</span><b>${signed(r.gf - r.ga, 0)}</b><small>${rankLink(teamRankHref("gd", club), ordinal(r.stats.gd[1]))} · ${r.gf} GF, ${r.ga} GA</small></div>
      <div><span>Home</span><b>${rec(r.home)}</b><small>W–L–OTL</small></div>
      <div><span>Away</span><b>${rec(r.away)}</b><small>W–L–OTL</small></div>
      <div><span>Last 10</span><b>${rec(r.last10)}</b><small>to ${fmtDate(r.last)}</small></div>
    </div>
    <div class="row four">${STAT_GROUPS.map(([title, sub, keys]) => `<section class="card-box"><h3 class="box-h3">${title}</h3><p class="sub">${title === "Expected goals" ? `The ${r.xg_games} games with a shot chart` : sub}</p>
      <div class="srow head" aria-hidden="true"><span>Stat</span><span>${esc(abbr)}</span><span>League</span><span>Rank</span></div>
      ${keys.map(k => `<div class="srow"><span>${label[k] || k}</span><b>${statFmt(k, r.stats[k][0])}</b><span class="muted">${statFmt(k, T.avg[k])}</span><span>${rankChip(r.stats[k][1], T.n, teamRankHref(k, club))}</span></div>`).join("")}
    </section>`).join("")}</div>
    <section class="card-box flush"><h3 class="box-h">Month by month</h3><div class="tablewrap"><table><thead><tr><th>Month</th><th class="num">Record</th>
      <th class="num">GF</th><th class="num">GA</th><th class="num">Diff</th><th>Goals for vs against</th></tr></thead><tbody>
      ${r.months.map(([m, w, l, otl, gf, ga]) => `<tr><th scope="row">${new Date(m + "-01T00:00:00").toLocaleDateString(undefined, { month: "long", year: "numeric" })}</th>
        <td class="num">${w}–${l}–${otl}</td><td class="num">${gf}</td><td class="num">${ga}</td><td class="num ${gf > ga ? "up" : gf < ga ? "down" : ""}"><b>${signed(gf - ga, 0)}</b></td>
        <td><span class="gbars" role="img" aria-label="${gf} goals for, ${ga} against"><i style="width:${(100 * gf / maxG).toFixed(1)}%"></i><i class="ga" style="width:${(100 * ga / maxG).toFixed(1)}%"></i></span></td></tr>`).join("")}
    </tbody></table></div><p class="sub pad">Top bar: goals for. Bottom bar: goals against.</p></section>`;
}

const TPS = { mode: "R", sort: "p", dir: -1, view: "basic" };

const TP_VIEWS = [["basic", "Basic"], ["adv", "Advanced"]];
const TP_COLS = [
  ["gp", "GP", r => r.gp, v => v, "", "basic war"], ["g", "G", r => r.g, v => v], ["a", "A", r => r.a, v => v],
  ["p", "P", r => r.p, v => `<b>${v}</b>`, "", "basic war"],
  ["pm", "+/−", r => r.pm, v => v == null ? dash : (v > 0 ? "+" : "") + v], ["pim", "PIM", r => r.pim, v => v],
  ["st", "SOG", r => r.st, v => v, "Shots on goal"],
  ["shp", "Sh%", r => (r.st ? r.g / r.st : null), v => v == null ? dash : (100 * v).toFixed(1), "Goals per shot on goal"],
  ["toi", "TOI", r => (r.gp ? r.toi / r.gp : null), v => v == null ? dash : rawFmt("toi_gp", v), "Average time on ice per game"],
  ["p60", "P/60", r => (r.toi ? r.p / r.toi * 60 : null), v => v == null ? dash : v.toFixed(2), "Points per 60 minutes"],
  ["rat", "Av R", r => r.rat, v => v == null ? dash : v.toFixed(2), "Average game rating"],
  ["pp", "PP TOI", r => r.c?.raw?.pp_toi ?? null, v => v == null ? dash : rawFmt("pp_toi", v), "Power-play time per game", "adv"],
  ["pk", "PK TOI", r => r.c?.raw?.pk_toi ?? null, v => v == null ? dash : rawFmt("pk_toi", v), "Penalty-kill time per game", "adv"],
  ["s", "Shots", r => r.s, v => v, "Shot attempts", "adv"],
  ["blk", "Blk", r => r.blk, v => v, "Shots blocked (play-by-play)", "adv"],
  ["ppg", "PPG", r => r.ppg, v => v, "Power-play goals", "adv"], ["shg", "SHG", r => r.shg, v => v, "Short-handed goals", "adv"],
];

const sortTh = (st, k, h, tip) => `<th class="num sort ${st.sort === k ? "on" : ""}" data-s="${k}"${tip ? ` title="${tip}"` : ""}><button type="button">${h}${st.sort === k ? (st.dir < 0 ? " ↓" : " ↑") : ""}</button></th>`;
function bindSortHeads(st, rerender) {
  view.querySelectorAll("th[data-s] button").forEach(b => b.onclick = () => {
    const k = b.parentNode.dataset.s;
    st.dir = st.sort === k ? -st.dir : -1; st.sort = k; rerender();
  });
}
const tpCols = view => TP_COLS.filter(c => (c[5] || "basic").split(" ").includes(view));

const TP_OWN = new Set(["gp", "g", "a", "p", "pm", "pim", "st", "shp", "toi", "p60", "rat", "s", "blk", "ppg", "shg"]);

const TP_SUM = ["gp", "g", "a", "p", "pm", "pim", "s", "st", "toi", "shf", "ppg", "shg", "blk"];
function teamPlayerTotals(season, mode) {
  const cols = D.teamPlayerCols || [], lines = {};
  Object.values(D.teamPlayers?.[season] || {}).forEach(t => (t[mode] || []).forEach(row => {
    const r = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    (lines[r.k] ||= []).push(r);
  }));
  const out = {};
  Object.entries(lines).filter(([, ls]) => ls.length > 1).forEach(([k, ls]) => {
    const t = { clubs: ls.length };
    TP_SUM.forEach(c => (t[c] = ls.some(r => r[c] != null) ? ls.reduce((a, r) => a + (r[c] || 0), 0) : null));
    const rated = ls.filter(r => r.rat != null && r.gp);
    t.rat = rated.length ? rated.reduce((a, r) => a + r.rat * r.gp, 0) / rated.reduce((a, r) => a + r.gp, 0) : null;
    out[k] = t;
  });
  return out;
}

function seasonClubAbbr(k, season) {
  const pl = byKey.get(k), cur = season === SEASONS.at(-1);

  if (cur && pl && abbrOf(clubOf(pl))) return abbrOf(clubOf(pl));
  const teams = pl ? (cur ? pl.card : pl.ss?.[season]?.card)?.totals?.team : undefined;
  if (cur && !teams) return "";
  return teams ? String(teams).split("/").at(-1) : null;
}
function teamPlayerRows(abbr, season, mode) {
  const cols = D.teamPlayerCols || [];
  const tot = teamPlayerTotals(season, mode);
  return (D.teamPlayers?.[season]?.[abbr]?.[mode] || []).map(row => {
    const r = Object.fromEntries(cols.map((c, i) => [c, row[i]]));
    const pl = byKey.get(r.k);
    const b = pl && (season === SEASONS.at(-1) ? (mode === "P" ? pl.po : pl) : (mode === "P" ? pl.ss?.[season]?.po : pl.ss?.[season]));
    const w = null;

    const now = mode === "P" ? abbr : seasonClubAbbr(r.k, season);
    return { ...r, pl, season, c: b?.card || null, w: w || null, war: null, isG: r.pos === "G" || pl?.grp === "G", tot: tot[r.k] || null, here: now == null || now === abbr, now };
  });
}
function teamPlayersTab(club, season, hlKey) {
  const abbr = abbrOf(club);
  const seasons = SEASONS.filter(s => D.teamPlayers?.[s]?.[abbr]);
  if (!seasons.length) return `<p class="muted">No box scores for ${esc(club)} yet.</p>`;
  if (!seasons.includes(season)) season = seasons.includes(SEASON) ? SEASON : seasons.at(-1);
  const modes = ["R", "P"].filter(m => D.teamPlayers[season][abbr][m]);
  if (!modes.includes(TPS.mode)) TPS.mode = modes[0];
  const all = teamPlayerRows(abbr, season, TPS.mode);

  const rows = all.filter(r => r.here || r.k === hlKey), gone = all.filter(r => !r.here && r.k !== hlKey);
  const sk = rows.filter(r => !r.isG), gk = rows.filter(r => r.isG);

  const both = (r, g, f) => { const v = f(g(r), r); return r.tot ? `${v}<small class="tot">${f(g(r.tot), r)}</small>` : v; };
  const movedTag = r => !r.here ? ` <span class="muted small">now ${r.now ? tname(clubOfAbbr(r.now)) : "elsewhere"}</span>` : "";
  const cols = tpCols(TPS.view);
  if (!cols.some(c => c[0] === TPS.sort)) { TPS.sort = { basic: "p", adv: "imp", war: "war" }[TPS.view]; TPS.dir = -1; }
  const [, , get] = cols.find(c => c[0] === TPS.sort);
  sk.sort((x, y) => ((get(y) ?? -1e9) - (get(x) ?? -1e9)) * -TPS.dir || y.p - x.p);
  gk.sort((x, y) => y.gp - x.gp);
  const T = teamTable(season), tr = T?.teams?.[abbr];
  const card = (label, key) => { const [v, rank] = tr.stats[key] || [];
    return `<div><span>${label}</span><b>${statFmt(key, v)}</b><small>${rank ? rankLink(teamRankHref(key, club, season), ordinal(rank)) : ""}</small></div>`; };
  const summary = TPS.mode === "R" && tr ? `<div class="stat-cards">
      <div><span>Record</span><b>${tr.w}–${tr.l}–${tr.otl}</b><small>${rankLink(teamRankHref("pts", club, season), `${ordinal(tr.place)}, ${tr.pts} pts`)}</small></div>
      ${card("Goals for / game", "gf_gp")}
      ${card("Goals against / game", "ga_gp")}
      ${card("Power play", "pp_pct")}
      ${card("Penalty kill", "pk_pct")}
      ${""}
    </div><p class="small"><a href="${teamRoute(club)}/stats" data-season="${season}">All ${esc(club)} team stats for ${seasonLabel(season)} →</a></p>` : "";
  const nameCell = r => `<th scope="row" class="pcol" title="${esc(r.n)}">${hasPage(r.k) ? `<a class="pcell" href="${route(r.k)}"><span><b>${esc(r.n)}</b></span></a>` : `<b>${esc(r.n)}</b>`}${movedTag(r)}</th>`;
  const rowOpen = r => `<tr class="${hasPage(r.k) ? "link" : ""}${r.k === hlKey ? " hl" : ""}"${hasPage(r.k) ? ` data-k="${esc(r.k)}"` : ""}>${nameCell(r)}`;
  const skTable = `<table class="rank tp"><thead><tr><th class="pcol">Player</th><th>Pos</th>${cols.map(([k, h, , , tip]) => sortTh(TPS, k, h, tip)).join("")}</tr></thead><tbody>
    ${sk.map(r => `${rowOpen(r)}<td>${esc(r.pl?.pos || r.pos || "")}</td>
      ${cols.map(([k, , g, f]) => `<td class="num" data-v="${g(r) ?? ""}">${TP_OWN.has(k) ? both(r, g, f) : f(g(r), r)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

  const gTable = gk.length ? `<table class="rank tp"><thead><tr><th class="pcol">Goalie</th><th class="num">GP</th><th class="num" title="Average time on ice per game">TOI</th>
      <th class="num" title="Save percentage">SV%</th>${""}
      <th class="num">Av R</th>${""}</tr></thead><tbody>
    ${gk.map(r => { const c = r.c;
      return `${rowOpen(r)}<td class="num">${both(r, x => x.gp, v => v)}</td><td class="num">${both(r, x => (x.gp ? x.toi / x.gp : null), v => v == null ? dash : rawFmt("toi_gp", v))}</td>
        <td class="num">${c?.raw?.svp != null ? c.raw.svp.toFixed(3).replace(/^0/, "") : dash}</td>${""}
        <td class="num">${both(r, x => x.rat, v => v == null ? dash : v.toFixed(2))}</td>${""}</tr>`; }).join("")}</tbody></table>` : "";
  return `<div class="cardbar"><div><h2 class="flat">${seasonLabel(season)} ${TPS.mode === "P" ? "playoffs" : "regular season"}</h2>
      <p class="sub">${TPS.mode === "P" ? "Everyone who played for" : season === SEASONS.at(-1) ? "Players on" : "Players who ended the season with"} ${esc(club)}; the numbers are his games for ${esc(club)}.
        The small number under a value = his season total over all his NHL clubs, when he also played for another one. Click a header to sort.</p></div>
      <span class="inline">${modes.length > 1 ? `<span class="seg" id="tp-mode">${modes.map(m => `<button type="button" data-m="${m}" class="${TPS.mode === m ? "on" : ""}">${m === "R" ? "Regular season" : "Playoffs"}</button>`).join("")}</span>` : ""}
      ${seasonSelect("tp-season", seasons, season)}</span></div>
    ${summary}
    <section class="card-box flush" aria-label="Skaters"><div class="box-h tp-head"><h2>Skaters <span class="muted">${sk.length}</span></h2>
      <span class="seg" id="tp-view" role="group" aria-label="Columns">${TP_VIEWS.map(([v, t]) => `<button type="button" data-v="${v}" class="${TPS.view === v ? "on" : ""}">${t}</button>`).join("")}</span></div>
      <div class="tablewrap">${skTable}</div>
      ${TPS.view !== "basic" ? `<p class="sub pad">${"PP/PK time comes from his season card (all his NHL clubs that season)."}</p>` : ""}</section>
    ${gTable ? `<section class="card-box flush" aria-label="Goalies"><h2 class="box-h">Goalies <span class="muted">${gk.length}</span></h2><div class="tablewrap">${gTable}</div>
      <p class="sub pad">${"SV% comes from his season card (all his clubs that season)."}</p></section>` : ""}
    ${gone.length ? `<p class="small muted">Not shown: ${gone.length} player${gone.length === 1 ? "" : "s"} who played for ${esc(club)} ${season === SEASONS.at(-1) ? "this season but" : "that season but ended it elsewhere"}${season === SEASONS.at(-1) ? " are with another club now" : ""}
      (${gone.slice().sort((x, y) => y.gp - x.gp).slice(0, 8).map(r => `${hasPage(r.k) ? `<a href="${route(r.k)}">${esc(r.n)}</a>` : esc(r.n)} ${r.gp} GP${r.now ? `, now ${tname(clubOfAbbr(r.now))}` : ""}`).join("; ")}${gone.length > 8 ? "; …" : ""}).</p>` : ""}
    <p class="small muted">From this save's box scores (about 2% of games missing). Shots = attempts, SOG = shots on goal. Blk = shots blocked,
      credited from the play-by-play; hits, takeaways and giveaways aren't given per player anywhere a client can see (team totals are on Team stats).</p>`;
}
function bindTeamPlayers(club, season, hlKey) {
  const go = s => (location.hash = `${teamRoute(club)}/players/${s}`);
  view.querySelector("#tp-season")?.addEventListener("change", e => go(e.target.value));
  view.querySelectorAll("#tp-mode button").forEach(b => b.onclick = () => { TPS.mode = b.dataset.m; renderTeams(club, "players", season, hlKey); });
  view.querySelectorAll("#tp-view button").forEach(b => b.onclick = () => { TPS.view = b.dataset.v; renderTeams(club, "players", season, hlKey); });
  bindSortHeads(TPS, () => renderTeams(club, "players", season, hlKey));
  view.querySelector("a[data-season]")?.addEventListener("click", e => { SEASON = e.currentTarget.dataset.season; });
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
  const hl = view.querySelector("tr.hl");
  if (hl) setTimeout(() => hl.scrollIntoView({ block: "center" }), 0);
}

let NHLP = null;
function nhlPeople() {
  if (NHLP && NHLP.data === D) return NHLP.list;
  const C = Object.fromEntries((D.careerCols || []).map((c, i) => [c, i]));
  const honours = a => (a || []).filter(x => "TCA".includes(x[3]) && /National Hockey League/.test(x[2]));
  const cur = D.players.map(p => {
    const war = {};
    SEASONS.forEach(s => {
    });
    return { k: p.k, n: p.n, pos: p.pos, grp: p.grp, p, war, ach: honours(p.ach), car: (p.car || []).filter(r => r[C.league] === "NHL") };
  });
  const alumni = (D.teamHist?.alumni || []).map(a => ({ ...a, car: a.car.filter(r => r[C.league] === "NHL"), p: null }));
  const list = [...cur, ...alumni].filter(x => x.car.length || x.ach.length);
  NHLP = { data: D, list, C };
  return list;
}

function withClub(x, club) {
  const C = NHLP.C, abbr = club && abbrOf(club), mine = r => !club || r[C.club] === club;
  const sum = (type, col) => x.car.filter(r => mine(r) && r[C.type] === type).reduce((s, r) => s + (+r[C[col]] || 0), 0);
  const seasons = new Set(x.car.filter(r => mine(r) && r[C.type] === "R").map(r => r[C.season]));
  let war = 0;
  const warBy = {};

  const bySeason = {};
  x.car.filter(r => mine(r) && r[C.type] === "R").forEach(r => {
    const b = (bySeason[r[C.season]] ||= { gp: 0, g: 0, a: 0, p: 0, w: 0 });
    ["gp", "g", "a", "p", "w"].forEach(c => { b[c] += +r[C[c]] || 0; });
  });
  const ach = x.ach.filter(a => !club || a[1] === club);
  return { x, bySeason, gp: sum("R", "gp"), g: sum("R", "g"), a: sum("R", "a"), pts: sum("R", "p"), w: sum("R", "w"), so: sum("R", "so"),
           pogp: sum("P", "gp"), pop: sum("P", "p"), war, warBy, seasons: [...seasons].sort(), ach,
           trophies: ach.filter(a => a[3] === "T"), cups: ach.filter(a => a[3] === "C" && /National Hockey League winners$/.test(a[2])),
           allstar: ach.filter(a => a[3] === "A" && /(First|Second) All-Star/.test(a[2])) };
}
const personLink = x => hasPage(x.k) ? `<a href="${route(x.k)}">${esc(x.n)}</a>` : `<span title="No longer in the data">${esc(x.n)}</span>`;
const HOFC = {};
function clubPeople(club) {
  const id = club || "";
  if (HOFC[id]?.data !== D) HOFC[id] = { data: D, rows: nhlPeople().map(x => withClub(x, club)).filter(r => r.gp || r.ach.length || r.pogp) };
  return HOFC[id].rows;
}
const seasonsOfClub = club => {
  const th = D.teamHist || {}, abbr = abbrOf(club);
  return [...new Set([...SEASONS.filter(s => teamTable(s)?.teams?.[abbr]), ...Object.keys(th.seasons || {}).filter(s => th.seasons[s][club]),
    ...Object.keys(th.cups || {}).filter(s => (th.cups[s] || []).includes(club))])].sort().reverse();
};
function teamHistoryTab(club) {
  const th = D.teamHist || {}, abbr = abbrOf(club), people = clubPeople(club);
  const seasons = seasonsOfClub(club);
  const rounds = th.rounds || [];
  const po = s => {
    const cup = th.cups?.[s] || [];
    if (cup[0] === club) return `<b class="up">Stanley Cup champion</b>`;
    if (cup[1] === club) return `<b>Lost the Stanley Cup final</b>`;
    const r = th.seasons?.[s]?.[club]?.po;
    return r ? `Reached the ${rounds[r - 1].toLowerCase()}${r < 4 ? "" : ""}` : `<span class="muted">${teamTable(s)?.teams?.[abbr] ? "–" : ""}</span>`;
  };
  const C = NHLP.C;
  const leader = (s, f, fmtv) => {
    const best = people.map(r => [r, f(r, s)]).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0];
    return best ? `${personLink(best[0].x)} <span class="muted small">${fmtv(best[1])}</span>` : dash;
  };
  const pointsIn = (r, s) => r.x.car.filter(c => c[C.club] === club && c[C.type] === "R" && c[C.season] === s).reduce((t, c) => t + (+c[C.p] || 0), 0);
  const award = (s, name) => (th.seasons?.[s]?.[club]?.awards || []).find(a => a[0] === name);
  const awardCell = a => !a ? dash : a[2] && hasPage(a[2]) ? `<a href="${route(a[2])}">${esc(a[1])}</a>` : esc(a[1]);
  const cups = seasons.filter(s => th.cups?.[s]?.[0] === club), finals = seasons.filter(s => th.cups?.[s]?.[1] === club);
  const poYears = seasons.filter(s => th.seasons?.[s]?.[club]?.po || (th.cups?.[s] || []).includes(club));
  const tables = seasons.map(s => [s, teamTable(s)?.teams?.[abbr]]).filter(([, r]) => r);
  const best = tables.slice().sort((a, b) => a[1].place - b[1].place)[0];
  const trophies = people.flatMap(r => r.trophies.map(a => [a, r])).sort((a, b) => b[0][0].localeCompare(a[0][0]));
  const allstars = people.flatMap(r => r.allstar.map(a => [a, r])).sort((a, b) => b[0][0].localeCompare(a[0][0]));
  const awardNames = [...new Set(seasons.flatMap(s => (th.seasons?.[s]?.[club]?.awards || []).map(a => a[0])))];
  return `<div class="stat-cards">
      <div><span>Seasons in this save</span><b>${seasons.length}</b><small>${seasons.length ? `${seasonLabel(seasons.at(-1))} to ${seasonLabel(seasons[0])}` : ""}</small></div>
      <div><span>Stanley Cups</span><b>${cups.length}</b><small>${cups.map(s => playoffSeasons().includes(s) ? `<a href="#/playoffs/${s}">${seasonLabel(s)}</a>` : seasonLabel(s)).join(", ") || "none yet"}${finals.length ? ` · ${finals.length} lost final${finals.length > 1 ? "s" : ""}` : ""}</small></div>
      <div><span>Playoff seasons</span><b>${poYears.length}</b><small>seen in the box scores</small></div>
      <div><span>Best finish</span><b>${best ? rankLink(teamRankHref("pts", club, best[0]), ordinal(best[1].place)) : "–"}</b><small>${best ? `${seasonLabel(best[0])}, ${best[1].pts} points` : ""}</small></div>
    </div>
    <section class="card-box flush" aria-label="Season by season"><h2 class="box-h">Season by season</h2>
      <div class="tablewrap"><table class="rank"><thead><tr><th>Season</th><th class="num">GP</th><th class="num">W–L–OTL</th><th class="num">Pts</th><th class="num">Place</th>
        <th class="num">GF</th><th class="num">GA</th><th>Playoffs</th><th>Top scorer</th>${""}<th>Biggest Star</th></tr></thead><tbody>
        ${seasons.map(s => { const r = teamTable(s)?.teams?.[abbr];

          const hasStats = D.teamPlayers?.[s]?.[abbr];
          return `<tr><th scope="row">${hasStats ? `<a href="${teamRoute(club)}/players/${s}" title="${esc(club)} player stats, ${seasonLabel(s)}">${seasonLabel(s)}</a>` : seasonLabel(s)}</th><td class="num">${r ? r.gp : dash}</td><td class="num">${r ? `${r.w}–${r.l}–${r.otl}` : dash}</td><td class="num"><b>${r ? r.pts : "–"}</b></td>
            <td class="num">${r ? rankChip(r.place, teamTable(s).n, teamRankHref("pts", club, s)) : dash}</td><td class="num">${r ? r.gf : dash}</td><td class="num">${r ? r.ga : dash}</td>
            <td class="small">${playoffSeasons().includes(s) ? `<a href="#/playoffs/${s}">${po(s)}</a>` : po(s)}</td><td class="small">${leader(s, pointsIn, v => `${v} pts`)}</td>
            ${""}<td class="small">${awardCell(award(s, "Biggest Star"))}</td></tr>`; }).join("")}
      </tbody></table></div>
      <p class="sub pad">Records from this save's box scores (the place links to the standings). Playoffs: champion and finalist from the achievement log;
        otherwise the furthest round seen in the box scores, a lower bound, since EHM keeps other teams' box scores only ~44 days. Clicking a place opens that season's standings.</p></section>
    <div class="row">
      <section class="card-box" aria-labelledby="tr-h"><h2 id="tr-h">NHL trophies won here</h2>
        ${trophies.length ? `<ul class="plain">${trophies.map(([a, r]) => `<li>${achHref(a[0], a[2]) ? `<a class="small" href="${achHref(a[0], a[2])}" title="${seasonLabel(seasonOfDay(a[0]))} playoffs">${a[0].slice(0, 4)}</a>` : `<span class="muted small">${a[0].slice(0, 4)}</span>`} ${esc(achText(a[2]).replace(/^\d+\/\d+ /, "").replace(/^NHL /, ""))} · ${personLink(r.x)}</li>`).join("")}</ul>`
          : `<p class="muted small">None in the achievement log yet.</p>`}</section>
      <section class="card-box" aria-labelledby="as-h"><h2 id="as-h">NHL All-Star teams</h2>
        ${allstars.length ? `<ul class="plain">${allstars.map(([a, r]) => `<li>${esc(achText(a[2]).replace(/ National Hockey League/, " NHL"))} · ${personLink(r.x)}</li>`).join("")}</ul>`
          : `<p class="muted small">None in the achievement log yet.</p>`}</section>
    </div>
    ${awardNames.length ? `<section class="card-box flush" aria-label="Team awards"><h2 class="box-h">Team awards</h2>
      <div class="tablewrap"><table><thead><tr><th>Award</th>${seasons.filter(s => th.seasons?.[s]?.[club]?.awards).map(s => `<th>${seasonLabel(s)}</th>`).join("")}</tr></thead><tbody>
      ${awardNames.map(n => `<tr><th scope="row">${esc(n)}</th>${seasons.filter(s => th.seasons?.[s]?.[club]?.awards).map(s => `<td class="small">${awardCell(award(s, n))}</td>`).join("")}</tr>`).join("")}
      </tbody></table></div><p class="sub pad">The club's own awards screen, from the last snapshot of each season (the current season so far).</p></section>` : ""}
    <p class="small muted">The save started in ${D.dates.length ? fmtDate(D.dates[0]).slice(-4) : ""}: the game's database has no earlier franchise history, so this page grows with every season simmed.</p>`;
}

const hofScore = r => 3 * r.trophies.length + 2 * r.cups.length + r.allstar.length + (r.x.grp === "G" ? r.w / 40 : r.pts / 100);

const isSk = r => r.x.grp !== "G", isGk = r => r.x.grp === "G", anyone = () => true;
const HOF_TITLES = [
  ["gp", "Iron Man", "Most games played", r => r.gp, v => `${v} GP`, anyone],
  ["pts", "All-Time Scorer", "Most points", r => r.pts, v => `${v} pts`, isSk],
  ["g", "Sniper", "Most goals", r => r.g, v => `${v} G`, isSk],
  ["a", "Playmaker", "Most assists", r => r.a, v => `${v} A`, isSk],
  ["w", "Brick Wall", "Most goalie wins", r => r.w, v => `${v} W`, isGk],
  ["so", "Shutout King", "Most shutouts", r => r.so, v => `${v} SO`, isGk],
  ["pop", "Mr. Playoffs", "Most playoff points", r => r.pop, v => `${v} pts`, isSk],
  ["hon", "Silverware", "Most NHL honours (trophies, Cups, All-Star teams)", r => r.trophies.length + r.cups.length + r.allstar.length, v => `${v}`, anyone],
  ["seasons", "Lifer", "Most seasons", r => r.seasons.length, v => `${v} season${v > 1 ? "s" : ""}`, anyone],
  ["spts", "Season to Remember", "Most points in one season", l => l.p, v => `${v} pts`, isSk, true],
  ["sg", "Goal Rush", "Most goals in one season", l => l.g, v => `${v} G`, isSk, true],
  ["sw", "Workhorse", "Most goalie wins in one season", l => l.w, v => `${v} W`, isGk, true],
];
const HOF_SCORE = ["score", "Hall of Fame score", "3 per NHL trophy + 2 per Stanley Cup + 1 per All-Star team + 1 per 100 NHL points (skaters) or 40 wins (goalies)", hofScore, v => fmt(v, 1), anyone];
function hofRanking(club, id) {
  const t = id === "score" ? HOF_SCORE : HOF_TITLES.find(x => x[0] === id);
  if (!t) return null;
  const [, , , f, , who, single] = t;
  const people = clubPeople(club).filter(who);
  const rows = single
    ? people.flatMap(r => [...new Set([...Object.keys(r.bySeason)])].map(s =>
        ({ r, season: s, v: f({ ...(r.bySeason[s] || { gp: 0, g: 0, a: 0, p: 0, w: 0 }) }) })))
    : people.map(r => ({ r, v: f(r) }));
  const out = rows.filter(x => x.v > 0).sort((a, b) => b.v - a.v);
  out.forEach((x, i) => { x.rank = i && x.v === out[i - 1].v ? out[i - 1].rank : i + 1; });
  return { t, rows: out };
}
const hofHref = (club, id) => `#/hof/${club ? encodeURIComponent(club) : "league"}/${id}`;
function hofBody(club) {
  const where = club ? `for ${esc(club)}` : "in the NHL", min = club ? 2 : 4;
  const members = hofRanking(club, "score").rows.filter(x => x.v >= min);
  const titles = HOF_TITLES.map(t => [t, hofRanking(club, t[0])]).filter(([, R]) => R.rows.length);
  const span = r => r.seasons.length ? ` (${seasonLabel(r.seasons[0])}${r.seasons.length > 1 ? ` to ${seasonLabel(r.seasons.at(-1))}` : ""})` : "";
  const card = ({ r, v }) => `<div class="hof-card">${r.x.p ? logo(clubOf(r.x.p), 28) : ""}<div><b>${personLink(r.x)}</b>
      <small>${esc(r.x.pos || "")} · ${r.seasons.length} season${r.seasons.length === 1 ? "" : "s"}${span(r)}</small>
      <small>${r.gp ? `${r.gp} GP · ${r.x.grp === "G" ? `${r.w} W · ${r.so} SO` : `${r.pts} P`}${""}` : ""}${""}${r.trophies.length ? ` · ${r.trophies.length} troph${r.trophies.length > 1 ? "ies" : "y"}` : ""}${r.cups.length ? ` · ${r.cups.length} Cup${r.cups.length > 1 ? "s" : ""}` : ""}${r.allstar.length ? ` · ${r.allstar.length}× All-Star` : ""}</small>
      ${r.x.p ? (club && clubOf(r.x.p) === club ? `<small class="up">Still with ${esc(club)}</small>` : `<small class="muted">${club ? "Now " : ""}${esc(clubOf(r.x.p))}</small>`) : `<small class="muted">Left the data</small>`}</div>
      <a class="hof-score" href="${hofHref(club, "score")}" title="Hall of Fame score: see everyone's">${fmt(v, 1)}</a></div>`;
  const titleCard = ([t, R]) => {
    const top = R.rows.filter(x => x.rank === 1);
    return `<a class="hof-title" href="${hofHref(club, t[0])}"><span class="hof-k">${t[1]}</span><small>${t[2]}</small>
      <b>${top.length > 3 ? `${top.length} players tied` : top.map(x => esc(x.r.x.n)).join(", ")}</b>
      <small>${t[4](top[0].v)}${t[6] ? ` · ${seasonLabel(top[0].season)}` : ""}${top.length > 1 ? " (tied)" : ""}</small>
      <span class="hof-more">Full ranking (${R.rows.length}) →</span></a>`;
  };
  return `<section class="card-box" aria-labelledby="ti-h"><h2 id="ti-h">${club ? "Franchise titles" : "League record holders"}</h2>
      <p class="sub">Held ${where} in this save. Click a title for everyone ranked on it.</p>
      ${titles.length ? `<div class="hof-titles">${titles.map(titleCard).join("")}</div>` : `<p class="muted small">No records yet.</p>`}</section>
    <section class="card-box" aria-labelledby="hof-h"><h2 id="hof-h">Honoured members</h2>
      <p class="sub">Hall of Fame score: ${HOF_SCORE[2]}${club ? " (won with the club)" : ""}.
        Members need ${min} or more. <a href="${hofHref(club, "score")}">Everyone's score →</a></p>
      ${members.length ? `<div class="hof-grid">${members.slice(0, club ? 12 : 24).map(card).join("")}</div>` : `<p class="muted small">No one has reached ${min} yet.</p>`}</section>
    ${club ? hofFoot(club) : ""}`;
}

const hofFoot = club => `<p class="small muted">Counting stats: NHL regular-season and playoff lines from the players' History tabs${""}.
      Players who left the database still count. The game's database has no history before the save started, so these grow with every season simmed.</p>`;
const hallOfFameTab = club => hofBody(club);
