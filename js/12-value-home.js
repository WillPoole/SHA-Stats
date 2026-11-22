"use strict";

const teamTable = season => D.predict?.teams?.[season] || null;
const nextDraftYear = () => 2000 + +(SEASONS.at(-1) || "26-27").slice(3);

const seasonEndNow = () => { const d = new Date(D.dates.at(-1) + "T00:00:00"); return d.getFullYear() + (d.getMonth() >= 6 ? 1 : 0); };
const seasonName = e => `${e - 1}-${String(e % 100).padStart(2, "0")}`;
function expSeason(text) {
  const t = String(text || "").trim();
  let m = t.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  if (m) return +m[2] + ("Sep Oct Nov Dec".includes(m[1]) ? 1 : 0);
  m = t.match(/^(\d{1,2})\.\d{1,2}\.(\d{2})$/);
  return m ? 2000 + +m[2] + (+m[1] >= 9 ? 1 : 0) : null;
}
function dealsOf(p) {
  const o = byKey.get(p.k) || p;
  return (o._deals ??= o.ct?.deals?.length ? o.ct.deals : o.sal || o.exp ? [{ s: null, e: expSeason(o.exp), sal: salaryNum(o.sal) || null }] : []);
}
function contractInfo(p) {
  const now = seasonEndNow(), deals = dealsOf(p);
  const cur = deals.findLast(d => (d.s == null || d.s <= now) && (d.e == null || d.e >= now)) || null;
  const next = deals.find(d => d !== cur && d.s != null && d.s > now) || null;
  return { now, deals, cur, next, past: deals.filter(d => d.e != null && d.e < now), last: deals.at(-1) || null };
}
const dealIn = (p, season) => dealsOf(p).find(d => (d.s == null || d.s <= season) && d.e != null && d.e >= season) || null;

function contractEnds(p) {
  const { cur, next } = contractInfo(byKey.get(p.k) || p);
  if (!cur) return p.exp || "";
  return next || expSeason(p.exp) !== cur.e ? `Jun ${cur.e}` : p.exp || "";
}

function faStatus(p) {
  const o = byKey.get(p.k) || p, st = o.ct?.st || "", last = dealsOf(o).at(-1);
  if (/unrestricted/i.test(st)) return { t: "UFA", full: st };
  if (/restricted/i.test(st)) return { t: "RFA", full: st };
  if (!last?.e) return null;
  const age = o.age + (last.e - seasonEndNow());
  return { t: (age < 27 ? "RFA" : "UFA") + "*", full: "Estimated from his age at expiry" };
}
function contractSeasons(p) {
  const { now, cur, next } = contractInfo(p), today = new Date(D.dates.at(-1) + "T00:00:00");
  const lastSeason = next?.e ?? cur?.e;
  if (lastSeason == null) return [];
  const start = new Date(now - 1, 9, 1), stop = new Date(now, 3, 15);
  const frac0 = Math.max(0, Math.min(1, (stop - today) / (stop - start)));
  const out = [];
  for (let k = 0; now + k <= lastSeason; k++) {
    if (k === 0 && !frac0) continue;
    const deal = dealIn(p, now + k);
    if (deal) out.push({ k, frac: k ? 1 : frac0, season: now + k, deal, pay: deal.sal ?? null, ext: deal !== cur });
  }
  return out;
}

let findPlayers;

const listRow = (p, right, meta) => `<div class="lrow">${teamLogo(clubOf(p), 30)}
  <span class="lmain"><a class="lname" href="${route(p.k)}"><b>${esc(p.n)}</b></a><small>${meta ?? `${esc(p.pos)} · ${p.age} · ${tname(clubOf(p))}${p.lg && p.lg !== "NHL" ? ` (${esc(p.lg)})` : ""}`}</small></span>${right}</div>`;

let renderHome;
