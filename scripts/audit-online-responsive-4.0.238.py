import asyncio
import json
import sys

from pyppeteer import launch


LIVE_URL = "https://jakobjorgensen82-commits.github.io/RavRadar/"
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
VIEWPORTS = {
    "mobile": {"width": 390, "height": 844, "isMobile": True, "hasTouch": True},
    "desktop": {"width": 1440, "height": 900},
}

sys.stdout.reconfigure(encoding="utf-8")


async def inspect(browser, name, viewport):
    page = await browser.newPage()
    await page.setViewport(viewport)
    page_errors = []
    http_errors = []
    page.on("pageerror", lambda error: page_errors.append(str(error)))
    page.on("response", lambda response: http_errors.append({"status": response.status, "url": response.url}) if response.status >= 400 else None)
    await page.goto(LIVE_URL, {"waitUntil": "networkidle2", "timeout": 90000})
    await page.waitForSelector("#ranking .ranking-item", {"timeout": 90000})
    await page.click("#ranking .ranking-item")
    await page.waitForSelector("#infoPanel .zone-header", {"timeout": 30000})
    await page.waitForFunction(
        "document.querySelectorAll('#infoPanel [data-forecast-section] .forecast-score-day').length === 5",
        {"timeout": 90000},
    )
    await page.waitFor(250)
    metrics = await page.evaluate(
        """() => {
          const rect = selector => {
            const node=document.querySelector(selector);
            if(!node)return null;
            const box=node.getBoundingClientRect();
            return {x:box.x,y:box.y,width:box.width,height:box.height};
          };
          return {
            version:document.querySelector('#appVersion')?.textContent?.trim()||null,
            viewport:{width:innerWidth,height:innerHeight},
            documentWidth:document.documentElement.scrollWidth,
            horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
            map:rect('#map'),
            infoPanel:rect('#infoPanel'),
            zoneHeader:rect('#infoPanel .zone-header'),
            score:document.querySelector('#infoPanel .zone-header .score-badge strong')?.textContent?.trim()||null,
            currentArrowCount:document.querySelectorAll('#infoPanel > .metric-grid.weather-grid .direction-arrow:not(.unavailable)').length,
            forecastDayCount:document.querySelectorAll('#infoPanel [data-forecast-section] .forecast-score-day').length,
            componentCount:document.querySelectorAll('#infoPanel > .component-list .component-detail').length,
            contextVisible:Boolean(document.querySelector('#infoPanel > .display-context')),
          };
        }"""
    )
    functional_http_errors = [item for item in http_errors if not item["url"].endswith("/favicon.ico")]
    failures = []
    if metrics["version"] != "4.0.238":
        failures.append("version")
    if metrics["horizontalOverflow"]:
        failures.append("horizontal-overflow")
    if not metrics["map"] or metrics["map"]["width"] <= 0 or metrics["map"]["height"] <= 0:
        failures.append("map-size")
    if not metrics["infoPanel"] or metrics["infoPanel"]["width"] > viewport["width"] + 1:
        failures.append("panel-width")
    if metrics["score"] is None:
        failures.append("score")
    if metrics["currentArrowCount"] != 2:
        failures.append("current-arrows")
    if metrics["forecastDayCount"] != 5:
        failures.append("forecast-days")
    if metrics["componentCount"] != 3:
        failures.append("components")
    if not metrics["contextVisible"]:
        failures.append("display-context")
    if page_errors:
        failures.append("page-errors")
    if functional_http_errors:
        failures.append("http-errors")
    await page.close()
    return {
        "name": name,
        "metrics": metrics,
        "failures": failures,
        "pageErrors": page_errors,
        "httpErrors": http_errors,
    }


async def main():
    browser = await launch(headless=True, executablePath=CHROME, args=["--no-sandbox", "--disable-dev-shm-usage"])
    try:
        results = []
        for name, viewport in VIEWPORTS.items():
            results.append(await inspect(browser, name, viewport))
        output = {
            "liveUrl": LIVE_URL,
            "version": "4.0.238",
            "viewports": results,
            "failureCount": sum(len(result["failures"]) for result in results),
        }
        print(json.dumps(output, ensure_ascii=False, indent=2))
        if output["failureCount"]:
            raise SystemExit(1)
    finally:
        await browser.close()


if __name__ == "__main__":
    asyncio.new_event_loop().run_until_complete(main())
