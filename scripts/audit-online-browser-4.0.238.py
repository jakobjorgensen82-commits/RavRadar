import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

from pyppeteer import launch


ROOT = Path(__file__).resolve().parents[1]
LIVE_URL = "https://jakobjorgensen82-commits.github.io/RavRadar/"
EXPECTED_VERSION = "4.0.238"

sys.stdout.reconfigure(encoding="utf-8")


DEBUG_INJECTION = r"""
if (typeof window !== 'undefined') {
  const finite = value => value !== null && value !== undefined && value !== '' && typeof value !== 'boolean' && Number.isFinite(Number(value));
  const rotation = (value,type) => finite(value) ? (Number(value)+(type==='wind'?180:0)+360)%360 : null;
  const arrow = (root,type) => {
    const node=[...(root?.querySelectorAll?.('.direction-arrow')||[])].find(item=>item.classList.contains(type));
    if(!node)return null;
    const match=/--direction:\s*([^;]+)deg/i.exec(node.getAttribute('style')||'');
    return match?Number(match[1]):null;
  };
  const number = node => {
    const match=String(node?.textContent||'').replace(',','.').match(/-?\d+(?:\.\d+)?/);
    return match&&Number.isFinite(Number(match[0]))?Number(match[0]):null;
  };
  const failures=[];
  const fail=(kind,detail)=>failures.push({kind,...detail});
  const checkWeatherMetrics=(root,weather,kind,detail)=>{
    const expectedFields=[
      ['Vind','windSpeedMps',1],
      ['Bølger','waveHeightM',1],
      ['Vandstand','waterLevelCm',0],
      ['Strøm','currentSpeedMps',2],
      ['Vandtemperatur','waterTemperatureC',1],
      ['Vandstandsændring på 3 timer','waterLevelTrendCm3h',0]
    ];
    const metrics=[...(root?.querySelectorAll?.(':scope > .metric')||[])];
    for(const [label,field,digits] of expectedFields){
      const metric=metrics.find(item=>item.querySelector('span')?.textContent?.trim()===label);
      const strong=metric?.querySelector('strong');
      const text=strong?.textContent?.trim()||'';
      const shown=number(strong);
      const expected=finite(weather?.[field])?Number(Number(weather[field]).toFixed(digits)):null;
      const missing=/Mangler/i.test(text);
      if(!metric||shown!==expected||(expected===null)!==missing)fail(`${kind}-weather-metric`,{...detail,label,field,expected,shown,text});
    }
  };
  window.__ravradarOnlineAudit={
    state:()=>({
      version:document.querySelector('#appVersion')?.textContent?.trim()||globalThis.RAVRADAR_VERSION||null,
      conditionsZones:Object.keys(state.conditions?.zones||{}).length,
      parts:Object.keys(state.conditions?.coastalParts?.parts||{}).length,
      partZones:Object.keys(state.conditions?.coastalParts?.zones||{}).length,
      detailsAvailable:state.conditions?.detailsAvailable===true,
      datasetId:state.conditions?.datasetId||null
    }),
    failures:()=>failures,
    zoneIds:()=>[...new Set((state.zones?.features||[]).map(item=>item.properties?.id).filter(id=>state.conditions?.zones?.[id]))],
    setMode:mode=>{state.mode=mode;state.currentScores.clear();state.forecastGroups.clear();return state.mode;},
    checkZone:async(zoneId)=>{
      const feature=(state.zones?.features||[]).find(item=>item.properties?.id===zoneId);
      if(!feature){fail('zone-missing',{zoneId});return {zoneId,days:0,parts:0};}
      const zone=feature.properties;
      openZone(zone,{scroll:false});
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      const panel=document.querySelector('#infoPanel');
      const display=currentDisplayFor(zone);
      const result=display.result||{},weather=display.weather||{},context=display.context||{};
      const shownScore=number(panel?.querySelector('.zone-header .score-badge strong'));
      const shownLabel=panel?.querySelector('.zone-header .score-badge span')?.textContent?.trim()||'';
      const badge=panel?.querySelector('.zone-header .score-badge');
      const currentAvailable=result.available===true&&finite(result.score);
      const expectedCurrentScore=currentAvailable?Number(result.score):null;
      if(shownScore!==expectedCurrentScore)fail('current-score',{zoneId,mode:state.mode,available:currentAvailable,expected:expectedCurrentScore,shown:shownScore});
      if(shownLabel!==String(result.label||''))fail('current-label',{zoneId,mode:state.mode,expected:result.label,shown:shownLabel});
      if(result.level&&!badge?.classList.contains(result.level))fail('current-level',{zoneId,mode:state.mode,expected:result.level,className:badge?.className||''});
      const weatherGrid=panel?.querySelector(':scope > .metric-grid.weather-grid');
      const components=panel?.querySelectorAll(':scope > .component-list .component-detail').length||0;
      const reasons=panel?.querySelectorAll(':scope > .component-list .component-detail li').length||0;
      const expectedCoast=Boolean(result.explanation?.transportDiagnostics?.coastTransportExplanation?.summary);
      const shownCoast=Boolean(panel?.querySelector(':scope > .coast-transport-explanation'));
      const contextText=panel?.querySelector(':scope > .display-context')?.textContent||'';
      const debugText=panel?.querySelector('.debug-panel')?.textContent||'';
      const parts=state.conditions?.coastalParts?.zones?.[zoneId]?.expectedPartCount||state.conditions?.coastalParts?.zones?.[zoneId]?.parts?.length||0;
      const whereButton=panel?.querySelector('[data-show-local-parts]');
      if(currentAvailable){
        const shownWind=arrow(weatherGrid,'wind'),shownCurrent=arrow(weatherGrid,'current');
        const expectedWind=rotation(weather.windDirectionDeg,'wind'),expectedCurrent=rotation(weather.currentDirectionDeg,'current');
        if(shownWind!==expectedWind)fail('current-wind-arrow',{zoneId,mode:state.mode,expected:expectedWind,shown:shownWind});
        if(shownCurrent!==expectedCurrent)fail('current-current-arrow',{zoneId,mode:state.mode,expected:expectedCurrent,shown:shownCurrent});
        checkWeatherMetrics(weatherGrid,weather,'current',{zoneId,mode:state.mode});
        if(components!==3||reasons<3)fail('current-components',{zoneId,mode:state.mode,components,reasons});
        if(expectedCoast!==shownCoast)fail('current-coast-explanation',{zoneId,mode:state.mode,expected:expectedCoast,shown:shownCoast});
        if(context.scope==='local'&&result.localPartName&&!contextText.includes(result.localPartName))fail('current-context',{zoneId,mode:state.mode,partName:result.localPartName,scope:context.scope});
        if(!debugText.includes(String(result.score)))fail('current-debug-score',{zoneId,mode:state.mode,score:result.score});
        if(result.localPartId&&!debugText.includes(result.localPartId))fail('current-debug-part',{zoneId,mode:state.mode,partId:result.localPartId});
        const requiredDiagnostics=['Candidate G · 20/50/30','Forskel strøm/kyst','Strømklassifikation','Strømhistorik','Historisk fase','Samlet transportkomponent'];
        for(const required of requiredDiagnostics){
          if(!debugText.includes(required))fail('current-debug-contract',{zoneId,mode:state.mode,required});
        }
        if(/\b(?:Mangler|Ukendt)\b/i.test(debugText))fail('current-debug-placeholder',{zoneId,mode:state.mode,text:debugText.slice(0,500)});
        if(parts>1&&!whereButton)fail('parts-button-missing',{zoneId,mode:state.mode,parts});
        whereButton?.click();
      }else{
        const fallbackMetrics=[...(panel?.querySelectorAll(':scope > .metric-grid:not(.weather-grid) > .metric')||[])];
        const expectedFallback=['Søgeforhold','Transport mod kysten','Rav i bevægelse'];
        const shownFallback=fallbackMetrics.map(item=>({label:item.querySelector('span')?.textContent?.trim()||'',value:item.querySelector('strong')?.textContent?.trim()||''}));
        if(weatherGrid||components||reasons||shownCoast||debugText||whereButton)fail('current-unavailable-leak',{zoneId,mode:state.mode,weather:Boolean(weatherGrid),components,reasons,coast:shownCoast,debug:Boolean(debugText),whereButton:Boolean(whereButton)});
        if(shownFallback.length!==3||expectedFallback.some((label,index)=>shownFallback[index]?.label!==label||shownFallback[index]?.value!=='–/100'))fail('current-unavailable-components',{zoneId,mode:state.mode,shown:shownFallback});
        if(!/RavScore er midlertidigt utilgængelig/i.test(contextText)||!/bruger ikke den gamle scoremodel/i.test(contextText))fail('current-unavailable-explanation',{zoneId,mode:state.mode,text:contextText});
      }
      const days=groupHoursForZone(zone);
      const buttons=[...(panel?.querySelectorAll('[data-forecast-section] .forecast-score-day')||[])];
      if(buttons.length!==days.length)fail('forecast-day-count',{zoneId,mode:state.mode,expected:days.length,shown:buttons.length});
      for(let index=0;index<days.length;index+=1){
        buttons[index]?.click();
        await new Promise(resolve=>setTimeout(resolve,0));
        const expected=bestForDay(zone,days[index].date);
        const detail=panel?.querySelector('[data-forecast-detail]');
        const shown=number(detail?.querySelector('.score-badge strong'));
        const strip=number(buttons[index]?.querySelector('.day-score'));
        const forecastAvailable=expected?.result?.available===true&&finite(expected?.result?.score);
        const expectedForecastScore=forecastAvailable?Number(expected.result.score):null;
        if(shown!==expectedForecastScore||strip!==expectedForecastScore)fail('forecast-score',{zoneId,mode:state.mode,index,date:days[index].date,available:forecastAvailable,expected:expectedForecastScore,shown,strip});
        const forecastBadge=detail?.querySelector('.score-badge');
        const stripBadge=buttons[index]?.querySelector('.day-score');
        const expectedLevel=forecastAvailable?expected.result.level:'unavailable';
        if(expectedLevel&&(!forecastBadge?.classList.contains(expectedLevel)||!stripBadge?.classList.contains(expectedLevel)))fail('forecast-level',{zoneId,mode:state.mode,index,date:days[index].date,expected:expectedLevel,detailClass:forecastBadge?.className||'',stripClass:stripBadge?.className||''});
        const grid=detail?.querySelector('.metric-grid.weather-grid');
        const ew=rotation(expected?.hour?.windDirectionDeg,'wind'),ec=rotation(expected?.hour?.currentDirectionDeg,'current');
        const sw=arrow(grid,'wind'),sc=arrow(grid,'current');
        if(sw!==ew)fail('forecast-wind-arrow',{zoneId,mode:state.mode,index,date:days[index].date,expected:ew,shown:sw});
        if(sc!==ec)fail('forecast-current-arrow',{zoneId,mode:state.mode,index,date:days[index].date,expected:ec,shown:sc});
        checkWeatherMetrics(grid,expected?.hour,'forecast',{zoneId,mode:state.mode,index,date:days[index].date});
        const count=detail?.querySelectorAll('.component-list .component-detail').length||0;
        const reasonCount=detail?.querySelectorAll('.component-list .component-detail li').length||0;
        if(count!==3||reasonCount<3)fail('forecast-components',{zoneId,mode:state.mode,index,date:days[index].date,components:count,reasons:reasonCount});
        const expectExplanation=Boolean(expected?.result?.explanation?.transportDiagnostics?.coastTransportExplanation?.summary);
        const hasExplanation=Boolean(detail?.querySelector('.coast-transport-explanation'));
        if(expectExplanation!==hasExplanation)fail('forecast-coast-explanation',{zoneId,mode:state.mode,index,date:days[index].date,expected:expectExplanation,shown:hasExplanation});
        const displayContext=detail?.querySelector('.display-context')?.textContent||'';
        if(expected?.displayScope==='local'&&expected.result?.localPartName&&!displayContext.includes(expected.result.localPartName))fail('forecast-context',{zoneId,mode:state.mode,index,date:days[index].date,partName:expected.result.localPartName});
        if(!forecastAvailable){
          const detailText=detail?.textContent||'';
          if(!/Der kan ikke vælges et bedste tidspunkt, fordi der mangler data/i.test(detailText)||!/RavScore er midlertidigt utilgængelig/i.test(displayContext)||!/bruger ikke den gamle scoremodel/i.test(displayContext))fail('forecast-unavailable-explanation',{zoneId,mode:state.mode,index,date:days[index].date,detail:detailText.slice(0,500),context:displayContext});
        }
      }
      return {zoneId,days:days.length,parts};
    }
  };
}
"""


