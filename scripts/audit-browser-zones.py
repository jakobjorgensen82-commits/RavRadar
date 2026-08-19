import asyncio
import json
import os
import sys
import threading
from datetime import datetime, timezone
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from pyppeteer import launch

sys.stdout.reconfigure(encoding='utf-8')

PORT = 4178
ROOT = os.getcwd()
app_path = os.path.join(ROOT, 'app.js')
leaflet_js_stub = "window.L = (() => ({\n  map: () => ({\n    setView: function() { return this; },\n    getZoom: () => 7,\n    on: function() { return this; },\n    off: function() { return this; },\n    fitBounds: function() { return this; },\n    invalidateSize: function() { return this; },\n    addLayer: function() { return this; },\n    removeLayer: function() { return this; },\n  }),\n  tileLayer: () => ({ addTo: () => ({}) }),\n  control: { layers: () => ({\n    addTo: () => ({\n      getContainer: () => ({ querySelector: () => ({ setAttribute: () => {} }) }),\n      collapse: () => {}\n    })\n  }) },\n  createPane: () => ({ style: {} }),\n  getPane: () => ({ style: {} }),\n  geoJSON: () => ({ getBounds: () => ({ isValid: () => false }) }),\n  layerGroup: () => ({ addTo: () => ({ }), clearLayers: () => {}, addLayer: () => {} }),\n  polyline: () => ({ options: {}, addTo: () => ({ }), bindTooltip: () => ({ }), on: () => ({ }), setStyle: () => ({ }), setStyleProperty: () => ({ }), bringToFront: () => ({ }), redraw: () => ({ }), getBounds: () => ({ isValid: () => false }) }),\n  marker: () => ({ addTo: () => ({ }), setIcon: () => ({ }) }),\n  divIcon: (opts) => ({ options: opts }),\n  latLngBounds: (vals=[]) => ({ isValid: () => false, extend: () => ({ }), }),\n  Map: function(){},\n  Layer: function(){}\n}))()\n"
leaflet_css_stub = "/* leafleft stub */"

with open(app_path, 'r', encoding='utf-8') as f:
    app_source = f.read()
