"use strict";

/* Expiring contracts: #/expiring[/<offset>[/<pos>]]. Two lists, upcoming UFAs and upcoming RFAs: NHL players whose last deal
   ends at the end of the season (offset 0, this season; 1 = the next class). A player with an extension signed already has a
   later last deal, so he isn't listed. RFA/UFA is the game's own wording where the Contract tab was read, else estimated
   from his age at expiry (marked *, see faStatus). */
let EXP_POS = "";   // position filter for the session

/* Re-sign forecast (p.rs, ehm/model/resign.py): the ask from EHM's decoded contract rules and the chance he stays,
   fitted on the training save's expiries. Only present where the build had the hidden values it needs (never on the
   stats sites). */
const rsOf = p => (byKey.get(p.k) || p).rs || null;
const rsM = v => v == null ? dash : "$" + (v / 1e6).toFixed(2) + "M";
const rsPct = rs => rs ? Math.round(rs.stay * 100) + "%" : dash;
const RS_WHY = {
  "score under bar": "",
  "pro shortcut: rep < 0.65 x club rep": "his reputation is well below the club's",
  "wage line passed": "his ask is close to his pay",
  "test the market (wage)": "his ask is well above his pay",
  "time left on contract": "time left on the deal",
};
function rsTalk(rs) {
  return rs.talk ? "Will talk" : "Tests the market";
}
const rsWhy = rs => RS_WHY[rs.why] ?? rs.why;
/* Tooltip text: the ask at every squad status and if he isn't keen on the club. */
function rsAskTip(rs) {
  return [rsAskRange(rs) ? "Likely " + rsAskRange(rs) : "", rs.dep != null && rs.dep !== rs.ask ? "Depth " + rsM(rs.dep) : "",
    rs.key !== rs.ask ? "Key " + rsM(rs.key) : "", rs.cold > rs.ask ? "Up to " + rsM(rs.cold) + " if he isn't keen on the club" : ""].filter(Boolean).join(" · ");
}
function rsAskRange(rs) {
  return rs.lo !== rs.hi ? `${rsM(rs.lo)} – ${rsM(rs.hi)}` : "";
}
const rsNote = () => `Forecast from EHM's decoded contract rules: what he asks his own club as a core player (depth asks less, key more; the term isn't decoded). His interest in the club is hidden from clients and can nearly double the ask; "up to" is the most he asks before he refuses to talk. The chance is how often players like him (age, pay, rank in his club, the rules' verdict) stayed with an AI-run club in the training save; a human GM decides his own offers.${D.rsInfo?.est ? " The hidden values it needs are borrowed from the training save (same database), so it's less certain here." : ""}`;
function expiringClass(offset) {
  const year = seasonEndNow() + offset;
  // NHL rosters, plus minor-leaguers on NHL deals (they carry rs.org, their NHL club)
  return D.players.filter(p => (p.lg === "NHL" && clubOf(p) || rsOf(p)?.org) && dealsOf(p).at(-1)?.e === year).map(p => {
    const fa = faStatus(p), c = contractInfo(p), v = playerValue(p), cv = contractValue(p);
    return { p, fa, sal: c.cur?.sal ?? salaryNum(p.sal), war: v.last, exp: v.now, surplus: cv?.surplus ?? null, year, rs: rsOf(p) };
  }).filter(r => r.fa);
}
function expiringTable(rows, kind) {
  if (!rows.length) return `<p class="muted">No ${kind}s found.</p>`;
  const hasRs = rows.some(r => r.rs);
  const body = rows.sort((a, b) => b.p.ca - a.p.ca).map(r => {
    const p = r.p, c = clubOf(p);
    return `<tr class="${(r.rs?.org || c) === MY_TEAM ? "hl" : ""}"><th scope="row" class="pcol"><a href="${route(p.k)}"><b>${esc(p.n)}</b></a></th>
      <td>${r.rs?.org ? `${tname(r.rs.org, 18)} <span class="small muted" title="Playing for ${esc(c)} in the minors">${esc(p.lg)}</span>` : tname(c, 18)}</td><td>${esc(p.pos)}</td><td class="num">${p.age}</td><td class="num"><b>${fmt(p.ca, 0)}</b></td>
      <td class="num" data-v="${r.sal || ""}">${r.sal ? money(r.sal) : dash}</td>
      ${hasRs ? `<td class="num" data-v="${r.rs?.ask ?? ""}" title="${r.rs ? esc("As a core player. " + rsAskTip(r.rs) + ". " + rsTalk(r.rs) + (rsWhy(r.rs) ? ": " + rsWhy(r.rs) : "")) : ""}">${r.rs ? rsM(r.rs.ask) : dash}</td>
      <td class="num" data-v="${r.rs?.stay ?? ""}">${rsPct(r.rs)}</td>` : ""}<td class="num" data-v="${r.exp ?? ""}">${fmt(r.exp, 1)}</td>
      <td class="num ${r.surplus > 0 ? "up" : r.surplus < 0 ? "down" : ""}" data-v="${r.surplus ?? ""}">${r.surplus == null ? dash : (r.surplus > 0 ? "+" : "") + money(r.surplus)}</td>
      <td title="${esc(r.fa.full)}">${esc(r.fa.t)}</td></tr>`;
  }).join("");
  return `<div class="tablewrap"><table class="rank sortable"><thead><tr><th class="pcol">Player</th><th>Club</th><th>Pos</th><th class="num">Age</th>
    <th class="num on" title="Estimated current ability">Est. CA</th><th class="num" title="Cap hit of the deal in force">Cap hit</th>${hasRs ? `<th class="num" title="What he will ask his club for a new deal (forecast from EHM's contract rules)">Asks</th><th class="num" title="Chance he re-signs with his club (forecast)">Re-sign %</th>` : ""}
    <th class="num" title="Expected WAR this season">Exp. WAR</th><th class="num" title="Worth minus pay over the seasons left on the deal">Surplus</th><th>Status</th></tr></thead><tbody>${body}</tbody></table></div>`;
}
function renderExpiring(offsetText, pos) {
  markNav("expiring");
  const offset = offsetText === "1" ? 1 : 0, year = seasonEndNow() + offset;
  EXP_POS = pos != null ? decodePart(pos) : EXP_POS;
  const all = expiringClass(offset), rows = EXP_POS ? all.filter(r => (r.p.grp || r.p.pos) === EXP_POS || r.p.pos === EXP_POS) : all;
  const ufa = rows.filter(r => r.fa.t.startsWith("UFA")), rfa = rows.filter(r => r.fa.t.startsWith("RFA"));
  const guess = all.some(r => r.fa.t.endsWith("*"));
  const tab = (o, label) => `<a class="${o === offset ? "on" : ""}" href="#/expiring${o ? "/1" : ""}${EXP_POS ? (o ? "/" : "//") + encodeURIComponent(EXP_POS) : ""}">${label}</a>`;
  view.innerHTML = `<section class="band"><div class="wrap"><h1>Expiring contracts</h1>
      <p class="lede">Players on NHL deals (NHL rosters, and those playing in the AHL, shown under their NHL club) whose deal ends after the ${seasonName(year)} season, split into unrestricted and restricted free agents. Sorted by estimated ability; click a header to sort.</p></div></section>
    <div class="wrap page">
      <div class="cardbar"><span class="seg">${tab(0, "This season's class")}${tab(1, "Next season's class")}</span>
        <label class="inline">Position <select id="exp-pos"><option value="">All</option>${["F", "D", "G"].map(g => `<option value="${g}"${EXP_POS === g ? " selected" : ""}>${g}</option>`).join("")}</select></label></div>
      <section class="card-box flush" aria-label="Upcoming UFAs"><h2 class="box-h">Upcoming UFAs <span class="muted">${ufa.length}</span></h2>${expiringTable(ufa, "UFA")}</section>
      <section class="card-box flush" aria-label="Upcoming RFAs"><h2 class="box-h">Upcoming RFAs <span class="muted">${rfa.length}</span></h2>${expiringTable(rfa, "RFA")}</section>
      <p class="small muted">Status is the game's own (Contract tab) where it was read; <b>*</b> = estimated from his age at expiry (under 27 = RFA). A player with an extension already signed isn't listed. Surplus uses today's ratings (see Value).${all.some(r => r.rs) ? " <b>Asks</b> and <b>Re-sign %</b>: " + rsNote() : ""}</p>
    </div>`;
  document.getElementById("exp-pos").onchange = e => { location.hash = `#/expiring${offset ? "/1" : ""}${offset ? "/" : "//"}${encodeURIComponent(e.target.value)}`; };
  makeSortable();
}
