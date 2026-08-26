import { scoreRating } from "../core/score-engine.js?v=4.0.285";

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
const MOBILISATION_DEFINITION = "Om bølger – ofte skabt af vind – kan have løsnet allerede tilgængeligt rav eller andet let materiale fra havbund, tang eller kystnære aflejringer og holdt det i bevægelse. Vinden giver ikke point direkte; dens virkning sker gennem bølgerne.";

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

function displayContextPanel(result, context = {}) {
  if(context.scope === 'local')return `<section class="display-context local"><p><b>Viser lokal kystdel:</b> ${escapeHtml(context.partName||result.localPartName||'Navngiven kystdel')} · ${hourLabel(context.time||result.time)}</p></section>`;
  if(context.scope === 'local-weather-missing')return `<section class="display-context warning"><p><b>Vejrdetaljer mangler for den bedste kyststrækning:</b> RavRadar viser de manglende felter som “Mangler” i stedet for at sætte vejret fra en anden del af området ind.</p></section>`;
  if(context.scope === 'local-unavailable')return `<section class="display-context warning"><p><b>RavScore er midlertidigt utilgængelig:</b> ${escapeHtml(result?.reasons?.[0]||'Der mangler sammenhængende Candidate G-data for en eller flere kystdele i zonen.')}</p><p>RavRadar viser ikke en beregnet erstatningsscore og bruger ikke den gamle scoremodel.</p></section>`;
  return '';
}




function stateExplanationPanel(result) {
  const state=result?.explanation?.transportEvent?.stateExplanation;
  if(!state?.summary)return '';
  const facts=(state.facts||[]).map(item=>`<li>${escapeHtml(item)}</li>`).join('');
  const metrics=[];
  if(Number.isFinite(Number(state.mobilisationPotential)))metrics.push(`<span>Bølgernes opbyggede virkning <b>${Math.round(state.mobilisationPotential)}/100</b></span>`);
  if(Number.isFinite(Number(state.nearshorePotential)))metrics.push(`<span>Rav ført ind mod kysten <b>${Math.round(state.nearshorePotential)}/100</b></span>`);
  const phaseLabels={
    'højenergifase':'Kraftigt vejr nu eller lige før',
    'efterstorm/indtransport':'Efter kraftigt vejr – strøm mod kysten',
    'vedvarende nærkystpotentiale':'Tidligere forhold kan stadig virke',
    'udtransport/nedbrydning':'Strøm væk fra kysten',
    'indtransport opbygges':'Strøm mod kysten er i gang',
    'rolig fase':'Rolige forhold',
    'ukendt fase':'Forløbet kan ikke bestemmes'
  };
  return `<section class="state-explanation"><p class="eyebrow dark">De seneste timers betydning</p><h3>${escapeHtml(phaseLabels[state.phase]||state.phase)}</h3><p>${escapeHtml(state.summary)}</p>${metrics.length?`<div class="state-metrics">${metrics.join('')}</div>`:''}${facts?`<details><summary>Se forløbet time for time</summary><ul>${facts}</ul><p class="muted">De viste timer indgår allerede i den aktuelle RavScore.</p></details>`:''}</section>`;
}

function coastTransportExplanation(result) {
  const explanation = result?.explanation?.transportDiagnostics?.coastTransportExplanation;
  if (!explanation?.summary) return "";
  const items = (explanation.items || []).map(item => `<li class="${item.selected ? "selected" : ""}"><b>${escapeHtml(item.name)}</b>: ${escapeHtml(item.text.replace(`${item.name}: `,""))}${item.selected && explanation.items.length > 1 ? " <span class=\"anchor-used\">Vægter højest nu</span>" : ""}</li>`).join("");
  return `<section class="coast-transport-explanation"><h3>Hvad sker der ved kysten?</h3><p>${escapeHtml(explanation.summary)}</p>${items ? `<details><summary>Se vurderingen af kystens delområder</summary><ul>${items}</ul><p class="muted">RavRadar bruger ikke et tilfældigt gennemsnit. Den kystdel, som strømmen rammer mest gunstigt, vægter højest, mens de øvrige kystdele bruges som støtte og kontrol.</p></details>` : ""}</section>`;
}

