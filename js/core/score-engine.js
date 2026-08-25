import { loadAdaptiveModel, modelAdjustment } from './adaptive-model.js?v=4.0.281';
import { evaluateDirectionAnchors, anchorClassification, buildCoastTransportExplanation } from './direction-anchors.js?v=4.0.281';
import { evaluateTransportEvent, classifyCoastalZone } from './coastal-process-model.js?v=4.0.281';
import { buildScoreDebugTrace } from './debug-trace.js?v=4.0.281';
import { boundedWaveTransportAdjustment } from './wave-approach.js?v=4.0.281';
const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const numberOrNull = value => (value === null || value === undefined || value === '' || typeof value === 'boolean') ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const daNumber = (value, digits = 1) => Number(value).toFixed(digits).replace('.', ',');

export const SCORE_WEIGHTS = Object.freeze({ huntability: 0.25, transport: 0.40, release: 0.35 });

export const SCORE_PRESENTATION = Object.freeze({
  exceptionalMinimum: 90,
  levels: Object.freeze([
    Object.freeze({ minimum: 75, label: "God", level: "good" }),
    Object.freeze({ minimum: 55, label: "Middel", level: "fair" }),
    Object.freeze({ minimum: 35, label: "Svag", level: "weak" }),
    Object.freeze({ minimum: 0, label: "Dårlig", level: "poor" })
  ])
});

export function scoreRating(score) {
  if (score === null || score === undefined || score === "") return { label: "Ingen data", level: "unavailable", exceptional: false };
  const value = Number(score);
  if (!Number.isFinite(value)) return { label: "Ingen data", level: "unavailable", exceptional: false };
  const rating = SCORE_PRESENTATION.levels.find(item => value >= item.minimum) || SCORE_PRESENTATION.levels.at(-1);
  return { ...rating, exceptional: value >= SCORE_PRESENTATION.exceptionalMinimum };
}

export function exceptionalScoreMark(score, { symbol = "★" } = {}) {
  return scoreRating(score).exceptional ? symbol : "";
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
  if (wind !== null) reasons.push(`Vinden er ${daNumber(wind)} m/s${waves === null ? '' : `, og de beregnede bølger er ${daNumber(waves)} m`}.`);
  if (wind === null) reasons.push("Vinddata mangler.");
  else if (mode === "waders") {
    if (wind <= 3) { score += 28; reasons.push("Svag vind giver roligt vand og gode observationsforhold."); }
    else if (wind <= 6) { score += 8; reasons.push("Vinden er stadig brugbar med waders."); }
    else if (wind <= 8) { score -= 35; reasons.push("Vind over cirka 6 m/s reducerer sigtbarhed og kontrol i vandet."); }
    else { score -= 60; reasons.push("Kraftig vind og tydelige krusninger gør det meget svært at lyse gennem vandet."); }
  } else {
    if (wind <= 8) { score += 15; reasons.push("Vindstyrken er behagelig til strandjagt."); }
    else if (wind <= 13) { score += 5; reasons.push("Frisk vind kan stadig være brugbar på stranden."); }
    else { score -= 25; reasons.push("Meget kraftig vind gør strandjagt vanskelig."); }
  }
  if (waves !== null) {
    if (mode === "waders" && waves > .7) { score -= 25; reasons.push("Bølgerne reducerer sigtbarhed og stabilitet i vandet."); }
    else if (mode === "waders" && waves <= .3) { score += 12; reasons.push("Små bølger gør det lettere at se bunden."); }
    if (mode === "beach" && waves > 2.5) { score -= 12; reasons.push("Store bølger gør strandkanten vanskeligere at afsøge."); }
  }
  return clamp(score);
}

