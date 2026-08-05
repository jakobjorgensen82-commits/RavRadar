performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.108";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.108");
performance.mark?.('ravradar:app-imported');