app_injection = "\nif (typeof window !== 'undefined') {\n  const getZoneById = (zoneId) => {\n    if (!zoneId || !state?.zones?.features) return null;\n    const found = state.zones.features.find((item) => item.properties && item.properties.id === zoneId);\n    return found ? found.properties : null;\n  };\n  window.__ravradarDebug = {\n    state: () => ({\n      zoneFeatureCount: state.zones ? state.zones.features.length : 0,\n      coastalPartZoneCount: state.zones?.coastalParts?.zones ? Object.keys(state.zones.coastalParts.zones).length : (state.conditions?.coastalParts?.zones ? Object.keys(state.conditions.coastalParts.zones).length : 0),\n      conditionsZoneCount: state.conditions?.zones ? Object.keys(state.conditions.zones).length : 0,\n      hasOpenZone: typeof openZone === 'function',\n      hasShowLocalParts: !!(state.zoneLayer && typeof state.zoneLayer.showLocalParts === 'function')\n    }),\n    zonePartSummary: (zoneId) => {\n      const zonePartsFromMap = (state.zones?.coastalParts?.zones?.[zoneId]) || null;\n      const zonePartsFromConditions = (state.conditions?.coastalParts?.zones?.[zoneId]) || (state.conditions?.coastalParts?.[zoneId]) || null;\n      const conditionZone = (state.conditions?.zones?.[zoneId]) || null;\n      const coastalIdsFromCondition = (conditionZone && Array.isArray(conditionZone.coastalPartIds)) ? conditionZone.coastalPartIds : [] ;\n      const zoneParts = zonePartsFromMap || zonePartsFromConditions || null;\n      const weatherParts = zoneParts && Array.isArray(zoneParts.parts) ? zoneParts.parts\n        : (Array.isArray(zonePartsFromMap) ? zonePartsFromMap : [])\n        || (Array.isArray(zonePartsFromConditions) ? zonePartsFromConditions : [])\n        || [];\n      const hasEnabled = Boolean((state.zones?.coastalParts?.enabled) || (state.conditions?.coastalParts?.enabled));\n      return { zoneId, partsCount: weatherParts.length, coastalIdsCount: coastalIdsFromCondition.length, hasEnabled };\n    },\n    zoneConditionSummary: (zoneId) => {\n      const conditionZone = state.conditions?.zones?.[zoneId] || null;\n      const available = conditionZone ? Object.keys(conditionZone).reduce((acc,key)=>{\n        const value = conditionZone[key];\n        acc[key] = Array.isArray(value) ? `array:${value.length}` : (value && typeof value === 'object' ? `object:${Object.keys(value).length}` : typeof value);\n        return acc;\n      }, {}) : {};\n      return { zoneId, conditionZone: !!conditionZone, keys: Object.keys(conditionZone || {}), shape: available };\n    },\n    openZoneById: (zoneId) => {\n      try {\n        const zone = getZoneById(zoneId);\n        if (!zone) return { ok: false, reason: 'zone-not-found' };\n        if (typeof openZone !== 'function') return { ok: false, reason: 'openZone-unavailable' };\n        openZone(zone,{scroll:false});\n        return { ok: true };\n      } catch (error) { return { ok: false, reason: String(error && error.message || error) }; }\n    }\n  };\n}\n"
app_extra_debug = """
  if (typeof window === 'undefined' || !window.__ravradarDebug) {
    // no-op, keep for safety in non-browser injection contexts
  } else {
    const toNumber = (value) => {
      if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
      const number = Number(value);
      return Number.isFinite(number) ? number : null;
    };
    const toRotation = (value, invertForWind = false) => {
      const number = toNumber(value);
      if (number === null) return null;
      return ((number + (invertForWind ? 180 : 0) + 360) % 360);
    };
    const parseDirectionArrow = (arrow) => {
      if (!arrow) return null;
      const style = arrow.getAttribute ? arrow.getAttribute('style') || '' : '';
      const styleMatch = /--direction:\\s*([^;]+)deg/i.exec(style);
      const rotation = styleMatch ? Number(styleMatch[1]) : toNumber(arrow.style?.getPropertyValue('--direction'));
      const title = (arrow.getAttribute ? arrow.getAttribute('title') : '') || '';
      const label = String(title || '').toLowerCase();
      const type = label.includes('vind') ? 'wind' : label.includes('strøm') || label.includes('strom') ? 'current' : 'unknown';
      return {
        rawRotation: Number.isFinite(rotation) ? rotation : null,
        type,
        title: String(arrow.getAttribute ? arrow.getAttribute('title') : ''),
        text: (arrow.textContent || '').trim()
      };
    };
    const panelArrows = (root, zoneLabel) => {
      const arrows = [...(root?.querySelectorAll?.('.direction-arrow') || [])]
        .map(parseDirectionArrow)
        .filter(Boolean);
      const wind = arrows.find((item) => item.type === 'wind') || null;
      const current = arrows.find((item) => item.type === 'current') || arrows[0] || null;
      return {
        count: arrows.length,
        wind,
        current,
        labels: arrows.map((item) => item.type),
        rawText: root ? (root.textContent || '').slice(0, 400) : ''
      };
    };
    const resultForZone = (zone) => {
      if (!zone || typeof resultFor !== 'function') return null;
      const condition = zoneCondition(zone) || null;
      const weather = condition?.current || {};
      const history = condition?.history || {};
      return resultFor(zone, weather, history);
    };
    const zoneById = (zoneId) => {
      if (!state?.zones?.features) return null;
      return state.zones.features.find((item) => item.properties && item.properties.id === zoneId)?.properties || null;
    };
    const waitForZonePanel = async (zoneId, timeoutMs = 1200) => {
      const zone = zoneById(zoneId);
      const target = zone?.name || zoneId;
      const end = Date.now() + timeoutMs;
      while (Date.now() < end) {
        const header = document.querySelector('#infoPanel h2')?.textContent?.trim();
        if (header && header === target && document.querySelector('#infoPanel .score-badge')) return true;
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
      return false;
    };
    const zoneResultSummary = (zoneId) => {
      const zone = zoneById(zoneId);
      if (!zone) return { zoneId, ok: false, reason: 'zone-not-found' };
      const result = resultForZone(zone) || {};
      const infoPanel = document.querySelector('#infoPanel');
      const scoreValue = toNumber(infoPanel?.querySelector?.('.score-badge strong')?.textContent);
      const scoreLabel = infoPanel?.querySelector?.('.score-badge span')?.textContent?.trim();
      const levelNode = infoPanel?.querySelector?.('.score-badge');
      const componentSummaries = [...(infoPanel?.querySelectorAll?.('.component-list .component-detail summary') || [])].map((summary) => summary?.textContent || '');
      const componentReasons = [...(infoPanel?.querySelectorAll?.('.component-detail ul li') || [])].map((li) => (li.textContent || '').trim()).filter(Boolean);
      const explanationPanel = infoPanel?.querySelector?.('.coast-transport-explanation')?.textContent?.trim() || '';
      const weatherGrid = infoPanel?.querySelector?.('.weather-grid');
      const forecastSection = infoPanel?.querySelector?.('[data-forecast-section]');
      const tideSection = infoPanel?.querySelector?.('[data-tide-section]');
      const arrows = panelArrows(weatherGrid, zone.name);
      const forecastArrows = panelArrows(forecastSection, zone.name);
      const coastExplanationMatch = explanationPanel.length >= 20;
      const hasResult = result?.available === true;
      const scoreExpected = Number.isFinite(toNumber(result?.score)) ? toNumber(result.score) : null;
      const labelExpected = result?.label ? String(result.label).trim() : '';
      const levelExpected = result?.level ? String(result.level) : '';
      return {
        ok: true,
        zoneId,
        zoneName: zone.name,
        scoreExpected,
        scoreShown: scoreValue,
        hasResult,
        scoreMatch: hasResult ? scoreExpected === scoreValue : true,
        labelExpected,
        labelShown: scoreLabel || '',
        labelMatch: hasResult ? labelExpected === (scoreLabel || '') : true,
        levelMatch: !levelExpected || (levelNode?.className || '').includes(levelExpected),
        componentSummaryCount: componentSummaries.length,
        componentReasonCount: componentReasons.length,
        coastExplanationMatch: hasResult ? coastExplanationMatch : true,
        coastExplanationText: explanationPanel.slice(0, 320),
        weatherArrowCount: arrows.count,
        forecastArrowCount: forecastArrows.count,
        weatherArrows: arrows,
        forecastArrows,
        forecastDayCount: forecastSection ? [...(forecastSection.querySelectorAll?.('.forecast-score-day') || [])].length : 0,
        tideTabCount: tideSection ? [...(tideSection.querySelectorAll?.('.tide-day-tab') || [])].length : 0
      };
    };
    const zoneArrowSummary = (zoneId) => {
      const zone = zoneById(zoneId);
      if (!zone) return { zoneId, windMatch: false, currentMatch: false, reason: 'zone-not-found' };
      const conditionZone = state?.conditions?.zones?.[zoneId] || {};
      const condition = conditionZone.current || {};
      const flowPoints = conditionZone.flowPoints || {};
      const currentSource = conditionZone.currentSource || conditionZone.sources?.current?.provider || 'dmi';
      const hasWind = Number.isFinite(toNumber(condition.windDirectionDeg));
      const hasCurrent = Number.isFinite(toNumber(condition.currentDirectionDeg)) && (currentSource !== 'dmi' || flowPoints?.sources?.current === 'dmi-marine-grid');
      const expectedWindRotation = toRotation(condition.windDirectionDeg, true);
      const expectedCurrentRotation = toRotation(condition.currentDirectionDeg, false);
      const panel = document.querySelector('#infoPanel .weather-grid');
      const arrows = panelArrows(panel, zone.name);
      const panelWind = arrows.wind;
      const panelCurrent = arrows.current;
      const windMatch = !hasWind
        ? panelWind === null
        : (panelWind && Number.isFinite(panelWind.rawRotation) && Number.isFinite(expectedWindRotation) && Math.abs(((panelWind.rawRotation - expectedWindRotation + 540) % 360) - 180) <= 1);
      const currentMatch = !hasCurrent
        ? panelCurrent === null
        : (panelCurrent && Number.isFinite(panelCurrent.rawRotation) && Number.isFinite(expectedCurrentRotation) && Math.abs(((panelCurrent.rawRotation - expectedCurrentRotation + 540) % 360) - 180) <= 1);
      return {
        zoneId,
        hasWind,
        hasCurrent,
        expectedWindRotation,
        expectedCurrentRotation,
        panelWindRotation: panelWind ? panelWind.rawRotation : null,
        panelCurrentRotation: panelCurrent ? panelCurrent.rawRotation : null,
        windMatch,
        currentMatch
      };
    };
    window.__ravradarDebug.waitForZonePanel = (zoneId) => waitForZonePanel(zoneId);
    window.__ravradarDebug.zonePanelSummary = (zoneId) => zoneResultSummary(zoneId);
    window.__ravradarDebug.zoneArrowSummary = (zoneId) => zoneArrowSummary(zoneId);
    window.__ravradarDebug.forecastDayChecks = async () => {
      const section = document.querySelector('#infoPanel [data-forecast-section]');
      if (!section) return [];
      const payload = section.querySelector('.forecast-payload');
      const summaries = payload ? JSON.parse(payload.textContent || '[]') : [];
      const buttons = [...section.querySelectorAll('.forecast-score-day')];
      const checks = [];
      for (let index = 0; index < summaries.length; index += 1) {
        buttons[index]?.click();
        await new Promise((resolve) => setTimeout(resolve, 0));
        const detail = section.querySelector('[data-forecast-detail]');
        const best = summaries[index]?.best || {};
        const hour = best.hour || {};
        const expectedScore = toNumber(best.result?.score);
        const detailScore = toNumber(detail?.querySelector('.score-badge strong')?.textContent);
        const stripScore = toNumber(buttons[index]?.querySelector('.day-score')?.textContent);
        const arrows = panelArrows(detail, 'forecast');
        const hasWind = Number.isFinite(toNumber(hour.windDirectionDeg));
        const hasCurrent = Number.isFinite(toNumber(hour.currentDirectionDeg));
        const expectedWindRotation = toRotation(hour.windDirectionDeg, true);
        const expectedCurrentRotation = toRotation(hour.currentDirectionDeg, false);
        const componentCount = detail?.querySelectorAll('.component-list .component-detail')?.length || 0;
        const explanationLength = (detail?.querySelector('.coast-transport-explanation')?.textContent || '').trim().length;
        checks.push({
          index,
          date: summaries[index]?.date || null,
          expectedScore,
          detailScore,
          stripScore,
          scoreMatch: expectedScore === detailScore && expectedScore === stripScore,
          expectedWindRotation,
          shownWindRotation: arrows.wind?.rawRotation ?? null,
          windMatch: hasWind ? arrows.wind?.rawRotation === expectedWindRotation : true,
          expectedCurrentRotation,
          shownCurrentRotation: arrows.current?.rawRotation ?? null,
          currentMatch: hasCurrent ? arrows.current?.rawRotation === expectedCurrentRotation : true,
          componentCount,
          explanationLength,
          explanationMatch: componentCount === 3 && explanationLength >= 20,
          diagnostics: {
            recommended: Boolean(best.recommended),
            isNow: Boolean(best.isNow),
            resultAvailable: best.result?.available === true,
            resultExplanationKeys: Object.keys(best.result?.explanation || {}),
            transportDiagnosticKeys: Object.keys(best.result?.explanation?.transportDiagnostics || {}),
            hasCoastTransportSummary: Boolean(best.result?.explanation?.transportDiagnostics?.coastTransportExplanation?.summary),
            componentReasonKeys: Object.keys(best.result?.componentReasons || {}),
          },
        });
      }
      buttons[0]?.click();
      return checks;
    };
    window.__ravradarDebug.installAuditConditions = (conditions) => {
      state.conditions = { ...conditions, available: true };
      return Object.keys(state.conditions?.zones || {}).length;
    };
    const previousOpenZoneById = window.__ravradarDebug.openZoneById;
    window.__ravradarDebug.openZoneById = async (zoneId) => {
      if (typeof previousOpenZoneById !== 'function') return { ok: false, reason: 'openZone-unavailable' };
      const response = await previousOpenZoneById(zoneId);
      if (response && response.ok) {
        await waitForZonePanel(zoneId);
      }
      return response;
    };
  }
"""
app_injected = app_source + app_injection + app_extra_debug

