"use strict";

const NO_DATA = !window.EHM_DATA;
const D = window.EHM_DATA || { players: [], dates: [], seasons: [] };
if (NO_DATA) {
  document.getElementById("view").innerHTML = `<div class="wrap page"><div class="panel">No data found. Run <code>python build_data.py</code> in the website folder first.</div></div>`;
  console.error("data/ehm_data.js is missing");
}

for (const p of D.players) {
  let prev = null;
  p.h = (p.h || []).map(r => (prev = r.length > 2 || !prev ? r : [r[0], r[1], ...prev.slice(2)]));
}
const MY_TEAM = D.myTeam || "Montréal";
const RIVAL = MY_TEAM === "Toronto" ? "Montréal" : "Toronto";

const storeKey = k => D.siteKey ? `${k}-${D.siteKey}` : k;
const view = document.getElementById("view");
const tip = document.getElementById("tip");
const byKey = new Map();
const ALUMNI = new Map();
const hasPage = k => byKey.has(k) || ALUMNI.has(k);
const COMP_LABELS = {
  impact: "Overall impact", offence: "Offence", playmaking: "Playmaking", finishing: "Finishing",
  defence: "Defence", usage: "Usage", discipline: "Discipline",
};
const TIP_PCT = "Percentile within the comparison pool: 50 = median, 90 = better than 90%.";
