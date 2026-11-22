"use strict";

// ---------------------------------------------------------------- projection
/* p.nr = est CA after 1, 2 ... months: the near-term forecast models' path, then the long-range model's (up to ~5
   years, build_data.long_paths); after that, monthly dCA = a(age)*(PA-CA) + b(age). The 80% band is the long-range
   model's 10th/90th percentiles (p.nq) while it lasts, then the PA band's lines plus the growth curve's noise. */
function growthAt(age, grp) {
  const g = D.growth, c = grp === "G" && g.G ? g.G : g;
  const i = Math.max(0, Math.min(g.ages.length - 1, Math.floor(age) - g.ages[0]));
  return { a: c.a[i], b: c.b[i], noise: c.noise[i] };
}
function ageAt(p, iso) {
  return p.dob ? (new Date(iso) - new Date(p.dob)) / 864e5 / 365.25 : p.age;
}
let PROJ_DATES = null;   // the projection's month dates: the same for every player (none of them is ever modified)
function project(p) {
  const last = D.dates[D.dates.length - 1];
  const dates = PROJ_DATES ||= Array.from({ length: D.projectionMonths + 1 }, (_, m) => addMonths(last, m));
  const age0 = ageAt(p, last);
  const near = p.nr || [];
  // nq = [[month, below, above], ...]: the 80% range around the path from the long-range model (build_data.long_paths),
  // linear between its months; past its last month the PA-band lines and the growth noise take over from its edges.
  const nq = p.nq || [], qEnd = nq.length ? nq.at(-1)[0] : -1;
  const band = m => {
    if (m <= nq[0][0]) return [nq[0][1], nq[0][2]];
    for (let i = 1; i < nq.length; i++) if (m <= nq[i][0]) {
      const a = nq[i - 1], b = nq[i], f = (m - a[0]) / (b[0] - a[0]);
      return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
    }
    return [nq.at(-1)[1], nq.at(-1)[2]];
  };
  const out = [];
  let mid = p.ca, lo = p.ca, hi = p.ca, noiseVar = 0;
  for (let m = 0; m <= D.projectionMonths; m++) {
    const age = age0 + m / 12;
    if (m <= qEnd) {
      const [below, above] = band(m);
      out.push({ m, date: dates[m], age, mid, lo: Math.max(1, mid - below), hi: Math.min(200, mid + above) });
    } else {
      out.push({ m, date: dates[m], age, mid, lo: Math.max(1, lo - 1.28 * Math.sqrt(noiseVar)),
                 hi: Math.min(Math.max(p.pa_hi, hi), hi + 1.28 * Math.sqrt(noiseVar)) });
    }
    const g = growthAt(age, p.grp);
    if (m < near.length) {          // near-term path: all three lines move with it
      const step = near[m] - mid;
      mid += step; lo += step; hi += step;
    } else {
      // Once the age effect is negative (from 24 on), room to grow can slow the decline but not reverse
      // it (in the training save, players past ~29 declined on average whatever their PA gap).
      // Below 24 a negative b is just noise around growth (ages 18-19), so the gap term still works.
      const curve = (ca, pa) => g.b < 0 && age >= D.declineAge ? Math.min(0, g.a * (pa - ca) + g.b) : g.a * (pa - ca) + g.b;
      // EHM never lets CA exceed PA, so each line is capped at its PA estimate.
      mid = Math.min(Math.max(p.pa, mid), Math.max(1, mid + curve(mid, p.pa)));
      lo = Math.min(Math.max(p.pa_lo, lo), Math.max(1, lo + curve(lo, p.pa_lo)));
      hi = Math.min(Math.max(p.pa_hi, hi), Math.max(1, hi + curve(hi, p.pa_hi)));
    }
    if (m + 1 <= qEnd) {  // inside the band: the lines restart from its edges at its last month
      noiseVar = 0;
      if (m + 1 === qEnd) { const [below, above] = band(qEnd); lo = mid - below; hi = mid + above; }
    } else noiseVar += g.noise ** 2;
  }
  return out;
}

/* Snapshots come at irregular intervals (a few days to weeks), and over a few days the est. CA moves
   less than its own noise, so "moves" compare the latest snapshot with the latest one at least
   MOVE_DAYS earlier (the previous month on monthly snapshots), or the first one while the history is
   shorter. Index into D.dates, or null with a single snapshot. */
const MOVE_DAYS = 28;
function moveBase() {
  const n = D.dates.length;
  if (n < 2) return null;
  const cut = new Date(D.dates[n - 1] + "T00:00:00") - MOVE_DAYS * 864e5;
  let i = 0;
  D.dates.forEach((d, j) => { if (j < n - 1 && new Date(d + "T00:00:00") <= cut) i = j; });
  return i;
}
const MOVE_BASE = moveBase();
/* Change in est. CA since the MOVE_BASE snapshot (his last one on or before it, if that crawl missed him;
   he must be in the latest snapshot). */
