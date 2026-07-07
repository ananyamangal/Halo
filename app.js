/* SummitBridge Health Plan — dashboard engine.
   All KPIs and charts are recomputed live from raw claims/member-months for any
   filter combination. PMPM & per-1,000 denominators use member-month exposure for
   the selected population; category/network filters affect spend & counts only. */
(function () {
  "use strict";
  const SB = window.SB;
  const M = SB.meta;

  // ---- palette ----
  const NAVY = "#051c2c", BLUE = "#2251ff", CYAN = "#00a9f4";
  const CAT_COLOR = {
    "Inpatient": NAVY, "ED": BLUE, "Specialty Rx": CYAN,
    "PCP": "#1f6fb2", "Urgent Care": "#7fb2e5", "Behavioral Health": "#8c9aa2",
  };
  const AVOID_COLOR = {
    "Avoidable": NAVY, "Potentially Avoidable": BLUE,
    "Non-Avoidable": "#8c9aa2", "Not Classified": "#d5dce0",
  };
  const SEQ = [BLUE, NAVY, CYAN, "#1f6fb2", "#7fb2e5", "#8c9aa2", "#b3b9c4"];
  const AXIS = "#8c9aa2", GRID = "#eef2f5", FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif";

  // ---- formatters ----
  const money = (n) => {
    const a = Math.abs(n);
    if (a >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return "$" + (n / 1e3).toFixed(0) + "K";
    return "$" + Math.round(n).toLocaleString();
  };
  const money0 = (n) => "$" + Math.round(n).toLocaleString();
  const num = (n) => Math.round(n).toLocaleString();
  const pct = (n, d = 1) => (n).toFixed(d) + "%";
  const MONTH_LBL = { "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr", "05": "May", "06": "Jun", "07": "Jul", "08": "Aug", "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec" };
  const mlbl = (ym) => MONTH_LBL[ym.slice(5)] || ym;

  // ---- data ----
  const C = SB.claims.rows;   // [mid,lob,state,age,cat,avoid,net,month,tclass,ctype,allowed]
  const MM = SB.mm.rows;      // [mid,lob,state,month,mm,age]
  const MEMBERS = SB.members;
  const hcSet = new Set(MEMBERS.filter((m) => m.high_cost).map((m) => m.id));
  const memberById = {}; MEMBERS.forEach((m) => (memberById[m.id] = m));

  // ---- filter state ----
  const F = { lob: new Set(), state: new Set(), age: new Set(), cat: new Set(), net: new Set(), months: new Set(), highCost: false };
  const scen = { srx: 10, ed: 20 };

  const has = (set, v) => set.size === 0 || set.has(v);
  function popClaim(r) {
    return has(F.lob, r[1]) && has(F.state, r[2]) && has(F.age, r[3]) && has(F.months, r[7]) && (!F.highCost || hcSet.has(r[0]));
  }
  function claimMatch(r) { return popClaim(r) && has(F.cat, r[4]) && has(F.net, r[6]); }
  function popMM(m) {
    return has(F.lob, m[1]) && has(F.state, m[2]) && has(F.age, m[5]) && has(F.months, m[3]) && (!F.highCost || hcSet.has(m[0]));
  }
  function memberPop(m) {
    return has(F.lob, m.lob) && has(F.state, m.state) && has(F.age, m.age_band) && (!F.highCost || m.high_cost);
  }

  function inc(o, k, v) { o[k] = (o[k] || 0) + v; }

  function compute() {
    // exposure (member-months) for the selected population
    let memberMonths = 0; const mmByLob = {}, mmByMonth = {}, mmByAge = {}, mmByState = {};
    for (const m of MM) {
      if (!popMM(m)) continue;
      const v = m[4]; memberMonths += v;
      inc(mmByLob, m[1], v); inc(mmByMonth, m[3], v); inc(mmByAge, m[5], v); inc(mmByState, m[2], v);
    }
    // claims
    let totalAllowed = 0, lines = 0, oonLines = 0, oonAllowed = 0, hcAllowed = 0;
    let edCount = 0, edAllowed = 0, ipCount = 0, ipAllowed = 0, srxAllowed = 0, ucCount = 0, ucAllowed = 0, avoidableEd = 0;
    const byCat = {}, catCount = {}, byLob = {}, byMonth = {}, byState = {}, oonByState = {}, srxClass = {},
      edByAvoid = {}, edAgeCount = {}, perMember = {};
    for (const r of C) {
      if (!claimMatch(r)) continue;
      const a = r[10], cat = r[4];
      totalAllowed += a; lines++;
      inc(byCat, cat, a); inc(catCount, cat, 1);
      inc(byLob, r[1], a); inc(byMonth, r[7], a); inc(byState, r[2], a);
      inc(perMember, r[0], a);
      if (hcSet.has(r[0])) hcAllowed += a;
      if (r[6] === "N") { oonLines++; oonAllowed += a; inc(oonByState, r[2], a); }
      if (cat === "ED") { edCount++; edAllowed += a; inc(edByAvoid, r[5], 1); inc(edAgeCount, r[3], 1); if (r[5] === "Avoidable") avoidableEd++; }
      else if (cat === "Inpatient") { ipCount++; ipAllowed += a; }
      else if (cat === "Specialty Rx") { srxAllowed += a; inc(srxClass, r[8] || "Other", a); }
      else if (cat === "Urgent Care") { ucCount++; ucAllowed += a; }
    }
    const pmpm = memberMonths ? totalAllowed / memberMonths : 0;
    return {
      memberMonths, totalAllowed, lines, pmpm,
      edCount, edAllowed, edPer1000: memberMonths ? edCount / memberMonths * 1000 : 0,
      ipCount, ipAllowed, ipShare: totalAllowed ? ipAllowed / totalAllowed * 100 : 0,
      srxAllowed, oonLines, oonAllowed, oonRate: lines ? oonLines / lines * 100 : 0,
      hcAllowed, hcShare: totalAllowed ? hcAllowed / totalAllowed * 100 : 0,
      ucCount, ucAllowed, avoidableEd,
      byCat, catCount, byLob, byMonth, byState, oonByState, srxClass, edByAvoid, edAgeCount,
      mmByLob, mmByMonth, mmByAge, mmByState, perMember,
      memberCount: Object.keys(perMember).length,
      avgED: edCount ? edAllowed / edCount : 0,
      avgUC: ucCount ? ucAllowed / ucCount : 134.70,
    };
  }

  // ---- chart registry ----
  const charts = {};
  function ch(id) { if (!charts[id]) charts[id] = echarts.init(document.getElementById(id), null, { renderer: "canvas" }); return charts[id]; }
  const baseAxisLabel = { color: AXIS, fontSize: 11, fontFamily: FONT };
  const grid = (o) => Object.assign({ left: 8, right: 16, top: 18, bottom: 8, containLabel: true }, o || {});
  const tip = (fmt) => ({ trigger: "axis", axisPointer: { type: "shadow" }, backgroundColor: "#fff", borderColor: GRID, textStyle: { color: NAVY, fontFamily: FONT }, extraCssText: "box-shadow:0 6px 20px rgba(5,28,44,.15);border-radius:8px", formatter: fmt });
  const tipItem = (fmt) => ({ trigger: "item", backgroundColor: "#fff", borderColor: GRID, textStyle: { color: NAVY, fontFamily: FONT }, extraCssText: "box-shadow:0 6px 20px rgba(5,28,44,.15);border-radius:8px", formatter: fmt });
  const catAxis = (data, rotate) => ({ type: "category", data, axisLabel: Object.assign({}, baseAxisLabel, { rotate: rotate || 0 }), axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false } });
  const valAxis = (fmt) => ({ type: "value", axisLabel: Object.assign({}, baseAxisLabel, { formatter: fmt }), splitLine: { lineStyle: { color: GRID } }, axisLine: { show: false }, axisTick: { show: false } });

  // ---- render ----
  function render() {
    const d = compute();

    // exposure text
    document.getElementById("metaExposure").innerHTML = "Exposure: <b>" + num(d.memberMonths) + "</b> member-months";
    document.getElementById("resultNote").innerHTML =
      "<b>" + num(d.lines) + "</b> claims · <b>" + num(d.memberMonths) + "</b> member-months · <b>" + num(d.memberCount) + "</b> members";

    // KPIs
    const kpis = [
      { label: "Total allowed spend", value: money(d.totalAllowed), sub: num(d.lines) + " claim lines" },
      { label: "Blended PMPM", value: money0(d.pmpm), sub: "per member per month" },
      { label: "ED visits / 1,000", value: num(d.edPer1000), sub: num(d.edCount) + " ED visits", chip: ["chip-mut", "utilization"] },
      { label: "Inpatient allowed", value: money(d.ipAllowed), sub: pct(d.ipShare) + " of allowed" },
      { label: "Out-of-network rate", value: pct(d.oonRate), sub: num(d.oonLines) + " OON lines · " + money(d.oonAllowed) },
      { label: "High-cost concentration", value: pct(d.hcShare), sub: "top 5% of members", chip: ["chip-neg", "top 5%"] },
    ];
    document.getElementById("kpis").innerHTML = kpis.map((k) =>
      `<div class="kpi"><div class="k-label">${k.label}</div>` +
      `<div class="k-value">${k.value}</div>` +
      `<div class="k-sub">${k.sub}${k.chip ? ` <span class="k-chip ${k.chip[0]}">${k.chip[1]}</span>` : ""}</div></div>`
    ).join("");

    // 1. spend by category (clickable)
    {
      const entries = Object.entries(d.byCat).sort((a, b) => a[1] - b[1]);
      ch("chartCat").setOption({
        grid: grid({ left: 4, right: 60 }), tooltip: tip((p) => `${p[0].name}<br/><b>${money0(p[0].value)}</b>`),
        xAxis: valAxis(money), yAxis: catAxis(entries.map((e) => e[0])),
        series: [{
          type: "bar", data: entries.map((e) => ({ value: e[1], itemStyle: { color: CAT_COLOR[e[0]] || BLUE, borderRadius: [0, 4, 4, 0] } })),
          barWidth: "62%", label: { show: true, position: "right", formatter: (p) => money(p.value), color: AXIS, fontSize: 10 },
        }],
      }, true);
      ch("chartCat").off("click"); ch("chartCat").on("click", (p) => toggle("cat", entries[p.dataIndex][0]));
    }
    // Specialty Rx by therapeutic class (donut)
    {
      const e = Object.entries(d.srxClass).sort((a, b) => b[1] - a[1]);
      ch("chartSrx").setOption({
        tooltip: tipItem((p) => `${p.name}<br/><b>${money0(p.value)}</b> · ${p.percent}%`),
        legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
        series: [{ type: "pie", radius: ["46%", "70%"], center: ["50%", "44%"], data: e.map((x, i) => ({ name: x[0], value: x[1], itemStyle: { color: SEQ[i % SEQ.length] } })), label: { show: false }, itemStyle: { borderColor: "#fff", borderWidth: 2 } }],
      }, true);
    }
    // Spend & PMPM by LOB
    {
      const lobs = M.lobs;
      ch("chartLob").setOption({
        grid: grid({ right: 48 }), tooltip: tip((p) => p.map((x) => `${x.marker}${x.seriesName}: <b>${x.seriesName === "PMPM" ? money0(x.value) : money(x.value)}</b>`).join("<br/>")),
        legend: { top: 0, right: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "roundRect" },
        xAxis: catAxis(lobs), yAxis: [valAxis(money), Object.assign(valAxis(money), { position: "right" })],
        series: [
          { name: "Allowed", type: "bar", barWidth: "40%", data: lobs.map((l) => d.byLob[l] || 0), itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] } },
          { name: "PMPM", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 7, data: lobs.map((l) => d.mmByLob[l] ? (d.byLob[l] || 0) / d.mmByLob[l] : 0), lineStyle: { color: NAVY, width: 3 }, itemStyle: { color: NAVY } },
        ],
      }, true);
    }
    // Monthly trend
    {
      const ms = M.months;
      ch("chartTrend").setOption({
        grid: grid({ right: 48 }), tooltip: tip((p) => `${p[0].axisValue}<br/>` + p.map((x) => `${x.marker}${x.seriesName}: <b>${x.seriesName === "PMPM" ? money0(x.value) : money(x.value)}</b>`).join("<br/>")),
        legend: { top: 0, right: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "roundRect" },
        xAxis: catAxis(ms.map(mlbl)), yAxis: [valAxis(money), Object.assign(valAxis(money), { position: "right" })],
        series: [
          { name: "Allowed", type: "line", areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: "rgba(34,81,255,.25)" }, { offset: 1, color: "rgba(34,81,255,0)" }]) }, smooth: true, symbol: "none", data: ms.map((m) => d.byMonth[m] || 0), lineStyle: { color: BLUE, width: 2.5 }, itemStyle: { color: BLUE } },
          { name: "PMPM", type: "line", yAxisIndex: 1, smooth: true, symbol: "circle", symbolSize: 5, data: ms.map((m) => d.mmByMonth[m] ? (d.byMonth[m] || 0) / d.mmByMonth[m] : 0), lineStyle: { color: NAVY, width: 2, type: "dashed" }, itemStyle: { color: NAVY } },
        ],
      }, true);
    }
    // Lorenz concentration curve
    {
      const vals = Object.values(d.perMember).sort((a, b) => b - a);
      const total = vals.reduce((s, v) => s + v, 0) || 1; const n = vals.length || 1;
      const pts = [[0, 0]]; let cum = 0;
      for (let i = 0; i < vals.length; i++) { cum += vals[i]; pts.push([(i + 1) / n * 100, cum / total * 100]); }
      const at5 = pts.reduce((best, p) => (p[0] <= 5.0001 ? p : best), [0, 0]);
      ch("chartLorenz").setOption({
        grid: grid({ left: 8, right: 16 }),
        tooltip: { trigger: "axis", backgroundColor: "#fff", borderColor: GRID, textStyle: { color: NAVY }, formatter: (p) => `Top ${p[0].value[0].toFixed(0)}% of members<br/><b>${p[0].value[1].toFixed(1)}%</b> of allowed spend` },
        xAxis: { type: "value", max: 100, name: "% of members (highest-cost first)", nameLocation: "middle", nameGap: 28, nameTextStyle: { color: AXIS, fontSize: 11 }, axisLabel: Object.assign({}, baseAxisLabel, { formatter: "{value}%" }), splitLine: { lineStyle: { color: GRID } } },
        yAxis: { type: "value", max: 100, axisLabel: Object.assign({}, baseAxisLabel, { formatter: "{value}%" }), splitLine: { lineStyle: { color: GRID } } },
        series: [
          { name: "Equality", type: "line", data: [[0, 0], [100, 100]], symbol: "none", lineStyle: { color: "#d5dce0", type: "dashed", width: 1.5 }, silent: true },
          { name: "Concentration", type: "line", data: pts, symbol: "none", smooth: false, lineStyle: { color: BLUE, width: 3 }, areaStyle: { color: "rgba(34,81,255,.10)" },
            markPoint: { symbol: "pin", symbolSize: 46, data: [{ coord: at5, value: at5[1].toFixed(0) + "%", itemStyle: { color: NAVY } }], label: { color: "#fff", fontSize: 10, fontWeight: 700 } },
            markLine: { silent: true, symbol: "none", lineStyle: { color: NAVY, type: "dotted" }, data: [{ xAxis: 5 }] } },
        ],
      }, true);
    }
    // High-cost service mix (donut, hc members only within current filter)
    {
      const mix = {};
      for (const r of C) { if (claimMatch(r) && hcSet.has(r[0])) inc(mix, r[4], r[10]); }
      const e = Object.entries(mix).sort((a, b) => b[1] - a[1]);
      ch("chartHcMix").setOption({
        tooltip: tipItem((p) => `${p.name}<br/><b>${money0(p.value)}</b> · ${p.percent}%`),
        legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
        title: { text: money(e.reduce((s, x) => s + x[1], 0)), subtext: "top-5% allowed", left: "center", top: "36%", textStyle: { color: NAVY, fontSize: 20, fontWeight: 800 }, subtextStyle: { color: AXIS, fontSize: 10 } },
        series: [{ type: "pie", radius: ["52%", "72%"], center: ["50%", "44%"], data: e.map((x) => ({ name: x[0], value: x[1], itemStyle: { color: CAT_COLOR[x[0]] || BLUE } })), label: { show: false }, itemStyle: { borderColor: "#fff", borderWidth: 2 } }],
      }, true);
    }
    // ED by avoidability (donut, clickable)
    {
      const order = ["Avoidable", "Potentially Avoidable", "Non-Avoidable"];
      const e = order.filter((k) => d.edByAvoid[k]).map((k) => ({ name: k, value: d.edByAvoid[k], itemStyle: { color: AVOID_COLOR[k] } }));
      ch("chartEd").setOption({
        tooltip: tipItem((p) => `${p.name}<br/><b>${num(p.value)}</b> visits · ${p.percent}%`),
        legend: { bottom: 0, textStyle: { color: AXIS, fontSize: 11 }, icon: "circle" },
        series: [{ type: "pie", radius: ["46%", "70%"], center: ["50%", "44%"], data: e, label: { show: false }, itemStyle: { borderColor: "#fff", borderWidth: 2 } }],
      }, true);
    }
    // ED per 1000 by age band
    {
      const ages = M.age_bands;
      ch("chartEdAge").setOption({
        grid: grid(), tooltip: tip((p) => `${p[0].name}<br/><b>${p[0].value.toFixed(0)}</b> ED / 1,000`),
        xAxis: catAxis(ages), yAxis: valAxis("{value}"),
        series: [{ type: "bar", barWidth: "50%", data: ages.map((a) => d.mmByAge[a] ? (d.edAgeCount[a] || 0) / d.mmByAge[a] * 1000 : 0), itemStyle: { color: BLUE, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", formatter: (p) => p.value.toFixed(0), color: AXIS, fontSize: 10 } }],
      }, true);
    }
    // Behavioral health — volume vs unit cost (scatter by category)
    {
      const data = Object.keys(d.catCount).map((c) => ({ name: c, value: [d.catCount[c], (d.byCat[c] || 0) / d.catCount[c], d.byCat[c] || 0], itemStyle: { color: CAT_COLOR[c] || BLUE } }));
      ch("chartBh").setOption({
        grid: grid({ left: 8, right: 20 }),
        tooltip: tipItem((p) => `${p.data.name}<br/>Volume: <b>${num(p.value[0])}</b> claims<br/>Avg allowed: <b>${money0(p.value[1])}</b>`),
        xAxis: Object.assign(valAxis(num), { name: "volume (claims)", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: AXIS, fontSize: 10 } }),
        yAxis: Object.assign(valAxis(money), { name: "avg allowed / claim", nameLocation: "middle", nameGap: 44, nameTextStyle: { color: AXIS, fontSize: 10 } }),
        series: [{ type: "scatter", data, symbolSize: (v) => Math.max(12, Math.min(52, Math.sqrt(v[2]) / 30)), label: { show: true, formatter: (p) => p.data.name, position: "top", color: NAVY, fontSize: 10, fontWeight: 600 } }],
      }, true);
    }
    // OON by state
    {
      const states = M.states;
      ch("chartOon").setOption({
        grid: grid(), tooltip: tip((p) => `${p[0].name}<br/>OON allowed: <b>${money0(d.oonByState[p[0].name] || 0)}</b><br/>OON share: <b>${p[0].value.toFixed(1)}%</b>`),
        xAxis: catAxis(states), yAxis: valAxis("{value}%"),
        series: [{ type: "bar", barWidth: "50%", data: states.map((s) => d.byState[s] ? (d.oonByState[s] || 0) / d.byState[s] * 100 : 0), itemStyle: { color: NAVY, borderRadius: [4, 4, 0, 0] }, label: { show: true, position: "top", formatter: (p) => p.value.toFixed(1) + "%", color: AXIS, fontSize: 10 } }],
      }, true);
    }
    // Disenrollment reasons
    {
      const reasons = {};
      for (const m of MEMBERS) { if (memberPop(m) && m.disenroll && m.disenroll_reason) inc(reasons, m.disenroll_reason, 1); }
      const e = Object.entries(reasons).sort((a, b) => a[1] - b[1]);
      ch("chartChurn").setOption({
        grid: grid({ left: 4, right: 40 }), tooltip: tip((p) => `${p[0].name}<br/><b>${num(p[0].value)}</b> disenrollments`),
        xAxis: valAxis(num), yAxis: catAxis(e.map((x) => x[0])),
        series: [{ type: "bar", barWidth: "58%", data: e.map((x) => x[1]), itemStyle: { color: CYAN, borderRadius: [0, 4, 4, 0] }, label: { show: true, position: "right", color: AXIS, fontSize: 10 } }],
      }, true);
    }
    // PCP quality vs PMPM scatter
    {
      const pts = MEMBERS.filter((m) => memberPop(m) && m.pcpq && m.pmpm > 0).map((m) => [m.pcpq, m.pmpm, m.high_cost]);
      ch("chartQuality").setOption({
        grid: grid({ left: 8, right: 16 }),
        tooltip: tipItem((p) => `PCP quality: <b>${p.value[0]}</b><br/>PMPM: <b>${money0(p.value[1])}</b>`),
        xAxis: Object.assign(valAxis("{value}"), { name: "PCP quality score", nameLocation: "middle", nameGap: 26, nameTextStyle: { color: AXIS, fontSize: 10 }, min: 2.5, max: 5 }),
        yAxis: valAxis(money),
        series: [{ type: "scatter", symbolSize: 7, data: pts, itemStyle: { color: (p) => (p.value[2] ? NAVY : "rgba(34,81,255,.55)") } }],
      }, true);
    }

    renderScenario(d);
  }

  // ---- scenario ----
  function renderScenario(d) {
    const srxSave = d.srxAllowed * scen.srx / 100;
    const shifted = d.avoidableEd * scen.ed / 100;
    const edSave = shifted * Math.max(0, d.avgED - d.avgUC);
    const total = srxSave + edSave;
    const optimized = d.totalAllowed - total;
    document.getElementById("svTotal").textContent = money(total);
    document.getElementById("svPct").textContent = d.totalAllowed ? pct(total / d.totalAllowed * 100) + " of allowed" : "";
    document.getElementById("svSrx").textContent = money(srxSave);
    document.getElementById("svSrxSub").textContent = scen.srx + "% of " + money(d.srxAllowed) + " specialty Rx";
    document.getElementById("svEd").textContent = money(edSave);
    document.getElementById("svEdSub").textContent = shifted.toFixed(0) + " visits × " + money0(Math.max(0, d.avgED - d.avgUC)) + " delta";

    // waterfall
    const base = d.totalAllowed;
    const steps = [base, -srxSave, -edSave, optimized];
    const names = ["Baseline", "Specialty Rx", "ED site-of-care", "Optimized"];
    const aux = [0, base - srxSave, base - srxSave - edSave, 0];
    const vis = [base, srxSave, edSave, optimized];
    const colors = [NAVY, BLUE, CYAN, "#1a7f5a"];
    ch("chartWaterfall").setOption({
      grid: grid({ right: 20 }),
      tooltip: tip((p) => { const i = p[0].dataIndex; return `${names[i]}<br/><b>${money0(vis[i])}</b>`; }),
      xAxis: catAxis(names), yAxis: valAxis(money),
      series: [
        { type: "bar", stack: "w", itemStyle: { color: "transparent" }, data: aux, silent: true, tooltip: { show: false } },
        { type: "bar", stack: "w", barWidth: "48%", data: vis.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 3 } })), label: { show: true, position: "top", formatter: (p) => (p.dataIndex === 1 || p.dataIndex === 2 ? "−" : "") + money(p.value), color: NAVY, fontSize: 10, fontWeight: 700 } },
      ],
    }, true);
  }

  // ---- filters UI ----
  function toggle(key, v) {
    const s = F[key];
    if (s.has(v)) s.delete(v); else s.add(v);
    syncPills(); render();
  }
  function makePills(elId, values, key, labelFn, cls) {
    const el = document.getElementById(elId);
    el.innerHTML = "";
    values.forEach((v) => {
      const b = document.createElement("button");
      b.className = "pill" + (cls ? " " + cls : "");
      b.textContent = labelFn ? labelFn(v) : v;
      b.dataset.v = v; b.dataset.key = key;
      b.onclick = () => toggle(key, v);
      el.appendChild(b);
    });
  }
  function syncPills() {
    document.querySelectorAll(".pill[data-key]").forEach((b) => {
      b.classList.toggle("active", F[b.dataset.key].has(b.dataset.v));
    });
    const hc = document.getElementById("f-highcost");
    hc.classList.toggle("on", F.highCost); hc.classList.toggle("active", F.highCost);
  }

  function initFilters() {
    makePills("f-lob", M.lobs, "lob", null, "blue");
    makePills("f-state", M.states, "state");
    makePills("f-age", M.age_bands, "age");
    makePills("f-cat", M.cats, "cat");
    makePills("f-net", ["Y", "N"], "net", (v) => (v === "Y" ? "In-network" : "Out-of-network"));
    makePills("f-month", M.months, "months", mlbl);
    document.getElementById("f-highcost").onclick = () => { F.highCost = !F.highCost; syncPills(); render(); };
    document.getElementById("btnReset").onclick = () => {
      Object.values(F).forEach((s) => s instanceof Set && s.clear()); F.highCost = false;
      syncPills(); render();
    };
    // scenario controls
    const slSrx = document.getElementById("slSrx"), slEd = document.getElementById("slEd");
    slSrx.oninput = () => { scen.srx = +slSrx.value; document.getElementById("lblSrx").textContent = scen.srx + "%"; render(); };
    slEd.oninput = () => { scen.ed = +slEd.value; document.getElementById("lblEd").textContent = scen.ed + "%"; render(); };
    document.querySelectorAll(".quick").forEach((q) => q.querySelectorAll("button").forEach((btn) => {
      btn.onclick = () => { const sl = document.getElementById(q.dataset.target); sl.value = btn.dataset.v; sl.dispatchEvent(new Event("input")); };
    }));
  }

  // ---- benchmarks + footer ----
  function initStatic() {
    const tb = document.querySelector("#benchTable tbody");
    (SB.benchmarks || []).forEach((b) => {
      if (!b.theme) return;
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><b>${b.theme || ""}</b></td><td>${b.ours ?? ""}</td><td>${b.national ?? ""}</td><td>${b.implication ?? ""}</td>`;
      tb.appendChild(tr);
    });
    document.getElementById("ftHcThr").textContent = money0(M.hc_threshold);
  }

  window.addEventListener("resize", () => Object.values(charts).forEach((c) => c.resize()));
  initFilters(); initStatic(); render();
})();
