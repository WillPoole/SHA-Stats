"use strict";

const R = { lg: "NHL", grp: "", team: "", maxAge: "", sort: "", dir: -1, limit: 100, tab: "overview", dev: "future", trait: "", fopen: false };

let peakInfo;

const capHit = p => salaryNum(p.sal) || null;
const tint = v => (v > 0 ? "pos" : v < 0 ? "neg" : "");

const RC = {
  pos: ["Pos", p => p.pos, false, p => `<td>${esc(p.pos)}</td>`],
  age: ["Age", p => p.age, true, p => `<td class="num">${p.age}</td>`],
  lg: ["League", p => p.lg || "", false, p => `<td>${esc(p.lg || "")}</td>`],
  cap: ["Cap hit", p => capHit(p), true, p => `<td class="num">${capHit(p) ? money(capHit(p)) : dash}</td>`, "Listed salary"],
  seas: ["Seasons left", p => (p.lg === "NHL" ? liveContract(p)?.seasons ?? null : null), true, p => { const c = p.lg === "NHL" ? liveContract(p) : null; return `<td class="num">${c ? c.seasons : dash}</td>`; }, "Seasons left on the deal in force, this one included; a signed extension isn't counted (NHL)"],
};

function rankRow(p) {
  if (PMODE !== "po") return p;
  return { ...p, card: { ...(p.po?.card || {}) } };
}
let LEAGUE_N = null;
const leagueCount = lg => (LEAGUE_N ||= D.players.reduce((n, p) => n.set(p.lg, (n.get(p.lg) || 0) + 1), new Map())).get(lg) || 0;
const leagueList = () => (leagueCount(), [...LEAGUE_N.keys()].filter(Boolean).sort((a, b) => LEAGUE_N.get(b) - LEAGUE_N.get(a)));

let CLUB_LG = null;
function clubLeague(club) {
  if (D.clubLeague?.[club]) return D.clubLeague[club];
  if (!CLUB_LG) {
    const n = {};
    D.players.forEach(p => { const c = clubOf(p); if (c && p.lg) (n[c] ||= {})[p.lg] = (n[c][p.lg] || 0) + 1; });
    CLUB_LG = Object.fromEntries(Object.entries(n).map(([c, m]) => [c, NHL_TEAMS[c] ? "NHL" : Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]]));
  }
  return CLUB_LG[club] || "";
}

function clubOptions(sel, lg) {
  const clubs = [...new Set(D.players.filter(p => !lg || p.lg === lg).map(clubOf))].filter(Boolean);
  const order = ["NHL", ...leagueList().filter(l => l !== "NHL"), ""];
  const groups = {};
  clubs.forEach(c => (groups[clubLeague(c)] ||= []).push(c));
  return order.filter(l => groups[l]).map(l => `<optgroup label="${esc(l || "Other clubs")}">${groups[l].sort((a, b) => a.localeCompare(b))
    .map(c => `<option ${c === sel ? "selected" : ""}>${esc(c)}</option>`).join("")}</optgroup>`).join("");
}

const SEASONS = (D.seasons || []).map(s => s.season);
let SEASON = D?.defaultSeason || SEASONS.at(-1) || null;
const seasonLabel = s => `20${s.slice(0, 2)}-${s.slice(3)}`;
function seasonInfo() {
  return (D.seasons || []).find(s => s.season === SEASON) || { games: D.games, gamesPO: D.gamesPO };
}
function inSeason(p) {
  if (!SEASON || SEASON === SEASONS.at(-1)) return p;
  const s = p.ss?.[SEASON];
  return { ...p, card: { ...(s?.card || {}) },
           shots: s?.shots || [], sa: s?.sa || [], po: s?.po || null, _peak: p._peak };
}

function seasonSelect(id, seasons, cur, { cls = "inline", single = "hide", oldestFirst = false } = {}) {
  if (seasons.length < 2 && single === "hide") return "";
  const list = oldestFirst ? seasons : seasons.slice().reverse();
  return `<label class="${cls}">Season <select id="${id}"${seasons.length < 2 && single === "disable" ? " disabled" : ""}>${list.map(s =>
    `<option value="${s}" ${s === cur ? "selected" : ""}>${seasonLabel(s)}</option>`).join("")}</select></label>`;
}

function barRow(label, raw, pct, title, href) {
  const c = pctColor(pct), tag = href && pct != null ? "a" : "div";
  return `<${tag} class="bar"${tag === "a" ? ` href="${href}"` : ""} title="${esc(title || TIP_PCT)}">
    <div class="l">${esc(label)}${raw != null ? `<span>${esc(raw)}</span>` : ""}</div>
    <div class="track"><div class="fill" style="width:${Math.max(2, pct ?? 0)}%;background:${c.bg}"></div></div>
    <div class="v">${pct ?? "–"}</div></${tag}>`;
}
function rawFmt(key, v) {
  if (v == null) return null;
  if (["toi_gp", "pp_toi", "pk_toi"].includes(key)) { const sec = Math.round(v * 60); return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`; }
  if (key === "svp") return v.toFixed(3).replace(/^0/, "");
  return v.toFixed(2);
}

let PMODE = "rs";

let bigGame;

let playoffForm;

let playoffForms;

let playoffHero;
