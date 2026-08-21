performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.249";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.249");
performance.mark?.('ravradar:app-imported');
void import("./js/services/visit-counter.js?v=4.0.249")
  .then(({ schedulePublicPageView }) => schedulePublicPageView())
  .catch(() => {});
