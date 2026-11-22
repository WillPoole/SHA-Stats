"use strict";

const LGD = D.leagues?.leagues || {};
const LG_COLS = D.leagues?.cols || [];
const leagueRoute = lg => "#/league/" + encodeURIComponent(lg);
const hasLeague = lg => !!lg && !!LGD[lg];
const leagueNames = () => Object.keys(LGD);
const lgLink = lg => hasLeague(lg) ? `<a href="${leagueRoute(lg)}">${esc(lg)}</a>` : esc(lg);

const clubLeagueOf = club => D.clubLeague?.[club] || clubLeague(club);
const lgSeasons = lg => Object.keys(LGD[lg]?.seasons || {}).filter(s => LGD[lg].seasons[s].R || LGD[lg].seasons[s].P).sort();
const lgSeason = (lg, s) => (lgSeasons(lg).includes(s) ? s : lgSeasons(lg).filter(x => LGD[lg].table?.[x] && Object.keys(LGD[lg].table[x]).length).at(-1) || lgSeasons(lg).at(-1));
const lgPeople = lg => D.players.filter(p => clubOf(p) ? clubLeagueOf(clubOf(p)) === lg : p.lg === lg);
const LS = { kind: "R", view: "basic", sort: "p", dir: -1, club: "", grp: "", limit: 100 };
const LG_SUM = ["gp", "g", "a", "p", "pm", "pim", "s", "w", "l", "t", "min", "ga"];

function lgDerive(r) {
  const gp = r.gp || 0;
  return { ...r, pl: byKey.get(r.k) || null, isG: r.w != null || r.pos === "G",
    p_gp: gp ? r.p / gp : null, g_gp: gp ? r.g / gp : null, a_gp: gp ? r.a / gp : null, s_gp: gp && r.s != null ? r.s / gp : null,
    pim_gp: gp && r.pim != null ? r.pim / gp : null, shp: r.s ? r.g / r.s : null, gaa: r.min ? r.ga * 60 / r.min : null };
}
const lgRow = (row, club) => lgDerive({ ...Object.fromEntries(LG_COLS.map((c, i) => [c, row[i]])), club, clubs: [club] });
const LGC = {};

function lgPlayers(lg, season, kind) {
  const id = `${lg}|${season}|${kind}`;
  if (LGC[id]?.data === D) return LGC[id].rows;
  const by = new Map();
  Object.entries(LGD[lg]?.seasons?.[season]?.[kind] || {}).forEach(([club, rows]) => rows.forEach(row => {
    const r = Object.fromEntries(LG_COLS.map((c, i) => [c, row[i]]));
    const o = by.get(r.k);
    if (!o) { by.set(r.k, { ...r, club, clubs: [club], _avr: r.avr != null ? [[r.avr, r.gp]] : [] }); return; }
    o.clubs.push(club);
    if ((r.gp || 0) > (o._big || 0)) { o.club = club; o._big = r.gp; }
    LG_SUM.forEach(c => { if (r[c] != null) o[c] = (o[c] || 0) + r[c]; });
    if (r.avr != null) o._avr.push([r.avr, r.gp]);
  }));
  const rows = [...by.values()].map(o => {
    const n = o._avr.reduce((s, x) => s + x[1], 0);
    if (o._avr.length > 1 && n) o.avr = o._avr.reduce((s, x) => s + x[0] * x[1], 0) / n;
    if (o.clubs.length > 1 && o.min && o.svp != null) o.svp = null;
    return lgDerive(o);
  });
  const sk = rows.filter(r => !r.isG), min = Math.max(5, Math.round(Math.max(0, ...sk.map(r => r.gp || 0)) / 3));
  const elig = sk.filter(r => r.gp >= min);
  ["p_gp", "g_gp", "a_gp", "s_gp", "shp", "avr"].forEach(k => {
    const vals = elig.map(r => r[k]).filter(v => v != null).sort((a, b) => a - b);
    elig.forEach(r => {
      if (r[k] == null || !vals.length) return;
      const lo = vals.filter(v => v < r[k]).length, eq = vals.filter(v => v === r[k]).length;
      (r.pct ||= {})[k] = Math.round(100 * (lo + eq / 2) / vals.length);
    });
  });
  rows.minGp = min;
  LGC[id] = { data: D, rows };
  return rows;
}
const lgName = r => r.pl ? `<a class="pcell" href="${route(r.k)}"><span><b>${esc(r.n)}</b></span></a>` : `<b title="No longer in the data">${esc(r.n)}</b>`;
const lgHref = (lg, tab, season, key) => `${leagueRoute(lg)}/${tab}/${season}${key ? "/" + key : ""}`;
const n2 = (v, d = 2) => v == null ? dash : v.toFixed(d);
const pctCell = (lg, season, key) => r => r.pct?.[key] == null ? dash : impPill(r.pct[key], lgHref(lg, "players", season, key));

