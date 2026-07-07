// ECharts option builders ported from app.js. Option objects typed as `any` to
// avoid ECharts type churn.
import * as echarts from "echarts";
import type { SBData, Filters, Member } from "./types";
import type { Metrics } from "./compute";
import { claimMatch, memberPop } from "./compute";
import { money, money0, num, mlbl } from "./format";

// ---- palette ----
export const NAVY = "#051c2c",
  BLUE = "#2251ff",
  CYAN = "#00a9f4";
export const CAT_COLOR: Record<string, string> = {
  Inpatient: NAVY,
  ED: BLUE,
  "Specialty Rx": CYAN,
  PCP: "#1f6fb2",
  "Urgent Care": "#7fb2e5",
  "Behavioral Health": "#8c9aa2",
};
export const AVOID_COLOR: Record<string, string> = {
  Avoidable: NAVY,
  "Potentially Avoidable": BLUE,
  "Non-Avoidable": "#8c9aa2",
  "Not Classified": "#d5dce0",
};
export const SEQ = [
  BLUE,
  NAVY,
  CYAN,
  "#1f6fb2",
  "#7fb2e5",
  "#8c9aa2",
  "#b3b9c4",
];
const AXIS = "#8c9aa2",
  GRID = "#eef2f5",
  FONT =
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

// ---- helpers ----
const baseAxisLabel = { color: AXIS, fontSize: 11, fontFamily: FONT };
const grid = (o?: any): any =>
  Object.assign(
    { left: 8, right: 16, top: 18, bottom: 8, containLabel: true },
    o || {},
  );
const tip = (fmt: any): any => ({
  trigger: "axis",
  axisPointer: { type: "shadow" },
  backgroundColor: "#fff",
  borderColor: GRID,
  textStyle: { color: NAVY, fontFamily: FONT },
  extraCssText:
    "box-shadow:0 6px 20px rgba(5,28,44,.15);border-radius:8px",
  formatter: fmt,
});
const tipItem = (fmt: any): any => ({
  trigger: "item",
  backgroundColor: "#fff",
  borderColor: GRID,
  textStyle: { color: NAVY, fontFamily: FONT },
  extraCssText:
    "box-shadow:0 6px 20px rgba(5,28,44,.15);border-radius:8px",
  formatter: fmt,
});
const catAxis = (data: any, rotate?: number): any => ({
  type: "category",
  data,
  axisLabel: Object.assign({}, baseAxisLabel, { rotate: rotate || 0 }),
  axisLine: { lineStyle: { color: GRID } },
  axisTick: { show: false },
});
const valAxis = (fmt: any): any => ({
  type: "value",
  axisLabel: Object.assign({}, baseAxisLabel, { formatter: fmt }),
  splitLine: { lineStyle: { color: GRID } },
  axisLine: { show: false },
  axisTick: { show: false },
});

// ---- builders ----

// 1. Spend by category (clickable). Returns { option, entries } so the click
// handler can map dataIndex -> category.
export function catOption(d: Metrics): { option: any; entries: [string, number][] } {
  const entries = Object.entries(d.byCat).sort((a, b) => a[1] - b[1]) as [
    string,
    number,
  ][];
  const option = {
    grid: grid({ left: 4, right: 60 }),
    tooltip: tip((p: any) => `${p[0].name}<br/><b>${money0(p[0].value)}</b>`),
    xAxis: valAxis(money),
    yAxis: catAxis(entries.map((e) => e[0])),
    series: [
      {
        type: "bar",
        data: entries.map((e) => ({
          value: e[1],
          itemStyle: {
            color: CAT_COLOR[e[0]] || BLUE,
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: "62%",
        label: {
          show: true,
          position: "right",
          formatter: (p: any) => money(p.value),
          color: AXIS,
          fontSize: 10,
        },
      },
    ],
  };
  return { option, entries };
}

// Specialty Rx by therapeutic class (donut)
export function srxOption(d: Metrics): any {
  const e = Object.entries(d.srxClass).sort((a, b) => b[1] - a[1]);
  return {
    tooltip: tipItem(
      (p: any) => `${p.name}<br/><b>${money0(p.value)}</b> · ${p.percent}%`,
    ),
    legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["46%", "70%"],
        center: ["50%", "44%"],
        data: e.map((x, i) => ({
          name: x[0],
          value: x[1],
          itemStyle: { color: SEQ[i % SEQ.length] },
        })),
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
      },
    ],
  };
}

// Spend & PMPM by LOB
export function lobOption(d: Metrics, lobs: string[]): any {
  return {
    grid: grid({ right: 48 }),
    tooltip: tip((p: any) =>
      p
        .map(
          (x: any) =>
            `${x.marker}${x.seriesName}: <b>${x.seriesName === "PMPM" ? money0(x.value) : money(x.value)}</b>`,
        )
        .join("<br/>"),
    ),
    legend: { top: 0, right: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "roundRect" },
    xAxis: catAxis(lobs),
    yAxis: [valAxis(money), Object.assign(valAxis(money), { position: "right" })],
    series: [
      {
        name: "Allowed",
        type: "bar",
        barWidth: "40%",
        data: lobs.map((l) => d.byLob[l] || 0),
        itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] },
      },
      {
        name: "PMPM",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 7,
        data: lobs.map((l) => (d.mmByLob[l] ? (d.byLob[l] || 0) / d.mmByLob[l] : 0)),
        lineStyle: { color: NAVY, width: 3 },
        itemStyle: { color: NAVY },
      },
    ],
  };
}

