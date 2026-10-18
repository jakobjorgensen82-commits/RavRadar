performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.582";
import { initialiseI18n } from "./js/i18n.js?v=4.0.582";
import "./js/ui/ranking-copy.js?v=4.0.582";
import "./js/ui/score-prognosis-copy.js?v=4.0.582";
import "./js/ui/site-search-copy.js?v=4.0.582";
import "./js/ui/map-tab-copy.js?v=4.0.582";
import "./js/ui/map-timeline-copy.js?v=4.0.582";

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
await import("./app.js?v=4.0.582&copy=footer-20261005&ui=account-timeline-now-20261018");
appImported = true;
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.582")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
