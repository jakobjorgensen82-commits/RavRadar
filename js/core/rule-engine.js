const finite = value => (value === null || value === undefined || value === '' || typeof value === 'boolean') ? null : (Number.isFinite(Number(value)) ? Number(value) : null);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function inDirectionRanges(value, ranges = []) {
  const direction = finite(value);
  if (direction === null || !Array.isArray(ranges) || !ranges.length) return true;
  return ranges.some(range => {
    if (!Array.isArray(range) || range.length !== 2) return false;
    const start = ((Number(range[0]) % 360) + 360) % 360;
    const end = ((Number(range[1]) % 360) + 360) % 360;
    return start <= end ? direction >= start && direction <= end : direction >= start || direction <= end;
  });
}

function geographyMatches(rule, zone) {
  const geography = rule.geography || {};
  if (!zone) return false;
  if (geography.scope === 'national' || !geography.scope) return true;
  if (geography.scope === 'zone') return !geography.zoneIds?.length || geography.zoneIds.includes(zone.id);
  if (geography.scope === 'coastType') return !geography.coastTypes?.length || geography.coastTypes.includes(zone.coastType);
  return false;
}

function conditionMatches(rule, context) {
  const conditions = rule.conditions || {};
  const weather = context.weather || {};
  const history = context.history || {};
  if (conditions.huntModes?.length && !conditions.huntModes.includes(context.mode)) return false;
  if (finite(conditions.minBaseScore) !== null && context.baseScore < Number(conditions.minBaseScore)) return false;
  if (finite(conditions.maxBaseScore) !== null && context.baseScore > Number(conditions.maxBaseScore)) return false;
  const minWind=finite(conditions.minWindSpeedMps),maxWind=finite(conditions.maxWindSpeedMps),wind=finite(weather.windSpeedMps);
  if ((minWind !== null || maxWind !== null) && wind === null) return false;
  if (minWind !== null && wind < minWind) return false;
  if (maxWind !== null && wind > maxWind) return false;
  if (conditions.windDirectionRangesDeg?.length && finite(weather.windDirectionDeg) === null) return false;
  if (!inDirectionRanges(weather.windDirectionDeg, conditions.windDirectionRangesDeg)) return false;
  const minWave=finite(conditions.minWaveHeightM),maxWave=finite(conditions.maxWaveHeightM),wave=finite(weather.waveHeightM);
  if ((minWave !== null || maxWave !== null) && wave === null) return false;
  if (minWave !== null && wave < minWave) return false;
  if (maxWave !== null && wave > maxWave) return false;
  const minWater=finite(conditions.minWaterLevelCm),maxWater=finite(conditions.maxWaterLevelCm),water=finite(weather.waterLevelCm);
  if ((minWater !== null || maxWater !== null) && water === null) return false;
  if (minWater !== null && water < minWater) return false;
  if (maxWater !== null && water > maxWater) return false;
  if (finite(conditions.maxHoursSinceHighEnergy) !== null && finite(history.hoursSinceHighEnergy) > Number(conditions.maxHoursSinceHighEnergy)) return false;
  return true;
}

export function evaluateRules({ rules = [], zone, mode, weather = {}, history = {}, baseScore }) {
  const matches = [];
  let adjustment = 0;
  let override = null;
  let blocked = false;

  for (const rule of [...rules].sort((a, b) => (a.priority ?? 100) - (b.priority ?? 100))) {
    if (rule.status !== 'active' || !geographyMatches(rule, zone)) continue;
    if (!conditionMatches(rule, { zone, mode, weather, history, baseScore })) continue;
    const effect = rule.effect || {};
    const delta = clamp(Number(effect.scoreAdjustment || 0), -100, 100);
    if (rule.kind === 'gate' && effect.block === true) blocked = true;
    if (rule.kind === 'override' && finite(effect.score) !== null) override = clamp(Number(effect.score), 0, 100);
    if (['bonus', 'penalty', 'persistence'].includes(rule.kind)) adjustment += delta;
    matches.push({
      id: rule.id,
      version: rule.version,
      kind: rule.kind,
      adjustment: delta,
      confidence: rule.confidence,
      knowledgeClass: rule.knowledgeClass,
      explanation: effect.explanation || rule.name
    });
  }

  const score = blocked ? null : (override ?? clamp(Math.round(baseScore + adjustment), 0, 100));
  return { score, blocked, adjustment: score === null ? 0 : score - baseScore, matches };
}