const CANDIDATE_G_PHASE_LABELS = {
  INBOUND_BUILDUP: "Indtransport bygges op",
  OUTBOUND_EROSION: "Udgående strøm reducerer transporten",
  OUTBOUND_TRANSPORT: "Kraftig udtransport",
  RETAINED_OR_NEUTRAL: "Tidligere transport bevares",
  PASSIVE_NEUTRAL_DECAY: "Tidligere transport aftager",
  NATIVE_CADENCE_HOLD: "Venter på næste naturlige strømmåling",
  SAME_TIME_HOLD: "Samme måletid fastholdes",
  BOUNDED_MEMORY_WARMUP: "Strømhistorikken bygges op",
  UNVERIFIED_PAUSE: "Ny strøm kan ikke verificeres",
};
const CANDIDATE_G_DIRECTION_LABELS = {
  INBOUND: "Ind mod kystdelen",
  ALONG_COAST: "Mest langs kysten",
  OUTBOUND: "Væk fra kystdelen",
};
const CANDIDATE_G_MEMORY_LABELS = {
  READY: "Klar",
  WINDOW_INCOMPLETE: "Historikvinduet er endnu ikke fuldt",
  WINDOW_HAS_MISSING_EVIDENCE: "Historikvinduet har en manglende måling",
  WINDOW_HAS_TIME_GAP: "Historikvinduet har et tidshul",
  LATEST_SAMPLE_MISSING: "Den nyeste strømmåling mangler",
};
const technicalScore = value => hasNumber(value) ? `${Math.round(Number(value))}/100` : "Ikke leveret";
const technicalDateTime = value => {
  const date = new Date(value);
  return value && Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat("da-DK", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).format(date)
    : "Ikke leveret";
};

function debugPanel(zone, result, condition) {
  const debugZone = result.localZone || zone;
  const debugCondition = result.localWeather || condition;
  const d = result.explanation?.transportDiagnostics || {};
  const mobilisation = result.explanation?.mobilisationDiagnostics || {};
  const isCandidateG = d.engine === "CANDIDATE_G";
  const provider = debugCondition.providerLabel || debugCondition.provider || debugCondition.currentProvenance?.provider || "DMI";
  if (!isCandidateG) return `<details class="debug-panel"><summary>Debug: vis alle mellemregninger</summary><div class="debug-content"><p class="debug-warning"><b>Teknisk visning kan ikke vises.</b> Den offentlige Candidate G-diagnostik blev ikke leveret for denne beregning.</p></div></details>`;
  const verified = d.measurementStatus === "VERIFIED";
  const held = d.measurementStatus === "NATIVE_CADENCE_HOLD";
  const currentMeasurement = verified
    ? `${compass(debugCondition.currentDirectionDeg)} (mod-retning)`
    : held
      ? "Ingen ny måling denne time; seneste verificerede tilstand fastholdes"
      : "Ingen verificeret strømmåling denne time";
  const currentDifference = verified && hasNumber(d.currentDirectionDifferenceDeg)
    ? `${Math.round(Number(d.currentDirectionDifferenceDeg))}°`
    : held ? "Fastholdes fra seneste verificerede måling" : "Kan ikke beregnes uden verificeret måling";
  const currentClass = verified
    ? CANDIDATE_G_DIRECTION_LABELS[d.currentDirectionClass] || "Retningen ligger uden for den kendte klassifikation"
    : held ? "Seneste verificerede klassifikation fastholdes i modellen" : "Kan ikke klassificeres uden verificeret måling";
  const memoryStatus = CANDIDATE_G_MEMORY_LABELS[d.transportMemoryStatus]
    || d.transportMemoryStatus
    || "Historikstatus blev ikke leveret";
  const memoryCoverage = hasNumber(d.transportMemoryCoverageHours) && hasNumber(d.transportMemoryWindowHours)
    ? `${Math.round(Number(d.transportMemoryCoverageHours))} af ${Math.round(Number(d.transportMemoryWindowHours))} timer · ${memoryStatus}`
    : memoryStatus;
  const phase = CANDIDATE_G_PHASE_LABELS[d.currentTransition] || d.currentTransition || "Fase blev ikke leveret";
  const outboundHours = hasNumber(d.outboundEpisodeEffectiveHours)
    ? `${Number(d.outboundEpisodeEffectiveHours).toFixed(1).replace(".", ",")} effektive timer`
    : "Ingen udgående episode registreret";
  const outboundLoss = hasNumber(d.outboundEpisodeLossPoints)
    ? `${Math.round(Number(d.outboundEpisodeLossPoints))} point`
    : "Ikke leveret";
  const rows = [
    ["Transportpotentiale", technicalScore(d.transportPotential), "Opbygget af det dokumenterede strømforløb."],
    ["Levering mod kysten", technicalScore(d.deliveryPotential), "Hvor meget af transportpotentialet der kan leveres kystnært."],
    ["Samlet transportkomponent", technicalScore(d.transportAndDelivery), "65 % transportpotentiale og 35 % levering mod kysten."],
    ["Rav i bevægelse", technicalScore(mobilisation.mobilisationPotential), "Bølgeforløbets opbyggede mobilisering."],
  ].map(([name,value,meaning]) => `<tr><td>${name}</td><td>${value}</td><td>${meaning}</td></tr>`).join("");
  return `<details class="debug-panel"><summary>Debug: vis alle mellemregninger</summary><div class="debug-content">
    <p class="debug-warning"><b>Teknisk Candidate G-visning.</b> Bruges til at kontrollere, at målinger, kystretning, historik og score passer fysisk sammen. Vinden indgår ikke direkte i transportscoren.</p>
    <div class="debug-grid">
      <div><span>Zone-ID</span><strong>${escapeHtml(debugZone.id)}</strong></div>
      <div><span>Scoremotor</span><strong>Candidate G · 20/50/30</strong></div>
      <div><span>Datakilde</span><strong>${escapeHtml(provider)}</strong></div>
      <div><span>Pålandsretning</span><strong>${compass(debugZone.onshoreDirectionDeg)}</strong></div>
      <div><span>Retningskilde</span><strong>${escapeHtml(debugZone.onshoreDirectionSource || "Ikke angivet")}</strong></div>
      <div><span>Aktuel strømstatus</span><strong>${escapeHtml(currentMeasurement)}</strong></div>
      <div><span>Forskel strøm/kyst</span><strong>${escapeHtml(currentDifference)}</strong></div>
      <div><span>Strømklassifikation</span><strong>${escapeHtml(currentClass)}</strong></div>
      <div><span>Transportens måletid</span><strong>${technicalDateTime(d.transportReferenceAt)}</strong></div>
      <div><span>Strømhistorik</span><strong>${escapeHtml(memoryCoverage)}</strong></div>
      <div><span>Historisk fase</span><strong>${escapeHtml(phase)}</strong></div>
      <div><span>Udgående episode</span><strong>${escapeHtml(outboundHours)}</strong></div>
      <div><span>Tab ved udgående strøm</span><strong>${escapeHtml(outboundLoss)}</strong></div>
      <div><span>Kraftig udtransport</span><strong>${d.actualOutboundTransport ? "Ja" : "Nej"}</strong></div>
      <div><span>Transportpotentiale</span><strong>${technicalScore(d.transportPotential)}</strong></div>
      <div><span>Levering mod kysten</span><strong>${technicalScore(d.deliveryPotential)}</strong></div>
      <div><span>Samlet transportkomponent</span><strong>${technicalScore(d.transportAndDelivery)}</strong></div>
      <div><span>Rav i bevægelse</span><strong>${technicalScore(mobilisation.mobilisationPotential)}</strong></div>
      <div><span>Endelig RavScore</span><strong>${result.score ?? "–"}/100</strong></div>
    </div>
    <h4>Candidate G’s beregningsled</h4><div class="debug-table-wrap"><table class="debug-table"><thead><tr><th>Led</th><th>Værdi</th><th>Betydning</th></tr></thead><tbody>${rows}</tbody></table></div>
  </div></details>`;
}