// Monthly trend
export function trendOption(d: Metrics, months: string[]): any {
  const ms = months;
  return {
    grid: grid({ right: 48 }),
    tooltip: tip(
      (p: any) =>
        `${p[0].axisValue}<br/>` +
        p
          .map(
            (x: any) =>
              `${x.marker}${x.seriesName}: <b>${x.seriesName === "PMPM" ? money0(x.value) : money(x.value)}</b>`,
          )
          .join("<br/>"),
    ),
    legend: { top: 0, right: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "roundRect" },
    xAxis: catAxis(ms.map(mlbl)),
    yAxis: [valAxis(money), Object.assign(valAxis(money), { position: "right" })],
    series: [
      {
        name: "Allowed",
        type: "line",
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: "rgba(34,81,255,.25)" },
            { offset: 1, color: "rgba(34,81,255,0)" },
          ]),
        },
        smooth: true,
        symbol: "none",
        data: ms.map((m) => d.byMonth[m] || 0),
        lineStyle: { color: BLUE, width: 2.5 },
        itemStyle: { color: BLUE },
      },
      {
        name: "PMPM",
        type: "line",
        yAxisIndex: 1,
        smooth: true,
        symbol: "circle",
        symbolSize: 5,
        data: ms.map((m) => (d.mmByMonth[m] ? (d.byMonth[m] || 0) / d.mmByMonth[m] : 0)),
        lineStyle: { color: NAVY, width: 2, type: "dashed" },
        itemStyle: { color: NAVY },
      },
    ],
  };
}

// Lorenz concentration curve
export function lorenzOption(d: Metrics): any {
  const vals = Object.values(d.perMember).sort((a, b) => b - a);
  const total = vals.reduce((s, v) => s + v, 0) || 1;
  const n = vals.length || 1;
  const pts: [number, number][] = [[0, 0]];
  let cum = 0;
  for (let i = 0; i < vals.length; i++) {
    cum += vals[i];
    pts.push([((i + 1) / n) * 100, (cum / total) * 100]);
  }
  const at5 = pts.reduce(
    (best, p) => (p[0] <= 5.0001 ? p : best),
    [0, 0] as [number, number],
  );
  return {
    grid: grid({ left: 8, right: 16 }),
    tooltip: {
      trigger: "axis",
      backgroundColor: "#fff",
      borderColor: GRID,
      textStyle: { color: NAVY },
      formatter: (p: any) =>
        `Top ${p[0].value[0].toFixed(0)}% of members<br/><b>${p[0].value[1].toFixed(1)}%</b> of allowed spend`,
    },
    xAxis: {
      type: "value",
      max: 100,
      name: "% of members (highest-cost first)",
      nameLocation: "middle",
      nameGap: 28,
      nameTextStyle: { color: AXIS, fontSize: 11 },
      axisLabel: Object.assign({}, baseAxisLabel, { formatter: "{value}%" }),
      splitLine: { lineStyle: { color: GRID } },
    },
    yAxis: {
      type: "value",
      max: 100,
      axisLabel: Object.assign({}, baseAxisLabel, { formatter: "{value}%" }),
      splitLine: { lineStyle: { color: GRID } },
    },
    series: [
      {
        name: "Equality",
        type: "line",
        data: [
          [0, 0],
          [100, 100],
        ],
        symbol: "none",
        lineStyle: { color: "#d5dce0", type: "dashed", width: 1.5 },
        silent: true,
      },
      {
        name: "Concentration",
        type: "line",
        data: pts,
        symbol: "none",
        smooth: false,
        lineStyle: { color: BLUE, width: 3 },
        areaStyle: { color: "rgba(34,81,255,.10)" },
        markPoint: {
          symbol: "pin",
          symbolSize: 46,
          data: [
            {
              coord: at5,
              value: at5[1].toFixed(0) + "%",
              itemStyle: { color: NAVY },
            },
          ],
          label: { color: "#fff", fontSize: 10, fontWeight: 700 },
        },
        markLine: {
          silent: true,
          symbol: "none",
          lineStyle: { color: NAVY, type: "dotted" },
          data: [{ xAxis: 5 }],
        },
      },
    ],
  };
}

