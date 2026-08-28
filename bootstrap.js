performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.306";
import { initialiseI18n } from "./js/i18n.js?v=4.0.306";

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
await import("./app.js?v=4.0.306");
appImported = true;
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.306")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
