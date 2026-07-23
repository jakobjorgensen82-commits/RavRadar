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

function calculateTransport(zone, weather, reasons) {
  const current = numberOrNull(weather.currentSpeedMps), trend = numberOrNull(weather.waterLevelTrendCm3h), onshore = numberOrNull(zone.onshoreDirectionDeg); let score = 42;
  if (current !== null) {
    if (current >= .15 && current <= .65) { score += 18; reasons.push("Strømhastigheden er velegnet til at flytte let materiale."); }
    else if (current > .65) { score += 5; reasons.push("Kraftig strøm kan flytte materiale, men mere uforudsigeligt."); }
    else { score -= 10; reasons.push("Svag strøm giver begrænset transport lige nu."); }
    const alignment = directionScore(weather.currentDirectionDeg, onshore);
    if (alignment !== null) { score += Math.round(22 * alignment); if (alignment >= .65) reasons.push("Strømmen fører materiale ind mod zonen."); else if (alignment <= -.35) reasons.push("Strømmen fører hovedsageligt materiale væk fra zonen."); }
  } else reasons.push("Strømdata mangler.");
  const windFrom = numberOrNull(weather.windDirectionDeg), windToward = windFrom === null ? null : (windFrom + 180) % 360;
  const windAlignment = directionScore(windToward, onshore);
  if (windAlignment !== null) { score += Math.round(10 * windAlignment); if (windAlignment >= .65) reasons.push("Vindretningen understøtter transport ind mod kysten."); else if (windAlignment <= -.35) reasons.push("Vindretningen arbejder imod transport ind mod kysten."); }
  if (trend !== null) {
    if (trend >= 8) { score += 10; reasons.push("Stigende vandstand kan føre flydende materiale ind over lavt vand."); }
    else if (trend <= -8) { score += 4; reasons.push("Faldende vandstand kan samle materiale langs nye kanter."); }
    else if (Math.abs(trend) < 2) { score -= 4; reasons.push("Næsten stabil vandstand giver kun lidt ekstra transport."); }
  }
  if (zone.shallowWater) { score += 8; reasons.push("Lavt vand hjælper materiale med at nå strandzonen."); }
  if (zone.reefs) { score += 8; reasons.push("Rev kan koncentrere strøm og opsamling."); }
  if (zone.seagrass) { score += 6; reasons.push("Tang og ålegræs kan fastholde let materiale."); }
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

export function calculateRavScore({ mode, zone, weather, history = {} }) {
  if (!zone || !["waders", "beach"].includes(mode)) throw new Error("Ugyldig zone eller jagtform");
  if (numberOrNull(weather?.windSpeedMps) === null) return { available:false, score:null, level:"unavailable", label:"Ingen aktuelle data", reasons:["RavScore vises først, når nødvendige vejrdata er hentet."], componentReasons:{} };
  const componentReasons = { huntability: [], transport: [], release: [] };
  const huntability = calculateHuntability(mode, weather, componentReasons.huntability);
  const transport = calculateTransport(zone, weather, componentReasons.transport);
  const release = calculateRelease(zone, history, componentReasons.release);
  const score = Math.round(huntability*SCORE_WEIGHTS.huntability + transport*SCORE_WEIGHTS.transport + release*SCORE_WEIGHTS.release);
  const r = scoreRating(score);
  return { available:true, score, level:r.level, label:r.label, components:{ huntability:Math.round(huntability), transport:Math.round(transport), release:Math.round(release) }, componentReasons, reasons:[...new Set(Object.values(componentReasons).flat())].slice(0,6), stormBonus:release>=65 };
}
