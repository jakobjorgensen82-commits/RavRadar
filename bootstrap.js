performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.294";
import { initialiseI18n } from "./js/i18n.js?v=4.0.294";

let appImported = false;
addEventListener('pageshow', event => {
  // Safari kan gendanne en side, der blev lagt i page cache, før app-importen
  // var færdig. Den halvfærdige modulstart kan ikke sikkert genbruges.
  if (event.persisted && !appImported) location.reload();
});

initialiseI18n();
await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.294");
appImported = true;
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.294")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
