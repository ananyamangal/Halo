"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import {
  KpiCard,
  FilterSelect,
  Section,
  Card,
} from "@/components/ui";
import type { SBData, Filters, Scenario, Member } from "@/lib/types";
import { emptyFilters } from "@/lib/types";
import { compute, makeHcSet } from "@/lib/compute";
import { money, money0, num, pct, mlbl } from "@/lib/format";
import {
  catOption,
  srxOption,
  lobOption,
  trendOption,
  lorenzOption,
  hcMixOption,
  edOption,
  edAgeOption,
  bhOption,
  oonOption,
  churnOption,
  qualityOption,
  waterfallOption,
} from "@/lib/charts";

const NAV = [
  { id: "top", tag: "OV", label: "Overview" },
  { id: "members", tag: "!", label: "Members Needing Attention" },
  { id: "cost", tag: "01", label: "Cost Structure" },
  { id: "highcost", tag: "02", label: "High-Cost Claimants" },
  { id: "avoidable", tag: "03", label: "Avoidable Utilization" },
  { id: "network", tag: "04", label: "Network & Retention" },
  { id: "savings", tag: "05", label: "Savings Modeler" },
  { id: "benchmarks", tag: "06", label: "Benchmarks" },
];

const ATTN_COLS: { key: string; label: string; num?: boolean; get: (m: Member) => number | string }[] = [
  { key: "allowed", label: "Total allowed", num: true, get: (m) => m.allowed },
  { key: "pmpm", label: "PMPM", num: true, get: (m) => m.pmpm },
  { key: "risk", label: "Risk", num: true, get: (m) => m.risk },
  { key: "ip_visits", label: "IP visits", num: true, get: (m) => m.ip_visits },
  { key: "ed_visits", label: "ED visits", num: true, get: (m) => m.ed_visits },
];

function primaryDriver(m: Member): { label: string; cls: string } {
  const arr: [string, string, number][] = [
    ["Inpatient", "drv-ip", m.ip_allowed],
    ["ED", "drv-ed", m.ed_allowed],
    ["Specialty Rx", "drv-rx", m.srx_allowed],
    ["Other", "drv-oth", Math.max(0, m.allowed - m.ip_allowed - m.ed_allowed - m.srx_allowed)],
  ];
  arr.sort((a, b) => b[2] - a[2]);
  return { label: arr[0]![0], cls: arr[0]![1] };
}

// Condensed benchmark rows — every number/fact preserved, prose trimmed.
const BENCH = [
  {
    theme: "High-cost concentration",
    ours: "Top 5% = 20.5% of allowed ($5,280 vs $1,150 PMPM)",
    national: "U.S.: top 5% ≈ 50% of spend; bottom 50% just 2.8%",
    sowhat: "Structural, not anomalous — a high-cost care pod is the top-ROI lever.",
  },
  {
    theme: "Avoidable ED use",
    ours: "76% of ED avoidable/potential; ED $1,127 vs urgent care $135 (8×)",
    national: "155M U.S. ED visits (2022); ~10% non-urgent; peak age 75+ (76/100)",
    sowhat: "Elderly-skewed overuse is national — triage + urgent-care/telehealth divert it.",
  },
  {
    theme: "Specialty pharmacy",
    ours: "Specialty Rx $791K; oncology biologics 43%; GLP-1 a top class",
    national: "U.S. retail Rx $467B (2024, +7.9%); fastest-growing NHE 5.7%/yr; GLP-1 driver",
    sowhat: "Steepest cost curve — PA refinement, biosimilars & site-of-care shifts hedge it.",
  },
  {
    theme: "Inpatient & readmissions",
    ours: "Inpatient = 76% of allowed ($8.6M) — largest bucket",
    national: "~1 in 5 Medicare readmit ≤30d; MedPAC: ~75% preventable (~$12B)",
    sowhat: "The Phase-2 prize — discharge planning + transitional care.",
  },
  {
    theme: "Retention & affordability",
    ours: "11.6% disenrollment; leavers +36% PMPM; #1 reason 'Premium Affordability'",
    national: "CMS: ~4.7M Marketplace drop as subsidies expire (2026); insured 91.8%→90.5% by '34",
    sowhat: "Affordability shock imminent — cost-transparency + retention outreach.",
  },
];

