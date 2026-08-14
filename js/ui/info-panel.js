import { calculateRavScore, scoreRating } from "../core/score-engine.js?v=4.0.204";
import { selectBestTimeForDay } from "../core/best-time-selector.js?v=4.0.204";

const hasNumber = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
const formatNumber = (value, suffix, digits = 1) => hasNumber(value) ? `${Number(value).toFixed(digits).replace(".", ",")} ${suffix}` : "Mangler";
const compass = value => {
  if (!hasNumber(value)) return "–";
  const names = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
  return `${names[Math.round(Number(value) / 45) % 8]} ${Math.round(Number(value))}°`;
};
const dayLabel = iso => new Intl.DateTimeFormat("da-DK", { weekday:"short" }).format(new Date(iso)).replace(".", "");
const dateLabel = iso => new Intl.DateTimeFormat("da-DK", { day:"numeric", month:"short" }).format(new Date(iso)).replace(".", "");
const hourLabel = iso => new Intl.DateTimeFormat("da-DK", { hour:"2-digit", minute:"2-digit" }).format(new Date(iso));
const directionArrow = (value, type = "current") => {
  if (!hasNumber(value)) return '<span class="direction-arrow unavailable" aria-hidden="true">↑</span>';
  // Vindretningen i datamodellen angiver, hvor vinden kommer FRA. Pilen viser, hvor den blæser HEN.
  const rotation = (Number(value) + (type === "wind" ? 180 : 0) + 360) % 360;
  const label = type === "wind" ? "Vindens bevægelsesretning" : "Strømmens bevægelsesretning";
  return `<span class="direction-arrow ${type}" style="--direction:${rotation}deg" title="${label}" aria-label="${label}">↑</span>`;
};
// Fælles renderer til både zonepanelet og alle prognosedage. Nye zoner får
// automatisk samme visning, fordi værdierne kommer fra zonens forecast/condition.
const directionMetric = (type, speed, speedSuffix, direction, digits = 1) => `<span class="direction-reading">${directionArrow(direction,type)}<span>${formatNumber(speed,speedSuffix,digits)} · ${compass(direction)}</span></span>`;

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

function bestHourForDay(day, zone, mode, history, currentWeather = null, currentResult = null) {
  return selectBestTimeForDay({ day, zone, mode, history, currentWeather, currentResult });
}

function componentDetails(name, key, result, definition) {
  const reasons = result.componentReasons?.[key] || [];
  const componentScore = result.components?.[key];
  const componentLevel = scoreRating(componentScore).level;
  const weight = result.explanation?.weights?.[key];
  const contribution = result.explanation?.contributions?.[key];
  const calculation = Number.isFinite(Number(weight)) && Number.isFinite(Number(contribution))
    ? `<p class="score-calculation"><b>Bidrag til RavScore:</b> ${componentScore} × ${Math.round(weight*100)} % = <strong>${contribution} point</strong></p>` : "";
  return `<details class="component-detail"><summary><span>${name}</span><strong class="component-score ${componentLevel}">${componentScore ?? "–"}/100</strong></summary><div class="component-explanation"><p><b>Hvad betyder det?</b> ${definition}</p>${calculation}<p><b>Hvorfor denne score?</b></p><ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("") || "<li>Der er ikke nok data til en nærmere forklaring.</li>"}</ul></div></details>`;
}

function localCoveragePanel(result, {showMapButton=true} = {}) {
  const summary=result?.localCoverageSummary;
  if(!summary)return '';
  const rows=(summary.parts||[]).map(part=>`<li><b>${escapeHtml(part.name)}</b>: RavScore ${part.score}</li>`).join('');
  return `<section class="local-coverage-panel ${escapeHtml(summary.kind)}"><p class="eyebrow dark">Hvor i zonen er forholdene bedst?</p><h3>${escapeHtml(summary.title)}</h3><p>${escapeHtml(summary.text)}</p>${rows?`<ul>${rows}</ul>`:''}${showMapButton?'<button type="button" class="show-local-parts" data-show-local-parts>Hvor er det?</button>':''}</section>`;
}