function dayTabs(days, selected = 0, className = "forecast-day-tab") {
  return `<div class="day-tabs" role="tablist">${days.map((day,index) => `<button class="${className} ${index===selected?"active":""}" type="button" data-day-index="${index}" role="tab" aria-selected="${index===selected}"><span>${dayLabel(`${day.date}T12:00:00`)}</span><small>${dateLabel(`${day.date}T12:00:00`)}</small></button>`).join("")}</div>`;
}

function forecastPanel(days, zone, mode, history, currentWeather, currentResult, bestByDate = {}) {
  if (!days.length) return `<section class="forecast-section"><h3>5-dages prognose</h3><p class="muted">Prognosen bliver vist efter næste vejr-opdatering.</p></section>`;
  const unavailable=day=>({hour:{time:`${day.date}T12:00:00`},result:{available:false,score:null,level:'unavailable',label:'RavScore midlertidigt utilgængelig',reasons:['Der mangler sammenhængende Candidate G-data for zonen denne dag.']},recommended:false,displayScope:'local-unavailable'});
  const summaries = days.map(day => {
    return { ...day, best:bestByDate[day.date]||unavailable(day) };
  });
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
      detail.innerHTML = `<div class="forecast-selected"><div><h4>${capitalize(dayLabel(`${day.date}T12:00:00`))} ${dateLabel(`${day.date}T12:00:00`)}</h4>${best.recommended?`<p>Bedste beregnede tidspunkt: <b>${best.isNow?"Lige nu":hourLabel(h.time)}</b></p><p class="muted">Dette tidspunkt har dagens højeste samlede RavScore${best.isNow?" blandt timerne fra nu og frem":""}. Hvis to tidspunkter har samme score, bruges vandstanden til at vælge mellem dem.</p>${best.candidates?.length>1?`<details class="best-time-comparison"><summary>Se sammenligningen</summary><ol>${best.candidates.slice(0,5).map(candidate=>`<li><span>${candidate.isNow?"Lige nu":hourLabel(candidate.time)}</span><b>RavScore ${candidate.score}</b></li>`).join("")}</ol></details>`:""}`:`<p>Der kan ikke vælges et bedste tidspunkt, fordi der mangler data. Se timeprognosen i stedet.</p>`}</div><div class="score-badge ${r.level}"><strong>${r.available?r.score:"–"}</strong><span>RavScore</span></div></div>
        ${displayContextPanel(r,{scope:best.displayScope,partName:r.localPartName,time:h.time})}
        ${localCoveragePanel(r,{showMapButton:false})}
        <div class="component-list compact metric-sized">${componentDetails("Søgeforhold","huntability",r,"Hvor let det er at lede på den valgte måde. Når du leder i vandet, tæller især vinden og de små bølger, som kan gøre det sværere at lyse gennem vandet.")}${componentDetails("Transport mod kysten","transport",r,"Om strømmen fører rav mod denne kyststrækning, langs kysten eller ud i havet. Ved kraftig strøm væk fra kysten kan transportscoren ende på nul.")}${componentDetails("Rav i bevægelse","release",r,MOBILISATION_DEFINITION)}</div>${r.available ? coastTransportExplanation(r) : ""}
        <div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${directionMetric("wind",h.windSpeedMps,"m/s",h.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(h.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(h.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${directionMetric("current",h.currentSpeedMps,"m/s",h.currentDirectionDeg,2)}</strong></div><div class="metric"><span>Vandstandsændring på 3 timer</span><strong>${formatNumber(h.waterLevelTrendCm3h,"cm",0)}</strong></div><div class="metric"><span>Vandtemperatur</span><strong>${formatNumber(h.waterTemperatureC,"°C")}</strong></div></div>`;
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
  const modeName = mode === "waders" ? "I vandet (waders)" : "På stranden", score = result.available ? result.score : "–", days = groupForecastHours(options.forecast);
  const componentHtml = result.available ? `<div class="component-list metric-sized">${componentDetails("Søgeforhold","huntability",result,"Hvor let det er at lede på den valgte måde. Når du leder i vandet, tæller især vinden og de små bølger, som kan gøre det sværere at lyse gennem vandet.")}${componentDetails("Transport mod kysten","transport",result,"Om strømmen fører rav mod denne kyststrækning, langs kysten eller ud i havet. Ved kraftig strøm væk fra kysten kan transportscoren ende på nul.")}${componentDetails("Rav i bevægelse","release",result,MOBILISATION_DEFINITION)}</div>` : `<div class="metric-grid"><div class="metric"><span>Søgeforhold</span><strong>–/100</strong></div><div class="metric"><span>Transport mod kysten</span><strong>–/100</strong></div><div class="metric"><span>Rav i bevægelse</span><strong>–/100</strong></div></div>`;
  element.innerHTML = `<button type="button" class="back-to-overview" data-close-zone>← Tilbage til oversigten</button><div class="zone-header"><div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div><div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(result.label)}</span></div></div>
    ${localCoveragePanel(result)}
    ${displayContextPanel(result,options.displayContext)}
    ${componentHtml}
    ${result.available ? stateExplanationPanel(result) : ""}
    ${result.available ? coastTransportExplanation(result) : ""}
    ${result.available ? debugPanel(zone,result,condition) : ""}
    ${result.available ? `<div class="metric-grid weather-grid"><div class="metric"><span>Vind</span><strong>${directionMetric("wind",condition.windSpeedMps,"m/s",condition.windDirectionDeg)}</strong></div><div class="metric"><span>Bølger</span><strong>${formatNumber(condition.waveHeightM,"m")}</strong></div><div class="metric"><span>Vandstand</span><strong>${formatNumber(condition.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>Strøm</span><strong>${directionMetric("current",condition.currentSpeedMps,"m/s",condition.currentDirectionDeg,2)}</strong></div><div class="metric"><span>Vandstandsændring på 3 timer</span><strong>${formatNumber(condition.waterLevelTrendCm3h,"cm",0)}</strong></div><div class="metric"><span>Vandtemperatur</span><strong>${formatNumber(condition.waterTemperatureC,"°C")}</strong></div></div>` : ""}
    ${forecastPanel(days,zone,mode,options.history||{},condition,result,options.bestByDate||{})}${tidePanel(days)}`;
}

function capitalize(value="") { return value.charAt(0).toUpperCase()+value.slice(1); }
function escapeScriptJson(value) { return value.replace(/</g,"\\u003c"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
