import { scoreRating } from "../core/score-engine.js?v=4.0.295";
import { formatNumber as localizedNumber, getLanguage, getLocale, t } from "../i18n.js?v=4.0.295";

const hasNumber = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
const formatMetric = (value, suffix, digits = 1) => hasNumber(value) ? `${localizedNumber(value, { minimumFractionDigits:digits, maximumFractionDigits:digits })} ${suffix}` : t('common.missing');
const compass = value => {
  if (!hasNumber(value)) return "–";
  const names = getLanguage() === 'da' ? ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"] : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return `${names[Math.round(Number(value) / 45) % 8]} ${Math.round(Number(value))}°`;
};
const dayLabel = iso => new Intl.DateTimeFormat(getLocale(), { weekday:"short" }).format(new Date(iso)).replace(".", "");
const dateLabel = iso => new Intl.DateTimeFormat(getLocale(), { day:"numeric", month:"short" }).format(new Date(iso)).replace(".", "");
const hourLabel = iso => new Intl.DateTimeFormat(getLocale(), { hour:"2-digit", minute:"2-digit" }).format(new Date(iso));
const directionArrow = (value, type = "current") => {
  if (!hasNumber(value)) return '<span class="direction-arrow unavailable" aria-hidden="true">↑</span>';
  // Vindretningen i datamodellen angiver, hvor vinden kommer FRA. Pilen viser, hvor den blæser HEN.
  const rotation = (Number(value) + (type === "wind" ? 180 : 0) + 360) % 360;
  const label = t(type === "wind" ? 'weather.windDirection' : 'weather.currentDirection');
  return `<span class="direction-arrow ${type}" style="--direction:${rotation}deg" title="${label}" aria-label="${label}">↑</span>`;
};
// Fælles renderer til både zonepanelet og alle prognosedage. Nye zoner får
// automatisk samme visning, fordi værdierne kommer fra zonens forecast/condition.
const directionMetric = (type, speed, speedSuffix, direction, digits = 1) => `<span class="direction-reading">${directionArrow(direction,type)}<span>${formatMetric(speed,speedSuffix,digits)} · ${compass(direction)}</span></span>`;
const MOBILISATION_DEFINITION = t('score.mobilisationDefinition');
const scoreLabel = result => result?.available ? t(`map.${result.level}`) : t('score.unavailable');

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
  const rawReasons = result.componentReasons?.[key] || [];
  const componentScore = result.components?.[key];
  const componentLevel = scoreRating(componentScore).level;
  const weight = result.explanation?.weights?.[key];
  const contribution = result.explanation?.contributions?.[key];
  const calculation = Number.isFinite(Number(weight)) && Number.isFinite(Number(contribution))
    ? `<p class="score-calculation"><b>${t('score.contribution')}</b> ${t('score.calculation',{score:componentScore,weight:Math.round(weight*100),points:contribution})}</p>` : "";
  const weather=result.localWeather||{};
  const directionClass=result.explanation?.transportDiagnostics?.currentDirectionClass;
  const directionKey=directionClass==='INBOUND'?'score.direction.inbound':directionClass==='ALONG_COAST'?'score.direction.along':directionClass==='OUTBOUND'?'score.direction.outbound':'score.direction.unknown';
  const stableReason=key==='huntability'
    ? t('score.reason.huntability',{score:componentScore,wind:formatMetric(weather.windSpeedMps,'m/s'),waves:formatMetric(weather.waveHeightM,'m')})
    : key==='transport'
      ? t('score.reason.transport',{score:componentScore,current:formatMetric(weather.currentSpeedMps,'m/s',2),direction:t(directionKey)})
      : t('score.reason.mobilisation',{score:componentScore,waves:formatMetric(weather.waveHeightM,'m'),period:formatMetric(weather.wavePeriodS,'s')});
  const reasons=getLanguage()==='da'?rawReasons:[stableReason];
  return `<details class="component-detail"><summary><span>${name}</span><strong class="component-score ${componentLevel}">${componentScore ?? "–"}/100</strong></summary><div class="component-explanation"><p><b>${t('score.meaning')}</b> ${definition}</p>${calculation}<p><b>${t('score.why')}</b></p><ul>${reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("") || `<li>${t('score.noExplanation')}</li>`}</ul></div></details>`;
}