async def main():
    app_source = (ROOT / "app.js").read_text(encoding="utf-8")
    console_errors = []
    page_errors = []
    http_errors = []
    print("Browseraudit: starter Chrome", file=sys.stderr, flush=True)
    browser = await launch(headless=True, executablePath=r"C:\Program Files\Google\Chrome\Application\chrome.exe", args=["--no-sandbox", "--disable-dev-shm-usage"])
    print("Browseraudit: Chrome startet", file=sys.stderr, flush=True)
    try:
        page = await browser.newPage()
        page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on("response", lambda response: http_errors.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)

        async def intercept(request):
            parsed = urlparse(request.url)
            if parsed.path.endswith("/app.js"):
                await request.respond({"status": 200, "contentType": "application/javascript; charset=utf-8", "body": app_source + DEBUG_INJECTION})
                return
            await request.continue_()

        await page.setRequestInterception(True)
        page.on("request", lambda request: asyncio.ensure_future(intercept(request)))
        await page.goto(LIVE_URL, {"waitUntil": "networkidle2", "timeout": 90000})
        await page.waitForFunction(
            "window.__ravradarOnlineAudit && window.__ravradarOnlineAudit.state().conditionsZones === 210 && window.__ravradarOnlineAudit.state().detailsAvailable",
            {"timeout": 90000},
        )
        print("Browseraudit: live-data klar", file=sys.stderr, flush=True)
        state = await page.evaluate("window.__ravradarOnlineAudit.state()")
        zone_ids = await page.evaluate("window.__ravradarOnlineAudit.zoneIds()")
        totals = {"currentViews": 0, "forecastViews": 0, "partReferences": 0}
        for mode in ("waders", "beach"):
            await page.evaluate("mode => window.__ravradarOnlineAudit.setMode(mode)", mode)
            for zone_index, zone_id in enumerate(zone_ids, start=1):
                if zone_index == 1 or zone_index % 10 == 0 or zone_index == len(zone_ids):
                    print(
                        f"Browseraudit {mode}: zone {zone_index}/{len(zone_ids)} ({zone_id})",
                        file=sys.stderr,
                        flush=True,
                    )
                checked = await page.evaluate("zoneId => window.__ravradarOnlineAudit.checkZone(zoneId)", zone_id)
                totals["currentViews"] += 1
                totals["forecastViews"] += checked["days"]
                if mode == "waders":
                    totals["partReferences"] += checked["parts"]
        failures = await page.evaluate("window.__ravradarOnlineAudit.failures()")
        result = {
            "liveUrl": LIVE_URL,
            "expectedVersion": EXPECTED_VERSION,
            "state": state,
            "zoneCount": len(zone_ids),
            "totals": totals,
            "failureCount": len(failures),
            "failureKinds": {},
            "failures": failures[:200],
            "consoleErrors": console_errors,
            "pageErrors": page_errors,
            "httpErrors": http_errors,
        }
        for failure in failures:
            kind = failure.get("kind", "unknown")
            result["failureKinds"][kind] = result["failureKinds"].get(kind, 0) + 1
        print(json.dumps(result, ensure_ascii=False, indent=2))
        if state.get("version") != EXPECTED_VERSION or len(zone_ids) != 210 or totals != {"currentViews": 420, "forecastViews": 2100, "partReferences": 673} or failures or page_errors:
            raise SystemExit(1)
    finally:
        await browser.close()


if __name__ == "__main__":
    asyncio.new_event_loop().run_until_complete(main())
