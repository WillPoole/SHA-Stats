"use strict";

let LAST_CHART = null;
addEventListener("resize", () => {
  clearTimeout(LAST_CHART?.timer);
  if (!LAST_CHART) return;
  LAST_CHART.timer = setTimeout(() => {
    redrawChartIfResized();
  }, 200);
});
function redrawChartIfResized() {
  MINI?.();
  const box = view.querySelector("#chart");
  if (box && box.clientWidth && LAST_CHART && Math.abs(box.clientWidth - LAST_CHART[3]) > 60) drawChart(...LAST_CHART.slice(0, 3));
}
function drawChart(p, proj, metric) {
  const box = view.querySelector("#chart");
  const isCA = false;
  const idx = isCA ? 1 : +metric + 2;
  const hist = p.h.filter(h => h[idx] != null).map(h => ({ date: new Date(D.dates[h[0]] + "T00:00:00"), v: h[idx] }));
  const name = D.attrs[+metric].split(": ")[1];
  const s1 = css("--s1"), s2 = css("--s2");

  view.querySelector("#chart-title").textContent = `${name} over time`;
  view.querySelector("#chart-sub").textContent = "Attribute value (1–20) at each snapshot.";
  view.querySelector("#legend").innerHTML = "";

  const W = Math.round(Math.max(300, Math.min(1400, box.clientWidth || 1000))), H = W < 640 ? 240 : 340;
  const m = { l: 40, r: W < 640 ? 34 : 70, t: 14, b: 30 };
  LAST_CHART = [p, proj, metric, W];
  const x0 = hist[0].date, x1 = hist.at(-1).date;
  const span = Math.max(1, x1 - x0);
  let lo, hi;
  { lo = 0; hi = 20; }
  const X = d => m.l + (d - x0) / span * (W - m.l - m.r);
  const Y = v => m.t + (1 - (v - lo) / (hi - lo)) * (H - m.t - m.b);
  const step = isCA ? (hi - lo > 80 ? 40 : 20) : 5;

  let g = "";
  for (let v = lo; v <= hi; v += step)
    g += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="${css("--grid")}" stroke-width="1"/>
          <text x="${m.l - 8}" y="${Y(v) + 4}" text-anchor="end">${v}</text>`;

  const perMonth = (W - m.l - m.r) / Math.max(1, span / (30.44 * 864e5));
  const tickEvery = isCA ? (perMonth * 6 < 56 ? 12 : 6) : Math.max(1, Math.ceil(56 / perMonth));
  const t = new Date(x0.getFullYear(), x0.getMonth() + 1, 1);
  for (let i = 0; t <= x1; i++, t.setMonth(t.getMonth() + 1)) {
    if (isCA ? t.getMonth() % tickEvery !== 0 : i % tickEvery !== 0) continue;
    g += `<line x1="${X(t)}" x2="${X(t)}" y1="${H - m.b}" y2="${H - m.b + 4}" stroke="${css("--axis")}"/>
          <text x="${X(t)}" y="${H - m.b + 17}" text-anchor="middle">${t.toLocaleDateString(undefined, { month: "short", year: "2-digit" })}</text>`;
  }
  g += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" stroke="${css("--axis")}"/>`;

  g += `<polyline points="${hist.map(h => `${X(h.date)},${Y(h.v)}`).join(" ")}" fill="none" stroke="${s1}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  g += hist.map(h => `<circle cx="${X(h.date)}" cy="${Y(h.v)}" r="4" fill="${s1}" stroke="${css("--surface")}" stroke-width="2"/>`).join("");
  const lastH = hist.at(-1);
  if (!isCA) g += `<text class="lbl" x="${X(lastH.date) + 8}" y="${Y(lastH.v) + 4}">${lastH.v}</text>`;
  else g += `<text class="lbl" x="${X(lastH.date)}" y="${Y(lastH.v) - 10}" text-anchor="middle">${lastH.v.toFixed(0)}</text>`;
  g += `<line id="xh" y1="${m.t}" y2="${H - m.b}" stroke="${css("--axis")}" stroke-width="1" visibility="hidden"/>
        <rect id="hit" x="${m.l}" y="${m.t}" width="${W - m.l - m.r}" height="${H - m.t - m.b}" fill="transparent"/>`;
  box.innerHTML = `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(name)} over time">${g}</svg>`;

  const pts = hist.map(h => ({ date: h.date, html: `<div class="row"><span>${esc(name)}</span><b>${isCA ? h.v.toFixed(1) : h.v}</b></div>` }));

  const svg = box.querySelector("svg"), xh = svg.querySelector("#xh");
  svg.querySelector("#hit").addEventListener("mousemove", e => {
    const r = svg.getBoundingClientRect();
    const sx = (e.clientX - r.left) / r.width * W;
    const best = pts.reduce((a, b) => Math.abs(X(b.date) - sx) < Math.abs(X(a.date) - sx) ? b : a);
    xh.setAttribute("x1", X(best.date)); xh.setAttribute("x2", X(best.date)); xh.setAttribute("visibility", "visible");
    tip.innerHTML = `<b>${fmtDate(best.date)}</b>${best.html}${""}`;
    tip.hidden = false;
    placeTip(e);
    e.currentTarget.style.cursor = best.q ? "pointer" : "default";
  });
  svg.querySelector("#hit").addEventListener("mouseleave", () => { tip.hidden = true; xh.setAttribute("visibility", "hidden"); });

  const rows = hist.map(h => `<tr><td>${fmtDate(h.date)}</td><td>Snapshot</td><td class="num">${isCA ? h.v.toFixed(1) : h.v}</td>${""}</tr>`);

  view.querySelector("#chart-table").innerHTML = `<table><thead><tr><th>Date</th><th>Source</th><th class="num">${esc(name)}</th>${""}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}

let exportCard;

function pngReady() {
  if (window.html2canvas) return true;
  alert("PNG export needs an internet connection (html2canvas loads from cdnjs).");
  return false;
}

function sheetToPng(sheet, windowWidth, file, prepare, scale = 2) {
  document.body.appendChild(sheet);
  if (prepare) prepare();
  html2canvas(sheet, { scale, backgroundColor: css("--page"), windowWidth }).then(canvas => {
    const a = document.createElement("a");
    a.download = file;
    a.href = canvas.toDataURL("image/png");
    a.click();
  }).catch(e => alert("PNG export failed: " + e.message)).finally(() => sheet.remove());
}
