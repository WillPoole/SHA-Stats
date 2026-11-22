"use strict";

const ROLE_TIERS = (() => {
  const text = {
    G: `Mixed Style: Positioning, Reflexes | Agility, Blocker, Glove, Rebound Control | Acceleration, Speed, Recovery | Flair, Strength
Butterfly: Agility, Recovery | Blocker, Glove, Positioning, Reflexes | Acceleration, Speed, Rebound Control | Flair, Strength
Standup: Positioning, Stickhandling | Blocker, Glove, Rebound Control, Reflexes | Acceleration, Agility, Speed | Flair, Strength
Unorthodox: Agility, Flair | Blocker, Glove, Reflexes, Stickhandling | Acceleration, Speed | Recovery, Strength`,
    D: `Offensive: Off The Puck, Passing | Anticipation, Pokecheck, Stickhandling, Creativity, Wristshot | Checking, Strength | Hitting
Finesse Offensive: Passing, Creativity | Off The Puck, Pokecheck, Slapshot, Stickhandling, Wristshot | Bravery, Hitting | Strength
Physical Offensive: Passing, Strength | Checking, Hitting, Off The Puck, Slapshot, Creativity | Agility, Bravery | Pokecheck
Pointman: Passing, Slapshot | Pokecheck, Positioning, Stickhandling, Creativity, Wristshot | Bravery, Deking, Hitting, Strength | -
Finesse Pointman: Passing, Wristshot | Anticipation, Pokecheck, Positioning, Slapshot, Stickhandling | Bravery, Hitting | Strength
Physical Pointman: Slapshot, Strength | Bravery, Checking, Hitting, Passing, Positioning | Creativity, Wristshot | Pokecheck
Playmaking: Passing, Creativity | Anticipation, Checking, Pokecheck, Positioning | Agility, Wristshot | Slapshot
Finesse Playmaking: Passing, Creativity | Checking, Pokecheck, Positioning, Stickhandling, Wristshot | Bravery, Hitting | Strength
Physical Playmaking: Passing, Creativity | Checking, Hitting, Pokecheck, Positioning, Strength | Agility, Wristshot | Slapshot
Defensive: Checking, Positioning | Bravery, Hitting, Pokecheck, Work Rate | Passing, Slapshot, Creativity, Wristshot | -
Finesse Defensive: Checking, Positioning | Agility, Passing, Pokecheck, Stickhandling | Hitting, Off The Puck | Strength
Physical Defensive: Hitting, Strength | Balance, Checking, Pokecheck, Positioning, Work Rate | Off The Puck, Passing, Stickhandling, Wristshot | -
All-Around: Checking, Positioning | Hitting, Passing, Pokecheck, Strength | Anticipation, Slapshot, Creativity, Wristshot | -
Rugged: Aggression, Hitting | Bravery, Checking, Positioning, Strength, Work Rate | Deking, Passing, Creativity, Wristshot | Stickhandling
Enforcer: Aggression | Bravery, Hitting, Positioning, Strength | Acceleration, Speed, Passing, Slapshot, Creativity, Wristshot | Flair`,
    F: `Defensive: Checking, Positioning | Passing, Pokecheck, Strength, Work Rate | Anticipation, Slapshot, Stickhandling, Creativity | -
Finesse Defensive: Pokecheck, Positioning | Balance, Checking, Passing, Stickhandling | Hitting, Off The Puck | Strength
Physical Defensive: Hitting, Positioning | Bravery, Checking, Pokecheck, Strength | Deking, Slapshot, Creativity, Wristshot | -
Goalscoring: Slapshot, Wristshot | Anticipation, Deflections, Deking, Off The Puck, Stickhandling | Checking, Hitting, Pokecheck, Positioning | -
Finesse Goalscoring: Anticipation, Wristshot | Deflections, Deking, Off The Puck, Slapshot, Stickhandling | Aggression, Bravery, Hitting | Strength
Physical Goalscoring: Slapshot, Strength | Anticipation, Deflections, Hitting, Off The Puck, Wristshot | Checking, Pokecheck, Positioning, Creativity | -
Playmaking: Passing, Creativity | Anticipation, Deflections, Deking, Off The Puck, Stickhandling | Checking, Hitting, Positioning, Slapshot | -
Finesse Playmaking: Passing, Creativity | Anticipation, Deking, Off The Puck, Stickhandling, Wristshot | Bravery, Hitting | Strength
Physical Playmaking: Strength, Creativity | Anticipation, Deflections, Hitting, Off The Puck, Passing | Checking, Deking, Pokecheck, Positioning | -
All-Around: Positioning, Work Rate | Checking, Off The Puck, Passing, Strength, Wristshot | Anticipation, Deking, Hitting, Creativity | -
Finesse: Deking, Stickhandling | Anticipation, Off The Puck, Passing, Creativity, Wristshot | Bravery, Hitting | Strength
Grinding: Checking, Hitting | Bravery, Deflections, Strength, Work Rate | Anticipation, Deking, Off The Puck, Creativity | -
Power: Deflections, Hitting | Aggression, Bravery, Strength, Wristshot | Deking, Pokecheck, Stickhandling, Creativity | -
Enforcer: Aggression | Bravery, Hitting, Strength, Work Rate | Anticipation, Passing, Slapshot, Stickhandling, Creativity, Wristshot | Flair`,
  };
  return Object.fromEntries(Object.entries(text).map(([g, t]) => [g, Object.fromEntries(t.split("\n").map(l => {
    const [name, rest] = l.split(": ");
    return [name, rest.split(" | ").map(x => (x === "-" ? [] : x.split(", ")))];
  }))]));
})();
const ROLE_SUFFIX = / (Goalie|Defenseman|Winger|Center)$/;
const roleGrp = role => { const m = role.match(ROLE_SUFFIX)?.[1]; return m === "Goalie" ? "G" : m === "Winger" || m === "Center" ? "F" : "D"; };

