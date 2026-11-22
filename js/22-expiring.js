"use strict";

let EXP_POS = "";

let expiringClass;

let expiringTable;

function renderExpiring(offsetText, pos) {
  markNav("expiring");
  const offset = offsetText === "1" ? 1 : 0, year = seasonEndNow() + offset;
  EXP_POS = pos != null ? decodePart(pos) : EXP_POS;
  const all = expiringClass(offset), rows = EXP_POS ? all.filter(r => (r.p.grp || r.p.pos) === EXP_POS || r.p.pos === EXP_POS) : all;
  const ufa = rows.filter(r => r.fa.t.startsWith("UFA")), rfa = rows.filter(r => r.fa.t.startsWith("RFA"));
  const guess = all.some(r => r.fa.t.endsWith("*"));
  const tab = (o, label) => `<a class="${o === offset ? "on" : ""}" href="#/expiring${o ? "/1" : ""}${EXP_POS ? (o ? "/" : "//") + encodeURIComponent(EXP_POS) : ""}">${label}</a>`;
  view.innerHTML = `<section class="band"><div class="wrap"><h1>Expiring contracts</h1>
      <p class="lede">Players on NHL deals (NHL rosters, and those playing in the AHL, shown under their NHL club) whose deal ends after the ${seasonName(year)} season, split into unrestricted and restricted free agents. Sorted by ${D.pure ? "cap hit" : ""}; click a header to sort.</p></div></section>
    <div class="wrap page">
      <div class="cardbar"><span class="seg">${tab(0, "This season's class")}${tab(1, "Next season's class")}</span>
        <label class="inline">Position <select id="exp-pos"><option value="">All</option>${["F", "D", "G"].map(g => `<option value="${g}"${EXP_POS === g ? " selected" : ""}>${g}</option>`).join("")}</select></label></div>
      <section class="card-box flush" aria-label="Upcoming UFAs"><h2 class="box-h">Upcoming UFAs <span class="muted">${ufa.length}</span></h2>${expiringTable(ufa, "UFA")}</section>
      <section class="card-box flush" aria-label="Upcoming RFAs"><h2 class="box-h">Upcoming RFAs <span class="muted">${rfa.length}</span></h2>${expiringTable(rfa, "RFA")}</section>
      <p class="small muted">Status is the game's own (Contract tab) where it was read; <b>*</b> = estimated from his age at expiry (under 27 = RFA). A player with an extension already signed isn't listed.${""}</p>
    </div>`;
  document.getElementById("exp-pos").onchange = e => { location.hash = `#/expiring${offset ? "/1" : ""}${offset ? "/" : "//"}${encodeURIComponent(e.target.value)}`; };
  makeSortable();
}
