performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.124";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.124");
performance.mark?.('ravradar:app-imported');
