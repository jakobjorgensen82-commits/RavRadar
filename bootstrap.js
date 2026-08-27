performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.290";
import { initialiseI18n } from "./js/i18n.js?v=4.0.290";

initialiseI18n();
await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.290");
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.290")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