// High-cost service mix (donut, hc members only within current filter)
export function hcMixOption(
  SB: SBData,
  F: Filters,
  hcSet: Set<string>,
): any {
  const mix: Record<string, number> = {};
  for (const r of SB.claims.rows) {
    if (claimMatch(r, F, hcSet) && hcSet.has(r[0])) {
      mix[r[4]] = (mix[r[4]] || 0) + r[10];
    }
  }
  const e = Object.entries(mix).sort((a, b) => b[1] - a[1]);
  return {
    tooltip: tipItem(
      (p: any) => `${p.name}<br/><b>${money0(p.value)}</b> · ${p.percent}%`,
    ),
    legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
    title: {
      text: money(e.reduce((s, x) => s + x[1], 0)),
      subtext: "top-5% allowed",
      left: "center",
      top: "36%",
      textStyle: { color: NAVY, fontSize: 20, fontWeight: 800 },
      subtextStyle: { color: AXIS, fontSize: 10 },
    },
    series: [
      {
        type: "pie",
        radius: ["52%", "72%"],
        center: ["50%", "44%"],
        data: e.map((x) => ({
          name: x[0],
          value: x[1],
          itemStyle: { color: CAT_COLOR[x[0]] || BLUE },
        })),
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
      },
    ],
  };
}

// ED by avoidability (donut, clickable)
export function edOption(d: Metrics): { option: any; order: string[] } {
  const order = ["Avoidable", "Potentially Avoidable", "Non-Avoidable"];
  const e = order
    .filter((k) => d.edByAvoid[k])
    .map((k) => ({
      name: k,
      value: d.edByAvoid[k],
      itemStyle: { color: AVOID_COLOR[k] },
    }));
  const option = {
    tooltip: tipItem(
      (p: any) => `${p.name}<br/><b>${num(p.value)}</b> visits · ${p.percent}%`,
    ),
    legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
    series: [
      {
        type: "pie",
        radius: ["46%", "70%"],
        center: ["50%", "44%"],
        data: e,
        label: { show: false },
        itemStyle: { borderColor: "#fff", borderWidth: 2 },
      },
    ],
  };
  return { option, order };
}

// ED per 1000 by age band
export function edAgeOption(d: Metrics, ages: string[]): any {
  return {
    grid: grid(),
    tooltip: tip(
      (p: any) => `${p[0].name}<br/><b>${p[0].value.toFixed(0)}</b> ED / 1,000`,
    ),
    xAxis: catAxis(ages),
    yAxis: valAxis("{value}"),
    series: [
      {
        type: "bar",
        barWidth: "50%",
        data: ages.map((a) =>
          d.mmByAge[a] ? ((d.edAgeCount[a] || 0) / d.mmByAge[a]) * 1000 : 0,
        ),
        itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => p.value.toFixed(0),
          color: AXIS,
          fontSize: 10,
        },
      },
    ],
  };
}

// Behavioral health — volume vs unit cost (scatter by category)
export function bhOption(d: Metrics): any {
  const data = Object.keys(d.catCount).map((c) => ({
    name: c,
    value: [d.catCount[c], (d.byCat[c] || 0) / d.catCount[c], d.byCat[c] || 0],
    itemStyle: { color: CAT_COLOR[c] || BLUE },
  }));
  return {
    grid: grid({ left: 8, right: 20 }),
    tooltip: tipItem(
      (p: any) =>
        `${p.data.name}<br/>Volume: <b>${num(p.value[0])}</b> claims<br/>Avg allowed: <b>${money0(p.value[1])}</b>`,
    ),
    xAxis: Object.assign(valAxis(num), {
      name: "volume (claims)",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: AXIS, fontSize: 10 },
    }),
    yAxis: Object.assign(valAxis(money), {
      name: "avg allowed / claim",
      nameLocation: "middle",
      nameGap: 44,
      nameTextStyle: { color: AXIS, fontSize: 10 },
    }),
    series: [
      {
        type: "scatter",
        data,
        symbolSize: (v: any) =>
          Math.max(12, Math.min(52, Math.sqrt(v[2]) / 30)),
        label: {
          show: true,
          formatter: (p: any) => p.data.name,
          position: "top",
          color: NAVY,
          fontSize: 10,
          fontWeight: 600,
        },
      },
    ],
  };
}

