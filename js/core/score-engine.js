import { loadAdaptiveModel, modelAdjustment } from './adaptive-model.js';
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const numberOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;

export const SCORE_WEIGHTS = Object.freeze({ huntability: 0.40, transport: 0.35, release: 0.25 });

export function scoreRating(score) {
  if (score === null || score === undefined || score === "") return { label: "Ingen data", level: "unavailable" };
  const value = Number(score);
  if (!Number.isFinite(value)) return { label: "Ingen data", level: "unavailable" };
  if (value >= 90) return { label: "Fremragende", level: "excellent" };
  if (value >= 75) return { label: "God", level: "good" };
  if (value >= 55) return { label: "Middel", level: "fair" };
  if (value >= 35) return { label: "Svag", level: "weak" };
  return { label: "Dårlig", level: "poor" };
}
function angularDifference(a, b) { const d = Math.abs(((a - b + 540) % 360) - 180); return Number.isFinite(d) ? d : null; }
function directionScore(directionDeg, targetDeg) {
  const direction = numberOrNull(directionDeg), target = numberOrNull(targetDeg);
  if (direction === null || target === null) return null;
  const d = angularDifference(direction, target);
  if (d <= 25) return 1; if (d <= 55) return .65; if (d <= 90) return .2; if (d <= 130) return -.35; return -.8;
}

function calculateHuntability(mode, weather, reasons) {
  const wind = numberOrNull(weather.windSpeedMps), waves = numberOrNull(weather.waveHeightM); let score = 60;
  if (wind === null) reasons.push("Vinddata mangler.");
  else if (mode === "waders") {
    if (wind <= 3) { score += 28; reasons.push("Svag vind giver roligt vand og gode observationsforhold."); }
    else if (wind <= 6) { score += 8; reasons.push("Vinden er stadig brugbar med waders."); }
    else if (wind <= 8) { score -= 35; reasons.push("Vind over cirka 6 m/s reducerer sigtbarhed og kontrol i vandet."); }
    else { score -= 60; reasons.push("Kraftig vind gør vandjagt vanskelig og kan være usikker."); }
  } else {
    if (wind <= 8) { score += 15; reasons.push("Vindstyrken er behagelig til strandjagt."); }
    else if (wind <= 13) { score += 5; reasons.push("Frisk vind kan stadig være brugbar på stranden."); }
    else { score -= 25; reasons.push("Meget kraftig vind gør strandjagt vanskelig."); }
  }
  if (waves !== null) {
    if (mode === "waders" && waves > .7) { score -= 25; reasons.push("Bølgerne reducerer sigtbarhed og stabilitet i vandet."); }
    else if (mode === "waders" && waves <= .3) { score += 12; reasons.push("Små bølger gør det lettere at se bunden."); }
    if (mode === "beach" && waves > 2.5) { score -= 12; reasons.push("Store bølger gør kanten vanskeligere og mindre sikker at afsøge."); }
  }
  return clamp(score);
}

