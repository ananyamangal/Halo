"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Chart from "@/components/Chart";
import {
  KpiCard,
  FilterGroup,
  Pill,
  Section,
  Card,
} from "@/components/ui";
import type { SBData, Filters, Scenario } from "@/lib/types";
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

export default function Page() {
  const [data, setData] = useState<SBData | null>(null);
  const [filters, setFilters] = useState<Filters>(() => emptyFilters());
  const [scen, setScen] = useState<Scenario>({ srx: 10, ed: 20 });

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

  return (
    <>
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
        <div className="filter-row">
          <FilterGroup
            label="Product line (LOB)"
            values={M.lobs}
            active={filters.lob}
            onToggle={(v) => toggleSet("lob", v)}
            blue
          />
          <FilterGroup
            label="State"
            values={M.states}
            active={filters.state}
            onToggle={(v) => toggleSet("state", v)}
          />
          <FilterGroup
            label="Age band"
            values={M.age_bands}
            active={filters.age}
            onToggle={(v) => toggleSet("age", v)}
          />
          <FilterGroup
            label="Service category"
            values={M.cats}
            active={filters.cat}
            onToggle={(v) => toggleSet("cat", v)}
          />
          <FilterGroup
            label="Network"
            values={["Y", "N"]}
            active={filters.net}
            onToggle={(v) => toggleSet("net", v)}
            labelFn={(v) => (v === "Y" ? "In-network" : "Out-of-network")}
          />
          <div className="fgroup">
            <label>Cohort</label>
            <div className="pills">
              <button
                className={
                  "toggle" + (filters.highCost ? " on active" : "")
                }
                onClick={toggleHighCost}
              >
                <span className="dot"></span> High-cost (top 5%) only
              </button>
            </div>
          </div>
          <div className="filter-actions">
            <div
              className="result-note"
              dangerouslySetInnerHTML={{
                __html:
                  "<b>" +
                  num(d.lines) +
                  "</b> claims · <b>" +
                  num(d.memberMonths) +
                  "</b> member-months · <b>" +
                  num(d.memberCount) +
                  "</b> members",
              }}
            />
            <button className="btn-reset" onClick={reset}>
              Reset filters
            </button>
          </div>
        </div>
        <div className="fgroup" style={{ marginTop: 12 }}>
          <label>Month (FY2024) — click to isolate, click again to clear</label>
          <div className="pills">
            {M.months.map((m) => (
              <Pill
                key={m}
                label={mlbl(m)}
                active={filters.months.has(m)}
                onClick={() => toggleSet("months", m)}
              />
            ))}
          </div>
        </div>
      </div>

      <main>
        {/* KPI ROW */}
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

        {/* 01 COST STRUCTURE */}
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
        <Section tag="06">Validation vs national benchmarks</Section>
        <div className="card">
          <table className="bench">
            <thead>
              <tr>
                <th>Theme</th>
                <th>SummitBridge (our data)</th>
                <th>National benchmark</th>
                <th>Implication</th>
              </tr>
            </thead>
            <tbody>
              {data.benchmarks
                .filter((b) => b.theme)
                .map((b, i) => (
                  <tr key={i}>
                    <td>
                      <b>{b.theme || ""}</b>
                    </td>
                    <td>{b.ours ?? ""}</td>
                    <td>{b.national ?? ""}</td>
                    <td>{b.implication ?? ""}</td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="hint">
            Sources: AHRQ, CDC/NCHS, CMS, MedPAC (per case workbook “External
            Benchmarks”).
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
    </>
  );
}
