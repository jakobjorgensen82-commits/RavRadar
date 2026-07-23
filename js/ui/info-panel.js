import { calculateRavScore, scoreRating } from "../core/score-engine.js";

const formatNumber = (value, suffix, digits = 1) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits).replace(".", ",")} ${suffix}` : "Mangler";
const compass = value => {
  if (!Number.isFinite(Number(value))) return "–";
  const names = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
  return `${names[Math.round(Number(value) / 45) % 8]} ${Math.round(Number(value))}°`;
};
const dayLabel = iso => new Intl.DateTimeFormat("da-DK", { weekday:"short" }).format(new Date(iso)).replace(".", "");
const dateLabel = iso => new Intl.DateTimeFormat("da-DK", { day:"numeric", month:"short" }).format(new Date(iso)).replace(".", "");
const hourLabel = iso => new Intl.DateTimeFormat("da-DK", { hour:"2-digit", minute:"2-digit" }).format(new Date(iso));

function groupForecastHours(forecast) {
  const groups = new Map();
  for (const hour of forecast?.hourly || []) {
    const date = String(hour.time || "").slice(0, 10);
    if (!date) continue;
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(hour);
  }
  return [...groups.entries()].slice(0, 5).map(([date, hours]) => ({ date, hours }));
}

function bestHourForDay(day, zone, mode, history) {
  const scored = day.hours.map(hour => ({ hour, result: calculateRavScore({ mode, zone, weather:hour, history }) })).filter(item => item.result.available).sort((a,b) => b.result.score-a.result.score);
  if (!scored.length) return { hour:day.hours[Math.floor(day.hours.length/2)] || {}, result:{ available:false, score:null, level:"unavailable", components:{} }, recommended:false };
  if (mode !== "waders") return { ...scored[0], recommended:true };
  const levels = day.hours.map(hour => Number(hour.waterLevelCm)).filter(Number.isFinite);
  if (!levels.length) return { ...scored[0], recommended:false };
  const min = Math.min(...levels), max = Math.max(...levels), lowThreshold = min + (max-min)*0.4;
  const suitable = scored.filter(({ hour }) => {
    const level = Number(hour.waterLevelCm), trend = Number(hour.waterLevelTrendCm3h);
    return Number.isFinite(level) && level <= lowThreshold && (Number.isFinite(trend) ? trend <= 0 : true);
  });
  return suitable.length ? { ...suitable[0], recommended:true } : { ...scored[0], recommended:false };
}

function componentDetails(name, key, result, definition) {
  const reasons = result.componentReasons?.[key] || [];
  const componentScore = result.components?.[key];
  const componentLevel = scoreRating(componentScore).level;
  return `<details class="component-detail"><summary><span>${name}</span><strong class="component-score ${componentLevel}">${componentScore ?? "–"}/100</strong></summary><div class="component-explanation"><p><b>Hvad betyder det?</b> ${definition}</p><p><b>Hvorfor denne score?</b></p><ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("") || "<li>Der er ikke nok data til en nærmere forklaring.</li>"}</ul></div></details>`;
}

function dayTabs(days, selected = 0, className = "forecast-day-tab") {
  return `<div class="day-tabs" role="tablist">${days.map((day,index) => `<button class="${className} ${index===selected?"active":""}" type="button" data-day-index="${index}" role="tab" aria-selected="${index===selected}"><span>${dayLabel(`${day.date}T12:00:00`)}</span><small>${dateLabel(`${day.date}T12:00:00`)}</small></button>`).join("")}</div>`;
}

function forecastPanel(days, zone, mode, history) {
  if (!days.length) return `<section class="forecast-section"><h3>5-dages prognose</h3><p class="muted">Prognosen bliver vist efter næste vejr-opdatering.</p></section>`;
  const summaries = days.map(day => ({ ...day, best:bestHourForDay(day,zone,mode,history) }));
  return `<section class="forecast-section" data-forecast-section>
    <div class="section-title-row"><div><p class="eyebrow dark">Planlæg ravjagten</p><h3>5-dages prognose</h3></div></div>
    <div class="forecast-score-strip">${summaries.map((day,index) => `<button type="button" class="forecast-score-day ${index===0?"active":""}" data-day-index="${index}"><span>${dayLabel(`${day.date}T12:00:00`)}</span><b class="day-score ${day.best.result.level}">${day.best.result.available ? day.best.result.score : "–"}</b><small>${dateLabel(`${day.date}T12:00:00`)}</small></button>`).join("")}</div>
    <div class="forecast-detail" data-forecast-detail></div>
    <script type="application/json" class="forecast-payload">${escapeScriptJson(JSON.stringify(summaries))}</script>
  </section>`;
}

function tidePanel(days) {
  if (!days.length) return `<section class="tide-section"><h3>Vandstand time for time</h3><p class="muted">Vandstandsprognosen bliver vist efter næste vejr-opdatering.</p></section>`;
  return `<section class="tide-section" data-tide-section><div class="section-title-row"><div><p class="eyebrow dark">Næste fem dage</p><h3>Vandstand time for time</h3></div></div>${dayTabs(days,0,"tide-day-tab")}<div data-tide-table></div><script type="application/json" class="tide-payload">${escapeScriptJson(JSON.stringify(days))}</script></section>`;
}

export function bindZoneInfoInteractions(element, zone, mode, history) {
  const forecastSection = element.querySelector("[data-forecast-section]");
  if (forecastSection) {
    const summaries = JSON.parse(forecastSection.querySelector(".forecast-payload").textContent);
    const detail = forecastSection.querySelector("[data-forecast-detail]");
    const render = index => {
      const day = summaries[index], best = day.best, h = best.hour || {}, r = best.result || {};
      forecastSection.querySelectorAll(".forecast-score-day").forEach((button,i) => { button.classList.toggle("active",i===index); button.setAttribute("aria-selected",String(i===index)); });
      detail.innerHTML = `<div class="forecast-selected"><div><h4>${capitalize(dayLabel(`${day.date}T12:00:00`))} ${dateLabel(`${day.date}T12:00:00`)}</h4>${best.recommended?`<p>Bedste beregnede tidspunkt: <b>${hourLabel(h.time)}</b></p>`:`<p>Intet sikkert bedste tidspunkt. Se timeprognosen, da vandstand, vind og strøm ikke peger tydeligt samme vej.</p>`}</div><div class="score-badge ${r.level}"><strong>${r.available?r.score:"–"}</strong><span>RavScore</span></div></div>
        <div class="component-list compact metric-sized">${componentDetails("Jagtbarhed","huntability",r,"Hvor let og sikkert det forventes at være at finde rav med den valgte jagtform. Vind og bølger betyder mest.")}${componentDetails("Transport","transport",r,"Hvor godt vind, strøm og vandstandsændringer forventes at føre rav og let materiale mod kysten.")}${componentDetails("Frigivelse","release",r,"Sandsynligheden for at tidligere høj energi har løsnet nyt materiale fra havbund, tang og kystaflejringer.")}</div>
        <div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${formatNumber(h.windSpeedMps,"m/s")} · ${compass(h.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(h.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(h.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${formatNumber(h.currentSpeedMps,"m/s",2)} · ${compass(h.currentDirectionDeg)}</strong></div></div>`;
    };
    forecastSection.querySelectorAll(".forecast-score-day").forEach((button,index) => button.addEventListener("click",()=>render(index)));
    render(0);
  }
  const tideSection = element.querySelector("[data-tide-section]");
  if (tideSection) {
    const days = JSON.parse(tideSection.querySelector(".tide-payload").textContent), table = tideSection.querySelector("[data-tide-table]");
    const render = index => {
      tideSection.querySelectorAll(".tide-day-tab").forEach((button,i)=>{button.classList.toggle("active",i===index);button.setAttribute("aria-selected",String(i===index));});
      const valid = days[index].hours.filter(h=>Number.isFinite(Number(h.waterLevelCm)));
      const levels = valid.map(h=>Number(h.waterLevelCm)); const min=Math.min(...levels), max=Math.max(...levels);
      table.innerHTML = valid.length ? `<div class="tide-extremes"><span>Laveste <b>${Math.round(min)} cm</b></span><span>Højeste <b>${Math.round(max)} cm</b></span></div><div class="tide-table-wrap"><table class="tide-table"><thead><tr><th>Tid</th><th>Vandstand</th></tr></thead><tbody>${valid.map(h=>`<tr class="${Number(h.waterLevelCm)===min?"low":Number(h.waterLevelCm)===max?"high":""}"><td>${hourLabel(h.time)}</td><td>${Math.round(h.waterLevelCm)>0?"+":""}${Math.round(h.waterLevelCm)} cm</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Ingen vandstandsdata for denne dag.</p>`;
    };
    tideSection.querySelectorAll(".tide-day-tab").forEach((button,index)=>button.addEventListener("click",()=>render(index)));
    render(0);
  }
}

export function showZoneInfo(element, zone, result, condition, mode, options = {}) {
  const modeName = mode === "waders" ? "Waders" : "Strand", score = result.available ? result.score : "–", days = groupForecastHours(options.forecast);
  const componentHtml = result.available ? `<div class="component-list metric-sized">${componentDetails("Jagtbarhed","huntability",result,"Hvor let og sikkert det er at finde rav med den valgte jagtform. Vind og bølger betyder mest.")}${componentDetails("Transport","transport",result,"Hvor godt vind, strøm og vandstandsændringer fører rav og let materiale mod kysten.")}${componentDetails("Frigivelse","release",result,"Sandsynligheden for at tidligere høj energi har løsnet nyt materiale fra havbund, tang og kystaflejringer.")}</div>` : `<div class="metric-grid"><div class="metric"><span>Jagtbarhed</span><strong>–/100</strong></div><div class="metric"><span>Transport</span><strong>–/100</strong></div><div class="metric"><span>Frigivelse</span><strong>–/100</strong></div></div>`;
  element.innerHTML = `<button type="button" class="back-to-overview" data-close-zone>← Tilbage til oversigten</button><div class="zone-header"><div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div><div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(result.label)}</span></div></div>
    ${componentHtml}
    ${result.available ? `<div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${formatNumber(condition.windSpeedMps,"m/s")} · ${compass(condition.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(condition.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(condition.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${formatNumber(condition.currentSpeedMps,"m/s",2)} · ${compass(condition.currentDirectionDeg)}</strong></div><div class="metric"><span>Vandtemperatur</span><strong>${formatNumber(condition.waterTemperatureC,"°C")}</strong></div><div class="metric"><span>3-timers trend</span><strong>${formatNumber(condition.waterLevelTrendCm3h,"cm",0)}</strong></div></div>` : ""}
    ${forecastPanel(days,zone,mode,options.history||{})}${tidePanel(days)}
    <form id="observationForm" class="observation-form"><h3>Hvad fandt du?</h3><p>En anonym observation hjælper RavRadar med senere at forbedre modellen.</p><label class="grams-field">Valgfrit antal gram<input name="grams" type="number" min="0" max="10000" step="0.1" inputmode="decimal"></label><div class="observation-buttons"><button type="submit" name="result" value="none">Intet</button><button type="submit" name="result" value="small">Små stykker</button><button type="submit" name="result" value="medium">Noget rav</button><button type="submit" name="result" value="good">Godt fund</button></div><p id="observationStatus" class="form-status" aria-live="polite"></p></form>`;
}

function capitalize(value="") { return value.charAt(0).toUpperCase()+value.slice(1); }
function escapeScriptJson(value) { return value.replace(/</g,"\\u003c"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
