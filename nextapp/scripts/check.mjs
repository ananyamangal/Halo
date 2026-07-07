// Validates data + column indices by recomputing UNFILTERED KPIs and asserting
// them against known-good targets.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SB = JSON.parse(
  readFileSync(join(__dirname, "..", "public", "data.json"), "utf8"),
);

const C = SB.claims.rows; // [mid,lob,state,age,cat,avoid,net,month,tclass,ctype,allowed]
const MM = SB.mm.rows; // [mid,lob,state,month,mm,age]
const hcSet = new Set(
  SB.members.filter((m) => m.high_cost).map((m) => m.id),
);

let memberMonths = 0;
for (const m of MM) memberMonths += m[4];

let totalAllowed = 0,
  lines = 0,
  oonLines = 0,
  ipAllowed = 0,
  edCount = 0,
  hcAllowed = 0;
for (const r of C) {
  const a = r[10],
    cat = r[4];
  totalAllowed += a;
  lines++;
  if (r[6] === "N") oonLines++;
  if (hcSet.has(r[0])) hcAllowed += a;
  if (cat === "ED") edCount++;
  else if (cat === "Inpatient") ipAllowed += a;
}
const pmpm = totalAllowed / memberMonths;
const edPer1000 = (edCount / memberMonths) * 1000;
const hcShare = (hcAllowed / totalAllowed) * 100;

const checks = [
  ["member-months", memberMonths, 8462, 0],
  ["total allowed", totalAllowed, 11321251.82, 0.01],
  ["blended PMPM", pmpm, 1337.89, 0.01],
  ["ED/1000", edPer1000, 142.87, 0.01],
  ["OON lines", oonLines, 55, 0],
  ["IP allowed", ipAllowed, 8631818.26, 0.01],
  ["HC concentration %", hcShare, 20.5, 0.1],
];

let allPass = true;
for (const [name, got, want, tol] of checks) {
  const ok = Math.abs(got - want) <= tol;
  if (!ok) allPass = false;
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name.padEnd(22)} got=${
      typeof got === "number" ? got.toFixed(2) : got
    }  want=${want}`,
  );
}

console.log("\n" + (allPass ? "PASS: all KPIs match" : "FAIL: mismatch"));
process.exit(allPass ? 0 : 1);
