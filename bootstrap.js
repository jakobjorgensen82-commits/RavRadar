performance.mark?.('ravradar:bootstrap-start');
import { initializeUserDataSafety } from "./js/services/storage-safety.js?v=4.0.207";

await initializeUserDataSafety();
performance.mark?.('ravradar:storage-ready');
await import("./app.js?v=4.0.207");
performance.mark?.('ravradar:app-imported');
