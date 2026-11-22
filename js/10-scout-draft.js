"use strict";

let scoutPanel;

const STAGE_ORDER = ["Preliminary", "Mid-Season", "Final"];

function matchFilter(value, q, numeric) {
  q = q.trim();
  if (!q) return true;
  if (numeric) {
    if (value == null || Number.isNaN(value)) return false;
    let m;
    if ((m = q.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/))) return value >= +m[1] && value <= +m[2];
    if ((m = q.match(/^(>=|<=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/))) {
      const n = +m[2];
      return { ">": value > n, ">=": value >= n, "<": value < n, "<=": value <= n }[m[1]] ?? Math.abs(value - n) < 0.5;
    }
    return true;
  }
  const neg = q.startsWith("!"), t = fold(neg ? q.slice(1) : q);
  return neg ? !fold(value).includes(t) : fold(value).includes(t);
}
function nhlRanks(p) {
  const cur = (p.drs || []).filter(d => d[0].includes("(NHL)"))
    .sort((a, b) => STAGE_ORDER.indexOf(b[0].split(" (")[0]) - STAGE_ORDER.indexOf(a[0].split(" (")[0]))[0];
  if (!cur) return null;

  const curStage = cur[0].split(" (")[0];
  const hist = (p.nhlr || []).filter(h => h[1] !== curStage)
    .sort((a, b) => a[0].localeCompare(b[0]) || STAGE_ORDER.indexOf(a[1]) - STAGE_ORDER.indexOf(b[1]));
  const prev = hist.at(-1);
  return { rank: cur[1], stage: curStage, move: prev ? prev[2] - cur[1] : null,
           prevTxt: prev ? `${prev[1]} #${prev[2]} (${fmtDate(prev[0])})` : null };
}

function cellValue(td) {
  const raw = (td?.dataset.v ?? td?.textContent ?? "").trim().replace(/−/g, "-").replace(/,/g, "");
  if (!raw || raw === "–" || raw === "-") return null;
  const m = raw.match(/^([+-]?\d+(?:\.\d+)?)%?(?:\s|$)/);
  return m ? +m[1] : raw.toLowerCase();
}
function makeSortable(root = view) {
  root.querySelectorAll("table.sortable").forEach(tbl => {
    const ths = [...(tbl.tHead?.rows[0]?.cells || [])];
    ths.forEach((th, i) => {
      if (th.dataset.nosort != null) return;
      th.classList.add("sort");
      th.tabIndex = 0;
      if (!th.hasAttribute("aria-sort")) th.setAttribute("aria-sort", "none");
      const go = () => {
        const body = tbl.tBodies[0], rows = [...body.rows];
        const vals = rows.map(tr => cellValue(tr.cells[i]));
        const numeric = vals.some(v => typeof v === "number");
        const cur = th.getAttribute("aria-sort");
        const dir = cur === "none" ? (numeric ? -1 : 1) : cur === "descending" ? 1 : -1;
        const order = rows.map((tr, j) => [tr, vals[j], j]).sort((x, y) => {
          if (x[1] == null) return y[1] == null ? x[2] - y[2] : 1;
          if (y[1] == null) return -1;
          const c = typeof x[1] === "number" && typeof y[1] === "number" ? x[1] - y[1] : String(x[1]).localeCompare(String(y[1]));
          return c * dir || x[2] - y[2];
        });
        order.forEach(([tr]) => body.appendChild(tr));
        ths.forEach(h => { if (h.dataset.nosort == null) { h.setAttribute("aria-sort", "none"); h.classList.remove("on"); } });
        th.setAttribute("aria-sort", dir < 0 ? "descending" : "ascending");
        th.classList.add("on");
      };
      th.onclick = e => { if (!e.target.closest("a")) go(); };
      th.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } };
    });
  });
}

let DV = null;
function draftValues() {
  if (DV && DV.data === D) return DV;
  const picks = (D.draftHist || []).map(([year, round, pick, team, k, n, w, last]) => {
    const p = byKey.get(k) || null, seasons = Object.values(w || {});

    return { year, round, pick, team, club: draftClub(team) || team, k, n: p ? p.n : n, p, last,

             war: seasons.reduce((s, x) => s + x[0], 0), gp: seasons.reduce((s, x) => s + x[1], 0) };
  });
  const years = [...new Set(picks.map(x => x.year))].sort((a, b) => b - a);

  const cover = Object.fromEntries(years.map(y => [y, picks.filter(x => x.year === y).length]));
  DV = { data: D, picks, years, cover, slots: y => (y >= 2021 ? 224 : y >= 2017 ? 217 : 211) };
  return DV;
}

let teamDraftsTab;