function lgSkCols(lg, season, view) {
  const basic = [["gp", "GP", r => r.gp, r => r.gp ?? dash], ["g", "G", r => r.g, r => r.g ?? dash], ["a", "A", r => r.a, r => r.a ?? dash],
    ["p", "P", r => r.p, r => r.p == null ? dash : `<b>${r.p}</b>`], ["pm", "+/−", r => r.pm, r => r.pm == null ? dash : (r.pm > 0 ? "+" : "") + r.pm],
    ["pim", "PIM", r => r.pim, r => r.pim ?? dash], ["s", "SOG", r => r.s, r => r.s ?? dash, "Shots on goal"],
    ["shp", "Sh%", r => r.shp, r => r.shp == null ? dash : (100 * r.shp).toFixed(1), "Goals per shot on goal"],
    ["avr", "Av R", r => r.avr, r => n2(r.avr), "Average game rating"]];
  const adv = [["gp", "GP", r => r.gp, r => r.gp ?? dash], ["p_gp", "P/GP", r => r.p_gp, r => n2(r.p_gp)], ["g_gp", "G/GP", r => r.g_gp, r => n2(r.g_gp)],
    ["a_gp", "A/GP", r => r.a_gp, r => n2(r.a_gp)], ["s_gp", "SOG/GP", r => r.s_gp, r => n2(r.s_gp, 1)], ["pim_gp", "PIM/GP", r => r.pim_gp, r => n2(r.pim_gp)],
    ["pp", "Points", r => r.pct?.p_gp, pctCell(lg, season, "p_gp"), "Points per game: percentile in the league"],
    ["pg", "Goals", r => r.pct?.g_gp, pctCell(lg, season, "g_gp"), "Goals per game: percentile in the league"],
    ["pa", "Assists", r => r.pct?.a_gp, pctCell(lg, season, "a_gp"), "Assists per game: percentile in the league"],
    ["ps", "Shots", r => r.pct?.s_gp, pctCell(lg, season, "s_gp"), "Shots on goal per game: percentile in the league"],
    ["pr", "Rating", r => r.pct?.avr, pctCell(lg, season, "avr"), "Average game rating: percentile in the league"],
    ];
  return view === "adv" ? adv : basic;
}
function lgSort(rows, cols) {
  const col = cols.find(c => c[0] === LS.sort) || cols.find(c => c[0] === "p" || c[0] === "p_gp");
  return rows.slice().sort((x, y) => ((col[2](y) ?? -1e9) - (col[2](x) ?? -1e9)) * -LS.dir || (y.p || 0) - (x.p || 0));
}
const lgViewSeg = () => `<span class="seg" id="lg-view" role="group" aria-label="Columns">${[["basic", "Basic"], ["adv", "Advanced"]].map(([v, t]) =>
  `<button type="button" data-v="${v}" class="${LS.view === v ? "on" : ""}">${t}</button>`).join("")}</span>`;