function calculateTransport(zone, weather, reasons, diagnostics) {
  const current = numberOrNull(weather.currentSpeedMps);
  const trend = numberOrNull(weather.waterLevelTrendCm3h);
  const waterLevel = numberOrNull(weather.waterLevelCm);
  const anchorEvaluation = evaluateDirectionAnchors(zone, weather.currentDirectionDeg);
  const onshore = anchorEvaluation.primaryAnchor?.onshoreDirectionDeg ?? numberOrNull(zone.onshoreDirectionDeg);
  let score = 34;
  let currentAlignment = null;
  const caps = [];
  const steps = [{ label:'Grundscore', delta:34, scoreAfter:34 }];
  const add = (label, delta) => { score += delta; steps.push({ label, delta, scoreAfter:score }); };

  if (current !== null) {
    if (current >= .15 && current <= .65) { add('Velegnet strømhastighed',18); reasons.push("Strømhastigheden er velegnet til at flytte let materiale."); }
    else if (current > .65) { add('Kraftig strømhastighed',5); reasons.push("Kraftig strøm kan flytte materiale, men mere uforudsigeligt."); }
    else { add('Svag strøm',-12); reasons.push("Svag strøm giver begrænset transport lige nu."); }
    currentAlignment = anchorEvaluation.effectiveAlignment;
    if (currentAlignment !== null) {
      const direction = currentAlignment >= .35 ? 'ind mod kystdelen' : currentAlignment <= -.35 ? 'væk fra kystdelen' : 'mest langs kysten';
      reasons.push(`Den aktuelle strøm er ${daNumber(current, 2)} m/s og går ${direction}.`);
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
    if (trend >= 8) {
      add('Stigende vandstand',8);
      reasons.push(waterLevel !== null && waterLevel < 0
        ? "Vandstanden står lavt, men er stigende. Det er stigningen – ikke det lave niveau – som kan føre flydende materiale længere ind."
        : "Den stigende vandstand kan føre flydende materiale længere ind.");
    }
    else if (trend <= -8) { add('Faldende vandstand',3); reasons.push("Faldende vandstand kan samle materiale langs nye kanter."); }
    else if (Math.abs(trend) < 2) { add('Stabil vandstand',-4); reasons.push("Næsten stabil vandstand giver kun lidt ekstra transport."); }
  }

  // Statiske kystegenskaber må kun forstærke dokumenteret indtransport.
  if (currentAlignment !== null && currentAlignment >= .2) {
    if (zone.shallowWater) { add('Lavvandet kystprofil',4); reasons.push("Området er registreret som lavvandet. Det er en fast lokal egenskab i reservemodellen og ikke den aktuelle vandstand."); }
    if (zone.reefs) { add('Rev',3); reasons.push("Rev kan koncentrere en allerede indgående transport."); }
    if (zone.seagrass) { add('Tang og ålegræs',3); reasons.push("Tang og ålegræs kan fastholde materiale, der allerede føres ind."); }
  }

  const waveApproach = boundedWaveTransportAdjustment({
    baseTransportScore: score,
    weather,
    onshoreDirectionDeg: onshore
  });
  if (waveApproach.available && waveApproach.adjustment !== 0) {
    add('Bølgeretning og periode', waveApproach.adjustment);
    if (waveApproach.adjustment >= 2) reasons.push("Bølgernes retning og periode understøtter transport ind mod kysten.");
    else if (waveApproach.adjustment <= -2) reasons.push("Bølgernes retning og periode understøtter kun lidt transport ind mod kysten.");
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
  diagnostics.currentClassification = anchorClassification(currentAlignment);
  diagnostics.directionAnchors = anchorEvaluation.anchors;
  diagnostics.selectedDirectionAnchor = anchorEvaluation.primaryAnchor;
  diagnostics.anchorSelectionMethod = anchorEvaluation.method;
  diagnostics.coastTransportExplanation = buildCoastTransportExplanation(anchorEvaluation);
  diagnostics.windClassification = windAlignment === null ? 'unknown' : windAlignment >= .65 ? 'onshore' : windAlignment >= .2 ? 'partly-onshore' : windAlignment <= -.35 ? 'offshore' : 'cross-shore';
  diagnostics.waveApproach = {
    available: waveApproach.available,
    modelVersion: waveApproach.modelVersion,
    adjustment: waveApproach.adjustment,
    maxAdjustment: waveApproach.maxAdjustment,
    missing: waveApproach.missing || [],
    waveDirectionFromDeg: waveApproach.waveDirectionFromDeg ?? null,
    waveDirectionTowardDeg: waveApproach.waveDirectionTowardDeg ?? null,
    waveOnshoreDifferenceDeg: waveApproach.differenceDeg ?? null,
    waveOnshoreAlignment: waveApproach.alignment ?? null,
    waveEnergyProxy: waveApproach.energyProxy ?? null,
    waveEnergyScore: waveApproach.energyScore ?? null,
    waveActivity: waveApproach.waveActivity ?? null,
    waveApproachSupportScore: waveApproach.supportScore ?? null
  };
  diagnostics.scoreBeforeCaps = Math.round(scoreBeforeCaps);
  diagnostics.scoreAfterCaps = Math.round(score);
  diagnostics.capsApplied = caps;
  diagnostics.steps = steps;
  return clamp(score);
}

function calculateMobilisationAvailability(zone, weather, history, transportDiagnostics, reasons) {
  const maxWind = numberOrNull(history.maxWind24hMps);
  const maxWave = numberOrNull(history.maxWave24hM);
  const hours = numberOrNull(history.hoursSinceHighEnergy);
  const currentWave = numberOrNull(weather.waveHeightM);
  const current = numberOrNull(weather.currentSpeedMps);
  const trend = numberOrNull(weather.waterLevelTrendCm3h);
  const alignment = numberOrNull(transportDiagnostics.currentAlignment);

  // Spor A: ny frigivelse fra bund, tang eller kystaflejring efter høj energi.
  let freshRelease = 18;
  const freshReasons = [];
  if (maxWave !== null) freshReasons.push(`De højeste beregnede bølger det seneste døgn var ${daNumber(maxWave)} m.`);
  else if (maxWind !== null) freshReasons.push(`Den højeste beregnede vind det seneste døgn var ${daNumber(maxWind)} m/s.`);
  if (maxWind !== null) {
    if (maxWind >= 14) { freshRelease += 35; freshReasons.push("Høj energi det seneste døgn kan have åbnet eller forstyrret et nyt kildelager."); }
    else if (maxWind >= 9) { freshRelease += 18; freshReasons.push("Tidligere frisk vind kan have løsnet eller omlejret materiale."); }
    else { freshRelease += 4; freshReasons.push("Der har kun været begrænset vindenergi til ny frigivelse."); }
  } else freshReasons.push("Historiske vinddata mangler.");
  if (maxWave !== null && maxWave >= 1.5) { freshRelease += 14; freshReasons.push("Tidligere høje bølger kan have arbejdet i havbund, revler og tangbælter."); }
  if (hours !== null) {
    if (hours >= 3 && hours <= 18) { freshRelease += 12; freshReasons.push("Tidspunktet ligger i den nuværende arbejdsperiode efter høj energi."); }
    else if (hours > 48) { freshRelease -= 8; freshReasons.push("Potentialet for helt ny frigivelse er lavere, fordi højenergihændelsen ligger mere end to døgn tilbage."); }
  }
  if (zone.coastType === "west") freshRelease += 5;
  freshRelease = clamp(freshRelease);

  // Spor B: genmobilisering af rav, som allerede ligger i nærkystzonen, i tanglinjer,
  // på revler eller i tidligere opskyl. Dette spor kræver ikke en ny stormhændelse.
  let remobilisation = 14;
  const remobilisationReasons = currentWave === null ? [] : [`De aktuelle beregnede bølger er ${daNumber(currentWave)} m.`];
  if (currentWave !== null) {
    if (currentWave >= .25 && currentWave <= 1.2) { remobilisation += 17; remobilisationReasons.push("Aktuelle bølger kan genmobilisere allerede nærkystnært rav uden en ny stor storm."); }
    else if (currentWave > 1.2) { remobilisation += 12; remobilisationReasons.push("Aktuelle høje bølger kan genmobilisere materiale, men aflejringen er mere uforudsigelig."); }
    else { remobilisation += 3; }
  }
  if (current !== null) {
    if (current >= .12 && current <= .65) remobilisation += 12;
    else if (current > .65) remobilisation += 6;
  }
  if (alignment !== null) {
    if (alignment >= .65) { remobilisation += 15; remobilisationReasons.push("Indgående strøm kan føre tidligere udtrukket eller nærtliggende rav tilbage mod stranden."); }
    else if (alignment >= .2) { remobilisation += 8; remobilisationReasons.push("Strømmen har en indkomponent, som kan understøtte genindtransport."); }
    else if (alignment <= -.35) remobilisation -= 5;
  }
  if (trend !== null && Math.abs(trend) >= 6) { remobilisation += 7; remobilisationReasons.push("Vandstandsændringen flytter den aktive kant og kan genmobilisere eller eksponere tidligere aflejret rav."); }
  let retention = 0;
  if (zone.shallowWater) retention += 4;
  if (zone.reefs) retention += 4;
  if (zone.seagrass) retention += 4;
  remobilisation += Math.min(8, retention);
  remobilisation = clamp(remobilisation);

  // Det stærkeste realistiske spor bærer komponenten. Når ny frigivelse og
  // genmobilisering begge er tydelige, gives en lille samspilsbonus.
  const dominantPathway = freshRelease >= remobilisation ? 'fresh-release' : 'nearshore-remobilisation';
  const synergy = freshRelease >= 55 && remobilisation >= 45 ? 7 : 0;
  const score = clamp(Math.max(freshRelease, remobilisation) + synergy);
  if (dominantPathway === 'fresh-release') reasons.push(...freshReasons);
  else reasons.push(...remobilisationReasons, "Scoren bæres her primært af genmobilisering af allerede tilgængeligt rav – ikke af en ny fuld frigivelseskæde.");
  if (synergy) reasons.push("Ny frigivelse og gunstig genmobilisering virker samtidig.");

  return {
    score,
    diagnostics: {
      dominantPathway,
      freshRelease: Math.round(freshRelease),
      nearshoreRemobilisation: Math.round(remobilisation),
      synergy,
      interpretation: dominantPathway === 'fresh-release'
        ? 'Nyt eller nyligt frigivet materiale er det stærkeste spor.'
        : 'Tidligere indtransporteret eller nærkystnært materiale kan genmobiliseres uden en ny storm.'
    }
  };
}

export function calculateRavScore({ mode, zone, weather, history = {}, ruleEvaluation = null, adaptiveModel = null }) {
  if (!zone || !["waders", "beach"].includes(mode)) throw new Error("Ugyldig zone eller jagtform");
  if (numberOrNull(weather?.windSpeedMps) === null) return { available:false, score:null, level:"unavailable", label:"Ingen aktuelle data", reasons:["RavScore vises først, når nødvendige vejrdata er hentet."], componentReasons:{} };
  const componentReasons = { huntability: [], transport: [], release: [] };
  const huntability = calculateHuntability(mode, weather, componentReasons.huntability);
  const transportDiagnostics = {};
  const transport = calculateTransport(zone, weather, componentReasons.transport, transportDiagnostics);
  const mobilisation = calculateMobilisationAvailability(zone, weather, history, transportDiagnostics, componentReasons.release);
  const release = mobilisation.score;
  const transportEvent = evaluateTransportEvent({history,weather,zone});
  const coastalProfile = classifyCoastalZone(zone);
  const activeAdaptiveModel = adaptiveModel || loadAdaptiveModel();
  const weights = activeAdaptiveModel.weights || SCORE_WEIGHTS;
  const rawScore = Math.round(huntability*weights.huntability + transport*weights.transport + release*weights.release);
  const adaptive = modelAdjustment({model:activeAdaptiveModel,zone,weather});
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
    explanation:{ weights, contributions, transportDiagnostics, mobilisationDiagnostics:mobilisation.diagnostics, transportEvent, coastalProfile, rawScore, adaptiveAdjustment:adaptive.adjustment, adaptiveMatches:adaptive.matches, baseScore:score, ruleAdjustment, finalScore, formula:`Jagtbarhed ${Math.round(weights.huntability*100)} % + transport ${Math.round(weights.transport*100)} % + mobilisering/tilgængelighed ${Math.round(weights.release*100)} %` },
    reasons:[...new Set([...Object.values(componentReasons).flat(), ...ruleReasons])].slice(0,8), stormBonus:release>=65, ruleEvaluation,
    debugTrace:buildScoreDebugTrace({mode,zone,weather,history,components,weights,transportDiagnostics,adaptive,ruleEvaluation,rawScore,baseScore:score,finalScore})
  };
}
