(() => {
  const DATA = window.combinedReportData;
  const panel = document.getElementById("report-charts");
  const overview = document.getElementById("all-players");
  if (!DATA || !panel) return;
  document.getElementById("combined-coverage").textContent =
    "Position charts and profiles include all " + DATA.kpi.total +
    " players. League and scouting charts use the " + DATA.assessed +
    " players in the 2003–10 reports.";
  function renderCharts() {
    if (typeof echarts === "undefined") {
      document.getElementById("combined-coverage").textContent += " Charts could not be loaded.";
      return;
    }

const charts = {};
function openChartProfile(name, cohort) {
  if (DATA.cohorts) window.openCombinedProfile?.(name, cohort);
  else openPD(name);
}
function playerAxisLayout(width) {
  const labelWidth = Math.min(215, Math.max(96, Math.round(width * .43)));
  return {
    grid:{left:labelWidth + 13},
    xAxis:{splitNumber:width < 380 ? 3 : 5, axisLabel:{hideOverlap:true}},
    yAxis:{axisLabel:{width:labelWidth, fontSize:11, lineHeight:13, overflow:"break", interval:0}},
  };
}
const rowAxes = new Map();
function sizeChartRows(area, rows) {
  area.style.minHeight = (rows * (area.clientWidth < 380 ? 40 : 29) + 51) + "px";
}
function tooltipBounds(width) {
  return "max-width:" + Math.max(120, Math.min(285, width - 26)) + "px;white-space:normal;overflow-wrap:anywhere;";
}
function mk(id, opt){
  const area = document.getElementById(id);
  const namedRows = (["chartPos", "chartTop", "chartRating"].includes(id) || id.startsWith("fm-")) && opt.yAxis?.data;
  if (namedRows) {
    sizeChartRows(area, namedRows.length);
    rowAxes.set(id, namedRows.length);
  }
  charts[id] = echarts.init(area, "dark");
  const tooltip = {
    backgroundColor:"#101b2a", borderColor:"#526581", textStyle:{color:"#f2f6fc",fontSize:12},
    ...opt.tooltip, confine:true, renderMode:"html", className:"report-chart-tooltip",
    extraCssText:tooltipBounds(area.clientWidth),
  };
  const theme = DATA.cohorts ? {animation:false, backgroundColor:"#0b1523"} : {};
  charts[id].setOption({...opt, ...theme, tooltip});
  if (namedRows) charts[id].setOption(playerAxisLayout(charts[id].getWidth()));
  window.bindReportChart?.(id, charts[id], opt, DATA, openChartProfile);
}
const EXP_BG = "#0a1120";
document.addEventListener("click", e => {
  const b = e.target.closest(".btn[data-chart]");
  if (!b) return;
  const id = b.getAttribute("data-chart");
  const ch = charts[id];
  if (!ch) return;
  const url = ch.getDataURL({type:"png", pixelRatio:2, backgroundColor:EXP_BG});
  const a = document.createElement("a"); a.href = url; a.download = id + ".png"; a.click();
});

// KPI
const k = DATA.kpi;
document.getElementById("kpis").innerHTML = [
  ["Total players", k.total, "blue"],
  ["CSL experience", k.cs_ever, "blue"],
  ["CL1 experience", k.c1_ever, "purple"],
  ["National-team exp.", k.nt, "green"],
].map(([lab, num, cls]) => `<div class="kpi ${cls}"><div class="num">${num}</div><div class="lab">${lab}</div></div>`).join("");
document.getElementById("heroMini").innerHTML =
  `<span><b>${k.cs_foot}</b> CSL regulars</span>` +
  `<span><b>${k.c1_foot}</b> CL1 regulars</span>` +
  `<span><b>${k.gs_good}</b> Mid or higher</span>` +
  `<span><b>${k.pot}</b> with scouted star ratings</span>`;

const GS_COLOR = {"Leader":"#00C853","Leading":"#2E7D32","Mid":"#FFC107","Slump":"#FF6B4A","Behind":"#9E9E9E","(blank)":"#55637D"};
const POS_COLOR = {"Goalkeeper":"#36A2EB","Defender":"#4CAF50","Midfielder":"#FF9800","Forward":"#F44336"};
const leagueMap = {"CSL":"#0D99FF","CL1":"#FFB300","CL2":"#7CB342","Abroad":"#B08CFF","None/Youth":"#55637d"};
// 统一评估色板（跨世代一致）：red = unclear / grey = no data
const ER_COLOR = {"Mature":"#00C853","Opportunity":"#FFD23F","Immature":"#8A93A6","Unclear":"#FF4D4F","(blank)":"#55637D"};
const EP_COLOR = {"Almost certain":"#00C853","Likely":"#6FCF6F","Opportunity":"#FFD23F","Immature":"#8A93A6","Unclear":"#FF4D4F","(blank)":"#55637D"};

// 1 Experience vs Regulars
const assessmentLabel = name => name === "(blank)" || name === "N/A" ? "Not assessed" : name;
const assessmentTooltip = p => `${assessmentLabel(p.name)}: ${p.value} players (${p.percent}%)`;
function assessmentSlices(rows, palette) {
  // Palettes list the assessment levels from highest to lowest, with blanks last.
  const order = Object.keys(palette);
  const ranks = new Map(order.map((name, index) => [name, index]));
  const rank = name => name === "(blank)" ? order.length : (ranks.get(name) ?? order.length - 1);
  return [...rows].sort((a,b) => rank(a.name) - rank(b.name))
    .map(row => ({...row, itemStyle:{color:palette[row.name] || "#55637D"}}));
}

if (DATA.cohorts) {
  mk("chartCohorts", {
    tooltip:{trigger:"axis"}, grid:{left:55,right:20,top:30,bottom:36},
    xAxis:{type:"category", data:DATA.cohorts.map(row=>row.name)},
    yAxis:{type:"value", name:"Players"},
    series:[{type:"bar", barMaxWidth:52, data:DATA.cohorts.map(row=>({value:row.value,itemStyle:{color:row.color}})),
      label:{show:true,position:"top"}}]
  });
}
mk("chartFoot", {
  tooltip:{}, legend:{top:0, textStyle:{color:"#9aa7bd"}}, grid:{left:60,right:30,top:69,bottom:40},
  xAxis:{type:"category", data:DATA.foot.cat, axisLabel:{fontSize:13}},
  yAxis:{type:"value", name:"Players", nameGap:14},
  series:[
    {name:DATA.cohorts ? "Players with appearances" : "Have played (career apps>0)", type:"bar", data:DATA.foot.ever, itemStyle:{color:"#7FA8D9"}, barMaxWidth:46, label:{show:true,position:"top"}},
    {name:DATA.cohorts ? "Regulars" : "Regulars (>=10 in a season / >=5 this yr)", type:"bar", data:DATA.foot.foot, itemStyle:{color:"#0D99FF"}, barMaxWidth:46, label:{show:true,position:"top"}}
  ]
});
// 2 Current season league distribution
mk("chartLeague", {
  tooltip:{trigger:"item", formatter:"{b}: {c} players ({d}%)"},
  legend:{bottom:0, textStyle:{color:"#9aa7bd"}},
  series:[{type:"pie", radius:["38%","66%"], center:["50%","44%"],
    data:DATA.league_dist.map(d=>({name:d.name,value:d.value,itemStyle:{color:leagueMap[d.name]||"#888"}})),
    label:{position:"inside", formatter:p=>p.percent>=7 ? String(p.value) : "", color:"#fff"}, labelLine:{show:false}}]
});
// 3 Position distribution
const posFine = DATA.pos_fine.filter(d=>d.value>0);
const positionBars = posFine.map(d=>({value:d.value, itemStyle:{color:POS_COLOR[d.major]||"#888"}}));
mk("chartPos", {
  tooltip:{trigger:"axis"}, grid:{left:104,right:35,top:6,bottom:34},
  xAxis:{type:"value", name:"Players", nameLocation:"middle", nameGap:19},
  yAxis:{type:"category", inverse:true, data:posFine.map(d=>d.name)},
  series:[{type:"bar", data:positionBars, barMaxWidth:17, label:{show:true,position:"right"}}]
});
// 4 Position strength
mk("chartPosGood", {
  tooltip:{}, legend:{top:0, textStyle:{color:"#9aa7bd"}}, grid:{left:60,right:20,top:45,bottom:40},
  xAxis:{type:"category", data:DATA.pos_major},
  yAxis:{type:"value", name:"Players", nameGap:14},
  series:[
    {name:"Mid or higher", type:"bar", stack:"t", data:DATA.pos_good, itemStyle:{color:"#FFC107"}},
    {name:"Others", type:"bar", stack:"t", data:DATA.pos_major.map((n,i)=>DATA.pos_all[i]-DATA.pos_good[i]), itemStyle:{color:"#33405C"}}
  ]
});
// 5 National team coverage
mk("chartNt", {
  tooltip:{formatter: p => `${p.name}: ${p.value} players`},
  grid:{left:70,right:20,top:30,bottom:40},
  xAxis:{type:"category", data:DATA.nt_cov.map(d=>d.name)},
  yAxis:{type:"value", name:"Players", nameGap:14},
  series:[{type:"bar", barMaxWidth:36, data:DATA.nt_cov.map(d=>d.value), itemStyle:{color:"#7B61FF"}, label:{show:true,position:"top"}}]
});
// 6 Generation Standing
mk("chartGs", {
  tooltip:{trigger:"item", formatter:assessmentTooltip},
  legend:{bottom:0, formatter:assessmentLabel, textStyle:{color:"#9aa7bd"}},
  series:[{type:"pie", radius:["38%","66%"], center:["50%","44%"],
    data:assessmentSlices(DATA.gs_dist, GS_COLOR),
    label:{position:"inside", formatter:p=>p.percent>=7 ? String(p.value) : "", color:"#fff"}, labelLine:{show:false}}]
});
// 7 Europe readiness + potential
const readinessLevels = assessmentSlices(DATA.er_dist, ER_COLOR);
const europePotentialLevels = assessmentSlices(DATA.ep_dist, EP_COLOR);
const europeLevels = new Set([...readinessLevels, ...europePotentialLevels].map(row=>row.name));
const europeLegend = ["Mature", ...Object.keys(EP_COLOR)];
europeLegend.splice(-1, 0, ...[...europeLevels].filter(name=>!europeLegend.includes(name)));
mk("chartEurope", {
  tooltip:{trigger:"item", formatter:p=>`${p.seriesName}<br>${assessmentTooltip(p)}`},
  legend:{bottom:0, data:europeLegend.filter(name=>europeLevels.has(name)), formatter:assessmentLabel, textStyle:{color:"#9aa7bd"}},
  series:[
    {name:"Europe Readiness", type:"pie", radius:["20%","40%"], center:["50%","42%"],
     data:readinessLevels, label:{show:false}},
    {name:"Europe Potential", type:"pie", radius:["48%","68%"], center:["50%","42%"],
     data:europePotentialLevels, label:{show:false}}
  ]
});
// 8 Potential ladder
// The generators put N/A first, then order star categories by ascending midpoint.
const scoutedLevels = DATA.pot_data;
mk("chartPot", {
  tooltip:{formatter:p=>`${assessmentLabel(p.name)}: ${p.value} players`}, grid:{left:65,right:35,top:30,bottom:76},
  xAxis:{type:"category", data:scoutedLevels.map(d=>d.name), axisLabel:{rotate:42,fontSize:10.5}},
  yAxis:{type:"value", name:"Players", nameGap:14},
  series:[{type:"bar", barMaxWidth:36, data:scoutedLevels.map(d=>({value:d.value,
    itemStyle:{color:d.name==="N/A" ? "#55637D" : "#FFD23F"}})), label:{show:true,position:"top"}}]
});
// 9 Top 15 minutes
mk("chartTop", {
  tooltip:{}, grid:{left:120,right:40,top:20,bottom:48},
  xAxis:{type:"value", name:"Minutes", nameLocation:"middle", nameGap:28},
  yAxis:{type:"category", data:DATA.top15.map(d=>d.name).reverse(), axisLabel:{fontSize:11}},
  series:[{type:"bar", data:DATA.top15.map(d=>({name:d.name,value:d.min})).reverse(), itemStyle:{color:"#0D99FF"}, label:{show:true,position:"right",fontSize:11}}]
});
// 10 Playing time by position
mk("chartPosTime", {
  tooltip:{}, legend:{top:0, textStyle:{color:"#9aa7bd"}}, grid:{left:60,right:20,top:45,bottom:40},
  xAxis:{type:"category", data:DATA.pos_time.majors, axisLabel:{fontSize:12.5}},
  yAxis:{type:"value", name:"Minutes", nameGap:14},
  series:[
    {name:"CSL", type:"bar", stack:"t", data:DATA.pos_time.cs, itemStyle:{color:"#0D99FF"}},
    {name:"CL1", type:"bar", stack:"t", data:DATA.pos_time.c1, itemStyle:{color:"#FFB300"}}
  ]
});
// 11 FotMob ratings
const ratData = DATA.ratings || [];
if (ratData.length) {
  const ratingBars = DATA.rating_chart_limit ? ratData.slice(-DATA.rating_chart_limit) : ratData;
  const ratColor = v => v >= 7 ? "#00C853" : (v >= 6.5 ? "#0D99FF" : "#FF6B4A");
  mk("chartRating", {
    tooltip:{formatter: p => p.name + "<br>" + p.value + " · " + p.data.n + " rated apps<br>" + p.data.team},
    grid:{left:120,right:40,top:20,bottom:48},
    xAxis:{type:"value", min: ({min}) => Math.min(5.5, Math.floor(min * 2) / 2),
      max: ({max}) => Math.max(7.5, Math.ceil(max * 2) / 2), name:"Avg rating", nameLocation:"middle", nameGap:28},
    yAxis:{type:"category", data:ratingBars.map(d=>d.name).reverse(), axisLabel:{fontSize:11, width:104, overflow:"truncate"}},
    series:[{type:"bar", barWidth:14,
      data:ratingBars.map(d=>({value:d.rating, name:d.name, n:d.n, team:d.team, itemStyle:{color:ratColor(d.rating)}})).reverse(),
      label:{show:true, position:"right", formatter: p=>`${p.value}`, fontSize:11}}]
  });
}
// 12 Minutes x rating scatter
const scatData = ratData.filter(d => d.rating != null && d.min > 0);
const scatMajors = [...new Set(scatData.map(d => d.major))].filter(Boolean);
if (scatMajors.length) {
  mk("chartScatter", {
    tooltip:{formatter: p => p.data.name + "<br>" + p.data.rating + " rating · " + p.data.min + " min<br>" + p.data.n + " rated apps · " + p.data.team},
    legend:{bottom:5, textStyle:{color:"#9aa7bd"}},
    grid:{left:65,right:30,top:30,bottom:100},
    xAxis:{type:"value", name:"2026 CSL minutes", nameLocation:"middle", nameGap:28, scale:true},
    yAxis:{type:"value", name:"Avg rating", nameGap:14,
      min: ({min}) => Math.min(5.5, Math.floor(min * 2) / 2), max: ({max}) => Math.max(7.6, Math.ceil(max * 2) / 2)},
    series: scatMajors.map((m, i) => ({
      name:m, type:"scatter", symbolSize:15,
      data: scatData.filter(d=>d.major===m).map(d=>({value:[d.min, d.rating], name:d.name, rating:d.rating, min:d.min, n:d.n, team:d.team})),
      itemStyle:{color: POS_COLOR[m] || "#888"},
      label:{show:!DATA.cohorts, formatter: p=>p.data.name, position:"top", fontSize:9, color:"#c9d4e6"},
      markLine: i === 0 ? {silent:true, symbol:"none", lineStyle:{type:"dashed", color:"#55637d"},
        data:[{yAxis:6.5}], label:{formatter:"6.5", position:"insideEndTop", fontSize:10}} : undefined
    }))
  });
}
// FM section rankings
const fmRanks = DATA.sec_rank || {};
const fmOrder = ["Shooting", "Passing", "Possession", "Defending", "Discipline", "Goalkeeping", "Distribution"];
const FM_SMALL_SAMPLE = 6;
const fmGrid = document.getElementById("fmRankGrid");
fmOrder.forEach(sec => {
  const d = fmRanks[sec];
  if (!d || !d.players.length) return;
  const card = document.createElement("div");
  card.className = "card";
  card.id = "card-fm-" + sec;
  const top = d.players.slice(0, 10).reverse();
  const discipline = sec === "Discipline";
  const label = top.map(x => x.name + (x.apps != null && x.apps < FM_SMALL_SAMPLE ? " ⚠" : ""));
  card.innerHTML = `<div class="cbar"><div class="ct"><span class="ci"></span>${sec} — Top 10 <span class="sub">avg of ${d.metrics.length} metrics${d.note ? " · " + d.note : ""}</span></div><button class="btn" data-chart="fm-${sec}">PNG</button></div><div id="fm-${sec}" class="chart"></div>`;
  fmGrid.appendChild(card);
  mk("fm-" + sec, {
    tooltip: {formatter: p => p.data.name + "<br>" + p.value + " · " + p.data.n + "/" + p.data.t + " metrics" +
      (p.data.apps != null ? "<br>" + p.data.apps + " apps" : "") +
      (p.data.score != null ? " · Score " + p.data.score : "") +
      (p.data.apps != null && p.data.apps < FM_SMALL_SAMPLE ? " · Small sample" : "")},
    grid: {left: 120, right: 40, top: 15, bottom: 48},
    xAxis: {type: "value", name: discipline ? "Rank" : "norm rank", inverse: true, nameLocation:"middle", nameGap:28,
      minInterval:discipline ? 1 : undefined},
    yAxis: {type: "category", data: label, axisLabel: {fontSize: 11}},
    series: [{type: "bar", barWidth: 13, barMinHeight: 5,
      data: top.map(x => ({value: x.avg_rank, name: x.name, n: x.n_metrics, t: d.metrics.length, apps: x.apps, score: x.score})),
      itemStyle: {color: "#7B61FF"},
      label: {show: true, position: "right", formatter: p => p.value, fontSize: 11}}]
  });
});
window.addEventListener("resize", () => {
  for (const [id, chart] of Object.entries(charts)) {
    const rows = rowAxes.get(id);
    if (rows) sizeChartRows(chart.getDom(), rows);
    chart.resize();
    if (rows) chart.setOption(playerAxisLayout(chart.getWidth()));
    chart.setOption({tooltip:{extraCssText:tooltipBounds(chart.getWidth())}});
  }
});

// ================= Impact table =================
(function(){
  const rows = (DATA.ratings || [])
    .filter(d => d.rating != null && d.min > 0)
    .map(d => {
      const adj = (d.rating - 6.0) * d.min;
      return {name: d.name, pos: d.pos || "", team: d.team || "", n: d.n || 0,
              min: d.min, rating: d.rating, score: d.min * d.rating, adj: adj};
    })
    .sort((a, b) => b.adj - a.adj || b.score - a.score);
  const body = document.getElementById("impactBody");
  if (!body) return;
  body.innerHTML = rows.map((r, i) => {
    const small = r.n < 6;
    const fmt = v => Math.round(v).toLocaleString();
    const adjCls = r.adj >= 0 ? "" : " style='color:#FF6B4A'";
    return `<tr class="${i < 3 ? "top3" : ""}">
      <td class="num">${i + 1}</td>
      <td><button type="button" class="impact-player" data-index="${i}">${r.name}${small ? " ⚠" : ""}</button></td>
      <td>${r.pos || "-"}</td>
      <td class="num">${r.n}</td>
      <td class="num">${fmt(r.min)}</td>
      <td class="num">${r.rating}</td>
      <td class="num"><b>${fmt(r.score)}</b></td>
      <td class="num"${adjCls}>${fmt(r.adj)}</td>
    </tr>`;
  }).join("");
  body.addEventListener("click", event => {
    const index = event.target.closest(".impact-player")?.dataset.index;
    if (index != null) openChartProfile(rows[Number(index)].name);
  });
  const btn = document.getElementById("impactExport");
  if (btn) btn.addEventListener("click", () => {
    const el = document.getElementById("impactTable");
    if (!el || typeof html2canvas === "undefined") return;
    html2canvas(el, {backgroundColor: "#0b1224", scale: 2}).then(canvas => {
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = "impact_ranking.png";
      a.click();
    });
  });
})();

  }
  if (!("IntersectionObserver" in window)) {
    renderCharts();
    return;
  }
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    requestAnimationFrame(renderCharts);
  }, {rootMargin: "300px"});
  observer.observe(overview);
})();
