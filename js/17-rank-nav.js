"use strict";

const teamRankHref = (key, club, season = key === "pool" ? null : SEASON) => `#/rank/team/${key}/${encodeURIComponent(club)}${season ? "/" + season : ""}`;

const cardGrp = (p0, kind) => (kind === "m" || kind === "c") ? (cardOf(p0, kind)?.card?.grp || p0.grp) : p0.grp;
const pRankHref = (kind, key, grp, k) => { const p0 = byKey.get(k);
  return `#/rank/p/${kind}/${encodeURIComponent(key)}/${p0 ? cardGrp(p0, kind) : grp}/${encodeURIComponent(k)}`
    + (["m", "c", "war", "x"].includes(kind) && SEASON ? `/${SEASON}/${PMODE}` : ""); };
const rankLink = (href, html) => `<a class="ranklink" href="${href}">${html}</a>`;
function cardOf(p0, kind) {
  const b = inSeason(p0);
  if (kind === "ca" || kind === "g" || PMODE !== "po") return b;
  return b.po ? { ...b, card: { ...b.po.card }, _po: true } : null;
}
function teamRankRows(key) {
  if (key === "pool") return null;
  const T = teamTable(SEASON);
  if (!T) return null;
  const label = Object.fromEntries((D.teamStatKeys || []).map(([k, l]) => [k, l]));
  const rows = Object.entries(T.teams).map(([abbr, r]) => {
    const club = clubOfAbbr(abbr);
    if (key === "pts") return { club, v: r.pts, rank: r.place, txt: `${r.pts}`, extra: `${r.w}–${r.l}–${r.otl} · ${r.gp} GP` };
    const s = r.stats[key];
    return s ? { club, v: s[0], rank: s[1], txt: statFmt(key, s[0]) } : null;
  }).filter(Boolean).sort((a, b) => a.rank - b.rank);
  if (!rows.length) return null;
  return { rows, title: key === "pts" ? "Standings points" : label[key] || key, seasonal: true,
           sub: `${seasonLabel(SEASON)} regular season · league average ${key === "pts" ? statFmt("pts", T.avg.pts) : statFmt(key, T.avg[key])} · 1st is best` };
}
function playerRankRows(kind, key, grp) {

  if (kind === "x") return derivedRankRows(key, grp);
  const val = {
    m: p => p.card?.pct?.[key] == null ? null : [p.card.pct[key], rawFmt(key, p.card.raw?.[key])],
  }[kind];
  if (!val) return null;
  const rows = D.players.filter(p => cardGrp(p, kind) === grp).map(p0 => {
    const p = cardOf(p0, kind), x = p && val(p);
    return x ? { p, pct: x[0], txt: x[1] } : null;
  }).filter(Boolean).sort((a, b) => b.pct - a.pct);
  rows.forEach((r, i) => { r.rank = i && r.pct === rows[i - 1].pct ? rows[i - 1].rank : i + 1; });
  const metric = [...(D.skaterMetrics || []), ...(D.goalieMetrics || [])].find(m => m[0] === key);
  const title = { m: metric?.[1] || key }[kind];
  const grpName = { F: "forwards", D: "defence", G: "goalies" }[grp];
  const games = kind === "ca" || kind === "g" ? "whole database" : `${SEASON ? seasonLabel(SEASON) : ""} ${PMODE === "po" ? "playoffs" : "regular season"}, NHL players with a big enough sample`;
  return { rows, title, sub: `Every ${grpName.replace(/s$/, "")} with a value · ${games} · percentile vs this list` };
}
function renderRank(raw) {

  const parts = raw.split("/").map(decodePart);
  const isTeam = parts[0] === "team";
  markNav(isTeam ? "teams" : "players");
  if (isTeam && SEASONS.includes(parts[3])) SEASON = parts[3];
  if (!isTeam && SEASONS.includes(parts[5])) SEASON = parts[5];
  if (!isTeam && ["rs", "po"].includes(parts[6])) PMODE = parts[6];
  const R = isTeam ? teamRankRows(parts[1]) : parts[0] === "p" ? playerRankRows(parts[1], parts[2], parts[3]) : null;
  if (!R || !R.rows.length) { view.innerHTML = `<div class="wrap page"><div class="panel">No ranking here. <a href="#/teams">Teams</a> · <a href="#/players">Players</a></div></div>`; return; }
  const me = isTeam ? parts[2] : parts[4];

  const tabFor = !isTeam ? "" : parts[1] === "pool" ? "/prospects" : parts[1] === "pts" ? "" : "/stats";
  const back = isTeam ? (hasClub(me) ? `<a href="${teamRoute(me)}${parts[1] === "pool" ? "/prospects" : parts[1] === "pts" ? "" : "/stats"}">← ${esc(me)}</a>` : "")
    : (me && byKey.get(me) ? `<a href="${route(me)}">← ${esc(byKey.get(me).n)}</a>` : "");
  const seasons = isTeam && R.seasonal ? SEASONS.filter(s => teamTable(s)?.teams) : !isTeam && !["ca", "g", "po", "t"].includes(parts[1]) ? SEASONS : [];
  const body = isTeam
    ? `<table class="rank"><thead><tr><th class="num">Rank</th><th>Team</th><th class="num">${esc(R.title)}</th>${R.rows[0].extra ? "<th>Record</th>" : ""}</tr></thead><tbody>
        ${R.rows.map(r => `<tr class="tlink${r.club === me ? " hl" : ""}" data-club="${esc(r.club)}"><td class="num">${rankChip(r.rank, R.rows.length)}</td>
          <th scope="row" class="nowrap"><a href="${teamRoute(r.club)}${tabFor}">${logo(r.club, 24)} ${esc(r.club)}</a></th><td class="num"><b>${r.txt}</b></td>${r.extra ? `<td class="small muted">${r.extra}</td>` : ""}</tr>`).join("")}</tbody></table>`
    : `<table class="rank"><thead><tr><th class="num">Rank</th><th class="pcol">Player</th><th>Club</th><th class="num">Age</th>${""}${R.rows.some(r => r.txt) ? `<th class="num">${esc(R.title)}</th>` : ""}<th class="num">Percentile</th></tr></thead><tbody>
        ${R.rows.map(r => `<tr class="link${r.p.k === me ? " hl" : ""}" data-k="${esc(r.p.k)}"><td class="num">${r.rank}</td>
          <th scope="row" class="pcol"><a class="pcell" href="${route(r.p.k)}"><span><b>${esc(r.p.n)}</b></span></a></th>
          <td class="nowrap">${tlink(clubOf(r.p), `${logo(clubOf(r.p), 22)} ${esc(clubOf(r.p))}`)}${r.p.lg && r.p.lg !== "NHL" ? ` <span class="muted small">${esc(r.p.lg)}</span>` : ""}</td>
          <td class="num">${r.p.age}</td>${""}${R.rows.some(x => x.txt) ? `<td class="num">${esc(r.txt || "")}</td>` : ""}<td class="num">${impPill(r.pct)}</td></tr>`).join("")}</tbody></table>`;
  view.innerHTML = `<section class="band"><div class="wrap"><div class="cardbar">${back}<span></span></div><h1>${esc(R.title)}</h1>
      <p class="lede">${R.sub}. ${R.rows.length} ${isTeam ? "teams" : "players"}.</p></div></section>
    <div class="wrap page">
      ${seasons.length > 1 ? `<div class="cardbar"><span></span>${seasonSelect("rk-season", seasons, SEASON)}</div>` : ""}
      <section class="card-box flush"><div class="tablewrap">${body}</div></section></div>`;
  view.querySelector("#rk-season")?.addEventListener("change", e => {
    SEASON = e.target.value;
    location.hash = isTeam ? teamRankHref(parts[1], parts[2] || "", SEASON) : pRankHref(parts[1], parts[2], parts[3], parts[4] || "");
  });
  view.querySelectorAll("tr.link").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) playerRow(tr); });
  view.querySelectorAll("tr.tlink").forEach(tr => tr.onclick = e => { if (!e.target.closest("a")) location.hash = teamRoute(tr.dataset.club) + tabFor; });
  const hl = view.querySelector("tr.hl");
  if (hl) setTimeout(() => hl.scrollIntoView({ block: "center" }), 0);
}

