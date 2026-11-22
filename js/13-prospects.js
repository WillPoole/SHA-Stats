"use strict";

const PROSPECT_TABS = [["overview", "Overview"], ["drafted", "Drafted"], ["undrafted", "Undrafted"], ["search", "Search"]];
let RIGHTS = null;
function nhlOwner(p) {
  if (p.tp && NHL_TEAMS[p.tp[0]]) return { club: p.tp[0], how: `#${p.tp[1]} on its Top Prospects` };
  if (D.rights && !RIGHTS) RIGHTS = new Map(D.rights.rows.filter(x => x[4]).map(x => [x[4], draftClub(x[6])]));
  if (RIGHTS?.get(p.k)) return { club: RIGHTS.get(p.k), how: "draft rights" };
  if (p.lg === "NHL" && NHL_TEAMS[clubOf(p)]) return { club: clubOf(p), how: "NHL roster" };
  const d = p.dft?.pro;
  if (!D.rights && d?.year >= nextDraftYear() - 5 && hasClub(draftClub(d.team))) return { club: draftClub(d.team), how: `drafted ${d.year}` };
  return null;
}

function nhlGraduated(p) {
  if (p._grad !== undefined) return p._grad;
  const C = D.careerCols || [], si = C.indexOf("season"), ti = C.indexOf("type"), li = C.indexOf("league"), gi = C.indexOf("gp");
  const gp = {};
  for (const r of p.car || []) if (r[ti] === "R" && r[li] === "NHL") gp[r[si]] = (gp[r[si]] || 0) + (r[gi] || 0);
  const g = Object.values(gp);
  return (p._grad = g.some(n => n >= 25) || g.filter(n => n >= 6).length >= 2);
}

const moreLink = (href, text) => `<a class="more-link" href="${href}">${text} →</a>`;

let renderProspects;

const listedBy = club => D.players.filter(p => p.tp?.[0] === club).sort((a, b) => a.tp[1] - b.tp[1]);

const draftClub = name => name && Object.keys(NHL_TEAMS).find(c => fold(name).startsWith(fold(c.replace(/^NY /, "New York "))));

let PVIEW = "ours";
document.addEventListener("click", e => {
  const b = e.target.closest("[data-pview]");
  if (!b) return;
  PVIEW = b.dataset.pview;
  const box = b.closest(".card-box");
  box.querySelectorAll("[data-pview]").forEach(x => {
    const on = x === b;
    x.classList.toggle("on", on); x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
  });
  box.querySelectorAll("[data-pane]").forEach(p => (p.hidden = p.dataset.pane !== PVIEW));
  const n = box.querySelector(".box-h .muted");
  if (n) n.textContent = box.querySelector(`[data-pane="${PVIEW}"] tbody`)?.rows.length ?? "";
});
let prospectsTab;