function localCoveragePanel(result, {showMapButton=true} = {}) {
  const summary=result?.localCoverageSummary;
  if(!summary)return '';
  const rows=(summary.parts||[]).map(part=>`<li><b>${escapeHtml(part.name)}</b>: RavScore ${part.score}</li>`).join('');
  const parts=(summary.parts||[]).map(part=>`${part.name} (${part.score})`).join(', ');
  const translated=summary.kind==='single-part'
    ? {title:t('score.local.single.title'),text:t('score.local.single.text')}
    : summary.kind==='whole-zone'
      ? {title:t('score.local.whole.title'),text:t('score.local.whole.text',{spread:result.localCoverage?.scoreSpread??0})}
      : summary.kind==='only-part'
        ? {title:t('score.local.only.title',{part:result.localCoverage?.winningPartName||result.localPartName||''}),text:t('score.local.only.text',{part:result.localCoverage?.winningPartName||result.localPartName||'',score:result.score})}
        : {title:t('score.local.several.title'),text:t('score.local.several.text',{parts})};
  return `<section class="local-coverage-panel ${escapeHtml(summary.kind)}"><p class="eyebrow dark">${t('score.local.question')}</p><h3>${escapeHtml(translated.title)}</h3><p>${escapeHtml(translated.text)}</p>${rows?`<ul>${rows}</ul>`:''}${showMapButton?`<button type="button" class="show-local-parts" data-show-local-parts>${t('score.local.showMap')}</button>`:''}</section>`;
}

function displayContextPanel(result, context = {}) {
  if(context.scope === 'local')return `<section class="display-context local"><p><b>${t('score.context.local')}</b> ${escapeHtml(context.partName||result.localPartName||t('common.unknown'))} · ${hourLabel(context.time||result.time)}</p></section>`;
  if(context.scope === 'local-weather-missing')return `<section class="display-context warning"><p><b>${t('score.context.weatherMissing')}</b> ${t('score.context.weatherMissingBody')}</p></section>`;
  if(context.scope === 'local-unavailable')return `<section class="display-context warning"><p><b>${t('score.unavailable')}:</b> ${getLanguage()==='da'?escapeHtml(result?.reasons?.[0]||t('score.noCandidateData')):t('score.noCandidateData')}</p><p>${t('score.context.unavailableBody')}</p></section>`;
  return '';
}




function stateExplanationPanel(result) {
  const state=result?.explanation?.transportEvent?.stateExplanation;
  if(!state?.summary)return '';
  const facts=getLanguage()==='da'?(state.facts||[]).map(item=>`<li>${escapeHtml(item)}</li>`).join(''):'';
  const metrics=[];
  if(Number.isFinite(Number(state.mobilisationPotential)))metrics.push(`<span>${t('score.state.wavePotential')} <b>${Math.round(state.mobilisationPotential)}/100</b></span>`);
  if(Number.isFinite(Number(state.nearshorePotential)))metrics.push(`<span>${t('score.state.nearshorePotential')} <b>${Math.round(state.nearshorePotential)}/100</b></span>`);
  const phaseLabels={
    'højenergifase':t('score.phase.highEnergy'),
    'efterstorm/indtransport':t('score.phase.afterStorm'),
    'vedvarende nærkystpotentiale':t('score.phase.retained'),
    'udtransport/nedbrydning':t('score.phase.outbound'),
    'indtransport opbygges':t('score.phase.inbound'),
    'rolig fase':t('score.phase.calm'),
    'ukendt fase':t('score.phase.unknown')
  };
  return `<section class="state-explanation"><p class="eyebrow dark">${t('score.recentMeaning')}</p><h3>${escapeHtml(phaseLabels[state.phase]||t('score.phase.unknown'))}</h3><p>${escapeHtml(getLanguage()==='da'?state.summary:t('score.state.body'))}</p>${metrics.length?`<div class="state-metrics">${metrics.join('')}</div>`:''}${facts?`<details><summary>${t('score.historyDetails')}</summary><ul>${facts}</ul><p class="muted">${t('score.historyIncluded')}</p></details>`:''}</section>`;
}

