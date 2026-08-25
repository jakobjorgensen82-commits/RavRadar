performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.277";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.277");
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.277")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
