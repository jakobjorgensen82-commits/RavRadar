performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.180";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.180");
performance.mark?.('ravradar:app-imported');