function calculateTransport(zone, weather, reasons, diagnostics) {
  const current = numberOrNull(weather.currentSpeedMps);
  const trend = numberOrNull(weather.waterLevelTrendCm3h);
  const onshore = numberOrNull(zone.onshoreDirectionDeg);
  let score = 34;
  let currentAlignment = null;
  const caps = [];
  const steps = [{ label:'Grundscore', delta:34, scoreAfter:34 }];
  const add = (label, delta) => { score += delta; steps.push({ label, delta, scoreAfter:score }); };

  if (current !== null) {
    if (current >= .15 && current <= .65) { add('Velegnet strømhastighed',18); reasons.push("Strømhastigheden er velegnet til at flytte let materiale."); }
    else if (current > .65) { add('Kraftig strømhastighed',5); reasons.push("Kraftig strøm kan flytte materiale, men mere uforudsigeligt."); }
    else { add('Svag strøm',-12); reasons.push("Svag strøm giver begrænset transport lige nu."); }
    currentAlignment = directionScore(weather.currentDirectionDeg, onshore);
    if (currentAlignment !== null) {
      add('Strømretning mod land', Math.round(30 * currentAlignment));
      if (currentAlignment >= .65) reasons.push("Strømmen fører materiale ind mod zonen.");
      else if (currentAlignment <= -.35) reasons.push("Strømmen fører hovedsageligt materiale væk fra zonen.");
    }
  } else {
    reasons.push("Strømdata mangler; transportscoren begrænses.");
    caps.push({ max: 52, reason: 'missing-current-data' });
  }

  const windFrom = numberOrNull(weather.windDirectionDeg);
  const windToward = windFrom === null ? null : (windFrom + 180) % 360;
  const windAlignment = directionScore(windToward, onshore);
  if (windAlignment !== null) {
    if (windAlignment >= .65) { add('Vind understøtter indtransport',6); reasons.push("Vindretningen kan understøtte transport ind mod kysten."); }
    else if (windAlignment <= -.35) { add('Vind understøtter ikke indtransport',-2); reasons.push("Vindretningen giver ikke direkte overfladetransport ind mod kysten."); }
  }

  if (trend !== null) {
    if (trend >= 8) { add('Stigende vandstand',8); reasons.push("Stigende vandstand kan føre flydende materiale ind over lavt vand."); }
    else if (trend <= -8) { add('Faldende vandstand',3); reasons.push("Faldende vandstand kan samle materiale langs nye kanter."); }
    else if (Math.abs(trend) < 2) { add('Stabil vandstand',-4); reasons.push("Næsten stabil vandstand giver kun lidt ekstra transport."); }
  }

  // Statiske kystegenskaber må kun forstærke dokumenteret indtransport.
  if (currentAlignment !== null && currentAlignment >= .2) {
    if (zone.shallowWater) { add('Lavt vand',4); reasons.push("Lavt vand kan hjælpe indgående materiale ind i strandzonen."); }
    if (zone.reefs) { add('Rev',3); reasons.push("Rev kan koncentrere en allerede indgående transport."); }
    if (zone.seagrass) { add('Tang og ålegræs',3); reasons.push("Tang og ålegræs kan fastholde materiale, der allerede føres ind."); }
  }

  if (currentAlignment !== null && current >= .15) {
    if (currentAlignment <= -.75) caps.push({ max: 28, reason: 'strongly-offshore-current' });
    else if (currentAlignment <= -.35) caps.push({ max: 42, reason: 'offshore-current' });
  }
  const scoreBeforeCaps = score;
  for (const cap of caps) {
    const before = score; score = Math.min(score, cap.max);
    if (score !== before) steps.push({ label:`Loft: ${cap.reason}`, delta:score-before, scoreAfter:score });
  }

  diagnostics.onshoreDirectionDeg = onshore;
  diagnostics.currentDirectionDeg = numberOrNull(weather.currentDirectionDeg);
  diagnostics.currentDirectionConvention = 'oceanographic-to';
  diagnostics.windDirectionDeg = windFrom;
  diagnostics.windDirectionConvention = 'meteorological-from';
  diagnostics.currentAlignment = currentAlignment;
  diagnostics.currentDirectionDifferenceDeg = numberOrNull(weather.currentDirectionDeg) === null || onshore === null ? null : angularDifference(weather.currentDirectionDeg, onshore);
  diagnostics.windTowardDirectionDeg = windToward;
  diagnostics.windAlignment = windAlignment;
  diagnostics.windDirectionDifferenceDeg = windToward === null || onshore === null ? null : angularDifference(windToward, onshore);
  diagnostics.currentClassification = currentAlignment === null ? 'unknown' : currentAlignment >= .65 ? 'onshore' : currentAlignment >= .2 ? 'partly-onshore' : currentAlignment <= -.75 ? 'strongly-offshore' : currentAlignment <= -.35 ? 'offshore' : 'cross-shore';
  diagnostics.windClassification = windAlignment === null ? 'unknown' : windAlignment >= .65 ? 'onshore' : windAlignment >= .2 ? 'partly-onshore' : windAlignment <= -.35 ? 'offshore' : 'cross-shore';
  diagnostics.scoreBeforeCaps = Math.round(scoreBeforeCaps);
  diagnostics.scoreAfterCaps = Math.round(score);
  diagnostics.capsApplied = caps;
  diagnostics.steps = steps;
  return clamp(score);
}