function roleTier(role, attr) {
  const g = roleGrp(role), tiers = ROLE_TIERS[g]?.[role.replace(ROLE_SUFFIX, "")];
  if (!tiers) return null;
  if (attr === "Faceoffs") return g === "F" ? (role.endsWith("Center") ? 0 : 2) : null;
  if (attr === "Deflections" && g === "D") return 2;
  const t = tiers.findIndex(l => l.includes(attr));
  return t < 0 ? null : t;
}

function rolesFor(p) {
  const suffix = { G: " Goalie", D: " Defenseman" }[p.grp] ?? (/^C/.test(p.pos) ? " Center" : " Winger");
  return Object.keys(ROLE_TIERS[p.grp]).map(b => (/Pointman$/.test(b) ? b : b + suffix)).sort();
}
const TIER_CLASS = ["key", "ess", "non", "irr"], TIER_NAME = ["Key", "Essential", "Non-essential", "Irrelevant"];

function attrTables(p) {
  const last = p.h.at(-1), first = p.h[0], roles = rolesFor(p), pref = "";
  const sections = { Technical: [], Mental: [], Physical: [] };
  D.attrs.forEach((a, i) => {
    const v = last[i + 2];
    if (v == null) return;
    const [sec, name] = a.split(": ");
    const d = first[i + 2] == null ? 0 : v - first[i + 2], t = pref ? roleTier(pref, name) : null;
    (sections[sec] ||= []).push([name, `<div class="arow ${t == null ? "" : "t-" + TIER_CLASS[t]}" data-i="${i}" data-n="${esc(name)}" tabindex="0" title="Chart ${esc(name)}${t == null ? "" : " · " + TIER_NAME[t] + " for " + esc(pref)}"><span class="an">${esc(name)}</span>
      <span class="ad ${d > 0 ? "up" : d < 0 ? "down" : "muted"}">${d > 0 ? "+" + d : d < 0 ? d : "·"}</span><b class="av av${v <= 5 ? 1 : v <= 10 ? 2 : v <= 15 ? 3 : 4}">${v}</b></div>`]);
  });
  const picker = `<label class="attr-role">Highlight key attributes <select id="attr-role"><option value="">None</option>${roles
    .map(r => `<option value="${esc(r)}" ${r === pref ? "selected" : ""}>${esc(r)}${""}</option>`).join("")}</select>
    <small class="muted">The game's key attributes for the role (decoded from EHM): <span class="tier t-key">Key</span> <span class="tier t-ess">Essential</span>
    <span class="tier t-non">Non-essential</span> <span class="tier t-irr">Irrelevant</span>.${""}</small></label>`;
  return Object.entries(sections).filter(([, rs]) => rs.length).map(([s, rs]) => `<div class="attr-col"><h4>${esc(s)}</h4>
    ${rs.sort((x, y) => x[0].localeCompare(y[0])).map(x => x[1]).join("")}${s === "Physical" ? picker : ""}</div>`).join("");
}

let renderAttrProjection;