function stateExplanationPanel(result) {
  const state=result?.explanation?.transportEvent?.stateExplanation;
  if(!state?.summary)return '';
  const facts=(state.facts||[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  const metrics=[];
  if(Number.isFinite(Number(state.mobilisationPotential)))metrics.push(`<span>Mobilisering <b>${Math.round(state.mobilisationPotential)}/100</b></span>`);
  if(Number.isFinite(Number(state.nearshorePotential)))metrics.push(`<span>Nærkystpotentiale <b>${Math.round(state.nearshorePotential)}/100</b></span>`);
  return `<section class="state-explanation"><p class="eyebrow dark">Historisk tilstand</p><h3>${escapeHtml(state.phase)}</h3><p>${escapeHtml(state.summary)}</p>${metrics.length?`<div class="state-metrics">${metrics.join('')}</div>`:''}${facts?`<details><summary>Se det historiske forløb</summary><ul>${facts}</ul><p class="muted">Tilstanden forklarer historikken, men ændrer endnu ikke den numeriske RavScore i denne version.</p></details>`:''}</section>`;
}

function coastTransportExplanation(result) {
  const explanation = result?.explanation?.transportDiagnostics?.coastTransportExplanation;
  if (!explanation?.summary) return "";
  const items = (explanation.items || []).map(item => `<li class="${item.selected ? "selected" : ""}"><b>${escapeHtml(item.name)}</b>: ${escapeHtml(item.text.replace(`${item.name}: `,""))}${item.selected && explanation.items.length > 1 ? " <span class=\"anchor-used\">Vægter højest nu</span>" : ""}</li>`).join("");
  return `<section class="coast-transport-explanation"><h3>Hvad sker der ved kysten?</h3><p>${escapeHtml(explanation.summary)}</p>${items ? `<details><summary>Se vurderingen af kystens delområder</summary><ul>${items}</ul><p class="muted">RavRadar bruger ikke et tilfældigt gennemsnit. Den kystdel, som strømmen rammer mest gunstigt, vægter højest, mens de øvrige kystdele bruges som støtte og kontrol.</p></details>` : ""}</section>`;
}
function debugPanel(zone, result, condition) {
  const debugZone = result.localZone || zone;
  const debugCondition = result.localWeather || condition;
  const d = result.explanation?.transportDiagnostics || {};
  const prediction = result.prediction || {};
  const caps = (d.capsApplied || []).map(cap => `<li><code>${escapeHtml(cap.reason)}</code>: maks. ${cap.max} transportpoint</li>`).join("") || "<li>Ingen scorelofter anvendt.</li>";
  const steps = (d.steps || []).map(step => `<tr><td>${escapeHtml(step.label)}</td><td>${step.delta > 0 ? "+" : ""}${step.delta}</td><td>${Math.round(step.scoreAfter)}</td></tr>`).join("") || '<tr><td colspan="3">Ingen mellemregninger tilgængelige.</td></tr>';
  const provider = debugCondition.providerLabel || debugCondition.provider || debugCondition.currentProvenance?.provider || "DMI";
  const currentDifference = Number.isFinite(Number(d.currentDirectionDifferenceDeg)) ? `${Math.round(d.currentDirectionDifferenceDeg)}°` : "Mangler";
  const classificationLabels = { onshore:"Ind mod land", "partly-onshore":"Delvist ind mod land", "cross-shore":"Langs kysten/tværgående", offshore:"Væk fra land", "strongly-offshore":"Kraftigt væk fra land", unknown:"Ukendt" };
  return `<details class="debug-panel"><summary>Debug: vis alle mellemregninger</summary><div class="debug-content">
    <p class="debug-warning"><b>Teknisk visning.</b> Bruges til at kontrollere, at rådata, retninger og score passer fysisk sammen.</p>
    <div class="debug-grid">
      <div><span>Zone-ID</span><strong>${escapeHtml(debugZone.id)}</strong></div>
      <div><span>Datakilde</span><strong>${escapeHtml(provider)}</strong></div>
      <div><span>Pålandsretning</span><strong>${compass(debugZone.onshoreDirectionDeg)}</strong></div>
      <div><span>Retningskilde</span><strong>${escapeHtml(debugZone.onshoreDirectionSource || "Ikke angivet")}</strong></div>
      <div><span>Rå strømretning</span><strong>${compass(debugCondition.currentDirectionDeg)} (mod-retning)</strong></div>
      <div><span>Forskel strøm/land</span><strong>${currentDifference}</strong></div>
      <div><span>Strømklassifikation</span><strong>${escapeHtml(classificationLabels[d.currentClassification] || d.currentClassification || "Ukendt")}</strong></div>
      <div><span>Rå vindretning</span><strong>${compass(debugCondition.windDirectionDeg)} (fra-retning)</strong></div>
      <div><span>Vindens bevægelse</span><strong>${compass(d.windTowardDirectionDeg)}</strong></div>
      <div><span>Transport før loft</span><strong>${Number.isFinite(Number(d.scoreBeforeCaps)) ? d.scoreBeforeCaps : "–"}/100</strong></div>
      <div><span>Transport efter loft</span><strong>${Number.isFinite(Number(d.scoreAfterCaps)) ? d.scoreAfterCaps : "–"}/100</strong></div>
      <div><span>Endelig RavScore</span><strong>${result.score ?? "–"}/100</strong></div>
      <div><span>Historisk fase</span><strong>${escapeHtml(result.explanation?.transportEvent?.stateExplanation?.phase || "Ikke beregnet")}</strong></div>
      <div><span>Nærkystpotentiale</span><strong>${Number.isFinite(Number(result.explanation?.transportEvent?.shadowState?.nearshorePotential)) ? `${Math.round(result.explanation.transportEvent.shadowState.nearshorePotential)}/100` : "–"}</strong></div>
    </div>
    <h4>Transportens mellemregninger</h4><div class="debug-table-wrap"><table class="debug-table"><thead><tr><th>Trin</th><th>Ændring</th><th>Efter trin</th></tr></thead><tbody>${steps}</tbody></table></div>
    <h4>Anvendte scorelofter</h4><ul>${caps}</ul>
    <h4>Samlet score</h4><pre>${escapeHtml(JSON.stringify({ formula:result.explanation?.formula, components:result.components, weights:result.explanation?.weights, contributions:result.explanation?.contributions, rawScore:result.explanation?.rawScore, adaptiveAdjustment:result.explanation?.adaptiveAdjustment, ruleAdjustment:result.explanation?.ruleAdjustment, finalScore:result.explanation?.finalScore, historicalState:result.explanation?.transportEvent?.shadowState, stateExplanation:result.explanation?.transportEvent?.stateExplanation, ai:{ probability:prediction.probability, modelProbability:prediction.modelProbability, empiricalProbability:prediction.empiricalProbability, confidence:prediction.confidence, sampleSize:prediction.sampleSize } }, null, 2))}</pre>
  </div></details>`;
}

function dayTabs(days, selected = 0, className = "forecast-day-tab") {
  return `<div class="day-tabs" role="tablist">${days.map((day,index) => `<button class="${className} ${index===selected?"active":""}" type="button" data-day-index="${index}" role="tab" aria-selected="${index===selected}"><span>${dayLabel(`${day.date}T12:00:00`)}</span><small>${dateLabel(`${day.date}T12:00:00`)}</small></button>`).join("")}</div>`;
}

function forecastPanel(days, zone, mode, history, currentWeather, currentResult) {
  if (!days.length) return `<section class="forecast-section"><h3>5-dages prognose</h3><p class="muted">Prognosen bliver vist efter næste vejr-opdatering.</p></section>`;
  const summaries = days.map(day => ({ ...day, best:bestHourForDay(day,zone,mode,history,currentWeather,currentResult) }));
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

export function bindZoneInfoInteractions(element, zone, mode, history, options = {}) {
  if(element._ravLocalPartsHandler)element.removeEventListener('click',element._ravLocalPartsHandler);
  element._ravLocalPartsHandler = event => {
    if (event.target.closest('[data-show-local-parts]')) options.onShowLocalParts?.();
  };
  element.addEventListener('click',element._ravLocalPartsHandler);
  const forecastSection = element.querySelector("[data-forecast-section]");
  if (forecastSection) {
    const summaries = JSON.parse(forecastSection.querySelector(".forecast-payload").textContent);
    const detail = forecastSection.querySelector("[data-forecast-detail]");
    const render = index => {
      const day = summaries[index], best = day.best, h = best.hour || {}, r = best.result || {};
      forecastSection.querySelectorAll(".forecast-score-day").forEach((button,i) => { button.classList.toggle("active",i===index); button.setAttribute("aria-selected",String(i===index)); });
      detail.innerHTML = `<div class="forecast-selected"><div><h4>${capitalize(dayLabel(`${day.date}T12:00:00`))} ${dateLabel(`${day.date}T12:00:00`)}</h4>${best.recommended?`<p>Bedste beregnede tidspunkt: <b>${best.isNow?"Lige nu":hourLabel(h.time)}</b></p><p class="muted">Valgt som den højeste samlede RavScore ${best.isNow?"blandt lige nu og resten af dagen":"for dagen"}. Vandstand bruges kun som tie-breaker ved samme score.</p>${best.candidates?.length>1?`<details class="best-time-comparison"><summary>Se sammenligningen</summary><ol>${best.candidates.slice(0,5).map(candidate=>`<li><span>${candidate.isNow?"Lige nu":hourLabel(candidate.time)}</span><b>RavScore ${candidate.score}</b></li>`).join("")}</ol></details>`:""}`:`<p>Intet sikkert bedste tidspunkt. Se timeprognosen, da der mangler tilstrækkelige data.</p>`}</div><div class="score-badge ${r.level}"><strong>${r.available?r.score:"–"}</strong><span>RavScore</span></div></div>
        ${localCoveragePanel(r,{showMapButton:false})}
        <div class="component-list compact metric-sized">${componentDetails("Jagtbarhed","huntability",r,"Hvor let og sikkert det forventes at være at finde rav med den valgte jagtform. Vind og bølger betyder mest.")}${componentDetails("Transport","transport",r,"Hvor godt vind, strøm og vandstandsændringer forventes at føre rav og let materiale mod kysten.")}${componentDetails("Mobilisering","release",r,"Samlet potentiale for enten ny frigivelse eller genmobilisering af rav, som allerede ligger i nærkystzonen eller tidligere opskyl.")}</div>${r.available ? coastTransportExplanation(r) : ""}
        <div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${directionMetric("wind",h.windSpeedMps,"m/s",h.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(h.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(h.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${directionMetric("current",h.currentSpeedMps,"m/s",h.currentDirectionDeg,2)}</strong></div></div>`;
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
  const componentHtml = result.available ? `<div class="component-list metric-sized">${componentDetails("Jagtbarhed","huntability",result,"Hvor let og sikkert det er at finde rav med den valgte jagtform. Vind og bølger betyder mest.")}${componentDetails("Transport","transport",result,"Hvor godt vind, strøm og vandstandsændringer fører rav og let materiale mod kysten.")}${componentDetails("Mobilisering","release",result,"Samlet potentiale for enten ny frigivelse eller genmobilisering af rav, som allerede ligger i nærkystzonen eller tidligere opskyl.")}</div>` : `<div class="metric-grid"><div class="metric"><span>Jagtbarhed</span><strong>–/100</strong></div><div class="metric"><span>Transport</span><strong>–/100</strong></div><div class="metric"><span>Mobilisering</span><strong>–/100</strong></div></div>`;
  element.innerHTML = `<button type="button" class="back-to-overview" data-close-zone>← Tilbage til oversigten</button><div class="zone-header"><div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div><div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(result.label)}</span></div></div>
    ${localCoveragePanel(result)}
    ${componentHtml}
    ${result.available ? stateExplanationPanel(result) : ""}
    ${result.available ? coastTransportExplanation(result) : ""}
    ${result.prediction?.available ? `<section class="prediction-panel"><div><span class="eyebrow">AI-prognose</span><h3>${result.prediction.probability}% chance for ravfund</h3><p>${escapeHtml(result.prediction.label)} · sikkerhed ${result.prediction.confidence}%</p></div><details><summary>Sådan er prognosen beregnet</summary><ul>${result.prediction.reasons.map(reason=>`<li>${escapeHtml(reason)}</li>`).join("")}</ul></details></section>` : ""}
    ${result.available ? debugPanel(zone,result,condition) : ""}
    ${result.available ? `<div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${directionMetric("wind",condition.windSpeedMps,"m/s",condition.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(condition.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(condition.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${directionMetric("current",condition.currentSpeedMps,"m/s",condition.currentDirectionDeg,2)}</strong></div><div class="metric"><span>Vandtemperatur</span><strong>${formatNumber(condition.waterTemperatureC,"°C")}</strong></div><div class="metric"><span>3-timers trend</span><strong>${formatNumber(condition.waterLevelTrendCm3h,"cm",0)}</strong></div></div>` : ""}
    ${forecastPanel(days,zone,mode,options.history||{},condition,result)}${tidePanel(days)}`;
}

function capitalize(value="") { return value.charAt(0).toUpperCase()+value.slice(1); }
function escapeScriptJson(value) { return value.replace(/</g,"\\u003c"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
