"use strict";

/* Expiring contracts: #/expiring[/<offset>[/<pos>]]. Two lists, upcoming UFAs and upcoming RFAs: NHL players whose last deal
   ends at the end of the season (offset 0, this season; 1 = the next class). A player with an extension signed already has a
   later last deal, so he isn't listed. RFA/UFA is the game's own wording where the Contract tab was read, else estimated
   from his age at expiry (marked *, see faStatus). */
let EXP_POS = "";   // position filter for the session
function expiringClass(offset) {
  const year = seasonEndNow() + offset;
  return D.players.filter(p => p.lg === "NHL" && clubOf(p) && dealsOf(p).at(-1)?.e === year).map(p => {
    const fa = faStatus(p), c = contractInfo(p), v = playerValue(p), cv = contractValue(p);
    return { p, fa, sal: c.cur?.sal ?? salaryNum(p.sal), war: v.last, exp: v.now, surplus: cv?.surplus ?? null, year };
  }).filter(r => r.fa);
}
function expiringTable(rows, kind) {
  if (!rows.length) return `<p class="muted">No ${kind}s found.</p>`;
  const body = rows.sort((a, b) => b.p.ca - a.p.ca).map(r => {
    const p = r.p, c = clubOf(p);
    return `<tr class="${c === MY_TEAM ? "hl" : ""}"><th scope="row" class="pcol"><a href="${route(p.k)}"><b>${esc(p.n)}</b></a></th>
      <td>${tname(c, 18)}</td><td>${esc(p.pos)}</td><td class="num">${p.age}</td><td class="num"><b>${fmt(p.ca, 0)}</b></td>
      <td class="num" data-v="${r.sal || ""}">${r.sal ? money(r.sal) : dash}</td><td class="num" data-v="${r.exp ?? ""}">${fmt(r.exp, 1)}</td>
      <td class="num ${r.surplus > 0 ? "up" : r.surplus < 0 ? "down" : ""}" data-v="${r.surplus ?? ""}">${r.surplus == null ? dash : (r.surplus > 0 ? "+" : "") + money(r.surplus)}</td>
      <td title="${esc(r.fa.full)}">${esc(r.fa.t)}</td></tr>`;
  }).join("");
  return `<div class="tablewrap"><table class="rank sortable"><thead><tr><th class="pcol">Player</th><th>Club</th><th>Pos</th><th class="num">Age</th>
    <th class="num on" title="Estimated current ability">Est. CA</th><th class="num" title="Cap hit of the deal in force">Cap hit</th>
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
      <p class="lede">NHL players whose deal ends after the ${seasonName(year)} season, split into unrestricted and restricted free agents. Sorted by estimated ability; click a header to sort.</p></div></section>
    <div class="wrap page">
      <div class="cardbar"><span class="seg">${tab(0, "This season's class")}${tab(1, "Next season's class")}</span>
        <label class="inline">Position <select id="exp-pos"><option value="">All</option>${["F", "D", "G"].map(g => `<option value="${g}"${EXP_POS === g ? " selected" : ""}>${g}</option>`).join("")}</select></label></div>
      <section class="card-box flush" aria-label="Upcoming UFAs"><h2 class="box-h">Upcoming UFAs <span class="muted">${ufa.length}</span></h2>${expiringTable(ufa, "UFA")}</section>
      <section class="card-box flush" aria-label="Upcoming RFAs"><h2 class="box-h">Upcoming RFAs <span class="muted">${rfa.length}</span></h2>${expiringTable(rfa, "RFA")}</section>
      <p class="small muted">Status is the game's own (Contract tab) where it was read; <b>*</b> = estimated from his age at expiry (under 27 = RFA). A player with an extension already signed isn't listed. Surplus uses today's ratings (see Value).</p>
    </div>`;
  document.getElementById("exp-pos").onchange = e => { location.hash = `#/expiring${offset ? "/1" : ""}${offset ? "/" : "//"}${encodeURIComponent(e.target.value)}`; };
  makeSortable();
}
