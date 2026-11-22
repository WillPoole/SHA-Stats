"use strict";

const gmRoute = gm => "#/gm/" + encodeURIComponent(gm);
const gmLink = gm => gm ? `<a href="${gmRoute(gm)}">${esc(gm)}</a>` : `<span class="muted">No GM listed</span>`;
const gmNow = () => D.dates.at(-1);
const gmOf = (club, day = gmNow()) => (D.gms?.tenures || []).find(t => t.club === club && t.from <= day && (!t.to || day <= t.to))?.gm || null;
const gmDays = t => Math.max(1, (new Date((t.to || gmNow()) + "T00:00:00") - new Date(t.from + "T00:00:00")) / 864e5 + 1);

let renderGms;

let renderGm;
