const formatNumber = (value, suffix, digits = 1) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits).replace(".", ",")} ${suffix}` : "Mangler";
const compass = value => {
  if (!Number.isFinite(Number(value))) return "–";
  const names = ["N", "NØ", "Ø", "SØ", "S", "SV", "V", "NV"];
  return `${names[Math.round(Number(value) / 45) % 8]} ${Math.round(Number(value))}°`;
};
export function showZoneInfo(element, zone, result, condition, mode) {
  const modeName = mode === "waders" ? "Waders" : "Strand";
  const reasons = result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("");
  const score = result.available ? result.score : "–";
  const componentHtml = result.available ? `
    <div class="metric"><span>Jagtbarhed · 40 %</span><strong>${result.components.huntability}/100</strong></div>
    <div class="metric"><span>Transport · 35 %</span><strong>${result.components.transport}/100</strong></div>
    <div class="metric"><span>Frigivelse · 25 %</span><strong>${result.components.release}/100</strong></div>` : `
    <div class="metric"><span>Vind</span><strong>Mangler</strong></div><div class="metric"><span>Strøm</span><strong>Mangler</strong></div><div class="metric"><span>Bølger</span><strong>Mangler</strong></div>`;
  element.innerHTML = `
    <div class="zone-header"><div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div>
      <div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(result.label)}</span></div></div>
    <div class="metric-grid">${componentHtml}</div>
    ${result.available ? `<div class="metric-grid weather-grid">
      <div class="metric"><span>Vind</span><strong>${formatNumber(condition.windSpeedMps, "m/s")} · ${compass(condition.windDirectionDeg)}</strong></div>
      <div class="metric"><span>Bølger</span><strong>${formatNumber(condition.waveHeightM, "m")}</strong></div>
      <div class="metric"><span>Bølgeperiode</span><strong>${formatNumber(condition.wavePeriodS, "s")}</strong></div>
      <div class="metric"><span>Vandstand</span><strong>${formatNumber(condition.waterLevelCm, "cm", 0)}</strong></div>
      <div class="metric"><span>Strøm</span><strong>${formatNumber(condition.currentSpeedMps, "m/s", 2)} · ${compass(condition.currentDirectionDeg)}</strong></div>
      <div class="metric"><span>Vandtemperatur</span><strong>${formatNumber(condition.waterTemperatureC, "°C")}</strong></div>
      <div class="metric"><span>3-timers trend</span><strong>${formatNumber(condition.waterLevelTrendCm3h, "cm", 0)}</strong></div>
    </div>` : ""}
    <ul class="reason-list">${reasons}</ul>
    ${result.stormBonus ? `<div class="notice">⭐ Tidligere høj energi kan have frigivet materiale. Bonusset er begrænset, fordi gode jagtforhold stadig vægter højest.</div>` : ""}
    <form id="observationForm" class="observation-form">
      <h3>Registrer fund nu</h3><p>Ingen billeder. Observationen gemmes med RavScore og den aktuelle vejrtilstand.</p>
      <div class="observation-buttons"><button type="submit" name="result" value="none">Intet</button><button type="submit" name="result" value="small">Lidt</button><button type="submit" name="result" value="medium">Noget</button><button type="submit" name="result" value="good">Meget</button></div>
      <label class="grams-field">Valgfrit antal gram<input type="number" name="grams" min="0" max="10000" step="0.1" inputmode="decimal"></label>
      <p id="observationStatus" class="form-status" aria-live="polite"></p>
    </form>`;
}
function escapeHtml(value = "") { return String(value).replace(/[&<>'"]/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", "'":"&#39;", '"':"&quot;" })[char]); }
