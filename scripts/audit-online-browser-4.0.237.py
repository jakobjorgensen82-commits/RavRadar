import asyncio
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

from pyppeteer import launch


ROOT = Path(__file__).resolve().parents[1]
LIVE_URL = "https://jakobjorgensen82-commits.github.io/RavRadar/"

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
    const value=String(node?.textContent||'').replace(/[^0-9,.-]/g,'').replace(',','.');
    return value && Number.isFinite(Number(value)) ? Number(value) : null;
  };
  const failures=[];
  const fail=(kind,detail)=>failures.push({kind,...detail});
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
      if(shownScore!==Number(result.score))fail('current-score',{zoneId,mode:state.mode,expected:result.score,shown:shownScore});
      if(shownLabel!==String(result.label||''))fail('current-label',{zoneId,mode:state.mode,expected:result.label,shown:shownLabel});
      if(result.level&&!badge?.classList.contains(result.level))fail('current-level',{zoneId,mode:state.mode,expected:result.level,className:badge?.className||''});
      const weatherGrid=panel?.querySelector('.metric-grid.weather-grid');
      const shownWind=arrow(weatherGrid,'wind'),shownCurrent=arrow(weatherGrid,'current');
      const expectedWind=rotation(weather.windDirectionDeg,'wind'),expectedCurrent=rotation(weather.currentDirectionDeg,'current');
      if(shownWind!==expectedWind)fail('current-wind-arrow',{zoneId,mode:state.mode,expected:expectedWind,shown:shownWind});
      if(shownCurrent!==expectedCurrent)fail('current-current-arrow',{zoneId,mode:state.mode,expected:expectedCurrent,shown:shownCurrent});
      const components=panel?.querySelectorAll(':scope > .component-list .component-detail').length||0;
      const reasons=panel?.querySelectorAll(':scope > .component-list .component-detail li').length||0;
      if(components!==3||reasons<3)fail('current-components',{zoneId,mode:state.mode,components,reasons});
      const expectedCoast=Boolean(result.explanation?.transportDiagnostics?.coastTransportExplanation?.summary);
      const shownCoast=Boolean(panel?.querySelector(':scope > .coast-transport-explanation'));
      if(expectedCoast!==shownCoast)fail('current-coast-explanation',{zoneId,mode:state.mode,expected:expectedCoast,shown:shownCoast});
      const contextText=panel?.querySelector(':scope > .display-context')?.textContent||'';
      if(context.scope==='local'&&result.localPartName&&!contextText.includes(result.localPartName))fail('current-context',{zoneId,mode:state.mode,partName:result.localPartName,scope:context.scope});
      const debugText=panel?.querySelector('.debug-panel')?.textContent||'';
      if(!debugText.includes(String(result.score)))fail('current-debug-score',{zoneId,mode:state.mode,score:result.score});
      if(result.localPartId&&!debugText.includes(result.localPartId))fail('current-debug-part',{zoneId,mode:state.mode,partId:result.localPartId});
      const parts=state.conditions?.coastalParts?.zones?.[zoneId]?.expectedPartCount||state.conditions?.coastalParts?.zones?.[zoneId]?.parts?.length||0;
      const whereButton=panel?.querySelector('[data-show-local-parts]');
      if(parts>1&&!whereButton)fail('parts-button-missing',{zoneId,mode:state.mode,parts});
      whereButton?.click();
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
        if(!expected||shown!==Number(expected.result?.score)||strip!==Number(expected.result?.score))fail('forecast-score',{zoneId,mode:state.mode,index,date:days[index].date,expected:expected?.result?.score,shown,strip});
        const grid=detail?.querySelector('.metric-grid.weather-grid');
        const ew=rotation(expected?.hour?.windDirectionDeg,'wind'),ec=rotation(expected?.hour?.currentDirectionDeg,'current');
        const sw=arrow(grid,'wind'),sc=arrow(grid,'current');
        if(sw!==ew)fail('forecast-wind-arrow',{zoneId,mode:state.mode,index,date:days[index].date,expected:ew,shown:sw});
        if(sc!==ec)fail('forecast-current-arrow',{zoneId,mode:state.mode,index,date:days[index].date,expected:ec,shown:sc});
        const count=detail?.querySelectorAll('.component-list .component-detail').length||0;
        const reasonCount=detail?.querySelectorAll('.component-list .component-detail li').length||0;
        if(count!==3||reasonCount<3)fail('forecast-components',{zoneId,mode:state.mode,index,date:days[index].date,components:count,reasons:reasonCount});
        const expectExplanation=Boolean(expected?.result?.explanation?.transportDiagnostics?.coastTransportExplanation?.summary);
        const hasExplanation=Boolean(detail?.querySelector('.coast-transport-explanation'));
        if(expectExplanation!==hasExplanation)fail('forecast-coast-explanation',{zoneId,mode:state.mode,index,date:days[index].date,expected:expectExplanation,shown:hasExplanation});
        const displayContext=detail?.querySelector('.display-context')?.textContent||'';
        if(expected?.displayScope==='local'&&expected.result?.localPartName&&!displayContext.includes(expected.result.localPartName))fail('forecast-context',{zoneId,mode:state.mode,index,date:days[index].date,partName:expected.result.localPartName});
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
    browser = await launch(headless=True, executablePath=r"C:\Program Files\Google\Chrome\Application\chrome.exe", args=["--no-sandbox", "--disable-dev-shm-usage"])
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
        state = await page.evaluate("window.__ravradarOnlineAudit.state()")
        zone_ids = await page.evaluate("window.__ravradarOnlineAudit.zoneIds()")
        totals = {"currentViews": 0, "forecastViews": 0, "partReferences": 0}
        for mode in ("waders", "beach"):
            await page.evaluate("mode => window.__ravradarOnlineAudit.setMode(mode)", mode)
            for zone_id in zone_ids:
                checked = await page.evaluate("zoneId => window.__ravradarOnlineAudit.checkZone(zoneId)", zone_id)
                totals["currentViews"] += 1
                totals["forecastViews"] += checked["days"]
                if mode == "waders":
                    totals["partReferences"] += checked["parts"]
        failures = await page.evaluate("window.__ravradarOnlineAudit.failures()")
        result = {
            "liveUrl": LIVE_URL,
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
        if len(zone_ids) != 210 or totals != {"currentViews": 420, "forecastViews": 2100, "partReferences": 673} or failures or page_errors:
            raise SystemExit(1)
    finally:
        await browser.close()


if __name__ == "__main__":
    asyncio.new_event_loop().run_until_complete(main())
