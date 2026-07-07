// Pure port of app.js compute(). PMPM & per-1,000 denominators use member-month
// exposure for the selected population; category/network filters affect spend &
// counts only.
import type {
  SBData,
  Filters,
  ClaimRow,
  MmRow,
  Member,
} from "./types";

export interface Metrics {
  memberMonths: number;
  totalAllowed: number;
  lines: number;
  pmpm: number;
  edCount: number;
  edAllowed: number;
  edPer1000: number;
  ipCount: number;
  ipAllowed: number;
  ipShare: number;
  srxAllowed: number;
  oonLines: number;
  oonAllowed: number;
  oonRate: number;
  hcAllowed: number;
  hcShare: number;
  ucCount: number;
  ucAllowed: number;
  avoidableEd: number;
  byCat: Record<string, number>;
  catCount: Record<string, number>;
  byLob: Record<string, number>;
  byMonth: Record<string, number>;
  byState: Record<string, number>;
  oonByState: Record<string, number>;
  srxClass: Record<string, number>;
  edByAvoid: Record<string, number>;
  edAgeCount: Record<string, number>;
  mmByLob: Record<string, number>;
  mmByMonth: Record<string, number>;
  mmByAge: Record<string, number>;
  mmByState: Record<string, number>;
  perMember: Record<string, number>;
  memberCount: number;
  avgED: number;
  avgUC: number;
}

const has = (set: Set<string>, v: string): boolean =>
  set.size === 0 || set.has(v);

function inc(o: Record<string, number>, k: string, v: number): void {
  o[k] = (o[k] || 0) + v;
}

export function makeHcSet(members: Member[]): Set<string> {
  return new Set(members.filter((m) => m.high_cost).map((m) => m.id));
}

// ---- filter predicates (mirror app.js exactly) ----
function popClaim(r: ClaimRow, F: Filters, hcSet: Set<string>): boolean {
  return (
    has(F.lob, r[1]) &&
    has(F.state, r[2]) &&
    has(F.age, r[3]) &&
    has(F.months, r[7]) &&
    (!F.highCost || hcSet.has(r[0]))
  );
}
function claimMatch(r: ClaimRow, F: Filters, hcSet: Set<string>): boolean {
  return popClaim(r, F, hcSet) && has(F.cat, r[4]) && has(F.net, r[6]);
}
function popMM(m: MmRow, F: Filters, hcSet: Set<string>): boolean {
  return (
    has(F.lob, m[1]) &&
    has(F.state, m[2]) &&
    has(F.age, m[5]) &&
    has(F.months, m[3]) &&
    (!F.highCost || hcSet.has(m[0]))
  );
}
export function memberPop(m: Member, F: Filters): boolean {
  return (
    has(F.lob, m.lob) &&
    has(F.state, m.state) &&
    has(F.age, m.age_band) &&
    (!F.highCost || !!m.high_cost)
  );
}
export { claimMatch };

export function compute(SB: SBData, F: Filters, hcSet: Set<string>): Metrics {
  const C = SB.claims.rows;
  const MM = SB.mm.rows;

  // exposure (member-months) for the selected population
  let memberMonths = 0;
  const mmByLob: Record<string, number> = {};
  const mmByMonth: Record<string, number> = {};
  const mmByAge: Record<string, number> = {};
  const mmByState: Record<string, number> = {};
  for (const m of MM) {
    if (!popMM(m, F, hcSet)) continue;
    const v = m[4];
    memberMonths += v;
    inc(mmByLob, m[1], v);
    inc(mmByMonth, m[3], v);
    inc(mmByAge, m[5], v);
    inc(mmByState, m[2], v);
  }

  // claims
  let totalAllowed = 0,
    lines = 0,
    oonLines = 0,
    oonAllowed = 0,
    hcAllowed = 0;
  let edCount = 0,
    edAllowed = 0,
    ipCount = 0,
    ipAllowed = 0,
    srxAllowed = 0,
    ucCount = 0,
    ucAllowed = 0,
    avoidableEd = 0;
  const byCat: Record<string, number> = {},
    catCount: Record<string, number> = {},
    byLob: Record<string, number> = {},
    byMonth: Record<string, number> = {},
    byState: Record<string, number> = {},
    oonByState: Record<string, number> = {},
    srxClass: Record<string, number> = {},
    edByAvoid: Record<string, number> = {},
    edAgeCount: Record<string, number> = {},
    perMember: Record<string, number> = {};

  for (const r of C) {
    if (!claimMatch(r, F, hcSet)) continue;
    const a = r[10],
      cat = r[4];
    totalAllowed += a;
    lines++;
    inc(byCat, cat, a);
    inc(catCount, cat, 1);
    inc(byLob, r[1], a);
    inc(byMonth, r[7], a);
    inc(byState, r[2], a);
    inc(perMember, r[0], a);
    if (hcSet.has(r[0])) hcAllowed += a;
    if (r[6] === "N") {
      oonLines++;
      oonAllowed += a;
      inc(oonByState, r[2], a);
    }
    if (cat === "ED") {
      edCount++;
      edAllowed += a;
      inc(edByAvoid, r[5], 1);
      inc(edAgeCount, r[3], 1);
      if (r[5] === "Avoidable") avoidableEd++;
    } else if (cat === "Inpatient") {
      ipCount++;
      ipAllowed += a;
    } else if (cat === "Specialty Rx") {
      srxAllowed += a;
      inc(srxClass, r[8] || "Other", a);
    } else if (cat === "Urgent Care") {
      ucCount++;
      ucAllowed += a;
    }
  }

  const pmpm = memberMonths ? totalAllowed / memberMonths : 0;
  return {
    memberMonths,
    totalAllowed,
    lines,
    pmpm,
    edCount,
    edAllowed,
    edPer1000: memberMonths ? (edCount / memberMonths) * 1000 : 0,
    ipCount,
    ipAllowed,
    ipShare: totalAllowed ? (ipAllowed / totalAllowed) * 100 : 0,
    srxAllowed,
    oonLines,
    oonAllowed,
    oonRate: lines ? (oonLines / lines) * 100 : 0,
    hcAllowed,
    hcShare: totalAllowed ? (hcAllowed / totalAllowed) * 100 : 0,
    ucCount,
    ucAllowed,
    avoidableEd,
    byCat,
    catCount,
    byLob,
    byMonth,
    byState,
    oonByState,
    srxClass,
    edByAvoid,
    edAgeCount,
    mmByLob,
    mmByMonth,
    mmByAge,
    mmByState,
    perMember,
    memberCount: Object.keys(perMember).length,
    avgED: edCount ? edAllowed / edCount : 0,
    avgUC: ucCount ? ucAllowed / ucCount : 134.7,
  };
}
