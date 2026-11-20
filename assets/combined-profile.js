window.combinedProfile = {
senior: (() => {
const GS_COLOR = {"Leader":"#00C853","Leading":"#2E7D32","Mid":"#FFC107","Slump":"#FF6B4A","Behind":"#9E9E9E","(blank)":"#55637D"};
const POS_COLOR = {"Goalkeeper":"#36A2EB","Defender":"#4CAF50","Midfielder":"#FF9800","Forward":"#F44336"};
const leagueMap = {"CSL":"#0D99FF","CL1":"#FFB300","CL2":"#7CB342","Abroad":"#B08CFF","None/Youth":"#55637d"};
// 统一评估色板（跨世代一致）：red = unclear / grey = no data
const ER_COLOR = {"Mature":"#00C853","Opportunity":"#FFD23F","Immature":"#8A93A6","Unclear":"#FF4D4F","(blank)":"#55637D"};
const EP_COLOR = {"Almost certain":"#00C853","Likely":"#6FCF6F","Opportunity":"#FFD23F","Unclear":"#FF4D4F","Immature":"#8A93A6","(blank)":"#55637D"};



const pdRatingColor = v => v >= 7 ? "#00C853" : (v >= 6.5 ? "#0D99FF" : "#FF6B4A");
function pdStars(pot){
  if (!pot) return "";
  const m = pot.match(/^(\d+(?:\.\d+)?)$/);
  if (m){
    const half = Math.round(parseFloat(m[1]) * 2);
    const full = Math.floor(half / 2);
    return "★".repeat(full) + (half % 2 ? "½" : "") + "☆".repeat(Math.max(0, 5 - Math.ceil(half / 2)));
  }
  return "";
}
function potentialValue(pot){
  const values = String(pot ?? "").trim().match(/^(\d+(?:\.\d+)?)(?:\s*[-–—~～]\s*(\d+(?:\.\d+)?))?$/);
  if (!values) return NaN;
  return values[2] == null ? Number(values[1]) : (Number(values[1]) + Number(values[2])) / 2;
}
const parsePot = pot => Number.isFinite(potentialValue(pot)) ? potentialValue(pot) : -1;
const pdMins = p => (p.cs_mins || 0) + (p.c1_mins || 0);
function pdPhoto(p, size, cls){
  const ph = p.photo
    ? `<div class="${cls}" style="width:${size}px;height:${size}px"><img src="${p.photo}" alt="${p.name}" loading="lazy" onerror="this.parentNode.innerHTML='${(p.name||'?').charAt(0).toUpperCase()}'"></div>`
    : `<div class="${cls}" style="width:${size}px;height:${size}px">${(p.name||"?").charAt(0).toUpperCase()}</div>`;
  return ph;
}
const GENERIC_POS = ["Defender", "Midfield", "Attack"];
const isGenericPos = pos => GENERIC_POS.includes(pos);
const displayPos = p => isGenericPos(p.pos) ? "no data" : (p.pos || p.major || "Unknown");
function pdEvalHTML(p){
  // 评估行：色点 + 词。GS 恒显；Readiness/Potential 仅非默认档显示（突出亮点）
  // R = Europe Readiness，P = Europe Potential（同档词区分维度）
  const parts = [];
  if (p.gs) parts.push(`<span class="ev"><i class="dot" style="background:${GS_COLOR[p.gs] || "#9aa7bd"}"></i>${p.gs}</span>`);
  if (p.er && p.er !== "Immature" && p.er !== "Unclear")
    parts.push(`<span class="ev"><i class="dot" style="background:${ER_COLOR[p.er] || "#9aa7bd"}"></i>R ${p.er}</span>`);
  if (p.ep && p.ep !== "Unclear" && p.ep !== "Immature")
    parts.push(`<span class="ev"><i class="dot" style="background:${EP_COLOR[p.ep] || "#9aa7bd"}"></i>P ${p.ep}</span>`);
  if (p.attrs || p.overview || p.ov2){
    // 有 Detailed Overview（项目前的球探报告）的球员：铅笔转金色
    parts.push(p.ov2
      ? `<span class="ev note gold" title="Overview + Detailed Overview">✎</span>`
      : `<span class="ev note" title="Overview">✎</span>`);
  }
  return parts.join("");
}


function pdStatsHTML(fstats){
  if (!fstats || !fstats.length) return "";
  const groups = {};
  fstats.forEach(s => { (groups[s.group] = groups[s.group] || []).push(s); });
  const order = ["Shooting", "Passing", "Possession", "Defending", "Discipline", "Goalkeeping", "Distribution"];
  const keys = Object.keys(groups).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
  return keys.map(g => `<div class="pm-sec"><h4>${g} (FotMob 2026)</h4><div class="pm-rows">
    ${groups[g].map(s => `<div><b>${s.stat}</b><div class="v">${s.total}${s.per90 != null ? ` <span style="color:#5d6b84">(${s.per90}/90)</span>` : ""}${s.pct != null ? ` <span style="color:#5d6b84">p${s.pct}</span>` : ""}</div></div>`).join("")}
  </div></div>`).join("");
}
function pdAttrsHTML(attrs){
  if (!attrs) return "";
  const items = [];
  const hasCJK = /[\u4e00-\u9fff]/.test(attrs);
  if (hasCJK) {
    const re = /([\u4e00-\u9fff]{1,8})([+\-]+)/g;
    let m;
    while ((m = re.exec(attrs)) !== null) items.push({w: m[1], sign: m[2]});
  } else {
    const segs = attrs.split(/[;；]/);
    for (const seg of segs) {
      const toks = seg.trim().split(/\s+/).filter(Boolean);
      let buf = [];
      const flush = (sign) => { if (buf.length) { items.push({w: buf.join(" "), sign}); buf = []; } };
      for (const tok of toks) {
        if (/^[+\-]+$/.test(tok)) { flush(tok); continue; }
        const m2 = tok.match(/^(.+?)([+\-]+)$/);
        if (m2 && (buf.length || m2[1])) { buf.push(m2[1]); flush(m2[2]); continue; }
        buf.push(tok);
      }
      if (buf.length) items.push({w: buf.join(" "), sign: "+"});
    }
  }
  if (!items.length) return `<div class="pm-sec"><h4>Attributes</h4><div class="v">${attrs}</div></div>`;
  const strengths = [], weaknesses = [];
  for (const it of items) {
    const level = it.sign.length;
    const color = it.sign.includes("+")
      ? (level >= 2 ? "#1f8a4c" : "#3aa76d")
      : (level >= 2 ? "#d6453a" : "#e07b74");
    const chip = `<span class="attr-chip" style="background:${color}">${it.w} ${it.sign}</span>`;
    (it.sign.includes("-") ? weaknesses : strengths).push(chip);
  }
  return `<div class="pm-sec"><h4>Attributes</h4><div class="pm-rows">
    <div><b>Strengths</b><div class="attr-chips" style="margin-top:4px">${strengths.join("") || "—"}</div></div>
    <div><b>Weaknesses</b><div class="attr-chips" style="margin-top:4px">${weaknesses.join("") || "—"}</div></div>
  </div></div>`;
}
/* ---- 多版本 overview：Overview（最新）+ Overview 2（项目前的球探报告，带日期）----
   版本按日期升序排列，默认选中最新一版；只有一版时不显示页签。 */
function ovEsc(s){
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
function ovBodyHTML(t){
  return ovEsc(t).split(/\n\s*\n+/).map(x => `<p>${x.replace(/\n/g,"<br>")}</p>`).join("");
}
function pdOverviewHTML(p){
  const vers = [];
  if (p.overview) vers.push({id:"cur", tag:"Overview", date:p.ov_date || "", text:p.overview});
  if (p.ov2) vers.push({id:"rep", tag:"Detailed Overview", date:p.ov2_date || "", text:p.ov2});
  if (!vers.length) return "";
  vers.sort((a,b) => String(a.date||"").localeCompare(String(b.date||"")) || (a.id === "cur" ? 1 : -1));
  if (vers.length === 1){
    const v = vers[0];
    return `<div class="pm-sec"><h4>Overview</h4>`
      + (v.date ? `<div class="ov-date">${v.date} · ${v.tag}</div>` : "")
      + `<div class="ov-body on">${ovBodyHTML(v.text)}</div></div>`;
  }
  const newest = vers[vers.length - 1].id;
  const tabs = vers.map(v =>
    `<button type="button" class="ov-tab${v.id === newest ? " on" : ""}" data-ov="${v.id}">`
    + (v.date ? `<span class="d">${v.date}</span>` : "") + `${v.tag}</button>`).join("");
  const bodies = vers.map(v =>
    `<div class="ov-body${v.id === newest ? " on" : ""}" data-ov="${v.id}">${ovBodyHTML(v.text)}</div>`).join("");
  return `<div class="pm-sec"><h4>Overview</h4><div class="ov-tabs">${tabs}</div>${bodies}`
    + `<div class="ov-note">Two dated versions, oldest first. Switch with the tabs above.</div></div>`;
}
function profileDetailsHTML(p, generated){
  const hasRt = p.rating != null;
  const stars = pdStars(p.pot);
  const ntRec = Object.entries(p.nt || {}).filter(([,v]) => v).map(([k,v]) => `${k}:${v}`).join(", ");
  const LF = {"CSL":"Chinese Super League","CL1":"China League One","CL2":"China League Two"};
  const breaks = (p.cur_break || []).filter(b => b.comp !== LF[p.league]);
  const rtCard = hasRt ? `<div class="pm-rt">
      <div class="big" style="color:${pdRatingColor(p.rating)}">${p.rating}</div>
      <div class="sm">2026 CSL avg<br>${p.rating_n} rated apps${p.apps && p.rating_n < p.apps ? " of " + p.apps : ""}${p.rating_team ? "<br>" + p.rating_team : ""}</div>
    </div>` : "";
  const bio = [displayPos(p), p.club, p.league, p.birth, p.height].filter(Boolean).join(" · ");
  // 评估条四格
  const strip = [["Standing", p.gs, GS_COLOR[p.gs] || "#9aa7bd"],
                 ["Readiness", p.er, ER_COLOR[p.er] || "#9aa7bd"],
                 ["Potential", p.ep, EP_COLOR[p.ep] || "#9aa7bd"]]
    .filter(x => x[1])
    .map(([k, v, c]) => `<div class="pm-cell"><div class="pk">${k}</div><div class="pv" style="color:${c}">${v}</div></div>`)
    .join("");
  const potCell = p.pot ? `<div class="pm-cell"><div class="pk">★ Rating</div><div class="pv" style="color:#FFD23F">${stars || p.pot}<small>pot</small></div></div>` : "";
  return `
    <button class="cls" aria-label="Close player profile">✕</button>
    <div class="pm-head">
      ${pdPhoto(p, 76, "pm-ph")}
      <div class="pm-id">
        <div class="pm-name">${p.name}${stars ? ` <span class="stars">${stars}</span>` : ""}</div>
        <div class="pm-meta">${bio}${p.nt_highest ? `<span class="nt-badge">${p.nt_highest}</span>` : ""}</div>
      </div>
      ${rtCard}
    </div>
    ${(strip || potCell) ? `<div class="pm-strip">${strip}${potCell}</div>` : ""}
    ${pdAttrsHTML(p.attrs)}
    ${pdOverviewHTML(p)}
    <div class="pm-grid2">
      <div class="pm-sec"><h4>Current Season (2026)</h4><div class="pm-rows">
        <div><b>League</b><div class="v">${p.league||"-"}</div></div>
        <div><b>Club</b><div class="v">${p.club||"-"}</div></div>
        <div><b>Appearances</b><div class="v">${p.apps||0}</div></div>
        <div><b>Position</b><div class="v">${displayPos(p)}</div></div>
        ${breaks.map(b => `<div><b>${b.comp.replace("Chinese Super League","CSL").replace("China League One","CL1").replace("China League Two","CL2")}</b><div class="v">${b.apps} apps${b.goals ? " · " + b.goals + " g" : ""}${b.assists ? " · " + b.assists + " a" : ""}${b.min ? " · " + b.min + "'" : ""}</div></div>`).join("")}
      </div></div>
      <div class="pm-sec"><h4>Career (minutes)</h4><div class="pm-rows">
        <div><b>CSL</b><div class="v">${(p.cs_mins||0).toLocaleString()}</div></div>
        <div><b>CL1</b><div class="v">${(p.c1_mins||0).toLocaleString()}</div></div>
        <div><b>Total</b><div class="v">${((p.cs_mins||0)+(p.c1_mins||0)).toLocaleString()}</div></div>
      </div>
      ${p.nt_highest ? `<h4 style="margin-top:14px">National Team</h4><div class="pm-rows">
        <div><b>Highest level</b><div class="v">${p.nt_highest} ✅</div></div>
        <div><b>Record</b><div class="v">${ntRec||"none"}</div></div>
      </div>` : ""}</div>
    </div>
    ${pdStatsHTML(p.fstats)}
    <div class="pm-foot">Data updated: ${generated} · Sources: Transfermarkt · FotMob · manual assessment</div>`;
}

return {details:profileDetailsHTML, evaluation:pdEvalHTML, potential:potentialValue};
})(),
young: (() => {


const pdPhoto = (p, size, cls) => p.photo
  ? `<div class="${cls}" style="width:${size}px;height:${size}px"><img src="${p.photo}" alt="${p.name}" loading="lazy" onerror="this.parentNode.innerHTML='${(p.name||'?').charAt(0).toUpperCase()}'"></div>`
  : `<div class="${cls}" style="width:${size}px;height:${size}px">${(p.name||"?").charAt(0).toUpperCase()}</div>`;
const displayPos = p => p.pos || p.major || "Unknown";
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));



function profileDetailsHTML(p, generated){
  const tags = (p.tags || []).map(t => `<span class="attr-chip" style="background:#3aa76d">${esc(t)}</span>`).join("");
  const strip = [["Age group", p.age_label ? p.age_label + " (" + p.year + ")" : String(p.year), "#0D99FF"],
                 ["Position", displayPos(p), "#7B61FF"],
                 ["Based", p.country || "China", "#00C853"]]
    .map(([k, v, c]) => `<div class="pm-cell"><div class="pk">${k}</div><div class="pv" style="color:${c}">${esc(v)}</div></div>`).join("");
  return `
    <button class="cls" aria-label="Close player profile">✕</button>
    <div class="pm-head">
      ${pdPhoto(p, 76, "pm-ph")}
      <div class="pm-id">
        <div class="pm-name">${esc(p.name)}${p.watch ? ` <span class="stars" style="color:var(--gold);font-size:15px">★ watch</span>` : ""}</div>
        <div class="pm-meta">${[p.cn, p.alias, displayPos(p), p.club, p.country].filter(Boolean).map(esc).join(" · ")}</div>
      </div>
    </div>
    <div class="pm-strip">${strip}</div>
    <div class="pm-grid2">
      <div class="pm-sec"><h4>Details</h4><div class="pm-rows">
        <div><b>Age group</b><div class="v">${p.age_label ? p.age_label + " (" + p.year + ")" : p.year}</div></div>
        <div><b>Position</b><div class="v">${displayPos(p)}</div></div>
        <div><b>Club / academy</b><div class="v">${esc(p.club || "-")}</div></div>
        <div><b>Based</b><div class="v">${esc(p.country || "China")}</div></div>
        ${p.alias ? `<div><b>Also written</b><div class="v">${esc(p.alias)}</div></div>` : ""}
      </div></div>
      ${(p.tags || []).length ? `<div class="pm-sec"><h4>Tags</h4><div class="pm-rows"><div><b>Markers</b><div class="attr-chips" style="margin-top:4px">${tags}</div></div></div></div>` : ""}
    </div>
    ${p.note ? `<div class="pm-sec"><h4>Overview</h4><div style="font-size:13px;line-height:1.8;color:var(--tx2)">${esc(p.note)}</div></div>` : ""}
    <div class="pm-foot">Data updated: ${generated}</div>`;
}

return {details:profileDetailsHTML};
})()
};