function coastTransportExplanation(result) {
  const explanation = result?.explanation?.transportDiagnostics?.coastTransportExplanation;
  if (!explanation?.summary) return "";
  const items = (explanation.items || []).map(item => `<li class="${item.selected ? "selected" : ""}"><b>${escapeHtml(item.name)}</b>${getLanguage()==='da'?`: ${escapeHtml(item.text.replace(`${item.name}: `,""))}`:''}${item.selected && explanation.items.length > 1 ? ` <span class="anchor-used">${t('score.coast.selected')}</span>` : ""}</li>`).join("");
  return `<section class="coast-transport-explanation"><h3>${t('score.coast.title')}</h3><p>${getLanguage()==='da'?escapeHtml(explanation.summary):t('score.coast.body')}</p>${items ? `<details><summary>${t('score.coast.details')}</summary><ul>${items}</ul><p class="muted">${t('score.coast.body')}</p></details>` : ""}</section>`;
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
  if (!days.length) return `<section class="forecast-section"><h3>${t('forecast.title')}</h3><p class="muted">${t('forecast.nextUpdate')}</p></section>`;
  const unavailable=day=>({hour:{time:`${day.date}T12:00:00`},result:{available:false,score:null,level:'unavailable',label:t('score.unavailable'),reasons:[t('score.noCandidateData')]},recommended:false,displayScope:'local-unavailable'});
  const summaries = days.map(day => {
    return { ...day, best:bestByDate[day.date]||unavailable(day) };
  });
  return `<section class="forecast-section" data-forecast-section>
    <div class="section-title-row"><div><p class="eyebrow dark">${t('score.plan')}</p><h3>${t('forecast.title')}</h3></div></div>
    <div class="forecast-score-strip">${summaries.map((day,index) => `<button type="button" class="forecast-score-day ${index===0?"active":""}" data-day-index="${index}"><span>${dayLabel(`${day.date}T12:00:00`)}</span><b class="day-score ${day.best.result.level}">${day.best.result.available ? day.best.result.score : "–"}</b><small>${dateLabel(`${day.date}T12:00:00`)}</small></button>`).join("")}</div>
    <div class="forecast-detail" data-forecast-detail></div>
    <script type="application/json" class="forecast-payload">${escapeScriptJson(JSON.stringify(summaries))}</script>
  </section>`;
}

function tidePanel(days) {
  if (!days.length) return `<section class="tide-section"><h3>${t('weather.hourlyWater')}</h3><p class="muted">${t('forecast.nextUpdate')}</p></section>`;
  return `<section class="tide-section" data-tide-section><div class="section-title-row"><div><p class="eyebrow dark">${t('weather.nextFiveDays')}</p><h3>${t('weather.hourlyWater')}</h3></div></div>${dayTabs(days,0,"tide-day-tab")}<div data-tide-table></div><script type="application/json" class="tide-payload">${escapeScriptJson(JSON.stringify(days))}</script></section>`;
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
      detail.innerHTML = `<div class="forecast-selected"><div><h4>${capitalize(dayLabel(`${day.date}T12:00:00`))} ${dateLabel(`${day.date}T12:00:00`)}</h4>${best.recommended?`<p>${t('score.bestTime')} <b>${best.isNow?t('common.now'):hourLabel(h.time)}</b></p><p class="muted">${t('score.bestTimeBody',{future:best.isNow?t('score.bestTimeFuture'):''})}</p>${best.candidates?.length>1?`<details class="best-time-comparison"><summary>${t('score.compare')}</summary><ol>${best.candidates.slice(0,5).map(candidate=>`<li><span>${candidate.isNow?t('common.now'):hourLabel(candidate.time)}</span><b>RavScore ${candidate.score}</b></li>`).join("")}</ol></details>`:""}`:`<p>${t('score.noBestTime')}</p>`}</div><div class="score-badge ${r.level}"><strong>${r.available?r.score:"–"}</strong><span>RavScore</span></div></div>
        ${displayContextPanel(r,{scope:best.displayScope,partName:r.localPartName,time:h.time})}
        ${localCoveragePanel(r,{showMapButton:false})}
        <div class="component-list compact metric-sized">${componentDetails(t('score.huntability'),"huntability",r,t('score.huntabilityDefinition'))}${componentDetails(t('score.transport'),"transport",r,t('score.transportDefinition'))}${componentDetails(t('score.mobilisation'),"release",r,MOBILISATION_DEFINITION)}</div>${r.available ? coastTransportExplanation(r) : ""}
        <div class="metric-grid weather-grid"><div class="metric"><span>${t('weather.wind')}</span><strong>${directionMetric("wind",h.windSpeedMps,"m/s",h.windDirectionDeg)}</strong></div><div class="metric"><span>${t('weather.waves')}</span><strong>${formatMetric(h.waveHeightM,"m")}</strong></div><div class="metric"><span>${t('weather.waterLevel')}</span><strong>${formatMetric(h.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>${t('weather.current')}</span><strong>${directionMetric("current",h.currentSpeedMps,"m/s",h.currentDirectionDeg,2)}</strong></div><div class="metric"><span>${t('weather.waterTrend')}</span><strong>${formatMetric(h.waterLevelTrendCm3h,"cm",0)}</strong></div><div class="metric"><span>${t('weather.waterTemperature')}</span><strong>${formatMetric(h.waterTemperatureC,"°C")}</strong></div></div>`;
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
      table.innerHTML = valid.length ? `<div class="tide-extremes"><span>${t('weather.lowest')} <b>${Math.round(min)} cm</b></span><span>${t('weather.highest')} <b>${Math.round(max)} cm</b></span></div><div class="tide-table-wrap"><table class="tide-table"><thead><tr><th>${t('weather.time')}</th><th>${t('weather.waterLevel')}</th></tr></thead><tbody>${valid.map(h=>`<tr class="${Number(h.waterLevelCm)===min?"low":Number(h.waterLevelCm)===max?"high":""}"><td>${hourLabel(h.time)}</td><td>${Math.round(h.waterLevelCm)>0?"+":""}${Math.round(h.waterLevelCm)} cm</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">${t('weather.noWater')}</p>`;
    };
    tideSection.querySelectorAll(".tide-day-tab").forEach((button,index)=>button.addEventListener("click",()=>render(index)));
    render(0);
  }
}