export default function Page() {
  const [data, setData] = useState<SBData | null>(null);
  const [filters, setFilters] = useState<Filters>(() => emptyFilters());
  const [scen, setScen] = useState<Scenario>({ srx: 10, ed: 20 });
  const [sideCollapsed, setSideCollapsed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/data.json")
      .then((r) => r.json())
      .then((d: SBData) => {
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const hcSet = useMemo(
    () => (data ? makeHcSet(data.members) : new Set<string>()),
    [data],
  );

  const d = useMemo(
    () => (data ? compute(data, filters, hcSet) : null),
    [data, filters, hcSet],
  );

  // High-cost members ("needing attention"), scoped to the active population filters.
  const [attnSort, setAttnSort] = useState<{ key: string; dir: number }>({
    key: "allowed",
    dir: -1,
  });
  const attentionMembers = useMemo(() => {
    if (!data) return [] as Member[];
    const rows = data.members
      .filter((m) => m.high_cost)
      .filter(
        (m) =>
          (filters.lob.size === 0 || filters.lob.has(m.lob)) &&
          (filters.state.size === 0 || filters.state.has(m.state)) &&
          (filters.age.size === 0 || filters.age.has(m.age_band)),
      );
    const get = ATTN_COLS.find((c) => c.key === attnSort.key)?.get ?? ((m: Member) => m.allowed);
    return rows.sort((a, b) => (Number(get(a)) - Number(get(b))) * attnSort.dir);
  }, [data, filters, attnSort]);

  // Scrollspy for the sidebar nav.
  const [activeSec, setActiveSec] = useState("top");
  useEffect(() => {
    if (!data) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveSec((e.target as HTMLElement).id);
        });
      },
      { rootMargin: "-130px 0px -72% 0px", threshold: 0 },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [data]);

  if (!data || !d) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#5a6b74",
          fontFamily:
            "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
          fontSize: 14,
        }}
      >
        Loading SummitBridge dashboard…
      </div>
    );
  }

  const M = data.meta;

  // ---- filter mutators ----
  function toggleSet(key: keyof Filters, v: string) {
    setFilters((prev) => {
      const next = { ...prev };
      const s = new Set(prev[key] as Set<string>);
      if (s.has(v)) s.delete(v);
      else s.add(v);
      (next[key] as Set<string>) = s;
      return next;
    });
  }
  function toggleHighCost() {
    setFilters((prev) => ({ ...prev, highCost: !prev.highCost }));
  }
  function reset() {
    setFilters(emptyFilters());
  }

  // ---- charts ----
  const cat = catOption(d);
  const ed = edOption(d);

  // ---- scenario math ----
  const srxSave = (d.srxAllowed * scen.srx) / 100;
  const shifted = (d.avoidableEd * scen.ed) / 100;
  const edDelta = Math.max(0, d.avgED - d.avgUC);
  const edSave = shifted * edDelta;
  const totalSave = srxSave + edSave;
  const optimized = d.totalAllowed - totalSave;

  // ---- members needing attention summary ----
  const attnTotal = attentionMembers.reduce((s, m) => s + m.allowed, 0);
  const attnAvgPmpm = attentionMembers.length
    ? attentionMembers.reduce((s, m) => s + m.pmpm, 0) / attentionMembers.length
    : 0;
  const sortHeader = (key: string) =>
    setAttnSort((p) => ({ key, dir: p.key === key ? -p.dir : -1 }));

  return (
    <div className="ceo-shell">
      <aside className={"ceo-side" + (sideCollapsed ? " collapsed" : "")}>
        <div className="cs-brand">
          <div className="ceo-logo">SB</div>
          <div className="cs-txt">
            <b>SummitBridge</b>
            <small>Executive Dashboard</small>
          </div>
        </div>
        <nav className="ceo-nav">
          <button
            className="ceo-collapse"
            onClick={() => setSideCollapsed((c) => !c)}
            aria-label={sideCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={sideCollapsed ? "Expand" : "Collapse"}
          >
            <span className="cc-ic">{sideCollapsed ? "»" : "«"}</span>
            <span className="lbl">Collapse</span>
          </button>
          <div className="nav-h">Sections</div>
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={activeSec === n.id ? "active" : ""}
              onClick={() => setActiveSec(n.id)}
              title={n.label}
            >
              <span className="n">{n.tag}</span>
              <span className="lbl">{n.label}</span>
            </a>
          ))}
        </nav>
        <div className="ceo-side-foot">
          <Link href="/member">Switch to Member Portal →</Link>
        </div>
      </aside>

      <div className="ceo-main">
      <header className="app-header">
        <Link href="/member" className="role-switch" aria-label="Switch to Member Portal">
          <span className="rs-icon">👤</span> Customer Login — Switch to Member Portal
          <span className="rs-arrow">→</span>
        </Link>
        <div className="brandline">
          <div className="mck-mark">
            McKinsey&nbsp;&amp;&nbsp;Company
            <small>Case Championship · TechQuest</small>
          </div>
          <div className="team-mark">
            Team Four MECEs
            <small>SummitBridge submission</small>
          </div>
        </div>
        <h1 className="app-title">SummitBridge Health Plan</h1>
        <div className="app-sub">
          Medical Cost &amp; Utilization Dashboard — bending the cost curve on
          high-cost claimants, avoidable care &amp; retention
        </div>
        <div className="app-meta">
          <div>
            Analysis period: <b>FY 2024</b>
          </div>
          <div>
            Cost metric: <b>Allowed amount</b>
          </div>
          <div
            dangerouslySetInnerHTML={{
              __html:
                "Exposure: <b>" + num(d.memberMonths) + "</b> member-months",
            }}
          />
        </div>
      </header>

      <div className="filterbar">
        <div className="filter-compact">
          <FilterSelect
            label="Product line"
            values={M.lobs}
            active={filters.lob}
            onToggle={(v) => toggleSet("lob", v)}
          />
          <FilterSelect
            label="State"
            values={M.states}
            active={filters.state}
            onToggle={(v) => toggleSet("state", v)}
          />
          <FilterSelect
            label="Age band"
            values={M.age_bands}
            active={filters.age}
            onToggle={(v) => toggleSet("age", v)}
          />
          <FilterSelect
            label="Category"
            values={M.cats}
            active={filters.cat}
            onToggle={(v) => toggleSet("cat", v)}
          />
          <FilterSelect
            label="Network"
            values={["Y", "N"]}
            active={filters.net}
            onToggle={(v) => toggleSet("net", v)}
            labelFn={(v) => (v === "Y" ? "In-network" : "Out-of-network")}
          />
          <FilterSelect
            label="Month"
            values={M.months}
            active={filters.months}
            onToggle={(v) => toggleSet("months", v)}
            labelFn={mlbl}
          />
          <button
            className={"toggle" + (filters.highCost ? " on active" : "")}
            onClick={toggleHighCost}
          >
            <span className="dot"></span> High-cost only
          </button>
          <button className="btn-reset" onClick={reset}>
            Reset
          </button>
          <div
            className="result-note"
            dangerouslySetInnerHTML={{
              __html:
                "<b>" +
                num(d.lines) +
                "</b> claims · <b>" +
                num(d.memberMonths) +
                "</b> MM · <b>" +
                num(d.memberCount) +
                "</b> members",
            }}
          />
        </div>
      </div>

      <main>
        {/* KPI ROW */}
        <div id="top" className="sec-anchor" />
        <div className="kpi-grid">
          <KpiCard
            label="Total allowed spend"
            value={money(d.totalAllowed)}
            sub={num(d.lines) + " claim lines"}
          />
          <KpiCard
            label="Blended PMPM"
            value={money0(d.pmpm)}
            sub="per member per month"
          />
          <KpiCard
            label="ED visits / 1,000"
            value={num(d.edPer1000)}
            sub={num(d.edCount) + " ED visits"}
            chip={["chip-mut", "utilization"]}
          />
          <KpiCard
            label="Inpatient allowed"
            value={money(d.ipAllowed)}
            sub={pct(d.ipShare) + " of allowed"}
          />
          <KpiCard
            label="Out-of-network rate"
            value={pct(d.oonRate)}
            sub={num(d.oonLines) + " OON lines · " + money(d.oonAllowed)}
          />
          <KpiCard
            label="High-cost concentration"
            value={pct(d.hcShare)}
            sub="top 5% of members"
            chip={["chip-neg", "top 5%"]}
          />
        </div>

        {/* MEMBERS NEEDING ATTENTION */}
        <div id="members" className="sec-anchor" />
        <Section tag="!">Members needing attention — high-cost claimants</Section>
        <div className="card">
          <div className="attn-head">
            <div className="attn-stat">
              <div className="as-l">Flagged members (top 5%)</div>
              <div className="as-v">{attentionMembers.length}</div>
            </div>
            <div className="attn-stat">
              <div className="as-l">Combined allowed</div>
              <div className="as-v">{money(attnTotal)}</div>
            </div>
            <div className="attn-stat">
              <div className="as-l">Avg PMPM</div>
              <div className="as-v">{money0(attnAvgPmpm)}</div>
            </div>
            <div className="attn-stat">
              <div className="as-l">Threshold (allowed)</div>
              <div className="as-v">{money0(M.hc_threshold)}</div>
            </div>
          </div>
          <div className="attn-wrap">
            <table className="attn">
              <thead>
                <tr>
                  <th style={{ cursor: "default" }}>#</th>
                  <th style={{ cursor: "default" }}>Member ID</th>
                  <th style={{ cursor: "default" }}>Product</th>
                  <th style={{ cursor: "default" }}>State</th>
                  <th style={{ cursor: "default" }}>Age</th>
                  <th style={{ cursor: "default" }}>Primary cost driver</th>
                  {ATTN_COLS.map((c) => (
                    <th key={c.key} className="num" onClick={() => sortHeader(c.key)}>
                      {c.label}
                      {attnSort.key === c.key && (
                        <span className="ar">{attnSort.dir < 0 ? "▼" : "▲"}</span>
                      )}
                    </th>
                  ))}
                  <th style={{ cursor: "default" }}>Flags</th>
                </tr>
              </thead>
              <tbody>
                {attentionMembers.map((m, i) => {
                  const drv = primaryDriver(m);
                  return (
                    <tr key={m.id}>
                      <td className="attn-rank">{i + 1}</td>
                      <td className="attn-id">{m.id}</td>
                      <td>{m.lob}</td>
                      <td>{m.state}</td>
                      <td>{m.age_band}</td>
                      <td>
                        <span className={`drv ${drv.cls}`}>{drv.label}</span>
                      </td>
                      <td className="num">{money0(m.allowed)}</td>
                      <td className="num">{money0(m.pmpm)}</td>
                      <td className="num">{m.risk.toFixed(2)}</td>
                      <td className="num">{m.ip_visits}</td>
                      <td className="num">{m.ed_visits}</td>
                      <td>
                        {m.bh ? <span className="flag flag-bh">BH</span> : null}
                        {m.disenroll ? <span className="flag flag-churn">Churn</span> : null}
                        {!m.bh && !m.disenroll ? (
                          <span style={{ color: "var(--grey-400)" }}>—</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {attentionMembers.length === 0 && (
                  <tr>
                    <td colSpan={12} style={{ textAlign: "center", padding: 24, color: "var(--grey-400)" }}>
                      No high-cost members in the current selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="hint">
            Top 5% of members by FY2024 allowed spend. Click a numeric column to sort. Narrowed by
            the Product / State / Age filters above. Primary driver = the member&apos;s largest allowed
            bucket (Inpatient / ED / Specialty Rx / Other). BH = behavioral-health claimant; Churn =
            disenrolled.
          </div>
        </div>

        {/* 01 COST STRUCTURE */}
        <div id="cost" className="sec-anchor" />
        <Section tag="01">Cost structure &amp; drivers</Section>
        <div className="grid g-2-1">
          <Card
            title="Allowed spend by service category"
            sub="Click a bar to filter the whole dashboard by that category"
          >
            <Chart
              className="chart"
              option={cat.option}
              onClick={(p) => toggleSet("cat", cat.entries[p.dataIndex][0])}
            />
          </Card>
          <Card
            title="Specialty Rx by therapeutic class"
            sub="Where the pharmacy spend concentrates"
          >
            <Chart className="chart" option={srxOption(d)} />
          </Card>
        </div>
        <div className="grid g-2" style={{ marginTop: 14 }}>
          <Card
            title="Spend & PMPM by product line"
            sub="Allowed (bars) vs blended PMPM (line)"
          >
            <Chart className="chart" option={lobOption(d, M.lobs)} />
          </Card>
          <Card
            title="Monthly trend — allowed & PMPM"
            sub="Seasonality and per-member cost trajectory"
          >
            <Chart className="chart" option={trendOption(d, M.months)} />
          </Card>
        </div>

        {/* 02 HIGH-COST */}
        <div id="highcost" className="sec-anchor" />
        <Section tag="02">High-cost claimant concentration</Section>
        <div className="grid g-2-1">
          <Card
            title="Concentration curve (Lorenz)"
            sub="Cumulative share of allowed spend by members ranked highest-cost first"
          >
            <Chart className="chart tall" option={lorenzOption(d)} />
          </Card>
          <Card
            title="Where high-cost spend goes"
            sub="Service mix for the top-5% cohort"
          >
            <Chart
              className="chart tall"
              option={hcMixOption(data, filters, hcSet)}
            />
          </Card>
        </div>

        {/* 03 AVOIDABLE */}
        <div id="avoidable" className="sec-anchor" />
        <Section tag="03">Avoidable &amp; potentially avoidable utilization</Section>
        <div className="grid g-3">
          <Card
            title="ED visits by avoidability"
            sub="ICD-10 classification · click to filter"
          >
            <Chart
              className="chart"
              option={ed.option}
              onClick={(p) => {
                if (p.name) toggleSet("cat", "ED");
              }}
            />
          </Card>
          <Card
            title="ED visits / 1,000 by age band"
            sub="Utilization intensity across cohorts"
          >
            <Chart className="chart" option={edAgeOption(d, M.age_bands)} />
          </Card>
          <Card
            title="Behavioral health — volume vs unit cost"
            sub="Low spend: driven by volume or price?"
          >
            <Chart className="chart" option={bhOption(d)} />
          </Card>
        </div>

        {/* 04 NETWORK & RETENTION */}
        <div id="network" className="sec-anchor" />
        <Section tag="04">Network leakage &amp; member retention</Section>
        <div className="grid g-3">
          <Card
            title="Out-of-network leakage by state"
            sub="OON allowed share — balance-billing & cost risk"
          >
            <Chart className="chart" option={oonOption(d, M.states)} />
          </Card>
          <Card
            title="Disenrollment reasons"
            sub="Why commercial & ACA members churn"
          >
            <Chart
              className="chart"
              option={churnOption(data.members, filters)}
            />
          </Card>
          <Card
            title="PCP quality vs member PMPM"
            sub="Do lower-quality PCP panels cost more?"
          >
            <Chart
              className="chart"
              option={qualityOption(data.members, filters)}
            />
          </Card>
        </div>

        {/* 05 SCENARIOS */}
        <div id="savings" className="sec-anchor" />
        <Section tag="05">Savings scenario modeler</Section>
        <div className="scenario">
          <div className="controls">
            <div className="ctrl">
              <label>
                Specialty pharmacy allowed reduction <b>{scen.srx}%</b>
              </label>
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={scen.srx}
                onChange={(e) =>
                  setScen((s) => ({ ...s, srx: +e.target.value }))
                }
              />
              <div className="quick">
                {[5, 10, 15].map((v) => (
                  <button
                    key={v}
                    onClick={() => setScen((s) => ({ ...s, srx: v }))}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div className="ctrl">
              <label>
                Avoidable ED visits shifted to urgent care <b>{scen.ed}%</b>
              </label>
              <input
                type="range"
                min={0}
                max={60}
                step={5}
                value={scen.ed}
                onChange={(e) =>
                  setScen((s) => ({ ...s, ed: +e.target.value }))
                }
              />
              <div className="quick">
                {[20, 40].map((v) => (
                  <button
                    key={v}
                    onClick={() => setScen((s) => ({ ...s, ed: v }))}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>
            <div className="hint">
              Modeled on the <b>current filter selection</b>. Specialty savings
              = specialty allowed × reduction. ED-shift savings = shifted
              avoidable visits × (avg allowed per ED − avg allowed per
              urgent-care visit).
            </div>
          </div>
          <div>
            <div className="savings-head">
              <div className="savings-stat">
                <div className="s-label">Modeled annual savings</div>
                <div className="s-value">{money(totalSave)}</div>
                <div className="s-sub">
                  {d.totalAllowed
                    ? pct((totalSave / d.totalAllowed) * 100) + " of allowed"
                    : " "}
                </div>
              </div>
              <div className="savings-stat alt">
                <div className="s-label">Specialty Rx savings</div>
                <div className="s-value">{money(srxSave)}</div>
                <div className="s-sub">
                  {scen.srx + "% of " + money(d.srxAllowed) + " specialty Rx"}
                </div>
              </div>
              <div className="savings-stat alt">
                <div className="s-label">ED site-of-care savings</div>
                <div className="s-value">{money(edSave)}</div>
                <div className="s-sub">
                  {shifted.toFixed(0) +
                    " visits × " +
                    money0(edDelta) +
                    " delta"}
                </div>
              </div>
            </div>
            <div className="card">
              <h3>Allowed spend bridge — baseline to optimized</h3>
              <Chart
                className="chart"
                option={waterfallOption(d, srxSave, edSave, optimized)}
              />
            </div>
          </div>
        </div>

        {/* 06 BENCHMARKS */}
        <div id="benchmarks" className="sec-anchor" />
        <Section tag="06">Validation vs national benchmarks</Section>
        <div className="card">
          <table className="bench">
            <thead>
              <tr>
                <th>Theme</th>
                <th>SummitBridge</th>
                <th>National benchmark</th>
                <th>So what</th>
              </tr>
            </thead>
            <tbody>
              {BENCH.map((b, i) => (
                <tr key={i}>
                  <td>
                    <b>{b.theme}</b>
                  </td>
                  <td>
                    <span className="metric">{b.ours}</span>
                  </td>
                  <td>{b.national}</td>
                  <td className="sowhat">{b.sowhat}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="hint">
            Sources: AHRQ, CDC/NCHS, CMS, MedPAC (per case workbook “External Benchmarks”).
          </div>
        </div>
      </main>

      <footer>
        <b>Definitions.</b> PMPM = total allowed ÷ member-months. ED visits/1,000
        = (ED claims ÷ member-months) × 1,000. High-cost = top 5% of members by
        allowed spend in FY2024 (threshold {money0(M.hc_threshold)}). OON rate =
        out-of-network claim lines ÷ total lines. &nbsp;·&nbsp; PMPM and
        per-1,000 denominators use member-month exposure for the selected
        population; category/network/avoidability filters affect spend and counts
        only, not the exposure base. &nbsp;·&nbsp; Source: SummitBridge case
        workbook (claims, member_months, enrollment, providers,
        avoidable_ed_reference). All figures computed live in-browser.
      </footer>
      </div>
    </div>
  );
}
