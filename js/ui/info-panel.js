const formatNumber = (value, suffix, digits = 1) => Number.isFinite(Number(value)) ? `${Number(value).toFixed(digits).replace(".", ",")} ${suffix}` : "Mangler";

export function showZoneInfo(element, zone, result, condition, mode) {
  const modeName = mode === "waders" ? "Waders" : "Strand";
  const reasons = result.reasons.map(reason => `<li>${escapeHtml(reason)}</li>`).join("");
  const score = result.available ? result.score : "–";
  const componentHtml = result.available ? `
    <div class="metric"><span>Jagtbarhed · 40 %</span><strong>${result.components.huntability}/100</strong></div>
    <div class="metric"><span>Transport · 35 %</span><strong>${result.components.transport}/100</strong></div>
    <div class="metric"><span>Frigivelse · 25 %</span><strong>${result.components.release}/100</strong></div>` : `
    <div class="metric"><span>Vind</span><strong>Mangler</strong></div>
    <div class="metric"><span>Strøm</span><strong>Mangler</strong></div>
    <div class="metric"><span>Bølger</span><strong>Mangler</strong></div>`;

  element.innerHTML = `
    <div class="zone-header">
      <div><h2>${escapeHtml(zone.name)}</h2><p class="zone-meta">${escapeHtml(zone.region)} · ${modeName}</p></div>
      <div class="score-badge ${result.level}"><strong>${score}</strong><span>${escapeHtml(result.label)}</span></div>
    </div>
    <div class="metric-grid">${componentHtml}</div>
    ${result.available ? `<div class="metric-grid">
      <div class="metric"><span>Vind nu</span><strong>${formatNumber(condition.windSpeedMps, "m/s")}</strong></div>
      <div class="metric"><span>Bølger</span><strong>${formatNumber(condition.waveHeightM, "m")}</strong></div>
      <div class="metric"><span>Vandstand</span><strong>${formatNumber(condition.waterLevelCm, "cm", 0)}</strong></div>
    </div>` : ""}
    <ul class="reason-list">${reasons}</ul>
    ${result.stormBonus ? `<div class="notice">⭐ Tidligere høj energi kan have frigivet materiale. Bonusset er begrænset, fordi gode jagtforhold stadig vægter højest.</div>` : ""}`;
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}