function calculateRelease(zone, history, reasons) {
  const maxWind = numberOrNull(history.maxWind24hMps), maxWave = numberOrNull(history.maxWave24hM), hours = numberOrNull(history.hoursSinceHighEnergy); let score = 22;
  if (maxWind !== null) {
    if (maxWind >= 14) { score += 35; reasons.push("Høj energi det seneste døgn kan have frigivet nyt materiale."); }
    else if (maxWind >= 9) { score += 18; reasons.push("Tidligere frisk vind kan have flyttet og frigivet materiale."); }
    else { score += 4; reasons.push("Der har kun været begrænset vindenergi det seneste døgn."); }
  } else reasons.push("Historiske vinddata mangler.");
  if (maxWave !== null && maxWave >= 1.5) { score += 14; reasons.push("Tidligere høje bølger kan have arbejdet i havbunden og tangbælter."); }
  if (hours !== null) {
    if (hours >= 3 && hours <= 18) { score += 12; reasons.push("Der er gået passende tid siden den høje energi."); }
    else if (hours > 48) { score -= 8; reasons.push("Den seneste høje energi ligger mere end to døgn tilbage."); }
  }
  if (zone.coastType === "west") { score += 5; reasons.push("Vestkystens eksponering giver lidt større frigivelsespotentiale."); }
  return clamp(score);
}

export function calculateRavScore({ mode, zone, weather, history = {}, ruleEvaluation = null }) {
  if (!zone || !["waders", "beach"].includes(mode)) throw new Error("Ugyldig zone eller jagtform");
  if (numberOrNull(weather?.windSpeedMps) === null) return { available:false, score:null, level:"unavailable", label:"Ingen aktuelle data", reasons:["RavScore vises først, når nødvendige vejrdata er hentet."], componentReasons:{} };
  const componentReasons = { huntability: [], transport: [], release: [] };
  const huntability = calculateHuntability(mode, weather, componentReasons.huntability);
  const transportDiagnostics = {};
  const transport = calculateTransport(zone, weather, componentReasons.transport, transportDiagnostics);
  const release = calculateRelease(zone, history, componentReasons.release);
  const adaptiveModel = loadAdaptiveModel();
  const weights = adaptiveModel.weights || SCORE_WEIGHTS;
  const rawScore = Math.round(huntability*weights.huntability + transport*weights.transport + release*weights.release);
  const adaptive = modelAdjustment({model:adaptiveModel,zone,weather});
  const score = clamp(rawScore + adaptive.adjustment);
  const finalScore = ruleEvaluation?.blocked ? null : (Number.isFinite(ruleEvaluation?.score) ? ruleEvaluation.score : score);
  if (finalScore === null) return { available:false, score:null, level:"unavailable", label:"Ikke anbefalet", reasons:[...(ruleEvaluation?.matches||[]).map(item=>item.explanation)], componentReasons, ruleEvaluation };
  const r = scoreRating(finalScore);
  const ruleReasons = (ruleEvaluation?.matches || []).map(item => item.explanation).filter(Boolean);
  const components = { huntability:Math.round(huntability), transport:Math.round(transport), release:Math.round(release) };
  const contributions = {
    huntability: Math.round(components.huntability * weights.huntability),
    transport: Math.round(components.transport * weights.transport),
    release: Math.round(components.release * weights.release)
  };
  const ruleAdjustment = finalScore - score;
  return {
    available:true, score:finalScore, baseScore:score, level:r.level, label:r.label, components, componentReasons,
    explanation:{ weights, contributions, transportDiagnostics, rawScore, adaptiveAdjustment:adaptive.adjustment, adaptiveMatches:adaptive.matches, baseScore:score, ruleAdjustment, finalScore, formula:`Jagtbarhed ${Math.round(weights.huntability*100)} % + transport ${Math.round(weights.transport*100)} % + frigivelse ${Math.round(weights.release*100)} %` },
    reasons:[...new Set([...Object.values(componentReasons).flat(), ...ruleReasons])].slice(0,8), stormBonus:release>=65, ruleEvaluation
  };
}
