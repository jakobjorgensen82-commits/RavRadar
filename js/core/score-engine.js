const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const numberOrNull = value => Number.isFinite(Number(value)) ? Number(value) : null;

export const SCORE_WEIGHTS = Object.freeze({ huntability: 0.40, transport: 0.35, release: 0.25 });

function rating(score) {
  if (score >= 80) return { label: "Meget gode forhold", level: "excellent" };
  if (score >= 60) return { label: "Gode forhold", level: "good" };
  if (score >= 40) return { label: "Middel forhold", level: "fair" };
  return { label: "Dårlige forhold", level: "poor" };
}

function angularDifference(a, b) {
  const difference = Math.abs(((a - b + 540) % 360) - 180);
  return Number.isFinite(difference) ? difference : null;
}

function directionScore(directionDeg, targetDeg) {
  const direction = numberOrNull(directionDeg);
  const target = numberOrNull(targetDeg);
  if (direction === null || target === null) return null;
  const difference = angularDifference(direction, target);
  if (difference <= 25) return 1;
  if (difference <= 55) return 0.65;
  if (difference <= 90) return 0.2;
  if (difference <= 130) return -0.35;
  return -0.8;
}

function calculateHuntability(mode, weather, reasons) {
  const wind = numberOrNull(weather.windSpeedMps);
  const waves = numberOrNull(weather.waveHeightM);
  let score = 60;

  if (wind === null) reasons.push("Vinddata mangler");
  else if (mode === "waders") {
    if (wind <= 3) { score += 28; reasons.push("Svag vind giver gode observationsforhold i vandet"); }
    else if (wind <= 6) { score += 8; reasons.push("Vinden er stadig brugbar med waders"); }
    else if (wind <= 8) { score -= 35; reasons.push("Vind over 6 m/s gør UV-jagt og sigtbarhed væsentligt dårligere"); }
    else { score -= 60; reasons.push("Kraftig vind gør vandjagt vanskelig og kan være usikker"); }
  } else {
    if (wind <= 8) { score += 15; reasons.push("Vinden er behagelig til strandjagt"); }
    else if (wind <= 13) { score += 5; reasons.push("Frisk vind kan stadig være brugbar på stranden"); }
    else { score -= 25; reasons.push("Meget kraftig vind gør strandjagt vanskelig"); }
  }

  if (waves !== null) {
    if (mode === "waders" && waves > 0.7) { score -= 25; reasons.push("Bølgerne reducerer sigtbarheden i vandet"); }
    else if (mode === "waders" && waves <= 0.3) score += 12;
    if (mode === "beach" && waves > 2.5) score -= 12;
  }
  return clamp(score);
}

function calculateTransport(zone, weather, reasons) {
  const current = numberOrNull(weather.currentSpeedMps);
  const waterTrend = numberOrNull(weather.waterLevelTrendCm3h);
  const onshoreDirection = numberOrNull(zone.onshoreDirectionDeg);
  let score = 42;

  if (current !== null) {
    if (current >= 0.15 && current <= 0.65) { score += 18; reasons.push("Strømhastigheden er brugbar til transport af let materiale"); }
    else if (current > 0.65) { score += 5; reasons.push("Kraftig strøm kan transportere materiale, men mere uforudsigeligt"); }
    else { score -= 10; reasons.push("Svag strøm giver begrænset transport lige nu"); }

    const currentAlignment = directionScore(weather.currentDirectionDeg, onshoreDirection);
    if (currentAlignment !== null) {
      score += Math.round(22 * currentAlignment);
      if (currentAlignment >= 0.65) reasons.push("Strømmen fører materiale ind mod zonen");
      else if (currentAlignment <= -0.35) reasons.push("Strømmen fører hovedsageligt materiale væk fra zonen");
    }
  } else reasons.push("Strømdata mangler");

  // DMI wind direction is where the wind comes from; transport direction is 180° opposite.
  const windFrom = numberOrNull(weather.windDirectionDeg);
  const windToward = windFrom === null ? null : (windFrom + 180) % 360;
  const windAlignment = directionScore(windToward, onshoreDirection);
  if (windAlignment !== null) {
    score += Math.round(10 * windAlignment);
    if (windAlignment >= 0.65) reasons.push("Vindretningen understøtter transport ind mod kysten");
  }

  if (waterTrend !== null) {
    if (waterTrend >= 8) { score += 10; reasons.push("Stigende vandstand kan føre flydende materiale ind over lavt vand"); }
    else if (waterTrend <= -8) { score += 4; reasons.push("Faldende vandstand kan samle materiale langs nye kanter"); }
    else if (Math.abs(waterTrend) < 2) score -= 4;
  }

  if (zone.shallowWater) score += 8;
  if (zone.reefs) score += 8;
  if (zone.seagrass) score += 6;
  return clamp(score);
}

function calculateRelease(zone, history, reasons) {
  const maxWind24h = numberOrNull(history.maxWind24hMps);
  const maxWave24h = numberOrNull(history.maxWave24hM);
  const hoursSinceHighEnergy = numberOrNull(history.hoursSinceHighEnergy);
  let score = 22;

  if (maxWind24h !== null) {
    if (maxWind24h >= 14) { score += 35; reasons.push("Der har været høj energi det seneste døgn, som kan have frigivet nyt materiale"); }
    else if (maxWind24h >= 9) { score += 18; reasons.push("Tidligere frisk vind kan have flyttet og frigivet materiale"); }
    else score += 4;
  }
  if (maxWave24h !== null && maxWave24h >= 1.5) score += 14;

  if (hoursSinceHighEnergy !== null) {
    if (hoursSinceHighEnergy >= 3 && hoursSinceHighEnergy <= 18) score += 12;
    else if (hoursSinceHighEnergy > 48) score -= 8;
  }

  if (zone.coastType === "west") score += 5;
  return clamp(score);
}

export function calculateRavScore({ mode, zone, weather, history = {} }) {
  if (!zone || !["waders", "beach"].includes(mode)) {
    throw new Error("Ugyldig zone eller jagtform");
  }

  if (numberOrNull(weather?.windSpeedMps) === null) {
    return {
      available: false,
      score: null,
      level: "unavailable",
      label: "Ingen aktuelle data",
      reasons: ["RavScore vises først, når de nødvendige vejrdata er hentet."]
    };
  }

  const reasons = [];
  const huntability = calculateHuntability(mode, weather, reasons);
  const transport = calculateTransport(zone, weather, reasons);
  const release = calculateRelease(zone, history, reasons);
  const score = Math.round(
    huntability * SCORE_WEIGHTS.huntability +
    transport * SCORE_WEIGHTS.transport +
    release * SCORE_WEIGHTS.release
  );
  const resultRating = rating(score);

  return {
    available: true,
    score,
    level: resultRating.level,
    label: resultRating.label,
    components: {
      huntability: Math.round(huntability),
      transport: Math.round(transport),
      release: Math.round(release)
    },
    reasons: [...new Set(reasons)].slice(0, 6),
    stormBonus: release >= 65
  };
}