def run_server(port):
    server = ThreadingHTTPServer(('127.0.0.1', port), SimpleHTTPRequestHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


async def main():
    with open(os.path.join(ROOT, 'data', 'live', 'coastal-parts-v2.json'), 'r', encoding='utf-8') as f:
        live = json.load(f)
    with open(os.path.join(ROOT, 'data', 'live', 'public-conditions.json'), 'r', encoding='utf-8') as f:
        audit_conditions = json.load(f)
    with open(os.path.join(ROOT, 'data', 'live', 'public-condition-details.json'), 'r', encoding='utf-8') as f:
        audit_details = json.load(f)
    if audit_details.get('datasetId') != audit_conditions.get('datasetId'):
        raise RuntimeError('Public conditions and condition details use different datasets')
    for zone_id, zone in audit_conditions.get('zones', {}).items():
        detail_forecast = audit_details.get('zones', {}).get(zone_id, {}).get('forecast')
        if detail_forecast:
            zone['forecast'] = detail_forecast
    if audit_details.get('coastalParts'):
        audit_conditions['coastalParts'] = audit_details['coastalParts']
    source_generated_at = audit_conditions.get('generatedAt')
    audit_conditions['generatedAt'] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    audit_conditions_body = json.dumps(audit_conditions, ensure_ascii=False)
    zone_ids = list((live.get('zones') or {}).keys())

    server = run_server(PORT)
    console_logs = []
    page_errors = []

    try:
      browser = await launch(
        executablePath=r"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        headless=True,
        userDataDir=r"C:\\Users\\jakob\\Desktop\\RavRadar\\RavRadar\\tmp-pyppeteer-profile",
        args=["--no-sandbox", "--disable-dev-shm-usage"]
      )
      page = await browser.newPage()
      page.on('console', lambda msg: console_logs.append((msg.type, msg.text)))
      page.on('pageerror', lambda err: page_errors.append(str(err)))

      async def on_request(req):
        url = req.url
        parsed = urlparse(url)
        if 'unpkg.com/leaflet@1.9.4/dist/leaflet.js' in url:
          await req.respond({ 'status': 200, 'contentType': 'application/javascript', 'headers': {'Access-Control-Allow-Origin':'*'}, 'body': leaflet_js_stub })
          return
        if 'unpkg.com/leaflet@1.9.4/dist/leaflet.css' in url:
          await req.respond({ 'status': 200, 'contentType': 'text/css', 'headers': {'Access-Control-Allow-Origin':'*'}, 'body': leaflet_css_stub })
          return
        if parsed.path.endswith('/app.js'):
          await req.respond({ 'status': 200, 'contentType': 'application/javascript', 'body': app_injected })
          return
        if parsed.path.endswith('/data/live/public-conditions.json'):
          await req.respond({ 'status': 200, 'contentType': 'application/json', 'body': audit_conditions_body })
          return
        await req.continue_()

      await page.setRequestInterception(True)
      page.on('request', lambda request: asyncio.ensure_future(on_request(request)))
      await page.goto(f'http://127.0.0.1:{PORT}/', {'waitUntil': 'networkidle2', 'timeout': 45000})

      # Wait until the runtime has loaded conditions; some environments are slower than
      # the original fixed timeout.
      conditions_ready = await page.evaluate(
        """async () => {
          const deadline = Date.now() + 30000;
          while (Date.now() < deadline) {
            const snapshot = globalThis.__ravradarDebug?.state?.();
            if (snapshot && snapshot.conditionsZoneCount > 0) return true;
            await new Promise((resolve) => setTimeout(resolve, 100));
          }
          return false;
        }"""
      )
      if not conditions_ready:
        installed_count = await page.evaluate(
          "(conditions) => window.__ravradarDebug.installAuditConditions(conditions)",
          audit_conditions,
        )
        conditions_ready = installed_count == len(zone_ids)
      if not conditions_ready:
        print("WARNING: conditions could not be installed for browser audit", file=sys.stderr)
      await page.waitFor(8000)

      result = {
        'baseline': {'zoneCount': len(zone_ids), 'partCount': sum(len(v) if isinstance(v, list) else 0 for v in live.get('zones', {}).values())},
        'conditionsAuditMode': {
          'sourceGeneratedAt': source_generated_at,
          'freshnessOnlyOverriddenInBrowser': True,
          'conditionDetailsMerged': True,
          'sourceFileModified': False,
        },
        'hasDebug': await page.evaluate('() => Boolean(window.__ravradarDebug)')
      }
      if result['hasDebug']:
        result['debugState'] = await page.evaluate('() => window.__ravradarDebug.state()')
        result['zoneChecks'] = []
        result['openErrors'] = 0
        result['zoneConditionSamples'] = []
        result['zoneConditionMissingCount'] = 0
        result['zoneResultMissingCount'] = 0
        result['zonePanelSamples'] = []
        result['zonePanelMissingSamples'] = []
        result['zoneScoreMismatches'] = 0
        result['zoneArrowMismatches'] = 0
        result['zoneExplanationMismatches'] = 0
        result['forecastDayChecks'] = 0
        result['forecastScoreMismatches'] = 0
        result['forecastArrowMismatches'] = 0
        result['forecastExplanationMismatches'] = 0
        result['partsTotal'] = 0
        for zone_id in zone_ids[:210]:
          summary = await page.evaluate('(zid)=>window.__ravradarDebug.zonePartSummary(zid)', zone_id)
          condition_summary = await page.evaluate('(zid)=>window.__ravradarDebug.zoneConditionSummary(zid)', zone_id)
          open_result = await page.evaluate('(zid)=>window.__ravradarDebug.openZoneById(zid)', zone_id)
          panel = await page.evaluate('(zid)=>window.__ravradarDebug.zonePanelSummary(zid)', zone_id)
          arrow = await page.evaluate('(zid)=>window.__ravradarDebug.zoneArrowSummary(zid)', zone_id)
          forecast_checks = await page.evaluate('()=>window.__ravradarDebug.forecastDayChecks()')
          parts_count = summary.get('partsCount') or 0
          condition_missing = not condition_summary.get('conditionZone', False)
          result_missing = not panel.get('hasResult', True)
          if condition_missing:
            result['zoneConditionMissingCount'] += 1
          if result_missing:
            result['zoneResultMissingCount'] += 1
          if not open_result.get('ok', False):
            result['openErrors'] += 1
          score_ok = panel.get('scoreMatch', False)
          explanation_ok = panel.get('coastExplanationMatch', False)
          arrow_ok = bool(arrow.get('windMatch', True) and arrow.get('currentMatch', True))
          if not score_ok:
            result['zoneScoreMismatches'] += 1
          if not explanation_ok:
            result['zoneExplanationMismatches'] += 1
          if not arrow_ok:
            result['zoneArrowMismatches'] += 1
          result['forecastDayChecks'] += len(forecast_checks)
          result['forecastScoreMismatches'] += sum(1 for check in forecast_checks if not check.get('scoreMatch', False))
          result['forecastArrowMismatches'] += sum(1 for check in forecast_checks if not (check.get('windMatch', False) and check.get('currentMatch', False)))
          result['forecastExplanationMismatches'] += sum(1 for check in forecast_checks if not check.get('explanationMatch', False))
          result['partsTotal'] += parts_count
          result['zoneChecks'].append({
            'zoneId': zone_id,
            'partsCount': parts_count,
            'coastalIdsCount': summary.get('coastalIdsCount'),
            'openResult': open_result,
            'scorePanel': panel,
            'arrows': arrow,
            'forecastDays': forecast_checks,
          })
          if len(result['zoneConditionSamples']) < 5:
            result['zoneConditionSamples'].append(condition_summary)
          if len(result['zonePanelSamples']) < 10:
            result['zonePanelSamples'].append({'zoneId': zone_id, 'summary': panel, 'arrow': arrow, 'openResult': open_result})
          if len(result['zonePanelMissingSamples']) < 12 and (condition_missing or result_missing):
            result['zonePanelMissingSamples'].append({'zoneId': zone_id, 'conditionSummary': condition_summary, 'panel': panel, 'arrow': arrow})
        result['partsMismatchCount'] = sum(1 for item in result['zoneChecks'] if item['partsCount'] == 0)
        result['partsTotalMismatch'] = result['baseline']['partCount'] != result['partsTotal']
        result['conditionsCoverage'] = {
          'zonesExpected': len(zone_ids),
          'zonesWithConditions': result['debugState'].get('conditionsZoneCount', 0),
          'conditionsMissing': result['zoneConditionMissingCount'],
          'resultsMissing': result['zoneResultMissingCount']
        }
      result['consoleLogs'] = console_logs
      result['pageErrors'] = page_errors
      print(json.dumps(result, ensure_ascii=False, indent=2))
      await browser.close()
    finally:
      server.shutdown()


if __name__ == '__main__':
    asyncio.new_event_loop().run_until_complete(main())