function lgSkTable(lg, season, rows, withClub) {
  const cols = lgSkCols(lg, season, LS.view);
  if (!cols.some(c => c[0] === LS.sort)) { LS.sort = LS.view === "adv" ? "p_gp" : "p"; LS.dir = -1; }
  return `<table class="rank tp"><thead><tr><th class="num">#</th><th class="pcol">Player</th>${withClub ? "<th>Club</th>" : ""}<th>Pos</th><th class="num">Age</th>${cols.map(([k, h, , , tip]) => sortTh(LS, k, h, tip)).join("")}</tr></thead><tbody>
    ${rows.map((r, i) => `<tr class="${r.pl ? "link" : ""}"${r.pl ? ` data-k="${esc(r.k)}"` : ""}><td class="num muted">${i + 1}</td><th scope="row" class="pcol" title="${esc(r.n)}">${lgName(r)}</th>
      ${withClub ? `<td>${r.clubs.map(c => tname(c)).join(" / ")}</td>` : ""}<td>${esc(r.pl?.pos || r.pos || "")}</td><td class="num">${r.pl ? r.pl.age : dash}</td>
      ${cols.map(([, , , cell]) => `<td class="num">${cell(r)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}
function lgGoalieTable(rows, withClub) {
  return `<table class="rank tp"><thead><tr><th class="pcol">Goalie</th>${withClub ? "<th>Club</th>" : ""}<th class="num">Age</th><th class="num">GP</th><th class="num">W</th><th class="num">L</th>
    <th class="num" title="Overtime / shootout losses">OTL</th><th class="num">GA</th><th class="num">GAA</th><th class="num">SV%</th><th class="num">Av R</th>${""}</tr></thead><tbody>
    ${rows.map(r => `<tr class="${r.pl ? "link" : ""}"${r.pl ? ` data-k="${esc(r.k)}"` : ""}><th scope="row" class="pcol" title="${esc(r.n)}">${lgName(r)}</th>${withClub ? `<td>${r.clubs.map(c => tname(c)).join(" / ")}</td>` : ""}
      <td class="num">${r.pl ? r.pl.age : dash}</td><td class="num">${r.gp ?? dash}</td><td class="num">${r.w ?? dash}</td><td class="num">${r.l ?? dash}</td><td class="num">${r.t ?? dash}</td>
      <td class="num">${r.ga ?? dash}</td><td class="num">${n2(r.gaa)}</td><td class="num">${r.svp != null ? r.svp.toFixed(3).replace(/^0/, "") : dash}</td><td class="num">${n2(r.avr)}</td>
      ${""}</tr>`).join("")}</tbody></table>`;
}

const kindSeg = (lg, season) => {
  const kinds = ["R", "P"].filter(k => LGD[lg]?.seasons?.[season]?.[k]);
  if (!kinds.includes(LS.kind)) LS.kind = kinds[0] || "R";
  return kinds.length > 1 ? `<span class="seg" id="lg-kind">${kinds.map(k => `<button type="button" data-k="${k}" class="${LS.kind === k ? "on" : ""}">${k === "R" ? "Regular season" : "Playoffs"}</button>`).join("")}</span>` : "";
};
const lgLeaders = (rows, title, cell, n = 5) => `<section class="card-box"><h3 class="box-h3">${title}</h3><ol class="lead-list">${rows.slice(0, n).map(r =>
  `<li>${r.pl ? `<a href="${route(r.k)}">${esc(r.n)}</a>` : esc(r.n)} <span class="muted small">${r.clubs.map(c => esc(NHL_TEAMS[c]?.[0] || c)).join(" / ")}</span><b>${cell(r)}</b></li>`).join("") || '<li class="muted">No games yet</li>'}</ol></section>`;
const leagueStrip = cur => `<nav class="lgtabs" aria-label="Leagues"><a href="#/teams" class="${cur === "NHL" ? "on" : ""}">NHL</a>${leagueNames().map(l =>
  `<a href="${leagueRoute(l)}" class="${l === cur ? "on" : ""}"${l === cur ? ' aria-current="page"' : ""}>${esc(l)}</a>`).join("")}</nav>`;

function renderLeague(lg, tab = "overview", season, arg) {
  markNav("teams");
  if (!hasLeague(lg)) { view.innerHTML = `<div class="wrap page"><div class="panel">No page for this league. <a href="#/teams">Teams</a></div></div>`; return; }
  const L = LGD[lg], seasons = lgSeasons(lg);
  season = lgSeason(lg, season);
  if (!["overview", "players", "teams", "prospects"].includes(tab)) tab = "overview";

  if (tab === "players" && arg) { LS.view = "adv"; LS.sort = { avr: "pr" }[arg] || arg; LS.dir = -1; LS.limit = 100; }
  const people = lgPeople(lg);
  const stale = L.read && L.read !== D.dates.at(-1);
  const head = `<section class="band"><div class="wrap">${leagueStrip(lg)}
    <h1>${esc(lg)}</h1><p class="lede">${L.clubs.length} clubs · ${people.length.toLocaleString()} players in the data${stale ? ` · last read ${fmtDate(L.read)} (the latest crawl skipped this league)` : ` · snapshot ${fmtDate(D.dates.at(-1))}`}.
      No box scores outside the NHL: stats come from each player's History tab${""}.</p>
    ${tabBar("League sections", [["overview", "Overview"], ["players", "Player stats"], ["teams", "Teams"], ["prospects", "Prospects"]], tab)}</div></section>`;
  let body = "";
  if (tab === "overview") {
    const pl = lgPlayers(lg, season, "R"), sk = pl.filter(r => !r.isG), gk = pl.filter(r => r.isG);
    const minG = Math.max(3, Math.round(Math.max(0, ...gk.map(r => r.gp || 0)) / 3));
    const by = (rows, k, dir = -1) => rows.filter(r => r[k] != null).sort((a, b) => (a[k] - b[k]) * dir);

    const young = people.filter(p => p.age <= 21).sort(lgListOrder).slice(0, 8);

    const youngBox = `<section class="card-box grow"><h2 class="box-h3">Top prospects</h2><p class="sub">Aged 21 or under: clubs' Top Prospects lists, then the NHL draft ranking</p>
          ${young.map(p => listRow(p, `<span class="lnum small">${lgListTag(p)}</span>`)).join("")}
          ${moreLink(`${leagueRoute(lg)}/prospects`, "All prospects")}</section>`;
    body = `<div class="cardbar"><h2 class="flat">${seasonLabel(season)}</h2>${seasonSelect("lg-season", seasons, season)}</div>
      ${""}
      <div class="row four">
        ${lgLeaders(by(sk, "p"), "Points", r => r.p)}
        ${lgLeaders(by(sk, "g"), "Goals", r => r.g)}
        ${lgLeaders(by(sk, "a"), "Assists", r => r.a)}
        ${lgLeaders(by(gk.filter(r => r.gp >= minG && r.svp != null), "svp"), `Save % <span class="muted small">${minG}+ GP</span>`, r => r.svp.toFixed(3).replace(/^0/, ""))}
      </div>
      <p class="small">${moreLink(lgHref(lg, "players", season), "Every player's stats")}</p>
      <div class="row">
        ${""}
        ${young.length ? youngBox : ""}
      </div>`;
  } else if (tab === "players") {
    const kinds = kindSeg(lg, season);
    const all = lgPlayers(lg, season, LS.kind);
    const clubs = [...new Set(all.flatMap(r => r.clubs))].sort((a, b) => a.localeCompare(b));
    if (!clubs.includes(LS.club)) LS.club = "";
    let sk = all.filter(r => !r.isG && (!LS.club || r.clubs.includes(LS.club)) && (!LS.grp || r.pl?.grp === LS.grp));
    if (LS.view === "adv" && !LS.club) sk = sk.filter(r => r.gp >= all.minGp);
    sk = lgSort(sk, lgSkCols(lg, season, LS.view));
    const gk = all.filter(r => r.isG && (!LS.club || r.clubs.includes(LS.club))).sort((a, b) => (b.min || 0) - (a.min || 0));
    body = `<form class="filters card-box" aria-label="Filters">
        ${seasonSelect("lg-season", seasons, season)}${kinds}
        <fieldset><legend>Position</legend><div class="seg" id="lg-grp">${[["", "All"], ["F", "Forwards"], ["D", "Defence"]].map(([v, t]) => `<button type="button" data-v="${v}" class="${v === LS.grp ? "on" : ""}">${t}</button>`).join("")}</div></fieldset>
        <label>Club <select id="lg-club"><option value="">All clubs</option>${clubs.map(c => `<option ${c === LS.club ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label>
        <span class="count">${sk.length.toLocaleString()} skaters</span></form>
      <section class="card-box flush" aria-label="Skaters"><div class="box-h tp-head"><h2>Skaters <span class="muted">${sk.length}</span></h2>${lgViewSeg()}</div>
        <div class="tablewrap">${lgSkTable(lg, season, sk.slice(0, LS.limit), true)}</div>
        ${sk.length > LS.limit ? `<div class="more"><button class="ghost" id="lg-more" type="button">Show more (${(sk.length - LS.limit).toLocaleString()} left)</button></div>` : ""}
        <p class="sub pad">${LS.view === "adv" ? `Per-game rates and their percentile among the league's skaters with ${all.minGp}+ games (fewer games: not ranked${LS.club ? "" : ", not listed"}). Each pill opens the league sorted by that rate.` : "Season totals over his clubs in this league. Click a header to sort."}</p></section>
      ${gk.length ? `<section class="card-box flush" aria-label="Goalies"><h2 class="box-h">Goalies <span class="muted">${gk.length}</span></h2><div class="tablewrap">${lgGoalieTable(gk, true)}</div>
        <p class="sub pad">SV% for a goalie with lines at two clubs can't be combined (no shots against), so it is left out.</p></section>` : ""}`;
  } else if (tab === "teams") {

    body = `<div class="team-grid">${L.clubs.filter(c => hasClub(c)).map(c => {
      const ps = people.filter(p => clubOf(p) === c);

      const scorer = lgPlayers(lg, season, "R").filter(x => !x.isG && x.clubs.includes(c) && x.p != null).sort((a, b) => b.p - a.p)[0];
      const pay = ps.reduce((s, p) => s + salaryNum(p.sal), 0);
      const who = scorer ? `${scorer.pl ? `<a href="${route(scorer.k)}">${esc(scorer.n)}</a>` : esc(scorer.n)} ${scorer.p} P` : "";
      return `<div class="team-card">${logo(c, 44)}<span>${hasClub(c) ? `<a class="lname" href="${teamRoute(c)}"><b>${esc(c)}</b></a>` : `<b>${esc(c)}</b>`}
        <small>${`${ps.length} players`}</small>
        <small>${pay ? money(pay) : ""}${who ? `${pay ? " · " : ""}${who}` : ""}</small></span></div>`;
    }).join("")}</div>${""}`;
  } else if (tab === "prospects") {
    body = lgProspects(people, lg, true);
  }
  view.innerHTML = head + `<div class="wrap page">${body}</div>`;
  bindLeague(() => renderLeague(lg, tab, season), s => (location.hash = lgHref(lg, tab, s)));
}

function lgListOrder(a, b) {
  return (a.tp ? 0 : 1) - (b.tp ? 0 : 1) || (a.tp?.[1] ?? 99) - (b.tp?.[1] ?? 99)
    || (nhlRanks(a)?.rank ?? 999) - (nhlRanks(b)?.rank ?? 999) || a.age - b.age || a.n.localeCompare(b.n);
}
const lgListTag = p => p.tp ? `#${p.tp[1]} ${esc(NHL_TEAMS[p.tp[0]]?.[0] || p.tp[0])}` : nhlRanks(p) ? `NHL list #${nhlRanks(p).rank}` : `<span class="muted">${p.age}</span>`;
function lgProspects(people, lg, withClub) {
  const rows = people.filter(p => p.age <= 21).sort(lgListOrder);
  const listRank = (p, tag) => (p.drs || []).filter(d => d[0].includes(`(${tag})`)).map(d => `${esc(d[0].replace(` (${tag})`, ""))} #${d[1]}`).join("<br>") || dash;
  const chl = (rows.some(p => (p.drs || []).some(d => d[0].includes(`(${lg})`))));
  const dl = p => p.dft?.pro?.pick != null ? linkText(`${p.dft.pro.year} R${p.dft.pro.round} #${p.dft.pro.pick}`, draftHref(p.dft.pro)) + (draftClub(p.dft.pro.team) ? ` ${esc(NHL_TEAMS[draftClub(p.dft.pro.team)][0])}` : "") : dash;
  const shown = rows.slice(0, LS.limit);
  return rows.length ? `<section class="card-box flush"><h2 class="box-h">Prospects <span class="muted">${rows.length}</span></h2><div class="tablewrap"><table class="rank tp"><thead><tr><th class="num">#</th><th class="pcol">Player</th>
      ${withClub ? "<th>Club</th>" : ""}<th>Pos</th><th class="num">Age</th>${""}${chl ? `<th>${esc(lg)} draft list</th>` : ""}<th>NHL draft list</th><th>NHL draft</th></tr></thead><tbody>
    ${shown.map((p, i) => `<tr class="link" data-k="${esc(p.k)}"><td class="num muted">${i + 1}</td><th scope="row" class="pcol" title="${esc(p.n)}"><a class="pcell" href="${route(p.k)}"><span><b>${esc(p.n)}</b></span></a></th>
      ${withClub ? `<td>${tname(clubOf(p))}</td>` : ""}<td>${esc(p.pos)}</td><td class="num">${p.age}</td>${""}${chl ? `<td class="small">${listRank(p, lg)}</td>` : ""}<td class="small">${listRank(p, "NHL")}</td><td class="small">${dl(p)}</td></tr>`).join("")}
    </tbody></table></div>${rows.length > LS.limit ? `<div class="more"><button class="ghost" id="lg-more" type="button">Show more (${(rows.length - LS.limit).toLocaleString()} left)</button></div>` : ""}
    <p class="sub pad">${"Order: each club's Top Prospects list first (its own order), then the NHL draft ranking, then by age."} Draft lists: EHM's ranking lists of the latest snapshot.</p></section>` : `<p class="muted">No players aged 21 or under.</p>`;
}

function bindLeague(rerender, goSeason) {
  view.querySelector("#lg-season")?.addEventListener("change", e => { LS.limit = 100; goSeason(e.target.value); });
  view.querySelectorAll("#lg-kind button").forEach(b => b.onclick = () => { LS.kind = b.dataset.k; rerender(); });
  view.querySelectorAll("#lg-view button").forEach(b => b.onclick = () => { LS.view = b.dataset.v; rerender(); });
  view.querySelectorAll("#lg-grp button").forEach(b => b.onclick = () => { LS.grp = b.dataset.v; LS.limit = 100; rerender(); });
  view.querySelector("#lg-club")?.addEventListener("change", e => { LS.club = e.target.value; LS.limit = 100; rerender(); });
  view.querySelector("#lg-more")?.addEventListener("click", () => { LS.limit += 200; rerender(); });
  bindSortHeads(LS, rerender);
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
  view.querySelectorAll("tr.tlink[data-club]").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) location.hash = teamRoute(tr.dataset.club); });
}

const LG_TEAM_TABS = [["roster", "Roster"], ["players", "Player stats"], ["history", "History"], ["prospects", "Prospects"]];
function renderLeagueTeam(club, lg, ps, tab, arg) {
  if (!LG_TEAM_TABS.some(t => t[0] === tab)) tab = "roster";
  const seasons = lgSeasons(lg).filter(s => Object.values(LGD[lg].seasons[s]).some(kd => kd[club]));
  if (!seasons.length && !["roster", "prospects"].includes(tab)) tab = "roster";
  const season = seasons.includes(arg) ? arg : seasons.at(-1);

  const pay = ps.reduce((s, p) => s + salaryNum(p.sal), 0);
  const mates = LGD[lg].clubs.filter(hasClub);
  view.innerHTML = `<section class="band"><div class="wrap">
    <div class="team-head">${logo(club, 72)}
      <div class="grow"><h1>${esc(club)}</h1><p class="lede">${lgLink(lg)} · ${ps.length} players${""} · snapshot ${fmtDate(D.dates.at(-1))}</p></div>
      <span class="inline team-nav"><label class="inline">Team <select id="team-sel">${mates.map(c => `<option ${c === club ? "selected" : ""}>${esc(c)}</option>`).join("")}</select></label><a href="${leagueRoute(lg)}">${esc(lg)}</a></span>
    </div>
    ${tabBar("Team sections", LG_TEAM_TABS.filter(([k]) => k === "roster" || k === "prospects" || seasons.length), tab)}
  </div></section>
  <div class="wrap page">${tab === "players" ? lgTeamPlayers(club, lg, season, seasons)
    : tab === "history" ? lgTeamHistory(club, lg, seasons) : tab === "prospects" ? lgProspects(ps, lg, false) : rosterTab(club, ps, pay)}</div>`;
  view.querySelector("#team-sel")?.addEventListener("change", e => (location.hash = teamRoute(e.target.value) + tabHash(tab)));
  view.querySelectorAll(".ptabs [data-tab]").forEach(b => b.onclick = () => (location.hash = teamRoute(club) + tabHash(b.dataset.tab)));
  if (tab === "roster") { bindRoster(club, ps); view.querySelector("#t-season")?.closest("label")?.remove(); }
  else bindLeague(() => renderLeagueTeam(club, lg, ps, tab, season), s => (location.hash = `${teamRoute(club)}/${tab}/${s}`));
}
function lgTeamPlayers(club, lg, season, seasons) {
  const kinds = kindSeg(lg, season);
  const league = new Map(lgPlayers(lg, season, LS.kind).map(r => [r.k, r]));
  const rows = (LGD[lg].seasons[season][LS.kind]?.[club] || []).map(row => {
    const r = lgRow(row, club);
    r.pct = league.get(r.k)?.clubs.length === 1 ? league.get(r.k).pct : null;
    return r;
  });
  const sk = lgSort(rows.filter(r => !r.isG), lgSkCols(lg, season, LS.view)), gk = rows.filter(r => r.isG).sort((a, b) => (b.min || 0) - (a.min || 0));
  return `<div class="cardbar"><div><h2 class="flat">${seasonLabel(season)} ${LS.kind === "P" ? "playoffs" : "regular season"}</h2>
      <p class="sub">His games for ${esc(club)}, from the History tab of the last snapshot that showed him here.</p></div>
      <span class="inline">${kinds}${seasonSelect("lg-season", seasons, season)}</span></div>
    <section class="card-box flush" aria-label="Skaters"><div class="box-h tp-head"><h2>Skaters <span class="muted">${sk.length}</span></h2>${lgViewSeg()}</div>
      <div class="tablewrap">${lgSkTable(lg, season, sk, false)}</div>
      ${LS.view === "adv" ? `<p class="sub pad">Percentiles: his per-game rates against the ${esc(lg)}'s skaters with enough games; each pill opens that league ranking.</p>` : ""}</section>
    ${gk.length ? `<section class="card-box flush" aria-label="Goalies"><h2 class="box-h">Goalies <span class="muted">${gk.length}</span></h2><div class="tablewrap">${lgGoalieTable(gk, false)}</div></section>` : ""}`;
}
function lgTeamHistory(club, lg, seasons) {
  const rows = seasons.slice().reverse().map(s => {

    const lines = (LGD[lg].seasons[s].R?.[club] || []).map(row => lgRow(row, club));
    const top = lines.filter(x => !x.isG).sort((a, b) => (b.p || 0) - (a.p || 0))[0];
    const g = lines.filter(x => x.isG).sort((a, b) => (b.min || 0) - (a.min || 0))[0];
    const po = (LGD[lg].seasons[s].P?.[club] || []).length;
    const nm = x => x.pl ? `<a href="${route(x.k)}">${esc(x.n)}</a>` : esc(x.n);
    return `<tr><th scope="row">${seasonLabel(s)}</th>${""}<td>${po ? "Yes" : '<span class="muted">–</span>'}</td>
      <td>${top ? `${nm(top)} <span class="muted small">${top.p} P</span>` : dash}</td><td>${g ? `${nm(g)} <span class="muted small">${g.svp != null ? g.svp.toFixed(3).replace(/^0/, "") : n2(g.gaa)}</span>` : dash}</td></tr>`;
  }).join("");
  return `<section class="card-box flush"><h2 class="box-h">Season by season${""}</h2><div class="tablewrap"><table class="rank tp"><thead><tr><th>Season</th>${""}<th>Playoffs</th><th>Top scorer</th><th>Main goalie (SV%)</th></tr></thead><tbody>${rows}</tbody></table></div>
    <p class="sub pad">Seasons inside this save only, as far as the snapshots saw them; the current season is to date.${""}</p></section>`;
}