function lastMove(p) {
  // only players in both snapshots: one missing from the base one (unattached for years) would compare across that gap
  const b = p.h.at(-1), a = p.h.find(h => h[0] === MOVE_BASE);
  if (MOVE_BASE == null || !a || b[0] !== D.dates.length - 1) return null;
  return b[1] - a[1];
}
/* Change in est. CA over about 4 months: against his latest snapshot at least MOVE4_DAYS before the newest one.
   null when no snapshot is that old (the history is shorter) or he isn't in both. */
const MOVE4_DAYS = 120;
function moveBase4() {
  const n = D.dates.length, cut = new Date(D.dates[n - 1] + "T00:00:00") - MOVE4_DAYS * 864e5;
  let i = null;
  D.dates.forEach((d, j) => { if (j < n - 1 && new Date(d + "T00:00:00") <= cut) i = j; });
  return i;
}
const MOVE_BASE4 = moveBase4();
function lastMove4(p) {
  const b = p.h.at(-1), a = MOVE_BASE4 == null ? null : p.h.find(h => h[0] === MOVE_BASE4);
  if (!a || b[0] !== D.dates.length - 1) return null;
  return b[1] - a[1];
}

/* Growth rolls (ehm/model/rolls.py): EHM changes a player's CA only on three days a year, 120 days apart (day of year
   p.rp, +120, +240; exact from the training host, else estimated from when his attributes moved, p.rc = confidence),
   plus a July-August window in which players aged 23 or under also grow. rollDates lists his rolls in (from, to]. */
const ROLL_OFFSETS = [0, 120, 240], SUMMER_MAX_AGE = 23;
function rollDates(p, from, to) {
  if (p.rp == null) return [];
  const out = [];
  for (let y = from.getFullYear(); y <= to.getFullYear(); y++)
    for (const off of ROLL_OFFSETS) {
      const d = new Date(y, 0, 1 + (p.rp + off) % 365);
      if (d.getFullYear() === y && d > from && d <= to) out.push(d);
    }
  return out.sort((a, b) => a - b);
}
/* Summer growth windows [Jul 1, Aug 31] inside the projection while he is still young enough. */
function summerWindows(p, from, to) {
  const out = [];
  for (let y = from.getFullYear(); y <= to.getFullYear(); y++) {
    const a = new Date(y, 6, 1), b = new Date(y, 7, 31);
    if (b <= from || a >= to || ageAt(p, a.toISOString().slice(0, 10)) > SUMMER_MAX_AGE + 1) continue;
    out.push([a < from ? from : a, b > to ? to : b]);
  }
  return out;
}
/* The projection as EHM would move it: flat between growth days, then the growth the smooth path expected since the
   last one, all at once on the roll day (a ramp through the summer window). Same totals as project(); only the timing
   differs. Returns {pts: [{date, mid, lo, hi}] (path corners), at(date) -> values, rolls, summers}, or null without
   a known roll phase. */
function stepProjection(p, proj) {
  if (p.rp == null || proj.length < 2) return null;
  const t0 = proj[0].date, t1 = proj.at(-1).date;
  const smooth = d => {      // the monthly projection, linear between months
    let i = proj.findIndex(q => q.date >= d);
    if (i <= 0) return i === 0 ? proj[0] : proj.at(-1);
    const a = proj[i - 1], b = proj[i], f = (d - a.date) / (b.date - a.date);
    return { mid: a.mid + (b.mid - a.mid) * f, lo: a.lo + (b.lo - a.lo) * f, hi: a.hi + (b.hi - a.hi) * f };
  };
  const rolls = rollDates(p, t0, t1), summers = summerWindows(p, t0, t1);
  const inSummer = d => summers.some(([a, b]) => d >= a && d <= b);
  const ev = [...rolls.filter(d => !inSummer(d)).map(d => [d, d]), ...summers].sort((a, b) => a[0] - b[0]);
  const pt = (date, v) => ({ date, mid: v.mid, lo: v.lo, hi: v.hi });
  let v = { mid: proj[0].mid, lo: proj[0].lo, hi: proj[0].hi };
  const pts = [pt(t0, v)];
  for (const [a, b] of ev) { pts.push(pt(a, v)); v = smooth(b); pts.push(pt(b, v)); }
  pts.push(pt(t1, v));
  const at = d => {          // value on a date: the corner path, the later value on a roll day
    let r = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      if (d < a.date) break;
      if (d >= b.date) { r = b; continue; }
      const f = b.date > a.date ? (d - a.date) / (b.date - a.date) : 1;
      r = { mid: a.mid + (b.mid - a.mid) * f, lo: a.lo + (b.lo - a.lo) * f, hi: a.hi + (b.hi - a.hi) * f };
      break;
    }
    return r;
  };
  return { pts, at, rolls, summers };
}
