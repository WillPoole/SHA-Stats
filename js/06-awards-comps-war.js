"use strict";

const draftHref = d => d?.pick != null && /NHL/.test(d.draft || "") && draftValues().years.includes(d.year) ? `#/draft/past/${d.year}/${d.pick}` : null;
const prospectHref = p => p.tp && NHL_TEAMS[p.tp[0]] ? teamRoute(p.tp[0]) + "/prospects" : null;
const linkText = (text, href) => text == null ? null : href ? `<a href="${href}">${esc(text)}</a>` : esc(text);
function draftLine(d) {
  if (!d) return null;
  if (d.pick == null) return d.text && d.text !== "-" ? d.text : null;
  return `${d.year} ${d.draft.replace(/ Entry Draft| Priority Selection| Draft$/, "")} draft · Round ${d.round}, #${d.pick} overall · ${d.team}`;
}
const LEAGUE_SHORT = [["National Hockey League", "NHL"], ["American Hockey League", "AHL"], ["Kontinental Hockey League", "KHL"],
  ["Canadian Hockey League", "CHL"], ["Western Hockey League", "WHL"], ["Ontario Hockey League", "OHL"],
  ["Quebec Major Junior Hockey League", "QMJHL"], ["Québec Maritimes Junior Hockey League", "QMJHL"]];
function achText(t) {
  if (/^National Hockey League winners$/.test(t)) return "Stanley Cup champion";
  if (/^National Hockey League runners up$/.test(t)) return "Stanley Cup finalist";
  if (/^Canadian Hockey League Memorial Cup winners$/.test(t)) return "Memorial Cup champion";
  LEAGUE_SHORT.forEach(([a, b]) => { t = t.replace(a, b); });
  return t.replace(/^Named in /, "").replace(/ winners$/, " champion").replace(/ runners up$/, " runner-up")
          .replace(/ third placed$/, " (3rd)").replace(/ runner up$/, " (2nd)");
}

const seasonOfDay = d => { const y = +d.slice(0, 4), s = +d.slice(5, 7) >= 7 ? y : y - 1; return `${String(s % 100).padStart(2, "0")}-${String((s + 1) % 100).padStart(2, "0")}`; };
function achHref(d, text) {
  if (!/^National Hockey League (winners|runners up)$|Conn Smythe/.test(text)) return null;
  const s = seasonOfDay(d);
  return playoffSeasons().includes(s) ? `#/playoffs/${s}` : null;
}
function achTags(p) {
  return (p.ach || []).filter(([, , t, k]) => k === "T" || k === "C" || (k === "A" && /National Hockey League (First|Second)/.test(t)))
    .map(([d, , t]) => [`${achText(t).replace(/^\d+\/\d+ /, "")} (${d.slice(0, 4)})`, achHref(d, t)]);
}
function achievementsPanel(p) {
  const a = p.ach || [], pro = draftLine(p.dft?.pro), jr = draftLine(p.dft?.junior);
  if (!a.length && !pro && !jr) return "";
  const of = k => a.filter(x => k.includes(x[3]));
  const row = ([d, team, text]) => { const href = achHref(d, text);
    return `<tr><td class="nowrap ${href ? "" : "muted"}">${href ? `<a href="${href}" title="${seasonLabel(seasonOfDay(d))} playoffs">${fmtDate(d)}</a>` : fmtDate(d)}</td><td>${esc(achText(text))}</td><td class="muted nowrap">${tname(team)}</td></tr>`; };
  const table = rows => `<div class="tablewrap"><table class="fit"><tbody>${rows.map(row).join("")}</tbody></table></div>`;
  const counts = {};
  of("m").forEach(([, , text]) => { const t = achText(text).replace(/ for \w+$/, ""); counts[t] = (counts[t] || 0) + 1; });
  const sections = [["Trophies &amp; awards", of("T")], ["Award finalist", of("F")], ["Championships", of("Cc")], ["All-Star teams", of("A")]]
    .filter(([, r]) => r.length);
  return `<div class="panel" id="achpanel">
    <h2>Draft &amp; awards</h2>
    <p class="sub">Draft from the player's Information tab. Achievements are the save's own log (History tab), so they
      start when the save started; real-life trophies from before then aren't in the game's database.</p>
    <div class="tags-plain">
      <div><span class="muted small">Drafted (pro)</span> <b>${pro ? linkText(pro, draftHref(p.dft?.pro)) : "None recorded"}</b>${pro ? "" : ` <span class="muted small">(undrafted, or a pick the game's database lacks, e.g. some Arizona picks)</span>`}</div>
      ${jr ? `<div><span class="muted small">Drafted (junior)</span> ${esc(jr)}</div>` : ""}
    </div>
    ${sections.map(([h, r]) => `<h3>${h}</h3>${table(r)}`).join("")}
    ${Object.keys(counts).length ? `<h3>Other recognition</h3>
      <p class="small">${Object.entries(counts).sort((x, y) => y[1] - x[1]).map(([t, n]) => `${esc(t)}${n > 1 ? ` <b>×${n}</b>` : ""}`).join(" · ")}</p>` : ""}
    ${of("x").length ? `<details><summary>Career moves (${of("x").length})</summary>${table(of("x"))}</details>` : ""}
    ${!a.length ? `<p class="small muted">Nothing logged in this save yet.</p>` : ""}
  </div>`;
}

let compsPanel;

let drawComps;

let warSection;

let warHistory;