export function showZoneInfo(element, zone, result, condition, mode, options = {}) {
  const modeName = t(mode === "waders" ? 'mode.waders' : 'mode.beachShort'), score = result.available ? result.score : "–", days = groupForecastHours(options.forecast);
  const componentHtml = result.available ? `<div class="component-list metric-sized">${componentDetails(t('score.huntability'),"huntability",result,t('score.huntabilityDefinition'))}${componentDetails(t('score.transport'),"transport",result,t('score.transportDefinition'))}${componentDetails(t('score.mobilisation'),"release",result,MOBILISATION_DEFINITION)}</div>` : `<div class="metric-grid"><div class="metric"><span>${t('score.huntability')}</span><strong>–/100</strong></div><div class="metric"><span>${t('score.transport')}</span><strong>–/100</strong></div><div class="metric"><span>${t('score.mobilisation')}</span><strong>–/100</strong></div></div>`;
  element.innerHTML = `<button type="button" class="back-to-overview" data-close-zone>${t('score.backOverview')}</button><div class="zone-header"><div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div><div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(scoreLabel(result))}</span></div></div>
    ${localCoveragePanel(result)}
    ${displayContextPanel(result,options.displayContext)}
    ${componentHtml}
    ${result.available ? stateExplanationPanel(result) : ""}
    ${result.available ? coastTransportExplanation(result) : ""}
    ${result.available ? debugPanel(zone,result,condition) : ""}
    ${result.available ? `<div class="metric-grid weather-grid"><div class="metric"><span>${t('weather.wind')}</span><strong>${directionMetric("wind",condition.windSpeedMps,"m/s",condition.windDirectionDeg)}</strong></div><div class="metric"><span>${t('weather.waves')}</span><strong>${formatMetric(condition.waveHeightM,"m")}</strong></div><div class="metric"><span>${t('weather.waterLevel')}</span><strong>${formatMetric(condition.waterLevelCm,"cm",0)}</strong></div><div class="metric"><span>${t('weather.current')}</span><strong>${directionMetric("current",condition.currentSpeedMps,"m/s",condition.currentDirectionDeg,2)}</strong></div><div class="metric"><span>${t('weather.waterTrend')}</span><strong>${formatMetric(condition.waterLevelTrendCm3h,"cm",0)}</strong></div><div class="metric"><span>${t('weather.waterTemperature')}</span><strong>${formatMetric(condition.waterTemperatureC,"°C")}</strong></div></div>` : ""}
    ${forecastPanel(days,zone,mode,options.history||{},condition,result,options.bestByDate||{})}${tidePanel(days)}`;
}

function capitalize(value="") { return value.charAt(0).toUpperCase()+value.slice(1); }
function escapeScriptJson(value) { return value.replace(/</g,"\\u003c"); }
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
