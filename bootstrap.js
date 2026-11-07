performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.604";
import { initialiseI18n, t } from "./js/i18n.js?v=4.0.604";
import "./js/ui/ranking-copy.js?v=4.0.604";
import "./js/ui/score-prognosis-copy.js?v=4.0.604";
import "./js/ui/site-search-copy.js?v=4.0.604";
import "./js/ui/map-tab-copy.js?v=4.0.604";
import "./js/ui/map-timeline-copy.js?v=4.0.604";

import { installPublicAppUpdateFlow } from "./js/services/app-update-flow.js?v=4.0.604&transport=public-json-bridge-20261103";

let appImported = false;
addEventListener('pageshow', event => {
  // Safari kan gendanne en side, der blev lagt i page cache, før app-importen
  // var færdig. En færdig app genoptages og genoptegnes i app.js; kun en
  // reelt halvfærdig modulstart må genindlæses.
  if (event.persisted && !appImported) location.reload();
});

initialiseI18n();
await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
installPublicAppUpdateFlow({
  version: String(globalThis.RAVRADAR_VERSION || document.querySelector('#appVersion')?.textContent || '').trim(),
  translate: t,
});
await import("./app.js?v=4.0.604&copy=footer-20261005&ui=zone-panels-20261027&assistant=forecast-followup-20261101&share=custom-domain-20261102&transport=public-json-bridge-20261103&map=plain-map-v3-20261104");
appImported = true;
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.604")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