const SCROLL = new Map();
let ORIGIN = null;
const pkeyOf = h => (h.startsWith("#/p/") ? h.slice(4).split("/")[0] : null);
function parentOf(hash) {
  const parts = String(hash || "").replace(/^#\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return null;
  if (parts.length === 1) return "#/";
  if ((parts[0] === "team" || parts[0] === "league") && parts.length === 2) return "#/teams";
  if (parts[0] === "playoffs" && !playoffSeasons().includes(parts[1])) return "#/playoffs";
  if (parts[0] === "playoffs" && parts[2] === "game") return `#/playoffs/${parts[1]}/games`;
  if (parts[0] === "rank") return "#/players";
  return "#/" + parts.slice(0, -1).join("/");
}
const backTarget = hash => (pkeyOf(hash) ? ORIGIN ?? "#/players" : parentOf(hash));
const TEAM_TAB_LABEL = { players: "Player stats", results: "Results", contracts: "Contracts", trades: "Trades", prospects: "Prospects & picks", drafts: "Draft history", stats: "Team stats", history: "History", hof: "Hall of Fame" };
function routeLabel(hash) {
  const parts = hash.slice(2).split("/").map(x => { try { return decodeURIComponent(x); } catch (e) { return x; } });
  switch (parts[0]) {
    case "p": { const p = byKey.get(parts[1]) || ALUMNI.get(parts[1]); return p ? p.n : "Player"; }
    case "players": return "Players";
    case "prospects": return "Prospects" + (parts[1] ? " · " + (PROSPECT_TABS.find(t => t[0] === parts[1])?.[1] || parts[1]) : "");
    case "draft": return parts[1] === "past" ? "Past drafts" : parts[1] === "scores" ? "Drafters" : "Draft board";
    case "teams": return "Teams";
    case "value": return "Value" + (parts[1] ? " · " + (VALUE_TABS.find(t => t[0] === parts[1])?.[1] || parts[1]) : "");
    case "team": return parts[1] + (TEAM_TAB_LABEL[parts[2]] ? " · " + TEAM_TAB_LABEL[parts[2]] : "");
    case "rank": return "Ranking";
    case "hof": return "Hall of Fame";
    case "playoffs": return parts[2] === "game" ? "Playoff box score" : parts[2] === "games" ? (parts[3] ? "Playoff series" : "Playoff games") : "Playoffs" + (parts[1] ? " " + seasonLabel(parts[1]) : "");
    case "league": return parts[1] || "League";
    case "h2h": return "Head to head";
    case "trade": return "Trade predictor";
    case "about": return "How it works";
    default: return "Home";
  }
}

function backLink() {
  const h = backTarget(location.hash) || "#/";
  return `<a href="${esc(h)}">← ${esc(routeLabel(h))}</a>`;
}
function onHashChange(e) {
  const from = new URL(e.oldURL).hash, to = location.hash;
  SCROLL.set(from || "#/", scrollY);
  const restore = (to || "#/") === (backTarget(from) || "#/");
  if (pkeyOf(to) && !pkeyOf(from)) ORIGIN = from || "#/";
  render();
  const y = restore && SCROLL.get(to || "#/");
  if (y) { scrollTo(0, y); setTimeout(() => scrollTo(0, y), 0); }
}
