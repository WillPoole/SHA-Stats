"use strict";

let project;

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

let lastMove;

let lastMove4;