// OON by state
export function oonOption(d: Metrics, states: string[]): any {
  return {
    grid: grid(),
    tooltip: tip(
      (p: any) =>
        `${p[0].name}<br/>OON allowed: <b>${money0(d.oonByState[p[0].name] || 0)}</b><br/>OON share: <b>${p[0].value.toFixed(1)}%</b>`,
    ),
    xAxis: catAxis(states),
    yAxis: valAxis("{value}%"),
    series: [
      {
        type: "bar",
        barWidth: "50%",
        data: states.map((s) =>
          d.byState[s] ? ((d.oonByState[s] || 0) / d.byState[s]) * 100 : 0,
        ),
        itemStyle: { color: NAVY, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: "top",
          formatter: (p: any) => p.value.toFixed(1) + "%",
          color: AXIS,
          fontSize: 10,
        },
      },
    ],
  };
}

// Disenrollment reasons
export function churnOption(members: Member[], F: Filters): any {
  const reasons: Record<string, number> = {};
  for (const m of members) {
    if (memberPop(m, F) && m.disenroll && m.disenroll_reason) {
      reasons[m.disenroll_reason] = (reasons[m.disenroll_reason] || 0) + 1;
    }
  }
  const e = Object.entries(reasons).sort((a, b) => a[1] - b[1]);
  return {
    grid: grid({ left: 4, right: 40 }),
    tooltip: tip(
      (p: any) => `${p[0].name}<br/><b>${num(p[0].value)}</b> disenrollments`,
    ),
    xAxis: valAxis(num),
    yAxis: catAxis(e.map((x) => x[0])),
    series: [
      {
        type: "bar",
        barWidth: "58%",
        data: e.map((x) => x[1]),
        itemStyle: { color: CYAN, borderRadius: [0, 4, 4, 0] },
        label: { show: true, position: "right", color: AXIS, fontSize: 10 },
      },
    ],
  };
}

// PCP quality vs PMPM scatter
export function qualityOption(members: Member[], F: Filters): any {
  const pts = members
    .filter((m) => memberPop(m, F) && m.pcpq && m.pmpm > 0)
    .map((m) => [m.pcpq, m.pmpm, m.high_cost]);
  return {
    grid: grid({ left: 8, right: 16 }),
    tooltip: tipItem(
      (p: any) =>
        `PCP quality: <b>${p.value[0]}</b><br/>PMPM: <b>${money0(p.value[1])}</b>`,
    ),
    xAxis: Object.assign(valAxis("{value}"), {
      name: "PCP quality score",
      nameLocation: "middle",
      nameGap: 26,
      nameTextStyle: { color: AXIS, fontSize: 10 },
      min: 2.5,
      max: 5,
    }),
    yAxis: valAxis(money),
    series: [
      {
        type: "scatter",
        symbolSize: 7,
        data: pts,
        itemStyle: {
          color: (p: any) => (p.value[2] ? NAVY : "rgba(34,81,255,.55)"),
        },
      },
    ],
  };
}

// Savings waterfall
export function waterfallOption(
  d: Metrics,
  srxSave: number,
  edSave: number,
  optimized: number,
): any {
  const base = d.totalAllowed;
  const names = ["Baseline", "Specialty Rx", "ED site-of-care", "Optimized"];
  const aux = [0, base - srxSave, base - srxSave - edSave, 0];
  const vis = [base, srxSave, edSave, optimized];
  const colors = [NAVY, BLUE, CYAN, "#1a7f5a"];
  return {
    grid: grid({ right: 20 }),
    tooltip: tip((p: any) => {
      const i = p[0].dataIndex;
      return `${names[i]}<br/><b>${money0(vis[i])}</b>`;
    }),
    xAxis: catAxis(names),
    yAxis: valAxis(money),
    series: [
      {
        type: "bar",
        stack: "w",
        itemStyle: { color: "transparent" },
        data: aux,
        silent: true,
        tooltip: { show: false },
      },
      {
        type: "bar",
        stack: "w",
        barWidth: "48%",
        data: vis.map((v, i) => ({
          value: v,
          itemStyle: { color: colors[i], borderRadius: 3 },
        })),
        label: {
          show: true,
          position: "top",
          formatter: (p: any) =>
            (p.dataIndex === 1 || p.dataIndex === 2 ? "−" : "") +
            money(p.value),
          color: NAVY,
          fontSize: 10,
          fontWeight: 700,
        },
      },
    ],
  };
}
